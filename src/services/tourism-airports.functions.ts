/**
 * tourism-airports.functions.ts — BFF para Busca e Resolução de Aeroportos Globais
 * Permite autocompletes, rotas de voos, filtros por país/cidade e IATA gateway.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { type AirportRecord } from "@/types/airports";
import {
  type AirportRichProfile,
  buildEnrichedAirportProfile,
} from "@/lib/tourism/airport-intelligence";

const AIRPORT_SELECT_COLS =
  "iata_code, icao_code, name, city, state_province, country, country_code, latitude, longitude, timezone, is_commercial";

function mapDbAirportRow(row: any): AirportRecord {
  return {
    iata_code: String(row.iata_code || "").toUpperCase(),
    icao_code: String(row.icao_code || ""),
    name: String(row.name || ""),
    city: String(row.city || ""),
    state_province: row.state_province ?? null,
    country: String(row.country || ""),
    country_code: String(row.country_code || ""),
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    timezone: String(row.timezone || "America/Sao_Paulo"),
    is_commercial: Boolean(row.is_commercial ?? true),
  };
}

function scoreAirportMatch(airport: AirportRecord, rawQuery: string): number {
  const q = rawQuery.toLowerCase();
  if (!q) return airport.country_code === "BR" ? 500 : 100;
  const iata = airport.iata_code.toLowerCase();
  const icao = airport.icao_code.toLowerCase();
  const city = airport.city.toLowerCase();
  const name = airport.name.toLowerCase();
  let score = 100;
  if (iata === q) score = 1000;
  else if (icao === q) score = 950;
  else if (iata.startsWith(q)) score = 800;
  else if (city === q) score = 750;
  else if (city.startsWith(q)) score = 650;
  else if (city.includes(q)) score = 500;
  else if (name.includes(q)) score = 400;
  if (airport.country_code === "BR") score += 10;
  return score;
}

const searchAirportsSchema = z.object({
  query: z.string().optional().default(""),
  country: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(30),
});

export const searchGlobalAirports = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchAirportsSchema.parse(data))
  .handler(async ({ data }) => {
    const { query, country, limit } = data;
    const cleanQuery = (query || "").trim().slice(0, 80).replace(/[%(),]/g, " ").trim();
    const supabase = getServerClient();

    let dbQuery = supabase
      .from("airports_global")
      .select(AIRPORT_SELECT_COLS)
      .eq("is_commercial", true)
      .limit(Math.min(limit * 3, 120));

    if (country?.trim()) {
      const cleanCountry = country.trim().slice(0, 60).replace(/[%(),]/g, " ").trim();
      if (cleanCountry) {
        dbQuery = dbQuery.ilike("country", `%${cleanCountry}%`);
      }
    }

    if (cleanQuery) {
      if (cleanQuery.length <= 4) {
        dbQuery = dbQuery.or(
          `iata_code.ilike.%${cleanQuery}%,icao_code.ilike.%${cleanQuery}%,city.ilike.%${cleanQuery}%`,
        );
      } else {
        dbQuery = dbQuery.or(
          `city.ilike.%${cleanQuery}%,name.ilike.%${cleanQuery}%,state_province.ilike.%${cleanQuery}%,country.ilike.%${cleanQuery}%`,
        );
      }
    } else if (!country?.trim()) {
      dbQuery = dbQuery.eq("country_code", "BR");
    }

    const { data: dbAirports, error } = await dbQuery;
    if (error) {
      throw new Error(`[tourism-airports:searchGlobalAirports] ${error.message}`);
    }

    const mapped = (dbAirports || []).map(mapDbAirportRow);
    mapped.sort((a, b) => scoreAirportMatch(b, cleanQuery) - scoreAirportMatch(a, cleanQuery));

    return {
      airports: mapped.slice(0, limit),
      source: "database" as const,
    };
  });

export const getAirportsByIatasFn = createServerFn({ method: "GET" })
  .validator(
    z.object({
      iatas: z.array(z.string().trim().min(2).max(4)).max(80),
    }),
  )
  .handler(async ({ data }) => {
    const normalized = Array.from(
      new Set(data.iatas.map((x) => x.trim().toUpperCase()).filter(Boolean)),
    );
    if (normalized.length === 0) {
      return { airports: [] as AirportRecord[] };
    }

    const queryIatas = normalized.includes("CAL") && !normalized.includes("CLV")
      ? [...normalized, "CLV"]
      : normalized;

    const supabase = getServerClient();
    const { data: rows, error } = await supabase
      .from("airports_global")
      .select(AIRPORT_SELECT_COLS)
      .in("iata_code", queryIatas);

    if (error) {
      throw new Error(`[tourism-airports:getAirportsByIatasFn] ${error.message}`);
    }

    const byIata = new Map((rows || []).map((r: any) => [String(r.iata_code).toUpperCase(), mapDbAirportRow(r)]));
    if (normalized.includes("CAL") && !byIata.has("CAL") && byIata.has("CLV")) {
      const clv = byIata.get("CLV")!;
      byIata.set("CAL", { ...clv, iata_code: "CAL" });
    }

    const ordered = normalized
      .map((code) => byIata.get(code))
      .filter((item): item is AirportRecord => Boolean(item));

    return { airports: ordered };
  });

/**
 * Obtém o dossiê detalhado completo de infraestrutura de um aeroporto específico (IATA).
 * Combina registro real de `public.airports_global` com customizações de `public.airport_cms_profiles`.
 */
export const getAirportDetailedProfile = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ iata: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const cleanIata = (data.iata || "").trim().toUpperCase();
    if (!cleanIata) {
      return { profile: null };
    }

    const lookupIata = cleanIata === "CAL" ? "CLV" : cleanIata;
    const supabase = getServerClient();

    const { data: airportRow, error: airportError } = await supabase
      .from("airports_global")
      .select(AIRPORT_SELECT_COLS)
      .eq("iata_code", lookupIata)
      .maybeSingle();

    if (airportError) {
      throw new Error(`[tourism-airports:getAirportDetailedProfile] ${airportError.message}`);
    }
    if (!airportRow) {
      return { profile: null };
    }

    const mappedBase = mapDbAirportRow(airportRow);
    if (cleanIata === "CAL") mappedBase.iata_code = "CAL";
    const baseProfile = buildEnrichedAirportProfile(mappedBase);

    const { data: cmsData, error: cmsError } = await supabase
      .from("airport_cms_profiles")
      .select("*")
      .eq("iata_code", cleanIata)
      .maybeSingle();

    if (cmsError) {
      throw new Error(`[tourism-airports:getAirportCmsProfile] ${cmsError.message}`);
    }

    if (cmsData) {
      const merged: AirportRichProfile = {
        ...baseProfile,
        operator_name: cmsData.operator_name || baseProfile.operator_name,
        operating_hours: cmsData.operating_hours || baseProfile.operating_hours,
        website_url: cmsData.website_url || baseProfile.website_url,
        phone_pabx: cmsData.phone_pabx || baseProfile.phone_pabx,
        terminals: Array.isArray(cmsData.terminals) && cmsData.terminals.length > 0
          ? cmsData.terminals
          : baseProfile.terminals,
        official_sectors: Array.isArray(cmsData.official_sectors) && cmsData.official_sectors.length > 0
          ? cmsData.official_sectors
          : baseProfile.official_sectors,
        fees_and_taxes: Array.isArray(cmsData.fees_and_taxes) && cmsData.fees_and_taxes.length > 0
          ? cmsData.fees_and_taxes
          : baseProfile.fees_and_taxes,
        amenities: Array.isArray(cmsData.amenities) && cmsData.amenities.length > 0
          ? cmsData.amenities
          : baseProfile.amenities,
        ground_transportation: cmsData.ground_transportation && Object.keys(cmsData.ground_transportation).length > 0
          ? cmsData.ground_transportation
          : baseProfile.ground_transportation,
        notices: Array.isArray(cmsData.notices) && cmsData.notices.length > 0
          ? cmsData.notices
          : baseProfile.notices,
        nearby_points: Array.isArray(cmsData.nearby_points) && cmsData.nearby_points.length > 0
          ? cmsData.nearby_points
          : baseProfile.nearby_points,
      };

      return { profile: merged, source: "cms_database" as const };
    }

    return { profile: baseProfile, source: "database" as const };
  });

/**
 * Incrementa contador de visualizações/telemetria da página do aeroporto quando há perfil CMS.
 */
export const trackAirportPageView = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ iata: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const cleanIata = (data.iata || "").trim().toUpperCase();
    if (!cleanIata) return { ok: false };

    const supabase = getServerClient();
    const { data: existing, error: fetchErr } = await supabase
      .from("airport_cms_profiles")
      .select("id, view_count")
      .eq("iata_code", cleanIata)
      .maybeSingle();

    if (fetchErr) {
      throw new Error(`[tourism-airports:trackAirportPageView] ${fetchErr.message}`);
    }
    if (!existing) {
      return { ok: true, tracked: false };
    }

    const { error: updateErr } = await supabase
      .from("airport_cms_profiles")
      .update({ view_count: Number(existing.view_count || 0) + 1 })
      .eq("id", existing.id);

    if (updateErr) {
      throw new Error(`[tourism-airports:trackAirportPageViewUpdate] ${updateErr.message}`);
    }
    return { ok: true, tracked: true };
  });

