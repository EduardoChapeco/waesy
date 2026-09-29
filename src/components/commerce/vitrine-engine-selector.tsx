import React from "react";
import { ShieldCheck, ChatCircleDots } from "@phosphor-icons/react";
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
 * Seletor de Arquitetura Dual da Vitrine Centralizada (V141)
 * Segrega estritamente o Marketplace Verificado (Empresas com CNPJ auditado)
 * dos Classificados Locais (Acesso P2P livre com contato direto).
 */
export function VitrineEngineSelector({
  activeMode,
  onModeChange,
  className,
  verifiedCount,
  classifiedCount,
}: VitrineEngineSelectorProps) {
  return (
    <div
      role="tablist"
      aria-label="Ambiente de navegação da vitrine"
      className={cn(
        "w-full bg-muted/60 p-1 rounded-2xl flex items-center gap-1 border border-border/60",
        className
      )}
    >
      {/* ── Aba 1: Marketplace Verificado (Acesso Curado com CNPJ) ── */}
      <button
        type="button"
        role="tab"
        aria-selected={activeMode === "marketplace"}
        tabIndex={activeMode === "marketplace" ? 0 : -1}
        onClick={() => onModeChange("marketplace")}
        className={cn(
          "flex-1 h-11 min-h-[44px] px-3 sm:px-4 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer select-none",
          activeMode === "marketplace"
            ? "bg-card text-foreground font-bold border border-border/80 shadow-2xs"
            : "text-muted-foreground hover:text-foreground hover:bg-background/40"
        )}
      >
        <ShieldCheck
          size={18}
          weight={activeMode === "marketplace" ? "fill" : "bold"}
          className={cn(
            activeMode === "marketplace" ? "text-primary" : "text-muted-foreground"
          )}
        />
        <span className="truncate">Marketplace Verificado</span>
        {typeof verifiedCount === "number" && verifiedCount > 0 && (
          <span
            className={cn(
              "px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0",
              activeMode === "marketplace"
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {verifiedCount}
          </span>
        )}
      </button>

      {/* ── Aba 2: Classificados Locais (Acesso Aberto / P2P) ── */}
      <button
        type="button"
        role="tab"
        aria-selected={activeMode === "classifieds"}
        tabIndex={activeMode === "classifieds" ? 0 : -1}
        onClick={() => onModeChange("classifieds")}
        className={cn(
          "flex-1 h-11 min-h-[44px] px-3 sm:px-4 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer select-none",
          activeMode === "classifieds"
            ? "bg-card text-foreground font-bold border border-border/80 shadow-2xs"
            : "text-muted-foreground hover:text-foreground hover:bg-background/40"
        )}
      >
        <ChatCircleDots
          size={18}
          weight={activeMode === "classifieds" ? "fill" : "bold"}
          className={cn(
            activeMode === "classifieds" ? "text-primary" : "text-muted-foreground"
          )}
        />
        <span className="truncate">Classificados Locais</span>
        {typeof classifiedCount === "number" && classifiedCount > 0 && (
          <span
            className={cn(
              "px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0",
              activeMode === "classifieds"
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {classifiedCount}
          </span>
        )}
      </button>
    </div>
  );
}
