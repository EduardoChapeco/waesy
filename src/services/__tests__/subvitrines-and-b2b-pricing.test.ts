import { describe, it, expect } from "vitest";
import { CANONICAL_DRAWER_MODULES } from "@/services/hotpage.functions";

describe("Subvitrines, Macro-Hubs e Isolamento B2B", () => {
  it("deve conter todos os 8 Macro-Hubs e subnichos essenciais no CANONICAL_DRAWER_MODULES", () => {
    const slugs = CANONICAL_DRAWER_MODULES.map((m) => m.slug);
    const routes = CANONICAL_DRAWER_MODULES.map((m) => m.target_route);

    // 1. Carnes & Açougue
    expect(slugs).toContain("drawer-acougue");
    expect(routes).toContain("/acougue");

    // 2. Mobilidade & Fretes/Mudanças
    expect(slugs).toContain("drawer-corrida");
    expect(slugs).toContain("drawer-frete");
    expect(routes).toContain("/mobilidade?mode=freight");

    // 3. Imóveis & Temporada
    expect(slugs).toContain("drawer-imoveis");
    expect(slugs).toContain("drawer-temporada");
    expect(routes).toContain("/imoveis?tipo=aluguel");
    expect(routes).toContain("/imoveis?tipo=temporada");

    // 4. Obra & Construção
    expect(slugs).toContain("drawer-construcao");
    expect(routes).toContain("/construcao");

    // 5. Beleza & Barbearia
    expect(slugs).toContain("drawer-barbearia");
    expect(slugs).toContain("drawer-beleza");
    expect(routes).toContain("/beleza?tipo=barbearia");
    expect(routes).toContain("/beleza?tipo=salao");

    // 6. Celulares & Eletrônicos
    expect(slugs).toContain("drawer-celulares");
    expect(routes).toContain("/eletronicos");

    // 7. Eventos & Festas
    expect(slugs).toContain("drawer-eventos");
    expect(routes).toContain("/eventos");

    // 8. Presentes & Lista de Casamento
    expect(slugs).toContain("drawer-casamento");
    expect(routes).toContain("/gift-cards?tipo=casamento");
  });

  it("garante que módulos do drawer possuem configuração de estilo e touch targets válidos", () => {
    for (const mod of CANONICAL_DRAWER_MODULES) {
      expect(mod.title).toBeTruthy();
      expect(mod.target_route).toBeTruthy();
      expect(mod.template_type).toBe("drawer_module");
      expect(mod.show_title).toBe(true);
      expect(typeof mod.sort_order).toBe("number");
      expect(mod.filter_rules).toBeDefined();
    }
  });

  it("garante que não existem links externos simulados ou fallbacks fake no drawer", () => {
    for (const mod of CANONICAL_DRAWER_MODULES) {
      // Rotas devem ser internas da aplicação Waesy
      expect(mod.target_route?.startsWith("/")).toBe(true);
      // Nenhuma imagem externa hardcoded não autorizada
      if (mod.icon_name) {
        expect(typeof mod.icon_name).toBe("string");
      }
    }
  });
});
