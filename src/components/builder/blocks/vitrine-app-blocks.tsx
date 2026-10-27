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
                {data?.greetingTitle || "Menu Lateral Mobile (iFood / Threads Push)"}
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
      rating: s.rating || 4.8,
      reviewCount: s.reviewCount || 24,
      deliveryTime: s.deliveryTime || "30-40 min",
      deliveryFee: s.deliveryFee || "Grátis",
      couponBadge: s.couponBadge || "Cupom de R$ 5",
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
