/**
 * api-orchestrator.functions.ts — BFF para Orquestração de Pools de APIs,
 * Failover Server-Side, Gestão de Prompts Master e Importador de Produtos via URL.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, requireAdmin } from "@/lib/server-access";
import { encryptSecret, decryptSecret, maskSecret } from "@/lib/crypto-vault.server";
import {
  getActiveSecretForProvider,
  internalTestSecretKeyConnection,
} from "./secret-vault.functions";
import { enrichOrInsertMinedProduct } from "./mining/mined-product-enricher";

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
      .select(
        "id, provider, label, masked_key, priority, is_active, rate_limit_per_minute, daily_request_count, last_used_at, last_error_at, last_error_message, created_at",
      )
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
    const masked = maskSecret(rawKey);
    const encrypted = encryptSecret(rawKey);

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

  const rawKey = decryptSecret(keyRow.encrypted_key).trim();
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

/**
 * 4.2 Cadastra múltiplas chaves em lote para um provedor (ex.: várias chaves Groq / OpenRouter) sem sobrescrever as existentes.
 */
export const batchSaveApiKeysToPool = createServerFn({ method: "POST" })
  .validator(
    z.object({
      provider: apiProviderEnum,
      labelPrefix: z.string().min(2, "Informe o prefixo de identificação"),
      rawKeysText: z.string().min(4, "Informe ao menos uma chave"),
      priority: z.number().int().min(1).default(1),
      rateLimitPerMinute: z.number().int().min(1).default(60),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getServerClient();

    const rawList = data.rawKeysText
      .split(/[\r\n,;]+/)
      .map((k) => k.trim())
      .filter((k) => k.length >= 6);

    const uniqueRawKeys = [...new Set(rawList)];
    if (uniqueRawKeys.length === 0) {
      throw new Error("Nenhuma chave válida identificada no lote.");
    }

    const createdOrUpdated: ApiKeyPoolDTO[] = [];

    const { data: existingKeys } = await supabase
      .from("api_key_pools")
      .select("id, encrypted_key, masked_key")
      .eq("provider", data.provider);

    for (let idx = 0; idx < uniqueRawKeys.length; idx++) {
      const rawKey = uniqueRawKeys[idx];
      const masked = maskSecret(rawKey);
      const encrypted = encryptSecret(rawKey);
      const keyLabel =
        uniqueRawKeys.length === 1
          ? data.labelPrefix.trim()
          : `${data.labelPrefix.trim()} #${idx + 1}`;

      const existingMatch = (existingKeys || []).find((k) => {
        if (k.masked_key !== masked) return false;
        try {
          return decryptSecret(k.encrypted_key) === rawKey;
        } catch {
          return false;
        }
      });

      if (existingMatch?.id) {
        const { data: updated } = await supabase
          .from("api_key_pools")
          .update({
            label: keyLabel,
            encrypted_key: encrypted,
            masked_key: masked,
            priority: data.priority,
            rate_limit_per_minute: data.rateLimitPerMinute,
            is_active: true,
            last_error_at: null,
            last_error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingMatch.id)
          .select()
          .single();
        if (updated) createdOrUpdated.push(updated as ApiKeyPoolDTO);
      } else {
        const { data: inserted } = await supabase
          .from("api_key_pools")
          .insert({
            provider: data.provider,
            label: keyLabel,
            encrypted_key: encrypted,
            masked_key: masked,
            priority: data.priority,
            rate_limit_per_minute: data.rateLimitPerMinute,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (inserted) createdOrUpdated.push(inserted as ApiKeyPoolDTO);
      }
    }

    return {
      success: true,
      count: createdOrUpdated.length,
      keys: createdOrUpdated,
    };
  });

/**
 * 4.3 Limpa erros e cooldowns (HTTP 429) de todas as chaves de um provedor ou de toda a pool.
 */
export const resetProviderPoolCooldowns = createServerFn({ method: "POST" })
  .validator(
    z.object({
      provider: apiProviderEnum.optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getServerClient();
    clearInMemoryKeyCooldowns(data.provider);

    let query = supabase.from("api_key_pools").update({
      last_error_at: null,
      last_error_message: null,
      is_active: true,
      updated_at: new Date().toISOString(),
    });

    if (data.provider) {
      query = query.eq("provider", data.provider);
    } else {
      query = query.not("id", "is", null);
    }

    await query;
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

const keyCooldownUntilMap = new Map<string, number>();
const providerRoundRobinCursor = new Map<string, number>();

export function clearInMemoryKeyCooldowns(provider?: string): void {
  if (!provider) {
    keyCooldownUntilMap.clear();
    return;
  }
  for (const [key] of keyCooldownUntilMap.entries()) {
    if (key.includes(provider)) {
      keyCooldownUntilMap.delete(key);
    }
  }
}

function isKeyInMemoryCooldown(keyId: string): boolean {
  const until = keyCooldownUntilMap.get(keyId);
  if (!until) return false;
  if (Date.now() > until) {
    keyCooldownUntilMap.delete(keyId);
    return false;
  }
  return true;
}

/**
 * Obtém todas as chaves ativas do pool para um provedor, ordenadas para equilibrar o consumo
 * entre múltiplas chaves (Round-Robin em memória + menor daily_request_count + mais antiga last_used_at),
 * respeitando a quarentena individual por chave caso tenha sofrido HTTP 429.
 */
export async function getAllActiveKeysForProvider(
  provider: ApiProvider,
  ownerId?: string,
  storeId?: string,
): Promise<Array<{ id: string; rawKey: string }>> {
  const keys: Array<{ id: string; rawKey: string }> = [];

  // 1. BYOK do usuário ou loja (se houver no cofre)
  if (ownerId || storeId) {
    try {
      const byokSecret = await getActiveSecretForProvider(provider, ownerId, storeId).catch(
        () => null,
      );
      if (byokSecret) {
        const byokKeyId = `byok-${provider}-${storeId || ownerId || "user"}`;
        if (!isKeyInMemoryCooldown(byokKeyId)) {
          keys.push({ id: byokKeyId, rawKey: byokSecret });
        }
      }
    } catch (err) {
      console.warn("[api-orchestrator] byokSecret lookup error:", err);
    }
  }

  // 2. Chaves cadastradas na api_key_pools do Admin Master (suporta N chaves simultâneas por provedor)
  try {
    const supabase = getServerClient();
    const nowIso = new Date().toISOString();

    // Libera quarentenas vencidas e zera contadores diários/mensais via RPC atômica;
    // falha da RPC (ex.: migration ainda não aplicada) cai no SELECT filtrado abaixo.
    await supabase
      .rpc("claim_healthy_api_keys_for_provider", { p_provider: provider, p_limit: 1 })
      .then(
        () => null,
        () => null,
      );

    const { data: poolRows } = await supabase
      .from("api_key_pools")
      .select("id, encrypted_key, priority, daily_request_count, last_used_at, quarantine_until")
      .eq("provider", provider)
      .eq("is_active", true)
      .or(`quarantine_until.is.null,quarantine_until.lte.${nowIso}`)
      .order("priority", { ascending: true })
      .order("daily_request_count", { ascending: true })
      .order("last_used_at", { ascending: true, nullsFirst: true })
      .limit(50);

    if (poolRows && poolRows.length > 0) {
      // Quarentena é estrita: chaves bloqueadas NUNCA voltam à rotação antes do prazo.
      const selectedPool = poolRows.filter((r) => !isKeyInMemoryCooldown(r.id));

      const decodedPool: Array<{ id: string; rawKey: string }> = [];

      for (const row of selectedPool) {
        if (row.encrypted_key) {
          try {
            const rawKey = decryptSecret(row.encrypted_key).trim();
            if (rawKey && !decodedPool.some((k) => k.rawKey === rawKey)) {
              decodedPool.push({ id: row.id, rawKey });
            }
          } catch {
            // Segredo corrompido ou ilegível é ignorado defensivamente
          }
        }
      }

      // Rotação Round-Robin em memória entre as chaves saudáveis para distribuir chamadas concorrentes
      if (decodedPool.length > 1) {
        const cursor = (providerRoundRobinCursor.get(provider) || 0) % decodedPool.length;
        providerRoundRobinCursor.set(provider, cursor + 1);
        const rotated = [...decodedPool.slice(cursor), ...decodedPool.slice(0, cursor)];
        for (const item of rotated) {
          if (!keys.some((k) => k.rawKey === item.rawKey)) {
            keys.push(item);
          }
        }
      } else {
        for (const item of decodedPool) {
          if (!keys.some((k) => k.rawKey === item.rawKey)) {
            keys.push(item);
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[api-orchestrator] Falha ao ler chaves do pool para ${provider}:`, err);
  }

  // 3. Fallbacks de variáveis de ambiente locais (suporta chave única, numeradas _1.._10 e lista _KEYS separada por vírgula)
  if (typeof process !== "undefined" && process.env) {
    const prefix = provider.toUpperCase();
    const envCandidates: string[] = [];

    const baseEnv = process.env[`${prefix}_API_KEY`]?.trim();
    if (baseEnv) envCandidates.push(baseEnv);

    const multiListEnv = process.env[`${prefix}_API_KEYS`]?.trim();
    if (multiListEnv) {
      for (const part of multiListEnv.split(/[,;\r\n]+/)) {
        if (part.trim()) envCandidates.push(part.trim());
      }
    }

    for (let idx = 1; idx <= 10; idx++) {
      const numbered = process.env[`${prefix}_API_KEY_${idx}`]?.trim();
      if (numbered) envCandidates.push(numbered);
    }

    if (provider === "gemini") {
      const alt =
        process.env.GOOGLE_API_KEY ||
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        process.env.VITE_GEMINI_API_KEY;
      if (alt?.trim()) envCandidates.push(alt.trim());
    } else if (provider === "firecrawl") {
      const alt = process.env.VITE_FIRECRAWL_API_KEY;
      if (alt?.trim()) envCandidates.push(alt.trim());
    } else if (provider === "steel") {
      const alt = process.env.VITE_STEEL_API_KEY;
      if (alt?.trim()) envCandidates.push(alt.trim());
    }

    envCandidates.forEach((rawKey, i) => {
      const envId = `env-${provider}-${i + 1}`;
      if (rawKey && !isKeyInMemoryCooldown(envId) && !keys.some((k) => k.rawKey === rawKey)) {
        keys.push({ id: envId, rawKey });
      }
    });
  }

  return keys;
}

/**
 * Atualiza estatísticas de uso da chave de API (FinOps & Quotas).
 */
export async function recordKeyUsage(keyId: string): Promise<void> {
  if (!keyId || keyId.startsWith("env-") || keyId.startsWith("byok-")) return;
  try {
    const supabase = getServerClient();
    const { data } = await supabase
      .from("api_key_pools")
      .select("daily_request_count")
      .eq("id", keyId)
      .maybeSingle();

    await supabase
      .from("api_key_pools")
      .update({
        last_used_at: new Date().toISOString(),
        daily_request_count: ((data as any)?.daily_request_count || 0) + 1,
      })
      .eq("id", keyId);
  } catch (err) {
    console.warn("[api-orchestrator] updateKeyLastUsed error:", err);
  }
}

/**
 * Registra telemetria ACID granular em ai_telemetry_logs para observabilidade.
 */
export async function recordAiTelemetry(entry: {
  callId?: string;
  task: string;
  provider: ApiProvider;
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  status: "success" | "error" | "fallback_recovered";
  fallbackUsed?: boolean;
  fallbackFrom?: string;
  errorMessage?: string;
  storeId?: string;
  userId?: string;
}): Promise<void> {
  try {
    const supabase = getServerClient();
    await supabase.from("ai_telemetry_logs").insert({
      call_id: entry.callId || `call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      task: entry.task,
      module: "omni_mining_orchestrator",
      provider: entry.provider,
      model: entry.model,
      latency_ms: entry.latencyMs,
      input_tokens: entry.inputTokens || 0,
      output_tokens: entry.outputTokens || 0,
      total_tokens: (entry.inputTokens || 0) + (entry.outputTokens || 0),
      status: entry.status,
      fallback_used: entry.fallbackUsed ?? false,
      fallback_from: entry.fallbackFrom || null,
      error_message: entry.errorMessage ? entry.errorMessage.slice(0, 255) : null,
      store_id: entry.storeId || null,
      user_id: entry.userId || null,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Telemetria não bloqueia fluxo principal
  }
}

/**
 * Helper interno: Obtém a chave ativa prioritária do pool com rotação e fallback para ambiente local.
 */
export async function getNextActiveKey(
  provider: ApiProvider,
  ownerId?: string,
): Promise<{ id: string; rawKey: string } | null> {
  const keys = await getAllActiveKeysForProvider(provider, ownerId);
  if (keys.length > 0) {
    await recordKeyUsage(keys[0].id);
    return keys[0];
  }
  return null;
}

export type KeyQuarantineScope = "minute" | "day" | "month" | "permanent";

export interface KeyQuotaClassification {
  scope: KeyQuarantineScope;
  reason: string;
  /** Instante (epoch ms) em que a chave volta à rotação; null = permanente. */
  until: number | null;
}

/**
 * Classifica o erro HTTP/corpo de um provedor de IA no escopo temporal de quota correto.
 * - permanent: 401/403 chave inválida/revogada (desativa a chave)
 * - month: 402 / insufficient_quota / créditos esgotados (até dia 1º do próximo mês, UTC)
 * - day: 429 com RPD/TPD/"per day" (até 00:00 UTC do dia seguinte)
 * - minute: 429 padrão RPM/TPM (60s) ou 5xx transitório (30s)
 */
export function classifyKeyQuotaError(
  statusCode?: number,
  errorMessage: string = "",
  nowMs: number = Date.now(),
): KeyQuotaClassification {
  const msg = (errorMessage || "").toLowerCase();
  const now = new Date(nowMs);

  const isInvalid =
    statusCode === 401 ||
    statusCode === 403 ||
    /invalid[_ ]api[_ ]key|api key not valid|unauthorized|revoked|account_deactivated|permission_denied/.test(
      msg,
    );
  if (isInvalid && statusCode !== 429) {
    return { scope: "permanent", reason: "invalid_key", until: null };
  }

  const isMonthly =
    statusCode === 402 ||
    /insufficient_quota|billing_hard_limit_reached|monthly[_ ]limit|credit balance is too low|exceeded your current quota|spend limit|per month|monthly quota/.test(
      msg,
    );
  if (isMonthly) {
    const nextMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0);
    return { scope: "month", reason: "monthly_quota_exhausted", until: nextMonth };
  }

  const isDaily =
    /per day|daily|\brpd\b|\btpd\b|tokens per day|requests per day|generaterequestsperday|perdayperproject/.test(
      msg,
    );
  if (isDaily) {
    const tomorrow = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
    );
    return { scope: "day", reason: "daily_quota_exhausted", until: tomorrow };
  }

  if (statusCode === 429 || /rate limit|too many requests|per minute|\brpm\b|\btpm\b/.test(msg)) {
    return { scope: "minute", reason: "rate_limit_minute", until: nowMs + 60_000 };
  }

  return { scope: "minute", reason: "transient_error", until: nowMs + 30_000 };
}

/**
 * Registra falha em uma chave do pool aplicando quarentena com escopo temporal real
 * (memória + colunas quarantine_* em api_key_pools). A próxima chamada usa a próxima chave saudável.
 */
export async function markKeyError(
  keyId: string,
  errorMessage: string = "Rate limit or network error",
  statusCode?: number,
): Promise<void> {
  if (!keyId) return;
  const cls = classifyKeyQuotaError(statusCode, errorMessage);
  keyCooldownUntilMap.set(keyId, cls.until ?? Date.now() + 365 * 86_400_000);

  if (keyId.startsWith("env-") || keyId.startsWith("byok-") || keyId === "override-key") return;
  const supabase = getServerClient();
  const { error } = await supabase
    .from("api_key_pools")
    .update({
      last_error_at: new Date().toISOString(),
      last_error_message: errorMessage.slice(0, 255),
      is_active: cls.scope === "permanent" ? false : true,
      quarantine_scope: cls.scope,
      quarantine_reason: cls.reason,
      quarantine_until: cls.until ? new Date(cls.until).toISOString() : null,
    })
    .eq("id", keyId);
  if (error) {
    console.warn(
      `[api-orchestrator] Falha ao registrar quarentena da chave ${keyId}:`,
      error.message,
    );
  }
}

/**
 * Cadastra ou adiciona uma nova chave de API no pool sem sobrescrever chaves diferentes do mesmo provedor.
 */
export const saveSimLabApiKey = createServerFn({ method: "POST" })
  .validator(
    z.object({
      provider: z.enum(["openrouter", "groq", "gemini", "openai"]),
      apiKey: z.string().min(5, "Chave de API inválida"),
      label: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const supabase = getServerClient();
    const rawKey = data.apiKey.trim();
    const masked = maskSecret(rawKey);
    const encrypted = encryptSecret(rawKey);

    const payload = {
      provider: data.provider,
      label: data.label || `Chave ${data.provider.toUpperCase()} (${masked})`,
      encrypted_key: encrypted,
      masked_key: masked,
      priority: 1,
      rate_limit_per_minute: 60,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    // Verifica apenas se esta exata chave já existe (preservando outras chaves do mesmo provedor!)
    const { data: existingList } = await supabase
      .from("api_key_pools")
      .select("id, encrypted_key, masked_key")
      .eq("provider", data.provider);

    const existingMatch = (existingList || []).find((k) => {
      if (k.masked_key !== masked) return false;
      try {
        return decryptSecret(k.encrypted_key) === rawKey;
      } catch {
        return false;
      }
    });

    if (existingMatch?.id) {
      await supabase.from("api_key_pools").update(payload).eq("id", existingMatch.id);
      return { success: true, id: existingMatch.id, provider: data.provider, masked };
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
  async (): Promise<{
    hasActiveKey: boolean;
    activeProvider: "openrouter" | "gemini" | "groq" | "openai" | null;
    poolCount: number;
  }> => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) {
      return { hasActiveKey: false, activeProvider: null, poolCount: 0 };
    }

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
  },
);

export const unifiedAiTaskTypeEnum = z.enum([
  "vision",
  "ocr",
  "fast_json",
  "scraping",
  "editorial_squad",
  "deep_reasoning",
  "chat",
]);

export type UnifiedAiTaskType = z.infer<typeof unifiedAiTaskTypeEnum>;

export const TEXT_ONLY_PROVIDERS = ["groq"] as const;
export const MULTIMODAL_PROVIDERS = ["gemini", "anthropic", "openai", "openrouter"] as const;

export interface UnifiedAiCallOptions {
  systemPrompt?: string;
  systemInstruction?: string;
  userPrompt?: string;
  prompt?: string;
  feature?: string;
  taskType?: UnifiedAiTaskType | "multimodal" | string;
  isSystemTask?: boolean;
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
  modelUsed?: string;
  parsedJson?: any;
}

/**
 * Motor Unificado de Execução de IA da Plataforma Waesy.
 * Orquestra chaves ativas do pool com failover transparente, suporte multimodal (visão/OCR) e registro de erros.
 * Provedores suportados: OpenRouter, Groq, Gemini, OpenAI.
 */
export async function executeUnifiedAiCall(
  options: UnifiedAiCallOptions,
): Promise<UnifiedAiResult> {
  const callStartTime = Date.now();
  const systemPrompt = options.systemPrompt || options.systemInstruction;
  const userPrompt = options.userPrompt || options.prompt || "";
  const isJson =
    options.responseFormat === "json_object" ||
    options.expectJson === true ||
    options.jsonMode === true;
  const preferred = options.preferredProvider || options.preferProvider;
  const images = [...(options.images || [])];
  if (options.fileBase64 && images.length === 0) {
    images.push({
      mimeType: options.fileMime || "image/jpeg",
      base64: options.fileBase64,
    });
  }

  const targetOwner =
    options.ownerId ||
    (await getServerIdentity()
      .then((id) => id?.id || undefined)
      .catch(() => undefined));
  const targetStore =
    options.storeId ||
    (await getServerIdentity()
      .then((id) => id?.store_id || undefined)
      .catch(() => undefined));

  // Priorização baseada em afinidade de tarefa (Task Aptitude) e economia de cotas:
  // - Visão/OCR: Gemini / Claude / OpenAI / OpenRouter (multimodal nativo; ignora Groq text-only)
  // - Fast JSON / Scraping: Groq primeiro (latência sub-200ms, Qwen 3.8, cota alta), seguido de OpenAI e OpenRouter
  // - Editorial Squad: Groq primeiro para velocidade, seguido de OpenRouter e Gemini
  // - Deep Reasoning: OpenAI / Anthropic / Gemini
  const isVisionTask =
    images.length > 0 ||
    options.taskType === "vision" ||
    options.taskType === "ocr" ||
    options.taskType === "multimodal";

  const isFastJsonTask =
    options.taskType === "fast_json" ||
    options.taskType === "scraping" ||
    (isJson && !isVisionTask);

  const isEditorialSquadTask =
    options.taskType === "editorial_squad" ||
    Boolean(options.feature?.includes("editorial")) ||
    Boolean(options.feature?.includes("curation"));

  const isDeepReasoningTask =
    options.taskType === "deep_reasoning" ||
    options.taskType === "code" ||
    Boolean(options.feature?.includes("planning")) ||
    Boolean(options.feature?.includes("contract_analysis"));

  let defaultCascade: ApiProvider[];
  if (isVisionTask) {
    defaultCascade = ["gemini", "anthropic", "openai", "openrouter"];
  } else if (isFastJsonTask) {
    defaultCascade = ["groq", "openai", "openrouter", "gemini", "anthropic"];
  } else if (isEditorialSquadTask) {
    defaultCascade = ["groq", "openrouter", "gemini", "openai", "anthropic"];
  } else if (isDeepReasoningTask) {
    defaultCascade = ["openai", "anthropic", "openrouter", "gemini", "groq"];
  } else {
    defaultCascade = ["groq", "gemini", "openrouter", "openai", "anthropic"];
  }

  const providersToTry: ApiProvider[] = [];
  if (preferred) {
    const isPreferredAllowed = isVisionTask
      ? !TEXT_ONLY_PROVIDERS.includes(preferred as any)
      : true;
    if (isPreferredAllowed) {
      providersToTry.push(preferred);
    }
  }

  for (const p of defaultCascade) {
    if (!providersToTry.includes(p)) {
      if (isVisionTask && TEXT_ONLY_PROVIDERS.includes(p as any)) continue;
      providersToTry.push(p);
    }
  }

  const finalProvidersToTry = isVisionTask
    ? providersToTry.filter((p) => !TEXT_ONLY_PROVIDERS.includes(p as any))
    : providersToTry;

  // Isolamento estrito: Tarefas de background da plataforma (crawlers, cron, DataJud) NUNCA consomem BYOK de lojistas
  const isPlatformBackground =
    Boolean(options.isSystemTask) ||
    Boolean(options.feature?.startsWith("mining_")) ||
    Boolean(options.feature?.startsWith("cron_")) ||
    Boolean(options.feature?.startsWith("crawler_")) ||
    Boolean(options.feature?.startsWith("datajud_")) ||
    options.taskType === "scraping" ||
    options.taskType === "background" ||
    (!options.storeId &&
      !options.ownerId &&
      (Boolean(options.feature?.includes("harvest")) ||
        Boolean(options.feature?.includes("crawler"))));

  const canUseByok = !isPlatformBackground && (Boolean(targetOwner) || Boolean(targetStore));

  const errors: string[] = [];

  for (const provider of finalProvidersToTry) {
    const keysToTry: Array<{ id: string; rawKey: string }> = [];
    if (options.overrideApiKey && provider === preferred) {
      keysToTry.push({ id: "override-key", rawKey: options.overrideApiKey });
    }

    // 1. BYOK: Verifica se o lojista/usuário possui chave ativa configurada no secret_vault
    // Compatibilidade de aptidão: se tarefa for vision, ignora BYOK do Groq (pois é text-only)
    if (canUseByok) {
      const isProviderCompatibleWithTask = isVisionTask
        ? !TEXT_ONLY_PROVIDERS.includes(provider as any)
        : true;
      if (isProviderCompatibleWithTask) {
        const byokSecret = await getActiveSecretForProvider(
          provider,
          targetOwner || undefined,
          targetStore || undefined,
        ).catch(() => null);
        if (byokSecret && !keysToTry.some((k) => k.rawKey === byokSecret)) {
          const byokKeyId = `byok-${provider}-${targetStore || targetOwner || "user"}`;
          if (!isKeyInMemoryCooldown(byokKeyId)) {
            keysToTry.push({ id: byokKeyId, rawKey: byokSecret });
          }
        }
      }
    }

    // 2. Pool de Chaves Gerenciadas da Plataforma (Admin Master) - Carrega todas as chaves ativas do provedor balanceadas
    // Se for background da plataforma, não passa targetOwner para não atrelar chave de lojista ao pool
    const poolKeys = await getAllActiveKeysForProvider(provider, undefined).catch(() => []);
    for (const pk of poolKeys) {
      if (pk.rawKey && !keysToTry.some((k) => k.rawKey === pk.rawKey)) {
        keysToTry.push(pk);
      }
    }

    // 3. Fallback de Variáveis de Ambiente do Servidor
    const envKeyName = `${provider.toUpperCase()}_API_KEY`;
    const envFallback = (
      typeof process !== "undefined" && process.env ? process.env[envKeyName] : undefined
    )?.trim();
    if (envFallback && !keysToTry.some((k) => k.rawKey === envFallback)) {
      keysToTry.push({ id: `env-${provider}`, rawKey: envFallback });
    }

    if (keysToTry.length === 0) continue;

    for (const keyInfo of keysToTry) {
      const finalizeSuccess = async (
        content: string,
        model: string,
        parsedJson?: any,
      ): Promise<UnifiedAiResult> => {
        await recordKeyUsage(keyInfo.id);
        const latencyMs = Date.now() - callStartTime;
        await recordAiTelemetry({
          task: options.taskType || options.feature || "unified_call",
          provider,
          model,
          latencyMs,
          status: errors.length > 0 ? "fallback_recovered" : "success",
          fallbackUsed: errors.length > 0,
          fallbackFrom: errors.length > 0 ? errors[0] : undefined,
          storeId: targetStore,
          userId: targetOwner,
        });
        return { content, text: content, provider, model, modelUsed: model, parsedJson };
      };

      try {
        if (provider === "openrouter") {
          const openRouterModels = isVisionTask
            ? ["google/gemini-2.5-flash", "qwen/qwen2.5-vl-72b-instruct:free"]
            : [
                "meta-llama/llama-3.3-70b-instruct:free",
                "qwen/qwen3-235b-a22b:free",
                "deepseek/deepseek-chat-v3-0324:free",
                "meta-llama/llama-3.3-70b-instruct",
                "google/gemini-2.5-flash",
              ];

          if (options.modelOverride) {
            if (!openRouterModels.includes(options.modelOverride)) {
              openRouterModels.unshift(options.modelOverride);
            } else {
              openRouterModels.splice(openRouterModels.indexOf(options.modelOverride), 1);
              openRouterModels.unshift(options.modelOverride);
            }
          }

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

          let orRes: Response | null = null;
          let activeOrModel = openRouterModels[0];
          let lastOrStatus = 500;
          let lastOrErrText = "";

          for (const candidateModel of openRouterModels) {
            activeOrModel = candidateModel;
            const bodyPayload: any = {
              model: candidateModel,
              messages,
              temperature: options.temperature ?? 0.3,
              max_tokens: options.maxTokens ?? 2048,
            };
            if (isJson) {
              bodyPayload.response_format = { type: "json_object" };
            }

            const attemptRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${keyInfo.rawKey}`,
                "HTTP-Referer": "https://waesy.pages.dev",
                "X-Title": "Waesy Platform",
              },
              body: JSON.stringify(bodyPayload),
              signal: AbortSignal.timeout(12000),
            });

            if (attemptRes.ok) {
              orRes = attemptRes;
              break;
            }

            lastOrStatus = attemptRes.status;
            lastOrErrText = await attemptRes.text().catch(() => "");
            if (
              attemptRes.status === 401 ||
              attemptRes.status === 402 ||
              attemptRes.status === 403 ||
              attemptRes.status === 429
            ) {
              break;
            }
          }

          if (!orRes || !orRes.ok) {
            await markKeyError(
              keyInfo.id,
              `OpenRouter HTTP ${lastOrStatus}: ${lastOrErrText.slice(0, 150)}`,
              lastOrStatus,
            );
            errors.push(`OpenRouter (${lastOrStatus})`);
            continue;
          }

          const data = await orRes.json();
          const rawContent = data?.choices?.[0]?.message?.content || "";
          const content = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
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
                try {
                  parsedJson = JSON.parse(match[0]);
                } catch (err) {
                  console.warn("[api-orchestrator:openai] JSON parse fallback error:", err);
                }
              }
            }
          }

          return await finalizeSuccess(content, activeOrModel, parsedJson);
        }

        if (provider === "groq") {
          if (isVisionTask) {
            // Groq é text-only neste pool — segue para próximo provedor da cascata
            continue;
          }

          // Higienização e cascata de modelos para o Groq: garante resiliência caso um modelo específico oscile
          const groqModels = ["qwen/qwen3.8-27b", "llama-3.3-70b-versatile", "openai/gpt-oss-120b"];
          if (options.modelOverride) {
            const o = options.modelOverride.toLowerCase();
            if (
              o.includes("qwen") ||
              o.includes("llama") ||
              o.includes("gpt-oss") ||
              o.includes("mixtral") ||
              o.includes("gemma")
            ) {
              if (!groqModels.includes(options.modelOverride)) {
                groqModels.unshift(options.modelOverride);
              } else {
                groqModels.splice(groqModels.indexOf(options.modelOverride), 1);
                groqModels.unshift(options.modelOverride);
              }
            }
          }

          const isJsonMode = isFastJsonTask || isJson;
          let finalSystemPrompt = systemPrompt;
          let finalUserPrompt = userPrompt;
          if (isJsonMode) {
            const hasJsonWord =
              (finalSystemPrompt && /json/i.test(finalSystemPrompt)) ||
              (finalUserPrompt && /json/i.test(finalUserPrompt));
            if (!hasJsonWord) {
              finalSystemPrompt = finalSystemPrompt
                ? `${finalSystemPrompt}\nResponda estritamente em formato JSON válido.`
                : "Responda estritamente em formato JSON válido.";
            }
          }

          const messages: any[] = [];
          if (finalSystemPrompt) {
            messages.push({ role: "system", content: finalSystemPrompt });
          }
          messages.push({ role: "user", content: finalUserPrompt });

          let groqRes: Response | null = null;
          let activeGroqModel = groqModels[0];
          let lastGroqStatus = 500;
          let lastGroqErrText = "";

          for (const candidateModel of groqModels) {
            activeGroqModel = candidateModel;
            const bodyPayload: any = {
              model: candidateModel,
              messages,
              temperature: isFastJsonTask
                ? (options.temperature ?? 0.1)
                : (options.temperature ?? 0.3),
              max_tokens: options.maxTokens ?? 4096,
            };
            if (isJsonMode) {
              bodyPayload.response_format = { type: "json_object" };
            }

            const attemptRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${keyInfo.rawKey}`,
              },
              body: JSON.stringify(bodyPayload),
              signal: AbortSignal.timeout(20000),
            });

            if (attemptRes.ok) {
              groqRes = attemptRes;
              break;
            }

            lastGroqStatus = attemptRes.status;
            lastGroqErrText = await attemptRes.text().catch(() => "");
            // Se for erro de autenticação (401/403) ou cota (402/429), a chave em si está impedida; passa para próxima chave
            if (
              attemptRes.status === 401 ||
              attemptRes.status === 402 ||
              attemptRes.status === 403 ||
              attemptRes.status === 429
            ) {
              break;
            }
          }

          if (!groqRes || !groqRes.ok) {
            await markKeyError(
              keyInfo.id,
              `Groq HTTP ${lastGroqStatus}: ${lastGroqErrText.slice(0, 300)}`,
              lastGroqStatus,
            );
            errors.push(`Groq (${lastGroqStatus})`);
            continue;
          }

          const data = await groqRes.json();
          const rawContent = data?.choices?.[0]?.message?.content || "";
          const content = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
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
                try {
                  parsedJson = JSON.parse(match[0]);
                } catch (err) {
                  console.warn("[api-orchestrator:groq] JSON parse fallback error:", err);
                }
              }
            }
          }

          return await finalizeSuccess(content, activeGroqModel, parsedJson);
        }

        if (provider === "gemini") {
          // Higienização de modelo para o Google Gemini
          let model = "gemini-2.5-flash";
          if (options.modelOverride) {
            const o = options.modelOverride.toLowerCase();
            if (o.includes("gemini")) {
              model = options.modelOverride;
            }
          }
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
              maxOutputTokens: options.maxTokens ?? 4096,
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
            signal: AbortSignal.timeout(30000),
          });

          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            await markKeyError(
              keyInfo.id,
              `Gemini HTTP ${res.status}: ${errText.slice(0, 300)}`,
              res.status,
            );
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
                try {
                  parsedJson = JSON.parse(match[0]);
                } catch (err) {
                  console.warn("[api-orchestrator:gemini] JSON parse fallback error:", err);
                }
              }
            }
          }

          return await finalizeSuccess(content, model, parsedJson);
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
            await markKeyError(
              keyInfo.id,
              `OpenAI HTTP ${res.status}: ${errText.slice(0, 300)}`,
              res.status,
            );
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
                try {
                  parsedJson = JSON.parse(match[0]);
                } catch (err) {
                  console.warn(
                    "[api-orchestrator:openai_fallback] JSON parse fallback error:",
                    err,
                  );
                }
              }
            }
          }

          return await finalizeSuccess(content, model, parsedJson);
        }

        if (provider === "anthropic") {
          const model =
            options.modelOverride ||
            (isVisionTask ? "claude-3-5-sonnet-20241022" : "claude-3-5-haiku-20241022");
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
            await markKeyError(
              keyInfo.id,
              `Anthropic HTTP ${res.status}: ${errText.slice(0, 300)}`,
              res.status,
            );
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
                try {
                  parsedJson = JSON.parse(match[0]);
                } catch (err) {
                  console.warn("[api-orchestrator:anthropic] JSON parse fallback error:", err);
                }
              }
            }
          }

          return await finalizeSuccess(content, model, parsedJson);
        }
      } catch (err: any) {
        if (keyInfo?.id) {
          await markKeyError(keyInfo.id, `Erro de conexão: ${err.message || "Network Error"}`);
        }
        errors.push(`${provider}: ${err.message}`);
      }
    }
  }

  await recordAiTelemetry({
    task: options.taskType || options.feature || "unified_call",
    provider: providersToTry[0] || "groq",
    model: "none",
    latencyMs: Date.now() - callStartTime,
    status: "error",
    errorMessage: errors.join("; "),
    storeId: targetStore,
    userId: targetOwner,
  });

  throw new Error(
    `Nenhum provedor de IA ativo pôde processar a solicitação. Verifique suas chaves em Admin Master > Pools de APIs ou Workspace > Cofre de IA (OpenRouter, Groq, Gemini, OpenAI ou Anthropic). Detalhes: ${errors.join("; ") || "Sem chaves ativas configuradas"}`,
  );
}

/**
 * 7. Importa e extrai dados de um produto a partir de qualquer link/URL.
 */
export const importProductFromUrl = createServerFn({ method: "POST" })
  .validator(
    z.object({
      url: z.string().url("URL inválida"),
      tone: z
        .enum(["profissional", "persuasivo", "tecnico", "minimalista"])
        .default("profissional"),
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
      throw new Error(
        `Acesso temporariamente bloqueado: ${usage.blocked_reason || "Cota excedida"}`,
      );
    }

    if (usage && usage.daily_requests_used >= usage.daily_requests_limit) {
      throw new Error(
        `Você atingiu o limite diário de ${usage.daily_requests_limit} importações de produtos. O limite renova amanhã.`,
      );
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
          const jsonLdMatches = html.matchAll(
            /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
          );
          for (const match of jsonLdMatches) {
            try {
              const parsed = JSON.parse(match[1]);
              const items = Array.isArray(parsed) ? parsed : [parsed];
              for (const item of items) {
                const candidate = item["@graph"] ? item["@graph"] : [item];
                for (const node of candidate) {
                  const type = node["@type"];
                  const isProduct =
                    type === "Product" || (Array.isArray(type) && type.includes("Product"));
                  if (isProduct && (node.name || node.title)) {
                    const rawPrice =
                      node.offers?.price ||
                      (Array.isArray(node.offers) ? node.offers[0]?.price : undefined);
                    let priceCents = 0;
                    if (rawPrice) {
                      const numeric = parseFloat(
                        String(rawPrice)
                          .replace(/[^\d.,]/g, "")
                          .replace(",", "."),
                      );
                      if (!isNaN(numeric)) priceCents = Math.round(numeric * 100);
                    }
                    const images = [];
                    const rawImages = node.image
                      ? Array.isArray(node.image)
                        ? node.image
                        : [node.image]
                      : [];
                    for (const img of rawImages) {
                      const url = typeof img === "string" ? img : img?.url;
                      if (url && typeof url === "string" && url.startsWith("http"))
                        images.push(url);
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
                    }).catch((err) =>
                      console.warn(
                        "[api-orchestrator] Falha não impeditiva ao enriquecer mined_product:",
                        err,
                      ),
                    );

                    return mechanicalProduct;
                  }
                }
              }
            } catch (err) {
              console.warn("[api-orchestrator] Schema.org microdata parse error:", err);
            }
          }
        } catch (e) {
          console.warn(
            "[api-orchestrator] Extração mecânica Schema.org ignorada, prosseguindo com fallback de IA:",
            e,
          );
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
      console.warn(
        "[importProductFromUrl] Falha no pool de IA, tentando extração heurística:",
        aiErr.message,
      );
    }

    // Fallback inteligente caso nenhuma IA responda: Extrai dados estruturados básicos via regex
    if (!extractedProduct) {
      // Extração determinística de título
      const titleMatch =
        rawContent.match(/<h1[^>]*>([^<]+)<\/h1>/i) || rawContent.match(/title:\s*([^\n]+)/i);
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
      }).catch((err) =>
        console.warn("[api-orchestrator] Falha não impeditiva ao enriquecer mined_product:", err),
      );
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
          throw new Error(
            `Não foi possível acessar a página de origem (Status ${fetchRes.status})`,
          );
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
      throw new Error(
        "A IA não conseguiu identificar itens e categorias de cardápio no conteúdo informado.",
      );
    }

    return extracted as ImportedCatalogDTO;
  });
