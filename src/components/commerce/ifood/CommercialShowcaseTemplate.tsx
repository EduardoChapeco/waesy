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
      {/* ── 1. CABEÇALHO CANÔNICO iFOOD ── */}
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

      {/* ── 5. MINI-BANNERS VERTICAIS ("No iFood também tem" / Cupons e Ofertas) ── */}
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
          <div className="space-y-2.5">
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

      {/* ── 11. BARRA FLUTUANTE DA SACOLA (iFood Thumb Zone) ── */}
      <IFoodFloatingCartBar />
    </div>
  );
}
