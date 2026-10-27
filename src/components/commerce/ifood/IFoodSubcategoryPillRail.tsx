import React from "react";
import { cn } from "@/lib/utils";

export interface SubcategoryItem {
  id: string;
  label: string;
  imageUrl?: string | null;
  icon?: React.ComponentType<any>;
  badge?: string | null;
}

export interface IFoodSubcategoryPillRailProps {
  items: SubcategoryItem[];
  activeId?: string;
  onSelect: (id: string) => void;
  showText?: boolean;
  textPosition?: "below" | "right" | "none";
  className?: string;
}

export function IFoodSubcategoryPillRail({
  items,
  activeId,
  onSelect,
  showText = true,
  textPosition = "below",
  className,
}: IFoodSubcategoryPillRailProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Subcategorias e Subnichos"
      className={cn(
        "w-full flex items-center gap-3 overflow-x-auto no-scrollbar py-2 px-3 sm:px-4 snap-x snap-mandatory [mask-image:linear-gradient(to_right,black_92%,transparent_100%)]",
        className,
      )}
      data-testid="ifood-subcategory-pill-rail"
    >
      {items.map((item) => {
        const isActive = activeId === item.id;
        const IconComponent = item.icon;
        const isHorizontal = textPosition === "right";
        const hasText = showText && textPosition !== "none";

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              "shrink-0 snap-start transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl relative group",
              isHorizontal
                ? "h-12 min-h-11 px-3 border flex items-center gap-2.5"
                : "flex flex-col items-center gap-1.5 p-1 w-20 sm:w-22",
              isActive && isHorizontal && "bg-foreground text-background border-foreground font-bold shadow-xs",
              !isActive && isHorizontal && "bg-card text-muted-foreground hover:text-foreground border-border/80 hover:bg-muted/50",
            )}
          >
            {/* Foto ou Ícone Squircle */}
            <div
              className={cn(
                "rounded-2xl overflow-hidden flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                isHorizontal
                  ? "size-8 bg-muted"
                  : "size-16 sm:size-18 bg-muted/60 border border-border/60 shadow-2xs",
                isActive && !isHorizontal && "ring-2 ring-foreground shadow-xs",
              )}
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.label}
                  loading="lazy"
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              ) : IconComponent ? (
                <IconComponent size={isHorizontal ? 18 : 28} weight="bold" className="text-primary" />
              ) : (
                <span className="text-xs font-bold text-muted-foreground">
                  {item.label.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            {/* Texto Configurável */}
            {hasText && (
              <span
                className={cn(
                  "tracking-tight truncate",
                  isHorizontal
                    ? "text-xs font-bold leading-none max-w-28"
                    : "text-2xs font-bold text-center leading-tight max-w-20 break-words",
                  isActive && !isHorizontal ? "text-foreground font-black" : "text-muted-foreground group-hover:text-foreground",
                )}
              >
                {item.label}
              </span>
            )}

            {/* Badge de Destaque */}
            {item.badge && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-red-600 text-white text-3xs font-black uppercase tracking-wider shadow-xs">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
