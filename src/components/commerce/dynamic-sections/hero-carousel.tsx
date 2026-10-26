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
      ? "h-screen-dvh"
      : heightMode === "square"
      ? "aspect-square"
      : heightMode === "natural"
      ? ""
      : "aspect-banner-cinema sm:aspect-banner-classic @md:aspect-banner-ultrawide lg:aspect-banner-slim w-full h-auto"; // Escala proporcional sem cortes no mobile

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
        <div className="flex aspect-post-vertical @md:aspect-banner-ultrawide w-full flex-col items-center justify-center gap-3 text-muted-foreground border-y border-border">
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
                className={`relative min-w-0 flex-full shrink-0 grow-0 basis-full bg-muted overflow-hidden ${heightClass}`}
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
                            : "h-full object-contain"
                        } transition-transform duration-300 motion-reduce:transition-none group-hover:scale-105 select-none`}
                      />
                    </picture>
                  </div>
                ) : (
                  <div className="absolute inset-0 w-full h-full bg-muted flex flex-col items-center justify-center border border-dashed border-border/40 p-4">
                    <span className="text-foreground/80 text-sm font-semibold tracking-wide uppercase mb-1">
                      Banner Principal
                    </span>
                    <span className="text-muted-foreground text-xs">
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
                    <h2 className="text-balance text-2xl sm:text-4xl text-foreground @md:text-6xl @xl:text-7xl font-light tracking-tight max-w-3xl pointer-events-auto leading-none">
                      {title}
                    </h2>
                  )}
                  {button_link && button_text && (
                    <div className="mt-4 sm:mt-6 @md:mt-8 pointer-events-auto">
                      <Button
                        size="lg"
                        className="bg-primary text-primary-foreground hover:opacity-90 active:scale-98 transition-colors motion-reduce:transition-none font-medium rounded-full px-6 sm:px-8 h-11 min-h-11 text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                        asChild
                      >
                        <Link
                          to={button_link as never}
                          onClick={() => trackClick({ index, title, link: button_link })}
                          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            className="absolute left-4 top-1/2 -translate-y-1/2 size-11 min-h-11 rounded-full bg-background/80 p-2 text-foreground backdrop-blur border border-border/60 hover:bg-background z-20 hidden @md:flex items-center justify-center transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Anterior"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 size-11 min-h-11 rounded-full bg-background/80 p-2 text-foreground backdrop-blur border border-border/60 hover:bg-background z-20 hidden @md:flex items-center justify-center transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Próximo"
          >
            <ChevronRight className="size-6" />
          </button>
        </>
      )}
    </section>
  );
}
