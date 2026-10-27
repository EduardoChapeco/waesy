import * as React from "react";
import {
  ArrowRight,
  ChevronRight,
  MapPin,
  Package,
  Plus,
  ShoppingBag,
  Sparkles,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import {
  resolveBidirectionalMedia,
  resolveSafeLinkHref,
  useEffectiveViewport,
} from "./viewport-context";

/* ============================================================================
 * 1. VitrineProductShelf — Carrossel & Grade de Ofertas e Produtos (OfferCard + HitsLeadCard)
 * ============================================================================ */

export type VitrineProductDesktopLayout =
  | "horizontal_rail"
  | "grid_4col"
  | "bento_3"
  | "split_2col";

export type VitrineProductMobileLayout =
  | "horizontal_rail"
  | "grid_2col"
  | "list_compact";

export interface VitrineProductItem {
  id: string;
  title: string;
  slug?: string;
  storeName?: string;
  priceCents: number;
  originalPriceCents?: number;
  badge?: string;
  sellingUnit?: string;
  imageUrl?: string;
  imageAlt?: string;
  href?: string;
  ctaLabel?: string;
  category?: string;
}

export interface VitrineLeadCardConfig {
  enabled?: boolean;
  badge?: string;
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  href?: string;
  imageDesktopUrl?: string;
  imageMobileUrl?: string;
  imageAlt?: string;
}

export interface VitrineProductShelfProps {
  sectionTitle?: string;
  sectionSubtitle?: string;
  viewAllLabel?: string;
  viewAllHref?: string;
  dataSource?: "store_products" | "manual";
  categoryFilter?: string;
  onlyPromotions?: boolean;
  maxItems?: number;
  cardAspect?: "4_3" | "square";
  ctaLabel?: string;
  desktopLayout?: VitrineProductDesktopLayout;
  mobileLayout?: VitrineProductMobileLayout;
  leadCard?: VitrineLeadCardConfig;
  items?: VitrineProductItem[];
  liveProducts?: Array<Record<string, unknown>>;
  onAddToCart?: (productId: string) => void;
  className?: string;
}

function mapLiveProductsToShelfItems(
  liveProducts?: Array<Record<string, unknown>>,
): VitrineProductItem[] {
  if (!Array.isArray(liveProducts)) return [];
  return liveProducts
    .map((raw, idx): VitrineProductItem | null => {
      const title =
        (typeof raw.title === "string" && raw.title.trim()) ||
        (typeof raw.name === "string" && raw.name.trim()) ||
        "";
      if (!title) return null;
      const id = typeof raw.id === "string" ? raw.id : `prod-${idx}`;
      const slug = typeof raw.slug === "string" && raw.slug ? raw.slug : id;
      const rawPrice =
        typeof raw.price_cents === "number"
          ? raw.price_cents
          : typeof raw.price === "number"
            ? raw.price
            : 0;
      const origPrice =
        typeof raw.compare_at_price_cents === "number"
          ? raw.compare_at_price_cents
          : typeof raw.original_price_cents === "number"
            ? raw.original_price_cents
            : 0;
      const imagesArr = Array.isArray(raw.images) ? raw.images : [];
      const firstImg =
        typeof imagesArr[0] === "string"
          ? imagesArr[0]
          : typeof raw.cover_image === "string"
            ? raw.cover_image
            : typeof raw.image_url === "string"
              ? raw.image_url
              : "";
      const cat =
        typeof raw.category_slug === "string"
          ? raw.category_slug
          : typeof raw.category === "string"
            ? raw.category
            : "";

      return {
        id,
        title,
        slug,
        storeName: typeof raw.store_name === "string" ? raw.store_name : undefined,
        priceCents: rawPrice,
        originalPriceCents: origPrice > rawPrice ? origPrice : undefined,
        badge: typeof raw.mechanic_label === "string" ? raw.mechanic_label : undefined,
        sellingUnit: typeof raw.selling_unit === "string" ? raw.selling_unit : undefined,
        imageUrl: firstImg || undefined,
        imageAlt: title,
        href: `/produto/${slug}`,
        category: cat,
      };
    })
    .filter((item): item is VitrineProductItem => item !== null);
}

export function VitrineProductShelf({
  sectionTitle = "Ofertas em Destaque",
  sectionSubtitle,
  viewAllLabel,
  viewAllHref,
  dataSource = "store_products",
  categoryFilter,
  onlyPromotions = false,
  maxItems = 8,
  cardAspect = "4_3",
  ctaLabel = "Ver Oferta",
  desktopLayout = "horizontal_rail",
  mobileLayout = "horizontal_rail",
  leadCard,
  items = [],
  liveProducts,
  onAddToCart,
  className,
}: VitrineProductShelfProps) {
  const { isMobile, isEditorCanvas } = useEffectiveViewport();

  const resolvedProducts = React.useMemo(() => {
    let sourceList: VitrineProductItem[] = [];
    if (dataSource === "store_products") {
      const mapped = mapLiveProductsToShelfItems(liveProducts);
      sourceList = mapped.length > 0 ? mapped : Array.isArray(items) ? items : [];
    } else {
      sourceList = Array.isArray(items) ? items : [];
    }

    if (categoryFilter && categoryFilter !== "all" && categoryFilter.trim()) {
      const normalized = categoryFilter.trim().toLowerCase();
      sourceList = sourceList.filter((p) =>
        (p.category || "").toLowerCase().includes(normalized),
      );
    }

    if (onlyPromotions) {
      sourceList = sourceList.filter(
        (p) =>
          typeof p.originalPriceCents === "number" &&
          p.originalPriceCents > p.priceCents,
      );
    }

    return sourceList.slice(0, Math.max(1, maxItems));
  }, [categoryFilter, dataSource, items, liveProducts, maxItems, onlyPromotions]);

  const safeViewAllHref = isEditorCanvas ? undefined : resolveSafeLinkHref(viewAllHref);

  if (resolvedProducts.length === 0) {
    return (
      <section className={cn("w-full py-4", className)} aria-label={sectionTitle}>
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 flex flex-col items-center justify-center text-center gap-2">
          <ShoppingBag className="size-8 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">
            Nenhum produto disponível nesta prateleira
          </p>
          <p className="text-xs text-muted-foreground max-w-md">
            Cadastre produtos no catálogo da loja ou adicione ofertas curadas manualmente.
          </p>
        </div>
      </section>
    );
  }

  const renderLeadBanner = () => {
    if (!leadCard?.enabled) return null;
    const mediaSrc = resolveBidirectionalMedia(
      {
        imageMobileUrl: leadCard.imageMobileUrl,
        imageDesktopUrl: leadCard.imageDesktopUrl,
      },
      isMobile,
    );
    const safeLeadHref = isEditorCanvas ? undefined : resolveSafeLinkHref(leadCard.href);

    const leadBody = (
      <div className="group relative w-56 sm:w-64 h-full min-h-80 rounded-lg border border-border/70 bg-primary/10 overflow-hidden flex flex-col justify-between p-4 shrink-0 snap-start hover:border-primary/60 transition-colors duration-150 motion-reduce:transition-none">
        {mediaSrc && (
          <img
            src={mediaSrc}
            alt={leadCard.imageAlt || leadCard.title || "Destaque da seção"}
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition-transform duration-200 motion-reduce:transition-none group-hover:scale-105"
          />
        )}

        <div className="relative z-10 flex items-start justify-between">
          {leadCard.badge ? (
            <span className="px-2 py-1 rounded-md bg-background/90 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-primary">
              {leadCard.badge}
            </span>
          ) : (
            <span className="size-10 rounded-lg bg-background/90 backdrop-blur-md text-primary flex items-center justify-center">
              <Sparkles className="size-5" />
            </span>
          )}
        </div>

        <div className="relative z-10 rounded-lg bg-background/90 backdrop-blur-md border border-border/60 p-3 space-y-2">
          {leadCard.title && (
            <h3 className="text-sm sm:text-base font-extrabold text-foreground leading-tight break-words text-wrap">
              {leadCard.title}
            </h3>
          )}
          {leadCard.subtitle && (
            <p className="text-xs text-muted-foreground line-clamp-2 break-words">
              {leadCard.subtitle}
            </p>
          )}
          <span className="h-11 min-h-11 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold inline-flex items-center justify-between gap-2 w-full">
            <span>{leadCard.actionLabel || "Ver Todos"}</span>
            <ArrowRight className="size-4 shrink-0" />
          </span>
        </div>
      </div>
    );

    if (safeLeadHref) {
      return (
        <a
          href={safeLeadHref}
          aria-label={leadCard.title || "Destaque da seção"}
          className="block shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {leadBody}
        </a>
      );
    }
    return leadBody;
  };

  const renderProductCard = (product: VitrineProductItem, idx: number, horizontal = false) => {
    const safeHref = isEditorCanvas
      ? undefined
      : resolveSafeLinkHref(product.href || (product.slug ? `/produto/${product.slug}` : undefined));
    const discountPct =
      product.originalPriceCents && product.originalPriceCents > product.priceCents
        ? Math.round(
            ((product.originalPriceCents - product.priceCents) / product.originalPriceCents) * 100,
          )
        : 0;
    const actionText = product.ctaLabel || ctaLabel || "Ver Oferta";

    if (horizontal) {
      return (
        <div
          key={product.id || idx}
          className="group rounded-lg border border-border/70 bg-card p-3 flex items-center justify-between gap-3 hover:border-primary/50 transition-colors duration-150 motion-reduce:transition-none"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="size-20 rounded-lg overflow-hidden bg-muted/30 shrink-0 flex items-center justify-center">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.imageAlt || product.title}
                  loading="lazy"
                  className="size-full object-cover"
                />
              ) : (
                <Package className="size-8 text-muted-foreground/40" />
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <h3 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 leading-snug break-words text-wrap">
                {product.title}
              </h3>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-black font-mono text-foreground">
                  {formatMoney(product.priceCents)}
                </span>
                {discountPct > 0 && product.originalPriceCents && (
                  <span className="text-xs font-mono text-muted-foreground line-through">
                    {formatMoney(product.originalPriceCents)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {onAddToCart && !isEditorCanvas ? (
            <button
              type="button"
              onClick={() => onAddToCart(product.id)}
              aria-label={`Adicionar ${product.title}`}
              className="size-11 min-h-11 rounded-lg bg-primary text-primary-foreground inline-flex items-center justify-center shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-5" />
            </button>
          ) : safeHref ? (
            <a
              href={safeHref}
              className="h-11 min-h-11 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold inline-flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>{actionText}</span>
            </a>
          ) : (
            <span className="h-11 min-h-11 px-3 rounded-lg bg-muted text-foreground text-xs font-bold inline-flex items-center justify-center shrink-0">
              <span>{actionText}</span>
            </span>
          )}
        </div>
      );
    }

    const aspectCls = cardAspect === "square" ? "aspect-square" : "aspect-4-3";

    return (
      <div
        key={product.id || idx}
        className="group rounded-lg border border-border/70 bg-card overflow-hidden flex flex-col justify-between h-full hover:border-primary/50 transition-colors duration-150 motion-reduce:transition-none"
      >
        <div>
          <div className={cn("relative w-full overflow-hidden bg-muted/30", aspectCls)}>
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.imageAlt || product.title}
                loading="lazy"
                className="size-full object-cover transition-transform duration-200 motion-reduce:transition-none group-hover:scale-105"
              />
            ) : (
              <div className="size-full flex items-center justify-center">
                <Package className="size-10 text-muted-foreground/40" />
              </div>
            )}

            {(discountPct > 0 || product.badge) && (
              <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                {discountPct > 0 && (
                  <span className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs font-black uppercase tracking-wider">
                    -{discountPct}%
                  </span>
                )}
                {product.badge && (
                  <span className="px-2 py-1 rounded-md bg-background/90 backdrop-blur-md text-foreground text-xs font-bold">
                    {product.badge}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="p-3 sm:p-4 space-y-1">
            {product.storeName && (
              <p className="text-xs text-muted-foreground truncate">{product.storeName}</p>
            )}
            <h3 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 leading-snug break-words text-wrap">
              {product.title}
            </h3>
            <div className="pt-1 flex items-baseline gap-2 flex-wrap">
              <span className="text-base font-black font-mono text-foreground">
                {formatMoney(product.priceCents)}
              </span>
              {product.sellingUnit && (
                <span className="text-xs text-muted-foreground">/{product.sellingUnit}</span>
              )}
              {discountPct > 0 && product.originalPriceCents && (
                <span className="text-xs font-mono text-muted-foreground line-through">
                  {formatMoney(product.originalPriceCents)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 pt-0">
          {onAddToCart && !isEditorCanvas ? (
            <button
              type="button"
              onClick={() => onAddToCart(product.id)}
              className="w-full h-11 min-h-11 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer hover:opacity-95 transition-opacity duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-4 shrink-0" />
              <span>{actionText}</span>
            </button>
          ) : safeHref ? (
            <a
              href={safeHref}
              className="w-full h-11 min-h-11 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold inline-flex items-center justify-center gap-2 hover:opacity-95 transition-opacity duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>{actionText}</span>
              <ArrowRight className="size-4 shrink-0" />
            </a>
          ) : (
            <span className="w-full h-11 min-h-11 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold inline-flex items-center justify-center gap-2">
              <span>{actionText}</span>
              <ArrowRight className="size-4 shrink-0" />
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className={cn("w-full py-4 space-y-4", className)} aria-label={sectionTitle}>
      {(sectionTitle || sectionSubtitle || viewAllLabel) && (
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1 min-w-0">
            {sectionTitle && (
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground break-words">
                {sectionTitle}
              </h2>
            )}
            {sectionSubtitle && (
              <p className="text-xs sm:text-sm text-muted-foreground">{sectionSubtitle}</p>
            )}
          </div>
          {viewAllLabel && safeViewAllHref && (
            <a
              href={safeViewAllHref}
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 inline-flex items-center gap-1 shrink-0 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>{viewAllLabel}</span>
              <ChevronRight className="size-4" />
            </a>
          )}
        </div>
      )}

      {/* RENDERIZAÇÃO MOBILE */}
      {isMobile ? (
        mobileLayout === "list_compact" ? (
          <div className="space-y-3">
            {resolvedProducts.map((p, idx) => renderProductCard(p, idx, true))}
          </div>
        ) : mobileLayout === "grid_2col" ? (
          <div className="grid grid-cols-2 gap-3">
            {resolvedProducts.map((p, idx) => renderProductCard(p, idx, false))}
          </div>
        ) : (
          <div className="carousel flex flex-nowrap items-stretch gap-3 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory">
            {renderLeadBanner()}
            {resolvedProducts.map((p, idx) => (
              <div key={p.id || idx} className="w-56 shrink-0 snap-start">
                {renderProductCard(p, idx, false)}
              </div>
            ))}
          </div>
        )
      ) : /* RENDERIZAÇÃO DESKTOP */
      desktopLayout === "split_2col" ? (
        <div className="grid grid-cols-2 gap-4">
          {resolvedProducts.map((p, idx) => renderProductCard(p, idx, true))}
        </div>
      ) : desktopLayout === "bento_3" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {resolvedProducts.map((p, idx) => renderProductCard(p, idx, false))}
        </div>
      ) : desktopLayout === "grid_4col" ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {resolvedProducts.map((p, idx) => renderProductCard(p, idx, false))}
        </div>
      ) : (
        <div className="carousel flex flex-nowrap items-stretch gap-4 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory">
          {renderLeadBanner()}
          {resolvedProducts.map((p, idx) => (
            <div key={p.id || idx} className="w-64 shrink-0 snap-start">
              {renderProductCard(p, idx, false)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ============================================================================
 * 2. VitrineClassifiedsRail — Carrossel & Grade de Classificados / Anúncios (B.37 / B.38)
 * ============================================================================ */

export type VitrineClassifiedNiche =
  | "all"
  | "vehicles"
  | "real_estate"
  | "services"
  | "tourism"
  | "general";

export interface VitrineClassifiedItem {
  id: string;
  title: string;
  priceCents?: number;
  priceLabel?: string;
  location?: string;
  niche?: Exclude<VitrineClassifiedNiche, "all">;
  badge?: string;
  specs?: string[];
  imageUrl?: string;
  imageAlt?: string;
  href?: string;
  ctaLabel?: string;
}

export interface VitrineClassifiedsRailProps {
  sectionTitle?: string;
  sectionSubtitle?: string;
  viewAllLabel?: string;
  viewAllHref?: string;
  dataSource?: "store_classifieds" | "manual";
  nicheFilter?: VitrineClassifiedNiche;
  maxItems?: number;
  ctaLabel?: string;
  desktopLayout?: "horizontal_rail" | "grid_3col" | "grid_4col";
  mobileLayout?: "horizontal_rail" | "grid_1col" | "grid_2col";
  items?: VitrineClassifiedItem[];
  liveClassifieds?: Array<Record<string, unknown>>;
  className?: string;
}

const NICHE_LABELS: Record<Exclude<VitrineClassifiedNiche, "all">, string> = {
  vehicles: "Veículos",
  real_estate: "Imóveis",
  services: "Serviços",
  tourism: "Turismo",
  general: "Classificados",
};

function detectClassifiedNiche(raw: Record<string, unknown>): Exclude<VitrineClassifiedNiche, "all"> {
  const cat = String(raw.category || raw.niche || raw.ad_type || "").toLowerCase();
  if (cat.includes("veic") || cat.includes("carro") || cat.includes("moto") || cat.includes("auto")) {
    return "vehicles";
  }
  if (cat.includes("imov") || cat.includes("casa") || cat.includes("apart") || cat.includes("terreno")) {
    return "real_estate";
  }
  if (cat.includes("turis") || cat.includes("viag") || cat.includes("pacote") || cat.includes("excurs")) {
    return "tourism";
  }
  if (cat.includes("servi") || cat.includes("profiss")) {
    return "services";
  }
  return "general";
}

function mapLiveClassifiedsToItems(
  liveClassifieds?: Array<Record<string, unknown>>,
): VitrineClassifiedItem[] {
  if (!Array.isArray(liveClassifieds)) return [];
  return liveClassifieds
    .map((raw, idx): VitrineClassifiedItem | null => {
      const title =
        (typeof raw.title === "string" && raw.title.trim()) ||
        (typeof raw.name === "string" && raw.name.trim()) ||
        "";
      if (!title) return null;
      const id = typeof raw.id === "string" ? raw.id : `ad-${idx}`;
      const niche = detectClassifiedNiche(raw);
      const priceCents =
        typeof raw.price_cents === "number"
          ? raw.price_cents
          : typeof raw.price === "number"
            ? Math.round(raw.price * 100)
            : undefined;
      const imagesArr = Array.isArray(raw.images) ? raw.images : [];
      const firstImg =
        typeof imagesArr[0] === "string"
          ? imagesArr[0]
          : typeof raw.cover_image === "string"
            ? raw.cover_image
            : typeof raw.image_url === "string"
              ? raw.image_url
              : "";
      const city = typeof raw.city === "string" ? raw.city : "";
      const state = typeof raw.state === "string" ? raw.state : "";
      const location = [city, state].filter(Boolean).join(" - ") || undefined;

      // Isolamento Semântico Estrito por Nicho (Invariante B.37)
      const specs: string[] = [];
      const rawSpecs =
        raw.specs && typeof raw.specs === "object" && !Array.isArray(raw.specs)
          ? (raw.specs as Record<string, unknown>)
          : {};

      if (niche === "vehicles") {
        if (raw.year || rawSpecs.year) specs.push(String(raw.year || rawSpecs.year));
        if (typeof raw.mileage_km === "number") specs.push(`${raw.mileage_km.toLocaleString("pt-BR")} km`);
        else if (typeof rawSpecs.km === "number") specs.push(`${(rawSpecs.km as number).toLocaleString("pt-BR")} km`);
      } else if (niche === "real_estate") {
        if (raw.bedrooms || rawSpecs.bedrooms) specs.push(`${raw.bedrooms || rawSpecs.bedrooms} quartos`);
        if (raw.area_m2 || rawSpecs.area_m2) specs.push(`${raw.area_m2 || rawSpecs.area_m2} m²`);
      } else if (niche === "tourism") {
        if (raw.duration_days) specs.push(`${raw.duration_days} dias`);
        if (rawSpecs.duration) specs.push(String(rawSpecs.duration));
      }

      if (Array.isArray(raw.specs)) {
        for (const s of raw.specs) {
          if (typeof s === "string") specs.push(s);
        }
      }

      return {
        id,
        title,
        priceCents,
        location,
        niche,
        badge: NICHE_LABELS[niche],
        specs,
        imageUrl: firstImg || undefined,
        imageAlt: title,
        href: `/classificados/${id}`,
      };
    })
    .filter((item): item is VitrineClassifiedItem => item !== null);
}

export function VitrineClassifiedsRail({
  sectionTitle = "Anúncios & Oportunidades",
  sectionSubtitle,
  viewAllLabel,
  viewAllHref,
  dataSource = "store_classifieds",
  nicheFilter = "all",
  maxItems = 8,
  ctaLabel = "Ver Anúncio",
  desktopLayout = "horizontal_rail",
  mobileLayout = "horizontal_rail",
  items = [],
  liveClassifieds,
  className,
}: VitrineClassifiedsRailProps) {
  const { isMobile, isEditorCanvas } = useEffectiveViewport();

  const resolvedAds = React.useMemo(() => {
    let list: VitrineClassifiedItem[] = [];
    if (dataSource === "store_classifieds") {
      const mapped = mapLiveClassifiedsToItems(liveClassifieds);
      list = mapped.length > 0 ? mapped : Array.isArray(items) ? items : [];
    } else {
      list = Array.isArray(items) ? items : [];
    }

    if (nicheFilter && nicheFilter !== "all") {
      list = list.filter((ad) => ad.niche === nicheFilter);
    }

    return list.slice(0, Math.max(1, maxItems));
  }, [dataSource, items, liveClassifieds, maxItems, nicheFilter]);

  const safeViewAllHref = isEditorCanvas ? undefined : resolveSafeLinkHref(viewAllHref);

  if (resolvedAds.length === 0) {
    return (
      <section className={cn("w-full py-4", className)} aria-label={sectionTitle}>
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 flex flex-col items-center justify-center text-center gap-2">
          <Tag className="size-8 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">
            Nenhum anúncio disponível nesta vitrine
          </p>
          <p className="text-xs text-muted-foreground max-w-md">
            Publique classificados ou configure itens destacados manualmente no inspetor.
          </p>
        </div>
      </section>
    );
  }

  const renderAdCard = (ad: VitrineClassifiedItem, idx: number) => {
    const safeHref = isEditorCanvas ? undefined : resolveSafeLinkHref(ad.href);
    const actionText = ad.ctaLabel || ctaLabel || "Ver Anúncio";
    const badgeLabel = ad.badge || (ad.niche ? NICHE_LABELS[ad.niche] : undefined);

    return (
      <div
        key={ad.id || idx}
        className="group rounded-lg border border-border/70 bg-card overflow-hidden flex flex-col justify-between h-full hover:border-primary/50 transition-colors duration-150 motion-reduce:transition-none"
      >
        <div>
          <div className="relative aspect-4-3 w-full overflow-hidden bg-muted/30">
            {ad.imageUrl ? (
              <img
                src={ad.imageUrl}
                alt={ad.imageAlt || ad.title}
                loading="lazy"
                className="size-full object-cover transition-transform duration-200 motion-reduce:transition-none group-hover:scale-105"
              />
            ) : (
              <div className="size-full flex items-center justify-center">
                <Tag className="size-10 text-muted-foreground/40" />
              </div>
            )}
            {badgeLabel && (
              <span className="absolute top-2 left-2 px-2 py-1 rounded-md bg-background/90 backdrop-blur-md text-foreground text-xs font-bold">
                {badgeLabel}
              </span>
            )}
          </div>

          <div className="p-4 space-y-2">
            <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-snug break-words text-wrap">
              {ad.title}
            </h3>

            {(typeof ad.priceCents === "number" && ad.priceCents > 0) || ad.priceLabel ? (
              <p className="text-base font-black font-mono text-primary">
                {ad.priceLabel || formatMoney(ad.priceCents || 0)}
              </p>
            ) : (
              <p className="text-xs font-semibold text-muted-foreground">Sob consulta</p>
            )}

            {/* Especificações sem truncamento forçado (Invariante B.38) */}
            {Array.isArray(ad.specs) && ad.specs.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {ad.specs.map((spec, sIdx) => (
                  <span
                    key={sIdx}
                    className="px-2 py-1 rounded-md bg-muted text-foreground text-xs font-medium break-words text-wrap leading-tight"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            )}

            {ad.location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                <MapPin className="size-3.5 shrink-0" />
                <span className="break-words text-wrap leading-tight">{ad.location}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 pt-0">
          {safeHref ? (
            <a
              href={safeHref}
              className="w-full h-11 min-h-11 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold inline-flex items-center justify-center gap-2 hover:opacity-95 transition-opacity duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>{actionText}</span>
              <ArrowRight className="size-4 shrink-0" />
            </a>
          ) : (
            <span className="w-full h-11 min-h-11 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold inline-flex items-center justify-center gap-2">
              <span>{actionText}</span>
              <ArrowRight className="size-4 shrink-0" />
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className={cn("w-full py-4 space-y-4", className)} aria-label={sectionTitle}>
      {(sectionTitle || sectionSubtitle || viewAllLabel) && (
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1 min-w-0">
            {sectionTitle && (
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground break-words">
                {sectionTitle}
              </h2>
            )}
            {sectionSubtitle && (
              <p className="text-xs sm:text-sm text-muted-foreground">{sectionSubtitle}</p>
            )}
          </div>
          {viewAllLabel && safeViewAllHref && (
            <a
              href={safeViewAllHref}
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 inline-flex items-center gap-1 shrink-0 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>{viewAllLabel}</span>
              <ChevronRight className="size-4" />
            </a>
          )}
        </div>
      )}

      {isMobile ? (
        mobileLayout === "grid_1col" ? (
          <div className="grid grid-cols-1 gap-4">
            {resolvedAds.map((ad, idx) => renderAdCard(ad, idx))}
          </div>
        ) : mobileLayout === "grid_2col" ? (
          <div className="grid grid-cols-2 gap-3">
            {resolvedAds.map((ad, idx) => renderAdCard(ad, idx))}
          </div>
        ) : (
          <div className="carousel flex flex-nowrap items-stretch gap-3 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory">
            {resolvedAds.map((ad, idx) => (
              <div key={ad.id || idx} className="w-64 shrink-0 snap-start">
                {renderAdCard(ad, idx)}
              </div>
            ))}
          </div>
        )
      ) : desktopLayout === "grid_3col" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {resolvedAds.map((ad, idx) => renderAdCard(ad, idx))}
        </div>
      ) : desktopLayout === "grid_4col" ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {resolvedAds.map((ad, idx) => renderAdCard(ad, idx))}
        </div>
      ) : (
        <div className="carousel flex flex-nowrap items-stretch gap-4 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory">
          {resolvedAds.map((ad, idx) => (
            <div key={ad.id || idx} className="w-72 shrink-0 snap-start">
              {renderAdCard(ad, idx)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
