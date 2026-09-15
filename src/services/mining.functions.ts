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

 // 6. Processamento por IA
 let extracted: any = null;
 let aiProviderUsed = "fallback";
 let tokensConsumed = 0;

 const geminiKey = await getNextActiveKey("gemini");
 const groqKey = await getNextActiveKey("groq");

 if (geminiKey) {
 try {
 const gRes = await fetch(
 `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey.rawKey}`,
 {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 systemInstruction: { parts: [{ text: hardenedSystemPrompt }] },
 contents: [{ parts: [{ text: sandboxedUserPrompt }] }],
 generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
 }),
 signal: AbortSignal.timeout(20000),
 }
 );
 if (gRes.ok) {
 const gJson = await gRes.json();
 const txt = gJson?.candidates?.[0]?.content?.parts?.[0]?.text;
 if (txt) { extracted = JSON.parse(txt); aiProviderUsed = "gemini"; }
 } else {
 await supabase.from("api_key_pools").update({ last_error_at: new Date().toISOString(), last_error_message: `HTTP ${gRes.status}` }).eq("id", geminiKey.id);
 }
 } catch (e: any) {
 console.error("[mining] Gemini error:", e.message);
 }
 }

 if (!extracted && groqKey) {
 try {
 const grRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
 method: "POST",
 headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey.rawKey}` },
 body: JSON.stringify({
 model: "llama-3.1-70b-versatile",
 messages: [
 { role: "system", content: `${hardenedSystemPrompt}\nResponda APENAS com JSON válido.` },
 { role: "user", content: sandboxedUserPrompt },
 ],
 temperature: 0.2,
 response_format: { type: "json_object" },
 }),
 signal: AbortSignal.timeout(20000),
 });
 if (grRes.ok) {
 const grJson = await grRes.json();
 const content = grJson?.choices?.[0]?.message?.content;
 if (content) { extracted = JSON.parse(content); aiProviderUsed = "groq"; }
 }
 } catch (e: any) {
 console.error("[mining] Groq error:", e.message);
 }
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

 // Obtém chave ativa para reescrita
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
 return { id: data.id, rawKey };
 }

 const geminiKey = await getNextActiveKey("gemini");
 const groqKey = await getNextActiveKey("groq");

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
 const aiKey = geminiKey || groqKey;
 if (!aiKey) throw new Error("Nenhuma chave de IA ativa disponível para reescrita.");

 if (geminiKey) {
 try {
 const gRes = await fetch(
 `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey.rawKey}`,
 {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 systemInstruction: { parts: [{ text: systemPrompt }] },
 contents: [{ parts: [{ text: userPrompt }] }],
 generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
 }),
 signal: AbortSignal.timeout(25000),
 }
 );
 if (gRes.ok) {
 const gJson = await gRes.json();
 const txt = gJson?.candidates?.[0]?.content?.parts?.[0]?.text;
 if (txt) rewritten = JSON.parse(txt);
 }
 } catch (e: any) { console.error("[mining] Rewrite Gemini error:", e.message); }
 }

 if (!rewritten && groqKey) {
 try {
 const grRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
 method: "POST",
 headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey.rawKey}` },
 body: JSON.stringify({
 model: "llama-3.1-70b-versatile",
 messages: [
 { role: "system", content: `${systemPrompt}\nResponda APENAS com JSON válido.` },
 { role: "user", content: userPrompt },
 ],
 temperature: 0.4,
 response_format: { type: "json_object" },
 }),
 signal: AbortSignal.timeout(25000),
 });
 if (grRes.ok) {
 const grJson = await grRes.json();
 const content = grJson?.choices?.[0]?.message?.content;
 if (content) rewritten = JSON.parse(content);
 }
 } catch (e: any) { console.error("[mining] Rewrite Groq error:", e.message); }
 }

 if (!rewritten) throw new Error("IA não conseguiu realizar a reescrita. Tente novamente.");

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
// 14. Worker: Processa lote da fila de crawling
// ============================================================
export const processCrawlQueueBatch = createServerFn({ method: "POST" })
 .validator(z.object({
 limit: z.number().int().min(1).max(20).default(5),
 }).optional())
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const limit = data?.limit || 5;

 // Busca itens pendentes ordenados por prioridade (1 a 10) e data de criação
 const { data: pendingItems, error: fetchErr } = await supabase
 .from("crawl_queue")
 .select("*")
 .eq("status", "pending")
 .order("priority", { ascending: false })
 .order("created_at", { ascending: true })
 .limit(limit);

 if (fetchErr) throw new Error(`Falha ao buscar fila: ${fetchErr.message}`);
 if (!pendingItems || pendingItems.length === 0) {
 return { processed: 0, message: "Fila de crawling vazia no momento." };
 }

 const results = [];

 for (const item of pendingItems) {
 // Marca como processing
 await supabase
 .from("crawl_queue")
 .update({
 status: "processing",
 started_at: new Date().toISOString(),
 retry_count: (item.retry_count || 0) + 1,
 })
 .eq("id", item.id);

 try {
 const mined = await processUrlWithAI({
 data: {
 url: item.url,
 store_id: item.store_id || undefined,
 content_type: (item.content_type || "news") as any,
 auto_enqueue: false,
 consume_tokens: !!item.store_id,
 },
 });
 results.push({ id: item.id, url: item.url, status: "completed", mined_article_id: mined.id });
 } catch (err: any) {
 console.error(`[mining-worker] Erro ao processar ${item.url}:`, err.message);
 const maxRetries = item.max_retries || 3;
 const willRetry = (item.retry_count || 0) + 1 < maxRetries;

 await supabase
 .from("crawl_queue")
 .update({
 status: willRetry ? "pending" : "failed",
 processing_error: err.message?.slice(0, 500),
 completed_at: willRetry ? null : new Date().toISOString(),
 })
 .eq("id", item.id);

 results.push({ id: item.id, url: item.url, status: willRetry ? "retrying" : "failed", error: err.message });
 }
 }

 return { processed: results.length, results };
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

    const title = `Edital Público: ${data.orgao} abre licitação para ${data.objeto.slice(0, 100)}`;
    const subtitle = `Processo ${data.numero_edital || "PNCP"} na modalidade ${data.modalidade || "Licitação"}. Estimativa financeira de ${valorFormatado}.`;
    const kicker = "Gestão Pública & Transparência";
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

    const sections = [
      {
        heading: "Objeto da Contratação",
        content: `O órgão ${data.orgao} publicou processo licitatório visando: ${data.objeto}.`,
      },
      {
        heading: "Valores e Detalhes Operacionais",
        content: `A contratação ocorrerá via modalidade ${data.modalidade || "licitatória"}, com investimento estimado em ${valorFormatado}. Detalhes e anexos estão acessíveis no portal oficial.`,
      },
    ];

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
        ai_suggested_category: "cidade",
        ai_suggested_tags: ["licitação", "edital", data.city.toLowerCase(), "pncp", "gestão pública"],
        ai_suggested_cover_url: coverUrl,
        ai_summary: `${data.orgao} abre licitação para ${data.objeto}. Valor estimado: ${valorFormatado}.`,
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

 // Chave de IA ativa (Gemini ou Groq)
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
 return { id: data.id, rawKey: Buffer.from(data.encrypted_key, "base64").toString("utf-8") };
 }

 const geminiKey = await getNextActiveKey("gemini");
 const groqKey = await getNextActiveKey("groq");
 const aiKey = geminiKey || groqKey;
 if (!aiKey) throw new Error("Nenhuma chave de IA ativa para verificação.");

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

 if (geminiKey) {
 try {
 const gRes = await fetch(
 `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey.rawKey}`,
 {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 systemInstruction: { parts: [{ text: systemPrompt }] },
 contents: [{ parts: [{ text: userPrompt }] }],
 generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
 }),
 signal: AbortSignal.timeout(25000),
 }
 );
 if (gRes.ok) {
 const gJson = await gRes.json();
 const txt = gJson?.candidates?.[0]?.content?.parts?.[0]?.text;
 if (txt) report = JSON.parse(txt);
 }
 } catch (e: any) {
 console.error("[mining-verify] Gemini error:", e.message);
 }
 }

 if (!report && groqKey) {
 try {
 const grRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
 method: "POST",
 headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey.rawKey}` },
 body: JSON.stringify({
 model: "llama-3.1-70b-versatile",
 messages: [
 { role: "system", content: `${systemPrompt}\nResponda APENAS com JSON válido.` },
 { role: "user", content: userPrompt },
 ],
 temperature: 0.3,
 response_format: { type: "json_object" },
 }),
 signal: AbortSignal.timeout(25000),
 });
 if (grRes.ok) {
 const grJson = await grRes.json();
 const content = grJson?.choices?.[0]?.message?.content;
 if (content) report = JSON.parse(content);
 }
 } catch (e: any) {
 console.error("[mining-verify] Groq error:", e.message);
 }
 }

 if (!report) throw new Error("Não foi possível gerar a verificação cruzada com IA.");

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
 
 // Obtém chave de IA
 const { data: keyData } = await supabase
 .from("api_key_pools")
 .select("id, encrypted_key")
 .in("provider", ["gemini", "groq"])
 .eq("is_active", true)
 .limit(1)
 .maybeSingle();

 if (!keyData?.encrypted_key) throw new Error("Chave de IA não configurada.");
 const rawKey = Buffer.from(keyData.encrypted_key, "base64").toString("utf-8");

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

 const gRes = await fetch(
 `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${rawKey}`,
 {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 contents: [{ parts: [{ text: prompt }] }],
 generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
 }),
 signal: AbortSignal.timeout(20000),
 }
 );

 if (!gRes.ok) throw new Error(`Falha na IA ao estruturar receita: HTTP ${gRes.status}`);
 const gJson = await gRes.json();
 const txt = gJson?.candidates?.[0]?.content?.parts?.[0]?.text;
 if (!txt) throw new Error("IA retornou resposta vazia para a receita.");

 return JSON.parse(txt) as StructuredRecipeDTO;
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

 const { data: keyData } = await supabase
 .from("api_key_pools")
 .select("id, encrypted_key")
 .in("provider", ["gemini", "groq"])
 .eq("is_active", true)
 .limit(1)
 .maybeSingle();

 if (!keyData?.encrypted_key) throw new Error("Chave de IA não configurada.");
 const rawKey = Buffer.from(keyData.encrypted_key, "base64").toString("utf-8");

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

 const gRes = await fetch(
 `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${rawKey}`,
 {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 contents: [{ parts: [{ text: prompt }] }],
 generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
 }),
 signal: AbortSignal.timeout(20000),
 }
 );

 if (!gRes.ok) throw new Error(`Falha na IA ao estruturar ficha técnica: HTTP ${gRes.status}`);
 const gJson = await gRes.json();
 const txt = gJson?.candidates?.[0]?.content?.parts?.[0]?.text;
 if (!txt) throw new Error("IA retornou resposta vazia para ficha técnica.");

 return JSON.parse(txt) as ProductTechSpecDTO;
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



