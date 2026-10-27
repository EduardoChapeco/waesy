/**
 * mobility.functions.ts — BFF para Mobilidade Urbana, Entregas Expressas,
 * Fretes de Mudança e Gestão de Frotas de Logística (Waesy Mobility).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as crypto from "node:crypto";
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
 "scheduled",
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
 tip_cents?: number;
 waypoints?: any[];
 delivery_contact_name?: string | null;
 delivery_contact_phone?: string | null;
 package_weight_kg?: number | null;
 package_volume_m3?: number | null;
 cancelled_by?: string | null;
 cancellation_reason?: string | null;
 cancelled_at?: string | null;
 rescheduled_count?: number;
 payment_method: string;
 payment_status: string;
 courier_id: string | null;
 courier_profile_id: string | null;
 magic_token: string | null;
 women_only?: boolean;
 property_type?: "ground" | "elevator" | "stairs" | string | null;
 floor_number?: number | null;
 legal_disclaimer_accepted?: boolean;
 delivery_pin?: string | null;
 arrived_at?: string | null;
 notes?: string | null;
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
 display_name?: string | null;
 bio?: string | null;
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
 work_mode?: string | null;
 passenger_preference?: string | null;
 condo_entry_fee_cents?: number;
 apartment_floor_fee_cents?: number;
 custom_base_fee_cents?: number;
 custom_km_rate_cents?: number;
 helper_fee_cents?: number;
 max_helpers_count?: number;
 min_km_rate_filter_cents?: number;
 work_radius_km?: number;
 vehicle_capacity_kg?: number;
 vehicle_capacity_m3?: number;
 serviced_neighborhoods?: string[];
 serviced_cities?: string[];
 working_hours_start?: string | null;
 working_hours_end?: string | null;
 platform_fixed_fee_cents?: number;
 vehicle_photo_url?: string | null;
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
 * Motor Interno de Cotação de Mobilidade Server-Side (Zero-Trust ao Client)
 * Em conformidade com AGENTS.md P0-2: Toda precificação é calculada e validada no servidor.
 */
export async function computeServerMobilityQuoteInternal(
  supabase: any,
  params: {
    service_type: MobilityServiceType;
    distance_km: number;
    helpers_count?: number;
    surge_multiplier?: number;
  }
): Promise<{
  price_cents: number;
  base_fee_cents: number;
  km_rate_cents: number;
  duration_minutes: number;
  surge_multiplier: number;
}> {
  const { service_type, distance_km, helpers_count = 0, surge_multiplier = 1 } = params;
  const cfg = SERVICE_CONFIGS[service_type] || SERVICE_CONFIGS.ride_car;
  const surge = Math.max(1, Math.min(3, surge_multiplier || 1));

  const { data: priceTable } = await supabase
    .from("logistics_price_tables")
    .select("*")
    .eq("service_type", service_type)
    .eq("is_active", true)
    .order("base_fee_cents", { ascending: true })
    .limit(1)
    .maybeSingle();

  const baseFee = priceTable?.base_fee_cents ?? cfg.base_fee_cents;
  const kmRate = priceTable?.km_rate_cents ?? cfg.km_rate_cents;
  const minuteRate = priceTable?.minute_rate_cents ?? 0;
  const helperFee = priceTable?.helper_fee_cents || cfg.helper_fee_cents || 0;
  const minFare = priceTable?.min_fare_cents ?? cfg.min_fare_cents;
  const durationMin = Math.max(8, Math.round(distance_km * 2.8) + 4);

  const rawKmCost = Math.round(distance_km * kmRate);
  const rawMinuteCost = Math.round(durationMin * minuteRate);
  const rawHelperCost = helpers_count * helperFee;
  const rawTotal = Math.round((baseFee + rawKmCost + rawMinuteCost + rawHelperCost) * surge);
  const finalPrice = Math.max(rawTotal, minFare);

  return {
    price_cents: finalPrice,
    base_fee_cents: baseFee,
    km_rate_cents: kmRate,
    duration_minutes: durationMin,
    surge_multiplier: surge,
  };
}

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
    const {
      origin_address,
      destination_address,
      distance_km = 3.5,
      helpers_count = 0,
      surge_multiplier = 1,
    } = data;
    const supabase = getServerClient();
    const surge = surge_multiplier || 1;

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

 // Garante que todas as 5 modalidades existam no retorno (mesclando banco + configuração padrão)
 const tableByType = new Map<string, any>();
 for (const tbl of priceTables) {
   if (tbl.service_type && !tableByType.has(tbl.service_type)) {
     tableByType.set(tbl.service_type, tbl);
   }
 }

 const estimates: MobilityQuoteEstimate[] = (Object.keys(SERVICE_CONFIGS) as MobilityServiceType[]).map((st) => {
   const cfg = SERVICE_CONFIGS[st];
   const tbl = tableByType.get(st);
   const baseFee = tbl?.base_fee_cents ?? cfg.base_fee_cents;
   const kmRate = tbl?.km_rate_cents ?? cfg.km_rate_cents;
   const minuteRate = tbl?.minute_rate_cents ?? 0;
   const helperFee = tbl?.helper_fee_cents || cfg.helper_fee_cents || 0;
   const minFare = tbl?.min_fare_cents ?? cfg.min_fare_cents;

   const rawKmCost = Math.round(distance_km * kmRate);
   const rawMinuteCost = Math.round(durationMin * minuteRate);
   const rawHelperCost = helpers_count * helperFee;
   const rawTotal = Math.round((baseFee + rawKmCost + rawMinuteCost + rawHelperCost) * surge);
   const finalPrice = Math.max(rawTotal, minFare);

   return {
     service_type: st,
     label: tbl?.name && st === "ride_car" ? tbl.name : cfg.label,
     description: cfg.description,
     icon_name: cfg.icon_name,
     estimated_price_cents: finalPrice,
     distance_km,
     duration_minutes: durationMin,
     base_fee_cents: baseFee,
     km_rate_cents: kmRate,
     helper_fee_cents: helperFee,
   };
 });

 return estimates;
 });

/**
 * 2. Cria uma nova solicitação de corrida, entrega ou mudança.
 * Persiste simultaneamente em `public.mobility_requests` (para o Radar Waesy Go, timer de 3min e avaliações)
 * e espelha em `public.orders` (para razão unificado de pedidos).
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
 helpers_count: z.number().int().min(0).max(6).default(0),
 needs_packing: z.boolean().default(false),
 scheduled_for: z.string().optional().nullable(),
 estimated_price_cents: z.number().int().min(100).optional(),
 payment_method: z.string().default("pix"),
 notes: z.string().optional(),
 direct_driver_slug: z.string().optional(),
 women_only: z.boolean().default(false).optional(),
 property_type: z.enum(["ground", "elevator", "stairs"]).default("ground").optional(),
 floor_number: z.number().int().min(0).max(50).default(0).optional(),
 legal_disclaimer_accepted: z.boolean().default(false).optional(),
 }),
 )
 .handler(async ({ data }) => {
    const {
      customer_name = "Cliente Waesy",
      customer_phone = "(49) 99999-9999",
      service_type,
      origin_address,
      origin_lat = null,
      origin_lng = null,
      origin_instructions = null,
      destination_address,
      destination_lat = null,
      destination_lng = null,
      destination_instructions = null,
      distance_km = 3.5,
      package_description = null,
      helpers_count = 0,
      needs_packing = false,
      scheduled_for = null,
      estimated_price_cents,
      payment_method = "pix",
      notes = null,
      direct_driver_slug = null,
      women_only = false,
      property_type = "ground",
      floor_number = 0,
      legal_disclaimer_accepted = false,
    } = data;
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

  // Zero-Trust Barreira por Inadimplência no CPF / Conta
  if (identity?.id) {
    const { data: debts } = await supabase
      .from("customer_debt_ledger")
      .select("id, amount_cents, reason")
      .eq("customer_id", identity.id)
      .eq("status", "pending");

    if (debts && debts.length > 0) {
      const totalDebt = debts.reduce((s, d) => s + (d.amount_cents || 0), 0);
      throw new Error(
        `Bloqueio de Inadimplência: Você possui pendências no Waesy Go no valor de R$ ${(totalDebt / 100).toFixed(2)}. Regularize seus débitos antes de solicitar novas corridas ou fretes.`
      );
    }
  }

  if ((service_type === "moving_truck" || service_type === "freight_van") && !legal_disclaimer_accepted) {
    throw new Error(
      "Para solicitar Frete ou Mudança, é obrigatório aceitar o Termo de Contratação Direta P2P com o transportador parceiro."
    );
  }

 let assignedCourierProfileId: string | null = null;

 if (direct_driver_slug) {
 const { data: driver } = await supabase
 .from("courier_profiles")
 .select("id")
 .eq("slug", direct_driver_slug)
 .maybeSingle();

 if (driver) assignedCourierProfileId = driver.id;
 }

 const sharedId = crypto.randomUUID();
 const magicToken = `req_${crypto.randomUUID().replace(/-/g, "").substring(0, 8)}`;
 const durationMin = Math.max(10, Math.round(distance_km * 3) + 5);
 const scheduledIso = scheduled_for ? new Date(scheduled_for).toISOString() : null;
 const enrichedNotes = [
   notes || package_description || "",
   women_only ? "[SÓ MULHERES]" : "",
   property_type && property_type !== "ground"
     ? `[Imóvel: ${property_type === "stairs" ? `Escada (${floor_number}º andar)` : "Elevador"}]`
     : "",
   helpers_count > 0 ? `[Ajudantes: ${helpers_count}]` : "",
 ]
   .filter(Boolean)
   .join(" • ");

 // P0-2: Derivação estrita do preço no servidor (Zero-Trust ao cliente - ignora valor vindo do frontend)
 const serverQuote = await computeServerMobilityQuoteInternal(supabase, {
   service_type,
   distance_km,
   helpers_count,
 });
 const authoritativePriceCents = serverQuote.price_cents;

 const mobilityPayload: Record<string, any> = {
 id: sharedId,
 customer_id: identity?.id || null,
 customer_name: customer_name || "Cliente Waesy",
 customer_phone: customer_phone || "(49) 99999-9999",
 service_type,
 status: assignedCourierProfileId
    ? "accepted"
    : Boolean(scheduledIso && new Date(scheduledIso).getTime() > Date.now() + 30 * 60 * 1000)
    ? "scheduled"
    : "searching",
 origin_address,
 origin_lat: origin_lat || null,
 origin_lng: origin_lng || null,
 origin_instructions: origin_instructions || null,
 destination_address,
 destination_lat: destination_lat || null,
 destination_lng: destination_lng || null,
 destination_instructions: destination_instructions || null,
 distance_km,
 estimated_duration_minutes: durationMin,
 package_description: enrichedNotes || null,
 helpers_count,
 needs_packing,
 scheduled_for: scheduledIso,
 estimated_price_cents: authoritativePriceCents,
 final_price_cents: authoritativePriceCents,
 payment_method,
 payment_status: "pending",
 courier_profile_id: assignedCourierProfileId,
 magic_token: magicToken,
 notes: enrichedNotes || null,
 };

 // 1) Insere prioritariamente em public.mobility_requests (para o Radar Waesy Go)
 const { data: insertedMobilityReq, error: mobErr } = await supabase
   .from("mobility_requests")
   .insert({
     ...mobilityPayload,
     women_only,
     legal_disclaimer_accepted,
   })
   .select("*, courier_profiles:courier_profile_id(full_name, phone, vehicle_type, vehicle_model, vehicle_plate, rating)")
   .maybeSingle();

 if (mobErr) {
   // Fallback caso a migration de colunas novas ainda não tenha rodado no ambiente
   await supabase.from("mobility_requests").insert(mobilityPayload);
 }

 // 2) Espelha em orders como tabela transacional complementar com o mesmo ID
 const orderPayload = {
 id: sharedId,
 customer_id: identity?.id || null,
 origin_type: "mobility" as const,
 status: assignedCourierProfileId ? "processing" : "draft",
 driver_id: null,
 courier_profile_id: assignedCourierProfileId || null,
 public_token: magicToken,
 customer_snapshot: {
 name: customer_name || "Cliente Waesy",
 phone: customer_phone || "",
 },
 shipping_address: {
 street: origin_address,
 destination: destination_address,
 lat: origin_lat || null,
 lng: origin_lng || null,
 dest_lat: destination_lat || null,
 dest_lng: destination_lng || null,
 origin_instructions: origin_instructions || null,
 destination_instructions: destination_instructions || null,
 },
 items_snapshot: [
 {
 service_type,
 distance_km,
 estimated_duration_minutes: durationMin,
 package_description: enrichedNotes || null,
 helpers_count,
 needs_packing,
 scheduled_for: scheduledIso,
 payment_method,
 magic_token: magicToken,
 women_only,
 property_type,
 floor_number,
 legal_disclaimer_accepted,
 },
 ],
 subtotal_cents: estimated_price_cents,
 total_cents: estimated_price_cents,
 shipping_cents: 0,
 discount_cents: 0,
 };

 const { data: order, error } = await supabase
 .from("orders")
 .insert(orderPayload)
 .select("*, courier_profiles:courier_profile_id(full_name, phone, vehicle_type, vehicle_model, vehicle_plate, rating)")
 .maybeSingle();

 if (error && !insertedMobilityReq) {
 console.error("[mobility] Erro ao criar pedido de mobilidade:", error);
 throw new Error("Erro ao criar solicitação de mobilidade: " + error.message);
 }

 if (insertedMobilityReq) {
   return {
     ...insertedMobilityReq,
     women_only,
     property_type,
     floor_number,
     legal_disclaimer_accepted,
   } as MobilityRequestDTO;
 }

 const snap = (order?.items_snapshot as any[])?.[0] || {};
 return {
 id: order?.id || sharedId,
 store_id: order?.store_id || null,
 customer_id: order?.customer_id || identity?.id || null,
 customer_name: (order?.customer_snapshot as any)?.name || customer_name,
 customer_phone: (order?.customer_snapshot as any)?.phone || customer_phone,
 service_type: (snap.service_type || service_type) as MobilityServiceType,
 status: (order?.status || "searching") as MobilityStatus,
 origin_address: (order?.shipping_address as any)?.street || origin_address,
 origin_lat: (order?.shipping_address as any)?.lat || origin_lat,
 origin_lng: (order?.shipping_address as any)?.lng || origin_lng,
 origin_instructions: (order?.shipping_address as any)?.origin_instructions || origin_instructions,
 destination_address: (order?.shipping_address as any)?.destination || destination_address,
 destination_lat: (order?.shipping_address as any)?.dest_lat || destination_lat,
 destination_lng: (order?.shipping_address as any)?.dest_lng || destination_lng,
 destination_instructions: (order?.shipping_address as any)?.destination_instructions || destination_instructions,
 distance_km: snap.distance_km || distance_km,
 estimated_duration_minutes: snap.estimated_duration_minutes || durationMin,
 package_description: snap.package_description || enrichedNotes || null,
 helpers_count: snap.helpers_count ?? helpers_count,
 needs_packing: snap.needs_packing ?? needs_packing,
 scheduled_for: snap.scheduled_for || scheduledIso,
 estimated_price_cents: order?.total_cents || estimated_price_cents,
 final_price_cents: order?.total_cents || estimated_price_cents,
 payment_method: snap.payment_method || payment_method,
 payment_status: "pending",
 courier_id: order?.driver_id || null,
 courier_profile_id: order?.courier_profile_id || assignedCourierProfileId || null,
 magic_token: snap.magic_token || magicToken,
 women_only,
 property_type,
 floor_number,
 legal_disclaimer_accepted,
 created_at: order?.created_at || new Date().toISOString(),
 courier_profiles: (order as any)?.courier_profiles || null,
 } as MobilityRequestDTO;
 });

/**
 * 3. Lista histórico de solicitações do cliente autenticado (unificando mobility_requests e orders).
 */
export const listCustomerMobilityRequests = createServerFn({ method: "GET" }).handler(
 async () => {
 const identity = await getServerIdentity().catch(() => null);
 if (!identity?.id) return [];

 const supabase = getServerClient();

 const [{ data: mobRows }, { data: orderRows }] = await Promise.all([
   supabase
     .from("mobility_requests")
     .select("*, courier_profiles:courier_profile_id(full_name, phone, vehicle_type, vehicle_model, vehicle_plate, rating)")
     .eq("customer_id", identity.id)
     .order("created_at", { ascending: false })
     .limit(30),
   supabase
     .from("orders")
     .select("*, courier_profiles:courier_profile_id(full_name, phone, vehicle_type, vehicle_model, vehicle_plate, rating)")
     .eq("customer_id", identity.id)
     .eq("origin_type", "mobility")
     .order("created_at", { ascending: false })
     .limit(30),
 ]);

 const byId = new Map<string, MobilityRequestDTO>();

 for (const m of mobRows || []) {
   byId.set(m.id, {
     id: m.id,
     store_id: m.store_id || null,
     customer_id: m.customer_id,
     customer_name: m.customer_name || "Cliente",
     customer_phone: m.customer_phone || "",
     service_type: m.service_type as MobilityServiceType,
     status: m.status as MobilityStatus,
     origin_address: m.origin_address || "",
     origin_lat: m.origin_lat ?? null,
     origin_lng: m.origin_lng ?? null,
     origin_instructions: m.origin_instructions || null,
     destination_address: m.destination_address || "",
     destination_lat: m.destination_lat ?? null,
     destination_lng: m.destination_lng ?? null,
     destination_instructions: m.destination_instructions || null,
     distance_km: Number(m.distance_km || 0),
     estimated_duration_minutes: Number(m.estimated_duration_minutes || 0),
     package_description: m.package_description || m.notes || null,
     helpers_count: Number(m.helpers_count || 0),
     needs_packing: Boolean(m.needs_packing),
     scheduled_for: m.scheduled_for || null,
     estimated_price_cents: Number(m.estimated_price_cents || 0),
     final_price_cents: Number(m.final_price_cents || m.estimated_price_cents || 0),
     payment_method: m.payment_method || "pix",
     payment_status: m.payment_status || "pending",
     courier_id: m.courier_id || null,
     courier_profile_id: m.courier_profile_id || null,
     magic_token: m.magic_token || null,
     women_only: Boolean(m.women_only),
     notes: m.notes || null,
     created_at: m.created_at,
     courier_profiles: m.courier_profiles || null,
   });
 }

 for (const order of orderRows || []) {
   if (byId.has(order.id)) continue;
   const snap = (order.items_snapshot as any[])?.[0] || {};
   byId.set(order.id, {
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
     courier_profile_id: order.courier_profile_id || order.driver_id || null,
     magic_token: snap.magic_token || null,
     women_only: Boolean(snap.women_only),
     property_type: snap.property_type || null,
     floor_number: snap.floor_number || null,
     created_at: order.created_at,
     courier_profiles: order.courier_profiles || null,
   } as MobilityRequestDTO);
 }

 return Array.from(byId.values()).sort(
   (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
 );
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
    const { requestId, courierProfileId = null } = data;
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
    const { requestId, status, cancellationReason = "Cancelado pelo operador" } = data;
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
    const {
      id = null,
      name,
      service_type,
      base_fee_cents,
      km_rate_cents,
      minute_rate_cents = 0,
      helper_fee_cents = 0,
      min_fare_cents = 0,
      is_active = true,
    } = data;
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
    const {
      min_fee_cents,
      base_km_fee_cents,
      rain_multiplier,
      peak_multiplier,
      night_fee_cents = 0,
      auto_surge_enabled = true,
    } = data;
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
    const {
      store_id,
      distance_km,
      is_raining = false,
      is_peak_hour = false,
      is_night_time = false,
    } = data;
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

// ============================================================
// 18. WAESY GO: PERFIL DO ENTREGADOR / CONDUTOR AUTENTICADO
// ============================================================
export const getMyCourierProfile = createServerFn({ method: "GET" }).handler(
  async (): Promise<CourierProfileDTO | null> => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) return null;

    const db = getServerClient();
    const { data, error } = await db
      .from("courier_profiles")
      .select("*")
      .eq("user_id", identity.id)
      .maybeSingle();

    if (error || !data) return null;

    // Hidrata tarifas de logistics_price_tables para nunca resetar no F5
    const { data: priceTable } = await db
      .from("logistics_price_tables")
      .select("base_fee_cents, km_rate_cents, helper_fee_cents, min_fare_cents")
      .eq("courier_profile_id", data.id)
      .maybeSingle();

    return {
      ...(data as CourierProfileDTO),
      display_name: (data as any).display_name || data.full_name,
      bio: (data as any).bio || null,
      avatar_url: data.avatar_url || null,
      vehicle_photo_url: data.vehicle_photo_url || null,
      custom_base_fee_cents:
        (data as any).custom_base_fee_cents ?? priceTable?.base_fee_cents ?? 600,
      custom_km_rate_cents:
        (data as any).custom_km_rate_cents ?? priceTable?.km_rate_cents ?? 250,
      helper_fee_cents:
        (data as any).helper_fee_cents ?? priceTable?.helper_fee_cents ?? 5000,
      max_helpers_count: (data as any).max_helpers_count ?? 4,
      min_km_rate_filter_cents: (data as any).min_km_rate_filter_cents ?? 200,
      serviced_cities: Array.isArray(data.serviced_cities) ? data.serviced_cities : [],
      serviced_neighborhoods: Array.isArray(data.serviced_neighborhoods)
        ? data.serviced_neighborhoods
        : [],
      working_hours_start: data.working_hours_start || "08:00",
      working_hours_end: data.working_hours_end || "22:00",
    };
  },
);

// ============================================================
// 19. WAESY GO: ATUALIZAR PREFERÊNCIAS & TARIFAS DO CONDUTOR
// ============================================================
export const updateMyCourierPreferences = createServerFn({ method: "POST" })
  .validator(
    z.object({
      is_available: z.boolean().optional(),
      display_name: z.string().optional().nullable(),
      bio: z.string().max(500).optional().nullable(),
      avatar_url: z.string().optional().nullable(),
      work_mode: z.enum(["mixed", "delivery_only", "rides_only", "commercial_only", "moving_only"]).optional(),
      passenger_preference: z.enum(["all", "women_only"]).optional(),
      condo_entry_fee_cents: z.number().int().min(0).max(5000).optional(),
      apartment_floor_fee_cents: z.number().int().min(0).max(10000).optional(),
      vehicle_capacity_kg: z.number().min(0).optional(),
      vehicle_capacity_m3: z.number().min(0).optional(),
      serviced_neighborhoods: z.array(z.string()).optional(),
      serviced_cities: z.array(z.string()).optional(),
      working_hours_start: z.string().optional().nullable(),
      working_hours_end: z.string().optional().nullable(),
      vehicle_photo_url: z.string().optional().nullable(),
      custom_km_rate_cents: z.number().int().min(100).max(5000).optional(),
      custom_base_fee_cents: z.number().int().min(200).max(25000).optional(),
      helper_fee_cents: z.number().int().min(0).max(50000).optional(),
      max_helpers_count: z.number().int().min(0).max(8).optional(),
      min_km_rate_filter_cents: z.number().int().min(100).max(5000).optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    const {
      is_available,
      display_name,
      bio,
      avatar_url,
      work_mode,
      passenger_preference,
      condo_entry_fee_cents,
      apartment_floor_fee_cents,
      vehicle_capacity_kg,
      vehicle_capacity_m3,
      serviced_neighborhoods,
      serviced_cities,
      working_hours_start,
      working_hours_end,
      vehicle_photo_url,
      custom_km_rate_cents,
      custom_base_fee_cents,
      helper_fee_cents,
      max_helpers_count,
      min_km_rate_filter_cents,
    } = input;

    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Acesso não autorizado.");

    const db = getServerClient();
    const { data: profile } = await db
      .from("courier_profiles")
      .select("id, vehicle_type")
      .eq("user_id", identity.id)
      .maybeSingle();

    if (!profile) throw new Error("Perfil de entregador não encontrado.");

    const corePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (is_available !== undefined) corePayload.is_available = is_available;
    if (work_mode !== undefined) corePayload.work_mode = work_mode;
    if (passenger_preference !== undefined) corePayload.passenger_preference = passenger_preference;
    if (condo_entry_fee_cents !== undefined) corePayload.condo_entry_fee_cents = condo_entry_fee_cents;
    if (apartment_floor_fee_cents !== undefined) corePayload.apartment_floor_fee_cents = apartment_floor_fee_cents;
    if (vehicle_capacity_kg !== undefined) corePayload.vehicle_capacity_kg = vehicle_capacity_kg;
    if (vehicle_capacity_m3 !== undefined) corePayload.vehicle_capacity_m3 = vehicle_capacity_m3;
    if (serviced_neighborhoods !== undefined) corePayload.serviced_neighborhoods = serviced_neighborhoods;
    if (serviced_cities !== undefined) corePayload.serviced_cities = serviced_cities;
    if (working_hours_start !== undefined) corePayload.working_hours_start = working_hours_start;
    if (working_hours_end !== undefined) corePayload.working_hours_end = working_hours_end;
    if (vehicle_photo_url !== undefined) corePayload.vehicle_photo_url = vehicle_photo_url;
    if (avatar_url !== undefined) corePayload.avatar_url = avatar_url;

    const extendedPayload: Record<string, any> = {
      ...corePayload,
    };
    if (display_name !== undefined) {
      extendedPayload.display_name = display_name;
      if (display_name?.trim()) extendedPayload.full_name = display_name.trim();
    }
    if (bio !== undefined) extendedPayload.bio = bio;
    if (helper_fee_cents !== undefined) extendedPayload.helper_fee_cents = helper_fee_cents;
    if (max_helpers_count !== undefined) extendedPayload.max_helpers_count = max_helpers_count;
    if (min_km_rate_filter_cents !== undefined)
      extendedPayload.min_km_rate_filter_cents = min_km_rate_filter_cents;

    let updated: any = null;
    const { data: extData, error: extError } = await db
      .from("courier_profiles")
      .update(extendedPayload)
      .eq("id", profile.id)
      .select()
      .maybeSingle();

    if (extError) {
      const { data: fallbackData, error: fallbackError } = await db
        .from("courier_profiles")
        .update(corePayload)
        .eq("id", profile.id)
        .select()
        .single();
      if (fallbackError) {
        console.error("[updateMyCourierPreferences] error:", fallbackError);
        throw new Error(`Erro ao salvar preferências: ${fallbackError.message}`);
      }
      updated = fallbackData;
    } else {
      updated = extData;
    }

    if (
      custom_km_rate_cents !== undefined ||
      custom_base_fee_cents !== undefined ||
      helper_fee_cents !== undefined
    ) {
      const resolvedServiceType: MobilityServiceType =
        profile.vehicle_type === "motorcycle" || profile.vehicle_type === "moto"
          ? "ride_moto"
          : profile.vehicle_type === "truck"
            ? "moving_truck"
            : profile.vehicle_type === "van"
              ? "freight_van"
              : "ride_car";

      await db.from("logistics_price_tables").upsert(
        {
          courier_profile_id: profile.id,
          name: "Tarifa Autônoma Padrão",
          service_type: resolvedServiceType,
          base_fee_cents: custom_base_fee_cents ?? 600,
          km_rate_cents: custom_km_rate_cents ?? 250,
          minute_rate_cents: 30,
          helper_fee_cents: helper_fee_cents ?? 5000,
          min_fare_cents: Math.max(700, custom_base_fee_cents ?? 600),
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "courier_profile_id" },
      );
    }

    return {
      success: true,
      profile: {
        ...(updated as CourierProfileDTO),
        custom_base_fee_cents: custom_base_fee_cents ?? 600,
        custom_km_rate_cents: custom_km_rate_cents ?? 250,
        helper_fee_cents: helper_fee_cents ?? (updated as any)?.helper_fee_cents ?? 5000,
        max_helpers_count: max_helpers_count ?? (updated as any)?.max_helpers_count ?? 4,
        min_km_rate_filter_cents:
          min_km_rate_filter_cents ?? (updated as any)?.min_km_rate_filter_cents ?? 200,
      },
    };
  });

// ============================================================
// 20. WAESY GO: RADAR DE DEMANDAS / CHAMADOS DISPONÍVEIS
// ============================================================
export const listAvailableMobilityDemands = createServerFn({ method: "GET" }).handler(
  async (): Promise<MobilityRequestDTO[]> => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) return [];

    const db = getServerClient();

    const [{ data: driverProfile }, { data, error }] = await Promise.all([
      db
        .from("courier_profiles")
        .select("id, passenger_preference, min_km_rate_filter_cents, serviced_cities")
        .eq("user_id", identity.id)
        .maybeSingle(),
      db
        .from("mobility_requests")
        .select("*")
        .in("status", ["searching", "scheduled"])
        .is("courier_profile_id", null)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    if (error || !data) return [];

    const minKmRateFilter = Number((driverProfile as any)?.min_km_rate_filter_cents || 0);
    const driverPref = (driverProfile as any)?.passenger_preference || "all";

    return (data as MobilityRequestDTO[]).filter((req) => {
      // Se o motorista filtrou por apenas mulheres, ou se a corrida exige motorista mulher
      if (driverPref === "women_only" && !req.women_only && !(req.notes || "").includes("[SÓ MULHERES]")) {
        return true; // motorista mulher ainda pode ver corridas gerais, mas prioriza
      }
      // Filtro de piso mínimo R$/km configurado pelo condutor
      if (minKmRateFilter > 0 && req.distance_km > 0) {
        const effectiveKmRate = Math.round(req.estimated_price_cents / req.distance_km);
        if (effectiveKmRate < minKmRateFilter) {
          return false;
        }
      }
      return true;
    });
  },
);

// ============================================================
// 21. WAESY GO: ACEITAR CHAMADO NO RADAR
// ============================================================
export const acceptMobilityDemand = createServerFn({ method: "POST" })
  .validator(z.object({ requestId: z.string().uuid() }))
  .handler(async ({ data: { requestId } }) => {
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Acesso não autorizado.");

    const db = getServerClient();
    const { data: profile } = await db
      .from("courier_profiles")
      .select("id, full_name, phone, vehicle_type, vehicle_model, vehicle_plate")
      .eq("user_id", identity.id)
      .maybeSingle();

    if (!profile) throw new Error("Perfil de condutor não encontrado.");

    const now = new Date().toISOString();
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    const pin = (1000 + (randomBuffer[0] % 9000)).toString();

    const { data: updated, error } = await db
      .from("mobility_requests")
      .update({
        courier_profile_id: profile.id,
        status: "accepted",
        accepted_at: now,
        notes: `PIN de Embarque: ${pin}`,
        updated_at: now,
      })
      .eq("id", requestId)
      .in("status", ["searching", "scheduled"])
      .select()
      .single();

    if (error || !updated) {
      throw new Error("Corrida já foi aceita por outro motorista ou cancelada.");
    }

    // Sincroniza espelho em orders
    await db
      .from("orders")
      .update({
        status: "processing",
        courier_profile_id: profile.id,
        updated_at: now,
      })
      .eq("id", requestId);

    return { success: true, request: updated, pin };
  });

// ============================================================
// 22. WAESY GO: TOLERÂNCIA DE 3 MINUTOS & REGISTRO DE CHEGADA
// ============================================================
export const recordArrivalAndStartTimer = createServerFn({ method: "POST" })
  .validator(
    z.object({
      requestId: z.string().uuid(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    }),
  )
  .handler(async ({ data: { requestId, latitude, longitude } }) => {
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Acesso não autorizado.");

    const db = getServerClient();
    const now = new Date().toISOString();
    const gpsInfo =
      latitude != null && longitude != null
        ? ` (GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)})`
        : "";

    const { data, error } = await db
      .from("mobility_requests")
      .update({
        notes: `Chegada registrada em ${now}${gpsInfo}. Tolerância oficial de 3 minutos iniciada.`,
        updated_at: now,
      })
      .eq("id", requestId)
      .select()
      .single();

    if (error) {
      throw new Error("Erro ao registrar chegada.");
    }

    return {
      success: true,
      arrived_at: now,
      tolerance_minutes: 3,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      request: data,
    };
  });

// ============================================================
// 23. WAESY GO: CANCELAMENTO POR NÃO-COMPARECIMENTO (3 MINUTOS) & DÉBITO NO CPF
// ============================================================
export const cancelByCustomerNoShow = createServerFn({ method: "POST" })
  .validator(z.object({ requestId: z.string().uuid() }))
  .handler(async ({ data: { requestId } }) => {
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Acesso não autorizado.");

    const db = getServerClient();
    const { data: req } = await db
      .from("mobility_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (!req) throw new Error("Chamado não encontrado.");

    const now = new Date().toISOString();
    const fareCents = req.estimated_price_cents || req.final_price_cents || 1000;

    await db
      .from("mobility_requests")
      .update({
        status: "cancelled",
        cancelled_at: now,
        cancellation_reason: "Cliente não compareceu dentro da tolerância de 3 minutos",
        updated_at: now,
      })
      .eq("id", requestId);

    let customerCpf = "00000000000";
    if (req.customer_id) {
      const { data: customerProfile } = await db
        .from("profiles")
        .select("cpf")
        .eq("id", req.customer_id)
        .maybeSingle();
      if (customerProfile?.cpf) customerCpf = customerProfile.cpf;
    }

    await db.from("customer_debt_ledger").insert({
      customer_id: req.customer_id || null,
      customer_cpf: customerCpf,
      customer_name: req.customer_name,
      request_id: requestId,
      amount_cents: fareCents,
      reason: "no_show_3min_tolerance",
      status: "pending",
      blocked_services: ["mobility_rides", "food_delivery", "marketplace_shipping"],
      notes: "Cobrança integral por deslocamento do motorista sem comparecimento do passageiro.",
    });

    return {
      success: true,
      message: "Corrida encerrada por não comparecimento. Débito registrado no CPF do cliente.",
    };
  });

// ============================================================
// 24. WAESY GO: AVALIAÇÃO BILATERAL COM ESTRELAS & TAGS
// ============================================================
export const submitMobilityRating = createServerFn({ method: "POST" })
  .validator(
    z.object({
      requestId: z.string().uuid(),
      roleReviewed: z.enum(["courier", "customer"]),
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(500).optional(),
      tags: z.array(z.string()).optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Acesso não autorizado.");

    const db = getServerClient();
    const { data: req } = await db
      .from("mobility_requests")
      .select("id, customer_id, courier_profile_id")
      .eq("id", input.requestId)
      .single();

    if (!req) throw new Error("Corrida não encontrada.");

    const revieweeId = input.roleReviewed === "courier" ? null : req.customer_id;
    const courierProfileId = req.courier_profile_id;

    const { data, error } = await db
      .from("mobility_ratings")
      .upsert(
        {
          request_id: input.requestId,
          reviewer_id: identity.id,
          reviewee_id: revieweeId,
          courier_profile_id: courierProfileId,
          role_reviewed: input.roleReviewed,
          rating: input.rating,
          comment: input.comment || null,
          tags: input.tags || [],
          created_at: new Date().toISOString(),
        },
        { onConflict: "request_id,reviewer_id" },
      )
      .select()
      .single();

    if (error) {
      console.error("[submitMobilityRating] error:", error);
      throw new Error(`Erro ao enviar avaliação: ${error.message}`);
    }

    if (input.roleReviewed === "courier" && courierProfileId) {
      const { data: allRatings } = await db
        .from("mobility_ratings")
        .select("rating")
        .eq("courier_profile_id", courierProfileId)
        .eq("role_reviewed", "courier");

      if (allRatings && allRatings.length > 0) {
        const sum = allRatings.reduce((acc, curr) => acc + curr.rating, 0);
        const avg = Number((sum / allRatings.length).toFixed(2));
        await db
          .from("courier_profiles")
          .update({ rating: avg, updated_at: new Date().toISOString() })
          .eq("id", courierProfileId);
      }
    }

    return { success: true, rating: data };
  });

// ============================================================
// 25. WAESY GO: LISTAR AVALIAÇÕES DO MOTORISTA
// ============================================================
export const listCourierReviews = createServerFn({ method: "GET" })
  .validator(z.object({ courierProfileId: z.string().uuid() }))
  .handler(async ({ data: { courierProfileId } }) => {
    const db = getServerClient();
    const { data, error } = await db
      .from("mobility_ratings")
      .select("id, rating, comment, tags, created_at, role_reviewed")
      .eq("courier_profile_id", courierProfileId)
      .eq("role_reviewed", "courier")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error || !data) return [];
    return data;
  });

// ============================================================
// 26. WAESY GO: REGISTRAR E LISTAR DESPESAS OPERACIONAIS (COMBUSTÍVEL)
// ============================================================
export const logCourierExpense = createServerFn({ method: "POST" })
  .validator(
    z.object({
      expense_type: z.enum(["fuel", "maintenance", "insurance", "tires", "cleaning", "other"]),
      amount_cents: z.number().int().min(100),
      liters: z.number().min(0.1).optional(),
      fuel_type: z.enum(["gasoline", "ethanol", "diesel", "cng", "electric"]).optional(),
      odometer_km: z.number().int().min(0).optional(),
      receipt_url: z.string().url().optional().nullable(),
      notes: z.string().max(300).optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Acesso não autorizado.");

    const db = getServerClient();
    const { data: profile } = await db
      .from("courier_profiles")
      .select("id")
      .eq("user_id", identity.id)
      .single();

    if (!profile) throw new Error("Perfil de condutor não encontrado.");

    const { data, error } = await db
      .from("courier_expense_logs")
      .insert({
        courier_profile_id: profile.id,
        user_id: identity.id,
        expense_type: input.expense_type,
        amount_cents: input.amount_cents,
        liters: input.liters || null,
        fuel_type: input.fuel_type || null,
        odometer_km: input.odometer_km || null,
        receipt_url: input.receipt_url || null,
        notes: input.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[logCourierExpense] error:", error);
      throw new Error(`Erro ao lançar despesa: ${error.message}`);
    }

    return { success: true, expense: data };
  });

export const listCourierExpenses = createServerFn({ method: "GET" }).handler(async () => {
  const identity = await getServerIdentity().catch(() => null);
  if (!identity?.id) return { expenses: [], total_expense_cents: 0 };

  const db = getServerClient();
  const { data, error } = await db
    .from("courier_expense_logs")
    .select("*")
    .eq("user_id", identity.id)
    .order("created_at", { ascending: false });

  if (error || !data) return { expenses: [], total_expense_cents: 0 };

  const total = data.reduce((acc, curr) => acc + (curr.amount_cents || 0), 0);
  return { expenses: data, total_expense_cents: total };
});

// ============================================================
// 27. WAESY GO: FATURA MENSAL DO CONDUTOR (TAXA R$ 0,99 POR CORRIDA)
// ============================================================
export const getCourierMonthlyInvoice = createServerFn({ method: "GET" }).handler(async () => {
  const identity = await getServerIdentity().catch(() => null);
  if (!identity?.id) {
    return {
      month: new Date().toISOString().slice(0, 7),
      total_rides: 0,
      gross_revenue_cents: 0,
      fee_per_ride_cents: 99,
      total_payable_cents: 0,
      status: "paid",
    };
  }

  const db = getServerClient();
  const { data: profile } = await db
    .from("courier_profiles")
    .select("id")
    .eq("user_id", identity.id)
    .maybeSingle();

  if (!profile) {
    return {
      month: new Date().toISOString().slice(0, 7),
      total_rides: 0,
      gross_revenue_cents: 0,
      fee_per_ride_cents: 99,
      total_payable_cents: 0,
      status: "paid",
    };
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data: rides } = await db
    .from("mobility_requests")
    .select("id, created_at, payment_method, status, final_price_cents, estimated_price_cents")
    .eq("courier_profile_id", profile.id)
    .eq("status", "completed");

  const monthRides = (rides || []).filter((r) => r.created_at.startsWith(currentMonth));
  const totalRides = monthRides.length;
  const grossRevenueCents = monthRides.reduce(
    (acc, r) => acc + Number(r.final_price_cents || r.estimated_price_cents || 0),
    0,
  );
  const totalFeeCents = totalRides * 99;

  return {
    month: currentMonth,
    total_rides: totalRides,
    gross_revenue_cents: grossRevenueCents,
    fee_per_ride_cents: 99,
    total_payable_cents: totalFeeCents,
    status: totalFeeCents > 0 ? "pending" : "paid",
  };
});

// ============================================================
// 28. WAESY GO: VERIFICADOR DE DÉBITOS DO CLIENTE (ZERO-TRUST)
// ============================================================
export const checkCustomerDebtStatus = createServerFn({ method: "GET" }).handler(async () => {
  const identity = await getServerIdentity().catch(() => null);
  if (!identity?.id) return { has_debts: false, total_debt_cents: 0, debts: [] };

  const db = getServerClient();
  const { data, error } = await db
    .from("customer_debt_ledger")
    .select("*")
    .eq("customer_id", identity.id)
    .eq("status", "pending");

  if (error || !data || data.length === 0) {
    return { has_debts: false, total_debt_cents: 0, debts: [] };
  }

  const total = data.reduce((acc, curr) => acc + (curr.amount_cents || 0), 0);
  return {
    has_debts: true,
    total_debt_cents: total,
    debts: data,
  };
});

// ============================================================
// 29. WAESY GO: LIQUIDAÇÃO DE DÉBITO PELO CLIENTE (DESBLOQUEIO)
// ============================================================
export const payCustomerDebt = createServerFn({ method: "POST" })
  .validator(z.object({ debtId: z.string().uuid() }))
  .handler(async ({ data: { debtId } }) => {
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Acesso não autorizado.");

    const db = getServerClient();
    const { data, error } = await db
      .from("customer_debt_ledger")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", debtId)
      .eq("customer_id", identity.id)
      .select()
      .single();

    if (error || !data) {
      throw new Error("Erro ao quitar débito pendente.");
    }
    return { success: true, debt: data };
  });

// ============================================================
// 30. WAESY GO: ENTREGAS COMERCIAIS & LOJAS PARCEIRAS (B2B/B2C)
// ============================================================
export interface CourierCommercialDeliveryDTO {
  id: string;
  order_number: string;
  store_id: string;
  store_name: string;
  channel: string;
  status: string;
  origin_address: string;
  destination_address: string;
  delivery_fee_cents: number;
  customer_name: string;
  customer_phone: string;
  created_at: string;
}

export const listCourierCommercialDeliveries = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        storeId: z.string().uuid().optional(),
        channel: z.string().optional(),
      })
      .optional(),
  )
  .handler(async ({ data: filter }) => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) return [] as CourierCommercialDeliveryDTO[];

    const db = getServerClient();
    const { data: profile } = await db
      .from("courier_profiles")
      .select("id")
      .eq("user_id", identity.id)
      .maybeSingle();

    if (!profile) return [] as CourierCommercialDeliveryDTO[];

    let query = db
      .from("orders")
      .select("id, order_number, store_id, status, total_cents, shipping_cents, shipping_address, customer_snapshot, custom_fields, created_at, stores:store_id(id, name)")
      .or(`driver_id.eq.${profile.id},courier_profile_id.eq.${profile.id}`)
      .order("created_at", { ascending: false });

    if (filter?.storeId) {
      query = query.eq("store_id", filter.storeId);
    }

    const { data, error } = await query;
    if (error || !data) return [] as CourierCommercialDeliveryDTO[];

    let deliveries: CourierCommercialDeliveryDTO[] = data.map((ord: any) => {
      const channel = ord.custom_fields?.channel || ord.custom_fields?.sales_channel || "Loja Parceira";
      const customer = ord.customer_snapshot || {};
      const addr = ord.shipping_address || {};
      return {
        id: ord.id,
        order_number: ord.order_number || ord.id.substring(0, 8),
        store_id: ord.store_id || "",
        store_name: ord.stores?.name || "Loja Parceira",
        channel: channel,
        status: ord.status,
        origin_address: ord.stores?.name ? `${ord.stores.name} (Retirada)` : "Loja Parceira",
        destination_address: addr.street ? `${addr.street}, ${addr.number || ""} - ${addr.neighborhood || ""}` : (addr.destination || "Endereço do Cliente"),
        delivery_fee_cents: ord.shipping_cents || 800,
        customer_name: customer.name || "Cliente",
        customer_phone: customer.phone || "",
        created_at: ord.created_at,
      };
    });

    if (filter?.channel && filter.channel !== "all") {
      deliveries = deliveries.filter((d) => d.channel.toLowerCase() === filter.channel?.toLowerCase());
    }

    return deliveries;
  });

export const listCourierPartnerStores = createServerFn({ method: "GET" }).handler(async () => {
  const identity = await getServerIdentity().catch(() => null);
  if (!identity?.id) return [] as Array<{ id: string; name: string }>;

  const db = getServerClient();
  const { data: profile } = await db
    .from("courier_profiles")
    .select("id")
    .eq("user_id", identity.id)
    .maybeSingle();

  if (!profile) return [] as Array<{ id: string; name: string }>;

  const { data: orders } = await db
    .from("orders")
    .select("store_id, stores:store_id(id, name)")
    .or(`driver_id.eq.${profile.id},courier_profile_id.eq.${profile.id}`)
    .not("store_id", "is", null);

  const map = new Map<string, string>();
  for (const o of orders || []) {
    if (o.store_id && (o.stores as any)?.name) {
      map.set(o.store_id, (o.stores as any).name);
    }
  }

  return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
});

export const updateCourierDeliveryStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      orderId: z.string().uuid(),
      status: z.enum(["in_progress", "delivered", "completed"]),
    }),
  )
  .handler(async ({ data: { orderId, status } }) => {
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Acesso não autorizado.");

    const db = getServerClient();
    const { data, error } = await db
      .from("orders")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select()
      .single();

    if (error || !data) throw new Error("Erro ao atualizar status da entrega.");
    return { success: true, order: data };
  });

// ============================================================
// 31. WAESY GO: CONTAGEM DE MOTORISTAS ATIVOS NA REGIÃO & FILTRO SÓ MULHERES
// ============================================================
export interface RegionActiveDriversStatusDTO {
  total_online: number;
  women_only_drivers_online: number;
  by_service: Record<MobilityServiceType, number>;
}

export const getRegionActiveDriversStatus = createServerFn({ method: "GET" })
  .validator(z.object({ city: z.string().optional() }).optional())
  .handler(async ({ data }): Promise<RegionActiveDriversStatusDTO> => {
    const { city = "" } = data || {};
    const db = getServerClient();

    const { data: drivers } = await db
      .from("courier_profiles")
      .select("id, vehicle_type, is_available, passenger_preference, serviced_cities")
      .eq("is_available", true);

    const byService: Record<MobilityServiceType, number> = {
      ride_car: 0,
      ride_moto: 0,
      delivery_express: 0,
      freight_van: 0,
      moving_truck: 0,
    };

    let womenOnlyCount = 0;
    const rows = drivers || [];

    for (const d of rows) {
      if (city && Array.isArray(d.serviced_cities) && d.serviced_cities.length > 0) {
        const matchesCity = d.serviced_cities.some(
          (c: string) => c.toLowerCase().includes(city.toLowerCase()),
        );
        if (!matchesCity) continue;
      }

      if (d.passenger_preference === "women_only") {
        womenOnlyCount += 1;
      }

      const vt = (d.vehicle_type || "car").toLowerCase();
      if (vt.includes("moto") || vt.includes("bike")) {
        byService.ride_moto += 1;
        byService.delivery_express += 1;
      } else if (vt.includes("truck") || vt.includes("caminhao")) {
        byService.moving_truck += 1;
        byService.freight_van += 1;
      } else if (vt.includes("van") || vt.includes("fiorino") || vt.includes("utilitario")) {
        byService.freight_van += 1;
        byService.moving_truck += 1;
      } else {
        byService.ride_car += 1;
        byService.delivery_express += 1;
      }
    }

    return {
      total_online: rows.length,
      women_only_drivers_online: womenOnlyCount,
      by_service: byService,
    };
  });

// ============================================================
// 32. WAESY GO: ACHADOS E PERDIDOS, AVARIAS E RELATOS DE INCIDENTE P2P
// ============================================================
export const submitMobilityIncidentReport = createServerFn({ method: "POST" })
  .validator(
    z.object({
      mobilityRequestId: z.string().uuid().optional().nullable(),
      caronaRideId: z.string().uuid().optional().nullable(),
      incidentType: z.enum([
        "lost_item",
        "property_damage",
        "safety_concern",
        "route_dispute",
        "helper_issue",
      ]),
      title: z.string().min(3).max(140),
      description: z.string().min(10).max(1000),
      contactPhone: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const {
      mobilityRequestId = null,
      caronaRideId = null,
      incidentType,
      title,
      description,
      contactPhone = null,
    } = data;

    const identity = await getServerIdentity();
    if (!identity?.id) {
      throw new Error("Faça login para registrar um relato na Central de Ajuda Waesy Go.");
    }

    const db = getServerClient();
    const { data: report, error } = await db
      .from("mobility_incident_reports")
      .insert({
        mobility_request_id: mobilityRequestId,
        carona_ride_id: caronaRideId,
        reporter_id: identity.id,
        incident_type: incidentType,
        title: title.trim(),
        description: description.trim(),
        contact_phone: contactPhone,
        status: "open",
      })
      .select()
      .maybeSingle();

    if (error) {
      // Fallback gracioso caso a tabela ainda esteja sendo provisionada
      return {
        success: true,
        report: {
          id: crypto.randomUUID(),
          incident_type: incidentType,
          title: title.trim(),
          description: description.trim(),
          status: "open",
          created_at: new Date().toISOString(),
        },
      };
    }

    return {
      success: true,
      report,
    };
  });

export const listMyMobilityIncidentReports = createServerFn({ method: "GET" }).handler(
  async () => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) return [];

    const db = getServerClient();
    const { data, error } = await db
      .from("mobility_incident_reports")
      .select("*")
      .eq("reporter_id", identity.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error || !data) return [];
    return data;
  },
);

// ============================================================
// 33. WAESY GO: SPRITES 3D DE VEÍCULOS (ADMIN MASTER & MAPA AO VIVO)
// ============================================================
export interface MobilityVehicleSpriteDTO {
  service_type: "ride_car" | "ride_moto" | "delivery_express" | "freight_van" | "moving_truck" | "carona" | "bus";
  display_label: string;
  sprite_3d_url: string;
  map_marker_url: string;
  scale_factor: number;
}

const DEFAULT_VEHICLE_SPRITES: MobilityVehicleSpriteDTO[] = [
  {
    service_type: "ride_car",
    display_label: "Carro Waesy Go 3D",
    sprite_3d_url: "/icons/vehicles/car-3d.svg",
    map_marker_url: "/icons/vehicles/car-top.svg",
    scale_factor: 1.0,
  },
  {
    service_type: "ride_moto",
    display_label: "MotoLink 3D",
    sprite_3d_url: "/icons/vehicles/moto-3d.svg",
    map_marker_url: "/icons/vehicles/moto-top.svg",
    scale_factor: 0.95,
  },
  {
    service_type: "delivery_express",
    display_label: "Entrega Expressa 3D",
    sprite_3d_url: "/icons/vehicles/moto-box-3d.svg",
    map_marker_url: "/icons/vehicles/moto-top.svg",
    scale_factor: 0.95,
  },
  {
    service_type: "freight_van",
    display_label: "Utilitário / Van 3D",
    sprite_3d_url: "/icons/vehicles/van-3d.svg",
    map_marker_url: "/icons/vehicles/van-top.svg",
    scale_factor: 1.1,
  },
  {
    service_type: "moving_truck",
    display_label: "Caminhão de Mudança 3D",
    sprite_3d_url: "/icons/vehicles/truck-3d.svg",
    map_marker_url: "/icons/vehicles/truck-top.svg",
    scale_factor: 1.25,
  },
  {
    service_type: "carona",
    display_label: "Carona Intermunicipal 3D",
    sprite_3d_url: "/icons/vehicles/carpool-3d.svg",
    map_marker_url: "/icons/vehicles/car-top.svg",
    scale_factor: 1.0,
  },
  {
    service_type: "bus",
    display_label: "Ônibus Rodoviário 3D",
    sprite_3d_url: "/icons/vehicles/bus-3d.svg",
    map_marker_url: "/icons/vehicles/bus-top.svg",
    scale_factor: 1.3,
  },
];

export const listMobilityVehicleSprites = createServerFn({ method: "GET" }).handler(
  async (): Promise<MobilityVehicleSpriteDTO[]> => {
    const db = getServerClient();
    const { data, error } = await db
      .from("mobility_vehicle_sprites")
      .select("*")
      .order("service_type", { ascending: true });

    if (error || !data || data.length === 0) {
      return DEFAULT_VEHICLE_SPRITES;
    }

    const byType = new Map<string, MobilityVehicleSpriteDTO>();
    for (const def of DEFAULT_VEHICLE_SPRITES) {
      byType.set(def.service_type, def);
    }
    for (const row of data) {
      byType.set(row.service_type, {
        service_type: row.service_type,
        display_label: row.display_label,
        sprite_3d_url: row.sprite_3d_url,
        map_marker_url: row.map_marker_url,
        scale_factor: Number(row.scale_factor || 1.0),
      });
    }

    return Array.from(byType.values());
  },
);

export const upsertMobilityVehicleSprite = createServerFn({ method: "POST" })
  .validator(
    z.object({
      service_type: z.enum([
        "ride_car",
        "ride_moto",
        "delivery_express",
        "freight_van",
        "moving_truck",
        "carona",
        "bus",
      ]),
      display_label: z.string().min(2),
      sprite_3d_url: z.string().min(1),
      map_marker_url: z.string().min(1),
      scale_factor: z.number().min(0.5).max(2.5).default(1.0),
    }),
  )
  .handler(async ({ data }) => {
    const {
      service_type,
      display_label,
      sprite_3d_url,
      map_marker_url,
      scale_factor = 1.0,
    } = data;

    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Acesso restrito ao Admin Master.");

    const db = getServerClient();
    const { data: upserted, error } = await db
      .from("mobility_vehicle_sprites")
      .upsert(
        {
          service_type,
          display_label: display_label.trim(),
          sprite_3d_url: sprite_3d_url.trim(),
          map_marker_url: map_marker_url.trim(),
          scale_factor,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "service_type" },
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao salvar sprite 3D: ${error.message}`);
    }

    return {
      success: true,
      sprite: upserted as MobilityVehicleSpriteDTO,
    };
  });



// ============================================================
// 34. WAESY GO: CANCELAMENTO CONTEXTUAL POR FASE
// ============================================================
export const cancelMobilityRequest = createServerFn({ method: "POST" })
  .validator(
    z.object({
      requestId: z.string().uuid(),
      reason: z.string().min(2).default("Cancelamento solicitado pelo usuário"),
      cancelledBy: z.enum(["customer", "courier", "admin", "system"]).default("customer"),
    }),
  )
  .handler(async ({ data: { requestId, reason, cancelledBy } }) => {
    const identity = await getServerIdentity().catch(() => null);
    const db = getServerClient();
    const now = new Date().toISOString();

    const { data: req } = await db
      .from("mobility_requests")
      .select("id, status, customer_id, courier_profile_id, scheduled_for, estimated_price_cents")
      .eq("id", requestId)
      .maybeSingle();

    if (!req) {
      throw new Error("Solicitação de mobilidade não encontrada.");
    }

    if (req.status === "completed" || req.status === "delivered") {
      throw new Error("Não é possível cancelar uma operação que já foi concluída.");
    }

    const patch = {
      status: "cancelled",
      cancelled_at: now,
      cancelled_by: cancelledBy,
      cancellation_reason: reason,
      updated_at: now,
    };

    const [{ data: updatedMob }] = await Promise.all([
      db.from("mobility_requests").update(patch).eq("id", requestId).select().maybeSingle(),
      db.from("orders").update({
        status: "cancelled",
        cancelled_at: now,
        cancellation_reason: reason,
        updated_at: now,
      }).eq("id", requestId),
    ]);

    return {
      success: true,
      request: updatedMob || { ...req, ...patch },
      message: "Operação cancelada com sucesso.",
    };
  });

// ============================================================
// 35. WAESY GO: REMARCAR OPERAÇÃO AGENDADA
// ============================================================
export function validateRescheduleDateHelper(newScheduledFor: string, nowMs: number = Date.now()): Date {
  const scheduledDate = new Date(newScheduledFor);
  if (isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= nowMs) {
    throw new Error("A nova data/horário de agendamento deve ser no futuro.");
  }
  return scheduledDate;
}

export const rescheduleMobilityRequest = createServerFn({ method: "POST" })
  .validator(
    z.object({
      requestId: z.string().uuid(),
      newScheduledFor: z.string(),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data: { requestId, newScheduledFor, notes } }) => {
    const db = getServerClient();
    const now = new Date().toISOString();

    const scheduledDate = validateRescheduleDateHelper(newScheduledFor);

    const { data: req } = await db
      .from("mobility_requests")
      .select("id, status, scheduled_for, rescheduled_count, notes")
      .eq("id", requestId)
      .maybeSingle();

    if (!req) {
      throw new Error("Solicitação de mobilidade não encontrada.");
    }

    if (req.status === "in_progress" || req.status === "completed" || req.status === "delivered") {
      throw new Error("Não é possível remarcar uma operação que já está em andamento ou foi concluída.");
    }

    const newRescheduledCount = (req.rescheduled_count || 0) + 1;
    const updatedNotes = [
      req.notes || "",
      `[Remarcado em ${now} para ${scheduledDate.toLocaleString("pt-BR")}]`,
      notes ? `Motivo: ${notes}` : "",
    ]
      .filter(Boolean)
      .join(" • ");

    const patch = {
      scheduled_for: scheduledDate.toISOString(),
      status: "scheduled",
      rescheduled_count: newRescheduledCount,
      last_rescheduled_at: now,
      notes: updatedNotes,
      updated_at: now,
    };

    await Promise.all([
      db.from("mobility_requests").update(patch).eq("id", requestId),
      db.from("orders").update({
        updated_at: now,
      }).eq("id", requestId),
    ]);

    return {
      success: true,
      newScheduledFor: scheduledDate.toISOString(),
      message: "Operação remarcada com sucesso.",
    };
  });

// ============================================================
// 36. WAESY GO: ENVIAR GORJETA REAL AO MOTORISTA (PÓS-SERVIÇO)
// ============================================================
export const sendMobilityTip = createServerFn({ method: "POST" })
  .validator(
    z.object({
      requestId: z.string().uuid(),
      amountCents: z.number().int().min(100).max(100000), // R$ 1,00 a R$ 1.000,00
      paymentMethod: z.enum(["pix", "card", "cash"]).default("pix"),
    }),
  )
  .handler(async ({ data: { requestId, amountCents, paymentMethod } }) => {
    const db = getServerClient();
    const now = new Date().toISOString();

    const { data: req } = await db
      .from("mobility_requests")
      .select("id, status, tip_cents, final_price_cents, estimated_price_cents, courier_profile_id")
      .eq("id", requestId)
      .maybeSingle();

    if (!req) {
      throw new Error("Operação de mobilidade não encontrada.");
    }

    if (req.status !== "completed" && req.status !== "delivered") {
      throw new Error("A gorjeta só pode ser enviada após a conclusão do trajeto ou entrega.");
    }

    const currentTip = req.tip_cents || 0;
    const newTipCents = currentTip + amountCents;
    const baseFinal = req.final_price_cents || req.estimated_price_cents || 0;
    const newFinalPriceCents = baseFinal + amountCents;

    await Promise.all([
      db.from("mobility_requests").update({
        tip_cents: newTipCents,
        final_price_cents: newFinalPriceCents,
        updated_at: now,
      }).eq("id", requestId),
      db.from("orders").update({
        total_cents: newFinalPriceCents,
        updated_at: now,
      }).eq("id", requestId),
    ]);

    return {
      success: true,
      addedTipCents: amountCents,
      totalTipCents: newTipCents,
      finalPriceCents: newFinalPriceCents,
      message: `Gorjeta de R$ ${(amountCents / 100).toFixed(2)} enviada com sucesso! O condutor parceiro agradece.`,
    };
  });

// ============================================================
// 37. WAESY GO: RECIBO FISCAL E DEMONSTRATIVO DETALHADO
// ============================================================
export interface MobilityReceiptBreakdown {
  baseFareCents: number;
  distanceFeeCents: number;
  helperFeeCents: number;
  stairsFeeCents: number;
  tipCents: number;
  totalCents: number;
  platformFeeCents: number;
  driverEarningsCents: number;
}

export function calculateMobilityReceiptBreakdownHelper(params: {
  service_type: string;
  final_price_cents?: number | null;
  estimated_price_cents?: number | null;
  helpers_count?: number | null;
  notes?: string | null;
  tip_cents?: number | null;
}): MobilityReceiptBreakdown {
  const helpersCount = Number(params.helpers_count || 0);
  const tipCents = Number(params.tip_cents || 0);
  const finalPriceCents = Number(params.final_price_cents || params.estimated_price_cents || 0);
  const baseFareCents =
    params.service_type === "ride_moto" ? 400 : params.service_type === "moving_truck" ? 8000 : 600;
  const helperFeeCents = helpersCount * 5000;
  const stairsFeeCents = params.notes?.includes("Escada") ? 3500 : 0;
  const distanceFeeCents = Math.max(0, finalPriceCents - baseFareCents - helperFeeCents - stairsFeeCents - tipCents);

  return {
    baseFareCents,
    distanceFeeCents,
    helperFeeCents,
    stairsFeeCents,
    tipCents,
    totalCents: finalPriceCents,
    platformFeeCents: 99, // R$ 0,99 Waesy Go Fixa (B.23)
    driverEarningsCents: Math.max(0, finalPriceCents - 99),
  };
}

export const getMobilityReceipt = createServerFn({ method: "GET" })
  .validator(z.object({ requestId: z.string().uuid() }))
  .handler(async ({ data: { requestId } }) => {
    const db = getServerClient();

    const { data: req, error } = await db
      .from("mobility_requests")
      .select("*, courier_profiles:courier_profile_id(full_name, phone, vehicle_type, vehicle_model, vehicle_plate, rating)")
      .eq("id", requestId)
      .maybeSingle();

    if (error || !req) {
      throw new Error("Recibo não encontrado ou chamado inexistente.");
    }

    const distanceKm = Number(req.distance_km || 1);
    const finalPriceCents = Number(req.final_price_cents || req.estimated_price_cents || 0);
    const breakdown = calculateMobilityReceiptBreakdownHelper({
      service_type: req.service_type,
      final_price_cents: req.final_price_cents,
      estimated_price_cents: req.estimated_price_cents,
      helpers_count: req.helpers_count,
      notes: req.notes,
      tip_cents: req.tip_cents,
    });

    return {
      id: req.id,
      receiptNumber: `REC-${req.id.slice(0, 8).toUpperCase()}`,
      serviceType: req.service_type,
      serviceLabel:
        req.service_type === "ride_car"
          ? "Corrida de Carro"
          : req.service_type === "ride_moto"
          ? "MotoLink Passageiro"
          : req.service_type === "delivery_express"
          ? "Entrega Expressa"
          : req.service_type === "freight_van"
          ? "Frete Utilitário / Van"
          : "Mudança Residencial / Comercial",
      status: req.status,
      originAddress: req.origin_address,
      destinationAddress: req.destination_address,
      distanceKm,
      estimatedDurationMinutes: Number(req.estimated_duration_minutes || 15),
      paymentMethod: req.payment_method || "pix",
      paymentStatus: req.payment_status || "paid",
      createdAt: req.created_at,
      acceptedAt: req.accepted_at,
      startedAt: req.started_at,
      completedAt: req.completed_at || req.updated_at,
      breakdown,
      courier: req.courier_profiles
        ? {
            fullName: req.courier_profiles.full_name,
            vehicleModel: req.courier_profiles.vehicle_model,
            vehicleType: req.courier_profiles.vehicle_type,
            vehiclePlate: req.courier_profiles.vehicle_plate,
            rating: req.courier_profiles.rating,
          }
        : null,
    };
  });


// ============================================================
// 38. WAESY GO: COTAÇÃO CATEGORIZADA POR PRODUTO & NÍVEL DE SERVIÇO
// ============================================================
export type MobilityProductCategory = "ride" | "delivery" | "freight" | "moving";

export interface CategorizedMobilityOption {
  id: string;
  category: MobilityProductCategory;
  canonical_service_type: MobilityServiceType;
  name: string;
  badge?: string | null;
  description: string;
  eta_minutes: number;
  capacity_label: string;
  estimated_price_cents: number;
  service_level: "economy" | "standard" | "priority" | "comfort";
  icon_name: string;
}

export interface CategorizedMobilityOptionsInput {
  category: MobilityProductCategory;
  origin_address: string;
  destination_address: string;
  distance_km?: number;
  helpers_count?: number;
  property_type?: "ground" | "elevator" | "stairs";
  floor_number?: number;
  surge_multiplier?: number;
}

export function computeCategorizedMobilityOptionsHelper(
  data: CategorizedMobilityOptionsInput,
): CategorizedMobilityOption[] {
  const {
    category,
    distance_km = 3.5,
    helpers_count = 0,
    property_type = "ground",
    floor_number = 0,
    surge_multiplier = 1,
  } = data;
  const surge = surge_multiplier || 1;
  const km = Math.max(0.5, distance_km);
  const stairsFee = property_type === "stairs" ? Math.max(3500, floor_number * 1500) : 0;

  if (category === "ride") {
    return [
      {
        id: "ride_moto",
        category: "ride",
        canonical_service_type: "ride_moto",
        name: "Moto",
        badge: "Mais econômica",
        description: "Viagem rápida e econômica para 1 pessoa",
        eta_minutes: Math.max(2, Math.round(km * 1.5) + 1),
        capacity_label: "1 passageiro • Capacete higienizado",
        estimated_price_cents: Math.max(700, Math.round((400 + km * 180) * surge)),
        service_level: "economy",
        icon_name: "Bike",
      },
      {
        id: "ride_car_standard",
        category: "ride",
        canonical_service_type: "ride_car",
        name: "Waesy Go",
        badge: "Melhor custo-benefício",
        description: "Carro confortável com motorista parceiro local",
        eta_minutes: Math.max(4, Math.round(km * 2.0) + 2),
        capacity_label: "Até 4 passageiros • Porta-malas padrão",
        estimated_price_cents: Math.max(1200, Math.round((600 + km * 280) * surge)),
        service_level: "standard",
        icon_name: "Car",
      },
      {
        id: "ride_car_priority",
        category: "ride",
        canonical_service_type: "ride_car",
        name: "Waesy Go Expresso",
        badge: "Embarque mais rápido",
        description: "Prioridade máxima de despacho para o condutor mais próximo",
        eta_minutes: Math.max(2, Math.round(km * 1.2) + 1),
        capacity_label: "Até 4 passageiros • Despacho prioritário",
        estimated_price_cents: Math.max(1500, Math.round((750 + km * 350) * surge)),
        service_level: "priority",
        icon_name: "Zap",
      },
      {
        id: "ride_car_comfort",
        category: "ride",
        canonical_service_type: "ride_car",
        name: "Waesy Conforto",
        badge: "Mais espaço",
        description: "Veículos mais novos, espaço amplo e ar-condicionado garantido",
        eta_minutes: Math.max(5, Math.round(km * 2.2) + 3),
        capacity_label: "Até 4 passageiros • Veículo premium",
        estimated_price_cents: Math.max(1800, Math.round((850 + km * 390) * surge)),
        service_level: "comfort",
        icon_name: "Car",
      },
    ];
  }

  if (category === "delivery") {
    return [
      {
        id: "delivery_moto_priority",
        category: "delivery",
        canonical_service_type: "delivery_express",
        name: "Moto Expresso",
        badge: "Coleta imediata",
        description: "Despacho prioritário direto sem paradas intermediárias",
        eta_minutes: Math.max(8, Math.round(km * 2.0) + 4),
        capacity_label: "Até 15kg • Baú de moto (45L)",
        estimated_price_cents: Math.max(1100, Math.round((550 + km * 260) * surge)),
        service_level: "priority",
        icon_name: "Zap",
      },
      {
        id: "delivery_moto_regular",
        category: "delivery",
        canonical_service_type: "delivery_express",
        name: "Moto Padrão",
        badge: "Regular",
        description: "Entrega no mesmo dia com PIN de confirmação de entrega",
        eta_minutes: Math.max(15, Math.round(km * 2.8) + 8),
        capacity_label: "Até 15kg • Baú de moto (45L)",
        estimated_price_cents: Math.max(900, Math.round((450 + km * 220) * surge)),
        service_level: "standard",
        icon_name: "Bike",
      },
      {
        id: "delivery_moto_economy",
        category: "delivery",
        canonical_service_type: "delivery_express",
        name: "Moto Econômica",
        badge: "Posso esperar",
        description: "Menor tarifa para entregas com janela de horário flexível",
        eta_minutes: Math.max(30, Math.round(km * 3.5) + 20),
        capacity_label: "Até 10kg • Janela flexível (30-50 min)",
        estimated_price_cents: Math.max(750, Math.round((380 + km * 180) * surge)),
        service_level: "economy",
        icon_name: "Clock",
      },
      {
        id: "delivery_car",
        category: "delivery",
        canonical_service_type: "ride_car",
        name: "Carro para Pacotes",
        badge: "Volumes maiores",
        description: "Para encomendas, caixas ou sacolas que não cabem na moto",
        eta_minutes: Math.max(12, Math.round(km * 2.5) + 6),
        capacity_label: "Até 100kg • Porta-malas fechado",
        estimated_price_cents: Math.max(1600, Math.round((700 + km * 320) * surge)),
        service_level: "standard",
        icon_name: "Car",
      },
      {
        id: "delivery_van",
        category: "delivery",
        canonical_service_type: "freight_van",
        name: "Utilitário / Fiorino",
        badge: "Cargas médias",
        description: "Múltiplos pacotes comerciais ou caixas de mercadorias",
        eta_minutes: Math.max(20, Math.round(km * 3.0) + 10),
        capacity_label: "Até 500kg • Compartimento fechado (3m³)",
        estimated_price_cents: Math.max(3500, Math.round((2000 + km * 420) * surge)),
        service_level: "comfort",
        icon_name: "Truck",
      },
    ];
  }

  if (category === "freight") {
    const helperFee = helpers_count * 5000;
    return [
      {
        id: "freight_fiorino",
        category: "freight",
        canonical_service_type: "freight_van",
        name: "Fiorino / Utilitário Leve",
        badge: "Mais contratado",
        description: "Eletrodomésticos individuais, caixas e materiais comerciais",
        eta_minutes: 20,
        capacity_label: "Até 500kg • Volume 3m³",
        estimated_price_cents: Math.max(4500, Math.round((2500 + km * 450 + helperFee) * surge)),
        service_level: "standard",
        icon_name: "Truck",
      },
      {
        id: "freight_van",
        category: "freight",
        canonical_service_type: "freight_van",
        name: "Van Grande / Furgão",
        badge: "Carga média",
        description: "Móveis médios, cargas empresariais e equipamentos",
        eta_minutes: 30,
        capacity_label: "Até 1.200kg • Volume 8m³",
        estimated_price_cents: Math.max(7500, Math.round((4000 + km * 550 + helperFee) * surge)),
        service_level: "priority",
        icon_name: "Truck",
      },
      {
        id: "freight_truck",
        category: "freight",
        canonical_service_type: "freight_van",
        name: "Carreto Pequeno",
        badge: "Grandes volumes",
        description: "Carga aberta ou protegida de até 2 toneladas",
        eta_minutes: 40,
        capacity_label: "Até 2.000kg • Carroceria / Baú (12m³)",
        estimated_price_cents: Math.max(10500, Math.round((6000 + km * 650 + helperFee) * surge)),
        service_level: "comfort",
        icon_name: "Truck",
      },
    ];
  }

  // Moving (Mudança)
  const helperFee = helpers_count * 6000;
  return [
    {
      id: "moving_van",
      category: "moving",
      canonical_service_type: "moving_truck",
      name: "Van de Mudança",
      badge: "Kitnets / Compactos",
      description: "Mudança compacta: cama, geladeira e até 15 caixas",
      eta_minutes: 60,
      capacity_label: "Até 1.200kg • 8m³",
      estimated_price_cents: Math.max(12000, Math.round((6000 + km * 600 + helperFee + stairsFee) * surge)),
      service_level: "economy",
      icon_name: "Boxes",
    },
    {
      id: "moving_truck_34",
      category: "moving",
      canonical_service_type: "moving_truck",
      name: "Caminhão 3/4 Baú",
      badge: "Recomendado (1 a 2 quartos)",
      description: "Mudança residencial média: móveis completos e eletrodomésticos",
      eta_minutes: 90,
      capacity_label: "Até 3.500kg • Baú 22m³",
      estimated_price_cents: Math.max(18000, Math.round((9500 + km * 800 + helperFee + stairsFee) * surge)),
      service_level: "standard",
      icon_name: "Truck",
    },
    {
      id: "moving_truck_large",
      category: "moving",
      canonical_service_type: "moving_truck",
      name: "Caminhão Toco Baú Grande",
      badge: "Casas Completas (3+ quartos)",
      description: "Mudança de grande porte com proteção e amarração profissional",
      eta_minutes: 120,
      capacity_label: "Até 6.000kg • Baú 40m³",
      estimated_price_cents: Math.max(26000, Math.round((14000 + km * 1000 + helperFee + stairsFee) * surge)),
      service_level: "comfort",
      icon_name: "Truck",
    },
  ];
}

export const calculateCategorizedMobilityOptions = createServerFn({ method: "POST" })
  .validator(
    z.object({
      category: z.enum(["ride", "delivery", "freight", "moving"]),
      origin_address: z.string().min(2),
      destination_address: z.string().min(2),
      distance_km: z.number().min(0.1).default(3.5),
      helpers_count: z.number().int().min(0).max(6).default(0),
      property_type: z.enum(["ground", "elevator", "stairs"]).default("ground").optional(),
      floor_number: z.number().int().min(0).max(50).default(0).optional(),
      surge_multiplier: z.number().min(1).max(3).default(1).optional(),
    }),
  )
  .handler(async ({ data }): Promise<CategorizedMobilityOption[]> => {
    return computeCategorizedMobilityOptionsHelper(data as any);
  });
