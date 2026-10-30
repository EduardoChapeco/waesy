import { describe, expect, it } from "vitest";
import { resolveProviderCodesForSearch } from "./travel-supply-orchestrator.service";

describe("travel supply provider selection", () => {
  it("keeps isolated flight searches on Wooba by default", () => {
    expect(resolveProviderCodesForSearch({ productType: "flight" })).toEqual(["wooba"]);
  });

  it("allows an explicit channel set for a composed package", () => {
    expect(
      resolveProviderCodesForSearch({
        productType: "package",
        providerCodes: ["infotravel", "wooba"],
      }),
    ).toEqual(["infotravel", "wooba"]);
  });

  it("does not silently constrain non-flight searches", () => {
    expect(resolveProviderCodesForSearch({ productType: "hotel" })).toBeUndefined();
  });
});
