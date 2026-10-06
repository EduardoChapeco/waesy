/**
 * marketplace-checkout.functions.ts — BFF de Checkout do Marketplace B2C
 *
 * Fase F08 do Plano Mestre de Estabilização dos 4 Pilares.
 *
 * Provê cálculo determinístico de frete e criação transacional de pedidos do Marketplace,
 * com reserva de estoque, isolamento por loja (Workspace Pro) e emissão de eventos de domínio.
 *
 * Invariantes: M01 (Zero Mocks), M03 (Auditabilidade), M04 (Idempotência), M08 (Integridade Transacional).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAnonServerClient, getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { publishDomainEvent } from "./domain-events.functions";
import { getServerIdentity } from "@/lib/server-access";
import { createGatewayPayment } from "./payment-gateway.server";

// ---------------------------------------------------------------------------
// Schemas Zod de Entrada e Saída
// ---------------------------------------------------------------------------

export const calculateShippingInputSchema = z.object({
  storeId: z.string().uuid(),
  cep: z.string().min(8).max(9),
  subtotalCents: z.number().int().min(0).default(0),
  weightGrams: z.number().int().min(0).default(500),
});

export interface ShippingOptionDTO {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  estimatedDelivery: string;
  isFree: boolean;
}

export const marketplaceCustomerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phone: z.string().min(8, "Telefone inválido"),
  email: z.string().email("E-mail inválido").optional().nullable(),
  cpf: z.string().optional().nullable(),
});

export const marketplaceAddressSchema = z.object({
  street: z.string().min(1, "Rua é obrigatória"),
  number: z.string().min(1, "Número é obrigatório"),
  neighborhood: z.string().min(1, "Bairro é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(2).max(2, "UF inválida"),
  cep: z.string().min(8, "CEP inválido"),
  complement: z.string().optional().nullable(),
});

export const marketplaceOrderItemSchema = z.object({
  productId: z.string().uuid("ID de produto inválido"),
  title: z.string().min(1),
  priceCents: z.number().int().positive("Preço deve ser positivo"),
  quantity: z.number().int().positive("Quantidade deve ser positiva"),
  selectedOptions: z.record(z.any()).optional().nullable(),
});

export const createMarketplaceOrderInputSchema = z.object({
  storeId: z.string().uuid("ID da loja inválido"),
  customer: marketplaceCustomerSchema,
  shippingAddress: marketplaceAddressSchema,
  shippingOptionId: z.string().min(1),
  shippingCents: z.number().int().min(0),
  paymentMethod: z.enum(["pix", "credit_card", "cash_on_delivery"]),
  cardToken: z.string().min(8).optional().nullable(),
  installments: z.number().int().min(1).max(12).optional(),
  items: z.array(marketplaceOrderItemSchema).min(1, "O carrinho não pode estar vazio"),
  idempotencyKey: z.string().min(8, "Chave de idempotência necessária"),
  notes: z.string().optional().nullable(),
});

function subtotalCentsFor(items: Array<{ priceCents: number; quantity: number }>): number {
  return items.reduce((acc, item) => acc + item.priceCents * item.quantity, 0);
}

export interface CreateMarketplaceOrderResult {
  success: boolean;
  orderId: string;
  orderNumber: string;
  totalCents: number;
  subtotalCents: number;
  shippingCents: number;
  paymentMethod: string;
  pixPayload?: {
    copyPasteCode: string;
    qrCodeText: string;
  };
  wasAlreadyCreated?: boolean;
}

// ---------------------------------------------------------------------------
// 1. calculateMarketplaceShippingFn
// ---------------------------------------------------------------------------

export const calculateMarketplaceShippingFn = createServerFn({ method: "POST" })
  .validator((input: z.infer<typeof calculateShippingInputSchema>) =>
    calculateShippingInputSchema.parse(input),
  )
  .handler(async ({ data }): Promise<ShippingOptionDTO[]> => {
    const { storeId, cep, subtotalCents } = data;

    try {
      const db = getAnonServerClient();

      // Verificar existência da loja e configurações de frete
      const { data: store } = await db
        .from("stores")
        .select("id, name, settings, address, city, state")
        .eq("id", storeId)
        .maybeSingle();

      if (!store) throw new Error("Loja não encontrada");
      const settings = (store.settings ?? {}) as Record<string, any>;
      const rates = (settings.shippingRates ?? {}) as Record<string, unknown>;
      const estimates = (settings.shippingEstimates ?? {}) as Record<string, unknown>;
      const freeThreshold = typeof settings.freeShippingThresholdCents === "number"
        ? settings.freeShippingThresholdCents : null;
      const isEligibleForFreeShipping = freeThreshold !== null && subtotalCents >= freeThreshold;

      const options: ShippingOptionDTO[] = [
        {
          id: "retirada",
          title: "Retirada no Estabelecimento",
          description: store?.address
            ? `Retire em ${store.address}, ${store.city || ""}`
            : "Retirada no endereço informado pela loja",
          priceCents: 0,
          estimatedDelivery: String(estimates.retirada ?? "Prazo informado pela loja"),
          isFree: true,
        },
        {
          id: "motolink_express",
          title: String((settings.shippingLabels as Record<string, unknown> | undefined)?.motolink_express ?? "Entrega local"),
          description: "Tarifa configurada pela loja",
          priceCents: isEligibleForFreeShipping ? 0 : Number(rates.motolink_express ?? -1),
          estimatedDelivery: String(estimates.motolink_express ?? "Prazo informado pela loja"),
          isFree: isEligibleForFreeShipping,
        },
        {
          id: "padrao",
          title: String((settings.shippingLabels as Record<string, unknown> | undefined)?.padrao ?? "Entrega convencional"),
          description: `Envio para CEP ${cep}`,
          priceCents: isEligibleForFreeShipping ? 0 : Number(rates.padrao ?? -1),
          estimatedDelivery: String(estimates.padrao ?? "Prazo informado pela loja"),
          isFree: isEligibleForFreeShipping,
        },
      ];

      return options.filter((option) => option.id === "retirada" || option.priceCents >= 0);
    } catch (err: unknown) {
      console.error("[marketplace-checkout] Falha real no cálculo de frete:", err);
      throw new Error("Não foi possível calcular o frete com dados reais da loja.");
    }
  });

// ---------------------------------------------------------------------------
// 2. createMarketplaceOrderFn
// ---------------------------------------------------------------------------

export const createMarketplaceOrderFn = createServerFn({ method: "POST" })
  .validator((input: z.infer<typeof createMarketplaceOrderInputSchema>) =>
    createMarketplaceOrderInputSchema.parse(input),
  )
  .handler(async ({ data }): Promise<CreateMarketplaceOrderResult> => {
    const identity = await getServerIdentity().catch(() => null);
    const supabase = getServerClient();
    const { data: atomic, error } = await supabase.rpc("create_marketplace_checkout_atomic", {
      p_store_id: data.storeId,
      p_customer_id: identity?.id || null,
      p_customer_snapshot: data.customer,
      p_shipping_address: data.shippingAddress,
      p_shipping_method: data.shippingOptionId === "retirada" ? "pickup" : "delivery",
      p_shipping_cents: data.shippingCents,
      p_payment_method: data.paymentMethod === "cash_on_delivery" ? "manual" : data.paymentMethod,
      p_items: data.items,
      p_idempotency_key: data.idempotencyKey,
      p_notes: data.notes || null,
    });
    if (error || !atomic) throw new Error("Não foi possível criar o pedido de forma transacional.");

    const orderId = String(atomic.order_id);
    const paymentId = String(atomic.payment_id);
    if (atomic.status === "already_created") {
      return {
        success: true,
        orderId,
        orderNumber: String(atomic.public_token),
        totalCents: Number(atomic.total_cents),
        subtotalCents: Number(atomic.subtotal_cents),
        shippingCents: Number(atomic.shipping_cents),
        paymentMethod: data.paymentMethod,
        wasAlreadyCreated: true,
      };
    }

    let gateway: Awaited<ReturnType<typeof createGatewayPayment>> | null = null;
    try {
      gateway = data.paymentMethod === "cash_on_delivery" ? null : await createGatewayPayment({
        orderId,
        amountCents: Number(atomic.total_cents),
        method: data.paymentMethod,
        idempotencyKey: data.idempotencyKey,
        payer: data.customer,
        cardToken: data.cardToken,
        installments: data.installments,
      });
    } catch (gatewayError) {
      if (data.paymentMethod !== "cash_on_delivery") {
        await supabase.rpc("mark_payment_failed_atomic", {
          p_payment_id: paymentId,
          p_reason: gatewayError instanceof Error ? gatewayError.message : "Gateway indisponível",
        });
      }
      throw gatewayError;
    }

    const { error: paymentUpdateError } = await supabase.from("payments").update({
      provider_name: gateway?.provider ?? "manual",
      provider_ref: gateway?.providerRef ?? null,
      gateway_payload: gateway?.payload ?? {},
      status: gateway ? (gateway.status === "paid" ? "processing" : gateway.status) : "pending",
      updated_at: new Date().toISOString(),
    }).eq("id", paymentId);
    if (paymentUpdateError) throw new Error("Pedido criado, mas não foi possível registrar a referência do gateway.");

    await publishDomainEvent({
      eventName: "order.created",
      entityType: "order",
      entityId: orderId,
      storeId: data.storeId,
      title: `Pagamento iniciado para o pedido ${atomic.public_token}`,
      description: gateway
        ? "Pagamento encaminhado ao gateway; confirmação depende de webhook assinado."
        : "Pedido criado para pagamento na entrega; confirmação será operada pelo estabelecimento.",
      metadata: { orderId, paymentId, provider: gateway?.provider ?? "manual" },
    });

    return {
      success: true,
      orderId,
      orderNumber: String(atomic.public_token),
      totalCents: Number(atomic.total_cents),
      subtotalCents: Number(atomic.subtotal_cents),
      shippingCents: Number(atomic.shipping_cents),
      paymentMethod: data.paymentMethod,
      pixPayload: gateway?.pix?.qrCode ? {
        copyPasteCode: gateway.pix.qrCode,
        qrCodeText: gateway.pix.qrCode,
      } : undefined,
      wasAlreadyCreated: false,
    };
  });
