// ─────────────────────────────────────────────────────────────────────────────
// Aeroportos Brasileiros Canônicos — Waesy Turismo
// Fonte: ANAC + Infraero. Usado em: criação de classificados de viagem.
// ─────────────────────────────────────────────────────────────────────────────

export interface Airport {
  iata: string;
  name: string;
  city: string;
  state: string;
  region: "Norte" | "Nordeste" | "Centro-Oeste" | "Sudeste" | "Sul";
}

export const CANONICAL_AIRPORTS: Airport[] = [
  // ── SUL ───────────────────────────────────────────────────────────────────
  { iata: "XAP", name: "Aeroporto Regional de Chapecó", city: "Chapecó", state: "SC", region: "Sul" },
  { iata: "FLN", name: "Aeroporto Internacional Hercílio Luz", city: "Florianópolis", state: "SC", region: "Sul" },
  { iata: "NVT", name: "Aeroporto de Navegantes", city: "Navegantes", state: "SC", region: "Sul" },
  { iata: "JOI", name: "Aeroporto de Joinville", city: "Joinville", state: "SC", region: "Sul" },
  { iata: "CXJ", name: "Aeroporto de Caxias do Sul", city: "Caxias do Sul", state: "RS", region: "Sul" },
  { iata: "POA", name: "Aeroporto Internacional Salgado Filho", city: "Porto Alegre", state: "RS", region: "Sul" },
  { iata: "UDI", name: "Aeroporto Internacional de Uberlândia", city: "Uberlândia", state: "MG", region: "Sudeste" },
  { iata: "PFB", name: "Aeroporto de Passo Fundo", city: "Passo Fundo", state: "RS", region: "Sul" },
  { iata: "IGU", name: "Aeroporto Internacional de Foz do Iguaçu", city: "Foz do Iguaçu", state: "PR", region: "Sul" },
  { iata: "CWB", name: "Aeroporto Internacional Afonso Pena", city: "Curitiba", state: "PR", region: "Sul" },
  { iata: "LDB", name: "Aeroporto de Londrina", city: "Londrina", state: "PR", region: "Sul" },
  { iata: "MGF", name: "Aeroporto de Maringá", city: "Maringá", state: "PR", region: "Sul" },
  { iata: "BFH", name: "Aeroporto Bacacheri", city: "Curitiba", state: "PR", region: "Sul" },
  { iata: "CNF", name: "Aeroporto Internacional de Confins", city: "Belo Horizonte", state: "MG", region: "Sudeste" },

  // ── SUDESTE ───────────────────────────────────────────────────────────────
  { iata: "GRU", name: "Aeroporto Internacional de Guarulhos", city: "São Paulo", state: "SP", region: "Sudeste" },
  { iata: "CGH", name: "Aeroporto de Congonhas", city: "São Paulo", state: "SP", region: "Sudeste" },
  { iata: "VCP", name: "Aeroporto Internacional de Viracopos", city: "Campinas", state: "SP", region: "Sudeste" },
  { iata: "GIG", name: "Aeroporto Internacional do Galeão", city: "Rio de Janeiro", state: "RJ", region: "Sudeste" },
  { iata: "SDU", name: "Aeroporto Santos Dumont", city: "Rio de Janeiro", state: "RJ", region: "Sudeste" },
  { iata: "PLU", name: "Aeroporto da Pampulha", city: "Belo Horizonte", state: "MG", region: "Sudeste" },
  { iata: "VIX", name: "Aeroporto Eurico de Aguiar Salles", city: "Vitória", state: "ES", region: "Sudeste" },
  { iata: "BAU", name: "Aeroporto de Bauru", city: "Bauru", state: "SP", region: "Sudeste" },
  { iata: "RAO", name: "Aeroporto de Ribeirão Preto", city: "Ribeirão Preto", state: "SP", region: "Sudeste" },
  { iata: "SJK", name: "Aeroporto de São José dos Campos", city: "São José dos Campos", state: "SP", region: "Sudeste" },
  { iata: "JDO", name: "Aeroporto Regional de Juazeiro do Norte", city: "Juazeiro do Norte", state: "CE", region: "Nordeste" },

  // ── NORDESTE ──────────────────────────────────────────────────────────────
  { iata: "SSA", name: "Aeroporto Internacional de Salvador", city: "Salvador", state: "BA", region: "Nordeste" },
  { iata: "FOR", name: "Aeroporto Internacional Pinto Martins", city: "Fortaleza", state: "CE", region: "Nordeste" },
  { iata: "REC", name: "Aeroporto Internacional dos Guararapes", city: "Recife", state: "PE", region: "Nordeste" },
  { iata: "NAT", name: "Aeroporto Internacional de Natal", city: "Natal", state: "RN", region: "Nordeste" },
  { iata: "MCZ", name: "Aeroporto Internacional Zumbi dos Palmares", city: "Maceió", state: "AL", region: "Nordeste" },
  { iata: "THE", name: "Aeroporto Internacional de Teresina", city: "Teresina", state: "PI", region: "Nordeste" },
  { iata: "SLZ", name: "Aeroporto Internacional de São Luís", city: "São Luís", state: "MA", region: "Nordeste" },
  { iata: "JPA", name: "Aeroporto Internacional de João Pessoa", city: "João Pessoa", state: "PB", region: "Nordeste" },
  { iata: "AJU", name: "Aeroporto Internacional de Aracaju", city: "Aracaju", state: "SE", region: "Nordeste" },
  { iata: "PMW", name: "Aeroporto de Palmas", city: "Palmas", state: "TO", region: "Norte" },
  { iata: "QNV", name: "Aeroporto de Jericoacoara / Cruz", city: "Jericoacoara", state: "CE", region: "Nordeste" },
  { iata: "IMP", name: "Aeroporto de Imperatriz", city: "Imperatriz", state: "MA", region: "Nordeste" },
  { iata: "BPS", name: "Aeroporto de Porto Seguro", city: "Porto Seguro", state: "BA", region: "Nordeste" },
  { iata: "LEC", name: "Aeroporto de Chapada Diamantina / Lençóis", city: "Lençóis", state: "BA", region: "Nordeste" },
  { iata: "IOS", name: "Aeroporto de Ilhéus", city: "Ilhéus", state: "BA", region: "Nordeste" },
  { iata: "MCP", name: "Aeroporto Internacional de Macapá", city: "Macapá", state: "AP", region: "Norte" },

  // ── CENTRO-OESTE ──────────────────────────────────────────────────────────
  { iata: "BSB", name: "Aeroporto Internacional de Brasília", city: "Brasília", state: "DF", region: "Centro-Oeste" },
  { iata: "CGR", name: "Aeroporto Internacional de Campo Grande", city: "Campo Grande", state: "MS", region: "Centro-Oeste" },
  { iata: "CGB", name: "Aeroporto Internacional de Cuiabá", city: "Cuiabá", state: "MT", region: "Centro-Oeste" },
  { iata: "GYN", name: "Aeroporto Internacional de Goiânia", city: "Goiânia", state: "GO", region: "Centro-Oeste" },
  { iata: "COR", name: "Aeroporto de Corumbá", city: "Corumbá", state: "MS", region: "Centro-Oeste" },

  // ── NORTE ─────────────────────────────────────────────────────────────────
  { iata: "MAO", name: "Aeroporto Internacional Eduardo Gomes", city: "Manaus", state: "AM", region: "Norte" },
  { iata: "BEL", name: "Aeroporto Internacional de Belém", city: "Belém", state: "PA", region: "Norte" },
  { iata: "PVH", name: "Aeroporto Internacional Governador Jorge Teixeira", city: "Porto Velho", state: "RO", region: "Norte" },
  { iata: "RBR", name: "Aeroporto Internacional de Rio Branco", city: "Rio Branco", state: "AC", region: "Norte" },
  { iata: "BOA", name: "Aeroporto de Boa Vista", city: "Boa Vista", state: "RR", region: "Norte" },
  { iata: "STM", name: "Aeroporto de Santarém", city: "Santarém", state: "PA", region: "Norte" },
  { iata: "MNX", name: "Aeroporto de Manicoré", city: "Manicoré", state: "AM", region: "Norte" },
];

/** Retorna o airport ou undefined */
export function findAirportByIATA(iata: string): Airport | undefined {
  return CANONICAL_AIRPORTS.find((a) => a.iata === iata.toUpperCase());
}

/** Label para uso em Select: "XAP — Chapecó, SC" */
export function airportLabel(airport: Airport): string {
  return `${airport.iata} — ${airport.city}, ${airport.state}`;
}

/** Agrupa por região para optgroup */
export const AIRPORTS_BY_REGION = CANONICAL_AIRPORTS.reduce(
  (acc, airport) => {
    if (!acc[airport.region]) acc[airport.region] = [];
    acc[airport.region].push(airport);
    return acc;
  },
  {} as Record<string, Airport[]>,
);

/** Airlines Canônicas */
export const CANONICAL_AIRLINES = [
  { id: "LATAM", label: "LATAM Airlines" },
  { id: "GOL", label: "GOL Linhas Aéreas" },
  { id: "AZUL", label: "Azul Linhas Aéreas" },
  { id: "AVIANCA", label: "Avianca Brasil" },
  { id: "MAP", label: "MAP Linhas Aéreas" },
  { id: "TWO", label: "Two Flex" },
  { id: "FLYBONDI", label: "Flybondi" },
  { id: "AMERICAN", label: "American Airlines" },
  { id: "UNITED", label: "United Airlines" },
  { id: "TAP", label: "TAP Air Portugal" },
  { id: "EMIRATES", label: "Emirates" },
  { id: "OTHER", label: "Outra Companhia" },
];

/** Tipos de transporte */
export const CANONICAL_TRANSPORT_TYPES = [
  { id: "airplane", label: "✈️ Aéreo Comercial" },
  { id: "bus", label: "🚌 Terrestre / Excursão" },
  { id: "cruise", label: "🛳️ Cruzeiro Marítimo" },
  { id: "train", label: "🚂 Trem / Metrô" },
  { id: "car", label: "🚗 Carro Próprio / Alugado" },
  { id: "combo", label: "🔄 Multimodal (Voo + Transfer)" },
  { id: "hotel_only", label: "🏨 Hospedagem / Roteiro Local" },
];

/** Categorias de ônibus / veículos rodoviários */
export const CANONICAL_BUS_CATEGORIES = [
  { id: "leito_total", label: "🛏️ Leito Total (180°)" },
  { id: "leito_cama", label: "🛏️ Leito Cama DD (Semi-Cama Duplo)" },
  { id: "semi_leito", label: "💺 Semi-Leito Executivo" },
  { id: "convencional", label: "🪑 Convencional" },
  { id: "microonibus", label: "🚐 Micro-ônibus / Van Executiva" },
  { id: "van_luxo", label: "🚐 Van Luxo (Sprinter/Master)" },
  { id: "suv_4x4", label: "🚙 SUV 4x4 / Hilux (Transfer Off-road)" },
  { id: "barco", label: "⛵ Barco / Lancha / Catamarã" },
  { id: "outro", label: "🔩 Outro Veículo" },
];

/** Serviços de guia turístico */
export const CANONICAL_GUIDE_SERVICES = [
  { id: "guide_cadastur", label: "🧭 Guia Acompanhante CADASTUR (Toda a viagem)" },
  { id: "guide_local", label: "📍 Guia Local no Destino (Pontos específicos)" },
  { id: "guide_bilingual", label: "🌐 Guia Bilíngue (PT / EN / ES)" },
  { id: "guide_none", label: "🗺️ Roteiro Livre (Sem Guia)" },
  { id: "guide_app", label: "📱 Guia Digital via App" },
];

/** Status de saídas / datas de viagem */
export type DepartureStatus = "confirmed" | "filling_fast" | "few_seats" | "sold_out" | "on_request";

export const DEPARTURE_STATUS_CONFIG: Record<DepartureStatus, { label: string; color: string; icon: string }> = {
  confirmed: { label: "Confirmada", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: "✅" },
  filling_fast: { label: "Quase Esgotando", color: "text-amber-600 bg-amber-50 border-amber-200", icon: "🔥" },
  few_seats: { label: "Últimas Vagas", color: "text-orange-600 bg-orange-50 border-orange-200", icon: "⚠️" },
  sold_out: { label: "Esgotada", color: "text-red-600 bg-red-50 border-red-200", icon: "❌" },
  on_request: { label: "Sob Consulta", color: "text-blue-600 bg-blue-50 border-blue-200", icon: "💬" },
};

/** Departure Option — Saída de viagem com múltiplas datas */
export interface DepartureOption {
  id: string;
  label?: string;           // ex: "Saída 1 — Carnaval 2026"
  departure_date: string;   // "YYYY-MM-DD"
  return_date: string;      // "YYYY-MM-DD"
  departure_time?: string;  // "22:00" horário de embarque
  status: DepartureStatus;
  available_seats?: number;
  price_override_cents?: number; // se null, usa preço principal
  notes?: string;
}

/** Veículos de transfer terrestre para modo Combo */
export const CANONICAL_TRANSFER_VEHICLES = [
  { id: "4x4_hilux", label: "🚙 4x4 Hilux / SW4 (Off-road)" },
  { id: "4x4_defender", label: "🚙 Land Rover Defender (Off-road)" },
  { id: "van_sprinter", label: "🚐 Van Sprinter / Master" },
  { id: "microonibus", label: "🚌 Micro-ônibus" },
  { id: "barco_lancha", label: "⛵ Barco / Lancha" },
  { id: "buggy", label: "🏎️ Buggy (Beach)" },
  { id: "tuk_tuk", label: "🛺 Tuk-Tuk / Moto-táxi" },
  { id: "quad_atv", label: "🏍️ Quad / ATV" },
  { id: "outro", label: "🔩 Outro" },
];

/** Estrutura canônica de detalhes de transporte para `flight_details` (legado) ou `transport_details` (novo) */
export interface TransportDetails {
  // Modo: qual é o tipo principal de transporte
  transport_type: string; // "airplane" | "bus" | "combo" | "cruise" | "car" | "hotel_only"

  // ── AÉREO ──
  departure_iata?: string;
  arrival_iata?: string;
  airline?: string;
  connections?: number;
  departure_time?: string;
  arrival_time?: string;
  price_text?: string;
  duration_text?: string;
  origin_text?: string;

  // ── TERRESTRE / EXCURSÃO ──
  bus_category?: string;
  bus_company?: string;
  departure_city?: string;
  meeting_point?: string;      // ex: "Posto Bertaso, Chapecó — 22:00h"
  boarding_gateways?: string[]; // ["Xaxim", "Xanxerê", "Joaçaba", "Campos Novos"]
  return_departure_time?: string; // ex: "16:00" — horário saída do destino na volta
  guide_service?: string;      // "guide_cadastur" | "guide_local" | "guide_none" etc.

  // ── MULTIMODAL / COMBO ──
  // Leg 1: Voo
  combo_flight_from_iata?: string;
  combo_flight_to_iata?: string;
  combo_airline?: string;
  combo_flight_price_text?: string;
  // Leg 2: Transfer Terrestre
  transfer_vehicle?: string;
  transfer_from?: string;    // ex: "Fortaleza (FOR)"
  transfer_to?: string;      // ex: "Jericoacoara"
  transfer_duration?: string; // ex: "4h"
  transfer_departure_time?: string;
  // Leg 3+: extras
  combo_notes?: string;

  // ── CRUZEIRO ──
  ship_name?: string;
  cruise_line?: string;
  cabin_category?: string;
  embarkation_port?: string;
  disembarkation_port?: string;
  boarding_checkin_time?: string;
  ship_departure_time?: string;
  ship_arrival_time?: string;

  // ── GENÉRICO ──
  mixed_transport_summary?: string;
  transfer_pickup_time?: string;
  transfer_return_time?: string;
}

/** Mapeamento de ícones por transport_type para uso nos displays */
export const TRANSPORT_ICONS: Record<string, string> = {
  airplane: "✈️",
  bus: "🚌",
  combo: "🔄",
  cruise: "🛳️",
  train: "🚂",
  car: "🚗",
  hotel_only: "🏨",
};

/** Helper: retorna ícone + label curto do tipo de transporte */
export function getTransportLabel(type: string): string {
  const map: Record<string, string> = {
    airplane: "✈️ Aéreo",
    bus: "🚌 Excursão Terrestre",
    combo: "🔄 Multimodal",
    cruise: "🛳️ Cruzeiro",
    train: "🚂 Trem",
    car: "🚗 Carro Próprio",
    hotel_only: "🏨 Pacote Local",
  };
  return map[type] || "🧳 Viagem";
}

/** Helper: checa se o tipo precisa de campos de aeroporto */
export function isAirplaneLeg(type: string): boolean {
  return type === "airplane" || type === "combo";
}

/** Helper: checa se o tipo é terrestre/excursão */
export function isBusLeg(type: string): boolean {
  return type === "bus" || type === "combo";
}
