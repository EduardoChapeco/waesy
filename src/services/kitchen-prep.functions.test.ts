import { describe, it, expect } from "vitest";
import {
  inferKitchenStation,
  updateProductPrepTimeSchema,
  batchUpdateProductPrepTimeSchema,
  assignOrderCourierSchema,
} from "./kitchen-prep.functions";

describe("kitchen-prep.functions — Validações de Schemas & Inferência de Praça", () => {
  it("infere corretamente as praças da cozinha a partir dos títulos dos pratos", () => {
    expect(inferKitchenStation("Hambúrguer Artesanal Smash")).toBe("chapa");
    expect(inferKitchenStation("X-Salada Especial")).toBe("chapa");
    expect(inferKitchenStation("Picanha Grelhada")).toBe("chapa");

    expect(inferKitchenStation("Pizza Calabresa Especial")).toBe("forno");
    expect(inferKitchenStation("Lasanha Bolonhesa 800g")).toBe("forno");
    expect(inferKitchenStation("Batata Frita Rústica")).toBe("forno");

    expect(inferKitchenStation("Coca-Cola 350ml Lata")).toBe("bebidas");
    expect(inferKitchenStation("Suco Natural de Laranja")).toBe("bebidas");
    expect(inferKitchenStation("Chopp Pilsen 500ml")).toBe("bebidas");

    expect(inferKitchenStation("Pudim de Leite Condensado")).toBe("sobremesas");
    expect(inferKitchenStation("Açaí Especial 500ml")).toBe("sobremesas");
    expect(inferKitchenStation("Cheesecake Frutas Vermelhas")).toBe("sobremesas");

    expect(inferKitchenStation("Embalagem Térmica Descartável")).toBe("geral");
  });

  it("valida o schema de atualização individual de tempo de preparo", () => {
    const valid = {
      productId: "11111111-1111-1111-1111-111111111111",
      prepTimeMinutes: 25,
      kitchenStation: "chapa" as const,
      toleranceMinutes: 5,
    };
    const parsed = updateProductPrepTimeSchema.safeParse(valid);
    expect(parsed.success).toBe(true);

    const invalid = {
      productId: "invalid-uuid",
      prepTimeMinutes: -5,
      kitchenStation: "invalid_station",
    };
    const parsedInvalid = updateProductPrepTimeSchema.safeParse(invalid);
    expect(parsedInvalid.success).toBe(false);
  });

  it("valida o schema de atualização em lote (estilo planilha)", () => {
    const batch = {
      updates: [
        {
          productId: "11111111-1111-1111-1111-111111111111",
          prepTimeMinutes: 20,
          kitchenStation: "forno" as const,
        },
        {
          productId: "22222222-2222-2222-2222-222222222222",
          prepTimeMinutes: 5,
          kitchenStation: "bebidas" as const,
        },
      ],
    };
    const parsed = batchUpdateProductPrepTimeSchema.safeParse(batch);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.updates.length).toBe(2);
    }
  });

  it("valida o schema de atribuição de motoboy / retirada", () => {
    const waesyGo = {
      orderId: "33333333-3333-3333-3333-333333333333",
      courierType: "waesy_go" as const,
      driverName: "Carlos Motoboy Waesy Go",
      driverPhone: "49999999999",
    };
    const parsed = assignOrderCourierSchema.safeParse(waesyGo);
    expect(parsed.success).toBe(true);

    const pickup = {
      orderId: "33333333-3333-3333-3333-333333333333",
      courierType: "customer_pickup" as const,
    };
    const parsedPickup = assignOrderCourierSchema.safeParse(pickup);
    expect(parsedPickup.success).toBe(true);
  });
});
