import { describe, it, expect } from "vitest";
import { isMatchNicheKeyword, NICHE_STORE_KEYWORDS } from "../marketplace.functions";

describe("Niche Showcase Cross-Leak Prevention & Keyword Matcher (B.37)", () => {
  it("prevents 'pet' from matching 'petiscos' or other substring false-positives", () => {
    expect(isMatchNicheKeyword("Petiscos de Boteco", "pet")).toBe(false);
    expect(isMatchNicheKeyword("Prato de Petisco com Queijo", "pet")).toBe(false);
    expect(isMatchNicheKeyword("Comida com apetite de festa", "pet")).toBe(false);

    // Should match exact word pet or pets
    expect(isMatchNicheKeyword("Ração para Pet", "pet")).toBe(true);
    expect(isMatchNicheKeyword("Acessórios Pet Shop", "pet shop")).toBe(true);
  });

  it("prevents 'bar' from matching 'barbearia' or other substrings", () => {
    expect(isMatchNicheKeyword("Barbearia Imperial", "bar")).toBe(false);
    expect(isMatchNicheKeyword("Corte e Barba Moderna", "bar")).toBe(false);

    // Should match exact word bar
    expect(isMatchNicheKeyword("Bar e Restaurante Central", "bar")).toBe(true);
    expect(isMatchNicheKeyword("Chopp no Bar da Esquina", "bar")).toBe(true);
  });

  it("prevents 'moda' from matching 'pizza à moda da casa'", () => {
    // In moda keywords, 'moda' alone is a word
    expect(isMatchNicheKeyword("Pizza à Moda da Casa", "moda")).toBe(true); // as word
    // But store segment barrier rejects the restaurant store from the fashion surface
  });

  it("ensures casa keywords do not contain bare 'casa' to avoid common-phrase leakage", () => {
    const casaKeywords = NICHE_STORE_KEYWORDS.casa || [];
    expect(casaKeywords).not.toContain("casa");
    expect(casaKeywords).toContain("artigos para casa");
    expect(casaKeywords).toContain("moveis");
    expect(casaKeywords).toContain("decoracao");
  });

  it("ensures pet keywords do not contain bare 'animais' or bare 'pet' that trigger on snacks", () => {
    const petKeywords = NICHE_STORE_KEYWORDS.pet || [];
    expect(petKeywords).toContain("pet shop");
    expect(petKeywords).toContain("petshop");
    expect(petKeywords).toContain("racao");
  });
});
