/**
 * Algoritmo Determinístico de Casamento de Oportunidades de Viagem
 * SPEC-INFOTRAVEL-QUOTE-CAPTURE-AND-OPPORTUNITY-RADAR
 */

export interface ClientDemandMatchingCandidate {
  id: string;
  contactName: string;
  contactPhone?: string | null;
  destinationCity: string;
  earliestDeparture: string; // ISO 'YYYY-MM-DD'
  latestDeparture: string;   // ISO 'YYYY-MM-DD'
  budgetMaxCents: number;
  adultsCount: number;
  childrenCount?: number;
  preferredProductType: 'flight' | 'hotel' | 'package' | 'circuit' | 'any';
  lastInteractionAt: string; // ISO
}

export interface QuoteCaptureMatchingOffer {
  id: string;
  destinationCity: string;
  originCity?: string | null;
  startDate: string; // ISO 'YYYY-MM-DD'
  endDate?: string | null;
  totalCents: number;
  adultsCount: number;
  childrenCount?: number;
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
}

/**
 * Normaliza strings para comparação flexível de destinos
 */
export function normalizeCityName(city: string): string {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
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
 * Avalia se uma cotação se encaixa nos requisitos do cliente
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

  const reasons: string[] = [];
  let score = 0;

  // 1. Verificação de Destino
  const normDemandDest = normalizeCityName(demand.destinationCity);
  const normOfferDest = normalizeCityName(offer.destinationCity);
  const isDestMatch = normDemandDest.includes(normOfferDest) || normOfferDest.includes(normDemandDest);

  if (!isDestMatch) {
    return {
      isMatch: false,
      matchScore: 0,
      variancePct: 0,
      reasons: ['Destino não compatível'],
      suggestedWhatsAppPitch: ''
    };
  }
  score += 35;
  reasons.push(`Destino compatível: ${offer.destinationCity}`);

  // 2. Verificação de Data / Janela
  const isDateMatch = isDateWithinWindow(
    offer.startDate,
    demand.earliestDeparture,
    demand.latestDeparture,
    dateFlexibility
  );

  if (!isDateMatch) {
    return {
      isMatch: false,
      matchScore: 0,
      variancePct: 0,
      reasons: ['Data de partida fora da janela do cliente'],
      suggestedWhatsAppPitch: ''
    };
  }
  score += 30;
  reasons.push(`Data de embarque (${offer.startDate}) compatível com a janela desejada`);

  // 3. Verificação Financeira (Orçamento)
  const maxAllowedCents = demand.budgetMaxCents * (1 + tolerancePct / 100);
  const isBudgetMatch = offer.totalCents <= maxAllowedCents;

  const variancePct = Number(
    (((offer.totalCents - demand.budgetMaxCents) / demand.budgetMaxCents) * 100).toFixed(2)
  );

  if (!isBudgetMatch) {
    return {
      isMatch: false,
      matchScore: 0,
      variancePct,
      reasons: [`Valor cotado excede o orçamento do cliente em mais de ${tolerancePct}%`],
      suggestedWhatsAppPitch: ''
    };
  }

  if (variancePct <= 0) {
    score += 25;
    reasons.push(`Preço dentro ou abaixo do orçamento esperado (${Math.abs(variancePct)}% de economia)`);
  } else {
    score += 15;
    reasons.push(`Preço ligeiramente acima do orçamento original (+${variancePct}%), mas dentro da tolerância de ${tolerancePct}%`);
  }

  // 4. Compatibilidade de Passageiros
  if (offer.adultsCount >= demand.adultsCount) {
    score += 10;
    reasons.push(`Acomoda os ${demand.adultsCount} adultos planejados`);
  }

  // 5. Redação Automatizada para WhatsApp (Humanizada e Pronta para envio com 1 clique)
  const formattedPrice = (offer.totalCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
  
  const firstName = demand.contactName.trim().split(' ')[0];
  const formattedDate = new Date(offer.startDate).toLocaleDateString('pt-BR');

  const suggestedWhatsAppPitch =
    `Olá, ${firstName}! Tudo bem? Aqui é da ${agencyName}.\n\n` +
    `Lembrei do seu interesse em viajar para ${offer.destinationCity} e identifiquei uma oportunidade com valor muito atrativo para embarque por volta de ${formattedDate}:\n` +
    `Pacote completo com tarifa de ${formattedPrice}.\n\n` +
    `Como essas tarifas promocionais costumam oscilar rápido na operadora, gostaria de te apresentar os detalhes do roteiro antes que altere. Posso te enviar o descritivo?`;

  return {
    isMatch: true,
    matchScore: Math.min(score, 100),
    variancePct,
    reasons,
    suggestedWhatsAppPitch
  };
}
