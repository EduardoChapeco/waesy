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
import { DynamicMediaChip, type MediaChipTexture } from "@/components/commerce/dynamic-media-chip";

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

  const [isMlFilterOpen, setIsMlFilterOpen] = React.useState(false);
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = React.useState(Boolean(search));

  const computedActiveCount =
    activeFiltersCount +
    (activeCategory && activeCategory !== "todos" ? 1 : 0) +
    fastFilters.filter((f) => f.active).length;

  const handleOpenFilterEngine = () => {
    if (onFilterClick) {
      onFilterClick();
    } else {
      setIsMlFilterOpen(true);
    }
  };

  return (
    <section aria-label="Controles e Filtros" className={cn("space-y-2 sm:space-y-3 w-full px-4 sm:px-0", stickyClasses, className)}>
      {/* ── 1. LINHA SUPERIOR: MOTOR DE BUSCA & FILTRO CONTEXTUAL (ML-STYLE) ── */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 w-full">
        {/* Campo de Busca Contextual (No Mobile recolhe para dar respiro até clicar na Lupa) */}
        <div className={cn("relative flex-1 min-w-0", !isMobileSearchExpanded && !search ? "hidden sm:block" : "block")}>
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
            className="pl-9 pr-8 sm:pr-12 h-11 rounded-xl bg-card border-border/70 text-base sm:text-sm placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-primary w-full shadow-2xs"
            aria-label="Buscar"
          />
          {search || isMobileSearchExpanded ? (
            <button
              type="button"
              onClick={() => {
                onSearchChange("");
                setIsMobileSearchExpanded(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/80 transition-colors cursor-pointer"
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

        {/* Mobile Compact Trigger Strip (Quando a busca está recolhida no Mobile) */}
        {!isMobileSearchExpanded && !search && (
          <button
            type="button"
            onClick={() => {
              setIsMobileSearchExpanded(true);
              setTimeout(() => inputRef.current?.focus(), 40);
            }}
            className="sm:hidden flex-1 h-11 px-3.5 rounded-xl bg-card border border-border/70 flex items-center gap-2.5 text-left text-xs text-muted-foreground active:scale-98 transition-all"
          >
            <MagnifyingGlass size={16} weight="bold" className="text-foreground/70 shrink-0" />
            <span className="truncate">{searchPlaceholder}</span>
          </button>
        )}

        {/* Seletor Desktop de Ordenação (Opcional) */}
        {sortOptions && sortOptions.length > 0 && onSortChange && (
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <select
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value)}
              className="h-11 px-3 rounded-xl bg-card border border-border/70 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary cursor-pointer hover:border-foreground/30 transition-colors shadow-2xs"
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

        {/* Botão de Funil / ML-Filter Modal (Sempre disponível 44x44px h-11) */}
        <Button
          type="button"
          variant="outline"
          onClick={handleOpenFilterEngine}
          className={cn(
            "h-11 min-w-[44px] px-3.5 rounded-xl border border-border/70 text-xs sm:text-sm font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs transition-all active:scale-95",
            computedActiveCount > 0
              ? "bg-primary/10 border-primary/40 text-primary font-bold"
              : "bg-card hover:bg-muted/50 text-foreground"
          )}
          title="Filtrar e Ordenar"
          aria-label="Abrir filtros"
        >
          <SlidersHorizontal size={16} weight="bold" className="shrink-0" />
          <span>{filterLabel}</span>
          {computedActiveCount > 0 && (
            <span className="size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
              {computedActiveCount}
            </span>
          )}
        </Button>

        {/* Comutador de Visualização Desktop (No Mobile vive dentro do ML-Filter Modal) */}
        {allowedViewModes.length > 1 && onViewModeChange && (
          <div className="hidden sm:flex items-center p-1 rounded-xl bg-muted/40 border border-border/50 shrink-0 h-11">
            {allowedViewModes.includes("feed") && (
              <button
                type="button"
                onClick={() => onViewModeChange("feed")}
                className={cn(
                  "h-full px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center",
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
                  "h-full px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center",
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
                  "h-full px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center",
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

      {/* ── ML-FILTER MODAL (100dvh Expandable Sheet - Padrão Mercado Livre) ── */}
      {isMlFilterOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filtros e Visualização"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full h-[100dvh] sm:h-auto sm:max-h-[88dvh] sm:max-w-lg bg-background sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            <div className="px-4 h-14 border-b border-border/60 flex items-center justify-between shrink-0">
              <span className="text-base font-bold text-foreground">
                Filtros e Ordenação
              </span>
              <button
                type="button"
                onClick={() => setIsMlFilterOpen(false)}
                aria-label="Fechar filtros"
                className="size-11 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
              {/* Modo de Exibição */}
              {allowedViewModes.length > 1 && onViewModeChange && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Modo de Exibição
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {allowedViewModes.map((mode) => {
                      const active = viewMode === mode;
                      const label = mode === "grid" ? "Grade" : mode === "list" ? "Lista" : "Feed";
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => onViewModeChange(mode)}
                          className={cn(
                            "h-11 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
                            active
                              ? "border-primary bg-primary/10 text-primary font-bold"
                              : "border-border/60 text-muted-foreground"
                          )}
                        >
                          {mode === "grid" && <SquaresFour size={15} weight={active ? "fill" : "bold"} />}
                          {mode === "list" && <ListDashes size={15} weight={active ? "fill" : "bold"} />}
                          {mode === "feed" && <Rows size={15} weight={active ? "fill" : "bold"} />}
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Categorias */}
              {categories.length > 0 && onSelectCategory && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Categorias
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((cat) => {
                      const isActive = activeCategory === cat.id || (!activeCategory && cat.id === "todos");
                      const cleanLabel = cat.label.replace(/\s+&\s+/g, " e ");
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => onSelectCategory(cat.id)}
                          className={cn(
                            "h-11 px-3 rounded-xl border text-xs font-semibold flex items-center gap-2 text-left transition-all truncate",
                            isActive
                              ? "border-primary bg-primary/10 text-primary font-bold"
                              : "border-border/60 bg-card text-foreground"
                          )}
                        >
                          {cat.emoji && <span>{cat.emoji}</span>}
                          <span className="truncate">{cleanLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Filtros Rápidos */}
              {fastFilters.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Destaques Rápidos
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {fastFilters.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={f.onToggle}
                        className={cn(
                          "h-11 px-4 rounded-xl border text-xs font-semibold transition-all",
                          f.active
                            ? "border-primary bg-primary/10 text-primary font-bold"
                            : "border-border/60 bg-card text-muted-foreground"
                        )}
                      >
                        {f.label.replace(/\s+&\s+/g, " e ")}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border/60 flex items-center gap-3 shrink-0 bg-background">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onSearchChange("");
                  if (onSelectCategory) onSelectCategory("todos");
                  setIsMlFilterOpen(false);
                }}
                className="h-12 flex-1 rounded-xl font-bold text-xs"
              >
                Limpar Filtros
              </Button>
              <Button
                type="button"
                onClick={() => setIsMlFilterOpen(false)}
                className="h-12 flex-1 rounded-xl font-bold text-xs"
              >
                Ver Resultados
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. LINHA DE BOTÕES DE CATEGORIAS (FÍSICA HORIZONTAL SNAP & FADE MASK - V116) ── */}
      {categories.length > 0 && onSelectCategory && (
        <div className="relative w-full overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background via-background/70 to-transparent z-10"
          />
          <div
            ref={tabsContainerRef}
            className="flex items-center overflow-x-auto snap-x snap-mandatory scrollbar-hide no-scrollbar gap-2 py-1.5 px-3 sm:px-0.5 pr-10 w-full focus:outline-none"
          >
            {categories.map((chip) => {
              const isActive = activeCategory === chip.id || (!activeCategory && chip.id === "todos");
              const Icon = chip.icon;
              const cleanLabel = chip.label.replace(/\s+&\s+/g, " e ");

              // Se for DynamicMediaChip com imagem de fundo ou textura
              if (chip.bg_media_type && chip.bg_media_type !== "none") {
                return (
                  <div
                    key={chip.id}
                    ref={isActive ? (el) => { activeTabRef.current = el as any; } : undefined}
                    className="snap-start shrink-0"
                  >
                    <DynamicMediaChip
                      id={chip.id}
                      label={cleanLabel}
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

              // Padrão Canônico: Botão Grande h-10 sm:h-11 rounded-xl com Snap Start
              return (
                <button
                  key={chip.id}
                  ref={isActive ? (el) => { activeTabRef.current = el; } : undefined}
                  type="button"
                  onClick={() => onSelectCategory(chip.id)}
                  className={cn(
                    "snap-start h-10 sm:h-11 px-3.5 sm:px-4 rounded-xl border text-xs sm:text-sm font-semibold shrink-0 flex items-center gap-2 transition-all cursor-pointer select-none whitespace-nowrap active:scale-98 shadow-2xs",
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
                  <span>{cleanLabel}</span>
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
        </div>
      )}

      {/* ── 3. FILTROS RÁPIDOS ADICIONAIS (Frete Grátis, Ofertas Relâmpago, etc.) ── */}
      {fastFilters.length > 0 && (
        <div className="relative w-full overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background via-background/70 to-transparent z-10"
          />
          <div className="flex items-center overflow-x-auto snap-x snap-mandatory scrollbar-hide no-scrollbar gap-2 pt-0.5 px-3 sm:px-0.5 pr-10">
            {fastFilters.map((filter) => {
              const Icon = filter.icon;
              const cleanFilterLabel = filter.label.replace(/\s+&\s+/g, " e ");
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={filter.onToggle}
                  className={cn(
                    "snap-start h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap border shadow-2xs active:scale-98",
                    filter.active
                      ? "bg-primary/10 border-primary/40 text-primary font-bold"
                      : "bg-card border-border/70 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {Icon && <Icon className="size-3.5 shrink-0" weight={filter.active ? "fill" : "bold"} />}
                  <span>{cleanFilterLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
