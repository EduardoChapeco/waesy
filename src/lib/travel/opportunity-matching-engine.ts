import { CANONICAL_DESTINATIONS } from "@/lib/tourism/destinations-catalog";
import type { AirportRecord } from "@/types/airports";

type MatchingAirportMeta = Pick<
  AirportRecord,
  "iata_code" | "city" | "state_province" | "country" | "country_code"
>;

const RUNTIME_AIRPORT_DIRECTORY = new Map<string, MatchingAirportMeta>();

export function registerKnownAirportsForMatching(records: MatchingAirportMeta[]): void {
  for (const r of records) {
    const code = (r.iata_code || "").trim().toUpperCase();
    if (code) RUNTIME_AIRPORT_DIRECTORY.set(code, r);
  }
}

const CORE_AIRPORT_GATEWAYS: Record<string, MatchingAirportMeta> = {
  XAP: { iata_code: "XAP", city: "Chapecó", state_province: "SC", country: "Brasil", country_code: "BR" },
  GRU: { iata_code: "GRU", city: "São Paulo", state_province: "SP", country: "Brasil", country_code: "BR" },
  CGH: { iata_code: "CGH", city: "São Paulo", state_province: "SP", country: "Brasil", country_code: "BR" },
  VCP: { iata_code: "VCP", city: "Campinas", state_province: "SP", country: "Brasil", country_code: "BR" },
  POA: { iata_code: "POA", city: "Porto Alegre", state_province: "RS", country: "Brasil", country_code: "BR" },
  CXJ: { iata_code: "CXJ", city: "Caxias do Sul", state_province: "RS", country: "Brasil", country_code: "BR" },
  FLN: { iata_code: "FLN", city: "Florianópolis", state_province: "SC", country: "Brasil", country_code: "BR" },
  NVT: { iata_code: "NVT", city: "Navegantes", state_province: "SC", country: "Brasil", country_code: "BR" },
  IGU: { iata_code: "IGU", city: "Foz do Iguaçu", state_province: "PR", country: "Brasil", country_code: "BR" },
  CWB: { iata_code: "CWB", city: "Curitiba", state_province: "PR", country: "Brasil", country_code: "BR" },
  GIG: { iata_code: "GIG", city: "Rio de Janeiro", state_province: "RJ", country: "Brasil", country_code: "BR" },
  SDU: { iata_code: "SDU", city: "Rio de Janeiro", state_province: "RJ", country: "Brasil", country_code: "BR" },
  BSB: { iata_code: "BSB", city: "Brasília", state_province: "DF", country: "Brasil", country_code: "BR" },
  CNF: { iata_code: "CNF", city: "Belo Horizonte", state_province: "MG", country: "Brasil", country_code: "BR" },
  SSA: { iata_code: "SSA", city: "Salvador", state_province: "BA", country: "Brasil", country_code: "BR" },
  BPS: { iata_code: "BPS", city: "Porto Seguro", state_province: "BA", country: "Brasil", country_code: "BR" },
  IOS: { iata_code: "IOS", city: "Ilhéus", state_province: "BA", country: "Brasil", country_code: "BR" },
  REC: { iata_code: "REC", city: "Recife", state_province: "PE", country: "Brasil", country_code: "BR" },
  MCZ: { iata_code: "MCZ", city: "Maceió", state_province: "AL", country: "Brasil", country_code: "BR" },
  FOR: { iata_code: "FOR", city: "Fortaleza", state_province: "CE", country: "Brasil", country_code: "BR" },
  JJD: { iata_code: "JJD", city: "Jericoacoara", state_province: "CE", country: "Brasil", country_code: "BR" },
  NAT: { iata_code: "NAT", city: "Natal", state_province: "RN", country: "Brasil", country_code: "BR" },
  JPA: { iata_code: "JPA", city: "João Pessoa", state_province: "PB", country: "Brasil", country_code: "BR" },
  FEN: { iata_code: "FEN", city: "Fernando de Noronha", state_province: "PE", country: "Brasil", country_code: "BR" },
  CLV: { iata_code: "CLV", city: "Caldas Novas", state_province: "GO", country: "Brasil", country_code: "BR" },
  CAL: { iata_code: "CAL", city: "Caldas Novas", state_province: "GO", country: "Brasil", country_code: "BR" },
  GYN: { iata_code: "GYN", city: "Goiânia", state_province: "GO", country: "Brasil", country_code: "BR" },
  CGR: { iata_code: "CGR", city: "Campo Grande", state_province: "MS", country: "Brasil", country_code: "BR" },
  MAO: { iata_code: "MAO", city: "Manaus", state_province: "AM", country: "Brasil", country_code: "BR" },
  BEL: { iata_code: "BEL", city: "Belém", state_province: "PA", country: "Brasil", country_code: "BR" },
  VIX: { iata_code: "VIX", city: "Vitória", state_province: "ES", country: "Brasil", country_code: "BR" },
  MIA: { iata_code: "MIA", city: "Miami", state_province: "FL", country: "Estados Unidos", country_code: "US" },
  MCO: { iata_code: "MCO", city: "Orlando", state_province: "FL", country: "Estados Unidos", country_code: "US" },
  JFK: { iata_code: "JFK", city: "Nova York", state_province: "NY", country: "Estados Unidos", country_code: "US" },
  CUN: { iata_code: "CUN", city: "Cancún", state_province: "", country: "México", country_code: "MX" },
  PUJ: { iata_code: "PUJ", city: "Punta Cana", state_province: "", country: "República Dominicana", country_code: "DO" },
  PTY: { iata_code: "PTY", city: "Cidade do Panamá", state_province: "", country: "Panamá", country_code: "PA" },
  EZE: { iata_code: "EZE", city: "Buenos Aires", state_province: "", country: "Argentina", country_code: "AR" },
  AEP: { iata_code: "AEP", city: "Buenos Aires", state_province: "", country: "Argentina", country_code: "AR" },
  SCL: { iata_code: "SCL", city: "Santiago", state_province: "", country: "Chile", country_code: "CL" },
  LIM: { iata_code: "LIM", city: "Lima", state_province: "", country: "Peru", country_code: "PE" },
  LIS: { iata_code: "LIS", city: "Lisboa", state_province: "", country: "Portugal", country_code: "PT" },
  OPO: { iata_code: "OPO", city: "Porto", state_province: "", country: "Portugal", country_code: "PT" },
  MAD: { iata_code: "MAD", city: "Madri", state_province: "", country: "Espanha", country_code: "ES" },
  CDG: { iata_code: "CDG", city: "Paris", state_province: "", country: "França", country_code: "FR" },
  FCO: { iata_code: "FCO", city: "Roma", state_province: "", country: "Itália", country_code: "IT" },
  LHR: { iata_code: "LHR", city: "Londres", state_province: "", country: "Reino Unido", country_code: "GB" },
  DXB: { iata_code: "DXB", city: "Dubai", state_province: "", country: "Emirados Árabes Unidos", country_code: "AE" },
};

function lookupKnownAirport(code?: string | null): MatchingAirportMeta | undefined {
  const clean = (code || "").trim().toUpperCase();
  if (!clean) return undefined;
  return RUNTIME_AIRPORT_DIRECTORY.get(clean) || CORE_AIRPORT_GATEWAYS[clean];
}

// ============================================================================
// CONTRATOS CANONICOS DO MOTOR UNIFICADO DE OPORTUNIDADES (SSOT PURO)
// ============================================================================

export type StructuredDestinationSource =
  | "destinations"
  | "cities_global"
  | "airports_global"
  | "canonical"
  | "ai"
  | "free_text";

export interface StructuredDestinationTag {
  id?: string;
  label: string;
  normalized: string;
  iata?: string | null;
  gatewayIatas?: string[];
  city?: string | null;
  state?: string | null;
  country?: string | null;
  destinationId?: string | null;
  cityIbge?: string | null;
  aliases?: string[];
  source?: StructuredDestinationSource;
}

export type PeriodFlexibilityMode =
  | "exact"
  | "window"
  | "month_list"
  | "season_tag"
  | "flexible_anytime"
  | "unspecified";

export interface StructuredPeriodSpec {
  mode: PeriodFlexibilityMode;
  startDate?: string | null;
  endDate?: string | null;
  flexibilityDays: number;
  targetMonths: string[];
  seasonTags: string[];
  flexibleAnytime: boolean;
  displayLabel?: string;
}

export interface StructuredRoomOccupancy {
  roomNumber: number;
  roomLabel?: string;
  adultsCount: number;
  childrenCount: number;
  childrenAges: number[];
  mealPlanPreference?: string | null;
}

export type CanonicalSupplySourceType =
  | "proposal"
  | "quote_capture"
  | "agency_quote"
  | "catalog_package"
  | "ocr_quote"
  | "offer_engine";

export interface CanonicalSupplyOffer {
  id: string;
  sourceType: CanonicalSupplySourceType;
  title: string;
  originCity?: string | null;
  originIata?: string | null;
  destinationCity: string;
  destinationIata?: string | null;
  destinationState?: string | null;
  destinationCountry?: string | null;
  destinationTags?: StructuredDestinationTag[];
  departureDate?: string | null;
  returnDate?: string | null;
  quotedAdultsCount: number;
  quotedChildrenCount: number;
  quotedChildrenAges: number[];
  rooms?: StructuredRoomOccupancy[];
  totalPriceCents: number;
  adultUnitPriceCents?: number | null;
  explicitChildUnitPriceCents?: number | null;
  explicitChildMaxAge?: number | null;
  airfarePerAdultCents?: number | null;
  transferPerAdultCents?: number | null;
  hotelShareTotalCents?: number | null;
  installmentCount?: number | null;
  installmentValueCents?: number | null;
  productType?: string | null;
  mealPlan?: string | null;
  hotelStars?: number | null;
  inclusions?: string[];
  operatorSlug?: string | null;
  targetLeadId?: string | null;
  targetCustomerId?: string | null;
  createdAt?: string | null;
}

export interface RecentLeadProposalRef {
  id?: string;
  title?: string;
  destinationNormalized: string;
  departureDate?: string | null;
  createdAt: string;
}

export interface CanonicalDemandLead {
  id: string;
  demandSource: "lead_crm" | "travel_interest" | "client_demand";
  leadId?: string | null;
  customerId?: string | null;
  contactId?: string | null;
  fullName: string;
  whatsapp?: string | null;
  originCity?: string | null;
  originIata?: string | null;
  destinations: StructuredDestinationTag[];
  period: StructuredPeriodSpec;
  rooms: StructuredRoomOccupancy[];
  adultsCount: number;
  childrenAges: number[];
  maxTotalBudgetCents: number | null;
  maxInstallmentCents?: number | null;
  preferredInstallments?: number | null;
  budgetTolerancePct?: number | null;
  preferredProductTypes?: string[];
  wantedInclusions?: string[];
  minHotelStars?: number | null;
  preferredMealPlan?: string | null;
  rawNotes?: string | null;
  recentProposals?: RecentLeadProposalRef[];
}

export type ChildPricingAgeBand = "infant_0_1" | "chd_2_11" | "teen_adult_12_17";

export type ChildPricingBasis =
  | "exact_child_rate"
  | "exact_air_plus_transfer"
  | "estimated_air_plus_transfer"
  | "infant_minimal_fee"
  | "adult_full_tariff";

export interface ChildPricingBandBreakdown {
  age: number;
  band: ChildPricingAgeBand;
  bandLabel: string;
  estimatedCostCents: number;
  pricingBasis: ChildPricingBasis;
}

export interface ChildSimulationResult {
  applied: boolean;
  requiresChildRequote: boolean;
  reasonPt: string;
  baseOfferAdultsCount: number;
  basePerAdultCents: number;
  simulatedAirPlusTransferPerChildCents: number;
  simulationSource:
    | "not_needed"
    | "explicit_child_rate"
    | "itemized_air_transfer"
    | "calibrated_bundle_share";
  simulatedAirSharePct: number;
  adultsSubtotalCents: number;
  childrenSubtotalCents: number;
  simulatedTotalCents: number;
  deltaVsOfferTotalCents: number;
  infantsCount: number;
  chd2to11Count: number;
  teens12to17Count: number;
  perChildBreakdown: ChildPricingBandBreakdown[];
}

export interface HistoricalPriceObservationInput {
  id?: string;
  destination: string;
  totalCents: number;
  adultsCount?: number;
  childrenCount?: number;
  source?: string;
  observedAt?: string;
}

export interface HistoricalPriceCheck {
  sampleCount: number;
  historicalMedianCents: number | null;
  historicalMinCents: number | null;
  historicalMaxCents: number | null;
  comparedUnitCents: number;
  historicalSavingsPct: number | null;
  verdict: "great_deal" | "fair_price" | "above_market" | "insufficient_history";
  verdictLabelPt: string;
}

export interface OpportunityScoreBreakdown {
  destination: number;
  period: number;
  partyAndRooms: number;
  budgetAndValue: number;
  total: number;
}

export type OpportunityMatchTier =
  | "exact_match"
  | "strong_match"
  | "conditional_child_requote"
  | "budget_stretch"
  | "rejected";

export type OpportunityRejectionCode =
  | "NONE"
  | "SELF_LEAD"
  | "MISSING_OFFER_DESTINATION"
  | "MISSING_DEMAND_DESTINATION"
  | "DESTINATION_MISMATCH"
  | "MISSING_DATES_NO_FLEX"
  | "DATES_OUT_OF_WINDOW"
  | "ADULT_CAPACITY_INSUFFICIENT"
  | "ROOM_COUNT_MISMATCH"
  | "OVER_BUDGET_CAP"
  | "LOW_COMPOSITE_SCORE";

export interface UnifiedOpportunityResult {
  isMatch: boolean;
  matchScore: number;
  matchTier: OpportunityMatchTier;
  rejectionCode: OpportunityRejectionCode;
  rejectionReasonPt: string | null;
  matchedDestinationLabel: string | null;
  matchedViaGateway: boolean;
  requiresChildRequote: boolean;
  budgetStatus: "within_budget" | "near_ceiling" | "open_to_validate" | "over_budget";
  budgetVariancePct: number | null;
  effectiveOfferTotalCents: number;
  childSimulation: ChildSimulationResult;
  historicalCheck: HistoricalPriceCheck;
  scoreBreakdown: OpportunityScoreBreakdown;
  matchReasons: string[];
  warnings: string[];
  alreadyProposedRecently: boolean;
  recentProposalInfo: { title?: string; createdAt: string } | null;
  suggestedPitchPt: string;
}

export interface UnifiedMatchOptions {
  minScore?: number;
  defaultFlexibilityDays?: number;
  defaultBudgetTolerancePct?: number;
  cooldownDays?: number;
  historicalObservations?: HistoricalPriceObservationInput[];
  now?: Date;
}

// ============================================================================
// TABELA DE GATEWAYS REGIONAIS & SINONIMOS CANONICOS
// ============================================================================

interface DestinationClusterRule {
  slug: string;
  aliases: string[];
  ownIatas: string[];
  gatewayIatas: string[];
  state?: string;
  country?: string;
}

const DESTINATION_CLUSTER_RULES: DestinationClusterRule[] = [
  {
    slug: "gramado",
    aliases: ["gramado", "canela", "serra gaucha", "bento goncalves", "nova petropolis"],
    ownIatas: [],
    gatewayIatas: ["POA", "CXJ"],
    state: "RS",
    country: "Brasil",
  },
  {
    slug: "maragogi",
    aliases: ["maragogi", "japaratinga", "sao miguel dos milagres", "costa dos corais", "antunes"],
    ownIatas: [],
    gatewayIatas: ["MCZ", "REC"],
    state: "AL",
    country: "Brasil",
  },
  {
    slug: "porto_de_galinhas",
    aliases: ["porto de galinhas", "muro alto", "ipojuca", "maracaipe", "praia dos carneiros", "tamandare"],
    ownIatas: [],
    gatewayIatas: ["REC", "MCZ"],
    state: "PE",
    country: "Brasil",
  },
  {
    slug: "maceio",
    aliases: ["maceio", "praia do frances", "barra de sao miguel"],
    ownIatas: ["MCZ"],
    gatewayIatas: ["MCZ"],
    state: "AL",
    country: "Brasil",
  },
  {
    slug: "recife",
    aliases: ["recife", "olinda"],
    ownIatas: ["REC"],
    gatewayIatas: ["REC"],
    state: "PE",
    country: "Brasil",
  },
  {
    slug: "porto_seguro",
    aliases: ["porto seguro", "arraial d'ajuda", "arraial d ajuda", "trancoso", "caraiva", "santa cruz cabralia"],
    ownIatas: ["BPS"],
    gatewayIatas: ["BPS"],
    state: "BA",
    country: "Brasil",
  },
  {
    slug: "salvador",
    aliases: ["salvador", "praia do forte", "costa do sauipe", "imbassai", "guarajuba"],
    ownIatas: ["SSA"],
    gatewayIatas: ["SSA"],
    state: "BA",
    country: "Brasil",
  },
  {
    slug: "morro_de_sao_paulo",
    aliases: ["morro de sao paulo", "boipeba", "tinhare", "cairu"],
    ownIatas: [],
    gatewayIatas: ["SSA", "IOS"],
    state: "BA",
    country: "Brasil",
  },
  {
    slug: "sao_paulo",
    aliases: ["sao paulo", "sao paulo sp", "guarulhos", "congonhas"],
    ownIatas: ["GRU", "CGH", "VCP"],
    gatewayIatas: ["GRU", "CGH", "VCP"],
    state: "SP",
    country: "Brasil",
  },
  {
    slug: "jericoacoara",
    aliases: ["jericoacoara", "jeri", "prea", "cruz", "jijoca"],
    ownIatas: ["JJD"],
    gatewayIatas: ["JJD", "FOR"],
    state: "CE",
    country: "Brasil",
  },
  {
    slug: "fortaleza",
    aliases: ["fortaleza", "aquiraz", "beach park", "cumbuco", "canoa quebrada", "beberibe"],
    ownIatas: ["FOR"],
    gatewayIatas: ["FOR"],
    state: "CE",
    country: "Brasil",
  },
  {
    slug: "natal",
    aliases: ["natal", "pipa", "tibau do sul", "sao miguel do gostoso", "genipabu", "ponta negra"],
    ownIatas: ["NAT"],
    gatewayIatas: ["NAT"],
    state: "RN",
    country: "Brasil",
  },
  {
    slug: "bombinhas_balneario",
    aliases: ["bombinhas", "balneario camboriu", "itapema", "penha", "beto carrero", "navegantes"],
    ownIatas: ["NVT"],
    gatewayIatas: ["NVT", "FLN"],
    state: "SC",
    country: "Brasil",
  },
  {
    slug: "florianopolis",
    aliases: ["florianopolis", "floripa", "jurere", "canasvieiras", "ingleses", "garopaba", "praia do rosa"],
    ownIatas: ["FLN"],
    gatewayIatas: ["FLN"],
    state: "SC",
    country: "Brasil",
  },
  {
    slug: "foz_do_iguacu",
    aliases: ["foz do iguacu", "foz", "cataratas", "puerto iguazu", "ciudad del este"],
    ownIatas: ["IGU"],
    gatewayIatas: ["IGU"],
    state: "PR",
    country: "Brasil",
  },
  {
    slug: "rio_de_janeiro",
    aliases: ["rio de janeiro", "copacabana", "ipanema", "barra da tijuca", "buzios", "arraial do cabo", "angra dos reis", "paraty"],
    ownIatas: ["GIG", "SDU", "RIO"],
    gatewayIatas: ["GIG", "SDU", "RIO", "CFB"],
    state: "RJ",
    country: "Brasil",
  },
  {
    slug: "sao_paulo",
    aliases: ["sao paulo", "campos do jordao", "olimpia", "guarujá", "guaruja", "ilhabela", "atibaia"],
    ownIatas: ["GRU", "CGH", "VCP", "SAO"],
    gatewayIatas: ["GRU", "CGH", "VCP", "SAO"],
    state: "SP",
    country: "Brasil",
  },
  {
    slug: "caldas_novas",
    aliases: ["caldas novas", "rio quente", "hot park"],
    ownIatas: ["CLV"],
    gatewayIatas: ["CLV", "GYN"],
    state: "GO",
    country: "Brasil",
  },
  {
    slug: "fernando_de_noronha",
    aliases: ["fernando de noronha", "noronha"],
    ownIatas: ["FEN"],
    gatewayIatas: ["FEN", "REC", "NAT"],
    state: "PE",
    country: "Brasil",
  },
  {
    slug: "bonito",
    aliases: ["bonito", "jardim ms", "bodoquena"],
    ownIatas: ["BYO"],
    gatewayIatas: ["BYO", "CGR"],
    state: "MS",
    country: "Brasil",
  },
  {
    slug: "chapeco",
    aliases: ["chapeco", "piratuba", "aguas de chapeco", "sao miguel do oeste"],
    ownIatas: ["XAP"],
    gatewayIatas: ["XAP"],
    state: "SC",
    country: "Brasil",
  },
  {
    slug: "buenos_aires",
    aliases: ["buenos aires", "recoleta", "palermo", "caba"],
    ownIatas: ["AEP", "EZE", "BUE"],
    gatewayIatas: ["AEP", "EZE", "BUE"],
    country: "Argentina",
  },
  {
    slug: "bariloche",
    aliases: ["bariloche", "san carlos de bariloche", "cerro catedral"],
    ownIatas: ["BRC"],
    gatewayIatas: ["BRC"],
    country: "Argentina",
  },
  {
    slug: "santiago",
    aliases: ["santiago", "valle nevado", "farellones", "vina del mar", "valparaiso"],
    ownIatas: ["SCL"],
    gatewayIatas: ["SCL"],
    country: "Chile",
  },
  {
    slug: "cancun",
    aliases: ["cancun", "riviera maya", "playa del carmen", "tulum", "costa mujeres"],
    ownIatas: ["CUN"],
    gatewayIatas: ["CUN"],
    country: "Mexico",
  },
  {
    slug: "punta_cana",
    aliases: ["punta cana", "bavaro", "cap cana", "bayahibe", "uvero alto"],
    ownIatas: ["PUJ"],
    gatewayIatas: ["PUJ"],
    country: "Republica Dominicana",
  },
  {
    slug: "orlando",
    aliases: ["orlando", "disney", "kissimmee", "universal orlando"],
    ownIatas: ["MCO", "SFB"],
    gatewayIatas: ["MCO", "SFB"],
    country: "Estados Unidos",
  },
  {
    slug: "miami",
    aliases: ["miami", "miami beach", "fort lauderdale", "key biscayne"],
    ownIatas: ["MIA", "FLL"],
    gatewayIatas: ["MIA", "FLL"],
    country: "Estados Unidos",
  },
  {
    slug: "nova_york",
    aliases: ["nova york", "new york", "manhattan", "nyc"],
    ownIatas: ["JFK", "LGA", "EWR", "NYC"],
    gatewayIatas: ["JFK", "LGA", "EWR", "NYC"],
    country: "Estados Unidos",
  },
  {
    slug: "lisboa",
    aliases: ["lisboa", "cascais", "sintra", "porto portugal"],
    ownIatas: ["LIS", "OPO"],
    gatewayIatas: ["LIS", "OPO"],
    country: "Portugal",
  },
  {
    slug: "paris",
    aliases: ["paris", "versailles"],
    ownIatas: ["CDG", "ORY", "PAR"],
    gatewayIatas: ["CDG", "ORY", "PAR"],
    country: "Franca",
  },
  {
    slug: "roma",
    aliases: ["roma", "vaticano"],
    ownIatas: ["FCO", "CIA", "ROM"],
    gatewayIatas: ["FCO", "CIA", "ROM"],
    country: "Italia",
  },
];

const SEASON_TAG_MONTHS: Record<string, string[]> = {
  janeiro: ["01"],
  verao: ["12", "01", "02", "03"],
  carnaval: ["02", "03"],
  pascoa: ["03", "04"],
  semana_santa: ["03", "04"],
  maio: ["05"],
  junho: ["06"],
  julho: ["07"],
  ferias_julho: ["07"],
  inverno: ["06", "07", "08"],
  agosto: ["08"],
  setembro: ["09"],
  outubro: ["10"],
  novembro: ["11"],
  natal_luz: ["11", "12", "01"],
  dezembro: ["12"],
  natal: ["12"],
  reveillon: ["12", "01"],
  alta_temporada: ["12", "01", "02", "07"],
  baixa_temporada: ["03", "04", "05", "06", "08", "09", "10", "11"],
  feriados: ["01", "02", "03", "04", "05", "06", "09", "10", "11", "12"],
};

const PORTUGUESE_MONTHS: Record<string, string> = {
  jan: "01",
  janeiro: "01",
  fev: "02",
  fevereiro: "02",
  mar: "03",
  marco: "03",
  abr: "04",
  abril: "04",
  mai: "05",
  maio: "05",
  jun: "06",
  junho: "06",
  jul: "07",
  julho: "07",
  ago: "08",
  agosto: "08",
  set: "09",
  setembro: "09",
  out: "10",
  outubro: "10",
  nov: "11",
  novembro: "11",
  dez: "12",
  dezembro: "12",
};

// ============================================================================
// UTILITARIOS DETERMINISTICOS DE NORMALIZACAO
// ============================================================================

export function normalizeOpportunityText(raw?: string | null): string {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const GENERIC_REGION_WORDS = new Set([
  "brasil",
  "brazil",
  "nordeste",
  "sul",
  "sudeste",
  "centro oeste",
  "norte",
  "serra",
  "praia",
  "resort",
  "resorts",
  "nacional",
  "internacional",
  "exterior",
  "pacote",
  "viagem",
  "aereo",
  "hotel",
  "hoteis",
  "transfer",
  "caribe",
  "europa",
  "eua",
  "usa",
]);

function extractIataTokens(raw?: string | null): string[] {
  const source = String(raw || "");
  // Reconhece apenas codigos IATA ja informados em caixa alta ou entre parenteses ex: "Maceio (MCZ)" / "(poa)"
  const matches = [
    ...(source.match(/\b[A-Z]{3}\b/g) || []),
    ...(source.match(/\(([a-zA-Z]{3})\)/g) || []).map((m) => m.slice(1, 4).toUpperCase()),
  ];
  if (matches.length === 0) return [];
  const valid: string[] = [];
  for (const code of matches) {
    if (
      lookupKnownAirport(code) ||
      DESTINATION_CLUSTER_RULES.some((r) => r.ownIatas.includes(code) || r.gatewayIatas.includes(code))
    ) {
      if (!valid.includes(code)) valid.push(code);
    }
  }
  return valid;
}

export function resolveCanonicalDestinationTag(
  input: string | Partial<StructuredDestinationTag>
): StructuredDestinationTag | null {
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const norm = normalizeOpportunityText(trimmed);
    if (!norm) return null;

    const iatasFromString = extractIataTokens(trimmed);
    const exactIata = iatasFromString[0] || null;
    const airportRec = exactIata ? lookupKnownAirport(exactIata) : undefined;

    const clusterRec =
      DESTINATION_CLUSTER_RULES.find((rule) => rule.aliases.some((alias) => alias === norm)) ||
      DESTINATION_CLUSTER_RULES.find((rule) =>
        rule.aliases.some((alias) => {
          if (alias.length < 4) return false;
          const idx = norm.indexOf(alias);
          if (idx === -1) return false;
          const beforeOk = idx === 0 || !/[a-z0-9]/.test(norm[idx - 1]);
          const afterPos = idx + alias.length;
          const afterOk = afterPos === norm.length || !/[a-z0-9]/.test(norm[afterPos]);
          return beforeOk && afterOk;
        })
      ) ||
      (exactIata ? DESTINATION_CLUSTER_RULES.find((rule) => rule.ownIatas.includes(exactIata)) : undefined);

    const catalogRec =
      CANONICAL_DESTINATIONS.find((d) => {
        const dName = normalizeOpportunityText(d.name);
        const dCity = normalizeOpportunityText(d.city);
        return dName === norm || dCity === norm || (exactIata !== null && d.iata === exactIata);
      }) ||
      CANONICAL_DESTINATIONS.find((d) => {
        const dName = normalizeOpportunityText(d.name);
        const dCity = normalizeOpportunityText(d.city);
        if (clusterRec && !clusterRec.aliases.includes(dCity) && !clusterRec.aliases.includes(dName)) {
          return false;
        }
        return (
          (dCity.length >= 4 && new RegExp(`(?:^|\\b)${dCity}(?:\\b|$)`).test(norm)) ||
          (dName.length >= 5 && new RegExp(`(?:^|\\b)${dName}(?:\\b|$)`).test(norm))
        );
      });

    const aliases = new Set<string>([norm]);
    if (catalogRec) {
      aliases.add(normalizeOpportunityText(catalogRec.name));
      aliases.add(normalizeOpportunityText(catalogRec.city));
    }
    if (clusterRec) {
      for (const a of clusterRec.aliases) aliases.add(a);
    }
    if (airportRec) {
      aliases.add(normalizeOpportunityText(airportRec.city));
    }

    const cleanLabel =
      trimmed.length <= 4 && airportRec
        ? `${airportRec.city} (${airportRec.iata_code})`
        : trimmed;

    const ownIataFromClusterOrCatalog =
      clusterRec
        ? clusterRec.ownIatas[0] || null
        : catalogRec?.iata || null;

    return {
      label: cleanLabel,
      normalized: norm,
      iata: exactIata || ownIataFromClusterOrCatalog,
      gatewayIatas: Array.from(
        new Set([
          ...(clusterRec?.gatewayIatas || []),
          ...(catalogRec?.iata ? [catalogRec.iata] : []),
          ...(exactIata ? [exactIata] : []),
        ])
      ),
      city: catalogRec?.city || airportRec?.city || trimmed,
      state: catalogRec?.state || clusterRec?.state || airportRec?.state_province || null,
      country: catalogRec?.country || clusterRec?.country || airportRec?.country || null,
      destinationId: catalogRec?.id || null,
      aliases: Array.from(aliases).filter(Boolean),
      source: catalogRec ? "canonical" : airportRec ? "airports_global" : "free_text",
    };
  }

  const label = String(input.label || input.city || input.iata || "").trim();
  const norm = normalizeOpportunityText(input.normalized || label);
  if (!label && !norm) return null;

  const baseFromLabel = resolveCanonicalDestinationTag(label || norm);
  return {
    id: input.id,
    label: label || baseFromLabel?.label || norm,
    normalized: norm || baseFromLabel?.normalized || "",
    iata: input.iata || baseFromLabel?.iata || null,
    gatewayIatas: Array.from(
      new Set([...(input.gatewayIatas || []), ...(baseFromLabel?.gatewayIatas || []), ...(input.iata ? [input.iata] : [])])
    ),
    city: input.city || baseFromLabel?.city || label,
    state: input.state || baseFromLabel?.state || null,
    country: input.country || baseFromLabel?.country || null,
    destinationId: input.destinationId || baseFromLabel?.destinationId || null,
    cityIbge: input.cityIbge || null,
    aliases: Array.from(new Set([...(input.aliases || []).map((a) => normalizeOpportunityText(a)), ...(baseFromLabel?.aliases || []), norm])).filter(
      Boolean
    ),
    source: input.source || baseFromLabel?.source || "free_text",
  };
}

export function normalizeDestinationTagList(
  tags?: Array<string | Partial<StructuredDestinationTag>> | null,
  fallbackString?: string | null
): StructuredDestinationTag[] {
  const result: StructuredDestinationTag[] = [];
  const seen = new Set<string>();

  const pushRaw = (item: string | Partial<StructuredDestinationTag>) => {
    const resolved = resolveCanonicalDestinationTag(item);
    if (!resolved || !resolved.normalized) return;
    const key = `${resolved.normalized}::${resolved.iata || ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(resolved);
  };

  if (Array.isArray(tags)) {
    for (const item of tags) {
      if (typeof item === "string") {
        // Divide cadeias separadas por barra/virgula quando vierem de texto livre legado
        const parts = item.includes(",") || item.includes(";") ? item.split(/[,;]+/) : [item];
        for (const part of parts) pushRaw(part);
      } else if (item && typeof item === "object") {
        pushRaw(item);
      }
    }
  }

  if (result.length === 0 && fallbackString && fallbackString.trim()) {
    const parts = fallbackString.split(/[,;]+|\s+ou\s+/i);
    for (const part of parts) {
      pushRaw(part);
    }
  }

  return result;
}

function getClusterForTag(tag: StructuredDestinationTag): DestinationClusterRule | null {
  const norm = tag.normalized;
  const iata = tag.iata?.toUpperCase() || null;

  // 1. Prioriza igualdade exata de alias para evitar que "sao paulo" colida com "morro de sao paulo"
  for (const rule of DESTINATION_CLUSTER_RULES) {
    if (rule.aliases.some((alias) => norm === alias) || tag.aliases?.some((a) => rule.aliases.includes(a))) {
      return rule;
    }
  }

  // 2. Correspondencia por subfrase inteira delimitada por fronteira de palavra (nunca alias.includes(norm))
  let bestRule: DestinationClusterRule | null = null;
  let bestAliasLen = 0;
  for (const rule of DESTINATION_CLUSTER_RULES) {
    for (const alias of rule.aliases) {
      if (alias.length < 4) continue;
      const idx = norm.indexOf(alias);
      if (idx === -1) continue;
      const beforeOk = idx === 0 || !/[a-z0-9]/.test(norm[idx - 1]);
      const afterPos = idx + alias.length;
      const afterOk = afterPos === norm.length || !/[a-z0-9]/.test(norm[afterPos]);
      if (beforeOk && afterOk && alias.length > bestAliasLen) {
        bestRule = rule;
        bestAliasLen = alias.length;
      }
    }
  }
  if (bestRule) return bestRule;

  for (const rule of DESTINATION_CLUSTER_RULES) {
    if (iata && rule.ownIatas.includes(iata)) {
      return rule;
    }
  }
  return null;
}

function extractCoreCityTokens(tag: StructuredDestinationTag): string[] {
  const sources = [tag.label, tag.normalized, ...(tag.aliases || []), tag.city];
  const tokens = new Set<string>();
  for (const rawSource of sources) {
    if (!rawSource) continue;
    // Remove apenas sufixos IATA explicito entre parenteses ou siglas em caixa alta (ex: "(BPS)", "POA") preservando "mel" em "ilha do mel"
    const withoutExplicitIata = String(rawSource)
      .replace(/\(([a-zA-Z]{3})\)/g, (_, code: string) =>
        lookupKnownAirport(code.toUpperCase()) ? "" : `(${code})`
      )
      .replace(/\b([A-Z]{3})\b/g, (word: string) => (lookupKnownAirport(word) ? "" : word));
    const cleaned = normalizeOpportunityText(withoutExplicitIata);
    if (cleaned.length >= 4 && !GENERIC_REGION_WORDS.has(cleaned)) {
      tokens.add(cleaned);
    }
    for (const seg of cleaned.split("/")) {
      for (const piece of seg.split(" - ")) {
        const p = piece.trim();
        if (p.length >= 4 && !GENERIC_REGION_WORDS.has(p)) {
          tokens.add(p);
        }
      }
    }
  }
  return Array.from(tokens);
}

// ============================================================================
// NORMALIZACAO DE QUARTOS, IDADES (0-17) E PERIODOS
// ============================================================================

export function parseChildrenAgesFromLegacy(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n) && n >= 0 && n <= 17)
      .map((n) => Math.floor(n));
  }
  if (typeof raw === "string" && raw.trim()) {
    const nums = raw.match(/\b\d{1,2}\b/g);
    if (!nums) return [];
    return nums
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n) && n >= 0 && n <= 17);
  }
  return [];
}

export function normalizeRoomsFromLeadOrLegacy(params: {
  rooms?: unknown;
  adultsCount?: number | null;
  childrenCount?: number | null;
  childrenAges?: unknown;
  roomsCount?: number | null;
}): {
  rooms: StructuredRoomOccupancy[];
  adultsCount: number;
  childrenCount: number;
  childrenAges: number[];
} {
  if (Array.isArray(params.rooms) && params.rooms.length > 0) {
    const normalizedRooms: StructuredRoomOccupancy[] = [];
    for (let idx = 0; idx < params.rooms.length; idx++) {
      const rawRoom = params.rooms[idx] as Record<string, unknown>;
      if (!rawRoom || typeof rawRoom !== "object") continue;
      const adults = Math.max(0, Math.min(10, Math.floor(Number(rawRoom.adultsCount ?? rawRoom.adults ?? 2) || 0)));
      const parsedAges = parseChildrenAgesFromLegacy(rawRoom.childrenAges ?? rawRoom.children_ages);
      const declaredChildren = Math.max(
        parsedAges.length,
        Math.min(6, Math.max(0, Math.floor(Number(rawRoom.childrenCount ?? rawRoom.children ?? 0) || 0)))
      );
      const alignedAges = [...parsedAges.slice(0, declaredChildren)];
      while (alignedAges.length < declaredChildren) {
        alignedAges.push(6);
      }
      normalizedRooms.push({
        roomNumber: Number(rawRoom.roomNumber || idx + 1),
        roomLabel: typeof rawRoom.roomLabel === "string" ? rawRoom.roomLabel : `Quarto ${idx + 1}`,
        adultsCount: Math.max(1, adults),
        childrenCount: declaredChildren,
        childrenAges: alignedAges,
        mealPlanPreference: typeof rawRoom.mealPlanPreference === "string" ? rawRoom.mealPlanPreference : null,
      });
    }
    if (normalizedRooms.length > 0) {
      const adultsCount = normalizedRooms.reduce((sum, r) => sum + r.adultsCount, 0);
      const childrenAges = normalizedRooms.flatMap((r) => r.childrenAges);
      return {
        rooms: normalizedRooms,
        adultsCount,
        childrenCount: childrenAges.length,
        childrenAges,
      };
    }
  }

  const adultsTotal = Math.max(1, Math.floor(Number(params.adultsCount ?? 2) || 2));
  const legacyAges = parseChildrenAgesFromLegacy(params.childrenAges);
  const childrenTotal = Math.max(legacyAges.length, Math.max(0, Math.floor(Number(params.childrenCount ?? 0) || 0)));
  const alignedLegacyAges = [...legacyAges.slice(0, childrenTotal)];
  while (alignedLegacyAges.length < childrenTotal) {
    alignedLegacyAges.push(6);
  }

  const count = Math.max(1, Math.min(8, Math.floor(Number(params.roomsCount ?? 1) || 1)));
  if (count === 1) {
    return {
      rooms: [
        {
          roomNumber: 1,
          roomLabel: "Quarto 1",
          adultsCount: adultsTotal,
          childrenCount: childrenTotal,
          childrenAges: alignedLegacyAges,
        },
      ],
      adultsCount: adultsTotal,
      childrenCount: childrenTotal,
      childrenAges: alignedLegacyAges,
    };
  }

  const rooms: StructuredRoomOccupancy[] = [];
  let remainingAdults = adultsTotal;
  let ageCursor = 0;
  for (let i = 0; i < count; i++) {
    const roomsLeft = count - i;
    const adultsForRoom = i === count - 1 ? Math.max(1, remainingAdults) : Math.max(1, Math.ceil(remainingAdults / roomsLeft));
    remainingAdults = Math.max(0, remainingAdults - adultsForRoom);
    const childrenForRoom =
      i === count - 1
        ? alignedLegacyAges.slice(ageCursor)
        : alignedLegacyAges.slice(ageCursor, ageCursor + Math.floor(childrenTotal / count));
    ageCursor += childrenForRoom.length;
    rooms.push({
      roomNumber: i + 1,
      roomLabel: `Quarto ${i + 1}`,
      adultsCount: adultsForRoom,
      childrenCount: childrenForRoom.length,
      childrenAges: childrenForRoom,
    });
  }

  return {
    rooms,
    adultsCount: adultsTotal,
    childrenCount: childrenTotal,
    childrenAges: alignedLegacyAges,
  };
}

function parsePtPeriodHints(raw?: string | null, referenceYear = new Date().getUTCFullYear()): {
  targetMonths: string[];
  seasonTags: string[];
  flexibleAnytime: boolean;
} {
  const norm = normalizeOpportunityText(raw);
  if (!norm) return { targetMonths: [], seasonTags: [], flexibleAnytime: false };

  const flexibleAnytime =
    norm.includes("qualquer data") ||
    norm.includes("qualquer periodo") ||
    norm.includes("qualquer epoca") ||
    norm.includes("totalmente flexivel") ||
    norm.includes("sem preferencia de data") ||
    norm === "flexivel";

  const seasonTags: string[] = [];
  if (norm.includes("reveillon") || norm.includes("ano novo") || norm.includes("virada") || norm.includes("fim de ano")) {
    seasonTags.push("reveillon");
  }
  if (norm.includes("carnaval")) seasonTags.push("carnaval");
  if (norm.includes("pascoa")) seasonTags.push("pascoa");
  if (norm.includes("semana santa")) seasonTags.push("semana_santa");
  if (norm.includes("natal luz")) seasonTags.push("natal_luz");
  if (norm.includes("ferias de julho") || norm.includes("ferias julho")) seasonTags.push("ferias_julho");
  if (norm.includes("verao")) seasonTags.push("verao");
  if (norm.includes("inverno")) seasonTags.push("inverno");
  if (norm.includes("baixa temporada")) seasonTags.push("baixa_temporada");
  if (norm.includes("alta temporada")) seasonTags.push("alta_temporada");
  if (norm.includes("feriado") || norm.includes("feriadao")) seasonTags.push("feriados");

  const explicitYearMatch = norm.match(/\b(202\d|203\d)\b/);
  const nowUtc = new Date();
  const currentMonthUtc = nowUtc.getUTCMonth() + 1;

  const targetMonths = new Set<string>();
  const ymMatches = norm.match(/\b(202\d|203\d)[-/](0?[1-9]|1[0-2])\b/g);
  if (ymMatches) {
    for (const ym of ymMatches) {
      const [y, m] = ym.split(/[-/]/);
      targetMonths.add(`${y}-${m.padStart(2, "0")}`);
    }
  }

  for (const [monthWord, monthNum] of Object.entries(PORTUGUESE_MONTHS)) {
    const regex = new RegExp(`\\b${monthWord}\\b`, "i");
    if (regex.test(norm)) {
      const targetYear = explicitYearMatch
        ? Number(explicitYearMatch[1])
        : Number(monthNum) < currentMonthUtc
          ? referenceYear + 1
          : referenceYear;
      targetMonths.add(`${targetYear}-${monthNum}`);
    }
  }

  return {
    targetMonths: Array.from(targetMonths),
    seasonTags: Array.from(new Set(seasonTags)),
    flexibleAnytime,
  };
}

export function normalizePeriodSpec(params: {
  periodSpec?: Partial<StructuredPeriodSpec> | null;
  startDate?: string | null;
  endDate?: string | null;
  targetMonths?: string[] | null;
  seasonTags?: string[] | null;
  flexibilityDays?: number | null;
  dateFlexibilityMode?: string | null;
  interestPeriodText?: string | null;
  dateFlexibleFlag?: boolean | null;
  referenceYear?: number;
}): StructuredPeriodSpec {
  const ps = params.periodSpec || {};
  const startDate = (ps.startDate || params.startDate || null)?.slice(0, 10) || null;
  const endDate = (ps.endDate || params.endDate || null)?.slice(0, 10) || null;
  const parsedText = parsePtPeriodHints(params.interestPeriodText, params.referenceYear);

  const targetMonths = Array.from(
    new Set([
      ...(Array.isArray(ps.targetMonths) ? ps.targetMonths : []),
      ...(Array.isArray(params.targetMonths) ? params.targetMonths : []),
      ...parsedText.targetMonths,
    ])
  ).filter((m) => /^\d{4}-\d{2}$/.test(m));

  const seasonTags = Array.from(
    new Set([
      ...(Array.isArray(ps.seasonTags) ? ps.seasonTags : []),
      ...(Array.isArray(params.seasonTags) ? params.seasonTags : []),
      ...parsedText.seasonTags,
    ])
  );

  const explicitAnytime =
    Boolean(ps.flexibleAnytime) ||
    params.dateFlexibilityMode === "flexible_anytime" ||
    parsedText.flexibleAnytime;

  // Nota: `dateFlexibleFlag === true` com mes/data continua usando a janela definida;
  // so vira `flexible_anytime` quando explicitamente sem janela nem mes, ou mode === 'flexible_anytime'.
  const hasDates = Boolean(startDate);
  const hasMonths = targetMonths.length > 0;
  const hasSeasons = seasonTags.length > 0;

  let mode: PeriodFlexibilityMode = "unspecified";
  if (ps.mode && ps.mode !== "unspecified") {
    mode = ps.mode;
  } else if (hasDates) {
    mode = (params.flexibilityDays ?? ps.flexibilityDays ?? 0) > 0 || params.dateFlexibleFlag ? "window" : "exact";
  } else if (hasMonths) {
    mode = "month_list";
  } else if (hasSeasons) {
    mode = "season_tag";
  } else if (explicitAnytime) {
    mode = "flexible_anytime";
  }

  const flexDaysRaw = ps.flexibilityDays ?? params.flexibilityDays;
  const flexibilityDays =
    typeof flexDaysRaw === "number" && Number.isFinite(flexDaysRaw)
      ? Math.max(0, Math.min(60, Math.floor(flexDaysRaw)))
      : params.dateFlexibleFlag
        ? 7
        : hasDates
          ? 3
          : 0;

  return {
    mode,
    startDate,
    endDate,
    flexibilityDays,
    targetMonths,
    seasonTags,
    flexibleAnytime: explicitAnytime,
    displayLabel:
      ps.displayLabel ||
      params.interestPeriodText ||
      (startDate
        ? `${startDate}${endDate ? ` a ${endDate}` : ""}`
        : targetMonths.length > 0
          ? targetMonths.join(", ")
          : seasonTags.length > 0
            ? seasonTags.join(", ")
            : explicitAnytime
              ? "Datas flexiveis"
              : undefined),
  };
}

// ============================================================================
// SIMULADOR TARIFARIO DE CRIANCAS (0-1 COLO, 2-11 AEREO+TRANSFER, 12-17 ADULTO)
// ============================================================================

export function classifyChildAgeBand(age: number): {
  band: ChildPricingAgeBand;
  bandLabel: string;
} {
  const safeAge = Math.max(0, Math.min(17, Math.floor(age)));
  if (safeAge <= 1) {
    return { band: "infant_0_1", bandLabel: `${safeAge}a (Colo / Infante)` };
  }
  if (safeAge <= 11) {
    return { band: "chd_2_11", bandLabel: `${safeAge}a (CHD Aéreo + Transfer)` };
  }
  return { band: "teen_adult_12_17", bandLabel: `${safeAge}a (Tarifa Adulto 12-17)` };
}

function getAirAndTransferSharePct(offer: CanonicalSupplyOffer): number {
  const pType = normalizeOpportunityText(offer.productType || offer.title);
  if (pType.includes("hotel only") || pType.includes("somente hotel") || pType.includes("hospedagem")) {
    return 0;
  }
  if (pType.includes("aereo only") || pType.includes("somente aereo") || pType.includes("passagem")) {
    return 100;
  }
  if (pType.includes("cruzeiro")) {
    return 35;
  }
  // Pacote aereo + hotel + transfer: fracao calibrada padrao (aprox. 47% aereo + 8% transfer = 55%)
  return 55;
}

export function simulateFamilyPricingFromAdultBase(
  offer: CanonicalSupplyOffer,
  demandAdults: number,
  demandChildrenAges: number[]
): ChildSimulationResult {
  const safeDemandAdults = Math.max(1, Math.floor(demandAdults || 1));
  const safeQuotedAdults = Math.max(1, Math.floor(offer.quotedAdultsCount || 1));
  const safeQuotedChildren = Math.max(0, Math.floor(offer.quotedChildrenCount || 0));
  const sortedAges = [...demandChildrenAges]
    .map((n) => Math.max(0, Math.min(17, Math.floor(n))))
    .sort((a, b) => a - b);

  // Calcula base tarifaria unitaria por adulto a partir da oferta
  const airSharePct = getAirAndTransferSharePct(offer);
  let basePerAdultCents = 0;

  if (offer.adultUnitPriceCents && offer.adultUnitPriceCents > 0) {
    basePerAdultCents = Math.round(offer.adultUnitPriceCents);
  } else if (offer.totalPriceCents > 0) {
    if (safeQuotedChildren === 0) {
      basePerAdultCents = Math.round(offer.totalPriceCents / safeQuotedAdults);
    } else if (offer.explicitChildUnitPriceCents && offer.explicitChildUnitPriceCents > 0) {
      const remaining = Math.max(0, offer.totalPriceCents - safeQuotedChildren * offer.explicitChildUnitPriceCents);
      basePerAdultCents = Math.round(remaining / safeQuotedAdults);
    } else {
      const childWeight = Math.max(0.15, airSharePct / 100);
      basePerAdultCents = Math.round(offer.totalPriceCents / (safeQuotedAdults + safeQuotedChildren * childWeight));
    }
  }

  // Calcula valor de referencia Aereo + Transfer por adulto para CHD (2-11 anos)
  const hasItemizedAirOrTransfer =
    (typeof offer.airfarePerAdultCents === "number" && offer.airfarePerAdultCents > 0) ||
    (typeof offer.transferPerAdultCents === "number" && offer.transferPerAdultCents > 0);

  let airPlusTransferPerChdCents = 0;
  let simulationSource: ChildSimulationResult["simulationSource"] = "not_needed";

  if (hasItemizedAirOrTransfer) {
    const airCents = Math.max(0, Math.round(offer.airfarePerAdultCents || 0));
    const transferCents = Math.max(
      0,
      Math.round(offer.transferPerAdultCents || (airCents > 0 ? Math.min(28000, airCents * 0.1) : 0))
    );
    airPlusTransferPerChdCents = airCents + transferCents;
    simulationSource = "itemized_air_transfer";
  } else {
    airPlusTransferPerChdCents = Math.round((basePerAdultCents * airSharePct) / 100);
    simulationSource = "calibrated_bundle_share";
  }

  // Se a oferta foi cotada para a composicao EXATA da demanda (inclusive faixas de idade compativeis), nao precisa simular acrescimo
  const sortedOfferChildAges = [...offer.quotedChildrenAges]
    .map((n) => Math.max(0, Math.min(17, Math.floor(n))))
    .sort((a, b) => a - b);
  const sameAdults = safeQuotedAdults === safeDemandAdults;
  const sameChildCount = safeQuotedChildren === sortedAges.length;
  const demandHasTeen = sortedAges.some((a) => a >= 12);
  const offerHasNoTeensHiddenAsChild =
    sortedOfferChildAges.length === 0
      ? !(safeQuotedChildren > 0 && demandHasTeen)
      : sortedAges.every((age, idx) => {
          const offerAge = sortedOfferChildAges[idx];
          if (offerAge === undefined) return age < 12;
          return classifyChildAgeBand(age).band === classifyChildAgeBand(offerAge).band;
        });

  if (sameAdults && sameChildCount && offerHasNoTeensHiddenAsChild) {
    const infantsCount = sortedAges.filter((a) => a <= 1).length;
    const chd2to11Count = sortedAges.filter((a) => a >= 2 && a <= 11).length;
    const teens12to17Count = sortedAges.filter((a) => a >= 12).length;
    return {
      applied: false,
      requiresChildRequote: false,
      reasonPt:
        sortedAges.length > 0
          ? "Composição de adultos e crianças compatível com a cotação base."
          : "Composição somente adultos idêntica à cotação base.",
      baseOfferAdultsCount: safeQuotedAdults,
      basePerAdultCents,
      simulatedAirPlusTransferPerChildCents: airPlusTransferPerChdCents,
      simulationSource: sortedAges.length > 0 ? "explicit_child_rate" : "not_needed",
      simulatedAirSharePct: airSharePct,
      adultsSubtotalCents: offer.totalPriceCents > 0 ? offer.totalPriceCents : safeDemandAdults * basePerAdultCents,
      childrenSubtotalCents: 0,
      simulatedTotalCents: offer.totalPriceCents > 0 ? offer.totalPriceCents : safeDemandAdults * basePerAdultCents,
      deltaVsOfferTotalCents: 0,
      infantsCount,
      chd2to11Count,
      teens12to17Count,
      perChildBreakdown: sortedAges.map((age) => {
        const meta = classifyChildAgeBand(age);
        return {
          age,
          band: meta.band,
          bandLabel: meta.bandLabel,
          estimatedCostCents: 0,
          pricingBasis: "exact_child_rate",
        };
      }),
    };
  }

  let infantsCount = 0;
  let chd2to11Count = 0;
  let teens12to17Count = 0;
  let adultsSubtotalCents = safeDemandAdults * basePerAdultCents;
  let childrenSubtotalCents = 0;
  let usedExplicitChildRate = false;
  let requiresChildRequote = false;
  const perChildBreakdown: ChildPricingBandBreakdown[] = [];

  for (const age of sortedAges) {
    const meta = classifyChildAgeBand(age);
    if (meta.band === "infant_0_1") {
      infantsCount++;
      // Colo ate 1a 11m: taxa minima (~10% da parcela aerea ou teto modico R$ 150)
      const baseAir = hasItemizedAirOrTransfer && offer.airfarePerAdultCents
        ? offer.airfarePerAdultCents
        : Math.round((basePerAdultCents * Math.max(0, airSharePct - 8)) / 100);
      const infantFee = airSharePct === 0 ? 0 : Math.min(25000, Math.round(baseAir * 0.1));
      childrenSubtotalCents += infantFee;
      if (safeQuotedChildren === 0) requiresChildRequote = true;
      perChildBreakdown.push({
        age,
        band: meta.band,
        bandLabel: meta.bandLabel,
        estimatedCostCents: infantFee,
        pricingBasis: "infant_minimal_fee",
      });
    } else if (meta.band === "chd_2_11") {
      chd2to11Count++;
      const hasExplicitRateForAge =
        typeof offer.explicitChildUnitPriceCents === "number" &&
        offer.explicitChildUnitPriceCents > 0 &&
        (offer.explicitChildMaxAge == null || age <= offer.explicitChildMaxAge);

      if (hasExplicitRateForAge) {
        usedExplicitChildRate = true;
        const cost = Math.round(offer.explicitChildUnitPriceCents!);
        childrenSubtotalCents += cost;
        perChildBreakdown.push({
          age,
          band: meta.band,
          bandLabel: meta.bandLabel,
          estimatedCostCents: cost,
          pricingBasis: "exact_child_rate",
        });
      } else {
        requiresChildRequote = true;
        const cost = airPlusTransferPerChdCents;
        childrenSubtotalCents += cost;
        perChildBreakdown.push({
          age,
          band: meta.band,
          bandLabel: meta.bandLabel,
          estimatedCostCents: cost,
          pricingBasis: hasItemizedAirOrTransfer ? "exact_air_plus_transfer" : "estimated_air_plus_transfer",
        });
      }
    } else {
      teens12to17Count++;
      requiresChildRequote = true;
      adultsSubtotalCents += basePerAdultCents;
      perChildBreakdown.push({
        age,
        band: meta.band,
        bandLabel: meta.bandLabel,
        estimatedCostCents: basePerAdultCents,
        pricingBasis: "adult_full_tariff",
      });
    }
  }

  const simulatedTotalCents = adultsSubtotalCents + childrenSubtotalCents;
  const deltaVsOfferTotalCents = simulatedTotalCents - Math.max(0, offer.totalPriceCents || 0);

  if (usedExplicitChildRate && !requiresChildRequote) {
    simulationSource = "explicit_child_rate";
  }

  const parts: string[] = [];
  if (chd2to11Count > 0) {
    parts.push(
      hasItemizedAirOrTransfer
        ? `${chd2to11Count} CHD (2-11a) simulada via aéreo + transfer exatos`
        : `${chd2to11Count} CHD (2-11a) simulada como ~${airSharePct}% da tarifa adulto (aéreo + transfer)`
    );
  }
  if (teens12to17Count > 0) {
    parts.push(`${teens12to17Count} adolescente(s) (12-17a) em tarifa adulto integral`);
  }
  if (infantsCount > 0) {
    parts.push(`${infantsCount} infante(s) (0-1a) com taxa mínima de colo`);
  }
  if (safeDemandAdults !== safeQuotedAdults) {
    parts.push(`ajuste de ${safeQuotedAdults} para ${safeDemandAdults} adulto(s)`);
  }

  return {
    applied: true,
    requiresChildRequote,
    reasonPt: parts.join("; ") || "Simulação tarifária aplicada para o grupo do lead.",
    baseOfferAdultsCount: safeQuotedAdults,
    basePerAdultCents,
    simulatedAirPlusTransferPerChildCents: airPlusTransferPerChdCents,
    simulationSource,
    simulatedAirSharePct: airSharePct,
    adultsSubtotalCents,
    childrenSubtotalCents,
    simulatedTotalCents,
    deltaVsOfferTotalCents,
    infantsCount,
    chd2to11Count,
    teens12to17Count,
    perChildBreakdown,
  };
}

// ============================================================================
// COMPARATIVO HISTORICO DE PRECOS (PASSAGEM/PACOTE VALE A PENA?)
// ============================================================================

export function evaluateHistoricalAdvantage(
  offer: CanonicalSupplyOffer,
  simulation: ChildSimulationResult,
  observations: HistoricalPriceObservationInput[],
  matchedCluster?: DestinationClusterRule | null
): HistoricalPriceCheck {
  const comparedUnitCents = simulation.basePerAdultCents > 0
    ? simulation.basePerAdultCents
    : offer.quotedAdultsCount > 0 && offer.totalPriceCents > 0
      ? Math.round(offer.totalPriceCents / offer.quotedAdultsCount)
      : 0;

  if (!comparedUnitCents || !Array.isArray(observations) || observations.length === 0) {
    return {
      sampleCount: 0,
      historicalMedianCents: null,
      historicalMinCents: null,
      historicalMaxCents: null,
      comparedUnitCents,
      historicalSavingsPct: null,
      verdict: "insufficient_history",
      verdictLabelPt: "Sem histórico suficiente para comparativo",
    };
  }

  const offerTag = resolveCanonicalDestinationTag(offer.destinationCity);
  const offerCoreTokens = offerTag ? extractCoreCityTokens(offerTag) : [];

  const relevantUnitPrices: number[] = [];
  for (const obs of observations) {
    if (obs.id && offer.id && obs.id === offer.id) continue;
    if (!obs.totalCents || obs.totalCents <= 0) continue;
    const obsNorm = normalizeOpportunityText(obs.destination);
    if (!obsNorm || obsNorm.length < 4) continue;

    const obsCluster = DESTINATION_CLUSTER_RULES.find((r) =>
      r.aliases.some((a) => obsNorm.includes(a) || a.includes(obsNorm))
    );
    if (matchedCluster && obsCluster && matchedCluster.slug !== obsCluster.slug) continue;

    const sameCluster =
      (matchedCluster && obsCluster && matchedCluster.slug === obsCluster.slug) ||
      offerCoreTokens.some((tok) => tok.length >= 4 && (obsNorm.includes(tok) || tok.includes(obsNorm)));

    if (!sameCluster) continue;

    const obsAdults = Math.max(1, Math.floor(obs.adultsCount || 2));
    const obsChildren = Math.max(0, Math.floor(obs.childrenCount || 0));
    const unitCents = Math.round(obs.totalCents / (obsAdults + obsChildren * 0.55));
    if (unitCents > 0) relevantUnitPrices.push(unitCents);
  }

  if (relevantUnitPrices.length < 2) {
    return {
      sampleCount: relevantUnitPrices.length,
      historicalMedianCents: relevantUnitPrices[0] ?? null,
      historicalMinCents: relevantUnitPrices[0] ?? null,
      historicalMaxCents: relevantUnitPrices[0] ?? null,
      comparedUnitCents,
      historicalSavingsPct: null,
      verdict: "insufficient_history",
      verdictLabelPt: "Histórico insuficiente (< 2 cotações no destino)",
    };
  }

  const sorted = [...relevantUnitPrices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianCents =
    sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  const minCents = sorted[0];
  const maxCents = sorted[sorted.length - 1];

  const savingsPct =
    medianCents > 0 ? Math.round(((medianCents - comparedUnitCents) / medianCents) * 1000) / 10 : 0;

  let verdict: HistoricalPriceCheck["verdict"] = "fair_price";
  let verdictLabelPt = "Na média das cotações anteriores";

  if (savingsPct >= 8) {
    verdict = "great_deal";
    verdictLabelPt = `${savingsPct.toFixed(0)}% mais barata que a mediana histórica (${sorted.length} cotações)`;
  } else if (savingsPct <= -10) {
    verdict = "above_market";
    verdictLabelPt = `${Math.abs(savingsPct).toFixed(0)}% acima da mediana histórica (${sorted.length} cotações)`;
  } else {
    verdict = "fair_price";
    verdictLabelPt = `Alinhada ao histórico do destino (${sorted.length} cotações)`;
  }

  return {
    sampleCount: sorted.length,
    historicalMedianCents: medianCents,
    historicalMinCents: minCents,
    historicalMaxCents: maxCents,
    comparedUnitCents,
    historicalSavingsPct: savingsPct,
    verdict,
    verdictLabelPt,
  };
}

// ============================================================================
// PORTÕES RIGOROSOS DE MATCHING (DESTINO, PERIODO, OCUPACAO, ORCAMENTO, DEDUP)
// ============================================================================

function evaluateDestinationGate(
  offer: CanonicalSupplyOffer,
  demand: CanonicalDemandLead
): {
  passed: boolean;
  score: number;
  rejectionCode: OpportunityRejectionCode;
  rejectionReasonPt: string | null;
  matchedLabel: string | null;
  matchedViaGateway: boolean;
  matchedCluster: DestinationClusterRule | null;
  reasonText: string | null;
} {
  const offerTags = normalizeDestinationTagList(offer.destinationTags, offer.destinationCity);
  if (offer.destinationIata) {
    const iataUpper = offer.destinationIata.toUpperCase();
    for (const tag of offerTags) {
      if (!tag.iata) tag.iata = iataUpper;
      if (!tag.gatewayIatas?.includes(iataUpper)) {
        tag.gatewayIatas = [...(tag.gatewayIatas || []), iataUpper];
      }
    }
  }

  if (offerTags.length === 0) {
    return {
      passed: false,
      score: 0,
      rejectionCode: "MISSING_OFFER_DESTINATION",
      rejectionReasonPt: "A oferta não possui destino identificável.",
      matchedLabel: null,
      matchedViaGateway: false,
      matchedCluster: null,
      reasonText: null,
    };
  }

  const demandTags = normalizeDestinationTagList(demand.destinations);
  if (demandTags.length === 0) {
    return {
      passed: false,
      score: 0,
      rejectionCode: "MISSING_DEMAND_DESTINATION",
      rejectionReasonPt: "O lead/interesse não possui destinos cadastrados.",
      matchedLabel: null,
      matchedViaGateway: false,
      matchedCluster: null,
      reasonText: null,
    };
  }

  const isAirOnlyOffer =
    normalizeOpportunityText(offer.productType).includes("aereo") &&
    !normalizeOpportunityText(offer.productType).includes("hotel");

  for (const dTag of demandTags) {
    const dCluster = getClusterForTag(dTag);
    const dTokens = extractCoreCityTokens(dTag);
    const dIata = dTag.iata?.toUpperCase() || null;

    for (const oTag of offerTags) {
      const oCluster = getClusterForTag(oTag);
      const oTokens = extractCoreCityTokens(oTag);
      const oIata = oTag.iata?.toUpperCase() || offer.destinationIata?.toUpperCase() || null;

      // 1. Mesmo cluster canonico (ex: Canela <-> Gramado, Muro Alto <-> Porto de Galinhas)
      if (dCluster && oCluster && dCluster.slug === oCluster.slug) {
        return {
          passed: true,
          score: 35,
          rejectionCode: "NONE",
          rejectionReasonPt: null,
          matchedLabel: dTag.label,
          matchedViaGateway: false,
          matchedCluster: dCluster,
          reasonText: `Destino compatível: ${dTag.label}`,
        };
      }

      // 2. Match direto por token de cidade/destino normalizado (bloqueia clusters distintos ex: Sao Paulo vs Morro de Sao Paulo)
      const conflictsBetweenNamedClusters = Boolean(dCluster && oCluster && dCluster.slug !== oCluster.slug);
      const directTokenMatch =
        !conflictsBetweenNamedClusters &&
        dTokens.some((dt) => oTokens.some((ot) => dt === ot));
      if (directTokenMatch) {
        return {
          passed: true,
          score: 35,
          rejectionCode: "NONE",
          rejectionReasonPt: null,
          matchedLabel: dTag.label,
          matchedViaGateway: false,
          matchedCluster: dCluster || oCluster,
          reasonText: `Destino exato: ${dTag.label}`,
        };
      }

      // 3. Mesmo aeroporto IATA principal quando ambos representam o mesmo destino com aeroporto proprio
      if (dIata && oIata && dIata === oIata) {
        const dIsGatewayOnly = Boolean(dCluster && dCluster.ownIatas.length === 0);
        const oIsGatewayOnly = Boolean(oCluster && oCluster.ownIatas.length === 0);
        const conflictsDifferentNamedClusters = Boolean(dCluster && oCluster && dCluster.slug !== oCluster.slug);
        if (!conflictsDifferentNamedClusters && !dIsGatewayOnly && !oIsGatewayOnly) {
          return {
            passed: true,
            score: 32,
            rejectionCode: "NONE",
            rejectionReasonPt: null,
            matchedLabel: dTag.label,
            matchedViaGateway: false,
            matchedCluster: dCluster || oCluster,
            reasonText: `Aeroporto compatível (${dIata}): ${dTag.label}`,
          };
        }
      }

      // 4. Match por Aeroporto Gateway Regional (ex: demanda quer Gramado [gateway POA/CXJ], oferta eh voo para POA)
      const dGateways = Array.from(new Set([...(dTag.gatewayIatas || []), ...(dCluster?.gatewayIatas || [])]));
      const oGateways = Array.from(new Set([...(oTag.gatewayIatas || []), ...(oCluster?.gatewayIatas || [])]));

      if (oIata && dGateways.includes(oIata)) {
        const offerIsExplicitDifferentBeachCity = Boolean(
          oCluster && oCluster.ownIatas.includes(oIata) && !isAirOnlyOffer
        );
        // Se for pacote com hotel em Maceio (MCZ), nao deve bater automaticamente com Porto de Galinhas (gateway secundario MCZ) a menos que oferta mencione ou seja aereo/gateway proprio
        if (!offerIsExplicitDifferentBeachCity || isAirOnlyOffer || oCluster?.slug === dCluster?.slug) {
          return {
            passed: true,
            score: 28,
            rejectionCode: "NONE",
            rejectionReasonPt: null,
            matchedLabel: dTag.label,
            matchedViaGateway: true,
            matchedCluster: dCluster,
            reasonText: `Gateway regional (${oIata}) atende ${dTag.label}`,
          };
        }
      }

      if (dIata && oGateways.includes(dIata) && !dCluster && oCluster) {
        return {
          passed: true,
          score: 26,
          rejectionCode: "NONE",
          rejectionReasonPt: null,
          matchedLabel: dTag.label,
          matchedViaGateway: true,
          matchedCluster: oCluster,
          reasonText: `Via gateway regional ${dIata} -> ${oTag.label}`,
        };
      }
    }
  }

  return {
    passed: false,
    score: 0,
    rejectionCode: "DESTINATION_MISMATCH",
    rejectionReasonPt: `Destino divergente: oferta em "${offer.destinationCity}", lead busca "${demandTags.map((d) => d.label).join(", ")}".`,
    matchedLabel: null,
    matchedViaGateway: false,
    matchedCluster: null,
    reasonText: null,
  };
}

function parseIsoDayMs(iso?: string | null): number | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const parsed = Date.parse(`${iso.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(parsed) ? null : parsed;
}

function evaluatePeriodGate(
  offer: CanonicalSupplyOffer,
  demand: CanonicalDemandLead,
  defaultFlexDays: number
): {
  passed: boolean;
  score: number;
  rejectionCode: OpportunityRejectionCode;
  rejectionReasonPt: string | null;
  reasonText: string | null;
  warningText: string | null;
} {
  const period = demand.period;
  const offerStartMs = parseIsoDayMs(offer.departureDate);
  const offerEndMs = parseIsoDayMs(offer.returnDate) ?? offerStartMs;
  const offerMonth = offer.departureDate && /^\d{4}-\d{2}/.test(offer.departureDate) ? offer.departureDate.slice(0, 7) : null;
  const offerMonthNum = offerMonth ? offerMonth.slice(5, 7) : null;

  // Caso 1: Demanda sem datas nem flexibilidade declarada -> REJEITA (nunca inventar data atual ou igualar a oferta)
  const hasDemandStart = Boolean(parseIsoDayMs(period.startDate));
  const hasTargetMonths = period.targetMonths.length > 0;
  const hasSeasonTags = period.seasonTags.length > 0;

  if (!hasDemandStart && !hasTargetMonths && !hasSeasonTags && !period.flexibleAnytime) {
    return {
      passed: false,
      score: 0,
      rejectionCode: "MISSING_DATES_NO_FLEX",
      rejectionReasonPt: "Lead sem período/mês de interesse nem flexibilidade de datas informada.",
      reasonText: null,
      warningText: null,
    };
  }

  // Caso 2: Lead explicitamente marcado como totalmente flexivel ("flexible_anytime")
  if (period.flexibleAnytime && !hasDemandStart && !hasTargetMonths && !hasSeasonTags) {
    return {
      passed: true,
      score: 18,
      rejectionCode: "NONE",
      rejectionReasonPt: null,
      reasonText: "Lead com disponibilidade flexível de datas",
      warningText: null,
    };
  }

  // Oferta sem data (ex: pacote aberto sob consulta): so casa com demanda de meses/flexibilidade ou avisa
  if (offerStartMs === null) {
    if (period.flexibleAnytime || hasTargetMonths || hasSeasonTags) {
      return {
        passed: true,
        score: 15,
        rejectionCode: "NONE",
        rejectionReasonPt: null,
        reasonText: "Oferta com saídas abertas para confirmar datas do período",
        warningText: "Oferta sem data fixa de saída: confirmar disponibilidade no período do lead.",
      };
    }
    return {
      passed: true,
      score: 12,
      rejectionCode: "NONE",
      rejectionReasonPt: null,
      reasonText: `Confirmar disponibilidade para ${period.startDate}`,
      warningText: "Oferta sem data fixa cadastrada.",
    };
  }

  // Caso 3: Demanda com data exata / janela de flexibilidade
  const demStartMs = parseIsoDayMs(period.startDate);
  if (demStartMs !== null) {
    const demEndMs = parseIsoDayMs(period.endDate) ?? demStartMs;
    const flexDays = period.flexibilityDays > 0 ? period.flexibilityDays : defaultFlexDays;
    const dayMs = 86_400_000;
    const expandedStart = demStartMs - flexDays * dayMs;
    const expandedEnd = demEndMs + flexDays * dayMs;

    const departureDiffDays = Math.round(Math.abs(offerStartMs - demStartMs) / dayMs);
    const insideExpandedRange = offerStartMs >= expandedStart && offerStartMs <= expandedEnd;

    if (departureDiffDays === 0) {
      return {
        passed: true,
        score: 25,
        rejectionCode: "NONE",
        rejectionReasonPt: null,
        reasonText: `Data de embarque exata (${offer.departureDate})`,
        warningText: null,
      };
    }
    if (departureDiffDays <= flexDays) {
      return {
        passed: true,
        score: 23,
        rejectionCode: "NONE",
        rejectionReasonPt: null,
        reasonText: `Dentro da janela (+/- ${departureDiffDays}d de tolerância)`,
        warningText: null,
      };
    }
    if (insideExpandedRange) {
      return {
        passed: true,
        score: 21,
        rejectionCode: "NONE",
        rejectionReasonPt: null,
        reasonText: `Embarque (${offer.departureDate}) dentro do período solicitado`,
        warningText: null,
      };
    }

    // Se tambem tiver targetMonths compativel
    if (offerMonth && period.targetMonths.includes(offerMonth)) {
      return {
        passed: true,
        score: 18,
        rejectionCode: "NONE",
        rejectionReasonPt: null,
        reasonText: `Mesmo mês alvo (${offerMonth})`,
        warningText: `Data exata diferente, porém no mês ${offerMonth}.`,
      };
    }

    return {
      passed: false,
      score: 0,
      rejectionCode: "DATES_OUT_OF_WINDOW",
      rejectionReasonPt: `Datas incompatíveis: oferta sai em ${offer.departureDate}, fora da janela do lead (${period.startDate} +/- ${flexDays}d).`,
      reasonText: null,
      warningText: null,
    };
  }

  // Caso 4: Demanda por lista de meses alvo (`YYYY-MM[]`)
  if (hasTargetMonths && offerMonth) {
    if (period.targetMonths.includes(offerMonth)) {
      return {
        passed: true,
        score: 23,
        rejectionCode: "NONE",
        rejectionReasonPt: null,
        reasonText: `Dentro do mês de interesse (${offerMonth})`,
        warningText: null,
      };
    }
    return {
      passed: false,
      score: 0,
      rejectionCode: "DATES_OUT_OF_WINDOW",
      rejectionReasonPt: `Mês da oferta (${offerMonth}) fora dos meses escolhidos (${period.targetMonths.join(", ")}).`,
      reasonText: null,
      warningText: null,
    };
  }

  // Caso 5: Demanda por tags de temporada (ex: reveillon, ferias_julho)
  if (hasSeasonTags && offerMonthNum) {
    const matchedSeasons = period.seasonTags.filter((tag) => {
      const allowedMonths = SEASON_TAG_MONTHS[tag];
      return allowedMonths ? allowedMonths.includes(offerMonthNum) : false;
    });
    if (matchedSeasons.length > 0) {
      return {
        passed: true,
        score: 21,
        rejectionCode: "NONE",
        rejectionReasonPt: null,
        reasonText: `Compatível com temporada (${matchedSeasons.join(", ")})`,
        warningText: null,
      };
    }
    return {
      passed: false,
      score: 0,
      rejectionCode: "DATES_OUT_OF_WINDOW",
      rejectionReasonPt: `Mês da oferta (${offerMonth}) incompatível com temporada (${period.seasonTags.join(", ")}).`,
      reasonText: null,
      warningText: null,
    };
  }

  return {
    passed: false,
    score: 0,
    rejectionCode: "DATES_OUT_OF_WINDOW",
    rejectionReasonPt: "Período da oferta incompatível com a preferência temporal do lead.",
    reasonText: null,
    warningText: null,
  };
}

function evaluatePartyAndRoomsGate(
  offer: CanonicalSupplyOffer,
  demand: CanonicalDemandLead
): {
  passed: boolean;
  score: number;
  rejectionCode: OpportunityRejectionCode;
  rejectionReasonPt: string | null;
  reasons: string[];
  warnings: string[];
} {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const demandAdults = Math.max(1, demand.adultsCount || 1);
  const offerAdults = Math.max(1, offer.quotedAdultsCount || 1);
  const demandChildrenCount = demand.childrenAges.length;
  const offerChildrenCount = Math.max(0, offer.quotedChildrenCount || 0);
  const demandRoomsCount = Math.max(1, demand.rooms.length || 1);
  const offerRoomsCount = Math.max(0, offer.rooms?.length || 0);

  // Nota: oferta cotada para 1 ou 2 adultos pode perfeitamente ser reajustada via basePerAdultCents para outro grupo,
  // EXCETO se oferta declarar estritamente room_count fixo menor em bloqueio fechado? Em pacotes cotaveis, comparamos compatibilidade.
  let score = 20;

  if (offerAdults === demandAdults && offerChildrenCount === demandChildrenCount) {
    reasons.push(`Ocupação idêntica (${demandAdults} adt${demandChildrenCount > 0 ? ` + ${demandChildrenCount} cri.` : ""})`);
  } else if (offerAdults === demandAdults) {
    score -= 4;
    if (demandChildrenCount > 0 && offerChildrenCount === 0) {
      reasons.push(`Base para ${demandAdults} adulto(s) — simulação aplicada para ${demandChildrenCount} criança(s)`);
    } else {
      warnings.push(`Diferença de crianças: oferta c/ ${offerChildrenCount}, lead c/ ${demandChildrenCount}.`);
    }
  } else {
    const adultDiff = Math.abs(offerAdults - demandAdults);
    if (adultDiff > 4 && offerAdults === 1 && demandRoomsCount >= 3) {
      return {
        passed: false,
        score: 0,
        rejectionCode: "ADULT_CAPACITY_INSUFFICIENT",
        rejectionReasonPt: `Capacidade de adultos/quartos distante da demanda (${demandAdults} adt em ${demandRoomsCount} quartos).`,
        reasons: [],
        warnings: [],
      };
    }
    score -= Math.min(8, adultDiff * 3);
    warnings.push(`Diferença de adultos: cotado p/ ${offerAdults} adt, lead busca ${demandAdults} adt.`);
  }

  if (offerRoomsCount > 0 && demandRoomsCount > 0) {
    if (offerRoomsCount === demandRoomsCount) {
      reasons.push(`${demandRoomsCount} quarto(s) compatível(is)`);
    } else {
      score -= Math.min(5, Math.abs(offerRoomsCount - demandRoomsCount) * 3);
      warnings.push(`Quartos diferentes: oferta c/ ${offerRoomsCount}, lead busca ${demandRoomsCount}.`);
    }
  }

  return {
    passed: true,
    score: Math.max(6, score),
    rejectionCode: "NONE",
    rejectionReasonPt: null,
    reasons,
    warnings,
  };
}

function evaluateBudgetGate(
  demand: CanonicalDemandLead,
  offer: CanonicalSupplyOffer,
  simulation: ChildSimulationResult,
  historicalCheck: HistoricalPriceCheck,
  defaultTolerancePct: number
): {
  passed: boolean;
  score: number;
  budgetStatus: UnifiedOpportunityResult["budgetStatus"];
  budgetVariancePct: number | null;
  rejectionCode: OpportunityRejectionCode;
  rejectionReasonPt: string | null;
  reasons: string[];
  warnings: string[];
} {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const effectiveTotalCents = simulation.applied ? simulation.simulatedTotalCents : Math.max(0, offer.totalPriceCents || 0);
  const maxTotalBudgetCents = demand.maxTotalBudgetCents && demand.maxTotalBudgetCents > 0 ? demand.maxTotalBudgetCents : null;
  const maxInstallmentCents =
    demand.maxInstallmentCents && demand.maxInstallmentCents > 0 ? demand.maxInstallmentCents : null;

  if (!maxTotalBudgetCents && !maxInstallmentCents) {
    // Orcamento aberto nao ganha pontuacao inflada (so 8 pts base + bonus por historico bom!) e nunca rejeita por 0
    const historyBonus = historicalCheck.verdict === "great_deal" ? 6 : historicalCheck.verdict === "fair_price" ? 2 : 0;
    warnings.push("Orçamento do lead não informado (validar teto com cliente).");
    if (historicalCheck.verdict === "great_deal") {
      reasons.push(historicalCheck.verdictLabelPt);
    }
    return {
      passed: true,
      score: Math.min(20, 8 + historyBonus),
      budgetStatus: "open_to_validate",
      budgetVariancePct: null,
      rejectionCode: "NONE",
      rejectionReasonPt: null,
      reasons,
      warnings,
    };
  }

  const tolerancePct = Math.max(0, Math.min(35, demand.budgetTolerancePct ?? defaultTolerancePct));

  // Avaliacao por teto total (ou parcela se so parcela foi definida)
  let capCents = maxTotalBudgetCents ?? 0;
  let comparedCents = effectiveTotalCents;

  if (!maxTotalBudgetCents && maxInstallmentCents) {
    const installments = Math.max(1, demand.preferredInstallments || offer.installmentCount || 10);
    capCents = maxInstallmentCents * installments;
    if (offer.installmentValueCents && offer.installmentValueCents > 0 && !simulation.applied) {
      comparedCents = offer.installmentValueCents * (offer.installmentCount || installments);
    }
  }

  if (capCents <= 0 || comparedCents <= 0) {
    return {
      passed: true,
      score: 10,
      budgetStatus: "open_to_validate",
      budgetVariancePct: null,
      rejectionCode: "NONE",
      rejectionReasonPt: null,
      reasons,
      warnings,
    };
  }

  const variancePct = Math.round(((comparedCents - capCents) / capCents) * 1000) / 10;

  if (comparedCents <= capCents) {
    const score = historicalCheck.verdict === "great_deal" ? 20 : 18;
    reasons.push(
      variancePct <= -10
        ? `Dentro do orçamento (${Math.abs(variancePct).toFixed(0)}% abaixo do teto)`
        : "Dentro do teto orçamentário"
    );
    if (historicalCheck.verdict === "great_deal") {
      reasons.push(historicalCheck.verdictLabelPt);
    }
    return {
      passed: true,
      score,
      budgetStatus: "within_budget",
      budgetVariancePct: variancePct,
      rejectionCode: "NONE",
      rejectionReasonPt: null,
      reasons,
      warnings,
    };
  }

  if (variancePct <= tolerancePct) {
    warnings.push(`Valor simulado ${variancePct.toFixed(1)}% acima do teto (dentro da tolerância de ${tolerancePct}%).`);
    return {
      passed: true,
      score: 11,
      budgetStatus: "near_ceiling",
      budgetVariancePct: variancePct,
      rejectionCode: "NONE",
      rejectionReasonPt: null,
      reasons,
      warnings,
    };
  }

  return {
    passed: false,
    score: 0,
    budgetStatus: "over_budget",
    budgetVariancePct: variancePct,
    rejectionCode: "OVER_BUDGET_CAP",
    rejectionReasonPt: `Acima do teto do cliente em +${variancePct.toFixed(1)}% (estimado R$ ${(comparedCents / 100).toFixed(0)} vs teto R$ ${(capCents / 100).toFixed(0)}).`,
    reasons: [],
    warnings: [],
  };
}

function checkCooldownDuplicate(
  offer: CanonicalSupplyOffer,
  demand: CanonicalDemandLead,
  matchedCluster: DestinationClusterRule | null,
  cooldownDays: number,
  now: Date
): { alreadyProposedRecently: boolean; recentProposalInfo: { title?: string; createdAt: string } | null } {
  if (!Array.isArray(demand.recentProposals) || demand.recentProposals.length === 0) {
    return { alreadyProposedRecently: false, recentProposalInfo: null };
  }

  const cutoffMs = now.getTime() - cooldownDays * 86_400_000;
  const offerTag = resolveCanonicalDestinationTag(offer.destinationCity);
  const offerCore = offerTag ? extractCoreCityTokens(offerTag) : [];
  const offerMonth = offer.departureDate?.slice(0, 7) || null;

  for (const prev of demand.recentProposals) {
    if (prev.id && prev.id === offer.id) continue;
    const createdMs = Date.parse(prev.createdAt);
    if (Number.isNaN(createdMs) || createdMs < cutoffMs) continue;

    const prevNorm = normalizeOpportunityText(prev.destinationNormalized);
    if (!prevNorm) continue;

    const sameCluster =
      matchedCluster && matchedCluster.aliases.some((a) => prevNorm.includes(a) || a.includes(prevNorm));
    const sameToken = offerCore.some((tok) => prevNorm.includes(tok) || tok.includes(prevNorm));

    if (!sameCluster && !sameToken) continue;

    const prevMonth = prev.departureDate?.slice(0, 7) || null;
    if (!offerMonth || !prevMonth || offerMonth === prevMonth) {
      return {
        alreadyProposedRecently: true,
        recentProposalInfo: {
          title: prev.title,
          createdAt: prev.createdAt,
        },
      };
    }
  }

  return { alreadyProposedRecently: false, recentProposalInfo: null };
}

function formatCentsPtBr(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function buildPersonalizedMatchPitch(params: {
  demand: CanonicalDemandLead;
  offer: CanonicalSupplyOffer;
  simulation: ChildSimulationResult;
  historicalCheck: HistoricalPriceCheck;
}): string {
  const firstName = params.demand.fullName.trim().split(/\s+/)[0] || "Olá";
  const effectiveCents = params.simulation.applied
    ? params.simulation.simulatedTotalCents
    : params.offer.totalPriceCents;
  const priceText = effectiveCents > 0 ? formatCentsPtBr(effectiveCents) : "condição especial";
  const datePart = params.offer.departureDate ? ` para ${params.offer.departureDate}` : "";
  const chdNote =
    params.simulation.applied && params.simulation.requiresChildRequote
      ? " (estimativa já considerando crianças; confirmamos tarifa exata no ato)"
      : "";
  const dealNote =
    params.historicalCheck.verdict === "great_deal" && params.historicalCheck.historicalSavingsPct
      ? ` — está cerca de ${params.historicalCheck.historicalSavingsPct.toFixed(0)}% abaixo do histórico recente!`
      : "";

  return `Olá, ${firstName}! Apareceu uma oportunidade para ${params.offer.destinationCity}${datePart} em torno de ${priceText}${chdNote}${dealNote}. Quer que eu garanta a simulação completa para a sua família agora?`;
}

// ============================================================================
// MOTOR PRINCIPAL DE MATCHING DETERMINISTICO
// ============================================================================

export function evaluateUnifiedOpportunityMatch(
  offer: CanonicalSupplyOffer,
  demand: CanonicalDemandLead,
  options?: UnifiedMatchOptions
): UnifiedOpportunityResult {
  const minScore = options?.minScore ?? 60;
  const defaultFlexDays = options?.defaultFlexibilityDays ?? 3;
  const defaultTolerancePct = options?.defaultBudgetTolerancePct ?? 10;
  const cooldownDays = options?.cooldownDays ?? 30;
  const now = options?.now ?? new Date();

  const emptySimulation = simulateFamilyPricingFromAdultBase(offer, demand.adultsCount, demand.childrenAges);
  const emptyHistory: HistoricalPriceCheck = {
    sampleCount: 0,
    historicalMedianCents: null,
    historicalMinCents: null,
    historicalMaxCents: null,
    comparedUnitCents: emptySimulation.basePerAdultCents,
    historicalSavingsPct: null,
    verdict: "insufficient_history",
    verdictLabelPt: "Sem histórico suficiente para comparativo",
  };

  const makeRejection = (
    rejectionCode: OpportunityRejectionCode,
    rejectionReasonPt: string
  ): UnifiedOpportunityResult => ({
    isMatch: false,
    matchScore: 0,
    matchTier: "rejected",
    rejectionCode,
    rejectionReasonPt,
    matchedDestinationLabel: null,
    matchedViaGateway: false,
    requiresChildRequote: false,
    budgetStatus: "open_to_validate",
    budgetVariancePct: null,
    effectiveOfferTotalCents: offer.totalPriceCents,
    childSimulation: emptySimulation,
    historicalCheck: emptyHistory,
    scoreBreakdown: { destination: 0, period: 0, partyAndRooms: 0, budgetAndValue: 0, total: 0 },
    matchReasons: [],
    warnings: [],
    alreadyProposedRecently: false,
    recentProposalInfo: null,
    suggestedPitchPt: "",
  });

  // Gate 0: Nunca casar proposta/oferta enviada para o proprio lead com ele mesmo
  if (offer.targetLeadId && (demand.leadId === offer.targetLeadId || demand.id === offer.targetLeadId)) {
    return makeRejection("SELF_LEAD", "A oferta pertence ao próprio lead destinatário.");
  }

  // Gate 1: Destino / Gateway obrigatorio
  const destGate = evaluateDestinationGate(offer, demand);
  if (!destGate.passed) {
    return makeRejection(destGate.rejectionCode, destGate.rejectionReasonPt || "Destino incompatível.");
  }

  // Gate 2: Periodo / Datas / Meses / Temporada / Flexibilidade explicita
  const periodGate = evaluatePeriodGate(offer, demand, defaultFlexDays);
  if (!periodGate.passed) {
    return makeRejection(periodGate.rejectionCode, periodGate.rejectionReasonPt || "Período incompatível.");
  }

  // Gate 3: Ocupacao, quartos e idades 0-17 + Simulacao de criancas
  const partyGate = evaluatePartyAndRoomsGate(offer, demand);
  if (!partyGate.passed) {
    return makeRejection(partyGate.rejectionCode, partyGate.rejectionReasonPt || "Ocupação incompatível.");
  }

  // Simulacao tarifaria + comparativo historico do destino
  const simulation = emptySimulation;
  const historicalCheck = evaluateHistoricalAdvantage(
    offer,
    simulation,
    options?.historicalObservations || [],
    destGate.matchedCluster
  );

  // Gate 4: Teto orcamentario contra total efetivo/simulado
  const budgetGate = evaluateBudgetGate(demand, offer, simulation, historicalCheck, defaultTolerancePct);
  if (!budgetGate.passed) {
    return makeRejection(budgetGate.rejectionCode, budgetGate.rejectionReasonPt || "Acima do teto orçamentário.");
  }

  const scoreBreakdown: OpportunityScoreBreakdown = {
    destination: destGate.score,
    period: periodGate.score,
    partyAndRooms: partyGate.score,
    budgetAndValue: budgetGate.score,
    total: Math.min(100, destGate.score + periodGate.score + partyGate.score + budgetGate.score),
  };

  if (scoreBreakdown.total < minScore) {
    return makeRejection(
      "LOW_COMPOSITE_SCORE",
      `Pontuação combinada (${scoreBreakdown.total}/100) abaixo do corte mínimo (${minScore}).`
    );
  }

  const cooldown = checkCooldownDuplicate(offer, demand, destGate.matchedCluster, cooldownDays, now);

  const matchReasons: string[] = [];
  if (destGate.reasonText) matchReasons.push(destGate.reasonText);
  if (periodGate.reasonText) matchReasons.push(periodGate.reasonText);
  matchReasons.push(...partyGate.reasons);
  matchReasons.push(...budgetGate.reasons);
  if (simulation.applied && simulation.chd2to11Count > 0) {
    matchReasons.push(simulation.reasonPt);
  }

  const warnings: string[] = [];
  if (destGate.matchedViaGateway) {
    warnings.push(`Desembarque em aeroporto gateway próximo de ${destGate.matchedLabel} (verificar transfer).`);
  }
  if (periodGate.warningText) warnings.push(periodGate.warningText);
  warnings.push(...partyGate.warnings);
  warnings.push(...budgetGate.warnings);
  if (cooldown.alreadyProposedRecently) {
    warnings.push(
      `Lead já recebeu proposta similar nos últimos ${cooldownDays} dias${cooldown.recentProposalInfo?.title ? ` (${cooldown.recentProposalInfo.title})` : ""}.`
    );
  }

  let matchTier: OpportunityMatchTier = "strong_match";
  if (simulation.requiresChildRequote) {
    matchTier = "conditional_child_requote";
  } else if (budgetGate.budgetStatus === "near_ceiling") {
    matchTier = "budget_stretch";
  } else if (scoreBreakdown.total >= 88 && !destGate.matchedViaGateway) {
    matchTier = "exact_match";
  }

  const effectiveOfferTotalCents = simulation.applied ? simulation.simulatedTotalCents : offer.totalPriceCents;

  return {
    isMatch: true,
    matchScore: scoreBreakdown.total,
    matchTier,
    rejectionCode: "NONE",
    rejectionReasonPt: null,
    matchedDestinationLabel: destGate.matchedLabel,
    matchedViaGateway: destGate.matchedViaGateway,
    requiresChildRequote: simulation.requiresChildRequote,
    budgetStatus: budgetGate.budgetStatus,
    budgetVariancePct: budgetGate.budgetVariancePct,
    effectiveOfferTotalCents,
    childSimulation: simulation,
    historicalCheck,
    scoreBreakdown,
    matchReasons: Array.from(new Set(matchReasons)),
    warnings: Array.from(new Set(warnings)),
    alreadyProposedRecently: cooldown.alreadyProposedRecently,
    recentProposalInfo: cooldown.recentProposalInfo,
    suggestedPitchPt: buildPersonalizedMatchPitch({
      demand,
      offer,
      simulation,
      historicalCheck,
    }),
  };
}

// ============================================================================
// NORMALIZADORES RETROCOMPATIVEIS (ZERO DATA LOSS EM PRODUCAO)
// ============================================================================

export function normalizeLegacyDemandToCanonical(row: Record<string, unknown>): CanonicalDemandLead {
  const customFields =
    row.custom_fields && typeof row.custom_fields === "object" && !Array.isArray(row.custom_fields)
      ? (row.custom_fields as Record<string, unknown>)
      : {};

  const destinations = normalizeDestinationTagList(
    (row.destination_tags as Array<string | Partial<StructuredDestinationTag>> | null) ??
      (row.preferred_destinations as string[] | null) ??
      (customFields.destination_tags as Array<string | Partial<StructuredDestinationTag>> | null),
    String(row.destination || customFields.destination || "")
  );

  const period = normalizePeriodSpec({
    startDate: (row.travel_start || row.earliest_departure_date || row.earliest_departure || row.departure_date) as string | null,
    endDate: (row.travel_end || row.latest_return_date || row.latest_departure || row.return_date) as string | null,
    targetMonths: (row.target_months || row.preferred_months || customFields.target_months) as string[] | null,
    seasonTags: (row.period_tags || customFields.period_tags) as string[] | null,
    flexibilityDays: (row.flexibility_days ?? row.date_flexibility_days) as number | null,
    dateFlexibilityMode: (row.date_flexibility_mode || customFields.date_flexibility_mode) as string | null,
    interestPeriodText: (row.interest_period || customFields.interest_period) as string | null,
    dateFlexibleFlag: Boolean(row.date_flexible),
  });

  const roomData = normalizeRoomsFromLeadOrLegacy({
    rooms: row.room_occupancies || row.rooms || customFields.room_occupancies || customFields.rooms,
    adultsCount: Number(row.pax_adults ?? row.adults_count ?? customFields.pax_adults ?? 2),
    childrenCount: Number(row.pax_children ?? row.children_count ?? customFields.pax_children ?? 0),
    childrenAges: row.children_ages ?? row.pax_ages ?? customFields.pax_ages ?? customFields.children_ages,
    roomsCount: Number(row.rooms_count ?? customFields.rooms_count ?? 1),
  });

  const rawMaxBudgetCents = Number(
    row.max_total_budget_cents ?? row.budget_max_cents ?? row.budget_cents ?? row.estimated_value_cents ?? 0
  );
  const rawMaxInstallmentCents = Number(row.max_installment_cents ?? customFields.max_installment_cents ?? 0);

  return {
    id: String(row.id || ""),
    demandSource:
      row.demand_source === "travel_interest"
        ? "travel_interest"
        : row.demand_source === "client_demand"
          ? "client_demand"
          : "lead_crm",
    leadId: (row.lead_id as string | null) || (row.demand_source ? null : String(row.id || "")) || null,
    customerId: (row.customer_id as string | null) || null,
    contactId: (row.contact_id as string | null) || null,
    fullName: String(row.full_name || row.client_name || row.contact_name || "Cliente"),
    whatsapp: (row.whatsapp || row.phone) as string | null,
    originCity: (row.origin_city as string | null) || null,
    originIata: (row.origin_iata as string | null) || null,
    destinations,
    period,
    rooms: roomData.rooms,
    adultsCount: roomData.adultsCount,
    childrenAges: roomData.childrenAges,
    maxTotalBudgetCents: rawMaxBudgetCents > 0 ? rawMaxBudgetCents : null,
    maxInstallmentCents: rawMaxInstallmentCents > 0 ? rawMaxInstallmentCents : null,
    preferredInstallments: Number(row.preferred_installments || 0) || null,
    budgetTolerancePct: Number(row.budget_tolerance_pct || 10),
    preferredProductTypes: Array.isArray(row.preferred_product_types) ? (row.preferred_product_types as string[]) : [],
    wantedInclusions: Array.isArray(row.wanted_inclusions) ? (row.wanted_inclusions as string[]) : [],
    minHotelStars: row.min_hotel_stars ? Number(row.min_hotel_stars) : null,
    preferredMealPlan: (row.preferred_meal_plan as string | null) || null,
    rawNotes: (row.raw_intent_markdown || row.notes) as string | null,
    recentProposals: Array.isArray(row.recent_proposals) ? (row.recent_proposals as RecentLeadProposalRef[]) : [],
  };
}

export function normalizeLegacyOfferToCanonical(row: Record<string, unknown>): CanonicalSupplyOffer {
  const pricing =
    row.pricing && typeof row.pricing === "object" && !Array.isArray(row.pricing)
      ? (row.pricing as Record<string, unknown>)
      : {};
  const breakdown =
    pricing.breakdown && typeof pricing.breakdown === "object" && !Array.isArray(pricing.breakdown)
      ? (pricing.breakdown as Record<string, unknown>)
      : {};

  const roomData = normalizeRoomsFromLeadOrLegacy({
    rooms: row.rooms || row.room_occupancies,
    adultsCount: Number(row.pax_adults ?? row.adults_count ?? pricing.adultsCount ?? 2),
    childrenCount: Number(row.pax_children ?? row.children_count ?? pricing.childrenCount ?? 0),
    childrenAges: row.children_ages ?? row.pax_ages,
    roomsCount: Number(row.rooms_count ?? 1),
  });

  const totalPriceCents = Number(
    row.total_cents ??
      row.total_price_cents ??
      pricing.total_price_cents ??
      pricing.totalCents ??
      pricing.total_cents ??
      pricing.finalTotalCents ??
      0
  );

  const airfarePerAdultCents = Number(
    row.airfare_per_adult_cents ?? pricing.airfarePerAdultCents ?? breakdown.airPerAdultCents ?? 0
  );
  const transferPerAdultCents = Number(
    row.transfer_per_adult_cents ?? pricing.transferPerAdultCents ?? breakdown.transferPerAdultCents ?? 0
  );

  const destinationCity = String(row.destination_city || row.destination || row.title || "").trim();

  return {
    id: String(row.id || ""),
    sourceType: (row.source_type as CanonicalSupplySourceType) || "proposal",
    title: String(row.title || destinationCity || "Oferta de Viagem"),
    originCity: (row.origin_city as string | null) || null,
    originIata: (row.origin_iata as string | null) || null,
    destinationCity,
    destinationIata: (row.destination_iata as string | null) || null,
    destinationState: (row.destination_state as string | null) || null,
    destinationCountry: (row.destination_country as string | null) || null,
    destinationTags: normalizeDestinationTagList(
      row.destination_tags as Array<string | Partial<StructuredDestinationTag>> | null,
      destinationCity
    ),
    departureDate: ((row.travel_start_date || row.departure_date || row.start_date || row.travel_start) as string | null)?.slice(0, 10) || null,
    returnDate: ((row.travel_end_date || row.return_date || row.end_date || row.travel_end) as string | null)?.slice(0, 10) || null,
    quotedAdultsCount: roomData.adultsCount,
    quotedChildrenCount: roomData.childrenCount,
    quotedChildrenAges: roomData.childrenAges,
    rooms: roomData.rooms,
    totalPriceCents,
    adultUnitPriceCents: Number(row.price_per_adult_cents || pricing.pricePerAdultCents || 0) || null,
    explicitChildUnitPriceCents: Number(row.child_unit_price_cents || pricing.childUnitPriceCents || 0) || null,
    explicitChildMaxAge: Number(row.child_max_age || pricing.childMaxAge || 0) || null,
    airfarePerAdultCents: airfarePerAdultCents > 0 ? airfarePerAdultCents : null,
    transferPerAdultCents: transferPerAdultCents > 0 ? transferPerAdultCents : null,
    installmentCount: Number(pricing.installmentCount || pricing.installments || 0) || null,
    installmentValueCents: Number(pricing.installmentValueCents || pricing.installmentCents || 0) || null,
    productType: (row.product_type as string | null) || null,
    mealPlan: (row.meal_plan as string | null) || null,
    hotelStars: row.hotel_stars ? Number(row.hotel_stars) : null,
    inclusions: Array.isArray(row.inclusions) ? (row.inclusions as string[]) : [],
    operatorSlug: (row.operator_slug as string | null) || null,
    targetLeadId: ((row.target_lead_id || row.lead_id) as string | null) || null,
    targetCustomerId: (row.customer_id as string | null) || null,
    createdAt: (row.created_at as string | null) || null,
  };
}
