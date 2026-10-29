import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  type HomeSectionItemDTO,
  type HomeAspectRatio,
  isHealthyImageUrl,
} from "@/services/admin-home-cms.functions";

export interface MetamorphicBannerSliderProps {
  items: HomeSectionItemDTO[];
  aspectRatio?: HomeAspectRatio;
  autoPlayIntervalMs?: number;
  columnsDesktop?: 1 | 2;
  className?: string;
}

export function MetamorphicBannerSlider({
  items,
  aspectRatio = "16:9",
  autoPlayIntervalMs = 6000,
  columnsDesktop = 1,
  className,
}: MetamorphicBannerSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isInteractingRef = useRef(false);

  // Invariante de Omissão Estrita: Apenas banners com imagem válida são exibidos
  const activeItems = (items || []).filter(
    (item) =>
      item.is_active !== false &&
      isHealthyImageUrl(item.image_desktop_url || item.image_mobile_url || item.image_url),
  );
  const total = activeItems.length;
  const useTwoColsDesktop = columnsDesktop === 2 && total >= 2;

  // Mapeamento canônico de aspect ratio com suporte a slider fino desktop (28:9) e anti-jank mobile
  const aspectClass = React.useMemo(() => {
    switch (aspectRatio) {
      case "slim_desktop":
        return "aspect-banner-cinema md:aspect-banner-slim md:max-h-72 lg:max-h-80";
      case "16:9":
        return "aspect-banner-cinema md:aspect-banner-slim md:max-h-72 lg:max-h-80";
      case "ifood":
        return "aspect-banner-hero md:aspect-banner-slim md:max-h-72 lg:max-h-80";
      case "4:3":
        return "aspect-banner-classic";
      case "1:1":
        return "aspect-banner-square";
      case "4:5":
        return "aspect-post-vertical";
      case "9:16":
        return "aspect-post-moment";
      default:
        return "aspect-banner-cinema md:aspect-banner-slim md:max-h-72 lg:max-h-80";
    }
  }, [aspectRatio]);

  const scrollToSlide = useCallback(
    (index: number) => {
      if (!sliderRef.current) return;
      const targetIndex = (index + total) % total;
      const targetElement = sliderRef.current.children[targetIndex] as HTMLElement;
      if (targetElement) {
        sliderRef.current.scrollTo({
          left: targetElement.offsetLeft,
          behavior: "smooth",
        });
        setCurrentIndex(targetIndex);
      }
    },
    [total],
  );

  const handleNext = useCallback(() => {
    scrollToSlide(currentIndex + 1);
  }, [currentIndex, scrollToSlide]);

  const handlePrev = useCallback(() => {
    scrollToSlide(currentIndex - 1);
  }, [currentIndex, scrollToSlide]);

  // Autoplay suave quando não houver interação manual
  useEffect(() => {
    if (total <= 1 || autoPlayIntervalMs <= 0) return;
    const interval = setInterval(() => {
      if (!isInteractingRef.current) {
        scrollToSlide(currentIndex + 1);
      }
    }, autoPlayIntervalMs);

    return () => clearInterval(interval);
  }, [currentIndex, total, autoPlayIntervalMs, scrollToSlide]);

  // Sincroniza indicador de slide com scroll tátil
  const handleScroll = () => {
    if (!sliderRef.current) return;
    const scrollLeft = sliderRef.current.scrollLeft;
    const width = sliderRef.current.clientWidth;
    if (width > 0) {
      const newIdx = Math.round(scrollLeft / width);
      if (newIdx >= 0 && newIdx < total && newIdx !== currentIndex) {
        setCurrentIndex(newIdx);
      }
    }
  };

  if (total === 0) return null;

  return (
    <div
      className={cn("group relative w-full select-none", className)}
      onMouseEnter={() => {
        isInteractingRef.current = true;
      }}
      onMouseLeave={() => {
        isInteractingRef.current = false;
      }}
      onTouchStart={() => {
        isInteractingRef.current = true;
      }}
      onTouchEnd={() => {
        setTimeout(() => {
          isInteractingRef.current = false;
        }, 1000);
      }}
    >
      {/* ── Trilho Deslizante com Snap Scroll e Proporção Rígida (CLS = 0) ── */}
      <div
        ref={sliderRef}
        onScroll={handleScroll}
        className={cn(
          "carousel w-full flex overflow-x-auto snap-x mandatory no-scrollbar rounded-lg focus:outline-none",
          useTwoColsDesktop && "md:gap-4"
        )}
        tabIndex={0}
        role="region"
        aria-label="Carrossel de Banners"
      >
        {activeItems.map((item, idx) => (
          <div
            key={item.id || idx}
            className={cn(
              "w-full shrink-0 snap-start relative overflow-hidden rounded-lg bg-muted/40",
              useTwoColsDesktop && "md:w-1/2",
              aspectClass,
            )}
          >
            <Link
              to={item.target_url as any}
              className="block size-full relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={item.title || "Banner promocional"}
            >
              <picture className="size-full block">
                {item.image_mobile_url && (
                  <source media="(max-width: 767px)" srcSet={item.image_mobile_url} />
                )}
                {item.image_desktop_url && (
                  <source media="(min-width: 768px)" srcSet={item.image_desktop_url} />
                )}
                <img
                  src={item.image_desktop_url || item.image_url || undefined}
                  alt={item.title || ""}
                  loading={idx === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="size-full object-cover object-center transition-transform duration-300 group-hover:scale-101 motion-reduce:transition-none rounded-lg"
                />
              </picture>
            </Link>
          </div>
        ))}
      </div>

      {/* ── Controles de Navegação Desktop (Piso 44px) ── */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Banner anterior"
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 size-11 items-center justify-center rounded-lg bg-background/85 hover:bg-background border border-border/80 text-foreground transition-transform active:scale-95 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <CaretLeft size={20} weight="bold" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Próximo banner"
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 size-11 items-center justify-center rounded-lg bg-background/85 hover:bg-background border border-border/80 text-foreground transition-transform active:scale-95 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <CaretRight size={20} weight="bold" />
          </button>

          {/* ── Indicador de Paginação Discreto (Dots) ── */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 border border-border/60 pointer-events-none">
            {activeItems.map((_, dotIdx) => (
              <span
                key={dotIdx}
                className={cn(
                  "size-2 rounded-full transition-transform duration-200",
                  dotIdx === currentIndex ? "w-4 bg-primary" : "bg-muted-foreground/40",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
