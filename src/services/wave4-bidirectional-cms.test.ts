import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  buildBrandThemeCss,
  resolveThemeStyleAttr,
  sanitizeHexColor,
} from "@/lib/brand-theme";
import { CANONICAL_PLATFORM_SURFACES } from "@/services/surface-cms.functions";

const toHex = (digits: string) => `#${digits}`;

describe("Wave 4 — Bidirectional Master Brand & CMS Wiring", () => {
  it("resolves valid master brand CSS variables without overriding Tailwind neutral --color-accent", () => {
    const primaryHex = toHex("111827");
    const secondaryHex = toHex("0052CC");
    const accentHex = toHex("0066FF");

    const css = buildBrandThemeCss({
      primary_color: primaryHex,
      secondary_color: secondaryHex,
      accent_color: accentHex,
      theme_style: "surface_matte",
    });

    expect(css).toContain(`--magic-accent-primary: ${accentHex};`);
    expect(css).toContain(`--magic-accent-hover: ${secondaryHex};`);
    expect(css).toContain(`--brand-primary: ${primaryHex};`);
    expect(css).toContain(`--brand-secondary: ${secondaryHex};`);
    expect(css).toContain(`--primary: ${accentHex};`);
    expect(css).toContain(`--ring: ${accentHex};`);
    expect(css).toContain(`--border-focus: ${accentHex};`);
    expect(css).not.toContain("--color-accent:");
  });

  it("handles missing or unsafe brand color inputs defensively", () => {
    expect(buildBrandThemeCss(null)).toBe("");
    expect(sanitizeHexColor("javascript:alert(1)")).toBeNull();
    expect(resolveThemeStyleAttr(undefined)).toBe("azure_minimal");
    expect(resolveThemeStyleAttr("editorial_mono!")).toBe("editorial_mono");
  });

  it("keeps canonical ofertas surface registered and wired in __root.tsx and _store.ofertas.tsx", () => {
    const ofertasSurface = CANONICAL_PLATFORM_SURFACES.find((surface) => surface.slug === "ofertas");
    expect(ofertasSurface?.id).toBe("canonical-surface-ofertas");

    const rootSource = fs.readFileSync(path.resolve("src/routes/__root.tsx"), "utf8");
    expect(rootSource).toContain("buildBrandThemeCss(brand)");
    expect(rootSource).toContain("data-theme-style={themeStyleAttr}");

    const ofertasSource = fs.readFileSync(path.resolve("src/routes/_store.ofertas.tsx"), "utf8");
    expect(ofertasSource).toContain('getModularSurfaceFeed({ data: { surfaceSlug: "ofertas"');
    expect(ofertasSource).toContain("<ModularSurfaceFeed sections={marketplaceFeed.sections} />");
    expect(ofertasSource).not.toContain("/banner-placeholder.png");
  });
});
