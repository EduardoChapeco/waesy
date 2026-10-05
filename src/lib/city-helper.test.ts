import { describe, it, expect } from "vitest";
import { normalizeActiveCity, resolveActiveCity } from "./city-helper";

describe("Adversarial Empirical Tests — city-helper.ts", () => {
  describe("normalizeActiveCity", () => {
    it("returns undefined for null, undefined, empty string or whitespace", () => {
      expect(normalizeActiveCity(null)).toBeUndefined();
      expect(normalizeActiveCity(undefined)).toBeUndefined();
      expect(normalizeActiveCity("")).toBeUndefined();
      expect(normalizeActiveCity("   ")).toBeUndefined();
      expect(normalizeActiveCity("\t\n")).toBeUndefined();
    });

    it("returns undefined for blocklisted non-cities", () => {
      expect(normalizeActiveCity("Global")).toBeUndefined();
      expect(normalizeActiveCity("global")).toBeUndefined();
      expect(normalizeActiveCity("all")).toBeUndefined();
      expect(normalizeActiveCity("ALL")).toBeUndefined();
      expect(normalizeActiveCity("Todas")).toBeUndefined();
      expect(normalizeActiveCity("todas")).toBeUndefined();
      expect(normalizeActiveCity("Todas as Cidades")).toBeUndefined();
      expect(normalizeActiveCity("todas-as-cidades")).toBeUndefined();
      expect(normalizeActiveCity("todos")).toBeUndefined();
      expect(normalizeActiveCity("undefined")).toBeUndefined();
      expect(normalizeActiveCity("null")).toBeUndefined();
    });

    it("preserves valid city names trimming whitespace", () => {
      expect(normalizeActiveCity("Chapecó")).toBe("Chapecó");
      expect(normalizeActiveCity("  Chapecó  ")).toBe("Chapecó");
      expect(normalizeActiveCity("Florianópolis")).toBe("Florianópolis");
      expect(normalizeActiveCity("Xaxim")).toBe("Xaxim");
      expect(normalizeActiveCity("São Paulo")).toBe("São Paulo");
    });
  });

  describe("resolveActiveCity", () => {
    it("resolves from URL search parameters first", () => {
      expect(resolveActiveCity({ city: "Chapecó" })).toBe("Chapecó");
      expect(resolveActiveCity({ city: "  Chapecó  " })).toBe("Chapecó");
      expect(resolveActiveCity({ city: "Global" })).toBeUndefined();
      expect(resolveActiveCity({ city: "todas" })).toBeUndefined();
    });

    it("falls back to context.searchCity", () => {
      expect(resolveActiveCity({}, { searchCity: "Concórdia" })).toBe("Concórdia");
      expect(resolveActiveCity({ city: "Global" }, { searchCity: "Concórdia" })).toBe("Concórdia");
    });

    it("handles SSR context cookies", () => {
      expect(resolveActiveCity({}, { cookie: "waesy_city=Chapec%C3%B3" })).toBe("Chapecó");
      expect(resolveActiveCity({}, { cookie: "other=1; waesy_city=Chapec%C3%B3; foo=bar" })).toBe("Chapecó");
      expect(resolveActiveCity({}, { cookie: "waesy_city=Global" })).toBeUndefined();
    });

    it("handles SSR context cfCity", () => {
      expect(resolveActiveCity({}, { cfCity: "Chapecó" })).toBe("Chapecó");
      expect(resolveActiveCity({}, { cfCity: "Global" })).toBeUndefined();
    });
  });
});
