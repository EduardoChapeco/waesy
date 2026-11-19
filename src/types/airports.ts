/**
 * airports.ts — Contratos Canônicos de Aeroportos (SSOT no Supabase `airports_global`)
 * Substitui o catálogo estático em memória para manter bundle leve e leitura 100% via banco.
 */

export interface AirportRecord {
  iata_code: string;
  icao_code: string;
  name: string;
  city: string;
  state_province?: string | null;
  country: string;
  country_code: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  is_commercial: boolean;
}

export interface SearchAirportsOptions {
  country?: string;
  limit?: number;
}

/**
 * Remove acentos e normaliza para busca rápida.
 */
export { normalizeDiacriticText as normalizeAirportSearchText } from "@/lib/utils";

/**
 * Formata rótulo amigável para exibição em seletores e cards.
 * Exemplo: "XAP — Chapecó/SC (Aeroporto Serafin Enoss Bertaso)" ou "LIS — Lisboa, Portugal (Aeroporto Humberto Delgado)"
 */
export function formatAirportLabel(airport: AirportRecord): string {
  const location =
    airport.state_province && airport.country_code === "BR"
      ? `${airport.city}/${airport.state_province}`
      : `${airport.city}, ${airport.country}`;
  return `${airport.iata_code} — ${location} (${airport.name})`;
}
