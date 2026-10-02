import React from "react";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { ClassifiedItemCard } from "./classified-item-card";
import { ClassifiedCatalogEmptyState } from "./classified-catalog-empty-state";
import type { ViewModeType } from "@/components/commerce/discovery-control-bar";

export interface ClassifiedCatalogGridProps {
  items: any[];
  viewMode: ViewModeType;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onSetGridMode: () => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

export function ClassifiedCatalogGrid({
  items,
  viewMode,
  selectedCategory,
  onSelectCategory,
  onSetGridMode,
  hasActiveFilters = false,
  onClearFilters,
}: ClassifiedCatalogGridProps) {
  if (items.length === 0) {
    return (
      <ClassifiedCatalogEmptyState
        hasActiveFilters={hasActiveFilters}
        onClearFilters={onClearFilters}
      />
    );
  }

  if (viewMode === "list") {
    return (
      <section className="flex flex-col space-y-3 w-full animate-in fade-in duration-200">
        {items.map((item) => (
          <ClassifiedItemCard key={item.id} item={item} variant="list" />
        ))}
      </section>
    );
  }

  if (viewMode === "feed") {
    const categoriesToRender =
      selectedCategory === "todos"
        ? ["travel", "real_estate", "vehicle", "business", "food", "sale", "service", "digital", "donation"]
        : [selectedCategory];

    return (
      <section className="space-y-10 animate-in fade-in duration-200">
        {categoriesToRender.map((catKey) => {
          const catItems = items.filter((i: any) => {
            if (i.category === catKey) return true;
            if (
              catKey === "travel" &&
              (i.category === "viagem" || i.category === "tourism" || i.attributes?.niche_category === "travel")
            ) {
              return true;
            }
            if (
              catKey === "food" &&
              (i.category === "gastronomia" || i.attributes?.niche_category === "food")
            ) {
              return true;
            }
            if (catKey === "digital" && (i.is_digital || i.attributes?.is_digital)) {
              return true;
            }
            return false;
          });

          if (catItems.length === 0) return null;

          const catTitle =
            catKey === "travel"
              ? "Turismo"
              : catKey === "real_estate"
              ? "Imóveis"
              : catKey === "vehicle"
              ? "Veículos"
              : catKey === "business"
              ? "Negócios"
              : catKey === "food"
              ? "Gastronomia"
              : catKey === "sale"
              ? "Desapego"
              : catKey === "digital"
              ? "Produtos Digitais"
              : catKey === "donation"
              ? "Doações"
              : "Serviços";

          return (
            <HorizontalRail
              key={catKey}
              title={catTitle}
              hideHeader={true}
              actionLabel="Ver todos"
              onAction={() => {
                onSelectCategory(catKey);
                onSetGridMode();
              }}
            >
              {catItems.map((item) => (
                <ClassifiedItemCard key={item.id} item={item} variant="feed" />
              ))}
            </HorizontalRail>
          );
        })}
      </section>
    );
  }

  // Grid mode (default)
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6 items-stretch animate-in fade-in duration-200">
      {items.map((item) => (
        <ClassifiedItemCard key={item.id} item={item} variant="grid" />
      ))}
    </section>
  );
}
