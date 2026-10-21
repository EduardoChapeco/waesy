import React from "react";
import type { TravelProposalDTO } from "@/services/travel-proposal.functions";
import { getProposalTemplate } from "@/components/tourism/proposals/templates";
import { PoweredByWaesyBadge } from "@/components/common/powered-by-waesy-badge";

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
    stops: f.stops ?? f.stops_count ?? 0,
    stops_count: f.stops_count ?? f.stops ?? 0,
    baggage_rules:
      f.baggage_rules ||
      (typeof f.baggage_included === "string"
        ? f.baggage_included
        : f.baggage || "Bagagem inclusa"),
    price: Number(f.price || 0),
  }));

  const normalizedHotels = (proposal.hotels || []).map((h: any) => {
    const imgList =
      Array.isArray(h.images) && h.images.length > 0
        ? h.images
        : [h.image_url, h.featured_image_url].filter(Boolean);
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
      images: imgList,
      rooms: roomsList,
      price: Number(h.price || 0),
    };
  });

  const normalizedItinerary = (proposal.itinerary || []).map((d: any, idx: number) => ({
    ...d,
    day: d.day || `Dia ${d.day_number || idx + 1}`,
    day_number: d.day_number || idx + 1,
    city: d.city || d.location || "",
    meals: Array.isArray(d.meals) ? d.meals : d.included_meals || [],
    images:
      Array.isArray(d.images) && d.images.length > 0
        ? d.images
        : d.image_url
          ? [d.image_url]
          : [],
  }));

  const normalizedTransfers = (proposal.transfers || []).map((t: any) => ({
    ...t,
    description: t.description || t.type || "Transfer Aeroporto / Hotel",
    type: t.type === "shared" || t.type === "Regular" ? "shared" : "private",
    vehicle: t.vehicle || t.vehicle_type || "Executivo",
    date: t.date || "",
    notes: t.notes || "",
    price: Number(t.price ?? (t.price_cents ? t.price_cents / 100 : 0)),
  }));

  const normalizedTours = (proposal.tours || []).map((t: any) => ({
    ...t,
    description: t.description || t.title || "Passeio / Experiência",
    title: t.title || t.description || "Passeio / Experiência",
    date: t.date || t.duration || "",
    price: Number(t.price ?? (t.price_cents ? t.price_cents / 100 : 0)),
  }));

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

  return {
    ...proposal,
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
    notes: raw.notes || proposal.special_notes || proposal.subtitle || "",
    terms: raw.terms || pricing.payment_terms || proposal.special_notes || "",
    flights: normalizedFlights,
    hotels: normalizedHotels,
    itinerary: normalizedItinerary,
    transfers: normalizedTransfers,
    tours: normalizedTours,
    custom_payments: customPayments,
  };
}

export function ProposalCanvasRenderer({ proposal }: ProposalCanvasRendererProps) {
  const rawTemplate =
    (proposal as any)?.template || proposal.template_theme || "editorial-flat";
  const templateId = normalizeTemplateId(rawTemplate);
  const normalizedProposal = normalizeProposalForCanvas(proposal);

  const agency = {
    name: proposal.agency_name || "Agência",
    logo_url: proposal.agency_logo_url,
    brand_color: (proposal as any)?.agency_brand_color || "#0A2540",
    brand_color_fg: "#ffffff",
    brand_color_light: "#eff6ff",
    phone: proposal.agency_phone,
    email: proposal.agency_email,
    whatsapp: proposal.agency_whatsapp,
  };

  const TemplateComponent = getProposalTemplate(templateId);
  return (
    <div className="w-full space-y-4">
      <TemplateComponent proposal={normalizedProposal as any} agency={agency} />
      <div className="pt-2 pb-6 flex justify-center">
        <PoweredByWaesyBadge variant="minimal" shortUrl="waesy.me/propostas" />
      </div>
    </div>
  );
}
