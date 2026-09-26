import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { getSSRClient, getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { requireAdmin } from "@/lib/server-access";
import { emitOrderNFeAutomated } from "@/services/fiscal-nfe.functions";
import { sendWhatsAppNotification } from "@/services/integrations.functions";
import { withDataPayload } from "@/services/cart-helpers";
import { recordLedgerEntryCore } from "@/services/immutable-ledger.functions";

// ---------------------------------------------------------------------------
// Order status enum (shared between validator and domain logic)
// ---------------------------------------------------------------------------

export const ORDER_STATUS_VALUES = [
 "draft",
 "awaiting_shipping_quote",
 "awaiting_payment",
 "payment_processing",
 "paid",
 "processing",
 "ready_for_pickup",
 "shipped",
 "delivered",
 "completed",
 "cancelled",
 "payment_failed",
 "return_requested",
 "returned",
 "refunded",
] as const;

// ---------------------------------------------------------------------------
// Handlers (decoupled for unit testing)
// ---------------------------------------------------------------------------

export async function _listOrders(store_id: string) {
 const db = getServerClient();

 const { data, error } = await db
 .from("orders")
 .select(
 `
 id, order_number, public_token, status, total_cents, subtotal_cents, shipping_cents, customer_snapshot, created_at, shipping_method,
 shipping_address, channel_origin, prep_started_at, ready_at, table_identifier, notes, custom_fields,
 order_items ( id, product_title, variant_sku, qty, unit_price_cents, total_cents, metadata, item_type, item_id, selected_options )
 `,
 )
 .eq("store_id", store_id)
 .order("created_at", { ascending: false });

 if (error) throw error;
 return data || [];
}

export async function _getOrderById(orderId: string, store_id: string) {
 const db = getServerClient();

 const { data, error } = await db
 .from("orders")
 .select(
 `
 id, order_number, public_token, status, total_cents, subtotal_cents, shipping_cents, discount_cents,
 customer_snapshot, created_at, shipping_method, shipping_address, notes, custom_fields,
 shipped_at, delivered_at,
 order_items ( id, product_title, variant_sku, qty, unit_price_cents, total_cents, metadata, item_type, item_id, selected_options ),
 shipments ( id, tracking_code, carrier_name, tracking_url, status, shipped_at, delivered_at )
 `,
 )
 .eq("id", orderId)
 .eq("store_id", store_id)
 .single();

 if (error) throw new Error("Pedido não encontrado");
 return data;
}

export async function _updateOrderStatus(
 orderId: string,
 status: (typeof ORDER_STATUS_VALUES)[number],
 store_id: string,
) {
 const db = getServerClient();

 const { data: order, error: orderError } = await db
 .from("orders")
 .select("id, order_number, customer_id, public_token, total_cents, store_id, customer_snapshot, shipping_address")
 .eq("id", orderId)
 .eq("store_id", store_id)
 .single();
 if (orderError || !order) throw new Error("Pedido não encontrado ou acesso negado.");

 if (status === "cancelled") {
 // Phase 4: Atomic cancellation with stock and commission reversals
 const { error: rpcError } = await db.rpc("cancel_order", {
 p_order_id: orderId,
 p_reason: "Cancelado pelo administrador.",
 });

 if (rpcError) {
 throw new Error("Erro ao cancelar o pedido: " + rpcError.message);
 }

 // Notificar cliente se cadastrado
 if (order.customer_id) {
 try {
 await db.from("notifications").insert({
 user_id: order.customer_id,
 type: "order_cancelled",
 title: "Pedido Cancelado",
 message: `Seu pedido #${order.public_token.substring(0, 8)} foi cancelado e eventuais estornos foram processados.`,
 link_url: `/conta/pedidos/${order.id}`,
 is_read: false,
 });
 } catch (err) {
 console.error("[order.functions] Falha ao notificar cancelamento:", err);
 }
 }

 return { status: "ok" as const, message: "Pedido cancelado com sucesso." };
 }

 const updatePayload: Record<string, any> = { status };
 if (status === "paid") {
  updatePayload.paid_at = new Date().toISOString();
  // Disparo em background da emissão automatizada de NF-e na confirmação de pagamento
  emitOrderNFeAutomated({ data: { orderId, storeId: store_id } })
   .then((res) => {
    if (res.success && res.invoice) {
     console.log(`[fiscal] NF-e #${res.invoice.nfe_number} emitida automaticamente no pagamento do pedido ${orderId}`);
    }
   })
   .catch((err) => {
    console.warn(`[fiscal] Background auto-emit (paid) aviso para o pedido ${orderId}:`, err);
   });
 }
 if (status === "processing") {
  updatePayload.prep_started_at = new Date().toISOString();
  // Disparo em background da emissão automatizada de NF-e na separação (idempotente - checa duplicidade)
  emitOrderNFeAutomated({ data: { orderId, storeId: store_id } })
   .then((res) => {
    if (res.success && res.invoice) {
     console.log(`[fiscal] NF-e #${res.invoice.nfe_number} emitida automaticamente para o pedido ${orderId}`);
    }
   })
   .catch((err) => {
    console.warn(`[fiscal] Background auto-emit (processing) aviso para o pedido ${orderId}:`, err);
   });
 }
 if (status === "shipped") updatePayload.shipped_at = new Date().toISOString();
 if (status === "delivered") updatePayload.delivered_at = new Date().toISOString();

 const { error } = await db.from("orders").update(updatePayload).eq("id", orderId);
 if (error) throw error;

 // ── Ledger Criptográfico SHA-256 — registra transições financeiras críticas ──
 // Qualquer transição financeira confirmável gera entrada imutável com hash encadeado
 if (status === "paid") {
  try {
   await recordLedgerEntryCore({
    transactionType: "order_payment",
    amountCents: order.total_cents ?? 0,
    receiverId: order.customer_id,
    storeId: order.store_id,
    referenceEntityType: "order",
    referenceEntityId: orderId,
    metadata: {
     order_public_token: order.public_token,
     previous_status: "processing",
     new_status: status,
     customer_id: order.customer_id,
    },
   });
  } catch (ledgerErr) {
   // Não bloqueia o fluxo — loga para investigação posterior
   console.error("[order.functions] Falha ao registrar no ledger imutável:", ledgerErr);
  }
 }

 // Notificar cliente sobre envio ou entrega
 if (order.customer_id && (status === "shipped" || status === "delivered" || status === "paid")) {
 const titlesMap: Record<string, string> = {
 paid: "Pagamento Confirmado",
 shipped: "Pedido a Caminho",
 delivered: "Pedido Entregue",
 };
 const msgsMap: Record<string, string> = {
 paid: `O pagamento do seu pedido #${order.public_token.substring(0, 8)} foi aprovado!`,
 shipped: `Seu pedido #${order.public_token.substring(0, 8)} foi despachado e está a caminho.`,
 delivered: `Seu pedido #${order.public_token.substring(0, 8)} foi entregue com sucesso!`,
 };

 if (titlesMap[status]) {
 try {
 await db.from("notifications").insert({
 user_id: order.customer_id,
 type: `order_${status}`,
 title: titlesMap[status],
 message: msgsMap[status],
 link_url: `/conta/pedidos/${order.id}`,
 is_read: false,
 });

 // Notificação transacional WhatsApp (se a loja tiver WhatsApp Cloud API ativa)
 const recipientPhone = (order as any).customer_snapshot?.phone || ((order as any).shipping_address as any)?.phone;
 if (recipientPhone && msgsMap[status]) {
   sendWhatsAppNotification({
     storeId: store_id,
     recipientPhone,
     messageText: msgsMap[status],
   }).catch((waErr) => console.warn(`[order.functions] Falha ao enviar WhatsApp para ${recipientPhone}:`, waErr));
 }
 } catch (err) {
 console.error("[order.functions] Falha ao notificar cliente:", err);
 }
 }
 }

 return { status: "ok" as const, message: "Status do pedido atualizado." };
}

// ---------------------------------------------------------------------------
// Server Functions
// ---------------------------------------------------------------------------

export const listOrders = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);
 if (!identity.store_id) return [];

 const data = await _listOrders(identity.store_id);
 return data || [];
 } catch (e: unknown) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[order.functions] listOrders:", e instanceof Error ? e.message : String(e));
 return [];
 }
});

export const getOrderById = createServerFn({ method: "GET" })
 .validator(withDataPayload(z.object({ orderId: z.string().min(1) })))
 .handler(async ({ data: { orderId } }) => {
 try {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);
 if (!identity.store_id) throw new Error("Contexto de loja inválido");

 const data = await _getOrderById(orderId, identity.store_id);
 return data;
 } catch (e: unknown) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[order.functions] getOrderById:", e instanceof Error ? e.message : String(e));
 throw new Error((e instanceof Error ? e.message : String(e)) || "Pedido não encontrado.");
 }
 });

export const updateOrderStatus = createServerFn({ method: "POST" })
 .validator(
 withDataPayload(
 z.object({
 orderId: z.string().min(1),
 status: z.enum(ORDER_STATUS_VALUES),
 }),
 ),
 )
 .handler(async ({ data: params }) => {
 try {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);
 if (!identity.store_id) throw new Error("Contexto de loja inválido");

 return await _updateOrderStatus(params.orderId, params.status, identity.store_id);
 } catch (e: unknown) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error(
 "[order.functions] updateOrderStatus:",
 e instanceof Error ? e.message : String(e),
 );
 throw new Error("Erro ao atualizar pedido.");
 }
 });

export const listPayments = createServerFn({ method: "GET" }).handler(async () => {
 try {
 // SECURITY FIX: Enforce administrative authorization
 await requireAdmin();
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("Contexto de loja inválido");

 const db = getServerClient();

 const { data, error } = await db
 .from("orders")
 .select(
 `
 id, public_token, status, total_cents, customer_snapshot, created_at
 `,
 )
 .eq("store_id", identity.store_id)
 .in("status", ["awaiting_payment", "payment_processing", "paid"])
 .order("created_at", { ascending: false });

 if (error) throw error;

 return data || [];
 } catch (e: unknown) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[order.functions] listPayments:", e instanceof Error ? e.message : String(e));
 throw new Error("Erro ao buscar pagamentos.");
 }
});

// ---------------------------------------------------------------------------
// Customer-facing: fetch orders for the logged-in customer
// ---------------------------------------------------------------------------

export const listCustomerOrders = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const ssrClient = await getSSRClient();
 const {
 data: { user },
 } = await ssrClient.auth.getUser();

 if (!user) return [];

 const { data, error } = await ssrClient
 .from("orders")
 .select(
 `
 id, order_number, public_token, status, total_cents, custom_fields, created_at,
 order_items ( id, product_title, variant_sku, qty, unit_price_cents, total_cents, item_type, item_id, selected_options )
 `,
 )
 .eq("customer_id", user.id)
 .order("created_at", { ascending: false });

 if (error) {
 console.warn("[order.functions] listCustomerOrders query error:", error);
 return [];
 }

 return (data || []).map((order: any) => ({
 ...order,
 order_items:
 order.order_items?.map((item: any) => ({
 ...item,
 unit_price_cents: item.unit_price_cents ?? item.price_snapshot_cents ?? 0,
 total_cents:
 item.total_cents ??
 (item.unit_price_cents ?? item.price_snapshot_cents ?? 0) * (item.qty ?? 1),
 })) || [],
 }));
 } catch (e: unknown) {
 console.warn(
 "[order.functions] listCustomerOrders fallback:",
 e instanceof Error ? e.message : String(e),
 );
 return [];
 }
});

export const getCustomerOrder = createServerFn({ method: "GET" })
 .validator(withDataPayload(z.object({ orderId: z.string().min(1) })))
 .handler(async ({ data: { orderId } }) => {
 try {
 const ssrClient = await getSSRClient();
 const {
 data: { user },
 } = await ssrClient.auth.getUser();

 if (!user) throw new Error("Não autenticado");

 const { data: order, error } = await ssrClient
 .from("orders")
 .select(
 `
 id, public_token, status, total_cents, subtotal_cents, shipping_cents, discount_cents,
 customer_snapshot, shipping_method, shipping_address, created_at,
 order_items ( id, product_title, variant_sku, qty, unit_price_cents, total_cents, item_type, item_id, selected_options, notes ),
 payments ( id, method, status, amount_cents, receipt_url, receipt_status )
 `,
 )
 .eq("id", orderId)
 .eq("customer_id", user.id)
 .single();

 if (error) throw error;

 return {
 ...order,
 order_items:
 order.order_items?.map((item: any) => ({
 ...item,
 unit_price_cents: item.unit_price_cents ?? item.price_snapshot_cents ?? 0,
 total_cents:
 item.total_cents ??
 (item.unit_price_cents ?? item.price_snapshot_cents ?? 0) * (item.qty ?? 1),
 })) || [],
 };
 } catch (e: unknown) {
 console.error(
 "[order.functions] getCustomerOrder:",
 e instanceof Error ? e.message : String(e),
 );
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao buscar detalhes do pedido.",
 );
 }
 });

export const listOrdersAwaitingShippingQuote = createServerFn({ method: "GET" }).handler(
 async () => {
 try {
 await requireAdmin();
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("Contexto de loja inválido");

 const db = getServerClient();
 const { data, error } = await db
 .from("orders")
 .select(
 `
 id, public_token, status, subtotal_cents, discount_cents, total_cents,
 customer_snapshot, shipping_address, created_at, shipping_method
 `,
 )
 .eq("store_id", identity.store_id)
 .eq("status", "awaiting_shipping_quote")
 .order("created_at", { ascending: true });

 if (error) throw error;
 return data || [];
 } catch (e: unknown) {
 console.error("[order.functions] listOrdersAwaitingShippingQuote error:", e);
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao buscar solicitações de frete.",
 );
 }
 },
);

export const updateOrderShippingQuote = createServerFn({ method: "POST" })
 .validator(
 withDataPayload(
 z.object({
 orderId: z.string().min(1),
 shippingCents: z.number().int().min(0),
 }),
 ),
 )
 .handler(async ({ data: { orderId, shippingCents } }) => {
 try {
 await requireAdmin();
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("Contexto de loja inválido");

 const db = getServerClient();

 // Load current order
 const { data: order, error: orderError } = await db
 .from("orders")
 .select("id, subtotal_cents, discount_cents")
 .eq("id", orderId)
 .eq("store_id", identity.store_id)
 .single();

 if (orderError || !order) throw new Error("Pedido não encontrado");

 // Recalculate total
 const newTotal = order.subtotal_cents + shippingCents - order.discount_cents;

 // Update order status to awaiting_payment, set shipping_cents and total_cents
 const { error: updateError } = await db
 .from("orders")
 .update({
 shipping_cents: shippingCents,
 total_cents: newTotal >= 0 ? newTotal : 0,
 status: "awaiting_payment",
 })
 .eq("id", orderId);

 if (updateError) throw updateError;

 // Update associated payment amount
 const { error: payError } = await db
 .from("payments")
 .update({
 amount_cents: newTotal >= 0 ? newTotal : 0,
 })
 .eq("order_id", orderId);

 if (payError) throw payError;

 return { status: "success" as const };
 } catch (e: unknown) {
 console.error("[order.functions] updateOrderShippingQuote error:", e);
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao atualizar frete do pedido.",
 );
 }
 });

// ---------------------------------------------------------------------------
// Customer-facing: get payment instructions (PIX key, instructions) for order
// Tenant-safe: reads store_id from the order, then fetches store config via
// service role. Customers cannot read the stores table directly via RLS.
// ---------------------------------------------------------------------------

export const getOrderPaymentInstructions = createServerFn({ method: "GET" })
 .validator(withDataPayload(z.object({ orderId: z.string().min(1) })))
 .handler(async ({ data: { orderId } }) => {
 try {
 const ssrClient = await getSSRClient();
 const {
 data: { user },
 } = await ssrClient.auth.getUser();
 if (!user) throw new Error("Não autenticado");

 const db = getServerClient();

 // Verify ownership via SSR client (RLS enforces customer_id = user.id)
 const { data: order, error: orderError } = await ssrClient
 .from("orders")
 .select("id, store_id")
 .eq("id", orderId)
 .eq("customer_id", user.id)
 .single();

 if (orderError || !order) throw new Error("Pedido não encontrado");

 // Fetch store payment config via service role (stores table not exposed to customer RLS)
 const { data: store } = await db
 .from("stores")
 .select("pix_key, payment_instructions")
 .eq("id", order.store_id)
 .single();

 return {
 status: "ok" as const,
 data: {
 pix_key: store?.pix_key ?? null,
 payment_instructions: store?.payment_instructions ?? null,
 },
 };
 } catch (e: unknown) {
 console.error("[order.functions] getOrderPaymentInstructions:", e);
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao buscar instruções de pagamento.",
 );
 }
 });
export const requestOrderReturn = createServerFn({ method: "POST" })
 .validator(
 withDataPayload(
 z.object({ orderId: z.string().min(1), reason: z.string().min(5, "Motivo muito curto") }),
 ),
 )
 .handler(async ({ data: { orderId, reason } }) => {
 try {
 const ssrClient = await getSSRClient();
 const {
 data: { user },
 } = await ssrClient.auth.getUser();
 if (!user) throw new Error("Não autenticado");

 // Verify ownership and status
 const { data: order, error: orderError } = await ssrClient
 .from("orders")
 .select("id, status, store_id")
 .eq("id", orderId)
 .eq("customer_id", user.id)
 .single();

 if (orderError || !order) throw new Error("Pedido não encontrado");
 if (order.status !== "delivered")
 throw new Error("Apenas pedidos entregues podem ser devolvidos/trocados.");

 const db = getServerClient();
 const { error: updateError } = await db
 .from("orders")
 .update({ status: "return_requested" })
 .eq("id", orderId);

 if (updateError) throw updateError;

 // 2. Cria solicitação formal de RMA / Devolução
 await db.from("rma_requests").insert({
 store_id: order.store_id,
 customer_id: user.id,
 order_id: orderId,
 type: "refund",
 status: "requested",
 notes: "Motivo informado pelo cliente: " + reason,
 });

 return { status: "success" as const };
 } catch (e: unknown) {
 console.error("[order.functions] requestOrderReturn:", e);
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao solicitar devolução.",
 );
 }
 });

export const updateOrderShipment = createServerFn({ method: "POST" })
 .validator(
 withDataPayload(
 z.object({
 orderId: z.string().min(1),
 trackingCode: z.string().min(1, "Código de rastreamento é obrigatório"),
 carrierName: z.string().optional(),
 trackingUrl: z.string().optional(),
 newStatus: z.enum(["shipped", "delivered"]).optional(),
 }),
 ),
 )
 .handler(async ({ data: { orderId, trackingCode, carrierName, trackingUrl, newStatus } }) => {
 try {
 const ssrClient = await getSSRClient();
 const {
 data: { user },
 } = await ssrClient.auth.getUser();
 if (!user) throw new Error("Não autorizado");

 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();
 const db = getServerClient();

 if (
 !identity.store_id ||
 !["owner", "admin", "manager", "logistics"].includes(identity.role)
 ) {
 throw new Error("Acesso negado");
 }

 const statusToApply = newStatus || "shipped";
 const shipmentStatus = statusToApply === "delivered" ? "delivered" : "in_transit";

 // 1. Insert into shipments table
 const { data: shipment, error: shipmentError } = await db
 .from("shipments")
 .insert({
 store_id: identity.store_id,
 order_id: orderId,
 tracking_code: trackingCode,
 carrier_name: carrierName || "Transportadora",
 tracking_url: trackingUrl || "",
 status: shipmentStatus,
 shipped_at: new Date().toISOString(),
 delivered_at: statusToApply === "delivered" ? new Date().toISOString() : null,
 })
 .select()
 .single();

 if (shipmentError) throw shipmentError;

 // 2. Update order status
 const updateData: Record<string, any> = {
 status: statusToApply,
 updated_at: new Date().toISOString(),
 };
 if (statusToApply === "shipped") updateData.shipped_at = new Date().toISOString();
 if (statusToApply === "delivered") updateData.delivered_at = new Date().toISOString();

 const { data, error } = await db
 .from("orders")
 .update(updateData)
 .eq("id", orderId)
 .eq("store_id", identity.store_id)
 .select()
 .single();

 if (error) throw error;
 return data;
 } catch (e: unknown) {
 console.error("[order.functions] updateOrderShipment error:", e);
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao atualizar rastreamento do pedido.",
 );
 }
 });

export const editOrderItems = createServerFn({ method: "POST" })
 .validator(
 withDataPayload(
 z.object({
 orderId: z.string().min(1),
 newItems: z.array(
 z.object({
 variant_id: z.string().min(1),
 product_title: z.string(),
 qty: z.number().int().min(1),
 }),
 ),
 }),
 ),
 )
 .handler(async ({ data: { orderId, newItems } }) => {
 try {
 const ssrClient = await getSSRClient();
 const {
 data: { user },
 } = await ssrClient.auth.getUser();
 if (!user) throw new Error("Não autorizado");

 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();
 const db = getServerClient();

 if (!identity.store_id || !["owner", "admin", "manager"].includes(identity.role)) {
 throw new Error("Acesso negado");
 }

 const { data, error } = await db.rpc("admin_modify_order_items", {
 p_order_id: orderId,
 p_new_items: newItems,
 });

 if (error) throw error;
 return data;
 } catch (e: unknown) {
 console.error("[order.functions] editOrderItems error:", e);
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao editar itens do pedido.",
 );
 }
 });

// ---------------------------------------------------------------------------
// Recibos (Receipt)
// ---------------------------------------------------------------------------

export const getOrderForReceipt = createServerFn({ method: "GET" })
 .validator(withDataPayload(z.object({ id: z.string().min(1) })))
 .handler(async ({ data: { id } }) => {
 try {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

 const db = getServerClient();
 const { data, error } = await db
 .from("orders")
 .select(
 `
 id, public_token, status, total_cents, subtotal_cents, shipping_cents, discount_cents,
 customer_snapshot, created_at, shipping_method,
 order_items ( id, product_title, variant_sku, qty, unit_price_cents, total_cents, item_type, item_id, selected_options )
 `,
 )
 .eq("id", id)
 .eq("store_id", identity.store_id)
 .single();
 if (error) throw new Error("Pedido não encontrado");
 return data;
 } catch (e: unknown) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[order.functions] getOrderForReceipt error:", e);
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao carregar recibo do pedido.",
 );
 }
 });

export const assignDriverToOrder = createServerFn({ method: "POST" })
 .validator(withDataPayload(z.object({ orderId: z.string().min(1), driverId: z.string().min(1) })))
 .handler(async ({ data: { orderId, driverId } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "logistics"]);

 // 1. Create the shipment entry
 const { error: dispatchErr } = await supabase.from("shipments").insert({
 store_id: identity.store_id,
 order_id: orderId,
 status: "shipped",
 notes: driverId ? `Entregador ID: ${driverId}` : "Despachado",
 shipped_at: new Date().toISOString(),
 });

 if (dispatchErr) throw new Error("Erro ao criar tentativa de despacho: " + dispatchErr.message);

 // 2. Update the order
 const { error: orderErr } = await supabase
 .from("orders")
 .update({ driver_id: driverId, status: "shipped", updated_at: new Date().toISOString() })
 .eq("id", orderId)
 .eq("store_id", identity.store_id);

 if (orderErr) throw new Error("Erro ao atualizar o status do pedido: " + orderErr.message);

 return { success: true };
 });

export const respondToDispatch = createServerFn({ method: "POST" })
 .validator(
 withDataPayload(
 z.object({
 dispatchId: z.string().min(1),
 response: z.enum(["accepted", "rejected", "failed", "delivered"]),
 reason: z.string().optional(),
 }),
 ),
 )
 .handler(async ({ data: { dispatchId, response, reason } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "logistics"]);

 const payload: any = {
 status: response,
 updated_at: new Date().toISOString(),
 };

 if (response === "accepted" || response === "rejected") {
 payload.responded_at = payload.updated_at;
 }
 if (response === "failed" || response === "delivered") {
 payload.completed_at = payload.updated_at;
 }
 if (reason) payload.failure_reason = reason;

 const { error } = await supabase
 .from("shipments")
 .update(payload)
 .eq("id", dispatchId)
 .eq("store_id", identity.store_id);

 if (error) throw new Error("Erro ao registrar resposta do entregador: " + error.message);

 return { success: true };
 });

export const closePdvComanda = createServerFn({ method: "POST" })
 .validator(
 withDataPayload(
 z.object({
 orderId: z.string().min(1),
 paymentMethod: z.enum(["cash", "pix", "card", "token"]),
 }),
 ),
 )
 .handler(async ({ data: { orderId, paymentMethod } }) => {
 try {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

 const db = getServerClient();

 // 1. Fetch order
 const { data: order, error: orderError } = await db
 .from("orders")
 .select("id, total_cents, table_identifier, store_id")
 .eq("id", orderId)
 .eq("store_id", identity.store_id)
 .single();

 if (orderError || !order) throw new Error("Comanda não encontrada.");

 // 2. Update order status to 'paid'
 const { error: updateError } = await db
 .from("orders")
 .update({
 status: "paid",
 updated_at: new Date().toISOString(),
 })
 .eq("id", orderId);

 if (updateError) throw updateError;

 // 3. If paid in cash, automatically inject entry into active cash register if open
 if (paymentMethod === "cash") {
 const { data: activeRegister } = await db
 .from("cash_registers")
 .select("id")
 .eq("store_id", identity.store_id)
 .eq("status", "open")
 .maybeSingle();

 if (activeRegister) {
 await db.from("cash_register_entries").insert({
 cash_register_id: activeRegister.id,
 order_id: orderId,
 amount_cents: order.total_cents,
 entry_type: "cash",
 notes: `Pagamento de Comanda #${order.table_identifier || orderId.slice(0, 8)}`,
 created_by: identity.id,
 });
 }
 }

  // ── Ledger Criptográfico SHA-256 — PDV Comanda Liquidada ──────────────────────
  // Toda comanda fechada no PDV gera entrada imutável encadeada (Bacen/PCI-DSS)
  try {
  await recordLedgerEntryCore({
    transactionType: "order_payment",
    amountCents: order.total_cents ?? 0,
    storeId: order.store_id ?? identity.store_id,
    referenceEntityType: "order",
    referenceEntityId: orderId,
    actorId: identity.id,
    actorRole: identity.role ?? "seller",
    metadata: {
      payment_method: paymentMethod,
      table_identifier: order.table_identifier,
      pdv_close: true,
    },
  });
  } catch (ledgerErr) {
  console.error("[order.functions] Falha no ledger da comanda PDV:", ledgerErr);
  }

 return { success: true };
 } catch (e: unknown) {
 console.error("[order.functions] closePdvComanda error:", e);
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao liquidar comanda.",
 );
 }
 });

export const getSalonTablesOverview = createServerFn({ method: "GET" })
 .handler(async () => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

 const db = getServerClient();
 const todayStr = new Date().toISOString().split("T")[0];

 // 1. Informações da Loja
 const { data: store } = await db
 .from("stores")
 .select("id, name, slug, settings")
 .eq("id", identity.store_id)
 .single();

 const storeSettings = (store?.settings as any) || {};
 const totalConfiguredTables = Number(storeSettings.total_tables || 24);

 // 2. Pedidos em aberto vinculados a mesas/comandas
 const { data: activeOrders } = await db
 .from("orders")
 .select(`
 id, public_token, status, origin_type, table_identifier, subtotal_cents, total_cents, created_at,
 order_items ( id, product_title, qty, total_cents, selected_options )
 `)
 .eq("store_id", identity.store_id)
 .in("origin_type", ["pdv", "table", "counter", "totem"])
 .not("status", "in", '("cancelled","refunded","paid","completed")')
 .order("created_at", { ascending: false });

 // 3. Reservas de hoje
 const { data: reservations } = await db
 .from("store_table_reservations")
 .select("*")
 .eq("store_id", identity.store_id)
 .eq("reservation_date", todayStr)
 .in("status", ["pending", "confirmed"])
 .order("reservation_time", { ascending: true });

 const ordersByTable = new Map<string, any>();
 (activeOrders || []).forEach((ord) => {
 if (!ord.table_identifier) return;
 const normalized = ord.table_identifier.trim().replace(/^Mesa\s+/i, "");
 if (!ordersByTable.has(normalized)) {
 ordersByTable.set(normalized, ord);
 }
 });

 const reservationsByTable = new Map<string, any>();
 (reservations || []).forEach((res) => {
 if (!res.assigned_table) return;
 const normalized = res.assigned_table.trim().replace(/^Mesa\s+/i, "");
 if (!reservationsByTable.has(normalized)) {
 reservationsByTable.set(normalized, res);
 }
 });

 const now = Date.now();
 const tables = [];

 for (let i = 1; i <= totalConfiguredTables; i++) {
 const tableNumberStr = i < 10 ? `0${i}` : `${i}`;
 const activeOrder = ordersByTable.get(tableNumberStr) || ordersByTable.get(`${i}`);
 const reservation = reservationsByTable.get(tableNumberStr) || reservationsByTable.get(`${i}`);

 let status: "free" | "occupied" | "awaiting_payment" | "delayed" | "reserved" = "free";
 let elapsedMinutes = 0;
 let totalCents = 0;
 let itemsCount = 0;
 let orderId: string | null = null;

 if (activeOrder) {
 orderId = activeOrder.id;
 totalCents = activeOrder.total_cents || 0;
 itemsCount = (activeOrder.order_items || []).reduce(
 (acc: number, item: any) => acc + (item.qty || 1),
 0,
 );
 const orderTime = new Date(activeOrder.created_at).getTime();
 elapsedMinutes = Math.max(0, Math.floor((now - orderTime) / (1000 * 60)));

 if (["payment_processing", "awaiting_payment", "ready_for_pickup"].includes(activeOrder.status)) {
 status = "awaiting_payment";
 } else if (
 elapsedMinutes >= 40 &&
 ["pending", "processing", "kitchen_prep"].includes(activeOrder.status)
 ) {
 status = "delayed";
 } else {
 status = "occupied";
 }
 } else if (reservation) {
 status = "reserved";
 }

 tables.push({
 table_number: tableNumberStr,
 status,
 elapsed_minutes: elapsedMinutes,
 total_cents: totalCents,
 items_count: itemsCount,
 order_id: orderId,
 order: activeOrder || null,
 reservation: reservation || null,
 });
 }

 const occupiedCount = tables.filter((t) => t.status === "occupied" || t.status === "delayed").length;
 const awaitingPaymentCount = tables.filter((t) => t.status === "awaiting_payment").length;
 const freeCount = tables.filter((t) => t.status === "free").length;
 const reservedCount = tables.filter((t) => t.status === "reserved").length;
 const totalActiveCents = tables.reduce((acc, t) => acc + t.total_cents, 0);

 return {
 tables,
 summary: {
 total_tables: totalConfiguredTables,
 occupied_count: occupiedCount,
 free_count: freeCount,
 awaiting_payment_count: awaitingPaymentCount,
 reserved_count: reservedCount,
 total_active_cents: totalActiveCents,
 },
 store_info: {
 id: store?.id || identity.store_id,
 name: store?.name || "Minha Loja",
 slug: store?.slug || "",
 wifi_ssid: storeSettings.wifi_ssid || store?.name || "Wi-Fi Clientes",
 wifi_password: storeSettings.wifi_password || "Conecte-se",
 },
 activeComandas: activeOrders || [],
 };
 });

export const openTableComanda = createServerFn({ method: "POST" })
 .validator(
 withDataPayload(
 z.object({
 tableNumber: z.string().min(1),
 guestName: z.string().optional(),
 }),
 ),
 )
 .handler(async ({ data: { tableNumber, guestName } }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

 const db = getServerClient();
 const cleanTable = tableNumber.trim().replace(/^Mesa\s+/i, "");
 const tableId = `Mesa ${cleanTable}`;

 // Checa se mesa já possui comanda aberta
 const { data: existing } = await db
 .from("orders")
 .select("id")
 .eq("store_id", identity.store_id)
 .eq("table_identifier", tableId)
 .in("origin_type", ["pdv", "table", "counter"])
 .not("status", "in", '("cancelled","refunded","paid","completed")')
 .maybeSingle();

 if (existing) {
 return { orderId: existing.id, isExisting: true };
 }

 const { data: newOrder, error } = await db
 .from("orders")
 .insert({
 store_id: identity.store_id,
 seller_id: identity.id,
 origin_type: "table",
 table_identifier: tableId,
 status: "pending",
 subtotal_cents: 0,
 total_cents: 0,
 items_snapshot: [],
 })
 .select("id")
 .single();

 if (error) throw new Error("Erro ao abrir comanda de mesa: " + error.message);
 return { orderId: newOrder.id, isExisting: false };
 });

export const getLiveOperationalDashboard = createServerFn({ method: "GET" }).handler(async () => {
 const identity = await getServerIdentity().catch(() => null);
 const targetStoreId = identity?.store_id || null;
 if (!targetStoreId) {
 return {
 kpis: {
 totalOrders: 0,
 completedOrders: 0,
 activeOrders: 0,
 cancelledOrders: 0,
 revenueCents: 0,
 avgTicketCents: 0,
 avgPrepTimeMin: 20,
 avgDeliveryTimeMin: 35,
 slaAlertsCount: 0,
 },
 liveOrders: [],
 };
 }

 const db = getServerClient();
 const now = new Date();
 const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

 const { data: orders, error } = await db
 .from("orders")
 .select(`
 id, public_token, status, total_cents, customer_snapshot, created_at,
 channel_origin, prep_time_sla_minutes, delivery_time_sla_minutes,
 prep_started_at, ready_at, sla_alert_triggered, origin_type, table_identifier,
 order_items ( id, product_title, qty, total_cents )
 `)
 .eq("store_id", targetStoreId)
 .gte("created_at", startOfDay)
 .order("created_at", { ascending: false });

 if (error || !orders) {
 return {
 kpis: {
 totalOrders: 0,
 completedOrders: 0,
 activeOrders: 0,
 cancelledOrders: 0,
 revenueCents: 0,
 avgTicketCents: 0,
 avgPrepTimeMin: 20,
 avgDeliveryTimeMin: 35,
 slaAlertsCount: 0,
 },
 liveOrders: [],
 topSellingProducts: [],
 channelBreakdown: [],
 };
 }

 let completedCount = 0;
 let activeCount = 0;
 let cancelledCount = 0;
 let totalRevenueCents = 0;
 let slaAlertsCount = 0;

 const productSalesMap: Record<string, { title: string; quantity: number; totalCents: number }> = {};
 const channelMap: Record<string, { channel: string; count: number; totalCents: number }> = {};

 const liveOrders = orders.map((o: any) => {
 const createdTime = new Date(o.created_at).getTime();
 const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - createdTime) / (1000 * 60)));
 const slaTarget = (o.prep_time_sla_minutes || 20) + (o.channel_origin === "table" ? 0 : 20);
 const slaProgressPercent = Math.min(100, Math.round((elapsedMinutes / slaTarget) * 100));
 const isBreached = elapsedMinutes > slaTarget && !["delivered", "completed", "cancelled"].includes(o.status);

 const ch = o.channel_origin || (o.origin_type === "table" ? "Salão" : "Web");
 if (!channelMap[ch]) {
 channelMap[ch] = { channel: ch, count: 0, totalCents: 0 };
 }
 channelMap[ch].count++;
 channelMap[ch].totalCents += o.total_cents || 0;

 if (["delivered", "completed"].includes(o.status)) {
 completedCount++;
 totalRevenueCents += o.total_cents || 0;
 } else if (["cancelled", "refunded"].includes(o.status)) {
 cancelledCount++;
 } else {
 activeCount++;
 if (isBreached) slaAlertsCount++;
 }

 if (Array.isArray(o.order_items)) {
 for (const item of o.order_items) {
 const title = item.product_title || "Item Sem Nome";
 if (!productSalesMap[title]) {
 productSalesMap[title] = { title, quantity: 0, totalCents: 0 };
 }
 productSalesMap[title].quantity += (item.qty || 1);
 productSalesMap[title].totalCents += (item.total_cents || 0);
 }
 }

 return {
 ...o,
 elapsedMinutes,
 slaTarget,
 slaProgressPercent,
 isBreached,
 channel: ch,
 };
 });

 const topSellingProducts = Object.values(productSalesMap)
 .sort((a, b) => b.quantity - a.quantity)
 .slice(0, 5);

 const channelBreakdown = Object.values(channelMap);

 const totalOrders = orders.length;
 const avgTicketCents = completedCount > 0 ? Math.round(totalRevenueCents / completedCount) : 0;

 return {
 kpis: {
 totalOrders,
 completedOrders: completedCount,
 activeOrders: activeCount,
 cancelledOrders: cancelledCount,
 revenueCents: totalRevenueCents,
 avgTicketCents,
 avgPrepTimeMin: 21,
 avgDeliveryTimeMin: 32,
 slaAlertsCount,
 },
 liveOrders,
 topSellingProducts,
 channelBreakdown,
 };
});

export const requestTableBill = createServerFn({ method: "POST" })
 .validator(withDataPayload(z.object({ tableNumber: z.string(), orderId: z.string().optional() })))
 .handler(async ({ data }) => {
 const identity = await getServerIdentity().catch(() => null);
 const targetStoreId = identity?.store_id || null;
 const db = getServerClient();

 let query = db.from("orders").update({
 channel_origin: "table",
 status: "ready_for_pickup", // sinaliza solicitação de encerramento
 updated_at: new Date().toISOString(),
 });

 if (data.orderId) {
 query = query.eq("id", data.orderId);
 } else if (targetStoreId) {
 query = query
 .eq("store_id", targetStoreId)
 .eq("table_identifier", `Mesa ${data.tableNumber.padStart(2, "0")}`)
 .not("status", "in", '("cancelled","refunded","paid","completed")');
 }

 const { error } = await query;
 if (error) throw new Error("Erro ao solicitar conta da mesa: " + error.message);
 return { success: true };
 });

export const addItemsToTableComanda = createServerFn({ method: "POST" })
 .validator(
 withDataPayload(
 z.object({
 tableNumber: z.string().min(1),
 orderId: z.string().optional(),
 items: z.array(
 z.object({
 productId: z.string().min(1),
 variantId: z.string().optional().nullable(),
 productTitle: z.string(),
 qty: z.number().int().positive().default(1),
 unitPriceCents: z.number().int().nonnegative(),
 totalCents: z.number().int().nonnegative(),
 selectedOptions: z.record(z.any()).optional().nullable(),
 notes: z.string().optional().nullable(),
 }),
 ),
 }),
 ),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

 const db = getServerClient();
 const cleanTable = data.tableNumber.trim().replace(/^Mesa\s+/i, "");
 const tableId = `Mesa ${cleanTable}`;

 // 1. Achar ou criar a comanda ativa
 let targetOrderId = data.orderId;
 if (!targetOrderId) {
 const { data: existing } = await db
 .from("orders")
 .select("id")
 .eq("store_id", identity.store_id)
 .eq("table_identifier", tableId)
 .in("origin_type", ["pdv", "table", "counter"])
 .not("status", "in", '("cancelled","refunded","paid","completed")')
 .order("created_at", { ascending: false })
 .limit(1)
 .maybeSingle();

 if (existing) {
 targetOrderId = existing.id;
 } else {
 const { data: newOrder, error: createErr } = await db
 .from("orders")
 .insert({
 store_id: identity.store_id,
 seller_id: identity.id,
 origin_type: "table",
 table_identifier: tableId,
 status: "pending",
 subtotal_cents: 0,
 total_cents: 0,
 items_snapshot: [],
 })
 .select("id")
 .single();

 if (createErr) throw new Error("Erro ao criar comanda: " + createErr.message);
 targetOrderId = newOrder.id;
 }
 }

 // 2. Inserir os order_items
 const itemsToInsert = data.items.map((it) => ({
 order_id: targetOrderId,
 variant_id: it.variantId || null,
 product_title: it.productTitle,
 variant_sku: (it as any).sku || it.productTitle.slice(0, 20).toUpperCase().replace(/[^A-Z0-9]/g, "-") || "ITEM",
 variant_attributes: it.selectedOptions || {},
 qty: it.qty,
 unit_price_cents: it.unitPriceCents,
 total_cents: it.totalCents,
 }));

 const { error: insertItemsErr } = await db.from("order_items").insert(itemsToInsert);
 if (insertItemsErr) throw new Error("Erro ao lançar itens: " + insertItemsErr.message);

 // 3. Recalcular total_cents da comanda
 const { data: allItems } = await db
 .from("order_items")
 .select("total_cents")
 .eq("order_id", targetOrderId);

 const newSubtotal = (allItems || []).reduce((acc, row) => acc + (row.total_cents || 0), 0);

 // 4. Atualizar comanda para status 'processing' (cozinha recebe imediatamente no KDS!)
 await db
 .from("orders")
 .update({
 subtotal_cents: newSubtotal,
 total_cents: newSubtotal,
 status: "processing", // entra em preparo na cozinha
 channel_origin: "table",
 prep_started_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 })
 .eq("id", targetOrderId);

 return { success: true, orderId: targetOrderId, tableNumber: cleanTable, subtotalCents: newSubtotal };
 });

// ─────────────────────────────────────────────────────────────────────────────
// GASTRONOMY REPORTS BFF — Relatórios específicos do nicho Food & Delivery
// ─────────────────────────────────────────────────────────────────────────────

export interface GastronomyReportsDTO {
 // KPIs do dia
 revenueTodayCents: number;
 ticketAverageCents: number;
 ordersTodayCount: number;
 itemsSoldToday: number;
 // KPIs do mês
 revenueMonthCents: number;
 ordersMonthCount: number;
 // Breakdown por canal
 channelBreakdown: { table: number; delivery: number; counter: number; marketplace?: number };
 // Top produtos
 topProducts: Array<{ title: string; count: number; revenueCents: number }>;
 // Heatmap de horário de pico (hora => contagem de pedidos)
 peakHoursMap: Record<string, number>;
 // Status operacional atual
 ordersInProgress: number;
 ordersReady: number;
}

export const getGastronomyReports = createServerFn({ method: "GET" }).handler(
 async (): Promise<GastronomyReportsDTO> => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "finance"]);

 const db = getServerClient();
 const storeId = identity.store_id;

 if (!storeId) {
 return {
 revenueTodayCents: 0,
 ticketAverageCents: 0,
 ordersTodayCount: 0,
 itemsSoldToday: 0,
 revenueMonthCents: 0,
 ordersMonthCount: 0,
 channelBreakdown: { table: 0, delivery: 0, counter: 0 },
 topProducts: [],
 peakHoursMap: {},
 ordersInProgress: 0,
 ordersReady: 0,
 };
 }

 const now = new Date();
 const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
 const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

 // Buscar pedidos do mês com itens
 const { data: monthOrders, error } = await db
 .from("orders")
 .select(
 `id, total_cents, status, created_at, shipping_method, table_identifier, channel_origin,
 order_items ( id, product_title, qty, unit_price_cents, total_cents )`,
 )
 .eq("store_id", storeId)
 .gte("created_at", monthStart)
 .in("status", ["completed", "delivered", "paid", "processing", "ready_for_pickup", "shipped"])
 .order("created_at", { ascending: false });

 if (error) throw error;

 const orders = monthOrders || [];

 // Separar pedidos de hoje
 const todayOrders = orders.filter((o) => o.created_at >= todayStart);

 // KPIs do dia
 const revenueTodayCents = todayOrders.reduce((acc, o) => acc + (o.total_cents || 0), 0);
 const ordersTodayCount = todayOrders.length;
 const ticketAverageCents = ordersTodayCount > 0 ? Math.round(revenueTodayCents / ordersTodayCount) : 0;
 const itemsSoldToday = todayOrders.reduce((acc, o) => {
 return acc + (o.order_items || []).reduce((s: number, it: any) => s + (it.qty || 1), 0);
 }, 0);

 // KPIs do mês
 const revenueMonthCents = orders.reduce((acc, o) => acc + (o.total_cents || 0), 0);
 const ordersMonthCount = orders.length;

 // Breakdown por canal (usa today orders)
 const channelBreakdown = { table: 0, delivery: 0, counter: 0, marketplace: 0 };
 todayOrders.forEach((o) => {
 if (o.table_identifier || o.channel_origin === "table") {
 channelBreakdown.table++;
 } else if (
 o.channel_origin &&
 ["mercadolivre", "ifood", "amazon", "magalu", "99food", "marketplace"].includes(o.channel_origin)
 ) {
 channelBreakdown.marketplace++;
 } else if (o.shipping_method === "delivery") {
 channelBreakdown.delivery++;
 } else {
 channelBreakdown.counter++;
 }
 });

 // Top produtos do mês
 const productMap: Record<string, { count: number; revenueCents: number }> = {};
 orders.forEach((o) => {
 (o.order_items || []).forEach((it: any) => {
 const title = it.product_title || "Item";
 if (!productMap[title]) productMap[title] = { count: 0, revenueCents: 0 };
 productMap[title].count += it.qty || 1;
 productMap[title].revenueCents += it.total_cents || 0;
 });
 });
 const topProducts = Object.entries(productMap)
 .map(([title, data]) => ({ title, ...data }))
 .sort((a, b) => b.count - a.count)
 .slice(0, 10);

 // Heatmap de horário de pico (últimos 30 dias, horas de 6 a 24)
 const peakHoursMap: Record<string, number> = {};
 for (let h = 6; h <= 23; h++) {
 peakHoursMap[String(h).padStart(2, "0")] = 0;
 }
 orders.forEach((o) => {
 const hour = String(new Date(o.created_at).getHours()).padStart(2, "0");
 if (peakHoursMap[hour] !== undefined) peakHoursMap[hour]++;
 });

 // Status operacional atual (todos os pedidos ativos)
 const { data: activeOrders } = await db
 .from("orders")
 .select("id, status")
 .eq("store_id", storeId)
 .in("status", ["processing", "ready_for_pickup"]);

 const ordersInProgress = (activeOrders || []).filter((o) => o.status === "processing").length;
 const ordersReady = (activeOrders || []).filter((o) => o.status === "ready_for_pickup").length;

 return {
 revenueTodayCents,
 ticketAverageCents,
 ordersTodayCount,
 itemsSoldToday,
 revenueMonthCents,
 ordersMonthCount,
 channelBreakdown,
 topProducts,
 peakHoursMap,
 ordersInProgress,
 ordersReady,
 };
 },
);

// ---------------------------------------------------------------------------
// Telemetria e Linha do Tempo Soberana do Pedido (order_events)
// ---------------------------------------------------------------------------
export const getOrderTimelineEvents = createServerFn({ method: "GET" })
  .validator(withDataPayload(z.object({ orderId: z.string().min(1) })))
  .handler(async ({ data: { orderId } }) => {
    try {
      const db = getServerClient();
      const { data, error } = await db
        .from("order_events")
        .select("id, event_type, from_status, to_status, note, actor_type, metadata, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("[order.functions] getOrderTimelineEvents warning:", error);
        return [];
      }
      return data || [];
    } catch (err: unknown) {
      console.warn("[order.functions] getOrderTimelineEvents error:", err);
      return [];
    }
  });
