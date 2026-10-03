import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as crypto from "crypto";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, requireAdmin } from "@/lib/server-access";
import { inspectPromptSecurity, buildSandboxedPromptPayload, sanitizeAiOutput } from "@/lib/prompt-shield";
import { getNextActiveKey, markKeyError } from "./api-orchestrator.functions";

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
}

export interface AIGatewayResponse {
  success: boolean;
  result: {
    text: string;
    parsedJson?: any;
    asyncJobId?: string;
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
  "groq:llama-3.3-70b-versatile": { inPer1M: 0.59, outPer1M: 0.79 },
  "groq:llama-3.1-8b-instant": { inPer1M: 0.05, outPer1M: 0.08 },
  "gemini:gemini-2.5-flash": { inPer1M: 0.075, outPer1M: 0.30 },
  "gemini:gemini-2.5-pro": { inPer1M: 1.25, outPer1M: 5.00 },
  "gemini:text-embedding-004": { inPer1M: 0.02, outPer1M: 0.00 },
  "openai:gpt-4o-mini": { inPer1M: 0.15, outPer1M: 0.60 },
  "openai:gpt-4o": { inPer1M: 2.50, outPer1M: 10.00 },
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

// In-Flight Promise Dedup Map
const inFlightRequests = new Map<string, Promise<AIGatewayResponse>>();

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

export function recordCircuitFailure(provider: string) {
  const cb = getCircuit(provider);
  cb.consecutiveFailures += 1;
  if (cb.consecutiveFailures >= 3 || cb.state === "half_open") {
    cb.state = "open";
    cb.openUntil = Date.now() + 60_000; // 60 segundos aberto
    console.warn(`[AI-CORE-GATEWAY] Circuit Breaker OPEN para o provedor ${provider} até ${new Date(cb.openUntil).toISOString()}`);
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
    { provider: "groq", model: "llama-3.3-70b-versatile" },
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "openrouter", model: "google/gemma-2-9b-it:free" },
  ],
  resumo: [
    { provider: "groq", model: "llama-3.1-8b-instant" },
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "openai", model: "gpt-4o-mini" },
  ],
  classificacao: [
    { provider: "groq", model: "llama-3.1-8b-instant" },
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "openai", model: "gpt-4o-mini" },
  ],
  extracao: [
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "groq", model: "llama-3.3-70b-versatile" },
    { provider: "openai", model: "gpt-4o-mini" },
  ],
  geracao_texto: [
    { provider: "groq", model: "llama-3.3-70b-versatile" },
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "openrouter", model: "meta-llama/llama-3.1-70b-instruct:free" },
  ],
  ocr: [
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "openai", model: "gpt-4o-mini" },
  ],
  codigo: [
    { provider: "gemini", model: "gemini-2.5-pro" },
    { provider: "groq", model: "llama-3.3-70b-versatile" },
    { provider: "openai", model: "gpt-4o" },
  ],
  embedding: [
    { provider: "gemini", model: "text-embedding-004" },
    { provider: "openai", model: "text-embedding-3-small" },
  ],
  imagem: [
    { provider: "openai", model: "dall-e-3" },
    { provider: "openrouter", model: "recraft-ai/recraft-v3" },
  ],
  video: [
    { provider: "openrouter", model: "luma/dream-machine" },
  ],
};

// ============================================================
// Motor de Hash e Impressão Digital (Cache & Dedup)
// ============================================================

function generateFingerprint(req: AIGatewayRequest): string {
  const normPayload = {
    task: req.task,
    prompt: req.prompt.trim(),
    systemPrompt: req.systemPrompt?.trim() || "",
    format: req.constraints?.responseFormat || "text",
    temperature: req.constraints?.temperature ?? 0.7,
    imagesCount: req.images?.length || 0,
  };
  return crypto.createHash("sha256").update(JSON.stringify(normPayload)).digest("hex");
}

// ============================================================
// Execução do Provedor de Baixo Nível (Isolada da Porta)
// ============================================================

async function callProviderLowLevel(
  provider: string,
  model: string,
  key: string,
  prompt: string,
  systemPrompt?: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: "json_object" | "text";
    images?: Array<{ mimeType: string; base64: string }>;
    timeoutMs?: number;
  }
): Promise<{ text: string; inputTokens: number; outputTokens: number; rawJson?: any }> {
  const timeout = options?.timeoutMs || 15000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    if (provider === "groq") {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
            { role: "user", content: prompt },
          ],
          temperature: options?.temperature ?? 0.5,
          max_tokens: options?.maxTokens || 1024,
          ...(options?.responseFormat === "json_object" ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Groq error ${res.status}: ${errText}`);
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content || "";
      const inTokens = json.usage?.prompt_tokens || Math.ceil((prompt.length + (systemPrompt?.length || 0)) / 4);
      const outTokens = json.usage?.completion_tokens || Math.ceil(content.length / 4);

      let parsed: any;
      if (options?.responseFormat === "json_object") {
        try { parsed = JSON.parse(content); } catch { /* ignore */ }
      }

      return { text: content, inputTokens: inTokens, outputTokens: outTokens, rawJson: parsed };
    }

    if (provider === "gemini") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const contentsParts: any[] = [];
      if (options?.images && options.images.length > 0) {
        for (const img of options.images) {
          contentsParts.push({
            inline_data: {
              mime_type: img.mimeType,
              data: img.base64.replace(/^data:[^;]+;base64,/, ""),
            },
          });
        }
      }
      contentsParts.push({ text: prompt });

      const bodyPayload: any = {
        contents: [{ role: "user", parts: contentsParts }],
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

    if (provider === "openrouter" || provider === "openai") {
      const endpoint = provider === "openrouter"
        ? "https://openrouter.ai/api/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      };
      if (provider === "openrouter") {
        headers["HTTP-Referer"] = "https://waesy.com";
        headers["X-Title"] = "Waesy AI Core";
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [
            ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
            { role: "user", content: prompt },
          ],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens || 1024,
          ...(options?.responseFormat === "json_object" ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`${provider} error ${res.status}: ${errText}`);
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content || "";
      const inTokens = json.usage?.prompt_tokens || Math.ceil(prompt.length / 4);
      const outTokens = json.usage?.completion_tokens || Math.ceil(content.length / 4);

      let parsed: any;
      if (options?.responseFormat === "json_object") {
        try { parsed = JSON.parse(content); } catch { /* ignore */ }
      }

      return { text: content, inputTokens: inTokens, outputTokens: outTokens, rawJson: parsed };
    }

    throw new Error(`Provedor ${provider} não suporta chamada direta síncrona.`);
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================
// A PORTA ÚNICA: executeAiCoreGateway
// ============================================================

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
        message: securityCheck.violationReason || "Prompt bloqueado por violação de segurança e conformidade.",
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

  // 3. In-Flight Promise Deduplication (Chamadas idênticas simultâneas)
  if (inFlightRequests.has(fingerprint)) {
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
          text: "Job enfileirado com sucesso.",
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
  const candidates: RouteCandidate[] = CANONICAL_TASK_ROUTES[request.task] || CANONICAL_TASK_ROUTES.chat;

  const executionPromise = (async (): Promise<AIGatewayResponse> => {
    let lastError: any = null;
    let attempts = 0;
    let fallbackUsed = false;
    let fallbackFrom: string | undefined;

    for (let i = 0; i < candidates.length; i++) {
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

      // 5.2 Obter Chave Ativa do Pool (sem expor chave ao cliente)
      let activeKey: { id: string; rawKey: string } | null = null;
      try {
        activeKey = await getNextActiveKey(candidate.provider as any);
      } catch (keyErr) {
        console.warn(`[AI-CORE-GATEWAY] Pool sem chave para ${candidate.provider}:`, keyErr);
      }

      if (!activeKey || !activeKey.rawKey) {
        console.warn(`[AI-CORE-GATEWAY] Nenhuma chave disponível no pool para ${candidate.provider}`);
        if (!fallbackFrom) fallbackFrom = candidate.provider;
        fallbackUsed = true;
        continue;
      }

      try {
        const response = await callProviderLowLevel(
          candidate.provider,
          candidate.model,
          activeKey.rawKey,
          sandboxedUserPrompt,
          hardenedSystemPrompt,
          {
            temperature: request.constraints?.temperature,
            maxTokens: request.constraints?.maxTokens,
            responseFormat: request.constraints?.responseFormat,
            images: request.images,
            timeoutMs: request.constraints?.timeoutMs,
          }
        );

        recordCircuitSuccess(candidate.provider);

        const sanitizedText = sanitizeAiOutput(response.text);
        const costUsd = calculateCost(candidate.provider, candidate.model, response.inputTokens, response.outputTokens);
        const latencyMs = Date.now() - startTime;

        const gatewayResult: AIGatewayResponse = {
          success: true,
          result: {
            text: sanitizedText,
            parsedJson: response.rawJson,
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

        if (!request.bypassCache && (!request.images || request.images.length === 0)) {
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
          console.error("[AI-CORE-GATEWAY] Erro ao gravar telemetria:", telemetryErr);
        });

        return gatewayResult;
      } catch (err: any) {
        lastError = err;
        console.error(`[AI-CORE-GATEWAY] Provedor ${candidate.provider} falhou:`, err.message);

        recordCircuitFailure(candidate.provider);
        markKeyError(activeKey.id, err.message).catch(() => {});

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
        message: `Todos os provedores da cascata falharam para a tarefa '${request.task}'. Detalhe: ${lastError?.message || "Erro desconhecido"}`,
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

  inFlightRequests.set(fingerprint, executionPromise);
  try {
    return await executionPromise;
  } finally {
    inFlightRequests.delete(fingerprint);
  }
}

// ============================================================
// Server Functions da Porta Única para Consumo Seguro
// ============================================================

export const callAiCoreGateway = createServerFn({ method: "POST" })
  .validator(
    z.object({
      task: aiTaskTypeEnum,
      prompt: z.string().min(1, "O prompt é obrigatório"),
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
