/**
 * ai-embedding-client.ts — Cliente puro de embeddings vetoriais (1536d L2).
 * Isolado de `ai-core-gateway.functions.ts` para evitar ciclos e preservar
 * fronteiras de mock/orquestração em RAG e Memória Semântica.
 */

import * as apiOrchestrator from "./api-orchestrator.functions";

export const EMBEDDING_DIMENSIONS = 1536;
export const MAX_EMBEDDING_HTTP_SUBREQUESTS = 8;

export type EmbeddingTaskType =
  | "RETRIEVAL_DOCUMENT"
  | "RETRIEVAL_QUERY"
  | "SEMANTIC_SIMILARITY";

export function l2NormalizeEmbedding(values: number[]): number[] {
  if (!Array.isArray(values) || values.length === 0) return [];
  let sumSq = 0;
  for (let i = 0; i < values.length; i++) {
    const v = Number(values[i] || 0);
    sumSq += v * v;
  }
  const norm = Math.sqrt(sumSq);
  if (!Number.isFinite(norm) || norm <= 0) return values.map(() => 0);
  return values.map((v) => Number((Number(v || 0) / norm).toFixed(8)));
}

async function safeLoadEmbeddingKeys(
  provider: "gemini" | "openai",
  ownerId?: string,
  storeId?: string,
): Promise<Array<{ id: string; rawKey: string; label?: string }>> {
  try {
    const getAllFn = apiOrchestrator.getAllActiveKeysForProvider;
    if (typeof getAllFn === "function") {
      const allKeys = await getAllFn(provider, ownerId, storeId);
      if (Array.isArray(allKeys) && allKeys.length > 0) return allKeys;
    }
  } catch {
    // Fallback para mocks parciais sem getAllActiveKeysForProvider
  }
  try {
    const getNextFn = apiOrchestrator.getNextActiveKey;
    if (typeof getNextFn === "function") {
      const single = await getNextFn(provider, ownerId);
      return single && single.rawKey ? [single] : [];
    }
  } catch {
    // Sem provedor configurado ou mock parcial
  }
  return [];
}

export function safeRecordKeyUsage(keyId: string): void {
  try {
    const fn = apiOrchestrator.recordKeyUsage;
    if (typeof fn === "function") {
      fn(keyId).catch(() => {});
    }
  } catch {
    // Ignorar em mocks parciais
  }
}

export function safeMarkKeyError(
  keyId: string,
  errMessage: string,
  status?: number,
): void {
  try {
    const fn = apiOrchestrator.markKeyError;
    if (typeof fn === "function") {
      fn(keyId, errMessage, status).catch(() => {});
    }
  } catch {
    // Ignorar em mocks parciais
  }
}

export async function embedSingleWithProvider(params: {
  provider: "gemini" | "openai";
  model?: string;
  key: string;
  prompt: string;
  taskType?: EmbeddingTaskType | string;
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<{ embedding: number[]; inputTokens: number }> {
  const timeout = params.timeoutMs || 15000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const abortParent = () => controller.abort();
  params.signal?.addEventListener("abort", abortParent, { once: true });
  if (params.signal?.aborted) controller.abort();

  try {
    if (params.provider === "gemini") {
      const model = params.model || "gemini-embedding-001";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${params.key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: { parts: [{ text: params.prompt }] },
            taskType: params.taskType || "SEMANTIC_SIMILARITY",
            outputDimensionality: EMBEDDING_DIMENSIONS,
          }),
          signal: controller.signal,
        },
      );
      if (!res.ok) {
        const body = (await res.text().catch(() => "")).slice(0, 300);
        throw new Error(`Gemini Embedding error ${res.status}: ${body}`);
      }
      const json: any = await res.json();
      const values = json?.embedding?.values;
      if (!Array.isArray(values) || values.length === 0) {
        throw new Error("Gemini Embedding retornou vetor vazio.");
      }
      return {
        embedding: l2NormalizeEmbedding(values),
        inputTokens: Math.ceil(params.prompt.length / 4),
      };
    }

    const model = params.model || "text-embedding-3-small";
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.key}`,
      },
      body: JSON.stringify({
        model,
        input: params.prompt,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = (await res.text().catch(() => "")).slice(0, 300);
      throw new Error(`OpenAI Embedding error ${res.status}: ${body}`);
    }
    const json: any = await res.json();
    const values = json?.data?.[0]?.embedding;
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error("OpenAI Embedding retornou vetor vazio.");
    }
    return {
      embedding: l2NormalizeEmbedding(values),
      inputTokens: json?.usage?.prompt_tokens || Math.ceil(params.prompt.length / 4),
    };
  } finally {
    clearTimeout(timer);
    params.signal?.removeEventListener("abort", abortParent);
  }
}

export async function generateRealEmbedding(
  text: string,
  options?: {
    userId?: string | null;
    storeId?: string | null;
    taskType?: EmbeddingTaskType;
  },
): Promise<{ embedding: number[]; provider: string; model: string } | null> {
  const clean = String(text || "").trim().slice(0, 8000);
  if (!clean) return null;

  const ownerId = options?.userId || options?.storeId || undefined;
  const storeId = options?.storeId || undefined;
  const candidates: Array<{ provider: "gemini" | "openai"; model: string }> = [
    { provider: "gemini", model: "gemini-embedding-001" },
    { provider: "openai", model: "text-embedding-3-small" },
  ];

  for (const candidate of candidates) {
    const keys = await safeLoadEmbeddingKeys(candidate.provider, ownerId, storeId);
    for (const k of keys.slice(0, 2)) {
      try {
        const res = await embedSingleWithProvider({
          provider: candidate.provider,
          model: candidate.model,
          key: k.rawKey,
          prompt: clean,
          taskType: options?.taskType || "SEMANTIC_SIMILARITY",
        });
        if (Array.isArray(res.embedding) && res.embedding.length === EMBEDDING_DIMENSIONS) {
          safeRecordKeyUsage(k.id);
          return {
            embedding: res.embedding,
            provider: candidate.provider,
            model: candidate.model,
          };
        }
      } catch (err: any) {
        const msg = String(err?.message || "");
        const statusMatch = msg.match(/\b(401|403|429|500|502|503)\b/);
        safeMarkKeyError(k.id, msg, statusMatch ? Number(statusMatch[1]) : undefined);
      }
    }
  }

  return null;
}

export async function generateBatchEmbeddings(params: {
  texts: string[];
  taskType?: EmbeddingTaskType;
  authContext?: { userId?: string; storeId?: string };
}): Promise<{ embeddings: Array<number[] | null>; provider: string; model: string }> {
  const cleaned = params.texts.map((t) => (t || "").trim().slice(0, 8000));
  if (cleaned.length === 0) return { embeddings: [], provider: "none", model: "none" };

  const targetOwnerId = params.authContext?.userId || params.authContext?.storeId;
  const geminiKeys = await safeLoadEmbeddingKeys(
    "gemini",
    targetOwnerId,
    params.authContext?.storeId,
  );
  if (geminiKeys.length > 0) {
    const model = "gemini-embedding-001";
    const key = geminiKeys[0].rawKey;
    const out: Array<number[] | null> = new Array(cleaned.length).fill(null);
    const batchSize = 20;
    let subrequests = 0;
    try {
      for (
        let start = 0;
        start < cleaned.length && subrequests < MAX_EMBEDDING_HTTP_SUBREQUESTS;
        start += batchSize
      ) {
        subrequests++;
        const slice = cleaned.slice(start, start + batchSize);
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requests: slice.map((text) => ({
                model: `models/${model}`,
                content: { parts: [{ text: text || " " }] },
                taskType: params.taskType || "RETRIEVAL_DOCUMENT",
                outputDimensionality: EMBEDDING_DIMENSIONS,
              })),
            }),
          },
        );
        if (!res.ok) {
          throw new Error(`Gemini batchEmbedContents HTTP ${res.status}`);
        }
        const json: any = await res.json();
        const embList: any[] = Array.isArray(json?.embeddings) ? json.embeddings : [];
        for (let i = 0; i < slice.length; i++) {
          const values = embList[i]?.values;
          if (Array.isArray(values) && values.length > 0) {
            out[start + i] = l2NormalizeEmbedding(values);
          }
        }
      }
      safeRecordKeyUsage(geminiKeys[0].id);
      return { embeddings: out, provider: "gemini", model };
    } catch (err) {
      console.warn("[AI-EMBEDDING-CLIENT] batchEmbedContents falhou; tentando fallback por item:", err);
    }
  }

  const fallbackOut: Array<number[] | null> = [];
  let resolvedProvider = "none";
  let resolvedModel = "none";
  for (const text of cleaned.slice(0, MAX_EMBEDDING_HTTP_SUBREQUESTS)) {
    const single = await generateRealEmbedding(text || " ", {
      userId: params.authContext?.userId,
      storeId: params.authContext?.storeId,
      taskType: params.taskType || "RETRIEVAL_DOCUMENT",
    });
    if (single) {
      resolvedProvider = single.provider;
      resolvedModel = single.model;
      fallbackOut.push(single.embedding);
    } else {
      fallbackOut.push(null);
    }
  }
  while (fallbackOut.length < cleaned.length) fallbackOut.push(null);
  return { embeddings: fallbackOut, provider: resolvedProvider, model: resolvedModel };
}
