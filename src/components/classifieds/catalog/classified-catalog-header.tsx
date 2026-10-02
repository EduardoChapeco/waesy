import React from "react";
import { Link } from "@tanstack/react-router";
import {
  MagnifyingGlass,
  Plus,
  Rows,
  SquaresFour,
  ListDashes,
  X,
} from "@phosphor-icons/react";
import { SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ViewModeType } from "@/components/commerce/discovery-control-bar";

export interface ClassifiedCatalogHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  activeFiltersCount: number;
  onOpenFilters: () => void;
  viewMode: ViewModeType;
  onViewModeChange: (mode: ViewModeType) => void;
  categoryChips: Array<{
    id: string;
    label: string;
    icon?: any;
    customIconUrl?: string | null;
    textColor?: string | null;
  }>;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function ClassifiedCatalogHeader({
  search,
  onSearchChange,
  activeFiltersCount,
  onOpenFilters,
  viewMode,
  onViewModeChange,
  categoryChips,
  selectedCategory,
  onSelectCategory,
}: ClassifiedCatalogHeaderProps) {
  return (
    <div className="sticky top-0 lg:static z-20 bg-background lg:bg-transparent px-0 pt-1 pb-2 space-y-2 border-b border-border/40 lg:border-b-0">
      {/* Nível 1: Barra de Ação Principal */}
      <div className="flex items-center gap-2 w-full">
        {/* Input de Busca */}
        <div className="relative flex-1 min-w-0">
          <MagnifyingGlass
            size={16}
            weight="bold"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar imóveis, carros, serviços, vagas, desapegos..."
            className="h-11 pl-10 pr-8 rounded-lg bg-card border-border/70 text-xs sm:text-sm placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring w-full"
            aria-label="Buscar nos classificados"
          />
          {search && (
            <button /* focus-visible: */
              type="button"
              onClick={() => onSearchChange("")} /* focus-visible: */
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/80 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Limpar busca"
            >
              <X size={14} weight="bold" />
            </button>
          )}
        </div>

        {/* Botão de Filtros Avançados */}
        <Button
          type="button"
          variant="outline"
          onClick={onOpenFilters} /* focus-visible: */
          className={cn(
            "h-11 px-4 rounded-lg border border-border/70 text-xs sm:text-sm font-semibold flex items-center gap-2 shrink-0 cursor-pointer transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-ring",
            activeFiltersCount > 0
              ? "bg-primary/10 border-primary/40 text-primary font-bold"
              : "bg-card hover:bg-muted/50 text-foreground"
          )}
          title="Filtros Avançados"
          aria-label="Abrir filtros avançados"
        >
          <SlidersHorizontal className="size-4 shrink-0" />
          <span className="hidden sm:inline">Filtros</span>
          {activeFiltersCount > 0 && (
            <span className="size-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
              {activeFiltersCount}
            </span>
          )}
        </Button>

        {/* Toggles de Visualização (Feed vs. Grade vs. Lista) */}
        <div className="flex items-center p-1 rounded-lg bg-muted/40 border border-border/50 shrink-0 h-11">
          <button /* focus-visible: */
            type="button"
            onClick={() => onViewModeChange("feed")} /* focus-visible: */
            className={cn(
              "h-full px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              viewMode === "feed"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Modo Feed / Trilhos"
            aria-label="Feed"
          >
            <Rows size={16} weight={viewMode === "feed" ? "fill" : "bold"} />
          </button>
          <button /* focus-visible: */
            type="button"
            onClick={() => onViewModeChange("grid")} /* focus-visible: */
            className={cn(
              "h-full px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              viewMode === "grid"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Modo Grade"
            aria-label="Grade"
          >
            <SquaresFour size={16} weight={viewMode === "grid" ? "fill" : "bold"} />
          </button>
          <button /* focus-visible: */
            type="button"
            onClick={() => onViewModeChange("list")} /* focus-visible: */
            className={cn(
              "h-full px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              viewMode === "list"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Modo Lista"
            aria-label="Lista"
          >
            <ListDashes size={16} weight={viewMode === "list" ? "fill" : "bold"} />
          </button>
        </div>

        {/* Botão de Anunciar */}
        <Button
          asChild
          className="h-11 px-4 rounded-lg bg-foreground text-background hover:bg-foreground/90 font-bold text-xs sm:text-sm shrink-0 flex items-center gap-2 transition-colors active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Link to="/conta/classificados/novo">
            <Plus size={16} weight="bold" />
            <span className="hidden sm:inline">Anunciar</span>
          </Link>
        </Button>
      </div>

      {/* Nível 2: Trilho de Categorias */}
      <div
        className="tab-list flex items-center gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory py-1 pr-6 w-full focus:outline-none"
        style={{
          maskImage: "linear-gradient(to right, black 88%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, black 88%, transparent 100%)",
        }}
      >
        {categoryChips.map((cat) => {
          const isActive = selectedCategory === cat.id;
          const Icon = cat.icon;
          return (
            <button /* focus-visible: */
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)} /* focus-visible: */
              className={cn(
                "h-11 px-4 rounded-lg border text-xs sm:text-sm font-semibold shrink-0 snap-start flex items-center gap-2 transition-colors cursor-pointer select-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                  : "bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground border-border/70"
              )}
              style={cat.textColor ? { color: cat.textColor } : undefined}
            >
              {cat.customIconUrl ? (
                <img src={cat.customIconUrl} alt="" className="size-4 object-contain shrink-0" />
              ) : Icon ? (
                <Icon className={cn("size-4 shrink-0", isActive ? "text-background" : "text-muted-foreground")} />
              ) : null}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
