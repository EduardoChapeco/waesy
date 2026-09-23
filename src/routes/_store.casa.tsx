import { GroceryProductCard } from "@/components/commerce/grocery-product-card";
import { Tag } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useMemo } from "react";
import {
 House,
 Armchair,
 Lamp,
 Bed,
 CookingPot,
 FlowerLotus,
 Storefront,
 ShoppingBag,
 ArrowsInLineVertical,
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
import { getModularSurfaceFeed } from "@/services/surface-cms.functions";
import { ModularSurfaceFeed } from "@/components/commerce/modular-surface-feed";
import { OfferCard } from "@/components/commerce/offer-card";
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

type CasaSearch = z.infer<typeof SearchSchema>;

const CASA_DEPARTMENTS: FilterChipOption[] = [
 { id: "todos", label: "Tudo para Casa", icon: Tag },
 { id: "moveis", label: "Móveis & Estofados", icon: Armchair },
 { id: "decoracao", label: "Decoração & Quadros", icon: FlowerLotus },
 { id: "iluminacao", label: "Iluminação & Luminárias", icon: Lamp },
 { id: "cama_mesa_banho", label: "Cama, Mesa & Banho", icon: Bed },
 { id: "utilidades", label: "Utilidades Domésticas & Panelas", icon: CookingPot },
 { id: "organizacao", label: "Organizadores & Cestos", icon: ArrowsInLineVertical },
];

export const Route = createFileRoute("/_store/casa")({
 head: () => ({
 meta: [
 { title: "Casa, Móveis, Decoração & Utilidades | Waesy" },
 {
 name: "description",
 content:
 "Transforme seu lar com móveis, decoração, iluminação, cama, mesa e utilidades domésticas das lojas da sua cidade.",
 },
 ],
 }),
 validateSearch: (search: Record<string, unknown>): CasaSearch => SearchSchema.parse(search),
 loaderDeps: ({ search }) => search,
 loader: async () => {
   try {
 const [banners, hotpages, marketplaceFeed, productsRes] = await Promise.all([
 listActiveBanners({ data: { placement: "casa" } }).catch(() => []),
 listHotpages({ data: { module: "casa" } }).catch(() => []),
 getModularSurfaceFeed({ data: { surfaceSlug: "casa" } }).catch(() => ({ sections: [], allProducts: [] })),
 listPublishedProducts({ data: { niche: "casa", limit: 40 } }).catch(() => ({ status: "empty" as const, data: [] as ProductCardDTO[] })),
 ]);
 return {
 banners,
 hotpages,
 marketplaceFeed,
 catalogProducts: (productsRes as any).data ?? [],
 };
   } catch (err) {
     console.error("[loader:_store.casa] Unhandled error:", err);
     return { banners: null, hotpages: null, marketplaceFeed: null, catalogProducts: null };
   }
 },
 component: CasaVerticalPage,
 pendingComponent: PageSkeleton,
});

function CasaVerticalPage() {
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

 // Filtragem de produtos para casa e decoração
 const filteredProducts = useMemo(() => {
 const allProducts = marketplaceFeed?.allProducts || [];
 return allProducts.filter((p: any) => {
 const titleLower = p.title.toLowerCase();
 const descLower = (p.description || "").toLowerCase();
 const tags = (p.tags || []).map((t: string) => t.toLowerCase());

 const isHomeItem =
 titleLower.includes("mesa") ||
 titleLower.includes("cadeira") ||
 titleLower.includes("sofá") ||
 titleLower.includes("almofada") ||
 titleLower.includes("quadro") ||
 titleLower.includes("luminária") ||
 titleLower.includes("abajur") ||
 titleLower.includes("panela") ||
 titleLower.includes("lençol") ||
 titleLower.includes("toalha") ||
 titleLower.includes("tapete") ||
 titleLower.includes("vaso") ||
 titleLower.includes("copo") ||
 titleLower.includes("prato") ||
 tags.some((t: string) => ["casa", "decoracao", "moveis", "utilidades"].includes(t));

 if (activeDepartment === "todos") return isHomeItem || allProducts.length <= 12;
 if (activeDepartment === "moveis")
 return titleLower.includes("mesa") || titleLower.includes("cadeira") || titleLower.includes("sofá") || titleLower.includes("poltrona") || titleLower.includes("estante");
 if (activeDepartment === "decoracao")
 return titleLower.includes("quadro") || titleLower.includes("vaso") || titleLower.includes("espelho") || titleLower.includes("escultura") || titleLower.includes("porta-retrato");
 if (activeDepartment === "iluminacao")
 return titleLower.includes("luminária") || titleLower.includes("abajur") || titleLower.includes("lustre") || titleLower.includes("pendente");
 if (activeDepartment === "cama_mesa_banho")
 return titleLower.includes("lençol") || titleLower.includes("toalha") || titleLower.includes("edredom") || titleLower.includes("travesseiro") || titleLower.includes("jogo de cama");
 if (activeDepartment === "utilidades")
 return titleLower.includes("panela") || titleLower.includes("copo") || titleLower.includes("prato") || titleLower.includes("faqueiro") || titleLower.includes("pote");
 if (activeDepartment === "organizacao")
 return titleLower.includes("cesto") || titleLower.includes("organizador") || titleLower.includes("cabide") || titleLower.includes("caixa");
 return true;
 });
 }, [marketplaceFeed, activeDepartment]);

 // Lojas de Casa & Decoração
 const homeStores = useMemo(() => {
 const storeSection = marketplaceFeed?.sections?.find((s: any) => s.type === "store_rail");
 const stores = storeSection?.items || [];
 return stores.filter((s: any) => {
 const type = (s.type || "").toLowerCase();
 const name = (s.name || "").toLowerCase();
 return (
 type.includes("casa") ||
 type.includes("moveis") ||
 type.includes("decoracao") ||
 name.includes("móveis") ||
 name.includes("decora") ||
 name.includes("casa") ||
 name.includes("design")
 );
 });
 }, [marketplaceFeed]);

 return (
 <div className="w-full max-w-5xl mx-auto px-0 sm:px-4 space-y-6 pb-24">
 {/* ── 1. Banners ── */}
 {banners && banners.length > 0 && (
 <section aria-label="Banners para Casa">
 <BannerHeroCarousel banners={banners} />
 </section>
 )}

 {/* ── 2. Hotpages / Campanhas para Casa ── */}
 {hotpages && hotpages.length > 0 && (
 <section aria-label="Coleções para Casa">
 <HotpagesRail hotpages={hotpages} />
 </section>
 )}

 {/* ── 3. Discovery Control Bar ── */}
 <DiscoveryControlBar
 search={search.q || ""}
 onSearchChange={(q) => navigate({ search: (prev) => ({ ...prev, q }) })}
 searchPlaceholder="Buscar móveis, decoração, iluminação, cama & banho..."
 categories={CASA_DEPARTMENTS}
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
 const key = prod.category_name || prod.category || prod.store_name || "Destaques para Casa";
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
 title="Nenhum item para casa encontrado"
 description="Tente selecionar outro departamento ou busque por marcas e modelos específicos."
 />
 </div>
 )}
 </div>
 ) : (
 <section aria-label="Vitrine de Produtos para Casa">
 {filteredProducts.length === 0 ? (
 <div className="py-12 text-center bg-card rounded-2xl p-6">
 <EmptyState
 title="Nenhum item para casa encontrado"
 description="Tente selecionar outro departamento ou busque por marcas e modelos específicos."
 />
 </div>
 ) : viewMode === "list" ? (
 <div className="flex flex-col gap-3">
 {filteredProducts.map((product: any) => (
 <OfferCard key={product.id} {...product} />
 ))}
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
 {filteredProducts.map((product: any) => (
 <OfferCard key={product.id} {...product} />
 ))}
 </div>
 )}
 </section>
 )}
 </div>
 );
}
