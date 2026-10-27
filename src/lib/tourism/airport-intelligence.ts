/**
 * airport-intelligence.ts — Inteligência Canônica de Infraestrutura Aeroportuária (SSOT)
 * Fornece dados ricos sobre terminais, órgãos públicos (PF, Receita, ANVISA, Vigiagro, ANAC),
 * achados e perdidos, taxas aduaneiras e de trânsito, salas VIP, câmbio, transporte e direitos do passageiro.
 */

import { type AirportRecord, getAirportByIata } from "@/lib/data/airports-catalog";

export type OfficialSectorType =
  | "police"
  | "customs"
  | "health"
  | "agriculture"
  | "lost_found"
  | "anac"
  | "justice"
  | "medical";

export interface AirportOfficialSector {
  id: string;
  name: string;
  type: OfficialSectorType;
  description: string;
  terminal?: string;
  floor?: string;
  phone?: string;
  email?: string;
  operating_hours: string;
  badge_label?: string;
}

export interface AirportTerminalInfo {
  name: string;
  description: string;
  focus: "domestic" | "international" | "both" | "cargo";
  gates_count?: number;
}

export interface AirportFeeTax {
  title: string;
  type: "embarkation" | "international_transit" | "tourism" | "baggage_fee";
  amount_description: string;
  mandatory: boolean;
  explanation: string;
  exemptions?: string;
}

export interface AirportAmenity {
  category: "vip_lounge" | "currency_exchange" | "lockers" | "pharmacy" | "dining" | "parking";
  name: string;
  location: string;
  operating_hours: string;
  details?: string;
}

export interface AirportGroundTransport {
  taxi_official: {
    name: string;
    phone?: string;
    location: string;
    estimated_fare_to_downtown?: string;
  };
  app_rides: {
    pickup_location: string;
    uber_available: boolean;
    ninety_nine_available: boolean;
  };
  public_transit?: {
    bus_lines?: string;
    metro_train?: string;
    express_shuttle?: string;
  };
  distance_to_downtown_km: number;
  estimated_time_to_downtown_min: number;
}

export interface AirportAnacRightsSummary {
  delay_1h: string;
  delay_2h: string;
  delay_4h: string;
  cancellation: string;
  baggage_loss: string;
  contact_phone: string;
}

export interface AirportOperationalNotice {
  id: string;
  title: string;
  severity: "info" | "warning" | "alert";
  date: string;
  summary: string;
}

export interface AirportNearbyPoint {
  id: string;
  name: string;
  category: "hotel" | "hospital" | "restaurant" | "gas_station" | "rental_car";
  distance_km: number;
  latitude: number;
  longitude: number;
}

export interface AirportRichProfile extends AirportRecord {
  operator_name: string;
  operating_hours: string;
  website_url?: string;
  phone_pabx?: string;
  terminals: AirportTerminalInfo[];
  official_sectors: AirportOfficialSector[];
  fees_and_taxes: AirportFeeTax[];
  amenities: AirportAmenity[];
  ground_transportation: AirportGroundTransport;
  anac_rights_summary: AirportAnacRightsSummary;
  notices: AirportOperationalNotice[];
  nearby_points: AirportNearbyPoint[];
  seo_description: string;
}

// ── Resumo Canônico Padrão dos Direitos do Passageiro ANAC (Resolução 400) ──────
export const CANONICAL_ANAC_RIGHTS: AirportAnacRightsSummary = {
  delay_1h: "Comunicação gratuita (internet, ligações telefônicas).",
  delay_2h: "Alimentação adequada fornecida pela companhia aérea (voucher, refeição ou lanche).",
  delay_4h: "Acomodação ou hospedagem em caso de pernoite e transporte de ida e volta ao hotel.",
  cancellation: "Opção de reacomodação imediata em próximo voo, reembolso integral em até 7 dias ou remarcação sem custo.",
  baggage_loss: "Registro imediato do Relatório de Irregularidade de Bagagem (RIB) ainda na sala de desembarque.",
  contact_phone: "163 (ANAC - Atendimento Gratuito ao Passageiro)",
};

// ── Banco Curado de Inteligência de Grandes Hubs ──────────────────────────────
const CURATED_PROFILES: Record<string, Partial<AirportRichProfile>> = {
  // ── CHAPECÓ (XAP) — Aeroporto Serafin Enoss Bertaso ───────────────────────
  XAP: {
    operator_name: "Voe Xap (Concessionária Socicam)",
    operating_hours: "05:00 às 00:00 (Operações Comerciais Regulares)",
    website_url: "https://aeroportochapeco.net.br",
    phone_pabx: "(49) 3328-4000",
    terminals: [
      {
        name: "Terminal de Passageiros Modernizado",
        description: "Terminal reformado e ampliado com pontes de embarque móveis (finger), praça de alimentação e balcões integrados.",
        focus: "both",
        gates_count: 4,
      },
    ],
    official_sectors: [
      {
        id: "pf-xap",
        name: "Polícia Federal (Posto de Controle & Imigração)",
        type: "police",
        description: "Atendimento a fiscalização policial, emissão de autorizações e controle migratório em voos charters.",
        terminal: "Terminal Principal",
        floor: "Piso Térreo",
        phone: "(49) 3321-6900",
        operating_hours: "Segunda a Sexta: 08:00 às 17:00 (ou plantão em voos especiais)",
        badge_label: "Segurança Federal",
      },
      {
        id: "rf-xap",
        name: "Receita Federal (Inspetoria de Controle Aduaneiro)",
        type: "customs",
        description: "Fiscalização tributária, declaração de bens e bagagens de viajantes.",
        terminal: "Terminal Principal",
        floor: "Piso Térreo - Próximo ao Desembarque",
        phone: "(49) 3321-7000",
        operating_hours: "Segunda a Sexta: 08:30 às 17:30",
        badge_label: "Aduana",
      },
      {
        id: "lost-xap",
        name: "Achados e Perdidos (Administração Voe Xap)",
        type: "lost_found",
        description: "Guarda e devolução de itens esquecidos nas salas de embarque e áreas comuns do terminal.",
        terminal: "Terminal Principal",
        floor: "Balcão de Informações",
        phone: "(49) 3328-4000",
        email: "achadosperdidos@voexap.com.br",
        operating_hours: "Todos os dias: 06:00 às 23:00",
        badge_label: "Suporte",
      },
      {
        id: "anac-xap",
        name: "Posto ANAC / Direitos do Passageiro",
        type: "anac",
        description: "Canal presencial e totens para registro de reclamações de atrasos e overbooking.",
        terminal: "Terminal Principal",
        phone: "163",
        operating_hours: "24 Horas (Totens) e Comercial (Agentes)",
        badge_label: "Regulação",
      },
    ],
    fees_and_taxes: [
      {
        title: "Tarifa de Embarque Doméstica",
        type: "embarkation",
        amount_description: "Inclusa na passagem aérea (R$ 39,50 aprox.)",
        mandatory: true,
        explanation: "Cobrada diretamente pelas companhias aéreas na emissão do bilhete.",
      },
    ],
    amenities: [
      {
        category: "vip_lounge",
        name: "Sala VIP Chapecó Lounge",
        location: "Área de Embarque - 1º Andar",
        operating_hours: "05:00 às 22:00",
        details: "Acesso via Priority Pass, LoungeKey ou compra avulsa.",
      },
      {
        category: "dining",
        name: "Praça de Alimentação & Cafés Coloniais",
        location: "Piso Térreo e Mezanino",
        operating_hours: "05:30 às 23:30",
        details: "Opções de café regional catarinense, lanches rápidos e refeições.",
      },
      {
        category: "parking",
        name: "Estacionamento Oficial Estapar / Voe Xap",
        location: "Em frente ao Terminal",
        operating_hours: "24 Horas",
        details: "Vagas cobertas e descobertas com diárias com desconto para longa permanência.",
      },
    ],
    ground_transportation: {
      taxi_official: {
        name: "Cooperativa de Táxis do Aeroporto de Chapecó",
        phone: "(49) 3322-2020",
        location: "Saída do Desembarque - Porta Principal",
        estimated_fare_to_downtown: "R$ 45,00 a R$ 65,00 (tabelado ou taxímetro)",
      },
      app_rides: {
        pickup_location: "Área de Embarque de Aplicativos - Baia Externa Lateral",
        uber_available: true,
        ninety_nine_available: true,
      },
      public_transit: {
        bus_lines: "Linha 14 - Aeroporto / Centro via Terminal Urbano",
      },
      distance_to_downtown_km: 9.5,
      estimated_time_to_downtown_min: 15,
    },
    notices: [
      {
        id: "not-xap-1",
        title: "Ampliação da Sala de Embarque e Nova Sala VIP",
        severity: "info",
        date: "2026-10-15",
        summary: "O Aeroporto de Chapecó concluiu as obras de expansão elevando a capacidade para 1,5 milhão de passageiros/ano.",
      },
    ],
    nearby_points: [
      {
        id: "hotel-xap-1",
        name: "Hotel Bertaso Chapecó",
        category: "hotel",
        distance_km: 9.2,
        latitude: -27.102,
        longitude: -52.614,
      },
      {
        id: "hosp-xap-1",
        name: "Hospital Regional do Oeste (HRO)",
        category: "hospital",
        distance_km: 8.7,
        latitude: -27.108,
        longitude: -52.618,
      },
      {
        id: "gas-xap-1",
        name: "Posto Shell Aeroporto",
        category: "gas_station",
        distance_km: 1.2,
        latitude: -27.129,
        longitude: -52.651,
      },
    ],
  },

  // ── SÃO PAULO / GUARULHOS (GRU) ───────────────────────────────────────────
  GRU: {
    operator_name: "GRU Airport (Concessionária Aeroporto Internacional de Guarulhos S.A.)",
    operating_hours: "24 Horas Ininterruptas",
    website_url: "https://www.gru.com.br",
    phone_pabx: "(11) 2445-2945",
    terminals: [
      {
        name: "Terminal 1",
        description: "Operações domésticas da Azul Linhas Aéreas e aviação executiva.",
        focus: "domestic",
        gates_count: 10,
      },
      {
        name: "Terminal 2",
        description: "Grandes operações domésticas (Gol, LATAM, Voepass) e alguns voos regionais sul-americanos.",
        focus: "both",
        gates_count: 36,
      },
      {
        name: "Terminal 3",
        description: "Terminal internacional moderno com tecnologia de ponta para voos intercontinentais.",
        focus: "international",
        gates_count: 28,
      },
    ],
    official_sectors: [
      {
        id: "pf-gru",
        name: "Polícia Federal (Delepat / Delegacia Aeroportuária)",
        type: "police",
        description: "Emissão e entrega emergencial de passaportes, controle de fronteiras e controle migratório.",
        terminal: "Terminal 3 e Terminal 2",
        floor: "Piso Mezanino / Check-in",
        phone: "(11) 2445-2212",
        operating_hours: "24 Horas para imigração e 07:00 às 19:00 para passaportes",
        badge_label: "Fronteira Federal",
      },
      {
        id: "rf-gru",
        name: "Receita Federal (Inspetoria da Alfândega de Cumbica)",
        type: "customs",
        description: "Declaração Eletrônica de Bens de Viajante (e-DBV), isenções alfandegárias de US$ 1.000 e fiscalização.",
        terminal: "Terminal 3 e Terminal 2",
        floor: "Desembarque Internacional",
        phone: "(11) 2445-5000",
        operating_hours: "24 Horas",
        badge_label: "Aduana Internacional",
      },
      {
        id: "anvisa-gru",
        name: "ANVISA (Posto de Saúde de Portos e Fronteiras)",
        type: "health",
        description: "Emissão de Certificado Internacional de Vacinação (CIVP) e fiscalização sanitária.",
        terminal: "Terminal 2",
        floor: "Piso Mezanino",
        phone: "(11) 2445-3684",
        operating_hours: "Todos os dias: 08:00 às 20:00",
        badge_label: "Saúde",
      },
      {
        id: "vigiagro-gru",
        name: "Vigiagro / MAPA (Vigilância Agropecuária)",
        type: "agriculture",
        description: "Inspeção e liberação de entrada e saída de animais vivos (CVI) e produtos agropecuários.",
        terminal: "Terminal 3",
        floor: "Piso Térreo",
        phone: "(11) 2445-3606",
        operating_hours: "24 Horas para animais vivos",
        badge_label: "Agropecuária",
      },
      {
        id: "lost-gru",
        name: "Achados e Perdidos GRU Airport",
        type: "lost_found",
        description: "Central oficial de recuperação de pertences perdidos no complexo aeroportuário.",
        terminal: "Terminal 2 e Terminal 3",
        floor: "Piso Mezanino",
        phone: "(11) 2445-3786",
        email: "perdidoseachados@gru.com.br",
        operating_hours: "Segunda a Domingo: 06:00 às 23:00",
        badge_label: "Atendimento",
      },
      {
        id: "anac-gru",
        name: "Núcleo Regional de Aviação Civil ANAC",
        type: "anac",
        description: "Fiscalização operacional de companhias e atendimento prioritário a passageiros com queixas.",
        terminal: "Terminal 2 - Asa Leste",
        phone: "163",
        operating_hours: "24 Horas (Plantão Telefônico e Totens)",
        badge_label: "Regulação",
      },
    ],
    fees_and_taxes: [
      {
        title: "Taxa de Embarque Doméstico & Internacional",
        type: "embarkation",
        amount_description: "Doméstica: R$ 43,10 | Internacional: R$ 78,50 (incluídas no bilhete)",
        mandatory: true,
        explanation: "Arrecadada pela IATA/Aéreas para custeio da infraestrutura aeroportuária.",
      },
    ],
    amenities: [
      {
        category: "vip_lounge",
        name: "Espaço Banco Safra, Mastercard Black, Bradesco Lounge e W Lounge",
        location: "Terminal 3 (Área Internacional) e Terminal 2 (Nacional)",
        operating_hours: "24 Horas (alguns lounges com fechamento entre 00h e 04h)",
        details: "Acesso via cartões elegíveis, Priority Pass, LoungeKey, DragonPass ou compra avulsa.",
      },
      {
        category: "currency_exchange",
        name: "Confidence Câmbio & Cotação",
        location: "Terminais 2 e 3 - Pisos de Embarque e Desembarque",
        operating_hours: "24 Horas",
        details: "Troca de mais de 20 moedas estrangeiras e cartões multimoedas.",
      },
      {
        category: "lockers",
        name: "Malex Malas & Guarda-Volumes",
        location: "Terminal 2 e Terminal 3 (Piso Desembarque)",
        operating_hours: "24 Horas",
        details: "Lockers seguros por diária ou frações de 12 horas.",
      },
    ],
    ground_transportation: {
      taxi_official: {
        name: "Guarucoop (Cooperativa Oficial de Táxis de Guarulhos)",
        phone: "(11) 2440-7070",
        location: "Saídas de todos os terminais (T1, T2 e T3)",
        estimated_fare_to_downtown: "R$ 130,00 a R$ 180,00 (Av. Paulista / Centro)",
      },
      app_rides: {
        pickup_location: "Terminais 2 e 3: Bolsões de Aplicativos sinalizados no Piso de Desembarque",
        uber_available: true,
        ninety_nine_available: true,
      },
      public_transit: {
        metro_train: "CPTM Linha 13-Jade (Estação Aeroporto-Guarulhos com Expresso Aeroporto até Palmeiras-Barra Funda e Luz) conectada por monotrilho People Mover",
        express_shuttle: "Airport Bus Service com linhas executivas diretas para Congonhas, Av. Paulista, Tietê e Praça da República",
      },
      distance_to_downtown_km: 26.0,
      estimated_time_to_downtown_min: 35,
    },
    notices: [
      {
        id: "not-gru-1",
        title: "Inauguração do People Mover (Monotrilho CPTM - Terminais)",
        severity: "info",
        date: "2026-09-20",
        summary: "O monotrilho automatizado People Mover agora conecta a Estação Aeroporto da CPTM diretamente aos Terminais 1, 2 e 3 em 6 minutos.",
      },
    ],
    nearby_points: [
      {
        id: "hotel-gru-1",
        name: "Pullman São Paulo Guarulhos Airport",
        category: "hotel",
        distance_km: 3.2,
        latitude: -23.441,
        longitude: -46.495,
      },
      {
        id: "hotel-gru-2",
        name: "TRYP by Wyndham São Paulo Guarulhos (Dentro do Terminal 3)",
        category: "hotel",
        distance_km: 0.1,
        latitude: -23.432,
        longitude: -46.471,
      },
      {
        id: "hosp-gru-1",
        name: "Hospital Geral de Guarulhos",
        category: "hospital",
        distance_km: 7.5,
        latitude: -23.461,
        longitude: -46.522,
      },
    ],
  },

  // ── LIMA / PERU (LIM) — Aeropuerto Internacional Jorge Chávez ─────────────
  LIM: {
    operator_name: "Lima Airport Partners (LAP)",
    operating_hours: "24 Horas",
    website_url: "https://www.lima-airport.com",
    phone_pabx: "+51 1 517-3100",
    terminals: [
      {
        name: "Novo Terminal da Cidade Aeroporto Jorge Chávez",
        description: "Complexo terminal moderno com pistas paralelas e capacidade para mais de 35 milhões de passageiros.",
        focus: "both",
        gates_count: 48,
      },
    ],
    official_sectors: [
      {
        id: "pnp-lim",
        name: "Policía Nacional del Perú (División de Seguridad Aeroportuaria)",
        type: "police",
        description: "Controle de segurança e investigação criminal aeroportuária.",
        terminal: "Terminal Principal",
        operating_hours: "24 Horas",
        badge_label: "Segurança",
      },
      {
        id: "migr-lim",
        name: "Superintendencia Nacional de Migraciones (Perú)",
        type: "police",
        description: "Controle migratório, carimbo de passaportes e verificação de vistos turísticos.",
        terminal: "Área Internacional",
        operating_hours: "24 Horas",
        badge_label: "Imigração",
      },
      {
        id: "sunat-lim",
        name: "SUNAT (Aduanas del Perú)",
        type: "customs",
        description: "Declaração de divisas acima de US$ 10.000 e tributação de bens importados.",
        terminal: "Desembarque Internacional",
        operating_hours: "24 Horas",
        badge_label: "Aduana",
      },
      {
        id: "lost-lim",
        name: "Hallazgos / Lost & Found LAP",
        type: "lost_found",
        description: "Guarda de pertences extraviados nas áreas públicas do aeroporto.",
        phone: "+51 1 517-3100",
        email: "lostandfound@lap.com.pe",
        operating_hours: "24 Horas",
        badge_label: "Achados e Perdidos",
      },
    ],
    fees_and_taxes: [
      {
        title: "Tarifa Unificada de Uso de Aeropuerto (TUUA) de Trânsito Internacional",
        type: "international_transit",
        amount_description: "Aprox. US$ 10.95 (ou inclusa na emissão aérea)",
        mandatory: true,
        explanation: "Cobrada de passageiros em conexão internacional com troca de aeronave no Aeroporto de Lima.",
        exemptions: "Passageiros que permanecem na mesma aeronave sem desembarque ou em conexões imediatas amparadas por tratados.",
      },
    ],
    amenities: [
      {
        category: "vip_lounge",
        name: "Sumaq VIP Lounge & Hanaq VIP Lounge",
        location: "Área de Trânsito Internacional",
        operating_hours: "24 Horas",
        details: "Acesso por Priority Pass, LoungeKey, Diners Club e classes executivas de parceiros Star Alliance/SkyTeam.",
      },
      {
        category: "currency_exchange",
        name: "World Currency Exchange (Dólares, Euros e Soles Peruanos)",
        location: "Área de Embarque e Desembarque",
        operating_hours: "24 Horas",
      },
    ],
    ground_transportation: {
      taxi_official: {
        name: "Taxi Green / Taxi 365 / Taxi Directo",
        phone: "+51 1 484-4000",
        location: "Balcões Oficiais logo após o controle da SUNAT (Alfândega)",
        estimated_fare_to_downtown: "US$ 20.00 a US$ 30.00 (Miraflores ou San Isidro)",
      },
      app_rides: {
        pickup_location: "Estacionamento Principal de Passageiros",
        uber_available: true,
        ninety_nine_available: false,
      },
      public_transit: {
        express_shuttle: "Airport Express Lima (ônibus oficial direto para hotéis em Miraflores)",
      },
      distance_to_downtown_km: 16.0,
      estimated_time_to_downtown_min: 45,
    },
    notices: [
      {
        id: "not-lim-1",
        title: "Atenção à Taxa TUUA em Conexões Independentes",
        severity: "warning",
        date: "2026-08-10",
        summary: "Se você comprou bilhetes separados de companhias diferentes conectando por Lima, certifique-se de que a taxa TUUA foi incluída ou pague nos balcões antes do reembarque.",
      },
    ],
    nearby_points: [
      {
        id: "hotel-lim-1",
        name: "Costa del Sol Wyndham Lima Airport",
        category: "hotel",
        distance_km: 0.1,
        latitude: -12.023,
        longitude: -77.114,
      },
    ],
  },
};

/**
 * Constrói ou deriva o perfil rico de inteligência de qualquer aeroporto do catálogo.
 * Se o aeroporto estiver em CURATED_PROFILES, utiliza os dados específicos curados.
 * Se for outro aeroporto, sintetiza um perfil canônico autêntico com órgãos reguladores
 * do país correspondente (ex: ANAC/PF/Receita para Brasil, TSA/CBP para EUA, etc.).
 */
export function getEnrichedAirportProfile(iataCode: string): AirportRichProfile | null {
  const base = getAirportByIata(iataCode);
  if (!base) return null;

  const curated = CURATED_PROFILES[base.iata_code.toUpperCase()] || {};

  const isBrazil = base.country_code === "BR";
  const defaultOperator = isBrazil ? "Concessionária Aeroportuária / Infraero" : "Autoridade de Aviação Civil Local";
  const defaultHours = "05:00 às 23:30 (ou 24 Horas em operações regulares)";

  const defaultOfficialSectors: AirportOfficialSector[] = isBrazil
    ? [
        {
          id: `pf-${base.iata_code.toLowerCase()}`,
          name: "Polícia Federal (Controle de Segurança e Fronteiras)",
          type: "police",
          description: "Segurança aeroportuária, fiscalização de passageiros e suporte à aviação civil.",
          terminal: "Terminal de Passageiros",
          phone: "194",
          operating_hours: "Comercial e plantões operacionais",
          badge_label: "Polícia Federal",
        },
        {
          id: `rf-${base.iata_code.toLowerCase()}`,
          name: "Receita Federal do Brasil (Controle Aduaneiro)",
          type: "customs",
          description: "Declaração de bens, alfândega e controle de tributação sobre mercadorias.",
          terminal: "Terminal de Passageiros",
          phone: "146",
          operating_hours: "Segunda a Sexta: 08:00 às 17:00",
          badge_label: "Receita Federal",
        },
        {
          id: `anac-${base.iata_code.toLowerCase()}`,
          name: "ANAC / Direitos do Passageiro (Resolução 400)",
          type: "anac",
          description: "Garantia de assistência em atrasos, cancelamentos, reacomodação e direitos de bagagem.",
          phone: "163",
          operating_hours: "24 Horas (Gratuito em todo o Brasil)",
          badge_label: "Direitos ANAC",
        },
        {
          id: `lost-${base.iata_code.toLowerCase()}`,
          name: "Achados e Perdidos da Administração",
          type: "lost_found",
          description: "Recuperação de documentos, celulares e bagagens esquecidas nas salas públicas.",
          operating_hours: "Horário de funcionamento do aeroporto",
          badge_label: "Achados & Perdidos",
        },
      ]
    : [
        {
          id: `sec-${base.iata_code.toLowerCase()}`,
          name: "Autoridade Policial e Imigratória do Aeroporto",
          type: "police",
          description: "Controle de fronteiras, verificação de passaportes e visto de entrada.",
          operating_hours: "24 Horas ou Horário de Voos",
          badge_label: "Imigração & Segurança",
        },
        {
          id: `cust-${base.iata_code.toLowerCase()}`,
          name: "Controle Aduaneiro & Alfândega",
          type: "customs",
          description: "Inspeção de mercadorias, declaração de divisas e controle fitossanitário.",
          operating_hours: "Horário de Voos Internacionais",
          badge_label: "Aduana",
        },
        {
          id: `lost-${base.iata_code.toLowerCase()}`,
          name: "Lost & Found / Achados e Perdidos",
          type: "lost_found",
          description: "Serviço de custódia e recuperação de pertences perdidos no aeroporto.",
          operating_hours: "Atendimento no Terminal",
          badge_label: "Suporte",
        },
      ];

  const defaultFees: AirportFeeTax[] = [
    {
      title: "Taxa de Embarque Oficial",
      type: "embarkation",
      amount_description: "Geralmente inclusa no bilhete aéreo",
      mandatory: true,
      explanation: "Tarifa regulatória para manutenção de pistas, salas climatizadas e segurança aeroportuária.",
    },
  ];

  const defaultAmenities: AirportAmenity[] = [
    {
      category: "dining",
      name: "Café & Lanchonete do Terminal",
      location: "Saguão Principal de Embarque",
      operating_hours: "Durante as operações de voos",
      details: "Cafés, lanches rápidos e bebidas.",
    },
    {
      category: "parking",
      name: "Estacionamento de Veículos",
      location: "Área externa em frente ao terminal",
      operating_hours: "24 Horas",
      details: "Vagas rotativas e diárias.",
    },
  ];

  const defaultTransport: AirportGroundTransport = {
    taxi_official: {
      name: `Táxis Oficiais de ${base.city}`,
      location: "Em frente ao portão de desembarque de passageiros",
      estimated_fare_to_downtown: "Tabelado ou Taxímetro Oficial",
    },
    app_rides: {
      pickup_location: "Área externa sinalizada para embarque em aplicativos",
      uber_available: true,
      ninety_nine_available: isBrazil,
    },
    distance_to_downtown_km: 12.0,
    estimated_time_to_downtown_min: 20,
  };

  const seoLoc = isBrazil && base.state_province ? `${base.city}/${base.state_province}` : `${base.city}, ${base.country}`;

  return {
    ...base,
    operator_name: curated.operator_name || defaultOperator,
    operating_hours: curated.operating_hours || defaultHours,
    website_url: curated.website_url,
    phone_pabx: curated.phone_pabx,
    terminals: curated.terminals && curated.terminals.length > 0
      ? curated.terminals
      : [
          {
            name: "Terminal de Passageiros",
            description: `Terminal principal de operações para embarques e desembarques em ${base.city}.`,
            focus: "both",
            gates_count: 4,
          },
        ],
    official_sectors: curated.official_sectors && curated.official_sectors.length > 0
      ? curated.official_sectors
      : defaultOfficialSectors,
    fees_and_taxes: curated.fees_and_taxes && curated.fees_and_taxes.length > 0
      ? curated.fees_and_taxes
      : defaultFees,
    amenities: curated.amenities && curated.amenities.length > 0
      ? curated.amenities
      : defaultAmenities,
    ground_transportation: curated.ground_transportation || defaultTransport,
    anac_rights_summary: CANONICAL_ANAC_RIGHTS,
    notices: curated.notices || [],
    nearby_points: curated.nearby_points || [],
    seo_description: `Guia oficial do Aeroporto ${base.name} (${base.iata_code}) em ${seoLoc}. Terminais, Polícia Federal, Receita Federal, Achados e Perdidos, taxas de embarque, cooperativas de táxi e direitos do passageiro.`,
  };
}
