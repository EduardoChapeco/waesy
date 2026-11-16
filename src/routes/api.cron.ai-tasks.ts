import { createFileRoute } from "@tanstack/react-router";
import { hasValidWorkerToken } from "@/lib/ai/worker-auth";
import { getServerClient } from "@/lib/supabase";
import { runCopilotReactOrchestrator } from "@/services/copilot-react-orchestrator";
import { finalizeResumedCopilotExchange } from "@/services/ai-conversations.functions";

/**
 * Worker autenticado para retomar checkpoints duráveis do Copilot em background
 * (`copilot_executions` com status='paused', current_phase='PARTIAL_RESULT' e state.autoResume=true).
 */
export async function handleCronAiTasks(request: Request): Promise<Response> {
  if (!hasValidWorkerToken(request)) {
    return Response.json(
      { error: "Token de cron inválido ou ausente." },
      { status: 401 },
    );
  }

  const db = getServerClient();
  const { data: rows, error } = await db
    .from("copilot_executions")
    .select("id, thread_id, user_id, store_id, state")
    .eq("status", "paused")
    .eq("current_phase", "PARTIAL_RESULT")
    .order("updated_at", { ascending: true })
    .limit(3);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const candidates = (rows || []).filter(
    (r: any) =>
      r?.state?.autoResume === true &&
      r?.state?.pauseRequested !== true &&
      typeof r?.user_id === "string" &&
      typeof r?.thread_id === "string",
  );

  const processed: Array<{
    executionId: string;
    status: "completed" | "checkpoint" | "failed";
    error?: string;
  }> = [];

  for (const row of candidates.slice(0, 2)) {
    try {
      const prompt = String(row.state?.userPrompt || "Continuar execução").trim();
      const outcome = await runCopilotReactOrchestrator({
        userPrompt: prompt,
        context: {
          userId: row.user_id,
          storeId: row.store_id || undefined,
          threadId: row.thread_id,
          continueExecutionId: row.id,
          streamReact: true,
          workerBypass: true,
        },
      });

      if (outcome.checkpoint?.hasMore) {
        processed.push({ executionId: row.id, status: "checkpoint" });
      } else {
        await finalizeResumedCopilotExchange({
          threadId: row.thread_id,
          userId: row.user_id,
          storeId: row.store_id || null,
          userPrompt: prompt,
          execution: outcome,
        });
        processed.push({ executionId: row.id, status: "completed" });
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      await db
        .from("copilot_executions")
        .update({
          status: "failed_retryable",
          last_error: msg.slice(0, 240),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      processed.push({
        executionId: row.id,
        status: "failed",
        error: msg.slice(0, 200),
      });
    }
  }

  return Response.json({
    success: true,
    checkedCount: (rows || []).length,
    resumedCount: processed.length,
    processed,
  });
}

export const Route = createFileRoute("/api/cron/ai-tasks")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => handleCronAiTasks(request),
      POST: async ({ request }: { request: Request }) => handleCronAiTasks(request),
    },
  },
} as never);
