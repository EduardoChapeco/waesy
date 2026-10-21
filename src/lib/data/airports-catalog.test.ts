import { describe, it, expect } from "vitest";
import {
  GLOBAL_AIRPORTS_CATALOG,
  AIRPORTS_BY_IATA_MAP,
  getAirportByIata,
  searchAirportsCatalog,
  formatAirportLabel,
} from "./airports-catalog";

describe("Catálogo Global de Aeroportos & IATA SSOT", () => {
  it("deve conter mais de 7.000 aeroportos comerciais, regionais e hubs mundiais cadastrados", () => {
    expect(GLOBAL_AIRPORTS_CATALOG.length).toBeGreaterThan(7000);
  });

  it("não deve conter códigos IATA duplicados (unicidade estrita)", () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const a of GLOBAL_AIRPORTS_CATALOG) {
      if (seen.has(a.iata_code)) {
        duplicates.push(a.iata_code);
      }
      seen.add(a.iata_code);
    }
    expect(duplicates).toEqual([]);
    expect(seen.size).toBe(GLOBAL_AIRPORTS_CATALOG.length);
  });

  it("deve indexar todos os aeroportos no mapa O(1) AIRPORTS_BY_IATA_MAP", () => {
    expect(AIRPORTS_BY_IATA_MAP.size).toBe(GLOBAL_AIRPORTS_CATALOG.length);
    expect(AIRPORTS_BY_IATA_MAP.get("XAP")?.city).toBe("Chapecó");
    expect(AIRPORTS_BY_IATA_MAP.get("GRU")?.city).toContain("São Paulo");
    expect(AIRPORTS_BY_IATA_MAP.get("LIS")?.country).toBe("Portugal");
    expect(AIRPORTS_BY_IATA_MAP.get("MIA")?.country).toBe("Estados Unidos");
    expect(AIRPORTS_BY_IATA_MAP.get("PUJ")?.country).toBe("República Dominicana");
    expect(AIRPORTS_BY_IATA_MAP.get("HND")?.iata_code).toBe("HND");
    expect(AIRPORTS_BY_IATA_MAP.get("DXB")?.iata_code).toBe("DXB");
    expect(AIRPORTS_BY_IATA_MAP.get("LHR")?.iata_code).toBe("LHR");
    expect(AIRPORTS_BY_IATA_MAP.get("SYD")?.iata_code).toBe("SYD");
  });

  it("deve resolver aeroporto com getAirportByIata independentemente de caixa ou espaçamento", () => {
    const xap = getAirportByIata("  xap  ");
    expect(xap).toBeDefined();
    expect(xap?.iata_code).toBe("XAP");
    expect(xap?.icao_code).toBe("SBCH");

    const jfk = getAirportByIata("JFK");
    expect(jfk).toBeDefined();
    expect(jfk?.city).toContain("Nova York");
  });

  it("deve realizar busca e autofiltro insensível a acentos e caixa", () => {
    // Busca por cidade com e sem acento
    const cha1 = searchAirportsCatalog("Chapecó");
    const cha2 = searchAirportsCatalog("chapeco");
    expect(cha1[0]?.iata_code).toBe("XAP");
    expect(cha2[0]?.iata_code).toBe("XAP");

    // Busca exata por IATA
    const gru = searchAirportsCatalog("GRU");
    expect(gru[0]?.iata_code).toBe("GRU");

    // Busca por país
    const dominicana = searchAirportsCatalog("Dominicana");
    expect(dominicana.some((a) => a.iata_code === "PUJ")).toBe(true);

    // Busca por aeroportos regionais de SC/RS
    const sul = searchAirportsCatalog("Caxias do Sul");
    expect(sul[0]?.iata_code).toBe("CXJ");
  });

  it("deve formatar rótulo legível com formatAirportLabel", () => {
    const xap = getAirportByIata("XAP")!;
    const label = formatAirportLabel(xap);
    expect(label).toBe("XAP — Chapecó/SC (Aeroporto Serafin Enoss Bertaso)");

    const lis = getAirportByIata("LIS")!;
    const lisLabel = formatAirportLabel(lis);
    expect(lisLabel).toBe("LIS — Lisboa, Portugal (Aeroporto Humberto Delgado)");
  });
});
