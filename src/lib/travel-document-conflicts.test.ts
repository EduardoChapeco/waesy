import { describe, expect, it } from "vitest";
import {
  normalizeTravelDocumentValue,
  resolveTravelDocumentConflicts,
} from "./travel-document-conflicts";

describe("travel document conflict resolver", () => {
  it("normalizes equivalent Brazilian money values", () => {
    expect(normalizeTravelDocumentValue("R$ 14.288,40")).toBe("14288.40");
    expect(normalizeTravelDocumentValue("14288.40")).toBe("14288.40");
  });

  it("normalizes dates, documents and phones semantically", () => {
    expect(normalizeTravelDocumentValue("06/10/2026", "travel_start")).toBe("2026-10-06");
    expect(normalizeTravelDocumentValue("123.456.789-09", "passenger.cpf")).toBe("12345678909");
    expect(normalizeTravelDocumentValue("(49) 99999-0000", "passenger.phone")).toBe("49999990000");
  });

  it("does not create a conflict for equivalent values", () => {
    const conflicts = resolveTravelDocumentConflicts([
      {
        id: "confirmation",
        kind: "reservation_confirmation",
        extraction: { total: "R$ 14.288,40" },
      },
      { id: "receipt", kind: "payment_receipt", extraction: { total: "14288.40" } },
    ]);
    expect(conflicts).toHaveLength(0);
  });

  it("suggests receipt for financial values and voucher for operational values", () => {
    const conflicts = resolveTravelDocumentConflicts([
      {
        id: "confirmation",
        kind: "reservation_confirmation",
        extraction: { total: 14000, hotel: { name: "Hotel antigo" } },
      },
      {
        id: "receipt",
        kind: "payment_receipt",
        extraction: { total: 14288.4, hotel: { name: "Hotel antigo" } },
      },
      {
        id: "voucher",
        kind: "voucher",
        extraction: { total: 14000, hotel: { name: "Hotel confirmado" } },
      },
    ]);
    expect(conflicts.find((conflict) => conflict.fieldPath === "total")?.suggestedSourceId).toBe(
      "receipt",
    );
    expect(
      conflicts.find((conflict) => conflict.fieldPath === "hotel.name")?.suggestedSourceId,
    ).toBe("voucher");
    expect(conflicts.find((conflict) => conflict.fieldPath === "total")?.precedenceRule).toBe(
      "financial.payment_receipt_first",
    );
  });

  it("matches the same flight even when array order changes", () => {
    const conflicts = resolveTravelDocumentConflicts([
      {
        id: "confirmation",
        kind: "reservation_confirmation",
        extraction: {
          flights: [
            { flight_number: "LA123", baggage: "10kg" },
            { flight_number: "LA456", baggage: "23kg" },
          ],
        },
      },
      {
        id: "voucher",
        kind: "voucher",
        extraction: {
          flights: [
            { flight_number: "LA456", baggage: "1x23kg" },
            { flight_number: "LA123", baggage: "10 kg" },
          ],
        },
      },
    ]);
    expect(conflicts).toHaveLength(2);
    expect(conflicts.some((conflict) => conflict.fieldPath.endsWith("flight_number"))).toBe(false);
    expect(conflicts.every((conflict) => conflict.fieldPath.endsWith("baggage"))).toBe(true);
    expect(conflicts.some((conflict) => conflict.fieldPath.includes("flight_number:la456"))).toBe(
      true,
    );
  });

  it("marks identity and reservation conflicts as critical", () => {
    const conflicts = resolveTravelDocumentConflicts([
      {
        id: "contract",
        kind: "contract",
        extraction: { payer: { cpf: "111" }, reservation_id: "A" },
      },
      {
        id: "receipt",
        kind: "payment_receipt",
        extraction: { payer: { cpf: "222" }, reservation_id: "B" },
      },
    ]);
    expect(conflicts.find((conflict) => conflict.fieldPath === "payer.cpf")?.severity).toBe(
      "critical",
    );
    expect(conflicts.find((conflict) => conflict.fieldPath === "reservation_id")?.severity).toBe(
      "high",
    );
  });

  it("produces a stable fingerprint for the same source values", () => {
    const input = [
      { id: "a", kind: "contract" as const, extraction: { total: 1 } },
      { id: "b", kind: "payment_receipt" as const, extraction: { total: 2 } },
    ];
    expect(resolveTravelDocumentConflicts(input)[0]?.fingerprint).toBe(
      resolveTravelDocumentConflicts(input)[0]?.fingerprint,
    );
  });
});
