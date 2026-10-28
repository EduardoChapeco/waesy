import React from "react";
import { Tag, Utensils, Shirt, Laptop, HeartPulse, Car, Home } from "lucide-react";

export interface CategoryGridItem {
  id: string;
  name: string;
  count?: number;
  iconName?: string;
}

export interface CategoryGridProps {
  categories?: CategoryGridItem[];
  themeColor?: string;
  onSelectCategory?: (categoryId: string) => void;
}

function getCategoryIcon(name: string) {
  switch (name) {
    case "food":
      return Utensils;
    case "fashion":
      return Shirt;
    case "tech":
      return Laptop;
    case "health":
      return HeartPulse;
    case "home":
      return Home;
    case "auto":
      return Car;
    default:
      return Tag;
  }
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
    onSelectCategory,
}) => {
  if (!categories || categories.length === 0) return null;
  return (
    <div className="w-full space-y-2 select-none">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-foreground tracking-tight">Categorias</span>
        <span className="text-xs text-muted-foreground font-medium">Ver todas</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {categories.map((cat) => {
          const Icon = getCategoryIcon(cat.iconName || "default");
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory?.(cat.id)}
              className="flex items-center gap-3 p-3 rounded-lg border border-border/70 bg-card hover:bg-muted/50 transition-colors text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div
                className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
              >
                <Icon className="size-4" />
              </div>

              <div className="min-w-0 flex-1">
                <h6 className="text-xs font-semibold text-foreground truncate">{cat.name}</h6>
                {cat.count !== undefined && (
                  <p className="text-xs text-muted-foreground">{cat.count} itens</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
