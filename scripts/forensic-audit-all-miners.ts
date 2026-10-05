/**
 * forensic-audit-all-miners.ts
 * Auditoria Forense Completa — Execução Real ao Vivo de Todos os Miners
 *
 * Executa cada engine, harvester e extractor individualmente,
 * captura saída raw sem maquiagem e gera relatório de gaps.
 *
 * Uso: npx tsx scripts/forensic-audit-all-miners.ts
 */

import fs from "fs";
import dotenv from "dotenv";

if (fs.existsSync(".env.local")) dotenv.config({ path: ".env.local" });
if (fs.existsSync(".env.secrets")) dotenv.config({ path: ".env.secrets" });
if (fs.existsSync(".env")) dotenv.config({ path: ".env" });

if (!process.env.VITE_SUPABASE_URL && process.env.SUPABASE_URL) {
  process.env.VITE_SUPABASE_URL = process.env.SUPABASE_URL;
}
if (!process.env.VITE_SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY) {
  process.env.VITE_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTS (cada engine/harvester individualmente)
// ─────────────────────────────────────────────────────────────────────────────
import { getServerClient } from "../src/lib/supabase";
import { fetchAllMarketIndicators } from "../src/lib/mining/market-data-miner.engine";
import { parseFeed, discoverFeeds } from "../src/lib/mining/rss-ingester.engine";
import { fetchBrasilApiCnpj } from "../src/lib/mining/cnpj-enrichment.engine";
import { classifyMinedEntity } from "../src/lib/mining/intent-classifier.engine";
import { identifySocialUrl, extractSocialMetadata } from "../src/lib/mining/social-content-miner.engine";
import { scrapeUrl } from "../src/lib/mining/firecrawl-client";
import { normalizeUrl } from "../src/lib/mining/url-canonicalizer";
import { syncAndPersistEconomicIndicators } from "../src/services/mining/economic-indicators-persister";
import { harvestAndPersistPncpTenders } from "../src/services/mining/pncp-harvester";
import { fetchPncpContracts } from "../src/services/mining/pncp-extractor";
import { extractAndPersistJobOpportunity } from "../src/services/mining/job-opportunity-extractor";
import { harvestAndPersistPlaces } from "../src/services/mining/places-harvester";
import { harvestAndPersistDataJudProcess } from "../src/services/mining/datajud-harvester";
import { crossEnrichListingsWithCnpj } from "../src/services/mining/places-cnpj-cross-enricher";
import { detectStoryCluster } from "../src/services/mining/semantic-deduplicator";
import { executeCrawlQueueBatchDirect } from "../src/services/mining/crawler-batch-engine";
import { harvestAndPersistRealEstate } from "../src/services/mining/real-estate-harvester";
import { harvestAndPersistAuctions } from "../src/services/mining/auction-harvester";
import { extractContentMechanically } from "../src/services/mining/mechanical-extractor";
import { validateMechanicalCompleteness } from "../src/services/mining/integrity-gate";
import { extractRecipeFromJsonLd, extractEventFromJsonLd } from "../src/services/mining/specialized-extractors";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────
interface AuditEntry {
  engine: string;
  layer: "engine" | "harvester" | "extractor";
  status: "OK" | "ERROR" | "PARTIAL" | "TIMEOUT";
  latencyMs: number;
  rawOutput: unknown;
  nullFields: string[];
  errorMessage?: string;
  httpStatusCodes?: number[];
  recordCount?: number;
  gaps: string[];
  improvements: string[];
}

const REPORT: AuditEntry[] = [];
const supabase = getServerClient();

function sep(label: string) {
  console.log(`\n${"═".repeat(80)}`);
  console.log(`  ${label}`);
  console.log("═".repeat(80));
}

function log(msg: string) {
  process.stdout.write(msg + "\n");
}

function findNullFields(obj: unknown, prefix = ""): string[] {
  const nulls: string[] = [];
  if (obj == null || typeof obj !== "object") return nulls;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) {
      nulls.push(key);
    } else if (typeof v === "object" && !Array.isArray(v)) {
      nulls.push(...findNullFields(v, key));
    }
  }
  return nulls;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timer = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout ${ms}ms`)), ms)
  );
  return Promise.race([promise, timer]);
}

// ─────────────────────────────────────────────────────────────────────────────
// A1: MARKET DATA MINER ENGINE (BCB Olinda)
// ─────────────────────────────────────────────────────────────────────────────
async function auditMarketDataEngine() {
  sep("A1 · market-data-miner.engine.ts — BCB Olinda OData");
  const t0 = Date.now();
  const entry: AuditEntry = {
    engine: "market-data-miner.engine",
    layer: "engine",
    status: "ERROR",
    latencyMs: 0,
    rawOutput: null,
    nullFields: [],
    gaps: [],
    improvements: [],
  };

  try {
    const result = await withTimeout(fetchAllMarketIndicators(), 20000);
    entry.latencyMs = Date.now() - t0;
    entry.rawOutput = result;
    entry.recordCount = Array.isArray(result) ? result.length : 0;
    entry.status = Array.isArray(result) && result.length > 0 ? "OK" : "PARTIAL";
    entry.nullFields = Array.isArray(result) && result[0] ? findNullFields(result[0]) : [];

    log(`Indicadores retornados: ${entry.recordCount}`);
    if (Array.isArray(result) && result.length > 0) {
      log(`Sample[0]: ${JSON.stringify(result[0], null, 2)}`);
      // Análise de gaps
      const sample = result[0] as Record<string, unknown>;
      if (Array.isArray(sample.timeSeries) && sample.timeSeries.length === 0)
        entry.gaps.push("timeSeries vazia — histórico sem dados");
      if (sample.variationPercent == null)
        entry.gaps.push("variationPercent null — variação não calculada");
    } else {
      entry.gaps.push("NENHUM indicador retornado — API offline ou sem dados no período");
    }

    entry.improvements = [
      "Adicionar IGP-DI (código 190) e INCC (192)",
      "Incluir Taxa CDI (série 12) e Taxa IPCA-15 (série 13522)",
      "Calcular variação 30d vs 12m para contexto de inflação",
      "Cache Redis/KV com TTL=3h para evitar rate limit BCB",
      "Webhook para alertar quando Selic muda (critical event)",
    ];
  } catch (err: unknown) {
    entry.latencyMs = Date.now() - t0;
    entry.status = "ERROR";
    entry.errorMessage = String(err);
    entry.gaps.push(`ERRO: ${entry.errorMessage}`);
    log(`ERRO: ${entry.errorMessage}`);
  }

  REPORT.push(entry);
}

// ─────────────────────────────────────────────────────────────────────────────
// A2: ECONOMIC INDICATORS PERSISTER (BCB → Supabase)
// ─────────────────────────────────────────────────────────────────────────────
async function auditEconomicPersister() {
  sep("A2 · economic-indicators-persister.ts — BCB → Supabase");
  const t0 = Date.now();
  const entry: AuditEntry = {
    engine: "economic-indicators-persister",
    layer: "harvester",
    status: "ERROR",
    latencyMs: 0,
    rawOutput: null,
    nullFields: [],
    gaps: [],
    improvements: [],
  };

  try {
    const result = await withTimeout(syncAndPersistEconomicIndicators(), 25000);
    entry.latencyMs = Date.now() - t0;
    entry.rawOutput = result;
    entry.recordCount = (result as Record<string, unknown>).totalSynced as number;
    entry.status = (result as Record<string, unknown>).success ? "OK" : "PARTIAL";
    entry.nullFields = findNullFields(result);
    log(`Resultado: ${JSON.stringify(result, null, 2)}`);

    // Validar persistência
    const { data: dbRows, error: dbErr } = await supabase
      .from("economic_indicators")
      .select("code, name, current_value, reference_date, updated_at")
      .order("updated_at", { ascending: false })
      .limit(5);
    log(`\nDB economic_indicators (últimos 5):`);
    log(JSON.stringify(dbRows, null, 2));
    if (dbErr) entry.gaps.push(`DB query error: ${dbErr.message}`);
    if (!dbRows || dbRows.length === 0) entry.gaps.push("Tabela economic_indicators vazia após sync");

    entry.improvements = [
      "Adicionar campo 'forecast_median' com expectativa Focus BCB",
      "Persistir série temporal completa (30 pontos) em JSONB",
      "Trigger de notificação quando variação > 5%",
      "Dashboard endpoint para frontend sem re-fetch BCB",
    ];
  } catch (err: unknown) {
    entry.latencyMs = Date.now() - t0;
    entry.status = "ERROR";
    entry.errorMessage = String(err);
    entry.gaps.push(`ERRO: ${entry.errorMessage}`);
    log(`ERRO: ${entry.errorMessage}`);
  }

  REPORT.push(entry);
}

// ─────────────────────────────────────────────────────────────────────────────
// B1: RSS INGESTER ENGINE
// ─────────────────────────────────────────────────────────────────────────────
async function auditRssIngesterEngine() {
  sep("B1 · rss-ingester.engine.ts — Feed G1 SC e Portais Locais");

  const RSS_FEEDS = [
    "https://g1.globo.com/rss/g1/sc/",
    "https://www.nsctotal.com.br/feed",
    "https://www.rbs.com.br/santacatarina/feed/",
    "https://www.diariocatarinense.com.br/rss",
    "https://chapecoonline.com.br/feed",
  ];

  for (const feedUrl of RSS_FEEDS) {
    const t0 = Date.now();
    const entry: AuditEntry = {
      engine: `rss-ingester [${new URL(feedUrl).hostname}]`,
      layer: "engine",
      status: "ERROR",
      latencyMs: 0,
      rawOutput: null,
      nullFields: [],
      gaps: [],
      improvements: [],
    };

    try {
      const result = await withTimeout(parseFeed(feedUrl), 12000);
      entry.latencyMs = Date.now() - t0;
      entry.rawOutput = { feedTitle: result.title, itemCount: result.items.length, sample: result.items[0] };
      entry.recordCount = result.items.length;
      entry.status = result.items.length > 0 ? "OK" : "PARTIAL";
      entry.nullFields = result.items[0] ? findNullFields(result.items[0]) : ["ALL_FIELDS"];
      log(`[${new URL(feedUrl).hostname}] ${result.items.length} itens | latência: ${Date.now() - t0}ms`);
      if (result.items[0]) log(`  Sample: ${JSON.stringify(result.items[0], null, 2)}`);
      if (result.items.length === 0) entry.gaps.push("Feed retornou 0 itens — possível erro de parsing XML");
      if (result.items.some((i) => i.imageUrl == null)) entry.gaps.push("Muitos itens sem imageUrl — impacta UI");
    } catch (err: unknown) {
      entry.latencyMs = Date.now() - t0;
      entry.status = "ERROR";
      entry.errorMessage = String(err);
      entry.gaps.push(`ERRO: ${entry.errorMessage}`);
      log(`[${new URL(feedUrl).hostname}] ERRO: ${entry.errorMessage}`);
    }

    entry.improvements = [
      "Parser de Atom feed além de RSS 2.0",
      "Extração de imagem OG como fallback de imageUrl",
      "Categorização automática via intent-classifier",
      "Deduplicação por guid + URL canônica",
      "Score de relevância local (menciona Chapecó/SC?)",
    ];
    REPORT.push(entry);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// B2: DISCOVER FEEDS
// ─────────────────────────────────────────────────────────────────────────────
async function auditDiscoverFeeds() {
  sep("B2 · rss-ingester.engine.ts — discoverFeeds() em site local");
  const t0 = Date.now();
  const entry: AuditEntry = {
    engine: "rss-ingester.discoverFeeds",
    layer: "engine",
    status: "ERROR",
    latencyMs: 0,
    rawOutput: null,
    nullFields: [],
    gaps: [],
    improvements: [],
  };

  try {
    const result = await withTimeout(discoverFeeds("https://chapecoonline.com.br"), 12000);
    entry.latencyMs = Date.now() - t0;
    entry.rawOutput = result;
    entry.recordCount = result.length;
    entry.status = result.length > 0 ? "OK" : "PARTIAL";
    log(`Feeds descobertos: ${JSON.stringify(result, null, 2)}`);
    if (result.length === 0) entry.gaps.push("Auto-discovery retornou 0 feeds — sem <link type='application/rss+xml'> no HTML");

    entry.improvements = [
      "Tentar /feed, /rss, /atom como fallback quando auto-discovery falha",
      "Salvar feeds descobertos automaticamente em rss_feeds do banco",
      "Periodicidade de re-discovery a cada 7 dias",
    ];
  } catch (err: unknown) {
    entry.latencyMs = Date.now() - t0;
    entry.status = "ERROR";
    entry.errorMessage = String(err);
    entry.gaps.push(`ERRO: ${entry.errorMessage}`);
    log(`ERRO: ${entry.errorMessage}`);
  }

  REPORT.push(entry);
}

// ─────────────────────────────────────────────────────────────────────────────
// C1: CNPJ ENRICHMENT ENGINE (BrasilAPI)
// ─────────────────────────────────────────────────────────────────────────────
async function auditCnpjEnrichmentEngine() {
  sep("C1 · cnpj-enrichment.engine.ts — BrasilAPI CNPJ");

  // CNPJs reais de Chapecó/SC
  const CNPJS = [
    "83102572000107", // Prefeitura Municipal de Chapecó
    "10643978000153", // Chapecoense (clube)
    "00000000000191", // Banco do Brasil
  ];

  for (const cnpj of CNPJS) {
    const t0 = Date.now();
    const entry: AuditEntry = {
      engine: `cnpj-enrichment [${cnpj.slice(0, 8)}...]`,
      layer: "engine",
      status: "ERROR",
      latencyMs: 0,
      rawOutput: null,
      nullFields: [],
      gaps: [],
      improvements: [],
    };

    try {
      const result = await withTimeout(fetchBrasilApiCnpj(cnpj), 12000);
      entry.latencyMs = Date.now() - t0;
      entry.rawOutput = result;
      entry.status = result != null ? "OK" : "PARTIAL";
      entry.nullFields = result ? findNullFields(result) : ["RESULT_NULL"];
      log(`CNPJ ${cnpj}: ${JSON.stringify(result, null, 2)}`);
      if (result == null) entry.gaps.push(`CNPJ ${cnpj} retornou null — API indisponível ou CNPJ inativo`);
      if (result && (result as Record<string, unknown>).qualityScore != null) {
        const score = (result as Record<string, unknown>).qualityScore as number;
        if (score < 50) entry.gaps.push(`qualityScore ${score}% abaixo de 50% — dados incompletos`);
      }
    } catch (err: unknown) {
      entry.latencyMs = Date.now() - t0;
      entry.status = "ERROR";
      entry.errorMessage = String(err);
      entry.gaps.push(`ERRO: ${entry.errorMessage}`);
      log(`CNPJ ${cnpj} ERRO: ${entry.errorMessage}`);
    }

    entry.improvements = [
      "Cascading: BrasilAPI → ReceitaWS → CNPJ.JA como fallback",
      "Cache local com TTL=24h para evitar rate limit",
      "Enriquecer com CNAE secundário + situação cadastral",
      "Filtrar CNPJs inativos (situação !== 'ATIVA') antes de persistir",
      "Score de qualidade ponderado por campos críticos (telefone, email, cnae)",
    ];
    REPORT.push(entry);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// D1: INTENT CLASSIFIER ENGINE
// ─────────────────────────────────────────────────────────────────────────────
async function auditIntentClassifier() {
  sep("D1 · intent-classifier.engine.ts — Classificação de Entidades");

  const TEST_CASES = [
    { url: "https://g1.globo.com/sc/santa-catarina/noticia/2026/10/acidente-na-br-282.html", expectedType: "news" },
    { url: "https://vagas.com.br/vagas/v2123456789/analista-de-suporte-chapeco", expectedType: "job" },
    { url: "https://americanas.com.br/produto/celular-samsung-a55", expectedType: "product" },
    { url: "https://sympla.com.br/evento/forro-chapeco-outubro/234567", expectedType: "event" },
    { url: "https://chapecoonline.com.br/empresa/supermercado-bello", expectedType: "business" },
  ];

  for (const tc of TEST_CASES) {
    const t0 = Date.now();
    const entry: AuditEntry = {
      engine: `intent-classifier [${tc.expectedType}]`,
      layer: "engine",
      status: "ERROR",
      latencyMs: 0,
      rawOutput: null,
      nullFields: [],
      gaps: [],
      improvements: [],
    };

    try {
      const result = await withTimeout(
        classifyMinedEntity(tc.url, { title: "", text: "" }),
        10000
      );
      entry.latencyMs = Date.now() - t0;
      entry.rawOutput = result;
      entry.status = "OK";
      const hit = (result as Record<string, unknown>).entityType === tc.expectedType;
      log(`URL: ${tc.url}`);
      log(`Esperado: ${tc.expectedType} | Obtido: ${(result as Record<string, unknown>).entityType} | Confiança: ${(result as Record<string, unknown>).confidence} | ${hit ? "✓ CORRETO" : "✗ ERRADO"}`);
      if (!hit) entry.gaps.push(`Classificação errada: esperado '${tc.expectedType}', obtido '${(result as Record<string, unknown>).entityType}'`);
      if ((result as Record<string, unknown>).confidence as number < 0.6) entry.gaps.push(`Baixa confiança: ${(result as Record<string, unknown>).confidence} — pode ativar fallback AI desnecessariamente`);
    } catch (err: unknown) {
      entry.latencyMs = Date.now() - t0;
      entry.status = "ERROR";
      entry.errorMessage = String(err);
      entry.gaps.push(`ERRO: ${entry.errorMessage}`);
      log(`ERRO: ${entry.errorMessage}`);
    }

    entry.improvements = [
      "Adicionar Camada 2.5: análise de title+H1 com regex antes do AI fallback",
      "Cache de classificações por URL hash para evitar re-classificar a mesma URL",
      "Treinar regras específicas para portais locais catarinenses",
      "Adicionar tipo 'recipe', 'real_estate', 'auction' ao enum MinedEntityType",
      "Métricas de acurácia por tipo no scraper_audit_log",
    ];
    REPORT.push(entry);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// E1: SOCIAL CONTENT MINER ENGINE
// ─────────────────────────────────────────────────────────────────────────────
async function auditSocialContentMiner() {
  sep("E1 · social-content-miner.engine.ts — Perfis Sociais");

  const TEST_URLS = [
    "https://www.instagram.com/chapecoense",
    "https://www.youtube.com/@chapecoense",
    "https://www.linkedin.com/company/waesy",
  ];

  for (const url of TEST_URLS) {
    const t0 = Date.now();
    const entry: AuditEntry = {
      engine: `social-content-miner [${url.includes("instagram") ? "instagram" : url.includes("youtube") ? "youtube" : "linkedin"}]`,
      layer: "engine",
      status: "ERROR",
      latencyMs: 0,
      rawOutput: null,
      nullFields: [],
      gaps: [],
      improvements: [],
    };

    try {
      const parsed = identifySocialUrl(url);
      log(`Parsed: ${JSON.stringify(parsed)}`);

      const result = await withTimeout(extractSocialMetadata(url), 15000);
      entry.latencyMs = Date.now() - t0;
      entry.rawOutput = { parsed, metadata: result };
      entry.status = result != null ? "OK" : "PARTIAL";
      entry.nullFields = result ? findNullFields(result) : ["RESULT_NULL"];
      log(`Metadata: ${JSON.stringify(result, null, 2)}`);
      if (result == null) entry.gaps.push("Metadados null — bloqueio de anti-bot ou página protegida");
      if (result && (result as Record<string, unknown>).description == null) entry.gaps.push("description null — bio não extraída");
    } catch (err: unknown) {
      entry.latencyMs = Date.now() - t0;
      entry.status = "ERROR";
      entry.errorMessage = String(err);
      entry.gaps.push(`ERRO: ${entry.errorMessage}`);
      log(`ERRO: ${entry.errorMessage}`);
    }

    entry.improvements = [
      "Instagram: usar endpoint /api/v1/users/web_profile_info/ via cookie autenticado",
      "YouTube: YouTube Data API v3 com chave gratuita (quota 10k/dia)",
      "LinkedIn: scraping via Nitter/cache proxy para evitar bot block",
      "TikTok: oembed API pública para métricas de vídeos",
      "Persistir em store_social_profiles ou directory_listings.social_links",
      "Score de engajamento calculado de followers + posts recentes",
    ];
    REPORT.push(entry);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// F1: SCRAPE URL (Firecrawl Client)
// ─────────────────────────────────────────────────────────────────────────────
async function auditFirecrawlClient() {
  sep("F1 · firecrawl-client.ts — scrapeUrl() ao Vivo");

  const URLS = [
    "https://chapecoonline.com.br",
    "https://g1.globo.com/sc/santa-catarina/",
    "https://pncp.gov.br/app/editais",
  ];

  for (const url of URLS) {
    const t0 = Date.now();
    const entry: AuditEntry = {
      engine: `firecrawl-client [${new URL(url).hostname}]`,
      layer: "engine",
      status: "ERROR",
      latencyMs: 0,
      rawOutput: null,
      nullFields: [],
      gaps: [],
      improvements: [],
      httpStatusCodes: [],
    };

    try {
      const result = await withTimeout(scrapeUrl(url), 20000);
      entry.latencyMs = Date.now() - t0;
      entry.rawOutput = {
        success: (result as Record<string, unknown>).success,
        htmlLength: (result as Record<string, unknown>).html ? String((result as Record<string, unknown>).html).length : 0,
        hasMarkdown: (result as Record<string, unknown>).markdown != null,
        error: (result as Record<string, unknown>).error,
      };
      entry.status = (result as Record<string, unknown>).success ? "OK" : "PARTIAL";
      log(`[${new URL(url).hostname}] success=${(result as Record<string, unknown>).success} | htmlLen=${entry.rawOutput.htmlLength} | latência=${entry.latencyMs}ms`);
      if ((result as Record<string, unknown>).error) {
        entry.gaps.push(`Erro scrape: ${(result as Record<string, unknown>).error}`);
        log(`  Erro: ${(result as Record<string, unknown>).error}`);
      }
      if (entry.rawOutput.htmlLength < 500) entry.gaps.push("HTML muito curto (<500 chars) — possível página bloqueada ou redirect");
    } catch (err: unknown) {
      entry.latencyMs = Date.now() - t0;
      entry.status = "ERROR";
      entry.errorMessage = String(err);
      entry.gaps.push(`ERRO: ${entry.errorMessage}`);
      log(`ERRO: ${entry.errorMessage}`);
    }

    entry.improvements = [
      "Jina Reader fallback já implementado — verificar se está ativo",
      "Circuit breaker por domínio: já implementado via globalCrawlerCircuitBreaker",
      "Rotação de User-Agent mais agressiva (mobile, tablet, bot-allowed)",
      "Proxy rotation para sites com rate limit por IP",
      "Cache de HTML por 1h para domínios frequentes",
      "Puppeteer/Playwright como último recurso para SPAs (ex: pncp.gov.br)",
    ];
    REPORT.push(entry);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// G1: MECHANICAL EXTRACTOR + INTEGRITY GATE
// ─────────────────────────────────────────────────────────────────────────────
async function auditMechanicalExtractor() {
  sep("G1 · mechanical-extractor.ts + integrity-gate.ts");

  const TEST_URLS = [
    "https://chapecoonline.com.br/",
    "https://g1.globo.com/sc/santa-catarina/noticia/2026/09/obra-em-chapeco.html",
  ];

  for (const url of TEST_URLS) {
    const t0 = Date.now();
    const entry: AuditEntry = {
      engine: `mechanical-extractor [${new URL(url).hostname}]`,
      layer: "extractor",
      status: "ERROR",
      latencyMs: 0,
      rawOutput: null,
      nullFields: [],
      gaps: [],
      improvements: [],
    };

    try {
      const result = await withTimeout(extractContentMechanically(url), 25000);
      entry.latencyMs = Date.now() - t0;
      const validation = validateMechanicalCompleteness(result as Parameters<typeof validateMechanicalCompleteness>[0]);
      entry.rawOutput = {
        title: (result as Record<string, unknown>).title,
        lead: String((result as Record<string, unknown>).lead ?? "").slice(0, 100),
        wordCount: (result as Record<string, unknown>).wordCount,
        qualityScore: (result as Record<string, unknown>).qualityScore,
        contentType: (result as Record<string, unknown>).contentType,
        hasImage: (result as Record<string, unknown>).coverImageUrl != null,
        paragraphCount: Array.isArray((result as Record<string, unknown>).paragraphs) ? ((result as Record<string, unknown>).paragraphs as unknown[]).length : 0,
        validationIsValid: validation.isValid,
        validationScore: validation.qualityScore,
      };
      entry.nullFields = findNullFields(result);
      entry.status = validation.isValid ? "OK" : "PARTIAL";
      log(`[${new URL(url).hostname}]`);
      log(JSON.stringify(entry.rawOutput, null, 2));
      if (!validation.isValid) entry.gaps.push(`Integrity Gate REPROVADO: ${validation.reason}`);
      if ((result as Record<string, unknown>).coverImageUrl == null) entry.gaps.push("coverImageUrl null — sem imagem de capa extraída");
    } catch (err: unknown) {
      entry.latencyMs = Date.now() - t0;
      entry.status = "ERROR";
      entry.errorMessage = String(err);
      entry.gaps.push(`ERRO: ${entry.errorMessage}`);
      log(`ERRO: ${entry.errorMessage}`);
    }

    entry.improvements = [
      "Extração de data de publicação com 4 padrões (JSON-LD, meta, OpenGraph, heurístico)",
      "Análise de paywall: se >50% do texto está hidden/blur, marcar como 'paywalled'",
      "Score de relevância local: boost se menciona 'Chapecó', 'SC', 'catarinense'",
      "Extração de autor com link para perfil e mini-bio",
      "Detecção de conteúdo publicitário (sponsored/advertorial) para filtrar",
    ];
    REPORT.push(entry);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// H1: PNCP EXTRACTOR + HARVESTER
// ─────────────────────────────────────────────────────────────────────────────
async function auditPncpHarvester() {
  sep("H1 · pncp-extractor.ts + pncp-harvester.ts — Licitações Públicas");
  const t0 = Date.now();
  const entry: AuditEntry = {
    engine: "pncp-harvester",
    layer: "harvester",
    status: "ERROR",
    latencyMs: 0,
    rawOutput: null,
    nullFields: [],
    gaps: [],
    improvements: [],
  };

  try {
    // 1. Raw extractor
    const contracts = await withTimeout(fetchPncpContracts({ municipioIbge: 4204202, pagina: 1, pageSize: 5 }), 20000);
    log(`fetchPncpContracts retornou ${contracts.length} contratos`);
    if (contracts.length > 0) {
      log(`Sample contrato[0]: ${JSON.stringify(contracts[0], null, 2)}`);
      entry.nullFields = findNullFields(contracts[0] as Record<string, unknown>);
      if (entry.nullFields.length > 0) log(`Campos nulos em contrato[0]: ${entry.nullFields.join(", ")}`);
    }

    // 2. Full harvester
    const result = await withTimeout(harvestAndPersistPncpTenders({ municipioIbge: 4204202, pagina: 1, pageSize: 10 }), 30000);
    entry.latencyMs = Date.now() - t0;
    entry.rawOutput = result;
    entry.recordCount = (result as Record<string, unknown>).insertedCount as number;
    entry.status = (result as Record<string, unknown>).success ? "OK" : "PARTIAL";
    log(`\nHarvester result: ${JSON.stringify(result, null, 2)}`);

    // 3. Validar DB
    const { data: rows, error } = await supabase
      .from("mined_tenders")
      .select("id, title, agency_name, modality, estimated_amount_cents, publication_date, portal_url")
      .order("created_at", { ascending: false })
      .limit(3);
    log(`\nDB mined_tenders (últimos 3):`);
    log(JSON.stringify(rows, null, 2));
    if (error) entry.gaps.push(`DB error: ${error.message}`);
    if (!rows || rows.length === 0) entry.gaps.push("mined_tenders vazia — nenhum edital persistido");

    // Checar campos nulos na DB
    if (rows && rows.length > 0) {
      const dbNulls = findNullFields(rows[0]);
      if (dbNulls.length > 0) entry.gaps.push(`Campos nulos no DB: ${dbNulls.join(", ")}`);
    }

    entry.improvements = [
      "Extrair items/lotes do edital (já existe fetchPncpContractItems) — integrar no payload mined_tenders",
      "Adicionar scraping do PDF do edital para extrair especificações técnicas",
      "Alertas automáticos para licitações de categorias estratégicas (obras, TI, saúde)",
      "Paginação automática até limite de 100 editais mais recentes",
      "Expandir para outros municípios da região (Xanxerê, Pinhalzinho, São Carlos)",
      "Campo 'status' computado: aberto, encerrado, suspenso (via data de encerramento)",
    ];
  } catch (err: unknown) {
    entry.latencyMs = Date.now() - t0;
    entry.status = "ERROR";
    entry.errorMessage = String(err);
    entry.gaps.push(`ERRO: ${entry.errorMessage}`);
    log(`ERRO: ${entry.errorMessage}`);
  }

  REPORT.push(entry);
}

// ─────────────────────────────────────────────────────────────────────────────
// I1: JOB OPPORTUNITY EXTRACTOR
// ─────────────────────────────────────────────────────────────────────────────
async function auditJobOpportunityExtractor() {
  sep("I1 · job-opportunity-extractor.ts — Vagas de Emprego");

  const JOB_URLS = [
    "https://www.vagas.com.br/vagas-em-chapeco-sc",
    "https://br.indeed.com/empregos-em-Chapecó,-SC",
    "https://www.catho.com.br/vagas-de-emprego/chapeco-sc/",
  ];

  for (const url of JOB_URLS) {
    const t0 = Date.now();
    const entry: AuditEntry = {
      engine: `job-opportunity-extractor [${new URL(url).hostname}]`,
      layer: "extractor",
      status: "ERROR",
      latencyMs: 0,
      rawOutput: null,
      nullFields: [],
      gaps: [],
      improvements: [],
    };

    try {
      // 1. Scrape HTML
      const scrapeResult = await withTimeout(scrapeUrl(url), 20000);
      if (scrapeResult.success === false || scrapeResult.html == null) {
        throw new Error(`Scrape falhou: ${scrapeResult.error}`);
      }
      log(`[${new URL(url).hostname}] HTML length: ${scrapeResult.html.length}`);

      // 2. Extrair vaga
      const result = await withTimeout(
        extractAndPersistJobOpportunity(scrapeResult.html, url),
        15000
      );
      entry.latencyMs = Date.now() - t0;
      entry.rawOutput = result;
      entry.status = (result as Record<string, unknown>).success ? "OK" : "PARTIAL";
      entry.nullFields = findNullFields(result);
      log(`Extraction result: ${JSON.stringify(result, null, 2)}`);
      if (!(result as Record<string, unknown>).success) entry.gaps.push(`Extração falhou: ${(result as Record<string, unknown>).error}`);
    } catch (err: unknown) {
      entry.latencyMs = Date.now() - t0;
      entry.status = "ERROR";
      entry.errorMessage = String(err);
      entry.gaps.push(`ERRO: ${entry.errorMessage}`);
      log(`ERRO: ${entry.errorMessage}`);
    }

    entry.improvements = [
      "Usar Indeed RSS feed (https://br.indeed.com/rss?q=chapeco&l=SC) em vez de HTML scraping",
      "Integrar API Catho (disponível via parceria) para vagas estruturadas",
      "Extrair múltiplas vagas de uma página-lista, não só a primeira",
      "Deduplicate por hash(título+empresa+cidade) com janela 7d",
      "Salário mínimo local por cargo (benchmarking com CAGED SC)",
      "Análise de demanda de habilidades (quais skills mais pedidas em Chapecó)",
    ];
    REPORT.push(entry);
  }

  // Validar DB
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, company_name, salary_min, workplace_type, external_url, created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  log(`\nDB jobs (últimos 5):`);
  log(JSON.stringify(jobs, null, 2));
}

// ─────────────────────────────────────────────────────────────────────────────
// J1: PLACES HARVESTER (OpenStreetMap / Overpass)
// ─────────────────────────────────────────────────────────────────────────────
async function auditPlacesHarvester() {
  sep("J1 · places-harvester.ts — OpenStreetMap / Overpass API");
  const t0 = Date.now();
  const entry: AuditEntry = {
    engine: "places-harvester",
    layer: "harvester",
    status: "ERROR",
    latencyMs: 0,
    rawOutput: null,
    nullFields: [],
    gaps: [],
    improvements: [],
  };

  try {
    const result = await withTimeout(
      harvestAndPersistPlaces({ query: "restaurante", city: "Chapecó", state: "SC" }),
      45000
    );
    entry.latencyMs = Date.now() - t0;
    entry.rawOutput = result;
    entry.recordCount = (result as Record<string, unknown>).totalInserted as number ?? 0;
    entry.status = (entry.recordCount as number) > 0 ? "OK" : "PARTIAL";
    log(`Resultado: ${JSON.stringify(result, null, 2)}`);

    // Validar DB
    const { data: places } = await supabase
      .from("directory_listings")
      .select("id, business_name, category, latitude, longitude, contact_phone, website_url")
      .order("created_at", { ascending: false })
      .limit(3);
    log(`\nDB directory_listings (últimos 3):`);
    log(JSON.stringify(places, null, 2));
    if (!places || places.length === 0) entry.gaps.push("directory_listings vazia — harvestAndPersistPlaces não persistiu");
    if (places && places[0]) {
      const dbNulls = findNullFields(places[0]);
      if (dbNulls.length > 0) entry.gaps.push(`Campos nulos no DB: ${dbNulls.join(", ")}`);
    }

    if ((result as Record<string, unknown>).totalInserted === 0) entry.gaps.push("0 lugares inseridos — Overpass timeout ou limite de rate");
  } catch (err: unknown) {
    entry.latencyMs = Date.now() - t0;
    entry.status = "ERROR";
    entry.errorMessage = String(err);
    entry.gaps.push(`ERRO: ${entry.errorMessage}`);
    log(`ERRO: ${entry.errorMessage}`);
  }

  entry.improvements = [
    "Expandir amenity tags: atm, bank, pharmacy, hospital, fuel, school, supermarket",
    "Adicionar coleta de horário de funcionamento (opening_hours tag do OSM)",
    "Score de completude por lugar: 100% se tem phone + website + category + coords",
    "Vincular automaticamente ao CNPJ enricher via cross-enricher",
    "Importar avaliações (Google Maps Places API gratuita tem 5k/mês)",
    "Salvar bbox das buscas para evitar re-fetch de área já coberta",
  ];
  REPORT.push(entry);
}

// ─────────────────────────────────────────────────────────────────────────────
// K1: DATAJUD HARVESTER (CNJ)
// ─────────────────────────────────────────────────────────────────────────────
async function auditDatajudHarvester() {
  sep("K1 · datajud-harvester.ts — CNJ DataJud Processos Judiciais");
  const t0 = Date.now();
  const entry: AuditEntry = {
    engine: "datajud-harvester",
    layer: "harvester",
    status: "ERROR",
    latencyMs: 0,
    rawOutput: null,
    nullFields: [],
    gaps: [],
    improvements: [],
  };

  // Número real de processo federal (TRF4 - SC/PR/RS)
  const TEST_PROCESS = "5006601-50.2026.4.04.9999";

  try {
    const result = await withTimeout(
      harvestAndPersistDataJudProcess({ processNumber: TEST_PROCESS }),
      30000
    );
    entry.latencyMs = Date.now() - t0;
    entry.rawOutput = result;
    entry.status = (result as Record<string, unknown>).success ? "OK" : "PARTIAL";
    entry.nullFields = findNullFields(result);
    log(`Resultado DataJud: ${JSON.stringify(result, null, 2)}`);
    if (!(result as Record<string, unknown>).success) entry.gaps.push(`DataJud falhou: ${(result as Record<string, unknown>).error}`);
  } catch (err: unknown) {
    entry.latencyMs = Date.now() - t0;
    entry.status = "ERROR";
    entry.errorMessage = String(err);
    entry.gaps.push(`ERRO CNJ: ${entry.errorMessage}`);
    log(`ERRO: ${entry.errorMessage}`);
  }

  // Validar DB
  const { data: lawsuits } = await supabase
    .from("mined_lawsuits")
    .select("id, process_number, court_name, class_name, status")
    .limit(5);
  log(`\nDB mined_lawsuits:`);
  log(JSON.stringify(lawsuits, null, 2));

  entry.improvements = [
    "Busca em massa por vara (unidade: 0018 = Chapecó) sem número de processo específico",
    "Alerta de processo para empresas cadastradas na plataforma (vincular por CNPJ)",
    "Extração de valor da causa e tipo de ação para análise de risco",
    "Pesquisa por CPF/CNPJ de partes em vez de número do processo",
    "Dashboard de processos ativos por empresa/nicho",
  ];
  REPORT.push(entry);
}

// ─────────────────────────────────────────────────────────────────────────────
// L1: REAL ESTATE HARVESTER
// ─────────────────────────────────────────────────────────────────────────────
async function auditRealEstateHarvester() {
  sep("L1 · real-estate-harvester.ts — Imobiliárias Locais");
  const t0 = Date.now();
  const entry: AuditEntry = {
    engine: "real-estate-harvester",
    layer: "harvester",
    status: "ERROR",
    latencyMs: 0,
    rawOutput: null,
    nullFields: [],
    gaps: [],
    improvements: [],
  };

  try {
    const result = await withTimeout(
      harvestAndPersistRealEstate({ url: "https://www.zapimoveis.com.br/comprar/imoveis/sc+chapeco/", city: "Chapecó", state: "SC" }),
      30000
    );
    entry.latencyMs = Date.now() - t0;
    entry.rawOutput = result;
    entry.status = (result as Record<string, unknown>).success ? "OK" : "PARTIAL";
    entry.nullFields = findNullFields(result);
    log(`Resultado: ${JSON.stringify(result, null, 2)}`);
    if (!(result as Record<string, unknown>).success) entry.gaps.push(`Harvest falhou: ${(result as Record<string, unknown>).error}`);
  } catch (err: unknown) {
    entry.latencyMs = Date.now() - t0;
    entry.status = "ERROR";
    entry.errorMessage = String(err);
    entry.gaps.push(`ERRO: ${entry.errorMessage}`);
    log(`ERRO: ${entry.errorMessage}`);
  }

  entry.improvements = [
    "Integrar Zap Imóveis, Viva Real e OLX simultaneamente",
    "Extrair preço por m², localização (bairro), tipo (casa/apto), quartos, garagem",
    "Calcular índice de preço médio por bairro (IVB - Índice Waesy de Valorização)",
    "Alertas de preço: notificar quando imóvel novo abaixo do preço médio do bairro",
    "Vincular com CNPJ da imobiliária anunciante para cross-reference",
    "Scraping de Schema.org RealEstateListing para dados estruturados",
  ];
  REPORT.push(entry);
}

// ─────────────────────────────────────────────────────────────────────────────
// M1: AUCTION HARVESTER
// ─────────────────────────────────────────────────────────────────────────────
async function auditAuctionHarvester() {
  sep("M1 · auction-harvester.ts — Leilões Judiciais e Extrajudiciais");
  const t0 = Date.now();
  const entry: AuditEntry = {
    engine: "auction-harvester",
    layer: "harvester",
    status: "ERROR",
    latencyMs: 0,
    rawOutput: null,
    nullFields: [],
    gaps: [],
    improvements: [],
  };

  try {
    const result = await withTimeout(
      harvestAndPersistAuctions({ url: "https://www.leilaovip.com.br/leiloes/sc/chapeco", city: "Chapecó", state: "SC" }),
      30000
    );
    entry.latencyMs = Date.now() - t0;
    entry.rawOutput = result;
    entry.status = (result as Record<string, unknown>).success ? "OK" : "PARTIAL";
    entry.nullFields = findNullFields(result);
    log(`Resultado: ${JSON.stringify(result, null, 2)}`);
    if (!(result as Record<string, unknown>).success) entry.gaps.push(`Harvest falhou: ${(result as Record<string, unknown>).error}`);
  } catch (err: unknown) {
    entry.latencyMs = Date.now() - t0;
    entry.status = "ERROR";
    entry.errorMessage = String(err);
    entry.gaps.push(`ERRO: ${entry.errorMessage}`);
    log(`ERRO: ${entry.errorMessage}`);
  }

  entry.improvements = [
    "Integrar Leilão Vip, Lance e Leilão, Superbid Exchange",
    "Leilões judiciais via portal TJSC (e-proc)",
    "Extração de: bem leiloado, avaliação, lance mínimo, data do leilão, comissão",
    "Schema: criar tabela mined_auctions separada com campos específicos",
    "Alertas de leilão por categoria (imóvel, veículo, maquinário)",
    "Integrar com Nota Fiscal de arrematação via SEFAZ",
  ];
  REPORT.push(entry);
}

// ─────────────────────────────────────────────────────────────────────────────
// N1: PLACES CNPJ CROSS-ENRICHER
// ─────────────────────────────────────────────────────────────────────────────
async function auditCrossEnricher() {
  sep("N1 · places-cnpj-cross-enricher.ts — OSM × Receita Federal");
  const t0 = Date.now();
  const entry: AuditEntry = {
    engine: "places-cnpj-cross-enricher",
    layer: "harvester",
    status: "ERROR",
    latencyMs: 0,
    rawOutput: null,
    nullFields: [],
    gaps: [],
    improvements: [],
  };

  try {
    const result = await withTimeout(crossEnrichListingsWithCnpj({ limit: 5 }), 30000);
    entry.latencyMs = Date.now() - t0;
    entry.rawOutput = result;
    entry.status = "OK";
    log(`Resultado: ${JSON.stringify(result, null, 2)}`);
  } catch (err: unknown) {
    entry.latencyMs = Date.now() - t0;
    entry.status = "ERROR";
    entry.errorMessage = String(err);
    entry.gaps.push(`ERRO: ${entry.errorMessage}`);
    log(`ERRO: ${entry.errorMessage}`);
  }

  entry.improvements = [
    "Cruzar por nome fantasia quando CNPJ não está disponível (Levenshtein similarity)",
    "Enriquecer com data de abertura e capital social do CNPJ",
    "Identificar CNPJs com situação 'BAIXADA' para marcar como inativo no diretório",
    "Score de confiança do match: exato CNPJ=100%, por nome=60-80%",
    "Persistir cnae_principal como tag de categoria no directory_listings",
  ];
  REPORT.push(entry);
}

// ─────────────────────────────────────────────────────────────────────────────
// O1: SEMANTIC DEDUPLICATOR
// ─────────────────────────────────────────────────────────────────────────────
async function auditSemanticDeduplicator() {
  sep("O1 · semantic-deduplicator.ts — Clusterização de Notícias");
  const t0 = Date.now();
  const entry: AuditEntry = {
    engine: "semantic-deduplicator",
    layer: "extractor",
    status: "ERROR",
    latencyMs: 0,
    rawOutput: null,
    nullFields: [],
    gaps: [],
    improvements: [],
  };

  const TEST_TITLES = [
    "Acidente na BR-282 deixa dois feridos em Chapecó nesta manhã",
    "Colisão na BR-282 em Chapecó nesta manhã fere dois motoristas",  // near-duplicate
    "Prefeitura de Chapecó anuncia obras de pavimentação para 2026",
  ];

  try {
    for (const title of TEST_TITLES) {
      const result = await withTimeout(detectStoryCluster(title), 10000);
      log(`\nTítulo: "${title}"`);
      log(`Resultado: ${JSON.stringify(result, null, 2)}`);
      if ((result as Record<string, unknown>).isDuplicate) {
        log(`  ⚠️ DUPLICATA detectada! Cluster: ${(result as Record<string, unknown>).clusterId} | Score: ${(result as Record<string, unknown>).similarityScore}`);
      }
    }
    entry.latencyMs = Date.now() - t0;
    entry.status = "OK";
    entry.rawOutput = { tested: TEST_TITLES.length };
  } catch (err: unknown) {
    entry.latencyMs = Date.now() - t0;
    entry.status = "ERROR";
    entry.errorMessage = String(err);
    entry.gaps.push(`ERRO: ${entry.errorMessage}`);
    log(`ERRO: ${entry.errorMessage}`);
  }

  entry.improvements = [
    "Substituir Jaccard por TF-IDF cosine similarity para maior precisão",
    "Embeddings semânticos (BERT/paraphrase-multilingual) para duplicatas parafraseadas",
    "Janela temporal configurável por vertical (notícias=48h, editais=7d)",
    "Persistir clusters em tabela story_clusters para rastrear cobertura de eventos",
    "Score de relevância local incrementado para notícias de Chapecó",
  ];
  REPORT.push(entry);
}

// ─────────────────────────────────────────────────────────────────────────────
// P1: SPECIALIZED EXTRACTORS (Receitas e Eventos)
// ─────────────────────────────────────────────────────────────────────────────
async function auditSpecializedExtractors() {
  sep("P1 · specialized-extractors.ts — Schema.org Recipe + Event");

  // RECEITA
  const RECIPE_URL = "https://www.receitasnestle.com.br/receitas/bolo-de-chocolate-simples";
  const t0r = Date.now();
  const entryR: AuditEntry = {
    engine: "specialized-extractor.recipe",
    layer: "extractor",
    status: "ERROR",
    latencyMs: 0,
    rawOutput: null,
    nullFields: [],
    gaps: [],
    improvements: [],
  };

  try {
    const scrape = await withTimeout(scrapeUrl(RECIPE_URL), 20000);
    if (scrape.success && scrape.html) {
      const recipe = extractRecipeFromJsonLd(scrape.html, RECIPE_URL);
      entryR.latencyMs = Date.now() - t0r;
      entryR.rawOutput = recipe;
      entryR.status = recipe != null ? "OK" : "PARTIAL";
      entryR.nullFields = recipe ? findNullFields(recipe) : ["ALL"];
      log(`Recipe extract: ${JSON.stringify(recipe, null, 2)}`);
      if (recipe == null) entryR.gaps.push("Receita null — sem Schema.org Recipe no HTML");
    } else {
      throw new Error(`Scrape falhou: ${scrape.error}`);
    }
  } catch (err: unknown) {
    entryR.latencyMs = Date.now() - t0r;
    entryR.status = "ERROR";
    entryR.errorMessage = String(err);
    entryR.gaps.push(`ERRO recipe: ${entryR.errorMessage}`);
    log(`ERRO recipe: ${entryR.errorMessage}`);
  }

  entryR.improvements = [
    "Extração de nutrição (NutritionInformation Schema.org) e calorias por porção",
    "Sugestão automática de ingredientes disponíveis em parceiros locais de Chapecó",
    "BOM (Bill of Materials) de receitas para stock de supermercado",
    "Categorização automática: sobremesa, refeição, bebida, lanche",
    "Score de dificuldade baseado em número de passos e ingredientes",
  ];
  REPORT.push(entryR);

  // EVENTO
  const EVENT_URL = "https://www.sympla.com.br/evento/expochapeco-2026/2345678";
  const t0e = Date.now();
  const entryE: AuditEntry = {
    engine: "specialized-extractor.event",
    layer: "extractor",
    status: "ERROR",
    latencyMs: 0,
    rawOutput: null,
    nullFields: [],
    gaps: [],
    improvements: [],
  };

  try {
    const scrape = await withTimeout(scrapeUrl(EVENT_URL), 20000);
    if (scrape.success && scrape.html) {
      const event = extractEventFromJsonLd(scrape.html, EVENT_URL);
      entryE.latencyMs = Date.now() - t0e;
      entryE.rawOutput = event;
      entryE.status = event != null ? "OK" : "PARTIAL";
      entryE.nullFields = event ? findNullFields(event) : ["ALL"];
      log(`Event extract: ${JSON.stringify(event, null, 2)}`);
    } else {
      throw new Error(`Scrape falhou: ${scrape.error}`);
    }
  } catch (err: unknown) {
    entryE.latencyMs = Date.now() - t0e;
    entryE.status = "ERROR";
    entryE.errorMessage = String(err);
    entryE.gaps.push(`ERRO event: ${entryE.errorMessage}`);
    log(`ERRO event: ${entryE.errorMessage}`);
  }

  entryE.improvements = [
    "Integrar ticketing APIs: Sympla, Blueticket, Ingresso.com (APIs públicas disponíveis)",
    "Extração de capacidade máxima e ingressos restantes",
    "Alertas de evento próximo para usuários do app por geolocalização",
    "Importar agenda oficial da Prefeitura de Chapecó (RSS/JSON público)",
    "Classificação de evento: show, esportivo, corporativo, cultural, gastronomia",
  ];
  REPORT.push(entryE);
}

// ─────────────────────────────────────────────────────────────────────────────
// Q1: CRAWLER BATCH ENGINE (crawl_queue)
// ─────────────────────────────────────────────────────────────────────────────
async function auditCrawlerBatchEngine() {
  sep("Q1 · crawler-batch-engine.ts — Processamento da crawl_queue");
  const t0 = Date.now();
  const entry: AuditEntry = {
    engine: "crawler-batch-engine",
    layer: "harvester",
    status: "ERROR",
    latencyMs: 0,
    rawOutput: null,
    nullFields: [],
    gaps: [],
    improvements: [],
  };

  try {
    // Verificar estado da fila antes
    const { data: queueBefore } = await supabase
      .from("crawl_queue")
      .select("id, url, entity_type, status, retry_count")
      .in("status", ["pending", "failed"])
      .limit(10);
    log(`crawl_queue (pending/failed): ${JSON.stringify(queueBefore, null, 2)}`);
    log(`Total na fila: ${queueBefore?.length ?? 0}`);

    const result = await withTimeout(executeCrawlQueueBatchDirect({ batchSize: 3 }), 60000);
    entry.latencyMs = Date.now() - t0;
    entry.rawOutput = result;
    entry.recordCount = (result as Record<string, unknown>).processed as number;
    entry.status = (result as Record<string, unknown>).processed as number > 0 ? "OK" : "PARTIAL";
    log(`\nBatch result: ${JSON.stringify(result, null, 2)}`);

    if ((result as Record<string, unknown>).processed === 0) entry.gaps.push("0 itens processados — fila vazia ou sem itens pendentes");

    // Verificar itens com falha
    const failedItems = ((result as Record<string, unknown>).items as Array<Record<string, unknown>>)?.filter((i) => i.status === "failed") ?? [];
    if (failedItems.length > 0) {
      log(`\nItens com FALHA:`);
      log(JSON.stringify(failedItems, null, 2));
      failedItems.forEach((i) => entry.gaps.push(`Falha no item ${i.url}: ${i.error}`));
    }
  } catch (err: unknown) {
    entry.latencyMs = Date.now() - t0;
    entry.status = "ERROR";
    entry.errorMessage = String(err);
    entry.gaps.push(`ERRO: ${entry.errorMessage}`);
    log(`ERRO: ${entry.errorMessage}`);
  }

  entry.improvements = [
    "Priority queue: processar primeiro itens por prioridade (1=alta, 3=normal, 5=baixa)",
    "Dead-letter queue: após 3 falhas, mover para dead_letter_queue com diagnóstico",
    "Paralelismo controlado: processar N itens em paralelo com Promise.allSettled",
    "Categoria de falha: timeout vs HTTP4xx vs parse_error vs DB_error",
    "Dashboard de saúde da fila em tempo real (pending, processing, failed, done)",
    "Auto-seeding: adicionar URLs novas via discovery automático de sitemap.xml",
  ];
  REPORT.push(entry);
}

// ─────────────────────────────────────────────────────────────────────────────
// GERADOR DO RELATÓRIO FORENSE FINAL
// ─────────────────────────────────────────────────────────────────────────────
function generateForensicReport() {
  const ts = new Date().toISOString();
  const ok = REPORT.filter((r) => r.status === "OK").length;
  const partial = REPORT.filter((r) => r.status === "PARTIAL").length;
  const errors = REPORT.filter((r) => r.status === "ERROR").length;
  const totalGaps = REPORT.reduce((s, r) => s + r.gaps.length, 0);

  const lines: string[] = [];
  lines.push(`# Relatório Forense de Auditoria — Crawlers & Mineradores`);
  lines.push(`**Gerado em:** ${ts}`);
  lines.push(`**Execução:** Real ao vivo — Chapecó/SC — Supabase \`jfuebqmltksyznovhlwa\``);
  lines.push(``);
  lines.push(`## Resumo Executivo`);
  lines.push(``);
  lines.push(`| Métrica | Valor |`);
  lines.push(`|---|---|`);
  lines.push(`| Total de engines/harvesters auditados | ${REPORT.length} |`);
  lines.push(`| Status OK | ${ok} |`);
  lines.push(`| Status PARTIAL | ${partial} |`);
  lines.push(`| Status ERROR | ${errors} |`);
  lines.push(`| Total de gaps identificados | ${totalGaps} |`);
  lines.push(``);
  lines.push(`## Matriz de Saúde`);
  lines.push(``);
  lines.push(`| Engine/Harvester | Layer | Status | Latência (ms) | Registros | Gaps |`);
  lines.push(`|---|---|---|---|---|---|`);
  for (const r of REPORT) {
    const statusIcon = r.status === "OK" ? "✅" : r.status === "PARTIAL" ? "⚠️" : "❌";
    lines.push(`| \`${r.engine}\` | ${r.layer} | ${statusIcon} ${r.status} | ${r.latencyMs} | ${r.recordCount ?? "—"} | ${r.gaps.length} |`);
  }
  lines.push(``);

  for (const r of REPORT) {
    lines.push(`---`);
    lines.push(`## ${r.engine}`);
    lines.push(`**Layer:** ${r.layer} | **Status:** ${r.status} | **Latência:** ${r.latencyMs}ms | **Registros:** ${r.recordCount ?? "N/A"}`);
    lines.push(``);
    if (r.errorMessage) {
      lines.push(`### Erro`);
      lines.push(`\`\`\`\n${r.errorMessage}\n\`\`\``);
    }
    if (r.nullFields.length > 0) {
      lines.push(`### Campos Nulos/Vazios`);
      r.nullFields.forEach((f) => lines.push(`- \`${f}\``));
    }
    if (r.gaps.length > 0) {
      lines.push(`### Gaps Identificados`);
      r.gaps.forEach((g) => lines.push(`- ${g}`));
    }
    if (r.improvements.length > 0) {
      lines.push(`### Propostas de Melhoria`);
      r.improvements.forEach((m) => lines.push(`- ${m}`));
    }
    lines.push(``);
  }

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN — executa todas as auditorias em sequência
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("═".repeat(80));
  console.log("  WAESY — AUDITORIA FORENSE COMPLETA DE CRAWLERS & MINERADORES");
  console.log("  Execução real ao vivo — Chapecó/SC");
  console.log("═".repeat(80));

  await auditMarketDataEngine();
  await auditEconomicPersister();
  await auditRssIngesterEngine();
  await auditDiscoverFeeds();
  await auditCnpjEnrichmentEngine();
  await auditIntentClassifier();
  await auditSocialContentMiner();
  await auditFirecrawlClient();
  await auditMechanicalExtractor();
  await auditPncpHarvester();
  await auditJobOpportunityExtractor();
  await auditPlacesHarvester();
  await auditDatajudHarvester();
  await auditRealEstateHarvester();
  await auditAuctionHarvester();
  await auditCrossEnricher();
  await auditSemanticDeduplicator();
  await auditSpecializedExtractors();
  await auditCrawlerBatchEngine();

  sep("RELATÓRIO FORENSE FINAL");
  const report = generateForensicReport();
  const reportPath = "docs/mining/forensic-audit-report.md";
  fs.writeFileSync(reportPath, report, "utf-8");
  console.log(`\nRelatório salvo em: ${reportPath}\n`);
  console.log(report);
}

main().catch((err) => {
  console.error("Erro fatal no runner:", err);
  process.exit(1);
});
