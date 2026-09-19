import { describe, it, expect } from "vitest";
import {
  CANONICAL_BUSINESS_TYPES,
  CANONICAL_INVESTMENT_MODELS,
  CANONICAL_PROJECT_STAGES,
  CANONICAL_USE_OF_FUNDS,
} from "./canonical-taxonomy";
import { NICHE_DEFINITIONS, resolveClassifiedNiche } from "./semantics";

describe("Canonical Taxonomy & Investment Architecture Tests", () => {
  it("should provide canonical investment models for business projects seeking capital/partners", () => {
    expect(CANONICAL_INVESTMENT_MODELS).toHaveLength(5);
    const modelIds = CANONICAL_INVESTMENT_MODELS.map((m) => m.id);
    expect(modelIds).toContain("socio_investidor");
    expect(modelIds).toContain("socio_operador");
    expect(modelIds).toContain("mutuo_expansao");
    expect(modelIds).toContain("anjo_seed");
    expect(modelIds).toContain("abertura_filial");

    // All labels must be clear and direct
    CANONICAL_INVESTMENT_MODELS.forEach((m) => {
      expect(m.label.length).toBeGreaterThan(3);
      expect(m.description.length).toBeGreaterThan(10);
    });
  });

  it("should have structured project stages and use of funds", () => {
    expect(CANONICAL_PROJECT_STAGES.length).toBeGreaterThanOrEqual(4);
    expect(CANONICAL_USE_OF_FUNDS.length).toBeGreaterThanOrEqual(5);

    const stageIds = CANONICAL_PROJECT_STAGES.map((s) => s.id);
    expect(stageIds).toContain("ideia_validada");
    expect(stageIds).toContain("em_operacao");
    expect(stageIds).toContain("faturando");
    expect(stageIds).toContain("expansao");
  });

  it("should eradicate double/compound AI-smell titles in NICHE_DEFINITIONS", () => {
    // Negócios must be simple "Negócios"
    expect(NICHE_DEFINITIONS.business.title).toBe("Negócios");
    expect(NICHE_DEFINITIONS.business.shortLabel).toBe("Negócios");
    expect(NICHE_DEFINITIONS.business.title).not.toContain("& M&A");

    // Doações must be simple "Doações"
    expect(NICHE_DEFINITIONS.donation.title).toBe("Doações");
    expect(NICHE_DEFINITIONS.donation.shortLabel).toBe("Doações");
    expect(NICHE_DEFINITIONS.donation.title).not.toContain("& Solidariedade");

    // Serviços must be simple "Serviços"
    expect(NICHE_DEFINITIONS.service.title).toBe("Serviços");
    expect(NICHE_DEFINITIONS.service.shortLabel).toBe("Serviços");
    expect(NICHE_DEFINITIONS.service.title).not.toContain("& B2B");

    // Veículos must be simple "Veículos"
    expect(NICHE_DEFINITIONS.vehicle.title).toBe("Veículos");
    expect(NICHE_DEFINITIONS.vehicle.shortLabel).toBe("Veículos");
    expect(NICHE_DEFINITIONS.vehicle.title).not.toContain("& Autos");

    // Desapego must be simple "Desapego"
    expect(NICHE_DEFINITIONS.goods.title).toBe("Desapego");
    expect(NICHE_DEFINITIONS.goods.shortLabel).toBe("Desapego");
    expect(NICHE_DEFINITIONS.goods.title).not.toContain("& Tech");

    // Viagens must be simple "Viagens"
    expect(NICHE_DEFINITIONS.travel.title).toBe("Viagens");
    expect(NICHE_DEFINITIONS.travel.shortLabel).toBe("Viagens");
  });

  it("should resolve business and donation classifieds correctly in resolveClassifiedNiche", () => {
    const bizClassified = {
      id: "biz-1",
      title: "Hamburgueria Artesanal no Centro",
      category: "business",
      attributes: {
        business_type: "captacao_investimento",
        target_investment_cents: 8000000,
        offered_equity_percent: "20%",
      },
    };

    const resolvedBiz = resolveClassifiedNiche(bizClassified);
    expect(resolvedBiz.id).toBe("business");
    expect(resolvedBiz.title).toBe("Negócios");

    const donationClassified = {
      id: "don-1",
      title: "Sofá 3 Lugares para Retirada",
      category: "donation",
      price_cents: 0,
      attributes: {
        is_free_donation: true,
      },
    };

    const resolvedDonation = resolveClassifiedNiche(donationClassified);
    expect(resolvedDonation.id).toBe("donation");
    expect(resolvedDonation.title).toBe("Doações");
  });
});
