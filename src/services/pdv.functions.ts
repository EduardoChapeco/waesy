import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import type { 
 KdsStation, 
 RestaurantTable, 
 KdsOrder, 
 PosMultiPayment 
} from "@/types/gastronomy-pos";

// ---------------------------------------------------------------------------
// 1. KDS ESTAÇÕES / PRAÇAS DE COZINHA
// ---------------------------------------------------------------------------
export const listKdsStations = createServerFn({ method: "GET" })
 .handler(async (): Promise<KdsStation[]> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 const { data, error } = await supabase
 .from("kds_stations")
 .select("*")
 .eq("store_id", identity.store_id)
 .eq("is_active", true)
 .order("name", { ascending: true });

 if (error) throw new Error("Erro ao listar praças KDS: " + error.message);
 return (data || []) as KdsStation[];
 });

export const saveKdsStation = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid().optional(),
 name: z.string().min(2),
 slug: z.string().min(2),
 colorCode: z.string().default("#F97316"),
 icon: z.string().default("ChefHat"),
 targetPrepTimeMinutes: z.number().int().min(1).default(15),
 warningThresholdMinutes: z.number().int().min(1).default(10),
 criticalThresholdMinutes: z.number().int().min(1).default(20),
 assignedCategories: z.array(z.string()).default([]),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);

 const payload = {
 store_id: identity.store_id,
 name: data.name,
 slug: data.slug,
 color_code: data.colorCode,
 icon: data.icon,
 target_prep_time_minutes: data.targetPrepTimeMinutes,
 warning_threshold_minutes: data.warningThresholdMinutes,
 critical_threshold_minutes: data.criticalThresholdMinutes,
 assigned_categories: data.assignedCategories,
 is_active: true,
 updated_at: new Date().toISOString(),
 };

 let result;
 if (data.id) {
 const { data: updated, error } = await supabase
 .from("kds_stations")
 .update(payload)
 .eq("id", data.id)
 .eq("store_id", identity.store_id)
 .select()
 .single();
 if (error) throw new Error("Erro ao atualizar praça KDS: " + error.message);
 result = updated;
 } else {
 const { data: created, error } = await supabase
 .from("kds_stations")
 .insert(payload)
 .select()
 .single();
 if (error) throw new Error("Erro ao criar praça KDS: " + error.message);
 result = created;
 }

 return { status: "success", station: result as KdsStation };
 });

// ---------------------------------------------------------------------------
// 2. KDS COMANDAS E FILA DE PREPARO
// ---------------------------------------------------------------------------
export const listKdsActiveOrders = createServerFn({ method: "GET" })
 .validator(
 z.object({
 stationId: z.string().uuid().optional(),
 }).optional(),
 )
 .handler(async ({ data }): Promise<KdsOrder[]> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 let query = supabase
 .from("kds_orders")
 .select(`
 *,
 items:kds_order_items(*, station:kds_stations(id, name, color_code)),
 table:restaurant_tables(id, table_number, table_name, zone)
 `)
 .eq("store_id", identity.store_id)
 .in("status", ["pending", "in_preparation", "ready"])
 .order("created_at", { ascending: true });

 const { data: orders, error } = await query;
 if (error) throw new Error("Erro ao listar pedidos KDS: " + error.message);

 let result = (orders || []) as KdsOrder[];
 if (data?.stationId) {
 result = result.filter((order) => 
 order.items?.some((item) => item.station_id === data.stationId)
 );
 }

 return result;
 });

export const updateKdsOrderStatus = createServerFn({ method: "POST" })
 .validator(
 z.object({
 kdsOrderId: z.string().uuid(),
 status: z.enum(["pending", "in_preparation", "ready", "collected", "cancelled"]),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 const updates: Record<string, unknown> = {
 status: data.status,
 updated_at: new Date().toISOString(),
 };

 if (data.status === "in_preparation") {
 updates.prep_started_at = new Date().toISOString();
 } else if (data.status === "ready") {
 updates.prep_completed_at = new Date().toISOString();
 } else if (data.status === "collected") {
 updates.collected_at = new Date().toISOString();
 }

 const { data: updated, error } = await supabase
 .from("kds_orders")
 .update(updates)
 .eq("id", data.kdsOrderId)
 .eq("store_id", identity.store_id)
 .select()
 .single();

 if (error) throw new Error("Erro ao atualizar status do pedido KDS: " + error.message);
 return { status: "success", order: updated as KdsOrder };
 });

export const updateKdsItemStatus = createServerFn({ method: "POST" })
 .validator(
 z.object({
 itemId: z.string().uuid(),
 status: z.enum(["pending", "preparing", "ready", "delivered", "cancelled"]),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 const updates: Record<string, unknown> = {
 status: data.status,
 };
 if (data.status === "preparing") updates.started_at = new Date().toISOString();
 if (data.status === "ready") updates.finished_at = new Date().toISOString();

 const { data: updated, error } = await supabase
 .from("kds_order_items")
 .update(updates)
 .eq("id", data.itemId)
 .eq("store_id", identity.store_id)
 .select()
 .single();

 if (error) throw new Error("Erro ao atualizar item KDS: " + error.message);
 return { status: "success", item: updated };
 });

// ---------------------------------------------------------------------------
// 3. MESAS DE SALÃO & COMANDAS (RESTAURANT TABLES)
// ---------------------------------------------------------------------------
export const listRestaurantTables = createServerFn({ method: "GET" })
 .handler(async (): Promise<RestaurantTable[]> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 const { data, error } = await supabase
 .from("restaurant_tables")
 .select("*")
 .eq("store_id", identity.store_id)
 .order("table_number", { ascending: true });

 if (error) throw new Error("Erro ao listar mesas: " + error.message);
 return (data || []) as RestaurantTable[];
 });

export const updateRestaurantTableStatus = createServerFn({ method: "POST" })
 .validator(
 z.object({
 tableId: z.string().uuid(),
 status: z.enum(["available", "occupied", "reserved", "billing", "cleaning", "blocked"]),
 activeOrderId: z.string().uuid().optional().nullable(),
 assignedWaiterId: z.string().uuid().optional().nullable(),
 currentGuestsCount: z.number().int().min(0).optional(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 const updates: Record<string, unknown> = {
 status: data.status,
 updated_at: new Date().toISOString(),
 };

 if (data.activeOrderId !== undefined) updates.active_order_id = data.activeOrderId;
 if (data.assignedWaiterId !== undefined) updates.assigned_waiter_id = data.assignedWaiterId;
 if (data.currentGuestsCount !== undefined) updates.current_guests_count = data.currentGuestsCount;

 if (data.status === "occupied" && !data.activeOrderId) {
 updates.opened_at = new Date().toISOString();
 } else if (data.status === "available") {
 updates.active_order_id = null;
 updates.opened_at = null;
 updates.current_guests_count = 0;
 }

 const { data: updated, error } = await supabase
 .from("restaurant_tables")
 .update(updates)
 .eq("id", data.tableId)
 .eq("store_id", identity.store_id)
 .select()
 .single();

 if (error) throw new Error("Erro ao atualizar mesa: " + error.message);
 return { status: "success", table: updated as RestaurantTable };
 });

// ---------------------------------------------------------------------------
// 4. MULTI-PAGAMENTO FRACIONADO NO FECHAMENTO DE CONTA / PDV
// ---------------------------------------------------------------------------
export const processPosMultiPayment = createServerFn({ method: "POST" })
 .validator(
 z.object({
 orderId: z.string().uuid(),
 cashRegisterId: z.string().uuid().optional(),
 tableId: z.string().uuid().optional(),
 payments: z.array(
 z.object({
 paymentMethod: z.enum(["cash", "pix", "credit_card", "debit_card", "meal_voucher", "store_credit", "cryptocurrency", "other"]),
 amountCents: z.number().int().positive(),
 changeCents: z.number().int().min(0).default(0),
 installments: z.number().int().min(1).default(1),
 cardBrand: z.string().optional(),
 authorizationCode: z.string().optional(),
 payerName: z.string().optional(),
 payerDocumentMasked: z.string().optional(),
 }),
 ).min(1, "É necessário ao menos uma forma de pagamento."),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 // 1. Validar Pedido
 const { data: order, error: orderErr } = await supabase
 .from("orders")
 .select("id, store_id, total_amount_cents, payment_status")
 .eq("id", data.orderId)
 .eq("store_id", identity.store_id)
 .single();

 if (orderErr || !order) {
 throw new Error("Pedido não encontrado no workspace.");
 }

 // 2. Inserir desdobramento em pos_multi_payments
 const multiPaymentsRows = data.payments.map((p) => ({
 store_id: identity.store_id,
 order_id: data.orderId,
 cash_register_id: data.cashRegisterId,
 payment_method: p.paymentMethod,
 amount_cents: p.amountCents,
 change_cents: p.changeCents,
 installments: p.installments,
 card_brand: p.cardBrand,
 authorization_code: p.authorizationCode,
 payer_name: p.payerName,
 payer_document_masked: p.payerDocumentMasked,
 status: "approved",
 received_by: identity.id,
 }));

 const { data: insertedPayments, error: insertErr } = await supabase
 .from("pos_multi_payments")
 .insert(multiPaymentsRows)
 .select();

 if (insertErr) {
 throw new Error("Erro ao registrar pagamentos fracionados: " + insertErr.message);
 }

  // 3. Se houver caixa aberto, lançar os valores em dinheiro/PIX/cartão em cash_register_entries (Centralized Cashier)
  if (data.cashRegisterId) {
    const cashEntries = data.payments
      .filter((p) => ["cash", "pix", "debit_card", "credit_card"].includes(p.paymentMethod))
      .map((p) => ({
        cash_register_id: data.cashRegisterId,
        order_id: data.orderId,
        amount_cents: p.amountCents,
        entry_type: "sale",
        payment_method: p.paymentMethod,
        notes: `Recebimento PDV - Pedido #${data.orderId.slice(0, 8)}`,
        created_by: identity.id,
        channel_source: "pos_counter",
        channel_origin: "pos_counter",
        marketplace_fee_cents: 0,
        net_payout_cents: p.amountCents,
        external_reference_id: data.orderId,
      }));

    if (cashEntries.length > 0) {
      await supabase.from("cash_register_entries").insert(cashEntries);
    }
  }

  // 4. Baixa de estoque multi-armazém dos itens do pedido PDV (Omni-Hub ERP)
  try {
    const { data: defaultLocation } = await supabase
      .from("inventory_locations")
      .select("id")
      .eq("store_id", identity.store_id)
      .eq("is_default", true)
      .maybeSingle();

    const activeLocationId = defaultLocation?.id || null;

    const { data: orderItems } = await supabase
      .from("order_items")
      .select("id, variant_sku, qty")
      .eq("order_id", data.orderId);

    if (orderItems && orderItems.length > 0) {
      for (const item of orderItems) {
        if (!item.variant_sku) continue;
        const { data: variant } = await supabase
          .from("product_variants")
          .select("id, product_id, stock_on_hand")
          .eq("sku", item.variant_sku)
          .maybeSingle();

        if (variant) {
          const soldQty = item.qty || 1;
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
            }
          }

          await supabase.from("stock_movements").insert({
            store_id: identity.store_id,
            variant_id: variant.id,
            location_id: activeLocationId,
            movement_type: "sale",
            qty: -soldQty,
            reference_type: "order",
            reference_id: data.orderId,
            channel_origin: "pdv",
            channel_source: "pos_counter",
            note: `Venda PDV Balcão - Pedido #${data.orderId.slice(0, 8)}`,
            created_at: new Date().toISOString(),
          });
        }
      }
    }
  } catch (stockErr) {
    console.warn("[processPosMultiPayment] Baixa de estoque PDV ignorada ou falhou:", stockErr);
  }

  // 5. Atualizar Pedido para 'paid' e atribuir canal de origem e margem limpa
  const totalPaidCents = data.payments.reduce((acc, p) => acc + p.amountCents, 0);
  await supabase
    .from("orders")
    .update({
      payment_status: "paid",
      status: "processing",
      channel_origin: data.tableId ? "table" : "pdv",
      origin_channel: "pdv",
      cost_breakdown: {
        platform_fee_cents: 0,
        payment_fee_cents: 0,
        shipping_cost_cents: 0,
        net_revenue_cents: totalPaidCents,
        net_payout_cents: totalPaidCents,
        channel: "pdv",
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.orderId);

 // 5. Liberar mesa caso informada
 if (data.tableId) {
 await supabase
 .from("restaurant_tables")
 .update({
 status: "available",
 active_order_id: null,
 opened_at: null,
 current_guests_count: 0,
 updated_at: new Date().toISOString(),
 })
 .eq("id", data.tableId);
 }

 return {
 status: "success",
 totalPaidCents: data.payments.reduce((acc, p) => acc + p.amountCents, 0),
 payments: insertedPayments as PosMultiPayment[],
 };
 });
