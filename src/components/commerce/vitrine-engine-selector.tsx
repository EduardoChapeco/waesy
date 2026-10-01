import React from "react";
import { Buildings, Storefront, Tag } from "@phosphor-icons/react";
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
 * Seletor Tri-Engine da Vitrine Canônica (Apple HIG / Silent Design)
 * Alterna diretamente entre:
 * 1. Empresas (Places / Guia Comercial / Diretório Local)
 * 2. Marketplace (Lojas Oficiais com Workspace / Planos Pro/Max / Produtos Verificados)
 * 3. Classificados (Anúncios P2P / Comunidade / Desapega)
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
      className={cn("w-full grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5", className)}
    >
      {/* ── Card 1: Empresas ── */}
      <button
        type="button"
        role="tab"
        aria-selected={activeMode === "empresas"}
        tabIndex={activeMode === "empresas" ? 0 : -1}
        onClick={() => onModeChange("empresas")}
        className={cn(
          "group relative flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none min-h-14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
          activeMode === "empresas"
            ? "bg-card border-foreground/30 text-foreground shadow-xs ring-1 ring-foreground/15"
            : "bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border-border/50"
        )}
      >
        <div
          className={cn(
            "size-10 sm:size-11 rounded-xl flex items-center justify-center shrink-0 transition-colors",
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
        <div className="text-left min-w-0">
          <span className="block text-sm sm:text-base font-bold tracking-tight truncate leading-tight">
            Empresas
          </span>
          <span className="block text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
            Guia e lugares locais
          </span>
        </div>
      </button>

      {/* ── Card 2: Marketplace ── */}
      <button
        type="button"
        role="tab"
        aria-selected={activeMode === "marketplace"}
        tabIndex={activeMode === "marketplace" ? 0 : -1}
        onClick={() => onModeChange("marketplace")}
        className={cn(
          "group relative flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none min-h-14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
          activeMode === "marketplace"
            ? "bg-card border-foreground/30 text-foreground shadow-xs ring-1 ring-foreground/15"
            : "bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border-border/50"
        )}
      >
        <div
          className={cn(
            "size-10 sm:size-11 rounded-xl flex items-center justify-center shrink-0 transition-colors",
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
        <div className="text-left min-w-0">
          <span className="block text-sm sm:text-base font-bold tracking-tight truncate leading-tight">
            Marketplace
          </span>
          <span className="block text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
            Lojas Pro verificadas
          </span>
        </div>
      </button>

      {/* ── Card 3: Classificados ── */}
      <button
        type="button"
        role="tab"
        aria-selected={activeMode === "classifieds"}
        tabIndex={activeMode === "classifieds" ? 0 : -1}
        onClick={() => onModeChange("classifieds")}
        className={cn(
          "group relative flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none min-h-14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
          activeMode === "classifieds"
            ? "bg-card border-foreground/30 text-foreground shadow-xs ring-1 ring-foreground/15"
            : "bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border-border/50"
        )}
      >
        <div
          className={cn(
            "size-10 sm:size-11 rounded-xl flex items-center justify-center shrink-0 transition-colors",
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
        <div className="text-left min-w-0">
          <span className="block text-sm sm:text-base font-bold tracking-tight truncate leading-tight">
            Classificados
          </span>
          <span className="block text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
            Produtos e desapegos
          </span>
        </div>
      </button>
    </div>
  );
}
