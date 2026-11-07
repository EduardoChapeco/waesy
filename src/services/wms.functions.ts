import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

export const startPickingSession = createServerFn({ method: "POST" })
 .validator(z.object({ orderId: z.string().uuid() }))
 .handler(async ({ data: { orderId } }) => {
 try {
 const identity = await getServerIdentity();
 await assertStoreAccess(identity, [
 "owner",
 "admin",
 "manager",
 "logistics",
 "operator",
 "stock",
 ]);

 const db = getServerClient();

 const { data, error } = await db.rpc("start_wms_picking", {
 p_order_id: orderId,
 p_operator_id: identity.id,
 p_store_id: identity.store_id,
 });

 if (error) throw error;

 return { sessionId: data };
 } catch (e: unknown) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[WMS] startPickingSession:", e instanceof Error ? e.message : String(e));
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao iniciar sessão de separação.",
 );
 }
 });

export const getPickingSessionItems = createServerFn({ method: "GET" })
 .validator(z.object({ sessionId: z.string().uuid() }))
 .handler(async ({ data: { sessionId } }) => {
 try {
 const identity = await getServerIdentity();
 await assertStoreAccess(identity, [
 "owner",
 "admin",
 "manager",
 "logistics",
 "operator",
 "stock",
 ]);

 const db = getServerClient();
 const { data, error } = await db
 .from("wms_picking_items")
 .select("id, order_item_id, qty_expected, qty_picked")
 .eq("session_id", sessionId);

 if (error) throw error;
 return data;
 } catch (e: unknown) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[WMS] getPickingSessionItems:", e instanceof Error ? e.message : String(e));
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao buscar itens da sessão.",
 );
 }
 });

export const pickWmsItem = createServerFn({ method: "POST" })
 .validator(
 z.object({
 sessionId: z.string().uuid(),
 orderItemId: z.string().uuid(),
 qty: z.number().int().positive(),
 }),
 )
 .handler(async ({ data: { sessionId, orderItemId, qty } }) => {
 try {
 const identity = await getServerIdentity();
 await assertStoreAccess(identity, [
 "owner",
 "admin",
 "manager",
 "logistics",
 "operator",
 "stock",
 ]);

 const db = getServerClient();
 const { error } = await db.rpc("pick_wms_item", {
 p_session_id: sessionId,
 p_order_item_id: orderItemId,
 p_qty: qty,
 });

 if (error) throw error;
 return { success: true };
 } catch (e: unknown) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[WMS] pickWmsItem:", e instanceof Error ? e.message : String(e));
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao registrar conferência do item.",
 );
 }
 });

export const completePickingSession = createServerFn({ method: "POST" })
 .validator(z.object({ sessionId: z.string().uuid() }))
 .handler(async ({ data: { sessionId } }) => {
 try {
 const identity = await getServerIdentity();
 await assertStoreAccess(identity, [
 "owner",
 "admin",
 "manager",
 "logistics",
 "operator",
 "stock",
 ]);

 const db = getServerClient();
 const { error } = await db.rpc("complete_wms_picking", {
 p_session_id: sessionId,
 p_operator_id: identity.id,
 });

 if (error) throw error;
 return { success: true };
 } catch (e: unknown) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[WMS] completePickingSession:", e instanceof Error ? e.message : String(e));
 throw new Error(
 (e instanceof Error ? e.message : String(e)) ||
 "Erro ao finalizar separação. Verifique se todos os itens foram conferidos.",
 );
 }
 });

// ---------------------------------------------------------------------------
// ONDAS / LOTES DE SEPARAÇÃO (WMS BATCH PICKING & BARCODE ENGINE)
// ---------------------------------------------------------------------------

export const createPickingBatch = createServerFn({ method: "POST" })
 .validator(
 z.object({
 orderIds: z.array(z.string().uuid()).min(1, "Selecione ao menos 1 pedido para o lote."),
 operatorId: z.string().uuid().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 await assertStoreAccess(identity, ["owner", "admin", "manager", "logistics", "stock"]);
 const db = getServerClient();

 const batchCode = "WAVE-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.floor(100 + Math.random() * 900);

 // 1. Criar o Lote
 const { data: batch, error: batchErr } = await db
 .from("wms_picking_batches")
 .insert({
 store_id: identity.store_id,
 batch_code: batchCode,
 operator_id: data.operatorId || identity.id,
 status: "assigned",
 total_orders: data.orderIds.length,
 started_at: new Date().toISOString(),
 })
 .select()
 .single();

 if (batchErr || !batch) {
 throw new Error("Erro ao criar lote de picking: " + (batchErr?.message || ""));
 }

 // 2. Iniciar sessões de picking para cada pedido e vincular ao lote
 let totalItems = 0;
 for (const orderId of data.orderIds) {
 try {
 const { data: sessionId } = await db.rpc("start_wms_picking", {
 p_order_id: orderId,
 p_operator_id: data.operatorId || identity.id,
 p_store_id: identity.store_id,
 });

 if (sessionId) {
 await db
 .from("wms_picking_sessions")
 .update({ batch_id: batch.id })
 .eq("id", sessionId);

 const { count } = await db
 .from("wms_picking_items")
 .select("*", { count: "exact", head: true })
 .eq("session_id", sessionId);

 totalItems += count || 0;
 }
 } catch (err) {
 console.warn(`[WMS] Aviso ao criar sessão para pedido ${orderId}:`, err);
 }
 }

 // 3. Atualizar total de itens no lote
 await db
 .from("wms_picking_batches")
 .update({ total_items: totalItems })
 .eq("id", batch.id);

 return {
 status: "success",
 batch: { ...batch, total_items: totalItems },
 };
 });

export const listPickingBatches = createServerFn({ method: "GET" })
 .validator(
 z.object({
 status: z.enum(["pending", "assigned", "in_progress", "completed", "cancelled"]).optional(),
 }).optional(),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 await assertStoreAccess(identity, ["owner", "admin", "manager", "logistics", "stock"]);
 const db = getServerClient();

 let query = db
 .from("wms_picking_batches")
 .select("*, sessions:wms_picking_sessions(id, order_id, status, items:wms_picking_items(id, qty_expected, qty_picked, barcode, order_item:order_items(id, title, product_id, products(name, sku, ean, weight_kg, width_cm, height_cm, length_cm, attributes))))")
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false });

 if (data?.status) {
 query = query.eq("status", data.status);
 }

 const { data: batches, error } = await query;
 if (error) throw new Error("Erro ao listar lotes de picking: " + error.message);
 return batches || [];
 });

export const scanBarcodePickItem = createServerFn({ method: "POST" })
 .validator(
 z.object({
 sessionId: z.string().uuid(),
 barcode: z.string().min(3),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 await assertStoreAccess(identity, ["owner", "admin", "manager", "logistics", "stock"]);
 const db = getServerClient();

 // 1. Buscar itens pendentes da sessão com metadados de embalagem e WMS do produto
 const { data: items, error } = await db
 .from("wms_picking_items")
 .select("*, order_item:order_items(id, product_id, title, metadata, products(name, sku, ean, weight_kg, width_cm, height_cm, length_cm, attributes))")
 .eq("session_id", data.sessionId);

 if (error || !items || items.length === 0) {
 throw new Error("Nenhum item encontrado para esta sessão de separação.");
 }

 // 2. Localizar item correspondente ao código de barras, EAN ou SKU
 const cleanBarcode = data.barcode.trim();
 const matchedItem = items.find((item: any) => {
 const prod = item.order_item?.products || {};
 const ean = item.barcode || prod.ean || prod.sku || item.order_item?.metadata?.barcode || item.order_item?.metadata?.ean;
 return ean === cleanBarcode || prod.sku === cleanBarcode || item.order_item_id === cleanBarcode;
 });

 if (!matchedItem) {
 throw new Error(`Código de barras "${cleanBarcode}" não pertence a nenhum item pendente neste pedido.`);
 }

 if (matchedItem.qty_picked >= matchedItem.qty_expected) {
 throw new Error(`Quantidade total do item "${matchedItem.order_item?.title}" já foi completamente separada.`);
 }

 // 3. Incrementar separação
 const newPicked = matchedItem.qty_picked + 1;
 await db
 .from("wms_picking_items")
 .update({ qty_picked: newPicked, barcode: cleanBarcode })
 .eq("id", matchedItem.id);

 const isFullyPicked = newPicked >= matchedItem.qty_expected;
 const prod = matchedItem.order_item?.products || {};
 const logistics = (prod.attributes as any)?.logistics || {};

 return {
 status: "success",
 matchedItemTitle: matchedItem.order_item?.title || prod.name,
 qtyPicked: newPicked,
 qtyExpected: matchedItem.qty_expected,
 isItemComplete: isFullyPicked,
 packagingType: logistics.packaging_type || "box",
 aisleLocation: logistics.aisle_location || null,
 fragile: Boolean(logistics.fragile),
 thermalControl: logistics.thermal_control || "ambient",
 pickingNotes: logistics.picking_notes || null,
 };
 });

export const generateShippingManifest = createServerFn({ method: "POST" })
 .validator(
 z.object({
 batchId: z.string().uuid().optional(),
 orderIds: z.array(z.string().uuid()).min(1),
 carrierName: z.string().default("Transportadora Própria"),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 await assertStoreAccess(identity, ["owner", "admin", "manager", "logistics"]);
 const db = getServerClient();

 // Buscar pedidos
 const { data: orders, error } = await db
 .from("orders")
 .select("id, code, customer_name, customer_email, shipping_address, total_amount_cents, items_count")
 .in("id", data.orderIds)
 .eq("store_id", identity.store_id);

 if (error || !orders) {
 throw new Error("Erro ao buscar pedidos para o romaneio: " + (error?.message || ""));
 }

 const manifestCode = "ROM-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.floor(1000 + Math.random() * 9000);
 const totalOrders = orders.length;
 const totalVolumeValueCents = orders.reduce((acc: number, o: any) => acc + (o.total_amount_cents || 0), 0);

 return {
 status: "success",
 manifestCode,
 carrierName: data.carrierName,
 generatedAt: new Date().toISOString(),
 totalOrders,
 totalVolumeValueCents,
 orders: orders.map((o: any) => ({
 orderId: o.id,
 orderCode: o.code || o.id.slice(0, 8),
 customerName: o.customer_name,
 address: o.shipping_address,
 })),
 };
 });
