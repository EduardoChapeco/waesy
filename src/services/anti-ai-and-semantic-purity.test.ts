import { describe, it, expect } from "vitest";
import { getSidebarConfig } from "@/lib/workspace-navigation";

describe("Anti-AI Design, Semantic Purity & Complete Navigation Audit", () => {
  it("1. Deve assegurar que todos os itens de navegação utilizam títulos atômicos e concisos (sem jargão ou títulos compostos)", () => {
    const forbiddenPrefixes = [
      "Painel de ",
      "Painel Executivo",
      "Gestão de ",
      "Central de ",
      "Módulo de ",
      "Administração de ",
      "Controle de ",
    ];

    const groups = getSidebarConfig("retail", { userRole: "owner" });

    for (const group of groups) {
      expect(forbiddenPrefixes.some((p) => group.label.startsWith(p))).toBe(false);

      for (const item of group.items) {
        expect(forbiddenPrefixes.some((p) => item.label.startsWith(p))).toBe(false);
      }
    }
  });

  it("2. Deve conter rotas críticas mapeadas no catálogo de navegação (Zero Orphan Routes)", () => {
    const groups = getSidebarConfig("retail", { userRole: "owner" });
    const allPaths = groups.flatMap((g) => g.items.map((i) => i.path));

    // Rotas de produtos e catálogo
    expect(allPaths).toContain("/workspace/catalogo/produtos");
    expect(allPaths).toContain("/workspace/catalogo/tipos");

    // Rotas de CMS e Vitrine
    expect(allPaths).toContain("/workspace/cms/stories");
    expect(allPaths).toContain("/workspace/cms/avaliacoes");
    expect(allPaths).toContain("/workspace/cms/navegacao");

    // Rotas de Marketing
    expect(allPaths).toContain("/workspace/marketing/afiliados");
    expect(allPaths).toContain("/workspace/marketing/patrocinadores");

    // Rotas de Pedidos, Caixa e Estoque
    expect(allPaths).toContain("/workspace/pedidos");
    expect(allPaths).toContain("/workspace/estoque");
    expect(allPaths).toContain("/workspace/financeiro/caixa");
  });

  it("3. Deve validar isolamento semântico: grupos especializados não devem vazar para o varejo comum", () => {
    const retailGroups = getSidebarConfig("retail", { userRole: "owner" });
    const retailGroupIds = retailGroups.map((g) => g.id);

    // Não deve exibir rotas jurídicas exclusivas ou de turismo especializado no varejo simples
    expect(retailGroupIds).not.toContain("jus");
    expect(retailGroupIds).not.toContain("tourism");
  });
});
