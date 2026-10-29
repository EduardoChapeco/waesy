import * as React from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Image as ImageIcon,
  LayoutGrid,
  Sparkles,
  Ticket,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isVideoAssetUrl,
  resolveBidirectionalMedia,
  resolveSafeLinkHref,
  useEffectiveViewport,
} from "./viewport-context";

export type VitrineBannerAspectRatio =
  | "slim"
  | "ultrawide"
  | "hero"
  | "ifood"
  | "cinema"
  | "duo"
  | "classic"
  | "square"
  | "vertical"
  | "moment";

export interface VitrineBannerSlideItem {
  id: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  ctaLabel?: string;
  href?: string;
  imageDesktopUrl?: string;
  imageMobileUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: "image" | "video";
  imageAlt?: string;
  showOverlay?: boolean;
}

export interface VitrineMetamorphicBannerProps {
  sectionTitle?: string;
  sectionSubtitle?: string;
  dataSource?: "manual" | "store_banners";
  desktopAspectRatio?: VitrineBannerAspectRatio;
  mobileAspectRatio?: VitrineBannerAspectRatio;
  autoPlay?: boolean;
  intervalSeconds?: number;
  showArrows?: boolean;
  showDots?: boolean;
  rounded?: "none" | "md" | "lg";
  slides?: VitrineBannerSlideItem[];
  liveBanners?: Array<Record<string, unknown>>;
  className?: string;
}

const ASPECT_CLASS_MAP: Record<VitrineBannerAspectRatio, string> = {
  slim: "aspect-banner-slim",
  ultrawide: "aspect-banner-ultrawide",
  hero: "aspect-banner-hero",
  ifood: "aspect-banner-hero",
  cinema: "aspect-banner-cinema",
  duo: "aspect-banner-cinema",
  classic: "aspect-banner-classic",
  square: "aspect-banner-square",
  vertical: "aspect-post-vertical",
  moment: "aspect-post-moment",
};

function mapLiveBannersToSlides(liveBanners?: Array<Record<string, unknown>>): VitrineBannerSlideItem[] {
  if (!Array.isArray(liveBanners)) return [];
  return liveBanners
    .map((raw, idx): VitrineBannerSlideItem | null => {
      const desktop =
        (typeof raw.image_desktop_url === "string" && raw.image_desktop_url) ||
        (typeof raw.desktop_image_url === "string" && raw.desktop_image_url) ||
        (typeof raw.image_url === "string" && raw.image_url) ||
        (typeof raw.imageUrl === "string" && raw.imageUrl) ||
        "";
      const mobile =
        (typeof raw.image_mobile_url === "string" && raw.image_mobile_url) ||
        (typeof raw.mobile_image_url === "string" && raw.mobile_image_url) ||
        desktop;
      const videoUrl =
        (typeof raw.video_url === "string" && raw.video_url) ||
        (raw.media_type === "video" ? desktop : "");
      if (!desktop && !mobile && !videoUrl) return null;
      const title = typeof raw.title === "string" ? raw.title : "";
      const subtitle = typeof raw.subtitle === "string" ? raw.subtitle : "";
      const badge = typeof raw.badge_text === "string" ? raw.badge_text : typeof raw.badge === "string" ? raw.badge : "";
      const href =
        (typeof raw.target_url === "string" && raw.target_url) ||
        (typeof raw.link_url === "string" && raw.link_url) ||
        (typeof raw.href === "string" && raw.href) ||
        "";
      return {
        id: typeof raw.id === "string" ? raw.id : `live-banner-${idx}`,
        title,
        subtitle,
        badge,
        ctaLabel: typeof raw.cta_label === "string" ? raw.cta_label : "",
        href,
        imageDesktopUrl: desktop,
        imageMobileUrl: mobile,
        videoUrl: videoUrl || undefined,
        mediaType: raw.media_type === "video" ? "video" : "image",
        imageAlt: title || "Banner promocional",
        showOverlay: Boolean(title || subtitle || badge),
      };
    })
    .filter((item): item is VitrineBannerSlideItem => item !== null);
}

export function VitrineMetamorphicBanner({
  sectionTitle,
  sectionSubtitle,
  dataSource = "manual",
  desktopAspectRatio = "slim",
  mobileAspectRatio = "cinema",
  autoPlay = true,
  intervalSeconds = 5,
  showArrows = true,
  showDots = true,
  rounded = "lg",
  slides = [],
  liveBanners,
  className,
}: VitrineMetamorphicBannerProps) {
  const { isMobile, isEditorCanvas } = useEffectiveViewport();
  const [activeIndex, setActiveIndex] = React.useState(0);

  const resolvedSlides = React.useMemo(() => {
    if (dataSource === "store_banners") {
      const fromStore = mapLiveBannersToSlides(liveBanners);
      if (fromStore.length > 0) return fromStore;
    }
    return Array.isArray(slides) ? slides : [];
  }, [dataSource, liveBanners, slides]);

  const count = resolvedSlides.length;

  React.useEffect(() => {
    if (activeIndex >= count && count > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, count]);

  React.useEffect(() => {
    if (!autoPlay || count <= 1 || isEditorCanvas) return;
    const ms = Math.max(3, intervalSeconds) * 1000;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % count);
    }, ms);
    return () => window.clearInterval(timer);
  }, [autoPlay, count, intervalSeconds, isEditorCanvas]);

  const effectiveAspect: VitrineBannerAspectRatio = isMobile
    ? mobileAspectRatio
    : desktopAspectRatio;
  const aspectClass = ASPECT_CLASS_MAP[effectiveAspect] || "aspect-banner-cinema";
  const radiusClass =
    rounded === "none" ? "rounded-none" : rounded === "md" ? "rounded-md" : "rounded-lg";

  if (count === 0) {
    return (
      <section className={cn("w-full py-4", className)} aria-label={sectionTitle || "Banner"}>
        <div
          className={cn(
            "w-full border border-dashed border-border bg-muted/30 p-8 flex flex-col items-center justify-center text-center gap-2",
            radiusClass,
          )}
        >
          <ImageIcon className="size-8 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">
            Nenhum banner configurado nesta seção
          </p>
          <p className="text-xs text-muted-foreground max-w-md">
            Adicione imagens separadas para mobile e desktop ou conecte os banners ativos da vitrine.
          </p>
        </div>
      </section>
    );
  }

  const isDuoDesktop = !isMobile && desktopAspectRatio === "duo" && count >= 2;

  const renderSlideCard = (slide: VitrineBannerSlideItem, idx: number) => {
    const mediaSrc = resolveBidirectionalMedia(
      {
        imageMobileUrl: slide.imageMobileUrl,
        imageDesktopUrl: slide.imageDesktopUrl,
        imageUrl: slide.imageUrl,
      },
      isMobile,
    );
    const videoSrc = slide.videoUrl?.trim() || (isVideoAssetUrl(mediaSrc, slide.mediaType) ? mediaSrc : "");
    const safeHref = isEditorCanvas ? undefined : resolveSafeLinkHref(slide.href);
    const hasEditorialText = Boolean(
      (slide.showOverlay ?? true) &&
        (slide.title || slide.subtitle || slide.badge || slide.ctaLabel),
    );

    const innerContent = (
      <div
        className={cn(
          "relative w-full overflow-hidden bg-muted/40 border border-border/60",
          aspectClass,
          radiusClass,
        )}
      >
        {videoSrc ? (
          <video
            src={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            className="size-full object-cover"
          />
        ) : mediaSrc ? (
          <img
            src={mediaSrc}
            alt={slide.imageAlt || slide.title || `Slide ${idx + 1}`}
            loading={idx === 0 ? "eager" : "lazy"}
            className="size-full object-cover transition-transform duration-200 motion-reduce:transition-none group-hover:scale-105"
          />
        ) : (
          <div className="size-full flex items-center justify-center bg-muted/50 p-6">
            {!hasEditorialText && (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageIcon className="size-8" />
                <span className="text-xs font-medium">Mídia não enviada</span>
              </div>
            )}
          </div>
        )}

        {hasEditorialText && (
          <div className="absolute inset-x-3 bottom-3 sm:inset-x-6 sm:bottom-6 flex items-end justify-between gap-4 pointer-events-none">
            <div className="max-w-xl rounded-lg bg-background/90 backdrop-blur-md border border-border/70 p-4 space-y-2 pointer-events-auto">
              {slide.badge && (
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                  {slide.badge}
                </span>
              )}
              {slide.title && (
                <h3 className="text-base sm:text-xl font-black tracking-tight text-foreground leading-tight break-words text-wrap">
                  {slide.title}
                </h3>
              )}
              {slide.subtitle && (
                <p className="text-xs sm:text-sm text-muted-foreground leading-snug line-clamp-2 break-words">
                  {slide.subtitle}
                </p>
              )}
              {slide.ctaLabel && (
                <div className="pt-1">
                  <span className="inline-flex items-center justify-center gap-2 h-11 min-h-11 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                    <span>{slide.ctaLabel}</span>
                    <ArrowRight className="size-4 shrink-0" />
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );

    if (safeHref) {
      return (
        <a
          key={slide.id || idx}
          href={safeHref}
          aria-label={slide.title || slide.imageAlt || `Abrir banner ${idx + 1}`}
          className={cn(
            "group block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            radiusClass,
          )}
        >
          {innerContent}
        </a>
      );
    }

    return (
      <div key={slide.id || idx} className="group w-full">
        {innerContent}
      </div>
    );
  };

  return (
    <section
      className={cn("w-full py-4 space-y-3", className)}
      aria-label={sectionTitle || "Destaques em banner"}
    >
      {(sectionTitle || sectionSubtitle) && (
        <div className="space-y-1">
          {sectionTitle && (
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground break-words">
              {sectionTitle}
            </h2>
          )}
          {sectionSubtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground">{sectionSubtitle}</p>
          )}
        </div>
      )}

      {isDuoDesktop ? (
        <div className="grid grid-cols-2 gap-4">
          {resolvedSlides.slice(0, 2).map((slide, idx) => renderSlideCard(slide, idx))}
        </div>
      ) : (
        <div className="relative w-full">
          {renderSlideCard(resolvedSlides[activeIndex] || resolvedSlides[0], activeIndex)}

          {showArrows && count > 1 && (
            <>
              <button
                type="button"
                onClick={() => setActiveIndex((prev) => (prev - 1 + count) % count)}
                aria-label="Banner anterior"
                className="absolute left-3 top-1/2 -translate-y-1/2 size-11 min-h-11 rounded-full bg-background/90 backdrop-blur-md border border-border/70 text-foreground flex items-center justify-center cursor-pointer hover:bg-background transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveIndex((prev) => (prev + 1) % count)}
                aria-label="Próximo banner"
                className="absolute right-3 top-1/2 -translate-y-1/2 size-11 min-h-11 rounded-full bg-background/90 backdrop-blur-md border border-border/70 text-foreground flex items-center justify-center cursor-pointer hover:bg-background transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}

          {showDots && count > 1 && (
            <div className="flex items-center justify-center gap-1 pt-2">
              {resolvedSlides.map((slide, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={slide.id || idx}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    aria-label={`Ir para slide ${idx + 1}`}
                    aria-current={isActive ? "true" : undefined}
                    className="h-11 min-h-11 px-2 inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                  >
                    <span
                      className={cn(
                        "h-2 rounded-full transition-colors duration-150 motion-reduce:transition-none",
                        isActive ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ============================================================================
 * 2. VitrineBentoTetris — Grade Assimétrica Densa estilo App / Bento Grid (B.32 / B.45)
 * ============================================================================ */

export interface VitrineBentoTileItem {
  id: string;
  tag?: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  href?: string;
  imageDesktopUrl?: string;
  imageMobileUrl?: string;
  imageUrl?: string;
  imageAlt?: string;
  spanX?: 1 | 2 | 3 | 4;
  spanY?: 1 | 2;
  mobileSpanX?: 1 | 2;
}

export interface VitrineBentoTetrisProps {
  sectionTitle?: string;
  sectionSubtitle?: string;
  desktopColumns?: 2 | 3 | 4;
  mobileColumns?: 1 | 2;
  tiles?: VitrineBentoTileItem[];
  className?: string;
}

export function VitrineBentoTetris({
  sectionTitle,
  sectionSubtitle,
  desktopColumns = 4,
  mobileColumns = 2,
  tiles = [],
  className,
}: VitrineBentoTetrisProps) {
  const { isMobile, isEditorCanvas } = useEffectiveViewport();

  if (!tiles || tiles.length === 0) {
    return (
      <section className={cn("w-full py-4", className)} aria-label={sectionTitle || "Grade Bento"}>
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 flex flex-col items-center justify-center text-center gap-2">
          <LayoutGrid className="size-8 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">
            Nenhum card configurado no mosaico Bento
          </p>
        </div>
      </section>
    );
  }

  // Invariante B.45: Fechamento de retângulo denso para exatamente 3 itens
  const isThreeTileHero = !isMobile && tiles.length === 3;

  const gridColsClass = isMobile
    ? mobileColumns === 1
      ? "grid-cols-1"
      : "grid-cols-2"
    : isThreeTileHero
      ? "grid-cols-2 sm:grid-cols-3"
      : desktopColumns === 2
        ? "grid-cols-2"
        : desktopColumns === 3
          ? "grid-cols-2 sm:grid-cols-3"
          : "grid-cols-2 sm:grid-cols-4";

  return (
    <section
      className={cn("w-full py-4 space-y-4", className)}
      aria-label={sectionTitle || "Mosaico de destaques"}
    >
      {(sectionTitle || sectionSubtitle) && (
        <div className="space-y-1">
          {sectionTitle && (
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground break-words">
              {sectionTitle}
            </h2>
          )}
          {sectionSubtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground">{sectionSubtitle}</p>
          )}
        </div>
      )}

      <div className={cn("grid grid-flow-dense gap-3 sm:gap-4", gridColsClass)}>
        {tiles.map((tile, idx) => {
          const mediaSrc = resolveBidirectionalMedia(
            {
              imageMobileUrl: tile.imageMobileUrl,
              imageDesktopUrl: tile.imageDesktopUrl,
              imageUrl: tile.imageUrl,
            },
            isMobile,
          );
          const safeHref = isEditorCanvas ? undefined : resolveSafeLinkHref(tile.href);

          let spanClass = "col-span-1 row-span-1";
          if (isMobile) {
            spanClass =
              mobileColumns === 2 && (tile.mobileSpanX === 2 || (idx === 0 && tiles.length === 3))
                ? "col-span-2"
                : "col-span-1";
          } else if (isThreeTileHero) {
            spanClass = idx === 0 ? "col-span-2 row-span-2 min-h-72" : "col-span-1 row-span-1 min-h-36";
          } else {
            const x = tile.spanX ?? 1;
            const y = tile.spanY ?? 1;
            const colMap: Record<number, string> = {
              1: "col-span-1",
              2: "col-span-2",
              3: "col-span-3",
              4: "col-span-4",
            };
            spanClass = `${colMap[Math.min(x, desktopColumns)] || "col-span-1"} ${
              y === 2 ? "row-span-2 min-h-72" : "row-span-1 min-h-40"
            }`;
          }

          const cardBody = (
            <div
              className={cn(
                "group relative size-full rounded-lg border border-border/70 bg-card overflow-hidden flex flex-col justify-between transition-colors duration-150 motion-reduce:transition-none hover:border-primary/50",
                !mediaSrc && "p-4 sm:p-5",
              )}
            >
              {mediaSrc ? (
                <div className="relative size-full min-h-40 flex-1 overflow-hidden bg-muted/30">
                  <img
                    src={mediaSrc}
                    alt={tile.imageAlt || tile.title}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-200 motion-reduce:transition-none group-hover:scale-105"
                  />
                  <div className="absolute inset-x-3 bottom-3 rounded-lg bg-background/90 backdrop-blur-md border border-border/60 p-3 space-y-1">
                    {tile.tag && (
                      <span className="inline-block text-xs font-bold uppercase tracking-wider text-primary">
                        {tile.tag}
                      </span>
                    )}
                    <h3 className="text-sm sm:text-base font-bold text-foreground leading-tight break-words text-wrap">
                      {tile.title}
                    </h3>
                    {tile.subtitle && (
                      <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                        {tile.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {tile.tag && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                        {tile.tag}
                      </span>
                    )}
                    <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug break-words text-wrap">
                      {tile.title}
                    </h3>
                    {tile.subtitle && (
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words">
                        {tile.subtitle}
                      </p>
                    )}
                  </div>
                  {tile.ctaLabel && (
                    <div className="pt-4">
                      <span className="inline-flex items-center gap-2 h-11 min-h-11 px-4 rounded-lg bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground text-xs font-bold transition-colors duration-150 motion-reduce:transition-none">
                        <span>{tile.ctaLabel}</span>
                        <ArrowRight className="size-4 shrink-0" />
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          );

          if (safeHref) {
            return (
              <a
                key={tile.id || idx}
                href={safeHref}
                aria-label={tile.title}
                className={cn(
                  spanClass,
                  "block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                {cardBody}
              </a>
            );
          }

          return (
            <div key={tile.id || idx} className={spanClass}>
              {cardBody}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ============================================================================
 * 3. VitrineCouponStrip — Faixa de Cupom Copiável & Callout Slim (Estilo App / iFood)
 * ============================================================================ */

export interface VitrineCouponStripProps {
  variant?: "coupon" | "slim_strip" | "highlight_bar";
  badge?: string;
  title: string;
  subtitle?: string;
  couponCode?: string;
  ctaLabel?: string;
  href?: string;
  dismissible?: boolean;
  className?: string;
}

export function VitrineCouponStrip({
  variant = "coupon",
  badge = "Benefício",
  title,
  subtitle,
  couponCode,
  ctaLabel,
  href,
  dismissible = false,
  className,
}: VitrineCouponStripProps) {
  const { isEditorCanvas } = useEffectiveViewport();
  const [dismissed, setDismissed] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  if (dismissed && !isEditorCanvas) return null;

  const safeHref = isEditorCanvas ? undefined : resolveSafeLinkHref(href);

  const handleCopyCoupon = () => {
    if (!couponCode) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(couponCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className={cn("w-full py-2", className)} aria-label={title || "Faixa promocional"}>
      <div
        className={cn(
          "w-full rounded-lg border p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3",
          variant === "highlight_bar"
            ? "bg-primary/10 border-primary/30"
            : variant === "coupon"
              ? "bg-card border-dashed border-primary/40"
              : "bg-muted/50 border-border/70",
        )}
      >
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {variant === "coupon" ? <Ticket className="size-5" /> : <Sparkles className="size-5" />}
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {badge && (
                <span className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider">
                  {badge}
                </span>
              )}
              <h3 className="text-sm sm:text-base font-bold text-foreground leading-tight break-words">
                {title || "Oferta ativa na vitrine"}
              </h3>
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground leading-snug break-words">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {couponCode && (
            <button
              type="button"
              onClick={handleCopyCoupon}
              className="h-11 min-h-11 px-4 rounded-lg border border-dashed border-primary/50 bg-background text-foreground font-mono text-xs font-bold inline-flex items-center gap-2 cursor-pointer hover:border-primary transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>{couponCode}</span>
              {copied ? (
                <Check className="size-4 text-primary shrink-0" />
              ) : (
                <Copy className="size-4 text-muted-foreground shrink-0" />
              )}
            </button>
          )}

          {ctaLabel && safeHref && (
            <a
              href={safeHref}
              className="h-11 min-h-11 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold inline-flex items-center justify-center gap-2 hover:opacity-95 transition-opacity duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>{ctaLabel}</span>
              <ArrowRight className="size-4 shrink-0" />
            </a>
          )}

          {ctaLabel && !safeHref && isEditorCanvas && (
            <span className="h-11 min-h-11 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold inline-flex items-center justify-center gap-2">
              <span>{ctaLabel}</span>
              <ArrowRight className="size-4 shrink-0" />
            </span>
          )}

          {dismissible && (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Ocultar aviso"
              className="size-11 min-h-11 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center justify-center cursor-pointer transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
