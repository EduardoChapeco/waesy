import React from "react";
import {
  Tag,
  Plant,
  BeerBottle,
  Cookie,
  Flame,
  Drop,
  ShoppingBag,
  Broom,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface SupermarketCategoryItem {
  id: string;
  label: string;
  imageUrl?: string;
  icon?: any;
  badge?: string;
}

export const CANONICAL_SUPERMARKET_CATEGORIES: SupermarketCategoryItem[] = [
  { id: "ofertas", label: "Ofertas", icon: Tag, badge: "Descontos" },
  { id: "hortifruti", label: "Hortifrúti", icon: Plant },
  { id: "padaria", label: "Padaria", icon: Cookie },
  { id: "bebidas", label: "Bebidas", icon: BeerBottle },
  { id: "carnes", label: "Açougue", icon: Flame },
  { id: "laticinios", label: "Frios & Leite", icon: Drop },
  { id: "mercearia", label: "Mercearia", icon: ShoppingBag },
  { id: "limpeza", label: "Limpeza", icon: Broom },
];

interface SupermarketCategoryCircleDockProps {
  categories?: SupermarketCategoryItem[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  className?: string;
}

export function SupermarketCategoryCircleDock({
  categories = CANONICAL_SUPERMARKET_CATEGORIES,
  selectedCategoryId,
  onSelectCategory,
  className,
}: SupermarketCategoryCircleDockProps) {
  return (
    <nav
      aria-label="Departamentos de Supermercado"
      className={cn("w-full overflow-x-auto scroll-area-carousel scrollbar-none py-2 px-4 select-none", className)}
    >
      <div className="flex items-center gap-3 w-max min-w-full">
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          const IconComp = cat.icon || ShoppingBag;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className="flex flex-col items-center gap-2 focus-visible:outline-none group shrink-0 min-w-16"
              aria-label={`Departamento ${cat.label}`}
              aria-pressed={isSelected}
            >
              <div
                className={cn(
                  "size-14 rounded-full flex items-center justify-center transition duration-200 border-2 overflow-hidden relative group-focus-visible:ring-2 group-focus-visible:ring-primary",
                  isSelected
                    ? "border-primary bg-muted text-primary scale-105"
                    : "border-border bg-muted text-muted-foreground group-hover:border-foreground group-hover:text-foreground",
                )}
              >
                {cat.imageUrl ? (
                  <img
                    src={cat.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <IconComp size={24} weight={isSelected ? "duotone" : "regular"} />
                )}

                {cat.badge ? (
                  <span className="absolute -top-1 -right-1 px-1 py-1 text-3xs font-extrabold rounded-full bg-primary text-primary-foreground">
                    %
                  </span>
                ) : null}
              </div>

              <span
                className={cn(
                  "text-xs font-semibold leading-tight text-center line-clamp-2 text-anti-truncate max-w-18",
                  isSelected ? "text-primary font-bold" : "text-foreground group-hover:text-foreground",
                )}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
