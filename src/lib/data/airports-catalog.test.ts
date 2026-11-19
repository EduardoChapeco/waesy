import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  formatAirportLabel,
  normalizeAirportSearchText,
  type AirportRecord,
} from "@/types/airports";

describe("Aeroportos SSOT no Supabase (airports_global) & Contratos Leves", () => {
  it("normaliza texto de busca removendo acentos e pontuação de forma idempotente", () => {
    expect(normalizeAirportSearchText("Chapecó")).toBe("chapeco");
    expect(normalizeAirportSearchText("  São Paulo / Guarulhos  ")).toBe(
      "sao paulo / guarulhos",
    );
  });

  it("formata rótulo amigável para aeroportos nacionais e internacionais", () => {
    const xap: AirportRecord = {
      iata_code: "XAP",
      icao_code: "SBCH",
      name: "Aeroporto Serafin Enoss Bertaso",
      city: "Chapecó",
      state_province: "SC",
      country: "Brasil",
      country_code: "BR",
      latitude: -27.13,
      longitude: -52.65,
      timezone: "America/Sao_Paulo",
      is_commercial: true,
    };
    expect(formatAirportLabel(xap)).toBe(
      "XAP — Chapecó/SC (Aeroporto Serafin Enoss Bertaso)",
    );

    const lis: AirportRecord = {
      iata_code: "LIS",
      icao_code: "LPPT",
      name: "Aeroporto Humberto Delgado",
      city: "Lisboa",
      state_province: null,
      country: "Portugal",
      country_code: "PT",
      latitude: 38.78,
      longitude: -9.13,
      timezone: "Europe/Lisbon",
      is_commercial: true,
    };
    expect(formatAirportLabel(lis)).toBe(
      "LIS — Lisboa, Portugal (Aeroporto Humberto Delgado)",
    );
  });

  it("assegura que BFF e combobox não carregam catálogo estático em memória", () => {
    const bffSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/services/tourism-airports.functions.ts"),
      "utf8",
    );
    expect(bffSrc).toContain('.from("airports_global")');
    expect(bffSrc).not.toContain("airports-catalog");
    expect(bffSrc).not.toContain("memory_catalog");

    const comboSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/ui/airport-combobox.tsx"),
      "utf8",
    );
    expect(comboSrc).not.toContain("searchAirportsCatalog");
    expect(comboSrc).toContain("searchGlobalAirports");
    expect(comboSrc).toContain("getAirportsByIatasFn");
  });
});
