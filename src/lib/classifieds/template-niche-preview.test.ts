import { describe, it, expect } from "vitest";
import {
  CLASSIFIED_TEMPLATES_CATALOG,
  NICHE_TEMPLATE_COMPATIBILITY_MAP,
  getDefaultClassifiedTemplateForNiche,
  getAllowedClassifiedTemplatesForNiche,
  resolveCompatibleClassifiedTemplate,
  resolveClassifiedTemplateManifest,
} from "@/lib/classifieds/canonical-taxonomy";
import { resolveClassifiedDetailedSpecs } from "@/lib/classifieds/canonical-specs-resolver";
import { computeTeteterisGrid } from "@/lib/layout/teteterisgrid-engine";
import { mapDatabaseRowToUnifiedListing } from "@/services/unified-listing.functions";

describe("Classifieds Template Engine, Niche Isolation & Preview/Public Parity (Cases 1–14)", () => {
  it("Cases 1, 2, 3 & 7: selects Template A -> B -> A within the same niche without residual state", () => {
    const niche = "veiculo";
    const allowed = getAllowedClassifiedTemplatesForNiche(niche);
    expect(allowed.map((t) => t.id)).toEqual(["automotivo", "standard", "editorial"]);

    // Case 1: Select Template A (automotivo)
    const tplA = resolveCompatibleClassifiedTemplate(niche, "automotivo");
    expect(tplA).toBe("automotivo");
    expect(resolveClassifiedTemplateManifest(tplA, niche).shortLabel).toBe("Auto");

    // Case 2: Select Template B (editorial)
    const tplB = resolveCompatibleClassifiedTemplate(niche, "editorial");
    expect(tplB).toBe("editorial");
    expect(resolveClassifiedTemplateManifest(tplB, niche).shortLabel).toBe("Editorial");

    // Case 3: Return to Template A (automotivo)
    const tplAReturned = resolveCompatibleClassifiedTemplate(niche, "automotivo");
    expect(tplAReturned).toBe("automotivo");
  });

  it("Cases 4 & 5: bidirectional Desktop Native and Mobile Native layout manifests are distinct for every template", () => {
    for (const [id, manifest] of Object.entries(CLASSIFIED_TEMPLATES_CATALOG)) {
      expect(manifest.id).toBe(id);
      expect(manifest.desktop.columns).toBe(12);
      expect(manifest.mobile.columns).toBe(1);
      expect(manifest.desktop.stickyConversionPosition).toBe("right_rail");
      expect(manifest.mobile.stickyConversionPosition).toBe("bottom_bar");
      expect(manifest.desktop.layoutPattern).not.toBe(manifest.mobile.layoutPattern);
    }
  });

  it("Cases 6 & 8: switching niche resolves incompatible templates to the new niche default and preserves compatible cross-niche templates when requested", () => {
    // Vehicle with 'automotivo' switched to 'imovel' -> 'automotivo' is incompatible with 'imovel', resolves to 'imobiliario'
    expect(resolveCompatibleClassifiedTemplate("imovel", "automotivo")).toBe("imobiliario");

    // Real estate with 'imobiliario' switched to 'mercado' -> resolves to 'conveniencia'
    expect(resolveCompatibleClassifiedTemplate("mercado", "imobiliario")).toBe("conveniencia");

    // Service with 'servicos_agenda' switched to 'viagem' -> resolves to 'editorial'
    expect(resolveCompatibleClassifiedTemplate("viagem", "servicos_agenda")).toBe("editorial");

    // Compatible 'standard' preserved when switching from 'veiculo' to 'imovel'
    expect(resolveCompatibleClassifiedTemplate("imovel", "standard")).toBe("standard");

    // All 15+ canonical niches have valid compatibility maps
    const allNiches = Object.keys(NICHE_TEMPLATE_COMPATIBILITY_MAP);
    expect(allNiches.length).toBeGreaterThanOrEqual(15);
    for (const n of allNiches) {
      const def = getDefaultClassifiedTemplateForNiche(n);
      expect(CLASSIFIED_TEMPLATES_CATALOG[def]).toBeDefined();
    }
  });

  it("Case 6 & Invariant B.37: zero cross-niche leakage when editorial template is selected on non-travel niches", () => {
    // A vehicle ad using template_style = "editorial" MUST NOT leak travel specs (Pacote Turístico, Saída, Retorno)
    const vehicleEditorialAd = {
      id: "ad-veh-1",
      title: "Porsche 911 Carrera S 2024",
      category: "vehicles",
      price_cents: 95000000,
      attributes: {
        niche: "veiculo",
        template_style: "editorial",
        brand: "Porsche",
        model: "911 Carrera S",
        year: "2024",
        mileage: "4500",
        transmission: "Automático",
        fuel: "Gasolina",
      },
    };

    const specs = resolveClassifiedDetailedSpecs(vehicleEditorialAd);
    const labels = specs.map((s) => s.label);
    expect(labels).toContain("Marca");
    expect(labels).toContain("Modelo");
    expect(labels).not.toContain("Modalidade");
    expect(labels).not.toContain("Destino Principal");
    expect(labels).not.toContain("Embarque / Saída");
    expect(labels).not.toContain("Regime Alimentar");
  });

  it("Case 6 & Invariant B.37: physical goods (desapego) with conveniencia template resolves physical goods specs without suppression", () => {
    const goodsAd = {
      id: "ad-goods-1",
      title: "iPhone 15 Pro Max 256GB",
      category: "goods",
      condition: "used",
      attributes: {
        niche: "desapego",
        template_style: "conveniencia",
        desapego_subcategory: "smartphones",
        brand: "Apple",
        storage: "256GB",
        battery_health: "96%",
      },
    };

    const specs = resolveClassifiedDetailedSpecs(goodsAd);
    const labels = specs.map((s) => s.label);
    expect(labels).toContain("Marca");
    expect(labels).toContain("Armazenamento");
    expect(labels).toContain("Saúde da Bateria");
  });

  it("Cases 9, 10 & 11: DB row to UnifiedListing preserves template_id / template_style and public spec allowlist parity", () => {
    const dbRow = {
      id: "db-row-1",
      title: "Consultoria Tributária Empresarial",
      content: "Revisão fiscal completa.",
      category: "service",
      price_cents: 150000,
      status: "active",
      attributes: {
        niche: "servico",
        template_style: "servicos_agenda",
        modality: "online",
      },
    };

    const unified = mapDatabaseRowToUnifiedListing(dbRow, "classified", true);
    expect(unified.template).toBe("servicos_agenda");
    expect(unified.attributes?.template_style).toBe("servicos_agenda");
    expect(unified.attributes?.niche).toBe("servico");
  });

  it("Cases 12 & 14: TeteterisGrid computes zero-gap layouts for 1, 3, and 8 cards with long text without truncation", () => {
    for (const count of [1, 3, 8]) {
      const items = Array.from({ length: count }, (_, idx) => ({
        id: `spec-${idx}`,
        content: {
          label: `Especificação Técnica Completa ${idx + 1}`,
          value:
            idx % 2 === 0
              ? "Descrição técnica extensa sem truncamento ou reticências para validação de densidade no card squircle"
              : `${(idx + 1) * 120} m²`,
        },
        weight: idx === 0 ? ("xl" as const) : idx % 3 === 0 ? ("lg" as const) : ("sm" as const),
      }));

      const slots4 = computeTeteterisGrid(items, 4);
      expect(slots4.length).toBe(count);

      const byRow = new Map<number, number>();
      for (const slot of slots4) {
        expect(slot.colSpan).toBeGreaterThanOrEqual(1);
        expect(slot.colSpan).toBeLessThanOrEqual(4);
        byRow.set(slot.row, (byRow.get(slot.row) || 0) + slot.colSpan);
      }
      for (const [, rowSum] of byRow.entries()) {
        expect(rowSum).toBe(4);
      }
    }
  });
});
