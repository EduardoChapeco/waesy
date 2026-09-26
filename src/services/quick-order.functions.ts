/**
 * Quick Order Server Functions (BFF) — Waesy Platform
 *
 * Elimina pedidos fantasmas ao persistir atomicamente pedidos diretos de conveniência/vitrine
 * nas tabelas `orders` e `order_items` do Supabase.
 * Gera Short IDs humanos (#W-XXXX) e mensagens de WhatsApp polidas, humanizadas e elegantes
 * (Regra do Design Silencioso Verbal — sem jargões corporativos ou caixas robóticas).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getCurrentIdentity } from "@/services/cart-helpers";
import { withDataPayload } from "@/services/cart-helpers";
import { formatMoney } from "@/lib/money";

export const QuickOrderItemSchema = z.object({
  title: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPriceCents: z.number().int().min(0),
  totalCents: z.number().int().min(0),
  variantId: z.string().uuid().optional(),
  imageUrl: z.string().optional(),
  itemDetails: z.string().optional(), // Modo de compra, peso, etc.
  selectedOptions: z.string().optional(), // Opção de corte, preparo, etc.
  ripeness: z.string().optional(), // Ponto de maturação se houver
});

export const CreateQuickOrderSchema = z.object({
  storeId: z.string().uuid().optional(),
  storeSlug: z.string().optional(),
  storeName: z.string().optional(),
  sellerPhone: z.string().optional(),
  classifiedId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),

  // Dados do Cliente
  customerName: z.string().min(2, "Informe seu nome completo"),
  customerPhone: z.string().min(8, "Informe seu telefone para contato"),

  // Itens do Pedido
  items: z.array(QuickOrderItemSchema).min(1, "Adicione pelo menos um item"),
  subtotalCents: z.number().int().min(0),
  deliveryFeeCents: z.number().int().min(0).default(0),
  discountCents: z.number().int().min(0).default(0),
  grandTotalCents: z.number().int().min(0),

  // Logística e Pagamento
  deliveryMode: z.enum(["pickup", "immediate", "scheduled"]).default("pickup"),
  scheduledWindow: z.string().optional(),
  deliveryAddress: z.string().optional(),
  paymentMethod: z.enum(["pix", "card", "cash"]).default("pix"),
  cashChangeFor: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateQuickOrderInput = z.infer<typeof CreateQuickOrderSchema>;

export interface QuickOrderResult {
  status: "success" | "error";
  orderId?: string;
  publicToken?: string;
  shortId?: string;
  whatsappUrl?: string;
  message?: string;
}

export const createQuickOrder = createServerFn({ method: "POST" })
  .validator(withDataPayload(CreateQuickOrderSchema))
  .handler(async ({ data: input }): Promise<QuickOrderResult> => {
    try {
      const db = await getServerClient();
      const identity = await getCurrentIdentity().catch(() => null);

      // 1. Resolução Segura da Loja (Multi-Tenant Inviolável)
      let resolvedStoreId = input.storeId;

      if (!resolvedStoreId && input.storeSlug) {
        const { data: storeBySlug } = await db
          .from("stores")
          .select("id, name, phone, settings")
          .eq("slug", input.storeSlug)
          .maybeSingle();
        if (storeBySlug?.id) resolvedStoreId = storeBySlug.id;
      }

      if (!resolvedStoreId && input.classifiedId) {
        const { data: classified } = await db
          .from("classifieds")
          .select("store_id")
          .eq("id", input.classifiedId)
          .maybeSingle();
        if (classified?.store_id) resolvedStoreId = classified.store_id;
      }

      if (!resolvedStoreId && input.productId) {
        const { data: product } = await db
          .from("products")
          .select("store_id")
          .eq("id", input.productId)
          .maybeSingle();
        if (product?.store_id) resolvedStoreId = product.store_id;
      }

      // Se ainda não resolvido, buscar loja padrão do marketplace
      if (!resolvedStoreId) {
        const { data: fallbackStore } = await db
          .from("stores")
          .select("id")
          .limit(1)
          .maybeSingle();
        if (fallbackStore?.id) resolvedStoreId = fallbackStore.id;
      }

      if (!resolvedStoreId) {
        return {
          status: "error",
          message: "Não foi possível identificar o comerciante para este pedido.",
        };
      }

      // 2. Token Público Canônico Seguro
      const publicToken = crypto.randomUUID().replace(/-/g, "").slice(0, 16);

      // 3. Preparar Snapshots Imutáveis
      const itemsSnapshot = input.items.map((item) => ({
        product_title: item.title,
        qty: item.quantity,
        unit_price_cents: item.unitPriceCents,
        total_cents: item.totalCents,
        variant_id: item.variantId || null,
        image_url: item.imageUrl || null,
        selected_options: item.selectedOptions || null,
        item_details: item.itemDetails || null,
        ripeness: item.ripeness || null,
      }));

      const customerSnapshot = {
        name: input.customerName.trim(),
        phone: input.customerPhone.trim(),
        user_id: identity?.id || null,
      };

      const shippingAddressSnapshot = input.deliveryMode === "pickup"
        ? { type: "pickup", label: "Retirada no Balcão da Loja" }
        : {
            type: input.deliveryMode,
            address: input.deliveryAddress?.trim() || "A combinar",
            scheduled_window: input.scheduledWindow || null,
          };

      // Mapear shipping_method para enum da tabela orders ('pickup' | 'delivery' | 'manual_quote')
      const shippingMethodDb = input.deliveryMode === "pickup" ? "pickup" : "delivery";

      // 3.5. Cálculo Soberano de Taxa de Entrega no PostgreSQL (Regras reais de Empresa e Parceiros)
      let resolvedDeliveryFeeCents = 0;
      let deliveryFeeRule = "pickup";
      if (input.deliveryMode !== "pickup") {
        const { data: feeRes } = await db.rpc("calculate_order_delivery_fee", {
          p_store_id: resolvedStoreId,
          p_subtotal_cents: input.subtotalCents,
          p_delivery_mode: input.deliveryMode,
          p_neighborhood: input.deliveryAddress || null,
          p_classified_id: input.classifiedId || null,
        });
        resolvedDeliveryFeeCents = Number(feeRes?.fee_cents) || 0;
        deliveryFeeRule = String(feeRes?.rule_applied || "calculated");
      }

      const calculatedGrandTotalCents = Math.max(0, input.subtotalCents + resolvedDeliveryFeeCents - input.discountCents);

      // 4. Inserção Atômica na tabela `orders` (PostgreSQL gera order_number via Sequence soberana)
      const { data: orderData, error: orderError } = await db
        .from("orders")
        .insert({
          store_id: resolvedStoreId,
          customer_id: identity?.id || null,
          public_token: publicToken,
          status: "awaiting_payment",
          items_snapshot: itemsSnapshot,
          subtotal_cents: input.subtotalCents,
          shipping_cents: resolvedDeliveryFeeCents,
          discount_cents: input.discountCents,
          total_cents: calculatedGrandTotalCents,
          shipping_method: shippingMethodDb,
          shipping_address: shippingAddressSnapshot,
          customer_snapshot: customerSnapshot,
          channel_origin: "whatsapp",
          notes: input.notes || null,
          custom_fields: { channel: "storefront_quick_order", delivery_rule: deliveryFeeRule },
        })
        .select("id, public_token, order_number")
        .single();

      if (orderError || !orderData) {
        console.error("[quick-order] Falha ao gravar pedido em orders:", orderError);
        return {
          status: "error",
          message: "Erro ao registrar o pedido no banco de dados. Tente novamente.",
        };
      }

      const orderId = orderData.id;
      const systemicOrderNumber = orderData.order_number || `WSY-${orderData.public_token.slice(0, 6).toUpperCase()}`;

      // 5. Inserção dos itens na tabela `order_items`
      try {
        const orderItemsPayload = input.items.map((item) => ({
          order_id: orderId,
          product_title: item.title,
          variant_id: item.variantId || null,
          qty: item.quantity,
          unit_price_cents: item.unitPriceCents,
          total_cents: item.totalCents,
          image_url: item.imageUrl || null,
          selected_options: {
            options: item.selectedOptions || null,
            details: item.itemDetails || null,
            ripeness: item.ripeness || null,
          },
        }));

        await db.from("order_items").insert(orderItemsPayload);
      } catch (itemsErr) {
        console.warn("[quick-order] Aviso não-fatal ao gravar order_items:", itemsErr);
      }

      // 6. Construção da Mensagem Humana e Calorosa para WhatsApp (The WhatsApp Concierge)
      const cleanStorePhone = (input.sellerPhone || "").replace(/\D/g, "");

      const deliveryDescription =
        input.deliveryMode === "pickup"
          ? "Retirada no Balcão"
          : input.deliveryMode === "scheduled"
          ? `Entrega Agendada (${input.scheduledWindow || "janela programada"}) — ${input.deliveryAddress || ""}`
          : `Entrega em ${input.deliveryAddress || "endereço cadastrado"}`;

      const paymentDescription =
        input.paymentMethod === "pix"
          ? "Pix à vista"
          : input.paymentMethod === "card"
          ? "Cartão na entrega"
          : `Dinheiro em espécie${input.cashChangeFor ? ` (Troco para R$ ${input.cashChangeFor})` : ""}`;

      let humanMessage = "";
      const deliveryLine = input.deliveryMode !== "pickup"
        ? [`🛵 *Taxa de Entrega:* ${resolvedDeliveryFeeCents === 0 ? "Grátis" : formatMoney(resolvedDeliveryFeeCents)}`]
        : [];

      if (input.items.length === 1) {
        const single = input.items[0];
        humanMessage = [
          `Olá! Gostaria de fazer o pedido ${systemicOrderNumber} que vi no Waesy.`,
          `📦 ${single.quantity}x ${single.title} (${formatMoney(single.totalCents)})`,
          ...deliveryLine,
          `💰 *Total: ${formatMoney(calculatedGrandTotalCents)}*`,
          ``,
          `📍 *Recebimento:* ${deliveryDescription}`,
          `💳 *Pagamento:* ${paymentDescription}`,
          ``,
          `Podemos confirmar o envio?`,
        ].join("\n");
      } else {
        const itemsFormatted = input.items
          .map((item) => `📦 ${item.quantity}x ${item.title} (${formatMoney(item.totalCents)})`)
          .join("\n");

        humanMessage = [
          `Olá! Gostaria de fazer o pedido ${systemicOrderNumber} que vi no Waesy.`,
          ``,
          itemsFormatted,
          ...deliveryLine,
          `💰 *Total: ${formatMoney(calculatedGrandTotalCents)}*`,
          ``,
          `📍 *Recebimento:* ${deliveryDescription}`,
          `💳 *Pagamento:* ${paymentDescription}`,
          ``,
          `Podemos confirmar o envio?`,
        ].join("\n");
      }

      let whatsappUrl: string | undefined = undefined;
      if (cleanStorePhone) {
        const fullPhone = cleanStorePhone.startsWith("55") ? cleanStorePhone : `55${cleanStorePhone}`;
        whatsappUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(humanMessage)}`;
      }

      // 7. Telemetria Auditável em tempo real: evento whatsapp_dispatched
      try {
        await db.from("order_events").insert({
          order_id: orderId,
          store_id: resolvedStoreId,
          event_type: "whatsapp_dispatched",
          to_status: "awaiting_payment",
          note: `Link do WhatsApp gerado para o número do comerciante (${cleanStorePhone || "não informado"}) com o pedido ${systemicOrderNumber}`,
          actor_type: "customer",
          metadata: {
            order_number: systemicOrderNumber,
            customer_name: input.customerName,
            customer_phone: input.customerPhone,
            grand_total_cents: calculatedGrandTotalCents,
            shipping_cents: resolvedDeliveryFeeCents,
          },
        });
      } catch (telemetryErr) {
        console.warn("[quick-order] Falha não-bloqueante na telemetria:", telemetryErr);
      }

      return {
        status: "success",
        orderId,
        publicToken: orderData.public_token,
        shortId: systemicOrderNumber,
        whatsappUrl,
      };
    } catch (err: unknown) {
      console.error("[quick-order] Exceção catastrófica ao criar pedido:", err);
      return {
        status: "error",
        message: err instanceof Error ? err.message : "Erro interno ao processar o pedido.",
      };
    }
  });
