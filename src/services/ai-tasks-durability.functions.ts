/**
 * ai-tasks-durability.functions.ts — FSM Durável de Tarefas de IA em Segundo Plano
 * Execuções assíncronas persistidas no Postgres com heartbeats, retries e cancelamento seguro.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";

export type AiTaskStatus =
  | "queued"
  | "planning"
  | "running"
  | "waiting_user"
  | "validating"
  | "completed"
  | "failed"
  | "cancelled";

export const createTaskSchema = z.object({
  taskType: z.string().min(2),
  title: z.string().min(2),
  threadId: z.string().uuid().optional(),
  workspaceId: z.string().uuid().optional(),
  inputPayload: z.record(z.any()).default({}),
  estimatedTokens: z.number().int().nonnegative().default(0),
  costWz: z.number().nonnegative().default(0),
});

export const updateTaskProgressSchema = z.object({
  taskId: z.string().uuid(),
  progressPercent: z.number().int().min(0).max(100),
  currentStep: z.string().optional(),
  status: z.enum(["planning", "running", "waiting_user", "validating"]).optional(),
  stepLog: z.object({
    label: z.string(),
    detail: z.string().optional(),
    status: z.enum(["running", "completed", "failed"]),
    timestamp: z.string().default(() => new Date().toISOString()),
  }).optional(),
});

export const completeTaskSchema = z.object({
  taskId: z.string().uuid(),
  outputPayload: z.record(z.any()).default({}),
  actualTokens: z.number().int().nonnegative().default(0),
  costWz: z.number().nonnegative().default(0),
});

export const cancelTaskSchema = z.object({
  taskId: z.string().uuid(),
  reason: z.string().optional(),
});

/**
 * Cria uma nova tarefa em segundo plano na fila durável
 */
export const createDurableAiTask = createServerFn({ method: "POST" })
  .validator(createTaskSchema)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (!identity?.id) {
      throw new Error("Usuário não autenticado");
    }

    const { data: task, error } = await db
      .from("ai_tasks")
      .insert({
        user_id: identity.id,
        workspace_id: data.workspaceId || null,
        thread_id: data.threadId || null,
        task_type: data.taskType,
        title: data.title,
        input_payload: data.inputPayload,
        estimated_tokens: data.estimatedTokens,
        cost_wz: data.costWz,
        status: "queued",
        progress_percent: 0,
        current_step: "Inicializando tarefa",
        heartbeat_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !task) {
      throw new Error(`Falha ao registrar tarefa de IA durável: ${error?.message || "erro desconhecido"}`);
    }

    return task;
  });

/**
 * Atualiza o progresso e registra o heartbeat de uma tarefa
 */
export const updateDurableAiTaskProgress = createServerFn({ method: "POST" })
  .validator(updateTaskProgressSchema)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (!identity?.id) {
      throw new Error("Usuário não autenticado");
    }

    const now = new Date().toISOString();
    const updates: Record<string, any> = {
      progress_percent: data.progressPercent,
      heartbeat_at: now,
      updated_at: now,
    };

    if (data.currentStep) updates.current_step = data.currentStep;
    if (data.status) updates.status = data.status;

    // Recupera a tarefa para anexar ao histórico de passos se fornecido
    if (data.stepLog) {
      const { data: current } = await db
        .from("ai_tasks")
        .select("steps_log")
        .eq("id", data.taskId)
        .eq("user_id", identity.id)
        .single();

      const existingLogs = Array.isArray(current?.steps_log) ? current.steps_log : [];
      updates.steps_log = [...existingLogs, data.stepLog];
    }

    const { data: updated, error } = await db
      .from("ai_tasks")
      .update(updates)
      .eq("id", data.taskId)
      .eq("user_id", identity.id)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(`Falha ao atualizar progresso da tarefa: ${error?.message || "não encontrada"}`);
    }

    return updated;
  });

/**
 * Finaliza a tarefa com sucesso
 */
export const completeDurableAiTask = createServerFn({ method: "POST" })
  .validator(completeTaskSchema)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (!identity?.id) {
      throw new Error("Usuário não autenticado");
    }

    const now = new Date().toISOString();
    const { data: updated, error } = await db
      .from("ai_tasks")
      .update({
        status: "completed",
        progress_percent: 100,
        current_step: "Concluído",
        output_payload: data.outputPayload,
        actual_tokens: data.actualTokens,
        cost_wz: data.costWz,
        completed_at: now,
        updated_at: now,
      })
      .eq("id", data.taskId)
      .eq("user_id", identity.id)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(`Falha ao concluir tarefa de IA: ${error?.message || "não encontrada"}`);
    }

    return updated;
  });

/**
 * Cancela a execução de uma tarefa
 */
export const cancelDurableAiTask = createServerFn({ method: "POST" })
  .validator(cancelTaskSchema)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (!identity?.id) {
      throw new Error("Usuário não autenticado");
    }

    const now = new Date().toISOString();
    const { data: updated, error } = await db
      .from("ai_tasks")
      .update({
        status: "cancelled",
        current_step: data.reason ? `Cancelado: ${data.reason}` : "Cancelado pelo usuário",
        completed_at: now,
        updated_at: now,
      })
      .eq("id", data.taskId)
      .eq("user_id", identity.id)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(`Falha ao cancelar tarefa: ${error?.message || "não encontrada"}`);
    }

    return updated;
  });

/**
 * Lista as tarefas do usuário autenticado
 */
export const listUserDurableAiTasks = createServerFn({ method: "GET" })
  .validator(z.object({ status: z.string().optional(), limit: z.number().int().min(1).max(50).default(20) }))
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (!identity?.id) {
      return [];
    }

    let query = db
      .from("ai_tasks")
      .select("id, task_type, title, status, progress_percent, current_step, cost_wz, created_at, completed_at, heartbeat_at")
      .eq("user_id", identity.id)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.status && data.status !== "all") {
      query = query.eq("status", data.status);
    }

    const { data: tasks, error } = await query;
    if (error || !tasks) return [];
    return tasks;
  });
