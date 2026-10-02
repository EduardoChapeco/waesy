/**
 * @fileoverview MANIFESTO CANÔNICO DE VERTICAIS DE NEGÓCIO (Plano 5 — S10)
 * Estabelece as fronteiras explícitas, tabelas de banco, contratos BFF e regras de governança
 * para as 7 verticais de negócio do ecossistema Waesy.
 *
 * Invariante S10: Nenhuma funcionalidade de vertical pode existir sem estar registrada neste manifesto.
 */

export type CanonicalVerticalId =
  | "tourism"
  | "retail"
  | "market_perishables"
  | "services_specialists"
  | "real_estate"
  | "automotive"
  | "digital_products";

export interface VerticalModuleManifest {
  id: CanonicalVerticalId;
  name: string;
  tagline: string;
  regulatoryBody: string;
  legalDocument: string;
  enabledArchetypes: string[];
  defaultArchetype: string;
  componentRoot: string;
  routePrefixes: string[];
  servicePatterns: string[];
  databaseTables: string[];
  securityInvariants: string[];
  taxRegimeCompliance: {
    lawBasis: string;
    vatTreatment: "standard" | "reduced_60_pct" | "simplified_nfc" | "iss_direct";
    requiresTechnicalLead: boolean;
  };
}

export const CANONICAL_VERTICAL_MANIFESTS: Record<CanonicalVerticalId, VerticalModuleManifest> = {
  tourism: {
    id: "tourism",
    name: "Turismo & Viagens",
    tagline: "Pacotes, bilhética aérea, hotelaria e roteiros turísticos homologados",
    regulatoryBody: "Cadastur / Ministério do Turismo (MTur)",
    legalDocument: "Voucher / Contrato Embratur",
    enabledArchetypes: ["A07", "A08", "A10", "A13", "A04", "A15"],
    defaultArchetype: "A07",
    componentRoot: "src/components/tourism",
    routePrefixes: [
      "workspace.turismo",
      "_store.viagens",
      "workspace.eventos",
    ],
    servicePatterns: [
      "travel-",
      "tourism-",
      "destination-",
      "group-tours",
    ],
    databaseTables: [
      "travel_packages",
      "travel_proposals",
      "travel_bookings",
      "flight_quotes",
      "hotel_inventory",
      "tourism_transfers",
    ],
    securityInvariants: [
      "RLS estrito isolado por store_id com deny-by-default",
      "Viajantes titulares e acompanhantes protegidos sob LGPD Art. 7",
      "Emissão de voucher embratur vinculada ao comprovante financeiro autenticado",
    ],
    taxRegimeCompliance: {
      lawBasis: "EC 132/2023 Art. 9º (Regime Diferenciado de Turismo)",
      vatTreatment: "reduced_60_pct",
      requiresTechnicalLead: false,
    },
  },

  retail: {
    id: "retail",
    name: "Varejo & Comércio",
    tagline: "Venda de produtos físicos, controle de grade, estoque e checkout omnicanal",
    regulatoryBody: "Inmetro / Procon / Código de Defesa do Consumidor",
    legalDocument: "Danfe NF-e",
    enabledArchetypes: ["A01", "A02", "A03", "A04", "A06"],
    defaultArchetype: "A01",
    componentRoot: "src/components/commerce",
    routePrefixes: [
      "workspace.catalogo",
      "workspace.pedidos",
      "workspace.estoque",
      "_store.produtos",
    ],
    servicePatterns: [
      "order.",
      "product.",
      "wms.",
      "canonical-catalog",
      "checkout.",
    ],
    databaseTables: [
      "products",
      "orders",
      "order_items",
      "stock_movements",
      "product_variations",
      "inventory_items",
    ],
    securityInvariants: [
      "Atualizações de estoque via mutação transacional com ledger imutável",
      "Cálculo de parcelamento estritamente pelo Dono Único (R21)",
      "Proteção de dados fiscais (NCM/CFOP) contra manipulação cliente",
    ],
    taxRegimeCompliance: {
      lawBasis: "Lei Complementar 123/2006 e EC 132/2023",
      vatTreatment: "standard",
      requiresTechnicalLead: false,
    },
  },

  market_perishables: {
    id: "market_perishables",
    name: "Mercado & Perecíveis",
    tagline: "Hortifrúti, açougue, perecíveis com peso/fração e venda rápida de balcão",
    regulatoryBody: "Anvisa / MAPA / Procon",
    legalDocument: "Cupom NFC-e",
    enabledArchetypes: ["A01", "A04", "A14", "A03", "A06"],
    defaultArchetype: "A14",
    componentRoot: "src/components/pos",
    routePrefixes: [
      "workspace.pos",
      "workspace.cozinha",
      "workspace.balcao",
    ],
    servicePatterns: [
      "pos.",
      "food-",
      "courier-",
      "quick-order",
    ],
    databaseTables: [
      "pos_orders",
      "pos_sessions",
      "kds_tickets",
      "delivery_dispatches",
      "product_modifiers",
    ],
    securityInvariants: [
      "Sessões de caixa com fechamento cego e conciliação física",
      "Bloqueio de vendas abaixo do peso mínimo regulatório de balança",
      "PIN de entrega MotoLink obrigatório no momento do recebimento",
    ],
    taxRegimeCompliance: {
      lawBasis: "Decreto Estadual de NFC-e e Isenção de Cesta Básica Nacional",
      vatTreatment: "simplified_nfc",
      requiresTechnicalLead: false,
    },
  },

  services_specialists: {
    id: "services_specialists",
    name: "Serviços & Especialistas",
    tagline: "Agendamento de horas, consultas técnicas, emissão de OS e orçamentos",
    regulatoryBody: "Conselhos Regionais de Classe / Prefeituras Municipais",
    legalDocument: "Ordem de Serviço (OS) / NFS-e",
    enabledArchetypes: ["A07", "A08", "A09", "A15", "A04", "A06"],
    defaultArchetype: "A08",
    componentRoot: "src/components/commercial",
    routePrefixes: [
      "workspace.agenda",
      "workspace.servicos",
      "workspace.orcamentos",
    ],
    servicePatterns: [
      "booking-",
      "service-orders",
      "agenda-",
      "contracts.",
    ],
    databaseTables: [
      "service_orders",
      "appointments",
      "specialist_schedules",
      "contracts",
      "quotes",
    ],
    securityInvariants: [
      "Horários de agenda protegidos contra overbooking com trava transacional",
      "Assinatura digital com hash SHA-256 e IP de auditoria",
      "Sigilo profissional de dados de atendimento e laudos",
    ],
    taxRegimeCompliance: {
      lawBasis: "Lei Complementar 116/2003 (ISSQN Municipal)",
      vatTreatment: "iss_direct",
      requiresTechnicalLead: true,
    },
  },

  real_estate: {
    id: "real_estate",
    name: "Imóveis & Real Estate",
    tagline: "Locação residencial/comercial, venda de alto valor e gestão de corretores",
    regulatoryBody: "CRECI / Sistema Cofeci-Creci",
    legalDocument: "Contrato de Locação / Escritura / Dossiê Imobiliário",
    enabledArchetypes: ["A10", "A11", "A12", "A09"],
    defaultArchetype: "A12",
    componentRoot: "src/components/classifieds",
    routePrefixes: [
      "workspace.imoveis",
      "_store.imoveis",
      "workspace.contratos",
    ],
    servicePatterns: [
      "classifieds-",
      "property-",
      "rental-",
    ],
    databaseTables: [
      "classified_listings",
      "property_dossiers",
      "rental_contracts",
      "broker_licenses",
    ],
    securityInvariants: [
      "Exigência de validação de número de CRECI ativo do corretor responsável",
      "Contratos de locação com custódia de garantias (caução/fiança)",
      "Dossiê fotográfico prévio de vistoria com carimbo de data/hora imutável",
    ],
    taxRegimeCompliance: {
      lawBasis: "Lei do Inquilinato (Lei 8.245/1991)",
      vatTreatment: "standard",
      requiresTechnicalLead: true,
    },
  },

  automotive: {
    id: "automotive",
    name: "Veículos & Automotivo",
    tagline: "Compra, venda, locação de frotas e serviços mecânicos com CRLV",
    regulatoryBody: "Detran / Secretaria Nacional de Trânsito (Senatran)",
    legalDocument: "CRLV / Contrato de Locação Veicular",
    enabledArchetypes: ["A10", "A12", "A04", "A06", "A11"],
    defaultArchetype: "A12",
    componentRoot: "src/components/commercial",
    routePrefixes: [
      "workspace.veiculos",
      "_store.veiculos",
    ],
    servicePatterns: [
      "vehicle-",
      "fleet-",
      "deal-",
    ],
    databaseTables: [
      "vehicle_inventory",
      "fleet_assets",
      "vehicle_inspections",
      "traffic_fines",
    ],
    securityInvariants: [
      "Validação de chassi e placa contra padrões Renavam vigentes",
      "Registro de termo de vistoria com quilometragem e nível de combustível",
      "Segregação de responsabilidade civil em locações ativas",
    ],
    taxRegimeCompliance: {
      lawBasis: "Código de Trânsito Brasileiro (Lei 9.503/1997)",
      vatTreatment: "standard",
      requiresTechnicalLead: false,
    },
  },

  digital_products: {
    id: "digital_products",
    name: "Produtos Digitais & Infoprodutos",
    tagline: "Cursos, softwares, licenças digitais, vouchers e acesso a comunidades",
    regulatoryBody: "Código de Defesa do Consumidor (Art. 49) / ABED",
    legalDocument: "Chave Serial / Voucher de Acesso Digital",
    enabledArchetypes: ["A05", "A06", "A03", "A13"],
    defaultArchetype: "A05",
    componentRoot: "src/components/commerce",
    routePrefixes: [
      "workspace.digitais",
      "_store.digitais",
    ],
    servicePatterns: [
      "digital-",
      "license-",
      "serial-",
    ],
    databaseTables: [
      "digital_licenses",
      "serial_keys",
      "digital_downloads",
      "community_access_passes",
    ],
    securityInvariants: [
      "Entrega automatizada instantânea pós-confirmação via webhook PIX/Cartão",
      "Tokens de download temporários de 1 uso com expiração criptográfica",
      "Revogação instantânea de licença em caso de chargeback ou cancelamento no prazo CDC",
    ],
    taxRegimeCompliance: {
      lawBasis: "Marco Civil da Internet (Lei 12.965/2014) e LC 116/2003",
      vatTreatment: "iss_direct",
      requiresTechnicalLead: false,
    },
  },
};

/**
 * Retorna o manifesto da vertical informada. Lança erro descritivo se a vertical for desconhecida.
 */
export function getVerticalManifest(verticalId: string): VerticalModuleManifest {
  const manifest = CANONICAL_VERTICAL_MANIFESTS[verticalId as CanonicalVerticalId];
  if (!manifest) {
    throw new Error(`[S10] Vertical não reconhecida: "${verticalId}". Verticais homologadas: ${Object.keys(CANONICAL_VERTICAL_MANIFESTS).join(", ")}`);
  }
  return manifest;
}

/**
 * Validador de fronteiras das verticais: comprova que não existem arquétipos orfãos ou colisões de rotas.
 */
export function validateVerticalBoundaries(): {
  isValid: boolean;
  totalVerticals: number;
  archetypeCoverage: Record<string, string[]>;
  tableCoverage: Record<string, string>;
} {
  const archetypeCoverage: Record<string, string[]> = {};
  const tableCoverage: Record<string, string> = {};

  for (const [id, manifest] of Object.entries(CANONICAL_VERTICAL_MANIFESTS)) {
    // Checa arquétipos
    for (const arc of manifest.enabledArchetypes) {
      if (!archetypeCoverage[arc]) archetypeCoverage[arc] = [];
      archetypeCoverage[arc].push(id);
    }

    // Checa tabelas
    for (const table of manifest.databaseTables) {
      tableCoverage[table] = id;
    }
  }

  return {
    isValid: Object.keys(CANONICAL_VERTICAL_MANIFESTS).length === 7,
    totalVerticals: Object.keys(CANONICAL_VERTICAL_MANIFESTS).length,
    archetypeCoverage,
    tableCoverage,
  };
}
