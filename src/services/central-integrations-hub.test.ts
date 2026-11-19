import { describe, it, expect, vi, beforeEach } from "vitest";
import * as apiOrchestrator from "./api-orchestrator.functions";
import { internalRefineSlideTextWithAI } from "./studio.functions";
import { sendWhatsAppNotification } from "./integrations.functions";

describe("Central Integrations Hub & Universal AI Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Studio AI Text Refinement (internalRefineSlideTextWithAI)", () => {
    it("should generate 3 structured variants for a slide headline and body", async () => {
      vi.spyOn(apiOrchestrator, "executeUnifiedAiCall").mockResolvedValueOnce({
        text: JSON.stringify({
          variants: [
            {
              tone: "Impacto & Curto",
              badge: "EDITAL",
              kicker: "TRANSPARÊNCIA",
              headline: "Licitação de R$ 2,5 milhões abre reformas em escolas",
              body: "Obras emergenciais contemplam escolas municipais e creches.",
              cta_text: "Ver Edital",
              rationale: "Direto ao ponto com dado financeiro no título.",
            },
            {
              tone: "Jornalístico & Editorial",
              badge: "OFICIAL",
              kicker: "EDUCAÇÃO",
              headline: "Prefeitura abre edital de R$ 2,5 milhões para creches",
              body: "Documento detalha prazos para reformas na rede municipal.",
              cta_text: "Ler Matéria",
              rationale: "Linguagem informativa de portal público.",
            },
            {
              tone: "Persuasivo & CTA",
              badge: "ATENÇÃO",
              kicker: "OPORTUNIDADE",
              headline: "Confira os detalhes da licitação de R$ 2,5 milhões",
              body: "Acompanhe as unidades contempladas na região oeste.",
              cta_text: "Acessar Agora",
              rationale: "Estimula leitura do detalhamento.",
            },
          ],
        }),
        provider: "gemini",
        model: "gemini-2.5-flash",
      } as any);

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
      expect(result.length).toBe(3);

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

    it("deve propagar erro explícito quando a IA falhar em vez de inventar texto fake", async () => {
      vi.spyOn(apiOrchestrator, "executeUnifiedAiCall").mockRejectedValueOnce(
        new Error("Provedor Gemini sem cota"),
      );

      await expect(
        internalRefineSlideTextWithAI({
          headline: "Ofertas de Inverno",
        }),
      ).rejects.toThrow(/Falha ao refinar slide com IA/i);
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

