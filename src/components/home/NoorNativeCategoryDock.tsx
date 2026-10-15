import React from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { IFoodSquareCategoryButton } from "./IFoodSquareCategoryButton";
import type { HomeSectionItemDTO } from "@/services/admin-home-cms.functions";

export interface NoorNativeCategoryDockProps {
  items: HomeSectionItemDTO[];
  className?: string;
  variant?: "square" | "compact_squircle";
}

export function NoorNativeCategoryDock({
  items,
  className,
  variant = "square",
}: NoorNativeCategoryDockProps) {
  if (!items || items.length === 0) return null;

  return (
    <div
      className={cn(
        "carousel w-full overflow-x-auto snap-x mandatory no-scrollbar py-2 px-1 focus:outline-none flex gap-3 select-none",
        className,
      )}
      role="region"
      aria-label="Menu Rápido de Categorias"
    >
      {items.map((item) => {
        if (variant === "compact_squircle") {
          return (
            <Link
              key={item.id}
              to={item.target_url as any}
              className={cn(
                "snap-start shrink-0 min-h-11 min-w-11 px-3 py-2 rounded-lg bg-card border border-border/60",
                "flex items-center gap-2 hover:border-foreground/30 active:scale-95 transition-transform duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              )}
            >
              <img
                src={item.image_url}
                alt={item.title || ""}
                loading="lazy"
                className="size-7 object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "0.3";
                }}
              />
              {item.show_text && item.title && (
                <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                  {item.title}
                </span>
              )}
            </Link>
          );
        }

        return (
          <div key={item.id} className="snap-start shrink-0">
            <IFoodSquareCategoryButton
              id={item.id}
              title={item.title}
              imageUrl={item.image_url}
              targetUrl={item.target_url}
              showText={item.show_text}
              badgeText={item.badge_text}
            />
          </div>
        );
      })}
    </div>
  );
}
