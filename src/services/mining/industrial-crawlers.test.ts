import { describe, it, expect, vi } from "vitest";
import { normalizeAndTokenize, computeJaccardSimilarity } from "./semantic-deduplicator";
import { executeCrawlQueueBatchDirect } from "./crawler-batch-engine";
import { harvestAndPersistEvent } from "./event-harvester";
import { extractEventFromJsonLd } from "./specialized-extractors";
import { resolveActiveCity } from "@/lib/city-helper";
import { resolveCityAndState, normalizeStateUf } from "@/lib/mining/geo-resolver";
import { queryOverpassPlaces, harvestAndPersistPlaces } from "./places-harvester";

describe("Industrial Crawler & Mining Engine Test Suite", () => {
  describe("Semantic Deduplicator & Clustering Engine", () => {
    it("normalizeAndTokenize removes stopwords and diacritics", () => {
      const tokens = normalizeAndTokenize("Prefeitura de Chapecó abre novas licitações para asfalto no centro!");
      expect(tokens).toContain("prefeitura");
      expect(tokens).toContain("chapeco");
      expect(tokens).toContain("licitacoes");
      expect(tokens).toContain("asfalto");
      expect(tokens).toContain("centro");
      expect(tokens).not.toContain("de");
      expect(tokens).not.toContain("para");
      expect(tokens).not.toContain("no");
    });

    it("computeJaccardSimilarity returns 1 for identical token lists", () => {
      const tokens = ["hospital", "regional", "oeste", "chapeco"];
      const sim = computeJaccardSimilarity(tokens, tokens);
      expect(sim).toBe(1);
    });

    it("computeJaccardSimilarity detects high similarity between different headlines of the same event", () => {
      const titleA = normalizeAndTokenize("Governador anuncia obras na SC-283 em Chapecó nesta sexta");
      const titleB = normalizeAndTokenize("Obras na rodovia SC-283 em Chapecó são confirmadas pelo governador");
      const sim = computeJaccardSimilarity(titleA, titleB);
      expect(sim).toBeGreaterThanOrEqual(0.35);
    });

    it("computeJaccardSimilarity returns 0 for completely unrelated articles", () => {
      const titleA = normalizeAndTokenize("Chapecoense vence partida decisiva pelo Campeonato Catarinense");
      const titleB = normalizeAndTokenize("Preço da gasolina tem queda nos postos de combustíveis da região");
      const sim = computeJaccardSimilarity(titleA, titleB);
      expect(sim).toBeLessThan(0.2);
    });
  });

  describe("Crawler Batch Engine & Event Harvester Decoupling", () => {
    it("executeCrawlQueueBatchDirect is an async function decoupled from server context", () => {
      expect(typeof executeCrawlQueueBatchDirect).toBe("function");
    });

    it("harvestAndPersistEvent is an async function decoupled from server context", () => {
      expect(typeof harvestAndPersistEvent).toBe("function");
    });

    it("extractEventFromJsonLd parses Schema.org Event accurately", () => {
      const sampleHtml = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Event",
              "name": "Festival de Teatro de Chapecó 2026",
              "startDate": "2026-11-15T19:00:00-03:00",
              "endDate": "2026-11-20T22:00:00-03:00",
              "description": "Edição comemorativa com espetáculos teatrais de todo o Brasil.",
              "location": {
                "@type": "Place",
                "name": "Centro de Cultura e Eventos Plínio Arlindo de Nes",
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": "Chapecó",
                  "addressRegion": "SC"
                }
              },
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "BRL"
              }
            }
            </script>
          </head>
          <body><h1>Festival</h1></body>
        </html>
      `;

      const event = extractEventFromJsonLd(sampleHtml, "https://eventos.chapeco.sc.gov.br/teatro-2026");
      expect(event).not.toBeNull();
      expect(event?.title).toBe("Festival de Teatro de Chapecó 2026");
      expect(event?.city).toBe("Chapecó");
      expect(event?.state).toBe("SC");
      expect(event?.venueName).toBe("Centro de Cultura e Eventos Plínio Arlindo de Nes");
      expect(event?.isFree).toBe(true);
    });
  });

  describe("Contextual City Resolution Helper", () => {
    it("resolves city from searchParams correctly", () => {
      expect(resolveActiveCity({ city: "Chapecó" })).toBe("Chapecó");
      expect(resolveActiveCity({ city: "São Miguel do Oeste" })).toBe("São Miguel do Oeste");
      expect(resolveActiveCity({ city: "Florianópolis" })).toBe("Florianópolis");
    });

    it("ignores global or empty city params", () => {
      expect(resolveActiveCity({ city: "Todas" })).toBeUndefined();
      expect(resolveActiveCity({ city: "Global" })).toBeUndefined();
      expect(resolveActiveCity({ city: "all" })).toBeUndefined();
      expect(resolveActiveCity({})).toBeUndefined();
    });
  });

  describe("Geographic Resolver & Nationwide City/State Resolution", () => {
    it("resolveCityAndState identifies capitals and regional hubs across Brazil", () => {
      const curitiba = resolveCityAndState("Curitiba");
      expect(curitiba.city).toBe("Curitiba");
      expect(curitiba.state).toBe("PR");
      expect(curitiba.ibgeCode).toBe("4106902");

      const passoFundo = resolveCityAndState("Passo Fundo");
      expect(passoFundo.city).toBe("Passo Fundo");
      expect(passoFundo.state).toBe("RS");
      expect(passoFundo.ibgeCode).toBe("4314100");

      const saoPaulo = resolveCityAndState("São Paulo");
      expect(saoPaulo.city).toBe("São Paulo");
      expect(saoPaulo.state).toBe("SP");
      expect(saoPaulo.ibgeCode).toBe("3550308");

      const floripa = resolveCityAndState("Florianópolis");
      expect(floripa.city).toBe("Florianópolis");
      expect(floripa.state).toBe("SC");
      expect(floripa.ibgeCode).toBe("4205407");
    });

    it("resolveCityAndState never forces 'SC' for uncataloged cities or other states", () => {
      const unknown = resolveCityAndState("Metrópole Desconhecida");
      expect(unknown.city).toBe("Metrópole Desconhecida");
      expect(unknown.state).toBeUndefined();

      const unknownWithState = resolveCityAndState("Povoado Remoto", "Minas Gerais");
      expect(unknownWithState.city).toBe("Povoado Remoto");
      expect(unknownWithState.state).toBe("MG");
    });

    it("resolveCityAndState defaults to platform location only when both city and state are undefined", () => {
      const fallback = resolveCityAndState(undefined, undefined);
      expect(fallback.city).toBe("Chapecó");
      expect(fallback.state).toBe("SC");
      expect(fallback.ibgeCode).toBe("4204202");
    });

    it("normalizeStateUf maps full state names to official two-letter UFs", () => {
      expect(normalizeStateUf("Paraná")).toBe("PR");
      expect(normalizeStateUf("Santa Catarina")).toBe("SC");
      expect(normalizeStateUf("Rio Grande do Sul")).toBe("RS");
      expect(normalizeStateUf("São Paulo")).toBe("SP");
      expect(normalizeStateUf("Minas Gerais")).toBe("MG");
      expect(normalizeStateUf("pr")).toBe("PR");
      expect(normalizeStateUf("SC")).toBe("SC");
      expect(normalizeStateUf("Estado Inexistente")).toBeUndefined();
      expect(normalizeStateUf(undefined)).toBeUndefined();
    });
  });

  describe("Places Harvester Geographic Provenance & Zero Chapecó BBOX Leakage", () => {
    it("queryOverpassPlaces returns empty array for unmapped cities without leaking Chapecó BBOX", async () => {
      const curitibaPlaces = await queryOverpassPlaces("restaurante", "Curitiba", "PR");
      expect(curitibaPlaces).toEqual([]);

      const passoFundoPlaces = await queryOverpassPlaces("hotel", "Passo Fundo", "RS");
      expect(passoFundoPlaces).toEqual([]);

      const saoPauloPlaces = await queryOverpassPlaces("padaria", "São Paulo", "SP");
      expect(saoPauloPlaces).toEqual([]);
    });

    it("preserves authentic state provenance for non-SC cities in harvestAndPersistPlaces", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
        const urlStr = String(url);
        if (urlStr.includes("nominatim")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => [
              {
                name: "Restaurante Central",
                display_name: "Restaurante Central, Curitiba, Paraná, Brasil",
                lat: "-25.429",
                lon: "-49.267",
                type: "restaurant",
                address: {
                  city: "Curitiba",
                  state: "Paraná",
                  road: "Rua XV de Novembro",
                  house_number: "100",
                },
              },
            ],
          } as Response);
        }
        return Promise.resolve({ ok: false, status: 404 } as Response);
      });

      try {
        const result = await harvestAndPersistPlaces({
          query: "restaurante",
          city: "Curitiba",
        });

        expect(result.places.length).toBeGreaterThanOrEqual(1);
        expect(result.places[0].city).toBe("Curitiba");
        expect(result.places[0].state).toBe("PR");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
