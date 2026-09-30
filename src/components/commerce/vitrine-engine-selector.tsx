import React from "react";
import { Buildings, Tag } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { VitrineEngineMode } from "@/types/marketplace-compliance";

export interface VitrineEngineSelectorProps {
  activeMode: VitrineEngineMode;
  onModeChange: (mode: VitrineEngineMode) => void;
  className?: string;
  verifiedCount?: number;
  classifiedCount?: number;
}

/**
 * Seletor de Arquitetura em Grandes Cards Minimalistas (Apple HIG)
 * Permite alternar diretamente entre Empresas e Classificados
 * sem jargões técnicos e sem poluição de números.
 */
export function VitrineEngineSelector({
  activeMode,
  onModeChange,
  className,
}: VitrineEngineSelectorProps) {
  return (
    <div
      role="tablist"
      aria-label="Filtrar tipo de visualização"
      className={cn("w-full grid grid-cols-2 gap-2.5 sm:gap-3.5", className)}
    >
      {/* ── Card 1: Empresas / Lojas ── */}
      <button
        type="button"
        role="tab"
        aria-selected={activeMode === "marketplace"}
        tabIndex={activeMode === "marketplace" ? 0 : -1}
        onClick={() => onModeChange("marketplace")}
        className={cn(
          "group relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none active:scale-98",
          activeMode === "marketplace"
            ? "bg-foreground text-background border-foreground font-bold shadow-xs"
            : "bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground border-border/70 shadow-2xs"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "size-10 sm:size-11 rounded-xl flex items-center justify-center shrink-0 transition-colors",
              activeMode === "marketplace"
                ? "bg-background/15 text-background"
                : "bg-muted text-foreground group-hover:bg-muted/80"
            )}
          >
            <Buildings
              size={22}
              weight={activeMode === "marketplace" ? "fill" : "bold"}
              className="shrink-0"
            />
          </div>
          <div className="text-left min-w-0">
            <span className="block text-sm sm:text-base font-bold tracking-tight truncate leading-tight">
              Empresas
            </span>
            <span
              className={cn(
                "block text-[11px] sm:text-xs truncate font-normal leading-tight mt-0.5",
                activeMode === "marketplace"
                  ? "text-background/80"
                  : "text-muted-foreground"
              )}
            >
              Comércio e serviços
            </span>
          </div>
        </div>
      </button>

      {/* ── Card 2: Classificados ── */}
      <button
        type="button"
        role="tab"
        aria-selected={activeMode === "classifieds"}
        tabIndex={activeMode === "classifieds" ? 0 : -1}
        onClick={() => onModeChange("classifieds")}
        className={cn(
          "group relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none active:scale-98",
          activeMode === "classifieds"
            ? "bg-foreground text-background border-foreground font-bold shadow-xs"
            : "bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground border-border/70 shadow-2xs"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "size-10 sm:size-11 rounded-xl flex items-center justify-center shrink-0 transition-colors",
              activeMode === "classifieds"
                ? "bg-background/15 text-background"
                : "bg-muted text-foreground group-hover:bg-muted/80"
            )}
          >
            <Tag
              size={22}
              weight={activeMode === "classifieds" ? "fill" : "bold"}
              className="shrink-0"
            />
          </div>
          <div className="text-left min-w-0">
            <span className="block text-sm sm:text-base font-bold tracking-tight truncate leading-tight">
              Classificados
            </span>
            <span
              className={cn(
                "block text-[11px] sm:text-xs truncate font-normal leading-tight mt-0.5",
                activeMode === "classifieds"
                  ? "text-background/80"
                  : "text-muted-foreground"
              )}
            >
              Ofertas e desapegos
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}
