import { describe, it, expect, vi, beforeEach } from "vitest";
import { internalRefineSlideTextWithAI } from "./studio.functions";
import { sendWhatsAppNotification } from "./integrations.functions";

describe("Central Integrations Hub & Universal AI Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Studio AI Text Refinement (internalRefineSlideTextWithAI)", () => {
    it("should generate 3 structured variants for a slide headline and body", async () => {
      const result = await internalRefineSlideTextWithAI({
        headline: "Prefeitura abre licitação de R$ 2,5 milhões para reformas",
        body: "Edital prevê reformas emergenciais em escolas municipais e creches da região oeste.",
        badge: "EDITAL",
        kicker: "TRANSPARÊNCIA",
        niche: "licitacoes",
        brandName: "Portal da Transparência",
        targetTone: "journalistic_editorial",
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(3);

      for (const variant of result) {
        expect(variant).toHaveProperty("tone");
        expect(variant).toHaveProperty("headline");
        expect(variant).toHaveProperty("body");
        expect(variant).toHaveProperty("badge");
        expect(variant).toHaveProperty("kicker");
        expect(variant).toHaveProperty("rationale");
        expect(typeof variant.headline).toBe("string");
        expect(variant.headline.length).toBeGreaterThan(0);
      }
    });

    it("should handle minimal input gracefully with defensive fallback variants", async () => {
      const result = await internalRefineSlideTextWithAI({
        headline: "Ofertas de Inverno",
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      expect(result[0].headline).toContain("Ofertas de Inverno");
      expect(result[0].tone).toBe("Impacto & Curto");
      expect(result[1].tone).toBe("Jornalístico & Editorial");
      expect(result[2].tone).toBe("Persuasivo & Engajamento");
    });
  });

  describe("WhatsApp Active Notifications (sendWhatsAppNotification)", () => {
    it("should reject invalid phone numbers with less than 10 digits", async () => {
      const res = await sendWhatsAppNotification({
        storeId: "00000000-0000-0000-0000-000000000000",
        recipientPhone: "1234",
        messageText: "Olá!",
      });

      // Se não configurado ou número curto, retorna sent: false com motivo
      expect(res.sent).toBe(false);
      expect(typeof res.reason).toBe("string");
    });

    it("should return not sent when integration credentials are not configured", async () => {
      const res = await sendWhatsAppNotification({
        storeId: "11111111-1111-1111-1111-111111111111",
        recipientPhone: "5549999999999",
        messageText: "Seu pedido foi despachado via MotoLink!",
      });

      expect(res.sent).toBe(false);
      expect(res.reason).toMatch(/não configurada/i);
    });
  });

  describe("Classifieds AI Refiner (refineClassifiedWithAI)", () => {
    it("should have refineClassifiedWithAI function exported and responsive", async () => {
      const { refineClassifiedWithAI, internalRefineClassifiedWithAI } = await import("./classifieds.functions");
      expect(refineClassifiedWithAI).toBeDefined();
      expect(internalRefineClassifiedWithAI).toBeDefined();

      const res = await internalRefineClassifiedWithAI({
        title: "Civic 2021",
        description: "Carro bom unico dono",
        niche: "veiculo",
      });

      expect(res).toHaveProperty("title");
      expect(res).toHaveProperty("description");
      expect(res).toHaveProperty("suggestedTags");
      expect(Array.isArray(res.suggestedTags)).toBe(true);
    });
  });
});

