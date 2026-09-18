import { Tag } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useMemo } from "react";
import {
 Heartbeat,
 FirstAid,
 Pill,
 Baby,
 Sun,
 ShieldCheck,
 Clock,
 MapPin,
 Storefront,
 ArrowRight,
 ShoppingBag,
 SlidersHorizontal,
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

type FarmaciaSearch = z.infer<typeof SearchSchema>;

const FARMACIA_DEPARTMENTS: FilterChipOption[] = [
 { id: "todos", label: "Tudo", icon: Tag },
 { id: "medicamentos", label: "Medicamentos Isentos", icon: Pill },
 { id: "suplementos", label: "Vitaminas & Suplementos", icon: Heartbeat },
 { id: "dermocosmeticos", label: "Dermocosméticos", icon: Tag },
 { id: "higiene", label: "Higiene & Cuidados", icon: ShieldCheck },
 { id: "bebe", label: "Mamãe & Bebê", icon: Baby },
 { id: "primeiros_socorros", label: "Primeiros Socorros", icon: FirstAid },
 { id: "solar", label: "Protetor Solar & Verão", icon: Sun },
];

export const Route = createFileRoute("/_store/farmacia")({
 head: () => ({
 meta: [
 { title: "Farmácias, Drogarias & Saúde | Waesy" },
 {
 name: "description",
 content:
 "Encontre remédios isentos, suplementos, dermocosméticos e produtos de cuidados de farmácias e drogarias da sua cidade com entrega rápida.",
 },
 ],
 }),
 validateSearch: (search: Record<string, unknown>): FarmaciaSearch =>
 SearchSchema.parse(search),
 loaderDeps: ({ search }) => search,
 loader: async () => {
   try {
 const [banners, hotpages, marketplaceFeed, productsRes] = await Promise.all([
 listActiveBanners({ data: { placement: "farmacia" } }).catch(() => []),
 listHotpages({ data: { module: "farmacia" } }).catch(() => []),
 getModularSurfaceFeed({ data: { surfaceSlug: "farmacia" } }).catch(() => ({ sections: [], allProducts: [] })),
 listPublishedProducts({ data: { niche: "farmacia", limit: 40 } }).catch(() => ({ status: "empty" as const, data: [] as ProductCardDTO[] })),
 ]);
 return {
 banners,
 hotpages,
 marketplaceFeed,
 catalogProducts: (productsRes as any).data ?? [],
 };
   } catch (err) {
     console.error("[loader:_store.farmacia] Unhandled error:", err);
     return { banners: null, hotpages: null, marketplaceFeed: null, catalogProducts: null };
   }
 },
 component: FarmaciaVerticalPage,
 pendingComponent: PageSkeleton,
});
function FarmaciaVerticalPage() {
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

 // Filtragem de produtos de farmácia
 const filteredProducts = useMemo(() => {
 const allProducts = marketplaceFeed?.allProducts || [];
 return allProducts.filter((p: any) => {
 const titleLower = p.title.toLowerCase();
 const descLower = (p.description || "").toLowerCase();
 const tags = (p.tags || []).map((t: string) => t.toLowerCase());

 const isPharmacyItem =
 titleLower.includes("vitamina") ||
 titleLower.includes("creme") ||
 titleLower.includes("protetor") ||
 titleLower.includes("fralda") ||
 titleLower.includes("sabomete") ||
 titleLower.includes("remédio") ||
 titleLower.includes("dor") ||
 titleLower.includes("colírio") ||
 titleLower.includes("curativo") ||
 titleLower.includes("álcool") ||
 titleLower.includes("shampoo") ||
 titleLower.includes("escova") ||
 titleLower.includes("pasta") ||
 titleLower.includes("termômetro") ||
 tags.some((t: string) =>
 ["farmacia", "saude", "suplementos", "higiene", "medicamento"].includes(t),
 );

 if (activeDepartment === "todos") return isPharmacyItem || allProducts.length <= 10;
 if (activeDepartment === "medicamentos")
 return titleLower.includes("dor") || titleLower.includes("remédio") || titleLower.includes("colírio");
 if (activeDepartment === "suplementos")
 return titleLower.includes("vitamina") || titleLower.includes("whey") || titleLower.includes("creatina");
 if (activeDepartment === "dermocosmeticos")
 return titleLower.includes("protetor") || titleLower.includes("sérum") || titleLower.includes("creme");
 if (activeDepartment === "higiene")
 return titleLower.includes("sabonete") || titleLower.includes("escova") || titleLower.includes("fio");
 if (activeDepartment === "bebe")
 return titleLower.includes("fralda") || titleLower.includes("bebê") || titleLower.includes("lenço");
 if (activeDepartment === "primeiros_socorros")
 return titleLower.includes("curativo") || titleLower.includes("álcool") || titleLower.includes("gaze");
 if (activeDepartment === "solar")
 return titleLower.includes("protetor") || titleLower.includes("solar") || titleLower.includes("bronzeador");
 return true;
 });
 }, [marketplaceFeed, activeDepartment]);

 // Farmácias parceiras
 const pharmacyStores = useMemo(() => {
 const storeSection = marketplaceFeed?.sections?.find((s: any) => s.type === "store_rail");
 const stores = storeSection?.items || [];
 return stores.filter((s: any) => {
 const type = (s.type || "").toLowerCase();
 const name = (s.name || "").toLowerCase();
 return (
 type.includes("farmacia") ||
 type.includes("drogaria") ||
 type.includes("saude") ||
 name.includes("farmácia") ||
 name.includes("drogaria") ||
 name.includes("droga") ||
 name.includes("pharma")
 );
 });
 }, [marketplaceFeed]);

 return (
 <div className="w-full space-y-6 pb-20">
 {/* ── 1. Banners de Farmácia & Saúde ── */}
 {banners && banners.length > 0 && (
 <section aria-label="Banners de Farmácia">
 <BannerHeroCarousel banners={banners} />
 </section>
 )}

 {/* ── 2. Hotpages / Campanhas ── */}
 {hotpages && hotpages.length > 0 && (
 <section aria-label="Campanhas de Saúde">
 <HotpagesRail hotpages={hotpages} />
 </section>
 )}

 {/* ── 3. Discovery Control Bar & Departamentos ── */}
 <DiscoveryControlBar
 search={search.q || ""}
 onSearchChange={(q) => navigate({ search: (prev) => ({ ...prev, q }) })}
 searchPlaceholder="Buscar remédios, vitaminas, protetor solar, fraldas..."
 categories={FARMACIA_DEPARTMENTS}
 activeCategory={activeDepartment}
 onSelectCategory={handleDepartmentChange}
 viewMode={viewMode}
 onViewModeChange={handleViewModeChange}
 />

 {/* ── 4. Renderização do Feed Modular ou Grade Filtrada ── */}
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
 ) : (
 <section aria-label="Produtos de Saúde & Cuidados">
 {filteredProducts.length === 0 ? (
 <div className="py-12 text-center bg-card rounded-2xl p-6">
 <EmptyState
 title="Nenhum produto farmacêutico encontrado"
 description="Tente selecionar outro departamento ou busque por itens específicos."
 />
 </div>
 ) : viewMode === "list" ? (
 <div className="flex flex-col gap-3">
 {filteredProducts.map((product: any) => (
 <GroceryProductCard key={product.id} product={product} viewMode="list" />
 ))}
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
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
