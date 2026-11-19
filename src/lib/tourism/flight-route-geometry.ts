/**
 * flight-route-geometry.ts — Pure Geodesic Geometry, Airport Coordinate Resolution
 * & SVG Projection Utilities for Travel Proposals & Flight Cards.
 *
 * Zero network dependencies: merges runtime records fetched from `public.airports_global`
 * with a deterministic curated directory for major Brazilian and global hubs so both
 * interactive MapLibre maps and synchronous CORS-free PDF/SVG snapshots stay accurate.
 */

import type { CruiseItineraryDayDTO } from "@/services/travel-proposal.functions";
export type { CruiseItineraryDayDTO };

export const FLIGHT_ROUTE_DISCLAIMER =
  "Rotas ilustrativas. Sujeitas a alterações operacionais da companhia aérea.";

export interface FlightCoordinatePoint {
  iata: string;
  city: string;
  name: string;
  lat: number;
  lng: number;
  countryCode?: string;
}

export interface FlightLegInput {
  from_iata?: string;
  from_city?: string;
  from_airport_name?: string;
  to_iata?: string;
  to_city?: string;
  to_airport_name?: string;
  layover_duration_after?: string;
}

export interface FlightSegmentRouteInput {
  direction?: "ida" | "volta" | "trecho" | string;
  type?: string;
  leg?: string;
  departure_iata?: string;
  origin_iata?: string;
  origin?: string;
  departure_city?: string;
  origin_city?: string;
  arrival_iata?: string;
  destination_iata?: string;
  destination?: string;
  arrival_city?: string;
  destination_city?: string;
  connection_airports?: string[];
  connections?: string[] | string;
  stops_count?: number;
  stops?: number;
  legs?: FlightLegInput[];
}

export interface ResolvedFlightLegGeometry {
  id: string;
  direction: "ida" | "volta";
  from: FlightCoordinatePoint;
  to: FlightCoordinatePoint;
  arcPoints: Array<[number, number]>; // [lng, lat]
  layoverIatas: string[];
}

export interface ResolvedFlightRouteModel {
  allIatas: string[];
  stops: Array<FlightCoordinatePoint & { role: "origin" | "layover" | "destination"; direction: "ida" | "volta" | "both" }>;
  legs: ResolvedFlightLegGeometry[];
  unresolvedIatas: string[];
  bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number } | null;
}

/** Curated baseline directory matching Brazilian gateways & primary international hubs. */
export const CURATED_AIRPORT_COORDINATES: Record<string, FlightCoordinatePoint> = {
  XAP: { iata: "XAP", city: "Chapecó", name: "Aeroporto Serafin Enoss Bertaso", lat: -27.1342, lng: -52.6567, countryCode: "BR" },
  GRU: { iata: "GRU", city: "São Paulo", name: "Aeroporto Internacional de Guarulhos", lat: -23.4356, lng: -46.4731, countryCode: "BR" },
  CGH: { iata: "CGH", city: "São Paulo", name: "Aeroporto de Congonhas", lat: -23.6261, lng: -46.6564, countryCode: "BR" },
  VCP: { iata: "VCP", city: "Campinas", name: "Aeroporto Internacional de Viracopos", lat: -23.0074, lng: -47.1345, countryCode: "BR" },
  FLN: { iata: "FLN", city: "Florianópolis", name: "Aeroporto Internacional Hercílio Luz", lat: -27.6703, lng: -48.5525, countryCode: "BR" },
  NVT: { iata: "NVT", city: "Navegantes", name: "Aeroporto Internacional Ministro Victor Konder", lat: -26.8799, lng: -48.6514, countryCode: "BR" },
  JOI: { iata: "JOI", city: "Joinville", name: "Aeroporto Lauro Carneiro de Loyola", lat: -26.2245, lng: -48.7974, countryCode: "BR" },
  LDB: { iata: "LDB", city: "Londrina", name: "Aeroporto Governador José Richa", lat: -23.3336, lng: -51.1301, countryCode: "BR" },
  IGU: { iata: "IGU", city: "Foz do Iguaçu", name: "Aeroporto Internacional das Cataratas", lat: -25.6003, lng: -54.4851, countryCode: "BR" },
  POA: { iata: "POA", city: "Porto Alegre", name: "Aeroporto Internacional Salgado Filho", lat: -29.9944, lng: -51.1714, countryCode: "BR" },
  CXJ: { iata: "CXJ", city: "Caxias do Sul", name: "Aeroporto Regional Hugo Cantergiani", lat: -29.1971, lng: -51.1875, countryCode: "BR" },
  CWB: { iata: "CWB", city: "Curitiba", name: "Aeroporto Internacional Afonso Pena", lat: -25.5285, lng: -49.1758, countryCode: "BR" },
  GIG: { iata: "GIG", city: "Rio de Janeiro", name: "Aeroporto Internacional Tom Jobim (Galeão)", lat: -22.8099, lng: -43.2506, countryCode: "BR" },
  SDU: { iata: "SDU", city: "Rio de Janeiro", name: "Aeroporto Santos Dumont", lat: -22.9105, lng: -43.1631, countryCode: "BR" },
  BSB: { iata: "BSB", city: "Brasília", name: "Aeroporto Internacional de Brasília", lat: -15.8692, lng: -47.9208, countryCode: "BR" },
  CNF: { iata: "CNF", city: "Belo Horizonte", name: "Aeroporto Internacional de Confins", lat: -19.6244, lng: -43.9719, countryCode: "BR" },
  GYN: { iata: "GYN", city: "Goiânia", name: "Aeroporto Santa Genoveva", lat: -16.6320, lng: -49.2207, countryCode: "BR" },
  CGR: { iata: "CGR", city: "Campo Grande", name: "Aeroporto Internacional de Campo Grande", lat: -20.4687, lng: -54.6725, countryCode: "BR" },
  CGB: { iata: "CGB", city: "Cuiabá", name: "Aeroporto Internacional Marechal Rondon", lat: -15.6529, lng: -56.1167, countryCode: "BR" },
  SSA: { iata: "SSA", city: "Salvador", name: "Aeroporto Internacional de Salvador", lat: -12.9086, lng: -38.3225, countryCode: "BR" },
  BPS: { iata: "BPS", city: "Porto Seguro", name: "Aeroporto Internacional de Porto Seguro", lat: -16.4386, lng: -39.0809, countryCode: "BR" },
  IOS: { iata: "IOS", city: "Ilhéus", name: "Aeroporto Jorge Amado", lat: -14.8159, lng: -39.0332, countryCode: "BR" },
  REC: { iata: "REC", city: "Recife", name: "Aeroporto Internacional dos Guararapes", lat: -8.1265, lng: -34.9236, countryCode: "BR" },
  MCZ: { iata: "MCZ", city: "Maceió", name: "Aeroporto Internacional Zumbi dos Palmares", lat: -9.5108, lng: -35.7917, countryCode: "BR" },
  FOR: { iata: "FOR", city: "Fortaleza", name: "Aeroporto Internacional Pinto Martins", lat: -3.7763, lng: -38.5326, countryCode: "BR" },
  JJD: { iata: "JJD", city: "Jericoacoara", name: "Aeroporto Regional Comandante Ariston Pessoa", lat: -2.9058, lng: -40.3581, countryCode: "BR" },
  NAT: { iata: "NAT", city: "Natal", name: "Aeroporto Internacional de Natal", lat: -5.7681, lng: -35.3761, countryCode: "BR" },
  JPA: { iata: "JPA", city: "João Pessoa", name: "Aeroporto Internacional Castro Pinto", lat: -7.1484, lng: -34.9507, countryCode: "BR" },
  AJU: { iata: "AJU", city: "Aracaju", name: "Aeroporto Internacional Santa Maria", lat: -10.9840, lng: -37.0703, countryCode: "BR" },
  SLZ: { iata: "SLZ", city: "São Luís", name: "Aeroporto Internacional Marechal Cunha Machado", lat: -2.5854, lng: -44.2341, countryCode: "BR" },
  THE: { iata: "THE", city: "Teresina", name: "Aeroporto Senador Petrônio Portella", lat: -5.0599, lng: -42.8235, countryCode: "BR" },
  BEL: { iata: "BEL", city: "Belém", name: "Aeroporto Internacional de Val-de-Cans", lat: -1.3793, lng: -48.4763, countryCode: "BR" },
  MAO: { iata: "MAO", city: "Manaus", name: "Aeroporto Internacional Eduardo Gomes", lat: -3.0386, lng: -60.0497, countryCode: "BR" },
  VIX: { iata: "VIX", city: "Vitória", name: "Aeroporto Eurico de Aguiar Salles", lat: -20.2581, lng: -40.2864, countryCode: "BR" },
  FEN: { iata: "FEN", city: "Fernando de Noronha", name: "Aeroporto de Fernando de Noronha", lat: -3.8549, lng: -32.4233, countryCode: "BR" },
  CAL: { iata: "CAL", city: "Caldas Novas", name: "Aeroporto Nelson Ribeiro Guimarães", lat: -17.7253, lng: -48.6075, countryCode: "BR" },
  CLV: { iata: "CLV", city: "Caldas Novas", name: "Aeroporto Nelson Ribeiro Guimarães", lat: -17.7253, lng: -48.6075, countryCode: "BR" },
  EZE: { iata: "EZE", city: "Buenos Aires", name: "Aeroporto Internacional Ezeiza", lat: -34.8222, lng: -58.5358, countryCode: "AR" },
  AEP: { iata: "AEP", city: "Buenos Aires", name: "Aeroparque Jorge Newbery", lat: -34.5592, lng: -58.4156, countryCode: "AR" },
  BRC: { iata: "BRC", city: "Bariloche", name: "Aeroporto Internacional Teniente Luis Candelaria", lat: -41.1512, lng: -71.1575, countryCode: "AR" },
  USH: { iata: "USH", city: "Ushuaia", name: "Aeroporto Internacional Malvinas Argentinas", lat: -54.8433, lng: -68.2958, countryCode: "AR" },
  MDZ: { iata: "MDZ", city: "Mendoza", name: "Aeroporto Internacional El Plumerillo", lat: -32.8317, lng: -68.7929, countryCode: "AR" },
  SCL: { iata: "SCL", city: "Santiago", name: "Aeroporto Internacional Arturo Merino Benítez", lat: -33.3930, lng: -70.7858, countryCode: "CL" },
  MVD: { iata: "MVD", city: "Montevidéu", name: "Aeroporto Internacional de Carrasco", lat: -34.8384, lng: -56.0308, countryCode: "UY" },
  PDP: { iata: "PDP", city: "Punta del Este", name: "Aeroporto Internacional de Laguna del Sauce", lat: -34.8551, lng: -55.0943, countryCode: "UY" },
  ASU: { iata: "ASU", city: "Assunção", name: "Aeroporto Internacional Silvio Pettirossi", lat: -25.2399, lng: -57.5191, countryCode: "PY" },
  LIM: { iata: "LIM", city: "Lima", name: "Aeroporto Internacional Jorge Chávez", lat: -12.0219, lng: -77.1143, countryCode: "PE" },
  CUZ: { iata: "CUZ", city: "Cusco", name: "Aeroporto Internacional Alejandro Velasco Astete", lat: -13.5357, lng: -71.9388, countryCode: "PE" },
  BOG: { iata: "BOG", city: "Bogotá", name: "Aeroporto Internacional El Dorado", lat: 4.7016, lng: -74.1469, countryCode: "CO" },
  CTG: { iata: "CTG", city: "Cartagena", name: "Aeroporto Internacional Rafael Núñez", lat: 10.4424, lng: -75.5130, countryCode: "CO" },
  ADZ: { iata: "ADZ", city: "San Andrés", name: "Aeroporto Internacional Gustavo Rojas Pinilla", lat: 12.5836, lng: -81.7112, countryCode: "CO" },
  PTY: { iata: "PTY", city: "Cidade do Panamá", name: "Aeroporto Internacional de Tocumen", lat: 9.0714, lng: -79.3835, countryCode: "PA" },
  CUN: { iata: "CUN", city: "Cancún", name: "Aeroporto Internacional de Cancún", lat: 21.0365, lng: -86.8771, countryCode: "MX" },
  MEX: { iata: "MEX", city: "Cidade do México", name: "Aeroporto Internacional Benito Juárez", lat: 19.4363, lng: -99.0721, countryCode: "MX" },
  PUJ: { iata: "PUJ", city: "Punta Cana", name: "Aeroporto Internacional de Punta Cana", lat: 18.5674, lng: -68.3634, countryCode: "DO" },
  MIA: { iata: "MIA", city: "Miami", name: "Miami International Airport", lat: 25.7959, lng: -80.2870, countryCode: "US" },
  MCO: { iata: "MCO", city: "Orlando", name: "Orlando International Airport", lat: 28.4312, lng: -81.3081, countryCode: "US" },
  JFK: { iata: "JFK", city: "Nova York", name: "John F. Kennedy International Airport", lat: 40.6413, lng: -73.7781, countryCode: "US" },
  ATL: { iata: "ATL", city: "Atlanta", name: "Hartsfield-Jackson Atlanta International Airport", lat: 33.6407, lng: -84.4277, countryCode: "US" },
  IAH: { iata: "IAH", city: "Houston", name: "George Bush Intercontinental Airport", lat: 29.9902, lng: -95.3368, countryCode: "US" },
  LIS: { iata: "LIS", city: "Lisboa", name: "Aeroporto Humberto Delgado", lat: 38.7742, lng: -9.1342, countryCode: "PT" },
  OPO: { iata: "OPO", city: "Porto", name: "Aeroporto Francisco Sá Carneiro", lat: 41.2481, lng: -8.6814, countryCode: "PT" },
  MAD: { iata: "MAD", city: "Madri", name: "Aeroporto Adolfo Suárez Madrid-Barajas", lat: 40.4983, lng: -3.5676, countryCode: "ES" },
  BCN: { iata: "BCN", city: "Barcelona", name: "Aeroporto Josep Tarradellas Barcelona-El Prat", lat: 41.2974, lng: 2.0833, countryCode: "ES" },
  CDG: { iata: "CDG", city: "Paris", name: "Aeroporto Charles de Gaulle", lat: 49.0097, lng: 2.5479, countryCode: "FR" },
  ORY: { iata: "ORY", city: "Paris", name: "Aeroporto de Orly", lat: 48.7262, lng: 2.3652, countryCode: "FR" },
  LHR: { iata: "LHR", city: "Londres", name: "Heathrow Airport", lat: 51.4700, lng: -0.4543, countryCode: "GB" },
  FCO: { iata: "FCO", city: "Roma", name: "Aeroporto Leonardo da Vinci-Fiumicino", lat: 41.8003, lng: 12.2389, countryCode: "IT" },
  MXP: { iata: "MXP", city: "Milão", name: "Aeroporto de Milão-Malpensa", lat: 45.6301, lng: 8.7255, countryCode: "IT" },
  AMS: { iata: "AMS", city: "Amsterdã", name: "Amsterdam Airport Schiphol", lat: 52.3105, lng: 4.7683, countryCode: "NL" },
  FRA: { iata: "FRA", city: "Frankfurt", name: "Frankfurt Airport", lat: 50.0379, lng: 8.5622, countryCode: "DE" },
  ZRH: { iata: "ZRH", city: "Zurique", name: "Zurich Airport", lat: 47.4647, lng: 8.5492, countryCode: "CH" },
  DXB: { iata: "DXB", city: "Dubai", name: "Dubai International Airport", lat: 25.2532, lng: 55.3657, countryCode: "AE" },
  DOH: { iata: "DOH", city: "Doha", name: "Hamad International Airport", lat: 25.2731, lng: 51.6081, countryCode: "QA" },
  IST: { iata: "IST", city: "Istambul", name: "Istanbul Airport", lat: 41.2753, lng: 28.7519, countryCode: "TR" },
};

export interface CruisePortPoint {
  code: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  lat: number;
  lng: number;
}

/** Diretório curado de portos e escalas marítimas de cruzeiros no Brasil e América do Sul */
export const CURATED_CRUISE_PORTS: Record<string, CruisePortPoint> = {
  SANTOS: { code: "SSZ", name: "Porto de Santos", city: "Santos (São Paulo)", state: "SP", country: "Brasil", lat: -23.9618, lng: -46.3322 },
  BUZIOS: { code: "BZS", name: "Armação dos Búzios", city: "Búzios", state: "RJ", country: "Brasil", lat: -22.7538, lng: -41.9056 },
  RIO: { code: "RIO", name: "Porto Maravilha (Pier Mauá)", city: "Rio de Janeiro", state: "RJ", country: "Brasil", lat: -22.8972, lng: -43.1819 },
  ILHABELA: { code: "ILH", name: "Ilhabela", city: "Ilhabela", state: "SP", country: "Brasil", lat: -23.7781, lng: -45.3581 },
  ANGRA: { code: "ANG", name: "Angra dos Reis / Ilha Grande", city: "Angra dos Reis", state: "RJ", country: "Brasil", lat: -23.0067, lng: -44.3181 },
  UBATUBA: { code: "UBA", name: "Ubatuba", city: "Ubatuba", state: "SP", country: "Brasil", lat: -23.4339, lng: -45.0844 },
  BALNEARIO: { code: "BCB", name: "Atracadouro Barra Sul", city: "Balneário Camboriú", state: "SC", country: "Brasil", lat: -26.9926, lng: -48.6341 },
  PORTO_BELO: { code: "PBL", name: "Porto Belo", city: "Porto Belo", state: "SC", country: "Brasil", lat: -27.1583, lng: -48.5528 },
  ITAJAI: { code: "ITJ", name: "Porto de Itajaí", city: "Itajaí", state: "SC", country: "Brasil", lat: -26.9114, lng: -48.6575 },
  SALVADOR: { code: "SSA", name: "Porto de Salvador", city: "Salvador", state: "BA", country: "Brasil", lat: -12.9698, lng: -38.5136 },
  ILHEUS: { code: "IOS", name: "Porto de Ilhéus", city: "Ilhéus", state: "BA", country: "Brasil", lat: -14.7892, lng: -39.0494 },
  MACEIO: { code: "MCZ", name: "Porto de Maceió", city: "Maceió", state: "AL", country: "Brasil", lat: -9.6728, lng: -35.7244 },
  RECIFE: { code: "REC", name: "Porto do Recife", city: "Recife", state: "PE", country: "Brasil", lat: -8.0583, lng: -34.8711 },
  FORTALEZA: { code: "FOR", name: "Porto do Mucuripe", city: "Fortaleza", state: "CE", country: "Brasil", lat: -3.7172, lng: -38.4739 },
  BUENOS_AIRES: { code: "BUE", name: "Terminal Benito Quinquela Martín", city: "Buenos Aires", country: "Argentina", lat: -34.5889, lng: -58.3703 },
  MONTEVIDEO: { code: "MVD", name: "Porto de Montevidéu", city: "Montevidéu", country: "Uruguai", lat: -34.9056, lng: -56.2133 },
  PUNTA_DEL_ESTE: { code: "PDP", name: "Porto de Punta del Este", city: "Punta del Este", country: "Uruguai", lat: -34.9667, lng: -54.9500 },
};

export function resolveCruisePortCoordinates(rawPortName?: string): CruisePortPoint | null {
  if (!rawPortName || typeof rawPortName !== "string") return null;
  const clean = rawPortName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  const compact = clean.replace(/[^A-Z0-9]/g, "");
  if (!clean || clean.includes("NAVEGAC") || clean.includes("MAR") || clean.includes("SEA")) {
    return null;
  }
  for (const [key, pt] of Object.entries(CURATED_CRUISE_PORTS)) {
    const ptClean = pt.city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    const ptCompact = ptClean.replace(/[^A-Z0-9]/g, "");
    if (clean.includes(key) || clean.includes(ptClean) || (ptCompact.length >= 3 && compact.includes(ptCompact))) {
      return pt;
    }
  }
  if (compact.includes("SANTOS") || compact.includes("SAOPAULO")) return CURATED_CRUISE_PORTS.SANTOS;
  if (compact.includes("BUZIOS")) return CURATED_CRUISE_PORTS.BUZIOS;
  if (compact.includes("RIO") || compact.includes("GALEAO") || compact.includes("PIERMAUA")) return CURATED_CRUISE_PORTS.RIO;
  if (compact.includes("ILHABELA")) return CURATED_CRUISE_PORTS.ILHABELA;
  if (compact.includes("ANGRA") || compact.includes("ILHAGRANDE")) return CURATED_CRUISE_PORTS.ANGRA;
  if (compact.includes("BALNEARIO") || compact.includes("CAMBORIU")) return CURATED_CRUISE_PORTS.BALNEARIO;
  if (compact.includes("SALVADOR") || compact.includes("BAHIA")) return CURATED_CRUISE_PORTS.SALVADOR;
  if (compact.includes("ILHEUS")) return CURATED_CRUISE_PORTS.ILHEUS;
  if (compact.includes("MACEIO") || compact.includes("ALAGOAS")) return CURATED_CRUISE_PORTS.MACEIO;
  return null;
}

/** Coordenadas de costa e silhueta continental da América do Sul e Brasil para mapa vetorial realista */
export const SOUTH_AMERICA_COASTLINE_COORDS: Array<[number, number]> = [
  [-61.9, 10.7], [-59.8, 8.5], [-58.2, 6.8], [-55.1, 5.8], [-52.3, 4.9],
  [-51.0, 0.0], [-49.9, -1.5], [-48.5, -0.5], [-44.3, -2.5], [-42.0, -2.8],
  [-38.5, -3.7], [-36.5, -5.0], [-35.2, -5.8], [-34.8, -7.1], [-34.9, -8.1],
  [-35.7, -9.6], [-37.0, -11.0], [-38.5, -13.0], [-39.0, -14.8], [-39.1, -16.4],
  [-39.2, -17.7], [-40.3, -20.3], [-41.9, -22.8], [-43.2, -22.9], [-44.3, -23.0],
  [-45.1, -23.4], [-45.3, -23.8], [-46.3, -23.9], [-47.9, -25.0], [-48.5, -25.5],
  [-48.6, -26.9], [-48.5, -27.6], [-48.6, -28.2], [-49.7, -29.3], [-50.1, -30.0],
  [-50.8, -31.1], [-52.1, -32.0], [-53.4, -33.7], [-54.9, -34.9], [-56.2, -34.9],
  [-58.4, -34.6], [-57.5, -38.0], [-62.2, -38.7], [-65.0, -42.7], [-67.5, -45.8],
  [-69.2, -51.6], [-68.3, -54.8], [-67.3, -55.9], [-71.0, -54.0], [-73.5, -53.0],
  [-74.0, -45.0], [-73.8, -40.0], [-73.0, -37.0], [-71.6, -33.0], [-70.3, -27.0],
  [-70.4, -20.0], [-70.3, -18.5], [-71.5, -16.5], [-76.0, -14.0], [-77.1, -12.0],
  [-79.0, -9.0], [-81.3, -4.5], [-80.0, -3.0], [-81.0, -2.0], [-79.0, 1.0],
  [-77.5, 3.5], [-77.5, 7.0], [-79.5, 9.0], [-77.0, 8.5], [-75.5, 10.4],
  [-74.2, 11.2], [-71.6, 11.8], [-69.6, 10.6], [-66.9, 10.5], [-61.9, 10.7]
];

export const BRAZIL_BORDER_COORDS: Array<[number, number]> = [
  [-51.0, 0.0], [-49.9, -1.5], [-48.5, -0.5], [-44.3, -2.5], [-42.0, -2.8],
  [-38.5, -3.7], [-36.5, -5.0], [-35.2, -5.8], [-34.8, -7.1], [-34.9, -8.1],
  [-35.7, -9.6], [-37.0, -11.0], [-38.5, -13.0], [-39.0, -14.8], [-39.1, -16.4],
  [-39.2, -17.7], [-40.3, -20.3], [-41.9, -22.8], [-43.2, -22.9], [-44.3, -23.0],
  [-45.1, -23.4], [-45.3, -23.8], [-46.3, -23.9], [-47.9, -25.0], [-48.5, -25.5],
  [-48.6, -26.9], [-48.5, -27.6], [-48.6, -28.2], [-49.7, -29.3], [-50.1, -30.0],
  [-50.8, -31.1], [-52.1, -32.0], [-53.4, -33.7],
  [-55.0, -31.0], [-57.5, -30.2],
  [-54.0, -26.0], [-54.5, -25.6],
  [-54.6, -24.0], [-57.0, -22.2],
  [-58.0, -18.0], [-60.0, -16.0], [-65.3, -10.8], [-69.5, -11.0],
  [-73.5, -7.0], [-70.0, -4.0], [-69.8, 1.0],
  [-67.0, 1.5], [-60.0, 5.0], [-54.5, 2.5], [-51.8, 4.0], [-51.0, 0.0]
];

export const SOUTHEAST_BRAZIL_COASTLINE: Array<[number, number]> = [
  [-47.9, -25.0], [-47.3, -24.6], [-46.8, -24.2], [-46.33, -23.96],
  [-45.8, -23.8], [-45.36, -23.78], [-45.08, -23.43], [-44.71, -23.22],
  [-44.32, -23.01], [-43.85, -22.95], [-43.18, -22.90], [-42.82, -22.92],
  [-42.50, -22.93], [-42.02, -22.96], [-41.90, -22.75], [-41.77, -22.37],
  [-41.32, -21.75]
];

export function normalizeIataCode(raw?: unknown): string {
  const clean = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return clean.length === 3 ? clean : "";
}

function normalizeSegmentDirection(seg: FlightSegmentRouteInput, index: number): "ida" | "volta" {
  const dir = String(seg.direction || seg.type || seg.leg || "").toLowerCase();
  if (dir === "volta" || dir === "return" || dir.includes("volt") || dir.includes("retorn")) {
    return "volta";
  }
  if (dir === "ida" || dir === "outbound" || dir.includes("id")) {
    return "ida";
  }
  return index === 0 ? "ida" : "volta";
}

function parseConnectionsList(seg: FlightSegmentRouteInput): string[] {
  if (Array.isArray(seg.connection_airports)) {
    return seg.connection_airports.map(normalizeIataCode).filter(Boolean);
  }
  if (Array.isArray(seg.connections)) {
    return seg.connections.map(normalizeIataCode).filter(Boolean);
  }
  if (typeof seg.connections === "string") {
    return seg.connections
      .split(/[,;/\s]+/)
      .map(normalizeIataCode)
      .filter(Boolean);
  }
  return [];
}

/** Extracts ordered sequence of IATA codes for every segment (origin -> connections -> destination). */
export function extractFlightRouteChains(segments: FlightSegmentRouteInput[]): Array<{
  direction: "ida" | "volta";
  chain: string[];
  layoverIatas: string[];
}> {
  if (!Array.isArray(segments) || segments.length === 0) return [];
  const chains: Array<{ direction: "ida" | "volta"; chain: string[]; layoverIatas: string[] }> = [];

  segments.forEach((seg, idx) => {
    const direction = normalizeSegmentDirection(seg, idx);
    if (Array.isArray(seg.legs) && seg.legs.length > 0) {
      const chain: string[] = [];
      for (const leg of seg.legs) {
        const fromCode = normalizeIataCode(leg.from_iata);
        const toCode = normalizeIataCode(leg.to_iata);
        if (fromCode && (chain.length === 0 || chain[chain.length - 1] !== fromCode)) {
          chain.push(fromCode);
        }
        if (toCode && chain[chain.length - 1] !== toCode) {
          chain.push(toCode);
        }
      }
      if (chain.length >= 2) {
        chains.push({
          direction,
          chain,
          layoverIatas: chain.slice(1, -1),
        });
        return;
      }
    }

    const fromCode = normalizeIataCode(seg.departure_iata || seg.origin_iata || seg.origin);
    const toCode = normalizeIataCode(seg.arrival_iata || seg.destination_iata || seg.destination);
    if (!fromCode || !toCode) return;

    const connections = parseConnectionsList(seg).filter((code) => code !== fromCode && code !== toCode);
    const chain = [fromCode, ...connections, toCode];
    chains.push({
      direction,
      chain,
      layoverIatas: connections,
    });
  });

  return chains;
}

export function extractUniqueRouteIatas(segments: FlightSegmentRouteInput[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const item of extractFlightRouteChains(segments)) {
    for (const code of item.chain) {
      if (!seen.has(code)) {
        seen.add(code);
        ordered.push(code);
      }
    }
  }
  return ordered;
}

/** Interpolates intermediate spherical great-circle points `[lng, lat]` between two airports. */
export function buildGreatCircleArc(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  steps = 32,
): Array<[number, number]> {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const lat1 = toRad(from.lat);
  const lng1 = toRad(from.lng);
  const lat2 = toRad(to.lat);
  const lng2 = toRad(to.lng);

  const sinDLat = Math.sin((lat2 - lat1) / 2);
  const sinDLng = Math.sin((lng2 - lng1) / 2);
  const a = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const centralAngle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));

  if (!Number.isFinite(centralAngle) || centralAngle < 1e-6) {
    return [
      [from.lng, from.lat],
      [to.lng, to.lat],
    ];
  }

  const points: Array<[number, number]> = [];
  const sinD = Math.sin(centralAngle);
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * centralAngle) / sinD;
    const B = Math.sin(f * centralAngle) / sinD;
    const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lng = Math.atan2(y, x);
    points.push([Number(toDeg(lng).toFixed(5)), Number(toDeg(lat).toFixed(5))]);
  }
  return points;
}

export function resolveFlightRouteModel(
  segments: FlightSegmentRouteInput[],
  dbAirports: Array<{
    iata_code: string;
    city?: string | null;
    name?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    country_code?: string | null;
  }> = [],
): ResolvedFlightRouteModel {
  const coordMap = new Map<string, FlightCoordinatePoint>();
  for (const [k, v] of Object.entries(CURATED_AIRPORT_COORDINATES)) {
    coordMap.set(k, v);
  }
  for (const row of dbAirports) {
    const code = normalizeIataCode(row.iata_code);
    if (!code) continue;
    if (
      typeof row.latitude === "number" &&
      typeof row.longitude === "number" &&
      Number.isFinite(row.latitude) &&
      Number.isFinite(row.longitude)
    ) {
      coordMap.set(code, {
        iata: code,
        city: row.city || coordMap.get(code)?.city || code,
        name: row.name || coordMap.get(code)?.name || `Aeroporto (${code})`,
        lat: row.latitude,
        lng: row.longitude,
        countryCode: row.country_code || coordMap.get(code)?.countryCode,
      });
    }
  }

  const chains = extractFlightRouteChains(segments);
  const allIatas = extractUniqueRouteIatas(segments);
  const unresolvedSet = new Set<string>();
  const stopMap = new Map<
    string,
    FlightCoordinatePoint & { role: "origin" | "layover" | "destination"; direction: "ida" | "volta" | "both" }
  >();
  const legs: ResolvedFlightLegGeometry[] = [];

  const isOutboundPresent = chains.some((c) => c.direction === "ida");

  for (const item of chains) {
    const chain = item.chain;
    chain.forEach((code, idx) => {
      const point = coordMap.get(code);
      if (!point) {
        unresolvedSet.add(code);
        return;
      }
      // Em trechos de volta com ida presente, o ponto inicial é o destino e o final é o retorno à origem.
      const role: "origin" | "layover" | "destination" =
        item.direction === "volta" && isOutboundPresent
          ? idx === 0
            ? "destination"
            : idx === chain.length - 1
              ? "origin"
              : "layover"
          : idx === 0
            ? "origin"
            : idx === chain.length - 1
              ? "destination"
              : "layover";
      const existing = stopMap.get(code);
      if (!existing) {
        stopMap.set(code, { ...point, role, direction: item.direction });
      } else {
        const nextDir = existing.direction === item.direction ? existing.direction : "both";
        const nextRole = existing.role === "layover" && role !== "layover" ? role : existing.role;
        stopMap.set(code, { ...existing, role: nextRole, direction: nextDir });
      }
    });

    for (let i = 0; i < chain.length - 1; i++) {
      const fromPt = coordMap.get(chain[i]);
      const toPt = coordMap.get(chain[i + 1]);
      if (!fromPt || !toPt) continue;
      legs.push({
        id: `${item.direction}-${chain[i]}-${chain[i + 1]}-${i}`,
        direction: item.direction,
        from: fromPt,
        to: toPt,
        arcPoints: buildGreatCircleArc(fromPt, toPt, 30),
        layoverIatas: item.layoverIatas,
      });
    }
  }

  const stops = Array.from(stopMap.values());
  let bounds: ResolvedFlightRouteModel["bounds"] = null;
  if (stops.length > 0) {
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    for (const s of stops) {
      if (s.lng < minLng) minLng = s.lng;
      if (s.lng > maxLng) maxLng = s.lng;
      if (s.lat < minLat) minLat = s.lat;
      if (s.lat > maxLat) maxLat = s.lat;
    }
    bounds = { minLng, minLat, maxLng, maxLat };
  }

  return {
    allIatas,
    stops,
    legs,
    unresolvedIatas: Array.from(unresolvedSet),
    bounds,
  };
}

/** Projects route coordinates into crisp normalized SVG viewBox space `[0..width, 0..height]`. */
export function buildSvgProjectionForRoute(
  model: ResolvedFlightRouteModel,
  width = 720,
  height = 280,
  padding = 42,
): {
  stops: Array<{
    iata: string;
    city: string;
    role: "origin" | "layover" | "destination";
    direction: "ida" | "volta" | "both";
    x: number;
    y: number;
  }>;
  paths: Array<{
    id: string;
    direction: "ida" | "volta";
    d: string;
    midX: number;
    midY: number;
  }>;
  landmassPath: string;
  brazilBorderPath: string;
  oceanLabelPoint: { x: number; y: number };
  brazilLabelPoint: { x: number; y: number };
} {
  if (!model.bounds || model.stops.length === 0) {
    return {
      stops: [],
      paths: [],
      landmassPath: "",
      brazilBorderPath: "",
      oceanLabelPoint: { x: width / 2, y: height / 2 },
      brazilLabelPoint: { x: width / 2, y: height / 2 },
    };
  }

  const rawSpanLng = Math.max(6, model.bounds.maxLng - model.bounds.minLng);
  const rawSpanLat = Math.max(4, model.bounds.maxLat - model.bounds.minLat);
  const midLat = (model.bounds.minLat + model.bounds.maxLat) / 2;
  const cosLat = Math.max(0.2, Math.cos((midLat * Math.PI) / 180));

  // Amplitude com margem respiratória proporcional
  const spanXDeg = rawSpanLng * 1.35;
  const spanYDeg = rawSpanLat * 1.45;

  const centerLng = (model.bounds.minLng + model.bounds.maxLng) / 2;
  const centerLat = midLat;

  const usableW = Math.max(80, width - padding * 2);
  const usableH = Math.max(60, height - padding * 2);

  // Projeção uniforme com aspect ratio geodésico preservado (elimina achatemento horizontal/vertical)
  const scale = Math.min(
    usableW / (spanXDeg * cosLat),
    usableH / spanYDeg,
  );

  const project = (lng: number, lat: number): { x: number; y: number } => {
    const dx = (lng - centerLng) * cosLat * scale;
    const dy = (centerLat - lat) * scale;
    return {
      x: Number((width / 2 + dx).toFixed(1)),
      y: Number((height / 2 + dy).toFixed(1)),
    };
  };

  const stops = model.stops.map((s) => {
    const pt = project(s.lng, s.lat);
    return {
      iata: s.iata,
      city: s.city,
      role: s.role,
      direction: s.direction,
      x: pt.x,
      y: pt.y,
    };
  });

  const paths = model.legs.map((leg) => {
    const pts = leg.arcPoints.map(([lng, lat]) => project(lng, lat));
    const offsetSign = leg.direction === "ida" ? -1 : 1;
    const start = pts[0];
    const end = pts[pts.length - 1];
    const mid = pts[Math.floor(pts.length / 2)] || start;
    const dist = Math.hypot(end.x - start.x, end.y - start.y);
    const curveLift = Math.min(36, Math.max(12, dist * 0.14)) * offsetSign;
    const ctrlX = Number(((start.x + end.x) / 2).toFixed(1));
    const ctrlY = Number((((start.y + end.y) / 2) + curveLift).toFixed(1));
    return {
      id: leg.id,
      direction: leg.direction,
      d: `M ${start.x} ${start.y} Q ${ctrlX} ${ctrlY} ${end.x} ${end.y}`,
      midX: Number(((start.x + 2 * ctrlX + end.x) / 4).toFixed(1)),
      midY: Number(((start.y + 2 * ctrlY + end.y) / 4).toFixed(1)) || mid.y,
    };
  });

  const landmassPts = SOUTH_AMERICA_COASTLINE_COORDS.map(([lng, lat]) => project(lng, lat));
  const landmassPath =
    `M ${landmassPts[0].x} ${landmassPts[0].y} ` +
    landmassPts.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ") +
    " Z";

  const brPts = BRAZIL_BORDER_COORDS.map(([lng, lat]) => project(lng, lat));
  const brazilBorderPath =
    `M ${brPts[0].x} ${brPts[0].y} ` +
    brPts.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ") +
    " Z";

  const oceanLabelPoint = project(-32, -16);
  const brazilLabelPoint = project(-51, -14);

  return {
    stops,
    paths,
    landmassPath,
    brazilBorderPath,
    oceanLabelPoint,
    brazilLabelPoint,
  };
}

export interface ResolvedCruiseRouteStop {
  code: string;
  name: string;
  city: string;
  x: number;
  y: number;
  day: number;
  activityType: string;
}

export function buildSvgProjectionForCruise(
  itinerary: Array<{ day: number; port: string; is_sea_day?: boolean; activity_type?: string }>,
  width = 720,
  height = 260,
  padding = 40,
): {
  stops: ResolvedCruiseRouteStop[];
  routePath: string;
  landmassPath: string;
  oceanLabel: { x: number; y: number; text: string };
  landLabel: { x: number; y: number; text: string };
  arrows: Array<{ x: number; y: number; angle: number }>;
} {
  const portStops: Array<{ point: CruisePortPoint; day: number; activityType: string }> = [];
  itinerary.forEach((it) => {
    if (!it.is_sea_day) {
      const pt = resolveCruisePortCoordinates(it.port);
      if (pt) {
        portStops.push({ point: pt, day: it.day, activityType: it.activity_type || "dock" });
      }
    }
  });

  if (portStops.length === 0) {
    portStops.push(
      { point: CURATED_CRUISE_PORTS.SANTOS, day: 1, activityType: "boarding" },
      { point: CURATED_CRUISE_PORTS.BUZIOS, day: 3, activityType: "dock" },
      { point: CURATED_CRUISE_PORTS.SANTOS, day: 4, activityType: "disembark" },
    );
  } else if (portStops.length === 1) {
    if (portStops[0].point.code === "SSZ") {
      portStops.push({ point: CURATED_CRUISE_PORTS.BUZIOS, day: 2, activityType: "dock" });
    } else {
      portStops.unshift({ point: CURATED_CRUISE_PORTS.SANTOS, day: 1, activityType: "boarding" });
    }
  }

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  portStops.forEach((s) => {
    if (s.point.lng < minLng) minLng = s.point.lng;
    if (s.point.lng > maxLng) maxLng = s.point.lng;
    if (s.point.lat < minLat) minLat = s.point.lat;
    if (s.point.lat > maxLat) maxLat = s.point.lat;
  });

  const rawSpanLng = Math.max(2.5, maxLng - minLng);
  const rawSpanLat = Math.max(2.0, maxLat - minLat);
  const midLat = (minLat + maxLat) / 2;
  const cosLat = Math.max(0.2, Math.cos((midLat * Math.PI) / 180));

  const spanXDeg = rawSpanLng * 1.5;
  const spanYDeg = rawSpanLat * 1.6;
  const centerLng = (minLng + maxLng) / 2;
  const centerLat = midLat;

  const usableW = Math.max(80, width - padding * 2);
  const usableH = Math.max(60, height - padding * 2);

  // Projeção equirretangular náutica com proporção 1:1 rigorosa
  const scale = Math.min(
    usableW / (spanXDeg * cosLat),
    usableH / spanYDeg,
  );

  const project = (lng: number, lat: number) => {
    const dx = (lng - centerLng) * cosLat * scale;
    const dy = (centerLat - lat) * scale;
    return {
      x: Number((width / 2 + dx).toFixed(1)),
      y: Number((height / 2 + dy).toFixed(1)),
    };
  };

  const coastPts = SOUTHEAST_BRAZIL_COASTLINE.map(([lng, lat]) => project(lng, lat));
  const landmassPath =
    `M 0 0 L ${width} 0 L ${coastPts[coastPts.length - 1].x} ${coastPts[coastPts.length - 1].y} ` +
    coastPts
      .slice()
      .reverse()
      .map((p) => `L ${p.x} ${p.y}`)
      .join(" ") +
    ` L 0 ${coastPts[0].y} Z`;

  const stops: ResolvedCruiseRouteStop[] = [];
  const visitedCodes = new Set<string>();
  portStops.forEach((s) => {
    if (!visitedCodes.has(s.point.code)) {
      visitedCodes.add(s.point.code);
      const pt = project(s.point.lng, s.point.lat);
      stops.push({
        code: s.point.code,
        name: s.point.name,
        city: s.point.city.split("(")[0].trim().toUpperCase(),
        x: pt.x,
        y: pt.y,
        day: s.day,
        activityType: s.activityType,
      });
    }
  });

  const orderedPts = portStops.map((s) => project(s.point.lng, s.point.lat));
  let routePath = "";
  const arrows: Array<{ x: number; y: number; angle: number }> = [];

  if (orderedPts.length >= 2) {
    routePath = `M ${orderedPts[0].x} ${orderedPts[0].y}`;
    for (let i = 0; i < orderedPts.length - 1; i++) {
      const p1 = orderedPts[i];
      const p2 = orderedPts[i + 1];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2 + 18;
      routePath += ` Q ${midX} ${midY} ${p2.x} ${p2.y}`;

      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
      arrows.push({ x: midX, y: midY, angle });
    }
  }

  const oceanLabel = project((minLng + maxLng) / 2 + 0.8, minLat - 0.5);
  const landLabel = project((minLng + maxLng) / 2 - 0.5, maxLat + 0.5);

  return {
    stops,
    routePath,
    landmassPath,
    oceanLabel: {
      x: Math.min(width - 90, Math.max(80, oceanLabel.x)),
      y: Math.min(height - 20, Math.max(40, oceanLabel.y)),
      text: "Atlantic Ocean",
    },
    landLabel: {
      x: Math.min(width - 60, Math.max(40, landLabel.x)),
      y: Math.min(height - 40, Math.max(30, landLabel.y)),
      text: "Brazil",
    },
    arrows,
  };
}
