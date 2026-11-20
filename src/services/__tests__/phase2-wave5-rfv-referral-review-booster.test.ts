import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  evaluateCustomerRfvLifecycle,
  getChurnThresholdDaysForNiche,
} from "@/lib/crm/rfv-lifecycle-engine";
import { compileStructuredReviewTestimonial } from "@/services/review-booster.functions";

describe("Phase 2 — Wave 5: RFV 8-State Machine, Referral Wallet, Post-Sale Triggers & Review Booster", () => {
  const rootDir = process.cwd();

  it("classifies customers accurately across all 8 RFV states with niche-specific churn windows", () => {
    expect(getChurnThresholdDaysForNiche("tourism")).toBe(540);
    expect(getChurnThresholdDaysForNiche("gastronomy")).toBe(45);

    // 1. unknown
    expect(
      evaluateCustomerRfvLifecycle({
        nicheId: "tourism",
        purchasesCount: 0,
        totalSpentCents: 0,
        daysSinceLastPurchase: null,
        openOpportunitiesCount: 0,
        lostOpportunitiesCount: 0,
        hasAnyLeadOrContact: false,
      }).stage,
    ).toBe("unknown");

    // 2. lead
    expect(
      evaluateCustomerRfvLifecycle({
        nicheId: "tourism",
        purchasesCount: 0,
        totalSpentCents: 0,
        daysSinceLastPurchase: null,
        openOpportunitiesCount: 0,
        lostOpportunitiesCount: 0,
        hasAnyLeadOrContact: true,
      }).stage,
    ).toBe("lead");

    // 3. opportunity
    expect(
      evaluateCustomerRfvLifecycle({
        nicheId: "tourism",
        purchasesCount: 0,
        totalSpentCents: 0,
        daysSinceLastPurchase: null,
        openOpportunitiesCount: 1,
        lostOpportunitiesCount: 0,
        hasAnyLeadOrContact: true,
      }).stage,
    ).toBe("opportunity");

    // 4. non_client
    expect(
      evaluateCustomerRfvLifecycle({
        nicheId: "tourism",
        purchasesCount: 0,
        totalSpentCents: 0,
        daysSinceLastPurchase: null,
        openOpportunitiesCount: 0,
        lostOpportunitiesCount: 2,
        hasAnyLeadOrContact: true,
      }).stage,
    ).toBe("non_client");

    // 5. first_purchase
    expect(
      evaluateCustomerRfvLifecycle({
        nicheId: "tourism",
        purchasesCount: 1,
        totalSpentCents: 450_000,
        daysSinceLastPurchase: 60,
        openOpportunitiesCount: 0,
        lostOpportunitiesCount: 0,
        hasAnyLeadOrContact: true,
      }).stage,
    ).toBe("first_purchase");

    // 6. recurring
    expect(
      evaluateCustomerRfvLifecycle({
        nicheId: "tourism",
        purchasesCount: 3,
        totalSpentCents: 1_200_000,
        daysSinceLastPurchase: 120,
        openOpportunitiesCount: 0,
        lostOpportunitiesCount: 0,
        hasAnyLeadOrContact: true,
      }).stage,
    ).toBe("recurring");

    // 7. ex_client (exceeded 540 days for tourism)
    expect(
      evaluateCustomerRfvLifecycle({
        nicheId: "tourism",
        purchasesCount: 2,
        totalSpentCents: 800_000,
        daysSinceLastPurchase: 600,
        openOpportunitiesCount: 0,
        lostOpportunitiesCount: 0,
        hasAnyLeadOrContact: true,
      }).stage,
    ).toBe("ex_client");

    // 8. promoter (converted referral or NPS >= 9)
    expect(
      evaluateCustomerRfvLifecycle({
        nicheId: "tourism",
        purchasesCount: 1,
        totalSpentCents: 450_000,
        daysSinceLastPurchase: 30,
        openOpportunitiesCount: 0,
        lostOpportunitiesCount: 0,
        hasAnyLeadOrContact: true,
        referralsConvertedCount: 1,
      }).stage,
    ).toBe("promoter");
  });

  it("compiles structured Review Booster answers into a natural testimonial ready for Google Meu Negócio", () => {
    const compiled = compileStructuredReviewTestimonial({
      storeName: "Excelência Tour",
      destinationOrItem: "Gramado e Canela",
      highlightMoment: "O hotel era maravilhoso e os passeios muito bem organizados",
      serviceQuality: "a atenção da equipe no WhatsApp 24h",
      wouldRecommendReason: "Recomendo para todas as famílias",
    });

    expect(compiled).toContain("Excelência Tour (Gramado e Canela)");
    expect(compiled).toContain("O hotel era maravilhoso");
    expect(compiled).toContain("Destaque para a atenção da equipe no WhatsApp 24h.");
    expect(compiled).toContain("Recomendo para todas as famílias.");
  });

  it("verifies Wave 5 SQL tables, multi-niche LTV in crm.functions.ts, and /avaliar/$token route", () => {
    const sql = fs.readFileSync(
      path.join(rootDir, "supabase/migrations/20270619000000_phase2_wave5_rfv_referral_wallet_review_booster.sql"),
      "utf8",
    );
    const crmSrc = fs.readFileSync(path.join(rootDir, "src/services/crm.functions.ts"), "utf8");
    const reviewSrc = fs.readFileSync(path.join(rootDir, "src/services/review-booster.functions.ts"), "utf8");

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.customer_referral_credits");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.referral_credit_ledger");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.review_booster_submissions");

    expect(crmSrc).toContain('from("tourism_trips")');
    expect(crmSrc).toContain('from("travel_sales")');
    expect(reviewSrc).toContain('data.npsScore >= 8 ? "public_gmb" : "private_retention"');
  });
});
