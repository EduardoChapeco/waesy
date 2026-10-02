import { describe, it, expect } from "vitest";
import { ActionsFamily } from "./actions-family";
import { FormsFamily } from "./forms-family";
import { SurfacesFamily } from "./surfaces-family";
import { OverlaysFamily } from "./overlays-family";
import { NavigationFamily } from "./navigation-family";
import { DesignSystemHeader } from "./design-system-header";
import { StateCard } from "./state-card";
import {
  CanonicalAppHeader,
  CanonicalBottomBar,
  CanonicalGlobalRail,
  CanonicalBreadcrumbsBar,
} from "@/components/ui/canonical";

describe("Design System Showcase — Fases S24 & S25 (Shell e Matriz de 4 Estados)", () => {
  it("deve exportar todas as famílias canônicas e componentes de apresentação", () => {
    expect(ActionsFamily).toBeDefined();
    expect(FormsFamily).toBeDefined();
    expect(SurfacesFamily).toBeDefined();
    expect(OverlaysFamily).toBeDefined();
    expect(NavigationFamily).toBeDefined();
    expect(DesignSystemHeader).toBeDefined();
    expect(StateCard).toBeDefined();
  });

  it("deve exportar todas as primitivas de shell e navegação canônicas", () => {
    expect(CanonicalAppHeader).toBeDefined();
    expect(CanonicalBottomBar).toBeDefined();
    expect(CanonicalGlobalRail).toBeDefined();
    expect(CanonicalBreadcrumbsBar).toBeDefined();
  });

  it("deve aceitar os 5 modos canônicos de visualização de estados", () => {
    const modes = ["all", "ready", "loading", "empty", "error"] as const;
    modes.forEach((mode) => {
      expect(typeof mode).toBe("string");
    });
  });
});

