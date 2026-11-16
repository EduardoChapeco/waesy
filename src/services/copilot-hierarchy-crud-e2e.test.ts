import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertStoreAccess, STAFF_ROLES } from "@/lib/identity-core";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "99999999-9999-4999-8999-999999999999";
const STORE_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_STORE_ID = "88888888-8888-4888-8888-888888888888";
const FOLDER_ID = "33333333-3333-4333-8333-333333333333";
const PROJECT_ID = "44444444-4444-4444-8444-444444444444";
const THREAD_ID = "55555555-5555-4555-8555-555555555555";
const TASK_ID = "66666666-6666-4666-8666-666666666666";

type RecordedOp = {
  table: string;
  op: "select" | "insert" | "update" | "delete" | "upsert";
  payload?: any;
  filters: Array<{ method: string; col: string; val: any }>;
};

const { mockIdentityState, dbOps, tableHandlers, resetAll } = vi.hoisted(() => {
  const ops: Array<{
    table: string;
    op: "select" | "insert" | "update" | "delete" | "upsert";
    payload?: any;
    filters: Array<{ method: string; col: string; val: any }>;
  }> = [];
  const handlers: Record<
    string,
    (ctx: {
      op: "select" | "insert" | "update" | "delete" | "upsert";
      payload?: any;
      filters: Array<{ method: string; col: string; val: any }>;
    }) => Promise<any> | any
  > = {};
  const idState: { current: any } = {
    current: {
      id: "11111111-1111-4111-8111-111111111111",
      role: "owner",
      store_id: "22222222-2222-4222-8222-222222222222",
      memberships: [
        {
          store_id: "22222222-2222-4222-8222-222222222222",
          role: "owner",
        },
      ],
    },
  };

  return {
    mockIdentityState: idState,
    dbOps: ops,
    tableHandlers: handlers,
    resetAll: () => {
      ops.length = 0;
      for (const key of Object.keys(handlers)) delete handlers[key];
      idState.current = {
        id: "11111111-1111-4111-8111-111111111111",
        role: "owner",
        store_id: "22222222-2222-4222-8222-222222222222",
        memberships: [
          {
            store_id: "22222222-2222-4222-8222-222222222222",
            role: "owner",
          },
        ],
      };
    },
  };
});

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: any) => ({
      handler: (fn: any) => async (args: any) => {
        const parsed = schema?.parse ? schema.parse(args?.data) : args?.data;
        return fn({ data: parsed });
      },
    }),
    handler: (fn: any) => async (args: any) => fn(args || {}),
  }),
}));

vi.mock("@/lib/supabase", () => {
  const createBuilder = (table: string) => {
    let op: RecordedOp["op"] = "select";
    let payload: any = undefined;
    const filters: Array<{ method: string; col: string; val: any }> = [];

    const execute = async () => {
      const record: RecordedOp = { table, op, payload, filters: [...filters] };
      dbOps.push(record);
      const handler = tableHandlers[table];
      if (!handler) return { data: op === "select" ? [] : null, error: null };
      const res = await handler(record);
      return res ?? { data: null, error: null };
    };

    const builder: any = {
      select: () => builder,
      insert: (data: any) => {
        op = "insert";
        payload = data;
        return builder;
      },
      update: (data: any) => {
        op = "update";
        payload = data;
        return builder;
      },
      upsert: (data: any) => {
        op = "upsert";
        payload = data;
        return builder;
      },
      delete: () => {
        op = "delete";
        return builder;
      },
      eq: (col: string, val: any) => {
        filters.push({ method: "eq", col, val });
        return builder;
      },
      in: (col: string, val: any) => {
        filters.push({ method: "in", col, val });
        return builder;
      },
      or: (val: any) => {
        filters.push({ method: "or", col: "or", val });
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      single: () => execute(),
      maybeSingle: () =>
        execute().then((res: any) =>
          Array.isArray(res?.data)
            ? { data: res.data[0] ?? null, error: res.error ?? null }
            : res,
        ),
      then: (onFulfilled: any, onRejected: any) => execute().then(onFulfilled, onRejected),
    };
    return builder;
  };

  return {
    getServerClient: () => ({
      from: (table: string) => createBuilder(table),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  };
});

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn(async () => mockIdentityState.current),
  assertStoreAccess: (identity: any, roles: any = STAFF_ROLES, targetStoreId?: string | null) =>
    assertStoreAccess(identity, roles, targetStoreId),
  STAFF_ROLES,
  requireAdmin: vi.fn(async () => true),
}));

vi.mock("@/services/ai-core-gateway.functions", () => ({
  executeAiCoreGateway: vi.fn(),
}));

import {
  updateCopilotFolder,
  deleteCopilotFolder,
  updateCopilotProject,
  deleteCopilotProject,
  assignThreadHierarchy,
} from "./copilot-projects.functions";
import {
  deleteAiConversationThread,
  renameAiConversationThread,
  toggleAiThreadArchived,
  toggleAiThreadPinned,
} from "./ai-conversations.functions";
import {
  updateAiScheduledTask,
  deleteAiScheduledTask,
} from "./ai-scheduled-tasks.functions";

describe("Copilot Hierarchy, Thread & Scheduled Task CRUD Lifecycle (Zero-Trust E2E)", () => {
  beforeEach(() => {
    resetAll();
  });

  it("atualiza e exclui pasta copilot_folders desvinculando filhos e bloqueando usuário não autorizado", async () => {
    tableHandlers.copilot_folders = async ({ op, payload }) => {
      if (op === "select") {
        return {
          data: { id: FOLDER_ID, user_id: USER_ID, store_id: STORE_ID, name: "Pasta Antiga" },
          error: null,
        };
      }
      if (op === "update") {
        return {
          data: {
            id: FOLDER_ID,
            user_id: USER_ID,
            store_id: STORE_ID,
            name: payload.name,
            icon: payload.icon ?? "folder",
            color: payload.color ?? null,
          },
          error: null,
        };
      }
      if (op === "delete") {
        return { data: { id: FOLDER_ID }, error: null };
      }
    };

    const renamed = await updateCopilotFolder({
      data: { folderId: FOLDER_ID, name: "Campanhas Q4" },
    });
    expect(renamed.name).toBe("Campanhas Q4");

    const delRes = await deleteCopilotFolder({ data: { folderId: FOLDER_ID } });
    expect(delRes).toEqual({ deleted: true, folderId: FOLDER_ID });

    // Verifica desvinculação explícita antes do delete da pasta
    const opOrder = dbOps.map((o) => `${o.table}:${o.op}`);
    const deleteIdx = opOrder.indexOf("copilot_folders:delete");
    expect(opOrder.indexOf("copilot_projects:update")).toBeLessThan(deleteIdx);
    expect(opOrder.indexOf("ai_threads:update")).toBeLessThan(deleteIdx);
    expect(opOrder.indexOf("chat_threads:update")).toBeLessThan(deleteIdx);

    // Negativo: usuário externo sem acesso ao tenant é rejeitado
    mockIdentityState.current = {
      id: OTHER_USER_ID,
      role: "customer",
      store_id: null,
      memberships: [],
    };
    await expect(
      updateCopilotFolder({ data: { folderId: FOLDER_ID, name: "Invasão" } }),
    ).rejects.toThrow();
    await expect(
      deleteCopilotFolder({ data: { folderId: FOLDER_ID } }),
    ).rejects.toThrow();
  });

  it("atualiza e exclui projeto copilot_projects limpando embeddings, arquivos e vínculos", async () => {
    tableHandlers.copilot_projects = async ({ op, payload }) => {
      if (op === "select") {
        return {
          data: {
            id: PROJECT_ID,
            user_id: USER_ID,
            store_id: STORE_ID,
            folder_id: FOLDER_ID,
            title: "Projeto Base",
          },
          error: null,
        };
      }
      if (op === "update") {
        return {
          data: {
            id: PROJECT_ID,
            user_id: USER_ID,
            store_id: STORE_ID,
            folder_id: payload.folder_id ?? null,
            title: payload.title,
            description: payload.description ?? null,
          },
          error: null,
        };
      }
      if (op === "delete") return { data: { id: PROJECT_ID }, error: null };
    };

    const updated = await updateCopilotProject({
      data: {
        projectId: PROJECT_ID,
        title: "Lançamento Natal 2027",
        description: "Regras oficiais de atendimento",
        folderId: null,
      },
    });
    expect(updated.title).toBe("Lançamento Natal 2027");
    expect(updated.description).toBe("Regras oficiais de atendimento");

    const delProj = await deleteCopilotProject({ data: { projectId: PROJECT_ID } });
    expect(delProj).toEqual({ deleted: true, projectId: PROJECT_ID });

    const opOrder = dbOps.map((o) => `${o.table}:${o.op}`);
    const projDelIdx = opOrder.indexOf("copilot_projects:delete");
    expect(opOrder.indexOf("ai_threads:update")).toBeLessThan(projDelIdx);
    expect(opOrder.indexOf("copilot_project_embeddings:delete")).toBeLessThan(projDelIdx);
    expect(opOrder.indexOf("copilot_project_files:delete")).toBeLessThan(projDelIdx);
  });

  it("move conversa entre projeto/pasta (assignThreadHierarchy), herda folder_id, faz fallback 42703 e bloqueia cross-tenant", async () => {
    tableHandlers.copilot_projects = async () => ({
      data: {
        id: PROJECT_ID,
        user_id: USER_ID,
        store_id: STORE_ID,
        folder_id: FOLDER_ID,
      },
      error: null,
    });
    tableHandlers.copilot_folders = async () => ({
      data: { id: FOLDER_ID, user_id: USER_ID, store_id: STORE_ID },
      error: null,
    });

    let simulate42703 = false;
    tableHandlers.ai_threads = async ({ op, payload }) => {
      if (op === "select") {
        return {
          data: {
            id: THREAD_ID,
            user_id: USER_ID,
            workspace_id: STORE_ID,
            metadata: { source: "chat" },
          },
          error: null,
        };
      }
      if (op === "update") {
        if (simulate42703 && "folder_id" in payload) {
          return { data: null, error: { message: '42703 column "folder_id" does not exist' } };
        }
        return {
          data: {
            id: THREAD_ID,
            folder_id: payload.folder_id ?? payload.metadata?.folder_id ?? null,
            project_id: payload.project_id ?? payload.metadata?.project_id ?? null,
          },
          error: null,
        };
      }
    };

    const moved = await assignThreadHierarchy({
      data: { threadId: THREAD_ID, projectId: PROJECT_ID },
    });
    expect(moved).toEqual({
      id: THREAD_ID,
      folder_id: FOLDER_ID,
      project_id: PROJECT_ID,
    });

    // Fallback schema legado (42703) salva em metadata
    simulate42703 = true;
    const movedFallback = await assignThreadHierarchy({
      data: { threadId: THREAD_ID, projectId: PROJECT_ID, folderId: FOLDER_ID },
    });
    expect(movedFallback).toEqual({
      id: THREAD_ID,
      folder_id: FOLDER_ID,
      project_id: PROJECT_ID,
    });

    // Cross-tenant / outro usuário sem vínculo não move conversa
    mockIdentityState.current = {
      id: OTHER_USER_ID,
      role: "owner",
      store_id: OTHER_STORE_ID,
      memberships: [{ store_id: OTHER_STORE_ID, role: "owner" }],
    };
    await expect(
      assignThreadHierarchy({ data: { threadId: THREAD_ID, projectId: null, folderId: null } }),
    ).rejects.toThrow();
  });

  it("executa rename/pin/archive/delete de ai_threads com verificação de resultado e isolamento multi-tenant", async () => {
    tableHandlers.ai_threads = async ({ op }) => {
      if (op === "select") {
        return {
          data: { id: THREAD_ID, user_id: USER_ID, workspace_id: STORE_ID },
          error: null,
        };
      }
      if (op === "update") return { data: null, error: null };
      if (op === "delete") return { data: { id: THREAD_ID }, error: null };
    };

    expect(
      await renameAiConversationThread({ data: { threadId: THREAD_ID, title: "Planejamento 2027" } }),
    ).toEqual({ success: true, title: "Planejamento 2027" });
    expect(await toggleAiThreadPinned({ data: { threadId: THREAD_ID, isPinned: true } })).toEqual({
      success: true,
      isPinned: true,
    });
    expect(await toggleAiThreadArchived({ data: { threadId: THREAD_ID, isArchived: true } })).toEqual({
      success: true,
      isArchived: true,
    });
    expect(await deleteAiConversationThread({ data: { threadId: THREAD_ID } })).toEqual({
      success: true,
    });

    const delOrder = dbOps.map((o) => `${o.table}:${o.op}`);
    const threadDelIdx = delOrder.lastIndexOf("ai_threads:delete");
    expect(delOrder.indexOf("ai_messages:delete")).toBeLessThan(threadDelIdx);
    expect(delOrder.indexOf("ai_artifacts:delete")).toBeLessThan(threadDelIdx);
    expect(delOrder.indexOf("ai_tasks:update")).toBeLessThan(threadDelIdx);
    expect(delOrder.indexOf("copilot_executions:update")).toBeLessThan(threadDelIdx);

    // Cross-tenant negado mesmo recebendo workspace_id na thread (STAFF_ROLES check)
    mockIdentityState.current = {
      id: OTHER_USER_ID,
      role: "owner",
      store_id: OTHER_STORE_ID,
      memberships: [{ store_id: OTHER_STORE_ID, role: "owner" }],
    };
    await expect(
      deleteAiConversationThread({ data: { threadId: THREAD_ID } }),
    ).rejects.toThrow(/Unauthorized/i);
    await expect(
      renameAiConversationThread({ data: { threadId: THREAD_ID, title: "Invasão" } }),
    ).rejects.toThrow(/Unauthorized/i);

    // Se delete não afetar nenhuma linha (RLS/not found), lança erro explícito
    mockIdentityState.current = {
      id: USER_ID,
      role: "owner",
      store_id: STORE_ID,
      memberships: [{ store_id: STORE_ID, role: "owner" }],
    };
    tableHandlers.ai_threads = async ({ op }) => {
      if (op === "select") {
        return { data: { id: THREAD_ID, user_id: USER_ID, workspace_id: null }, error: null };
      }
      if (op === "delete") return { data: null, error: null };
    };
    await expect(
      deleteAiConversationThread({ data: { threadId: THREAD_ID } }),
    ).rejects.toThrow("Falha ao excluir conversa");
  });

  it("atualiza e exclui tarefa agendada em ai_scheduled_tasks com isolamento por user_id", async () => {
    tableHandlers.ai_scheduled_tasks = async ({ op, payload, filters }) => {
      const userFilter = filters.find((f) => f.col === "user_id")?.val;
      if (userFilter !== USER_ID) return { data: null, error: null };

      if (op === "update") {
        return {
          data: {
            id: TASK_ID,
            title: payload.title,
            prompt: payload.prompt,
            cron_expression: payload.cron_expression,
            task_type: "autonomous_prompt",
            is_active: true,
            last_run_at: null,
            next_run_at: null,
            run_count: 0,
            created_at: new Date().toISOString(),
          },
          error: null,
        };
      }
      if (op === "delete") return { data: { id: TASK_ID }, error: null };
    };

    const updated = await updateAiScheduledTask({
      data: {
        taskId: TASK_ID,
        title: "Resumo Comercial",
        prompt: "Analise pedidos e estoque críticos do dia.",
        cronExpression: "0 8 * * 1-5",
      },
    });
    expect(updated.title).toBe("Resumo Comercial");
    expect(updated.cron_expression).toBe("0 8 * * 1-5");

    const deleted = await deleteAiScheduledTask({ data: { taskId: TASK_ID } });
    expect(deleted).toEqual({ deleted: true, taskId: TASK_ID });

    // Outro usuário não pode editar ou excluir tarefa alheia
    mockIdentityState.current = { id: OTHER_USER_ID, role: "owner", store_id: STORE_ID, memberships: [] };
    await expect(
      updateAiScheduledTask({ data: { taskId: TASK_ID, title: "Roubo" } }),
    ).rejects.toThrow("Falha ao atualizar tarefa agendada");
    await expect(deleteAiScheduledTask({ data: { taskId: TASK_ID } })).rejects.toThrow(
      "Falha ao excluir tarefa agendada",
    );
  });
});
