import * as React from "react";
/**
 * discovery-control-bar.tsx — Componente Canônico Universal de Filtro, Busca e Visualização (3 Modos)
 * Padrão BigTech: Grade (Grid), Lista (iFood / 99) e Feed (Carrosséis por Loja/Departamento)
 * Suporte a Botões Grandes, Filtros Avançados e Desacoplamento de Scroll Mobile vs Desktop
 */

import { MagnifyingGlass, X, SquaresFour, ListDashes, Rows, SlidersHorizontal, Truck, Flame } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DynamicMediaChip,
  type MediaChipTexture,
} from "@/components/commerce/dynamic-media-chip";

export type ViewModeType = "grid" | "list" | "feed";

export interface FilterChipOption {
  id: string;
  label: string;
  icon?: React.ElementType;
  icon_url?: string;
  emoji?: string;
  count?: number;
  badge?: string;
  bg_media_type?: "none" | "image" | "video" | "gif" | null;
  bg_media_url?: string | null;
  bg_color?: string | null;
  bg_overlay_opacity?: number | null;
  bg_texture?: MediaChipTexture | null;
}

export interface DiscoveryControlBarProps {
  // Busca
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  // Filtros Avançados (Botão Grande)
  onFilterClick?: () => void;
  filterLabel?: string;
  activeFiltersCount?: number;

  // Categorias / Chips
  categories?: FilterChipOption[];
  activeCategory?: string;
  onSelectCategory?: (id: string) => void;

  // Modos de Visualização (Grade / Lista / Feed)
  viewMode?: ViewModeType;
  onViewModeChange?: (mode: ViewModeType) => void;
  allowedViewModes?: ViewModeType[];

  // Filtros rápidos adicionais
  fastFilters?: {
    id: string;
    label: string;
    icon?: React.ElementType;
    active: boolean;
    onToggle: () => void;
  }[];

  // Total de itens encontrados
  resultsCount?: number;
  className?: string;

  // Comportamento Sticky Responsivo (Elimina corte no Desktop)
  stickyMode?: "mobile-only" | "always" | "none";

  // Ordenação Opcional Desktop
  sortOption?: string;
  onSortChange?: (value: string) => void;
  sortOptions?: Array<{ value: string; label: string }>;
}

export function DiscoveryControlBar({
  search = "",
  onSearchChange = () => {},
  searchPlaceholder = "Buscar na loja ou produtos...",
  onFilterClick,
  filterLabel = "Filtros",
  activeFiltersCount = 0,
  categories = [],
  activeCategory,
  onSelectCategory,
  viewMode = "grid",
  onViewModeChange,
  allowedViewModes = ["grid", "list", "feed"],
  fastFilters = [],
  resultsCount,
  className = "",
  stickyMode = "mobile-only",
  sortOption,
  onSortChange,
  sortOptions,
}: DiscoveryControlBarProps) {
  const tabsContainerRef = React.useRef<HTMLDivElement>(null);
  const activeTabRef = React.useRef<HTMLButtonElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Atalho Desktop ⌘K / Ctrl+K para focar busca instantaneamente
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-centralização suave de abas HORIZONTALMENTE sem jamais tocar no eixo vertical
  React.useEffect(() => {
    if (activeCategory && activeTabRef.current && tabsContainerRef.current) {
      const container = tabsContainerRef.current;
      const tab = activeTabRef.current;
      const left = tab.offsetLeft - container.clientWidth / 2 + tab.clientWidth / 2;
      container.scrollTo({ left, behavior: "smooth" });
    }
  }, [activeCategory]);

  const stickyClasses =
    stickyMode === "mobile-only"
      ? "sticky top-0 lg:static z-20 bg-background/95 lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none pt-1 pb-2 border-b border-border/40 lg:border-b-0"
      : stickyMode === "always"
      ? "sticky top-0 z-20 bg-background/95 backdrop-blur-md pt-1 pb-2 border-b border-border/40"
      : "";

  return (
    <section aria-label="Controles e Filtros" className={cn("space-y-2.5 sm:space-y-3 w-full", stickyClasses, className)}>
      {/* ── 1. LINHA SUPERIOR: BUSCA CONTEXTUAL + FILTROS + COMUTADOR DE VISUALIZAÇÃO EM LINHA ÚNICA RESPONSIVA ── */}
      <div className="flex items-center gap-2 sm:gap-3 w-full">
        {/* Campo de Busca Contextual com Ícone, Atalho Desktop e Botão Clear */}
        <div className="relative flex-1 min-w-0">
          <MagnifyingGlass
            size={16}
            weight="bold"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            ref={inputRef}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9.5 pr-12 h-10 sm:h-11 rounded-xl bg-card border-border/70 text-xs sm:text-sm placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-primary w-full shadow-2xs"
            aria-label="Buscar produtos ou categorias"
          />
          {search ? (
            <button
              type="button"
              onClick={() => {
                onSearchChange("");
                inputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/80 transition-colors cursor-pointer"
              aria-label="Limpar busca"
            >
              <X size={14} weight="bold" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 select-none rounded border border-border/80 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground/80">
              <span className="text-[11px]">⌘</span>K
            </kbd>
          )}
        </div>

        {/* Seletor Desktop de Ordenação (Opcional) */}
        {sortOptions && sortOptions.length > 0 && onSortChange && (
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <select
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value)}
              className="h-10 sm:h-11 px-3 rounded-xl bg-card border border-border/70 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary cursor-pointer hover:border-foreground/30 transition-colors shadow-2xs"
              aria-label="Ordenar resultados"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Botão de Filtros Avançados (Padrão Canônico Grande) */}
        {onFilterClick && (
          <Button
            type="button"
            variant="outline"
            onClick={onFilterClick}
            className={cn(
              "h-10 sm:h-11 px-3 sm:px-3.5 rounded-xl border border-border/70 text-xs sm:text-sm font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs transition-all active:scale-95",
              activeFiltersCount > 0
                ? "bg-primary/10 border-primary/40 text-primary font-bold"
                : "bg-card hover:bg-muted/50 text-foreground"
            )}
            title="Filtros Avançados"
            aria-label="Abrir filtros"
          >
            <SlidersHorizontal size={16} weight="bold" className="shrink-0" />
            <span className="hidden sm:inline">{filterLabel}</span>
            {activeFiltersCount > 0 && (
              <span className="size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        )}

        {/* Comutador de Visualização (Grade / Lista / Feed) */}
        {allowedViewModes.length > 1 && onViewModeChange && (
          <div className="flex items-center p-1 rounded-xl bg-muted/40 border border-border/50 shrink-0 h-10 sm:h-11">
            {allowedViewModes.includes("feed") && (
              <button
                type="button"
                onClick={() => onViewModeChange("feed")}
                className={cn(
                  "h-full px-2 sm:px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center",
                  viewMode === "feed"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Modo Feed"
                aria-label="Modo Feed"
              >
                <Rows size={16} weight={viewMode === "feed" ? "fill" : "bold"} />
              </button>
            )}

            {allowedViewModes.includes("grid") && (
              <button
                type="button"
                onClick={() => onViewModeChange("grid")}
                className={cn(
                  "h-full px-2 sm:px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center",
                  viewMode === "grid"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Modo Grade"
                aria-label="Modo Grade"
              >
                <SquaresFour size={16} weight={viewMode === "grid" ? "fill" : "bold"} />
              </button>
            )}

            {allowedViewModes.includes("list") && (
              <button
                type="button"
                onClick={() => onViewModeChange("list")}
                className={cn(
                  "h-full px-2 sm:px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center",
                  viewMode === "list"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Modo Lista"
                aria-label="Modo Lista"
              >
                <ListDashes size={16} weight={viewMode === "list" ? "fill" : "bold"} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── 2. LINHA DE BOTÕES DE CATEGORIAS (PADRÃO UNIVERSAL: BOTÕES GRANDES h-10 sm:h-11) ── */}
      {categories.length > 0 && onSelectCategory && (
        <div
          ref={tabsContainerRef}
          className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 w-full px-0.5 focus:outline-none"
        >
          {categories.map((chip) => {
            const isActive = activeCategory === chip.id || (!activeCategory && chip.id === "todos");
            const Icon = chip.icon;

            // Se for DynamicMediaChip com imagem de fundo ou textura
            if (chip.bg_media_type && chip.bg_media_type !== "none") {
              return (
                <div
                  key={chip.id}
                  ref={isActive ? (el) => { activeTabRef.current = el as any; } : undefined}
                  className="shrink-0"
                >
                  <DynamicMediaChip
                    id={chip.id}
                    label={chip.label}
                    onClick={() => onSelectCategory(chip.id)}
                    icon={chip.icon}
                    icon_url={chip.icon_url}
                    emoji={chip.emoji}
                    badge={chip.badge}
                    count={chip.count}
                    isActive={isActive}
                    bg_media_type={chip.bg_media_type}
                    bg_media_url={chip.bg_media_url}
                    bg_color={chip.bg_color}
                    bg_overlay_opacity={chip.bg_overlay_opacity}
                    bg_texture={chip.bg_texture}
                    size="md"
                  />
                </div>
              );
            }

            // Padrão Canônico: Botão Grande h-10 sm:h-11 rounded-xl
            return (
              <button
                key={chip.id}
                ref={isActive ? (el) => { activeTabRef.current = el; } : undefined}
                type="button"
                onClick={() => onSelectCategory(chip.id)}
                className={cn(
                  "h-10 sm:h-11 px-3.5 sm:px-4 rounded-xl border text-xs sm:text-sm font-semibold shrink-0 flex items-center gap-2 transition-all cursor-pointer select-none active:scale-98 shadow-2xs",
                  isActive
                    ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                    : "bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground border-border/70"
                )}
              >
                {chip.icon_url ? (
                  <img src={chip.icon_url} alt="" className="size-4 object-contain shrink-0" />
                ) : Icon ? (
                  <Icon className={cn("size-4 shrink-0", isActive ? "text-background" : "text-muted-foreground/80")} />
                ) : chip.emoji ? (
                  <span className="text-sm shrink-0">{chip.emoji}</span>
                ) : null}
                <span>{chip.label}</span>
                {chip.count !== undefined && chip.count > 0 && (
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-md font-mono",
                      isActive ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {chip.count}
                  </span>
                )}
                {chip.badge && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground font-bold uppercase tracking-wider">
                    {chip.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── 3. FILTROS RÁPIDOS ADICIONAIS (Frete Grátis, Ofertas Relâmpago, etc.) ── */}
      {fastFilters.length > 0 && (
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pt-0.5">
          {fastFilters.map((filter) => {
            const Icon = filter.icon;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={filter.onToggle}
                className={cn(
                  "h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer border shadow-2xs active:scale-98",
                  filter.active
                    ? "bg-primary/10 border-primary/40 text-primary font-bold"
                    : "bg-card border-border/70 text-muted-foreground hover:text-foreground"
                )}
              >
                {Icon && <Icon className="size-3.5 shrink-0" weight={filter.active ? "fill" : "bold"} />}
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
