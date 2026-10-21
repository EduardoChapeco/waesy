/**
 * tourism-airports.functions.ts — BFF para Busca e Resolução de Aeroportos Globais
 * Permite autocompletes, rotas de voos, filtros por país/cidade e IATA gateway.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import {
  type AirportRecord,
  searchAirportsCatalog,
} from "@/lib/data/airports-catalog";

const searchAirportsSchema = z.object({
  query: z.string().optional().default(""),
  country: z.string().optional(),
  limit: z.number().optional().default(30),
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
          dbQuery = dbQuery.or(
            `city.ilike.%${cleanQuery}%,name.ilike.%${cleanQuery}%,state_province.ilike.%${cleanQuery}%`
          );
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

    // Fallback unificado in-memory catalog
    const results = searchAirportsCatalog(cleanQuery, { country, limit });

    return {
      airports: results,
      source: "memory_catalog" as const,
    };
  });
