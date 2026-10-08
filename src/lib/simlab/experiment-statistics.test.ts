import { describe, expect, it } from "vitest";
import {
  analyzeCampaignExperiment,
  fitRandomizedPriceResponse,
  holmAdjustPValues,
  planTwoArmSampleSize,
  predictPriceResponse,
} from "./experiment-statistics";

describe("SimLab statistical methods", () => {
  it("estimates randomized campaign lift from observed assigned customers", () => {
    const result = analyzeCampaignExperiment({
      assignmentMethod: "randomized",
      randomizationUnit: "customer",
      controlKey: "control",
      arms: [
        { key: "control", label: "Controle", assigned: 1000, conversions: 100 },
        { key: "variant", label: "Variante", assigned: 1000, conversions: 120 },
      ],
    });

    const comparison = result.comparisons[0];
    expect(result.method).toBe("intention_to_treat_proportion_difference");
    expect(comparison.absoluteDifference).toBeCloseTo(0.02, 10);
    expect(comparison.causalInterpretation).toBe("randomized_individual_assignment");
    expect(comparison.interval).not.toBeNull();
    if (!comparison.interval) throw new Error("Randomized customer comparison must include a confidence interval.");
    expect(comparison.interval[0]).toBeLessThan(comparison.absoluteDifference);
    expect(comparison.interval[1]).toBeGreaterThan(comparison.absoluteDifference);
    expect(comparison.pValue).toBeGreaterThan(0.05);
    expect(result.armRates[0].conversionRate).toBeCloseTo(0.1, 10);
  });

  it("labels observational comparisons as descriptive rather than causal", () => {
    const result = analyzeCampaignExperiment({
      assignmentMethod: "observational",
      controlKey: "control",
      arms: [
        { key: "control", label: "Controle histórico", assigned: 500, conversions: 40 },
        { key: "variant", label: "Campanha", assigned: 600, conversions: 72 },
      ],
    });
    expect(result.comparisons[0].causalInterpretation).toBe("descriptive_only");
    expect(result.limitations.some((item) => item.includes("descritivos"))).toBe(true);
  });

  it("uses Fisher exact test for sparse outcomes", () => {
    const result = analyzeCampaignExperiment({
      assignmentMethod: "randomized",
      randomizationUnit: "customer",
      controlKey: "control",
      arms: [
        { key: "control", label: "Controle", assigned: 30, conversions: 1 },
        { key: "variant", label: "Variante", assigned: 30, conversions: 5 },
      ],
    });
    expect(result.comparisons[0].pValueMethod).toBe("fisher_exact");
    expect(result.comparisons[0].pValue).toBeGreaterThanOrEqual(0);
    expect(result.comparisons[0].pValue).toBeLessThanOrEqual(1);
  });

  it("keeps randomized sessions descriptive and omits unsupported individual-level inference", () => {
    const result = analyzeCampaignExperiment({
      assignmentMethod: "randomized",
      randomizationUnit: "session",
      controlKey: "control",
      arms: [
        { key: "control", label: "Controle", assigned: 100, conversions: 10 },
        { key: "variant", label: "Variante", assigned: 100, conversions: 12 },
      ],
    });
    expect(result.comparisons[0].causalInterpretation).toBe("descriptive_only");
    expect(result.comparisons[0].pValue).toBeNull();
    expect(result.comparisons[0].pValueMethod).toBe("not_identifiable_design");
    expect(result.comparisons[0].interval).toBeNull();
    expect(result.armRates[0].interval).toBeNull();
  });

  it("keeps randomized clusters descriptive until cluster-level variance is available", () => {
    const result = analyzeCampaignExperiment({
      assignmentMethod: "randomized",
      randomizationUnit: "cluster",
      controlKey: "control",
      arms: [
        { key: "control", label: "Controle", assigned: 200, conversions: 20 },
        { key: "variant", label: "Variante", assigned: 200, conversions: 30 },
      ],
    });
    expect(result.comparisons[0].pValue).toBeNull();
    expect(result.comparisons[0].interval).toBeNull();
    expect(result.limitations.some((item) => item.includes("cluster"))).toBe(true);
  });

  it("rejects conversions greater than assigned observations", () => {
    expect(() => analyzeCampaignExperiment({
      assignmentMethod: "randomized",
      randomizationUnit: "customer",
      controlKey: "control",
      arms: [
        { key: "control", label: "Controle", assigned: 10, conversions: 11 },
        { key: "variant", label: "Variante", assigned: 10, conversions: 2 },
      ],
    })).toThrow(/não podem superar/);
  });

  it("plans two-arm sample size from an observed baseline and MDE", () => {
    const result = planTwoArmSampleSize({ baselineRate: 0.05, targetRate: 0.06, alpha: 0.05, power: 0.8 });
    expect(result.method).toBe("two_independent_proportions_normal_approximation");
    expect(result.requiredPerArm).toBeGreaterThan(1000);
    expect(result.totalRequired).toBe(result.requiredPerArm * 2);
  });

  it("applies monotone Holm step-down adjusted p-values", () => {
    expect(holmAdjustPValues([0.01, 0.04, 0.03])).toEqual([0.03, 0.06, 0.06]);
    expect(holmAdjustPValues([0.9])).toEqual([0.9]);
  });

  it("fits a randomized grouped-binomial price curve and decreases conversion as price rises", () => {
    const model = fitRandomizedPriceResponse({
      assignmentMethod: "randomized",
      randomizationUnit: "customer",
      arms: [
        { key: "p1", label: "Preço baixo", assigned: 1000, conversions: 200, priceBrl: 50 },
        { key: "p2", label: "Preço médio", assigned: 1000, conversions: 130, priceBrl: 80 },
        { key: "p3", label: "Preço alto", assigned: 1000, conversions: 75, priceBrl: 120 },
      ],
    });
    const low = predictPriceResponse(model, 60);
    const high = predictPriceResponse(model, 110);
    expect(model.method).toBe("grouped_binomial_logit_log_price");
    expect(model.calibrationStatus).toBe("fitted_requires_holdout_validation");
    expect(model.coefficients.logPrice).toBeLessThan(0);
    expect(low.conversionProbability).toBeGreaterThan(high.conversionProbability);
    expect(low.interval95[0]).toBeLessThan(low.conversionProbability);
    expect(low.interval95[1]).toBeGreaterThan(low.conversionProbability);
  });

  it("does not estimate price elasticity from observational prices", () => {
    expect(() => fitRandomizedPriceResponse({
      assignmentMethod: "observational",
      randomizationUnit: "customer",
      arms: [
        { key: "p1", label: "Preço baixo", assigned: 100, conversions: 20, priceBrl: 50 },
        { key: "p2", label: "Preço médio", assigned: 100, conversions: 10, priceBrl: 80 },
        { key: "p3", label: "Preço alto", assigned: 100, conversions: 5, priceBrl: 120 },
      ],
    })).toThrow(/braços de preço randomizados/);
  });
});
