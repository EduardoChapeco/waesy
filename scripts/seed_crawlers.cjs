const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

if (fs.existsSync(".env.local")) dotenv.config({ path: ".env.local" });
if (fs.existsSync(".env.secrets")) dotenv.config({ path: ".env.secrets" });
if (fs.existsSync(".env")) dotenv.config({ path: ".env" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("ERRO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const CRAWLER_SEEDS_CATALOG = [
  // ── 1. NOTÍCIAS REGIONAIS (SANTA CATARINA, CHAPECÓ & SUL) ──────────────────────
  {
    name: "G1 Santa Catarina (Regional)",
    url: "https://g1.globo.com/dynamo/sc/santa-catarina/rss2.xml",
    type: "rss",
    category: "news_regional",
    region: "SC",
    priority: 9,
    fetch_interval_minutes: 30,
    config: { website_url: "https://g1.globo.com/sc/santa-catarina/" }
  },
  {
    name: "ND Mais Notícias Santa Catarina",
    url: "https://ndmais.com.br/feed/",
    type: "rss",
    category: "news_regional",
    region: "SC",
    priority: 8,
    fetch_interval_minutes: 30,
    config: { website_url: "https://ndmais.com.br/" }
  },
  {
    name: "Portal DI Regional Chapecó & Oeste",
    url: "https://diregional.com.br/feed",
    type: "rss",
    category: "news_regional",
    region: "Chapecó/SC",
    priority: 9,
    fetch_interval_minutes: 30,
    config: { website_url: "https://diregional.com.br/" }
  },
  {
    name: "ClicRDC Chapecó e Região",
    url: "https://clicrdc.com.br/feed/",
    type: "rss",
    category: "news_regional",
    region: "Chapecó/SC",
    priority: 9,
    fetch_interval_minutes: 30,
    config: { website_url: "https://clicrdc.com.br/" }
  },
  {
    name: "SCC10 Notícias SC",
    url: "https://scc10.com.br/feed/",
    type: "rss",
    category: "news_regional",
    region: "SC",
    priority: 8,
    fetch_interval_minutes: 45,
    config: { website_url: "https://scc10.com.br/" }
  },
  {
    name: "Prefeitura Municipal de Chapecó",
    url: "https://chapeco.sc.gov.br/feed",
    type: "rss",
    category: "institutional",
    region: "Chapecó/SC",
    priority: 8,
    fetch_interval_minutes: 60,
    config: { website_url: "https://chapeco.sc.gov.br/" }
  },
  {
    name: "FIESC Notícias e Indústria SC",
    url: "https://fiesc.com.br/pt-br/rss.xml",
    type: "rss",
    category: "industry",
    region: "SC",
    priority: 7,
    fetch_interval_minutes: 60,
    config: { website_url: "https://fiesc.com.br/" }
  },
  {
    name: "Agência ALBA / Alesc Notícias",
    url: "https://agenciaal.alesc.sc.gov.br/index.php/rss",
    type: "rss",
    category: "politics",
    region: "SC",
    priority: 7,
    fetch_interval_minutes: 60,
    config: { website_url: "https://agenciaal.alesc.sc.gov.br/" }
  },
  {
    name: "O Município Blumenau",
    url: "https://omunicipioblumenau.com.br/feed/",
    type: "rss",
    category: "news_regional",
    region: "Blumenau/SC",
    priority: 7,
    fetch_interval_minutes: 60,
    config: { website_url: "https://omunicipioblumenau.com.br/" }
  },
  {
    name: "O Município Joinville",
    url: "https://omunicipiojoinville.com.br/feed/",
    type: "rss",
    category: "news_regional",
    region: "Joinville/SC",
    priority: 7,
    fetch_interval_minutes: 60,
    config: { website_url: "https://omunicipiojoinville.com.br/" }
  },
  {
    name: "Rádio Chapecó FM Notícias",
    url: "https://radiochapeco.com.br/feed/",
    type: "rss",
    category: "news_regional",
    region: "Chapecó/SC",
    priority: 8,
    fetch_interval_minutes: 45,
    config: { website_url: "https://radiochapeco.com.br/" }
  },
  {
    name: "Portal Éder Luiz (Meio Oeste SC)",
    url: "https://ederluiz.com.vc/feed/",
    type: "rss",
    category: "news_regional",
    region: "Joaçaba/SC",
    priority: 7,
    fetch_interval_minutes: 60,
    config: { website_url: "https://ederluiz.com.vc/" }
  },
  {
    name: "Lance Notícias (Xanxerê e Oeste)",
    url: "https://lancenet.com.br/feed/",
    type: "rss",
    category: "news_regional",
    region: "Xanxerê/SC",
    priority: 8,
    fetch_interval_minutes: 60,
    config: { website_url: "https://lancenet.com.br/" }
  },
  {
    name: "Atual FM (Concórdia e Alto Uruguai)",
    url: "https://atualfm.com.br/feed/",
    type: "rss",
    category: "news_regional",
    region: "Concórdia/SC",
    priority: 8,
    fetch_interval_minutes: 60,
    config: { website_url: "https://atualfm.com.br/" }
  },

  // ── 2. TECNOLOGIA, STARTUPS, IA & INOVAÇÃO ──────────────────────────────────
  {
    name: "G1 Tecnologia & Inovação",
    url: "https://g1.globo.com/dynamo/tecnologia/rss2.xml",
    type: "rss",
    category: "technology",
    region: "BR",
    priority: 9,
    fetch_interval_minutes: 30,
    config: { website_url: "https://g1.globo.com/tecnologia/" }
  },
  {
    name: "TecMundo",
    url: "https://rss.tecmundo.com.br/feed",
    type: "rss",
    category: "technology",
    region: "BR",
    priority: 8,
    fetch_interval_minutes: 30,
    config: { website_url: "https://www.tecmundo.com.br/" }
  },
  {
    name: "Olhar Digital",
    url: "https://olhardigital.com.br/feed/",
    type: "rss",
    category: "technology",
    region: "BR",
    priority: 8,
    fetch_interval_minutes: 30,
    config: { website_url: "https://olhardigital.com.br/" }
  },
  {
    name: "Canaltech",
    url: "https://feeds.feedburner.com/canaltechbr",
    type: "rss",
    category: "technology",
    region: "BR",
    priority: 8,
    fetch_interval_minutes: 30,
    config: { website_url: "https://canaltech.com.br/" }
  },
  {
    name: "StartSe Inovação & Nova Economia",
    url: "https://www.startse.com/feed/",
    type: "rss",
    category: "startups",
    region: "BR",
    priority: 8,
    fetch_interval_minutes: 45,
    config: { website_url: "https://www.startse.com/" }
  },
  {
    name: "InfoMoney Tecnologia",
    url: "https://www.infomoney.com.br/mercados/tecnologia/feed/",
    type: "rss",
    category: "technology",
    region: "BR",
    priority: 7,
    fetch_interval_minutes: 60,
    config: { website_url: "https://www.infomoney.com.br/mercados/tecnologia/" }
  },
  {
    name: "Brazil Journal Tecnologia",
    url: "https://braziljournal.com/categoria/tecnologia/feed/",
    type: "rss",
    category: "technology",
    region: "BR",
    priority: 8,
    fetch_interval_minutes: 60,
    config: { website_url: "https://braziljournal.com/" }
  },
  {
    name: "MacMagazine Apple & Tech",
    url: "https://macmagazine.com.br/feed/",
    type: "rss",
    category: "technology",
    region: "BR",
    priority: 7,
    fetch_interval_minutes: 60,
    config: { website_url: "https://macmagazine.com.br/" }
  },
  {
    name: "Manual do Usuário",
    url: "https://manualdousuario.net/feed/",
    type: "rss",
    category: "technology",
    region: "BR",
    priority: 7,
    fetch_interval_minutes: 60,
    config: { website_url: "https://manualdousuario.net/" }
  },
  {
    name: "Diolinux Open Source & Tech",
    url: "https://diolinux.com.br/feed",
    type: "rss",
    category: "technology",
    region: "BR",
    priority: 6,
    fetch_interval_minutes: 120,
    config: { website_url: "https://diolinux.com.br/" }
  },
  {
    name: "Convergência Digital",
    url: "https://www.convergenciadigital.com.br/rss/",
    type: "rss",
    category: "telecom",
    region: "BR",
    priority: 7,
    fetch_interval_minutes: 60,
    config: { website_url: "https://www.convergenciadigital.com.br/" }
  },
  {
    name: "Baguete Diário TI & Negócios",
    url: "https://www.baguete.com.br/rss.xml",
    type: "rss",
    category: "technology",
    region: "Sul/BR",
    priority: 7,
    fetch_interval_minutes: 60,
    config: { website_url: "https://www.baguete.com.br/" }
  },
  {
    name: "IT Forum Tecnologia",
    url: "https://itforum.com.br/feed/",
    type: "rss",
    category: "technology",
    region: "BR",
    priority: 7,
    fetch_interval_minutes: 60,
    config: { website_url: "https://itforum.com.br/" }
  },
  {
    name: "MIT Technology Review Brasil",
    url: "https://mittechreview.com.br/feed/",
    type: "rss",
    category: "science_ai",
    region: "BR",
    priority: 8,
    fetch_interval_minutes: 60,
    config: { website_url: "https://mittechreview.com.br/" }
  },

  // ── 3. ECONOMIA, FINANÇAS, AGRONEGÓCIO & MERCADOS ───────────────────────────
  {
    name: "G1 Economia & Negócios",
    url: "https://g1.globo.com/dynamo/economia/rss2.xml",
    type: "rss",
    category: "economy",
    region: "BR",
    priority: 9,
    fetch_interval_minutes: 30,
    config: { website_url: "https://g1.globo.com/economia/" }
  },
  {
    name: "G1 Agronegócios",
    url: "https://g1.globo.com/dynamo/economia/agronegocios/rss2.xml",
    type: "rss",
    category: "agribusiness",
    region: "BR",
    priority: 9,
    fetch_interval_minutes: 30,
    config: { website_url: "https://g1.globo.com/economia/agronegocios/" }
  },
  {
    name: "InfoMoney Mercados",
    url: "https://www.infomoney.com.br/mercados/feed/",
    type: "rss",
    category: "economy",
    region: "BR",
    priority: 8,
    fetch_interval_minutes: 30,
    config: { website_url: "https://www.infomoney.com.br/mercados/" }
  },
  {
    name: "InfoMoney Minhas Finanças",
    url: "https://www.infomoney.com.br/minhas-financas/feed/",
    type: "rss",
    category: "personal_finance",
    region: "BR",
    priority: 7,
    fetch_interval_minutes: 45,
    config: { website_url: "https://www.infomoney.com.br/minhas-financas/" }
  },
  {
    name: "Valor Econômico Destaques",
    url: "https://valor.globo.com/rss/",
    type: "rss",
    category: "economy",
    region: "BR",
    priority: 9,
    fetch_interval_minutes: 30,
    config: { website_url: "https://valor.globo.com/" }
  },
  {
    name: "Exame Notícias & Negócios",
    url: "https://exame.com/feed/",
    type: "rss",
    category: "economy",
    region: "BR",
    priority: 8,
    fetch_interval_minutes: 30,
    config: { website_url: "https://exame.com/" }
  },
  {
    name: "Canal Rural Notícias do Agro",
    url: "https://www.canalrural.com.br/feed/",
    type: "rss",
    category: "agribusiness",
    region: "BR",
    priority: 8,
    fetch_interval_minutes: 45,
    config: { website_url: "https://www.canalrural.com.br/" }
  },
  {
    name: "Notícias Agrícolas Cotações & Agro",
    url: "https://www.noticiasagricolas.com.br/rss/noticias.xml",
    type: "rss",
    category: "agribusiness",
    region: "BR",
    priority: 8,
    fetch_interval_minutes: 30,
    config: { website_url: "https://www.noticiasagricolas.com.br/" }
  },
  {
    name: "AgroLink Notícias",
    url: "https://www.agrolink.com.br/rss/noticias.xml",
    type: "rss",
    category: "agribusiness",
    region: "BR",
    priority: 7,
    fetch_interval_minutes: 60,
    config: { website_url: "https://www.agrolink.com.br/" }
  },
  {
    name: "Suinocultura Industrial (Forte em SC)",
    url: "https://www.suinoculturaindustrial.com.br/rss/noticias",
    type: "rss",
    category: "agribusiness",
    region: "Oeste/SC",
    priority: 8,
    fetch_interval_minutes: 60,
    config: { website_url: "https://www.suinoculturaindustrial.com.br/" }
  },
  {
    name: "Avicultura Industrial (Forte em SC)",
    url: "https://www.aviculturaindustrial.com.br/rss/noticias",
    type: "rss",
    category: "agribusiness",
    region: "Oeste/SC",
    priority: 8,
    fetch_interval_minutes: 60,
    config: { website_url: "https://www.aviculturaindustrial.com.br/" }
  },

  // ── 4. PORTAIS DE VAGAS E EMPREGOS (JOBS) ──────────────────────────────────
  {
    name: "Trampos.co Oportunidades & Vagas",
    url: "https://trampos.co/feed/oportunidades",
    type: "rss",
    category: "jobs",
    region: "BR",
    priority: 8,
    fetch_interval_minutes: 45,
    config: { website_url: "https://trampos.co/oportunidades" }
  },
  {
    name: "Balcão de Empregos Chapecó",
    url: "https://balcaodeempregos.chapeco.sc.gov.br/",
    type: "jobs_portal",
    category: "jobs",
    region: "Chapecó/SC",
    priority: 10,
    fetch_interval_minutes: 60,
    config: { domain: "balcaodeempregos.chapeco.sc.gov.br" }
  },
  {
    name: "Emprega Brasil - MTE Vagas Abertas",
    url: "https://empregabrasil.mte.gov.br/",
    type: "jobs_portal",
    category: "jobs",
    region: "BR",
    priority: 8,
    fetch_interval_minutes: 120,
    config: { domain: "empregabrasil.mte.gov.br" }
  },
  {
    name: "Vagas.com.br Santa Catarina",
    url: "https://www.vagas.com.br/vagas-em-santa-catarina",
    type: "jobs_portal",
    category: "jobs",
    region: "SC",
    priority: 9,
    fetch_interval_minutes: 60,
    config: { domain: "vagas.com.br" }
  },
  {
    name: "Vagas.com.br Chapecó",
    url: "https://www.vagas.com.br/vagas-em-chapeco",
    type: "jobs_portal",
    category: "jobs",
    region: "Chapecó/SC",
    priority: 10,
    fetch_interval_minutes: 60,
    config: { domain: "vagas.com.br" }
  },
  {
    name: "InfoJobs Chapecó e Região",
    url: "https://www.infojobs.com.br/empregos-em-chapeco,-sc.aspx",
    type: "jobs_portal",
    category: "jobs",
    region: "Chapecó/SC",
    priority: 9,
    fetch_interval_minutes: 60,
    config: { domain: "infojobs.com.br" }
  },
  {
    name: "Sine Fácil Chapecó",
    url: "https://www.sine.net.br/vagas-empregos-em-chapeco-sc",
    type: "jobs_portal",
    category: "jobs",
    region: "Chapecó/SC",
    priority: 9,
    fetch_interval_minutes: 60,
    config: { domain: "sine.net.br" }
  },
  {
    name: "ACIC Chapecó Banco de Talentos",
    url: "https://www.acichapeco.com.br/banco-de-talentos",
    type: "jobs_portal",
    category: "jobs",
    region: "Chapecó/SC",
    priority: 9,
    fetch_interval_minutes: 120,
    config: { domain: "acichapeco.com.br" }
  },
  {
    name: "Trabalha Brasil Chapecó",
    url: "https://www.trabalhabrasil.com.br/vagas-empregos-em-chapeco-sc",
    type: "jobs_portal",
    category: "jobs",
    region: "Chapecó/SC",
    priority: 8,
    fetch_interval_minutes: 60,
    config: { domain: "trabalhabrasil.com.br" }
  },
  {
    name: "Remotar Vagas de Trabalho Remoto",
    url: "https://remotar.com.br/feed",
    type: "rss",
    category: "jobs_remote",
    region: "BR",
    priority: 8,
    fetch_interval_minutes: 60,
    config: { website_url: "https://remotar.com.br/" }
  },
  {
    name: "Coodesh Vagas Tech Brasil",
    url: "https://coodesh.com/vagas",
    type: "jobs_portal",
    category: "jobs_tech",
    region: "BR",
    priority: 7,
    fetch_interval_minutes: 120,
    config: { domain: "coodesh.com" }
  },

  // ── 5. EDITAIS PÚBLICOS, LICITAÇÕES & DIÁRIOS OFICIAIS (TENDERS) ────────────
  {
    name: "PNCP - Portal Nacional de Contratações Públicas",
    url: "https://pncp.gov.br/app/editais",
    type: "tenders",
    category: "government_tenders",
    region: "BR",
    priority: 10,
    fetch_interval_minutes: 60,
    config: { domain: "pncp.gov.br" }
  },
  {
    name: "Diário Oficial dos Municípios de Santa Catarina (DOM/SC)",
    url: "https://www.diariomunicipal.sc.gov.br/",
    type: "tenders",
    category: "official_gazette",
    region: "SC",
    priority: 10,
    fetch_interval_minutes: 60,
    config: { domain: "diariomunicipal.sc.gov.br" }
  },
  {
    name: "Compras Governamentais Compras.gov.br",
    url: "https://www.gov.br/compras/pt-br",
    type: "tenders",
    category: "government_tenders",
    region: "BR",
    priority: 9,
    fetch_interval_minutes: 60,
    config: { domain: "gov.br" }
  },
  {
    name: "Portal de Editais Prefeitura de Chapecó",
    url: "https://chapeco.sc.gov.br/editais",
    type: "tenders",
    category: "municipal_tenders",
    region: "Chapecó/SC",
    priority: 10,
    fetch_interval_minutes: 60,
    config: { domain: "chapeco.sc.gov.br" }
  },
  {
    name: "Portal de Compras do Governo de SC",
    url: "https://portaldecompras.sc.gov.br/",
    type: "tenders",
    category: "state_tenders",
    region: "SC",
    priority: 9,
    fetch_interval_minutes: 60,
    config: { domain: "portaldecompras.sc.gov.br" }
  },
  {
    name: "Licitações Prefeitura de Xanxerê",
    url: "https://xanxere.sc.gov.br/licitacoes/",
    type: "tenders",
    category: "municipal_tenders",
    region: "Xanxerê/SC",
    priority: 8,
    fetch_interval_minutes: 120,
    config: { domain: "xanxere.sc.gov.br" }
  },
  {
    name: "Licitações Prefeitura de Concórdia",
    url: "https://concordia.sc.gov.br/licitacoes/",
    type: "tenders",
    category: "municipal_tenders",
    region: "Concórdia/SC",
    priority: 8,
    fetch_interval_minutes: 120,
    config: { domain: "concordia.sc.gov.br" }
  },
  {
    name: "Licitações Prefeitura de Joaçaba",
    url: "https://joacaba.sc.gov.br/licitacoes/",
    type: "tenders",
    category: "municipal_tenders",
    region: "Joaçaba/SC",
    priority: 8,
    fetch_interval_minutes: 120,
    config: { domain: "joacaba.sc.gov.br" }
  },
  {
    name: "Licitações Prefeitura de São Miguel do Oeste",
    url: "https://saomiguel.sc.gov.br/licitacoes/",
    type: "tenders",
    category: "municipal_tenders",
    region: "São Miguel do Oeste/SC",
    priority: 8,
    fetch_interval_minutes: 120,
    config: { domain: "saomiguel.sc.gov.br" }
  },
  {
    name: "BLL Compras (Bolsa de Licitações e Leilões)",
    url: "https://bllcompras.com/",
    type: "tenders",
    category: "tenders_b2g",
    region: "BR",
    priority: 8,
    fetch_interval_minutes: 120,
    config: { domain: "bllcompras.com" }
  },

  // ── 6. LEILÕES JUDICIAIS & EXTRAJUDICIAIS (AUCTIONS) ────────────────────────
  {
    name: "Superbid Brasil Leilões",
    url: "https://www.superbid.net/",
    type: "auctions",
    category: "auctions",
    region: "BR",
    priority: 9,
    fetch_interval_minutes: 60,
    config: { domain: "superbid.net" }
  },
  {
    name: "Mega Leilões Judiciais e Imóveis",
    url: "https://www.megaleiloes.com.br/",
    type: "auctions",
    category: "auctions",
    region: "BR",
    priority: 9,
    fetch_interval_minutes: 60,
    config: { domain: "megaleiloes.com.br" }
  },
  {
    name: "Sold Leilões",
    url: "https://www.sold.com.br/",
    type: "auctions",
    category: "auctions",
    region: "BR",
    priority: 8,
    fetch_interval_minutes: 60,
    config: { domain: "sold.com.br" }
  },
  {
    name: "Pestana Leilões RS/SC",
    url: "https://www.leiloes.com.br/",
    type: "auctions",
    category: "auctions",
    region: "Sul/BR",
    priority: 9,
    fetch_interval_minutes: 60,
    config: { domain: "leiloes.com.br" }
  },
  {
    name: "Baldissera Leiloeiros (Oficial Chapecó/SC)",
    url: "https://www.baldisserapregoeiro.com.br/",
    type: "auctions",
    category: "auctions_judicial",
    region: "Chapecó/SC",
    priority: 10,
    fetch_interval_minutes: 60,
    config: { domain: "baldisserapregoeiro.com.br" }
  },
  {
    name: "Central Sul de Leilões SC",
    url: "https://www.centralsuldeleiloes.com.br/",
    type: "auctions",
    category: "auctions",
    region: "SC",
    priority: 8,
    fetch_interval_minutes: 120,
    config: { domain: "centralsuldeleiloes.com.br" }
  },
  {
    name: "Kronberg Leilões",
    url: "https://www.kronbergleiloes.com.br/",
    type: "auctions",
    category: "auctions",
    region: "Sul/BR",
    priority: 8,
    fetch_interval_minutes: 120,
    config: { domain: "kronbergleiloes.com.br" }
  },
  {
    name: "Daniel Garcia Leilões Judiciais SC",
    url: "https://www.danielgarcialeiloes.com.br/",
    type: "auctions",
    category: "auctions_judicial",
    region: "SC",
    priority: 9,
    fetch_interval_minutes: 60,
    config: { domain: "danielgarcialeiloes.com.br" }
  },

  // ── 7. IMÓVEIS & OPORTUNIDADES IMOBILIÁRIAS (REAL ESTATE) ────────────────────
  {
    name: "Chapecó Imóveis Portal Local",
    url: "https://www.chapecoimoveis.com.br/",
    type: "real_estate",
    category: "real_estate",
    region: "Chapecó/SC",
    priority: 9,
    fetch_interval_minutes: 120,
    config: { domain: "chapecoimoveis.com.br" }
  },
  {
    name: "Imobiliária Nostra Casa Chapecó",
    url: "https://www.nostracasa.com.br/",
    type: "real_estate",
    category: "real_estate",
    region: "Chapecó/SC",
    priority: 9,
    fetch_interval_minutes: 120,
    config: { domain: "nostracasa.com.br" }
  },
  {
    name: "Plaza Imóveis Chapecó",
    url: "https://www.plazaimoveis.com.br/",
    type: "real_estate",
    category: "real_estate",
    region: "Chapecó/SC",
    priority: 8,
    fetch_interval_minutes: 120,
    config: { domain: "plazaimoveis.com.br" }
  },
  {
    name: "Imobiliária Santa Maria Chapecó",
    url: "https://www.imobiliariasantamaria.com.br/",
    type: "real_estate",
    category: "real_estate",
    region: "Chapecó/SC",
    priority: 8,
    fetch_interval_minutes: 120,
    config: { domain: "imobiliariasantamaria.com.br" }
  },
  {
    name: "ZAP Imóveis Chapecó",
    url: "https://www.zapimoveis.com.br/venda/imoveis/sc+chapeco/",
    type: "real_estate",
    category: "real_estate",
    region: "Chapecó/SC",
    priority: 9,
    fetch_interval_minutes: 120,
    config: { domain: "zapimoveis.com.br" }
  },
  {
    name: "VivaReal Chapecó",
    url: "https://www.vivareal.com.br/venda/santa-catarina/chapeco/",
    type: "real_estate",
    category: "real_estate",
    region: "Chapecó/SC",
    priority: 9,
    fetch_interval_minutes: 120,
    config: { domain: "vivareal.com.br" }
  }
];

async function runCrawlerSeed() {
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("  OMNI-CRAWLER V127: INICIANDO INJEÇÃO MASSIVA DE SEMENTES & FONTES    ");
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log(`Catálogo de fontes a injetar: ${CRAWLER_SEEDS_CATALOG.length} alvos.`);

  let insertedCount = 0;
  let errorCount = 0;
  let enqueuedCount = 0;

  for (const source of CRAWLER_SEEDS_CATALOG) {
    try {
      const { data, error } = await supabase
        .from("crawler_sources")
        .upsert({
          name: source.name,
          url: source.url,
          type: source.type,
          category: source.category,
          region: source.region,
          priority: source.priority,
          fetch_interval_minutes: source.fetch_interval_minutes,
          config: source.config || {},
          is_active: true,
          status: "idle",
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "url",
        })
        .select("id")
        .single();

      if (error) {
        console.error(`[ERRO ao inserir fonte] ${source.name} (${source.url}): ${error.message}`);
        errorCount++;
        continue;
      }

      insertedCount++;
      const sourceId = data?.id;

      // Se a prioridade for alta (>= 8) ou for jobs/tenders/news, enfileira imediatamente na crawl_queue
      if (source.priority >= 8) {
        let domain = "";
        try {
          domain = new URL(source.url).hostname.replace("www.", "");
        } catch {
          domain = "unknown";
        }

        const { error: queueErr } = await supabase
          .from("crawl_queue")
          .upsert({
            url: source.url,
            domain: domain,
            priority: source.priority,
            entity_type: source.type,
            status: "pending",
            source_id: sourceId,
            content_type: source.type === "rss" ? "rss_xml" : "html_page",
            discovered_via: "big_bang_seed",
            depth: 0,
            retry_count: 0,
            max_retries: 3,
            metadata: {
              source_name: source.name,
              category: source.category,
              region: source.region,
              seed_batch: "v127_init",
            }
          }, {
            onConflict: "url",
            ignoreDuplicates: true,
          });

        if (!queueErr) {
          enqueuedCount++;
        }
      }
    } catch (e) {
      console.error(`Exceção ao processar fonte ${source.name}:`, e.message);
      errorCount++;
    }
  }

  console.log("\n───────────────────────────────────────────────────────────────────────");
  console.log("  RESULTADO DA INJEÇÃO MASSIVA:");
  console.log(`  • Fontes processadas em crawler_sources: ${insertedCount}`);
  console.log(`  • Erros durante inserção: ${errorCount}`);
  console.log(`  • Itens prioritários enfileirados em crawl_queue: ${enqueuedCount}`);
  console.log("═══════════════════════════════════════════════════════════════════════\n");
}

runCrawlerSeed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Falha crítica no seed:", err);
    process.exit(1);
  });
