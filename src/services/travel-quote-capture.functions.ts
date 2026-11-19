import { z } from 'zod';
import { getServerClient } from '@/lib/supabase';
import { calculateTariffTemperature } from '@/lib/travel-opportunity-matcher';
import {
  evaluateUnifiedOpportunityMatch,
  normalizeLegacyDemandToCanonical,
  normalizeLegacyOfferToCanonical,
} from '@/lib/travel/opportunity-matching-engine';

export const TravelQuoteCapturePayloadSchema = z.object({
  storeId: z.string().uuid(),
  userId: z.string().uuid().optional().nullable(),
  operatorSlug: z.string().default('infotravel_default'),
  sourcePage: z.enum(['carrinho', 'aereo_resultado', 'hotel_resultado', 'circuito_resultado', 'orcamento_salvo']),
  originCity: z.string().optional().nullable(),
  destinationCity: z.string().min(2),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  adultsCount: z.number().int().min(1).default(1),
  childrenCount: z.number().int().min(0).default(0),
  infantsCount: z.number().int().min(0).default(0),
  currency: z.string().default('BRL'),
  totalCents: z.number().int().nonnegative(),
  perAdultCents: z.number().int().nonnegative().optional().nullable(),
  taxesCents: z.number().int().nonnegative().default(0),
  items: z.array(
    z.object({
      itemType: z.enum(['flight', 'hotel', 'circuit', 'transfer', 'activity', 'insurance', 'other']),
      title: z.string(),
      providerOrAirline: z.string().optional().nullable(),
      utilizationPeriod: z.string().optional().nullable(),
      flightStops: z.number().int().min(0).default(0),
      cabinClass: z.string().optional().nullable(),
      hotelRoomType: z.string().optional().nullable(),
      mealPlan: z.string().optional().nullable(),
      fareAmountCents: z.number().int().default(0),
      taxAmountCents: z.number().int().default(0),
      totalAmountCents: z.number().int()
    })
  ).default([]),
  rawPayloadJson: z.record(z.any()).default({})
});

export type TravelQuoteCapturePayload = z.infer<typeof TravelQuoteCapturePayloadSchema>;

/**
 * Ingere uma cotação vinda da extensão ou minerador,
 * grava no ledger de preços e executa o radar de oportunidades sob demanda.
 */
export async function ingestTravelQuoteCapture(payloadRaw: TravelQuoteCapturePayload) {
  const supabase = getServerClient();
  const payload = TravelQuoteCapturePayloadSchema.parse(payloadRaw);
  const {
    storeId,
    userId,
    operatorSlug,
    sourcePage,
    originCity,
    destinationCity,
    startDate,
    endDate,
    adultsCount,
    childrenCount,
    infantsCount,
    currency,
    totalCents,
    perAdultCents,
    taxesCents,
    items,
    rawPayloadJson
  } = payload;

  const searchHash = `${operatorSlug}:${destinationCity.toLowerCase()}:${startDate}:${totalCents}:${adultsCount}`;

  // 1. Inserir a captura principal de forma idempotente
  const { data: capture, error: captureError } = await supabase
    .from('travel_quote_captures')
    .insert({
      store_id: storeId,
      user_id: userId,
      operator_slug: operatorSlug,
      source_page: sourcePage,
      search_payload_hash: searchHash,
      origin_city: originCity,
      destination_city: destinationCity,
      start_date: startDate,
      end_date: endDate,
      adults_count: adultsCount,
      children_count: childrenCount,
      infants_count: infantsCount,
      currency,
      total_cents: totalCents,
      per_adult_cents: perAdultCents,
      taxes_cents: taxesCents,
      raw_payload_json: rawPayloadJson
    })
    .select('id')
    .single();

  if (captureError) {
    throw new Error(`Erro ao registrar captura de cotação: ${captureError.message}`);
  }

  // 2. Inserir itens detalhados da cotação
  if (items && items.length > 0) {
    const itemsToInsert = items.map(item => ({
      capture_id: capture.id,
      store_id: storeId,
      item_type: item.itemType,
      title: item.title,
      provider_or_airline: item.providerOrAirline,
      utilization_period: item.utilizationPeriod,
      flight_stops: item.flightStops,
      cabin_class: item.cabinClass,
      hotel_room_type: item.hotelRoomType,
      meal_plan: item.mealPlan,
      fare_amount_cents: item.fareAmountCents,
      tax_amount_cents: item.taxAmountCents,
      total_amount_cents: item.totalAmountCents
    }));

    await supabase.from('travel_quote_capture_items').insert(itemsToInsert);
  }

  // 3. Gravar observação no ledger perpétuo de preços
  const today = new Date().toISOString().split('T')[0];
  const advanceDays = Math.max(
    0,
    Math.round((new Date(startDate).getTime() - new Date(today).getTime()) / 86400000)
  );

  const routeFingerprint = `${originCity || 'ANY'}->${destinationCity}`;

  await supabase.from('travel_price_observations').insert({
    store_id: storeId,
    product_type: sourcePage === 'aereo_resultado' ? 'flight' : sourcePage === 'hotel_resultado' ? 'hotel' : 'package',
    route_fingerprint: routeFingerprint,
    travel_start_date: startDate,
    travel_end_date: endDate,
    advance_days: advanceDays,
    provider_code: operatorSlug,
    price_cents: totalCents,
    currency,
    search_context_hash: searchHash,
    availability_state: 'available',
    source: 'extension_capture'
  });

  // 4. Executar Radar de Oportunidades Sob Demanda (com abertura aérea/transfer quando discriminada nos itens)
  const flightItemsTotalCents = (items || [])
    .filter((it) => it.itemType === 'flight')
    .reduce((sum, it) => sum + Number(it.totalAmountCents || it.fareAmountCents || 0), 0);
  const transferItemsTotalCents = (items || [])
    .filter((it) => it.itemType === 'transfer')
    .reduce((sum, it) => sum + Number(it.totalAmountCents || it.fareAmountCents || 0), 0);
  const itemAirfarePerAdultCents =
    flightItemsTotalCents > 0 && flightItemsTotalCents < totalCents
      ? Math.round(flightItemsTotalCents / Math.max(1, adultsCount))
      : null;
  const itemTransferPerAdultCents =
    transferItemsTotalCents > 0 && transferItemsTotalCents < totalCents
      ? Math.round(transferItemsTotalCents / Math.max(1, adultsCount))
      : null;

  const matchedOpportunities = await evaluateRadarForCapture({
    captureId: capture.id,
    storeId,
    operatorSlug,
    destinationCity,
    originCity,
    startDate,
    endDate,
    totalCents,
    adultsCount,
    childrenCount,
    airfarePerAdultCents: itemAirfarePerAdultCents,
    transferPerAdultCents: itemTransferPerAdultCents,
    sourcePage
  });

  return {
    success: true,
    captureId: capture.id,
    opportunitiesGenerated: matchedOpportunities.length,
    opportunities: matchedOpportunities
  };
}

/**
 * Avalia demandas ativas da agência e leads do CRM, gerando oportunidades sob demanda
 */
async function evaluateRadarForCapture(captureData: {
  captureId: string;
  storeId: string;
  operatorSlug?: string;
  destinationCity: string;
  originCity?: string | null;
  startDate: string;
  endDate?: string | null;
  totalCents: number;
  adultsCount: number;
  childrenCount?: number;
  airfarePerAdultCents?: number | null;
  transferPerAdultCents?: number | null;
  sourcePage: string;
}) {
  const supabase = getServerClient();
  // 1. Buscar demandas ativas da agência em travel_client_demands
  const { data: demands } = await supabase
    .from('travel_client_demands')
    .select('*')
    .eq('store_id', captureData.storeId)
    .eq('status', 'active');

  // 2. Buscar leads ativos do CRM da agência em leads_crm
  let crmLeads: any[] = [];
  try {
    const { data: lData } = await supabase
      .from('leads_crm')
      .select('*')
      .eq('store_id', captureData.storeId);
    crmLeads = (lData || []).filter((l: any) =>
      !['won', 'lost', 'cancelled', 'archived', 'opted_out'].includes(String(l.status || '').toLowerCase()) &&
      Boolean(
        l.destination ||
          l.destination_of_interest ||
          (Array.isArray(l.destination_tags) && l.destination_tags.length > 0)
      )
    );
  } catch (err) {
    console.warn('[travel-quote-capture] fallback consultando leads_crm:', err);
  }

  // 2.5 Buscar também interesses pré-CRM ativos em travel_interests
  let travelInterests: any[] = [];
  try {
    const { data: iData } = await supabase
      .from('travel_interests')
      .select('*')
      .eq('store_id', captureData.storeId);
    travelInterests = (iData || []).filter((it: any) =>
      ['open', 'matched', 'nurturing'].includes(String(it.status || 'open').toLowerCase())
    );
  } catch {
    // Tabela opcional em mocks enxutos
  }

  if ((demands || []).length === 0 && crmLeads.length === 0 && travelInterests.length === 0) return [];

  // Buscar histórico de preços para cálculo de temperatura e comparação histórica
  const { data: historicalPrices } = await supabase
    .from('travel_price_observations')
    .select('price_cents')
    .eq('store_id', captureData.storeId)
    .eq('travel_start_date', captureData.startDate)
    .limit(20);

  const observations = (historicalPrices || []).map(p => Number(p.price_cents));
  const tempAnalysis = calculateTariffTemperature(captureData.totalCents, observations);

  const productType =
    captureData.sourcePage === 'aereo_resultado' ? 'flight' :
    captureData.sourcePage === 'hotel_resultado' ? 'hotel' : 'package';

  const canonicalCaptureOffer = normalizeLegacyOfferToCanonical({
    id: captureData.captureId,
    source_type: 'quote_capture',
    title: `Captura ${captureData.operatorSlug || 'InfoTravel'}: ${captureData.destinationCity}`,
    destination_city: captureData.destinationCity,
    origin_city: captureData.originCity,
    start_date: captureData.startDate,
    end_date: captureData.endDate,
    total_cents: captureData.totalCents,
    adults_count: captureData.adultsCount,
    children_count: captureData.childrenCount || 0,
    airfare_per_adult_cents: captureData.airfarePerAdultCents ?? null,
    transfer_per_adult_cents: captureData.transferPerAdultCents ?? null,
    product_type: productType,
    operator_slug: captureData.operatorSlug,
  });

  const histInputs = observations.map((cents) => ({
    destination: captureData.destinationCity,
    totalCents: cents,
    adultsCount: captureData.adultsCount,
  }));

  const insertOpportunityCompat = async (payload: Record<string, any>) => {
    const { data: opp, error } = await supabase
      .from('travel_opportunities')
      .insert(payload)
      .select()
      .single();
    if (!error && opp) return opp;

    if (error && /42703|column .* does not exist|PGRST204/i.test(`${error.code || ''} ${error.message || ''}`)) {
      const fallbackPayload = {
        store_id: payload.store_id,
        demand_id: payload.demand_id ?? null,
        lead_id: payload.lead_id ?? null,
        capture_id: payload.capture_id,
        match_score: payload.match_score,
        match_reasons: payload.match_reasons,
        quoted_total_cents: payload.quoted_total_cents,
        client_budget_cents: payload.client_budget_cents,
        variance_pct: payload.variance_pct,
        historical_reference_median_cents: payload.historical_reference_median_cents,
        historical_sample_size: payload.historical_sample_size,
        tariff_temperature: payload.tariff_temperature,
        whatsapp_pitch_draft: payload.whatsapp_pitch_draft,
        status: payload.status,
      };
      const { data: fallbackOpp } = await supabase
        .from('travel_opportunities')
        .insert(fallbackPayload)
        .select()
        .single();
      return fallbackOpp || null;
    }
    return null;
  };

  const generatedOpps: any[] = [];

  // Avaliação 1: Demandas formais de travel_client_demands (via Motor Unificado Determinístico)
  for (const demand of demands || []) {
    const canonicalDemand = normalizeLegacyDemandToCanonical({
      id: demand.id,
      demand_source: 'client_demand',
      lead_id: demand.crm_lead_id || demand.lead_id || null,
      full_name: demand.contact_name || 'Cliente',
      whatsapp: demand.contact_phone || null,
      destination: demand.destination_city || '',
      travel_start: demand.earliest_departure || demand.earliest_departure_date || null,
      travel_end: demand.latest_departure || demand.latest_return_date || null,
      earliest_departure: demand.earliest_departure || null,
      latest_departure: demand.latest_departure || null,
      flexibility_days: demand.flexibility_days ?? undefined,
      date_flexible: demand.date_flexible ?? undefined,
      budget_max_cents: Number(demand.budget_max_cents || 0) > 0 ? Number(demand.budget_max_cents) : null,
      pax_adults: demand.adults_count || 2,
      pax_children: demand.children_count || 0,
      wanted_inclusions: [],
    });

    const unified = evaluateUnifiedOpportunityMatch(canonicalCaptureOffer, canonicalDemand, {
      minScore: 55,
      historicalObservations: histInputs,
    });

    if (unified.isMatch) {
      const opp = await insertOpportunityCompat({
        store_id: captureData.storeId,
        demand_id: demand.id,
        lead_id: demand.crm_lead_id || demand.lead_id || null,
        target_lead_id: demand.crm_lead_id || demand.lead_id || null,
        source_type: 'quote_capture',
        capture_id: captureData.captureId,
        offer_title: canonicalCaptureOffer.title,
        destination_city: captureData.destinationCity,
        departure_date: captureData.startDate,
        adults_count: captureData.adultsCount,
        children_count: captureData.childrenCount || 0,
        match_score: unified.matchScore,
        match_reasons: unified.matchReasons,
        quoted_total_cents: captureData.totalCents,
        simulated_total_cents: unified.effectiveOfferTotalCents,
        client_budget_cents: Number(demand.budget_max_cents || 0),
        variance_pct: unified.budgetVariancePct ?? 0,
        historical_reference_median_cents: unified.historicalCheck.historicalMedianCents ?? tempAnalysis.medianCents,
        historical_sample_size: Math.max(unified.historicalCheck.sampleCount, tempAnalysis.sampleSize),
        tariff_temperature: tempAnalysis.temperature,
        requires_child_requote: unified.requiresChildRequote,
        child_simulation: unified.childSimulation,
        historical_check: unified.historicalCheck,
        warnings: unified.warnings,
        match_tier: unified.matchTier,
        match_version: 'unified_v2',
        whatsapp_pitch_draft: unified.suggestedPitchPt,
        status: 'open',
      });
      if (opp) generatedOpps.push(opp);
    }
  }

  // Avaliação 2: Leads ativos do Funil Comercial / CRM em leads_crm (via Motor Unificado Determinístico)
  for (const lead of crmLeads) {
    const budget = Number(lead.budget_cents || lead.estimated_value_cents || 0);
    const canonicalLeadDemand = normalizeLegacyDemandToCanonical({
      ...lead,
      demand_source: 'lead_crm',
      lead_id: lead.id,
      budget_cents: budget > 0 ? budget : null,
    });

    const unified = evaluateUnifiedOpportunityMatch(canonicalCaptureOffer, canonicalLeadDemand, {
      minScore: 58,
      historicalObservations: histInputs,
    });

    if (unified.isMatch) {
      const existingCustom =
        typeof lead.custom_fields === 'object' && lead.custom_fields ? lead.custom_fields : {};
      const oppPayload = {
        capture_id: captureData.captureId,
        operator_slug: captureData.operatorSlug || 'infotravel_default',
        destination: captureData.destinationCity,
        origin: captureData.originCity,
        start_date: captureData.startDate,
        end_date: captureData.endDate,
        quoted_total_cents: captureData.totalCents,
        simulated_total_cents: unified.effectiveOfferTotalCents,
        budget_cents: budget,
        variance_pct: unified.budgetVariancePct ?? 0,
        tariff_temperature: tempAnalysis.temperature,
        requires_child_requote: unified.requiresChildRequote,
        match_reasons: unified.matchReasons,
        warnings: unified.warnings,
        whatsapp_pitch_draft: unified.suggestedPitchPt,
        matched_at: new Date().toISOString(),
      };

      const prevHistory = Array.isArray((existingCustom as any).infotravel_opportunities_history)
        ? (existingCustom as any).infotravel_opportunities_history
        : [];
      const nextHistory = [
        oppPayload,
        ...prevHistory.filter((h: any) => h?.capture_id !== captureData.captureId),
      ].slice(0, 12);

      await supabase
        .from('leads_crm')
        .update({
          algorithmic_score: unified.matchScore,
          last_matched_at: new Date().toISOString(),
          custom_fields: {
            ...existingCustom,
            infotravel_opportunity: oppPayload,
            infotravel_opportunities_history: nextHistory,
          },
        })
        .eq('id', lead.id);

      const opp = await insertOpportunityCompat({
        store_id: captureData.storeId,
        demand_id: null,
        lead_id: lead.id,
        target_lead_id: lead.id,
        source_type: 'quote_capture',
        capture_id: captureData.captureId,
        offer_title: canonicalCaptureOffer.title,
        destination_city: captureData.destinationCity,
        departure_date: captureData.startDate,
        adults_count: captureData.adultsCount,
        children_count: captureData.childrenCount || 0,
        match_score: unified.matchScore,
        match_reasons: unified.matchReasons,
        quoted_total_cents: captureData.totalCents,
        simulated_total_cents: unified.effectiveOfferTotalCents,
        client_budget_cents: budget,
        variance_pct: unified.budgetVariancePct ?? 0,
        historical_reference_median_cents: unified.historicalCheck.historicalMedianCents ?? tempAnalysis.medianCents,
        historical_sample_size: Math.max(unified.historicalCheck.sampleCount, tempAnalysis.sampleSize),
        tariff_temperature: tempAnalysis.temperature,
        requires_child_requote: unified.requiresChildRequote,
        child_simulation: unified.childSimulation,
        historical_check: unified.historicalCheck,
        warnings: unified.warnings,
        match_tier: unified.matchTier,
        match_version: 'unified_v2',
        whatsapp_pitch_draft: unified.suggestedPitchPt,
        status: 'open',
      });
      if (opp) generatedOpps.push(opp);
    }
  }

  // Avaliação 3: Backlog de Interesses pré-CRM (travel_interests)
  for (const interestRow of travelInterests) {
    if (interestRow.lead_id && crmLeads.some((l: any) => l.id === interestRow.lead_id)) continue;
    const datesObj = (interestRow.dates || {}) as Record<string, any>;
    const partyObj = (interestRow.party || {}) as Record<string, any>;
    const budgetObj = (interestRow.budget || {}) as Record<string, any>;
    const canonicalInterest = normalizeLegacyDemandToCanonical({
      id: interestRow.id,
      demand_source: 'travel_interest',
      lead_id: interestRow.lead_id || null,
      contact_id: interestRow.contact_id || null,
      full_name: interestRow.title || 'Interessado',
      destination_tags:
        Array.isArray(interestRow.destination_tags) && interestRow.destination_tags.length > 0
          ? interestRow.destination_tags
          : interestRow.destinations,
      preferred_destinations: interestRow.destinations,
      travel_start: datesObj.exactDepartureDate || null,
      travel_end: datesObj.exactReturnDate || null,
      target_months: datesObj.targetMonths || [],
      period_tags: interestRow.period_tags || [],
      flexibility_days: interestRow.flexibility_days ?? 3,
      date_flexibility_mode: datesObj.flexibility === 'flexible_anytime' ? 'flexible_anytime' : undefined,
      date_flexible: datesObj.flexibility === 'flexible_anytime',
      room_occupancies: interestRow.room_occupancies,
      pax_adults: partyObj.adults ?? 2,
      pax_children: partyObj.children ?? 0,
      children_ages: partyObj.childAges || partyObj.childrenAges || [],
      max_total_budget_cents: budgetObj.maxTotalBudgetCents || null,
    });

    const unified = evaluateUnifiedOpportunityMatch(canonicalCaptureOffer, canonicalInterest, {
      minScore: 60,
      historicalObservations: histInputs,
    });
    if (unified.isMatch) {
      const opp = await insertOpportunityCompat({
        store_id: captureData.storeId,
        demand_id: null,
        lead_id: interestRow.lead_id || null,
        target_lead_id: interestRow.lead_id || null,
        target_interest_id: interestRow.id,
        source_type: 'quote_capture',
        capture_id: captureData.captureId,
        offer_title: canonicalCaptureOffer.title,
        destination_city: captureData.destinationCity,
        departure_date: captureData.startDate,
        adults_count: captureData.adultsCount,
        children_count: captureData.childrenCount || 0,
        match_score: unified.matchScore,
        match_reasons: unified.matchReasons,
        quoted_total_cents: captureData.totalCents,
        simulated_total_cents: unified.effectiveOfferTotalCents,
        client_budget_cents: Number(budgetObj.maxTotalBudgetCents || 0),
        variance_pct: unified.budgetVariancePct ?? 0,
        historical_reference_median_cents: unified.historicalCheck.historicalMedianCents ?? tempAnalysis.medianCents,
        historical_sample_size: Math.max(unified.historicalCheck.sampleCount, tempAnalysis.sampleSize),
        tariff_temperature: tempAnalysis.temperature,
        requires_child_requote: unified.requiresChildRequote,
        child_simulation: unified.childSimulation,
        historical_check: unified.historicalCheck,
        warnings: unified.warnings,
        match_tier: unified.matchTier,
        match_version: 'unified_v2',
        whatsapp_pitch_draft: unified.suggestedPitchPt,
        status: 'open',
      });
      if (opp) generatedOpps.push(opp);
    }
  }

  return generatedOpps;
}

/**
 * Lista oportunidades do radar para a agência com filtros
 */
export async function listTravelOpportunities(storeId: string, options: { status?: string } = {}) {
  const supabase = getServerClient();
  let query = supabase
    .from('travel_opportunities')
    .select(`
      *,
      demand:travel_client_demands(
        contact_name,
        contact_phone,
        destination_city,
        budget_max_cents,
        last_interaction_at
      ),
      capture:travel_quote_captures(
        destination_city,
        start_date,
        end_date,
        total_cents,
        operator_slug
      )
    `)
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (options.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}
