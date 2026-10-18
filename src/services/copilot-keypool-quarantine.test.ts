import { describe, expect, it } from "vitest";
import { classifyKeyQuotaError } from "./api-orchestrator.functions";

const NOW = Date.UTC(2026, 9, 18, 15, 30, 0); // 2026-10-18T15:30:00Z

describe("classifyKeyQuotaError — quarentena por escopo de cota", () => {
  it("429 padrão (RPM/TPM) quarentena por 60s", () => {
    const r = classifyKeyQuotaError(429, "Rate limit reached for requests per minute", NOW);
    expect(r.scope).toBe("minute");
    expect(r.until).toBe(NOW + 60_000);
  });

  it("429 com cota diária (RPD/TPD) quarentena até 00:00 UTC do dia seguinte", () => {
    const r = classifyKeyQuotaError(429, "Rate limit reached: tokens per day (TPD) limit 100000", NOW);
    expect(r.scope).toBe("day");
    expect(r.until).toBe(Date.UTC(2026, 9, 19, 0, 0, 0));
  });

  it("Gemini RESOURCE_EXHAUSTED por dia entra no escopo day", () => {
    const r = classifyKeyQuotaError(429, "GenerateRequestsPerDayPerProjectPerModel-FreeTier exceeded", NOW);
    expect(r.scope).toBe("day");
  });

  it("402 / insufficient_quota quarentena até o dia 1º do próximo mês", () => {
    const r402 = classifyKeyQuotaError(402, "Payment required", NOW);
    expect(r402.scope).toBe("month");
    expect(r402.until).toBe(Date.UTC(2026, 10, 1, 0, 0, 0));

    const rQuota = classifyKeyQuotaError(429, "You exceeded your current quota: insufficient_quota", NOW);
    expect(rQuota.scope).toBe("month");
  });

  it("virada de ano: dezembro aponta para 1º de janeiro", () => {
    const dec = Date.UTC(2026, 11, 20, 10, 0, 0);
    const r = classifyKeyQuotaError(402, "", dec);
    expect(r.until).toBe(Date.UTC(2027, 0, 1, 0, 0, 0));
  });

  it("401/403 chave inválida é permanente (sem janela de retorno)", () => {
    const r = classifyKeyQuotaError(401, "Invalid API Key", NOW);
    expect(r.scope).toBe("permanent");
    expect(r.until).toBeNull();
    expect(classifyKeyQuotaError(403, "forbidden", NOW).scope).toBe("permanent");
  });

  it("erro 5xx transitório quarentena por 30s", () => {
    const r = classifyKeyQuotaError(503, "service unavailable", NOW);
    expect(r.scope).toBe("minute");
    expect(r.until).toBe(NOW + 30_000);
  });
});
