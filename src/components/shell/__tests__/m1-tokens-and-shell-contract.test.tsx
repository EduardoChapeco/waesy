import fs from "fs";
import path from "path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: any) => React.createElement("a", props, children),
  useLocation: () => ({ pathname: "/" }),
  useRouter: () => ({
    navigate: vi.fn(),
    invalidate: vi.fn(),
    history: { back: vi.fn() },
  }),
}));

vi.mock("@/components/location/location-master-pill", () => ({
  LocationMasterPill: ({ className }: { className?: string }) =>
    React.createElement("div", { "data-testid": "location-pill", className }, "São Miguel do Oeste"),
}));

vi.mock("@/components/shell/utility-cluster", () => ({
  UtilityCluster: () => React.createElement("div", { "data-testid": "utility-cluster" }),
}));

import { Input } from "@/components/ui/input";
import { TopBar } from "@/components/shell/top-bar";

describe("M1 Contract — Tokens V4.1, Tipografia Inter, Primitivos & Shell Silencioso", () => {
  it("tokens.json não possui chaves vazias em component.squircleCard (usa $value W3C DTCG válido)", () => {
    const raw = fs.readFileSync(path.resolve("docs/design/tokens.json"), "utf8");
    const parsed = JSON.parse(raw);
    const squircle = parsed?.component?.squircleCard;
    expect(squircle).toBeDefined();
    for (const [, entry] of Object.entries<any>(squircle)) {
      expect(Object.prototype.hasOwnProperty.call(entry, "")).toBe(false);
      expect(typeof entry?.$value).toBe("string");
      expect(entry.$value.length).toBeGreaterThan(0);
    }
  });

  it("src/styles.css não fixa width: 460px fora de @media (min-width: 840px) em .waesy-proposal-editor-pane", () => {
    const css = fs.readFileSync(path.resolve("src/styles.css"), "utf8");
    const mobileBlockMatch = css.slice(0, css.indexOf("@media (min-width: 840px)"));
    expect(mobileBlockMatch).not.toMatch(/\.waesy-proposal-editor-pane\s*\{[^}]*width:\s*460px/);
  });

  it("<Input /> usa superfície bg-background com borda border-input, text-base anti-zoom e h-11 min-h-11", () => {
    const html = renderToStaticMarkup(<Input placeholder="Digite seu nome" />);
    expect(html).toContain("bg-background");
    expect(html).not.toContain("bg-input");
    expect(html).toContain("border-input");
    expect(html).toContain("text-base");
    expect(html).toContain("h-11");
    expect(html).toContain("min-h-11");
  });

  it("<TopBar /> renderiza cabeçalho silencioso sem badge BETA e sem font-black", () => {
    const html = renderToStaticMarkup(<TopBar session={null} brandSettings={null} />);
    expect(html).not.toContain(">BETA<");
    expect(html).not.toContain("font-black");
    expect(html).toContain("font-semibold");
    expect(html).toContain("size-11");
  });

  it("UtilityCluster, SuperAppModuleDrawer, PortalCompleto e DS4Showcase removem ruído/código morto/no-op", () => {
    const utilitySrc = fs.readFileSync(path.resolve("src/components/shell/utility-cluster.tsx"), "utf8");
    const drawerSrc = fs.readFileSync(path.resolve("src/components/shell/SuperAppModuleDrawer.tsx"), "utf8");
    const portalSrc = fs.readFileSync(path.resolve("src/routes/admin-master.portal-completo.tsx"), "utf8");
    const showcaseSrc = fs.readFileSync(path.resolve("src/components/design-system/ds4-showcase.tsx"), "utf8");

    const vitrineDrawerSrc = fs.readFileSync(
      path.resolve("src/design-system/vitrine/vitrine-lateral-sheet.tsx"),
      "utf8",
    );
    const hotpageFnSrc = fs.readFileSync(path.resolve("src/services/hotpage.functions.ts"), "utf8");

    expect(utilitySrc).not.toContain("ThemeToggle");
    expect(utilitySrc).not.toContain("font-black");
    expect(drawerSrc).toContain("showViewModeToggle={false}");
    expect(drawerSrc).toContain("toast.error");
    expect(drawerSrc).not.toMatch(/useState<HotpageDTO\[\]>\(\s*CANONICAL_DRAWER_MODULES/);
    expect(vitrineDrawerSrc).not.toContain("font-black");
    expect(vitrineDrawerSrc).not.toContain("shadow-2xs");
    expect(hotpageFnSrc).toMatch(/listDrawerModules[\s\S]*if\s*\(error\)\s*\{[\s\S]*throw new Error/);
    expect(portalSrc).not.toContain("BETA MANAGEMENT");
    expect(showcaseSrc).not.toMatch(/onClick=\{\(\)\s*=>\s*\{\s*\}\}/);
  });
});
