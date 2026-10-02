import { describe, it, expect } from "vitest";
import {
  calculateErrorBudget,
  evaluateSubsystemHealth,
  getSystemStatusReport,
} from "./status-engine";

describe("Status Engine & Error Budget (Fase S37)", () => {
  describe("calculateErrorBudget", () => {
    it("deve classificar como HEALTHY quando consumo está abaixo de 70%", () => {
      // 10.000 requisições, tolerância 10 falhas (0.1% de 10.000). 5 falhas = 50% consumido
      const budget = calculateErrorBudget(10_000, 5, 99.9);
      expect(budget.status).toBe("HEALTHY");
      expect(budget.currentUptimePercent).toBe(99.95);
      expect(budget.budgetConsumedPercent).toBe(50);
      expect(budget.deployFreezeRecommended).toBe(false);
    });

    it("deve classificar como WARNING quando consumo está entre 70% e 100%", () => {
      const budget = calculateErrorBudget(10_000, 8, 99.9);
      expect(budget.status).toBe("WARNING");
      expect(budget.budgetConsumedPercent).toBe(80);
      expect(budget.deployFreezeRecommended).toBe(false);
    });

    it("deve classificar como BREACHED e recomendar congelamento quando consumo > 100%", () => {
      const budget = calculateErrorBudget(10_000, 15, 99.9);
      expect(budget.status).toBe("BREACHED");
      expect(budget.budgetConsumedPercent).toBe(150);
      expect(budget.deployFreezeRecommended).toBe(true);
    });
  });

  describe("evaluateSubsystemHealth", () => {
    it("deve reportar status operacional sob baixa taxa de falhas", () => {
      const health = evaluateSubsystemHealth("database", {
        errorCount: 0,
        totalCount: 5000,
        latencyMs: 25,
      });

      expect(health.status).toBe("operational");
      expect(health.uptimePercent).toBe(100);
      expect(health.name).toContain("Postgres");
    });

    it("deve reportar status degradado sob latência excessiva", () => {
      const health = evaluateSubsystemHealth("edge_ssr", {
        errorCount: 2,
        totalCount: 1000,
        latencyMs: 2200,
      });

      expect(health.status).toBe("degraded");
      expect(health.message).toContain("Degradação pontual");
    });

    it("deve reportar status de outage sob taxa de erro crítica (>5%)", () => {
      const health = evaluateSubsystemHealth("payments", {
        errorCount: 60,
        totalCount: 1000,
      });

      expect(health.status).toBe("outage");
      expect(health.uptimePercent).toBe(94);
    });
  });

  describe("getSystemStatusReport", () => {
    it("deve retornar o consolidado dos 5 subsistemas e do orçamento", () => {
      const report = getSystemStatusReport();
      expect(report.subsystems.length).toBe(5);
      expect(report.errorBudget).toBeDefined();
      expect(["operational", "degraded", "outage"]).toContain(report.overallStatus);
      expect(report.timestamp).toBeDefined();
    });
  });
});
