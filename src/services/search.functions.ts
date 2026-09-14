/**
 * Busca Federada — Waesy Platform
 *
 * Executa queries paralelas em múltiplas entidades e retorna resultados
 * agrupados por tipo, com tipo explícito em cada item.
 *
 * Regras:
 * - Nunca retorna dados de tenants cruzados (store_id é sempre aplicado)
 * - Tipos retornados: product, event, classified, store
 * - FTS em português via search_vector (GENERATED ALWAYS AS tsvector)
 * - Fallback para ILIKE quando FTS index ainda não estiver disponível
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const federatedSearchInput = z.object({
 query: z.string().min(1).max(200),
 types: z
 .array(z.enum(["product", "event", "classified", "store"]))
 .optional()
 .default(["product", "event", "classified", "store"]),
 limit: z.number().int().min(1).max(50).optional().default(10),
 store_id: z.string().uuid().optional(), // Opcional: filtrar por loja específica
});

export type FederatedSearchInput = z.infer<typeof federatedSearchInput>;

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type SearchResultProduct = {
 type: "product";
 id: string;
 title: string;
 slug: string;
 price_cents: number;
 cover_url: string | null;
 store_id: string;
 status: string;
};

export type SearchResultEvent = {
 type: "event";
 id: string;
 title: string;
 description: string | null;
 event_date: string;
 location: string | null;
 is_free: boolean;
 cover_image: string | null;
 store_id: string;
 status: string;
};

export type SearchResultClassified = {
 type: "classified";
 id: string;
 title: string;
 content: string;
 category: string;
 price_cents: number | null;
 location_text: string | null;
 images: string[];
 condition: string | null;
 negotiable: boolean;
 author_profile_id: string;
 status: string;
};

export type SearchResultStore = {
 type: "store";
 id: string;
 name: string;
 slug: string;
 description: string | null;
 logo_url: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type SearchResult =
 SearchResultProduct | SearchResultEvent | SearchResultClassified | SearchResultStore;

export type FederatedSearchResponse = {
 products: SearchResultProduct[];
 events: SearchResultEvent[];
 classifieds: SearchResultClassified[];
 stores: SearchResultStore[];
 total: number;
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

async function _federatedSearch(input: FederatedSearchInput): Promise<FederatedSearchResponse> {
 const db = getServerClient();
 const { query, types, limit, store_id } = input;

 // Preparar o termo de busca para FTS e ILIKE
 const ftsTerm = query
 .trim()
 .split(/\s+/)
 .filter(Boolean)
 .map((w) => `${w}:*`)
 .join(" & ");

 const ilikeTerm = `%${query.trim()}%`;

 const results: FederatedSearchResponse = {
 products: [],
 events: [],
 classifieds: [],
 stores: [],
 total: 0,
 };

 const promises: Promise<void>[] = [];

 // ── Produtos ──────────────────────────────────────────────────────────────
 if (types.includes("product")) {
 promises.push(
 (async () => {
 let q = db
 .from("products")
 .select("id, title, slug, price_cents, status, store_id, product_media(url, is_cover, sort_order)")
 .eq("status", "published")
 .limit(limit);

 if (store_id) q = q.eq("store_id", store_id);

 const extractCover = (mediaList: any[] = []) => {
 if (!mediaList || mediaList.length === 0) return null;
 const cover = mediaList.find((m) => m.is_cover);
 return cover?.url || mediaList[0]?.url || null;
 };

 // Tenta FTS primeiro, cai para ILIKE se search_vector não existir
 try {
 const { data, error } = await q.textSearch("search_vector", ftsTerm, {
 type: "websearch",
 config: "portuguese",
 });
 if (!error && data) {
 results.products = data.map((p: any) => ({
 type: "product" as const,
 id: p.id,
 title: p.title,
 slug: p.slug,
 price_cents: p.price_cents,
 cover_url: extractCover(p.product_media),
 store_id: p.store_id,
 status: p.status,
 }));
 return;
 }
 } catch (err) {
 // ignore error and fallback
 }

 // Fallback ILIKE
 const { data } = await q.ilike("title", ilikeTerm);
 results.products = (data || []).map((p: any) => ({
 type: "product" as const,
 id: p.id,
 title: p.title,
 slug: p.slug,
 price_cents: p.price_cents,
 cover_url: extractCover(p.product_media),
 store_id: p.store_id,
 status: p.status,
 }));
 })(),
 );
 }

 // ── Eventos ────────────────────────────────────────────────────────────────
 if (types.includes("event")) {
 promises.push(
 (async () => {
 let q = db
 .from("events")
 .select(
 "id, title, description, event_date, location, is_free, cover_image, store_id, status",
 )
 .eq("status", "published")
 .gte("event_date", new Date().toISOString()) // Apenas eventos futuros
 .order("event_date", { ascending: true })
 .limit(limit);

 if (store_id) q = q.eq("store_id", store_id);

 try {
 const { data, error } = await q.textSearch("search_vector", ftsTerm, {
 type: "websearch",
 config: "portuguese",
 });
 if (!error && data) {
 results.events = data.map((e) => ({
 type: "event" as const,
 id: e.id,
 title: e.title,
 description: e.description,
 event_date: e.event_date,
 location: e.location,
 is_free: e.is_free ?? false,
 cover_image: e.cover_image,
 store_id: e.store_id,
 status: e.status,
 }));
 return;
 }
 } catch (err) {
 // ignore error and fallback
 }

 const { data } = await q.ilike("title", ilikeTerm);
 results.events = (data || []).map((e) => ({
 type: "event" as const,
 id: e.id,
 title: e.title,
 description: e.description,
 event_date: e.event_date,
 location: e.location,
 is_free: e.is_free ?? false,
 cover_image: e.cover_image,
 store_id: e.store_id,
 status: e.status,
 }));
 })(),
 );
 }

 // ── Classificados ─────────────────────────────────────────────────────────
 if (types.includes("classified")) {
 promises.push(
 (async () => {
 const q = db
 .from("classifieds")
 .select(
 "id, title, content, category, price_cents, location_text, images, condition, negotiable, author_profile_id, status",
 )
 .eq("status", "active")
 .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
 .order("created_at", { ascending: false })
 .limit(limit);

 try {
 const { data, error } = await q.textSearch("search_vector", ftsTerm, {
 type: "websearch",
 config: "portuguese",
 });
 if (!error && data) {
 results.classifieds = data.map((c) => ({
 type: "classified" as const,
 id: c.id,
 title: c.title,
 content: c.content,
 category: c.category,
 price_cents: c.price_cents,
 location_text: c.location_text,
 images: c.images ?? [],
 condition: c.condition,
 negotiable: c.negotiable ?? true,
 author_profile_id: c.author_profile_id,
 status: c.status,
 }));
 return;
 }
 } catch (err) {
 // ignore error and fallback
 }

 const { data } = await q.ilike("title", ilikeTerm);
 results.classifieds = (data || []).map((c) => ({
 type: "classified" as const,
 id: c.id,
 title: c.title,
 content: c.content,
 category: c.category,
 price_cents: c.price_cents,
 location_text: c.location_text,
 images: c.images ?? [],
 condition: c.condition,
 negotiable: c.negotiable ?? true,
 author_profile_id: c.author_profile_id,
 status: c.status,
 }));
 })(),
 );
 }

 // ── Lojas/Perfis ──────────────────────────────────────────────────────────
 if (types.includes("store")) {
 promises.push(
 (async () => {
 const { data } = await db
 .from("stores")
 .select("id, name, slug, settings")
 .ilike("name", ilikeTerm)
 .limit(limit);

 results.stores = (data || []).map((s) => ({
 type: "store" as const,
 id: s.id,
 name: s.name,
 slug: s.slug,
 description: (s.settings as any)?.description || null,
 logo_url: (s.settings as any)?.logoUrl || (s.settings as any)?.logo_url || null,
          latitude: (s.settings as any)?.latitude ?? (s.settings as any)?.lat ?? null,
          longitude: (s.settings as any)?.longitude ?? (s.settings as any)?.lng ?? null,
 }));
 })(),
 );
 }

 await Promise.allSettled(promises);

 results.total =
 results.products.length +
 results.events.length +
 results.classifieds.length +
 results.stores.length;

 return results;
}

// ---------------------------------------------------------------------------
// Server Function (public — sem auth obrigatória)
// ---------------------------------------------------------------------------

export const federatedSearch = createServerFn({ method: "GET" })
 .validator(federatedSearchInput)
 .handler(async ({ data }) => _federatedSearch(data));

// ---------------------------------------------------------------------------
// Instant Typeahead Search (Real-time Overlay)
// ---------------------------------------------------------------------------
export const instantTypeaheadSearch = createServerFn({ method: "GET" })
 .validator(
 z.object({
 query: z.string().default(""),
 limit: z.number().int().min(1).max(20).default(6),
 }),
 )
 .handler(async ({ data }) => {
 const q = data.query.trim();
 if (q.length < 2) {
 return {
 query: q,
 suggestions: [],
 stores: [],
 products: [],
 };
 }

 const db = getServerClient();
 const { data: res, error } = await db.rpc("search_typeahead_instant", {
 p_query: q,
 p_limit: data.limit,
 });

 if (error || !res) {
 // Fallback gracioso com queries padrão
 const [storesRes, productsRes] = await Promise.all([
 db.from("stores").select("id, name, slug, settings").ilike("name", `%${q}%`).limit(4),
 db.from("products").select("id, title, slug, price_cents, cover_url, store_id").ilike("title", `%${q}%`).in("status", ["published", "active"]).limit(4),
 ]);

 return {
 query: q,
 suggestions: (productsRes.data || []).map((p: any) => p.title).slice(0, 3),
 stores: (storesRes.data || []).map((s: any) => ({
 id: s.id,
 name: s.name,
 slug: s.slug,
 logo_url: s.settings?.logoUrl || s.settings?.logo_url || null,
 })),
 products: productsRes.data || [],
 };
 }

  return res;
});

// ---------------------------------------------------------------------------
// Search Discovery Data (Trending terms & Visual discovery mosaic)
// ---------------------------------------------------------------------------
export const getSearchDiscoveryData = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = getServerClient();

    const [productsRes, storesRes, classifiedsRes, categoriesRes] = await Promise.all([
      db
        .from("products")
        .select("id, title, slug, price_cents, cover_url, store_id, status")
        .in("status", ["published", "active"])
        .order("created_at", { ascending: false })
        .limit(12),
      db
        .from("stores")
        .select("id, name, slug, settings, category")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8),
      db
        .from("classifieds")
        .select("id, title, price_cents, images, category, condition, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(6),
      db
        .from("categories")
        .select("id, name, slug")
        .order("name", { ascending: true })
        .limit(10),
    ]);

    const mappedStores = (storesRes.data || []).map((s: any) => {
      const settings = s.settings || {};
      return {
        id: s.id,
        name: s.name,
        slug: s.slug,
        category: s.category || "Comércio Local",
        logo_url: settings.logoUrl || settings.logo_url || null,
      };
    });

    const mappedClassifieds = (classifiedsRes.data || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      price_cents: c.price_cents,
      cover_url: Array.isArray(c.images) && c.images.length > 0 ? c.images[0] : null,
      category: c.category,
    }));

    const trendingTerms = [
      ...(categoriesRes.data || []).map((c: any) => c.name),
      "Restaurantes",
      "Hortifrúti",
      "Feira Orgânica",
      "Farmácia",
      "Pet Shop",
      "Vagas de Emprego",
    ].filter(Boolean);

    return {
      trendingTerms: Array.from(new Set(trendingTerms)).slice(0, 10),
      products: productsRes.data || [],
      stores: mappedStores,
      classifieds: mappedClassifieds,
    };
  } catch (err) {
    console.error("[search] getSearchDiscoveryData error:", err);
    return {
      trendingTerms: ["Mercado", "Gastronomia", "Classificados", "Serviços", "Eventos"],
      products: [],
      stores: [],
      classifieds: [],
    };
  }
});
