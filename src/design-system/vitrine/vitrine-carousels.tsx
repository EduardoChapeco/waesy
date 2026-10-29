import * as React from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  Film,
  Play,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import {
  isVideoAssetUrl,
  resolveBidirectionalMedia,
  resolveSafeLinkHref,
  useEffectiveViewport,
} from "./viewport-context";

export type VitrineVerticalFormat =
  | "stories_9_16"
  | "vertical_4_5"
  | "flyer_3_4"
  | "stories_ring"
  | "curated_2x2";

export interface VitrineVerticalItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  priceCents?: number;
  ctaLabel?: string;
  href?: string;
  imageDesktopUrl?: string;
  imageMobileUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: "image" | "video";
  imageAlt?: string;
}

export interface VitrineVerticalCarouselProps {
  sectionTitle?: string;
  sectionSubtitle?: string;
  dataSource?: "manual" | "store_flyers";
  desktopFormat?: VitrineVerticalFormat;
  mobileFormat?: VitrineVerticalFormat;
  items?: VitrineVerticalItem[];
  liveFlyers?: Array<Record<string, unknown>>;
  className?: string;
}

function mapLiveFlyersToItems(
  liveFlyers?: Array<Record<string, unknown>>,
): VitrineVerticalItem[] {
  if (!Array.isArray(liveFlyers)) return [];
  return liveFlyers
    .map((raw, idx): VitrineVerticalItem | null => {
      const img =
        (typeof raw.image_url === "string" && raw.image_url) ||
        (typeof raw.flyer_url === "string" && raw.flyer_url) ||
        "";
      if (!img) return null;
      const title =
        (typeof raw.title === "string" && raw.title.trim()) || `Encarte ${idx + 1}`;
      const badge =
        (typeof raw.badge_text === "string" && raw.badge_text) ||
        (typeof raw.time_left_display === "string" && raw.time_left_display) ||
        "Encarte";
      return {
        id: typeof raw.id === "string" ? raw.id : `flyer-${idx}`,
        title,
        subtitle: typeof raw.subtitle === "string" ? raw.subtitle : "Toque para ampliar",
        badge,
        ctaLabel: "Abrir Folheto",
        imageDesktopUrl: img,
        imageMobileUrl: img,
        imageAlt: title,
      };
    })
    .filter((item): item is VitrineVerticalItem => item !== null);
}

export function VitrineVerticalCarousel({
  sectionTitle,
  sectionSubtitle,
  dataSource = "manual",
  desktopFormat = "stories_9_16",
  mobileFormat = "stories_9_16",
  items = [],
  liveFlyers,
  className,
}: VitrineVerticalCarouselProps) {
  const { isMobile, isEditorCanvas } = useEffectiveViewport();
  const [viewerIndex, setViewerIndex] = React.useState<number | null>(null);

  const resolvedItems = React.useMemo(() => {
    if (dataSource === "store_flyers") {
      const flyers = mapLiveFlyersToItems(liveFlyers);
      if (flyers.length > 0) return flyers;
    }
    return Array.isArray(items) ? items : [];
  }, [dataSource, items, liveFlyers]);

  if (resolvedItems.length === 0) {
    return (
      <section className={cn("w-full py-4", className)} aria-label={sectionTitle || "Carrossel vertical"}>
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 flex flex-col items-center justify-center text-center gap-2">
          <Film className="size-8 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">
            Nenhum item configurado no carrossel vertical
          </p>
          <p className="text-xs text-muted-foreground max-w-md">
            Adicione vídeos 9:16, stories, destaques 4:5 ou conecte os encartes ativos da loja.
          </p>
        </div>
      </section>
    );
  }

  const activeFormat: VitrineVerticalFormat = isMobile ? mobileFormat : desktopFormat;
  const activeModalItem = viewerIndex !== null ? resolvedItems[viewerIndex] : null;

  const getAspectClass = (fmt: VitrineVerticalFormat) => {
    if (fmt === "stories_9_16") return "aspect-post-moment";
    if (fmt === "flyer_3_4") return "aspect-post-portrait";
    return "aspect-post-vertical";
  };

  const renderMediaContent = (item: VitrineVerticalItem, autoPlayPreview = false) => {
    const mediaSrc = resolveBidirectionalMedia(
      {
        imageMobileUrl: item.imageMobileUrl,
        imageDesktopUrl: item.imageDesktopUrl,
        imageUrl: item.imageUrl,
      },
      isMobile,
    );
    const videoSrc =
      item.videoUrl?.trim() || (isVideoAssetUrl(mediaSrc, item.mediaType) ? mediaSrc : "");

    if (videoSrc) {
      return (
        <video
          src={videoSrc}
          muted
          loop
          playsInline
          autoPlay={autoPlayPreview}
          controls={!autoPlayPreview}
          className="size-full object-cover"
        />
      );
    }

    if (mediaSrc) {
      return (
        <img
          src={mediaSrc}
          alt={item.imageAlt || item.title}
          loading="lazy"
          className="size-full object-cover transition-transform duration-200 motion-reduce:transition-none group-hover:scale-105"
        />
      );
    }

    return (
      <div className="size-full flex flex-col items-center justify-center gap-2 bg-muted/50 p-4 text-center">
        <Film className="size-8 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">{item.title}</span>
      </div>
    );
  };

  return (
    <section
      className={cn("w-full py-4 space-y-3", className)}
      aria-label={sectionTitle || "Destaques verticais"}
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

      {/* MODO 1: STORIES RING (Anéis Circulares estilo Instagram / App Stories) */}
      {activeFormat === "stories_ring" && (
        <div className="carousel flex flex-nowrap items-start gap-4 overflow-x-auto no-scrollbar py-2 snap-x snap-mandatory">
          {resolvedItems.map((item, idx) => {
            const mediaSrc = resolveBidirectionalMedia(
              {
                imageMobileUrl: item.imageMobileUrl,
                imageDesktopUrl: item.imageDesktopUrl,
                imageUrl: item.imageUrl,
              },
              isMobile,
            );
            return (
              <button
                key={item.id || idx}
                type="button"
                onClick={() => {
                  if (!isEditorCanvas) setViewerIndex(idx);
                }}
                aria-label={`Abrir story ${item.title}`}
                className="group snap-start shrink-0 w-20 sm:w-24 min-h-11 flex flex-col items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-1"
              >
                <div className="size-16 sm:size-20 rounded-full p-1 border-2 border-primary bg-background">
                  <div className="size-full rounded-full overflow-hidden bg-muted flex items-center justify-center">
                    {mediaSrc ? (
                      <img
                        src={mediaSrc}
                        alt={item.imageAlt || item.title}
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    ) : (
                      <Play className="size-6 text-primary" />
                    )}
                  </div>
                </div>
                <span className="text-xs font-semibold text-foreground line-clamp-2 leading-tight text-center break-words">
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* MODO 2: CURATED 2X2 (Blocos Curados em Grade 2x2 estilo Vitrine Waesy) */}
      {activeFormat === "curated_2x2" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {resolvedItems.map((item, idx) => {
            const safeHref = isEditorCanvas ? undefined : resolveSafeLinkHref(item.href);
            const cardInner = (
              <div className="group rounded-lg border border-border/70 bg-card overflow-hidden flex flex-col justify-between h-full hover:border-primary/50 transition-colors duration-150 motion-reduce:transition-none">
                <div className="relative aspect-post-vertical w-full overflow-hidden bg-muted/30">
                  {renderMediaContent(item, true)}
                  {item.badge && (
                    <span className="absolute top-2 left-2 px-2 py-1 rounded-md bg-background/90 backdrop-blur-md text-xs font-bold text-foreground">
                      {item.badge}
                    </span>
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 leading-snug break-words">
                    {item.title}
                  </h3>
                  {typeof item.priceCents === "number" && item.priceCents > 0 && (
                    <p className="text-sm font-black font-mono text-primary">
                      {formatMoney(item.priceCents)}
                    </p>
                  )}
                </div>
              </div>
            );

            if (safeHref) {
              return (
                <a
                  key={item.id || idx}
                  href={safeHref}
                  className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {cardInner}
                </a>
              );
            }

            return (
              <button
                key={item.id || idx}
                type="button"
                onClick={() => {
                  if (!isEditorCanvas) setViewerIndex(idx);
                }}
                className="text-left rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {cardInner}
              </button>
            );
          })}
        </div>
      )}

      {/* MODO 3: TRILHO VERTICAL (9:16 Reels/Moments, 4:5 Retrato ou 3:4 Encartes) */}
      {activeFormat !== "stories_ring" && activeFormat !== "curated_2x2" && (
        <div className="carousel flex flex-nowrap gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory">
          {resolvedItems.map((item, idx) => {
            const safeHref = isEditorCanvas ? undefined : resolveSafeLinkHref(item.href);
            const aspectCls = getAspectClass(activeFormat);
            const hasVideo = Boolean(
              item.videoUrl || isVideoAssetUrl(item.imageDesktopUrl || item.imageUrl, item.mediaType),
            );

            const verticalCard = (
              <div className="group snap-start shrink-0 w-48 sm:w-56 rounded-lg border border-border/70 bg-card overflow-hidden flex flex-col justify-between hover:border-primary/50 transition-colors duration-150 motion-reduce:transition-none">
                <div className={cn("relative w-full overflow-hidden bg-muted/40", aspectCls)}>
                  {renderMediaContent(item, true)}

                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    {item.badge ? (
                      <span className="px-2 py-1 rounded-md bg-background/90 backdrop-blur-md text-xs font-bold text-foreground">
                        {item.badge}
                      </span>
                    ) : (
                      <span />
                    )}
                    {hasVideo && (
                      <span className="size-8 rounded-full bg-background/90 backdrop-blur-md text-foreground flex items-center justify-center">
                        <Play className="size-4" />
                      </span>
                    )}
                  </div>

                  <div className="absolute inset-x-2 bottom-2 rounded-lg bg-background/90 backdrop-blur-md border border-border/60 p-3 space-y-1">
                    <h3 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 leading-tight break-words">
                      {item.title}
                    </h3>
                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {item.subtitle}
                      </p>
                    )}
                    {typeof item.priceCents === "number" && item.priceCents > 0 && (
                      <p className="text-xs font-black font-mono text-primary">
                        {formatMoney(item.priceCents)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-2 border-t border-border/50">
                  <span className="w-full h-11 min-h-11 px-3 rounded-lg bg-muted/70 group-hover:bg-primary group-hover:text-primary-foreground text-foreground text-xs font-bold inline-flex items-center justify-between gap-2 transition-colors duration-150 motion-reduce:transition-none">
                    <span className="truncate">{item.ctaLabel || "Ver Destaque"}</span>
                    {safeHref ? (
                      <ArrowRight className="size-4 shrink-0" />
                    ) : (
                      <Eye className="size-4 shrink-0" />
                    )}
                  </span>
                </div>
              </div>
            );

            if (safeHref) {
              return (
                <a
                  key={item.id || idx}
                  href={safeHref}
                  aria-label={item.title}
                  className="block shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {verticalCard}
                </a>
              );
            }

            return (
              <button
                key={item.id || idx}
                type="button"
                onClick={() => {
                  if (!isEditorCanvas) setViewerIndex(idx);
                }}
                aria-label={item.title}
                className="text-left shrink-0 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {verticalCard}
              </button>
            );
          })}
        </div>
      )}

      {/* MODAL INTERATIVO DE VISUALIZAÇÃO (Stories / Reels / Encartes) */}
      <Dialog
        open={viewerIndex !== null}
        onOpenChange={(open) => {
          if (!open) setViewerIndex(null);
        }}
      >
        <DialogContent className="sm:max-w-md p-4 pt-safe-modal rounded-lg">
          {activeModalItem && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-foreground">
                  {activeModalItem.title}
                </DialogTitle>
                {activeModalItem.subtitle && (
                  <DialogDescription className="text-xs text-muted-foreground">
                    {activeModalItem.subtitle}
                  </DialogDescription>
                )}
              </DialogHeader>

              <div className="relative w-full aspect-post-vertical rounded-lg overflow-hidden bg-muted border border-border/60">
                {renderMediaContent(activeModalItem, false)}
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={resolvedItems.length <= 1}
                    onClick={() =>
                      setViewerIndex((prev) =>
                        prev === null
                          ? 0
                          : (prev - 1 + resolvedItems.length) % resolvedItems.length,
                      )
                    }
                    aria-label="Anterior"
                    className="size-11 min-h-11 rounded-lg border border-border bg-card text-foreground inline-flex items-center justify-center cursor-pointer disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    disabled={resolvedItems.length <= 1}
                    onClick={() =>
                      setViewerIndex((prev) =>
                        prev === null ? 0 : (prev + 1) % resolvedItems.length,
                      )
                    }
                    aria-label="Próximo"
                    className="size-11 min-h-11 rounded-lg border border-border bg-card text-foreground inline-flex items-center justify-center cursor-pointer disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>

                {resolveSafeLinkHref(activeModalItem.href) && (
                  <a
                    href={resolveSafeLinkHref(activeModalItem.href)}
                    className="h-11 min-h-11 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span>{activeModalItem.ctaLabel || "Acessar"}</span>
                    <ArrowRight className="size-4" />
                  </a>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
