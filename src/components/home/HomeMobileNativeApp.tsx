import React, { useState, useMemo, useEffect, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Storefront,
  Tag,
  Briefcase,
  Ticket,
  ArrowRight,
  Star,
  CheckCircle,
  WhatsappLogo,
  Buildings,
  Hamburger,
  Pill,
  Car,
  SoccerBall,
  CookingPot,
  Sparkle,
  Lightning,
  SquaresFour,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EntityCard } from "@/design-system/primitives/card";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { OfferCard } from "@/components/commerce/offer-card";
import { DiscoveryControlBar, type FilterChipOption, type ViewModeType } from "@/components/commerce/discovery-control-bar";
import { VitrineEngineSelector } from "@/components/commerce/vitrine-engine-selector";
import type { VitrineEngineMode } from "@/types/marketplace-compliance";
import { NewsCard } from "@/components/news/news-card";
import { PlacesHighlightBadge } from "@/components/shell/places-highlight-badge";
import { AdTelemetryBeacon } from "@/components/commerce/ad-telemetry-beacon";
import { ProceduralInfiniteFeed } from "@/components/commerce/procedural-infinite-feed";
import { MultiVitrineDock } from "@/components/commerce/ifood/MultiVitrineDock";
import { IFoodHeader } from "@/components/commerce/ifood/IFoodHeader";
import { IFoodFloatingCartBar } from "@/components/commerce/ifood/IFoodFloatingCartBar";
import { IFoodRecentStoresRail, type RecentStoreItem } from "@/components/commerce/ifood/IFoodRecentStoresRail";
import { IFoodFeatureMiniBannersRail, type FeatureMiniBannerItem } from "@/components/commerce/ifood/IFoodFeatureMiniBannersRail";
import { IFoodFilterChipsBar } from "@/components/commerce/ifood/IFoodFilterChipsBar";
import { IFoodStoreFeedCard, type IFoodStoreCardData } from "@/components/commerce/ifood/IFoodStoreFeedCard";
import { IFoodVisualSpotlightRail } from "@/components/commerce/ifood/IFoodVisualSpotlightRail";
import { PromoCouponBanner } from "@/components/home/PromoCouponBanner";
import { DualLineFilterPills } from "@/components/home/DualLineFilterPills";
import { MetamorphicBannerSlider } from "@/components/home/MetamorphicBannerSlider";
import { NoorNativeCategoryDock } from "@/components/home/NoorNativeCategoryDock";
import { IFoodSquareCategoryButton } from "@/components/home/IFoodSquareCategoryButton";
import { BentoGridTetris } from "@/components/home/BentoGridTetris";
import { HomePostsShowcase } from "@/components/home/HomePostsShowcase";
import { resolveStoreLogo, resolveStoreCover } from "@/lib/store-visuals";
import { useSuperAppDrawer } from "@/lib/drawer-store";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { formatStoreCategory } from "@/lib/niches/niche-manifest";
import {
  type HomePageSectionDTO,
  type NormalizedShowcasePost,
  isHealthyImageUrl,
} from "@/services/admin-home-cms.functions";
import type { DirectoryListingDTO } from "@/services/directory.functions";
import type { NewsArticleDTO } from "@/services/news.functions";
import type { JobItemDTO } from "@/services/jobs.functions";
import type { HotpageDTO } from "@/services/hotpage.functions";
import type { BannerDTO } from "@/services/banner.functions";

const CANONICAL_5X2_CATEGORIES = [
  { id: "restaurantes", label: "Restaurantes", to: "/gastronomia", icon: Hamburger },
  { id: "mercados", label: "Mercados", to: "/mercado", icon: Storefront },
  { id: "farmacias", label: "Farmácias", to: "/farmacia", icon: Pill },
  { id: "corridas", label: "Corridas", to: "/mobilidade", icon: Car, badge: "Novo" },
  { id: "promocoes", label: "Promoções", to: "/ofertas", icon: Tag, badge: "Novo" },
  { id: "bolao", label: "Bolão", to: "/concursos", icon: SoccerBall },
  { id: "gourmet", label: "Gourmet", to: "/gastronomia", icon: CookingPot },
  { id: "clube", label: "Clube", to: "/conta/creditos", icon: Sparkle },
  { id: "turbo", label: "Turbo", to: "/gastronomia", icon: Lightning, badge: "Novo" },
  { id: "ver_mais", label: "Ver mais", to: "#categorias", icon: SquaresFour, isAction: true },
];

const CANONICAL_FEATURE_MINI_BANNERS: FeatureMiniBannerItem[] = [
  {
    id: "fmb-clube",
    title: "Confira ofertas do clube para você",
    subtitle: "Economize em cada pedido",
    targetUrl: "/conta/creditos",
    badgeText: "CLUBE",
    actionText: "Clube >",
  },
  {
    id: "fmb-gourmet",
    title: "Experiência diferenciada",
    subtitle: "Alta gastronomia e chefs",
    targetUrl: "/gastronomia",
    badgeText: "GOURMET",
    actionText: "Gourmet >",
  },
  {
    id: "fmb-corridas",
    title: "Peça corridas e entregas rápidas",
    subtitle: "Mobilidade urbana taxa fixa",
    targetUrl: "/mobilidade",
    badgeText: "WAESY GO",
    actionText: "Corridas >",
  },
  {
    id: "fmb-turbo",
    title: "Burguer com entrega grátis",
    subtitle: "Hamburguerias da sua região",
    targetUrl: "/gastronomia",
    badgeText: "TURBO",
    actionText: "Pedir agora",
  },
];

export interface UnifiedDiscoveryItem {
  id: string;
  pillar: string;
  badge: string;
  title: string;
  subtitle?: string;
  image?: string | null;
  to: string;
  priceOrDate?: string | null;
  location?: string | null;
  phone?: string | null;
  verified?: boolean;
}

export interface HomeDiscoveryViewProps {
  homeSections?: HomePageSectionDTO[];
  heroSection?: HomePageSectionDTO;
  quickCategoriesSection?: HomePageSectionDTO;
  socialPostsSection?: HomePageSectionDTO;
  customSections: HomePageSectionDTO[];
  editorialHotpages: HotpageDTO[];
  banners: BannerDTO[];
  middleBanners: any[];
  footerBanners: any[];
  showcasePosts: NormalizedShowcasePost[];
  engineMode: VitrineEngineMode;
  onEngineModeChange: (mode: VitrineEngineMode) => void;
  search: string;
  onSearchChange: (val: string) => void;
  categories: FilterChipOption[];
  activeCategory: string;
  onSelectCategory: (id: string) => void;
  viewMode: ViewModeType;
  onViewModeChange: (mode: ViewModeType) => void;
  filteredPlaces: DirectoryListingDTO[];
  filteredMarketplaceProducts: any[];
  filteredClassifieds: any[];
  filteredNews: NewsArticleDTO[];
  filteredJobs: JobItemDTO[];
  filteredEvents: any[];
  unifiedItems: UnifiedDiscoveryItem[];
  formatMoney: (cents?: number | null) => string | null;
  session?: any;
}

export function HomeMobileNativeApp({
  homeSections = [],
  heroSection,
  quickCategoriesSection,
  socialPostsSection,
  customSections,
  editorialHotpages,
  banners,
  middleBanners,
  footerBanners,
  showcasePosts,
  engineMode,
  onEngineModeChange,
  search,
  onSearchChange,
  categories,
  activeCategory,
  onSelectCategory,
  viewMode,
  onViewModeChange,
  filteredPlaces,
  filteredMarketplaceProducts,
  filteredClassifieds,
  filteredNews,
  filteredJobs,
  filteredEvents,
  unifiedItems,
  formatMoney,
  session,
}: HomeDiscoveryViewProps) {
  const navigate = useNavigate();
  const { open: openSuperApp } = useSuperAppDrawer();
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const handleToggleFilter = (filterId: string) => {
    setActiveFilters((prev) =>
      prev.includes(filterId) ? prev.filter((id) => id !== filterId) : [...prev, filterId],
    );
  };

  const handleFavoriteToggle = (storeId: string) => {
    setFavorites((prev) => ({
      ...prev,
      [storeId]: !prev[storeId],
    }));
  };

  // Verifica se uma seção canônica está ativa no CMS (com fallback seguro para o estado padrão)
  const isSectionActive = (sectionKey: string, defaultActive: boolean): boolean => {
    if (!homeSections || homeSections.length === 0) return defaultActive;
    const found = homeSections.find((s) => s.section_key === sectionKey);
    if (found) return found.is_active !== false;
    return defaultActive;
  };

  // Resolve metadados e itens de uma seção a partir do CMS
  const getSection = (sectionKey: string): HomePageSectionDTO | undefined => {
    return homeSections?.find((s) => s.section_key === sectionKey);
  };

  const resolvedQuickCategories = useMemo(() => {
    const cmsItems = (quickCategoriesSection?.items || []).filter((it) => it.is_active !== false);
    if (cmsItems.length === 0) return CANONICAL_5X2_CATEGORIES;
    const iconByKey: Record<string, any> = {
      Hamburger,
      Storefront,
      Pill,
      Car,
      Tag,
      SoccerBall,
      CookingPot,
      Sparkle,
      Lightning,
      SquaresFour,
      Briefcase,
      Ticket,
    };
    return cmsItems.map((it, idx) => {
      const fallback = CANONICAL_5X2_CATEGORIES[idx] || CANONICAL_5X2_CATEGORIES[0];
      return {
        id: it.id || fallback.id,
        label: it.title || fallback.label,
        to: it.target_url || fallback.to,
        icon: (it.icon_name && iconByKey[it.icon_name]) || fallback.icon,
        badge: it.badge_text || undefined,
        imageUrl: isHealthyImageUrl(it.image_mobile_url || it.image_url)
          ? (it.image_mobile_url || it.image_url)
          : null,
        isAction: it.target_url === "#categorias" || it.icon_name === "SquaresFour",
      };
    });
  }, [quickCategoriesSection]);

  const resolvedFeatureMiniBanners: FeatureMiniBannerItem[] = useMemo(() => {
    const sec = getSection("feature_mini_banners");
    const cmsItems = (sec?.items || []).filter((it) => it.is_active !== false);
    if (cmsItems.length === 0) return CANONICAL_FEATURE_MINI_BANNERS;
    return cmsItems.map((it) => ({
      id: it.id,
      title: it.title || "Oferta especial",
      subtitle: it.subtitle || null,
      targetUrl: it.target_url || "/ofertas",
      badgeText: it.badge_text || null,
      actionText: it.badge_text || "Conferir",
      bgColor: it.bg_color || undefined,
      imageUrl: isHealthyImageUrl(it.image_mobile_url || it.image_url)
        ? (it.image_mobile_url || it.image_url)
        : null,
      iconName: it.icon_name || null,
      iconUrl: isHealthyImageUrl(it.icon_name) ? it.icon_name : null,
      showText: it.show_text !== false,
    }));
  }, [homeSections]);

  // Mapeia lojas reais do diretório/ecossistema para o padrão visual iFood (Zero Fake Data - Regra B.33)
  const liveStores: IFoodStoreCardData[] = useMemo(() => {
    if (!filteredPlaces || filteredPlaces.length === 0) return [];
    return filteredPlaces.map((p: any, idx: number) => {
      const logo = resolveStoreLogo(p);
      const cover = resolveStoreCover(p);

      return {
        id: p.id || `pl-${idx}`,
        name: p.business_name || p.title || "Loja Parceira",
        slug: p.slug || p.id || "",
        logoUrl: logo,
        coverUrl: cover,
        isAd: Boolean(p.is_promoted || p.is_sponsored || p.is_featured),
        rating: typeof p.rating === "number" && p.rating > 0 ? p.rating : null,
        reviewCount:
          typeof p.reviews_count === "number" && p.reviews_count > 0
            ? p.reviews_count
            : typeof p.review_count === "number" && p.review_count > 0
              ? p.review_count
              : null,
        deliveryTime: p.delivery_time || null,
        deliveryFee: p.delivery_fee || null,
        couponBadge: p.coupon_badge || null,
        secondaryBadges: Array.isArray(p.tags)
          ? p.tags.slice(0, 2)
          : p.category
            ? [p.category]
            : [],
        hasHighlightCrown: Boolean(p.is_verified && p.is_promoted),
        isFavorite: Boolean(favorites[p.id]),
      };
    });
  }, [filteredPlaces, favorites]);

  const recentStores: RecentStoreItem[] = useMemo(() => {
    return liveStores.slice(0, 8).map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      logoUrl: s.logoUrl || s.coverUrl || null,
      badge: s.deliveryFee === "Grátis" ? "Grátis" : s.couponBadge || undefined,
    }));
  }, [liveStores]);

  // ── Observador de Rolagem para Menu Sticky Sub-Header ──
  const [showStickyCategoryDock, setShowStickyCategoryDock] = useState(false);
  const categoriesSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = categoriesSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Quando a sentinela no final do grid de categorias sair do topo visível, ativa o dock sticky
        setShowStickyCategoryDock(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // ── Condicional de Cupons Reais (Regra B.33 / Anti-Fake) ──
  const hasActiveCoupons = useMemo(() => {
    const customSection = getSection("promo_coupon_banner");
    const hasCustomItems = (customSection?.items || []).some(
      (it) => it.is_active !== false && (Boolean(it.title?.trim()) || Boolean(it.image_url)),
    );
    if (hasCustomItems) return true;
    const hasStoreCoupons = liveStores.some((s) => Boolean(s.couponBadge));
    const hasProductCoupons = (filteredMarketplaceProducts || []).some(
      (p: any) => Boolean(p.has_flash_offer || (p.discount_percent && p.discount_percent > 0)),
    );
    return hasStoreCoupons || hasProductCoupons;
  }, [homeSections, liveStores, filteredMarketplaceProducts]);

  // ── Restaurantes com Cupom REAL (Estritamente com cupom cadastrado) ──
  const spotlightRestaurants = useMemo(() => {
    if (liveStores.length === 0) return [];
    const withCoupons = liveStores.filter((s) => Boolean(s.couponBadge));
    return (withCoupons.length > 0 ? withCoupons : liveStores).slice(0, 8);
  }, [liveStores]);

  // ── Farmácias & Saúde Reais ──
  const spotlightPharmacies = useMemo(() => {
    if (liveStores.length === 0) return [];
    return liveStores
      .filter(
        (s) =>
          s.secondaryBadges?.some((b) => b.toLowerCase().includes("farma")) ||
          s.name.toLowerCase().includes("farma") ||
          s.name.toLowerCase().includes("drogaria"),
      )
      .slice(0, 8);
  }, [liveStores]);

  // ── Mercados & Conveniência Reais ──
  const spotlightMarkets = useMemo(() => {
    if (liveStores.length === 0) return [];
    return liveStores
      .filter(
        (s) =>
          s.secondaryBadges?.some(
            (b) =>
              b.toLowerCase().includes("mercado") ||
              b.toLowerCase().includes("conveniência") ||
              b.toLowerCase().includes("super") ||
              b.toLowerCase().includes("bebida") ||
              b.toLowerCase().includes("açougue"),
          ) ||
          s.name.toLowerCase().includes("mercado") ||
          s.name.toLowerCase().includes("super") ||
          s.name.toLowerCase().includes("conveniência"),
      )
      .slice(0, 8);
  }, [liveStores]);

  // ── Produtos com Super Ofertas / Descontos Reais ──
  const flashOfferProducts = useMemo(() => {
    if (!filteredMarketplaceProducts || filteredMarketplaceProducts.length === 0) return [];
    return filteredMarketplaceProducts
      .filter((p: any) => Boolean(p.has_flash_offer || (p.discount_percent && p.discount_percent > 0)))
      .slice(0, 8);
  }, [filteredMarketplaceProducts]);

  return (
    <div className="w-full space-y-4 pb-32 pb-safe" data-testid="home-mobile-native-app">
      {/* ── 0. CABEÇALHO CANÔNICO iFOOD / SUPERAPP (Saudação + Endereço + Clube + Notificações) ── */}
      <IFoodHeader
        userName={session?.profile?.full_name || session?.user?.user_metadata?.full_name || null}
        searchValue={search}
        onSearchChange={onSearchChange}
        showSearch={false}
        hasClubBenefit={true}
      />

      {/* ── SUB-HEADER STICKY: DOCK HORIZONTAL DE CATEGORIAS AO ROLAR (Paridade Image 3 iFood) ── */}
      <div
        className={cn(
          "sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/40 transition-opacity duration-300 w-full",
          showStickyCategoryDock ? "block" : "hidden",
        )}
      >
        <MultiVitrineDock />
      </div>

      {/* ── 1. ALERTA / FAIXA ROXA DE CUPOM iFOOD (Pílula Sem Borda - Apenas se existirem cupons reais) ── */}
      {isSectionActive("promo_coupon_banner", true) && hasActiveCoupons && (
        <div className="px-3 sm:px-4">
          <PromoCouponBanner
            title={getSection("promo_coupon_banner")?.title || undefined}
            subtitle={getSection("promo_coupon_banner")?.subtitle || undefined}
            iconUrl={getSection("promo_coupon_banner")?.items?.[0]?.image_url || null}
            bgColor={getSection("promo_coupon_banner")?.items?.[0]?.bg_color || null}
            textColor={getSection("promo_coupon_banner")?.items?.[0]?.text_color || null}
          />
        </div>
      )}

      {/* ── [LEGADO OCULTO POR PADRÃO] SELETOR DE ECOSSISTEMA (Só exibe se ativado no Admin CMS) ── */}
      {isSectionActive("vitrine_engine_selector", false) && (
        <VitrineEngineSelector
          activeMode={engineMode}
          onModeChange={onEngineModeChange}
          className="pt-1"
        />
      )}

      {/* ── [LEGADO OCULTO POR PADRÃO] BARRA DE DESCOBERTA CLÁSSICA (Só exibe se ativada no Admin CMS) ── */}
      {isSectionActive("discovery_control_bar", false) && (
        <DiscoveryControlBar
          search={search}
          onSearchChange={onSearchChange}
          searchPlaceholder="Buscar lojas, produtos ou anúncios..."
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={onSelectCategory}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          allowedViewModes={["feed", "grid", "list"]}
          stickyMode="none"
          hideMobileSearch={true}
        />
      )}

      {/* ── [LEGADO OCULTO POR PADRÃO] PÍLULAS EM DUPLA LINHA (Só exibe se ativada no Admin CMS) ── */}
      {isSectionActive("dual_line_filter_pills", false) && <DualLineFilterPills />}

      {/* ── 2. GRADE 5x2 DE CATEGORIAS VISUAIS iFOOD (Alimentada pelo CMS — Ativa por padrão) ── */}
      {isSectionActive("quick_categories_ifood", true) && (
        <section aria-label={quickCategoriesSection?.title || "Categorias Principais"} className="w-full px-3 sm:px-4">
          {quickCategoriesSection?.show_title && quickCategoriesSection.title && (
            <div className="mb-2">
              <h2 className="text-base font-bold text-foreground tracking-tight break-words text-wrap">
                {quickCategoriesSection.title}
              </h2>
              {quickCategoriesSection.show_subtitle && quickCategoriesSection.subtitle && (
                <p className="text-xs text-muted-foreground line-clamp-1">{quickCategoriesSection.subtitle}</p>
              )}
            </div>
          )}
          /* design-lint-ignore DL-29 reason:"Dock canônico 5x2 de categorias iFood" expiry:"2027-12-31" */
          <div className="grid grid-cols-5 gap-y-2 gap-x-2">
            {resolvedQuickCategories.map((cat: any) => {
              const Icon = cat.icon;
              if (cat.isAction) {
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={openSuperApp}
                    className="flex flex-col items-center gap-2 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl select-none"
                  >
                    <div className="size-12 sm:size-14 rounded-2xl bg-card hover:bg-muted/60 border border-border/50 flex items-center justify-center transition-transform group-hover:scale-105">
                      <Icon size={24} weight="bold" className="text-foreground" />
                    </div>
                    <span className="text-2xs font-semibold text-foreground text-center leading-tight break-words text-wrap">
                      {cat.label}
                    </span>
                  </button>
                );
              }
              return (
                <Link
                  key={cat.id}
                  to={cat.to as any}
                  className="flex flex-col items-center gap-2 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl select-none relative"
                >
                  <div className="relative">
                    <div className="size-12 sm:size-14 rounded-2xl bg-card hover:bg-muted/60 border border-border/50 flex items-center justify-center transition-transform group-hover:scale-105 overflow-hidden">
                      {cat.imageUrl ? (
                        <img src={cat.imageUrl} alt={cat.label} className="size-10 object-contain" loading="lazy" />
                      ) : (
                        <Icon size={26} weight="bold" className="text-primary" />
                      )}
                    </div>
                    {cat.badge && (
                      <span className="absolute -top-2 -right-1 z-10 px-2 py-1 rounded-full bg-destructive text-destructive-foreground text-3xs font-black uppercase tracking-wider leading-none shadow-xs pointer-events-none">
                        {cat.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-2xs font-semibold text-foreground text-center leading-tight break-words text-wrap">
                    {cat.label}
                  </span>
                </Link>
              );
            })}
          </div>
          {/* Sentinela de Rolagem para fixar a régua horizontal no sub-header */}
          <div ref={categoriesSentinelRef} className="w-full h-1 pointer-events-none" />
        </section>
      )}

      {/* ── 3. CARROSSEL DE BANNER PRINCIPAL iFOOD COM INDICADORES EM TRAÇO (Ativo por padrão no CMS) ── */}
      {isSectionActive("hero_banners", true) &&
        (() => {
          if (banners && banners.length > 0) {
            return (
              <section aria-label="Destaques Principais" className="w-full px-1">
                <BannerHeroCarousel banners={banners} />
              </section>
            );
          }
          const validHeroItems = (heroSection?.items || []).filter(
            (it) =>
              it.is_active !== false &&
              isHealthyImageUrl(it.image_desktop_url || it.image_mobile_url || it.image_url),
          );
          if (validHeroItems.length > 0) {
            return (
              <section aria-label={heroSection?.title || "Destaques Principais"} className="w-full px-1">
                <MetamorphicBannerSlider
                  items={validHeroItems}
                  aspectRatio={heroSection?.aspect_ratio}
                />
              </section>
            );
          }
          return (
            <section aria-label="Banner Clube Waesy" className="w-full px-1">
              <Link
                to="/ofertas"
                className="w-full h-44 rounded-3xl bg-primary p-5 text-primary-foreground flex flex-col justify-between relative overflow-hidden block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="z-10 space-y-1 max-w-xs">
                  <span className="inline-block px-2 py-1 rounded-full bg-background/20 text-3xs font-black tracking-wider uppercase">
                    Clube Waesy
                  </span>
                  <h2 className="text-lg font-black tracking-tight leading-tight">
                    Peça com cupons de até R$ 21,90
                  </h2>
                  <p className="text-xs text-primary-foreground/85 line-clamp-1">
                    Descontos exclusivos nos estabelecimentos parceiros da cidade.
                  </p>
                </div>
                <div className="z-10 flex items-center gap-2 pt-2">
                  <span className="h-1 w-6 rounded-full bg-primary-foreground" />
                  <span className="h-1 w-3 rounded-full bg-primary-foreground/40" />
                  <span className="h-1 w-3 rounded-full bg-primary-foreground/40" />
                  <span className="h-1 w-3 rounded-full bg-primary-foreground/40" />
                </div>
              </Link>
            </section>
          );
        })()}

      {/* ── 4. ÚLTIMAS LOJAS COM LOGO E BADGES VERDES (Ativa por padrão no CMS) ── */}
      {isSectionActive("recent_stores_rail", true) && recentStores.length > 0 && (
        <IFoodRecentStoresRail
          title={getSection("recent_stores_rail")?.title || "Últimas lojas"}
          viewMoreTo="/gastronomia"
          stores={recentStores}
        />
      )}

      {/* ── 5. MINI-BANNERS VERTICAIS ("No Waesy também tem" — Alimentado pelo CMS) ── */}
      {isSectionActive("feature_mini_banners", true) && (
        <IFoodFeatureMiniBannersRail
          title={getSection("feature_mini_banners")?.title || "No Waesy também tem"}
          items={resolvedFeatureMiniBanners}
        />
      )}

      {/* ── 6. RESTAURANTES COM CUPOM (Cards Visuais Grandes Spotlight iFood — Ativa por padrão) ── */}
      {isSectionActive("spotlight_restaurants", true) && spotlightRestaurants.length > 0 && (
        <IFoodVisualSpotlightRail
          title={getSection("spotlight_restaurants")?.title || "Restaurantes com Cupom"}
          isAd={true}
          viewMoreTo="/gastronomia"
          stores={spotlightRestaurants}
          onFavoriteToggle={handleFavoriteToggle}
        />
      )}

      {/* ── 7. MERCADOS & CONVENIÊNCIA (Cards Visuais Grandes Spotlight iFood) ── */}
      {spotlightMarkets.length > 0 && (
        <IFoodVisualSpotlightRail
          title="Mercados & Conveniência"
          viewMoreTo="/mercado"
          stores={spotlightMarkets}
          onFavoriteToggle={handleFavoriteToggle}
        />
      )}

      {/* ── 8. FARMÁCIAS FAMOSAS (Cards Visuais Grandes Spotlight iFood — Ativa por padrão) ── */}
      {isSectionActive("spotlight_pharmacies", true) && spotlightPharmacies.length > 0 && (
        <IFoodVisualSpotlightRail
          title={getSection("spotlight_pharmacies")?.title || "Farmácias Famosas"}
          viewMoreTo="/farmacia"
          stores={spotlightPharmacies}
          onFavoriteToggle={handleFavoriteToggle}
        />
      )}

      {/* ── 9. SUPER OFERTAS & DESCONTOS (Produtos com Desconto Real) ── */}
      {flashOfferProducts.length > 0 && (
        <section aria-label="Super Ofertas" className="space-y-2 py-1">
          <div className="px-3 sm:px-4 flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-tight">
              Super Ofertas
            </h2>
            <Link
              to={"/ofertas" as any}
              className="text-xs font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xs"
            >
              Ver todas
            </Link>
          </div>
          <div data-slot="carousel" className="flex items-center gap-3 overflow-x-auto no-scrollbar px-3 sm:px-4 snap-x snap-mandatory">
            {flashOfferProducts.map((p: any) => (
              <div key={p.id} className="w-52 shrink-0 snap-start">
                <OfferCard
                  id={p.id}
                  title={p.title}
                  slug={p.slug}
                  store_name={p.store_name}
                  price_cents={p.price_cents}
                  original_price_cents={p.original_price_cents || p.price_cents}
                  discount_percent={p.discount_percent || 0}
                  mechanic_label={p.mechanic_label || "Oferta"}
                  cover_image={p.cover_image}
                  in_stock={p.in_stock}
                  has_flash_offer={Boolean(p.has_flash_offer)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 8. PÍLULAS DE FILTRO RÁPIDO iFOOD (Ordenar, Turbo, Entrega grátis... — Ativa por padrão) ── */}
      {isSectionActive("filter_chips_bar", true) && (
        <IFoodFilterChipsBar
          activeFilters={activeFilters}
          onToggleFilter={handleToggleFilter}
        />
      )}

      {/* ── 9. FEED VERTICAL DE LOJAS ("Lojas" estilo iFood — Ativa por padrão no CMS) ── */}
      {isSectionActive("stores_feed_list", true) && liveStores.length > 0 && (
        <section aria-label="Lojas e Restaurantes" className="px-1 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground tracking-tight leading-tight">
              {getSection("stores_feed_list")?.title || "Lojas"}
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              {liveStores.length} abertas
            </span>
          </div>
          <div className="space-y-2">
            {liveStores.map((st) => (
              <IFoodStoreFeedCard
                key={st.id}
                store={st}
                variant="list"
                onFavoriteToggle={handleFavoriteToggle}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── 5. SEÇÕES MODULARES DO CMS (Omissão Estrita de Seções Sem Imagens Válidas) ── */}
      {customSections.map((sec: HomePageSectionDTO) => {
        const activeSecItems = (sec.items || []).filter(
          (it) =>
            it.is_active !== false && (Boolean(it.title?.trim()) || isHealthyImageUrl(it.image_desktop_url || it.image_mobile_url || it.image_url)),
        );
        if (activeSecItems.length === 0) return null;

        return (
          <section key={sec.id} aria-label={sec.title || "Destaques"} className="w-full space-y-2">
            {sec.show_title && sec.title && (
              <div>
                <h2 className="text-base font-bold text-foreground tracking-tight break-words text-wrap">
                  {sec.title}
                </h2>
                {sec.show_subtitle && sec.subtitle && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{sec.subtitle}</p>
                )}
              </div>
            )}
            {sec.layout_variant === "bento_grid" && (
              <BentoGridTetris items={activeSecItems} aspectRatio={sec.aspect_ratio} />
            )}
            {(sec.layout_variant === "carousel" || sec.layout_variant === "slim_slider") && (
              <MetamorphicBannerSlider
                items={activeSecItems}
                aspectRatio={sec.layout_variant === "slim_slider" ? "slim_desktop" : sec.aspect_ratio}
              />
            )}
            {sec.layout_variant === "horizontal_scroll" && (
              <NoorNativeCategoryDock items={activeSecItems} />
            )}
            {(sec.layout_variant === "grid_2d" ||
              sec.layout_variant === "cards_action_grid" ||
              sec.layout_variant === "custom_buttons") && (
              /* design-lint-ignore DL-29 reason:"Grade iFood 4x2 ou cards de ação 2x2 nativa no mobile" expiry:"2027-12-31" */
              <div
                className={cn(
                  sec.layout_variant === "cards_action_grid"
                    ? "grid grid-cols-2 gap-2"
                    : "grid grid-cols-2 sm:grid-cols-4 gap-2",
                )}
              >
                {activeSecItems.map((it) => (
                  <IFoodSquareCategoryButton
                    key={it.id}
                    id={it.id}
                    title={it.title}
                    imageUrl={it.image_desktop_url || it.image_url || it.image_mobile_url}
                    targetUrl={it.target_url}
                    showText={it.show_text === true}
                    badgeText={it.badge_text}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {/* ── [OCULTO POR PADRÃO NO CMS] 6. HOTPAGES EDITORIAIS (Trilho Full-Bleed Nativo) ── */}
      {isSectionActive("hotpages_grid", false) && editorialHotpages && editorialHotpages.length > 0 && (
        <HotpagesRail hotpages={editorialHotpages} cleanMode={true} />
      )}

      {/* ── 7. MÓDULOS SECUNDÁRIOS / LEGADOS (Controlados pelo Admin CMS — Ocultos por padrão) ── */}
      {viewMode === "feed" && (
        <div className="space-y-4 pt-1">
          {/* PLACES / GUIA COMERCIAL */}
          {isSectionActive("places_directory_rail", true) &&
            (activeCategory === "todos" || activeCategory === "places") &&
            filteredPlaces.length > 0 && (
            <HorizontalRail
              title="Lugares e Empresas"
              actionLabel="Ver mais"
              actionTo="/diretorio"
            >
              {filteredPlaces.map((item: DirectoryListingDTO) => {
                const coverImage = item.banner_url || item.avatar_url;
                return (
                  <div
                    key={item.id}
                    className="w-72 sm:w-76 shrink-0 snap-start group flex flex-col justify-between rounded-lg border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-colors duration-300 motion-reduce:transition-none h-80"
                  >
                    <Link to="/diretorio/$id" params={{ id: item.id }} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <div className="relative aspect-video w-full overflow-hidden bg-muted/40 shrink-0">
                        {coverImage ? (
                          <img
                            src={coverImage}
                            alt={item.business_name || undefined}
                            className="size-full object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="size-full bg-muted/50 flex items-center justify-center">
                            <Storefront size={28} className="text-muted-foreground/40" />
                          </div>
                        )}
                      </div>

                      <div className="p-4 space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block truncate">
                          {formatStoreCategory(item.category || "Comércio Local")}
                        </span>
                        <div className="flex items-center justify-between gap-2 h-6">
                          <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {item.business_name}
                          </h3>
                          {item.is_verified && (
                            <CheckCircle size={15} weight="fill" className="text-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {item.address || "Regional"}
                        </p>
                      </div>
                    </Link>

                    <div className="px-4 py-2 flex items-center justify-between gap-2 border-t border-border/40 mt-auto min-h-12">
                      <div className="flex items-center gap-1 text-xs">
                        {item.rating && item.reviews_count > 0 ? (
                          <div className="flex items-center gap-1 font-bold text-amber-500 font-mono">
                            <Star size={13} weight="fill" />
                            <span>{Number(item.rating).toFixed(1)}</span>
                            <span className="text-muted-foreground font-normal">({item.reviews_count})</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 font-mono">Comércio Local</span>
                        )}
                      </div>

                      {(item.contact_whatsapp || item.contact_phone) ? (
                        <button
                          type="button"
                          onClick={() =>
                            trackAndOpenWhatsApp({
                              phone: item.contact_whatsapp || item.contact_phone || "",
                              message: `Olá! Vi o perfil da ${item.business_name} no Waesy.`,
                              storeId: (item as any).store_id || null,
                              entityType: "directory",
                              entityId: item.id,
                              entityTitle: item.business_name,
                              niche: item.category || undefined,
                            })
                          }
                          className="inline-flex items-center gap-2 h-11 min-h-11 px-3 rounded-lg text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer transition-colors"
                        >
                          <WhatsappLogo size={16} weight="bold" />
                          <span>WhatsApp</span>
                        </button>
                      ) : (
                        <Link
                          to="/diretorio/$id"
                          params={{ id: item.id }}
                          className="inline-flex items-center gap-1 h-11 min-h-11 px-3 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                        >
                          <span>Ver</span>
                          <ArrowRight size={14} weight="bold" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </HorizontalRail>
          )}

          {/* MARKETPLACE DE EMPRESAS */}
          {isSectionActive("marketplace_products_rail", true) &&
            (activeCategory === "todos" || activeCategory === "marketplace") && (
            filteredMarketplaceProducts.length > 0 ? (
              activeCategory === "marketplace" ? (
                <section aria-label="Produtos de Empresas" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-foreground tracking-tight">
                      Marketplace de Empresas
                    </h2>
                    <span className="text-xs font-mono text-muted-foreground">
                      {filteredMarketplaceProducts.length} itens
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {filteredMarketplaceProducts.map((offer: any) => (
                      <OfferCard key={offer.id} {...offer} />
                    ))}
                  </div>
                </section>
              ) : (
                <HorizontalRail
                  title="Marketplace de Empresas"
                  actionLabel="Ver mais"
                  actionTo="/marketplace"
                >
                  {filteredMarketplaceProducts.map((offer: any) => (
                    <div key={offer.id} className="w-72 shrink-0 snap-start">
                      <OfferCard {...offer} />
                    </div>
                  ))}
                </HorizontalRail>
              )
            ) : activeCategory === "marketplace" ? (
              <div className="py-12 text-center space-y-2 bg-card rounded-lg border border-border/60 p-6">
                <Storefront className="size-8 text-muted-foreground/40 mx-auto" />
                <h2 className="text-sm font-bold text-foreground">
                  Nenhum produto anunciado no momento
                </h2>
              </div>
            ) : null
          )}

          {/* CLASSIFICADOS */}
          {isSectionActive("classifieds_rail", true) &&
            (activeCategory === "todos" || activeCategory === "classificados") &&
            filteredClassifieds.length > 0 && (
            <HorizontalRail
              title="Classificados"
              actionLabel="Ver mais"
              actionTo="/classificados"
            >
              {filteredClassifieds.map((item: any) => {
                const coverImage =
                  (item.images && item.images[0]) ||
                  (item.photos && item.photos[0]) ||
                  item.image_url ||
                  item.media?.[0] ||
                  item.cover_image;
                const priceDisplay = item.price_cents ? formatMoney(item.price_cents) : "Sob Consulta";

                return (
                  <Link
                    key={item.id}
                    to="/classificados/$id"
                    params={{ id: item.id }}
                    className="w-72 shrink-0 snap-start group flex flex-col justify-between rounded-lg border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-muted/30">
                      {coverImage ? (
                        <img
                          src={coverImage}
                          alt={item.title}
                          className="size-full object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="size-full bg-muted/50 flex items-center justify-center">
                          <Tag size={28} className="text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="bg-background/95 border border-border/40 text-foreground text-xs font-bold uppercase">
                          {item.deal_type || item.category || "Anúncio"}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {item.title}
                        </p>
                        <p className="text-xs font-black text-foreground font-mono">
                          {priceDisplay}
                        </p>
                        <p className="text-xs text-muted-foreground break-words text-wrap">
                          {item.location_name || item.location_text || "Na sua região"}
                        </p>
                      </div>

                      <span className="w-full h-11 min-h-11 px-4 inline-flex items-center justify-center rounded-md bg-secondary text-secondary-foreground text-xs font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        Ver Anúncio
                      </span>
                    </div>
                  </Link>
                );
              })}
            </HorizontalRail>
          )}

          {/* FEED DA CIDADE */}
          {isSectionActive("social_posts_vitrine", false) &&
            (activeCategory === "todos" || activeCategory === "feed") && (
              <HomePostsShowcase
                posts={showcasePosts && showcasePosts.length > 0 ? showcasePosts : []}
                title={socialPostsSection?.title || "Feed da Cidade"}
                subtitle={socialPostsSection?.subtitle || "Acontecimentos e publicações locais"}
                showTitle={socialPostsSection ? socialPostsSection.show_title : true}
                showSubtitle={socialPostsSection ? socialPostsSection.show_subtitle : true}
                actionTo="/feed"
              />
            )}

          {/* NOTÍCIAS */}
          {isSectionActive("news_rail", false) &&
            (activeCategory === "todos" || activeCategory === "noticias") &&
            filteredNews.length > 0 && (
            <HorizontalRail
              title="Notícias"
              actionLabel="Ver mais"
              actionTo="/noticias"
            >
              {filteredNews.map((article: NewsArticleDTO) => (
                <div key={article.id} className="w-68 shrink-0 snap-start">
                  <NewsCard article={article} />
                </div>
              ))}
            </HorizontalRail>
          )}

          {/* EMPREGOS */}
          {isSectionActive("jobs_rail", true) &&
            (activeCategory === "todos" || activeCategory === "empregos") &&
            filteredJobs.length > 0 && (
            <HorizontalRail
              title="Vagas e Empregos"
              actionLabel="Ver mais"
              actionTo="/empregos"
            >
              {filteredJobs.map((job: JobItemDTO) => {
                const coverImage = (job as any).cover_image_url || job.company_logo_url;

                return (
                  <Link
                    key={job.id}
                    to="/empregos/$id"
                    params={{ id: job.id }}
                    className="w-68 shrink-0 snap-start p-4 rounded-lg border border-border/60 bg-card hover:border-foreground/30 transition-colors space-y-3 group flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex items-start gap-3">
                      <div className="size-12 rounded-lg overflow-hidden bg-muted/40 border border-border/60 shrink-0 flex items-center justify-center">
                        {coverImage ? (
                          <img
                            src={coverImage}
                            alt={job.company_name}
                            className="size-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <Briefcase size={20} className="text-muted-foreground/30" />
                        )}
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {job.title}
                        </h3>
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                          <Buildings size={13} className="shrink-0" />
                          <span className="break-words text-wrap">{job.company_name}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        <span className="break-words text-wrap">{job.location}</span>
                      </span>
                      <span className="font-bold text-foreground">
                        {job.salary_display || "A combinar"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </HorizontalRail>
          )}

          {/* EVENTOS & AGENDA (Seção Unificada Sem Duplicação) */}
          {isSectionActive("events_rail", false) &&
            (activeCategory === "todos" || activeCategory === "eventos" || activeCategory === "agenda") &&
            filteredEvents.length > 0 && (
              <HorizontalRail
                title="Agenda e Eventos"
                actionLabel="Ver mais"
                actionTo="/eventos"
              >
                {filteredEvents.map((ev: any) => {
                  const coverImage = ev.cover_image || ev.image_url || ev.banner_url;

                  return (
                    <Link
                      key={ev.id}
                      to="/evento/$id"
                      params={{ id: ev.id }}
                      className="w-64 shrink-0 snap-start rounded-lg border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-colors flex flex-col justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-muted/40">
                        {coverImage ? (
                          <img
                            src={coverImage}
                            alt={ev.title}
                            className="size-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="size-full bg-muted/50 flex items-center justify-center">
                            <Ticket size={28} className="text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <Badge variant="secondary" className="bg-background/95 border border-border/40 text-foreground text-xs font-bold">
                            {ev.category || "Evento"}
                          </Badge>
                        </div>
                        <div className="absolute bottom-2 right-2">
                          <span className="bg-foreground text-background text-xs font-mono font-bold px-2 py-1 rounded-md">
                            {ev.date_display || "Confirmado"}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 space-y-1">
                        <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {ev.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
                          <MapPin size={12} className="shrink-0" />
                          <span>{ev.location || "Na sua região"}</span>
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </HorizontalRail>
            )}

          {/* DESTAQUE INTERMEDIÁRIO DO CMS */}
          {((middleBanners.length > 0 && !!middleBanners[0].image_url) || activeCategory === "afiliados") && (
            <section aria-label="Destaque Promocional" className="space-y-3">
              {middleBanners.length > 0 && middleBanners[0].image_url ? (
                <AdTelemetryBeacon storeId={middleBanners[0].store_id || null} className="w-full">
                  <Link
                    to={(middleBanners[0].link_url || "/afiliados") as any}
                    className="group relative block w-full aspect-banner-cinema rounded-lg overflow-hidden bg-card border border-border/60 hover:border-foreground/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {middleBanners[0].media_type === "video" ? (
                      <video
                        src={middleBanners[0].image_url}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="size-full object-cover"
                      />
                    ) : (
                      <img
                        src={middleBanners[0].image_url}
                        alt={middleBanners[0].title || "Destaque"}
                        className="size-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                    )}
                    {Boolean((middleBanners[0] as any).show_text) && (middleBanners[0].title || middleBanners[0].badge_text) && (
                      <div className="absolute inset-x-0 bottom-0 p-3 bg-background/90 border-t border-border/40 text-left">
                        <h3 className="text-sm font-bold text-foreground leading-tight line-clamp-1">
                          {middleBanners[0].title}
                        </h3>
                      </div>
                    )}
                  </Link>
                </AdTelemetryBeacon>
              ) : activeCategory === "afiliados" ? (
                <div className="p-4 rounded-lg border border-border/60 bg-card flex flex-col gap-3">
                  <div className="space-y-1">
                    <Badge variant="outline" className="text-xs font-mono uppercase tracking-wider font-bold">
                      Afiliados
                    </Badge>
                    <h3 className="text-base font-bold text-foreground">
                      Programa de Afiliados Waesy
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Indique empresas para a plataforma e receba comissões na sua conta.
                    </p>
                  </div>
                  <Button asChild size="sm" className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold w-full">
                    <Link to="/afiliados">
                      <span>Conhecer Afiliados</span>
                      <ArrowRight size={14} className="ml-2" />
                    </Link>
                  </Button>
                </div>
              ) : null}
            </section>
          )}

          {/* FEED CONTÍNUO DE DESCOBERTA */}
          {isSectionActive("procedural_infinite_feed", true) && activeCategory === "todos" && (
            <ProceduralInfiniteFeed
              initialExcludedStoreIds={filteredPlaces.map((p: any) => p.store_id || p.id).filter(Boolean)}
              initialExcludedProductIds={[]}
            />
          )}
        </div>
      )}

      {/* ── MODO 2: GRADE MOBILE NATIVA (2 Colunas Simétricas) ── */}
      {viewMode === "grid" && (
        <section aria-label="Grade de Anúncios">
          {unifiedItems.length === 0 ? (
            <div className="py-16 text-center space-y-2 bg-card rounded-lg border border-border/60 p-6">
              <Tag className="size-8 text-muted-foreground/40 mx-auto" />
              <h2 className="text-sm font-bold text-foreground">
                Nenhum resultado encontrado
              </h2>
              <p className="text-xs text-muted-foreground">
                Tente buscar outro termo ou mudar a categoria.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {unifiedItems.map((item) => (
                <div
                  key={item.id}
                  className="group rounded-lg border border-border/50 bg-card overflow-hidden hover:border-foreground/30 transition-colors flex flex-col justify-between"
                >
                  <Link to={item.to as any} className="flex-1 flex flex-col cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <div className="relative aspect-square w-full overflow-hidden bg-muted/40 shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="size-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="size-full bg-muted/40 flex items-center justify-center">
                          <Tag size={24} className="text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-background/95 text-foreground font-mono text-xs uppercase font-bold px-2 py-0 rounded-md border border-border/40">
                          {item.badge}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-3 space-y-1 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        {item.priceOrDate && (
                          <p className="text-sm font-black text-foreground font-mono whitespace-nowrap shrink-0">
                            {item.priceOrDate}
                          </p>
                        )}
                        <h3 className="text-xs font-bold text-foreground line-clamp-2 leading-snug">
                          {item.title}
                        </h3>
                      </div>

                      {item.location && (
                        <div className="pt-2 border-t border-border/30 flex items-center text-xs text-muted-foreground">
                          <MapPin size={12} className="shrink-0 text-primary mr-1" />
                          <span className="break-words text-wrap">{item.location}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── MODO 3: LISTA COMPACTA MOBILE (EntityCard Pattern) ── */}
      {viewMode === "list" && (
        <section aria-label="Lista de Anúncios" className="space-y-2">
          {unifiedItems.length === 0 ? (
            <div className="py-16 text-center space-y-2 bg-card rounded-lg border border-border/50 p-6">
              <Tag className="size-8 text-muted-foreground/40 mx-auto" />
              <h2 className="text-sm font-bold text-foreground">
                Nenhum resultado encontrado
              </h2>
            </div>
          ) : (
            <div className="space-y-2">
              {unifiedItems.map((item) => (
                <EntityCard
                  key={item.id}
                  title={item.title}
                  subtitle={item.location || undefined}
                  onClick={() => {
                    navigate({ to: item.to as any });
                  }}
                  avatarSlot={
                    <div className="size-12 rounded-lg bg-muted/30 border border-border/40 shrink-0 overflow-hidden flex items-center justify-center">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="size-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <Tag size={20} className="text-muted-foreground/40" />
                      )}
                    </div>
                  }
                  statusSlot={
                    item.badge ? (
                      <Badge variant="outline" className="text-xs font-mono px-2 py-0 h-auto text-muted-foreground border-border/50">
                        {item.badge}
                      </Badge>
                    ) : undefined
                  }
                  metadataSlot={
                    item.priceOrDate ? (
                      <span className="font-mono font-bold text-xs text-foreground whitespace-nowrap shrink-0">
                        {item.priceOrDate}
                      </span>
                    ) : undefined
                  }
                  actionSlot={
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {item.phone && (
                        <button
                          type="button"
                          onClick={() => {
                            trackAndOpenWhatsApp({
                              phone: item.phone || "",
                              message: `Olá! Vi o anúncio "${item.title}" no Waesy.`,
                              storeId: null,
                              entityType: item.pillar as any,
                              entityId: item.id,
                              entityTitle: item.title,
                            });
                          }}
                          className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          title="WhatsApp"
                          aria-label={`Conversar no WhatsApp sobre ${item.title}`}
                        >
                          <WhatsappLogo size={20} weight="bold" />
                        </button>
                      )}
                      <span className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-muted-foreground/60">
                        <ArrowRight size={16} />
                      </span>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── 8. PORTAL DE NEGÓCIOS NO RODAPÉ ── */}
      <section aria-label="Portal de Negócios" className="pt-2">
        {footerBanners.length > 0 && footerBanners[0].image_url ? (
          <AdTelemetryBeacon storeId={footerBanners[0].store_id || null} className="w-full">
            <Link
              to={(footerBanners[0].link_url || "/criar-negocio") as any}
              className="group relative block w-full aspect-banner-cinema rounded-lg overflow-hidden bg-card border border-border/60 hover:border-foreground/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <img
                src={footerBanners[0].image_url}
                alt={footerBanners[0].title || "Divulgue sua empresa"}
                className="size-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
            </Link>
          </AdTelemetryBeacon>
        ) : (
          <div className="p-5 rounded-lg border border-border/60 bg-card space-y-3">
            <div className="space-y-1">
              <Badge variant="outline" className="text-xs font-mono uppercase tracking-wider font-bold">
                Empresas e Negócios
              </Badge>
              <h2 className="text-base font-black tracking-tight text-foreground">
                Divulgue seu negócio no <PlacesHighlightBadge className="text-base" />
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cadastre o perfil da sua empresa com endereço, fotos e WhatsApp para clientes da sua cidade.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button asChild className="h-11 min-h-11 w-full rounded-lg font-bold text-xs bg-foreground text-background hover:bg-foreground/90">
                <Link to="/criar-negocio">
                  <Storefront size={16} weight="bold" className="mr-2" />
                  Cadastrar Empresa
                </Link>
              </Button>
            </div>
          </div>
        )}
      </section>
      {/* ── BARRA FLUTUANTE DA SACOLA iFOOD ── */}
      <IFoodFloatingCartBar />
    </div>
  );
}
