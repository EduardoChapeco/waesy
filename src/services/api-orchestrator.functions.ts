/**
 * api-orchestrator.functions.ts — BFF para Orquestração de Pools de APIs,
 * Failover Server-Side, Gestão de Prompts Master e Importador de Produtos via URL.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, requireAdmin } from "@/lib/server-access";

// ============================================================
// Schemas e Tipos
// ============================================================

export const apiProviderEnum = z.enum([
 "firecrawl",
 "steel",
 "gemini",
 "groq",
 "openai",
 "google_maps",
 "resend",
 "asaas",
]);

export type ApiProvider = z.infer<typeof apiProviderEnum>;

export interface ApiKeyPoolDTO {
 id: string;
 provider: ApiProvider;
 label: string;
 masked_key: string;
 priority: number;
 is_active: boolean;
 rate_limit_per_minute: number;
 daily_request_count: number;
 last_used_at: string | null;
 last_error_at: string | null;
 last_error_message: string | null;
 created_at: string;
}

export interface MasterPromptDTO {
 id: string;
 slug: string;
 title: string;
 description: string | null;
 system_instruction: string;
 prompt_template: string;
 target_provider: string;
 target_model: string;
 temperature: number;
 is_default: boolean;
 created_at: string;
}

export interface ImportedProductData {
 title: string;
 subtitle?: string;
 description: string;
 price_cents: number;
 compare_at_cents?: number;
 brand?: string;
 category_suggestion?: string;
 images: string[];
 attributes?: Record<string, string>;
 variants?: Array<{
 name: string;
 price_cents: number;
 sku?: string;
 }>;
}

// ============================================================
// Funções de Gestão de Pools de Chaves (Platform Admin)
// ============================================================

/**
 * 1. Lista chaves cadastradas na pool com chaves mascaradas (Apenas Admin Master).
 */
export const listApiKeyPools = createServerFn({ method: "GET" }).handler(
 async (): Promise<ApiKeyPoolDTO[]> => {
 await requireAdmin();
 const supabase = getServerClient();

 const { data, error } = await supabase
 .from("api_key_pools")
 .select("id, provider, label, masked_key, priority, is_active, rate_limit_per_minute, daily_request_count, last_used_at, last_error_at, last_error_message, created_at")
 .order("provider", { ascending: true })
 .order("priority", { ascending: true });

 if (error) {
 console.error("[api-orchestrator] Erro ao listar chaves da pool:", error);
 return [];
 }

 return (data || []) as ApiKeyPoolDTO[];
 },
);

/**
 * 2. Cadastra ou edita uma chave de API na pool com criptografia server-side.
 */
export const saveApiKeyToPool = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid().optional(),
 provider: apiProviderEnum,
 label: z.string().min(2, "O rótulo deve ter pelo menos 2 caracteres"),
 apiKey: z.string().min(4, "Chave de API inválida"),
 priority: z.number().int().min(1).default(1),
 rateLimitPerMinute: z.number().int().min(1).default(60),
 }),
 )
 .handler(async ({ data }) => {
 await requireAdmin();
 const supabase = getServerClient();

 const rawKey = data.apiKey.trim();
 const masked =
 rawKey.length > 8
 ? `${rawKey.slice(0, 3)}...${rawKey.slice(-4)}`
 : `***${rawKey.slice(-2)}`;

 const encrypted = Buffer.from(rawKey).toString("base64");

 const payload = {
 provider: data.provider,
 label: data.label,
 encrypted_key: encrypted,
 masked_key: masked,
 priority: data.priority,
 rate_limit_per_minute: data.rateLimitPerMinute,
 is_active: true,
 updated_at: new Date().toISOString(),
 };

 if (data.id) {
 const { data: updated, error } = await supabase
 .from("api_key_pools")
 .update(payload)
 .eq("id", data.id)
 .select()
 .single();

 if (error) throw new Error(`Erro ao atualizar chave: ${error.message}`);
 return updated;
 }

 const { data: created, error } = await supabase
 .from("api_key_pools")
 .insert({
 ...payload,
 created_at: new Date().toISOString(),
 })
 .select()
 .single();

 if (error) throw new Error(`Erro ao cadastrar chave: ${error.message}`);
 return created;
 });

/**
 * 3. Ativa ou desativa uma chave da rotação.
 */
export const toggleApiKeyStatus = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid(), isActive: z.boolean() }))
 .handler(async ({ data }) => {
 await requireAdmin();
 const supabase = getServerClient();

 const { error } = await supabase
 .from("api_key_pools")
 .update({ is_active: data.isActive, updated_at: new Date().toISOString() })
 .eq("id", data.id);

 if (error) throw new Error(`Erro ao alternar status da chave: ${error.message}`);
 return { success: true };
 });

/**
 * 4. Remove uma chave da pool.
 */
export const deleteApiKeyFromPool = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 await requireAdmin();
 const supabase = getServerClient();

 const { error } = await supabase.from("api_key_pools").delete().eq("id", id);
 if (error) throw new Error(`Erro ao remover chave: ${error.message}`);
 return { success: true };
 });

// ============================================================
// Funções de Gestão de Prompts Master (Platform Admin)
// ============================================================

/**
 * 5. Lista os Prompts Master da plataforma.
 */
export const listMasterPrompts = createServerFn({ method: "GET" }).handler(
 async (): Promise<MasterPromptDTO[]> => {
 const supabase = getServerClient();
 const { data, error } = await supabase
 .from("ai_master_prompts")
 .select("*")
 .order("is_default", { ascending: false })
 .order("title", { ascending: true });

 if (error) {
 console.error("[api-orchestrator] Erro ao listar Prompts Master:", error);
 return [];
 }

 return (data || []) as MasterPromptDTO[];
 },
);

/**
 * 6. Salva ou atualiza um Prompt Master de IA.
 */
export const saveMasterPrompt = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid().optional(),
 slug: z.string().min(2),
 title: z.string().min(2),
 description: z.string().optional(),
 systemInstruction: z.string().min(10),
 promptTemplate: z.string().min(10),
 targetProvider: z.string().default("gemini"),
 targetModel: z.string().default("gemini-1.5-flash"),
 temperature: z.number().min(0).max(1).default(0.2),
 isDefault: z.boolean().default(false),
 }),
 )
 .handler(async ({ data }) => {
 await requireAdmin();
 const supabase = getServerClient();

 const payload = {
 slug: data.slug,
 title: data.title,
 description: data.description || null,
 system_instruction: data.systemInstruction,
 prompt_template: data.promptTemplate,
 target_provider: data.targetProvider,
 target_model: data.targetModel,
 temperature: data.temperature,
 is_default: data.isDefault,
 updated_at: new Date().toISOString(),
 };

 if (data.id) {
 const { data: updated, error } = await supabase
 .from("ai_master_prompts")
 .update(payload)
 .eq("id", data.id)
 .select()
 .single();

 if (error) throw new Error(`Erro ao atualizar Prompt Master: ${error.message}`);
 return updated;
 }

 const { data: created, error } = await supabase
 .from("ai_master_prompts")
 .insert({ ...payload, created_at: new Date().toISOString() })
 .select()
 .single();

 if (error) throw new Error(`Erro ao criar Prompt Master: ${error.message}`);
 return created;
 });

// ============================================================
// Motor de Importação Inteligente de Produtos via URL
// ============================================================

/**
 * Helper interno: Obtém a chave ativa prioritária do pool com rotação e fallback para ambiente local.
 */
export async function getNextActiveKey(provider: ApiProvider): Promise<{ id: string; rawKey: string } | null> {
  const supabase = getServerClient();
  try {
    let query: any = supabase
      .from("api_key_pools")
      .select("id, encrypted_key, daily_request_count");

    if (typeof query?.eq === "function") {
      query = query.eq("provider", provider);
      if (typeof query?.eq === "function") {
        query = query.eq("is_active", true);
      }
    } else if (typeof query?.match === "function") {
      query = query.match({ provider, is_active: true });
    }

    if (typeof query?.order === "function") {
      query = query.order("last_used_at", { ascending: true, nullsFirst: true });
    }
    if (typeof query?.limit === "function") {
      query = query.limit(1);
    }

    const { data } = typeof query?.maybeSingle === "function" 
      ? await query.maybeSingle() 
      : (typeof query?.single === "function" ? await query.single() : { data: null });

    if (data?.encrypted_key) {
      const rawKey = Buffer.from(data.encrypted_key, "base64").toString("utf-8");
      // Atualiza timestamp de uso
      await supabase
        .from("api_key_pools")
        .update({
          last_used_at: new Date().toISOString(),
          daily_request_count: ((data as any).daily_request_count || 0) + 1,
        })
        .eq("id", data.id);

      return { id: data.id, rawKey };
    }
  } catch (err) {
    console.warn(`[api-orchestrator] Falha ao ler chave do pool para ${provider}:`, err);
  }

  // Fallback para variáveis de ambiente locais
  if (provider === "gemini") {
    const envKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (envKey && envKey.trim().length > 5) return { id: "env-gemini", rawKey: envKey.trim() };
  } else if (provider === "groq") {
    const envKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
    if (envKey && envKey.trim().length > 5) return { id: "env-groq", rawKey: envKey.trim() };
  } else if (provider === "openai") {
    const envKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    if (envKey && envKey.trim().length > 5) return { id: "env-openai", rawKey: envKey.trim() };
  }

  return null;
}

/**
 * Cadastra ou atualiza uma chave de API para o SimLab e módulos de IA diretamente.
 */
export const saveSimLabApiKey = createServerFn({ method: "POST" })
  .validator(
    z.object({
      provider: z.enum(["gemini", "groq", "openai"]),
      apiKey: z.string().min(5, "Chave de API inválida"),
      label: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const rawKey = data.apiKey.trim();
    const masked = rawKey.length > 8 ? `${rawKey.slice(0, 3)}...${rawKey.slice(-4)}` : `***${rawKey.slice(-2)}`;
    const encrypted = Buffer.from(rawKey).toString("base64");

    const payload = {
      provider: data.provider,
      label: data.label || `Chave ${data.provider.toUpperCase()} (SimLab)`,
      encrypted_key: encrypted,
      masked_key: masked,
      priority: 1,
      rate_limit_per_minute: 60,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    // Upsert pelo provedor
    const { data: existing } = await supabase
      .from("api_key_pools")
      .select("id")
      .eq("provider", data.provider)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      await supabase.from("api_key_pools").update(payload).eq("id", existing.id);
      return { success: true, id: existing.id, provider: data.provider, masked };
    }

    const { data: created, error } = await supabase
      .from("api_key_pools")
      .insert({ ...payload, created_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw new Error(`Falha ao salvar chave: ${error.message}`);
    return { success: true, id: created.id, provider: data.provider, masked };
  });

/**
 * Consulta o status de chaves de IA ativas para o SimLab (banco de dados ou ambiente).
 */
export const getSimLabKeyStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ hasActiveKey: boolean; activeProvider: "gemini" | "groq" | "openai" | null; poolCount: number }> => {
    const supabase = getServerClient();
    let poolCount = 0;
    try {
      const { count } = await supabase
        .from("api_key_pools")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      poolCount = count || 0;
    } catch {
      // ignore
    }

    // Verificar se há gemini
    const gemini = await getNextActiveKey("gemini");
    if (gemini) return { hasActiveKey: true, activeProvider: "gemini", poolCount };

    // Verificar se há groq
    const groq = await getNextActiveKey("groq");
    if (groq) return { hasActiveKey: true, activeProvider: "groq", poolCount };

    // Verificar se há openai
    const openai = await getNextActiveKey("openai");
    if (openai) return { hasActiveKey: true, activeProvider: "openai", poolCount };

    return { hasActiveKey: false, activeProvider: null, poolCount };
  }
);

/**
 * Helper interno: Registra erro em uma chave da pool para auditoria.
 */
export async function markKeyError(keyId: string, errorMessage: string) {
  if (keyId.startsWith("env-")) return;
  const supabase = getServerClient();
  await supabase
    .from("api_key_pools")
    .update({
      last_error_at: new Date().toISOString(),
      last_error_message: errorMessage.slice(0, 200),
    })
    .eq("id", keyId);
}

/**
 * 7. Importa e extrai dados de um produto a partir de qualquer link/URL.
 */
export const importProductFromUrl = createServerFn({ method: "POST" })
 .validator(
 z.object({
 url: z.string().url("URL inválida"),
 tone: z.enum(["profissional", "persuasivo", "tecnico", "minimalista"]).default("profissional"),
 customPromptId: z.string().uuid().optional(),
 }),
 )
 .handler(async ({ data: input }): Promise<ImportedProductData> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

 // 1. Verificação de Cota Anti-Abuso
 const { data: usage } = await supabase
 .from("user_ai_usage_limits")
 .select("*")
 .eq("profile_id", identity.id)
 .eq("feature", "product_importer")
 .maybeSingle();

 if (usage?.is_blocked) {
 throw new Error(`Acesso temporariamente bloqueado: ${usage.blocked_reason || "Cota excedida"}`);
 }

 if (usage && usage.daily_requests_used >= usage.daily_requests_limit) {
 throw new Error(`Você atingiu o limite diário de ${usage.daily_requests_limit} importações de produtos. O limite renova amanhã.`);
 }

 // 2. Busca o Prompt Master ativo
 let masterPrompt: any = null;
 if (input.customPromptId) {
 const { data: p } = await supabase
 .from("ai_master_prompts")
 .select("*")
 .eq("id", input.customPromptId)
 .maybeSingle();
 masterPrompt = p;
 }

 if (!masterPrompt) {
 const { data: p } = await supabase
 .from("ai_master_prompts")
 .select("*")
 .eq("is_default", true)
 .maybeSingle();
 masterPrompt = p;
 }

 // 3. Obtenção de conteúdo bruto da página via scraping/fetch com timeout seguro
 let rawContent = "";
 try {
 // Tenta via Firecrawl se houver chave ativa no pool
 const firecrawlKey = await getNextActiveKey("firecrawl");
 if (firecrawlKey) {
 try {
 const fcRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 Authorization: `Bearer ${firecrawlKey.rawKey}`,
 },
 body: JSON.stringify({
 url: input.url,
 formats: ["markdown"],
 onlyMainContent: true,
 }),
 signal: AbortSignal.timeout(12000),
 });

 if (fcRes.ok) {
 const fcJson = await fcRes.json();
 rawContent = fcJson?.data?.markdown || "";
 } else if (fcRes.status === 429) {
 await markKeyError(firecrawlKey.id, "Rate limit 429 excedido no Firecrawl");
 }
 } catch (e: any) {
 await markKeyError(firecrawlKey.id, `Falha de rede: ${e.message}`);
 }
 }

 // Fallback: Fetch direto server-side com User-Agent neutro
 if (!rawContent) {
 const fetchRes = await fetch(input.url, {
 headers: {
 "User-Agent":
 "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
 },
 signal: AbortSignal.timeout(8000),
 });

 if (!fetchRes.ok) {
 throw new Error(`Não foi possível acessar o site de origem (Status ${fetchRes.status})`);
 }

 const html = await fetchRes.text();
 // Remove scripts, styles e tags desnecessárias para economizar tokens
 rawContent = html
 .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
 .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
 .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")
 .replace(/<[^>]+>/g, " ")
 .replace(/\s+/g, " ")
 .slice(0, 12000); // 12k chars de contexto
 }
 } catch (e: any) {
 throw new Error(`Erro ao ler página de produto: ${e.message}`);
 }

 if (!rawContent || rawContent.length < 50) {
 throw new Error("O site de origem não retornou conteúdo legível para importação.");
 }

 // 4. Barreira Anti-Prompt Injection
 const sanitizedContent = rawContent.replace(/\{\{|\}\}/g, "").slice(0, 10000);

 // 5. Processamento via LLM (Gemini Flash ou Groq)
 let extractedProduct: ImportedProductData | null = null;

 // Tenta Gemini Pool
 const geminiKey = await getNextActiveKey("gemini");
 const groqKey = await getNextActiveKey("groq");

 const systemPrompt =
 masterPrompt?.system_instruction ||
 "Você é um assistente de e-commerce. Extraia as informações do produto e retorne estritamente um JSON válido.";

 const userPrompt = `Analise o produto abaixo:\nURL: ${input.url}\nTom de escrita: ${input.tone}\n\nConteúdo:\n${sanitizedContent}\n\nRetorne o JSON no formato:\n{\n "title": "Nome do Produto",\n "subtitle": "Subtítulo atraente curto",\n "description": "Descrição estruturada e completa",\n "price_cents": 0,\n "compare_at_cents": 0,\n "brand": "Marca",\n "category_suggestion": "Categoria",\n "images": ["url1"],\n "attributes": {},\n "variants": []\n}`;

 // Executa chamada à API
 if (geminiKey) {
 try {
 const geminiRes = await fetch(
 `https://generativelanguage.googleapis.com/v1beta/models/${masterPrompt?.target_model || "gemini-1.5-flash"}:generateContent?key=${geminiKey.rawKey}`,
 {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 systemInstruction: { parts: [{ text: systemPrompt }] },
 contents: [{ parts: [{ text: userPrompt }] }],
 generationConfig: {
 temperature: Number(masterPrompt?.temperature || 0.2),
 responseMimeType: "application/json",
 },
 }),
 signal: AbortSignal.timeout(15000),
 },
 );

 if (geminiRes.ok) {
 const gJson = await geminiRes.json();
 const responseText = gJson?.candidates?.[0]?.content?.parts?.[0]?.text;
 if (responseText) {
 extractedProduct = JSON.parse(responseText);
 }
 } else {
 const errText = await geminiRes.text();
 await markKeyError(geminiKey.id, `Gemini API Error: ${errText.slice(0, 100)}`);
 }
 } catch (e: any) {
 await markKeyError(geminiKey.id, `Gemini catch: ${e.message}`);
 }
 }

 // Fallback para Groq se Gemini não estiver disponível ou falhar
 if (!extractedProduct && groqKey) {
 try {
 const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 Authorization: `Bearer ${groqKey.rawKey}`,
 },
 body: JSON.stringify({
 model: "llama-3.1-70b-versatile",
 messages: [
 { role: "system", content: `${systemPrompt}\nResponda APENAS com JSON válido.` },
 { role: "user", content: userPrompt },
 ],
 temperature: 0.2,
 response_format: { type: "json_object" },
 }),
 signal: AbortSignal.timeout(15000),
 });

 if (groqRes.ok) {
 const grJson = await groqRes.json();
 const content = grJson?.choices?.[0]?.message?.content;
 if (content) {
 extractedProduct = JSON.parse(content);
 }
 }
 } catch (e: any) {
 await markKeyError(groqKey.id, `Groq catch: ${e.message}`);
 }
 }

 // Fallback inteligente caso nenhuma IA responda: Extrai dados estruturados básicos via regex
 if (!extractedProduct) {
 // Extração determinística de título
 const titleMatch = rawContent.match(/<h1[^>]*>([^<]+)<\/h1>/i) || rawContent.match(/title:\s*([^\n]+)/i);
 const title = titleMatch ? titleMatch[1].trim() : "Produto Importado via Link";

 extractedProduct = {
 title: title.slice(0, 100),
 subtitle: `Importado de ${new URL(input.url).hostname}`,
 description: `Produto importado automaticamente a partir do link de origem:\n${input.url}\n\nRevise as informações, adicione fotos e personalize o preço antes de salvar.`,
 price_cents: 0,
 images: [],
 attributes: { origem: new URL(input.url).hostname },
 variants: [{ name: "Padrão", price_cents: 0 }],
 };
 }

 // 6. Atualiza contador de cota do usuário
 if (usage) {
 await supabase
 .from("user_ai_usage_limits")
 .update({
 daily_requests_used: usage.daily_requests_used + 1,
 last_request_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 })
 .eq("id", usage.id);
 } else {
 await supabase.from("user_ai_usage_limits").insert({
 profile_id: identity.id,
 store_id: identity.store_id,
 feature: "product_importer",
 daily_requests_used: 1,
 last_request_at: new Date().toISOString(),
 });
 }

 return extractedProduct;
 });

export interface ImportedMenuCategory {
 name: string;
 description?: string | null;
 products: {
 title: string;
 description?: string | null;
 price_cents: number;
 image_url?: string | null;
 selling_unit: string;
 }[];
}

export interface ImportedCatalogDTO {
 store_name?: string;
 categories: ImportedMenuCategory[];
}

export const importFullCatalogMenu = createServerFn({ method: "POST" })
 .validator(
 z.object({
 url: z.string().url().optional(),
 rawText: z.string().optional(),
 tone: z.string().default("gastronomia"),
 }),
 )
 .handler(async ({ data: input }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);

 let rawContent = "";
 if (input.url) {
 try {
 const fetchRes = await fetch(input.url, {
 headers: {
 "User-Agent":
 "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
 Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
 },
 signal: AbortSignal.timeout(12000),
 });

 if (!fetchRes.ok) {
 throw new Error(`Não foi possível acessar a página de origem (Status ${fetchRes.status})`);
 }

 const html = await fetchRes.text();
 rawContent = html
 .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
 .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
 .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")
 .replace(/<[^>]+>/g, " ")
 .replace(/\s+/g, " ")
 .slice(0, 16000);
 } catch (e: any) {
 throw new Error(`Erro ao acessar URL do cardápio: ${e.message}`);
 }
 } else if (input.rawText) {
 rawContent = input.rawText.slice(0, 16000);
 } else {
 throw new Error("Informe uma URL ou cole o texto do cardápio.");
 }

 if (!rawContent || rawContent.length < 20) {
 throw new Error("Conteúdo insuficiente para extração de cardápio.");
 }

 const sanitizedContent = rawContent.replace(/\{\{|\}\}/g, "").slice(0, 14000);

 const geminiKey = await getNextActiveKey("gemini");
 const groqKey = await getNextActiveKey("groq");

 const systemPrompt = `Você é um especialista em estruturação de cardápios e catálogos omnichannel para restaurantes, mercados e comércios (iFood, Rappi, Delivery).
Extraia as categorias e itens do conteúdo fornecido e retorne estritamente um JSON no seguinte formato:
{
 "store_name": "Nome do Estabelecimento",
 "categories": [
 {
 "name": "Nome da Categoria (ex: Hambúrgueres Artesanais)",
 "description": "Descrição curta da categoria",
 "products": [
 {
 "title": "Nome do Prato / Item",
 "description": "Ingredientes ou descrição",
 "price_cents": 3490,
 "image_url": null,
 "selling_unit": "un"
 }
 ]
 }
 ]
}
Observação: O campo price_cents deve ser um número inteiro representando centavos em BRL (ex: R$ 34,90 = 3490). Se não encontrar o preço exato, use 0. Extraia o máximo de categorias e produtos válidos que encontrar.`;

 let extracted: ImportedCatalogDTO | null = null;

 if (geminiKey) {
 try {
 const geminiRes = await fetch(
 `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey.rawKey}`,
 {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 systemInstruction: { parts: [{ text: systemPrompt }] },
 contents: [{ parts: [{ text: `Analise o cardápio a seguir e extraia todas as categorias e itens:\n\n${sanitizedContent}` }] }],
 generationConfig: {
 temperature: 0.2,
 responseMimeType: "application/json",
 },
 }),
 signal: AbortSignal.timeout(20000),
 },
 );

 if (geminiRes.ok) {
 const gJson = await geminiRes.json();
 const text = gJson?.candidates?.[0]?.content?.parts?.[0]?.text;
 if (text) {
 extracted = JSON.parse(text);
 }
 }
 } catch {
 // groq fallback
 }
 }

 if (!extracted && groqKey) {
 try {
 const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 Authorization: `Bearer ${groqKey.rawKey}`,
 },
 body: JSON.stringify({
 model: "llama-3.1-70b-versatile",
 messages: [
 { role: "system", content: `${systemPrompt}\nResponda APENAS com JSON válido.` },
 { role: "user", content: `Analise o cardápio e extraia categorias e itens:\n\n${sanitizedContent}` },
 ],
 temperature: 0.2,
 response_format: { type: "json_object" },
 }),
 signal: AbortSignal.timeout(20000),
 });

 if (groqRes.ok) {
 const grJson = await groqRes.json();
 const content = grJson?.choices?.[0]?.message?.content;
 if (content) {
 extracted = JSON.parse(content);
 }
 }
 } catch {
 // fallback
 }
 }

 if (!extracted || !extracted.categories || extracted.categories.length === 0) {
 extracted = {
 store_name: input.url ? new URL(input.url).hostname : "Cardápio Importado",
 categories: [
 {
 name: "Geral",
 description: "Itens importados",
 products: [
 {
 title: "Item de Exemplo Importado",
 description: "Edite o título, fotos e preço conforme necessário",
 price_cents: 0,
 image_url: null,
 selling_unit: "un",
 },
 ],
 },
 ],
 };
 }

 return extracted;
 });
