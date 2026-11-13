import { describe, expect, it } from "vitest";
import {
  buildSafeHtml2CanvasConfig,
  hasUnsupportedCssColorFunction,
  normalizeCssColorsForHtml2Canvas,
  oklabValuesToRgbString,
  sanitizeCloneStylesForHtml2Canvas,
} from "./html2canvas-safe";

describe("html2canvas-safe color & clone sanitizer", () => {
  it("detecta funções de cor modernas do Tailwind CSS v4", () => {
    expect(hasUnsupportedCssColorFunction("oklch(0.62 0.21 255)")).toBe(true);
    expect(hasUnsupportedCssColorFunction("color-mix(in oklab, #000 15%, transparent)")).toBe(true);
    expect(hasUnsupportedCssColorFunction("oklab(0.5 0.1 -0.1)")).toBe(true);
    expect(hasUnsupportedCssColorFunction("rgb(15, 23, 42)")).toBe(false);
  });

  it("converte OKLCH, OKLab e color-mix para RGB/RGBA sem erro de parser", () => {
    const primary = normalizeCssColorsForHtml2Canvas("oklch(0.62 0.21 255)");
    expect(primary).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
    expect(hasUnsupportedCssColorFunction(primary)).toBe(false);

    const withAlpha = normalizeCssColorsForHtml2Canvas("oklch(0.5 0.15 180 / 50%)");
    expect(withAlpha).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*0\.5\)$/);

    const gradient = normalizeCssColorsForHtml2Canvas(
      "linear-gradient(135deg, oklch(0.62 0.21 255), oklch(0.45 0.12 200 / 0.8))"
    );
    expect(gradient).toContain("linear-gradient(135deg, rgb(");
    expect(gradient).toContain("rgba(");
    expect(hasUnsupportedCssColorFunction(gradient)).toBe(false);

    const mixed = normalizeCssColorsForHtml2Canvas(
      "color-mix(in oklab, oklch(0.6 0.2 30) 20%, transparent)"
    );
    expect(mixed).toMatch(/^rgba?\(/);
    expect(hasUnsupportedCssColorFunction(mixed)).toBe(false);

    expect(oklabValuesToRgbString(1, 0, 0, 1)).toBe("rgb(255, 255, 255)");
    expect(oklabValuesToRgbString(0, 0, 0, 1)).toBe("rgb(0, 0, 0)");
  });

  it("impõe allowTaint: false e useCORS: true na configuração segura", () => {
    const fakeEl = { ownerDocument: null } as unknown as HTMLElement;
    const config = buildSafeHtml2CanvasConfig(fakeEl, { scale: 2 });
    expect(config.allowTaint).toBe(false);
    expect(config.useCORS).toBe(true);
    expect(config.scale).toBe(2);
    expect(typeof config.onclone).toBe("function");
  });

  it("sanitiza tags <style> no clone removendo oklch/oklab/color-mix", () => {
    const styleEl = {
      textContent: ":root { --primary: oklch(0.62 0.21 255); } .btn { background: color-mix(in oklab, white 20%, black); }",
    };
    const fakeDoc = {
      documentElement: null,
      body: null,
      defaultView: null,
      querySelectorAll: () => [styleEl],
    } as unknown as Document;
    const fakeCloneEl = {
      querySelectorAll: () => [],
      style: {},
    } as unknown as HTMLElement;

    sanitizeCloneStylesForHtml2Canvas(fakeDoc, fakeCloneEl);
    expect(hasUnsupportedCssColorFunction(styleEl.textContent)).toBe(false);
    expect(styleEl.textContent).toContain("--primary: rgb(");
  });
});
