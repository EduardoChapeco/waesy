import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeCopilotSessionTelemetry } from "@/components/chat/manus-task-telemetry-sheet";
import {
  chunkProjectDocumentText,
  formatProjectKnowledgePromptBlock,
  retrieveRelevantProjectKnowledgeContext,
  scoreProjectChunks,
} from "@/services/copilot-projects.functions";
import {
  clearInMemoryKeyCooldowns,
  getBatchActiveKeysForProviders,
} from "@/services/api-orchestrator.functions";
import {
  circuitBreakers,
  executeAiCoreGateway,
  MAX_GATEWAY_EXTERNAL_HTTP_SUBREQUESTS,
} from "@/services/ai-core-gateway.functions";

const { fromCallHistory, mockState } = vi.hoisted(() => ({
  fromCallHistory: [] as string[],
  mockState: {
    poolRows: [] as Array<Record<string, unknown>>,
    secretRows: [] as Array<Record<string, unknown>>,
    projectRow: null as Record<string, unknown> | null,
    projectFileRows: [] as Array<Record<string, unknown>>,
  },
}));

vi.mock("@/lib/supabase", () => {
  const createQuery = (table: string) => {
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: "row-1" }, error: null }),
        }),
      }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => {
        if (table === "copilot_projects") {
          return { data: mockState.projectRow, error: null };
        }
        return { data: null, error: null };
      }),
      single: vi.fn(async () => ({ data: null, error: null })),
      then: (resolve: (val: any) => void) => {
        if (table === "api_key_pools") {
          resolve({ data: mockState.poolRows, error: null });
          return;
        }
        if (table === "secret_vault") {
          resolve({ data: mockState.secretRows, error: null });
          return;
        }
        if (table === "copilot_project_files") {
          resolve({ data: mockState.projectFileRows, error: null });
          return;
        }
        resolve({ data: [], error: null });
      },
    };
    return chain;
  };

  return {
    getServerClient: vi.fn(() => ({
      from: vi.fn((table: string) => {
        fromCallHistory.push(table);
        return createQuery(table);
      }),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  };
});

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn(async () => ({
    id: "user-copilot-test",
    store_id: "store-copilot-test",
    role: "admin",
  })),
  assertStoreAccess: vi.fn(async () => true),
  requireAdmin: vi.fn(async () => true),
  STAFF_ROLES: ["owner", "admin", "manager", "seller", "agent", "support", "operator"],
}));

describe("Microfase D — Subrequests Cloudflare, Hierarquia RAG e Telemetria Real", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    fromCallHistory.length = 0;
    mockState.poolRows = [];
    mockState.secretRows = [];
    mockState.projectRow = null;
    mockState.projectFileRows = [];
    clearInMemoryKeyCooldowns();
    circuitBreakers.clear();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("carrega chaves de múltiplos provedores em 1 única consulta consolidada em api_key_pools", async () => {
    process.env.GROQ_API_KEY = "env-groq-fallback-1";
    process.env.GEMINI_API_KEY = "env-gemini-fallback-1";

    const keyMap = await getBatchActiveKeysForProviders([
      "groq",
      "gemini",
      "openrouter",
      "openai",
      "anthropic",
    ]);

    expect(keyMap.groq.map((k) => k.rawKey)).toContain("env-groq-fallback-1");
    expect(keyMap.gemini.map((k) => k.rawKey)).toContain("env-gemini-fallback-1");

    const poolQueries = fromCallHistory.filter((t) => t === "api_key_pools");
    expect(poolQueries.length).toBe(1);
  });

  it("respeita o teto MAX_GATEWAY_EXTERNAL_HTTP_SUBREQUESTS quando todas as chaves falham em cascata", async () => {
    process.env.GROQ_API_KEYS = Array.from({ length: 8 }, (_, i) => `groq-dead-${i}`).join(",");
    process.env.GEMINI_API_KEYS = Array.from({ length: 8 }, (_, i) => `gemini-dead-${i}`).join(",");
    process.env.OPENROUTER_API_KEYS = Array.from({ length: 6 }, (_, i) => `or-dead-${i}`).join(",");

    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ error: { message: "429 Too Many Requests" } }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await executeAiCoreGateway({
      task: "chat",
      prompt: "Teste de orçamento de subrequests no Cloudflare Worker",
      bypassCache: true,
    });

    expect(res.success).toBe(false);
    expect(fetchMock).toHaveBeenCalled();
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(
      MAX_GATEWAY_EXTERNAL_HTTP_SUBREQUESTS,
    );
  });

  it("indexa documentos do projeto em blocos, ranqueia trechos relevantes e formata <PROJECT_KNOWLEDGE_BASE>", async () => {
    const docText = [
      "Capítulo 1 — Políticas de Pagamento: aceitamos PIX imediato com 5% de desconto.",
      "x".repeat(1200),
      "Capítulo 2 — Tarifas Especiais Chapada e Embarque SMO: saída garantida às 06h00 na praça central com seguro viagem incluso.",
    ].join("\n\n");

    const chunks = chunkProjectDocumentText(docText, 900, 120);
    expect(chunks.length).toBeGreaterThanOrEqual(2);

    const ranked = scoreProjectChunks(
      "Qual o horário de embarque SMO para Chapada?",
      chunks.map((c, idx) => ({ content_chunk: c, chunk_index: idx, filename: "Tarifario.md" })),
      2,
    );
    expect(ranked[0].content_chunk).toContain("Embarque SMO");

    mockState.projectRow = {
      id: "proj-1",
      title: "Excursões Serra 2027",
      system_instructions: "Sempre informe o horário de embarque oficial antes do valor.",
      store_id: "store-copilot-test",
      user_id: "user-copilot-test",
    };
    mockState.projectFileRows = [
      {
        id: "file-1",
        filename: "Roteiro_SMO.md",
        extracted_text: docText,
        status: "ready",
      },
    ];

    const retrieved = await retrieveRelevantProjectKnowledgeContext({
      projectId: "proj-1",
      query: "embarque SMO Chapada",
    });

    expect(retrieved.matchedFilesCount).toBe(1);
    expect(retrieved.formattedContext).toContain("<PROJECT_KNOWLEDGE_BASE>");
    expect(retrieved.formattedContext).toContain("Excursões Serra 2027");
    expect(retrieved.formattedContext).toContain("Roteiro_SMO.md");
    expect(retrieved.formattedContext).toContain("Embarque SMO");

    expect(
      formatProjectKnowledgePromptBlock({
        projectTitle: "Projeto Vazio",
        systemInstructions: "",
        snippets: [],
      }),
    ).toBe("");
  });

  it("elimina telemetria sintética e calcula métricas reais da conversa", () => {
    const emptyTelemetry = computeCopilotSessionTelemetry({ messages: [], backgroundTasks: [] });
    expect(emptyTelemetry.durationLabel).toBe("—");
    expect(emptyTelemetry.tokensUsedLabel).toBe("0 tokens");
    expect(emptyTelemetry.creditsUsedLabel).toBe("0 créditos");
    expect(emptyTelemetry.clusterNodeLabel).not.toContain("147.15.61.45");

    const activeTelemetry = computeCopilotSessionTelemetry({
      messages: [
        {
          createdAt: "2026-11-12T10:00:00Z",
          activitySteps: [
            { durationMs: 2500, tokensUsed: 420 },
            { durationMs: 3500, tokensUsed: 580 },
          ],
        },
      ],
      backgroundTasks: [{ cost_wz: 12 }],
    });
    expect(activeTelemetry.durationLabel).toBe("6s");
    expect(activeTelemetry.tokensUsedLabel).toBe("1.000 tokens");
    expect(activeTelemetry.creditsUsedLabel).toBe("12 $WZ");

    const telemetrySrc = fs.readFileSync(
      path.resolve(__dirname, "../components/chat/manus-task-telemetry-sheet.tsx"),
      "utf8",
    );
    expect(telemetrySrc).not.toContain("147.15.61.45");
    expect(telemetrySrc).not.toContain("5m 36s");
    expect(telemetrySrc).not.toContain("14.820 tokens");

    const workspaceCopilotSrc = fs.readFileSync(
      path.resolve(__dirname, "../routes/workspace.copilot.tsx"),
      "utf8",
    );
    expect(workspaceCopilotSrc).not.toContain("tasks={[]}");
    expect(workspaceCopilotSrc).toContain("listUserDurableAiTasks");
    expect(workspaceCopilotSrc).toContain("cancelDurableAiTask");
  });
});
