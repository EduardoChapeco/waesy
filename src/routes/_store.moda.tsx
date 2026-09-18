import { Tag } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useMemo } from "react";
import {
 TShirt,
 ShoppingBag,
 Storefront,
 Clock,
 MapPin,
 ArrowRight,
 Handbag,
 Sunglasses,
 Footprints,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import { PageSkeleton } from "@/components/state/loading";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { StoreCard } from "@/components/commerce/store-card";
import { OfferCard } from "@/components/commerce/offer-card";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import {
 DiscoveryControlBar,
 type ViewModeType,
 type FilterChipOption,
} from "@/components/commerce/discovery-control-bar";
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

type ModaSearch = z.infer<typeof SearchSchema>;

const MODA_DEPARTMENTS: FilterChipOption[] = [
 { id: "todos", label: "Tudo", icon: Tag },
 { id: "feminina", label: "Moda Feminina", icon: TShirt },
 { id: "masculina", label: "Moda Masculina", icon: TShirt },
 { id: "calcados", label: "Calçados & Tênis", icon: Footprints },
 { id: "acessorios", label: "Bolsas & Acessórios", icon: Handbag },
 { id: "fitness", label: "Fitness & Praia", icon: Tag },
 { id: "infantil", label: "Infantil & Kids", icon: ShoppingBag },
];

export const Route = createFileRoute("/_store/moda")({
 head: () => ({
 meta: [
 { title: "Moda, Roupas, Calçados & Acessórios | Waesy" },
 {
 name: "description",
 content:
 "Descubra as últimas tendências em roupas, calçados, bolsas e acessórios das boutiques e lojas locais da sua cidade.",
 },
 ],
 }),
 validateSearch: (search: Record<string, unknown>): ModaSearch =>
 SearchSchema.parse(search),
 loaderDeps: ({ search }) => search,
 loader: async () => {
   try {
 const [banners, hotpages, marketplaceFeed, productsRes] = await Promise.all([
 listActiveBanners({ data: { placement: "moda" } }).catch(() => []),
 listHotpages({ data: { module: "moda" } }).catch(() => []),
 getModularSurfaceFeed({ data: { surfaceSlug: "moda" } }).catch(() => ({ sections: [], allProducts: [] })),
 listPublishedProducts({ data: { niche: "moda", limit: 40 } }).catch(() => ({ status: "empty" as const, data: [] as ProductCardDTO[] })),
 ]);
 return {
 banners,
 hotpages,
 marketplaceFeed,
 catalogProducts: (productsRes as any).data ?? [],
 };
   } catch (err) {
     console.error("[loader:_store.moda] Unhandled error:", err);
     return { banners: null, hotpages: null, marketplaceFeed: null, catalogProducts: null };
   }
 },
 component: ModaVerticalPage,
 pendingComponent: PageSkeleton,
});

function ModaVerticalPage() {
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

 // Combina Surface CMS + catálogo real (sem heurística de título)
 const allProducts: ProductCardDTO[] = useMemo(() => {
 const surfaceProducts = (marketplaceFeed?.allProducts || []) as ProductCardDTO[];
 const catalogArr = (catalogProducts || []) as ProductCardDTO[];
 const base = surfaceProducts.length > 0 ? surfaceProducts : catalogArr;
 if (activeDepartment === "todos") return base;
 return base.filter((p: any) => {
 const tags = (p.tags || []).map((t: string) => t.toLowerCase());
 const cat = (p.attributes?.categoria || p.attributes?.tipo || "").toLowerCase();
 if (activeDepartment === "feminina") return tags.some((t: string) => ["feminino","feminina","vestido","saia"].includes(t)) || cat.includes("feminina");
 if (activeDepartment === "masculina") return tags.some((t: string) => ["masculino","masculina","camiseta","bermuda"].includes(t)) || cat.includes("masculina");
 if (activeDepartment === "calcados") return tags.some((t: string) => ["tenis","sapato","sandalia","calcado","bota"].includes(t)) || cat.includes("calcados");
 if (activeDepartment === "acessorios") return tags.some((t: string) => ["bolsa","cinto","oculos","relogio","acessorio"].includes(t)) || cat.includes("acessorios");
 if (activeDepartment === "fitness") return tags.some((t: string) => ["fitness","legging","treino","praia","biquini"].includes(t)) || cat.includes("fitness");
 if (activeDepartment === "infantil") return tags.some((t: string) => ["infantil","kids","bebe","crianca"].includes(t)) || cat.includes("infantil");
 return true;
 });
 }, [marketplaceFeed, catalogProducts, activeDepartment]);

 // Lojas de moda: apenas do Surface CMS store_rail
 const fashionStores = useMemo(() => {
 const storeSection = marketplaceFeed?.sections?.find((s: any) => s.type === "store_rail");
 return storeSection?.items || [];
 }, [marketplaceFeed]);

 return (
 <div className="w-full space-y-6 pb-20">
 {/* ── 1. Banners de Moda ── */}
 {banners && banners.length > 0 && (
 <section aria-label="Banners de Moda">
 <BannerHeroCarousel banners={banners} />
 </section>
 )}

 {/* ── 2. Hotpages / Campanhas ── */}
 {hotpages && hotpages.length > 0 && (
 <section aria-label="Coleções de Moda">
 <HotpagesRail hotpages={hotpages} />
 </section>
 )}

 {/* ── 3. Discovery Control Bar ── */}
 <DiscoveryControlBar
 search={search.q || ""}
 onSearchChange={(q) => navigate({ search: (prev) => ({ ...prev, q }) })}
 searchPlaceholder="Buscar vestidos, calçados, bolsas, fitness, camisas..."
 categories={MODA_DEPARTMENTS}
 activeCategory={activeDepartment}
 onSelectCategory={handleDepartmentChange}
 viewMode={viewMode}
 onViewModeChange={handleViewModeChange}
 />

 {/* ── 4. Renderização ── */}
 {viewMode === "feed" ? (
 <div className="space-y-8">
 {marketplaceFeed?.sections && marketplaceFeed.sections.length > 0 ? (
 <ModularSurfaceFeed sections={marketplaceFeed.sections} />
 ) : allProducts.length > 0 ? (
 <section aria-label="Vitrine de Moda" className="w-full">
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
 {allProducts.map((product: any) => (
 <OfferCard key={product.id} {...product} />
 ))}
 </div>
 </section>
 ) : (
 <div className="py-12 text-center text-xs text-muted-foreground">
 Nenhum produto de moda disponível no momento.
 </div>
 )}
 </div>
 ) : (
 <section aria-label="Vitrine de Roupas & Calçados">
 {allProducts.length === 0 ? (
 <div className="py-12 text-center bg-card rounded-2xl p-6">
 <EmptyState
 title="Nenhuma peça de roupa encontrada"
 description="Tente selecionar outro departamento ou busque por marcas e tamanhos."
 />
 </div>
 ) : viewMode === "list" ? (
 <div className="flex flex-col gap-3">
 {allProducts.map((product: any) => (
 <OfferCard key={product.id} {...product} />
 ))}
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
 {allProducts.map((product: any) => (
 <OfferCard key={product.id} {...product} />
 ))}
 </div>
 )}
 </section>
 )}
 </div>
 );
}
