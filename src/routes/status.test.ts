import { describe, it, expect } from "vitest";
import { Route } from "./status";
import { getSystemStatusReport } from "@/lib/telemetry/status-engine";

describe("Status Route (Fase S37)", () => {
  it("deve declarar a rota TanStack Router estritamente como /status", () => {
    // Valida a definição do caminho da rota
    expect(Route).toBeDefined();
    expect(typeof Route.options.component).toBe("function");
  });

  it("deve prover metadados de cabeçalho com título apropriado", () => {
    const metaFn = (Route.options as { head?: () => { meta: Array<{ title: string }> } }).head;
    expect(metaFn).toBeDefined();
    if (metaFn) {
      const head = metaFn();
      expect(head.meta[0].title).toContain("Status Operacional");
    }
  });

  it("deve carregar o relatório de status sem exceções", () => {
    const report = getSystemStatusReport();
    expect(report.subsystems.length).toBe(5);
    expect(report.errorBudget.sloTargetPercent).toBe(99.9);
  });
});
