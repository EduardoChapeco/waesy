import { describe, expect, it } from "vitest";
import {
  BRAND_COLOR_PRESETS,
  CANVAS_BG_PRESETS,
  TEMPLATE_DEFAULT_PALETTES,
  getContrastRatio,
  resolveProposalCanvasTheme,
} from "./proposal-theme-palettes";

describe("proposal-theme-palettes & canvas theme engine", () => {
  it("garante fundo sólido não-transparente e contraste WCAG AA (>= 4.5:1) nos 6 templates padrão", () => {
    const templateIds = [
      "editorial-flat",
      "dark-premium",
      "executivo-b2b",
      "landscape-presentation",
      "vertical-premium",
      "group-catalog",
    ];

    for (const id of templateIds) {
      const theme = resolveProposalCanvasTheme({ templateId: id });
      expect(theme.canvasBg).toMatch(/^#[0-9A-F]{6}$/i);
      expect(theme.cardBg).toMatch(/^#[0-9A-F]{6}$/i);
      expect(theme.brandColor).toMatch(/^#[0-9A-F]{6}$/i);

      const canvasContrast = getContrastRatio(theme.ink, theme.canvasBg);
      const cardContrast = getContrastRatio(theme.ink, theme.cardBg);
      const brandFgContrast = getContrastRatio(theme.brandFg, theme.brandColor);

      expect(canvasContrast).toBeGreaterThanOrEqual(4.5);
      expect(cardContrast).toBeGreaterThanOrEqual(4.5);
      expect(brandFgContrast).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("permite editar a cor de fundo do canvas (clara ou escura) e recalcula superfícies e contraste automaticamente", () => {
    for (const preset of CANVAS_BG_PRESETS) {
      const theme = resolveProposalCanvasTheme({
        templateId: "editorial-flat",
        customFields: { canvas_bg_color: preset.color },
      });

      expect(theme.canvasBg.toUpperCase()).toBe(preset.color.toUpperCase());
      expect(theme.tone).toBe(preset.tone);
      expect(getContrastRatio(theme.ink, theme.canvasBg)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(theme.ink, theme.cardBg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("permite editar a cor de destaque da marca e garante contraste legível no texto sobre a cor da marca", () => {
    for (const preset of BRAND_COLOR_PRESETS) {
      const theme = resolveProposalCanvasTheme({
        templateId: "dark-premium",
        customFields: { canvas_brand_color: preset.color },
      });

      expect(theme.brandColor.toUpperCase()).toBe(preset.color.toUpperCase());
      expect(getContrastRatio(theme.brandFg, theme.brandColor)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("processa preset tipográfico e visibilidade de seções (hidden_sections) em tempo real", () => {
    const theme = resolveProposalCanvasTheme({
      templateId: "executivo-b2b",
      customFields: {
        canvas_font_preset: "classic",
        hidden_sections: "flights, transfers , conditions",
      },
    });

    expect(theme.fontPreset).toBe("corporate");
    expect(theme.hiddenSections.has("flights")).toBe(true);
    expect(theme.hiddenSections.has("transfers")).toBe(true);
    expect(theme.hiddenSections.has("conditions")).toBe(true);
    expect(theme.hiddenSections.has("hotels")).toBe(false);
    expect(theme.cssVars["--p-canvas-bg"]).toBe(TEMPLATE_DEFAULT_PALETTES["executivo-b2b"].canvasBg);
  });
});
