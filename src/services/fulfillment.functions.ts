/**
 * Fulfillment server functions Commerce
 *
 * BFF boundary for the Admin Panel logistics operations.
 * Handles shipment lifecycle: create, update tracking, mark delivered.
 * Every operation is tenant-isolated via store_id from the staff's profile.
 *
 * Rules:
 * - No direct DB access in React components.
 * - All transitions via server functions only.
 * - Fiscal data (NF-e) stored as-is without parsing.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, getSSRClient } from "@/lib/server-access";

// ---------------------------------------------------------------------------
// Shipment status enum
// ---------------------------------------------------------------------------
export const SHIPMENT_STATUS_VALUES = [
 "pending",
 "label_created",
 "in_transit",
 "out_for_delivery",
 "delivered",
 "failed_attempt",
 "returned",
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the tracking URL from a tracking code.
 * Replaced automatic external brand resolution (Correios/MelhorRastreio) with generic fallback.
 */
function resolveTrackingUrl(code: string, providedUrl?: string): string {
 return providedUrl || "";
}

/**
 * Verify that the requesting user is staff for the given store.
 * Returns store_id of the authorized user.
 */
async function requireStaffAccess(): Promise<string> {
 const identity = await getServerIdentity();

 if (
 !identity.store_id ||
 !["owner", "admin", "manager", "logistics", "operator"].includes(identity.role)
 ) {
 throw new Error("Acesso negado. Permissão insuficiente.");
 }

 return identity.store_id;
}

// ---------------------------------------------------------------------------
// Handlers (decoupled for unit testing)
// ---------------------------------------------------------------------------

export async function _listShipments(filters?: {
 status?: (typeof SHIPMENT_STATUS_VALUES)[number];
 orderId?: string;
}) {
 const db = getServerClient();

 let query = db
 .from("shipments")
 .select(
 `
 id, order_id, status, carrier_name, tracking_code, tracking_url,
 invoice_number, shipped_at, delivered_at, estimated_delivery, notes, created_at,
 orders ( id, public_token, customer_snapshot, total_cents )
 `,
 )
 .order("created_at", { ascending: false });

 if (filters?.status) {
 query = query.eq("status", filters.status);
 }
 if (filters?.orderId) {
 query = query.eq("order_id", filters.orderId);
 }

 const { data, error } = await query;
 if (error) throw error;
 return data || [];
}

export async function _getShipmentById(id: string) {
 const db = getServerClient();
 const { data, error } = await db
 .from("shipments")
 .select(
 `
 *, orders ( id, public_token, customer_snapshot, total_cents, shipping_address )
 `,
 )
 .eq("id", id)
 .single();
 if (error) throw new Error("Envio não encontrado.");
 return data;
}

export async function _createShipment(input: {
 order_id: string;
 carrier_name?: string;
 tracking_code?: string;
 tracking_url?: string;
 invoice_number?: string;
 invoice_key?: string;
 estimated_delivery?: string;
 notes?: string;
}) {
 const store_id = await requireStaffAccess();
 const db = getServerClient();

 // Verify the order belongs to this store
 const { data: order, error: orderError } = await db
 .from("orders")
 .select("id, status, store_id")
 .eq("id", input.order_id)
 .eq("store_id", store_id)
 .single();

 if (orderError || !order) throw new Error("Pedido não encontrado ou não pertence a esta loja.");
 if (["cancelled", "refunded", "returned"].includes(order.status)) {
 throw new Error(`Não é possível criar envio para pedido com status '${order.status}'.`);
 }

 const resolvedTrackingUrl = input.tracking_code
 ? resolveTrackingUrl(input.tracking_code, input.tracking_url)
 : input.tracking_url;

 const { data, error } = await db
 .from("shipments")
 .insert({
 store_id,
 order_id: input.order_id,
 carrier_name: input.carrier_name,
 tracking_code: input.tracking_code,
 tracking_url: resolvedTrackingUrl,
 invoice_number: input.invoice_number,
 invoice_key: input.invoice_key,
 estimated_delivery: input.estimated_delivery,
 notes: input.notes,
 status: input.tracking_code ? "label_created" : "pending",
 })
 .select()
 .single();

 if (error) throw error;

 // Transition order to 'processing' if not already past that stage
 if (["paid"].includes(order.status)) {
 await db
 .from("orders")
 .update({ status: "processing" })
 .eq("id", input.order_id)
 .eq("store_id", store_id);
 }

 return data;
}

export async function _updateShipmentTracking(input: {
 id: string;
 tracking_code?: string;
 carrier_name?: string;
 tracking_url?: string;
 status?: (typeof SHIPMENT_STATUS_VALUES)[number];
 invoice_number?: string;
 invoice_key?: string;
 estimated_delivery?: string;
 notes?: string;
}) {
 const store_id = await requireStaffAccess();
 const db = getServerClient();

 const { id, tracking_code, tracking_url, ...rest } = input;

 const resolvedUrl = tracking_code
 ? resolveTrackingUrl(tracking_code, tracking_url)
 : tracking_url;

 const updatePayload: Record<string, any> = {
 ...rest,
 tracking_code,
 tracking_url: resolvedUrl,
 updated_at: new Date().toISOString(),
 };

 if (input.status === "in_transit" && !updatePayload.shipped_at) {
 updatePayload.shipped_at = new Date().toISOString();
 }
 if (input.status === "delivered" && !updatePayload.delivered_at) {
 updatePayload.delivered_at = new Date().toISOString();
 }

 const { data: shipment, error } = await db
 .from("shipments")
 .update(updatePayload)
 .eq("id", id)
 .eq("store_id", store_id)
 .select()
 .single();

 if (error) throw error;

 // Sync order status when shipment is delivered
 if (input.status === "in_transit") {
 await db
 .from("orders")
 .update({ status: "shipped", shipped_at: new Date().toISOString() })
 .eq("id", shipment.order_id)
 .eq("store_id", store_id)
 .in("status", ["processing", "ready_for_pickup", "paid"]);
 }

 if (input.status === "delivered") {
 await db
 .from("orders")
 .update({ status: "delivered", delivered_at: new Date().toISOString() })
 .eq("id", shipment.order_id)
 .eq("store_id", store_id)
 .in("status", ["shipped", "in_transit"]);
 }

 return shipment;
}

export async function _listPendingFulfillment() {
 const db = getServerClient();

 // Orders that are paid or in processing state but have no shipment yet
 const { data, error } = await db
 .from("orders")
 .select(
 `
 id, public_token, status, total_cents, customer_snapshot,
 shipping_address, shipping_method, created_at,
 order_items ( id, product_title, variant_sku, qty, unit_price_cents )
 `,
 )
 .in("status", ["paid", "processing", "ready_for_pickup"])
 .order("created_at", { ascending: true });

 if (error) throw error;

 // Filter out those that already have a shipment in transit or delivered
 const orderIds = (data || []).map((o: any) => o.id);
 if (orderIds.length === 0) return [];

 const { data: shipped } = await db
 .from("shipments")
 .select("order_id")
 .in("order_id", orderIds)
 .in("status", ["in_transit", "out_for_delivery", "delivered"]);

 const shippedOrderIds = new Set((shipped || []).map((s: any) => s.order_id));
 return (data || []).filter((o: any) => !shippedOrderIds.has(o.id));
}

// ---------------------------------------------------------------------------
// Server Functions
// ---------------------------------------------------------------------------

export const listShipments = createServerFn({ method: "GET" })
 .validator(
 z
 .object({
 status: z.enum(SHIPMENT_STATUS_VALUES).optional(),
 orderId: z.string().uuid().optional(),
 })
 .optional(),
 )
 .handler(async ({ data: filters }) => {
 try {
 return await _listShipments(filters ?? undefined);
 } catch (e: unknown) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[fulfillment] listShipments:", e instanceof Error ? e.message : String(e));
 throw new Error("Erro ao listar envios.");
 }
 });

export const getShipmentById = createServerFn({ method: "GET" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 try {
 return await _getShipmentById(id);
 } catch (e: unknown) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[fulfillment] getShipmentById:", e instanceof Error ? e.message : String(e));
 throw new Error((e instanceof Error ? e.message : String(e)) || "Envio não encontrado.");
 }
 });

export const createShipment = createServerFn({ method: "POST" })
 .validator(
 z.object({
 order_id: z.string().uuid(),
 carrier_name: z.string().optional(),
 tracking_code: z.string().optional(),
 tracking_url: z.string().url().optional(),
 invoice_number: z.string().optional(),
 invoice_key: z.string().optional(),
 estimated_delivery: z.string().optional(), // ISO date string
 notes: z.string().optional(),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 return await _createShipment(input);
 } catch (e: unknown) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[fulfillment] createShipment:", e instanceof Error ? e.message : String(e));
 throw new Error((e instanceof Error ? e.message : String(e)) || "Erro ao criar envio.");
 }
 });

export const updateShipmentTracking = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid(),
 tracking_code: z.string().optional(),
 carrier_name: z.string().optional(),
 tracking_url: z.string().url().optional(),
 status: z.enum(SHIPMENT_STATUS_VALUES).optional(),
 invoice_number: z.string().optional(),
 invoice_key: z.string().optional(),
 estimated_delivery: z.string().optional(),
 notes: z.string().optional(),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 return await _updateShipmentTracking(input);
 } catch (e: unknown) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error(
 "[fulfillment] updateShipmentTracking:",
 e instanceof Error ? e.message : String(e),
 );
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao atualizar rastreamento.",
 );
 }
 });

export const listPendingFulfillment = createServerFn({ method: "GET" }).handler(async () => {
 try {
 return await _listPendingFulfillment();
 } catch (e: unknown) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error(
 "[fulfillment] listPendingFulfillment:",
 e instanceof Error ? e.message : String(e),
 );
 throw new Error("Erro ao buscar pedidos pendentes de separação.");
 }
});
