import { describe, expect, it } from "vitest";
import { analyzeColorPaletteAndContext, inferProductCategoryFromText, normalizeHexPalette } from "./color-extractor";

describe("color-extractor", () => {
  it("returns no palette when no observed colors are present", () => {
    expect(normalizeHexPalette([])).toEqual([]);
    expect(normalizeHexPalette(["invalid", "#12"])).toEqual([]);
  });

  it("normalizes observed colors without adding defaults", () => {
    expect(normalizeHexPalette(["#abc", "#ABC", "112233"])).toEqual(["#AABBCC", "#112233"]);
  });

  it("does not invent a category when input lacks a known signal", () => {
    expect(inferProductCategoryFromText("")).toBeNull();
    expect(inferProductCategoryFromText("Empresa X")).toBeNull();
  });

  it("returns null for color metrics that cannot be computed from missing observations", () => {
    expect(analyzeColorPaletteAndContext([], "")).toEqual({
      palette: [],
      dominantColor: null,
      inferredCategory: null,
      contrastRatioWithWhite: null,
    });
  });
});
