import { describe, it, expect } from "vitest";
import { resolveClassifiedNiche, getSemanticBadges, NICHE_DEFINITIONS, getClassifiedFeatureCards, getNicheTabLabels } from "./semantics";

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
    expect(niche.shortLabel).toBe("Viagens");
    expect(niche.priceSuffix).toBe(" por pessoa");
    expect(niche.primaryActionLabel).toBe("Reservar Vagas");

    const badges = getSemanticBadges(classified);
    expect(badges.some((b) => b.label === "Roteiro")).toBe(true);
  });

  it("resolve corretamente o nicho de Aluguel de Equipamentos (Eventos & Obras)", () => {
    const classified = {
      category: "equipment",
      deal_type: "aluguel",
      title: "Kit Iluminação Moving Head e Estrutura Box Truss",
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
    expect(niche.primaryActionLabel).toBe("Solicitar Doação");
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
    expect(niche.shortLabel).toBe("Digital");
    expect(niche.primaryActionLabel).toBe("Baixar Arquivo");
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
    expect(niche.primaryActionLabel).toBe("Assinar Plano");
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
    expect(niche.shortLabel).toBe("Vagas");
    expect(niche.primaryActionLabel).toBe("Candidatar-se");
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
    expect(niche.shortLabel).toBe("Doações");
    expect(niche.primaryActionLabel).toBe("Solicitar Doação");
    expect(niche.allowEscrowGuarantee).toBe(false);
  });

  it("resolve corretamente o nicho de Eventos & Shows e gera feature cards adequados", () => {
    const classified = {
      category: "event",
      title: "Festival da Colheita & Gastronomia 2026",
      price_cents: 12000,
      attributes: {
        niche: "evento",
        event_date: "15/11/2026",
        event_time: "19:00",
        event_venue: "Arena Central Parque de Exposições",
        age_rating: "16+",
        ticket_tier: "VIP Frontstage",
        event_format: "presencial",
      },
    };

    const niche = resolveClassifiedNiche(classified);
    expect(niche.id).toBe("event");
    expect(niche.badge).toBe("Evento");
    expect(niche.primaryActionLabel).toBe("Garantir Ingresso");

    const cards = getClassifiedFeatureCards(classified);
    expect(cards.some((c) => c.title === "Data do Evento" && c.value === "15/11/2026")).toBe(true);
    expect(cards.some((c) => c.title === "Horário" && c.value === "19:00")).toBe(true);
    expect(cards.some((c) => c.title === "Local / Espaço")).toBe(true);
    expect(cards.some((c) => c.title === "Lote / Setor" && c.value === "VIP Frontstage")).toBe(true);
  });

  it("resolve corretamente o nicho de Agronegócio & Maquinário e gera feature cards", () => {
    const classified = {
      category: "agri",
      title: "Trator John Deere 6110J 4x4 Cabinado",
      price_cents: 32000000,
      attributes: {
        niche: "agro",
        hours_used: 1850,
        traction: "4x4",
        year_fab: 2021,
        power_cv: 110,
        cabin_type: "cabin",
      },
    };

    const niche = resolveClassifiedNiche(classified);
    expect(niche.id).toBe("agri");
    expect(niche.badge).toBe("Agro");

    const cards = getClassifiedFeatureCards(classified);
    expect(cards.some((c) => c.title === "Horímetro" && c.value.includes("1.850"))).toBe(true);
    expect(cards.some((c) => c.title === "Tração" && c.value === "Tração 4x4")).toBe(true);
  });

  it("fornece rótulos de abas contextuais sem 'Detalhes do Item' genérico para cada nicho", () => {
    expect(getNicheTabLabels("job").overviewTab).toBe("Detalhes da Vaga");
    expect(getNicheTabLabels("job").sellerTab).toBe("Sobre a Empresa");

    expect(getNicheTabLabels("real_estate_sale").overviewTab).toBe("Detalhes do Imóvel");
    expect(getNicheTabLabels("vehicle").overviewTab).toBe("Detalhes do Veículo");
    expect(getNicheTabLabels("service").overviewTab).toBe("Detalhes do Serviço");
    expect(getNicheTabLabels("event").overviewTab).toBe("Programação & Ingressos");
    expect(getNicheTabLabels("hospitality_stay").overviewTab).toBe("Infos da Estadia");
    expect(getNicheTabLabels("travel").overviewTab).toBe("Infos do Pacote");
    expect(getNicheTabLabels("agri").overviewTab).toBe("Detalhes do Maquinário");
    expect(getNicheTabLabels("business").overviewTab).toBe("Sobre o Negócio");
    expect(getNicheTabLabels("food").overviewTab).toBe("Detalhes do Cardápio");
    expect(getNicheTabLabels("donation").overviewTab).toBe("Detalhes da Doação");
  });
});
