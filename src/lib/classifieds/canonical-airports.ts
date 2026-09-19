// ─────────────────────────────────────────────────────────────────────────────
// Aeroportos Brasileiros Canônicos — Waesy Turismo
// Fonte: ANAC + Infraero. Usado em: criação de classificados de viagem.
// ─────────────────────────────────────────────────────────────────────────────

import { GLOBAL_AIRPORTS_CATALOG } from "@/lib/data/airports-catalog";
import { GLOBAL_AIRLINES_CATALOG, GLOBAL_CRUISES_CATALOG } from "@/lib/data/airlines-cruises-catalog";

export interface Airport {
  iata: string;
  name: string;
  city: string;
  state: string;
  region: "Norte" | "Nordeste" | "Centro-Oeste" | "Sudeste" | "Sul" | "Internacional";
}

function deriveRegion(state?: string, countryCode?: string): Airport["region"] {
  if (countryCode && countryCode !== "BR") return "Internacional";
  if (!state) return "Sudeste";
  const st = state.toUpperCase().trim();
  if (["PR", "SC", "RS"].includes(st)) return "Sul";
  if (["SP", "RJ", "MG", "ES"].includes(st)) return "Sudeste";
  if (["MS", "MT", "GO", "DF"].includes(st)) return "Centro-Oeste";
  if (["BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA"].includes(st)) return "Nordeste";
  return "Norte";
}

export const CANONICAL_AIRPORTS: Airport[] = GLOBAL_AIRPORTS_CATALOG.map((a) => ({
  iata: a.iata_code,
  name: a.name,
  city: a.city,
  state: a.state_province || a.country_code,
  region: deriveRegion(a.state_province, a.country_code),
}));

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

/** Airlines Canônicas (24 companhias aéreas) */
export const CANONICAL_AIRLINES = [
  ...GLOBAL_AIRLINES_CATALOG.map((al) => ({
    id: al.iata_code,
    label: `${al.name} (${al.iata_code})`,
  })),
  { id: "OTHER", label: "Outra Companhia" },
];

/** Companhias de Cruzeiro Canônicas */
export const CANONICAL_CRUISE_LINES = GLOBAL_CRUISES_CATALOG.map((c) => ({
  id: c.id,
  label: `${c.name} (${c.style})`,
  featured_ships: c.featured_ships_brazil,
  ports: c.departure_ports_brazil,
}));

/** Tipos de transporte */
export const CANONICAL_TRANSPORT_TYPES = [
  { id: "airplane", label: "Aéreo Comercial" },
  { id: "bus", label: "Terrestre / Excursão" },
  { id: "cruise", label: "Cruzeiro Marítimo" },
  { id: "train", label: "Trem / Ferrovia" },
  { id: "car", label: "Carro Próprio / Alugado" },
  { id: "combo", label: "Multimodal (Voo + Transfer)" },
  { id: "hotel_only", label: "Hospedagem / Roteiro Local" },
];

/** Categorias de ônibus / veículos rodoviários */
export const CANONICAL_BUS_CATEGORIES = [
  { id: "leito_total", label: "Leito Total (180°)" },
  { id: "leito_cama", label: "Leito Cama DD (Semi-Cama Duplo)" },
  { id: "semi_leito", label: "Semi-Leito Executivo" },
  { id: "convencional", label: "Convencional" },
  { id: "microonibus", label: "Micro-ônibus / Van Executiva" },
  { id: "van_luxo", label: "Van Luxo (Sprinter/Master)" },
  { id: "suv_4x4", label: "SUV 4x4 / Hilux (Transfer Off-road)" },
  { id: "barco", label: "Barco / Lancha / Catamarã" },
  { id: "outro", label: "Outro Veículo" },
];

/** Serviços de guia turístico */
export const CANONICAL_GUIDE_SERVICES = [
  { id: "guide_cadastur", label: "Guia Acompanhante CADASTUR (Toda a viagem)" },
  { id: "guide_local", label: "Guia Local no Destino (Pontos específicos)" },
  { id: "guide_bilingual", label: "Guia Bilíngue (PT / EN / ES)" },
  { id: "guide_none", label: "Roteiro Livre (Sem Guia)" },
  { id: "guide_app", label: "Guia Digital via App" },
];

/** Status de saídas / datas de viagem */
export type DepartureStatus = "confirmed" | "filling_fast" | "few_seats" | "sold_out" | "on_request";

export const DEPARTURE_STATUS_CONFIG: Record<DepartureStatus, { label: string; color: string; icon: string }> = {
  confirmed: { label: "Confirmada", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: "check" },
  filling_fast: { label: "Quase Esgotando", color: "text-amber-600 bg-amber-50 border-amber-200", icon: "flame" },
  few_seats: { label: "Últimas Vagas", color: "text-orange-600 bg-orange-50 border-orange-200", icon: "alert" },
  sold_out: { label: "Esgotada", color: "text-red-600 bg-red-50 border-red-200", icon: "x" },
  on_request: { label: "Sob Consulta", color: "text-blue-600 bg-blue-50 border-blue-200", icon: "message" },
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
  { id: "4x4_hilux", label: "4x4 Hilux / SW4 (Off-road)" },
  { id: "4x4_defender", label: "Land Rover Defender (Off-road)" },
  { id: "van_sprinter", label: "Van Sprinter / Master" },
  { id: "microonibus", label: "Micro-ônibus" },
  { id: "barco_lancha", label: "Barco / Lancha" },
  { id: "buggy", label: "Buggy (Beach)" },
  { id: "tuk_tuk", label: "Tuk-Tuk / Moto-táxi" },
  { id: "quad_atv", label: "Quad / ATV" },
  { id: "outro", label: "Outro" },
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
