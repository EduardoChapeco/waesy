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
  { id: "airplane", label: "✈️ Avião" },
  { id: "bus", label: "🚌 Ônibus / Van" },
  { id: "cruise", label: "🚢 Cruzeiro" },
  { id: "train", label: "🚂 Trem / Metrô" },
  { id: "car", label: "🚗 Carro Próprio / Alugado" },
  { id: "combo", label: "🔄 Combinado (Voo + Ônibus)" },
];
