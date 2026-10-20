import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { HomeSectionItemDTO, HomeAspectRatio } from "@/services/admin-home-cms.functions";

export interface BentoGridTetrisProps {
  items: HomeSectionItemDTO[];
  aspectRatio?: HomeAspectRatio;
  className?: string;
}

export function BentoGridTetris({ items, aspectRatio, className }: BentoGridTetrisProps) {
  const activeItems = (items || []).filter((item) => item.is_active !== false);
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
  const hasValidImage = Boolean(item.image_url && !imageError);

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
        {hasValidImage ? (
          <>
            <img
              src={item.image_url!}
              alt=""
              loading="lazy"
              className="size-full object-cover group-hover:scale-102 transition-transform duration-300 motion-reduce:transition-none"
              onError={() => setImageError(true)}
            />
            {item.title && (
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
          </>
        ) : (
          /* Honest Typographic Editorial Layout (Anti-Fake & Zero Fallbacks Sintéticos B.8/B.33) */
          <div className="size-full flex flex-col justify-between p-4 bg-card">
            <div className="flex items-center justify-between gap-2">
              {item.subtitle ? (
                <Badge variant="secondary" className="text-xs font-medium px-2 py-1 rounded-full">
                  {item.subtitle}
                </Badge>
              ) : (
                <span className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Sparkles className="size-3.5" />
                </span>
              )}
              <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>

            <div className="mt-3">
              <h3
                className={cn(
                  "font-bold text-foreground leading-tight break-words text-wrap",
                  isHero ? "text-lg sm:text-xl" : "text-sm sm:text-base",
                )}
              >
                {item.title || "Ver Destaque"}
              </h3>
            </div>
          </div>
        )}
      </Link>
    </div>
  );
}
