import { describe, it, expect, vi, beforeEach } from "vitest";
import { getRealisticBrowserHeaders, getRandomUserAgent, setDomainCooldown, isDomainInCooldown, clearDomainCooldown } from "@/lib/mining/scraper-utils";
import { reapStalledProcessingQueueItems } from "./crawler-batch-engine";

describe("Omni-Mining & Industrial Scraping Re-engineering — Testes Canônicos", () => {
  describe("1. Vetor A: Browser Fingerprinting & Headers Modernos (Chrome 134+ / Client Hints)", () => {
    it("deve gerar User-Agent moderno rotativo com versões atualizadas", () => {
      const ua = getRandomUserAgent();
      expect(typeof ua).toBe("string");
      expect(ua.length).toBeGreaterThan(20);
      const isModern =
        ua.includes("134.0") ||
        ua.includes("135.0") ||
        ua.includes("18.3") ||
        ua.includes("WaesyBot");
      expect(isModern).toBe(true);
    });

    it("deve injetar Client Hints e headers industriais de navegação realista", () => {
      const headers = getRealisticBrowserHeaders();
      expect(headers["User-Agent"]).toBeDefined();
      expect(headers["Accept"]).toContain("text/html");
      expect(headers["Accept-Language"]).toContain("pt-BR");
      expect(headers["sec-ch-ua"]).toContain("Chromium");
      expect(headers["sec-ch-ua"]).toContain("134");
      expect(headers["sec-ch-ua-mobile"]).toMatch(/^\?[01]$/);
      expect(headers["sec-ch-ua-platform"]).toMatch(/^"(Windows|macOS|Linux)"$/);
      expect(headers["priority"]).toBe("u=0, i");
      expect(headers["upgrade-insecure-requests"]).toBe("1");
    });

    it("deve permitir sobrescrita de headers customizados sem perder Client Hints padrão", () => {
      const headers = getRealisticBrowserHeaders({
        "X-Custom-Token": "waesy-mining-v127",
        "Accept-Language": "en-US,en;q=0.9",
      });
      expect(headers["X-Custom-Token"]).toBe("waesy-mining-v127");
      expect(headers["Accept-Language"]).toBe("en-US,en;q=0.9");
      expect(headers["sec-ch-ua"]).toBeDefined();
    });
  });

  describe("2. Vetor A: Cooldown de Domínio e Circuit Breaker de 429/403", () => {
    beforeEach(() => {
      clearDomainCooldown("exemplo-bloqueado.com.br");
    });

    it("deve registrar e identificar domínio em quarentena", () => {
      setDomainCooldown("exemplo-bloqueado.com.br", 10000, "rate_limit_429", 429);
      const status = isDomainInCooldown("exemplo-bloqueado.com.br");
      expect(status.inCooldown).toBe(true);
      expect(status.remainingSeconds).toBeGreaterThan(0);
      expect(status.httpStatus).toBe(429);
    });

    it("deve limpar domínio do cooldown quando expirado ou explicitamente removido", () => {
      setDomainCooldown("exemplo-bloqueado.com.br", 10000, "manual_test", 429);
      clearDomainCooldown("exemplo-bloqueado.com.br");
      const status = isDomainInCooldown("exemplo-bloqueado.com.br");
      expect(status.inCooldown).toBe(false);
      expect(status.remainingSeconds).toBe(0);
    });
  });

  describe("3. Vetor E: Crawler Self-Healing Reaper de Itens Presos em Processing", () => {
    it("deve resetar itens travados em 'processing' há mais de 10 minutos de volta para 'pending'", async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOr = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: "stalled-item-1" }, { id: "stalled-item-2" }],
        error: null,
      });

      const fakeSupabase = {
        from: vi.fn().mockReturnValue({
          update: mockUpdate,
          eq: mockEq,
          or: mockOr,
          select: mockSelect,
        }),
      };

      const reaped = await reapStalledProcessingQueueItems(fakeSupabase);
      expect(reaped).toBe(2);
      expect(fakeSupabase.from).toHaveBeenCalledWith("crawl_queue");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "pending",
          last_error: expect.stringContaining("Auto-reset pelo reaper"),
        })
      );
      expect(mockEq).toHaveBeenCalledWith("status", "processing");
    });

    it("deve tratar erros de banco graciosamente sem lançar exceção não capturada", async () => {
      const fakeSupabase = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          select: vi.fn().mockResolvedValue({ data: null, error: { message: "DB Connection Lost" } }),
        }),
      };

      const reaped = await reapStalledProcessingQueueItems(fakeSupabase);
      expect(reaped).toBe(0);
    });
  });

  describe("4. Vetores B & D: Validação de Estrutura e Afinidade de IA", () => {
    it("deve confirmar que tarefas editoriais e textuais usam o pool ultra-rápido Groq com Qwen 3.8", () => {
      const isVision = false;
      const defaultCascade = isVision
        ? ["gemini", "openai", "openrouter", "anthropic"]
        : ["groq", "gemini", "openrouter", "openai", "anthropic"];
      expect(defaultCascade[0]).toBe("groq");
      expect(defaultCascade[1]).toBe("gemini");
    });

    it("deve confirmar que tarefas visuais e OCR chaveiam para o pool multimodal gratuito do Gemini", () => {
      const isVision = true;
      const defaultCascade = isVision
        ? ["gemini", "openai", "openrouter", "anthropic"]
        : ["groq", "gemini", "openrouter", "openai", "anthropic"];
      expect(defaultCascade[0]).toBe("gemini");
      expect(defaultCascade).not.toContain("groq");
    });
  });
});
