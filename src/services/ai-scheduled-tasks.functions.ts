/**
 * ai-scheduled-tasks.functions.ts — Motor de Automações e Tarefas Agendadas de IA
 * Permite cadastrar tarefas recorrentes ou cron jobs disparados automaticamente
 * pelo ecossistema, com registro de execuções e histórico de runs.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { executeAiCoreGateway } from "./ai-core-gateway.functions";
import { runCopilotReactOrchestrator } from "./copilot-react-orchestrator";

export function computeNextRunFromCron(cronExpression: string, fromDate = new Date()): string {
  const parts = String(cronExpression || "").trim().split(/\s+/);
  const baseMs = fromDate.getTime();
  if (parts.length === 5) {
    const [minStr, hourStr, domStr] = parts;
    const stepMin = minStr.match(/^\*\/(\d+)$/);
    if (stepMin && hourStr === "*") {
      const n = Math.max(1, Math.min(59, Number(stepMin[1])));
      return new Date(baseMs + n * 60_000).toISOString();
    }
    const stepHour = hourStr.match(/^\*\/(\d+)$/);
    if (stepHour) {
      const h = Math.max(1, Math.min(23, Number(stepHour[1])));
      return new Date(baseMs + h * 3_600_000).toISOString();
    }
    if (/^\d+$/.test(minStr) && hourStr === "*") {
      const target = new Date(fromDate);
      target.setUTCSeconds(0, 0);
      target.setUTCMinutes(Number(minStr));
      if (target.getTime() <= baseMs) target.setUTCHours(target.getUTCHours() + 1);
      return target.toISOString();
    }
    if (/^\d+$/.test(minStr) && /^\d+$/.test(hourStr) && domStr === "*") {
      const target = new Date(fromDate);
      target.setUTCSeconds(0, 0);
      target.setUTCHours(Number(hourStr), Number(minStr), 0, 0);
      if (target.getTime() <= baseMs) target.setUTCDate(target.getUTCDate() + 1);
      return target.toISOString();
    }
  }
  return new Date(baseMs + 86_400_000).toISOString();
}

export const createScheduledTaskSchema = z.object({
  title: z.string().min(2),
  prompt: z.string().min(5),
  cronExpression: z.string().min(5), // ex: '0 8 * * *' para todos os dias às 08:00
  taskType: z.string().default("autonomous_prompt"),
  workspaceId: z.string().uuid().optional(),
  inputPayload: z.record(z.any()).default({}),
});

export const toggleScheduledTaskSchema = z.object({
  taskId: z.string().uuid(),
  isActive: z.boolean(),
});

export const triggerScheduledTaskRunSchema = z.object({
  taskId: z.string().uuid(),
});

export const updateScheduledTaskSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().trim().min(2).max(120).optional(),
  prompt: z.string().trim().min(5).max(4000).optional(),
  cronExpression: z.string().trim().min(5).max(80).optional(),
  isActive: z.boolean().optional(),
});

export const deleteScheduledTaskSchema = z.object({
  taskId: z.string().uuid(),
});

/**
 * Cria uma nova tarefa agendada
 */
export const createAiScheduledTask = createServerFn({ method: "POST" })
  .validator(createScheduledTaskSchema)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (!identity?.id) {
      throw new Error("Usuário não autenticado");
    }

    const { data: scheduled, error } = await db
      .from("ai_scheduled_tasks")
      .insert({
        user_id: identity.id,
        workspace_id: data.workspaceId || null,
        title: data.title,
        prompt: data.prompt,
        cron_expression: data.cronExpression,
        task_type: data.taskType,
        input_payload: data.inputPayload,
        is_active: true,
        next_run_at: new Date(Date.now() + 86400000).toISOString(), // Previsão inicial
      })
      .select()
      .single();

    if (error || !scheduled) {
      throw new Error(`Falha ao criar tarefa agendada: ${error?.message || "erro"}`);
    }

    return scheduled;
  });

/**
 * Lista as tarefas agendadas do usuário
 */
export const listAiScheduledTasks = createServerFn({ method: "GET" }).handler(
  async () => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (!identity?.id) return [];

    const { data: tasks, error } = await db
      .from("ai_scheduled_tasks")
      .select("id, title, prompt, cron_expression, task_type, is_active, last_run_at, next_run_at, run_count, created_at")
      .eq("user_id", identity.id)
      .order("created_at", { ascending: false });

    if (error || !tasks) return [];
    return tasks;
  },
);

/**
 * Ativa ou pausa uma tarefa agendada
 */
export const toggleAiScheduledTask = createServerFn({ method: "POST" })
  .validator(toggleScheduledTaskSchema)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (!identity?.id) throw new Error("Usuário não autenticado");

    const { data: updated, error } = await db
      .from("ai_scheduled_tasks")
      .update({
        is_active: data.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.taskId)
      .eq("user_id", identity.id)
      .select()
      .single();

    if (error || !updated) {
      throw new Error("Falha ao alterar estado da tarefa agendada");
    }

    return updated;
  });

/**
 * Atualiza título, instrução ou expressão cron de uma tarefa agendada
 */
export const updateAiScheduledTask = createServerFn({ method: "POST" })
  .validator(updateScheduledTaskSchema)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (!identity?.id) throw new Error("Usuário não autenticado");

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.title !== undefined) patch.title = data.title;
    if (data.prompt !== undefined) patch.prompt = data.prompt;
    if (data.cronExpression !== undefined) patch.cron_expression = data.cronExpression;
    if (data.isActive !== undefined) patch.is_active = data.isActive;

    const { data: updated, error } = await db
      .from("ai_scheduled_tasks")
      .update(patch)
      .eq("id", data.taskId)
      .eq("user_id", identity.id)
      .select("id, title, prompt, cron_expression, task_type, is_active, last_run_at, next_run_at, run_count, created_at")
      .maybeSingle();

    if (error || !updated) {
      throw new Error("Falha ao atualizar tarefa agendada");
    }

    return updated;
  });

/**
 * Exclui permanentemente uma tarefa agendada do usuário
 */
export const deleteAiScheduledTask = createServerFn({ method: "POST" })
  .validator(deleteScheduledTaskSchema)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (!identity?.id) throw new Error("Usuário não autenticado");

    const { data: deleted, error } = await db
      .from("ai_scheduled_tasks")
      .delete()
      .eq("id", data.taskId)
      .eq("user_id", identity.id)
      .select("id")
      .maybeSingle();

    if (error || !deleted) {
      throw new Error("Falha ao excluir tarefa agendada");
    }

    return { deleted: true, taskId: data.taskId };
  });

export async function executeSingleScheduledTaskRecord(
  db: ReturnType<typeof getServerClient>,
  scheduled: any,
  opts?: { triggeredManually?: boolean; storeIdOverride?: string; userRole?: string },
) {
  const nowIso = new Date().toISOString();
  const resolvedStoreId = opts?.storeIdOverride || scheduled.workspace_id || undefined;
  const { data: durableTask, error: taskCreateErr } = await db
    .from("ai_tasks")
    .insert({
      user_id: scheduled.user_id,
      workspace_id: resolvedStoreId || null,
      thread_id: scheduled.input_payload?.threadId || null,
      task_type: scheduled.task_type || "scheduled_run",
      title: `[Agendamento] ${scheduled.title}`,
      input_payload: {
        ...(scheduled.input_payload || {}),
        scheduledTaskId: scheduled.id,
        prompt: scheduled.prompt,
        triggeredManually: Boolean(opts?.triggeredManually),
      },
      estimated_tokens: 250,
      cost_wz: 0,
      status: "running",
      progress_percent: 15,
      current_step: "Executando rotina agendada no motor ReAct",
      heartbeat_at: nowIso,
    })
    .select("id")
    .single();

  if (taskCreateErr || !durableTask?.id) {
    throw new Error(taskCreateErr?.message || "Falha ao registrar tarefa durável agendada.");
  }

  let outputText = "";
  let artifactId: string | undefined;
  let totalTokens = 0;
  let providerLabel = "copilot_react";

  try {
    const reactOutcome = await runCopilotReactOrchestrator({
      userPrompt: String(scheduled.prompt),
      context: {
        userId: scheduled.user_id,
        storeId: resolvedStoreId,
        threadId: scheduled.input_payload?.threadId || undefined,
        streamReact: false,
      },
    });
    outputText = reactOutcome.responseMessage || "";
    artifactId = reactOutcome.artifact?.id;
    const sumTokens = (reactOutcome.activitySteps || []).reduce(
      (acc, st) => acc + Number(st.tokensUsed || 0),
      0,
    );
    totalTokens = sumTokens;

    if (!outputText || reactOutcome.fsmPhase === "FAILED_FINAL") {
      const gwFallback = await executeAiCoreGateway({
        task: "geracao_texto",
        prompt: String(scheduled.prompt),
        systemPrompt:
          "Você está executando uma rotina agendada automática do usuário no Waesy Copilot. Responda de forma objetiva e estruturada.",
        module: "ai_scheduled_task",
        authContext: {
          userId: scheduled.user_id,
          storeId: resolvedStoreId,
          userRole: opts?.userRole,
        },
      });
      if (gwFallback.success === false) {
        throw new Error(gwFallback.error?.message || "Falha ao executar rotina agendada.");
      }
      outputText = gwFallback.result.text;
      providerLabel = gwFallback.metadata.provider;
      totalTokens += Number(gwFallback.metadata.usage.totalTokens || 0);
    }
  } catch (err: any) {
    const errorMsg = err?.message || "Falha ao executar rotina agendada.";
    await db
      .from("ai_tasks")
      .update({
        status: "failed",
        current_step: errorMsg,
        output_payload: { error: errorMsg },
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", durableTask.id);
    throw new Error(errorMsg);
  }

  await db
    .from("ai_tasks")
    .update({
      status: "completed",
      progress_percent: 100,
      current_step: "Rotina agendada concluída",
      actual_tokens: totalTokens,
      output_payload: {
        outputText,
        provider: providerLabel,
        artifactId,
        totalTokens,
      },
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", durableTask.id);

  // Expurgar periodicamente snapshots e telemetria expirados (Supabase Nano Free budget protection)
  try {
    await (db as any).rpc("purge_expired_travel_snapshots_and_telemetry");
  } catch {
    // Non-blocking housekeeping
  }

  const nextRunAt = computeNextRunFromCron(scheduled.cron_expression);
  const completedAt = new Date().toISOString();
  const basePatch = {
    last_run_at: completedAt,
    next_run_at: nextRunAt,
    run_count: (scheduled.run_count || 0) + 1,
    updated_at: completedAt,
  };
  const extendedRes = await db
    .from("ai_scheduled_tasks")
    .update({
      ...basePatch,
      last_status: "completed",
      last_error: null,
      last_output_preview: outputText.slice(0, 400),
    })
    .eq("id", scheduled.id);
  if (extendedRes.error && /last_status|42703/i.test(extendedRes.error.message || "")) {
    await db.from("ai_scheduled_tasks").update(basePatch).eq("id", scheduled.id);
  }

  return {
    success: true,
    durableTaskId: durableTask.id,
    scheduledTaskId: scheduled.id,
    nextRunAt,
    outputPreview: outputText.slice(0, 400),
    artifactId,
    provider: providerLabel,
  };
}

/**
 * Dispara uma execução imediata (Dry Run / Teste Manual) da tarefa agendada
 */
export const triggerScheduledTaskRun = createServerFn({ method: "POST" })
  .validator(triggerScheduledTaskRunSchema)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (!identity?.id) throw new Error("Usuário não autenticado");

    const { data: scheduled } = await db
      .from("ai_scheduled_tasks")
      .select("*")
      .eq("id", data.taskId)
      .eq("user_id", identity.id)
      .single();

    if (!scheduled) throw new Error("Tarefa agendada não encontrada");

    return executeSingleScheduledTaskRecord(db, scheduled, {
      triggeredManually: true,
      storeIdOverride: scheduled.workspace_id || (identity as any).store_id || undefined,
      userRole: (identity as any).role,
    });
  });

export interface CopilotUsageAnalyticsDTO {
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  totalSteps: number;
  totalTokens: number;
  estimatedCostUsd: number;
  activeConnectorsCount: number;
  activeMcpServersCount: number;
  recentExecutions: Array<{
    id: string;
    promptPreview: string;
    status: string;
    durationMs: number;
    createdAt: string;
  }>;
}

export const getCopilotUsageAnalytics = createServerFn({ method: "GET" }).handler(
  async (): Promise<CopilotUsageAnalyticsDTO> => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) {
      return {
        totalExecutions: 0,
        completedExecutions: 0,
        failedExecutions: 0,
        totalSteps: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        activeConnectorsCount: 0,
        activeMcpServersCount: 0,
        recentExecutions: [],
      };
    }

    const db = getServerClient();

    const [executionsRes, telemetryRes, connectorsRes, mcpRes] = await Promise.all([
      (db as any)
        .from("copilot_executions")
        .select("id, domain, status, started_at, completed_at, metadata")
        .eq("user_id", identity.id)
        .order("started_at", { ascending: false })
        .limit(30),
      (db as any)
        .from("ai_telemetry_logs")
        .select("total_tokens, cost_usd")
        .eq("user_id", identity.id)
        .limit(100),
      (db as any)
        .from("ai_connectors")
        .select("id")
        .eq("user_id", identity.id)
        .eq("status", "connected"),
      (db as any)
        .from("ai_mcp_servers")
        .select("id")
        .eq("user_id", identity.id)
        .eq("is_active", true),
    ]);

    const executions = Array.isArray(executionsRes?.data) ? executionsRes.data : [];
    const telemetry = Array.isArray(telemetryRes?.data) ? telemetryRes.data : [];
    const connectors = Array.isArray(connectorsRes?.data) ? connectorsRes.data : [];
    const mcpServers = Array.isArray(mcpRes?.data) ? mcpRes.data : [];

    const completedExecutions = executions.filter((e: any) => e.status === "completed").length;
    const failedExecutions = executions.filter((e: any) => e.status === "failed").length;
    const totalSteps = executions.reduce((acc: number, e: any) => acc + Number(e.metadata?.steps_count || 0), 0);
    const totalTokens = telemetry.reduce((acc: number, t: any) => acc + Number(t.total_tokens || 0), 0);
    const estimatedCostUsd = telemetry.reduce((acc: number, t: any) => acc + Number(t.cost_usd || 0), 0);

    return {
      totalExecutions: executions.length,
      completedExecutions,
      failedExecutions,
      totalSteps,
      totalTokens,
      estimatedCostUsd,
      activeConnectorsCount: connectors.length,
      activeMcpServersCount: mcpServers.length,
      recentExecutions: executions.slice(0, 8).map((e: any) => {
        const startedMs = e.started_at ? new Date(e.started_at).getTime() : 0;
        const completedMs = e.completed_at ? new Date(e.completed_at).getTime() : 0;
        const durationMs = startedMs && completedMs && completedMs >= startedMs ? completedMs - startedMs : 0;
        const prompt = e.metadata?.user_prompt || e.metadata?.prompt || e.domain || "";
        return {
          id: e.id,
          promptPreview: String(prompt).slice(0, 90),
          status: String(e.status || "completed"),
          durationMs,
          createdAt: String(e.started_at || new Date().toISOString()),
        };
      }),
    };
  }
);
