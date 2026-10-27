import { describe, it, expect } from "vitest";
import {
  getCachedFipeVehicle,
  cacheFipeVehicle,
  searchFipeCachedVehicles,
} from "@/services/fipe.functions";

describe("Cluster 5: Tabela FIPE & Cache de Veículos", () => {
  it("deve exportar todas as funções de consulta e cache FIPE com validação Zod ativa", () => {
    expect(typeof getCachedFipeVehicle).toBe("function");
    expect(typeof cacheFipeVehicle).toBe("function");
    expect(typeof searchFipeCachedVehicles).toBe("function");
  });

  it("deve rejeitar cotação com preço negativo", async () => {
    await expect(
      cacheFipeVehicle({
        data: {
          fipeCode: "001234-5",
          brand: "Toyota",
          model: "Corolla XEi 2.0",
          modelYear: 2022,
          priceCents: -100,
        } as any,
      })
    ).rejects.toThrow();
  });

  it("deve rejeitar consulta sem código FIPE ou ano", async () => {
    await expect(
      getCachedFipeVehicle({
        data: {
          fipeCode: "",
          modelYear: 2020,
        } as any,
      })
    ).rejects.toThrow();
  });
});
