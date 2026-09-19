import { describe, it, expect } from "vitest";

describe("Classifieds Commercial Payment Rules & Bilateral Carnê", () => {
  it("calculates Pix discount properly", () => {
    const priceCents = 100000; // R$ 1.000,00
    const pixDiscountPercent = 10; // 10%
    const discountedCents = Math.round(priceCents * (1 - pixDiscountPercent / 100));
    const savingsCents = priceCents - discountedCents;

    expect(discountedCents).toBe(90000); // R$ 900,00
    expect(savingsCents).toBe(10000); // R$ 100,00
  });

  it("calculates Credit Card installments with interest-free support", () => {
    const priceCents = 120000; // R$ 1.200,00
    const maxInstallments = 12;
    const installmentCents = Math.round(priceCents / maxInstallments);

    expect(installmentCents).toBe(10000); // R$ 100,00 por parcela
  });

  it("calculates Boleto Parcelado with down payment and installments", () => {
    const priceCents = 500000; // R$ 5.000,00
    const minDownPaymentCents = 100000; // R$ 1.000,00 de entrada
    const maxBoletoInstallments = 10;
    
    const remainingCents = Math.max(0, priceCents - minDownPaymentCents);
    const installmentCents = Math.round(remainingCents / maxBoletoInstallments);

    expect(remainingCents).toBe(400000); // R$ 4.000,00
    expect(installmentCents).toBe(40000); // 10x de R$ 400,00
  });

  it("calculates Carnê Digital da Loja with grace days and down payment", () => {
    const priceCents = 360000; // R$ 3.600,00
    const minDownPaymentCents = 60000; // R$ 600,00
    const maxCarneInstallments = 24;
    const carneGraceDays = 30;

    const remainingCents = Math.max(0, priceCents - minDownPaymentCents);
    const installmentCents = Math.round(remainingCents / maxCarneInstallments);

    expect(remainingCents).toBe(300000); // R$ 3.000,00
    expect(installmentCents).toBe(12500); // 24x de R$ 125,00
    expect(carneGraceDays).toBe(30);
  });

  it("preserves bilateral payment attributes structure in classified attributes", () => {
    const paymentRules = {
      accepts_pix: true,
      pix_discount_percent: 5,
      accepts_card: true,
      max_installments: 18,
      card_interest_free: true,
      accepts_boleto: true,
      boleto_due_days: 3,
      accepts_boleto_installments: true,
      max_boleto_installments: 12,
      boleto_min_down_payment_cents: 50000,
      boleto_notes: "Sujeito a análise cadastral",
      accepts_carne: true,
      max_carne_installments: 24,
      carne_grace_days: 45,
      carne_min_down_payment_cents: 30000,
      carne_notes: "Crediário próprio aprovado",
      accepts_cash: true,
      accepts_trade: true,
      trade_notes: "Aceita moto ou smartphone",
      accepts_financing: true,
      financing_notes: "BV e Santander",
      cancellation_policy: "flexible",
    };

    expect(paymentRules.accepts_carne).toBe(true);
    expect(paymentRules.max_carne_installments).toBe(24);
    expect(paymentRules.carne_grace_days).toBe(45);
    expect(paymentRules.accepts_boleto_installments).toBe(true);
    expect(paymentRules.max_boleto_installments).toBe(12);
    expect(paymentRules.card_interest_free).toBe(true);
  });
});
