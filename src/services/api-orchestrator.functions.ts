/**
 * api-orchestrator.functions.ts — BFF para Orquestração de Pools de APIs,
 * Failover Server-Side, Gestão de Prompts Master e Importador de Produtos via URL.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, requireAdmin } from "@/lib/server-access";
import { getActiveSecretForProvider, internalTestSecretKeyConnection } from "./secret-vault.functions";
import { enrichOrInsertMinedProduct } from "./mining.functions";

// ============================================================
// Schemas e Tipos
// ============================================================

export const apiProviderEnum = z.enum([
  "openrouter",
  "groq",
  "gemini",
  "openai",
  "anthropic",
  "firecrawl",
  "steel",
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

/**
 * 4.1 Testa a conexão real de uma chave cadastrada na pool global do Admin Master.
 */
export async function internalTestPoolKeyConnection(
  poolKeyId: string,
): Promise<{ success: boolean; latencyMs: number; error?: string }> {
  const supabase = getServerClient();
  const { data: keyRow, error } = await supabase
    .from("api_key_pools")
    .select("provider, encrypted_key")
    .eq("id", poolKeyId)
    .single();

  if (error || !keyRow || !keyRow.encrypted_key) {
    throw new Error("Chave não encontrada na pool.");
  }

  const rawKey = Buffer.from(keyRow.encrypted_key, "base64").toString("utf-8").trim();
  const start = Date.now();
  const res = await internalTestSecretKeyConnection(keyRow.provider, rawKey);
  const latencyMs = Date.now() - start;
  return {
    success: res.success,
    latencyMs,
    error: res.success ? undefined : res.message,
  };
}

export const testPoolKeyConnection = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data: { id } }) => {
    await requireAdmin();
    return internalTestPoolKeyConnection(id);
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
 targetModel: z.string().default("gemini-2.5-flash"),
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
export async function getNextActiveKey(provider: ApiProvider, ownerId?: string): Promise<{ id: string; rawKey: string } | null> {
  // 1. BYOK: Verifica se o usuário ou loja ativo tem uma chave no secret_vault
  try {
    const targetOwner = ownerId || (await getServerIdentity().then((id) => id?.id).catch(() => undefined));
    if (targetOwner) {
      const byokSecret = await getActiveSecretForProvider(provider, targetOwner).catch(() => null);
      if (byokSecret) {
        return { id: `byok-${provider}`, rawKey: byokSecret };
      }
    }
  } catch {
    // Prossegue para a pool da plataforma
  }

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
  } else if (provider === "openrouter") {
    const envKey = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;
    if (envKey && envKey.trim().length > 5) return { id: "env-openrouter", rawKey: envKey.trim() };
  } else if (provider === "anthropic") {
    const envKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
    if (envKey && envKey.trim().length > 5) return { id: "env-anthropic", rawKey: envKey.trim() };
  } else if (provider === "firecrawl") {
    const envKey = process.env.FIRECRAWL_API_KEY || process.env.VITE_FIRECRAWL_API_KEY;
    if (envKey && envKey.trim().length > 5) return { id: "env-firecrawl", rawKey: envKey.trim() };
  } else if (provider === "steel") {
    const envKey = process.env.STEEL_API_KEY || process.env.VITE_STEEL_API_KEY;
    if (envKey && envKey.trim().length > 5) return { id: "env-steel", rawKey: envKey.trim() };
  }

  return null;
}

/**
 * Registra falha de requisição ou rate limit (HTTP 429) em uma chave de API do pool.
 * Atualiza last_error_at, last_error_message e temporariamente rotaciona a chave.
 */
export async function markKeyError(
  keyId: string, 
  errorMessage: string = "Rate limit or network error",
  statusCode?: number
): Promise<void> {
  if (!keyId || keyId.startsWith("env-") || keyId.startsWith("byok-")) return;
  const supabase = getServerClient();
  try {
    const isRateLimit = statusCode === 429 || errorMessage.toLowerCase().includes("rate limit") || errorMessage.includes("429");
    await supabase
      .from("api_key_pools")
      .update({
        last_error_at: new Date().toISOString(),
        last_error_message: errorMessage.slice(0, 255),
        is_active: isRateLimit ? true : false,
      })
      .eq("id", keyId);
  } catch (err) {
    console.warn(`[api-orchestrator] Falha ao registrar erro da chave ${keyId}:`, err);
  }
}

/**
 * Cadastra ou atualiza uma chave de API para o SimLab e módulos de IA diretamente.
 */
export const saveSimLabApiKey = createServerFn({ method: "POST" })
  .validator(
    z.object({
      provider: z.enum(["openrouter", "groq", "gemini", "openai"]),
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
      label: data.label || `Chave ${data.provider.toUpperCase()} (SimLab / IA)`,
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
 * Consulta o status de chaves de IA ativas para o SimLab e orquestrador (banco de dados ou ambiente).
 */
export const getSimLabKeyStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ hasActiveKey: boolean; activeProvider: "openrouter" | "gemini" | "groq" | "openai" | null; poolCount: number }> => {
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

    // Verificar se há openrouter
    const openrouter = await getNextActiveKey("openrouter");
    if (openrouter) return { hasActiveKey: true, activeProvider: "openrouter", poolCount };

    // Verificar se há groq
    const groq = await getNextActiveKey("groq");
    if (groq) return { hasActiveKey: true, activeProvider: "groq", poolCount };

    // Verificar se há gemini
    const gemini = await getNextActiveKey("gemini");
    if (gemini) return { hasActiveKey: true, activeProvider: "gemini", poolCount };

    // Verificar se há openai
    const openai = await getNextActiveKey("openai");
    if (openai) return { hasActiveKey: true, activeProvider: "openai", poolCount };

    // Verificar se há anthropic
    const anthropic = await getNextActiveKey("anthropic");
    if (anthropic) return { hasActiveKey: true, activeProvider: "anthropic" as any, poolCount };

    return { hasActiveKey: false, activeProvider: null, poolCount };
  }
);


export interface UnifiedAiCallOptions {
  systemPrompt?: string;
  systemInstruction?: string;
  userPrompt?: string;
  prompt?: string;
  feature?: string;
  fileBase64?: string;
  fileMime?: string;
  responseFormat?: "json_object" | "text";
  expectJson?: boolean;
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
  preferredProvider?: ApiProvider;
  preferProvider?: ApiProvider;
  modelOverride?: string;
  images?: Array<{ mimeType: string; base64: string }>;
  overrideApiKey?: string;
  ownerId?: string;
  storeId?: string;
}

export interface UnifiedAiResult {
  content: string;
  text: string;
  provider: ApiProvider;
  model: string;
  parsedJson?: any;
}

/**
 * Motor Unificado de Execução de IA da Plataforma Waesy.
 * Orquestra chaves ativas do pool com failover transparente, suporte multimodal (visão/OCR) e registro de erros.
 * Provedores suportados: OpenRouter, Groq, Gemini, OpenAI.
 */
export async function executeUnifiedAiCall(options: UnifiedAiCallOptions): Promise<UnifiedAiResult> {
  const systemPrompt = options.systemPrompt || options.systemInstruction;
  const userPrompt = options.userPrompt || options.prompt || "";
  const isJson = options.responseFormat === "json_object" || options.expectJson === true || options.jsonMode === true;
  const preferred = options.preferredProvider || options.preferProvider;
  const images = [...(options.images || [])];
  if (options.fileBase64 && images.length === 0) {
    images.push({
      mimeType: options.fileMime || "image/jpeg",
      base64: options.fileBase64,
    });
  }

  const providersToTry: ApiProvider[] = [];
  if (preferred) {
    providersToTry.push(preferred);
  }

  // Prioriza provedores com chaves ativas no pool da plataforma (Groq responde em ~200ms com Qwen 3.8, Gemini como fallback robusto)
  const defaultCascade: ApiProvider[] = images.length > 0
    ? ["gemini", "openai", "openrouter", "anthropic"]
    : ["groq", "gemini", "openrouter", "openai", "anthropic"];

  for (const p of defaultCascade) {
    if (!providersToTry.includes(p)) {
      providersToTry.push(p);
    }
  }

  const errors: string[] = [];

  for (const provider of providersToTry) {
    const keysToTry: Array<{ id: string; rawKey: string }> = [];
    if (options.overrideApiKey && provider === preferred) {
      keysToTry.push({ id: "override-key", rawKey: options.overrideApiKey });
    }

    // 1. BYOK: Verifica se o lojista/usuário possui chave ativa configurada no secret_vault, tenant_ai_providers ou integration_credentials
    const targetOwner = options.ownerId || (await getServerIdentity().then((id) => id?.id || undefined).catch(() => undefined));
    const targetStore = options.storeId || (await getServerIdentity().then((id) => id?.store_id || undefined).catch(() => undefined));
    if (targetOwner || targetStore) {
      const byokSecret = await getActiveSecretForProvider(provider, targetOwner || undefined, targetStore || undefined).catch(() => null);
      if (byokSecret && !keysToTry.some((k) => k.rawKey === byokSecret)) {
        keysToTry.push({ id: `byok-${provider}`, rawKey: byokSecret });
      }
    }

    // 2. Pool de Chaves Gerenciadas da Plataforma (Admin Master)
    const poolKey = await getNextActiveKey(provider).catch(() => null);
    if (poolKey?.rawKey && !keysToTry.some((k) => k.rawKey === poolKey.rawKey)) {
      keysToTry.push(poolKey);
    }

    // 3. Fallback de Variáveis de Ambiente do Servidor
    const envKeyName = `${provider.toUpperCase()}_API_KEY`;
    const envFallback = (typeof process !== "undefined" && process.env ? process.env[envKeyName] : undefined)?.trim();
    if (envFallback && !keysToTry.some((k) => k.rawKey === envFallback)) {
      keysToTry.push({ id: `env-${provider}`, rawKey: envFallback });
    }

    if (keysToTry.length === 0) continue;


    for (const keyInfo of keysToTry) {
      try {
      if (provider === "openrouter") {
        const defaultModel = images.length > 0 ? "google/gemini-2.5-flash" : "meta-llama/llama-3.3-70b-instruct";
        const model = options.modelOverride || defaultModel;
        const messages: any[] = [];
        if (systemPrompt) {
          messages.push({ role: "system", content: systemPrompt });
        }

        if (images.length > 0) {
          const contentParts: any[] = [{ type: "text", text: userPrompt }];
          for (const img of images) {
            contentParts.push({
              type: "image_url",
              image_url: { url: `data:${img.mimeType || "image/jpeg"};base64,${img.base64}` },
            });
          }
          messages.push({ role: "user", content: contentParts });
        } else {
          messages.push({ role: "user", content: userPrompt });
        }

        const bodyPayload: any = {
          model,
          messages,
          temperature: options.temperature ?? 0.3,
          max_tokens: options.maxTokens ?? 2048,
        };
        if (isJson) {
          bodyPayload.response_format = { type: "json_object" };
        }

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${keyInfo.rawKey}`,
            "HTTP-Referer": "https://waesy.pages.dev",
            "X-Title": "Waesy Platform",
          },
          body: JSON.stringify(bodyPayload),
          signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          await markKeyError(keyInfo.id, `OpenRouter HTTP ${res.status}: ${errText.slice(0, 150)}`);
          errors.push(`OpenRouter (${res.status})`);
          continue;
        }

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content || "";
        if (!content) {
          errors.push("OpenRouter retornou resposta vazia");
          continue;
        }

        let parsedJson: any = undefined;
        if (isJson || content.trim().startsWith("{") || content.trim().startsWith("[")) {
          const clean = content.replace(/```json\s*|\s*```/gi, "").trim();
          try {
            parsedJson = JSON.parse(clean);
          } catch {
            const match = clean.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (match) {
              try { parsedJson = JSON.parse(match[0]); } catch {}
            }
          }
        }

        return { content, text: content, provider: "openrouter", model, parsedJson };
      }

      if (provider === "groq") {
        if (images.length > 0) {
          // Groq é text-only neste pool — segue para próximo provedor da cascata
          continue;
        }

        // Modelo validado e ativo no pool Groq em 2026 (substitui o descontinuado llama-3.3-70b-versatile)
        const model = options.modelOverride || "qwen/qwen3.8-27b";
        const messages: any[] = [];
        if (systemPrompt) {
          messages.push({ role: "system", content: systemPrompt });
        }
        messages.push({ role: "user", content: userPrompt });

        const bodyPayload: any = {
          model,
          messages,
          temperature: options.temperature ?? 0.3,
          max_tokens: options.maxTokens ?? 2048,
        };
        if (isJson) {
          bodyPayload.response_format = { type: "json_object" };
        }

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${keyInfo.rawKey}`,
          },
          body: JSON.stringify(bodyPayload),
          signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          await markKeyError(keyInfo.id, `Groq HTTP ${res.status}: ${errText.slice(0, 150)}`);
          errors.push(`Groq (${res.status})`);
          continue;
        }

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content || "";
        if (!content) {
          errors.push("Groq retornou resposta vazia");
          continue;
        }

        let parsedJson: any = undefined;
        if (isJson || content.trim().startsWith("{") || content.trim().startsWith("[")) {
          const clean = content.replace(/```json\s*|\s*```/gi, "").trim();
          try {
            parsedJson = JSON.parse(clean);
          } catch {
            const match = clean.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (match) {
              try { parsedJson = JSON.parse(match[0]); } catch {}
            }
          }
        }

        return { content, text: content, provider: "groq", model, parsedJson };
      }

      if (provider === "gemini") {
        // Modelo validado e ativo no pool Google em 2026 (substitui o descontinuado gemini-1.5-flash)
        const model = options.modelOverride || "gemini-2.5-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keyInfo.rawKey}`;

        const parts: any[] = [{ text: userPrompt }];
        for (const img of images) {
          parts.push({
            inlineData: {
              mimeType: img.mimeType || "image/jpeg",
              data: img.base64,
            },
          });
        }

        const payload: any = {
          contents: [{ parts }],
          generationConfig: {
            temperature: options.temperature ?? 0.3,
            maxOutputTokens: options.maxTokens ?? 2048,
          },
        };

        if (systemPrompt) {
          payload.systemInstruction = {
            parts: [{ text: systemPrompt }],
          };
        }

        if (isJson) {
          payload.generationConfig.responseMimeType = "application/json";
        }

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          await markKeyError(keyInfo.id, `Gemini HTTP ${res.status}: ${errText.slice(0, 150)}`);
          errors.push(`Gemini (${res.status})`);
          continue;
        }

        const data = await res.json();
        const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!content) {
          errors.push("Gemini retornou resposta vazia");
          continue;
        }

        let parsedJson: any = undefined;
        if (isJson || content.trim().startsWith("{") || content.trim().startsWith("[")) {
          const clean = content.replace(/```json\s*|\s*```/gi, "").trim();
          try {
            parsedJson = JSON.parse(clean);
          } catch {
            const match = clean.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (match) {
              try { parsedJson = JSON.parse(match[0]); } catch {}
            }
          }
        }

        return { content, text: content, provider: "gemini", model, parsedJson };
      }

      if (provider === "openai") {
        const model = options.modelOverride || "gpt-4o-mini";
        const messages: any[] = [];
        if (systemPrompt) {
          messages.push({ role: "system", content: systemPrompt });
        }

        if (images.length > 0) {
          const contentParts: any[] = [{ type: "text", text: userPrompt }];
          for (const img of images) {
            contentParts.push({
              type: "image_url",
              image_url: { url: `data:${img.mimeType || "image/jpeg"};base64,${img.base64}` },
            });
          }
          messages.push({ role: "user", content: contentParts });
        } else {
          messages.push({ role: "user", content: userPrompt });
        }

        const bodyPayload: any = {
          model,
          messages,
          temperature: options.temperature ?? 0.3,
          max_tokens: options.maxTokens ?? 2048,
        };
        if (isJson) {
          bodyPayload.response_format = { type: "json_object" };
        }

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${keyInfo.rawKey}`,
          },
          body: JSON.stringify(bodyPayload),
          signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          await markKeyError(keyInfo.id, `OpenAI HTTP ${res.status}: ${errText.slice(0, 150)}`);
          errors.push(`OpenAI (${res.status})`);
          continue;
        }

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content || "";
        if (!content) {
          errors.push("OpenAI retornou resposta vazia");
          continue;
        }

        let parsedJson: any = undefined;
        if (isJson || content.trim().startsWith("{") || content.trim().startsWith("[")) {
          const clean = content.replace(/```json\s*|\s*```/gi, "").trim();
          try {
            parsedJson = JSON.parse(clean);
          } catch {
            const match = clean.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (match) {
              try { parsedJson = JSON.parse(match[0]); } catch {}
            }
          }
        }

        return { content, text: content, provider: "openai", model, parsedJson };
      }

      if (provider === "anthropic") {
        const model = options.modelOverride || (images.length > 0 ? "claude-3-5-sonnet-20241022" : "claude-3-5-haiku-20241022");
        const messages: any[] = [];
        if (images.length > 0) {
          const contentParts: any[] = [];
          for (const img of images) {
            contentParts.push({
              type: "image",
              source: {
                type: "base64",
                media_type: img.mimeType || "image/jpeg",
                data: img.base64,
              },
            });
          }
          contentParts.push({ type: "text", text: userPrompt || "Analise a imagem enviada." });
          messages.push({ role: "user", content: contentParts });
        } else {
          messages.push({ role: "user", content: userPrompt });
        }

        const bodyPayload: any = {
          model,
          messages,
          max_tokens: options.maxTokens ?? 2048,
          temperature: options.temperature ?? 0.3,
        };
        if (systemPrompt) {
          bodyPayload.system = systemPrompt;
        }

        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": keyInfo.rawKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify(bodyPayload),
          signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          await markKeyError(keyInfo.id, `Anthropic HTTP ${res.status}: ${errText.slice(0, 150)}`);
          errors.push(`Anthropic (${res.status})`);
          continue;
        }

        const data = await res.json();
        const content = data?.content?.[0]?.text || "";
        if (!content) {
          errors.push("Anthropic retornou resposta vazia");
          continue;
        }

        let parsedJson: any = undefined;
        if (isJson || content.trim().startsWith("{") || content.trim().startsWith("[")) {
          const clean = content.replace(/```json\s*|\s*```/gi, "").trim();
          try {
            parsedJson = JSON.parse(clean);
          } catch {
            const match = clean.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (match) {
              try { parsedJson = JSON.parse(match[0]); } catch {}
            }
          }
        }

        return { content, text: content, provider: "anthropic", model, parsedJson };
      }
    } catch (err: any) {
      if (keyInfo?.id) {
        await markKeyError(keyInfo.id, `Erro de conexão: ${err.message || "Network Error"}`);
      }
      errors.push(`${provider}: ${err.message}`);
    }
  }
}

  throw new Error(
    `Nenhum provedor de IA ativo pôde processar a solicitação. Verifique suas chaves em Admin Master > Pools de APIs ou Workspace > Cofre de IA (OpenRouter, Groq, Gemini, OpenAI ou Anthropic). Detalhes: ${errors.join("; ") || "Sem chaves ativas configuradas"}`
  );
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

      // 3.1. Tentativa Mecânica Zero-Token (Schema.org JSON-LD Product)
      try {
        const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
        for (const match of jsonLdMatches) {
          try {
            const parsed = JSON.parse(match[1]);
            const items = Array.isArray(parsed) ? parsed : [parsed];
            for (const item of items) {
              const candidate = item["@graph"] ? item["@graph"] : [item];
              for (const node of candidate) {
                const type = node["@type"];
                const isProduct = type === "Product" || (Array.isArray(type) && type.includes("Product"));
                if (isProduct && (node.name || node.title)) {
                  const rawPrice = node.offers?.price || (Array.isArray(node.offers) ? node.offers[0]?.price : undefined);
                  let priceCents = 0;
                  if (rawPrice) {
                    const numeric = parseFloat(String(rawPrice).replace(/[^\d.,]/g, "").replace(",", "."));
                    if (!isNaN(numeric)) priceCents = Math.round(numeric * 100);
                  }
                  const images = [];
                  const rawImages = node.image ? (Array.isArray(node.image) ? node.image : [node.image]) : [];
                  for (const img of rawImages) {
                    const url = typeof img === "string" ? img : img?.url;
                    if (url && typeof url === "string" && url.startsWith("http")) images.push(url);
                  }
                  const brand = typeof node.brand === "string" ? node.brand : node.brand?.name;

                  const mechanicalProduct = {
                    title: String(node.name || node.title).trim(),
                    description: String(node.description || "").trim(),
                    price_cents: priceCents,
                    brand: brand ? String(brand).trim() : undefined,
                    images: images.slice(0, 8),
                  };

                  // Enriquecer e salvar atomicamente na base global mined_products
                  enrichOrInsertMinedProduct(supabase, {
                    source_url: input.url,
                    source_domain: new URL(input.url).hostname.replace("www.", ""),
                    title: mechanicalProduct.title,
                    description: mechanicalProduct.description,
                    price_cents: mechanicalProduct.price_cents,
                    brand: mechanicalProduct.brand,
                    images: mechanicalProduct.images,
                    category: "Produtos",
                  }).catch((err) => console.warn("[api-orchestrator] Falha não impeditiva ao enriquecer mined_product:", err));

                  return mechanicalProduct;
                }
              }
            }
          } catch {}
        }
      } catch (e) {
        console.warn("[api-orchestrator] Extração mecânica Schema.org ignorada, prosseguindo com fallback de IA:", e);
      }
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

 // 5. Processamento via Motor Unificado de IA (OpenRouter -> Groq -> Gemini -> OpenAI)
  let extractedProduct: ImportedProductData | null = null;

  const systemPrompt =
    masterPrompt?.system_instruction ||
    "Você é um assistente de e-commerce sênior. Extraia as informações do produto a partir do conteúdo bruto da página e retorne estritamente um JSON válido.";

  const userPrompt = `Analise o produto abaixo:\nURL: ${input.url}\nTom de escrita: ${input.tone}\n\nConteúdo da página:\n${sanitizedContent}\n\nRetorne o JSON estritamente no formato:\n{\n "title": "Nome do Produto",\n "subtitle": "Subtítulo atraente curto",\n "description": "Descrição estruturada e completa",\n "price_cents": 0,\n "compare_at_cents": 0,\n "brand": "Marca",\n "category_suggestion": "Categoria",\n "images": ["url1"],\n "attributes": {},\n "variants": []\n}`;

  try {
    const aiResult = await executeUnifiedAiCall({
      systemPrompt,
      userPrompt,
      responseFormat: "json_object",
      temperature: Number(masterPrompt?.temperature || 0.2),
      modelOverride: masterPrompt?.target_model,
    });

    if (aiResult.parsedJson && aiResult.parsedJson.title) {
      extractedProduct = aiResult.parsedJson as ImportedProductData;
    }
  } catch (aiErr: any) {
    console.warn("[importProductFromUrl] Falha no pool de IA, tentando extração heurística:", aiErr.message);
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

    // Enriquecimento na base global mined_products
    if (extractedProduct) {
      enrichOrInsertMinedProduct(supabase, {
        source_url: input.url,
        source_domain: new URL(input.url).hostname.replace("www.", ""),
        title: (extractedProduct as any).title,
        description: (extractedProduct as any).description || "",
        price_cents: (extractedProduct as any).price_cents || 0,
        brand: (extractedProduct as any).brand,
        images: (extractedProduct as any).images || [],
        category: (extractedProduct as any).category_suggestion || "Produtos",
      }).catch((err) => console.warn("[api-orchestrator] Falha não impeditiva ao enriquecer mined_product:", err));
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

 const aiRes = await executeUnifiedAiCall({
 systemPrompt,
 userPrompt: `Conteúdo a ser processado:\n${sanitizedContent}`,
 responseFormat: "json_object",
 temperature: 0.2,
 });

 const extracted = aiRes.parsedJson;
 if (!extracted || !Array.isArray(extracted.categories) || extracted.categories.length === 0) {
 throw new Error("A IA não conseguiu identificar itens e categorias de cardápio no conteúdo informado.");
 }

 return extracted as ImportedCatalogDTO;
 });
