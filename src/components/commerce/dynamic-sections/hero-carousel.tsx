import { Link } from "@tanstack/react-router";
import { ChevronRight, ImageOff, ChevronLeft } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useBuilderClickTracking } from "../analytics-provider";

export function HeroCarousel({
  content,
  node_id,
  block_type,
  resolvedBanners,
}: {
  content: Record<string, unknown>;
  node_id?: string;
  block_type?: string;
  resolvedBanners?: any[];
}) {
  const autoPlay = content.autoPlay !== false;
  const interval = Number(content.interval || 5) * 1000;
  let banners = (resolvedBanners && resolvedBanners.length > 0
    ? resolvedBanners
    : Array.isArray(content.banners)
    ? content.banners
    : []) as any[];
  if (banners.length === 0 && (content.image_url || content.title)) {
    banners = [
      {
        title: content.title,
        subtitle: content.subtitle,
        image_url: content.image_url,
        mobile_image_url: content.mobile_image_url,
        link: content.link,
        button_text: content.button_text || content.primaryCtaText,
      },
    ];
  }
  const trackClick = useBuilderClickTracking(node_id || "", block_type || "");

  const showOverlay = content.showOverlay !== false;
  const overlayOpacity = String(content.overlayOpacity || "medium");
  const opacityMap = {
    light: "from-black/30 via-black/5 to-transparent",
    medium: "from-black/60 via-black/20 to-transparent",
    dark: "from-black/80 via-black/40 to-black/10",
  };
  const overlayClass = opacityMap[overlayOpacity as keyof typeof opacityMap] || opacityMap.medium;

  const heightMode = String(content.desktopHeight || "proportional");
  const heightClass =
    heightMode === "full"
      ? "h-[85dvh] @md:h-[100dvh]"
      : heightMode === "square"
      ? "aspect-square"
      : heightMode === "natural"
      ? ""
      : "aspect-[2.35/1] @md:aspect-[21/9] lg:aspect-[3/1] w-full h-auto"; // Escala proporcional sem cortes no mobile

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!autoPlay || !emblaApi) return;
    const autoplayInterval = setInterval(() => {
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext();
      } else {
        emblaApi.scrollTo(0);
      }
    }, interval);
    return () => clearInterval(autoplayInterval);
  }, [autoPlay, interval, emblaApi]);

  if (banners.length === 0) {
    return (
      <section className="relative overflow-hidden bg-secondary">
        <div className="flex aspect-[4/5] @md:aspect-[21/9] w-full flex-col items-center justify-center gap-3 text-muted-foreground border-y border-border">
          <ImageOff className="size-10" aria-hidden />
          <p>Nenhum banner configurado</p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden bg-secondary">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {banners.map((banner, index) => {
            const title = String(banner.title || "");
            const bg_url = String(banner.image_url || "");
            const mobile_bg_url = String(banner.mobile_image_url || bg_url);
            const button_text = String(banner.button_text || "");
            const button_link = String(banner.link || "");

            return (
              <div
                key={index}
                className={`relative min-w-0 flex-full shrink-0 grow-0 basis-full bg-[#111] overflow-hidden ${heightClass}`}
              >
                {/* Background Image com Camada Ambiente Desfocada para Preenchimento Limpo */}
                {bg_url ? (
                  <div className="relative size-full overflow-hidden">
                    <img
                      src={bg_url}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 size-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none select-none"
                    />
                    <picture
                      className={
                        heightMode === "natural"
                          ? "relative block w-full"
                          : "relative inset-0 block w-full h-full"
                      }
                    >
                      <source media="(max-width: 640px)" srcSet={mobile_bg_url} />
                      <img
                        src={bg_url}
                        alt={title || "Banner"}
                        loading={index === 0 ? "eager" : "lazy"}
                        className={`block w-full ${
                          heightMode === "natural"
                            ? "h-auto object-contain"
                            : "h-full object-contain @md:object-cover"
                        } transition-transform duration-1000 group-hover:scale-105 select-none`}
                      />
                    </picture>
                  </div>
                ) : (
                  <div className="absolute inset-0 w-full h-full from-[#1a1a2e] to-[#16213e] flex flex-col items-center justify-center border border-dashed border-white/10 p-4">
                    <span className="text-white/60 text-sm font-semibold tracking-wide uppercase mb-1">
                      Banner Principal
                    </span>
                    <span className="text-white/30 text-xs">
                      Arraste/selecione uma imagem ou cole uma URL no painel à direita
                    </span>
                  </div>
                )}

                {/* Overlay for text readability */}
                {showOverlay && (
                  <div
                    className={`absolute inset-0 ${overlayClass} pointer-events-none mix-blend-multiply`}
                  />
                )}

                {/* Content Overlay */}
                <div className="absolute inset-0 z-10 mx-auto flex w-full max-w-screen-xl flex-col items-start justify-end pb-12 sm:pb-16 px-4 sm:px-6 @md:justify-center @md:pb-0 @md:px-12 pointer-events-none">
                  {title && (
                    <h2 className="text-balance text-2xl sm:text-4xl text-white @md:text-6xl @xl:text-7xl font-light tracking-tight drop- max-w-3xl pointer-events-auto leading-none">
                      {title}
                    </h2>
                  )}
                  {button_link && button_text && (
                    <div className="mt-4 sm:mt-6 @md:mt-8 pointer-events-auto">
                      <Button
                        size="lg"
                        className="bg-white/95 text-black hover:bg-white border border-transparent hover:scale-[1.02] transition-all font-medium rounded-full px-6 sm:px-8 h-10 sm:h-12 text-xs sm:text-sm"
                        asChild
                      >
                        <Link
                          to={button_link as never}
                          onClick={() => trackClick({ index, title, link: button_link })}
                        >
                          {button_text}
                          <ChevronRight className="size-4 ml-1" aria-hidden />
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/20 p-2 text-white backdrop-blur hover:bg-black/40 z-20 hidden @md:block transition-all cursor-pointer"
            aria-label="Anterior"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/20 p-2 text-white backdrop-blur hover:bg-black/40 z-20 hidden @md:block transition-all cursor-pointer"
            aria-label="Próximo"
          >
            <ChevronRight className="size-6" />
          </button>
        </>
      )}
    </section>
  );
}
