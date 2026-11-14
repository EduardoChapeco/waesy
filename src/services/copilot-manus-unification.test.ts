import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const gatewayMock = vi.fn();
const mcpBuiltinMock = vi.fn();
const listExternalMcpMock = vi.fn();
const invokeExternalMcpMock = vi.fn();
const getActiveSkillsMock = vi.fn();
const runSquadMock = vi.fn();

vi.mock("./ai-core-gateway.functions", () => ({
  executeAiCoreGateway: (...args: unknown[]) => gatewayMock(...args),
}));

vi.mock("./mcp-server.functions", () => ({
  executeMcpToolCall: (...args: unknown[]) => mcpBuiltinMock(...args),
}));

vi.mock("./mcp-connectors.functions", () => ({
  listActiveExternalMcpToolsForUser: (...args: unknown[]) => listExternalMcpMock(...args),
  invokeExternalMcpToolForUser: (...args: unknown[]) => invokeExternalMcpMock(...args),
}));

vi.mock("./ai-skills-router.functions", () => ({
  getActiveSkillSlugsForUser: (...args: unknown[]) => getActiveSkillsMock(...args),
}));

vi.mock("./ai-agent-squad-orchestrator.functions", () => ({
  runSquadGraphExecution: (...args: unknown[]) => runSquadMock(...args),
}));

import {
  executeAiCopilotPipeline,
  extractPdfTextBestEffort,
  resolveCopilotAttachments,
} from "./ai-conversations.functions";

function resolveRepoPath(relPath: string): string {
  return path.resolve(process.cwd(), relPath);
}

describe("SPEC-20261113-COPILOT-MANUS-E2E-UNIFICATION — Regressão Ponta a Ponta", () => {
  beforeEach(() => {
    gatewayMock.mockReset();
    mcpBuiltinMock.mockReset();
    listExternalMcpMock.mockReset();
    invokeExternalMcpMock.mockReset();
    getActiveSkillsMock.mockReset();
    runSquadMock.mockReset();
  });

  it("EARS-01: aciona Squad Orchestrator em comandos /squad e respeita opt-out de skill no DB", async () => {
    getActiveSkillsMock.mockResolvedValue(["squad_orchestrator", "commercial_proposal"]);
    listExternalMcpMock.mockResolvedValue([]);
    gatewayMock.mockResolvedValue({
      success: true,
      result: { parsedJson: { intent: "general_chat", message: "" } },
    });
    runSquadMock.mockResolvedValue({
      runId: "squad_run_test_1",
      squadSlug: "publishing_squad",
      status: "completed",
      stepsCompleted: 3,
      totalTokens: 250,
      totalCostUsd: 0.002,
      durationMs: 420,
      handoffs: [
        {
          stepIndex: 1,
          fromAgent: "user",
          toAgent: "content_strategist",
          objective: "Etapa 1: Pauta editorial",
          contextPassed: {},
          workCompleted: { output: "Pauta estruturada" },
          workRemaining: "Copy",
          costUsd: 0.001,
          latencyMs: 120,
          acceptanceVerified: true,
        },
        {
          stepIndex: 2,
          fromAgent: "content_strategist",
          toAgent: "brand_copywriter",
          objective: "Etapa 2: Redação final",
          contextPassed: {},
          workCompleted: { output: "Post pronto para publicação." },
          workRemaining: "Nenhum",
          costUsd: 0.001,
          latencyMs: 180,
          acceptanceVerified: true,
        },
      ],
      finalOutput: { output: "Post pronto para publicação." },
    });

    const result = await executeAiCopilotPipeline(
      "/squad criar post de campanha para coleção local",
      {},
      { userId: "user-123", storeId: "store-123", city: "Chapecó" },
    );

    expect(runSquadMock).toHaveBeenCalledTimes(1);
    expect(runSquadMock).toHaveBeenCalledWith(
      "publishing_squad",
      expect.objectContaining({ prompt: expect.stringContaining("/squad criar post") }),
      expect.objectContaining({ userId: "user-123" }),
    );
    expect(result.fsmPhase).toBe("COMPLETED");
    expect(result.responseMessage).toBe("Post pronto para publicação.");
    expect(result.artifact?.type).toBe("document");

    // Negativo: se o usuário desativou squad_orchestrator, não despacha squad automaticamente
    runSquadMock.mockReset();
    getActiveSkillsMock.mockResolvedValue(["commercial_proposal"]);
    const optedOut = await executeAiCopilotPipeline(
      "/squad criar post de campanha para coleção local",
      {},
      { userId: "user-123", storeId: "store-123", city: "Chapecó" },
    );
    expect(runSquadMock).not.toHaveBeenCalled();
    expect(optedOut.fsmPhase).toBeDefined();
  });

  it("EARS-03: injeta skills DB + ferramentas MCP externas e despacha mcp_ext:<slug>:<tool>", async () => {
    getActiveSkillsMock.mockResolvedValue(["research_miner", "pricing_strategist"]);
    listExternalMcpMock.mockResolvedValue([
      {
        compositeToolName: "mcp_ext:crm-local:buscar_cliente",
        serverId: "srv-1",
        serverSlug: "crm-local",
        serverName: "CRM Externo",
        toolName: "buscar_cliente",
        description: "Busca ficha de cliente no ERP/CRM remoto",
        inputSchema: { type: "object", properties: { doc: { type: "string" } } },
      },
    ]);
    gatewayMock.mockResolvedValue({
      success: true,
      result: {
        parsedJson: {
          intent: "general_chat",
          tool_name: "mcp_ext:crm-local:buscar_cliente",
          tool_args: { doc: "123" },
          message: "",
        },
      },
    });
    invokeExternalMcpMock.mockResolvedValue({
      status: "success",
      serverName: "CRM Externo",
      toolName: "buscar_cliente",
      content: [{ type: "text", text: "Cliente localizado no CRM Externo." }],
    });

    const result = await executeAiCopilotPipeline(
      "consultar ficha do cliente 123 no crm",
      {},
      { userId: "user-abc" },
    );

    expect(gatewayMock).toHaveBeenCalledTimes(1);
    const callArg = gatewayMock.mock.calls[0][0];
    expect(callArg.systemPrompt).toContain("<HABILIDADES_ATIVAS>");
    expect(callArg.systemPrompt).toContain("research_miner, pricing_strategist");
    expect(callArg.systemPrompt).toContain("mcp_ext:crm-local:buscar_cliente");

    expect(invokeExternalMcpMock).toHaveBeenCalledWith(
      "user-abc",
      "mcp_ext:crm-local:buscar_cliente",
      { doc: "123" },
    );
    expect(mcpBuiltinMock).not.toHaveBeenCalled();
    expect(result.fsmPhase).toBe("COMPLETED");
    expect(result.responseMessage).toBe("Cliente localizado no CRM Externo.");

    // Negativo: erro na ferramenta externa retorna FAILED_RETRYABLE com feedback honesto
    invokeExternalMcpMock.mockResolvedValue({
      status: "error",
      toolName: "buscar_cliente",
      content: [{ type: "text", text: "Timeout remoto 504" }],
    });
    const failed = await executeAiCopilotPipeline(
      "consultar ficha do cliente 123 no crm",
      {},
      { userId: "user-abc" },
    );
    expect(failed.fsmPhase).toBe("FAILED_RETRYABLE");
    expect(failed.responseMessage).toContain("Timeout remoto 504");
  });

  it("EARS-03/04: extrai texto de PDF comprimido FlateDecode e injeta anexos ANTES do Stage 1", async () => {
    const pdfStreamPayload = zlib.deflateSync(
      Buffer.from("BT (Fatura Turistica Chapeco Total 4500 BRL) Tj ET", "latin1"),
    );
    const syntheticPdf = Buffer.concat([
      Buffer.from("%PDF-1.4\n1 0 obj << /Filter /FlateDecode >>\nstream\n", "latin1"),
      pdfStreamPayload,
      Buffer.from("\nendstream\nendobj", "latin1"),
    ]);
    const extracted = await extractPdfTextBestEffort(syntheticPdf);
    expect(extracted).toContain("Fatura Turistica Chapeco Total 4500 BRL");

    // Negativo: PDF somente gráfico gera nota honesta sem camada textual
    const scannedPdf = Buffer.from("%PDF-1.4\n%binary-image-only", "latin1");
    expect(await extractPdfTextBestEffort(scannedPdf)).toBe("");

    // Anexos resolvidos antes do roteamento Stage 1
    process.env.SUPABASE_URL = "https://example.supabase.co";
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response("Receita Bruta,12000\nDespesa,4000", {
          status: 200,
          headers: { "content-type": "text/csv" },
        }),
      ),
    );
    const resolved = await resolveCopilotAttachments(
      ["https://example.supabase.co/storage/v1/object/public/copilot-uploads/dados.csv"],
      mockFetch as unknown as typeof fetch,
    );
    expect(resolved.textBlocks[0]).toContain("Receita Bruta,12000");

    getActiveSkillsMock.mockResolvedValue([]);
    listExternalMcpMock.mockResolvedValue([]);
    gatewayMock.mockResolvedValue({
      success: true,
      result: { parsedJson: { intent: "general_chat", message: "Resumo pronto." } },
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    try {
      await executeAiCopilotPipeline(
        "analise este arquivo",
        {},
        {
          userId: "user-attach",
          attachments: [
            "https://example.supabase.co/storage/v1/object/public/copilot-uploads/dados.csv",
          ],
        },
      );
      expect(gatewayMock).toHaveBeenCalledTimes(1);
      const stage1Prompt = gatewayMock.mock.calls[0][0].prompt as string;
      expect(stage1Prompt).toContain("<ANEXO_1>");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("CM-01/02/04/05: preserva arquitetura unificada sem shadowing, mocks falsos ou downgrade para guest", () => {
    const squadsLayout = fs.readFileSync(resolveRepoPath("src/routes/workspace.squads.tsx"), "utf8");
    expect(squadsLayout).toContain("<Outlet />");
    expect(squadsLayout).not.toContain("fornecedora de embalagens brasil ltda");

    const workspaceCopilot = fs.readFileSync(
      resolveRepoPath("src/routes/workspace.copilot.tsx"),
      "utf8",
    );
    expect(workspaceCopilot).not.toContain("// Continua com fallback determinístico");

    const tasksView = fs.readFileSync(
      resolveRepoPath("src/components/chat/copilot-scheduled-tasks-view.tsx"),
      "utf8",
    );
    expect(tasksView).not.toContain("despachada para o worker.");

    const analyticsView = fs.readFileSync(
      resolveRepoPath("src/components/chat/copilot-analytics-dashboard.tsx"),
      "utf8",
    );
    expect(analyticsView).toContain("getCopilotUsageAnalytics");
    expect(analyticsView).not.toContain("99.2%");
    expect(analyticsView).not.toContain("420ms");

    const bridgeSrc = fs.readFileSync(
      resolveRepoPath("src/services/builder-copilot-bridge.ts"),
      "utf8",
    );
    expect(bridgeSrc).not.toContain("Mercado Central SMO");
    expect(bridgeSrc).toContain("/workspace/builder?doc=");

    const dashboardArtifact = fs.readFileSync(
      resolveRepoPath("src/components/chat/artifacts/ArtifactDashboard.tsx"),
      "utf8",
    );
    expect(dashboardArtifact).not.toContain("42.850,00");

    expect(fs.existsSync(resolveRepoPath("src/routes/workspace.builder.index.tsx"))).toBe(true);
    expect(fs.existsSync(resolveRepoPath("src/lib/canvas/html2canvas-safe.ts"))).toBe(true);
  });
});
