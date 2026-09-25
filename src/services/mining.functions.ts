import { harvestAndPersistDataJudProcess } from "./mining/datajud-harvester";
import { harvestAndPersistPlaces } from "./mining/places-harvester";
/**
 * mining.functions.ts — BFF Server Functions para o Mining Hub & Crawlers
 * Extração de Notícias, Feeds RSS, Scrapers de Domínio, Curadoria IA e Fila de Descoberta.
 *
 * Pipeline: URL/RSS → crawl_queue → [worker] → mined_articles → [curadoria] → news_articles
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getServerIdentity, requireAdmin, assertStoreAccess } from "@/lib/server-access";
import { enforceRateLimit } from "@/lib/rate-limiter";
import {
  inspectPromptSecurity,
  buildSandboxedPromptPayload,
  sanitizeAiOutput,
} from "@/lib/prompt-shield";
import { extractContentMechanically } from "./mining/mechanical-extractor";
import {
  validateMechanicalCompleteness,
  generateTitleHash,
  isHealthyImageUrl,
  getFallbackThematicImage,
} from "./mining/integrity-gate";
import { curateWithEditorialSquad } from "./mining/editorial-squad";
import { fetchPncpContracts, convertPncpToExtractionResult } from "./mining/pncp-extractor";
import { executeUnifiedAiCall } from "./api-orchestrator.functions";
import { executeContinuousCrawl } from "@/lib/mining/continuous-crawler.engine";
import { parseFeed } from "@/lib/mining/rss-ingester.engine";
import { fetchAllMarketIndicators } from "@/lib/mining/market-data-miner.engine";
import { enrichCnpj } from "@/lib/mining/cnpj-enrichment.engine";
import {
  extractDomain,
  isDomainInCooldown,
  setDomainCooldown,
  clearDomainCooldown,
} from "@/lib/mining/scraper-utils";
import type {
  MiningStats,
  CrawlQueueItem,
  IndexedBusiness,
  ScraperAuditLogEntry,
  RssFeed as RssFeedContract,
  EconomicIndicator,
} from "@/types/mining";

// ============================================================
// Constantes: Token Burn Rates para Scraping
// ============================================================
export const MINING_TOKEN_COSTS = {
 scrape_url: 5_000, // Extração completa de URL com IA
 rss_import: 500, // Importação de item RSS único
 ai_curate: 2_000, // Curadoria e análise IA de conteúdo
 ai_rewrite: 8_000, // Reescrita editorial completa com IA
 ai_summarize: 1_000, // Geração de resumo executivo
 content_import_url: 3_000, // Importação rápida de conteúdo via URL
 batch_crawl_per_url: 4_000, // Crawl em lote (por URL)
} as const;

// ============================================================
// Schemas e Tipos
// ============================================================


/**
 * Enriquecimento Dinâmico vs. Duplicação (Master Prompt V18 - Fase 4)
 * Evita linhas duplicadas no catálogo global de produtos minerados,
 * atualizando histórico de preços, imagens e metadados quando o produto já existe.
 */
export async function enrichOrInsertMinedProduct(supabase: any, prodPayload: any) {
  // 1. Busca por source_url exata
  const { data: existingByUrl } = await supabase
    .from("mined_products")
    .select("id, price_history, image_url, description, price_cents")
    .eq("source_url", prodPayload.source_url)
    .maybeSingle();

  let existing = existingByUrl;
  if (!existing && prodPayload.title && prodPayload.source_domain) {
    const { data: existingByTitle } = await supabase
      .from("mined_products")
      .select("id, price_history, image_url, description, price_cents")
      .eq("source_domain", prodPayload.source_domain)
      .ilike("title", prodPayload.title.trim())
      .maybeSingle();
    existing = existingByTitle;
  }

  if (existing) {
    const priceHistory = Array.isArray(existing.price_history) ? [...existing.price_history] : [];
    if (prodPayload.price_cents > 0 && prodPayload.price_cents !== existing.price_cents) {
      priceHistory.push({ date: new Date().toISOString(), price_cents: prodPayload.price_cents });
    }

    await supabase
      .from("mined_products")
      .update({
        price_cents: prodPayload.price_cents > 0 ? prodPayload.price_cents : existing.price_cents,
        compare_at_cents: prodPayload.compare_at_cents || undefined,
        image_url: existing.image_url || prodPayload.image_url,
        description: existing.description || prodPayload.description,
        price_history: priceHistory,
        availability: prodPayload.availability || "in_stock",
        quality_score: Math.max(prodPayload.quality_score || 70, 80),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    return { action: "enriched", id: existing.id };
  } else {
    const { data: inserted } = await supabase
      .from("mined_products")
      .insert(prodPayload)
      .select("id")
      .maybeSingle();
    return { action: "inserted", id: inserted?.id };
  }
}

export const addCrawlUrlSchema = z.object({
 url: z.string().url("URL inválida"),
 priority: z.number().int().min(1).max(10).default(5),
 content_type: z.enum(["news", "blog_post", "recipe", "tech_spec", "social_post", "product", "classified"]).default("news"),
 store_id: z.string().uuid().optional(),
 metadata: z.record(z.unknown()).optional(),
});

export const addRssFeedSchema = z.object({
 name: z.string().min(2, "Nome muito curto"),
 feed_url: z.string().url("URL de feed inválida"),
 website_url: z.string().url().optional(),
 category: z.string().default("general"),
 content_type: z.enum(["news", "blog_post", "recipe", "tech_spec", "classified"]).default("news"),
 region: z.string().default("Geral/Nacional"),
 store_id: z.string().uuid().optional(),
 auto_publish: z.boolean().default(false),
 auto_enqueue: z.boolean().default(true),
 quality_threshold: z.number().int().min(0).max(100).default(60),
 fetch_interval_minutes: z.number().int().min(5).default(60),
 max_items_per_fetch: z.number().int().min(1).max(100).default(20),
});

export interface MinedArticleDTO {
 id: string;
 source_url: string;
 source_domain: string;
 source_type: "crawl" | "rss" | "api";
 store_id: string | null;
 raw_title: string | null;
 ai_structured_title: string | null;
 ai_structured_subtitle: string | null;
 ai_suggested_kicker: string | null;
 ai_suggested_category: string | null;
 ai_suggested_tags: string[];
 ai_suggested_cover_url: string | null;
 ai_summary: string | null;
 ai_sentiment: string | null;
 quality_score: number | null;
 quality_flags: string[];
 word_count: number;
 has_cover_image: boolean;
 is_duplicate: boolean;
 status: "pending_review" | "approved" | "rejected" | "published" | "processing" | "failed";
 curator_notes: string | null;
 curated_at: string | null;
 tokens_consumed: number;
 ai_provider_used: string | null;
 firecrawl_used: boolean;
 created_at: string;
 extracted_markdown?: string | null;
 ai_structured_sections?: Array<{
   heading?: string;
   content: string;
   order?: number;
   type?: string;
   caption?: string;
 }> | null;
}

export interface ScraperConfigDTO {
 id: string;
 domain: string;
 label: string;
 description: string | null;
 is_active: boolean;
 is_blocked: boolean;
 blocked_reason: string | null;
 requires_javascript: boolean;
 request_delay_ms: number;
 max_requests_per_hour: number;
 reliability_score: number;
 source_credibility: string;
 total_scraped: number;
 total_published: number;
 total_failed: number;
 last_scraped_at: string | null;
}

// ============================================================
// 1. Estatísticas do Mining Hub (ampliadas)
// ============================================================
export const getMiningStats = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();

 const [queueRes, feedsRes, scraperRes, minedRes] = await Promise.all([
 supabase.from("crawl_queue").select("status"),
 supabase.from("rss_feeds").select("id, is_active, items_count, items_published_count"),
 supabase.from("scraper_configs").select("id, is_active, is_blocked, total_scraped, total_published"),
 supabase.from("mined_articles").select("status, quality_score"),
 ]);

 const queueData = queueRes.data || [];
 const queue = { pending: 0, processing: 0, completed: 0, failed: 0 };
 queueData.forEach((item) => {
 if (item.status in queue) queue[item.status as keyof typeof queue]++;
 });

 const feedsData = feedsRes.data || [];
 const minedData = minedRes.data || [];
 const scraperData = scraperRes.data || [];

 const minedStats = {
 pending_review: 0, approved: 0, rejected: 0,
 published: 0, processing: 0, failed: 0,
 avg_quality: 0,
 };
 let qualitySum = 0, qualityCount = 0;
 minedData.forEach((m) => {
 if (m.status in minedStats) minedStats[m.status as keyof typeof minedStats]++;
 if (m.quality_score != null) { qualitySum += m.quality_score; qualityCount++; }
 });
 minedStats.avg_quality = qualityCount > 0 ? Math.round(qualitySum / qualityCount) : 0;

 return {
 queue,
 mined: minedStats,
 feeds: {
 total: feedsData.length,
 active: feedsData.filter((f) => f.is_active).length,
 total_items: feedsData.reduce((s, f) => s + (f.items_count || 0), 0),
 total_published: feedsData.reduce((s, f) => s + (f.items_published_count || 0), 0),
 },
 scrapers: {
 total: scraperData.length,
 active: scraperData.filter((s) => s.is_active && !s.is_blocked).length,
 blocked: scraperData.filter((s) => s.is_blocked).length,
 total_scraped: scraperData.reduce((s, c) => s + (c.total_scraped || 0), 0),
 },
 };
});

// ============================================================
// 2. Lista fila de crawling (com filtros)
// ============================================================
export const listCrawlQueue = createServerFn({ method: "GET" })
 .validator(z.object({
 status: z.string().optional(),
 content_type: z.string().optional(),
 limit: z.number().int().default(50),
 offset: z.number().int().default(0),
 }).optional())
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 let query = supabase
 .from("crawl_queue")
 .select("*", { count: "exact" })
 .order("priority", { ascending: true })
 .order("created_at", { ascending: true })
 .limit(data?.limit || 50)
 .range(data?.offset || 0, (data?.offset || 0) + (data?.limit || 50) - 1);

 if (data?.status && data.status !== "all") query = query.eq("status", data.status);
 if (data?.content_type) query = query.eq("content_type", data.content_type);

 const { data: queue, count, error } = await query;
 if (error) throw new Error(`Falha ao listar fila: ${error.message}`);
 return { items: queue || [], total: count || 0 };
 });

// ============================================================
// 3. Adiciona URL à fila de crawling
// ============================================================
export const addUrlToCrawlQueue = createServerFn({ method: "POST" })
 .validator(addCrawlUrlSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity) throw new Error("Não autenticado");

 const domain = new URL(data.url).hostname;
 const supabase = getServerClient();

 // Verifica duplicata na fila
 const { data: existing } = await supabase
 .from("crawl_queue")
 .select("id, status")
 .eq("url", data.url)
 .in("status", ["pending", "processing"])
 .maybeSingle();

 if (existing) {
 return { id: existing.id, status: existing.status, _duplicate: true };
 }

 const { data: item, error } = await supabase
 .from("crawl_queue")
 .insert({
 url: data.url,
 domain,
 priority: data.priority,
 content_type: data.content_type,
 store_id: data.store_id || null,
 status: "pending",
 discovered_via: "admin_manual",
 metadata: data.metadata || {},
 })
 .select()
 .single();

 if (error) throw new Error(`Falha ao enfileirar URL: ${error.message}`);
 return item;
 });

// ============================================================
// 4. Processa URL com IA (Pipeline completo Firecrawl → Gemini/Groq)
// Consome tokens se for operação de loja
// ============================================================
export const processUrlWithAI = createServerFn({ method: "POST" })
 .validator(z.object({
 url: z.string().url("URL inválida"),
 content_type: z.enum(["news", "blog_post", "recipe", "tech_spec", "social_post", "product", "classified"]).default("news"),
 tone: z.enum(["profissional", "editorial", "persuasivo", "tecnico", "minimalista"]).default("profissional"),
 store_id: z.string().uuid().optional(),
 auto_enqueue: z.boolean().default(true),
 consume_tokens: z.boolean().default(false), // true apenas para lojas B2B
 }))
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 // 1. Verifica bloqueio de domínio
 const domain = new URL(input.url).hostname;
 const { data: config } = await supabase
 .from("scraper_configs")
 .select("is_blocked, blocked_reason, requires_javascript, css_title, css_body, css_cover_image, request_delay_ms, source_credibility")
 .eq("domain", domain)
 .maybeSingle();

 if (config?.is_blocked) {
 throw new Error(`Domínio bloqueado: ${config.blocked_reason || "Violação de ToS detectada"}`);
 }

 // 2. Obtém próxima chave ativa do pool
 async function getNextActiveKey(provider: string) {
 const { data } = await supabase
 .from("api_key_pools")
 .select("id, encrypted_key")
 .eq("provider", provider)
 .eq("is_active", true)
 .order("last_used_at", { ascending: true, nullsFirst: true })
 .limit(1)
 .maybeSingle();

 if (!data?.encrypted_key) return null;
 const rawKey = Buffer.from(data.encrypted_key, "base64").toString("utf-8");
 await supabase.from("api_key_pools")
 .update({ last_used_at: new Date().toISOString() })
 .eq("id", data.id);
 return { id: data.id, rawKey };
 }

 // 3. Extração de conteúdo bruto (Firecrawl → fallback HTTP)
 let rawContent = "";
 let firecrawlUsed = false;
 let crawlQueueId: string | null = null;

 // Enfileira na crawl_queue para rastreabilidade
 if (input.auto_enqueue) {
 const { data: queueItem } = await supabase
 .from("crawl_queue")
 .insert({
 url: input.url,
 domain,
 priority: 3,
 content_type: input.content_type,
 store_id: input.store_id || null,
 status: "processing",
 discovered_via: "admin_manual",
 started_at: new Date().toISOString(),
 metadata: { tone: input.tone },
 })
 .select("id")
 .single();
 crawlQueueId = queueItem?.id || null;
 }

 let mechanicalResult: any = null;
 try {
 const firecrawlKey = await getNextActiveKey("firecrawl");
 if (firecrawlKey) {
 try {
 const fcRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
 method: "POST",
 headers: { "Content-Type": "application/json", Authorization: `Bearer ${firecrawlKey.rawKey}` },
 body: JSON.stringify({ url: input.url, formats: ["markdown"], onlyMainContent: true }),
 signal: AbortSignal.timeout(15000),
 });
 if (fcRes.ok) {
 const fcJson = await fcRes.json();
 rawContent = fcJson?.data?.markdown || "";
 if (rawContent) firecrawlUsed = true;
 } else if (fcRes.status === 429) {
 await supabase.from("api_key_pools").update({ last_error_at: new Date().toISOString(), last_error_message: "Rate limit 429" }).eq("id", firecrawlKey.id);
 }
 } catch (e: any) {
 await supabase.from("api_key_pools").update({ last_error_at: new Date().toISOString(), last_error_message: e.message?.slice(0, 200) }).eq("id", firecrawlKey.id);
 }
 }

 // Camada Mecânica Resiliente (Stealth Headers + JSON-LD + Dicionário de Seletores)
 mechanicalResult = await extractContentMechanically(input.url, rawContent || undefined);
 if (!rawContent && mechanicalResult.bodyMarkdown) {
 rawContent = mechanicalResult.bodyMarkdown;
 }

 // Gateway de Validação de Integridade (Previne bug de corpo vazio e bloqueios anti-bot)
 const integrity = validateMechanicalCompleteness(mechanicalResult);
 if (!integrity.isValid && (!rawContent || rawContent.length < 100)) {
 if (crawlQueueId) {
 await supabase.from("crawl_queue").update({
 status: "failed",
 processing_error: `Integridade rejeitada: ${integrity.reason || "Conteúdo insuficiente"}`,
 completed_at: new Date().toISOString(),
 }).eq("id", crawlQueueId);
 }
 throw new Error(`Integridade rejeitada: ${integrity.reason}`);
 }
 } catch (e: any) {
 if (crawlQueueId) {
 await supabase.from("crawl_queue").update({
 status: "failed",
 processing_error: e.message?.slice(0, 300),
 completed_at: new Date().toISOString(),
 }).eq("id", crawlQueueId);
 }
 throw new Error(`Falha ao extrair conteúdo: ${e.message}`);
 }

 if (!rawContent || rawContent.length < 80) {
 throw new Error("Conteúdo insuficiente para processamento — página retornou menos de 80 caracteres.");
 }

 // 4. Anti-prompt injection & Prompt Shield
 const securityCheck = inspectPromptSecurity(rawContent);
 const sanitized = (securityCheck.sanitizedPrompt || rawContent).replace(/\{\{|\}\}/g, "").slice(0, 12000);

 // 5. Sistema de Prompts por Content Type com Sandboxing
 const systemPrompts: Record<string, string> = {
 news: `Você é um editor-chefe de jornalismo digital de alto padrão. Extraia e estruture matérias jornalísticas a partir de conteúdo bruto da web. Retorne APENAS JSON válido, sem markdown ou texto adicional.`,
 blog_post: `Você é um especialista em marketing de conteúdo. Extraia e estruture posts de blog a partir de conteúdo bruto. Retorne APENAS JSON válido.`,
 recipe: `Você é um chef e editor gastronômico. Extraia e estruture receitas culinárias detalhadas. Retorne APENAS JSON válido.`,
 tech_spec: `Você é um engenheiro técnico. Extraia especificações técnicas e fichas de produto. Retorne APENAS JSON válido.`,
 };

 const contentTypePrompts: Record<string, string> = {
 news: `Analise o conteúdo jornalístico abaixo.
URL: ${input.url}
Tom solicitado: ${input.tone}

Conteúdo:
${sanitized}

Retorne o JSON:
{
 "title": "Título editorial da matéria",
 "subtitle": "Lead/subtítulo jornalístico conciso",
 "kicker": "Chapéu da matéria (ex: POLÍTICA LOCAL, ECONOMIA)",
 "category": "cidade|politica|economia|cultura|esportes|tecnologia|urgente|geral",
 "tags": ["tag1", "tag2", "tag3"],
 "summary": "Resumo executivo de 2-3 frases",
 "sentiment": "positive|neutral|negative|mixed",
 "keywords": ["kw1", "kw2", "kw3"],
 "cover_image_url": "URL da imagem principal (se encontrada)",
 "estimated_reading_time": 3,
 "quality_score": 75,
 "quality_flags": ["missing_cover", "short_content"],
 "sections": [
 {"type": "paragraph", "content": "Texto do parágrafo..."},
 {"type": "heading", "content": "Subtítulo da seção"},
 {"type": "quote", "content": "Citação", "caption": "Fonte da citação"}
 ]
}`,
 blog_post: `Analise o artigo de blog abaixo.
URL: ${input.url}

Conteúdo:
${sanitized}

Retorne o JSON no mesmo formato estruturado.`,
 recipe: `Analise a receita abaixo.
URL: ${input.url}

Conteúdo:
${sanitized}

Retorne o JSON:
{
 "title": "Nome da Receita",
 "subtitle": "Descrição curta apetitosa",
 "category": "culinaria",
 "tags": ["receita", "gastronomia"],
 "summary": "Descrição geral da receita",
 "sections": [
 {"type": "heading", "content": "Ingredientes"},
 {"type": "paragraph", "content": "Lista de ingredientes..."},
 {"type": "heading", "content": "Modo de Preparo"},
 {"type": "paragraph", "content": "Passo 1: ..."},
 {"type": "paragraph", "content": "Passo 2: ..."}
 ],
 "cover_image_url": "URL da imagem",
 "estimated_reading_time": 5,
 "quality_score": 80,
 "quality_flags": []
}`,
 tech_spec: `Analise o produto ou especificação técnica abaixo.
URL: ${input.url}

Conteúdo:
${sanitized}

Retorne o JSON:
{
 "title": "Nome do Produto ou Equipamento",
 "subtitle": "Resumo das especificações principais",
 "category": "tecnologia",
 "tags": ["especificacao", "produto", "tecnico"],
 "summary": "Descrição técnica concisa",
 "sections": [
 {"type": "heading", "content": "Ficha Técnica"},
 {"type": "paragraph", "content": "Especificações e dimensões..."},
 {"type": "heading", "content": "Características"},
 {"type": "paragraph", "content": "Destaques operacionais..."}
 ],
 "cover_image_url": "URL da imagem",
 "estimated_reading_time": 4,
 "quality_score": 85,
 "quality_flags": []
}`,
 };

 const baseSystemPrompt = systemPrompts[input.content_type] || systemPrompts.news;
 const baseUserPrompt = contentTypePrompts[input.content_type] || contentTypePrompts.news;

 const { hardenedSystemPrompt, sandboxedUserPrompt } = buildSandboxedPromptPayload(
 baseUserPrompt,
 baseSystemPrompt
 );

  // 5.1. Validador Pré-Voo de Saldo de Tokens (Ledger ACID Lock)
	if (input.consume_tokens && input.store_id) {
		const { data: wallet } = await supabase
			.from("store_token_wallets")
			.select("balance")
			.eq("store_id", input.store_id)
			.maybeSingle();

		if (wallet && (wallet.balance ?? 0) < MINING_TOKEN_COSTS.scrape_url) {
			throw new Error(
				`Saldo insuficiente de tokens para extração. Necessário: ${MINING_TOKEN_COSTS.scrape_url.toLocaleString('pt-BR')} tokens. Saldo atual: ${(wallet.balance ?? 0).toLocaleString('pt-BR')} tokens.`
			);
		}
	}

	// 6. Processamento por IA via Orquestrador Universal
  let extracted: any = null;
  let aiProviderUsed = "fallback";
  let tokensConsumed = 0;

  try {
    const aiRes = await executeUnifiedAiCall({
      systemPrompt: hardenedSystemPrompt,
      userPrompt: sandboxedUserPrompt,
      responseFormat: "json_object",
      temperature: 0.2,
    });
    if (aiRes.parsedJson) {
      extracted = aiRes.parsedJson;
      aiProviderUsed = aiRes.provider;
      tokensConsumed = 1500;
    }
  } catch (e: any) {
    console.warn("[mining] Unified AI error:", e.message);
  }

 // 7. Fallback determinístico se IA falhar
 if (!extracted) {
 const titleMatch = rawContent.match(/<h1[^>]*>([^<]+)<\/h1>/i);
 extracted = {
 title: titleMatch ? titleMatch[1].trim().slice(0, 120) : new URL(input.url).hostname,
 subtitle: `Conteúdo extraído de ${domain}`,
 kicker: input.content_type.toUpperCase(),
 category: "geral",
 tags: [domain.replace("www.", "")],
 summary: `Conteúdo importado de ${input.url}`,
 sentiment: "neutral",
 keywords: [],
 cover_image_url: null,
 estimated_reading_time: Math.ceil(rawContent.split(" ").length / 200),
 quality_score: 20,
 quality_flags: ["ai_extraction_failed", "manual_review_required"],
 sections: [{ type: "paragraph", content: rawContent.slice(0, 2000) }],
 };
 aiProviderUsed = "fallback";
 }

  // 8. Validação e sanitização da imagem de capa (Anti-Broken Image Gate)
  const candidateCover = extracted.cover_image_url || mechanicalResult?.coverImageUrl;
  const safeCoverUrl = isHealthyImageUrl(candidateCover)
    ? candidateCover
    : getFallbackThematicImage(input.content_type);

  extracted.cover_image_url = safeCoverUrl;

  // Calcula quality score final
  const qualityScore = extracted.quality_score ?? calculateQualityScore(extracted);
  const qualityFlags: string[] = extracted.quality_flags || [];
  if (!safeCoverUrl) qualityFlags.push("missing_cover");
  if ((extracted.sections?.length || 0) < 2) qualityFlags.push("short_content");
  if (qualityScore < 40) qualityFlags.push("low_quality");

  tokensConsumed = MINING_TOKEN_COSTS.scrape_url;

  // 9. Persiste em mined_articles
  const { data: mined, error: minedError } = await supabase
    .from("mined_articles")
    .insert({
      crawl_queue_id: crawlQueueId,
      source_url: input.url,
      source_domain: domain,
      source_type: "crawl",
      store_id: input.store_id || null,
      raw_title: extracted.title,
      extracted_markdown: rawContent.slice(0, 50000),
      ai_structured_title: extracted.title,
      ai_structured_subtitle: extracted.subtitle,
      ai_structured_sections: extracted.sections || [],
      ai_suggested_kicker: extracted.kicker,
      ai_suggested_category: extracted.category,
      ai_suggested_tags: extracted.tags || [],
      ai_suggested_cover_url: safeCoverUrl,
      ai_summary: extracted.summary,
      ai_sentiment: extracted.sentiment,
      ai_keywords: extracted.keywords || [],
      ai_estimated_reading_time: extracted.estimated_reading_time || 3,
      quality_score: qualityScore,
      quality_flags: qualityFlags,
      word_count: rawContent.split(/\s+/).length,
      has_cover_image: true,
      status: "pending_review",
      tokens_consumed: tokensConsumed,
      ai_provider_used: aiProviderUsed,
      firecrawl_used: firecrawlUsed,
      processing_completed_at: new Date().toISOString(),
    })
    .select()
    .single();

 if (minedError) throw new Error(`Falha ao persistir artigo minerado: ${minedError.message}`);

  // 9.1. Persiste também na tabela de extrações brutas particionadas (mined_raw_extractions)
  try {
    const titleHash = generateTitleHash(extracted.title || "");
    const contentTypeMapping: Record<string, string> = {
      news: "noticia",
      blog_post: "blog_post",
      recipe: "educacao",
      tech_spec: "artigo",
      event: "eventos",
      eventos: "eventos",
      municipal: "portal_municipal",
      portal_municipal: "portal_municipal",
    };
    const mappedType = contentTypeMapping[input.content_type] || "noticia";

    await supabase.from("mined_raw_extractions").upsert({
      content_type: mappedType as any,
      source_url: input.url,
      source_domain: domain,
      source_name: domain,
      raw_title: extracted.title,
      raw_lead: extracted.subtitle || extracted.summary || null,
      raw_body_text: rawContent,
      raw_author: extracted.author || null,
      cover_image_url: extracted.cover_image_url || null,
      city: "Chapecó",
      state: "SC",
      tags: extracted.tags || [],
      word_count: rawContent.split(/\s+/).length,
      paragraph_count: extracted.sections?.length || 1,
      has_full_content: true,
      extraction_method: mechanicalResult?.method || (firecrawlUsed ? "firecrawl" : "mechanical"),
      title_hash: titleHash,
      status: "curated",
      store_id: input.store_id || null,
    }, { onConflict: "source_url" });
  } catch (rawErr) {
    console.warn("[mining] Aviso ao gravar em mined_raw_extractions:", rawErr);
  }

  // 10. Atualiza crawl_queue com referência ao mined_article
  if (crawlQueueId) {
    await supabase.from("crawl_queue")
      .update({ status: "completed", mined_article_id: mined.id, completed_at: new Date().toISOString() })
      .eq("id", crawlQueueId);
  }

  // 11. Debita tokens se B2B
  if (input.consume_tokens && input.store_id) {
    await supabase.rpc("consume_store_tokens", {
      p_store_id: input.store_id,
      p_tokens_to_consume: tokensConsumed,
      p_action_type: "burn_scrape_url",
      p_description: `Extração IA de URL: ${domain}`,
      p_time_saved_minutes: 45,
      p_metadata: { url: input.url, ai_provider: aiProviderUsed, quality_score: qualityScore },
    });
  }

  return mined;
});

// ============================================================
// 5. Lista artigos minerados pendentes de curadoria
// ============================================================
export const listMinedArticles = createServerFn({ method: "GET" })
 .validator(z.object({
 status: z.string().optional(),
 store_id: z.string().uuid().optional(),
 source_type: z.string().optional(),
 min_quality: z.number().int().optional(),
 limit: z.number().int().default(30),
 offset: z.number().int().default(0),
 }).optional())
 .handler(async ({ data }): Promise<{ items: MinedArticleDTO[]; total: number }> => {
 const supabase = getServerClient();
 let query = supabase
 .from("mined_articles")
 .select("id, source_url, source_domain, source_type, store_id, raw_title, ai_structured_title, ai_structured_subtitle, ai_suggested_kicker, ai_suggested_category, ai_suggested_tags, ai_suggested_cover_url, ai_summary, ai_sentiment, quality_score, quality_flags, word_count, has_cover_image, is_duplicate, status, curator_notes, curated_at, tokens_consumed, ai_provider_used, firecrawl_used, created_at, extracted_markdown, ai_structured_sections", { count: "exact" })
 .order("created_at", { ascending: false })
 .limit(data?.limit || 30)
 .range(data?.offset || 0, (data?.offset || 0) + (data?.limit || 30) - 1);

 if (data?.status && data.status !== "all") query = query.eq("status", data.status);
 if (data?.store_id) query = query.eq("store_id", data.store_id);
 if (data?.source_type) query = query.eq("source_type", data.source_type);
 if (data?.min_quality != null) query = query.gte("quality_score", data.min_quality);

 const { data: items, count, error } = await query;
 if (error) throw new Error(`Falha ao listar artigos minerados: ${error.message}`);
 return { items: (items || []) as MinedArticleDTO[], total: count || 0 };
 });

// ============================================================
// 6. Curadoria: Aprovar ou Rejeitar artigo minerado
// ============================================================
export const curateMineArticle = createServerFn({ method: "POST" })
 .validator(z.object({
 mined_article_id: z.string().uuid(),
 action: z.enum(["approve", "reject"]),
 curator_notes: z.string().optional(),
 title_override: z.string().optional(),
 kicker_override: z.string().optional(),
 category_override: z.string().optional(),
 store_id: z.string().uuid().optional(),
 }))
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity?.id) throw new Error("Não autenticado");

 let storeId = data.store_id || identity.store_id;
 if (!storeId && data.action === "approve") {
 const { data: rootStore } = await supabase
 .from("stores")
 .select("id")
 .eq("is_platform_root", true)
 .maybeSingle();
 storeId = rootStore?.id;
 if (!storeId) {
 const { data: anyStore } = await supabase.from("stores").select("id").limit(1).maybeSingle();
 storeId = anyStore?.id;
 }
 }

 const result = await supabase.rpc("process_mined_article", {
 p_mined_article_id: data.mined_article_id,
 p_curator_profile_id: identity.id,
 p_action: data.action,
 p_curator_notes: data.curator_notes || null,
 p_title_override: data.title_override || null,
 p_kicker_override: data.kicker_override || null,
 p_category_override: data.category_override || null,
 p_store_id_override: storeId || null,
 });

 if (result.error) throw new Error(`Falha na curadoria: ${result.error.message}`);
 const rpcResult = result.data as any;
 if (!rpcResult?.success) throw new Error(rpcResult?.error || "Falha desconhecida na curadoria");
 return rpcResult;
 });

// ============================================================
// 7. Reescrita Editorial com IA
// ============================================================

// ============================================================
// 6.1 Curadoria em Lote (OpenSquad Batch Curate)
// ============================================================
export const batchCurateMineArticlesFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      mined_article_ids: z.array(z.string().uuid()).min(1),
      action: z.enum(["approve", "reject"]),
      store_id: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    let storeId = data.store_id || identity.store_id;
    if (!storeId && data.action === "approve") {
      const { data: rootStore } = await supabase
        .from("stores")
        .select("id")
        .eq("is_platform_root", true)
        .maybeSingle();
      storeId = rootStore?.id;
      if (!storeId) {
        const { data: anyStore } = await supabase.from("stores").select("id").limit(1).maybeSingle();
        storeId = anyStore?.id;
      }
    }

    let processedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const articleId of data.mined_article_ids) {
      try {
        const result = await supabase.rpc("process_mined_article", {
          p_mined_article_id: articleId,
          p_curator_profile_id: identity.id,
          p_action: data.action,
          p_curator_notes: "Curadoria em lote (OpenSquad)",
          p_title_override: null,
          p_kicker_override: null,
          p_category_override: null,
          p_store_id_override: storeId || null,
        });

        if (result.error) {
          failedCount++;
          errors.push(result.error.message);
        } else {
          processedCount++;
        }
      } catch (err: any) {
        failedCount++;
        errors.push(err?.message || "Erro desconhecido");
      }
    }

    return {
      success: true,
      action: data.action,
      total: data.mined_article_ids.length,
      processed: processedCount,
      failed: failedCount,
      errors: errors.slice(0, 3),
    };
  });

export const aiRewriteMinedArticle = createServerFn({ method: "POST" })
 .validator(z.object({
 mined_article_id: z.string().uuid(),
 tone: z.enum(["editorial", "profissional", "imparcial", "opinativo", "tecnico"]).default("editorial"),
 focus: z.string().optional(), // Aspectos a enfatizar
 store_id: z.string().uuid().optional(),
 consume_tokens: z.boolean().default(true),
 }))
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 // Busca o artigo minerado
 const { data: mined, error: fetchErr } = await supabase
 .from("mined_articles")
 .select("*")
 .eq("id", input.mined_article_id)
 .single();

 if (fetchErr || !mined) throw new Error("Artigo minerado não encontrado.");

 // Validador Pré-Voo de Saldo para Reescrita Editorial
	if (input.consume_tokens && input.store_id) {
		const { data: wallet } = await supabase
			.from("store_token_wallets")
			.select("balance")
			.eq("store_id", input.store_id)
			.maybeSingle();

		if (wallet && (wallet.balance ?? 0) < MINING_TOKEN_COSTS.ai_rewrite) {
			throw new Error(
				`Saldo insuficiente de tokens para reescrita editorial. Necessário: ${MINING_TOKEN_COSTS.ai_rewrite.toLocaleString('pt-BR')} tokens. Saldo atual: ${(wallet.balance ?? 0).toLocaleString('pt-BR')} tokens.`
			);
		}
	}

	const originalContent = JSON.stringify(mined.ai_structured_sections || []);
 const systemPrompt = `Você é um editor-chefe de jornal digital premiado. Reescreva o conteúdo abaixo no tom solicitado, mantendo os fatos e a estrutura em blocos JSON. Retorne APENAS JSON válido.`;
 const userPrompt = `Reescreva este artigo no tom "${input.tone}"${input.focus ? `, enfatizando: ${input.focus}` : ""}.

Título atual: ${mined.ai_structured_title}
Subtítulo atual: ${mined.ai_structured_subtitle}
Seções atuais (JSON): ${originalContent.slice(0, 6000)}

Retorne o JSON:
{
 "title": "Novo título editorial",
 "subtitle": "Novo subtítulo/lead",
 "kicker": "Chapéu da matéria",
 "sections": [
 {"type": "paragraph", "content": "..."},
 {"type": "heading", "content": "..."},
 {"type": "quote", "content": "...", "caption": "Fonte"}
 ],
 "summary": "Novo resumo executivo"
}`;

 let rewritten: any = null;
 try {
 const aiRes = await executeUnifiedAiCall({
 systemPrompt,
 userPrompt,
 responseFormat: "json_object",
 temperature: 0.4,
 });
 rewritten = aiRes.parsedJson;
 } catch (e: any) {
 console.error("[mining] Rewrite Unified AI error:", e.message);
 }

 if (!rewritten) throw new Error("IA não conseguiu realizar a reescrita. Verifique suas chaves de IA no painel.");

 // Atualiza mined_article com conteúdo reescrito
 const { data: updated, error: updateErr } = await supabase
 .from("mined_articles")
 .update({
 ai_structured_title: rewritten.title || mined.ai_structured_title,
 ai_structured_subtitle: rewritten.subtitle || mined.ai_structured_subtitle,
 ai_suggested_kicker: rewritten.kicker || mined.ai_suggested_kicker,
 ai_structured_sections: rewritten.sections || mined.ai_structured_sections,
 ai_summary: rewritten.summary || mined.ai_summary,
 tokens_consumed: (mined.tokens_consumed || 0) + MINING_TOKEN_COSTS.ai_rewrite,
 updated_at: new Date().toISOString(),
 })
 .eq("id", input.mined_article_id)
 .select()
 .single();

 if (updateErr) throw new Error(`Falha ao salvar reescrita: ${updateErr.message}`);

 // Debita tokens
 if (input.consume_tokens && input.store_id) {
 await supabase.rpc("consume_store_tokens", {
 p_store_id: input.store_id,
 p_tokens_to_consume: MINING_TOKEN_COSTS.ai_rewrite,
 p_action_type: "burn_ai_rewrite",
 p_description: `Reescrita editorial (${input.tone}) — ${mined.source_domain}`,
 p_time_saved_minutes: 120,
 p_metadata: { mined_article_id: input.mined_article_id, tone: input.tone },
 });
 }

 return updated;
 });

// ============================================================
// 8. Lista Feeds RSS (com contagens e status)
// ============================================================
export const listRssFeeds = createServerFn({ method: "GET" })
 .validator(z.object({
 store_id: z.string().uuid().optional(),
 active_only: z.boolean().default(false),
 }).optional())
 .handler(async ({ data }) => {
 const supabase = getAnonServerClient();
 let query = supabase
 .from("rss_feeds")
 .select("*")
 .order("name");

 if (data?.active_only) query = query.eq("is_active", true);
 if (data?.store_id) query = query.eq("store_id", data.store_id);

 const { data: feeds, error } = await query;
 if (error) throw new Error(`Falha ao listar feeds: ${error.message}`);
 return feeds || [];
 });

// ============================================================
// 9. Cria/Edita Feed RSS
// ============================================================
export const upsertRssFeed = createServerFn({ method: "POST" })
 .validator(z.object({
 id: z.string().uuid().optional(),
 ...addRssFeedSchema.shape,
 }))
 .handler(async ({ data: { id, ...rest } }) => {
 const identity = await getServerIdentity();
 if (!identity) throw new Error("Não autenticado");
 const supabase = getServerClient();

 if (id) {
 const { data, error } = await supabase
 .from("rss_feeds")
 .update({ ...rest, updated_at: new Date().toISOString() })
 .eq("id", id)
 .select()
 .single();
 if (error) throw new Error(`Falha ao atualizar feed: ${error.message}`);
 return data;
 }

 const { data, error } = await supabase
 .from("rss_feeds")
 .insert(rest)
 .select()
 .single();
 if (error) throw new Error(`Falha ao cadastrar feed: ${error.message}`);
 return data;
 });

// ============================================================
// 10. Toggle RSS Feed ativo/inativo
// ============================================================
export const toggleRssFeed = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid(), is_active: z.boolean() }))
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const { error } = await supabase
 .from("rss_feeds")
 .update({ is_active: data.is_active, updated_at: new Date().toISOString() })
 .eq("id", data.id);
 if (error) throw new Error(`Falha ao alternar feed: ${error.message}`);
 return { success: true };
 });

// ============================================================
// 11. Lista Scraper Configs (Domínios configurados)
// ============================================================
export const listScraperConfigs = createServerFn({ method: "GET" }).handler(
 async (): Promise<ScraperConfigDTO[]> => {
 const supabase = getServerClient();
 const { data, error } = await supabase
 .from("scraper_configs")
 .select("id, domain, label, description, is_active, is_blocked, blocked_reason, requires_javascript, request_delay_ms, max_requests_per_hour, reliability_score, source_credibility, total_scraped, total_published, total_failed, last_scraped_at")
 .order("reliability_score", { ascending: false });

 if (error) throw new Error(`Falha ao listar scrapers: ${error.message}`);
 return (data || []) as ScraperConfigDTO[];
 }
);

// ============================================================
// 12. Salva/Atualiza Scraper Config
// ============================================================
export const upsertScraperConfig = createServerFn({ method: "POST" })
 .validator(z.object({
 id: z.string().uuid().optional(),
 domain: z.string().min(3),
 label: z.string().min(2),
 description: z.string().optional(),
 is_active: z.boolean().default(true),
 is_blocked: z.boolean().default(false),
 blocked_reason: z.string().optional(),
 requires_javascript: z.boolean().default(false),
 request_delay_ms: z.number().int().min(100).default(1000),
 max_requests_per_hour: z.number().int().min(1).default(30),
 css_title: z.string().optional(),
 css_body: z.string().optional(),
 css_cover_image: z.string().optional(),
 css_author: z.string().optional(),
 css_date: z.string().optional(),
 reliability_score: z.number().int().min(0).max(100).default(75),
 source_credibility: z.enum(["high", "medium", "low", "unknown"]).default("medium"),
 }))
 .handler(async ({ data: { id, ...rest } }) => {
 await requireAdmin();
 const supabase = getServerClient();

 if (id) {
 const { data, error } = await supabase
 .from("scraper_configs")
 .update({ ...rest, updated_at: new Date().toISOString() })
 .eq("id", id)
 .select()
 .single();
 if (error) throw new Error(`Falha ao atualizar config: ${error.message}`);
 return data;
 }

 const { data, error } = await supabase
 .from("scraper_configs")
 .insert(rest)
 .select()
 .single();
 if (error) throw new Error(`Falha ao criar config: ${error.message}`);
 return data;
 });

// ============================================================
// 13. Dispara fetch de RSS manualmente (processa itens do feed)
// ============================================================
export const triggerRssFeedFetch = createServerFn({ method: "POST" })
 .validator(z.object({ feed_id: z.string().uuid() }))
 .handler(async ({ data: { feed_id } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity?.id) throw new Error("Não autenticado");

 // Busca o feed
 const { data: feed, error: feedErr } = await supabase
 .from("rss_feeds")
 .select("*")
 .eq("id", feed_id)
 .single();

 if (feedErr || !feed) throw new Error("Feed não encontrado.");
 if (!feed.is_active) throw new Error("Feed inativo — ative-o antes de fazer fetch.");

 // Faz fetch do XML RSS
 let feedXml = "";
 try {
 const res = await fetch(feed.feed_url, {
 headers: { "User-Agent": "Waesy/1.0 RSS Reader (+https://usewaesy.pages.dev)", Accept: "application/rss+xml, application/xml, text/xml" },
 signal: AbortSignal.timeout(10000),
 });
 if (!res.ok) throw new Error(`HTTP ${res.status}`);
 feedXml = await res.text();
 } catch (e: any) {
 await supabase.from("rss_feeds")
 .update({ error_count: (feed.error_count || 0) + 1, last_error: e.message, updated_at: new Date().toISOString() })
 .eq("id", feed_id);
 throw new Error(`Falha ao buscar RSS: ${e.message}`);
 }

 // Parse básico do XML RSS (sem dependência de parser externo)
 const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
 const getTag = (xml: string, tag: string) => {
 const match = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`, "i"));
 return match ? (match[1] || match[2] || "").trim() : "";
 };

 const items: Array<{ guid: string; title: string; link: string; description: string; author: string; pub_date: string; image_url: string | null }> = [];
 let match;
 while ((match = itemRegex.exec(feedXml)) !== null && items.length < (feed.max_items_per_fetch || 20)) {
 const itemXml = match[1];
 const title = getTag(itemXml, "title");
 const link = getTag(itemXml, "link") || getTag(itemXml, "guid");
 const description = getTag(itemXml, "description");
 const author = getTag(itemXml, "author") || getTag(itemXml, "dc:creator");
 const pubDateStr = getTag(itemXml, "pubDate") || getTag(itemXml, "dc:date");
 const guid = getTag(itemXml, "guid") || link;

 // Tenta extrair imagem do media:content ou enclosure
 const imgMatch = itemXml.match(/<media:content[^>]+url="([^"]+)"|<enclosure[^>]+url="([^"]+)"/i);
 const image_url = imgMatch ? (imgMatch[1] || imgMatch[2]) : null;

 if (!title || !link) continue;

 // Hash para deduplicação
 const hashInput = `${title}|${link}`;
 const hash = Buffer.from(hashInput).toString("base64").slice(0, 32);

 items.push({ guid, title, link, description, author, pub_date: pubDateStr, image_url });

 // Insere no banco (ignora duplicatas)
 await supabase.from("rss_feed_items")
 .upsert({
 rss_feed_id: feed_id,
 item_guid: guid,
 item_hash: hash,
 title,
 description: description.slice(0, 5000),
 link,
 author: author || null,
 pub_date: pubDateStr ? new Date(pubDateStr).toISOString() : null,
 image_url: image_url || null,
 status: "pending",
 }, { onConflict: "rss_feed_id,item_guid", ignoreDuplicates: true });
 }

 // Atualiza stats do feed
 await supabase.from("rss_feeds")
 .update({
 last_fetched_at: new Date().toISOString(),
 last_success_at: new Date().toISOString(),
 items_count: (feed.items_count || 0) + items.length,
 error_count: 0,
 last_error: null,
 updated_at: new Date().toISOString(),
 })
 .eq("id", feed_id);

 return { fetched: items.length, items };
 });

// ============================================================
// 14. Worker Autônomo: Processa lote da fila de crawling em 4 Camadas
// mechanical-extractor -> integrity-gate -> curateWithEditorialSquad -> mined_articles
// ============================================================
export const processCrawlQueueBatch = createServerFn({ method: "POST" })
  .validator(
    z.object({
      limit: z.number().int().min(1).max(20).optional(),
      batchSize: z.number().int().min(1).max(20).optional(),
      storeId: z.string().uuid().optional(),
    }).optional()
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const batchSize = data?.batchSize || data?.limit || 5;

    // 1. Busca itens pendentes ordenados por prioridade e idade
    let query = supabase
      .from("crawl_queue")
      .select("*")
      .eq("status", "pending")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (data?.storeId) {
      query = query.eq("store_id", data.storeId);
    }

    const { data: queueItems, error: fetchErr } = await query;
    if (fetchErr || !queueItems || queueItems.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0, items: [], message: "Fila de crawling vazia no momento." };
    }

    const results: Array<{ id: string; url: string; status: "completed" | "failed"; error?: string; articleId?: string }> = [];

    for (const item of queueItems) {
      // 2. Marca como processing
      await supabase
        .from("crawl_queue")
        .update({
          status: "processing",
          processed_at: new Date().toISOString(),
          retry_count: (item.retry_count || 0) + 1,
        })
        .eq("id", item.id);

      try {
        // 3. Extração Mecânica (Camadas 1-4)
        const extraction = await extractContentMechanically(item.url);

        // 4. Validação de Integridade
        const validation = validateMechanicalCompleteness(extraction);
        if (!validation.isValid) {
          throw new Error(validation.reason || "Conteúdo reprovado pelo Integrity Gate");
        }

        // 5. Curadoria Editorial com IA (Squad de 5 Agentes)
        const editorial = await curateWithEditorialSquad({
          rawTitle: extraction.title,
          rawText: extraction.bodyMarkdown,
          sourceName: new URL(item.url).hostname,
          sourceUrl: item.url,
          city: "Chapecó",
        });

        // 6. Imagem de Capa e Formatação
        let coverUrl = extraction.coverImageUrl;
        if (!coverUrl || !(await isHealthyImageUrl(coverUrl))) {
          coverUrl = getFallbackThematicImage(editorial?.category || "cidade");
        }

        // 7. Grava em mined_articles
        const { data: minedArticle, error: insertErr } = await supabase
          .from("mined_articles")
          .insert({
            source_url: item.url,
            source_domain: new URL(item.url).hostname,
            source_type: "crawl",
            store_id: item.store_id || null,
            raw_title: extraction.title,
            ai_structured_title: editorial?.title || extraction.title,
            ai_structured_subtitle: editorial?.subtitle || extraction.lead || "",
            ai_suggested_kicker: editorial?.kicker || "Atualidade",
            ai_suggested_category: editorial?.category || "cidade",
            ai_suggested_tags: editorial?.tags || ["notícias", "chapecó"],
            ai_suggested_cover_url: coverUrl,
            ai_summary: editorial?.key_takeaways?.join(" • ") || extraction.lead || "",
            quality_score: validation.qualityScore,
            quality_flags: validation.flags,
            word_count: extraction.wordCount,
            paragraph_count: extraction.paragraphCount,
            has_cover_image: Boolean(coverUrl),
            is_duplicate: false,
            status: "pending_review",
            extracted_markdown: extraction.bodyMarkdown,
            ai_structured_sections: editorial?.mobile_sections || [],
            metadata: {
              crawl_queue_id: item.id,
              reading_time_minutes: editorial?.reading_time_minutes || 3,
              urgency_level: editorial?.urgency_level || "normal",
              source_attribution: editorial?.source_attribution || "",
            },
          })
          .select("id")
          .single();

        if (insertErr) {
          throw new Error(`Erro ao salvar artigo minerado: ${insertErr.message}`);
        }

        // 8. Atualiza fila como concluído
        await supabase
          .from("crawl_queue")
          .update({
            status: "completed",
            error_message: null,
          })
          .eq("id", item.id);

        results.push({ id: item.id, url: item.url, status: "completed", articleId: minedArticle?.id });
      } catch (itemErr: any) {
        const errMsg = itemErr?.message || "Erro desconhecido";
        await supabase
          .from("crawl_queue")
          .update({
            status: "failed",
            error_message: errMsg.slice(0, 300),
          })
          .eq("id", item.id);

        results.push({ id: item.id, url: item.url, status: "failed", error: errMsg });
      }
    }

    const succeeded = results.filter((r) => r.status === "completed").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return {
      processed: results.length,
      succeeded,
      failed,
      items: results,
    };
  });

// ============================================================
// 15. Worker: Enfileira itens pendentes de RSS feeds na crawl_queue
// ============================================================
export const enqueueRssItemsBatch = createServerFn({ method: "POST" })
 .validator(z.object({
 limit: z.number().int().min(1).max(50).default(20),
 }).optional())
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const limit = data?.limit || 20;

 // Busca itens de RSS pendentes
 const { data: pendingRssItems, error: fetchErr } = await supabase
 .from("rss_feed_items")
 .select("*, rss_feeds(store_id, content_type, auto_publish, quality_threshold)")
 .eq("status", "pending")
 .order("pub_date", { ascending: false, nullsFirst: false })
 .order("created_at", { ascending: true })
 .limit(limit);

 if (fetchErr) throw new Error(`Falha ao buscar itens RSS: ${fetchErr.message}`);
 if (!pendingRssItems || pendingRssItems.length === 0) {
 return { enqueued: 0, message: "Nenhum item RSS pendente de enfileiramento." };
 }

 const enqueued = [];

 for (const rssItem of pendingRssItems) {
 const feed = rssItem.rss_feeds as any;
 const url = rssItem.link;
 let domain = "";
 try {
 domain = new URL(url).hostname.replace("www.", "");
 } catch {
 domain = "unknown";
 }

 // Verifica se o domínio está bloqueado
 const { data: scraperConfig } = await supabase
 .from("scraper_configs")
 .select("is_blocked, blocked_reason")
 .eq("domain", domain)
 .maybeSingle();

 if (scraperConfig?.is_blocked) {
 await supabase
 .from("rss_feed_items")
 .update({ status: "skipped", skip_reason: `Domínio bloqueado: ${scraperConfig.blocked_reason || "ToS"}` })
 .eq("id", rssItem.id);
 continue;
 }

 // Cria item na crawl_queue
 const { data: queueItem, error: queueErr } = await supabase
 .from("crawl_queue")
 .insert({
 url,
 domain,
 store_id: feed?.store_id || null,
 content_type: feed?.content_type || "news",
 priority: 6,
 discovered_via: `rss_feed:${rssItem.rss_feed_id}`,
 metadata: {
 rss_feed_item_id: rssItem.id,
 rss_feed_id: rssItem.rss_feed_id,
 raw_title: rssItem.title,
 raw_description: rssItem.description,
 pub_date: rssItem.pub_date,
 image_url: rssItem.image_url,
 },
 })
 .select("id")
 .single();

 if (!queueErr && queueItem) {
 await supabase
 .from("rss_feed_items")
 .update({ status: "enqueued", crawl_queue_id: queueItem.id })
 .eq("id", rssItem.id);
 enqueued.push(queueItem.id);
 }
 }

  return { enqueued: enqueued.length };
  });

// ============================================================
// 15.1. Re-extração mecânica de itens com falha na fila
// ============================================================
export const reprocessFailedQueueItems = createServerFn({ method: "POST" })
  .validator(z.object({ limit: z.number().int().min(1).max(20).default(10) }).optional())
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const limit = data?.limit || 10;

    const { data: failedItems, error } = await supabase
      .from("crawl_queue")
      .select("*")
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Falha ao buscar itens com erro: ${error.message}`);
    if (!failedItems || failedItems.length === 0) {
      return { reprocessed: 0, message: "Nenhum item com falha pendente de re-extração." };
    }

    const results = [];

    for (const item of failedItems) {
      try {
        await supabase
          .from("crawl_queue")
          .update({ status: "processing", started_at: new Date().toISOString() })
          .eq("id", item.id);

        const mined = await processUrlWithAI({
          data: {
            url: item.url,
            store_id: item.store_id || undefined,
            content_type: (item.content_type || "news") as any,
            auto_enqueue: false,
            consume_tokens: false,
          },
        });

        results.push({ id: item.id, url: item.url, success: true, article_id: mined.id });
      } catch (err: any) {
        await supabase
          .from("crawl_queue")
          .update({
            status: "failed",
            processing_error: `Re-extração mecânica falhou: ${err.message?.slice(0, 200)}`,
            completed_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        results.push({ id: item.id, url: item.url, success: false, error: err.message });
      }
    }

    return { reprocessed: results.length, results };
  });

// ============================================================
// 15.2. Mineração e Sincronização de Editais Públicos (PNCP / Chapecó)
// ============================================================
export const syncPncpMunicipalBids = createServerFn({ method: "POST" })
  .validator(
    z.object({
      city: z.string().default("Chapecó"),
      uf: z.string().default("SC"),
      query: z.string().default("Chapecó"),
      limit: z.number().int().min(1).max(30).default(15),
    }).optional()
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const contracts = await fetchPncpContracts({
      query: data?.query || "Chapecó",
      uf: data?.uf || "SC",
      limit: data?.limit || 15,
    });

    let inserted = 0;

    for (const contract of contracts) {
      const mechResult = convertPncpToExtractionResult(contract, data?.city || "Chapecó", data?.uf || "SC");
      const titleHash = generateTitleHash(mechResult.title);

      const { error } = await supabase.from("mined_raw_extractions").upsert(
        {
          content_type: "portal_municipal",
          source_url: contract.urlPortal,
          source_domain: "pncp.gov.br",
          source_name: "Portal Nacional de Contratações Públicas (PNCP)",
          external_id: contract.id,
          raw_title: mechResult.title,
          raw_lead: mechResult.lead,
          raw_body_text: mechResult.bodyMarkdown,
          raw_author: contract.orgaoNome,
          raw_published_at: contract.dataPublicacao || new Date().toISOString(),
          city: data?.city || "Chapecó",
          state: data?.uf || "SC",
          tags: ["licitação", "edital", "prefeitura", (data?.city || "chapecó").toLowerCase()],
          word_count: mechResult.wordCount,
          paragraph_count: mechResult.paragraphCount,
          has_full_content: true,
          extraction_method: "api_pncp",
          title_hash: titleHash,
          status: "curated",
          type_metadata: {
            edital_numero: contract.numeroEdital,
            processo: contract.numeroProcesso,
            modalidade: contract.modalidade,
            valor_estimado: contract.valorEstimado,
            data_abertura: contract.dataPublicacao,
            data_encerramento: contract.dataEncerramento,
            orgao: contract.orgaoNome,
          },
        },
        { onConflict: "source_url" }
      );

      if (!error) inserted++;
    }

    return { totalFound: contracts.length, inserted };
  });

// ============================================================
// 15.3. Conversão de Edital PNCP em Pauta / Notícia Jornalística Minerada
// ============================================================
export const convertPncpBidToNewsArticle = createServerFn({ method: "POST" })
  .validator(
    z.object({
      contract_id: z.string(),
      objeto: z.string(),
      orgao: z.string(),
      numero_edital: z.string().optional(),
      modalidade: z.string().optional(),
      valor_estimado: z.number().optional().nullable(),
      url_portal: z.string().url(),
      data_publicacao: z.string().optional(),
      city: z.string().default("Chapecó"),
      store_id: z.string().uuid().optional(),
      enrichWithAi: z.boolean().default(false),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    let storeId = data.store_id;
    if (!storeId) {
      const { data: rootStore } = await supabase
        .from("stores")
        .select("id")
        .eq("is_platform_root", true)
        .maybeSingle();
      storeId = rootStore?.id || null;
    }

    const valorFormatado = data.valor_estimado
      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.valor_estimado)
      : "Valor sob consulta";

    let title = `Edital Público: ${data.orgao} abre licitação para ${data.objeto.slice(0, 100)}`;
    let subtitle = `Processo ${data.numero_edital || "PNCP"} na modalidade ${data.modalidade || "Licitação"}. Estimativa financeira de ${valorFormatado}.`;
    let kicker = "Gestão Pública & Transparência";
    let category = "cidade";
    let tags = ["licitação", "edital", data.city.toLowerCase(), "pncp", "gestão pública"];
    const coverUrl = getFallbackThematicImage("cidade");

    const markdownBody = `## Licitação Pública Municipal em ${data.city}

O órgão **${data.orgao}** publicou aviso oficial através do Portal Nacional de Contratações Públicas (PNCP) referente ao seguinte processo:

> **Objeto:** ${data.objeto}

### Detalhes do Edital
- **Órgão Responsável:** ${data.orgao}
- **Número do Edital:** ${data.numero_edital || "Conforme PNCP"}
- **Modalidade:** ${data.modalidade || "Licitação Pública"}
- **Valor Estimado:** ${valorFormatado}
- **Município:** ${data.city} - SC

Os cidadãos, fornecedores e empresas interessadas podem consultar o edital na íntegra, prazos e anexos técnicos diretamente no Portal Nacional de Contratações Públicas através do link oficial.`;

    let sections: any[] = [
      {
        heading: "Objeto da Contratação",
        content: `O órgão ${data.orgao} publicou processo licitatório visando: ${data.objeto}.`,
      },
      {
        heading: "Valores e Detalhes Operacionais",
        content: `A contratação ocorrerá via modalidade ${data.modalidade || "licitatória"}, com investimento estimado em ${valorFormatado}. Detalhes e anexos estão acessíveis no portal oficial.`,
      },
    ];
    let summary = `${data.orgao} abre licitação para ${data.objeto}. Valor estimado: ${valorFormatado}.`;

    if (data.enrichWithAi) {
      try {
        const editorial = await curateWithEditorialSquad({
          rawTitle: data.objeto,
          rawText: markdownBody,
          sourceName: "pncp.gov.br",
          sourceUrl: data.url_portal,
          city: data.city,
        });

        if (editorial) {
          title = editorial.title;
          subtitle = editorial.subtitle;
          kicker = editorial.kicker || kicker;
          category = editorial.category || "cidade";
          tags = Array.from(new Set([...tags, ...(editorial.tags || [])]));
          summary = editorial.key_takeaways?.join(" • ") || summary;
          if (editorial.mobile_sections && editorial.mobile_sections.length > 0) {
            sections = editorial.mobile_sections.map((s) => ({
              heading: s.heading || "Detalhes",
              content: s.content,
            }));
          }
        }
      } catch (curationErr: any) {
        console.warn("[convertPncpBidToNewsArticle] Editorial squad fallback defensivo:", curationErr?.message);
      }
    }

    const { data: mined, error } = await supabase
      .from("mined_articles")
      .insert({
        source_url: data.url_portal,
        source_domain: "pncp.gov.br",
        source_type: "api",
        store_id: storeId,
        raw_title: data.objeto,
        ai_structured_title: title,
        ai_structured_subtitle: subtitle,
        ai_suggested_kicker: kicker,
        ai_suggested_category: category,
        ai_suggested_tags: tags,
        ai_suggested_cover_url: coverUrl,
        ai_summary: summary,
        ai_sentiment: "neutral",
        quality_score: 95,
        quality_flags: ["edital_oficial", "pncp_verified", "transparencia_publica"],
        word_count: 180,
        has_cover_image: true,
        is_duplicate: false,
        status: "pending_review",
        extracted_markdown: markdownBody,
        ai_structured_sections: sections,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Falha ao converter edital PNCP em notícia minerada: ${error.message}`);
    }

    return { success: true, minedArticleId: mined.id };
  });

// ============================================================
// 16. Verificação Cruzada de Fatos, Completude & Enriquecimento Multi-Tom
// ============================================================
export interface FactCheckReportDTO {
 completeness_score: number; // 0 a 100
 has_5_ws: { who: boolean; what: boolean; where: boolean; when: boolean; why: boolean };
 missing_elements: string[];
 detected_biases: string[];
 alternative_perspectives: string[];
 editorial_version: {
 title: string;
 subtitle: string;
 kicker: string;
 summary: string;
 sections: Array<{ type: string; content: string; caption?: string }>;
 };
 social_copy: string;
 executive_bullet_points: string[];
}

export const crossVerifyAndEnrichArticle = createServerFn({ method: "POST" })
 .validator(z.object({
 mined_article_id: z.string().uuid(),
 store_id: z.string().uuid().optional(),
 consume_tokens: z.boolean().default(true),
 }))
 .handler(async ({ data: input }): Promise<FactCheckReportDTO> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 const { data: mined, error: fetchErr } = await supabase
 .from("mined_articles")
 .select("*")
 .eq("id", input.mined_article_id)
 .single();

 if (fetchErr || !mined) throw new Error("Artigo minerado não encontrado.");

	// Validador Pré-Voo de Saldo para Fact-Checking IA (10.000 tokens)
	if (input.consume_tokens && input.store_id) {
		const { data: wallet } = await supabase
			.from("store_token_wallets")
			.select("balance")
			.eq("store_id", input.store_id)
			.maybeSingle();

		if (wallet && (wallet.balance ?? 0) < 10_000) {
			throw new Error(
				`Saldo insuficiente de tokens para fact-checking IA. Necessário: 10.000 tokens. Saldo atual: ${(wallet.balance ?? 0).toLocaleString('pt-BR')} tokens.`
			);
		}
	}

 const rawSectionsText = JSON.stringify(mined.ai_structured_sections || []);
 const systemPrompt = `Você é um auditor sênior de jornalismo e fact-checking. Analise a matéria fornecida quanto à completude, clareza, neutralidade e precisão dos fatos. Gere uma versão editorial aprimorada de alto padrão. Retorne APENAS JSON válido no formato solicitado.`;
 const userPrompt = `Analise este artigo:
Título: ${mined.ai_structured_title || mined.raw_title}
Subtítulo: ${mined.ai_structured_subtitle}
Fonte de Origem: ${mined.source_domain} (${mined.source_url})
Conteúdo em Blocos: ${rawSectionsText.slice(0, 8000)}

Retorne o JSON estrito:
{
 "completeness_score": 85,
 "has_5_ws": { "who": true, "what": true, "where": true, "when": true, "why": false },
 "missing_elements": ["Falta posicionamento da assessoria da entidade citada", "Data exata da vigência"],
 "detected_biases": ["Tom levemente alarmista na manchete original"],
 "alternative_perspectives": ["Perspectiva dos comerciantes locais afetados"],
 "editorial_version": {
 "title": "Título refinado, equilibrado e impactante",
 "subtitle": "Lead conciso e factual",
 "kicker": "POLÍTICA & CIDADE",
 "summary": "Resumo executivo de 2 frases",
 "sections": [
 {"type": "paragraph", "content": "..."},
 {"type": "heading", "content": "..."},
 {"type": "quote", "content": "...", "caption": "Fonte oficial"}
 ]
 },
 "social_copy": "Texto para Instagram/WhatsApp com gancho e chamada...",
 "executive_bullet_points": ["Ponto 1", "Ponto 2", "Ponto 3"]
}`;

  let report: FactCheckReportDTO | null = null;
  try {
    const aiRes = await executeUnifiedAiCall({
      systemPrompt,
      userPrompt,
      responseFormat: "json_object",
      temperature: 0.3,
    });
    report = aiRes.parsedJson;
  } catch (e: any) {
    console.error("[mining-verify] Unified AI error:", e.message);
  }

  if (!report) throw new Error("Não foi possível gerar a verificação cruzada com IA. Verifique suas chaves de IA no painel.");

 // Atualiza mined_article com o relatório e versão editorial
 await supabase
 .from("mined_articles")
 .update({
 ai_structured_title: report.editorial_version.title || mined.ai_structured_title,
 ai_structured_subtitle: report.editorial_version.subtitle || mined.ai_structured_subtitle,
 ai_suggested_kicker: report.editorial_version.kicker || mined.ai_suggested_kicker,
 ai_structured_sections: report.editorial_version.sections || mined.ai_structured_sections,
 ai_summary: report.editorial_version.summary || mined.ai_summary,
 quality_score: report.completeness_score,
 quality_flags: report.missing_elements,
 tokens_consumed: (mined.tokens_consumed || 0) + 10_000,
 updated_at: new Date().toISOString(),
 })
 .eq("id", input.mined_article_id);

 // Debita tokens se B2B
 if (input.consume_tokens && input.store_id) {
 await supabase.rpc("consume_store_tokens", {
 p_store_id: input.store_id,
 p_tokens_to_consume: 10_000,
 p_action_type: "burn_ai_rewrite",
 p_description: `Auditoria e Fact-Checking IA — ${mined.source_domain}`,
 p_time_saved_minutes: 60,
 p_metadata: { mined_article_id: input.mined_article_id, score: report.completeness_score },
 });
 }

 return report;
 });

// ============================================================
// 17. Extrator Especializado de Receitas Gastronômicas & Fichas Técnicas
// ============================================================
export interface StructuredRecipeDTO {
 title: string;
 description: string;
 category: string;
 prep_time_minutes: number;
 cook_time_minutes: number;
 total_time_minutes: number;
 servings: number;
 difficulty: "facil" | "medio" | "avancado" | "profissional";
 ingredients: Array<{ name: string; quantity: number; unit: string; notes?: string }>;
 instructions: Array<{ step_number: number; instruction: string; tip?: string }>;
 nutritional_info?: { calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number };
 estimated_cost_level: "baixo" | "medio" | "alto";
 chef_tips: string[];
 allergens: string[];
}

export const extractStructuredRecipe = createServerFn({ method: "POST" })
 .validator(z.object({
 url: z.string().url("URL inválida"),
 store_id: z.string().uuid().optional(),
 consume_tokens: z.boolean().default(false),
 }))
 .handler(async ({ data: input }): Promise<StructuredRecipeDTO> => {
 const supabase = getServerClient();

 // 1. Extrai conteúdo bruto via processUrlWithAI interno
 const mined = await processUrlWithAI({
 data: {
 url: input.url,
 content_type: "recipe",
 tone: "profissional",
 store_id: input.store_id,
 auto_enqueue: false,
 consume_tokens: input.consume_tokens,
 },
 });

 const rawSections = JSON.stringify(mined.ai_structured_sections || []);

 const prompt = `Você é um Chef Executivo e Engenheiro de Alimentos. Extraia e estruture esta receita culinária em uma Ficha Técnica completa.
Receita Bruta:
Título: ${mined.ai_structured_title}
Conteúdo: ${rawSections}

Retorne APENAS JSON:
{
 "title": "${mined.ai_structured_title}",
 "description": "${mined.ai_structured_subtitle || "Receita gastronômica"}",
 "category": "prato_principal|sobremesa|lanche|massa|bebida|confeitaria",
 "prep_time_minutes": 20,
 "cook_time_minutes": 30,
 "total_time_minutes": 50,
 "servings": 4,
 "difficulty": "facil|medio|avancado|profissional",
 "ingredients": [
 { "name": "Farinha de Trigo", "quantity": 500, "unit": "g", "notes": "Peneirada" }
 ],
 "instructions": [
 { "step_number": 1, "instruction": "Em uma tigela grande...", "tip": "Não mexa demais" }
 ],
 "nutritional_info": { "calories": 450, "protein_g": 18, "carbs_g": 52, "fat_g": 14 },
 "estimated_cost_level": "baixo|medio|alto",
 "chef_tips": ["Use ingredientes em temperatura ambiente"],
 "allergens": ["Glúten", "Lactose"]
}`;

 const aiRes = await executeUnifiedAiCall({
 userPrompt: prompt,
 responseFormat: "json_object",
 temperature: 0.2,
 });

 if (!aiRes.parsedJson) throw new Error("IA retornou resposta vazia para a receita.");

 return aiRes.parsedJson as StructuredRecipeDTO;
 });

// ============================================================
// 18. Extrator de Ficha Técnica de Produto & Especificações Industriais
// ============================================================
export interface ProductTechSpecDTO {
 product_name: string;
 brand: string;
 model: string;
 category: string;
 summary: string;
 specification_groups: Array<{
 group_name: string;
 specs: Array<{ key: string; value: string; highlight?: boolean }>;
 }>;
 pros: string[];
 cons: string[];
 recommended_for: string[];
 box_contents: string[];
 warranty_months: number;
}

export const extractProductTechSpec = createServerFn({ method: "POST" })
 .validator(z.object({
 url: z.string().url("URL inválida"),
 store_id: z.string().uuid().optional(),
 consume_tokens: z.boolean().default(false),
 }))
 .handler(async ({ data: input }): Promise<ProductTechSpecDTO> => {
 const supabase = getServerClient();

 const mined = await processUrlWithAI({
 data: {
 url: input.url,
 content_type: "tech_spec",
 tone: "tecnico",
 store_id: input.store_id,
 auto_enqueue: false,
 consume_tokens: input.consume_tokens,
 },
 });

 const prompt = `Você é um Engenheiro de Produto. Extraia uma Ficha Técnica completa do produto abaixo:
URL: ${input.url}
Título: ${mined.ai_structured_title}
Conteúdo Bruto: ${JSON.stringify(mined.ai_structured_sections || []).slice(0, 8000)}

Retorne APENAS JSON:
{
 "product_name": "${mined.ai_structured_title}",
 "brand": "Marca identificada",
 "model": "Modelo identificado",
 "category": "Eletrônicos|Informática|Moda|Casa|Ferramentas|Geral",
 "summary": "Resumo técnico das principais especificações",
 "specification_groups": [
 {
 "group_name": "Dimensões & Peso",
 "specs": [
 { "key": "Altura", "value": "15 cm", "highlight": false },
 { "key": "Peso", "value": "180 g", "highlight": true }
 ]
 },
 {
 "group_name": "Conectividade & Bateria",
 "specs": [
 { "key": "Bluetooth", "value": "5.3", "highlight": true },
 { "key": "Autonomia", "value": "30 horas", "highlight": true }
 ]
 }
 ],
 "pros": ["Excelente autonomia", "Design ergonômico"],
 "cons": ["Sem carregador na caixa"],
 "recommended_for": ["Uso profissional", "Trabalho remoto"],
 "box_contents": ["Aparelho", "Cabo USB-C", "Manual"],
 "warranty_months": 12
}`;

 const aiRes = await executeUnifiedAiCall({
 userPrompt: prompt,
 responseFormat: "json_object",
 temperature: 0.2,
 });

 if (!aiRes.parsedJson) throw new Error("IA retornou resposta vazia para ficha técnica.");

 return aiRes.parsedJson as ProductTechSpecDTO;
 });

// ============================================================
// Helpers Internos
// ============================================================
function calculateQualityScore(extracted: any): number {
 let score = 50;
 if (extracted.title && extracted.title.length > 20) score += 10;
 if (extracted.subtitle && extracted.subtitle.length > 30) score += 10;
 if (extracted.cover_image_url) score += 10;
 if (extracted.sections && extracted.sections.length >= 3) score += 10;
 if (extracted.tags && extracted.tags.length >= 2) score += 5;
 if (extracted.summary && extracted.summary.length > 50) score += 5;
 return Math.min(100, score);
}

export const listPncpContractsAction = createServerFn({ method: "GET" })
  .validator((data?: { city?: string; uf?: string; limit?: number }) => data || {})
  .handler(async ({ data }) => {
    return await fetchPncpContracts({
      query: data?.city || "Chapecó",
      uf: data?.uf || "SC",
      limit: data?.limit || 20,
    });
  });

// Exportações de retrocompatibilidade
export const createRssFeed = upsertRssFeed;
export const addCrawlQueue = addUrlToCrawlQueue;

// ============================================================
// 19. Funções Unificadas de Mineração, Crawling e Enriquecimento Cadastral
// ============================================================

/**
 * Retorna as estatísticas consolidadas da infraestrutura de mineração
 */
export const getMiningStatsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<MiningStats> => {
    const supabase = getServerClient();

    const [
      crawlQueueRes,
      businessesRes,
      rssRes,
      auditRes,
      lastAuditRes,
      minedRes,
    ] = await Promise.all([
      supabase.from("crawl_queue").select("status"),
      supabase.from("directory_listings").select("id, cnpj, data_quality_score"),
      supabase.from("rss_feeds").select("id, is_active"),
      supabase.from("scraper_audit_log").select("id, status"),
      supabase
        .from("scraper_audit_log")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("mined_articles").select("status"),
    ]);

    const queueItems = crawlQueueRes.data || [];
    const queueStats = {
      total: queueItems.length,
      pending: queueItems.filter((i) => i.status === "pending").length,
      processing: queueItems.filter((i) => i.status === "processing").length,
      completed: queueItems.filter((i) => i.status === "completed").length,
      failed: queueItems.filter((i) => i.status === "failed").length,
    };

    const businesses = businessesRes.data || [];
    const businessesStats = {
      total: businesses.length,
      withCnpj: businesses.filter((b) => Boolean(b.cnpj)).length,
      highQuality: businesses.filter((b) => (b.data_quality_score || 0) >= 70).length,
    };

    const feeds = rssRes.data || [];
    const feedsStats = {
      total: feeds.length,
      active: feeds.filter((f) => f.is_active).length,
    };

    const audits = auditRes.data || [];
    const successfulAudits = audits.filter((a) => a.status === "success" || !a.status).length;
    const successRate = audits.length > 0 ? Math.round((successfulAudits / audits.length) * 100) : 100;

    const minedArticles = minedRes.data || [];
    const minedStats = {
      total: minedArticles.length,
      pendingReview: minedArticles.filter((m) => m.status === "pending_review").length,
      published: minedArticles.filter((m) => m.status === "published").length,
    };

    return {
      crawlQueue: queueStats,
      indexedBusinesses: businessesStats,
      rssFeeds: feedsStats,
      scraperAudit: {
        totalRuns: audits.length,
        lastRunAt: lastAuditRes.data?.created_at || null,
        successRatePercent: successRate,
      },
      economicIndicators: {
        totalAvailable: 10,
        lastUpdated: new Date().toISOString(),
      },
    };
  }
);

/**
 * Lista itens da fila de exploração (crawl_queue)
 */
export const getCrawlQueueFn = createServerFn({ method: "GET" })
  .validator(
    z.object({
      status: z.enum(["all", "pending", "processing", "completed", "failed"]).optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    })
  )
  .handler(async ({ data }): Promise<any> => {
    const supabase = getServerClient();
    let query = supabase
      .from("crawl_queue")
      .select("*", { count: "exact" })
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.status && data.status !== "all") {
      query = query.eq("status", data.status);
    }

    const { data: rows, count, error } = await query;
    if (error) {
      console.error("[MiningBFF] Erro ao carregar crawl_queue:", error);
      return { items: [], total: 0 };
    }

    return {
      items: (rows as unknown as CrawlQueueItem[]) || [],
      total: count || 0,
    };
  });

/**
 * Lista empresas mineradas e indexadas no Diretório Canônico (Single Source of Truth)
 */
export const getIndexedBusinessesFn = createServerFn({ method: "GET" })
  .validator(
    z.object({
      search: z.string().optional(),
      city: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    })
  )
  .handler(async ({ data }): Promise<any> => {
    const supabase = getServerClient();
    let query = supabase
      .from("directory_listings")
      .select("*", { count: "exact" })
      .order("data_quality_score", { ascending: false })
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.search) {
      query = query.or(`business_name.ilike.%${data.search}%,description.ilike.%${data.search}%`);
    }

    if (data.city) {
      query = query.ilike("city", `%${data.city}%`);
    }

    const { data: rows, count, error } = await query;
    if (error) {
      console.error("[MiningBFF] Erro ao carregar directory_listings:", error);
      return { items: [], total: 0 };
    }

    const mapped: IndexedBusiness[] = ((rows as any[]) || []).map((row) => ({
      id: row.id,
      external_id: row.external_id || `dir-${row.id}`,
      source: row.source || (row.is_crawled ? "crawler" : "directory"),
      name: row.business_name || row.name || "Empresa",
      description: row.description,
      category: row.category,
      address: row.address,
      city: row.city,
      state: row.state,
      neighborhood: row.neighborhood,
      lat: row.latitude,
      lng: row.longitude,
      phone: row.contact_phone || row.contact_whatsapp,
      website: row.website_url,
      cnpj: row.cnpj,
      rating: row.rating,
      reviews_count: row.reviews_count,
      price_level: row.price_level,
      hours: row.working_hours,
      photos: row.photos,
      delivery: row.delivery,
      scraper_source: row.scraper_source,
      data_quality_score: row.data_quality_score ?? 50,
      last_validated_at: row.last_validated_at,
      metadata: row.metadata,
      indexed_at: row.created_at,
      created_at: row.created_at,
    }));

    return {
      items: mapped,
      total: count || 0,
    };
  });

/**
 * Consulta histórico de auditoria de scrapers
 */
export const getScraperAuditLogsFn = createServerFn({ method: "GET" })
  .validator(
    z.object({
      limit: z.number().default(50),
    })
  )
  .handler(async ({ data }): Promise<any> => {
    const supabase = getServerClient();
    const { data: rows, error } = await supabase
      .from("scraper_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (error) {
      console.error("[MiningBFF] Erro ao carregar scraper_audit_log:", error);
      return [];
    }

    return (rows as unknown as ScraperAuditLogEntry[]) || [];
  });

/**
 * Lista feeds RSS cadastrados
 */
export const getRssFeedsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<RssFeedContract[]> => {
    const supabase = getServerClient();
    const { data: rows, error } = await supabase
      .from("rss_feeds")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[MiningBFF] Erro ao carregar rss_feeds:", error);
      return [];
    }

    return (rows as unknown as RssFeedContract[]) || [];
  }
);

/**
 * Obtém os indicadores de mercado do Banco Central em tempo real
 */
export const getMarketIndicatorsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<EconomicIndicator[]> => {
    return await fetchAllMarketIndicators();
  }
);

/**
 * Executa um scraper ou crawler de forma transacional e grava auditoria
 */
export const runScraperFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      scraperType: z.enum(["continuous-crawler", "rss-fetcher", "market-data", "cnpj-enrichment"]),
      targetUrl: z.string().optional(),
      cnpj: z.string().optional(),
    })
  )
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      message: string;
      itemsProcessed: number;
      durationMs: number;
      payload?: Record<string, any> | null;
    }> => {
      const startTime = Date.now();
      const supabase = getServerClient();

      try {
        switch (data.scraperType) {
          case "continuous-crawler": {
            let urlToCrawl = data.targetUrl;
            let queueItemId: string | null = null;
            let queueItemAttempts = 0;

            if (!urlToCrawl) {
              const nowIso = new Date().toISOString();
              const { data: nextItem } = await supabase
                .from("crawl_queue")
                .select("id, url, attempts, domain")
                .eq("status", "pending")
                .lte("scheduled_for", nowIso)
                .order("priority", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (nextItem) {
                // Checa cooldown do domínio antes de processar
                const d = nextItem.domain || extractDomain(nextItem.url);
                const cooldown = isDomainInCooldown(d);
                if (cooldown.inCooldown) {
                  // Reagenda o item para depois do cooldown
                  const newSchedule = new Date(Date.now() + cooldown.remainingSeconds * 1000).toISOString();
                  await supabase
                    .from("crawl_queue")
                    .update({
                      scheduled_for: newSchedule,
                      cooldown_until: newSchedule,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", nextItem.id);

                  return {
                    success: false,
                    message: `Domínio "${d}" em pausa anti-ban por mais ${cooldown.remainingSeconds}s (${cooldown.reason}). Fila postergada.`,
                    itemsProcessed: 0,
                    durationMs: Date.now() - startTime,
                  };
                }

                urlToCrawl = nextItem.url;
                queueItemId = nextItem.id;
                queueItemAttempts = nextItem.attempts || 0;
                await supabase
                  .from("crawl_queue")
                  .update({
                    status: "processing",
                    last_attempt_at: nowIso,
                    attempts: queueItemAttempts + 1,
                    updated_at: nowIso,
                  })
                  .eq("id", queueItemId);
              }
            }

            if (!urlToCrawl) {
              return {
                success: true,
                message: "Nenhuma URL pendente pronta na fila para rastrear.",
                itemsProcessed: 0,
                durationMs: Date.now() - startTime,
              };
            }

            let pageData;
            try {
              pageData = await executeContinuousCrawl(urlToCrawl, queueItemAttempts + 1);
            } catch (crawlErr) {
              const errMsg = crawlErr instanceof Error ? crawlErr.message : String(crawlErr);
              const domain = extractDomain(urlToCrawl);
              const isCooldownErr = errMsg.includes("DOMAIN_COOLDOWN");
              const is429 = errMsg.includes("429");
              const is403 = errMsg.includes("403");

              const cooldownMs = is429 ? 15 * 60 * 1000 : is403 ? 30 * 60 * 1000 : 5 * 60 * 1000;
              setDomainCooldown(
                domain,
                cooldownMs,
                is429 ? "rate_limit_429" : is403 ? "cloudflare_403" : "crawl_exception"
              );

              if (queueItemId) {
                const nextStatus = queueItemAttempts + 1 >= 5 ? "failed" : "pending";
                await supabase
                  .from("crawl_queue")
                  .update({
                    status: nextStatus,
                    last_error: errMsg,
                    is_blocked: is403 || isCooldownErr,
                    cooldown_until: new Date(Date.now() + cooldownMs).toISOString(),
                    scheduled_for: new Date(Date.now() + cooldownMs).toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", queueItemId);
              }

              await supabase.from("scraper_audit_log").insert({
                scraper_name: "continuous-crawler",
                action: "crawl_error",
                target_table: "crawl_queue",
                records_affected: 0,
                duration_ms: Date.now() - startTime,
                error_message: errMsg,
                result_summary: { url: urlToCrawl, domain, attempts: queueItemAttempts + 1 },
              });

              return {
                success: false,
                message: `Erro ao rastrear ${urlToCrawl}: ${errMsg}`,
                itemsProcessed: 0,
                durationMs: Date.now() - startTime,
              };
            }

            // Tratamento explícito quando o scraper retorna success === false (sem throw)
            if (!pageData.success) {
              const domain = pageData.domain || extractDomain(urlToCrawl);
              const is429 = pageData.rateLimited || pageData.httpStatus === 429;
              const is403 = pageData.isBlocked || pageData.httpStatus === 403;
              const cooldownMs = is429 ? 15 * 60 * 1000 : is403 ? 30 * 60 * 1000 : 10 * 60 * 1000;

              setDomainCooldown(
                domain,
                cooldownMs,
                is429 ? "rate_limit_429" : is403 ? "cloudflare_403" : "scrape_failure",
                pageData.httpStatus
              );

              if (queueItemId) {
                const nextStatus = queueItemAttempts + 1 >= 5 ? "failed" : "pending";
                await supabase
                  .from("crawl_queue")
                  .update({
                    status: nextStatus,
                    last_error: pageData.error,
                    last_http_status: pageData.httpStatus,
                    is_blocked: pageData.isBlocked ?? false,
                    cooldown_until: new Date(Date.now() + cooldownMs).toISOString(),
                    scheduled_for: new Date(Date.now() + cooldownMs).toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", queueItemId);
              }

              // Grava também na tabela de cooldowns persistente
              await supabase.from("domain_cooldowns").upsert({
                domain,
                reason: is429 ? "rate_limit_429" : is403 ? "cloudflare_403" : "scrape_failure",
                http_status: pageData.httpStatus,
                cooldown_until: new Date(Date.now() + cooldownMs).toISOString(),
                last_error: pageData.error,
                updated_at: new Date().toISOString(),
              });

              await supabase.from("scraper_audit_log").insert({
                scraper_name: "continuous-crawler",
                action: "scrape_failure",
                target_table: "crawl_queue",
                records_affected: 0,
                duration_ms: Date.now() - startTime,
                error_message: pageData.error,
                result_summary: {
                  url: pageData.url,
                  domain,
                  httpStatus: pageData.httpStatus,
                  isBlocked: pageData.isBlocked,
                  rateLimited: pageData.rateLimited,
                  cooldownMinutes: Math.round(cooldownMs / 60000),
                },
              });

              return {
                success: false,
                message: `Falha na raspagem de ${urlToCrawl} (HTTP ${pageData.httpStatus}): ${pageData.error}. Domínio em cooldown de ${Math.round(cooldownMs / 60000)}m.`,
                itemsProcessed: 0,
                durationMs: Date.now() - startTime,
              };
            }

            // Limpa cooldown prévio do domínio se o scraping teve sucesso
            clearDomainCooldown(pageData.domain);

            // Grava cache com status HTTP real
            await supabase.from("crawl_cache").upsert({
              url: pageData.url,
              domain: pageData.domain,
              status_code: pageData.httpStatus || 200,
              content_hash: pageData.contentHash,
              html_content: pageData.cleanText.substring(0, 5000),
              extracted_open_graph: pageData.openGraph,
              extracted_json_ld: pageData.jsonLd,
              response_time_ms: Date.now() - startTime,
              crawled_at: new Date().toISOString(),
            });

            // Enfileira novos links encontrados com DEDUPLICAÇÃO
            if (pageData.links.length > 0) {
              const newItems = pageData.links.slice(0, 10).map((link) => ({
                url: link,
                domain: extractDomain(link),
                parent_url: pageData.url,
                status: "pending",
                priority: 3,
                depth: 1,
              }));

              await supabase
                .from("crawl_queue")
                .upsert(newItems, { onConflict: "url", ignoreDuplicates: true });
            }

            // Atualiza status do item da fila para concluído
            if (queueItemId) {
              await supabase
                .from("crawl_queue")
                .update({
                  status: "completed",
                  last_http_status: pageData.httpStatus || 200,
                  is_blocked: false,
                  extracted_data: {
                    title: pageData.title,
                    stats: pageData.stats,
                    classification: pageData.classification,
                  },
                  updated_at: new Date().toISOString(),
                })
                .eq("id", queueItemId);
            }

            const entityType = pageData.classification?.entityType || "news";

            // 1. ROTEAMENTO: PRODUTOS & INTELIGÊNCIA GLOBAL DE PREÇOS
            if (entityType === "product" || pageData.extractedProduct) {
              const prod = pageData.extractedProduct || {
                title: pageData.title,
                priceCents: 0,
                currency: "BRL",
                availability: "in_stock" as const,
              };

              if (prod.title && prod.title.length > 2) {
                await enrichOrInsertMinedProduct(supabase, {
                    source_url: pageData.url,
                    source_domain: pageData.domain,
                    title: prod.title,
                    description: prod.description || pageData.openGraph.description,
                    brand: prod.brand,
                    sku: prod.sku,
                    price_cents: prod.priceCents,
                    compare_at_cents: prod.compareAtCents,
                    currency: prod.currency || "BRL",
                    image_url: prod.imageUrl || pageData.openGraph.image,
                    availability: prod.availability || "in_stock",
                    category: prod.category || pageData.classification?.signals?.[0],
                    price_history: [{ date: new Date().toISOString(), price_cents: prod.priceCents }],
                    quality_score: prod.priceCents > 0 ? 85 : 60,
                    status: "pending_review",
                    updated_at: new Date().toISOString(),
                  });
              }
            }

            // 2. ROTEAMENTO: EMPRESAS & DIRETÓRIO COMERCIAL (SSoT)
            if (entityType === "business" || pageData.extractedBusiness) {
              const biz = pageData.extractedBusiness;
              const businessName = biz?.name || pageData.openGraph.siteName || pageData.title;
              if (businessName && businessName.length > 2) {
                // Síntese de Tom de Voz da Marca via AI Orchestrator
                let brandTone = "Profissional & Confiável";
                if (pageData.cleanText.length > 200) {
                  try {
                    const aiTonePrompt = `Analise o texto institucional desta empresa e retorne em no máximo 3 palavras o Tom de Voz da marca (ex: 'Premium & Exclusivo', 'Jovem & Dinâmico', 'Acolhedor & Artesanal', 'Técnico & Preciso').\nTexto: ${pageData.cleanText.slice(0, 800)}`;
                    const toneRes = await executeUnifiedAiCall({
                      prompt: aiTonePrompt,
                      temperature: 0.3,
                      maxTokens: 30,
                    });
                    if (toneRes?.text) {
                      brandTone = toneRes.text.replace(/["\n]/g, "").trim().slice(0, 50);
                    }
                  } catch {
                    // Mantém tom padrão defensivamente
                  }
                }

                const qualityScore = Math.min(
                  100,
                  Math.max(
                    50,
                    (biz?.cnpj ? 30 : 0) +
                      (biz?.phones?.length ? 20 : 0) +
                      (pageData.openGraph.image ? 20 : 0) +
                      (biz?.description ? 15 : 0) +
                      (biz?.socialLinks && Object.keys(biz.socialLinks).length > 0 ? 15 : 0)
                  )
                );

                await supabase.from("directory_listings").upsert(
                  {
                    external_id: `crawl-${pageData.domain}`,
                    source: "crawl",
                    business_name: businessName,
                    description:
                      biz?.description || pageData.openGraph.description || pageData.cleanText.slice(0, 300),
                    cnpj: biz?.cnpj,
                    contact_phone: biz?.phones?.[0],
                    contact_email: biz?.emails?.[0],
                    address: biz?.address,
                    city: biz?.city,
                    state: biz?.state,
                    website: pageData.url,
                    instagram_url: biz?.socialLinks?.instagram,
                    whatsapp_url: biz?.socialLinks?.whatsapp,
                    data_quality_score: qualityScore,
                    is_crawled: true,
                    last_validated_at: new Date().toISOString(),
                    metadata: {
                      brand_tone: brandTone,
                      extracted_at: new Date().toISOString(),
                      social_links: biz?.socialLinks || {},
                    },
                  },
                  { onConflict: "external_id" }
                );
              }
            }

            // 3. ROTEAMENTO: ESTEIRA EDITORIAL / NOTÍCIAS
            if (entityType === "news" || (!pageData.extractedProduct && !pageData.extractedBusiness)) {
              if (pageData.title && pageData.cleanText.length > 50) {
                const qualityScore = Math.min(
                  100,
                  Math.max(
                    40,
                    Math.round(
                      (pageData.stats.wordCount > 150 ? 50 : 25) +
                        (pageData.openGraph.image ? 25 : 0) +
                        (pageData.openGraph.description ? 25 : 0)
                    )
                  )
                );

                await supabase.from("mined_articles").insert({
                  source_url: pageData.url,
                  source_domain: pageData.domain,
                  source_type: "crawl",
                  raw_title: pageData.title,
                  raw_description: pageData.openGraph.description,
                  ai_structured_title: pageData.title,
                  ai_suggested_cover_url: pageData.openGraph.image,
                  ai_summary: pageData.openGraph.description || pageData.cleanText.substring(0, 300),
                  extracted_markdown: pageData.cleanText.substring(0, 10000),
                  quality_score: qualityScore,
                  status: "pending_review",
                  has_cover_image: Boolean(pageData.openGraph.image),
                  word_count: pageData.stats.wordCount,
                  crawl_queue_id: queueItemId || undefined,
                });
              }
            }

            const durationMs = Date.now() - startTime;
            await supabase.from("scraper_audit_log").insert({
              scraper_name: "continuous-crawler",
              action: "crawl",
              target_table: "crawl_cache",
              records_affected: 1,
              duration_ms: durationMs,
              result_summary: {
                title: pageData.title,
                entityType,
                linksDiscovered: pageData.links.length,
                strategy: pageData.strategyUsed,
              },
            });

            return {
              success: true,
              message: `URL ${pageData.url} rastreada com sucesso: "${pageData.title}" [${entityType.toUpperCase()}] (${pageData.links.length} novos links descobertos)`,
              itemsProcessed: 1,
              durationMs,
              payload: pageData,
            };
          }

          case "rss-fetcher": {
            let feeds = [];
            if (data.targetUrl) {
              feeds = [{ feed_url: data.targetUrl, name: "Feed Manual" }];
            } else {
              const { data: dbFeeds } = await supabase
                .from("rss_feeds")
                .select("id, feed_url, name")
                .eq("is_active", true)
                .limit(5);
              feeds = dbFeeds || [];
            }

            if (feeds.length === 0) {
              return {
                success: true,
                message: "Nenhum feed RSS ativo cadastrado.",
                itemsProcessed: 0,
                durationMs: Date.now() - startTime,
              };
            }

            let totalItemsQueued = 0;
            for (const feed of feeds) {
              try {
                const parsed = await parseFeed(feed.feed_url);
                if (parsed.items.length > 0) {
                  const queueInserts = parsed.items.slice(0, 15).map((item) => ({
                    url: item.link,
                    domain: extractDomain(item.link),
                    discovered_via: "rss",
                    entity_type: "news",
                    status: "pending",
                    priority: 7,
                    extracted_data: {
                      title: item.title,
                      description: item.description,
                      publishedAt: item.publishedAt,
                      imageUrl: item.imageUrl,
                    },
                  }));

                  await supabase
                    .from("crawl_queue")
                    .upsert(queueInserts, { onConflict: "url", ignoreDuplicates: true });

                  // Alimenta esteira editorial intermediária para curadoria (apenas links novos)
                  const minedInserts = parsed.items.slice(0, 15).map((item) => ({
                    source_url: item.link,
                    source_domain: extractDomain(item.link),
                    source_type: "rss" as const,
                    raw_title: item.title,
                    raw_description: item.description,
                    ai_structured_title: item.title,
                    ai_suggested_cover_url: item.imageUrl,
                    ai_summary: item.description,
                    extracted_markdown: item.contentEncoded || item.description,
                    quality_score: 75,
                    status: "pending_review" as const,
                    has_cover_image: Boolean(item.imageUrl),
                  }));

                  // Insere ignorando duplicatas de source_url
                  for (const m of minedInserts) {
                    const { data: existing } = await supabase
                      .from("mined_articles")
                      .select("id")
                      .eq("source_url", m.source_url)
                      .maybeSingle();

                    if (!existing) {
                      await supabase.from("mined_articles").insert(m);
                    }
                  }
                  totalItemsQueued += queueInserts.length;
                }
              } catch (err) {
                console.warn(`[MiningBFF] Erro ao processar feed ${feed.feed_url}:`, err);
              }
            }

            const durationMs = Date.now() - startTime;
            await supabase.from("scraper_audit_log").insert({
              scraper_name: "rss-fetcher",
              action: "fetch_feeds",
              target_table: "crawl_queue",
              records_affected: totalItemsQueued,
              duration_ms: durationMs,
            });

            return {
              success: true,
              message: `Feeds processados. ${totalItemsQueued} novos artigos enfileirados na crawl_queue.`,
              itemsProcessed: totalItemsQueued,
              durationMs,
            };
          }

          case "market-data": {
            const indicators = await fetchAllMarketIndicators();
            const durationMs = Date.now() - startTime;

            await supabase.from("scraper_audit_log").insert({
              scraper_name: "market-data-miner",
              action: "fetch_bcb_indicators",
              records_affected: indicators.length,
              duration_ms: durationMs,
              result_summary: { indicatorsCount: indicators.length },
            });

            return {
              success: true,
              message: `${indicators.length} indicadores econômicos do Banco Central minerados com sucesso.`,
              itemsProcessed: indicators.length,
              durationMs,
              payload: indicators,
            };
          }

          case "cnpj-enrichment": {
            const cnpjToEnrich = data.cnpj;
            if (!cnpjToEnrich) {
              return {
                success: false,
                message: "CNPJ não informado para enriquecimento.",
                itemsProcessed: 0,
                durationMs: Date.now() - startTime,
              };
            }

            const enriched = await enrichCnpj(cnpjToEnrich);
            if (!enriched) {
              return {
                success: false,
                message: `Não foi possível encontrar dados oficiais para o CNPJ ${cnpjToEnrich}.`,
                itemsProcessed: 0,
                durationMs: Date.now() - startTime,
              };
            }

            // Upsert na tabela canônica directory_listings (Single Source of Truth)
            await supabase.from("directory_listings").upsert({
              external_id: `cnpj-${enriched.cnpj}`,
              source: enriched.source,
              business_name: enriched.nome_fantasia || enriched.razao_social,
              cnpj: enriched.cnpj,
              description: `Atividade Principal: ${enriched.cnae_principal?.descricao || 'Comércio/Serviços'}`,
              category: enriched.cnae_principal?.descricao || "Empresa",
              address: `${enriched.endereco?.logradouro || ''}, ${enriched.endereco?.numero || 'S/N'}`.trim(),
              city: enriched.endereco?.municipio,
              state: enriched.endereco?.uf,
              neighborhood: enriched.endereco?.bairro,
              contact_phone: enriched.telefones?.[0],
              data_quality_score: enriched.dataQualityScore,
              is_crawled: true,
              last_validated_at: new Date().toISOString(),
              status: "active",
              metadata: {
                socios: enriched.socios,
                capital_social: enriched.capital_social,
                cnae_principal: enriched.cnae_principal,
                situacao: enriched.situacao_cadastral,
              },
            });

            const durationMs = Date.now() - startTime;
            await supabase.from("scraper_audit_log").insert({
              scraper_name: "cnpj-enrichment",
              action: "enrich_cnpj",
              target_table: "directory_listings",
              records_affected: 1,
              duration_ms: durationMs,
              result_summary: {
                razao_social: enriched.razao_social,
                score: enriched.dataQualityScore,
              },
            });

            return {
              success: true,
              message: `Empresa "${enriched.razao_social}" enriquecida com score de ${enriched.dataQualityScore}%.`,
              itemsProcessed: 1,
              durationMs,
              payload: enriched,
            };
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        await supabase.from("scraper_audit_log").insert({
          scraper_name: data.scraperType,
          action: "error",
          error_message: errorMsg,
          duration_ms: Date.now() - startTime,
        });

        return {
          success: false,
          message: `Erro na execução do minerador: ${errorMsg}`,
          itemsProcessed: 0,
          durationMs: Date.now() - startTime,
        };
      }
    }
  );

/**
 * Adiciona uma URL/domínio como seed e enfileira na crawl_queue
 */
export const addCrawlSeedFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(2),
      url: z.string().url(),
      category: z.string().default("general"),
      region: z.string().optional(),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean; message: string }> => {
    const supabase = getServerClient();
    const domain = extractDomain(data.url);

    // Insere semente
    await supabase.from("crawl_seeds").insert({
      name: data.name,
      seed_url: data.url,
      domain,
      category: data.category,
      region: data.region,
      priority: 8,
    });

    // Enfileira imediatamente
    await supabase.from("crawl_queue").insert({
      url: data.url,
      domain,
      discovered_via: "seed",
      priority: 8,
      status: "pending",
    });

    return {
      success: true,
      message: `Domínio ${domain} adicionado como semente e enfileirado para crawling.`,
    };
  });

/**
 * Cadastra um novo feed RSS
 */
export const addRssFeedFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(2),
      feedUrl: z.string().url(),
      websiteUrl: z.string().optional(),
      category: z.string().default("news"),
      region: z.string().optional(),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean; message: string }> => {
    const supabase = getServerClient();

    await supabase.from("rss_feeds").insert({
      name: data.name,
      feed_url: data.feedUrl,
      website_url: data.websiteUrl,
      category: data.category,
      region: data.region,
      is_active: true,
    });

    return {
      success: true,
      message: `Feed RSS "${data.name}" cadastrado com sucesso.`,
    };
  });

/**
 * Geração em lote de Ghost Stores para empresas mineradas com score superior
 */
export const generateGhostStoresFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      minScore: z.number().int().min(50).max(100).default(80),
      limit: z.number().int().min(1).max(200).default(50),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean; createdCount: number; message: string }> => {
    const identity = await getServerIdentity();
    await requireAdmin();
    const supabase = getServerClient();

    // 1. Tenta executar via stored procedure atômica
    const rpcRes = await supabase.rpc("generate_ghost_stores_from_high_score_listings", {
      p_min_score: data.minScore,
      p_limit: data.limit,
    });

    if (!rpcRes.error && rpcRes.data?.success) {
      return {
        success: true,
        createdCount: rpcRes.data.created_count || 0,
        message: `${rpcRes.data.created_count || 0} Ghost Store(s) gerada(s) com sucesso a partir de listagens com score >= ${data.minScore}%.`,
      };
    }

    // 2. Fallback defensivo caso migration ainda não tenha sido aplicada no banco
    const { data: listings } = await supabase
      .from("directory_listings")
      .select("id, business_name, cnpj, cnae, contact_phone, city, state, address, description, avatar_url, banner_url, photos, data_quality_score, crawl_score, working_hours, scraper_source")
      .gte("data_quality_score", data.minScore)
      .is("ghost_store_id", null)
      .is("store_id", null)
      .not("business_name", "is", null)
      .limit(data.limit);

    if (!listings || listings.length === 0) {
      return {
        success: true,
        createdCount: 0,
        message: "Nenhuma empresa elegível encontrada com score >= " + data.minScore + "% para geração de Ghost Store.",
      };
    }

    const { data: defaultOrg } = await supabase.from("organizations").select("id").limit(1).maybeSingle();
    let createdCount = 0;

    for (const dl of listings) {
      const baseSlug = (dl.business_name || "empresa")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

      const { data: store, error: insertErr } = await supabase
        .from("stores")
        .insert({
          organization_id: defaultOrg?.id || "00000000-0000-0000-0000-000000000001",
          name: dl.business_name,
          slug: uniqueSlug,
          is_ghost: true,
          source_listing_id: dl.id,
          claim_status: "unclaimed",
          settings: {
            is_ghost: true,
            claimed: false,
            cnpj: dl.cnpj,
            phone: dl.contact_phone,
            city: dl.city,
            state: dl.state,
            address: dl.address,
            description: dl.description,
            avatar_url: dl.avatar_url,
            banner_url: dl.banner_url,
            photos: dl.photos,
            quality_score: dl.data_quality_score,
            source: dl.scraper_source || "crawled_directory",
          },
        })
        .select("id")
        .single();

      if (!insertErr && store?.id) {
        await supabase
          .from("directory_listings")
          .update({ ghost_store_id: store.id })
          .eq("id", dl.id);
        createdCount++;
      }
    }

    return {
      success: true,
      createdCount,
      message: `${createdCount} Ghost Store(s) gerada(s) com sucesso.`,
    };
  });

/**
 * Métricas de Ghost Stores e Oportunidades de Claim
 */
export const getGhostStoreMetricsFn = createServerFn({ method: "GET" })
  .handler(async (): Promise<{
    totalGhostStores: number;
    claimedGhostStores: number;
    pendingClaims: number;
    eligibleListings: number;
  }> => {
    const supabase = getServerClient();

    const [
      { count: totalGhost },
      { count: claimedGhost },
      { count: pendingClaims },
      { count: eligibleListings },
    ] = await Promise.all([
      supabase.from("stores").select("id", { count: "exact", head: true }).eq("is_ghost", true),
      supabase.from("stores").select("id", { count: "exact", head: true }).eq("claim_status", "claimed"),
      supabase.from("claim_profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("directory_listings").select("id", { count: "exact", head: true }).gte("data_quality_score", 80).is("ghost_store_id", null),
    ]);

    return {
      totalGhostStores: totalGhost || 0,
      claimedGhostStores: claimedGhost || 0,
      pendingClaims: pendingClaims || 0,
      eligibleListings: eligibleListings || 0,
    };
  });

/**
 * Despacho Central de Execução de Rotinas Agendadas (pg_cron / webhook)
 */
export const dispatchScheduledMiningJobFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      jobType: z.enum(["market-data", "rss-fetcher", "cnpj-enrichment", "continuous-crawler"]),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean; result: any }> => {
    const supabase = getServerClient();
    const startTime = Date.now();

    let jobResult: any = null;

    if (data.jobType === "market-data") {
      const indicators = await fetchAllMarketIndicators();
      jobResult = { count: indicators.length };
      await supabase.from("scraper_audit_log").insert({
        scraper_name: "market-data",
        status: "success",
        duration_ms: Date.now() - startTime,
        items_processed: indicators.length,
        items_inserted: indicators.length,
        metadata: { indicators_count: indicators.length, source: "bcb_sgs_cron" },
      });
    } else if (data.jobType === "rss-fetcher") {
      const { data: feeds } = await supabase.from("rss_feeds").select("*").eq("is_active", true).limit(10);
      let totalParsed = 0;
      if (feeds && feeds.length > 0) {
        for (const feed of feeds) {
          try {
            const parsed = await parseFeed(feed.feed_url);
            totalParsed += parsed.items.length;
          } catch {}
        }
      }
      jobResult = { feedsProcessed: feeds?.length || 0, itemsFound: totalParsed };
      await supabase.from("scraper_audit_log").insert({
        scraper_name: "rss-fetcher",
        status: "success",
        duration_ms: Date.now() - startTime,
        items_processed: feeds?.length || 0,
        items_inserted: totalParsed,
        metadata: { source: "rss_ingester_cron" },
      });
    }

    await supabase
      .from("mining_schedules")
      .update({ last_run_at: new Date().toISOString() })
      .eq("job_type", data.jobType);

    return {
      success: true,
      result: jobResult,
    };
  });

/**
 * Consulta a Base Global de Produtos Minerados (mined_products)
 */
export const getMinedProductsFn = createServerFn({ method: "GET" })
  .validator(
    z.object({
      search: z.string().optional(),
      domain: z.string().optional(),
      status: z.enum(["pending_review", "approved", "rejected", "synced"]).optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    let query = supabase
      .from("mined_products")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.search && data.search.trim().length > 0) {
      query = query.ilike("title", `%${data.search.trim()}%`);
    }

    if (data.domain) {
      query = query.eq("source_domain", data.domain);
    }

    if (data.status) {
      query = query.eq("status", data.status);
    }

    const { data: rows, count, error } = await query;
    if (error) {
      console.error("[MiningBFF] Erro ao carregar mined_products:", error);
      return { products: [], total: 0 };
    }

    return { products: rows || [], total: count || 0 };
  });

/**
 * Radar & Inteligência de Preços Globais (Benchmark Multi-Domínio)
 */
export const getGlobalPriceBenchmarkFn = createServerFn({ method: "GET" })
  .validator(
    z.object({
      query: z.string().min(2),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const cleanQuery = data.query.trim();

    const { data: products, error } = await supabase
      .from("mined_products")
      .select("id, title, price_cents, compare_at_cents, source_domain, source_url, image_url, availability, updated_at")
      .ilike("title", `%${cleanQuery}%`)
      .gt("price_cents", 0)
      .order("price_cents", { ascending: true })
      .limit(30);

    if (error || !products || products.length === 0) {
      return {
        query: cleanQuery,
        matchesCount: 0,
        minPriceCents: 0,
        maxPriceCents: 0,
        averagePriceCents: 0,
        benchmarkSpreadPercent: 0,
        offers: [],
      };
    }

    const prices = products.map((p) => p.price_cents);
    const minPriceCents = Math.min(...prices);
    const maxPriceCents = Math.max(...prices);
    const averagePriceCents = Math.round(prices.reduce((acc, p) => acc + p, 0) / prices.length);
    const spreadPercent = minPriceCents > 0 ? Math.round(((maxPriceCents - minPriceCents) / minPriceCents) * 100) : 0;

    return {
      query: cleanQuery,
      matchesCount: products.length,
      minPriceCents,
      maxPriceCents,
      averagePriceCents,
      benchmarkSpreadPercent: spreadPercent,
      offers: products,
    };
  });

/**
 * Telemetria de Cooldowns de Domínios Ativos
 */
export const getDomainCooldownsFn = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const { data: rows } = await supabase
    .from("domain_cooldowns")
    .select("*")
    .gt("cooldown_until", new Date().toISOString())
    .order("cooldown_until", { ascending: true });

  return { cooldowns: rows || [] };
});

/**
 * Limpeza manual de cooldown de domínio para administradores
 */
export const resetDomainCooldownFn = createServerFn({ method: "POST" })
  .validator(z.object({ domain: z.string() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const cleanDomain = data.domain.toLowerCase().trim();
    clearDomainCooldown(cleanDomain);

    await supabase.from("domain_cooldowns").delete().eq("domain", cleanDomain);

    return { success: true, message: `Cooldown do domínio ${cleanDomain} resetado com sucesso.` };
  });

/**
 * Atualização / Edição de Produto Minerado (CRUD Bilateral)
 */
export const updateMinedProductFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      title: z.string().min(2).optional(),
      description: z.string().optional(),
      price_cents: z.number().int().min(0).optional(),
      compare_at_cents: z.number().int().min(0).nullable().optional(),
      image_url: z.string().url().nullable().optional(),
      category: z.string().optional(),
      availability: z.string().optional(),
      status: z.enum(["pending_review", "approved", "rejected", "synced"]).optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.title !== undefined) updatePayload.title = data.title.trim();
    if (data.description !== undefined) updatePayload.description = data.description?.trim() || null;
    if (data.price_cents !== undefined) updatePayload.price_cents = data.price_cents;
    if (data.compare_at_cents !== undefined) updatePayload.compare_at_cents = data.compare_at_cents;
    if (data.image_url !== undefined) updatePayload.image_url = data.image_url;
    if (data.category !== undefined) updatePayload.category = data.category;
    if (data.availability !== undefined) updatePayload.availability = data.availability;
    if (data.status !== undefined) updatePayload.status = data.status;

    const { data: updated, error } = await supabase
      .from("mined_products")
      .update(updatePayload)
      .eq("id", data.id)
      .select()
      .single();

    if (error) {
      console.error("[updateMinedProductFn] Erro ao atualizar produto minerado:", error);
      throw new Error(`Falha ao atualizar produto minerado: ${error.message}`);
    }

    return { success: true, product: updated };
  });

/**
 * Exclusão de Produto Minerado
 */
export const deleteMinedProductFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const { error } = await supabase.from("mined_products").delete().eq("id", data.id);

    if (error) {
      console.error("[deleteMinedProductFn] Erro ao excluir produto minerado:", error);
      throw new Error(`Falha ao excluir produto minerado: ${error.message}`);
    }

    return { success: true, message: "Produto minerado removido com sucesso." };
  });

/**
 * Importação 1-Toque de Produto Minerado para o Catálogo Oficial da Loja (tabela products)
 */
export const importMinedProductToStoreFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      minedProductId: z.string(),
      storeId: z.string().uuid(),
      customTitle: z.string().optional(),
      customPriceCents: z.number().int().min(0).optional(),
      categoryId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    // 1. Obter o produto minerado
    const { data: mined, error: minedErr } = await supabase
      .from("mined_products")
      .select("*")
      .eq("id", data.minedProductId)
      .single();

    if (minedErr || !mined) {
      throw new Error("Produto minerado não encontrado para importação.");
    }

    // 2. Gerar slug limpo para o produto
    const rawTitle = data.customTitle?.trim() || mined.title;
    const baseSlug = rawTitle
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

    const priceCents = data.customPriceCents ?? mined.price_cents ?? 0;
    const compareAtCents = mined.compare_at_cents ?? null;

    // 3. Inserir produto no catálogo oficial
    const productPayload = {
      store_id: data.storeId,
      title: rawTitle,
      slug: uniqueSlug,
      description: mined.description || `Produto importado automaticamente de ${mined.source_domain}`,
      price_cents: priceCents,
      compare_at_cents: compareAtCents,
      status: "published",
      brand: mined.source_domain || null,
      attributes: {
        imported_from_mining: true,
        source_url: mined.source_url,
        source_domain: mined.source_domain,
        mined_product_id: mined.id,
        imported_by: identity?.id || null,
        imported_at: new Date().toISOString(),
      },
    };

    const { data: newProduct, error: prodErr } = await supabase
      .from("products")
      .insert(productPayload)
      .select("id, title, slug, price_cents, status")
      .single();

    if (prodErr || !newProduct) {
      console.error("[importMinedProductToStoreFn] Erro ao inserir produto oficial:", prodErr);
      throw new Error(`Falha ao criar produto no catálogo: ${prodErr?.message || "Erro desconhecido"}`);
    }

    // 4. Se tiver imagem, vincular à tabela product_media
    if (mined.image_url) {
      try {
        await supabase.from("product_media").insert({
          product_id: newProduct.id,
          url: mined.image_url,
          sort_order: 0,
        });
      } catch (mediaErr: any) {
        console.warn("[importMinedProductToStoreFn] Aviso ao vincular product_media:", mediaErr?.message);
      }
    }

    // 5. Atualizar status do produto minerado para 'synced'
    await supabase
      .from("mined_products")
      .update({
        status: "synced",
        updated_at: new Date().toISOString(),
      })
      .eq("id", mined.id);

    return {
      success: true,
      productId: newProduct.id,
      product: newProduct,
      message: `"${rawTitle}" foi importado com sucesso para o catálogo da sua loja!`,
    };
  });

/**
 * Importação em Lote de Produtos Minerados para uma Loja
 */
export const batchImportMinedProductsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      minedProductIds: z.array(z.string()).min(1),
      storeId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    let successCount = 0;
    const errors: string[] = [];

    for (const minedId of data.minedProductIds) {
      try {
        await importMinedProductToStoreFn({
          data: {
            minedProductId: minedId,
            storeId: data.storeId,
          },
        });
        successCount++;
      } catch (e: any) {
        errors.push(e?.message || `Falha no item ${minedId}`);
      }
    }

    return {
      success: successCount > 0,
      importedCount: successCount,
      totalRequested: data.minedProductIds.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  });

// ============================================================
// Harvesters Especializados & Engine de Economia de Tokens V16
// ============================================================

/**
 * Harvester DataJud CNJ (Processos Judiciais via Elasticsearch Oficial)
 */
export const harvestDataJudMiningFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      process_number: z.string().min(14, "Número CNJ obrigatório"),
      store_id: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity().catch(() => null);
    const result = await harvestAndPersistDataJudProcess({
      processNumber: data.process_number,
      storeId: data.store_id,
      profileId: identity?.id,
    });
    if (!result.success) {
      throw new Error(result.error || "Falha ao minerar processo no DataJud");
    }
    return result;
  });

/**
 * Harvester de Lugares & Empresas (Google Maps / OpenStreetMap Nominatim)
 */
export const harvestPlacesBatchFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      query: z.string().min(2, "Termo de busca obrigatório"),
      city: z.string().default("Chapecó"),
      state: z.string().default("SC"),
      store_id: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity().catch(() => null);
    const result = await harvestAndPersistPlaces({
      query: data.query,
      city: data.city,
      state: data.state,
      storeId: data.store_id,
      authorProfileId: identity?.id,
    });
    if (!result.success) {
      throw new Error(result.error || "Falha ao minerar estabelecimentos locais");
    }
    return result;
  });

/**
 * Harvester Especializado de URL (Notícias, Receitas, Eventos com Zero IA)
 */
export const harvestSpecializedUrlFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      url: z.string().url("URL inválida"),
      store_id: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const extraction = await extractContentMechanically(data.url);
    const supabase = getServerClient();
    const titleHash = generateTitleHash(extraction.title);

    const { data: rawRecord, error } = await supabase
      .from("mined_raw_extractions")
      .insert({
        content_type: extraction.contentType,
        source_url: data.url,
        source_domain: new URL(data.url).hostname.replace("www.", ""),
        source_name: extraction.author || "Extração Mecânica",
        raw_title: extraction.title,
        raw_lead: extraction.lead,
        raw_body_text: extraction.bodyText,
        cover_image_url: extraction.coverImageUrl,
        gallery_images: extraction.galleryImages,
        type_metadata: extraction.recipeData || extraction.eventData || {},
        word_count: extraction.wordCount,
        paragraph_count: extraction.paragraphCount,
        extraction_method: extraction.method,
        title_hash: titleHash,
        status: "ready_for_curation",
        store_id: data.store_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.warn("[harvestSpecializedUrlFn] Erro ao salvar em mined_raw_extractions:", error.message);
    }

    return {
      success: true,
      extraction,
      rawRecordId: rawRecord?.id,
      tokensSavedEstimate: Math.round(extraction.bodyText.length / 4),
    };
  });

/**
 * Telemetria de Economia de Tokens (Mecânica Zero-Token vs IA)
 */
export const getTokenEconomyMetricsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAnonServerClient();

    // Contagem de extrações mecânicas em scraper_audit_log
    const { count: mechanicalCount } = await supabase
      .from("scraper_audit_log")
      .select("*", { count: "exact", head: true });

    // Contagem de itens em mined_articles
    const { count: minedCount } = await supabase
      .from("mined_articles")
      .select("*", { count: "exact", head: true });

    // Contagem de empresas em directory_listings
    const { count: directoryCount } = await supabase
      .from("directory_listings")
      .select("*", { count: "exact", head: true })
      .eq("is_crawled", true);

    // Contagem de processos em mined_lawsuits
    const { count: lawsuitsCount } = await supabase
      .from("mined_lawsuits")
      .select("*", { count: "exact", head: true });

    const totalMechanicalExtractions = (mechanicalCount || 0) + (minedCount || 0) + (directoryCount || 0) + (lawsuitsCount || 0);
    // Cada extração mecânica economiza em média 3.500 tokens de IA
    const estimatedTokensSaved = totalMechanicalExtractions * 3500;

    return {
      totalMechanicalExtractions,
      estimatedTokensSaved,
      breakdown: {
        auditLogEntries: mechanicalCount || 0,
        minedArticles: minedCount || 0,
        crawledDirectoryListings: directoryCount || 0,
        minedLawsuits: lawsuitsCount || 0,
      },
    };
  });

export interface MinedRecipeDTO {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  prep_time: string | null;
  cook_time: string | null;
  total_time: string | null;
  recipe_yield: string | null;
  category: string;
  cuisine: string | null;
  ingredients: string[];
  instructions: string[];
  source_url: string;
  source_domain: string;
  source_name: string;
  status?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Catálogo Público de Receitas Mineradas (Zero-Token Culinária)
 */
export const listPublicRecipesFn = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        category: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(24),
        offset: z.number().int().min(0).default(0),
      })
      .optional()
  )
  .handler(async ({ data }) => {
    const supabase = getAnonServerClient();
    const limit = data?.limit || 24;
    const offset = data?.offset || 0;

    let query = supabase
      .from("mined_raw_extractions")
      .select("*", { count: "exact" })
      .eq("content_type", "receitas")
      .neq("status", "hidden")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (data?.search && data.search.trim()) {
      query = query.ilike("raw_title", `%${data.search.trim()}%`);
    }

    const { data: rows, count, error } = await query;
    if (error) {
      console.error("[listPublicRecipesFn] Error fetching recipes:", error);
      return { recipes: [], total: 0 };
    }

    const recipes: MinedRecipeDTO[] = (rows || []).map((r: any) => {
      const meta = r.type_metadata || {};
      return {
        id: r.id,
        title: r.raw_title,
        description: r.raw_lead || r.raw_body_text?.slice(0, 160) || "",
        cover_image_url: r.cover_image_url || null,
        prep_time: meta.prep_time || null,
        cook_time: meta.cook_time || null,
        total_time: meta.total_time || null,
        recipe_yield: meta.recipe_yield || null,
        category: meta.category || "Geral",
        cuisine: meta.cuisine || null,
        ingredients: Array.isArray(meta.ingredients) ? meta.ingredients : [],
        instructions: Array.isArray(meta.instructions) ? meta.instructions : [],
        source_url: r.source_url || "",
        source_domain: r.source_domain || "",
        source_name: r.source_name || "Waesy Gastronomia",
        status: r.status || "active",
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });

    return {
      recipes,
      total: count || 0,
    };
  });

/**
 * Consulta Detalhada de Receita Pública por ID
 */
export const getPublicRecipeByIdFn = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getAnonServerClient();
    const { data: row, error } = await supabase
      .from("mined_raw_extractions")
      .select("*")
      .eq("id", data.id)
      .eq("content_type", "receitas")
      .maybeSingle();

    if (error || !row) {
      return null;
    }

    const meta = row.type_metadata || {};
    const recipe: MinedRecipeDTO = {
      id: row.id,
      title: row.raw_title,
      description: row.raw_lead || row.raw_body_text || "",
      cover_image_url: row.cover_image_url || null,
      prep_time: meta.prep_time || null,
      cook_time: meta.cook_time || null,
      total_time: meta.total_time || null,
      recipe_yield: meta.recipe_yield || null,
      category: meta.category || "Geral",
      cuisine: meta.cuisine || null,
      ingredients: Array.isArray(meta.ingredients) ? meta.ingredients : [],
      instructions: Array.isArray(meta.instructions) ? meta.instructions : [],
      source_url: row.source_url || "",
      source_domain: row.source_domain || "",
      source_name: row.source_name || "Waesy Gastronomia",
      status: row.status || "active",
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return recipe;
  });

/**
 * Listagem Administrativa de Receitas (Master Admin com Filtros de Status)
 */
export const listAdminMinedRecipesFn = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        search: z.string().optional(),
        category: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
      .optional()
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const limit = data?.limit || 50;
    const offset = data?.offset || 0;

    let query = supabase
      .from("mined_raw_extractions")
      .select("*", { count: "exact" })
      .eq("content_type", "receitas")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (data?.status && data.status !== "all") {
      query = query.eq("status", data.status);
    }
    if (data?.search && data.search.trim()) {
      query = query.ilike("raw_title", `%${data.search.trim()}%`);
    }

    const { data: rows, count, error } = await query;
    if (error) {
      console.error("[listAdminMinedRecipesFn] Error fetching admin recipes:", error);
      return { recipes: [], total: 0 };
    }

    const recipes: MinedRecipeDTO[] = (rows || []).map((r: any) => {
      const meta = r.type_metadata || {};
      return {
        id: r.id,
        title: r.raw_title,
        description: r.raw_lead || r.raw_body_text?.slice(0, 160) || "",
        cover_image_url: r.cover_image_url || null,
        prep_time: meta.prep_time || null,
        cook_time: meta.cook_time || null,
        total_time: meta.total_time || null,
        recipe_yield: meta.recipe_yield || null,
        category: meta.category || "Geral",
        cuisine: meta.cuisine || null,
        ingredients: Array.isArray(meta.ingredients) ? meta.ingredients : [],
        instructions: Array.isArray(meta.instructions) ? meta.instructions : [],
        source_url: r.source_url || "",
        source_domain: r.source_domain || "",
        source_name: r.source_name || "Waesy Gastronomia",
        status: r.status || "active",
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });

    return {
      recipes,
      total: count || 0,
    };
  });

/**
 * Atualização Completa de Receita Minerada (Master Admin)
 */
export const updateMinedRecipeFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      title: z.string().min(2).max(250),
      description: z.string().max(2000).optional(),
      cover_image_url: z.string().url().nullable().optional(),
      prep_time: z.string().nullable().optional(),
      cook_time: z.string().nullable().optional(),
      total_time: z.string().nullable().optional(),
      recipe_yield: z.string().nullable().optional(),
      category: z.string().min(1),
      cuisine: z.string().nullable().optional(),
      ingredients: z.array(z.string().min(1)),
      instructions: z.array(z.string().min(1)),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    const { data: current, error: fetchErr } = await supabase
      .from("mined_raw_extractions")
      .select("type_metadata")
      .eq("id", data.id)
      .single();

    if (fetchErr || !current) {
      throw new Error("Receita não encontrada para atualização.");
    }

    const updatedMetadata = {
      ...(current.type_metadata || {}),
      category: data.category,
      cuisine: data.cuisine || null,
      prep_time: data.prep_time || null,
      cook_time: data.cook_time || null,
      total_time: data.total_time || null,
      recipe_yield: data.recipe_yield || null,
      ingredients: data.ingredients,
      instructions: data.instructions,
    };

    const { error: updateErr } = await supabase
      .from("mined_raw_extractions")
      .update({
        raw_title: data.title,
        raw_lead: data.description || "",
        raw_body_text: data.description || "",
        cover_image_url: data.cover_image_url || null,
        type_metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (updateErr) {
      console.error("[updateMinedRecipeFn] Error:", updateErr);
      throw new Error(`Falha ao salvar receita: ${updateErr.message}`);
    }

    return { success: true };
  });

/**
 * Alternar Visibilidade de Receita (Ocultar / Publicar)
 */
export const toggleMinedRecipeVisibilityFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["active", "hidden", "archived"]),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const { error } = await supabase
      .from("mined_raw_extractions")
      .update({
        status: data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (error) {
      console.error("[toggleMinedRecipeVisibilityFn] Error:", error);
      throw new Error(`Erro ao alterar visibilidade: ${error.message}`);
    }

    return { success: true, status: data.status };
  });

/**
 * Duplicar Receita Minerada (Clona no Banco Real com Sufixo)
 */
export const duplicateMinedRecipeFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    const { data: original, error: fetchErr } = await supabase
      .from("mined_raw_extractions")
      .select("*")
      .eq("id", data.id)
      .single();

    if (fetchErr || !original) {
      throw new Error("Receita original não encontrada.");
    }

    const { id: _, created_at: __, updated_at: ___, ...rest } = original;
    const newTitle = `${original.raw_title} (Cópia)`;

    const { data: inserted, error: insertErr } = await supabase
      .from("mined_raw_extractions")
      .insert({
        ...rest,
        raw_title: newTitle,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      console.error("[duplicateMinedRecipeFn] Error:", insertErr);
      throw new Error(`Erro ao duplicar receita: ${insertErr?.message}`);
    }

    return { success: true, newId: inserted.id };
  });

/**
 * Exclusão Real de Receita do Banco de Dados
 */
export const deleteMinedRecipeFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const { error } = await supabase
      .from("mined_raw_extractions")
      .delete()
      .eq("id", data.id);

    if (error) {
      console.error("[deleteMinedRecipeFn] Error:", error);
      throw new Error(`Erro ao excluir receita: ${error.message}`);
    }

    return { success: true };
  });

/**
 * Criação Manual de Nova Receita Curada (Master Admin / Workspace)
 */
export const createMinedRecipeFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().min(2).max(250),
      description: z.string().max(2000).optional(),
      cover_image_url: z.string().url().nullable().optional(),
      prep_time: z.string().nullable().optional(),
      cook_time: z.string().nullable().optional(),
      total_time: z.string().nullable().optional(),
      recipe_yield: z.string().nullable().optional(),
      category: z.string().min(1),
      cuisine: z.string().nullable().optional(),
      ingredients: z.array(z.string().min(1)),
      instructions: z.array(z.string().min(1)),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    const typeMetadata = {
      category: data.category,
      cuisine: data.cuisine || null,
      prep_time: data.prep_time || null,
      cook_time: data.cook_time || null,
      total_time: data.total_time || null,
      recipe_yield: data.recipe_yield || null,
      ingredients: data.ingredients,
      instructions: data.instructions,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("mined_raw_extractions")
      .insert({
        source_domain: "manual_curation",
        source_url: `https://usewaesy.com/receitas/manual-${Date.now()}`,
        extraction_type: "recipe",
        raw_title: data.title,
        raw_lead: data.description || "",
        raw_body_text: data.description || "",
        cover_image_url: data.cover_image_url || null,
        type_metadata: typeMetadata,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      console.error("[createMinedRecipeFn] Error:", insertErr);
      throw new Error(`Erro ao cadastrar receita: ${insertErr?.message}`);
    }

    return { success: true, id: inserted.id };
  });
