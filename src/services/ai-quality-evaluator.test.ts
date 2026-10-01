import { describe, it, expect } from "vitest";
import { runFullQualityEvaluation } from "./ai-quality-evaluator.engine";

describe("AI Quality & Regression Framework (PROMPT 12 / Plano #16)", () => {
  it("1. Deve executar o benchmark completo de 20 casos e retornar 100% de aprovação", async () => {
    const report = await runFullQualityEvaluation();

    if (report.failedCount > 0) {
      console.log("FAILED BENCHMARKS:", JSON.stringify(report.results.filter(r => r.passed === false), null, 2));
    }

    expect(report.totalBenchmarks).toBe(20);
    expect(report.passedCount).toBe(20);
    expect(report.failedCount).toBe(0);
    expect(report.hasRegression).toBe(false);
  });

  it("2. Deve garantir nota global acima do piso mínimo de 4.20/5.00", async () => {
    const report = await runFullQualityEvaluation();

    expect(report.overallScore).toBeGreaterThanOrEqual(4.2);
    expect(report.rubricAverages.compliance_and_safety).toBeGreaterThanOrEqual(4.5);
    expect(report.rubricAverages.faithfulness_to_ground_truth).toBeGreaterThanOrEqual(4.5);
  });

  it("3. Deve mapear todas as 6 rubricas com médias válidas (entre 0 e 5)", async () => {
    const report = await runFullQualityEvaluation();
    const r = report.rubricAverages;

    expect(r.faithfulness_to_ground_truth).toBeGreaterThan(0);
    expect(r.faithfulness_to_ground_truth).toBeLessThanOrEqual(5);

    expect(r.actionability_and_structure).toBeGreaterThan(0);
    expect(r.actionability_and_structure).toBeLessThanOrEqual(5);

    expect(r.brand_tone_and_silence).toBeGreaterThan(0);
    expect(r.brand_tone_and_silence).toBeLessThanOrEqual(5);

    expect(r.compliance_and_safety).toBeGreaterThan(0);
    expect(r.compliance_and_safety).toBeLessThanOrEqual(5);

    expect(r.completeness_and_depth).toBeGreaterThan(0);
    expect(r.completeness_and_depth).toBeLessThanOrEqual(5);

    expect(r.latency_and_efficiency).toBeGreaterThan(0);
    expect(r.latency_and_efficiency).toBeLessThanOrEqual(5);
  });

  it("4. Deve calcular latência média por caso em nível instantâneo/ultra-rápido (< 500ms no motor determinístico)", async () => {
    const report = await runFullQualityEvaluation();

    for (const res of report.results) {
      expect(res.latencyMs).toBeLessThan(500);
      expect(res.scores.latency_and_efficiency).toBe(5);
    }
  });
});
