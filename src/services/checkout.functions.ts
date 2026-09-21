/**
 * Checkout server functions Commerce
 *
 * processCheckout usa o RPC atômico `process_checkout_atomic` (migration 0025).
 * - Idempotência garantida pelo idempotency_key.
 * - Transação atômica no banco: cria pedido, itens, movimenta estoque, registra pagamento, fecha carrinho.
 * - Cálculos de desconto e frete são revalidados no servidor.
 * - Nunca confia em valores do cliente para preços ou totais.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";
import { getServerIdentity, getSSRClient } from "@/lib/server-access";
import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { logSystemError } from "@/lib/logger";
import { getCurrentIdentity, withDataPayload } from "./cart-helpers";
import { getRequest } from "@tanstack/start-server-core";
import { readCookieFromRequest } from "@/lib/http-cookies";
import { generateTransactionCertificate } from "@/services/security.functions";

export interface CheckoutDynamicConfig {
  niche: "grocery" | "food" | "retail" | "services" | "general";
  cpfOnReceipt: {
    enabled: boolean;
    required: boolean;
    defaultRequested: boolean;
    label: string;
  };
  substitutionPolicy: {
    enabled: boolean;
    default: "similar" | "contact" | "cancel" | "none";
    options: Array<{ id: string; label: string; desc: string }>;
  };
  receiverInfo: {
    enabled: boolean;
    label: string;
  };
  utensilsPolicy: {
    enabled: boolean;
    label: string;
  };
  itemNotes: {
    enabled: boolean;
    placeholder: string;
  };
  orderNotes: {
    enabled: boolean;
    placeholder: string;
  };
  customFields: Array<{
    id: string;
    label: string;
    type: "text" | "textarea" | "select" | "number";
    required: boolean;
    placeholder?: string;
    options?: string[];
  }>;
}

export const getStoreCheckoutConfig = createServerFn({ method: "GET" })
  .validator(
    withDataPayload(
      z.object({
        storeId: z.string().uuid().optional(),
        cartId: z.string().uuid().optional(),
      })
    )
  )
  .handler(async ({ data: { storeId, cartId } }) => {
    const db = await getServerClient();
    let resolvedStoreId = storeId;

    if (!resolvedStoreId && cartId) {
      const { data: cart } = await db.from("carts").select("store_id").eq("id", cartId).maybeSingle();
      if (cart?.store_id) resolvedStoreId = cart.store_id;
    }

    if (!resolvedStoreId) {
      // Default fallback config
      const defaultConfig: CheckoutDynamicConfig = {
        niche: "general",
        cpfOnReceipt: { enabled: true, required: false, defaultRequested: false, label: "CPF na Nota Fiscal" },
        substitutionPolicy: {
          enabled: false,
          default: "similar",
          options: [
            { id: "similar", label: "Trocar por similar", desc: "Mesma marca ou categoria" },
            { id: "contact", label: "Confirmar comigo", desc: "Avisar via WhatsApp" },
            { id: "cancel", label: "Cancelar item", desc: "Abater valor do total" },
          ],
        },
        receiverInfo: { enabled: true, label: "Quem irá receber as compras" },
        utensilsPolicy: { enabled: false, label: "Precisa de talheres e guardanapos descartáveis?" },
        itemNotes: { enabled: true, placeholder: "Observações ou preferências deste item..." },
        orderNotes: { enabled: true, placeholder: "Instruções especiais para entrega ou ponto de referência..." },
        customFields: [],
      };
      return defaultConfig;
    }

    const { data: store } = await db
      .from("stores")
      .select("id, name, segment, settings")
      .eq("id", resolvedStoreId)
      .single();

    const seg = (store?.segment || "").toLowerCase();
    let detectedNiche: "grocery" | "food" | "retail" | "services" | "general" = "general";
    if (seg.includes("mercado") || seg.includes("market") || seg.includes("conveniencia") || seg.includes("supermercado")) {
      detectedNiche = "grocery";
    } else if (seg.includes("gastro") || seg.includes("food") || seg.includes("restaurante") || seg.includes("lanche") || seg.includes("pizz") || seg.includes("bar")) {
      detectedNiche = "food";
    } else if (seg.includes("servi") || seg.includes("turis") || seg.includes("consult")) {
      detectedNiche = "services";
    } else if (seg.includes("varejo") || seg.includes("retail") || seg.includes("loja") || seg.includes("moda")) {
      detectedNiche = "retail";
    }

    const savedConfig = (store?.settings as any)?.checkout_config || {};

    const resolvedConfig: CheckoutDynamicConfig = {
      niche: detectedNiche,
      cpfOnReceipt: {
        enabled: savedConfig.cpf_on_receipt?.enabled ?? true,
        required: savedConfig.cpf_on_receipt?.required ?? false,
        defaultRequested: savedConfig.cpf_on_receipt?.default_requested ?? false,
        label: savedConfig.cpf_on_receipt?.label || "CPF na Nota Fiscal",
      },
      substitutionPolicy: {
        enabled: savedConfig.substitution_policy?.enabled ?? (detectedNiche === "grocery"),
        default: savedConfig.substitution_policy?.default || "similar",
        options: [
          { id: "similar", label: "Trocar por similar", desc: "Mesma categoria ou marca equivalente" },
          { id: "contact", label: "Confirmar comigo", desc: "Avisar pelo WhatsApp antes de fechar" },
          { id: "cancel", label: "Cancelar item", desc: "Abater o valor do total" },
        ],
      },
      receiverInfo: {
        enabled: savedConfig.receiver_info?.enabled ?? (detectedNiche === "grocery" || detectedNiche === "retail"),
        label: savedConfig.receiver_info?.label || "Quem irá receber as compras",
      },
      utensilsPolicy: {
        enabled: savedConfig.utensils_policy?.enabled ?? (detectedNiche === "food"),
        label: savedConfig.utensils_policy?.label || "Enviar talheres e guardanapos descartáveis?",
      },
      itemNotes: {
        enabled: savedConfig.item_notes?.enabled ?? true,
        placeholder: savedConfig.item_notes?.placeholder || (detectedNiche === "food" ? "Ex: Sem cebola, carne ao ponto..." : "Preferências deste item..."),
      },
      orderNotes: {
        enabled: savedConfig.order_notes?.enabled ?? true,
        placeholder: savedConfig.order_notes?.placeholder || "Instruções especiais ou ponto de referência...",
      },
      customFields: (store?.settings as any)?.custom_checkout_fields || savedConfig.custom_fields || [],
    };

    return resolvedConfig;
  });

export const updateStoreCheckoutConfig = createServerFn({ method: "POST" })
  .validator(
    withDataPayload(
      z.object({
        storeId: z.string().uuid(),
        checkoutConfig: z.record(z.any()),
      })
    )
  )
  .handler(async ({ data: { storeId, checkoutConfig } }) => {
    const identity = await getServerIdentity();
    if (!identity) throw new Error("Não autenticado.");
    const db = await getServerClient();

    const { data: member } = await db
      .from("store_members")
      .select("role")
      .eq("store_id", storeId)
      .eq("profile_id", identity.id)
      .maybeSingle();

    if (!member && !identity.isPlatformAdmin) {
      throw new Error("Sem autorização para alterar as configurações desta loja.");
    }

    const { data: store } = await db
      .from("stores")
      .select("settings")
      .eq("id", storeId)
      .single();

    const currentSettings = (store?.settings as Record<string, any>) || {};
    const updatedSettings = {
      ...currentSettings,
      checkout_config: checkoutConfig,
    };

    const { error } = await db
      .from("stores")
      .update({ settings: updatedSettings })
      .eq("id", storeId);

    if (error) throw error;
    return { status: "success", checkoutConfig };
  });

const CheckoutSchema = z
 .object({
 cartId: z.string().uuid(),
 customerName: z.string().min(3),
 customerEmail: z.string().email(),
 customerDocument: z.string().optional(),
 customerPhone: z.string().optional(),
 shippingMethod: z.enum(["manual_table", "provider", "pickup", "manual_quote"]),
 shippingAddress: z
 .object({
 zipcode: z.string().min(8),
 street: z.string().min(2),
 number: z.string().min(1),
 complement: z.string().optional(),
 neighborhood: z.string().min(2),
 city: z.string().min(2),
 state: z.string().length(2),
 })
 .optional(),
 paymentMethod: z.enum(["pix", "manual", "credit_card", "receipt"]),
 paymentMethodId: z.string().uuid().optional(),
 giftCardCode: z.string().optional(),
 notes: z.string().optional(),
 customFields: z.record(z.any()).optional(),

 // ── V10: Multi-Nicho Dynamic Checkout Attributes ──
 cpfOnReceipt: z
   .object({
     requested: z.boolean(),
     document: z.string().optional(),
   })
   .optional(),
 substitutionPolicy: z.enum(["similar", "contact", "cancel", "none"]).optional(),
 receiverInfo: z
   .object({
     isOtherPerson: z.boolean(),
     name: z.string().optional(),
     phone: z.string().optional(),
   })
   .optional(),
 utensilsRequested: z.boolean().optional(),
 itemNotes: z.record(z.string()).optional(),
 checkoutNicheMetadata: z.record(z.unknown()).optional(),
 })
 .superRefine((val, ctx) => {
 if (val.shippingMethod === "manual_table" || val.shippingMethod === "provider") {
 if (!val.shippingAddress || !val.shippingAddress.zipcode) {
 ctx.addIssue({
 code: z.ZodIssueCode.custom,
 message: "Endereço de entrega completo é obrigatório para esta modalidade de frete.",
 path: ["shippingAddress"],
 });
 }
 }
 });

export const getOrderByToken = createServerFn({ method: "GET" })
 .validator(withDataPayload(z.object({ token: z.string() })))
 .handler(async ({ data: { token } }) => {
 const db = await getServerClient();
 const { data } = await db
 .from("orders")
 .select(
 "id, public_token, status, total_cents, subtotal_cents, shipping_cents, discount_cents, customer_snapshot, shipping_method, shipping_address, notes, custom_fields, cpf_on_receipt, substitution_policy, receiver_info, checkout_niche_metadata, created_at, stores(id, name, settings), payments(method, status, provider_name), order_items(id, product_title, variant_sku, qty, unit_price_cents, total_cents, item_type, item_id, selected_options, notes)",
 )
 .eq("public_token", token)
 .single();
 return data;
 });

import { enforceRateLimit, extractClientIp } from "@/lib/rate-limiter";

export const processCheckout = createServerFn({ method: "POST" })
 .validator(withDataPayload(CheckoutSchema))
 .handler(async ({ data: params }) => {
 try {
 const req = getRequest();
 const clientIp = extractClientIp(req);

 // Anti-Flooding / Anti-Abuso de Checkout
 enforceRateLimit(clientIp, "checkout_order");

 const db = await getServerClient();

 // Idempotency key prevents double-processing
 const idempotencyKey = `checkout-${params.cartId}-${params.paymentMethod}-${params.paymentMethodId || ""}-${params.giftCardCode || ""}`;

 // Ensure anti-hijacking by extracting the actual current identity
 const identity = await getCurrentIdentity();
 const affiliateId = req ? readCookieFromRequest(req, "waesy_affiliate_id") : null;

 // Call the atomic RPC v2 — all logic (coupon, stock, order creation, gift cards, surcharges) happens inside a single PostgreSQL transaction
 // Validação de integridade de frete: revalida apenas quando é transportadora automatizada externa com CEP
 const isLocalOrManualShipping =
 params.shippingMethod === "pickup" ||
 params.shippingMethod === "manual_quote" ||
 params.shippingMethod === "manual_table";

 if (!isLocalOrManualShipping) {
 const { data: cartValidation } = await db
 .from("carts")
 .select("shipping_zipcode, shipping_method, shipping_cents")
 .eq("id", params.cartId)
 .single();

 if (
 cartValidation &&
 cartValidation.shipping_method &&
 cartValidation.shipping_zipcode &&
 cartValidation.shipping_cents &&
 cartValidation.shipping_cents > 0
 ) {
 try {
 const { calculateShipping } = await import("@/services/shipping.functions");
 const currentRates = await calculateShipping({
 data: {
 zipcode: cartValidation.shipping_zipcode,
 cartId: params.cartId,
 },
 } as any);

 if (Array.isArray(currentRates) && currentRates.length > 0) {
 const matchedRate = currentRates.find(
 (r) =>
 r.service_name === cartValidation.shipping_method ||
 r.provider === cartValidation.shipping_method,
 );

 if (matchedRate && Math.abs(matchedRate.price_cents - cartValidation.shipping_cents) > 500) {
 // Pequena tolerância para oscilações mínimas de centavos, alerta apenas se diferença > R$ 5,00
 return { status: "error" as const, message: 
 "O valor do frete mudou desde a cotação inicial. Por favor, revise o frete no carrinho.",
 };
 }
 }
 } catch (shipErr: unknown) {
 // Log amigável sem interromper caso seja indisponibilidade transitória da API dos Correios
 console.warn(
 "[checkout.functions] Aviso na checagem de frete:",
 shipErr instanceof Error ? shipErr.message : String(shipErr),
 );
 }
 }
 }

 const { data, error } = await db.rpc("process_checkout_transaction_v2", {
 p_cart_id: params.cartId,
 p_idempotency_key: idempotencyKey,
 p_customer_name: params.customerName,
 p_customer_email: params.customerEmail,
 p_customer_document: params.customerDocument || null,
 p_customer_phone: params.customerPhone || null,
 p_shipping_method: params.shippingMethod,
 p_shipping_address: params.shippingAddress || {},
 p_payment_method: params.paymentMethod,
 p_gift_card_code: params.giftCardCode || null,
 p_manual_payment_method_id: params.paymentMethodId || null,
 p_affiliate_id: affiliateId || null,
 });

 if (error) {
 const errMsg = error instanceof Error ? error.message : String(error);
 
 // Translating PostgreSQL constraint errors into user-friendly messages
 if (errMsg.includes("stock_on_hand") || errMsg.includes("stock_reserved") || errMsg.includes("estoque insuficiente")) {
 return { status: "error" as const, message: "Desculpe, um ou mais itens do seu carrinho esgotaram. Por favor, revise as quantidades." };
 }
 
 if (errMsg.includes("Carrinho no encontrado")) {
 return { status: "error" as const, message: "Carrinho expirado ou jǭ processado. Inicie um novo checkout." };
 }

 return { status: "error" as const, message: "Erro ao processar pedido: " + errMsg };
 }

 const result = data as {
 status: string;
 orderId?: string;
 orderToken: string;
 is_idempotent_replay: boolean;
 };

 if (result.status !== "success") {
 return { status: "error" as const, message: "Checkout falhou." };
 }

    // Persist channel_origin, notes, custom fields, and V10 Multi-Nicho dynamic metadata on the created order
    if (result.orderId) {
      try {
        const updatePayload: Record<string, any> = {
          channel_origin: "storefront",
        };
        if (params.notes) updatePayload.notes = params.notes;
        if (params.customFields) updatePayload.custom_fields = params.customFields;
        if (params.cpfOnReceipt) updatePayload.cpf_on_receipt = params.cpfOnReceipt;
        if (params.substitutionPolicy) updatePayload.substitution_policy = params.substitutionPolicy;
        if (params.receiverInfo) updatePayload.receiver_info = params.receiverInfo;

        const nicheMeta: Record<string, any> = {
          ...(params.checkoutNicheMetadata || {}),
        };
        if (params.utensilsRequested !== undefined) {
          nicheMeta.utensils_requested = params.utensilsRequested;
        }
        updatePayload.checkout_niche_metadata = nicheMeta;

        await db.from("orders").update(updatePayload).eq("id", result.orderId);

        // Se houver observações por item, persiste em order_items
        if (params.itemNotes && Object.keys(params.itemNotes).length > 0) {
          for (const [key, noteText] of Object.entries(params.itemNotes)) {
            if (!noteText || typeof noteText !== "string" || !noteText.trim()) continue;
            await db
              .from("order_items")
              .update({ notes: noteText.trim() })
              .eq("order_id", result.orderId)
              .or(`item_id.eq.${key},id.eq.${key},variant_sku.eq.${key}`);
          }
        }
      } catch (orderUpdateErr) {
        console.warn("[checkout.functions] Falha não-bloqueante ao atualizar metadados do pedido:", orderUpdateErr);
      }
    }

 // ── MCTU: Gerar Certificado de Transação (fire-and-forget, não bloqueia resposta) ──
 // O certificado é gerado SOMENTE após sucesso atômico confirmado.
 // Vinculado ao orderId real para rastreabilidade forense completa.
 if (result.orderId) {
 const req2 = getRequest();
 const clientIp = req2 ? extractClientIp(req2) : "server_internal";
 const ua = req2?.headers.get("user-agent") || null;
 const geoCountry = req2?.headers.get("cf-ipcountry") || null;
 const geoCity = req2?.headers.get("cf-ipcity") || null;

 generateTransactionCertificate({
 data: {
 entityType: "order",
 entityId: result.orderId,
 storeId: null, // O RPC não retorna store_id; será derivado internamente na função
 payloadSnapshot: {
 orderId: result.orderId,
 orderToken: result.orderToken,
 cartId: params.cartId,
 paymentMethod: params.paymentMethod,
 shippingMethod: params.shippingMethod,
 isIdempotentReplay: result.is_idempotent_replay,
 },
 deviceFingerprint: "server_generated",
 clientTimestamp: new Date().toISOString(),
 },
 }).catch((certErr: Error) => {
 // Não propagamos erros de certificação para não bloquear o checkout
 console.warn("[checkout.mctu] Falha ao gerar certificado:", certErr?.message);
 });

    // ── Propagação Multicanal de Estoque (Mercado Livre, Shopee, Amazon) ──
    import("./marketplace-hub.functions")
      .then(async ({ _syncStockToMarketplacesInternal }) => {
        const { data: orderWithStore } = await db
          .from("orders")
          .select("store_id, order_items(item_id, variant_sku)")
          .eq("id", result.orderId)
          .maybeSingle();

        if (orderWithStore?.store_id && Array.isArray(orderWithStore.order_items)) {
          for (const item of orderWithStore.order_items) {
            if (!item.item_id) continue;
            try {
              const { data: variant } = await db
                .from("product_variants")
                .select("stock_on_hand, product_id")
                .eq("id", item.item_id)
                .maybeSingle();

              const targetProductId = variant?.product_id || item.item_id;
              const newStockQty = variant?.stock_on_hand ?? 0;

              await _syncStockToMarketplacesInternal(orderWithStore.store_id, targetProductId, newStockQty);
            } catch (syncErr) {
              console.warn(`[checkout:stock-sync] Falha ao sincronizar item ${item.item_id}:`, syncErr);
            }
          }
        }
      })
      .catch((e) => console.warn("[checkout:stock-sync] Falha ao importar marketplace-hub:", e));
  }

 return {
 status: "success" as const,
 orderId: result.orderId,
 orderToken: result.orderToken,
 };
 } catch (e: unknown) {
 logSystemError({ route: "checkout.functions.processCheckout", error: e, payload: params });
 console.error(
 "[checkout.functions] processCheckout:",
 e instanceof Error ? e.message : String(e),
 );
 return { status: "error" as const, message: (e instanceof Error ? e.message : String(e)) || "Erro no checkout" };
 }
 });
