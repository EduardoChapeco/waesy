import React, { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { CaretLeft, MagnifyingGlass, Funnel, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useTelemetry } from "@/hooks/use-telemetry";

export interface NativeMobileHeaderProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  fallbackHref?: string;
  leftSlot?: React.ReactNode;
  rightActions?: React.ReactNode;
  badge?: React.ReactNode;
  bottomSlot?: React.ReactNode;
  transparent?: boolean;
  bordered?: boolean;
  centerTitle?: boolean;
  mobileOnly?: boolean;
  className?: string;
  /** Busca contextual embutida no cabeçalho (Padrão Mercado Livre / Apple HIG) */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Gatilho do ML-Filter Modal (Ícone de Funil com contador de filtros ativos) */
  onFilterClick?: () => void;
  activeFiltersCount?: number;
}

export function NativeMobileHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  fallbackHref = "/",
  leftSlot,
  rightActions,
  badge,
  bottomSlot,
  transparent = false,
  bordered = true,
  centerTitle = true,
  mobileOnly = false,
  className,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  onFilterClick,
  activeFiltersCount = 0,
}: NativeMobileHeaderProps) {
  const router = useRouter();
  const { trackSearch, trackClick } = useTelemetry();
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchValue));

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: (fallbackHref as any) || "/" });
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full select-none transition-colors",
        transparent ? "bg-transparent" : "bg-background/95 backdrop-blur-md",
        bordered && !transparent ? "border-b border-border/40" : "",
        mobileOnly ? "block md:hidden" : "",
        "pt-[env(safe-area-inset-top,0px)]",
        className
      )}
    >
      <div className="relative flex items-center justify-between gap-2 px-4 h-12 sm:h-14 w-full min-w-0">
        {/* ── Lado Esquerdo: Apenas Ícone < (44x44px, sem texto) ── */}
        <div className="flex items-center gap-1 shrink-0 min-w-[44px] z-10">
          {showBack && (
            <button
              type="button"
              onClick={handleBack}
              className="size-11 min-h-[44px] min-w-[44px] -ml-2 rounded-full flex items-center justify-center text-foreground/85 hover:text-foreground hover:bg-muted/50 active:bg-muted/80 active:scale-95 transition-all cursor-pointer"
              aria-label="Voltar"
            >
              <CaretLeft className="size-5 stroke-[2.5]" weight="bold" />
            </button>
          )}
          {leftSlot}
        </div>

        {/* ── Centro: Título Centralizado ou Input de Busca Contextual ── */}
        {isSearchOpen && onSearchChange ? (
          <div className="flex-1 min-w-0 px-1 z-10">
            <div className="relative flex items-center w-full">
              <MagnifyingGlass
                size={16}
                weight="bold"
                className="absolute left-3 text-muted-foreground pointer-events-none"
              />
              <input
                type="search"
                inputMode="search"
                autoFocus
                value={searchValue || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchValue?.trim()) {
                    trackSearch(
                      searchValue.trim(),
                      typeof title === "string" ? title.toLowerCase() : "geral",
                    );
                  }
                }}
                placeholder={searchPlaceholder}
                className="w-full h-9 pl-8 pr-8 rounded-xl bg-muted/60 border border-border/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => {
                  onSearchChange("");
                  setIsSearchOpen(false);
                }}
                aria-label="Fechar busca"
                className="absolute right-2 size-6 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X size={13} weight="bold" />
              </button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "flex-1 min-w-0 px-2",
              centerTitle
                ? "text-center flex flex-col items-center justify-center"
                : "flex flex-col justify-center"
            )}
          >
            <div
              className={cn(
                "flex items-center gap-1.5 min-w-0 max-w-full",
                centerTitle ? "justify-center" : "justify-start"
              )}
            >
              {typeof title === "string" ? (
                <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight truncate leading-tight">
                  {title}
                </h1>
              ) : (
                title
              )}
              {badge && <div className="shrink-0">{badge}</div>}
            </div>
            {subtitle && (
              <div className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                {subtitle}
              </div>
            )}
          </div>
        )}

        {/* ── Lado Direito: Lupa Contextual + Funil ML-Filter + Ações Extras (44x44px) ── */}
        <div className="flex items-center gap-0.5 shrink-0 min-w-[44px] justify-end z-10">
          {onSearchChange && !isSearchOpen && (
            <button
              type="button"
              onClick={() => {
                trackClick("native_header_open_search", { title: typeof title === "string" ? title : undefined });
                setIsSearchOpen(true);
              }}
              aria-label="Buscar"
              className="size-11 min-h-[44px] min-w-[44px] rounded-full inline-flex items-center justify-center text-foreground/80 hover:text-foreground hover:bg-muted/50 active:scale-95 transition-all cursor-pointer"
            >
              <MagnifyingGlass size={20} weight="bold" />
            </button>
          )}

          {onFilterClick && (
            <button
              type="button"
              onClick={() => {
                trackClick("native_header_filter_click", { title: typeof title === "string" ? title : undefined, activeFiltersCount });
                onFilterClick();
              }}
              aria-label="Filtrar"
              className="relative size-11 min-h-[44px] min-w-[44px] rounded-full inline-flex items-center justify-center text-foreground/80 hover:text-foreground hover:bg-muted/50 active:scale-95 transition-all cursor-pointer"
            >
              <Funnel
                size={20}
                weight={activeFiltersCount > 0 ? "fill" : "bold"}
                className={activeFiltersCount > 0 ? "text-primary" : ""}
              />
              {activeFiltersCount > 0 && (
                <span className="absolute top-1.5 right-1.5 size-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          )}

          {rightActions}
        </div>
      </div>

      {/* ── Slot Inferior (Tabs, Chips de Filtro) ── */}
      {bottomSlot && (
        <div className="px-4 pb-2.5 pt-0.5 w-full border-t border-border/20">
          {bottomSlot}
        </div>
      )}
    </header>
  );
}
