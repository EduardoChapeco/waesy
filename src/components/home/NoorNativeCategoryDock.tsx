import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
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
        "carousel -mx-2 px-2 sm:mx-0 sm:px-0 overflow-x-auto snap-x mandatory no-scrollbar py-1 focus:outline-none flex gap-2 sm:gap-3 select-none",
        className,
      )}
      role="region"
      aria-label="Menu Rápido de Categorias"
    >
      {items.map((item) => {
        if (variant === "compact_squircle") {
          return <CompactCategoryPill key={item.id} item={item} />;
        }

        return (
          <div key={item.id} className="snap-start shrink-0 w-20 sm:w-24">
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

function CompactCategoryPill({ item }: { item: HomeSectionItemDTO }) {
  const [imageError, setImageError] = useState(false);
  const hasValidImage = Boolean(item.image_url && !imageError);

  return (
    <Link
      to={item.target_url as any}
      className={cn(
        "snap-start shrink-0 min-h-11 min-w-11 px-3 py-2 rounded-lg bg-card hover:bg-muted/50 border border-border/50",
        "flex items-center gap-2 active:scale-95 transition-transform duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      {hasValidImage ? (
        <img
          src={item.image_url!}
          alt=""
          loading="lazy"
          className="size-7 object-contain"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="size-7 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Sparkles className="size-3.5" />
        </span>
      )}
      {item.show_text && item.title && (
        <span className="text-xs font-semibold text-foreground whitespace-nowrap">
          {item.title}
        </span>
      )}
    </Link>
  );
}
