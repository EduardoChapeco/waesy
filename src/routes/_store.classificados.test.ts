import { describe, it, expect } from "vitest";
import { Route } from "./_store.classificados.index";

describe("Classifieds Route & Context Disambiguation (Fase F02)", () => {
  it("deve declarar rota do TanStack Router para /_store/classificados/", () => {
    expect(Route).toBeDefined();
    expect(typeof Route.options.component).toBe("function");
  });

  it("deve conter metadados descritivos com foco em desapegos e oportunidades locais", () => {
    const metaFn = (Route.options as { head?: () => { meta: Array<{ title?: string; name?: string }> } }).head;
    expect(metaFn).toBeDefined();
    if (metaFn) {
      const head = metaFn();
      expect(head.meta[0].title).toContain("Classificados");
    }
  });

  it("deve validar parâmetros de busca com tipos apropriados", () => {
    const validator = Route.options.validateSearch;
    expect(validator).toBeDefined();
    if (typeof validator === "function") {
      const parsed = (validator as (search: Record<string, unknown>) => Record<string, unknown>)({
        category: "vehicles",
        search: "carro",
      });
      expect(parsed.category).toBe("vehicles");
      expect(parsed.search).toBe("carro");
    }
  });
});
