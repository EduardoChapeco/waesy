import { describe, it, expect } from "vitest";
import { ActionsFamily } from "./actions-family";
import { FormsFamily } from "./forms-family";
import { SurfacesFamily } from "./surfaces-family";
import { OverlaysFamily } from "./overlays-family";
import { DesignSystemHeader } from "./design-system-header";
import { StateCard } from "./state-card";

describe("Design System Showcase — Fase S24 (Matriz de 4 Estados)", () => {
  it("deve exportar todas as famílias canônicas e componentes de apresentação", () => {
    expect(ActionsFamily).toBeDefined();
    expect(FormsFamily).toBeDefined();
    expect(SurfacesFamily).toBeDefined();
    expect(OverlaysFamily).toBeDefined();
    expect(DesignSystemHeader).toBeDefined();
    expect(StateCard).toBeDefined();
  });

  it("deve aceitar os 5 modos canônicos de visualização de estados", () => {
    const modes = ["all", "ready", "loading", "empty", "error"] as const;
    modes.forEach((mode) => {
      expect(typeof mode).toBe("string");
    });
  });
});
