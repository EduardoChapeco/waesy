import { describe, expect, it } from "vitest";
import { normalizeTravelDocumentValue, resolveTravelDocumentConflicts } from "./travel-document-conflicts";

describe("travel document conflict resolver", () => {
  it("normalizes equivalent Brazilian money values", () => {
    expect(normalizeTravelDocumentValue("R$ 14.288,40")).toBe("14288.40");
    expect(normalizeTravelDocumentValue("14288.40")).toBe("14288.40");
  });

  it("does not create a conflict for equivalent values", () => {
    const conflicts = resolveTravelDocumentConflicts([
      { id: "confirmation", kind: "reservation_confirmation", extraction: { total: "R$ 14.288,40" } },
      { id: "receipt", kind: "payment_receipt", extraction: { total: "14288.40" } },
    ]);
    expect(conflicts).toHaveLength(0);
  });

  it("suggests receipt for financial values and voucher for operational values", () => {
    const conflicts = resolveTravelDocumentConflicts([
      { id: "confirmation", kind: "reservation_confirmation", extraction: { total: 14000, hotel: { name: "Hotel antigo" } } },
      { id: "receipt", kind: "payment_receipt", extraction: { total: 14288.4, hotel: { name: "Hotel antigo" } } },
      { id: "voucher", kind: "voucher", extraction: { total: 14000, hotel: { name: "Hotel confirmado" } } },
    ]);
    expect(conflicts.find((conflict) => conflict.fieldPath === "total")?.suggestedSourceId).toBe("receipt");
    expect(conflicts.find((conflict) => conflict.fieldPath === "hotel.name")?.suggestedSourceId).toBe("voucher");
  });

  it("marks identity and reservation conflicts as critical", () => {
    const conflicts = resolveTravelDocumentConflicts([
      { id: "contract", kind: "contract", extraction: { payer: { cpf: "111" }, reservation_id: "A" } },
      { id: "receipt", kind: "payment_receipt", extraction: { payer: { cpf: "222" }, reservation_id: "B" } },
    ]);
    expect(conflicts.every((conflict) => conflict.severity === "critical")).toBe(true);
  });

  it("produces a stable fingerprint for the same source values", () => {
    const input = [
      { id: "a", kind: "contract" as const, extraction: { total: 1 } },
      { id: "b", kind: "payment_receipt" as const, extraction: { total: 2 } },
    ];
    expect(resolveTravelDocumentConflicts(input)[0]?.fingerprint).toBe(resolveTravelDocumentConflicts(input)[0]?.fingerprint);
  });
});
