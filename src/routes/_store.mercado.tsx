import { Tag } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useMemo } from "react";
import { Flame, Storefront, ForkKnife, Coffee, Heartbeat, Clock, ShieldCheck, Truck, ArrowRight, Package, Broom, CheckCircle, CalendarCheck, ShoppingBag, MagnifyingGlass, SlidersHorizontal, MapPin, Leaf, Grains, Drop, Buildings,  } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import { PageSkeleton } from "@/components/state/loading";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { OfferCard } from "@/components/commerce/offer-card";
import { StoreCard } from "@/components/commerce/store-card";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import {
 DiscoveryControlBar,
 type ViewModeType,
 type FilterChipOption,
} from "@/components/commerce/discovery-control-bar";
import { ContextualStoriesRail } from "@/components/stories/contextual-stories-rail";
import { GroceryProductCard } from "@/components/commerce/grocery-product-card";
import {
 listPublishedProducts,
 listPublishedCategories,
 listAvailableAttributes,
} from "@/services/catalog.functions";
import { getMarketplaceFeed } from "@/services/marketplace.functions";
import { getModularSurfaceFeed } from "@/services/surface-cms.functions";
import { ModularSurfaceFeed } from "@/components/commerce/modular-surface-feed";
import { listActiveBanners } from "@/services/banner.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { PromotionalFlyersRail } from "@/components/commerce/flyers/promotional-flyers-rail";
import { listActiveStoreFlyers } from "@/services/store-flyers.functions";
import type { ProductCardDTO } from "@/types/catalog";
import { formatMoney } from "@/lib/money";
import { resolveNicheDepartments } from "@/lib/niche-helpers";

// ─── Search Schema & View Modes ───────────────────────────────────────────────
const SearchSchema = z.object({
 q: z.string().optional(),
 view: z.enum(["feed", "grid", "list"]).default("grid").optional(),
 sort: z.enum(["newest", "price_asc", "price_desc", "in_stock"]).default("newest").optional(),
 niche: z.string().optional(),
 categoria: z.string().optional(),
 loja: z.string().optional(),
 dieta: z.string().optional(),
 minCents: z.number().int().min(0).optional(),
 maxCents: z.number().int().min(0).optional(),
 atributos: z.record(z.string()).optional(),
});

type CatalogSearch = z.infer<typeof SearchSchema>;

// ─── Departamentos e Corredores do Supermercado (Clean Apple HIG) ─────────────
const SUPERMARKET_DEPARTMENTS: FilterChipOption[] = [
 { id: "todos", label: "Tudo" },
 { id: "tabloide", label: "Tabloide da Semana", badge: "Ofertas" },
 { id: "hortifruti", label: "Hortifrúti" },
 { id: "carnes", label: "Açougue" },
 { id: "padaria", label: "Padaria & Frios" },
 { id: "laticinios", label: "Laticínios" },
 { id: "bebidas", label: "Bebidas" },
 { id: "mercearia", label: "Mercearia" },
 { id: "limpeza", label: "Limpeza" },
 { id: "higiene", label: "Higiene Pessoal" },
 { id: "congelados", label: "Congelados" },
 { id: "pet", label: "Pet Shop" },
];

const DIETARY_FILTERS = [
 { id: "todos", label: "Todos" },
 { id: "organico", label: "Orgânicos" },
 { id: "sem_gluten", label: "Sem Glúten" },
 { id: "sem_lactose", label: "Sem Lactose" },
 { id: "oferta_relampago", label: "Ofertas Relâmpago" },
];

export const Route = createFileRoute("/_store/mercado")({
 head: () => ({
 meta: [
 { title: "Mercado — Supermercados & Mercearias da Região | Waesy" },
 {
 name: "description",
 content:
 "Feed completo e unificado de todos os supermercados, atacados, açougues e hortifrútis da região. Compare ofertas e faça compras online com entrega agendada ou retirada express.",
 },
 ],
 }),
 validateSearch: (search: Record<string, unknown>): CatalogSearch => SearchSchema.parse(search),
 loaderDeps: ({ search }) => search,
 loader: async ({ location }) => {
   try {
 const search = location.search as CatalogSearch;
 const [productsRes, categoriesRes, attributesRes, feedRes, bannersRes, hotpagesRes, flyersRes] = await Promise.all([
 listPublishedProducts({
 data: {
 categorySlug: search.categoria,
 niche: search.niche === "tabloide" || search.niche === "todos" ? undefined : search.niche,
 sort: search.sort ?? "newest",
 minCents: search.minCents,
 maxCents: search.maxCents,
 attributes: search.atributos,
 limit: 60,
 },
 }).catch(() => ({ status: "ok" as const, data: [] as ProductCardDTO[] })),
 listPublishedCategories().catch(() => []),
 listAvailableAttributes().catch(() => []),
 getModularSurfaceFeed({ data: { surfaceSlug: search.niche || "mercado" } }).catch(() => ({ sections: [], allProducts: [] })),
 listActiveBanners({ data: { placement: "mercado" } }).catch(() => []),
 listHotpages({ data: { module: "mercado" } }).catch(() => []),
 listActiveStoreFlyers({ data: {} }).catch(() => []),
 ]);

      return {
        products: productsRes || { status: "ok", data: [] },
        categories: categoriesRes || [],
        availableAttributes: attributesRes || [],
        feed: feedRes || { sections: [], allProducts: [] },
        banners: bannersRes || [],
        hotpages: hotpagesRes || [],
        flyers: flyersRes || [],
      };
    } catch (err) {
      console.error("[loader:_store.mercado] Unhandled error:", err);
      return {
        products: { status: "ok", data: [] },
        categories: [],
        availableAttributes: [],
        feed: { sections: [], allProducts: [] },
        banners: [],
        hotpages: [],
        flyers: [],
      };
    }
  },
 pendingComponent: PageSkeleton,
 component: SupermarketMasterPage,
});

function SupermarketMasterPage() {
  const loaderData = (Route.useLoaderData() as any) || {};
  const result = loaderData.products || { status: "ok", data: [] };
  const categories = loaderData.categories || [];
  const availableAttributes = loaderData.availableAttributes || [];
  const feed = loaderData.feed || { sections: [], allProducts: [] };
  const banners = loaderData.banners || [];
  const hotpages = loaderData.hotpages || [];
  const flyers = loaderData.flyers || [];
  const search = Route.useSearch();
 const navigate = useNavigate();

 const currentView = (search.view || "grid") as ViewModeType;
 const [localSearch, setLocalSearch] = useState(search.q || "");
 const [selectedDietary, setSelectedDietary] = useState(search.dieta || "todos");
 const [selectedStore, setSelectedStore] = useState<string>(search.loja || "todos");

 const handleSearchSubmit = (val: string) => {
 setLocalSearch(val);
 navigate({
 to: Route.fullPath,
 search: (s: Record<string, any>) => ({
 ...s,
 q: val || undefined,
 }),
 });
 };

 const handleSelectDepartment = (deptId: string) => {
 navigate({
 to: Route.fullPath,
 search: (s: Record<string, any>) => ({
 ...s,
 niche: deptId === "todos" ? undefined : deptId,
 categoria: undefined,
 }),
 });
 };

 const handleViewModeChange = (mode: ViewModeType) => {
 navigate({
 to: Route.fullPath,
 search: (s: Record<string, any>) => ({ ...s, view: mode }),
 });
 };

 const allProducts: ProductCardDTO[] =
 result.status === "ok" && result.data.length > 0
 ? result.data
 : (feed.allProducts || []).map((p: any) => ({
 id: p.id,
 slug: p.slug,
 title: p.title,
 brand: p.store_name,
 priceCents: p.price_cents,
 compareAtCents: p.original_price_cents,
 coverUrl: p.cover_image,
 coverAlt: p.title,
 isOutOfStock: false,
 attributes: {},
 }));

 // Lista dinâmica de todos os supermercados parceiros presentes no catálogo
 const availableStores = useMemo(() => {
 const storesSet = new Set<string>();
 allProducts.forEach((p: any) => {
 const name = p.store_name || p.storeName || p.brand;
 if (name) storesSet.add(name);
 });
 return Array.from(storesSet);
 }, [allProducts]);

 // Filtragem multi-loja e preferências
 const displayedProducts = useMemo(() => {
 return allProducts.filter((prod: any) => {
 // Filtro por supermercado / empório parceiro
 if (selectedStore !== "todos") {
 const storeName = prod.store_name || prod.storeName || prod.brand;
 if (storeName !== selectedStore) return false;
 }

 // Filtro de busca textual
 if (localSearch.trim()) {
 const q = localSearch.toLowerCase().trim();
 const matchesTitle = prod.title?.toLowerCase().includes(q);
 const matchesBrand = prod.brand?.toLowerCase().includes(q);
 const matchesStore = prod.store_name?.toLowerCase().includes(q);
 if (!matchesTitle && !matchesBrand && !matchesStore) return false;
 }

 // Filtro de ofertas da semana
 if (selectedDietary === "oferta_relampago") {
 return prod.compareAtCents && prod.compareAtCents > prod.priceCents;
 }

 return true;
 });
 }, [allProducts, localSearch, selectedDietary, selectedStore]);

 return (
 <div className="w-full space-y-6 pb-20">
 {/* ── 1. Top Banners do Mercado ── */}
 {banners && banners.length > 0 && (
 <BannerHeroCarousel banners={banners} className="w-full" />
 )}

 {/* ── 1.5. Encartes & Tabloides da Semana (Grandinhos, Retrô Mercadista ou Clean) ── */}
 {flyers && flyers.length > 0 && (
 <PromotionalFlyersRail
 flyers={flyers}
 title="Encartes & Tabloides da Semana"
 subtitle="Folhetos das redes e atacados locais com ofertas válidas por tempo limitado"
 />
 )}

 {/* ── 2. Stories Rápidos & Ofertas em Vídeo dos Mercados Parceiros ── */}
 <ContextualStoriesRail niche="mercado" className="py-1" />

 {/* ── 3. Seletor de Supermercados Parceiros (Multi-Store Filter) ── */}
 {availableStores.length > 0 && (
 <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 ">
 <button
 type="button"
 onClick={() => setSelectedStore("todos")}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
 selectedStore === "todos"
 ? "bg-primary/10 text-primary border border-primary/25 font-bold"
 : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/40"
 }`}
 >
 Todos os Mercados
 </button>

 {availableStores.map((store) => (
 <button
 key={store}
 type="button"
 onClick={() => setSelectedStore(store)}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
 selectedStore === store
 ? "bg-primary/10 text-primary border border-primary/25 font-bold"
 : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/40"
 }`}
 >
 {store}
 </button>
 ))}
 </div>
 )}

 {/* ── 4. Hotpages Promocionais Contextuais ── */}
 {hotpages && hotpages.length > 0 && (
 <section aria-label="Categorias em Destaque">
 <HotpagesRail hotpages={hotpages} activeSlug={search.niche} />
 </section>
 )}

 {/* ── 5. Barra de Controle de Descoberta (Busca + Corredores + Modos) ── */}
 <DiscoveryControlBar
 search={localSearch}
 onSearchChange={handleSearchSubmit}
 searchPlaceholder="Buscar carnes, hortifrúti, arroz, laticínios, limpeza..."
 categories={SUPERMARKET_DEPARTMENTS}
 activeCategory={search.niche || "todos"}
 onSelectCategory={handleSelectDepartment}
 viewMode={currentView}
 onViewModeChange={handleViewModeChange}
 allowedViewModes={["feed", "grid", "list"]}
 />

 {/* ── 6. Filtros Especiais de Dieta & Estilo de Vida (Pills) ── */}
 <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 ">
 {DIETARY_FILTERS.map((f) => {
 const isSelected = selectedDietary === f.id;
 return (
 <button
 key={f.id}
 type="button"
 onClick={() => setSelectedDietary(f.id)}
 className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
 isSelected
 ? "bg-primary/10 text-primary border border-primary/25 font-bold"
 : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/40"
 }`}
 >
 <span>{f.label}</span>
 </button>
 );
 })}
 </div>

 {/* ── 7. Renderização Conforme o Modo de Visualização ── */}

 {/* MODE 1: FEED DE CORREDORES VIRTUAIS & ENCARTE DIGITAL */}
 {currentView === "feed" && (
 <div className="space-y-10">
 {/* Seções Modulares do CMS (Ofertas, Lojas, Grids, Bento) */}
 {feed.sections && feed.sections.length > 0 && (
 <ModularSurfaceFeed sections={feed.sections} />
 )}

      {/* Corredores e Gôndolas com Trilhos Horizontais de Produtos */}
      <div className="space-y-6 pt-2">
        {displayedProducts.length > 0 ? (
          <div className="space-y-8">
            {(() => {
              const grouped = displayedProducts.reduce((acc: Record<string, typeof displayedProducts>, prod) => {
                const key = (prod as any).category_name || (prod as any).category || (prod as any).store_name || "Destaques do Mercado";
                if (!acc[key]) acc[key] = [];
                acc[key].push(prod);
                return acc;
              }, {});

              return Object.entries(grouped).map(([groupName, prods]) => (
                <HorizontalRail
                  key={groupName}
                  title={groupName}
                  hideHeader={false}
                  actionLabel="Ver grade"
                  onAction={() => {
                    handleViewModeChange("grid");
                  }}
                >
                  {prods.map((prod) => (
                    <div key={prod.id} className="w-56 sm:w-64 shrink-0">
                      <GroceryProductCard product={prod} viewMode="grid" />
                    </div>
                  ))}
                </HorizontalRail>
              ));
            })()}
          </div>
        ) : (
          <div className="py-16 text-center space-y-3 bg-muted/10 rounded-2xl border-0 p-8">
            <EmptyState title="Nenhum produto encontrado neste corredor ou supermercado." />
            <div className="pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setLocalSearch("");
                  setSelectedDietary("todos");
                  setSelectedStore("todos");
                  handleSelectDepartment("todos");
                }}
                className="rounded-xl font-bold text-xs"
              >
                Ver todos os supermercados
              </Button>
            </div>
          </div>
        )}
      </div>
 </div>
 )}

 {/* MODE 2: GRADE DENSA MULTI-SUPERMERCADOS */}
 {currentView === "grid" && (
 <div>
 {displayedProducts.length === 0 ? (
 <div className="py-24 text-center space-y-3 bg-muted/10 rounded-2xl p-8">
 <EmptyState title="Nenhum item encontrado nos supermercados" />
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
 {displayedProducts.map((prod) => (
 <GroceryProductCard key={prod.id} product={prod} viewMode="grid" />
 ))}
 </div>
 )}
 </div>
 )}

 {/* MODE 3: LISTA ESTILO CONFERÊNCIA DE COMPRAS (LARGURA MÁXIMA) */}
 {currentView === "list" && (
 <div className="space-y-3 w-full">
 {displayedProducts.length === 0 ? (
 <div className="py-24 text-center space-y-3 bg-muted/10 rounded-2xl p-8">
 <EmptyState title="Nenhum item encontrado nos supermercados" />
 </div>
 ) : (
 <div className="flex flex-col gap-3 w-full">
 {displayedProducts.map((prod) => (
 <GroceryProductCard key={prod.id} product={prod} viewMode="list" />
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 );
}
