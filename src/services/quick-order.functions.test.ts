import { describe, expect, it } from "vitest";
import { validateQuickOrderArithmetic } from "./quick-order.functions";

describe("Quick-order financial integrity", () => {
  const item = { title: "Produto", quantity: 2, unitPriceCents: 1500, totalCents: 3000 };

  it("accepts a subtotal that matches all item totals", () => {
    expect(() => validateQuickOrderArithmetic({ items: [item], subtotalCents: 3000 })).not.toThrow();
  });

  it("rejects an adulterated item total", () => {
    expect(() => validateQuickOrderArithmetic({ items: [{ ...item, totalCents: 1 }], subtotalCents: 1 })).toThrow("Total inconsistente");
  });

  it("rejects an adulterated subtotal", () => {
    expect(() => validateQuickOrderArithmetic({ items: [item], subtotalCents: 1 })).toThrow("subtotal");
  });
});
