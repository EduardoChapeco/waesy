import { describe, expect, it } from "vitest";
import { calculateNormalizedPricing } from "./travel-pricing";

describe("calculateNormalizedPricing", () => {
  it("aplica 10% quando o markup não é informado", () => {
    expect(calculateNormalizedPricing({ netAmountCents: 10000 }).selling_total_cents).toBe(11000);
  });

  it("preserva markup zero como regra financeira válida", () => {
    expect(
      calculateNormalizedPricing({
        netAmountCents: 10000,
        agencyMarkupPercent: 0,
        taxAmountCents: 1000,
        agencyFixedFeeCents: 500,
      }).selling_total_cents,
    ).toBe(11500);
  });

  it("normaliza taxas negativas sem reduzir o total", () => {
    const pricing = calculateNormalizedPricing({
      netAmountCents: 10000,
      taxAmountCents: -100,
      supplierFeeCents: -200,
      agencyMarkupPercent: 0,
      agencyFixedFeeCents: -300,
    });

    expect(pricing.tax_amount_cents).toBe(0);
    expect(pricing.supplier_fee_cents).toBe(0);
    expect(pricing.service_fee_cents).toBe(0);
    expect(pricing.selling_total_cents).toBe(10000);
  });
});
