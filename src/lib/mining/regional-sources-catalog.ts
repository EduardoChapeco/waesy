/**
 * regional-sources-catalog.ts — Catálogo Unificado de Fontes e Sementes Regionais
 * 
 * Mapeamento exaustivo de portais de notícias, órgãos públicos, diários oficiais,
 * plataformas de emprego, imobiliárias e leilões de Chapecó e Santa Catarina.
 * 
 * Regra DL-04: Proibido uso de negação unária (!ident) para conformidade com design-lint.
 */

export interface RegionalSourceSeed {
  name: string;
  domain: string;
  baseUrl: string;
  sitemaps: string[];
  rssFeeds: string[];
  defaultEntityType: "news" | "job" | "business" | "event" | "real_estate" | "auctions" | "tenders";
  priority: number; // 1 = Urgente/Governo, 2 = Notícias Regionais, 3 = Vagas, 4 = Negócios
  city: string;
  state: string;
  description: string;
}

export const REGIONAL_SOURCES_CATALOG: RegionalSourceSeed[] = [
  // ── 1. PORTAIS DE NOTÍCIAS REGIONAIS & LOCAIS (CHAPECÓ & OESTE SC) ───────
  {
    name: "ClicRDC Chapecó",
    domain: "clicrdc.com.br",
    baseUrl: "https://clicrdc.com.br",
    sitemaps: [
      "https://clicrdc.com.br/sitemap_index.xml",
      "https://clicrdc.com.br/post-sitemap.xml",
    ],
    rssFeeds: [
      "https://clicrdc.com.br/feed/",
    ],
    defaultEntityType: "news",
    priority: 2,
    city: "Chapecó",
    state: "SC",
    description: "Principal portal de notícias hiperlocais de Chapecó e região Oeste",
  },
  {
    name: "Chapecó Online",
    domain: "chapecoonline.com.br",
    baseUrl: "https://chapecoonline.com.br",
    sitemaps: [
      "https://chapecoonline.com.br/sitemap.xml",
      "https://chapecoonline.com.br/sitemap_index.xml",
    ],
    rssFeeds: [
      "https://chapecoonline.com.br/feed",
      "https://chapecoonline.com.br/feed/rss",
    ],
    defaultEntityType: "news",
    priority: 2,
    city: "Chapecó",
    state: "SC",
    description: "Portal de notícias, comércio e eventos de Chapecó",
  },
  {
    name: "ND Mais Chapecó",
    domain: "ndmais.com.br",
    baseUrl: "https://ndmais.com.br/oeste",
    sitemaps: [
      "https://ndmais.com.br/sitemap.xml",
      "https://ndmais.com.br/news-sitemap.xml",
    ],
    rssFeeds: [
      "https://ndmais.com.br/feed/",
    ],
    defaultEntityType: "news",
    priority: 2,
    city: "Chapecó",
    state: "SC",
    description: "Cobertura regional Grupo ND para o Oeste catarinense",
  },
  {
    name: "NSC Total Chapecó",
    domain: "nsctotal.com.br",
    baseUrl: "https://www.nsctotal.com.br/oeste",
    sitemaps: [
      "https://www.nsctotal.com.br/sitemap.xml",
      "https://www.nsctotal.com.br/sitemap-news.xml",
    ],
    rssFeeds: [
      "https://www.nsctotal.com.br/feed",
    ],
    defaultEntityType: "news",
    priority: 2,
    city: "Chapecó",
    state: "SC",
    description: "Canal de notícias do Grupo RBS / NSC em Santa Catarina",
  },
  {
    name: "G1 Santa Catarina",
    domain: "g1.globo.com",
    baseUrl: "https://g1.globo.com/sc/santa-catarina",
    sitemaps: [
      "https://g1.globo.com/sitemap/g1/sc/santa-catarina.xml",
    ],
    rssFeeds: [
      "https://g1.globo.com/rss/g1/sc/",
    ],
    defaultEntityType: "news",
    priority: 2,
    city: "Chapecó",
    state: "SC",
    description: "Notícias estaduais e regionais com ênfase no Grande Oeste",
  },
  {
    name: "Diário do Iguaçu (DI Regional)",
    domain: "diariodoiguacu.com.br",
    baseUrl: "https://diariodoiguacu.com.br",
    sitemaps: [
      "https://diariodoiguacu.com.br/sitemap.xml",
      "https://diariodoiguacu.com.br/sitemap_index.xml",
    ],
    rssFeeds: [
      "https://diariodoiguacu.com.br/feed",
    ],
    defaultEntityType: "news",
    priority: 2,
    city: "Chapecó",
    state: "SC",
    description: "Jornal diário impresso e digital centrado na economia e política do Oeste",
  },

  // ── 2. ÓRGÃOS PÚBLICOS, EDITAIS & TRANSPARÊNCIA (GOV / PNCP) ──────────────
  {
    name: "Prefeitura Municipal de Chapecó",
    domain: "chapeco.sc.gov.br",
    baseUrl: "https://chapeco.sc.gov.br",
    sitemaps: [
      "https://chapeco.sc.gov.br/sitemap.xml",
    ],
    rssFeeds: [
      "https://chapeco.sc.gov.br/feed/",
    ],
    defaultEntityType: "tenders",
    priority: 1,
    city: "Chapecó",
    state: "SC",
    description: "Editais, decretos municipais, licitações e atos do Executivo",
  },
  {
    name: "Câmara de Vereadores de Chapecó",
    domain: "cmc.sc.gov.br",
    baseUrl: "https://cmc.sc.gov.br",
    sitemaps: [
      "https://cmc.sc.gov.br/sitemap.xml",
    ],
    rssFeeds: [],
    defaultEntityType: "news",
    priority: 2,
    city: "Chapecó",
    state: "SC",
    description: "Projetos de lei, sessões plenárias e pautas do Legislativo local",
  },
  {
    name: "Portal Nacional de Contratações Públicas (PNCP)",
    domain: "pncp.gov.br",
    baseUrl: "https://pncp.gov.br",
    sitemaps: [],
    rssFeeds: [],
    defaultEntityType: "tenders",
    priority: 1,
    city: "Chapecó",
    state: "SC",
    description: "Base nacional de compras públicas e editais municipais de SC",
  },

  // ── 3. VAGAS DE EMPREGO REGIONAIS ──────────────────────────────────────────
  {
    name: "Vagas.com.br Chapecó",
    domain: "vagas.com.br",
    baseUrl: "https://www.vagas.com.br/vagas-em-chapeco-sc",
    sitemaps: [
      "https://www.vagas.com.br/sitemap.xml",
    ],
    rssFeeds: [],
    defaultEntityType: "job",
    priority: 3,
    city: "Chapecó",
    state: "SC",
    description: "Vagas corporativas, técnicas e operacionais em Chapecó",
  },
  {
    name: "Trabalha Brasil Chapecó (SINE)",
    domain: "trabalhabrasil.com.br",
    baseUrl: "https://www.trabalhabrasil.com.br/vagas-empregos-em-chapeco-sc",
    sitemaps: [],
    rssFeeds: [],
    defaultEntityType: "job",
    priority: 3,
    city: "Chapecó",
    state: "SC",
    description: "Vagas integradas com o sistema nacional de emprego",
  },

  // ── 4. IMOBILIÁRIAS & MERCADO LOCAL ───────────────────────────────────────
  {
    name: "Zap Imóveis Chapecó",
    domain: "zapimoveis.com.br",
    baseUrl: "https://www.zapimoveis.com.br/comprar/imoveis/sc+chapeco/",
    sitemaps: [
      "https://www.zapimoveis.com.br/sitemap.xml",
    ],
    rssFeeds: [],
    defaultEntityType: "real_estate",
    priority: 4,
    city: "Chapecó",
    state: "SC",
    description: "Inventário de imóveis à venda e locação em bairros de Chapecó",
  },
  {
    name: "VivaReal Chapecó",
    domain: "vivareal.com.br",
    baseUrl: "https://www.vivareal.com.br/venda/santa-catarina/chapeco/",
    sitemaps: [
      "https://www.vivareal.com.br/sitemap.xml",
    ],
    rssFeeds: [],
    defaultEntityType: "real_estate",
    priority: 4,
    city: "Chapecó",
    state: "SC",
    description: "Classificados residenciais e comerciais em Chapecó",
  },

  // ── 5. LEILÕES JUDICIAIS E EXTRAJUDICIAIS ──────────────────────────────────
  {
    name: "Baldissera Leiloeiros",
    domain: "baldisserapregoeiro.com.br",
    baseUrl: "https://www.baldisserapregoeiro.com.br",
    sitemaps: [],
    rssFeeds: [],
    defaultEntityType: "auctions",
    priority: 3,
    city: "Chapecó",
    state: "SC",
    description: "Maior casa de leilões judiciais e extrajudiciais do Oeste de SC",
  },
  {
    name: "Leilão VIP Santa Catarina",
    domain: "leilaovip.com.br",
    baseUrl: "https://www.leilaovip.com.br/leiloes/sc/chapeco",
    sitemaps: [],
    rssFeeds: [],
    defaultEntityType: "auctions",
    priority: 3,
    city: "Chapecó",
    state: "SC",
    description: "Leilões de imóveis, veículos e maquinários recuperados",
  },
];
