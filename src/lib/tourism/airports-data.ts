import {
  GLOBAL_AIRPORTS_CATALOG,
  searchAirportsCatalog,
} from "@/lib/data/airports-catalog";

export interface AirportItem {
  iata: string;
  name: string;
  city: string;
  state: string;
  country: string;
  isPopular?: boolean;
}

const POPULAR_IATA_CODES = new Set([
  "XAP",
  "FLN",
  "NVT",
  "CWB",
  "IGU",
  "POA",
  "CXJ",
  "GRU",
  "CGH",
  "VCP",
  "SDU",
  "GIG",
  "CNF",
  "BSB",
  "CGR",
  "SSA",
  "BPS",
  "REC",
  "FOR",
  "NAT",
  "MCZ",
  "MAO",
  "MCO",
  "MIA",
  "JFK",
  "LIS",
  "MAD",
  "CDG",
  "FCO",
  "EZE",
  "SCL",
  "PUJ",
  "CUN",
  "DXB",
]);

export const CANONICAL_AIRPORTS: AirportItem[] = GLOBAL_AIRPORTS_CATALOG.map((a) => ({
  iata: a.iata_code,
  name: a.name,
  city: a.city,
  state: a.state_province || a.country_code,
  country: a.country,
  isPopular: POPULAR_IATA_CODES.has(a.iata_code),
}));

export function searchAirports(query: string, limit = 60): AirportItem[] {
  if (!query || !query.trim()) {
    return CANONICAL_AIRPORTS.filter((a) => a.isPopular).slice(0, limit);
  }
  return searchAirportsCatalog(query, { limit }).map((a) => ({
    iata: a.iata_code,
    name: a.name,
    city: a.city,
    state: a.state_province || a.country_code,
    country: a.country,
    isPopular: POPULAR_IATA_CODES.has(a.iata_code),
  }));
}
