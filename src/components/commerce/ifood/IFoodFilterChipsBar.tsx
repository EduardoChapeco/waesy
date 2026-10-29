import React from "react";
import { CaretDown, Lightning, Tag, ShieldCheck, Star } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface FilterChipItem {
  id: string;
  label: string;
  hasDropdown?: boolean;
  icon?: React.ComponentType<any>;
}

export const CANONICAL_COMMERCE_FILTERS: FilterChipItem[] = [
  { id: "ordenar", label: "Ordenar", hasDropdown: true },
  { id: "turbo", label: "Turbo", icon: Lightning },
  { id: "entrega_gratis", label: "Entrega grátis" },
  { id: "super_restaurantes", label: "Super Lojas", icon: Star },
  { id: "gourmet", label: "Gourmet" },
  { id: "promocao", label: "Promoção", icon: Tag },
  { id: "rastreavel", label: "Entrega Rastreável", icon: ShieldCheck },
  { id: "distancia", label: "Perto de mim" },
];

export const CANONICAL_IFOOD_FILTERS = CANONICAL_COMMERCE_FILTERS;
export type CommerceFilterChipsBarProps = IFoodFilterChipsBarProps;
export const CommerceFilterChipsBar = IFoodFilterChipsBar;

export interface IFoodFilterChipsBarProps {
  activeFilters?: string[];
  onToggleFilter?: (id: string) => void;
  className?: string;
}

export function IFoodFilterChipsBar({
  activeFilters = [],
  onToggleFilter,
  className,
}: IFoodFilterChipsBarProps) {
  return (
    <div
      aria-label="Filtros de Lojas"
      className={cn(
        "w-full flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-3 sm:px-4 snap-x snap-mandatory [mask-image:linear-gradient(to_right,black_92%,transparent_100%)]",
        className,
      )}
      data-testid="ifood-filter-chips-bar"
    >
      {CANONICAL_IFOOD_FILTERS.map((chip) => {
        const isActive = activeFilters.includes(chip.id);
        const IconComponent = chip.icon;

        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onToggleFilter?.(chip.id)}
            className={cn(
              "h-11 min-h-11 px-3 rounded-full border text-xs font-semibold flex items-center gap-2 shrink-0 snap-start transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              isActive
                ? "bg-foreground text-background border-foreground font-bold"
                : "bg-card text-muted-foreground hover:text-foreground border-border/80 hover:bg-muted/50",
            )}
          >
            {IconComponent && (
              <IconComponent
                size={14}
                weight={isActive ? "fill" : "bold"}
                className={isActive ? "text-background" : "text-primary"}
              />
            )}
            <span>{chip.label}</span>
            {chip.hasDropdown && (
              <CaretDown size={12} weight="bold" className="shrink-0 text-muted-foreground" />
            )}
          </button>
        );
      })}
    </div>
  );
}
