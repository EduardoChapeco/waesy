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

 // 2. Iniciar sessões de conferência para cada pedido e vincular ao lote
 let totalItems = 0;
 let sessionsCreated = 0;
 const sessionErrors: string[] = [];
 for (const orderId of data.orderIds) {
 try {
 const { count: existingItemsCount } = await db
 .from("order_items")
 .select("*", { count: "exact", head: true })
 .eq("order_id", orderId);

 if (!existingItemsCount || existingItemsCount === 0) {
 const { data: ordRow } = await db
 .from("orders")
 .select("id, items_snapshot")
 .eq("id", orderId)
 .eq("store_id", identity.store_id)
 .maybeSingle();

 const snapshotItems = Array.isArray(ordRow?.items_snapshot) ? ordRow.items_snapshot : [];
 if (snapshotItems.length > 0) {
 const rowsToInsert = snapshotItems.map((it: any, idx: number) => {
 const qty = Math.max(1, Number(it.qty || it.quantity || 1));
 const unitPriceCents = Math.round(Number(it.unit_price_cents || it.price_cents || 0));
 return {
 order_id: orderId,
 variant_id: it.variant_id || it.variantId || null,
 product_title: String(it.product_title || it.title || it.name || `Item ${idx + 1}`),
 variant_sku: String(it.variant_sku || it.sku || it.external_sku || `SKU-${idx + 1}`),
 qty,
 unit_price_cents: unitPriceCents,
 total_cents: Math.round(Number(it.total_cents || unitPriceCents * qty)),
 };
 });
 await db.from("order_items").insert(rowsToInsert);
 }
 }

 const { data: sessionId, error: rpcErr } = await db.rpc("start_wms_picking", {
 p_order_id: orderId,
 p_operator_id: data.operatorId || identity.id,
 p_store_id: identity.store_id,
 });

 if (rpcErr) {
 sessionErrors.push(rpcErr.message);
 console.warn(`[WMS] Erro ao criar sessão para pedido ${orderId}:`, rpcErr.message);
 continue;
 }

 if (sessionId) {
 sessionsCreated += 1;
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
 const msg = err instanceof Error ? err.message : String(err);
 sessionErrors.push(msg);
 console.warn(`[WMS] Aviso ao criar sessão para pedido ${orderId}:`, err);
 }
 }

 if (sessionsCreated === 0) {
 await db.from("wms_picking_batches").delete().eq("id", batch.id);
 throw new Error(
 sessionErrors[0] ||
 "Nenhum pedido selecionado possui itens válidos para iniciar separação.",
 );
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
 .select(
 "*, sessions:wms_picking_sessions(id, order_id, status, items:wms_picking_items(id, qty_expected, qty_picked, barcode, order_item:order_items(id, product_title, variant_sku, variant_attributes, variant_id, item_id, product_variants:variant_id(sku, barcode, weight_kg, width_cm, height_cm, length_cm, products:product_id(name, sku, ean, weight_kg, width_cm, height_cm, length_cm, attributes)))))",
 )
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

 // 1. Buscar itens pendentes da sessão com metadados de embalagem e separação do produto
 const { data: items, error } = await db
 .from("wms_picking_items")
 .select(
 "*, order_item:order_items(id, variant_id, product_title, variant_sku, variant_attributes, product_variants:variant_id(sku, barcode, weight_kg, width_cm, height_cm, length_cm, products:product_id(name, sku, ean, weight_kg, width_cm, height_cm, length_cm, attributes)))",
 )
 .eq("session_id", data.sessionId);

 if (error || !items || items.length === 0) {
 throw new Error("Nenhum item encontrado para esta sessão de separação.");
 }

 // 2. Localizar item correspondente ao código de barras, EAN ou SKU
 const cleanBarcode = data.barcode.trim();
 const matchedItem = items.find((item: any) => {
 const variant = item.order_item?.product_variants || {};
 const prod = variant.products || {};
 const attrs = item.order_item?.variant_attributes || {};
 const ean =
 item.barcode ||
 variant.barcode ||
 prod.ean ||
 variant.sku ||
 item.order_item?.variant_sku ||
 prod.sku ||
 attrs.barcode ||
 attrs.ean;
 return (
 ean === cleanBarcode ||
 prod.sku === cleanBarcode ||
 variant.sku === cleanBarcode ||
 item.order_item?.variant_sku === cleanBarcode ||
 item.order_item_id === cleanBarcode ||
 item.id === cleanBarcode
 );
 });

 if (!matchedItem) {
 throw new Error(`Código de barras "${cleanBarcode}" não pertence a nenhum item pendente neste pedido.`);
 }

 if (matchedItem.qty_picked >= matchedItem.qty_expected) {
 throw new Error(`Quantidade total do item "${matchedItem.order_item?.product_title}" já foi completamente separada.`);
 }

 // 3. Incrementar separação
 const newPicked = matchedItem.qty_picked + 1;
 await db
 .from("wms_picking_items")
 .update({ qty_picked: newPicked, barcode: cleanBarcode })
 .eq("id", matchedItem.id);

 const isFullyPicked = newPicked >= matchedItem.qty_expected;
 const prod = matchedItem.order_item?.product_variants?.products || {};
 const logistics = (prod.attributes as any)?.logistics || {};

 return {
 status: "success",
 matchedItemTitle: matchedItem.order_item?.product_title || prod.name || "Item",
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

 // Buscar pedidos internos e externos vinculados
 const [{ data: storeInfo }, { data: orders, error }] = await Promise.all([
 db
 .from("stores")
 .select("name, cnpj_cpf")
 .eq("id", identity.store_id)
 .maybeSingle(),
 db
 .from("orders")
 .select("id, order_number, customer_snapshot, shipping_address, total_cents")
 .in("id", data.orderIds)
 .eq("store_id", identity.store_id),
 ]);

 if (error) {
 throw new Error("Erro ao buscar pedidos para o romaneio: " + error.message);
 }

 const matchedOrderIds = new Set((orders || []).map((o: any) => o.id));
 const missingIds = data.orderIds.filter((id) => !matchedOrderIds.has(id));
 let externalOrders: any[] = [];
 if (missingIds.length > 0) {
 const { data: extRows } = await db
 .from("marketplace_external_orders")
 .select("id, external_order_id, buyer_name, buyer_email, shipping_address, total_amount_cents")
 .in("id", missingIds)
 .eq("store_id", identity.store_id);
 externalOrders = extRows || [];
 }

 const mappedOrders = [
 ...(orders || []).map((o: any) => ({
 orderId: o.id,
 orderCode: o.order_number || o.id.slice(0, 8),
 customerName: o.customer_snapshot?.name || o.customer_snapshot?.email || "Cliente",
 address: o.shipping_address,
 totalCents: Number(o.total_cents || 0),
 })),
 ...externalOrders.map((ext: any) => ({
 orderId: ext.id,
 orderCode: ext.external_order_id || ext.id.slice(0, 8),
 customerName: ext.buyer_name || ext.buyer_email || "Cliente",
 address: ext.shipping_address,
 totalCents: Number(ext.total_amount_cents || 0),
 })),
 ];

 const manifestCode = "ROM-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.floor(1000 + Math.random() * 9000);
 const totalOrders = mappedOrders.length;
 const totalVolumeValueCents = mappedOrders.reduce((acc, o) => acc + o.totalCents, 0);

 return {
 status: "success",
 manifestCode,
 carrierName: data.carrierName,
 storeName: storeInfo?.name || null,
 storeDocument: storeInfo?.cnpj_cpf || null,
 generatedAt: new Date().toISOString(),
 totalOrders,
 totalVolumeValueCents,
 orders: mappedOrders,
 };
 });
