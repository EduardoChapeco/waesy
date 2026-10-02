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
      className={cn("w-full grid grid-cols-1 sm:grid-cols-3 gap-3", className)}
    >
      {/* ── Card 1: Lugares ── */}
      <button
        type="button"
        role="tab"
        aria-selected={activeMode === "empresas"}
        tabIndex={activeMode === "empresas" ? 0 : -1}
        onClick={() => onModeChange("empresas")}
        className={cn(
          "group relative flex items-center justify-center sm:justify-start gap-4 px-4 py-3 sm:px-5 sm:py-4 rounded-lg border transition-all duration-150 cursor-pointer select-none min-h-14 sm:min-h-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          activeMode === "empresas"
            ? "bg-card border-foreground/40 text-foreground ring-1 ring-foreground/20 font-bold"
            : "bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border-border/60"
        )}
      >
        <div
          className={cn(
            "size-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
            activeMode === "empresas"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground group-hover:text-foreground"
          )}
        >
          <Buildings
            size={22}
            weight={activeMode === "empresas" ? "fill" : "bold"}
            className="shrink-0"
          />
        </div>
        <span className="text-sm sm:text-base font-bold tracking-tight truncate leading-none">
          Lugares
        </span>
      </button>

      {/* ── Card 2: Lojas ── */}
      <button
        type="button"
        role="tab"
        aria-selected={activeMode === "marketplace"}
        tabIndex={activeMode === "marketplace" ? 0 : -1}
        onClick={() => onModeChange("marketplace")}
        className={cn(
          "group relative flex items-center justify-center sm:justify-start gap-4 px-4 py-3 sm:px-5 sm:py-4 rounded-lg border transition-all duration-150 cursor-pointer select-none min-h-14 sm:min-h-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          activeMode === "marketplace"
            ? "bg-card border-foreground/40 text-foreground ring-1 ring-foreground/20 font-bold"
            : "bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border-border/60"
        )}
      >
        <div
          className={cn(
            "size-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
            activeMode === "marketplace"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground group-hover:text-foreground"
          )}
        >
          <Storefront
            size={22}
            weight={activeMode === "marketplace" ? "fill" : "bold"}
            className="shrink-0"
          />
        </div>
        <span className="text-sm sm:text-base font-bold tracking-tight truncate leading-none">
          Lojas
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
          "group relative flex items-center justify-center sm:justify-start gap-4 px-4 py-3 sm:px-5 sm:py-4 rounded-lg border transition-all duration-150 cursor-pointer select-none min-h-14 sm:min-h-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          activeMode === "classifieds"
            ? "bg-card border-foreground/40 text-foreground ring-1 ring-foreground/20 font-bold"
            : "bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border-border/60"
        )}
      >
        <div
          className={cn(
            "size-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
            activeMode === "classifieds"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground group-hover:text-foreground"
          )}
        >
          <Tag
            size={22}
            weight={activeMode === "classifieds" ? "fill" : "bold"}
            className="shrink-0"
          />
        </div>
        <span className="text-sm sm:text-base font-bold tracking-tight truncate leading-none">
          Classificados
        </span>
      </button>
    </div>
  );
}
