import { describe, expect, it } from "vitest";
import { resolveCampaignPlan } from "@/lib/ad-tech/campaign-intent";

describe("resolveCampaignPlan", () => {
  it("reads explicit daily budget, platform, and duration from the user's request", () => {
    expect(resolveCampaignPlan({ prompt: "Instagram R$ 50,00 por 7 dias" })).toEqual({
      dailyBudgetCents: 5000,
      durationDays: 7,
      platform: "meta_instagram",
      planningAssumptions: [],
    });
  });

  it("rejects a missing budget instead of silently inserting a default", () => {
    expect(() => resolveCampaignPlan({ prompt: "Campanha no Instagram" })).toThrow(/não presume um valor/);
  });

  it("rejects a missing platform instead of assuming Instagram", () => {
    expect(() => resolveCampaignPlan({ prompt: "Campanha de R$ 50 por dia" })).toThrow(/Informe o canal/);
  });

  it("requires an explicit choice when multiple channels are mentioned", () => {
    expect(() => resolveCampaignPlan({ prompt: "Instagram e Facebook R$ 50 por dia" })).toThrow(/mais de um canal/);
  });

  it("marks the operational seven-day duration as an assumption when not provided", () => {
    const plan = resolveCampaignPlan({ prompt: "Campanha no Google com R$ 25/dia" });
    expect(plan.durationDays).toBe(7);
    expect(plan.planningAssumptions).toHaveLength(1);
    expect(plan.planningAssumptions[0]).toContain("premissa editável");
  });

  it("rejects a total budget above the database integer limit", () => {
    expect(() => resolveCampaignPlan({
      prompt: "Instagram",
      targetPlatform: "meta_instagram",
      dailyBudgetCents: 100_000_000,
      durationDays: 60,
    })).toThrow(/limite de armazenamento/);
  });
});
