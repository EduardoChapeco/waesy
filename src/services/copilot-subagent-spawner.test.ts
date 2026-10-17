import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  spawnSubagentTask,
  executeSubagentDAG,
  executeAutonomousCopilotTask,
} from "./autonomous-copilot-orchestrator";

// Mock supabase e telemetria
vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: () => ({
      upsert: () => ({ throwOnError: () => Promise.resolve() }),
      update: () => ({ eq: () => ({ throwOnError: () => Promise.resolve() }) }),
      insert: () => Promise.resolve({ data: null, error: null }),
      select: () => ({
        eq: () => ({
          gte: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: null }),
              }),
            }),
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn().mockResolvedValue({
    id: "user-copilot-test-01",
    store_id: "store-test-01",
  }),
}));

vi.mock("./copilot-execution-persistence", () => ({
  startCopilotExecution: vi.fn().mockResolvedValue(undefined),
  completeCopilotExecution: vi.fn().mockResolvedValue(undefined),
  createPersistedActivitySteps: vi.fn().mockReturnValue([]),
  persistCopilotExecutionStep: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./mining/places-harvester", () => ({
  harvestAndPersistPlaces: vi.fn().mockResolvedValue([
    {
      id: "place-1",
      name: "Restaurante Teste",
      category: "Restaurante",
      address: "Rua Teste, 100",
      phone: "49999999999",
      lat: -27.1,
      lng: -52.6,
    },
  ]),
}));

describe("Copilot Camada 2 — Concurrent Subagent Spawner DAG", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("spawna subtarefa individual com role canônica e parentTaskId atribuídos", async () => {
    const parentTaskId = "parent-task-uuid-001";
    const result = await spawnSubagentTask({
      role: "@planner",
      parentTaskId,
      domain: "lodging_tourism",
      label: "Mapeamento de Requisitos (@planner)",
      detail: "Decomposição sintática e verificação de dependências",
      execute: async (subtaskId) => {
        expect(subtaskId).toBeDefined();
        return {
          detail: "Plano estruturado em 3 subetapas",
          tokensUsed: 55,
          data: { plannedSteps: 3 },
        };
      },
    });

    expect(result.success).toBe(true);
    expect(result.role).toBe("@planner");
    expect(result.parentTaskId).toBe(parentTaskId);
    expect(result.subtaskId).toBeDefined();
    expect(result.step.status).toBe("completed");
    expect(result.step.role).toBe("@planner");
    expect(result.step.parentTaskId).toBe(parentTaskId);
    expect(result.step.tokensUsed).toBe(55);
    expect(result.data?.plannedSteps).toBe(3);
  });

  it("executa DAG concorrente de subagentes (@planner -> [@investigator, @harvester] -> @critic)", async () => {
    const parentTaskId = "dag-parent-task-123";
    const harvestMock = vi.fn().mockResolvedValue({
      detail: "15 hotéis minerados com telemetria GPS e tarifas reais",
      tokensUsed: 220,
      data: { hotelsCount: 15 },
    });

    const dagResult = await executeSubagentDAG(
      {
        parentTaskId,
        domain: "lodging_tourism",
        targetQuery: "hotéis em Chapecó",
        prompt: "quero hotéis e resorts em Chapecó",
        city: "Chapecó",
        state: "SC",
      },
      harvestMock
    );

    expect(dagResult.success).toBe(true);
    expect(harvestMock).toHaveBeenCalled();
    expect(dagResult.steps.length).toBe(4);

    // Confere atribuição estrita de papéis no DAG
    const roles = dagResult.steps.map((s) => s.role);
    expect(roles).toEqual(["@planner", "@investigator", "@harvester", "@critic"]);

    // Confere que todos os passos possuem parentTaskId herdado
    dagResult.steps.forEach((step) => {
      expect(step.parentTaskId).toBe(parentTaskId);
      expect(step.status).toBe("completed");
    });

    // Confere que o crítico validou ausência de dados fictícios
    expect(dagResult.criticResult?.step.detail).toContain("0 dados fictícios");
  });

  it("trata falha em subagente honestamente sem criar dados sintéticos", async () => {
    const parentTaskId = "dag-parent-fail-456";
    const harvestFailingMock = vi.fn().mockRejectedValue(
      new Error("Overpass API 503 Service Unavailable")
    );

    const dagResult = await executeSubagentDAG(
      {
        parentTaskId,
        domain: "lodging_tourism",
        targetQuery: "pousadas em Chapecó",
        prompt: "buscar pousadas",
        city: "Chapecó",
        state: "SC",
      },
      harvestFailingMock
    );

    expect(dagResult.success).toBe(false);
    expect(dagResult.harvesterResult?.status).toBe("failed");
    expect(dagResult.harvesterResult?.error).toContain("Overpass API 503");

    // O crítico deve reportar a falha detectada
    expect(dagResult.criticResult?.status).toBe("failed");
    expect(dagResult.criticResult?.step.detail).toContain("Falha detectada");
  });

  it("integra subagentes (@planner, @investigator, @critic) no ciclo de vida de executeAutonomousCopilotTask", async () => {
    const res = await executeAutonomousCopilotTask("buscar restaurantes em Chapecó", {
      activeCity: "Chapecó",
      activeState: "SC",
    });

    expect(res.taskId).toBeDefined();
    expect(res.steps.length).toBeGreaterThanOrEqual(3);

    const roles = res.steps.map((s) => s.role).filter(Boolean);
    expect(roles).toContain("@planner");
    expect(roles).toContain("@investigator");
    expect(roles).toContain("@critic");

    // Confere que os passos filhos possuem o parentTaskId igual ao taskId principal
    const subagentSteps = res.steps.filter((s) => s.role && s.role !== "@planner");
    subagentSteps.forEach((s) => {
      expect(s.parentTaskId).toBe(res.taskId);
    });
  });
});
