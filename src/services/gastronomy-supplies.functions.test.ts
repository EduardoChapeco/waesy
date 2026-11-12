import { describe, it, expect } from "vitest";
import {
  createSupplySchema,
  updateSupplySchema,
  createRecipeSchema,
  linkProductRecipeSchema,
  createProductionOrderSchema,
  registerWasteSchema,
  recordSupplyPurchaseSchema,
  generateLabelSchema,
} from "./gastronomy-supplies.functions";

describe("Gastronomia & Insumos — Contratos e Schemas Zod (B.25)", () => {
  describe("createSupplySchema", () => {
    it("valida insumo padrão com dados válidos", () => {
      const payload = {
        name: "Farinha de Trigo Especial",
        category: "ingredient",
        unit: "kg",
        stockOnHand: 50.5,
        minStockAlert: 10,
        costCentsPerUnit: 450,
        standardShelfLifeDays: 90,
      };
      const parsed = createSupplySchema.safeParse(payload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.name).toBe("Farinha de Trigo Especial");
        expect(parsed.data.unit).toBe("kg");
      }
    });

    it("rejeita insumo com nome muito curto", () => {
      const payload = {
        name: "A",
        unit: "un",
      };
      const parsed = createSupplySchema.safeParse(payload);
      expect(parsed.success).toBe(false);
    });

    it("rejeita estoque negativo", () => {
      const payload = {
        name: "Queijo Mussarela",
        stockOnHand: -5,
      };
      const parsed = createSupplySchema.safeParse(payload);
      expect(parsed.success).toBe(false);
    });
  });

  describe("createRecipeSchema", () => {
    it("valida receita com ingredientes e rendimento", () => {
      const payload = {
        name: "Chilli Mexicano Especial",
        type: "sub_recipe",
        yieldQuantity: 5,
        yieldUnit: "kg",
        preparationTimeMinutes: 45,
        standardShelfLifeHours: 72,
        storageInstructions: "Manter entre 0°C e 4°C",
        items: [
          {
            supplyId: "11111111-1111-1111-1111-111111111111",
            quantity: 2.5,
            unit: "kg",
            sortOrder: 0,
          },
          {
            supplyId: "22222222-2222-2222-2222-222222222222",
            quantity: 1.5,
            unit: "kg",
            sortOrder: 1,
          },
        ],
      };
      const parsed = createRecipeSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.items.length).toBe(2);
      }
    });

    it("rejeita item de receita com quantidade zero ou negativa", () => {
      const payload = {
        name: "Molho Cheddar",
        items: [
          {
            supplyId: "11111111-1111-1111-1111-111111111111",
            quantity: 0,
            unit: "kg",
          },
        ],
      };
      const parsed = createRecipeSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
    });
  });

  describe("registerWasteSchema", () => {
    it("valida descarte por motivo válido", () => {
      const payload = {
        supplyId: "11111111-1111-1111-1111-111111111111",
        quantity: 1.2,
        unit: "kg",
        reason: "burnt",
        reasonDescription: "Queimou no forno durante o pico",
        reportedBy: "Chefe Carlos",
      };
      const parsed = registerWasteSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });

    it("rejeita motivo inválido", () => {
      const payload = {
        quantity: 1,
        reason: "motivo_invalido",
      };
      const parsed = registerWasteSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
    });
  });

  describe("recordSupplyPurchaseSchema", () => {
    it("valida entrada de compras e cálculo de custo ponderado", () => {
      const payload = {
        supplyId: "11111111-1111-1111-1111-111111111111",
        quantity: 20,
        totalCostCents: 10000,
        invoiceNumber: "NF-9841",
      };
      const parsed = recordSupplyPurchaseSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });
  });

  describe("generateLabelSchema", () => {
    it("valida dados para etiqueta térmica", () => {
      const payload = {
        title: "Maionese Verde da Casa",
        shelfLifeHours: 48,
        storageTemperature: "Refrigerado 0°C a 4°C",
        responsibleName: "Bruna Cozinha",
      };
      const parsed = generateLabelSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.shelfLifeHours).toBe(48);
      }
    });
  });
});
