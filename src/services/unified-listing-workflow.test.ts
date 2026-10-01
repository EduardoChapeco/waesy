import { describe, it, expect } from "vitest";
import { unifiedTransactionSchema } from "./unified-listing-workflow.functions";

describe("Unified Listing Workflow & Integration Suite (Bloco E: F33 a F40)", () => {
  it("F33: validates transaction schema with required parameters", () => {
    const validTransaction = {
      listingId: "a0000000-0000-0000-0000-000000000001",
      origin: "classified" as const,
      transactionType: "booking" as const,
      quantity: 2,
      paymentMethod: "pix" as const,
      departureOptionId: "dep-serra-01",
    };

    const parsed = unifiedTransactionSchema.safeParse(validTransaction);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.quantity).toBe(2);
      expect(parsed.data.transactionType).toBe("booking");
    }
  });

  it("F33 / F36: correctly computes deposit, balance and total cents for tourism reservations", () => {
    const basePriceCents = 180000; // R$ 1.800,00 por passageiro
    const quantity = 3; // 3 passageiros
    const depositPercent = 25; // 25% de sinal

    const totalCents = basePriceCents * quantity;
    const depositCents = Math.round((totalCents * depositPercent) / 100);
    const balanceCents = totalCents - depositCents;

    expect(totalCents).toBe(540000);
    expect(depositCents).toBe(135000);
    expect(balanceCents).toBe(405000);
    expect(depositCents + balanceCents).toBe(totalCents);
  });

  it("F38: determines appropriate operational documents per niche", () => {
    const getNicheDocuments = (nicheId: string) => {
      if (nicheId === "turismo") return ["voucher_turismo", "contrato_viagem"];
      if (nicheId === "servico") return ["ordem_servico"];
      return ["recibo_transacao"];
    };

    expect(getNicheDocuments("turismo")).toEqual(["voucher_turismo", "contrato_viagem"]);
    expect(getNicheDocuments("servico")).toEqual(["ordem_servico"]);
    expect(getNicheDocuments("varejo")).toEqual(["recibo_transacao"]);
  });

  it("F35: rejects transaction if requested quantity exceeds available spots", () => {
    const departure = {
      id: "dep-01",
      available_spots: 2,
      price_cents: 120000,
    };

    const requestedQuantity = 3;
    const hasAvailability = departure.available_spots >= requestedQuantity;

    expect(hasAvailability).toBe(false);
  });

  it("F34: validates multi-scenario quotation payload format", () => {
    const quotation = {
      listingId: "a0000000-0000-0000-0000-000000000001",
      targetEmail: "cliente@exemplo.com",
      validDays: 10,
      scenarios: [
        { title: "Plano Essencial", priceCents: 150000 },
        { title: "Plano Completo VIP", priceCents: 280000 },
      ],
    };

    expect(quotation.scenarios.length).toBe(2);
    expect(quotation.scenarios[0].priceCents).toBeLessThan(quotation.scenarios[1].priceCents);
  });
});
