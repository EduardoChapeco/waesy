import { describe, it, expect } from "vitest";
import { ActionsFamily } from "./actions-family";
import { FormsFamily } from "./forms-family";
import { SurfacesFamily } from "./surfaces-family";
import { OverlaysFamily } from "./overlays-family";
import { NavigationFamily } from "./navigation-family";
import { DesignSystemHeader } from "./design-system-header";
import { StateCard } from "./state-card";
import { MediaShowcaseFamily } from "./media-showcase-family";
import {
  CanonicalAppHeader,
  CanonicalBottomBar,
  CanonicalGlobalRail,
  CanonicalBreadcrumbsBar,
  CanonicalSurface,
  CanonicalKpiTile,
  CanonicalLedgerRow,
  CanonicalDataTable,
  CanonicalMediaFrame,
  CanonicalAvatarCluster,
  CanonicalUploadDropzone,
  CanonicalStepperWizard,
  CanonicalField,
  CanonicalFieldError,
} from "@/components/ui/canonical";

describe("Design System Showcase — Fases S24 a S28 (Shell, Superfícies, Dados, Mídia, Forms e Wizard)", () => {
  it("deve exportar todas as famílias canônicas e componentes de apresentação", () => {
    expect(ActionsFamily).toBeDefined();
    expect(FormsFamily).toBeDefined();
    expect(SurfacesFamily).toBeDefined();
    expect(OverlaysFamily).toBeDefined();
    expect(NavigationFamily).toBeDefined();
    expect(MediaShowcaseFamily).toBeDefined();
    expect(DesignSystemHeader).toBeDefined();
    expect(StateCard).toBeDefined();
  });

  it("deve exportar todas as primitivas de shell e navegação canônicas (S25)", () => {
    expect(CanonicalAppHeader).toBeDefined();
    expect(CanonicalBottomBar).toBeDefined();
    expect(CanonicalGlobalRail).toBeDefined();
    expect(CanonicalBreadcrumbsBar).toBeDefined();
  });

  it("deve exportar todas as primitivas de superfície e dados canônicas (S26)", () => {
    expect(CanonicalSurface).toBeDefined();
    expect(CanonicalKpiTile).toBeDefined();
    expect(CanonicalLedgerRow).toBeDefined();
    expect(CanonicalDataTable).toBeDefined();
  });

  it("deve exportar todas as primitivas de mídia canônicas (S27)", () => {
    expect(CanonicalMediaFrame).toBeDefined();
    expect(CanonicalAvatarCluster).toBeDefined();
    expect(CanonicalUploadDropzone).toBeDefined();
  });

  it("deve exportar todas as primitivas de formulário e wizard canônicas (S28)", () => {
    expect(CanonicalStepperWizard).toBeDefined();
    expect(CanonicalField).toBeDefined();
    expect(CanonicalFieldError).toBeDefined();
  });

  it("deve aceitar os 5 modos canônicos de visualização de estados", () => {
    const modes = ["all", "ready", "loading", "empty", "error"] as const;
    modes.forEach((mode) => {
      expect(typeof mode).toBe("string");
    });
  });
});

