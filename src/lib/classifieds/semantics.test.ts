import { describe, it, expect } from "vitest";
import { resolveClassifiedNiche, getSemanticBadges, NICHE_DEFINITIONS } from "./semantics";

describe("Waesy Classifieds — Biblioteca Semântica & Taxonomia Modular de Nichos", () => {
  it("resolve corretamente o nicho de Viagem / Turismo para pacotes e resorts", () => {
    const classified = {
      category: "travel",
      title: "Pacote All Inclusive Resort Salinas de Maragogi",
      price_cents: 450000,
      attributes: {
        template_style: "editorial",
        niche: "viagem",
      },
    };

    const niche = resolveClassifiedNiche(classified);
    expect(niche.id).toBe("travel");
    expect(niche.shortLabel).toBe("Viagem & Tour");
    expect(niche.priceSuffix).toBe(" por pessoa");
    expect(niche.primaryActionLabel).toBe("Reservar Vagas / Cotação");

    const badges = getSemanticBadges(classified);
    expect(badges.some((b) => b.label === "Roteiro & Viagem Verificada")).toBe(true);
  });

  it("resolve corretamente o nicho de Aluguel de Equipamentos (Eventos & Obras)", () => {
    const classified = {
      category: "equipment",
      deal_type: "aluguel",
      title: "Kit Iluminação Moving Head & Estrutura Box Truss",
      price_cents: 35000,
      attributes: {
        niche: "equipamento",
      },
    };

    const niche = resolveClassifiedNiche(classified);
    expect(niche.id).toBe("equipment");
    expect(niche.priceSuffix).toBe("/diária");
    expect(niche.primaryActionLabel).toBe("Reservar Equipamento");
    expect(niche.showDeliveryBadges).toBe(true);
  });

  it("resolve corretamente o nicho de Doações para desapego gratuito (R$ 0,00)", () => {
    const classified = {
      category: "donation",
      title: "Doação de Sofá 3 Lugares e Poltrona para Retirada",
      price_cents: 0,
    };

    const niche = resolveClassifiedNiche(classified);
    expect(niche.id).toBe("donation");
    expect(niche.priceSuffix).toBe(" (Gratuito)");
    expect(niche.primaryActionLabel).toBe("Solicitar Doação / Retirada");
    expect(niche.allowEscrowGuarantee).toBe(false);
  });

  it("resolve corretamente Hospedagem / Temporada (diárias, não venda de imóvel)", () => {
    const classified = {
      category: "real_estate",
      deal_type: "temporada",
      title: "Cabana Romântica na Serra com Hidro e Lareira",
      price_cents: 68000,
      rental_period: "diaria",
      max_guests: 2,
    };

    const niche = resolveClassifiedNiche(classified);
    expect(niche.id).toBe("hospitality_stay");
    expect(niche.priceSuffix).toBe("/diária");
    expect(niche.showDeliveryBadges).toBe(false); // Regra: NUNCA exibir entrega para hospedagens
  });
});
