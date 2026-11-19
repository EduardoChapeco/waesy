import React from "react";
import type { TravelProposalDTO } from "@/services/travel-proposal.functions";
import { getProposalTemplate } from "@/components/tourism/proposals/templates";
import { PoweredByWaesyBadge } from "@/components/common/powered-by-waesy-badge";
import { resolveProposalCanvasTheme } from "@/lib/tourism/proposal-theme-palettes";
import {
  extractGatewayLogisticsFromNotes,
  sanitizeLegacyProposalSummaryNotes,
} from "@/lib/tourism/pricing";
import {
  buildVisibleProposalCustomFieldEntries,
  formatProposalPaymentTermsForDisplay,
  sanitizeProposalCustomFields,
} from "@/lib/tourism/proposal-custom-fields";
import {
  extractImageUrlsFromMedia,
  normalizeEntityMediaList,
  normalizeHotelsList,
  normalizeToursList,
  normalizeTransfersList,
  resolveTransferDisplayTitle,
  resolveTransferKindBadge,
} from "@/lib/tourism/proposal-normalization";

interface ProposalCanvasRendererProps {
  proposal: TravelProposalDTO;
}

/**
 * Normaliza os IDs de template do workspace para os IDs canônicos
 * dos repositórios de referência extraídos.
 */
function normalizeTemplateId(id: string): string {
  const MAP: Record<string, string> = {
    executivo: "executivo-b2b",
    "executivo-b2b": "executivo-b2b",
    "editorial-flat": "editorial-flat",
    "dark-premium": "dark-premium",
    landscape: "landscape-presentation",
    "landscape-presentation": "landscape-presentation",
    "vertical-premium": "vertical-premium",
    "group-catalog": "group-catalog",
    bento: "bento-grid",
    "bento-grid": "bento-grid",
  };
  return MAP[id] ?? id;
}

const BOARD_BASIS_LABELS: Record<string, string> = {
  all_inclusive: "All Inclusive",
  full_board: "Pensão Completa",
  half_board: "Meia Pensão",
  breakfast: "Café da Manhã",
  none: "Somente Hospedagem",
};

/**
 * Adapta de forma bidirecional o contrato canônico TravelProposalDTO para
 * o modelo esperado pelos 6 templates visuais (TemplateEditorialFlat,
 * TemplateExecutivo, TemplateDarkPremium, TemplateLandscape,
 * TemplateVerticalPremium e TemplateGroupCatalog), garantindo que 100%
 * dos campos editados no Studio (voos, hotéis, quartos, roteiro, passeios,
 * transfers, inclusões, exclusões e preços/parcelas) reflitam em tempo real.
 */
function normalizeProposalForCanvas(proposal: TravelProposalDTO): Record<string, any> {
  const raw = proposal as Record<string, any>;
  const pricing = proposal.pricing || ({} as any);
  const totalCents = Number(pricing.total_price_cents ?? pricing.total_cents ?? 0);
  const baseCents = Number(pricing.base_price_cents ?? 0);
  const taxCents = Number(pricing.boarding_tax_cents ?? 0) + Number(pricing.other_taxes_cents ?? 0);
  const discountCents = Number(pricing.discount_cents ?? 0);

  const totalReais = totalCents > 0 ? totalCents / 100 : Number(raw.total || 0);
  const subtotalReais =
    baseCents + taxCents > 0
      ? (baseCents + taxCents) / 100
      : totalReais + discountCents / 100;

  const installmentOpts = Array.isArray(pricing.installments_options)
    ? pricing.installments_options
    : [];
  const cardOpts = installmentOpts.filter(
    (o: any) => o.method === "credit_card" || o.method === "card",
  );
  const bestCard =
    cardOpts.length > 0
      ? cardOpts.reduce((a: any, b: any) =>
          (b.installments_count || 1) > (a.installments_count || 1) ? b : a,
        )
      : null;
  const boletoOpts = installmentOpts.filter((o: any) => o.method === "boleto");
  const bestBoleto =
    boletoOpts.length > 0
      ? boletoOpts.reduce((a: any, b: any) =>
          (b.installments_count || 1) > (a.installments_count || 1) ? b : a,
        )
      : null;
  const pixOpt = installmentOpts.find((o: any) => o.method === "pix");

  let pixDiscountPercent = Number(raw.pix_discount_percent || 0);
  if (pixDiscountPercent === 0 && subtotalReais > 0 && discountCents > 0) {
    pixDiscountPercent = Math.round(((discountCents / 100) / subtotalReais) * 100);
  } else if (
    pixDiscountPercent === 0 &&
    totalReais > 0 &&
    pixOpt?.installment_value_cents &&
    pixOpt.installment_value_cents / 100 < totalReais
  ) {
    pixDiscountPercent = Math.round(
      ((totalReais - pixOpt.installment_value_cents / 100) / totalReais) * 100,
    );
  }

  const normalizedFlights = (proposal.flights || []).map((f: any) => ({
    ...f,
    airline: f.airline || f.airline_name || "Companhia Aérea",
    airline_name: f.airline_name || f.airline || "Companhia Aérea",
    origin: f.origin_iata || f.origin || f.origin_city || "---",
    origin_iata: f.origin_iata || f.origin || "---",
    destination: f.destination_iata || f.destination || f.destination_city || "---",
    destination_iata: f.destination_iata || f.destination || "---",
    date: f.date || f.departure_date || proposal.travel_start_date || "",
    stops: f.stops ?? f.stops_count ?? (Array.isArray(f.connection_airports) ? f.connection_airports.length : 0),
    stops_count: f.stops_count ?? f.stops ?? (Array.isArray(f.connection_airports) ? f.connection_airports.length : 0),
    connection_airports: Array.isArray(f.connection_airports) ? f.connection_airports : undefined,
    legs: Array.isArray(f.legs) ? f.legs : undefined,
    baggage_rules:
      f.baggage_rules ||
      (typeof f.baggage_included === "string"
        ? f.baggage_included
        : f.baggage || "Bagagem inclusa"),
    price: Number(f.price || 0),
  }));

  const normalizedHotels = normalizeHotelsList(proposal.hotels || []).map((h: any) => {
    const mediaList = normalizeEntityMediaList({
      media: h.media,
      featured_image_url: h.featured_image_url,
      image_url: h.image_url,
      images: h.images,
      video_url: h.video_url,
      object_position: h.object_position,
      image_scale: h.image_scale,
    });
    const imgList = extractImageUrlsFromMedia(mediaList);
    const roomsList =
      Array.isArray(h.rooms) && h.rooms.length > 0
        ? h.rooms
        : [
            {
              qty:
                Array.isArray(proposal.rooms) && proposal.rooms.length > 0
                  ? proposal.rooms.length
                  : 1,
              type: h.room_type || "Apartamento Superior",
            },
          ];
    return {
      ...h,
      name: h.name || h.hotel_name || "Hospedagem Selecionada",
      hotel_name: h.hotel_name || h.name || "Hospedagem Selecionada",
      city: h.city || h.destination || proposal.destination_city || "",
      checkin: h.checkin || h.checkin_date || h.check_in || proposal.travel_start_date || "",
      checkout: h.checkout || h.checkout_date || h.check_out || proposal.travel_end_date || "",
      meal_plan:
        h.meal_plan ||
        BOARD_BASIS_LABELS[h.board_basis || ""] ||
        h.board_basis ||
        "Café da Manhã",
      media: mediaList,
      images: imgList,
      rooms: roomsList,
      price: Number(h.price ?? (h.price_cents ? h.price_cents / 100 : 0)),
    };
  });

  const normalizedItinerary = (proposal.itinerary || []).map((d: any, idx: number) => {
    const rawMeals = Array.isArray(d.meals)
      ? d.meals
      : Array.isArray(d.included_meals)
        ? d.included_meals
        : typeof d.meals === "string"
          ? [d.meals]
          : typeof d.included_meals === "string"
            ? [d.included_meals]
            : [];
    const dayMedia = normalizeEntityMediaList({
      media: d.media,
      image_url: d.image_url,
      images: d.images,
      video_url: d.video_url,
      object_position: d.object_position,
      image_scale: d.image_scale,
    });
    return {
      ...d,
      day: d.day || `Dia ${d.day_number || idx + 1}`,
      day_number: d.day_number || idx + 1,
      city: d.city || d.location || "",
      location: d.location || d.city || "",
      meals: rawMeals,
      included_meals: rawMeals,
      media: dayMedia,
      images: extractImageUrlsFromMedia(dayMedia),
    };
  });

  const normalizedTransfers = normalizeTransfersList(proposal.transfers || []).map((t: any, idx: number) => {
    const displayTitle = resolveTransferDisplayTitle(t, idx);
    const kindLabel = resolveTransferKindBadge(t.kind || t.type);
    return {
      ...t,
      name: displayTitle,
      description: displayTitle,
      route: displayTitle,
      route_name: displayTitle,
      type: t.type === "shared" || t.type === "Regular" || t.is_private === false ? "shared" : "private",
      kind_label: kindLabel,
      vehicle:
        t.vehicle ||
        t.vehicle_type ||
        (typeof t.type === "string" && (t.type.includes("Ônibus") || t.type.includes("Van"))
          ? t.type
          : "Transfer Regular"),
      date: t.date || "",
      notes: [
        t.notes,
        t.pickup_time ? `Embarque: ${t.pickup_time}` : null,
        t.dropoff_time ? `Desembarque: ${t.dropoff_time}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      price: Number(t.price ?? (t.price_cents ? t.price_cents / 100 : 0)),
    };
  });

  const normalizedTours = normalizeToursList(proposal.tours || []).map((t: any) => {
    const mediaList = normalizeEntityMediaList({
      media: t.media,
      image_url: t.image_url,
      images: t.images,
      video_url: t.video_url,
      object_position: t.object_position,
      image_scale: t.image_scale,
    });
    const tourImages = extractImageUrlsFromMedia(mediaList);
    return {
      ...t,
      description: t.description || t.title || "Passeio / Experiência",
      title: t.title || t.description || "Passeio / Experiência",
      date: t.date || t.duration || "",
      media: mediaList,
      image_url: t.image_url || tourImages[0] || undefined,
      images: tourImages,
      price: Number(t.price ?? (t.price_cents ? t.price_cents / 100 : 0)),
    };
  });

  const lineItemsSum =
    normalizedFlights.reduce((acc, f) => acc + f.price, 0) +
    normalizedHotels.reduce((acc, h) => acc + h.price, 0) +
    normalizedTransfers.reduce((acc, t) => acc + t.price, 0) +
    normalizedTours.reduce((acc, t) => acc + t.price, 0);

  const customPayments =
    Array.isArray(raw.custom_payments) && raw.custom_payments.length > 0
      ? raw.custom_payments
      : lineItemsSum === 0 && subtotalReais > 0
        ? [
            {
              id: "pkg-base",
              description: "Pacote Completo",
              price: subtotalReais,
              is_optional: false,
            },
          ]
        : [];

  const rawCustomFields = {
    ...(pricing.custom_fields && typeof pricing.custom_fields === "object" ? pricing.custom_fields : {}),
    ...(raw.custom_fields && typeof raw.custom_fields === "object" ? raw.custom_fields : {}),
  } as Record<string, unknown>;

  const normalizedCustomFields = sanitizeProposalCustomFields(rawCustomFields, {
    allowDocumentForStaffStorage: false,
  });
  const customFieldEntries = buildVisibleProposalCustomFieldEntries(normalizedCustomFields);

  const customAgentName =
    typeof rawCustomFields.agent_name === "string" && rawCustomFields.agent_name.trim()
      ? rawCustomFields.agent_name.trim()
      : proposal.agent_name;
  const customAgentWhatsapp =
    typeof rawCustomFields.agent_whatsapp === "string" && rawCustomFields.agent_whatsapp.trim()
      ? rawCustomFields.agent_whatsapp.trim()
      : proposal.agent_whatsapp || proposal.agency_whatsapp;
  const customAgencyName =
    typeof rawCustomFields.agency_name === "string" && rawCustomFields.agency_name.trim()
      ? rawCustomFields.agency_name.trim()
      : proposal.agency_name;
  const customAgencyLogo =
    typeof rawCustomFields.agency_logo_url === "string" && rawCustomFields.agency_logo_url.trim()
      ? rawCustomFields.agency_logo_url.trim()
      : proposal.agency_logo_url;

  const rawCombinedNotes = String(raw.notes || proposal.special_notes || proposal.subtitle || "");
  const cleanHeroNotes = sanitizeLegacyProposalSummaryNotes(
    proposal.subtitle || raw.notes || proposal.special_notes || "",
  );
  const cleanTerms = formatProposalPaymentTermsForDisplay(
    sanitizeLegacyProposalSummaryNotes(
      raw.terms || pricing.payment_terms || proposal.special_notes || "",
    ),
  );
  const extractedGateway =
    (typeof rawCustomFields.gateway_logistics === "string"
      ? rawCustomFields.gateway_logistics.trim()
      : "") || extractGatewayLogisticsFromNotes(rawCombinedNotes);

  if (extractedGateway && normalizedTransfers.length === 0) {
    normalizedTransfers.push({
      id: "gateway-transfer-auto",
      description: "Logística Regional de Aeroporto Gateway",
      type: "shared",
      vehicle: "Transfer Regional",
      date: proposal.travel_start_date || "",
      notes: extractedGateway,
      price: 0,
    });
  }

  const rawGalleryStr =
    typeof rawCustomFields.destination_gallery_urls === "string"
      ? rawCustomFields.destination_gallery_urls
      : "";
  const destinationGallery = rawGalleryStr
    .split(/[\n,|]+/)
    .map((u) => u.trim())
    .filter((u) => u.startsWith("http://") || u.startsWith("https://"));

  return {
    ...proposal,
    template: normalizeTemplateId(
      (proposal as any)?.template || proposal.template_theme || "editorial-flat",
    ),
    agent_name: customAgentName,
    agent_whatsapp: customAgentWhatsapp,
    agency_name: customAgencyName,
    agency_logo_url: customAgencyLogo,
    number:
      raw.number ||
      proposal.quote_id?.slice(0, 8).toUpperCase() ||
      proposal.id?.slice(0, 8).toUpperCase() ||
      "PROP",
    destination: raw.destination || proposal.destination_city || "",
    travel_start: raw.travel_start || proposal.travel_start_date || "",
    travel_end: raw.travel_end || proposal.travel_end_date || "",
    pax_adults: raw.pax_adults ?? proposal.adults_count ?? 2,
    pax_children: raw.pax_children ?? proposal.children_count ?? 0,
    pax_infants: raw.pax_infants ?? 0,
    pax_seniors: raw.pax_seniors ?? 0,
    currency: raw.currency || pricing.currency || "BRL",
    subtotal: subtotalReais,
    total: totalReais,
    discount: discountCents > 0 ? discountCents / 100 : Number(raw.discount || 0),
    pix_discount_percent: pixDiscountPercent,
    installments_card: bestCard?.installments_count || Number(raw.installments_card || 10),
    installments_boleto: bestBoleto?.installments_count || Number(raw.installments_boleto || 1),
    raw_special_notes: rawCombinedNotes,
    notes: cleanHeroNotes,
    terms: cleanTerms,
    gateway_logistics: extractedGateway || undefined,
    destination_gallery: destinationGallery,
    flights: normalizedFlights,
    hotels: normalizedHotels,
    itinerary: normalizedItinerary,
    transfers: normalizedTransfers,
    tours: normalizedTours,
    cruises: Array.isArray(proposal.cruises) ? proposal.cruises : Array.isArray(raw.cruises) ? raw.cruises : [],
    rooms: Array.isArray(proposal.rooms) ? proposal.rooms : [],
    options: Array.isArray(proposal.options) ? proposal.options : [],
    custom_payments: customPayments,
    custom_fields: normalizedCustomFields,
    custom_field_entries: customFieldEntries,
    boarding_requirements:
      typeof rawCustomFields.boarding_requirements === "string"
        ? rawCustomFields.boarding_requirements
        : typeof normalizedCustomFields.boarding_requirements === "string"
          ? normalizedCustomFields.boarding_requirements
          : undefined,
    cancellation_policy:
      typeof rawCustomFields.cancellation_policy === "string"
        ? rawCustomFields.cancellation_policy
        : typeof normalizedCustomFields.cancellation_policy === "string"
          ? normalizedCustomFields.cancellation_policy
          : undefined,
  };
}

export function ProposalCanvasRenderer({ proposal }: ProposalCanvasRendererProps) {
  const rawTemplate =
    (proposal as any)?.template || proposal.template_theme || "editorial-flat";
  const templateId = normalizeTemplateId(rawTemplate);
  const normalizedProposal = normalizeProposalForCanvas(proposal);

  const baseAgency = {
    name: normalizedProposal.agency_name || proposal.agency_name || "Agência",
    logo_url: normalizedProposal.agency_logo_url || proposal.agency_logo_url,
    brand_color: (proposal as any)?.agency_brand_color,
    phone: proposal.agency_phone,
    email: proposal.agency_email,
    whatsapp: normalizedProposal.agent_whatsapp || proposal.agency_whatsapp,
  };

  const theme = resolveProposalCanvasTheme(normalizedProposal, baseAgency);

  const agency = {
    ...baseAgency,
    brand_color: theme.brandColor,
    brand_color_fg: theme.brandFg,
    brand_color_light: theme.brandSoft,
  };

  const TemplateComponent = getProposalTemplate(templateId);
  return (
    <div
      data-proposal-canvas="true"
      data-canvas-tone={theme.tone}
      data-canvas-bg={theme.canvasBg}
      style={theme.cssVars as React.CSSProperties}
      className="p-canvas-root w-full min-h-full flex flex-col justify-between"
    >
      <div className="w-full flex-1">
        <TemplateComponent proposal={normalizedProposal as any} agency={agency} />
      </div>
      {theme.isSectionVisible("footer") && (
        <div className="pt-3 pb-6 flex justify-center p-surface-subtle border-t p-border-subtle">
          <PoweredByWaesyBadge variant="minimal" shortUrl="waesy.me/propostas" />
        </div>
      )}
    </div>
  );
}
