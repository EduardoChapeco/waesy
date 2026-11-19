import { describe, expect, it } from "vitest";
import {
  buildInstallmentOptionsFromPolicy,
  buildPaymentTermsSummaryFromPolicy,
  clampInstallments,
  normalizeSupplierPaymentPolicy,
  resolveMaxInstallmentsFromOptions,
} from "@/lib/tourism/payment-policy";

describe("SupplierPaymentPolicy SSOT", () => {
  it("supports 16x and up to 36x installments without capping at 12x", () => {
    const policy = normalizeSupplierPaymentPolicy({
      max_card_installments: 16,
      max_boleto_installments: 24,
      card_interest_free: true,
      boleto_requires_downpayment: true,
      boleto_downpayment_pct: 20,
      pix_discount_pct: 5,
      allowed_payment_methods: ["pix", "credit_card", "boleto"],
    });

    expect(policy.maxCardInstallments).toBe(16);
    expect(policy.maxBoletoInstallments).toBe(24);
    expect(policy.pixDiscountPct).toBe(5);

    const options = buildInstallmentOptionsFromPolicy(160000, policy);
    const pix = options.find((o) => o.method === "pix");
    const card = options.find((o) => o.method === "credit_card");
    const boleto = options.find((o) => o.method === "boleto");

    expect(pix?.installment_value_cents).toBe(152000);
    expect(card?.installments_count).toBe(16);
    expect(card?.installment_value_cents).toBe(10000);
    expect(card?.has_interest).toBe(false);
    expect(boleto?.installments_count).toBe(24);

    const resolved = resolveMaxInstallmentsFromOptions(options);
    expect(resolved.maxCardInstallments).toBe(16);
    expect(resolved.maxBoletoInstallments).toBe(24);
    expect(resolved.maxInstallments).toBe(24);
    expect(resolved.cardInterestFree).toBe(true);
  });

  it("clamps invalid or out-of-range installments safely between 1 and 36", () => {
    expect(clampInstallments(0, 12)).toBe(12);
    expect(clampInstallments(-5, 10)).toBe(10);
    expect(clampInstallments(50, 12)).toBe(36);
    expect(clampInstallments("16", 12)).toBe(16);
  });

  it("builds human-readable commercial terms summary matching configured policy", () => {
    const policy = normalizeSupplierPaymentPolicy({
      max_card_installments: 16,
      max_boleto_installments: 16,
      pix_discount_pct: 5,
      allowed_payment_methods: ["pix", "credit_card"],
    });
    const summary = buildPaymentTermsSummaryFromPolicy(
      160000,
      policy,
      (cents) => `R$ ${(cents / 100).toFixed(2)}`,
    );
    expect(summary).toContain("Pix à vista (5% OFF)");
    expect(summary).toContain("Cartão em até 16x");
  });
});
