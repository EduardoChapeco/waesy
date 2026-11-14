import { describe, it, expect, vi } from "vitest";
import {
  sendAiMessageSchema,
  executeGuestCopilotMessageSchema,
  renameAiThreadSchema,
} from "@/services/ai-conversations.functions";
import { dispatchCopilotClientAction } from "@/lib/copilot-action-dispatcher";
import {
  deriveManusComputerSteps,
  extractAggregatedSources,
} from "@/hooks/use-copilot-session";
import { getArtifactTableRows, buildArtifactCsv } from "@/components/chat/ai-chat-shell";

describe("Copilot ChatGPT Desktop + Manus Matte E2E Refactor", () => {
  it("aceita quickToolMode em sendAiMessageSchema e executeGuestCopilotMessageSchema", () => {
    const parsedAuth = sendAiMessageSchema.safeParse({
      threadId: "11111111-1111-4111-8111-111111111111",
      message: "Criar site moderno para agência de turismo",
      quickToolMode: "website_builder",
    });
    expect(parsedAuth.success).toBe(true);
    if (parsedAuth.success) {
      expect(parsedAuth.data.quickToolMode).toBe("website_builder");
    }

    const parsedGuest = executeGuestCopilotMessageSchema.safeParse({
      message: "Mostrar no mapa hotéis no centro",
      quickToolMode: "interactive_map",
    });
    expect(parsedGuest.success).toBe(true);
    if (parsedGuest.success) {
      expect(parsedGuest.data.quickToolMode).toBe("interactive_map");
    }
  });

  it("rejeita renameAiThreadSchema com título menor que 2 caracteres", () => {
    const shortRes = renameAiThreadSchema.safeParse({
      threadId: "11111111-1111-4111-8111-111111111111",
      title: "A",
    });
    expect(shortRes.success).toBe(false);

    const validRes = renameAiThreadSchema.safeParse({
      threadId: "11111111-1111-4111-8111-111111111111",
      title: "  Campanha Páscoa 2026  ",
    });
    expect(validRes.success).toBe(true);
    if (validRes.success) {
      expect(validRes.data.title).toBe("Campanha Páscoa 2026");
    }
  });

  it("dispatchCopilotClientAction bloqueia redirects protocol-relative e navega em rotas internas seguras", async () => {
    const navigate = vi.fn();
    const onBeforeNavigate = vi.fn();
    const notify = { success: vi.fn(), info: vi.fn(), error: vi.fn() };

    await dispatchCopilotClientAction(
      { action_type: "navigate", label: "Site externo", payload: { url: "//evil.example.com" } },
      { navigate, onBeforeNavigate, notify, mode: "workspace" },
    );
    expect(navigate).not.toHaveBeenCalled();

    await dispatchCopilotClientAction(
      { action_type: "navigate", label: "Abrir builders", payload: { url: "/workspace/builder" } },
      { navigate, onBeforeNavigate, notify, mode: "workspace" },
    );
    expect(onBeforeNavigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith({ to: "/workspace/builder" });
  });

  it("deriveManusComputerSteps classifica navegador, editor e terminal sem duplicar dados", () => {
    const steps = deriveManusComputerSteps(
      [
        {
          id: "m1",
          threadId: "t1",
          senderName: "Copilot",
          isStaffOrAI: true,
          text: "Resumo gerado",
          createdAt: "2026-11-14T10:00:00.000Z",
          status: "delivered",
          activitySteps: [
            {
              id: "a1",
              type: "search",
              label: "Busca de estabelecimentos no mapa",
              detail: "3 pontos retornados",
              status: "completed",
              startedAt: "2026-11-14T10:00:00.000Z",
            },
            {
              id: "a2",
              type: "skill",
              label: "Gerar site institucional",
              detail: "HTML compilado",
              status: "completed",
              startedAt: "2026-11-14T10:00:05.000Z",
            },
          ],
          artifact: {
            id: "art1",
            type: "landing_page",
            title: "Vitrine Centro",
            version: 1,
          },
        },
      ],
      [
        {
          id: "job1",
          title: "Indexar catálogo",
          task_type: "rag_sync",
          status: "running",
          progress_percent: 45,
          current_step: "Processando arquivos",
          created_at: "2026-11-14T10:01:00.000Z",
        },
      ],
    );

    expect(steps).toHaveLength(3);
    expect(steps[0].tool).toBe("browser");
    expect(steps[1].tool).toBe("editor");
    expect(steps[1].fileDiff?.filename).toBe("Vitrine Centro.md");
    expect(steps[2].tool).toBe("bash");
    expect(steps[2].terminalOutput).toContain("45%");
  });

  it("extractAggregatedSources deduplica arquivos do projeto e citações da conversa", () => {
    const sources = extractAggregatedSources(
      [
        {
          id: "m1",
          threadId: "t1",
          senderName: "Copilot",
          isStaffOrAI: true,
          text: "Com base nos dados",
          createdAt: "2026-11-14T10:00:00.000Z",
          status: "delivered",
          sources: [
            { id: "s1", title: "OpenStreetMap", kind: "place", url: "https://osm.org/1" },
            { id: "s2", title: "OpenStreetMap", kind: "place", url: "https://osm.org/1" },
          ],
        },
      ],
      [
        {
          id: "f1",
          project_id: "p1",
          filename: "tabela-tarifas.csv",
          file_url: null,
          file_type: "text/csv",
          file_size: 1200,
          status: "ready",
          excerpt: "Rota Centro",
          created_at: "2026-11-14T09:00:00.000Z",
          updated_at: "2026-11-14T09:00:00.000Z",
        },
      ],
    );

    expect(sources).toHaveLength(2);
    expect(sources.map((s) => s.title)).toEqual(["tabela-tarifas.csv", "OpenStreetMap"]);
  });

  it("buildArtifactCsv protege células contra CSV formula injection", () => {
    const rows = getArtifactTableRows({
      headers: ["Item", "Valor"],
      dataRows: [{ Item: "=CMD()", Valor: "120" }],
    });
    expect(rows).toEqual([["=CMD()", "120"]]);
    const csv = buildArtifactCsv({
      headers: ["Item", "Valor"],
      dataRows: [["=CMD()", "-15"]],
    });
    expect(csv).toContain("'=CMD()");
    expect(csv).toContain('"-15"');
  });
});
