/**
 * niche-taxonomy-manifest.ts — Taxonomia Canônica e Validação Condicional por Nicho (F09, F10, F24)
 * 
 * Regras:
 * - R06: O template é COMPOSIÇÃO, não tema.
 * - R10: O nicho é dado, não código. Nada de if (nicho === "turismo") espalhado.
 * - O02: Elimina templates incoerentes no nível de dado (ex: Mercado em Turismo).
 */

export interface NicheSectionComposition {
  id: string;
  label: string;
  order: number;
  isRequired: boolean;
  isInternalOnly?: boolean;
}

export interface NicheTaxonomyConfig {
  id: string;
  name: string;
  label?: string;
  defaultSellingUnit: string;
  allowedSellingUnits: string[];
  allowedTemplates: string[];
  mandatoryListingFields: string[];
  mandatoryAttributes: string[];
  optionalAttributes: string[];
  sectionsComposition: NicheSectionComposition[];
}

export const NICHE_TAXONOMY_REGISTRY: Record<string, NicheTaxonomyConfig> = {
  // ── TURISMO, VIAGENS & PACOTES ──
  turismo: {
    id: "turismo",
    name: "Turismo & Viagens",
    defaultSellingUnit: "pessoa",
    allowedSellingUnits: ["pessoa", "casal", "grupo", "diária"],
    // O02 RESOLVIDO NO DADO: Apenas templates de turismo são aceitos!
    allowedTemplates: ["tourism_immersive", "tourism_catalog"],
    mandatoryListingFields: [
      "title",
      "price_cents",
      "inclusions",
      "cover_url",
    ],
    mandatoryAttributes: [
      "destination_name",
      "transport_type",
    ],
    optionalAttributes: [
      "hotel_name",
      "hotel_rating",
      "meal_plan",
      "room_type",
      "itinerary_days",
    ],
    sectionsComposition: [
      { id: "hero_immersive", label: "Capa & Destino", order: 1, isRequired: true },
      { id: "commercial_conditions", label: "Preço & Condições", order: 2, isRequired: true },
      { id: "departures_schedule", label: "Datas & Saídas", order: 3, isRequired: true },
      { id: "inclusions_scope", label: "Itens Inclusos & Exclusos", order: 4, isRequired: true },
      { id: "itinerary_timeline", label: "Roteiro Dia a Dia", order: 5, isRequired: false },
      { id: "accommodation_details", label: "Hospedagem & Resort", order: 6, isRequired: false },
      { id: "policies_and_cancellation", label: "Políticas & Termos", order: 7, isRequired: true },
      { id: "internal_margins", label: "Margem e Custo da Operadora", order: 8, isRequired: false, isInternalOnly: true },
    ],
  },

  // ── MERCADO, HORTIFRUTI & PERECÍVEIS ──
  mercado: {
    id: "mercado",
    name: "Mercado & Perecíveis",
    defaultSellingUnit: "un",
    allowedSellingUnits: ["un", "kg", "g", "cx", "fd"],
    // O02: Apenas gôndola de conveniência
    allowedTemplates: ["grocery_gondola"],
    mandatoryListingFields: [
      "title",
      "price_cents",
      "selling_unit",
      "cover_url",
    ],
    mandatoryAttributes: [
      "department",
    ],
    optionalAttributes: [
      "brand",
      "barcode_ean",
      "ripeness_stage",
      "storage_temperature",
      "contains_gluten",
      "contains_lactose",
      "is_organic",
    ],
    sectionsComposition: [
      { id: "product_identity", label: "Identificação & Gôndola", order: 1, isRequired: true },
      { id: "pricing_per_unit", label: "Preço por Unidade / Kg", order: 2, isRequired: true },
      { id: "freshness_specs", label: "Especificações de Frescor", order: 3, isRequired: false },
      { id: "stock_availability", label: "Disponibilidade em Prateleira", order: 4, isRequired: true },
    ],
  },

  // ── E-COMMERCE & VAREJO GERAL ──
  varejo: {
    id: "varejo",
    name: "Varejo & Produtos",
    defaultSellingUnit: "un",
    allowedSellingUnits: ["un", "kit", "cx", "par"],
    allowedTemplates: ["retail_ecommerce", "retail_grid"],
    mandatoryListingFields: [
      "title",
      "price_cents",
      "cover_url",
    ],
    mandatoryAttributes: [],
    optionalAttributes: [
      "brand",
      "sku",
      "warranty_months",
      "dimensions_cm",
      "weight_grams",
    ],
    sectionsComposition: [
      { id: "product_gallery", label: "Galeria de Fotos", order: 1, isRequired: true },
      { id: "product_info", label: "Detalhes do Produto", order: 2, isRequired: true },
      { id: "variant_matrix", label: "Cores e Tamanhos", order: 3, isRequired: false },
      { id: "shipping_calc", label: "Frete e Prazos", order: 4, isRequired: true },
      { id: "fiscal_ncm", label: "Classificação Fiscal", order: 5, isRequired: false, isInternalOnly: true },
    ],
  },

  // ── SERVIÇOS & PROFISSIONAIS ──
  servico: {
    id: "servico",
    name: "Serviços & Atendimento",
    defaultSellingUnit: "servico",
    allowedSellingUnits: ["servico", "hora", "diária", "projeto"],
    allowedTemplates: ["service_booking", "service_portfolio"],
    mandatoryListingFields: [
      "title",
      "price_cents",
      "description",
    ],
    mandatoryAttributes: [
      "service_mode", // presencial | remoto
    ],
    optionalAttributes: [
      "duration_minutes",
      "experience_years",
      "portfolio_urls",
    ],
    sectionsComposition: [
      { id: "service_overview", label: "Apresentação do Serviço", order: 1, isRequired: true },
      { id: "pricing_scope", label: "Honorários & Escopo", order: 2, isRequired: true },
      { id: "inclusions_scope", label: "O que inclui na execução", order: 3, isRequired: true },
      { id: "schedule_agenda", label: "Agenda & Agendamento", order: 4, isRequired: false },
    ],
  },

  // ── IMÓVEIS & LOCAÇÃO ──
  imovel: {
    id: "imovel",
    name: "Imóveis & Temporada",
    defaultSellingUnit: "imovel",
    allowedSellingUnits: ["imovel", "diária", "mês"],
    allowedTemplates: ["real_estate_property"],
    mandatoryListingFields: [
      "title",
      "price_cents",
      "location",
      "cover_url",
    ],
    mandatoryAttributes: [
      "deal_type", // venda | aluguel | temporada
      "property_type",
      "area_sqm",
    ],
    optionalAttributes: [
      "bedrooms",
      "bathrooms",
      "parking_spaces",
      "condo_fee_cents",
      "iptu_annual_cents",
    ],
    sectionsComposition: [
      { id: "property_hero", label: "Fotos & Localização", order: 1, isRequired: true },
      { id: "property_specs", label: "Metragem & Cômodos", order: 2, isRequired: true },
      { id: "financial_conditions", label: "Valores & Condomínio", order: 3, isRequired: true },
      { id: "amenities_list", label: "Comodidades do Imóvel", order: 4, isRequired: false },
    ],
  },

  // ── VEÍCULOS & AUTOMOTIVO ──
  veiculo: {
    id: "veiculo",
    name: "Veículos & Automotivo",
    defaultSellingUnit: "veiculo",
    allowedSellingUnits: ["veiculo"],
    allowedTemplates: ["vehicle_showroom"],
    mandatoryListingFields: [
      "title",
      "price_cents",
      "cover_url",
    ],
    mandatoryAttributes: [
      "brand",
      "model",
      "year_fab",
      "year_model",
      "mileage_km",
    ],
    optionalAttributes: [
      "fuel_type",
      "transmission",
      "color",
      "license_plate_end",
      "is_armored",
    ],
    sectionsComposition: [
      { id: "vehicle_photos", label: "Galeria Panorâmica", order: 1, isRequired: true },
      { id: "vehicle_pricing", label: "Preço & Financiamento", order: 2, isRequired: true },
      { id: "vehicle_technical_sheet", label: "Ficha Técnica do Veículo", order: 3, isRequired: true },
      { id: "features_accessories", label: "Opcionais & Acessórios", order: 4, isRequired: false },
    ],
  },
};

/**
 * Validador Condicional por Nicho (F10)
 * Retorna lista de erros por campo caso algum item mandatório do nicho esteja ausente.
 */
const NICHE_KEY_MAP: Record<string, string> = {
  tourism: "turismo",
  grocery: "mercado",
  supermarket: "mercado",
  food_service: "gastronomia",
  retail: "varejo",
  services: "servicos",
  vehicles: "veiculos",
  real_estate: "imoveis",
};

/**
 * Validador Condicional por Nicho (F10, F23, F24)
 * Suporta chamada com 1 argumento (listing completo) ou 2 argumentos (nicheId, listingData).
 * Retorna tanto objeto `errors` chave-valor quanto array `errorsList` estruturado.
 */
export function validateListingNicheTaxonomy(
  arg1: any,
  arg2?: any
): {
  isValid: boolean;
  errors: Record<string, string>;
  errorsList: Array<{ field: string; message: string }>;
} {
  let rawNicheId = "";
  let data: any = {};

  if (typeof arg1 === "string") {
    rawNicheId = arg1;
    data = arg2 || {};
  } else if (arg1 && typeof arg1 === "object") {
    rawNicheId = arg1.niche || arg1.niche_id || "varejo";
    data = arg1;
  }

  const normalizedNiche = NICHE_KEY_MAP[rawNicheId] || rawNicheId || "varejo";
  const config = NICHE_TAXONOMY_REGISTRY[normalizedNiche] || NICHE_TAXONOMY_REGISTRY.varejo;
  const errors: Record<string, string> = {};

  // Extração flexível de dados
  const title = data.title;
  const priceCents = data.price_cents ?? data.commercial?.price_cents;
  const coverUrl = data.cover_url ?? data.media?.cover_url ?? data.media?.media_urls?.[0];
  const inclusions = data.inclusions;
  const location = data.location ?? data.location_data;
  const templateId = data.template_id ?? data.template;
  const attributes = data.attributes || {};

  // 1. Validação de Template Compatível (Regra R06 / Caso O02)
  if (templateId && Boolean(config.allowedTemplates.includes(templateId)) === false) {
    const msg = `O template '${templateId}' é incompatível com o nicho '${config.name}'. Modelos permitidos: ${config.allowedTemplates.join(", ")}.`;
    errors.template = msg;
    errors.template_id = msg;
  }

  // 2. Validação de Campos Mandatórios Gerais
  for (const field of config.mandatoryListingFields) {
    if (field === "title" && (title === undefined || title === null || title === "" || title.trim().length < 3)) {
      errors.title = "O título é obrigatório e deve ter ao menos 3 caracteres.";
    }
    if (field === "price_cents" && (priceCents === undefined || priceCents === null || priceCents <= 0)) {
      errors.price_cents = "O valor deve ser informado e ser maior que zero.";
    }
    if (field === "cover_url" && (coverUrl === undefined || coverUrl === null || coverUrl === "")) {
      errors.cover_url = "Uma foto de capa principal é obrigatória.";
    }
    if (field === "inclusions" && (inclusions === undefined || inclusions === null || inclusions.length === 0)) {
      errors.inclusions = "Ao menos um item incluso deve ser declarado para este segmento.";
    }
    if (field === "location" && (location?.city === undefined || location?.city === null || location?.city === "" || location?.state === undefined || location?.state === null || location?.state === "")) {
      errors.location = "A cidade e estado são obrigatórios para este segmento.";
    }
  }

  // 3. Validação de Atributos Mandatórios Específicos do Nicho
  for (const attr of config.mandatoryAttributes) {
    const val = attributes[attr];
    if (val === undefined || val === null || val === "") {
      errors[`attributes.${attr}`] = `O atributo '${attr}' é obrigatório para ${config.name}.`;
    }
  }

  const errorsList = Object.entries(errors).map(([field, message]) => ({
    field,
    message,
  }));

  return {
    isValid: errorsList.length === 0,
    errors,
    errorsList,
  };
}
