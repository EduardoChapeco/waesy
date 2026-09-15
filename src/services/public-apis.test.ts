import { describe, it, expect } from "vitest";
import { DEFAULT_PUBLIC_API_GOVERNANCE } from "./public-apis.functions";

describe("public-apis governance", () => {
  it("provides correct default zero-cost configurations", () => {
    expect(DEFAULT_PUBLIC_API_GOVERNANCE.defaultMapProvider).toBe("osm_standard");
    expect(DEFAULT_PUBLIC_API_GOVERNANCE.isMapServiceActive).toBe(true);
    expect(DEFAULT_PUBLIC_API_GOVERNANCE.isCepAutoFillActive).toBe(true);
    expect(DEFAULT_PUBLIC_API_GOVERNANCE.isCnpjLookupActive).toBe(true);
    expect(DEFAULT_PUBLIC_API_GOVERNANCE.isCpfValidationActive).toBe(true);
    expect(DEFAULT_PUBLIC_API_GOVERNANCE.isBirthDateValidationActive).toBe(true);
    expect(DEFAULT_PUBLIC_API_GOVERNANCE.isOsmGeocodingActive).toBe(true);
    expect(DEFAULT_PUBLIC_API_GOVERNANCE.primaryCepProvider).toBe("brasilapi_v2");
  });

  it("garante que o estilo osm_standard não contém endpoints da CARTO e usa OpenStreetMap oficial", async () => {
    const { getCanonicalMapStyle } = await import("@/lib/map-styles");
    const style = getCanonicalMapStyle(false, "osm_standard");
    const sources = style.sources as any;
    expect(sources["osm-standard"]).toBeDefined();
    expect(sources["osm-standard"].tiles[0]).toContain("tile.openstreetmap.org");
    expect(sources["osm-standard"].tiles[0]).not.toContain("cartocdn.com");
  });
});
