/**
 * geo-search.functions.ts — Motor de Busca Geográfica e Filtros por Cidade/Bairro
 *
 * Fase F15 do Plano Mestre de Estabilização dos 4 Pilares.
 * Permite busca geodésica em Places por proximidade (Haversine) e filtros
 * espaciais de cidade e bairro em Classificados e Lojas.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import {
  calculateHaversineDistanceKm,
  findClosestCanonicalCity,
} from "@/lib/constants/cities";

// ---------------------------------------------------------------------------
// Schemas de Validação Zod
// ---------------------------------------------------------------------------

export const geoSearchPlacesInputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusKm: z.number().min(1).max(300).default(25),
  category: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export type GeoSearchPlacesInput = z.infer<typeof geoSearchPlacesInputSchema>;

export const geoSearchClassifiedsInputSchema = z.object({
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  category: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export type GeoSearchClassifiedsInput = z.infer<typeof geoSearchClassifiedsInputSchema>;

export const resolveLocationCityInputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type ResolveLocationCityInput = z.infer<typeof resolveLocationCityInputSchema>;

// ---------------------------------------------------------------------------
// Interfaces de Resposta
// ---------------------------------------------------------------------------

export interface PlaceWithDistanceDTO {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  lat: number;
  lng: number;
  distanceKm: number;
  isPhysicalLocation: boolean;
}

export interface GeoSearchPlacesResponse {
  places: PlaceWithDistanceDTO[];
  count: number;
  center: {
    lat: number;
    lng: number;
    radiusKm: number;
  };
}

export interface GeoSearchClassifiedItemDTO {
  id: string;
  title: string;
  category: string;
  priceCents: number;
  locationText: string | null;
  coverUrl: string | null;
  condition: string | null;
  createdAt: string;
}

export interface GeoSearchClassifiedsResponse {
  classifieds: GeoSearchClassifiedItemDTO[];
  count: number;
  filters: {
    city?: string;
    neighborhood?: string;
    category?: string;
  };
}

// ---------------------------------------------------------------------------
// 1. Busca Geodésica de Estabelecimentos (Places por Raio Haversine)
// ---------------------------------------------------------------------------

export const geoSearchPlacesFn = createServerFn({ method: "GET" })
  .validator(geoSearchPlacesInputSchema)
  .handler(async ({ data: input }): Promise<GeoSearchPlacesResponse> => {
    const db = getServerClient();
    const { lat, lng, radiusKm, category, limit } = input;

    // Buscar lojas com status ativo
    let query = db
      .from("stores")
      .select("id, name, slug, category, settings, status")
      .eq("status", "active");

    if (category && category !== "all") {
      query = query.ilike("category", `%${category}%`);
    }

    const { data, error } = await query;
    if (error || Boolean(data) === false) {
      return {
        places: [],
        count: 0,
        center: { lat, lng, radiusKm },
      };
    }

    const matchedPlaces: PlaceWithDistanceDTO[] = [];

    for (const store of data) {
      const settings = (store.settings as Record<string, any>) || {};
      const storeLat = settings.latitude ?? settings.lat;
      const storeLng = settings.longitude ?? settings.lng;

      // Filtrar apenas lojas com coordenadas válidas cadastradas
      if (typeof storeLat !== "number" || typeof storeLng !== "number") {
        continue;
      }

      const dist = calculateHaversineDistanceKm(lat, lng, storeLat, storeLng);
      const roundedDist = Math.round(dist * 10) / 10;

      if (roundedDist <= radiusKm) {
        matchedPlaces.push({
          id: store.id,
          name: store.name,
          slug: store.slug,
          category: store.category || "Comércio Local",
          description: settings.description || null,
          logoUrl: settings.logoUrl || settings.logo_url || null,
          bannerUrl: settings.bannerUrl || settings.coverUrl || null,
          phone: settings.phone || settings.whatsapp || null,
          address: settings.address || null,
          city: settings.city || null,
          state: settings.state || null,
          lat: storeLat,
          lng: storeLng,
          distanceKm: roundedDist,
          isPhysicalLocation: settings.is_physical_location ?? true,
        });
      }
    }

    // Ordenar por menor distância geográfica (mais próximo primeiro)
    matchedPlaces.sort((a, b) => a.distanceKm - b.distanceKm);

    const paginated = matchedPlaces.slice(0, limit);

    return {
      places: paginated,
      count: paginated.length,
      center: { lat, lng, radiusKm },
    };
  });

// ---------------------------------------------------------------------------
// 2. Filtro Espacial de Classificados (Cidade / Bairro)
// ---------------------------------------------------------------------------

export const geoSearchClassifiedsFn = createServerFn({ method: "GET" })
  .validator(geoSearchClassifiedsInputSchema)
  .handler(async ({ data: input }): Promise<GeoSearchClassifiedsResponse> => {
    const db = getServerClient();
    const { city, neighborhood, category, limit, offset } = input;

    let query = db
      .from("classifieds")
      .select("id, title, category, price_cents, location_text, images, condition, created_at, status")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (category && category !== "all") {
      query = query.ilike("category", `%${category}%`);
    }

    if (city && city.trim().length > 0) {
      query = query.ilike("location_text", `%${city.trim()}%`);
    }

    if (neighborhood && neighborhood.trim().length > 0) {
      query = query.ilike("location_text", `%${neighborhood.trim()}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error || Boolean(data) === false) {
      return {
        classifieds: [],
        count: 0,
        filters: { city, neighborhood, category },
      };
    }

    const items: GeoSearchClassifiedItemDTO[] = data.map((c: any) => ({
      id: c.id,
      title: c.title,
      category: c.category || "Geral",
      priceCents: c.price_cents || 0,
      locationText: c.location_text || null,
      coverUrl: Array.isArray(c.images) && c.images.length > 0 ? c.images[0] : null,
      condition: c.condition || null,
      createdAt: c.created_at,
    }));

    return {
      classifieds: items,
      count: items.length,
      filters: { city, neighborhood, category },
    };
  });

// ---------------------------------------------------------------------------
// 3. Resolução da Cidade Canônica Mais Próxima
// ---------------------------------------------------------------------------

export const resolveLocationCityFn = createServerFn({ method: "GET" })
  .validator(resolveLocationCityInputSchema)
  .handler(async ({ data: input }) => {
    const { lat, lng } = input;
    const closest = findClosestCanonicalCity(lat, lng);

    if (closest === undefined || closest === null) {
      return {
        resolved: false,
        city: null,
      };
    }

    return {
      resolved: true,
      city: {
        id: closest.id,
        name: closest.name,
        state: closest.state,
        label: closest.label,
        lat: closest.lat,
        lng: closest.lng,
        distanceKm: closest.distanceKm,
      },
    };
  });
