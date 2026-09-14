import { Tag } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useMemo } from "react";
import {
 Broom,
 Drop,
 HandSoap,
 Package,
 Buildings,
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

type LimpezaSearch = z.infer<typeof SearchSchema>;

const LIMPEZA_DEPARTMENTS: FilterChipOption[] = [
 { id: "todos", label: "Tudo em Limpeza & Higiene", icon: Tag },
 { id: "pesada", label: "Limpeza Pesada & Pós-Obra", icon: Broom },
 { id: "lavanderia", label: "Lavanderia & Sabões", icon: Drop },
 { id: "cozinha", label: "Cozinha & Desengordurantes", icon: HandSoap },
 { id: "descartaveis", label: "Descartáveis & Embalagens", icon: Package },
 { id: "empresas", label: "Corporativo & Distribuidoras", icon: Buildings },
];

export const Route = createFileRoute("/_store/limpeza")({
 head: () => ({
 meta: [
 { title: "Produtos de Limpeza, Higiene & Descartáveis | Waesy" },
 {
 name: "description",
 content:
 "Compre produtos de limpeza profissional, descartáveis, sabões, desinfetantes e itens de higiene nas melhores distribuidoras da sua cidade.",
 },
 ],
 }),
 validateSearch: (search: Record<string, unknown>): LimpezaSearch => SearchSchema.parse(search),
 loaderDeps: ({ search }) => search,
 loader: async () => {
   try {
 const [banners, hotpages, marketplaceFeed, productsRes] = await Promise.all([
 listActiveBanners({ data: { placement: "limpeza" } }).catch(() => []),
 listHotpages({ data: { module: "limpeza" } }).catch(() => []),
 getModularSurfaceFeed({ data: { surfaceSlug: "limpeza" } }).catch(() => ({ sections: [], allProducts: [] })),
 listPublishedProducts({ data: { niche: "limpeza", limit: 40 } }).catch(() => ({ status: "empty" as const, data: [] as ProductCardDTO[] })),
 ]);
 return {
 banners,
 hotpages,
 marketplaceFeed,
 catalogProducts: (productsRes as any).data ?? [],
 };
   } catch (err) {
     console.error("[loader:_store.limpeza] Unhandled error:", err);
     return { banners: null, hotpages: null, marketplaceFeed: null, catalogProducts: null };
   }
 },
 component: LimpezaVerticalPage,
 pendingComponent: PageSkeleton,
});

function LimpezaVerticalPage() {
 const { banners, hotpages, marketplaceFeed, catalogProducts } = ((Route.useLoaderData?.() as any) || {});
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
 hp.slug.includes("limpeza") ||
 hp.slug.includes("higiene") ||
 hp.slug.includes("descartavel"),
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
 <div className="w-full space-y-6 pb-20">
 {/* ── 1. Banners de Limpeza ── */}
 {banners && banners.length > 0 && (
 <section aria-label="Destaques de Limpeza">
 <BannerHeroCarousel banners={banners} />
 </section>
 )}

 {/* ── 2. Hotpages de Limpeza & Higiene ── */}
 {relevantHotpages.length > 0 && (
 <section aria-label="Coleções de Limpeza">
 <HotpagesRail hotpages={relevantHotpages} basePath="/limpeza" />
 </section>
 )}

 {/* ── 3. Barra Canônica de Controle de Descoberta ── */}
 <DiscoveryControlBar
 search={search.q || ""}
 onSearchChange={(q) => navigate({ search: (prev) => ({ ...prev, q }) })}
 searchPlaceholder="Buscar desinfetantes, detergentes, descartáveis..."
 categories={LIMPEZA_DEPARTMENTS}
 activeCategory={activeDepartment}
 onSelectCategory={handleDepartmentChange}
 viewMode={viewMode}
 onViewModeChange={handleViewModeChange}
 />

 {/* ── 4. Distribuidoras & Lojas de Limpeza ── */}
 {relevantStores.length > 0 && (
 <section aria-label="Distribuidoras de Limpeza">
 <HorizontalRail
 title="Distribuidoras & Lojas de Limpeza"
 hideHeader={true}
 actionTo="/buscar"
 >
 {relevantStores.map((store: any) => (
 <StoreCard key={store.id} {...store} />
 ))}
 </HorizontalRail>
 </section>
 )}

 {/* ── 5. Grade / Feed de Produtos de Limpeza ── */}
 {viewMode === "feed" ? (
 <div className="space-y-8">
 {marketplaceFeed?.sections && marketplaceFeed.sections.length > 0 ? (
 <ModularSurfaceFeed sections={marketplaceFeed.sections} />
 ) : (
 <div className="py-12 text-center text-xs text-muted-foreground">
 Nenhuma seção ativa no momento.
 </div>
 )}
 </div>
 ) : allProducts.length === 0 ? (
 <EmptyState
 title="Nenhum produto de limpeza encontrado"
 description="Tente ajustar os termos de busca ou navegue pelos departamentos acima."
 action={
 <Button
 variant="outline"
 onClick={() => handleDepartmentChange("todos")}
 className="rounded-xl border-border"
 >
 Ver todos os produtos
 </Button>
 }
 />
 ) : viewMode === "list" ? (
 <section aria-label="Produtos de Limpeza">
 <div className="flex flex-col gap-3">
 {allProducts.map((product: any) => (
 <OfferCard key={product.id} {...product} />
 ))}
 </div>
 </section>
 ) : (
 <section aria-label="Produtos de Limpeza">
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
