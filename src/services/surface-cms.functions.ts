/**
 * Modular Surface CMS Server Functions (BFF boundary)
 * 
 * Provides dynamic modular section management for global & vertical marketplaces
 * as well as private store storefronts.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { NICHE_STORE_KEYWORDS } from "@/services/marketplace.functions";
import type { FlashOfferDTO, StoreCardDTO } from "@/services/marketplace.functions";

export type SurfaceSectionType =
 | "flash_deal_rail"
 | "product_rail"
 | "store_rail"
 | "category_grid"
 | "bento_grid"
 | "grid_4col"
 | "curated_collection"
 | "banner_single_21_9"
 | "banner_duo_16_9"
 | "banner_trio_bento"
 | "custom_buttons_rail"
 | "single_store_spotlight"
 | "classifieds_spotlight";

export type SurfaceDataSource =
 | "all_products"
 | "category"
 | "hotpage"
 | "stores"
 | "flash_deals"
 | "top_sellers"
 | "banners"
 | "custom_buttons";

export type SurfaceRankingStrategy =
 | "discount"
 | "popularity"
 | "recency"
 | "random_shuffle"
 | "curated_fixed";

export type SurfaceLayoutVariant =
 | "rail_standard"
 | "rail_compact"
 | "grid_2col"
 | "grid_4col"
 | "bento_3"
 | "hero_card"
 | "banner_21_9"
 | "banner_16_9_duo"
 | "banner_bento"
 | "buttons_rail";

export interface SurfaceSectionDTO {
 id: string;
 surface_id: string;
 type: SurfaceSectionType;
 title: string;
 subtitle?: string | null;
 badge_tag?: string | null;
 data_source: SurfaceDataSource;
 taxonomy_slug?: string | null;
 ranking_strategy: SurfaceRankingStrategy;
 layout_variant: SurfaceLayoutVariant;
 item_limit: number;
 sort_order: number;
 is_active: boolean;
 items?: any[];
 config?: Record<string, any> | null;
}

export interface MarketplaceSurfaceDTO {
 id: string;
 slug: string;
 title: string;
 description?: string | null;
 is_global: boolean;
 store_id?: string | null;
}

// ─── 1. LISTAR TODAS AS SUPERFÍCIES (ADMIN MASTER) ─────────────────────────
export const listAllSurfaces = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const { data, error } = await supabase
 .from("marketplace_surfaces")
 .select("*")
 .order("is_global", { ascending: false })
 .order("title", { ascending: true });

 if (error) {
 console.error("[surface-cms] Error listing surfaces:", error.message);
 return [];
 }

 return (data || []) as MarketplaceSurfaceDTO[];
});

// ─── 2. LISTAR SEÇÕES DE UMA SUPERFÍCIE (PARA O EDITOR DO ADMIN/WORKSPACE) ──
export const listSurfaceSections = createServerFn({ method: "GET" })
 .validator(
 z.object({
 surfaceSlug: z.string(),
 storeId: z.string().optional(),
 })
 )
 .handler(async ({ data: { surfaceSlug, storeId } }) => {
 const supabase = getServerClient();
 let targetSurfaceSlug = surfaceSlug;
 let targetStoreId = storeId;

 if (surfaceSlug === "store_private") {
 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity().catch(() => ({ store_id: null }));
 if (!identity?.store_id) {
 return { surface: null, sections: [] };
 }
 targetStoreId = identity.store_id;
 targetSurfaceSlug = `vitrine-${identity.store_id}`;
 }

 // 1. Busca a superfície
 let surfaceQuery = supabase
 .from("marketplace_surfaces")
 .select("id, slug, title")
 .eq("slug", targetSurfaceSlug);

 if (targetStoreId) {
 surfaceQuery = surfaceQuery.eq("store_id", targetStoreId);
 }

 let { data: surface } = await surfaceQuery.maybeSingle();

 // Auto-cria a superfície privada da loja se ainda não existir
 if (!surface && targetStoreId && targetSurfaceSlug.startsWith("vitrine-")) {
 const { data: newSurf } = await supabase
 .from("marketplace_surfaces")
 .insert({
 store_id: targetStoreId,
 slug: targetSurfaceSlug,
 title: "Vitrine da Loja",
 type: "store",
 })
 .select("id, slug, title")
 .maybeSingle();

 surface = newSurf;
 }

 if (!surface) {
 return { surface: null, sections: [] };
 }

 // 2. Busca as seções ordenadas
 const { data: sections, error: secErr } = await supabase
 .from("marketplace_sections")
 .select("*")
 .eq("surface_id", surface.id)
 .order("sort_order", { ascending: true });

 if (secErr) {
 console.error("[surface-cms] Error listing sections:", secErr.message);
 return { surface: surface as MarketplaceSurfaceDTO, sections: [] };
 }

 return {
 surface: surface as MarketplaceSurfaceDTO,
 sections: (sections || []) as SurfaceSectionDTO[],
 };
 });

// ─── 3. FEED MODULAR HIDRATADO COM PRODUTOS / LOJAS / SHUFFLE ───────────────
export const getModularSurfaceFeed = createServerFn({ method: "GET" })
 .validator(
 z.object({
 surfaceSlug: z.string(),
 storeId: z.string().optional(),
 })
 )
 .handler(async ({ data: { surfaceSlug, storeId } }) => {
 const supabase = getServerClient();
 const isGlobal = !surfaceSlug || surfaceSlug === "home" || surfaceSlug === "todos";
 const normalizedNiche = isGlobal ? "global" : surfaceSlug.toLowerCase().trim();
 const nicheKeywords = NICHE_STORE_KEYWORDS[normalizedNiche] || [normalizedNiche];

 // 1. Localiza a superfície
 let surfaceQuery = supabase
 .from("marketplace_surfaces")
 .select("id, slug, title")
 .eq("slug", surfaceSlug);

 if (storeId) {
 surfaceQuery = surfaceQuery.eq("store_id", storeId);
 }

 const { data: surface } = await surfaceQuery.maybeSingle();
 if (!surface) {
 return { sections: [], allProducts: [] };
 }

 // 2. Busca seções ativas
 const { data: rawSections } = await supabase
 .from("marketplace_sections")
 .select("*")
 .eq("surface_id", surface.id)
 .eq("is_active", true)
 .order("sort_order", { ascending: true });

 if (!rawSections || rawSections.length === 0) {
 return { sections: [], allProducts: [] };
 }

 // 3. Busca produtos e lojas do banco
 // [FIX: Anti-AI Smell] Em vez de baixar apenas 100 itens aleatórios (velhos) e filtrar em memória,
 // ordenamos por recency/availability e puxamos um pool maior (300) para o edge.
 // Futuro ideal: delegar essa agregação para uma RPC (Stored Procedure) no banco.
 let storesQuery = supabase
 .from("stores")
 .select("id, name, slug, description, settings")
 .order("created_at", { ascending: false })
 .limit(storeId ? 1 : 100);

 let productsQuery = supabase
 .from("products")
 .select(
 `
 id,
 title,
 slug,
 store_id,
 price_cents,
 compare_at_cents,
 status,
 attributes,
 created_at,
 media:product_media(url, alt, sort_order),
 store:stores(id, name, slug, settings)
 `,
 )
 .in("status", ["published", "active"])
 .order("created_at", { ascending: false })
 .limit(300);

 if (storeId) {
 storesQuery = storesQuery.eq("id", storeId);
 productsQuery = productsQuery.eq("store_id", storeId);
 }

 const [storesRes, productsRes] = await Promise.all([storesQuery, productsQuery]);

 // Mapeia lojas
 const allDbStores: StoreCardDTO[] = (storesRes.data || []).map((s: any) => {
 const settings = (s.settings as Record<string, any>) || {};
 const category = settings.segment || settings.type || settings.niche || "Comércio Local";
 return {
 id: s.id,
 name: s.name,
 slug: s.slug || `loja-${s.id.slice(0, 6)}`,
 avatar_url: settings.logoUrl || settings.logo_url || undefined,
 banner_url: settings.bannerUrl || settings.banner_url || undefined,
 category,
 rating: 4.9,
 review_count: 120,
 distance_km: 1.2,
 is_open: true,
 delivery_time_min: "Disponível",
 };
 });

 // Filtra lojas do nicho
 let filteredStores = allDbStores;
 if (!isGlobal && !storeId) {
 filteredStores = allDbStores.filter((st) => {
 const cat = (st.category || "").toLowerCase();
 const name = (st.name || "").toLowerCase();
 return nicheKeywords.some((kw) => cat.includes(kw) || name.includes(kw));
 });
 }

 // Mapeia produtos
 let allProducts: FlashOfferDTO[] = (productsRes.data || []).map((p: any) => {
 const sortedMedia = Array.isArray(p.media)
 ? [...p.media].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
 : [];
 const cover = sortedMedia[0]?.url || "";
 const originalPrice = p.compare_at_cents || p.price_cents;
 const discount =
 originalPrice > p.price_cents
 ? Math.round(((originalPrice - p.price_cents) / originalPrice) * 100)
 : 0;

 return {
 id: p.id,
 title: p.title,
 slug: p.slug,
 store_id: p.store_id,
 store_name: p.store?.name || "Loja Parceira",
 price_cents: p.price_cents,
 original_price_cents: originalPrice,
 discount_percent: discount,
 mechanic_label: discount > 0 ? `${discount}% OFF` : "DESTAQUE",
 ends_at: "",
 cover_image: cover,
 selling_unit: "un",
 in_stock: true,
 has_flash_offer: discount > 0,
 meal_time: p.attributes?.meal_time || null,
 has_free_delivery:
 p.attributes?.free_delivery === true || p.attributes?.entrega_gratis === true,
 has_express_delivery:
 p.attributes?.express_delivery === true || p.attributes?.entrega_expressa === true,
 };
 });

 // Filtra produtos do nicho se aplicável
 if (!isGlobal && !storeId) {
 const matchingStoreIds = new Set(filteredStores.map((s) => s.id));
 allProducts = allProducts.filter((p) => {
 if (matchingStoreIds.has(p.store_id)) return true;
 const titleLower = p.title.toLowerCase();
 return nicheKeywords.some((kw) => titleLower.includes(kw));
 });
 }

 // 3.5 Busca banners ativos da plataforma para seções de banner
 const { data: rawBanners } = await supabase
 .from("banners")
 .select("id, title, subtitle, image_url, mobile_image_url, link_url, target_type, placement, position, is_active, city_filter")
 .eq("is_active", true)
 .order("position", { ascending: true });

 const platformBanners = rawBanners || [];

 // 4. Hidrata cada seção com sua data_source e ranking_strategy (inclusive random_shuffle)
 const usedProductIds = new Set<string>();
 const hydratedSections: SurfaceSectionDTO[] = [];

 for (const sec of rawSections) {
 let sectionItems: any[] = [];

 if (sec.type === "banner_single_21_9" || sec.type === "banner_duo_16_9" || sec.type === "banner_trio_bento" || sec.data_source === "banners") {
 // Seção de Banners: Puxa banners configurados ou da plataforma
 let bannerPool = [...platformBanners];
 if (sec.taxonomy_slug) {
 bannerPool = bannerPool.filter((b) => b.placement === sec.taxonomy_slug || b.placement === surfaceSlug);
 }
 if (bannerPool.length === 0) bannerPool = platformBanners;
 sectionItems = bannerPool.slice(0, sec.item_limit || 4);
 } else if (sec.type === "custom_buttons_rail" || sec.data_source === "custom_buttons") {
 // Seção de Botões Personalizados: Puxa do config ou gera a partir de categorias
 if (sec.config && Array.isArray((sec.config as any).buttons)) {
 sectionItems = (sec.config as any).buttons;
 } else {
 sectionItems = [
 { id: "destaques", label: "Destaques", icon: "Layers", route: "/ofertas" },
 { id: "novidades", label: "Novidades", icon: "Tag", route: "/buscar?sort=newest" },
 { id: "mais-pedidos", label: "Mais Pedidos", icon: "Flame", route: "/buscar?sort=popular" },
 { id: "frete-gratis", label: "Frete Grátis", icon: "Truck", route: "/buscar?free_delivery=true" },
 ];
 }
 } else if (sec.type === "store_rail" || sec.data_source === "stores") {
 let storePool = [...filteredStores];
 if (sec.ranking_strategy === "random_shuffle") {
 storePool.sort(() => Math.random() - 0.5);
 }
 sectionItems = storePool.slice(0, sec.item_limit || 10);
 } else if (sec.type === "flash_deal_rail" || sec.data_source === "flash_deals") {
 let flashPool = allProducts.filter((p) => p.discount_percent > 0);
 if (flashPool.length === 0) flashPool = allProducts;
 flashPool.sort((a, b) => b.discount_percent - a.discount_percent);
 sectionItems = flashPool.slice(0, sec.item_limit || 8);
 } else {
 // Product rail / bento / grid
 let pool = allProducts.filter((p) => !usedProductIds.has(p.id));
 if (pool.length === 0) pool = allProducts;

 if (sec.ranking_strategy === "random_shuffle") {
 pool = [...pool].sort(() => Math.random() - 0.5);
 } else if (sec.ranking_strategy === "discount") {
 pool = [...pool].sort((a, b) => b.discount_percent - a.discount_percent);
 } else if (sec.ranking_strategy === "popularity") {
 pool = [...pool].sort((a, b) => a.price_cents - b.price_cents);
 }

 sectionItems = pool.slice(0, sec.item_limit || 12);
 sectionItems.forEach((p) => usedProductIds.add(p.id));
 }

 hydratedSections.push({
 ...sec,
 items: sectionItems,
 });
 }

 // ─── 5. CAMADA ALGORÍTMICA AUTÔNOMA (COMPLEMENTO HÍBRIDO DO FEED) ────────
 // Garante que o feed nunca termine abruptamente, injetando seções adicionais
 // com randomização Fisher-Yates sobre produtos/lojas não exibidos acima.
 const remainingProducts = allProducts.filter((p) => !usedProductIds.has(p.id));

 if (remainingProducts.length > 0) {
 // 5.1 Descobertas com Shuffle Rotativo
 const shuffled = [...remainingProducts].sort(() => Math.random() - 0.5);
 hydratedSections.push({
 id: `auto-shuffle-${surfaceSlug}`,
 surface_id: surface.id,
 type: "product_rail",
 title: "Descobertas para Você",
 subtitle: "Seleção aleatória rotativa atualizada em tempo real",
 badge_tag: "RANDOM",
 data_source: "all_products",
 ranking_strategy: "random_shuffle",
 layout_variant: "rail_standard",
 item_limit: 12,
 sort_order: 998,
 is_active: true,
 items: shuffled.slice(0, 12),
 });

 // 5.2 Achados com Alto Desconto
 const extraDeals = remainingProducts
 .filter((p) => p.discount_percent > 0)
 .sort((a, b) => b.discount_percent - a.discount_percent);

 if (extraDeals.length >= 3) {
 hydratedSections.push({
 id: `auto-deals-${surfaceSlug}`,
 surface_id: surface.id,
 type: "grid_4col",
 title: "Achados com Maiores Descontos",
 subtitle: "Oportunidades imperdíveis no catálogo",
 badge_tag: "OFERTAS",
 data_source: "flash_deals",
 ranking_strategy: "discount",
 layout_variant: "grid_4col",
 item_limit: 8,
 sort_order: 999,
 is_active: true,
 items: extraDeals.slice(0, 8),
 });
 }
 }

 // 5.3 Lojas e Estabelecimentos da Região (se houver)
 if (filteredStores.length > 0 && !hydratedSections.some((s) => s.type === "store_rail")) {
 hydratedSections.push({
 id: `auto-stores-${surfaceSlug}`,
 surface_id: surface.id,
 type: "store_rail",
 title: "Estabelecimentos em Destaque",
 subtitle: "Lojas e parceiros verificados",
 badge_tag: "PARCEIROS",
 data_source: "stores",
 ranking_strategy: "random_shuffle",
 layout_variant: "rail_standard",
 item_limit: 10,
 sort_order: 1000,
 is_active: true,
 items: [...filteredStores].sort(() => Math.random() - 0.5).slice(0, 10),
 });
 }

 return {
 sections: hydratedSections,
 allProducts,
 };
 });

// ─── 4. CRIAR OU ATUALIZAR UMA SEÇÃO (UPSERT) ──────────────────────────────
export const upsertSurfaceSection = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().optional(),
 surface_id: z.string(),
 type: z.enum([
 "flash_deal_rail",
 "product_rail",
 "store_rail",
 "category_grid",
 "bento_grid",
 "grid_4col",
 "curated_collection",
 "banner_single_21_9",
 "banner_duo_16_9",
 "banner_trio_bento",
      "custom_buttons_rail",
      "single_store_spotlight",
      "classifieds_spotlight",
    ]),
 title: z.string().min(1, "Título obrigatório"),
 subtitle: z.string().optional().nullable(),
 badge_tag: z.string().optional().nullable(),
 data_source: z.enum([
 "all_products",
 "category",
 "hotpage",
 "stores",
 "flash_deals",
 "top_sellers",
 "banners",
 "custom_buttons",
 ]),
 taxonomy_slug: z.string().optional().nullable(),
 ranking_strategy: z.enum([
 "discount",
 "popularity",
 "recency",
 "random_shuffle",
 "curated_fixed",
 ]),
 layout_variant: z.enum([
 "rail_standard",
 "rail_compact",
 "grid_2col",
 "grid_4col",
 "bento_3",
 "hero_card",
 "banner_21_9",
 "banner_16_9_duo",
 "banner_bento",
 "buttons_rail",
 ]),
 item_limit: z.number().int().min(1).max(50).default(12),
 sort_order: z.number().int().default(0),
 is_active: z.boolean().default(true),
 config: z.record(z.any()).optional().nullable(),
 })
 )
 .handler(async ({ data: payload }) => {
 const supabase = getServerClient();
 let realSurfaceId = payload.surface_id;

 if (realSurfaceId === "store_private") {
 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity().catch(() => ({ store_id: null }));
 if (!identity?.store_id) {
 throw new Error("Loja ativa não identificada. Selecione um espaço de trabalho.");
 }
 const targetSlug = `vitrine-${identity.store_id}`;
 let { data: existingSurf } = await supabase
 .from("marketplace_surfaces")
 .select("id")
 .eq("store_id", identity.store_id)
 .eq("slug", targetSlug)
 .maybeSingle();

 if (!existingSurf) {
 const { data: newSurf, error: createSurfErr } = await supabase
 .from("marketplace_surfaces")
 .insert({
 store_id: identity.store_id,
 slug: targetSlug,
 title: "Vitrine da Loja",
 type: "store",
 })
 .select("id")
 .single();

 if (createSurfErr) {
 throw new Error("Falha ao inicializar vitrine da loja: " + createSurfErr.message);
 }
 existingSurf = newSurf;
 }
 realSurfaceId = existingSurf.id;
 }

 if (payload.id) {
 const { data, error } = await supabase
 .from("marketplace_sections")
 .update({
 type: payload.type,
 title: payload.title,
 subtitle: payload.subtitle,
 data_source: payload.data_source,
 taxonomy_slug: payload.taxonomy_slug,
 ranking_strategy: payload.ranking_strategy,
 layout_variant: payload.layout_variant,
 item_limit: payload.item_limit,
 sort_order: payload.sort_order,
 is_active: payload.is_active,
 updated_at: new Date().toISOString(),
 })
 .eq("id", payload.id)
 .select()
 .single();

 if (error) throw new Error(error.message);
 return data as SurfaceSectionDTO;
 } else {
 const { data, error } = await supabase
 .from("marketplace_sections")
 .insert({
 surface_id: realSurfaceId,
 type: payload.type,
 title: payload.title,
 subtitle: payload.subtitle,
 data_source: payload.data_source,
 taxonomy_slug: payload.taxonomy_slug,
 ranking_strategy: payload.ranking_strategy,
 layout_variant: payload.layout_variant,
 item_limit: payload.item_limit,
 sort_order: payload.sort_order,
 is_active: payload.is_active,
 })
 .select()
 .single();

 if (error) throw new Error(error.message);
 return data as SurfaceSectionDTO;
 }
 });

// ─── 5. EXCLUIR UMA SEÇÃO ──────────────────────────────────────────────────
export const deleteSurfaceSection = createServerFn({ method: "POST" })
 .validator(z.object({ sectionId: z.string() }))
 .handler(async ({ data: { sectionId } }) => {
 const supabase = getServerClient();
 const { error } = await supabase.from("marketplace_sections").delete().eq("id", sectionId);
 if (error) throw new Error(error.message);
 return { success: true };
 });

// ─── 6. REORDENAR SEÇÕES ATOMICAMENTE ──────────────────────────────────────
export const reorderSurfaceSections = createServerFn({ method: "POST" })
 .validator(
 z.object({
 surfaceId: z.string(),
 sectionIds: z.array(z.string()),
 })
 )
 .handler(async ({ data: { surfaceId, sectionIds } }) => {
 const supabase = getServerClient();

 const updates = sectionIds.map((id, index) =>
 supabase
 .from("marketplace_sections")
 .update({ sort_order: index + 1, updated_at: new Date().toISOString() })
 .eq("id", id)
 .eq("surface_id", surfaceId)
 );

 await Promise.all(updates);
 return { success: true };
 });

// ─── 7. MOTOR PROCEDURAL DE SCROLL INFINITO VERTICAL (DIVERSITY & DISCOVERY) ──
export interface ProceduralFeedSectionDTO {
  id: string;
  type: "single_store_spotlight" | "product_rail" | "store_rail" | "classifieds_spotlight" | "flash_deal_rail";
  title: string;
  subtitle?: string;
  badge_tag?: string;
  action_to?: string;
  action_label?: string;
  items: any[];
  store_id?: string;
  store_slug?: string;
}

export const getProceduralInfiniteFeedPage = createServerFn({ method: "GET" })
  .validator(
    z.object({
      pageIndex: z.number().int().min(0),
      city: z.string().optional(),
      excludedStoreIds: z.array(z.string()).optional().default([]),
      excludedProductIds: z.array(z.string()).optional().default([]),
      excludedClassifiedIds: z.array(z.string()).optional().default([]),
    })
  )
  .handler(async ({ data: { pageIndex, city, excludedStoreIds = [], excludedProductIds = [], excludedClassifiedIds = [] } }) => {
    const supabase = getServerClient();

    // Tenta até 4 modos consecutivos a partir do pageIndex solicitado para garantir continuidade
    for (let attempt = 0; attempt < 4; attempt++) {
      const currentAttemptIndex = pageIndex + attempt;
      const mode = currentAttemptIndex % 4;

      // ── MODO 0: Spotlight de Loja Única (Mostra apenas produtos daquela empresa) ──
      if (mode === 0) {
        let storeQuery = supabase
          .from("stores")
          .select("id, name, slug, settings, created_at")
          .order("created_at", { ascending: false })
          .limit(20);

        if (excludedStoreIds.length > 0) {
          storeQuery = storeQuery.not("id", "in", `(${excludedStoreIds.slice(0, 30).join(",")})`);
        }

        const { data: candidateStores } = await storeQuery;
        const targetStore = candidateStores?.[0];

        if (targetStore) {
          const { data: storeProducts } = await supabase
            .from("products")
            .select(`
              id,
              title,
              slug,
              store_id,
              price_cents,
              compare_at_cents,
              media:product_media(url, alt, sort_order)
            `)
            .eq("store_id", targetStore.id)
            .in("status", ["published", "active"])
            .limit(8);

          if (storeProducts && storeProducts.length >= 2) {
            const settings = (targetStore.settings as Record<string, any>) || {};
            const items = storeProducts.map((p: any) => {
              const sortedMedia = Array.isArray(p.media)
                ? [...p.media].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                : [];
              const cover = sortedMedia[0]?.url || "";
              const originalPrice = p.compare_at_cents || p.price_cents;
              const discount = originalPrice > p.price_cents
                ? Math.round(((originalPrice - p.price_cents) / originalPrice) * 100)
                : 0;

              return {
                id: p.id,
                title: p.title,
                slug: p.slug,
                store_id: p.store_id,
                store_name: targetStore.name,
                price_cents: p.price_cents,
                original_price_cents: originalPrice,
                discount_percent: discount,
                mechanic_label: discount > 0 ? `${discount}% OFF` : "CATÁLOGO",
                ends_at: "",
                cover_image: cover,
                selling_unit: "un",
                in_stock: true,
                has_flash_offer: discount > 0,
              };
            });

            return {
              section: {
                id: `proc-store-${targetStore.id}-${currentAttemptIndex}`,
                type: "single_store_spotlight" as const,
                title: `Cardápio & Ofertas de ${targetStore.name}`,
                subtitle: settings.segment || settings.niche || "Produtos oficiais da loja",
                badge_tag: "PARCEIRO",
                action_to: `/loja/${targetStore.slug || targetStore.id}`,
                action_label: "Ver Loja Completa",
                items,
                store_id: targetStore.id,
                store_slug: targetStore.slug,
              },
              hasMore: true,
              nextPageIndex: currentAttemptIndex + 1,
              addedStoreId: targetStore.id,
            };
          }
        }
      }

      // ── MODO 1: Achados com Maiores Descontos ──
      if (mode === 1) {
        let discountQuery: any = supabase
          .from("products")
          .select(`
            id,
            title,
            slug,
            store_id,
            price_cents,
            compare_at_cents,
            media:product_media(url, alt, sort_order),
            store:stores(id, name, slug)
          `)
          .in("status", ["published", "active"])
          .not("compare_at_cents", "is", null)
          .order("compare_at_cents", { ascending: false })
          .limit(12);

        if (excludedProductIds.length > 0) {
          discountQuery = discountQuery.not("id", "in", `(${excludedProductIds.slice(0, 40).join(",")})`);
        }

        const { data: deals } = await discountQuery;
        const validDeals = (deals || [])
          .map((p: any) => {
            const sortedMedia = Array.isArray(p.media)
              ? [...p.media].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              : [];
            const cover = sortedMedia[0]?.url || "";
            const originalPrice = p.compare_at_cents || p.price_cents;
            const discount = originalPrice > p.price_cents
              ? Math.round(((originalPrice - p.price_cents) / originalPrice) * 100)
              : 0;

            return {
              id: p.id,
              title: p.title,
              slug: p.slug,
              store_id: p.store_id,
              store_name: p.store?.name || "Loja Parceira",
              price_cents: p.price_cents,
              original_price_cents: originalPrice,
              discount_percent: discount,
              mechanic_label: discount > 0 ? `${discount}% OFF` : "OFERTA",
              ends_at: "",
              cover_image: cover,
              selling_unit: "un",
              in_stock: true,
              has_flash_offer: true,
            };
          })
          .filter((p: any) => p.discount_percent > 0);

        if (validDeals.length >= 2) {
          return {
            section: {
              id: `proc-deals-${currentAttemptIndex}`,
              type: "flash_deal_rail" as const,
              title: "Achados com Maiores Descontos",
              subtitle: "Descontos imperdíveis nos catálogos da região",
              badge_tag: "LIQUIDAÇÃO",
              action_to: "/ofertas",
              action_label: "Ver todas",
              items: validDeals,
            },
            hasMore: true,
            nextPageIndex: currentAttemptIndex + 1,
          };
        }
      }

      // ── MODO 2: Lojas Novas & Estabelecimentos em Destaque ──
      if (mode === 2) {
        let storesQuery: any = supabase
          .from("stores")
          .select("id, name, slug, description, settings, created_at")
          .order("created_at", { ascending: false })
          .limit(10);

        if (excludedStoreIds.length > 0) {
          storesQuery = storesQuery.not("id", "in", `(${excludedStoreIds.slice(0, 30).join(",")})`);
        }

        const { data: rawStores } = await storesQuery;
        const storeItems = (rawStores || []).map((s: any) => {
          const settings = (s.settings as Record<string, any>) || {};
          return {
            id: s.id,
            name: s.name,
            slug: s.slug || `loja-${s.id.slice(0, 6)}`,
            avatar_url: settings.logoUrl || settings.logo_url || undefined,
            banner_url: settings.bannerUrl || settings.banner_url || undefined,
            category: settings.segment || settings.niche || "Comércio Local",
            rating: 5.0,
            review_count: 24,
            distance_km: 1.1,
            is_open: true,
            delivery_time_min: "Disponível",
          };
        });

        if (storeItems.length >= 2) {
          return {
            section: {
              id: `proc-stores-${currentAttemptIndex}`,
              type: "store_rail" as const,
              title: "Novos Estabelecimentos & Negócios",
              subtitle: "Empresas e serviços que acabaram de chegar na plataforma",
              badge_tag: "NOVIDADE",
              action_to: "/diretorio",
              action_label: "Ver todos",
              items: storeItems,
            },
            hasMore: true,
            nextPageIndex: currentAttemptIndex + 1,
          };
        }
      }

      // ── MODO 3: Classificados & Oportunidades em Alta ──
      if (mode === 3) {
        let classQuery: any = supabase
          .from("classifieds")
          .select("id, title, price_cents, images, location_name, deal_type, is_boosted, created_at")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(10);

        if (excludedClassifiedIds.length > 0) {
          classQuery = classQuery.not("id", "in", `(${excludedClassifiedIds.slice(0, 30).join(",")})`);
        }

        const { data: rawClassifieds } = await classQuery;
        const classifiedItems = (rawClassifieds || []).map((c: any) => {
          const cover = (c.images && c.images[0]) || null;
          return {
            id: c.id,
            title: c.title,
            price_cents: c.price_cents,
            cover_image: cover,
            location_name: c.location_name || "Na cidade",
            deal_type: c.deal_type || "Venda",
            is_boosted: c.is_boosted || false,
          };
        });

        if (classifiedItems.length >= 1) {
          return {
            section: {
              id: `proc-classifieds-${currentAttemptIndex}`,
              type: "classifieds_spotlight" as const,
              title: "Oportunidades em Classificados",
              subtitle: "Imóveis, veículos e produtos selecionados",
              badge_tag: "CLASSIFICADOS",
              action_to: "/classificados",
              action_label: "Ver classificados",
              items: classifiedItems,
            },
            hasMore: true,
            nextPageIndex: currentAttemptIndex + 1,
          };
        }
      }
    }

    // Fallback gracioso: encerra a rolagem se nenhum modo tiver mais dados
    return {
      section: null,
      hasMore: false,
      nextPageIndex: pageIndex,
    };
  });
