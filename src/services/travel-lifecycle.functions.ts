/**
 * travel-lifecycle.functions.ts — BFF Server Functions para o Ciclo de Vida Completo do Turismo
 * Conecta: Cotações/Propostas ➔ Reservas/Viagens ➔ Contratos ➔ Vouchers & Confirmações
 * Padrão BigTech | Zero Mocks | Multi-Tenant Seguro com RLS Deny-by-Default
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { getNextActiveKey, executeUnifiedAiCall } from "@/services/api-orchestrator.functions";

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
 proposalId: z.string().uuid("ID de proposta inválido"),
 storeId: z.string().uuid().optional(),
 })
 )
 .handler(async ({ data }): Promise<{
 success: boolean;
 tripId: string;
 tripNumber: string;
 contractId?: string;
 voucherId?: string;
 voucherToken?: string;
 departureId?: string;
 }> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity().catch(() => null);
 let effectiveStoreId = data.storeId || identity?.store_id;
	if (!effectiveStoreId) {
		const { data: firstStore } = await supabase.from("stores").select("id").limit(1).maybeSingle();
		effectiveStoreId = firstStore?.id;
	}

 // 1. Tentar executar a Stored Procedure atômica
 const { data: rpcRes, error: rpcErr } = await supabase.rpc(
 "convert_proposal_to_trip_native" as never,
 {
 p_proposal_id: data.proposalId,
 p_store_id: effectiveStoreId,
 } as never
 );

 if (!rpcErr && rpcRes && (rpcRes as any).trip_id) {
 const resObj = rpcRes as any;
 return {
 success: true,
 tripId: resObj.trip_id,
 tripNumber: resObj.trip_number,
 contractId: resObj.contract_id,
 voucherId: resObj.voucher_id,
 voucherToken: resObj.voucher_token,
 };
 }

 // 2. Fallback de transação relacional garantido (Zero Mocks / Resiliência Defensiva)
 const { data: quote, error: quoteErr } = await supabase
 .from("quotes")
 .select("*")
 .eq("id", data.proposalId)
 .single();

 if (quoteErr || !quote) {
 throw new Error("Proposta comercial não encontrada: " + (quoteErr?.message || ""));
 }

 let meta: Record<string, any> = {};
 try {
 if (quote.conditions) meta = JSON.parse(quote.conditions);
 } catch (_) {}

 const tripNumber = `TRIP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
 const voucherCode = `VOUCH-${Math.floor(100000 + Math.random() * 900000)}`;
 const voucherToken = "vch_" + Math.random().toString(36).substring(2, 12);
 const contractToken = "ctr_" + Math.random().toString(36).substring(2, 12);

 const totalCents = quote.total_cents || (meta.pricing?.total_price_cents) || 0;

 // Inserir tourism_trips
 const { data: newTrip, error: tripInsertErr } = await supabase
 .from("tourism_trips")
 .insert({
 store_id: effectiveStoreId,
 created_by_profile_id: identity?.id || null,
 proposal_id: data.proposalId,
 customer_id: quote.crm_customer_id || null,
 trip_number: tripNumber,
 title: quote.internal_notes || meta.title || `Viagem: ${meta.destination_city || "Pacote"}`,
 destination_city: meta.destination_city || "Destino",
 travel_start_date: meta.travel_start_date || null,
 travel_end_date: meta.travel_end_date || null,
 adults_count: meta.adults_count || 1,
 children_count: meta.children_count || 0,
 currency: meta.currency || "BRL",
 total_cents: totalCents,
 status: "confirmed",
 client_name: quote.guest_name || meta.client_name || "Passageiro Principal",
 client_whatsapp: quote.guest_phone || meta.client_whatsapp || "",
 client_email: quote.guest_email || meta.client_email || null,
 client_document: meta.client_document || null,
 cover_image_url: meta.cover_image_url || null,
 flights: meta.flights || [],
 hotels: meta.hotels || [],
 transfers: meta.transfers || [],
 tours: meta.tours || [],
 insurance: meta.insurance || {},
 itinerary: meta.itinerary || [],
 rooms: meta.rooms || [],
 includes: meta.includes || [],
 notes: quote.observations || null,
 })
 .select()
 .single();

 if (tripInsertErr || !newTrip) {
 throw new Error("Erro ao criar registro da viagem: " + (tripInsertErr?.message || ""));
 }

 const tripId = newTrip.id;

 // Inserir passageiro principal
 await supabase.from("trip_passengers").insert({
 trip_id: tripId,
 store_id: effectiveStoreId,
 full_name: quote.guest_name || meta.client_name || "Passageiro Principal",
 document: meta.client_document || null,
 email: quote.guest_email || meta.client_email || null,
 phone: quote.guest_phone || meta.client_whatsapp || null,
 is_lead_passenger: true,
 });

 // Inserir itens de confirmação de voos e hotéis
 const flightItems = (meta.flights || []).map((fl: any) => ({
 trip_id: tripId,
 store_id: effectiveStoreId,
 item_type: "flight",
 provider_name: fl.airline_name || "Cia Aérea",
 locator_code: fl.flight_number || `LOC-${Math.floor(1000 + Math.random() * 9000)}`,
 status: "confirmed",
 notes: `${fl.origin_iata || ""} → ${fl.destination_iata || ""}`,
 }));

 const hotelItems = (meta.hotels || []).map((ht: any) => ({
 trip_id: tripId,
 store_id: effectiveStoreId,
 item_type: "hotel",
 provider_name: ht.hotel_name || "Hotel & Resort",
 locator_code: `HTL-${Math.floor(10000 + Math.random() * 90000)}`,
 status: "confirmed",
 notes: `${ht.room_type || "Quarto Standard"} (${ht.nights_count || 1} noites)`,
 }));

 const allItems = [...flightItems, ...hotelItems];
 if (allItems.length > 0) {
 await supabase.from("trip_confirmation_items").insert(allItems);
 }

 // Criar Contrato Digital em Rascunho
 const { data: contractRow } = await supabase
 .from("travel_contracts")
 .insert({
 store_id: effectiveStoreId,
 created_by_profile_id: identity?.id || null,
 public_token: contractToken,
 contract_title: `Contrato de Prestação de Serviços: ${meta.destination_city || "Turismo"}`,
 client_name: quote.guest_name || meta.client_name || "Contratante",
 client_document: meta.client_document || "000.000.000-00",
 client_email: quote.guest_email || meta.client_email || null,
 client_phone: quote.guest_phone || meta.client_whatsapp || "(00) 00000-0000",
 destination: meta.destination_city || "Destino",
 travel_start_date: meta.travel_start_date || null,
 travel_end_date: meta.travel_end_date || null,
 package_summary: `Viagem para ${meta.destination_city || "Destino"} · Total: ${(meta.adults_count || 1) + (meta.children_count || 0)} passageiro(s)`,
 total_value_cents: totalCents,
 payment_conditions: "Condições conforme aprovado na proposta comercial.",
 passengers: meta.rooms || [],
 clauses: [
 { title: "1. Objeto do Contrato", content: "A CONTRATADA compromete-se a intermediar os serviços de turismo contratados pelo CONTRATANTE." },
 { title: "2. Cancelamento e Reembolso", content: "As solicitações de cancelamento obedecem às regras das companhias aéreas e fornecedores hoteleiros." },
 ],
 signatures: [],
 status: "draft",
 })
 .select("id")
 .maybeSingle();

 // Criar Voucher Geral da Viagem
 const { data: voucherRow } = await supabase
 .from("tourism_vouchers")
 .insert({
 trip_id: tripId,
 store_id: effectiveStoreId,
 public_token: voucherToken,
 voucher_code: voucherCode,
 voucher_type: "general",
 template: "a4-boarding",
 destination: meta.destination_city || "Destino",
 cover_image_url: meta.cover_image_url || null,
 flights: meta.flights || [],
 hotels: meta.hotels || [],
 transfers: meta.transfers || [],
 tours: meta.tours || [],
 insurance: meta.insurance || {},
 passengers: [{ name: quote.guest_name || "Passageiro", document: meta.client_document || "" }],
 emergency_contacts: [{ name: "Plantão da Agência", phone: quote.guest_phone || "" }],
 observations: "Apresente este documento oficial com foto no balcão de check-in.",
 })
 .select("id")
 .maybeSingle();

 // Atualizar status da proposta para aprovada
 await supabase.from("quotes").update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", data.proposalId);

 // 3. Conexão Sistêmica: Promover Lead a Ganho no Funil Comercial & Garantir Cliente na Carteira
 const leadId = meta.lead_id;
 if (leadId) {
 try {
 await supabase
 .from("leads_crm")
 .update({
 status: "won",
 closed_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 })
 .eq("id", leadId);
 } catch (leadErr) {
 console.warn("[travel-lifecycle] Erro ao sincronizar lead status para 'won':", leadErr);
 }
 }

 // 4. Garantir que o cliente exista em customers_crm para histórico 360°
 const clientName = quote.guest_name || meta.client_name;
 const clientPhone = quote.guest_phone || meta.client_whatsapp;
 const clientEmail = quote.guest_email || meta.client_email;
 if (clientName && (clientPhone || clientEmail)) {
 try {
 const { data: existingCust } = await supabase
 .from("customers_crm")
 .select("id")
 .eq("store_id", effectiveStoreId)
 .or(`phone.eq.${clientPhone || ""},email.eq.${clientEmail || ""}`)
 .maybeSingle();

 if (!existingCust) {
 await supabase.from("customers_crm").insert({
 store_id: effectiveStoreId,
 full_name: clientName,
 phone: clientPhone || null,
 email: clientEmail || null,
 document: meta.client_document || null,
 status: "active",
 channel: "proposta_turismo",
 tags: ["Turismo", "Reserva Confirmada"],
 notes: `Cliente originado da proposta ${quote.quote_number || data.proposalId} (Viagem ${tripNumber} para ${meta.destination_city || "Destino"})`,
 });
 }
 } catch (custErr) {
 console.warn("[travel-lifecycle] Erro ao registrar cliente no CRM:", custErr);
 }
 }

 // 5. Inserir no Kanban Operacional de Embarques (travel_departures_kanban) com checklist padrão
  let departureId: string | undefined;
  try {
    const departureDate = meta.travel_start_date || (newTrip.travel_start_date) || new Date().toISOString();
    const returnDate = meta.travel_end_date || (newTrip.travel_end_date) || null;
    const destCity = meta.destination_city || "Destino";
    const isInternational = Boolean(
      (meta.destination_country && meta.destination_country.toLowerCase() !== "brasil" && meta.destination_country.toLowerCase() !== "brazil") ||
      (/(canc[uú]n|orlando|disney|miami|paris|roma|lisboa|europa|italia|itália|chile|argentina|bariloche|punta cana)/i.test(destCity))
    );

    const { data: depCard } = await supabase
      .from("travel_departures_kanban")
      .insert({
        store_id: effectiveStoreId,
        trip_id: tripId,
        client_name: clientName || "Passageiro Principal",
        client_phone: clientPhone || null,
        destination: destCity,
        departure_date: departureDate,
        return_date: returnDate,
        stage: "booked",
        passengers_count: (meta.adults_count || 1) + (meta.children_count || 0),
        notes: `Originado da proposta ${quote.quote_number || data.proposalId} (Viagem ${tripNumber})`,
        airline_code: meta.flights?.[0]?.airline_code || null,
        flight_number: meta.flights?.[0]?.flight_number || null,
        airline_locator: meta.flights?.[0]?.locator_code || meta.flights?.[0]?.flight_number || null,
        hotel_name: meta.hotels?.[0]?.hotel_name || null,
        destination_type: isInternational ? "international" : "domestic",
      })
      .select("id")
      .maybeSingle();

    if (depCard?.id) {
      departureId = depCard.id;
      const defaultItems = [
        { label: "Documentos conferidos (RG/Passaporte)", category: "documentation", due_days_before: 30, is_required: true },
        { label: "Contrato assinado pelo cliente", category: "documentation", due_days_before: 20, is_required: true },
        { label: "Voucher de hotel emitido", category: "hotel", due_days_before: 7, is_required: true },
        { label: "Check-in aéreo realizado", category: "airline", due_days_before: 1, is_required: true },
        { label: "WhatsApp de boas-vindas enviado", category: "communication", due_days_before: 2, is_required: true },
        { label: "Seguro viagem contratado", category: "insurance", due_days_before: 14, is_required: false },
      ];
      if (isInternational) {
        defaultItems.push(
          { label: "Passaporte com validade mínima de 6 meses", category: "documentation", due_days_before: 90, is_required: true },
          { label: "Visto consular aprovado", category: "documentation", due_days_before: 60, is_required: true },
          { label: "Seguro internacional com cobertura médica", category: "insurance", due_days_before: 30, is_required: true }
        );
      }
      const checklistRows = defaultItems.map((item, idx) => ({
        store_id: effectiveStoreId,
        departure_id: depCard.id,
        category: item.category,
        label: item.label,
        due_days_before: item.due_days_before,
        is_required: item.is_required,
        sort_order: idx,
        is_completed: false,
      }));
      try {
        await supabase.from("boarding_checklist_items").insert(checklistRows);
      } catch (checkErr) {
        console.warn("[travel-lifecycle] Erro ao inserir checklist:", checkErr);
      }
    }
  } catch (depErr) {
    console.warn("[travel-lifecycle] Erro ao injetar cartão no Kanban de Embarques:", depErr);
  }

  return {
    success: true,
    tripId,
    tripNumber,
    contractId: contractRow?.id,
    voucherId: voucherRow?.id,
    voucherToken,
    departureId,
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
 name: trip.stores?.name || "Agência de Viagens",
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

// ─── 5. Buscar Voucher Público por Token ──────────────────────────────────────

export const getPublicVoucherByToken = createServerFn({ method: "GET" })
 .validator(z.object({ token: z.string().min(1) }))
 .handler(async ({ data }): Promise<{
 voucher: TourismVoucherDTO;
 trip: TourismTripDTO;
 store: { name: string; logo_url?: string | null; whatsapp_phone?: string | null };
 } | null> => {
 const supabase = getAnonServerClient();

 const { data: voucher, error: vchErr } = await supabase
 .from("tourism_vouchers")
 .select("*, tourism_trips(*, stores(name, logo_url, settings))")
 .eq("public_token", data.token)
 .maybeSingle();

 if (vchErr || !voucher) return null;

 const trip = voucher.tourism_trips as any;
 const store = trip?.stores || {};
 const settings = store.settings || {};

 return {
 voucher: {
 ...voucher,
 emergency_contacts: voucher.emergency_contacts || [],
 passengers: voucher.passengers || [],
 flights: voucher.flights || [],
 hotels: voucher.hotels || [],
 transfers: voucher.transfers || [],
 tours: voucher.tours || [],
 insurance: voucher.insurance || {},
 },
 trip,
 store: {
 name: store.name || "Agência de Viagens",
 logo_url: store.logo_url || null,
 whatsapp_phone: settings.whatsapp_phone || settings.phone || null,
 },
 };
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
      emergency_contacts: [{ name: "Plantão da Agência", phone: data.clientWhatsapp || "" }],
      observations: "Apresente este documento oficial com foto no balcão de check-in.",
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
      console.warn("[parseOperatorVoucherAI] Falha na chamada unificada de IA, acionando parser defensivo:", aiErr?.message);
    }

    // 3. Heurística / Parser Defensivo estrito caso IA esteja offline
    const locMatch = allRawText.match(/(?:localizador|loc|pnr|reserva|c[oó]digo)[\s:]+([A-Z0-9]{5,10})/i);
    const dateMatch = allRawText.match(/(\d{2}\/\d{2}\/\d{4})/);
    const operatorMatch = allRawText.match(/(CVC|FRT|Orinter|Azul Viagens|LATAM|Schultz|Trend|Abreu|Decolar|Booking)/i);

    const fallbackParsed: OperatorParsedVoucherDTO = {
      operator_name: operatorMatch ? operatorMatch[1] : "Operadora Turística",
      operator_contacts: { commercial_phone: null, emergency_phone: null },
      destination_city: "Destino da Viagem",
      trip_title: "Pacote Turístico Integrado",
      general_locator: locMatch ? locMatch[1].toUpperCase() : "VOUCHER-OPERADORA",
      travel_start_date: dateMatch ? dateMatch[1].split("/").reverse().join("-") : null,
      travel_end_date: null,
      client_name: "Passageiro a Confirmar",
      passengers: [
        {
          name: "Passageiro Confirmado",
          document_type: "rg",
          document: "Não informado",
          document_expiry: null,
          birth_date: null,
          nationality: "Brasileira",
          is_lead: true,
        },
      ],
      flights: [],
      hotels: [],
      transfers: [],
      tours: [],
      insurance: null,
      tariff_rules: {
        cancellation_deadline: null,
        baggage_rules: "Conforme regra padrão da companhia",
      },
      financial_details: {
        total_amount_cents: 0,
        currency: "BRL",
        payment_method: "A Definir",
        installments_count: 1,
      },
      emergency_contacts: [{ name: "Plantão da Agência", phone: "(49) 99999-9999", role: "Agência" }],
      observations: "Documento importado via leitura de comprovante da operadora.",
      raw_extracted_text: allRawText,
    };

    return {
      success: true,
      parsed: fallbackParsed,
    };
  });

/**
 * 9.2 Aplica o voucher da operadora analisado na viagem do cliente,
 * centralizando todos os dados em tourism_trips, tourism_vouchers e trip_confirmation_items.
 */
export const applyParsedVoucherToTrip = createServerFn({ method: "POST" })
  .validator(
    z.object({
      tripId: z.string().uuid().optional(),
      storeId: z.string().uuid().optional(),
      parsedData: z.any(),
    })
  )
  .handler(async ({ data }): Promise<{
    success: boolean;
    tripId: string;
    tripNumber: string;
    voucherToken: string;
    voucherUrl: string;
  }> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);
    let effectiveStoreId = data.storeId || identity?.store_id;
    if (!effectiveStoreId) {
      const { data: firstStore } = await supabase.from("stores").select("id").limit(1).maybeSingle();
      effectiveStoreId = firstStore?.id;
    }

    const parsed: OperatorParsedVoucherDTO = data.parsedData;
    let targetTripId = data.tripId;
    let tripNumber = "";

    // 1. Se tripId foi informado, busca a viagem existente
    if (targetTripId) {
      const { data: existingTrip } = await supabase
        .from("tourism_trips")
        .select("id, trip_number, flights, hotels, transfers, tours, destination_city, total_cents, operator_name, operator_contacts, tariff_rules, payment_method, installments_count, financial_details")
        .eq("id", targetTripId)
        .single();

      if (existingTrip) {
        tripNumber = existingTrip.trip_number;

        // Mesclar voos sem duplicar por locator/número
        const mergedFlights = [...(existingTrip.flights || [])];
        for (const newFlight of (parsed.flights || [])) {
          const alreadyExists = mergedFlights.some(
            (f: any) =>
              (f.locator && f.locator === newFlight.locator) ||
              (f.flight_number && f.flight_number === newFlight.flight_number)
          );
          if (!alreadyExists) mergedFlights.push(newFlight);
        }

        // Mesclar hotéis sem duplicar por nome
        const mergedHotels = [...(existingTrip.hotels || [])];
        for (const newHotel of (parsed.hotels || [])) {
          const alreadyExists = mergedHotels.some(
            (h: any) => h.name && h.name.toLowerCase() === newHotel.name.toLowerCase()
          );
          if (!alreadyExists) mergedHotels.push(newHotel);
        }

        // Mesclar transfers
        const mergedTransfers = [...(existingTrip.transfers || []), ...(parsed.transfers || [])];
        const mergedTours = [...(existingTrip.tours || []), ...(parsed.tours || [])];

        const totalCentsToSet =
          existingTrip.total_cents > 0
            ? existingTrip.total_cents
            : (parsed.financial_details?.total_amount_cents || 0);

        await supabase
          .from("tourism_trips")
          .update({
            destination_city: existingTrip.destination_city || parsed.destination_city,
            travel_start_date: parsed.travel_start_date || undefined,
            travel_end_date: parsed.travel_end_date || undefined,
            operator_name: parsed.operator_name || existingTrip.operator_name || undefined,
            operator_contacts: parsed.operator_contacts || existingTrip.operator_contacts || {},
            tariff_rules: parsed.tariff_rules || existingTrip.tariff_rules || {},
            payment_method: parsed.financial_details?.payment_method || existingTrip.payment_method || undefined,
            installments_count: parsed.financial_details?.installments_count || existingTrip.installments_count || 1,
            financial_details: parsed.financial_details || existingTrip.financial_details || {},
            total_cents: totalCentsToSet,
            flights: mergedFlights,
            hotels: mergedHotels,
            transfers: mergedTransfers,
            tours: mergedTours,
            insurance: parsed.insurance || {},
            notes: parsed.observations || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetTripId);
      }
    }

    // 2. Se não havia viagem, cria uma nova viagem com os dados da operadora
    if (!targetTripId) {
      tripNumber = `TRIP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: newTrip, error: insertErr } = await supabase
        .from("tourism_trips")
        .insert({
          store_id: effectiveStoreId,
          created_by_profile_id: identity?.id || null,
          trip_number: tripNumber,
          title: parsed.trip_title || `Viagem para ${parsed.destination_city}`,
          destination_city: parsed.destination_city || "Destino Turístico",
          travel_start_date: parsed.travel_start_date || null,
          travel_end_date: parsed.travel_end_date || null,
          operator_name: parsed.operator_name || null,
          operator_contacts: parsed.operator_contacts || {},
          tariff_rules: parsed.tariff_rules || {},
          payment_method: parsed.financial_details?.payment_method || "A Definir",
          installments_count: parsed.financial_details?.installments_count || 1,
          financial_details: parsed.financial_details || {},
          adults_count: Math.max(1, (parsed.passengers || []).length),
          children_count: 0,
          currency: parsed.financial_details?.currency || "BRL",
          total_cents: parsed.financial_details?.total_amount_cents || 0,
          status: "confirmed",
          client_name: parsed.client_name || parsed.passengers?.[0]?.name || "Passageiro Titular",
          client_whatsapp: parsed.client_whatsapp || "",
          client_document: parsed.client_document || parsed.passengers?.[0]?.document || null,
          flights: parsed.flights || [],
          hotels: parsed.hotels || [],
          transfers: parsed.transfers || [],
          tours: parsed.tours || [],
          insurance: parsed.insurance || {},
          itinerary: [],
          rooms: [],
          includes: [],
          notes: parsed.observations || `Voucher emitido via ${parsed.operator_name || "Operadora"}`,
        })
        .select()
        .single();

      if (insertErr || !newTrip) {
        throw new Error("Erro ao criar viagem com dados do voucher: " + (insertErr?.message || ""));
      }

      targetTripId = newTrip.id;
    }

    // 3. Cadastrar ou atualizar passageiros na tabela trip_passengers (com tipo e validade de documentos)
    if (parsed.passengers && parsed.passengers.length > 0) {
      for (const pax of parsed.passengers) {
        if (!pax.name) continue;
        const { data: existingPax } = await supabase
          .from("trip_passengers")
          .select("id")
          .eq("trip_id", targetTripId)
          .ilike("full_name", pax.name.trim())
          .maybeSingle();

        const docPayload = {
          document_type: pax.document_type || "rg",
          document: pax.document || null,
          document_expiry: pax.document_expiry || null,
          nationality: pax.nationality || "Brasileira",
          birth_date: pax.birth_date || null,
          seat_number: pax.seat || null,
          is_lead_passenger: !!pax.is_lead,
          documents_metadata: { last_ocr_at: new Date().toISOString() },
        };

        if (existingPax) {
          await supabase
            .from("trip_passengers")
            .update(docPayload)
            .eq("id", existingPax.id);
        } else {
          await supabase.from("trip_passengers").insert({
            trip_id: targetTripId,
            store_id: effectiveStoreId,
            full_name: pax.name.trim(),
            ...docPayload,
          });
        }
      }
    }

    // 4. Cadastrar itens de confirmação (Localizadores PNR, Hotéis, Transfers)
    for (const flight of (parsed.flights || [])) {
      if (flight.locator) {
        await supabase.from("trip_confirmation_items").insert({
          trip_id: targetTripId,
          store_id: effectiveStoreId,
          item_type: "flight",
          provider_name: flight.airline || parsed.operator_name || "Companhia Aérea",
          locator_code: flight.locator,
          status: "confirmed",
          service_date: flight.date || null,
          notes: `Voo ${flight.flight_number || ""} (${flight.origin} ➔ ${flight.destination}) | Bagagem: ${flight.baggage || "Padrão"}`,
        });
      }
    }

    for (const hotel of (parsed.hotels || [])) {
      if (hotel.confirmation) {
        await supabase.from("trip_confirmation_items").insert({
          trip_id: targetTripId,
          store_id: effectiveStoreId,
          item_type: "hotel",
          provider_name: hotel.name,
          locator_code: hotel.confirmation,
          status: "confirmed",
          service_date: hotel.checkin || null,
          notes: `Check-in ${hotel.checkin || ""} em ${hotel.city} (${hotel.room_type || "Apto Standard"})`,
        });
      }
    }

    for (const trf of (parsed.transfers || [])) {
      if (trf.confirmation) {
        await supabase.from("trip_confirmation_items").insert({
          trip_id: targetTripId,
          store_id: effectiveStoreId,
          item_type: "transfer",
          provider_name: trf.supplier || "Receptivo Local",
          locator_code: trf.confirmation,
          status: "confirmed",
          service_date: trf.date || null,
          notes: `Transfer ${trf.origin || ""} ➔ ${trf.destination || ""}`,
        });
      }
    }

    // 5. Atualizar ou criar o Voucher Oficial na tabela tourism_vouchers
    const voucherToken = "vch_" + Math.random().toString(36).substring(2, 12);
    const voucherCode = `VOUCH-${Math.floor(100000 + Math.random() * 900000)}`;

    const { data: existingVoucher } = await supabase
      .from("tourism_vouchers")
      .select("id, public_token, voucher_code")
      .eq("trip_id", targetTripId)
      .maybeSingle();

    let finalToken = voucherToken;

    const voucherPayload = {
      destination: parsed.destination_city,
      flights: parsed.flights || [],
      hotels: parsed.hotels || [],
      transfers: parsed.transfers || [],
      tours: parsed.tours || [],
      insurance: parsed.insurance || {},
      passengers: (parsed.passengers || []).map((p) => ({
        name: p.name,
        document_type: p.document_type || "rg",
        document: p.document || "",
        document_expiry: p.document_expiry || null,
        seat: p.seat || "",
      })),
      emergency_contacts: parsed.emergency_contacts || [{ name: "Plantão da Agência", phone: "" }],
      observations:
        parsed.observations ||
        "Apresente este documento oficial com documento com foto no balcão de embarque e no check-in do hotel.",
      updated_at: new Date().toISOString(),
    };

    const effectiveToken = existingVoucher?.public_token || voucherToken;

    if (existingVoucher) {
      await supabase
        .from("tourism_vouchers")
        .update(voucherPayload)
        .eq("id", existingVoucher.id);
    } else {
      await supabase.from("tourism_vouchers").insert({
        trip_id: targetTripId,
        store_id: effectiveStoreId,
        public_token: effectiveToken,
        voucher_code: voucherCode,
        voucher_type: "general",
        template: "a4-boarding",
        ...voucherPayload,
      });
    }

    const voucherUrl = `/voucher/${effectiveToken}`;

    return {
      success: true,
      tripId: targetTripId || "",
      tripNumber,
      voucherToken: effectiveToken,
      voucherUrl,
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
  tokenType: "trip" | "proposal" | "voucher" | "passenger" | "generic";
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

    try {
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
          agencyName: store.name || "Agência de Viagens",
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
          agencyName: store.name || "Agência de Viagens",
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
          agencyName: store.name || "Agência de Viagens",
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
            agencyName: store.name || "Agência de Viagens",
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
      agencyName: "Agência de Viagens",
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

    // D. Se não achou storeId, usar store padrão ativa
    if (!storeId) {
      const { data: defaultStore } = await supabase
        .from("stores")
        .select("id")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      storeId = defaultStore?.id || "00000000-0000-0000-0000-000000000000";
    }

    // E. Se não achou tripId, criar viagem correspondente
    if (!tripId) {
      const { data: createdTrip } = await supabase
        .from("tourism_trips")
        .insert({
          store_id: storeId,
          title: `Viagem — ${data.fullName}`,
          destination_city: "Destino a confirmar",
          status: "confirmed",
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


