import { describe, it, expect } from "vitest";
import {
  getNicheOptionGroupPresets,
  getNicheModifierPlaceholders,
  getAllOptionGroupPresets,
  searchOptionGroupPresets,
  NICHE_LABELS,
  NICHE_OPTION_PRESETS,
} from "../niches/niche-presets";

describe("Niche Option Presets & Modifiers Engine", () => {
  it("provides tailored presets for all core and specialized business niches", () => {
    const niches = [
      "retail",
      "gastronomy",
      "tourism",
      "supermarket",
      "pharmacy",
      "pet",
      "tech_repair",
      "services",
      "automotive",
      "construction",
      "events",
      "education",
      "rental",
      "real_estate",
      "wholesale",
      "jobs",
      "legal",
    ];

    niches.forEach((nicheId) => {
      const presets = getNicheOptionGroupPresets(nicheId);
      expect(presets).toBeDefined();
      expect(presets.length).toBeGreaterThanOrEqual(2);
      expect(NICHE_LABELS[nicheId]).toBeDefined();

      presets.forEach((preset) => {
        expect(preset.id).toBeTruthy();
        expect(preset.name).toBeTruthy();
        expect(preset.data.display_name).toBeTruthy();
        expect(preset.data.internal_name).toBeTruthy();
        expect(preset.data.values.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  it("resolves niche aliases properly (vehicles -> automotive, healthcare -> pharmacy)", () => {
    const autoPresets = getNicheOptionGroupPresets("vehicles");
    expect(autoPresets.some((p) => p.id.startsWith("auto-"))).toBe(true);

    const pharmaPresets = getNicheOptionGroupPresets("healthcare");
    expect(pharmaPresets.some((p) => p.id.startsWith("pharmacy-"))).toBe(true);

    const genericPresets = getNicheOptionGroupPresets("generic");
    expect(genericPresets.some((p) => p.id.startsWith("retail-"))).toBe(true);
  });

  it("eradicates gastronomy smell in non-food niche placeholders", () => {
    const fashionPlaceholders = getNicheModifierPlaceholders("retail");
    expect(fashionPlaceholders.groupNamePlaceholder.toLowerCase()).not.toContain("carne");
    expect(fashionPlaceholders.groupNamePlaceholder.toLowerCase()).not.toContain("bacon");
    expect(fashionPlaceholders.optionLabelPlaceholder.toLowerCase()).toContain("tamanho");
    expect(fashionPlaceholders.optionDescPlaceholder.toLowerCase()).toContain("algodão");

    const tourismPlaceholders = getNicheModifierPlaceholders("tourism");
    expect(tourismPlaceholders.groupNamePlaceholder.toLowerCase()).toContain("regime");
    expect(tourismPlaceholders.optionLabelPlaceholder.toLowerCase()).toContain("café");

    const supermarketPlaceholders = getNicheModifierPlaceholders("supermarket");
    expect(supermarketPlaceholders.groupNamePlaceholder.toLowerCase()).toContain("corte");
    expect(supermarketPlaceholders.optionLabelPlaceholder.toLowerCase()).toContain("bife");

    const gastroPlaceholders = getNicheModifierPlaceholders("gastronomy");
    expect(gastroPlaceholders.groupNamePlaceholder.toLowerCase()).toContain("ponto da carne");
    expect(gastroPlaceholders.optionLabelPlaceholder.toLowerCase()).toContain("bacon");
  });

  it("lists all presets categorized with friendly vertical labels", () => {
    const all = getAllOptionGroupPresets();
    expect(all.length).toBeGreaterThanOrEqual(16);

    const retailCategory = all.find((c) => c.nicheId === "retail");
    expect(retailCategory).toBeDefined();
    expect(retailCategory?.nicheLabel).toBe("Varejo, Moda & Vestuário");
    expect(retailCategory?.presets.length).toBeGreaterThanOrEqual(3);
  });

  it("searches presets by query across name, description, and option items", () => {
    // Search across all niches
    const searchOil = searchOptionGroupPresets("óleo");
    expect(searchOil.length).toBeGreaterThanOrEqual(1);
    expect(searchOil.some((p) => p.id === "auto-oil-grade")).toBe(true);

    // Search for tourism transfers
    const searchTransfer = searchOptionGroupPresets("transfer", "tourism");
    expect(searchTransfer.length).toBeGreaterThanOrEqual(1);
    expect(searchTransfer.some((p) => p.id === "tourism-transfers")).toBe(true);

    // Search by niche filter restricts results
    const searchRetailInGastro = searchOptionGroupPresets("tamanho", "gastronomy");
    expect(searchRetailInGastro.length).toBe(0);

    const searchRetailInRetail = searchOptionGroupPresets("tamanho", "retail");
    expect(searchRetailInRetail.length).toBeGreaterThanOrEqual(1);
  });
});
