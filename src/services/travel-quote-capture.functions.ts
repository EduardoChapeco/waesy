import { z } from 'zod';
import { getServerClient } from '@/lib/supabase';
import { matchQuoteWithDemand, calculateTariffTemperature } from '@/lib/travel-opportunity-matcher';

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

  // 4. Executar Radar de Oportunidades Sob Demanda (sem trigger no banco)
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
      !['won', 'lost', 'cancelled'].includes(l.status) &&
      Boolean(l.destination || l.destination_of_interest)
    );
  } catch (err) {
    console.warn('[travel-quote-capture] fallback consultando leads_crm:', err);
  }

  // Se não houver demandas nem leads ativos, encerra
  const totalDemands = (demands || []).length;
  const totalCrmLeads = crmLeads.length;
  if (totalDemands === 0 && totalCrmLeads === 0) return [];

  // Buscar histórico de preços para cálculo de temperatura
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

  const generatedOpps = [];

  // Avaliação 1: Demandas formais de travel_client_demands
  for (const demand of demands || []) {
    const match = matchQuoteWithDemand(
      {
        id: demand.id,
        contactName: demand.contact_name,
        contactPhone: demand.contact_phone,
        destinationCity: demand.destination_city,
        earliestDeparture: demand.earliest_departure,
        latestDeparture: demand.latest_departure,
        budgetMaxCents: Number(demand.budget_max_cents),
        adultsCount: demand.adults_count,
        childrenCount: demand.children_count,
        preferredProductType: demand.preferred_product_type,
        lastInteractionAt: demand.last_interaction_at
      },
      {
        id: captureData.captureId,
        destinationCity: captureData.destinationCity,
        originCity: captureData.originCity,
        startDate: captureData.startDate,
        endDate: captureData.endDate,
        totalCents: captureData.totalCents,
        adultsCount: captureData.adultsCount,
        childrenCount: captureData.childrenCount,
        productType
      }
    );

    if (match.isMatch) {
      const { data: opp, error } = await supabase
        .from('travel_opportunities')
        .insert({
          store_id: captureData.storeId,
          demand_id: demand.id,
          capture_id: captureData.captureId,
          match_score: match.matchScore,
          match_reasons: match.reasons,
          quoted_total_cents: captureData.totalCents,
          client_budget_cents: demand.budget_max_cents,
          variance_pct: match.variancePct,
          historical_reference_median_cents: tempAnalysis.medianCents,
          historical_sample_size: tempAnalysis.sampleSize,
          tariff_temperature: tempAnalysis.temperature,
          whatsapp_pitch_draft: match.suggestedWhatsAppPitch,
          status: 'open'
        })
        .select()
        .single();

      if (!error && opp) {
        generatedOpps.push(opp);
      }
    }
  }

  // Avaliação 2: Leads ativos do Funil Comercial / CRM em leads_crm
  for (const lead of crmLeads) {
    const candidateCity = lead.destination || lead.destination_of_interest || '';
    const budget = Number(lead.budget_cents || lead.estimated_value_cents || 0);
    const earliest = lead.travel_start || lead.departure_date || captureData.startDate;
    const latest = lead.travel_end || lead.return_date || captureData.startDate;

    const match = matchQuoteWithDemand(
      {
        id: lead.id,
        contactName: lead.full_name || lead.title || 'Cliente sem nome',
        contactPhone: lead.phone || null,
        destinationCity: candidateCity,
        earliestDeparture: earliest,
        latestDeparture: latest,
        budgetMaxCents: budget,
        adultsCount: Number(lead.pax_adults || lead.passenger_count || lead.pax_count || 1),
        childrenCount: Number(lead.pax_children || 0),
        preferredProductType: 'any',
        lastInteractionAt: lead.updated_at || lead.created_at || new Date().toISOString()
      },
      {
        id: captureData.captureId,
        destinationCity: captureData.destinationCity,
        originCity: captureData.originCity,
        startDate: captureData.startDate,
        endDate: captureData.endDate,
        totalCents: captureData.totalCents,
        adultsCount: captureData.adultsCount,
        childrenCount: captureData.childrenCount,
        productType
      }
    );

    if (match.isMatch) {
      // 1. Atualizar o card em leads_crm com o score e payload estruturado da oportunidade
      const existingCustom = (typeof lead.custom_fields === 'object' && lead.custom_fields) ? lead.custom_fields : {};
      const oppPayload = {
        capture_id: captureData.captureId,
        operator_slug: captureData.operatorSlug || 'infotravel_default',
        destination: captureData.destinationCity,
        origin: captureData.originCity,
        start_date: captureData.startDate,
        end_date: captureData.endDate,
        quoted_total_cents: captureData.totalCents,
        budget_cents: budget,
        variance_pct: match.variancePct,
        tariff_temperature: tempAnalysis.temperature,
        match_reasons: match.reasons,
        whatsapp_pitch_draft: match.suggestedWhatsAppPitch,
        matched_at: new Date().toISOString()
      };

      await supabase
        .from('leads_crm')
        .update({
          algorithmic_score: match.matchScore,
          custom_fields: {
            ...existingCustom,
            infotravel_opportunity: oppPayload
          }
        })
        .eq('id', lead.id);

      // 2. Gravar no ledger de travel_opportunities
      const { data: opp, error } = await supabase
        .from('travel_opportunities')
        .insert({
          store_id: captureData.storeId,
          demand_id: null,
          lead_id: lead.id,
          capture_id: captureData.captureId,
          match_score: match.matchScore,
          match_reasons: match.reasons,
          quoted_total_cents: captureData.totalCents,
          client_budget_cents: budget,
          variance_pct: match.variancePct,
          historical_reference_median_cents: tempAnalysis.medianCents,
          historical_sample_size: tempAnalysis.sampleSize,
          tariff_temperature: tempAnalysis.temperature,
          whatsapp_pitch_draft: match.suggestedWhatsAppPitch,
          status: 'open'
        })
        .select()
        .single();

      if (!error && opp) {
        generatedOpps.push(opp);
      }
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
