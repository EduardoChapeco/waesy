import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Vertical Showcases Data Integrity (AGENTS.md B.8 & B.33)", () => {
  const routesToTest = [
    "src/routes/_store.gastronomia.tsx",
    "src/routes/_store.acougue.tsx",
    "src/routes/_store.bebidas.tsx",
    "src/routes/_store.farmacia.tsx",
    "src/routes/_store.mercado.tsx",
    "src/routes/_store.pet.tsx",
  ];

  routesToTest.forEach((routePath) => {
    const fullPath = path.resolve(process.cwd(), routePath);
    const content = fs.readFileSync(fullPath, "utf8");

    it(`should NOT contain synthetic store mock arrays in ${routePath}`, () => {
      expect(content).not.toMatch(/st-corujao|ac-boutique-chapeco|beb-adega-central|farm-sao-joao|st-hiper-central|pet-center-sul/i);
    });

    it(`should NOT contain hardcoded fallback ratings (e.g. 4.8 or 4.9) in ${routePath}`, () => {
      expect(content).not.toMatch(/rating:\s*4\.[0-9]/);
      expect(content).not.toMatch(/rating:\s*st\.rating\s*\|\|/);
    });

    it(`should NOT contain hardcoded fake reviewCount formulas in ${routePath}`, () => {
      expect(content).not.toMatch(/reviewCount:\s*\d+/);
      expect(content).not.toMatch(/review_count\s*\|\|\s*\d+/);
    });

    it(`should NOT contain hardcoded DEFAULT_*_MINI_BANNERS with static hex colors in ${routePath}`, () => {
      expect(content).not.toMatch(/DEFAULT_FEATURE_MINI_BANNERS|DEFAULT_ACOUQUE_MINI_BANNERS|DEFAULT_BEBIDAS_MINI_BANNERS|DEFAULT_FARMACIA_MINI_BANNERS|DEFAULT_MERCADO_MINI_BANNERS|DEFAULT_PET_MINI_BANNERS/);
      expect(content).not.toMatch(/bgColor:\s*["']#[0-9a-fA-F]{6}["']/);
    });

    it(`should cleanly return empty array [] when rawStores is empty in ${routePath}`, () => {
      expect(content).toMatch(/return \[\];\s*\}, \[rawStores\]\);/);
    });
  });

  describe("TravelProductDetail Component Integrity", () => {
    const travelDetailPath = path.resolve(process.cwd(), "src/components/commerce/dynamic-sections/travel-product-detail.tsx");
    const content = fs.readFileSync(travelDetailPath, "utf8");

    it("should NOT have fake default ratings or reviews in TravelProductDetail", () => {
      expect(content).not.toMatch(/starsCount\s*=\s*[1-5]/);
      expect(content).not.toMatch(/reviewScore\s*=\s*[0-9]/);
      expect(content).not.toMatch(/reviewCount\s*=\s*[0-9]+/);
    });

    it("should guard star rendering with strict numeric check", () => {
      expect(content).toMatch(/typeof starsCount === "number" && starsCount > 0/);
    });

    it("should guard review score with strict numeric check", () => {
      expect(content).toMatch(/typeof reviewScore === "number"/);
      expect(content).toMatch(/typeof reviewCount === "number"[\s\S]*?reviewCount > 0/);
    });
  });

  describe("Turismo Hoteis Workspace Integrity", () => {
    const hoteisPath = path.resolve(process.cwd(), "src/routes/workspace.turismo.hoteis.tsx");
    const content = fs.readFileSync(hoteisPath, "utf8");

    it("should NOT default internal_rating to 4.8", () => {
      expect(content).not.toMatch(/internal_rating:\s*4\.8/);
      expect(content).toMatch(/internal_rating:\s*0/);
    });
  });

  describe("Chat Functions Governance Integrity", () => {
    const chatFunctionsPath = path.resolve(process.cwd(), "src/services/chat.functions.ts");
    const content = fs.readFileSync(chatFunctionsPath, "utf8");

    it("should compute avg_rating from actual rated threads or return null", () => {
      expect(content).not.toMatch(/avg_rating:\s*4\.8/);
      expect(content).not.toMatch(/avg_rating:\s*5\.0/);
      expect(content).toMatch(/ratedThreads\.length > 0/);
    });
  });
});
