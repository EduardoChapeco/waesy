import * as React from "react";
import { EyeOff, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OmniBlockStyling } from "@/types/omni-builder";
import { getSectionStyle } from "@/components/builder/utils";
import {
  shouldRenderForDevice,
  useEffectiveViewport,
  VitrineBentoTetris,
  VitrineButtonsDock,
  VitrineClassifiedsRail,
  VitrineCouponStrip,
  VitrineEcosystemRail,
  VitrineMetamorphicBanner,
  VitrineProductShelf,
  VitrineSocialStream,
  VitrineVerticalCarousel,
  VitrineLateralMenuSheet,
  type VitrineBentoTetrisProps,
  type VitrineButtonsDockProps,
  type VitrineClassifiedsRailProps,
  type VitrineCouponStripProps,
  type VitrineEcosystemRailProps,
  type VitrineMetamorphicBannerProps,
  type VitrineProductShelfProps,
  type VitrineSocialStreamProps,
  type VitrineVerticalCarouselProps,
} from "@/design-system";
import { IFoodVisualSpotlightRail } from "@/components/commerce/ifood/IFoodVisualSpotlightRail";
import { IFoodHeader } from "@/components/commerce/ifood/IFoodHeader";
import { IFoodSubcategoryPillRail, type SubcategoryItem } from "@/components/commerce/ifood/IFoodSubcategoryPillRail";
import { IFoodRecentStoresRail, type RecentStoreItem } from "@/components/commerce/ifood/IFoodRecentStoresRail";
import { IFoodFeatureMiniBannersRail, type FeatureMiniBannerItem } from "@/components/commerce/ifood/IFoodFeatureMiniBannersRail";
import { IFoodFilterChipsBar } from "@/components/commerce/ifood/IFoodFilterChipsBar";
import { IFoodStoreFeedCard, type IFoodStoreCardData } from "@/components/commerce/ifood/IFoodStoreFeedCard";

export interface OmniVitrineRuntimeContextProps {
  id: string;
  styling?: OmniBlockStyling;
  className?: string;
  products?: Array<Record<string, unknown>>;
  categories?: Array<Record<string, unknown>>;
  collections?: Array<Record<string, unknown>>;
  classifieds?: Array<Record<string, unknown>>;
  posts?: Array<Record<string, unknown>>;
  flyers?: Array<Record<string, unknown>>;
  events?: Array<Record<string, unknown>>;
  jobs?: Array<Record<string, unknown>>;
  stores?: Array<Record<string, unknown>>;
  banners?: Array<Record<string, unknown>>;
  hotpages?: Array<Record<string, unknown>>;
  storeData?: Record<string, unknown> | null;
  onAddToCart?: (productId: string) => void;
}

function VitrineBlockShell({
  id,
  styling,
  className,
  children,
}: {
  id: string;
  styling?: OmniBlockStyling;
  className?: string;
  children: React.ReactNode;
}) {
  const { isMobile, isEditorCanvas } = useEffectiveViewport();
  const isVisibleOnDevice = shouldRenderForDevice(styling?.deviceVisibility, isMobile);

  if (!isVisibleOnDevice) {
    if (!isEditorCanvas) return null;
    return (
      <div
        data-block-id={id}
        className="w-full py-3 px-4 rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center gap-2 text-xs text-muted-foreground"
      >
        <EyeOff className="size-4 shrink-0" />
        <span>
          Bloco oculto no modo {isMobile ? "Mobile" : "Desktop"} (visível apenas em{" "}
          {styling?.deviceVisibility === "mobile_only" ? "Mobile" : "Desktop"})
        </span>
      </div>
    );
  }

  const effectiveStyling: OmniBlockStyling = {
    paddingY: "none",
    ...styling,
  };
  const sectionStyle = getSectionStyle(effectiveStyling, isMobile);

  return (
    <div
      data-block-id={id}
      style={sectionStyle.style}
      className={cn(
        "w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto",
        sectionStyle.className,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function VitrineMetamorphicBannerBlock({
  id,
  data,
  styling,
  className,
  banners,
}: OmniVitrineRuntimeContextProps & { data: VitrineMetamorphicBannerProps }) {
  return (
    <VitrineBlockShell id={id} styling={styling} className={className}>
      <VitrineMetamorphicBanner {...(data || {})} liveBanners={banners} />
    </VitrineBlockShell>
  );
}

export function VitrineBentoTetrisBlock({
  id,
  data,
  styling,
  className,
}: OmniVitrineRuntimeContextProps & { data: VitrineBentoTetrisProps }) {
  return (
    <VitrineBlockShell id={id} styling={styling} className={className}>
      <VitrineBentoTetris {...(data || {})} />
    </VitrineBlockShell>
  );
}

export function VitrineCouponStripBlock({
  id,
  data,
  styling,
  className,
}: OmniVitrineRuntimeContextProps & { data: VitrineCouponStripProps }) {
  return (
    <VitrineBlockShell id={id} styling={styling} className={className}>
      <VitrineCouponStrip {...(data || {})} />
    </VitrineBlockShell>
  );
}

export function VitrineButtonsDockBlock({
  id,
  data,
  styling,
  className,
  categories,
}: OmniVitrineRuntimeContextProps & { data: VitrineButtonsDockProps }) {
  return (
    <VitrineBlockShell id={id} styling={styling} className={className}>
      <VitrineButtonsDock {...(data || {})} liveCategories={categories} />
    </VitrineBlockShell>
  );
}

export function VitrineVerticalCarouselBlock({
  id,
  data,
  styling,
  className,
  flyers,
}: OmniVitrineRuntimeContextProps & { data: VitrineVerticalCarouselProps }) {
  return (
    <VitrineBlockShell id={id} styling={styling} className={className}>
      <VitrineVerticalCarousel {...(data || {})} liveFlyers={flyers} />
    </VitrineBlockShell>
  );
}

export function VitrineProductShelfBlock({
  id,
  data,
  styling,
  className,
  products,
  onAddToCart,
}: OmniVitrineRuntimeContextProps & { data: VitrineProductShelfProps }) {
  return (
    <VitrineBlockShell id={id} styling={styling} className={className}>
      <VitrineProductShelf
        {...(data || {})}
        liveProducts={products}
        onAddToCart={onAddToCart}
      />
    </VitrineBlockShell>
  );
}

export function VitrineClassifiedsRailBlock({
  id,
  data,
  styling,
  className,
  classifieds,
}: OmniVitrineRuntimeContextProps & { data: VitrineClassifiedsRailProps }) {
  return (
    <VitrineBlockShell id={id} styling={styling} className={className}>
      <VitrineClassifiedsRail {...(data || {})} liveClassifieds={classifieds} />
    </VitrineBlockShell>
  );
}

export function VitrineSocialStreamBlock({
  id,
  data,
  styling,
  className,
  posts,
  storeData,
}: OmniVitrineRuntimeContextProps & { data: VitrineSocialStreamProps }) {
  const defaultAuthorName =
    typeof storeData?.name === "string"
      ? storeData.name
      : typeof storeData?.business_name === "string"
        ? storeData.business_name
        : undefined;
  const defaultAuthorHandle =
    typeof storeData?.slug === "string" ? `@${storeData.slug}` : undefined;
  const defaultAuthorAvatarUrl =
    typeof storeData?.avatar_url === "string"
      ? storeData.avatar_url
      : typeof storeData?.logo_url === "string"
        ? storeData.logo_url
        : undefined;

  return (
    <VitrineBlockShell id={id} styling={styling} className={className}>
      <VitrineSocialStream
        {...(data || {})}
        livePosts={posts}
        defaultAuthorName={defaultAuthorName}
        defaultAuthorHandle={defaultAuthorHandle}
        defaultAuthorAvatarUrl={defaultAuthorAvatarUrl}
      />
    </VitrineBlockShell>
  );
}

export function VitrineEcosystemRailBlock({
  id,
  data,
  styling,
  className,
  events,
  jobs,
  stores,
  hotpages,
}: OmniVitrineRuntimeContextProps & { data: VitrineEcosystemRailProps }) {
  return (
    <VitrineBlockShell id={id} styling={styling} className={className}>
      <VitrineEcosystemRail
        {...(data || {})}
        liveEvents={events}
        liveJobs={jobs}
        liveStores={stores}
        liveHotpages={hotpages}
      />
    </VitrineBlockShell>
  );
}

export function VitrineLateralDrawerBlock({
  id,
  data,
  styling,
  className,
}: OmniVitrineRuntimeContextProps & { data: any }) {
  const [isOpen, setIsOpen] = React.useState(false);

  const sections = data?.sections || [];
  const itemsCount = sections.reduce((acc: number, s: any) => acc + (s.items?.length || 0), 0);

  const mappedItems = React.useMemo(() => {
    const list: any[] = [];
    for (const sec of sections) {
      for (const it of sec.items || []) {
        list.push({
          id: it.id,
          title: it.label || it.title,
          target_route: it.href,
          badge_label: it.badge,
          badge_color: it.badgeColor,
          icon_name: it.icon,
          custom_icon_url: it.imageUrl,
          is_active: it.isActive !== false,
          filter_rules: {
            section_title: sec.title,
            section_key: sec.id,
            card_variant: it.cardVariant || "squircle",
          },
        });
      }
    }
    return list;
  }, [sections]);

  return (
    <VitrineBlockShell id={id} styling={styling} className={className}>
      <div className="w-full py-2">
        <div className="flex items-center justify-between p-4 rounded-2xl border border-dashed border-border/80 bg-muted/20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              aria-label="Abrir menu lateral mobile"
              className="size-11 min-w-11 min-h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <LayoutGrid className="size-5" />
            </button>
            <div>
              <p className="text-xs font-bold text-foreground">
                {data?.greetingTitle || "Menu Lateral Mobile Deslizante"}
              </p>
              <p className="text-2xs text-muted-foreground">
                {sections.length} seções • {itemsCount} atalhos configurados
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isOpen ? "Fechar Menu" : "Abrir Menu"}
          </button>
        </div>

        <VitrineLateralMenuSheet
          open={isOpen}
          onClose={() => setIsOpen(false)}
          greetingTitle={data?.greetingTitle || "Aproveite o nosso App!"}
          greetingSubtitle={data?.greetingSubtitle}
          showViewModeToggle={data?.showViewModeToggle !== false}
          defaultViewMode={data?.defaultViewMode || "grid"}
          items={mappedItems}
          showProfileCard={false}
          showAdminLink={false}
        />
      </div>
    </VitrineBlockShell>
  );
}

export function VitrineVisualSpotlightRailBlock({
  id,
  data,
  styling,
  className,
  stores = [],
}: OmniVitrineRuntimeContextProps & {
  data?: {
    title?: string;
    subtitle?: string;
    isAd?: boolean;
    viewMoreTo?: string;
    viewMoreLabel?: string;
  };
}) {
  const spotlightStores = React.useMemo(() => {
    return (stores || []).map((s: any, idx: number) => ({
      id: s.id || `spot-${idx}`,
      name: s.name || s.title || s.business_name || "Restaurante Parceiro",
      slug: s.slug || s.id || "",
      logoUrl: s.logoUrl || s.logo_url || s.avatar_url || null,
      coverUrl: s.coverUrl || s.cover_url || s.banner_url || null,
      isAd: Boolean(s.isAd ?? s.is_ad),
      rating: typeof s.rating === "number" && s.rating > 0 ? s.rating : undefined,
      reviewCount: typeof s.reviewCount === "number" && s.reviewCount > 0 ? s.reviewCount : undefined,
      deliveryTime: s.deliveryTime || s.delivery_time || undefined,
      deliveryFee: s.deliveryFee || s.delivery_fee || "Grátis",
      couponBadge: s.couponBadge || s.coupon_badge || undefined,
      hasHighlightCrown: Boolean(s.hasHighlightCrown ?? idx % 2 === 0),
    }));
  }, [stores]);

  return (
    <VitrineBlockShell id={id} styling={styling} className={className}>
      <IFoodVisualSpotlightRail
        title={data?.title || "Restaurantes com Cupom"}
        subtitle={data?.subtitle}
        isAd={data?.isAd ?? true}
        viewMoreTo={data?.viewMoreTo || "/gastronomia"}
        viewMoreLabel={data?.viewMoreLabel || "Ver mais"}
        stores={spotlightStores}
      />
    </VitrineBlockShell>
  );
}

export function VitrineIFoodHeaderBlock({
  id,
  data,
  styling,
  className,
}: OmniVitrineRuntimeContextProps & {
  data?: {
    showSearch?: boolean;
    searchPlaceholder?: string;
  };
}) {
  return (
    <VitrineBlockShell id={id} styling={styling} className={className}>
      <IFoodHeader
        showSearch={data?.showSearch ?? false}
        searchPlaceholder={data?.searchPlaceholder || "Buscar lojas, pratos ou produtos..."}
      />
    </VitrineBlockShell>
  );
}

export function VitrineSubcategoryPillsBlock({
  id,
  data,
  styling,
  className,
  categories = [],
}: OmniVitrineRuntimeContextProps & {
  data?: {
    showText?: boolean;
    textPosition?: "below" | "inside";
    items?: SubcategoryItem[];
  };
}) {
  const [activeId, setActiveId] = React.useState<string>("todos");

  const resolvedItems: SubcategoryItem[] = React.useMemo(() => {
    if (Array.isArray(data?.items) && data.items.length > 0) {
      return data.items;
    }
    return (categories || []).map((c: any, idx: number) => ({
      id: String(c.id || c.slug || `cat-${idx}`),
      label: String(c.label || c.title || c.name || "Categoria"),
      imageUrl: typeof c.image_url === "string" ? c.image_url : typeof c.imageUrl === "string" ? c.imageUrl : null,
      badge: typeof c.badge === "string" ? c.badge : undefined,
    }));
  }, [data?.items, categories]);

  return (
    <VitrineBlockShell id={id} styling={styling} className={className}>
      <IFoodSubcategoryPillRail
        items={resolvedItems}
        activeId={activeId}
        onSelect={setActiveId}
        showText={data?.showText !== false}
        textPosition={data?.textPosition === "inside" ? "right" : (data?.textPosition || "below")}
      />
    </VitrineBlockShell>
  );
}

export function VitrineRecentStoresRailBlock({
  id,
  data,
  styling,
  className,
  stores = [],
}: OmniVitrineRuntimeContextProps & {
  data?: {
    title?: string;
    viewMoreTo?: string;
  };
}) {
  const recentStores: RecentStoreItem[] = React.useMemo(() => {
    return (stores || []).slice(0, 10).map((s: any, idx: number) => ({
      id: String(s.id || `rec-${idx}`),
      name: String(s.name || s.business_name || s.title || "Estabelecimento"),
      slug: String(s.slug || s.id || ""),
      logoUrl: typeof s.logoUrl === "string" ? s.logoUrl : typeof s.avatar_url === "string" ? s.avatar_url : null,
      badge: typeof s.badge === "string" ? s.badge : undefined,
    }));
  }, [stores]);

  return (
    <VitrineBlockShell id={id} styling={styling} className={className}>
      <IFoodRecentStoresRail
        title={data?.title || "Últimas lojas"}
        viewMoreTo={data?.viewMoreTo || "/diretorio"}
        stores={recentStores}
      />
    </VitrineBlockShell>
  );
}

export function VitrineFeatureMiniBannersBlock({
  id,
  data,
  styling,
  className,
}: OmniVitrineRuntimeContextProps & {
  data?: {
    title?: string;
    items?: FeatureMiniBannerItem[];
  };
}) {
  return (
    <VitrineBlockShell id={id} styling={styling} className={className}>
      <IFoodFeatureMiniBannersRail
        title={data?.title || "No Waesy também tem"}
        items={data?.items}
      />
    </VitrineBlockShell>
  );
}

export function VitrineStoresFeedListBlock({
  id,
  data,
  styling,
  className,
  stores = [],
}: OmniVitrineRuntimeContextProps & {
  data?: {
    title?: string;
    showFilterChips?: boolean;
  };
}) {
  const [activeFilters, setActiveFilters] = React.useState<string[]>([]);
  const [favorites, setFavorites] = React.useState<Record<string, boolean>>({});

  const handleToggleFilter = (filterId: string) => {
    setActiveFilters((prev) =>
      prev.includes(filterId) ? prev.filter((f) => f !== filterId) : [...prev, filterId],
    );
  };

  const handleFavoriteToggle = (storeId: string) => {
    setFavorites((prev) => ({ ...prev, [storeId]: !prev[storeId] }));
  };

  const mappedStores: IFoodStoreCardData[] = React.useMemo(() => {
    return (stores || []).map((s: any, idx: number) => ({
      id: String(s.id || `feed-st-${idx}`),
      name: String(s.name || s.business_name || s.title || "Estabelecimento Local"),
      slug: String(s.slug || s.id || ""),
      logoUrl: typeof s.logoUrl === "string" ? s.logoUrl : typeof s.avatar_url === "string" ? s.avatar_url : null,
      category: typeof s.category === "string" ? s.category : "Comércio Local",
      rating: typeof s.rating === "number" && s.rating > 0 ? s.rating : undefined,
      reviewCount: typeof s.reviews_count === "number" && s.reviews_count > 0 ? s.reviews_count : undefined,
      deliveryTime: typeof s.delivery_time === "string" ? s.delivery_time : undefined,
      deliveryFee: s.delivery_fee === 0 ? "Grátis" : typeof s.delivery_fee === "string" ? s.delivery_fee : undefined,
      couponBadge: typeof s.coupon_badge === "string" ? s.coupon_badge : undefined,
      isFavorite: Boolean(favorites[String(s.id || `feed-st-${idx}`)]),
    }));
  }, [stores, favorites]);

  return (
    <VitrineBlockShell id={id} styling={styling} className={className}>
      <div className="space-y-3">
        {data?.showFilterChips !== false && (
          <IFoodFilterChipsBar
            activeFilters={activeFilters}
            onToggleFilter={handleToggleFilter}
          />
        )}
        <div className="space-y-2 px-3 sm:px-4">
          <h2 className="text-base font-bold text-foreground tracking-tight">
            {data?.title || "Lojas"}
          </h2>
          <div className="space-y-3">
            {mappedStores.map((st) => (
              <IFoodStoreFeedCard
                key={st.id}
                store={st}
                variant="list"
                onFavoriteToggle={handleFavoriteToggle}
              />
            ))}
          </div>
        </div>
      </div>
    </VitrineBlockShell>
  );
}
