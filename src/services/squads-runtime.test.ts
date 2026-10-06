import { beforeEach, describe, expect, it, vi } from "vitest";

const { getServerClientMock, executeUnifiedAiCallMock } = vi.hoisted(() => ({
  getServerClientMock: vi.fn(),
  executeUnifiedAiCallMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({ getServerClient: getServerClientMock }));
vi.mock("./api-orchestrator.functions", () => ({ executeUnifiedAiCall: executeUnifiedAiCallMock }));

import { approveSquadRun, CANONICAL_AGENTS, triggerSquadRun } from "./squads-runtime.functions";

const storeId = "c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7";
const squadId = "af13efc2-8c7d-4e22-a2be-c918f96b316d";
const templateId = "dcfdaf56-ae8b-4bb5-ae86-71532547d8a3";
const runId = "41f561fd-d617-48fc-b9c6-53982a6ecdd3";
const startedAt = "2026-10-06T12:00:00.000Z";

function createSupabaseMock(options: { failInsert?: boolean; approveReturnsRow?: boolean } = {}) {
  let runRow: any = null;
  const insertedPayloads: any[] = [];
  const agentRows = [
    {
      task_order: 1,
      role_label: "Analista configurado",
      agent_id: "agent-marketing-configured",
      agent_registry: { id: "agent-marketing-configured", name: "Agente de marketing configurado", category: "marketing" },
    },
    {
      task_order: 2,
      role_label: "Auditor fiscal",
      agent_id: "agent-finance-wrong-department",
      agent_registry: { id: "agent-finance-wrong-department", name: "Agente fiscal", category: "finance_tax" },
    },
  ];

  return {
    insertedPayloads,
    from(table: string) {
      if (table === "store_squads") {
        const filters: Record<string, unknown> = {};
        const query: any = {
          select: () => query,
          eq: (key: string, value: unknown) => { filters[key] = value; return query; },
          maybeSingle: async () => ({
            data: filters.id === squadId && filters.store_id === storeId
              ? {
                  id: squadId,
                  store_id: storeId,
                  squad_template_id: templateId,
                  custom_name: "Marketing",
                  squad_templates: { id: templateId, slug: "marketing", name: "Marketing", department: "marketing" },
                }
              : null,
            error: null,
          }),
        };
        return query;
      }

      if (table === "squad_template_agents") {
        const query: any = {
          select: () => query,
          eq: () => query,
          order: async () => ({ data: agentRows, error: null }),
        };
        return query;
      }

      if (table === "store_squad_runs") {
        let action: "insert" | "update" | null = null;
        let payload: any;
        const filters: Record<string, unknown> = {};
        const query: any = {
          insert: (value: any) => { action = "insert"; payload = value; insertedPayloads.push(value); return query; },
          update: (value: any) => { action = "update"; payload = value; return query; },
          eq: (key: string, value: unknown) => { filters[key] = value; return query; },
          select: () => query,
          maybeSingle: async () => {
            if (action === "insert") {
              if (options.failInsert) return { data: null, error: { message: "insert failed" } };
              runRow = {
                ...payload,
                id: runId,
                started_at: undefined,
                completed_at: null,
                total_tokens_consumed: 0,
                cost_estimate_cents: 0,
              };
              return { data: runRow, error: null };
            }
            if (action === "update" && options.approveReturnsRow !== false && runRow?.id === filters.id && runRow.store_id === filters.store_id && runRow.status === filters.status) {
              runRow = { ...runRow, ...payload };
              return { data: runRow, error: null };
            }
            return { data: null, error: null };
          },
        };
        return query;
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };
}

function setup(options?: Parameters<typeof createSupabaseMock>[0]) {
  const supabase = createSupabaseMock(options);
  getServerClientMock.mockReturnValue(supabase);
  return supabase;
}

function successfulAiResult(recommendations: unknown) {
  return {
    text: JSON.stringify(recommendations),
    content: JSON.stringify(recommendations),
    parsedJson: recommendations,
    provider: "openrouter",
    model: "test-model",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Squad runtime — audit safety", () => {
  it("não produz relatório, métricas ou credenciais quando não há dados operacionais", async () => {
    setup();
    const run = await triggerSquadRun(storeId, squadId, {
      inputPayload: { goal: "Avaliar a operação" },
    });

    expect(executeUnifiedAiCallMock).not.toHaveBeenCalled();
    expect(run.id).toBe(runId);
    expect(run.id).not.toMatch(/^run_/);
    expect(run.started_at).toBeUndefined();
    expect(run.status).toBe("failed");
    expect(run.output_artifacts).toMatchObject({
      assessment_status: "not_evaluated",
      acceptanceVerified: false,
      review_status: "not_evaluated",
      pending_approval_items: [],
      kpis_monitored: [],
      compliance_status: "not_evaluated",
    });
    expect(run.output_artifacts.executive_summary).toContain("Nenhum relatório");
    expect(JSON.stringify(run.output_artifacts)).not.toMatch(/confidence_score|24\.6%|7\.8%|R\$ 14\.820|LTV\/CAC/);
    expect(run.total_tokens_consumed).toBeUndefined();
    expect(run.cost_estimate_cents).toBeUndefined();
    expect(CANONICAL_AGENTS.every((agent) =>
      agent.curriculum.academic_background.length === 0 &&
      agent.curriculum.certifications.length === 0 &&
      agent.curriculum.years_experience === null &&
      agent.curriculum.specialties.length === 0
    )).toBe(true);
  });

  it("marca falha explícita quando o gateway sinaliza erro, sem fallback de domínio", async () => {
    setup();
    executeUnifiedAiCallMock.mockResolvedValue({ success: false, error: { message: "provider unavailable" } });

    const run = await triggerSquadRun(storeId, squadId, {
      inputPayload: { goal: "Revisar", operational_data: { orders: [{ id: "order-1" }] } },
    });

    expect(run.status).toBe("failed");
    expect(run.error_log).toContain("provider unavailable");
    expect(run.output_artifacts.assessment_status).toBe("not_evaluated");
    expect(run.output_artifacts.pending_approval_items).toEqual([]);
    expect(run.output_artifacts.acceptanceVerified).toBe(false);
  });

  it("rejeita JSON/schema inválido, inclusive scores e atribuição fora do departamento", async () => {
    setup();
    executeUnifiedAiCallMock.mockResolvedValueOnce(successfulAiResult({
      recommendations: [{ title: "Revisar", description: "Revisão proposta", confidence_score: 96 }],
    }));
    const invalidSchemaRun = await triggerSquadRun(storeId, squadId, {
      inputPayload: { operational_data: { orders: [1] } },
    });
    expect(invalidSchemaRun.status).toBe("failed");
    expect(invalidSchemaRun.output_artifacts.pending_approval_items).toEqual([]);
    expect(JSON.stringify(invalidSchemaRun.output_artifacts)).not.toContain("confidence_score");

    executeUnifiedAiCallMock.mockResolvedValueOnce(successfulAiResult({
      recommendations: [{ title: "Fiscal", description: "Atribuição indevida", assigned_agent_id: "agent-finance-wrong-department" }],
    }));
    const wrongDepartmentRun = await triggerSquadRun(storeId, squadId, {
      inputPayload: { operational_data: { orders: [1] } },
    });
    expect(wrongDepartmentRun.status).toBe("failed");
    expect(wrongDepartmentRun.current_agent_id).toBe("agent-marketing-configured");
    expect(wrongDepartmentRun.output_artifacts.pending_approval_items).toEqual([]);
  });

  it("aceita somente recomendações validadas como rascunho para revisão humana, sem confiança fictícia", async () => {
    setup();
    executeUnifiedAiCallMock.mockResolvedValue(successfulAiResult({
      recommendations: [{
        title: "Revisar dados de vendas",
        description: "Conferir os registros fornecidos antes de decidir qualquer ação.",
        assigned_agent_id: "agent-marketing-configured",
      }],
    }));

    const run = await triggerSquadRun(storeId, squadId, {
      inputPayload: { goal: "Preparar recomendação", operational_data: { orders: [{ id: "order-1", total: 100 }] } },
    });

    expect(run.status).toBe("needs_approval");
    expect(run.current_agent_id).toBe("agent-marketing-configured");
    expect(run.output_artifacts).toMatchObject({
      assessment_status: "not_evaluated",
      acceptanceVerified: false,
      review_status: "needs_human_approval",
      compliance_status: "not_evaluated",
      kpis_monitored: [],
    });
    const artifacts = run.output_artifacts as Record<string, any>;
    expect(artifacts.pending_approval_items[0].assigned_agent).toBe("Agente de marketing configurado");
    expect(artifacts.pending_approval_items[0]).not.toHaveProperty("confidence_score");
    expect(run.total_tokens_consumed).toBeUndefined();
    expect(run.cost_estimate_cents).toBeUndefined();
  });

  it("não inventa ID quando a inserção falha e não aprova sem linha atualizada", async () => {
    setup({ failInsert: true });
    await expect(triggerSquadRun(storeId, squadId, { inputPayload: {} })).rejects.toThrow("Falha ao persistir");

    setup({ approveReturnsRow: false });
    await expect(approveSquadRun(storeId, runId)).rejects.toThrow("A aprovação não foi confirmada");
  });

  it("conclui somente uma aprovação confirmada e preserva a ausência de metadados de uso", async () => {
    const supabase = setup();
    executeUnifiedAiCallMock.mockResolvedValue(successfulAiResult({
      recommendations: [{ title: "Revisar", description: "Rascunho", assigned_agent_id: "agent-marketing-configured" }],
    }));
    const draft = await triggerSquadRun(storeId, squadId, {
      inputPayload: { operational_data: { orders: [{ id: "order-1" }] } },
    });
    const approved = await approveSquadRun(storeId, draft.id);

    expect(approved.id).toBe(runId);
    expect(approved.status).toBe("completed");
    expect(approved.completed_at).toBeTruthy();
    expect(approved.started_at).toBeUndefined();
    expect(approved.output_artifacts.acceptanceVerified).toBe(false);
    expect(approved.total_tokens_consumed).toBeUndefined();
    expect(approved.cost_estimate_cents).toBeUndefined();
    expect(supabase.insertedPayloads[0]).not.toHaveProperty("total_tokens_consumed");
    expect(supabase.insertedPayloads[0]).not.toHaveProperty("cost_estimate_cents");
  });
});
