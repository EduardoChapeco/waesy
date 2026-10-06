import { describe, expect, it } from "vitest";
import { normalizeOperatorDocument } from "./travel-operator-sync";

const ingestionId = "11111111-1111-4111-8111-111111111111";

describe("travel operator canonical normalizer", () => {
  it("normalizes a quote from a known operator without inventing missing values", () => {
    const result = normalizeOperatorDocument({
      sourceKind: "operator_quote",
      ingestionId,
      extraction: {
        operator_name: "Orinter Turismo",
        quote_reference_number: "OR-98412",
        destination: "Maceió - AL",
        gross_price_cents: 890000,
        operator_net_cents: 780000,
        passengers: [{ name: "João da Silva", is_lead: true }],
        flights: [{ airline: "LATAM" }],
      },
    });

    expect(result.operator.code).toBe("orinter");
    expect(result.reservation.status).toBe("quoted");
    expect(result.financial.gross_cents).toBe(890000);
    expect(result.financial.paid_cents).toBeNull();
    expect(result.passengers[0]?.name).toBe("João da Silva");
    expect(result.services.flights).toHaveLength(1);
  });

  it("normalizes a voucher-shaped extraction and preserves provenance", () => {
    const result = normalizeOperatorDocument({
      sourceKind: "voucher",
      ingestionId,
      extraction: {
        operator_name: "FRT",
        general_locator: "ABC123",
        destination_city: "Cancún",
        client_name: "Maria Silva",
        client_whatsapp: "+5511999999999",
        operator_contacts: { commercial_phone: "+5511300000000" },
      },
    });

    expect(result.operator.code).toBe("frt");
    expect(result.reservation.status).toBe("issued");
    expect(result.reservation.locator).toBe("ABC123");
    expect(result.provenance.source_ingestion_id).toBe(ingestionId);
    expect(result.contacts.commercial_phone).toBe("+5511300000000");
  });

  it("uses generic code for unknown operators and retains the original name", () => {
    const result = normalizeOperatorDocument({
      sourceKind: "reservation_confirmation",
      ingestionId,
      extraction: { operator_name: "Operadora Regional XPTO", total_amount_cents: 120000 },
    });

    expect(result.operator.code).toBe("generic");
    expect(result.operator.name).toBe("Operadora Regional XPTO");
    expect(result.financial.gross_cents).toBe(120000);
    expect(result.financial.net_cents).toBeNull();
  });
});
