import { z } from 'zod';
import { supabase } from '@/lib/supabase';
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
 * Avalia demandas ativas da agência e gera oportunidades sob demanda
 */
async function evaluateRadarForCapture(captureData: {
  captureId: string;
  storeId: string;
  destinationCity: string;
  originCity?: string | null;
  startDate: string;
  endDate?: string | null;
  totalCents: number;
  adultsCount: number;
  childrenCount?: number;
  sourcePage: string;
}) {
  // Buscar demandas ativas da agência
  const { data: demands } = await supabase
    .from('travel_client_demands')
    .select('*')
    .eq('store_id', captureData.storeId)
    .eq('status', 'active');

  if (!demands || demands.length === 0) return [];

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

  for (const demand of demands) {
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

  return generatedOpps;
}

/**
 * Lista oportunidades do radar para a agência com filtros
 */
export async function listTravelOpportunities(storeId: string, options: { status?: string } = {}) {
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
