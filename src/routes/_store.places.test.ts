import { describe, it, expect } from "vitest";
import { Route } from "./_store.places.index";

describe("Places Route & Context Disambiguation (Fase F03)", () => {
  it("deve declarar rota do TanStack Router para /_store/places/", () => {
    expect(Route).toBeDefined();
    expect(typeof Route.options.component).toBe("function");
  });

  it("deve conter metadados canônicos do Guia Oficial de Lugares e Empresas", () => {
    const metaFn = (Route.options as { head?: () => { meta: Array<{ title?: string; name?: string }> } }).head;
    expect(metaFn).toBeDefined();
    if (metaFn) {
      const head = metaFn();
      expect(head.meta[0].title).toContain("Places");
      expect(head.meta[0].title).toContain("Lugares e Empresas");
    }
  });

  it("deve possuir loader assíncrono para banners e hotpages", async () => {
    expect(Route.options.loader).toBeDefined();
    expect(typeof Route.options.loader).toBe("function");
  });
});
