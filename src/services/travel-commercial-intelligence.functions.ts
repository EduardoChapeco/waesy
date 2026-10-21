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
  destinationCategories: z.array(z.string()).optional().default([]),
  preferredOrigins: z.array(z.string()).optional().default([]),
  dates: z.object({
    flexibility: z.enum(["exact_dates", "specific_month", "specific_season", "flexible_anytime"]),
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

    const { data: saved, error } = await supabase
      .from("travel_commercial_contacts")
      .upsert(payload)
      .select()
      .single();

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
      destination_categories: data.destinationCategories || [],
      preferred_origins: data.preferredOrigins || [],
      dates: data.dates,
      party: data.party,
      budget: data.budget,
      inclusions_wanted: data.inclusionsWanted || [],
      hotel_preferences: data.hotelPreferences || {},
      urgency: data.urgency,
      source_inquiry_text: data.sourceInquiryText?.trim() || null,
      source_quote_id: data.sourceQuoteId || null,
      captured_by_user_id: staff.id,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      payload.id = data.id;
    }

    const { data: saved, error } = await supabase
      .from("travel_interests")
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error("[upsertTravelInterestFn] Error:", error);
      throw new Error(`Falha ao salvar interesse de viagem: ${error.message}`);
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

  // Extrair TravelOffer ou sintetizar a partir dos atributos
  const offerPayload: TravelOffer = classified.attributes?.excelencia_offer || {
    id: classified.id,
    operator: {
      code: "INTERNAL",
      name: "Excelência Tour",
      brandColor: "var(--primary)",
      supportPhone: "",
    },
    destination: {
      title: classified.title,
      city: classified.attributes?.destination || classified.title,
      country: classified.attributes?.country || "Brasil",
      regionCategory: classified.attributes?.region_category || "nacional",
    },
    dates: {
      departureDate: classified.attributes?.departure_date || new Date().toISOString().slice(0, 10),
      returnDate: classified.attributes?.return_date || new Date().toISOString().slice(0, 10),
      durationNights: Number(classified.attributes?.nights_count || 5),
      displayRangeText: classified.attributes?.dates_label || "Data a consultar",
    },
    airfare: {
      included: Boolean(classified.attributes?.has_flights),
      airline: classified.attributes?.airline || "Aéreo Selecionado",
      departureOriginCity: classified.attributes?.origin_city || "Chapecó / Região",
      baggageIncluded: Boolean(classified.attributes?.baggage_included),
    },
    hotels: [
      {
        hotelId: classified.attributes?.hotel_id || "hotel-default",
        hotelName: classified.attributes?.hotel_name || classified.title,
        categoryStars: Number(classified.attributes?.hotel_stars || 4),
        mealPlan: classified.attributes?.meal_plan || "breakfast",
        mealPlanLabel: classified.attributes?.meal_plan_label || "Café da manhã",
        roomType: classified.attributes?.room_type || "Standard",
        inclusions: classified.attributes?.included_items || [],
      },
    ],
    transfers: {
      included: Boolean(classified.attributes?.has_transfers ?? true),
      transferType: "in_out",
    },
    pricing: {
      priceBasis: classified.attributes?.price_basis || "per_person",
      priceBasisLabel: classified.attributes?.price_basis === "total_package" ? "Total do pacote" : "Por pessoa",
      totalPackagePriceCents: classified.price_cents || 0,
    },
    paymentTermsSnapshot: {
      installmentCount: Number(classified.attributes?.installments_count || 10),
      installmentAmountCents: Math.round(
        (classified.price_cents || 0) / Number(classified.attributes?.installments_count || 10)
      ),
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

  if (interestsError || !rawInterests || rawInterests.length === 0) {
    return { matchesFound: 0, newOpportunitiesCreated: 0 };
  }

  const interests: TravelInterest[] = [];
  const contactsMap: Record<string, CommercialContact> = {};

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

    interests.push({
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
    });
  }

  // 3. Executar o motor determinístico
  const matches = evaluateInterestBacklogAgainstOffer(offerPayload, interests, contactsMap);

  let createdCount = 0;

  // 4. Persistir matches qualificados (score >= 60)
  for (const match of matches) {
    const matchPayload = {
      store_id: storeId,
      interest_id: match.interestId,
      offer_id: match.offerId,
      contact_id: match.contactId,
      match_score: match.matchScore,
      is_high_priority: match.isHighPriority,
      dimensions: match.dimensions,
      approach_draft: match.approachDraft,
      offer_snapshot: match.offerSnapshot,
      status: "new",
      matched_at: match.matchedAt,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("travel_opportunity_matches")
      .upsert(matchPayload, { onConflict: "interest_id,offer_id" });

    if (!upsertError) {
      createdCount++;
      // Atualizar status do interesse para "matched"
      await supabase
        .from("travel_interests")
        .update({ status: "matched", updated_at: new Date().toISOString() })
        .eq("id", match.interestId);
    }
  }

  return {
    matchesFound: matches.length,
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

        if (cErr || !newContact) {
          console.warn("[bulkImportInterestsFn] Falha ao criar contato:", cErr);
          continue;
        }
        contactId = newContact.id;
        importedContacts++;
      }

      // 2. Cria o interesse de viagem
      const title = `${item.destinations[0]} - ${item.adults} adultos${item.children ? ` + ${item.children} crianças` : ""}`;
      const { error: iErr } = await supabase
        .from("travel_interests")
        .insert({
          contact_id: contactId,
          store_id: staff.store_id,
          title,
          destinations: item.destinations,
          dates: {
            flexibility: item.targetMonth ? "specific_month" : "flexible_anytime",
            targetMonths: item.targetMonth ? [item.targetMonth] : [],
          },
          party: {
            adults: item.adults,
            children: item.children,
            childrenAges: [],
            roomConfiguration: "family",
          },
          budget: {
            maxInstallmentCents: item.maxInstallmentCents || null,
            preferredInstallments: 12,
            priceBasisPreference: "per_person",
          },
          inclusionsWanted: ["all_inclusive", "aereo_incluso"],
          urgency: "moderate",
          status: "open",
          source_inquiry_text: item.notes?.trim() || "Importado via Lote de Inteligência Comercial",
        });

      if (!iErr) {
        importedInterests++;
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

    // 1. Criar o Lead formal no CRM
    const leadResult = await createLead({
      data: {
        fullName: contact.name,
        phone: contact.phone,
        email: contact.email || undefined,
        title: `Oportunidade Match: ${snapshot.title || interest?.title || "Pacote de Viagem"}`,
        destination: snapshot.destinationCity || (interest?.destinations ? interest.destinations[0] : null),
        paxAdults: interest?.party?.adults || 2,
        paxChildren: interest?.party?.children || 0,
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
