import { Tag } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useMemo } from "react";
import {
 Heartbeat,
 Scissors,
 Drop,
 Sun,
 HandSoap,
 FirstAid,
 Smiley,
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
import { ServicePackagesRail } from "@/components/commerce/service-packages-rail";
import { listPublicStorePackages } from "@/services/service-packages.functions";
import { listPublishedProducts } from "@/services/catalog.functions";
import type { ProductCardDTO } from "@/types/catalog";
import { resolveNicheDepartments } from "@/lib/niche-helpers";

const SearchSchema = z.object({
 q: z.string().optional(),
 view: z.enum(["feed", "grid", "list"]).default("feed").optional(),
 sort: z.enum(["newest", "price_asc", "price_desc", "in_stock"]).default("newest").optional(),
 categoria: z.string().optional(),
});

type BelezaSearch = z.infer<typeof SearchSchema>;

const BELEZA_DEPARTMENTS: FilterChipOption[] = [
 { id: "todos", label: "Tudo em Beleza & Saúde", icon: Tag },
 { id: "perfumaria", label: "Perfumaria & Fragrâncias", icon: Drop },
 { id: "cabelos", label: "Cuidados com Cabelos", icon: Scissors },
 { id: "skincare", label: "Skincare & Rosto", icon: Sun },
 { id: "corpo-banho", label: "Corpo & Banho", icon: HandSoap },
 { id: "maquiagem", label: "Maquiagem & Unhas", icon: Smiley },
 { id: "dermocosmeticos", label: "Dermocosméticos & Farmácia", icon: FirstAid },
 { id: "suplementos", label: "Suplementos & Bem-Estar", icon: Heartbeat },
];

export const Route = createFileRoute("/_store/beleza")({
 head: () => ({
 meta: [
 { title: "Beleza, Cosméticos, Perfumaria & Saúde | Waesy" },
 {
 name: "description",
 content:
 "Descubra perfumes, maquiagens, produtos para cabelo, dermocosméticos e suplementos nas melhores lojas e farmácias da sua cidade.",
 },
 ],
 }),
 validateSearch: (search: Record<string, unknown>): BelezaSearch => SearchSchema.parse(search),
 loaderDeps: ({ search }) => search,
 loader: async () => {
   try {
 const [banners, hotpages, marketplaceFeed, packages, productsRes] = await Promise.all([
 listActiveBanners({ data: { placement: "beleza" } }).catch(() => []),
 listHotpages({ data: { module: "beleza" } }).catch(() => []),
 getModularSurfaceFeed({ data: { surfaceSlug: "beleza" } }).catch(() => ({ sections: [], allProducts: [] })),
 listPublicStorePackages().catch(() => []),
 listPublishedProducts({ data: { niche: "beleza", limit: 40 } }).catch(() => ({ status: "empty" as const, data: [] as ProductCardDTO[] })),
 ]);
 return {
 banners,
 hotpages,
 marketplaceFeed,
 packages,
 catalogProducts: (productsRes as any).data ?? [],
 };
   } catch (err) {
     console.error("[loader:_store.beleza] Unhandled error:", err);
     return { banners: null, hotpages: null, marketplaceFeed: null, packages: null, catalogProducts: null };
   }
 },
 component: BelezaVerticalPage,
 pendingComponent: PageSkeleton,
});

function BelezaVerticalPage() {
 const { banners, hotpages, marketplaceFeed, packages } = ((Route.useLoaderData?.() as any) || {});
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

 const handleSortChange = (sort: any) => {
 navigate({
 search: (prev) => ({
 ...prev,
 sort: sort === "newest" ? undefined : sort,
 }),
 });
 };

 // Filtragem inteligente de produtos de beleza, perfumes, skincare e cabelos
 const filteredProducts = useMemo(() => {
 const allProducts = marketplaceFeed?.allProducts || [];
 return allProducts.filter((p: any) => {
 const titleLower = (p.title || "").toLowerCase();
 const tags = Array.isArray(p.tags) ? p.tags.map((t: string) => t.toLowerCase()) : [];

 const isBeautyItem =
 titleLower.includes("shampoo") ||
 titleLower.includes("perfume") ||
 titleLower.includes("creme") ||
 titleLower.includes("máscara") ||
 titleLower.includes("maquiagem") ||
 titleLower.includes("batom") ||
 titleLower.includes("sérum") ||
 titleLower.includes("hidratante") ||
 titleLower.includes("protetor") ||
 titleLower.includes("condicionador") ||
 titleLower.includes("vitamina") ||
 titleLower.includes("esmalte") ||
 titleLower.includes("loção") ||
 tags.some((t: string) => ["beleza", "cosmeticos", "perfumaria", "cabelo", "skincare", "saude"].includes(t));

 if (activeDepartment === "todos") return isBeautyItem || allProducts.length <= 12;
 if (activeDepartment === "perfumaria")
 return titleLower.includes("perfume") || titleLower.includes("colônia") || titleLower.includes("fragrância") || titleLower.includes("desodorante");
 if (activeDepartment === "cabelos")
 return titleLower.includes("shampoo") || titleLower.includes("condicionador") || titleLower.includes("máscara") || titleLower.includes("óleo");
 if (activeDepartment === "skincare")
 return titleLower.includes("sérum") || titleLower.includes("protetor") || titleLower.includes("facial") || titleLower.includes("limpeza facial");
 if (activeDepartment === "corpo-banho")
 return titleLower.includes("hidratante") || titleLower.includes("sabonete") || titleLower.includes("esfoliante") || titleLower.includes("loção");
 if (activeDepartment === "maquiagem")
 return titleLower.includes("batom") || titleLower.includes("base") || titleLower.includes("máscara de cílios") || titleLower.includes("esmalte");
 if (activeDepartment === "dermocosmeticos")
 return titleLower.includes("dermo") || titleLower.includes("antirrugas") || titleLower.includes("clareador") || titleLower.includes("ácido");
 if (activeDepartment === "suplementos")
 return titleLower.includes("suplemento") || titleLower.includes("vitamina") || titleLower.includes("colágeno") || titleLower.includes("whey");
 return true;
 });
 }, [marketplaceFeed, activeDepartment]);

 // Lojas de beleza, perfumarias e farmácias
 const beautyStores = useMemo(() => {
 const storeSection = marketplaceFeed?.sections?.find((s: any) => s.type === "store_rail");
 const stores = storeSection?.items || [];
 return stores.filter((s: any) => {
 const type = (s.type || "").toLowerCase();
 const name = (s.name || "").toLowerCase();
 return (
 type.includes("perfumaria") ||
 type.includes("cosmetico") ||
 type.includes("beleza") ||
 type.includes("farmacia") ||
 name.includes("perfumaria") ||
 name.includes("cosméticos") ||
 name.includes("beleza") ||
 name.includes("drogaria") ||
 name.includes("farma")
 );
 });
 }, [marketplaceFeed]);

 return (
 <div className="w-full max-w-7xl mx-auto space-y-6 pb-6 overflow-x-hidden">
 {/* ── 1. Banners ── */}
 {banners && banners.length > 0 && (
 <section aria-label="Banners de Beleza">
 <BannerHeroCarousel banners={banners} />
 </section>
 )}

 {/* ── 2. Pacotes de Sessões & Aulas de Beleza/Estética ── */}
 {packages && packages.length > 0 && (
 <section aria-label="Pacotes de Estética">
 <ServicePackagesRail
 packages={packages}
 title="Pacotes de Estética, Cabelo & Barbearia"
 subtitle="Adquira combos de sessões e cortes com desconto garantido."
 />
 </section>
 )}

 {/* ── 3. Hotpages / Destaques ── */}
 {hotpages && hotpages.length > 0 && (
 <section aria-label="Coleções de Beleza">
 <HotpagesRail hotpages={hotpages} />
 </section>
 )}

 {/* ── 4. Discovery Control Bar ── */}
 <DiscoveryControlBar
 search={search.q || ""}
 onSearchChange={(q) => navigate({ search: (prev) => ({ ...prev, q }) })}
 searchPlaceholder="Buscar perfumes, maquiagem, shampoos, skincare..."
 categories={BELEZA_DEPARTMENTS}
 activeCategory={activeDepartment}
 onSelectCategory={handleDepartmentChange}
 viewMode={viewMode}
 onViewModeChange={handleViewModeChange}
 />

      {/* ── 5. Renderização do Feed Modular ou Grade Filtrada ── */}
      {viewMode === "feed" ? (
        <div className="space-y-8">
          {marketplaceFeed?.sections && marketplaceFeed.sections.length > 0 && (
            <ModularSurfaceFeed sections={marketplaceFeed.sections} />
          )}

          {filteredProducts.length > 0 ? (
            <div className="space-y-8">
              {(() => {
                const grouped = filteredProducts.reduce((acc: Record<string, typeof filteredProducts>, prod: any) => {
                  const key = prod.category_name || prod.category || prod.store_name || "Destaques de Beleza";
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
                title="Nenhum produto de beleza encontrado"
                description="Tente selecionar outro departamento ou busque por marcas e cosméticos específicos."
              />
            </div>
          )}
        </div>
 ) : (
 <section aria-label="Vitrine de Produtos">
 {filteredProducts.length === 0 ? (
 <div className="py-12 text-center bg-card rounded-2xl p-6">
 <EmptyState
 title="Nenhum cosmético ou perfume encontrado"
 description="Tente selecionar outro departamento ou busque por marcas específicas."
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
