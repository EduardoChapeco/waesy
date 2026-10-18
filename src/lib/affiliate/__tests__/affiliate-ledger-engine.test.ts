import { describe, it, expect } from "vitest";
import {
  calculateCommissionSplit,
  computeCommissionMaturityDate,
  applyClawbackOnOrderCancellation,
  generatePhiaCuratedAffiliateLink,
  calculateMonthlyInvoiceTotals,
} from "../affiliate-ledger-engine";

describe("Waesy Affiliate Ledger Engine (Méliuz + Phia)", () => {
  it("calculates exact integer commission split in cents", () => {
    // Pedido de R$ 250,00 (25.000 centavos) com 10% de comissão
    const split = calculateCommissionSplit({
      orderGrossCents: 25000,
      commissionRatePct: 10,
      affiliateSplitPct: 70, // R$ 17,50 (1.750 centavos)
      cashbackSplitPct: 15,  // R$ 3,75 (375 centavos)
      platformSplitPct: 15,  // R$ 3,75 (375 centavos)
    });

    expect(split.totalCommissionCents).toBe(2500); // R$ 25,00
    expect(split.affiliateShareCents).toBe(1750);  // R$ 17,50
    expect(split.customerCashbackCents).toBe(375); // R$ 3,75
    expect(split.platformFeeCents).toBe(375);     // R$ 3,75
    expect(
      split.affiliateShareCents + split.customerCashbackCents + split.platformFeeCents
    ).toBe(split.totalCommissionCents);
  });

  it("handles zero order gross or zero commission rate gracefully", () => {
    const splitZero = calculateCommissionSplit({
      orderGrossCents: 0,
      commissionRatePct: 10,
    });
    expect(splitZero.totalCommissionCents).toBe(0);
    expect(splitZero.affiliateShareCents).toBe(0);
  });

  it("computes exact escrow maturity date based on days", () => {
    const base = new Date("2026-10-01T12:00:00Z");
    const matureDate = computeCommissionMaturityDate(base, 15);
    expect(matureDate.getUTCDate()).toBe(16);
    expect(matureDate.getUTCMonth()).toBe(9); // Outubro (0-indexed: 9)
  });

  it("applies Méliuz clawback when order is cancelled", () => {
    const clawback = applyClawbackOnOrderCancellation({
      currentCommissionStatus: "tracked_pending",
      affiliateShareCents: 1750,
      totalCommissionCents: 2500,
      cancellationReason: "Cliente devolveu produto",
    });

    expect(clawback.isEligibleForClawback).toBe(true);
    expect(clawback.newStatus).toBe("cancelled_refunded");
    expect(clawback.clawbackAmountCents).toBe(2500);
    expect(clawback.reason).toBe("Cliente devolveu produto");
  });

  it("prevents clawback on already paid out commissions", () => {
    const clawback = applyClawbackOnOrderCancellation({
      currentCommissionStatus: "paid_out",
      affiliateShareCents: 1750,
      totalCommissionCents: 2500,
    });

    expect(clawback.isEligibleForClawback).toBe(false);
    expect(clawback.newStatus).toBe("paid_out");
    expect(clawback.clawbackAmountCents).toBe(0);
  });

  it("generates Phia curated link with trackable subid", () => {
    const link = generatePhiaCuratedAffiliateLink({
      baseUrl: "https://www.booking.com/hotel/br/maravilha",
      paramTemplate: "aid=waesy_master&label={subid}",
      affiliateHandle: "eduardo_influencer",
      clickNonce: "xyz123",
    });

    expect(link).toContain("aid=waesy_master");
    expect(link).toContain("label=w_eduardo_influencer_xyz123");
  });

  it("aggregates monthly invoice totals with cancellation adjustments", () => {
    const items = [
      { orderGrossCents: 10000, totalCommissionCents: 1000, status: "available" as const },
      { orderGrossCents: 20000, totalCommissionCents: 2000, status: "tracked_pending" as const },
      { orderGrossCents: 15000, totalCommissionCents: 1500, status: "cancelled_refunded" as const },
    ];

    const totals = calculateMonthlyInvoiceTotals(items);
    expect(totals.totalTrackedSalesCents).toBe(30000);
    expect(totals.totalValidCommissionCents).toBe(3000);
    expect(totals.totalCancelledCommissionCents).toBe(1500);
    expect(totals.netOwedByStoreCents).toBe(3000);
  });
});
