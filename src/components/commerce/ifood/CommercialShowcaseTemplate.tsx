import React, { useState } from "react";
import { IFoodHeader } from "./IFoodHeader";
import { MultiVitrineDock } from "./MultiVitrineDock";
import { IFoodSubcategoryPillRail, type SubcategoryItem } from "./IFoodSubcategoryPillRail";
import { IFoodFeatureMiniBannersRail, type FeatureMiniBannerItem } from "./IFoodFeatureMiniBannersRail";
import { IFoodRecentStoresRail, type RecentStoreItem } from "./IFoodRecentStoresRail";
import { IFoodFilterChipsBar } from "./IFoodFilterChipsBar";
import { IFoodStoreFeedCard, type IFoodStoreCardData } from "./IFoodStoreFeedCard";
import { IFoodVisualSpotlightRail } from "./IFoodVisualSpotlightRail";
import { IFoodFloatingCartBar } from "./IFoodFloatingCartBar";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { EmptyState } from "@/components/state/states";
import { OfferCard } from "@/components/commerce/offer-card";
import type { BannerDTO } from "@/services/banner.functions";
import { cn } from "@/lib/utils";

export interface CommercialShowcaseTemplateProps {
  nicheId: string;
  nicheTitle: string;
  subcategories: SubcategoryItem[];
  activeSubcategoryId: string;
  onSelectSubcategory: (id: string) => void;
  banners?: BannerDTO[];
  featureMiniBanners?: FeatureMiniBannerItem[];
  recentStores?: RecentStoreItem[];
  stores: IFoodStoreCardData[];
  spotlightStores?: IFoodStoreCardData[];
  products?: any[];
  activeFilters?: string[];
  onToggleFilter?: (id: string) => void;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  className?: string;
  children?: React.ReactNode;
}

export function mapSurfaceFeedToCommercialShowcase(
  marketplaceFeed: any,
  nicheId: string,
  defaultStoreLabel = "Estabelecimento Parceiro",
): {
  stores: IFoodStoreCardData[];
  recentStores: RecentStoreItem[];
  spotlightStores: IFoodStoreCardData[];
  featureMiniBanners: FeatureMiniBannerItem[];
} {
  const storeSection = marketplaceFeed?.sections?.find((s: any) => s.type === "store_rail");
  const rawStores = storeSection?.items || [];

  const bannerSection = marketplaceFeed?.sections?.find(
    (s: any) => s.type === "mini_banners" || s.type === "feature_banners",
  );
  const featureMiniBanners: FeatureMiniBannerItem[] = bannerSection?.items?.length
    ? bannerSection.items.map((b: any, idx: number) => ({
        id: b.id || `mini-${nicheId}-${idx}`,
        title: b.title || "",
        subtitle: b.subtitle || null,
        targetUrl: b.targetUrl || b.link || `/${nicheId}`,
        badgeText: b.badgeText || b.tag || null,
        actionText: b.actionText || null,
        imageUrl: b.imageUrl || b.image_url || null,
      }))
    : [];

  const stores: IFoodStoreCardData[] = rawStores.map((st: any, idx: number) => ({
    id: st.id || `${nicheId}-${idx}`,
    name: st.name || st.title || defaultStoreLabel,
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

  const recentStores: RecentStoreItem[] = stores.slice(0, 6).map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    logoUrl: s.logoUrl,
    badge: s.deliveryFee === "Grátis" ? "Grátis" : (s.couponBadge || undefined),
  }));

  const spotlightStores = stores.filter((s) => Boolean(s.couponBadge));

  return {
    stores,
    recentStores,
    spotlightStores,
    featureMiniBanners,
  };
}

export function CommercialShowcaseTemplate({
  nicheId,
  nicheTitle,
  subcategories,
  activeSubcategoryId,
  onSelectSubcategory,
  banners = [],
  featureMiniBanners = [],
  recentStores = [],
  stores = [],
  spotlightStores = [],
  products = [],
  activeFilters = [],
  onToggleFilter,
  isLoading = false,
  emptyTitle = "Nenhum estabelecimento encontrado",
  emptyMessage = "Não encontramos estabelecimentos ativos com os filtros selecionados para esta categoria.",
  className,
  children,
}: CommercialShowcaseTemplateProps) {
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const handleFavoriteToggle = (storeId: string) => {
    setFavorites((prev) => ({
      ...prev,
      [storeId]: !prev[storeId],
    }));
  };

  return (
    <div
      className={cn("w-full max-w-5xl mx-auto space-y-4 pb-28 min-h-screen bg-background", className)}
      data-testid={`commercial-showcase-${nicheId}`}
    >
      {/* ── 1. CABEÇALHO NATIVO DA VITRINE ── */}
      <IFoodHeader />

      {/* ── 2. DOCK DE MULTIVITRINES (Troca instantânea entre nichos comerciais) ── */}
      <MultiVitrineDock activeId={nicheId} />

      {/* ── 3. SUB-CATEGORIAS / SUBNICHOS VISUAIS (Fotos + Nomes) ── */}
      {subcategories.length > 0 && (
        <section aria-label={`Subcategorias de ${nicheTitle}`}>
          <IFoodSubcategoryPillRail
            items={subcategories}
            activeId={activeSubcategoryId}
            onSelect={onSelectSubcategory}
            textPosition="below"
            showText={true}
          />
        </section>
      )}

      {/* ── 4. CARROSSEL DE BANNERS PRINCIPAIS ── */}
      {banners.length > 0 && (
        <section aria-label="Banners em Destaque" className="px-3 sm:px-4">
          <BannerHeroCarousel banners={banners} />
        </section>
      )}

      {/* ── 5. MINI-BANNERS VERTICAIS (Destaques e Ofertas da Vitrine) ── */}
      {featureMiniBanners.length > 0 && (
        <IFoodFeatureMiniBannersRail
          title={`No Waesy ${nicheTitle} também tem`}
          items={featureMiniBanners}
        />
      )}

      {/* ── 6. ÚLTIMAS LOJAS / COMPRAS RECENTES ── */}
      {recentStores.length > 0 && (
        <IFoodRecentStoresRail
          title="Últimas lojas"
          stores={recentStores}
        />
      )}

      {/* ── 7. RESTAURANTES / LOJAS COM CUPOM (Cards Visuais Grandes Spotlight) ── */}
      {spotlightStores.length > 0 && (
        <IFoodVisualSpotlightRail
          title={`${nicheTitle} com Cupom`}
          isAd={true}
          viewMoreTo={`/${nicheId}`}
          stores={spotlightStores.map((s) => ({
            ...s,
            isFavorite: favorites[s.id] ?? s.isFavorite,
          }))}
          onFavoriteToggle={handleFavoriteToggle}
        />
      )}

      {/* ── 7.5 PRODUTOS EM DESTAQUE DO NICHO ── */}
      {products && products.length > 0 && (
        <section aria-label={`Produtos em Destaque de ${nicheTitle}`} className="space-y-3 py-1">
          <div className="px-3 sm:px-4 flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-tight">
              Produtos & Ofertas de {nicheTitle}
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              {products.length} itens
            </span>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar px-3 sm:px-4 snap-x snap-mandatory">
            {products.map((p: any) => (
              <div key={p.id} className="w-60 sm:w-68 shrink-0 snap-start">
                <OfferCard
                  id={p.id}
                  title={p.title}
                  slug={p.slug || p.id}
                  store_name={p.store_name || "Loja Parceira"}
                  price_cents={p.price_cents || 0}
                  original_price_cents={p.original_price_cents || p.price_cents || 0}
                  discount_percent={p.discount_percent || 0}
                  mechanic_label={p.mechanic_label || "Oferta"}
                  cover_image={p.cover_image || p.cover_url || ""}
                  selling_unit={p.selling_unit || "un"}
                  in_stock={p.in_stock !== false}
                  has_flash_offer={Boolean(p.has_flash_offer)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 8. RÉGUA DE CHIPS DE FILTRO ── */}
      <IFoodFilterChipsBar
        activeFilters={activeFilters}
        onToggleFilter={onToggleFilter}
      />

      {/* ── 9. FEED PRINCIPAL DE ESTABELECIMENTOS ── */}
      <section aria-label="Todos os Estabelecimentos" className="px-3 sm:px-4 space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-tight">
          Lojas e Estabelecimentos
        </h2>

        {stores.length > 0 ? (
          <div className="space-y-2">
            {stores.map((s) => (
              <IFoodStoreFeedCard
                key={s.id}
                store={{ ...s, isFavorite: favorites[s.id] ?? s.isFavorite }}
                variant="list"
                onFavoriteToggle={handleFavoriteToggle}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={emptyTitle}
            description={emptyMessage}
            className="py-12 bg-card rounded-2xl border border-border/60"
          />
        )}
      </section>

      {/* ── 10. CONTEÚDO ADICIONAL OU SLOTS CUSTOMIZADOS ── */}
      {children}

      {/* ── 11. BARRA FLUTUANTE DA SACOLA (Thumb Zone) ── */}
      <IFoodFloatingCartBar />
    </div>
  );
}
