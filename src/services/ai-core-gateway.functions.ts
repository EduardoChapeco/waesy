import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as crypto from "crypto";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, requireAdmin } from "@/lib/server-access";
import { inspectPromptSecurity, buildSandboxedPromptPayload, sanitizeAiOutput } from "@/lib/ai/prompt-shield";
import { logOperationalEvent } from "@/lib/telemetry/operational-logger";
import { getRequestScopedInflightMap } from "@/lib/request-inflight";
import * as apiOrchestrator from "./api-orchestrator.functions";
import {
  embedSingleWithProvider,
  generateBatchEmbeddings,
  l2NormalizeEmbedding,
  safeMarkKeyError,
  safeRecordKeyUsage,
} from "./ai-embedding-client";

export { l2NormalizeEmbedding };

export const MAX_GATEWAY_EXTERNAL_HTTP_SUBREQUESTS = 8;
const MAX_GATEWAY_ERROR_REPORT_SUBREQUESTS = 4;

async function safeLoadBatchKeys(
  providers: string[],
  ownerId?: string,
  storeId?: string,
): Promise<Record<string, Array<{ id: string; rawKey: string; label?: string }>> | null> {
  if (providers.length === 0) return null;
  try {
    const fn = apiOrchestrator.getBatchActiveKeysForProviders;
    if (typeof fn !== "function") return null;
    return await fn(providers, ownerId, storeId);
  } catch {
    return null;
  }
}

async function safeLoadProviderKeys(
  provider: string,
  ownerId?: string,
  storeId?: string,
): Promise<Array<{ id: string; rawKey: string; label?: string }>> {
  try {
    const getAllFn = apiOrchestrator.getAllActiveKeysForProvider;
    if (typeof getAllFn === "function") {
      const allKeys = await getAllFn(provider as any, ownerId, storeId);
      if (Array.isArray(allKeys) && allKeys.length > 0) return allKeys;
    }
  } catch {
    // Fallback para mocks parciais em testes sem getAllActiveKeysForProvider
  }
  const singleKey = await apiOrchestrator.getNextActiveKey(provider as any, ownerId);
  return singleKey && singleKey.rawKey ? [singleKey] : [];
}

// ============================================================
// Tipos & Schemas Canônicos da Porta Única (ia/02-contrato.md)
// ============================================================

export const aiTaskTypeEnum = z.enum([
  "chat",
  "resumo",
  "classificacao",
  "extracao",
  "geracao_texto",
  "imagem",
  "video",
  "embedding",
  "ocr",
  "codigo",
]);

export type AITaskType = z.infer<typeof aiTaskTypeEnum>;
export type AIExecutionMode = "sync" | "stream" | "async_queue";
export type CircuitState = "closed" | "open" | "half_open";

export interface AIGatewayRequest {
  task: AITaskType;
  mode?: AIExecutionMode;
  prompt: string;
  systemPrompt?: string;
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  context?: Record<string, any>;
  images?: Array<{ mimeType: string; base64: string }>;
  constraints?: {
    maxTokens?: number;
    temperature?: number;
    responseFormat?: "json_object" | "text";
    timeoutMs?: number;
    minQualityScore?: number;
    maxCostUsd?: number;
  };
  authContext?: {
    userId?: string;
    workspaceId?: string;
    storeId?: string;
    userRole?: string;
    plan?: string;
  };
  module?: string;
  promptVersion?: string;
  bypassCache?: boolean;
  signal?: AbortSignal;
}

export interface AIGatewayResponse {
  success: boolean;
  result: {
    text: string;
    parsedJson?: any;
    asyncJobId?: string;
    media?: {
      kind: "image";
      url?: string;
      base64?: string;
      mimeType?: string;
      provenance: "provider" | "deterministic_fallback";
      provider: string;
      jobId?: string;
    };
  };
  metadata: {
    callId: string;
    provider: string;
    model: string;
    fallbackUsed: boolean;
    fallbackFrom?: string;
    attemptsCount: number;
    latencyMs: number;
    cacheHit: boolean;
    usage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
    costUsd: number;
    promptVersion: string;
    fingerprint: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// ============================================================
// Tabela de Preços e Roteamento Canônico
// ============================================================

const MODEL_PRICING: Record<string, { inPer1M: number; outPer1M: number }> = {
  "groq:qwen/qwen3.8-27b": { inPer1M: 0.20, outPer1M: 0.20 },
  "groq:openai/gpt-oss-120b": { inPer1M: 0.50, outPer1M: 0.50 },
  "groq:llama-3.3-70b-versatile": { inPer1M: 0.59, outPer1M: 0.79 },
  "groq:llama-3.1-8b-instant": { inPer1M: 0.05, outPer1M: 0.08 },
  "gemini:gemini-2.5-flash": { inPer1M: 0.075, outPer1M: 0.30 },
  "gemini:gemini-2.5-pro": { inPer1M: 1.25, outPer1M: 5.00 },
  "gemini:text-embedding-004": { inPer1M: 0.02, outPer1M: 0.00 },
  "openai:gpt-4o-mini": { inPer1M: 0.15, outPer1M: 0.60 },
  "openai:gpt-4o": { inPer1M: 2.50, outPer1M: 10.00 },
  "anthropic:claude-3-5-sonnet-20241022": { inPer1M: 3.00, outPer1M: 15.00 },
  "deepseek:deepseek-chat": { inPer1M: 0.27, outPer1M: 1.10 },
  "openai:dall-e-3": { inPer1M: 40.0, outPer1M: 40.0 },
  "openrouter:meta-llama/llama-3.1-70b-instruct:free": { inPer1M: 0.0, outPer1M: 0.0 },
  "openrouter:google/gemma-2-9b-it:free": { inPer1M: 0.0, outPer1M: 0.0 },
  "default": { inPer1M: 0.50, outPer1M: 1.00 },
};

export function calculateCost(provider: string, model: string, inTokens: number, outTokens: number): number {
  const key = `${provider}:${model}`;
  const pricing = MODEL_PRICING[key] || MODEL_PRICING["default"];
  const cost = (inTokens / 1_000_000) * pricing.inPer1M + (outTokens / 1_000_000) * pricing.outPer1M;
  return Number(cost.toFixed(6));
}

// In-Flight Promise Dedup (intra-request scoped via request-inflight)

// Circuit Breakers em Memória (com fallback e persistência assíncrona)
export interface ProviderCircuit {
  state: CircuitState;
  consecutiveFailures: number;
  openUntil: number;
}
export const circuitBreakers = new Map<string, ProviderCircuit>();

export function getCircuit(provider: string): ProviderCircuit {
  let cb = circuitBreakers.get(provider);
  if (!cb) {
    cb = { state: "closed", consecutiveFailures: 0, openUntil: 0 };
    circuitBreakers.set(provider, cb);
  }
  const now = Date.now();
  if (cb.state === "open" && now > cb.openUntil) {
    cb.state = "half_open";
  }
  return cb;
}

export function recordCircuitFailure(provider: string, errorOrStatus?: number | string | Error) {
  const cb = getCircuit(provider);
  cb.consecutiveFailures += 1;
  const errStr = String(errorOrStatus || "").toLowerCase();
  const isRateLimit =
    errorOrStatus === 429 ||
    errStr.includes("429") ||
    errStr.includes("resource_exhausted") ||
    errStr.includes("quota");

  if (isRateLimit || cb.consecutiveFailures >= 3 || cb.state === "half_open") {
    cb.state = "open";
    // 5 minutos para 429 / quota estourada, 60 segundos para falhas transitórias
    cb.openUntil = Date.now() + (isRateLimit ? 300_000 : 60_000);
    console.warn(
      `[AI-CORE-GATEWAY] Circuit Breaker OPEN para o provedor ${provider} (${isRateLimit ? "Quota 429 detectada" : "3 falhas consecutivas"}) até ${new Date(cb.openUntil).toISOString()}`
    );
  }
}

export function recordCircuitSuccess(provider: string) {
  const cb = getCircuit(provider);
  cb.consecutiveFailures = 0;
  cb.state = "closed";
  cb.openUntil = 0;
}

// ============================================================
// Matriz Canônica de Roteamento por Tarefa
// ============================================================

export interface RouteCandidate {
  provider: string;
  model: string;
}

export const CANONICAL_TASK_ROUTES: Record<AITaskType, RouteCandidate[]> = {
  chat: [
    { provider: "groq", model: "qwen/qwen3.8-27b" },
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "groq", model: "openai/gpt-oss-120b" },
    { provider: "anthropic", model: "claude-3-5-sonnet-20241022" },
    { provider: "deepseek", model: "deepseek-chat" },
    { provider: "openrouter", model: "google/gemma-2-9b-it:free" },
  ],
  resumo: [
    { provider: "groq", model: "qwen/qwen3.8-27b" },
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "openai", model: "gpt-4o-mini" },
  ],
  classificacao: [
    { provider: "groq", model: "qwen/qwen3.8-27b" },
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "openai", model: "gpt-4o-mini" },
  ],
  extracao: [
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "groq", model: "qwen/qwen3.8-27b" },
    { provider: "openai", model: "gpt-4o-mini" },
  ],
  geracao_texto: [
    { provider: "groq", model: "qwen/qwen3.8-27b" },
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "openrouter", model: "meta-llama/llama-3.1-70b-instruct:free" },
  ],
  ocr: [
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "openai", model: "gpt-4o-mini" },
  ],
  codigo: [
    { provider: "gemini", model: "gemini-2.5-pro" },
    { provider: "groq", model: "openai/gpt-oss-120b" },
    { provider: "groq", model: "qwen/qwen3.8-27b" },
    { provider: "deepseek", model: "deepseek-chat" },
    { provider: "anthropic", model: "claude-3-5-sonnet-20241022" },
    { provider: "openai", model: "gpt-4o" },
  ],
  embedding: [
    { provider: "gemini", model: "gemini-embedding-001" },
    { provider: "openai", model: "text-embedding-3-small" },
  ],
  imagem: [
    { provider: "gemini", model: "gemini-2.0-flash-preview-image-generation" },
    { provider: "openrouter", model: "google/gemini-2.5-flash-image-preview:free" },
    { provider: "openai", model: "dall-e-3" },
  ],
  video: [
    { provider: "openrouter", model: "luma/dream-machine" },
  ],
};

// ============================================================
// Motor de Hash e Impressão Digital (Cache & Dedup)
// ============================================================

function canonicalizeFingerprintValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeFingerprintValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalizeFingerprintValue(entry)]),
    );
  }
  return value;
}

function generateFingerprint(req: AIGatewayRequest): string {
  const normPayload = canonicalizeFingerprintValue({
    task: req.task,
    prompt: req.prompt.trim(),
    systemPrompt: req.systemPrompt?.trim() || "",
    messages: req.messages || [],
    promptVersion: req.promptVersion || "v1.0",
    module: req.module || "",
    constraints: {
      maxTokens: req.constraints?.maxTokens ?? 1024,
      temperature: req.constraints?.temperature ?? 0.7,
      responseFormat: req.constraints?.responseFormat || "text",
      minQualityScore: req.constraints?.minQualityScore ?? null,
      maxCostUsd: req.constraints?.maxCostUsd ?? null,
    },
    authContext: {
      userId: req.authContext?.userId || null,
      workspaceId: req.authContext?.workspaceId || null,
      storeId: req.authContext?.storeId || null,
      userRole: req.authContext?.userRole || null,
      plan: req.authContext?.plan || null,
    },
    context: req.context || {},
    images: (req.images || []).map((image) => ({
      mimeType: image.mimeType,
      contentHash: crypto.createHash("sha256").update(image.base64).digest("hex"),
    })),
  });
  return crypto.createHash("sha256").update(JSON.stringify(normPayload)).digest("hex");
}

// ============================================================
// Execução do Provedor de Baixo Nível (Isolada da Porta)
// ============================================================

export function resolveCandidatesWithModelPreference(
  task: AITaskType,
  modelPreference?: string | null,
): RouteCandidate[] {
  const base = CANONICAL_TASK_ROUTES[task] || CANONICAL_TASK_ROUTES.chat;
  const rawPref = typeof modelPreference === "string" ? modelPreference.trim() : "";
  if (!rawPref || task === "embedding" || task === "imagem" || task === "video") {
    return base;
  }

  let provider = "";
  let model = rawPref;
  if (rawPref.includes(":") && !rawPref.endsWith(":free") && rawPref.indexOf(":") < rawPref.indexOf("/")) {
    const [p, ...rest] = rawPref.split(":");
    provider = p.trim().toLowerCase();
    model = rest.join(":").trim();
  } else {
    const lower = rawPref.toLowerCase();
    if (lower.startsWith("claude")) provider = "anthropic";
    else if (/^(gpt-|o1|o3|o4)/.test(lower) && !lower.includes("/")) provider = "openai";
    else if (lower.startsWith("gemini") && !lower.includes("/")) provider = "gemini";
    else if (lower.startsWith("deepseek") && !lower.includes("/")) provider = "deepseek";
    else if (lower.endsWith(":free") || (lower.includes("/") && !lower.startsWith("qwen/") && !lower.startsWith("openai/"))) {
      provider = "openrouter";
    } else if (/^(qwen|llama|mixtral|gemma)/.test(lower)) {
      provider = "groq";
    } else if (lower.includes("/")) {
      provider = "openrouter";
    }
  }

  if (!provider || !model) return base;
  const preferred: RouteCandidate = { provider, model };
  return [preferred, ...base.filter((c) => !(c.provider === preferred.provider && c.model === preferred.model))];
}

function buildConversationTurns(
  prompt: string,
  systemPrompt?: string,
  history?: Array<{ role: "user" | "assistant" | "system"; content: string }>,
): Array<{ role: "user" | "assistant" | "system"; content: string }> {
  const turns: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];
  if (systemPrompt) {
    turns.push({ role: "system", content: systemPrompt });
  }
  if (Array.isArray(history) && history.length > 0) {
    for (const msg of history) {
      if (!msg?.content) continue;
      if (msg.role === "system") continue;
      turns.push({ role: msg.role, content: msg.content });
    }
  }
  if (
    prompt &&
    (turns.length === 0 ||
      turns[turns.length - 1].role !== "user" ||
      turns[turns.length - 1].content.trim() !== prompt.trim())
  ) {
    turns.push({ role: "user", content: prompt });
  }
  return turns;
}

export function buildProviderStreamRequest(params: {
  provider: string;
  model: string;
  rawKey: string;
  turns: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  hardenedSystemPrompt?: string;
  images?: Array<{ mimeType: string; base64: string }>;
  maxTokens?: number;
  temperature?: number;
}): { endpoint: string; headers: Record<string, string>; body: Record<string, any> } {
  const { provider, model, rawKey, turns, hardenedSystemPrompt, images, maxTokens, temperature } = params;
  const nonSystemTurns = turns.filter((m) => m.role !== "system");
  const lastUserIdx = (() => {
    for (let i = nonSystemTurns.length - 1; i >= 0; i--) {
      if (nonSystemTurns[i].role === "user") return i;
    }
    return -1;
  })();

  if (provider === "anthropic") {
    const messages = nonSystemTurns.map((m, idx) => {
      if (idx === lastUserIdx && m.role === "user" && images && images.length > 0) {
        return {
          role: "user" as const,
          content: [
            ...images.map((img) => ({
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: img.mimeType || "image/png",
                data: img.base64.replace(/^data:[^;]+;base64,/, ""),
              },
            })),
            { type: "text" as const, text: m.content },
          ],
        };
      }
      return { role: m.role as "user" | "assistant", content: m.content };
    });
    return {
      endpoint: "https://api.anthropic.com/v1/messages",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": rawKey,
        "anthropic-version": "2023-06-01",
      },
      body: {
        model,
        system: hardenedSystemPrompt,
        messages,
        max_tokens: maxTokens || 1024,
        temperature: temperature ?? 0.7,
        stream: true,
      },
    };
  }

  if (provider === "gemini") {
    const contents = nonSystemTurns.map((m, idx) => {
      const parts: any[] = [];
      if (idx === lastUserIdx && m.role === "user" && images && images.length > 0) {
        for (const img of images) {
          parts.push({
            inline_data: {
              mime_type: img.mimeType || "image/png",
              data: img.base64.replace(/^data:[^;]+;base64,/, ""),
            },
          });
        }
      }
      parts.push({ text: m.content });
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts,
      };
    });
    return {
      endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${rawKey}`,
      headers: { "Content-Type": "application/json" },
      body: {
        contents,
        systemInstruction: { parts: [{ text: hardenedSystemPrompt || "" }] },
        generationConfig: {
          temperature: temperature ?? 0.7,
          maxOutputTokens: maxTokens || 1024,
        },
      },
    };
  }

  const endpoint =
    provider === "groq"
      ? "https://api.groq.com/openai/v1/chat/completions"
      : provider === "openrouter"
        ? "https://openrouter.ai/api/v1/chat/completions"
        : provider === "deepseek"
          ? "https://api.deepseek.com/v1/chat/completions"
          : "https://api.openai.com/v1/chat/completions";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${rawKey}`,
  };
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://waesy.com";
    headers["X-Title"] = "Waesy AI Core";
  }

  const supportsVision = provider === "openai" || provider === "openrouter";
  const lastGlobalUserIdx = (() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      if (turns[i].role === "user") return i;
    }
    return -1;
  })();

  const formattedMessages = turns.map((m, idx) => {
    if (supportsVision && idx === lastGlobalUserIdx && m.role === "user" && images && images.length > 0) {
      return {
        role: "user",
        content: [
          { type: "text", text: m.content },
          ...images.map((img) => ({
            type: "image_url",
            image_url: {
              url: img.base64.startsWith("data:")
                ? img.base64
                : `data:${img.mimeType || "image/png"};base64,${img.base64}`,
            },
          })),
        ],
      };
    }
    return m;
  });

  return {
    endpoint,
    headers,
    body: {
      model,
      messages: formattedMessages,
      temperature: temperature ?? 0.7,
      max_tokens: maxTokens || 1024,
      stream: true,
    },
  };
}

async function callProviderLowLevel(
  provider: string,
  model: string,
  key: string,
  prompt: string,
  systemPrompt?: string,
  options?: {
    task?: AITaskType;
    messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    embeddingTaskType?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: "json_object" | "text";
    images?: Array<{ mimeType: string; base64: string }>;
    timeoutMs?: number;
    signal?: AbortSignal;
    consumeRetrySubrequest?: () => boolean;
  }
): Promise<{ text: string; inputTokens: number; outputTokens: number; rawJson?: any }> {
  const timeout = options?.timeoutMs || (options?.task === "imagem" ? 30000 : 15000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const abortParent = () => controller.abort();
  options?.signal?.addEventListener("abort", abortParent, { once: true });
  if (options?.signal?.aborted) controller.abort();

  try {
    if (options?.task === "embedding") {
      if (provider !== "gemini" && provider !== "openai") {
        throw new Error(`Provedor ${provider} nao suporta embeddings vetoriais.`);
      }
      const emb = await embedSingleWithProvider({
        provider,
        model,
        key,
        prompt,
        taskType: options.embeddingTaskType || "SEMANTIC_SIMILARITY",
        timeoutMs: timeout,
        signal: controller.signal,
      });
      return {
        text: "",
        inputTokens: emb.inputTokens,
        outputTokens: 0,
        rawJson: { embedding: emb.embedding },
      };
    }

    if (options?.task === "imagem") {
      if (provider === "gemini") {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                responseModalities: ["TEXT", "IMAGE"],
              },
            }),
            signal: controller.signal,
          },
        );
        if (!res.ok) {
          throw new Error(`Gemini Image error ${res.status}: ${(await res.text().catch(() => "")).slice(0, 400)}`);
        }
        const json = await res.json();
        const parts: any[] = json?.candidates?.[0]?.content?.parts || [];
        const imgPart = parts.find((p) => p?.inlineData?.data || p?.inline_data?.data);
        const b64 = imgPart?.inlineData?.data || imgPart?.inline_data?.data;
        const mimeType = imgPart?.inlineData?.mimeType || imgPart?.inline_data?.mime_type || "image/png";
        const caption = parts.map((p) => p?.text || "").join(" ").trim();
        if (!b64) {
          throw new Error("Gemini Image retornou resposta sem payload visual.");
        }
        return {
          text: caption,
          inputTokens: json?.usageMetadata?.promptTokenCount || Math.ceil(prompt.length / 4),
          outputTokens: json?.usageMetadata?.candidatesTokenCount || 258,
          rawJson: {
            __media: {
              kind: "image",
              base64: b64,
              mimeType,
              provenance: "provider",
              provider,
            },
          },
        };
      }

      if (provider === "openrouter") {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
            "HTTP-Referer": "https://waesy.com",
            "X-Title": "Waesy AI Core",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          }),
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`OpenRouter Image error ${res.status}: ${(await res.text().catch(() => "")).slice(0, 400)}`);
        }
        const json = await res.json();
        const message = json?.choices?.[0]?.message;
        const firstImageUrl: string | undefined =
          message?.images?.[0]?.image_url?.url ||
          message?.images?.[0]?.url ||
          (typeof message?.content === "string" && message.content.startsWith("data:image/")
            ? message.content.trim()
            : undefined);
        if (!firstImageUrl) {
          throw new Error("OpenRouter Image retornou resposta sem imagem.");
        }
        const isDataUrl = firstImageUrl.startsWith("data:image/");
        const mimeMatch = isDataUrl ? firstImageUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/) : null;
        return {
          text: typeof message?.content === "string" && !isDataUrl ? message.content.trim() : "",
          inputTokens: json?.usage?.prompt_tokens || Math.ceil(prompt.length / 4),
          outputTokens: json?.usage?.completion_tokens || 256,
          rawJson: {
            __media: {
              kind: "image",
              url: isDataUrl ? undefined : firstImageUrl,
              base64: isDataUrl ? firstImageUrl.replace(/^data:[^;]+;base64,/, "") : undefined,
              mimeType: mimeMatch?.[1] || "image/png",
              provenance: "provider",
              provider,
            },
          },
        };
      }
    }

    const openAiCompatibleMessages = buildConversationTurns(prompt, systemPrompt, options?.messages);

    if (provider === "groq") {
      const tryFetchGroq = async (targetModel: string) => {
        return fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: targetModel,
            messages: openAiCompatibleMessages,
            temperature: options?.temperature ?? 0.5,
            max_tokens: options?.maxTokens || 1024,
            ...(options?.responseFormat === "json_object" ? { response_format: { type: "json_object" } } : {}),
          }),
          signal: controller.signal,
        });
      };

      let res = await tryFetchGroq(model);
      if (!res.ok && (res.status === 400 || res.status === 404 || res.status === 429) && model !== "llama-3.3-70b-versatile") {
        const firstErr = await res.text().catch(() => "");
        const lowerErr = firstErr.toLowerCase();
        if (
          (res.status === 429 ||
            lowerErr.includes("model_not_found") ||
            lowerErr.includes("does not exist") ||
            lowerErr.includes("not found") ||
            lowerErr.includes("not supported") ||
            lowerErr.includes("decommissioned") ||
            lowerErr.includes("invalid model") ||
            lowerErr.includes("unknown model") ||
            lowerErr.includes("json_validate_failed")) &&
          (!options?.consumeRetrySubrequest || options.consumeRetrySubrequest())
        ) {
          console.warn(`[Groq] Modelo "${model}" indisponível ou limitado no Groq (${res.status}). Executando failover transparente para "llama-3.3-70b-versatile"...`);
          res = await tryFetchGroq("llama-3.3-70b-versatile");
        } else {
          throw new Error(`Groq error ${res.status}: ${firstErr}`);
        }
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Groq error ${res.status}: ${errText}`);
      }

      const json = await res.json();
      const rawContent = json.choices?.[0]?.message?.content || "";
      const content = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      const inTokens = json.usage?.prompt_tokens || Math.ceil((prompt.length + (systemPrompt?.length || 0)) / 4);
      const outTokens = json.usage?.completion_tokens || Math.ceil(content.length / 4);

      let parsed: any;
      if (options?.responseFormat === "json_object" || content.startsWith("{") || content.startsWith("[")) {
        const cleanJson = content.replace(/```json\s*|\s*```/gi, "").trim();
        try {
          parsed = JSON.parse(cleanJson);
        } catch {
          const match = cleanJson.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          if (match) {
            try { parsed = JSON.parse(match[0]); } catch { /* ignore */ }
          }
        }
      }

      return { text: content, inputTokens: inTokens, outputTokens: outTokens, rawJson: parsed };
    }

    if (provider === "gemini") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const historyContents = Array.isArray(options?.messages) && options.messages.length > 0
        ? options.messages
            .filter((m) => m.role !== "system" && m.content)
            .map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            }))
        : [];
      const currentParts: any[] = [];
      if (options?.images && options.images.length > 0) {
        for (const img of options.images) {
          currentParts.push({
            inline_data: {
              mime_type: img.mimeType,
              data: img.base64.replace(/^data:[^;]+;base64,/, ""),
            },
          });
        }
      }
      currentParts.push({ text: prompt });

      const contents =
        historyContents.length > 0
          ? historyContents.map((entry, idx) =>
              idx === historyContents.length - 1 && entry.role === "user" && currentParts.length > 1
                ? { role: "user", parts: [...currentParts.slice(0, -1), ...entry.parts] }
                : entry,
            )
          : [{ role: "user", parts: currentParts }];

      const bodyPayload: any = {
        contents,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens || 2048,
          ...(options?.responseFormat === "json_object" ? { responseMimeType: "application/json" } : {}),
        },
      };

      if (systemPrompt) {
        bodyPayload.systemInstruction = { parts: [{ text: systemPrompt }] };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Gemini error ${res.status}: ${errText}`);
      }

      const json = await res.json();
      const content = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const inTokens = json.usageMetadata?.promptTokenCount || Math.ceil(prompt.length / 4);
      const outTokens = json.usageMetadata?.candidatesTokenCount || Math.ceil(content.length / 4);

      let parsed: any;
      if (options?.responseFormat === "json_object") {
        try { parsed = JSON.parse(content); } catch { /* ignore */ }
      }

      return { text: content, inputTokens: inTokens, outputTokens: outTokens, rawJson: parsed };
    }

    if (provider === "anthropic") {
      const messages = openAiCompatibleMessages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ model, system: systemPrompt, messages, max_tokens: options?.maxTokens || 1024, temperature: options?.temperature ?? 0.7 }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`anthropic error ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const json = await res.json();
      const content = json.content?.filter((part: any) => part.type === "text").map((part: any) => part.text || "").join("") || "";
      const inTokens = json.usage?.input_tokens || Math.ceil((prompt.length + (systemPrompt?.length || 0)) / 4);
      const outTokens = json.usage?.output_tokens || Math.ceil(content.length / 4);
      let parsed: any;
      if (options?.responseFormat === "json_object") {
        try { parsed = JSON.parse(content); } catch { /* preserve raw text */ }
      }
      return { text: content, inputTokens: inTokens, outputTokens: outTokens, rawJson: parsed };
    }

    if (provider === "deepseek" || provider === "openrouter" || provider === "openai") {
      if (provider === "openai" && (model.startsWith("dall-e") || model.startsWith("gpt-image"))) {
        const res = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model,
            prompt,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json",
          }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`OpenAI Images error ${res.status}: ${(await res.text()).slice(0, 500)}`);
        const json = await res.json();
        const image = json.data?.[0];
        if (!image?.b64_json && !image?.url) throw new Error("OpenAI Images retornou saída sem imagem válida");
        return {
          text: "",
          inputTokens: Math.ceil(prompt.length / 4),
          outputTokens: 0,
          rawJson: {
            __media: {
              kind: "image",
              url: image.url,
              base64: image.b64_json,
              mimeType: "image/png",
              provenance: "provider",
              provider,
              jobId: json.id,
            },
          },
        };
      }

      const endpoint = provider === "openrouter"
        ? "https://openrouter.ai/api/v1/chat/completions"
        : provider === "deepseek"
          ? "https://api.deepseek.com/v1/chat/completions"
          : "https://api.openai.com/v1/chat/completions";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      };
      if (provider === "openrouter") {
        headers["HTTP-Referer"] = "https://waesy.com";
        headers["X-Title"] = "Waesy AI Core";
      }

      const tryOpenAiCompatible = async (targetModel: string) => {
        return fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: targetModel,
            messages: openAiCompatibleMessages,
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens || 1024,
            ...(options?.responseFormat === "json_object" ? { response_format: { type: "json_object" } } : {}),
          }),
          signal: controller.signal,
        });
      };

      let res = await tryOpenAiCompatible(model);
      if (!res.ok && provider === "openrouter" && res.status !== 401 && res.status !== 402 && res.status !== 403) {
        const fallbackOrModels = [
          "meta-llama/llama-3.3-70b-instruct:free",
          "qwen/qwen3-235b-a22b:free",
          "deepseek/deepseek-chat-v3-0324:free",
        ].filter((m) => m !== model);

        for (const altModel of fallbackOrModels) {
          if (options?.consumeRetrySubrequest && !options.consumeRetrySubrequest()) break;
          res = await tryOpenAiCompatible(altModel);
          if (res.ok) break;
        }
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`${provider} error ${res.status}: ${errText}`);
      }

      const json = await res.json();
      const rawContent = json.choices?.[0]?.message?.content || "";
      const content = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      const inTokens = json.usage?.prompt_tokens || Math.ceil(prompt.length / 4);
      const outTokens = json.usage?.completion_tokens || Math.ceil(content.length / 4);

      let parsed: any;
      if (options?.responseFormat === "json_object" || content.startsWith("{") || content.startsWith("[")) {
        const cleanJson = content.replace(/```json\s*|\s*```/gi, "").trim();
        try {
          parsed = JSON.parse(cleanJson);
        } catch {
          const match = cleanJson.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          if (match) {
            try { parsed = JSON.parse(match[0]); } catch { /* ignore */ }
          }
        }
      }

      return { text: content, inputTokens: inTokens, outputTokens: outTokens, rawJson: parsed };
    }

    throw new Error(`Provedor ${provider} não suporta chamada direta síncrona.`);
  } finally {
    clearTimeout(timer);
    options?.signal?.removeEventListener("abort", abortParent);
  }
}

// ============================================================
// A PORTA ÚNICA: executeAiCoreGateway
// ============================================================

async function persistGeneratedMediaToStorage(
  supabase: ReturnType<typeof getServerClient>,
  base64Data: string,
  mimeType: string,
  authContext?: AIGatewayRequest["authContext"],
): Promise<string | undefined> {
  try {
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    if (!buffer || buffer.length === 0) return undefined;
    const ext = mimeType.includes("webp") ? "webp" : mimeType.includes("jpeg") ? "jpg" : "png";
    const ownerFolder = authContext?.storeId || authContext?.userId || "platform";
    const filePath = `copilot/${ownerFolder}/${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;

    for (const bucket of ["copilot-uploads", "store-assets"] as const) {
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, buffer, { contentType: mimeType || "image/png", upsert: false });
      if (!error) {
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(filePath);
        if (pub?.publicUrl) return pub.publicUrl;
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export async function executeAiCoreGateway(request: AIGatewayRequest): Promise<AIGatewayResponse> {
  const startTime = Date.now();
  const callId = `call_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const supabase = getServerClient();

  // 1. Guardas de Segurança: Prompt Shield (Anti-Jailbreak e Injeção)
  const securityCheck = inspectPromptSecurity(request.prompt);
  if (!securityCheck.isSafe) {
    const latency = Date.now() - startTime;
    return {
      success: false,
      result: { text: "" },
      metadata: {
        callId,
        provider: "shield",
        model: "shield-v1",
        fallbackUsed: false,
        attemptsCount: 0,
        latencyMs: latency,
        cacheHit: false,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        costUsd: 0,
        promptVersion: request.promptVersion || "v1.0",
        fingerprint: "",
      },
      error: {
        code: "PROMPT_SHIELD_VIOLATION",
        message: securityCheck.violationReason || "Mensagem bloqueada por regras de segurança e proteção de dados.",
      },
    };
  }

  const { hardenedSystemPrompt, sandboxedUserPrompt } = buildSandboxedPromptPayload(
    securityCheck.sanitizedPrompt || request.prompt,
    request.systemPrompt
  );

  // 2. Impressão Digital e Verificação de Cache
  const fingerprint = generateFingerprint(request);

  if (!request.bypassCache && request.mode !== "stream" && (!request.images || request.images.length === 0)) {
    try {
      const { data: cached } = await supabase
        .from("ai_response_cache")
        .select("response_payload, provider, model, input_tokens, output_tokens")
        .eq("fingerprint_hash", fingerprint)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (cached && cached.response_payload) {
        const latency = Date.now() - startTime;
        Promise.resolve(supabase.rpc("increment_cache_hit", { p_fingerprint: fingerprint })).catch(() => {});

        return {
          success: true,
          result: cached.response_payload,
          metadata: {
            callId,
            provider: cached.provider,
            model: cached.model,
            fallbackUsed: false,
            attemptsCount: 0,
            latencyMs: latency,
            cacheHit: true,
            usage: {
              inputTokens: cached.input_tokens,
              outputTokens: cached.output_tokens,
              totalTokens: cached.input_tokens + cached.output_tokens,
            },
            costUsd: 0.0,
            promptVersion: request.promptVersion || "v1.0",
            fingerprint,
          },
        };
      }
    } catch {
      // Cache miss ou indisponível
    }
  }

  // 3. In-Flight Promise Deduplication (intra-requisição apenas)
  const inFlightRequests = getRequestScopedInflightMap<AIGatewayResponse>("ai-core-gateway");
  if (inFlightRequests?.has(fingerprint)) {
    try {
      const sharedRes = await inFlightRequests.get(fingerprint)!;
      return {
        ...sharedRes,
        metadata: {
          ...sharedRes.metadata,
          callId,
          cacheHit: true,
          latencyMs: Date.now() - startTime,
        },
      };
    } catch {
      // Continua normalmente se a promise falhou
    }
  }

  // 4. Modo Fila Assíncrona para Tarefas Pesadas (Imagem, Vídeo, Docs Gigantes)
  if (request.mode === "async_queue" || request.task === "video") {
    try {
      const { data: job, error: jobErr } = await supabase
        .from("ai_async_jobs")
        .insert({
          task: request.task,
          user_id: request.authContext?.userId || null,
          workspace_id: request.authContext?.workspaceId || null,
          store_id: request.authContext?.storeId || null,
          status: "queued",
          payload: {
            prompt: sandboxedUserPrompt,
            systemPrompt: hardenedSystemPrompt,
            constraints: request.constraints,
          },
        })
        .select("id")
        .single();

      if (jobErr) throw jobErr;

      return {
        success: true,
        result: {
          text: "Solicitação registrada com sucesso. Estamos preparando seu conteúdo.",
          asyncJobId: job.id,
        },
        metadata: {
          callId,
          provider: "async_queue",
          model: "worker-queue",
          fallbackUsed: false,
          attemptsCount: 1,
          latencyMs: Date.now() - startTime,
          cacheHit: false,
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          costUsd: 0,
          promptVersion: request.promptVersion || "v1.0",
          fingerprint,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        result: { text: "" },
        metadata: {
          callId,
          provider: "async_queue",
          model: "worker-queue",
          fallbackUsed: false,
          attemptsCount: 1,
          latencyMs: Date.now() - startTime,
          cacheHit: false,
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          costUsd: 0,
          promptVersion: request.promptVersion || "v1.0",
          fingerprint,
        },
        error: { code: "QUEUE_ERROR", message: err.message },
      };
    }
  }

  // 5. Roteamento por Tarefa e Seleção da Cascata
  const candidates: RouteCandidate[] = resolveCandidatesWithModelPreference(
    request.task,
    request.context?.modelPreference,
  );

  const executionPromise = (async (): Promise<AIGatewayResponse> => {
    let lastError: any = null;
    let attempts = 0;
    let fallbackUsed = false;
    let fallbackFrom: string | undefined;
    let externalHttpSubrequests = 0;
    let errorReportSubrequests = 0;
    const consumeExternalHttpSubrequest = (): boolean => {
      if (externalHttpSubrequests >= MAX_GATEWAY_EXTERNAL_HTTP_SUBREQUESTS) {
        return false;
      }
      externalHttpSubrequests++;
      return true;
    };

    const targetOwnerId = request.authContext?.userId || request.authContext?.storeId;
    const activeCandidateProviders = Array.from(
      new Set(
        candidates
          .filter((c) => getCircuit(c.provider).state !== "open")
          .map((c) => c.provider),
      ),
    );
    const preloadedKeysMap = await safeLoadBatchKeys(
      activeCandidateProviders,
      targetOwnerId,
      request.authContext?.storeId,
    );

    for (let i = 0; i < candidates.length; i++) {
      if (externalHttpSubrequests >= MAX_GATEWAY_EXTERNAL_HTTP_SUBREQUESTS) {
        lastError =
          lastError ||
          new Error("Orçamento de subrequests externos do gateway atingido nesta invocação.");
        break;
      }

      const candidate = candidates[i];
      attempts++;

      // 5.1 Verificar Circuit Breaker do Provedor
      const cb = getCircuit(candidate.provider);
      if (cb.state === "open") {
        console.warn(`[AI-CORE-GATEWAY] Provedor ${candidate.provider} ignorado: Circuito Aberto.`);
        if (!fallbackFrom) fallbackFrom = candidate.provider;
        fallbackUsed = true;
        continue;
      }

      // 5.2 Obter todas as chaves ativas do Provedor a partir do lote pré-carregado (ou fallback legado)
      let providerKeys: Array<{ id: string; rawKey: string; label?: string }> = [];
      try {
        if (preloadedKeysMap && Array.isArray(preloadedKeysMap[candidate.provider])) {
          providerKeys = preloadedKeysMap[candidate.provider];
        } else {
          providerKeys = await safeLoadProviderKeys(
            candidate.provider,
            targetOwnerId,
            request.authContext?.storeId,
          );
        }
      } catch (keyErr) {
        console.warn(`[AI-CORE-GATEWAY] Pool sem chave para ${candidate.provider}:`, keyErr);
      }

      if (providerKeys.length === 0) {
        console.warn(`[AI-CORE-GATEWAY] Nenhuma chave disponível no pool para ${candidate.provider}`);
        if (!fallbackFrom) fallbackFrom = candidate.provider;
        fallbackUsed = true;
        continue;
      }

      let providerLastError: any = null;

      for (let kIdx = 0; kIdx < providerKeys.length; kIdx++) {
        if (!consumeExternalHttpSubrequest()) {
          break;
        }

        const activeKey = providerKeys[kIdx];
        if (kIdx > 0) {
          attempts++;
          fallbackUsed = true;
        }

        try {
          const response = await callProviderLowLevel(
            candidate.provider,
            candidate.model,
            activeKey.rawKey,
            sandboxedUserPrompt,
            hardenedSystemPrompt,
            {
              task: request.task,
              messages: request.messages,
              embeddingTaskType: request.context?.embeddingTaskType,
              temperature: request.constraints?.temperature,
              maxTokens: request.constraints?.maxTokens,
              responseFormat: request.constraints?.responseFormat,
              images: request.images,
              timeoutMs: request.constraints?.timeoutMs,
              signal: request.signal,
              consumeRetrySubrequest: consumeExternalHttpSubrequest,
            }
          );

          recordCircuitSuccess(candidate.provider);
          safeRecordKeyUsage(activeKey.id);

          const sanitizedText = sanitizeAiOutput(response.text);
          const costUsd = calculateCost(candidate.provider, candidate.model, response.inputTokens, response.outputTokens);
          const latencyMs = Date.now() - startTime;

          const providerMedia = response.rawJson?.__media ? { ...response.rawJson.__media } : undefined;
          if (providerMedia?.kind === "image" && providerMedia.base64 && !providerMedia.url) {
            const uploadedUrl = await persistGeneratedMediaToStorage(
              supabase,
              providerMedia.base64,
              providerMedia.mimeType || "image/png",
              request.authContext,
            );
            if (uploadedUrl) {
              providerMedia.url = uploadedUrl;
            }
          }
          const gatewayResult: AIGatewayResponse = {
            success: true,
            result: {
              text: sanitizedText,
              parsedJson: providerMedia ? undefined : response.rawJson,
              ...(providerMedia ? { media: providerMedia } : {}),
            },
            metadata: {
              callId,
              provider: candidate.provider,
              model: candidate.model,
              fallbackUsed,
              fallbackFrom,
              attemptsCount: attempts,
              latencyMs,
              cacheHit: false,
              usage: {
                inputTokens: response.inputTokens,
                outputTokens: response.outputTokens,
                totalTokens: response.inputTokens + response.outputTokens,
              },
              costUsd,
              promptVersion: request.promptVersion || "v1.0",
              fingerprint,
            },
          };

          if (!request.bypassCache && request.task !== "imagem" && (!request.images || request.images.length === 0)) {
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            Promise.resolve(
              supabase
                .from("ai_response_cache")
                .upsert({
                  fingerprint_hash: fingerprint,
                  task: request.task,
                  provider: candidate.provider,
                  model: candidate.model,
                  response_payload: gatewayResult.result,
                  input_tokens: response.inputTokens,
                  output_tokens: response.outputTokens,
                  expires_at: expiresAt,
                  updated_at: new Date().toISOString(),
                })
            ).catch(() => {});
          }

          Promise.resolve(
            supabase
              .from("ai_telemetry_logs")
              .insert({
                call_id: callId,
                task: request.task,
                module: request.module || "core_gateway",
                user_id: request.authContext?.userId || null,
                workspace_id: request.authContext?.workspaceId || null,
                store_id: request.authContext?.storeId || null,
                provider: candidate.provider,
                model: candidate.model,
                prompt_version: request.promptVersion || "v1.0",
                input_tokens: response.inputTokens,
                output_tokens: response.outputTokens,
                total_tokens: response.inputTokens + response.outputTokens,
                cost_usd: costUsd,
                latency_ms: latencyMs,
                attempts_count: attempts,
                fallback_used: fallbackUsed,
                fallback_from: fallbackFrom || null,
                status: fallbackUsed ? "fallback_recovered" : "success",
                request_fingerprint: fingerprint,
                cache_hit: false,
              })
          ).catch((telemetryErr: any) => {
            logOperationalEvent("error", "ai_telemetry_persist_failed", {
              requestId: callId,
              tenantId: request.authContext?.storeId,
              provider: candidate.provider,
            }, { error: telemetryErr instanceof Error ? telemetryErr.message : "unknown" });
          });

          return gatewayResult;
        } catch (err: any) {
          lastError = err;
          providerLastError = err;
          logOperationalEvent("error", "ai_provider_key_failed", {
            requestId: callId,
            tenantId: request.authContext?.storeId,
            provider: candidate.provider,
          }, {
            keyId: activeKey.id,
            keyAttempt: kIdx + 1,
            totalProviderKeys: providerKeys.length,
            error: err instanceof Error ? err.message : String(err),
          });

          const errMessage = err instanceof Error ? err.message : String(err);
          const statusMatch = errMessage.match(/\b(401|402|403|429|500|502|503|504)\b/);
          const parsedStatus = (err as any)?.status ?? (statusMatch ? Number(statusMatch[1]) : undefined);
          if (errorReportSubrequests < MAX_GATEWAY_ERROR_REPORT_SUBREQUESTS) {
            errorReportSubrequests++;
            safeMarkKeyError(activeKey.id, errMessage, parsedStatus);
          }
        }
      }

      // Todas as chaves pré-carregadas para o provedor falharam; aciona Circuit Breaker sem subrequests extras
      if (providerLastError) {
        recordCircuitFailure(candidate.provider, providerLastError.message);
        if (!fallbackFrom) fallbackFrom = candidate.provider;
        fallbackUsed = true;
      }
    }

    const latencyMs = Date.now() - startTime;
    const failedResult: AIGatewayResponse = {
      success: false,
      result: { text: "" },
      metadata: {
        callId,
        provider: "none",
        model: "none",
        fallbackUsed: true,
        fallbackFrom,
        attemptsCount: attempts,
        latencyMs,
        cacheHit: false,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        costUsd: 0,
        promptVersion: request.promptVersion || "v1.0",
        fingerprint,
      },
      error: {
        code: "PROVIDER_UNAVAILABLE",
        message: `Tivemos uma oscilação temporária em nossos serviços de consulta. Já estamos tentando novamente para você. Detalhe: ${lastError?.message || "Instabilidade temporária"}`,
      },
    };

    Promise.resolve(
      supabase
        .from("ai_telemetry_logs")
        .insert({
          call_id: callId,
          task: request.task,
          module: request.module || "core_gateway",
          user_id: request.authContext?.userId || null,
          workspace_id: request.authContext?.workspaceId || null,
          store_id: request.authContext?.storeId || null,
          provider: "none",
          model: "none",
          prompt_version: request.promptVersion || "v1.0",
          status: "error",
          error_code: "PROVIDER_UNAVAILABLE",
          error_message: lastError?.message || "Todos os provedores falharam",
          latency_ms: latencyMs,
          attempts_count: attempts,
          fallback_used: true,
          request_fingerprint: fingerprint,
        })
    ).catch(() => {});

    return failedResult;
  })();

  inFlightRequests?.set(fingerprint, executionPromise);
  try {
    return await executionPromise;
  } finally {
    inFlightRequests?.delete(fingerprint);
  }
}

// ============================================================
// Server Functions da Porta Única para Consumo Seguro
// ============================================================

export const callAiCoreGateway = createServerFn({ method: "POST" })
  .validator(
    z.object({
      task: aiTaskTypeEnum,
      prompt: z.string().min(1, "A mensagem ou solicitação é obrigatória"),
      systemPrompt: z.string().optional(),
      mode: z.enum(["sync", "stream", "async_queue"]).optional().default("sync"),
      constraints: z
        .object({
          maxTokens: z.number().optional(),
          temperature: z.number().optional(),
          responseFormat: z.enum(["json_object", "text"]).optional(),
          timeoutMs: z.number().optional(),
        })
        .optional(),
      module: z.string().optional(),
      promptVersion: z.string().optional(),
      bypassCache: z.boolean().optional(),
    })
  )
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity().catch(() => null);

    return executeAiCoreGateway({
      task: input.task,
      mode: input.mode,
      prompt: input.prompt,
      systemPrompt: input.systemPrompt,
      constraints: input.constraints,
      module: input.module,
      promptVersion: input.promptVersion,
      bypassCache: input.bypassCache,
      authContext: {
        userId: identity?.id ?? undefined,
        storeId: identity?.store_id ?? undefined,
        userRole: identity?.role ?? undefined,
      },
    });
  });

// ============================================================
// Painel FinOps & Telemetria Analítica (Prompt 02 - Fase E)
// ============================================================

export interface AiTelemetryMetrics {
  totalCalls: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  fallbackRate: number;
  errorRate: number;
  costByModule: Record<string, number>;
  callsByTask: Record<string, number>;
}

export const getAiTelemetryMetrics = createServerFn({ method: "GET" }).handler(
  async (): Promise<AiTelemetryMetrics> => {
    await requireAdmin();
    const supabase = getServerClient();

    const { data: logs, error } = await supabase
      .from("ai_telemetry_logs")
      .select("task, module, cost_usd, latency_ms, fallback_used, status")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error || !logs || logs.length === 0) {
      return {
        totalCalls: 0,
        totalCostUsd: 0,
        avgLatencyMs: 0,
        p95LatencyMs: 0,
        fallbackRate: 0,
        errorRate: 0,
        costByModule: {},
        callsByTask: {},
      };
    }

    let totalCost = 0;
    let totalLatency = 0;
    let fallbackCount = 0;
    let errorCount = 0;
    const latencies: number[] = [];
    const costByModule: Record<string, number> = {};
    const callsByTask: Record<string, number> = {};

    for (const log of logs) {
      const cost = Number(log.cost_usd || 0);
      const latency = Number(log.latency_ms || 0);
      totalCost += cost;
      totalLatency += latency;
      latencies.push(latency);

      if (log.fallback_used) fallbackCount++;
      if (log.status === "error") errorCount++;

      const mod = log.module || "unknown";
      costByModule[mod] = (costByModule[mod] || 0) + cost;

      const tsk = log.task || "unknown";
      callsByTask[tsk] = (callsByTask[tsk] || 0) + 1;
    }

    latencies.sort((a, b) => a - b);
    const p95Idx = Math.floor(latencies.length * 0.95);
    const p95Latency = latencies[p95Idx] || 0;

    return {
      totalCalls: logs.length,
      totalCostUsd: Number(totalCost.toFixed(4)),
      avgLatencyMs: Math.round(totalLatency / logs.length),
      p95LatencyMs: p95Latency,
      fallbackRate: Number(((fallbackCount / logs.length) * 100).toFixed(2)),
      errorRate: Number(((errorCount / logs.length) * 100).toFixed(2)),
      costByModule,
      callsByTask,
    };
  }
);

export async function generateBatchEmbeddingsWithGateway(params: {
  texts: string[];
  taskType?: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" | "SEMANTIC_SIMILARITY";
  authContext?: AIGatewayRequest["authContext"];
}): Promise<{ embeddings: Array<number[] | null>; provider: string; model: string }> {
  const res = await generateBatchEmbeddings({
    texts: params.texts,
    taskType: params.taskType,
    authContext: params.authContext
      ? { userId: params.authContext.userId, storeId: params.authContext.storeId }
      : undefined,
  });
  if (res.provider === "gemini" && res.embeddings.some((e) => Array.isArray(e))) {
    recordCircuitSuccess("gemini");
  }
  return res;
}

/** Streaming nativo para SSE; usa o pool e a cascata do gateway canonico. */
export async function executeAiCoreGatewayStream(
  request: AIGatewayRequest,
  onDelta: (text: string) => void,
): Promise<Pick<AIGatewayResponse, "success" | "metadata" | "error"> & { text: string }> {
  const callId = `stream_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const start = Date.now();
  const security = inspectPromptSecurity(request.prompt);
  const estInputTokens = Math.ceil(
    ((request.systemPrompt?.length || 0) +
      request.prompt.length +
      (request.messages || []).reduce((acc, m) => acc + (m.content?.length || 0), 0)) / 4,
  );
  const baseMeta = (provider: string, model: string, attemptsCount: number, outputText = "") => {
    const outTokens = Math.ceil(outputText.length / 4);
    return {
      callId,
      provider,
      model,
      fallbackUsed: attemptsCount > 1,
      attemptsCount,
      latencyMs: Date.now() - start,
      cacheHit: false,
      usage: { inputTokens: estInputTokens, outputTokens: outTokens, totalTokens: estInputTokens + outTokens },
      costUsd: calculateCost(provider, model, estInputTokens, outTokens),
      promptVersion: request.promptVersion || "v1.0",
      fingerprint: generateFingerprint(request),
    };
  };
  if (!security.isSafe) {
    return {
      success: false,
      text: "",
      metadata: baseMeta("shield", "shield-v1", 0),
      error: { code: "PROMPT_SHIELD_VIOLATION", message: security.violationReason || "Mensagem bloqueada por regras de segurança e proteção de dados." },
    };
  }
  const { hardenedSystemPrompt, sandboxedUserPrompt } = buildSandboxedPromptPayload(security.sanitizedPrompt || request.prompt, request.systemPrompt);
  const candidates: RouteCandidate[] = resolveCandidatesWithModelPreference(
    request.task,
    request.context?.modelPreference,
  );
  const targetOwnerId = request.authContext?.userId || request.authContext?.storeId;
  const candidateProviders = Array.from(new Set(candidates.map((c) => c.provider)));
  const preloadedKeysMap = await safeLoadBatchKeys(
    candidateProviders,
    targetOwnerId,
    request.authContext?.storeId,
  );
  const turns = buildConversationTurns(sandboxedUserPrompt, hardenedSystemPrompt, request.messages);

  let attempts = 0;
  let lastError = "Instabilidade temporária nos serviços de transmissão";
  for (const candidate of candidates) {
    if (request.signal?.aborted) break;
    if (attempts >= MAX_GATEWAY_EXTERNAL_HTTP_SUBREQUESTS) break;
    if (getCircuit(candidate.provider).state === "open") continue;

    const batchKeys = preloadedKeysMap?.[candidate.provider];
    const providerKeys =
      Array.isArray(batchKeys) && batchKeys.length > 0
        ? batchKeys
        : preloadedKeysMap
          ? []
          : await safeLoadProviderKeys(candidate.provider, targetOwnerId, request.authContext?.storeId);
    if (providerKeys.length === 0) continue;

    for (const activeKey of providerKeys) {
      if (request.signal?.aborted) break;
      if (attempts >= MAX_GATEWAY_EXTERNAL_HTTP_SUBREQUESTS) break;
      if (!activeKey?.rawKey) continue;
      attempts++;

      try {
        const streamReq = buildProviderStreamRequest({
          provider: candidate.provider,
          model: candidate.model,
          rawKey: activeKey.rawKey,
          turns,
          hardenedSystemPrompt,
          images: request.images,
          maxTokens: request.constraints?.maxTokens,
          temperature: request.constraints?.temperature,
        });
        const response = await fetch(streamReq.endpoint, {
          method: "POST",
          headers: streamReq.headers,
          body: JSON.stringify(streamReq.body),
          signal: request.signal,
        });
        if (!response.ok || !response.body) {
          const errStatus = response.status;
          const errText = await response.text().catch(() => "");
          if (errStatus === 401 || errStatus === 402 || errStatus === 403 || errStatus === 429) {
            safeMarkKeyError(activeKey.id, `${candidate.provider} HTTP ${errStatus}`, errStatus);
          }
          throw new Error(`${candidate.provider} HTTP ${errStatus}${errText ? `: ${errText.slice(0, 120)}` : ""}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulatedText = "";
        while (true) {
          if (request.signal?.aborted) break;
          const chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          const frames = buffer.split(/\n\n|\r\n\r\n/);
          buffer = frames.pop() || "";
          for (const frame of frames) {
            const data = frame.split(/\r?\n/).find((line) => line.startsWith("data:"))?.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              const delta = candidate.provider === "anthropic" ? (json.type === "content_block_delta" ? json.delta?.text : "") : candidate.provider === "gemini" ? (json.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("") || "") : (json.choices?.[0]?.delta?.content || "");
              if (delta) {
                const safeDelta = sanitizeAiOutput(delta);
                accumulatedText += safeDelta;
                onDelta(safeDelta);
              }
            } catch { /* heartbeat ou frame parcial */ }
          }
        }
        recordCircuitSuccess(candidate.provider);
        safeRecordKeyUsage(activeKey.id);
        return { success: true, text: accumulatedText, metadata: baseMeta(candidate.provider, candidate.model, attempts, accumulatedText) };
      } catch (error) {
        if (request.signal?.aborted) {
          return {
            success: false,
            text: "",
            metadata: baseMeta(candidate.provider, candidate.model, attempts),
            error: { code: "ABORTED", message: "Execucao cancelada pelo usuario." },
          };
        }
        lastError = error instanceof Error ? error.message : String(error);
        recordCircuitFailure(candidate.provider);
      }
    }
  }
  return { success: false, text: "", metadata: baseMeta("none", "none", attempts), error: { code: "AI_STREAM_FAILED", message: lastError } };
}
