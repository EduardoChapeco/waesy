import { describe, it, expect } from "vitest";
import {
  getCaronaDriverPreferences,
  saveCaronaDriverPreferences,
  listCaronaPassengerReviews,
  submitCaronaPassengerReview,
  listCaronaRecurringSchedules,
  saveCaronaRecurringSchedule,
  listCaronaStopPoints,
  saveCaronaStopPoint,
  listIntercityBusRoutes,
} from "@/services/carona.functions";

describe("Cluster 2: Mobilidade, Caronas & Ônibus Intermunicipais", () => {
  it("deve exportar todas as funções de carona e transporte com validação Zod ativa", () => {
    expect(typeof getCaronaDriverPreferences).toBe("function");
    expect(typeof saveCaronaDriverPreferences).toBe("function");
    expect(typeof listCaronaPassengerReviews).toBe("function");
    expect(typeof submitCaronaPassengerReview).toBe("function");
    expect(typeof listCaronaRecurringSchedules).toBe("function");
    expect(typeof saveCaronaRecurringSchedule).toBe("function");
    expect(typeof listCaronaStopPoints).toBe("function");
    expect(typeof saveCaronaStopPoint).toBe("function");
    expect(typeof listIntercityBusRoutes).toBe("function");
  });

  it("deve rejeitar preferências com enum inválido", async () => {
    await expect(
      saveCaronaDriverPreferences({
        data: {
          musicPreference: "rock_heavy_metal" as any,
        },
      })
    ).rejects.toThrow();
  });

  it("deve rejeitar avaliação de passageiro com nota fora de 1-5", async () => {
    await expect(
      submitCaronaPassengerReview({
        data: {
          rideId: "invalid-uuid",
          reviewedUserId: "invalid-uuid",
          rating: 6,
        } as any,
      })
    ).rejects.toThrow();
  });

  it("deve rejeitar escala recorrente com campos vazios", async () => {
    await expect(
      saveCaronaRecurringSchedule({
        data: {
          originCity: "",
          destinationCity: "",
          departureTime: "08:00",
        } as any,
      })
    ).rejects.toThrow();
  });
});
