import React from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { HomeSectionItemDTO, HomeAspectRatio } from "@/services/admin-home-cms.functions";

export interface BentoGridTetrisProps {
  items: HomeSectionItemDTO[];
  aspectRatio?: HomeAspectRatio;
  className?: string;
}

const FALLBACK_BENTO_IMAGE =
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80";

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
      aria-label="Grade Modular Bento"
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

        const safeSrc =
          item.image_url && !item.image_url.includes("1511707171634-5f897ff02560")
            ? item.image_url
            : FALLBACK_BENTO_IMAGE;

        return (
          <div
            key={item.id || idx}
            className={cn(
              "group relative overflow-hidden rounded-lg bg-muted/40 border border-border/50 hover:border-foreground/30 transition-colors duration-200",
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
                src={safeSrc}
                alt=""
                loading="lazy"
                className="size-full object-cover group-hover:scale-102 transition-transform duration-300 motion-reduce:transition-none"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  if (img.src !== FALLBACK_BENTO_IMAGE) {
                    img.src = FALLBACK_BENTO_IMAGE;
                  }
                }}
              />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
