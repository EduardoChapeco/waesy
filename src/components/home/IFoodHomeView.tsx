import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
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
  ArrowRight,
  Briefcase,
  Ticket,
} from "@phosphor-icons/react";
import { IFoodHeader } from "@/components/commerce/ifood/IFoodHeader";
import { IFoodRecentStoresRail, type RecentStoreItem } from "@/components/commerce/ifood/IFoodRecentStoresRail";
import { IFoodFeatureMiniBannersRail, type FeatureMiniBannerItem } from "@/components/commerce/ifood/IFoodFeatureMiniBannersRail";
import { IFoodFilterChipsBar } from "@/components/commerce/ifood/IFoodFilterChipsBar";
import { IFoodStoreFeedCard, type IFoodStoreCardData } from "@/components/commerce/ifood/IFoodStoreFeedCard";
import { IFoodVisualSpotlightRail } from "@/components/commerce/ifood/IFoodVisualSpotlightRail";
import { IFoodFloatingCartBar } from "@/components/commerce/ifood/IFoodFloatingCartBar";
import { PromoCouponBanner } from "@/components/home/PromoCouponBanner";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { OfferCard } from "@/components/commerce/offer-card";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { BentoGridTetris } from "@/components/home/BentoGridTetris";
import { MetamorphicBannerSlider } from "@/components/home/MetamorphicBannerSlider";
import { NoorNativeCategoryDock } from "@/components/home/NoorNativeCategoryDock";
import { IFoodSquareCategoryButton } from "@/components/home/IFoodSquareCategoryButton";
import { resolveStoreLogo, resolveStoreCover } from "@/lib/store-visuals";
import { useSuperAppDrawer } from "@/lib/drawer-store";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface IFoodHomeCategoryItem {
  id: string;
  label: string;
  to: string;
  icon: React.ComponentType<any>;
  imageUrl?: string | null;
  badge?: string | null;
  isAction?: boolean;
}

const CANONICAL_5X2_CATEGORIES: IFoodHomeCategoryItem[] = [
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
    bgColor: "#7c3aed",
  },
  {
    id: "fmb-gourmet",
    title: "Experiência diferenciada",
    subtitle: "Alta gastronomia e chefs",
    targetUrl: "/gastronomia",
    badgeText: "GOURMET",
    actionText: "Gourmet >",
    bgColor: "#171717",
  },
  {
    id: "fmb-turbo",
    title: "Burguer com entrega grátis",
    subtitle: "Hamburguerias da sua região",
    targetUrl: "/gastronomia",
    badgeText: "TURBO",
    actionText: "Pedir agora",
    bgColor: "#ea580c",
  },
  {
    id: "fmb-desconto",
    title: "Cupons de até R$ 30 off",
    subtitle: "Válidos para hoje",
    targetUrl: "/conta/creditos",
    badgeText: "HOT",
    actionText: "Resgatar",
    bgColor: "#dc2626",
  },
];

export interface IFoodHomeViewProps {
  userName?: string | null;
  activeAddress?: string | null;
  banners?: any[];
  middleBanners?: any[];
  footerBanners?: any[];
  placesListings?: any[];
  marketplaceProducts?: any[];
  classifieds?: any[];
  jobs?: any[];
  events?: any[];
  newsArticles?: any[];
  homeSections?: any[];
  editorialHotpages?: any[];
  showcasePosts?: any[];
  className?: string;
}

export function IFoodHomeView({
  userName,
  activeAddress,
  banners = [],
  middleBanners = [],
  placesListings = [],
  marketplaceProducts = [],
  classifieds = [],
  jobs = [],
  events = [],
  homeSections = [],
  className,
}: IFoodHomeViewProps) {
  const navigate = useNavigate();
  const { open: openSuperApp } = useSuperAppDrawer();
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
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

  // Mapeia lojas reais do banco com resolução defensiva de logo e capa (Zero Fake Data - Regra B.33)
  const liveStores: IFoodStoreCardData[] = useMemo(() => {
    if (placesListings && placesListings.length > 0) {
      return placesListings.map((p: any, idx: number) => {
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
        };
      });
    }

    return [];
  }, [placesListings]);

  // Seção 1: Restaurantes com Cupom (Cards Visuais Grandes Spotlight iFood)
  const spotlightRestaurants = useMemo(() => {
    if (liveStores.length === 0) return [];
    const gastro = liveStores.filter(
      (s) =>
        s.secondaryBadges?.some((b) => b.toLowerCase().includes("gastro") || b.toLowerCase().includes("restaurante")) ||
        s.name.toLowerCase().includes("lanche") ||
        s.name.toLowerCase().includes("bistrô") ||
        s.name.toLowerCase().includes("pizza") ||
        s.name.toLowerCase().includes("burger") ||
        s.name.toLowerCase().includes("sabor") ||
        s.name.toLowerCase().includes("paladar") ||
        s.name.toLowerCase().includes("panificadora") ||
        Boolean(s.couponBadge),
    );
    return (gastro.length > 0 ? gastro : liveStores).slice(0, 8).map((s) => ({
      ...s,
      isFavorite: favorites[s.id] ?? s.isFavorite,
    }));
  }, [liveStores, favorites]);

  // Seção 2: Farmácias & Mercados Famosos (Cards Visuais Grandes iFood)
  const spotlightPharmacies = useMemo(() => {
    if (liveStores.length === 0) return [];
    const others = liveStores.filter(
      (s) =>
        s.secondaryBadges?.some(
          (b) =>
            b.toLowerCase().includes("farma") ||
            b.toLowerCase().includes("mercado") ||
            b.toLowerCase().includes("hosped") ||
            b.toLowerCase().includes("varejo"),
        ) ||
        s.name.toLowerCase().includes("farma") ||
        s.name.toLowerCase().includes("mercado") ||
        s.name.toLowerCase().includes("hotel") ||
        s.name.toLowerCase().includes("shopping"),
    );
    if (others.length === 0) return [];
    return others.slice(0, 8).map((s) => ({
      ...s,
      isFavorite: favorites[s.id] ?? s.isFavorite,
    }));
  }, [liveStores, favorites]);

  // Últimas Lojas Mapeadas a partir de Lojas Reais
  const recentStores: RecentStoreItem[] = useMemo(() => {
    if (liveStores.length > 0) {
      return liveStores.slice(0, 6).map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        logoUrl: s.logoUrl || s.coverUrl || null,
        badge: s.deliveryFee === "Grátis" ? "Grátis" : s.couponBadge || undefined,
      }));
    }
    return [];
  }, [liveStores]);

  return (
    <div
      className={cn("w-full max-w-5xl mx-auto space-y-4 pb-28 min-h-screen bg-background", className)}
      data-testid="ifood-canonical-home-view"
    >
      {/* ── 1. CABEÇALHO CANÔNICO iFOOD (Mobile Only — md:hidden para evitar duplicação com TopBar) ── */}
      <IFoodHeader
        userName={userName}
        activeAddress={activeAddress}
        unreadNotificationsCount={6}
        hasClubBenefit={true}
      />

      {/* ── 2. ALERTA / BANNER ROXO DE CUPOM ── */}
      <div className="px-3 sm:px-4">
        <PromoCouponBanner />
      </div>

      {/* ── 3. GRADE 5x2 DE CATEGORIAS VISUAIS iFOOD ── */}
      <section aria-label="Categorias Principais" className="px-3 sm:px-4">
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-y-3 gap-x-2">
          {CANONICAL_5X2_CATEGORIES.map((cat) => {
            const Icon = cat.icon;

            if (cat.isAction) {
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={openSuperApp}
                  className="flex flex-col items-center gap-1.5 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl select-none"
                >
                  <div className="size-14 sm:size-16 rounded-2xl bg-muted/60 hover:bg-muted border border-border/60 flex items-center justify-center transition-transform group-hover:scale-105 shadow-2xs">
                    <Icon size={24} weight="bold" className="text-foreground" />
                  </div>
                  <span className="text-2xs font-semibold text-foreground text-center leading-tight truncate max-w-16">
                    {cat.label}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={cat.id}
                to={cat.to as any}
                className="flex flex-col items-center gap-1.5 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl select-none relative"
              >
                <div className="size-14 sm:size-16 rounded-2xl bg-muted/40 hover:bg-muted border border-border/60 flex items-center justify-center transition-transform group-hover:scale-105 shadow-2xs relative">
                  <Icon size={26} weight="bold" className="text-primary" />
                  {cat.badge && (
                    <span className="absolute -top-1.5 -right-1 px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-3xs font-black uppercase tracking-wider">
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
      </section>

      {/* ── 4. CARROSSEL DE BANNER PRINCIPAL COM TRACINHOS DE PAGINAÇÃO ── */}
      {banners && banners.length > 0 ? (
        <section aria-label="Banners em Destaque" className="px-3 sm:px-4">
          <BannerHeroCarousel banners={banners} />
        </section>
      ) : (
        <section aria-label="Banner Promocional" className="px-3 sm:px-4">
          <div className="w-full h-44 sm:h-56 rounded-3xl bg-primary p-5 text-primary-foreground flex flex-col justify-between relative overflow-hidden">
            <div className="z-10 space-y-1 max-w-xs">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-background/20 text-3xs font-black tracking-wider uppercase">
                Clube Waesy
              </span>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight leading-tight">
                Peça com cupons de até R$ 21,90
              </h2>
              <p className="text-xs text-primary-foreground/85 line-clamp-1">
                Descontos exclusivos nos restaurantes parceiros da cidade.
              </p>
            </div>

            {/* Indicadores em Traço do iFood */}
            <div className="z-10 flex items-center gap-1.5 pt-2">
              {[0, 1, 2, 3, 4].map((idx) => (
                <span
                  key={idx}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    idx === currentSlideIndex ? "w-6 bg-primary-foreground" : "w-3 bg-primary-foreground/40",
                  )}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 5. ÚLTIMAS LOJAS COM LOGO E BADGES VERDES ── */}
      {recentStores.length > 0 && (
        <IFoodRecentStoresRail
          title="Últimas lojas"
          viewMoreTo="/gastronomia"
          stores={recentStores}
        />
      )}

      {/* ── 6. MINI-BANNERS VERTICAIS ("No Waesy também tem") ── */}
      <IFoodFeatureMiniBannersRail
        title="No Waesy também tem"
        items={CANONICAL_FEATURE_MINI_BANNERS}
      />

      {/* ── 6.5 RESTAURANTES COM CUPOM (Cards Visuais Grandes Spotlight iFood) ── */}
      {spotlightRestaurants.length > 0 && (
        <IFoodVisualSpotlightRail
          title="Restaurantes com Cupom"
          isAd={true}
          viewMoreTo="/gastronomia"
          stores={spotlightRestaurants}
          onFavoriteToggle={handleFavoriteToggle}
        />
      )}

      {/* ── 6.6 FARMÁCIAS & MERCADOS FAMOSOS (Cards Visuais Grandes Spotlight iFood) ── */}
      {spotlightPharmacies.length > 0 && (
        <IFoodVisualSpotlightRail
          title="Farmácias & Mercados Famosos"
          viewMoreTo="/farmacia"
          stores={spotlightPharmacies}
          onFavoriteToggle={handleFavoriteToggle}
        />
      )}

      {/* ── 7. SEÇÃO DE PRODUTOS: MAIS VENDIDOS & OFERTAS ── */}
      {marketplaceProducts && marketplaceProducts.length > 0 && (
        <HorizontalRail
          title="Mais Vendidos & Ofertas"
          actionLabel="Ver marketplace"
          actionTo="/marketplace"
        >
          {marketplaceProducts.slice(0, 12).map((prod: any) => (
            <div key={prod.id} className="w-60 sm:w-68 shrink-0 snap-start">
              <OfferCard
                id={prod.id}
                title={prod.title}
                slug={prod.slug || prod.id}
                store_name={prod.store_name || "Loja Credenciada"}
                price_cents={prod.price_cents || 0}
                original_price_cents={prod.original_price_cents || prod.price_cents || 0}
                discount_percent={prod.discount_percent || 0}
                mechanic_label={prod.mechanic_label || "Oferta"}
                cover_image={prod.cover_image || prod.cover_url || ""}
                selling_unit={prod.selling_unit || "un"}
                in_stock={prod.in_stock !== false}
                has_flash_offer={Boolean(prod.has_flash_offer)}
              />
            </div>
          ))}
        </HorizontalRail>
      )}

      {/* ── 8. SEÇÕES CUSTOMIZADAS DO CMS MASTER (Bento Grid / Sliders / Docks) ── */}
      {homeSections && homeSections.length > 0 && (
        <div className="space-y-4 px-3 sm:px-4">
          {homeSections.map((sec: any) => {
            const activeItems = (sec.items || []).filter((it: any) => it.is_active !== false);
            if (activeItems.length === 0) return null;

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
                  <BentoGridTetris items={activeItems} aspectRatio={sec.aspect_ratio} />
                )}
                {(sec.layout_variant === "carousel" || sec.layout_variant === "slim_slider") && (
                  <MetamorphicBannerSlider
                    items={activeItems}
                    aspectRatio={sec.layout_variant === "slim_slider" ? "slim_desktop" : sec.aspect_ratio}
                  />
                )}
                {sec.layout_variant === "horizontal_scroll" && (
                  <NoorNativeCategoryDock items={activeItems} />
                )}
                {(sec.layout_variant === "grid_2d" ||
                  sec.layout_variant === "cards_action_grid" ||
                  sec.layout_variant === "custom_buttons") && (
                  <div
                    className={cn(
                      sec.layout_variant === "cards_action_grid"
                        ? "grid grid-cols-2 gap-2"
                        : "grid grid-cols-4 gap-2",
                    )}
                  >
                    {activeItems.map((it: any) => (
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
        </div>
      )}

      {/* ── 9. SEÇÃO ALL-IN-ONE: CLASSIFICADOS DA REGIÃO ── */}
      {classifieds && classifieds.length > 0 && (
        <HorizontalRail
          title="Classificados da Região"
          actionLabel="Ver classificados"
          actionTo="/classificados"
        >
          {classifieds.slice(0, 8).map((item: any) => {
            const coverImage =
              (item.images && item.images[0]) ||
              item.image_url ||
              item.media?.[0] ||
              item.cover_image;
            const priceDisplay = item.price_cents ? formatMoney(item.price_cents) : "Sob Consulta";

            return (
              <Link
                key={item.id}
                to="/classificados/$id"
                params={{ id: item.id }}
                className="w-68 sm:w-72 shrink-0 snap-start group flex flex-col justify-between rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-2xs"
              >
                <div className="relative aspect-4/3 w-full overflow-hidden bg-muted/30">
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt={item.title}
                      className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                    <span className="px-2 py-0.5 rounded-full bg-background/95 border border-border/40 text-foreground text-3xs font-black uppercase shadow-xs">
                      {item.deal_type || item.category || "Anúncio"}
                    </span>
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

                  <span className="w-full h-11 min-h-11 px-4 inline-flex items-center justify-center rounded-xl bg-secondary text-secondary-foreground text-xs font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-colors cursor-pointer">
                    Ver Anúncio
                  </span>
                </div>
              </Link>
            );
          })}
        </HorizontalRail>
      )}

      {/* ── 10. SEÇÃO ALL-IN-ONE: VAGAS & CARREIRAS ── */}
      {jobs && jobs.length > 0 && (
        <HorizontalRail
          title="Vagas & Oportunidades"
          actionLabel="Ver empregos"
          actionTo="/empregos"
        >
          {jobs.slice(0, 6).map((job: any) => (
            <Link
              key={job.id}
              to="/empregos/$id"
              params={{ id: job.id }}
              className="w-68 sm:w-72 shrink-0 snap-start p-3.5 rounded-2xl border border-border/60 bg-card hover:border-foreground/30 flex flex-col justify-between gap-3 shadow-2xs group select-none"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Briefcase size={18} weight="bold" />
                  </div>
                  <span className="text-3xs font-bold text-muted-foreground uppercase tracking-wider truncate">
                    {job.work_model || "Presencial"}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {job.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {job.company_name || "Empresa Confidencial"} • {job.city || "Chapecó e Região"}
                </p>
              </div>

              <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {job.salary_cents ? formatMoney(job.salary_cents) : "A combinar"}
                </span>
                <span className="text-xs font-bold text-primary flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  Ver vaga <ArrowRight size={12} weight="bold" />
                </span>
              </div>
            </Link>
          ))}
        </HorizontalRail>
      )}

      {/* ── 11. CHIPS DE FILTRO RÁPIDO ── */}
      <IFoodFilterChipsBar
        activeFilters={activeFilters}
        onToggleFilter={handleToggleFilter}
      />

      {/* ── 12. FEED PRINCIPAL DE LOJAS & RESTAURANTES ── */}
      <section aria-label="Lojas e Restaurantes" className="px-3 sm:px-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-tight">
            Lojas & Empresas
          </h2>
          <span className="text-xs text-muted-foreground font-medium">
            {liveStores.length} abertas
          </span>
        </div>

        <div className="space-y-2.5 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
          {liveStores.map((st) => (
            <IFoodStoreFeedCard
              key={st.id}
              store={st}
              variant="list"
            />
          ))}
        </div>
      </section>

      {/* ── 13. BARRA FLUTUANTE DA SACOLA (Dinâmica e Conectada ao CartContext Real) ── */}
      <IFoodFloatingCartBar />
    </div>
  );
}
