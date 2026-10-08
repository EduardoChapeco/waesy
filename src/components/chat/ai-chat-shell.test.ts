import { describe, it, expect } from "vitest";
import { resolveAiPipelineSteps } from "@/services/ai-conversations.functions";
import type { AIActivityStep } from "./ai-activity-trail";
import type { ChatArtifactData } from "./chat-artifact-card";
import { buildArtifactCsv, getArtifactTableRows } from "./ai-chat-shell";

describe("Prompt 21: Shell de Conversa AI-First com Trilha de Atividade e Artefatos", () => {
  it("resolveAiPipelineSteps gera proposta comercial com artefato e passos reais de atividade", () => {
    const result = resolveAiPipelineSteps("Por favor, elabore uma proposta comercial para consultoria");

    expect(result.responseMessage).toContain("proposta comercial");
    expect(result.activitySteps.length).toBeGreaterThanOrEqual(3);

    // Passo de banco e passo de skill
    expect(result.activitySteps.some((s) => s.type === "database")).toBe(true);
    expect(result.activitySteps.some((s) => s.type === "skill")).toBe(true);
    expect(result.activitySteps.every((s) => s.status === "completed")).toBe(true);

    // Artefato versionado
    expect(result.artifact).toBeDefined();
    expect(result.artifact?.type).toBe("proposal");
    expect(result.artifact?.version).toBe(1);
    expect(result.artifact?.data?.total_cents).toBe(850000);
    expect(result.updatedMemory.last_proposal_created).toBeDefined();
  });

  it("resolveAiPipelineSteps gera landing page com artefato do builder", () => {
    const result = resolveAiPipelineSteps("Crie uma nova landing page para a loja");

    expect(result.responseMessage).toContain("landing page");
    expect(result.artifact).toBeDefined();
    expect(result.artifact?.type).toBe("landing_page");
    expect(result.artifact?.data?.theme).toBe("apple-clean");
    expect(result.activitySteps.some((s) => s.type === "skill")).toBe(true);
  });

  it("resolveAiPipelineSteps gera planilha com ferramenta financeira", () => {
    const result = resolveAiPipelineSteps("Gere uma planilha com as métricas de caixa e vendas");

    expect(result.artifact).toBeDefined();
    expect(result.artifact?.type).toBe("spreadsheet");
    expect(result.activitySteps.some((s) => s.type === "tool")).toBe(true);
  });

  it("resolveAiPipelineSteps atualiza memória de trabalho para conversas gerais", () => {
    const result = resolveAiPipelineSteps("Quais são os horários de funcionamento da loja?", {
      existing_key: "value_test",
    });

    expect(result.activitySteps.length).toBeGreaterThanOrEqual(2);
    expect(result.updatedMemory.existing_key).toBe("value_test");
    expect(result.updatedMemory.last_interaction_topic).toBeDefined();
  });

  it("Passos de atividade possuem telemetria real (duração e tokens)", () => {
    const result = resolveAiPipelineSteps("Gere uma proposta comercial");

    for (const step of result.activitySteps) {
      expect(step.durationMs).toBeGreaterThan(0);
      expect(step.tokensUsed).toBeGreaterThan(0);
      expect(step.startedAt).toBeDefined();
      expect(step.completedAt).toBeDefined();
    }
  });

  it("Contrato de Artefato Versionado possui campos obrigatórios para o Builder", () => {
    const artifact: ChatArtifactData = {
      id: "art-123",
      type: "landing_page",
      title: "Página de Destino do Produto",
      version: 2,
      totalVersions: 3,
      authorName: "IA Builder Specialist",
      authorRole: "Squad de Design",
      data: {
        theme: "apple-clean",
        sections: ["Hero", "Features", "Footer"],
      },
    };

    expect(artifact.id).toBe("art-123");
    expect(artifact.type).toBe("landing_page");
    expect(artifact.version).toBe(2);
    expect(artifact.data?.sections).toHaveLength(3);
  });

  it("normaliza rows reais do orquestrador e nunca cria uma linha demonstrativa", () => {
    const rows = getArtifactTableRows({
      headers: ["Nome", "Origem"],
      rows: [["Hotel Central", "OpenStreetMap"]],
    });

    expect(rows).toEqual([["Hotel Central", "OpenStreetMap"]]);
    expect(getArtifactTableRows({ headers: ["Nome"], rows: [] })).toEqual([]);
  });

  it("normaliza linhas objeto e exporta CSV RFC com escaping e proteção de fórmula", () => {
    const csv = buildArtifactCsv({
      headers: ["Nome", "Observação"],
      dataRows: [
        { Nome: "Hotel Central", Observação: "Quarto; vista\nmar" },
        { Nome: "=HYPERLINK(\"https://waesy.app\")", Observação: "ok" },
      ],
    });

    expect(csv).toContain("\uFEFF\"Nome\";\"Observação\"");
    expect(csv).toContain("\"Hotel Central\";\"Quarto; vista\nmar\"");
    expect(csv).toContain("\"'=HYPERLINK(\"\"https://waesy.app\"\")\";\"ok\"");
  });
});
