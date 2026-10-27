/**
 * excelencia-offer-engine.ts — Motor Unificado Excelência Tour
 * Intake Multimodal c/ Proveniência • Conciliação de Ocupação e Base Tarifária •
 * Catálogo Central de Hotéis c/ Aliases • Motor de Campanhas de Parcelamento •
 * Seletor Dinâmico de Inclusões (2-4 slots) • Text-Fit c/ Camada Duplicada de Sombra •
 * StoryDocument Scene Graph (1080x1920) • Edição Estruturada por IA •
 * Gerador de Copy WhatsApp (Regra Estrita "HOJE") • Ciclo de 24h & Memória Global de Preços.
 */

import { formatMoney } from "@/lib/money";
import { GLOBAL_HOTELS_RESORTS_CATALOG } from "@/lib/data/hotels-resorts-catalog";
import {
  type GlassMaterial,
  type GlassPresetId,
  getGlassPreset,
  normalizeGlassMaterial,
} from "./liquid-glass-engine";

// ============================================================================
// 1. EXTRACTED FIELD & PROVENANCE CONTRACT (Sec. 4)
// ============================================================================

export type ExtractionSourceType =
  | "ocr"
  | "vision"
  | "text"
  | "catalog"
  | "campaign_rule"
  | "user"
  | "calculated";

export interface ExtractedField<T> {
  value: T | null;
  confidence: number; // 0..1
  sourceType: ExtractionSourceType;
  sourceAssetId?: string;
  evidenceText?: string;
  evidenceBox?: { page?: number; x: number; y: number; width: number; height: number };
  requiresReview: boolean;
}

export function createExtractedField<T>(
  value: T | null,
  confidence = 0.95,
  sourceType: ExtractionSourceType = "text",
  evidenceText?: string
): ExtractedField<T> {
  return {
    value,
    confidence,
    sourceType,
    evidenceText,
    requiresReview: value === null || confidence < 0.75,
  };
}

// ============================================================================
// 2. TRAVELERS, OCCUPANCY & PRICE BASIS (Sec. 5)
// ============================================================================

export type PartyLabelMode = "single" | "couple" | "family" | "group" | "custom";

export interface TravelParty {
  adults: number;
  children: number;
  infants: number;
  childAges: number[];
  infantAgesMonths?: number[];
  labelMode: PartyLabelMode;
  customLabel?: string;
}

export interface RoomOccupancy {
  roomIndex: number;
  roomTypeLabel: string;
  roomCategoryCode?: string;
  boardBasis?:
    | "room_only"
    | "breakfast"
    | "half_board"
    | "full_board"
    | "all_inclusive"
    | "custom";
  boardBasisLabel?: string;
  adults: number;
  children: number;
  infants?: number;
  childAges?: number[];
  bedConfiguration?: string;
  notes?: string;
}

export type PriceBasis =
  | "per_person"
  | "per_couple"
  | "per_family"
  | "per_room"
  | "per_cabin"
  | "total_package"
  | "per_group"
  | "custom";

// ============================================================================
// 3. PAYMENT CAMPAIGN ENGINE (Sec. 7)
// ============================================================================

export type PaymentMethodKind = "boleto" | "card" | "pix" | "mixed" | "custom";

export interface PaymentCampaign {
  id: string;
  name: string;
  active: boolean;
  validFrom?: string;
  validUntil?: string;
  allowedInstallments: number[]; // [10, 12, 15, 16]
  defaultInstallments: number;
  methods: PaymentMethodKind[];
  entryRequired: boolean;
  entryPercent?: number;
  entryFixedAmount?: number;
  firstInstallmentOffsetDays?: number;
  interestMode: "interest_free" | "with_interest" | "supplier_defined";
  legalText: string;
  shortStoryLabel: string; // e.g. "no boleto e cartão s/ juros"
  shortWhatsAppLabel: string; // e.g. "15x de R$ 284 no boleto ou cartão"
}

export interface PaymentTermsSnapshot {
  campaignId?: string;
  campaignName?: string;
  installmentCount: number;
  installmentAmountCents: number;
  totalAmountCents: number;
  methods: PaymentMethodKind[];
  entryRequired: boolean;
  entryAmountCents?: number;
  firstDueRule?: string;
  interestMode: "interest_free" | "with_interest" | "supplier_defined";
  shortStoryLabel: string;
  shortWhatsAppLabel: string;
  legalText: string;
  recalculatedFromTotal: boolean;
}

export const CANONICAL_PAYMENT_CAMPAIGNS: PaymentCampaign[] = [
  {
    id: "camp-excelencia-15x",
    name: "Campanha Excelência 15x Boleto/Cartão",
    active: true,
    allowedInstallments: [10, 12, 15, 16],
    defaultInstallments: 15,
    methods: ["boleto", "card"],
    entryRequired: false,
    firstInstallmentOffsetDays: 30,
    interestMode: "interest_free",
    legalText: "Parcelamento em até 15x sem juros no boleto bancário ou cartão de crédito, sujeito à aprovação cadastral.",
    shortStoryLabel: "no boleto e cartão",
    shortWhatsAppLabel: "no boleto ou cartão",
  },
  {
    id: "camp-excelencia-12x",
    name: "Campanha Padrão 12x Sem Juros",
    active: true,
    allowedInstallments: [10, 12],
    defaultInstallments: 12,
    methods: ["boleto", "card", "pix"],
    entryRequired: false,
    firstInstallmentOffsetDays: 30,
    interestMode: "interest_free",
    legalText: "Parcelamento em até 12x sem juros no boleto ou cartão de crédito.",
    shortStoryLabel: "no boleto e cartão",
    shortWhatsAppLabel: "no boleto ou cartão",
  },
  {
    id: "camp-excelencia-10x",
    name: "Campanha Operadora 10x Sem Juros",
    active: true,
    allowedInstallments: [10],
    defaultInstallments: 10,
    methods: ["boleto", "card"],
    entryRequired: false,
    firstInstallmentOffsetDays: 30,
    interestMode: "interest_free",
    legalText: "Parcelamento em até 10x sem juros no cartão ou boleto.",
    shortStoryLabel: "no boleto e cartão",
    shortWhatsAppLabel: "no boleto ou cartão",
  },
  {
    id: "camp-excelencia-16x",
    name: "Campanha Especial 16x",
    active: true,
    allowedInstallments: [10, 12, 15, 16],
    defaultInstallments: 16,
    methods: ["boleto", "card"],
    entryRequired: false,
    firstInstallmentOffsetDays: 30,
    interestMode: "interest_free",
    legalText: "Campanha promocional em até 16x no boleto ou cartão.",
    shortStoryLabel: "no boleto e cartão",
    shortWhatsAppLabel: "no boleto ou cartão",
  },
];

export interface OfferPricing {
  currency: "BRL" | "USD" | "EUR";
  displayMode: "installments_primary" | "total_primary" | "cash_and_installments";
  priceBasis: PriceBasis;
  priceBasisLabel: string; // e.g., "Por pessoa", "Para 2 adultos", "Por casal"
  occupancySummaryLabel: string; // e.g., "Em apartamento duplo", "2 adultos + 1 criança (8 anos)"
  totalPackagePriceCents?: number | null;
  unitPriceCents?: number | null; // e.g., per-person or per-room when applicable
  cashPriceCents?: number | null;
  downPaymentCents?: number | null;
  installmentCount?: number; // 10, 12, 15, 16, etc.
  installmentAmountCents?: number | null;
  firstInstallmentRule?: string; // e.g. "1ª para 30 dias", "sem entrada"
  paymentMethods: PaymentMethodKind[];
  paymentCampaignId?: string;
  paymentTermsLabel: string; // e.g., "no boleto e cartão"
  taxesIncluded?: boolean;
  sourceArithmeticDiffCents?: number;
  notes?: string;
}

// ============================================================================
// 4. CENTRAL HOTEL & DESTINATION CATALOG RESOLVER (Sec. 6)
// ============================================================================

export interface CatalogHotelEntity {
  id: string;
  canonicalName: string;
  slug: string;
  brand?: string;
  chain?: string;
  category: "hotel" | "resort" | "inn" | "cruise" | "lodge" | "apartment";
  starRating?: number;
  destination: {
    country: string;
    stateOrRegion?: string;
    city: string;
    zoneOrBeach?: string;
    iataCodes: string[];
  };
  aliases: string[];
  defaultMealPlans: string[];
  shortPitch: string;
  longDescription: string;
  highlights: string[];
  heroImageUrl?: string;
  galleryImageUrls: string[];
  status: "verified" | "draft" | "needs_enrichment";
}

export const CURATED_GLOBAL_HOTEL_ENTITIES: CatalogHotelEntity[] = [
  {
    id: "hotel-occidental-punta-cana",
    canonicalName: "Occidental Punta Cana",
    slug: "occidental-punta-cana",
    brand: "Occidental",
    chain: "Barceló Hotel Group",
    category: "resort",
    starRating: 5,
    destination: {
      country: "República Dominicana",
      stateOrRegion: "La Altagracia",
      city: "Punta Cana",
      zoneOrBeach: "Playa Bávaro",
      iataCodes: ["PUJ"],
    },
    aliases: [
      "Occidental Punta Cana",
      "Occidental P. Cana",
      "Occidental P Cana",
      "Barceló Occidental Punta Cana",
      "Barcelo Occidental Punta Cana",
      "Hotel Occidental Punta Cana",
      "Resort Occidental Punta Cana",
    ],
    defaultMealPlans: ["All Inclusive"],
    shortPitch: "Resort All Inclusive pé na areia na famosa Playa Bávaro com 11 restaurantes e 3 piscinas.",
    longDescription:
      "Localizado de frente para uma das praias mais espetaculares da República Dominicana, o Occidental Punta Cana oferece experiência All Inclusive completa com gastronomia internacional, esportes aquáticos e entretenimento noturno.",
    highlights: [
      "All Inclusive 24h",
      "Pé na areia em Playa Bávaro",
      "11 bares e restaurantes",
      "3 piscinas panorâmicas e clube infantil",
    ],
    heroImageUrl: "/brand-logo.png",
    galleryImageUrls: [],
    status: "verified",
  },
  {
    id: "hotel-vila-gale-cumbuco",
    canonicalName: "Vila Galé Resort Cumbuco",
    slug: "vila-gale-cumbuco",
    brand: "Vila Galé",
    chain: "Vila Galé Hotéis",
    category: "resort",
    starRating: 5,
    destination: {
      country: "Brasil",
      stateOrRegion: "CE",
      city: "Cumbuco / Fortaleza",
      zoneOrBeach: "Praia do Cumbuco",
      iataCodes: ["FOR"],
    },
    aliases: [
      "Vila Galé Cumbuco",
      "Vila Gale Cumbuco",
      "Vila Galé Resort Cumbuco",
      "Hotel Vila Galé Cumbuco",
    ],
    defaultMealPlans: ["All Inclusive"],
    shortPitch: "Resort All Inclusive entre as dunas e o mar da Praia do Cumbuco no Ceará.",
    longDescription:
      "Resort 5 estrelas All Inclusive situado na famosa Praia do Cumbuco, com parque aquático, Satsanga Spa e gastronomia portuguesa e regional.",
    highlights: ["All Inclusive", "Pé na Areia", "Satsanga Spa", "Clube Nep Kids"],
    heroImageUrl: "/brand-logo.png",
    galleryImageUrls: [],
    status: "verified",
  },
  ...GLOBAL_HOTELS_RESORTS_CATALOG.map((rec, idx): CatalogHotelEntity => {
    const slug = rec.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    return {
      id: rec.id || `hotel-catalog-${idx + 1}-${slug}`,
      canonicalName: rec.name,
      slug,
      category: rec.name.toLowerCase().includes("resort") ? "resort" : "hotel",
      starRating: rec.stars,
      destination: {
        country: rec.country || "Brasil",
        stateOrRegion: rec.state,
        city: rec.city,
        iataCodes: [],
      },
      aliases: [
        rec.name,
        rec.name.replace(/All Inclusive/gi, "").trim(),
        rec.name.replace(/Resort/gi, "").trim(),
      ].filter(Boolean),
      defaultMealPlans: rec.regime_options || ["Café da Manhã"],
      shortPitch: rec.description,
      longDescription: rec.description,
      highlights: rec.bio_bullets || [],
      heroImageUrl: rec.cover_photo_url || undefined,
      galleryImageUrls: (rec.photos || []).filter(Boolean),
      status: "verified",
    };
  }),
];

export function normalizeCatalogToken(input: string): string {
  return (input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(hotel|resort|all inclusive|spa|golf|p\.|p)\b/g, (match) => {
      if (match === "p." || match === "p") return "punta";
      return match;
    })
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function computeTokenSimilarity(a: string, b: string): number {
  const normA = normalizeCatalogToken(a);
  const normB = normalizeCatalogToken(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;
  if (normA.includes(normB) || normB.includes(normA)) return 0.92;

  const tokensA = new Set(normA.split(" ").filter((t) => t.length > 1));
  const tokensB = new Set(normB.split(" ").filter((t) => t.length > 1));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return Number((intersection / union).toFixed(3));
}

export interface HotelCatalogMatchResult {
  matched: boolean;
  confidence: number;
  entity: CatalogHotelEntity | null;
  matchedAlias?: string;
  candidates: Array<{ entity: CatalogHotelEntity; score: number; matchedAlias: string }>;
  requiresConfirmation: boolean;
}

/**
 * Resolve supplier hotel names (e.g. "Occidental Punta Cana", "Occidental P. Cana",
 * "Barceló Occidental Punta Cana") against the central catalog.
 */
export function resolveHotelCatalogMatch(
  rawHotelName?: string | null,
  destinationHint?: string | null,
  customCatalog: CatalogHotelEntity[] = CURATED_GLOBAL_HOTEL_ENTITIES
): HotelCatalogMatchResult {
  if (!rawHotelName || !rawHotelName.trim()) {
    return {
      matched: false,
      confidence: 0,
      entity: null,
      candidates: [],
      requiresConfirmation: false,
    };
  }

  const cleanInput = rawHotelName.trim();
  const normInput = normalizeCatalogToken(cleanInput);
  const scored: Array<{ entity: CatalogHotelEntity; score: number; matchedAlias: string }> = [];

  for (const entity of customCatalog) {
    let bestAliasScore = 0;
    let bestAlias = entity.canonicalName;

    const allNames = [entity.canonicalName, ...entity.aliases];
    for (const alias of allNames) {
      const normAlias = normalizeCatalogToken(alias);
      let score = computeTokenSimilarity(cleanInput, alias);
      if (normAlias === normInput) {
        score = 1.0;
      }
      if (destinationHint) {
        const destSim = computeTokenSimilarity(destinationHint, entity.destination.city);
        if (destSim >= 0.5 && score >= 0.5) {
          score = Math.min(1, Number((score + 0.08).toFixed(3)));
        }
      }
      if (score > bestAliasScore) {
        bestAliasScore = score;
        bestAlias = alias;
      }
    }

    if (bestAliasScore >= 0.45) {
      scored.push({ entity, score: bestAliasScore, matchedAlias: bestAlias });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored[0] || null;

  if (!top) {
    return {
      matched: false,
      confidence: 0,
      entity: null,
      candidates: [],
      requiresConfirmation: true,
    };
  }

  const highConfidence = top.score >= 0.82;
  return {
    matched: highConfidence,
    confidence: top.score,
    entity: highConfidence ? top.entity : null,
    matchedAlias: top.matchedAlias,
    candidates: scored.slice(0, 5),
    requiresConfirmation: !highConfidence,
  };
}

// ============================================================================
// 5. STORY CONTENT COMPOSER & DECISION TELEMETRY (Sec. 9 & 10)
// ============================================================================

export type StoryInclusionCategory =
  | "airfare"
  | "hotel_meal_plan"
  | "transfer"
  | "major_experience"
  | "insurance_baggage"
  | "other";

export type StoryDecisionReasonCode =
  | "INCLUDED_AND_PRIORITY_1"
  | "INCLUDED_AND_PRIORITY_2"
  | "INCLUDED_AND_PRIORITY_3"
  | "INCLUDED_AND_PRIORITY_4"
  | "INCLUDED_AND_PRIORITY_5"
  | "EXCLUDED_NOT_IN_QUOTE"
  | "EXCLUDED_LOW_CONFIDENCE"
  | "EXCLUDED_SLOT_LIMIT"
  | "USER_PINNED"
  | "USER_HIDDEN";

export interface StoryInclusionItem {
  id: string;
  category: StoryInclusionCategory;
  priority: number; // 1..6
  label: string;
  iconKey: "plane" | "hotel" | "coffee" | "utensils" | "car" | "ticket" | "shield" | "sparkles";
  confirmed: boolean;
  confidence: number;
  pinned?: boolean;
  hidden?: boolean;
}

export interface StoryInclusionDecision {
  itemId: string;
  label: string;
  selected: boolean;
  reasonCode: StoryDecisionReasonCode;
}

export interface StoryContentSelectionResult {
  selectedInclusions: StoryInclusionItem[]; // 2..4 items
  decisions: StoryInclusionDecision[];
}

export interface StoryInclusionSourceInput {
  hasAirfare?: boolean;
  originCity?: string | null;
  originIata?: string | null;
  hasHotel?: boolean;
  hotelName?: string | null;
  mealPlan?: string | null; // Only include if explicitly confirmed
  hasTransfer?: boolean;
  transferLabel?: string | null;
  majorExperiences?: string[]; // e.g., ["Trem panorâmico a Machu Picchu", "Tour Valle Nevado"]
  hasInsurance?: boolean;
  hasCheckedBaggage?: boolean;
  extraInclusions?: string[];
  pinnedLabels?: string[];
  hiddenLabels?: string[];
  maxSlots?: number; // default 4, min 2
}

/**
 * Seleciona de 2 a 4 inclusões de maior impacto visual/comercial para o Story 9:16
 * seguindo estritamente a hierarquia da seção 9.2 (sem jamais inventar café da manhã, traslado ou aéreo).
 */
export function selectStoryInclusions(input: StoryInclusionSourceInput): StoryContentSelectionResult {
  const maxSlots = Math.min(4, Math.max(2, input.maxSlots ?? 4));
  const pinnedSet = new Set((input.pinnedLabels || []).map((s) => s.toLowerCase().trim()));
  const hiddenSet = new Set((input.hiddenLabels || []).map((s) => s.toLowerCase().trim()));

  const candidates: StoryInclusionItem[] = [];
  const decisions: StoryInclusionDecision[] = [];

  // Priority 1 — Airfare + departure city
  if (input.hasAirfare) {
    const cleanOrigin = (input.originCity || "").trim();
    const label = cleanOrigin ? `Aéreos desde ${cleanOrigin}` : "Passagem aérea ida e volta";
    candidates.push({
      id: "inc-airfare",
      category: "airfare",
      priority: 1,
      label,
      iconKey: "plane",
      confirmed: true,
      confidence: 0.98,
      pinned: pinnedSet.has(label.toLowerCase()),
      hidden: hiddenSet.has(label.toLowerCase()),
    });
  } else {
    decisions.push({
      itemId: "inc-airfare",
      label: "Aéreos",
      selected: false,
      reasonCode: "EXCLUDED_NOT_IN_QUOTE",
    });
  }

  // Priority 2 — Lodging + meal plan (NEVER invent breakfast when mealPlan is absent)
  if (input.hasHotel || (input.hotelName && input.hotelName.trim().length > 0)) {
    const meal = (input.mealPlan || "").trim();
    const lowerMeal = meal.toLowerCase();
    let label = "Hospedagem inclusa";
    let iconKey: StoryInclusionItem["iconKey"] = "hotel";

    if (lowerMeal.includes("all inclusive") || lowerMeal === "all_inclusive") {
      label = "Resort All Inclusive";
      iconKey = "utensils";
    } else if (lowerMeal.includes("meia pens") || lowerMeal === "meia_pensao") {
      label = "Hospedagem com meia pensão";
      iconKey = "utensils";
    } else if (lowerMeal.includes("pensão completa") || lowerMeal.includes("pensao completa") || lowerMeal === "completa") {
      label = "Hospedagem pensão completa";
      iconKey = "utensils";
    } else if (lowerMeal.includes("café") || lowerMeal.includes("cafe") || lowerMeal === "breakfast") {
      label = "Hospedagem com café";
      iconKey = "coffee";
    } else if (lowerMeal.includes("só hospedagem") || lowerMeal.includes("so hospedagem") || lowerMeal === "room_only") {
      label = "Hospedagem selecionada";
      iconKey = "hotel";
    }

    candidates.push({
      id: "inc-hotel",
      category: "hotel_meal_plan",
      priority: 2,
      label,
      iconKey,
      confirmed: true,
      confidence: 0.96,
      pinned: pinnedSet.has(label.toLowerCase()),
      hidden: hiddenSet.has(label.toLowerCase()),
    });
  } else {
    decisions.push({
      itemId: "inc-hotel",
      label: "Hospedagem",
      selected: false,
      reasonCode: "EXCLUDED_NOT_IN_QUOTE",
    });
  }

  // Priority 3 — Airport / Hotel Transfers
  if (input.hasTransfer) {
    const label = (input.transferLabel || "").trim() || "Traslados ao aeroporto";
    candidates.push({
      id: "inc-transfer",
      category: "transfer",
      priority: 3,
      label,
      iconKey: "car",
      confirmed: true,
      confidence: 0.95,
      pinned: pinnedSet.has(label.toLowerCase()),
      hidden: hiddenSet.has(label.toLowerCase()),
    });
  } else {
    decisions.push({
      itemId: "inc-transfer",
      label: "Traslados ao aeroporto",
      selected: false,
      reasonCode: "EXCLUDED_NOT_IN_QUOTE",
    });
  }

  // Priority 4 — Major destination experience / tour / ticket
  const experiences = (input.majorExperiences || []).map((s) => s.trim()).filter(Boolean);
  experiences.forEach((exp, idx) => {
    candidates.push({
      id: `inc-exp-${idx + 1}`,
      category: "major_experience",
      priority: 4,
      label: exp,
      iconKey: "ticket",
      confirmed: true,
      confidence: 0.92,
      pinned: pinnedSet.has(exp.toLowerCase()),
      hidden: hiddenSet.has(exp.toLowerCase()),
    });
  });

  // Priority 5 — Travel insurance / checked baggage
  if (input.hasInsurance) {
    const label = "Seguro viagem incluso";
    candidates.push({
      id: "inc-insurance",
      category: "insurance_baggage",
      priority: 5,
      label,
      iconKey: "shield",
      confirmed: true,
      confidence: 0.9,
      pinned: pinnedSet.has(label.toLowerCase()),
      hidden: hiddenSet.has(label.toLowerCase()),
    });
  }
  if (input.hasCheckedBaggage) {
    const label = "Bagagem despachada 23kg";
    candidates.push({
      id: "inc-baggage",
      category: "insurance_baggage",
      priority: 5,
      label,
      iconKey: "sparkles",
      confirmed: true,
      confidence: 0.9,
      pinned: pinnedSet.has(label.toLowerCase()),
      hidden: hiddenSet.has(label.toLowerCase()),
    });
  }

  // Priority 6 — Extra confirmed inclusions from raw list
  const existingLabelsLower = new Set(candidates.map((c) => c.label.toLowerCase()));
  for (const rawExtra of input.extraInclusions || []) {
    const clean = rawExtra.trim();
    if (!clean) continue;
    const lower = clean.toLowerCase();
    if (existingLabelsLower.has(lower)) continue;

    // Classify if raw string is actually airfare/hotel/transfer/experience
    let category: StoryInclusionCategory = "other";
    let priority = 6;
    let iconKey: StoryInclusionItem["iconKey"] = "sparkles";

    if (lower.includes("aéreo") || lower.includes("aereo") || lower.includes("voo") || lower.includes("passagem")) {
      if (candidates.some((c) => c.category === "airfare")) continue;
      category = "airfare";
      priority = 1;
      iconKey = "plane";
    } else if (lower.includes("hospedag") || lower.includes("hotel") || lower.includes("resort") || lower.includes("all inclusive") || lower.includes("café")) {
      if (candidates.some((c) => c.category === "hotel_meal_plan")) continue;
      category = "hotel_meal_plan";
      priority = 2;
      iconKey = lower.includes("all inclusive") ? "utensils" : "coffee";
    } else if (lower.includes("traslado") || lower.includes("transfer")) {
      if (candidates.some((c) => c.category === "transfer")) continue;
      category = "transfer";
      priority = 3;
      iconKey = "car";
    } else if (
      lower.includes("passeio") ||
      lower.includes("ingresso") ||
      lower.includes("trem") ||
      lower.includes("tour") ||
      lower.includes("machu picchu") ||
      lower.includes("parque") ||
      lower.includes("ticket")
    ) {
      category = "major_experience";
      priority = 4;
      iconKey = "ticket";
    } else if (lower.includes("seguro") || lower.includes("bagagem")) {
      category = "insurance_baggage";
      priority = 5;
      iconKey = "shield";
    }

    existingLabelsLower.add(lower);
    candidates.push({
      id: `inc-extra-${candidates.length + 1}`,
      category,
      priority,
      label: clean,
      iconKey,
      confirmed: true,
      confidence: 0.88,
      pinned: pinnedSet.has(lower),
      hidden: hiddenSet.has(lower),
    });
  }

  // Sort: pinned first, then priority ascending
  candidates.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return a.priority - b.priority;
  });

  const selectedInclusions: StoryInclusionItem[] = [];
  for (const item of candidates) {
    if (item.hidden) {
      decisions.push({
        itemId: item.id,
        label: item.label,
        selected: false,
        reasonCode: "USER_HIDDEN",
      });
      continue;
    }

    if (item.confidence < 0.7) {
      decisions.push({
        itemId: item.id,
        label: item.label,
        selected: false,
        reasonCode: "EXCLUDED_LOW_CONFIDENCE",
      });
      continue;
    }

    if (selectedInclusions.length < maxSlots) {
      selectedInclusions.push(item);
      const reasonCode: StoryDecisionReasonCode = item.pinned
        ? "USER_PINNED"
        : item.priority === 1
        ? "INCLUDED_AND_PRIORITY_1"
        : item.priority === 2
        ? "INCLUDED_AND_PRIORITY_2"
        : item.priority === 3
        ? "INCLUDED_AND_PRIORITY_3"
        : item.priority === 4
        ? "INCLUDED_AND_PRIORITY_4"
        : "INCLUDED_AND_PRIORITY_5";
      decisions.push({
        itemId: item.id,
        label: item.label,
        selected: true,
        reasonCode,
      });
    } else {
      decisions.push({
        itemId: item.id,
        label: item.label,
        selected: false,
        reasonCode: "EXCLUDED_SLOT_LIMIT",
      });
    }
  }

  return { selectedInclusions, decisions };
}

// ============================================================================
// 6. DYNAMIC TITLE TEXT-FIT & DUPLICATED SHADOW LAYER (Sec. 10.2 & 10.3)
// ============================================================================

export interface TitleShadowSpec {
  enabled: boolean;
  offsetX: number; // default -5px
  offsetY: number; // default 4px
  blurPx: number; // default 0px
  opacity: number; // default 0.35
  color: string; // default "#000000"
}

export interface FittedStoryTitle {
  rawTitle: string;
  uppercaseTitle: string;
  lines: string[];
  lineCount: 1 | 2;
  fontSizePx: number;
  lineHeight: number;
  letterSpacingEm: number;
  maxWidthPx: number;
  shadow: TitleShadowSpec;
  cssVariables: Record<string, string>;
}

/**
 * Calcula o encaixe tipográfico dinâmico para títulos curtos ("CHILE", "PUNTA CANA")
 * e compostos ("RECIFE + PORTO DE GALINHAS", "CUSCO + MACHU PICCHU") em 1080px de largura,
 * mantendo a camada duplicada de sombra traseira (--title-shadow-x/y/blur/opacity).
 */
export function fitStoryTitle(
  rawTitle: string,
  options?: {
    maxWidthPx?: number;
    shadow?: Partial<TitleShadowSpec>;
    overrideFontSizePx?: number;
  }
): FittedStoryTitle {
  const maxWidthPx = options?.maxWidthPx ?? 940;
  const clean = (rawTitle || "DESTINO").trim().replace(/\s+/g, " ");
  const uppercaseTitle = clean.toUpperCase();
  const charCount = uppercaseTitle.length;

  let lines: string[] = [uppercaseTitle];
  let lineCount: 1 | 2 = 1;
  let fontSizePx = 128;
  let lineHeight = 0.96;
  let letterSpacingEm = -0.02;

  if (charCount <= 7) {
    // e.g. "CHILE", "DISNEY", "CANCÚN"
    fontSizePx = 136;
    lineHeight = 0.94;
    letterSpacingEm = -0.025;
  } else if (charCount <= 12) {
    // e.g. "PUNTA CANA", "BARILOCHE", "MARAGOGI"
    fontSizePx = 114;
    lineHeight = 0.96;
    letterSpacingEm = -0.02;
  } else if (charCount <= 16) {
    // e.g. "JOÃO PESSOA", "PORTO SEGURO"
    fontSizePx = 96;
    lineHeight = 0.98;
    letterSpacingEm = -0.02;
  } else {
    // Long or compound destination: split into 2 balanced lines
    lineCount = 2;
    if (uppercaseTitle.includes(" + ")) {
      const [first, ...rest] = uppercaseTitle.split(" + ");
      lines = [`${first.trim()} +`, rest.join(" + ").trim()];
    } else if (uppercaseTitle.includes(" E ")) {
      const idx = uppercaseTitle.indexOf(" E ");
      lines = [uppercaseTitle.slice(0, idx).trim(), uppercaseTitle.slice(idx + 1).trim()];
    } else {
      const words = uppercaseTitle.split(" ");
      if (words.length >= 2) {
        const mid = Math.ceil(words.length / 2);
        lines = [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
      } else {
        lines = [uppercaseTitle];
        lineCount = 1;
      }
    }

    const longestLineChars = Math.max(...lines.map((l) => l.length));
    if (longestLineChars <= 12) {
      fontSizePx = 98;
    } else if (longestLineChars <= 16) {
      fontSizePx = 84;
    } else if (longestLineChars <= 20) {
      fontSizePx = 74;
    } else {
      fontSizePx = 64;
    }
    lineHeight = 0.98;
    letterSpacingEm = -0.015;
  }

  if (options?.overrideFontSizePx && options.overrideFontSizePx > 20) {
    fontSizePx = options.overrideFontSizePx;
  }

  const shadow: TitleShadowSpec = {
    enabled: options?.shadow?.enabled ?? true,
    offsetX: options?.shadow?.offsetX ?? -5,
    offsetY: options?.shadow?.offsetY ?? 4,
    blurPx: options?.shadow?.blurPx ?? 0,
    opacity: options?.shadow?.opacity ?? 0.35,
    color: options?.shadow?.color ?? "#000000",
  };

  return {
    rawTitle: clean,
    uppercaseTitle,
    lines,
    lineCount,
    fontSizePx,
    lineHeight,
    letterSpacingEm,
    maxWidthPx,
    shadow,
    cssVariables: {
      "--title-shadow-x": `${shadow.offsetX}px`,
      "--title-shadow-y": `${shadow.offsetY}px`,
      "--title-shadow-blur": `${shadow.blurPx}px`,
      "--title-shadow-opacity": `${shadow.opacity}`,
      "--title-font-size": `${fontSizePx}px`,
    },
  };
}

// ============================================================================
// 7. SCENE-GRAPH STORY DOCUMENT & AI STRUCTURED EDITING (Sec. 11–13)
// ============================================================================

export type StoryNodeType =
  | "image"
  | "text"
  | "icon"
  | "glass-panel"
  | "shape"
  | "group"
  | "gradient"
  | "overlay";

export interface StoryNode {
  id: string;
  type: StoryNodeType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  visible: boolean;
  locked?: boolean;
  zIndex: number;
  content?: Record<string, any>;
  style?: Record<string, any>;
  glass?: GlassMaterial;
}

export interface StoryDocument {
  id: string;
  offerId: string;
  presetId: "excelencia-story-9x16-v1";
  width: 1080;
  height: 1920;
  aspectRatio: "9:16";
  nodes: StoryNode[];
  theme: {
    brandName: string;
    primaryTextColor: string;
    accentColor: string;
    titleFontFamily: string;
    bodyFontFamily: string;
    topGradientPreset:
      | "ocean_blue"
      | "caribbean_turquoise"
      | "sunset_amber"
      | "emerald_nature"
      | "midnight_luxury";
  };
  historyVersion: number;
}

export type StoryEditOperation =
  | { op: "set"; nodeId: string; path: string; value: any }
  | { op: "move"; nodeId: string; dx?: number; dy?: number; x?: number; y?: number }
  | { op: "resize"; nodeId: string; width?: number; height?: number; scale?: number }
  | { op: "toggleVisible"; nodeId: string; visible: boolean }
  | { op: "applyGlassPreset"; nodeId: string; presetId: GlassPresetId }
  | {
      op: "recalculateInstallments";
      installmentCount: number;
      preserveTotal: boolean;
      paymentTermsLabel?: string;
    };

function setDeepProperty<T extends Record<string, any>>(obj: T, path: string, value: any): T {
  const clone = JSON.parse(JSON.stringify(obj));
  const keys = path.split(".");
  let curr = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (typeof curr[k] !== "object" || curr[k] === null) {
      curr[k] = {};
    }
    curr = curr[k];
  }
  curr[keys[keys.length - 1]] = value;
  return clone as T;
}

/**
 * Aplica operações estruturadas e determinísticas sobre o StoryDocument (1080×1920),
 * mantendo histórico e sincronia com o modelo comercial.
 */
export function applyStoryEditOperations(
  doc: StoryDocument,
  operations: StoryEditOperation[]
): StoryDocument {
  let nextDoc: StoryDocument = JSON.parse(JSON.stringify(doc));

  for (const operation of operations) {
    if (operation.op === "recalculateInstallments") {
      nextDoc.nodes = nextDoc.nodes.map((node): StoryNode => {
        if (node.id === "price-glass-card" && node.content) {
          const count = Math.max(1, Math.round(operation.installmentCount));
          const totalCents =
            node.content.totalPriceCents ||
            (node.content.installmentCents && node.content.installmentCount
              ? node.content.installmentCents * node.content.installmentCount
              : 0);
          const nextInstallmentCents =
            operation.preserveTotal && totalCents > 0
              ? Math.round(totalCents / count)
              : node.content.installmentCents;

          return {
            ...node,
            content: {
              ...node.content,
              installmentCount: count,
              installmentCents: nextInstallmentCents,
              totalPriceCents: totalCents,
              paymentTermsLabel:
                operation.paymentTermsLabel ?? node.content.paymentTermsLabel,
            },
          };
        }
        return node;
      });
      continue;
    }

    nextDoc.nodes = nextDoc.nodes.map((node): StoryNode => {
      if (node.id !== operation.nodeId) return node;

      switch (operation.op) {
        case "set": {
          const updated = setDeepProperty(node, operation.path, operation.value);
          if (updated.id === "title" && operation.path === "content.text") {
            const fitted = fitStoryTitle(String(operation.value), {
              overrideFontSizePx: updated.style?.fontSize,
            });
            if (updated.content) {
              updated.content.lines = fitted.lines;
            }
            updated.style = {
              ...updated.style,
              fontSize: fitted.fontSizePx,
              lineHeight: fitted.lineHeight,
              letterSpacingEm: fitted.letterSpacingEm,
            };
          }
          if (updated.glass) {
            updated.glass = normalizeGlassMaterial(updated.glass);
          }
          return updated;
        }
        case "move": {
          return {
            ...node,
            x: operation.x !== undefined ? operation.x : node.x + (operation.dx || 0),
            y: operation.y !== undefined ? operation.y : node.y + (operation.dy || 0),
          };
        }
        case "resize": {
          const scale = operation.scale ?? 1;
          return {
            ...node,
            width:
              operation.width !== undefined
                ? operation.width
                : Math.round(node.width * scale),
            height:
              operation.height !== undefined
                ? operation.height
                : Math.round(node.height * scale),
          };
        }
        case "toggleVisible": {
          return {
            ...node,
            visible: operation.visible,
          };
        }
        case "applyGlassPreset": {
          return {
            ...node,
            glass: getGlassPreset(operation.presetId),
          };
        }
        default:
          return node;
      }
    });
  }

  nextDoc.historyVersion = (nextDoc.historyVersion || 1) + 1;
  return nextDoc;
}

/**
 * Compila comandos em linguagem natural (ex: "Aumentar só o título",
 * "Diminuir a caixa de valor", "Deixar o vidro mais fosco",
 * "Trocar de 15x para 12x sem mudar o total", "Trocar 'Por pessoa' para 'Para 2 adultos'")
 * em operações estruturadas StoryEditOperation[].
 */
export function parseNaturalLanguageStoryCommand(
  commandText: string,
  doc: StoryDocument
): { operations: StoryEditOperation[]; explanation: string } {
  const raw = (commandText || "").trim();
  const lower = raw.toLowerCase();
  const ops: StoryEditOperation[] = [];
  const explanations: string[] = [];

  const titleNode = doc.nodes.find((n) => n.id === "title");
  const glassNode = doc.nodes.find((n) => n.id === "price-glass-card");
  const bgNode = doc.nodes.find((n) => n.id === "background-photo");

  // 1. Title size / position adjustments
  if (lower.includes("título") || lower.includes("titulo")) {
    const currentFont = titleNode?.style?.fontSize || 112;
    if (lower.includes("aumentar") || lower.includes("maior")) {
      const nextFont = Math.min(156, Math.round(currentFont * 1.12));
      ops.push({ op: "set", nodeId: "title", path: "style.fontSize", value: nextFont });
      explanations.push(`Título aumentado de ${currentFont}px para ${nextFont}px.`);
    } else if (lower.includes("diminuir") || lower.includes("menor")) {
      const nextFont = Math.max(54, Math.round(currentFont * 0.88));
      ops.push({ op: "set", nodeId: "title", path: "style.fontSize", value: nextFont });
      explanations.push(`Título reduzido de ${currentFont}px para ${nextFont}px.`);
    }
    if (lower.includes("duas linhas") || lower.includes("2 linhas")) {
      const text = titleNode?.content?.text || "DESTINO";
      const words = text.split(" ");
      if (words.length >= 2) {
        const mid = Math.ceil(words.length / 2);
        ops.push({
          op: "set",
          nodeId: "title",
          path: "content.lines",
          value: [words.slice(0, mid).join(" "), words.slice(mid).join(" ")],
        });
        explanations.push("Título quebrado em duas linhas balanceadas.");
      }
    }
  }

  // 2. Price box resize / move
  if (lower.includes("caixa de valor") || lower.includes("caixa de preço") || lower.includes("card de preço") || lower.includes("card de valor")) {
    if (lower.includes("diminuir") || lower.includes("menor")) {
      ops.push({ op: "resize", nodeId: "price-glass-card", scale: 0.9 });
      explanations.push("Caixa de valor reduzida em 10%.");
    } else if (lower.includes("aumentar") || lower.includes("maior")) {
      ops.push({ op: "resize", nodeId: "price-glass-card", scale: 1.1 });
      explanations.push("Caixa de valor ampliada em 10%.");
    }
    if (lower.includes("subir")) {
      ops.push({ op: "move", nodeId: "price-glass-card", dy: -36 });
      explanations.push("Caixa de valor movida 36px para cima.");
    } else if (lower.includes("descer") || lower.includes("baixar")) {
      ops.push({ op: "move", nodeId: "price-glass-card", dy: 36 });
      explanations.push("Caixa de valor movida 36px para baixo.");
    }
  }

  // 3. Background photo pan
  if (lower.includes("foto") || lower.includes("imagem") || lower.includes("fundo")) {
    const currentOffsetY = bgNode?.style?.objectPositionY ?? 50;
    if (lower.includes("subir")) {
      ops.push({
        op: "set",
        nodeId: "background-photo",
        path: "style.objectPositionY",
        value: Math.max(0, currentOffsetY - 12),
      });
      explanations.push("Enquadramento da foto movido para cima.");
    } else if (lower.includes("descer")) {
      ops.push({
        op: "set",
        nodeId: "background-photo",
        path: "style.objectPositionY",
        value: Math.min(100, currentOffsetY + 12),
      });
      explanations.push("Enquadramento da foto movido para baixo.");
    }
  }

  // 4. Glass Material adjustments (frost, blur, refraction, dispersion, presets)
  if (lower.includes("vidro") || lower.includes("fosco") || lower.includes("glass") || lower.includes("blur") || lower.includes("refração")) {
    const currFrost = glassNode?.glass?.optics?.frost ?? 32;
    const currRefraction = glassNode?.glass?.optics?.refraction ?? 80;
    if (lower.includes("muito fosco") || lower.includes("heavy frost")) {
      ops.push({ op: "applyGlassPreset", nodeId: "price-glass-card", presetId: "heavy_frost" });
      explanations.push("Preset Heavy Frost aplicado ao vidro.");
    } else if (lower.includes("escuro") || lower.includes("dark")) {
      ops.push({ op: "applyGlassPreset", nodeId: "price-glass-card", presetId: "dark_glass" });
      explanations.push("Preset Dark Glass aplicado ao vidro.");
    } else if (lower.includes("mais fosco") || lower.includes("aumentar frost") || lower.includes("mais blur")) {
      ops.push({
        op: "set",
        nodeId: "price-glass-card",
        path: "glass.optics.frost",
        value: Math.min(100, currFrost + 25),
      });
      explanations.push("Frost do vidro aumentado.");
    } else if (lower.includes("menos fosco") || lower.includes("mais transparente") || lower.includes("clear")) {
      ops.push({
        op: "set",
        nodeId: "price-glass-card",
        path: "glass.optics.frost",
        value: Math.max(0, currFrost - 20),
      });
      explanations.push("Frost do vidro reduzido para maior transparência.");
    }
    if (lower.includes("mais refração") || lower.includes("mais refracao")) {
      ops.push({
        op: "set",
        nodeId: "price-glass-card",
        path: "glass.optics.refraction",
        value: Math.min(100, currRefraction + 15),
      });
      explanations.push("Refração óptica intensificada.");
    }
  }

  // 5. Installment recalculation (e.g. "Trocar de 15x para 12x sem mudar o total" or "Mudar para 10x")
  const instMatch = lower.match(/(?:para|em)\s*(\d{1,2})\s*x/i) || lower.match(/(\d{1,2})\s*x/i);
  if (instMatch && (lower.includes("trocar") || lower.includes("mudar") || lower.includes("parcela") || lower.includes("x"))) {
    const targetInstallments = parseInt(instMatch[1], 10);
    if (targetInstallments >= 1 && targetInstallments <= 24) {
      ops.push({
        op: "recalculateInstallments",
        installmentCount: targetInstallments,
        preserveTotal: !lower.includes("manter parcela"),
      });
      explanations.push(`Parcelamento recalculado para ${targetInstallments}x preservando o valor total.`);
    }
  }

  // 6. Price basis label change (e.g. "Trocar 'Por pessoa' para 'Para 2 adultos'")
  if (lower.includes("para 2 adultos") || lower.includes("por casal")) {
    const nextLabel = lower.includes("por casal") ? "Por casal" : "Para 2 adultos";
    ops.push({
      op: "set",
      nodeId: "price-glass-card",
      path: "content.priceBasisLabel",
      value: nextLabel,
    });
    explanations.push(`Rótulo de base tarifária atualizado para "${nextLabel}".`);
  } else if (lower.includes("por pessoa")) {
    ops.push({
      op: "set",
      nodeId: "price-glass-card",
      path: "content.priceBasisLabel",
      value: "Por pessoa",
    });
    explanations.push(`Rótulo de base tarifária atualizado para "Por pessoa".`);
  }

  return {
    operations: ops,
    explanation:
      explanations.length > 0
        ? explanations.join(" ")
        : "Nenhuma alteração estrutural identificada no comando; tente 'Aumentar o título', 'Trocar para 12x' ou 'Deixar o vidro mais fosco'.",
  };
}

// ============================================================================
// 8. CANONICAL TRAVEL OFFER MODEL & COMMERCIAL VALIDATOR (Sec. 5.5 & 8)
// ============================================================================

export type OfferLifecycleStatus =
  | "draft"
  | "review"
  | "published"
  | "expired"
  | "archived";

export interface ReviewFlag {
  id: string;
  severity: "warning" | "blocking";
  field: string;
  message: string;
}

export interface TravelOfferFlightSegment {
  direction: "outbound" | "return" | "internal";
  airline?: string;
  flightNumber?: string;
  originCity: string;
  originIata?: string;
  destinationCity: string;
  destinationIata?: string;
  departureDate?: string;
  departureTime?: string;
  arrivalTime?: string;
  baggageSummary?: string;
}

export interface TravelOfferHotelStay {
  hotelCatalogId?: string | null;
  hotelName: string;
  city: string;
  country: string;
  stars?: number;
  roomTypeLabel: string;
  mealPlanLabel?: string | null;
  checkInDate?: string;
  checkOutDate?: string;
  nights?: number;
  heroImageUrl?: string;
  matchConfidence?: number;
}

export interface TravelOffer {
  id: string;
  slug: string;
  tenantId?: string;
  createdByUserId?: string;
  status: OfferLifecycleStatus;
  offerType: "quick_quote" | "campaign_package" | "custom_itinerary" | "group_departure";
  sourceArtifacts: Array<{
    id: string;
    kind: "screenshot" | "pdf" | "pasted_text" | "url" | "manual";
    fileName?: string;
    extractedAt: string;
  }>;
  extractedFields: Record<string, ExtractedField<any>>;
  destination: {
    title: string; // e.g., "PUNTA CANA", "CHILE", "RECIFE + PORTO DE GALINHAS"
    city: string;
    stateOrRegion?: string;
    country: string;
    originCity: string;
    originIata?: string;
    destinationIata?: string;
  };
  dates: {
    departureDate?: string | null; // YYYY-MM-DD
    returnDate?: string | null; // YYYY-MM-DD
    displayRangeText: string; // e.g., "19 a 24 de agosto"
    nightsCount?: number;
    daysCount?: number;
    flexibleDates?: boolean;
  };
  party: TravelParty;
  rooms: RoomOccupancy[];
  flights: TravelOfferFlightSegment[];
  hotels: TravelOfferHotelStay[];
  transfers: {
    included: boolean;
    summary: string;
  };
  experiences: string[];
  inclusions: string[];
  exclusions: string[];
  pricing: OfferPricing;
  paymentTermsSnapshot: PaymentTermsSnapshot;
  validity: {
    createdAt: string;
    publishedAt?: string;
    expiresAt: string; // default <= 24h for quick_quote
    expiredBehavior: "keep_page_show_expired_banner" | "redirect_to_whatsapp";
    isSameDayClosingOnly: boolean;
  };
  publicPage: {
    url: string;
    includeFlightTimes: boolean;
  };
  whatsappCopy: {
    text: string;
    includeFlightTimes: boolean;
  };
  storyDocument: StoryDocument;
  reviewFlags: ReviewFlag[];
}

/**
 * Formata rótulo humano de ocupação e base de preço sem ambiguidade.
 */
export function formatOccupancyAndBasisSummary(
  party: TravelParty,
  rooms: RoomOccupancy[],
  priceBasis: PriceBasis
): { priceBasisLabel: string; occupancySummaryLabel: string } {
  const adults = Math.max(1, party.adults || 1);
  const children = Math.max(0, party.children || 0);
  const childAgesStr =
    children > 0 && party.childAges?.length
      ? ` (${party.childAges.map((a) => `${a} anos`).join(", ")})`
      : "";

  let priceBasisLabel = "Por pessoa";
  switch (priceBasis) {
    case "per_person":
      priceBasisLabel = "Por pessoa";
      break;
    case "per_couple":
      priceBasisLabel = "Por casal";
      break;
    case "per_family":
      priceBasisLabel = `Para ${adults} adultos${children > 0 ? ` + ${children} criança(s)` : ""}`;
      break;
    case "per_room":
      priceBasisLabel = "Por quarto";
      break;
    case "per_cabin":
      priceBasisLabel = "Por cabine";
      break;
    case "total_package":
      priceBasisLabel =
        adults === 2 && children === 0
          ? "Total para 2 adultos"
          : `Total (${adults} adt${children > 0 ? ` + ${children} chd` : ""})`;
      break;
    case "per_group":
      priceBasisLabel = "Total do grupo";
      break;
    default:
      priceBasisLabel = "Por pessoa";
  }

  const roomCount = Math.max(1, rooms.length);
  let occupancySummaryLabel = "";
  if (roomCount > 1) {
    occupancySummaryLabel = `${roomCount} quartos • ${adults} adulto(s)${
      children > 0 ? ` + ${children} criança(s)${childAgesStr}` : ""
    }`;
  } else if (adults === 1 && children === 0) {
    occupancySummaryLabel = "Em apartamento individual (Single)";
  } else if (adults === 2 && children === 0) {
    occupancySummaryLabel = "Em apartamento duplo";
  } else {
    occupancySummaryLabel = `${adults} adulto(s)${
      children > 0 ? ` + ${children} criança(s)${childAgesStr}` : ""
    }`;
  }

  return { priceBasisLabel, occupancySummaryLabel };
}

/**
 * Calcula o PaymentTermsSnapshot imutável para uma oferta + campanha de parcelamento.
 */
export function computePaymentTermsSnapshot(params: {
  totalAmountCents?: number | null;
  statedInstallmentCount?: number | null;
  statedInstallmentAmountCents?: number | null;
  campaign?: PaymentCampaign;
  methods?: PaymentMethodKind[];
  entryAmountCents?: number | null;
  firstDueRule?: string;
}): PaymentTermsSnapshot {
  const campaign = params.campaign || CANONICAL_PAYMENT_CAMPAIGNS[0];
  const count =
    params.statedInstallmentCount && params.statedInstallmentCount >= 1
      ? params.statedInstallmentCount
      : campaign.defaultInstallments;

  let installmentAmountCents = params.statedInstallmentAmountCents || 0;
  let totalAmountCents = params.totalAmountCents || 0;
  let recalculatedFromTotal = false;

  if (installmentAmountCents <= 0 && totalAmountCents > 0) {
    const netAfterEntry = Math.max(0, totalAmountCents - (params.entryAmountCents || 0));
    installmentAmountCents = Math.round(netAfterEntry / count);
    recalculatedFromTotal = true;
  } else if (totalAmountCents <= 0 && installmentAmountCents > 0) {
    totalAmountCents = installmentAmountCents * count + (params.entryAmountCents || 0);
  }

  const methods = params.methods?.length ? params.methods : campaign.methods;
  const hasBoleto = methods.includes("boleto");
  const hasCard = methods.includes("card");
  const hasPix = methods.includes("pix");

  let methodPhrase = campaign.shortStoryLabel;
  if (hasBoleto && hasCard) methodPhrase = "no boleto e cartão";
  else if (hasBoleto) methodPhrase = "no boleto bancário";
  else if (hasCard) methodPhrase = "no cartão de crédito";
  else if (hasPix) methodPhrase = "via PIX";

  const formattedInstallment = formatMoney(installmentAmountCents);

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    installmentCount: count,
    installmentAmountCents,
    totalAmountCents,
    methods,
    entryRequired: Boolean(params.entryAmountCents && params.entryAmountCents > 0) || campaign.entryRequired,
    entryAmountCents: params.entryAmountCents || undefined,
    firstDueRule: params.firstDueRule,
    interestMode: campaign.interestMode,
    shortStoryLabel: methodPhrase,
    shortWhatsAppLabel: `${count}x de ${formattedInstallment} ${methodPhrase.replace("no boleto e cartão", "no boleto ou cartão")}`,
    legalText: campaign.legalText,
    recalculatedFromTotal,
  };
}

/**
 * Constrói o StoryDocument 1080×1920 (9:16) canônico ("ARTE SALVA" Excelência Tour)
 * a partir de uma oferta estruturada.
 */
export function buildStoryDocumentFromOffer(params: {
  offerId: string;
  destinationTitle: string;
  datesDisplayText: string;
  inclusions: StoryInclusionItem[];
  installmentCount: number;
  installmentCents: number;
  totalPriceCents?: number | null;
  priceBasisLabel: string;
  occupancySummaryLabel?: string;
  paymentTermsLabel: string;
  backgroundImageUrl: string;
  brandName?: string;
  glassPresetId?: GlassPresetId;
  topGradientPreset?: StoryDocument["theme"]["topGradientPreset"];
}): StoryDocument {
  const fittedTitle = fitStoryTitle(params.destinationTitle);
  const glassMaterial = getGlassPreset(params.glassPresetId || "saved_offer_glass");

  const nodes: StoryNode[] = [
    {
      id: "background-photo",
      type: "image",
      name: "Foto de Fundo (Destino / Hotel)",
      x: 0,
      y: 0,
      width: 1080,
      height: 1920,
      visible: true,
      zIndex: 1,
      content: {
        imageUrl: params.backgroundImageUrl || "/brand-logo.png",
        alt: params.destinationTitle,
      },
      style: {
        objectFit: "cover",
        objectPositionX: 50,
        objectPositionY: 55,
        scale: 1.02,
      },
    },
    {
      id: "top-atmosphere-gradient",
      type: "gradient",
      name: "Gradiente Atmosférico Superior",
      x: 0,
      y: 0,
      width: 1080,
      height: 1020,
      visible: true,
      zIndex: 2,
      content: {
        preset: params.topGradientPreset || "ocean_blue",
      },
      style: {
        opacity: 0.92,
      },
    },
    {
      id: "title",
      type: "text",
      name: "Título do Destino (c/ Sombra Duplicada)",
      x: 70,
      y: 128,
      width: 940,
      height: fittedTitle.lineCount === 2 ? 210 : 140,
      visible: true,
      zIndex: 4,
      content: {
        text: fittedTitle.uppercaseTitle,
        lines: fittedTitle.lines,
        shadow: fittedTitle.shadow,
      },
      style: {
        fontSize: fittedTitle.fontSizePx,
        lineHeight: fittedTitle.lineHeight,
        letterSpacingEm: fittedTitle.letterSpacingEm,
        fontWeight: 900,
        textAlign: "center",
        color: "#FFFFFF",
      },
    },
    {
      id: "date-range",
      type: "text",
      name: "Período da Viagem",
      x: 120,
      y: fittedTitle.lineCount === 2 ? 356 : 292,
      width: 840,
      height: 56,
      visible: Boolean(params.datesDisplayText),
      zIndex: 4,
      content: {
        text: params.datesDisplayText,
      },
      style: {
        fontSize: 38,
        fontWeight: 600,
        textAlign: "center",
        color: "#FFFFFF",
      },
    },
    {
      id: "inclusions-group",
      type: "group",
      name: "Inclusões Principais (2 a 4 itens)",
      x: 90,
      y: fittedTitle.lineCount === 2 ? 436 : 380,
      width: 900,
      height: 310,
      visible: true,
      zIndex: 4,
      content: {
        items: params.inclusions.slice(0, 4),
      },
      style: {
        fontSize: 34,
        gapPx: 20,
      },
    },
    {
      id: "price-glass-card",
      type: "glass-panel",
      name: "Caixa de Valor (Liquid / Frosted Glass)",
      x: 68,
      y: 1380,
      width: 580,
      height: 380,
      visible: true,
      zIndex: 6,
      glass: glassMaterial,
      content: {
        headerLabel: "Por apenas",
        installmentCount: params.installmentCount,
        installmentCents: params.installmentCents,
        totalPriceCents:
          params.totalPriceCents ?? params.installmentCents * params.installmentCount,
        priceBasisLabel: params.priceBasisLabel,
        occupancySummaryLabel: params.occupancySummaryLabel || "",
        paymentTermsLabel: params.paymentTermsLabel,
      },
      style: {
        paddingPx: 36,
      },
    },
    {
      id: "agency-signature",
      type: "group",
      name: "Assinatura Excelência Tour",
      x: 680,
      y: 1590,
      width: 332,
      height: 160,
      visible: true,
      zIndex: 6,
      content: {
        brandName: params.brandName || "Excelência Tour",
        ctaLabel: "Garantir Vaga",
      },
    },
  ];

  return {
    id: `story-doc-${params.offerId}`,
    offerId: params.offerId,
    presetId: "excelencia-story-9x16-v1",
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    nodes,
    theme: {
      brandName: params.brandName || "Excelência Tour",
      primaryTextColor: "#FFFFFF",
      accentColor: "#FBBF24",
      titleFontFamily: "Inter, system-ui, sans-serif",
      bodyFontFamily: "Inter, system-ui, sans-serif",
      topGradientPreset: params.topGradientPreset || "ocean_blue",
    },
    historyVersion: 1,
  };
}

// ============================================================================
// 9. WHATSAPP COPY GENERATOR & STRICT "HOJE" RULE (Sec. 21)
// ============================================================================

function getCalendarDayStringInTimezone(isoOrDate: string | Date, timeZone = "America/Sao_Paulo"): string {
  try {
    const dateObj = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
    if (Number.isNaN(dateObj.getTime())) return "";
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(dateObj);
  } catch {
    const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
    return d.toISOString().slice(0, 10);
  }
}

/**
 * Verifica se a oferta vence no mesmo dia-calendário de referência no fuso da agência (America/Sao_Paulo).
 */
export function isOfferClosingTodayInTimezone(
  expiresAtIso?: string | null,
  isSameDayClosingFlag?: boolean,
  referenceNow: Date = new Date(),
  timeZone = "America/Sao_Paulo"
): boolean {
  if (isSameDayClosingFlag === false) return false;
  if (!expiresAtIso) return Boolean(isSameDayClosingFlag);

  const nowDay = getCalendarDayStringInTimezone(referenceNow, timeZone);
  const expDay = getCalendarDayStringInTimezone(expiresAtIso, timeZone);
  if (!nowDay || !expDay) return false;
  return nowDay === expDay;
}

export interface WhatsAppCopyInput {
  destinationTitle: string;
  datesDisplayText: string;
  originCity?: string | null;
  hasAirfare?: boolean;
  flightTimesSummary?: string | null;
  includeFlightTimes?: boolean; // default FALSE for quick offers
  hotelName?: string | null;
  mealPlanLabel?: string | null;
  hasTransfer?: boolean;
  experiences?: string[];
  installmentCount: number;
  installmentCents: number;
  totalPriceCents?: number | null;
  priceBasisLabel: string;
  occupancySummaryLabel?: string;
  paymentMethodsLabel: string; // e.g., "no boleto ou cartão"
  firstInstallmentRule?: string | null;
  expiresAt?: string | null;
  isSameDayClosingOnly?: boolean;
  publicOfferUrl: string;
  referenceNow?: Date;
  timeZone?: string;
}

/**
 * Gera o texto comercial pronto para WhatsApp da Excelência Tour:
 * - Omite horários de voo por padrão em ofertas rápidas (includeFlightTimes = false)
 * - Aplica a regra estrita do "HOJE" (só escreve "Valor disponível para fechamento HOJE" se realmente vencer hoje no fuso de negócio)
 * - Anexa sempre o link público da oferta.
 */
export function generateWhatsAppOfferCopy(input: WhatsAppCopyInput): string {
  const lines: string[] = [];

  const titleHeader = input.datesDisplayText
    ? `*${input.destinationTitle.trim()}* — ${input.datesDisplayText.trim()}`
    : `*${input.destinationTitle.trim()}*`;
  lines.push(titleHeader);
  lines.push("");

  // Inclusions block
  if (input.hasAirfare !== false && input.originCity) {
    lines.push(`• Aéreos de ida e volta desde ${input.originCity.trim()}`);
  } else if (input.hasAirfare) {
    lines.push(`• Passagem aérea de ida e volta`);
  }

  // Only include flight times when explicitly toggled on
  if (input.includeFlightTimes && input.flightTimesSummary) {
    lines.push(`• Voos: ${input.flightTimesSummary.trim()}`);
  }

  if (input.hotelName) {
    const mealSuffix = input.mealPlanLabel ? ` (${input.mealPlanLabel.trim()})` : "";
    lines.push(`• Hospedagem no *${input.hotelName.trim()}*${mealSuffix}`);
  } else if (input.mealPlanLabel) {
    lines.push(`• Hospedagem com ${input.mealPlanLabel.trim()}`);
  }

  if (input.hasTransfer) {
    lines.push(`• Traslados de chegada e saída no destino`);
  }

  for (const exp of input.experiences || []) {
    if (exp.trim()) {
      lines.push(`• ${exp.trim()}`);
    }
  }

  lines.push("");

  // Pricing block
  const formattedInstallment = formatMoney(input.installmentCents);
  const basisClean = input.priceBasisLabel.toLowerCase();
  const occSuffix = input.occupancySummaryLabel ? ` (${input.occupancySummaryLabel})` : "";
  const firstRuleSuffix = input.firstInstallmentRule ? ` (${input.firstInstallmentRule})` : "";

  lines.push(
    `*Valor ${basisClean}${occSuffix}:* ${input.installmentCount}x de *${formattedInstallment}* ${input.paymentMethodsLabel}${firstRuleSuffix}`
  );

  if (input.totalPriceCents && input.totalPriceCents > 0) {
    lines.push(`Ou ${formatMoney(input.totalPriceCents)} à vista.`);
  }

  lines.push("");

  // Strict "HOJE" Rule (Sec. 21.3)
  const closesToday = isOfferClosingTodayInTimezone(
    input.expiresAt,
    input.isSameDayClosingOnly,
    input.referenceNow || new Date(),
    input.timeZone || "America/Sao_Paulo"
  );

  if (closesToday) {
    lines.push("Valor disponível para fechamento HOJE. Tarifas sujeitas à disponibilidade no ato da emissão.");
  } else if (input.expiresAt) {
    const expDate = new Date(input.expiresAt);
    if (!Number.isNaN(expDate.getTime())) {
      const formattedExp = new Intl.DateTimeFormat("pt-BR", {
        timeZone: input.timeZone || "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(expDate);
      lines.push(`Cotação válida até ${formattedExp} ou enquanto houver disponibilidade de lugares.`);
    } else {
      lines.push("Valores sujeitos à disponibilidade e alteração sem aviso prévio.");
    }
  } else {
    lines.push("Valores sujeitos à disponibilidade e alteração sem aviso prévio.");
  }

  if (input.publicOfferUrl) {
    lines.push("");
    lines.push(`Confira os detalhes completos da oferta:`);
    lines.push(input.publicOfferUrl.trim());
  }

  return lines.join("\n");
}

// ============================================================================
// 10. 24H RAPID OFFER LIFECYCLE & GLOBAL PRICE MEMORY (Sec. 22 & 23)
// ============================================================================

export interface OfferLifecycleEvaluation {
  effectiveStatus: OfferLifecycleStatus;
  isExpired: boolean;
  remainingMs: number;
  remainingHoursText: string;
  publicBannerMessage: string | null;
  ctaLabel: string;
}

/**
 * Avalia o ciclo de vida da oferta rápida (validade padrão de 24h).
 * Quando expirada, NUNCA gera 404 seco: mantém a página com aviso claro e CTA de atualização no WhatsApp.
 */
export function evaluateOfferLifecycleState(
  offer: {
    status?: OfferLifecycleStatus;
    expiresAt?: string | null;
  },
  now: Date = new Date()
): OfferLifecycleEvaluation {
  if (offer.status === "archived") {
    return {
      effectiveStatus: "archived",
      isExpired: true,
      remainingMs: 0,
      remainingHoursText: "Arquivada",
      publicBannerMessage: "Oferta expirada — consulte valor atualizado com nossa equipe.",
      ctaLabel: "Consultar valor atualizado no WhatsApp",
    };
  }

  if (!offer.expiresAt) {
    return {
      effectiveStatus: offer.status || "published",
      isExpired: false,
      remainingMs: 24 * 60 * 60 * 1000,
      remainingHoursText: "Ativa",
      publicBannerMessage: null,
      ctaLabel: "Garantir Vaga pelo WhatsApp",
    };
  }

  const expTime = new Date(offer.expiresAt!).getTime();
  const nowTime = now.getTime();
  if (Number.isNaN(expTime)) {
    return {
      effectiveStatus: offer.status || "published",
      isExpired: false,
      remainingMs: 24 * 60 * 60 * 1000,
      remainingHoursText: "Ativa",
      publicBannerMessage: null,
      ctaLabel: "Garantir Vaga pelo WhatsApp",
    };
  }

  const diffMs = expTime - nowTime;
  if (diffMs <= 0 || offer.status === "expired") {
    return {
      effectiveStatus: "expired",
      isExpired: true,
      remainingMs: 0,
      remainingHoursText: "Expirada",
      publicBannerMessage: "Oferta expirada — consulte valor atualizado e disponibilidade para suas datas.",
      ctaLabel: "Consultar valor atualizado no WhatsApp",
    };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return {
    effectiveStatus: offer.status || "published",
    isExpired: false,
    remainingMs: diffMs,
    remainingHoursText: hours > 0 ? `${hours}h ${mins}m restantes` : `${mins}m restantes`,
    publicBannerMessage: null,
    ctaLabel: "Garantir Vaga pelo WhatsApp",
  };
}

export interface PriceObservation {
  id: string;
  tenantId?: string;
  offerId: string;
  supplierName?: string;
  capturedAt: string;
  departureDate: string;
  returnDate: string;
  nights: number;
  originIata: string;
  destination: string;
  hotelId?: string;
  hotelRawName: string;
  roomType: string;
  mealPlan: string;
  partySignature: string; // e.g., "2A-0C-0I", "2A-1C(8)-0I"
  roomsCount: number;
  currency: "BRL" | "USD" | "EUR";
  priceBasis: PriceBasis;
  unitPriceCents?: number;
  totalPriceCents?: number;
  installmentCount?: number;
  installmentAmountCents?: number;
  paymentMethods: string[];
  sourceAssetId?: string;
}

export function buildPartySignature(party: TravelParty): string {
  const adults = Math.max(1, party.adults || 1);
  const children = Math.max(0, party.children || 0);
  const infants = Math.max(0, party.infants || 0);
  const agesPart =
    children > 0 && party.childAges?.length ? `(${party.childAges.join(",")})` : "";
  return `${adults}A-${children}C${agesPart}-${infants}I`;
}

export function buildPriceObservation(offer: TravelOffer, supplierName?: string): PriceObservation {
  const primaryHotel = offer.hotels[0];
  const primaryRoom = offer.rooms[0];

  return {
    id: `obs-${offer.id}-${Date.now()}`,
    tenantId: offer.tenantId,
    offerId: offer.id,
    supplierName,
    capturedAt: new Date().toISOString(),
    departureDate: offer.dates.departureDate || "",
    returnDate: offer.dates.returnDate || "",
    nights: offer.dates.nightsCount || 0,
    originIata: offer.destination.originIata || "XAP",
    destination: offer.destination.city || offer.destination.title,
    hotelId: primaryHotel?.hotelCatalogId || undefined,
    hotelRawName: primaryHotel?.hotelName || "Hospedagem",
    roomType: primaryRoom?.roomTypeLabel || primaryHotel?.roomTypeLabel || "Standard",
    mealPlan: primaryRoom?.boardBasisLabel || primaryHotel?.mealPlanLabel || "Não informado",
    partySignature: buildPartySignature(offer.party),
    roomsCount: Math.max(1, offer.rooms.length),
    currency: offer.pricing.currency,
    priceBasis: offer.pricing.priceBasis,
    unitPriceCents: offer.pricing.unitPriceCents ?? undefined,
    totalPriceCents:
      offer.pricing.totalPackagePriceCents ??
      offer.paymentTermsSnapshot.totalAmountCents ??
      undefined,
    installmentCount: offer.paymentTermsSnapshot.installmentCount,
    installmentAmountCents: offer.paymentTermsSnapshot.installmentAmountCents,
    paymentMethods: offer.paymentTermsSnapshot.methods,
    sourceAssetId: offer.sourceArtifacts[0]?.id,
  };
}

// ============================================================================
// 11. DETERMINISTIC COMMERCIAL VALIDATOR & MULTIMODAL PARSER (Sec. 4.4 & 5.5)
// ============================================================================

/**
 * Valida determinísticamente uma oferta comercial, apontando divergências aritméticas,
 * datas invertidas, ausência de regime alimentar confirmado ou conflito de ocupação.
 */
export function validateTravelOfferCommercials(offer: TravelOffer): ReviewFlag[] {
  const flags: ReviewFlag[] = [];

  // 1. Date ordering
  if (offer.dates.departureDate && offer.dates.returnDate) {
    const dep = new Date(offer.dates.departureDate).getTime();
    const ret = new Date(offer.dates.returnDate).getTime();
    if (!Number.isNaN(dep) && !Number.isNaN(ret) && ret < dep) {
      flags.push({
        id: "flag-date-order",
        severity: "blocking",
        field: "dates",
        message: "A data de retorno é anterior à data de saída.",
      });
    }
  }

  // 2. Installment vs Total Arithmetic
  const count = offer.pricing.installmentCount || offer.paymentTermsSnapshot.installmentCount;
  const instCents =
    offer.pricing.installmentAmountCents ?? offer.paymentTermsSnapshot.installmentAmountCents;
  const totalCents = offer.pricing.totalPackagePriceCents;
  const downCents = offer.pricing.downPaymentCents || 0;

  if (count && instCents && totalCents && totalCents > 0) {
    const impliedTotal = count * instCents + downCents;
    const diff = Math.abs(impliedTotal - totalCents);
    // Tolerance of R$ 15,00 (1500 cents) for rounding
    if (diff > 1500) {
      flags.push({
        id: "flag-arithmetic-mismatch",
        severity: "warning",
        field: "pricing",
        message: `Divergência entre soma das parcelas (${count}x ${formatMoney(instCents)} = ${formatMoney(
          impliedTotal
        )}) e valor total informado (${formatMoney(totalCents)}).`,
      });
    }
  }

  // 3. Children count vs child ages
  if (offer.party.children > 0 && offer.party.childAges.length < offer.party.children) {
    flags.push({
      id: "flag-missing-child-ages",
      severity: "warning",
      field: "party.childAges",
      message: `Foram indicadas ${offer.party.children} criança(s), mas apenas ${offer.party.childAges.length} idade(s) informada(s).`,
    });
  }

  // 4. Multi-room vs party occupancy
  const roomAdultsSum = offer.rooms.reduce((acc, r) => acc + (r.adults || 0), 0);
  if (offer.rooms.length > 0 && roomAdultsSum !== offer.party.adults) {
    flags.push({
      id: "flag-room-adults-mismatch",
      severity: "warning",
      field: "rooms",
      message: `A soma de adultos nos quartos (${roomAdultsSum}) difere do total de adultos na viagem (${offer.party.adults}).`,
    });
  }

  // 5. Unmatched hotel in catalog
  for (const h of offer.hotels) {
    if (!h.hotelCatalogId) {
      flags.push({
        id: `flag-unmatched-hotel-${h.hotelName}`,
        severity: "warning",
        field: "hotels",
        message: `Hotel "${h.hotelName}" não possui vínculo confirmado no catálogo central; revise o match sugerido.`,
      });
    }
  }

  return flags;
}

function parseMoneyStringToCents(raw: string): number | null {
  const cleaned = raw
    .replace(/R\$/gi, "")
    .replace(/\s+/g, "")
    .trim();
  if (!cleaned) return null;

  // Format: 4.260,00 or 284,00 or 284
  if (cleaned.includes(",")) {
    const normalized = cleaned.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(normalized);
    return Number.isNaN(num) ? null : Math.round(num * 100);
  }
  const normalized = cleaned.replace(/\./g, "");
  const num = parseFloat(normalized);
  return Number.isNaN(num) ? null : Math.round(num * 100);
}

/**
 * Extrai e constrói um TravelOffer completo a partir de texto bruto de cotação, print OCR
 * ou payload parcial, reconciliando passageiros, quartos, base tarifária, hotel no catálogo,
 * campanha de parcelamento, StoryDocument (9:16) e copy de WhatsApp.
 */
export function parseRawQuoteToTravelOffer(input: {
  offerId?: string;
  rawText?: string;
  destinationTitle?: string;
  destinationCity?: string;
  destinationCountry?: string;
  originCity?: string;
  originIata?: string;
  datesDisplayText?: string;
  departureDate?: string | null;
  returnDate?: string | null;
  hotelName?: string | null;
  mealPlan?: string | null;
  roomTypeLabel?: string | null;
  adults?: number;
  children?: number;
  infants?: number;
  childAges?: number[];
  rooms?: RoomOccupancy[];
  priceBasis?: PriceBasis;
  installmentCount?: number;
  installmentAmountCents?: number | null;
  totalPriceCents?: number | null;
  downPaymentCents?: number | null;
  paymentMethods?: PaymentMethodKind[];
  firstInstallmentRule?: string;
  hasAirfare?: boolean;
  hasTransfer?: boolean;
  experiences?: string[];
  inclusions?: string[];
  flightTimesSummary?: string | null;
  includeFlightTimesInWhatsApp?: boolean;
  backgroundImageUrl?: string | null;
  publicOfferUrl?: string;
  expiresAt?: string;
  isSameDayClosingOnly?: boolean;
  brandName?: string;
  referenceNow?: Date;
}): TravelOffer {
  const now = input.referenceNow || new Date();
  const offerId = input.offerId || `offer-${now.getTime()}`;
  const text = (input.rawText || "").trim();
  const lower = text.toLowerCase();

  // 1. Extract installments from text if not explicitly passed (e.g., "15x de R$ 284", "12x R$ 390,00")
  let installmentCount = input.installmentCount;
  let installmentAmountCents = input.installmentAmountCents ?? null;
  let totalPriceCents = input.totalPriceCents ?? null;

  if ((!installmentCount || !installmentAmountCents) && text) {
    const instRegex = /(\d{1,2})\s*x\s*(?:de\s*)?R?\$?\s*([\d.]+(?:,\d{2})?)/i;
    const match = text.match(instRegex);
    if (match) {
      if (!installmentCount) installmentCount = parseInt(match[1], 10);
      if (!installmentAmountCents) installmentAmountCents = parseMoneyStringToCents(match[2]);
    }
  }

  if (!totalPriceCents && text) {
    const totalRegex = /(?:total|à vista|a vista|pacote|valor)\s*(?:de|:)?\s*R\$\s*([\d.]+(?:,\d{2})?)/i;
    const match = text.match(totalRegex);
    if (match) {
      totalPriceCents = parseMoneyStringToCents(match[1]);
    }
  }

  // 2. Extract party & occupancy from text when not explicitly provided
  let adults = input.adults ?? 2;
  let children = input.children ?? 0;
  const infants = input.infants ?? 0;
  let childAges = input.childAges ? [...input.childAges] : [];

  if (text && input.adults === undefined) {
    const adtMatch = text.match(/(\d+)\s*adulto/i);
    if (adtMatch) adults = parseInt(adtMatch[1], 10);
    else if (lower.includes("single") || lower.includes("individual")) adults = 1;
    else if (lower.includes("casal") || lower.includes("duplo")) adults = 2;
  }

  if (text && input.children === undefined) {
    const chdMatch = text.match(/(\d+)\s*crian[çc]a/i) || text.match(/\+\s*(\d+)\s*chd/i);
    if (chdMatch) children = parseInt(chdMatch[1], 10);
    const ageMatches = [...text.matchAll(/(\d{1,2})\s*anos/gi)];
    if (ageMatches.length > 0 && childAges.length === 0) {
      childAges = ageMatches.map((m) => parseInt(m[1], 10)).filter((a) => a >= 1 && a <= 17);
    }
  }

  // 3. Determine PriceBasis (never silently collapse per_person vs total_package)
  let priceBasis: PriceBasis = input.priceBasis || "per_person";
  if (!input.priceBasis && text) {
    if (lower.includes("por casal") || lower.includes("valor para o casal")) {
      priceBasis = "per_couple";
    } else if (lower.includes("total do pacote") || lower.includes("pacote fechado") || lower.includes("valor total para")) {
      priceBasis = "total_package";
    } else if (lower.includes("para a família") || lower.includes("para a familia") || lower.includes("pacote família")) {
      priceBasis = "per_family";
    } else if (lower.includes("por quarto") || lower.includes("por apartamento")) {
      priceBasis = "per_room";
    } else if (lower.includes("por pessoa")) {
      priceBasis = "per_person";
    }
  }

  const labelMode: PartyLabelMode =
    adults === 1 && children === 0
      ? "single"
      : adults === 2 && children === 0
      ? "couple"
      : children > 0
      ? "family"
      : adults > 2
      ? "group"
      : "custom";

  const party: TravelParty = {
    adults,
    children,
    infants,
    childAges,
    labelMode,
  };

  // 4. Detect meal plan strictly from explicit input or text evidence (NEVER invent breakfast)
  let mealPlan: string | null = input.mealPlan ?? null;
  if (mealPlan === null && text) {
    if (lower.includes("all inclusive") || lower.includes("tudo incluso")) {
      mealPlan = "All Inclusive";
    } else if (lower.includes("meia pensão") || lower.includes("meia pensao")) {
      mealPlan = "Meia Pensão";
    } else if (lower.includes("pensão completa") || lower.includes("pensao completa")) {
      mealPlan = "Pensão Completa";
    } else if (lower.includes("café da manhã") || lower.includes("cafe da manha") || lower.includes("com café")) {
      mealPlan = "Café da Manhã";
    } else if (lower.includes("só hospedagem") || lower.includes("sem café")) {
      mealPlan = "Só Hospedagem";
    }
  }

  // 5. Resolve Hotel in Central Catalog
  const rawHotelName = input.hotelName || null;
  const hotelMatch = resolveHotelCatalogMatch(
    rawHotelName,
    input.destinationCity || input.destinationTitle
  );

  // If hotel is verified All Inclusive in catalog and quote mentions the resort without contradicting meal plan
  if (!mealPlan && hotelMatch.entity?.defaultMealPlans?.includes("All Inclusive") && lower.includes("all inclusive")) {
    mealPlan = "All Inclusive";
  }

  const rooms: RoomOccupancy[] =
    input.rooms && input.rooms.length > 0
      ? input.rooms
      : [
          {
            roomIndex: 1,
            roomTypeLabel:
              input.roomTypeLabel ||
              (adults === 1 ? "Apartamento Single" : adults === 2 ? "Apartamento Duplo" : "Apartamento Familiar"),
            boardBasisLabel: mealPlan || undefined,
            adults,
            children,
            infants,
            childAges,
          },
        ];

  // 6. Destination & Dates
  const destinationTitle = (
    input.destinationTitle ||
    input.destinationCity ||
    hotelMatch.entity?.destination.city ||
    "DESTINO ESPECIAL"
  ).trim();
  const destinationCity = (
    input.destinationCity ||
    hotelMatch.entity?.destination.city ||
    destinationTitle
  ).trim();
  const destinationCountry =
    input.destinationCountry || hotelMatch.entity?.destination.country || "Brasil";
  const originCity = (input.originCity || "Chapecó").trim();
  const originIata = (input.originIata || "XAP").trim();
  const datesDisplayText = (input.datesDisplayText || "").trim();

  // 7. Payment Campaign & Terms Snapshot
  const effectiveInstallmentCount = installmentCount || 15;
  const matchedCampaign =
    CANONICAL_PAYMENT_CAMPAIGNS.find((c) => c.defaultInstallments === effectiveInstallmentCount) ||
    CANONICAL_PAYMENT_CAMPAIGNS[0];

  const paymentSnapshot = computePaymentTermsSnapshot({
    totalAmountCents: totalPriceCents,
    statedInstallmentCount: effectiveInstallmentCount,
    statedInstallmentAmountCents: installmentAmountCents,
    campaign: matchedCampaign,
    methods: input.paymentMethods,
    entryAmountCents: input.downPaymentCents,
    firstDueRule: input.firstInstallmentRule,
  });

  const { priceBasisLabel, occupancySummaryLabel } = formatOccupancyAndBasisSummary(
    party,
    rooms,
    priceBasis
  );

  // 8. Select Story Inclusions (2-4 items) with explicit decision telemetry
  const hasAirfare =
    input.hasAirfare !== undefined
      ? input.hasAirfare
      : Boolean(lower.includes("aéreo") || lower.includes("aereo") || lower.includes("voo") || input.originCity);
  const hasTransfer =
    input.hasTransfer !== undefined
      ? input.hasTransfer
      : Boolean(lower.includes("traslado") || lower.includes("transfer"));

  const storySelection = selectStoryInclusions({
    hasAirfare,
    originCity,
    originIata,
    hasHotel: Boolean(rawHotelName || hotelMatch.entity || mealPlan),
    hotelName: hotelMatch.entity?.canonicalName || rawHotelName,
    mealPlan,
    hasTransfer,
    majorExperiences: input.experiences,
    extraInclusions: input.inclusions,
  });

  // 9. Resolve Background Image Priority (Hotel Catalog -> Input -> Default)
  const resolvedBackgroundUrl =
    input.backgroundImageUrl ||
    hotelMatch.entity?.heroImageUrl ||
    hotelMatch.entity?.galleryImageUrls?.[0] ||
    "/brand-logo.png";

  // 10. Validity (default 24h for quick offers)
  const defaultExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const expiresAt = input.expiresAt || defaultExpiresAt;
  const publicOfferUrl =
    input.publicOfferUrl || `https://waesy.app/classificados/${offerId}`;

  // 11. Build StoryDocument (1080x1920)
  const storyDocument = buildStoryDocumentFromOffer({
    offerId,
    destinationTitle,
    datesDisplayText,
    inclusions: storySelection.selectedInclusions,
    installmentCount: paymentSnapshot.installmentCount,
    installmentCents: paymentSnapshot.installmentAmountCents,
    totalPriceCents: paymentSnapshot.totalAmountCents,
    priceBasisLabel,
    occupancySummaryLabel,
    paymentTermsLabel: paymentSnapshot.shortStoryLabel,
    backgroundImageUrl: resolvedBackgroundUrl,
    brandName: input.brandName || "Excelência Tour",
  });

  // 12. Generate WhatsApp Copy
  const whatsappText = generateWhatsAppOfferCopy({
    destinationTitle,
    datesDisplayText,
    originCity: hasAirfare ? originCity : null,
    hasAirfare,
    flightTimesSummary: input.flightTimesSummary,
    includeFlightTimes: Boolean(input.includeFlightTimesInWhatsApp),
    hotelName: hotelMatch.entity?.canonicalName || rawHotelName,
    mealPlanLabel: mealPlan,
    hasTransfer,
    experiences: input.experiences,
    installmentCount: paymentSnapshot.installmentCount,
    installmentCents: paymentSnapshot.installmentAmountCents,
    totalPriceCents:
      priceBasis === "total_package" ? paymentSnapshot.totalAmountCents : totalPriceCents,
    priceBasisLabel,
    occupancySummaryLabel,
    paymentMethodsLabel: paymentSnapshot.shortStoryLabel.replace(
      "no boleto e cartão",
      "no boleto ou cartão"
    ),
    firstInstallmentRule: input.firstInstallmentRule,
    expiresAt,
    isSameDayClosingOnly: input.isSameDayClosingOnly,
    publicOfferUrl,
    referenceNow: now,
  });

  const offer: TravelOffer = {
    id: offerId,
    slug: destinationTitle
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-"),
    status: "published",
    offerType: "quick_quote",
    sourceArtifacts: [
      {
        id: `src-${offerId}`,
        kind: text ? "pasted_text" : "manual",
        extractedAt: now.toISOString(),
      },
    ],
    extractedFields: {
      destinationTitle: createExtractedField(destinationTitle, 0.96, "text", destinationTitle),
      hotelName: createExtractedField(
        hotelMatch.entity?.canonicalName || rawHotelName || null,
        hotelMatch.confidence || (rawHotelName ? 0.85 : 0.5),
        hotelMatch.matched ? "catalog" : "text",
        rawHotelName || undefined
      ),
      mealPlan: createExtractedField(mealPlan, mealPlan ? 0.94 : 0.4, "text", mealPlan || undefined),
      installmentAmountCents: createExtractedField(
        paymentSnapshot.installmentAmountCents,
        paymentSnapshot.installmentAmountCents > 0 ? 0.95 : 0.3,
        paymentSnapshot.recalculatedFromTotal ? "calculated" : "text"
      ),
    },
    destination: {
      title: destinationTitle,
      city: destinationCity,
      country: destinationCountry,
      originCity,
      originIata,
      destinationIata: hotelMatch.entity?.destination.iataCodes?.[0],
    },
    dates: {
      departureDate: input.departureDate || null,
      returnDate: input.returnDate || null,
      displayRangeText: datesDisplayText,
    },
    party,
    rooms,
    flights: hasAirfare
      ? [
          {
            direction: "outbound",
            originCity,
            originIata,
            destinationCity,
            departureDate: input.departureDate || undefined,
          },
        ]
      : [],
    hotels:
      rawHotelName || hotelMatch.entity
        ? [
            {
              hotelCatalogId: hotelMatch.entity?.id || null,
              hotelName: hotelMatch.entity?.canonicalName || rawHotelName || "Hospedagem Selecionada",
              city: destinationCity,
              country: destinationCountry,
              stars: hotelMatch.entity?.starRating || 4,
              roomTypeLabel: rooms[0]?.roomTypeLabel || "Apartamento Duplo",
              mealPlanLabel: mealPlan,
              heroImageUrl: hotelMatch.entity?.heroImageUrl,
              matchConfidence: hotelMatch.confidence,
            },
          ]
        : [],
    transfers: {
      included: hasTransfer,
      summary: hasTransfer ? "Traslados ao aeroporto inclusos" : "Traslados não inclusos",
    },
    experiences: input.experiences || [],
    inclusions: storySelection.selectedInclusions.map((i) => i.label),
    exclusions: [],
    pricing: {
      currency: "BRL",
      displayMode: "installments_primary",
      priceBasis,
      priceBasisLabel,
      occupancySummaryLabel,
      totalPackagePriceCents: totalPriceCents ?? paymentSnapshot.totalAmountCents,
      unitPriceCents:
        priceBasis === "per_person" ? paymentSnapshot.totalAmountCents : undefined,
      downPaymentCents: input.downPaymentCents ?? null,
      installmentCount: paymentSnapshot.installmentCount,
      installmentAmountCents: paymentSnapshot.installmentAmountCents,
      firstInstallmentRule: input.firstInstallmentRule,
      paymentMethods: paymentSnapshot.methods,
      paymentCampaignId: paymentSnapshot.campaignId,
      paymentTermsLabel: paymentSnapshot.shortStoryLabel,
    },
    paymentTermsSnapshot: paymentSnapshot,
    validity: {
      createdAt: now.toISOString(),
      publishedAt: now.toISOString(),
      expiresAt,
      expiredBehavior: "keep_page_show_expired_banner",
      isSameDayClosingOnly: Boolean(input.isSameDayClosingOnly),
    },
    publicPage: {
      url: publicOfferUrl,
      includeFlightTimes: true,
    },
    whatsappCopy: {
      text: whatsappText,
      includeFlightTimes: Boolean(input.includeFlightTimesInWhatsApp),
    },
    storyDocument,
    reviewFlags: [],
  };

  offer.reviewFlags = validateTravelOfferCommercials(offer);
  return offer;
}
