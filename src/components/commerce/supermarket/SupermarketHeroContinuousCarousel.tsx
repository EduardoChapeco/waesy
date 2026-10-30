import React, { useRef, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export interface SupermarketBannerItem {
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  targetUrl?: string;
  badge?: string;
}

interface SupermarketHeroContinuousCarouselProps {
  banners: SupermarketBannerItem[];
  autoPlayIntervalMs?: number;
  className?: string;
}

export function SupermarketHeroContinuousCarousel({
  banners,
  autoPlayIntervalMs = 4000,
  className,
}: SupermarketHeroContinuousCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Filtrar banners válidos
  const validBanners = banners.filter((b) => Boolean(b.imageUrl));

  // Efeito de auto-scroll contínuo estilo stories/instagram
  useEffect(() => {
    if (validBanners.length <= 1) return;

    const interval = setInterval(() => {
      if (!scrollRef.current) return;
      const nextIdx = (activeIndex + 1) % validBanners.length;
      const child = scrollRef.current.children[nextIdx] as HTMLElement;
      if (child) {
        scrollRef.current.scrollTo({
          left: child.offsetLeft,
          behavior: "smooth",
        });
        setActiveIndex(nextIdx);
      }
    }, autoPlayIntervalMs);

    return () => clearInterval(interval);
  }, [activeIndex, validBanners.length, autoPlayIntervalMs]);

  // Atualizar índice ativo com base no scroll
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const width = scrollRef.current.clientWidth;
    const idx = Math.round(scrollLeft / (width || 1));
    if (idx !== activeIndex && idx >= 0 && idx < validBanners.length) {
      setActiveIndex(idx);
    }
  };

  if (validBanners.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Destaques e Ofertas de Supermercado"
      className={cn("relative w-full overflow-hidden rounded-b-3xl bg-muted select-none", className)}
    >
      {/* ── Trilho Contínuo Deslizante (Instagram / Stories physics) ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth touch-pan-x"
        tabIndex={0}
        aria-label="Carrossel contínuo de promoções"
      >
        {validBanners.map((banner, idx) => {
          const content = (
            <div className="relative w-full aspect-21/9 sm:aspect-3/1 overflow-hidden">
              <img
                src={banner.imageUrl}
                alt={banner.title || `Banner ${idx + 1}`}
                className="w-full h-full object-cover pointer-events-none"
                loading={idx === 0 ? "eager" : "lazy"}
              />
              {banner.badge ? (
                <span className="absolute top-3 left-3 px-3 py-1 text-2xs font-bold rounded-full bg-primary text-primary-foreground shadow-sm">
                  {banner.badge}
                </span>
              ) : null}
              {banner.title ? (
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-background/90 via-background/40 to-transparent">
                  <h3 className="text-sm sm:text-base font-bold text-foreground line-clamp-1">
                    {banner.title}
                  </h3>
                  {banner.subtitle ? (
                    <p className="text-xs text-muted-foreground line-clamp-1">{banner.subtitle}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          );

          return (
            <div
              key={banner.id || `b-${idx}`}
              className="w-full shrink-0 snap-center min-w-full"
            >
              {banner.targetUrl ? (
                <Link
                  to={banner.targetUrl as any}
                  className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {content}
                </Link>
              ) : (
                content
              )}
            </div>
          );
        })}
      </div>

      {/* ── Indicador Canônico de Paginação por Pontos (Touch Target >= 44px) ── */}
      {validBanners.length > 1 ? (
        <div className="absolute bottom-1 inset-x-0 flex items-center justify-center z-10">
          {validBanners.map((_, i) => (
            <button
              key={`dot-${i}`}
              type="button"
              onClick={() => {
                if (!scrollRef.current) return;
                const child = scrollRef.current.children[i] as HTMLElement;
                if (child) {
                  scrollRef.current.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
                  setActiveIndex(i);
                }
              }}
              className="h-11 min-h-11 px-1.5 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
              aria-label={`Ir para slide ${i + 1}`}
              aria-current={i === activeIndex ? "true" : undefined}
            >
              <span
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300 pointer-events-none block",
                  i === activeIndex ? "w-6 bg-primary" : "w-1.5 bg-foreground/30 hover:bg-foreground/50",
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
