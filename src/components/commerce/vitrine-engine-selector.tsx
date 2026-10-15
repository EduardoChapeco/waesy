import React from "react";
import { Buildings, Storefront, Tag } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { VitrineEngineMode } from "@/types/marketplace-compliance";

export interface VitrineEngineSelectorProps {
  activeMode: VitrineEngineMode;
  onModeChange: (mode: VitrineEngineMode) => void;
  className?: string;
}

/**
 * Seletor Tri-Engine da Vitrine Principal (Design Silencioso / Apple HIG)
 * Botões em cards amplos e limpos para filtragem direta por tipo de vitrine:
 * 1. Lugares (Guia local, serviços e endereços)
 * 2. Lojas (Marketplace e estabelecimentos)
 * 3. Classificados (Anúncios da comunidade)
 */
export function VitrineEngineSelector({
  activeMode,
  onModeChange,
  className,
}: VitrineEngineSelectorProps) {
  return (
    <div
      role="tablist"
      aria-label="Tipo de visualização da vitrine"
      className={cn("w-full flex items-stretch gap-2 sm:gap-3", className)}
    >
      {/* ── Card 1: Lugares ── */}
      <button
        type="button"
        role="tab"
        aria-selected={activeMode === "empresas"}
        tabIndex={activeMode === "empresas" ? 0 : -1}
        onClick={() => onModeChange("empresas")}
        className={cn(
          "flex-1 min-w-0 group relative flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-3 p-2 sm:px-4 sm:py-4 rounded-lg border transition-colors duration-150 cursor-pointer select-none min-h-11 sm:min-h-14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          activeMode === "empresas"
            ? "bg-card border-foreground/40 text-foreground ring-1 ring-foreground/20 font-bold"
            : "bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border-border/60"
        )}
      >
        <div
          className={cn(
            "size-7 sm:size-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
            activeMode === "empresas"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground group-hover:text-foreground"
          )}
        >
          <Buildings
            weight={activeMode === "empresas" ? "fill" : "bold"}
            className="size-4 sm:size-5 shrink-0"
          />
        </div>
        <span className="text-xs sm:text-sm font-bold tracking-tight truncate leading-none text-center sm:text-left">
          Lugares
        </span>
      </button>

      {/* ── Card 2: Marketplace ── */}
      <button
        type="button"
        role="tab"
        aria-selected={activeMode === "marketplace"}
        tabIndex={activeMode === "marketplace" ? 0 : -1}
        onClick={() => onModeChange("marketplace")}
        className={cn(
          "flex-1 min-w-0 group relative flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-3 p-2 sm:px-4 sm:py-4 rounded-lg border transition-colors duration-150 cursor-pointer select-none min-h-11 sm:min-h-14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          activeMode === "marketplace"
            ? "bg-card border-foreground/40 text-foreground ring-1 ring-foreground/20 font-bold"
            : "bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border-border/60"
        )}
      >
        <div
          className={cn(
            "size-7 sm:size-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
            activeMode === "marketplace"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground group-hover:text-foreground"
          )}
        >
          <Storefront
            weight={activeMode === "marketplace" ? "fill" : "bold"}
            className="size-4 sm:size-5 shrink-0"
          />
        </div>
        <span className="text-xs sm:text-sm font-bold tracking-tight truncate leading-none text-center sm:text-left">
          Marketplace
        </span>
      </button>

      {/* ── Card 3: Classificados ── */}
      <button
        type="button"
        role="tab"
        aria-selected={activeMode === "classifieds"}
        tabIndex={activeMode === "classifieds" ? 0 : -1}
        onClick={() => onModeChange("classifieds")}
        className={cn(
          "flex-1 min-w-0 group relative flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-3 p-2 sm:px-4 sm:py-4 rounded-lg border transition-colors duration-150 cursor-pointer select-none min-h-11 sm:min-h-14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          activeMode === "classifieds"
            ? "bg-card border-foreground/40 text-foreground ring-1 ring-foreground/20 font-bold"
            : "bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border-border/60"
        )}
      >
        <div
          className={cn(
            "size-7 sm:size-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
            activeMode === "classifieds"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground group-hover:text-foreground"
          )}
        >
          <Tag
            weight={activeMode === "classifieds" ? "fill" : "bold"}
            className="size-4 sm:size-5 shrink-0"
          />
        </div>
        <span className="text-xs sm:text-sm font-bold tracking-tight truncate leading-none text-center sm:text-left">
          Classificados
        </span>
      </button>
    </div>
  );
}
