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

  it("resolve corretamente o nicho de Produto Digital e Download", () => {
    const classified = {
      category: "digital",
      title: "Planilha de Gestão Financeira Avançada 2026",
      price_cents: 4900,
      is_digital: true,
      attributes: {
        digital_file_type: "xlsx",
        digital_file_size_bytes: 5242880,
      },
    };

    const niche = resolveClassifiedNiche(classified);
    expect(niche.id).toBe("digital");
    expect(niche.shortLabel).toBe("Digital / Download");
    expect(niche.primaryActionLabel).toBe("Comprar & Baixar Arquivo");
    expect(niche.showDeliveryBadges).toBe(false);
  });

  it("resolve corretamente o nicho de Assinatura Recorrente", () => {
    const classified = {
      category: "subscription",
      title: "Clube do Café Especial — 2 Pacotes Selecionados por Mês",
      price_cents: 8900,
      attributes: {
        niche: "assinatura",
        subscription_cycle: "mensal",
        trial_days: 7,
      },
    };

    const niche = resolveClassifiedNiche(classified);
    expect(niche.id).toBe("subscription");
    expect(niche.shortLabel).toBe("Assinatura");
    expect(niche.priceSuffix).toBe("/mês");
    expect(niche.primaryActionLabel).toBe("Assinar Plano Mensal");
  });

  it("resolve corretamente o nicho de Vaga de Emprego", () => {
    const classified = {
      category: "job",
      title: "Desenvolvedor Full Stack Sênior",
      price_cents: 0,
      attributes: {
        niche: "vaga",
        regime: "clt",
        work_model: "remoto",
      },
    };

    const niche = resolveClassifiedNiche(classified);
    expect(niche.id).toBe("job");
    expect(niche.shortLabel).toBe("Vaga / Emprego");
    expect(niche.primaryActionLabel).toBe("Candidatar-se à Vaga");
    expect(niche.allowEscrowGuarantee).toBe(false);
  });

  it("resolve corretamente doação via flag is_free_donation mesmo com categoria genérica", () => {
    const classified = {
      category: "outros",
      title: "Desapego de berço infantil em bom estado",
      price_cents: 0,
      is_free_donation: true,
      attributes: {
        is_free_donation: true,
      },
    };

    const niche = resolveClassifiedNiche(classified);
    expect(niche.id).toBe("donation");
    expect(niche.shortLabel).toBe("Doação Gratuita");
    expect(niche.primaryActionLabel).toBe("Solicitar Doação / Retirada");
    expect(niche.allowEscrowGuarantee).toBe(false);
  });
});
