import { Tag } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useMemo } from "react";
import {
 ForkKnife,
 Pizza,
 Hamburger,
 Coffee,
 Fish,
 Cookie,
 Flame,
 Clock,
 MapPin,
 Storefront,
 ArrowRight,
 ShoppingBag,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import { PageSkeleton } from "@/components/state/loading";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { ContextualStoriesRail } from "@/components/stories/contextual-stories-rail";
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
import { useCart } from "@/lib/cart-context";
import { formatMoney } from "@/lib/money";

const SearchSchema = z.object({
 q: z.string().optional(),
 view: z.enum(["feed", "grid", "list"]).default("feed").optional(),
 sort: z.enum(["newest", "price_asc", "price_desc", "in_stock"]).default("newest").optional(),
 categoria: z.string().optional(),
});

type GastronomiaSearch = z.infer<typeof SearchSchema>;

const GASTRONOMIA_DEPARTMENTS: FilterChipOption[] = [
 { id: "todos", label: "Tudo", emoji: "🍽️", icon: Tag },
 { id: "burgers", label: "Burgers & Sandubas", emoji: "🍔", icon: Hamburger },
 { id: "pizzas", label: "Pizzas & Massas", emoji: "🍕", icon: Pizza },
 { id: "oriental", label: "Sushi & Oriental", emoji: "🍣", icon: Fish },
 { id: "marmitas", label: "Marmitas & Almoço", emoji: "🍱", icon: ForkKnife },
 { id: "churrasco", label: "Carnes & Grelhados", emoji: "🥩", icon: Flame },
 { id: "doces", label: "Cafés & Sobremesas", emoji: "🍰", icon: Coffee },
];

export const Route = createFileRoute("/_store/gastronomia")({
 head: () => ({
 meta: [
 { title: "Gastronomia & Delivery de Restaurantes | Waesy" },
 {
 name: "description",
 content:
 "Peça burgers artesanais, pizzas, sushi, marmitas e pratos executivos dos melhores restaurantes e chefs da cidade.",
 },
 ],
 }),
 validateSearch: (search: Record<string, unknown>): GastronomiaSearch =>
 SearchSchema.parse(search),
 loaderDeps: ({ search }) => search,
 loader: async ({ deps: search }) => {
   try {
 const [banners, hotpages, marketplaceFeed, productsRes] = await Promise.all([
 listActiveBanners({ data: { placement: "gastronomia" } }).catch(() => []),
 listHotpages({ data: { module: "gastronomia" } }).catch(() => []),
 getModularSurfaceFeed({ data: { surfaceSlug: "gastronomia" } }).catch(() => ({ sections: [], allProducts: [] })),
 // Fallback robusto: produtos do catálogo filtrados por niche real
 listPublishedProducts({
 data: { niche: "gastronomia", limit: 40, sort: search.sort ?? "newest" },
 }).catch(() => ({ status: "empty" as const, data: [] as ProductCardDTO[] })),
 ]);

 return {
 banners,
 hotpages,
 marketplaceFeed,
 catalogProducts: productsRes.status === "ok" ? (productsRes as any).data ?? [] : (productsRes as any).data ?? [],
 };
   } catch (err) {
     console.error("[loader:_store.gastronomia] Unhandled error:", err);
     return { banners: null, hotpages: null, marketplaceFeed: null, catalogProducts: null };
   }
 },
 component: GastronomiaVerticalPage,
 pendingComponent: PageSkeleton,
});
function GastronomiaVerticalPage() {
 const { banners, hotpages, marketplaceFeed, catalogProducts } = ((Route.useLoaderData?.() as any) || {});
 const search = Route.useSearch();
 const navigate = useNavigate({ from: Route.fullPath });
 const { cart, setIsCartOpen } = useCart();

 const cartItemsCount = cart?.itemCount ?? cart?.items?.reduce((acc, item) => acc + (item.qty || 1), 0) ?? 0;
 const cartTotalCents = cart?.subtotalCents || cart?.totalCents || 0;

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

 // Combina produtos do Surface CMS + catálogo direto (sem heurística de título)
 const allProducts: ProductCardDTO[] = useMemo(() => {
 const surfaceProducts = (marketplaceFeed?.allProducts || []) as ProductCardDTO[];
 const catalogArr = (catalogProducts || []) as ProductCardDTO[];
 // Prioriza Surface CMS; usa catálogo direto como fallback
 const base = surfaceProducts.length > 0 ? surfaceProducts : catalogArr;

 if (activeDepartment === "todos") return base;

 // Filtragem por departamento usando tags e atributos do banco (não título)
 return base.filter((p: any) => {
 const tags = (p.tags || []).map((t: string) => t.toLowerCase());
 const categoria = (p.attributes?.categoria || p.attributes?.tipo || "").toLowerCase();
 if (activeDepartment === "burgers") return tags.some((t: string) => ["burger","hamburguer","lanche","sanduiche"].includes(t)) || categoria.includes("burger");
 if (activeDepartment === "pizzas") return tags.some((t: string) => ["pizza","massa","calzone"].includes(t)) || categoria.includes("pizza");
 if (activeDepartment === "oriental") return tags.some((t: string) => ["sushi","temaki","oriental","japones"].includes(t)) || categoria.includes("oriental");
 if (activeDepartment === "marmitas") return tags.some((t: string) => ["marmita","executivo","almoco"].includes(t)) || categoria.includes("marmita");
 if (activeDepartment === "churrasco") return tags.some((t: string) => ["churrasco","grelhado","carne","picanha"].includes(t)) || categoria.includes("churrasco");
 if (activeDepartment === "doces") return tags.some((t: string) => ["cafe","doce","sobremesa","torta","bolo"].includes(t)) || categoria.includes("sobremesa");
 return true;
 });
 }, [marketplaceFeed, catalogProducts, activeDepartment]);

 const filteredProducts = allProducts;

 // Restaurantes: vem do Surface CMS store_rail
 const restaurantStores = useMemo(() => {
 const storeSection = marketplaceFeed?.sections?.find((s: any) => s.type === "store_rail");
 return storeSection?.items || [];
 }, [marketplaceFeed]);

 return (
 <div className="w-full max-w-5xl mx-auto px-0 sm:px-4 space-y-6 pb-24">
 {/* ── 1. Banners de Gastronomia ── */}
 {banners && banners.length > 0 && (
 <section aria-label="Banners de Gastronomia">
 <BannerHeroCarousel banners={banners} />
 </section>
 )}

 {/* ── 1.5. Stories de Gastronomia & Delivery ── */}
 <ContextualStoriesRail niche="gastronomia" className="py-1" />

      {/* ── 2. Hotpages por Turno / Almoço / Jantar ── */}
      {hotpages && hotpages.length > 0 && (
        <section aria-label="Coleções de Gastronomia">
          <HotpagesRail hotpages={hotpages} />
        </section>
      )}

      {/* ── 3. Discovery Control Bar ── */}
      <DiscoveryControlBar
        search={search.q || ""}
        onSearchChange={(q) => navigate({ search: (prev) => ({ ...prev, q }) })}
        searchPlaceholder="Buscar pratos, pizzas, burgers, sobremesas..."
        categories={GASTRONOMIA_DEPARTMENTS}
        activeCategory={activeDepartment}
        onSelectCategory={handleDepartmentChange}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />

      {/* ── 4. Renderização do Feed Modular ou Grade Filtrada ── */}
      {viewMode === "feed" ? (
        <div className="space-y-6 sm:space-y-8">
          {marketplaceFeed?.sections && marketplaceFeed.sections.length > 0 && (
            <ModularSurfaceFeed sections={marketplaceFeed.sections} />
          )}

          {allProducts.length > 0 ? (
            <div className="space-y-8">
              {(() => {
                const grouped = allProducts.reduce((acc: Record<string, typeof allProducts>, prod: any) => {
                  const key = prod.category_name || prod.category || prod.store_name || "Cardápio em Destaque";
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
                    {prods.map((product: any) => (
                      <div key={product.id} className="w-56 sm:w-64 shrink-0">
                        <GroceryProductCard product={product} viewMode="grid" />
                      </div>
                    ))}
                  </HorizontalRail>
                ));
              })()}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Nenhum restaurante ou prato disponível no momento.
            </div>
          )}
        </div>
      ) : (
        <section aria-label="Pratos & Lanches em Destaque" className="w-full">
          {allProducts.length === 0 ? (
            <EmptyState
              title="Nenhum prato encontrado"
              description="Tente escolher outro tipo de culinária ou busque por restaurantes específicos."
            />
          ) : viewMode === "list" ? (
            <div className="flex flex-col gap-3">
              {allProducts.map((product: any) => (
                <GroceryProductCard key={product.id} product={product} viewMode="list" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {allProducts.map((product: any) => (
                <GroceryProductCard key={product.id} product={product} viewMode="grid" />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── BARRA FLUTUANTE DA SACOLA (3 TOQUES - APPLE HIG THUMB ZONE) ── */}
      {cartItemsCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 p-3 rounded-2xl bg-foreground text-background shadow-xs flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 border border-background/20">
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <ShoppingBag className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-background/70 font-mono uppercase tracking-wider">
                {cartItemsCount} {cartItemsCount === 1 ? "item adicionado" : "itens adicionados"}
              </span>
              <span className="text-sm font-black font-mono">
                {formatMoney(cartTotalCents)}
              </span>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => setIsCartOpen(true)}
            className="h-10 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs gap-1.5 shadow-xs cursor-pointer shrink-0"
          >
            <span>Ver Sacola</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
