import { resolveActiveCity } from "@/lib/city-helper";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useMemo } from "react";
import {
  Storefront,
  ShoppingBag,
  Flame,
  Leaf,
  Grains,
  Drop,
  Broom,
  BeerBottle,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/state/loading";
import { getModularSurfaceFeed } from "@/services/surface-cms.functions";
import { listActiveBanners } from "@/services/banner.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { listPublishedProducts } from "@/services/catalog.functions";
import {
  getSupermarketDeliveryWindows,
  getSupermarketClubMemberData,
  type SupermarketProductCardDTO,
  type DeliveryWindowDTO,
  type SupermarketClubMemberDTO,
} from "@/services/supermarket.functions";
import {
  SupermarketHeroContinuousCarousel,
  SupermarketHeaderCluster,
  SupermarketFulfillmentPill,
  SupermarketCategoryCircleDock,
  SupermarketProductCard,
  SupermarketProductDetailModal,
  SupermarketCartSheet,
  SupermarketBottomNav,
  SupermarketClubDashboardView,
} from "@/components/commerce/supermarket";
import { useCartContext } from "@/lib/cart-context";
import { toast } from "sonner";
import { Truck, Gift, ArrowRight } from "@phosphor-icons/react";

import { CommercialShowcaseTemplate } from "@/components/commerce/ifood/CommercialShowcaseTemplate";
import type { SubcategoryItem } from "@/components/commerce/ifood/IFoodSubcategoryPillRail";
import type { FeatureMiniBannerItem } from "@/components/commerce/ifood/IFoodFeatureMiniBannersRail";
import type { RecentStoreItem } from "@/components/commerce/ifood/IFoodRecentStoresRail";
import type { IFoodStoreCardData } from "@/components/commerce/ifood/IFoodStoreFeedCard";

import type { ProductCardDTO } from "@/types/catalog";

const SearchSchema = z.object({
  q: z.string().optional(),
  view: z.enum(["feed", "grid", "list"]).default("feed").optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "in_stock"]).default("newest").optional(),
  categoria: z.string().optional(),
});

type MercadoSearch = z.infer<typeof SearchSchema>;

const MERCADO_SUBCATEGORIES: SubcategoryItem[] = [
  { id: "todos", label: "Tudo", icon: Storefront },
  { id: "hortifruti", label: "Hortifrúti", icon: Leaf, badge: "Fresco" },
  { id: "carnes", label: "Carnes & Aves", icon: Flame },
  { id: "padaria", label: "Padaria & Frios", icon: Grains },
  { id: "laticinios", label: "Laticínios", icon: Drop },
  { id: "bebidas", label: "Bebidas", icon: BeerBottle },
  { id: "mercearia", label: "Mercearia", icon: ShoppingBag },
  { id: "limpeza", label: "Limpeza", icon: Broom },
];

export const Route = createFileRoute("/_store/mercado")({
  head: () => ({
    meta: [
      { title: "Mercados e Supermercados Online | Waesy" },
      {
        name: "description",
        content:
          "Faça compras de supermercado, feira, açougue, padaria e bebidas com entrega rápida em Chapecó e região.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): MercadoSearch =>
    SearchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: async ({ location, deps: search }) => {
    const activeCity = resolveActiveCity(location?.search);
    try {
      const [banners, hotpages, marketplaceFeed, productsRes, deliveryWindows, clubMemberData] = await Promise.all([
        listActiveBanners({ data: { placement: "mercado", city: activeCity } }).catch(() => []),
        listHotpages({ data: { module: "mercado" } }).catch(() => []),
        getModularSurfaceFeed({ data: { surfaceSlug: "mercado", city: activeCity } }).catch(() => ({
          sections: [],
          allProducts: [],
        })),
        listPublishedProducts({
          data: { niche: "mercado", limit: 40, sort: search.sort ?? "newest" },
        }).catch(() => ({ status: "empty" as const, data: [] as ProductCardDTO[] })),
        getSupermarketDeliveryWindows({ data: {} }).catch(() => []),
        getSupermarketClubMemberData({ data: {} }).catch(() => null),
      ]);

      return {
        banners: banners || [],
        hotpages: hotpages || [],
        marketplaceFeed,
        catalogProducts: productsRes.status === "ok" ? (productsRes as any).data ?? [] : [],
        deliveryWindows: deliveryWindows || [],
        clubMemberData: clubMemberData || null,
      };
    } catch (err) {
      console.error("[loader:_store.mercado] Unhandled error:", err);
      return { banners: null, hotpages: null, marketplaceFeed: null, catalogProducts: null };
    }
  },
  errorComponent: MercadoErrorComponent,
  component: MercadoVerticalPage,
  pendingComponent: PageSkeleton,
});

function MercadoErrorComponent({ error, reset }: { error: any; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
      <div className="inline-flex size-16 items-center justify-center rounded-lg bg-destructive/10 text-destructive mb-2">
        <Storefront size={32} />
      </div>
      <h2 className="text-2xl font-bold text-foreground">Instabilidade ao carregar mercados</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        {error?.message || "Não foi possível carregar os supermercados e produtos no momento."}
      </p>
      <Button onClick={reset} className="rounded-lg font-bold">
        Tentar Novamente
      </Button>
    </div>
  );
}

function MercadoVerticalPage() {
  const loaderData = (Route.useLoaderData?.() as any) || {};
  const { banners, marketplaceFeed, catalogProducts, deliveryWindows, clubMemberData } = loaderData;
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { globalCarts, addToCart, setIsCartOpen } = useCartContext() as any;

  const [activeDepartment, setActiveDepartment] = useState(search.categoria || "todos");
  const [activeBottomTab, setActiveBottomTab] = useState<"inicio" | "ofertas" | "clube" | "compras" | "menu">("inicio");
  const [searchQuery, setSearchQuery] = useState(search.q || "");
  const [fulfillmentMode, setFulfillmentMode] = useState<"delivery" | "pickup">("delivery");
  const [selectedWindow, setSelectedWindow] = useState<DeliveryWindowDTO | null>(null);
  const [selectedProductDetail, setSelectedProductDetail] = useState<SupermarketProductCardDTO | null>(null);
  const [isSupermarketCartOpen, setIsSupermarketCartOpen] = useState(false);

  const handleDepartmentChange = (depId: string) => {
    setActiveDepartment(depId);
    navigate({
      search: (prev: any) => ({
        ...prev,
        categoria: depId === "todos" ? undefined : depId,
      }),
    });
  };

  // Mercados reais do feed Surface CMS
  const rawStores = useMemo(() => {
    const storeSection = marketplaceFeed?.sections?.find((s: any) => s.type === "store_rail");
    return storeSection?.items || [];
  }, [marketplaceFeed]);

  const activeStore = rawStores[0] || null;
  const storeName = activeStore?.name || activeStore?.title || "Seu Supermercado";
  const storeLogoUrl = activeStore?.logo_url || activeStore?.imageUrl || null;

  // Mapeamento canônico para produtos de supermercado DTO
  const supermarketProducts: SupermarketProductCardDTO[] = useMemo(() => {
    if (!Array.isArray(catalogProducts)) return [];
    return catalogProducts.map((p: any) => {
      const attrs = p.attributes || {};
      const pricingTiers = attrs.pricing_tiers || {};
      const promotionalRule = attrs.promotional_rules || {};
      const freshFoodSpecs = attrs.fresh_food_specs || {};

      return {
        id: p.id,
        title: p.title,
        slug: p.slug || p.id,
        imageUrl: p.media?.[0]?.url || p.imageUrl || null,
        sku: attrs.sku || p.id.slice(0, 8),
        brand: attrs.brand || "",
        unit: freshFoodSpecs.pricing_unit || "un",
        priceCents: p.priceCents || p.price_cents || 0,
        compareAtCents: p.compareAtCents || p.compare_at_cents || undefined,
        clubPriceCents: pricingTiers.club_cents,
        onlineExclusivePriceCents: pricingTiers.online_cents,
        pricingTiers,
        promotionalRule,
        freshFoodSpecs,
        badges: attrs.badges || [],
        inStock: p.inStock ?? true,
        storeId: p.storeId || p.store_id || "",
        storeName: p.storeName || storeName,
      };
    });
  }, [catalogProducts, storeName]);

  // Produtos filtrados por busca, departamento e aba "ofertas"
  const filteredProducts = useMemo(() => {
    let list = supermarketProducts;

    // Filtro por termo de busca
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => p.title.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q));
    }

    // Filtro por departamento
    if (activeDepartment && activeDepartment !== "todos" && activeDepartment !== "ofertas") {
      list = list.filter((p) => {
        const titleLower = p.title.toLowerCase();
        if (activeDepartment === "hortifruti") return titleLower.includes("tomate") || titleLower.includes("fruta") || titleLower.includes("legume") || p.freshFoodSpecs?.pricing_unit === "kg";
        if (activeDepartment === "carnes") return titleLower.includes("carne") || titleLower.includes("frango") || titleLower.includes("bife") || titleLower.includes("hamburguer");
        if (activeDepartment === "padaria") return titleLower.includes("pão") || titleLower.includes("bolo") || titleLower.includes("torta") || titleLower.includes("biscoito");
        if (activeDepartment === "bebidas") return titleLower.includes("cerveja") || titleLower.includes("refrigerante") || titleLower.includes("suco") || titleLower.includes("água");
        return true;
      });
    }

    // Filtro estrito de ofertas quando na aba "ofertas"
    if (activeBottomTab === "ofertas" || activeDepartment === "ofertas") {
      list = list.filter((p) => Boolean(p.compareAtCents && p.compareAtCents > p.priceCents) || Boolean(p.clubPriceCents) || p.promotionalRule?.rule_type === "buy_x_pay_y");
    }

    return list;
  }, [supermarketProducts, searchQuery, activeDepartment, activeBottomTab]);

  // Produtos exclusivos do clube
  const clubExclusiveProducts = useMemo(() => {
    return supermarketProducts.filter((p) => Boolean(p.clubPriceCents) || p.promotionalRule?.rule_type === "buy_x_pay_y");
  }, [supermarketProducts]);

  // Contagem de itens no carrinho
  const allCartItems = globalCarts.flatMap((c: any) => c.items);
  const cartItemCount = allCartItems.reduce((acc: number, it: any) => acc + (it.qty || 1), 0);
  const cartSubtotalCents = allCartItems.reduce((acc: number, it: any) => acc + (it.priceCents * it.qty), 0);

  const isClubMember = Boolean(clubMemberData?.isMember);

  const getEffectivePriceCents = (product: SupermarketProductCardDTO) => {
    if (isClubMember && product.clubPriceCents && product.clubPriceCents > 0) {
      return product.clubPriceCents;
    }
    if (product.onlineExclusivePriceCents && product.onlineExclusivePriceCents > 0) {
      return product.onlineExclusivePriceCents;
    }
    return product.priceCents;
  };

  const handleAddToCart = (product: SupermarketProductCardDTO) => {
    const effectivePrice = getEffectivePriceCents(product);
    addToCart({
      id: product.id,
      storeId: product.storeId,
      storeName: product.storeName,
      title: product.title,
      priceCents: effectivePrice,
      qty: 1,
      imageUrl: product.imageUrl || undefined,
    });
    toast.success(`${product.title} adicionado ao carrinho!`);
  };

  const handleAddFromDetailModal = (params: {
    product: SupermarketProductCardDTO;
    quantity: number;
    unitMode: "un" | "kg";
    ripeness?: string;
    prepOption?: string;
    instructions?: string;
  }) => {
    const effectivePrice = getEffectivePriceCents(params.product);
    addToCart({
      id: params.product.id,
      storeId: params.product.storeId,
      storeName: params.product.storeName,
      title: `${params.product.title}${params.prepOption ? ` (${params.prepOption})` : ""}`,
      priceCents: effectivePrice,
      qty: params.quantity,
      imageUrl: params.product.imageUrl || undefined,
    });
    toast.success(`${params.quantity} ${params.unitMode} de ${params.product.title} adicionado!`);
  };

  // Banner carrossel contínuo
  const carouselBanners = useMemo(() => {
    if (Array.isArray(banners) && banners.length > 0) {
      return banners.map((b: any, idx: number) => ({
        id: b.id || `b-${idx}`,
        imageUrl: b.image_url || b.imageUrl || "",
        title: b.title || undefined,
        subtitle: b.subtitle || undefined,
        targetUrl: b.link_url || b.targetUrl || undefined,
        badge: b.badge || undefined,
      }));
    }
    return [];
  }, [banners]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 md:pb-12 select-none">
      {/* ── 1. Header Canônico de Supermercado com Busca Pílula ── */}
      <SupermarketHeaderCluster
        storeName={storeName}
        storeLogoUrl={storeLogoUrl}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        cartItemCount={cartItemCount}
        onOpenCart={() => setIsSupermarketCartOpen(true)}
        couponsCount={clubMemberData?.activeCouponsCount || 0}
        onOpenCoupons={() => setActiveBottomTab("clube")}
      />

      {/* ── Se a aba ativa for "clube", renderizar o Dashboard de Fidelidade ── */}
      {activeBottomTab === "clube" && clubMemberData ? (
        <SupermarketClubDashboardView
          clubData={clubMemberData}
          clubProducts={clubExclusiveProducts}
          onAddToCart={handleAddToCart}
          onProductClick={(p) => setSelectedProductDetail(p)}
        />
      ) : (
        <main className="space-y-4">
          {/* ── 2. Capa Hero com Carrossel Contínuo (Stories / Instagram) ── */}
          {carouselBanners.length > 0 ? (
            <SupermarketHeroContinuousCarousel banners={carouselBanners} />
          ) : null}

          {/* ── 3. Seletor de Modalidade e Janela de Entrega / Retirada ── */}
          <div className="px-4">
            <SupermarketFulfillmentPill
              mode={fulfillmentMode}
              selectedWindow={selectedWindow}
              windows={deliveryWindows}
              onSelectFulfillment={(m, w) => {
                setFulfillmentMode(m);
                setSelectedWindow(w);
              }}
            />
          </div>

          {/* ── 4. Chips de Benefícios e Incentivos (Frete Grátis e Cupons) ── */}
          <div className="px-4 flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-600/30 text-xs font-bold shrink-0">
              <Gift size={15} weight="duotone" />
              <span>Frete grátis acima de R$ 150,00</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/10 text-blue-700 dark:text-blue-400 border border-blue-600/30 text-xs font-bold shrink-0">
              <Truck size={15} weight="duotone" />
              <span>Entrega agendada no mesmo dia</span>
            </div>
          </div>

          {/* ── 5. Dock de Categorias Circulares Fotográficas ── */}
          <SupermarketCategoryCircleDock
            selectedCategoryId={activeDepartment}
            onSelectCategory={handleDepartmentChange}
          />

          {/* ── 6. Feed de Produtos em Grade de Supermercado ── */}
          <section className="px-4 space-y-3" aria-label="Catálogo de Produtos">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-foreground">
                {activeBottomTab === "ofertas" || activeDepartment === "ofertas"
                  ? "Ofertas & Promoções do Dia"
                  : "Produtos em Destaque"}
              </h2>
              <span className="text-xs font-bold text-muted-foreground">
                {filteredProducts.length} itens
              </span>
            </div>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredProducts.map((prod) => (
                  <SupermarketProductCard
                    key={prod.id}
                    product={prod}
                    isMember={Boolean(clubMemberData?.isMember)}
                    onAddToCart={handleAddToCart}
                    onProductClick={(p) => setSelectedProductDetail(p)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-12 text-center rounded-2xl bg-muted/30 border border-border/40 space-y-2">
                <ShoppingBag size={40} weight="duotone" className="mx-auto text-muted-foreground/40" />
                <p className="text-sm font-semibold text-foreground">Nenhum produto encontrado</p>
                <p className="text-xs text-muted-foreground">Tente buscar por outro termo ou selecione outro departamento.</p>
              </div>
            )}
          </section>
        </main>
      )}

      {/* ── 7. Barra de Carrinho Flutuante Verde (Desktop e Mobile quando com itens) ── */}
      {cartItemCount > 0 ? (
        <aside
          aria-label="Resumo do Carrinho"
          className="fixed bottom-16 sm:bottom-6 inset-x-4 max-w-md mx-auto z-30 flex items-center justify-between p-3 rounded-2xl bg-emerald-600 text-white shadow-lg animate-in fade-in select-none"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-9 rounded-xl bg-white/20 flex items-center justify-center font-black text-xs shrink-0">
              {cartItemCount}
            </div>
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="text-2xs text-emerald-100 font-semibold truncate">{storeName}</span>
              <span className="text-xs font-bold truncate">Ver carrinho de compras</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSupermarketCartOpen(true)}
            className="flex items-center gap-1.5 h-11 min-h-11 px-4 rounded-xl bg-white text-emerald-700 font-black text-xs hover:bg-emerald-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shrink-0"
          >
            <span>R$ {(cartSubtotalCents / 100).toFixed(2).replace(".", ",")}</span>
            <ArrowRight size={14} weight="bold" />
          </button>
        </aside>
      ) : null}

      {/* ── 8. Modal de Detalhe Completo de Produto de Supermercado ── */}
      <SupermarketProductDetailModal
        product={selectedProductDetail}
        isOpen={Boolean(selectedProductDetail)}
        onClose={() => setSelectedProductDetail(null)}
        onAddToCart={handleAddFromDetailModal}
        isMember={Boolean(clubMemberData?.isMember)}
      />

      {/* ── 9. Carrinho de Supermercado com Order Bump & Checkout ── */}
      <SupermarketCartSheet
        isOpen={isSupermarketCartOpen}
        onClose={() => setIsSupermarketCartOpen(false)}
        freeShippingThresholdCents={15000}
        orderBumpProduct={filteredProducts[0] || null}
      />

      {/* ── 10. Bottom Navigation Especial de Supermercado Mobile ── */}
      <SupermarketBottomNav
        activeTab={activeBottomTab}
        onTabChange={(tab) => {
          setActiveBottomTab(tab);
          if (tab === "compras") {
            setIsSupermarketCartOpen(true);
          }
        }}
        offersCount={supermarketProducts.filter((p) => Boolean(p.compareAtCents && p.compareAtCents > p.priceCents)).length}
        clubBrandName={clubMemberData?.storeCardName ? "Clube" : "Clube K"}
      />
    </div>
  );
}
