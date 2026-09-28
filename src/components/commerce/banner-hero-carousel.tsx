import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Layers, ArrowRight } from "lucide-react";
import type { BannerDTO } from "@/services/banner.functions";

export interface BannerHeroCarouselProps {
  banners: BannerDTO[];
  className?: string;
  autoPlayIntervalMs?: number;
}

export function BannerHeroCarousel({
  banners,
  className = "",
  autoPlayIntervalMs = 6000,
}: BannerHeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeBanners = banners && banners.length > 0 ? banners : [];

  useEffect(() => {
    if (!isPlaying || activeBanners.length <= 1) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, autoPlayIntervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, activeBanners.length, autoPlayIntervalMs]);

  if (activeBanners.length === 0) return null;

  const currentBanner = activeBanners[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setIsPlaying(false);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    setTouchStartX(null);
    setIsPlaying(true);
  };

  const renderMedia = (banner: BannerDTO) => {
    if (banner.media_type === "video") {
      return (
        <div className="relative size-full overflow-hidden">
          <video
            src={banner.media_url}
            autoPlay
            loop
            muted
            playsInline
            aria-hidden="true"
            className="absolute inset-0 size-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none"
          />
          <video
            src={banner.media_url}
            autoPlay
            loop
            muted
            playsInline
            className="relative size-full object-contain md:object-cover"
          />
        </div>
      );
    }
    return (
      <div className="relative size-full overflow-hidden">
        {/* Camada Ambiente: Desfoque suave que preenche as laterais sem cortar as bordas do anúncio */}
        <img
          src={banner.media_url}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none select-none"
        />
        {/* Mídia Principal: Escala Proporcional Verdadeira sem Cortes (Zero Image Clipping) */}
        <img
          src={banner.media_url}
          alt={banner.title}
          className="relative size-full object-contain transition-transform duration-500 will-change-transform select-none"
          loading="eager"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
    );
  };

  const targetLink = bannerTargetLink(currentBanner) || "/mercado";

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl bg-card group select-none ${className}`}
      onMouseEnter={() => setIsPlaying(false)}
      onMouseLeave={() => setIsPlaying(true)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Responsive Proportional Aspect Ratio: 2:1 mobile, 2.4:1 tablet, 21:9 desktop ── */}
      <div className="relative w-full aspect-[2/1] sm:aspect-[2.4/1] md:aspect-[21/9] overflow-hidden bg-muted">
        {/* Render Actual Image / Video */}
        {renderMedia(currentBanner)}

        {/* Clickable entire card link */}
        <Link
          to={targetLink as any}
          className="absolute inset-0 z-10"
          aria-label={currentBanner.title || "Banner em Destaque"}
        />

        {/* Gradient Overlay & Text (DESATIVADO POR PADRÃO — Apenas se explicitamente ativado no Admin) */}
        {currentBanner.show_overlay === true &&
          (currentBanner.title ||
            currentBanner.subtitle ||
            currentBanner.badge_text ||
            currentBanner.cta_label) && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent sm:bg-gradient-to-r sm:from-black/90 sm:via-black/50 sm:to-transparent flex flex-col justify-end sm:justify-center p-4 sm:p-8 lg:p-12 text-white pointer-events-none z-10">
              <div className="max-w-xl space-y-1.5 sm:space-y-3 z-10 pointer-events-auto">
                {currentBanner.show_badge === true && currentBanner.badge_text && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/20 backdrop-blur-md text-[9px] sm:text-xs font-bold uppercase tracking-wider text-white border border-white/30">
                    <Layers className="size-3 text-amber-300" />
                    <span>{currentBanner.badge_text}</span>
                  </div>
                )}

                {currentBanner.show_title === true && currentBanner.title && (
                  <h2 className="text-base sm:text-2xl lg:text-4xl font-black tracking-tight leading-tight line-clamp-2 text-white">
                    {currentBanner.title}
                  </h2>
                )}

                {currentBanner.show_description === true && currentBanner.subtitle && (
                  <p className="text-[11px] sm:text-sm text-zinc-200 line-clamp-2 leading-relaxed max-w-lg">
                    {currentBanner.subtitle}
                  </p>
                )}

                {currentBanner.show_cta === true && (
                  <div className="pt-1.5 sm:pt-2">
                    <Link
                      to={targetLink as any}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white text-black font-bold text-xs sm:text-sm hover:bg-zinc-100 hover:scale-105 active:scale-95 transition-all"
                    >
                      <span>{currentBanner.cta_label || "Conferir"}</span>
                      <ArrowRight className="size-3.5 sm:size-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Navigation Arrows (Desktop) */}
        {activeBanners.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              aria-label="Banner anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              onClick={handleNext}
              aria-label="Próximo banner"
              className="absolute right-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer"
            >
              <ChevronRight className="size-5" />
            </button>

            {/* Indicadores de Paginação Suaves (Dots) */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 pointer-events-none">
              {activeBanners.map((_, i) => (
                <span
                  key={i}
                  className={`transition-all duration-300 rounded-full ${
                    i === currentIndex
                      ? "w-5 h-1.5 bg-white shadow-sm"
                      : "w-1.5 h-1.5 bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function bannerTargetLink(banner: BannerDTO): string {
  if (banner.target_url) return banner.target_url;
  switch (banner.target_type) {
    case "product":
      return banner.target_id ? `/loja/produto/${banner.target_id}` : "/mercado";
    case "store":
      return banner.target_id ? `/loja/${banner.target_id}` : "/mercado";
    case "category":
      return banner.target_id ? `/mercado?categoria=${banner.target_id}` : "/mercado";
    case "hotpage":
    default:
      return "/mercado";
  }
}
