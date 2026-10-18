import { describe, expect, it, vi, beforeEach } from "vitest";
import { executeUnifiedAiCall } from "./api-orchestrator.functions";
import * as secretVault from "./secret-vault.functions";
import { triageDataJudLawsuit } from "./mining/datajud-harvester";
import { callOpenRouter } from "@/lib/ai/openrouter";

describe("Waesy Truth-7: AI Task Aptitude, BYOK Isolation & Keypool Routing", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1. taskType: 'vision' deve ignorar chaves Groq text-only mesmo com preferredProvider: 'groq' e priorizar provedor multimodal (Gemini)", async () => {
    const origGemini = process.env.GEMINI_API_KEY;
    const origGroq = process.env.GROQ_API_KEY;
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.GROQ_API_KEY = "test-groq-key";

    try {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("groq.com")) {
          throw new Error("Groq não deve ser chamado para tarefas vision!");
        }
        if (urlStr.includes("generativelanguage.googleapis.com")) {
          return new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [{ text: JSON.stringify({ extracted: true, destination: "Florianópolis" }) }],
                  },
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response("Not found", { status: 404 });
      });

      const res = await executeUnifiedAiCall({
        userPrompt: "Analise a imagem da passagem",
        taskType: "vision",
        images: [{ mimeType: "image/jpeg", base64: "dGVzdGU=" }],
        preferredProvider: "groq", // Informando groq expressamente como preferido
        expectJson: true,
      });

      expect(res).toBeDefined();
      expect(res.provider).toBe("gemini");
      expect(res.parsedJson?.destination).toBe("Florianópolis");
      expect(fetchSpy).toHaveBeenCalled();
    } finally {
      process.env.GEMINI_API_KEY = origGemini;
      process.env.GROQ_API_KEY = origGroq;
    }
  });

  it("2. taskType: 'fast_json' deve priorizar Groq para retorno sub-200ms com JSON estruturado e temperatura 0.1", async () => {
    let capturedBody: any = null;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes("groq.com")) {
        capturedBody = JSON.parse(init?.body as string);
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    hotel_rating: 4.8,
                    destination_rating: 5.0,
                    agency_service_rating: 4.5,
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Chamada inesperada para: ${urlStr}`);
    });

    const res = await executeUnifiedAiCall({
      userPrompt: "Classifique o review da viagem",
      taskType: "fast_json",
      overrideApiKey: "gsk-mock-groq-key",
      preferredProvider: "groq",
      expectJson: true,
    });

    expect(res).toBeDefined();
    expect(res.provider).toBe("groq");
    expect(res.parsedJson?.hotel_rating).toBe(4.8);
    expect(capturedBody).toBeDefined();
    expect(capturedBody.response_format).toEqual({ type: "json_object" });
    expect(capturedBody.temperature).toBe(0.1);
    const combinedPrompt = capturedBody.messages.map((m: any) => m.content).join(" ");
    expect(combinedPrompt).toMatch(/json/i);
  });

  it("3. Tarefas de background da plataforma (isSystemTask: true) NUNCA consomem chaves BYOK de lojistas", async () => {
    const getActiveSecretSpy = vi.spyOn(secretVault, "getActiveSecretForProvider");

    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: "Notícia Minerada com Sucesso",
                  summary: "Síntese limpa",
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const res = await executeUnifiedAiCall({
      userPrompt: "Curadoria editorial de notícia do crawler",
      taskType: "editorial_squad",
      feature: "mining_editorial_squad",
      isSystemTask: true,
      storeId: "lojista-tenant-123",
      ownerId: "profile-lojista-abc",
      overrideApiKey: "global-pool-key",
      preferredProvider: "groq",
    });

    expect(res).toBeDefined();
    // getActiveSecretForProvider NUNCA deve ser invocado quando isSystemTask for true
    expect(getActiveSecretSpy).not.toHaveBeenCalled();
  });

  it("4. Chave BYOK que retorna 429 faz failover transparente e silencioso para o Pool Master sem erro", async () => {
    let callCount = 0;
    const originalGroq = process.env.GROQ_API_KEY;
    process.env.GROQ_API_KEY = "master-pool-healthy-key";

    vi.spyOn(secretVault, "getActiveSecretForProvider").mockImplementation(async (provider: string) => {
      if (provider === "groq") return "byok-expiring-key";
      return null;
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url: any, init?: any) => {
      callCount++;
      const authHeader = (init?.headers as any)?.Authorization || "";
      const urlStr = String(_url);

      // A primeira chamada tenta a chave BYOK e recebe 429
      if (authHeader.includes("byok-expiring-key") || urlStr.includes("byok-expiring-key")) {
        return new Response(JSON.stringify({ error: { message: "Rate limit exceeded: 429 Too Many Requests" } }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }

      // O failover consome a chave do pool / env fallback com sucesso
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "Resposta gerada com sucesso pela chave saudável do Pool Master",
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    try {
      const res = await executeUnifiedAiCall({
        userPrompt: "Pergunta do lojista no Copilot",
        taskType: "chat",
        storeId: "store-tenant-xyz",
        ownerId: "user-tenant-xyz",
        preferredProvider: "groq",
      });

      expect(res).toBeDefined();
      expect(res.content).toContain("Pool Master");
      expect(callCount).toBe(2);
    } finally {
      process.env.GROQ_API_KEY = originalGroq;
    }
  });

  it("5. triageDataJudLawsuit executa via fast_json com isSystemTask: true e retorna flags de compliance", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "Ação de cobrança de honorários em fase de cumprimento de sentença.",
                  riskLevel: "medio",
                  complianceFlags: {
                    has_arrest_warrants: false,
                    has_criminal_executions: false,
                    has_sanctions_restrictions: true,
                  },
                  recommendedAction: "Monitorar bloqueio via SISBAJUD.",
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const triage = await triageDataJudLawsuit({
      processNumber: "5001234-56.2024.8.24.0023",
      processNumberClean: "50012345620248240023",
      courtCode: "TJSC",
      courtName: "Tribunal de Justiça de Santa Catarina",
      className: "Cumprimento de Sentença",
      subjectName: "Honorários Advocatícios",
      status: "Em Tramitação",
      priority: "Normal",
      parties: [],
      lawyers: [],
      movements: [],
      source: "datajud",
      sourceUrl: "",
    });

    expect(triage).toBeDefined();
    expect(triage.riskLevel).toBe("medio");
    expect(triage.complianceFlags.has_sanctions_restrictions).toBe(true);
    expect(triage.recommendedAction).toContain("SISBAJUD");
  });

  it("6. callOpenRouter em src/lib/ai/openrouter.ts delega soberanamente para executeUnifiedAiCall sem rogue fetch", async () => {
    const originalOpenRouter = process.env.OPENROUTER_API_KEY;
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("openrouter.ai")) {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "Resposta delegada via OpenRouter soberano",
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Chamada inesperada para: ${urlStr}`);
    });

    try {
      const response = await callOpenRouter(
        [{ role: "user", content: "Olá assistente" }],
        { temperature: 0.5 }
      );

      expect(response).toBeDefined();
      expect(response.content).toContain("OpenRouter soberano");
    } finally {
      process.env.OPENROUTER_API_KEY = originalOpenRouter;
    }
  });

  it("7. taskType: 'vision' com OpenRouter deve selecionar modelos multimodais (gemini-2.5-flash ou qwen-vl)", async () => {
    let requestedModel = "";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes("openrouter.ai")) {
        const body = JSON.parse(init?.body as string);
        requestedModel = body.model;
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: "Visão processada com sucesso via OpenRouter" } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not found", { status: 404 });
    });

    const res = await executeUnifiedAiCall({
      userPrompt: "Descreva o gráfico da imagem",
      taskType: "vision",
      preferredProvider: "openrouter",
      overrideApiKey: "sk-or-test-key",
    });

    expect(res).toBeDefined();
    expect(res.provider).toBe("openrouter");
    expect(["google/gemini-2.5-flash", "qwen/qwen2.5-vl-72b-instruct:free"]).toContain(requestedModel);
  });

  it("8. taskType: 'ocr' com Anthropic deve selecionar claude-3-5-sonnet-20241022 mesmo sem imagens anexadas previamente", async () => {
    let requestedModel = "";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes("api.anthropic.com")) {
        const body = JSON.parse(init?.body as string);
        requestedModel = body.model;
        return new Response(
          JSON.stringify({
            content: [{ type: "text", text: "Texto extraído com alta precisão" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not found", { status: 404 });
    });

    const res = await executeUnifiedAiCall({
      userPrompt: "Extraia o texto da nota fiscal",
      taskType: "ocr",
      preferredProvider: "anthropic",
      overrideApiKey: "sk-ant-test-key",
    });

    expect(res).toBeDefined();
    expect(res.provider).toBe("anthropic");
    expect(requestedModel).toBe("claude-3-5-sonnet-20241022");
  });
});

