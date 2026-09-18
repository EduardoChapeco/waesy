import { describe, it, expect } from "vitest";
import { getSlideDimensions } from "@/components/studio/slide-renderer-escamas";
import { findProfessionByTitle } from "@/lib/data/professions-catalog";
import { GLOBAL_MASTER_PRODUCTS_CATALOG } from "@/lib/data/master-products-catalog";

describe("PHASE 16 INTEGRATED ENHANCEMENTS: STUDIO SOCIAL & MASTER CATALOG SYNC", () => {
  describe("1. Studio Escamas Multi-Ratio & Slide Dimensions", () => {
    it("deve retornar dimensões canônicas corretas para cada proporção do Studio", () => {
      const p45 = getSlideDimensions("portrait_4_5");
      expect(p45).toEqual({ width: 1080, height: 1350 });

      const s916 = getSlideDimensions("story_9_16");
      expect(s916).toEqual({ width: 1080, height: 1920 });

      const sq11 = getSlideDimensions("square_1_1");
      expect(sq11).toEqual({ width: 1080, height: 1080 });

      const l169 = getSlideDimensions("landscape_16_9");
      expect(l169).toEqual({ width: 1920, height: 1080 });
    });
  });

  describe("2. Catálogo Mestre & Sincronização de Parâmetros Fiscais (Reforma Tributária 2026)", () => {
    it("deve conter produtos canônicos com NCM, CEST, EAN e alíquotas de IBS/CBS 2026", () => {
      expect(GLOBAL_MASTER_PRODUCTS_CATALOG.length).toBeGreaterThan(10);

      const heineken = GLOBAL_MASTER_PRODUCTS_CATALOG.find((p) => p.name.includes("Heineken"));
      expect(heineken).toBeDefined();
      expect(heineken?.ncm_code).toBe("2203.00.00");
      expect(heineken?.ibs_rate).toBe(18);
      expect(heineken?.cbs_rate).toBe(9);
      expect(heineken?.suggested_price_cents).toBeGreaterThan(0);
      expect(heineken?.unit_of_measure).toBe("UN");
    });

    it("deve mapear corretamente atributos para atualização atômica de produto na loja", () => {
      const masterItem = GLOBAL_MASTER_PRODUCTS_CATALOG[0];
      const payload = {
        title: masterItem.name,
        description: masterItem.description,
        brand: masterItem.brand_name,
        price_cents: masterItem.suggested_price_cents,
        ean: masterItem.barcode_ean,
        attributes: {
          ncm_code: masterItem.ncm_code,
          cest_code: masterItem.cest_code,
          ibs_rate: masterItem.ibs_rate,
          cbs_rate: masterItem.cbs_rate,
          cfop_default: masterItem.cfop_default,
          master_barcode: masterItem.barcode_ean,
        },
      };

      expect(payload.title).toBe(masterItem.name);
      expect(payload.attributes.ncm_code).toBe(masterItem.ncm_code);
      expect(payload.attributes.ibs_rate).toBe(masterItem.ibs_rate);
      expect(payload.attributes.master_barcode).toBe(masterItem.barcode_ean);
    });
  });

  describe("3. Motor de Profissões e CBO com Guia Salarial", () => {
    it("deve correlacionar títulos de vagas a registros oficiais de CBO", () => {
      const dev = findProfessionByTitle("Desenvolvedor Frontend React Pleno");
      expect(dev).toBeDefined();
      expect(dev?.cbo_code).toBe("2124-05");
      expect(dev?.junior_salary_cents).toBeGreaterThan(0);
      expect(dev?.senior_salary_cents).toBeGreaterThan(dev!.junior_salary_cents);

      const barista = findProfessionByTitle("Barista de Cafeteria Especial");
      expect(barista).toBeDefined();
      expect(barista?.cbo_code).toBe("5134-25");

      const chef = findProfessionByTitle("Chef de Cozinha Executivo");
      expect(chef).toBeDefined();
      expect(chef?.cbo_code).toBe("5134-05");
    });
  });

  describe("4. Validação de Publicação Social do Studio Escamas", () => {
    it("deve validar formato do payload de publicação para Feed e Stories", () => {
      const testProject = {
        id: "proj-123",
        title: "5 Tendências de Viagens para o Verão 2027",
        destination: "both" as const,
        aspectRatio: "portrait_4_5",
        coverImageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
        slideImages: [
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
          "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1",
        ],
        caption: "Confira nosso carrossel exclusivo sobre destinos imperdíveis.",
        hashtags: ["Turismo", "Waesy", "StudioEscamas"],
      };

      expect(testProject.destination).toBe("both");
      expect(testProject.slideImages.length).toBe(2);
      expect(testProject.hashtags).toContain("StudioEscamas");
    });
  });
});
