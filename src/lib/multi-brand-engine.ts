/**
 * multi-brand-engine.ts — Motor Canônico de Ecossistema Multi-Marca, Verticais & Desacoplamento de Marketplace
 *
 * Princípio Fundamental:
 * Single Core Engine (Núcleo Único), Multi-Brand Experience (Múltiplas Marcas Soberanas).
 * Qualquer evolução em RH, DP, GED, Financeiro, Caixa, Contratos, CRM, BOM e IA propaga-se
 * instantaneamente para todas as verticais sem duplicação de código.
 *
 * Especificação: docs/specs/SPEC-MULTI-BRAND-VERTICAL-ECOSYSTEM.md
 */

import type { NicheId, NicheModuleKey, NicheEntityNomenclature } from "./niches/niche-manifest";

export type BrandVerticalId =
  | "waesy"
  | "wowbook"
  | "tableway"
  | "turis"
  | "passhub"
  | "lexcloud"
  | "talentlink"
  | "omnipage"
  | "signflow"
  | "waesy_news"
  | "waesy_copilot"
  | "waesy_studio";

export type SubscriptionTierId = "starter" | "pro" | "enterprise";

export interface BrandEntityNomenclature {
  itemSingular: string;
  itemPlural: string;
  orderSingular: string;
  orderPlural: string;
  customerSingular: string;
  customerPlural: string;
  leadSingular?: string;
  leadPlural?: string;
  quoteSingular?: string;
  quotePlural?: string;
  proposalSingular?: string;
  proposalPlural?: string;
  resourceSingular?: string;
  resourcePlural?: string;
  catalogLabel?: string;
  newItemLabel?: string;
  primaryMetricLabel?: string;
  secondaryMetricLabel?: string;
}

export interface BrandVerticalConfig {
  id: BrandVerticalId;
  brandName: string;
  shortName: string;
  tagline: string;
  primaryDomain: string;
  hostPatterns: string[];
  primaryNiche: NicheId;
  targetSegments: string[];
  defaultModules: NicheModuleKey[];
  nomenclature: BrandEntityNomenclature;
  referenceBenchmarks: string[];
  isStandaloneSaas: boolean;
  defaultPublishToMarketplace: boolean;
}

export interface SubscriptionTierConfig {
  id: SubscriptionTierId;
  name: string;
  tagline: string;
  badgeLabel: string;
  includedModules: string[];
  allowsAllModules?: boolean;
}

export interface StoreEntitlementInput {
  subscription_tier?: string | null;
  brand_origin?: string | null;
  enabled_modules?: string[] | null;
  publish_to_marketplace?: boolean | null;
  waesy_marketplace_enabled?: boolean | null;
  settings?: Record<string, any> | null;
}

export const SUBSCRIPTION_TIERS_REGISTRY: Record<SubscriptionTierId, SubscriptionTierConfig> = {
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "Operação Rápida: Catálogo digital, recebimento PIX e atendimento imediato.",
    badgeLabel: "Starter",
    includedModules: [
      "catalog",
      "orders",
      "reservations",
      "crm",
      "support",
      "marketing",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "Gestão & Equipe: Controle de caixa, estoque automático, comissões e contratos.",
    badgeLabel: "Pro",
    includedModules: [
      "catalog",
      "orders",
      "kds",
      "tables",
      "reservations",
      "crm",
      "proposals",
      "quotes",
      "contracts",
      "financial",
      "tasks",
      "support",
      "inventory",
      "marketing",
      "affiliates",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Operação Completa & Automação: RH digital, BOM multi-nicho, IA autônoma e multi-filiais.",
    badgeLabel: "Enterprise",
    includedModules: [
      "catalog",
      "orders",
      "kds",
      "tables",
      "reservations",
      "crm",
      "proposals",
      "quotes",
      "boarding",
      "fleet",
      "contracts",
      "financial",
      "tasks",
      "support",
      "inventory",
      "marketing",
      "affiliates",
      "couriers",
      "simlab",
      "hr",
      "payroll",
      "ged",
      "copilot",
      "fiscal",
    ],
    allowsAllModules: true,
  },
};

export const BRAND_VERTICALS_REGISTRY: Record<BrandVerticalId, BrandVerticalConfig> = {
  waesy: {
    id: "waesy",
    brandName: "Waesy",
    shortName: "Waesy",
    tagline: "Marketplace Local, Classificados & Descoberta Urbana",
    primaryDomain: "waesy.com.br",
    hostPatterns: ["waesy.com.br", "www.waesy.com.br", "usewaesy.com", "usewaesy.pages.dev"],
    primaryNiche: "generic",
    targetSegments: ["Comércio Local", "Classificados", "Serviços Urbanos", "Mobilidade"],
    defaultModules: ["catalog", "orders", "crm", "financial", "marketing", "support"],
    nomenclature: {
      itemSingular: "Produto",
      itemPlural: "Produtos",
      orderSingular: "Pedido",
      orderPlural: "Pedidos",
      customerSingular: "Cliente",
      customerPlural: "Clientes",
      leadSingular: "Oportunidade",
      leadPlural: "Oportunidades",
      quoteSingular: "Orçamento",
      quotePlural: "Orçamentos",
      proposalSingular: "Proposta",
      proposalPlural: "Propostas",
      resourceSingular: "Recurso",
      resourcePlural: "Recursos",
    },
    referenceBenchmarks: ["Mercado Livre Local", "iFood", "OLX"],
    isStandaloneSaas: false,
    defaultPublishToMarketplace: true,
  },

  wowbook: {
    id: "wowbook",
    brandName: "WowBook",
    shortName: "WowBook",
    tagline: "Sistema Especializado para Barbearias, Salões, Estética & Consultórios",
    primaryDomain: "wowbook.com.br",
    hostPatterns: ["wowbook.com.br", "wowbook.", "app.wowbook"],
    primaryNiche: "healthcare",
    targetSegments: ["Barbearias", "Salões de Beleza", "Spas", "Clínicas de Estética", "Consultórios", "Terapeutas"],
    defaultModules: ["reservations", "catalog", "crm", "financial", "contracts", "inventory", "marketing", "tasks"],
    nomenclature: {
      itemSingular: "Procedimento",
      itemPlural: "Procedimentos & Serviços",
      orderSingular: "Atendimento",
      orderPlural: "Atendimentos",
      customerSingular: "Paciente / Cliente",
      customerPlural: "Pacientes & Clientes",
      leadSingular: "Interessado",
      leadPlural: "Interessados",
      quoteSingular: "Avaliação",
      quotePlural: "Avaliações",
      proposalSingular: "Plano de Tratamento",
      proposalPlural: "Planos de Tratamento",
      resourceSingular: "Profissional / Sala",
      resourcePlural: "Profissionais & Salas",
    },
    referenceBenchmarks: ["Belasis", "Trinks", "Avec", "Doctoralia"],
    isStandaloneSaas: true,
    defaultPublishToMarketplace: false,
  },

  tableway: {
    id: "tableway",
    brandName: "TableWay",
    shortName: "TableWay",
    tagline: "Gestão Gastronômica, Cardápio QR, KDS de Cozinha, Mesas & Delivery",
    primaryDomain: "tableway.com.br",
    hostPatterns: ["tableway.com.br", "tableway.", "app.tableway"],
    primaryNiche: "gastronomy",
    targetSegments: ["Restaurantes", "Pizzarias", "Hamburguerias", "Bares", "Cafeterias", "Dark Kitchens"],
    defaultModules: ["catalog", "orders", "kds", "tables", "inventory", "couriers", "financial", "crm", "marketing"],
    nomenclature: {
      itemSingular: "Prato / Item",
      itemPlural: "Cardápio & Bebidas",
      orderSingular: "Pedido / Comanda",
      orderPlural: "Pedidos & Comandas",
      customerSingular: "Cliente",
      customerPlural: "Clientes",
      leadSingular: "Reserva de Mesa",
      leadPlural: "Reservas de Mesa",
      quoteSingular: "Evento Gastronômico",
      quotePlural: "Eventos Gastronômicos",
      proposalSingular: "Menu Fechado",
      proposalPlural: "Menus Fechados",
      resourceSingular: "Mesa",
      resourcePlural: "Mesas & Ambientes",
    },
    referenceBenchmarks: ["iFood Gestor", "Saipos", "Totvs Chef", "Anota AI"],
    isStandaloneSaas: true,
    defaultPublishToMarketplace: false,
  },

  turis: {
    id: "turis",
    brandName: "Turis",
    shortName: "Turis",
    tagline: "Sistema Operacional para Agências de Viagens, Operadoras & Receptivo",
    primaryDomain: "turis.com.br",
    hostPatterns: ["turis.com.br", "turis.", "app.turis"],
    primaryNiche: "tourism",
    targetSegments: ["Agências de Viagens", "Operadoras de Turismo", "Turismo Receptivo", "Fretamento", "Excursões"],
    defaultModules: ["quotes", "proposals", "boarding", "fleet", "catalog", "orders", "contracts", "crm", "financial", "affiliates"],
    nomenclature: {
      itemSingular: "Roteiro / Pacote",
      itemPlural: "Roteiros & Pacotes",
      orderSingular: "Reserva de Viagem",
      orderPlural: "Reservas & Vouchers",
      customerSingular: "Passageiro / Viajante",
      customerPlural: "Passageiros",
      leadSingular: "Cotação de Viagem",
      leadPlural: "Funil de Cotações",
      quoteSingular: "Cotação",
      quotePlural: "Cotações",
      proposalSingular: "Proposta Visual",
      proposalPlural: "Propostas Visuais",
      resourceSingular: "Veículo / Poltrona",
      resourcePlural: "Frota & Embarques",
    },
    referenceBenchmarks: ["InfoTravel", "Monde", "Reserve"],
    isStandaloneSaas: true,
    defaultPublishToMarketplace: false,
  },

  passhub: {
    id: "passhub",
    brandName: "PassHub",
    shortName: "PassHub",
    tagline: "Plataforma de Eventos, Lotes de Ingressos, Check-in QR & Promoters",
    primaryDomain: "passhub.com.br",
    hostPatterns: ["passhub.com.br", "passhub.", "app.passhub"],
    primaryNiche: "events",
    targetSegments: ["Produtoras de Shows", "Teatros", "Conferências", "Feiras", "Casas Noturnas"],
    defaultModules: ["catalog", "orders", "affiliates", "financial", "crm", "marketing", "contracts"],
    nomenclature: {
      itemSingular: "Evento / Lote",
      itemPlural: "Eventos & Ingressos",
      orderSingular: "Ingresso Emitido",
      orderPlural: "Ingressos & Bilheteria",
      customerSingular: "Participante",
      customerPlural: "Participantes",
      leadSingular: "Interessado VIP",
      leadPlural: "Lista VIP",
      quoteSingular: "Cota de Patrocínio",
      quotePlural: "Cotas de Patrocínio",
      proposalSingular: "Proposta de Evento",
      proposalPlural: "Propostas de Eventos",
      resourceSingular: "Setor / Camarote",
      resourcePlural: "Setores & Portaria",
    },
    referenceBenchmarks: ["Sympla", "Eventbrite", "Ingresse"],
    isStandaloneSaas: true,
    defaultPublishToMarketplace: false,
  },

  lexcloud: {
    id: "lexcloud",
    brandName: "LexCloud",
    shortName: "LexCloud",
    tagline: "Gestão Jurídica, Dossiê GED, Prazos Processuais & Assinatura Biométrica",
    primaryDomain: "lexcloud.com.br",
    hostPatterns: ["lexcloud.com.br", "lexcloud.", "app.lexcloud"],
    primaryNiche: "services",
    targetSegments: ["Escritórios de Advocacia", "Departamentos Jurídicos", "Compliance", "Auditorias"],
    defaultModules: ["contracts", "crm", "tasks", "financial", "proposals", "reservations", "support"],
    nomenclature: {
      itemSingular: "Serviço Jurídico",
      itemPlural: "Honorários & Áreas",
      orderSingular: "Processo / Caso",
      orderPlural: "Processos & Casos",
      customerSingular: "Constituinte / Cliente",
      customerPlural: "Clientes & Partes",
      leadSingular: "Consulta Inicial",
      leadPlural: "Triagem Jurídica",
      quoteSingular: "Estimativa de Honorários",
      quotePlural: "Estimativas de Honorários",
      proposalSingular: "Contrato de Honorários",
      proposalPlural: "Contratos de Honorários",
      resourceSingular: "Advogado / Diligência",
      resourcePlural: "Prazos & Diligências",
    },
    referenceBenchmarks: ["Astrea", "ProJuris", "LegalOne"],
    isStandaloneSaas: true,
    defaultPublishToMarketplace: false,
  },

  talentlink: {
    id: "talentlink",
    brandName: "TalentLink",
    shortName: "TalentLink",
    tagline: "Recrutamento ATS, Admissão Digital 100% Sem Papel, Ponto & Compliance CLT",
    primaryDomain: "talentlink.com.br",
    hostPatterns: ["talentlink.com.br", "talentlink.", "app.talentlink"],
    primaryNiche: "services",
    targetSegments: ["Agências de RH", "Headhunters", "Departamento Pessoal", "Empresas Empregadoras"],
    defaultModules: ["crm", "contracts", "tasks", "financial", "support"],
    nomenclature: {
      itemSingular: "Vaga Aberta",
      itemPlural: "Vagas & Posições",
      orderSingular: "Processo Admissional",
      orderPlural: "Admissões Digitais",
      customerSingular: "Candidato / Colaborador",
      customerPlural: "Talentos & Colaboradores",
      leadSingular: "Currículo Recebido",
      leadPlural: "Banco de Talentos",
      quoteSingular: "Proposta Salarial",
      quotePlural: "Propostas Salariais",
      proposalSingular: "Carta Oferta",
      proposalPlural: "Cartas Oferta",
      resourceSingular: "Recrutador",
      resourcePlural: "Equipe de RH",
    },
    referenceBenchmarks: ["Gupy", "Sólides", "Kenoby"],
    isStandaloneSaas: true,
    defaultPublishToMarketplace: false,
  },

  omnipage: {
    id: "omnipage",
    brandName: "OmniPage",
    shortName: "OmniPage",
    tagline: "Construtor Visual de Sites, Landing Pages de Alta Conversão & BioLinks",
    primaryDomain: "omnipage.com.br",
    hostPatterns: ["omnipage.com.br", "omnipage.", "app.omnipage"],
    primaryNiche: "creator",
    targetSegments: ["Profissionais Liberais", "Criadores Digitais", "Infoprodutores", "Negócios Locais"],
    defaultModules: ["marketing", "catalog", "crm", "affiliates", "financial"],
    nomenclature: {
      itemSingular: "Página / Oferta",
      itemPlural: "Páginas & BioLinks",
      orderSingular: "Conversão",
      orderPlural: "Conversões & Vendas",
      customerSingular: "Visitante / Lead",
      customerPlural: "Audiência & Leads",
      leadSingular: "Lead Capturado",
      leadPlural: "Leads Capturados",
      quoteSingular: "Briefing",
      quotePlural: "Briefings",
      proposalSingular: "Mídia Kit",
      proposalPlural: "Mídia Kits",
      resourceSingular: "Template",
      resourcePlural: "Templates",
    },
    referenceBenchmarks: ["Linktree", "Wix Studio", "Framer"],
    isStandaloneSaas: true,
    defaultPublishToMarketplace: false,
  },

  signflow: {
    id: "signflow",
    brandName: "SignFlow",
    shortName: "SignFlow",
    tagline: "Assinatura Eletrônica Biométrica, Gestão de Contratos & Dossiê ICP-Brasil",
    primaryDomain: "signflow.com.br",
    hostPatterns: ["signflow.com.br", "signflow.", "app.signflow"],
    primaryNiche: "services",
    targetSegments: ["Imobiliárias", "Contabilidades", "Financeiras", "Empresas em Geral"],
    defaultModules: ["contracts", "crm", "financial", "tasks"],
    nomenclature: {
      itemSingular: "Minuta / Modelo",
      itemPlural: "Modelos de Documento",
      orderSingular: "Envelope de Assinatura",
      orderPlural: "Documentos & Vias",
      customerSingular: "Signatário",
      customerPlural: "Signatários",
      leadSingular: "Solicitação de Assinatura",
      leadPlural: "Fila de Assinaturas",
      quoteSingular: "Validação",
      quotePlural: "Validações",
      proposalSingular: "Instrumento Particular",
      proposalPlural: "Instrumentos Particulares",
      resourceSingular: "Certificado",
      resourcePlural: "Cofre de Certificados",
    },
    referenceBenchmarks: ["DocuSign", "Clicksign", "ZapSign"],
    isStandaloneSaas: true,
    defaultPublishToMarketplace: false,
  },

  waesy_news: {
    id: "waesy_news",
    brandName: "Waesy News 360",
    shortName: "News 360",
    tagline: "CMS Editorial para Portais de Notícias, Colunistas & Ad Server Regional",
    primaryDomain: "news.waesy.com.br",
    hostPatterns: ["news.waesy.com.br", "waesynews.com.br", "portal."],
    primaryNiche: "creator",
    targetSegments: ["Jornais Locais", "Portais de Notícias", "Rádios", "Mídia Independente"],
    defaultModules: ["marketing", "crm", "financial", "affiliates", "tasks"],
    nomenclature: {
      itemSingular: "Matéria / Artigo",
      itemPlural: "Matérias & Edições",
      orderSingular: "Inserção Publicitária",
      orderPlural: "Campanhas & Patrocínios",
      customerSingular: "Leitor / Assinante",
      customerPlural: "Leitores & Anunciantes",
      leadSingular: "Pauta / Denúncia",
      leadPlural: "Redação & Pautas",
      quoteSingular: "Proposta Comercial",
      quotePlural: "Propostas de Mídia",
      proposalSingular: "Plano de Patrocínio",
      proposalPlural: "Planos de Patrocínio",
      resourceSingular: "Jornalista / Colunista",
      resourcePlural: "Equipe Editorial",
    },
    referenceBenchmarks: ["WordPress VIP", "Ghost", "Substack"],
    isStandaloneSaas: true,
    defaultPublishToMarketplace: true,
  },

  waesy_copilot: {
    id: "waesy_copilot",
    brandName: "Waesy Copilot",
    shortName: "Copilot",
    tagline: "Orquestrador Multi-Agente, Computador Cloud & Automação Executiva",
    primaryDomain: "copilot.waesy.com.br",
    hostPatterns: ["copilot.waesy.com.br", "ai.waesy.com.br", "manus.waesy"],
    primaryNiche: "generic",
    targetSegments: ["Executivos", "Analistas", "Equipes de Operações", "Pesquisa de Mercado"],
    defaultModules: ["tasks", "crm", "simlab", "marketing", "financial"],
    nomenclature: {
      itemSingular: "Habilidade / Skill",
      itemPlural: "Habilidades & Conectores",
      orderSingular: "Missão Autônoma",
      orderPlural: "Missões & Execuções",
      customerSingular: "Operador",
      customerPlural: "Operadores",
      leadSingular: "Alvo Minerado",
      leadPlural: "Base Minerada",
      quoteSingular: "Simulação",
      quotePlural: "Simulações",
      proposalSingular: "Artefato Produzido",
      proposalPlural: "Artefatos Produzidos",
      resourceSingular: "Agente Cloud",
      resourcePlural: "Cluster de Agentes",
    },
    referenceBenchmarks: ["Manus.im", "Devin", "Perplexity Pro"],
    isStandaloneSaas: true,
    defaultPublishToMarketplace: false,
  },

  waesy_studio: {
    id: "waesy_studio",
    brandName: "Waesy Studio Business",
    shortName: "Studio Business",
    tagline: "ERP Multi-Nicho All-in-One para Operações Híbridas, Redes & Franquias",
    primaryDomain: "studio.waesy.com.br",
    hostPatterns: ["studio.waesy.com.br", "painel.waesy.com.br", "erp.waesy.com.br"],
    primaryNiche: "generic",
    targetSegments: ["Operações Híbridas", "Redes de Lojas", "Franquias", "Distribuidoras", "Indústrias Locais"],
    defaultModules: [
      "catalog",
      "orders",
      "kds",
      "tables",
      "reservations",
      "crm",
      "proposals",
      "quotes",
      "boarding",
      "fleet",
      "contracts",
      "financial",
      "tasks",
      "support",
      "inventory",
      "marketing",
      "affiliates",
      "couriers",
      "simlab",
    ],
    nomenclature: {
      itemSingular: "Item / Serviço",
      itemPlural: "Catálogo & Estoque",
      orderSingular: "Pedido / OS",
      orderPlural: "Pedidos & Operações",
      customerSingular: "Cliente / Parceiro",
      customerPlural: "Carteira de Clientes",
      leadSingular: "Lead Comercial",
      leadPlural: "Pipeline CRM",
      quoteSingular: "Cotação",
      quotePlural: "Cotações",
      proposalSingular: "Proposta Comercial",
      proposalPlural: "Propostas Comerciais",
      resourceSingular: "Unidade / Recurso",
      resourcePlural: "Unidades & Recursos",
    },
    referenceBenchmarks: ["Odoo", "SAP Business One", "Omie"],
    isStandaloneSaas: true,
    defaultPublishToMarketplace: true,
  },
};

export const BRAND_VERTICAL_LIST: BrandVerticalConfig[] = Object.values(BRAND_VERTICALS_REGISTRY);
export const SUBSCRIPTION_TIER_LIST: SubscriptionTierConfig[] = Object.values(SUBSCRIPTION_TIERS_REGISTRY);

/**
 * Resolve a configuração de marca vertical pelo ID canônico.
 * Cai sempre de forma segura para `waesy` se não informado ou inválido.
 */
export function getBrandVerticalById(brandId?: string | null): BrandVerticalConfig {
  if (!brandId) return BRAND_VERTICALS_REGISTRY.waesy;
  const normalized = brandId.trim().toLowerCase() as BrandVerticalId;
  return BRAND_VERTICALS_REGISTRY[normalized] ?? BRAND_VERTICALS_REGISTRY.waesy;
}

/**
 * Resolve a configuração de marca vertical inspecionando o header `Host` da requisição HTTP.
 * Suporta domínios dedicados (ex: `tableway.com.br`, `wowbook.com.br`) e subdomínios (`studio.waesy.com.br`).
 */
export function resolveBrandContextFromHost(host?: string | null): BrandVerticalConfig {
  if (!host || typeof host !== "string") {
    return BRAND_VERTICALS_REGISTRY.waesy;
  }

  const cleanHost = host.trim().toLowerCase().replace(/:\d+$/, "");
  if (!cleanHost) {
    return BRAND_VERTICALS_REGISTRY.waesy;
  }

  // Verifica primeiro as verticais especializadas antes do fallback genérico waesy
  const priorityOrder: BrandVerticalId[] = [
    "wowbook",
    "tableway",
    "turis",
    "passhub",
    "lexcloud",
    "talentlink",
    "omnipage",
    "signflow",
    "waesy_news",
    "waesy_copilot",
    "waesy_studio",
  ];

  for (const brandId of priorityOrder) {
    const config = BRAND_VERTICALS_REGISTRY[brandId];
    const matches = config.hostPatterns.some(
      (pattern) => cleanHost === pattern || cleanHost.startsWith(pattern) || cleanHost.endsWith(`.${pattern}`),
    );
    if (matches) {
      return config;
    }
  }

  return BRAND_VERTICALS_REGISTRY.waesy;
}

function normalizeTierId(rawTier?: string | null): SubscriptionTierId {
  const clean = String(rawTier || "starter").trim().toLowerCase();
  if (clean === "professional" || clean === "pro") return "pro";
  if (clean === "enterprise" || clean === "waesy_max") return "enterprise";
  return "starter";
}

const SKU_CAPABILITY_MODULES: Record<string, string[]> = {
  waesy_salon_beauty: ["reservations", "catalog", "orders", "crm", "financial", "contracts"],
  waesy_barbershop: ["reservations", "catalog", "orders", "crm", "financial"],
  waesy_health_clinic: ["reservations", "catalog", "orders", "crm", "financial", "copilot"],
  waesy_gastro_delivery: ["catalog", "orders", "kds", "tables", "inventory", "couriers", "crm", "financial"],
  waesy_automotive_workshop: ["catalog", "orders", "service_orders", "vehicles", "inventory", "crm", "financial"],
  waesy_tourism_pro: ["catalog", "orders", "quotes", "proposals", "boarding", "fleet", "contracts", "crm", "financial", "copilot"],
  waesy_real_estate: ["catalog", "orders", "real_estate", "contracts", "crm", "financial"],
  waesy_retail_commerce: ["catalog", "orders", "inventory", "crm", "financial"],
  waesy_legal_office: ["catalog", "legal", "contracts", "proposals", "tasks", "crm", "financial"],
  waesy_bundle_pro: ["catalog", "orders", "kds", "tables", "reservations", "crm", "proposals", "quotes", "boarding", "fleet", "contracts", "financial", "tasks", "inventory", "hr", "copilot"],
};

const GROUP_ID_TO_CANONICAL_MODULE: Record<string, string> = {
  "overview": "__core__",
  "settings": "__core__",
  "master-tasks": "__core__",
  "support-desk": "__core__",
  "crm-clients": "crm",
  "master-inbox": "crm",
  "whatsapp-automations": "crm",
  "commercial-sales": "orders",
  "b2b-procurement": "quotes",
  "contracts-global": "contracts",
  "marketing": "marketing",
  "intelligence-squads": "tasks",
  "finance": "financial",
  "fiscal-accounting": "financial",
  "team-rh": "hr",
  "tourism-crm": "proposals",
  "tourism-commercial": "quotes",
  "tourism-contracts": "contracts",
  "tourism-operations": "proposals",
  "tourism-trips": "proposals",
  "tourism-boarding": "boarding",
  "tourism-catalog": "quotes",
  "tourism-marketing": "marketing",
  "tourism-finance": "financial",
  "gastro-catalog": "catalog",
  "gastro-orders": "orders",
  "retail-catalog": "catalog",
  "retail-sales": "orders",
  "services-agenda": "reservations",
  "services-catalog": "catalog",
  "services-supplies": "reservations",
  "automotive-workshop": "service_orders",
  "vehicles": "vehicles",
  "tech-repair": "service_orders",
  "tech-catalog": "catalog",
  "accounting": "financial",
  "legal": "legal",
  "legal-catalog": "legal",
  "legal-deadlines": "legal",
  "real-estate": "real_estate",
  "property-inspections": "real_estate",
  "events-tickets": "catalog",
  "events-catalog": "catalog",
  "logistics-events": "orders",
  "jobs": "crm",
  "jobs-catalog": "catalog",
  "supermarket": "catalog",
  "pharmacy": "catalog",
  "wholesale": "orders",
  "rental-events": "reservations",
  "pet": "catalog",
  "news": "marketing",
  "education": "catalog",
  "logistics-local-delivery": "orders",
  "logistics-expedition": "orders",
  "logistics-supermarket": "orders",
  "logistics-operations": "orders",
  "fleet-operations": "fleet",
  "governance-audit": "contracts",
  "donations-captacao": "financial",
};

/**
 * Retorna a lista unificada de módulos permitidos para um plano (Tier) e marca vertical.
 */
export function getTierModules(tier?: string | null, brandId?: string | null): string[] {
  const normalizedTier = normalizeTierId(tier);
  const tierConfig = SUBSCRIPTION_TIERS_REGISTRY[normalizedTier] ?? SUBSCRIPTION_TIERS_REGISTRY.enterprise;
  const brandConfig = getBrandVerticalById(brandId);

  if (tierConfig.allowsAllModules) {
    return Array.from(new Set([...tierConfig.includedModules, ...brandConfig.defaultModules]));
  }

  return Array.from(new Set(tierConfig.includedModules));
}

/**
 * Verifica deterministicamente se uma loja possui permissão para acessar determinado módulo.
 * Respeita o plano contratado (`subscription_tier`), SKU vertical, módulos extras (`enabled_modules`) e retrocompatibilidade.
 */
export function canAccessModule(
  store: StoreEntitlementInput | null | undefined,
  moduleKey: string,
): boolean {
  if (!moduleKey) return true;
  if (!store) return false;

  const rawAny = store as Record<string, any>;
  if (rawAny.is_platform_root === true) {
    return true;
  }
  if (
    rawAny.is_active === false ||
    (rawAny.approval_status && rawAny.approval_status !== "approved") ||
    rawAny.subscription_status === "cancelled" ||
    rawAny.subscription_status === "past_due"
  ) {
    return false;
  }

  const settings = store.settings ?? {};
  const effectiveTier = normalizeTierId(
    (store.subscription_tier ||
      rawAny.plan_tier ||
      settings.subscription_tier ||
      settings.plan_tier ||
      settings.subscriptionTier ||
      "starter") as string,
  );

  const tierConfig = SUBSCRIPTION_TIERS_REGISTRY[effectiveTier] ?? SUBSCRIPTION_TIERS_REGISTRY.starter;
  if (tierConfig.allowsAllModules) {
    return true;
  }

  const normalizedKey = moduleKey.trim().toLowerCase();
  const explicitModules: string[] = Array.isArray(store.enabled_modules)
    ? store.enabled_modules
    : Array.isArray(settings.enabled_modules)
      ? settings.enabled_modules
      : [];

  if (explicitModules.some((m) => String(m).toLowerCase() === normalizedKey)) {
    return true;
  }

  const skuKey = String(rawAny.vertical_sku || settings.vertical_sku || "").toLowerCase();
  const skuModules = SKU_CAPABILITY_MODULES[skuKey] || [];
  if (skuModules.includes(normalizedKey)) {
    return true;
  }

  return tierConfig.includedModules.includes(normalizedKey);
}

/**
 * Avalia se um grupo de navegação do Workspace deve permanecer visível para a loja.
 * Evita ocultamento acidental de grupos estruturais (overview/ajustes) ou módulos cobertos pelo SKU vertical.
 */
export function canAccessWorkspaceGroup(
  store: StoreEntitlementInput | null | undefined,
  groupId: string,
): boolean {
  if (!store) return false;
  const rawAny = store as Record<string, any>;
  if (rawAny.is_platform_root === true) return true;
  if (
    rawAny.is_active === false ||
    (rawAny.approval_status && rawAny.approval_status !== "approved") ||
    rawAny.subscription_status === "cancelled" ||
    rawAny.subscription_status === "past_due"
  ) {
    return false;
  }

  const normalizedGroup = String(groupId || "").trim().toLowerCase();
  const mappedModule = GROUP_ID_TO_CANONICAL_MODULE[normalizedGroup] || normalizedGroup;
  if (mappedModule === "__core__") {
    return true;
  }
  return canAccessModule(store, mappedModule) || canAccessModule(store, normalizedGroup);
}

/**
 * Verifica se a loja optou por publicar seu perfil e catálogo no Marketplace Civil compartilhado Waesy.
 * Lojas em modo Private SaaS (`waesy_marketplace_enabled: false` ou `publish_to_marketplace: false`)
 * permanecem 100% invisíveis na vitrine agregada do Marketplace, operando apenas no próprio link/ERP.
 */
export function shouldPublishStoreToMarketplace(
  store: Record<string, any> | null | undefined,
): boolean {
  if (!store) return false;
  const settings = (store.settings ?? {}) as Record<string, any>;

  if (store.waesy_marketplace_enabled === false || settings.waesy_marketplace_enabled === false) {
    return false;
  }
  if (store.publish_to_marketplace === false || settings.publish_to_marketplace === false) {
    return false;
  }
  if (store.is_published_to_marketplace === false) {
    return false;
  }

  return true;
}

/**
 * Verifica se um produto ou serviço individual deve aparecer na busca/vitrine do Marketplace Waesy.
 * Exige que tanto o item quanto a loja proprietária (se informada) estejam com Opt-In ativo.
 */
export function shouldPublishItemToMarketplace(
  item: Record<string, any> | null | undefined,
  store?: Record<string, any> | null,
): boolean {
  if (!item) return false;
  if (store && !shouldPublishStoreToMarketplace(store)) {
    return false;
  }

  if (item.is_published_to_marketplace === false) {
    return false;
  }
  const metadata = (item.metadata ?? item.attributes ?? item.settings ?? {}) as Record<string, any>;
  if (metadata.is_published_to_marketplace === false) {
    return false;
  }

  return true;
}
