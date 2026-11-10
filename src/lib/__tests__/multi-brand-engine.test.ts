import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  BRAND_VERTICALS_REGISTRY,
  SUBSCRIPTION_TIERS_REGISTRY,
  BRAND_VERTICAL_LIST,
  resolveBrandContextFromHost,
  getBrandVerticalById,
  getTierModules,
  canAccessModule,
  shouldPublishStoreToMarketplace,
  shouldPublishItemToMarketplace,
} from "../multi-brand-engine";

describe("Multi-Brand Vertical Ecosystem & Marketplace Opt-In Engine (SPEC-MULTI-BRAND-VERTICAL-ECOSYSTEM)", () => {
  describe("EARS-01 & Catálogo de 12 Verticais Especializadas", () => {
    it("deve registrar todas as 12 marcas verticais canônicas com domínios, nichos e nomenclaturas completas", () => {
      const expectedIds = [
        "waesy",
        "wowbook",
        "tableway",
        "turis",
        "passhub",
        "lexcloud",
        "talentlink",
        "omnipage",
        "signflow",
        "waesy_news",
        "waesy_copilot",
        "waesy_studio",
      ];

      expect(BRAND_VERTICAL_LIST.length).toBe(12);
      for (const id of expectedIds) {
        const config = getBrandVerticalById(id);
        expect(config.id).toBe(id);
        expect(config.brandName.length).toBeGreaterThan(2);
        expect(config.primaryDomain).toContain(".");
        expect(config.defaultModules.length).toBeGreaterThan(0);
        expect(config.nomenclature.itemSingular.length).toBeGreaterThan(0);
        expect(config.nomenclature.customerPlural.length).toBeGreaterThan(0);
      }
    });

    it("deve retornar fallback seguro para waesy quando brandId for nulo ou desconhecido", () => {
      expect(getBrandVerticalById(null).id).toBe("waesy");
      expect(getBrandVerticalById(undefined).id).toBe("waesy");
      expect(getBrandVerticalById("unknown_brand_xyz").id).toBe("waesy");
    });
  });

  describe("EARS-04: Resolução Determinística de Marca por Hostname", () => {
    it("deve resolver domínios dedicados e subdomínios de cada vertical especializada", () => {
      expect(resolveBrandContextFromHost("wowbook.com.br").id).toBe("wowbook");
      expect(resolveBrandContextFromHost("barbearia.wowbook.com.br").id).toBe("wowbook");
      expect(resolveBrandContextFromHost("tableway.com.br:3000").id).toBe("tableway");
      expect(resolveBrandContextFromHost("pizzaria.tableway.com.br").id).toBe("tableway");
      expect(resolveBrandContextFromHost("turis.com.br").id).toBe("turis");
      expect(resolveBrandContextFromHost("passhub.com.br").id).toBe("passhub");
      expect(resolveBrandContextFromHost("lexcloud.com.br").id).toBe("lexcloud");
      expect(resolveBrandContextFromHost("talentlink.com.br").id).toBe("talentlink");
      expect(resolveBrandContextFromHost("omnipage.com.br").id).toBe("omnipage");
      expect(resolveBrandContextFromHost("signflow.com.br").id).toBe("signflow");
      expect(resolveBrandContextFromHost("news.waesy.com.br").id).toBe("waesy_news");
      expect(resolveBrandContextFromHost("copilot.waesy.com.br").id).toBe("waesy_copilot");
      expect(resolveBrandContextFromHost("studio.waesy.com.br").id).toBe("waesy_studio");
      expect(resolveBrandContextFromHost("painel.waesy.com.br").id).toBe("waesy_studio");
      expect(resolveBrandContextFromHost("waesy.com.br").id).toBe("waesy");
      expect(resolveBrandContextFromHost("").id).toBe("waesy");
    });
  });

  describe("EARS-02 & EARS-03: Desacoplamento Soberano de Marketplace (Opt-In vs Private SaaS)", () => {
    it("deve ocultar loja do marketplace quando waesy_marketplace_enabled ou publish_to_marketplace for false", () => {
      expect(shouldPublishStoreToMarketplace({ id: "s1", name: "Loja Legada" })).toBe(true);
      expect(
        shouldPublishStoreToMarketplace({
          id: "s2",
          waesy_marketplace_enabled: false,
          publish_to_marketplace: true,
        }),
      ).toBe(false);
      expect(
        shouldPublishStoreToMarketplace({
          id: "s3",
          waesy_marketplace_enabled: true,
          publish_to_marketplace: false,
        }),
      ).toBe(false);
      expect(
        shouldPublishStoreToMarketplace({
          id: "s4",
          settings: { waesy_marketplace_enabled: false },
        }),
      ).toBe(false);
    });

    it("deve filtrar itens individuais com is_published_to_marketplace === false ou quando a loja for privada", () => {
      const publicStore = { id: "s1", waesy_marketplace_enabled: true, publish_to_marketplace: true };
      const privateStore = { id: "s2", waesy_marketplace_enabled: false };

      expect(
        shouldPublishItemToMarketplace({ id: "p1", is_published_to_marketplace: true }, publicStore),
      ).toBe(true);
      expect(
        shouldPublishItemToMarketplace({ id: "p2", is_published_to_marketplace: false }, publicStore),
      ).toBe(false);
      expect(
        shouldPublishItemToMarketplace({ id: "p3", is_published_to_marketplace: true }, privateStore),
      ).toBe(false);
    });
  });

  describe("EARS-06: Empacotamento Modular por Planos (Feature Tiers)", () => {
    it("deve restringir módulos no plano starter e liberar todos no plano enterprise", () => {
      const starterStore = { subscription_tier: "starter", enabled_modules: [] };
      expect(canAccessModule(starterStore, "catalog")).toBe(true);
      expect(canAccessModule(starterStore, "orders")).toBe(true);
      expect(canAccessModule(starterStore, "fleet")).toBe(false);
      expect(canAccessModule(starterStore, "simlab")).toBe(false);

      const starterWithAddon = { subscription_tier: "starter", enabled_modules: ["fleet"] };
      expect(canAccessModule(starterWithAddon, "fleet")).toBe(true);

      const enterpriseStore = { subscription_tier: "enterprise" };
      expect(canAccessModule(enterpriseStore, "fleet")).toBe(true);
      expect(canAccessModule(enterpriseStore, "simlab")).toBe(true);
      expect(canAccessModule(enterpriseStore, "hr")).toBe(true);
    });

    it("deve retornar a lista de módulos do tier combinada com a marca vertical", () => {
      const starterMods = getTierModules("starter", "wowbook");
      expect(starterMods).toContain("catalog");
      expect(starterMods).not.toContain("boarding");

      const enterpriseMods = getTierModules("enterprise", "turis");
      expect(enterpriseMods).toContain("boarding");
      expect(enterpriseMods).toContain("fleet");
    });
  });

  describe("EARS-07: Integridade de Infraestrutura (Migration, BFF & Worker)", () => {
    it("deve conter a migration SQL de ecossistema multi-marca e opt-in de marketplace", () => {
      const migrationPath = path.resolve(
        process.cwd(),
        "supabase/migrations/20270326000000_multi_brand_vertical_ecosystem_and_marketplace_opt_in.sql",
      );
      expect(fs.existsSync(migrationPath)).toBe(true);
      const sql = fs.readFileSync(migrationPath, "utf8");
      expect(sql).toContain("publish_to_marketplace");
      expect(sql).toContain("waesy_marketplace_enabled");
      expect(sql).toContain("brand_origin");
      expect(sql).toContain("is_published_to_marketplace");
    });

    it("deve conter o serviço BFF multi-brand.functions.ts com desestruturação completa de parâmetros", () => {
      const bffPath = path.resolve(process.cwd(), "src/services/multi-brand.functions.ts");
      expect(fs.existsSync(bffPath)).toBe(true);
      const content = fs.readFileSync(bffPath, "utf8");
      expect(content).toContain("getStoreMultiBrandGovernanceFn");
      expect(content).toContain("updateStoreMarketplaceOptInFn");
      expect(content).toContain("updateStoreBrandAndTierFn");
      expect(content).toContain("toggleProductMarketplaceVisibilityFn");
    });
  });
});
