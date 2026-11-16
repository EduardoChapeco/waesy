import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { hasValidWorkerToken } from "@/lib/ai/worker-auth";
import { executeAiCoreGateway } from "@/services/ai-core-gateway.functions";
import { finalizeAiMediaJob } from "@/services/ai-media-jobs.functions";

const processRequestSchema = z.object({
  jobId: z.string().uuid().optional(),
  maxJobs: z.number().int().min(1).max(5).default(1),
});

async function uploadGeneratedImageFallback(
  storeId: string,
  jobId: string,
  base64Data: string,
  mimeType: string,
): Promise<string | undefined> {
  const clean = base64Data.replace(/^data:[^;]+;base64,/, "");
  const buffer = Buffer.from(clean, "base64");
  if (!buffer || buffer.length === 0) return undefined;
  const ext = mimeType.includes("webp")
    ? "webp"
    : mimeType.includes("jpeg")
      ? "jpg"
      : "png";
  const path = `tenants/${storeId}/copilot-uploads/generated-${jobId}.${ext}`;
  const db = getServerClient();
  const { error } = await db.storage.from("copilot-uploads").upload(path, buffer, {
    contentType: mimeType || "image/png",
    upsert: true,
  });
  if (error) return undefined;
  const { data } = db.storage.from("copilot-uploads").getPublicUrl(path);
  return data?.publicUrl;
}

export async function handleProcessAiMediaJobs(
  request: Request,
): Promise<Response> {
        const isWorker = hasValidWorkerToken(request);
        const identity = isWorker ? null : await getServerIdentity();

        if (!isWorker && (!identity?.id || !identity?.store_id)) {
          return Response.json(
            { error: "Autenticação necessária para processar jobs de mídia." },
            { status: 401 },
          );
        }

        const rawBody = await request.json().catch(() => ({}));
        const parsed = processRequestSchema.safeParse(rawBody);
        if (!parsed.success) {
          return Response.json(
            { error: "Payload inválido.", details: parsed.error.flatten() },
            { status: 400 },
          );
        }

        const db = getServerClient();
        const processed: Array<{
          jobId: string;
          status: "completed" | "failed";
          url?: string;
          error?: string;
        }> = [];
        const loopLimit = parsed.data.jobId ? 1 : parsed.data.maxJobs;
        const workerId =
          request.headers.get("x-waesy-worker-id") ||
          (isWorker ? "worker-api" : `user-${identity?.id}`);

        for (let i = 0; i < loopLimit; i++) {
          let query = db
            .from("ai_async_jobs")
            .select("*")
            .eq("task", "imagem")
            .in("status", ["queued", "failed_retryable"])
            .eq("cancel_requested", false)
            .order("created_at", { ascending: true })
            .limit(1);

          if (parsed.data.jobId) {
            query = query.eq("id", parsed.data.jobId);
          }
          if (!isWorker && identity?.id && identity?.store_id) {
            query = query
              .eq("user_id", identity.id)
              .eq("store_id", identity.store_id);
          }

          const { data: candidates, error: findErr } = await query;
          if (findErr) {
            return Response.json({ error: findErr.message }, { status: 500 });
          }

          const candidate = candidates?.[0];
          if (!candidate) break;
          if ((candidate.attempt_count || 0) >= (candidate.max_attempts || 3)) {
            await finalizeAiMediaJob({
              jobId: candidate.id,
              storeId: candidate.store_id,
              success: false,
              errorMessage: "Número máximo de tentativas atingido.",
            });
            processed.push({
              jobId: candidate.id,
              status: "failed",
              error: "Número máximo de tentativas atingido.",
            });
            continue;
          }

          const nowIso = new Date().toISOString();
          const timeoutIso = new Date(Date.now() + 120_000).toISOString();
          const { data: claimed, error: claimErr } = await db
            .from("ai_async_jobs")
            .update({
              status: "processing",
              worker_id: workerId,
              attempt_count: (candidate.attempt_count || 0) + 1,
              started_at: candidate.started_at || nowIso,
              timeout_at: timeoutIso,
              progress_percent: 15,
              updated_at: nowIso,
            })
            .eq("id", candidate.id)
            .in("status", ["queued", "failed_retryable"])
            .select("*")
            .maybeSingle();

          if (claimErr || !claimed) continue;

          try {
            const payload = (claimed.payload || {}) as {
              prompt?: string;
              module?: string;
            };
            const promptText = String(payload.prompt || "").trim();
            if (!promptText) {
              throw new Error("Job sem prompt válido para geração de imagem.");
            }

            const gatewayRes = await executeAiCoreGateway({
              task: "imagem",
              module: payload.module || "ai_media_worker",
              prompt: promptText,
              bypassCache: true,
              authContext: {
                userId: claimed.user_id || undefined,
                storeId: claimed.store_id || undefined,
              },
            });

            const media = gatewayRes.result?.media;
            let imageUrl = media?.url;
            if (!imageUrl && media?.base64) {
              imageUrl = await uploadGeneratedImageFallback(
                claimed.store_id,
                claimed.id,
                media.base64,
                media.mimeType || "image/png",
              );
            }

            const ok = Boolean(gatewayRes.success && imageUrl);
            const errorMsg = ok
              ? null
              : gatewayRes.error?.message ||
                "Falha ao persistir imagem gerada no provedor.";

            await finalizeAiMediaJob({
              jobId: claimed.id,
              storeId: claimed.store_id,
              success: ok,
              result: ok
                ? {
                    url: imageUrl,
                    mimeType: media?.mimeType || "image/png",
                    provider: gatewayRes.metadata.provider,
                    model: gatewayRes.metadata.model,
                    caption: gatewayRes.result?.text || undefined,
                  }
                : null,
              errorMessage: errorMsg,
            });

            processed.push({
              jobId: claimed.id,
              status: ok ? "completed" : "failed",
              ...(imageUrl ? { url: imageUrl } : {}),
              ...(errorMsg ? { error: errorMsg } : {}),
            });
          } catch (err: any) {
            const message =
              err instanceof Error ? err.message : "Erro ao processar job de imagem.";
            await finalizeAiMediaJob({
              jobId: claimed.id,
              storeId: claimed.store_id,
              success: false,
              errorMessage: message,
            }).catch(() => {});
            processed.push({
              jobId: claimed.id,
              status: "failed",
              error: message,
            });
          }
        }

        return Response.json({
          success: true,
          processedCount: processed.length,
          processed,
        });
}

export const Route = createFileRoute("/api/ai/jobs/process")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) =>
        handleProcessAiMediaJobs(request),
    },
  },
} as never);
