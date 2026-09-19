/**
 * Catalog server functions Commerce (BFF boundary)
 *
 * ALL data access to Supabase happens here, inside createServerFn().
 * Components receive DTOs, never raw Supabase rows.
 * Commercial calculations (price, stock) happen here — never in the client.
 *
 * If Supabase is not configured, returns `{ status: "unconfigured" }`.
 * If the store has no data, returns `{ status: "empty" }`.
 * Never returns fabricated/mock data.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getAnonServerClient, getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { logSystemError } from "@/lib/logger";
import { withDataPayload } from "./cart-helpers";
import type {
 ProductListResult,
 ProductCardDTO,
 CategoryListResult,
 CategoryDTO,
 StoreConfigResult,
 StoreConfigDTO,
 AnnouncementDTO,
 BenefitDTO,
 HeroBannerDTO,
 CatalogResult,
} from "@/types/catalog";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { resolveTenantStoreId } from "@/lib/tenant.server";

/**
 * Helper to map Supabase joined row into ProductCardDTO(s).
 * Explodes product variations into distinct cards based on the primary attribute (e.g., 'Cor').
 */
function explodeProductToCards(row: any): ProductCardDTO[] {
 const mediaList = Array.isArray(row.product_media || row.media)
 ? [...(row.product_media || row.media)].sort((a, b) => a.sort_order - b.sort_order)
 : [];

 const basePrice = row.price_cents ?? row.priceCents;
 const compareAt = row.compare_at_cents ?? row.compareAtCents ?? null;

 const variants = Array.isArray(row.product_variants || row.variants)
 ? row.product_variants || row.variants
 : [];
 const activeVariants = variants.filter((v: any) => v.status === "active");

 const buildStandardCard = (
 variantsToConsider: any[],
 cover: any,
 hover: any,
 variantId?: string,
 variantName?: string,
 ): ProductCardDTO => {
 let isOutOfStock = true;
 let isBackorderAvailable = false;
 let backorderLeadTimeDays: number | undefined;
 let displayPrice = basePrice;

 if (variantsToConsider.length > 0) {
 const hasRealStock = variantsToConsider.some(
 (v: any) => Math.max(0, v.stock_on_hand || 0) > 0,
 );
 const hasBackorder = variantsToConsider.some(
 (v: any) => Math.max(0, v.stock_on_hand || 0) <= 0 && v.allow_backorder === true,
 );

 isOutOfStock = !hasRealStock && !hasBackorder;
 // Only flag backorder when truly out of real stock but backorder is possible
 isBackorderAvailable = !hasRealStock && hasBackorder;

 if (isBackorderAvailable) {
 // Use the lowest lead time among backorder variants to surface to the user
 const leadTimes = variantsToConsider
 .filter((v: any) => v.allow_backorder === true && (v.backorder_lead_time_days ?? 0) > 0)
 .map((v: any) => v.backorder_lead_time_days as number);
 if (leadTimes.length > 0) {
 backorderLeadTimeDays = Math.min(...leadTimes);
 }
 }

 const variantsForPrice = hasRealStock
 ? variantsToConsider.filter((v: any) => Math.max(0, v.stock_on_hand || 0) > 0)
 : hasBackorder
 ? variantsToConsider.filter((v: any) => v.allow_backorder === true)
 : variantsToConsider;

 if (variantsForPrice.length > 0) {
 const minPrice = Math.min(
 ...variantsForPrice.map((v: any) => v.price_override_cents ?? basePrice),
 );
 if (minPrice < displayPrice) {
 displayPrice = minPrice;
 }
 }
 }

 return {
 id: row.id,
 slug: row.slug,
 title: row.title,
 brand: row.brand ?? null,
 priceCents: displayPrice,
 compareAtCents: compareAt,
 coverUrl: cover?.url ?? null,
 coverAlt: cover?.alt ?? null,
 hoverUrl: hover?.url ?? null,
 isOutOfStock,
 isBackorderAvailable,
 backorderLeadTimeDays,
 publishedAt: row.published_at ?? null,
 variantId,
 variantName,
 attributes: row.attributes ?? {},
 };
 };

 if (activeVariants.length === 0) {
 return [buildStandardCard([], mediaList[0] ?? null, mediaList[1] ?? null)];
 }

 // Find primary grouping attribute (prioritize 'Cor' / 'Color', else fallback to first)
 let groupingKey: string | null = null;
 const firstVariantAttrs = activeVariants[0].attributes;
 if (firstVariantAttrs) {
 const keys = Object.keys(firstVariantAttrs);
 if (keys.length > 0) {
 groupingKey =
 keys.find((k) => k.toLowerCase() === "cor" || k.toLowerCase() === "color") || keys[0];
 }
 }

 // If no attributes to group by, return a single card
 if (!groupingKey) {
 return [buildStandardCard(activeVariants, mediaList[0] ?? null, mediaList[1] ?? null)];
 }

 const groups = new Map<string, any[]>();
 for (const v of activeVariants) {
 const val = v.attributes?.[groupingKey];
 if (val === undefined || val === null) continue;
 const cleanVal = String(val).trim();
 if (!groups.has(cleanVal)) groups.set(cleanVal, []);
 groups.get(cleanVal)!.push(v);
 }

 if (groups.size === 0) {
 return [buildStandardCard(activeVariants, mediaList[0] ?? null, mediaList[1] ?? null)];
 }

 const cards: ProductCardDTO[] = [];
 for (const [groupVal, groupVariants] of groups.entries()) {
 const variantIdsInGroup = new Set(groupVariants.map((v) => v.id));
 const groupMedia = mediaList.filter((m) => m.variant_id && variantIdsInGroup.has(m.variant_id));
 const cover = groupMedia[0] || mediaList[0] || null;
 const hover = groupMedia[1] || mediaList[1] || null;
 const mainVariant =
 groupVariants.find((v) => (v.stock_on_hand || 0) > 0 || v.allow_backorder === true) ||
 groupVariants[0];

 cards.push(buildStandardCard(groupVariants, cover, hover, mainVariant.id, groupVal));
 }

 return cards;
}

// ---------------------------------------------------------------------------
// listPublishedProducts
// ---------------------------------------------------------------------------

export const listPublishedProducts = createServerFn({ method: "GET" })
 .validator(
 z
 .object({
 limit: z.number().int().min(1).max(50).default(20),
 cursor: z.string().uuid().optional(),
 categorySlug: z.string().optional(),
 sort: z.enum(["newest", "price_asc", "price_desc", "in_stock"]).default("newest"),
 minCents: z.number().int().min(0).optional(),
 maxCents: z.number().int().min(0).optional(),
 niche: z.string().optional(),
 attributes: z.record(z.string()).optional(),
 })
 .default({}),
 )
 .handler(async ({ data: params }) => {
 try {
 const db = getAnonServerClient();
      let storeId = await resolveTenantStoreId();

      if (!storeId) {
        const { data: rootStore } = await db
          .from("stores")
          .select("id")
          .eq("is_platform_root", true)
          .limit(1)
          .maybeSingle();
        storeId = rootStore?.id || null;
      }

      if (!storeId) {
        return { status: "ok", data: [] };
      }

 const selectQuery = params.categorySlug
 ? `id, slug, title, brand, price_cents, compare_at_cents, published_at, attributes,
 product_media(url, alt, sort_order),
 product_categories!inner(categories!inner(slug)),
 product_variants!inner(status, price_override_cents, stock_on_hand, attributes, allow_backorder, backorder_lead_time_days)`
 : `id, slug, title, brand, price_cents, compare_at_cents, published_at, attributes,
 product_media(url, alt, sort_order),
 product_variants!inner(status, price_override_cents, stock_on_hand, attributes, allow_backorder, backorder_lead_time_days)`;

 // Determine sort order — price sorting must be done post-fetch since effective price
 // depends on variant override logic (server-calculated, never trusted from client)
 const dbOrderField =
 params.sort === "price_asc" || params.sort === "price_desc"
 ? "price_cents" // approximate — fine-tuned after mapping
 : "published_at";
 const dbOrderAsc = params.sort === "price_asc";

 let query = db
 .from("products")
 .select(selectQuery)
 .eq("store_id", storeId)
 .eq("status", "published")
 .order(dbOrderField, { ascending: dbOrderAsc })
 .limit(params.limit * 2); // fetch more to allow client-side re-sort after mapping

 // Para a lógica de variantes funcionarem com !inner, temos que garantir que estão ativas e com estoque
 query = query.eq("product_variants.status", "active");

 // Applica filtro de nicho via JSONB no nível do produto
 if (params.niche) {
 query = query.contains("attributes", { tipo: params.niche });
 }

 // Applica filtro de atributos dinâmicos (variações), se houver
 if (params.attributes && Object.keys(params.attributes).length > 0) {
 query = query.contains("product_variants.attributes", params.attributes);
 // Só retorna se a variação Específica que deu match tiver estoque ou permitir encomenda
 query = query.or("stock_on_hand.gt.0,allow_backorder.eq.true", {
 referencedTable: "product_variants",
 });
 }

 if (params.categorySlug) {
 query = query.eq("product_categories.categories.slug", params.categorySlug);
 }

 // Price range filter (applied on base price_cents — server enforced)
 if (params.minCents != null) {
 query = query.gte("price_cents", params.minCents);
 }
 if (params.maxCents != null) {
 query = query.lte("price_cents", params.maxCents);
 }

 if (params.cursor) {
 query = query.lt("id", params.cursor);
 }

 const { data, error } = await query;

 if (error) {
 console.error(
 "[catalog.functions] listPublishedProducts:",
 error instanceof Error ? error.message : String(error),
 );
 throw new Error("Não foi possível carregar os produtos.");
 }

 if (!data || data.length === 0) {
 return { status: "empty" };
 }

 let products: ProductCardDTO[] = data.flatMap(explodeProductToCards);

 // --- PHASE 9: ADS ENGINE HIGHLIGHTS ---
 // Fetch active campaigns for the products in this page
 const productIds = Array.from(new Set(products.map((p) => p.id)));
 if (productIds.length > 0) {
 const { data: adsData } = await db
 .from("ad_campaigns")
 .select("product_id")
 .in("product_id", productIds)
 .eq("status", "active");

 if (adsData && adsData.length > 0) {
 const boostedIds = new Set(adsData.map((ad) => ad.product_id));
 products = products.map((p) => ({
 ...p,
 isBoosted: boostedIds.has(p.id),
 }));
 }
 }

 // Post-map sort for price (uses effective price from variant, not DB price_cents)
 if (params.sort === "price_asc") {
 products = products.sort((a, b) => a.priceCents - b.priceCents);
 } else if (params.sort === "price_desc") {
 products = products.sort((a, b) => b.priceCents - a.priceCents);
 } else if (params.sort === "in_stock") {
 products = products.filter((p) => !p.isOutOfStock);
 } else if (params.sort === "newest") {
 // Ensure boosted products appear first when sorting by newest/default
 products = products.sort((a, b) => {
 if (a.isBoosted && !b.isBoosted) return -1;
 if (!a.isBoosted && b.isBoosted) return 1;
 return 0; // fallback to DB original order
 });
 }

 // Trim to requested limit after sorting
 products = products.slice(0, params.limit);

 return { status: "ok", data: products };
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError) {
 return {
 status: "unconfigured",
 reason: "Nossa vitrine está passando por uma rápida atualização técnica.",
 };
 }
 logSystemError({
 route: "catalog.getStoreCatalog",
 error: e,
 schemaName: "public",
 tableName: "products",
 contractName: "getStoreCatalog",
 });
 return {
 status: "error",
 message:
 e instanceof Error
 ? e.message
 : "Erro inesperado ao carregar produtos.",
 };
 }
 });

// ---------------------------------------------------------------------------
// listPublishedCategories
// ---------------------------------------------------------------------------

export const listPublishedCategories = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const db = getAnonServerClient();
    let storeId = await resolveTenantStoreId();

    if (!storeId) {
      const { data: rootStore } = await db
        .from("stores")
        .select("id")
        .eq("is_platform_root", true)
        .limit(1)
        .maybeSingle();
      storeId = rootStore?.id || null;
    }

    if (!storeId) {
      return {
        status: "ok",
        data: [],
      };
    }

 const { data, error } = await db
 .from("categories")
 .select("id, slug, name, cover_url")
 .eq("store_id", storeId)
 .eq("status", "active")
 .is("parent_id", null) // top-level only for nav
 .order("sort_order", { ascending: true });

 if (error) {
 console.error(
 "[catalog.functions] listPublishedCategories:",
 error instanceof Error ? error.message : String(error),
 );
 throw new Error("Não foi possível carregar as categorias.");
 }

 if (!data || data.length === 0) {
 return [];
 }

 const categories: CategoryDTO[] = data.map((row) => ({
 id: row.id as string,
 slug: row.slug as string,
 name: row.name as string,
 coverUrl: (row.cover_url as string | null) ?? null,
 }));

 return categories;
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError) {
 return {
 status: "unconfigured",
 reason: "As categorias do catálogo estão sendo atualizadas.",
 };
 }
 logSystemError({
 route: "catalog.listPublishedCategories",
 error: e,
 schemaName: "public",
 tableName: "categories",
 contractName: "listPublishedCategories",
 });
 return [];
 }
});

// ---------------------------------------------------------------------------
// _listAvailableAttributes(Dynamic Filters)
// ---------------------------------------------------------------------------

export const listAvailableAttributes = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const db = getAnonServerClient();
 const storeId = await resolveTenantStoreId();

 if (!storeId) {
 return [];
 }

 const { data, error } = await db.rpc("get_available_filters_v1", {
 store_id_param: storeId,
 });

 if (error) {
 console.error(
 "[catalog.functions] listAvailableAttributes RPC error:",
 error instanceof Error ? error.message : String(error),
 );
 return [];
 }

 return (data || []) as { attribute_name: string; attribute_values: string[] }[];
 } catch (e) {
 console.error("[catalog.functions] listAvailableAttributes unexpected error:", e);
 return [];
 }
});

// ---------------------------------------------------------------------------
// getStoreConfig
// ---------------------------------------------------------------------------

export const getStoreConfig = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = getAnonServerClient();

    const { resolveTenantStoreId } = await import("@/lib/tenant.server");
    let storeId = await resolveTenantStoreId();

    if (!storeId) {
      const { resolvePlatformRootStore } = await import("@/services/master.functions");
      const rootStore = await resolvePlatformRootStore(db);
      storeId = rootStore?.id || null;
    }

    if (!storeId) {
      return {
        status: "unconfigured" as const,
        reason: "Nenhuma loja configurada.",
      };
    }

    const { data, error } = await db
      .from("stores")
      .select("id, name, settings")
      .eq("id", storeId)
      .maybeSingle();

    if (error || !data) {
      return {
        status: "unconfigured" as const,
        reason: "Nenhuma loja configurada. Crie a loja no painel de administração.",
      };
    }

    // settings is a JSONB column — validated here (not trusted as-is).
    const settings = (data.settings ?? {}) as Record<string, unknown>;

    const announcements: AnnouncementDTO[] = Array.isArray(settings.announcements)
      ? (settings.announcements as AnnouncementDTO[]).filter(
          (a) => a && typeof a.text === "string" && a.isActive,
        )
      : [];

    const heroBanners: HeroBannerDTO[] = Array.isArray(settings.heroBanners)
      ? (settings.heroBanners as HeroBannerDTO[])
      : [];

    const benefits: BenefitDTO[] = Array.isArray(settings.benefits)
      ? (settings.benefits as BenefitDTO[])
      : [];

    const config: StoreConfigDTO = {
      storeId: data.id as string,
      name: data.name as string,
      logoUrl: typeof settings.logoUrl === "string" ? settings.logoUrl : null,
      faviconUrl: typeof settings.faviconUrl === "string" ? settings.faviconUrl : null,
      announcements,
      heroBanners,
      benefits,
      contactPhone: typeof settings.contactPhone === "string" ? settings.contactPhone : null,
      contactEmail: typeof settings.contactEmail === "string" ? settings.contactEmail : null,
      contactAddress: typeof settings.contactAddress === "string" ? settings.contactAddress : null,
      businessHours: typeof settings.businessHours === "string" ? settings.businessHours : null,
      instagramHandle:
        typeof settings.instagramHandle === "string" ? settings.instagramHandle : null,
    };

    return config;
  } catch (e) {
    if (e instanceof SupabaseUnconfiguredError) {
      return {
        status: "unconfigured" as const,
        reason: "As configurações e dados da loja estão sendo restabelecidos.",
      };
    }
    console.warn("[catalog.functions] getStoreConfig fallback:", e instanceof Error ? e.message : e);
    return {
      status: "unconfigured" as const,
      reason: "Configurações da loja temporariamente indisponíveis.",
    };
  }
});
export const searchProducts = createServerFn({ method: "GET" })
 .validator(z.object({ query: z.string().min(1) }))
 .handler(async ({ data: { query } }) => {
 try {
 const db = await getAnonServerClient();
 const { resolveTenantStoreId } = await import("@/lib/tenant.server");
 const storeId = await resolveTenantStoreId();
 const store = { id: storeId };
 if (!storeId) {
 throw new Error("Loja não encontrada.");
 }

 const selectFields = `
 id,
 title,
 slug,
 brand,
 status,
 published_at,
 priceCents:price_cents,
 compareAtCents:compare_at_cents,
 media:product_media(id, url, alt, sort_order),
 variants:product_variants(status, price_override_cents, stock_on_hand, attributes, allow_backorder)
 `;

 // Stage 1: Full-text search using tsvector (Portuguese stemming + stop words)
 const tsQuery = query
 .trim()
 .split(/\s+/)
 .map((w) => w + ":*")
 .join(" & ");

 const { data: ftsData, error: ftsError } = await db
 .from("products")
 .select(selectFields)
 .eq("store_id", store.id)
 .eq("status", "published")
 .textSearch("search_vector", tsQuery, { type: "websearch", config: "portuguese" })
 .order("published_at", { ascending: false })
 .limit(20);

 // If FTS returns results, use them
 if (!ftsError && ftsData && ftsData.length > 0) {
 const results: ProductCardDTO[] = ftsData.flatMap(explodeProductToCards);
 return results;
 }

 // Stage 2: Trigram fallback — match across title, brand, description
 const likePattern = `%${query}%`;
 const { data: trigramData, error: trigramError } = await db
 .from("products")
 .select(selectFields)
 .eq("store_id", store.id)
 .eq("status", "published")
 .or(
 `title.ilike.${likePattern},brand.ilike.${likePattern},description.ilike.${likePattern}`,
 )
 .order("published_at", { ascending: false })
 .limit(20);

 if (trigramError) {
 throw new Error(trigramError.message);
 }

 if (!trigramData || trigramData.length === 0) {
 return [];
 }

 const results: ProductCardDTO[] = trigramData.flatMap(explodeProductToCards);
 return results;
 } catch (e: unknown) {
 throw new Error((e instanceof Error ? e.message : String(e)) || "Erro desconhecido");
 }
 });

export const getProductsByCollection = createServerFn({ method: "GET" })
  .validator(withDataPayload(z.object({ slug: z.string().min(1) })))
 .handler(async ({ data: { slug } }) => {
 try {
 const db = await getAnonServerClient();
 const { resolveTenantStoreId } = await import("@/lib/tenant.server");
 const storeId = await resolveTenantStoreId();
 const store = { id: storeId };
 if (!storeId) {
 throw new Error("Loja não encontrada.");
 }

 // First try collection
 const { data: collection, error: collError } = await db
 .from("collections")
 .select("id")
 .eq("store_id", store.id)
 .eq("slug", slug)
 .eq("status", "active")
 .single();

 let productIds: string[] = [];

 if (!collError && collection) {
 // Get product_ids from product_collections junction
 const { data: productIdsData } = await db
 .from("product_collections")
 .select("product_id")
 .eq("collection_id", collection.id);
 productIds = productIdsData?.map((row) => row.product_id) || [];
 } else {
 // Fallback: try category
 const { data: category, error: catError } = await db
 .from("categories")
 .select("id")
 .eq("store_id", store.id)
 .eq("slug", slug)
 .single();

 if (catError || !category) {
 return [];
 }

 const { data: productIdsData } = await db
 .from("product_categories")
 .select("product_id")
 .eq("category_id", category.id);
 productIds = productIdsData?.map((row) => row.product_id) || [];
 }

 if (productIds.length === 0) return [];

 const { data, error } = await db
 .from("products")
 .select(
 `id, slug, title, brand, published_at, priceCents:price_cents, compareAtCents:compare_at_cents, status, media:product_media(url, alt, sort_order), variants:product_variants(status, price_override_cents, stock_on_hand, attributes, allow_backorder)`,
 )
 .eq("store_id", store.id)
 .eq("status", "published")
 .in("id", productIds)
 .order("created_at", { ascending: false });

 if (error) throw new Error(error instanceof Error ? error.message : String(error));
 if (!data || data.length === 0) return [];

 const mapped: ProductCardDTO[] = data.flatMap(explodeProductToCards);

 return mapped;
 } catch (e: unknown) {
 throw new Error((e instanceof Error ? e.message : String(e)) || "Erro desconhecido");
 }
 });

export const getPromotionalProducts = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const db = await getAnonServerClient();
 const { resolveTenantStoreId } = await import("@/lib/tenant.server");
 const storeId = await resolveTenantStoreId();
 const store = { id: storeId };
 if (!storeId) {
 return { status: "unconfigured", reason: "Loja não encontrada." };
 }

 const { data, error } = await db
 .from("products")
 .select(
 `id, slug, title, brand, priceCents:price_cents, compareAtCents:compare_at_cents, status, media:product_media(url, alt, sort_order), variants:product_variants(status, price_override_cents, stock_on_hand, attributes, allow_backorder)`,
 )
 .eq("store_id", store.id)
 .eq("status", "published")
 .gt("compare_at_cents", 0)
 .order("created_at", { ascending: false })
 .limit(20);

 if (error) throw new Error(error instanceof Error ? error.message : String(error));
 if (!data || data.length === 0) return [];

 // Filter natively to ensure only actual discounts are returned (compare > price)
 const discountedData = data.filter(
 (item) => item.compareAtCents && item.compareAtCents > item.priceCents,
 );
 if (discountedData.length === 0) return [];

 const mapped: ProductCardDTO[] = discountedData.flatMap(explodeProductToCards);

 return mapped;
 } catch (e: unknown) {
 throw new Error((e instanceof Error ? e.message : String(e)) || "Erro desconhecido");
 }
 });

// ---------------------------------------------------------------------------
// _getProductDetail(PDP)
// ---------------------------------------------------------------------------

export const getProductDetail = createServerFn({ method: "GET" })
  .validator(withDataPayload(z.object({ slug: z.string().min(1) })))
  .handler(async ({ data: { slug } }) => {
    try {
      const db = getAnonServerClient();

      const { resolveTenantStoreId } = await import("@/lib/tenant.server");
      let storeId = await resolveTenantStoreId();

      if (!storeId) {
        // Se nenhum tenant ativo no cookie/subdomínio, busca diretamente qual loja é dona deste produto
        const { data: prodStore } = await db
          .from("products")
          .select("store_id")
          .eq("slug", slug)
          .limit(1)
          .maybeSingle();

        if (prodStore?.store_id) {
          storeId = prodStore.store_id;
        } else {
          const { resolvePlatformRootStore } = await import("@/services/master.functions");
          const rootStore = await resolvePlatformRootStore(db);
          storeId = rootStore?.id || null;
        }
      }

      if (!storeId) {
        return {
          status: "unconfigured" as const,
          reason: "Nenhuma loja foi configurada.",
        };
      }

 // Consulta o produto, mídia e variantes em uma única query
 const { data, error } = await db
 .from("products")
 .select(
 `
 id, slug, title, description, brand, price_cents, compare_at_cents,
 status, seo_title, seo_description, options,
 product_media(id, url, alt, media_type, sort_order),
 product_variants(
 id, sku, price_override_cents, stock_on_hand, attributes, allow_backorder, backorder_lead_time_days, requires_payment_for_backorder,
 product_media(id, url, alt, media_type, sort_order)
 )
 `,
 )
 .eq("store_id", storeId)
 .eq("slug", slug)
 .eq("status", "published")
 .single();

 if (error || !data) {
 return { status: "not_found" };
 }

 // Formatar mídia principal do produto
 const media = (data.product_media || [])
 .sort((a: any, b: any) => a.sort_order - b.sort_order)
 .map((m: any) => ({
 id: m.id,
 url: m.url,
 alt: m.alt,
 mediaType: m.media_type,
 sortOrder: m.sort_order,
 }));

 // Formatar variantes
 const variants = (data.product_variants || []).map((v: any) => {
 // Mídia específica da variante
 const variantMedia = (v.product_media || [])
 .sort((a: any, b: any) => a.sort_order - b.sort_order)
 .map((m: any) => ({
 id: m.id,
 url: m.url,
 alt: m.alt,
 mediaType: m.media_type,
 sortOrder: m.sort_order,
 }));

 // Calcula estoque disponível real: on_hand - reserved
 const availableQty = Math.max(0, v.stock_on_hand || 0);

 return {
 id: v.id,
 sku: v.sku,
 effectivePriceCents: v.price_override_cents ?? data.price_cents,
 availableQty,
 attributes: v.attributes || {},
 media: variantMedia.length > 0 ? variantMedia : media, // Fallback para a mídia do produto
 allowBackorder: v.allow_backorder ?? false,
 backorderLeadTimeDays: v.backorder_lead_time_days ?? 0,
 requiresPaymentForBackorder: v.requires_payment_for_backorder ?? true,
 };
 });

 return {
 status: "ok",
 data: {
 id: data.id,
 slug: data.slug,
 title: data.title,
 description: data.description,
 brand: data.brand,
 options: data.options || [],
 priceCents: data.price_cents,
 compareAtCents: data.compare_at_cents,
 media,
 variants,
 seoTitle: data.seo_title,
 seoDescription: data.seo_description,
 },
 };
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError) {
 return {
 status: "unconfigured",
 reason: "Nossa vitrine está passando por uma rápida atualização técnica.",
 };
 }
 console.error("[catalog.functions] getProductDetail:", e);
 throw new Error("Erro inesperado ao carregar detalhes do produto.");
 }
 });

// ---------------------------------------------------------------------------
// getPublicStoreProfile — public profile (no auth required)
// ---------------------------------------------------------------------------

export interface PublicStoreProfileDTO {
 id: string;
 name: string;
 slug: string;
 description: string | null;
 phone: string | null;
 email: string | null;
 address: string | null;
 city: string | null;
 state: string | null;
 logoUrl: string | null;
 instagramHandle: string | null;
 businessHours: string | null;
 settings?: Record<string, any>;
 type?: string | null;
 category?: string | null;
 pixKey?: string | null;
 paymentInstructions?: string | null;
}

export type PublicStoreProfileResult = CatalogResult<PublicStoreProfileDTO>;

export const getPublicStoreProfile = createServerFn({ method: "GET" })
  .validator(withDataPayload(z.object({ storeId: z.string().optional() })).optional())
 .handler(async ({ data }): Promise<PublicStoreProfileDTO | null> => {
 try {
 const { resolveTenantStoreId } = await import("@/lib/tenant.server");
 let storeIdToUse: string | undefined = data?.storeId;
 if (!storeIdToUse) {
 storeIdToUse = (await resolveTenantStoreId()) ?? undefined;
 }
 if (!storeIdToUse) {
 try {
 const { getIdentity } = await import("@/services/identity.functions");
 const iden = await getIdentity();
 if (iden?.store_id) {
 storeIdToUse = iden.store_id;
 } else if (iden?.id) {
 const { getServerClient } = await import("@/lib/supabase");
 const client = getServerClient();
 const { data: member } = await client
 .from("workspace_members")
 .select("store_id")
 .eq("profile_id", iden.id)
 .order("created_at", { ascending: false })
 .limit(1)
 .maybeSingle();
 if (member?.store_id) {
 storeIdToUse = member.store_id;
 }
 }
 } catch {}
 }
 if (!storeIdToUse) return null;

 const db = getAnonServerClient();
 const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(storeIdToUse);

 let query = db
 .from("stores")
 .select("id, name, slug, description, phone, email, address, city, state, logo_url, settings");

 if (isUuid) {
 query = query.eq("id", storeIdToUse);
 } else {
 query = query.eq("slug", storeIdToUse);
 }

 const { data: store, error } = await query.maybeSingle();

 if (error || !store) {
 return null;
 }

 const settings = (store.settings ?? {}) as Record<string, any>;

 const profile: PublicStoreProfileDTO = {
 id: store.id as string,
 name: store.name as string,
 slug: store.slug as string,
 description: (store.description as string | null) ?? null,
 phone: (store.phone as string | null) ?? null,
 email: (store.email as string | null) ?? null,
 address: (store.address as string | null) ?? null,
 city: (store.city as string | null) ?? null,
 state: (store.state as string | null) ?? null,
 logoUrl: (store.logo_url as string | null) || (typeof settings.logoUrl === "string" ? settings.logoUrl : null) || (typeof settings.logo_url === "string" ? settings.logo_url : null),
 instagramHandle:
 typeof settings.instagramHandle === "string" ? settings.instagramHandle : null,
 businessHours: typeof settings.businessHours === "string" ? settings.businessHours : null,
 settings: {
 ...settings,
 cover_url: settings.cover_url || settings.bannerUrl || null,
 },
 pixKey: typeof settings.pixKey === "string" ? settings.pixKey : null,
 paymentInstructions:
 typeof settings.paymentInstructions === "string" ? settings.paymentInstructions : null,
 };

 return profile;
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError) {
 return null;
 }
 console.warn("[catalog.functions] getPublicStoreProfile:", e);
 return null;
 }
 });

// ---------------------------------------------------------------------------
// getPublicFaqs
// ---------------------------------------------------------------------------

export const getPublicFaqs = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const db = await getAnonServerClient();
 const { resolveTenantStoreId } = await import("@/lib/tenant.server");
 const storeId = await resolveTenantStoreId();
 if (!storeId) return [];

 // 1. Check if store has faqs in settings
 const { data: store } = await db.from("stores").select("settings").eq("id", storeId).single();

 const storeFaqs = store?.settings?.faqs;
 if (Array.isArray(storeFaqs) && storeFaqs.length > 0) {
 return storeFaqs;
 }

 // 2. Check if active experience document has a faq_accordion block
 const { data: doc } = await db
 .from("experience_documents")
 .select("nodes")
 .eq("store_id", storeId)
 .eq("status", "published")
 .limit(1)
 .maybeSingle();

 if (doc?.nodes && Array.isArray(doc.nodes)) {
 const faqBlock = doc.nodes.find(
 (n: any) => n.blockType === "faq_accordion" && n.props?.faqs?.length > 0,
 );
 if (faqBlock?.props?.faqs) {
 return faqBlock.props.faqs;
 }
 }

 return [];
 } catch (e) {
 console.error("[catalog.functions] getPublicFaqs error:", e);
 return [];
 }
});


// ---------------------------------------------------------------------------
// getStorePublicCatalog
// ---------------------------------------------------------------------------

export const getStorePublicCatalog = createServerFn({ method: "GET" })
  .validator(withDataPayload(z.object({ storeId: z.string().optional() })).optional())
 .handler(async ({ data }) => {
 try {
 const db = getAnonServerClient();
 let targetId: string | undefined = data?.storeId;
 if (!targetId) {
 const { resolveTenantStoreId } = await import("@/lib/tenant.server");
 targetId = (await resolveTenantStoreId()) ?? undefined;
 }
 if (!targetId) return { products: [], categories: [] };

 const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId);

 let storeId = targetId;
 if (!isUuid) {
 const { data: st } = await db.from("stores").select("id").eq("slug", targetId).maybeSingle();
 if (st) storeId = st.id;
 }

 const [productsRes, categoriesRes] = await Promise.all([
 db
 .from("products")
 .select(`
 id, title, slug, description, price_cents, compare_at_cents, status,
 product_media(url, alt, sort_order),
 product_option_groups(
 sort_order,
 option_groups(
 id, display_name, internal_name, description, selection_type, min_selections, max_selections, is_required,
 option_values(id, label, description, price_modifier_cents, image_url, is_active, is_default)
 )
 ),
 product_modifier_groups(
 id, title, description, min_selections, max_selections, is_required, sort_order,
 product_modifiers(id, title, price_delta_cents, is_default, is_available, sort_order)
 )
 `)
 .eq("store_id", storeId)
 .eq("status", "published")
 .order("created_at", { ascending: false })
 .limit(60),
 db
 .from("categories")
 .select("id, name, slug")
 .eq("store_id", storeId)
 .order("name", { ascending: true }),
 ]);

 const products = (productsRes.data || []).map((p: any) => {
 const media = Array.isArray(p.product_media)
 ? p.product_media.sort((a: any, b: any) => a.sort_order - b.sort_order)
 : [];
 const optionGroups = (p.product_option_groups || [])
 .map((pog: any) => pog.option_groups)
 .filter(Boolean);
 const modifierGroups = (p.product_modifier_groups || [])
 .filter(Boolean)
 .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
 return {
 id: p.id,
 title: p.title,
 slug: p.slug,
 description: p.description,
 priceCents: p.price_cents,
 compareAtCents: p.compare_at_cents,
 coverUrl: media[0]?.url || null,
 optionGroups,
 modifierGroups,
 hasModifiers: optionGroups.length > 0 || modifierGroups.length > 0,
 };
 });

 return {
 products,
 categories: categoriesRes.data || [],
 };
 } catch (e) {
 console.error("[catalog.functions] getStorePublicCatalog error:", e);
 return { products: [], categories: [] };
 }
 });

export const getCollectionBySlug = createServerFn({ method: "GET" })
  .validator(withDataPayload(z.object({ slug: z.string() })))
 .handler(async ({ data }) => {
 try {
 const db = await getAnonServerClient();

 // 1. Fetch collection metadata
 const { data: collection, error: colError } = await db
 .from("collections")
 .select("id, name, slug, description, cover_url, seo_title, seo_description")
 .eq("slug", data.slug)
 .eq("status", "active")
 .maybeSingle();

 if (colError || !collection) {
 return { collection: null, products: [] };
 }

 // 2. Fetch product IDs linked to this collection
 const { data: links } = await db
 .from("product_collections")
 .select("product_id")
 .eq("collection_id", collection.id)
 .order("sort_order", { ascending: true });

 if (!links || links.length === 0) {
 return { collection, products: [] };
 }

 const productIds = links.map((l: any) => l.product_id);

 // 3. Fetch product data
 const { data: products } = await db
 .from("products")
 .select(`
 id, slug, title, brand, price_cents, compare_at_cents, published_at,
 product_media(url, alt, sort_order),
 product_variants(status, price_override_cents, stock_on_hand, attributes, allow_backorder)
 `)
 .in("id", productIds)
 .eq("status", "published")
 .order("published_at", { ascending: false });

 const mapped: ProductCardDTO[] = (products || []).flatMap(explodeProductToCards);

 return {
 collection,
 products: mapped,
 };
 } catch (e) {
 console.error("[catalog.functions] getCollectionBySlug error:", e);
 return { collection: null, products: [] };
 }
 });

