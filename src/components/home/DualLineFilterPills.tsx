import React from "react";
import { SlidersHorizontal, ArrowUpDown, Sparkles, Tag, Bike, Clock, Award, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DualLineFilterPillsProps {
  activeSort?: string;
  onSortChange?: (sort: string) => void;
  activeFilter?: string;
  onFilterChange?: (filter: string) => void;
  className?: string;
}

const ROW_1_OPTIONS = [
  { id: "relevance", label: "Ordenar", icon: ArrowUpDown },
  { id: "promo", label: "Promoções", icon: Tag },
  { id: "coupons", label: "Com Cupons", icon: Sparkles },
  { id: "top_rated", label: "Destaques Locais", icon: Award },
];

const ROW_2_OPTIONS = [
  { id: "free_delivery", label: "Entrega Grátis", icon: Bike },
  { id: "near_me", label: "Mais Próximos", icon: SlidersHorizontal },
  { id: "open_now", label: "Aberto Agora", icon: Clock },
  { id: "verified", label: "Empresas Verificadas", icon: ShieldCheck },
];

export function DualLineFilterPills({
  activeSort = "relevance",
  onSortChange,
  activeFilter = "all",
  onFilterChange,
  className,
}: DualLineFilterPillsProps) {
  return (
    <div className={cn("w-full space-y-2 py-1", className)}>
      {/* Linha 1: Ordenação e Campanhas */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-1">
        {ROW_1_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = activeSort === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSortChange?.(isActive ? "relevance" : opt.id)}
              className={cn(
                "h-11 min-h-11 px-3 rounded-xl border text-xs font-semibold flex items-center gap-2 shrink-0 transition-transform duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isActive
                  ? "bg-foreground text-background border-foreground shadow-xs font-bold"
                  : "bg-card border-border/70 text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="size-4" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Linha 2: Tipo de Entrega e Condições */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-1">
        {ROW_2_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = activeFilter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onFilterChange?.(isActive ? "all" : opt.id)}
              className={cn(
                "h-11 min-h-11 px-3 rounded-xl border text-xs font-semibold flex items-center gap-2 shrink-0 transition-transform duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                  : "bg-card border-border/70 text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="size-4" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
