import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { resolveConnectorCredentialsWithRefresh } from "@/lib/marketplace-vault.server";
import {
  acknowledgeIfoodEvents,
  generateShopeeSign,
  pushIfoodOrderLifecycle,
} from "@/lib/marketplace-api-client";
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
    "rappi",
    "amodelivery",
    "99food",
    "focus_nfe",
    "nuvem_fiscal",
    "melhorenvio",
    "correios",
    "bling",
    "tiny",
    "whatsapp",
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

    const originChannelMap: Record<string, string> = {
      mercadolivre: "mercadolivre",
      ml: "mercadolivre",
      ifood: "ifood",
      shopee: "shopee",
      magalu: "magalu",
      amazon: "amazon",
      rappi: "rappi",
      amodelivery: "amodelivery",
      "99food": "99food",
      pos: "pdv",
      pdv: "pdv",
      whatsapp: "whatsapp",
    };
    const resolvedOriginChannel = originChannelMap[input.platform.toLowerCase()] || "waesy_app";
    const netPayoutCents = input.netPayoutCents || (input.totalAmountCents - (input.marketplaceFeeCents || 0));

    const { data: createdOrder, error: orderErr } = await supabase
      .from("orders")
      .insert({
        store_id: input.storeId,
        customer_id: null,
        status: orderStatus as any,
        origin_type: "marketplace",
        channel_origin: input.platform,
        origin_channel: resolvedOriginChannel,
        subtotal_cents: subtotalCents,
        shipping_cents: input.shippingCostCents,
        discount_cents: 0,
        total_cents: input.totalAmountCents,
        cost_breakdown: {
          platform_fee_cents: input.marketplaceFeeCents || 0,
          marketplace_fee_cents: input.marketplaceFeeCents || 0,
          shipping_cost_cents: input.shippingCostCents || 0,
          payment_fee_cents: 0,
          discount_cents: 0,
          net_revenue_cents: netPayoutCents,
          net_payout_cents: netPayoutCents,
          channel: resolvedOriginChannel,
        },
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

    // Busca armazém padrão para conciliação multi-galpão (Omni-Hub ERP)
    const { data: defaultLocation } = await supabase
      .from("inventory_locations")
      .select("id")
      .eq("store_id", input.storeId)
      .eq("is_default", true)
      .maybeSingle();

    const activeLocationId = defaultLocation?.id || null;

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

      // 5. Baixa de estoque física e multi-armazém se o SKU corresponder a uma variante da PRÓPRIA loja
      if (item.sku) {
        try {
          const { data: variant } = await supabase
            .from("product_variants")
            .select("id, product_id, stock_on_hand, products!inner(store_id)")
            .eq("sku", item.sku)
            .eq("products.store_id", input.storeId)
            .maybeSingle();

          if (variant) {
            const soldQty = item.quantity || 1;
            const newStock = Math.max(0, (variant.stock_on_hand || 0) - soldQty);
            await supabase
              .from("product_variants")
              .update({ stock_on_hand: newStock, updated_at: new Date().toISOString() })
              .eq("id", variant.id);

            if (activeLocationId) {
              const { data: locInv } = await supabase
                .from("product_location_inventories")
                .select("stock_qty")
                .eq("location_id", activeLocationId)
                .eq("variant_id", variant.id)
                .maybeSingle();

              if (locInv) {
                await supabase
                  .from("product_location_inventories")
                  .update({
                    stock_qty: Math.max(0, locInv.stock_qty - soldQty),
                    updated_at: new Date().toISOString(),
                  })
                  .eq("location_id", activeLocationId)
                  .eq("variant_id", variant.id);
              } else {
                await supabase
                  .from("product_location_inventories")
                  .insert({
                    location_id: activeLocationId,
                    product_id: variant.product_id,
                    variant_id: variant.id,
                    stock_qty: 0,
                  });
              }
            }

            await supabase.from("stock_movements").insert({
              store_id: input.storeId,
              variant_id: variant.id,
              location_id: activeLocationId,
              movement_type: "sale",
              qty: -soldQty,
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

  // 7. Integrações financeiras e fiscais pós-pagamento
  if (orderStatus === "paid") {
    // 7.1 Lançamento financeiro no caixa centralizado aberto (Centralized Cashier Hub)
    try {
      const { data: openRegister } = await supabase
        .from("cash_registers")
        .select("id")
        .eq("store_id", input.storeId)
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openRegister) {
        const fee = input.marketplaceFeeCents || 0;
        const netPayout = input.netPayoutCents || (input.totalAmountCents - fee);
        await supabase.from("cash_register_entries").insert({
          cash_register_id: openRegister.id,
          amount_cents: input.totalAmountCents,
          entry_type: "credit",
          notes: `Venda ${input.platform.toUpperCase()} #${input.externalOrderId}`,
          channel_source: input.platform,
          channel_origin: input.platform,
          marketplace_fee_cents: fee,
          net_payout_cents: netPayout,
          external_reference_id: String(input.externalOrderId),
        });
      }
    } catch (cashErr) {
      console.warn(`[syncOrderToMaster] Lançamento de caixa para pedido ${masterOrderId} ignorado ou falhou:`, cashErr);
    }

    // 7.2 Disparo automático de NF-e se configurado para a loja
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
async function routeWebhookPlatformEvent(
  platform: string,
  resourceId?: string,
  payload: any = {},
  storeId?: string
): Promise<{ handled: boolean; orderId: string | null }> {
  switch (platform) {
    case "mercadolivre":
      return { handled: true, orderId: await processMercadoLivreEvent(resourceId, payload, storeId) };
    case "ifood":
      return { handled: true, orderId: await processIfoodEvent(resourceId, payload, storeId) };
    case "shopee":
      return { handled: true, orderId: await processShopeeEvent(resourceId, payload, storeId) };
    case "amazon":
      return { handled: true, orderId: await processAmazonEvent(resourceId, payload, storeId) };
    case "magalu":
      return { handled: true, orderId: await processMagaluEvent(resourceId, payload, storeId) };
    case "focus_nfe":
    case "nuvem_fiscal":
      await processFiscalEvent(resourceId, payload, storeId);
      return { handled: true, orderId: null };
    case "bling":
    case "tiny":
      return { handled: true, orderId: await processBlingEvent(resourceId, payload, storeId) };
    default:
      return { handled: false, orderId: null };
  }
}

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

  try {
    const routed = await routeWebhookPlatformEvent(
      data.platform,
      data.resourceId,
      data.topic && data.payload && !data.payload.topic ? { ...data.payload, topic: data.topic } : data.payload,
      data.storeId
    );

    const finalStatus = routed.handled ? "processed" : "ignored";

    await supabase
      .from("marketplace_webhook_events")
      .update({
        status: finalStatus,
        processed_at: new Date().toISOString(),
      })
      .eq("id", recordId);

    return {
      status: finalStatus,
      eventId: recordId,
      orderId: routed.orderId,
      ...(routed.handled ? {} : { message: `Plataforma ${data.platform} sem roteador de webhook configurado.` }),
    };
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

/**
 * Re-processa eventos de webhook com falha diretamente pelo roteador sem cair em falso "duplicate".
 */
export async function retryFailedWebhooks(storeId?: string, maxAttempts = 10): Promise<{ retried: number; recovered: number }> {
  const supabase = getServerClient();

  let query = supabase
    .from("marketplace_webhook_events")
    .select("*")
    .eq("status", "failed")
    .order("created_at", { ascending: true })
    .limit(maxAttempts);

  if (storeId) {
    query = query.eq("store_id", storeId);
  }

  const { data: failedEvents } = await query;
  if (!failedEvents || failedEvents.length === 0) {
    return { retried: 0, recovered: 0 };
  }

  let recoveredCount = 0;

  for (const event of failedEvents) {
    try {
      const routed = await routeWebhookPlatformEvent(
        event.platform,
        event.resource_id || undefined,
        event.payload || {},
        event.store_id || undefined
      );

      if (routed.handled) {
        await supabase
          .from("marketplace_webhook_events")
          .update({
            status: "processed",
            error_message: null,
            retry_count: Number(event.retry_count || 0) + 1,
            processed_at: new Date().toISOString(),
          })
          .eq("id", event.id);
        recoveredCount++;
      }
    } catch (e: any) {
      await supabase
        .from("marketplace_webhook_events")
        .update({
          retry_count: Number(event.retry_count || 0) + 1,
          error_message: e?.message || "Erro na retentativa",
        })
        .eq("id", event.id);
      console.warn(`[webhooks-retry] Evento ${event.id} falhou na retentativa:`, e);
    }
  }

  return { retried: failedEvents.length, recovered: recoveredCount };
}

// ---------------------------------------------------------------------------
// PROCESSADORES ESPECÍFICOS POR PLATAFORMA (COM PULL-BACK OFICIAL PARA PAYLOAD FINO)
// ---------------------------------------------------------------------------

/**
 * Processa notificação de pedido ou pergunta do Mercado Livre.
 */
async function processMercadoLivreEvent(resourceId?: string, payload: any = {}, storeId?: string): Promise<string | null> {
  const supabase = getServerClient();
  const targetStoreId = storeId || payload.store_id;
  if (!targetStoreId) return null;

  // Intercepta perguntas pré-venda no anúncio (topic = 'questions')
  const isQuestion =
    payload.topic === "questions" ||
    String(resourceId || "").includes("/questions/") ||
    String(payload.resource || "").includes("/questions/") ||
    Boolean(payload.text && (payload.item_id || payload.question_id));

  if (isQuestion) {
    return processMercadoLivreQuestion(resourceId, payload, targetStoreId);
  }

  const rawRef = String(resourceId || payload.resource || payload.id || payload.order_id || "").trim();
  const orderId = rawRef.replace(/^\/?orders\//i, "").split("/")[0].trim();
  if (!orderId) return null;

  // Regra Oficial ML: Webhooks enviam apenas referência fina (`resource: "/orders/123"`) -> busca GET /orders/{id}
  let enriched = payload || {};
  const isThinPayload = !enriched.total_amount && !enriched.order_amount && !Array.isArray(enriched.order_items);
  if (isThinPayload) {
    try {
      const creds = await resolveConnectorCredentialsWithRefresh({
        storeId: targetStoreId,
        platform: "mercadolivre",
      });
      if (creds.accessToken) {
        const orderRes = await fetch(`https://api.mercadolibre.com/orders/${encodeURIComponent(orderId)}`, {
          headers: { Authorization: `Bearer ${creds.accessToken}` },
          signal: AbortSignal.timeout(8000),
        });
        if (orderRes.ok) {
          const fullOrder = (await orderRes.json().catch(() => null)) as Record<string, any> | null;
          if (fullOrder) {
            enriched = { ...enriched, ...fullOrder };
            if (fullOrder.shipping?.id && !fullOrder.shipping?.receiver_address) {
              const shipRes = await fetch(`https://api.mercadolibre.com/shipments/${fullOrder.shipping.id}`, {
                headers: { Authorization: `Bearer ${creds.accessToken}` },
                signal: AbortSignal.timeout(6000),
              }).catch(() => null);
              if (shipRes?.ok) {
                const shipData = await shipRes.json().catch(() => null);
                if (shipData) enriched.shipping = { ...fullOrder.shipping, ...shipData };
              }
            }
          }
        }
      }
    } catch (pullErr) {
      console.warn(`[webhooks:mercadolivre] Falha ao buscar pedido ${orderId} na API ML:`, pullErr);
    }
  }

  const totalAmountCents = Math.round(Number(enriched.total_amount || enriched.order_amount || 0) * 100);
  const rawItems = enriched.order_items || enriched.items || [];
  const itemsSaleFeeCents = Array.isArray(rawItems)
    ? rawItems.reduce((acc: number, it: any) => acc + Math.round(Number(it.sale_fee || 0) * 100), 0)
    : 0;

  const feeCents =
    enriched.fee !== undefined || enriched.marketplace_fee !== undefined
      ? Math.round(Number(enriched.fee || enriched.marketplace_fee || 0) * 100)
      : itemsSaleFeeCents > 0
        ? itemsSaleFeeCents
        : Math.round(totalAmountCents * 0.16);

  const shippingCents = Math.round(Number(enriched.shipping_cost || enriched.shipping?.cost || 0) * 100);
  const netCents = Math.max(0, totalAmountCents - feeCents);

  const buyerName = enriched.buyer?.nickname || enriched.buyer?.first_name || enriched.customer_name || "Cliente Mercado Livre";
  const buyerEmail = enriched.buyer?.email || undefined;
  const buyerPhone = enriched.buyer?.phone?.number || undefined;
  const buyerDoc = enriched.buyer?.billing_info?.doc_number || undefined;
  const shippingAddress = enriched.shipping?.receiver_address || enriched.shipping_address || null;

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
          title: enriched.title || `Venda Mercado Livre #${orderId}`,
          quantity: 1,
          unit_price_cents: totalAmountCents,
          sku: enriched.sku || `MLB-${orderId}`,
        },
      ];

  await supabase
    .from("marketplace_external_orders")
    .upsert(
      {
        store_id: targetStoreId,
        platform: "mercadolivre",
        external_order_id: String(orderId),
        external_status: enriched.status === "paid" ? "paid" : (enriched.status || "created"),
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
        payment_method: enriched.payments?.[0]?.payment_method_id || "mercadopago",
        shipping_method: "Mercado Envios",
        tracking_number: enriched.shipping?.tracking_number || null,
        items,
        import_status: "imported",
        raw_data: enriched,
        raw_payload: enriched,
        imported_at: new Date().toISOString(),
      },
      { onConflict: "store_id, platform, external_order_id" }
    );

  const masterOrderId = await syncOrderToMaster({
    storeId: targetStoreId,
    platform: "mercadolivre",
    externalOrderId: String(orderId),
    externalStatus: enriched.status || "paid",
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

  if ((enriched.status === "paid" || !enriched.status) && totalAmountCents > 0) {
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
 * Processa evento de pedido do iFood (Padrão Merchant API v1.0 com fetch + acknowledgment pós-persistência).
 */
async function processIfoodEvent(resourceId?: string, payload: any = {}, storeId?: string): Promise<string | null> {
  const supabase = getServerClient();
  const orderId = resourceId || payload.orderId || payload.id;
  if (!orderId) return null;

  const targetStoreId = storeId || payload.store_id;
  if (!targetStoreId) return null;

  let activeToken = "";
  let autoAcceptEnabled = false;
  let enriched = payload || {};

  try {
    const creds = await resolveConnectorCredentialsWithRefresh({
      storeId: targetStoreId,
      platform: "ifood",
    });
    activeToken = creds.accessToken;
    autoAcceptEnabled = Boolean(creds.settings?.auto_accept_orders);

    // Webhook fino iFood (`{ id, code, fullCode, orderId }`) exige GET /order/v1.0/orders/{orderId}
    if (activeToken && !enriched.total && !Array.isArray(enriched.items)) {
      const detailRes = await fetch(`https://merchant-api.ifood.com.br/order/v1.0/orders/${encodeURIComponent(String(orderId))}`, {
        headers: { Authorization: `Bearer ${activeToken}` },
        signal: AbortSignal.timeout(8000),
      });
      if (detailRes.ok) {
        const orderDetails = (await detailRes.json().catch(() => null)) as Record<string, any> | null;
        if (orderDetails) {
          enriched = { ...enriched, ...orderDetails };
        }
      }
    }
  } catch (pullErr) {
    console.warn(`[webhooks:ifood] Falha ao enriquecer pedido ${orderId}:`, pullErr);
  }

  const code = enriched.fullCode || enriched.code || enriched.status;
  const statusMap: Record<string, string> = {
    PLACED: "created",
    CONFIRMED: "paid",
    INTEGRATED: "paid",
    PREPARATION_STARTED: "processing",
    READY_FOR_PICKUP: "ready",
    DISPATCHED: "shipped",
    CONCLUDED: "delivered",
    DELIVERED: "delivered",
    CANCELLED: "cancelled",
  };
  const normalizedStatus = statusMap[String(code || "").toUpperCase()] || "created";

  const totalAmountCents = Math.round(Number(enriched.total?.orderAmount || enriched.orderAmount || 0) * 100);
  const feeCents =
    enriched.total?.fees !== undefined
      ? Math.round(Number(enriched.total.fees) * 100)
      : Math.round(totalAmountCents * 0.12);
  const shippingCents = Math.round(Number(enriched.total?.deliveryFee || 0) * 100);
  const netCents = Math.max(0, totalAmountCents - feeCents);

  const buyerName = enriched.customer?.name || "Cliente iFood";
  const buyerPhone = enriched.customer?.phone?.number || undefined;
  const buyerDoc = enriched.customer?.documentNumber || undefined;
  const shippingAddress = enriched.delivery?.deliveryAddress || null;

  const rawItems = enriched.items || [];
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

  const { error: extUpsertErr } = await supabase
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
        payment_method: enriched.payments?.methods?.[0]?.method || "ifood_online",
        shipping_method: "iFood Entrega",
        items,
        import_status: "imported",
        raw_data: enriched,
        raw_payload: enriched,
        imported_at: new Date().toISOString(),
      },
      { onConflict: "store_id, platform, external_order_id" }
    );

  if (extUpsertErr) {
    throw new Error(`Falha ao persistir pedido iFood em marketplace_external_orders: ${extUpsertErr.message}`);
  }

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

  if (!masterOrderId) {
    throw new Error(`Falha ao persistir pedido iFood #${orderId} na tabela mestra orders (ACK bloqueado).`);
  }

  // Regra Oficial iFood: Só enviar /events/acknowledgment APÓS gravação confirmada no banco
  if (payload.id && activeToken) {
    await acknowledgeIfoodEvents(activeToken, [String(payload.id)]);
    if (autoAcceptEnabled && String(code || "").toUpperCase() === "PLACED") {
      await pushIfoodOrderLifecycle({
        accessToken: activeToken,
        externalOrderId: String(orderId),
        targetStatus: "confirmed",
      }).catch(() => null);
    }
  }

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
 * Processa evento de pedido da Shopee v2 com pull-back em `get_order_detail` para push fino.
 */
async function processShopeeEvent(resourceId?: string, payload: any = {}, storeId?: string): Promise<string | null> {
  const supabase = getServerClient();
  const dataObj = payload?.data || {};
  const orderSn = resourceId || dataObj.ordersn || dataObj.order_sn || payload.order_sn || payload.orderId || payload.id;
  if (!orderSn) return null;

  const targetStoreId = storeId || payload.store_id;
  if (!targetStoreId) return null;

  let enriched = payload || {};
  if (!enriched.total_amount && !Array.isArray(enriched.item_list)) {
    try {
      const creds = await resolveConnectorCredentialsWithRefresh({
        storeId: targetStoreId,
        platform: "shopee",
      });
      if (creds.accessToken && creds.clientId && creds.clientSecret && creds.externalAccountId) {
        const ts = Math.floor(Date.now() / 1000);
        const apiPath = "/api/v2/order/get_order_detail";
        const sign = generateShopeeSign({
          partnerId: creds.clientId,
          partnerKey: creds.clientSecret,
          apiPath,
          timestamp: ts,
          accessToken: creds.accessToken,
          shopId: creds.externalAccountId,
        });
        const detailUrl =
          `https://partner.shopeemobile.com${apiPath}` +
          `?partner_id=${encodeURIComponent(creds.clientId)}` +
          `&timestamp=${ts}` +
          `&access_token=${encodeURIComponent(creds.accessToken)}` +
          `&shop_id=${encodeURIComponent(creds.externalAccountId)}` +
          `&sign=${sign}` +
          `&order_sn_list=${encodeURIComponent(String(orderSn))}` +
          `&response_optional_fields=buyer_username,recipient_address,item_list,total_amount,actual_shipping_fee`;

        const res = await fetch(detailUrl, { signal: AbortSignal.timeout(8000) });
        if (res.ok) {
          const detailBody = (await res.json().catch(() => ({}))) as Record<string, any>;
          const firstOrder = detailBody?.response?.order_list?.[0];
          if (firstOrder) {
            enriched = { ...enriched, ...firstOrder };
          }
        }
      }
    } catch (err) {
      console.warn(`[webhooks:shopee] Falha ao buscar pedido ${orderSn}:`, err);
    }
  }

  const totalAmountCents = Math.round(Number(enriched.total_amount || enriched.escrow_amount || 0) * 100);
  const feeCents =
    enriched.commission_fee !== undefined
      ? Math.round(Number(enriched.commission_fee) * 100)
      : Math.round(totalAmountCents * 0.14);
  const shippingCents = Math.round(Number(enriched.actual_shipping_fee || 0) * 100);
  const netCents = Math.max(0, totalAmountCents - feeCents);

  const buyerName = enriched.buyer_user?.buyer_name || enriched.buyer_username || enriched.recipient_address?.name || "Cliente Shopee";
  const buyerPhone = enriched.recipient_address?.phone || undefined;
  const shippingAddress = enriched.recipient_address || null;

  const rawItems = enriched.item_list || enriched.items || [];
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

  const shopeeSt = String(enriched.order_status || dataObj.status || "READY_TO_SHIP").toUpperCase();
  const normalizedExtStatus =
    shopeeSt === "COMPLETED" ? "delivered" : shopeeSt === "SHIPPED" ? "shipped" : shopeeSt === "CANCELLED" ? "cancelled" : "paid";

  await supabase
    .from("marketplace_external_orders")
    .upsert(
      {
        store_id: targetStoreId,
        platform: "shopee",
        external_order_id: String(orderSn),
        external_status: normalizedExtStatus,
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
        items,
        import_status: "imported",
        raw_data: enriched,
        raw_payload: enriched,
        imported_at: new Date().toISOString(),
      },
      { onConflict: "store_id, platform, external_order_id" }
    );

  return syncOrderToMaster({
    storeId: targetStoreId,
    platform: "shopee",
    externalOrderId: String(orderSn),
    externalStatus: normalizedExtStatus,
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
 * Processa evento de pedido da Amazon (SP-API Orders v0 com fetch-back quando payload fino).
 */
async function processAmazonEvent(resourceId?: string, payload: any = {}, storeId?: string): Promise<string | null> {
  const supabase = getServerClient();
  const amazonOrderId = resourceId || payload.AmazonOrderId || payload.orderId || payload.id;
  if (!amazonOrderId) return null;

  const targetStoreId = storeId || payload.store_id;
  if (!targetStoreId) return null;

  let enriched = payload || {};
  if (!enriched.OrderTotal && !enriched.total_amount) {
    try {
      const creds = await resolveConnectorCredentialsWithRefresh({
        storeId: targetStoreId,
        platform: "amazon",
      });
      if (creds.accessToken) {
        const orderRes = await fetch(
          `https://sellingpartnerapi-na.amazon.com/orders/v0/orders/${encodeURIComponent(String(amazonOrderId))}`,
          {
            headers: { "x-amz-access-token": creds.accessToken, Accept: "application/json" },
            signal: AbortSignal.timeout(8000),
          }
        );
        if (orderRes.ok) {
          const data = (await orderRes.json().catch(() => ({}))) as Record<string, any>;
          if (data.payload) enriched = { ...enriched, ...data.payload };
        }
      }
    } catch (err) {
      console.warn(`[webhooks:amazon] Falha ao buscar pedido SP-API ${amazonOrderId}:`, err);
    }
  }

  const totalAmountCents = Math.round(Number(enriched.OrderTotal?.Amount || enriched.total_amount || 0) * 100);
  const feeCents = Math.round(totalAmountCents * 0.15);
  const netCents = Math.max(0, totalAmountCents - feeCents);

  const buyerName = enriched.BuyerInfo?.BuyerName || enriched.ShippingAddress?.Name || "Cliente Amazon";
  const buyerEmail = enriched.BuyerInfo?.BuyerEmail || undefined;
  const shippingAddress = enriched.ShippingAddress || null;

  const items = [
    {
      title: enriched.ItemTitle || `Pedido Amazon #${amazonOrderId}`,
      quantity: Number(enriched.NumberOfItemsShipped || enriched.NumberOfItemsUnshipped || 1),
      unit_price_cents: totalAmountCents,
      sku: enriched.SellerSKU || `AMZ-${amazonOrderId}`,
    },
  ];

  await supabase
    .from("marketplace_external_orders")
    .upsert(
      {
        store_id: targetStoreId,
        platform: "amazon",
        external_order_id: String(amazonOrderId),
        external_status: enriched.OrderStatus === "Shipped" ? "shipped" : enriched.OrderStatus === "Canceled" ? "cancelled" : "paid",
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
        items,
        import_status: "imported",
        raw_data: enriched,
        raw_payload: enriched,
        imported_at: new Date().toISOString(),
      },
      { onConflict: "store_id, platform, external_order_id" }
    );

  return syncOrderToMaster({
    storeId: targetStoreId,
    platform: "amazon",
    externalOrderId: String(amazonOrderId),
    externalStatus: enriched.OrderStatus || "paid",
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
 * Processa evento de pedido da Magalu Open API.
 */
async function processMagaluEvent(resourceId?: string, payload: any = {}, storeId?: string): Promise<string | null> {
  const supabase = getServerClient();
  const magaluOrderId = resourceId || payload.data?.code || payload.order_id || payload.id_order || payload.id;
  if (!magaluOrderId) return null;

  const targetStoreId = storeId || payload.store_id;
  if (!targetStoreId) return null;

  let enriched = payload?.data || payload || {};
  if (!enriched.total_amount && !enriched.amounts) {
    try {
      const creds = await resolveConnectorCredentialsWithRefresh({
        storeId: targetStoreId,
        platform: "magalu",
      });
      if (creds.accessToken) {
        const res = await fetch(`https://api.magalu.com/seller/v1/orders/${encodeURIComponent(String(magaluOrderId))}`, {
          headers: { Authorization: `Bearer ${creds.accessToken}`, Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const data = (await res.json().catch(() => null)) as Record<string, any> | null;
          if (data) enriched = { ...enriched, ...data };
        }
      }
    } catch (err) {
      console.warn(`[webhooks:magalu] Falha ao buscar pedido Magalu ${magaluOrderId}:`, err);
    }
  }

  const totalAmountCents = Math.round(
    Number(enriched.amounts?.total || enriched.total_amount || enriched.total || 0) * (enriched.amounts?.total > 1000 && Number.isInteger(enriched.amounts?.total) ? 1 : 100)
  );
  const feeCents = Math.round(totalAmountCents * 0.16);
  const netCents = Math.max(0, totalAmountCents - feeCents);
  const buyerName = enriched.customer?.name || "Cliente Magalu";

  const items = Array.isArray(enriched.items) && enriched.items.length > 0
    ? enriched.items.map((it: any) => ({
        title: it.title || it.sku || "Item Magalu",
        quantity: Number(it.quantity || 1),
        unit_price_cents: Math.round(Number(it.unit_price || it.price || 0) * 100) || totalAmountCents,
        sku: it.sku || undefined,
      }))
    : [{ title: `Pedido Magalu #${magaluOrderId}`, quantity: 1, unit_price_cents: totalAmountCents, sku: `MAGALU-${magaluOrderId}` }];

  await supabase.from("marketplace_external_orders").upsert(
    {
      store_id: targetStoreId,
      platform: "magalu",
      external_order_id: String(magaluOrderId),
      external_status: String(enriched.status || "paid").toLowerCase(),
      buyer_name: buyerName,
      subtotal_cents: totalAmountCents,
      shipping_cost_cents: 0,
      marketplace_fee_cents: feeCents,
      net_payout_cents: netCents,
      total_amount_cents: totalAmountCents,
      payment_method: "magalu_payments",
      shipping_method: "Magalu Entregas",
      items,
      import_status: "imported",
      raw_data: enriched,
      raw_payload: enriched,
      imported_at: new Date().toISOString(),
    },
    { onConflict: "store_id, platform, external_order_id" }
  );

  return syncOrderToMaster({
    storeId: targetStoreId,
    platform: "magalu",
    externalOrderId: String(magaluOrderId),
    externalStatus: String(enriched.status || "paid"),
    buyerName,
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

/**
 * Processa perguntas pré-venda do Mercado Livre (com pull-back GET /questions/{id} para webhook fino)
 * e ingere em `marketplace_questions` + Central de Atendimento (`chat_threads`).
 */
async function processMercadoLivreQuestion(
  resourceId?: string,
  payload: any = {},
  storeId?: string
): Promise<string | null> {
  const supabase = getServerClient();
  const targetStoreId = storeId || payload.store_id;
  if (!targetStoreId) return null;

  const resourceDigits = resourceId ? String(resourceId).replace(/^\/?questions\//i, "").replace(/\D/g, "") : "";
  const rawQuestionId = String(payload.id || payload.question_id || resourceDigits || Date.now());

  let enriched = payload || {};
  if (!enriched.text && rawQuestionId) {
    try {
      const creds = await resolveConnectorCredentialsWithRefresh({
        storeId: targetStoreId,
        platform: "mercadolivre",
      });
      if (creds.accessToken) {
        const qRes = await fetch(`https://api.mercadolibre.com/questions/${encodeURIComponent(rawQuestionId)}`, {
          headers: { Authorization: `Bearer ${creds.accessToken}` },
          signal: AbortSignal.timeout(8000),
        });
        if (qRes.ok) {
          const fullQ = (await qRes.json().catch(() => null)) as Record<string, any> | null;
          if (fullQ) enriched = { ...enriched, ...fullQ };
        }
      }
    } catch (err) {
      console.warn(`[webhooks:mercadolivre:questions] Falha ao buscar pergunta ${rawQuestionId}:`, err);
    }
  }

  const questionText = enriched.text || enriched.question || "Dúvida do cliente no anúncio do Mercado Livre";
  const itemId = String(enriched.item_id || enriched.resource || "Item");
  const fromId = enriched.from?.id ? String(enriched.from.id) : "visitante";

  // Resolve product_id local caso exista anúncio mapeado em channel_listings
  const { data: linkedListing } = await supabase
    .from("channel_listings")
    .select("product_id")
    .eq("store_id", targetStoreId)
    .eq("channel", "mercadolivre")
    .eq("external_listing_id", itemId)
    .maybeSingle();

  // Persiste no Inbox Estruturado marketplace_questions
  const qStatus = enriched.answer?.text || enriched.status === "ANSWERED" ? "answered" : "unanswered";
  await supabase.from("marketplace_questions").upsert(
    {
      store_id: targetStoreId,
      product_id: linkedListing?.product_id || null,
      platform: "mercadolivre",
      external_question_id: rawQuestionId,
      external_item_id: itemId,
      buyer_id: fromId !== "visitante" ? fromId : null,
      buyer_nickname: enriched.from?.nickname || null,
      question_text: questionText,
      answer_text: enriched.answer?.text || null,
      status: qStatus,
      asked_at: enriched.date_created || new Date().toISOString(),
      answered_at: enriched.answer?.date_created || null,
      raw_payload: enriched,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "store_id,platform,external_question_id" }
  );

  // Busca ou cria thread em chat_threads
  const { data: existingThread } = await supabase
    .from("chat_threads")
    .select("id")
    .eq("store_id", targetStoreId)
    .eq("context_type", "mercadolivre")
    .eq("entity_id", rawQuestionId)
    .maybeSingle();

  let threadId: string;
  if (existingThread) {
    threadId = existingThread.id;
  } else {
    const { data: newThread, error: threadErr } = await supabase
      .from("chat_threads")
      .insert({
        store_id: targetStoreId,
        guest_name: enriched.from?.nickname || `Comprador ML #${fromId}`,
        guest_email: `ml_${fromId}@mercadolivre.user`,
        status: qStatus === "answered" ? "closed" : "open",
        subject: `Dúvida ML: Anúncio ${itemId}`,
        department: "vendas",
        priority: "normal",
        context_type: "mercadolivre",
        entity_id: rawQuestionId,
        last_message_text: questionText,
        last_message_at: new Date().toISOString(),
        internal_notes: `Canal: Mercado Livre Questions API | Item: ${itemId} | Question ID: ${rawQuestionId}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (threadErr || !newThread) {
      console.warn("[webhooks:mercadolivre:questions] Erro ao criar thread de chat:", threadErr);
      return null;
    }
    threadId = newThread.id;

    await supabase.from("chat_messages").insert({
      thread_id: threadId,
      message: questionText,
      message_type: "text",
      is_staff_reply: false,
      payload: {
        channel: "mercadolivre",
        question_id: rawQuestionId,
        item_id: itemId,
        from_id: fromId,
      },
      created_at: new Date().toISOString(),
    });
  }

  return threadId;
}

/**
 * Processa webhook de NFe / Faturamento do Bling ERP v3 ou Tiny ERP v2 (E2E Cross-Module)
 */
async function processBlingEvent(
  resourceId?: string,
  payload: any = {},
  storeId?: string
): Promise<string | null> {
  const supabase = getServerClient();
  const targetStoreId = storeId || payload.store_id;

  const eventType = String(payload.event || payload.tipo || payload.topic || "").toLowerCase();
  const data = payload.data || payload.retorno || payload;

  const pedidoNumero = String(data.pedido?.numero || data.numero_pedido || data.numero || resourceId || "").trim();
  const nfeKey = data.chaveAcesso || data.chave_nfe || data.chave || null;
  const danfeUrl = data.linkDanfe || data.danfe_url || data.link_danfe || null;
  const xmlUrl = data.linkXml || data.xml_url || data.link_xml || null;
  const nfeNumber = String(data.numero || data.numero_nfe || "");
  const nfeSerie = String(data.serie || data.serie_nfe || "1");
  const valorTotalCents = Math.round((Number(data.valorNota || data.valor_total || data.total || 0)) * 100);

  if (!pedidoNumero && !nfeKey) {
    console.warn("[webhooks:bling] Evento Bling recebido sem número de pedido ou chave de NFe.");
    return null;
  }

  // 1. Localiza o pedido correspondente na tabela orders
  let orderQuery = supabase
    .from("orders")
    .select("id, store_id, status, notes, cost_breakdown, customer_snapshot")
    .limit(1);

  if (targetStoreId) {
    orderQuery = orderQuery.eq("store_id", targetStoreId);
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pedidoNumero);
  if (isUuid) {
    orderQuery = orderQuery.eq("id", pedidoNumero);
  } else if (pedidoNumero) {
    orderQuery = orderQuery.or(`notes.ilike.%#${pedidoNumero}%,notes.ilike.%Bling%${pedidoNumero}%`);
  }

  const { data: matchedOrder } = await orderQuery.maybeSingle();
  const finalStoreId = targetStoreId || matchedOrder?.store_id;
  if (!finalStoreId) return null;

  const matchedOrderId = matchedOrder?.id || null;

  // 2. Se o pedido foi localizado, anexa a NF-e à compra
  if (matchedOrder) {
    const updatedNotes = `${matchedOrder.notes || ""}\n[Bling ERP] NF-e ${nfeNumber || ""} emitida. Chave: ${nfeKey || "N/A"}`.trim();
    const updatedCost = {
      ...(matchedOrder.cost_breakdown || {}),
      nfe_key: nfeKey,
      danfe_url: danfeUrl,
      bling_sync_at: new Date().toISOString(),
    };

    await supabase
      .from("orders")
      .update({
        notes: updatedNotes,
        cost_breakdown: updatedCost,
        status: (eventType.includes("nfe") || eventType.includes("autorizad")) && matchedOrder.status === "processing"
          ? "paid"
          : matchedOrder.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchedOrder.id);
  }

  // 3. Grava na tabela de notas fiscais store_nfe_invoices
  if (nfeKey || nfeNumber) {
    await supabase.from("store_nfe_invoices").upsert(
      {
        store_id: finalStoreId,
        order_id: matchedOrderId,
        invoice_type: "nfe",
        nfe_number: nfeNumber || pedidoNumero,
        nfe_serie: nfeSerie,
        nfe_key: nfeKey,
        danfe_pdf_url: danfeUrl,
        xml_url: xmlUrl,
        status: "issued",
        valor_total_cents: valorTotalCents,
        issued_at: new Date().toISOString(),
        metadata: {
          bling_event: eventType,
          bling_data: data,
          synced_via: "bling_webhook_v3",
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id,nfe_key" }
    );

    // 4. Integração com Faturamento Automático (billing_invoices)
    if (matchedOrderId) {
      await supabase.from("billing_invoices").upsert(
        {
          store_id: finalStoreId,
          order_id: matchedOrderId,
          invoice_number: nfeNumber ? `NFE-${nfeNumber}` : `INV-${pedidoNumero}`,
          status: "paid",
          amount_cents: valorTotalCents,
          pdf_url: danfeUrl,
          xml_url: xmlUrl,
          issued_at: new Date().toISOString(),
          metadata: {
            nfe_key: nfeKey,
            erp_source: "bling",
          },
        },
        { onConflict: "order_id" }
      );
    }
  }

  return matchedOrderId;
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

    const routed = await routeWebhookPlatformEvent(
      inboundData.platform,
      inboundData.resourceId,
      inboundData.topic && inboundData.payload && !inboundData.payload.topic
        ? { ...inboundData.payload, topic: inboundData.topic }
        : inboundData.payload,
      identity.store_id
    );

    const nextStatus = routed.handled ? "processed" : "ignored";

    await supabase
      .from("marketplace_webhook_events")
      .update({
        status: nextStatus,
        error_message: routed.handled ? null : `Plataforma ${inboundData.platform} sem roteador configurado.`,
        retry_count: Number(event.retry_count || 0) + 1,
        processed_at: new Date().toISOString(),
      })
      .eq("id", eventId);

    return { success: routed.handled, orderId: routed.orderId };
  });

/**
 * Dispara reprocessamento em lote dos webhooks com falha da loja atual.
 */
export const retryStoreFailedWebhooks = createServerFn({ method: "POST" })
  .validator(z.object({ maxAttempts: z.number().int().min(1).max(10).default(5) }).optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);
    const storeId = identity.store_id;
    if (!storeId) throw new Error("Loja não identificada.");
    return retryFailedWebhooks(storeId, data?.maxAttempts ?? 5);
  });
