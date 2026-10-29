import { describe, it, expect } from "vitest";
import { calculateSupermarketPromotion } from "./supermarket.functions";

describe("supermarket promotional engine", () => {
  it("calculates Buy 3 Pay 2 accurately", () => {
    const result = calculateSupermarketPromotion({
      itemQty: 3,
      unitPriceCents: 1000, // R$ 10,00 each
      rule: {
        rule_type: "buy_x_pay_y",
        buy_qty: 3,
        pay_qty: 2,
      },
    });

    expect(result.originalTotalCents).toBe(3000); // R$ 30,00
    expect(result.discountCents).toBe(1000); // 1 free unit = R$ 10,00
    expect(result.finalTotalCents).toBe(2000); // R$ 20,00
    expect(result.explanation).toContain("Leve 3, Pague 2");
  });

  it("calculates multiple bundles for Buy 10 Pay 9", () => {
    const result = calculateSupermarketPromotion({
      itemQty: 25,
      unitPriceCents: 200, // R$ 2,00 each
      rule: {
        rule_type: "buy_x_pay_y",
        buy_qty: 10,
        pay_qty: 9,
      },
    });

    // 25 units has 2 complete bundles of 10 (20 units with 2 free, + 5 units regular)
    expect(result.originalTotalCents).toBe(5000);
    expect(result.discountCents).toBe(400); // 2 free units * 200 = 400
    expect(result.finalTotalCents).toBe(4600);
  });

  it("respects max_per_cpf limits for promotional bundles", () => {
    const result = calculateSupermarketPromotion({
      itemQty: 9,
      unitPriceCents: 1000,
      rule: {
        rule_type: "buy_x_pay_y",
        buy_qty: 3,
        pay_qty: 2,
        max_per_cpf: 6, // only 6 units can be promoted (2 bundles), the remaining 3 are full price
      },
    });

    expect(result.originalTotalCents).toBe(9000);
    expect(result.discountCents).toBe(2000); // 2 bundles promoted
    expect(result.finalTotalCents).toBe(7000);
  });

  it("calculates progressive discount percentage and cashback", () => {
    const result = calculateSupermarketPromotion({
      itemQty: 5,
      unitPriceCents: 2000, // R$ 100,00 total
      rule: {
        rule_type: "progressive",
        discount_percent: 20,
        cashback_cents: 300, // R$ 3,00 cashback per unit
        max_per_cpf: 4,
      },
    });

    expect(result.originalTotalCents).toBe(10000);
    expect(result.discountCents).toBe(2000); // 20% of 10000
    expect(result.finalTotalCents).toBe(8000);
    expect(result.cashbackEarnedCents).toBe(1200); // 4 (max) * 300
  });

  it("tracks free shipping goal progress", () => {
    const result = calculateSupermarketPromotion({
      itemQty: 2,
      unitPriceCents: 5000, // R$ 100,00
      freeShippingThresholdCents: 12000, // R$ 120,00
      currentSubtotalCents: 0,
    });

    expect(result.isFreeShipping).toBe(false);
    expect(result.freeShippingRemainingCents).toBe(2000);
    expect(result.freeShippingProgressPercent).toBe(83);

    const completeResult = calculateSupermarketPromotion({
      itemQty: 3,
      unitPriceCents: 5000, // R$ 150,00
      freeShippingThresholdCents: 12000,
      currentSubtotalCents: 0,
    });

    expect(completeResult.isFreeShipping).toBe(true);
    expect(completeResult.freeShippingRemainingCents).toBe(0);
    expect(completeResult.freeShippingProgressPercent).toBe(100);
  });
});
