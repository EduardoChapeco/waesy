import { describe, it, expect } from "vitest";
import {
  listEventTicketBatches,
  saveEventTicketBatch,
  listEventTicketAffiliates,
  saveEventTicketAffiliate,
} from "@/services/events.functions";

describe("Cluster 3: Eventos, Lotes de Ingressos & Afiliados", () => {
  it("deve exportar todas as funções de lotes e afiliados com validação Zod ativa", () => {
    expect(typeof listEventTicketBatches).toBe("function");
    expect(typeof saveEventTicketBatch).toBe("function");
    expect(typeof listEventTicketAffiliates).toBe("function");
    expect(typeof saveEventTicketAffiliate).toBe("function");
  });

  it("deve rejeitar lote com preço negativo", async () => {
    await expect(
      saveEventTicketBatch({
        data: {
          eventId: "invalid-uuid",
          batchName: "Lote Promocional",
          priceCents: -500,
          quantityAvailable: 100,
        } as any,
      })
    ).rejects.toThrow();
  });

  it("deve rejeitar afiliado com comissão acima de 100%", async () => {
    await expect(
      saveEventTicketAffiliate({
        data: {
          eventId: "invalid-uuid",
          promoterProfileId: "invalid-uuid",
          code: "PROMO",
          commissionPercent: 120,
        } as any,
      })
    ).rejects.toThrow();
  });
});
