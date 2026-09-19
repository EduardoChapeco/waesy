import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveClassifiedNiche } from "@/lib/classifieds/semantics";
import { internalListSdrChatSessions } from "./ai-sdr.functions";
import { createAppointmentSchema } from "./booking.functions";

describe("Food Modifiers, SDR Sessions & Adaptive Niche Semantics Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Classified Niche Resolution (Adaptive Editorial Mode)", () => {
    it("should resolve physical goods (e.g. smartphone) as 'goods' and not 'travel'", () => {
      const electronicAd = {
        id: "ad-1",
        title: "iPhone 15 Pro Max 256GB Titânio",
        category: "sale",
        price_cents: 650000,
        attributes: {
          brand: "Apple",
          condition: "usado_excelente",
          storage: "256GB",
        },
      };

      const niche = resolveClassifiedNiche(electronicAd);
      expect(niche.id).toBe("goods");
      expect(niche.id).not.toBe("travel");
      expect(niche.title).toContain("Desapego");
    });

    it("should resolve vehicle classified as 'vehicle'", () => {
      const carAd = {
        id: "ad-2",
        title: "Honda Civic Touring 1.5 Turbo 2021",
        category: "vehicle",
        price_cents: 14500000,
        attributes: {
          year_model: 2021,
          transmission: "Automático",
        },
      };

      const niche = resolveClassifiedNiche(carAd);
      expect(niche.id).toBe("vehicle");
    });

    it("should resolve tourism packages strictly as 'travel'", () => {
      const travelAd = {
        id: "ad-3",
        title: "Excursão Beto Carrero World 3 Dias",
        category: "travel",
        price_cents: 89000,
        attributes: {
          niche: "viagem",
          duration_text: "3 Dias / 2 Noites",
        },
      };

      const niche = resolveClassifiedNiche(travelAd);
      expect(niche.id).toBe("travel");
    });

    it("should resolve hospitality stay as 'hospitality_stay'", () => {
      const stayAd = {
        id: "ad-4",
        title: "Chalé Suíço com Hidromassagem na Serra",
        category: "hospitality",
        price_cents: 45000,
        attributes: {
          niche: "hospedagem",
          deal_type: "temporada",
        },
      };

      const niche = resolveClassifiedNiche(stayAd);
      expect(niche.id).toBe("hospitality_stay");
    });

    it("should resolve jobs as 'job'", () => {
      const jobAd = {
        id: "ad-5",
        title: "Vendedora Comercial para Loja de Roupas",
        category: "job",
        price_cents: 0,
        attributes: {
          work_model: "presencial",
        },
      };

      const niche = resolveClassifiedNiche(jobAd);
      expect(niche.id).toBe("job");
    });
  });

  describe("SDR Chat Sessions Listing (internalListSdrChatSessions)", () => {
    it("should return a structured response with sessions array and metrics", async () => {
      const result = await internalListSdrChatSessions({
        storeId: "00000000-0000-0000-0000-000000000000",
        intent: "all",
      });

      expect(result).toHaveProperty("sessions");
      expect(result).toHaveProperty("metrics");
      expect(Array.isArray(result.sessions)).toBe(true);
      expect(result.metrics).toHaveProperty("total");
      expect(result.metrics).toHaveProperty("readyToBuy");
      expect(result.metrics).toHaveProperty("warm");
      expect(result.metrics).toHaveProperty("curious");
    });
  });

  describe("Appointment Creation Schema Validation", () => {
    it("should validate complete appointment input", () => {
      const validPayload = {
        service_id: "11111111-1111-1111-1111-111111111111",
        guest_name: "Eduardo Silva",
        guest_phone: "49999998888",
        scheduled_at: "2026-10-20T14:30:00.000Z",
        notes: "Primeira consulta",
      };

      const parsed = createAppointmentSchema.safeParse(validPayload);
      expect(parsed.success).toBe(true);
    });

    it("should reject appointment without guest name or short phone", () => {
      const invalidPayload = {
        service_id: "11111111-1111-1111-1111-111111111111",
        guest_name: "E",
        guest_phone: "123",
        scheduled_at: "invalid-date",
      };

      const parsed = createAppointmentSchema.safeParse(invalidPayload);
      expect(parsed.success).toBe(false);
    });
  });
});
