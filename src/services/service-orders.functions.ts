/**
 * service-orders.functions.ts — BFF Server Functions para Ordens de Serviço (OS)
 * Para oficinas mecânicas, marcenarias, assistências técnicas e serviços especializados.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { assertStoreEntitlement } from "@/lib/architecture/module-plan-governance";

// ============================================================
// Schemas
// ============================================================

const serviceOrderPartSchema = z.object({
 variant_id: z.string().uuid().optional(),
 name: z.string(),
 quantity: z.number().int().positive(),
 unit_price_cents: z.number().int().nonnegative(),
});

const inspectionChecklistItemSchema = z.object({
 item: z.string().min(1),
 ok: z.boolean().default(true),
 note: z.string().optional(),
});

export const createServiceOrderSchema = z.object({
 store_id: z.string().uuid(),
 client_name: z.string().min(3, "Nome do cliente obrigatório"),
 client_phone: z.string().min(8, "Telefone obrigatório"),
 equipment_name: z.string().min(2, "Equipamento/Veículo obrigatório"),
 serial_number: z.string().optional(),
 reported_issue: z.string().min(5, "Defeito relatado obrigatório"),
 technical_diagnosis: z.string().optional(),
 niche_id: z.string().optional(),
 vehicle_plate: z.string().optional().nullable(),
 vehicle_brand_model: z.string().optional().nullable(),
 vehicle_year: z.number().int().min(1900).max(2100).optional().nullable(),
 odometer_km: z.number().int().nonnegative().optional().nullable(),
 chassis_vin: z.string().optional().nullable(),
 inspection_checklist: z.array(inspectionChecklistItemSchema).default([]),
 assigned_technician_id: z.string().uuid().optional().nullable(),
 estimated_delivery_at: z.string().optional().nullable(),
 parts_used: z.array(serviceOrderPartSchema).default([]),
 labor_cost_cents: z.number().int().nonnegative().default(0),
 parts_cost_cents: z.number().int().nonnegative().default(0),
});

export const updateServiceOrderSchema = z.object({
 order_id: z.string().uuid(),
 equipment_name: z.string().min(2).optional(),
 serial_number: z.string().optional().nullable(),
 reported_issue: z.string().min(3).optional(),
 technical_diagnosis: z.string().optional().nullable(),
 vehicle_plate: z.string().optional().nullable(),
 vehicle_brand_model: z.string().optional().nullable(),
 vehicle_year: z.number().int().min(1900).max(2100).optional().nullable(),
 odometer_km: z.number().int().nonnegative().optional().nullable(),
 chassis_vin: z.string().optional().nullable(),
 inspection_checklist: z.array(inspectionChecklistItemSchema).optional(),
 assigned_technician_id: z.string().uuid().optional().nullable(),
 estimated_delivery_at: z.string().optional().nullable(),
 parts_used: z.array(serviceOrderPartSchema).optional(),
 labor_cost_cents: z.number().int().nonnegative().optional(),
 parts_cost_cents: z.number().int().nonnegative().optional(),
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

 const { data: storeRow } = await supabase
 .from("stores")
 .select(
 "id, name, slug, is_platform_root, plan_tier, subscription_status, vertical_sku, primary_niche_id, enabled_niches, enabled_modules, quota_overrides, settings"
 )
 .eq("id", identity.store_id)
 .maybeSingle();

 if (storeRow) {
 assertStoreEntitlement(storeRow, { capability: "service_orders" });
 }

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
 niche_id: data.niche_id || storeRow?.primary_niche_id || null,
 vehicle_plate: data.vehicle_plate || null,
 vehicle_brand_model: data.vehicle_brand_model || null,
 vehicle_year: data.vehicle_year ?? null,
 odometer_km: data.odometer_km ?? null,
 chassis_vin: data.chassis_vin || null,
 inspection_checklist: data.inspection_checklist || [],
 assigned_technician_id: data.assigned_technician_id || null,
 estimated_delivery_at: data.estimated_delivery_at || null,
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
 * 2.1 Atualiza dados técnicos, veículo, checklist e valores de uma OS
 */
export const updateServiceOrder = createServerFn({ method: "POST" })
 .validator(updateServiceOrderSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const supabase = getServerClient();
 const { data: existing, error: fetchErr } = await supabase
 .from("service_orders")
 .select("id, store_id, labor_cost_cents, parts_cost_cents")
 .eq("id", data.order_id)
 .eq("store_id", identity.store_id)
 .maybeSingle();

 if (fetchErr || !existing) {
 throw new Error("Ordem de serviço não encontrada.");
 }

 const laborCost = data.labor_cost_cents ?? existing.labor_cost_cents ?? 0;
 const partsCost = data.parts_cost_cents ?? existing.parts_cost_cents ?? 0;

 const patch: Record<string, any> = {
 updated_at: new Date().toISOString(),
 total_cost_cents: laborCost + partsCost,
 };
 if (data.equipment_name !== undefined) patch.equipment_name = data.equipment_name;
 if (data.serial_number !== undefined) patch.serial_number = data.serial_number;
 if (data.reported_issue !== undefined) patch.reported_issue = data.reported_issue;
 if (data.technical_diagnosis !== undefined) patch.technical_diagnosis = data.technical_diagnosis;
 if (data.vehicle_plate !== undefined) patch.vehicle_plate = data.vehicle_plate;
 if (data.vehicle_brand_model !== undefined) patch.vehicle_brand_model = data.vehicle_brand_model;
 if (data.vehicle_year !== undefined) patch.vehicle_year = data.vehicle_year;
 if (data.odometer_km !== undefined) patch.odometer_km = data.odometer_km;
 if (data.chassis_vin !== undefined) patch.chassis_vin = data.chassis_vin;
 if (data.inspection_checklist !== undefined) patch.inspection_checklist = data.inspection_checklist;
 if (data.assigned_technician_id !== undefined) patch.assigned_technician_id = data.assigned_technician_id;
 if (data.estimated_delivery_at !== undefined) patch.estimated_delivery_at = data.estimated_delivery_at;
 if (data.parts_used !== undefined) patch.parts_used = data.parts_used;
 if (data.labor_cost_cents !== undefined) patch.labor_cost_cents = data.labor_cost_cents;
 if (data.parts_cost_cents !== undefined) patch.parts_cost_cents = data.parts_cost_cents;

 const { data: updated, error } = await supabase
 .from("service_orders")
 .update(patch)
 .eq("id", data.order_id)
 .eq("store_id", identity.store_id)
 .select()
 .single();

 if (error) throw new Error(`Falha ao atualizar OS: ${error.message}`);
 return updated;
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
 "completed",
 "cancelled",
 ]),
 technical_diagnosis: z.string().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const supabase = getServerClient();

 // 1. Obter estado atual da OS para validar posse e verificar se já foi entregue/concluída
 const { data: currentOs, error: fetchErr } = await supabase
 .from("service_orders")
 .select("id, status, parts_used, store_id")
 .eq("id", data.order_id)
 .eq("store_id", identity.store_id)
 .maybeSingle();

 if (fetchErr || !currentOs) {
 throw new Error("Ordem de serviço não encontrada ou acesso não autorizado.");
 }

 const isConclusionStatus = data.status === "delivered" || data.status === "completed";
 const wasAlreadyConcluded = currentOs.status === "delivered" || currentOs.status === "completed";

 // 2. Atualizar status e diagnóstico técnico
 const { data: os, error } = await supabase
 .from("service_orders")
 .update({
 status: data.status,
 ...(data.technical_diagnosis ? { technical_diagnosis: data.technical_diagnosis } : {}),
 updated_at: new Date().toISOString(),
 })
 .eq("id", data.order_id)
 .eq("store_id", identity.store_id)
 .select()
 .single();

 if (error) throw new Error(`Falha ao atualizar status da OS: ${error.message}`);

 // 3. Dedução de peças com idempotência estrita (apenas na transição para entregue/concluída)
 if (isConclusionStatus && !wasAlreadyConcluded && os?.parts_used && Array.isArray(os.parts_used)) {
 const { data: existingDeductions } = await supabase
 .from("stock_movements")
 .select("id")
 .eq("store_id", identity.store_id)
 .eq("reference_type", "service_order")
 .eq("reference_id", data.order_id)
 .limit(1);

 const alreadyDeducted = Boolean(existingDeductions && existingDeductions.length > 0);

 if (!alreadyDeducted) {
 for (const part of os.parts_used as any[]) {
 if (part.variant_id && part.quantity > 0) {
 try {
 const { data: variant } = await supabase
 .from("product_variants")
 .select("id, stock_on_hand, products!inner(store_id)")
 .eq("id", part.variant_id)
 .eq("products.store_id", identity.store_id)
 .maybeSingle();

 if (!variant) continue;

 const prevStock = variant?.stock_on_hand ?? 0;
 const newStock = Math.max(0, prevStock - part.quantity);

 await supabase.from("stock_movements").insert({
 store_id: identity.store_id,
 variant_id: variant.id,
 movement_type: "sale",
 qty: -part.quantity,
 reference_type: "service_order",
 reference_id: data.order_id,
 channel_origin: "workspace_services",
 channel_source: "service_order",
 note: `Consumo de peça na OS #${data.order_id.slice(0, 8)} (${part.name || "Peça/Insumo"})`,
 actor_id: identity.user_id,
 created_at: new Date().toISOString(),
 });

 await supabase
 .from("product_variants")
 .update({ stock_on_hand: newStock, updated_at: new Date().toISOString() })
 .eq("id", variant.id)
 .eq("store_id", identity.store_id);
 } catch (stockErr) {
 console.warn(`[service-orders] Erro ao consumir estoque de ${part.name}:`, stockErr);
 }
 }
 }
 }
 }

 return os;
 });
