import { Tag } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useMemo } from "react";
import {
 Flame,
 Knife,
 Storefront,
 Clock,
 MapPin,
 ArrowRight,
 ShoppingBag,
 ShieldCheck,
 CheckCircle,
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

type AcougueSearch = z.infer<typeof SearchSchema>;

const ACOUQUE_DEPARTMENTS: FilterChipOption[] = [
 { id: "todos", label: "Tudo", icon: Tag },
 { id: "cortes_nobres", label: "Cortes Nobres & Angus", icon: Flame },
 { id: "kits_churrasco", label: "Kits Churrasco", icon: Flame },
 { id: "dia_a_dia", label: "Carnes do Dia a Dia", icon: Knife },
 { id: "linguicas", label: "Linguiças & Defumados", icon: Flame },
 { id: "aves", label: "Frangos & Aves", icon: Knife },
 { id: "suinos", label: "Suínos & Costelinhas", icon: Knife },
];

export const Route = createFileRoute("/_store/acougue")({
 head: () => ({
 meta: [
 { title: "Boutiques de Carnes, Açougues & Churrasco | Waesy" },
 {
 name: "description",
 content:
 "Cortes nobres, picanha angus, kits para churrasco e carnes frescas preparadas pelas melhores boutiques e casas de carnes da cidade.",
 },
 ],
 }),
 validateSearch: (search: Record<string, unknown>): AcougueSearch =>
 SearchSchema.parse(search),
 loaderDeps: ({ search }) => search,
 loader: async () => {
   try {
 const [banners, hotpages, marketplaceFeed, productsRes] = await Promise.all([
 listActiveBanners({ data: { placement: "acougue" } }).catch(() => []),
 listHotpages({ data: { module: "acougue" } }).catch(() => []),
 getModularSurfaceFeed({ data: { surfaceSlug: "acougue" } }).catch(() => ({ sections: [], allProducts: [] })),
 listPublishedProducts({ data: { niche: "acougue", limit: 40 } }).catch(() => ({ status: "empty" as const, data: [] as ProductCardDTO[] })),
 ]);
 return {
 banners,
 hotpages,
 marketplaceFeed,
 catalogProducts: (productsRes as any).data ?? [],
 };
   } catch (err) {
     console.error("[loader:_store.acougue] Unhandled error:", err);
     return { banners: null, hotpages: null, marketplaceFeed: null, catalogProducts: null };
   }
 },
 component: AcougueVerticalPage,
 pendingComponent: PageSkeleton,
});

function AcougueVerticalPage() {
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

 // Filtragem de carnes e produtos de açougue
 const filteredProducts = useMemo(() => {
 const allProducts = marketplaceFeed?.allProducts || [];
 return allProducts.filter((p: any) => {
 const titleLower = p.title.toLowerCase();
 const descLower = (p.description || "").toLowerCase();
 const tags = (p.tags || []).map((t: string) => t.toLowerCase());

 const isMeatItem =
 titleLower.includes("picanha") ||
 titleLower.includes("costela") ||
 titleLower.includes("carne") ||
 titleLower.includes("alcatra") ||
 titleLower.includes("fraldinha") ||
 titleLower.includes("linguiça") ||
 titleLower.includes("ancho") ||
 titleLower.includes("chorizo") ||
 titleLower.includes("churrasco") ||
 titleLower.includes("patinho") ||
 titleLower.includes("maminha") ||
 titleLower.includes("bife") ||
 titleLower.includes("frango") ||
 titleLower.includes("suíno") ||
 tags.some((t: string) =>
 ["açougue", "carnes", "churrasco", "boutique de carnes", "angus"].includes(t),
 );

 if (activeDepartment === "todos") return isMeatItem || allProducts.length <= 10;
 if (activeDepartment === "cortes_nobres")
 return titleLower.includes("picanha") || titleLower.includes("ancho") || titleLower.includes("chorizo") || titleLower.includes("angus");
 if (activeDepartment === "kits_churrasco")
 return titleLower.includes("kit") || titleLower.includes("churrasco") || titleLower.includes("combo");
 if (activeDepartment === "dia_a_dia")
 return titleLower.includes("alcatra") || titleLower.includes("patinho") || titleLower.includes("moída");
 if (activeDepartment === "linguicas")
 return titleLower.includes("linguiça") || titleLower.includes("defumado");
 if (activeDepartment === "aves")
 return titleLower.includes("frango") || titleLower.includes("asa") || titleLower.includes("coxa");
 if (activeDepartment === "suinos")
 return titleLower.includes("suíno") || titleLower.includes("porco") || titleLower.includes("costelinha");
 return true;
 });
 }, [marketplaceFeed, activeDepartment]);

 // Boutiques de carnes parceiras
 const meatStores = useMemo(() => {
 const storeSection = marketplaceFeed?.sections?.find((s: any) => s.type === "store_rail");
 const stores = storeSection?.items || [];
 return stores.filter((s: any) => {
 const type = (s.type || "").toLowerCase();
 const name = (s.name || "").toLowerCase();
 return (
 type.includes("açougue") ||
 type.includes("carne") ||
 type.includes("boutique") ||
 name.includes("açougue") ||
 name.includes("carnes") ||
 name.includes("boutique") ||
 name.includes("steakhouse")
 );
 });
 }, [marketplaceFeed]);

  return (
    <div className="w-full max-w-5xl mx-auto px-0 sm:px-4 space-y-6 pb-24">
 {/* ── 1. Banners de Açougue & Churrasco ── */}
 {banners && banners.length > 0 && (
 <section aria-label="Banners de Açougue">
 <BannerHeroCarousel banners={banners} />
 </section>
 )}

 {/* ── 2. Hotpages / Campanhas ── */}
 {hotpages && hotpages.length > 0 && (
 <section aria-label="Coleções de Açougue">
 <HotpagesRail hotpages={hotpages} />
 </section>
 )}

 {/* ── 3. Discovery Control Bar ── */}
 <DiscoveryControlBar
 search={search.q || ""}
 onSearchChange={(q) => navigate({ search: (prev) => ({ ...prev, q }) })}
 searchPlaceholder="Buscar picanha, costela, frango, linguiça, espetinhos..."
 categories={ACOUQUE_DEPARTMENTS}
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
                  const key = prod.category_name || prod.category || prod.store_name || "Cortes Especiais";
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
                title="Nenhum corte encontrado"
                description="Tente selecionar outro departamento ou busque por tipos de cortes."
              />
            </div>
          )}
        </div>
 ) : (
 <section aria-label="Vitrine de Cortes & Produtos">
 {filteredProducts.length === 0 ? (
 <div className="py-12 text-center bg-card rounded-2xl p-6">
 <EmptyState
 title="Nenhum corte encontrado"
 description="Tente selecionar outro departamento ou busque por tipos de cortes."
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
