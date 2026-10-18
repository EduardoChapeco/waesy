import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  withInfotravelResilience,
  resetInfotravelResilienceStateForTests,
  getInfotravelResilienceMetrics,
  sanitizeInfotravelSearchText,
  InfotravelCircuitBreakerOpenError,
  InfotravelRateLimitError,
  InfotravelNotConfiguredError,
} from "./infotravel";

describe("InfoTravel Resilience Engine (Cache TTL, Deduplication, Circuit Breaker & Rate Limit)", () => {
  const storeId = "11111111-2222-3333-4444-555555555555";

  beforeEach(() => {
    resetInfotravelResilienceStateForTests();
  });

  it("retorna Cache Hit imediato dentro do TTL de 15 minutos sem duplicar chamadas na API InfoTravel", async () => {
    const upstreamMock = vi.fn().mockResolvedValue([{ id: "PKG-1", name: "Maceió Resort" }]);

    const first = await withInfotravelResilience(
      {
        storeId,
        operatorSlug: "orinter",
        action: "packageAvail",
        params: { destination: "Maceió", departureDate: "2027-01-10", returnDate: "2027-01-17" },
      },
      upstreamMock,
    );

    const second = await withInfotravelResilience(
      {
        storeId,
        operatorSlug: "orinter",
        action: "packageAvail",
        params: { returnDate: "2027-01-17", destination: "  maceió  ", departureDate: "2027-01-10" },
      },
      upstreamMock,
    );

    expect(first).toEqual([{ id: "PKG-1", name: "Maceió Resort" }]);
    expect(second).toEqual([{ id: "PKG-1", name: "Maceió Resort" }]);
    expect(upstreamMock).toHaveBeenCalledTimes(1);
    expect(getInfotravelResilienceMetrics().cacheSize).toBe(1);
  });

  it("deduplica requisições concorrentes idênticas (In-Flight Deduplication)", async () => {
    let resolveUpstream!: (val: string[]) => void;
    const upstreamMock = vi.fn().mockImplementation(
      () =>
        new Promise<string[]>((resolve) => {
          resolveUpstream = resolve;
        }),
    );

    const p1 = withInfotravelResilience(
      { storeId, action: "search_hotels", params: { city: "Gramado", checkin: "2027-05-01" } },
      upstreamMock,
    );
    const p2 = withInfotravelResilience(
      { storeId, action: "search_hotels", params: { city: "gramado", checkin: "2027-05-01" } },
      upstreamMock,
    );

    expect(getInfotravelResilienceMetrics().inFlightCount).toBe(1);
    resolveUpstream(["Hotel Casa da Montanha"]);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual(["Hotel Casa da Montanha"]);
    expect(r2).toEqual(["Hotel Casa da Montanha"]);
    expect(upstreamMock).toHaveBeenCalledTimes(1);
  });

  it("abre o Circuit Breaker após 3 falhas consecutivas de rede/HTTP 429 e bloqueia novas chamadas", async () => {
    const failingMock = vi.fn().mockRejectedValue(new Error("HTTP 429 Too Many Requests"));

    for (let i = 1; i <= 3; i++) {
      await expect(
        withInfotravelResilience(
          { storeId, operatorSlug: "frt", action: "search_flights", params: { attempt: i } },
          failingMock,
        ),
      ).rejects.toThrow("HTTP 429 Too Many Requests");
    }

    expect(failingMock).toHaveBeenCalledTimes(3);
    expect(getInfotravelResilienceMetrics().openCircuits).toHaveLength(1);

    // A 4ª chamada deve ser bloqueada imediatamente pelo Circuit Breaker sem acionar failingMock
    await expect(
      withInfotravelResilience(
        { storeId, operatorSlug: "frt", action: "search_flights", params: { attempt: 4 } },
        failingMock,
      ),
    ).rejects.toBeInstanceOf(InfotravelCircuitBreakerOpenError);

    expect(failingMock).toHaveBeenCalledTimes(3);
  });

  it("não abre o Circuit Breaker quando o erro for InfotravelNotConfiguredError (onboarding)", async () => {
    const unconfiguredMock = vi.fn().mockRejectedValue(new InfotravelNotConfiguredError());

    for (let i = 1; i <= 4; i++) {
      await expect(
        withInfotravelResilience(
          { storeId, operatorSlug: "cativa", action: "search_hotels", params: { try: i } },
          unconfiguredMock,
        ),
      ).rejects.toBeInstanceOf(InfotravelNotConfiguredError);
    }

    expect(getInfotravelResilienceMetrics().openCircuits).toHaveLength(0);
  });

  it("aplica Rate Limiting anti-loop/anti-bot quando o limite por minuto é ultrapassado", async () => {
    const fastMock = vi.fn().mockResolvedValue({ ok: true });

    for (let i = 1; i <= 3; i++) {
      await withInfotravelResilience(
        {
          storeId,
          action: "public_packages",
          params: { page: i },
          maxRequestsPerMin: 3,
        },
        fastMock,
      );
    }

    await expect(
      withInfotravelResilience(
        {
          storeId,
          action: "public_packages",
          params: { page: 4 },
          maxRequestsPerMin: 3,
        },
        fastMock,
      ),
    ).rejects.toBeInstanceOf(InfotravelRateLimitError);

    expect(fastMock).toHaveBeenCalledTimes(3);
  });

  it("higieniza strings de busca contra injeção de caracteres especiais e scripts", () => {
    const raw = `  Buenos Aires <script>alert("xss")</script>; DROP TABLE -- $1  `;
    const sanitized = sanitizeInfotravelSearchText(raw);
    expect(sanitized).not.toContain("<");
    expect(sanitized).not.toContain(">");
    expect(sanitized).not.toContain(";");
    expect(sanitized).not.toContain("$");
    expect(sanitized).toContain("Buenos Aires");
  });
});
