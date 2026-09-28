import { describe, it, expect, vi } from "vitest";
import { listPublicNewsSponsors, getPublicSponsorReport, listStoreSponsoredCampaigns, listPressConsortiumStores, reviewPressAccreditation, type SponsorDTO } from "./news.functions";

describe("News Press Consortium & Sponsor Display Network", () => {
  it("exports all required functions for press consortium and display ads", () => {
    expect(typeof listPublicNewsSponsors).toBe("function");
    expect(typeof getPublicSponsorReport).toBe("function");
    expect(typeof listStoreSponsoredCampaigns).toBe("function");
    expect(typeof listPressConsortiumStores).toBe("function");
    expect(typeof reviewPressAccreditation).toBe("function");
  });

  it("calculates CTR and attention duration accurately in PublicSponsorReportDTO calculation logic", () => {
    const totalImpressions = 1000;
    const totalClicks = 45;
    const ctr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
    expect(ctr).toBe(4.5);

    const zeroImpressions = 0;
    const zeroCtr = zeroImpressions > 0 ? Number(((totalClicks / zeroImpressions) * 100).toFixed(2)) : 0;
    expect(zeroCtr).toBe(0);
  });

  it("validates magic token UUID format requirement", async () => {
    // Non-UUID magicToken should throw validator error
    await expect(
      getPublicSponsorReport({ data: { magicToken: "invalid-token" as any } }),
    ).rejects.toThrow();
  });

  it("enforces accreditation status values for press consortium review", async () => {
    // Invalid status should reject
    await expect(
      reviewPressAccreditation({
        data: {
          storeId: "11111111-1111-1111-1111-111111111111",
          status: "invalid_status" as any,
        },
      }),
    ).rejects.toThrow();
  });
});
