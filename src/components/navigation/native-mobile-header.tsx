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
  backTo?: string;
  leftSlot?: React.ReactNode;
  rightActions?: React.ReactNode;
  rightAction?: React.ReactNode;
  badge?: React.ReactNode;
  bottomSlot?: React.ReactNode;
  transparent?: boolean;
  bordered?: boolean;
  centerTitle?: boolean;
  mobileOnly?: boolean;
  className?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
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
  rightAction,
  badge,
  bottomSlot,
  transparent = false,
  bordered = true,
  centerTitle = true,
  mobileOnly = true,
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
        "sticky top-0 z-40 -mx-2 sm:mx-0 sm:w-full select-none transition-colors",
        transparent ? "bg-transparent" : "bg-background/95 backdrop-blur-md",
        bordered && !transparent ? "border-b border-border/40" : "",
        mobileOnly ? "md:hidden" : "",
        "pt-safe",
        className
      )}
    >
      <div className="relative flex items-center justify-between gap-2 px-2 sm:px-4 h-11 min-h-11 w-full min-w-0">
        {/* ── Lado Esquerdo: Apenas Ícone < (44x44px, sem texto) ── */}
        <div className="flex items-center gap-1 shrink-0 min-w-11 z-10">
          {showBack && (
            <button
              type="button"
              onClick={handleBack}
              className="size-11 min-h-11 min-w-11 -ml-1 rounded-lg flex items-center justify-center text-foreground/85 hover:text-foreground hover:bg-muted/50 active:bg-muted/80 active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Voltar"
            >
              <CaretLeft className="size-5" weight="bold" />
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
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
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
                className="w-full h-11 min-h-11 pl-9 pr-11 rounded-lg bg-muted/60 border border-border/60 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <button
                type="button"
                onClick={() => {
                  onSearchChange("");
                  setIsSearchOpen(false);
                }}
                aria-label="Fechar busca"
                className="absolute right-0 top-0 size-11 min-h-11 min-w-11 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X size={16} weight="bold" />
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
                "flex items-center gap-2 min-w-0 max-w-full",
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
              <div className="text-xs text-muted-foreground truncate leading-tight mt-1">
                {subtitle}
              </div>
            )}
          </div>
        )}

        {/* ── Lado Direito: Lupa Contextual + Funil ML-Filter + Ações Extras (44x44px) ── */}
        <div className="flex items-center gap-1 shrink-0 min-w-11 justify-end z-10">
          {onSearchChange && !isSearchOpen && (
            <button
              type="button"
              onClick={() => {
                trackClick("native_header_open_search", { title: typeof title === "string" ? title : undefined });
                setIsSearchOpen(true);
              }}
              aria-label="Buscar"
              className="size-11 min-h-11 min-w-11 rounded-lg inline-flex items-center justify-center text-foreground/80 hover:text-foreground hover:bg-muted/50 active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
              className="relative size-11 min-h-11 min-w-11 rounded-lg inline-flex items-center justify-center text-foreground/80 hover:text-foreground hover:bg-muted/50 active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Funnel
                size={20}
                weight={activeFiltersCount > 0 ? "fill" : "bold"}
                className={activeFiltersCount > 0 ? "text-primary" : ""}
              />
              {activeFiltersCount > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-xs font-bold leading-none flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          )}

          {rightActions || rightAction}
        </div>
      </div>

      {/* ── Slot Inferior (Tabs, Chips de Filtro) ── */}
      {bottomSlot && (
        <div className="px-4 pb-3 pt-1 w-full border-t border-border/20">
          {bottomSlot}
        </div>
      )}
    </header>
  );
}
