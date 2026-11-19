/**
 * Algoritmo Determinístico de Casamento de Oportunidades de Viagem
 * SPEC-INFOTRAVEL-QUOTE-CAPTURE-AND-OPPORTUNITY-RADAR
 */

import {
  evaluateUnifiedOpportunityMatch,
  normalizeDestinationTagList,
  normalizeOpportunityText,
  normalizePeriodSpec,
  normalizeRoomsFromLeadOrLegacy,
  type StructuredRoomOccupancy,
} from "@/lib/travel/opportunity-matching-engine";

export interface ClientDemandMatchingCandidate {
  id: string;
  contactName: string;
  contactPhone?: string | null;
  destinationCity: string;
  destinationTags?: string[];
  earliestDeparture: string; // ISO 'YYYY-MM-DD'
  latestDeparture: string;   // ISO 'YYYY-MM-DD'
  targetMonths?: string[];
  flexibleAnytime?: boolean;
  budgetMaxCents: number;
  adultsCount: number;
  childrenCount?: number;
  childrenAges?: number[];
  rooms?: StructuredRoomOccupancy[];
  preferredProductType: 'flight' | 'hotel' | 'package' | 'circuit' | 'any';
  lastInteractionAt: string; // ISO
}

export interface QuoteCaptureMatchingOffer {
  id: string;
  destinationCity: string;
  destinationIata?: string | null;
  originCity?: string | null;
  startDate: string; // ISO 'YYYY-MM-DD'
  endDate?: string | null;
  totalCents: number;
  adultsCount: number;
  childrenCount?: number;
  childrenAges?: number[];
  airfarePerAdultCents?: number | null;
  transferPerAdultCents?: number | null;
  productType: 'flight' | 'hotel' | 'package' | 'circuit';
  summaryText?: string;
  items?: Array<{
    title: string;
    itemType: string;
    totalAmountCents: number;
  }>;
}

export interface OpportunityMatchResult {
  isMatch: boolean;
  matchScore: number; // 0 a 100
  variancePct: number; // Ex: -5.5% (abaixo do orçamento) ou +8.0% (dentro dos 10% de tolerância)
  reasons: string[];
  suggestedWhatsAppPitch: string;
  requiresChildRequote?: boolean;
  simulatedTotalCents?: number;
}

/**
 * Normaliza strings para comparação flexível de destinos
 */
export function normalizeCityName(city: string): string {
  return normalizeOpportunityText(city).replace(/[^a-z0-9]/g, '');
}

/**
 * Verifica se a data de início da oferta cai na janela desejada pelo cliente
 */
export function isDateWithinWindow(
  offerDateStr: string,
  earliestStr: string,
  latestStr: string,
  flexibilityDays: number = 2
): boolean {
  const offerDate = new Date(offerDateStr).getTime();
  const earliest = new Date(earliestStr).getTime() - flexibilityDays * 86400000;
  const latest = new Date(latestStr).getTime() + flexibilityDays * 86400000;
  return offerDate >= earliest && offerDate <= latest;
}

/**
 * Calcula a temperatura tarifária baseada em observações históricas
 */
export function calculateTariffTemperature(
  currentPriceCents: number,
  historicalObservations: number[]
): {
  temperature: 'cold' | 'moderate' | 'warm' | 'insufficient_data';
  medianCents: number | null;
  sampleSize: number;
} {
  const sampleSize = historicalObservations.length;
  if (sampleSize < 5) {
    return { temperature: 'insufficient_data', medianCents: null, sampleSize };
  }

  const sorted = [...historicalObservations].sort((a, b) => a - b);
  const mid = Math.floor(sampleSize / 2);
  const medianCents = sampleSize % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);

  const ratio = currentPriceCents / medianCents;
  if (ratio <= 0.88) {
    return { temperature: 'cold', medianCents, sampleSize }; // Oportunidade fria (tarifa barata!)
  }
  if (ratio >= 1.15) {
    return { temperature: 'warm', medianCents, sampleSize }; // Tarifa quente (alta temporada/pico)
  }
  return { temperature: 'moderate', medianCents, sampleSize };
}

/**
 * Avalia se uma cotação se encaixa nos requisitos do cliente via Motor Unificado SSOT
 */
export function matchQuoteWithDemand(
  demand: ClientDemandMatchingCandidate,
  offer: QuoteCaptureMatchingOffer,
  options: {
    budgetTolerancePct?: number; // Padrão: 10% de margem acima do orçamento
    dateFlexibilityDays?: number; // Padrão: 2 dias de flexibilidade
    agencyName?: string;
  } = {}
): OpportunityMatchResult {
  const tolerancePct = options.budgetTolerancePct ?? 10.0;
  const dateFlexibility = options.dateFlexibilityDays ?? 2;
  const agencyName = options.agencyName || 'Nossa Agência';

  const demandRooms = normalizeRoomsFromLeadOrLegacy({
    rooms: demand.rooms,
    adultsCount: demand.adultsCount,
    childrenCount: demand.childrenCount || 0,
    childrenAges: demand.childrenAges,
  });

  const offerRooms = normalizeRoomsFromLeadOrLegacy({
    adultsCount: offer.adultsCount,
    childrenCount: offer.childrenCount || 0,
    childrenAges: offer.childrenAges,
  });

  const unified = evaluateUnifiedOpportunityMatch(
    {
      id: offer.id,
      sourceType: 'quote_capture',
      title: offer.destinationCity,
      originCity: offer.originCity || null,
      destinationCity: offer.destinationCity,
      destinationIata: offer.destinationIata || null,
      destinationTags: normalizeDestinationTagList([offer.destinationCity]),
      departureDate: offer.startDate || null,
      returnDate: offer.endDate || null,
      quotedAdultsCount: offerRooms.adultsCount,
      quotedChildrenCount: offerRooms.childrenCount,
      quotedChildrenAges: offerRooms.childrenAges,
      rooms: offerRooms.rooms,
      totalPriceCents: offer.totalCents,
      airfarePerAdultCents: offer.airfarePerAdultCents ?? null,
      transferPerAdultCents: offer.transferPerAdultCents ?? null,
      productType: offer.productType,
    },
    {
      id: demand.id,
      demandSource: 'client_demand',
      fullName: demand.contactName,
      whatsapp: demand.contactPhone || null,
      destinations: normalizeDestinationTagList(demand.destinationTags, demand.destinationCity),
      period: normalizePeriodSpec({
        startDate: demand.earliestDeparture || null,
        endDate: demand.latestDeparture || null,
        targetMonths: demand.targetMonths || [],
        flexibilityDays: dateFlexibility,
        dateFlexibleFlag: demand.flexibleAnytime || false,
        dateFlexibilityMode: demand.flexibleAnytime ? 'flexible_anytime' : undefined,
      }),
      rooms: demandRooms.rooms,
      adultsCount: demandRooms.adultsCount,
      childrenAges: demandRooms.childrenAges,
      maxTotalBudgetCents: demand.budgetMaxCents > 0 ? demand.budgetMaxCents : null,
      budgetTolerancePct: tolerancePct,
      preferredProductTypes: demand.preferredProductType === 'any' ? [] : [demand.preferredProductType],
    },
    {
      minScore: 55,
      defaultFlexibilityDays: dateFlexibility,
      defaultBudgetTolerancePct: tolerancePct,
    }
  );

  const effectiveCents = unified.effectiveOfferTotalCents || offer.totalCents;
  const variancePct =
    demand.budgetMaxCents > 0
      ? Number((((effectiveCents - demand.budgetMaxCents) / demand.budgetMaxCents) * 100).toFixed(2))
      : 0;

  if (!unified.isMatch) {
    let legacyReason = unified.rejectionReasonPt || 'Oferta incompatível com os critérios do cliente';
    if (
      unified.rejectionCode === 'DESTINATION_MISMATCH' ||
      unified.rejectionCode === 'MISSING_OFFER_DESTINATION' ||
      unified.rejectionCode === 'MISSING_DEMAND_DESTINATION'
    ) {
      legacyReason = `Destino não compatível (${unified.rejectionReasonPt || offer.destinationCity})`;
    } else if (unified.rejectionCode === 'OVER_BUDGET_CAP') {
      legacyReason = `Valor cotado excede o orçamento do cliente em mais de ${tolerancePct}% (${unified.rejectionReasonPt || ''})`;
    } else if (
      unified.rejectionCode === 'DATES_OUT_OF_WINDOW' ||
      unified.rejectionCode === 'MISSING_DATES_NO_FLEX'
    ) {
      legacyReason = `Data de partida fora da janela do cliente (${unified.rejectionReasonPt || ''})`;
    }

    return {
      isMatch: false,
      matchScore: 0,
      variancePct,
      reasons: [legacyReason],
      suggestedWhatsAppPitch: '',
      requiresChildRequote: false,
      simulatedTotalCents: effectiveCents,
    };
  }
  const formattedPrice = (effectiveCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const firstName = demand.contactName.trim().split(' ')[0] || 'Cliente';
  const formattedDate = offer.startDate
    ? new Date(`${offer.startDate.slice(0, 10)}T12:00:00Z`).toLocaleDateString('pt-BR')
    : 'próximas saídas';

  const chdLabel = unified.requiresChildRequote
    ? ' (simulação considerando crianças; confirmamos tarifa exata no ato)'
    : '';

  const suggestedWhatsAppPitch =
    `Olá, ${firstName}! Tudo bem? Aqui é da ${agencyName}.\n\n` +
    `Lembrei do seu interesse em viajar para ${offer.destinationCity} e identifiquei uma oportunidade com valor muito atrativo para embarque por volta de ${formattedDate}:\n` +
    `Pacote completo com tarifa estimada de ${formattedPrice}${chdLabel}.\n\n` +
    `Como essas tarifas promocionais costumam oscilar rápido na operadora, gostaria de te apresentar os detalhes do roteiro antes que altere. Posso te enviar o descritivo?`;

  return {
    isMatch: true,
    matchScore: Math.min(unified.matchScore, 100),
    variancePct,
    reasons: [...unified.matchReasons, ...unified.warnings],
    suggestedWhatsAppPitch,
    requiresChildRequote: unified.requiresChildRequote,
    simulatedTotalCents: effectiveCents,
  };
}
