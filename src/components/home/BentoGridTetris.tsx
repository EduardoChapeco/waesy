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

export function BentoGridTetris({ items, aspectRatio, className }: BentoGridTetrisProps) {
  const activeItems = (items || []).filter((item) => item.is_active !== false);
  if (activeItems.length === 0) return null;

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

        // Mapeamento canônico sem classes com colchetes arbitrários (DL-02)
        const colClass =
          spanX >= 4
            ? "col-span-2 md:col-span-4"
            : spanX === 3
              ? "col-span-2 md:col-span-3"
              : spanX === 2
                ? "col-span-2 md:col-span-2"
                : "col-span-1";

        const rowClass = spanY >= 2 ? "row-span-2 min-h-48 sm:min-h-72" : "row-span-1 min-h-32 sm:min-h-40";

        return (
          <div
            key={item.id || idx}
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
                src={item.image_url}
                alt={item.title || ""}
                loading="lazy"
                className="size-full object-cover group-hover:scale-102 transition-transform duration-300 motion-reduce:transition-none"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "0.3";
                }}
              />

              {item.show_text && (item.title || item.badge_text) && (
                <div className="absolute inset-x-0 bottom-0 bg-background/90 p-4 text-foreground pointer-events-none border-t border-border/40">
                  {item.badge_text && (
                    <Badge
                      variant="default"
                      className="self-start mb-2 px-2 py-0 text-3xs font-bold uppercase tracking-wider rounded-md"
                    >
                      {item.badge_text}
                    </Badge>
                  )}
                  {item.title && (
                    <h3 className="text-sm sm:text-base font-bold tracking-tight line-clamp-2">
                      {item.title}
                    </h3>
                  )}
                  {item.subtitle && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                      {item.subtitle}
                    </p>
                  )}
                </div>
              )}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
