import { describe, expect, it, vi, beforeEach } from "vitest";
import { executeUnifiedAiCall, clearInMemoryKeyCooldowns } from "./api-orchestrator.functions";
import * as secretVault from "./secret-vault.functions";

describe("Adversarial Stress Test: AI Task Aptitude, BYOK Isolation & 429 Failover Cascades", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearInMemoryKeyCooldowns();
  });

  // =========================================================================
  // 1. Edge cases in provider selection
  // =========================================================================

  it("1.1 Degradacão Graciosa: taskType desconhecido ou string arbitrária não causa crash e opera cascata padrão", async () => {
    let capturedProvider = "";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("groq.com")) {
        capturedProvider = "groq";
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: "Resposta gerada normalmente para taskType arbitrário" } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not found", { status: 404 });
    });

    const res = await executeUnifiedAiCall({
      userPrompt: "Texto de teste para prompt com taskType desconhecido",
      taskType: "unsupported_arbitrary_task_type_xyz" as any,
      overrideApiKey: "test-arbitrary-groq-key",
      preferredProvider: "groq",
    });

    expect(res).toBeDefined();
    expect(res.provider).toBe("groq");
    expect(res.content).toContain("Resposta gerada normalmente");
    expect(capturedProvider).toBe("groq");
  });

  it("1.2 Detecção Automática de Visão: images array presente sem taskType: 'vision' trata automaticamente como visão e descarta Groq", async () => {
    const origGemini = process.env.GEMINI_API_KEY;
    const origGroq = process.env.GROQ_API_KEY;
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.GROQ_API_KEY = "test-groq-key";

    try {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("groq.com")) {
          throw new Error("VIOLAÇÃO: Groq text-only foi chamado mesmo com images presente no payload!");
        }
        if (urlStr.includes("generativelanguage.googleapis.com")) {
          return new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [{ text: "Imagem reconhecida com sucesso via Gemini multimodal" }],
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
        userPrompt: "Descreva a foto",
        // Sem taskType ou com taskType: 'chat'
        taskType: "chat",
        images: [{ mimeType: "image/png", base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" }],
        preferredProvider: "groq", // Usuário solicitou groq erroneamente com imagem
      });

      expect(res).toBeDefined();
      expect(res.provider).toBe("gemini");
      expect(res.content).toContain("Gemini multimodal");
      expect(fetchSpy).toHaveBeenCalled();
    } finally {
      process.env.GEMINI_API_KEY = origGemini;
      process.env.GROQ_API_KEY = origGroq;
    }
  });

  it("1.3 Aptidão OCR com Imagens Vazias: taskType: 'ocr' com images vazias seleciona modelo multimodal no Anthropic e OpenRouter sem crash", async () => {
    let anthropicModelUsed = "";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes("api.anthropic.com")) {
        const body = JSON.parse(init?.body as string);
        anthropicModelUsed = body.model;
        return new Response(
          JSON.stringify({
            content: [{ type: "text", text: "OCR de texto puro realizado com modelo multimodal Sonnet" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not found", { status: 404 });
    });

    const res = await executeUnifiedAiCall({
      userPrompt: "Transcreva a nota fiscal descrita no texto",
      taskType: "ocr",
      images: [], // Imagens vazias
      preferredProvider: "anthropic",
      overrideApiKey: "sk-ant-test-ocr",
    });

    expect(res).toBeDefined();
    expect(res.provider).toBe("anthropic");
    // Garante que roteia para o modelo multimodal Sonnet mesmo sem anexos
    expect(anthropicModelUsed).toBe("claude-3-5-sonnet-20241022");
    expect(res.content).toContain("Sonnet");
  });

  // =========================================================================
  // 2. Failover stress & Key Quarantines
  // =========================================================================

  it("2.1 Cascata Dupla de 429: BYOK toma 429 -> Master Key 1 toma 429 -> Master Key 2 tem sucesso (3 tentativas sem erro)", async () => {
    let callHistory: Array<{ auth: string; url: string }> = [];
    const origGroq = process.env.GROQ_API_KEY;
    const origGroqKeys = process.env.GROQ_API_KEYS;
    // Master pool com duas chaves separadas por vírgula no fallback
    process.env.GROQ_API_KEY = "";
    process.env.GROQ_API_KEYS = "master-pool-key-1,master-pool-key-2";

    vi.spyOn(secretVault, "getActiveSecretForProvider").mockImplementation(async (provider: string) => {
      if (provider === "groq") return "byok-store-key-attempt";
      return null;
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any, init?: any) => {
      const auth = (init?.headers as any)?.Authorization || "";
      const urlStr = String(url);
      callHistory.push({ auth, url: urlStr });

      if (auth.includes("byok-store-key-attempt")) {
        return new Response(JSON.stringify({ error: { message: "Rate limit: 429 on BYOK key" } }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (auth.includes("master-pool-key-1")) {
        return new Response(JSON.stringify({ error: { message: "Rate limit: 429 on Master Key 1" } }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (auth.includes("master-pool-key-2")) {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "Sucesso definitivo atendido pela Master Key 2 após dupla falha 429",
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response("Unexpected call", { status: 500 });
    });

    try {
      const res = await executeUnifiedAiCall({
        userPrompt: "Chamada sob alta concorrência de quota",
        taskType: "chat",
        storeId: "store-concurrency-test",
        ownerId: "owner-concurrency-test",
        preferredProvider: "groq",
      });

      expect(res).toBeDefined();
      expect(res.content).toContain("Master Key 2");
      expect(callHistory.length).toBe(3);
      expect(callHistory[0].auth).toContain("byok-store-key-attempt");
      expect(callHistory[1].auth).toContain("master-pool-key-1");
      expect(callHistory[2].auth).toContain("master-pool-key-2");
    } finally {
      process.env.GROQ_API_KEY = origGroq;
      process.env.GROQ_API_KEYS = origGroqKeys;
    }
  });

  it("2.2 Quarentena Ativa BYOK: chamadas subsequentes do mesmo tenant ignoram chave BYOK em quarentena sem emitir requisição de rede para ela", async () => {
    let byokCalls = 0;
    let masterCalls = 0;

    const origGroq = process.env.GROQ_API_KEY;
    process.env.GROQ_API_KEY = "master-pool-healthy-always";

    vi.spyOn(secretVault, "getActiveSecretForProvider").mockImplementation(async (provider: string) => {
      if (provider === "groq") return "byok-flaky-key";
      return null;
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url: any, init?: any) => {
      const auth = (init?.headers as any)?.Authorization || "";

      if (auth.includes("byok-flaky-key")) {
        byokCalls++;
        return new Response(JSON.stringify({ error: { message: "Too many requests: 429" } }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (auth.includes("master-pool-healthy-always")) {
        masterCalls++;
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: "Atendido com sucesso pelo Master Pool" } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response("Not found", { status: 404 });
    });

    try {
      // Primeira chamada: BYOK é chamado, falha com 429, entra em quarentena em memória, faz failover para Master Pool
      const res1 = await executeUnifiedAiCall({
        userPrompt: "Chamada 1 do lojista",
        taskType: "chat",
        storeId: "store-quarantine-test",
        preferredProvider: "groq",
      });

      expect(res1.content).toContain("Master Pool");
      expect(byokCalls).toBe(1);
      expect(masterCalls).toBe(1);

      // Segunda chamada do mesmo tenant: a chave BYOK já está em quarentena local.
      // O orquestrador DEVE pular a chave BYOK diretamente sem fazer requisição de rede com ela!
      const res2 = await executeUnifiedAiCall({
        userPrompt: "Chamada 2 do lojista subsequente",
        taskType: "chat",
        storeId: "store-quarantine-test",
        preferredProvider: "groq",
      });

      expect(res2.content).toContain("Master Pool");
      // byokCalls AINDA deve ser 1 (nenhuma nova requisição com a chave em quarentena)
      expect(byokCalls).toBe(1);
      // masterCalls agora deve ser 2
      expect(masterCalls).toBe(2);
    } finally {
      process.env.GROQ_API_KEY = origGroq;
    }
  });

  it("2.3 Isolamento Multi-Tenant da Quarentena: Tenant A em quarentena NÃO contamina Tenant B", async () => {
    let callsTenantA = 0;
    let callsTenantB = 0;

    const origGroq = process.env.GROQ_API_KEY;
    process.env.GROQ_API_KEY = "master-pool-shared";

    vi.spyOn(secretVault, "getActiveSecretForProvider").mockImplementation(async (provider: string, ownerId?: string, storeId?: string) => {
      if (storeId === "tenant-a") return "byok-key-tenant-a";
      if (storeId === "tenant-b") return "byok-key-tenant-b";
      return null;
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url: any, init?: any) => {
      const auth = (init?.headers as any)?.Authorization || "";

      if (auth.includes("byok-key-tenant-a")) {
        callsTenantA++;
        return new Response(JSON.stringify({ error: { message: "429 Rate Limit Tenant A" } }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (auth.includes("byok-key-tenant-b")) {
        callsTenantB++;
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: "Sucesso com chave própria do Tenant B" } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (auth.includes("master-pool-shared")) {
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: "Sucesso Master Pool" } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response("Not found", { status: 404 });
    });

    try {
      // 1. Tenant A chama e recebe 429 (vai para quarentena)
      await executeUnifiedAiCall({
        userPrompt: "Prompt Tenant A",
        taskType: "chat",
        storeId: "tenant-a",
        preferredProvider: "groq",
      });
      expect(callsTenantA).toBe(1);

      // 2. Tenant B chama: a chave de Tenant B DEVE ser utilizada normalmente!
      const resB = await executeUnifiedAiCall({
        userPrompt: "Prompt Tenant B",
        taskType: "chat",
        storeId: "tenant-b",
        preferredProvider: "groq",
      });
      expect(resB.content).toContain("Tenant B");
      expect(callsTenantB).toBe(1);

      // 3. Tenant A chama novamente: Tenant A continua em quarentena
      await executeUnifiedAiCall({
        userPrompt: "Prompt Tenant A (repete)",
        taskType: "chat",
        storeId: "tenant-a",
        preferredProvider: "groq",
      });
      expect(callsTenantA).toBe(1); // Nenhuma nova chamada à chave degradada de Tenant A
    } finally {
      process.env.GROQ_API_KEY = origGroq;
    }
  });

  it("2.4 Isolamento Rígido de Background: background task ignora BYOK mesmo com storeId/ownerId explícitos", async () => {
    const getActiveSecretSpy = vi.spyOn(secretVault, "getActiveSecretForProvider");

    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "Background crawler processado com sucesso" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const res = await executeUnifiedAiCall({
      userPrompt: "Coleta em background de crawler de jurisprudência",
      taskType: "scraping",
      feature: "mining_crawler_datajud",
      isSystemTask: true,
      storeId: "store-infiltrator",
      ownerId: "owner-infiltrator",
      overrideApiKey: "master-pool-key",
      preferredProvider: "groq",
    });

    expect(res).toBeDefined();
    expect(res.content).toContain("Background crawler");
    // getActiveSecretForProvider NUNCA pode ter sido chamado
    expect(getActiveSecretSpy).not.toHaveBeenCalled();
  });
});
