import * as React from "react";
import { Tag } from "lucide-react";
/**
 * discovery-control-bar.tsx — Componente Canônico Universal de Filtro, Busca e Visualização (3 Modos)
 * Padrão BigTech: Grade (Grid), Lista (iFood / 99) e Feed (Carrosséis por Loja/Departamento)
 */

import { MagnifyingGlass, X, SquaresFour, ListDashes, Rows, SlidersHorizontal, Truck, Flame } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

 // Ordenação Opcional Desktop
 sortOption?: string;
 onSortChange?: (value: string) => void;
 sortOptions?: Array<{ value: string; label: string }>;
}

export function DiscoveryControlBar({
 search = "",
 onSearchChange = () => {},
 searchPlaceholder = "Buscar na loja ou produtos...",
 categories = [],
 activeCategory,
 onSelectCategory,
 viewMode = "grid",
 onViewModeChange,
 allowedViewModes = ["grid", "list", "feed"],
 fastFilters = [],
 resultsCount,
 className = "",
 sortOption,
 onSortChange,
 sortOptions,
}: DiscoveryControlBarProps) {
  const tabsContainerRef = React.useRef<HTMLDivElement>(null);
  const activeTabRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Atalho Desktop ⌘K / Ctrl+K para focar busca instantaneamente
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar se o usuário já estiver digitando em outro input, textarea ou contentEditable
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

 return (
 <section aria-label="Controles e Filtros" className={`space-y-3 w-full ${className}`}>
      {/* ── 1. LINHA SUPERIOR: BUSCA CONTEXTUAL + COMUTADOR DE VISUALIZAÇÃO EM LINHA ÚNICA RESPONSIVA ── */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 w-full">
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
            className="pl-9.5 pr-12 h-10 rounded-xl bg-card border-border text-xs focus:ring-1 focus:ring-primary w-full"
            aria-label="Buscar produtos ou categorias"
          />
          {search ? (
            <button
              type="button"
              onClick={() => {
                onSearchChange("");
                inputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/80 transition-colors"
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

        {/* Seletor Desktop de Ordenação (Integrado em Linha Única) */}
        {sortOptions && sortOptions.length > 0 && onSortChange && (
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <select
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value)}
              className="h-10 px-3 rounded-xl bg-card border border-border text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary cursor-pointer hover:border-foreground/30 transition-colors"
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

        {/* Comutador de Visualização (Mesma Linha) */}
        {allowedViewModes.length > 1 && onViewModeChange && (
          <div className="flex items-center p-1 rounded-2xl bg-muted/60 shrink-0">
            {allowedViewModes.includes("grid") && (
              <button
                type="button"
                onClick={() => onViewModeChange("grid")}
                className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Visualização em Grade"
                aria-label="Modo Grade"
              >
                <SquaresFour size={16} weight="bold" />
              </button>
            )}

            {allowedViewModes.includes("list") && (
              <button
                type="button"
                onClick={() => onViewModeChange("list")}
                className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Visualização em Lista (Padrão Delivery)"
                aria-label="Modo Lista"
              >
                <ListDashes size={16} weight="bold" />
              </button>
            )}

            {allowedViewModes.includes("feed") && (
              <button
                type="button"
                onClick={() => onViewModeChange("feed")}
                className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "feed"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Visualização em Feed (Carrosséis por Loja/Departamento)"
                aria-label="Modo Feed"
              >
                <Rows size={16} weight="bold" />
              </button>
            )}
          </div>
        )}
      </div>

 {/* ── 2. LINHA DE BOTÕES DE CATEGORIAS (PADRÃO UNIVERSAL: DYNAMIC MEDIA CHIP) ── */}
 {categories.length > 0 && onSelectCategory && (
 <div
 ref={tabsContainerRef}
 className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 w-full px-0.5 focus:outline-none"
 >
 {categories.map((chip) => {
 const isActive = activeCategory === chip.id || (!activeCategory && chip.id === "todos");

 return (
 <div
 key={chip.id}
 ref={isActive ? (el) => { activeTabRef.current = el; } : undefined}
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
 })}
 </div>
 )}

 {/* ── 3. FILTROS RÁPIDOS ADICIONAIS (Frete Grátis, Ofertas Relâmpago, etc.) ── */}
 {fastFilters.length > 0 && (
 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-0.5">
 {fastFilters.map((filter) => {
 const Icon = filter.icon;
 return (
 <button
 key={filter.id}
 type="button"
 onClick={filter.onToggle}
 className={`h-7.5 px-3 rounded-xl text-[11px] font-medium shrink-0 transition-all flex items-center gap-1.5 cursor-pointer border ${
 filter.active
 ? "bg-primary/10 border-primary text-primary font-bold"
 : "bg-card border-border/80 text-muted-foreground hover:text-foreground"
 }`}
 >
 {Icon && <Icon size={13} weight={filter.active ? "fill" : "bold"} />}
 <span>{filter.label}</span>
 </button>
 );
 })}
 </div>
 )}
 </section>
 );
}
