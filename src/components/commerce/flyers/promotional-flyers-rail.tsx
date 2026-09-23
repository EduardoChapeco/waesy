import React, { useState } from "react";
import { Clock, Eye, ShoppingBag, Flame, Sparkles, ChevronRight, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { type PromotionalFlyerDTO } from "@/services/store-flyers.functions";
import { FlyerInteractiveViewerModal } from "./flyer-interactive-viewer-modal";

interface PromotionalFlyersRailProps {
  flyers: PromotionalFlyerDTO[];
  title?: string;
  subtitle?: string;
  storeName?: string;
  storeSlug?: string;
  className?: string;
  hideHeader?: boolean;
}

export function PromotionalFlyersRail({
  flyers = [],
  title = "Encartes & Tabloides da Semana",
  subtitle = "Folhetos com ofertas válidas por tempo limitado",
  storeName,
  storeSlug,
  className,
  hideHeader = false,
}: PromotionalFlyersRailProps) {
  const [selectedFlyerIndex, setSelectedFlyerIndex] = useState<number | null>(null);

  // Se não houver encartes ativos, silêncio visual absoluto (Regra de Ergonomia)
  if (!flyers || flyers.length === 0) return null;

  return (
    <section className={cn("w-full py-4 space-y-3", className)} aria-label={title}>
      {/* ─── Cabeçalho Limpo da Seção (Anti-AI Smell) ─────────────── */}
      {!hideHeader && (
        <div className="flex items-end justify-between px-1">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground flex items-center gap-1.5">
                <Flame className="size-4 text-red-500 fill-red-500 shrink-0" />
                <span>{title}</span>
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-[10px] tracking-wide uppercase">
                Ofertas Válidas
              </span>
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                {subtitle}
              </p>
            )}
          </div>

          <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <span>{flyers.length} {flyers.length === 1 ? "folheto" : "folhetos"}</span>
          </div>
        </div>
      )}

      {/* ─── Trilho Horizontal com Scroll-Snap (Imagens Verticais Grandinhas) ─── */}
      <div className="relative w-full px-0">
        <div className="flex gap-3.5 sm:gap-4 overflow-x-auto pb-3 pt-1 snap-x snap-mandatory scrollbar-none">
          {flyers.map((flyer, index) => {
            const isRetro = flyer.theme === "retro_mercado";
            const hotspotsCount = Array.isArray(flyer.hotspots) ? flyer.hotspots.length : 0;

            return (
              <div
                key={flyer.id}
                onClick={() => setSelectedFlyerIndex(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedFlyerIndex(index);
                  }
                }}
                className={cn(
                  "snap-start shrink-0 relative flex flex-col justify-between overflow-hidden cursor-pointer transition-all duration-200 select-none group",
                  // Dimensões verticais grandinhas (tipo mini-stories verticais 3:4, NÃO círculos)
                  "w-44 sm:w-52 h-68 sm:h-76",
                  // Estilo Visual 1: Retrô Mercadista (Cartazista de Supermercado Antigo)
                  isRetro &&
                    "rounded-2xl bg-amber-300 dark:bg-amber-400 border-3 border-red-600 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] hover:shadow-[6px_6px_0px_0px_rgba(220,38,38,1)] hover:-translate-y-1",
                  // Estilo Visual 2: Clean & Apple HIG
                  !isRetro &&
                    "rounded-2xl bg-card border border-border/70 shadow-sm hover:shadow-md hover:border-foreground/30 hover:-translate-y-0.5"
                )}
              >
                {/* Imagem do Encarte (Com Zoom Suave no Hover) */}
                <div className="relative w-full flex-1 overflow-hidden bg-muted/40">
                  <img
                    src={flyer.image_url}
                    alt={flyer.title}
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Gradiente de Legibilidade Inferior */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                  {/* Ribbon Superior de Destaque */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
                    {isRetro ? (
                      <span className="px-2 py-0.5 rounded bg-red-600 text-amber-100 font-black text-[10px] uppercase tracking-tighter shadow-sm">
                        {flyer.badge_text || "OFERTAÇO"}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-background/90 backdrop-blur-md font-bold text-[10px] text-foreground shadow-xs">
                        {flyer.badge_text || "Encarte"}
                      </span>
                    )}

                    {/* Tag de Validade / Tempo Restante */}
                    {flyer.time_left_display && (
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 backdrop-blur-md shadow-xs",
                          isRetro
                            ? "bg-amber-400 text-red-950 font-black border border-amber-500"
                            : "bg-black/70 text-amber-300 border border-white/10"
                        )}
                      >
                        <Clock className="size-2.5" />
                        <span>{flyer.time_left_display}</span>
                      </span>
                    )}
                  </div>

                  {/* Tag Flutuante Central de Ofertas Interativas */}
                  {hotspotsCount > 0 && (
                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/15 text-white text-[10px] font-bold shadow-md">
                      <div className="size-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>{hotspotsCount} {hotspotsCount === 1 ? "oferta interativa" : "ofertas interativas"}</span>
                    </div>
                  )}
                </div>

                {/* Barra Inferior com Título e Ação */}
                <div
                  className={cn(
                    "p-2.5 sm:p-3 flex items-center justify-between gap-2 shrink-0",
                    isRetro ? "bg-amber-300 dark:bg-amber-400 text-red-950 border-t-2 border-red-600/30" : "bg-card text-foreground"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <h3
                      className={cn(
                        "text-xs font-black truncate leading-tight",
                        isRetro ? "uppercase tracking-tight text-red-950" : "font-bold text-foreground"
                      )}
                    >
                      {flyer.title}
                    </h3>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5 font-medium">
                      Toque para abrir e comprar
                    </p>
                  </div>

                  <div
                    className={cn(
                      "size-7 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                      isRetro ? "bg-red-600 text-amber-100" : "bg-primary text-primary-foreground"
                    )}
                  >
                    <Eye className="size-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Modal Interativo Lightbox com Hotspots ──────────────── */}
      {selectedFlyerIndex !== null && (
        <FlyerInteractiveViewerModal
          open={selectedFlyerIndex !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedFlyerIndex(null);
          }}
          flyers={flyers}
          initialFlyerIndex={selectedFlyerIndex}
          storeName={storeName}
          storeSlug={storeSlug}
        />
      )}
    </section>
  );
}
