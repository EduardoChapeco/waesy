import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

const mockGateway = vi.hoisted(() => vi.fn());
const mockGatewayStream = vi.hoisted(() => vi.fn());
const mockPersistenceState = vi.hoisted(() => ({
  executions: new Map<string, any>(),
  steps: new Map<string, any[]>(),
}));

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: (table: string) => {
      if (table === "copilot_executions") {
        return {
          upsert: (row: any) => {
            mockPersistenceState.executions.set(row.id, { ...(mockPersistenceState.executions.get(row.id) || {}), ...row });
            return { throwOnError: () => Promise.resolve() };
          },
          update: (patch: any) => ({
            eq: (_col: string, id: string) => {
              const cur = mockPersistenceState.executions.get(id) || { id };
              mockPersistenceState.executions.set(id, { ...cur, ...patch });
              return { throwOnError: () => Promise.resolve() };
            },
          }),
          select: () => ({
            eq: (_col: string, val: string) => {
              const chain: any = {
                eq: () => chain,
                order: () => ({
                  limit: () => Promise.resolve({
                    data: [...mockPersistenceState.executions.values()].filter(
                      (r) => r.status === "paused" && r.current_phase === "PARTIAL_RESULT",
                    ),
                    error: null,
                  }),
                }),
                maybeSingle: () =>
                  Promise.resolve({
                    data: mockPersistenceState.executions.get(val) || null,
                    error: null,
                  }),
              };
              return chain;
            },
          }),
        };
      }
      if (table === "copilot_execution_steps") {
        return {
          upsert: (row: any) => {
            const list = mockPersistenceState.steps.get(row.execution_id) || [];
            const idx = list.findIndex((s) => s.step_id === row.step_id);
            if (idx >= 0) list[idx] = row;
            else list.push(row);
            mockPersistenceState.steps.set(row.execution_id, list);
            return { throwOnError: () => Promise.resolve() };
          },
          select: () => ({
            eq: (_c: string, id: string) => ({
              order: () =>
                Promise.resolve({
                  data: mockPersistenceState.steps.get(id) || [],
                  error: null,
                }),
            }),
          }),
        };
      }
      return {
        upsert: () => ({ throwOnError: () => Promise.resolve(), select: () => ({ single: () => Promise.resolve({ data: { id: "row-1" }, error: null }) }) }),
        update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }), throwOnError: () => Promise.resolve() }) }),
        insert: () => Promise.resolve({ data: null, error: null }),
        select: () => {
          const chain: any = {
            eq: () => chain,
            neq: () => chain,
            in: () => chain,
            ilike: () => chain,
            order: () => chain,
            limit: () => chain,
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
            single: () => Promise.resolve({ data: null, error: null }),
          };
          return chain;
        },
      };
    },
    rpc: () => Promise.resolve({ data: { ai_message_id: "ai-msg-resumed", ai_created_at: new Date().toISOString() }, error: null }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ error: null }),
        getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.waesy.test/${p}` } }),
      }),
    },
  }),
  getBrowserClient: () => ({}),
}));

vi.mock("@/services/ai-core-gateway.functions", () => ({
  executeAiCoreGateway: mockGateway,
  executeAiCoreGatewayStream: mockGatewayStream,
}));

vi.mock("@/services/api-orchestrator.functions", () => ({
  getBatchActiveKeysForProviders: vi.fn().mockResolvedValue({
    steel: [{ id: "steel-key-1", rawKey: "steel_test_secret" }],
  }),
  markKeyError: vi.fn().mockResolvedValue(undefined),
  recordKeyUsage: vi.fn().mockResolvedValue(undefined),
  executeUnifiedAiCall: vi.fn().mockResolvedValue({ text: "Síntese mock", usage: { totalTokens: 42 } }),
}));

vi.mock("@/services/secret-vault.functions", () => ({
  getActiveSecretForProvider: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/services/copilot-skill-policy", () => ({
  getEffectiveSkillPolicyForUser: vi.fn().mockResolvedValue({
    activeSlugs: ["web-agent"],
    disabledSlugs: [],
    blockedTools: [],
    explicitAllowedTools: null,
    customInstructions: [],
    modelPreference: null,
    skills: [],
    isToolAllowed: () => true,
  }),
}));

vi.mock("@/services/copilot-memory.functions", () => ({
  assembleHierarchicalCopilotContext: vi.fn().mockResolvedValue({
    formattedContext: "",
    companyRulesCount: 0,
    factsCount: 0,
    memoryChunksCount: 0,
  }),
  compactThreadContextIfNeeded: vi.fn().mockResolvedValue(null),
  saveCopilotArtifactRecord: vi.fn().mockResolvedValue(null),
  assembleLongTermContext: vi.fn().mockResolvedValue({ formattedContext: "", factsCount: 0, memoryChunksCount: 0 }),
  extractAndSaveFactsFromConversation: vi.fn().mockResolvedValue(undefined),
  storeSemanticMemoryChunk: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/mcp-connectors.functions", () => ({
  listActiveExternalMcpToolsForUser: vi.fn().mockResolvedValue([]),
  invokeExternalMcpToolForUser: vi.fn(),
}));

import {
  vfsWriteFile,
  vfsPatchFile,
  vfsReadFile,
  vfsListFiles,
  renderExecutionPlanMarkdown,
  type WorkspaceVfsMap,
} from "@/lib/ai/workspace-vfs";
import {
  evaluateSafeMathExpression,
  executeSafeComputeSandbox,
} from "@/lib/ai/safe-compute-sandbox";
import { runWebAgentLoop } from "@/lib/web-agent/agent-core";
import { executeBrowserAutomationTask } from "@/services/browser-automation-runner";
import { runCopilotReactOrchestrator } from "@/services/copilot-react-orchestrator";
import {
  controlCopilotExecution,
  loadCopilotExecutionForContinue,
} from "@/services/copilot-execution-persistence";
import { runSquadGraphExecution } from "@/services/ai-agent-squad-orchestrator.functions";
import { handleCronAiTasks } from "@/routes/api.cron.ai-tasks";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "99999999-9999-4999-8999-999999999999";
const STORE_ID = "22222222-2222-4222-8222-222222222222";
const THREAD_ID = "33333333-3333-4333-8333-333333333333";

describe("Waesy Copilot Nível Manus — VFS, Compute, Steel CDP, Subagentes Paralelos & Checkpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPersistenceState.executions.clear();
    mockPersistenceState.steps.clear();
  });

  afterEach(() => {
    delete process.env.WAESY_BROWSER_RUNNER_URL;
    delete process.env.WAESY_SANDBOX_RUNNER_URL;
    delete process.env.WAESY_AI_WORKER_TOKEN;
  });

  it("1. Workspace VFS: escreve, aplica patch cirúrgico, gera diff real e bloqueia path traversal", () => {
    const vfs: WorkspaceVfsMap = {};
    const first = vfsWriteFile(vfs, "dados/precos.csv", "item,preco\ncafe,10\nbolo,20");
    expect(first.file.version).toBe(1);
    expect(first.file.language).toBe("csv");

    const patched = vfsPatchFile(vfs, "dados/precos.csv", "bolo,20", "bolo,25");
    expect(patched.file.version).toBe(2);
    expect(patched.originalContent).toContain("bolo,20");
    expect(patched.diffPreview).toContain("- bolo,20");
    expect(patched.diffPreview).toContain("+ bolo,25");
    expect(vfsReadFile(vfs, "dados/precos.csv")?.content).toContain("bolo,25");
    expect(vfsListFiles(vfs)).toHaveLength(1);

    const planMd = renderExecutionPlanMarkdown("Pesquisa", [
      { id: "1", title: "Coletar preços", status: "completed" },
      { id: "2", title: "Calcular média", status: "pending" },
    ]);
    expect(planMd).toContain("- [x] Coletar preços");
    expect(planMd).toContain("- [ ] Calcular média");

    expect(() => vfsWriteFile(vfs, "../../etc/passwd", "x")).toThrow(/inseguro/i);
    expect(() => vfsWriteFile(vfs, "/root/secret.txt", "x")).not.toThrow(); // normalize strips leading slash safely
    expect(vfsReadFile(vfs, "root/secret.txt")?.path).toBe("root/secret.txt");
  });

  it("2. Safe Compute Sandbox: avalia expressões AST sem eval, processa CSV no VFS e falha honestamente sem VM remota", async () => {
    expect(evaluateSafeMathExpression("(1200 * 0.15) + round(sqrt(144), 2)")).toBe(192);
    expect(() => evaluateSafeMathExpression("10 / 0")).toThrow(/zero/i);
    expect(() => evaluateSafeMathExpression("process.exit(1)")).toThrow();

    const vfs: WorkspaceVfsMap = {};
    vfsWriteFile(vfs, "vendas.csv", "categoria,valor\ncafe,R$ 100,00\ncafe,R$ 200,00\nbolo,50");

    const stats = await executeSafeComputeSandbox(
      { operation: "dataset_stats", vfsPath: "vendas.csv", numericField: "valor" },
      vfs,
    );
    expect(stats.success).toBe(true);
    expect(stats.runtime).toBe("worker_ast_compute");
    expect(stats.data?.sum).toBe(350);
    expect(stats.data?.mean).toBeCloseTo(116.6667, 3);

    const grouped = await executeSafeComputeSandbox(
      { operation: "group_aggregate", vfsPath: "vendas.csv", groupByField: "categoria", numericField: "valor" },
      vfs,
    );
    expect(grouped.success).toBe(true);
    expect((grouped.data?.groups as any[])[0]).toMatchObject({ group: "cafe", count: 2, sum: 300 });

    const noVm = await executeSafeComputeSandbox({
      operation: "remote_exec",
      language: "python",
      code: "print(1+1)",
    });
    expect(noVm.success).toBe(false);
    expect(noVm.stderr).toContain("WAESY_SANDBOX_RUNNER_URL");
  });

  it("3. Agent Core & Steel CDP: executa ações interativas reais (click/type/scroll), captura liveViewerUrl e bloqueia SSRF", async () => {
    const ssrfRes = await executeBrowserAutomationTask({
      url: "http://169.254.169.254/latest/meta-data",
      goal: "SSRF test",
      userId: USER_ID,
      storeId: STORE_ID,
    });
    expect(ssrfRes.status).toBe("failed");
    expect(ssrfRes.stepsExecuted[0].outcome).toBe("blocked");

    // Teste de unitário do loop sem deps.act -> erro explícito em click (sem fake 'ok')
    let stepCalls = 0;
    const noActRes = await runWebAgentLoop(
      { goal: "Clicar", startUrl: "https://example.org" },
      {
        observe: async (url) => ({ url, text: "Página inicial", links: [] }),
        decide: async () => {
          stepCalls++;
          if (stepCalls === 1) return { type: "click", selector: "#btn" };
          return { type: "finish", answer: "Concluído" };
        },
      },
    );
    expect(noActRes.steps[0].outcome).toBe("error");
    expect(noActRes.steps[0].detail).toContain("CDP/Playwright");

    // Teste com deps.act interativo -> click + type + scroll funcionam
    let decideTurn = 0;
    const actMock = vi.fn().mockResolvedValue({
      url: "https://example.org/busca?q=waesy",
      text: "Resultados encontrados",
      links: [],
    });
    const withActRes = await runWebAgentLoop(
      { goal: "Buscar", startUrl: "https://example.org" },
      {
        observe: async (url) => ({ url, text: "Home", links: [] }),
        act: actMock,
        decide: async () => {
          decideTurn++;
          if (decideTurn === 1) return { type: "type", selector: "input[name='q']", text: "waesy", submit: true };
          return { type: "finish", answer: "Achou" };
        },
      },
    );
    expect(withActRes.status).toBe("finished");
    expect(actMock).toHaveBeenCalledTimes(1);
    expect(withActRes.steps[0].outcome).toBe("ok");

    // Mock Steel Sessions + CDP WebSocket end-to-end
    const originalFetch = globalThis.fetch;
    const originalWs = globalThis.WebSocket;

    class MockCdpWebSocket {
      private listeners = new Map<string, Array<(ev: any) => void>>();
      constructor() {
        setTimeout(() => {
          this.emit("open", {});
        }, 0);
      }
      addEventListener(type: string, cb: (ev: any) => void) {
        const arr = this.listeners.get(type) || [];
        arr.push(cb);
        this.listeners.set(type, arr);
      }
      private emit(type: string, ev: any) {
        for (const cb of this.listeners.get(type) || []) cb(ev);
      }
      send(raw: string) {
        const msg = JSON.parse(raw);
        let result: any = {};
        if (msg.method === "Target.getTargets") {
          result = { targetInfos: [{ targetId: "page-1", type: "page" }] };
        } else if (msg.method === "Target.attachToTarget") {
          result = { sessionId: "cdp-sess-1" };
        } else if (msg.method === "Runtime.evaluate") {
          const expr = String(msg.params?.expression || "");
          if (expr.includes("interactive")) {
            result = {
              result: {
                value: {
                  url: "https://example.org/painel",
                  title: "Painel Steel Ao Vivo",
                  text: "Conteúdo extraído via Steel CDP",
                  links: ["https://example.org/sobre"],
                  interactiveElements: [{ tag: "button", selector: "#enviar", label: "Enviar" }],
                },
              },
            };
          } else {
            result = { result: { value: { ok: true, x: 100, y: 200 } } };
          }
        } else if (msg.method === "Page.captureScreenshot") {
          result = { data: Buffer.from("fake-png-bytes-payload-1234567890-abcdef-uvwxyz").toString("base64") };
        }
        setTimeout(() => {
          this.emit("message", { data: JSON.stringify({ id: msg.id, result }) });
        }, 0);
      }
      close() {
        this.emit("close", {});
      }
    }

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "https://api.steel.dev/v1/sessions") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: "steel-sess-99",
              websocketUrl: "wss://connect.steel.dev?sessionId=steel-sess-99",
              sessionViewerUrl: "https://app.steel.dev/sessions/steel-sess-99/viewer",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ released: true }), { status: 200 }));
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;
    globalThis.WebSocket = MockCdpWebSocket as unknown as typeof WebSocket;

    try {
      const frames: any[] = [];
      const cdpRun = await executeBrowserAutomationTask({
        url: "https://example.org",
        goal: "Clicar em enviar e capturar tela",
        userId: USER_ID,
        storeId: STORE_ID,
        actions: [{ type: "click", selector: "#enviar" }],
        captureScreenshot: true,
        onFrame: (f) => {
          frames.push(f);
        },
      });
      expect(cdpRun.status).toBe("completed");
      expect(cdpRun.driver).toBe("steel_cdp_session");
      expect(cdpRun.liveViewerUrl).toBe("https://app.steel.dev/sessions/steel-sess-99/viewer");
      expect(cdpRun.screenshotUrl).toContain("browser-shots");
      expect(cdpRun.interactiveElements?.length).toBe(1);
      expect(frames[0]?.liveViewerUrl).toContain("app.steel.dev");
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.WebSocket = originalWs;
    }
  });

  it("4. ReAct Orquestrador: executa spawn_subagents em paralelo com isolamento, emite VFS diffs, checkpoint e retomada", async () => {
    let gatewayCallCount = 0;
    mockGateway.mockImplementation(async (req: any) => {
      gatewayCallCount += 1;
      if (req.module === "copilot_react_planner") {
        if (gatewayCallCount === 1) {
          return {
            success: true,
            result: {
              parsedJson: {
                type: "spawn_subagents",
                thought: "Dividir pesquisa entre dois especialistas",
                plan: [
                  { id: "p1", title: "Subagentes paralelos", status: "running" },
                  { id: "p2", title: "Calcular custo exato", status: "pending" },
                ],
                tasks: [
                  { id: "mercado", role: "@analista_mercado", goal: "Analisar demanda local" },
                  {
                    id: "calculo",
                    role: "@analista_custos",
                    goal: "Executar conta financeira",
                    toolName: "sandbox_compute",
                    toolArgs: { operation: "evaluate_expression", expression: "500 * 1.2" },
                  },
                ],
              },
            },
            metadata: { usage: { totalTokens: 120 } },
          };
        }
        return {
          success: true,
          result: {
            parsedJson: {
              type: "finish",
              thought: "Dados consolidados pelos subagentes",
            },
          },
          metadata: { usage: { totalTokens: 60 } },
        };
      }
      // Resposta dos subagentes isolados
      return {
        success: true,
        result: { text: `Parecer isolado para ${req.module}` },
        metadata: { usage: { totalTokens: 85 } },
      };
    });

    mockGatewayStream.mockImplementation(async (_req: any, onChunk: (t: string) => void) => {
      const txt = "Consolidado final baseado nos dois subagentes paralelos.";
      onChunk(txt);
      return {
        success: true,
        text: txt,
        metadata: { usage: { totalTokens: 90 } },
      };
    });

    const events: string[] = [];
    const res = await runCopilotReactOrchestrator({
      userPrompt: "Faça pesquisa paralela e cálculo de margem",
      context: {
        userId: USER_ID,
        storeId: STORE_ID,
        threadId: THREAD_ID,
        streamReact: true,
        onEvent: (ev) => {
          events.push(ev.type);
        },
      },
    });

    expect(res.fsmPhase).toBe("COMPLETED");
    expect(res.responseMessage).toContain("Consolidado final");
    expect(events).toContain("plan_updated");
    expect(events).toContain("file_updated");
    expect(res.activitySteps.some((s) => s.type === "subagent" && s.role === "@analista_mercado")).toBe(true);
    expect(res.activitySteps.some((s) => s.type === "subagent" && s.role === "@analista_custos")).toBe(true);
    expect((res.vfsFiles || []).some((f) => f.path === "agents/mercado.md")).toBe(true);
    expect((res.vfsFiles || []).some((f) => f.path === "agents/calculo.md")).toBe(true);
    expect((res.vfsFiles || []).some((f) => f.path === "plan.md")).toBe(true);

    // Teste de isolamento multi-tenant + checkpoint pause/resume + worker cron
    const savedExecId = res.executionId!;
    const deniedLoad = await loadCopilotExecutionForContinue({
      executionId: savedExecId,
      userId: OTHER_USER_ID,
      storeId: "88888888-8888-4888-8888-888888888888",
    });
    expect(deniedLoad).toBeNull();

    // Simula execução pausada em checkpoint para testar controle e cron worker
    const cpId = "44444444-4444-4444-8444-444444444444";
    mockPersistenceState.executions.set(cpId, {
      id: cpId,
      task_id: cpId,
      user_id: USER_ID,
      store_id: STORE_ID,
      thread_id: THREAD_ID,
      status: "paused",
      current_phase: "PARTIAL_RESULT",
      plan: [{ id: "step-1", title: "Etapa pendente", status: "pending" }],
      state: {
        userPrompt: "Finalizar análise após orientação humana",
        autoResume: true,
        pauseRequested: false,
        resumeCount: 1,
        observations: ["[Observação prévia]: Dados coletados"],
        toolRecords: [],
        sources: [],
        structuredWidgets: [],
        structuredBlocks: [],
        executedActions: ["mcp:search_catalog_products"],
        totalTokens: 50,
        vfsFiles: {},
      },
    });

    await controlCopilotExecution({
      executionId: cpId,
      userId: USER_ID,
      storeId: STORE_ID,
      action: "inject_guidance",
      guidance: "Priorizar fornecedores locais",
    });
    expect(mockPersistenceState.executions.get(cpId)?.state?.userGuidance).toBe("Priorizar fornecedores locais");

    // Unauthorized cron call returns 401
    process.env.WAESY_AI_WORKER_TOKEN = "secret-worker-token-test";
    const unauthCron = await handleCronAiTasks(new Request("https://usewaesy.test/api/cron/ai-tasks", { method: "POST" }));
    expect(unauthCron.status).toBe(401);

    // Authorized cron resumes paused checkpoint and completes
    const authCron = await handleCronAiTasks(
      new Request("https://usewaesy.test/api/cron/ai-tasks", {
        method: "POST",
        headers: { Authorization: "Bearer secret-worker-token-test" },
      }),
    );
    expect(authCron.status).toBe(200);
    const cronBody = await authCron.json();
    expect(cronBody.resumedCount).toBe(1);
    expect(cronBody.processed[0]).toMatchObject({ executionId: cpId, status: "completed" });
  });

  it("5. Squads Paralelos (deep_research_squad) executa parallel_group concorrente via Promise.allSettled", async () => {
    mockGateway.mockImplementation(async (req: any) => ({
      success: true,
      result: { text: `Resultado de ${req.module}` },
      metadata: { usage: { totalTokens: 40 }, costUsd: 0.001 },
    }));

    const squadRun = await runSquadGraphExecution(
      "deep_research_squad",
      { prompt: "Analisar lançamento de delivery gourmet" },
      { userId: USER_ID, storeId: STORE_ID },
    );
    expect(squadRun.status).toBe("completed");
    expect(squadRun.stepsCompleted).toBe(3);
    expect(squadRun.handoffs).toHaveLength(3);
    expect(squadRun.handoffs[0].contextPassed.parallelGroup).toBe("parallel_analysis");
    expect(squadRun.handoffs[1].contextPassed.parallelGroup).toBe("parallel_analysis");
  });

  it("6. Contratos UI & Bundle Budget Guard: componentes novos <= 250 linhas, kebab-case, sem Sparkles e no SSR shim", () => {
    const planBarPath = path.resolve(process.cwd(), "src/components/chat/manus-execution-plan-bar.tsx");
    const sandboxPath = path.resolve(process.cwd(), "src/components/chat/artifacts/artifact-code-sandbox.tsx");
    const vitePath = path.resolve(process.cwd(), "vite.config.ts");

    const planBarSrc = fs.readFileSync(planBarPath, "utf8");
    const sandboxSrc = fs.readFileSync(sandboxPath, "utf8");
    const viteSrc = fs.readFileSync(vitePath, "utf8");

    expect(planBarSrc.split("\n").length).toBeLessThanOrEqual(250);
    expect(sandboxSrc.split("\n").length).toBeLessThanOrEqual(250);
    expect(/\bSparkles?\b/.test(planBarSrc)).toBe(false);
    expect(/\bSparkles?\b/.test(sandboxSrc)).toBe(false);
    expect(viteSrc).toContain("components/chat/artifacts/artifact-code-sandbox");
  });
});
