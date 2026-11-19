/**
 * quote-ocr-normalizer.ts — Pós-processador Determinístico de Cotações B2B & Construtor de Roteiro Base
 *
 * Corrige bugs de conversão monetária (centavos vs reais), separa linhas combinadas
 * (ex.: "Transfer ... + Passeio City Tour"), preserva N transfers nomeados/precificados,
 * N hotéis em sequência, N passeios datados, calcula confiança por campo e gera roteiro
 * dia a dia coerente a partir das datas, hotéis, voos, traslados e passeios reais.
 */

import {
  normalizeTransferItem,
  resolveTransferKind,
} from "./proposal-normalization";

export interface NormalizedExtractedFlight {
  airline?: string;
  airline_name?: string;
  flight_number?: string;
  origin_iata?: string;
  origin_city?: string;
  destination_iata?: string;
  destination_city?: string;
  departure_time?: string;
  arrival_time?: string;
  date?: string;
  departure_date?: string;
  baggage?: string;
  baggage_included?: string;
  connections_count?: number;
  stops_count?: number;
  cabin_class?: string;
  duration?: string;
  connection_wait?: string;
}

export interface NormalizedExtractedHotel {
  hotel_name: string;
  city?: string | null;
  room_category?: string | null;
  meal_plan?: string | null;
  checkin_date?: string | null;
  checkout_date?: string | null;
  nights_count?: number | null;
  stars?: number | null;
  address?: string | null;
  price_cents?: number | null;
}

export interface NormalizedExtractedTransfer {
  id: string;
  name: string;
  title: string;
  kind: "arrival" | "departure" | "round_trip" | "intercity" | "service" | "bus";
  type: string;
  route_name: string;
  route: string;
  vehicle: string;
  vehicle_type: string;
  is_private: boolean;
  date?: string;
  included: boolean;
  price_cents: number;
  notes?: string;
}

export interface NormalizedExtractedTour {
  id: string;
  title: string;
  description: string;
  date?: string;
  duration?: string;
  included: boolean;
  is_included: boolean;
  price_cents: number;
  notes?: string;
}

export interface QuoteFieldConfidenceMap {
  destination: number;
  dates: number;
  pax: number;
  flights: number;
  hotels: number;
  transfers: number;
  tours: number;
  pricing: number;
}

export interface NormalizedQuoteExtractionEnvelope {
  client_name?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
  client_document?: string | null;
  operator_name?: string | null;
  quote_reference_number?: string | null;
  origin?: string | null;
  destination: string;
  travel_start?: string | null;
  travel_end?: string | null;
  adults_count?: number | null;
  children_count?: number | null;
  infants_count?: number | null;
  children_ages?: number[] | null;
  flights: NormalizedExtractedFlight[];
  hotels: NormalizedExtractedHotel[];
  transfers: NormalizedExtractedTransfer[];
  tours: NormalizedExtractedTour[];
  inclusions: string[];
  exclusions: string[];
  taxes_cents?: number | null;
  products_subtotal_cents?: number | null;
  gross_price_cents?: number | null;
  operator_net_cents?: number | null;
  suggested_commission_cents?: number | null;
  max_installments?: number | null;
  installment_cents?: number | null;
  has_downpayment?: boolean | null;
  downpayment_pct?: number | null;
  downpayment_cents?: number | null;
  first_installment_due?: string | null;
  pix_discount_pct?: number | null;
  card_installments?: number | null;
  boleto_installments?: number | null;
  currency?: string | null;
  cancellation_rules?: string | null;
  notes?: string | null;
  raw_itinerary_lines?: string[];
  confidence_by_field: QuoteFieldConfidenceMap;
  review_flags: string[];
}

export function parseMoneyToCents(
  val: unknown,
  options?: { keyIsCents?: boolean },
): number | undefined {
  if (val === null || val === undefined || val === "") return undefined;
  const keyIsCents = Boolean(options?.keyIsCents);

  if (typeof val === "number") {
    if (!Number.isFinite(val)) return undefined;
    if (val === 0) return 0;
    if (!Number.isInteger(val)) return Math.round(val * 100);
    // Se a chave já termina com _cents (ex.: gross_price_cents: 24306), nunca multiplicar por 100
    if (keyIsCents) return Math.round(val);
    return Math.round(val * 100);
  }

  if (typeof val === "string") {
    const cleaned = val.replace(/[^\d.,-]/g, "").trim();
    if (!cleaned) return undefined;

    if (cleaned.includes(",")) {
      // Formato brasileiro "4.683,38" ou "243,06"
      const num = parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
      return Number.isFinite(num) ? Math.round(num * 100) : undefined;
    }

    if (cleaned.includes(".")) {
      const parts = cleaned.split(".");
      const lastPart = parts[parts.length - 1] || "";
      if (lastPart.length <= 2) {
        const normalized = parts.slice(0, -1).join("") + "." + lastPart;
        const num = parseFloat(normalized);
        return Number.isFinite(num) ? Math.round(num * 100) : undefined;
      }
      // Separador de milhar sem decimais ex: "5.480"
      const num = parseInt(cleaned.replace(/\./g, ""), 10);
      return Number.isFinite(num) ? (keyIsCents ? num : num * 100) : undefined;
    }

    const num = parseInt(cleaned, 10);
    if (!Number.isFinite(num)) return undefined;
    return keyIsCents ? num : num * 100;
  }

  return undefined;
}

const PROMO_PREFIX_RE =
  /^(?:BLACK\s+FRIDAY\s+FRT\s*[:\-|]\s*|ESQUENTA\s+BLACK\s+FRT\s*[:\-|]\s*|OFERTA\s+REL[ÂA]MPAGO\s*[:\-|]\s*|PROMO(?:[ÇC][ÃA]O)?\s*[:\-|]\s*)/i;

export function cleanOperatorPromoPrefix(text: string): string {
  return String(text || "").replace(PROMO_PREFIX_RE, "").replace(/\s+/g, " ").trim();
}

const COMBINED_TOUR_SPLIT_RE =
  /\s*\+\s*(?=(?:passeio|city\s*tour|tour|ingresso|ticket|combo|parque|aquapark|aqua\s*park|beach\s*park|buggy|catamar[aã]|escuna|mergulho|bate\s*e\s*volta|experi[êe]ncia)\b)/i;

const TOUR_LIKE_ROW_RE =
  /^(?:passeio|city\s*tour|tour|ingresso|combo\b.*\bingresso|praia\s+de\b|praia\s+dos\b|cabo\s+de\b|maragogi|beach\s*park|aqua\s*park)/i;

function normalizeDateToken(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const brFull = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brFull) return `${brFull[3]}-${brFull[2]}-${brFull[1]}`;
  return trimmed;
}

function inferVehicleFromText(text: string): string {
  const lower = text.toLowerCase();
  if (/\b4x4\b|hilux|jardineira|buggy/.test(lower)) return "Veículo 4x4";
  if (/privativ|vip|exclusiv/.test(lower)) return "Veículo Privativo";
  if (/van\b/.test(lower)) return "Van Executiva";
  if (/leito\s*dd|double\s*decker/.test(lower)) return "Ônibus Leito DD";
  if (/[oô]nibus|semi-leito/.test(lower)) return "Ônibus Executivo";
  if (/sedan|executivo/.test(lower)) return "Carro Executivo";
  if (/regular|compartilhado/.test(lower)) return "Transfer Regular";
  return "Transfer Regular";
}

function splitTransferAndCombinedTours(rawItem: unknown, idx: number): {
  transfer: NormalizedExtractedTransfer | null;
  tours: NormalizedExtractedTour[];
} {
  const tours: NormalizedExtractedTour[] = [];
  const obj: Record<string, any> | null =
    typeof rawItem === "string"
      ? { route_name: rawItem, name: rawItem }
      : rawItem && typeof rawItem === "object"
        ? ({ ...(rawItem as Record<string, any>) })
        : null;
  if (!obj) return { transfer: null, tours };

  const rawTitle = cleanOperatorPromoPrefix(
    String(obj.name || obj.title || obj.route_name || obj.route || obj.description || "").trim(),
  );
  if (!rawTitle) return { transfer: null, tours };

  // Preço do item
  const priceCents =
    parseMoneyToCents(obj.price_cents, { keyIsCents: true }) ??
    parseMoneyToCents(obj.price ?? obj.total ?? obj.valor, { keyIsCents: false }) ??
    0;

  // Data
  const cleanDate = normalizeDateToken(obj.date);

  // Se o próprio item é puramente um passeio/ingresso que caiu na lista de transfers
  if (TOUR_LIKE_ROW_RE.test(rawTitle) && !/transfer|transporte|traslado|cadeirinha/i.test(rawTitle)) {
    tours.push({
      id: typeof obj.id === "string" && obj.id ? obj.id : `tour-ocr-${idx + 1}`,
      title: rawTitle,
      description: typeof obj.notes === "string" ? obj.notes : "",
      date: cleanDate,
      duration: typeof obj.duration === "string" ? obj.duration : undefined,
      included: typeof obj.included === "boolean" ? obj.included : true,
      is_included: typeof obj.included === "boolean" ? obj.included : true,
      price_cents: priceCents,
      notes: typeof obj.notes === "string" ? obj.notes : undefined,
    });
    return { transfer: null, tours };
  }

  // Separa "+ Passeio City Tour ..." em transfer + passeio estruturado
  const splitParts = rawTitle.split(COMBINED_TOUR_SPLIT_RE).map((s) => s.trim()).filter(Boolean);
  const transferPart = splitParts[0] || rawTitle;
  const embeddedTourParts = splitParts.slice(1);

  for (let tIdx = 0; tIdx < embeddedTourParts.length; tIdx++) {
    const tourName = cleanOperatorPromoPrefix(embeddedTourParts[tIdx]);
    if (!tourName) continue;
    tours.push({
      id: `tour-split-${idx + 1}-${tIdx + 1}`,
      title: tourName,
      description: `Atividade vinculada ao receptivo (${transferPart})`,
      date: cleanDate,
      included: true,
      is_included: true,
      price_cents: 0,
    });
  }

  const kind = obj.kind
    ? obj.kind
    : resolveTransferKind(obj.type, `${transferPart} ${obj.notes || ""}`);
  const vehicle =
    (typeof obj.vehicle_type === "string" && obj.vehicle_type.trim() && obj.vehicle_type !== "Transfer Regular"
      ? obj.vehicle_type.trim()
      : undefined) ||
    (typeof obj.vehicle === "string" && obj.vehicle.trim() && obj.vehicle !== "Transfer Regular"
      ? obj.vehicle.trim()
      : undefined) ||
    inferVehicleFromText(transferPart);

  const normalizedTr = normalizeTransferItem(
    {
      ...obj,
      id: typeof obj.id === "string" && obj.id ? obj.id : `tr-ocr-${idx + 1}`,
      name: transferPart,
      title: transferPart,
      route_name: transferPart,
      route: transferPart,
      kind,
      vehicle,
      vehicle_type: vehicle,
      date: cleanDate,
      is_private:
        typeof obj.is_private === "boolean"
          ? obj.is_private
          : /privativ|vip|exclusiv/i.test(`${transferPart} ${vehicle}`),
      included: typeof obj.included === "boolean" ? obj.included : true,
      price_cents: priceCents,
    },
    idx,
  ) as NormalizedExtractedTransfer;

  return { transfer: normalizedTr, tours };
}

export function normalizeExtractedQuoteResult(rawJson: Record<string, any>): NormalizedQuoteExtractionEnvelope {
  const safe = rawJson && typeof rawJson === "object" ? { ...rawJson } : {};

  // Destino limpo
  let destination = String(safe.destination || "").trim();
  if (!destination || destination === "Destino a definir") {
    const firstHotelCity = Array.isArray(safe.hotels) ? safe.hotels[0]?.city : undefined;
    const firstFlightDest = Array.isArray(safe.flights)
      ? safe.flights[0]?.destination_city || safe.flights[0]?.destination_iata
      : undefined;
    destination = String(firstHotelCity || firstFlightDest || "Destino a definir").trim();
  }

  // Hotéis normalizados
  const rawHotels = Array.isArray(safe.hotels) ? safe.hotels : [];
  const hotels: NormalizedExtractedHotel[] = rawHotels
    .filter((h: any) => h && typeof h === "object" && String(h.hotel_name || h.name || "").trim())
    .map((h: any) => ({
      hotel_name: cleanOperatorPromoPrefix(String(h.hotel_name || h.name)),
      city: h.city ? String(h.city).trim() : null,
      room_category: h.room_category || h.room_type ? String(h.room_category || h.room_type).trim() : null,
      meal_plan: h.meal_plan || h.board_basis ? String(h.meal_plan || h.board_basis).trim() : null,
      checkin_date: normalizeDateToken(h.checkin_date || h.check_in) || null,
      checkout_date: normalizeDateToken(h.checkout_date || h.check_out) || null,
      nights_count: typeof h.nights_count === "number" && Number.isFinite(h.nights_count) ? Math.round(h.nights_count) : null,
      stars: typeof h.stars === "number" && Number.isFinite(h.stars) ? Math.round(h.stars) : null,
      address: h.address ? String(h.address).trim() : null,
      price_cents:
        parseMoneyToCents(h.price_cents, { keyIsCents: true }) ??
        parseMoneyToCents(h.price ?? h.valor_total ?? h.total, { keyIsCents: false }) ??
        null,
    }));

  // Voos normalizados
  const rawFlights = Array.isArray(safe.flights) ? safe.flights : [];
  const flights: NormalizedExtractedFlight[] = rawFlights
    .filter((f: any) => f && typeof f === "object")
    .map((f: any) => ({
      airline: f.airline || f.airline_name || undefined,
      airline_name: f.airline_name || f.airline || undefined,
      flight_number: f.flight_number ? String(f.flight_number).trim() : undefined,
      origin_iata: f.origin_iata ? String(f.origin_iata).toUpperCase().trim() : undefined,
      origin_city: f.origin_city ? String(f.origin_city).trim() : undefined,
      destination_iata: f.destination_iata ? String(f.destination_iata).toUpperCase().trim() : undefined,
      destination_city: f.destination_city ? String(f.destination_city).trim() : undefined,
      departure_time: f.departure_time ? String(f.departure_time).trim() : undefined,
      arrival_time: f.arrival_time ? String(f.arrival_time).trim() : undefined,
      date: normalizeDateToken(f.date || f.departure_date),
      departure_date: normalizeDateToken(f.departure_date || f.date),
      baggage: f.baggage || f.baggage_included || undefined,
      baggage_included: f.baggage_included || f.baggage || undefined,
      connections_count:
        typeof (f.connections_count ?? f.stops_count) === "number"
          ? Math.max(0, Math.round(f.connections_count ?? f.stops_count))
          : 0,
      stops_count:
        typeof (f.stops_count ?? f.connections_count) === "number"
          ? Math.max(0, Math.round(f.stops_count ?? f.connections_count))
          : 0,
      cabin_class: f.cabin_class ? String(f.cabin_class).trim() : undefined,
      duration: f.duration ? String(f.duration).trim() : undefined,
      connection_wait: f.connection_wait ? String(f.connection_wait).trim() : undefined,
    }));

  // Transfers & tours combinados
  const rawTransfers = Array.isArray(safe.transfers) ? safe.transfers : [];
  const transfers: NormalizedExtractedTransfer[] = [];
  const extractedEmbeddedTours: NormalizedExtractedTour[] = [];

  for (let i = 0; i < rawTransfers.length; i++) {
    const { transfer, tours: splitTours } = splitTransferAndCombinedTours(rawTransfers[i], i);
    if (transfer) transfers.push(transfer);
    if (splitTours.length > 0) extractedEmbeddedTours.push(...splitTours);
  }

  // Tours explícitos
  const rawTours = Array.isArray(safe.tours) ? safe.tours : [];
  const explicitTours: NormalizedExtractedTour[] = rawTours
    .filter(Boolean)
    .map((t: any, idx: number) => {
      if (typeof t === "string") {
        const cleanTitle = cleanOperatorPromoPrefix(t);
        return {
          id: `tour-ocr-${idx + 1}`,
          title: cleanTitle,
          description: "",
          included: true,
          is_included: true,
          price_cents: 0,
        };
      }
      const cleanTitle = cleanOperatorPromoPrefix(String(t.title || t.name || t.description || `Passeio ${idx + 1}`));
      const pCents =
        parseMoneyToCents(t.price_cents, { keyIsCents: true }) ??
        parseMoneyToCents(t.price ?? t.valor_total ?? t.total, { keyIsCents: false }) ??
        0;
      const isIncluded = typeof t.included === "boolean" ? t.included : typeof t.is_included === "boolean" ? t.is_included : true;
      return {
        id: typeof t.id === "string" && t.id ? t.id : `tour-ocr-${idx + 1}`,
        title: cleanTitle,
        description: typeof t.description === "string" && t.description !== cleanTitle ? t.description.trim() : "",
        date: normalizeDateToken(t.date),
        duration: typeof t.duration === "string" ? t.duration.trim() : undefined,
        included: isIncluded,
        is_included: isIncluded,
        price_cents: pCents,
        notes: typeof t.notes === "string" ? t.notes.trim() : undefined,
      };
    });

  // Também extrai "+ Passeio..." caso tenha vindo dentro de inclusions[]
  const rawInclusions: string[] = Array.isArray(safe.inclusions)
    ? safe.inclusions.map((s: any) => String(s || "").trim()).filter(Boolean)
    : [];

  for (let i = 0; i < rawInclusions.length; i++) {
    const inc = rawInclusions[i];
    if (COMBINED_TOUR_SPLIT_RE.test(inc)) {
      const parts = inc.split(COMBINED_TOUR_SPLIT_RE).slice(1);
      for (const part of parts) {
        const cleanName = cleanOperatorPromoPrefix(part);
        if (cleanName) {
          extractedEmbeddedTours.push({
            id: `tour-inc-${i + 1}`,
            title: cleanName,
            description: "",
            included: true,
            is_included: true,
            price_cents: 0,
          });
        }
      }
    }
  }

  // Deduplica tours pelo título normalizado sem perder datas/preços
  const toursMap = new Map<string, NormalizedExtractedTour>();
  for (const tour of [...explicitTours, ...extractedEmbeddedTours]) {
    if (!tour.title) continue;
    const key = tour.title.toLowerCase().replace(/\s+/g, " ").trim();
    const existing = toursMap.get(key);
    if (!existing) {
      toursMap.set(key, tour);
    } else {
      toursMap.set(key, {
        ...existing,
        date: existing.date || tour.date,
        duration: existing.duration || tour.duration,
        description: existing.description || tour.description,
        price_cents: existing.price_cents > 0 ? existing.price_cents : tour.price_cents,
      });
    }
  }
  const tours = Array.from(toursMap.values());

  // Garante inclusões limpas + passeios inclusos refletidos
  const inclusionsSet = new Set<string>(rawInclusions);
  for (const tour of tours) {
    if (tour.included && !Array.from(inclusionsSet).some((x) => x.toLowerCase().includes(tour.title.toLowerCase()))) {
      inclusionsSet.add(tour.title);
    }
  }

  // Datas globais inferidas de voos/hotéis quando ausentes
  const travelStart =
    normalizeDateToken(safe.travel_start) ||
    flights[0]?.departure_date ||
    hotels[0]?.checkin_date ||
    null;
  const travelEnd =
    normalizeDateToken(safe.travel_end) ||
    flights[flights.length - 1]?.departure_date ||
    hotels[hotels.length - 1]?.checkout_date ||
    null;

  // Financeiro seguro (nunca multiplica _cents por 100 indevidamente)
  const extractFieldCents = (centsVal: unknown, fallbackRawVal: unknown): number | null => {
    const p1 = parseMoneyToCents(centsVal, { keyIsCents: true });
    if (p1 !== undefined) return p1;
    const p2 = parseMoneyToCents(fallbackRawVal, { keyIsCents: false });
    return p2 ?? null;
  };

  const grossPriceCents = extractFieldCents(safe.gross_price_cents, safe.total ?? safe.valor_total);
  const operatorNetCents = extractFieldCents(safe.operator_net_cents, safe.net_price);
  const taxesCents = extractFieldCents(safe.taxes_cents, safe.impostos_taxas ?? safe.taxas);
  const productsSubtotalCents = extractFieldCents(safe.products_subtotal_cents, safe.tarifa ?? safe.produtos);
  const downpaymentCents = extractFieldCents(safe.downpayment_cents, safe.entrada);
  const installmentCents = extractFieldCents(safe.installment_cents, safe.valor_parcela);

  // Confiança por campo & alertas de revisão
  const confidence: QuoteFieldConfidenceMap = {
    destination: destination !== "Destino a definir" ? 0.92 : 0.35,
    dates: travelStart && travelEnd ? 0.94 : travelStart ? 0.65 : 0.3,
    pax: (safe.adults_count ?? 0) > 0 ? 0.92 : 0.45,
    flights: flights.length > 0 ? (flights.some((f) => f.origin_iata && f.destination_iata) ? 0.9 : 0.65) : 0.5,
    hotels: hotels.length > 0 ? (hotels.every((h) => h.checkin_date && h.checkout_date) ? 0.92 : 0.72) : 0.5,
    transfers:
      transfers.length > 0
        ? transfers.every((t) => t.name && !/^transfer aeroporto/i.test(t.name) || t.price_cents > 0)
          ? 0.9
          : 0.7
        : 0.75,
    tours: tours.length > 0 ? 0.9 : 0.8,
    pricing: grossPriceCents && grossPriceCents > 0 ? 0.95 : 0.35,
  };

  const reviewFlags: string[] = [];
  if (confidence.destination < 0.6) reviewFlags.push("Destino não identificado com segurança (Revisar)");
  if (confidence.dates < 0.6) reviewFlags.push("Datas de embarque/retorno incompletas (Revisar)");
  if (confidence.pricing < 0.6) reviewFlags.push("Valor total da cotação ausente (Revisar)");
  if (hotels.some((h) => !h.checkin_date || !h.checkout_date)) {
    reviewFlags.push("Hospedagem sem check-in/check-out completo (Revisar)");
  }
  if (transfers.some((t) => !t.name || t.name === "in_out")) {
    reviewFlags.push("Traslado sem rota nominal definida (Revisar)");
  }

  return {
    client_name: safe.client_name ? String(safe.client_name).trim() : null,
    client_phone: safe.client_phone ? String(safe.client_phone).trim() : null,
    client_email: safe.client_email ? String(safe.client_email).trim() : null,
    client_document: safe.client_document ? String(safe.client_document).trim() : null,
    operator_name: safe.operator_name ? String(safe.operator_name).trim() : null,
    quote_reference_number: safe.quote_reference_number ? String(safe.quote_reference_number).trim() : null,
    origin: safe.origin ? String(safe.origin).trim() : null,
    destination,
    travel_start: travelStart,
    travel_end: travelEnd,
    adults_count: typeof safe.adults_count === "number" ? safe.adults_count : null,
    children_count: typeof safe.children_count === "number" ? safe.children_count : null,
    infants_count: typeof safe.infants_count === "number" ? safe.infants_count : null,
    children_ages: Array.isArray(safe.children_ages) ? safe.children_ages : null,
    flights,
    hotels,
    transfers,
    tours,
    inclusions: Array.from(inclusionsSet),
    exclusions: Array.isArray(safe.exclusions)
      ? safe.exclusions.map((s: any) => String(s || "").trim()).filter(Boolean)
      : [],
    taxes_cents: taxesCents,
    products_subtotal_cents: productsSubtotalCents,
    gross_price_cents: grossPriceCents,
    operator_net_cents: operatorNetCents,
    suggested_commission_cents: extractFieldCents(safe.suggested_commission_cents, undefined),
    max_installments: typeof safe.max_installments === "number" ? safe.max_installments : null,
    installment_cents: installmentCents,
    has_downpayment: typeof safe.has_downpayment === "boolean" ? safe.has_downpayment : null,
    downpayment_pct: typeof safe.downpayment_pct === "number" ? safe.downpayment_pct : null,
    downpayment_cents: downpaymentCents,
    first_installment_due: safe.first_installment_due ? String(safe.first_installment_due).trim() : null,
    pix_discount_pct: typeof safe.pix_discount_pct === "number" ? safe.pix_discount_pct : null,
    card_installments: typeof safe.card_installments === "number" ? safe.card_installments : null,
    boleto_installments: typeof safe.boleto_installments === "number" ? safe.boleto_installments : null,
    currency: safe.currency ? String(safe.currency).trim() : "BRL",
    cancellation_rules: safe.cancellation_rules ? String(safe.cancellation_rules).trim() : null,
    notes: safe.notes ? String(safe.notes).trim() : null,
    raw_itinerary_lines: Array.isArray(safe.raw_itinerary_lines)
      ? safe.raw_itinerary_lines.map((l: any) => String(l || "").trim()).filter(Boolean)
      : undefined,
    confidence_by_field: confidence,
    review_flags: reviewFlags,
  };
}

// ─── Construtor Determinístico de Roteiro Dia a Dia (Nunca Falha Vazio) ───────

export interface DeterministicItineraryDayInput {
  destination: string;
  startDate?: string | null;
  endDate?: string | null;
  flights?: Array<{ origin_city?: string; origin_iata?: string; destination_city?: string; destination_iata?: string; departure_time?: string; arrival_time?: string; departure_date?: string }>;
  hotels?: Array<{ hotel_name?: string; city?: string; destination?: string; checkin_date?: string; checkout_date?: string; check_in?: string; check_out?: string; board_basis?: string; meal_plan?: string; nights_count?: number }>;
  transfers?: Array<{ name?: string; title?: string; route_name?: string; route?: string; date?: string; kind?: string }>;
  tours?: Array<{ title?: string; description?: string; date?: string; duration?: string }>;
  rawItineraryLines?: string[];
}

function addDaysIso(isoDate: string, daysToAdd: number): string {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  const utc = new Date(Date.UTC(y, m - 1, d + daysToAdd));
  return utc.toISOString().slice(0, 10);
}

function diffDaysIso(startIso?: string | null, endIso?: string | null): number {
  if (!startIso || !endIso) return 0;
  const s = Date.parse(`${startIso.slice(0, 10)}T00:00:00Z`);
  const e = Date.parse(`${endIso.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return 0;
  return Math.min(30, Math.round((e - s) / 86400000) + 1);
}

function inferMealsFromBoardBasis(boardBasis?: string): string[] {
  const lower = String(boardBasis || "").toLowerCase();
  if (/all\s*inclusive/.test(lower)) return ["Café da manhã", "Almoço", "Jantar", "All Inclusive"];
  if (/pens[ãa]o\s*completa/.test(lower)) return ["Café da manhã", "Almoço", "Jantar"];
  if (/meia\s*pens[ãa]o|caf[eé]\s*e\s*jantar/.test(lower)) return ["Café da manhã", "Jantar"];
  if (/caf[eé]/.test(lower)) return ["Café da manhã"];
  return [];
}

export function buildDeterministicProposalItinerary(input: DeterministicItineraryDayInput): Array<{
  id: string;
  day_number: number;
  date?: string;
  title: string;
  description: string;
  location?: string;
  included_meals?: string[];
}> {
  const dest = (input.destination || "Destino").trim();
  const hotels = Array.isArray(input.hotels) ? input.hotels : [];
  const tours = Array.isArray(input.tours) ? input.tours : [];
  const transfers = Array.isArray(input.transfers) ? input.transfers : [];
  const flights = Array.isArray(input.flights) ? input.flights : [];
  const rawLines = Array.isArray(input.rawItineraryLines) ? input.rawItineraryLines.filter(Boolean) : [];

  // 1. Se o documento enviado já trouxe linhas explícitas de roteiro ("Dia 1:", etc.)
  if (rawLines.length >= 2) {
    return rawLines.map((line, idx) => {
      const cleaned = line.replace(/^dia\s*\d+\s*[:\-•–]?\s*/i, "").trim();
      const [firstClause, ...rest] = cleaned.split(/\.\s+/);
      const dayDate = input.startDate ? addDaysIso(input.startDate, idx) : undefined;
      return {
        id: `day-ocr-${idx + 1}`,
        day_number: idx + 1,
        date: dayDate || undefined,
        title: firstClause ? firstClause.slice(0, 72) : `Dia ${idx + 1} • ${dest}`,
        description: rest.length > 0 ? rest.join(". ") : cleaned,
        location: dest,
      };
    });
  }

  // 2. Calcula duração real pelas datas, soma de noites ou quantidade de passeios
  const totalHotelNights = hotels.reduce((sum, h) => {
    const ci = h.checkin_date || h.check_in;
    const co = h.checkout_date || h.check_out;
    const dCount = ci && co ? Math.max(1, diffDaysIso(ci, co) - 1) : 0;
    return sum + (Number(h.nights_count) || dCount || 0);
  }, 0);

  let totalDays = diffDaysIso(input.startDate, input.endDate);
  if (totalDays <= 0 && totalHotelNights > 0) totalDays = totalHotelNights + 1;
  if (totalDays <= 0 && tours.length > 0) totalDays = tours.length + 2;
  if (totalDays <= 0) totalDays = 4;

  const assignedUndatedTours = new Set<number>();
  const days = [];

  for (let i = 0; i < totalDays; i++) {
    const dayNumber = i + 1;
    const currentDate = input.startDate ? addDaysIso(input.startDate, i) : undefined;

    // Encontra o hotel ativo nesta data (ou por ordem)
    const activeHotel =
      (currentDate
        ? hotels.find((h) => {
            const ci = String(h.checkin_date || h.check_in || "").slice(0, 10);
            const co = String(h.checkout_date || h.check_out || "").slice(0, 10);
            return ci && co && currentDate >= ci && currentDate <= co;
          })
        : undefined) ||
      (hotels.length > 0
        ? hotels[Math.min(hotels.length - 1, Math.floor((i * hotels.length) / totalDays))]
        : undefined);

    const activeHotelName = activeHotel?.hotel_name || "";
    const activeLocation = activeHotel?.city || activeHotel?.destination || dest;
    const meals = i === 0 ? [] : inferMealsFromBoardBasis(activeHotel?.board_basis || activeHotel?.meal_plan);

    // Passeios explicitamente datados neste dia
    const datedTours = currentDate
      ? tours.filter((t) => String(t.date || "").slice(0, 10) === currentDate)
      : [];

    // Se houver passeios sem data específica, distribui nos dias intermediários
    const extraTourIndices: number[] = [];
    if (i > 0 && i < totalDays - 1 && datedTours.length === 0) {
      const nextUndatedIdx = tours.findIndex((t, tIdx) => !t.date && !assignedUndatedTours.has(tIdx));
      if (nextUndatedIdx !== -1) {
        assignedUndatedTours.add(nextUndatedIdx);
        extraTourIndices.push(nextUndatedIdx);
      }
    }

    const dayTours = [...datedTours, ...extraTourIndices.map((idx) => tours[idx])];
    const parts: string[] = [];
    let title = `Dia ${dayNumber} • ${activeLocation}`;

    if (i === 0) {
      const outFlight = flights[0];
      const arrivalTransfer = transfers.find((t) => t.kind === "arrival" || t.kind === "round_trip") || transfers[0];
      title = `Dia 1 • Embarque e Chegada em ${activeLocation}`;
      if (outFlight?.destination_iata) {
        parts.push(
          `Chegada prevista em ${outFlight.destination_city || outFlight.destination_iata}${outFlight.arrival_time ? ` às ${outFlight.arrival_time}` : ""}.`,
        );
      }
      if (arrivalTransfer?.name) {
        parts.push(`Receptivo e deslocamento: ${arrivalTransfer.name}.`);
      }
      if (activeHotelName) {
        parts.push(`Check-in e acomodação em ${activeHotelName}.`);
      }
      if (parts.length === 0) {
        parts.push(`Recepção no destino e acomodação inicial.`);
      }
    } else if (i === totalDays - 1) {
      const retFlight = flights.length > 1 ? flights[flights.length - 1] : undefined;
      const departureTransfer = transfers.find((t) => t.kind === "departure" || t.kind === "round_trip") || transfers[0];
      title = `Dia ${dayNumber} • Check-out e Retorno`;
      if (activeHotelName) {
        parts.push(`Café da manhã e check-out em ${activeHotelName}.`);
      }
      if (departureTransfer?.name) {
        parts.push(`Traslado de retorno: ${departureTransfer.name}.`);
      }
      if (retFlight?.origin_iata) {
        parts.push(
          `Embarque de retorno ${retFlight.origin_iata} → ${retFlight.destination_iata || ""}${retFlight.departure_time ? ` às ${retFlight.departure_time}` : ""}.`.trim(),
        );
      }
      if (parts.length === 0) {
        parts.push("Preparação para embarque de retorno à cidade de origem.");
      }
    } else {
      // Verifica troca de hotel neste dia
      const switchingHotel = currentDate
        ? hotels.find((h) => String(h.checkin_date || h.check_in || "").slice(0, 10) === currentDate && i > 0)
        : undefined;
      if (switchingHotel) {
        title = `Dia ${dayNumber} • Deslocamento para ${switchingHotel.city || switchingHotel.hotel_name}`;
        parts.push(`Deslocamento terrestre com check-in em ${switchingHotel.hotel_name}.`);
      } else if (dayTours.length > 0) {
        title = `Dia ${dayNumber} • ${dayTours[0].title}`;
      } else {
        title = `Dia ${dayNumber} • Dia Livre em ${activeLocation}`;
        parts.push(
          activeHotelName
            ? `Dia livre para aproveitar a estrutura de ${activeHotelName} e explorar ${activeLocation}.`
            : `Dia livre para aproveitar as atrações locais em ${activeLocation}.`,
        );
      }
    }

    for (const dt of dayTours) {
      parts.push(
        `Atividade prevista: ${dt.title}${dt.duration ? ` (${dt.duration})` : ""}${dt.description ? ` — ${dt.description}` : ""}.`,
      );
    }

    days.push({
      id: `day-auto-${dayNumber}`,
      day_number: dayNumber,
      date: currentDate || undefined,
      title,
      description: parts.join(" "),
      location: activeLocation,
      included_meals: meals,
    });
  }

  return days;
}

// ─── 14. EXTRATOR DETERMINÍSTICO E RESILIENTE DE COTAÇÕES B2B ─────────────────

const KNOWN_OPERATORS = [
  { name: "Orinter", pattern: /\b(?:orinter|orinter\s*tour)\b/i },
  { name: "CVC Corp", pattern: /\b(?:cvc\s*corp|cvc\s*viagens|cvc)\b/i },
  { name: "Trend Viagens", pattern: /\b(?:trend\s*viagens|trend|trend\s*operadora)\b/i },
  { name: "Visual Turismo", pattern: /\b(?:visual\s*turismo|visual)\b/i },
  { name: "FRT Operadora", pattern: /\b(?:frt\s*operadora|frt)\b/i },
  { name: "Incomum Viagens", pattern: /\b(?:incomum\s*viagens|incomum)\b/i },
  { name: "Azul Viagens", pattern: /\b(?:azul\s*viagens|azul\s*operadora)\b/i },
  { name: "E-HTL", pattern: /\b(?:e-htl|ehtl)\b/i },
  { name: "RexturAdvance", pattern: /\b(?:rextur\s*advance|rextur)\b/i },
  { name: "Decolar B2B", pattern: /\b(?:decolar\s*b2b|decolar)\b/i },
  { name: "ViagensPromo", pattern: /\b(?:viagenspromo|viagens\s*promo)\b/i },
  { name: "Diversa Turismo", pattern: /\b(?:diversa\s*turismo|diversa)\b/i },
  { name: "Schultz", pattern: /\b(?:schultz\s*operadora|schultz)\b/i },
  { name: "Europlus", pattern: /\b(?:europlus\s*operadora|europlus)\b/i },
  { name: "BestBuy Travel", pattern: /\b(?:bestbuy\s*travel|best\s*buy)\b/i },
];

const KNOWN_DESTINATIONS = [
  "Maceió", "Porto de Galinhas", "Natal", "Fortaleza", "Jericoacoara", "Gramado", "Canela",
  "Cancún", "Punta Cana", "Orlando", "Miami", "Salvador", "Morro de São Paulo", "Porto Seguro",
  "Arraial d'Ajuda", "Trancoso", "Florianópolis", "Balneário Camboriú", "Foz do Iguaçu",
  "Maragogi", "Caldas Novas", "Bonito", "Fernando de Noronha", "Lençóis Maranhenses",
  "Bariloche", "Santiago", "Buenos Aires", "Mendoza", "Paris", "Lisboa", "Porto", "Roma",
  "Madri", "Barcelona", "Londres", "Nova York", "Las Vegas", "Papeete", "Dubai",
];

export function extractOperatorQuoteDeterministically(
  text: string,
): Partial<NormalizedQuoteExtractionEnvelope> {
  if (!text || typeof text !== "string") return {};
  const clean = text.replace(/\r\n/g, "\n");
  const lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);

  // 1. Operadora
  let operatorName: string | undefined;
  for (const op of KNOWN_OPERATORS) {
    if (op.pattern.test(clean)) {
      operatorName = op.name;
      break;
    }
  }

  // 2. Número de Referência / Cotação
  let quoteReferenceNumber: string | undefined;
  const refMatch = clean.match(
    /(?:cota[çc][ãa]o\s*(?:ref|n[ºo]?)?|refer[êe]ncia|ref\.?|or[çc]amento\s*n[ºo]?|reserva\s*n[ºo]?|proposta\s*n[ºo]?)\s*[:\-#]?\s*#?\s*([A-Za-z0-9\-_]{3,20})/i,
  );
  if (refMatch && !/^(?:completo|pacote|aereo|hotel|viagem)$/i.test(refMatch[1])) {
    quoteReferenceNumber = refMatch[1];
  } else {
    const fallbackRef = clean.match(/ref\.?\s*[:\-#]?\s*#?\s*([A-Za-z0-9\-_]{3,20})/i);
    if (fallbackRef) quoteReferenceNumber = fallbackRef[1];
  }

  // 3. Cliente / Passageiro Titular
  let clientName: string | undefined;
  const nameMatch = clean.match(
    /(?:passageiro|cliente|titular|pax|viajante|nome(?:\s+do\s+cliente)?)\s*[:\-][^\S\r\n]*([A-ZÀ-Ú][a-zà-ú]+(?:[^\S\r\n]+[A-ZÀ-Ú][a-zà-ú]+)+)/i,
  );
  if (nameMatch) {
    clientName = nameMatch[1].split("\n")[0].trim();
  }

  // 4. Telefone
  let clientPhone: string | undefined;
  const phoneMatch = clean.match(
    /(?:(?:whatsapp|fone|tel|celular|contato)\s*[:\-]?\s*)?((?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-.\s]?\d{4})/,
  );
  if (phoneMatch) {
    const rawDigits = phoneMatch[1].replace(/\D/g, "");
    if (rawDigits.length >= 10 && rawDigits.length <= 13) {
      clientPhone = rawDigits;
    }
  }

  // 5. CPF
  let clientDocument: string | undefined;
  const cpfMatch = clean.match(/\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/);
  if (cpfMatch) {
    clientDocument = cpfMatch[1].replace(/\D/g, "");
  }

  // 6. Destino & Origem
  let destination: string | undefined;
  const destMatch = clean.match(
    /(?:destino|para|chegada|cidade\s+de\s+destino)\s*[:\-]?\s*([A-Za-zÀ-ÿ\s]{3,30})(?:\s*-\s*[A-Z]{2})?/i,
  );
  if (destMatch && destMatch[1].trim().length >= 3) {
    destination = destMatch[1].trim();
  }
  if (!destination) {
    for (const kd of KNOWN_DESTINATIONS) {
      const reg = new RegExp(`\\b${kd}\\b`, "i");
      if (reg.test(clean)) {
        destination = kd;
        break;
      }
    }
  }

  let origin: string | undefined;
  const originMatch = clean.match(
    /(?:origem|sa[íi]da(?:\s+de)?|partida|embarque)\s*[:\-]?\s*([A-Za-zÀ-ÿ\s]{3,30}(?:\s*\([A-Z]{3}\))?)/i,
  );
  if (originMatch && originMatch[1].trim().length >= 3) {
    origin = originMatch[1].trim();
  }

  // 7. Datas da Viagem
  let travelStart: string | undefined;
  let travelEnd: string | undefined;

  const datePairMatch = clean.match(
    /(?:per[íi]odo|datas?|de\s+\d{2}\/\d{2}\/\d{4})\s*[:\-]?\s*(\d{2}\/\d{2}\/\d{4})\s*(?:a|at[ée]|\-|e)\s*(\d{2}\/\d{2}\/\d{4})/i,
  );
  if (datePairMatch) {
    travelStart = normalizeDateToken(datePairMatch[1]);
    travelEnd = normalizeDateToken(datePairMatch[2]);
  } else {
    const idaMatch = clean.match(/(?:ida|embarque|check-?in)\s*[:\-]?\s*(\d{2}\/\d{2}\/\d{4})/i);
    const voltaMatch = clean.match(/(?:volta|retorno|check-?out)\s*[:\-]?\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (idaMatch) travelStart = normalizeDateToken(idaMatch[1]);
    if (voltaMatch) travelEnd = normalizeDateToken(voltaMatch[1]);
  }

  // 8. Passageiros
  let adultsCount: number | undefined;
  const adultsMatch = clean.match(/(?:(\d+)\s*(?:adt|adulto|adultos)|adultos?\s*[:\-]?\s*(\d+))/i);
  if (adultsMatch) {
    adultsCount = parseInt(adultsMatch[1] || adultsMatch[2], 10);
  }

  let childrenCount: number | undefined;
  const chdMatch = clean.match(/(?:(\d+)\s*(?:chd|crian[çc]a|crian[çc]as)|crian[çc]as?\s*[:\-]?\s*(\d+))/i);
  if (chdMatch) {
    childrenCount = parseInt(chdMatch[1] || chdMatch[2], 10);
  }

  // 9. Hotéis
  const hotels: NormalizedExtractedHotel[] = [];
  for (const line of lines) {
    if (/(?:hotel|resort|pousada|flat|su[íi]tes?|inn)\b/i.test(line) && !/transfer|traslado|voo|a[ée]reo/i.test(line)) {
      const hotelClean = cleanOperatorPromoPrefix(line).slice(0, 80);
      let mealPlan: string | undefined;
      if (/all\s*inclusive/i.test(line)) mealPlan = "All Inclusive";
      else if (/meia\s*pens[ãa]o/i.test(line)) mealPlan = "Meia Pensão";
      else if (/pens[ãa]o\s*completa/i.test(line)) mealPlan = "Pensão Completa";
      else if (/caf[ée]/i.test(line)) mealPlan = "Café da Manhã";

      let nights: number | undefined;
      const nMatch = line.match(/(\d+)\s*noites?/i);
      if (nMatch) nights = parseInt(nMatch[1], 10);

      // Se mealPlan ou nights não estavam na mesma linha do nome do hotel, busca no contexto geral
      if (!mealPlan) {
        if (/all\s*inclusive/i.test(clean)) mealPlan = "All Inclusive";
        else if (/meia\s*pens[ãa]o/i.test(clean)) mealPlan = "Meia Pensão";
        else if (/pens[ãa]o\s*completa/i.test(clean)) mealPlan = "Pensão Completa";
        else if (/caf[ée]/i.test(clean)) mealPlan = "Café da Manhã";
      }
      if (!nights) {
        const cleanNMatch = clean.match(/(\d+)\s*noites?/i);
        if (cleanNMatch) nights = parseInt(cleanNMatch[1], 10);
      }

      hotels.push({
        hotel_name: hotelClean,
        city: destination || null,
        meal_plan: mealPlan || null,
        checkin_date: travelStart || null,
        checkout_date: travelEnd || null,
        nights_count: nights || null,
      });
      break;
    }
  }

  // 10. Voos
  const flights: NormalizedExtractedFlight[] = [];
  const flightCodeRegex = /\b(LA|G3|AD|TP|AA|AF|JJ)\s*(\d{3,4})\b/gi;
  let fMatch: RegExpExecArray | null;
  let fIdx = 0;
  while ((fMatch = flightCodeRegex.exec(clean)) !== null && fIdx < 6) {
    const code = fMatch[1].toUpperCase();
    const airline = code === "LA" ? "LATAM" : code === "G3" ? "GOL" : code === "AD" ? "Azul" : code === "TP" ? "TAP" : code;
    flights.push({
      airline,
      airline_name: airline,
      flight_number: `${code} ${fMatch[2]}`,
      date: fIdx === 0 ? travelStart : travelEnd,
      departure_date: fIdx === 0 ? travelStart : travelEnd,
    });
    fIdx++;
  }

  // 11. Valores e Preços
  let grossPriceCents: number | undefined;
  const totalMatch = clean.match(
    /(?:total(?:\s+geral|\s+com\s+taxas?|\s+da\s+viagem|\s+do\s+pacote)*|valor\s+total|gross\s+price|pre[çc]o\s+total)\s*[:\-]?\s*(?:R\$\s*)?([\d.,]+)/i,
  );
  if (totalMatch) {
    grossPriceCents = parseMoneyToCents(totalMatch[1], { keyIsCents: false });
  }

  let taxesCents: number | undefined;
  const taxMatch = clean.match(/(?:taxas?(?:\s*de\s*embarque)?|impostos?)\s*[:\-]?\s*(?:R\$\s*)?([\d.,]+)/i);
  if (taxMatch) {
    taxesCents = parseMoneyToCents(taxMatch[1], { keyIsCents: false });
  }

  let operatorNetCents: number | undefined;
  const netMatch = clean.match(
    /(?:valor\s+l[íi]quido(?:\s+operadora)?|l[íi]quido(?:\s+operadora)?|net\s*price|valor\s*operadora)\s*[:\-]?\s*(?:R\$\s*)?([\d.,]+)/i,
  );
  if (netMatch) {
    operatorNetCents = parseMoneyToCents(netMatch[1], { keyIsCents: false });
  }

  let suggestedCommissionCents: number | undefined;
  const commMatch = clean.match(
    /(?:comiss[ãa]o(?:\s+sugerida)?|over(?:\s+ag[êe]ncia)?|margem)\s*[:\-]?\s*(?:R\$\s*)?([\d.,]+)/i,
  );
  if (commMatch) {
    suggestedCommissionCents = parseMoneyToCents(commMatch[1], { keyIsCents: false });
  }

  let maxInstallments: number | undefined;
  let installmentCents: number | undefined;

  // Busca preferencialmente dentro do bloco financeiro / formas de pagamento
  const financeSlice = clean.slice(clean.search(/(?:financeiro|forma\s+de\s+pagamento|condi[çc][õo]es|pagamento)/i) || 0);
  const instMatch = financeSlice.match(
    /(?:(?:em\s+at[ée]|at[ée]|ou|em)\s+)?(\d{1,2})\s*x\s*(?:(?:sem\s+juros|iguais|fixas)\s*)?(?:de\s*)?(?:R\$\s*)?([\d.,]+)?/i,
  ) || clean.match(
    /(?:(?:em\s+at[ée]|at[ée])\s+)(\d{1,2})\s*x\s*(?:(?:sem\s+juros|iguais|fixas)\s*)?(?:de\s*)?(?:R\$\s*)?([\d.,]+)?/i,
  );

  if (instMatch) {
    const parsedInst = parseInt(instMatch[1], 10);
    if (parsedInst >= 1 && parsedInst <= 24) {
      maxInstallments = parsedInst;
      if (instMatch[2]) {
        installmentCents = parseMoneyToCents(instMatch[2], { keyIsCents: false });
      }
    }
  }

  const effectiveMaxInstallments = maxInstallments || (grossPriceCents ? 10 : undefined);
  const effectiveInstallmentCents =
    installmentCents ||
    (grossPriceCents && effectiveMaxInstallments
      ? Math.round(grossPriceCents / effectiveMaxInstallments)
      : undefined);

  return {
    operator_name: operatorName || null,
    quote_reference_number: quoteReferenceNumber || null,
    client_name: clientName || null,
    client_phone: clientPhone || null,
    client_document: clientDocument || null,
    destination: destination || "Destino a definir",
    origin: origin || null,
    travel_start: travelStart || null,
    travel_end: travelEnd || null,
    adults_count: adultsCount || (clean.length > 50 ? 2 : undefined),
    children_count: childrenCount || 0,
    hotels,
    flights,
    gross_price_cents: grossPriceCents || null,
    taxes_cents: taxesCents || null,
    operator_net_cents: operatorNetCents || null,
    suggested_commission_cents: suggestedCommissionCents || null,
    max_installments: effectiveMaxInstallments || null,
    installment_cents: effectiveInstallmentCents || null,
  };
}
