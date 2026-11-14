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
  isEditing?: boolean;
  activeSubstate?: string | null;
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
  isEditing,
  activeSubstate,
}: OmniVitrineRuntimeContextProps & { data: any }) {
  const { isEditorCanvas } = useEffectiveViewport();
  const isSubstateOpen = activeSubstate === "drawer_open" || activeSubstate === "open";
  const [isOpen, setIsOpen] = React.useState(Boolean(data?.previewOpen || isSubstateOpen));

  React.useEffect(() => {
    if (isSubstateOpen) {
      setIsOpen(true);
    } else if (typeof data?.previewOpen === "boolean") {
      setIsOpen(data.previewOpen);
    }
  }, [data?.previewOpen, isSubstateOpen]);

  const sections = React.useMemo(() => {
    if (Array.isArray(data?.sections) && data.sections.length > 0) {
      return data.sections;
    }
    if (Array.isArray(data?.items) && data.items.length > 0) {
      return [
        {
          id: "sec_global",
          title: data?.drawerTitle || "Atalhos Principais",
          items: data.items.map((it: any) => ({
            id: it.id,
            label: it.label || it.title,
            href: it.href || it.url || "/",
            badge: it.badge || it.badge_text,
            icon: it.icon || it.iconName || "Compass",
            imageUrl: it.imageUrl || it.image_url,
            cardVariant: it.cardVariant || "squircle",
            isActive: it.isActive !== false,
          })),
        },
      ];
    }
    return [];
  }, [data?.sections, data?.items, data?.drawerTitle]);

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
          icon_name: it.icon || it.iconName,
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

  const showEditorTrigger = Boolean(isEditorCanvas || isEditing);
  if (!showEditorTrigger && mappedItems.length === 0) return null;

  return (
    <VitrineBlockShell id={id} styling={styling} className={className}>
      <div className="w-full py-2">
        {showEditorTrigger ? (
          <div className="flex items-center justify-between p-4 rounded-2xl border border-dashed border-border/80 bg-muted/20">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                aria-label="Abrir menu lateral mobile"
                className="size-11 min-w-11 min-h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <LayoutGrid className="size-5" />
              </button>
              <div>
                <p className="text-xs font-bold text-foreground">
                  {data?.greetingTitle || data?.drawerTitle || "Menu Lateral Hambúrguer (Subestado Drawer)"}
                </p>
                <p className="text-2xs text-muted-foreground">
                  {sections.length} seções • {itemsCount} atalhos configurados (clique para inspecionar o subestado aberto)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isOpen ? "Fechar Subestado Drawer" : "Inspecionar Menu Aberto"}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between py-1">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              aria-label="Abrir menu de categorias"
              className="h-11 min-h-11 px-4 rounded-xl border border-border bg-card text-foreground text-xs font-semibold inline-flex items-center gap-2 cursor-pointer hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <LayoutGrid className="size-4 text-primary" />
              <span>{data?.greetingTitle || data?.drawerTitle || "Categorias"}</span>
            </button>
          </div>
        )}

        <VitrineLateralMenuSheet
          open={isOpen}
          onClose={() => setIsOpen(false)}
          greetingTitle={data?.greetingTitle || data?.drawerTitle || "Menu"}
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
  const { isEditorCanvas } = useEffectiveViewport();
  const spotlightStores = React.useMemo(() => {
    return (stores || []).map((s: any, idx: number) => ({
      id: s.id || `spot-${idx}`,
      name: s.name || s.title || s.business_name || "Estabelecimento",
      slug: s.slug || s.id || "",
      logoUrl: s.logoUrl || s.logo_url || s.avatar_url || null,
      coverUrl: s.coverUrl || s.cover_url || s.banner_url || null,
      isAd: Boolean(s.isAd ?? s.is_ad),
      rating: typeof s.rating === "number" && s.rating > 0 ? s.rating : undefined,
      reviewCount:
        typeof s.reviewCount === "number" && s.reviewCount > 0
          ? s.reviewCount
          : typeof s.reviews_count === "number" && s.reviews_count > 0
            ? s.reviews_count
            : undefined,
      deliveryTime: s.deliveryTime || s.delivery_time || undefined,
      deliveryFee:
        s.delivery_fee === 0
          ? "Grátis"
          : typeof s.deliveryFee === "string"
            ? s.deliveryFee
            : typeof s.delivery_fee === "string"
              ? s.delivery_fee
              : undefined,
      couponBadge: s.couponBadge || s.coupon_badge || undefined,
      hasHighlightCrown: Boolean(s.hasHighlightCrown ?? s.is_featured),
    }));
  }, [stores]);

  if (spotlightStores.length === 0 && !isEditorCanvas) return null;

  return (
    <VitrineBlockShell id={id} styling={styling} className={className}>
      <IFoodVisualSpotlightRail
        title={data?.title || "Estabelecimentos em Destaque"}
        subtitle={data?.subtitle}
        isAd={data?.isAd ?? false}
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
  activeSubstate,
}: OmniVitrineRuntimeContextProps & {
  data?: {
    showSearch?: boolean;
    searchPlaceholder?: string;
  };
}) {
  const effectiveShowSearch =
    Boolean(data?.showSearch) ||
    activeSubstate === "header_search_open" ||
    activeSubstate === "search_open";

  return (
    <VitrineBlockShell id={id} styling={styling} className={className}>
      <IFoodHeader
        showSearch={effectiveShowSearch}
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
  const { isEditorCanvas } = useEffectiveViewport();
  const explicitItems = Array.isArray(data?.items) ? data.items : undefined;
  if (!isEditorCanvas && (!explicitItems || explicitItems.length === 0)) {
    return null;
  }

  return (
    <VitrineBlockShell id={id} styling={styling} className={className}>
      <IFoodFeatureMiniBannersRail
        title={data?.title || "No Waesy também tem"}
        items={explicitItems}
        allowDemoFallback={isEditorCanvas}
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
  const { isEditorCanvas, isMobile } = useEffectiveViewport();
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
    let list: IFoodStoreCardData[] = (stores || []).map((s: any, idx: number) => ({
      id: String(s.id || `feed-st-${idx}`),
      name: String(s.name || s.business_name || s.title || "Estabelecimento Local"),
      slug: String(s.slug || s.id || ""),
      logoUrl:
        typeof s.logoUrl === "string"
          ? s.logoUrl
          : typeof s.avatar_url === "string"
            ? s.avatar_url
            : null,
      category: typeof s.category === "string" ? s.category : "Comércio Local",
      rating: typeof s.rating === "number" && s.rating > 0 ? s.rating : undefined,
      reviewCount:
        typeof s.reviews_count === "number" && s.reviews_count > 0
          ? s.reviews_count
          : typeof s.reviewCount === "number" && s.reviewCount > 0
            ? s.reviewCount
            : undefined,
      deliveryTime: typeof s.delivery_time === "string" ? s.delivery_time : undefined,
      deliveryFee:
        s.delivery_fee === 0
          ? "Grátis"
          : typeof s.delivery_fee === "string"
            ? s.delivery_fee
            : typeof s.deliveryFee === "string"
              ? s.deliveryFee
              : undefined,
      couponBadge: typeof s.coupon_badge === "string" ? s.coupon_badge : undefined,
      isFavorite: Boolean(favorites[String(s.id || `feed-st-${idx}`)]),
    }));

    if (activeFilters.includes("free_delivery")) {
      list = list.filter((st) => st.deliveryFee === "Grátis");
    }
    if (activeFilters.includes("promo") || activeFilters.includes("coupons")) {
      list = list.filter((st) => Boolean(st.couponBadge));
    }
    if (activeFilters.includes("top_rated")) {
      list = list.filter((st) => typeof st.rating === "number" && st.rating >= 4.5);
    }
    if (activeFilters.includes("favorites")) {
      list = list.filter((st) => Boolean(st.isFavorite));
    }
    if (activeFilters.includes("sort_rating")) {
      list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }

    return list;
  }, [stores, favorites, activeFilters]);

  if (stores.length === 0 && !isEditorCanvas) return null;

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
          {mappedStores.length === 0 ? (
            <div className="p-6 rounded-lg border border-dashed border-border bg-muted/20 text-center text-xs text-muted-foreground">
              Nenhum estabelecimento corresponde aos filtros selecionados.
            </div>
          ) : (
            <div className={isMobile ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 lg:grid-cols-2 gap-3"}>
              {mappedStores.map((st) => (
                <IFoodStoreFeedCard
                  key={st.id}
                  store={st}
                  variant="list"
                  onFavoriteToggle={handleFavoriteToggle}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </VitrineBlockShell>
  );
}
