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
import { completeDurableAiTask, createDurableAiTask } from "./ai-tasks-durability.functions";

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

    // Instancia uma tarefa durável real na fila de ai_tasks
    const durableTask = await createDurableAiTask({
      data: {
        taskType: scheduled.task_type || "scheduled_run",
        title: `[Agendamento] ${scheduled.title}`,
        workspaceId: scheduled.workspace_id || undefined,
        inputPayload: {
          ...scheduled.input_payload,
          scheduledTaskId: scheduled.id,
          prompt: scheduled.prompt,
          triggeredManually: true,
        },
        estimatedTokens: 250,
      },
    });

    // Executa de fato o prompt da tarefa agendada no Gateway de IA e registra o desfecho real
    const execResult = await executeAiCoreGateway({
      task: "geracao_texto",
      prompt: String(scheduled.prompt),
      systemPrompt:
        "Você está executando uma rotina agendada automática do usuário no Waesy Copilot. Responda de forma objetiva e estruturada.",
      module: "ai_scheduled_task",
      authContext: {
        userId: identity.id,
        storeId: scheduled.workspace_id || (identity as any).store_id || undefined,
        userRole: (identity as any).role,
      },
    });

    if (execResult.success === false) {
      const errorMsg = execResult.error?.message || "Falha ao executar rotina agendada.";
      await db
        .from("ai_tasks")
        .update({
          status: "failed",
          current_step: errorMsg,
          output_payload: { error: errorMsg },
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", durableTask.id)
        .eq("user_id", identity.id);

      throw new Error(errorMsg);
    }

    await completeDurableAiTask({
      data: {
        taskId: durableTask.id,
        actualTokens: Number(execResult.metadata.usage.totalTokens || 0),
        costWz: 0,
        outputPayload: {
          outputText: execResult.result.text,
          provider: execResult.metadata.provider,
          model: execResult.metadata.model,
          totalTokens: execResult.metadata.usage.totalTokens,
        },
      },
    }).catch(() => null);

    // Atualiza contadores na tarefa agendada
    await db
      .from("ai_scheduled_tasks")
      .update({
        last_run_at: new Date().toISOString(),
        run_count: (scheduled.run_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", scheduled.id);

    return {
      success: true,
      durableTaskId: durableTask.id,
      scheduledTaskId: scheduled.id,
      outputPreview: execResult.result.text.slice(0, 400),
      provider: execResult.metadata.provider,
    };
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
