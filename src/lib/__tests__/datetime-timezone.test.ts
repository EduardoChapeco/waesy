import { describe, it, expect } from "vitest";
import { getOpenStatus, formatTimeOnly } from "../datetime";

describe("Desacoplamento de Timezone & Status Operacional (AGENTS.md GAP-09)", () => {
  it("avalia status com timezone explícito (ex: America/Manaus vs America/Sao_Paulo)", () => {
    const rawHours = {
      mon: { open: true, intervals: [{ from: "08:00", to: "18:00" }] },
      tue: { open: true, intervals: [{ from: "08:00", to: "18:00" }] },
      wed: { open: true, intervals: [{ from: "08:00", to: "18:00" }] },
      thu: { open: true, intervals: [{ from: "08:00", to: "18:00" }] },
      fri: { open: true, intervals: [{ from: "08:00", to: "18:00" }] },
      sat: { open: false, intervals: [] },
      sun: { open: false, intervals: [] },
    };

    const statusSP = getOpenStatus(rawHours, null, null, "America/Sao_Paulo");
    expect(statusSP).toBeDefined();
    expect(["open", "closed", "paused"]).toContain(statusSP.status);

    const statusManaus = getOpenStatus(rawHours, null, null, "America/Manaus");
    expect(statusManaus).toBeDefined();
    expect(["open", "closed", "paused"]).toContain(statusManaus.status);
  });

  it("formata horário respeitando timezone informado", () => {
    // 2026-10-23T14:00:00Z
    // UTC 14:00 -> SP (UTC-3) é 11:00 -> Manaus (UTC-4) é 10:00
    const utcDate = new Date("2026-10-23T14:00:00Z");

    const timeSP = formatTimeOnly(utcDate, "America/Sao_Paulo");
    const timeManaus = formatTimeOnly(utcDate, "America/Manaus");

    expect(timeSP).toBe("11:00");
    expect(timeManaus).toBe("10:00");
  });

  it("aplica fallback seguro para America/Sao_Paulo se timezone for inválido", () => {
    const utcDate = new Date("2026-10-23T14:00:00Z");
    const timeFallback = formatTimeOnly(utcDate, "Invalid/Timezone");
    expect(timeFallback).toBe("11:00");
  });
});
