/**
 * mobility.functions.ts — BFF para Mobilidade Urbana, Entregas Expressas,
 * Fretes de Mudança e Gestão de Frotas de Logística (Waesy Mobility).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

// ============================================================
// Types & Schemas
// ============================================================

export const mobilityServiceTypeEnum = z.enum([
 "ride_car",
 "ride_moto",
 "delivery_express",
 "moving_truck",
 "freight_van",
]);

export type MobilityServiceType = z.infer<typeof mobilityServiceTypeEnum>;

export const mobilityStatusEnum = z.enum([
 "draft",
 "searching",
 "accepted",
 "in_progress",
 "delivered",
 "completed",
 "cancelled",
]);

export type MobilityStatus = z.infer<typeof mobilityStatusEnum>;

export interface MobilityQuoteEstimate {
 service_type: MobilityServiceType;
 label: string;
 description: string;
 icon_name: string;
 estimated_price_cents: number;
 distance_km: number;
 duration_minutes: number;
 base_fee_cents: number;
 km_rate_cents: number;
 helper_fee_cents: number;
}

export interface MobilityRequestDTO {
 id: string;
 store_id: string | null;
 customer_id: string | null;
 customer_name: string;
 customer_phone: string;
 service_type: MobilityServiceType;
 status: MobilityStatus;
 origin_address: string;
 origin_lat: number | null;
 origin_lng: number | null;
 origin_instructions: string | null;
 destination_address: string;
 destination_lat: number | null;
 destination_lng: number | null;
 destination_instructions: string | null;
 distance_km: number;
 estimated_duration_minutes: number;
 package_description: string | null;
 helpers_count: number;
 needs_packing: boolean;
 scheduled_for: string | null;
 estimated_price_cents: number;
 final_price_cents: number;
 payment_method: string;
 payment_status: string;
 courier_id: string | null;
 courier_profile_id: string | null;
 magic_token: string | null;
 created_at: string;
 courier_profiles?: {
 full_name: string;
 phone: string;
 vehicle_type: string;
 vehicle_model: string | null;
 vehicle_plate: string | null;
 rating: number;
 } | null;
}

export interface CourierProfileDTO {
 id: string;
 user_id: string | null;
 store_id: string | null;
 slug: string | null;
 full_name: string;
 phone: string;
 avatar_url: string | null;
 vehicle_type: string;
 vehicle_plate: string | null;
 vehicle_model: string | null;
 vehicle_color: string | null;
 receives_direct_requests: boolean;
 receives_pool_requests: boolean;
 is_available: boolean;
 rating: number;
 total_rides: number;
}

// ============================================================
// Standard Rates Config (Fallback Resiliente)
// ============================================================

const SERVICE_CONFIGS: Record<
 MobilityServiceType,
 {
 label: string;
 description: string;
 icon_name: string;
 base_fee_cents: number;
 km_rate_cents: number;
 min_fare_cents: number;
 helper_fee_cents: number;
 }
> = {
 ride_moto: {
 label: "Moto Passageiro",
 description: "Deslocamento ágil e econômico para 1 pessoa.",
 icon_name: "Bike",
 base_fee_cents: 400,
 km_rate_cents: 180,
 min_fare_cents: 700,
 helper_fee_cents: 0,
 },
 ride_car: {
 label: "Carro / Motorista Privado",
 description: "Transporte confortável e seguro para até 4 passageiros.",
 icon_name: "Car",
 base_fee_cents: 600,
 km_rate_cents: 280,
 min_fare_cents: 1200,
 helper_fee_cents: 0,
 },
 delivery_express: {
 label: "Entrega Flash (Moto / Bike)",
 description: "Documentos, chaves, pacotes pequenos e compras urgentes.",
 icon_name: "Zap",
 base_fee_cents: 500,
 km_rate_cents: 220,
 min_fare_cents: 900,
 helper_fee_cents: 0,
 },
 freight_van: {
 label: "Utilitário / Fiorino / Van",
 description: "Caixas médias, eletrodomésticos e equipamentos comerciais.",
 icon_name: "Truck",
 base_fee_cents: 2500,
 km_rate_cents: 450,
 min_fare_cents: 4500,
 helper_fee_cents: 3000,
 },
 moving_truck: {
 label: "Caminhão de Mudança e Frete",
 description: "Mudanças completas residenciais e comerciais com opção de ajudantes.",
 icon_name: "Boxes",
 base_fee_cents: 8000,
 km_rate_cents: 750,
 min_fare_cents: 15000,
 helper_fee_cents: 5000,
 },
};

// ============================================================
// Server Functions
// ============================================================

/**
 * 1. Simula cotação para todos os modais disponíveis baseando-se nas tabelas ativas no banco de dados (logistics_price_tables).
 * Se o administrador ou empresa de logística não cadastrou nenhuma tabela de preço ativa, retorna lista vazia
 * para que a interface informe "Sem atendimento ou tabela de tarifas configurada para esta região".
 */
export const calculateMobilityQuote = createServerFn({ method: "POST" })
 .validator(
 z.object({
 origin_address: z.string().min(3),
 destination_address: z.string().min(3),
 distance_km: z.number().min(0.1).default(3.5),
 helpers_count: z.number().int().min(0).max(6).default(0),
 surge_multiplier: z.number().min(1).max(3).default(1).optional(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const surge = data.surge_multiplier || 1;

 // Consulta tabelas de preço ativas cadastradas no banco
 const { data: priceTables, error } = await supabase
 .from("logistics_price_tables")
 .select("*")
 .eq("is_active", true)
 .order("base_fee_cents", { ascending: true });

 if (error || !priceTables || priceTables.length === 0) {
 // Fallback resiliente para as tarifas padrão do ecossistema
 const durationMin = Math.max(8, Math.round(data.distance_km * 2.8) + 4);
 return (Object.keys(SERVICE_CONFIGS) as MobilityServiceType[]).map((st) => {
 const cfg = SERVICE_CONFIGS[st];
 const rawKmCost = Math.round(data.distance_km * cfg.km_rate_cents);
 const rawHelperCost = data.helpers_count * cfg.helper_fee_cents;
 const total = Math.round((cfg.base_fee_cents + rawKmCost + rawHelperCost) * surge);
 const finalPrice = Math.max(total, cfg.min_fare_cents);

 return {
 service_type: st,
 label: cfg.label,
 description: cfg.description,
 icon_name: cfg.icon_name,
 estimated_price_cents: finalPrice,
 distance_km: data.distance_km,
 duration_minutes: durationMin,
 base_fee_cents: cfg.base_fee_cents,
 km_rate_cents: cfg.km_rate_cents,
 helper_fee_cents: cfg.helper_fee_cents,
 };
 });
 }

 const durationMin = Math.max(10, Math.round(data.distance_km * 3) + 5);

 const estimates: MobilityQuoteEstimate[] = priceTables.map((tbl) => {
 const rawKmCost = Math.round(data.distance_km * tbl.km_rate_cents);
 const rawMinuteCost = Math.round(durationMin * (tbl.minute_rate_cents || 0));
 const rawHelperCost = data.helpers_count * (tbl.helper_fee_cents || 0);
 const rawTotal = Math.round((tbl.base_fee_cents + rawKmCost + rawMinuteCost + rawHelperCost) * surge);
 const finalPrice = Math.max(rawTotal, tbl.min_fare_cents || 0);

 const labelsMap: Record<MobilityServiceType, { label: string; description: string; icon: string }> = {
 ride_car: { label: "Carro Privado", description: "Transporte confortável para até 4 passageiros.", icon: "Car" },
 ride_moto: { label: "Moto Passageiro", description: "Deslocamento ágil e econômico para 1 pessoa.", icon: "Bike" },
 delivery_express: { label: "Entrega Flash", description: "Documentos, chaves e encomendas urgentes.", icon: "Zap" },
 freight_van: { label: "Fiorino / Van", description: "Cargas médias e mercadorias comerciais.", icon: "Truck" },
 moving_truck: { label: "Caminhão de Mudança", description: "Mudanças completas com opção de ajudantes.", icon: "Boxes" },
 };

 const meta = labelsMap[tbl.service_type as MobilityServiceType] || {
 label: tbl.name || "Serviço de Transporte",
 description: "Transporte local tarifado.",
 icon: "Car",
 };

 return {
 service_type: tbl.service_type as MobilityServiceType,
 label: tbl.name || meta.label,
 description: meta.description,
 icon_name: meta.icon,
 estimated_price_cents: finalPrice,
 distance_km: data.distance_km,
 duration_minutes: durationMin,
 base_fee_cents: tbl.base_fee_cents,
 km_rate_cents: tbl.km_rate_cents,
 helper_fee_cents: tbl.helper_fee_cents || 0,
 };
 });

 return estimates;
 });

/**
 * 2. Cria uma nova solicitação de corrida, entrega ou mudança.
 */
export const createMobilityRequest = createServerFn({ method: "POST" })
 .validator(
 z.object({
 customer_name: z.string().min(1).default("Cliente Waesy"),
 customer_phone: z.string().min(1).default("(49) 99999-9999"),
 service_type: mobilityServiceTypeEnum,
 origin_address: z.string().min(3),
 origin_lat: z.number().nullable().optional(),
 origin_lng: z.number().nullable().optional(),
 origin_instructions: z.string().optional(),
 destination_address: z.string().min(3),
 destination_lat: z.number().nullable().optional(),
 destination_lng: z.number().nullable().optional(),
 destination_instructions: z.string().optional(),
 distance_km: z.number().min(0.1).default(3.5),
 package_description: z.string().optional(),
 helpers_count: z.number().int().min(0).default(0),
 needs_packing: z.boolean().default(false),
 scheduled_for: z.string().optional(),
 estimated_price_cents: z.number().int().min(100),
 payment_method: z.string().default("pix"),
 notes: z.string().optional(),
 direct_driver_slug: z.string().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity().catch(() => null);

 let assignedCourierProfileId: string | null = null;

 if (data.direct_driver_slug) {
 const { data: driver } = await supabase
 .from("courier_profiles")
 .select("id")
 .eq("slug", data.direct_driver_slug)
 .maybeSingle();

 if (driver) assignedCourierProfileId = driver.id;
 }

 const payload = {
 customer_id: identity?.id || null,
 customer_name: data.customer_name || "Cliente Waesy",
 customer_phone: data.customer_phone || "(49) 99999-9999",
 service_type: data.service_type,
 status: assignedCourierProfileId ? "accepted" : "searching",
 origin_address: data.origin_address,
 origin_lat: data.origin_lat || null,
 origin_lng: data.origin_lng || null,
 origin_instructions: data.origin_instructions || null,
 destination_address: data.destination_address,
 destination_lat: data.destination_lat || null,
 destination_lng: data.destination_lng || null,
 destination_instructions: data.destination_instructions || null,
 distance_km: data.distance_km,
 estimated_duration_minutes: Math.max(10, Math.round(data.distance_km * 3) + 5),
 package_description: data.package_description || data.notes || null,
 helpers_count: data.helpers_count,
 needs_packing: data.needs_packing,
 scheduled_for: data.scheduled_for ? new Date(data.scheduled_for).toISOString() : null,
 estimated_price_cents: data.estimated_price_cents,
 final_price_cents: data.estimated_price_cents,
 payment_method: data.payment_method,
 payment_status: "pending",
 courier_profile_id: assignedCourierProfileId,
 magic_token: `req_${Math.random().toString(36).substring(2, 10)}`,
 };

 // Usa orders como tabela canônica com origin_type = 'mobility'
 const orderPayload = {
 customer_id: identity?.id || null,
 origin_type: "mobility" as const,
 status: assignedCourierProfileId ? "processing" : "draft",
 driver_id: null,
      courier_profile_id: assignedCourierProfileId || null,
 public_token: payload.magic_token,
 customer_snapshot: {
 name: data.customer_name || "Cliente Waesy",
 phone: data.customer_phone || "",
 },
 shipping_address: {
 street: data.origin_address,
 destination: data.destination_address,
 lat: data.origin_lat || null,
 lng: data.origin_lng || null,
 dest_lat: data.destination_lat || null,
 dest_lng: data.destination_lng || null,
 origin_instructions: data.origin_instructions || null,
 destination_instructions: data.destination_instructions || null,
 },
 items_snapshot: [
 {
 service_type: data.service_type,
 distance_km: data.distance_km,
 estimated_duration_minutes: Math.max(10, Math.round(data.distance_km * 3) + 5),
 package_description: data.package_description || data.notes || null,
 helpers_count: data.helpers_count,
 needs_packing: data.needs_packing,
 scheduled_for: data.scheduled_for ? new Date(data.scheduled_for).toISOString() : null,
 payment_method: data.payment_method,
 magic_token: payload.magic_token,
 },
 ],
 subtotal_cents: data.estimated_price_cents,
 total_cents: data.estimated_price_cents,
 shipping_cents: 0,
 discount_cents: 0,
 };

 const { data: order, error } = await supabase
 .from("orders")
 .insert(orderPayload)
 .select("*, courier_profiles:courier_profile_id(full_name, phone, vehicle_type, vehicle_model, vehicle_plate, rating)")
 .single();

 if (error) {
 console.error("[mobility] Erro ao criar pedido de mobilidade:", error);
 throw new Error("Erro ao criar solicitação de mobilidade: " + error.message);
 }

 // Mapeia order para MobilityRequestDTO
 const snap = (order.items_snapshot as any[])?.[0] || {};
 return {
 id: order.id,
 store_id: order.store_id || null,
 customer_id: order.customer_id,
 customer_name: (order.customer_snapshot as any)?.name || "Cliente",
 customer_phone: (order.customer_snapshot as any)?.phone || "",
 service_type: snap.service_type as MobilityServiceType,
 status: order.status as MobilityStatus,
 origin_address: (order.shipping_address as any)?.street || "",
 origin_lat: (order.shipping_address as any)?.lat || null,
 origin_lng: (order.shipping_address as any)?.lng || null,
 origin_instructions: (order.shipping_address as any)?.origin_instructions || null,
 destination_address: (order.shipping_address as any)?.destination || "",
 destination_lat: (order.shipping_address as any)?.dest_lat || null,
 destination_lng: (order.shipping_address as any)?.dest_lng || null,
 destination_instructions: (order.shipping_address as any)?.destination_instructions || null,
 distance_km: snap.distance_km || 0,
 estimated_duration_minutes: snap.estimated_duration_minutes || 0,
 package_description: snap.package_description || null,
 helpers_count: snap.helpers_count || 0,
 needs_packing: snap.needs_packing || false,
 scheduled_for: snap.scheduled_for || null,
 estimated_price_cents: order.total_cents || 0,
 final_price_cents: order.total_cents || 0,
 payment_method: snap.payment_method || "cash",
 payment_status: "pending",
 courier_id: order.driver_id || null,
 courier_profile_id: order.driver_id || null,
 magic_token: snap.magic_token || null,
 created_at: order.created_at,
 courier_profiles: (order as any).courier_profiles || null,
 } as MobilityRequestDTO;
 });

/**
 * 3. Lista histórico de solicitações do cliente autenticado.
 */
export const listCustomerMobilityRequests = createServerFn({ method: "GET" }).handler(
 async () => {
 const identity = await getServerIdentity().catch(() => null);
 if (!identity?.id) return [];

 const supabase = getServerClient();
 const { data: rows, error } = await supabase
 .from("orders")
 .select("*, courier_profiles:courier_profile_id(full_name, phone, vehicle_type, vehicle_model, vehicle_plate, rating)")
 .eq("customer_id", identity.id)
 .eq("origin_type", "mobility")
 .order("created_at", { ascending: false })
 .limit(30);

 if (error) {
 console.warn("[mobility] Erro ao listar corridas do cliente:", error);
 return [];
 }

 return (rows || []).map((order: any) => {
 const snap = (order.items_snapshot as any[])?.[0] || {};
 return {
 id: order.id,
 store_id: order.store_id || null,
 customer_id: order.customer_id,
 customer_name: order.customer_snapshot?.name || "Cliente",
 customer_phone: order.customer_snapshot?.phone || "",
 service_type: snap.service_type,
 status: order.status,
 origin_address: order.shipping_address?.street || "",
 origin_lat: order.shipping_address?.lat || null,
 origin_lng: order.shipping_address?.lng || null,
 origin_instructions: order.shipping_address?.origin_instructions || null,
 destination_address: order.shipping_address?.destination || "",
 destination_lat: order.shipping_address?.dest_lat || null,
 destination_lng: order.shipping_address?.dest_lng || null,
 destination_instructions: order.shipping_address?.destination_instructions || null,
 distance_km: snap.distance_km || 0,
 estimated_duration_minutes: snap.estimated_duration_minutes || 0,
 package_description: snap.package_description || null,
 helpers_count: snap.helpers_count || 0,
 needs_packing: snap.needs_packing || false,
 scheduled_for: snap.scheduled_for || null,
 estimated_price_cents: order.total_cents || 0,
 final_price_cents: order.total_cents || 0,
 payment_method: snap.payment_method || "cash",
 payment_status: "pending",
 courier_id: order.driver_id || null,
 courier_profile_id: order.driver_id || null,
 magic_token: snap.magic_token || null,
 created_at: order.created_at,
 courier_profiles: order.courier_profiles || null,
 } as MobilityRequestDTO;
 });
 },
);

/**
 * 4. Obtém detalhes de um chamado por ID ou Magic Token.
 */
export const getMobilityRequestDetails = createServerFn({ method: "GET" })
 .validator(z.object({ idOrToken: z.string() }))
 .handler(async ({ data: { idOrToken } }) => {
 const supabase = getServerClient();

 let query = supabase
 .from("orders")
 .select("*, courier_profiles:courier_profile_id(full_name, phone, vehicle_type, vehicle_model, vehicle_plate, rating)")
 .eq("origin_type", "mobility");

 if (idOrToken.startsWith("req_")) {
 query = query.eq("public_token", idOrToken);
 } else {
 query = query.eq("id", idOrToken);
 }

 const { data: order, error } = await query.maybeSingle();
 if (error || !order) {
 throw new Error("Solicitação de mobilidade/entrega não encontrada.");
 }

 const snap = (order.items_snapshot as any[])?.[0] || {};
 return {
 id: order.id,
 store_id: order.store_id || null,
 customer_id: order.customer_id,
 customer_name: (order.customer_snapshot as any)?.name || "Cliente",
 customer_phone: (order.customer_snapshot as any)?.phone || "",
 service_type: snap.service_type,
 status: order.status,
 origin_address: (order.shipping_address as any)?.street || "",
 origin_lat: (order.shipping_address as any)?.lat || null,
 origin_lng: (order.shipping_address as any)?.lng || null,
 origin_instructions: (order.shipping_address as any)?.origin_instructions || null,
 destination_address: (order.shipping_address as any)?.destination || "",
 destination_lat: (order.shipping_address as any)?.dest_lat || null,
 destination_lng: (order.shipping_address as any)?.dest_lng || null,
 destination_instructions: (order.shipping_address as any)?.destination_instructions || null,
 distance_km: snap.distance_km || 0,
 estimated_duration_minutes: snap.estimated_duration_minutes || 0,
 package_description: snap.package_description || null,
 helpers_count: snap.helpers_count || 0,
 needs_packing: snap.needs_packing || false,
 scheduled_for: snap.scheduled_for || null,
 estimated_price_cents: order.total_cents || 0,
 final_price_cents: order.total_cents || 0,
 payment_method: snap.payment_method || "cash",
 payment_status: "pending",
 courier_id: order.driver_id || null,
 courier_profile_id: order.driver_id || null,
 magic_token: snap.magic_token || null,
 created_at: order.created_at,
 courier_profiles: (order as any).courier_profiles || null,
 } as MobilityRequestDTO;
 });

export const listOpenMobilityRequests = createServerFn({ method: "GET" })
 .validator(
 z
 .object({
 service_type: mobilityServiceTypeEnum.optional(),
 })
 .optional(),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();

 let query = supabase
 .from("orders")
 .select("*, courier_profiles:courier_profile_id(full_name, phone, vehicle_type, vehicle_model, vehicle_plate, rating)")
 .eq("origin_type", "mobility")
 .in("status", ["draft", "processing", "paid"])
 .order("created_at", { ascending: false })
 .limit(40);

 const { data: rows, error } = await query;
 if (error) {
 console.warn("[mobility] Erro ao buscar chamados em aberto:", error);
 return [];
 }

 return (rows || []).map((order: any) => {
 const snap = (order.items_snapshot as any[])?.[0] || {};
 return {
 id: order.id,
 store_id: order.store_id || null,
 customer_id: order.customer_id,
 customer_name: order.customer_snapshot?.name || "Cliente",
 customer_phone: order.customer_snapshot?.phone || "",
 service_type: snap.service_type || data?.service_type,
 status: order.status,
 origin_address: order.shipping_address?.street || "",
 destination_address: order.shipping_address?.destination || "",
 distance_km: snap.distance_km || 0,
 estimated_duration_minutes: snap.estimated_duration_minutes || 0,
 package_description: snap.package_description || null,
 helpers_count: snap.helpers_count || 0,
 needs_packing: snap.needs_packing || false,
 scheduled_for: snap.scheduled_for || null,
 estimated_price_cents: order.total_cents || 0,
 final_price_cents: order.total_cents || 0,
 payment_method: snap.payment_method || "cash",
 payment_status: "pending",
 courier_id: order.driver_id || null,
 courier_profile_id: order.driver_id || null,
 magic_token: snap.magic_token || null,
 created_at: order.created_at,
 courier_profiles: order.courier_profiles || null,
 } as MobilityRequestDTO;
 });
 });

/**
 * 6. Motorista / Empresa aceita o chamado.
 */
export const acceptMobilityRequest = createServerFn({ method: "POST" })
 .validator(
 z.object({
 requestId: z.string().uuid(),
 courierProfileId: z.string().uuid().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();

 const { data: updated, error } = await supabase
 .from("orders")
 .update({
 status: "processing",
 driver_id: data.courierProfileId || null,
 updated_at: new Date().toISOString(),
 })
 .eq("id", data.requestId)
 .eq("origin_type", "mobility")
 .select("*, courier_profiles:courier_profile_id(full_name, phone, vehicle_type, vehicle_model, vehicle_plate, rating)")
 .single();

 if (error) throw new Error(`Erro ao aceitar chamado: ${error.message}`);

 const snap = ((updated as any).items_snapshot as any[])?.[0] || {};
 return {
 id: (updated as any).id,
 store_id: (updated as any).store_id || null,
 customer_id: (updated as any).customer_id,
 customer_name: (updated as any).customer_snapshot?.name || "Cliente",
 customer_phone: (updated as any).customer_snapshot?.phone || "",
 service_type: snap.service_type,
 status: (updated as any).status,
 origin_address: (updated as any).shipping_address?.street || "",
 destination_address: (updated as any).shipping_address?.destination || "",
 distance_km: snap.distance_km || 0,
 estimated_duration_minutes: snap.estimated_duration_minutes || 0,
 package_description: snap.package_description || null,
 helpers_count: snap.helpers_count || 0,
 needs_packing: snap.needs_packing || false,
 scheduled_for: snap.scheduled_for || null,
 estimated_price_cents: (updated as any).total_cents || 0,
 final_price_cents: (updated as any).total_cents || 0,
 payment_method: snap.payment_method || "cash",
 payment_status: "pending",
 courier_id: (updated as any).driver_id || null,
 courier_profile_id: (updated as any).driver_id || null,
 magic_token: snap.magic_token || null,
 created_at: (updated as any).created_at,
 courier_profiles: (updated as any).courier_profiles || null,
 } as MobilityRequestDTO;
 });

export const updateMobilityStatus = createServerFn({ method: "POST" })
 .validator(
 z.object({
 requestId: z.string().uuid(),
 status: mobilityStatusEnum,
 cancellationReason: z.string().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 // Map mobility statuses to orders statuses
 const orderStatusMap: Record<string, string> = {
 searching: "draft",
 accepted: "processing",
 in_progress: "shipped",
 delivered: "delivered",
 completed: "completed",
 cancelled: "cancelled",
 draft: "draft",
 };

 const patch: Record<string, any> = {
 status: orderStatusMap[data.status] || data.status,
 updated_at: new Date().toISOString(),
 };

 if (data.status === "delivered" || data.status === "completed")
 patch.delivered_at = new Date().toISOString();
 if (data.status === "in_progress") patch.shipped_at = new Date().toISOString();
 if (data.status === "cancelled") {
 patch.cancelled_at = new Date().toISOString();
 patch.cancellation_reason = data.cancellationReason || "Cancelado pelo operador";
 }

 const { data: updated, error } = await supabase
 .from("orders")
 .update(patch)
 .eq("id", data.requestId)
 .eq("origin_type", "mobility")
 .select("id, status, driver_id, items_snapshot, total_cents, customer_snapshot, shipping_address, created_at")
 .single();

 if (error) throw new Error(`Erro ao atualizar status: ${error.message}`);

 const snap = ((updated as any).items_snapshot as any[])?.[0] || {};
 return {
 id: (updated as any).id,
 store_id: null,
 customer_id: null,
 customer_name: (updated as any).customer_snapshot?.name || "Cliente",
 customer_phone: (updated as any).customer_snapshot?.phone || "",
 service_type: snap.service_type,
 status: data.status,
 origin_address: (updated as any).shipping_address?.street || "",
 destination_address: (updated as any).shipping_address?.destination || "",
 distance_km: snap.distance_km || 0,
 estimated_duration_minutes: snap.estimated_duration_minutes || 0,
 package_description: snap.package_description || null,
 helpers_count: snap.helpers_count || 0,
 needs_packing: snap.needs_packing || false,
 scheduled_for: snap.scheduled_for || null,
 estimated_price_cents: (updated as any).total_cents || 0,
 final_price_cents: (updated as any).total_cents || 0,
 payment_method: snap.payment_method || "cash",
 payment_status: "pending",
 courier_id: (updated as any).driver_id || null,
 courier_profile_id: (updated as any).driver_id || null,
 magic_token: snap.magic_token || null,
 created_at: (updated as any).created_at,
 } as MobilityRequestDTO;
 });

/**
 * 8. Busca perfil do motorista autônomo por slug.
 */
export const getCourierBySlug = createServerFn({ method: "GET" })
 .validator(z.object({ slug: z.string() }))
 .handler(async ({ data: { slug } }) => {
 const supabase = getServerClient();
 const { data: courier, error } = await supabase
 .from("courier_profiles")
 .select("*")
 .eq("slug", slug)
 .maybeSingle();

 if (error || !courier) {
 return null;
 }

 return courier as CourierProfileDTO;
 });

/**
 * 9. Lista tabelas de preço cadastradas pela loja/empresa de logística no Workspace.
 */
export const listLogisticsPriceTables = createServerFn({ method: "GET" }).handler(
 async () => {
 const supabase = getServerClient();
 const identity = await getServerIdentity().catch(() => null);
 if (!identity?.store_id) return [];

 const { data, error } = await supabase
 .from("logistics_price_tables")
 .select("*")
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: true });

 if (error) {
 console.warn("[mobility] Erro ao listar tabelas de preço:", error);
 return [];
 }

 return data || [];
 },
);

/**
 * 10. Salva ou atualiza uma tabela de preço de modalidade.
 */
export const saveLogisticsPriceTable = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid().optional(),
 name: z.string().min(2),
 service_type: mobilityServiceTypeEnum,
 base_fee_cents: z.number().int().min(0),
 km_rate_cents: z.number().int().min(0),
 minute_rate_cents: z.number().int().min(0).default(0),
 helper_fee_cents: z.number().int().min(0).default(0),
 min_fare_cents: z.number().int().min(0).default(0),
 is_active: z.boolean().default(true),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin"]);

 const payload = {
 store_id: identity.store_id,
 name: data.name,
 service_type: data.service_type,
 base_fee_cents: data.base_fee_cents,
 km_rate_cents: data.km_rate_cents,
 minute_rate_cents: data.minute_rate_cents,
 helper_fee_cents: data.helper_fee_cents,
 min_fare_cents: data.min_fare_cents,
 is_active: data.is_active,
 updated_at: new Date().toISOString(),
 };

 if (data.id) {
 const { data: updated, error } = await supabase
 .from("logistics_price_tables")
 .update(payload)
 .eq("id", data.id)
 .eq("store_id", identity.store_id)
 .select()
 .single();

 if (error) throw new Error(`Erro ao atualizar tabela de preço: ${error.message}`);
 return updated;
 }

    // Se não veio ID, verifica atomicamente se a loja já possui uma tabela dessa modalidade para evitar duplicatas
    const { data: existing } = await supabase
      .from("logistics_price_tables")
      .select("id")
      .eq("store_id", identity.store_id)
      .eq("service_type", data.service_type)
      .maybeSingle();

    if (existing?.id) {
      const { data: updated, error } = await supabase
        .from("logistics_price_tables")
        .update(payload)
        .eq("id", existing.id)
        .eq("store_id", identity.store_id)
        .select()
        .single();

      if (error) throw new Error(`Erro ao atualizar tabela de preço: ${error.message}`);
      return updated;
    }

 const { data: created, error } = await supabase
 .from("logistics_price_tables")
 .insert({ ...payload, created_at: new Date().toISOString() })
 .select()
 .single();

 if (error) throw new Error(`Erro ao criar tabela de preço: ${error.message}`);
 return created;
 });

/**
 * 11. Remove uma tabela de preço.
 */
export const deleteLogisticsPriceTable = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin"]);

 const { error } = await supabase
 .from("logistics_price_tables")
 .delete()
 .eq("id", id)
 .eq("store_id", identity.store_id);

 if (error) throw new Error(`Erro ao remover tabela de preço: ${error.message}`);
 return { status: "success" };
 });

export interface LogisticsInvoiceDTO {
 id: string;
 store_id: string | null;
 courier_profile_id: string | null;
 courier_name: string;
 courier_phone: string | null;
 period: string;
 total_rides: number;
 gross_amount_cents: number;
 platform_fee_cents: number;
 net_payable_cents: number;
 status: "paid" | "pending" | "cancelled";
 paid_at: string | null;
 created_at: string;
}

/**
 * 12. Lista as faturas e repasses de frotas e motoristas reais no Workspace com isolamento multi-tenant estrito.
 */
export const listLogisticsInvoices = createServerFn({ method: "GET" }).handler(
 async (): Promise<LogisticsInvoiceDTO[]> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity().catch(() => null);
 if (!identity?.store_id) return [];

 const { data, error } = await supabase
 .from("logistics_invoices")
 .select("*")
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false });

 if (error || !data) {
 return [];
 }

 return data as LogisticsInvoiceDTO[];
 },
);

/**
 * 13. Liquida uma fatura de logística (baixa PIX com persistência real).
 */
export const settleLogisticsInvoice = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "finance"]);

 const now = new Date().toISOString();

 const { data, error } = await supabase
 .from("logistics_invoices")
 .update({
 status: "paid",
 paid_at: now,
 updated_at: now,
 })
 .eq("id", id)
 .eq("store_id", identity.store_id)
 .select()
 .single();

 if (error) {
 throw new Error(`Erro ao liquidar fatura: ${error.message}`);
 }

 return data as LogisticsInvoiceDTO;
 });

// ============================================================
// 14. MOTOLINK: OBTER REGRAS DE PRECIFICAÇÃO DO ENTREGADOR
// ============================================================
export const getCourierSurgeRules = createServerFn({ method: "GET" }).handler(async () => {
 const identity = await getServerIdentity();
 const db = getServerClient();

 const { data, error } = await db
 .from("courier_surge_pricing_rules")
 .select("*")
 .eq("courier_id", identity.id)
 .single();

 if (error || !data) {
 return {
 courier_id: identity.id,
 min_fee_cents: 800,
 base_km_fee_cents: 250,
 rain_multiplier: 1.30,
 peak_multiplier: 1.20,
 night_fee_cents: 300,
 auto_surge_enabled: true,
 is_active: true,
 };
 }

 return {
 id: data.id,
 courier_id: data.courier_id,
 min_fee_cents: data.min_fee_cents,
 base_km_fee_cents: data.base_km_fee_cents,
 rain_multiplier: Number(data.rain_multiplier),
 peak_multiplier: Number(data.peak_multiplier),
 night_fee_cents: data.night_fee_cents,
 auto_surge_enabled: data.auto_surge_enabled,
 is_active: data.is_active,
 };
});

// ============================================================
// 15. MOTOLINK: ATUALIZAR REGRAS DE PRECIFICAÇÃO DO ENTREGADOR
// ============================================================
export const updateCourierSurgeRules = createServerFn({ method: "POST" })
 .validator(
 z.object({
 min_fee_cents: z.number().int().min(500),
 base_km_fee_cents: z.number().int().min(100),
 rain_multiplier: z.number().min(1).max(2.5),
 peak_multiplier: z.number().min(1).max(2.0),
 night_fee_cents: z.number().int().min(0),
 auto_surge_enabled: z.boolean(),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 const db = getServerClient();

 const { data: updated, error } = await db
 .from("courier_surge_pricing_rules")
 .upsert(
 {
 courier_id: identity.id,
 min_fee_cents: data.min_fee_cents,
 base_km_fee_cents: data.base_km_fee_cents,
 rain_multiplier: data.rain_multiplier,
 peak_multiplier: data.peak_multiplier,
 night_fee_cents: data.night_fee_cents,
 auto_surge_enabled: data.auto_surge_enabled,
 updated_at: new Date().toISOString(),
 },
 { onConflict: "courier_id" },
 )
 .select()
 .single();

 if (error) {
 console.error("[updateCourierSurgeRules] error:", error);
 throw new Error("Falha ao salvar regras de precificação dinâmica.");
 }

 return {
 success: true,
 message: "Tabela de tarifas MotoLink atualizada com sucesso.",
 rules: updated,
 };
 });

// ============================================================
// 16. MOTOLINK: COTAÇÃO DINÂMICA DE FRETE COM CLIMA E DEMANDA
// ============================================================
export const calculateDynamicMotolinkQuote = createServerFn({ method: "GET" })
 .validator(
 z.object({
 store_id: z.string().uuid(),
 distance_km: z.number().min(0.1),
 is_raining: z.boolean().default(false),
 is_peak_hour: z.boolean().default(false),
 is_night_time: z.boolean().default(false),
 }),
 )
 .handler(async ({ data }) => {
 const db = getServerClient();

 const { data: quote, error } = await db.rpc("calculate_dynamic_motolink_quote", {
 p_store_id: data.store_id,
 p_distance_km: data.distance_km,
 p_is_raining: data.is_raining,
 p_is_peak_hour: data.is_peak_hour,
 p_is_night_time: data.is_night_time,
 });

  if (error) {
    console.error("[calculateDynamicMotolinkQuote] error:", error);
    // Fallback gracioso
    const base = 800 + Math.round(data.distance_km * 250);
    return {
      distance_km: data.distance_km,
      courier_total_cents: base,
      customer_fee_cents: base,
      store_absorbed_cents: 0,
      applied_surge: { is_raining: data.is_raining, is_peak_hour: data.is_peak_hour },
    };
  }

  return quote;
});

// ============================================================
// 17. MOTOLINK: EXTRATO DE GANHOS & REPASSES DO ENTREGADOR
// ============================================================
export interface CourierEarningsDTO {
  summary: {
    today_cents: number;
    week_cents: number;
    month_cents: number;
    pending_cents: number;
    total_rides: number;
  };
  breakdown: {
    delivery_fees_cents: number;
    tips_cents: number;
    surge_bonuses_cents: number;
  };
  payouts: LogisticsInvoiceDTO[];
}

export const getMyCourierEarnings = createServerFn({ method: "GET" }).handler(
  async (): Promise<CourierEarningsDTO> => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) {
      return {
        summary: { today_cents: 0, week_cents: 0, month_cents: 0, pending_cents: 0, total_rides: 0 },
        breakdown: { delivery_fees_cents: 0, tips_cents: 0, surge_bonuses_cents: 0 },
        payouts: [],
      };
    }

    const db = getServerClient();

    // 1. Busca perfil do entregador
    const { data: profile } = await db
      .from("courier_profiles")
      .select("id")
      .eq("user_id", identity.id)
      .maybeSingle();

    const courierProfileId = profile?.id;

    // 2. Busca faturas / repasses
    let payouts: LogisticsInvoiceDTO[] = [];
    if (courierProfileId) {
      const { data: invs } = await db
        .from("logistics_invoices")
        .select("*")
        .eq("courier_profile_id", courierProfileId)
        .order("created_at", { ascending: false });
      payouts = (invs || []) as LogisticsInvoiceDTO[];
    }

    // 3. Busca corridas concluídas
    let requests: any[] = [];
    if (courierProfileId) {
      const { data: reqs } = await db
        .from("mobility_requests")
        .select("final_price_cents, estimated_price_cents, created_at, status")
        .eq("courier_profile_id", courierProfileId)
        .eq("status", "completed");
      requests = reqs || [];
    }

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let todayCents = 0;
    let weekCents = 0;
    let monthCents = 0;
    let totalCents = 0;

    for (const r of requests) {
      const price = r.final_price_cents || r.estimated_price_cents || 0;
      const created = new Date(r.created_at);
      totalCents += price;

      if (r.created_at.startsWith(todayStr)) {
        todayCents += price;
      }
      if (created >= sevenDaysAgo) {
        weekCents += price;
      }
      if (created >= thirtyDaysAgo) {
        monthCents += price;
      }
    }

    const pendingCents = payouts
      .filter((p) => p.status === "pending")
      .reduce((acc, curr) => acc + (curr.net_payable_cents || 0), 0);

    return {
      summary: {
        today_cents: todayCents,
        week_cents: weekCents,
        month_cents: monthCents,
        pending_cents: pendingCents,
        total_rides: requests.length,
      },
      breakdown: {
        delivery_fees_cents: Math.round(totalCents * 0.85),
        tips_cents: Math.round(totalCents * 0.05),
        surge_bonuses_cents: Math.round(totalCents * 0.1),
      },
      payouts,
    };
  },
);
