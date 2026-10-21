import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  type HomeSectionItemDTO,
  type HomeAspectRatio,
  isHealthyImageUrl,
} from "@/services/admin-home-cms.functions";

export interface BentoGridTetrisProps {
  items: HomeSectionItemDTO[];
  aspectRatio?: HomeAspectRatio;
  className?: string;
}

export function BentoGridTetris({ items, aspectRatio, className }: BentoGridTetrisProps) {
  // Invariante de Omissão Estrita: Cards sem imagem NÃO DEVEM aparecer
  const activeItems = (items || []).filter(
    (item) =>
      item.is_active !== false &&
      isHealthyImageUrl(item.image_desktop_url || item.image_mobile_url || item.image_url),
  );
  if (activeItems.length === 0) return null;

  const isThreeItemPack = activeItems.length === 3;

  return (
    <div
      className={cn(
        "w-full grid grid-cols-2 md:grid-cols-4 grid-flow-dense gap-3 sm:gap-4 select-none",
        className,
      )}
      role="region"
      aria-label="Grade Modular Bento Tetris"
    >
      {activeItems.map((item, idx) => {
        const spanX = item.grid_span_x || 1;
        const spanY = item.grid_span_y || 1;

        // Quando há exatamente 3 itens (1 principal 2x2 + 2 secundários), no Desktop (4 cols)
        // os 2 secundários ocupam 2 colunas cada (empilhados na metade direita) para fechar 100% do retângulo sem buracos
        const colClass = isThreeItemPack
          ? idx === 0
            ? "col-span-2 md:col-span-2"
            : "col-span-1 md:col-span-2"
          : spanX >= 4
            ? "col-span-2 md:col-span-4"
            : spanX === 3
              ? "col-span-2 md:col-span-3"
              : spanX === 2
                ? "col-span-2 md:col-span-2"
                : "col-span-1";

        const rowClass =
          (isThreeItemPack && idx === 0) || spanY >= 2
            ? "row-span-2 min-h-44 sm:min-h-72"
            : "row-span-1 min-h-28 sm:min-h-36";

        return (
          <BentoTileItem
            key={item.id || idx}
            item={item}
            colClass={colClass}
            rowClass={rowClass}
            isHero={(isThreeItemPack && idx === 0) || (spanX >= 2 && spanY >= 2)}
          />
        );
      })}
    </div>
  );
}

interface BentoTileItemProps {
  item: HomeSectionItemDTO;
  colClass: string;
  rowClass: string;
  isHero: boolean;
}

function BentoTileItem({ item, colClass, rowClass, isHero }: BentoTileItemProps) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = item.image_desktop_url || item.image_url || item.image_mobile_url;
  const hasValidImage = Boolean(imageUrl && !imageError && isHealthyImageUrl(imageUrl));

  // Invariante Estrita: Se não possui imagem saudável ou falhar no carregamento, OMITIR O CARD COMPLETAMENTE
  if (!hasValidImage) {
    return null;
  }

  // Título e badge são estritamente desativados por padrão; só renderizam se o Admin Master marcar show_text = true
  const canShowText = item.show_text === true && Boolean(item.title && item.title.trim().length > 0);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg bg-card border border-border/60 hover:border-foreground/30 transition-colors duration-200",
        colClass,
        rowClass,
      )}
    >
      <Link
        to={item.target_url as any}
        className="block size-full relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={item.title || "Destaque modular"}
      >
        <img
          src={imageUrl!}
          alt={canShowText ? (item.title || "") : ""}
          loading="lazy"
          className="size-full object-cover group-hover:scale-102 transition-transform duration-300 motion-reduce:transition-none"
          onError={() => setImageError(true)}
        />

        {canShowText && (
          <div className="absolute inset-x-0 bottom-0 bg-background/90 border-t border-border/50 flex flex-col justify-end p-4 pointer-events-none">
            {item.subtitle && (
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {item.subtitle}
              </span>
            )}
            <h3
              className={cn(
                "text-foreground font-bold leading-tight break-words text-wrap",
                isHero ? "text-lg sm:text-2xl" : "text-sm sm:text-base",
              )}
            >
              {item.title}
            </h3>
          </div>
        )}
      </Link>
    </div>
  );
}
