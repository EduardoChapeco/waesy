import { describe, expect, it } from "vitest";
import {
  calcModifiersTotalCents,
  inferModifierGroupMode,
} from "@/lib/modifiers/option-group-math";
import { calcFipeDiscountSummary } from "@/lib/pricing/price-calculator";

describe("W1.B6 Verticals & Modifier Modes Suite", () => {
  describe("FIPE Discount Summary", () => {
    it("calcula percentual abaixo e acima da FIPE e ignora valores zerados", () => {
      expect(
        calcFipeDiscountSummary({ priceCents: 85_000_00, fipeCents: 100_000_00 })
      ).toEqual({
        fipeCents: 100_000_00,
        priceCents: 85_000_00,
        diffCents: -15_000_00,
        diffPct: -15,
        relation: "below",
      });

      expect(
        calcFipeDiscountSummary({ priceCents: 110_000_00, fipeCents: 100_000_00 })
      ).toEqual({
        fipeCents: 100_000_00,
        priceCents: 110_000_00,
        diffCents: 10_000_00,
        diffPct: 10,
        relation: "above",
      });

      expect(calcFipeDiscountSummary({ priceCents: 0, fipeCents: 100_000_00 })).toBeNull();
    });
  });

  describe("Modifier Modes (Pizza Fractional & Quantity Counters)", () => {
    it("infere corretamente single, multiple, quantity e pizza", () => {
      expect(inferModifierGroupMode({ id: "g1", title: "Ponto da Carne", max_selections: 1 })).toBe("single");
      expect(inferModifierGroupMode({ id: "g2", title: "Extras", max_selections: 3 })).toBe("multiple");
      expect(inferModifierGroupMode({ id: "g3", title: "Escolha 2 Sabores de Pizza", max_selections: 2 })).toBe("pizza");
      expect(inferModifierGroupMode({ id: "g4", title: "Doses Extras (Quantidade)", max_selections: 5 })).toBe("quantity");
    });

    it("calcula pizza fracionada (maior sabor e média) e adicionais com quantidade", () => {
      const totalPizzaMax = calcModifiersTotalCents(
        [{ id: "pz", title: "Sabores Pizza", max_selections: 2 }],
        [
          { groupId: "pz", groupTitle: "Sabores Pizza", modifierId: "m1", title: "Calabresa", priceDeltaCents: 3800 },
          { groupId: "pz", groupTitle: "Sabores Pizza", modifierId: "m2", title: "Filé", priceDeltaCents: 4500 },
        ]
      );
      expect(totalPizzaMax).toBe(4500);

      const totalPizzaAvg = calcModifiersTotalCents(
        [{ id: "pz", title: "Sabores Pizza", selection_type: "pizza", pizza_pricing_mode: "average", max_selections: 2 }],
        [
          { groupId: "pz", groupTitle: "Sabores Pizza", modifierId: "m1", title: "Muçarela", priceDeltaCents: 3500 },
          { groupId: "pz", groupTitle: "Sabores Pizza", modifierId: "m2", title: "Filé", priceDeltaCents: 4500 },
        ]
      );
      expect(totalPizzaAvg).toBe(4000);

      const totalQuantity = calcModifiersTotalCents(
        [{ id: "qt", title: "Adicionais", selection_type: "quantity", max_selections: 5 }],
        [
          { groupId: "qt", groupTitle: "Adicionais", modifierId: "b1", title: "3x Bacon", priceDeltaCents: 500, quantity: 3 },
        ]
      );
      expect(totalQuantity).toBe(1500);
    });
  });
});
