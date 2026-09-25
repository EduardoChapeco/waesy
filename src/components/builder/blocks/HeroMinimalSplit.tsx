import React from "react";
import { HeroBlockData } from "../types";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface HeroMinimalSplitProps {
  data: HeroBlockData;
  className?: string;
}

export const HeroMinimalSplit: React.FC<HeroMinimalSplitProps> = ({ data, className = "" }) => {
  return (
    <section className={`relative w-full bg-background text-foreground py-20 lg:py-28 overflow-hidden border-b border-border/40 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Lado Esquerdo: 60% da Largura Útil (7 de 12 colunas) */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Pílula de Contexto Superior */}
            {data.badgeText && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-muted/60 border border-border/80 text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-6">
                <Sparkles className="size-3.5 text-primary" />
                <span>{data.badgeText}</span>
              </div>
            )}

            {/* Título Display Monumental */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-[1.08] text-foreground mb-6 [text-wrap:balance]">
              {data.title}
            </h1>

            {/* Subtítulo Relaxado */}
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-xl mb-8">
              {data.subtitle}
            </p>

            {/* Cluster de Ações Primária e Secundária */}
            <div className="flex flex-wrap items-center gap-3.5 w-full sm:w-auto">
              <Button
                size="lg"
                className="h-12 px-7 text-base font-semibold rounded-xl bg-foreground text-background hover:bg-foreground/90 transition-transform active:scale-95 group shadow-sm"
                onClick={data.primaryCta.onClick}
                asChild={!data.primaryCta.onClick}
              >
                {data.primaryCta.onClick ? (
                  <span className="flex items-center gap-2">
                    {data.primaryCta.label}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                ) : (
                  <a href={data.primaryCta.href} className="flex items-center gap-2">
                    {data.primaryCta.label}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </a>
                )}
              </Button>

              {data.secondaryCta && (
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-6 text-base font-medium rounded-xl border-border hover:bg-muted/50 transition-colors"
                  onClick={data.secondaryCta.onClick}
                  asChild={!data.secondaryCta.onClick}
                >
                  {data.secondaryCta.onClick ? (
                    <span className="flex items-center gap-2">
                      <Play className="size-4 fill-current opacity-80" />
                      {data.secondaryCta.label}
                    </span>
                  ) : (
                    <a href={data.secondaryCta.href} className="flex items-center gap-2">
                      <Play className="size-4 fill-current opacity-80" />
                      {data.secondaryCta.label}
                    </a>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Lado Direito: 40% da Largura Útil (5 de 12 colunas) */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none rounded-3xl overflow-hidden border border-border/60 bg-muted/20 shadow-xs aspect-[4/5] sm:aspect-square lg:aspect-[4/5]">
              {data.imageUrl ? (
                <img
                  src={data.imageUrl}
                  alt={data.imageAlt || data.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-muted/50 to-muted/20 text-muted-foreground p-8 text-center">
                  <div className="size-16 rounded-2xl bg-background border border-border/80 flex items-center justify-center mb-3">
                    <Sparkles className="size-8 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Vitrine Digital Waesy</span>
                  <span className="text-xs text-muted-foreground mt-1">Carregue sua mídia ou selecione do catálogo</span>
                </div>
              )}

              {/* Card Flutuante de Vidro Fosco com Indicador Pulsante */}
              {data.floatingStat && (
                <div className="absolute bottom-6 left-6 right-6 sm:right-auto sm:min-w-[240px] bg-background/85 backdrop-blur-md border border-border/80 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground block mb-0.5">
                        {data.floatingStat.label}
                      </span>
                      <span className="text-xl font-black text-foreground">
                        {data.floatingStat.value}
                      </span>
                    </div>
                    {data.floatingStat.statusDot && (
                      <span className="relative flex size-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full size-3 bg-emerald-500" />
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
