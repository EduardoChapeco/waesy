import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

// ─── AUTOMAÇÕES / WORKFLOWS VISUAIS (BFF CANÔNICO) ───────────────────────────

export const listWorkflows = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { data, error } = await supabase
      .from("store_workflows")
      .select("id, title, description, trigger_type, status, execution_count, last_run_at, created_at, updated_at")
      .eq("store_id", identity.store_id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[automation] error listing workflows:", error);
    }

    return data || [];
  });

export const triggerWorkflowExecution = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), samplePayload: z.record(z.any()).optional() }))
  .handler(async ({ data: { id, samplePayload } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { data: wf, error: wfError } = await supabase
      .from("store_workflows")
      .select("*")
      .eq("id", id)
      .eq("store_id", identity.store_id)
      .single();

    if (wfError || !wf) {
      throw new Error("Workflow não encontrado para execução.");
    }

    const triggerData = samplePayload || {
      manual_trigger_by: identity.id,
      timestamp: new Date().toISOString(),
      source: "workspace_manual_test",
    };

    const actionNodes = (wf.nodes || []).filter((n: any) => n.type === "action");
    const resultData = {
      actions_dispatched: actionNodes.length,
      executed_by: identity.id,
      execution_mode: "manual_test",
      timestamp: new Date().toISOString(),
    };

    const { error: execError } = await supabase.from("store_workflow_executions").insert({
      workflow_id: id,
      store_id: identity.store_id,
      status: "success",
      trigger_data: triggerData,
      result_data: resultData,
    });

    if (execError) {
      console.error("[automation] error logging execution:", execError);
    }

    const nextExecutionCount = (wf.execution_count || 0) + 1;
    const nowStr = new Date().toISOString();

    await supabase
      .from("store_workflows")
      .update({
        execution_count: nextExecutionCount,
        last_run_at: nowStr,
      })
      .eq("id", id);

    return {
      success: true,
      execution_count: nextExecutionCount,
      last_run_at: nowStr,
      result: resultData,
    };
  });

export const getWorkflowById = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data: { id } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { data, error } = await supabase
      .from("store_workflows")
      .select("*")
      .eq("id", id)
      .eq("store_id", identity.store_id)
      .single();

    if (error || !data) throw new Error("Workflow não encontrado.");
    return data;
  });

export const createWorkflowSchema = z.object({
  title: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  description: z.string().optional().nullable(),
  triggerType: z.enum([
    "order_paid", "order_created", "order_cancelled",
    "customer_created", "lead_created", "lead_won", "lead_lost",
    "booking_confirmed", "booking_cancelled", "cart_abandoned",
    "product_low_stock", "manual",
  ]),
  nodes: z.array(z.any()).default([]),
  edges: z.array(z.any()).default([]),
});

export const createWorkflow = createServerFn({ method: "POST" })
  .validator(createWorkflowSchema)
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const defaultNodes = input.nodes.length > 0 ? input.nodes : [
      {
        id: "node-trigger",
        type: "trigger",
        title: input.triggerType,
        config: {},
      },
    ];

    const { data, error } = await supabase
      .from("store_workflows")
      .insert({
        store_id: identity.store_id,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        trigger_type: input.triggerType,
        nodes: defaultNodes,
        edges: input.edges || [],
        status: "draft",
        created_by: identity.id,
      })
      .select()
      .single();

    if (error) {
      console.error("[automation] error creating workflow:", error);
      throw new Error("Erro ao criar workflow.");
    }

    return data;
  });

export const updateWorkflowSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  triggerType: z.enum([
    "order_paid", "order_created", "order_cancelled",
    "customer_created", "lead_created", "lead_won", "lead_lost",
    "booking_confirmed", "booking_cancelled", "cart_abandoned",
    "product_low_stock", "manual",
  ]).optional(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
  status: z.enum(["active", "inactive", "draft", "archived"]).optional(),
});

export const updateWorkflow = createServerFn({ method: "POST" })
  .validator(updateWorkflowSchema)
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const updatePayload: any = {};
    if (input.title) updatePayload.title = input.title.trim();
    if (input.description !== undefined) updatePayload.description = input.description;
    if (input.triggerType) updatePayload.trigger_type = input.triggerType;
    if (input.nodes) updatePayload.nodes = input.nodes;
    if (input.edges) updatePayload.edges = input.edges;
    if (input.status) updatePayload.status = input.status;

    const { data, error } = await supabase
      .from("store_workflows")
      .update(updatePayload)
      .eq("id", input.id)
      .eq("store_id", identity.store_id)
      .select()
      .single();

    if (error) throw new Error("Erro ao atualizar workflow.");
    return data;
  });

export const toggleWorkflowStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), active: z.boolean() }))
  .handler(async ({ data: { id, active } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { error } = await supabase
      .from("store_workflows")
      .update({ status: active ? "active" : "inactive" })
      .eq("id", id)
      .eq("store_id", identity.store_id);

    if (error) throw new Error("Erro ao alterar status do workflow.");
    return { success: true, active };
  });

export const deleteWorkflow = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data: { id } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const { error } = await supabase
      .from("store_workflows")
      .delete()
      .eq("id", id)
      .eq("store_id", identity.store_id);

    if (error) throw new Error("Erro ao deletar workflow.");
    return { success: true };
  });

export const getWorkflowExecutions = createServerFn({ method: "GET" })
  .validator(z.object({ workflowId: z.string().uuid(), limit: z.number().int().min(1).max(100).default(20) }))
  .handler(async ({ data: { workflowId, limit } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { data } = await supabase
      .from("store_workflow_executions")
      .select("id, status, trigger_data, result_data, error_msg, executed_at")
      .eq("workflow_id", workflowId)
      .eq("store_id", identity.store_id)
      .order("executed_at", { ascending: false })
      .limit(limit);

    return data || [];
  });
