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
 * Seletor de Vitrine em Grandes Cards Silenciosos (Apple HIG / Silent Design)
 * Alterna diretamente entre Empresas e Classificados sem contadores numéricos ou jargões técnicos.
 */
export function VitrineEngineSelector({
  activeMode,
  onModeChange,
  className,
}: VitrineEngineSelectorProps) {
  return (
    <div
      role="tablist"
      aria-label="Tipo de visualização"
      className={cn("w-full grid grid-cols-2 gap-3 sm:gap-4", className)}
    >
      {/* ── Card 1: Empresas ── */}
      <button
        type="button"
        role="tab"
        aria-selected={activeMode === "marketplace"}
        tabIndex={activeMode === "marketplace" ? 0 : -1}
        onClick={() => onModeChange("marketplace")}
        className={cn(
          "group relative flex items-center gap-3.5 p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer select-none min-h-14 sm:min-h-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
          activeMode === "marketplace"
            ? "bg-card border-foreground/30 text-foreground shadow-xs ring-1 ring-foreground/15"
            : "bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border-border/50"
        )}
      >
        <div
          className={cn(
            "size-11 sm:size-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
            activeMode === "marketplace"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground group-hover:text-foreground"
          )}
        >
          <Buildings
            size={24}
            weight={activeMode === "marketplace" ? "fill" : "bold"}
            className="shrink-0"
          />
        </div>
        <div className="text-left min-w-0">
          <span className="block text-base sm:text-lg font-bold tracking-tight truncate leading-tight">
            Empresas
          </span>
          <span className="block text-xs text-muted-foreground truncate leading-tight mt-0.5">
            Lojas e serviços
          </span>
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
          "group relative flex items-center gap-3.5 p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer select-none min-h-14 sm:min-h-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
          activeMode === "classifieds"
            ? "bg-card border-foreground/30 text-foreground shadow-xs ring-1 ring-foreground/15"
            : "bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border-border/50"
        )}
      >
        <div
          className={cn(
            "size-11 sm:size-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
            activeMode === "classifieds"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground group-hover:text-foreground"
          )}
        >
          <Tag
            size={24}
            weight={activeMode === "classifieds" ? "fill" : "bold"}
            className="shrink-0"
          />
        </div>
        <div className="text-left min-w-0">
          <span className="block text-base sm:text-lg font-bold tracking-tight truncate leading-tight">
            Classificados
          </span>
          <span className="block text-xs text-muted-foreground truncate leading-tight mt-0.5">
            Produtos e desapegos
          </span>
        </div>
      </button>
    </div>
  );
}

