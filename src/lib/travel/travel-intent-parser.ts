import { CANONICAL_DESTINATIONS } from "@/lib/tourism/destinations-catalog";
import {
  normalizeOpportunityText,
  normalizePeriodSpec,
  normalizeRoomsFromLeadOrLegacy,
  resolveCanonicalDestinationTag,
  type StructuredDestinationTag,
  type StructuredPeriodSpec,
  type StructuredRoomOccupancy,
} from "./opportunity-matching-engine";

// ============================================================================
// CONTRATOS E PARSER DETERMINISTICO CLIENT-SAFE DE INTENCAO DE VIAGEM
// ============================================================================

export interface ParsedTravelIntentContact {
  fullName: string | null;
  whatsapp: string | null;
  email: string | null;
  originCity: string | null;
  originIata: string | null;
}

export interface ParsedTravelIntentBudget {
  maxTotalBudgetCents: number | null;
  maxInstallmentCents: number | null;
  preferredInstallments: number | null;
}

export interface ParsedTravelIntentPreferences {
  productType: string | null;
  inclusionsWanted: string[];
  minHotelStars: number | null;
  mealPlan: string | null;
  summaryTitle: string | null;
}

export interface ParsedTravelIntentResult {
  contact: ParsedTravelIntentContact;
  destinations: StructuredDestinationTag[];
  period: StructuredPeriodSpec;
  rooms: StructuredRoomOccupancy[];
  adultsCount: number;
  childrenAges: number[];
  budget: ParsedTravelIntentBudget;
  preferences: ParsedTravelIntentPreferences;
  rawMarkdownPreserved: string;
  usedAiProvider: boolean;
  providerName: string;
  confidenceScore: number;
  reviewFlags: string[];
}

export interface DestinationCatalogSearchHit {
  id: string;
  label: string;
  normalized: string;
  iata: string | null;
  gatewayIatas: string[];
  city: string | null;
  state: string | null;
  country: string | null;
  destinationId: string | null;
  cityIbge: string | null;
  source: "destinations" | "cities_global" | "airports_global" | "canonical";
  subtitle: string;
}

function parsePtBrMoneyToCents(rawMoney: string): number | null {
  const cleaned = rawMoney.replace(/r\$\s*/i, "").replace(/\s+/g, "").trim();
  if (!cleaned) return null;
  if (/mil\b/i.test(rawMoney)) {
    const num = Number(cleaned.replace(/[^0-9.,]/g, "").replace(",", "."));
    return Number.isFinite(num) && num > 0 ? Math.round(num * 1000 * 100) : null;
  }
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : /\.\d{3}(?!\d)/.test(cleaned)
      ? cleaned.replace(/\./g, "")
      : cleaned;
  const num = Number(normalized);
  return Number.isFinite(num) && num > 0 ? Math.round(num * 100) : null;
}

export function normalizeIsoDateFromBr(
  day: string,
  month: string,
  year?: string,
  fallbackYear = 2026
): string | null {
  const d = Number(day);
  const m = Number(month);
  const y = year ? (year.length === 2 ? 2000 + Number(year) : Number(year)) : fallbackYear;
  if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return null;
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2100) return null;

  // Validação calendária real via Date.UTC (impede 31/02 virar data inválida no Postgres)
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parseTravelIntentDeterministically(
  rawText: string,
  options?: { defaultOriginCity?: string | null; referenceYear?: number }
): ParsedTravelIntentResult {
  const text = String(rawText || "").trim();
  const refYear = options?.referenceYear ?? new Date().getUTCFullYear();
  const norm = normalizeOpportunityText(text);
  const reviewFlags: string[] = [];

  // 1. Contato (Nome, WhatsApp, Email, Origem)
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/(?:\+?55\s*)?(?:\(?\d{2}\)?[\s.-]?)?\b9?\d{4}[-.\s]?\d{4}\b/);
  const nameLineMatch = text.match(
    /(?:cliente|lead|passageiro|nome|contato)\s*[:-]\s*([^\n,;(|]{2,60})/i
  );
  const greetingNameMatch = !nameLineMatch
    ? text.match(/^#*\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){0,3})(?:\s*[-–|]|$)/m)
    : null;

  const fullName = (nameLineMatch?.[1] || greetingNameMatch?.[1] || "").trim() || null;
  const whatsapp = phoneMatch ? phoneMatch[0].replace(/\D/g, "") : null;
  const email = emailMatch ? emailMatch[0].toLowerCase() : null;

  const originMatch = text.match(/(?:saindo de|origem|embarque(?: em)?)\s*[:-]?\s*([A-ZÀ-Úa-zà-ú\s]{3,35})/i);
  const originCity = originMatch?.[1]?.trim() || options?.defaultOriginCity?.trim() || null;

  // 2. Destinos (menções explícitas + varredura do catálogo canônico)
  const foundDestinations: StructuredDestinationTag[] = [];
  const seenDestNorm = new Set<string>();
  const addDest = (tag: StructuredDestinationTag | null) => {
    if (!tag || !tag.normalized || seenDestNorm.has(tag.normalized)) return;
    seenDestNorm.add(tag.normalized);
    foundDestinations.push(tag);
  };

  const explicitDestLine = text.match(/(?:destinos?(?:\s+de\s+interesse)?|para|roteiro)\s*[:-]\s*([^\n]+)/i);
  if (explicitDestLine?.[1]) {
    for (const piece of explicitDestLine[1].split(/[,;/|]+|\s+ou\s+/i)) {
      const cleaned = piece.replace(/[*_`#]/g, "").trim();
      if (cleaned.length >= 3) {
        addDest(resolveCanonicalDestinationTag(cleaned));
      }
    }
  }

  for (const dest of CANONICAL_DESTINATIONS) {
    const cityNorm = normalizeOpportunityText(dest.city);
    const nameNorm = normalizeOpportunityText(dest.name);
    if (
      (cityNorm.length >= 4 && norm.includes(cityNorm)) ||
      (nameNorm.length >= 5 && norm.includes(nameNorm))
    ) {
      addDest(
        resolveCanonicalDestinationTag({
          label: dest.name,
          normalized: cityNorm,
          iata: dest.iata,
          city: dest.city,
          state: dest.state,
          country: dest.country,
          destinationId: dest.id,
          source: "canonical",
        })
      );
    }
  }

  // 3. Datas e Período
  const brDateMatches = [...text.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g)];
  const isoDateMatches = [...text.matchAll(/\b(202\d-\d{2}-\d{2})\b/g)];
  let startDate: string | null = null;
  let endDate: string | null = null;

  if (isoDateMatches.length > 0) {
    startDate = isoDateMatches[0][1];
    endDate = isoDateMatches[1]?.[1] || null;
  } else if (brDateMatches.length > 0) {
    startDate = normalizeIsoDateFromBr(brDateMatches[0][1], brDateMatches[0][2], brDateMatches[0][3], refYear);
    if (brDateMatches[1]) {
      endDate = normalizeIsoDateFromBr(brDateMatches[1][1], brDateMatches[1][2], brDateMatches[1][3], refYear);
    }
  }

  const period = normalizePeriodSpec({
    startDate,
    endDate,
    interestPeriodText: text,
    flexibilityDays: norm.includes("flexivel") ? 5 : startDate ? 3 : 0,
    referenceYear: refYear,
  });

  // 4. Quartos, Adultos e Idades das Crianças (0-17)
  const roomsCountMatch = text.match(/(\d+)\s*(?:quartos?|aptos?|apartamentos?)/i);
  const adultsMatch = text.match(/(\d+)\s*(?:adultos?|adt)/i);
  const childrenCountMatch = text.match(/(\d+)\s*(?:crian[çc]as?|chd|filhos?)/i);

  const ageMatches = [
    ...text.matchAll(
      /(?:crian[çc]a\s*\d*\s*(?:com|de)?\s*|idade[s]?\s*[:-]?\s*)(\d{1,2})\s*(?:anos?|a\b)/gi
    ),
    ...text.matchAll(/\b(\d{1,2})\s*anos?\b/gi),
  ];

  const extractedAges: number[] = [];
  for (const m of ageMatches) {
    const val = Number(m[1]);
    if (Number.isFinite(val) && val >= 0 && val <= 17) {
      extractedAges.push(val);
    }
  }
  if (norm.includes("colo") || norm.includes("bebe") || norm.includes("infante")) {
    if (!extractedAges.some((a) => a <= 1)) {
      extractedAges.unshift(1);
    }
  }

  const parsedAdults = adultsMatch ? Math.max(1, Math.min(20, Number(adultsMatch[1]))) : 2;
  const parsedChildrenCount = Math.max(
    childrenCountMatch ? Math.min(12, Number(childrenCountMatch[1])) : 0,
    extractedAges.length
  );

  const normalizedRooms = normalizeRoomsFromLeadOrLegacy({
    adultsCount: parsedAdults,
    childrenCount: parsedChildrenCount,
    childrenAges: extractedAges.slice(0, parsedChildrenCount || extractedAges.length),
    roomsCount: roomsCountMatch ? Number(roomsCountMatch[1]) : 1,
  });

  // 5. Orçamento e Parcelamento
  const installmentMatch = text.match(/(\d{1,2})\s*x\s*(?:de)?\s*r?\$?\s*([\d.,]+)/i);
  const totalBudgetMatch = text.match(
    /(?:or[çc]amento|teto|verba|valor|at[eé]|total)\s*[:-]?\s*(?:de)?\s*r\$\s*([\d.,]+(?:\s*mil)?)/i
  );
  const genericMoneyMatch = !totalBudgetMatch ? text.match(/r\$\s*([\d.,]+(?:\s*mil)?)/i) : null;

  const preferredInstallments = installmentMatch ? Number(installmentMatch[1]) : null;
  const maxInstallmentCents = installmentMatch?.[2] ? parsePtBrMoneyToCents(installmentMatch[2]) : null;
  const maxTotalBudgetCents = totalBudgetMatch?.[1]
    ? parsePtBrMoneyToCents(totalBudgetMatch[1])
    : genericMoneyMatch?.[1] && !installmentMatch
      ? parsePtBrMoneyToCents(genericMoneyMatch[1])
      : null;

  // 6. Preferências e Inclusões
  const inclusionsWanted: string[] = [];
  if (norm.includes("all inclusive") || norm.includes("all-inclusive")) inclusionsWanted.push("all_inclusive");
  if (norm.includes("cafe da manha")) inclusionsWanted.push("cafe_da_manha");
  if (norm.includes("meia pensao")) inclusionsWanted.push("meia_pensao");
  if (norm.includes("aereo") || norm.includes("voo") || norm.includes("passagem")) inclusionsWanted.push("aereo_incluso");
  if (norm.includes("transfer") || norm.includes("traslado")) inclusionsWanted.push("transfer");
  if (norm.includes("bagagem") || norm.includes("mala despachada")) inclusionsWanted.push("bagagem_despachada");
  if (norm.includes("resort")) inclusionsWanted.push("resort");

  const starsMatch = text.match(/(\d)\s*estrelas?/i);
  const minHotelStars = starsMatch ? Math.min(5, Math.max(1, Number(starsMatch[1]))) : null;
  const mealPlan = inclusionsWanted.includes("all_inclusive")
    ? "All Inclusive"
    : inclusionsWanted.includes("meia_pensao")
      ? "Meia Pensão"
      : inclusionsWanted.includes("cafe_da_manha")
        ? "Café da Manhã"
        : null;

  if (foundDestinations.length === 0) reviewFlags.push("Nenhum destino reconhecido automaticamente; selecione na lista.");
  if (period.mode === "unspecified") reviewFlags.push("Período/datas não identificados; defina mês, datas ou flexibilidade.");

  const score =
    25 +
    (foundDestinations.length > 0 ? 25 : 0) +
    (period.mode !== "unspecified" ? 20 : 0) +
    (adultsMatch || extractedAges.length > 0 ? 15 : 0) +
    (maxTotalBudgetCents || maxInstallmentCents ? 15 : 0);

  return {
    contact: {
      fullName,
      whatsapp,
      email,
      originCity,
      originIata: null,
    },
    destinations: foundDestinations,
    period,
    rooms: normalizedRooms.rooms,
    adultsCount: normalizedRooms.adultsCount,
    childrenAges: normalizedRooms.childrenAges,
    budget: {
      maxTotalBudgetCents,
      maxInstallmentCents,
      preferredInstallments,
    },
    preferences: {
      productType: norm.includes("aereo") && !norm.includes("hotel") && !norm.includes("pacote") ? "flight" : "package",
      inclusionsWanted,
      minHotelStars,
      mealPlan,
      summaryTitle:
        foundDestinations.length > 0
          ? `${foundDestinations.map((d) => d.city || d.label).slice(0, 2).join(" / ")}${period.displayLabel ? ` (${period.displayLabel})` : ""}`
          : null,
    },
    rawMarkdownPreserved: text,
    usedAiProvider: false,
    providerName: "deterministic_parser",
    confidenceScore: Math.min(95, score),
    reviewFlags,
  };
}
