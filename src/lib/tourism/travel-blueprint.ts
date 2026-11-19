/**
 * travel-blueprint.ts — Núcleo SSOT (`CanonicalTravelBlueprint`) da Linha Única de Turismo.
 *
 * Unifica o contrato entre Pacotes (`TravelPackageData`), Excursões (`GroupTourDTO` /
 * `tourism_experiences`), Orçamentos e Propostas (`TravelProposalDTO`) para renderização
 * modular compartilhada no `ProposalWebShowcase` e importação 1:1 no Studio/CRM.
 */

import {
  buildDefaultWebPageConfig,
  normalizeEntityMediaList,
  normalizeHotelsList,
  normalizeToursList,
  normalizeTransfersList,
  type ProposalMediaItem,
  type ProposalWebPageDTO,
} from "./proposal-normalization";

export interface SanitizedPublicSeat {
  seat_number: number;
  row: number;
  column: "A" | "B" | "C" | "D";
  floor: 1 | 2;
  status: "free" | "reserved" | "blocked";
}

export interface BoardingPointSpec {
  city: string;
  time?: string;
  location?: string;
}

export interface CanonicalTravelBlueprint {
  id: string;
  sourceType: "package" | "excursion" | "proposal" | "experience";
  storeId?: string | null;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  originCity?: string | null;
  destinationCity: string;
  transportType?: string | null;
  departureDate?: string | null;
  departureTime?: string | null;
  returnDate?: string | null;
  returnTime?: string | null;
  durationLabel?: string | null;
  priceCents: number;
  compareAtCents?: number | null;
  coverImageUrl?: string | null;
  media: ProposalMediaItem[];
  flights: any[];
  hotels: any[];
  transfers: any[];
  cruises: any[];
  tours: any[];
  itinerary: any[];
  includes: string[];
  excludes: string[];
  boardingPoints: BoardingPointSpec[];
  boardingRequirements: string[];
  importantNotes: string[];
  cancellationPolicy?: string | null;
  paymentConditionsText?: string | null;
  pricingTiers?: Array<{ name: string; price_cents?: number; price?: number; description?: string }>;
  extraOptions?: Array<{ name: string; price_cents?: number; price?: number; description?: string }>;
  busCompanyName?: string | null;
  vehicleLayoutName?: string | null;
  totalSeats?: number | null;
  availableSeats?: number | null;
  publicSeats: SanitizedPublicSeat[];
  webPageConfig?: ProposalWebPageDTO | null;
  agencyName?: string | null;
  agencyLogoUrl?: string | null;
  agencyPhone?: string | null;
}

/**
 * Remove qualquer dado pessoal (CPF, telefone, nome) da matriz de poltronas
 * antes de retornar o mapa de assentos para rotas públicas/anônimas.
 */
export function sanitizePublicBusSeats(rawSeats: unknown): SanitizedPublicSeat[] {
  if (!Array.isArray(rawSeats)) return [];
  const validCols = new Set(["A", "B", "C", "D"]);
  const out: SanitizedPublicSeat[] = [];
  for (const s of rawSeats) {
    if (!s || typeof s !== "object") continue;
    const item = s as Record<string, unknown>;
    const seatNumber = Number(item.seat_number || 0);
    if (!Number.isFinite(seatNumber) || seatNumber <= 0) continue;
    const rawCol = String(item.column || "A").toUpperCase();
    const rawStatus = String(item.status || "free").toLowerCase();
    out.push({
      seat_number: seatNumber,
      row: Math.max(1, Number(item.row || Math.ceil(seatNumber / 4))),
      column: (validCols.has(rawCol) ? rawCol : "A") as "A" | "B" | "C" | "D",
      floor: Number(item.floor) === 2 ? 2 : 1,
      status:
        rawStatus === "reserved" || rawStatus === "occupied"
          ? "reserved"
          : rawStatus === "blocked"
            ? "blocked"
            : "free",
    });
  }
  return out;
}

/**
 * Extrai metadados JSON embutidos em `tourism_experiences.description` (legado)
 * evitando que JSON bruto vaze para resumos textuais humanos.
 */
export function parseExperienceMetaDescription(rawDescription: unknown): {
  meta: Record<string, any>;
  humanText: string;
} {
  if (typeof rawDescription !== "string") {
    return { meta: {}, humanText: "" };
  }
  const trimmed = rawDescription.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        const cleanNotes =
          typeof parsed.notes === "string" && parsed.notes.trim()
            ? parsed.notes.trim()
            : typeof parsed.hotel_details?.description === "string"
              ? parsed.hotel_details.description.trim()
              : "";
        return { meta: parsed as Record<string, any>, humanText: cleanNotes };
      }
    } catch {
      // ignore invalid json
    }
  }
  return { meta: {}, humanText: trimmed };
}

export function normalizeBoardingPointsList(raw: unknown): BoardingPointSpec[] {
  if (!Array.isArray(raw)) return [];
  const out: BoardingPointSpec[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim()) {
      out.push({ city: item.trim() });
    } else if (item && typeof item === "object") {
      const rec = item as Record<string, unknown>;
      const city = String(rec.city || rec.name || rec.location || "").trim();
      if (!city) continue;
      out.push({
        city,
        time: rec.time ? String(rec.time).trim() : undefined,
        location: rec.location ? String(rec.location).trim() : undefined,
      });
    }
  }
  return out;
}

export function blueprintFromPackage(
  pkg: Record<string, any>,
  ctx?: {
    id?: string;
    storeId?: string | null;
    title?: string;
    subtitle?: string;
    description?: string;
    priceCents?: number;
    compareAtCents?: number | null;
    coverImageUrl?: string | null;
    mediaUrls?: string[];
    agencyName?: string | null;
    agencyPhone?: string | null;
  },
): CanonicalTravelBlueprint {
  const dest = (pkg.destination || {}) as Record<string, any>;
  const resort = (pkg.resort || {}) as Record<string, any>;
  const flightDetails = (pkg.flight_details || {}) as Record<string, any>;
  const destinationCity = String(
    dest.name || pkg.destination_city || ctx?.title || "Destino Especial",
  ).trim();
  const originCity = String(
    pkg.origin_city ||
      flightDetails.departure_airport ||
      flightDetails.bus_departure_terminal ||
      flightDetails.origin_airport ||
      "",
  ).trim() || null;

  let flights: any[] = Array.isArray(pkg.flights)
    ? pkg.flights.map((f: any, idx: number) => ({
        id: f.id || `pkg-fl-${idx + 1}`,
        type: f.type === "return" || f.leg === "volta" ? "return" : "outbound",
        airline_name: f.airline_name || f.airline || "Companhia Aérea",
        airline_code: f.airline_code || undefined,
        flight_number: f.flight_number || undefined,
        origin_iata: f.origin_iata || "",
        origin_city: f.origin_city || originCity || "",
        destination_iata: f.destination_iata || "",
        destination_city: f.destination_city || destinationCity,
        departure_time: f.departure_time || undefined,
        arrival_time: f.arrival_time || undefined,
        stops_count: f.stops_count ?? f.stops ?? 0,
        cabin_class: f.cabin_class || undefined,
        baggage_included: f.baggage_included ? String(f.baggage_included) : undefined,
      }))
    : [];

  if (
    flights.length === 0 &&
    (flightDetails.airline_name || flightDetails.airline_partner || flightDetails.departure_iata || flightDetails.origin_airport || flightDetails.bus_company)
  ) {
    flights.push({
      id: "pkg-outbound",
      type: "outbound",
      airline_name: flightDetails.airline_name || flightDetails.airline_partner || flightDetails.bus_company || flightDetails.cruise_line || "Transporte Principal",
      flight_number: flightDetails.flight_number_out || undefined,
      origin_iata: flightDetails.departure_iata || flightDetails.origin_airport || "",
      origin_city: originCity || "",
      destination_iata: flightDetails.destination_iata || flightDetails.arrival_iata || dest.iata_gateway || "",
      destination_city: destinationCity,
      departure_time: flightDetails.departure_time_out || flightDetails.bus_departure_time_out || undefined,
      arrival_time: flightDetails.arrival_time_out || flightDetails.bus_arrival_time_out || undefined,
      baggage_included: flightDetails.baggage_included ? "Sim" : undefined,
    });
  }

  let hotelsRaw: any[] = Array.isArray(pkg.hotels) && pkg.hotels.length > 0 ? pkg.hotels : [];
  if (hotelsRaw.length === 0 && Array.isArray(pkg.lodgings) && pkg.lodgings.length > 0) {
    hotelsRaw = pkg.lodgings.map((l: any, idx: number) => ({
      id: l.id || `pkg-lodging-${idx + 1}`,
      hotel_name: l.name || l.hotel_name || "Hospedagem",
      destination: l.location || l.city || destinationCity,
      board_basis: l.meal_plan || l.board_basis || "Café da Manhã",
      room_type: l.room_type || "Standard",
      stars: Number(l.stars || 4),
      media: l.media,
      images: l.photos || l.images || [],
      image_url: l.cover_image_url || l.image_url,
      amenities: l.amenities || [],
    }));
  } else if (hotelsRaw.length === 0 && resort?.name) {
    hotelsRaw = [
      {
        id: "pkg-resort-main",
        hotel_name: resort.name,
        destination: resort.location || destinationCity,
        board_basis: resort.meal_plan || "Café da Manhã",
        image_url: resort.cover_image_url || resort.photos?.[0] || "",
        images: Array.isArray(resort.photos) ? resort.photos : [],
        amenities: Array.isArray(resort.badges) ? resort.badges : [],
      },
    ];
  }

  const hotels = normalizeHotelsList(hotelsRaw) as any[];
  const transfers = normalizeTransfersList(pkg.transfers || []) as any[];
  const tours = normalizeToursList(pkg.tours || []) as any[];

  let cruises: any[] = Array.isArray(pkg.cruises) ? [...pkg.cruises] : [];
  if (
    cruises.length === 0 &&
    (flightDetails.cruise_line || pkg.transport_type === "cruzeiro")
  ) {
    cruises.push({
      id: "pkg-cruise-main",
      ship_name: flightDetails.ship_name || "Navio de Cruzeiro",
      company: flightDetails.cruise_line || "Companhia Marítima",
      cabin_category: flightDetails.cabin_category || "Cabine Externa com Varanda",
      departure_port: flightDetails.embarkation_port || "Porto de Santos",
      arrival_port: flightDetails.disembarkation_port || flightDetails.embarkation_port || "Porto de Santos",
      departure_date: pkg.departure_options?.[0]?.departure_date || undefined,
      return_date: pkg.departure_options?.[0]?.return_date || undefined,
      itinerary: [],
    });
  }

  const rawItinerary =
    Array.isArray(pkg.itinerary) && pkg.itinerary.length > 0
      ? pkg.itinerary
      : Array.isArray(pkg.itinerary_days)
        ? pkg.itinerary_days
        : [];
  const itinerary: any[] = rawItinerary.map((d: any, idx: number) => ({
    id: d.id || `pkg-day-${idx + 1}`,
    day_number: Number(d.day_number ?? d.day ?? idx + 1),
    date: d.date,
    title: String(d.title || `Dia ${idx + 1}`),
    description: String(d.description || [d.morning, d.afternoon, d.night].filter(Boolean).join(" • ") || ""),
    location: d.location || undefined,
    image_url: d.image_url || d.imageUrl || (Array.isArray(d.images) ? d.images[0] : undefined),
    images: Array.isArray(d.images) ? d.images.filter(Boolean) : undefined,
    media: Array.isArray(d.media) ? d.media : undefined,
    video_url: d.video_url || d.videoUrl || undefined,
    included_meals: Array.isArray(d.included_meals) ? d.included_meals : undefined,
  }));

  const media = normalizeEntityMediaList({
    media: pkg.media,
    featured_image_url: ctx?.coverImageUrl || resort.cover_image_url || undefined,
    images: [...(ctx?.mediaUrls || []), ...(Array.isArray(dest.gallery_urls) ? dest.gallery_urls : [])],
  });

  const payTextParts: string[] = [];
  if (pkg.payment_conditions?.installments_max) {
    payTextParts.push(`Até ${pkg.payment_conditions.installments_max}x`);
  }
  if (pkg.payment_conditions?.pix_discount_percent) {
    payTextParts.push(`${pkg.payment_conditions.pix_discount_percent}% desc. no PIX`);
  }
  if (pkg.payment_conditions?.custom_terms_text) {
    payTextParts.push(String(pkg.payment_conditions.custom_terms_text));
  }

  return {
    id: ctx?.id || "package",
    sourceType: "package",
    storeId: ctx?.storeId || null,
    title: ctx?.title || `Pacote ${destinationCity}`,
    subtitle: ctx?.subtitle || dest.description || null,
    description: ctx?.description || dest.description || null,
    originCity,
    destinationCity,
    transportType: pkg.transport_type || "aereo",
    departureDate: pkg.departure_options?.[0]?.departure_date || null,
    returnDate: pkg.departure_options?.[0]?.return_date || null,
    durationLabel: resort.duration_text || (itinerary.length > 0 ? `${itinerary.length} dias` : null),
    priceCents: Number(ctx?.priceCents || pkg.installments?.total_cents || 0),
    compareAtCents: ctx?.compareAtCents ?? null,
    coverImageUrl: ctx?.coverImageUrl || media[0]?.url || null,
    media,
    flights,
    hotels,
    transfers,
    cruises,
    tours,
    itinerary,
    includes: Array.isArray(pkg.inclusions) ? pkg.inclusions : [],
    excludes: Array.isArray(pkg.exclusions) ? pkg.exclusions : [],
    boardingPoints: normalizeBoardingPointsList(pkg.boarding_points),
    boardingRequirements: Array.isArray(pkg.boarding_requirements) ? pkg.boarding_requirements : [],
    importantNotes: Array.isArray(pkg.boarding_requirements) ? pkg.boarding_requirements : [],
    cancellationPolicy: pkg.cancellation_policy || null,
    paymentConditionsText: payTextParts.join(" · ") || null,
    publicSeats: [],
    webPageConfig: pkg.web_page_config || null,
    agencyName: ctx?.agencyName || null,
    agencyPhone: ctx?.agencyPhone || null,
  };
}

export function blueprintFromGroupTour(row: Record<string, any>): CanonicalTravelBlueprint {
  const { meta, humanText } = parseExperienceMetaDescription(row.description);
  const hotelsCol = Array.isArray(row.hotels) && row.hotels.length > 0 ? row.hotels : null;
  const legacyHotel =
    meta.hotel_details && typeof meta.hotel_details === "object" && (meta.hotel_details.name || meta.hotel_details.hotel_name)
      ? [
          {
            id: "excursion-hotel-1",
            hotel_name: meta.hotel_details.hotel_name || meta.hotel_details.name,
            stars: Number(meta.hotel_details.stars || 3),
            checkin_date: meta.hotel_details.checkIn || undefined,
            checkout_date: meta.hotel_details.checkOut || undefined,
            amenities: Array.isArray(meta.hotel_details.amenities) ? meta.hotel_details.amenities : [],
            images: Array.isArray(meta.hotel_details.gallery) ? meta.hotel_details.gallery : [],
            board_basis: meta.hotel_details.board_basis || undefined,
          },
        ]
      : [];

  const hotels = normalizeHotelsList(hotelsCol || legacyHotel) as any[];
  const transfers = normalizeTransfersList(
    Array.isArray(row.transfers) && row.transfers.length > 0 ? row.transfers : meta.transfers || [],
  ) as any[];
  const tours = normalizeToursList(
    Array.isArray(row.tours) && row.tours.length > 0 ? row.tours : meta.tours || [],
  ) as any[];

  const rawItinerary =
    Array.isArray(row.itinerary) && row.itinerary.length > 0
      ? row.itinerary
      : Array.isArray(meta.itinerary)
        ? meta.itinerary
        : [];
  const itinerary: any[] = rawItinerary.map((d: any, idx: number) => ({
    id: d.id || `exc-day-${idx + 1}`,
    day_number: Number(d.day_number ?? d.day ?? idx + 1),
    date: d.date,
    title: String(d.title || `Dia ${idx + 1}`),
    description: String(d.description || ""),
    location: d.location || undefined,
    image_url: d.image_url || d.imageUrl || (Array.isArray(d.images) ? d.images[0] : undefined),
    images: Array.isArray(d.images) ? d.images.filter(Boolean) : undefined,
    media: Array.isArray(d.media) ? d.media : undefined,
    video_url: d.video_url || d.videoUrl || undefined,
  }));

  const promoVideo =
    meta.promo_media?.youtube_url ||
    meta.promo_media?.youtubeUrl ||
    meta.promo_media?.video_url ||
    meta.promo_media?.videoUrl ||
    row.video_url ||
    undefined;

  const media = normalizeEntityMediaList({
    media: Array.isArray(row.media) && row.media.length > 0 ? row.media : meta.media,
    featured_image_url: row.cover_image_url || meta.cover_image_url || row.image_url || undefined,
    images: [...(Array.isArray(row.gallery_urls) ? row.gallery_urls : []), ...(Array.isArray(meta.hotel_details?.gallery) ? meta.hotel_details.gallery : [])],
    video_url: promoVideo,
  });

  const boardingPoints = normalizeBoardingPointsList(
    Array.isArray(row.boarding_points) && row.boarding_points.length > 0 ? row.boarding_points : meta.boarding_points,
  );

  const destinationCity = String(row.destination_city || row.destination || row.location || "Destino").trim();
  const originCity = String(row.departure_city || meta.departure_city || "").trim() || null;

  return {
    id: String(row.id || "excursion"),
    sourceType: row.category === "group_tour" || row.category === "excursion" ? "excursion" : "experience",
    storeId: row.store_id || null,
    title: String(row.title || "Excursão Terrestre"),
    subtitle: row.subtitle || humanText || null,
    description: humanText || null,
    originCity,
    destinationCity,
    transportType: "terrestre",
    departureDate: row.departure_date || null,
    departureTime: row.departure_time || meta.departure_time || null,
    returnDate: row.return_date || null,
    returnTime: row.return_time || meta.return_time || null,
    durationLabel: row.duration || null,
    priceCents: Number(row.price_cents || 0),
    coverImageUrl: row.cover_image_url || meta.cover_image_url || row.image_url || media[0]?.url || null,
    media,
    flights: [],
    hotels,
    transfers,
    cruises: [],
    tours,
    itinerary,
    includes: Array.isArray(row.included_items) ? row.included_items : [],
    excludes: Array.isArray(row.excluded_items) ? row.excluded_items : [],
    boardingPoints,
    boardingRequirements: Array.isArray(row.what_to_bring) ? row.what_to_bring : [],
    importantNotes: row.notes ? [String(row.notes)] : meta.notes ? [String(meta.notes)] : [],
    paymentConditionsText: row.payment_conditions || meta.payment_conditions || null,
    pricingTiers: Array.isArray(row.pricing_tiers) && row.pricing_tiers.length > 0 ? row.pricing_tiers : meta.pricing_tiers || [],
    extraOptions: Array.isArray(row.extra_options) && row.extra_options.length > 0 ? row.extra_options : meta.extra_options || [],
    busCompanyName: row.bus_company_name || meta.bus_company_name || null,
    vehicleLayoutName: row.vehicle_layout_name || meta.vehicle_layout_name || null,
    totalSeats: row.total_seats != null ? Number(row.total_seats) : null,
    availableSeats: row.available_seats != null ? Number(row.available_seats) : null,
    publicSeats: sanitizePublicBusSeats(row.seats),
    webPageConfig: row.web_page_config || meta.web_page_config || null,
    agencyName: row.provider_name || null,
    agencyLogoUrl: row.provider_logo_url || null,
    agencyPhone: row.contact_whatsapp || null,
  };
}

/**
 * Converte qualquer `CanonicalTravelBlueprint` em `TravelProposalDTO` para renderização
 * unificada no `ProposalWebShowcase` (Propostas, Pacotes e Excursões).
 */
export function blueprintToTravelProposalDTO(
  blueprint: CanonicalTravelBlueprint,
): any {
  const customFields: Record<string, any> = {
    ...(blueprint.originCity ? { origin_city: blueprint.originCity } : {}),
    ...(blueprint.transportType ? { transport_type: blueprint.transportType } : {}),
    ...(blueprint.cancellationPolicy ? { cancellation_policy: blueprint.cancellationPolicy } : {}),
    ...(blueprint.boardingRequirements.length > 0
      ? { boarding_requirements: blueprint.boardingRequirements.join("\n") }
      : {}),
    ...(blueprint.paymentConditionsText ? { payment_terms: blueprint.paymentConditionsText } : {}),
  };

  const baseProposal: Record<string, any> = {
    id: blueprint.id,
    store_id: blueprint.storeId || null,
    agency_name: blueprint.agencyName || "Agência Credenciada",
    agency_logo_url: blueprint.agencyLogoUrl || null,
    agency_whatsapp: blueprint.agencyPhone || null,
    agency_phone: blueprint.agencyPhone || null,
    quote_id: blueprint.id,
    public_token: blueprint.id,
    title: blueprint.title,
    subtitle: blueprint.subtitle || undefined,
    cover_image_url: blueprint.coverImageUrl || blueprint.media[0]?.url || undefined,
    client_name: "Viajante",
    client_whatsapp: "",
    destination_city: blueprint.destinationCity,
    travel_start_date: blueprint.departureDate || undefined,
    travel_end_date: blueprint.returnDate || undefined,
    adults_count: 1,
    children_count: 0,
    canvas_format: "a4-portrait",
    template_theme: "editorial-flat",
    flights: blueprint.flights,
    hotels: blueprint.hotels,
    transfers: blueprint.transfers,
    cruises: blueprint.cruises,
    tours: blueprint.tours,
    itinerary: blueprint.itinerary,
    rooms: [
      {
        id: "blueprint-pax-1",
        roomNumber: 1,
        roomType: "Por Pessoa",
        adults: 1,
        children: 0,
        price_cents: blueprint.priceCents,
        price_per_person_cents: blueprint.priceCents,
      },
    ],
    includes: blueprint.includes,
    excludes: blueprint.excludes,
    important_notes: blueprint.importantNotes,
    special_notes: blueprint.description || undefined,
    pricing: {
      currency: "BRL",
      base_price_cents: blueprint.priceCents,
      boarding_tax_cents: 0,
      other_taxes_cents: 0,
      discount_cents: 0,
      total_price_cents: blueprint.priceCents,
      total_cents: blueprint.priceCents,
      payment_terms: blueprint.paymentConditionsText || undefined,
      installments_options: [],
      custom_fields: customFields,
    },
    custom_fields: customFields,
    status: "sent",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (blueprint.webPageConfig) {
    baseProposal.web_page = blueprint.webPageConfig;
  } else {
    const defaultPage = buildDefaultWebPageConfig(baseProposal);
    defaultPage.hero_media = blueprint.media.length > 0 ? blueprint.media : defaultPage.hero_media;
    baseProposal.web_page = defaultPage;
  }

  return baseProposal;
}
