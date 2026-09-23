import { GroceryProductCard } from "@/components/commerce/grocery-product-card";
import { Tag } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useMemo } from "react";
import {
 Bone,
 Heartbeat,
 FirstAid,
 Storefront,
 Clock,
 MapPin,
 ArrowRight,
 ShoppingBag,
 Scissors,
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

type PetSearch = z.infer<typeof SearchSchema>;

const PET_DEPARTMENTS: FilterChipOption[] = [
 { id: "todos", label: "Tudo", icon: Tag },
 { id: "racoes", label: "Rações Cães & Gatos", icon: Bone },
 { id: "petiscos", label: "Petiscos & Sachês", icon: Bone },
 { id: "farmacia_vet", label: "Farmácia Veterinária", icon: FirstAid },
 { id: "higiene", label: "Higiene & Areias", icon: Tag },
 { id: "brinquedos", label: "Brinquedos & Camas", icon: ShoppingBag },
 { id: "agro", label: "Agropecuária & Jardim", icon: Tag },
];

export const Route = createFileRoute("/_store/pet")({
 head: () => ({
 meta: [
 { title: "Pet Shops, Rações, Veterinária & Agro | Waesy" },
 {
 name: "description",
 content:
 "Rações premium, petiscos, medicamentos veterinários, acessórios e serviços de banho e tosa dos pet shops e agropecuárias da sua cidade.",
 },
 ],
 }),
 validateSearch: (search: Record<string, unknown>): PetSearch =>
 SearchSchema.parse(search),
 loaderDeps: ({ search }) => search,
 loader: async () => {
   try {
 const [banners, hotpages, marketplaceFeed, productsRes] = await Promise.all([
 listActiveBanners({ data: { placement: "pet" } }).catch(() => []),
 listHotpages({ data: { module: "pet" } }).catch(() => []),
 getModularSurfaceFeed({ data: { surfaceSlug: "pet" } }).catch(() => ({ sections: [], allProducts: [] })),
 listPublishedProducts({ data: { niche: "pet", limit: 40 } }).catch(() => ({ status: "empty" as const, data: [] as ProductCardDTO[] })),
 ]);
 return {
 banners,
 hotpages,
 marketplaceFeed,
 catalogProducts: (productsRes as any).data ?? [],
 };
   } catch (err) {
     console.error("[loader:_store.pet] Unhandled error:", err);
     return { banners: null, hotpages: null, marketplaceFeed: null, catalogProducts: null };
   }
 },
 component: PetVerticalPage,
 pendingComponent: PageSkeleton,
});

function PetVerticalPage() {
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

 // Filtragem de produtos para pets
 const filteredProducts = useMemo(() => {
 const allProducts = marketplaceFeed?.allProducts || [];
 return allProducts.filter((p: any) => {
 const titleLower = p.title.toLowerCase();
 const descLower = (p.description || "").toLowerCase();
 const tags = (p.tags || []).map((t: string) => t.toLowerCase());

 const isPetItem =
 titleLower.includes("ração") ||
 titleLower.includes("petisco") ||
 titleLower.includes("antipulgas") ||
 titleLower.includes("cão") ||
 titleLower.includes("gato") ||
 titleLower.includes("cachorro") ||
 titleLower.includes("areia") ||
 titleLower.includes("coleira") ||
 titleLower.includes("brinquedo") ||
 titleLower.includes("tapete higiênico") ||
 titleLower.includes("shampoo pet") ||
 tags.some((t: string) =>
 ["pet", "ração", "agropecuaria", "veterinaria", "cachorro", "gato"].includes(t),
 );

 if (activeDepartment === "todos") return isPetItem || allProducts.length <= 10;
 if (activeDepartment === "racoes")
 return titleLower.includes("ração") || titleLower.includes("premier") || titleLower.includes("royal");
 if (activeDepartment === "petiscos")
 return titleLower.includes("petisco") || titleLower.includes("sachê") || titleLower.includes("osso");
 if (activeDepartment === "farmacia_vet")
 return titleLower.includes("antipulgas") || titleLower.includes("vermífugo") || titleLower.includes("remédio");
 if (activeDepartment === "higiene")
 return titleLower.includes("areia") || titleLower.includes("tapete") || titleLower.includes("shampoo");
 if (activeDepartment === "brinquedos")
 return titleLower.includes("brinquedo") || titleLower.includes("cama") || titleLower.includes("arranhador");
 if (activeDepartment === "agro")
 return titleLower.includes("adubo") || titleLower.includes("semente") || titleLower.includes("jardim");
 return true;
 });
 }, [marketplaceFeed, activeDepartment]);

 // Pet shops e agropecuárias parceiras
 const petStores = useMemo(() => {
 const storeSection = marketplaceFeed?.sections?.find((s: any) => s.type === "store_rail");
 const stores = storeSection?.items || [];
 return stores.filter((s: any) => {
 const type = (s.type || "").toLowerCase();
 const name = (s.name || "").toLowerCase();
 return (
 type.includes("pet") ||
 type.includes("veterinaria") ||
 type.includes("agro") ||
 name.includes("pet") ||
 name.includes("agro") ||
 name.includes("veterinária") ||
 name.includes("bicho")
 );
 });
 }, [marketplaceFeed]);

 return (
 <div className="w-full max-w-5xl mx-auto px-0 sm:px-4 space-y-6 pb-24">
 {/* ── 1. Banners de Pet ── */}
 {banners && banners.length > 0 && (
 <section aria-label="Banners de Pet Shop">
 <BannerHeroCarousel banners={banners} />
 </section>
 )}

 {/* ── 2. Hotpages / Campanhas ── */}
 {hotpages && hotpages.length > 0 && (
 <section aria-label="Coleções Pet">
 <HotpagesRail hotpages={hotpages} />
 </section>
 )}

 {/* ── 3. Discovery Control Bar ── */}
 <DiscoveryControlBar
 search={search.q || ""}
 onSearchChange={(q) => navigate({ search: (prev) => ({ ...prev, q }) })}
 searchPlaceholder="Buscar rações, petiscos, farmácia vet, caminhas..."
 categories={PET_DEPARTMENTS}
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
                  const key = prod.category_name || prod.category || prod.store_name || "Destaques Pet";
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
                title="Nenhum produto pet encontrado"
                description="Tente selecionar outro departamento ou busque por marcas de ração e medicamentos."
              />
            </div>
          )}
        </div>
 ) : (
 <section aria-label="Vitrine de Produtos Pet">
 {filteredProducts.length === 0 ? (
 <div className="py-12 text-center bg-card rounded-2xl p-6">
 <EmptyState
 title="Nenhum produto pet encontrado"
 description="Tente selecionar outro departamento ou busque por marcas de ração e medicamentos."
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
