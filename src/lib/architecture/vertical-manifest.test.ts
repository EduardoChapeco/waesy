import { describe, it, expect } from "vitest";
import {
  CANONICAL_VERTICAL_MANIFESTS,
  getVerticalManifest,
  validateVerticalBoundaries,
} from "./vertical-manifest";

describe("Plano 5 — Fase S10: Manifesto Canônico de Verticais", () => {
  it("1. Deve conter exatamente as 7 verticais de negócio canônicas homologadas", () => {
    const keys = Object.keys(CANONICAL_VERTICAL_MANIFESTS);
    expect(keys).toHaveLength(7);
    expect(keys).toContain("tourism");
    expect(keys).toContain("retail");
    expect(keys).toContain("market_perishables");
    expect(keys).toContain("services_specialists");
    expect(keys).toContain("real_estate");
    expect(keys).toContain("automotive");
    expect(keys).toContain("digital_products");
  });

  it("2. Cada vertical deve declarar documento legal, órgão regulador e conformidade tributária", () => {
    for (const [id, manifest] of Object.entries(CANONICAL_VERTICAL_MANIFESTS)) {
      expect(manifest.id).toBe(id);
      expect(manifest.name.length).toBeGreaterThan(3);
      expect(manifest.regulatoryBody.length).toBeGreaterThan(3);
      expect(manifest.legalDocument.length).toBeGreaterThan(3);
      expect(manifest.enabledArchetypes.length).toBeGreaterThan(0);
      expect(manifest.enabledArchetypes).toContain(manifest.defaultArchetype);
      expect(manifest.taxRegimeCompliance.lawBasis.length).toBeGreaterThan(5);
      expect(manifest.securityInvariants.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("3. getVerticalManifest deve recuperar manifestos com sucesso e rejeitar desconhecidos", () => {
    const tourism = getVerticalManifest("tourism");
    expect(tourism.name).toBe("Turismo & Viagens");
    expect(tourism.legalDocument).toContain("Embratur");

    expect(() => getVerticalManifest("crypto_casino")).toThrow(/Vertical não reconhecida/);
  });

  it("4. validateVerticalBoundaries deve comprovar cobertura total sem orfandades", () => {
    const report = validateVerticalBoundaries();
    expect(report.isValid).toBe(true);
    expect(report.totalVerticals).toBe(7);

    // Todos os 15 arquétipos (A01 a A15) devem estar cobertos por ao menos uma vertical
    for (let i = 1; i <= 15; i++) {
      const arcId = `A${String(i).padStart(2, "0")}`;
      expect(
        report.archetypeCoverage[arcId],
        `Arquétipo ${arcId} deve ter ao menos uma vertical proprietária`
      ).toBeDefined();
      expect(report.archetypeCoverage[arcId].length).toBeGreaterThan(0);
    }

    // Tabelas essenciais devem estar atribuídas a verticais
    expect(report.tableCoverage["travel_packages"]).toBe("tourism");
    expect(report.tableCoverage["products"]).toBe("retail");
    expect(report.tableCoverage["pos_orders"]).toBe("market_perishables");
    expect(report.tableCoverage["service_orders"]).toBe("services_specialists");
    expect(report.tableCoverage["rental_contracts"]).toBe("real_estate");
    expect(report.tableCoverage["vehicle_inventory"]).toBe("automotive");
    expect(report.tableCoverage["digital_licenses"]).toBe("digital_products");
  });
});
