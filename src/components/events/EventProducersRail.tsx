import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Star, CheckCircle, Heart, Buildings, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface EventProducerItem {
  id: string;
  name: string;
  slug?: string | null;
  logoUrl?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  activeEventsCount?: number;
  city?: string | null;
  isVerified?: boolean;
}

export interface EventProducersRailProps {
  title?: string;
  producers?: EventProducerItem[];
  className?: string;
}

export function EventProducersRail({
  title = "Produtoras e Casas de Show",
  producers = [],
  className,
}: EventProducersRailProps) {
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // Regra B.8 & B.33: Proibido exibir seções com coleções vazias ou dados simulados
  if (!producers || producers.length === 0) return null;

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section
      aria-label={title}
      className={cn("w-full space-y-3 py-2 select-none", className)}
      data-testid="event-producers-rail"
    >
      <div className="px-3 sm:px-4 flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-tight">
            {title}
          </h2>
          <p className="text-3xs text-muted-foreground mt-0.5">
            Organizadores oficiais e espaços culturais certificados
          </p>
        </div>
        <Link
          to="/places"
          search={{ categoria: "entretenimento" }}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
        >
          <span>Ver todos</span>
          <CaretRight size={12} weight="bold" />
        </Link>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar px-3 sm:px-4 snap-x snap-mandatory">
        {producers.map((prod) => {
          const isFav = favorites[prod.id] || false;
          const targetUrl = prod.slug ? `/places/${prod.slug}` : `/buscar?q=${encodeURIComponent(prod.name)}`;

          return (
            <div
              key={prod.id}
              className={cn(
                "w-72 sm:w-80 rounded-2xl border border-border/60 bg-card p-3 flex items-center justify-between gap-3 shrink-0 snap-start select-none",
                "hover:border-foreground/30 hover:bg-muted/20 transition-colors duration-200 group",
              )}
            >
              <Link
                to={targetUrl as any}
                className="flex items-center gap-3 min-w-0 flex-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {/* Avatar Circular da Produtora */}
                <div className="size-12 rounded-full border border-border/80 bg-muted overflow-hidden flex items-center justify-center shrink-0">
                  {prod.logoUrl ? (
                    <img src={prod.logoUrl} alt={prod.name} className="size-full object-cover" />
                  ) : (
                    <Buildings size={22} weight="bold" className="text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1">
                    <h3 className="text-xs font-bold text-foreground break-words group-hover:text-primary transition-colors">
                      {prod.name}
                    </h3>
                    {prod.isVerified && (
                      <CheckCircle size={13} weight="fill" className="text-primary shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-2xs text-muted-foreground">
                    {/* Regra B.33: Só exibe estrelas se houver review real registrada */}
                    {typeof prod.rating === "number" && prod.rating > 0 && (
                      <span className="flex items-center gap-1 font-bold text-warning font-mono">
                        <Star size={11} weight="fill" />
                        <span>{prod.rating.toFixed(1)}</span>
                      </span>
                    )}
                    {typeof prod.activeEventsCount === "number" && prod.activeEventsCount > 0 && (
                      <span>• {prod.activeEventsCount} {prod.activeEventsCount === 1 ? "evento" : "eventos"}</span>
                    )}
                  </div>

                  {prod.city && (
                    <p className="text-3xs text-muted-foreground/80 break-words">
                      {prod.city}
                    </p>
                  )}
                </div>
              </Link>

              {/* Botão de Favoritar com Alvo de Toque de 44px */}
              <button
                type="button"
                onClick={(e) => toggleFavorite(e, prod.id)}
                aria-label={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                className="size-11 min-w-11 min-h-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted/40 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Heart size={18} weight={isFav ? "fill" : "bold"} className={isFav ? "text-destructive" : ""} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
