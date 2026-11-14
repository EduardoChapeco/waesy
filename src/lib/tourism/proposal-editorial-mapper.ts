import type {
  FlightSegmentDTO,
  HotelDTO,
  ItineraryDayDTO,
  TourOptionDTO,
  TransferDTO,
  TravelProposalDTO,
} from "@/services/travel-proposal.functions";
import type {
  BaggageAllowanceConfig,
  FlightDirectionSegment,
} from "@/components/classifieds/travel-flight-itinerary-card";
import {
  calculateQuoteTotals,
  sanitizeLegacyProposalSummaryNotes,
} from "@/lib/tourism/pricing";
import { normalizeProposalNicheId } from "@/lib/tourism/proposal-theme-palettes";
import {
  buildVisibleProposalCustomFieldEntries,
  sanitizeProposalCustomFields,
} from "@/lib/tourism/proposal-custom-fields";

function isValidMediaUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:image/")
  );
}

function extractAirportIata(explicitIata?: string, fallbackLabel?: string): string {
  const cleanIata = (explicitIata || "").trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(cleanIata)) return cleanIata;

  const label = (fallbackLabel || "").trim();
  const parenMatch = label.match(/\(([A-Z]{3})\)/i);
  if (parenMatch) return parenMatch[1].toUpperCase();

  const upperToken = label.match(/\b([A-Z]{3})\b/);
  if (upperToken) return upperToken[1];

  const compact = label.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return compact.slice(0, 3) || "TR";
}

function formatDateBr(value?: string | null): string | undefined {
  if (!value) return undefined;
  const isoMatch = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("pt-BR");
  }
  return value;
}

function formatShortDateBr(value?: string | null): string | undefined {
  if (!value) return undefined;
  const isoMatch = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}`;
  }
  return undefined;
}

function computeDateDiffDays(startDate?: string | null, endDate?: string | null): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return null;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function parseBaggageConfig(seg: FlightSegmentDTO): BaggageAllowanceConfig | undefined {
  const raw = seg.baggage ?? seg.baggage_included;
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw === "boolean") {
    return raw
      ? { personal_item_count: 1, carry_on_count: 1, checked_bag_count: 1, carry_on_weight_kg: 10, checked_bag_weight_kg: 23 }
      : { personal_item_count: 1, carry_on_count: 1, checked_bag_count: 0 };
  }
  const text = String(raw).trim();
  const lower = text.toLowerCase();
  const hasChecked =
    lower.includes("23") ||
    lower.includes("despach") ||
    lower.includes("porão") ||
    lower.includes("porao") ||
    lower.includes("mala grande");
  const carryOnly =
    lower.includes("10") ||
    lower.includes("mão") ||
    lower.includes("mao") ||
    lower.includes("bordo");

  return {
    personal_item_count: 1,
    carry_on_count: hasChecked || carryOnly ? 1 : 0,
    carry_on_weight_kg: hasChecked || carryOnly ? 10 : undefined,
    checked_bag_count: hasChecked ? 1 : 0,
    checked_bag_weight_kg: hasChecked ? 23 : undefined,
    notes: text,
  };
}

function mapFlightDirection(
  seg: FlightSegmentDTO,
  idx: number,
  totalSegments: number,
): "ida" | "volta" | "trecho" {
  const legLower = (seg.leg || "").toLowerCase();
  if (seg.type === "return" || legLower.includes("volt")) return "volta";
  if (seg.type === "outbound" || legLower.includes("id")) return "ida";
  if (idx === 0) return "ida";
  if (idx === 1 && totalSegments === 2) return "volta";
  return "trecho";
}

function normalizeMealTag(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (lower === "breakfast" || lower.includes("café") || lower.includes("cafe")) return "breakfast";
  if (lower === "lunch" || lower.includes("almoço") || lower.includes("almoco")) return "lunch";
  if (lower === "dinner" || lower.includes("jantar")) return "dinner";
  return raw;
}

function collectRealProposalImages(proposal: TravelProposalDTO): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  const pushUnique = (url: unknown) => {
    if (!isValidMediaUrl(url)) return;
    const clean = url.trim();
    if (!seen.has(clean)) {
      seen.add(clean);
      ordered.push(clean);
    }
  };

  pushUnique(proposal.cover_image_url);

  const customGallery = String((proposal.custom_fields as any)?.destination_gallery_urls || "");
  if (customGallery) {
    for (const url of customGallery.split(/[\n,|]+/)) {
      pushUnique(url);
    }
  }

  if (Array.isArray(proposal.hotels)) {
    for (const h of proposal.hotels) {
      pushUnique(h?.featured_image_url);
      pushUnique(h?.image_url);
      if (Array.isArray(h?.images)) {
        for (const u of h.images) pushUnique(u);
      }
    }
  }

  if (Array.isArray(proposal.itinerary)) {
    for (const day of proposal.itinerary) {
      pushUnique(day?.image_url);
      if (Array.isArray(day?.images)) {
        for (const u of day.images) pushUnique(u);
      }
    }
  }

  if (Array.isArray(proposal.tours)) {
    for (const tour of proposal.tours) {
      pushUnique((tour as TourOptionDTO)?.image_url);
      if (Array.isArray((tour as TourOptionDTO)?.images)) {
        for (const u of (tour as TourOptionDTO).images!) pushUnique(u);
      }
    }
  }

  return ordered;
}

/**
 * Converte um TravelProposalDTO para o shape canônico consumido por
 * `<EditorialShowcaseView />`, sincronizando voos, hospedagens, transfers,
 * passeios, roteiro dia a dia, inclusões, exclusões e condições comerciais.
 * Preserva isolamento estrito de PII (não expõe WhatsApp/email do cliente)
 * e respeita a regra B.33 (zero imagens de estoque sintéticas).
 */
export function proposalToEditorialClassified(proposal: TravelProposalDTO) {
  const flights = Array.isArray(proposal.flights) ? proposal.flights : [];
  const hotels = Array.isArray(proposal.hotels) ? proposal.hotels : [];
  const itinerary = Array.isArray(proposal.itinerary) ? proposal.itinerary : [];
  const transfers = Array.isArray(proposal.transfers) ? proposal.transfers : [];
  const tours = Array.isArray(proposal.tours) ? proposal.tours : [];
  const includes = Array.isArray(proposal.includes) ? proposal.includes.filter(Boolean) : [];
  const excludes = Array.isArray(proposal.excludes) ? proposal.excludes.filter(Boolean) : [];
  const customFields = (proposal.custom_fields || {}) as Record<string, any>;

  const images = collectRealProposalImages(proposal);
  const feedMedia = images.map((url) => ({ url, type: "image" }));

  const mappedFlightSegments: FlightDirectionSegment[] = flights.map((seg, idx) => {
    const direction = mapFlightDirection(seg, idx, flights.length);
    return {
      direction,
      label: direction === "ida" ? "Voo de Ida" : direction === "volta" ? "Voo de Volta" : `Trecho ${idx + 1}`,
      date_text: formatDateBr(seg.departure_date),
      airline: seg.airline_name || seg.airline || seg.airline_code || undefined,
      flight_number: seg.flight_number || undefined,
      cabin_class: seg.cabin_class || undefined,
      departure_iata: extractAirportIata(seg.origin_iata, seg.origin_city || seg.origin),
      departure_city: seg.origin_city || seg.origin || undefined,
      departure_time: seg.departure_time || undefined,
      arrival_iata: extractAirportIata(seg.destination_iata, seg.destination_city || seg.destination),
      arrival_city: seg.destination_city || seg.destination || undefined,
      arrival_time: seg.arrival_time || undefined,
      stops_count: seg.stops_count ?? seg.stops ?? 0,
      baggage: parseBaggageConfig(seg),
    };
  });

  const outboundSeg = mappedFlightSegments.find((s) => s.direction === "ida") || mappedFlightSegments[0] || null;
  const inboundSeg = mappedFlightSegments.find((s) => s.direction === "volta") || null;

  const customTransportMode = String(customFields.transport_mode || "").toLowerCase();
  const transportType =
    mappedFlightSegments.length > 0
      ? "airplane"
      : customTransportMode === "road" || customTransportMode === "bus"
        ? "bus"
        : customTransportMode === "cruise"
          ? "cruise"
          : hotels.length > 0
            ? "hotel_only"
            : "";

  const diffDays = computeDateDiffDays(proposal.travel_start_date, proposal.travel_end_date);
  const hotelNightsSum = hotels.reduce((sum, h) => sum + (Number(h.nights_count) || 0), 0);
  const durationNights = diffDays !== null && diffDays > 0 ? diffDays : hotelNightsSum > 0 ? hotelNightsSum : itinerary.length > 1 ? itinerary.length - 1 : 0;
  const durationDays = durationNights > 0 ? durationNights + 1 : itinerary.length > 0 ? itinerary.length : 0;
  const durationText =
    durationDays > 0 && durationNights > 0
      ? `${durationDays} dias / ${durationNights} noites`
      : durationDays > 0
        ? `${durationDays} dias`
        : undefined;

  const flightDetails =
    transportType === "airplane" || mappedFlightSegments.length > 0
      ? {
          transport_type: transportType || "airplane",
          departure_iata: outboundSeg?.departure_iata,
          arrival_iata: outboundSeg?.arrival_iata,
          airline: outboundSeg?.airline,
          flight_number: outboundSeg?.flight_number,
          departure_time: outboundSeg?.departure_time,
          arrival_time: outboundSeg?.arrival_time,
          outbound_date_text: outboundSeg?.date_text || formatDateBr(proposal.travel_start_date),
          inbound_date_text: inboundSeg?.date_text || formatDateBr(proposal.travel_end_date),
          return_airline: inboundSeg?.airline,
          return_flight_number: inboundSeg?.flight_number,
          return_departure_time: inboundSeg?.departure_time,
          return_arrival_time: inboundSeg?.arrival_time,
          include_return: Boolean(inboundSeg),
          connections: outboundSeg?.stops_count ?? 0,
          duration_text: durationText,
          segments: mappedFlightSegments,
        }
      : transportType
        ? {
            transport_type: transportType,
            duration_text: durationText,
          }
        : null;

  const lodgings = hotels.map((h: HotelDTO, idx: number) => {
    const hotelImages = Array.from(
      new Set(
        [
          h.featured_image_url,
          h.image_url,
          ...(Array.isArray(h.images) ? h.images : []),
        ].filter(isValidMediaUrl),
      ),
    );
    const checkinShort = formatShortDateBr(h.checkin_date || h.check_in);
    const checkoutShort = formatShortDateBr(h.checkout_date || h.check_out);
    const amenities = Array.isArray(h.amenities) && h.amenities.length > 0
      ? h.amenities
      : Array.isArray(h.badges) && h.badges.length > 0
        ? h.badges
        : [];
    const descriptionParts: string[] = [];
    if (h.room_type) descriptionParts.push(`Acomodação: ${h.room_type}`);
    if (h.nights_count) descriptionParts.push(`${h.nights_count} noite(s)`);

    return {
      id: h.id || `hotel-${idx}`,
      name: h.hotel_name,
      stars: h.stars,
      city: h.destination || proposal.destination_city || undefined,
      address: h.address || undefined,
      regime: h.board_basis || undefined,
      room_category: h.room_type || undefined,
      images: hotelImages,
      checkin_time: checkinShort ? `14:00 (${checkinShort})` : "14:00",
      checkout_time: checkoutShort ? `11:00 (${checkoutShort})` : "11:00",
      description: descriptionParts.length > 0 ? descriptionParts.join(" • ") : undefined,
      amenities,
    };
  });

  const mappedTransfersAndTours = [
    ...transfers.map((tr: TransferDTO, idx: number) => ({
      id: tr.id || `transfer-${idx}`,
      title: tr.route || tr.route_name || tr.type || "Transfer & Receptivo",
      type: "included" as const,
      description: [
        tr.vehicle || tr.vehicle_type,
        tr.is_private ? "Privativo" : undefined,
        tr.pickup_time ? `Saída às ${tr.pickup_time}` : undefined,
        tr.date ? formatDateBr(tr.date) : undefined,
        tr.notes,
      ]
        .filter(Boolean)
        .join(" • "),
    })),
    ...tours.map((tour: TourOptionDTO, idx: number) => ({
      id: tour.id || `tour-${idx}`,
      title: tour.title || `Passeio ${idx + 1}`,
      type: tour.included === false || tour.is_included === false ? ("optional" as const) : ("included" as const),
      description: [tour.duration, tour.description].filter(Boolean).join(" — "),
      image_url: isValidMediaUrl(tour.image_url) ? tour.image_url : undefined,
    })),
  ];

  const mappedItineraryDays = itinerary.map((day: ItineraryDayDTO, idx: number) => {
    const dayImages = Array.from(
      new Set(
        [
          day.image_url,
          ...(Array.isArray(day.images) ? day.images : []),
        ].filter(isValidMediaUrl),
      ),
    );
    return {
      day_number: day.day_number || idx + 1,
      date: formatDateBr(day.date),
      title: day.title || `Dia ${day.day_number || idx + 1}`,
      description: day.description || "",
      images: dayImages,
      hotel_name: day.location || undefined,
      meals_included: Array.isArray(day.included_meals)
        ? day.included_meals.map(normalizeMealTag)
        : [],
    };
  });

  const priceCents = Math.max(
    0,
    Number(proposal.pricing?.total_price_cents || proposal.pricing?.total_cents || 0),
  );
  const installmentOptions = Array.isArray(proposal.pricing?.installments_options)
    ? proposal.pricing.installments_options
    : [];
  const maxInstallmentOption = installmentOptions.reduce<{
    installments_count: number;
    has_interest?: boolean;
  } | null>((best, curr) => {
    if (!best || (curr.installments_count || 0) > best.installments_count) {
      return curr;
    }
    return best;
  }, null);

  const maxInstallments = Math.max(1, maxInstallmentOption?.installments_count || 1);
  const cardInterestFree = maxInstallmentOption ? !maxInstallmentOption.has_interest : true;

  const adultsCount = Math.max(1, Number(proposal.adults_count) || 1);
  const childrenCount = Math.max(0, Number(proposal.children_count) || 0);
  const guestsText =
    childrenCount > 0
      ? `${adultsCount} ${adultsCount > 1 ? "adultos" : "adulto"} + ${childrenCount} ${childrenCount > 1 ? "crianças" : "criança"}`
      : `${adultsCount} ${adultsCount > 1 ? "adultos" : "adulto"}`;

  const departureCity =
    outboundSeg?.departure_city ||
    (typeof customFields.departure_city === "string" ? customFields.departure_city : undefined);
  const destinationCity =
    proposal.destination_city ||
    outboundSeg?.arrival_city ||
    hotels[0]?.destination ||
    "";

  const mealPlan = hotels.find((h) => h.board_basis)?.board_basis || undefined;
  const brandId = proposal.store_id || proposal.public_token;

  const cleanSubtitle = sanitizeLegacyProposalSummaryNotes(proposal.subtitle);
  const quoteTotals = calculateQuoteTotals({
    ...(proposal as any),
    raw_special_notes: proposal.special_notes || proposal.subtitle || "",
  });
  const perPersonCents = Math.round((quoteTotals.valorPorPessoa || 0) * 100);
  const perAdultCents = Math.round((quoteTotals.valorPorAdulto || 0) * 100);
  const rooms = quoteTotals.roomsBreakdown.map((r) => ({
    id: r.id,
    roomNumber: r.roomNumber,
    roomType: r.roomType,
    adults: r.adults,
    children: r.children,
    price_cents: Math.round(r.totalReais * 100),
    price_per_person_cents: Math.round(r.perPersonReais * 100),
  }));
  const roomRates = rooms.map((r) => ({
    id: r.id,
    room_number: r.roomNumber,
    label: `Quarto ${r.roomNumber} — ${r.roomType}`,
    room_type: r.roomType,
    adults: r.adults,
    children: r.children,
    price_cents: r.price_cents,
    price_per_person_cents: r.price_per_person_cents,
  }));

  const sanitizedCustomFields = sanitizeProposalCustomFields(customFields, {
    allowDocumentForStaffStorage: false,
  });
  const customFieldEntries = buildVisibleProposalCustomFieldEntries(sanitizedCustomFields);

  const descriptionLines: string[] = [];
  if (cleanSubtitle) {
    descriptionLines.push(cleanSubtitle);
  }
  if (proposal.client_name) {
    descriptionLines.push(`Proposta personalizada elaborada para ${proposal.client_name}.`);
  }
  if (proposal.pricing?.payment_terms) {
    descriptionLines.push(`Condições comerciais: ${proposal.pricing.payment_terms}`);
  }

  const resolvedNiche = normalizeProposalNicheId(customFields.proposal_niche);
  const mappedCategory = resolvedNiche === "tourism" ? "travel" : resolvedNiche;

  return {
    id: proposal.public_token || proposal.id,
    title: proposal.title || destinationCity || "Proposta de Viagem",
    content: descriptionLines.join("\n\n"),
    description: cleanSubtitle || descriptionLines[0] || "",
    price_cents: priceCents,
    pricing_model: "fixed",
    images,
    feed_media: feedMedia,
    category: mappedCategory,
    category_slug: resolvedNiche === "tourism" ? "viagem" : resolvedNiche,
    niche: mappedCategory,
    niche_id: mappedCategory,
    template_style: "editorial",
    visibility_mode: "unlisted",
    is_custom_quote: true,
    status: proposal.status === "expired" ? "archived" : "active",
    expires_at: proposal.valid_until || null,
    city: destinationCity || undefined,
    contact_whatsapp: proposal.agency_whatsapp || "",
    whatsapp: proposal.agency_whatsapp || "",
    store_id: brandId,
    store: {
      id: brandId,
      name: proposal.agency_name || "Agência Parceira",
      logo_url: isValidMediaUrl(proposal.agency_logo_url) ? proposal.agency_logo_url : null,
      phone: proposal.agency_whatsapp || null,
      city: destinationCity || undefined,
      is_verified: true,
    },
    stores: {
      name: proposal.agency_name || "Agência Parceira",
    },
    attributes: {
      niche: mappedCategory,
      niche_id: mappedCategory,
      proposal_niche: resolvedNiche,
      template_style: "editorial",
      is_custom_quote: true,
      visibility_mode: "unlisted",
      offer_expires_at: proposal.valid_until || null,
      destination_city: destinationCity || undefined,
      departure_city: departureCity,
      departure_date: proposal.travel_start_date || undefined,
      return_date: proposal.travel_end_date || undefined,
      dates_text:
        proposal.travel_start_date && proposal.travel_end_date
          ? `${formatDateBr(proposal.travel_start_date)} até ${formatDateBr(proposal.travel_end_date)}`
          : formatDateBr(proposal.travel_start_date),
      duration_days: durationDays || undefined,
      duration_nights: durationNights || undefined,
      duration_text: durationText,
      meal_plan: mealPlan,
      guests_text: guestsText,
      passenger_composition: {
        adults: adultsCount,
        children: childrenCount,
      },
      price_per_person_cents: perPersonCents > 0 ? perPersonCents : undefined,
      price_per_adult_cents: perAdultCents > 0 ? perAdultCents : undefined,
      rooms,
      room_rates: roomRates,
      transport_type: transportType,
      flight_details: flightDetails,
      lodgings,
      transfers_and_tours: mappedTransfersAndTours,
      itinerary_days: mappedItineraryDays,
      bio_bullets: includes,
      inclusions: includes,
      exclusions: excludes,
      boarding_requirements:
        proposal.boarding_requirements ||
        (typeof customFields.boarding_requirements === "string" ? customFields.boarding_requirements : undefined),
      gateway_logistics:
        typeof customFields.gateway_logistics === "string" ? customFields.gateway_logistics : undefined,
      custom_field_entries: customFieldEntries,
      max_installments: maxInstallments,
      card_interest_free: cardInterestFree,
      installments_interest_free: cardInterestFree,
      accepts_pix: true,
      accepts_card: maxInstallments > 1 || Boolean(proposal.pricing?.payment_terms),
      accepts_cash: true,
      pricing_type: "fixed",
      price_disclaimer: proposal.pricing?.payment_terms ? "custom" : "subject_to_availability",
      custom_disclaimer: proposal.pricing?.payment_terms || "",
      cancellation_policy:
        proposal.cancellation_policy?.trim() ||
        (typeof customFields.cancellation_policy === "string" ? customFields.cancellation_policy.trim() : undefined) ||
        undefined,
    },
  };
}
