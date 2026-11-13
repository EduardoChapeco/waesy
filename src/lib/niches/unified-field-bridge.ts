/**
 * @fileoverview PONTE SEMANTICA UNIFICADA DE CAMPOS DINAMICOS MULTI-NICHO (E2E SSOT)
 *
 * Conecta:
 * - CMS de Catalogo (products + classifieds + custom_inquiry_fields)
 * - Formularios / Quiz / Reservas de Vitrine
 * - Leads Kanban (leads_crm.custom_fields + customers_crm.custom_fields)
 * - Studio de Propostas & Orcamentos
 * - Compilador Universal de Contratos em Tabela (Markdown GFM + {{custom.*}})
 */

import { getUnifiedNicheSpec, resolveUnifiedNicheId, type UnifiedNicheId } from "./niche-ssot";
import type { TravelPackageData, TravelFlightLeg, TravelHotelStay, TravelItineraryDay } from "@/types/travel-package";

export interface UnifiedBridgeFieldSpec {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "checkbox" | "textarea" | "currency";
  value?: string;
}

export interface UnifiedBridgeSpecRow {
  key: string;
  label: string;
  value: string;
}

export interface UnifiedBridgeCatalogContext {
  id: string;
  origin: "product" | "classified";
  nicheId: UnifiedNicheId;
  title: string;
  subtitle: string;
  description: string;
  priceCents: number;
  compareAtCents: number | null;
  destination: string;
  originCity?: string;
  transportType?: string;
  durationLabel: string;
  durationDays: number | null;
  heroImageUrl: string;
  flights: TravelFlightLeg[];
  hotels: TravelHotelStay[];
  itinerary: TravelItineraryDay[];
  includes: string[];
  excludes: string[];
  importantNotes: string[];
  highlights: string[];
  departureOptions: Array<{
    id?: string;
    label?: string;
    departure_date?: string;
    return_date?: string;
    departure_time?: string;
    price_cents?: number;
    available_spots?: number;
  }>;
  boardingPoints: string[];
  lodgings?: any[];
  roomRates?: Record<string, number | undefined>;
  boardingRequirements?: string[];
  cancellationPolicy?: string;
  customInquiryFields?: Array<{ id?: string; key?: string; label?: string; type?: string; options?: string[] }>;
  specsRows: UnifiedBridgeSpecRow[];
  rawAttributes: Record<string, any>;
}

export interface UnifiedBridgeSemanticLeadPatch {
  destination?: string;
  travelStart?: string;
  travelEnd?: string;
  paxCount?: number;
  paxAdults?: number;
  paxChildren?: number;
  paxInfants?: number;
  document?: string;
  estimatedValueCents?: number;
  notesAppend?: string;
  customFields: Record<string, any>;
}

export interface UnifiedBridgeContractBlueprint {
  nicheId: UnifiedNicheId;
  contractCategory: "tourism" | "vehicle_sale" | "real_estate_rental" | "service_agreement" | "general_deal";
  defaultTemplateId: string;
  specsSectionTitle: string;
  kanbanTitle: string;
  ctaProposalLabel: string;
  isTourism: boolean;
}

const INTERNAL_CUSTOM_FIELD_KEYS = new Set([
  "consent_records",
  "last_consent_at",
  "telemetry",
  "raw_payload",
  "internal_debug",
  "device_fingerprint",
  "ip_address",
  "cf_ray",
  "threat_score",
  "source_deal_id",
  "source_quote_id",
  "source_submission_id",
  "source_form_id",
  "source_listing_id",
  "source_listing_origin",
  "email_provided",
]);

const KNOWN_FIELD_LABELS: Record<string, string> = {
  destino: "Destino",
  destination: "Destino",
  destination_city: "Cidade de Destino",
  origem: "Cidade de Origem",
  origin_city: "Cidade de Origem",
  data_ida: "Data de Ida",
  data_embarque: "Data de Embarque",
  travel_start: "Inicio / Embarque",
  data_volta: "Data de Retorno",
  data_retorno: "Data de Retorno",
  travel_end: "Termino / Retorno",
  ponto_embarque: "Local de Embarque",
  boarding_point: "Local de Embarque",
  departure_option: "Saida / Turma Selecionada",
  passageiros: "Passageiros",
  pax_adults: "Adultos",
  pax_children: "Criancas",
  pax_infants: "Bebes",
  hospedagem: "Preferencia de Hospedagem",
  regime: "Regime Alimentar",
  forma_pagamento: "Forma de Pagamento Pretendida",
  parcelas: "Parcelas Pretendidas",
  cpf: "CPF / CNPJ",
  cnpj: "CNPJ",
  document: "Documento (CPF/CNPJ)",
  rg: "RG",
  veiculo_marca: "Marca do Veiculo",
  veiculo_modelo: "Modelo / Versao",
  veiculo_ano: "Ano Fab / Modelo",
  veiculo_placa: "Placa",
  veiculo_km: "Quilometragem",
  veiculo_cor: "Cor",
  veiculo_chassi: "Chassi",
  veiculo_renavam: "RENAVAM",
  veiculo_combustivel: "Combustivel",
  imovel_endereco: "Endereco do Imovel",
  imovel_tipo: "Tipo do Imovel",
  imovel_matricula: "Matricula CRI",
  area_m2: "Area (m2)",
  quartos: "Dormitorios",
  banheiros: "Banheiros",
  vagas: "Vagas de Garagem",
  caucao_garantia: "Garantia Locaticia",
  prazo_locacao_meses: "Prazo (Meses)",
  profissional: "Profissional Responsavel",
  procedimento: "Procedimento / Servico",
  alergias: "Alergias / Restricoes",
  data_desejada: "Data Desejada",
  horario_desejado: "Horario Desejado",
  observacoes: "Observacoes do Cliente",
};

export function normalizeSlugKey(key: string): string {
  return String(key || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function formatDynamicFieldLabel(key: string): string {
  const norm = normalizeSlugKey(key);
  if (KNOWN_FIELD_LABELS[norm]) return KNOWN_FIELD_LABELS[norm];
  return String(key || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function formatFieldPrimitiveValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "boolean") return val ? "Sim" : "Nao";
  if (typeof val === "number") return Number.isFinite(val) ? String(val) : "";
  if (typeof val === "string") return val.trim();
  if (Array.isArray(val)) {
    return val
      .map((entry) => formatFieldPrimitiveValue(entry))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if (typeof obj.label === "string" && obj.label.trim()) return obj.label.trim();
    if (typeof obj.name === "string" && obj.name.trim()) return obj.name.trim();
    if (typeof obj.value === "string" || typeof obj.value === "number") {
      return String(obj.value);
    }
    return Object.entries(obj)
      .map(([k, v]) => {
        const formatted = formatFieldPrimitiveValue(v);
        return formatted ? `${formatDynamicFieldLabel(k)}: ${formatted}` : "";
      })
      .filter(Boolean)
      .join(" | ");
  }
  return String(val);
}

export function parseCurrencyCentsLoose(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    return raw >= 1000 && Number.isInteger(raw) ? raw : Math.round(raw * 100);
  }
  if (typeof raw !== "string") return undefined;
  const cleaned = raw.replace(/[^\d.,]/g, "").trim();
  if (!cleaned) return undefined;
  // Detect Brazilian "1.234,56" vs "1234.56"
  const normalized =
    cleaned.includes(",")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned;
  const num = Number(normalized);
  if (!Number.isFinite(num) || num <= 0) return undefined;
  return Math.round(num * 100);
}

function parseIsoDateCandidate(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed.slice(0, 10);
  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  return undefined;
}

export function normalizeCustomFieldMap(
  raw?: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!k || v === undefined || v === null) continue;
    if (typeof v === "string" && !v.trim()) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    result[k] = typeof v === "string" ? v.trim() : v;
  }
  return result;
}

export function mergeCustomFieldMaps(
  base?: Record<string, unknown> | null,
  patch?: Record<string, unknown> | null,
): Record<string, unknown> {
  const b = normalizeCustomFieldMap(base);
  const p = normalizeCustomFieldMap(patch);
  return { ...b, ...p };
}

export function extractSemanticLeadFieldsFromAnswers(
  rawAnswers?: Record<string, unknown> | null,
  fieldLabelsMap?: Record<string, string>,
): UnifiedBridgeSemanticLeadPatch {
  const cleanAnswers = normalizeCustomFieldMap(rawAnswers);
  const customFields: Record<string, unknown> = { ...cleanAnswers };

  let destination: string | undefined;
  let travelStart: string | undefined;
  let travelEnd: string | undefined;
  let paxCount: number | undefined;
  let paxAdults: number | undefined;
  let paxChildren: number | undefined;
  let paxInfants: number | undefined;
  let document: string | undefined;
  let estimatedValueCents: number | undefined;
  const notesParts: string[] = [];

  for (const [rawKey, rawVal] of Object.entries(cleanAnswers)) {
    const key = normalizeSlugKey(rawKey);
    const valStr = formatFieldPrimitiveValue(rawVal);
    if (!valStr) continue;

    if (
      !destination &&
      ["destino", "destino_desejado", "destino_principal", "destination", "destination_city", "cidade_destino", "rota", "roteiro"].includes(key)
    ) {
      destination = valStr;
    } else if (
      !travelStart &&
      ["data_ida", "data_embarque", "data_saida", "data_viagem", "travel_start", "departure_date", "check_in", "data_inicio", "data_desejada"].includes(key)
    ) {
      travelStart = parseIsoDateCandidate(valStr);
    } else if (!travelEnd && ["data_volta", "data_retorno", "travel_end", "return_date", "check_out", "data_termino"].includes(key)) {
      travelEnd = parseIsoDateCandidate(valStr);
    } else if (!paxAdults && ["adultos", "pax_adults", "adults_count", "qtd_adultos"].includes(key)) {
      const n = Number.parseInt(valStr, 10);
      if (Number.isFinite(n) && n > 0) paxAdults = n;
    } else if (!paxChildren && ["criancas", "pax_children", "children_count", "qtd_criancas"].includes(key)) {
      const n = Number.parseInt(valStr, 10);
      if (Number.isFinite(n) && n >= 0) paxChildren = n;
    } else if (!paxInfants && ["bebes", "pax_infants", "infants_count", "colo"].includes(key)) {
      const n = Number.parseInt(valStr, 10);
      if (Number.isFinite(n) && n >= 0) paxInfants = n;
    } else if (!paxCount && ["passageiros", "pax", "pax_count", "hospedes", "guests", "quantidade_pessoas"].includes(key)) {
      const n = Number.parseInt(valStr, 10);
      if (Number.isFinite(n) && n > 0) paxCount = n;
    } else if (
      !document &&
      ["cpf", "cnpj", "cpf_titular", "cpf_responsavel", "documento", "documento_titular", "document", "cpf_cnpj"].includes(key)
    ) {
      const digits = valStr.replace(/\D/g, "");
      if (digits.length === 11 || digits.length === 14) {
        document = digits;
      }
    } else if (
      !estimatedValueCents &&
      ["orcamento", "orcamento_estimado", "budget", "valor", "valor_pretendido", "faixa_preco", "investimento", "estimated_value"].includes(key)
    ) {
      estimatedValueCents = parseCurrencyCentsLoose(rawVal);
    }

    if (
      !customFields.boarding_point &&
      ["ponto_embarque", "local_embarque", "boarding_point", "embarque"].includes(key)
    ) {
      customFields.boarding_point = valStr;
    }

    if (!INTERNAL_CUSTOM_FIELD_KEYS.has(rawKey) && !INTERNAL_CUSTOM_FIELD_KEYS.has(key)) {
      const displayLabel = fieldLabelsMap?.[rawKey] || formatDynamicFieldLabel(rawKey);
      notesParts.push(`${displayLabel}: ${valStr}`);
    }
  }

  if (!paxCount && (paxAdults || paxChildren || paxInfants)) {
    paxCount = (paxAdults || 1) + (paxChildren || 0) + (paxInfants || 0);
  }

  return {
    destination,
    travelStart,
    travelEnd,
    paxCount,
    paxAdults,
    paxChildren,
    paxInfants,
    document,
    estimatedValueCents,
    notesAppend: notesParts.length > 0 ? notesParts.join(" | ") : undefined,
    customFields,
  };
}

export function buildStructuredCustomFieldsSummaryRows(
  customFields?: Record<string, unknown> | null,
  fieldDefs?: Array<{ id?: string; key?: string; label?: string; type?: string }> | null,
): UnifiedBridgeSpecRow[] {
  const clean = normalizeCustomFieldMap(customFields);
  const defByKey = new Map<string, string>();
  if (Array.isArray(fieldDefs)) {
    for (const def of fieldDefs) {
      const k = def.id || def.key;
      if (k && def.label) defByKey.set(k, def.label);
    }
  }

  const rows: UnifiedBridgeSpecRow[] = [];
  for (const [k, rawVal] of Object.entries(clean)) {
    const norm = normalizeSlugKey(k);
    if (INTERNAL_CUSTOM_FIELD_KEYS.has(k) || INTERNAL_CUSTOM_FIELD_KEYS.has(norm)) continue;
    // Pula arrays complexos (como boarding_points ou traveler_dossiers) tratados em secoes proprias
    if (Array.isArray(rawVal) && rawVal.some((v) => v && typeof v === "object")) continue;
    const value = formatFieldPrimitiveValue(rawVal);
    if (!value) continue;
    rows.push({
      key: k,
      label: defByKey.get(k) || formatDynamicFieldLabel(k),
      value,
    });
  }
  return rows;
}

export function getNicheContractBlueprint(storeOrNiche?: unknown): UnifiedBridgeContractBlueprint {
  const nicheId = resolveUnifiedNicheId(storeOrNiche);
  const spec = getUnifiedNicheSpec(nicheId);

  switch (nicheId) {
    case "tourism":
      return {
        nicheId,
        contractCategory: "tourism",
        defaultTemplateId: "template-turismo-pacote-viagem",
        specsSectionTitle: "Especificacoes do Roteiro & Pacote",
        kanbanTitle: "CRM & Operacoes de Turismo",
        ctaProposalLabel: "Gerar Proposta de Viagem",
        isTourism: true,
      };
    case "automotive":
      return {
        nicheId,
        contractCategory: "vehicle_sale",
        defaultTemplateId: "template-compra-venda-veiculo",
        specsSectionTitle: "Especificacoes Tecnicas do Veiculo / OS",
        kanbanTitle: "CRM Comercial Automotivo",
        ctaProposalLabel: "Gerar Orcamento / Proposta",
        isTourism: false,
      };
    case "real_estate":
      return {
        nicheId,
        contractCategory: "real_estate_rental",
        defaultTemplateId: "template-locacao-imobiliaria",
        specsSectionTitle: "Dados Cadastrais do Imovel",
        kanbanTitle: "CRM Imobiliario",
        ctaProposalLabel: "Gerar Proposta Imobiliaria",
        isTourism: false,
      };
    case "law_firm":
      return {
        nicheId,
        contractCategory: "service_agreement",
        defaultTemplateId: "template-assessoria-consultoria",
        specsSectionTitle: "Objeto da Demanda Juridica",
        kanbanTitle: "CRM de Atendimentos Juridicos",
        ctaProposalLabel: "Gerar Proposta de Honorarios",
        isTourism: false,
      };
    case "aesthetics_clinic":
    case "healthcare":
    case "dental":
    case "psychology":
    case "vet_petshop":
    case "beauty_salon":
    case "barbershop":
      return {
        nicheId,
        contractCategory: "service_agreement",
        defaultTemplateId: "template-prestacao-servicos",
        specsSectionTitle: `Especificacoes de ${spec.label}`,
        kanbanTitle: `CRM Comercial — ${spec.shortLabel}`,
        ctaProposalLabel: "Gerar Orcamento / Plano",
        isTourism: false,
      };
    case "services":
    case "accounting":
    case "education":
    case "events":
      return {
        nicheId,
        contractCategory: "service_agreement",
        defaultTemplateId: "template-prestacao-servicos",
        specsSectionTitle: `Escopo & Ficha Tecnica (${spec.shortLabel})`,
        kanbanTitle: `Pipeline Comercial — ${spec.shortLabel}`,
        ctaProposalLabel: "Gerar Proposta / Orcamento",
        isTourism: false,
      };
    default:
      return {
        nicheId,
        contractCategory: "general_deal",
        defaultTemplateId: "template-prestacao-servicos",
        specsSectionTitle: "Especificacoes do Pedido / Negocio",
        kanbanTitle: "CRM Comercial & Vendas",
        ctaProposalLabel: "Gerar Orcamento / Proposta",
        isTourism: false,
      };
  }
}

export function extractNormalizedCatalogContext(
  item: { origin: "product" | "classified"; row: any },
  nicheHint?: unknown,
): UnifiedBridgeCatalogContext {
  const row = item.row || {};
  const meta = (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, any>;
  const nicheMeta = (row.niche_metadata && typeof row.niche_metadata === "object" ? row.niche_metadata : {}) as Record<string, any>;
  const attrs = (row.attributes && typeof row.attributes === "object" ? row.attributes : {}) as Record<string, any>;

  const travelPkg = (
    (meta.travel_package && typeof meta.travel_package === "object" ? meta.travel_package : null) ||
    (meta.travel && typeof meta.travel === "object" ? meta.travel : null) ||
    (nicheMeta.travel_package && typeof nicheMeta.travel_package === "object" ? nicheMeta.travel_package : null) ||
    (nicheMeta.travel && typeof nicheMeta.travel === "object" ? nicheMeta.travel : null) ||
    (attrs.travel_package && typeof attrs.travel_package === "object" ? attrs.travel_package : null) ||
    (attrs.travel_data && typeof attrs.travel_data === "object" ? attrs.travel_data : null) ||
    (attrs.travel && typeof attrs.travel === "object" ? attrs.travel : null) ||
    {}
  ) as Partial<TravelPackageData> & Record<string, any>;

  const cmsDest =
    travelPkg.destination && typeof travelPkg.destination === "object"
      ? (travelPkg.destination as Record<string, any>)
      : null;
  const cmsResort =
    travelPkg.resort && typeof travelPkg.resort === "object"
      ? (travelPkg.resort as Record<string, any>)
      : null;
  const cmsFlight =
    travelPkg.flight_details && typeof travelPkg.flight_details === "object"
      ? (travelPkg.flight_details as Record<string, any>)
      : null;

  const resolvedNiche = resolveUnifiedNicheId(
    nicheHint || row.niche_id || attrs.niche_id || (Object.keys(travelPkg).length > 0 ? "tourism" : row.category),
  );

  // Suporte tanto a flights[] estruturado (classifieds/studio) quanto flight_details do CMS TravelPackageForm
  let flights: TravelFlightLeg[] = Array.isArray(travelPkg.flights)
    ? travelPkg.flights
    : Array.isArray(attrs.flights)
    ? attrs.flights
    : [];

  if (flights.length === 0 && cmsFlight && (cmsFlight.airline_name || cmsFlight.departure_airport || cmsFlight.departure_iata || cmsFlight.bus_company)) {
    const destIata = cmsFlight.arrival_iata || cmsFlight.destination_iata || cmsDest?.iata_gateway || "";
    const origIata = cmsFlight.departure_iata || "";
    const destCityName =
      (typeof cmsDest?.name === "string" && cmsDest.name) ||
      cmsFlight.destination_airport ||
      cmsFlight.bus_arrival_terminal ||
      "";
    const origCityName = cmsFlight.departure_airport || cmsFlight.bus_departure_terminal || cmsFlight.origin_airport || "";
    flights = [
      {
        id: "cms-outbound",
        type: "outbound",
        airline_name: cmsFlight.airline_name || cmsFlight.bus_company || cmsFlight.cruise_line || "Transporte Principal",
        flight_number: cmsFlight.flight_number_out || undefined,
        origin_iata: origIata || undefined,
        origin_city: origCityName || undefined,
        destination_iata: destIata || undefined,
        destination_city: destCityName || undefined,
        departure_time: cmsFlight.departure_time_out || cmsFlight.bus_departure_time_out || undefined,
        arrival_time: cmsFlight.arrival_time_out || cmsFlight.bus_arrival_time_out || undefined,
        baggage_included: cmsFlight.baggage_included ? "Sim" : undefined,
      },
    ];
    if (cmsFlight.flight_number_return || cmsFlight.departure_time_return || cmsFlight.bus_arrival_time_return) {
      flights.push({
        id: "cms-return",
        type: "return",
        airline_name: cmsFlight.airline_name || cmsFlight.bus_company || cmsFlight.cruise_line || "Retorno",
        flight_number: cmsFlight.flight_number_return || undefined,
        origin_iata: destIata || undefined,
        origin_city: destCityName || undefined,
        destination_iata: origIata || undefined,
        destination_city: origCityName || undefined,
        departure_time: cmsFlight.departure_time_return || undefined,
        arrival_time: cmsFlight.arrival_time_return || cmsFlight.bus_arrival_time_return || undefined,
        baggage_included: cmsFlight.baggage_included ? "Sim" : undefined,
      });
    }
  }

  const lodgings: any[] = Array.isArray(travelPkg.lodgings)
    ? travelPkg.lodgings
    : Array.isArray(attrs.lodgings)
    ? attrs.lodgings
    : [];

  let hotels: TravelHotelStay[] = Array.isArray(travelPkg.hotels)
    ? travelPkg.hotels
    : Array.isArray(attrs.hotels)
    ? attrs.hotels
    : [];

  if (hotels.length === 0 && lodgings.length > 0) {
    hotels = lodgings.map((l: any, idx: number) => ({
      id: l.id || `cms-lodging-${idx + 1}`,
      hotel_name: l.name || l.hotel_name || "Hospedagem",
      destination: l.location || l.city || (typeof cmsDest?.name === "string" ? cmsDest.name : ""),
      board_basis: l.meal_plan || l.board_basis || "Café da Manhã",
      room_type: l.room_type || "Padrão",
      stars: Number(l.stars || 4),
      featured_image_url: l.cover_image_url || l.image_url || l.photos?.[0] || "",
      address: l.address || l.location || "",
      amenities: Array.isArray(l.amenities) ? l.amenities : [],
    }));
  } else if (hotels.length === 0 && cmsResort?.name) {
    hotels = [
      {
        id: "cms-resort-primary",
        hotel_name: String(cmsResort.name),
        destination: String(cmsResort.location || cmsDest?.name || ""),
        board_basis: String(cmsResort.meal_plan || "Café da Manhã"),
        room_type: "Acomodação Principal",
        featured_image_url: cmsResort.cover_image_url || cmsResort.photos?.[0] || "",
        amenities: Array.isArray(cmsResort.badges) ? cmsResort.badges : [],
      },
    ];
  }

  const rawItinerary = Array.isArray(travelPkg.itinerary)
    ? travelPkg.itinerary
    : Array.isArray(travelPkg.itinerary_days)
    ? travelPkg.itinerary_days
    : Array.isArray(attrs.itinerary)
    ? attrs.itinerary
    : Array.isArray(attrs.itinerary_days)
    ? attrs.itinerary_days
    : [];

  const itinerary: TravelItineraryDay[] = rawItinerary.map((d: any, idx: number) => ({
    id: d.id || `day-${idx + 1}`,
    day: Number(d.day ?? d.day_number ?? idx + 1),
    date: d.date,
    period: d.period,
    title: String(d.title || `Dia ${d.day ?? d.day_number ?? idx + 1}`),
    description: String(
      d.description || [d.morning, d.afternoon, d.night].filter(Boolean).join(" • ") || "",
    ),
    imageUrl: d.imageUrl || d.image_url || (Array.isArray(d.images) ? d.images[0] : undefined),
    highlights: Array.isArray(d.highlights) ? d.highlights : Array.isArray(d.activities) ? d.activities : undefined,
    morning: d.morning,
    afternoon: d.afternoon,
    night: d.night,
  }));

  const includes: string[] = Array.isArray(travelPkg.includes)
    ? travelPkg.includes
    : Array.isArray(travelPkg.inclusions)
    ? travelPkg.inclusions
    : Array.isArray(attrs.includes)
    ? attrs.includes
    : Array.isArray(attrs.inclusions)
    ? attrs.inclusions
    : [];
  const excludes: string[] = Array.isArray(travelPkg.excludes)
    ? travelPkg.excludes
    : Array.isArray(travelPkg.exclusions)
    ? travelPkg.exclusions
    : Array.isArray(attrs.excludes)
    ? attrs.excludes
    : Array.isArray(attrs.exclusions)
    ? attrs.exclusions
    : [];
  const boardingRequirements: string[] = Array.isArray(travelPkg.boarding_requirements)
    ? travelPkg.boarding_requirements
    : Array.isArray(attrs.boarding_requirements)
    ? attrs.boarding_requirements
    : [];
  const cancellationPolicy: string | undefined =
    (typeof travelPkg.cancellation_policy === "string" && travelPkg.cancellation_policy.trim()) ||
    (typeof attrs.cancellation_policy === "string" && attrs.cancellation_policy.trim()) ||
    undefined;

  const importantNotesRaw: string[] = Array.isArray(travelPkg.important_notes)
    ? travelPkg.important_notes
    : Array.isArray(attrs.important_notes)
    ? attrs.important_notes
    : [];
  const importantNotes: string[] = Array.from(
    new Set([
      ...importantNotesRaw,
      ...boardingRequirements.map((req) => `Documento/Embarque: ${req}`),
      ...(cancellationPolicy ? [`Política de Cancelamento: ${cancellationPolicy}`] : []),
    ]),
  );

  const highlights: string[] = Array.isArray(travelPkg.highlights)
    ? travelPkg.highlights
    : Array.isArray(travelPkg.story_highlights)
    ? travelPkg.story_highlights.map((h: any) => h?.label || String(h)).filter(Boolean)
    : Array.isArray(attrs.highlights)
    ? attrs.highlights
    : [];

  const departureOptions = Array.isArray(travelPkg.departure_options)
    ? travelPkg.departure_options
    : Array.isArray(attrs.departure_options)
    ? attrs.departure_options
    : [];
  const boardingPoints: string[] = Array.isArray(travelPkg.boarding_points)
    ? travelPkg.boarding_points
    : Array.isArray(attrs.boarding_points)
    ? attrs.boarding_points
    : Array.isArray(cmsDest?.boarding_points)
    ? cmsDest.boarding_points
    : [];

  const roomRates =
    (travelPkg.room_rates && typeof travelPkg.room_rates === "object" ? travelPkg.room_rates : undefined) ||
    (attrs.room_rates && typeof attrs.room_rates === "object" ? attrs.room_rates : undefined);

  const customInquiryFields = Array.isArray(travelPkg.custom_inquiry_fields)
    ? travelPkg.custom_inquiry_fields
    : Array.isArray(attrs.custom_inquiry_fields)
    ? attrs.custom_inquiry_fields
    : Array.isArray(meta.custom_inquiry_fields)
    ? meta.custom_inquiry_fields
    : Array.isArray(nicheMeta.custom_inquiry_fields)
    ? nicheMeta.custom_inquiry_fields
    : undefined;

  const priceCents =
    Number(
      row.price_cents ??
        row.priceCents ??
        row.variants?.[0]?.price_cents ??
        row.variants?.[0]?.priceCents ??
        0,
    ) || 0;

  const compareAtRaw = row.compare_at_cents ?? row.compareAtCents ?? null;
  const compareAtCents = compareAtRaw !== null && compareAtRaw !== undefined ? Number(compareAtRaw) : null;

  const mediaUrls: string[] = Array.isArray(row.media)
    ? row.media.map((m: any) => m?.url).filter(Boolean)
    : Array.isArray(row.product_media)
    ? row.product_media.map((m: any) => m?.url).filter(Boolean)
    : Array.isArray(row.images)
    ? row.images.filter(Boolean)
    : [];

  const heroImageUrl =
    row.thumbnail_url ||
    row.thumbnailUrl ||
    row.cover_image_url ||
    mediaUrls[0] ||
    travelPkg.hero_image_url ||
    cmsResort?.cover_image_url ||
    "";

  const durationDays =
    Number(travelPkg.duration_days || attrs.duration_days || row.travel_duration_days || (itinerary.length > 0 ? itinerary.length : 0)) || null;
  const nights =
    Number(travelPkg.duration_nights || attrs.duration_nights || (durationDays && durationDays > 1 ? durationDays - 1 : 0)) || 0;
  const durationLabel =
    durationDays ? `${durationDays} dias${nights > 0 ? ` / ${nights} noites` : ""}` : String(attrs.duration_label || cmsResort?.duration_text || "");

  const destinationStr =
    typeof travelPkg.destination === "string"
      ? travelPkg.destination
      : typeof cmsDest?.name === "string"
      ? cmsDest.name
      : "";

  const destination = String(
    travelPkg.destination_city ||
      destinationStr ||
      attrs.destination_city ||
      attrs.destination ||
      row.destination_city ||
      row.destination ||
      row.location_city ||
      row.city ||
      row.title ||
      "",
  ).trim();

  const originCity =
    String(
      travelPkg.origin_city ||
        cmsFlight?.departure_airport ||
        cmsFlight?.bus_departure_terminal ||
        "",
    ).trim() || undefined;

  const transportType =
    String(travelPkg.transport_type || attrs.transport_type || "").trim() || undefined;

  // Extrai especificacoes tecnicas tabulaveis de TODOS os nichos (sem vazar objetos crus)
  const mergedSpecsObj: Record<string, unknown> = {
    ...attrs,
    ...nicheMeta,
    ...(destination ? { destino: destination } : {}),
    ...(durationLabel ? { duracao: durationLabel } : {}),
    ...(originCity ? { origem: originCity } : {}),
    ...(transportType ? { transporte: transportType } : {}),
    ...(cancellationPolicy ? { politica_cancelamento: cancellationPolicy } : {}),
    ...(boardingRequirements.length > 0 ? { documentos_embarque: boardingRequirements } : {}),
  };

  // Remover listas grandes e blobs estruturados da tabela de especificacoes simples
  for (const complexKey of [
    "travel",
    "travel_package",
    "travel_data",
    "flights",
    "hotels",
    "lodgings",
    "itinerary",
    "itinerary_days",
    "includes",
    "inclusions",
    "excludes",
    "exclusions",
    "important_notes",
    "highlights",
    "story_highlights",
    "departure_options",
    "boarding_points",
    "boarding_requirements",
    "cancellation_policy",
    "room_rates",
    "payment_conditions",
    "custom_inquiry_fields",
    "lead_form_id",
  ]) {
    delete mergedSpecsObj[complexKey];
  }

  const specsRows = buildStructuredCustomFieldsSummaryRows(mergedSpecsObj);

  return {
    id: String(row.id || ""),
    origin: item.origin,
    nicheId: resolvedNiche,
    title: String(row.title || row.name || "Item do Catalogo"),
    subtitle: String(row.summary || row.subtitle || row.short_description || destination || ""),
    description: String(row.description || row.summary || ""),
    priceCents,
    compareAtCents,
    destination,
    originCity,
    transportType,
    durationLabel,
    durationDays,
    heroImageUrl,
    flights,
    hotels,
    itinerary,
    includes,
    excludes,
    importantNotes,
    highlights,
    departureOptions,
    boardingPoints,
    lodgings,
    roomRates,
    boardingRequirements,
    cancellationPolicy,
    customInquiryFields,
    specsRows,
    rawAttributes: mergedSpecsObj,
  };
}
