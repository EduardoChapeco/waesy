import { describe, it, expect } from "vitest";
import { findProfessionByTitle, GLOBAL_PROFESSIONS_CATALOG } from "@/lib/data/professions-catalog";
import { getSlideDimensions } from "@/components/studio/slide-renderer-escamas";
import { calculateReformaTributaria2026 } from "@/routes/admin-master.faturas";
import { GLOBAL_ON_DEMAND_SERVICES_CATALOG } from "@/lib/data/services-catalog";
import { GLOBAL_MASTER_PRODUCTS_CATALOG } from "@/lib/data/master-products-catalog";

describe("FASE 15: INTEGRAÇÃO HOLÍSTICA E2E & MELHORIAS RECURSIVAS", () => {
  // ── 1. PORTAL DE EMPREGOS & MATRICIAMENTO CBO ──
  describe("Matching Inteligente de Carreiras & CBO (professions-catalog)", () => {
    it("deve encontrar profissão exata pelo código CBO", () => {
      const match = findProfessionByTitle("2124-05");
      expect(match).not.toBeNull();
      expect(match?.title).toContain("Desenvolvedor");
      expect(match?.junior_salary_cents).toBeGreaterThan(0);
      expect(match?.senior_salary_cents).toBeGreaterThan(match!.junior_salary_cents);
    });

    it("deve encontrar profissão por termo parcial no título", () => {
      const matchDev = findProfessionByTitle("Desenvolvedor React");
      expect(matchDev).not.toBeNull();
      expect(matchDev?.cbo_code).toBe("2124-05");

      const matchBarbeiro = findProfessionByTitle("Barbeiro Profissional");
      expect(matchBarbeiro).not.toBeNull();
      expect(matchBarbeiro?.cbo_code).toBe("5161-10");

      const matchPizza = findProfessionByTitle("Pizzaiolo Forneiro");
      expect(matchPizza).not.toBeNull();
      expect(matchPizza?.cbo_code).toBe("5132-20");
    });

    it("deve lidar defensivamente com buscas nulas ou vazias", () => {
      expect(findProfessionByTitle("")).toBeNull();
      expect(findProfessionByTitle(null)).toBeNull();
      expect(findProfessionByTitle(undefined)).toBeNull();
      expect(findProfessionByTitle("   ")).toBeNull();
    });

    it("todas as profissões do catálogo global devem ter faixas salariais coerentes e CBO válido", () => {
      GLOBAL_PROFESSIONS_CATALOG.forEach((p) => {
        expect(p.cbo_code).toMatch(/^\d{4}-\d{2}$/);
        expect(p.junior_salary_cents).toBeGreaterThanOrEqual(141200); // Acima do salário mínimo
        expect(p.mid_salary_cents).toBeGreaterThanOrEqual(p.junior_salary_cents);
        expect(p.senior_salary_cents).toBeGreaterThanOrEqual(p.mid_salary_cents);
        expect(p.lead_salary_cents).toBeGreaterThanOrEqual(p.senior_salary_cents);
      });
    });
  });

  // ── 2. ORÇAMENTOS HÍBRIDOS (PRODUTOS MESTRE & SERVIÇOS SOB DEMANDA) ──
  describe("Integração de Catálogo Mestre & Serviços em Orçamentos", () => {
    it("deve conter produtos de múltiplos nichos aptos para inserção em propostas comerciais", () => {
      const bebidas = GLOBAL_MASTER_PRODUCTS_CATALOG.filter((p) => p.category.includes("Bebidas") || p.category === "Bebidas");
      const gastronomia = GLOBAL_MASTER_PRODUCTS_CATALOG.filter((p) => p.category.includes("Gastronomia") || p.category === "Gastronomia");
      const moveis = GLOBAL_MASTER_PRODUCTS_CATALOG.filter((p) => p.category.includes("Móveis") || p.category === "Móveis");
      const eletro = GLOBAL_MASTER_PRODUCTS_CATALOG.filter((p) => p.category.includes("Eletrodomésticos") || p.category === "Eletrodomésticos");

      expect(bebidas.length).toBeGreaterThanOrEqual(2);
      expect(gastronomia.length).toBeGreaterThanOrEqual(2);
      expect(moveis.length).toBeGreaterThanOrEqual(2);
      expect(eletro.length).toBeGreaterThanOrEqual(2);

      // Todos devem ter preço de referência e código NCM
      bebidas.forEach((b) => {
        expect(b.suggested_price_cents).toBeGreaterThan(0);
        expect(b.ncm_code).toBeTruthy();
      });
    });

    it("deve conter serviços sob demanda estruturados com unidades e faixas de preço", () => {
      expect(GLOBAL_ON_DEMAND_SERVICES_CATALOG.length).toBeGreaterThanOrEqual(10);

      const devService = GLOBAL_ON_DEMAND_SERVICES_CATALOG.find((s) => s.category.includes("Tecnologia"));
      expect(devService).toBeDefined();
      expect(devService?.estimated_avg_price_cents).toBeGreaterThan(0);

      const civilService = GLOBAL_ON_DEMAND_SERVICES_CATALOG.find((s) => s.category.includes("Reformas"));
      expect(civilService).toBeDefined();
      expect(civilService?.pricing_unit).toBeTruthy();
    });
  });

  // ── 3. STUDIO ESCAMAS MULTI-RATIO (CANVAS & EXPORTAÇÃO) ──
  describe("Studio Escamas: Dimensões Multi-Proporção", () => {
    it("deve calcular dimensões canônicas exatas para cada formato", () => {
      // Instagram Post 4:5
      const post = getSlideDimensions("portrait_4_5");
      expect(post.width).toBe(1080);
      expect(post.height).toBe(1350);

      // Stories / Reels / TikTok 9:16
      const story = getSlideDimensions("story_9_16");
      expect(story.width).toBe(1080);
      expect(story.height).toBe(1920);

      // Feed Quadrado 1:1
      const square = getSlideDimensions("square_1_1");
      expect(square.width).toBe(1080);
      expect(square.height).toBe(1080);

      // Apresentação Pitch Deck 16:9
      const deck = getSlideDimensions("landscape_16_9");
      expect(deck.width).toBe(1920);
      expect(deck.height).toBe(1080);
    });

    it("deve utilizar fallback padrão para portrait 4:5 se parâmetro omitido", () => {
      const fallback = getSlideDimensions();
      expect(fallback.width).toBe(1080);
      expect(fallback.height).toBe(1350);
    });
  });

  // ── 4. FATURAS & REFORMA TRIBUTÁRIA 2026 ──
  describe("Simulação de Retenções Fiscais da Reforma Tributária 2026", () => {
    it("deve calcular alíquotas oficiais de IBS (1.77%) e CBS (8.80%)", () => {
      const baseAmountCents = 100000; // R$ 1.000,00
      const taxes = calculateReformaTributaria2026(baseAmountCents);

      expect(taxes.ibsCents).toBe(1770); // R$ 17,70
      expect(taxes.cbsCents).toBe(8800); // R$ 88,00
      expect(taxes.irrfCents).toBe(1500); // R$ 15,00
      expect(taxes.totalTaxCents).toBe(1770 + 8800); // R$ 105,70
      expect(taxes.netCents).toBe(baseAmountCents - taxes.totalTaxCents); // R$ 894,30
    });

    it("deve retornar valores nulos ou zero com segurança para faturas zeradas", () => {
      const zeroTaxes = calculateReformaTributaria2026(0);
      expect(zeroTaxes.ibsCents).toBe(0);
      expect(zeroTaxes.cbsCents).toBe(0);
      expect(zeroTaxes.totalTaxCents).toBe(0);
      expect(zeroTaxes.netCents).toBe(0);
    });
  });
});
