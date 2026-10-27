/**
 * tourism-airports.functions.ts — BFF para Busca e Resolução de Aeroportos Globais
 * Permite autocompletes, rotas de voos, filtros por país/cidade e IATA gateway.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import {
  type AirportRecord,
  getAirportByIata,
  searchAirportsCatalog,
} from "@/lib/data/airports-catalog";
import {
  type AirportRichProfile,
  getEnrichedAirportProfile,
} from "@/lib/tourism/airport-intelligence";

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

/**
 * Obtém o dossiê detalhado completo de infraestrutura de um aeroporto específico (IATA).
 * Combina perfil de banco (public.airport_cms_profiles) com inteligência curada e fallback determinístico.
 */
export const getAirportDetailedProfile = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ iata: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const cleanIata = (data.iata || "").trim().toUpperCase();
    if (!cleanIata) {
      return { profile: null };
    }

    // 1. Gera base rica in-memory
    const memoryProfile = getEnrichedAirportProfile(cleanIata);
    if (!memoryProfile) {
      return { profile: null };
    }

    // 2. Consulta customizações CMS no banco
    try {
      const supabase = getServerClient();
      const { data: cmsData } = await supabase
        .from("airport_cms_profiles")
        .select("*")
        .eq("iata_code", cleanIata)
        .maybeSingle();

      if (cmsData) {
        const merged: AirportRichProfile = {
          ...memoryProfile,
          operator_name: cmsData.operator_name || memoryProfile.operator_name,
          operating_hours: cmsData.operating_hours || memoryProfile.operating_hours,
          website_url: cmsData.website_url || memoryProfile.website_url,
          phone_pabx: cmsData.phone_pabx || memoryProfile.phone_pabx,
          terminals: Array.isArray(cmsData.terminals) && cmsData.terminals.length > 0
            ? cmsData.terminals
            : memoryProfile.terminals,
          official_sectors: Array.isArray(cmsData.official_sectors) && cmsData.official_sectors.length > 0
            ? cmsData.official_sectors
            : memoryProfile.official_sectors,
          fees_and_taxes: Array.isArray(cmsData.fees_and_taxes) && cmsData.fees_and_taxes.length > 0
            ? cmsData.fees_and_taxes
            : memoryProfile.fees_and_taxes,
          amenities: Array.isArray(cmsData.amenities) && cmsData.amenities.length > 0
            ? cmsData.amenities
            : memoryProfile.amenities,
          ground_transportation: cmsData.ground_transportation && Object.keys(cmsData.ground_transportation).length > 0
            ? cmsData.ground_transportation
            : memoryProfile.ground_transportation,
          notices: Array.isArray(cmsData.notices) && cmsData.notices.length > 0
            ? cmsData.notices
            : memoryProfile.notices,
          nearby_points: Array.isArray(cmsData.nearby_points) && cmsData.nearby_points.length > 0
            ? cmsData.nearby_points
            : memoryProfile.nearby_points,
        };

        return { profile: merged, source: "cms_database" as const };
      }
    } catch {
      // Ignora erro e entrega base inteligente
    }

    return { profile: memoryProfile, source: "intelligence_engine" as const };
  });

/**
 * Incrementa contador de visualizações/telemetria da página do aeroporto.
 */
export const trackAirportPageView = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ iata: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const cleanIata = (data.iata || "").trim().toUpperCase();
    if (!cleanIata) return { ok: false };

    try {
      const supabase = getServerClient();
      try {
        await supabase.rpc("increment_airport_view_count", { p_iata: cleanIata });
      } catch {
        // Fallback simples se RPC não existir
        await supabase
          .from("airport_cms_profiles")
          .upsert({ iata_code: cleanIata }, { onConflict: "iata_code" });
      }
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });

