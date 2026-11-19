/**
 * travel-commercial-intelligence.ts — Motor de Inteligência Comercial e Memória de Oportunidades
 *
 * Captura de Interesses • Backlog Comercial Anual • Matching Determinístico de Ofertas •
 * Scoring Algébrico com Decomposição • Copy de Abordagem WhatsApp • Promoção Consciente ao CRM.
 *
 * Invariante Fundamental:
 * - Isto NÃO é um segundo CRM.
 * - Isto NÃO cadastra clientes automaticamente nem cria leads indiscriminadamente.
 * - É uma camada de inteligência e memória comercial que monitora ofertas e reconecta
 *   passageiros a promoções altamente compatíveis com suas intenções declaradas.
 */

import { formatMoney } from "@/lib/money";
import type { TravelParty, TravelOffer, PriceBasis } from "./excelencia-offer-engine";
import {
  evaluateUnifiedOpportunityMatch,
  normalizeDestinationTagList,
  normalizePeriodSpec,
  normalizeRoomsFromLeadOrLegacy,
  type CanonicalDemandLead,
  type CanonicalSupplyOffer,
  type ChildSimulationResult,
  type HistoricalPriceCheck,
} from "./opportunity-matching-engine";

// ============================================================================
// 1. COMMERCIAL CONTACT (Identidade Leve Pré-CRM)
// ============================================================================

export type CommercialContactStatus =
  | "active"
  | "nurturing"
  | "unresponsive"
  | "promoted_to_crm"
  | "opted_out";

export type PreferredContactChannel = "whatsapp" | "phone" | "instagram" | "email";

export interface CommercialContact {
  id: string;
  tenantId?: string;
  name: string;
  phone: string; // E.164 ou nacional limpo
  email?: string | null;
  instagramHandle?: string | null;
  city?: string | null;
  preferredChannel: PreferredContactChannel;
  status: CommercialContactStatus;
  notes?: string | null;
  linkedCrmLeadId?: string | null; // Preenchido APENAS após promoção voluntária ao CRM
  linkedCustomerId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 2. TRAVEL INTEREST (Estrutura de Intenção e Memória Comercial)
// ============================================================================

export type DateFlexibilityMode =
  | "exact_dates"
  | "specific_month"
  | "specific_season"
  | "flexible_anytime";

export type TravelUrgency = "immediate" | "moderate" | "exploring" | "future_trip";

export type TravelInterestStatus =
  | "open"
  | "matched"
  | "nurturing"
  | "dormant"
  | "converted"
  | "cancelled";

export interface TravelInterest {
  id: string;
  contactId: string;
  tenantId?: string;
  leadId?: string | null;
  title: string; // e.g., "Caribe / Punta Cana em família"
  destinations: string[]; // e.g. ["Punta Cana", "Caribe", "Cancún"]
  destinationTags?: Array<string | { label: string; normalized: string; iata?: string | null }>;
  destinationCategories?: string[]; // e.g. ["praia", "resort", "all_inclusive", "internacional"]
  preferredOrigins?: string[]; // e.g. ["XAP", "FLN", "GRU", "Chapecó"]
  periodTags?: string[];
  flexibilityDays?: number;
  dates: {
    flexibility: DateFlexibilityMode;
    targetMonths?: string[]; // e.g. ["2026-08", "2026-09", "2026-10"]
    exactDepartureDate?: string | null;
    exactReturnDate?: string | null;
    preferredSeason?: "summer" | "winter" | "spring" | "autumn" | "low_season" | "school_holidays";
    durationNightsRange?: [number, number]; // e.g. [5, 8]
  };
  party: TravelParty;
  roomOccupancies?: Array<{
    roomNumber?: number;
    roomLabel?: string;
    adultsCount?: number;
    childrenCount?: number;
    childrenAges?: number[];
  }>;
  budget: {
    maxTotalBudgetCents?: number | null;
    maxInstallmentCents?: number | null;
    preferredInstallments?: number | null; // e.g. 12, 15, 16
    priceBasisPreference?: PriceBasis;
  };
  inclusionsWanted: string[]; // e.g. ["all_inclusive", "aereo_incluso", "transfer", "bagagem"]
  hotelPreferences?: {
    minStars?: number; // e.g. 4 ou 5
    preferredChains?: string[];
    preferredHotelNames?: string[];
  };
  urgency: TravelUrgency;
  status: TravelInterestStatus;
  sourceInquiryText?: string | null;
  capturedByUserId?: string | null;
  expiresAt: string; // Data em que o interesse expira se não for reativado (e.g. 6 a 12 meses)
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 3. DETERMINISTIC MATCH SCORING BREAKDOWN
// ============================================================================

export interface MatchScoreDimension {
  dimension: "destination" | "budget" | "dates" | "party" | "inclusions";
  weight: number; // e.g. 35, 25, 20, 10, 10
  score: number; // 0..weight
  details: string;
}

export interface TravelOpportunityMatch {
  id: string;
  interestId: string;
  offerId: string;
  contactId: string;
  leadId?: string | null;
  matchScore: number; // 0..100
  isHighPriority: boolean; // matchScore >= 80
  matchTier?: string;
  requiresChildRequote?: boolean;
  simulatedTotalCents?: number | null;
  childSimulation?: ChildSimulationResult | null;
  historicalCheck?: HistoricalPriceCheck | null;
  warnings?: string[];
  alreadyProposedRecently?: boolean;
  dimensions: MatchScoreDimension[];
  matchedAt: string;
  status: "new" | "reviewed" | "approached" | "engaged" | "promoted_to_crm" | "dismissed";
  approachDraft: string;
  offerSnapshot: {
    title: string;
    destinationCity: string;
    datesDisplayText: string;
    installmentCount: number;
    installmentCents: number;
    totalPriceCents?: number | null;
    priceBasisLabel: string;
    hotelName?: string | null;
    mealPlan?: string | null;
    publicUrl: string;
  };
  notes?: string | null;
}

// ============================================================================
// 4. DETERMINISTIC SCORING ENGINE
// ============================================================================

function normalizeSearchTerm(str?: string | null): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Avalia a compatibilidade de destino (Peso máximo: 35 pontos)
 */
function evaluateDestinationMatch(
  offer: TravelOffer,
  interest: TravelInterest
): { score: number; details: string } {
  const normOfferCity = normalizeSearchTerm(offer.destination.city);
  const normOfferTitle = normalizeSearchTerm(offer.destination.title);
  const normOfferCountry = normalizeSearchTerm(offer.destination.country);

  let bestScore = 0;
  let matchDetail = "Sem correspondência de destino";

  for (const rawDest of interest.destinations) {
    const normDest = normalizeSearchTerm(rawDest);
    if (!normDest) continue;

    // Correspondência Exata de Cidade ou Título
    if (normOfferCity === normDest || normOfferTitle === normDest) {
      return { score: 35, details: `Destino exato correspondente: "${rawDest}" (35/35)` };
    }

    // Correspondência de Substring (ex: "Punta Cana" em "Punta Cana All Inclusive")
    if (normOfferCity.includes(normDest) || normOfferTitle.includes(normDest) || normDest.includes(normOfferCity)) {
      if (30 > bestScore) {
        bestScore = 30;
        matchDetail = `Destino altamente compatível: "${rawDest}" (30/35)`;
      }
    }

    // Correspondência de País ou Região
    if (normOfferCountry.includes(normDest) || normDest.includes(normOfferCountry)) {
      if (20 > bestScore) {
        bestScore = 20;
        matchDetail = `País/Região compatível: "${rawDest}" (20/35)`;
      }
    }
  }

  // Se não bateu destino direto, mas o interesse é por praia/resort e a oferta é resort
  if (bestScore === 0 && interest.destinationCategories?.length) {
    const isResortOffer =
      offer.hotels.some((h) => (h.mealPlanLabel || "").toLowerCase().includes("all inclusive")) ||
      offer.destination.title.toLowerCase().includes("resort");
    if (isResortOffer && interest.destinationCategories.includes("resort")) {
      bestScore = 15;
      matchDetail = "Categoria de viagem compatível (Resort / Férias) (15/35)";
    }
  }

  return { score: bestScore, details: matchDetail };
}

/**
 * Avalia a compatibilidade orçamentária (Peso máximo: 25 pontos)
 */
function evaluateBudgetMatch(
  offer: TravelOffer,
  interest: TravelInterest
): { score: number; details: string } {
  const offerInstallment = offer.paymentTermsSnapshot.installmentAmountCents || 0;
  const offerTotal =
    offer.pricing.totalPackagePriceCents ||
    offer.paymentTermsSnapshot.totalAmountCents ||
    0;

  const maxInstallment = interest.budget.maxInstallmentCents;
  const maxTotal = interest.budget.maxTotalBudgetCents;

  if (!maxInstallment && !maxTotal) {
    return { score: 20, details: "Sem restrição estrita de orçamento definida pelo contato (20/25)" };
  }

  let installmentScore = 0;
  if (maxInstallment && maxInstallment > 0) {
    if (offerInstallment <= maxInstallment) {
      installmentScore = 25;
    } else {
      const overpct = (offerInstallment - maxInstallment) / maxInstallment;
      if (overpct <= 0.1) installmentScore = 20;
      else if (overpct <= 0.25) installmentScore = 12;
      else installmentScore = 0;
    }
  }

  let totalScore = 0;
  if (maxTotal && maxTotal > 0) {
    if (offerTotal <= maxTotal) {
      totalScore = 25;
    } else {
      const overpct = (offerTotal - maxTotal) / maxTotal;
      if (overpct <= 0.1) totalScore = 20;
      else if (overpct <= 0.25) totalScore = 12;
      else totalScore = 0;
    }
  }

  const finalScore = Math.max(installmentScore, totalScore);
  const details =
    finalScore === 25
      ? `Total/parcela plenamente dentro do teto orçamentário (25/25)`
      : finalScore >= 12
      ? `Dentro da margem de flexibilidade orçamentária (${finalScore}/25)`
      : `Valor da oferta superior ao teto informado (${finalScore}/25)`;

  return { score: finalScore, details };
}

/**
 * Avalia a compatibilidade de datas / sazonalidade (Peso máximo: 20 pontos)
 */
function evaluateDatesMatch(
  offer: TravelOffer,
  interest: TravelInterest
): { score: number; details: string } {
  const flex = interest.dates.flexibility;

  if (flex === "flexible_anytime") {
    return { score: 20, details: "Contato declarou flexibilidade total de datas (20/20)" };
  }

  const offerDepDate = offer.dates.departureDate;
  if (!offerDepDate) {
    return { score: 14, details: "Oferta com datas abertas (14/20)" };
  }

  const offerYearMonth = offerDepDate.slice(0, 7); // YYYY-MM

  if (interest.dates.targetMonths?.includes(offerYearMonth)) {
    return { score: 20, details: `Mês de embarque exato (${offerYearMonth}) correspondente (20/20)` };
  }

  if (interest.dates.exactDepartureDate === offerDepDate) {
    return { score: 20, details: `Data de embarque exata (${offerDepDate}) correspondente (20/20)` };
  }

  return { score: 8, details: `Oferta em ${offerYearMonth}, divergente do mês ideal (8/20)` };
}

/**
 * Avalia a compatibilidade de composição de passageiros (Peso máximo: 10 pontos)
 */
function evaluatePartyMatch(
  offer: TravelOffer,
  interest: TravelInterest
): { score: number; details: string } {
  const interestAdults = interest.party.adults || 2;
  const interestChildren = interest.party.children || 0;

  const offerAdults = offer.party.adults || 2;
  const offerChildren = offer.party.children || 0;

  if (interestAdults === offerAdults && interestChildren === offerChildren) {
    return { score: 10, details: "Composição idêntica de adultos e crianças (10/10)" };
  }

  if (interestChildren > 0 && offerChildren === 0) {
    return { score: 5, details: "Contato viaja com crianças; oferta cotada para adultos (5/10)" };
  }

  return { score: 8, details: "Ocupação compatível com adaptação simples de quarto (8/10)" };
}

/**
 * Avalia as inclusões desejadas (Peso máximo: 10 pontos)
 */
function evaluateInclusionsMatch(
  offer: TravelOffer,
  interest: TravelInterest
): { score: number; details: string } {
  if (!interest.inclusionsWanted || interest.inclusionsWanted.length === 0) {
    return { score: 10, details: "Sem exigências restritivas de inclusão (10/10)" };
  }

  let matchedCount = 0;
  const wanted = interest.inclusionsWanted;

  const hasAllInclusive = offer.hotels.some(
    (h) => (h.mealPlanLabel || "").toLowerCase().includes("all inclusive")
  );
  const hasAirfare = offer.destination.originCity || offer.flights.length > 0;
  const hasTransfer = offer.transfers.included;

  for (const item of wanted) {
    if (item === "all_inclusive" && hasAllInclusive) matchedCount++;
    if (item === "aereo_incluso" && hasAirfare) matchedCount++;
    if (item === "transfer" && hasTransfer) matchedCount++;
  }

  const ratio = matchedCount / wanted.length;
  const score = Math.round(ratio * 10);
  return {
    score,
    details: `${matchedCount} de ${wanted.length} inclusões desejadas confirmadas na oferta (${score}/10)`,
  };
}

/**
 * Calcula a pontuação determinística e detalhada de matching entre uma Oferta e um Interesse.
 */
export function computeOfferInterestMatch(
  offer: TravelOffer,
  interest: TravelInterest,
  contact: CommercialContact
): TravelOpportunityMatch | null {
  if (contact.status === "opted_out" || interest.status === "cancelled" || interest.status === "dormant") {
    return null;
  }

  const normalizedRooms = normalizeRoomsFromLeadOrLegacy({
    rooms: interest.roomOccupancies,
    adultsCount: interest.party.adults || 2,
    childrenCount: interest.party.children || 0,
    childrenAges: interest.party.childAges || [],
    roomsCount: Array.isArray(interest.roomOccupancies) && interest.roomOccupancies.length > 0
      ? interest.roomOccupancies.length
      : 1,
  });

  const offerRooms = normalizeRoomsFromLeadOrLegacy({
    rooms: (offer.rooms || []).map((r, idx) => ({
      roomNumber: idx + 1,
      roomLabel: r.roomTypeLabel,
      adultsCount: r.adults,
      childrenCount: r.children,
      childrenAges: offer.party.childAges || [],
    })),
    adultsCount: offer.party.adults || 2,
    childrenCount: (offer.party.children || 0) + (offer.party.infants || 0),
    childrenAges: offer.party.childAges || [],
  });

  const canonicalOffer: CanonicalSupplyOffer = {
    id: offer.id,
    sourceType: "offer_engine",
    title: offer.destination.title || offer.destination.city,
    originCity: offer.destination.originCity || null,
    originIata: offer.destination.originIata || null,
    destinationCity: offer.destination.city || offer.destination.title,
    destinationIata: offer.destination.destinationIata || null,
    destinationCountry: offer.destination.country || null,
    destinationTags: normalizeDestinationTagList(
      [offer.destination.city, offer.destination.title].filter(Boolean)
    ),
    departureDate: offer.dates.departureDate || null,
    returnDate: offer.dates.returnDate || null,
    quotedAdultsCount: offerRooms.adultsCount,
    quotedChildrenCount: offerRooms.childrenCount,
    quotedChildrenAges: offerRooms.childrenAges,
    rooms: offerRooms.rooms,
    totalPriceCents:
      offer.pricing.totalPackagePriceCents ||
      offer.paymentTermsSnapshot.totalAmountCents ||
      0,
    installmentCount: offer.paymentTermsSnapshot.installmentCount || offer.pricing.installmentCount || null,
    installmentValueCents:
      offer.paymentTermsSnapshot.installmentAmountCents || offer.pricing.installmentAmountCents || null,
    productType: offer.offerType || null,
    mealPlan: offer.hotels[0]?.mealPlanLabel || null,
    inclusions: offer.inclusions || [],
  };

  const seasonToTags: string[] = [...(interest.periodTags || [])];
  if (interest.dates.preferredSeason === "school_holidays") seasonToTags.push("ferias_julho");
  if (interest.dates.preferredSeason === "low_season") seasonToTags.push("baixa_temporada");

  const canonicalDemand: CanonicalDemandLead = {
    id: interest.id,
    demandSource: "travel_interest",
    leadId: interest.leadId || contact.linkedCrmLeadId || null,
    contactId: contact.id,
    fullName: contact.name,
    whatsapp: contact.phone,
    originCity: interest.preferredOrigins?.[0] || null,
    destinations: normalizeDestinationTagList(
      interest.destinationTags || interest.destinations,
      interest.title
    ),
    period: normalizePeriodSpec({
      startDate: interest.dates.exactDepartureDate || null,
      endDate: interest.dates.exactReturnDate || null,
      targetMonths: interest.dates.targetMonths || [],
      seasonTags: seasonToTags,
      flexibilityDays:
        typeof interest.flexibilityDays === "number"
          ? interest.flexibilityDays
          : String(interest.dates.flexibility) === "flexible_plus_minus_7" ||
              String(interest.dates.flexibility) === "flexible_7days"
            ? 7
            : 3,
      dateFlexibilityMode:
        interest.dates.flexibility === "flexible_anytime"
          ? "flexible_anytime"
          : String(interest.dates.flexibility) === "unspecified"
            ? "unspecified"
            : undefined,
      dateFlexibleFlag: interest.dates.flexibility === "flexible_anytime",
    }),
    rooms: normalizedRooms.rooms,
    adultsCount: normalizedRooms.adultsCount,
    childrenAges: normalizedRooms.childrenAges,
    maxTotalBudgetCents:
      interest.budget.maxTotalBudgetCents && interest.budget.maxTotalBudgetCents > 0
        ? interest.budget.maxTotalBudgetCents
        : null,
    maxInstallmentCents:
      interest.budget.maxInstallmentCents && interest.budget.maxInstallmentCents > 0
        ? interest.budget.maxInstallmentCents
        : null,
    preferredInstallments: interest.budget.preferredInstallments || null,
    wantedInclusions: interest.inclusionsWanted || [],
    minHotelStars: interest.hotelPreferences?.minStars || null,
  };

  const unified = evaluateUnifiedOpportunityMatch(canonicalOffer, canonicalDemand, {
    minScore: 45,
  });

  // Hard gate: nunca retornar match se destino, datas ou orcamento falharem no motor unificado
  if (!unified.isMatch || unified.scoreBreakdown.destination === 0) {
    return null;
  }

  const destMatch = evaluateDestinationMatch(offer, interest);
  const budgetMatch = evaluateBudgetMatch(offer, interest);
  const datesMatch = evaluateDatesMatch(offer, interest);
  const partyMatch = evaluatePartyMatch(offer, interest);
  const inclusionsMatch = evaluateInclusionsMatch(offer, interest);

  const effectiveDestScore = Math.max(destMatch.score, unified.scoreBreakdown.destination);
  if (effectiveDestScore === 0) {
    return null;
  }

  const totalScore =
    effectiveDestScore +
    budgetMatch.score +
    datesMatch.score +
    partyMatch.score +
    inclusionsMatch.score;

  // Filtro de corte rigoroso
  if (totalScore < 45) {
    return null;
  }

  const destDetails =
    destMatch.score > 0
      ? destMatch.details
      : unified.matchedDestinationLabel
        ? `Gateway/Destino compatível: ${unified.matchedDestinationLabel} (${effectiveDestScore}/35)`
        : destMatch.details;

  const partyDetails = unified.childSimulation.requiresChildRequote
    ? `${partyMatch.details} — ${unified.childSimulation.reasonPt}`
    : partyMatch.details;

  const dimensions: MatchScoreDimension[] = [
    { dimension: "destination", weight: 35, score: effectiveDestScore, details: destDetails },
    { dimension: "budget", weight: 25, score: budgetMatch.score, details: budgetMatch.details },
    { dimension: "dates", weight: 20, score: datesMatch.score, details: datesMatch.details },
    { dimension: "party", weight: 10, score: partyMatch.score, details: partyDetails },
    { dimension: "inclusions", weight: 10, score: inclusionsMatch.score, details: inclusionsMatch.details },
  ];

  const primaryHotel = offer.hotels[0];
  const approachDraft = generatePersonalizedOpportunityApproach(contact, interest, offer);

  return {
    id: `opp-${interest.id}-${offer.id}`,
    interestId: interest.id,
    offerId: offer.id,
    contactId: contact.id,
    leadId: interest.leadId || contact.linkedCrmLeadId || null,
    matchScore: totalScore,
    isHighPriority: totalScore >= 80,
    matchTier: unified.matchTier,
    requiresChildRequote: unified.requiresChildRequote,
    simulatedTotalCents: unified.effectiveOfferTotalCents,
    childSimulation: unified.childSimulation,
    historicalCheck: unified.historicalCheck,
    warnings: unified.warnings,
    alreadyProposedRecently: unified.alreadyProposedRecently,
    dimensions,
    matchedAt: new Date().toISOString(),
    status: "new",
    approachDraft,
    offerSnapshot: {
      title: offer.destination.title,
      destinationCity: offer.destination.city,
      datesDisplayText: offer.dates.displayRangeText,
      installmentCount: offer.paymentTermsSnapshot.installmentCount,
      installmentCents: offer.paymentTermsSnapshot.installmentAmountCents,
      totalPriceCents:
        offer.pricing.totalPackagePriceCents ||
        offer.paymentTermsSnapshot.totalAmountCents,
      priceBasisLabel: offer.pricing.priceBasisLabel,
      hotelName: primaryHotel?.hotelName || null,
      mealPlan: primaryHotel?.mealPlanLabel || null,
      publicUrl: offer.publicPage.url,
    },
  };
}

// ============================================================================
// 5. PERSONALIZED WHATSAPP APPROACH GENERATOR
// ============================================================================

/**
 * Gera mensagem de abordagem WhatsApp altamente consultiva e personalizada.
 * Relembra o interesse prévio sem parecer robótico nem spam de newsletter.
 */
export function generatePersonalizedOpportunityApproach(
  contact: CommercialContact,
  interest: TravelInterest,
  offer: TravelOffer
): string {
  const firstName = contact.name.trim().split(" ")[0] || "Cliente";
  const primaryHotel = offer.hotels[0];
  const formattedInstallment = formatMoney(offer.paymentTermsSnapshot.installmentAmountCents);
  const count = offer.paymentTermsSnapshot.installmentCount;
  const mealSuffix = primaryHotel?.mealPlanLabel ? ` (${primaryHotel.mealPlanLabel})` : "";

  const lines: string[] = [
    `Olá, ${firstName}! Tudo bem?`,
    "",
    `Lembrei de você hoje porque abriu uma condição promocional excelente para *${offer.destination.title.trim()}*, exatamente na linha da viagem que você estava planejando!`,
    "",
    `• Período: ${offer.dates.displayRangeText}`,
  ];

  if (primaryHotel?.hotelName) {
    lines.push(`• Hospedagem: *${primaryHotel.hotelName}*${mealSuffix}`);
  }

  if (offer.transfers.included) {
    lines.push("• Traslados de chegada e saída inclusos");
  }

  lines.push("");
  lines.push(
    `Ficou em *${count}x de ${formattedInstallment}* ${offer.paymentTermsSnapshot.shortStoryLabel} (${offer.pricing.priceBasisLabel.toLowerCase()}).`
  );

  lines.push("");
  lines.push(
    `Como essas vagas costumam esgotar rápido, separei os detalhes para você dar uma olhada:`
  );
  if (offer.publicPage.url) {
    lines.push(offer.publicPage.url);
  }
  lines.push("");
  lines.push("Quer que eu reserve ou verifique para as suas datas exatas?");

  return lines.join("\n");
}

// ============================================================================
// 6. BACKLOG EVALUATOR & CRM PROMOTION
// ============================================================================

/**
 * Varre todo o backlog de interesses abertos contra uma nova oferta publicada
 * e retorna todas as oportunidades ordenadas por score de matching.
 */
export function evaluateInterestBacklogAgainstOffer(
  offer: TravelOffer,
  interests: TravelInterest[],
  contactsById: Record<string, CommercialContact>
): TravelOpportunityMatch[] {
  const matches: TravelOpportunityMatch[] = [];

  for (const interest of interests) {
    if (interest.status !== "open" && interest.status !== "matched") {
      continue;
    }

    const contact = contactsById[interest.contactId];
    if (!contact || contact.status === "opted_out") {
      continue;
    }

    const match = computeOfferInterestMatch(offer, interest, contact);
    if (match) {
      matches.push(match);
    }
  }

  // Ordenar por maior score descendente
  matches.sort((a, b) => b.matchScore - a.matchScore);
  return matches;
}

export interface CrmLeadPromotionPayload {
  contactId: string;
  name: string;
  phone: string;
  email?: string | null;
  origin: "commercial_opportunity_match";
  interestId: string;
  offerId: string;
  matchScore: number;
  notes: string;
  storeId?: string;
}

/**
 * Prepara o payload para promoção consciente de uma oportunidade ao CRM comercial formal.
 */
export function buildCrmPromotionPayload(
  match: TravelOpportunityMatch,
  contact: CommercialContact
): CrmLeadPromotionPayload {
  return {
    contactId: contact.id,
    name: contact.name,
    phone: contact.phone,
    email: contact.email,
    origin: "commercial_opportunity_match",
    interestId: match.interestId,
    offerId: match.offerId,
    matchScore: match.matchScore,
    notes: `Lead qualificado via Oportunidade Comercial (Score: ${match.matchScore}/100) para ${match.offerSnapshot.title}. Abordagem enviada: ${match.status}.`,
  };
}
