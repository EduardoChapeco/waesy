import { GroceryProductCard } from "@/components/commerce/grocery-product-card";
import { Tag } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useMemo } from "react";
import {
 Laptop,
 DeviceMobile,
 GameController,
 Headphones,
 Television,
 Plug,
 Storefront,
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

type EletronicosSearch = z.infer<typeof SearchSchema>;

const ELETRONICOS_DEPARTMENTS: FilterChipOption[] = [
 { id: "todos", label: "Tudo em Eletrônicos & Tech", icon: Tag },
 { id: "smartphones", label: "Smartphones & Celulares", icon: DeviceMobile },
 { id: "notebooks", label: "Notebooks & Computadores", icon: Laptop },
 { id: "gamer", label: "PC Gamer & Periféricos", icon: GameController },
 { id: "audio", label: "Fones, Caixas & Áudio", icon: Headphones },
 { id: "tvs", label: "Smart TVs & Monitores", icon: Television },
 { id: "acessorios", label: "Cabos, Carregadores & Suportes", icon: Plug },
];

export const Route = createFileRoute("/_store/eletronicos")({
 head: () => ({
 meta: [
 { title: "Eletrônicos, Informática, Smartphones & Gamers | Waesy" },
 {
 name: "description",
 content:
 "Encontre celulares, computadores, consoles, fones de ouvido, televisores e acessórios nas melhores lojas de tecnologia da sua cidade.",
 },
 ],
 }),
 validateSearch: (search: Record<string, unknown>): EletronicosSearch => SearchSchema.parse(search),
 loaderDeps: ({ search }) => search,
 loader: async () => {
   try {
 const [banners, hotpages, marketplaceFeed, productsRes] = await Promise.all([
 listActiveBanners({ data: { placement: "eletronicos" } }).catch(() => []),
 listHotpages({ data: { module: "eletronicos" } }).catch(() => []),
 getModularSurfaceFeed({ data: { surfaceSlug: "eletronicos" } }).catch(() => ({ sections: [], allProducts: [] })),
 listPublishedProducts({ data: { niche: "eletronicos", limit: 40 } }).catch(() => ({ status: "empty" as const, data: [] as ProductCardDTO[] })),
 ]);
 return {
 banners,
 hotpages,
 marketplaceFeed,
 catalogProducts: (productsRes as any).data ?? [],
 };
   } catch (err) {
     console.error("[loader:_store.eletronicos] Unhandled error:", err);
     return { banners: null, hotpages: null, marketplaceFeed: null, catalogProducts: null };
   }
 },
 component: EletronicosVerticalPage,
 pendingComponent: PageSkeleton,
});

function EletronicosVerticalPage() {
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

 const handleSearchChange = (q: string) => {
 navigate({
 search: (prev) => ({
 ...prev,
 q: q || undefined,
 }),
 });
 };

 const relevantHotpages = useMemo(() => {
 if (!hotpages) return [];
 return hotpages.filter(
 (hp: any) =>
 hp.module === "marketplace" ||
 hp.slug.includes("tech") ||
 hp.slug.includes("gamer") ||
 hp.slug.includes("fone") ||
 hp.slug.includes("celular"),
 );
 }, [hotpages]);

 const allProducts = useMemo(() => {
 if (!marketplaceFeed?.allProducts) return [];
 let list = marketplaceFeed.allProducts;
 if (search.q) {
 const qLower = search.q.toLowerCase();
 list = list.filter((p: any) => p.title.toLowerCase().includes(qLower));
 }
 return list;
 }, [marketplaceFeed, search.q]);

 const relevantStores = useMemo(() => {
 if (!marketplaceFeed?.sections) return [];
 const storeSection = marketplaceFeed.sections.find((s: any) => s.type === "store_rail");
 return storeSection?.items || [];
 }, [marketplaceFeed]);

 return (
 <div className="w-full max-w-5xl mx-auto px-0 sm:px-4 space-y-6 pb-24">
 {/* ── 1. Banners de Tecnologia & Eletrônicos ── */}
 {banners && banners.length > 0 && (
 <section aria-label="Destaques de Tecnologia">
 <BannerHeroCarousel banners={banners} />
 </section>
 )}

 {/* ── 2. Hotpages de Eletrônicos & Informática ── */}
 {relevantHotpages.length > 0 && (
 <section aria-label="Coleções de Tecnologia">
 <HotpagesRail hotpages={relevantHotpages} basePath="/eletronicos" />
 </section>
 )}

 {/* ── 3. Barra Canônica de Controle de Descoberta ── */}
 <DiscoveryControlBar
 search={search.q || ""}
 onSearchChange={(q) => navigate({ search: (prev) => ({ ...prev, q }) })}
 searchPlaceholder="Buscar celulares, notebooks, fones, tvs, gamers..."
 categories={ELETRONICOS_DEPARTMENTS}
 activeCategory={activeDepartment}
 onSelectCategory={handleDepartmentChange}
 viewMode={viewMode}
 onViewModeChange={handleViewModeChange}
 />

 {/* ── 4. Lojas Especializadas em Tecnologia da Região ── */}
 {relevantStores.length > 0 && (
 <section aria-label="Lojas de Tecnologia">
 <HorizontalRail
 title="Lojas de Eletrônicos & Informática"
 hideHeader={true}
 actionTo="/buscar"
 >
 {relevantStores.map((store: any) => (
 <StoreCard key={store.id} {...store} />
 ))}
 </HorizontalRail>
 </section>
 )}

 {/* ── 5. Grade / Feed de Produtos de Tecnologia ── */}
 {viewMode === "feed" ? (
 <div className="space-y-8">
 {marketplaceFeed?.sections && marketplaceFeed.sections.length > 0 && (
 <ModularSurfaceFeed sections={marketplaceFeed.sections} />
 )}

 {allProducts.length > 0 ? (
 <div className="space-y-8">
 {(() => {
 const grouped = allProducts.reduce((acc: Record<string, typeof allProducts>, prod: any) => {
 const key = prod.category_name || prod.category || prod.store_name || "Tecnologia em Destaque";
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
 title="Nenhum produto eletrônico encontrado"
 description="Tente ajustar os termos de busca ou navegue pelos departamentos acima."
 />
 </div>
 )}
 </div>
 ) : allProducts.length === 0 ? (
 <EmptyState
 title="Nenhum produto eletrônico encontrado"
 description="Tente ajustar os termos de busca ou navegue pelos departamentos acima."
 action={
 <Button
 variant="outline"
 onClick={() => handleDepartmentChange("todos")}
 className="rounded-xl border-border"
 >
 Ver todos os eletrônicos
 </Button>
 }
 />
 ) : viewMode === "list" ? (
 <section aria-label="Produtos de Eletrônicos">
 <div className="flex flex-col gap-3">
 {allProducts.map((product: any) => (
 <OfferCard key={product.id} {...product} />
 ))}
 </div>
 </section>
 ) : (
 <section aria-label="Produtos de Eletrônicos">
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
 {allProducts.map((product: any) => (
 <OfferCard key={product.id} {...product} />
 ))}
 </div>
 </section>
 )}
 </div>
 );
}
