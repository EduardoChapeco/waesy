import React from "react";
import { TrendingUp, TrendingDown, Minus, Landmark } from "lucide-react";
import type { EconomicIndicator } from "@/types/mining";
import { cn } from "@/lib/utils";

interface EconomicIndicatorsBarProps {
  indicators?: EconomicIndicator[];
  className?: string;
}

export function EconomicIndicatorsBar({
  indicators = [],
  className,
}: EconomicIndicatorsBarProps) {
  if (!indicators || indicators.length === 0) {
    return null;
  }

  // Helper para formatação de valor
  const formatIndicatorValue = (val: number, unit: string) => {
    if (unit === "R$") {
      return `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
    }
    if (unit === "%" || unit === "% a.a.") {
      return `${val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${unit.includes("a.a.") ? "% a.a." : "%"}`;
    }
    return `${val.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ${unit}`;
  };

  return (
    <section
      aria-label="Indicadores Econômicos e Financeiros do Banco Central"
      className={cn(
        "w-full rounded-2xl bg-card border border-border/60 p-3 sm:p-3.5 space-y-2.5 shadow-xs transition-all",
        className
      )}
    >
      {/* Cabeçalho Silencioso & Status Live */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Landmark className="size-3.5 stroke-[2]" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground tracking-tight">
              Indicadores Financeiros
            </span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              • Banco Central do Brasil (SGS)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
          </span>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-semibold">
            Ao Vivo
          </span>
        </div>
      </div>

      {/* Ticker Horizontal com Snap e Sem Scrollbar */}
      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-0.5 px-0.5 focus:outline-none">
        {indicators.map((ind) => {
          const hasVar = ind.variationPercent !== undefined && ind.variationPercent !== null;
          const isPositive = hasVar && ind.variationPercent! > 0;
          const isNegative = hasVar && ind.variationPercent! < 0;

          // Simplificação do nome para layout compacto de mercado
          let shortName = ind.name;
          if (shortName.includes("Dólar Comercial")) shortName = "Dólar Comercial";
          else if (shortName.includes("Euro PTAX")) shortName = "Euro Comercial";
          else if (shortName.includes("Taxa SELIC Meta")) shortName = "Selic Meta";
          else if (shortName.includes("Taxa CDI")) shortName = "Taxa CDI";
          else if (shortName.includes("IPCA Acumulado 12 Meses")) shortName = "IPCA 12M";
          else if (shortName.includes("IPCA - Variação")) shortName = "IPCA Mês";
          else if (shortName.includes("IGP-M")) shortName = "IGP-M Mês";
          else if (shortName.includes("Atividade Econômica")) shortName = "IBC-Br";

          return (
            <div
              key={ind.code}
              className="flex flex-col justify-between shrink-0 min-w-[130px] sm:min-w-[145px] p-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/40 transition-colors select-none"
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[11px] font-medium text-muted-foreground truncate" title={ind.name}>
                  {shortName}
                </span>
                {hasVar && (
                  <span
                    className={cn(
                      "flex items-center gap-0.5 text-[10px] font-mono font-semibold px-1 py-0.5 rounded",
                      isPositive
                        ? "text-emerald-700 bg-emerald-500/10 dark:text-emerald-400"
                        : isNegative
                        ? "text-rose-700 bg-rose-500/10 dark:text-rose-400"
                        : "text-muted-foreground bg-muted"
                    )}
                  >
                    {isPositive ? (
                      <TrendingUp className="size-2.5 stroke-[2.5]" />
                    ) : isNegative ? (
                      <TrendingDown className="size-2.5 stroke-[2.5]" />
                    ) : (
                      <Minus className="size-2.5 stroke-[2.5]" />
                    )}
                    {Math.abs(ind.variationPercent!)}%
                  </span>
                )}
              </div>

              <div className="flex items-baseline justify-between gap-1">
                <span className="text-xs sm:text-sm font-bold font-mono text-foreground tracking-tight">
                  {formatIndicatorValue(ind.currentValue, ind.unit)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
