import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/money";
import {
  DigitalCompanionCard,
  type DigitalCompanionCardProps,
  type CompanionCardNiche,
  type CompanionCardSectionItem,
  type CompanionRuleItem,
  type CompanionContactItem,
} from "@/components/documents/digital-companion-card";

export function buildClassifiedCompanionData(classified: any): DigitalCompanionCardProps {
  const attrs = classified?.attributes || {};
  const rawCat = String(
    classified?.category_slug ||
      classified?.category_name ||
      classified?.category ||
      attrs.niche ||
      attrs.vertical ||
      ""
  ).toLowerCase();

  const isTourism =
    classified?.template_style === "editorial" ||
    attrs.template_style === "editorial" ||
    rawCat.includes("viag") ||
    rawCat.includes("turism") ||
    rawCat.includes("tour") ||
    rawCat.includes("roteir") ||
    rawCat.includes("excurs") ||
    Boolean(attrs.destination_city || attrs.itinerary_days?.length || attrs.itinerary?.length);

  const isRealEstate =
    rawCat.includes("imove") ||
    rawCat.includes("imóve") ||
    rawCat.includes("hospedagem") ||
    rawCat.includes("temporada") ||
    attrs.property_type;

  const isAuto =
    rawCat.includes("veic") ||
    rawCat.includes("veíc") ||
    rawCat.includes("auto") ||
    rawCat.includes("carro") ||
    rawCat.includes("moto") ||
    attrs.vehicle_brand;

  const isService =
    rawCat.includes("servic") ||
    rawCat.includes("serviç") ||
    attrs.service_modality;

  const nicheType: CompanionCardNiche = isTourism
    ? "tourism"
    : isRealEstate
    ? "real_estate"
    : isAuto
    ? "auto"
    : isService
    ? "service"
    : "retail";

  const title = classified?.title || "Anúncio Waesy";
  const subtitle = [classified?.city, classified?.state].filter(Boolean).join(" - ") || "Brasil";
  const code = classified?.id?.slice(0, 8).toUpperCase() || "WAESY";
  const companyName = classified?.store_name || classified?.profiles?.full_name || "Waesy Comunidade";
  const companyLogoUrl = classified?.profiles?.avatar_url || classified?.store?.logo_url || undefined;
  const coverImageUrl =
    (Array.isArray(classified?.images) && classified.images[0]) ||
    attrs.cover_image ||
    classified?.cover_image ||
    null;

  const price = classified?.price_cents ? formatMoney(classified.price_cents) : "Sob Consulta";

  const sections: CompanionCardSectionItem[] = [];
  const rules: CompanionRuleItem[] = [];

  // ─── 1. SEÇÕES POR NICHO COM ISOLAMENTO CATEGÓRICO ESTRITO ──────────────────
  if (nicheType === "tourism") {
    // Seção Principal: Pacote e Condições
    const travelDetails = [
      { label: "Valor por Pessoa", value: price, highlight: true },
      ...(attrs.destination_city ? [{ label: "Destino", value: attrs.destination_city }] : []),
      ...(attrs.departure_city || attrs.origin_city ? [{ label: "Origem / Embarque", value: attrs.departure_city || attrs.origin_city }] : []),
      ...(attrs.departure_date ? [{ label: "Embarque", value: attrs.departure_date }] : []),
      ...(attrs.return_date ? [{ label: "Retorno", value: attrs.return_date }] : []),
      ...(attrs.duration_days ? [{ label: "Duração", value: `${attrs.duration_days} dias` }] : []),
      ...(attrs.meal_plan || attrs.regime_alimentar ? [{ label: "Regime", value: attrs.meal_plan || attrs.regime_alimentar }] : []),
    ];

    sections.push({
      type: "custom",
      badge: "Pacote de Viagem",
      title,
      subtitle: attrs.destination_city ? `${attrs.destination_city} • ${subtitle}` : subtitle,
      details: travelDetails,
    });

    // Transporte / Voo
    if (attrs.flight_details || attrs.transport_type) {
      const flight = attrs.flight_details;
      sections.push({
        type: attrs.transport_type === "flight" || flight ? "flight" : "transport",
        badge: "Transporte do Pacote",
        title: flight
          ? `${flight.airline || "Voo Regular"} (${flight.departure_airport || ""} → ${flight.arrival_airport || ""})`
          : `Transporte: ${attrs.transport_type || "Incluso"}`,
        subtitle: flight?.duration_text || undefined,
        details: [
          ...(flight?.departure_time ? [{ label: "Horário de Saída", value: flight.departure_time }] : []),
          ...(flight?.arrival_time ? [{ label: "Horário de Chegada", value: flight.arrival_time }] : []),
          ...(flight?.luggage_allowance ? [{ label: "Bagagem", value: flight.luggage_allowance }] : []),
          ...(attrs.departure_location ? [{ label: "Ponto de Encontro", value: attrs.departure_location }] : []),
        ],
      });
    }

    // Hospedagem
    const hotelName = attrs.lodgings?.[0]?.name || attrs.hotel_name;
    if (hotelName) {
      sections.push({
        type: "hotel",
        badge: "Hospedagem Confirmada",
        title: hotelName,
        subtitle: attrs.lodgings?.[0]?.city || attrs.destination_city || subtitle,
        details: [
          ...(attrs.hotel_stars ? [{ label: "Estrelas", value: `${attrs.hotel_stars} estrelas` }] : []),
          ...(attrs.hotel_checkin ? [{ label: "Check-in", value: attrs.hotel_checkin }] : []),
          ...(attrs.hotel_checkout ? [{ label: "Check-out", value: attrs.hotel_checkout }] : []),
          ...(attrs.hotel_room_type ? [{ label: "Acomodação", value: attrs.hotel_room_type }] : []),
          ...(attrs.hotel_address ? [{ label: "Endereço", value: attrs.hotel_address }] : []),
        ],
      });
    }

    // Roteiro Dia a Dia Completo
    const rawItinerary = Array.isArray(attrs.itinerary_days) && attrs.itinerary_days.length > 0
      ? attrs.itinerary_days
      : Array.isArray(attrs.itinerary) && attrs.itinerary.length > 0
      ? attrs.itinerary
      : [];

    rawItinerary.forEach((day: any, i: number) => {
      const dayNum = day.day_number || i + 1;
      const dayTitle = day.title || `Dia ${dayNum}`;
      const dayDetails: Array<{ label: string; value: string; highlight?: boolean }> = [];

      if (day.date) dayDetails.push({ label: "Data", value: day.date });
      if (day.hotel_name) dayDetails.push({ label: "Hotel", value: day.hotel_name });
      if (day.transport) dayDetails.push({ label: "Transporte", value: day.transport });
      if (Array.isArray(day.meals_included) && day.meals_included.length > 0) {
        dayDetails.push({
          label: "Refeições",
          value: day.meals_included
            .map((m: string) => (m === "breakfast" ? "Café" : m === "lunch" ? "Almoço" : "Jantar"))
            .join(", "),
        });
      }
      if (Array.isArray(day.activities) && day.activities.length > 0) {
        dayDetails.push({ label: "Atividades", value: day.activities.join(" • ") });
      }
      if (day.description) {
        dayDetails.push({ label: "Cronograma", value: day.description });
      }

      sections.push({
        type: "tour",
        badge: `Roteiro • Dia ${dayNum}`,
        title: dayTitle,
        subtitle: day.date || undefined,
        details: dayDetails,
      });
    });

    // Regras & Recomendações de Turismo
    rules.push({
      title: "Documentação",
      description: "Apresente documento original com foto (RG ou Passaporte válido) no momento do embarque.",
      priority: "high",
    });
    if (attrs.cancellation_policy) {
      rules.push({
        title: "Cancelamento",
        description: attrs.cancellation_policy,
        priority: "medium",
      });
    }
  } else if (nicheType === "real_estate") {
    // Imóveis
    sections.push({
      type: "hotel",
      badge: "Dados do Imóvel",
      title,
      subtitle,
      details: [
        { label: "Valor", value: price, highlight: true },
        ...(attrs.total_area ? [{ label: "Área Total", value: `${attrs.total_area} m²` }] : []),
        ...(attrs.bedrooms ? [{ label: "Quartos", value: String(attrs.bedrooms) }] : []),
        ...(attrs.suites ? [{ label: "Suítes", value: String(attrs.suites) }] : []),
        ...(attrs.bathrooms ? [{ label: "Banheiros", value: String(attrs.bathrooms) }] : []),
        ...(attrs.garage_spots ? [{ label: "Vagas", value: String(attrs.garage_spots) }] : []),
        ...(attrs.condo_fee ? [{ label: "Condomínio", value: formatMoney(attrs.condo_fee) }] : []),
        ...(classified?.address ? [{ label: "Endereço", value: classified.address }] : []),
      ],
    });
  } else if (nicheType === "auto") {
    // Veículos
    sections.push({
      type: "transport",
      badge: "Ficha do Veículo",
      title,
      subtitle,
      details: [
        { label: "Valor", value: price, highlight: true },
        ...(attrs.vehicle_brand ? [{ label: "Marca", value: attrs.vehicle_brand }] : []),
        ...(attrs.vehicle_model ? [{ label: "Modelo", value: attrs.vehicle_model }] : []),
        ...(attrs.year ? [{ label: "Ano", value: String(attrs.year) }] : []),
        ...(attrs.mileage_km ? [{ label: "Quilometragem", value: `${Number(attrs.mileage_km).toLocaleString("pt-BR")} km` }] : []),
        ...(attrs.fuel_type ? [{ label: "Combustível", value: attrs.fuel_type }] : []),
        ...(attrs.transmission ? [{ label: "Câmbio", value: attrs.transmission }] : []),
      ],
    });
  } else if (nicheType === "service") {
    // Serviços
    sections.push({
      type: "service_item",
      badge: "Especificações do Serviço",
      title,
      subtitle,
      details: [
        { label: "Orçamento Estimado", value: price, highlight: true },
        ...(attrs.service_modality ? [{ label: "Modalidade", value: attrs.service_modality }] : []),
        ...(attrs.estimated_time ? [{ label: "Prazo Estimado", value: attrs.estimated_time }] : []),
        ...(attrs.warranty_months ? [{ label: "Garantia", value: `${attrs.warranty_months} meses` }] : []),
      ],
    });
  } else {
    // Varejo / Produtos Gerais
    sections.push({
      type: "custom",
      badge: "Detalhes do Produto",
      title,
      subtitle,
      details: [
        { label: "Valor Anunciado", value: price, highlight: true },
        ...(classified?.condition ? [{ label: "Condição", value: classified.condition === "new" ? "Novo" : "Usado" }] : []),
        ...(attrs.delivery_available ? [{ label: "Entrega Local", value: "Disponível" }] : []),
        ...(attrs.warranty_months ? [{ label: "Garantia", value: `${attrs.warranty_months} meses` }] : []),
        ...(classified?.address ? [{ label: "Local de Retirada", value: classified.address }] : []),
      ],
    });
  }

  const sellerPhone =
    classified?.contact_whatsapp ||
    classified?.whatsapp ||
    classified?.store?.settings?.whatsapp_phone ||
    classified?.profiles?.phone;

  const emergencyContacts: CompanionContactItem[] = [
    ...(sellerPhone
      ? [
          {
            name: companyName,
            category: "Anunciante / Consultor",
            phone: sellerPhone,
            whatsapp: true,
            is24h: false,
          },
        ]
      : []),
    {
      name: "Central Waesy",
      category: "Suporte Comunitário",
      phone: "0800 000 0000",
      whatsapp: true,
      is24h: true,
    },
  ];

  return {
    niche: nicheType,
    title,
    subtitle,
    code,
    companyName,
    companyLogoUrl,
    coverImageUrl,
    participantsLabel: nicheType === "tourism" ? "Viajante" : "Interessado",
    participants: [],
    sections,
    rules,
    emergencyContacts,
    observations: classified?.content?.slice(0, 300) || undefined,
  };
}

interface ClassifiedCompanionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classified: any;
}

export function ClassifiedCompanionDialog({
  open,
  onOpenChange,
  classified,
}: ClassifiedCompanionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-screen overflow-y-auto p-4 sm:p-6 rounded-lg bg-background border border-border shadow-xs">
        <DialogHeader className="sr-only">
          <DialogTitle>Guia Digital 9:16 do Anúncio</DialogTitle>
          <DialogDescription>Cartão e guia digital interativo do anúncio</DialogDescription>
        </DialogHeader>
        {classified && (
          <div className="w-full">
            <DigitalCompanionCard {...buildClassifiedCompanionData(classified)} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
