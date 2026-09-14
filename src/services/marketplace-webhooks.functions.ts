import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { addRegisterEntry } from "./cash.functions";
import { emitOrderNFeAutomated } from "./fiscal-nfe.functions";

// ---------------------------------------------------------------------------
// TYPES & SCHEMAS
// ---------------------------------------------------------------------------

export const inboundWebhookPayloadSchema = z.object({
  platform: z.enum([
    "mercadolivre",
    "ifood",
    "shopee",
    "amazon",
    "magalu",
    "focus_nfe",
    "nuvem_fiscal",
    "melhorenvio",
    "correios",
  ]),
  eventId: z.string().optional(),
  topic: z.string().optional(),
  resourceId: z.string().optional(),
  storeId: z.string().uuid().optional(),
  payload: z.record(z.any()).default({}),
});

export type InboundWebhookPayload = z.infer<typeof inboundWebhookPayloadSchema>;

// ---------------------------------------------------------------------------
// SINCRONIZADOR ATÔMICO COM A TABELA MESTRA ORDERS (E2E)
// ---------------------------------------------------------------------------

interface MasterOrderSyncInput {
  storeId: string;
  platform: string;
  externalOrderId: string;
  externalStatus: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerDocument?: string;
  shippingAddress?: any;
  totalAmountCents: number;
  shippingCostCents: number;
  marketplaceFeeCents: number;
  netPayoutCents: number;
  items: Array<{
    title: string;
    quantity: number;
    unit_price_cents: number;
    sku?: string;
    image_url?: string;
  }>;
}

/**
 * Mapeia e sincroniza atomicamente o pedido externo na tabela mestra `public.orders`
 * e `public.order_items`, além de dar baixa no estoque (`stock_movements`) e
 * vincular a chave estrangeira em `marketplace_external_orders`.
 */
async function syncOrderToMaster(input: MasterOrderSyncInput): Promise<string | null> {
  const supabase = getServerClient();

  // 1. Mapeamento canônico do status de marketplace para order_status
  let orderStatus = "processing";
  const st = (input.externalStatus || "").toLowerCase();

  if (st === "paid" || st === "confirmed" || st === "ready_for_pickup" || st === "ready") {
    orderStatus = "paid";
  } else if (st === "shipped" || st === "dispatched" || st === "in_transit") {
    orderStatus = "shipped";
  } else if (st === "delivered" || st === "completed") {
    orderStatus = "delivered";
  } else if (st === "cancelled" || st === "rejected") {
    orderStatus = "cancelled";
  } else if (st === "created" || st === "placed" || st === "pending") {
    orderStatus = "awaiting_payment";
  }

  // 2. Normaliza lista de itens
  const sanitizedItems = input.items && input.items.length > 0
    ? input.items
    : [
        {
          title: `Pedido ${input.platform.toUpperCase()} #${input.externalOrderId}`,
          quantity: 1,
          unit_price_cents: input.totalAmountCents,
          sku: `EXT-${input.externalOrderId}`,
        },
      ];

  const subtotalCents = Math.max(0, input.totalAmountCents - input.shippingCostCents);

  // 3. Verifica se o pedido já existe na tabela orders (pelo token ou external_order_id)
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id, status")
    .eq("store_id", input.storeId)
    .eq("channel_origin", input.platform)
    .ilike("notes", `%#${input.externalOrderId}%`)
    .maybeSingle();

  let masterOrderId: string;

  if (existingOrder) {
    masterOrderId = existingOrder.id;
    // Atualiza status se mudou
    await supabase
      .from("orders")
      .update({
        status: orderStatus as any,
        updated_at: new Date().toISOString(),
      })
      .eq("id", masterOrderId);
  } else {
    // Insere novo pedido na tabela mestra `public.orders`
    const customerSnapshot = {
      name: input.buyerName || `Cliente ${input.platform}`,
      email: input.buyerEmail || null,
      phone: input.buyerPhone || null,
      document: input.buyerDocument || null,
      origin: input.platform,
      external_order_id: input.externalOrderId,
    };

    const { data: createdOrder, error: orderErr } = await supabase
      .from("orders")
      .insert({
        store_id: input.storeId,
        customer_id: null,
        status: orderStatus as any,
        origin_type: "marketplace",
        channel_origin: input.platform,
        subtotal_cents: subtotalCents,
        shipping_cents: input.shippingCostCents,
        discount_cents: 0,
        total_cents: input.totalAmountCents,
        shipping_method: input.platform === "ifood" ? "iFood Delivery" : "Mercado Envios / Transportadora",
        shipping_address: input.shippingAddress || null,
        customer_snapshot: customerSnapshot,
        items_snapshot: sanitizedItems,
        notes: `Canal: ${input.platform.toUpperCase()} | Pedido Externo #${input.externalOrderId}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (orderErr || !createdOrder) {
      console.error(`[syncOrderToMaster] Erro ao criar pedido na tabela orders:`, orderErr);
      return null;
    }

    masterOrderId = createdOrder.id;

    // 4. Insere os itens na tabela `public.order_items`
    for (const item of sanitizedItems) {
      await supabase.from("order_items").insert({
        order_id: masterOrderId,
        product_title: item.title,
        variant_sku: item.sku || `EXT-${input.externalOrderId}`,
        variant_attributes: {},
        qty: item.quantity || 1,
        unit_price_cents: item.unit_price_cents,
        total_cents: (item.quantity || 1) * item.unit_price_cents,
        image_url: item.image_url || null,
        created_at: new Date().toISOString(),
      });

      // 5. Baixa de estoque física se o SKU corresponder a uma variante da loja
      if (item.sku) {
        try {
          const { data: variant } = await supabase
            .from("product_variants")
            .select("id, stock_on_hand")
            .eq("sku", item.sku)
            .maybeSingle();

          if (variant) {
            const newStock = Math.max(0, (variant.stock_on_hand || 0) - (item.quantity || 1));
            await supabase
              .from("product_variants")
              .update({ stock_on_hand: newStock, updated_at: new Date().toISOString() })
              .eq("id", variant.id);

            await supabase.from("stock_movements").insert({
              store_id: input.storeId,
              variant_id: variant.id,
              movement_type: "sale",
              qty: -(item.quantity || 1),
              reference_type: "order",
              reference_id: masterOrderId,
              channel_origin: input.platform,
              channel_source: input.platform,
              external_order_id: String(input.externalOrderId),
              note: `Venda via Marketplace ${input.platform.toUpperCase()} #${input.externalOrderId}`,
              created_at: new Date().toISOString(),
            });
          }
        } catch (stockErr) {
          console.warn(`[syncOrderToMaster] Falha ao conciliar estoque do item ${item.sku}:`, stockErr);
        }
      }
    }
  }

  // 6. Vincula o order_id na tabela `marketplace_external_orders`
  await supabase
    .from("marketplace_external_orders")
    .update({
      order_id: masterOrderId,
    })
    .eq("store_id", input.storeId)
    .eq("platform", input.platform)
    .eq("external_order_id", String(input.externalOrderId));

  // 7. Disparo automático de NF-e se configurado para a loja
  if (orderStatus === "paid") {
    try {
      await emitOrderNFeAutomated({
        data: {
          orderId: masterOrderId,
          storeId: input.storeId,
        },
      });
    } catch (nfeErr) {
      console.warn(`[syncOrderToMaster] Emissão de NF-e pós-pedido ignorada ou falhou:`, nfeErr);
    }
  }

  return masterOrderId;
}

// ---------------------------------------------------------------------------
// WEBHOOK INBOX & IDEMPOTENCY HANDLER
// ---------------------------------------------------------------------------

/**
 * Processa um webhook de entrada de forma idempotente:
 * 1. Verifica se o eventId já foi gravado.
 * 2. Registra na tabela marketplace_webhook_events com status 'received'.
 * 3. Encaminha para a rotina específica do provedor.
 * 4. Atualiza o status para 'processed' ou 'failed'.
 */
export async function handleInboundWebhook(data: InboundWebhookPayload): Promise<{
  status: "processed" | "ignored" | "duplicate";
  eventId: string;
  orderId?: string | null;
  message?: string;
}> {
  const supabase = getServerClient();

  // 1. Verificação de idempotência se eventId estiver presente
  if (data.eventId) {
    const { data: existing } = await supabase
      .from("marketplace_webhook_events")
      .select("id, status")
      .eq("platform", data.platform)
      .eq("event_id", data.eventId)
      .maybeSingle();

    if (existing) {
      return {
        status: "duplicate",
        eventId: existing.id,
        message: "Evento já recebido e registrado anteriormente.",
      };
    }
  }

  // 2. Gravação no Transactional Inbox
  const { data: eventRecord, error: insertErr } = await supabase
    .from("marketplace_webhook_events")
    .insert({
      platform: data.platform,
      event_id: data.eventId || null,
      topic: data.topic || null,
      resource_id: data.resourceId || null,
      payload: data.payload,
      store_id: data.storeId || null,
      status: "received",
    })
    .select("id")
    .single();

  if (insertErr || !eventRecord) {
    console.error("[webhooks] Erro ao gravar webhook event:", insertErr);
    throw new Error("Falha ao registrar webhook event no transactional inbox.");
  }

  const recordId = eventRecord.id;
  let syncedOrderId: string | null = null;

  try {
    // 3. Roteamento por Provedor
    switch (data.platform) {
      case "mercadolivre":
        syncedOrderId = await processMercadoLivreEvent(data.resourceId, data.payload, data.storeId);
        break;
      case "ifood":
        syncedOrderId = await processIfoodEvent(data.resourceId, data.payload, data.storeId);
        break;
      case "shopee":
        syncedOrderId = await processShopeeEvent(data.resourceId, data.payload, data.storeId);
        break;
      case "amazon":
        syncedOrderId = await processAmazonEvent(data.resourceId, data.payload, data.storeId);
        break;
      case "focus_nfe":
      case "nuvem_fiscal":
        await processFiscalEvent(data.resourceId, data.payload, data.storeId);
        break;
      default:
        break;
    }

    // 4. Marca como processado com sucesso
    await supabase
      .from("marketplace_webhook_events")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", recordId);

    return { status: "processed", eventId: recordId, orderId: syncedOrderId };
  } catch (procErr: any) {
    console.error(`[webhooks:${data.platform}] Erro no processamento:`, procErr);
    await supabase
      .from("marketplace_webhook_events")
      .update({
        status: "failed",
        error_message: procErr?.message || "Erro desconhecido",
        processed_at: new Date().toISOString(),
      })
      .eq("id", recordId);

    return {
      status: "ignored",
      eventId: recordId,
      message: procErr?.message || "Erro no processamento interno",
    };
  }
}

// ---------------------------------------------------------------------------
// PROCESSADORES ESPECÍFICOS POR PLATAFORMA
// ---------------------------------------------------------------------------

/**
 * Processa notificação de pedido do Mercado Livre
 */
async function processMercadoLivreEvent(resourceId?: string, payload: any = {}, storeId?: string): Promise<string | null> {
  const supabase = getServerClient();
  const orderId = resourceId || payload.resource || payload.id || payload.order_id;
  if (!orderId) return null;

  const targetStoreId = storeId || payload.store_id;
  if (!targetStoreId) return null;

  const totalAmountCents = Math.round((Number(payload.total_amount || payload.order_amount || 0)) * 100);
  const feeCents = Math.round((Number(payload.fee || payload.marketplace_fee || (totalAmountCents * 0.16 / 100))) * 100);
  const shippingCents = Math.round((Number(payload.shipping_cost || payload.shipping?.cost || 0)) * 100);
  const netCents = Math.max(0, totalAmountCents - feeCents);

  const buyerName = payload.buyer?.nickname || payload.buyer?.first_name || payload.customer_name || "Cliente Mercado Livre";
  const buyerEmail = payload.buyer?.email || undefined;
  const buyerPhone = payload.buyer?.phone?.number || undefined;
  const buyerDoc = payload.buyer?.billing_info?.doc_number || undefined;
  const shippingAddress = payload.shipping?.receiver_address || payload.shipping_address || null;

  // Extrai itens do payload
  const rawItems = payload.order_items || payload.items || [];
  const items = Array.isArray(rawItems) && rawItems.length > 0
    ? rawItems.map((it: any) => ({
        title: it.item?.title || it.title || "Produto Mercado Livre",
        quantity: Number(it.quantity || 1),
        unit_price_cents: Math.round(Number(it.unit_price || it.price || 0) * 100) || totalAmountCents,
        sku: it.item?.seller_sku || it.sku || undefined,
        image_url: it.item?.thumbnail || it.thumbnail || undefined,
      }))
    : [
        {
          title: payload.title || `Venda Mercado Livre #${orderId}`,
          quantity: 1,
          unit_price_cents: totalAmountCents,
          sku: payload.sku || `MLB-${orderId}`,
        },
      ];

  // Ingestão na tabela de pedidos externos
  await supabase
    .from("marketplace_external_orders")
    .upsert(
      {
        store_id: targetStoreId,
        platform: "mercadolivre",
        external_order_id: String(orderId),
        external_status: payload.status === "paid" ? "paid" : (payload.status || "created"),
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        buyer_phone: buyerPhone,
        buyer_document: buyerDoc,
        shipping_address: shippingAddress,
        subtotal_cents: Math.max(0, totalAmountCents - shippingCents),
        shipping_cost_cents: shippingCents,
        marketplace_fee_cents: feeCents,
        net_payout_cents: netCents,
        total_amount_cents: totalAmountCents,
        payment_method: payload.payments?.[0]?.payment_method_id || "mercadopago",
        shipping_method: "Mercado Envios",
        tracking_number: payload.shipping?.tracking_number || null,
        items: items,
        import_status: "imported",
        raw_data: payload,
        imported_at: new Date().toISOString(),
      },
      { onConflict: "store_id, platform, external_order_id" }
    );

  // Sincroniza com a tabela mestra orders
  const masterOrderId = await syncOrderToMaster({
    storeId: targetStoreId,
    platform: "mercadolivre",
    externalOrderId: String(orderId),
    externalStatus: payload.status || "paid",
    buyerName,
    buyerEmail,
    buyerPhone,
    buyerDocument: buyerDoc,
    shippingAddress,
    totalAmountCents,
    shippingCostCents: shippingCents,
    marketplaceFeeCents: feeCents,
    netPayoutCents: netCents,
    items,
  });

  // Se o pedido for pago, registra no fluxo de caixa com o canal correspondente
  if ((payload.status === "paid" || !payload.status) && totalAmountCents > 0) {
    try {
      const { data: openRegister } = await supabase
        .from("cash_registers")
        .select("id")
        .eq("store_id", targetStoreId)
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openRegister?.id) {
        await addRegisterEntry({
          data: {
            registerId: openRegister.id,
            amountCents: totalAmountCents,
            method: "other",
            description: `Venda Externa Mercado Livre #${orderId}`,
            channelSource: "mercadolivre",
            marketplaceFeeCents: feeCents,
            netPayoutCents: netCents,
            externalReferenceId: String(orderId),
          },
        });
      }
    } catch (cashErr) {
      console.warn("[webhooks:mercadolivre] Falha ao registrar fluxo de caixa:", cashErr);
    }
  }

  return masterOrderId;
}

/**
 * Processa evento de pedido do iFood (Padrão OpenDelivery v1.0)
 */
async function processIfoodEvent(resourceId?: string, payload: any = {}, storeId?: string): Promise<string | null> {
  const supabase = getServerClient();
  const orderId = resourceId || payload.orderId || payload.id;
  if (!orderId) return null;

  const targetStoreId = storeId || payload.store_id;
  if (!targetStoreId) return null;

  const code = payload.code || payload.status;
  const statusMap: Record<string, string> = {
    PLACED: "created",
    CONFIRMED: "paid",
    READY_FOR_PICKUP: "ready",
    DISPATCHED: "shipped",
    DELIVERED: "delivered",
    CANCELLED: "cancelled",
  };
  const normalizedStatus = statusMap[code] || "created";

  const totalAmountCents = Math.round((Number(payload.total?.orderAmount || payload.orderAmount || 0)) * 100);
  const feeCents = Math.round((Number(payload.total?.fees || (totalAmountCents * 0.12 / 100))) * 100);
  const shippingCents = Math.round((Number(payload.total?.deliveryFee || 0)) * 100);
  const netCents = Math.max(0, totalAmountCents - feeCents);

  const buyerName = payload.customer?.name || "Cliente iFood";
  const buyerPhone = payload.customer?.phone?.number || undefined;
  const buyerDoc = payload.customer?.documentNumber || undefined;
  const shippingAddress = payload.delivery?.deliveryAddress || null;

  const rawItems = payload.items || [];
  const items = Array.isArray(rawItems) && rawItems.length > 0
    ? rawItems.map((it: any) => ({
        title: it.name || "Item iFood",
        quantity: Number(it.quantity || 1),
        unit_price_cents: Math.round(Number(it.unitPrice || 0) * 100) || totalAmountCents,
        sku: it.externalCode || undefined,
      }))
    : [
        {
          title: `Pedido iFood #${orderId}`,
          quantity: 1,
          unit_price_cents: totalAmountCents,
          sku: `IFOOD-${orderId}`,
        },
      ];

  await supabase
    .from("marketplace_external_orders")
    .upsert(
      {
        store_id: targetStoreId,
        platform: "ifood",
        external_order_id: String(orderId),
        external_status: normalizedStatus,
        buyer_name: buyerName,
        buyer_phone: buyerPhone,
        buyer_document: buyerDoc,
        shipping_address: shippingAddress,
        subtotal_cents: Math.max(0, totalAmountCents - shippingCents),
        shipping_cost_cents: shippingCents,
        marketplace_fee_cents: feeCents,
        net_payout_cents: netCents,
        total_amount_cents: totalAmountCents,
        payment_method: payload.payments?.methods?.[0]?.method || "ifood_online",
        shipping_method: "iFood Entrega",
        items: items,
        import_status: "imported",
        raw_data: payload,
        imported_at: new Date().toISOString(),
      },
      { onConflict: "store_id, platform, external_order_id" }
    );

  const masterOrderId = await syncOrderToMaster({
    storeId: targetStoreId,
    platform: "ifood",
    externalOrderId: String(orderId),
    externalStatus: normalizedStatus,
    buyerName,
    buyerPhone,
    buyerDocument: buyerDoc,
    shippingAddress,
    totalAmountCents,
    shippingCostCents: shippingCents,
    marketplaceFeeCents: feeCents,
    netPayoutCents: netCents,
    items,
  });

  if (normalizedStatus === "paid" && totalAmountCents > 0) {
    try {
      const { data: openRegister } = await supabase
        .from("cash_registers")
        .select("id")
        .eq("store_id", targetStoreId)
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openRegister?.id) {
        await addRegisterEntry({
          data: {
            registerId: openRegister.id,
            amountCents: totalAmountCents,
            method: "other",
            description: `Venda Externa iFood #${orderId}`,
            channelSource: "ifood",
            marketplaceFeeCents: feeCents,
            netPayoutCents: netCents,
            externalReferenceId: String(orderId),
          },
        });
      }
    } catch (cashErr) {
      console.warn("[webhooks:ifood] Falha ao registrar caixa:", cashErr);
    }
  }

  return masterOrderId;
}

/**
 * Processa evento de pedido da Shopee
 */
async function processShopeeEvent(resourceId?: string, payload: any = {}, storeId?: string): Promise<string | null> {
  const supabase = getServerClient();
  const orderSn = resourceId || payload.order_sn || payload.orderId || payload.id;
  if (!orderSn) return null;

  const targetStoreId = storeId || payload.store_id;
  if (!targetStoreId) return null;

  const totalAmountCents = Math.round((Number(payload.total_amount || payload.escrow_amount || 0)) * 100);
  const feeCents = Math.round((Number(payload.commission_fee || (totalAmountCents * 0.14 / 100))) * 100);
  const shippingCents = Math.round((Number(payload.actual_shipping_fee || 0)) * 100);
  const netCents = Math.max(0, totalAmountCents - feeCents);

  const buyerName = payload.buyer_user?.buyer_name || payload.recipient_address?.name || "Cliente Shopee";
  const buyerPhone = payload.recipient_address?.phone || undefined;
  const shippingAddress = payload.recipient_address || null;

  const rawItems = payload.item_list || payload.items || [];
  const items = Array.isArray(rawItems) && rawItems.length > 0
    ? rawItems.map((it: any) => ({
        title: it.item_name || "Item Shopee",
        quantity: Number(it.model_quantity_purchased || it.quantity || 1),
        unit_price_cents: Math.round(Number(it.model_discounted_price || it.price || 0) * 100) || totalAmountCents,
        sku: it.model_sku || it.item_sku || undefined,
      }))
    : [
        {
          title: `Pedido Shopee #${orderSn}`,
          quantity: 1,
          unit_price_cents: totalAmountCents,
          sku: `SHOPEE-${orderSn}`,
        },
      ];

  await supabase
    .from("marketplace_external_orders")
    .upsert(
      {
        store_id: targetStoreId,
        platform: "shopee",
        external_order_id: String(orderSn),
        external_status: payload.order_status === "COMPLETED" ? "paid" : "created",
        buyer_name: buyerName,
        buyer_phone: buyerPhone,
        shipping_address: shippingAddress,
        subtotal_cents: Math.max(0, totalAmountCents - shippingCents),
        shipping_cost_cents: shippingCents,
        marketplace_fee_cents: feeCents,
        net_payout_cents: netCents,
        total_amount_cents: totalAmountCents,
        payment_method: "shopeepay",
        shipping_method: "Shopee Xpress / Correios",
        items: items,
        import_status: "imported",
        raw_data: payload,
        imported_at: new Date().toISOString(),
      },
      { onConflict: "store_id, platform, external_order_id" }
    );

  return syncOrderToMaster({
    storeId: targetStoreId,
    platform: "shopee",
    externalOrderId: String(orderSn),
    externalStatus: payload.order_status || "paid",
    buyerName,
    buyerPhone,
    shippingAddress,
    totalAmountCents,
    shippingCostCents: shippingCents,
    marketplaceFeeCents: feeCents,
    netPayoutCents: netCents,
    items,
  });
}

/**
 * Processa evento de pedido da Amazon (SP-API)
 */
async function processAmazonEvent(resourceId?: string, payload: any = {}, storeId?: string): Promise<string | null> {
  const supabase = getServerClient();
  const amazonOrderId = resourceId || payload.AmazonOrderId || payload.orderId || payload.id;
  if (!amazonOrderId) return null;

  const targetStoreId = storeId || payload.store_id;
  if (!targetStoreId) return null;

  const totalAmountCents = Math.round((Number(payload.OrderTotal?.Amount || payload.total_amount || 0)) * 100);
  const feeCents = Math.round(totalAmountCents * 0.15);
  const netCents = Math.max(0, totalAmountCents - feeCents);

  const buyerName = payload.BuyerInfo?.BuyerName || payload.ShippingAddress?.Name || "Cliente Amazon";
  const buyerEmail = payload.BuyerInfo?.BuyerEmail || undefined;
  const shippingAddress = payload.ShippingAddress || null;

  const items = [
    {
      title: payload.ItemTitle || `Pedido Amazon #${amazonOrderId}`,
      quantity: Number(payload.NumberOfItemsShipped || 1),
      unit_price_cents: totalAmountCents,
      sku: payload.SellerSKU || `AMZ-${amazonOrderId}`,
    },
  ];

  await supabase
    .from("marketplace_external_orders")
    .upsert(
      {
        store_id: targetStoreId,
        platform: "amazon",
        external_order_id: String(amazonOrderId),
        external_status: payload.OrderStatus === "Shipped" ? "shipped" : "paid",
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        shipping_address: shippingAddress,
        subtotal_cents: totalAmountCents,
        shipping_cost_cents: 0,
        marketplace_fee_cents: feeCents,
        net_payout_cents: netCents,
        total_amount_cents: totalAmountCents,
        payment_method: "amazon_payments",
        shipping_method: "Amazon Logistics",
        items: items,
        import_status: "imported",
        raw_data: payload,
        imported_at: new Date().toISOString(),
      },
      { onConflict: "store_id, platform, external_order_id" }
    );

  return syncOrderToMaster({
    storeId: targetStoreId,
    platform: "amazon",
    externalOrderId: String(amazonOrderId),
    externalStatus: payload.OrderStatus || "paid",
    buyerName,
    buyerEmail,
    shippingAddress,
    totalAmountCents,
    shippingCostCents: 0,
    marketplaceFeeCents: feeCents,
    netPayoutCents: netCents,
    items,
  });
}

/**
 * Processa callback de autorização fiscal (Focus NFe / Nuvem Fiscal)
 */
async function processFiscalEvent(resourceId?: string, payload: any = {}, storeId?: string) {
  const supabase = getServerClient();
  const referenceId = resourceId || payload.ref || payload.id;
  if (!referenceId) return;

  const status = String(payload.status || payload.situacao || "").toLowerCase();
  let normalizedStatus: "pending" | "processing" | "issued" | "cancelled" | "error" = "processing";

  if (status.includes("autorizad") || status === "issued") {
    normalizedStatus = "issued";
  } else if (status.includes("cancelad")) {
    normalizedStatus = "cancelled";
  } else if (status.includes("rejeit") || status.includes("erro")) {
    normalizedStatus = "error";
  }

  const accessKey = payload.chave_nfe || payload.chave_acesso || null;
  const danfeUrl = payload.caminho_danfe || payload.danfe_url || payload.danfe_pdf_url || null;
  const xmlUrl = payload.caminho_xml_nota_fiscal || payload.xml_url || null;

  const updateData: Record<string, any> = {
    status: normalizedStatus,
    nfe_key: accessKey,
    danfe_pdf_url: danfeUrl,
    xml_url: xmlUrl,
    updated_at: new Date().toISOString(),
  };

  if (normalizedStatus === "issued") {
    updateData.issued_at = new Date().toISOString();
  } else if (normalizedStatus === "cancelled") {
    updateData.cancelled_at = new Date().toISOString();
  }

  await supabase
    .from("store_nfe_invoices")
    .update(updateData)
    .or(`id.eq.${referenceId},nfe_key.eq.${referenceId}`);
}

// ---------------------------------------------------------------------------
// SERVER FUNCTIONS PARA CONSULTA, AUDITORIA E REPROCESSAMENTO
// ---------------------------------------------------------------------------

/**
 * Lista os eventos de webhooks recebidos para auditoria do lojista no Workspace
 */
export const listStoreWebhookEvents = createServerFn({ method: "GET" })
  .validator(
    z.object({
      platform: z.string().optional(),
      status: z.enum(["all", "received", "processed", "ignored", "failed"]).default("all"),
      limit: z.number().int().min(1).max(100).default(30),
    }).default({ status: "all", limit: 30 })
  )
  .handler(async ({ data: { platform, status, limit } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    let query = supabase
      .from("marketplace_webhook_events")
      .select("id, platform, event_id, topic, resource_id, status, error_message, processed_at, created_at, payload")
      .eq("store_id", identity.store_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (platform && platform !== "all") {
      query = query.eq("platform", platform);
    }
    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("[listStoreWebhookEvents] Erro ao listar eventos:", error);
      return [];
    }

    return data || [];
  });

/**
 * Reprocessa um evento de webhook registrado na inbox com 1 clique.
 */
export const reprocessWebhookEvent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      eventId: z.string().uuid(),
    })
  )
  .handler(async ({ data: { eventId } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const { data: event, error } = await supabase
      .from("marketplace_webhook_events")
      .select("*")
      .eq("id", eventId)
      .eq("store_id", identity.store_id)
      .single();

    if (error || !event) {
      throw new Error("Evento não encontrado ou acesso não autorizado.");
    }

    const inboundData: InboundWebhookPayload = {
      platform: event.platform as any,
      eventId: event.event_id || undefined,
      topic: event.topic || undefined,
      resourceId: event.resource_id || undefined,
      storeId: identity.store_id,
      payload: event.payload || {},
    };

    let orderId: string | null = null;

    switch (inboundData.platform) {
      case "mercadolivre":
        orderId = await processMercadoLivreEvent(inboundData.resourceId, inboundData.payload, identity.store_id);
        break;
      case "ifood":
        orderId = await processIfoodEvent(inboundData.resourceId, inboundData.payload, identity.store_id);
        break;
      case "shopee":
        orderId = await processShopeeEvent(inboundData.resourceId, inboundData.payload, identity.store_id);
        break;
      case "amazon":
        orderId = await processAmazonEvent(inboundData.resourceId, inboundData.payload, identity.store_id);
        break;
      case "focus_nfe":
      case "nuvem_fiscal":
        await processFiscalEvent(inboundData.resourceId, inboundData.payload, identity.store_id);
        break;
      default:
        break;
    }

    await supabase
      .from("marketplace_webhook_events")
      .update({
        status: "processed",
        error_message: null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", eventId);

    return { success: true, orderId };
  });

/**
 * Simula um pedido de teste real vindo do Mercado Livre, iFood ou Shopee
 * para validação imediata no painel sem necessidade de venda externa.
 */
export const simulateMarketplaceOrder = createServerFn({ method: "POST" })
  .validator(
    z.object({
      platform: z.enum(["mercadolivre", "ifood", "shopee", "amazon"]),
      customerName: z.string().min(2).default("Cliente Simulado Waesy"),
      productTitle: z.string().min(2).default("Item de Teste de Integração"),
      totalAmountCents: z.number().int().min(100).default(12900),
      sku: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const externalId = `TEST-${Date.now().toString().slice(-6)}`;
    let payload: any = {};

    if (data.platform === "mercadolivre") {
      payload = {
        id: externalId,
        status: "paid",
        total_amount: data.totalAmountCents / 100,
        fee: (data.totalAmountCents * 0.16) / 100,
        buyer: {
          nickname: data.customerName,
          first_name: data.customerName.split(" ")[0],
          email: "cliente.teste@mercadolivre.com",
        },
        shipping: {
          cost: 15.0,
          receiver_address: {
            street_name: "Rua do Comércio",
            street_number: "500",
            city: { name: "Chapecó" },
            state: { name: "Santa Catarina" },
            zip_code: "89801-000",
          },
        },
        order_items: [
          {
            title: data.productTitle,
            quantity: 1,
            unit_price: (data.totalAmountCents - 1500) / 100,
            sku: data.sku || "SKU-TEST-01",
          },
        ],
      };
    } else if (data.platform === "ifood") {
      payload = {
        orderId: externalId,
        code: "CONFIRMED",
        customer: {
          name: data.customerName,
          phone: { number: "49999887766" },
        },
        total: {
          orderAmount: data.totalAmountCents / 100,
          fees: (data.totalAmountCents * 0.12) / 100,
          deliveryFee: 10.0,
        },
        delivery: {
          deliveryAddress: {
            formattedAddress: "Av. Getúlio Vargas, 1000 - Centro, Chapecó - SC",
          },
        },
        items: [
          {
            name: data.productTitle,
            quantity: 1,
            unitPrice: (data.totalAmountCents - 1000) / 100,
            externalCode: data.sku || "SKU-FOOD-01",
          },
        ],
      };
    } else {
      payload = {
        order_sn: externalId,
        order_status: "COMPLETED",
        total_amount: data.totalAmountCents / 100,
        commission_fee: (data.totalAmountCents * 0.14) / 100,
        buyer_user: {
          buyer_name: data.customerName,
        },
        recipient_address: {
          name: data.customerName,
          phone: "49988776655",
          full_address: "Rua São Pedro, 300 - Chapecó - SC",
        },
        items: [
          {
            item_name: data.productTitle,
            quantity: 1,
            price: data.totalAmountCents / 100,
            item_sku: data.sku || "SKU-SHOP-01",
          },
        ],
      };
    }

    const res = await handleInboundWebhook({
      platform: data.platform,
      eventId: `evt_${externalId}`,
      resourceId: externalId,
      storeId: identity.store_id,
      payload,
    });

    return {
      success: true,
      externalOrderId: externalId,
      masterOrderId: res.orderId,
      message: `Pedido simulado de ${data.platform.toUpperCase()} criado e sincronizado com sucesso!`,
    };
  });
