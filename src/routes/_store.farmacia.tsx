import { resolveActiveCity } from "@/lib/city-helper";
import { Tag } from "lucide-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useMemo } from "react";
import {
  Heartbeat,
  FirstAid,
  Pill,
  Baby,
  Sun,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react";

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

type FarmaciaSearch = z.infer<typeof SearchSchema>;

const FARMACIA_SUBCATEGORIES: SubcategoryItem[] = [
  { id: "todos", label: "Tudo", icon: Pill },
  { id: "medicamentos", label: "Medicamentos", icon: Pill, badge: "Urgente" },
  { id: "suplementos", label: "Vitaminas", icon: Heartbeat },
  { id: "dermocosmeticos", label: "Dermocosméticos", icon: Sparkle },
  { id: "higiene", label: "Higiene", icon: ShieldCheck },
  { id: "bebe", label: "Mamãe e Bebê", icon: Baby },
  { id: "primeiros_socorros", label: "Primeiros Socorros", icon: FirstAid },
  { id: "solar", label: "Protetor Solar", icon: Sun },
];

export const Route = createFileRoute("/_store/farmacia")({
  head: () => ({
    meta: [
      { title: "Farmácias, Drogarias e Saúde | Waesy" },
      {
        name: "description",
        content:
          "Peça medicamentos, vitaminas, dermocosméticos, higiene e cuidados infantis nas melhores drogarias da sua cidade.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): FarmaciaSearch =>
    SearchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: async ({ location, deps: search }) => {
    const activeCity = resolveActiveCity(location?.search);
    try {
      const [banners, hotpages, marketplaceFeed, productsRes] = await Promise.all([
        listActiveBanners({ data: { placement: "farmacia", city: activeCity } }).catch(() => []),
        listHotpages({ data: { module: "farmacia" } }).catch(() => []),
        getModularSurfaceFeed({ data: { surfaceSlug: "farmacia", city: activeCity } }).catch(() => ({
          sections: [],
          allProducts: [],
        })),
        listPublishedProducts({
          data: { niche: "farmacia", limit: 40, sort: search.sort ?? "newest" },
        }).catch(() => ({ status: "empty" as const, data: [] as ProductCardDTO[] })),
      ]);

      return {
        banners,
        hotpages,
        marketplaceFeed,
        catalogProducts: productsRes.status === "ok" ? (productsRes as any).data ?? [] : [],
      };
    } catch (err) {
      console.error("[loader:_store.farmacia] Unhandled error:", err);
      return { banners: null, hotpages: null, marketplaceFeed: null, catalogProducts: null };
    }
  },
  pendingComponent: PageSkeleton,
  component: FarmaciaMasterPage,
});

function FarmaciaMasterPage() {
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
        targetUrl: b.targetUrl || b.link || "/farmacia",
        badgeText: b.badgeText || b.tag || null,
        actionText: b.actionText || null,
        imageUrl: b.imageUrl || b.image_url || null,
      }));
    }
    return [];
  }, [marketplaceFeed]);

  const stores: IFoodStoreCardData[] = useMemo(() => {
    if (rawStores.length > 0) {
      return rawStores.map((st: any, idx: number) => ({
        id: st.id || `farm-${idx}`,
        name: st.name || st.title || "Drogaria Parceira",
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

  const recentStores: RecentStoreItem[] = useMemo(() => {
    return stores.slice(0, 5).map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      logoUrl: s.logoUrl,
      badge: s.deliveryFee === "Grátis" ? "Grátis" : (s.couponBadge || undefined),
    }));
  }, [stores]);

  const spotlightStores = useMemo(() => {
    return stores.filter((s) => Boolean(s.couponBadge));
  }, [stores]);

  return (
    <CommercialShowcaseTemplate
      nicheId="farmacia"
      nicheTitle="Farmácias"
      subcategories={FARMACIA_SUBCATEGORIES}
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
