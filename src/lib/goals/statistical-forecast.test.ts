import { describe, expect, it } from "vitest";
import { computeStatisticalGoalForecast } from "./statistical-forecast";

describe("Statistical Goal Forecast Engine (EWMA + Seasonality + P10/P50/P90)", () => {
  it("computes ordered P10 <= P50 <= P90 intervals and weighted pipeline contribution", () => {
    const now = new Date(Date.UTC(2026, 10, 15)); // 2026-11-15 (mid-month)

    const result = computeStatisticalGoalForecast({
      targetYear: 2026,
      targetMonth: 11,
      nowDate: now,
      dailyObservations: [
        { date: "2026-11-02", grossCents: 1_200_000, agencyRevenueCents: 144_000, netProfitCents: 100_000, count: 2 },
        { date: "2026-11-05", grossCents: 1_500_000, agencyRevenueCents: 180_000, netProfitCents: 120_000, count: 1 },
        { date: "2026-11-09", grossCents: 2_100_000, agencyRevenueCents: 252_000, netProfitCents: 180_000, count: 2 },
        { date: "2026-11-12", grossCents: 1_800_000, agencyRevenueCents: 216_000, netProfitCents: 150_000, count: 2 },
        { date: "2026-11-14", grossCents: 1_900_000, agencyRevenueCents: 228_000, netProfitCents: 160_000, count: 1 },
      ],
      historicalMonths: [
        { competenceMonth: "2026-10", grossCents: 12_000_000, agencyRevenueCents: 1_440_000, salesCount: 14 },
        { competenceMonth: "2026-09", grossCents: 10_000_000, agencyRevenueCents: 1_200_000, salesCount: 12 },
        { competenceMonth: "2025-11", grossCents: 15_000_000, agencyRevenueCents: 1_800_000, salesCount: 16 },
      ],
      openPipelineDeals: [
        { id: "d1", title: "Grupo Cancún", stage: "negotiation", valueCents: 6_000_000, sellerName: "Ana" },
        { id: "d2", title: "Europa Primavera", stage: "proposal_sent", valueCents: 4_000_000, sellerName: "Ana" },
      ],
      monthlyGrossGoalCents: 15_000_000,
      monthlyAgencyRevenueGoalCents: 1_800_000,
    });

    expect(result.realizedGrossCents).toBe(8_500_000);
    expect(result.p10GrossCents).toBeLessThanOrEqual(result.p50GrossCents);
    expect(result.p50GrossCents).toBeLessThanOrEqual(result.p90GrossCents);
    expect(result.pipeline.totalOpenGrossCents).toBe(10_000_000);
    expect(result.pipeline.weightedExpectedGrossCents).toBeGreaterThan(0);
    expect(result.goalHitProbabilityPct).toBeGreaterThanOrEqual(0);
    expect(result.goalHitProbabilityPct).toBeLessThanOrEqual(100);
    expect(result.confidenceScore).toBeGreaterThan(0);
    expect(result.ewmaDailyVelocityGrossCents).toBeGreaterThan(0);
  });

  it("increases hit probability to 100% when target is already exceeded", () => {
    const result = computeStatisticalGoalForecast({
      targetYear: 2026,
      targetMonth: 11,
      nowDate: new Date(Date.UTC(2026, 10, 28)),
      dailyObservations: [
        { date: "2026-11-10", grossCents: 18_000_000, agencyRevenueCents: 2_160_000, netProfitCents: 1_500_000, count: 10 },
      ],
      historicalMonths: [],
      openPipelineDeals: [],
      monthlyGrossGoalCents: 15_000_000,
      monthlyAgencyRevenueGoalCents: 1_800_000,
    });

    expect(result.realizedGrossCents).toBe(18_000_000);
    expect(result.goalHitProbabilityPct).toBe(100);
  });

  it("handles zero observations cleanly without NaN values", () => {
    const result = computeStatisticalGoalForecast({
      targetYear: 2026,
      targetMonth: 11,
      nowDate: new Date(Date.UTC(2026, 10, 10)),
      dailyObservations: [],
      historicalMonths: [],
      openPipelineDeals: [],
      monthlyGrossGoalCents: 5_000_000,
      monthlyAgencyRevenueGoalCents: 600_000,
    });

    expect(Number.isFinite(result.p10GrossCents)).toBe(true);
    expect(Number.isFinite(result.p50GrossCents)).toBe(true);
    expect(Number.isFinite(result.p90GrossCents)).toBe(true);
    expect(Number.isNaN(result.goalHitProbabilityPct)).toBe(false);
    expect(result.p10GrossCents).toBe(0);
  });
});
