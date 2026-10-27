import { describe, it, expect, vi, beforeEach } from "vitest";
import { SettleCommercialInvoiceSchema } from "./financial-settlement.functions";

describe("financial-settlement.functions", () => {
  it("valida schema de liquidação com valores e splits corretos", () => {
    const validPayload = {
      invoiceId: "11111111-1111-1111-1111-111111111111",
      paymentMethod: "pix",
      paidAmountCents: 500000,
      operatorNetCents: 420000,
      consultantPercent: 30,
      consultantId: "22222222-2222-2222-2222-222222222222",
      notes: "Liquidação antecipada via Pix com split",
    };

    const parsed = SettleCommercialInvoiceSchema.parse(validPayload);
    expect(parsed.invoiceId).toBe("11111111-1111-1111-1111-111111111111");
    expect(parsed.paidAmountCents).toBe(500000);
    expect(parsed.operatorNetCents).toBe(420000);
    expect(parsed.consultantPercent).toBe(30);

    // Verificação de lógica de margem:
    // Margem bruta = 500.000 - 420.000 = 80.000 centavos (R$ 800)
    // Comissão (30%) = 80.000 * 0.30 = 24.000 centavos (R$ 240)
    const margin = (parsed.paidAmountCents || 0) - (parsed.operatorNetCents || 0);
    const comm = Math.round(margin * ((parsed.consultantPercent || 0) / 100));
    expect(margin).toBe(80000);
    expect(comm).toBe(24000);
  });

  it("rejeita percentual de comissão superior a 100% ou negativo", () => {
    expect(() =>
      SettleCommercialInvoiceSchema.parse({
        invoiceId: "11111111-1111-1111-1111-111111111111",
        consultantPercent: 120,
      }),
    ).toThrow();

    expect(() =>
      SettleCommercialInvoiceSchema.parse({
        invoiceId: "11111111-1111-1111-1111-111111111111",
        consultantPercent: -10,
      }),
    ).toThrow();
  });

  it("permite liquidação sem comissão ou sem custo de operadora (venda direta pura)", () => {
    const directSale = SettleCommercialInvoiceSchema.parse({
      invoiceId: "11111111-1111-1111-1111-111111111111",
      paymentMethod: "card",
      paidAmountCents: 150000,
    });

    expect(directSale.paymentMethod).toBe("card");
    expect(directSale.paidAmountCents).toBe(150000);
    expect(directSale.operatorNetCents).toBeUndefined();
    expect(directSale.consultantPercent).toBeUndefined();
  });
});
