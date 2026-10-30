import { describe, it, expect } from "vitest";
import { OMNI_APP_BLUEPRINTS } from "./omni-apps-blueprint.functions";
import { OmniAppIdSchema } from "@/types/omni-apps";

describe("Omni Apps Blueprint Engine (Wix App Market Parity)", () => {
  it("contém exatamente os 7 pacotes de apps declarativos canônicos", () => {
    const appIds = Object.keys(OMNI_APP_BLUEPRINTS);
    expect(appIds).toHaveLength(7);
    expect(appIds).toContain("supermarket");
    expect(appIds).toContain("delivery");
    expect(appIds).toContain("events");
    expect(appIds).toContain("appointments");
    expect(appIds).toContain("ecommerce");
    expect(appIds).toContain("biolink");
    expect(appIds).toContain("news");
  });

  it("garante conformidade de todos os blueprints com OmniAppIdSchema", () => {
    for (const [id, blueprint] of Object.entries(OMNI_APP_BLUEPRINTS)) {
      expect(OmniAppIdSchema.safeParse(id).success).toBe(true);
      expect(blueprint.id).toBe(id);
      expect(blueprint.name).toBeDefined();
      expect(blueprint.tagline).toBeDefined();
      expect(blueprint.pages.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("verifica integridade das páginas provisionadas pelo App Supermercado", () => {
    const supermarketApp = OMNI_APP_BLUEPRINTS.supermarket;
    expect(supermarketApp.pages.some((p) => p.isHome)).toBe(true);
    
    const slugs = supermarketApp.pages.map((p) => p.slug);
    expect(slugs).toContain("mercado");
    expect(slugs).toContain("departamento");
    expect(slugs).toContain("produto");
    expect(slugs).toContain("carrinho");
    expect(slugs).toContain("pedidos");
    expect(slugs).toContain("clube");

    const homePage = supermarketApp.pages.find((p) => p.slug === "mercado")!;
    expect(homePage.initialBlocks.some((b) => b.type === "supermarket_hero_carousel")).toBe(true);
    expect(homePage.initialBlocks.some((b) => b.type === "supermarket_fulfillment_pill")).toBe(true);
    expect(homePage.initialBlocks.some((b) => b.type === "supermarket_category_dock")).toBe(true);
  });

  it("verifica integridade dos botões e navegação nativa do App Gastronomia & Delivery", () => {
    const deliveryApp = OMNI_APP_BLUEPRINTS.delivery;
    expect(deliveryApp.navItems.length).toBeGreaterThanOrEqual(3);
    expect(deliveryApp.dataRequirements.tableManagement).toBe(true);

    const deliverySlugs = deliveryApp.pages.map((p) => p.slug);
    expect(deliverySlugs).toContain("cardapio");
    expect(deliverySlugs).toContain("produto");
    expect(deliverySlugs).toContain("carrinho");
    expect(deliverySlugs).toContain("pedidos");
    expect(deliverySlugs).toContain("acompanhar");
  });

  it("valida que páginas possuem meta SEO completa sem campos vazios", () => {
    for (const app of Object.values(OMNI_APP_BLUEPRINTS)) {
      for (const page of app.pages) {
        expect(page.seo.title.length).toBeGreaterThan(5);
        expect(page.seo.description.length).toBeGreaterThan(10);
        expect(typeof page.seo.allowIndexing).toBe("boolean");
      }
    }
  });
});
