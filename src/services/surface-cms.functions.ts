/**
 * Modular Surface CMS Server Functions (BFF boundary)
 * 
 * Provides dynamic modular section management for global & vertical marketplaces
 * as well as private store storefronts.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { logSystemError } from "@/lib/logger";
import { microCache } from "@/lib/cache/micro-cache";
import { NICHE_STORE_KEYWORDS, isMatchNicheKeyword } from "@/services/marketplace.functions";
import type { FlashOfferDTO, StoreCardDTO } from "@/services/marketplace.functions";
import { formatStoreCategory } from "@/lib/niches/niche-manifest";

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
 | "classifieds_spotlight"
 | "social_posts_rail"
 | "vitrine_vertical_carousel"
 | "media_gallery_mosaic"
 | "video_section"
 | "tourism_car_rental_rail";

export type SurfaceDataSource =
 | "all_products"
 | "category"
 | "hotpage"
 | "stores"
 | "flash_deals"
 | "top_sellers"
 | "banners"
 | "custom_buttons"
 | "social_posts"
 | "car_rentals"
 | "videos";

export type SurfaceRankingStrategy =
 | "discount"
 | "popularity"
 | "recency"
 | "random_shuffle"
 | "curated_fixed";

export type SurfaceLayoutVariant =
 | "rail_standard"
 | "rail_feature_card"
 | "rail_lead_banner"
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
	city_filter?: string | null;
	starts_at?: string | null;
	ends_at?: string | null;
	auto_archive_at?: string | null;
 items?: any[];
 config?: Record<string, any> | null;
}


export function isSectionCampaignActive(item: { starts_at?: string | null; ends_at?: string | null; is_active: boolean }): boolean {
  if (!item.is_active) return false;
  const now = Date.now();
  if (item.starts_at) {
    const s = new Date(item.starts_at).getTime();
    if (!isNaN(s) && s > now) return false;
  }
  if (item.ends_at) {
    const e = new Date(item.ends_at).getTime();
    if (!isNaN(e) && e < now) return false;
  }
  return true;
}

export interface MarketplaceSurfaceDTO {
 id: string;
 slug: string;
 title: string;
 description?: string | null;
 is_global: boolean;
 store_id?: string | null;
}

export const CANONICAL_PLATFORM_SURFACES: MarketplaceSurfaceDTO[] = [
	{
		id: "canonical-surface-home",
		slug: "home",
		title: "Início (Home Principal)",
		description: "Vitrine principal da plataforma Waesy",
		is_global: true,
		store_id: null,
	},
	{
		id: "canonical-surface-explorar",
		slug: "explorar",
		title: "Página Explorar (/explorar)",
		description: "Hub de descoberta, pilares urbanos e categorias da cidade",
		is_global: true,
		store_id: null,
	},
	{
		id: "canonical-surface-chat_noor",
		slug: "chat_noor",
		title: "Chat Noor & Menu Bento",
		description: "Interface conversacional da Noor e grade modular de atalhos",
		is_global: true,
		store_id: null,
	},
	{
		id: "canonical-surface-feed",
		slug: "feed",
		title: "Feed Social da Cidade (/feed)",
		description: "Publicações, vídeos, stories e interações locais",
		is_global: true,
		store_id: null,
	},
	{
		id: "canonical-surface-comunidades",
		slug: "comunidades",
		title: "Comunidades & Grupos (/comunidades)",
		description: "Fóruns, grupos temáticos e redes de vizinhança",
		is_global: true,
		store_id: null,
	},
	{
		id: "canonical-surface-turismo",
		slug: "turismo",
		title: "Turismo & Viagens (/turismo)",
		description: "Vitrine oficial de pacotes, aéreos, hotéis, rodoviário e corporativo",
		is_global: true,
		store_id: null,
	},
	{
		id: "canonical-surface-gastronomia",
		slug: "gastronomia",
		title: "Gastronomia & Restaurantes (/gastronomia)",
		description: "Delivery de restaurantes, lanchonetes, padarias e docerias",
		is_global: true,
		store_id: null,
	},
	{
		id: "canonical-surface-mercado",
		slug: "mercado",
		title: "Supermercados & Conveniência (/mercado)",
		description: "Compras de mercado, hortifruti, açougues e bebidas",
		is_global: true,
		store_id: null,
	},
	{
		id: "canonical-surface-farmacia",
		slug: "farmacia",
		title: "Farmácias & Saúde (/farmacia)",
		description: "Medicamentos, perfumaria e bem-estar com entrega rápida",
		is_global: true,
		store_id: null,
	},
	{
		id: "canonical-surface-classificados",
		slug: "classificados",
		title: "Classificados (/classificados)",
		description: "Veículos, imóveis, eletrônicos, móveis e negócios locais",
		is_global: true,
		store_id: null,
	},
	{
		id: "canonical-surface-diretorio",
		slug: "diretorio",
		title: "Lugares & Empresas (/diretorio)",
		description: "Guia comercial verificado com contato direto via WhatsApp",
		is_global: true,
		store_id: null,
	},
	{
		id: "canonical-surface-mobilidade",
		slug: "mobilidade",
		title: "Mobilidade & MotoLink (/mobilidade)",
		description: "Corridas urbanas, mototáxi e entregas expressas",
		is_global: true,
		store_id: null,
	},
	{
		id: "canonical-surface-ofertas",
		slug: "ofertas",
		title: "Super Ofertas & Cupons (/ofertas)",
		description: "Ofertas relâmpago, promoções com timer e cupons ativos",
		is_global: true,
		store_id: null,
	},
	{
		id: "canonical-surface-servicos",
		slug: "servicos",
		title: "Serviços & Profissionais (/servicos)",
		description: "Autônomos, assistência técnica, reformas e especialistas",
		is_global: true,
		store_id: null,
	},
	{
		id: "canonical-surface-eventos",
		slug: "eventos",
		title: "Agenda & Eventos (/eventos)",
		description: "Shows, ingressos oficiais e programação cultural",
		is_global: true,
		store_id: null,
	},
	{
		id: "canonical-surface-noticias",
		slug: "noticias",
		title: "Notícias Locais (/noticias)",
		description: "Jornalismo regional e comunicados de utilidade pública",
		is_global: true,
		store_id: null,
	},
	{
		id: "canonical-surface-empregos",
		slug: "empregos",
		title: "Vagas de Emprego (/empregos)",
		description: "Mural de oportunidades de trabalho e recrutamento local",
		is_global: true,
		store_id: null,
	},
];

export function ensureCanonicalSurfaces(existing: MarketplaceSurfaceDTO[]): MarketplaceSurfaceDTO[] {
	const copy = [...existing];
	for (const canonical of CANONICAL_PLATFORM_SURFACES) {
		const exists = copy.some((s) => s.slug === canonical.slug);
		if (!exists) {
			copy.push(canonical);
		}
	}
	return copy;
}

// ─── 1. LISTAR TODAS AS SUPERFÍCIES GLOBAIS (ADMIN MASTER) ─────────────────
export const listAllSurfaces = createServerFn({ method: "GET" }).handler(async () => {
	const { requirePlatformAdmin } = await import("@/lib/server-access");
	await requirePlatformAdmin();

	const supabase = getServerClient();
	const { data, error } = await supabase
		.from("marketplace_surfaces")
		.select("*")
		.or("is_global.eq.true,store_id.is.null")
		.order("title", { ascending: true });

	if (error) {
		console.error("[surface-cms] Error listing surfaces:", error.message);
		return ensureCanonicalSurfaces([]);
	}

	return ensureCanonicalSurfaces((data || []) as MarketplaceSurfaceDTO[]);
});

// ─── 2. LISTAR SEÇÕES DE UMA SUPERFÍCIE (LEITURA PURA SEM INSERT EM GET) ──
export const listSurfaceSections = createServerFn({ method: "GET" })
	.validator(
		z.object({
			surfaceSlug: z.string(),
			storeId: z.string().optional(),
		}),
	)
	.handler(async ({ data: { surfaceSlug, storeId } }) => {
		const supabase = getServerClient();
		let targetSurfaceSlug = surfaceSlug;
		let targetStoreId = storeId;
		const canonicalMatch = CANONICAL_PLATFORM_SURFACES.find((s) => s.slug === surfaceSlug);

		if (surfaceSlug === "store_private") {
			const { authorizeBuilderStoreContext } = await import("@/lib/server-access");
			const authCtx = await authorizeBuilderStoreContext().catch(() => null);
			if (!authCtx?.storeId) {
				return { surface: null, sections: [] };
			}
			targetStoreId = authCtx.storeId;
			targetSurfaceSlug = `vitrine-${authCtx.storeId}`;
		}

		let surfaceQuery = supabase
			.from("marketplace_surfaces")
			.select("id, slug, title, store_id, is_global")
			.eq("slug", targetSurfaceSlug);

		if (targetStoreId) {
			surfaceQuery = surfaceQuery.eq("store_id", targetStoreId);
		}

		const { data: surface } = await surfaceQuery.maybeSingle();

		if (!surface) {
			if (canonicalMatch && surfaceSlug !== "store_private") {
				return {
					surface: {
						id: canonicalMatch.id,
						slug: canonicalMatch.slug,
						title: canonicalMatch.title,
					},
					sections: [],
				};
			}
			if (targetStoreId && targetSurfaceSlug.startsWith("vitrine-")) {
				return {
					surface: {
						id: "store_private",
						slug: targetSurfaceSlug,
						title: "Vitrine da Loja",
					},
					sections: [],
				};
			}
		}

 if (!surface) {
  const canonicalFallback = CANONICAL_PLATFORM_SURFACES.find((s) => s.slug === targetSurfaceSlug);
  if (canonicalFallback) {
   return { surface: canonicalFallback, sections: [] };
  }
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
			city: z.string().optional(),
 })
 )
 .handler(async ({ data: { surfaceSlug, storeId, city } }) => {
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

 let { data: surface } = await surfaceQuery.maybeSingle();

 if (!surface && (surfaceSlug === "marketplace" || surfaceSlug === "todos" || surfaceSlug === "home")) {
 const { data: fallbackSurf } = await supabase
 .from("marketplace_surfaces")
 .select("id, slug, title")
 .in("slug", ["marketplace", "home_mercado", "home", "global"])
 .order("is_global", { ascending: false })
 .limit(1)
 .maybeSingle();
 surface = fallbackSurf;
 }

	if (!surface && (surfaceSlug === "turismo" || surfaceSlug === "viagens")) {
		surface = { id: "canonical-surface-turismo", slug: "turismo", title: "Turismo & Viagens" } as any;
	}
 if (!surface) {
 return { sections: [], allProducts: [] };
 }

 // 2. Busca seções ativas
		let secQuery = supabase
			.from("marketplace_sections")
			.select("*")
			.eq("surface_id", surface.id)
			.eq("is_active", true);

		const cleanCity =
			city && city !== "Global" && city !== "all" && city !== "Todas" && city !== "Todas as Cidades"
				? city.trim()
				: null;
		if (cleanCity) {
			secQuery = secQuery.or(`city_filter.eq."${cleanCity}",city_filter.is.null,city_filter.eq.all`);
		}

		const { data: rawSectionsData } = await secQuery.order("sort_order", { ascending: true });
		const rawSections = (rawSectionsData || []).filter(isSectionCampaignActive);

 if (!rawSections || rawSections.length === 0) {
 return { sections: [], allProducts: [] };
 }

 // 3. Busca produtos e lojas do banco
 // [FIX: Anti-AI Smell] Em vez de baixar apenas 100 itens aleatórios (velhos) e filtrar em memória,
 // ordenamos por recency/availability e puxamos um pool maior (300) para o edge.
 // Futuro ideal: delegar essa agregação para uma RPC (Stored Procedure) no banco.
 let storesQuery = supabase
 .from("stores")
 .select("id, name, slug, description, settings, city")
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
 store:stores(id, name, slug, settings, city)
 `,
 )
 .in("status", ["published", "active"])
 .order("created_at", { ascending: false })
 .limit(300);

 	if (storeId) {
		storesQuery = storesQuery.eq("id", storeId);
		productsQuery = productsQuery.eq("store_id", storeId);
	} else if (cleanCity) {
		storesQuery = storesQuery.ilike("city", `%${cleanCity}%`);
	}

 const [storesRes, productsRes] = await Promise.all([storesQuery, productsQuery]);

 // Mapeia lojas
 const allDbStores: StoreCardDTO[] = (storesRes.data || []).map((s: any) => {
 const settings = (s.settings as Record<string, any>) || {};
 const category = formatStoreCategory(settings.segment || settings.type || settings.niche || "Comércio Local");
  const is_verified = s.is_verified === true || settings.is_verified === true;
 return {
 id: s.id,
 name: s.name,
 slug: s.slug || `loja-${s.id.slice(0, 6)}`,
 avatar_url: settings.logoUrl || settings.logo_url || undefined,
 banner_url: settings.bannerUrl || settings.banner_url || undefined,
 category,
    is_verified,
 rating: typeof settings.rating === "number" ? settings.rating : undefined,
				review_count: typeof settings.review_count === "number" ? settings.review_count : undefined,
				distance_km: typeof settings.distance_km === "number" ? settings.distance_km : undefined,
				is_open: typeof settings.is_open === "boolean" ? settings.is_open : undefined,
				delivery_time_min: typeof settings.delivery_time_min === "string" ? settings.delivery_time_min : undefined,
 };
 });

 // Filtra lojas do nicho com isolamento semântico estrito (Invariantes B.33 e B.37)
 let filteredStores = allDbStores;
 if (!isGlobal && !storeId) {
 filteredStores = allDbStores.filter((st) => {
 const cat = (st.category || "").toLowerCase();
 const name = (st.name || "").toLowerCase();

 // 1. Prioridade absoluta ao segmento cadastrado da loja
 const rawStore = storesRes.data?.find((s: any) => s.id === st.id);
 const settings = (rawStore?.settings as Record<string, any>) || {};
 const declaredSegment = (settings.segment || settings.niche || settings.type || "").toLowerCase().trim();

 if (declaredSegment) {
 const isFoodStore = ["gastronomia", "restaurante", "food", "lanchonete", "pizzaria", "hamburgueria", "doceria"].includes(declaredSegment);
 const isFoodSurface = ["gastronomia", "restaurantes", "food"].includes(normalizedNiche);
 if (isFoodStore && !isFoodSurface) return false;

 if (declaredSegment === normalizedNiche) return true;
 }

 // 2. Validação por palavras-chave com word boundary (DL-37)
 return nicheKeywords.some((kw) => isMatchNicheKeyword(cat, kw) || isMatchNicheKeyword(name, kw));
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

 // Filtra produtos do nicho (Erradicação de Vazamento Cruzado B.37)
 if (!isGlobal && !storeId) {
 const matchingStoreIds = new Set(filteredStores.map((s) => s.id));
 allProducts = allProducts.filter((p) => {
 // 1. Se pertence a uma loja aprovada do nicho, é aprovado
 if (matchingStoreIds.has(p.store_id)) return true;

 // 2. Se o produto declara explicitamente o nicho nos atributos
 const rawProd = productsRes.data?.find((item: any) => item.id === p.id);
 const prodAttrs = (rawProd?.attributes as Record<string, any>) || {};
 const prodNiche = (prodAttrs.tipo || prodAttrs.niche || prodAttrs.segment || "").toLowerCase().trim();
 if (prodNiche && prodNiche === normalizedNiche) return true;

 // NUNCA incluir itens de outras lojas por simples coincidência de substring no título
 return false;
 });
 }

    if (cleanCity && !storeId) {
      const matchingCityStoreIds = new Set(allDbStores.map((s) => s.id));
      allProducts = allProducts.filter((p: any) => {
        if (matchingCityStoreIds.has(p.store_id)) return true;
        const stCity = (p.store?.city || p.store?.settings?.city || "").toLowerCase();
        return stCity.includes(cleanCity.toLowerCase());
      });
    }


 // 3.5 Busca banners ativos da plataforma usando colunas reais e janela temporal (B.29)
 const nowMs = Date.now();
 const { data: rawBanners } = await supabase
 .from("banners")
 .select("id, title, subtitle, badge_text, media_url, media_desktop_url, media_mobile_url, media_type, target_url, target_type, cta_label, placement, sort_order, is_active, city_filter, starts_at, ends_at, auto_archive_at")
 .eq("is_active", true)
 .order("sort_order", { ascending: true });

 const platformBanners = (rawBanners || [])
   .filter((b: any) => {
     if (b.starts_at && new Date(b.starts_at).getTime() > nowMs) return false;
     if (b.ends_at && new Date(b.ends_at).getTime() < nowMs) return false;
     if (b.auto_archive_at && new Date(b.auto_archive_at).getTime() < nowMs) return false;
     if (cleanCity && b.city_filter && b.city_filter !== "all" && b.city_filter.toLowerCase() !== cleanCity.toLowerCase()) {
       return false;
     }
     return true;
   })
   .map((b: any) => ({
     ...b,
     image_url: b.media_desktop_url || b.media_url || "",
     mobile_image_url: b.media_mobile_url || b.media_url || "",
     link_url: b.target_url || "/",
     position: b.sort_order ?? 0,
   }));

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
 } else if (sec.type === "social_posts_rail" || sec.data_source === "social_posts") {
 const { getUnifiedShowcasePosts } = await import("@/services/admin-home-cms.functions");
 sectionItems = await getUnifiedShowcasePosts({
 data: { city: cleanCity || undefined, limit: sec.item_limit || 10 },
 }).catch((err) => {
 logSystemError({
 route: "surface-cms.getSurfaceFeedPayload",
 contract_name: "getUnifiedShowcasePosts",
 table_name: "feed_posts",
 schema_name: "public",
 operation: "SELECT",
 error: err,
 });
 return [];
 });
 } else if (sec.type === "store_rail" || sec.data_source === "stores") {
 let storePool = [...filteredStores];
 if (sec.ranking_strategy === "random_shuffle") {
 storePool.sort(() => Math.random() - 0.5);
 }
 sectionItems = storePool.slice(0, sec.item_limit || 10);
 } else if (sec.type === "flash_deal_rail" || sec.data_source === "flash_deals") {
 let flashPool = allProducts.filter((p) => p.discount_percent > 0);
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
      "social_posts_rail",
      "vitrine_vertical_carousel",
      "media_gallery_mosaic",
      "video_section",
      "tourism_car_rental_rail",
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
 "social_posts",
 "car_rentals",
 "videos",
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
 "rail_feature_card",
 "rail_lead_banner",
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
		city_filter: z.string().optional().nullable(),
		starts_at: z.string().optional().nullable(),
		ends_at: z.string().optional().nullable(),
		auto_archive_at: z.string().optional().nullable(),
 config: z.record(z.any()).optional().nullable(),
 })
 )
 .handler(async ({ data: payload }) => {
 const supabase = getServerClient();
 const { authorizeBuilderStoreContext, requirePlatformAdmin } = await import("@/lib/server-access");
 let realSurfaceId = payload.surface_id;

 if (realSurfaceId === "store_private") {
 const authCtx = await authorizeBuilderStoreContext();
 const targetSlug = `vitrine-${authCtx.storeId}`;
 let { data: existingSurf } = await supabase
 .from("marketplace_surfaces")
 .select("id")
 .eq("store_id", authCtx.storeId)
 .eq("slug", targetSlug)
 .maybeSingle();

 if (!existingSurf) {
 const { data: newSurf, error: createSurfErr } = await supabase
 .from("marketplace_surfaces")
 .insert({
 store_id: authCtx.storeId,
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
 } else if (realSurfaceId.startsWith("canonical-surface-")) {
  await requirePlatformAdmin();
  const targetSlug = realSurfaceId.replace(/^canonical-surface-/, "");
  const canonicalDef = CANONICAL_PLATFORM_SURFACES.find((s) => s.slug === targetSlug);
  const { data: existingCanonicalSurf } = await supabase
   .from("marketplace_surfaces")
   .select("id")
   .eq("slug", targetSlug)
   .maybeSingle();

  if (existingCanonicalSurf?.id) {
   realSurfaceId = existingCanonicalSurf.id;
  } else {
   const { data: createdCanonicalSurf, error: createCanonicalErr } = await supabase
    .from("marketplace_surfaces")
    .insert({
     slug: targetSlug,
     title: canonicalDef?.title || targetSlug,
     description: canonicalDef?.description || null,
     is_global: true,
    })
    .select("id")
    .single();
   if (createCanonicalErr || !createdCanonicalSurf) {
    throw new Error("Falha ao materializar superfície canônica: " + (createCanonicalErr?.message || targetSlug));
   }
   realSurfaceId = createdCanonicalSurf.id;
  }
 } else {
  const { data: targetSurf } = await supabase
   .from("marketplace_surfaces")
   .select("id, store_id, is_global")
   .eq("id", realSurfaceId)
   .maybeSingle();
  if (!targetSurf) {
   throw new Error("Superfície de vitrine não encontrada.");
  }
  if (targetSurf.store_id && !targetSurf.is_global) {
   await authorizeBuilderStoreContext({ requestedStoreId: targetSurf.store_id });
  } else {
   await requirePlatformAdmin();
  }
 }

 if (payload.id) {
  const { data: existingSec } = await supabase
   .from("marketplace_sections")
   .select("id, surface_id")
   .eq("id", payload.id)
   .maybeSingle();
  if (existingSec && existingSec.surface_id !== realSurfaceId) {
   throw new Error("Forbidden: Seção pertence a outra superfície.");
  }
 }

 if (payload.id) {
 const { data, error } = await supabase
 .from("marketplace_sections")
 .update({
 type: payload.type,
 title: payload.title,
 subtitle: payload.subtitle || null,
 badge_tag: payload.badge_tag || null,
 data_source: payload.data_source,
 taxonomy_slug: payload.taxonomy_slug || null,
 ranking_strategy: payload.ranking_strategy,
 layout_variant: payload.layout_variant,
 item_limit: payload.item_limit,
 sort_order: payload.sort_order,
 is_active: payload.is_active,
				city_filter: payload.city_filter !== undefined ? payload.city_filter : null,
				starts_at: payload.starts_at ? new Date(payload.starts_at).toISOString() : null,
				ends_at: payload.ends_at ? new Date(payload.ends_at).toISOString() : null,
				auto_archive_at: payload.auto_archive_at ? new Date(payload.auto_archive_at).toISOString() : null,
 config: payload.config || {},
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
 subtitle: payload.subtitle || null,
 badge_tag: payload.badge_tag || null,
 data_source: payload.data_source,
 taxonomy_slug: payload.taxonomy_slug || null,
 ranking_strategy: payload.ranking_strategy,
 layout_variant: payload.layout_variant,
 item_limit: payload.item_limit,
 sort_order: payload.sort_order,
 is_active: payload.is_active,
				city_filter: payload.city_filter !== undefined ? payload.city_filter : null,
				starts_at: payload.starts_at ? new Date(payload.starts_at).toISOString() : null,
				ends_at: payload.ends_at ? new Date(payload.ends_at).toISOString() : null,
				auto_archive_at: payload.auto_archive_at ? new Date(payload.auto_archive_at).toISOString() : null,
 config: payload.config || {},
 })
 .select()
 .single();

 if (error) throw new Error(error.message);
 return data as SurfaceSectionDTO;
 }
 });

// ─── 4.1 PROVISIONAR / ABRIR PÁGINA NO OMNI BUILDER (AGENTS.md B.51) ──────────
async function buildHydratedPlatformOmniDocument(
 supabase: ReturnType<typeof getServerClient>,
 normalizedSlug: string,
 docId: string,
 docName: string,
 targetStoreId: string,
) {
 const { CANONICAL_DEFAULT_HOME_SECTIONS, ensureCanonicalHomeSections } = await import(
  "@/services/admin-home-cms.functions"
 );
 const { CANONICAL_PLATFORM_MENUS } = await import("@/services/cms.functions");
 const { CANONICAL_DRAWER_MODULES } = await import("@/services/hotpage.functions");

 const { data: rawHomeSections } = await supabase
  .from("home_page_sections")
  .select(`*, items:home_section_items(*)`)
  .order("sort_order", { ascending: true });

 const homeSections = ensureCanonicalHomeSections(
  (rawHomeSections && rawHomeSections.length > 0
   ? rawHomeSections
   : CANONICAL_DEFAULT_HOME_SECTIONS) as any[],
 );

 const { data: rawMenus } = await supabase
  .from("navigation_menus")
  .select("*")
  .eq("store_id", targetStoreId);

 const menusMap = new Map<string, any[]>();
 for (const m of CANONICAL_PLATFORM_MENUS) {
  menusMap.set(m.handle, m.items || []);
 }
 for (const m of rawMenus || []) {
  const key = m.handle || m.location;
  if (key && Array.isArray(m.items) && m.items.length > 0) {
   menusMap.set(key, m.items);
  }
 }

 const { data: rawDrawerRows } = await supabase
  .from("hotpages")
  .select("*")
  .eq("template_type", "drawer_module")
  .eq("is_active", true)
  .order("sort_order", { ascending: true });

 const drawerModulesSource =
  rawDrawerRows && rawDrawerRows.length > 0 ? rawDrawerRows : CANONICAL_DRAWER_MODULES;

 const drawerGroupsMap = new Map<string, { id: string; title: string; items: any[] }>();
 for (const dm of drawerModulesSource as any[]) {
  const rules = (dm.filter_rules as Record<string, any>) || {};
  const secKey = rules.section_key || "explorar";
  const secTitle = rules.section_title || "Destaques para Explorar";
  if (!drawerGroupsMap.has(secKey)) {
   drawerGroupsMap.set(secKey, {
    id: `sec-drawer-${secKey}`,
    title: secTitle,
    items: [],
   });
  }
  drawerGroupsMap.get(secKey)?.items.push({
   id: dm.id || dm.slug,
   slug: dm.slug,
   label: dm.title || "Módulo",
   href: dm.target_route || `/${dm.slug}`,
   cardVariant: rules.card_variant || "squircle",
   icon: dm.icon_name || "Compass",
   imageUrl: dm.custom_icon_url || dm.icon_url || dm.cover_image_url || "",
   badge: dm.badge_label || "",
   bgColor: dm.bg_color || "",
   textColor: dm.text_color || "",
   isActive: dm.is_active !== false,
  });
 }

 const drawerSections =
  drawerGroupsMap.size > 0
   ? Array.from(drawerGroupsMap.values())
   : [
      {
       id: "sec-menu-global",
       title: "Menu Principal & Verticais",
       items: (menusMap.get("explore_menu") || []).map((it: any, idx: number) => ({
        id: it.id || `nav-it-${idx}`,
        label: it.label || "Atalho",
        href: it.url || "/",
        cardVariant: idx < 2 ? "wide" : "squircle",
        icon: it.icon || "Compass",
        imageUrl: it.image_url || "",
        badge: it.badge_text || "",
        bgColor: it.bg_color || "",
        textColor: it.text_color || "",
        isActive: it.is_visible !== false,
       })),
      },
     ];

 const headerMenuItems = menusMap.get("header_nav") || [];

 const { data: pageBanners } = await supabase
  .from("banners")
  .select("*")
  .eq("placement", normalizedSlug === "menus" ? "home" : normalizedSlug)
  .eq("is_active", true)
  .order("sort_order", { ascending: true });

 const mappedPageBannerSlides = (pageBanners || []).map((b: any) => ({
  id: b.id,
  badge: b.badge_text || b.badge_label || "Destaque",
  title: b.title || "Banner",
  subtitle: b.subtitle || "",
  ctaLabel: b.cta_label || b.cta_text || "Conferir",
  href: b.target_url || b.cta_url || `/${normalizedSlug}`,
  imageDesktopUrl: b.media_desktop_url || b.desktop_image_url || b.media_url || b.image_url || "",
  imageMobileUrl: b.media_mobile_url || b.mobile_image_url || b.media_url || b.image_url || "",
  imageUrl: b.media_url || b.image_url || "",
  videoUrl: b.media_type === "video" ? b.media_url : b.video_url || "",
  showOverlay: b.show_overlay !== false && b.show_title !== false,
  bgColor: b.bg_color || "",
  textColor: b.text_color || "",
  cityFilter: b.city_filter || "",
  startsAt: b.starts_at || "",
  endsAt: b.ends_at || "",
 }));

 const blocks: any[] = [
  {
   id: `blk_header_${normalizedSlug}`,
   type: "vitrine_ifood_header",
   config: {
    showSearch: true,
    searchPlaceholder: "Buscar lojas, pratos, serviços ou produtos...",
    cmsMenuHandle: "header_nav",
    navItems: headerMenuItems,
   },
   styling: { paddingY: "none" },
  },
  {
   id: `blk_drawer_${normalizedSlug}`,
   type: "vitrine_lateral_drawer",
   config: {
    greetingTitle: "Explore o Ecossistema Waesy",
    greetingSubtitle: "Categorias, serviços urbanos e vitrines oficiais",
    showViewModeToggle: true,
    defaultViewMode: "grid",
    cmsMenuHandle: "explore_menu",
    sections: drawerSections,
   },
   styling: { paddingY: "none" },
  },
 ];

 const mapHomeSectionToOmniBlock = (sec: any) => {
  const items = Array.isArray(sec.items)
   ? [...sec.items].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
   : [];
  const key = sec.section_key || "";
  const layoutVar = sec.layout_variant || sec.section_type || "";

  if (
   key === "quick_categories" ||
   key === "quick_categories_ifood" ||
   key === "explore_categories" ||
   key === "marketplace_categories" ||
   layoutVar === "grid_2d" ||
   layoutVar === "native_dock" ||
   layoutVar === "custom_buttons"
  ) {
   return {
    id: `blk_${key}`,
    type: "vitrine_buttons_dock",
    isVisible: sec.is_active !== false,
    cityFilter: sec.city_filter || undefined,
    startsAt: sec.starts_at || undefined,
    endsAt: sec.ends_at || undefined,
    config: {
     cmsSectionKey: key,
     cmsSectionId: sec.id,
     sectionTitle: sec.title || "",
     sectionSubtitle: sec.subtitle || "",
     dataSource: "manual",
     desktopLayout: layoutVar === "grid_2d" ? "ifood_grid" : "noor_dock",
     mobileLayout: "ifood_grid",
     desktopColumns: sec.metadata?.cols_desktop || 8,
     mobileColumns: sec.metadata?.cols_mobile || 4,
     defaultShape: "squircle",
     items: items.map((it: any) => ({
      id: it.id,
      label: it.title || "Botão",
      subtitle: it.subtitle || "",
      badge: it.badge_text || "",
      iconName: it.icon_name || "Tag",
      imageMobileUrl: it.image_mobile_url || it.mobile_image_url || it.image_url || "",
      imageDesktopUrl: it.image_desktop_url || it.image_url || "",
      imageUrl: it.image_url || it.image_desktop_url || it.image_mobile_url || "",
      href: it.target_url || "/",
      shape: it.button_shape || "squircle",
      bgColor: it.bg_color || "",
      textColor: it.text_color || "",
      gradient: it.metadata?.gradient || "",
      shadowMode: it.metadata?.shadow_mode || "none",
      showLabel: it.show_text !== false,
      cityFilter: it.city_filter || "",
      startsAt: it.starts_at || "",
      endsAt: it.ends_at || "",
     })),
    },
    styling: { paddingY: "none" },
   };
  }

  if (
   key === "chat_noor_bento" ||
   key === "explore_pillars" ||
   key === "hotpages_grid" ||
   key === "mosaic_gallery_showcase" ||
   layoutVar === "bento_grid" ||
   layoutVar === "cards_action_grid"
  ) {
   return {
    id: `blk_${key}`,
    type: "vitrine_bento_tetris",
    isVisible: sec.is_active !== false,
    cityFilter: sec.city_filter || undefined,
    startsAt: sec.starts_at || undefined,
    endsAt: sec.ends_at || undefined,
    config: {
     cmsSectionKey: key,
     cmsSectionId: sec.id,
     sectionTitle: sec.title || "",
     sectionSubtitle: sec.subtitle || "",
     desktopColumns: sec.metadata?.cols_desktop || 3,
     mobileColumns: sec.metadata?.cols_mobile || 2,
     tiles: items.map((it: any) => ({
      id: it.id,
      tag: it.badge_text || "",
      title: it.title || "Bloco",
      subtitle: it.subtitle || "",
      ctaLabel: "Acessar",
      href: it.target_url || "/",
      imageMobileUrl: it.image_mobile_url || it.mobile_image_url || it.image_url || "",
      imageDesktopUrl: it.image_desktop_url || it.image_url || "",
      imageUrl: it.image_url || it.image_desktop_url || "",
      iconName: it.icon_name || "Sparkles",
      bgColor: it.bg_color || "",
      textColor: it.text_color || "",
      gradient: it.metadata?.gradient || "",
      shadowMode: it.metadata?.shadow_mode || "none",
      spanX: Number(it.grid_span_x || it.metadata?.span || 1),
      spanY: Number(it.grid_span_y || 1),
      mobileSpanX: Number(it.grid_span_x || it.metadata?.span || 1) >= 2 ? 2 : 1,
      cityFilter: it.city_filter || "",
      startsAt: it.starts_at || "",
      endsAt: it.ends_at || "",
     })),
    },
    styling: { paddingY: "none" },
   };
  }

  if (
   key === "promo_strip_timer" ||
   key === "promo_coupon" ||
   key === "promo_coupon_banner"
  ) {
   const first = items[0] || {};
   return {
    id: `blk_${key}`,
    type: "vitrine_coupon_strip",
    isVisible: sec.is_active !== false,
    cityFilter: sec.city_filter || undefined,
    startsAt: sec.starts_at || undefined,
    endsAt: sec.ends_at || undefined,
    config: {
     cmsSectionKey: key,
     cmsSectionId: sec.id,
     variant: key === "promo_strip_timer" ? "highlight_bar" : "coupon",
     badge: first.badge_text || "OFERTA RELÂMPAGO",
     title: first.title || sec.title || "Campanha Especial Ativa",
     subtitle: first.subtitle || sec.subtitle || "",
     couponCode: first.metadata?.coupon_code || "WAESY10",
     ctaLabel: "Aproveitar",
     href: first.target_url || "/ofertas",
     timerExpiresAt: first.ends_at || sec.ends_at || "",
     bgColor: first.bg_color || "",
     textColor: first.text_color || "",
     gradient: first.metadata?.gradient || "",
     cityFilter: first.city_filter || sec.city_filter || "",
     startsAt: first.starts_at || sec.starts_at || "",
     endsAt: first.ends_at || sec.ends_at || "",
    },
    styling: { paddingY: "none" },
   };
  }

  if (
   key === "hero_banners" ||
   key === "promo_banners_slim" ||
   layoutVar === "slim_slider" ||
   (layoutVar === "carousel" && !["marketplace_products_rail", "classifieds_rail", "jobs_rail", "social_posts_vitrine"].includes(key))
  ) {
   const mappedSectionSlides = items.map((it: any) => ({
    id: it.id,
    badge: it.badge_text || "Destaque",
    title: it.title || "Banner",
    subtitle: it.subtitle || "",
    ctaLabel: "Conferir",
    href: it.target_url || "/ofertas",
    imageDesktopUrl: it.image_desktop_url || it.image_url || "",
    imageMobileUrl: it.image_mobile_url || it.mobile_image_url || it.image_url || "",
    imageUrl: it.image_url || it.image_desktop_url || "",
    videoUrl: it.metadata?.video_url || "",
    showOverlay: it.show_text !== false,
    bgColor: it.bg_color || "",
    textColor: it.text_color || "",
    cityFilter: it.city_filter || "",
    startsAt: it.starts_at || "",
    endsAt: it.ends_at || "",
   }));
   const effectiveSlides =
    mappedSectionSlides.length > 0
     ? mappedSectionSlides
     : key === "hero_banners" && mappedPageBannerSlides.length > 0
       ? mappedPageBannerSlides
       : [];
   return {
    id: `blk_${key}`,
    type: "vitrine_metamorphic_banner",
    isVisible: sec.is_active !== false,
    config: {
     cmsSectionKey: key,
     cmsSectionId: sec.id,
     cmsBannerPlacement: normalizedSlug === "menus" ? "home" : normalizedSlug,
     sectionTitle: sec.title || "",
     sectionSubtitle: sec.subtitle || "",
     dataSource: "manual",
     desktopAspectRatio: layoutVar === "slim_slider" || sec.aspect_ratio === "slim_desktop" ? "slim" : "ifood",
     mobileAspectRatio: "cinema",
     autoPlay: true,
     intervalSeconds: 5,
     showArrows: true,
     showDots: true,
     rounded: "lg",
     slides: effectiveSlides,
    },
    styling: { paddingY: "none" },
   };
  }

  if (key === "marketplace_products_rail") {
   return {
    id: `blk_${key}`,
    type: "vitrine_product_shelf",
    isVisible: sec.is_active !== false,
    dataBinding: { entity: "products", limit: 12, sort: "newest" },
    config: {
     cmsSectionKey: key,
     cmsSectionId: sec.id,
     sectionTitle: sec.title || "Marketplace de Empresas",
     sectionSubtitle: sec.subtitle || "",
     dataSource: "products",
    },
    styling: { paddingY: "none" },
   };
  }

  if (key === "classifieds_rail") {
   return {
    id: `blk_${key}`,
    type: "vitrine_classifieds_rail",
    isVisible: sec.is_active !== false,
    dataBinding: { entity: "classifieds", limit: 12, sort: "newest" },
    config: {
     cmsSectionKey: key,
     cmsSectionId: sec.id,
     sectionTitle: sec.title || "Classificados & Desapegos",
     sectionSubtitle: sec.subtitle || "",
     dataSource: "classifieds",
    },
    styling: { paddingY: "none" },
   };
  }

  if (key === "social_posts_vitrine") {
   return {
    id: `blk_${key}`,
    type: "vitrine_social_stream",
    isVisible: sec.is_active !== false,
    dataBinding: { entity: "posts", limit: 10, sort: "newest" },
    config: {
     cmsSectionKey: key,
     cmsSectionId: sec.id,
     sectionTitle: sec.title || "Feed da Cidade",
     sectionSubtitle: sec.subtitle || "",
     dataSource: "posts",
    },
    styling: { paddingY: "none" },
   };
  }

  if (key === "subcategory_pills") {
   return {
    id: `blk_${key}`,
    type: "vitrine_subcategory_pills",
    isVisible: sec.is_active !== false,
    config: {
     cmsSectionKey: key,
     cmsSectionId: sec.id,
     showText: sec.metadata?.show_text !== false,
     textPosition: sec.metadata?.text_position || "below",
     items: items.map((it: any) => ({
      id: it.id,
      label: it.title || "Subcategoria",
      imageUrl: it.image_url || "",
      badge: it.badge_text || "",
      href: it.target_url || "/",
     })),
    },
    styling: { paddingY: "none" },
   };
  }

  if (key === "feature_mini_banners") {
   return {
    id: `blk_${key}`,
    type: "vitrine_feature_mini_banners",
    isVisible: sec.is_active !== false,
    config: {
     cmsSectionKey: key,
     cmsSectionId: sec.id,
     title: sec.title || "No Waesy também tem",
     items: items.map((it: any) => ({
      id: it.id,
      title: it.title || "Destaque",
      badge: it.badge_text || "",
      imageUrl: it.image_url || "",
      to: it.target_url || "/",
      bgColor: it.bg_color || "",
     })),
    },
    styling: { paddingY: "none" },
   };
  }

  if (
   key === "visual_spotlight" ||
   key === "spotlight_restaurants" ||
   key === "spotlight_pharmacies"
  ) {
   return {
    id: `blk_${key}`,
    type: "vitrine_visual_spotlight_rail",
    isVisible: sec.is_active !== false,
    dataBinding: {
     entity: "stores",
     nicheFilter: key === "spotlight_pharmacies" ? "farmacia" : "gastronomia",
     limit: 12,
    },
    config: {
     cmsSectionKey: key,
     cmsSectionId: sec.id,
     title: sec.title || "Restaurantes em Destaque",
     subtitle: sec.subtitle || "",
     viewMoreTo: key === "spotlight_pharmacies" ? "/farmacia" : "/gastronomia",
     viewMoreLabel: "Ver mais",
    },
    styling: { paddingY: "none" },
   };
  }

  if (key === "recent_stores" || key === "recent_stores_rail") {
   return {
    id: `blk_${key}`,
    type: "vitrine_recent_stores_rail",
    isVisible: sec.is_active !== false,
    dataBinding: { entity: "stores", limit: 12, sort: "newest" },
    config: {
     cmsSectionKey: key,
     cmsSectionId: sec.id,
     title: sec.title || "Últimas lojas",
     viewMoreTo: "/diretorio",
    },
    styling: { paddingY: "none" },
   };
  }

  return {
   id: `blk_${key || sec.id}`,
   type: "vitrine_stores_feed_list",
   isVisible: sec.is_active !== false,
   dataBinding: { entity: "stores", limit: 16 },
   config: {
    cmsSectionKey: key,
    cmsSectionId: sec.id,
    title: sec.title || "Lojas",
    showFilterChips: true,
   },
   styling: { paddingY: "none" },
  };
 };

 if (normalizedSlug === "home" || normalizedSlug === "menus") {
  for (const sec of homeSections.filter(
   (s: any) => !["explore_pillars", "explore_categories", "chat_noor_bento"].includes(s.section_key),
  )) {
   blocks.push(mapHomeSectionToOmniBlock(sec));
  }
 } else if (normalizedSlug === "explorar") {
  if (mappedPageBannerSlides.length > 0) {
   blocks.push({
    id: "blk_banner_explorar",
    type: "vitrine_metamorphic_banner",
    config: {
     cmsBannerPlacement: "explorar",
     sectionTitle: "",
     dataSource: "manual",
     desktopAspectRatio: "slim",
     mobileAspectRatio: "cinema",
     slides: mappedPageBannerSlides,
    },
    styling: { paddingY: "none" },
   });
  }
  for (const sec of homeSections.filter((s: any) =>
   ["explore_pillars", "explore_categories", "promo_strip_timer"].includes(s.section_key),
  )) {
   blocks.push(mapHomeSectionToOmniBlock(sec));
  }
 } else if (normalizedSlug === "chat_noor") {
  for (const sec of homeSections.filter((s: any) => ["chat_noor_bento"].includes(s.section_key))) {
   blocks.push(mapHomeSectionToOmniBlock(sec));
  }
 } else {
  // Superfícies Verticais (Turismo, Gastronomia, Supermercado, Farmácia, Classificados, Diretório, etc.)
  const { data: surfRow } = await supabase
   .from("marketplace_surfaces")
   .select("id")
   .eq("slug", normalizedSlug)
   .maybeSingle();

  const { data: surfSecs } = surfRow?.id
   ? await supabase
      .from("marketplace_sections")
      .select("*")
      .eq("surface_id", surfRow.id)
      .order("sort_order", { ascending: true })
   : { data: [] as any[] };

  const { data: verticalHotpages } = await supabase
   .from("hotpages")
   .select("*")
   .eq("module", normalizedSlug)
   .eq("is_active", true)
   .order("sort_order", { ascending: true });

  const mappedHotpageBtns = (verticalHotpages || []).map((hp: any, i: number) => ({
   id: hp.id || `hp-${i}`,
   slug: hp.slug,
   label: hp.title || "Categoria",
   subtitle: hp.description || "",
   badge: hp.badge_label || "",
   iconName: hp.icon_name || "Tag",
   imageUrl: hp.custom_icon_url || hp.icon_url || hp.cover_image_url || "",
   imageMobileUrl: hp.custom_icon_url || hp.icon_url || hp.cover_image_url || "",
   imageDesktopUrl: hp.cover_image_url || hp.custom_icon_url || hp.icon_url || "",
   href: hp.target_route || `/${normalizedSlug}?cat=${hp.slug}`,
   bgColor: hp.bg_color || "",
   textColor: hp.text_color || "",
   showLabel: hp.show_title !== false,
   cityFilter: hp.city_filter || "",
   startsAt: hp.starts_at || "",
   endsAt: hp.ends_at || "",
  }));

  if (surfSecs && surfSecs.length > 0) {
   let addedBannerBlock = false;
   for (const s of surfSecs) {
    const customBtns = Array.isArray(s.config?.buttons) ? s.config.buttons : [];
    if (s.type === "custom_buttons_rail" || s.type === "category_grid") {
     blocks.push({
      id: `blk_surf_${s.id}`,
      type: "vitrine_buttons_dock",
      config: {
       cmsSurfaceSectionId: s.id,
       cmsHotpageModule: normalizedSlug,
       sectionTitle: s.title || "",
       sectionSubtitle: s.subtitle || "",
       dataSource: "manual",
       desktopLayout: "noor_dock",
       mobileLayout: "ifood_grid",
       items:
        customBtns.length > 0
         ? customBtns.map((b: any, i: number) => ({
            id: b.id || `sb-${i}`,
            label: b.label || "Botão",
            badge: b.badge || "",
            iconName: b.icon || "Tag",
            imageUrl: b.image_url || "",
            imageMobileUrl: b.image_url || "",
            imageDesktopUrl: b.image_url || "",
            href: b.url || "/",
            bgColor: b.color || "",
            textColor: b.text_color || "",
            showLabel: b.show_text !== false,
           }))
         : mappedHotpageBtns,
      },
      styling: { paddingY: "none" },
     });
    } else if (s.type?.startsWith("banner_")) {
     addedBannerBlock = true;
     blocks.push({
      id: `blk_surf_${s.id}`,
      type: "vitrine_metamorphic_banner",
      config: {
       cmsSurfaceSectionId: s.id,
       cmsBannerPlacement: normalizedSlug,
       sectionTitle: s.title || "",
       sectionSubtitle: s.subtitle || "",
       dataSource: "manual",
       desktopAspectRatio: "slim",
       mobileAspectRatio: "cinema",
       slides: mappedPageBannerSlides,
      },
      styling: { paddingY: "none" },
     });
    } else if (s.type === "classifieds_spotlight") {
     blocks.push({
      id: `blk_surf_${s.id}`,
      type: "vitrine_classifieds_rail",
      config: {
       cmsSurfaceSectionId: s.id,
       sectionTitle: s.title || "Anúncios em Destaque",
       sectionSubtitle: s.subtitle || "",
       dataSource: "store_classifieds",
       maxItems: s.item_limit || 8,
       rankingStrategy: s.ranking_strategy || "random_shuffle",
       cityFilter: s.city_filter || "",
       startsAt: s.starts_at || "",
       endsAt: s.ends_at || "",
       autoArchiveAt: s.auto_archive_at || "",
      },
      styling: { paddingY: "none" },
     });
    } else if (s.type === "social_posts_rail") {
     blocks.push({
      id: `blk_surf_${s.id}`,
      type: "vitrine_social_stream",
      config: {
       cmsSurfaceSectionId: s.id,
       sectionTitle: s.title || "Publicações da Comunidade",
       sectionSubtitle: s.subtitle || "",
       dataSource: "store_posts",
       maxItems: s.item_limit || 6,
       rankingStrategy: s.ranking_strategy || "random_shuffle",
       cityFilter: s.city_filter || "",
       startsAt: s.starts_at || "",
       endsAt: s.ends_at || "",
       autoArchiveAt: s.auto_archive_at || "",
      },
      styling: { paddingY: "none" },
     });
    } else {
     blocks.push({
      id: `blk_surf_${s.id}`,
      type: "vitrine_product_shelf",
      config: {
       cmsSurfaceSectionId: s.id,
       sectionTitle: s.title || "Destaques",
       sectionSubtitle: s.subtitle || "",
       dataSource: "store_products",
       maxItems: s.item_limit || 8,
       rankingStrategy: s.ranking_strategy || "random_shuffle",
       cityFilter: s.city_filter || "",
       startsAt: s.starts_at || "",
       endsAt: s.ends_at || "",
       autoArchiveAt: s.auto_archive_at || "",
      },
      styling: { paddingY: "none" },
     });
    }
   }
   if (!addedBannerBlock && mappedPageBannerSlides.length > 0) {
    blocks.splice(2, 0, {
     id: `blk_banner_${normalizedSlug}`,
     type: "vitrine_metamorphic_banner",
     config: {
      cmsBannerPlacement: normalizedSlug,
      sectionTitle: "",
      dataSource: "manual",
      desktopAspectRatio: "slim",
      mobileAspectRatio: "cinema",
      slides: mappedPageBannerSlides,
     },
     styling: { paddingY: "none" },
    });
   }
  } else {
   // Hidrata estrutura canônica completa para a vertical
   blocks.push(
    {
     id: `blk_banner_${normalizedSlug}`,
     type: "vitrine_metamorphic_banner",
     config: {
      cmsBannerPlacement: normalizedSlug,
      sectionTitle: "",
      dataSource: "manual",
      desktopAspectRatio: "slim",
      mobileAspectRatio: "cinema",
      slides:
       mappedPageBannerSlides.length > 0
        ? mappedPageBannerSlides
        : [
           {
            id: `sl_${normalizedSlug}_1`,
            badge: docName.toUpperCase(),
            title: `${docName} — Destaques e Ofertas Oficiais`,
            subtitle: "Personalize banners, botões, cores, vídeos, timers e localização aqui no Omni Builder.",
            ctaLabel: "Explorar Agora",
            href: `/${normalizedSlug}`,
            showOverlay: true,
           },
          ],
     },
     styling: { paddingY: "none" },
    },
    {
     id: `blk_btns_${normalizedSlug}`,
     type: "vitrine_buttons_dock",
     config: {
      cmsHotpageModule: normalizedSlug,
      sectionTitle: `Categorias de ${docName}`,
      dataSource: "manual",
      desktopLayout: "noor_dock",
      mobileLayout: "ifood_grid",
      items:
       mappedHotpageBtns.length > 0
        ? mappedHotpageBtns
        : [
           { id: "b1", label: "Destaques", iconName: "Sparkles", badge: "TOP", href: `/${normalizedSlug}` },
           { id: "b2", label: "Promoções", iconName: "Percent", badge: "OFERTA", href: "/ofertas" },
           { id: "b3", label: "Mais Próximos", iconName: "MapPin", href: "/diretorio" },
           { id: "b4", label: "Novidades", iconName: "Flame", href: `/${normalizedSlug}` },
          ],
     },
     styling: { paddingY: "none" },
    },
    {
     id: `blk_shelf_${normalizedSlug}`,
     type: "vitrine_product_shelf",
     config: {
      sectionTitle: `Vitrine Principal — ${docName}`,
      sectionSubtitle: "Conectado ao catálogo real da plataforma",
      dataSource: "store_products",
      maxItems: 8,
     },
     styling: { paddingY: "none" },
    },
   );
  }
 }

 return {
  id: docId,
  store_id: targetStoreId,
  slug: normalizedSlug,
  title: docName,
  niche: "general",
  is_published: true,
  blocks,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
 };
}

export async function ensurePlatformRootStore(supabase: any): Promise<string> {
  const { ensureCanonicalPlatformRootStoreId } = await import("@/lib/server-access");
  return ensureCanonicalPlatformRootStoreId(supabase);
}

export const openOrCreatePageExperienceDocument = createServerFn({ method: "POST" })
 .validator(
  z.object({
   pageSlug: z.string().min(1),
   pageTitle: z.string().optional(),
   citySlug: z.string().nullable().optional(),
   forceRehydrate: z.boolean().optional(),
  }),
 )
 .handler(async ({ data: { pageSlug, pageTitle, citySlug, forceRehydrate } }) => {
  const supabase = getServerClient();
  const {
   requirePlatformAdmin,
   authorizeBuilderStoreContext,
   ensureCanonicalPlatformRootStoreId,
  } = await import("@/lib/server-access");

  const normalizedSlug = pageSlug.trim().toLowerCase();
  const canonical = CANONICAL_PLATFORM_SURFACES.find((s) => s.slug === normalizedSlug);
  const isGlobalCanonicalPage =
   Boolean(canonical) ||
   ["home", "menus", "explorar", "chat_noor"].includes(normalizedSlug);

  let targetStoreId: string;
  if (isGlobalCanonicalPage) {
   await requirePlatformAdmin();
   targetStoreId = await ensureCanonicalPlatformRootStoreId(supabase);
  } else {
   const authCtx = await authorizeBuilderStoreContext({ allowPlatformRootForGlobalAdmin: true });
   targetStoreId = authCtx.storeId;
  }

  const docTitle = pageTitle || canonical?.title || `Página ${normalizedSlug}`;

  // 1. Encontra documento existente ancorado estritamente à loja resolvida (usa coluna real `title`)
  const { data: existingDoc } = await supabase
   .from("experience_documents")
   .select("id, slug, title, settings, store_id")
   .eq("store_id", targetStoreId)
   .eq("slug", normalizedSlug)
   .order("created_at", { ascending: false })
   .limit(1)
   .maybeSingle();

  if (existingDoc?.id) {
   const existingSettings = (existingDoc.settings as Record<string, any>) || {};
   const existingDraft =
    existingSettings.omni_page_draft ||
    existingSettings.omni_page_published ||
    existingSettings.omni_page;
   const hasBlocks = Array.isArray(existingDraft?.blocks) && existingDraft.blocks.length > 0;

   if (!hasBlocks || forceRehydrate) {
    const hydratedSnapshot = await buildHydratedPlatformOmniDocument(
     supabase,
     normalizedSlug,
     existingDoc.id,
     existingDoc.title || docTitle,
     targetStoreId,
    );
    await supabase
     .from("experience_documents")
     .update({
      settings: {
       ...existingSettings,
       ...(isGlobalCanonicalPage
        ? { is_platform_surface: true, platform_page_slug: normalizedSlug }
        : {}),
       omni_page_draft: hydratedSnapshot,
      },
      updated_at: new Date().toISOString(),
     })
     .eq("id", existingDoc.id)
     .eq("store_id", targetStoreId);

    const { data: existingDraftVer } = await supabase
     .from("experience_versions")
     .select("id")
     .eq("document_id", existingDoc.id)
     .eq("status", "draft")
     .order("version_number", { ascending: false })
     .limit(1)
     .maybeSingle();

    if (existingDraftVer?.id) {
     await supabase
      .from("experience_versions")
      .update({ document_snapshot: hydratedSnapshot })
      .eq("id", existingDraftVer.id);
    } else {
     await supabase.from("experience_versions").insert({
      document_id: existingDoc.id,
      version_number: 1,
      status: "draft",
      document_snapshot: hydratedSnapshot,
     });
    }
   }

   return { documentId: existingDoc.id, slug: existingDoc.slug };
  }

  const tempId = crypto.randomUUID();
  const hydratedSnapshot = await buildHydratedPlatformOmniDocument(
   supabase,
   normalizedSlug,
   tempId,
   docTitle,
   targetStoreId,
  );

  const { data: newDoc, error: docErr } = await supabase
   .from("experience_documents")
   .insert({
    id: tempId,
    store_id: targetStoreId,
    title: docTitle,
    slug: normalizedSlug,
    document_type: normalizedSlug === "home" ? "storefront" : "landing_page",
    is_active: true,
    settings: {
     ...(isGlobalCanonicalPage
      ? { is_platform_surface: true, platform_page_slug: normalizedSlug }
      : {}),
     omni_page_draft: hydratedSnapshot,
    },
   })
   .select("id, slug")
   .single();

  if (docErr || !newDoc) {
   throw new Error("Falha ao criar documento Omni Builder para a página: " + (docErr?.message || normalizedSlug));
  }

  await supabase.from("experience_versions").insert({
   document_id: newDoc.id,
   version_number: 1,
   status: "draft",
   document_snapshot: hydratedSnapshot,
  });

  return { documentId: newDoc.id, slug: newDoc.slug };
 });

// ─── 5. EXCLUIR UMA SEÇÃO (COM GUARDA MULTI-TENANT / ADMIN MASTER) ─────────
export const deleteSurfaceSection = createServerFn({ method: "POST" })
 .validator(z.object({ sectionId: z.string() }))
 .handler(async ({ data: { sectionId } }) => {
  const supabase = getServerClient();
  const { authorizeBuilderStoreContext, requirePlatformAdmin } = await import("@/lib/server-access");

  const { data: secRow } = await supabase
   .from("marketplace_sections")
   .select("id, surface_id")
   .eq("id", sectionId)
   .maybeSingle();

  if (!secRow) {
   return { success: true };
  }

  const { data: surfRow } = await supabase
   .from("marketplace_surfaces")
   .select("id, store_id, is_global")
   .eq("id", secRow.surface_id)
   .maybeSingle();

  if (surfRow?.store_id && !surfRow.is_global) {
   await authorizeBuilderStoreContext({ requestedStoreId: surfRow.store_id });
  } else {
   await requirePlatformAdmin();
  }

  const { error } = await supabase.from("marketplace_sections").delete().eq("id", sectionId);
  if (error) throw new Error(error.message);
  return { success: true };
 });

// ─── 6. REORDENAR SEÇÕES ATOMICAMENTE (COM GUARDA MULTI-TENANT / ADMIN MASTER) ──
export const reorderSurfaceSections = createServerFn({ method: "POST" })
 .validator(
  z.object({
   surfaceId: z.string(),
   sectionIds: z.array(z.string()),
  }),
 )
 .handler(async ({ data: { surfaceId, sectionIds } }) => {
  const supabase = getServerClient();
  const { authorizeBuilderStoreContext, requirePlatformAdmin } = await import("@/lib/server-access");

  if (surfaceId === "store_private") {
   await authorizeBuilderStoreContext();
  } else if (surfaceId.startsWith("canonical-surface-")) {
   await requirePlatformAdmin();
  } else {
   const { data: surfRow } = await supabase
    .from("marketplace_surfaces")
    .select("id, store_id, is_global")
    .eq("id", surfaceId)
    .maybeSingle();
   if (!surfRow) throw new Error("Superfície não encontrada.");
   if (surfRow.store_id && !surfRow.is_global) {
    await authorizeBuilderStoreContext({ requestedStoreId: surfRow.store_id });
   } else {
    await requirePlatformAdmin();
   }
  }

  const updates = sectionIds.map((id, index) =>
   supabase
    .from("marketplace_sections")
    .update({ sort_order: index + 1, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("surface_id", surfaceId),
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
          .filter((p: any) => p.discount_percent > 0 && !p.cover_image.includes("unsplash.com") && !p.slug.includes("jaqueta-bomber"));

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
            category: formatStoreCategory(settings.segment || settings.niche || settings.category || "Comércio Local"),
            is_verified: s.is_verified === true || settings.is_verified === true,
            rating: typeof s.rating === "number" ? s.rating : typeof settings.rating === "number" ? settings.rating : undefined,
            review_count: typeof s.review_count === "number" ? s.review_count : typeof settings.review_count === "number" ? settings.review_count : undefined,
            distance_km: typeof s.distance_km === "number" ? s.distance_km : undefined,
            is_open: typeof s.is_open === "boolean" ? s.is_open : undefined,
            delivery_time_min: typeof settings.delivery_time_min === "string" ? settings.delivery_time_min : undefined,
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

// ─── 8. RESOLVEDOR CANÔNICO DE EXPERIÊNCIA DE PÁGINA (PARIDADE WYSIWYG SOMENTE PUBLICADOS) ───
export const resolveSurfacePageExperienceDocument = createServerFn({ method: "GET" })
  .validator(
    z.object({
      surfaceSlug: z.string(),
      city: z.string().optional(),
      storeId: z.string().optional(),
    }),
  )
  .handler(async ({ data: { surfaceSlug, city, storeId } }) => {
    const normalizedSlug = surfaceSlug.trim().toLowerCase();
    const cacheKey = `surface_cms:doc:${normalizedSlug}:${city || "all"}:${storeId || "root"}`;

    return microCache.getOrSet(cacheKey, 60_000, async () => {
      const supabase = getServerClient();
      const { findPlatformRootStoreIdReadOnly } = await import("@/lib/server-access");

      const effectiveStoreId = storeId || (await findPlatformRootStoreIdReadOnly(supabase));
      if (!effectiveStoreId) {
        return {
          mode: "canonical_cms" as const,
          documentId: null,
          document: null,
          liveData: null,
        };
      }

    // 1. Busca documento correspondente em experience_documents (usa coluna real `title`, NUNCA `name`)
    const { data: docRows } = await supabase
      .from("experience_documents")
      .select("id, slug, title, document_type, is_active, settings, store_id")
      .eq("store_id", effectiveStoreId)
      .eq("slug", normalizedSlug)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1);

    const existingDoc = docRows?.[0] || null;

    if (existingDoc) {
      const settings = (existingDoc.settings as Record<string, any>) || {};
      if (!storeId && !settings.is_platform_surface && !settings.platform_page_slug) {
        return {
          mode: "canonical_cms" as const,
          documentId: null,
          document: null,
          liveData: null,
        };
      }

      // 2. Estritamente versão publicada (NUNCA vaza settings.omni_page_draft para visitantes públicos!)
      const { data: publishedVer } = await supabase
        .from("experience_versions")
        .select("id, version_number, document_snapshot")
        .eq("document_id", existingDoc.id)
        .eq("status", "published")
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      const omniDoc = publishedVer?.document_snapshot || settings.omni_page_published || null;

      if (omniDoc && Array.isArray(omniDoc.blocks) && omniDoc.blocks.length > 0) {
        const cleanCity =
          city && city !== "all" && city !== "Todas as Cidades" && city !== "Global"
            ? city.trim()
            : null;
        const nowMs = Date.now();

        let bannerQuery = supabase
          .from("banners")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .limit(24);
        if (cleanCity) {
          bannerQuery = bannerQuery.or(
            `city_filter.eq."${cleanCity}",city_filter.is.null,city_filter.eq.all`,
          );
        }

        const { getUnifiedShowcasePosts } = await import("@/services/admin-home-cms.functions");

        const [
          productsRes,
          storesRes,
          bannersRes,
          newsRes,
          eventsRes,
          jobsRes,
          classifiedsRes,
          hotpagesRes,
          showcasePosts,
        ] = await Promise.all([
          Promise.resolve(
            supabase
              .from("products")
              .select("id, store_id, title, slug, price_cents, compare_at_cents, status, attributes, stores(id, name, slug, city, settings), product_media(url, sort_order)")
              .eq("status", "published")
              .is("deleted_at", null)
              .order("created_at", { ascending: false })
              .limit(40),
          ).catch(() => ({ data: [] })),
          Promise.resolve(
            supabase
              .from("stores")
              .select("id, name, slug, city, state, description, settings, is_active, verified_badge_url, google_rating, google_review_count, created_at")
              .eq("is_active", true)
              .limit(32),
          ).catch(() => ({ data: [] })),
          Promise.resolve(bannerQuery).catch(() => ({ data: [] })),
          Promise.resolve(
            supabase
              .from("news_articles")
              .select("id, title, slug, summary, cover_image, category, published_at")
              .eq("status", "published")
              .order("published_at", { ascending: false })
              .limit(12),
          ).catch(() => ({ data: [] })),
          Promise.resolve(
            supabase
              .from("events")
              .select("id, title, slug, location_name, city, event_date, cover_image_url, status")
              .eq("status", "published")
              .order("event_date", { ascending: true })
              .limit(12),
          ).catch(() => ({ data: [] })),
          Promise.resolve(
            supabase
              .from("jobs")
              .select("id, title, company_name, city, employment_type, salary_range, status, created_at")
              .eq("status", "open")
              .order("created_at", { ascending: false })
              .limit(12),
          ).catch(() => ({ data: [] })),
          Promise.resolve(
            supabase
              .from("classifieds")
              .select("id, title, slug, price_cents, media_urls, category_slug, city, state, status, created_at")
              .eq("status", "active")
              .order("created_at", { ascending: false })
              .limit(24),
          ).catch(() => ({ data: [] })),
          Promise.resolve(
            supabase.from("hotpages").select("*").eq("is_active", true).order("sort_order", { ascending: true }).limit(24),
          ).catch(() => ({ data: [] })),
          getUnifiedShowcasePosts({ data: { city: cleanCity || undefined, limit: 12 } }).catch(() => []),
        ]);

        const normalizedProducts = ((productsRes as any)?.data || []).map((p: any) => {
          const mediaArr = Array.isArray(p.product_media)
            ? [...p.product_media].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            : [];
          const primaryImage = mediaArr[0]?.url || p.attributes?.cover_image || "";
          return {
            ...p,
            image_url: primaryImage,
            imageUrl: primaryImage,
            cover_image: primaryImage,
            priceCents: p.price_cents,
            compareAtCents: p.compare_at_cents,
            storeName: p.stores?.name || "",
            store_name: p.stores?.name || "",
            city: p.stores?.city || "",
          };
        });

        const normalizedStores = ((storesRes as any)?.data || []).map((s: any) => {
          const stSettings = (s.settings as Record<string, any>) || {};
          return {
            ...s,
            logo_url: s.logo_url || stSettings.logoUrl || stSettings.logo_url || "",
            banner_url: s.banner_url || stSettings.bannerUrl || stSettings.banner_url || "",
            niche: stSettings.niche || stSettings.segment || "",
          };
        });

        const activeBanners = ((bannersRes as any)?.data || []).filter((b: any) => {
          if (b.starts_at && new Date(b.starts_at).getTime() > nowMs) return false;
          if (b.ends_at && new Date(b.ends_at).getTime() < nowMs) return false;
          if (b.auto_archive_at && new Date(b.auto_archive_at).getTime() < nowMs) return false;
          return true;
        });

        const activeHotpages = ((hotpagesRes as any)?.data || []).filter((hp: any) => {
          if (hp.starts_at && new Date(hp.starts_at).getTime() > nowMs) return false;
          if (hp.ends_at && new Date(hp.ends_at).getTime() < nowMs) return false;
          if (hp.auto_archive_at && new Date(hp.auto_archive_at).getTime() < nowMs) return false;
          return true;
        });

        return {
          mode: "omni_published" as const,
          documentId: existingDoc.id,
          document: omniDoc,
          liveData: {
            products: normalizedProducts,
            stores: normalizedStores,
            banners: activeBanners,
            newsArticles: (newsRes as any)?.data || [],
            events: (eventsRes as any)?.data || [],
            jobs: (jobsRes as any)?.data || [],
            classifieds: (classifiedsRes as any)?.data || [],
            hotpages: activeHotpages,
            posts: Array.isArray(showcasePosts) ? showcasePosts : [],
          },
        };
      }
    }

      return {
        mode: "canonical_cms" as const,
        documentId: null,
        document: null,
        liveData: null,
      };
    });
  });
