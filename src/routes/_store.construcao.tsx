import { resolveActiveCity } from "@/lib/city-helper";
import { GroceryProductCard } from "@/components/commerce/grocery-product-card";
import { Tag } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useMemo } from "react";
import { Hammer, PaintBrush, Lightbulb, Drop, Wrench, Armchair, Storefront, Clock, MapPin, ArrowRight, ShoppingBag } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import { PageSkeleton } from "@/components/state/loading";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { StoreCard } from "@/components/commerce/store-card";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import { DiscoveryControlBar, type ViewModeType, type FilterChipOption } from "@/components/commerce/discovery-control-bar";
import { getModularSurfaceFeed } from "@/services/surface-cms.functions";
import { ModularSurfaceFeed } from "@/components/commerce/modular-surface-feed";
import { OfferCard } from "@/components/commerce/offer-card";
import { listActiveBanners } from "@/services/banner.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { listPublishedProducts } from "@/services/catalog.functions";
import { getPublicClassifieds } from "@/services/classifieds.functions";
import type { ProductCardDTO } from "@/types/catalog";
import { resolveNicheDepartments } from "@/lib/niche-helpers";
import { useWindowSizeClass } from "@/hooks/use-mobile";
import {
  CommercialShowcaseTemplate,
  mapSurfaceFeedToCommercialShowcase,
} from "@/components/commerce/ifood/CommercialShowcaseTemplate";

const SearchSchema = z.object({
 q: z.string().optional(),
 view: z.enum(["feed", "grid", "list"]).default("feed").optional(),
 sort: z.enum(["newest", "price_asc", "price_desc", "in_stock"]).default("newest").optional(),
 categoria: z.string().optional(),
});

type ConstrucaoSearch = z.infer<typeof SearchSchema>;

const CONSTRUCAO_DEPARTMENTS: FilterChipOption[] = [
  { id: "todos", label: "Tudo na Obra", icon: Tag },
  { id: "prestadores", label: "Prestadores (Pedreiro, Eletricista, Encanador)", icon: Wrench },
  { id: "lojas", label: "Lojas & Depósitos", icon: Storefront },
  { id: "tintas", label: "Tintas e Acabamento", icon: PaintBrush },
  { id: "ferramentas", label: "Ferramentas & Maquinário", icon: Hammer },
  { id: "eletrica", label: "Elétrica e Iluminação", icon: Lightbulb },
  { id: "hidraulica", label: "Hidráulica e Tubos", icon: Drop },
  { id: "decoracao", label: "Decoração e Interiores", icon: Armchair },
  { id: "fixacao", label: "Parafusos e Ferragens", icon: Wrench },
];

export const Route = createFileRoute("/_store/construcao")({
 head: () => ({
 meta: [
 { title: "Construção, Ferramentas, Tintas e Casa | Waesy" },
 {
 name: "description",
 content:
 "Materiais de construção, ferramentas, tintas, elétrica, hidráulica e decoração das lojas locais da sua cidade.",
 },
 ],
 }),
 validateSearch: (search: Record<string, unknown>): ConstrucaoSearch =>
 SearchSchema.parse(search),
 loaderDeps: ({ search }) => search,
 loader: async ({ location }) => {
    const activeCity = resolveActiveCity(location?.search);
   try {
 const [banners, hotpages, marketplaceFeed, productsRes, serviceProviders] = await Promise.all([
 listActiveBanners({ data: { placement: "construcao", city: activeCity } }).catch(() => []),
 listHotpages({ data: { module: "construcao" } }).catch(() => []),
 getModularSurfaceFeed({ data: { surfaceSlug: "construcao", city: activeCity } }).catch(() => ({ sections: [], allProducts: [] })),
 listPublishedProducts({ data: { niche: "construcao", limit: 40 } }).catch(() => ({ status: "empty" as const, data: [] as ProductCardDTO[] })),
 getPublicClassifieds({ city: activeCity, category: "services" } as any).catch(() => []),
 ]);
 return {
 banners,
 hotpages,
 marketplaceFeed,
 catalogProducts: (productsRes as any).data ?? [],
 serviceProviders: Array.isArray(serviceProviders) ? serviceProviders : [],
 };
   } catch (err) {
     console.error("[loader:_store.construcao] Unhandled error:", err);
     return { banners: null, hotpages: null, marketplaceFeed: null, catalogProducts: null, serviceProviders: [] };
   }
 },
 component: ConstrucaoVerticalPage,
 pendingComponent: PageSkeleton,
});

function ConstrucaoVerticalPage() {
 const { banners, hotpages, marketplaceFeed, serviceProviders } = ((Route.useLoaderData?.() as any) || {});
 const search = Route.useSearch();
 const navigate = useNavigate({ from: Route.fullPath });

 const [activeDepartment, setActiveDepartment] = useState(search.categoria || "todos");
 const [viewMode, setViewMode] = useState<ViewModeType>(search.view || "feed");

 const constructionProviders = useMemo(() => {
   const list = (serviceProviders || []) as any[];
   return list.filter((p: any) => {
     const text = `${p.title || ""} ${p.content || ""} ${p.category || ""}`.toLowerCase();
     return (
       text.includes("pedreir") ||
       text.includes("eletric") ||
       text.includes("encan") ||
       text.includes("pinto") ||
       text.includes("serralh") ||
       text.includes("gesso") ||
       text.includes("obra") ||
       text.includes("reforma") ||
       text.includes("constru") ||
       text.includes("calha") ||
       text.includes("marcen")
     );
   });
 }, [serviceProviders]);

 const handleDepartmentChange = (depId: string) => {
 setActiveDepartment(depId);
 navigate({
 search: (prev: any) => ({
 ...prev,
 categoria: depId === "todos" ? undefined : depId,
 }),
 });
 };

 const handleViewModeChange = (mode: ViewModeType) => {
 setViewMode(mode);
 navigate({
 search: (prev: any) => ({
 ...prev,
 view: mode === "feed" ? undefined : mode,
 }),
 });
 };

 // Filtragem de materiais de construção e ferramentas
 const filteredProducts = useMemo(() => {
 const allProducts = marketplaceFeed?.allProducts || [];
 return allProducts.filter((p: any) => {
 const titleLower = p.title.toLowerCase();
 const descLower = (p.description || "").toLowerCase();
 const tags = (p.tags || []).map((t: string) => t.toLowerCase());

 const isConstructionItem =
 titleLower.includes("tinta") ||
 titleLower.includes("furadeira") ||
 titleLower.includes("parafuso") ||
 titleLower.includes("lâmpada") ||
 titleLower.includes("fio") ||
 titleLower.includes("cano") ||
 titleLower.includes("torneira") ||
 titleLower.includes("alicate") ||
 titleLower.includes("martelo") ||
 titleLower.includes("cimento") ||
 titleLower.includes("argamassa") ||
 titleLower.includes("piso") ||
 tags.some((t: string) =>
 ["construcao", "ferramentas", "tintas", "eletrica", "hidraulica", "casa"].includes(t),
 );

 if (activeDepartment === "todos") return isConstructionItem;
 if (activeDepartment === "tintas")
 return titleLower.includes("tinta") || titleLower.includes("verniz") || titleLower.includes("rolo");
 if (activeDepartment === "ferramentas")
 return titleLower.includes("furadeira") || titleLower.includes("alicate") || titleLower.includes("martelo") || titleLower.includes("chave");
 if (activeDepartment === "eletrica")
 return titleLower.includes("lâmpada") || titleLower.includes("fio") || titleLower.includes("tomada") || titleLower.includes("led");
 if (activeDepartment === "hidraulica")
 return titleLower.includes("cano") || titleLower.includes("torneira") || titleLower.includes("tubo") || titleLower.includes("registro");
 if (activeDepartment === "decoracao")
 return titleLower.includes("quadro") || titleLower.includes("almofada") || titleLower.includes("mesa") || titleLower.includes("cadeira");
 if (activeDepartment === "fixacao")
 return titleLower.includes("parafuso") || titleLower.includes("bucha") || titleLower.includes("prego");
 return true;
 });
 }, [marketplaceFeed, activeDepartment]);

 // Lojas de construção parceiras
 const constructionStores = useMemo(() => {
 const storeSection = marketplaceFeed?.sections?.find((s: any) => s.type === "store_rail");
 const stores = storeSection?.items || [];
 return stores.filter((s: any) => {
 const type = (s.type || "").toLowerCase();
 const name = (s.name || "").toLowerCase();
 return (
 type.includes("construcao") ||
 type.includes("materiais") ||
 type.includes("tintas") ||
 type.includes("ferramentas") ||
 name.includes("construção") ||
 name.includes("tintas") ||
 name.includes("materiais") ||
 name.includes("ferragens")
 );
 });
 }, [marketplaceFeed]);

 const { isCompact } = useWindowSizeClass();
 const [activeFilters, setActiveFilters] = useState<string[]>([]);
 const showcaseData = useMemo(
   () => mapSurfaceFeedToCommercialShowcase(marketplaceFeed, "construcao", "Depósito & Ferragens"),
   [marketplaceFeed],
 );

 if (isCompact) {
   return (
     <CommercialShowcaseTemplate
       nicheId="construcao"
       nicheTitle="Construção & Ferramentas"
       subcategories={CONSTRUCAO_DEPARTMENTS.map((d) => ({ id: d.id, label: d.label, icon: d.icon as any }))}
       activeSubcategoryId={activeDepartment}
       onSelectSubcategory={handleDepartmentChange}
       banners={banners || []}
       featureMiniBanners={showcaseData.featureMiniBanners}
       recentStores={showcaseData.recentStores}
       stores={showcaseData.stores}
       spotlightStores={showcaseData.spotlightStores}
       products={filteredProducts}
       activeFilters={activeFilters}
       onToggleFilter={(id) =>
         setActiveFilters((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
       }
     />
   );
 }

 return (
 <div className="w-full max-w-5xl mx-auto px-0 sm:px-4 space-y-6 pb-24">
 {/* ── 1. Banners de Construção & Reforma ── */}
 {banners && banners.length > 0 && (
 <section aria-label="Banners de Construção">
 <BannerHeroCarousel banners={banners} />
 </section>
 )}

 {/* ── 2. Hotpages / Campanhas de Reforma ── */}
 {hotpages && hotpages.length > 0 && (
 <section aria-label="Coleções de Construção">
 <HotpagesRail hotpages={hotpages} />
 </section>
 )}

 {/* ── 3. Discovery Control Bar ── */}
 <DiscoveryControlBar
 search={search.q || ""}
 onSearchChange={(q) => navigate({ search: (prev: any) => ({ ...prev, q }) })}
 searchPlaceholder="Buscar tintas, ferramentas, elétrica, hidráulica..."
 categories={CONSTRUCAO_DEPARTMENTS}
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
 const key = prod.category_name || prod.category || prod.store_name || "Materiais em Destaque";
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
 <div className="py-12 text-center bg-card rounded-lg p-6">
 <EmptyState
 title="Nenhum material encontrado"
 description="Tente selecionar outro departamento ou busque por marcas e ferramentas específicas."
 />
 </div>
 )}
 </div>
 ) : (
 <section aria-label="Vitrine de Materiais & Ferramentas">
 {filteredProducts.length === 0 ? (
 <div className="py-12 text-center bg-card rounded-lg p-6">
 <EmptyState
 title="Nenhum material encontrado"
 description="Tente selecionar outro departamento ou busque por ferramentas e marcas."
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
