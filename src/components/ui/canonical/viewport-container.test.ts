import { describe, it, expect } from "vitest";
import {
  CANONICAL_VIEWPORTS,
  CANONICAL_VIEWPORT_LIST,
  AdaptiveViewportContainer,
  CanonicalBentoGrid,
  CanonicalBentoItem,
  CanonicalHooberThumbZone,
} from "./viewport-container";

describe("Canonical Viewport Primitives (Fase S31 / Nativização 5 Viewports)", () => {
  it("deve definir com exatidão os 5 viewports canônicos normativos", () => {
    expect(CANONICAL_VIEWPORTS.mobileSmall).toBe(320);
    expect(CANONICAL_VIEWPORTS.mobileModern).toBe(390);
    expect(CANONICAL_VIEWPORTS.tablet).toBe(768);
    expect(CANONICAL_VIEWPORTS.desktop).toBe(1280);
    expect(CANONICAL_VIEWPORTS.ultraWide).toBe(1920);
  });

  it("deve listar os 5 viewports com metadados e categorização estrita", () => {
    expect(CANONICAL_VIEWPORT_LIST).toHaveLength(5);
    const compacts = CANONICAL_VIEWPORT_LIST.filter((v) => v.category === "compact");
    const mediums = CANONICAL_VIEWPORT_LIST.filter((v) => v.category === "medium");
    const expandeds = CANONICAL_VIEWPORT_LIST.filter((v) => v.category === "expanded");

    expect(compacts).toHaveLength(2);
    expect(mediums).toHaveLength(1);
    expect(expandeds).toHaveLength(2);
  });

  it("deve exportar componentes de layout adaptativo canônico", () => {
    expect(AdaptiveViewportContainer).toBeDefined();
    expect(CanonicalBentoGrid).toBeDefined();
    expect(CanonicalBentoItem).toBeDefined();
    expect(CanonicalHooberThumbZone).toBeDefined();
  });
});
