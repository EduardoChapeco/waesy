import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";

export interface FlashOfferDTO {
 id: string;
 title: string;
 slug: string;
 store_id: string;
 store_name: string;
 price_cents: number;
 original_price_cents: number;
 discount_percent: number;
 mechanic_label: string;
 ends_at?: string | null;
 cover_image: string;
 selling_unit?: string;
 in_stock?: boolean;
 has_flash_offer?: boolean;
 meal_time?: "cafe_manha" | "almoco" | "jantar" | "happy_hour" | null;
 has_free_delivery?: boolean;
 has_express_delivery?: boolean;
 has_2for1_promo?: boolean;
}

export interface StoreCardDTO {
 id: string;
 name: string;
 slug: string;
 avatar_url?: string;
 banner_url?: string;
 category?: string;
 rating?: number;
 review_count?: number;
 distance_km?: number;
 is_open?: boolean;
 delivery_time_min?: string;
}

export interface MarketplaceSectionDTO {
 id: string;
 type: "flash_deal_rail" | "product_rail" | "store_rail" | "category_grid";
 title: string;
 subtitle?: string;
 layout_variant?: string;
 items: any[];
}

// ─── 1. MAPEAMENTO DE PALAVRAS-CHAVE POR NICHO PARA FILTRAGEM RIGOROSA ─────────
export const NICHE_STORE_KEYWORDS: Record<string, string[]> = {
 mercado: [
 "mercado",
 "supermercado",
 "mercearia",
 "hortifruti",
 "emporio",
 "atacado",
 "atacarejo",
 "feira",
 "laticinios",
 "despensa",
 "fruteira",
 "alimentos",
 ],
 gastronomia: [
 "restaurante",
 "hamburgueria",
 "pizzaria",
 "cafeteria",
 "lanchonete",
 "bar",
 "doceria",
 "gastronomia",
 "pastelaria",
 "sushi",
 "bistro",
 "marmitaria",
 "buffet",
 "cafe",
 "sorveteria",
 "acai",
 "lanches",
 ],
 moda: [
 "moda",
 "vestuario",
 "calcados",
 "roupas",
 "boutique",
 "calcado",
 "acessorios",
 "joalheria",
 "otica",
 "brecho",
 "estilo",
 "lingerie",
 ],
 casa: [
 "casa",
 "moveis",
 "decoracao",
 "decor",
 "iluminacao",
 "bazar",
 "utilidades",
 "cama",
 "colchoes",
 "tapetes",
 "cortinas",
 "mesa e banho",
 ],
 construcao: [
 "construcao",
 "materiais",
 "tintas",
 "ferragens",
 "madeireira",
 "eletrica",
 "hidraulica",
 "ferramentas",
 "reforma",
 "acabamentos",
 "pisos",
 ],
 pet: [
 "pet",
 "veterinaria",
 "agropecuaria",
 "racao",
 "banho e tosa",
 "petshop",
 "animais",
 "clinica veterinaria",
 ],
 farmacia: [
 "farmacia",
 "drogaria",
 "saude",
 "manipulacao",
 "suplementos",
 "medicamentos",
 "farma",
 "droga",
 ],
 beleza: [
 "beleza",
 "estetica",
 "barbearia",
 "salao",
 "cosmeticos",
 "perfumaria",
 "esmalteria",
 "cabelo",
 "skincare",
 "barber",
 "spa",
 ],
 bebidas: [
 "bebidas",
 "adega",
 "distribuidora",
 "cervejaria",
 "chopp",
 "conveniencia",
 "vinhos",
 "tele-cerveja",
 "distribuidora de bebidas",
 ],
 acougue: [
 "acougue",
 "carnes",
 "boutique de carnes",
 "frigorifico",
 "churrasco",
 "cortes nobres",
 "casa de carnes",
 ],
 eletronicos: [
 "eletronicos",
 "informatica",
 "celulares",
 "tech",
 "games",
 "assistencia",
 "computadores",
 "acessorios tech",
 "tecnologia",
 ],
 livros: [
 "livraria",
 "sebo",
 "papelaria",
 "livros",
 "escolar",
 "escritorio",
 "leitura",
 ],
 limpeza: [
 "limpeza",
 "quimicos",
 "descartaveis",
 "lavanderia",
 "higiene profissional",
 "produtos de limpeza",
 ],
 servicos: [
 "servicos",
 "prestador",
 "assistencia",
 "reparos",
 "manutencao",
 "consultoria",
 "instalacoes",
 "marido de aluguel",
 ],
 imoveis: [
 "imobiliaria",
 "corretor",
 "imoveis",
 "locacao",
 "temporada",
 "pousada",
 "hotel",
 "hospedagem",
 ],
 turismo: [
 "turismo",
 "passeios",
 "aventura",
 "hotel",
 "pousada",
 "ecoturismo",
 "guia",
 "atracoes",
 ],
};

// ─── 2. FUNÇÃO SERVER BFF: getMarketplaceFeed ─────────────────────────────────
export const getMarketplaceFeed = createServerFn({ method: "GET" })
 .validator(
 z
 .object({
 niche: z.string().optional(),
 mealTime: z.enum(["cafe_manha", "almoco", "jantar", "happy_hour"]).optional(),
 })
 .optional(),
 )
 .handler(async ({ data: params }) => {
 const supabase = getServerClient();
 const rawNiche = params?.niche;
 const isGlobal = !rawNiche || rawNiche === "todos" || rawNiche === "ofertas" || rawNiche === "home";
 const normalizedNiche = isGlobal ? "global" : rawNiche.toLowerCase().trim();

 const nicheKeywords = NICHE_STORE_KEYWORDS[normalizedNiche] || [normalizedNiche];

 // 1. Busca lojas ativas reais no Supabase, filtradas pelo nicho se aplicável
 let storesQuery = supabase
 .from("stores")
 .select("id, name, slug, settings, logo_url")
 .limit(30);

 const { data: storesData, error: storeErr } = await storesQuery;
 if (storeErr) {
 console.warn("[marketplace] Erro na busca de lojas do feed:", storeErr.message);
 }

 let allDbStores: StoreCardDTO[] = (storesData || []).map((s: any) => ({
 id: s.id,
 name: s.name,
 slug: s.slug || `loja-${s.id.slice(0, 6)}`,
 avatar_url: s.logo_url || s.settings?.logoUrl || s.settings?.logo_url || undefined,
 banner_url: s.settings?.bannerUrl || undefined,
 category: s.settings?.type || s.settings?.segment || s.settings?.niche || "Comércio Local",
 rating: 4.9,
 review_count: 120,
 distance_km: 1.2,
 is_open: true,
 delivery_time_min: "Disponível",
 }));

 // Filtra lojas rigorosamente se for marketplace vertical
 let filteredStores: StoreCardDTO[] = allDbStores;
 if (!isGlobal) {
 filteredStores = allDbStores.filter((st) => {
 const cat = (st.category || "").toLowerCase();
 const name = (st.name || "").toLowerCase();
 return nicheKeywords.some((kw) => cat.includes(kw) || name.includes(kw));
 });
 }

 // Apenas lojas reais do Supabase

 // 2. Busca produtos reais publicados no Supabase
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
 media:product_media(url, alt, sort_order),
 store:stores(id, name, slug, settings)
 `,
 )
 .in("status", ["published", "active"]);

 const { data: productsData, error: prodErr } = await productsQuery.limit(60);
 if (prodErr) {
 console.warn("[marketplace] Erro na busca de produtos do feed:", prodErr.message);
 }

 let products: FlashOfferDTO[] = (productsData || []).map((p: any) => {
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
 mechanic_label: discount > 0 ? `${discount}% OFF` : "OFERTA",
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

 // Filtra produtos rigorosamente pelo nicho se não for global
 if (!isGlobal) {
 const matchingStoreIds = new Set(filteredStores.map((s) => s.id));
 products = products.filter((p) => {
 // Match 1: Produto pertence a uma loja do nicho
 if (matchingStoreIds.has(p.store_id)) return true;

 // Match 2: Título do produto ou atributos pertencem ao nicho
 const titleLower = p.title.toLowerCase();
 return nicheKeywords.some((kw) => titleLower.includes(kw));
 });
 }

 // Apenas produtos reais do Supabase

 // 3. Montagem das seções contextuais e rigorosamente NÃO-REPETITIVAS
 const sections: MarketplaceSectionDTO[] = [];

 // Seção 1: Ofertas Relâmpago (Produtos exclusivamente com desconto ou flash offer)
 const flashDeals = products.filter((p) => p.has_flash_offer || p.discount_percent > 0);
 const flashItems = flashDeals.length > 0 ? flashDeals.slice(0, 6) : products.slice(0, 4);
 const usedIds = new Set(flashItems.map((p) => p.id));

 if (flashItems.length > 0) {
 sections.push({
 id: "sec-flash-deals",
 type: "flash_deal_rail",
 title: "Ofertas Relâmpago",
 subtitle: "Descontos exclusivos por tempo limitado",
 layout_variant: "rail_standard",
 items: flashItems,
 });
 }

 // Seção 2: Lojas e Estabelecimentos Contextuais
 if (filteredStores.length > 0) {
 sections.push({
 id: "sec-local-stores",
 type: "store_rail",
 title: isGlobal ? "Lojas & Negócios Locais" : "Estabelecimentos em Destaque",
 subtitle: "Comércios parceiros com entrega e retirada",
 layout_variant: "rail_compact",
 items: filteredStores,
 });
 }

 // Seção 3: Produtos em Destaque do Catálogo (Exclui os itens já exibidos nas ofertas relâmpago!)
 const remainingProducts = products.filter((p) => !usedIds.has(p.id));
 const trendingItems =
 remainingProducts.length > 0 ? remainingProducts.slice(0, 8) : products.slice(0, 6);

 if (trendingItems.length > 0) {
 sections.push({
 id: "sec-trending",
 type: "product_rail",
 title: "Produtos em Destaque",
 subtitle: "Mais pedidos e bem avaliados da categoria",
 layout_variant: "rail_standard",
 items: trendingItems,
 });
 }

 return { sections, allProducts: products };
 });

// ─── 5. FUNÇÃO SERVER BFF: getGlobalDealsPage (Cross-Marketplace) ─────────────
// Agrega as melhores ofertas de TODOS os nichos da plataforma.
// Esta função é a base do módulo /ofertas (diferente do /mercado que é contextual).
export interface GlobalDealNicheSection {
 nicho: string;
 label: string;
 emoji: string;
 color: string;
 to: string;
 items: FlashOfferDTO[];
 stores: StoreCardDTO[];
}

export const getGlobalDealsPage = createServerFn({ method: "GET" })
 .validator(
 z
 .object({
 nicheFilter: z.string().optional(), // ex: "gastronomia" para filtrar apenas esse nicho
 limit: z.number().int().min(1).max(30).optional(),
 })
 .optional(),
 )
 .handler(async ({ data: params }) => {
 const supabase = getServerClient();
 const itemsPerNiche = params?.limit ?? 8;
 const nicheFilter = params?.nicheFilter;

 // 1. Busca produtos com desconto real do banco (compare_at_cents > price_cents)
 const { data: discountedProducts, error: prodErr } = await supabase
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
 media:product_media(url, alt, sort_order),
 store:stores(id, name, slug, settings, description)
 `,
 )
 .in("status", ["published", "active"])
 .not("compare_at_cents", "is", null)
 .order("created_at", { ascending: false })
 .limit(200);

 if (prodErr) {
 console.warn("[getGlobalDealsPage] Error fetching discounted products:", prodErr.message);
 }

 const dbProducts: FlashOfferDTO[] = (discountedProducts || [])
 .filter((p: any) => p.compare_at_cents && p.compare_at_cents > p.price_cents)
 .map((p: any) => {
 const sortedMedia = Array.isArray(p.media)
 ? [...p.media].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
 : [];
 const cover = sortedMedia[0]?.url || "";
 const original = p.compare_at_cents || p.price_cents;
 const discount =
 original > p.price_cents
 ? Math.round(((original - p.price_cents) / original) * 100)
 : 0;

 return {
 id: p.id,
 title: p.title,
 slug: p.slug,
 store_id: p.store_id,
 store_name: p.store?.name || "Loja Parceira",
 price_cents: p.price_cents,
 original_price_cents: original,
 discount_percent: discount,
 mechanic_label: discount > 0 ? `${discount}% OFF` : "OFERTA",
 ends_at: null,
 cover_image: cover,
 selling_unit: p.attributes?.selling_unit || "un",
 in_stock: true,
 has_flash_offer: discount >= 15,
 has_free_delivery:
 p.attributes?.free_delivery === true || p.attributes?.entrega_gratis === true,
 has_express_delivery:
 p.attributes?.express_delivery === true || p.attributes?.entrega_expressa === true,
 } as FlashOfferDTO;
 });

 // 2. Busca lojas ativas
 const { data: storesData } = await supabase
 .from("stores")
 .select("id, name, slug, settings, logo_url")
 .limit(50);

 const allDbStores: StoreCardDTO[] = (storesData || []).map((s: any) => ({
 id: s.id,
 name: s.name,
 slug: s.slug || `loja-${s.id.slice(0, 6)}`,
 avatar_url: s.logo_url || s.settings?.logoUrl || s.settings?.logo_url || undefined,
 banner_url: s.settings?.bannerUrl || undefined,
 category: s.settings?.type || s.settings?.segment || s.settings?.niche || "Comércio Local",
 rating: 4.9,
 review_count: 120,
 distance_km: 1.2,
 is_open: true,
 delivery_time_min: "Disponível",
 }));

 // 3. Define as verticais/nichos do módulo Ofertas Global
 const GLOBAL_NICHES: Array<{
 nicho: string;
 label: string;
 emoji: string;
 color: string;
 to: string;
 }> = [
 { nicho: "gastronomia", label: "Gastronomia & Delivery", emoji: "🍔", color: "from-orange-600 to-red-600", to: "/gastronomia" },
 { nicho: "mercado", label: "Mercado & Hortifrúti", emoji: "🛒", color: "from-emerald-700 to-teal-600", to: "/mercado" },
 { nicho: "farmacia", label: "Farmácia & Saúde", emoji: "💊", color: "from-blue-600 to-cyan-600", to: "/farmacia" },
 { nicho: "moda", label: "Moda & Acessórios", emoji: "👗", color: "from-pink-600 to-rose-600", to: "/moda" },
 { nicho: "eletronicos", label: "Eletrônicos & Tech", emoji: "💻", color: "from-indigo-600 to-violet-600", to: "/eletronicos" },
 { nicho: "beleza", label: "Beleza & Bem-Estar", emoji: "💄", color: "from-fuchsia-600 to-pink-600", to: "/beleza" },
 { nicho: "pet", label: "Pet Shop", emoji: "🐾", color: "from-amber-600 to-orange-600", to: "/pet" },
 { nicho: "acougue", label: "Açougue & Churrasco", emoji: "🥩", color: "from-red-700 to-rose-700", to: "/acougue" },
 { nicho: "bebidas", label: "Bebidas & Adega", emoji: "🍻", color: "from-yellow-600 to-amber-600", to: "/bebidas" },
 { nicho: "casa", label: "Casa & Decoração", emoji: "🏠", color: "from-teal-600 to-green-600", to: "/casa" },
 ];

 const targetNiches = nicheFilter
 ? GLOBAL_NICHES.filter((n) => n.nicho === nicheFilter)
 : GLOBAL_NICHES;

 // 4. Para cada nicho, resolve ofertas (DB real + seed de fallback)
 const nicheSections: GlobalDealNicheSection[] = targetNiches
 .map((nicheConfig) => {
 const keywords = NICHE_STORE_KEYWORDS[nicheConfig.nicho] || [nicheConfig.nicho];

 // Lojas do nicho
 const nicheStores = allDbStores.filter((st) => {
 const cat = (st.category || "").toLowerCase();
 const name = (st.name || "").toLowerCase();
 return keywords.some((kw) => cat.includes(kw) || name.includes(kw));
 });

 const nicheStoreIds = new Set(nicheStores.map((s) => s.id));

 // Produtos reais do nicho (por loja + por título)
 let nicheProducts = dbProducts.filter((p) => {
 if (nicheStoreIds.has(p.store_id)) return true;
 const titleLower = p.title.toLowerCase();
 return keywords.some((kw) => titleLower.includes(kw));
 });

 // Ordena por maior desconto
 nicheProducts.sort((a, b) => b.discount_percent - a.discount_percent);

 return {
 nicho: nicheConfig.nicho,
 label: nicheConfig.label,
 emoji: nicheConfig.emoji,
 color: nicheConfig.color,
 to: nicheConfig.to,
 items: nicheProducts.slice(0, itemsPerNiche),
 stores: nicheStores.slice(0, 4),
 };
 })
 .filter((section) => section.items.length > 0); // Omite nichos sem nenhuma oferta

 // 5. Calcula estatísticas globais para Social Proof
 const totalDeals = nicheSections.reduce((acc, s) => acc + s.items.length, 0);
 const maxDiscount = nicheSections.reduce((max, s) => {
 const sectionMax = s.items.reduce((m, p) => Math.max(m, p.discount_percent), 0);
 return Math.max(max, sectionMax);
 }, 0);

 return {
 sections: nicheSections,
 totalDeals,
 maxDiscount,
 hasRealData: dbProducts.length > 0,
 };
 });
