import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { createHash } from "node:crypto";

const MediaJobPayload = z.object({
  prompt: z.string().trim().min(1).max(12000),
  module: z.string().trim().max(120).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function stableIdempotencyKey(storeId: string, userId: string, prompt: string, clientKey?: string) {
  return clientKey?.trim() || createHash("sha256").update(`${storeId}|${userId}|${prompt.trim()}`).digest("hex");
}

export const createAiMediaJob = createServerFn({ method: "POST" })
  .validator(z.object({ payload: MediaJobPayload, idempotencyKey: z.string().trim().min(8).max(200).optional(), quotaTokens: z.number().int().min(0).max(1_000_000).default(0), maxAttempts: z.number().int().min(1).max(5).default(3) }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id || !identity.store_id) throw new Error("Sessão e loja são obrigatórias para criar job de mídia.");
    const db = getServerClient();
    const idempotencyKey = stableIdempotencyKey(identity.store_id, identity.id, data.payload.prompt, data.idempotencyKey);
    const { data: existing } = await db.from("ai_async_jobs").select("*").eq("store_id", identity.store_id).eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing) return { status: "ok" as const, idempotent: true, job: existing };
    const { data: job, error } = await db.from("ai_async_jobs").insert({
      task: "imagem",
      user_id: identity.id,
      store_id: identity.store_id,
      status: "queued",
      payload: data.payload,
      idempotency_key: idempotencyKey,
      max_attempts: data.maxAttempts,
      quota_tokens: data.quotaTokens,
      progress_percent: 0,
    }).select("*").single();
    if (error || !job) throw error || new Error("Job de mídia não criado.");
    return { status: "ok" as const, idempotent: false, job };
  });

export const getAiMediaJob = createServerFn({ method: "GET" })
  .validator(z.object({ jobId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id || !identity.store_id) throw new Error("Sessão e loja são obrigatórias.");
    const { data: job, error } = await getServerClient().from("ai_async_jobs").select("id, task, status, result, error_message, progress_percent, attempt_count, max_attempts, quota_tokens, quota_charged, provider_job_id, created_at, started_at, finished_at, updated_at").eq("id", data.jobId).eq("user_id", identity.id).eq("store_id", identity.store_id).maybeSingle();
    if (error) throw error;
    if (!job) throw new Error("Job não encontrado.");
    return job;
  });

export const cancelAiMediaJob = createServerFn({ method: "POST" })
  .validator(z.object({ jobId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id || !identity.store_id) throw new Error("Sessão e loja são obrigatórias.");
    const { data: result, error } = await getServerClient().rpc("request_cancel_ai_async_job", { p_job_id: data.jobId, p_user_id: identity.id, p_store_id: identity.store_id });
    if (error) throw error;
    return result;
  });

export const retryAiMediaJob = createServerFn({ method: "POST" })
  .validator(z.object({ jobId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id || !identity.store_id) throw new Error("Sessão e loja são obrigatórias.");
    const { data: result, error } = await getServerClient().rpc("retry_ai_async_job", { p_job_id: data.jobId, p_user_id: identity.id, p_store_id: identity.store_id });
    if (error) throw error;
    return result;
  });

/** Chamado somente pelo worker confiável após persistir o resultado do provider. */
export async function finalizeAiMediaJob(input: { jobId: string; storeId: string; result?: Record<string, unknown> | null; success?: boolean; errorMessage?: string | null }) {
  const { data, error } = await getServerClient().rpc("finalize_ai_async_job", {
    p_job_id: input.jobId,
    p_store_id: input.storeId,
    p_result: input.result || null,
    p_success: input.success ?? true,
    p_error_message: input.errorMessage || null,
  });
  if (error) throw error;
  return data;
}
