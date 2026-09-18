/**
 * tourism-airports.functions.ts — BFF para Busca e Resolução de Aeroportos Globais
 * Permite autocompletes, rotas de voos, filtros por país/cidade e IATA gateway.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { GLOBAL_AIRPORTS_CATALOG, AirportRecord } from "@/lib/data/airports-catalog";

const searchAirportsSchema = z.object({
  query: z.string().optional().default(""),
  country: z.string().optional(),
  limit: z.number().optional().default(20),
});

export const searchGlobalAirports = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchAirportsSchema.parse(data))
  .handler(async ({ data }) => {
    const { query, country, limit } = data;
    const cleanQuery = (query || "").trim().toLowerCase();

    try {
      const supabase = getServerClient();
      let dbQuery = supabase
        .from("airports_global")
        .select("*")
        .eq("is_commercial", true)
        .limit(limit);

      if (country) {
        dbQuery = dbQuery.ilike("country", `%${country}%`);
      }

      if (cleanQuery) {
        if (cleanQuery.length <= 4) {
          dbQuery = dbQuery.or(`iata_code.ilike.%${cleanQuery}%,city.ilike.%${cleanQuery}%`);
        } else {
          dbQuery = dbQuery.or(`city.ilike.%${cleanQuery}%,name.ilike.%${cleanQuery}%,state_province.ilike.%${cleanQuery}%`);
        }
      }

      const { data: dbAirports, error } = await dbQuery;

      if (!error && dbAirports && dbAirports.length > 0) {
        return {
          airports: dbAirports as AirportRecord[],
          source: "database" as const,
        };
      }
    } catch {
      // Fallback gracioso in-memory
    }

    // Fallback in-memory catalog
    let filtered = GLOBAL_AIRPORTS_CATALOG;

    if (country) {
      filtered = filtered.filter((a) =>
        a.country.toLowerCase().includes(country.toLowerCase())
      );
    }

    if (cleanQuery) {
      filtered = filtered.filter((a) => {
        const iataMatch = a.iata_code.toLowerCase().includes(cleanQuery);
        const icaoMatch = a.icao_code.toLowerCase().includes(cleanQuery);
        const cityMatch = a.city.toLowerCase().includes(cleanQuery);
        const nameMatch = a.name.toLowerCase().includes(cleanQuery);
        const stateMatch = a.state_province?.toLowerCase().includes(cleanQuery);
        return iataMatch || icaoMatch || cityMatch || nameMatch || stateMatch;
      });
    }

    return {
      airports: filtered.slice(0, limit),
      source: "memory_catalog" as const,
    };
  });
