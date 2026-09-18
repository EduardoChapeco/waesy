/**
 * airlines-cruises-catalog.ts — Catálogo Centralizado de Companhias Aéreas e Marítimas
 * Padrões: IATA (2 letras), ICAO (3 letras) e Registro Marítimo Internacional.
 * Usado para: Emissões de Bilhetes GDS, Pacotes de Turismo, Vouchers e Roteiros de Cruzeiros.
 */

export interface AirlineRecord {
  iata_code: string; // 2 caracteres (LA, G3, AD, etc.)
  icao_code: string; // 3 caracteres (TAM, GLO, AZU, etc.)
  name: string;
  country: string;
  country_code: string;
  alliance: "Star Alliance" | "SkyTeam" | "Oneworld" | "Independente";
  is_brazilian_domestic: boolean;
  website: string;
  frequent_flyer_program: string;
}

export interface CruiseLineRecord {
  id: string;
  name: string;
  headquarters: string;
  fleet_size: number;
  featured_ships_brazil: string[];
  departure_ports_brazil: string[];
  website: string;
  style: "Contemporâneo / Família" | "Premium" | "Ultra Luxo" | "Expedição";
}

export const GLOBAL_AIRLINES_CATALOG: AirlineRecord[] = [
  // ── BRASIL (DOMÉSTICAS & INTERNACIONAIS) ──
  {
    iata_code: "LA",
    icao_code: "TAM",
    name: "LATAM Airlines Brasil",
    country: "Brasil",
    country_code: "BR",
    alliance: "Independente",
    is_brazilian_domestic: true,
    website: "https://www.latamairlines.com",
    frequent_flyer_program: "LATAM Pass",
  },
  {
    iata_code: "G3",
    icao_code: "GLO",
    name: "GOL Linhas Aéreas",
    country: "Brasil",
    country_code: "BR",
    alliance: "Independente",
    is_brazilian_domestic: true,
    website: "https://www.voegol.com.br",
    frequent_flyer_program: "Smiles",
  },
  {
    iata_code: "AD",
    icao_code: "AZU",
    name: "Azul Linhas Aéreas Brasileiras",
    country: "Brasil",
    country_code: "BR",
    alliance: "Independente",
    is_brazilian_domestic: true,
    website: "https://www.voeazul.com.br",
    frequent_flyer_program: "Azul Fidelidade",
  },
  {
    iata_code: "2Z",
    icao_code: "PTB",
    name: "Voepass Linhas Aéreas (Passaredo)",
    country: "Brasil",
    country_code: "BR",
    alliance: "Independente",
    is_brazilian_domestic: true,
    website: "https://www.voepass.com.br",
    frequent_flyer_program: "Voepass",
  },

  // ── AMÉRICA DO SUL & CENTRAL ──
  {
    iata_code: "AR",
    icao_code: "ARG",
    name: "Aerolíneas Argentinas",
    country: "Argentina",
    country_code: "AR",
    alliance: "SkyTeam",
    is_brazilian_domestic: false,
    website: "https://www.aerolineas.com.ar",
    frequent_flyer_program: "Aerolíneas Plus",
  },
  {
    iata_code: "AV",
    icao_code: "AVA",
    name: "Avianca",
    country: "Colômbia",
    country_code: "CO",
    alliance: "Star Alliance",
    is_brazilian_domestic: false,
    website: "https://www.avianca.com",
    frequent_flyer_program: "LifeMiles",
  },
  {
    iata_code: "CM",
    icao_code: "CMP",
    name: "Copa Airlines",
    country: "Panamá",
    country_code: "PA",
    alliance: "Star Alliance",
    is_brazilian_domestic: false,
    website: "https://www.copaair.com",
    frequent_flyer_program: "ConnectMiles",
  },

  // ── AMÉRICA DO NORTE ──
  {
    iata_code: "AA",
    icao_code: "AAL",
    name: "American Airlines",
    country: "Estados Unidos",
    country_code: "US",
    alliance: "Oneworld",
    is_brazilian_domestic: false,
    website: "https://www.aa.com",
    frequent_flyer_program: "AAdvantage",
  },
  {
    iata_code: "UA",
    icao_code: "UAL",
    name: "United Airlines",
    country: "Estados Unidos",
    country_code: "US",
    alliance: "Star Alliance",
    is_brazilian_domestic: false,
    website: "https://www.united.com",
    frequent_flyer_program: "MileagePlus",
  },
  {
    iata_code: "DL",
    icao_code: "DAL",
    name: "Delta Air Lines",
    country: "Estados Unidos",
    country_code: "US",
    alliance: "SkyTeam",
    is_brazilian_domestic: false,
    website: "https://www.delta.com",
    frequent_flyer_program: "SkyMiles",
  },
  {
    iata_code: "AC",
    icao_code: "ACA",
    name: "Air Canada",
    country: "Canadá",
    country_code: "CA",
    alliance: "Star Alliance",
    is_brazilian_domestic: false,
    website: "https://www.aircanada.com",
    frequent_flyer_program: "Aeroplan",
  },

  // ── EUROPA ──
  {
    iata_code: "TP",
    icao_code: "TAP",
    name: "TAP Air Portugal",
    country: "Portugal",
    country_code: "PT",
    alliance: "Star Alliance",
    is_brazilian_domestic: false,
    website: "https://www.flytap.com",
    frequent_flyer_program: "TAP Miles&Go",
  },
  {
    iata_code: "AF",
    icao_code: "AFR",
    name: "Air France",
    country: "França",
    country_code: "FR",
    alliance: "SkyTeam",
    is_brazilian_domestic: false,
    website: "https://www.airfrance.com",
    frequent_flyer_program: "Flying Blue",
  },
  {
    iata_code: "KL",
    icao_code: "KLM",
    name: "KLM Royal Dutch Airlines",
    country: "Países Baixos",
    country_code: "NL",
    alliance: "SkyTeam",
    is_brazilian_domestic: false,
    website: "https://www.klm.com",
    frequent_flyer_program: "Flying Blue",
  },
  {
    iata_code: "IB",
    icao_code: "IBE",
    name: "Iberia Líneas Aéreas de España",
    country: "Espanha",
    country_code: "ES",
    alliance: "Oneworld",
    is_brazilian_domestic: false,
    website: "https://www.iberia.com",
    frequent_flyer_program: "Iberia Plus",
  },
  {
    iata_code: "LH",
    icao_code: "DLH",
    name: "Lufthansa",
    country: "Alemanha",
    country_code: "DE",
    alliance: "Star Alliance",
    is_brazilian_domestic: false,
    website: "https://www.lufthansa.com",
    frequent_flyer_program: "Miles & More",
  },
  {
    iata_code: "BA",
    icao_code: "BAW",
    name: "British Airways",
    country: "Reino Unido",
    country_code: "GB",
    alliance: "Oneworld",
    is_brazilian_domestic: false,
    website: "https://www.britishairways.com",
    frequent_flyer_program: "Executive Club",
  },
  {
    iata_code: "LX",
    icao_code: "SWR",
    name: "Swiss International Air Lines",
    country: "Suíça",
    country_code: "CH",
    alliance: "Star Alliance",
    is_brazilian_domestic: false,
    website: "https://www.swiss.com",
    frequent_flyer_program: "Miles & More",
  },
  {
    iata_code: "AZ",
    icao_code: "ITY",
    name: "ITA Airways (antiga Alitalia)",
    country: "Itália",
    country_code: "IT",
    alliance: "SkyTeam",
    is_brazilian_domestic: false,
    website: "https://www.ita-airways.com",
    frequent_flyer_program: "Volare",
  },

  // ── ORIENTE MÉDIO & ÁFRICA ──
  {
    iata_code: "EK",
    icao_code: "UAE",
    name: "Emirates",
    country: "Emirados Árabes Unidos",
    country_code: "AE",
    alliance: "Independente",
    is_brazilian_domestic: false,
    website: "https://www.emirates.com",
    frequent_flyer_program: "Skywards",
  },
  {
    iata_code: "QR",
    icao_code: "QTR",
    name: "Qatar Airways",
    country: "Catar",
    country_code: "QA",
    alliance: "Oneworld",
    is_brazilian_domestic: false,
    website: "https://www.qatarairways.com",
    frequent_flyer_program: "Privilege Club",
  },
  {
    iata_code: "TK",
    icao_code: "THY",
    name: "Turkish Airlines",
    country: "Turquia",
    country_code: "TR",
    alliance: "Star Alliance",
    is_brazilian_domestic: false,
    website: "https://www.turkishairlines.com",
    frequent_flyer_program: "Miles&Smiles",
  },
  {
    iata_code: "ET",
    icao_code: "ETH",
    name: "Ethiopian Airlines",
    country: "Etiópia",
    country_code: "ET",
    alliance: "Star Alliance",
    is_brazilian_domestic: false,
    website: "https://www.ethiopianairlines.com",
    frequent_flyer_program: "ShebaMiles",
  },
  {
    iata_code: "SA",
    icao_code: "SAA",
    name: "South African Airways",
    country: "África do Sul",
    country_code: "ZA",
    alliance: "Star Alliance",
    is_brazilian_domestic: false,
    website: "https://www.flysaa.com",
    frequent_flyer_program: "Voyager",
  },
];

export const GLOBAL_CRUISES_CATALOG: CruiseLineRecord[] = [
  {
    id: "msc-cruises",
    name: "MSC Cruzeiros",
    headquarters: "Genebra, Suíça",
    fleet_size: 23,
    featured_ships_brazil: [
      "MSC Grandiosa",
      "MSC Seaview",
      "MSC Preziosa",
      "MSC Armonia",
      "MSC Lirica",
    ],
    departure_ports_brazil: ["Santos (SP)", "Rio de Janeiro (RJ)", "Salvador (BA)", "Maceió (AL)", "Itajaí (SC)", "Paranaguá (PR)"],
    website: "https://www.msccruzeiros.com.br",
    style: "Contemporâneo / Família",
  },
  {
    id: "costa-cruises",
    name: "Costa Cruzeiros",
    headquarters: "Gênova, Itália",
    fleet_size: 11,
    featured_ships_brazil: [
      "Costa Diadema",
      "Costa Favolosa",
      "Costa Pacifica",
    ],
    departure_ports_brazil: ["Santos (SP)", "Rio de Janeiro (RJ)", "Salvador (BA)", "Itajaí (SC)"],
    website: "https://www.costacruzeiros.com",
    style: "Contemporâneo / Família",
  },
  {
    id: "royal-caribbean",
    name: "Royal Caribbean International",
    headquarters: "Miami, Estados Unidos",
    fleet_size: 28,
    featured_ships_brazil: [
      "Icon of the Seas (Caribe)",
      "Utopia of the Seas (Caribe)",
      "Wonder of the Seas",
      "Rhapsody of the Seas",
    ],
    departure_ports_brazil: ["Roteiros Internacionais saindo de Miami, Orlando e Caribe"],
    website: "https://www.royalcaribbean.com.br",
    style: "Contemporâneo / Família",
  },
  {
    id: "disney-cruise-line",
    name: "Disney Cruise Line",
    headquarters: "Celebration, Flórida, EUA",
    fleet_size: 6,
    featured_ships_brazil: [
      "Disney Wish",
      "Disney Treasure",
      "Disney Fantasy",
      "Disney Dream",
    ],
    departure_ports_brazil: ["Port Canaveral (Orlando)", "Fort Lauderdale", "San Juan"],
    website: "https://disneycruise.disney.go.com",
    style: "Premium",
  },
  {
    id: "norwegian-cruise-line",
    name: "Norwegian Cruise Line (NCL)",
    headquarters: "Miami, Estados Unidos",
    fleet_size: 19,
    featured_ships_brazil: [
      "Norwegian Star (Roteiro Antártica & América do Sul)",
      "Norwegian Prima",
      "Norwegian Viva",
    ],
    departure_ports_brazil: ["Rio de Janeiro (RJ)", "Buenos Aires", "Miami"],
    website: "https://www.ncl.com",
    style: "Contemporâneo / Família",
  },
  {
    id: "celebrity-cruises",
    name: "Celebrity Cruises",
    headquarters: "Miami, Estados Unidos",
    fleet_size: 16,
    featured_ships_brazil: [
      "Celebrity Equinox (América do Sul)",
      "Celebrity Beyond",
      "Celebrity Ascent",
    ],
    departure_ports_brazil: ["Rio de Janeiro (RJ)", "Buenos Aires"],
    website: "https://www.celebritycruises.com",
    style: "Premium",
  },
];
