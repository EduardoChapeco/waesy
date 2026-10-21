/**
 * ai-scheduled-tasks.functions.ts — Motor de Automações e Tarefas Agendadas de IA
 * Permite cadastrar tarefas recorrentes ou cron jobs disparados automaticamente
 * pelo ecossistema, com registro de execuções e histórico de runs.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { createDurableAiTask } from "./ai-tasks-durability.functions";

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
    };
  });
