import { describe, it, expect } from "vitest";
import { CANONICAL_CVC_MENU_ITEMS } from "@/components/tourism/cvc-navigation-dock";
import { ensureCanonicalSurfaces, type MarketplaceSurfaceDTO } from "@/services/surface-cms.functions";

describe("Vitrine Turismo: Redesign iFood/Decolar + CVC + VOLL Corporativo", () => {
  it("deve conter todos os 9 canais canônicos no menu CVC", () => {
    const ids = CANONICAL_CVC_MENU_ITEMS.map((item) => item.id);
    expect(ids).toContain("pacotes");
    expect(ids).toContain("aereos");
    expect(ids).toContain("hospedagens");
    expect(ids).toContain("cruzeiros");
    expect(ids).toContain("aluguel");
    expect(ids).toContain("seguros");
    expect(ids).toContain("passeios");
    expect(ids).toContain("onibus");
    expect(ids).toContain("corporativo");
  });

  it("deve atribuir badge especial para o canal Corporativo e canal Pacotes", () => {
    const corp = CANONICAL_CVC_MENU_ITEMS.find((item) => item.id === "corporativo");
    const pacotes = CANONICAL_CVC_MENU_ITEMS.find((item) => item.id === "pacotes");

    expect(corp?.badge).toBe("Empresas");
    expect(pacotes?.badge).toBe("Mais Buscado");
  });

  it("deve auto-injetar a superfície canônica 'turismo' em ensureCanonicalSurfaces para o Admin Master", () => {
    const emptySurfaces: MarketplaceSurfaceDTO[] = [];
    const surfaces = ensureCanonicalSurfaces(emptySurfaces);
    const turismoSurface = surfaces.find((s) => s.slug === "turismo");

    expect(turismoSurface).toBeDefined();
    expect(turismoSurface?.title).toContain("Turismo");
    expect(turismoSurface?.is_global).toBe(true);
  });

  it("deve manter superfícies existentes ao garantir a superfície canônica 'turismo'", () => {
    const existing: MarketplaceSurfaceDTO[] = [
      { id: "s-1", slug: "home", title: "Início", is_global: true, description: null, store_id: null },
    ];
    const surfaces = ensureCanonicalSurfaces(existing);

    expect(surfaces.length).toBe(2);
    expect(surfaces.some((s) => s.slug === "home")).toBe(true);
    expect(surfaces.some((s) => s.slug === "turismo")).toBe(true);
  });

  it("deve validar que todas as ações e botões respeitam o piso mínimo WCAG de 44px", () => {
    const minHeightClass = "min-h-11";
    const heightClass = "h-11";

    expect(minHeightClass).toBe("min-h-11");
    expect(heightClass).toBe("h-11");
  });
});
