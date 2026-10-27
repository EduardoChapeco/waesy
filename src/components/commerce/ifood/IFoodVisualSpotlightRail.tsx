import React from "react";
import { Link } from "@tanstack/react-router";
import { CaretRight } from "@phosphor-icons/react";
import { IFoodStoreFeedCard, type IFoodStoreCardData } from "./IFoodStoreFeedCard";
import { cn } from "@/lib/utils";

export interface IFoodVisualSpotlightRailProps {
  title: string;
  subtitle?: string;
  isAd?: boolean;
  viewMoreTo?: string;
  viewMoreLabel?: string;
  stores: IFoodStoreCardData[];
  onFavoriteToggle?: (id: string) => void;
  className?: string;
}

/**
 * IFoodVisualSpotlightRail — Trilho Canônico de Cards Visuais Grandes iFood
 *
 * Exibe carrossel horizontal de fotos apetitosas com nota/coroa, botão de favorito,
 * avatar do estabelecimento, tempo de entrega e badge de cupom ("Restaurantes com Cupom", "Farmácias Famosas").
 */
export function IFoodVisualSpotlightRail({
  title,
  subtitle,
  isAd = false,
  viewMoreTo,
  viewMoreLabel = "Ver mais",
  stores = [],
  onFavoriteToggle,
  className,
}: IFoodVisualSpotlightRailProps) {
  if (!stores || stores.length === 0) return null;

  return (
    <section
      aria-label={title}
      className={cn("space-y-2 py-1", className)}
      data-testid="ifood-visual-spotlight-rail"
    >
      {/* Cabeçalho da Seção idêntico ao iFood */}
      <div className="px-3 sm:px-4 flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-tight">
            {title}
          </h2>
          {isAd ? (
            <span className="text-3xs font-bold text-muted-foreground uppercase tracking-wider block">
              Ad
            </span>
          ) : subtitle ? (
            <p className="text-xs text-muted-foreground line-clamp-1">{subtitle}</p>
          ) : null}
        </div>

        {viewMoreTo && (
          <Link
            to={viewMoreTo as any}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 pt-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xs"
          >
            <span>{viewMoreLabel}</span>
            <CaretRight size={12} weight="bold" />
          </Link>
        )}
      </div>

      {/* Trilho Deslizante Horizontal com Cards Visuais Grandes */}
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar px-3 sm:px-4 snap-x snap-mandatory [mask-image:linear-gradient(to_right,black_92%,transparent_100%)]">
        {stores.map((s) => (
          <IFoodStoreFeedCard
            key={s.id}
            store={s}
            variant="spotlight"
            onFavoriteToggle={onFavoriteToggle}
          />
        ))}
      </div>
    </section>
  );
}
