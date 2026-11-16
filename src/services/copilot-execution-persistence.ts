import type { AIActivityStep, ExecutionPlanStep } from "@/types/chat";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, getSSRClient } from "@/lib/server-access";

export type PersistedExecutionStatus = "queued" | "running" | "paused" | "completed" | "failed_retryable" | "failed_final" | "cancelled";

interface ExecutionContext {
  executionId: string;
  taskId: string;
  parentTaskId?: string;
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
    role: step.role ?? null,
    parent_task_id: step.parentTaskId ?? null,
    ...(step.browserUrl ? { browser_url: step.browserUrl } : {}),
    ...(step.screenshotUrl ? { screenshot_url: step.screenshotUrl } : {}),
    ...(step.driver ? { driver: step.driver } : {}),
    ...(step.toolLogs && step.toolLogs.length > 0 ? { tool_logs: step.toolLogs } : {}),
  };
}

export async function startCopilotExecution(context: ExecutionContext): Promise<void> {
  const db = getServerClient();
  await db.from("copilot_executions").upsert({
    id: context.executionId,
    task_id: context.taskId,
    parent_task_id: context.parentTaskId ?? null,
    thread_id: context.threadId ?? null,
    store_id: context.storeId ?? null,
    user_id: context.userId ?? null,
    domain: context.domain,
    status: "running",
    // PLANNING não faz parte da FSM canônica; RECEIVED é o primeiro estado
    // persistível e evita gravar um estado fantasma no banco.
    current_phase: "RECEIVED",
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" }).throwOnError();
}

export async function persistCopilotExecutionStep(context: Pick<ExecutionContext, "executionId">, step: AIActivityStep, sequenceNo: number): Promise<void> {
  const db = getServerClient();
  await db.from("copilot_execution_steps").upsert(toPersistedStep(step, context.executionId, sequenceNo), { onConflict: "execution_id,step_id" }).throwOnError();
  await db.from("copilot_executions").update({ current_phase: step.fsmPhase ?? "RUNNING", updated_at: new Date().toISOString() }).eq("id", context.executionId).throwOnError();
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
  if (["COMPLETED", "FAILED_FINAL", "CANCELLED"].includes(String(execution.current_phase))) {
    return { execution: execution ?? null, steps: steps ?? [] };
  }
  await getServerClient().from("copilot_executions").update({ resume_count: Number(execution.resume_count || 0) + 1, status: "running", updated_at: new Date().toISOString() }).eq("id", executionId).throwOnError();
  return { execution: execution ?? null, steps: steps ?? [] };
}

export async function saveCopilotExecutionCheckpoint(input: {
  executionId: string;
  taskId?: string;
  plan?: ExecutionPlanStep[];
  state?: Record<string, unknown>;
  status?: PersistedExecutionStatus;
  currentPhase?: string;
  progressPercent?: number;
  currentStepLabel?: string;
}): Promise<void> {
  try {
    await pendingExecutionWrites.get(input.executionId);
  } finally {
    pendingExecutionWrites.delete(input.executionId);
  }
  const db = getServerClient();
  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = { updated_at: nowIso };
  if (input.plan) patch.plan = input.plan;
  if (input.state) patch.state = input.state;
  if (input.status) patch.status = input.status;
  if (input.currentPhase) patch.current_phase = input.currentPhase;

  await db.from("copilot_executions").update(patch).eq("id", input.executionId).throwOnError();

  if (input.taskId) {
    const taskPatch: Record<string, unknown> = {
      heartbeat_at: nowIso,
      updated_at: nowIso,
    };
    if (typeof input.progressPercent === "number") {
      taskPatch.progress_percent = Math.min(100, Math.max(0, Math.round(input.progressPercent)));
    }
    if (input.currentStepLabel) {
      taskPatch.current_step = input.currentStepLabel.slice(0, 240);
    }
    if (input.status === "paused") taskPatch.status = "waiting_user";
    else if (input.status === "cancelled") taskPatch.status = "cancelled";
    else if (input.status === "completed") {
      taskPatch.status = "completed";
      taskPatch.completed_at = nowIso;
    } else if (input.status === "running") {
      taskPatch.status = "running";
    }
    await db.from("ai_tasks").update(taskPatch).eq("id", input.taskId);
  }
}

export async function loadCopilotExecutionForContinue(input: {
  executionId: string;
  userId?: string;
  storeId?: string | null;
  allowWorkerBypass?: boolean;
}): Promise<{ execution: Record<string, any>; steps: Record<string, any>[] } | null> {
  const db = getServerClient();
  const { data: execution, error } = await db
    .from("copilot_executions")
    .select("*")
    .eq("id", input.executionId)
    .maybeSingle();
  if (error || !execution) return null;

  if (!input.allowWorkerBypass) {
    if (!input.userId) return null;
    const isOwner = execution.user_id === input.userId;
    const isSameStore =
      Boolean(input.storeId) && execution.store_id === input.storeId;
    if (!isOwner && !isSameStore) {
      return null;
    }
  }

  const { data: steps } = await db
    .from("copilot_execution_steps")
    .select("*")
    .eq("execution_id", input.executionId)
    .order("sequence_no", { ascending: true });

  return {
    execution,
    steps: Array.isArray(steps) ? steps : [],
  };
}

export async function controlCopilotExecution(input: {
  executionId: string;
  userId: string;
  storeId?: string | null;
  action: "pause" | "resume" | "inject_guidance" | "cancel";
  guidance?: string;
}): Promise<{ success: boolean; status: string; state: Record<string, unknown> }> {
  const loaded = await loadCopilotExecutionForContinue({
    executionId: input.executionId,
    userId: input.userId,
    storeId: input.storeId,
  });
  if (!loaded) {
    throw new Error("Execução do Copilot não encontrada ou acesso negado.");
  }

  const execution = loaded.execution;
  const currentState =
    execution.state && typeof execution.state === "object"
      ? { ...(execution.state as Record<string, unknown>) }
      : {};

  const nowIso = new Date().toISOString();
  let nextStatus: PersistedExecutionStatus = execution.status || "running";
  let nextPhase = String(execution.current_phase || "RUNNING");

  if (input.action === "pause") {
    currentState.pauseRequested = true;
    currentState.autoResume = false;
    nextStatus = "paused";
    nextPhase = "WAITING_APPROVAL";
  } else if (input.action === "resume") {
    currentState.pauseRequested = false;
    currentState.autoResume = true;
    if (input.guidance?.trim()) {
      currentState.userGuidance = input.guidance.trim().slice(0, 2000);
    }
    nextStatus = "paused";
    nextPhase = "PARTIAL_RESULT";
  } else if (input.action === "inject_guidance") {
    if (!input.guidance?.trim()) {
      throw new Error("Informe a instrução ou confirmação antes de enviar ao agente.");
    }
    currentState.userGuidance = input.guidance.trim().slice(0, 2000);
    currentState.pauseRequested = false;
    currentState.autoResume = true;
    nextStatus = "paused";
    nextPhase = "PARTIAL_RESULT";
  } else if (input.action === "cancel") {
    currentState.pauseRequested = true;
    currentState.autoResume = false;
    nextStatus = "cancelled";
    nextPhase = "CANCELLED";
  }

  await saveCopilotExecutionCheckpoint({
    executionId: input.executionId,
    taskId: execution.task_id || input.executionId,
    status: nextStatus,
    currentPhase: nextPhase,
    state: currentState,
    currentStepLabel:
      input.action === "pause"
        ? "Pausado pelo usuário"
        : input.action === "cancel"
          ? "Cancelado pelo usuário"
          : "Retomada solicitada com orientação",
  });

  if (nextStatus === "cancelled") {
    await getServerClient()
      .from("copilot_executions")
      .update({ completed_at: nowIso })
      .eq("id", input.executionId);
  }

  return { success: true, status: nextStatus, state: currentState };
}
