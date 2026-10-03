/**
 * service-orders.functions.ts — BFF Server Functions para Ordens de Serviço (OS)
 * Para oficinas mecânicas, marcenarias, assistências técnicas e serviços especializados.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

// ============================================================
// Schemas
// ============================================================

export const createServiceOrderSchema = z.object({
 store_id: z.string().uuid(),
 client_name: z.string().min(3, "Nome do cliente obrigatório"),
 client_phone: z.string().min(8, "Telefone obrigatório"),
 equipment_name: z.string().min(2, "Equipamento/Veículo obrigatório"),
 serial_number: z.string().optional(),
 reported_issue: z.string().min(5, "Defeito relatado obrigatório"),
 technical_diagnosis: z.string().optional(),
 parts_used: z
 .array(
 z.object({
 variant_id: z.string().uuid().optional(),
 name: z.string(),
 quantity: z.number().int().positive(),
 unit_price_cents: z.number().int().nonnegative(),
 }),
 )
 .default([]),
 labor_cost_cents: z.number().int().nonnegative().default(0),
 parts_cost_cents: z.number().int().nonnegative().default(0),
});

// ============================================================
// Server Functions
// ============================================================

/**
 * 1. Lista Ordens de Serviço da loja
 */
export const listServiceOrders = createServerFn({ method: "GET" })
 .validator(
 z.object({
 store_id: z.string().uuid(),
 status: z.string().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const supabase = getServerClient();
 let query = supabase
 .from("service_orders")
 .select("*")
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false });

 if (data.status && data.status !== "all") {
 query = query.eq("status", data.status);
 }

 const { data: orders, error } = await query;
 if (error) throw new Error(`Falha ao listar OS: ${error.message}`);
 return orders || [];
 });

/**
 * 2. Cria nova Ordem de Serviço
 */
export const createServiceOrder = createServerFn({ method: "POST" })
 .validator(createServiceOrderSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const totalCostCents = (data.parts_cost_cents || 0) + (data.labor_cost_cents || 0);
 const supabase = getServerClient();

 const { data: os, error } = await supabase
 .from("service_orders")
 .insert({
 store_id: identity.store_id,
 client_name: data.client_name,
 client_phone: data.client_phone,
 equipment_name: data.equipment_name,
 serial_number: data.serial_number || null,
 reported_issue: data.reported_issue,
 technical_diagnosis: data.technical_diagnosis || null,
 parts_used: data.parts_used,
 labor_cost_cents: data.labor_cost_cents,
 parts_cost_cents: data.parts_cost_cents,
 total_cost_cents: totalCostCents,
 status: "draft",
 })
 .select()
 .single();

 if (error) throw new Error(`Falha ao abrir OS: ${error.message}`);
 return os;
 });

/**
 * 3. Atualiza status de uma Ordem de Serviço
 */
export const updateServiceOrderStatus = createServerFn({ method: "POST" })
 .validator(
 z.object({
 order_id: z.string().uuid(),
 status: z.enum([
 "draft",
 "waiting_approval",
 "in_repair",
 "ready_for_pickup",
 "delivered",
 "cancelled",
 ]),
 technical_diagnosis: z.string().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const supabase = getServerClient();

 const { data: os, error } = await supabase
 .from("service_orders")
 .update({
 status: data.status,
 ...(data.technical_diagnosis ? { technical_diagnosis: data.technical_diagnosis } : {}),
 updated_at: new Date().toISOString(),
 })
 .eq("id", data.order_id)
 .select()
 .single();

 if (error) throw new Error(`Falha ao atualizar status da OS: ${error.message}`);

 // Se a OS foi entregue, consome estoque dos insumos/peças associadas a variantes do catálogo
 if (data.status === "delivered" && os?.parts_used && Array.isArray(os.parts_used)) {
 for (const part of os.parts_used as any[]) {
 if (part.variant_id && part.quantity > 0) {
 try {
 const { data: variant } = await supabase
 .from("product_variants")
 .select("stock_on_hand")
 .eq("id", part.variant_id)
 .maybeSingle();

 const prevStock = variant?.stock_on_hand ?? 0;
 const newStock = Math.max(0, prevStock - part.quantity);

 await supabase.from("stock_movements").insert({
 store_id: identity.store_id,
 variant_id: part.variant_id,
 movement_type: "loss",
 qty: -part.quantity,
 previous_stock: prevStock,
 new_stock: newStock,
 reference_type: "service_order",
 reference_id: data.order_id,
 note: `Consumo de insumo na OS #${data.order_id.slice(0, 8)} (${part.name})`,
 actor_id: identity.user_id,
 });

 await supabase
 .from("product_variants")
 .update({ stock_on_hand: newStock })
 .eq("id", part.variant_id);
 } catch (stockErr) {
 console.warn(`[service-orders] Erro ao consumir estoque de ${part.name}:`, stockErr);
 }
 }
 }
 }

 return os;
 });
