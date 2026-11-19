import type {
  FlightSegmentDTO,
  HotelDTO,
  ItineraryDayDTO,
  PricingBreakdownDTO,
  TransferDTO,
  TravelProposalDTO,
} from "@/services/travel-proposal.functions";
import type { HistoricalPriceCheck } from "@/lib/travel/opportunity-matching-engine";

export type HotOfferBadgeKind = "hot_offer" | "hot_black" | "flash" | "opportunity";
export type HotFlameStyle = "none" | "instagram_ring" | "pixel_fire" | "hot_black";
export type HotOfferStatus = "draft" | "active" | "paused" | "expired" | "archived";

export interface HotOfferDTO {
  id: string;
  store_id: string;
  source_proposal_id?: string | null;
  source_quote_id?: string | null;
  tourism_experience_id?: string | null;
  slug: string;
  title: string;
  subtitle?: string | null;
  badge_kind: HotOfferBadgeKind;
  flame_style: HotFlameStyle;
  destination_city: string;
  destination_state?: string | null;
  destination_country?: string | null;
  origin_city?: string | null;
  origin_iata?: string | null;
  destination_iata?: string | null;
  departure_date?: string | null;
  return_date?: string | null;
  nights_count: number;
  adults_base_count: number;
  children_base_count: number;
  price_cents: number;
  original_price_cents?: number | null;
  discount_pct?: number | null;
  historical_verdict: "great_deal" | "fair_price" | "above_market" | "insufficient_history";
  historical_savings_pct?: number | null;
  historical_median_cents?: number | null;
  installments_max: number;
  installment_value_cents?: number | null;
  pix_discount_pct: number;
  seats_left?: number | null;
  flights: FlightSegmentDTO[];
  hotels: HotelDTO[];
  transfers: TransferDTO[];
  itinerary: ItineraryDayDTO[];
  inclusions: string[];
  exclusions: string[];
  media_urls: string[];
  story_media_url?: string | null;
  group_media_url?: string | null;
  whatsapp_copy_summary?: string | null;
  boarding_requirements?: string | null;
  cancellation_policy?: string | null;
  status: HotOfferStatus;
  is_published_in_app: boolean;
  expires_at?: string | null;
  views_count: number;
  clicks_count: number;
  leads_generated_count: number;
  created_at: string;
  updated_at: string;
}

export const FORBIDDEN_HOT_OFFER_PII_KEYS = [
  "lead_id",
  "customer_id",
  "selected_customer_label",
  "client_name",
  "customer_name",
  "client_whatsapp",
  "client_email",
  "client_document",
  "client_cpf",
  "client_rg",
  "special_notes",
  "access_pin",
] as const;

function slugifyOfferTitle(value: string, destination: string): string {
  const base = `${value || "oferta"}-${destination || "viagem"}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "oferta-hot"}-${suffix}`;
}

export function formatBrlFromCents(cents: number): string {
  const safe = Number.isFinite(cents) ? Math.max(0, Math.round(cents)) : 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(safe / 100);
}

/**
 * Strips any occurrence of the original client's name, phone, email, or document from free-text titles/subtitles.
 */
export function scrubLeadPiiFromText(
  text: string | null | undefined,
  leadContext?: {
    clientName?: string | null;
    clientWhatsapp?: string | null;
    clientEmail?: string | null;
    clientDocument?: string | null;
  }
): string {
  if (!text) return "";
  let cleaned = String(text).trim();

  if (leadContext?.clientName) {
    const fullName = leadContext.clientName.trim();
    if (fullName.length >= 3) {
      const escaped = fullName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      cleaned = cleaned.replace(new RegExp(`\\bpara\\s+${escaped}\\b`, "gi"), "");
      cleaned = cleaned.replace(new RegExp(`\\b-\\s*${escaped}\\b`, "gi"), "");
      cleaned = cleaned.replace(new RegExp(escaped, "gi"), "");
    }
  }
  if (leadContext?.clientEmail) {
    const escapedEmail = leadContext.clientEmail.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (escapedEmail) cleaned = cleaned.replace(new RegExp(escapedEmail, "gi"), "");
  }
  if (leadContext?.clientWhatsapp) {
    const digits = leadContext.clientWhatsapp.replace(/\D/g, "");
    if (digits.length >= 8) {
      cleaned = cleaned.replace(new RegExp(digits, "g"), "");
    }
  }
  if (leadContext?.clientDocument) {
    const docDigits = leadContext.clientDocument.replace(/\D/g, "");
    if (docDigits.length >= 8) {
      cleaned = cleaned.replace(new RegExp(docDigits, "g"), "");
    }
  }

  return cleaned.replace(/\s{2,}/g, " ").replace(/^[-–—:\s]+|[-–—:\s]+$/g, "").trim();
}

export function computeNightsBetween(startDate?: string | null, endDate?: string | null, hotels?: HotelDTO[]): number {
  if (Array.isArray(hotels) && hotels.length > 0) {
    const sumNights = hotels.reduce((acc, h) => acc + Math.max(0, Number(h.nights || 0)), 0);
    if (sumNights > 0) return sumNights;
  }
  if (startDate && endDate) {
    const startMs = Date.parse(startDate);
    const endMs = Date.parse(endDate);
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
      return Math.max(1, Math.round((endMs - startMs) / 86_400_000));
    }
  }
  return 0;
}

export function buildHotOfferWhatsAppGroupCopy(params: {
  title: string;
  destinationCity: string;
  departureDate?: string | null;
  returnDate?: string | null;
  nightsCount: number;
  adultsCount: number;
  priceCents: number;
  installmentsMax: number;
  installmentValueCents?: number | null;
  badgeKind?: HotOfferBadgeKind;
  historicalSavingsPct?: number | null;
  hotelHeadline?: string | null;
  includesHeadline?: string[];
  appSlug: string;
  offerIdOrSlug: string;
  appOrigin?: string;
}): {
  trackedUrl: string;
  summaryCopy: string;
} {
  const origin = (params.appOrigin || "https://waesy.app").replace(/\/+$/, "");
  const cleanSlug = (params.appSlug || "agencia").trim();
  const trackedUrl = `${origin}/app/${encodeURIComponent(cleanSlug)}?offer=${encodeURIComponent(
    params.offerIdOrSlug
  )}&utm_source=whatsapp_group&utm_medium=hot_offer`;

  const headerTag =
    params.badgeKind === "hot_black"
      ? "OFERTA HOT BLACK SELECIONADA"
      : params.badgeKind === "flash"
        ? "OFERTA RELAMPAGO VERIFICADA"
        : "HOT OFERTA DA AGENCIA";

  const savingsLine =
    params.historicalSavingsPct && params.historicalSavingsPct >= 5
      ? `\nTarifa ${Math.round(params.historicalSavingsPct)}% abaixo da media historica da rota!`
      : "";

  const periodParts: string[] = [];
  if (params.nightsCount > 0) periodParts.push(`${params.nightsCount} diárias`);
  if (params.departureDate) {
    const formatted = params.departureDate.slice(0, 10).split("-").reverse().join("/");
    periodParts.push(`Saída ${formatted}`);
  }
  const periodLine = periodParts.length > 0 ? periodParts.join(" · ") : "Datas especiais selecionadas";

  const totalText = formatBrlFromCents(params.priceCents);
  const instMax = Math.max(1, params.installmentsMax || 10);
  const instCents =
    params.installmentValueCents && params.installmentValueCents > 0
      ? params.installmentValueCents
      : Math.round(params.priceCents / instMax);
  const instText = instMax > 1 ? `Até ${instMax}x de ${formatBrlFromCents(instCents)}` : `À vista ${totalText}`;

  const highlights: string[] = [];
  if (params.hotelHeadline) highlights.push(`Hospedagem: ${params.hotelHeadline}`);
  if (Array.isArray(params.includesHeadline) && params.includesHeadline.length > 0) {
    highlights.push(`Incluso: ${params.includesHeadline.slice(0, 3).join(", ")}`);
  }

  const lines = [
    `*${headerTag}*`,
    `*${params.title || params.destinationCity}*`,
    `Destino: ${params.destinationCity} (${periodLine})`,
    ...(highlights.length > 0 ? highlights : []),
    savingsLine ? savingsLine.trim() : null,
    "",
    `Investimento (${Math.max(1, params.adultsCount)} adulto${params.adultsCount > 1 ? "s" : ""}): *${instText}* (Total ${totalText})`,
    "",
    `Veja fotos, roteiro completo e personalize no App:`,
    trackedUrl,
  ].filter((line): line is string => line !== null);

  return {
    trackedUrl,
    summaryCopy: lines.join("\n"),
  };
}

/**
 * Converts a `TravelProposalDTO` (which belongs to a specific Lead/Client) into a 100% Zero-PII
 * Master Offer payload (`HotOfferDTO` input).
 */
export function sanitizeProposalToHotOfferPayload(params: {
  proposal: TravelProposalDTO;
  storeId: string;
  storeSlug?: string;
  badgeKind?: HotOfferBadgeKind;
  flameStyle?: HotFlameStyle;
  historicalCheck?: HistoricalPriceCheck | null;
  storyMediaUrl?: string | null;
  groupMediaUrl?: string | null;
  customTitle?: string | null;
  customSubtitle?: string | null;
  customWhatsappCopy?: string | null;
  expiresInHours?: number;
  appOrigin?: string;
}): Omit<HotOfferDTO, "id" | "views_count" | "clicks_count" | "leads_generated_count" | "created_at" | "updated_at"> {
  const { proposal } = params;
  const piiContext = {
    clientName: proposal.client_name || proposal.customer_name || proposal.selected_customer_label,
    clientWhatsapp: proposal.client_whatsapp,
    clientEmail: proposal.client_email,
    clientDocument: proposal.client_document,
  };

  const rawTitle = params.customTitle?.trim() || proposal.title || `Pacote ${proposal.destination_city}`;
  const cleanTitle =
    scrubLeadPiiFromText(rawTitle, piiContext) || `Pacote Especial ${proposal.destination_city || "Viagem"}`;
  const cleanSubtitle = scrubLeadPiiFromText(params.customSubtitle ?? proposal.subtitle, piiContext) || null;

  const totalCents = Math.max(
    0,
    Math.round(
      Number(
        proposal.pricing?.final_total_cents ||
          proposal.pricing?.subtotal_cents ||
          0
      )
    )
  );
  const installmentsMax = Math.max(1, Number(proposal.pricing?.installments_max || 10));
  const installmentValueCents =
    proposal.pricing?.installment_value_cents && proposal.pricing.installment_value_cents > 0
      ? Math.round(proposal.pricing.installment_value_cents)
      : totalCents > 0
        ? Math.round(totalCents / installmentsMax)
        : null;

  const nightsCount = computeNightsBetween(
    proposal.travel_start_date,
    proposal.travel_end_date,
    proposal.hotels
  );

  const firstFlight = Array.isArray(proposal.flights) && proposal.flights.length > 0 ? proposal.flights[0] : null;
  const firstHotel = Array.isArray(proposal.hotels) && proposal.hotels.length > 0 ? proposal.hotels[0] : null;

  // Collect sanitized media URLs from cover, hotels, itinerary, and web_page
  const mediaSet = new Set<string>();
  if (proposal.cover_image_url) mediaSet.add(proposal.cover_image_url);
  if (params.storyMediaUrl) mediaSet.add(params.storyMediaUrl);
  if (params.groupMediaUrl) mediaSet.add(params.groupMediaUrl);
  for (const h of proposal.hotels || []) {
    if (h.image_url) mediaSet.add(h.image_url);
    for (const img of h.gallery_urls || []) {
      if (img) mediaSet.add(img);
    }
  }
  for (const d of proposal.itinerary || []) {
    if (d.image_url) mediaSet.add(d.image_url);
  }

  // Order transfers chronologically by date + pickup_time
  const orderedTransfers = [...(proposal.transfers || [])].sort((a, b) => {
    const keyA = `${a.date || ""}T${a.pickup_time || "00:00"}`;
    const keyB = `${b.date || ""}T${b.pickup_time || "00:00"}`;
    return keyA.localeCompare(keyB);
  });

  const slug = slugifyOfferTitle(cleanTitle, proposal.destination_city || "destino");
  const savingsPct = params.historicalCheck?.historicalSavingsPct ?? null;
  const historicalMedian = params.historicalCheck?.historicalMedianCents ?? null;
  const badgeKind: HotOfferBadgeKind =
    params.badgeKind || (savingsPct && savingsPct >= 15 ? "hot_black" : "hot_offer");
  const flameStyle: HotFlameStyle =
    params.flameStyle || (badgeKind === "hot_black" ? "hot_black" : "pixel_fire");

  const { summaryCopy } = buildHotOfferWhatsAppGroupCopy({
    title: cleanTitle,
    destinationCity: proposal.destination_city || "Destino",
    departureDate: proposal.travel_start_date || null,
    returnDate: proposal.travel_end_date || null,
    nightsCount,
    adultsCount: Math.max(1, proposal.adults_count || 2),
    priceCents: totalCents,
    installmentsMax,
    installmentValueCents,
    badgeKind,
    historicalSavingsPct: savingsPct,
    hotelHeadline: firstHotel?.hotel_name || null,
    includesHeadline: proposal.includes || [],
    appSlug: params.storeSlug || "agencia",
    offerIdOrSlug: slug,
    appOrigin: params.appOrigin,
  });

  const expiresHours = typeof params.expiresInHours === "number" && params.expiresInHours > 0 ? params.expiresInHours : 72;
  const expiresAt = new Date(Date.now() + expiresHours * 3_600_000).toISOString();

  return {
    store_id: params.storeId,
    source_proposal_id: proposal.id,
    source_quote_id: proposal.quote_id || null,
    tourism_experience_id: null,
    slug,
    title: cleanTitle,
    subtitle: cleanSubtitle,
    badge_kind: badgeKind,
    flame_style: flameStyle,
    destination_city: proposal.destination_city || "Destino",
    destination_state: null,
    destination_country: "Brasil",
    origin_city: firstFlight?.origin_city || null,
    origin_iata: firstFlight?.origin_code || null,
    destination_iata: firstFlight?.destination_code || null,
    departure_date: proposal.travel_start_date ? proposal.travel_start_date.slice(0, 10) : null,
    return_date: proposal.travel_end_date ? proposal.travel_end_date.slice(0, 10) : null,
    nights_count: nightsCount,
    adults_base_count: Math.max(1, Number(proposal.adults_count || 2)),
    children_base_count: Math.max(0, Number(proposal.children_count || 0)),
    price_cents: totalCents,
    original_price_cents:
      historicalMedian && historicalMedian * Math.max(1, Number(proposal.adults_count || 2)) > totalCents
        ? historicalMedian * Math.max(1, Number(proposal.adults_count || 2))
        : null,
    discount_pct: savingsPct && savingsPct > 0 ? Number(savingsPct.toFixed(2)) : null,
    historical_verdict: params.historicalCheck?.verdict || "insufficient_history",
    historical_savings_pct: savingsPct && savingsPct > 0 ? Number(savingsPct.toFixed(2)) : null,
    historical_median_cents: historicalMedian,
    installments_max: installmentsMax,
    installment_value_cents: installmentValueCents,
    pix_discount_pct: Number(proposal.pricing?.pix_discount_percent ?? 5),
    seats_left: 6,
    flights: proposal.flights || [],
    hotels: proposal.hotels || [],
    transfers: orderedTransfers,
    itinerary: (proposal.itinerary || []).map((day) => ({
      ...day,
      description: scrubLeadPiiFromText(day.description, piiContext),
    })),
    inclusions: [...(proposal.includes || [])],
    exclusions: [...(proposal.excludes || [])],
    media_urls: Array.from(mediaSet),
    story_media_url: params.storyMediaUrl || proposal.cover_image_url || Array.from(mediaSet)[0] || null,
    group_media_url: params.groupMediaUrl || proposal.cover_image_url || Array.from(mediaSet)[0] || null,
    whatsapp_copy_summary: params.customWhatsappCopy?.trim() || summaryCopy,
    boarding_requirements: proposal.boarding_requirements || null,
    cancellation_policy: proposal.cancellation_policy || null,
    status: "active",
    is_published_in_app: true,
    expires_at: expiresAt,
  };
}

/**
 * Verifies at runtime that a public `HotOfferDTO` object has zero forbidden PII keys or raw client values.
 */
export function assertHotOfferZeroPii(
  offer: Record<string, unknown>,
  originalClientPii?: {
    clientName?: string | null;
    clientWhatsapp?: string | null;
    clientEmail?: string | null;
    clientDocument?: string | null;
  }
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const forbiddenKey of FORBIDDEN_HOT_OFFER_PII_KEYS) {
    if (forbiddenKey in offer && offer[forbiddenKey] !== undefined && offer[forbiddenKey] !== null) {
      violations.push(`forbidden_key:${forbiddenKey}`);
    }
  }

  const serialized = JSON.stringify(offer).toLowerCase();
  if (originalClientPii?.clientName && originalClientPii.clientName.trim().length >= 4) {
    if (serialized.includes(originalClientPii.clientName.trim().toLowerCase())) {
      violations.push("leaked_client_name");
    }
  }
  if (originalClientPii?.clientEmail && originalClientPii.clientEmail.trim().length >= 5) {
    if (serialized.includes(originalClientPii.clientEmail.trim().toLowerCase())) {
      violations.push("leaked_client_email");
    }
  }
  if (originalClientPii?.clientWhatsapp) {
    const digits = originalClientPii.clientWhatsapp.replace(/\D/g, "");
    if (digits.length >= 9 && serialized.includes(digits)) {
      violations.push("leaked_client_whatsapp");
    }
  }
  if (originalClientPii?.clientDocument) {
    const docDigits = originalClientPii.clientDocument.replace(/\D/g, "");
    if (docDigits.length >= 9 && serialized.includes(docDigits)) {
      violations.push("leaked_client_document");
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

export interface ClientProposalInheritanceInput {
  masterOffer: HotOfferDTO;
  leadId?: string | null;
  clientName: string;
  clientWhatsapp: string;
  clientEmail?: string | null;
  adultsCount?: number;
  childrenCount?: number;
  childrenAges?: number[];
  rooms?: Array<{ adults: number; children: number; childrenAges?: number[]; roomType?: string }>;
  overridePriceCents?: number | null;
  overrideHotels?: HotelDTO[];
  overrideInstallmentsMax?: number | null;
  overrideNotes?: string | null;
}

export interface InheritedClientProposalPayload {
  store_id: string;
  source_offer_id: string;
  lead_id: string | null;
  client_name: string;
  client_whatsapp: string;
  client_email: string | null;
  title: string;
  subtitle: string | null;
  cover_image_url: string | null;
  destination_city: string;
  travel_start_date: string | null;
  travel_end_date: string | null;
  adults_count: number;
  children_count: number;
  rooms: Array<{ adults: number; children: number; childrenAges?: number[]; roomType?: string }>;
  flights: FlightSegmentDTO[];
  hotels: HotelDTO[];
  transfers: TransferDTO[];
  itinerary: ItineraryDayDTO[];
  includes: string[];
  excludes: string[];
  pricing: PricingBreakdownDTO;
  override_notes: string | null;
}

/**
 * Clones a Master Offer (`HotOfferDTO`) into an individual client's editable `travel_proposals` payload
 * with `source_offer_id = masterOffer.id`.
 * Editing the returned payload or applying overrides NEVER mutates `masterOffer`.
 */
export function buildClientProposalFromMasterOffer(
  input: ClientProposalInheritanceInput
): InheritedClientProposalPayload {
  const { masterOffer } = input;
  const baseAdults = Math.max(1, masterOffer.adults_base_count || 2);
  const targetAdults = Math.max(1, input.adultsCount ?? baseAdults);
  const targetChildrenAges = Array.isArray(input.childrenAges) ? [...input.childrenAges] : [];
  const targetChildren = Math.max(0, input.childrenCount ?? targetChildrenAges.length);

  const perAdultCents = Math.round(Math.max(0, masterOffer.price_cents) / baseAdults);
  // Child pricing rule: infants (<2y) 10% tax, children (2-11y) 65% of adult base, teens (12+) 100% of adult base
  let childrenAddCents = 0;
  if (targetChildren > 0) {
    for (let i = 0; i < targetChildren; i++) {
      const age = targetChildrenAges[i] ?? 6;
      if (age < 2) childrenAddCents += Math.round(perAdultCents * 0.1);
      else if (age < 12) childrenAddCents += Math.round(perAdultCents * 0.65);
      else childrenAddCents += perAdultCents;
    }
  }

  const computedTotalCents =
    typeof input.overridePriceCents === "number" && input.overridePriceCents >= 0
      ? Math.round(input.overridePriceCents)
      : targetAdults * perAdultCents + childrenAddCents;

  const installmentsMax = Math.max(1, input.overrideInstallmentsMax ?? masterOffer.installments_max ?? 10);
  const installmentValueCents = Math.round(computedTotalCents / installmentsMax);
  const pixDiscountPct = Number(masterOffer.pix_discount_pct ?? 5);
  const pixTotalCents = Math.round(computedTotalCents * (1 - pixDiscountPct / 100));

  const clonedHotels: HotelDTO[] = JSON.parse(
    JSON.stringify(input.overrideHotels && input.overrideHotels.length > 0 ? input.overrideHotels : masterOffer.hotels || [])
  );
  const clonedFlights: FlightSegmentDTO[] = JSON.parse(JSON.stringify(masterOffer.flights || []));
  const clonedTransfers: TransferDTO[] = JSON.parse(JSON.stringify(masterOffer.transfers || []));
  const clonedItinerary: ItineraryDayDTO[] = JSON.parse(JSON.stringify(masterOffer.itinerary || []));

  const rooms =
    input.rooms && input.rooms.length > 0
      ? JSON.parse(JSON.stringify(input.rooms))
      : [
          {
            adults: targetAdults,
            children: targetChildren,
            childrenAges: targetChildrenAges,
            roomType: clonedHotels[0]?.room_type || "Standard",
          },
        ];

  return {
    store_id: masterOffer.store_id,
    source_offer_id: masterOffer.id,
    lead_id: input.leadId || null,
    client_name: input.clientName.trim(),
    client_whatsapp: input.clientWhatsapp.trim(),
    client_email: input.clientEmail?.trim() || null,
    title: `${masterOffer.title} — ${input.clientName.trim().split(/\s+/)[0] || "Cliente"}`,
    subtitle: masterOffer.subtitle || null,
    cover_image_url: masterOffer.story_media_url || masterOffer.media_urls[0] || null,
    destination_city: masterOffer.destination_city,
    travel_start_date: masterOffer.departure_date || null,
    travel_end_date: masterOffer.return_date || null,
    adults_count: targetAdults,
    children_count: targetChildren,
    rooms,
    flights: clonedFlights,
    hotels: clonedHotels,
    transfers: clonedTransfers,
    itinerary: clonedItinerary,
    includes: [...(masterOffer.inclusions || [])],
    excludes: [...(masterOffer.exclusions || [])],
    pricing: {
      currency: "BRL",
      base_price_cents: computedTotalCents,
      boarding_tax_cents: 0,
      other_taxes_cents: 0,
      discount_cents: 0,
      total_price_cents: computedTotalCents,
      subtotal_cents: computedTotalCents,
      taxes_cents: 0,
      final_total_cents: computedTotalCents,
      price_per_person_cents: Math.round(computedTotalCents / Math.max(1, targetAdults + targetChildren)),
      installments_max: installmentsMax,
      installment_value_cents: installmentValueCents,
      installments_options: [
        {
          installments_count: installmentsMax,
          installment_value_cents: installmentValueCents || Math.round(computedTotalCents / installmentsMax),
          method: "credit_card",
        },
      ],
      pix_discount_percent: pixDiscountPct,
      pix_total_cents: pixTotalCents,
      payment_notes: input.overrideNotes || null,
    },
    override_notes: input.overrideNotes || null,
  };
}

/**
 * Applies a surgical per-client override (e.g., adding 1 child, changing room type, hotel, or price)
 * to an existing inherited client proposal without touching the Master Offer or sibling proposals.
 */
export function applyClientOverrideToInheritedProposal(
  proposal: InheritedClientProposalPayload,
  override: {
    adultsCount?: number;
    childrenCount?: number;
    childrenAges?: number[];
    roomType?: string;
    hotelName?: string;
    overridePriceCents?: number;
    installmentsMax?: number;
    overrideNotes?: string;
  },
  masterOfferBasePerAdultCents?: number
): InheritedClientProposalPayload {
  const next: InheritedClientProposalPayload = JSON.parse(JSON.stringify(proposal));
  const prevPax = Math.max(1, next.adults_count);
  const currentTotal = next.pricing.final_total_cents ?? next.pricing.total_price_cents ?? 0;
  const perAdultBase =
    typeof masterOfferBasePerAdultCents === "number" && masterOfferBasePerAdultCents > 0
      ? masterOfferBasePerAdultCents
      : Math.round(currentTotal / prevPax);

  if (typeof override.adultsCount === "number" && override.adultsCount >= 1) {
    next.adults_count = override.adultsCount;
  }
  const childAges = Array.isArray(override.childrenAges)
    ? [...override.childrenAges]
    : next.rooms[0]?.childrenAges || [];
  if (typeof override.childrenCount === "number" && override.childrenCount >= 0) {
    next.children_count = override.childrenCount;
  } else if (Array.isArray(override.childrenAges)) {
    next.children_count = override.childrenAges.length;
  }

  if (override.hotelName && next.hotels.length > 0) {
    next.hotels[0] = {
      ...next.hotels[0],
      hotel_name: override.hotelName,
      ...(override.roomType ? { room_type: override.roomType } : {}),
    };
  } else if (override.roomType && next.hotels.length > 0) {
    next.hotels[0] = {
      ...next.hotels[0],
      room_type: override.roomType,
    };
  }

  next.rooms = [
    {
      adults: next.adults_count,
      children: next.children_count,
      childrenAges: childAges,
      roomType: override.roomType || next.rooms[0]?.roomType || next.hotels[0]?.room_type || "Standard",
    },
  ];

  let newTotalCents = next.pricing.final_total_cents ?? next.pricing.total_price_cents ?? 0;
  if (typeof override.overridePriceCents === "number" && override.overridePriceCents >= 0) {
    newTotalCents = Math.round(override.overridePriceCents);
  } else {
    let chdSum = 0;
    for (let i = 0; i < next.children_count; i++) {
      const age = childAges[i] ?? 6;
      if (age < 2) chdSum += Math.round(perAdultBase * 0.1);
      else if (age < 12) chdSum += Math.round(perAdultBase * 0.65);
      else chdSum += perAdultBase;
    }
    newTotalCents = next.adults_count * perAdultBase + chdSum;
  }

  const installmentsMax = Math.max(1, override.installmentsMax ?? next.pricing.installments_max ?? 10);
  const pixPct = Number(next.pricing.pix_discount_percent ?? 5);

  next.pricing = {
    ...next.pricing,
    base_price_cents: newTotalCents,
    total_price_cents: newTotalCents,
    subtotal_cents: newTotalCents,
    final_total_cents: newTotalCents,
    price_per_person_cents: Math.round(newTotalCents / Math.max(1, next.adults_count + next.children_count)),
    installments_max: installmentsMax,
    installment_value_cents: Math.round(newTotalCents / installmentsMax),
    installments_options: [
      {
        installments_count: installmentsMax,
        installment_value_cents: Math.round(newTotalCents / installmentsMax),
        method: "credit_card",
      },
    ],
    pix_total_cents: Math.round(newTotalCents * (1 - pixPct / 100)),
    payment_notes: override.overrideNotes ?? next.override_notes,
  };

  if (override.overrideNotes !== undefined) {
    next.override_notes = override.overrideNotes;
  }

  return next;
}
