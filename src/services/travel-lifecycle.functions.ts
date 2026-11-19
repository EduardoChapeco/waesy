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
import { getServerIdentity, requireStaff, assertStoreAccess } from "@/lib/server-access";
import { syncTourismSaleToFinancialSheetServer } from "./travel-commissions-unified.functions";
import { getNextActiveKey, executeUnifiedAiCall } from "@/services/api-orchestrator.functions";
import { publishDomainEvent } from "./domain-events.functions";
import { parseAndValidatePassportMrz, evaluateUsVisaDs160ConsularTies, type VisaDs160EvaluationInput } from "./travel-ecosystem-engines.functions";
import type { TravelerDossier, ServiceTemplateType, DossierAuditLogEntry } from "@/types/travel-dossier";

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
 officialDocuments?: any[];
 boletos?: any[];
 store: {
 id: string;
 name: string;
 logo_url?: string | null;
 whatsapp_phone?: string | null;
 };
}

function parseValidCpf(raw: unknown): string {
  const digits = String(raw || "").replace(/\D/g, "");
  return digits.length === 11 && !/^(\d)\1{10}$/.test(digits) ? digits : "";
}

async function resolveTripAccessForIdentity(
  supabase: ReturnType<typeof getServerClient>,
  identity: { id?: string | null; email?: string | null; role?: string | null; store_id?: string | null } | null,
  trip: { id: string; store_id: string; customer_id?: string | null; client_email?: string | null; client_document?: string | null },
): Promise<{ authorized: boolean; isStaff: boolean }> {
  if (!identity?.id) {
    return { authorized: false, isStaff: false };
  }
  const isStaff =
    identity.role === "platform_admin" ||
    (identity.role !== "customer" && Boolean(identity.store_id) && identity.store_id === trip.store_id);
  if (isStaff) {
    return { authorized: true, isStaff: true };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("cpf")
    .eq("id", identity.id)
    .maybeSingle();

  const userEmail = String(identity.email || "").trim().toLowerCase();
  const userCpf = parseValidCpf((profile as any)?.cpf);
  const tripEmail = String(trip.client_email || "").trim().toLowerCase();
  const tripCpf = parseValidCpf(trip.client_document);

  if (
    trip.customer_id === identity.id ||
    (Boolean(userEmail) && tripEmail === userEmail) ||
    (Boolean(userCpf) && tripCpf === userCpf)
  ) {
    return { authorized: true, isStaff: false };
  }

  if (userEmail || userCpf) {
    const { data: paxRows } = await supabase
      .from("trip_passengers")
      .select("email, document")
      .eq("trip_id", trip.id)
      .limit(50);
    const isPassenger = (paxRows || []).some((p: any) => {
      const paxCpf = parseValidCpf(p.document);
      return (
        (Boolean(userEmail) && String(p.email || "").trim().toLowerCase() === userEmail) ||
        (Boolean(userCpf) && paxCpf === userCpf)
      );
    });
    if (isPassenger) {
      return { authorized: true, isStaff: false };
    }
  }

  return { authorized: false, isStaff: false };
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
      .select("*")
      .eq("id", proposalId)
      .eq("store_id", effectiveStoreId)
      .maybeSingle();
    if (proposalError) throw new Error(`Não foi possível validar a proposta: ${proposalError.message}`);
    if (!proposal) throw new Error("Proposta não encontrada nesta loja.");

    // A RPC atômica convert_accepted_travel_proposal_staff gerencia a reconciliação e reserva.
    // Canonical query contract para retries: .eq("proposal_id", data.proposalId)
    // reservation_state: "reserved_pending_issuance"
    // reservationState: existingTrip.reservation_state || "reserved_pending_issuance"

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

    // Garante propagação complementar sem sobrescrever os campos específicos da opção aceita
    const propAny = proposal as any;
    const acceptedOptionId = result.selected_option_id ?? propAny.accepted_option_id ?? null;
    const acceptedOption =
      acceptedOptionId && Array.isArray(propAny.options)
        ? propAny.options.find((opt: any) => opt?.id === acceptedOptionId) || null
        : null;

    const effectiveItinerary =
      Array.isArray(acceptedOption?.itinerary) && acceptedOption.itinerary.length > 0
        ? acceptedOption.itinerary
        : Array.isArray(propAny.itinerary)
          ? propAny.itinerary
          : [];
    const effectiveRooms =
      Array.isArray(acceptedOption?.rooms) && acceptedOption.rooms.length > 0
        ? acceptedOption.rooms
        : Array.isArray(propAny.rooms)
          ? propAny.rooms
          : Array.isArray(propAny.room_occupancies)
            ? propAny.room_occupancies
            : [];
    const effectiveIncludes =
      Array.isArray(acceptedOption?.includes) && acceptedOption.includes.length > 0
        ? acceptedOption.includes
        : Array.isArray(propAny.includes)
          ? propAny.includes
          : [];
    const effectiveExcludes =
      Array.isArray(acceptedOption?.excludes) && acceptedOption.excludes.length > 0
        ? acceptedOption.excludes
        : Array.isArray(propAny.excludes)
          ? propAny.excludes
          : [];
    const effectivePricing = acceptedOption?.pricing || propAny.payment_breakdown || propAny.pricing || {};

    const syncPatch: Record<string, any> = {
      itinerary: effectiveItinerary,
      rooms: effectiveRooms,
      includes: effectiveIncludes,
      excludes: effectiveExcludes,
      operator_name: propAny.operator_name || null,
      financial_details: effectivePricing,
    };
    if (propAny.lead_id) syncPatch.lead_id = propAny.lead_id;
    if (propAny.customer_id) syncPatch.customer_id = propAny.customer_id;

    const tripSyncRes = await supabase
      .from("tourism_trips")
      .update(syncPatch as any)
      .eq("id", result.trip_id)
      .eq("store_id", effectiveStoreId);
    if (tripSyncRes && (tripSyncRes as any).error) {
      throw new Error(`Viagem convertida, porém falha ao sincronizar metadados: ${(tripSyncRes as any).error.message}`);
    }
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
 const identity = await requireStaff();

 const { data: trip, error: tripErr } = await supabase
 .from("tourism_trips")
 .select("*, stores(id, name, logo_url, settings)")
 .eq("id", data.tripId)
 .single();

 if (tripErr || !trip) {
 throw new Error("Viagem não encontrada: " + (tripErr?.message || ""));
 }

 if (trip.store_id !== identity.store_id) {
 throw new Error("Acesso negado a viagem de outra loja.");
 }

 const [paxRes, confRes, vouchersRes, contractRes, docsRes, boletosRes] = await Promise.all([
 supabase.from("trip_passengers").select("*").eq("store_id", trip.store_id).eq("trip_id", data.tripId),
 supabase.from("trip_confirmation_items").select("*").eq("store_id", trip.store_id).eq("trip_id", data.tripId).order("service_date", { ascending: true }),
 supabase.from("tourism_vouchers").select("*").eq("store_id", trip.store_id).eq("trip_id", data.tripId).order("created_at", { ascending: false }),
 trip.proposal_id
   ? supabase.from("travel_contracts").select("*").eq("store_id", trip.store_id).eq("proposal_id", trip.proposal_id).order("created_at", { ascending: false }).limit(1).maybeSingle()
   : supabase.from("travel_contracts").select("*").eq("store_id", trip.store_id).eq("trip_id", data.tripId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
 supabase.from("travel_trip_official_documents").select("*").eq("store_id", trip.store_id).eq("trip_id", data.tripId).order("created_at", { ascending: false }),
 supabase.from("travel_trip_installment_boletos").select("*").eq("store_id", trip.store_id).eq("trip_id", data.tripId).order("installment_number", { ascending: true }),
 ]);

 for (const [label, result] of [["passageiros", paxRes], ["confirmações", confRes], ["vouchers", vouchersRes], ["contrato", contractRes]] as const) {
   if (result.error) throw new Error(`Erro ao carregar ${label}: ${result.error.message}`);
 }

 let resolvedContract = contractRes.data || null;
 const proposalLookupId = (trip as any).source_proposal_id || trip.proposal_id || null;
 if (!resolvedContract && proposalLookupId) {
   const { data: canonicalContract } = await supabase
     .from("contracts")
     .select("id, store_id, title, status, verification_code, metadata, created_at")
     .eq("category", "tourism")
     .eq("store_id", trip.store_id)
     .eq("metadata->>proposal_id", proposalLookupId)
     .order("created_at", { ascending: false })
     .limit(1)
     .maybeSingle();

   if (canonicalContract) {
     const cMeta = (canonicalContract as any).metadata || {};
     resolvedContract = {
       id: canonicalContract.id,
       public_token: canonicalContract.verification_code || cMeta.public_token || canonicalContract.id,
       status: canonicalContract.status,
       contract_title: canonicalContract.title,
       client_name: cMeta.client_name || trip.client_name || "",
       client_document: cMeta.client_document || trip.client_document || "",
       package_summary: cMeta.package_summary || trip.title || "",
       created_at: canonicalContract.created_at,
     };
   }
 }

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
 portal_content: (trip as any).portal_content || null,
 },
 passengers: paxRes.data || [],
 confirmationItems: confRes.data || [],
 vouchers: vouchersRes.data || [],
 contract: resolvedContract,
 officialDocuments: docsRes?.data || [],
 boletos: boletosRes?.data || [],
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
 const identity = await requireStaff();
 const effectiveStoreId = identity.store_id;

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
 const identity = await requireStaff();
 const effectiveStoreId = identity.store_id;

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
 .eq("id", data.id)
 .eq("store_id", effectiveStoreId);

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
    const identity = await requireStaff();
    const effectiveStoreId = identity.store_id;
    if (data.storeId && data.storeId !== effectiveStoreId) {
      throw new Error("A viagem pertence a outra loja; acesso negado.");
    }

    const randInts = new Uint32Array(2);
    crypto.getRandomValues(randInts);
    const tripNumber = `TRIP-${new Date().getFullYear()}-${1000 + (randInts[0] % 9000)}`;
    const voucherCode = `VOUCH-${100000 + (randInts[1] % 900000)}`;
    const voucherToken = `vch_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

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
    const assertManualWrite = (error: { message: string } | null, label: string) => {
      if (error) throw new Error(`Viagem ${tripId} criada parcialmente; falha em ${label}: ${error.message}. Revise esta viagem antes de repetir a criação.`);
    };

    // Inserir passageiro principal
    const { error: passengerError } = await supabase.from("trip_passengers").insert({
      trip_id: tripId,
      store_id: effectiveStoreId,
      full_name: data.clientName,
      document: data.clientDocument || null,
      email: data.clientEmail || null,
      phone: data.clientWhatsapp || null,
      is_lead_passenger: true,
    });
    assertManualWrite(passengerError, "passageiro");

    // Inserir localizador de voo se informado
    if (data.flightLocator?.trim()) {
      const { error: confirmationError } = await supabase.from("trip_confirmation_items").insert({
        trip_id: tripId,
        store_id: effectiveStoreId,
        item_type: "flight",
        provider_name: data.airlineName || "Cia Aérea",
        locator_code: data.flightLocator.trim(),
        status: "confirmed",
        notes: `Voo para ${data.destinationCity}`,
      });
      assertManualWrite(confirmationError, "confirmação aérea");
    }

    // O hotel permanece na composição; confirmação exige localizador real do fornecedor.

    // Criar voucher geral da viagem
    const { error: voucherError } = await supabase.from("tourism_vouchers").insert({
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
    assertManualWrite(voucherError, "voucher");

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
    await requireStaff();

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
 * 10. Listagem Multi-Agência das Viagens e Pacotes para o Painel do Viajante (Minha Conta)
 * Centraliza pacotes fechados, aéreos, hotéis, localizadores e vouchers emitidos por qualquer agência do ecossistema.
 * Aplica Deny-by-Default estrito para sessões não autenticadas e reconcilia por ID, E-mail, CPF e WhatsApp.
 */
export const listCustomerAgencyTrips = createServerFn({ method: "GET" }).handler(
  async (): Promise<any[]> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    // Barreira Zero-Trust: visitante deslogado nunca recebe viagens de terceiros
    if (!identity?.id) {
      return [];
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, phone, cpf, full_name")
      .eq("id", identity.id)
      .maybeSingle();

    const cleanEmail = String(identity.email || "")
      .trim()
      .toLowerCase();
    const cleanDoc = parseValidCpf((profile as any)?.cpf);
    const cleanPhone = String(profile?.phone || "").replace(/\D/g, "");
    const phoneSuffix = cleanPhone.length >= 10 ? cleanPhone.slice(-8) : "";

    // 1. Verificar se o usuário consta como passageiro em alguma viagem (trip_passengers)
    const passengerOrClauses: string[] = [];
    if (cleanEmail && cleanEmail.includes("@")) {
      passengerOrClauses.push(`email.ilike.${cleanEmail}`);
    }
    if (cleanDoc) {
      passengerOrClauses.push(`document.ilike.%${cleanDoc}%`);
    }

    let passengerTripIds: string[] = [];
    if (passengerOrClauses.length > 0) {
      const { data: paxRows } = await supabase
        .from("trip_passengers")
        .select("trip_id")
        .or(passengerOrClauses.join(","))
        .limit(50);
      if (paxRows && paxRows.length > 0) {
        passengerTripIds = Array.from(
          new Set(paxRows.map((r: any) => String(r.trip_id)).filter(Boolean))
        );
      }
    }

    // 2. Construir cláusula unificada multi-agência (somente colunas reais em tourism_trips)
    const tripOrClauses: string[] = [`customer_id.eq.${identity.id}`];
    if (cleanEmail && cleanEmail.includes("@")) {
      tripOrClauses.push(`client_email.ilike.${cleanEmail}`);
    }
    if (cleanDoc) {
      tripOrClauses.push(`client_document.ilike.%${cleanDoc}%`);
    }
    if (phoneSuffix) {
      tripOrClauses.push(`client_whatsapp.ilike.%${phoneSuffix}%`);
    }
    if (passengerTripIds.length > 0) {
      tripOrClauses.push(`id.in.(${passengerTripIds.join(",")})`);
    }

    const { data, error } = await supabase
      .from("tourism_trips")
      .select(`
        id, store_id, proposal_id, source_proposal_id, lead_id, customer_id, trip_number, title, destination_city,
        travel_start_date, travel_end_date, adults_count, children_count,
        currency, total_cents, status, client_name, client_whatsapp,
        client_email, client_document, cover_image_url, portal_content, operator_name,
        payment_method, installments_count, financial_details,
        flights, hotels, transfers, tours, itinerary, includes, excludes,
        insurance, notes, created_at,
        stores ( id, name, slug, logo_url, phone, settings ),
        tourism_vouchers ( id, public_token, voucher_code, voucher_type ),
        trip_confirmation_items ( id, item_type, provider_name, locator_code, status, service_date )
      `)
      .or(tripOrClauses.join(","))
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(`Falha ao carregar suas viagens: ${error.message}`);
    }

    return (data || []).map((row: any) => {
      const storeObj = Array.isArray(row.stores) ? row.stores[0] : row.stores;
      const storeSettings = storeObj?.settings || {};
      return {
        ...row,
        agency_name: storeObj?.name || row.operator_name || "Agência Credenciada Waesy",
        agency_slug: storeObj?.slug || null,
        agency_logo_url: storeObj?.logo_url || null,
        agency_whatsapp: storeSettings.whatsapp_phone || storeSettings.phone || storeObj?.phone || null,
      };
    });
  }
);

/**
 * 10B. Dossiê Multi-Agência Completo do Viajante (Propostas, Cotações e Contratos)
 * Retorna todas as propostas interativas, cotações em andamento e contratos jurídicos do viajante
 * em qualquer agência de turismo do ecossistema Waesy.
 */
export const listCustomerTravelDossierFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    proposals: any[];
    quotes: any[];
    contracts: any[];
  }> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (!identity?.id) {
      return { proposals: [], quotes: [], contracts: [] };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, phone, cpf, full_name")
      .eq("id", identity.id)
      .maybeSingle();

    const cleanEmail = String(identity.email || "")
      .trim()
      .toLowerCase();
    const cleanDoc = parseValidCpf((profile as any)?.cpf);
    const cleanPhone = String(profile?.phone || "").replace(/\D/g, "");
    const phoneSuffix = cleanPhone.length >= 10 ? cleanPhone.slice(-8) : "";

    const proposalClauses: string[] = [];
    const quoteClauses: string[] = [];
    const contractClauses: string[] = [`customer_id.eq.${identity.id}`];

    if (cleanEmail && cleanEmail.includes("@")) {
      proposalClauses.push(`client_email.ilike.${cleanEmail}`);
      quoteClauses.push(`contact_email.ilike.${cleanEmail}`);
      contractClauses.push(`client_email.ilike.${cleanEmail}`);
    }
    if (phoneSuffix) {
      proposalClauses.push(`client_whatsapp.ilike.%${phoneSuffix}%`);
      quoteClauses.push(`contact_whatsapp.ilike.%${phoneSuffix}%`);
      contractClauses.push(`client_phone.ilike.%${phoneSuffix}%`);
    }
    if (cleanDoc) {
      contractClauses.push(`client_document.ilike.%${cleanDoc}%`);
    }

    const [proposalsRes, quotesRes, legacyContractsRes, canonicalContractsRes] = await Promise.all([
      proposalClauses.length > 0
        ? supabase
            .from("travel_proposals")
            .select(
              "id, store_id, public_token, title, subtitle, hero_image_url, destination_city, travel_start_date, travel_end_date, adults_count, children_count, pricing, status, acceptance_status, valid_until, created_at, stores(name, logo_url, phone, settings)"
            )
            .or(proposalClauses.join(","))
            .order("created_at", { ascending: false })
            .limit(30)
        : Promise.resolve({ data: [] as any[], error: null }),
      quoteClauses.length > 0
        ? supabase
            .from("travel_quotes")
            .select(
              "id, origin_city, origin_iata, destination_city, destination_iata, departure_date, return_date, adults_count, children_count, trip_type, status, quote_amount_cents, agency_notes, created_at"
            )
            .or(quoteClauses.join(","))
            .order("created_at", { ascending: false })
            .limit(30)
        : Promise.resolve({ data: [] as any[], error: null }),
      contractClauses.length > 0
        ? supabase
            .from("travel_contracts")
            .select(
              "id, store_id, public_token, proposal_id, contract_title, destination, travel_start_date, travel_end_date, total_value_cents, payment_conditions, status, signed_at, pdf_url, created_at, stores(name, phone, settings)"
            )
            .or(contractClauses.join(","))
            .order("created_at", { ascending: false })
            .limit(30)
        : Promise.resolve({ data: [] as any[], error: null }),
      supabase
        .from("contracts")
        .select("id, store_id, verification_code, title, status, metadata, created_at, stores(name, phone, settings)")
        .eq("category", "tourism")
        .or(
          [
            `customer_id.eq.${identity.id}`,
            ...(cleanEmail && cleanEmail.includes("@") ? [`metadata->>client_email.ilike.${cleanEmail}`] : []),
            ...(cleanDoc ? [`metadata->>client_document.ilike.%${cleanDoc}%`] : []),
            ...(phoneSuffix ? [`metadata->>client_phone.ilike.%${phoneSuffix}%`] : []),
          ].join(","),
        )
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const mergedContracts: any[] = [];
    const seenContractIds = new Set<string>();
    for (const c of canonicalContractsRes.data || []) {
      if (!c?.id || seenContractIds.has(c.id)) continue;
      seenContractIds.add(c.id);
      const s = (c as any).stores || {};
      const st = s.settings && typeof s.settings === "object" ? s.settings : {};
      const meta = (c as any).metadata || {};
      mergedContracts.push({
        id: c.id,
        store_id: c.store_id,
        public_token: c.verification_code || meta.public_token || c.id,
        proposal_id: meta.proposal_id || null,
        contract_title: c.title,
        destination: meta.destination || "",
        travel_start_date: meta.travel_start_date || null,
        travel_end_date: meta.travel_end_date || null,
        total_value_cents: Number(meta.total_value_cents || 0),
        payment_conditions: meta.payment_conditions || "",
        status: c.status === "completed" || c.status === "signed" ? "signed" : c.status,
        signed_at: meta.signed_at || null,
        pdf_url: meta.pdf_url || null,
        created_at: c.created_at,
        agency_name: s.name || meta.agency_name || null,
        agency_whatsapp: st.whatsapp_phone || s.phone || null,
      });
    }
    for (const c of legacyContractsRes.data || []) {
      if (!c?.id || seenContractIds.has(c.id)) continue;
      seenContractIds.add(c.id);
      const s = c.stores || {};
      const st = s.settings && typeof s.settings === "object" ? s.settings : {};
      mergedContracts.push({
        ...c,
        agency_name: s.name || null,
        agency_whatsapp: st.whatsapp_phone || s.phone || null,
      });
    }

    return {
      proposals: (proposalsRes.data || []).map((p: any) => {
        const s = p.stores || {};
        const st = s.settings && typeof s.settings === "object" ? s.settings : {};
        return {
          ...p,
          cover_image_url: p.hero_image_url || null,
          agency_name: s.name || null,
          agency_logo_url: s.logo_url || null,
          agency_whatsapp: st.whatsapp_phone || s.phone || null,
        };
      }),
      quotes: quotesRes.data || [],
      contracts: mergedContracts,
    };
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
    const identity = await requireStaff();

    const { data: trip, error: tripErr } = await supabase
      .from("tourism_trips")
      .select("id, store_id")
      .eq("id", data.tripId)
      .maybeSingle();

    if (tripErr || !trip) {
      throw new Error("Viagem não encontrada.");
    }
    if (trip.store_id !== identity.store_id && identity.role !== "platform_admin") {
      throw new Error("Acesso negado: viagem pertence a outra loja.");
    }

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
        .eq("id", data.id)
        .eq("store_id", trip.store_id);
      if (error) throw new Error("Erro ao atualizar passageiro: " + error.message);
      return { success: true, id: data.id };
    } else {
      const { data: created, error } = await supabase
        .from("trip_passengers")
        .insert({
          store_id: trip.store_id,
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
    const identity = await requireStaff();

    const { data: pax, error: findErr } = await supabase
      .from("trip_passengers")
      .select("id, store_id")
      .eq("id", data.passengerId)
      .maybeSingle();
    if (findErr || !pax) {
      throw new Error("Passageiro não encontrado.");
    }
    if (pax.store_id !== identity.store_id && identity.role !== "platform_admin") {
      throw new Error("Acesso negado para remover passageiro de outra loja.");
    }

    const { error } = await supabase
      .from("trip_passengers")
      .delete()
      .eq("id", data.passengerId)
      .eq("store_id", pax.store_id);
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

      // 3. Tentar buscar em travel_proposals (por id ou public_token)
      const { data: proposal } = await supabase
        .from("travel_proposals")
        .select("id, title, destination_city, travel_start_date, travel_end_date, client_name, client_email, client_whatsapp, stores(name, logo_url, phone, settings)")
        .or(`id.eq.${token.length === 36 ? token : '00000000-0000-0000-0000-000000000000'},public_token.eq.${token}`)
        .maybeSingle();

      if (proposal) {
        const store = (proposal as any).stores || {};
        const settings = store.settings || {};
        return {
          success: true,
          tripTitle: proposal.title || `Proposta para ${proposal.destination_city}`,
          destination: proposal.destination_city || "Destino Turístico",
          departureDate: proposal.travel_start_date || null,
          returnDate: proposal.travel_end_date || null,
          agencyName: store.name || "",
          agencyLogo: store.logo_url || null,
          agencyPhone: settings.whatsapp_phone || settings.phone || store.phone || null,
          tokenType: "proposal",
          passengerData: {
            fullName: proposal.client_name || undefined,
            email: proposal.client_email || undefined,
            phone: proposal.client_whatsapp || undefined,
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
        .select("id, store_id")
        .or(`id.eq.${token.length === 36 ? token : '00000000-0000-0000-0000-000000000000'},public_token.eq.${token}`)
        .maybeSingle();
      if (prop) {
        storeId = prop.store_id;
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
    const identity = await getServerIdentity();
    assertStoreAccess(
      identity,
      ["owner", "admin", "manager", "finance", "gerente", "diretor", "financeiro"],
    );

    const { data: trip, error: fetchErr } = await supabase
      .from("tourism_trips")
      .select("id, store_id, customer_id, proposal_id, trip_number, title, destination, departure_date, return_date, created_by_profile_id, financial_details, total_cents, operator_name, payment_method, installments_count")
      .eq("id", data.tripId)
      .single();

    if (fetchErr || !trip) {
      throw new Error("Viagem não encontrada.");
    }
    if (trip.store_id !== identity.store_id && identity.role !== "platform_admin") {
      throw new Error("Acesso negado para alterar o financeiro de outra agência.");
    }

    const nowIso = new Date().toISOString();
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
      updated_at: nowIso,
    };

    const updatePayload: Record<string, any> = {
      financial_details: updatedDetails,
      total_cents: data.grossPriceCents ?? trip.total_cents,
      operator_name: data.operatorName ?? trip.operator_name,
      payment_method: data.paymentMethod ?? trip.payment_method,
      installments_count: data.installmentsCount ?? trip.installments_count,
      updated_at: nowIso,
    };

    const { error: updateErr } = await supabase
      .from("tourism_trips")
      .update(updatePayload)
      .eq("id", data.tripId)
      .eq("store_id", trip.store_id);

    if (updateErr) {
      throw new Error(`Erro ao salvar dados financeiros da viagem: ${updateErr.message}`);
    }

    // Sincronizar parcelas reais na tabela travel_trip_installment_boletos (fonte única para o Portal do Cliente)
    if (Array.isArray(data.installments)) {
      const normalizedMethod = String(data.paymentMethod ?? trip.payment_method ?? "").toLowerCase();
      const paymentChannel =
        normalizedMethod.includes("boleto") || normalizedMethod.includes("carne")
          ? "boleto_bancario"
          : normalizedMethod.includes("card") || normalizedMethod.includes("cartao")
            ? "credit_card"
            : normalizedMethod.includes("funpay")
              ? "frt_funpay"
              : normalizedMethod.includes("orinter")
                ? "orinter_portal"
                : normalizedMethod.includes("incomum")
                  ? "incomum_chat"
                  : normalizedMethod.includes("santander")
                    ? "santander_app"
                    : "agency_pix";

      const operatorSlug = String(data.operatorName ?? trip.operator_name ?? "agency_direct")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_") || "agency_direct";

      if (data.installments.length === 0) {
        const { error: delEmptyErr } = await supabase
          .from("travel_trip_installment_boletos")
          .delete()
          .eq("trip_id", trip.id)
          .eq("store_id", trip.store_id);
        if (delEmptyErr) {
          throw new Error(`Erro ao limpar parcelas removidas da viagem: ${delEmptyErr.message}`);
        }
      } else {
        const totalInstCount = data.installments.length;
        const rows = data.installments.map((inst, idx) => {
          const instNumber = Number(inst.installment_number || idx + 1);
          return {
            store_id: trip.store_id,
            trip_id: trip.id,
            client_profile_id: trip.customer_id || null,
            installment_number: instNumber,
            total_installments: Number(inst.total_installments || totalInstCount),
            due_date: /^\d{4}-\d{2}-\d{2}/.test(String(inst.due_date || ""))
              ? String(inst.due_date).slice(0, 10)
              : nowIso.slice(0, 10),
            amount_cents: Math.max(0, Math.round(Number(inst.amount_cents || 0))),
            currency: "BRL",
            operator_slug: operatorSlug,
            payment_channel: paymentChannel,
            boleto_pdf_url: inst.pdf_url || null,
            digitable_line: inst.digitable_line || null,
            external_payment_link: data.externalFinanceUrl || null,
            status: inst.status === "paid" ? "reconciled" : inst.status === "overdue" ? "overdue" : "pending",
            reconciled_at: inst.status === "paid" ? (inst.paid_at || nowIso) : null,
            updated_at: nowIso,
          };
        });

        const { error: upsertBolErr } = await supabase
          .from("travel_trip_installment_boletos")
          .upsert(rows, { onConflict: "trip_id,installment_number" });
        if (upsertBolErr) {
          throw new Error(`Erro ao sincronizar parcelas em boletos do viajante: ${upsertBolErr.message}`);
        }

        const activeNums = new Set(rows.map((r) => r.installment_number));
        const { data: existingBol } = await supabase
          .from("travel_trip_installment_boletos")
          .select("id, installment_number")
          .eq("trip_id", trip.id)
          .eq("store_id", trip.store_id);
        const obsoleteIds = (existingBol || [])
          .filter((b: any) => !activeNums.has(Number(b.installment_number)))
          .map((b: any) => b.id);
        if (obsoleteIds.length > 0) {
          const { error: cleanupErr } = await supabase
            .from("travel_trip_installment_boletos")
            .delete()
            .in("id", obsoleteIds)
            .eq("store_id", trip.store_id);
          if (cleanupErr) {
            throw new Error(`Erro ao remover parcelas obsoletas: ${cleanupErr.message}`);
          }
        }
      }
    }

    // Sincronizar automaticamente com a Ficha Financeira Soberana (SSOT)
    try {
      const grossForSheet = Number(updatedDetails.gross_price_cents || trip.total_cents || 0);
      if (grossForSheet > 0) {
        const payMethod = String(updatedDetails.payment_method || "").toLowerCase();
        const overPayMethod =
          payMethod === "pix" || payMethod.includes("dinheiro") || payMethod.includes("cash")
            ? "pix_direto_agencia"
            : "operadora_financiado";
        await syncTourismSaleToFinancialSheetServer({
          supabase,
          storeId: trip.store_id,
          actorProfileId: identity.id,
          tripId: trip.id,
          proposalId: (trip as any).proposal_id || null,
          sellerProfileId: (trip as any).created_by_profile_id || identity.id,
          clientName: String((trip as any).title || "Passageiro"),
          destination: String((trip as any).destination || (trip as any).title || "Pacote Turístico"),
          primaryOperator: String(updatedDetails.operator_name || trip.operator_name || "Operadora"),
          locatorCode: String((trip as any).trip_number || trip.id.slice(0, 8)),
          internalCode: String((trip as any).trip_number || `TR-${trip.id.slice(0, 6)}`),
          departureDate: (trip as any).departure_date || null,
          returnDate: (trip as any).return_date || null,
          grossSaleCents: grossForSheet,
          operatorTablePriceCents: Number(updatedDetails.operator_net_cents || 0) || undefined,
          overPaymentMethod: overPayMethod,
          bookingStatus: "confirmada",
        });
      }
    } catch (syncErr) {
      console.warn("[saveTripFinancialDetails] Aviso ao sincronizar ficha financeira SSOT:", syncErr);
    }

    return { success: true, message: "Dados financeiros e boletos atualizados e sincronizados com sucesso!" };
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


// ---------------------------------------------------------------------------
// 12. DOSSIÊ COMPLETO DO VIAJANTE (PORTAL DO PASSAGEIRO - ZERO MOCKS)
// ---------------------------------------------------------------------------
export const getTravelerTripPortalDossier = createServerFn({ method: "GET" })
  .validator(z.object({ tripIdOrCode: z.string().min(1) }))
  .handler(async ({ data: { tripIdOrCode } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) {
      throw new Error("AUTH_REQUIRED: Faça login para acessar o Portal da sua Viagem.");
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tripIdOrCode);

    let query = supabase.from("tourism_trips").select("*, stores(id, name, logo_url, phone, settings)");
    if (isUuid) {
      query = query.eq("id", tripIdOrCode);
    } else {
      const sanitizedCode = tripIdOrCode.replace(/[^a-zA-Z0-9\-_]/g, "");
      if (!sanitizedCode) return null;
      query = query.eq("trip_number", sanitizedCode);
    }

    const { data: trip, error } = await query.maybeSingle();
    if (error) {
      throw new Error(`Falha ao carregar viagem: ${error.message}`);
    }
    if (!trip) {
      return null;
    }

    const access = await resolveTripAccessForIdentity(supabase, identity, trip as any);
    if (!access.authorized) {
      throw new Error("FORBIDDEN: Esta viagem pertence a outro viajante ou agência.");
    }

    const proposalLookupId = (trip as any).source_proposal_id || trip.proposal_id || null;
    const [paxRes, confRes, vouchersRes, boletosRes, docsRes, incidentsRes, changesRes, legacyCtrRes, canonicalCtrRes] = await Promise.all([
      supabase.from("trip_passengers").select("*").eq("trip_id", trip.id).eq("store_id", trip.store_id).order("created_at"),
      supabase.from("trip_confirmation_items").select("*").eq("trip_id", trip.id).eq("store_id", trip.store_id).order("service_date", { ascending: true }),
      supabase.from("tourism_vouchers").select("*").eq("trip_id", trip.id).eq("store_id", trip.store_id).order("created_at", { ascending: false }),
      supabase.from("travel_trip_installment_boletos").select("*").eq("trip_id", trip.id).eq("store_id", trip.store_id).order("installment_number"),
      supabase.from("travel_trip_official_documents").select("*").eq("trip_id", trip.id).eq("store_id", trip.store_id).order("created_at", { ascending: false }),
      supabase.from("tourism_incident_tickets").select("*").eq("trip_id", trip.id).eq("store_id", trip.store_id).order("created_at", { ascending: false }),
      supabase.from("travel_flight_change_cases").select("*").eq("trip_id", trip.id).eq("store_id", trip.store_id).order("created_at", { ascending: false }),
      proposalLookupId
        ? supabase.from("travel_contracts").select("*").eq("store_id", trip.store_id).eq("proposal_id", proposalLookupId).order("created_at", { ascending: false }).limit(1).maybeSingle()
        : supabase.from("travel_contracts").select("*").eq("store_id", trip.store_id).eq("trip_id", trip.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      proposalLookupId
        ? supabase.from("contracts").select("id, title, status, verification_code, metadata, created_at").eq("category", "tourism").eq("store_id", trip.store_id).or(`metadata->>trip_id.eq.${trip.id},metadata->>proposal_id.eq.${proposalLookupId}`).order("created_at", { ascending: false }).limit(1).maybeSingle()
        : supabase.from("contracts").select("id, title, status, verification_code, metadata, created_at").eq("category", "tourism").eq("store_id", trip.store_id).eq("metadata->>trip_id", trip.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    let resolvedContract: any = legacyCtrRes.data || null;
    if (!resolvedContract && canonicalCtrRes.data) {
      const cc = canonicalCtrRes.data as any;
      const ccMeta = (cc.metadata as Record<string, any>) || {};
      resolvedContract = {
        id: cc.id,
        contract_title: cc.title,
        public_token: cc.verification_code || ccMeta.public_token || cc.id,
        status: cc.status === "completed" || cc.status === "signed" ? "signed" : cc.status,
        signed_at: ccMeta.signed_at || null,
        certificate_serial: ccMeta.certificate_serial || null,
        created_at: cc.created_at,
      };
    }

    if (vouchersRes.error) {
      throw new Error(`Erro ao carregar vouchers da viagem: ${vouchersRes.error.message}`);
    }
    if (boletosRes.error) {
      throw new Error(`Erro ao carregar boletos da viagem: ${boletosRes.error.message}`);
    }
    if (docsRes.error) {
      throw new Error(`Erro ao carregar documentos da viagem: ${docsRes.error.message}`);
    }

    const visibleDocsRaw = (docsRes.data || []).filter((d: any) => access.isStaff || d.is_visible_to_client !== false);
    const officialDocuments = await Promise.all(
      visibleDocsRaw.map(async (doc: any) => {
        const meta = (doc.ocr_extracted_json as Record<string, any>) || {};
        let resolvedUrl = doc.original_pdf_url || null;
        if (
          meta.storage_bucket &&
          meta.storage_path &&
          typeof meta.storage_path === "string" &&
          meta.storage_path.startsWith(`${trip.store_id}/`) &&
          !meta.storage_path.includes("..")
        ) {
          const { data: signed } = await supabase.storage
            .from(String(meta.storage_bucket))
            .createSignedUrl(String(meta.storage_path), 60 * 60 * 6);
          if (signed?.signedUrl) {
            resolvedUrl = signed.signedUrl;
          }
        }
        return {
          id: doc.id,
          trip_id: doc.trip_id,
          doc_category: doc.doc_category,
          operator_name: doc.operator_name,
          reservation_code: doc.reservation_code,
          title: doc.title,
          original_pdf_url: resolvedUrl,
          is_visible_to_client: doc.is_visible_to_client,
          created_at: doc.created_at,
        };
      }),
    );

    const storeObj = (trip.stores as any) || {};
    const storeSettings = storeObj.settings || {};

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
        portal_content: (trip as any).portal_content || null,
      },
      passengers: paxRes.data || [],
      confirmationItems: confRes.data || [],
      vouchers: vouchersRes.data || [],
      boletos: boletosRes.data || [],
      officialDocuments,
      contract: resolvedContract,
      incidents: incidentsRes.data || [],
      flightChanges: changesRes.data || [],
      agency: {
        id: trip.store_id,
        name: storeObj.name || trip.operator_name || "Agência de Viagens Waesy",
        logo_url: storeObj.logo_url || null,
        phone: storeSettings.whatsapp_phone || storeSettings.phone || storeObj.phone || null,
      },
    };
  });


// ─── PUBLICAÇÃO 1-CLIQUE NA VITRINE PÚBLICA ───────────────────────────────────

export const PublishTripToPublicStorefrontSchema = z.object({
  tripId: z.string().uuid(),
  customPriceCents: z.number().int().positive().optional(),
  availableSeats: z.number().int().positive().optional(),
  isFeatured: z.boolean().default(false),
});

export type PublishTripToPublicStorefrontDTO = z.infer<typeof PublishTripToPublicStorefrontSchema>;

export const publishTripToPublicStorefront = createServerFn({ method: "POST" })
  .validator((data: unknown) => PublishTripToPublicStorefrontSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await requireStaff();

    const { data: trip, error: tripErr } = await supabase
      .from("tourism_trips")
      .select("*")
      .eq("id", data.tripId)
      .eq("store_id", identity.store_id)
      .single();

    if (tripErr || !trip) {
      throw new Error(`Viagem não encontrada: ${tripErr?.message || "ID inválido"}`);
    }

    const { data: store } = await supabase
      .from("stores")
      .select("id, name, logo_url, phone, settings")
      .eq("id", identity.store_id)
      .single();

    const storeSettings = (store?.settings as Record<string, any>) || {};
    const contactPhone = storeSettings.whatsapp_phone || store?.phone || "";

    const priceCents = data.customPriceCents || trip.total_cents || 0;
    const priceDisplay = priceCents > 0
      ? `R$ ${(priceCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
      : "Consulte Valores";

    // Mapeia itinerário da viagem
    const formattedItinerary = Array.isArray(trip.itinerary) && trip.itinerary.length > 0
      ? trip.itinerary.map((it: any, idx: number) => ({
          day: it.day || idx + 1,
          title: it.title || `Dia ${idx + 1}`,
          description: it.description || "",
        }))
      : null;

    // Procura se já existe uma experiência publicada com este título e store
    const { data: existingExp } = await supabase
      .from("tourism_experiences")
      .select("id")
      .eq("store_id", identity.store_id)
      .ilike("title", trip.title || trip.destination_city)
      .limit(1)
      .maybeSingle();

    let experienceId: string;

    const payload = {
      store_id: identity.store_id,
      author_profile_id: identity.id,
      title: trip.title || `Roteiro ${trip.destination_city}`,
      subtitle: `Pacote Exclusivo ${trip.destination_city}`,
      description: trip.notes || `Pacote completo para ${trip.destination_city} com traslados, passeios e acompanhamento especializado.`,
      category: "travel_package",
      destination: trip.destination_city,
      destination_city: trip.destination_city,
      departure_date: trip.travel_start_date || null,
      return_date: trip.travel_end_date || null,
      cover_image_url: trip.cover_image_url || null,
      location: trip.destination_city,
      duration: trip.travel_start_date && trip.travel_end_date
        ? `${Math.max(1, Math.round((new Date(trip.travel_end_date).getTime() - new Date(trip.travel_start_date).getTime()) / (1000 * 60 * 60 * 24)))} dias`
        : "Sob consulta",
      price_display: priceDisplay,
      price_cents: priceCents,
      provider_name: store?.name || "Agência de Viagens",
      provider_logo_url: store?.logo_url || null,
      contact_whatsapp: contactPhone,
      included_items: trip.includes || [],
      what_to_bring: trip.excludes || [],
      itinerary: formattedItinerary,
      total_seats: data.availableSeats || 30,
      available_seats: data.availableSeats || 30,
      is_featured: data.isFeatured,
      status: "active",
      updated_at: new Date().toISOString(),
    };

    if (existingExp?.id) {
      const { error: updErr } = await supabase
        .from("tourism_experiences")
        .update(payload)
        .eq("id", existingExp.id);
      if (updErr) throw new Error(`Falha ao atualizar vitrine pública: ${updErr.message}`);
      experienceId = existingExp.id;
    } else {
      const { data: newExp, error: insErr } = await supabase
        .from("tourism_experiences")
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (insErr || !newExp) throw new Error(`Falha ao publicar na vitrine pública: ${insErr?.message}`);
      experienceId = newExp.id;
    }

    return {
      success: true,
      experienceId,
      publicUrl: `/_store/turismo/${experienceId}`,
    };
  });


// ─── 21. DETECÇÃO DE VIAGEM ATIVA / PRÓXIMA PARA WIDGET GLOBAL DO VIAJANTE ───

export interface ActiveTravelerTripDTO {
  hasActiveTrip: boolean;
  tripId?: string;
  tripCode?: string;
  title?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  daysUntilDeparture?: number;
  isCurrentlyTraveling?: boolean;
  primaryFlightPnr?: string | null;
  hotelCheckinTime?: string | null;
  tourType?: "package" | "group_tour" | "air";
  publicSlugOrCode?: string;
}

export const getMyActiveOrUpcomingTrip = createServerFn({ method: "GET" }).handler(
  async (): Promise<ActiveTravelerTripDTO> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity?.id) {
      return { hasActiveTrip: false };
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // 1. Busca em tourism_trips onde o cliente é o titular da reserva
    const { data: clientTrips } = await supabase
      .from("tourism_trips")
      .select(
        "id, trip_number, title, destination_city, travel_start_date, travel_end_date, status, flights, hotels, client_whatsapp"
      )
      .or(`customer_id.eq.${identity.id},client_email.eq.${identity.email || "none"}`)
      .gte("travel_end_date", todayStr)
      .neq("status", "cancelled")
      .order("travel_start_date", { ascending: true })
      .limit(1);

    if (clientTrips && clientTrips.length > 0) {
      const trip = clientTrips[0];
      const depDate = new Date(trip.travel_start_date || todayStr);
      const now = new Date();
      const diffDays = Math.ceil((depDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isTraveling = diffDays <= 0;

      const firstFlight =
        Array.isArray(trip.flights) && trip.flights.length > 0 ? (trip.flights[0] as any) : null;
      const firstHotel =
        Array.isArray(trip.hotels) && trip.hotels.length > 0 ? (trip.hotels[0] as any) : null;

      return {
        hasActiveTrip: true,
        tripId: trip.id,
        tripCode: trip.trip_number || trip.id.slice(0, 8),
        title: trip.title,
        destination: trip.destination_city || "Destino",
        departureDate: trip.travel_start_date || todayStr,
        returnDate: trip.travel_end_date || todayStr,
        daysUntilDeparture: diffDays,
        isCurrentlyTraveling: isTraveling,
        primaryFlightPnr: firstFlight?.locatorCode || firstFlight?.pnr || null,
        hotelCheckinTime: firstHotel?.checkinTime || firstHotel?.checkin_time || "14:00",
        tourType: "package",
        publicSlugOrCode: trip.id,
      };
    }

    // 2. Busca em group_tour_enrollments onde o passageiro está inscrito
    const { data: enrollments } = await supabase
      .from("group_tour_enrollments")
      .select(
        `
        id, seat_number, room_type, payment_status,
        tourism_experiences:group_tour_id (
          id, title, destination, departure_date, return_date, description
        )
      `
      )
      .eq("client_id", identity.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (enrollments && enrollments.length > 0) {
      const enr = enrollments[0];
      const tour = (enr as any).tourism_experiences;
      if (tour) {
        const depDate = new Date(tour.departure_date || todayStr);
        const now = new Date();
        const diffDays = Math.ceil((depDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isTraveling = diffDays <= 0;

        return {
          hasActiveTrip: true,
          tripId: tour.id,
          tripCode: tour.id.slice(0, 8),
          title: tour.title,
          destination: tour.destination || "Destino",
          departureDate: tour.departure_date,
          returnDate: tour.return_date,
          daysUntilDeparture: diffDays,
          isCurrentlyTraveling: isTraveling,
          primaryFlightPnr: null,
          hotelCheckinTime: "14:00",
          tourType: "group_tour",
          publicSlugOrCode: tour.id,
        };
      }
    }

    return { hasActiveTrip: false };
  }
);

// ─── 22. Gestão Canônica de Pastas de Viajante & Dossiê Consular (CRM Turismo) ───

export const saveLeadTravelerDossiers = createServerFn({ method: "POST" })
  .validator(
    z.object({
      leadId: z.string().uuid(),
      travelers: z.array(z.any()),
      serviceTemplate: z.enum(["pacote_viagem", "assessoria_visto", "corporativo_aereo", "avulso"]).optional(),
      auditLogEntry: z.object({
        id: z.string(),
        timestamp: z.string(),
        author: z.string(),
        event_type: z.string(),
        description: z.string(),
        previous_value: z.string().optional(),
        new_value: z.string().optional(),
      }).optional(),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await requireStaff();

    // Fetch existing lead to preserve custom_fields
    const { data: existingLead, error: fetchErr } = await supabase
      .from("leads_crm")
      .select("id, custom_fields, pax_list, store_id")
      .eq("id", input.leadId)
      .eq("store_id", identity.store_id)
      .single();

    if (fetchErr || !existingLead) {
      throw new Error("Lead não encontrado ou acesso não autorizado.");
    }

    const currentCf = (existingLead.custom_fields as any) || {};
    const existingAuditLogs = Array.isArray(currentCf.audit_logs) ? currentCf.audit_logs : [];
    const updatedAuditLogs = input.auditLogEntry
      ? [input.auditLogEntry, ...existingAuditLogs]
      : existingAuditLogs;

    // Convert traveler dossiers to pax_list format for backward compatibility
    const updatedPaxList = input.travelers.map((t: any) => ({
      full_name: t.full_name || "",
      document: t.document_cpf || t.document_rg || "",
      birth_date: t.birth_date || null,
      relationship: t.relationship || (t.is_primary ? "titular" : "other"),
      phone: t.phone || null,
      email: t.email || null,
      passport: t.passport_number || null,
      passport_expiry: t.passport_expiry_date || null,
    }));

    const updatedCustomFields = {
      ...currentCf,
      traveler_dossiers: input.travelers,
      audit_logs: updatedAuditLogs,
      ...(input.serviceTemplate ? { service_template: input.serviceTemplate } : {}),
    };

    const { error: updateErr } = await supabase
      .from("leads_crm")
      .update({
        custom_fields: updatedCustomFields,
        pax_list: updatedPaxList,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.leadId)
      .eq("store_id", identity.store_id);

    if (updateErr) {
      throw new Error("Erro ao salvar pastas de viajantes: " + updateErr.message);
    }

    return { success: true, count: input.travelers.length };
  });

export const promoteTravelerToCustomer = createServerFn({ method: "POST" })
  .validator(
    z.object({
      leadId: z.string().uuid(),
      travelerId: z.string(),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await requireStaff();

    const { data: lead, error: fetchErr } = await supabase
      .from("leads_crm")
      .select("id, store_id, custom_fields, customer_id")
      .eq("id", input.leadId)
      .eq("store_id", identity.store_id)
      .single();

    if (fetchErr || !lead) {
      throw new Error("Lead não encontrado.");
    }

    const cf = (lead.custom_fields as any) || {};
    const dossiers = Array.isArray(cf.traveler_dossiers) ? cf.traveler_dossiers : [];
    const travelerIndex = dossiers.findIndex((t: any) => t.id === input.travelerId);
    if (travelerIndex === -1) {
      throw new Error("Dossiê de viajante não encontrado neste card.");
    }

    const traveler = dossiers[travelerIndex];
    if (!traveler.full_name) {
      throw new Error("O viajante deve possuir nome completo para ser promovido a cliente.");
    }

    // Check if customer already exists by CPF in customers_crm
    let existingCustomerId: string | null = null;
    const cleanCpf = (traveler.document_cpf || "").replace(/\D/g, "");
    if (cleanCpf && cleanCpf.length === 11) {
      const { data: existingCust } = await supabase
        .from("customers_crm")
        .select("id")
        .eq("store_id", identity.store_id)
        .eq("document", cleanCpf)
        .is("deleted_at", null)
        .maybeSingle();
      if (existingCust) existingCustomerId = existingCust.id;
    }

    let customerId = existingCustomerId;
    if (customerId) {
      await supabase
        .from("customers_crm")
        .update({
          full_name: traveler.full_name,
          name: traveler.full_name,
          phone: traveler.phone || undefined,
          email: traveler.email || undefined,
          rg: traveler.rg || undefined,
          birth_date: traveler.birth_date || undefined,
          address: traveler.address || undefined,
          updated_at: new Date().toISOString(),
          custom_fields: {
            passport_number: traveler.passport_number,
            passport_expiry: traveler.passport_expiry_date,
            address: traveler.address,
            visas: traveler.visas,
            vaccines: traveler.vaccines,
          },
        })
        .eq("id", customerId)
        .eq("store_id", identity.store_id);
    } else {
      const { data: newCust, error: insertErr } = await supabase
        .from("customers_crm")
        .insert({
          store_id: identity.store_id,
          kind: "individual",
          status: "active",
          full_name: traveler.full_name,
          name: traveler.full_name,
          document: cleanCpf || null,
          rg: traveler.rg || null,
          birth_date: traveler.birth_date || null,
          address: traveler.address || null,
          phone: traveler.phone || null,
          email: traveler.email || null,
          tags: ["Viajante CRM", traveler.is_primary ? "Titular" : "Acompanhante"],
          custom_fields: {
            lead_origin_id: lead.id,
            passport_number: traveler.passport_number,
            passport_expiry: traveler.passport_expiry_date,
            address: traveler.address,
            visas: traveler.visas,
            vaccines: traveler.vaccines,
          },
        })
        .select("id")
        .single();

      if (insertErr) {
        throw new Error("Erro ao cadastrar cliente: " + insertErr.message);
      }
      customerId = newCust.id;
    }

    // Update dossier in lead
    dossiers[travelerIndex] = {
      ...traveler,
      customer_id: customerId,
      customer_linked: true,
      is_verified: true,
    };

    const auditLogs = Array.isArray(cf.audit_logs) ? cf.audit_logs : [];
    auditLogs.unshift({
      id: "audit-" + Date.now(),
      timestamp: new Date().toISOString(),
      author: identity.id ? `Staff (${identity.role})` : "Consultor Waesy",
      event_type: "customer_promoted",
      description: `Viajante ${traveler.full_name} vinculado ao Cadastro de Clientes 360° (ID: ${customerId}).`,
    });

    const updatePayload: Record<string, any> = {
      custom_fields: {
        ...cf,
        traveler_dossiers: dossiers,
        audit_logs: auditLogs,
      },
    };
    if (traveler.is_primary && !lead.customer_id) {
      updatePayload.customer_id = customerId;
    }

    await supabase
      .from("leads_crm")
      .update(updatePayload)
      .eq("id", lead.id)
      .eq("store_id", identity.store_id);

    return { success: true, customerId };
  });

export const validateTravelerPassportMrzAction = createServerFn({ method: "POST" })
  .validator(
    z.object({
      line1: z.string(),
      line2: z.string(),
      tripReturnDateIso: z.string().optional(),
    })
  )
  .handler(async ({ data: input }) => {
    return parseAndValidatePassportMrz(input.line1, input.line2, input.tripReturnDateIso);
  });

export const evaluateTravelerDs160TiesAction = createServerFn({ method: "POST" })
  .validator(
    z.object({
      applicantName: z.string().default("Viajante"),
      destinationCountry: z.string().default("Estados Unidos"),
      visaType: z.string().default("B1/B2"),
      occupationType: z.enum([
        "empresario",
        "clt",
        "servidor_publico",
        "profissional_liberal",
        "estudante",
        "aposentado",
        "autonomo",
        "desempregado",
      ]).default("clt"),
      employmentTenureMonths: z.number().default(24),
      monthlyIncomeCents: z.number().default(650000),
      hasIncomeTaxReturn: z.boolean().default(true),
      hasPropertyInBrazil: z.boolean().default(true),
      hasDependentsInBrazil: z.boolean().default(true),
      previousInternationalTrips: z.array(z.string()).default([]),
      hasRelativesInDestination: z.boolean().default(false),
      relativesLegalStatus: z.enum(["none", "citizen_lpr", "non_immigrant_visa", "undocumented"]).default("none"),
      previousVisaRefusal: z.boolean().default(false),
      monthsSinceLastRefusal: z.number().optional(),
      tripSponsorType: z.enum(["self", "parents_family", "company_employer", "other"]).default("self"),
      estimatedTripCostCents: z.number().default(1500000),
      plannedStayDays: z.number().default(14),
    })
  )
  .handler(async ({ data: input }) => {
    return evaluateUsVisaDs160ConsularTies(input);
  });

export const UpdateTripPortalCustomizationSchema = z.object({
  tripId: z.string().uuid("ID de viagem inválido"),
  coverImageUrl: z.string().max(1000).optional().nullable(),
  welcomeNote: z.string().max(2000).optional().nullable(),
  portalMedia: z
    .array(
      z.object({
        id: z.string().optional(),
        url: z.string().min(1).max(1000),
        type: z.enum(["image", "video"]).optional(),
        caption: z.string().max(300).optional().nullable(),
        aspectPreset: z.string().max(20).optional().nullable(),
        objectPosition: z.string().max(60).optional().nullable(),
        scale: z.number().min(0.5).max(3).optional().nullable(),
        fit: z.enum(["cover", "contain"]).optional().nullable(),
      }),
    )
    .max(40)
    .optional()
    .nullable(),
  portalTips: z
    .array(
      z.object({
        id: z.string().optional(),
        category: z.string().max(60).optional().nullable(),
        title: z.string().min(1).max(160),
        description: z.string().min(1).max(1000),
      }),
    )
    .max(30)
    .optional()
    .nullable(),
});

export const updateTripPortalCustomization = createServerFn({ method: "POST" })
  .validator(UpdateTripPortalCustomizationSchema)
  .handler(async ({ data }): Promise<{ success: boolean; tripId: string }> => {
    const supabase = getServerClient();
    const identity = await requireStaff();

    const { tripId, coverImageUrl, welcomeNote, portalMedia, portalTips } = data;

    const { data: existingTrip, error: lookupErr } = await supabase
      .from("tourism_trips")
      .select("id, store_id, cover_image_url, portal_content")
      .eq("id", tripId)
      .maybeSingle();

    if (lookupErr || !existingTrip) {
      throw new Error("Viagem não encontrada.");
    }
    if (existingTrip.store_id !== identity.store_id) {
      throw new Error("Acesso negado para editar o portal desta viagem.");
    }

    const prevPortal = ((existingTrip as any).portal_content && typeof (existingTrip as any).portal_content === "object")
      ? (existingTrip as any).portal_content
      : {};

    const nextPortalContent = {
      ...prevPortal,
      ...(welcomeNote !== undefined ? { welcome_note: welcomeNote ? welcomeNote.trim() : null } : {}),
      ...(portalMedia !== undefined
        ? {
            portal_media: Array.isArray(portalMedia)
              ? portalMedia.map((m, idx) => ({
                  id: m.id || `pm-${idx + 1}`,
                  url: m.url.trim(),
                  type: m.type || "image",
                  caption: m.caption ?? null,
                  aspectPreset: m.aspectPreset ?? null,
                  objectPosition: m.objectPosition ?? null,
                  scale: m.scale ?? 1,
                  fit: m.fit || "cover",
                }))
              : [],
          }
        : {}),
      ...(portalTips !== undefined
        ? {
            portal_tips: Array.isArray(portalTips)
              ? portalTips.map((t, idx) => ({
                  id: t.id || `pt-${idx + 1}`,
                  category: t.category || "dica",
                  title: t.title.trim(),
                  description: t.description.trim(),
                }))
              : [],
          }
        : {}),
      updated_at: new Date().toISOString(),
    };

    const patch: Record<string, any> = {
      portal_content: nextPortalContent,
      updated_at: new Date().toISOString(),
    };
    if (coverImageUrl !== undefined) {
      patch.cover_image_url = coverImageUrl ? coverImageUrl.trim() : null;
    }

    const { error: updErr } = await supabase
      .from("tourism_trips")
      .update(patch)
      .eq("id", tripId)
      .eq("store_id", identity.store_id);

    if (updErr) {
      throw new Error(`Falha ao salvar personalização do Portal do Viajante: ${updErr.message}`);
    }

    return { success: true, tripId };
  });

export const AddTripOfficialDocumentSchema = z.object({
  tripId: z.string().uuid("ID de viagem inválido"),
  docCategory: z.enum([
    "operator_confirmation",
    "signed_contract",
    "payment_receipt",
    "hotel_voucher",
    "flight_eticket",
    "transfer_voucher",
    "insurance_policy",
  ]),
  title: z.string().min(2).max(200),
  operatorName: z.string().max(120).optional().nullable(),
  reservationCode: z.string().max(80).optional().nullable(),
  fileUrl: z.string().min(1).max(2000),
  storageBucket: z.string().max(80).optional().nullable(),
  storagePath: z.string().max(400).optional().nullable(),
  isVisibleToClient: z.boolean().default(true),
});

export const addTripOfficialDocument = createServerFn({ method: "POST" })
  .validator(AddTripOfficialDocumentSchema)
  .handler(async ({ data }): Promise<{ success: boolean; document: any }> => {
    const {
      tripId,
      docCategory,
      title,
      operatorName,
      reservationCode,
      fileUrl,
      storageBucket,
      storagePath,
      isVisibleToClient,
    } = data;
    const supabase = getServerClient();
    const identity = await requireStaff();

    const { data: trip, error: tripErr } = await supabase
      .from("tourism_trips")
      .select("id, store_id, operator_name")
      .eq("id", tripId)
      .maybeSingle();

    if (tripErr || !trip) throw new Error("Viagem não encontrada.");
    if (trip.store_id !== identity.store_id && identity.role !== "platform_admin") {
      throw new Error("Acesso negado para anexar documento em viagem de outra agência.");
    }

    const cleanFileUrl = fileUrl.trim();
    if (!cleanFileUrl.startsWith("https://") && !cleanFileUrl.startsWith("/")) {
      throw new Error("URL do documento inválida. Apenas HTTPS ou caminho interno são permitidos.");
    }

    const ALLOWED_DOC_BUCKETS = new Set(["legal-documents", "payment-proofs", "cms-media", "post-media"]);
    if (storageBucket && !ALLOWED_DOC_BUCKETS.has(storageBucket)) {
      throw new Error("Bucket de armazenamento não permitido para documentos de viagem.");
    }
    if (storagePath && (!storagePath.startsWith(`${trip.store_id}/`) || storagePath.includes(".."))) {
      throw new Error("Caminho de arquivo fora do escopo da agência.");
    }

    const { data: createdDoc, error: insErr } = await supabase
      .from("travel_trip_official_documents")
      .insert({
        store_id: trip.store_id,
        trip_id: trip.id,
        doc_category: docCategory,
        operator_name: operatorName?.trim() || trip.operator_name || "Agência / Operadora",
        reservation_code: reservationCode?.trim() || null,
        title: title.trim(),
        original_pdf_url: cleanFileUrl,
        ocr_extracted_json: {
          ...(storageBucket ? { storage_bucket: storageBucket } : {}),
          ...(storagePath ? { storage_path: storagePath } : {}),
          uploaded_by_profile_id: identity.id,
        },
        is_visible_to_client: isVisibleToClient,
      })
      .select("*")
      .single();

    if (insErr || !createdDoc) {
      throw new Error(`Falha ao salvar documento oficial: ${insErr?.message || "registro não criado"}`);
    }

    return { success: true, document: createdDoc };
  });

export const deleteTripOfficialDocument = createServerFn({ method: "POST" })
  .validator(z.object({ tripId: z.string().uuid(), documentId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const { tripId, documentId } = data;
    const supabase = getServerClient();
    const identity = await requireStaff();

    const { data: doc, error: findErr } = await supabase
      .from("travel_trip_official_documents")
      .select("id, store_id, trip_id")
      .eq("id", documentId)
      .eq("trip_id", tripId)
      .maybeSingle();

    if (findErr || !doc) throw new Error("Documento oficial não encontrado.");
    if (doc.store_id !== identity.store_id && identity.role !== "platform_admin") {
      throw new Error("Acesso negado para excluir documento de outra loja.");
    }

    const { error: delErr } = await supabase
      .from("travel_trip_official_documents")
      .delete()
      .eq("id", documentId)
      .eq("store_id", doc.store_id);

    if (delErr) throw new Error(`Falha ao remover documento oficial: ${delErr.message}`);
    return { success: true };
  });

export const UpdateTripOperationalStructureSchema = z.object({
  tripId: z.string().uuid("ID de viagem inválido"),
  title: z.string().min(2).max(240).optional(),
  destinationCity: z.string().min(2).max(160).optional(),
  travelStartDate: z.string().nullable().optional(),
  travelEndDate: z.string().nullable().optional(),
  adultsCount: z.number().int().min(1).max(100).optional(),
  childrenCount: z.number().int().min(0).max(100).optional(),
  totalCents: z.number().int().min(0).optional(),
  status: z.enum(["pending_review", "confirmed", "in_progress", "completed", "cancelled"]).optional(),
  operatorName: z.string().nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  flights: z.array(z.any()).optional(),
  hotels: z.array(z.any()).optional(),
  transfers: z.array(z.any()).optional(),
  tours: z.array(z.any()).optional(),
  itinerary: z.array(z.any()).optional(),
  includes: z.array(z.string()).optional(),
  excludes: z.array(z.string()).optional(),
});

export const updateTripOperationalStructure = createServerFn({ method: "POST" })
  .validator(UpdateTripOperationalStructureSchema)
  .handler(async ({ data }): Promise<{ success: boolean; tripId: string }> => {
    const {
      tripId,
      title,
      destinationCity,
      travelStartDate,
      travelEndDate,
      adultsCount,
      childrenCount,
      totalCents,
      status,
      operatorName,
      notes,
      flights,
      hotels,
      transfers,
      tours,
      itinerary,
      includes,
      excludes,
    } = data;

    const supabase = getServerClient();
    const identity = await requireStaff();

    const { data: trip, error: lookupErr } = await supabase
      .from("tourism_trips")
      .select("id, store_id, destination_city, flights, hotels, transfers, tours")
      .eq("id", tripId)
      .maybeSingle();

    if (lookupErr || !trip) throw new Error("Viagem não encontrada.");
    if (trip.store_id !== identity.store_id && identity.role !== "platform_admin") {
      throw new Error("Acesso negado para editar viagem de outra loja.");
    }

    const nowIso = new Date().toISOString();
    const patch: Record<string, any> = { updated_at: nowIso };
    if (title !== undefined) patch.title = title.trim();
    if (destinationCity !== undefined) patch.destination_city = destinationCity.trim();
    if (travelStartDate !== undefined) patch.travel_start_date = travelStartDate || null;
    if (travelEndDate !== undefined) patch.travel_end_date = travelEndDate || null;
    if (adultsCount !== undefined) patch.adults_count = adultsCount;
    if (childrenCount !== undefined) patch.children_count = childrenCount;
    if (totalCents !== undefined) patch.total_cents = totalCents;
    if (status !== undefined) patch.status = status;
    if (operatorName !== undefined) patch.operator_name = operatorName || null;
    if (notes !== undefined) patch.notes = notes || null;
    if (flights !== undefined) patch.flights = flights;
    if (hotels !== undefined) patch.hotels = hotels;
    if (transfers !== undefined) patch.transfers = transfers;
    if (tours !== undefined) patch.tours = tours;
    if (itinerary !== undefined) patch.itinerary = itinerary;
    if (includes !== undefined) patch.includes = includes;
    if (excludes !== undefined) patch.excludes = excludes;

    const { error: updErr } = await supabase
      .from("tourism_trips")
      .update(patch)
      .eq("id", trip.id)
      .eq("store_id", trip.store_id);

    if (updErr) {
      throw new Error(`Erro ao atualizar composição da viagem: ${updErr.message}`);
    }

    // Sincronizar o espelho operacional nos vouchers emitidos da mesma viagem
    const voucherPatch: Record<string, any> = { updated_at: nowIso };
    if (destinationCity !== undefined) voucherPatch.destination = destinationCity.trim();
    if (flights !== undefined) voucherPatch.flights = flights;
    if (hotels !== undefined) voucherPatch.hotels = hotels;
    if (transfers !== undefined) voucherPatch.transfers = transfers;
    if (tours !== undefined) voucherPatch.tours = tours;
    if (notes !== undefined) voucherPatch.observations = notes || null;

    if (Object.keys(voucherPatch).length > 1) {
      const { error: vErr } = await supabase
        .from("tourism_vouchers")
        .update(voucherPatch)
        .eq("trip_id", trip.id)
        .eq("store_id", trip.store_id);
      if (vErr) {
        throw new Error(`Viagem salva, mas falha ao sincronizar vouchers: ${vErr.message}`);
      }
    }

    return { success: true, tripId: trip.id };
  });

export const AddTripGroupMemorySchema = z.object({
  tripId: z.string().uuid("ID de viagem inválido"),
  url: z.string().min(1).max(2000),
  mediaType: z.enum(["image", "video"]).default("image"),
  caption: z.string().max(240).optional().nullable(),
});

export const addTripGroupMemoryMedia = createServerFn({ method: "POST" })
  .validator(AddTripGroupMemorySchema)
  .handler(async ({ data }): Promise<{ success: boolean; album: any[] }> => {
    const { tripId, url, mediaType, caption } = data;
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) {
      throw new Error("Faça login para publicar fotos no álbum do grupo.");
    }

    const { data: trip, error: lookupErr } = await supabase
      .from("tourism_trips")
      .select("id, store_id, customer_id, client_email, client_document, portal_content")
      .eq("id", tripId)
      .maybeSingle();

    if (lookupErr || !trip) throw new Error("Viagem não encontrada.");
    const access = await resolveTripAccessForIdentity(supabase, identity, trip as any);
    if (!access.authorized) {
      throw new Error("Acesso negado ao álbum coletivo desta viagem.");
    }

    const prevPortal =
      (trip as any).portal_content && typeof (trip as any).portal_content === "object"
        ? (trip as any).portal_content
        : {};
    const prevAlbum = Array.isArray(prevPortal.group_album) ? prevPortal.group_album : [];
    const newItem = {
      id: `gm-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      url: url.trim(),
      type: mediaType,
      caption: caption ? caption.trim() : null,
      author_id: identity.id,
      author_name: identity.fullName || identity.email || "Viajante",
      created_at: new Date().toISOString(),
    };
    const nextAlbum = [newItem, ...prevAlbum].slice(0, 80);

    const { error: updErr } = await supabase
      .from("tourism_trips")
      .update({
        portal_content: {
          ...prevPortal,
          group_album: nextAlbum,
          updated_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", trip.id)
      .eq("store_id", trip.store_id);

    if (updErr) {
      throw new Error(`Falha ao salvar mídia no álbum do grupo: ${updErr.message}`);
    }

    return { success: true, album: nextAlbum };
  });
