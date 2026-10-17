import { describe, it, expect, vi, beforeEach } from "vitest";
import { reapStalledProcessingQueueItems } from "./mining/crawler-batch-engine";
import { recordCircuitFailure, getCircuit, circuitBreakers } from "./ai-core-gateway.functions";
import { searchPlatformForCopilot, shouldSearchPlatform } from "./copilot-internal-search";
import { cronBodySchema, handleCronWorker } from "@/routes/api.cron.mining-worker";

describe("Mining Crawler & Copilot Remediation Test Suite (Ondas 1, 2, 3 e 4)", () => {
  beforeEach(() => {
    circuitBreakers.clear();
    vi.restoreAllMocks();
  });

  describe("Causa Raiz 3: Crawler Reaper & Auto-Reset de Fila Travada", () => {
    it("reapStalledProcessingQueueItems restaura itens travados usando as colunas corretas do schema (last_error, processing_error, updated_at)", async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOr = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: "stalled-item-1" }, { id: "stalled-item-2" }],
        error: null,
      });

      const mockSupabase = {
        from: vi.fn(() => ({
          update: mockUpdate,
          eq: mockEq,
          or: mockOr,
          select: mockSelect,
        })),
      };

      const reapedCount = await reapStalledProcessingQueueItems(mockSupabase as any);

      expect(mockSupabase.from).toHaveBeenCalledWith("crawl_queue");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "pending",
          last_error: expect.stringContaining("Auto-reset"),
          processing_error: expect.stringContaining("Auto-reset"),
          updated_at: expect.any(String),
        })
      );
      expect(mockEq).toHaveBeenCalledWith("status", "processing");
      expect(mockOr).toHaveBeenCalledWith(expect.stringContaining("processed_at.lt."));
      expect(mockOr).toHaveBeenCalledWith(expect.stringContaining("started_at.lt."));
      expect(reapedCount).toBe(2);
    });

    it("reapStalledProcessingQueueItems lida defensivamente com erros do banco sem lançar exceção", async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          select: vi.fn().mockResolvedValue({ data: null, error: new Error("DB Connection Error") }),
        })),
      };

      const reapedCount = await reapStalledProcessingQueueItems(mockSupabase as any);
      expect(reapedCount).toBe(0);
    });
  });

  describe("Causa Raiz 1 (Copilot): Circuit Breaker Inteligente com Failover 429", () => {
    it("abre o circuito imediatamente quando detecta HTTP 429 / Quota Exceeded (5 minutos de cooldown)", () => {
      const testProvider = "gemini_quota_test";
      const circuit = getCircuit(testProvider);
      expect(circuit.state).toBe("closed");

      // Uma única falha com 429 deve abrir o circuito imediatamente
      recordCircuitFailure(testProvider, 429);

      const openCircuit = getCircuit(testProvider);
      expect(openCircuit.state).toBe("open");
      // Cooldown de 5 minutos (300_000 ms)
      expect(openCircuit.openUntil).toBeGreaterThan(Date.now() + 200_000);
    });

    it("abre o circuito imediatamente se a mensagem de erro indicar RESOURCE_EXHAUSTED", () => {
      const testProvider = "gemini_resource_exhausted";
      recordCircuitFailure(testProvider, "Gemini error 429: RESOURCE_EXHAUSTED quota exceeded");

      const openCircuit = getCircuit(testProvider);
      expect(openCircuit.state).toBe("open");
      expect(openCircuit.openUntil).toBeGreaterThan(Date.now() + 200_000);
    });

    it("mantém comportamento padrão de 3 falhas para erros transitórios que não sejam 429", () => {
      const testProvider = "transient_provider";
      recordCircuitFailure(testProvider, "Network timeout 504");
      expect(getCircuit(testProvider).state).toBe("closed");

      recordCircuitFailure(testProvider, "Network timeout 504");
      expect(getCircuit(testProvider).state).toBe("closed");

      recordCircuitFailure(testProvider, "Internal error 500");
      expect(getCircuit(testProvider).state).toBe("open");
      // Falhas normais abrem por 60 segundos
      expect(getCircuit(testProvider).openUntil).toBeLessThan(Date.now() + 70_000);
    });
  });

  describe("Causa Raiz 4 & Copilot Search: Alimentação e Busca de Notícias Reais (news_articles)", () => {
    it("shouldSearchPlatform detecta intenção para termos jornalísticos e notícias", () => {
      expect(shouldSearchPlatform("quais as últimas notícias de Chapecó?")).toBe(true);
      expect(shouldSearchPlatform("o que aconteceu hoje no centro?")).toBe(true);
      expect(shouldSearchPlatform("novidades do comércio")).toBe(true);
    });

    it("searchPlatformForCopilot busca em news_articles e mapeia cards de notícias com ação", async () => {
      const mockNewsRows = [
        {
          id: "news-uuid-1",
          title: "Inaugurado novo centro de inovação em Chapecó",
          kicker: "DESENVOLVIMENTO",
          subtitle: "Espaço acolhe mais de 40 startups e empresas de base tecnológica",
          ai_summary: "Inauguração traz fomento e novos empregos para a região oeste.",
          cover_media_url: "https://images.waesy.com/news/inovacao.jpg",
          city: "Chapecó",
          state: "SC",
          status: "published",
          slug: "inaugurado-novo-centro-de-inovacao-chapeco",
        },
      ];

      const mockSupabase = {
        from: vi.fn((table: string) => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: table === "news_articles" ? mockNewsRows : [],
            error: null,
          }),
        })),
      };

      const result = await searchPlatformForCopilot(
        mockSupabase as any,
        "notícias sobre inovação em Chapecó"
      );

      expect(result.source).toBe("platform");
      expect(result.cards.length).toBeGreaterThan(0);

      const newsCard = result.cards.find((c) => c.kind === "news");
      expect(newsCard).toBeDefined();
      expect(newsCard?.title).toBe("Inaugurado novo centro de inovação em Chapecó");
      expect(newsCard?.subtitle).toBe("DESENVOLVIMENTO");
      expect(newsCard?.image_url).toBe("https://images.waesy.com/news/inovacao.jpg");
      expect(newsCard?.action?.action_type).toBe("navigate");
      expect(newsCard?.action?.payload.href).toBe("/noticias/inaugurado-novo-centro-de-inovacao-chapeco");
    });
  });

  describe("Causa Raiz 1 & 2: Validação Zod Real do cronBodySchema e Autenticação do Worker", () => {
    it("cronBodySchema aceita 'datajud-sync' e todos os jobTypes canônicos", () => {
      const validJobs = [
        "datajud-sync",
        "market-data",
        "rss-fetcher",
        "cnpj-enrichment",
        "continuous-crawler",
      ];

      for (const jobType of validJobs) {
        const parsed = cronBodySchema.safeParse({ jobType });
        expect(parsed.success).toBe(true);
        if (parsed.success) {
          expect(parsed.data.jobType).toBe(jobType);
        }
      }
    });

    it("cronBodySchema rejeita payloads inválidos ou jobTypes desconhecidos", () => {
      expect(cronBodySchema.safeParse({ jobType: "unknown-crawler" }).success).toBe(false);
      expect(cronBodySchema.safeParse({ jobType: "" }).success).toBe(false);
      expect(cronBodySchema.safeParse({}).success).toBe(false);
    });

    it("handleCronWorker rejeita requisições sem Authorization ou com token incorreto", async () => {
      const reqNoAuth = new Request("http://localhost/api/cron/mining-worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobType: "datajud-sync" }),
      });
      const resNoAuth = await handleCronWorker(reqNoAuth);
      expect(resNoAuth.status).toBe(401);

      const reqBadToken = new Request("http://localhost/api/cron/mining-worker", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer wrong-token-xyz",
        },
        body: JSON.stringify({ jobType: "datajud-sync" }),
      });
      const resBadToken = await handleCronWorker(reqBadToken);
      expect(resBadToken.status).toBe(401);
    });

    it("handleCronWorker aceita token canônico padrão 'waesy_omni_cron_key_v2026' com ou sem prefixo Bearer", async () => {
      const reqWithBearer = new Request("http://localhost/api/cron/mining-worker", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer waesy_omni_cron_key_v2026",
        },
        body: JSON.stringify({ jobType: "invalid-type" }),
      });
      const res = await handleCronWorker(reqWithBearer);
      // Passou da autenticação 401 e parou na validação Zod 400
      expect(res.status).toBe(400);

      const reqRawToken = new Request("http://localhost/api/cron/mining-worker", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "waesy_omni_cron_key_v2026",
        },
        body: JSON.stringify({ jobType: "invalid-type" }),
      });
      const resRaw = await handleCronWorker(reqRawToken);
      // Também passou da autenticação 401
      expect(resRaw.status).toBe(400);
    });
  });
});
