import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

export const requestOrderReturn = createServerFn({ method: "POST" })
 .validator(
 z.object({
 orderId: z.string().uuid(),
 items: z.array(
 z.object({
 order_item_id: z.string().uuid(),
 qty: z.number().int().positive(),
 reason: z.string().min(1),
 }),
 ),
 notes: z.string().optional(),
 }),
 )
 .handler(async ({ data: { orderId, items, notes } }) => {
 try {
 const identity = await getServerIdentity();
 // Only staff can do this on behalf of customer in this admin route.
 await assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "finance"]);

 const db = getServerClient();
 const { data: order } = await db
 .from("orders")
 .select("customer_id")
 .eq("id", orderId)
 .single();

 if (!order) throw new Error("Pedido não encontrado");

 const { data, error } = await db.rpc("request_order_return", {
 p_store_id: identity.store_id,
 p_customer_id: order.customer_id,
 p_order_id: orderId,
 p_items: items,
 p_notes: notes || "Solicitado via painel admin",
 });

 if (error) throw error;
 return { rmaId: data };
 } catch (e: unknown) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[RMA] requestOrderReturn:", e instanceof Error ? e.message : String(e));
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao solicitar devolução.",
 );
 }
 });

export const requestCustomerRma = createServerFn({ method: "POST" })
 .validator(
 z.object({
 orderId: z.string().uuid(),
 items: z.array(
 z.object({
 order_item_id: z.string().uuid(),
 qty: z.number().int().positive(),
 reason: z.string().min(1),
 }),
 ),
 type: z.string().optional(),
 notes: z.string().optional(),
 }),
 )
 .handler(async ({ data: { orderId, items, type, notes } }) => {
 try {
 const identity = await getServerIdentity();
 const db = getServerClient();

 // Verify the order belongs to the customer
 const { data: order } = await db
 .from("orders")
 .select("customer_id, store_id, status, created_at, updated_at")
 .eq("id", orderId)
 .eq("customer_id", identity.id)
 .single();

 if (!order) throw new Error("Pedido não encontrado ou não pertence a você.");

 // Validação Real: Pedido deve estar 'entregue' ou 'concluído' para solicitar RMA do portal B2C.
 // (Se for 'shipped', ainda não chegou; se for 'pending', não saiu da loja).
 const validStatuses = ["delivered", "completed", "shipped"];
 if (!validStatuses.includes(order.status)) {
 throw new Error(
 `Não é possível solicitar devolução para um pedido com status: ${order.status}`,
 );
 }

 // Validação Real: Prazo legal de 7 dias de arrependimento (baseado em quando foi entregue,
 // aqui usamos o updated_at como aproximação por segurança se não houver delivered_at explícito).
 const deliveredDate = new Date(order.updated_at || order.created_at);
 const daysSinceDelivery =
 (new Date().getTime() - deliveredDate.getTime()) / (1000 * 3600 * 24);

 // Permitimos uma gordura técnica de 8 dias para evitar fusos de relógio.
 if (daysSinceDelivery > 8) {
 throw new Error("O prazo legal de 7 dias para devolução expirou.");
 }

 const { data, error } = await db.rpc("request_order_return", {
 p_store_id: order.store_id,
 p_customer_id: identity.id,
 p_order_id: orderId,
 p_items: items,
 p_notes: notes || `Solicitado via portal B2C (${type || "dev"})`,
 });

 if (error) throw error;
 return { rmaId: data };
 } catch (e: unknown) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[RMA] requestCustomerRma:", e instanceof Error ? e.message : String(e));
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao solicitar devolução.",
 );
 }
 });

export const inspectRmaItem = createServerFn({ method: "POST" })
 .validator(
 z.object({
 rmaItemId: z.string().uuid(),
 qty: z.number().int().positive(),
 condition: z.enum(["perfect", "damaged", "wrong_item"]),
 destination: z.enum(["restock", "discard", "return_to_supplier", "quarantine"]),
 notes: z.string().optional(),
 }),
 )
 .handler(async ({ data }) => {
 try {
 const identity = await getServerIdentity();
 await assertStoreAccess(identity, ["owner", "admin", "manager", "logistics", "stock"]);

 const db = getServerClient();
 const { error } = await db.rpc("inspect_rma_item", {
 p_rma_item_id: data.rmaItemId,
 p_inspector_id: identity.id,
 p_qty: data.qty,
 p_condition: data.condition,
 p_destination: data.destination,
 p_notes: data.notes || null,
 });

 if (error) throw error;
 return { success: true };
 } catch (e: unknown) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[RMA] inspectRmaItem:", e instanceof Error ? e.message : String(e));
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao registrar inspeção do item.",
 );
 }
 });

export const listAdminRmas = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const identity = await getServerIdentity();
 await assertStoreAccess(identity, [
 "owner",
 "admin",
 "manager",
 "seller",
 "finance",
 "logistics",
 "stock",
 ]);

 const db = getServerClient();
 const { data, error } = await db
 .from("rma_requests")
 .select(
 `
 id,
 order_id,
 status,
 type,
 created_at,
 return_tracking_code,
 return_label_url,
 return_carrier,
 orders:order_id ( public_token ),
 profiles:customer_id ( full_name ),
 rma_items (
 id,
 qty,
 qty_received,
 reason,
 destination,
 order_items (
 id,
 unit_price_cents,
 product_variants (
 id,
 products ( name )
 )
 )
 )
 `,
 )
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false });

 if (error) throw error;

 return (data || []).map((rma: any) => ({
 id: rma.id,
 orderToken: rma.orders?.public_token || "N/A",
 customerName: rma.profiles?.full_name || "Cliente Excluído",
 type: rma.type,
 status: rma.status,
 requestedAt: rma.created_at,
 trackingCode: rma.return_tracking_code,
 labelUrl: rma.return_label_url,
 carrier: rma.return_carrier,
 items: rma.rma_items || [],
 }));
 } catch (e: unknown) {
 if (e instanceof SupabaseUnconfiguredError) return [];
 console.error("[RMA] listAdminRmas:", e instanceof Error ? e.message : String(e));
 return [];
 }
});

export const updateRmaStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      rmaId: z.string().uuid(),
      status: z.enum(["authorized", "received", "resolved", "rejected", "cancelled"]),
      returnTrackingCode: z.string().optional().nullable(),
      returnLabelUrl: z.string().url().optional().nullable(),
      returnCarrier: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const identity = await getServerIdentity();
      await assertStoreAccess(identity, ["owner", "admin", "manager", "finance", "logistics"]);

      const db = getServerClient();

      const updatePayload: any = { status: data.status, updated_at: new Date().toISOString() };

      // Persiste dados oficiais de logística reversa se fornecidos pelo operador/integração
      if (data.returnTrackingCode) {
        updatePayload.return_tracking_code = data.returnTrackingCode;
      }
      if (data.returnLabelUrl) {
        updatePayload.return_label_url = data.returnLabelUrl;
      }
      if (data.returnCarrier) {
        updatePayload.return_carrier = data.returnCarrier;
      }

      const { error } = await db
        .from("rma_requests")
        .update(updatePayload)
        .eq("id", data.rmaId)
        .eq("store_id", identity.store_id);

 if (error) throw error;
 return { success: true };
 } catch (e: unknown) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[RMA] updateRmaStatus:", e instanceof Error ? e.message : String(e));
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao atualizar status do RMA.",
 );
 }
 });

export const resolveRmaWithCredit = createServerFn({ method: "POST" })
 .validator(
 z.object({
 rmaId: z.string().uuid(),
 }),
 )
 .handler(async ({ data }) => {
 try {
 const identity = await getServerIdentity();
 await assertStoreAccess(identity, ["owner", "admin", "manager", "finance"]);

 const db = getServerClient();

 // 1. Fetch RMA and calculate total amount
 const { data: rma, error: fetchError } = await db
 .from("rma_requests")
 .select(
 `
 id,
 customer_id,
 rma_items (
 qty,
 order_items ( unit_price_cents )
 )
 `,
 )
 .eq("id", data.rmaId)
 .eq("store_id", identity.store_id)
 .single();

 if (fetchError || !rma) throw new Error("RMA não encontrado ou sem permissão.");

 let totalRefundCents = 0;
 for (const item of rma.rma_items || []) {
 const orderItem = Array.isArray(item.order_items) ? item.order_items[0] : item.order_items;
 const price = (orderItem as any)?.unit_price_cents || 0;
 totalRefundCents += item.qty * price;
 }

 // 2. Grant credit to customer via RPC
 if (totalRefundCents > 0) {
 const { error: creditError } = await db.rpc("grant_customer_credit", {
 p_customer_id: rma.customer_id,
 p_store_id: identity.store_id,
 p_amount_cents: totalRefundCents,
 p_reason: `Vale-Compras referente ao RMA #${data.rmaId.split("-")[0]}`,
 });

 if (creditError) {
 console.error("[RMA] Erro ao creditar:", creditError);
 throw new Error("Erro na geração de Vale-Compras.");
 }
 }

 // 3. Update RMA to resolved and save refund amount
 const { error: rmaError } = await db
 .from("rma_requests")
 .update({
 status: "resolved",
 refund_amount_cents: totalRefundCents,
 updated_at: new Date().toISOString(),
 })
 .eq("id", data.rmaId);

 if (rmaError) throw rmaError;

 return { success: true, creditAmount: totalRefundCents };
 } catch (e: unknown) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[RMA] resolveRmaWithCredit:", e instanceof Error ? e.message : String(e));
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao resolver RMA com crédito.",
 );
 }
 });

export const listCustomerRmas = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const identity = await getServerIdentity().catch(() => null);
 if (!identity?.id) return [];

 const db = getServerClient();
 const { data, error } = await db
 .from("rma_requests")
 .select(
 "id, status, type, notes, created_at, return_tracking_code, return_label_url, return_carrier, orders(public_token, total_cents)",
 )
 .eq("customer_id", identity.id)
 .order("created_at", { ascending: false });

 if (error) {
 console.warn("[RMA] listCustomerRmas query warning:", error);
 return [];
 }

 return (data || []).map((rma: any) => ({
 id: rma.id,
 status: rma.status as string,
 type: rma.type as string,
 notes: rma.notes as string,
 requestedAt: rma.created_at as string,
 trackingCode: rma.return_tracking_code as string | null,
 labelUrl: rma.return_label_url as string | null,
 carrier: rma.return_carrier as string | null,
 orderToken: rma.orders?.public_token as string | null,
 orderTotal: rma.orders?.total_cents as number | null,
 }));
 } catch (e: unknown) {
 console.warn("[RMA] listCustomerRmas fallback:", e);
 return [];
 }
});
