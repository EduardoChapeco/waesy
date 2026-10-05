import { describe, it, expect, beforeEach, vi } from "vitest";
import { CrawlerCircuitBreaker } from "./crawler-circuit-breaker";
import { canonicalizeUrl, hashCanonicalUrl, UrlLoopDetector } from "./url-canonicalizer";

describe("Crawler Circuit Breaker & Loop Protection Suite", () => {
  let breaker: CrawlerCircuitBreaker;

  beforeEach(() => {
    breaker = new CrawlerCircuitBreaker({
      failureThreshold: 3,
      cooldownPeriodMs: 100, // 100ms para testes rápidos
      maxTimeoutMs: 50, // 50ms para teste de timeout
    });
  });

  it("permite execução normal quando o circuito está CLOSED", async () => {
    const result = await breaker.execute(async () => "dados extraídos com sucesso", "example.com");
    expect(result).toBe("dados extraídos com sucesso");
    expect(breaker.getStatus("example.com").state).toBe("CLOSED");
    expect(breaker.getStatus("example.com").consecutiveFailures).toBe(0);
  });

  it("abre o circuito (OPEN) após atingir o limiar de falhas consecutivas", async () => {
    const failingFn = async () => {
      throw new Error("Erro de conexão HTTP 503");
    };

    // 1ª falha
    await expect(breaker.execute(failingFn, "flaky-api.com")).rejects.toThrow("503");
    expect(breaker.getStatus("flaky-api.com").state).toBe("CLOSED");

    // 2ª falha
    await expect(breaker.execute(failingFn, "flaky-api.com")).rejects.toThrow("503");
    expect(breaker.getStatus("flaky-api.com").state).toBe("CLOSED");

    // 3ª falha -> deve abrir o circuito
    await expect(breaker.execute(failingFn, "flaky-api.com")).rejects.toThrow("503");
    expect(breaker.getStatus("flaky-api.com").state).toBe("OPEN");

    // Chamada subsequente imediata deve ser bloqueada pelo Circuit Breaker sem chamar a função
    await expect(breaker.execute(async () => "não deve rodar", "flaky-api.com")).rejects.toThrow(
      "Circuito ABERTO"
    );
  });

  it("isola falhas por domínio sem penalizar alvos saudáveis", async () => {
    const failingFn = async () => {
      throw new Error("Falha no servidor A");
    };

    for (let i = 0; i < 3; i += 1) {
      await expect(breaker.execute(failingFn, "server-a.com")).rejects.toThrow();
    }
    expect(breaker.getStatus("server-a.com").state).toBe("OPEN");

    // server-b deve continuar operacional
    const resB = await breaker.execute(async () => "sucesso em b", "server-b.com");
    expect(resB).toBe("sucesso em b");
    expect(breaker.getStatus("server-b.com").state).toBe("CLOSED");
  });

  it("aborta execução quando o timeout da requisição leaf é excedido", async () => {
    const hangingFn = async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return "tarde demais";
    };

    await expect(breaker.execute(hangingFn, "slow-host.com")).rejects.toThrow("Timeout de 50ms excedido");
  });

  it("transiciona de OPEN para HALF_OPEN após o período de cooldown e fecha com sucesso", async () => {
    const failingFn = async () => {
      throw new Error("Falha temporária");
    };

    for (let i = 0; i < 3; i += 1) {
      await expect(breaker.execute(failingFn, "recovering-host.com")).rejects.toThrow();
    }
    expect(breaker.getStatus("recovering-host.com").state).toBe("OPEN");

    // Aguarda o cooldown de 100ms
    await new Promise((resolve) => setTimeout(resolve, 110));

    expect(breaker.getStatus("recovering-host.com").state).toBe("HALF_OPEN");

    // Chamada de teste bem-sucedida deve fechar o circuito
    const recoveryResult = await breaker.execute(async () => "recuperado", "recovering-host.com");
    expect(recoveryResult).toBe("recuperado");
    expect(breaker.getStatus("recovering-host.com").state).toBe("CLOSED");
  });
});

describe("URL Canonicalizer & Loop Detector Suite", () => {
  it("remove parâmetros efêmeros de rastreamento e normaliza URLs", () => {
    const dirtyUrl1 = "https://WWW.Example.com:443/produtos/item-123/?utm_source=google&fbclid=XYZ123#reviews";
    const cleanUrl1 = canonicalizeUrl(dirtyUrl1);
    expect(cleanUrl1).toBe("https://www.example.com/produtos/item-123");

    const dirtyUrl2 = "http://example.com:80/noticias/chapeco?ref=feed&utm_campaign=diaria&tema=economia";
    const cleanUrl2 = canonicalizeUrl(dirtyUrl2);
    expect(cleanUrl2).toBe("http://example.com/noticias/chapeco?tema=economia");
  });

  it("gera hash SHA-256 idêntico para URLs logicamente equivalentes", () => {
    const urlA = "https://g1.globo.com/sc/noticia.ghtml?utm_source=twitter&ref=share";
    const urlB = "https://g1.globo.com/sc/noticia.ghtml?utm_medium=cpc";
    expect(hashCanonicalUrl(urlA)).toBe(hashCanonicalUrl(urlB));
  });

  it("detecta URLs visitadas e previne laços infinitos de navegação", () => {
    const detector = new UrlLoopDetector({ maxDepth: 2, maxPagesPerRun: 3 });

    // 1ª URL
    expect(detector.shouldVisit("https://site.com/p1", 0)).toBe(true);
    detector.markVisited("https://site.com/p1");

    // Tentativa de revisitar a mesma URL -> bloqueada
    expect(detector.shouldVisit("https://site.com/p1?utm_source=ads", 1)).toBe(false);

    // 2ª URL em profundidade 2
    expect(detector.shouldVisit("https://site.com/p2", 2)).toBe(true);
    detector.markVisited("https://site.com/p2");

    // Tentativa de visitar com profundidade além do limite (3 > 2) -> bloqueada
    expect(detector.shouldVisit("https://site.com/p3", 3)).toBe(false);

    // 3ª URL dentro do limite
    expect(detector.shouldVisit("https://site.com/p3", 1)).toBe(true);
    detector.markVisited("https://site.com/p3");

    // Limite máximo de páginas por execução atingido (3/3)
    expect(detector.shouldVisit("https://site.com/p4", 0)).toBe(false);
  });
});
