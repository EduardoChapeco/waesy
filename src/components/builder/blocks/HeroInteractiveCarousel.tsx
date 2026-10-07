import React, { useState, useEffect, useCallback } from "react";
import { HeroCarouselBlockData, OmniBlockStyling } from "../types";
import { getSectionStyle } from "../utils";
import { ArrowRight, ChevronLeft, ChevronRight, Tag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSafeBuilderHref } from "@/lib/builder/safe-href";

export interface HeroInteractiveCarouselProps {
  id?: string;
  data: HeroCarouselBlockData;
  styling?: OmniBlockStyling;
  className?: string;
}

export const HeroInteractiveCarousel: React.FC<HeroInteractiveCarouselProps> = ({
  id,
  data,
  styling,
  className = "",
}) => {
  const sectionStyle = getSectionStyle(styling);

  const slides = Array.isArray(data?.slides) && data.slides.length > 0 ? data.slides : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const autoPlay = data?.autoPlay ?? true;
  const intervalSeconds = data?.intervalSeconds ?? 5;

  const nextSlide = useCallback(() => {
    if (slides.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    if (slides.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (!autoPlay || isPaused || slides.length <= 1) return;

    const timer = setInterval(() => {
      nextSlide();
    }, intervalSeconds * 1000);

    return () => clearInterval(timer);
  }, [autoPlay, intervalSeconds, isPaused, nextSlide, slides.length]);

  if (slides.length === 0) {
    return (
      <section
        id={id}
        style={sectionStyle.style}
        className={`w-full bg-background text-foreground py-16 text-center text-xs text-muted-foreground ${sectionStyle.className} ${className}`}
      >
        Nenhum slide configurado para o carrossel.
      </section>
    );
  }

  const currentSlide = slides[currentIndex] || slides[0];
  const primaryHref = getSafeBuilderHref(currentSlide.primaryCta.href) ?? "#";
  const secondaryHref = currentSlide.secondaryCta ? getSafeBuilderHref(currentSlide.secondaryCta.href) ?? "#" : undefined;

  return (
    <section
      id={id}
      style={sectionStyle.style}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`relative w-full bg-background text-foreground overflow-hidden border-b border-border/40 select-none ${sectionStyle.className} ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center min-h-[460px] sm:min-h-[500px]">
          {/* Lado Esquerdo: Conteúdo Editorial do Slide */}
          <div className="lg:col-span-7 flex flex-col items-start text-left z-10 animate-in fade-in duration-300 key={currentIndex}">
            {/* Badge de Contexto do Slide */}
            {currentSlide.badgeText && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/60 border border-border/80 text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-4 sm:mb-6 shadow-xs">
                <Tag className="size-3.5 text-primary" />
                <span>{currentSlide.badgeText}</span>
              </div>
            )}

            {/* Título Display do Slide */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.12] text-foreground mb-4 sm:mb-6 [text-wrap:balance]">
              {currentSlide.title}
            </h1>

            {/* Subtítulo / Descrição */}
            {currentSlide.subtitle && (
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed max-w-xl mb-6 sm:mb-8">
                {currentSlide.subtitle}
              </p>
            )}

            {/* Cluster de Botões CTA */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {currentSlide.primaryCta && (
                <Button
                  size="lg"
                  className="h-11 sm:h-12 px-6 sm:px-7 text-xs sm:text-sm font-semibold rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-transform active:scale-95 group shadow-xs cursor-pointer"
                  asChild
                >
                  <a href={primaryHref} className="flex items-center gap-2">
                    <span>{currentSlide.primaryCta.label}</span>
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
              )}

              {currentSlide.secondaryCta && (
                <Button
                  variant="outline"
                  size="lg"
                  className="h-11 sm:h-12 px-5 sm:px-6 text-xs sm:text-sm font-semibold rounded-lg border-border bg-card/60 backdrop-blur-xs hover:bg-muted text-foreground transition-all cursor-pointer"
                  asChild
                >
                  <a href={secondaryHref}>
                    {currentSlide.secondaryCta.label}
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Lado Direito: Visual Imersivo & Card Flutuante */}
          <div className="lg:col-span-5 relative w-full flex items-center justify-center">
            <div className="relative w-full aspect-4/3 sm:aspect-16/10 lg:aspect-4/3 rounded-lg sm:rounded-lg overflow-hidden border border-border/60 bg-muted/30 shadow-lg">
              {currentSlide.imageUrl ? (
                <img
                  src={currentSlide.imageUrl}
                  alt={currentSlide.imageAlt || currentSlide.title}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-102"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-tr from-muted/50 to-card">
                  <Tag className="size-12 text-primary/40 mb-3" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {currentSlide.highlightTag || "Destaque Principal"}
                  </span>
                  <p className="text-sm font-semibold text-foreground mt-1 max-w-xs">
                    {currentSlide.title}
                  </p>
                </div>
              )}

              {/* Tag Superior */}
              {currentSlide.highlightTag && (
                <div className="absolute top-3 left-3 px-3 py-1 rounded-lg bg-background/80 backdrop-blur-md border border-border/60 text-[10px] font-bold text-foreground uppercase tracking-wider">
                  {currentSlide.highlightTag}
                </div>
              )}

              {/* Card Flutuante de Indicador */}
              {currentSlide.floatingStat && (
                <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 px-4 py-3 rounded-lg bg-card/90 backdrop-blur-md border border-border/60 shadow-md flex items-center gap-3">
                  {currentSlide.floatingStat.statusDot && (
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  )}
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                      {currentSlide.floatingStat.label}
                    </span>
                    <span className="text-xs font-bold font-mono text-foreground">
                      {currentSlide.floatingStat.value}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Barra de Navegação & Indicadores Apple-Like ── */}
        {slides.length > 1 && (
          <div className="flex items-center justify-between pt-6 sm:pt-8 border-t border-border/30 mt-6 sm:mt-8">
            {/* Controles de Próximo / Anterior */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Slide anterior"
                className="size-9 rounded-lg border border-border bg-card/60 hover:bg-muted flex items-center justify-center text-foreground transition-all cursor-pointer"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                aria-label="Próximo slide"
                className="size-9 rounded-lg border border-border bg-card/60 hover:bg-muted flex items-center justify-center text-foreground transition-all cursor-pointer"
              >
                <ChevronRight className="size-4" />
              </button>
              <span className="text-[11px] font-mono font-semibold text-muted-foreground ml-2">
                0{currentIndex + 1} / 0{slides.length}
              </span>
            </div>

            {/* Dots / Pílulas Interativas */}
            <div className="flex items-center gap-2">
              {slides.map((slide, idx) => (
                <button
                  key={slide.id || idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Ir para slide ${idx + 1}`}
                  className={`transition-all rounded-full cursor-pointer ${
                    currentIndex === idx
                      ? "w-8 h-2 bg-foreground"
                      : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
