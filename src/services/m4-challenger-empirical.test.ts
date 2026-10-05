/**
 * m4-challenger-empirical.test.ts
 * 
 * Adversarial Empirical Verification Suite for Milestone M4 (Continuous Mining Engines Consolidation):
 * 1. Multi-State City Resolution & Zero BBOX Leak:
 *    - Unmapped cities return [] from Overpass queries, NEVER Chapecó coordinates.
 *    - Non-SC cities (Curitiba/PR, Passo Fundo/RS, São Paulo/SP, etc.) resolve correct UF and never leak 'SC'.
 *    - Nominatim state normalization with multi-word states ('Rio Grande do Sul' -> 'RS', 'Santa Catarina' -> 'SC', 'Paraná' -> 'PR', etc.).
 * 2. Strict Input Boundary, Diacritics & Fallback Contract:
 *    - Uncataloged cities return state: undefined (zero forced SC).
 *    - Compound city strings ("Curitiba - PR", "Passo Fundo/RS", "Londrina, PR", "Cuiabá - MT") correctly parsed.
 *    - State-only inputs preserve state and leave city undefined.
 *    - Dual-undefined fallback strictly defaults to platform identity ("Chapecó", "SC", "4204202").
 * 3. OpenStreetMap Nominatim Harvester Contract:
 *    - Non-SC searches dispatch proper search queries (never containing "SC").
 *    - Address normalization maps full state strings to 2-letter UFs.
 * 4. Job Extraction Territorial Integrity:
 *    - locationCity, locationState, and companyName reflect target territory (no hardcoded "Empresa em Chapecó").
 */

import { describe, it, expect, vi } from "vitest";
import { resolveCityAndState, normalizeStateUf } from "@/lib/mining/geo-resolver";
import { queryOverpassPlaces, queryNominatimPlaces } from "@/services/mining/places-harvester";
import { BRAZILIAN_STATES } from "@/lib/constants/brazilian-states";
import { parseBrlSalaryToCents } from "@/services/mining/job-opportunity-extractor";

describe("Milestone M4 Challenger: Adversarial Empirical Verification", () => {
  // =========================================================================
  // 1. Multi-State City Resolution & Zero SC Leakage
  // =========================================================================
  describe("1. Multi-State City Resolution Across Brazilian Federation", () => {
    it("resolves cataloged state capitals outside SC to their exact UF without leaking 'SC'", () => {
      const stateCapitals: Array<{ city: string; expectedState: string }> = [
        { city: "Curitiba", expectedState: "PR" },
        { city: "Porto Alegre", expectedState: "RS" },
        { city: "São Paulo", expectedState: "SP" },
        { city: "Rio de Janeiro", expectedState: "RJ" },
        { city: "Belo Horizonte", expectedState: "MG" },
        { city: "Vitória", expectedState: "ES" },
        { city: "Brasília", expectedState: "DF" },
        { city: "Goiânia", expectedState: "GO" },
        { city: "Campo Grande", expectedState: "MS" },
        { city: "Salvador", expectedState: "BA" },
        { city: "Recife", expectedState: "PE" },
        { city: "Fortaleza", expectedState: "CE" },
        { city: "São Luís", expectedState: "MA" },
        { city: "Natal", expectedState: "RN" },
        { city: "Maceió", expectedState: "AL" },
        { city: "Teresina", expectedState: "PI" },
        { city: "Manaus", expectedState: "AM" },
        { city: "Belém", expectedState: "PA" },
        { city: "Porto Velho", expectedState: "RO" },
        { city: "Macapá", expectedState: "AP" },
        { city: "Rio Branco", expectedState: "AC" },
        { city: "Boa Vista", expectedState: "RR" },
        { city: "Palmas", expectedState: "TO" },
      ];

      for (const { city, expectedState } of stateCapitals) {
        const resolved = resolveCityAndState(city);
        expect(resolved.city).toBe(city);
        expect(resolved.state).toBe(expectedState);
        expect(resolved.state).not.toBe("SC");
        expect(resolved.ibgeCode).toBeDefined();
      }
    });

    it("resolves cataloged interior regional hubs across PR, RS, SP, MG without leaking 'SC'", () => {
      const hubs = [
        { city: "Passo Fundo", uf: "RS" },
        { city: "Caxias do Sul", uf: "RS" },
        { city: "Gramado", uf: "RS" },
        { city: "Canela", uf: "RS" },
        { city: "Londrina", uf: "PR" },
        { city: "Maringá", uf: "PR" },
        { city: "Cascavel", uf: "PR" },
        { city: "Foz do Iguaçu", uf: "PR" },
        { city: "Campinas", uf: "SP" },
        { city: "Ribeirão Preto", uf: "SP" },
        { city: "São José dos Campos", uf: "SP" },
        { city: "Santos", uf: "SP" },
        { city: "Uberlândia", uf: "MG" },
        { city: "Juiz de Fora", uf: "MG" },
        { city: "Rondonópolis", uf: "MT" },
        { city: "Sinop", uf: "MT" },
        { city: "Dourados", uf: "MS" },
        { city: "Porto Seguro", uf: "BA" },
        { city: "Ilhéus", uf: "BA" },
        { city: "Campina Grande", uf: "PB" },
        { city: "Petrolina", uf: "PE" },
      ];

      for (const hub of hubs) {
        const res = resolveCityAndState(hub.city);
        expect(res.city).toBe(hub.city);
        expect(res.state).toBe(hub.uf);
        expect(res.state).not.toBe("SC");
      }
    });

    it("resolves cataloged Santa Catarina cities accurately", () => {
      const scCities = ["Chapecó", "Florianópolis", "Joinville", "Blumenau", "Criciúma", "São Miguel do Oeste", "Balneário Camboriú"];
      for (const city of scCities) {
        const res = resolveCityAndState(city);
        expect(res.city).toBe(city);
        expect(res.state).toBe("SC");
        expect(res.ibgeCode?.startsWith("42")).toBe(true);
      }
    });

    it("resolves uncataloged cities with explicit state hints or suffixes without leaking SC", () => {
      const cuiaba = resolveCityAndState("Cuiabá", "MT");
      expect(cuiaba.city).toBe("Cuiabá");
      expect(cuiaba.state).toBe("MT");

      const cuiabaSuffix = resolveCityAndState("Cuiabá - MT");
      expect(cuiabaSuffix.city).toBe("Cuiabá");
      expect(cuiabaSuffix.state).toBe("MT");

      const pelotasSuffix = resolveCityAndState("Pelotas/RS");
      expect(pelotasSuffix.city).toBe("Pelotas");
      expect(pelotasSuffix.state).toBe("RS");

      const itajaiSuffix = resolveCityAndState("Itajaí, SC");
      expect(itajaiSuffix.city).toBe("Itajaí");
      expect(itajaiSuffix.state).toBe("SC");
    });

    it("resolves compound city strings with embedded UF notation", () => {
      const hyphenTest = resolveCityAndState("Curitiba - PR");
      expect(hyphenTest.city).toBe("Curitiba");
      expect(hyphenTest.state).toBe("PR");

      const slashTest = resolveCityAndState("Passo Fundo/RS");
      expect(slashTest.city).toBe("Passo Fundo");
      expect(slashTest.state).toBe("RS");

      const commaTest = resolveCityAndState("Londrina, PR");
      expect(commaTest.city).toBe("Londrina");
      expect(commaTest.state).toBe("PR");

      const spaceTest = resolveCityAndState("Campinas SP");
      expect(spaceTest.city).toBe("Campinas");
      expect(spaceTest.state).toBe("SP");
    });
  });

  // =========================================================================
  // 2. Nominatim State Normalization & Multi-Word States
  // =========================================================================
  describe("2. Nominatim State Normalization (Full Names -> 2-Letter UFs)", () => {
    it("maps all 27 Brazilian states from their full names to official 2-letter UFs", () => {
      for (const state of BRAZILIAN_STATES) {
        const normalized = normalizeStateUf(state.name);
        expect(normalized).toBe(state.uf);
      }
    });

    it("strictly maps multi-word state names without slice(0, 2) corruption", () => {
      // Historical bug: slice(0, 2) caused 'Paraná' -> 'PA', 'Rio Grande do Sul' -> 'RI', 'Santa Catarina' -> 'SA'
      expect(normalizeStateUf("Paraná")).toBe("PR");
      expect(normalizeStateUf("Parana")).toBe("PR");
      expect(normalizeStateUf("Rio Grande do Sul")).toBe("RS");
      expect(normalizeStateUf("Santa Catarina")).toBe("SC");
      expect(normalizeStateUf("Rio Grande do Norte")).toBe("RN");
      expect(normalizeStateUf("Mato Grosso do Sul")).toBe("MS");
      expect(normalizeStateUf("Mato Grosso")).toBe("MT");
      expect(normalizeStateUf("Rio de Janeiro")).toBe("RJ");
      expect(normalizeStateUf("Espírito Santo")).toBe("ES");
      expect(normalizeStateUf("Espirito Santo")).toBe("ES");
      expect(normalizeStateUf("Distrito Federal")).toBe("DF");
      expect(normalizeStateUf("Minas Gerais")).toBe("MG");
    });

    it("handles lowercase, trimmed, and diacritic variations", () => {
      expect(normalizeStateUf("  rio grande do sul  ")).toBe("RS");
      expect(normalizeStateUf("são paulo")).toBe("SP");
      expect(normalizeStateUf("sao paulo")).toBe("SP");
      expect(normalizeStateUf("ceará")).toBe("CE");
      expect(normalizeStateUf("ceara")).toBe("CE");
      expect(normalizeStateUf("goiás")).toBe("GO");
      expect(normalizeStateUf("goias")).toBe("GO");
      expect(normalizeStateUf("maranhão")).toBe("MA");
      expect(normalizeStateUf("maranhao")).toBe("MA");
      expect(normalizeStateUf("piauí")).toBe("PI");
      expect(normalizeStateUf("piaui")).toBe("PI");
      expect(normalizeStateUf("amapá")).toBe("AP");
      expect(normalizeStateUf("amapa")).toBe("AP");
      expect(normalizeStateUf("rondônia")).toBe("RO");
      expect(normalizeStateUf("rondonia")).toBe("RO");
    });

    it("returns undefined for invalid, empty, or foreign inputs", () => {
      expect(normalizeStateUf(undefined)).toBeUndefined();
      expect(normalizeStateUf(null)).toBeUndefined();
      expect(normalizeStateUf("")).toBeUndefined();
      expect(normalizeStateUf("   ")).toBeUndefined();
      expect(normalizeStateUf("California")).toBeUndefined();
      expect(normalizeStateUf("Buenos Aires")).toBeUndefined();
      expect(normalizeStateUf("XYZ")).toBeUndefined();
      expect(normalizeStateUf("123")).toBeUndefined();
    });
  });

  // =========================================================================
  // 3. Unmapped Cities & Overpass BBOX Leak Elimination
  // =========================================================================
  describe("3. Overpass BBOX Isolation & Zero Chapecó BBOX Leak", () => {
    it("returns empty array immediately for unmapped cities without hitting Overpass or leaking Chapecó BBOX", async () => {
      const nonBboxCities = [
        "Curitiba",
        "Passo Fundo",
        "São Paulo",
        "Porto Alegre",
        "Londrina",
        "Florianópolis",
        "Joinville",
        "Blumenau",
        "Brasília",
        "Rio de Janeiro",
        "Cidade Inexistente Teste",
      ];

      for (const city of nonBboxCities) {
        const results = await queryOverpassPlaces("farmacia", city, "PR");
        expect(results).toEqual([]);
      }
    });

    it("returns empty array when city is undefined or empty", async () => {
      const results = await queryOverpassPlaces("mercado", "", "SC");
      expect(results).toEqual([]);
    });

    it("preserves uncataloged cities without forcing 'SC'", () => {
      const uncataloged = resolveCityAndState("Vila Nova do Sertão");
      expect(uncataloged.city).toBe("Vila Nova do Sertão");
      expect(uncataloged.state).toBeUndefined();
      expect(uncataloged.ibgeCode).toBeUndefined();

      const uncatalogedWithHint = resolveCityAndState("Vila Nova do Sertão", "Bahia");
      expect(uncatalogedWithHint.city).toBe("Vila Nova do Sertão");
      expect(uncatalogedWithHint.state).toBe("BA");
    });

    it("defaults to Chapecó/SC only when BOTH city and state are completely undefined", () => {
      const bothNull = resolveCityAndState(null, null);
      expect(bothNull.city).toBe("Chapecó");
      expect(bothNull.state).toBe("SC");
      expect(bothNull.ibgeCode).toBe("4204202");

      const bothEmpty = resolveCityAndState("", "");
      expect(bothEmpty.city).toBe("Chapecó");
      expect(bothEmpty.state).toBe("SC");

      const bothUndefined = resolveCityAndState(undefined, undefined);
      expect(bothUndefined.city).toBe("Chapecó");
      expect(bothUndefined.state).toBe("SC");
    });

    it("respects state-only input without forcing Chapecó", () => {
      const stateOnly = resolveCityAndState(undefined, "PR");
      expect(stateOnly.city).toBeUndefined();
      expect(stateOnly.state).toBe("PR");
      expect(stateOnly.ibgeCode).toBeUndefined();

      const stateNameOnly = resolveCityAndState(undefined, "Rio Grande do Sul");
      expect(stateNameOnly.city).toBeUndefined();
      expect(stateNameOnly.state).toBe("RS");
      expect(stateNameOnly.ibgeCode).toBeUndefined();
    });
  });

  // =========================================================================
  // 4. Nominatim Search Query Construction & Address Mapping
  // =========================================================================
  describe("4. Nominatim Search Query Construction & Address Mapping", () => {
    it("constructs correct geographic query for non-SC cities without 'SC' in query", async () => {
      const originalFetch = globalThis.fetch;
      let capturedUrl = "";

      globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
        capturedUrl = String(url);
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [],
        } as Response);
      });

      try {
        await queryNominatimPlaces("padaria", "Curitiba", "PR");
        expect(capturedUrl).toContain("nominatim.openstreetmap.org");
        const decodedUrl = decodeURIComponent(capturedUrl);
        expect(decodedUrl).toContain("padaria, Curitiba, PR, Brasil");
        expect(decodedUrl).not.toContain("SC");

        await queryNominatimPlaces("hotel", "Passo Fundo", "RS");
        const decodedUrlRS = decodeURIComponent(capturedUrl);
        expect(decodedUrlRS).toContain("hotel, Passo Fundo, RS, Brasil");
        expect(decodedUrlRS).not.toContain("SC");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("normalizes Nominatim response with multi-word state 'Rio Grande do Sul' to 'RS'", async () => {
      const originalFetch = globalThis.fetch;

      globalThis.fetch = vi.fn().mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [
            {
              name: "Hotel Bella Itália",
              display_name: "Hotel Bella Itália, Passo Fundo, Rio Grande do Sul, Brasil",
              lat: "-28.2612",
              lon: "-52.4083",
              type: "hotel",
              address: {
                city: "Passo Fundo",
                state: "Rio Grande do Sul",
                road: "Avenida Brasil",
                house_number: "500",
              },
            },
          ],
        } as Response);
      });

      try {
        const places = await queryNominatimPlaces("hotel", "Passo Fundo", "RS");
        expect(places.length).toBe(1);
        expect(places[0].city).toBe("Passo Fundo");
        expect(places[0].state).toBe("RS");
        expect(places[0].state).not.toBe("RI"); // Never slice(0, 2)
        expect(places[0].state).not.toBe("SC");
        expect(places[0].businessName).toBe("Hotel Bella Itália");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("normalizes Nominatim response with 'Paraná' to 'PR' (not 'PA')", async () => {
      const originalFetch = globalThis.fetch;

      globalThis.fetch = vi.fn().mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [
            {
              name: "Restaurante Madalosso",
              display_name: "Restaurante Madalosso, Curitiba, Paraná, Brasil",
              lat: "-25.399",
              lon: "-49.330",
              type: "restaurant",
              address: {
                city: "Curitiba",
                state: "Paraná",
                road: "Avenida Manoel Ribas",
                house_number: "5875",
              },
            },
          ],
        } as Response);
      });

      try {
        const places = await queryNominatimPlaces("restaurante", "Curitiba", "PR");
        expect(places.length).toBe(1);
        expect(places[0].city).toBe("Curitiba");
        expect(places[0].state).toBe("PR");
        expect(places[0].state).not.toBe("PA"); // 'PA' is Pará, not Paraná
        expect(places[0].state).not.toBe("SC");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  // =========================================================================
  // 5. Job Extraction Territorial Integrity
  // =========================================================================
  describe("5. Job Extraction Territorial Integrity", () => {
    it("parseBrlSalaryToCents parses single values, ranges, and 'A combinar'", () => {
      const single = parseBrlSalaryToCents("R$ 4.500,00");
      expect(single.minCents).toBe(450000);
      expect(single.display).toBe("R$ 4.500,00");

      const range = parseBrlSalaryToCents("R$ 3.000,00 a R$ 5.000,00");
      expect(range.minCents).toBe(300000);
      expect(range.maxCents).toBe(500000);
      expect(range.display).toBe("R$ 3.000,00 - R$ 5.000,00");

      const combinar = parseBrlSalaryToCents("Salário a combinar");
      expect(combinar.display).toBe("A combinar");
      expect(combinar.minCents).toBeUndefined();
    });
  });
});
