import React, { useRef } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
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
    <div className="relative w-full min-w-0 max-w-full overflow-hidden space-y-3">
      <div className="hidden sm:flex items-center justify-between px-1">
        <span className="text-xs font-bold text-foreground flex items-center gap-2">
          <Star className="size-3.5 text-primary" />
          Destaques do circuito
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("left")}
            className="size-11 rounded-full border-border/70 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Slide anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("right")}
            className="size-11 rounded-full border-border/70 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Próximo slide"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-2 pt-1 px-0"
      >
        {slides.map((slide) => (
          <div
            key={slide.id}
            className="snap-start shrink-0 w-full sm:w-80 rounded-lg overflow-hidden border border-border/80 bg-card shadow-xs group transition-colors duration-200 motion-reduce:transition-none hover:border-border"
          >
            <div className="relative aspect-video w-full overflow-hidden bg-muted flex items-center justify-center">
              <img
                src={slide.image_url}
                alt={slide.title}
                className="relative size-full object-contain sm:object-cover transition-transform duration-200 motion-reduce:transition-none motion-reduce:transform-none group-hover:scale-105 select-none"
                loading="lazy"
              />
              <Badge
                variant="secondary"
                className="absolute left-2 top-2 rounded-md bg-card/95 text-xs font-bold text-foreground shadow-xs"
              >
                {slide.tag}
              </Badge>
            </div>
            <div className="p-3">
              <h4 className="line-clamp-2 text-sm font-bold leading-tight text-foreground">
                {slide.title}
              </h4>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
