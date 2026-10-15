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
 * Seletor Tri-Engine da Vitrine Principal (Apple HIG / Linha Única Compacta)
 * Unifica os três pilares em uma linha horizontal única e compacta com ícones táteis >= 44x44px:
 * 1. Lugares (Guia local e serviços)
 * 2. Marketplace (Empresas parceiras e ofertas)
 * 3. Classificados (Comunidade e desapegos)
 */
export function VitrineEngineSelector({
  activeMode,
  onModeChange,
  className,
}: VitrineEngineSelectorProps) {
  const engines = [
    {
      id: "empresas" as const,
      label: "Lugares",
      icon: Buildings,
    },
    {
      id: "marketplace" as const,
      label: "Marketplace",
      icon: Storefront,
    },
    {
      id: "classifieds" as const,
      label: "Classificados",
      icon: Tag,
    },
  ];

  return (
    <nav
      role="tablist"
      aria-label="Tipo de visualização da vitrine"
      className={cn("w-full flex flex-row items-center justify-between gap-2 px-1", className)}
    >
      {engines.map((engine) => {
        const isActive = activeMode === engine.id;
        const IconComponent = engine.icon;

        return (
          <button
            key={engine.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onModeChange(engine.id)}
            className={cn(
              "h-11 min-h-11 flex-1 min-w-0 flex items-center justify-center gap-2 px-2 rounded-lg border transition-colors duration-150 cursor-pointer select-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              isActive
                ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border-border/40"
            )}
            title={engine.label}
          >
            <IconComponent
              weight={isActive ? "fill" : "bold"}
              className={cn("size-4 sm:size-5 shrink-0", isActive ? "text-background" : "text-muted-foreground")}
            />
            <span className="text-xs sm:text-sm font-semibold tracking-tight truncate">
              {engine.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
