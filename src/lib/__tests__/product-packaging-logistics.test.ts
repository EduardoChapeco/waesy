import { describe, expect, it } from "vitest";
import {
  calculateLogisticsMetrics,
  PACKAGING_PRESETS,
} from "@/components/admin/catalog/product-editor/product-packaging-selector";

describe("ProductPackagingSelector & Logistics Cubage Engine", () => {
  it("calculates IATA/Correios volumetric weight (C x L x A / 6000) and chargeable weight accurately", () => {
    // Caixa 30 x 22 x 12 cm = 7920 cm³ => 7920 / 6000 = 1.32 kg volumétrico
    const metrics = calculateLogisticsMetrics({
      weightKg: 0.5,
      widthCm: 22,
      heightCm: 12,
      lengthCm: 30,
      packagingType: "box",
    });

    expect(metrics.volumetricWeightKg).toBe(1.32);
    expect(metrics.chargeableWeightKg).toBe(1.32);
    expect(metrics.fitsMotoLinkBag).toBe(true);
    expect(metrics.correiosEligible).toBe(true);
    expect(metrics.melhorEnvioFormatCode).toBe(1);
    expect(metrics.apiPackageFormat).toBe("box");
  });

  it("uses real physical weight when heavier than volumetric weight", () => {
    const metrics = calculateLogisticsMetrics({
      weightKg: 4.5,
      widthCm: 20,
      heightCm: 10,
      lengthCm: 25,
      packagingType: "box",
    });

    expect(metrics.volumetricWeightKg).toBe(0.833);
    expect(metrics.chargeableWeightKg).toBe(4.5);
    expect(metrics.fitsMotoLinkBag).toBe(true);
  });

  it("escalates from MotoLink Bag (45L) to Carro/Utilitário when dimensions exceed 45cm or weight exceeds 12kg", () => {
    const bulky = calculateLogisticsMetrics({
      weightKg: 3.0,
      widthCm: 40,
      heightCm: 30,
      lengthCm: 60,
      packagingType: "box",
    });
    expect(bulky.fitsMotoLinkBag).toBe(false);
    expect(bulky.recommendedLocalVehicle).toBe("car");

    const heavy = calculateLogisticsMetrics({
      weightKg: 15.0,
      widthCm: 25,
      heightCm: 20,
      lengthCm: 30,
      packagingType: "box",
    });
    expect(heavy.fitsMotoLinkBag).toBe(false);
    expect(heavy.recommendedLocalVehicle).toBe("car");
  });

  it("flags items exceeding Correios standard limits (>30kg or >100cm side or >200cm sum)", () => {
    const oversized = calculateLogisticsMetrics({
      weightKg: 35,
      widthCm: 60,
      heightCm: 60,
      lengthCm: 110,
      packagingType: "pallet",
    });
    expect(oversized.correiosEligible).toBe(false);
    expect(oversized.fitsMotoLinkBag).toBe(false);
  });

  it("maps envelope and roll packaging to Melhor Envio / Correios API format codes 3 and 2", () => {
    const envMetrics = calculateLogisticsMetrics({
      weightKg: 0.3,
      widthCm: 25,
      heightCm: 4,
      lengthCm: 35,
      packagingType: "envelope",
    });
    expect(envMetrics.melhorEnvioFormatCode).toBe(3);
    expect(envMetrics.apiPackageFormat).toBe("envelope");

    const rollMetrics = calculateLogisticsMetrics({
      weightKg: 0.6,
      widthCm: 10,
      heightCm: 10,
      lengthCm: 60,
      packagingType: "roll",
    });
    expect(rollMetrics.melhorEnvioFormatCode).toBe(2);
    expect(rollMetrics.apiPackageFormat).toBe("roll");
  });

  it("exposes standardized visual presets for boxes, security envelopes, thermal bags, rolls, and master cartons", () => {
    expect(PACKAGING_PRESETS.length).toBeGreaterThanOrEqual(10);
    const categories = new Set(PACKAGING_PRESETS.map((p) => p.format));
    expect(categories.has("box")).toBe(true);
    expect(categories.has("envelope")).toBe(true);
    expect(categories.has("thermal_bag")).toBe(true);
    expect(categories.has("roll")).toBe(true);
    expect(categories.has("pallet")).toBe(true);
  });
});
