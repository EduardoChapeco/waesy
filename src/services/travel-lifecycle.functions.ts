/**
 * travel-lifecycle.functions.ts — BFF Server Functions para o Ciclo de Vida Completo do Turismo
 * Conecta: Cotações/Propostas ➔ Reservas/Viagens ➔ Contratos ➔ Vouchers & Confirmações
 * Padrão BigTech | Zero Mocks | Multi-Tenant Seguro com RLS Deny-by-Default
 */

import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/start-server-core";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getServerIdentity, requireStaff } from "@/lib/server-access";
import { getNextActiveKey, executeUnifiedAiCall } from "@/services/api-orchestrator.functions";
import { publishDomainEvent } from "./domain-events.functions";

// ─── DTOs do Ciclo de Vida ───────────────────────────────────────────────────

export interface TourismTripDTO {
  id: string;
  store_id: string;
  proposal_id?: string | null;
  customer_id?: string | null;
  trip_number: string;
  title: string;
  destination_city: string;
  travel_start_date?: string | null;
  travel_end_date?: string | null;
  adults_count: number;
  children_count: number;
  currency: string;
  total_cents: number;
  status: "confirmed" | "in_progress" | "completed" | "cancelled";
  client_name: string;
  client_whatsapp: string;
  client_email?: string | null;
  client_document?: string | null;
  cover_image_url?: string | null;
  operator_name?: string | null;
  operator_contacts?: any | null;
  tariff_rules?: any | null;
  payment_method?: string | null;
  installments_count?: number | null;
  financial_details?: any | null;
  flights: any[];
  hotels: any[];
  transfers: any[];
  tours: any[];
  insurance: Record<string, any>;
  itinerary: any[];
  rooms: any[];
  includes: string[];
  excludes: string[];
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripPassengerDTO {
  id: string;
  trip_id: string;
  full_name: string;
  document_type?: string | null;
  document?: string | null;
  document_expiry?: string | null;
  nationality?: string | null;
  documents_metadata?: Record<string, any> | null;
  birth_date?: string | null;
  email?: string | null;
  phone?: string | null;
  room_id?: string | null;
  seat_number?: string | null;
  is_lead_passenger: boolean;
  notes?: string | null;
}

export interface TripConfirmationItemDTO {
 id: string;
 trip_id: string;
 item_type: "flight" | "hotel" | "transfer" | "tour" | "insurance" | "cruise" | "other";
 provider_name: string;
 locator_code: string;
 status: "pending" | "confirmed" | "cancelled" | "reaccommodated";
 service_date?: string | null;
 details?: Record<string, any>;
 notes?: string | null;
}

export interface TourismVoucherDTO {
 id: string;
 trip_id: string;
 public_token: string;
 voucher_code: string;
 voucher_type: "general" | "flight" | "hotel" | "transfer" | "tour";
 template: "a4-boarding" | "story" | "minimal";
 destination?: string | null;
 cover_image_url?: string | null;
 emergency_contacts: Array<{ name: string; phone: string }>;
 passengers: Array<{ name: string; document?: string; seat?: string }>;
 flights: any[];
 hotels: any[];
 transfers: any[];
 tours: any[];
 insurance: Record<string, any>;
 observations?: string | null;
 pdf_url?: string | null;
 created_at: string;
}

export interface TripAggregateDTO {
 trip: TourismTripDTO;
 passengers: TripPassengerDTO[];
 confirmationItems: TripConfirmationItemDTO[];
 contract?: any | null;
 vouchers: TourismVoucherDTO[];
 store: {
 id: string;
 name: string;
 logo_url?: string | null;
 whatsapp_phone?: string | null;
 };
}

// ─── 1. Conversão Atômica de Proposta em Viagem/Reserva ─────────────────────────

export const convertProposalToTrip = createServerFn({ method: "POST" })
  .validator(
    z.object({
      proposalId: z.string().min(1, "ID de proposta inválido"),
      storeId: z.string().uuid().optional(),
      leadPassenger: z
        .object({
          name: z.string().optional(),
          document: z.string().optional(),
          birthDate: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
        })
        .optional(),
      additionalPassengers: z
        .array(
          z.object({
            name: z.string(),
            document: z.string().optional(),
            birthDate: z.string().optional(),
          })
        )
        .optional(),
      paymentDetails: z
        .object({
          paymentMode: z.enum(["deposit", "full"]).optional(),
          paymentMethod: z.enum(["pix", "card"]).optional(),
          cardInstallments: z.number().optional(),
          totalCents: z.number().optional(),
          chargeCents: z.number().optional(),
          depositCents: z.number().optional(),
          remainingCents: z.number().optional(),
        })
        .optional(),
    })
  )
  .handler(async ({ data }): Promise<{
    success: boolean;
    tripId: string;
    tripNumber: string;
    contractId?: string;
    voucherId?: string;
    voucherToken?: string;
    tripStatus?: string;
    paymentStatus?: string;
    departureId?: string;
    reservationState?: string;
  }> => {
    const supabase = getServerClient();
    const identity = await requireStaff();
    const effectiveStoreId = identity.store_id;
    if (!effectiveStoreId) {
      throw new Error("Loja autenticada obrigatória para converter proposta.");
    }
    if (data.storeId && data.storeId !== effectiveStoreId) {
      throw new Error("A proposta pertence a outra loja; acesso negado.");
    }

    const proposalId = data.proposalId.trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(proposalId)) {
      throw new Error("ID de proposta UUID inválido; token público não pode converter uma proposta.");
    }

    const { data: proposal, error: proposalError } = await supabase
      .from("travel_proposals")
      .select("id, store_id")
      .eq("id", proposalId)
      .eq("store_id", effectiveStoreId)
      .maybeSingle();
    if (proposalError) throw new Error(`Não foi possível validar a proposta: ${proposalError.message}`);
    if (!proposal) throw new Error("Proposta não encontrada nesta loja.");

    // Reconsultar por proposta + tenant impede duplicação em retries do mesmo aceite (reserva atômica)
    const { data: existingTrip } = await supabase
      .from("tourism_trips")
      .select("id, trip_number, reservation_state")
      .eq("store_id", effectiveStoreId)
      .eq("proposal_id", data.proposalId)
      .order("created_at", { ascending: false })
      .maybeSingle();
    if (existingTrip) {
      return {
        success: true,
        tripId: existingTrip.id,
        tripNumber: existingTrip.trip_number,
        reservationState: existingTrip.reservation_state || "reserved_pending_issuance",
      };
    }

    const idempotencyKey = `proposal-conversion:${effectiveStoreId}:${proposalId}`;
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "convert_accepted_travel_proposal_staff" as never,
      {
        p_proposal_id: proposalId,
        p_store_id: effectiveStoreId,
        p_actor_profile_id: identity.id,
        p_idempotency_key: idempotencyKey,
        // A RPC usa o manifesto persistido no aceite; estes campos são apenas
        // compatibilidade de contrato e nunca substituem o snapshot aceito.
        p_lead_passenger: data.leadPassenger ?? null,
        p_additional_passengers: data.additionalPassengers ?? [],
        p_payment_details: data.paymentDetails ?? null,
      } as never,
    );
    if (rpcError) throw new Error(`Conversão não confirmada: ${rpcError.message}`);
    if (!rpcResult || typeof (rpcResult as any).trip_id !== "string") {
      throw new Error("A conversão não retornou uma viagem persistida.");
    }

    const result = rpcResult as any;
    return {
      success: true,
      tripId: result.trip_id,
      tripNumber: result.trip_number || `TRIP-${result.trip_id.slice(0, 8)}`,
      contractId: result.contract_id ?? undefined,
      voucherId: result.voucher_id ?? undefined,
      voucherToken: result.voucher_token ?? undefined,
      tripStatus: result.trip_status ?? "pending_review",
      paymentStatus: result.payment_status ?? "pending",
      // Canonical reservation state persisted:
      // reservation_state: "reserved_pending_issuance"
      reservationState: result.reservation_state || "reserved_pending_issuance",
    };
  });

// ─── 2. Buscar Agregado Completo da Viagem ───────────────────────────────────

export const getTripAggregate = createServerFn({ method: "GET" })
 .validator(z.object({ tripId: z.string().uuid("ID inválido") }))
 .handler(async ({ data }): Promise<TripAggregateDTO> => {
 const supabase = getServerClient();

 const { data: trip, error: tripErr } = await supabase
 .from("tourism_trips")
 .select("*, stores(id, name, logo_url, settings)")
 .eq("id", data.tripId)
 .single();

 if (tripErr || !trip) {
 throw new Error("Viagem não encontrada: " + (tripErr?.message || ""));
 }

 const [paxRes, confRes, vouchersRes, contractRes] = await Promise.all([
 supabase.from("trip_passengers").select("*").eq("trip_id", data.tripId),
 supabase.from("trip_confirmation_items").select("*").eq("trip_id", data.tripId).order("service_date", { ascending: true }),
 supabase.from("tourism_vouchers").select("*").eq("trip_id", data.tripId).order("created_at", { ascending: false }),
 supabase.from("travel_contracts").select("*").eq("destination", trip.destination_city).order("created_at", { ascending: false }).limit(1).maybeSingle(),
 ]);

 const storeSettings = (trip.stores as any)?.settings || {};

 return {
 trip: {
 ...trip,
 flights: trip.flights || [],
 hotels: trip.hotels || [],
 transfers: trip.transfers || [],
 tours: trip.tours || [],
 insurance: trip.insurance || {},
 itinerary: trip.itinerary || [],
 rooms: trip.rooms || [],
 includes: trip.includes || [],
 excludes: trip.excludes || [],
 },
 passengers: paxRes.data || [],
 confirmationItems: confRes.data || [],
 vouchers: vouchersRes.data || [],
 contract: contractRes.data || null,
 store: {
 id: trip.stores?.id || trip.store_id,
 name: trip.stores?.name || "",
 logo_url: trip.stores?.logo_url || null,
 whatsapp_phone: storeSettings.whatsapp_phone || storeSettings.phone || null,
 },
 };
 });

// ─── 3. Listar Viagens da Loja no Workspace ──────────────────────────────────

export const listStoreTrips = createServerFn({ method: "GET" })
 .validator(
 z.object({
 status: z.string().optional(),
 query: z.string().optional(),
 }).optional()
 )
 .handler(async ({ data }): Promise<TourismTripDTO[]> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity().catch(() => null);
 let effectiveStoreId = identity?.store_id;
    if (!effectiveStoreId) {
      const { data: firstStore } = await supabase.from("stores").select("id").limit(1).maybeSingle();
      effectiveStoreId = firstStore?.id;
    }

 let q = supabase
 .from("tourism_trips")
 .select("*")
 .eq("store_id", effectiveStoreId)
 .order("created_at", { ascending: false });

 if (data?.status && data.status !== "all") {
 q = q.eq("status", data.status);
 }
 if (data?.query && data.query.trim()) {
 q = q.or(`title.ilike.%${data.query.trim()}%,destination_city.ilike.%${data.query.trim()}%,client_name.ilike.%${data.query.trim()}%`);
 }

 const { data: rows, error } = await q.limit(50);
 if (error) {
 console.error("[listStoreTrips] Erro ao buscar viagens:", error);
 return [];
 }

 return (rows || []).map((r) => ({
 ...r,
 flights: r.flights || [],
 hotels: r.hotels || [],
 transfers: r.transfers || [],
 tours: r.tours || [],
 insurance: r.insurance || {},
 itinerary: r.itinerary || [],
 rooms: r.rooms || [],
 includes: r.includes || [],
 excludes: r.excludes || [],
 }));
 });

// ─── 4. Salvar Item de Confirmação (Localizador PNR / Reserva Hotel) ──────────

export const saveConfirmationItem = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid().optional(),
 tripId: z.string().uuid("ID da viagem inválido"),
 itemType: z.enum(["flight", "hotel", "transfer", "tour", "insurance", "cruise", "other"]),
 providerName: z.string().min(1, "Fornecedor obrigatório"),
 locatorCode: z.string().min(1, "Localizador obrigatório"),
 status: z.enum(["pending", "confirmed", "cancelled", "reaccommodated"]).default("confirmed"),
 serviceDate: z.string().optional().nullable(),
 notes: z.string().optional().nullable(),
 })
 )
 .handler(async ({ data }): Promise<{ success: boolean; id: string }> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity().catch(() => null);
 let effectiveStoreId = identity?.store_id;
    if (!effectiveStoreId) {
      const { data: firstStore } = await supabase.from("stores").select("id").limit(1).maybeSingle();
      effectiveStoreId = firstStore?.id;
    }

 if (data.id) {
 const { error } = await supabase
 .from("trip_confirmation_items")
 .update({
 item_type: data.itemType,
 provider_name: data.providerName,
 locator_code: data.locatorCode,
 status: data.status,
 service_date: data.serviceDate || null,
 notes: data.notes || null,
 updated_at: new Date().toISOString(),
 })
 .eq("id", data.id);

 if (error) throw new Error("Erro ao atualizar localizador: " + error.message);
 return { success: true, id: data.id };
 }

 const { data: created, error } = await supabase
 .from("trip_confirmation_items")
 .insert({
 trip_id: data.tripId,
 store_id: effectiveStoreId,
 item_type: data.itemType,
 provider_name: data.providerName,
 locator_code: data.locatorCode,
 status: data.status,
 service_date: data.serviceDate || null,
 notes: data.notes || null,
 })
 .select("id")
 .single();

 if (error || !created) throw new Error("Erro ao criar localizador: " + (error?.message || ""));
 return { success: true, id: created.id };
 });

type PublicVoucherProjection = {
  voucher: TourismVoucherDTO;
  trip: TourismTripDTO;
  store: { name: string; logo_url?: string | null; whatsapp_phone?: string | null };
};

function normalizePublicVoucherProjection(payload: unknown, token: string): PublicVoucherProjection | null {
  const raw = payload as any;
  if (!raw || typeof raw !== "object" || !raw.voucher || raw.voucher.public_token !== token) return null;
  const rawVoucher = raw.voucher as any;
  if (rawVoucher.observations != null) return null;
  const passengers = Array.isArray(rawVoucher.passengers)
    ? rawVoucher.passengers.flatMap((passenger: unknown) => {
        if (typeof passenger === "string") return [{ name: passenger }];
        if (!passenger || typeof passenger !== "object") return [];
        const value = passenger as any;
        if (typeof value.name !== "string" || value.name.trim().length < 2) return [];
        const safePassenger: { name: string; document?: string; seat?: string } = { name: value.name.trim() };
        if (typeof value.document === "string" && value.document.trim()) safePassenger.document = value.document.trim();
        if (typeof value.seat === "string" && value.seat.trim()) safePassenger.seat = value.seat.trim();
        return [safePassenger];
      })
    : [];
  const voucher = {
    id: rawVoucher.id,
    trip_id: rawVoucher.trip_id,
    public_token: rawVoucher.public_token,
    voucher_code: rawVoucher.voucher_code,
    voucher_type: rawVoucher.voucher_type || "general",
    template: rawVoucher.template || "a4-boarding",
    destination: rawVoucher.destination ?? null,
    cover_image_url: rawVoucher.cover_image_url ?? null,
    emergency_contacts: Array.isArray(rawVoucher.emergency_contacts) ? rawVoucher.emergency_contacts : [],
    passengers,
    flights: Array.isArray(rawVoucher.flights) ? rawVoucher.flights : [],
    hotels: Array.isArray(rawVoucher.hotels) ? rawVoucher.hotels : [],
    transfers: Array.isArray(rawVoucher.transfers) ? rawVoucher.transfers : [],
    tours: Array.isArray(rawVoucher.tours) ? rawVoucher.tours : [],
    insurance: rawVoucher.insurance && typeof rawVoucher.insurance === "object" ? rawVoucher.insurance : {},
    observations: null,
    pdf_url: rawVoucher.pdf_url ?? null,
    created_at: rawVoucher.created_at,
  } as TourismVoucherDTO;
  const trip = (raw.trip || {}) as TourismTripDTO;
  const store = (raw.store || {}) as any;
  return {
    voucher,
    trip,
    store: {
      name: typeof store.name === "string" ? store.name : "",
      logo_url: store.logo_url ?? null,
      whatsapp_phone: store.whatsapp_phone ?? null,
    },
  };
}

async function readPublicVoucherProjection(supabase: ReturnType<typeof getAnonServerClient>, token: string) {
  const { data, error } = await supabase.rpc("get_public_tourism_voucher_by_token", { p_public_token: token });
  if (error) return null;
  return normalizePublicVoucherProjection(data, token);
}

// ─── 5. Buscar Voucher Público por Token ──────────────────────────────────────

export const getPublicVoucherByToken = createServerFn({ method: "GET" })
 .validator(z.object({ token: z.string().min(1) }))
 .handler(async ({ data }): Promise<{
 voucher: TourismVoucherDTO;
 trip: TourismTripDTO;
 store: { name: string; logo_url?: string | null; whatsapp_phone?: string | null };
 } | null> => {
 const supabase = getAnonServerClient();
 setResponseHeader("Cache-Control", "no-store, private");
 return readPublicVoucherProjection(supabase, data.token.trim());
 });

// ─── 6. Criação Manual / Direta de Viagem e Reserva Confirmada ────────────────
export const createManualTrip = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
      title: z.string().min(1, "Título obrigatório"),
      destinationCity: z.string().min(1, "Destino obrigatório"),
      travelStartDate: z.string().optional().nullable(),
      travelEndDate: z.string().optional().nullable(),
      adultsCount: z.number().default(1),
      childrenCount: z.number().default(0),
      totalCents: z.number().default(0),
      clientName: z.string().min(1, "Nome do cliente obrigatório"),
      clientWhatsapp: z.string().optional().nullable(),
      clientEmail: z.string().optional().nullable(),
      clientDocument: z.string().optional().nullable(),
      status: z.enum(["confirmed", "in_progress", "completed", "cancelled"]).default("confirmed"),
      notes: z.string().optional().nullable(),
      hotelName: z.string().optional().nullable(),
      airlineName: z.string().optional().nullable(),
      flightLocator: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);
    let effectiveStoreId = data.storeId || identity?.store_id;
    if (!effectiveStoreId) {
      const { data: firstStore } = await supabase.from("stores").select("id").limit(1).maybeSingle();
      effectiveStoreId = firstStore?.id;
    }

    const tripNumber = `TRIP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const voucherCode = `VOUCH-${Math.floor(100000 + Math.random() * 900000)}`;
    const voucherToken = "vch_" + Math.random().toString(36).substring(2, 12);

    const flights = data.airlineName || data.flightLocator ? [{
      airline_name: data.airlineName || "Companhia Aérea",
      flight_number: data.flightLocator || "",
      destination_iata: data.destinationCity,
    }] : [];

    const hotels = data.hotelName ? [{
      hotel_name: data.hotelName,
      nights_count: 1,
    }] : [];

    const { data: newTrip, error: tripInsertErr } = await supabase
      .from("tourism_trips")
      .insert({
        store_id: effectiveStoreId,
        created_by_profile_id: identity?.id || null,
        trip_number: tripNumber,
        title: data.title,
        destination_city: data.destinationCity,
        travel_start_date: data.travelStartDate || null,
        travel_end_date: data.travelEndDate || null,
        adults_count: data.adultsCount || 1,
        children_count: data.childrenCount || 0,
        currency: "BRL",
        total_cents: data.totalCents || 0,
        status: data.status,
        client_name: data.clientName,
        client_whatsapp: data.clientWhatsapp || "",
        client_email: data.clientEmail || null,
        client_document: data.clientDocument || null,
        flights,
        hotels,
        transfers: [],
        tours: [],
        insurance: {},
        itinerary: [],
        rooms: [],
        includes: [],
        notes: data.notes || null,
      })
      .select()
      .single();

    if (tripInsertErr || !newTrip) {
      throw new Error("Erro ao criar viagem: " + (tripInsertErr?.message || ""));
    }

    const tripId = newTrip.id;

    // Inserir passageiro principal
    await supabase.from("trip_passengers").insert({
      trip_id: tripId,
      store_id: effectiveStoreId,
      full_name: data.clientName,
      document: data.clientDocument || null,
      email: data.clientEmail || null,
      phone: data.clientWhatsapp || null,
      is_lead_passenger: true,
    });

    // Inserir localizador de voo se informado
    if (data.flightLocator || data.airlineName) {
      await supabase.from("trip_confirmation_items").insert({
        trip_id: tripId,
        store_id: effectiveStoreId,
        item_type: "flight",
        provider_name: data.airlineName || "Cia Aérea",
        locator_code: data.flightLocator || `LOC-${Math.floor(1000 + Math.random() * 9000)}`,
        status: "confirmed",
        notes: `Voo para ${data.destinationCity}`,
      });
    }

    // Inserir hotel se informado
    if (data.hotelName) {
      await supabase.from("trip_confirmation_items").insert({
        trip_id: tripId,
        store_id: effectiveStoreId,
        item_type: "hotel",
        provider_name: data.hotelName,
        locator_code: `HTL-${Math.floor(10000 + Math.random() * 90000)}`,
        status: "confirmed",
        notes: `Hospedagem em ${data.destinationCity}`,
      });
    }

    // Criar voucher geral da viagem
    await supabase.from("tourism_vouchers").insert({
      trip_id: tripId,
      store_id: effectiveStoreId,
      public_token: voucherToken,
      voucher_code: voucherCode,
      voucher_type: "general",
      template: "a4-boarding",
      destination: data.destinationCity,
      flights,
      hotels,
      transfers: [],
      tours: [],
      insurance: {},
      passengers: [{ name: data.clientName, document: data.clientDocument || "" }],
      emergency_contacts: [...(data.clientWhatsapp ? [{ name: "", phone: data.clientWhatsapp }] : [])],
      observations: null,
    });

    return {
      success: true,
      trip: newTrip,
      tripId,
      tripNumber,
      voucherToken,
    };
  });

// ─── 9. Motor de OCR e Importação de Vouchers de Operadora (Gemini Real) ──────

export interface OperatorParsedVoucherDTO {
  operator_name: string;
  operator_contacts?: {
    commercial_phone?: string | null;
    emergency_phone?: string | null;
    support_email?: string | null;
    reservation_desk?: string | null;
  } | null;
  destination_city: string;
  trip_title: string;
  general_locator: string;
  travel_start_date?: string | null;
  travel_end_date?: string | null;
  client_name?: string | null;
  client_whatsapp?: string | null;
  client_document?: string | null;
  passengers: Array<{
    name: string;
    document_type?: string | null; // 'passport' | 'rg' | 'cnh' | 'cpf'
    document?: string | null;
    document_expiry?: string | null; // YYYY-MM-DD
    birth_date?: string | null;
    nationality?: string | null;
    seat?: string | null;
    is_lead?: boolean;
  }>;
  flights: Array<{
    airline: string;
    flight_number: string;
    origin: string;
    destination: string;
    date?: string | null;
    departure_time?: string | null;
    arrival_time?: string | null;
    locator?: string | null;
    baggage?: string | null;
    class?: string | null;
  }>;
  hotels: Array<{
    name: string;
    city: string;
    address?: string | null;
    checkin?: string | null;
    checkout?: string | null;
    room_type?: string | null;
    meal_plan?: string | null;
    confirmation?: string | null;
    nights?: number | null;
    phone?: string | null;
  }>;
  transfers: Array<{
    type?: string | null;
    origin?: string | null;
    destination?: string | null;
    date?: string | null;
    pickup_time?: string | null;
    supplier?: string | null;
    confirmation?: string | null;
    emergency_phone?: string | null;
  }>;
  tours: Array<{
    title: string;
    date?: string | null;
    duration?: string | null;
    location?: string | null;
    meeting_point?: string | null;
  }>;
  insurance?: {
    provider?: string | null;
    policy_number?: string | null;
    emergency_phone?: string | null;
    coverage_details?: string | null;
  } | null;
  tariff_rules?: {
    cancellation_deadline?: string | null;
    cancellation_penalty?: string | null;
    change_fee?: string | null;
    baggage_rules?: string | null;
    observations?: string | null;
  } | null;
  financial_details?: {
    total_amount_cents?: number;
    currency?: string;
    payment_method?: string | null;
    installments_count?: number;
    installments?: Array<{
      number: number;
      due_date?: string | null;
      amount_cents?: number;
      barcode?: string | null;
      instructions?: string | null;
    }>;
    receipt_info?: string | null;
  } | null;
  emergency_contacts: Array<{
    name: string;
    phone: string;
    role?: string | null;
  }>;
  observations?: string | null;
  raw_extracted_text?: string | null;
}

/**
 * 9.1 Analisa múltiplos documentos (PDFs, Imagens, Boletos) ou textos de vouchers emitidos por Operadoras via Gemini Multimodal AI
 */
export const parseOperatorVoucherAI = createServerFn({ method: "POST" })
  .validator(
    z.object({
      files: z
        .array(
          z.object({
            fileBase64: z.string().optional(),
            fileMime: z.string().optional(),
            fileName: z.string().optional(),
            rawText: z.string().optional(),
          })
        )
        .optional(),
      fileBase64: z.string().optional(),
      fileMime: z.string().optional(),
      fileName: z.string().optional(),
      rawText: z.string().optional(),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean; parsed: OperatorParsedVoucherDTO }> => {
    // Normalizar lista de arquivos recebidos (lote multi-documentos ou arquivo único)
    const fileList: Array<{
      fileBase64?: string;
      fileMime?: string;
      fileName?: string;
      rawText?: string;
    }> = [];

    if (data.files && data.files.length > 0) {
      fileList.push(...data.files);
    } else if (data.fileBase64 || data.rawText) {
      fileList.push({
        fileBase64: data.fileBase64,
        fileMime: data.fileMime,
        fileName: data.fileName,
        rawText: data.rawText,
      });
    }

    if (fileList.length === 0) {
      throw new Error("Nenhum arquivo ou texto de voucher foi enviado para análise.");
    }

    const systemInstruction = `Você é o Agente Especialista em OCR e Extração de Documentos de Turismo da Plataforma Waesy (Padrão BigTech).
Sua missão é ler com precisão cirúrgica comprovantes, vouchers e confirmações de reserva emitidos por OPERADORAS DE TURISMO (CVC, FRT, Orinter, Azul Viagens, LATAM Travel, Schultz, Trend, Abreu, Viagens Promo, Booking, Decolar, etc.), bem como documentos de passageiros (Passaporte, RG, CNH) e faturas/boletos/recibos financeiros.

DIRETRIZES FUNDAMENTAIS DE EXTRAÇÃO:
1. Extraia e consolide todos os documentos fornecidos (mesmo que venham de arquivos diferentes, como 1 voucher aéreo + 1 voucher hotel + 1 recibo + passaportes).
2. Extraia todos os trechos de voos (origem, destino IATA, cia, número, localizador/PNR, horários, franquia de bagagem).
3. Extraia todas as hospedagens (hotel, cidade, check-in, check-out, tipo de quarto, regime de alimentação, código de reserva do hotel, telefone).
4. Extraia transfers e passeios (receptivo, trecho, horários de pickup, pontos de encontro).
5. Extraia seguro viagem (seguradora, apólice, telefone de emergência 24h).
6. PASSAGEIROS & DOCUMENTOS:
   - Para cada passageiro, extraia: nome completo, tipo de documento ('passport', 'rg', 'cnh', 'cpf'), número do documento, DATA DE EXPIRAÇÃO/VALIDADE ('document_expiry' no formato estrito YYYY-MM-DD), data de nascimento (YYYY-MM-DD), nacionalidade e assento.
7. FINANCEIRO & FORMAS DE PAGAMENTO:
   - Extraia o valor total em centavos (total_amount_cents), moeda, forma de pagamento (ex: 'Cartão 10x sem juros', 'Boleto Faturado Operadora', 'Pix'), quantidade de parcelas e lista de parcelas (com vencimento, valor em centavos, código de barras/linha digitável se houver boleto).
8. REGRAS TARIFÁRIAS & CANCELAMENTO:
   - Extraia prazo limite de cancelamento sem multa (cancellation_deadline), multas de cancelamento/no-show, taxas de alteração (change_fee) e regras de bagagem inclusa.
9. CONTATOS DA OPERADORA:
   - Extraia contatos comerciais e plantão da operadora para o painel interno da agência (commercial_phone, emergency_phone, support_email, reservation_desk).
10. CENSURA B2B OBRIGATÓRIA NO VOUCHER DO CLIENTE:
   - Vouchers de operadoras contêm ramais internos de comissão e faturamento B2B. NUNCA inclua esses contatos da operadora nos 'emergency_contacts' do passageiro. Mantenha apenas o telefone direto do hotel, do receptivo local na cidade ou o plantão 24h de assistência médica.

Retorne ESTRITAMENTE um JSON minificado compatível com este schema (sem markdown \`\`\`json):
{
  "operator_name": "Nome da Operadora",
  "operator_contacts": {
    "commercial_phone": "+55...",
    "emergency_phone": "+55...",
    "support_email": "operadora@...",
    "reservation_desk": "Ramal 123"
  },
  "destination_city": "Cidade de Destino",
  "trip_title": "Título resumido da Viagem",
  "general_locator": "Localizador Geral ou Código da Reserva",
  "travel_start_date": "YYYY-MM-DD",
  "travel_end_date": "YYYY-MM-DD",
  "client_name": "Nome do Titular",
  "client_whatsapp": "WhatsApp do Cliente",
  "client_document": "CPF ou RG",
  "passengers": [
    {
      "name": "NOME COMPLETO",
      "document_type": "passport",
      "document": "AB123456",
      "document_expiry": "YYYY-MM-DD",
      "birth_date": "YYYY-MM-DD",
      "nationality": "Brasileira",
      "seat": "12A",
      "is_lead": true
    }
  ],
  "flights": [
    {
      "airline": "LATAM",
      "flight_number": "LA3042",
      "origin": "GRU",
      "destination": "CUN",
      "date": "YYYY-MM-DD",
      "departure_time": "08:30",
      "arrival_time": "14:20",
      "locator": "ABC123",
      "baggage": "1x 23kg despachada + 1x 10kg mão",
      "class": "Econômica"
    }
  ],
  "hotels": [
    {
      "name": "Nome do Hotel",
      "city": "Cidade",
      "address": "Endereço",
      "checkin": "YYYY-MM-DD",
      "checkout": "YYYY-MM-DD",
      "room_type": "Standard",
      "meal_plan": "All Inclusive",
      "confirmation": "HTL-9988",
      "nights": 7,
      "phone": "+55..."
    }
  ],
  "transfers": [
    {
      "type": "In/Out Regular",
      "origin": "Aeroporto",
      "destination": "Hotel",
      "date": "YYYY-MM-DD",
      "pickup_time": "15:00",
      "supplier": "Nome do Receptivo",
      "confirmation": "TRF-123",
      "emergency_phone": "+55..."
    }
  ],
  "tours": [
    {
      "title": "Nome do Passeio",
      "date": "YYYY-MM-DD",
      "duration": "4 horas",
      "location": "Local",
      "meeting_point": "Recepção do Hotel"
    }
  ],
  "insurance": {
    "provider": "Assist Card",
    "policy_number": "AC-123456",
    "emergency_phone": "0800...",
    "coverage_details": "Cobertura USD 60.000"
  },
  "tariff_rules": {
    "cancellation_deadline": "YYYY-MM-DD",
    "cancellation_penalty": "Cancelamento sem multa até 30 dias antes. Após, retenção de 20%",
    "change_fee": "Taxa de alteração R$ 350 + diferença tarifária",
    "baggage_rules": "1 volume de 23kg incluso por passageiro",
    "observations": "Tarifa não reembolsável após embarque"
  },
  "financial_details": {
    "total_amount_cents": 1250000,
    "currency": "BRL",
    "payment_method": "Cartão 10x sem juros",
    "installments_count": 10,
    "installments": [
      {
        "number": 1,
        "due_date": "YYYY-MM-DD",
        "amount_cents": 125000,
        "barcode": "34191...",
        "instructions": "Pagável em qualquer agência até o vencimento"
      }
    ],
    "receipt_info": "Recibo nº 998273 quitado junto à operadora"
  },
  "emergency_contacts": [
    { "name": "Receptivo Local", "phone": "+55...", "role": "Receptivo na Cidade" }
  ],
  "observations": "Orientações gerais de embarque."
}`;

    const promptText = `Por favor, analise as informações contidas no(s) documento(s) anexado(s) (${fileList.map((f) => f.fileName || "documento").join(", ")}).
${fileList
  .filter((f) => f.rawText)
  .map((f, i) => `\n--- TEXTO BRUTO ANEXO ${i + 1} (${f.fileName || "Voucher"}) ---\n${f.rawText}\n--- FIM ---`)
  .join("\n")}
Extraia, consolide e estruture todas as informações no formato JSON especificado.`;

    const imageFiles = fileList
      .filter((f) => f.fileBase64 && f.fileMime)
      .map((f) => ({ mimeType: f.fileMime!, base64: f.fileBase64! }));

    const allRawText = fileList.map((f) => f.rawText || "").filter(Boolean).join("\n") || "";

    try {
      const aiRes = await executeUnifiedAiCall({
        systemPrompt: systemInstruction,
        userPrompt: promptText,
        images: imageFiles,
        preferredProvider: "gemini",
        responseFormat: "json_object",
        temperature: 0.1,
      });

      if (aiRes?.parsedJson) {
        return {
          success: true,
          parsed: {
            ...aiRes.parsedJson,
            raw_extracted_text: `Processado com sucesso via IA (${aiRes.provider}).`,
          },
        };
      }
    } catch (aiErr: any) {
      console.warn("[parseOperatorVoucherAI] OCR não concluído; nenhum voucher sintético será retornado:", aiErr?.message);
      throw new Error("Não foi possível extrair o voucher com segurança. Nenhum dado foi criado.");
    }

    throw new Error("A extração do voucher não retornou dados estruturados. Nenhum dado foi criado.");
  });

/**
 * 9.2 Aplica o voucher da operadora analisado na viagem do cliente,
 * centralizando todos os dados em tourism_trips, tourism_vouchers e trip_confirmation_items.
 */
function buildVoucherApplyIdempotencyKey(tripId: string | undefined, parsedData: OperatorParsedVoucherDTO): string {
  const serialized = JSON.stringify(parsedData);
  if (serialized.length > 600_000) {
    throw new Error("Os dados estruturados do voucher excedem o limite permitido.");
  }
  const digest = createHash("sha256").update(serialized).digest("hex");
  return `operator-voucher:${tripId || "new"}:${digest}`;
}

/**
 * 9.2 Aplica voucher por uma única RPC transacional. O BFF não executa writes
 * sequenciais e nunca aceita storeId como autoridade de tenant.
 */
export const applyParsedVoucherToTrip = createServerFn({ method: "POST" })
  .validator(
    z.object({
      tripId: z.string().uuid().optional(),
      storeId: z.string().uuid().optional(),
      ingestionId: z.string().uuid().optional(),
      idempotencyKey: z.string().min(8).max(240).optional(),
      parsedData: z.record(z.string(), z.any()),
    })
  )
  .handler(async ({ data }): Promise<{
    success: boolean;
    replayed: boolean;
    tripId: string;
    tripNumber: string | null;
    voucherId: string | null;
    voucherToken: string;
    voucherUrl: string;
  }> => {
    const identity = await requireStaff();
    if (data.storeId && data.storeId !== identity.store_id) {
      throw new Error("A agência informada não corresponde à identidade autenticada.");
    }
    const parsed = data.parsedData as OperatorParsedVoucherDTO;
    const idempotencyKey = data.idempotencyKey || buildVoucherApplyIdempotencyKey(data.tripId, parsed);
    const supabase = getServerClient();
    const { data: result, error } = await supabase.rpc("apply_operator_voucher_atomic", {
      p_store_id: identity.store_id,
      p_actor_profile_id: identity.id,
      p_trip_id: data.tripId || null,
      p_ingestion_id: data.ingestionId || null,
      p_parsed_data: data.ingestionId ? null : parsed,
      p_idempotency_key: idempotencyKey,
    });
    if (error || !result) {
      throw new Error(`Voucher não aplicado: ${error?.message || "resposta vazia"}`);
    }
    return {
      success: result.success === true,
      replayed: result.replayed === true,
      tripId: String(result.trip_id),
      tripNumber: result.trip_number ? String(result.trip_number) : null,
      voucherId: result.voucher_id ? String(result.voucher_id) : null,
      voucherToken: String(result.voucher_token || ""),
      voucherUrl: String(result.voucher_url || ""),
    };
  });

/**
 * 10. Listagem das Viagens e Pacotes da Agência para o Painel do Viajante (Minha Conta)
 * Centraliza pacotes fechados, aéreos, hotéis e vouchers emitidos pela agência.
 */
export const listCustomerAgencyTrips = createServerFn({ method: "GET" }).handler(
  async (): Promise<any[]> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    let query = supabase
      .from("tourism_trips")
      .select(`
        id, store_id, trip_number, title, destination_city,
        travel_start_date, travel_end_date, adults_count, children_count,
        currency, total_cents, status, client_name, client_whatsapp,
        client_email, client_document, flights, hotels, transfers, tours,
        insurance, notes, created_at,
        tourism_vouchers ( id, public_token, voucher_code, voucher_type )
      `)
      .order("created_at", { ascending: false });

    // Se o cliente estiver logado, filtra pelo seu id
    if (identity?.id) {
      query = query.or(`customer_id.eq.${identity.id},client_id.eq.${identity.id}`);
    } else {
      // Caso não haja filtro restrito de sessão do cliente, retorna as viagens recentes da loja ativa
      if (identity?.store_id) {
        query = query.eq("store_id", identity.store_id).limit(10);
      } else {
        query = query.limit(10);
      }
    }

    const { data, error } = await query;
    if (error) {
      console.warn("[listCustomerAgencyTrips] Falha ao carregar viagens do cliente:", error.message);
      return [];
    }

    return data || [];
  }
);

/**
 * 11. Salvar / Atualizar Passageiro da Viagem (trip_passengers)
 */
export const saveTripPassenger = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      tripId: z.string().uuid(),
      fullName: z.string().min(2, "Nome completo obrigatório"),
      documentType: z.string().optional().nullable(),
      document: z.string().optional().nullable(),
      documentExpiry: z.string().optional().nullable(),
      nationality: z.string().optional().nullable(),
      birthDate: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      seatNumber: z.string().optional().nullable(),
      isLeadPassenger: z.boolean().default(false),
      notes: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean; id: string }> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    const payload = {
      trip_id: data.tripId,
      full_name: data.fullName.trim(),
      document_type: data.documentType || "rg",
      document: data.document || null,
      document_expiry: data.documentExpiry || null,
      nationality: data.nationality || "Brasileira",
      birth_date: data.birthDate || null,
      email: data.email || null,
      phone: data.phone || null,
      seat_number: data.seatNumber || null,
      is_lead_passenger: data.isLeadPassenger,
      notes: data.notes || null,
    };

    if (data.id) {
      const { error } = await supabase
        .from("trip_passengers")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error("Erro ao atualizar passageiro: " + error.message);
      return { success: true, id: data.id };
    } else {
      let storeId = identity?.store_id;
      if (!storeId) {
        const { data: trip } = await supabase.from("tourism_trips").select("store_id").eq("id", data.tripId).maybeSingle();
        storeId = trip?.store_id;
      }
      const { data: created, error } = await supabase
        .from("trip_passengers")
        .insert({
          store_id: storeId,
          ...payload,
        })
        .select("id")
        .single();
      if (error || !created) throw new Error("Erro ao cadastrar passageiro: " + (error?.message || ""));
      return { success: true, id: created.id };
    }
  });

/**
 * 12. Excluir Passageiro da Viagem
 */
export const deleteTripPassenger = createServerFn({ method: "POST" })
  .validator(z.object({ passengerId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const supabase = getServerClient();
    const { error } = await supabase.from("trip_passengers").delete().eq("id", data.passengerId);
    if (error) throw new Error("Erro ao excluir passageiro: " + error.message);
    return { success: true };
  });

// ─── 13. Ficha Segura do Viajante (Public Form Context & Submission) ──────────

export interface TravelerFormContextDTO {
  success: boolean;
  tripTitle: string;
  destination: string;
  departureDate: string | null;
  returnDate: string | null;
  agencyName: string;
  agencyLogo: string | null;
  agencyPhone: string | null;
  tokenType: "trip" | "proposal" | "voucher" | "passenger" | "generic" | "contract";
  passengerData?: {
    fullName?: string;
    cpf?: string;
    phone?: string;
    email?: string;
  } | null;
}

export const getTravelerFormContext = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }): Promise<TravelerFormContextDTO> => {
    const supabase = getAnonServerClient();
    const token = data.token.trim();

    if (token.startsWith("vch_")) {
      const projection = await readPublicVoucherProjection(supabase, token);
      if (projection) {
        const passenger = projection.voucher.passengers[0];
        return {
          success: true,
          tripTitle: projection.trip.title || "Viagem turística",
          destination: projection.voucher.destination || projection.trip.destination_city || "Destino Turístico",
          departureDate: projection.trip.travel_start_date || null,
          returnDate: projection.trip.travel_end_date || null,
          agencyName: projection.store.name,
          agencyLogo: projection.store.logo_url || null,
          agencyPhone: projection.store.whatsapp_phone || null,
          tokenType: "voucher",
          passengerData: passenger
            ? { fullName: passenger.name, cpf: passenger.document || undefined }
            : null,
        };
      }
    }

    try {
      // 0. Tentar buscar em travel_contracts (por public_token ou id)
      const { data: contract } = await supabase
        .from("travel_contracts")
        .select("id, contract_title, destination, package_summary, total_value_cents, travel_start_date, travel_end_date, client_name, client_document, client_email, client_phone, store_id, stores(name, logo_url, settings)")
        .or(`public_token.eq.${token},id.eq.${token.length === 36 ? token : '00000000-0000-0000-0000-000000000000'}`)
        .maybeSingle();

      if (contract) {
        const store = (contract as any).stores || {};
        const settings = store.settings || {};
        return {
          success: true,
          tripTitle: contract.contract_title || `Contrato de Viagem: ${contract.destination || "Serviços Turísticos"}`,
          destination: contract.destination || "Destino Turístico",
          departureDate: contract.travel_start_date || null,
          returnDate: contract.travel_end_date || null,
          agencyName: store.name || "",
          agencyLogo: store.logo_url || null,
          agencyPhone: settings.whatsapp_phone || settings.phone || null,
          tokenType: "contract",
          passengerData: {
            fullName: contract.client_name || undefined,
            cpf: contract.client_document || undefined,
            email: contract.client_email || undefined,
            phone: contract.client_phone || undefined,
          },
        };
      }

      // 1. Tentar buscar em tourism_trips (por id ou trip_number)
      const { data: trip } = await supabase
        .from("tourism_trips")
        .select("id, title, destination_city, travel_start_date, travel_end_date, store_id, stores(name, logo_url, settings)")
        .or(`id.eq.${token.length === 36 ? token : '00000000-0000-0000-0000-000000000000'},trip_number.eq.${token}`)
        .maybeSingle();

      if (trip) {
        const store = (trip as any).stores || {};
        const settings = store.settings || {};
        return {
          success: true,
          tripTitle: trip.title || `Viagem para ${trip.destination_city}`,
          destination: trip.destination_city || "Destino Turístico",
          departureDate: trip.travel_start_date || null,
          returnDate: trip.travel_end_date || null,
          agencyName: store.name || "",
          agencyLogo: store.logo_url || null,
          agencyPhone: settings.whatsapp_phone || settings.phone || null,
          tokenType: "trip",
        };
      }

      // 2. Tentar buscar em tourism_vouchers (por public_token ou voucher_code)
      const { data: voucher } = await supabase
        .from("tourism_vouchers")
        .select("id, public_token, voucher_code, trip_id, tourism_trips(title, destination_city, travel_start_date, travel_end_date, stores(name, logo_url, settings))")
        .or(`public_token.eq.${token},voucher_code.eq.${token}`)
        .maybeSingle();

      if (voucher && voucher.tourism_trips) {
        const vTrip = voucher.tourism_trips as any;
        const store = vTrip.stores || {};
        const settings = store.settings || {};
        return {
          success: true,
          tripTitle: vTrip.title || `Viagem para ${vTrip.destination_city}`,
          destination: vTrip.destination_city || "Destino Turístico",
          departureDate: vTrip.travel_start_date || null,
          returnDate: vTrip.travel_end_date || null,
          agencyName: store.name || "",
          agencyLogo: store.logo_url || null,
          agencyPhone: settings.whatsapp_phone || settings.phone || null,
          tokenType: "voucher",
        };
      }

      // 3. Tentar buscar em travel_proposals (por id ou conditions com public_token)
      const { data: proposal } = await supabase
        .from("travel_proposals")
        .select("id, title, destination, start_date, end_date, client_name, client_email, client_phone, stores(name, logo_url, settings)")
        .or(`id.eq.${token.length === 36 ? token : '00000000-0000-0000-0000-000000000000'},conditions.ilike.%"public_token":"${token}"%`)
        .maybeSingle();

      if (proposal) {
        const store = (proposal as any).stores || {};
        const settings = store.settings || {};
        return {
          success: true,
          tripTitle: proposal.title || `Proposta para ${proposal.destination}`,
          destination: proposal.destination || "Destino Turístico",
          departureDate: proposal.start_date || null,
          returnDate: proposal.end_date || null,
          agencyName: store.name || "",
          agencyLogo: store.logo_url || null,
          agencyPhone: settings.whatsapp_phone || settings.phone || null,
          tokenType: "proposal",
          passengerData: {
            fullName: proposal.client_name || undefined,
            email: proposal.client_email || undefined,
            phone: proposal.client_phone || undefined,
          },
        };
      }

      // 4. Tentar buscar em trip_passengers diretamente se o token for UUID
      if (token.length === 36) {
        const { data: passenger } = await supabase
          .from("trip_passengers")
          .select("id, full_name, document, phone, email, trip_id, tourism_trips(title, destination_city, travel_start_date, travel_end_date, stores(name, logo_url, settings))")
          .eq("id", token)
          .maybeSingle();

        if (passenger && passenger.tourism_trips) {
          const pTrip = passenger.tourism_trips as any;
          const store = pTrip.stores || {};
          const settings = store.settings || {};
          return {
            success: true,
            tripTitle: pTrip.title || `Viagem para ${pTrip.destination_city}`,
            destination: pTrip.destination_city || "Destino Turístico",
            departureDate: pTrip.travel_start_date || null,
            returnDate: pTrip.travel_end_date || null,
            agencyName: store.name || "",
            agencyLogo: store.logo_url || null,
            agencyPhone: settings.whatsapp_phone || settings.phone || null,
            tokenType: "passenger",
            passengerData: {
              fullName: passenger.full_name,
              cpf: passenger.document || undefined,
              phone: passenger.phone || undefined,
              email: passenger.email || undefined,
            },
          };
        }
      }
    } catch (err) {
      console.warn("[getTravelerFormContext] Lookup notice:", err);
    }

    // 5. Fallback padrão seguro para tokens genéricos
    return {
      success: true,
      tripTitle: "Ficha do Viajante",
      destination: "Destino da Viagem",
      departureDate: null,
      returnDate: null,
      agencyName: "",
      agencyLogo: null,
      agencyPhone: null,
      tokenType: "generic",
    };
  });

export const submitTravelerRegistrationForm = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().min(1),
      fullName: z.string().min(2, "Nome completo obrigatório"),
      cpf: z.string().min(11, "CPF obrigatório"),
      rg: z.string().optional().nullable(),
      birthDate: z.string().optional().nullable(),
      gender: z.string().optional().nullable(),
      passportNumber: z.string().optional().nullable(),
      passportExpiry: z.string().optional().nullable(),
      phone: z.string().min(8, "Telefone obrigatório"),
      email: z.string().email("E-mail inválido").optional().nullable(),
      emergencyName: z.string().optional().nullable(),
      emergencyPhone: z.string().optional().nullable(),
      seatPreference: z.string().optional().nullable(),
      specialNeeds: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean; passengerId: string; message: string }> => {
    const supabase = getServerClient();
    const token = data.token.trim();

    // 1. Resolver storeId e tripId a partir do token
    let tripId: string | null = null;
    let storeId: string | null = null;

    // 0. Verificar se o token pertence a travel_contracts (Assinatura Eletrônica Forense)
    const { data: contract } = await supabase
      .from("travel_contracts")
      .select("id, store_id, lead_id, customer_id, contract_title, destination, total_value_cents")
      .or(`public_token.eq.${token},id.eq.${token.length === 36 ? token : '00000000-0000-0000-0000-000000000000'}`)
      .maybeSingle();

    if (contract) {
      storeId = contract.store_id;

      // Atualiza o contrato para assinado eletronicamente
      await supabase
        .from("travel_contracts")
        .update({
          status: "signed",
          signed_at: new Date().toISOString(),
          client_name: data.fullName.trim(),
          client_document: data.cpf.replace(/\D/g, ""),
          client_phone: data.phone.trim(),
          client_email: data.email?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contract.id);

      // Registra na cadeia forense
      await supabase.from("contract_audit_chain").insert({
        contract_id: contract.id,
        store_id: contract.store_id,
        action: "SIGNED",
        actor_profile: null,
        payload_hash: token,
        metadata: {
          signer_name: data.fullName.trim(),
          signer_cpf: data.cpf.replace(/\D/g, ""),
          signed_at: new Date().toISOString(),
          ip_verified: true,
        },
      }).then(() => null, () => null);

      // Se houver lead_id vinculado, atualiza status para 'won' (Fechado/Ganho)
      if (contract.lead_id) {
        await supabase
          .from("leads_crm")
          .update({
            status: "won",
            closed_at: new Date().toISOString(),
            last_contacted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", contract.lead_id)
          .then(() => null, () => null);

        await supabase.from("lead_activities").insert({
          lead_id: contract.lead_id,
          store_id: contract.store_id,
          type: "contract_signed",
          content: `Contrato assinado eletronicamente pelo viajante ${data.fullName.trim()} (CPF ${data.cpf.replace(/\D/g, "")}). Negócio fechado com sucesso!`,
          metadata: { contract_id: contract.id, token },
        }).then(() => null, () => null);
      }
    }

    // A. Buscar por trip
    const { data: trip } = await supabase
      .from("tourism_trips")
      .select("id, store_id")
      .or(`id.eq.${token.length === 36 ? token : '00000000-0000-0000-0000-000000000000'},trip_number.eq.${token}`)
      .maybeSingle();

    if (trip) {
      tripId = trip.id;
      storeId = trip.store_id;
    }

    // B. Se não achou, buscar por voucher
    if (!tripId) {
      const { data: vch } = await supabase
        .from("tourism_vouchers")
        .select("trip_id, store_id")
        .or(`public_token.eq.${token},voucher_code.eq.${token}`)
        .maybeSingle();
      if (vch) {
        tripId = vch.trip_id;
        storeId = vch.store_id;
      }
    }

    // C. Se não achou, buscar por proposta
    if (!tripId) {
      const { data: prop } = await supabase
        .from("travel_proposals")
        .select("id, store_id, agency_id")
        .or(`id.eq.${token.length === 36 ? token : '00000000-0000-0000-0000-000000000000'},conditions.ilike.%"public_token":"${token}"%`)
        .maybeSingle();
      if (prop) {
        storeId = prop.store_id || prop.agency_id;
      }
    }

    // D. Sem vínculo real não há tenant válido para persistir a viagem.
    if (!storeId) throw new Error("Não foi possível identificar a loja da viagem; nenhum registro foi criado.");

    // E. Se não achou tripId, criar viagem correspondente
    if (!tripId) {
      const { data: createdTrip } = await supabase
        .from("tourism_trips")
        .insert({
          store_id: storeId,
          title: `Viagem — ${data.fullName}`,
          destination_city: null,
          status: "pending",
          client_name: data.fullName,
          client_phone: data.phone,
          client_email: data.email || null,
          total_cents: 0,
        })
        .select("id")
        .single();
      tripId = createdTrip?.id || null;
    }

    if (!tripId) throw new Error("Não foi possível associar a viagem.");

    // 2. Persistir passageiro em trip_passengers
    const cleanCpf = data.cpf.replace(/\D/g, "");
    const passengerPayload = {
      trip_id: tripId,
      store_id: storeId,
      full_name: data.fullName.trim(),
      document_type: "cpf",
      document: cleanCpf,
      document_expiry: data.passportExpiry || null,
      birth_date: data.birthDate || null,
      nationality: "Brasileira",
      email: data.email || null,
      phone: data.phone || null,
      seat_number: data.seatPreference || null,
      special_needs: data.specialNeeds || null,
      notes: JSON.stringify({
        rg: data.rg || null,
        gender: data.gender || null,
        passport_number: data.passportNumber || null,
        emergency_name: data.emergencyName || null,
        emergency_phone: data.emergencyPhone || null,
        submitted_via_token: token,
      }),
    };

    const { data: existingPassenger } = await supabase
      .from("trip_passengers")
      .select("id")
      .eq("trip_id", tripId)
      .eq("document", cleanCpf)
      .maybeSingle();

    let passengerId: string;
    if (existingPassenger) {
      const { error: updErr } = await supabase
        .from("trip_passengers")
        .update(passengerPayload)
        .eq("id", existingPassenger.id);
      if (updErr) throw updErr;
      passengerId = existingPassenger.id;
    } else {
      const { data: ins, error: insErr } = await supabase
        .from("trip_passengers")
        .insert(passengerPayload)
        .select("id")
        .single();
      if (insErr || !ins) throw insErr || new Error("Falha ao cadastrar passageiro.");
      passengerId = ins.id;
    }

    // 3. Sincronizar na carteira CRM (customers_crm)
    try {
      const cleanPhone = data.phone.replace(/\D/g, "");
      const { data: existingCustomer } = await supabase
        .from("customers_crm")
        .select("id")
        .eq("store_id", storeId)
        .or(`document.eq.${cleanCpf},phone.eq.${cleanPhone}`)
        .maybeSingle();

      if (!existingCustomer) {
        await supabase.from("customers_crm").insert({
          store_id: storeId,
          full_name: data.fullName.trim(),
          document: cleanCpf,
          email: data.email || null,
          phone: data.phone || null,
          channel: "traveler_form",
          kind: "individual",
          notes: `Cadastrado via Ficha Segura do Viajante (Token: ${token})`,
        });
      }
    } catch (crmErr) {
      console.warn("[submitTravelerRegistrationForm] CRM sync notice:", crmErr);
    }

    return {
      success: true,
      passengerId,
      message: "Ficha cadastral persistida com sucesso!",
    };
  });

// ─── 14. Gestão Financeira 3-em-1 (Boletos, Financiamento e Comissões) ───────

export const SaveTripFinancialInputSchema = z.object({
  tripId: z.string().uuid(),
  grossPriceCents: z.number().int().nonnegative().optional(),
  operatorNetCents: z.number().int().nonnegative().optional(),
  agencyCommissionCents: z.number().int().nonnegative().optional(),
  agentCommissionCents: z.number().int().nonnegative().optional(),
  agentCommissionPercent: z.number().min(0).max(100).optional(),
  operatorName: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  installmentsCount: z.number().int().min(1).max(36).optional(),
  externalFinanceUrl: z.string().optional().nullable(),
  installments: z.array(z.object({
    id: z.string().optional(),
    installment_number: z.number().int(),
    total_installments: z.number().int(),
    due_date: z.string(),
    amount_cents: z.number().int(),
    digitable_line: z.string().optional(),
    barcode: z.string().optional(),
    bank_name: z.string().optional(),
    pdf_url: z.string().optional(),
    status: z.enum(["pending", "paid", "overdue"]).default("pending"),
    paid_at: z.string().optional().nullable(),
  })).optional(),
});

export const saveTripFinancialDetails = createServerFn({ method: "POST" })
  .validator(SaveTripFinancialInputSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    const { data: trip, error: fetchErr } = await supabase
      .from("tourism_trips")
      .select("id, store_id, financial_details, total_cents, operator_name, payment_method, installments_count")
      .eq("id", data.tripId)
      .single();

    if (fetchErr || !trip) {
      throw new Error("Viagem não encontrada.");
    }

    const currentDetails = (trip.financial_details || {}) as Record<string, any>;
    const updatedDetails = {
      ...currentDetails,
      gross_price_cents: data.grossPriceCents ?? currentDetails.gross_price_cents ?? trip.total_cents,
      operator_net_cents: data.operatorNetCents ?? currentDetails.operator_net_cents ?? 0,
      agency_commission_cents: data.agencyCommissionCents ?? ((data.grossPriceCents ?? trip.total_cents) - (data.operatorNetCents ?? 0)),
      agent_commission_cents: data.agentCommissionCents ?? currentDetails.agent_commission_cents ?? 0,
      agent_commission_percent: data.agentCommissionPercent ?? currentDetails.agent_commission_percent ?? 0,
      operator_name: data.operatorName ?? trip.operator_name ?? currentDetails.operator_name,
      payment_method: data.paymentMethod ?? trip.payment_method ?? currentDetails.payment_method,
      installments_count: data.installmentsCount ?? trip.installments_count ?? currentDetails.installments_count,
      external_finance_url: data.externalFinanceUrl ?? currentDetails.external_finance_url,
      installments: data.installments ?? currentDetails.installments ?? [],
      updated_at: new Date().toISOString(),
    };

    const updatePayload: Record<string, any> = {
      financial_details: updatedDetails,
      total_cents: data.grossPriceCents ?? trip.total_cents,
      operator_name: data.operatorName ?? trip.operator_name,
      payment_method: data.paymentMethod ?? trip.payment_method,
      installments_count: data.installmentsCount ?? trip.installments_count,
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await supabase
      .from("tourism_trips")
      .update(updatePayload)
      .eq("id", data.tripId);

    if (updateErr) {
      throw new Error(`Erro ao salvar dados financeiros da viagem: ${updateErr.message}`);
    }

    return { success: true, message: "Dados financeiros e boletos atualizados com sucesso!" };
  });

// ---------------------------------------------------------------------------
// PUBLIC VERIFICATION: verifyTravelCertificate (Zero Direct DB in React)
// ---------------------------------------------------------------------------
export const verifyTravelCertificate = createServerFn({ method: "GET" })
  .validator(z.object({ serial: z.string().min(1) }))
  .handler(async ({ data: { serial } }) => {
    const supabase = getServerClient();
    try {
      const { data, error } = await supabase.rpc("verify_travel_certificate", {
        _serial: serial.trim(),
      });

      if (error) {
        console.warn("[travel-lifecycle] Erro no rpc verify_travel_certificate:", error);
        return { success: false, data: null, error: error.message };
      }

      return {
        success: true,
        data: Array.isArray(data) && data.length > 0 ? data[0] : null,
        error: null,
      };
    } catch (err: any) {
      console.warn("[travel-lifecycle] Exceção em verifyTravelCertificate:", err);
      return {
        success: false,
        data: null,
        error: err?.message || "Erro ao consultar a certidão de autenticidade.",
      };
    }
  });
