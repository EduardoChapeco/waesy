import { Tag } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useMemo } from "react";
import {
 BeerBottle,
 Wine,
 Flame,
 Snowflake,
 Coffee,
 Drop,
 Storefront,
 Clock,
 ArrowRight,
 ShoppingBag,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import { PageSkeleton } from "@/components/state/loading";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { StoreCard } from "@/components/commerce/store-card";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import {
 DiscoveryControlBar,
 type ViewModeType,
 type FilterChipOption,
} from "@/components/commerce/discovery-control-bar";
import { GroceryProductCard } from "@/components/commerce/grocery-product-card";
import { getModularSurfaceFeed } from "@/services/surface-cms.functions";
import { ModularSurfaceFeed } from "@/components/commerce/modular-surface-feed";
import { listActiveBanners } from "@/services/banner.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { listPublishedProducts } from "@/services/catalog.functions";
import type { ProductCardDTO } from "@/types/catalog";
import { resolveNicheDepartments } from "@/lib/niche-helpers";

const SearchSchema = z.object({
 q: z.string().optional(),
 view: z.enum(["feed", "grid", "list"]).default("feed").optional(),
 sort: z.enum(["newest", "price_asc", "price_desc", "in_stock"]).default("newest").optional(),
 categoria: z.string().optional(),
});

type BebidasSearch = z.infer<typeof SearchSchema>;

const BEBIDAS_DEPARTMENTS: FilterChipOption[] = [
 { id: "todos", label: "Tudo", icon: Tag },
 { id: "cervejas", label: "Cervejas & Chopp", icon: BeerBottle },
 { id: "vinhos", label: "Vinhos & Espumantes", icon: Wine },
 { id: "destilados", label: "Destilados & Gin", icon: Flame },
 { id: "gelo_conveniencia", label: "Gelo & Carvão", icon: Snowflake },
 { id: "refrigerantes", label: "Sucos & Refris", icon: Drop },
 { id: "energeticos", label: "Energéticos & Isotônicos", icon: Tag },
];

export const Route = createFileRoute("/_store/bebidas")({
 head: () => ({
 meta: [
 { title: "Distribuidoras de Bebidas, Adegas & Gelo | Waesy" },
 {
 name: "description",
 content:
 "Cervejas geladas, vinhos, destilados, refrigerantes, energéticos e gelo com entrega rápida das melhores distribuidoras da cidade.",
 },
 ],
 }),
 validateSearch: (search: Record<string, unknown>): BebidasSearch =>
 SearchSchema.parse(search),
 loaderDeps: ({ search }) => search,
 loader: async () => {
   try {
 const [banners, hotpages, marketplaceFeed, productsRes] = await Promise.all([
 listActiveBanners({ data: { placement: "bebidas" } }).catch(() => []),
 listHotpages({ data: { module: "bebidas" } }).catch(() => []),
 getModularSurfaceFeed({ data: { surfaceSlug: "bebidas" } }).catch(() => ({ sections: [], allProducts: [] })),
 listPublishedProducts({ data: { niche: "bebidas", limit: 40 } }).catch(() => ({ status: "empty" as const, data: [] as ProductCardDTO[] })),
 ]);
 return {
 banners,
 hotpages,
 marketplaceFeed,
 catalogProducts: (productsRes as any).data ?? [],
 };
   } catch (err) {
     console.error("[loader:_store.bebidas] Unhandled error:", err);
     return { banners: null, hotpages: null, marketplaceFeed: null, catalogProducts: null };
   }
 },
 component: BebidasVerticalPage,
 pendingComponent: PageSkeleton,
});

function BebidasVerticalPage() {
 const { banners, hotpages, marketplaceFeed } = ((Route.useLoaderData?.() as any) || {});
 const search = Route.useSearch();
 const navigate = useNavigate({ from: Route.fullPath });

 const [activeDepartment, setActiveDepartment] = useState(search.categoria || "todos");
 const [viewMode, setViewMode] = useState<ViewModeType>(search.view || "feed");

 const handleDepartmentChange = (depId: string) => {
 setActiveDepartment(depId);
 navigate({
 search: (prev) => ({
 ...prev,
 categoria: depId === "todos" ? undefined : depId,
 }),
 });
 };

 const handleViewModeChange = (mode: ViewModeType) => {
 setViewMode(mode);
 navigate({
 search: (prev) => ({
 ...prev,
 view: mode === "feed" ? undefined : mode,
 }),
 });
 };

 // Filtragem de produtos de bebidas
 const filteredProducts = useMemo(() => {
 const allProducts = marketplaceFeed?.allProducts || [];
 return allProducts.filter((p: any) => {
 const titleLower = p.title.toLowerCase();
 const descLower = (p.description || "").toLowerCase();
 const tags = (p.tags || []).map((t: string) => t.toLowerCase());

 const isDrinkItem =
 titleLower.includes("cerveja") ||
 titleLower.includes("vinho") ||
 titleLower.includes("whisky") ||
 titleLower.includes("gin") ||
 titleLower.includes("vodka") ||
 titleLower.includes("gelo") ||
 titleLower.includes("carvão") ||
 titleLower.includes("refrigerante") ||
 titleLower.includes("suco") ||
 titleLower.includes("energético") ||
 titleLower.includes("chopp") ||
 titleLower.includes("espumante") ||
 tags.some((t: string) =>
 ["bebidas", "cerveja", "adega", "distribuidora", "gelo", "vinho"].includes(t),
 );

 if (activeDepartment === "todos") return isDrinkItem || allProducts.length <= 10;
 if (activeDepartment === "cervejas")
 return titleLower.includes("cerveja") || titleLower.includes("chopp") || titleLower.includes("ipa");
 if (activeDepartment === "vinhos")
 return titleLower.includes("vinho") || titleLower.includes("espumante") || titleLower.includes("cabernet");
 if (activeDepartment === "destilados")
 return titleLower.includes("gin") || titleLower.includes("whisky") || titleLower.includes("vodka") || titleLower.includes("cachaça");
 if (activeDepartment === "gelo_conveniencia")
 return titleLower.includes("gelo") || titleLower.includes("carvão") || titleLower.includes("copo");
 if (activeDepartment === "refrigerantes")
 return titleLower.includes("coca") || titleLower.includes("guaraná") || titleLower.includes("suco") || titleLower.includes("refrigerante");
 if (activeDepartment === "energeticos")
 return titleLower.includes("monster") || titleLower.includes("red bull") || titleLower.includes("energético");
 return true;
 });
 }, [marketplaceFeed, activeDepartment]);

 // Distribuidoras e adegas parceiras
 const drinkStores = useMemo(() => {
 const storeSection = marketplaceFeed?.sections?.find((s: any) => s.type === "store_rail");
 const stores = storeSection?.items || [];
 return stores.filter((s: any) => {
 const type = (s.type || "").toLowerCase();
 const name = (s.name || "").toLowerCase();
 return (
 type.includes("bebida") ||
 type.includes("adega") ||
 type.includes("conveniencia") ||
 type.includes("distribuidora") ||
 name.includes("bebidas") ||
 name.includes("adega") ||
 name.includes("distribuidora") ||
 name.includes("conveniência")
 );
 });
 }, [marketplaceFeed]);

 return (
 <div className="w-full max-w-7xl mx-auto space-y-6 pb-6 overflow-x-hidden">
 {/* ── 1. Banners de Bebidas ── */}
 {banners && banners.length > 0 && (
 <section aria-label="Banners de Bebidas">
 <BannerHeroCarousel banners={banners} />
 </section>
 )}

 {/* ── 2. Hotpages / Happy Hour ── */}
 {hotpages && hotpages.length > 0 && (
 <section aria-label="Coleções de Bebidas">
 <HotpagesRail hotpages={hotpages} />
 </section>
 )}

 {/* ── 3. Discovery Control Bar ── */}
 <DiscoveryControlBar
 search={search.q || ""}
 onSearchChange={(q) => navigate({ search: (prev) => ({ ...prev, q }) })}
 searchPlaceholder="Buscar cervejas, vinhos, destilados, gelo, sucos..."
 categories={BEBIDAS_DEPARTMENTS}
 activeCategory={activeDepartment}
 onSelectCategory={handleDepartmentChange}
 viewMode={viewMode}
 onViewModeChange={handleViewModeChange}
 />

 {/* ── 4. Renderização do Feed Modular ou Grade Filtrada ── */}
 {viewMode === "feed" ? (
 <div className="space-y-8">
 {marketplaceFeed?.sections && marketplaceFeed.sections.length > 0 && (
 <ModularSurfaceFeed sections={marketplaceFeed.sections} />
 )}

 {filteredProducts.length > 0 ? (
 <div className="space-y-8">
 {(() => {
 const grouped = filteredProducts.reduce((acc: Record<string, typeof filteredProducts>, prod: any) => {
 const key = prod.category_name || prod.category || prod.store_name || "Bebidas em Destaque";
 if (!acc[key]) acc[key] = [];
 acc[key].push(prod);
 return acc;
 }, {});

 return Object.entries(grouped).map(([groupName, prods]: [string, any]) => (
 <HorizontalRail
 key={groupName}
 title={groupName}
 hideHeader={false}
 actionLabel="Ver grade"
 onAction={() => handleViewModeChange("grid")}
 >
 {prods.map((prod: any) => (
 <div key={prod.id} className="w-56 sm:w-64 shrink-0">
 <GroceryProductCard product={prod} viewMode="grid" />
 </div>
 ))}
 </HorizontalRail>
 ));
 })()}
 </div>
 ) : (
 <div className="py-12 text-center bg-card rounded-2xl p-6">
 <EmptyState
 title="Nenhuma bebida encontrada"
 description="Tente selecionar outro departamento ou busque por marcas e tipos de bebidas."
 />
 </div>
 )}
 </div>
 ) : (
 <section aria-label="Vitrine de Bebidas">
 {filteredProducts.length === 0 ? (
 <div className="py-12 text-center bg-card rounded-2xl p-6">
 <EmptyState
 title="Nenhuma bebida encontrada"
 description="Tente selecionar outro departamento ou busque por marcas e produtos específicos."
 />
 </div>
 ) : viewMode === "list" ? (
 <div className="flex flex-col gap-3">
 {filteredProducts.map((product: any) => (
 <GroceryProductCard key={product.id} product={product} viewMode="list" />
 ))}
 </div>
 ) : (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-5">
 {filteredProducts.map((product: any) => (
 <GroceryProductCard key={product.id} product={product} viewMode="grid" />
 ))}
 </div>
 )}
 </section>
 )}
 </div>
 );
}
