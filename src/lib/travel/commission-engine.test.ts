import { describe, expect, it } from "vitest";
import {
  calculateTravelSaleCommissionBreakdown,
  computeGrowthComparison,
  resolveCommissionReleaseEligibility,
  resolveTierForAccumulatedVolume,
  type TravelAgentCommissionRuleProfile,
} from "./commission-engine";

const SAMPLE_AGENT_PROFILE: TravelAgentCommissionRuleProfile = {
  agentId: "agent-01",
  profileId: "11111111-1111-1111-1111-111111111111",
  agentName: "Consultora Ana",
  goalEvaluationBasis: "gross_sale",
  commissionCalculationBasis: "net_sale_plus_over",
  baseCommissionPct: 1.0,
  defaultOverCommissionPct: 30,
  tiers: [
    {
      tierName: "Faixa 1 (Até R$ 99.999,99)",
      minMonthlyRevenueCents: 0,
      maxMonthlyRevenueCents: 9_999_999,
      commissionPct: 1.0,
      overCommissionPct: 30,
    },
    {
      tierName: "Faixa 2 (R$ 100.000+)",
      minMonthlyRevenueCents: 10_000_000,
      maxMonthlyRevenueCents: null,
      commissionPct: 1.5,
      overCommissionPct: 35,
    },
  ],
  payoutMode: "off_payroll_award",
  releaseTrigger: "no_recebimento_operadora",
  hideAgencyNetFromSeller: true,
};

describe("Travel Agency Commission Engine (100% Deterministic SSOT)", () => {
  it("calculates net commissionable base, PIX zero retention Over, agency revenue, and agent Tier 1 award", () => {
    const res = calculateTravelSaleCommissionBreakdown({
      grossSaleCents: 1_500_000, // R$ 15.000
      operatorTablePriceCents: 1_400_000, // R$ 14.000 -> Over Bruto R$ 1.000
      taxesAndFeesCents: 120_000, // R$ 1.200 taxas embarque -> Base Líq R$ 12.800
      baseCommissionPct: 10, // 10% s/ R$ 12.800 = R$ 1.280
      overPaymentMethod: "pix_direto_agencia",
      overRetentionFeePct: 16, // deve ser ignorado para PIX direto (0%)
      cumulativeMonthlyGoalVolumeCents: 5_000_000, // R$ 50.000 (Faixa 1)
      agentProfile: SAMPLE_AGENT_PROFILE,
    });

    expect(res.netCommissionableBaseCents).toBe(1_280_000);
    expect(res.baseCommissionGrossCents).toBe(128_000);
    expect(res.overGrossCents).toBe(100_000);
    expect(res.effectiveOverRetentionPct).toBe(0);
    expect(res.overRetentionDeductionCents).toBe(0);
    expect(res.overNetCents).toBe(100_000);
    expect(res.agencyRevenueCents).toBe(228_000); // R$ 2.280,00
    expect(res.appliedTierName).toContain("Faixa 1");
    expect(res.appliedCommissionPct).toBe(1.0);
    expect(res.appliedOverCommissionPct).toBe(30);
    // Agente: 1% s/ 1.280.000 (=12.800) + 30% s/ 100.000 (=30.000) = 42.800 (R$ 428,00)
    expect(res.agentBaseCommissionCents).toBe(12_800);
    expect(res.agentOverCommissionCents).toBe(30_000);
    expect(res.agentCommissionTotalCents).toBe(42_800);
    expect(res.agencyNetProfitCents).toBe(185_200);
  });

  it("applies operator financed Over retention percentage and promotes to Tier 2 when monthly volume >= R$ 100k", () => {
    const res = calculateTravelSaleCommissionBreakdown({
      grossSaleCents: 2_000_000, // R$ 20.000
      operatorTablePriceCents: 1_900_000, // R$ 19.000 -> Over Bruto R$ 1.000
      taxesAndFeesCents: 100_000, // R$ 1.000 taxas -> Base Líq R$ 18.000
      baseCommissionPct: 10, // R$ 1.800 base agência
      overPaymentMethod: "operadora_financiado",
      overRetentionFeePct: 16, // R$ 160 retido pela operadora -> Over Líq R$ 840
      cumulativeMonthlyGoalVolumeCents: 10_500_000, // R$ 105.000 -> Faixa 2 (1.5% + 35%)
      agentProfile: SAMPLE_AGENT_PROFILE,
    });

    expect(res.overGrossCents).toBe(100_000);
    expect(res.effectiveOverRetentionPct).toBe(16);
    expect(res.overRetentionDeductionCents).toBe(16_000);
    expect(res.overNetCents).toBe(84_000);
    expect(res.agencyRevenueCents).toBe(264_000);
    expect(res.appliedTierName).toContain("Faixa 2");
    expect(res.appliedCommissionPct).toBe(1.5);
    expect(res.appliedOverCommissionPct).toBe(35);
    // Agente: 1.5% s/ 1.800.000 (=27.000) + 35% s/ 84.000 (=29.400) = 56.400
    expect(res.agentBaseCommissionCents).toBe(27_000);
    expect(res.agentOverCommissionCents).toBe(29_400);
    expect(res.agentCommissionTotalCents).toBe(56_400);
  });

  it("blocks unauthorized commission overrides when canApplyOverrides is false", () => {
    const res = calculateTravelSaleCommissionBreakdown({
      grossSaleCents: 1_000_000,
      baseCommissionPct: 10,
      canApplyOverrides: false,
      agentCommissionPctOverride: 50,
      agentCommissionCentsOverride: 999_999,
      agentProfile: SAMPLE_AGENT_PROFILE,
    });

    expect(res.appliedCommissionPct).toBe(1.0);
    expect(res.agentCommissionTotalCents).toBe(10_000);
  });

  it("protects agent commission on cancellation unless deductCommissionOnCancel is explicitly set", () => {
    const protectedCancel = calculateTravelSaleCommissionBreakdown({
      grossSaleCents: 1_000_000,
      baseCommissionPct: 10,
      bookingStatus: "cancelada",
      deductCommissionOnCancel: false,
      agentProfile: SAMPLE_AGENT_PROFILE,
    });
    expect(protectedCancel.agentCommissionTotalCents).toBe(10_000);
    expect(protectedCancel.appliedClawbackCents).toBe(0);

    const clawedBack = calculateTravelSaleCommissionBreakdown({
      grossSaleCents: 1_000_000,
      baseCommissionPct: 10,
      bookingStatus: "cancelada",
      deductCommissionOnCancel: true,
      agentProfile: SAMPLE_AGENT_PROFILE,
    });
    expect(clawedBack.agentCommissionTotalCents).toBe(0);
    expect(clawedBack.appliedClawbackCents).toBe(10_000);
  });

  it("handles cash-at-counter commission retention without operator invoice", () => {
    const cash = calculateTravelSaleCommissionBreakdown({
      grossSaleCents: 1_000_000,
      taxesAndFeesCents: 0,
      baseCommissionPct: 10,
      settlementMethod: "comissao_balcao_a_vista",
      overRetentionFeePct: 16,
      agentProfile: SAMPLE_AGENT_PROFILE,
    });

    expect(cash.isCashSettled).toBe(true);
    expect(cash.retainedCashAmountCents).toBe(100_000);
    expect(cash.operatorBalanceCents).toBe(0);
    expect(cash.requiresOperatorInvoice).toBe(false);
    expect(cash.effectiveOverRetentionPct).toBe(0);
  });

  it("computes remaining amount to next tier, MoM growth %, and release eligibility triggers", () => {
    const tierState = resolveTierForAccumulatedVolume(SAMPLE_AGENT_PROFILE, 8_000_000);
    expect(tierState.nextTier?.tierName).toContain("Faixa 2");
    expect(tierState.remainingToNextTierCents).toBe(2_000_000);

    const growth = computeGrowthComparison(12_000_000, 10_000_000);
    expect(growth.growthPct).toBe(20);
    expect(growth.trend).toBe("up");

    expect(
      resolveCommissionReleaseEligibility({
        releaseTrigger: "no_recebimento_operadora",
        bookingStatus: "emitida",
        receivableStatus: "a_receber",
      }),
    ).toBe("pending");

    expect(
      resolveCommissionReleaseEligibility({
        releaseTrigger: "no_recebimento_operadora",
        bookingStatus: "emitida",
        receivableStatus: "recebido",
      }),
    ).toBe("eligible");

    expect(
      resolveCommissionReleaseEligibility({
        releaseTrigger: "pos_embarque",
        bookingStatus: "emitida",
        receivableStatus: "a_receber",
        departureDate: "2026-10-01",
        referenceDateIso: "2026-10-05",
      }),
    ).toBe("eligible");
  });
});
