/**
 * vertical-subsystems.ts — Fonte Unica da Verdade (SSOT) dos Subsistemas Verticais,
 * Subdominios Canonicos e Instrucoes de Configuracao DNS (GoDaddy + Cloudflare Pages).
 *
 * Modulo puro (zero importacoes de servidor) — seguro para cliente, SSR e Cloudflare Worker.
 */

export type VerticalSubsystemCategory =
  | "sales_hub"
  | "public_app"
  | "vertical_workspace"
  | "saas_brand"
  | "admin";

export interface VerticalSubsystemDescriptor {
  id: string;
  name: string;
  shortName: string;
  category: VerticalSubsystemCategory;
  subdomain: string;
  canonicalDomain: string;
  hostAliases: string[];
  targetPath: string;
  landingPath?: string;
  brandVerticalId?: string;
  primaryNicheId?: string;
  defaultVerticalSku?: string;
  description: string;
  howItWorks: string;
  modulesIncluded: string[];
  isActive: boolean;
  showInHub: boolean;
  showOnLanding: boolean;
  isStandaloneApp: boolean;
  sortOrder: number;
}

export type RootExperienceMode = "landing_vendas" | "marketplace_local";

export const CANONICAL_VERTICAL_SUBSYSTEMS: VerticalSubsystemDescriptor[] = [
  {
    id: "waesy",
    name: "Waesy Hub & Institucional",
    shortName: "Hub Waesy",
    category: "sales_hub",
    subdomain: "@",
    canonicalDomain: "waesy.com.br",
    hostAliases: ["waesy.com.br", "www.waesy.com.br"],
    targetPath: "/",
    description: "Vitrine comercial do ecossistema Waesy com apresentacao dos modulos e atalhos entre apps.",
    howItWorks: "Apresenta a proposta de valor da plataforma, aba dedicada de Marketplace e acessos rapidos a todos os apps.",
    modulesIncluded: ["landing", "hub", "marketplace_preview"],
    isActive: true,
    showInHub: true,
    showOnLanding: false,
    isStandaloneApp: false,
    sortOrder: 10,
  },
  {
    id: "explorer",
    name: "Waesy Explorer (Cidade & Vitrine)",
    shortName: "Explorar",
    category: "public_app",
    subdomain: "explorer",
    canonicalDomain: "explorer.waesy.com.br",
    hostAliases: ["explorer.waesy.com.br", "explorar.waesy.com.br"],
    targetPath: "/explorer",
    description: "Vitrine comunitaria completa com lojas locais, bairros, ofertas, eventos, empregos e servicos.",
    howItWorks: "Centraliza toda a descoberta regional anterior da raiz waesy.com.br em um app de exploracao local.",
    modulesIncluded: ["marketplace", "directory", "classifieds", "events", "jobs"],
    isActive: true,
    showInHub: true,
    showOnLanding: true,
    isStandaloneApp: true,
    sortOrder: 25,
  },
  {
    id: "pro",
    name: "Waesy Pro (All-in-One)",
    shortName: "Waesy Pro",
    category: "vertical_workspace",
    subdomain: "pro",
    canonicalDomain: "pro.waesy.com.br",
    hostAliases: ["pro.waesy.com.br", "painel.waesy.com.br", "erp.waesy.com.br"],
    targetPath: "/painel",
    landingPath: "/sistemas/pro",
    brandVerticalId: "waesy_studio",
    primaryNicheId: "retail",
    defaultVerticalSku: "waesy_bundle_pro",
    description: "Sistema completo de gestao empresarial: PDV, Estoque, Financeiro, CRM, Contratos, RH e IA.",
    howItWorks: "Centraliza operacao multi-loja em um painel unificado com permissoes RBAC e sincronizacao em tempo real.",
    modulesIncluded: ["catalog", "orders", "pdv", "crm", "financial", "hr", "contracts", "copilot"],
    isActive: true,
    showInHub: true,
    showOnLanding: true,
    isStandaloneApp: true,
    sortOrder: 20,
  },
  {
    id: "marketplace",
    name: "Waesy Marketplace",
    shortName: "Marketplace",
    category: "public_app",
    subdomain: "marketplace",
    canonicalDomain: "marketplace.waesy.com.br",
    hostAliases: ["marketplace.waesy.com.br", "loja.waesy.com.br"],
    targetPath: "/marketplace",
    description: "App completo de compras locais com vitrines de empresas verificadas e checkout integrado.",
    howItWorks: "Lojas opt-in publicam catalogo, entregas e ofertas em tempo real com split de pagamento e avaliacoes.",
    modulesIncluded: ["marketplace", "cart", "checkout", "offers"],
    isActive: true,
    showInHub: true,
    showOnLanding: true,
    isStandaloneApp: true,
    sortOrder: 30,
  },
  {
    id: "classificados",
    name: "Waesy Classificados",
    shortName: "Classificados",
    category: "public_app",
    subdomain: "classificados",
    canonicalDomain: "classificados.waesy.com.br",
    hostAliases: ["classificados.waesy.com.br", "anuncios.waesy.com.br"],
    targetPath: "/classificados",
    description: "App completo de compra, venda, imoveis, veiculos, temporadas e servicos da comunidade.",
    howItWorks: "Anunciantes publicam com fotos, filtros regionais, negociacao segura no chat e impulsionamento pago.",
    modulesIncluded: ["classifieds", "classifieds_publish", "classifieds_boost"],
    isActive: true,
    showInHub: true,
    showOnLanding: true,
    isStandaloneApp: true,
    sortOrder: 40,
  },
  {
    id: "noticias",
    name: "Waesy Noticias",
    shortName: "Noticias",
    category: "public_app",
    subdomain: "noticias",
    canonicalDomain: "noticias.waesy.com.br",
    hostAliases: ["noticias.waesy.com.br", "news.waesy.com.br"],
    targetPath: "/noticias",
    description: "Portal independente de jornalismo regional, cobertura de cidades e patrocinadores locais.",
    howItWorks: "Veiculos credenciados publicam materias verificadas com distribuicao por cidade, SEO e Sitemap News.",
    modulesIncluded: ["news", "press_consortium"],
    isActive: true,
    showInHub: true,
    showOnLanding: true,
    isStandaloneApp: true,
    sortOrder: 50,
  },
  {
    id: "go",
    name: "Waesy Go (Mobilidade & Entregas)",
    shortName: "Waesy Go",
    category: "public_app",
    subdomain: "go",
    canonicalDomain: "go.waesy.com.br",
    hostAliases: ["go.waesy.com.br", "mobilidade.waesy.com.br"],
    targetPath: "/mobilidade",
    description: "App de corridas urbanas, motoboys e fretes com tarifa justa (taxa fixa R$ 0,99 ao condutor).",
    howItWorks: "Passageiros e empresas solicitam viagens ou entregas com mapa ao vivo, despacho GPS e pagamento direto.",
    modulesIncluded: ["mobility", "courier", "freight"],
    isActive: true,
    showInHub: true,
    showOnLanding: true,
    isStandaloneApp: true,
    sortOrder: 60,
  },
  {
    id: "talk",
    name: "Waesy Talk (Chat & CRM)",
    shortName: "Talk CRM",
    category: "vertical_workspace",
    subdomain: "talk",
    canonicalDomain: "talk.waesy.com.br",
    hostAliases: ["talk.waesy.com.br", "chat.waesy.com.br", "atendimento.waesy.com.br"],
    targetPath: "/workspace/atendimento/chat",
    landingPath: "/sistemas/talk",
    brandVerticalId: "waesy_studio",
    primaryNicheId: "services",
    defaultVerticalSku: "waesy_retail_commerce",
    description: "Caixa de entrada omnichannel conectada ao WhatsApp, filas por setor, notas internas e audio IA.",
    howItWorks: "Integra multiplas instancias WhatsApp, ficha 360 do cliente, cota/fatura Pix e assistente Copilot no chat.",
    modulesIncluded: ["module_omnichannel_whatsapp", "crm", "voice_ptt"],
    isActive: true,
    showInHub: true,
    showOnLanding: true,
    isStandaloneApp: true,
    sortOrder: 70,
  },
  {
    id: "copilot",
    name: "Waesy Copilot IA",
    shortName: "Copilot IA",
    category: "public_app",
    subdomain: "copilot",
    canonicalDomain: "copilot.waesy.com.br",
    hostAliases: ["copilot.waesy.com.br", "ia.waesy.com.br"],
    targetPath: "/copilot",
    description: "Agente IA autonomo com plano vivo, subagentes paralelos, navegador em nuvem e sandbox de codigo.",
    howItWorks: "Executa pesquisas web, analisa planilhas/dados, gera artefatos interativos e opera ferramentas MCP com checkpoints.",
    modulesIncluded: ["copilot", "mcp", "browser_agent", "sandbox"],
    isActive: true,
    showInHub: true,
    showOnLanding: true,
    isStandaloneApp: true,
    sortOrder: 80,
  },
  {
    id: "places",
    name: "Waesy Places & Diretorio",
    shortName: "Places",
    category: "public_app",
    subdomain: "places",
    canonicalDomain: "places.waesy.com.br",
    hostAliases: ["places.waesy.com.br", "diretorio.waesy.com.br"],
    targetPath: "/diretorio",
    description: "Guia oficial de empresas verificadas com CNPJ, endereco, horarios e busca geolocalizada.",
    howItWorks: "Conecta consumidores aos perfis oficiais de estabelecimentos com reivindicacao verificada de marca.",
    modulesIncluded: ["directory", "places"],
    isActive: true,
    showInHub: true,
    showOnLanding: true,
    isStandaloneApp: true,
    sortOrder: 90,
  },
  {
    id: "studio",
    name: "Waesy Studio",
    shortName: "Studio",
    category: "vertical_workspace",
    subdomain: "studio",
    canonicalDomain: "studio.waesy.com.br",
    hostAliases: ["studio.waesy.com.br", "waesy-studio."],
    targetPath: "/workspace/estudio",
    landingPath: "/sistemas/studio",
    brandVerticalId: "waesy_studio",
    primaryNicheId: "services",
    defaultVerticalSku: "waesy_retail_commerce",
    description: "Estudio criativo integrado para criacao de artes, cardapios, propostas e paginas visuais.",
    howItWorks: "Transforma produtos e pacotes em laminas PDF, banners e posts prontos com exportacao direta.",
    modulesIncluded: ["studio", "builder"],
    isActive: true,
    showInHub: true,
    showOnLanding: true,
    isStandaloneApp: true,
    sortOrder: 100,
  },
  {
    id: "turis",
    name: "Turis (Agencias de Viagens)",
    shortName: "Turis",
    category: "saas_brand",
    subdomain: "turis",
    canonicalDomain: "turis.waesy.com.br",
    hostAliases: ["turis.waesy.com.br", "turis.com.br", "app.turis"],
    targetPath: "/painel?vertical=turis",
    landingPath: "/sistemas/turis",
    brandVerticalId: "turis",
    primaryNicheId: "tourism",
    defaultVerticalSku: "waesy_tourism_pro",
    description: "Sistema especializado em turismo com cotacoes, propostas interativas, frota 2D e vouchers.",
    howItWorks: "Gerencia roteiros dia a dia, embarques, rooming list, comissoes de guias e passageiros.",
    modulesIncluded: ["module_tourism_studio", "quotes", "proposals", "boarding", "fleet"],
    isActive: true,
    showInHub: true,
    showOnLanding: true,
    isStandaloneApp: true,
    sortOrder: 110,
  },
  {
    id: "wider",
    name: "Wider (Gastronomia & KDS)",
    shortName: "Wider",
    category: "saas_brand",
    subdomain: "wider",
    canonicalDomain: "wider.waesy.com.br",
    hostAliases: [
      "wider.waesy.com.br",
      "wider.com.br",
      "app.wider",
      "tableway.waesy.com.br",
      "tableway.com.br",
      "app.tableway",
    ],
    targetPath: "/painel?vertical=wider",
    landingPath: "/sistemas/wider",
    brandVerticalId: "wider",
    primaryNicheId: "gastronomy",
    defaultVerticalSku: "waesy_gastro_delivery",
    description: "Vertical para restaurantes e delivery com cardapio digital, comandas, mesas e KDS.",
    howItWorks: "Recebe pedidos do salao e delivery direto na cozinha e despacha entregas pela frota local.",
    modulesIncluded: ["module_food_delivery", "kds", "tables", "pdv"],
    isActive: true,
    showInHub: true,
    showOnLanding: true,
    isStandaloneApp: true,
    sortOrder: 120,
  },
  {
    id: "wowbook",
    name: "WowBook (Agenda & Clinicas)",
    shortName: "WowBook",
    category: "saas_brand",
    subdomain: "wowbook",
    canonicalDomain: "wowbook.waesy.com.br",
    hostAliases: ["wowbook.waesy.com.br", "wowbook.com.br", "app.wowbook"],
    targetPath: "/painel?vertical=wowbook",
    landingPath: "/sistemas/wowbook",
    brandVerticalId: "wowbook",
    primaryNicheId: "beauty_salon",
    defaultVerticalSku: "waesy_salon_beauty",
    description: "Vertical para saloes, barbearias e clinicas com agenda multiprofissional e comissoes.",
    howItWorks: "Controla horarios, salas, lembretes automaticos via WhatsApp e rateio Salao-Parceiro.",
    modulesIncluded: ["agenda_services", "reservations", "crm"],
    isActive: true,
    showInHub: true,
    showOnLanding: true,
    isStandaloneApp: true,
    sortOrder: 130,
  },
  {
    id: "eventio",
    name: "Eventio (Eventos & Bilheteria)",
    shortName: "Eventio",
    category: "saas_brand",
    subdomain: "eventio",
    canonicalDomain: "eventio.waesy.com.br",
    hostAliases: [
      "eventio.waesy.com.br",
      "eventio.com.br",
      "app.eventio",
      "passhub.waesy.com.br",
      "passhub.com.br",
      "app.passhub",
    ],
    targetPath: "/painel?vertical=eventio",
    landingPath: "/sistemas/eventio",
    brandVerticalId: "eventio",
    primaryNicheId: "events",
    defaultVerticalSku: "waesy_bundle_pro",
    description: "Gestao completa de eventos, lotes de ingressos, QR Code de portaria e promoters.",
    howItWorks: "Vende lotes online com QR Code antifraude, repasses de promoters e validacao mobile.",
    modulesIncluded: ["events", "tickets", "affiliates"],
    isActive: true,
    showInHub: true,
    showOnLanding: true,
    isStandaloneApp: true,
    sortOrder: 140,
  },
  {
    id: "juris",
    name: "Juris (Juridico & Processos)",
    shortName: "Juris",
    category: "saas_brand",
    subdomain: "juris",
    canonicalDomain: "juris.waesy.com.br",
    hostAliases: [
      "juris.waesy.com.br",
      "juris.com.br",
      "app.juris",
      "lexcloud.waesy.com.br",
      "lexcloud.com.br",
      "app.lexcloud",
    ],
    targetPath: "/painel?vertical=juris",
    landingPath: "/sistemas/juris",
    brandVerticalId: "juris",
    primaryNicheId: "law_firm",
    defaultVerticalSku: "waesy_legal_office",
    description: "Gestao para escritorios de advocacia, prazos processuais, GED e contratos de honorarios.",
    howItWorks: "Centraliza processos, prazos com alertas, arquivo GED e faturamento de honorarios.",
    modulesIncluded: ["legal", "contracts", "crm"],
    isActive: true,
    showInHub: true,
    showOnLanding: true,
    isStandaloneApp: true,
    sortOrder: 150,
  },
  {
    id: "talentlink",
    name: "TalentLink (Vagas ATS & RH)",
    shortName: "TalentLink",
    category: "saas_brand",
    subdomain: "talentlink",
    canonicalDomain: "talentlink.waesy.com.br",
    hostAliases: ["talentlink.waesy.com.br", "talentlink.com.br", "app.talentlink"],
    targetPath: "/painel?vertical=talentlink",
    landingPath: "/sistemas/talentlink",
    brandVerticalId: "talentlink",
    primaryNicheId: "services",
    defaultVerticalSku: "waesy_legal_office",
    description: "Portal ATS de vagas, banco de talentos, admissao digital, ponto e folha.",
    howItWorks: "Recebe curriculos, conduz etapas seletivas e integra admissao ao RH sem papel.",
    modulesIncluded: ["jobs", "hr", "payroll"],
    isActive: true,
    showInHub: true,
    showOnLanding: true,
    isStandaloneApp: true,
    sortOrder: 160,
  },
  {
    id: "omnipage",
    name: "OmniPage (Sites & BioLinks)",
    shortName: "OmniPage",
    category: "saas_brand",
    subdomain: "omnipage",
    canonicalDomain: "omnipage.waesy.com.br",
    hostAliases: ["omnipage.waesy.com.br", "omnipage.com.br", "app.omnipage"],
    targetPath: "/painel?vertical=omnipage",
    landingPath: "/sistemas/omnipage",
    brandVerticalId: "omnipage",
    primaryNicheId: "services",
    defaultVerticalSku: "waesy_retail_commerce",
    description: "Construtor visual de sites, landing pages de alta conversao, vitrines e biolinks.",
    howItWorks: "Publica paginas responsivas com formularios CRM, pixel proprio e dominio dedicado.",
    modulesIncluded: ["builder", "biolink", "pages", "crm"],
    isActive: true,
    showInHub: true,
    showOnLanding: true,
    isStandaloneApp: true,
    sortOrder: 165,
  },
  {
    id: "signflow",
    name: "SignFlow (Contratos & ICP-Brasil)",
    shortName: "SignFlow",
    category: "saas_brand",
    subdomain: "signflow",
    canonicalDomain: "signflow.waesy.com.br",
    hostAliases: ["signflow.waesy.com.br", "signflow.com.br", "app.signflow"],
    targetPath: "/painel?vertical=signflow",
    landingPath: "/sistemas/signflow",
    brandVerticalId: "signflow",
    primaryNicheId: "services",
    defaultVerticalSku: "waesy_legal_office",
    description: "Emissao de minutas dinamicas, assinatura eletronica verificada e dossie criptografico.",
    howItWorks: "Gera contratos em lote com selfie biometrica, hash SHA-256 e trilha de auditoria.",
    modulesIncluded: ["contracts", "kyc"],
    isActive: true,
    showInHub: true,
    showOnLanding: true,
    isStandaloneApp: true,
    sortOrder: 170,
  },
  {
    id: "autocenter",
    name: "Waesy Oficinas & Autocenters",
    shortName: "Oficinas Auto",
    category: "saas_brand",
    subdomain: "oficinas",
    canonicalDomain: "oficinas.waesy.com.br",
    hostAliases: ["oficinas.waesy.com.br", "autocenter.waesy.com.br"],
    targetPath: "/painel?vertical=autocenter",
    landingPath: "/sistemas/autocenter",
    brandVerticalId: "waesy_studio",
    primaryNicheId: "automotive",
    defaultVerticalSku: "waesy_automotive_workshop",
    description: "Ordens de servico automotivas por placa, chassi, odometro, checklist e pecas.",
    howItWorks: "Controla patio, aprovacao de orcamentos no WhatsApp e baixa automatica de pecas.",
    modulesIncluded: ["automotive", "service_orders", "inventory"],
    isActive: true,
    showInHub: true,
    showOnLanding: true,
    isStandaloneApp: true,
    sortOrder: 175,
  },
  {
    id: "imobiliaria",
    name: "Waesy Imobiliaria & Locacoes",
    shortName: "Imobiliaria",
    category: "saas_brand",
    subdomain: "imoveis",
    canonicalDomain: "imoveis.waesy.com.br",
    hostAliases: ["imoveis.waesy.com.br", "imobiliaria.waesy.com.br"],
    targetPath: "/painel?vertical=imobiliaria",
    landingPath: "/sistemas/imobiliaria",
    brandVerticalId: "waesy_studio",
    primaryNicheId: "real_estate",
    defaultVerticalSku: "waesy_real_estate",
    description: "Catalogo de imoveis venda e locacao, vistorias com fotos e contratos digitais.",
    howItWorks: "Qualifica leads de imoveis, agenda visitas e formaliza contratos com assinatura eletronica.",
    modulesIncluded: ["real_estate", "inspections", "contracts"],
    isActive: true,
    showInHub: true,
    showOnLanding: true,
    isStandaloneApp: true,
    sortOrder: 180,
  },
  {
    id: "store",
    name: "Waesy Store (Lojas & Varejo)",
    shortName: "Store Varejo",
    category: "saas_brand",
    subdomain: "store",
    canonicalDomain: "store.waesy.com.br",
    hostAliases: ["store.waesy.com.br", "varejo.waesy.com.br", "lojas.waesy.com.br"],
    targetPath: "/painel?vertical=store",
    landingPath: "/sistemas/store",
    brandVerticalId: "waesy_studio",
    primaryNicheId: "retail",
    defaultVerticalSku: "waesy_retail_commerce",
    description: "PDV, grade de variacoes por cor e tamanho, vitrine online, reposicao inteligente e entrega local.",
    howItWorks: "Opera caixa rapido, controle de grade/EAN e catalogo sincronizado no app ou vitrine da loja.",
    modulesIncluded: ["catalog", "inventory", "pdv", "orders"],
    isActive: true,
    showInHub: true,
    showOnLanding: true,
    isStandaloneApp: true,
    sortOrder: 185,
  },
  {
    id: "mercado",
    name: "Waesy Mercado (Supermercados & Mercearias)",
    shortName: "Mercado",
    category: "saas_brand",
    subdomain: "mercado",
    canonicalDomain: "mercado.waesy.com.br",
    hostAliases: ["mercado.waesy.com.br", "supermercado.waesy.com.br"],
    targetPath: "/painel?vertical=mercado",
    landingPath: "/sistemas/mercado",
    brandVerticalId: "waesy_studio",
    primaryNicheId: "retail",
    defaultVerticalSku: "waesy_retail_commerce",
    description: "PDV de caixa rapido, produtos pesaveis por balanca, controle de lote/validade, encartes e entregas de mercado.",
    howItWorks: "Integra balanca e codigo de barras no caixa, controla pereciveis por lote e despacha compras via Waesy Go.",
    modulesIncluded: ["catalog", "inventory", "pdv", "orders"],
    isActive: true,
    showInHub: true,
    showOnLanding: true,
    isStandaloneApp: true,
    sortOrder: 190,
  },
  {
    id: "admin",
    name: "Admin Master Global",
    shortName: "Admin Master",
    category: "admin",
    subdomain: "admin",
    canonicalDomain: "admin.waesy.com.br",
    hostAliases: ["admin.waesy.com.br", "master.waesy.com.br"],
    targetPath: "/admin-master",
    description: "Console soberano exclusivo do administrador global da plataforma.",
    howItWorks: "Controla aprovacoes de empresas/usuarios, planos manuais, modulos, roles, seguranca e dominios.",
    modulesIncluded: ["platform_admin"],
    isActive: true,
    showInHub: false,
    showOnLanding: false,
    isStandaloneApp: true,
    sortOrder: 999,
  },
];

export const LEGACY_SUBSYSTEM_SLUG_ALIASES: Record<string, string> = {
  tableway: "wider",
  passhub: "eventio",
  lexcloud: "juris",
  varejo: "store",
  lojas: "store",
  supermercado: "mercado",
  oficinas: "autocenter",
  imoveis: "imobiliaria",
};

export function normalizeCanonicalSubsystemId(slugOrId?: string | null): string {
  const clean = String(slugOrId || "").trim().toLowerCase();
  if (!clean) return "";
  return LEGACY_SUBSYSTEM_SLUG_ALIASES[clean] || clean;
}

/**
 * Resolve o subsistema vertical a partir do Host da requisicao HTTP.
 * Preserva hosts de desenvolvimento local sem rewrite automatico.
 */
export function resolveSubsystemFromHost(host?: string | null): VerticalSubsystemDescriptor | null {
  if (!host || typeof host !== "string") return null;
  const cleanHost = host.trim().toLowerCase().replace(/:\d+$/, "");
  if (!cleanHost) return null;

  const specialized = CANONICAL_VERTICAL_SUBSYSTEMS.filter((s) => s.id !== "waesy");
  for (const sub of specialized) {
    if (
      cleanHost === sub.canonicalDomain ||
      sub.hostAliases.some(
        (alias) =>
          cleanHost === alias ||
          (alias.endsWith(".") && cleanHost.startsWith(alias)) ||
          cleanHost.endsWith(`.${alias}`),
      )
    ) {
      return sub;
    }
  }

  if (
    cleanHost === "waesy.com.br" ||
    cleanHost === "www.waesy.com.br" ||
    cleanHost.endsWith(".usewaesy.pages.dev")
  ) {
    return CANONICAL_VERTICAL_SUBSYSTEMS.find((s) => s.id === "waesy") || null;
  }

  return null;
}

/**
 * Resolve subsistema vertical por slug canonico ou alias de subdominio.
 */
export function resolveSubsystemBySlug(slug?: string | null): VerticalSubsystemDescriptor | null {
  if (!slug || typeof slug !== "string") return null;
  const normalized = normalizeCanonicalSubsystemId(slug);
  if (!normalized) return null;
  return (
    CANONICAL_VERTICAL_SUBSYSTEMS.find(
      (s) => s.id === normalized || s.subdomain === normalized,
    ) || null
  );
}

/**
 * Retorna a rota de landing comercial/nichada para qualquer subsistema.
 */
export function resolveSubsystemLandingPath(
  subsystem: Pick<VerticalSubsystemDescriptor, "id" | "landingPath">,
): string {
  if (subsystem.landingPath) return subsystem.landingPath;
  if (subsystem.id === "waesy") return "/";
  return `/sistemas/${subsystem.id}`;
}

/**
 * Gera URL segura para navegar ate um subsistema vertical a partir do ambiente atual.
 * Em producao (`*.waesy.com.br`), navega diretamente ao subdominio dedicado; em localhost/preview, usa o path interno.
 */
export function resolveSubsystemHref(
  subsystem: Pick<VerticalSubsystemDescriptor, "canonicalDomain" | "targetPath">,
  currentHostname?: string,
): { href: string; external: boolean } {
  const host = (currentHostname || "").trim().toLowerCase().replace(/:\d+$/, "");
  if (host && (host === "waesy.com.br" || host.endsWith(".waesy.com.br"))) {
    return {
      href: `https://${subsystem.canonicalDomain}`,
      external: subsystem.canonicalDomain !== host,
    };
  }
  return {
    href: subsystem.targetPath,
    external: false,
  };
}

export interface DnsRecordInstruction {
  type: "CNAME" | "TXT";
  host: string;
  value: string;
  ttl: string;
  purpose: string;
}

export function buildGoDaddyDnsRecordsForSubsystems(
  subsystems: VerticalSubsystemDescriptor[] = CANONICAL_VERTICAL_SUBSYSTEMS,
  pagesOrigin = "usewaesy.pages.dev",
): DnsRecordInstruction[] {
  const rows: DnsRecordInstruction[] = [];
  const seen = new Set<string>();

  for (const sub of subsystems) {
    const hostLabel = sub.subdomain === "@" ? "@" : sub.subdomain;
    if (seen.has(hostLabel)) continue;
    seen.add(hostLabel);
    rows.push({
      type: "CNAME",
      host: hostLabel,
      value: pagesOrigin,
      ttl: "1 Hour",
      purpose: `${sub.name} (${sub.canonicalDomain} -> ${sub.targetPath})`,
    });
  }

  if (!seen.has("www")) {
    rows.splice(1, 0, {
      type: "CNAME",
      host: "www",
      value: pagesOrigin,
      ttl: "1 Hour",
      purpose: "Redirecionamento www.waesy.com.br -> Cloudflare Pages",
    });
  }

  if (!seen.has("painel")) {
    rows.splice(3, 0, {
      type: "CNAME",
      host: "painel",
      value: pagesOrigin,
      ttl: "1 Hour",
      purpose: "Acesso Direto ao Painel Empresarial (painel.waesy.com.br -> /painel)",
    });
  }

  return rows;
}
