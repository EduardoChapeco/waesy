import { createFileRoute } from "@tanstack/react-router";
import { hasValidWorkerToken } from "@/lib/ai/worker-auth";
import { getServerClient } from "@/lib/supabase";
import {
  computeNextRunFromCron,
  executeSingleScheduledTaskRecord,
} from "@/services/ai-scheduled-tasks.functions";

export async function handleCronScheduledTasks(
  request: Request,
): Promise<Response> {
  if (!hasValidWorkerToken(request)) {
    return Response.json(
      { error: "Token de cron inválido ou ausente." },
      { status: 401 },
    );
  }

  const db = getServerClient();
  const nowIso = new Date().toISOString();

  const { data: dueTasks, error } = await db
    .from("ai_scheduled_tasks")
    .select("*")
    .eq("is_active", true)
    .or(`next_run_at.is.null,next_run_at.lte.${nowIso}`)
    .order("next_run_at", { ascending: true, nullsFirst: true })
    .limit(3);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const executed: Array<{
    taskId: string;
    status: "completed" | "failed";
    nextRunAt?: string;
    error?: string;
  }> = [];

  for (const task of dueTasks || []) {
    try {
      const outcome = await executeSingleScheduledTaskRecord(db, task, {
        triggeredManually: false,
      });
      executed.push({
        taskId: task.id,
        status: "completed",
        nextRunAt: outcome.nextRunAt,
      });
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const nextFallback = computeNextRunFromCron(task.cron_expression);
      await db
        .from("ai_scheduled_tasks")
        .update({
          last_run_at: new Date().toISOString(),
          next_run_at: nextFallback,
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id);
      executed.push({
        taskId: task.id,
        status: "failed",
        nextRunAt: nextFallback,
        error: errMsg.slice(0, 200),
      });
    }
  }

  return Response.json({
    success: true,
    checkedAt: nowIso,
    executedCount: executed.length,
    executed,
  });
}

export const Route = createFileRoute("/api/cron/ai-scheduled-tasks")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) =>
        handleCronScheduledTasks(request),
      POST: async ({ request }: { request: Request }) =>
        handleCronScheduledTasks(request),
    },
  },
} as never);
