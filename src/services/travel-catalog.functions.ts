/**
 * travel-catalog.functions.ts — BFF para Gestão Centralizada de Destinos e Banco de Hotéis
 * Padrão BigTech | Zero Mocks | Multi-tenant por store_id
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";

// ─── DTOs Canônicos de Destinos & Hotelaria ─────────────────────────────────

export interface DestinationSectionItem {
 id?: string;
 title: string;
 description?: string;
 image_url?: string;
 badge?: string;
}

export interface DestinationSection {
 id: string;
 type: "photo_text" | "title_media_carousel" | "highlights_grid" | "gastronomy_guide" | "travel_tips_cards" | "faq_accordion";
 title: string;
 subtitle?: string;
 content_text?: string;
 layout_variant?: "left" | "right" | "full";
 media_urls?: string[];
 items?: DestinationSectionItem[];
}

export interface DestinationAttraction {
 id: string;
 name: string;
 category: string;
 description: string;
 image_url?: string;
 recommended_duration?: string;
 ticket_required?: boolean;
}

export interface DestinationReview {
 id: string;
 author_name: string;
 author_avatar_url?: string;
 author_city?: string;
 rating: number; // 1 a 5
 travel_month_year?: string;
 comment: string;
 verified: boolean;
}

export interface DestinationDTO {
 id: string;
 store_id: string | null;
 name: string;
 slug?: string | null;
 country: string;
 city: string;
 state: string;
 region?: string | null;
 description?: string | null;
 best_season?: string | null;
 iata_gateway?: string | null;
 timezone?: string | null;
 climate_type?: string | null;
 weather_summary?: string | null;
 cover_image_url?: string | null;
 gallery_urls: string[];
 tags: string[];
 sections: DestinationSection[];
 attractions: DestinationAttraction[];
 reviews: DestinationReview[];
 average_rating: number;
 reviews_count: number;
 highlights: string[];
 gastronomy_tip?: string | null;
 travel_tip?: string | null;
 seo_title?: string | null;
 seo_description?: string | null;
 seo_keywords?: string[];
 latitude?: number | null;
 longitude?: number | null;
 is_active: boolean;
 created_at: string;
 updated_at: string;
 hotels_count?: number;
}

export interface HotelRoomCategory {
 id: string;
 name: string;
 description?: string;
 capacity_adults: number;
 capacity_children: number;
 max_guests: number;
 bedding?: string;
 size_m2?: number;
 daily_rate_reference_cents?: number;
 amenities?: string[];
 cover_photo_url?: string;
 photos?: string[];
}

export interface HotelPolicies {
 check_in_time?: string;
 check_out_time?: string;
 children_policy?: string;
 pet_friendly?: boolean;
 pet_policy?: string;
 cancellation_policy?: string;
 voltage?: string;
 accessibility_pcd?: boolean;
 smoking_policy?: string;
}

export interface HotelRestaurant {
 name: string;
 cuisine: string;
 regime: string;
}

export interface HotelStructure {
 pools_count?: number;
 beach_setup?: string;
 kids_club?: boolean;
 kids_club_details?: string;
 spa?: boolean;
 spa_brand?: string;
 gym?: boolean;
 sports?: string[];
 restaurants?: HotelRestaurant[];
}

export interface HotelBankDTO {
 id: string;
 store_id: string | null;
 destination_id?: string | null;
 destination_name?: string | null;
 name: string;
 city: string;
 state?: string | null;
 country: string;
 stars: number;
 regime_options: string[];
 description?: string | null;
 bio_bullets?: string[];
 highlights?: Array<{ label: string; imageUrl?: string }>;
 badges?: string[];
 photos?: string[];
 cover_photo_url?: string | null;
 website?: string | null;
 phone?: string | null;
 internal_rating: number;
 address?: string | null;
 airport_distance?: string | null;
 google_maps_url?: string | null;
 location_lat?: number | null;
 location_lng?: number | null;
 max_installments?: number | null;
 room_categories?: HotelRoomCategory[];
 policies?: HotelPolicies;
 structure?: HotelStructure;
 tags?: string[];
 is_active: boolean;
 created_at: string;
 updated_at: string;
}

export interface HotelMediaDTO {
 id: string;
 hotel_id: string;
 category: "facade" | "rooms" | "pool" | "leisure" | "gastronomy" | "spa" | "general";
 media_type: "image" | "video" | "virtual_tour";
 url: string;
 caption?: string | null;
 display_order: number;
 is_featured: boolean;
 created_at: string;
}

export interface HotelAmenityDTO {
 id: string;
 hotel_id: string;
 amenity_key: string;
 name: string;
 category: string;
 is_highlight: boolean;
 is_paid: boolean;
 created_at: string;
}

// ─── 1. SERVIÇOS DE DESTINOS TURÍSTICOS ──────────────────────────────────────

export const listDestinations = createServerFn({ method: "GET" }).handler(async () => {
 const db = getServerClient();
 const identity = await getServerIdentity().catch(() => null);
 const effectiveStoreId = identity?.store_id;

 let query = db
 .from("destinations")
 .select("*, hotels_bank(count)")
 .order("name", { ascending: true });

 if (effectiveStoreId) {
 query = query.or(`store_id.eq.${effectiveStoreId},store_id.is.null`);
 }

 const { data, error } = await query;
 if (error) {
 throw new Error(`[travel-catalog:listDestinations] Falha ao consultar destinations: ${error.message} (code: ${error.code})`);
 }

 return (data || []).map((row: any) => ({
 ...row,
 city: row.city || row.name || "",
 state: row.state || row.region || "SC",
 gallery_urls: row.gallery_urls || [],
 tags: row.tags || [],
 sections: Array.isArray(row.sections) ? row.sections : [],
 attractions: Array.isArray(row.attractions) ? row.attractions : [],
 reviews: Array.isArray(row.reviews) ? row.reviews : [],
 average_rating: Number(row.average_rating) || 5.0,
 reviews_count: Number(row.reviews_count) || (Array.isArray(row.reviews) ? row.reviews.length : 0),
 highlights: row.highlights || [],
 hotels_count: row.hotels_bank?.[0]?.count || 0,
 })) as DestinationDTO[];
});

export const getDestinationById = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data: { id } }) => {
 const db = getServerClient();
 const { data, error } = await db
 .from("destinations")
 .select("*")
 .eq("id", id)
 .maybeSingle();

 if (error) throw new Error(error.message);
 if (!data) throw new Error("Destino não encontrado.");
 return {
 ...data,
 city: data.city || data.name || "",
 state: data.state || data.region || "SC",
 gallery_urls: data.gallery_urls || [],
 tags: data.tags || [],
 sections: Array.isArray(data.sections) ? data.sections : [],
 attractions: Array.isArray(data.attractions) ? data.attractions : [],
 reviews: Array.isArray(data.reviews) ? data.reviews : [],
 average_rating: Number(data.average_rating) || 5.0,
 reviews_count: Number(data.reviews_count) || (Array.isArray(data.reviews) ? data.reviews.length : 0),
 highlights: data.highlights || [],
 } as DestinationDTO;
 });

export const createDestination = createServerFn({ method: "POST" })
 .validator(
 z.object({
 name: z.string().min(2, "Nome do destino deve ter pelo menos 2 caracteres."),
 country: z.string().default("Brasil"),
 city: z.string().optional(),
 state: z.string().default("SC"),
 region: z.string().optional(),
 description: z.string().optional(),
 best_season: z.string().optional(),
 iata_gateway: z.string().optional(),
 timezone: z.string().optional(),
 climate_type: z.string().optional(),
 weather_summary: z.string().optional(),
 cover_image_url: z.string().optional(),
 gallery_urls: z.array(z.string()).optional(),
 tags: z.array(z.string()).optional(),
 sections: z.array(z.any()).optional(),
 attractions: z.array(z.any()).optional(),
 reviews: z.array(z.any()).optional(),
 highlights: z.array(z.string()).optional(),
 gastronomy_tip: z.string().optional(),
 travel_tip: z.string().optional(),
 seo_title: z.string().optional(),
 seo_description: z.string().optional(),
 seo_keywords: z.array(z.string()).optional(),
 })
 )
 .handler(async ({ data }) => {
 const db = getServerClient();
 const { store_id, id: profile_id } = await getServerIdentity();
 if (!store_id) throw new Error("Nenhuma loja ativa selecionada.");

 const slug = data.name
 .toLowerCase()
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g, "")
 .replace(/[^a-z0-9]+/g, "-")
 .replace(/(^-|-$)+/g, "");

 const reviews = data.reviews || [];
 const avgRating = reviews.length > 0 
 ? Number((reviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 5), 0) / reviews.length).toFixed(2))
 : 5.0;

 const city = data.city?.trim() || data.name.trim();
 const state = data.state?.trim() || data.region?.trim() || "SC";

 const { data: inserted, error } = await db
 .from("destinations")
 .insert({
 store_id,
 created_by_profile_id: profile_id,
 name: data.name.trim(),
 slug,
 country: data.country.trim(),
 city,
 state,
 region: state,
 description: data.description?.trim() || null,
 best_season: data.best_season?.trim() || null,
 iata_gateway: data.iata_gateway?.trim() || null,
 timezone: data.timezone?.trim() || "America/Sao_Paulo (UTC-3)",
 climate_type: data.climate_type?.trim() || "Tropical / Subtropical",
 weather_summary: data.weather_summary?.trim() || null,
 cover_image_url: data.cover_image_url || null,
 gallery_urls: data.gallery_urls || [],
 tags: data.tags || [],
 sections: data.sections || [],
 attractions: data.attractions || [],
 reviews,
 average_rating: avgRating,
 reviews_count: reviews.length,
 highlights: data.highlights || [],
 gastronomy_tip: data.gastronomy_tip?.trim() || null,
 travel_tip: data.travel_tip?.trim() || null,
 seo_title: data.seo_title?.trim() || null,
 seo_description: data.seo_description?.trim() || null,
 seo_keywords: data.seo_keywords || [],
 is_active: true,
 })
 .select()
 .single();

 if (error) throw new Error(error.message);
 return inserted as DestinationDTO;
 });

export const updateDestination = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid(),
 name: z.string().min(2).optional(),
 country: z.string().optional(),
 city: z.string().optional(),
 state: z.string().optional(),
 region: z.string().optional(),
 description: z.string().optional(),
 best_season: z.string().optional(),
 iata_gateway: z.string().optional(),
 timezone: z.string().optional(),
 climate_type: z.string().optional(),
 weather_summary: z.string().optional(),
 cover_image_url: z.string().optional(),
 gallery_urls: z.array(z.string()).optional(),
 tags: z.array(z.string()).optional(),
 sections: z.array(z.any()).optional(),
 attractions: z.array(z.any()).optional(),
 reviews: z.array(z.any()).optional(),
 highlights: z.array(z.string()).optional(),
 gastronomy_tip: z.string().optional(),
 travel_tip: z.string().optional(),
 seo_title: z.string().optional(),
 seo_description: z.string().optional(),
 seo_keywords: z.array(z.string()).optional(),
 is_active: z.boolean().optional(),
 })
 )
 .handler(async ({ data }) => {
 const db = getServerClient();
 const { store_id } = await getServerIdentity();
 const { id, ...updates } = data;

 // Recalcular médias de reviews se atualizados
 const patchPayload: Record<string, any> = { ...updates };
 if (updates.reviews) {
 patchPayload.reviews_count = updates.reviews.length;
 patchPayload.average_rating = updates.reviews.length > 0
 ? Number((updates.reviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 5), 0) / updates.reviews.length).toFixed(2))
 : 5.0;
 }
 if (updates.state && !updates.region) {
 patchPayload.region = updates.state;
 }

 const { data: updated, error } = await db
 .from("destinations")
 .update({ ...patchPayload, updated_at: new Date().toISOString() })
 .eq("id", id)
 .eq("store_id", store_id)
 .select()
 .single();

 if (error) throw new Error(error.message);
 return updated as DestinationDTO;
 });

export const deleteDestination = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 const db = getServerClient();
 const { store_id } = await getServerIdentity();

 const { error } = await db
 .from("destinations")
 .delete()
 .eq("id", id)
 .eq("store_id", store_id);

 if (error) throw new Error(error.message);
 return { success: true };
 });

// ─── 2. SERVIÇOS DO BANCO DE HOTÉIS & RESORTS ───────────────────────────────

export const ListHotelsBankSchema = z
  .object({
    search: z.string().optional(),
    query: z.string().optional(),
    destination_id: z.string().optional(),
    destinationId: z.string().optional(),
  })
  .optional();

export const listHotelsBank = createServerFn({ method: "GET" })
  .validator(ListHotelsBankSchema)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);
    const effectiveStoreId = identity?.store_id;

    let query = db
      .from("hotels_bank")
      .select("*, destinations(name)")
      .order("name", { ascending: true });

    if (effectiveStoreId) {
      query = query.or(`store_id.eq.${effectiveStoreId},store_id.is.null`);
    }

    const destId = data?.destination_id || data?.destinationId;
    if (destId) {
      query = query.eq("destination_id", destId);
    }

    const sTerm = data?.search?.trim() || data?.query?.trim();
    if (sTerm) {
      const s = `%${sTerm}%`;
      query = query.or(`name.ilike.${s},city.ilike.${s},state.ilike.${s}`);
    }

    const { data: rows, error } = await query;
    if (error) {
      throw new Error(`[travel-catalog:listHotels] Falha ao consultar hotels_bank: ${error.message} (code: ${error.code})`);
    }

    return (rows || []).map((row: any) => ({
      ...row,
      destination_name: row.destinations?.name || null,
      regime_options: row.regime_options || ["All Inclusive"],
      bio_bullets: row.bio_bullets || [],
      highlights: Array.isArray(row.highlights) ? row.highlights : [],
      badges: row.badges || [],
      photos: row.photos || [],
      room_categories: Array.isArray(row.room_categories) ? row.room_categories : [],
      policies: row.policies && typeof row.policies === "object" ? row.policies : {},
      structure: row.structure && typeof row.structure === "object" ? row.structure : {},
      tags: row.tags || [],
    })) as HotelBankDTO[];
  });

export const searchHotelsBank = listHotelsBank;

export const getHotelById = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data: { id } }) => {
 const db = getServerClient();
 const { data, error } = await db
 .from("hotels_bank")
 .select("*, destinations(name)")
 .eq("id", id)
 .maybeSingle();

 if (error) throw new Error(error.message);
 if (!data) throw new Error("Hotel não encontrado.");

 return {
 ...data,
 destination_name: data.destinations?.name || null,
 regime_options: data.regime_options || ["All Inclusive"],
 bio_bullets: data.bio_bullets || [],
 highlights: Array.isArray(data.highlights) ? data.highlights : [],
 badges: data.badges || [],
 photos: data.photos || [],
 room_categories: Array.isArray(data.room_categories) ? data.room_categories : [],
 policies: data.policies && typeof data.policies === "object" ? data.policies : {},
 structure: data.structure && typeof data.structure === "object" ? data.structure : {},
 tags: data.tags || [],
 } as HotelBankDTO;
 });

export const createHotel = createServerFn({ method: "POST" })
 .validator(
 z.object({
 destination_id: z.string().uuid().optional().nullable(),
 name: z.string().min(2, "Nome do hotel é obrigatório."),
 city: z.string().min(2, "Cidade é obrigatória."),
 state: z.string().optional().nullable(),
 country: z.string().default("Brasil"),
 stars: z.number().int().min(1).max(5).default(4),
 regime_options: z.array(z.string()).default(["All Inclusive"]),
 description: z.string().optional().nullable(),
 bio_bullets: z.array(z.string()).optional(),
 highlights: z.array(z.any()).optional(),
 badges: z.array(z.string()).optional(),
 photos: z.array(z.string()).optional(),
 cover_photo_url: z.string().optional().nullable(),
 website: z.string().optional().nullable(),
 phone: z.string().optional().nullable(),
 internal_rating: z.number().default(4.8),
 address: z.string().optional().nullable(),
 airport_distance: z.string().optional().nullable(),
 google_maps_url: z.string().optional().nullable(),
 location_lat: z.number().optional().nullable(),
 location_lng: z.number().optional().nullable(),
 max_installments: z.number().int().min(1).max(24).default(12),
 room_categories: z.array(z.any()).optional(),
 policies: z.record(z.any()).optional(),
 structure: z.record(z.any()).optional(),
 })
 )
 .handler(async ({ data }) => {
 const db = getServerClient();
 const { store_id, id: profile_id } = await getServerIdentity();
 if (!store_id) throw new Error("Nenhuma loja ativa selecionada.");

 const { data: inserted, error } = await db
 .from("hotels_bank")
 .insert({
 store_id,
 created_by_profile_id: profile_id,
 destination_id: data.destination_id || null,
 name: data.name.trim(),
 city: data.city.trim(),
 state: data.state?.trim() || null,
 country: data.country.trim(),
 stars: data.stars,
 regime_options: data.regime_options,
 description: data.description?.trim() || null,
 bio_bullets: data.bio_bullets || [],
 highlights: data.highlights || [],
 badges: data.badges || ["Eco-friendly", "Pé na Areia"],
 photos: data.photos || [],
 cover_photo_url: data.cover_photo_url || (data.photos && data.photos[0]) || null,
 website: data.website?.trim() || null,
 phone: data.phone?.trim() || null,
 internal_rating: data.internal_rating,
 address: data.address?.trim() || null,
 airport_distance: data.airport_distance?.trim() || null,
 google_maps_url: data.google_maps_url?.trim() || null,
 location_lat: data.location_lat ?? null,
 location_lng: data.location_lng ?? null,
 max_installments: data.max_installments ?? 12,
 room_categories: data.room_categories || [],
 policies: data.policies || {},
 structure: data.structure || {},
 is_active: true,
 })
 .select()
 .single();

 if (error) throw new Error(error.message);
 return inserted as HotelBankDTO;
 });

export const updateHotel = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid(),
 destination_id: z.string().uuid().optional().nullable(),
 name: z.string().min(2).optional(),
 city: z.string().optional(),
 state: z.string().optional().nullable(),
 country: z.string().optional(),
 stars: z.number().int().min(1).max(5).optional(),
 regime_options: z.array(z.string()).optional(),
 description: z.string().optional().nullable(),
 bio_bullets: z.array(z.string()).optional(),
 highlights: z.array(z.any()).optional(),
 badges: z.array(z.string()).optional(),
 photos: z.array(z.string()).optional(),
 cover_photo_url: z.string().optional().nullable(),
 website: z.string().optional().nullable(),
 phone: z.string().optional().nullable(),
 internal_rating: z.number().optional(),
 address: z.string().optional().nullable(),
 airport_distance: z.string().optional().nullable(),
 google_maps_url: z.string().optional().nullable(),
 location_lat: z.number().optional().nullable(),
 location_lng: z.number().optional().nullable(),
 max_installments: z.number().int().min(1).max(24).optional(),
 room_categories: z.array(z.any()).optional(),
 policies: z.record(z.any()).optional(),
 structure: z.record(z.any()).optional(),
 is_active: z.boolean().optional(),
 })
 )
 .handler(async ({ data }) => {
 const db = getServerClient();
 const { store_id } = await getServerIdentity();
 const { id, ...updates } = data;

 const { data: updated, error } = await db
 .from("hotels_bank")
 .update({ ...updates, updated_at: new Date().toISOString() })
 .eq("id", id)
 .eq("store_id", store_id)
 .select()
 .single();

 if (error) throw new Error(error.message);
 return updated as HotelBankDTO;
 });

export const duplicateHotel = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 const db = getServerClient();
 const { store_id, id: profile_id } = await getServerIdentity();
 if (!store_id) throw new Error("Nenhuma loja ativa selecionada.");

 // Busca o hotel original
 const { data: source, error: fetchErr } = await db
 .from("hotels_bank")
 .select("*")
 .eq("id", id)
 .single();

 if (fetchErr || !source) throw new Error("Hotel original não encontrado para duplicação.");

 const { id: _, created_at: __, updated_at: ___, ...rest } = source;
 const { data: duplicated, error: insertErr } = await db
 .from("hotels_bank")
 .insert({
 ...rest,
 name: `${source.name} (Cópia)`,
 store_id,
 created_by_profile_id: profile_id,
 is_active: true,
 })
 .select()
 .single();

 if (insertErr) throw new Error(`Erro ao duplicar hotel: ${insertErr.message}`);
 return duplicated as HotelBankDTO;
 });

export const deleteHotel = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 const db = getServerClient();
 const { store_id } = await getServerIdentity();

 const { error } = await db
 .from("hotels_bank")
 .delete()
 .eq("id", id)
 .eq("store_id", store_id);

 if (error) throw new Error(error.message);
 return { success: true };
 });

// ─── 3. HOTEL MEDIA & AMENITIES CRUD ──────────────────────────────────────────

export const listHotelMedia = createServerFn({ method: "GET" })
  .validator(z.object({ hotel_id: z.string().uuid() }))
  .handler(async ({ data: { hotel_id } }) => {
    const db = getServerClient();
    const { data, error } = await db
      .from("hotel_media")
      .select("*")
      .eq("hotel_id", hotel_id)
      .order("display_order", { ascending: true });

    if (error) throw new Error(`[travel-catalog:listHotelMedia] ${error.message}`);
    return (data || []) as HotelMediaDTO[];
  });

export const saveHotelMedia = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      hotel_id: z.string().uuid(),
      category: z.enum(["facade", "rooms", "pool", "leisure", "gastronomy", "spa", "general"]).default("general"),
      media_type: z.enum(["image", "video", "virtual_tour"]).default("image"),
      url: z.string().url("URL de mídia inválida."),
      caption: z.string().optional().nullable(),
      display_order: z.number().int().default(0),
      is_featured: z.boolean().default(false),
    })
  )
  .handler(async ({ data }) => {
    const db = getServerClient();
    const { store_id } = await getServerIdentity();
    if (!store_id) throw new Error("Nenhuma loja ativa selecionada.");

    if (data.id) {
      const { data: updated, error } = await db
        .from("hotel_media")
        .update({
          category: data.category,
          media_type: data.media_type,
          url: data.url,
          caption: data.caption ?? null,
          display_order: data.display_order,
          is_featured: data.is_featured,
        })
        .eq("id", data.id)
        .eq("hotel_id", data.hotel_id)
        .select()
        .single();
      if (error) throw new Error(`Erro ao atualizar mídia: ${error.message}`);
      return updated as HotelMediaDTO;
    } else {
      const { data: inserted, error } = await db
        .from("hotel_media")
        .insert({
          hotel_id: data.hotel_id,
          category: data.category,
          media_type: data.media_type,
          url: data.url,
          caption: data.caption ?? null,
          display_order: data.display_order,
          is_featured: data.is_featured,
        })
        .select()
        .single();
      if (error) throw new Error(`Erro ao inserir mídia: ${error.message}`);
      return inserted as HotelMediaDTO;
    }
  });

export const deleteHotelMedia = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), hotel_id: z.string().uuid() }))
  .handler(async ({ data: { id, hotel_id } }) => {
    const db = getServerClient();
    const { store_id } = await getServerIdentity();
    if (!store_id) throw new Error("Nenhuma loja ativa selecionada.");

    const { error } = await db
      .from("hotel_media")
      .delete()
      .eq("id", id)
      .eq("hotel_id", hotel_id);

    if (error) throw new Error(`Erro ao excluir mídia: ${error.message}`);
    return { success: true };
  });

export const listHotelAmenities = createServerFn({ method: "GET" })
  .validator(z.object({ hotel_id: z.string().uuid() }))
  .handler(async ({ data: { hotel_id } }) => {
    const db = getServerClient();
    const { data, error } = await db
      .from("hotel_amenities")
      .select("*")
      .eq("hotel_id", hotel_id)
      .order("name", { ascending: true });

    if (error) throw new Error(`[travel-catalog:listHotelAmenities] ${error.message}`);
    return (data || []) as HotelAmenityDTO[];
  });

export const saveHotelAmenities = createServerFn({ method: "POST" })
  .validator(
    z.object({
      hotel_id: z.string().uuid(),
      amenities: z.array(
        z.object({
          amenity_key: z.string().min(1),
          name: z.string().min(1),
          category: z.string().default("general"),
          is_highlight: z.boolean().default(false),
          is_paid: z.boolean().default(false),
        })
      ),
    })
  )
  .handler(async ({ data: { hotel_id, amenities } }) => {
    const db = getServerClient();
    const { store_id } = await getServerIdentity();
    if (!store_id) throw new Error("Nenhuma loja ativa selecionada.");

    const { error: delErr } = await db
      .from("hotel_amenities")
      .delete()
      .eq("hotel_id", hotel_id);

    if (delErr) throw new Error(`Erro ao atualizar comodidades: ${delErr.message}`);

    if (amenities.length === 0) return [];

    const rows = amenities.map((a) => ({
      hotel_id,
      amenity_key: a.amenity_key,
      name: a.name,
      category: a.category,
      is_highlight: a.is_highlight,
      is_paid: a.is_paid,
    }));

    const { data: inserted, error: insErr } = await db
      .from("hotel_amenities")
      .insert(rows)
      .select();

    if (insErr) throw new Error(`Erro ao salvar comodidades: ${insErr.message}`);
    return (inserted || []) as HotelAmenityDTO[];
  });

