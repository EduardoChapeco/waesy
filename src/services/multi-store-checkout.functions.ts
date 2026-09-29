import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { recordOrderMicroFee } from "./billing-ledger.functions";
import type {
  CartItemDTO,
  MultiStoreCartGroupDTO,
  MultiStoreCheckoutResultDTO,
} from "@/types/orders";

/**
 * Agrupa itens do carrinho por Loja/Lojista com cálculo isolado de frete e totais.
 */
export function groupCartItemsByStore(
  items: Array<CartItemDTO & { storeId?: string; storeName?: string; storeSlug?: string; storeLogoUrl?: string | null }>,
  storeShippingMap: Record<string, number> = {}
): MultiStoreCartGroupDTO[] {
  const groupsMap = new Map<string, MultiStoreCartGroupDTO>();

  for (const item of items) {
    const storeId = item.storeId || "loja-default";
    const storeName = item.storeName || "Loja Parceira";
    const storeSlug = item.storeSlug || "loja";
    const storeLogoUrl = item.storeLogoUrl || null;

    if (!groupsMap.has(storeId)) {
      groupsMap.set(storeId, {
        storeId,
        storeName,
        storeSlug,
        storeLogoUrl,
        items: [],
        subtotalCents: 0,
        shippingCents: storeShippingMap[storeId] ?? 0,
        totalCents: 0,
        itemCount: 0,
      });
    }

    const group = groupsMap.get(storeId)!;
    group.items.push(item);
    group.subtotalCents += item.lineTotalCents || item.priceCents * item.qty;
    group.itemCount += item.qty;
  }

  // Atualizar totais com frete de cada loja
  for (const group of groupsMap.values()) {
    group.totalCents = group.subtotalCents + group.shippingCents;
  }

  return Array.from(groupsMap.values());
}

// ---------------------------------------------------------------------------
// 1. PROCESSAR CHECKOUT MULTI-LOJA (CONSOLIDADO OU INDIVIDUAL)
// ---------------------------------------------------------------------------
export const ProcessMultiStoreCheckoutSchema = z.object({
  isConsolidated: z.boolean().default(true),
  targetStoreId: z.string().uuid().optional(), // Se for finalizar apenas uma loja específica
  paymentMethod: z.enum(["pix", "credit_card", "manual"]).default("pix"),
  shippingAddress: z.record(z.any()).optional(),
  storeGroups: z.array(
    z.object({
      storeId: z.string().uuid(),
      items: z.array(
        z.object({
          variantId: z.string(),
          qty: z.number().int().positive(),
          priceCents: z.number().int().positive(),
          productTitle: z.string(),
        })
      ),
      shippingCents: z.number().int().min(0).default(0),
    })
  ),
});

export const processMultiStoreCheckout = createServerFn({ method: "POST" })
  .validator(ProcessMultiStoreCheckoutSchema)
  .handler(async ({ data }): Promise<MultiStoreCheckoutResultDTO> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);
    const customerId = identity?.id || null;

    // Filtra para a loja alvo se o cliente escolheu "Finalizar esta Loja Agora"
    const activeGroups = data.targetStoreId
      ? data.storeGroups.filter((g) => g.storeId === data.targetStoreId)
      : data.storeGroups;

    if (activeGroups.length === 0) {
      throw new Error("Nenhuma loja selecionada para finalização do pedido.");
    }

    const createdOrders: MultiStoreCheckoutResultDTO["orders"] = [];
    let grandTotalCents = 0;

    for (const group of activeGroups) {
      // 1. Obter dados da loja
      const { data: store } = await supabase
        .from("stores")
        .select("id, name, slug")
        .eq("id", group.storeId)
        .maybeSingle();

      const storeName = store?.name || "Loja Parceira";
      const subtotalCents = group.items.reduce(
        (acc, item) => acc + item.priceCents * item.qty,
        0
      );
      const totalCents = subtotalCents + group.shippingCents;
      grandTotalCents += totalCents;

      // 2. Gerar pedido atômico individual para o lojista
      const publicToken = `ped_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
      const orderNumber = `W-${Date.now().toString().slice(-6)}-${group.storeId.slice(0, 3).toUpperCase()}`;

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          store_id: group.storeId,
          customer_id: customerId,
          public_token: publicToken,
          status: "awaiting_payment",
          subtotal_cents: subtotalCents,
          shipping_cents: group.shippingCents,
          total_cents: totalCents,
          payment_method: data.paymentMethod,
          shipping_address: data.shippingAddress || null,
        })
        .select("id, public_token")
        .single();

      if (orderErr || !order) {
        throw new Error(`Falha ao gerar pedido para ${storeName}: ${orderErr?.message}`);
      }

      // 3. Gravar itens do pedido
      const orderItemsPayload = group.items.map((it) => ({
        order_id: order.id,
        variant_id: it.variantId,
        product_title: it.productTitle,
        qty: it.qty,
        unit_price_cents: it.priceCents,
        total_cents: it.priceCents * it.qty,
      }));

      await supabase.from("order_items").insert(orderItemsPayload);

      // 4. Gravar microtaxa transacional de R$ 0,99 no Razão Financeiro do Lojista
      const microFeeCents = 99; // R$ 0,99
      await recordOrderMicroFee({
        data: {
          storeId: group.storeId,
          orderId: order.id,
          amountCents: microFeeCents,
          description: `Microtaxa transacional - Pedido #${orderNumber}`,
        },
      }).catch((e) => {
        console.warn(`[multi-store-checkout] Aviso ao registrar microtaxa para loja ${group.storeId}:`, e?.message);
      });

      createdOrders.push({
        storeId: group.storeId,
        storeName,
        orderId: order.id,
        orderNumber,
        totalCents,
        microFeeCents,
        publicToken: order.public_token,
      });
    }

    return {
      isConsolidated: !data.targetStoreId && activeGroups.length > 1,
      orders: createdOrders,
      grandTotalCents,
    };
  });
