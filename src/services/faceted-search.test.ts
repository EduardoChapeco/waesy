import { describe, it, expect } from "vitest";
import { calculateRelevanceScore, FacetedSearchInputSchema } from "./faceted-search.functions";

describe("Waesy Deep Engine Assimilation — Faceted Search & Behavioral Relevance (V135)", () => {
  it("1. Deve validar schema estrito Zod para busca facetada com defaults seguros", () => {
    const defaultParsed = FacetedSearchInputSchema.safeParse({});
    expect(defaultParsed.success).toBe(true);
    if (defaultParsed.success) {
      expect(defaultParsed.data.query).toBe("");
      expect(defaultParsed.data.sort_by).toBe("relevance_telemetry");
      expect(defaultParsed.data.page).toBe(1);
      expect(defaultParsed.data.page_size).toBe(16);
      expect(defaultParsed.data.category_slugs).toEqual([]);
      expect(defaultParsed.data.niches).toEqual([]);
    }

    const invalidPage = FacetedSearchInputSchema.safeParse({ page: 0 });
    expect(invalidPage.success).toBe(false);

    const invalidPrice = FacetedSearchInputSchema.safeParse({ min_price_cents: -50 });
    expect(invalidPrice.success).toBe(false);
  });

  it("2. Deve pontuar com maior relevância correspondências exatas no título vs parciais", () => {
    const itemA = {
      title: "Hambúrguer Artesanal Smash",
      description: "Delicioso hambúrguer duplo com queijo cheddar",
      niche: "gastronomia",
      created_at: new Date().toISOString(),
    };

    const itemB = {
      title: "Hambúrguer",
      description: "Lanche rápido",
      niche: "gastronomia",
      created_at: new Date().toISOString(),
    };

    const itemC = {
      title: "Refrigerante Cola Lata",
      description: "Ideal para acompanhar seu hambúrguer artesanal",
      niche: "bebidas",
      created_at: new Date().toISOString(),
    };

    // Para query exata "Hambúrguer", itemB deve ter maior pontuação por match exato
    const scoreExact = calculateRelevanceScore(itemB, "Hambúrguer");
    const scorePrefix = calculateRelevanceScore(itemA, "Hambúrguer");
    const scoreDesc = calculateRelevanceScore(itemC, "Hambúrguer");

    expect(scoreExact).toBeGreaterThan(scorePrefix);
    expect(scorePrefix).toBeGreaterThan(scoreDesc);
  });

  it("3. Deve aplicar o Algoritmo de Afinidade Comportamental da Telemetria (Waesy Engine)", () => {
    const itemGastronomia = {
      title: "Pizza Marguerita",
      description: "Molho de tomate fresco e manjericão",
      niche: "gastronomia",
      created_at: new Date().toISOString(),
    };

    const itemModa = {
      title: "Vestido Floral",
      description: "Estampa exclusiva de verão",
      niche: "moda",
      created_at: new Date().toISOString(),
    };

    // Usuário tem forte afinidade com gastronomia (score 8.5 acumulado)
    const userAffinities = [
      {
        niche: "gastronomia",
        total_score: 8.5,
        interaction_count: 14,
        last_interacted_at: new Date().toISOString(),
      },
    ];

    // Sem query específica (exploração geral)
    const scoreGastroWithAffinity = calculateRelevanceScore(itemGastronomia, "", userAffinities);
    const scoreModaWithAffinity = calculateRelevanceScore(itemModa, "", userAffinities);

    // O item do nicho de afinidade deve ter pontuação muito superior
    expect(scoreGastroWithAffinity).toBeGreaterThan(scoreModaWithAffinity);
    expect(scoreGastroWithAffinity - scoreModaWithAffinity).toBeGreaterThanOrEqual(100);
  });

  it("4. Deve aplicar bônus de recência para itens recentes (Freshness Multiplier)", () => {
    const recentDate = new Date();
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 45); // 45 dias atrás

    const recentItem = {
      title: "Smartphone Pro Max",
      description: "Lançamento",
      niche: "eletronicos",
      created_at: recentDate.toISOString(),
    };

    const oldItem = {
      title: "Smartphone Pro Max",
      description: "Lançamento antigo",
      niche: "eletronicos",
      created_at: oldDate.toISOString(),
    };

    const recentScore = calculateRelevanceScore(recentItem, "Smartphone");
    const oldScore = calculateRelevanceScore(oldItem, "Smartphone");

    expect(recentScore).toBeGreaterThan(oldScore);
  });

  it("5. Deve aplicar boost prioritário para campanhas patrocinadas ativas", () => {
    const regularItem = {
      title: "Tênis Esportivo Running",
      description: "Amortecimento reforçado",
      niche: "moda",
      created_at: new Date().toISOString(),
      is_boosted: false,
    };

    const boostedItem = {
      title: "Tênis Esportivo Running",
      description: "Amortecimento reforçado",
      niche: "moda",
      created_at: new Date().toISOString(),
      is_boosted: true,
    };

    const regularScore = calculateRelevanceScore(regularItem, "Tênis");
    const boostedScore = calculateRelevanceScore(boostedItem, "Tênis");

    expect(boostedScore).toBe(regularScore + 40);
  });
});
