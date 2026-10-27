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
      const [banners, hotpages, marketplaceFeed, productsRes] = await Promise.all([
        listActiveBanners({ data: { placement: "mercado", city: activeCity } }).catch(() => []),
        listHotpages({ data: { module: "mercado" } }).catch(() => []),
        getModularSurfaceFeed({ data: { surfaceSlug: "mercado", city: activeCity } }).catch(() => ({
          sections: [],
          allProducts: [],
        })),
        listPublishedProducts({
          data: { niche: "mercado", limit: 40, sort: search.sort ?? "newest" },
        }).catch(() => ({ status: "empty" as const, data: [] as ProductCardDTO[] })),
      ]);

      return {
        banners,
        hotpages,
        marketplaceFeed,
        catalogProducts: productsRes.status === "ok" ? (productsRes as any).data ?? [] : [],
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
  const { banners, marketplaceFeed, catalogProducts } = ((Route.useLoaderData?.() as any) || {});
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [activeDepartment, setActiveDepartment] = useState(search.categoria || "todos");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const handleDepartmentChange = (depId: string) => {
    setActiveDepartment(depId);
    navigate({
      search: (prev: any) => ({
        ...prev,
        categoria: depId === "todos" ? undefined : depId,
      }),
    });
  };

  const handleToggleFilter = (filterId: string) => {
    setActiveFilters((prev) =>
      prev.includes(filterId) ? prev.filter((id) => id !== filterId) : [...prev, filterId],
    );
  };

  // Mercados reais do feed Surface CMS
  const rawStores = useMemo(() => {
    const storeSection = marketplaceFeed?.sections?.find((s: any) => s.type === "store_rail");
    return storeSection?.items || [];
  }, [marketplaceFeed]);

  const featureMiniBanners: FeatureMiniBannerItem[] = useMemo(() => {
    const bannerSection = marketplaceFeed?.sections?.find(
      (s: any) => s.type === "mini_banners" || s.type === "feature_banners",
    );
    if (bannerSection?.items?.length) {
      return bannerSection.items.map((b: any, idx: number) => ({
        id: b.id || `mini-${idx}`,
        title: b.title || "",
        subtitle: b.subtitle || null,
        targetUrl: b.targetUrl || b.link || "/mercado",
        badgeText: b.badgeText || b.tag || null,
        actionText: b.actionText || null,
        imageUrl: b.imageUrl || b.image_url || null,
      }));
    }
    return [];
  }, [marketplaceFeed]);

  // Mapeamento canônico para cartões iFood (Zero Mocks / Invariante B.33)
  const stores: IFoodStoreCardData[] = useMemo(() => {
    if (rawStores.length > 0) {
      return rawStores.map((st: any, idx: number) => ({
        id: st.id || `mk-${idx}`,
        name: st.name || st.title || "Supermercado Parceiro",
        slug: st.slug || st.id || "",
        logoUrl: st.logo_url || st.imageUrl || null,
        coverUrl: st.cover_url || st.banner_url || null,
        isAd: Boolean(st.is_featured || st.is_ad),
        rating: typeof st.rating === "number" && st.rating > 0 ? st.rating : undefined,
        reviewCount: typeof st.review_count === "number" && st.review_count > 0 ? st.review_count : undefined,
        deliveryTime: st.delivery_time || undefined,
        deliveryFee:
          typeof st.delivery_fee === "number"
            ? st.delivery_fee === 0
              ? "Grátis"
              : `R$ ${st.delivery_fee.toFixed(2)}`
            : typeof st.delivery_fee === "string"
              ? st.delivery_fee
              : undefined,
        couponBadge: st.coupon_badge || undefined,
        secondaryBadges: Array.isArray(st.badges) ? st.badges : undefined,
        hasHighlightCrown: Boolean(st.has_highlight_crown),
      }));
    }

    return [];
  }, [rawStores]);

  // Mapeamento de Últimas Lojas
  const recentStores: RecentStoreItem[] = useMemo(() => {
    return stores.slice(0, 5).map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      logoUrl: s.logoUrl,
      badge: s.deliveryFee === "Grátis" ? "Grátis" : (s.couponBadge || undefined),
    }));
  }, [stores]);

  // Lojas com Cupom (Spotlight)
  const spotlightStores = useMemo(() => {
    return stores.filter((s) => Boolean(s.couponBadge));
  }, [stores]);

  return (
    <CommercialShowcaseTemplate
      nicheId="mercado"
      nicheTitle="Mercados"
      subcategories={MERCADO_SUBCATEGORIES}
      activeSubcategoryId={activeDepartment}
      onSelectSubcategory={handleDepartmentChange}
      banners={banners || []}
      featureMiniBanners={featureMiniBanners}
      recentStores={recentStores}
      stores={stores}
      spotlightStores={spotlightStores}
      products={catalogProducts || []}
      activeFilters={activeFilters}
      onToggleFilter={handleToggleFilter}
    />
  );
}
