/**
 * travel-commercial-intelligence.functions.ts — Server Functions BFF para Inteligência Comercial e Radar de Oportunidades
 *
 * Persistência real em Supabase, isolamento multi-tenant por store_id,
 * matching determinístico de ofertas contra o backlog de interesses e promoção consciente ao CRM.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { requireStaff } from "@/lib/server-access";
import {
  type CommercialContact,
  type TravelInterest,
  type TravelOpportunityMatch,
  computeOfferInterestMatch,
  generatePersonalizedOpportunityApproach,
  evaluateInterestBacklogAgainstOffer,
  buildCrmPromotionPayload,
} from "@/lib/travel/travel-commercial-intelligence";
import type { TravelOffer } from "@/lib/travel/excelencia-offer-engine";
import { createLead } from "@/services/crm.functions";

// ============================================================================
// SCHEMAS DE VALIDAÇÃO
// ============================================================================

export const UpsertCommercialContactSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phone: z.string().min(8, "Telefone inválido"),
  email: z.string().email().optional().nullable(),
  instagramHandle: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  preferredChannel: z.enum(["whatsapp", "phone", "instagram", "email"]).default("whatsapp"),
  status: z.enum(["active", "nurturing", "unresponsive", "promoted_to_crm", "opted_out"]).default("active"),
  notes: z.string().optional().nullable(),
});

export const UpsertTravelInterestSchema = z.object({
  id: z.string().uuid().optional(),
  contactId: z.string().uuid("ID do contato é obrigatório"),
  title: z.string().min(3, "Título descritivo é obrigatório"),
  destinations: z.array(z.string()).min(1, "Ao menos um destino deve ser informado"),
  destinationTags: z.array(z.any()).optional(),
  destinationCategories: z.array(z.string()).optional().default([]),
  preferredOrigins: z.array(z.string()).optional().default([]),
  periodTags: z.array(z.string()).optional().default([]),
  flexibilityDays: z.number().int().min(0).max(60).optional().default(3),
  roomOccupancies: z.array(z.any()).optional(),
  rawIntentMarkdown: z.string().optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
  dates: z.object({
    flexibility: z.enum(["exact_dates", "specific_month", "specific_season", "flexible_anytime", "unspecified"]),
    targetMonths: z.array(z.string()).optional().default([]),
    exactDepartureDate: z.string().optional().nullable(),
    exactReturnDate: z.string().optional().nullable(),
    preferredSeason: z.enum(["summer", "winter", "spring", "autumn", "low_season", "school_holidays"]).optional(),
    durationNightsRange: z.tuple([z.number(), z.number()]).optional(),
  }),
  party: z.object({
    adults: z.number().int().min(1).default(2),
    children: z.number().int().min(0).default(0),
    childrenAges: z.array(z.number().int()).optional().default([]),
    roomConfiguration: z.enum(["single", "double", "triple", "family", "custom"]).default("double"),
  }),
  budget: z.object({
    maxTotalBudgetCents: z.number().int().optional().nullable(),
    maxInstallmentCents: z.number().int().optional().nullable(),
    preferredInstallments: z.number().int().optional().nullable(),
    priceBasisPreference: z.enum(["per_person", "per_couple", "per_family", "total_package"]).default("per_person"),
  }),
  inclusionsWanted: z.array(z.string()).optional().default([]),
  hotelPreferences: z
    .object({
      minStars: z.number().int().optional(),
      preferredChains: z.array(z.string()).optional(),
      preferredHotelNames: z.array(z.string()).optional(),
    })
    .optional(),
  urgency: z.enum(["immediate", "moderate", "exploring", "future_trip"]).default("moderate"),
  sourceInquiryText: z.string().optional().nullable(),
  sourceQuoteId: z.string().uuid().optional().nullable(),
  expiresAt: z.string().optional(),
});

export const RecordCommercialInteractionSchema = z.object({
  matchId: z.string().uuid("ID do match é obrigatório"),
  status: z.enum(["reviewed", "approached", "engaged", "promoted_to_crm", "dismissed"]),
  approachNotes: z.string().optional(),
  customerFeedback: z.string().optional(),
  objectionType: z
    .enum(["price_too_high", "dates_changed", "already_traveled", "no_interest", "other"])
    .optional()
    .nullable(),
});

export const PromoteOpportunityToCrmLeadSchema = z.object({
  matchId: z.string().uuid("ID do match é obrigatório"),
  customEstimatedBudgetCents: z.number().int().optional(),
  assignedAgentProfileId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const BulkImportInterestsSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres"),
        phone: z.string().trim().min(8, "Telefone deve ter ao menos 8 dígitos"),
        destinations: z.array(z.string().trim()).min(1, "Ao menos um destino"),
        targetMonth: z.string().optional().nullable(),
        maxInstallmentCents: z.number().int().positive().optional().nullable(),
        adults: z.number().int().min(1).default(2),
        children: z.number().int().min(0).default(0),
        childrenAges: z.array(z.number().int().min(0).max(17)).optional().default([]),
        notes: z.string().optional().nullable(),
      })
    )
    .min(1, "Envie ao menos um contato para importação"),
});

// ============================================================================
// 1. GESTÃO DE CONTATOS PRÉ-CRM
// ============================================================================

export const listCommercialContactsFn = createServerFn({ method: "GET" })
  .validator(
    z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().int().default(50),
    })
  )
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    const supabase = getServerClient();

    let query = supabase
      .from("travel_commercial_contacts")
      .select("*")
      .eq("store_id", staff.store_id)
      .order("updated_at", { ascending: false })
      .limit(data.limit);

    if (data.status && data.status !== "all") {
      query = query.eq("status", data.status);
    }

    if (data.search && data.search.trim()) {
      query = query.or(`name.ilike.%${data.search.trim()}%,phone.ilike.%${data.search.trim()}%`);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("[listCommercialContactsFn] Error:", error);
      return [];
    }

    return (rows || []).map((r: any): CommercialContact => ({
      id: r.id,
      tenantId: r.store_id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      instagramHandle: r.instagram_handle,
      city: r.city,
      preferredChannel: r.preferred_channel || "whatsapp",
      status: r.status || "active",
      notes: r.notes,
      linkedCrmLeadId: r.linked_crm_lead_id,
      linkedCustomerId: r.linked_customer_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  });

export const upsertCommercialContactFn = createServerFn({ method: "POST" })
  .validator(UpsertCommercialContactSchema)
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    const supabase = getServerClient();

    const cleanPhone = data.phone.replace(/\D/g, "");

    const payload: any = {
      store_id: staff.store_id,
      name: data.name.trim(),
      phone: cleanPhone,
      email: data.email?.trim() || null,
      instagram_handle: data.instagramHandle?.trim() || null,
      city: data.city?.trim() || null,
      preferred_channel: data.preferredChannel,
      status: data.status,
      notes: data.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      payload.id = data.id;
    } else {
      const { data: existing } = await supabase
        .from("travel_commercial_contacts")
        .select("id")
        .eq("store_id", staff.store_id)
        .eq("phone", cleanPhone)
        .maybeSingle();

      if (existing?.id) {
        payload.id = existing.id;
      }
    }

    let { data: saved, error } = await supabase
      .from("travel_commercial_contacts")
      .upsert(payload)
      .select()
      .single();

    // Corrida com outro processo: o índice único (store_id, phone_e164) barrou a duplicata.
    // Reaproveita o registro vencedor e atualiza em vez de falhar ou duplicar.
    if (error?.code === "23505" && !data.id) {
      const { data: winner } = await supabase
        .from("travel_commercial_contacts")
        .select("id")
        .eq("store_id", staff.store_id)
        .eq("phone", cleanPhone)
        .maybeSingle();
      if (winner?.id) {
        ({ data: saved, error } = await supabase
          .from("travel_commercial_contacts")
          .upsert({ ...payload, id: winner.id })
          .select()
          .single());
      }
    }

    if (error) {
      console.error("[upsertCommercialContactFn] Error:", error);
      throw new Error(`Falha ao salvar contato comercial: ${error.message}`);
    }

    return saved;
  });

// ============================================================================
// 2. GESTÃO DE INTERESSES E MEMÓRIA COMERCIAL
// ============================================================================

export const listTravelInterestsFn = createServerFn({ method: "GET" })
  .validator(
    z.object({
      contactId: z.string().uuid().optional(),
      status: z.string().optional(),
      destination: z.string().optional(),
      urgency: z.string().optional(),
      limit: z.number().int().default(50),
    })
  )
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    const supabase = getServerClient();

    let query = supabase
      .from("travel_interests")
      .select("*, contact:travel_commercial_contacts(*)")
      .eq("store_id", staff.store_id)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.contactId) {
      query = query.eq("contact_id", data.contactId);
    }

    if (data.status && data.status !== "all") {
      query = query.eq("status", data.status);
    }

    if (data.urgency && data.urgency !== "all") {
      query = query.eq("urgency", data.urgency);
    }

    if (data.destination && data.destination.trim()) {
      query = query.contains("destinations", [data.destination.trim()]);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("[listTravelInterestsFn] Error:", error);
      return [];
    }

    return (rows || []).map((r: any) => ({
      id: r.id,
      contactId: r.contact_id,
      tenantId: r.store_id,
      title: r.title,
      destinations: r.destinations || [],
      destinationCategories: r.destination_categories || [],
      preferredOrigins: r.preferred_origins || [],
      dates: r.dates || { flexibility: "flexible_anytime" },
      party: r.party || { adults: 2, children: 0 },
      budget: r.budget || {},
      inclusionsWanted: r.inclusions_wanted || [],
      hotelPreferences: r.hotel_preferences,
      urgency: r.urgency || "moderate",
      status: r.status || "open",
      sourceInquiryText: r.source_inquiry_text,
      expiresAt: r.expires_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      contact: r.contact
        ? {
            id: r.contact.id,
            name: r.contact.name,
            phone: r.contact.phone,
            email: r.contact.email,
            preferredChannel: r.contact.preferred_channel,
          }
        : null,
    }));
  });

export const upsertTravelInterestFn = createServerFn({ method: "POST" })
  .validator(UpsertTravelInterestSchema)
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    const supabase = getServerClient();

    const expiresAt =
      data.expiresAt ||
      new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

    const payload: any = {
      store_id: staff.store_id,
      contact_id: data.contactId,
      title: data.title.trim(),
      destinations: data.destinations,
      destination_tags: data.destinationTags || [],
      destination_categories: data.destinationCategories || [],
      preferred_origins: data.preferredOrigins || [],
      dates: data.dates,
      period_tags: data.periodTags || [],
      flexibility_days: data.flexibilityDays ?? 3,
      party: data.party,
      room_occupancies: data.roomOccupancies || [],
      budget: data.budget,
      inclusions_wanted: data.inclusionsWanted || [],
      hotel_preferences: data.hotelPreferences || {},
      urgency: data.urgency,
      raw_intent_markdown: data.rawIntentMarkdown?.trim() || null,
      lead_id: data.leadId || null,
      source_inquiry_text: data.sourceInquiryText?.trim() || data.rawIntentMarkdown?.trim() || null,
      source_quote_id: data.sourceQuoteId || null,
      captured_by_user_id: staff.id,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      payload.id = data.id;
    }

    let { data: saved, error } = await supabase
      .from("travel_interests")
      .upsert(payload)
      .select()
      .single();

    if (error && /42703|column .* does not exist|PGRST204/i.test(`${error.code || ""} ${error.message || ""}`)) {
      for (const col of ["destination_tags", "period_tags", "flexibility_days", "room_occupancies", "raw_intent_markdown", "lead_id"]) {
        delete payload[col];
      }
      ({ data: saved, error } = await supabase
        .from("travel_interests")
        .upsert(payload)
        .select()
        .single());
    }

    if (error) {
      console.error("[upsertTravelInterestFn] Error:", error);
      throw new Error(`Falha ao salvar interesse de viagem: ${error.message}`);
    }

    if (saved?.id) {
      import("./opportunity-radar.functions")
        .then((mod) =>
          mod.internalEvaluateDemandAgainstAllSupply({
            storeId: staff.store_id,
            interestId: saved.id,
            leadId: data.leadId || null,
          })
        )
        .catch(() => {});
    }

    return saved;
  });

// ============================================================================
// 3. MOTOR DE MATCHING DETERMINÍSTICO E OPORTUNIDADES
// ============================================================================

/**
 * Função interna reutilizável para avaliação de matches entre uma oferta e os interesses do tenant.
 */
export async function internalEvaluateOfferMatches(
  storeId: string,
  offerId: string,
  supabase: any
): Promise<{ matchesFound: number; newOpportunitiesCreated: number }> {
  // 1. Carregar a oferta do classificado
  const { data: classified, error: classifiedError } = await supabase
    .from("classifieds")
    .select("*")
    .eq("id", offerId)
    .eq("store_id", storeId)
    .single();

  if (classifiedError || !classified) {
    return { matchesFound: 0, newOpportunitiesCreated: 0 };
  }

  // 1.5 Extrair TravelOffer ou sintetizar a partir dos atributos + dynamic_fields
  const dyn = (classified.dynamic_fields || {}) as Record<string, any>;
  const attrs = (classified.attributes || {}) as Record<string, any>;
  const resolvedDestCity = attrs.destination || dyn.destination || classified.city_name || classified.title;
  const resolvedDepartureDate = attrs.departure_date || dyn.departure_date || "";
  const resolvedReturnDate = attrs.return_date || dyn.return_date || "";
  const resolvedInstallments = Number(attrs.installments_count || dyn.max_installments || 10);
  const resolvedInstallmentCents =
    Number(attrs.installment_cents || dyn.installment_cents || 0) ||
    Math.round((classified.price_cents || 0) / Math.max(1, resolvedInstallments));

  const offerPayload: TravelOffer = attrs.excelencia_offer || {
    id: classified.id,
    operator: {
      code: "INTERNAL",
      name: "Excelência Tour",
      brandColor: "var(--primary)",
      supportPhone: "",
    },
    destination: {
      title: classified.title,
      city: resolvedDestCity,
      country: attrs.country || dyn.destination_country || "Brasil",
      destinationIata: attrs.arrival_iata || dyn.arrival_iata || undefined,
      originIata: attrs.departure_iata || dyn.departure_iata || undefined,
      originCity: attrs.origin_city || dyn.origin_city || undefined,
      regionCategory: attrs.region_category || "nacional",
    },
    dates: {
      departureDate: resolvedDepartureDate,
      returnDate: resolvedReturnDate,
      durationNights: Number(attrs.nights_count || 5),
      displayRangeText: attrs.dates_label || (resolvedDepartureDate || "Data a consultar"),
    },
    airfare: {
      included: Boolean(attrs.has_flights ?? dyn.package_type === "aereo"),
      airline: attrs.airline || "Aéreo Selecionado",
      departureOriginCity: attrs.origin_city || dyn.origin_city || "Chapecó / Região",
      baggageIncluded: Boolean(attrs.baggage_included),
    },
    hotels: [
      {
        hotelId: attrs.hotel_id || dyn.hotel_id || "hotel-default",
        hotelName: attrs.hotel_name || dyn.hotel_name || classified.title,
        categoryStars: Number(attrs.hotel_stars || dyn.hotel_stars || 4),
        mealPlan: attrs.meal_plan || dyn.meal_plan || "breakfast",
        mealPlanLabel: attrs.meal_plan_label || dyn.meal_plan || "Café da manhã",
        roomType: attrs.room_type || "Standard",
        inclusions: attrs.included_items || dyn.inclusions || [],
      },
    ],
    transfers: {
      included: Boolean(attrs.has_transfers ?? true),
      transferType: "in_out",
    },
    inclusions: attrs.included_items || dyn.inclusions || [],
    party: {
      adults: 2,
      children: 0,
      infants: 0,
      childAges: [],
      labelMode: "couple",
    },
    pricing: {
      priceBasis: attrs.price_basis || dyn.pricing_mode || "per_person",
      priceBasisLabel:
        (attrs.price_basis || dyn.pricing_mode) === "total_package" ? "Total do pacote" : "Por pessoa",
      totalPackagePriceCents: classified.price_cents || 0,
    },
    paymentTermsSnapshot: {
      installmentCount: resolvedInstallments,
      installmentAmountCents: resolvedInstallmentCents,
      totalAmountCents: classified.price_cents || 0,
      shortStoryLabel: "Sem juros",
      interestRule: "zero_interest",
    },
    publicPage: {
      url: `/classificados/${classified.id}`,
    },
  };

  // 2. Carregar todos os interesses abertos da loja
  const { data: rawInterests, error: interestsError } = await supabase
    .from("travel_interests")
    .select("*, contact:travel_commercial_contacts(*)")
    .eq("store_id", storeId)
    .in("status", ["open", "matched"]);

  const interests: TravelInterest[] = [];
  const contactsMap: Record<string, CommercialContact> = {};

  if (!interestsError && rawInterests && rawInterests.length > 0) {
    for (const r of rawInterests) {
      if (!r.contact || r.contact.status === "opted_out") continue;

      const c: CommercialContact = {
        id: r.contact.id,
        tenantId: r.contact.store_id,
        name: r.contact.name,
        phone: r.contact.phone,
        email: r.contact.email,
        instagramHandle: r.contact.instagram_handle,
        city: r.contact.city,
        preferredChannel: r.contact.preferred_channel || "whatsapp",
        status: r.contact.status || "active",
        notes: r.contact.notes,
        linkedCrmLeadId: r.contact.linked_crm_lead_id,
        linkedCustomerId: r.contact.linked_customer_id,
        createdAt: r.contact.created_at,
        updatedAt: r.contact.updated_at,
      };
      contactsMap[c.id] = c;

      const rParty = r.party || { adults: 2, children: 0 };
      const hydratedChildAges = Array.isArray(rParty.childAges)
        ? rParty.childAges
        : Array.isArray(rParty.childrenAges)
          ? rParty.childrenAges
          : [];

      interests.push({
        id: r.id,
        contactId: r.contact_id,
        leadId: r.lead_id || r.contact.linked_crm_lead_id || null,
        tenantId: r.store_id,
        title: r.title,
        destinations: r.destinations || [],
        destinationTags: Array.isArray(r.destination_tags) ? r.destination_tags : undefined,
        destinationCategories: r.destination_categories || [],
        preferredOrigins: r.preferred_origins || [],
        periodTags: Array.isArray(r.period_tags) ? r.period_tags : undefined,
        flexibilityDays: typeof r.flexibility_days === "number" ? r.flexibility_days : undefined,
        dates: r.dates || { flexibility: "unspecified" as any },
        party: { ...rParty, childAges: hydratedChildAges },
        roomOccupancies: Array.isArray(r.room_occupancies) ? r.room_occupancies : undefined,
        budget: r.budget || {},
        inclusionsWanted: r.inclusions_wanted || [],
        hotelPreferences: r.hotel_preferences,
        urgency: r.urgency || "moderate",
        status: r.status || "open",
        sourceInquiryText: r.source_inquiry_text,
        expiresAt: r.expires_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      });
    }
  }

  // 3. Executar o motor determinístico
  const matches = interests.length > 0 ? evaluateInterestBacklogAgainstOffer(offerPayload, interests, contactsMap) : [];

  let createdCount = 0;

  // 4. Persistir matches qualificados preservando status humano existente (`dismissed`/`approached`/`promoted_to_crm`)
  for (const match of matches) {
    const { data: existingMatch } = await supabase
      .from("travel_opportunity_matches")
      .select("id, status")
      .eq("interest_id", match.interestId)
      .eq("offer_id", match.offerId)
      .maybeSingle();

    const currentStatus = String(existingMatch?.status || "new").toLowerCase();
    const preservedStatus =
      existingMatch?.id && currentStatus !== "new" && currentStatus !== "open"
        ? existingMatch.status
        : "new";

    const matchPayload: Record<string, any> = {
      store_id: storeId,
      interest_id: match.interestId,
      offer_id: match.offerId,
      contact_id: match.contactId,
      lead_id: match.leadId || null,
      match_score: match.matchScore,
      is_high_priority: match.isHighPriority,
      dimensions: match.dimensions,
      approach_draft: match.approachDraft,
      offer_snapshot: match.offerSnapshot,
      status: preservedStatus,
      matched_at: match.matchedAt,
      requires_child_requote: Boolean(match.requiresChildRequote),
      simulated_total_cents: match.simulatedTotalCents ?? match.offerSnapshot.totalPriceCents ?? null,
      child_simulation: match.childSimulation || {},
      historical_check: match.historicalCheck || {},
      already_proposed_recently: Boolean(match.alreadyProposedRecently),
      warnings: match.warnings || [],
      match_tier: match.matchTier || (match.isHighPriority ? "exact_match" : "strong_match"),
      match_version: "unified_v2",
      updated_at: new Date().toISOString(),
    };

    let { error: upsertError } = await supabase
      .from("travel_opportunity_matches")
      .upsert(matchPayload, { onConflict: "interest_id,offer_id" });

    if (upsertError && /42703|column .* does not exist|PGRST204/i.test(`${upsertError.code || ""} ${upsertError.message || ""}`)) {
      for (const col of [
        "lead_id",
        "requires_child_requote",
        "simulated_total_cents",
        "child_simulation",
        "historical_check",
        "already_proposed_recently",
        "warnings",
        "match_tier",
        "match_version",
      ]) {
        delete matchPayload[col];
      }
      ({ error: upsertError } = await supabase
        .from("travel_opportunity_matches")
        .upsert(matchPayload, { onConflict: "interest_id,offer_id" }));
    }

    if (!upsertError) {
      createdCount++;
      await supabase
        .from("travel_interests")
        .update({ status: "matched", updated_at: new Date().toISOString() })
        .eq("id", match.interestId)
        .eq("status", "open");
    }
  }

  // 5. Propagar também para leads ativos no Funil CRM via Radar Unificado (`sourceClassifiedId`)
  let crmMatchesFound = 0;
  try {
    const [{ internalEvaluateSupplyAgainstAllLeads }, { normalizeLegacyOfferToCanonical }] = await Promise.all([
      import("./opportunity-radar.functions"),
      import("@/lib/travel/opportunity-matching-engine"),
    ]);
    const canonicalOffer = normalizeLegacyOfferToCanonical({
      id: classified.id,
      source_type: dyn.extracted_via_ocr ? "ocr_quote" : "catalog_package",
      title: classified.title,
      destination_city: resolvedDestCity,
      destination_iata: attrs.arrival_iata || dyn.arrival_iata || null,
      origin_city: attrs.origin_city || dyn.origin_city || null,
      origin_iata: attrs.departure_iata || dyn.departure_iata || null,
      departure_date: resolvedDepartureDate || null,
      return_date: resolvedReturnDate || null,
      total_cents: classified.price_cents || 0,
      adults_count: 2,
      children_count: 0,
      inclusions: attrs.included_items || dyn.inclusions || [],
      meal_plan: attrs.meal_plan_label || dyn.meal_plan || null,
      hotel_stars: Number(attrs.hotel_stars || dyn.hotel_stars || 0) || null,
    });
    const radarRes = await internalEvaluateSupplyAgainstAllLeads({
      storeId,
      offer: canonicalOffer,
      sourceClassifiedId: classified.id,
    });
    crmMatchesFound = radarRes.matchedCount;
  } catch {
    // Isolado para não interromper publicação
  }

  return {
    matchesFound: Math.max(matches.length, crmMatchesFound),
    newOpportunitiesCreated: createdCount,
  };
}

export const evaluateOfferMatchesFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      offerId: z.string().uuid("ID do classificado/oferta obrigatório"),
    })
  )
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    const supabase = getServerClient();
    return internalEvaluateOfferMatches(staff.store_id, data.offerId, supabase);
  });

export const bulkImportInterestsFn = createServerFn({ method: "POST" })
  .validator(BulkImportInterestsSchema)
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    const supabase = getServerClient();

    let importedContacts = 0;
    let importedInterests = 0;

    for (const item of data.items) {
      const cleanPhone = item.phone.replace(/\D/g, "");
      if (!cleanPhone || cleanPhone.length < 8) continue;

      // 1. Localiza ou cria contato pré-CRM
      const { data: existingContact } = await supabase
        .from("travel_commercial_contacts")
        .select("id")
        .eq("store_id", staff.store_id)
        .eq("phone", cleanPhone)
        .maybeSingle();

      let contactId = existingContact?.id;

      if (!contactId) {
        const { data: newContact, error: cErr } = await supabase
          .from("travel_commercial_contacts")
          .insert({
            store_id: staff.store_id,
            name: item.name.trim(),
            phone: cleanPhone,
            preferred_channel: "whatsapp",
            status: "active",
            notes: item.notes?.trim() || null,
          })
          .select("id")
          .single();

        if (cErr?.code === "23505") {
          const { data: winner } = await supabase
            .from("travel_commercial_contacts")
            .select("id")
            .eq("store_id", staff.store_id)
            .eq("phone", cleanPhone)
            .maybeSingle();
          contactId = winner?.id;
        } else if (cErr || !newContact) {
          console.warn("[bulkImportInterestsFn] Falha ao criar contato:", cErr);
          continue;
        } else {
          contactId = newContact.id;
          importedContacts++;
        }
        if (!contactId) continue;
      }

      // 2. Cria o interesse de viagem
      const title = `${item.destinations[0]} - ${item.adults} adultos${item.children ? ` + ${item.children} crianças` : ""}`;

      // Idempotência: reenviar o mesmo lote não cria interesse duplicado.
      const { data: existingInterest } = await supabase
        .from("travel_interests")
        .select("id")
        .eq("store_id", staff.store_id)
        .eq("contact_id", contactId)
        .eq("title", title)
        .in("status", ["open", "matched", "nurturing"])
        .limit(1)
        .maybeSingle();
      if (existingInterest?.id) continue;
      const itemChildAges = Array.isArray(item.childrenAges)
        ? item.childrenAges.filter((a) => Number.isFinite(a) && a >= 0 && a <= 17)
        : [];
      const interestPayload: Record<string, any> = {
        contact_id: contactId,
        store_id: staff.store_id,
        title,
        destinations: item.destinations,
        destination_tags: item.destinations.map((d) => ({
          label: d.trim(),
          normalized: d.trim().toLowerCase(),
          source: "import",
        })),
        dates: {
          flexibility: item.targetMonth ? "specific_month" : "unspecified",
          targetMonths: item.targetMonth ? [item.targetMonth] : [],
        },
        party: {
          adults: item.adults,
          children: Math.max(item.children, itemChildAges.length),
          childAges: itemChildAges,
          childrenAges: itemChildAges,
          roomConfiguration: item.adults > 2 || itemChildAges.length > 0 ? "family" : "double",
        },
        room_occupancies: [
          {
            roomNumber: 1,
            roomLabel: "Quarto 1",
            adultsCount: item.adults,
            childrenCount: Math.max(item.children, itemChildAges.length),
            childrenAges: itemChildAges,
          },
        ],
        budget: {
          maxInstallmentCents: item.maxInstallmentCents || null,
          preferredInstallments: 12,
          priceBasisPreference: "per_person",
        },
        inclusions_wanted: ["all_inclusive", "aereo_incluso"],
        urgency: "moderate",
        status: "open",
        source_inquiry_text: item.notes?.trim() || "Importado via Lote de Inteligência Comercial",
      };

      const { data: savedInterest, error: iErr } = await (async () => {
        let res = await supabase
          .from("travel_interests")
          .insert(interestPayload)
          .select("id")
          .single();

        if (
          res.error &&
          /42703|column .* does not exist|PGRST204/i.test(`${res.error.code || ""} ${res.error.message || ""}`)
        ) {
          delete interestPayload.destination_tags;
          delete interestPayload.room_occupancies;
          res = await supabase.from("travel_interests").insert(interestPayload).select("id").single();
        }
        return res;
      })();

      if (!iErr) {
        importedInterests++;
        if (savedInterest?.id) {
          import("./opportunity-radar.functions")
            .then((mod) =>
              mod.internalEvaluateDemandAgainstAllSupply({
                storeId: staff.store_id,
                interestId: String(savedInterest.id),
              })
            )
            .catch(() => {});
        }
      }
    }

    // 3. Avalia contra os pacotes/ofertas ativos da loja
    let matchesEvaluated = 0;
    try {
      const { data: activeOffers } = await supabase
        .from("classifieds")
        .select("id")
        .eq("store_id", staff.store_id)
        .eq("status", "active")
        .limit(20);

      if (activeOffers && activeOffers.length > 0) {
        for (const offer of activeOffers) {
          await internalEvaluateOfferMatches(staff.store_id, offer.id, supabase);
          matchesEvaluated++;
        }
      }
    } catch (e) {
      console.warn("[bulkImportInterestsFn] Erro ao auto-avaliar matches:", e);
    }

    return {
      importedContacts,
      importedInterests,
      matchesEvaluated,
    };
  });

export const listOpportunityMatchesFn = createServerFn({ method: "GET" })
  .validator(
    z.object({
      status: z.string().optional(),
      minScore: z.number().optional().default(60),
      limit: z.number().int().default(50),
    })
  )
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    const supabase = getServerClient();

    let query = supabase
      .from("travel_opportunity_matches")
      .select("*, contact:travel_commercial_contacts(*), interest:travel_interests(*)")
      .eq("store_id", staff.store_id)
      .gte("match_score", data.minScore)
      .order("match_score", { ascending: false })
      .limit(data.limit);

    if (data.status && data.status !== "all") {
      query = query.eq("status", data.status);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("[listOpportunityMatchesFn] Error:", error);
      return [];
    }

    return (rows || []).map((r: any) => ({
      id: r.id,
      interestId: r.interest_id,
      offerId: r.offer_id,
      contactId: r.contact_id,
      matchScore: Number(r.match_score),
      isHighPriority: Boolean(r.is_high_priority),
      requiresChildRequote: Boolean(r.requires_child_requote),
      simulatedTotalCents: r.simulated_total_cents != null ? Number(r.simulated_total_cents) : null,
      childSimulation: r.child_simulation || null,
      historicalCheck: r.historical_check || null,
      alreadyProposedRecently: Boolean(r.already_proposed_recently),
      warnings: Array.isArray(r.warnings) ? r.warnings : [],
      dimensions: r.dimensions || [],
      approachDraft: r.approach_draft,
      offerSnapshot: r.offer_snapshot || {},
      status: r.status,
      interactionHistory: r.interaction_history || [],
      matchedAt: r.matched_at,
      contact: r.contact
        ? {
            id: r.contact.id,
            name: r.contact.name,
            phone: r.contact.phone,
            email: r.contact.email,
            preferredChannel: r.contact.preferred_channel,
          }
        : null,
      interest: r.interest
        ? {
            id: r.interest.id,
            title: r.interest.title,
            destinations: r.interest.destinations,
            budget: r.interest.budget,
            dates: r.interest.dates,
          }
        : null,
    }));
  });

export const recordCommercialInteractionFn = createServerFn({ method: "POST" })
  .validator(RecordCommercialInteractionSchema)
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    const supabase = getServerClient();

    const { data: match, error: fetchError } = await supabase
      .from("travel_opportunity_matches")
      .select("*, contact:travel_commercial_contacts(*)")
      .eq("id", data.matchId)
      .eq("store_id", staff.store_id)
      .single();

    if (fetchError || !match) {
      throw new Error("Oportunidade não encontrada.");
    }

    const newHistoryEntry = {
      timestamp: new Date().toISOString(),
      agentProfileId: staff.id,
      status: data.status,
      notes: data.approachNotes || null,
      customerFeedback: data.customerFeedback || null,
      objectionType: data.objectionType || null,
    };

    const updatedHistory = [...(match.interaction_history || []), newHistoryEntry];

    const { error: updateError } = await supabase
      .from("travel_opportunity_matches")
      .update({
        status: data.status,
        interaction_history: updatedHistory,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.matchId);

    if (updateError) {
      throw new Error(`Falha ao registrar interação: ${updateError.message}`);
    }

    return { success: true };
  });

export const promoteOpportunityToCrmLeadFn = createServerFn({ method: "POST" })
  .validator(PromoteOpportunityToCrmLeadSchema)
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    const supabase = getServerClient();

    const { data: match, error: fetchError } = await supabase
      .from("travel_opportunity_matches")
      .select("*, contact:travel_commercial_contacts(*), interest:travel_interests(*)")
      .eq("id", data.matchId)
      .eq("store_id", staff.store_id)
      .single();

    if (fetchError || !match || !match.contact) {
      throw new Error("Oportunidade ou contato comercial não encontrado.");
    }

    const contact = match.contact;
    const interest = match.interest;
    const snapshot = match.offer_snapshot || {};

    const estimatedValueCents =
      data.customEstimatedBudgetCents ||
      snapshot.totalPriceCents ||
      (snapshot.installmentCents ? snapshot.installmentCents * (snapshot.installmentCount || 10) : 0);

    // 1. Criar o Lead formal no CRM preservando destinos estruturados, datas e quartos/idades 0-17
    const interestDates = (interest?.dates || {}) as Record<string, any>;
    const interestParty = (interest?.party || {}) as Record<string, any>;
    const interestChildAges = Array.isArray(interestParty.childAges)
      ? interestParty.childAges
      : Array.isArray(interestParty.childrenAges)
        ? interestParty.childrenAges
        : [];
    const leadResult = await createLead({
      data: {
        fullName: contact.name,
        phone: contact.phone,
        email: contact.email || undefined,
        title: `Oportunidade Match: ${snapshot.title || interest?.title || "Pacote de Viagem"}`,
        destination: snapshot.destinationCity || (interest?.destinations ? interest.destinations[0] : null),
        destinationTags: Array.isArray(interest?.destination_tags) ? interest.destination_tags : undefined,
        periodTags: Array.isArray(interest?.period_tags) ? interest.period_tags : undefined,
        targetMonths: Array.isArray(interestDates.targetMonths) ? interestDates.targetMonths : undefined,
        flexibilityDays: typeof interest?.flexibility_days === "number" ? interest.flexibility_days : 3,
        dateFlexibilityMode:
          interestDates.flexibility === "flexible_anytime" ? "flexible_anytime" : undefined,
        travelStart: interestDates.exactDepartureDate || null,
        travelEnd: interestDates.exactReturnDate || null,
        roomOccupancies: Array.isArray(interest?.room_occupancies) ? interest.room_occupancies : undefined,
        paxAdults: interestParty.adults || 2,
        paxChildren: Math.max(interestParty.children || 0, interestChildAges.length),
        paxInfants: interestChildAges.filter((a: number) => a <= 1).length,
        paxAges: interestChildAges,
        rawIntentMarkdown: interest?.raw_intent_markdown || interest?.source_inquiry_text || null,
        estimatedValueCents: estimatedValueCents,
        source: "radar_comercial_match",
        leadSourceDetail: `Oportunidade gerada pelo Radar de Inteligência Comercial (Score: ${match.match_score}/100)`,
        status: "qualified",
        notes: data.notes || `Promovido a partir do Radar Comercial. Oferta: ${snapshot.title}. Abordagem enviada.`,
      },
    });

    const newLeadId = (leadResult as any)?.lead?.id || (leadResult as any)?.id || null;

    // 2. Atualizar o match para promoted_to_crm
    const updatedHistory = [
      ...(match.interaction_history || []),
      {
        timestamp: new Date().toISOString(),
        agentProfileId: staff.id,
        status: "promoted_to_crm",
        leadId: newLeadId,
        notes: data.notes || "Lead promovido com sucesso ao CRM formal.",
      },
    ];

    await supabase
      .from("travel_opportunity_matches")
      .update({
        status: "promoted_to_crm",
        interaction_history: updatedHistory,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.matchId);

    // 3. Vincular no contato comercial
    if (newLeadId) {
      await supabase
        .from("travel_commercial_contacts")
        .update({
          status: "promoted_to_crm",
          linked_crm_lead_id: newLeadId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contact.id);

      if (interest?.id) {
        await supabase
          .from("travel_interests")
          .update({
            status: "converted",
            updated_at: new Date().toISOString(),
          })
          .eq("id", interest.id);
      }
    }

    return {
      success: true,
      leadId: newLeadId,
    };
  });
