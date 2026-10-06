import type { AIActivityStep } from "@/types/chat";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, getSSRClient } from "@/lib/server-access";

export type PersistedExecutionStatus = "queued" | "running" | "paused" | "completed" | "failed_retryable" | "failed_final" | "cancelled";

interface ExecutionContext {
  executionId: string;
  taskId: string;
  threadId?: string;
  storeId?: string;
  userId?: string;
  domain: string;
}

const pendingExecutionWrites = new Map<string, Promise<void>>();

function toPersistedStep(step: AIActivityStep, executionId: string, sequenceNo: number) {
  return {
    execution_id: executionId,
    sequence_no: sequenceNo,
    step_id: step.id,
    step_type: step.type,
    label: step.label,
    detail: step.detail ?? null,
    status: step.status === "running" ? "running" : step.status === "cancelled" ? "cancelled" : step.status === "failed" ? "failed" : "completed",
    fsm_phase: step.fsmPhase ?? null,
    started_at: step.startedAt,
    completed_at: step.completedAt ?? null,
    duration_ms: step.durationMs ?? null,
    tokens_used: step.tokensUsed ?? null,
    cost_usd: step.costUsd ?? null,
  };
}

export async function startCopilotExecution(context: ExecutionContext): Promise<void> {
  const db = getServerClient();
  await db.from("copilot_executions").upsert({
    id: context.executionId,
    task_id: context.taskId,
    thread_id: context.threadId ?? null,
    store_id: context.storeId ?? null,
    user_id: context.userId ?? null,
    domain: context.domain,
    status: "running",
    current_phase: "PLANNED",
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" }).throwOnError();
}

export async function persistCopilotExecutionStep(context: Pick<ExecutionContext, "executionId">, step: AIActivityStep, sequenceNo: number): Promise<void> {
  const db = getServerClient();
  await db.from("copilot_execution_steps").upsert(toPersistedStep(step, context.executionId, sequenceNo), { onConflict: "execution_id,step_id" }).throwOnError();
  const executionUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (step.fsmPhase) executionUpdate.current_phase = step.fsmPhase;
  await db.from("copilot_executions").update(executionUpdate).eq("id", context.executionId).throwOnError();
}

export async function completeCopilotExecution(context: Pick<ExecutionContext, "executionId">, status: PersistedExecutionStatus, state: Record<string, unknown> = {}, error?: string): Promise<void> {
  try {
    await pendingExecutionWrites.get(context.executionId);
  } finally {
    pendingExecutionWrites.delete(context.executionId);
  }
  const db = getServerClient();
  const currentPhase = status === "completed"
    ? "COMPLETED"
    : status === "failed_retryable"
      ? "FAILED_RETRYABLE"
      : status === "failed_final"
        ? "FAILED_FINAL"
        : status === "cancelled"
          ? "CANCELLED"
          : "RUNNING";
  await db.from("copilot_executions").update({ current_phase: currentPhase, status, state, last_error: error ?? null, completed_at: ["completed", "failed_final", "cancelled"].includes(status) ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", context.executionId).throwOnError();
}

export function createPersistedActivitySteps(context: Pick<ExecutionContext, "executionId">): AIActivityStep[] {
  const target: AIActivityStep[] = [];
  return new Proxy(target, {
    get(array, property, receiver) {
      if (property !== "push") return Reflect.get(array, property, receiver);
      return (...steps: AIActivityStep[]) => {
        const firstIndex = array.length;
        steps.forEach((step, offset) => {
          const previous = pendingExecutionWrites.get(context.executionId) ?? Promise.resolve();
          const pending = previous.then(() => persistCopilotExecutionStep(context, step, firstIndex + offset));
          pendingExecutionWrites.set(context.executionId, pending);
          void pending.catch((error) => console.warn("[copilot-execution] step telemetry unavailable", error));
        });
        return Array.prototype.push.apply(array, steps);
      };
    },
  });
}

export async function resumeCopilotExecution(executionId: string): Promise<{ execution: Record<string, unknown> | null; steps: Record<string, unknown>[] }> {
  await getServerIdentity();
  const scoped = await getSSRClient();
  const { data: execution } = await scoped.from("copilot_executions").select("*").eq("id", executionId).maybeSingle().throwOnError();
  if (!execution) return { execution: null, steps: [] };
  const { data: steps } = await scoped.from("copilot_execution_steps").select("*").eq("execution_id", executionId).order("sequence_no", { ascending: true }).throwOnError();
  await getServerClient().from("copilot_executions").update({ resume_count: Number(execution.resume_count || 0) + 1, status: "running", updated_at: new Date().toISOString() }).eq("id", executionId).throwOnError();
  return { execution: execution ?? null, steps: steps ?? [] };
}
