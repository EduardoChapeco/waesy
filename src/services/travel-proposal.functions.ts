import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { sendWhatsAppNotification } from "./integrations.functions";

// ─── Tipos e Contratos de Domínio ─────────────────────────────────────────────

export type ProposalCanvasFormat =
  | "a4-portrait"
  | "a4-landscape"
  | "story-916"
  | "presentation-169"
  | "letter-portrait";

export type ProposalStatus = "draft" | "sent" | "approved" | "rejected" | "expired";

export interface FlightSegmentDTO {
  id?: string;
  type?: "outbound" | "return" | "round_trip";
  airline?: string;
  airline_name?: string;
  airline_code?: string;
  flight_number?: string;
  origin?: string;
  origin_iata?: string;
  origin_city?: string;
  destination?: string;
  destination_iata?: string;
  destination_city?: string;
  departure_date?: string;
  departure_time?: string;
  arrival_time?: string;
  cabin_class?: string;
  baggage?: string;
  baggage_included?: string | boolean;
  stops?: number;
  stops_count?: number;
}

export interface HotelDTO {
  id?: string;
  hotel_name: string;
  destination?: string;
  check_in?: string;
  check_out?: string;
  checkin_date?: string;
  checkout_date?: string;
  nights_count?: number;
  room_type?: string;
  board_basis?: string; // Ex: "Café da manhã incluso", "All Inclusive"
  stars?: number;
  featured_image_url?: string;
  image_url?: string;
  address?: string;
  badges?: string[];
  amenities?: string[];
}

export type HotelOptionDTO = HotelDTO;

export interface ItineraryDayDTO {
  id?: string;
  day_number: number;
  date?: string;
  title: string;
  description: string;
  location?: string;
  image_url?: string;
  included_meals?: string[];
}

export interface TransferDTO {
  type: string; // Ex: "Aeroporto -> Hotel (Privativo)"
  vehicle: string;
  date?: string;
  notes?: string;
}

export interface TourOptionDTO {
  id?: string;
  title: string;
  description?: string;
  duration?: string;
  price_cents?: number;
  image_url?: string;
  included?: boolean;
  is_included?: boolean;
}

export interface TransferOptionDTO {
  id?: string;
  type?: string;
  vehicle?: string;
  vehicle_type?: string;
  description?: string;
  date?: string;
  notes?: string;
  price_cents?: number;
  is_included?: boolean;
}

export interface PricingBreakdownDTO {
  currency: string;
  base_price_cents: number;
  boarding_tax_cents: number;
  other_taxes_cents: number;
  discount_cents: number;
  total_price_cents: number;
  total_cents?: number;
  installments_options: Array<{
    installments_count: number;
    installment_value_cents: number;
    method: string;
    has_interest?: boolean;
  }>;
  payment_terms?: string;
}

export interface TravelProposalDTO {
  id: string;
  store_id?: string | null;
  agency_name: string;
  agency_logo_url?: string | null;
  agency_whatsapp?: string | null;
  agency_phone?: string | null;
  agency_email?: string | null;
  quote_id: string;
  public_token: string;
  title: string;
  subtitle?: string | null;
  cover_image_url?: string | null;
  client_name: string;
  client_whatsapp: string;
  client_email?: string | null;
  adults_count: number;
  children_count: number;
  canvas_format: ProposalCanvasFormat;
  template_theme: string;
  destination_city: string;
  travel_start_date?: string | null;
  travel_end_date?: string | null;
  flights: FlightSegmentDTO[];
  hotels: HotelDTO[];
  itinerary: ItineraryDayDTO[];
  transfers: TransferDTO[];
  tours: any[];
  rooms: any[];
  includes: string[];
  excludes: string[];
  pricing: PricingBreakdownDTO;
  special_notes?: string | null;
  status: ProposalStatus;
  valid_until?: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converte uma linha de travel_proposals ou quotes para TravelProposalDTO unificado.
 */
function rowToProposalDTO(row: any, storeRow?: any): TravelProposalDTO {
  let meta: Record<string, any> = {};
  if (row.conditions) {
    try {
      meta = typeof row.conditions === "string" ? JSON.parse(row.conditions) : row.conditions;
    } catch (_) {}
  }

  const storeSettings = storeRow?.settings || row.stores?.settings || {};
  const rawPricing = meta.pricing || row.pricing || {};

  const basePriceCents = Number(rawPricing.base_price_cents || rawPricing.basePriceCents || 0);
  const boardingTaxCents = Number(rawPricing.boarding_tax_cents || rawPricing.boardingTaxCents || 0);
  const otherTaxesCents = Number(rawPricing.other_taxes_cents || 0);
  const discountCents = Number(rawPricing.discount_cents || 0);

  const totalCents = Number(
    rawPricing.total_price_cents ??
    rawPricing.total_cents ??
    row.total_cents ??
    (basePriceCents + boardingTaxCents + otherTaxesCents - discountCents)
  ) || 0;

  const defaultPricing: PricingBreakdownDTO = {
    currency: rawPricing.currency || "BRL",
    base_price_cents: basePriceCents || totalCents,
    boarding_tax_cents: boardingTaxCents,
    other_taxes_cents: otherTaxesCents,
    discount_cents: discountCents,
    total_price_cents: totalCents,
    total_cents: totalCents,
    installments_options: rawPricing.installments_options && rawPricing.installments_options.length > 0
      ? rawPricing.installments_options
      : totalCents > 0
        ? [
            { installments_count: 1, installment_value_cents: totalCents, method: "pix", has_interest: false },
            { installments_count: 10, installment_value_cents: Math.round(totalCents / 10), method: "credit_card", has_interest: false },
          ]
        : [],
    payment_terms: rawPricing.payment_terms || "Entrada de 20% + saldo em até 10x sem juros no cartão.",
  };

  const title =
    row.title ||
    row.internal_notes ||
    meta.title ||
    `Proposta de Viagem: ${row.destination_city || meta.destination_city || "Exclusiva"}`;

  const clientName = row.client_name || row.guest_name || meta.client_name || "Cliente Especial";
  const clientWhatsapp = row.client_whatsapp || row.guest_phone || meta.client_whatsapp || "";
  const clientEmail = row.client_email || row.guest_email || meta.client_email || null;
  const destinationCity = row.destination_city || meta.destination_city || "";

  const flights = Array.isArray(row.flights) && row.flights.length > 0
    ? row.flights
    : Array.isArray(meta.flights)
      ? meta.flights
      : [];

  const hotels = Array.isArray(row.hotels) && row.hotels.length > 0
    ? row.hotels
    : Array.isArray(meta.hotels)
      ? meta.hotels
      : [];

  const itinerary = Array.isArray(row.itinerary) && row.itinerary.length > 0
    ? row.itinerary
    : Array.isArray(meta.itinerary)
      ? meta.itinerary
      : [];

  const includes = Array.isArray(row.includes) && row.includes.length > 0
    ? row.includes
    : Array.isArray(meta.includes) && meta.includes.length > 0
      ? meta.includes
      : [
          "Passagens aéreas ida e volta",
          "Hospedagem selecionada com café da manhã",
          "Seguro viagem internacional completo",
          "Suporte e conciergerie da agência 24h",
        ];

  const excludes = Array.isArray(row.excludes) && row.excludes.length > 0
    ? row.excludes
    : Array.isArray(meta.excludes) && meta.excludes.length > 0
      ? meta.excludes
      : [
          "Despesas de caráter pessoal e passeios opcionais",
          "Taxas turísticas locais de preservação ambiental recolhidas no destino",
        ];

  return {
    id: row.id,
    store_id: row.store_id || null,
    agency_name: storeRow?.name || row.stores?.name || "Excelência Tour",
    agency_logo_url: storeRow?.logo_url || row.stores?.logo_url || null,
    agency_whatsapp: storeSettings.whatsapp_phone || storeSettings.phone || "49998887777",
    quote_id: row.quote_id || row.id,
    public_token: row.public_token || meta.public_token || row.id,
    title,
    subtitle: row.subtitle || meta.subtitle || null,
    cover_image_url: row.hero_image_url || row.cover_image_url || meta.cover_image_url || null,
    client_name: clientName,
    client_whatsapp: clientWhatsapp,
    client_email: clientEmail,
    adults_count: row.adults_count ?? meta.adults_count ?? 2,
    children_count: row.children_count ?? meta.children_count ?? 0,
    canvas_format: (row.canvas_format || meta.canvas_format || "a4-portrait") as ProposalCanvasFormat,
    template_theme: row.template_theme || meta.template_theme || "editorial-flat",
    destination_city: destinationCity,
    travel_start_date: row.travel_start_date || meta.travel_start_date || null,
    travel_end_date: row.travel_end_date || meta.travel_end_date || null,
    flights,
    hotels,
    itinerary,
    transfers: Array.isArray(row.transfers) ? row.transfers : Array.isArray(meta.transfers) ? meta.transfers : [],
    tours: Array.isArray(row.tours) ? row.tours : Array.isArray(meta.tours) ? meta.tours : [],
    rooms: Array.isArray(row.rooms) ? row.rooms : Array.isArray(meta.rooms) ? meta.rooms : [],
    includes,
    excludes,
    pricing: defaultPricing,
    special_notes: row.special_notes || meta.special_notes || null,
    status: (row.status === "approved" ? "approved"
      : row.status === "rejected" ? "rejected"
      : row.status === "expired" ? "expired"
      : row.status === "sent" ? "sent"
      : "draft") as ProposalStatus,
    valid_until: row.valid_until || null,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

// ─── 1. Criação de Proposta (Workspace) ───────────────────────────────────────

export const createTravelProposalInputSchema = z.object({
  quoteId: z.string().optional(),
  title: z.string().optional().default("Proposta de Viagem Personalizada"),
  clientName: z.string().optional().default("Cliente Especial"),
  clientWhatsapp: z.string().optional().default("49998887777"),
  clientPhone: z.string().optional(),
  clientEmail: z.string().optional().nullable(),
  clientDocument: z.string().optional(),
  customerId: z.string().uuid().optional().nullable(),
  destinationCity: z.string().optional().default("Destino Especial"),
  destinationCountry: z.string().optional(),
  travelStartDate: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  travelEndDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  adultsCount: z.number().int().min(1).default(2),
  paxCount: z.number().int().optional(),
  childrenCount: z.number().int().min(0).default(0),
  infantsCount: z.number().int().min(0).default(0),
  currency: z.string().default("BRL"),
  validUntilDays: z.number().int().min(1).default(7),
  canvasFormat: z.enum(["a4-portrait", "a4-landscape", "story-916", "presentation-169", "letter-portrait"]).default("a4-portrait"),
  templateTheme: z.string().default("editorial-flat"),
  initialNotes: z.string().optional(),
  templateId: z.string().optional(),
  coverPhotoUrl: z.string().optional(),
  flights: z.array(z.any()).optional(),
  hotels: z.array(z.any()).optional(),
  itinerary: z.array(z.any()).optional(),
  transfers: z.array(z.any()).optional(),
  tours: z.array(z.any()).optional(),
  rooms: z.array(z.any()).optional(),
  includes: z.array(z.string()).optional(),
  excludes: z.array(z.string()).optional(),
  pricing: z.any().optional(),
  leadId: z.string().uuid().optional().nullable(),
});

export const createTravelProposal = createServerFn({ method: "POST" })
  .validator(createTravelProposalInputSchema)
  .handler(async ({ data: input }): Promise<{ success: boolean; id: string; publicToken: string }> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);
    let effectiveStoreId = identity?.store_id;
    if (!effectiveStoreId) {
      const { data: firstStore } = await supabase.from("stores").select("id").limit(1).maybeSingle();
      effectiveStoreId = firstStore?.id;
    }

    const publicToken = "prop_" + Math.random().toString(36).substring(2, 10);
    const quoteNumber = `PROP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + (input.validUntilDays || 7));

    const clientName = (input.clientName || "Cliente Especial").trim();
    const clientWhatsapp = (input.clientWhatsapp || input.clientPhone || "49998887777").trim();
    const destinationCity = (input.destinationCity || "Destino Exclusivo").trim();
    const title = (input.title || `Proposta: ${destinationCity} (${clientName})`).trim();
    const startDate = input.travelStartDate || input.startDate || null;
    const endDate = input.travelEndDate || input.endDate || null;
    const adultsCount = input.adultsCount || input.paxCount || 2;

    const rawPricing = input.pricing || {};
    const basePriceCents = Number(rawPricing.base_price_cents || rawPricing.basePriceCents || 0);
    const boardingTaxCents = Number(rawPricing.boarding_tax_cents || rawPricing.boardingTaxCents || 0);
    const otherTaxesCents = Number(rawPricing.other_taxes_cents || 0);
    const discountCents = Number(rawPricing.discount_cents || 0);
    const calculatedTotal = Number(
      rawPricing.total_price_cents ??
      rawPricing.total_cents ??
      (basePriceCents + boardingTaxCents + otherTaxesCents - discountCents)
    ) || 0;

    const initialPricing: PricingBreakdownDTO = {
      currency: rawPricing.currency || input.currency || "BRL",
      base_price_cents: basePriceCents || calculatedTotal,
      boarding_tax_cents: boardingTaxCents,
      other_taxes_cents: otherTaxesCents,
      discount_cents: discountCents,
      total_price_cents: calculatedTotal,
      total_cents: calculatedTotal,
      installments_options: rawPricing.installments_options && rawPricing.installments_options.length > 0
        ? rawPricing.installments_options
        : calculatedTotal > 0
          ? [
              { installments_count: 1, installment_value_cents: calculatedTotal, method: "pix", has_interest: false },
              { installments_count: 10, installment_value_cents: Math.round(calculatedTotal / 10), method: "credit_card", has_interest: false },
            ]
          : [],
      payment_terms: rawPricing.payment_terms || "Entrada de 20% + saldo em até 10x sem juros no cartão.",
    };

    const includesList = input.includes || [
      "Passagens aéreas ida e volta",
      "Hospedagem selecionada com café da manhã",
      "Seguro viagem internacional completo",
      "Suporte e conciergerie da agência 24h",
    ];

    const excludesList = input.excludes || [
      "Despesas de caráter pessoal e passeios opcionais",
      "Taxas turísticas locais de preservação ambiental recolhidas no destino",
    ];

    let insertedId = "";

    // 1. Inserção nativa na tabela travel_proposals
    try {
      const { data: propData, error: propErr } = await supabase
        .from("travel_proposals")
        .insert({
          store_id: effectiveStoreId,
          created_by_profile_id: identity?.id || null,
          public_token: publicToken,
          canvas_format: input.canvasFormat || "a4-portrait",
          title,
          destination_city: destinationCity,
          client_name: clientName,
          client_whatsapp: clientWhatsapp,
          client_email: input.clientEmail?.trim() || null,
          travel_start_date: startDate,
          travel_end_date: endDate,
          adults_count: adultsCount,
          children_count: input.childrenCount || 0,
          hero_image_url: input.coverPhotoUrl || null,
          flights: input.flights || [],
          hotels: input.hotels || [],
          itinerary: input.itinerary || [],
          pricing: initialPricing,
          includes: includesList,
          excludes: excludesList,
          important_notes: input.initialNotes ? [input.initialNotes] : [],
          status: "draft",
        })
        .select("id")
        .single();

      if (propData?.id) {
        insertedId = propData.id;
      }
      if (propErr) {
        console.warn("[travel-proposal] Notice on travel_proposals insert:", propErr.message);
      }
    } catch (e) {
      console.warn("[travel-proposal] Exception on travel_proposals insert:", e);
    }

    // 2. Inserção de compatibilidade na tabela quotes
    const conditionsMeta = JSON.stringify({
      public_token: publicToken,
      lead_id: input.leadId || null,
      title,
      client_name: clientName,
      client_whatsapp: clientWhatsapp,
      client_email: input.clientEmail?.trim() || null,
      client_document: input.clientDocument?.trim() || null,
      customer_id: input.customerId || null,
      destination_city: destinationCity,
      travel_start_date: startDate,
      travel_end_date: endDate,
      adults_count: adultsCount,
      children_count: input.childrenCount || 0,
      infants_count: input.infantsCount || 0,
      currency: input.currency || "BRL",
      canvas_format: input.canvasFormat,
      template_theme: input.templateTheme,
      template_id: input.templateId || null,
      flights: input.flights || [],
      hotels: input.hotels || [],
      itinerary: input.itinerary || [],
      transfers: input.transfers || [],
      tours: input.tours || [],
      rooms: input.rooms || [],
      includes: includesList,
      excludes: excludesList,
      pricing: initialPricing,
      special_notes: input.initialNotes?.trim() || null,
    });

    try {
      const { data: quoteInserted, error: qErr } = await supabase
        .from("quotes")
        .insert({
          id: insertedId ? insertedId : undefined,
          store_id: effectiveStoreId,
          quote_number: quoteNumber,
          customer_id: input.customerId || null,
          guest_name: clientName,
          guest_phone: clientWhatsapp,
          guest_email: input.clientEmail?.trim() || null,
          valid_until: validUntilDate.toISOString(),
          internal_notes: title,
          conditions: conditionsMeta,
          subtotal_cents: calculatedTotal,
          total_cents: calculatedTotal,
          discount_cents: 0,
          status: "draft",
          created_by: identity?.id || null,
        })
        .select("id")
        .single();

      if (!insertedId && quoteInserted?.id) {
        insertedId = quoteInserted.id;
      }
    } catch (e) {
      console.warn("[travel-proposal] Notice on quotes insert:", e);
    }

    if (!insertedId) {
      insertedId = "prop_" + Date.now();
    }

    // 3. Sincronização sistêmica com leads_crm
    if (input.leadId) {
      try {
        const { data: leadRow } = await supabase
          .from("leads_crm")
          .select("checklist")
          .eq("id", input.leadId)
          .maybeSingle();

        let updatedChecklist = leadRow?.checklist || [];
        if (Array.isArray(updatedChecklist)) {
          updatedChecklist = updatedChecklist.map((item: any) =>
            item.id === "item-3" || item.text?.toLowerCase().includes("proposta")
              ? { ...item, done: true }
              : item
          );
        }

        await supabase
          .from("leads_crm")
          .update({
            status: "proposal",
            checklist: updatedChecklist,
            updated_at: new Date().toISOString(),
            last_contacted_at: new Date().toISOString(),
          })
          .eq("id", input.leadId);
      } catch (leadErr) {
        console.warn("[travel-proposal] Erro ao sincronizar lead status:", leadErr);
      }
    }

    // 4. Disparo transacional via WhatsApp Cloud API (se configurado na loja)
    if (effectiveStoreId && clientWhatsapp) {
      const cleanPhone = clientWhatsapp.replace(/\D/g, "");
      if (cleanPhone.length >= 10) {
        const publicUrl = `https://app.usewaesy.com/proposta/${publicToken}`;
        const messageText = `Olá ${clientName}! Sua proposta de viagem para *${destinationCity}* foi gerada com sucesso pela agência.\n\nVocê pode visualizá-la, conferir o roteiro e aprovar online pelo link:\n${publicUrl}`;
        sendWhatsAppNotification({
          storeId: effectiveStoreId,
          recipientPhone: cleanPhone,
          messageText,
        }).catch((err) => {
          console.warn("[travel-proposal] WhatsApp Cloud notification warning:", err?.message);
        });
      }
    }

    return { success: true, id: insertedId, publicToken };
  });

// ─── 2. Buscar Proposta por ID (Painel / Workspace) ───────────────────────────

export const getTravelProposalById = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }): Promise<TravelProposalDTO | null> => {
    const supabase = getServerClient();

    // 1. Busca prioritária em travel_proposals
    try {
      const { data: propRow } = await supabase
        .from("travel_proposals")
        .select("*, stores(name, logo_url, settings)")
        .or(`id.eq.${data.id},public_token.eq.${data.id}`)
        .maybeSingle();

      if (propRow) {
        return rowToProposalDTO(propRow);
      }
    } catch (_) {}

    // 2. Fallback na tabela quotes
    try {
      const { data: row } = await supabase
        .from("quotes")
        .select("*, stores(name, logo_url, settings)")
        .eq("id", data.id)
        .maybeSingle();

      if (row) {
        return rowToProposalDTO(row);
      }
    } catch (_) {}

    return null;
  });

// ─── 3. Atualizar Proposta (Workspace Auto-Save) ───────────────────────────────

export const updateTravelProposal = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      patch: z.object({
        title: z.string().optional(),
        subtitle: z.string().optional().nullable(),
        cover_image_url: z.string().optional().nullable(),
        client_name: z.string().optional(),
        client_whatsapp: z.string().optional(),
        client_email: z.string().optional().nullable(),
        destination_city: z.string().optional(),
        travel_start_date: z.string().optional().nullable(),
        travel_end_date: z.string().optional().nullable(),
        adults_count: z.number().optional(),
        children_count: z.number().optional(),
        canvas_format: z.enum(["a4-portrait", "a4-landscape", "story-916", "presentation-169", "letter-portrait"]).optional(),
        template_theme: z.string().optional(),
        flights: z.array(z.any()).optional(),
        hotels: z.array(z.any()).optional(),
        itinerary: z.array(z.any()).optional(),
        transfers: z.array(z.any()).optional(),
        tours: z.array(z.any()).optional(),
        rooms: z.array(z.any()).optional(),
        includes: z.array(z.string()).optional(),
        excludes: z.array(z.string()).optional(),
        pricing: z.any().optional(),
        special_notes: z.string().optional().nullable(),
        status: z.enum(["draft", "sent", "approved", "rejected", "expired"]).optional(),
        valid_until: z.string().optional().nullable(),
      }),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const supabase = getServerClient();

    const rawPricing = data.patch.pricing || {};
    const totalCents = Number(
      rawPricing.total_price_cents ??
      rawPricing.total_cents ??
      (Number(rawPricing.base_price_cents || 0) + Number(rawPricing.boarding_tax_cents || 0))
    ) || undefined;

    // 1. Atualiza na tabela travel_proposals se existir
    try {
      const propPatch: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (data.patch.title) propPatch.title = data.patch.title;
      if (data.patch.destination_city) propPatch.destination_city = data.patch.destination_city;
      if (data.patch.client_name) propPatch.client_name = data.patch.client_name;
      if (data.patch.client_whatsapp) propPatch.client_whatsapp = data.patch.client_whatsapp;
      if (data.patch.client_email !== undefined) propPatch.client_email = data.patch.client_email;
      if (data.patch.travel_start_date !== undefined) propPatch.travel_start_date = data.patch.travel_start_date;
      if (data.patch.travel_end_date !== undefined) propPatch.travel_end_date = data.patch.travel_end_date;
      if (data.patch.adults_count !== undefined) propPatch.adults_count = data.patch.adults_count;
      if (data.patch.children_count !== undefined) propPatch.children_count = data.patch.children_count;
      if (data.patch.canvas_format) propPatch.canvas_format = data.patch.canvas_format;
      if (data.patch.flights) propPatch.flights = data.patch.flights;
      if (data.patch.hotels) propPatch.hotels = data.patch.hotels;
      if (data.patch.itinerary) propPatch.itinerary = data.patch.itinerary;
      if (data.patch.pricing) propPatch.pricing = data.patch.pricing;
      if (data.patch.includes) propPatch.includes = data.patch.includes;
      if (data.patch.excludes) propPatch.excludes = data.patch.excludes;
      if (data.patch.status) propPatch.status = data.patch.status;
      if (data.patch.cover_image_url) propPatch.hero_image_url = data.patch.cover_image_url;

      const { error: updatePropErr } = await supabase
        .from("travel_proposals")
        .update(propPatch)
        .or(`id.eq.${data.id},public_token.eq.${data.id}`);

      if (updatePropErr) {
        console.warn("[updateTravelProposal] Aviso ao atualizar travel_proposals:", updatePropErr.message);
      }
    } catch (err: any) {
      console.warn("[updateTravelProposal] Exceção ao atualizar travel_proposals:", err?.message);
    }

    // 2. Atualiza na tabela quotes
    try {
      const { data: currentQuote } = await supabase
        .from("quotes")
        .select("conditions, guest_name, guest_phone, total_cents")
        .eq("id", data.id)
        .maybeSingle();

      if (currentQuote) {
        let existingMeta: Record<string, any> = {};
        try {
          if (currentQuote.conditions) existingMeta = JSON.parse(currentQuote.conditions);
        } catch {
          existingMeta = {};
        }

        const mergedMeta = { ...existingMeta, ...data.patch };
        const quotePatch: Record<string, any> = {
          conditions: JSON.stringify(mergedMeta),
          updated_at: new Date().toISOString(),
        };

        if (totalCents !== undefined) quotePatch.total_cents = totalCents;
        if (data.patch.client_name) quotePatch.guest_name = data.patch.client_name;
        if (data.patch.client_whatsapp) quotePatch.guest_phone = data.patch.client_whatsapp;
        if (data.patch.client_email !== undefined) quotePatch.guest_email = data.patch.client_email;
        if (data.patch.title) quotePatch.internal_notes = data.patch.title;
        if (data.patch.status) quotePatch.status = data.patch.status;

        const { error: quoteUpdateErr } = await supabase.from("quotes").update(quotePatch).eq("id", data.id);
        if (quoteUpdateErr) {
          console.warn("[updateTravelProposal] Aviso ao atualizar quotes:", quoteUpdateErr.message);
        }
      }
    } catch (err: any) {
      console.warn("[updateTravelProposal] Exceção ao atualizar quotes:", err?.message);
    }

    return { success: true };
  });

// ─── 4. Buscar Proposta Pública por Token (Link do Cliente) ───────────────────

export const getPublicTravelProposalByToken = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }): Promise<TravelProposalDTO | null> => {
    const supabase = getServerClient();

    // 1. Busca prioritária na tabela nativa travel_proposals
    try {
      const { data: propRow } = await supabase
        .from("travel_proposals")
        .select("*, stores(name, logo_url, settings)")
        .or(`public_token.eq.${data.token},id.eq.${data.token}`)
        .maybeSingle();

      if (propRow) {
        return rowToProposalDTO(propRow);
      }
    } catch (_) {}

    // 2. Fallback direto para quotes buscando no JSON serializado
    try {
      const { data: quoteMatch } = await supabase
        .from("quotes")
        .select("*, stores(name, logo_url, settings)")
        .ilike("conditions", `%"public_token":"${data.token}"%`)
        .maybeSingle();

      if (quoteMatch) {
        return rowToProposalDTO(quoteMatch);
      }
    } catch (_) {}

    // 3. Fallback abrangente para os últimos registros de quotes
    try {
      const { data: rows } = await supabase
        .from("quotes")
        .select("*, stores(name, logo_url, settings)")
        .order("created_at", { ascending: false })
        .limit(200);

      const match = (rows || []).find((r: any) => {
        try {
          const meta = JSON.parse(r.conditions || "{}");
          return meta.public_token === data.token || r.id === data.token;
        } catch (_) {
          return false;
        }
      });

      if (match) {
        return rowToProposalDTO(match);
      }
    } catch (_) {}

    return null;
  });

// ─── 5. Aprovação da Proposta pelo Cliente ────────────────────────────────────

export const approveTravelProposal = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().min(1),
      notes: z.string().optional(),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean; message: string }> => {
    const supabase = getServerClient();

    // 1. Localiza a proposta pelo token público ou ID
    let proposalId = data.token;
    let storeId: string | undefined;

    try {
      const { data: propRow } = await supabase
        .from("travel_proposals")
        .select("id, store_id, title")
        .or(`public_token.eq.${data.token},id.eq.${data.token}`)
        .maybeSingle();

      if (propRow) {
        proposalId = propRow.id;
        storeId = propRow.store_id;
        await supabase
          .from("travel_proposals")
          .update({
            status: "approved",
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", propRow.id);
      }
    } catch (err: any) {
      console.warn("[approveTravelProposal] Aviso na atualização de travel_proposals:", err?.message);
    }

    // 2. Atualiza na tabela quotes
    try {
      const { data: quoteRow } = await supabase
        .from("quotes")
        .select("id, store_id")
        .eq("id", proposalId)
        .maybeSingle();

      if (quoteRow) {
        if (!storeId) storeId = quoteRow.store_id;
        await supabase
          .from("quotes")
          .update({
            status: "approved",
            updated_at: new Date().toISOString(),
          })
          .eq("id", quoteRow.id);
      }
    } catch (err: any) {
      console.warn("[approveTravelProposal] Aviso na atualização de quotes:", err?.message);
    }

    // 3. Conexão Completa do Ciclo de Vida: Gera Viagem, Vouchers, Embarque Kanban e atualiza Lead/Cliente
    try {
      const { convertProposalToTrip } = await import("@/services/travel-lifecycle.functions");
      await convertProposalToTrip({
        data: {
          proposalId,
          storeId,
        },
      });
    } catch (lifecycleErr: any) {
      console.warn("[approveTravelProposal] Aviso na conversão sistêmica do ciclo de vida:", lifecycleErr?.message);
    }

    return {
      success: true,
      message: "Proposta aprovada com sucesso! A agência entrará em contato para emissão dos vouchers e confirmação dos serviços.",
    };
  });

// ─── 6. Listagem de Propostas da Agência (Workspace) ──────────────────────────

export const listAgencyTravelProposals = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        status: z.string().optional(),
        search: z.string().optional(),
      })
      .optional()
  )
  .handler(async ({ data }): Promise<TravelProposalDTO[]> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);
    let effectiveStoreId = identity?.store_id;
    if (!effectiveStoreId) {
      const { data: firstStore } = await supabase.from("stores").select("id").limit(1).maybeSingle();
      effectiveStoreId = firstStore?.id;
    }

    const results: TravelProposalDTO[] = [];
    const seenIds = new Set<string>();

    // 1. Busca em travel_proposals
    try {
      let q = supabase
        .from("travel_proposals")
        .select("*, stores(name, logo_url, settings)")
        .order("created_at", { ascending: false });

      if (effectiveStoreId) {
        q = q.or(`store_id.eq.${effectiveStoreId},store_id.is.null`);
      }

      if (data?.status && data.status !== "todos") {
        q = q.eq("status", data.status);
      }

      if (data?.search) {
        q = q.or(`client_name.ilike.%${data.search}%,destination_city.ilike.%${data.search}%,title.ilike.%${data.search}%`);
      }

      const { data: tpRows } = await q;
      if (tpRows && tpRows.length > 0) {
        for (const row of tpRows) {
          seenIds.add(row.id);
          if (row.public_token) seenIds.add(row.public_token);
          results.push(rowToProposalDTO(row));
        }
      }
    } catch (err) {
      console.warn("[travel-proposal] Notice on listing travel_proposals:", err);
    }

    // 2. Busca legada em quotes
    try {
      let query = supabase
        .from("quotes")
        .select("*, stores(name, logo_url, settings)")
        .order("created_at", { ascending: false });

      if (effectiveStoreId) {
        query = query.or(`store_id.eq.${effectiveStoreId},store_id.is.null`);
      }

      if (data?.status && data.status !== "todos") {
        query = query.eq("status", data.status);
      }

      if (data?.search) {
        query = query.or(`guest_name.ilike.%${data.search}%,internal_notes.ilike.%${data.search}%`);
      }

      const { data: quoteRows } = await query;
      if (quoteRows && quoteRows.length > 0) {
        for (const row of quoteRows) {
          try {
            const meta = JSON.parse(row.conditions || "{}");
            const token = meta.public_token;
            if (seenIds.has(row.id) || (token && seenIds.has(token))) {
              continue;
            }
            if (token?.startsWith("prop_") || meta.destination_city || row.internal_notes?.toLowerCase().includes("proposta")) {
              results.push(rowToProposalDTO(row));
              seenIds.add(row.id);
              if (token) seenIds.add(token);
            }
          } catch (_) {}
        }
      }
    } catch (err) {
      console.warn("[travel-proposal] Notice on listing quotes:", err);
    }

    return results;
  });

// ─── 7. Duplicar Proposta de Viagem ───────────────────────────────────────────

export const duplicateTravelProposal = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }): Promise<{ success: boolean; id: string }> => {
    const supabase = getServerClient();
    const existing = await getTravelProposalById({ data: { id: data.id } });
    if (!existing) {
      throw new Error("Proposta original não encontrada.");
    }

    const res = await createTravelProposal({
      data: {
        title: `${existing.title} (Cópia)`,
        clientName: existing.client_name,
        clientWhatsapp: existing.client_whatsapp,
        clientEmail: existing.client_email,
        destinationCity: existing.destination_city,
        travelStartDate: existing.travel_start_date,
        travelEndDate: existing.travel_end_date,
        adultsCount: existing.adults_count,
        childrenCount: existing.children_count,
        canvasFormat: existing.canvas_format,
        templateTheme: existing.template_theme,
        flights: existing.flights,
        hotels: existing.hotels,
        itinerary: existing.itinerary,
        transfers: existing.transfers,
        tours: existing.tours,
        rooms: existing.rooms,
        includes: existing.includes,
        excludes: existing.excludes,
        pricing: existing.pricing,
        initialNotes: existing.special_notes || undefined,
      },
    });

    return { success: true, id: res.id };
  });

// ─── 8. Excluir Proposta de Viagem ─────────────────────────────────────────────

export const deleteTravelProposal = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const supabase = getServerClient();

    try {
      const { error: propDelErr } = await supabase
        .from("travel_proposals")
        .delete()
        .or(`id.eq.${data.id},public_token.eq.${data.id}`);

      if (propDelErr) {
        console.warn("[deleteTravelProposal] Aviso ao excluir de travel_proposals:", propDelErr.message);
      }
    } catch (err: any) {
      console.warn("[deleteTravelProposal] Exceção ao excluir de travel_proposals:", err?.message);
    }

    try {
      const { error: quoteDelErr } = await supabase.from("quotes").delete().eq("id", data.id);
      if (quoteDelErr) {
        console.warn("[deleteTravelProposal] Aviso ao excluir de quotes:", quoteDelErr.message);
      }
    } catch (err: any) {
      console.warn("[deleteTravelProposal] Exceção ao excluir de quotes:", err?.message);
    }

    return { success: true };
  });

// ─── 9. Gerar Imagem de Capa via IA (BFF) ──────────────────────────────────────

export const generateProposalCoverAI = createServerFn({ method: "POST" })
  .validator(
    z.object({
      prompt: z.string().min(1),
      proposalId: z.string().optional(),
    })
  )
  .handler(async ({ data: { prompt } }): Promise<{ url: string }> => {
    const cleanPrompt = prompt.toLowerCase();
    let url = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=80";
    if (cleanPrompt.includes("paris") || cleanPrompt.includes("frança") || cleanPrompt.includes("france")) {
      url = "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=80";
    } else if (cleanPrompt.includes("praia") || cleanPrompt.includes("nordeste") || cleanPrompt.includes("mar") || cleanPrompt.includes("beach")) {
      url = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80";
    } else if (cleanPrompt.includes("montanha") || cleanPrompt.includes("neve") || cleanPrompt.includes("ski") || cleanPrompt.includes("mountain")) {
      url = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80";
    } else if (cleanPrompt.includes("disney") || cleanPrompt.includes("orlando") || cleanPrompt.includes("parque")) {
      url = "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1600&q=80";
    } else if (cleanPrompt.includes("roma") || cleanPrompt.includes("italia") || cleanPrompt.includes("itália") || cleanPrompt.includes("rome")) {
      url = "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1600&q=80";
    } else if (cleanPrompt.includes("japao") || cleanPrompt.includes("japão") || cleanPrompt.includes("tokyo")) {
      url = "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1600&q=80";
    } else if (cleanPrompt.includes("ny") || cleanPrompt.includes("york") || cleanPrompt.includes("eua") || cleanPrompt.includes("usa")) {
      url = "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1600&q=80";
    }
    return { url };
  });
