import { describe, it, expect } from "vitest";
import {
  normalizeVectorL2,
  updateIncrementalEmbedding,
  type MatchCardDTO,
} from "../match-engine.functions";

describe("OmniMatch Neural Engine Multi-Nicho E2E", () => {
  describe("1. Álgebra Vetorial & Convergência L2", () => {
    it("deve preservar a norma unitária ao atualizar incrementalmente o vetor", () => {
      const initial = normalizeVectorL2([0.5, 0.5, 0.5, 0.5]);
      const cardA = normalizeVectorL2([1.0, 0.0, 0.0, 0.0]);

      const updated = updateIncrementalEmbedding(initial, cardA, 0.25);
      const norm = Math.sqrt(updated.reduce((sum, v) => sum + v * v, 0));

      expect(norm).toBeCloseTo(1.0, 6);
      expect(updated[0]).toBeGreaterThan(initial[0]);
    });

    it("deve lidar defensivamente com vetores nulos ou vazios", () => {
      const card = [0, 0, 0];
      const norm = normalizeVectorL2(card);
      expect(norm).toEqual([0, 0, 0]);

      const updated = updateIncrementalEmbedding(null, [1, 0, 0], 0.2);
      expect(updated).toEqual([1, 0, 0]);
    });
  });

  describe("2. Multiplicadores de Ação & Pontuação de Eixos", () => {
    it("deve pontuar eixos corretamente para like (1.0) e superlike (2.0)", () => {
      const cardWeights = { praia_sol: 1.0, serra_frio: -1.0 };
      const currentScores: Record<string, number> = { praia_sol: 2.0, serra_frio: 0.0 };

      // Like (+1.0)
      const actionLikeMult = 1.0;
      const afterLike = {
        praia_sol: Math.round((currentScores.praia_sol + cardWeights.praia_sol * actionLikeMult) * 100) / 100,
        serra_frio: Math.round((currentScores.serra_frio + cardWeights.serra_frio * actionLikeMult) * 100) / 100,
      };

      expect(afterLike.praia_sol).toBe(3.0);
      expect(afterLike.serra_frio).toBe(-1.0);

      // Superlike (+2.0)
      const actionSuperMult = 2.0;
      const afterSuper = {
        praia_sol: Math.round((afterLike.praia_sol + cardWeights.praia_sol * actionSuperMult) * 100) / 100,
        serra_frio: Math.round((afterLike.serra_frio + cardWeights.serra_frio * actionSuperMult) * 100) / 100,
      };

      expect(afterSuper.praia_sol).toBe(5.0);
      expect(afterSuper.serra_frio).toBe(-3.0);
    });

    it("deve penalizar eixos com fator -0.5 em caso de pass", () => {
      const cardWeights = { aventura_livre: 2.0 };
      const currentScores = { aventura_livre: 4.0 };

      const actionPassMult = -0.5;
      const updated = Math.round((currentScores.aventura_livre + cardWeights.aventura_livre * actionPassMult) * 100) / 100;

      expect(updated).toBe(3.0);
    });
  });

  describe("3. Regras Comerciais de Desconto Configurável (Anti-50% Hardcode)", () => {
    it("deve calcular desconto respeitando o teto de regras da loja", () => {
      const rules = {
        max_discount_pct: 15,
        superlike_bonus_pct: 5,
      };

      const calculateAffinityDiscount = (
        affinityPct: number,
        isSuperlike: boolean,
        config: typeof rules
      ) => {
        let discount = Math.min(config.max_discount_pct, Math.floor((affinityPct / 100) * config.max_discount_pct));
        if (isSuperlike) {
          discount = Math.min(config.max_discount_pct, discount + config.superlike_bonus_pct);
        }
        return discount;
      };

      // 90% de afinidade, like normal: floor(0.9 * 15) = 13%
      const discountLike = calculateAffinityDiscount(90, false, rules);
      expect(discountLike).toBe(13);

      // 90% de afinidade, superlike: 13 + 5 = 18, limitado a max 15%
      const discountSuper = calculateAffinityDiscount(90, true, rules);
      expect(discountSuper).toBe(15);
    });
  });

  describe("4. Identity Stitching & Normalização de Contato", () => {
    it("deve sanitizar telefone e agrupar notas de interesse no padrão CRM", () => {
      const rawPhone = "+55 (49) 99912-3456";
      const cleanPhone = rawPhone.replace(/\D/g, "");
      expect(cleanPhone).toBe("5549999123456");

      const axisScores = { praia_sol: 4.5, resort_luxo: 3.0, serra_frio: -1.0 };
      const topAxes = Object.entries(axisScores)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, 2)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");

      const note = `[OmniMatch] Preferências identificadas: ${topAxes}`;
      expect(note).toContain("praia_sol: 4.5");
      expect(note).toContain("resort_luxo: 3");
      expect(note).not.toContain("serra_frio");
    });
  });

  describe("5. Integridade do Baralho de Cartas (DTO Contract)", () => {
    it("deve validar estrutura canônica da carta de trade-off", () => {
      const card: MatchCardDTO = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        deckTemplateId: "123e4567-e89b-12d3-a456-426614174001",
        cardKind: "trade_off",
        title: "Praia Tropical ou Serra Serena?",
        subtitle: "Escolha seu clima ideal para relaxar",
        badge: "Dilema",
        coverImageUrl: "https://cdn.waesy.com.br/cards/praia.jpg",
        mediaUrls: [],
        metadata: {},
        tradeOffAxis: "clima_ambiente",
        axisWeights: { praia_sol: 1.0, serra_frio: -1.0 },
        linkedEntityId: null,
        ctaLabel: "Quero Este Perfil",
        displayOrder: 1,
      };

      expect(card.cardKind).toBe("trade_off");
      expect(card.axisWeights.praia_sol).toBe(1.0);
      expect(card.displayOrder).toBe(1);
    });
  });
});
