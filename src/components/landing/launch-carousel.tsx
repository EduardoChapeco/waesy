import React, { useRef } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LaunchSlideDTO } from "@/services/launch.functions";

interface LaunchCarouselProps {
  slides: LaunchSlideDTO[];
}

export function LaunchCarousel({ slides }: LaunchCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -320 : 320;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  if (!slides || slides.length === 0) return null;

  return (
    <div className="relative w-full space-y-3">
      {/* Botões de navegação no desktop */}
      <div className="hidden sm:flex items-center justify-between px-1">
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-primary" />
          Atrações Confirmadas & Destaques do Circuito
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("left")}
            className="size-8 rounded-full border-border/70 hover:bg-muted"
            aria-label="Slide anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("right")}
            className="size-8 rounded-full border-border/70 hover:bg-muted"
            aria-label="Próximo slide"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Trilho Horizontal com Snap Scroll */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-2 pt-1 px-0"
      >
        {slides.map((slide) => (
          <div
            key={slide.id}
            className="snap-start shrink-0 w-[82vw] sm:w-[320px] rounded-2xl overflow-hidden border border-border/80 bg-card shadow-xs group transition-all duration-300 hover:border-border"
          >
            {/* Imagem com proporção 16:10 */}
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
              <img
                src={slide.image_url}
                alt={slide.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

              <Badge
                variant="secondary"
                className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold border-none"
              >
                {slide.tag}
              </Badge>

              <div className="absolute bottom-2.5 left-2.5 right-2.5">
                <h4 className="text-xs font-bold text-white leading-tight drop-shadow-sm">
                  {slide.title}
                </h4>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
