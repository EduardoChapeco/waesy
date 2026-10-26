import * as React from "react";
import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Maximize2 } from "lucide-react";
import { MediaLightboxModal } from "@/components/community/media-lightbox-modal";
import type { MuralFeedItem } from "@/services/social.functions";

interface MediaCarouselProps {
  mediaUrls: string[];
  post?: MuralFeedItem;
  aspectRatio?: "4/5" | "square" | "16/9";
  className?: string;
  onMediaClick?: (index: number) => void;
}

function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".mov") ||
    clean.endsWith(".quicktime") ||
    clean.endsWith(".m4v") ||
    clean.includes("video")
  );
}

export function MediaCarousel({
  mediaUrls,
  post,
  aspectRatio = "4/5",
  className = "",
  onMediaClick,
}: MediaCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [selectedLightboxIndex, setSelectedLightboxIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (!mediaUrls || mediaUrls.length === 0) return null;

  const aspectClass =
    aspectRatio === "square"
      ? "aspect-square"
      : aspectRatio === "16/9"
      ? "aspect-[16/9]"
      : "aspect-[4/5]";

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const itemWidth = el.clientWidth;
    if (itemWidth > 0) {
      const newIndex = Math.round(scrollLeft / itemWidth);
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < mediaUrls.length) {
        setActiveIndex(newIndex);
      }
    }
  };

  const scrollToSlide = (index: number) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const targetLeft = index * el.clientWidth;
    el.scrollTo({ left: targetLeft, behavior: "smooth" });
    setActiveIndex(index);
  };

  const handleOpenLightbox = (index: number) => {
    if (onMediaClick) {
      onMediaClick(index);
      return;
    }
    setSelectedLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  return (
    <div className={`relative w-full group overflow-hidden rounded-2xl border border-border/40 bg-muted/20 ${className}`}>
      {/* ─── Track Horizontal com Snap Scroll Tátil ─────────────────────── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex w-full overflow-x-auto snap-x snap-mandatory no-scrollbar touch-pan-x"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {mediaUrls.map((url, idx) => {
          const isVideo = isVideoUrl(url);
          return (
            <button
              key={`${url}-${idx}`}
              type="button"
              className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-w-full w-full shrink-0 snap-center relative ${aspectClass} bg-muted/40 flex items-center justify-center cursor-pointer select-none border-0 p-0`}
              onClick={() => handleOpenLightbox(idx)}
              aria-label={`Visualizar mídia ${idx + 1}`}
            >
              {isVideo ? (
                <div className="relative w-full h-full flex items-center justify-center bg-foreground/80">
                  <video
                    src={url}
                    className="w-full h-full object-cover pointer-events-none"
                    playsInline
                    muted
                    loop
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-foreground/20 group-hover:bg-foreground/30 transition-colors pointer-events-none">
                    <div className="size-12 rounded-full bg-background/80 backdrop-blur-md flex items-center justify-center text-foreground shadow-md">
                      <Play className="size-6 ml-1 fill-foreground" />
                    </div>
                  </div>
                </div>
              ) : (
                <img
                  src={url}
                  alt={`Mídia ${idx + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01] pointer-events-none"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              )}

              {/* Botão sutil de expandir para fullscreen */}
              <div
                className="absolute top-3 right-3 size-11 min-h-11 min-w-11 rounded-full bg-background/70 backdrop-blur-md text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs pointer-events-none"
                aria-hidden="true"
              >
                <Maximize2 className="size-4" />
              </div>
            </button>
          );
        })}
      </div>

      {/* ─── Controles Desktop de Próximo / Anterior (Piso 44px) ─────────── */}
      {mediaUrls.length > 1 && (
        <>
          {activeIndex > 0 && (
            <button
              type="button"
              className="focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary absolute left-2 top-1/2 -translate-y-1/2 size-11 min-h-11 min-w-11 rounded-full bg-background/80 backdrop-blur-md text-foreground flex items-center justify-center opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-md cursor-pointer z-10"
              onClick={() => scrollToSlide(activeIndex - 1)}
              aria-label="Foto anterior"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}

          {activeIndex < mediaUrls.length - 1 && (
            <button
              type="button"
              className="focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary absolute right-2 top-1/2 -translate-y-1/2 size-11 min-h-11 min-w-11 rounded-full bg-background/80 backdrop-blur-md text-foreground flex items-center justify-center opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-md cursor-pointer z-10"
              onClick={() => scrollToSlide(activeIndex + 1)}
              aria-label="Próxima foto"
            >
              <ChevronRight className="size-5" />
            </button>
          )}

          {/* ─── Indicador de Pontos Estilo Threads / Apple ────────────── */}
          <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-2 pointer-events-none z-10">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-background/70 backdrop-blur-md border border-border/40 shadow-2xs">
              {mediaUrls.map((_, dotIdx) => {
                const isActive = dotIdx === activeIndex;
                return (
                  <button
                    key={dotIdx}
                    type="button"
                    className={`focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary h-1.5 transition-colors duration-200 duration-300 rounded-full pointer-events-auto cursor-pointer ${
                      isActive ? "w-4 bg-foreground" : "w-1.5 bg-foreground/30 hover:bg-foreground/50"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollToSlide(dotIdx);
                    }}
                    aria-label={`Ir para slide ${dotIdx + 1}`}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ─── Modal Lightbox Integrado ───────────────────────────────────── */}
      {isLightboxOpen && (
        <MediaLightboxModal
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          post={post}
          mediaUrls={mediaUrls}
          initialIndex={selectedLightboxIndex}
        />
      )}
    </div>
  );
}
