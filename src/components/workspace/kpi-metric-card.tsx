import * as React from "react";
import { Info, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { MiniSparkline, type SparklineTrend } from "./mini-sparkline";
import { cn } from "@/lib/utils";

export type TrendDirection = "up" | "down" | "neutral";

export interface KpiMetricCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  trendDirection?: TrendDirection;
  trendText?: string;
  sparklineData?: number[];
  sparklineColor?: string;
  tooltip?: string;
  isLoading?: boolean;
  className?: string;
  onClick?: () => void;
}

export function KpiMetricCard({
  title,
  value,
  subValue,
  icon: Icon,
  trendDirection,
  trendText,
  sparklineData,
  sparklineColor,
  tooltip,
  isLoading = false,
  className,
  onClick,
}: KpiMetricCardProps) {
  // ── 1. Matriz de Estado: Loading (Skeleton Isomórfico 1:1 / DL-11) ──────────
  if (isLoading) {
    return (
      <div
        className={cn(
          "p-5 rounded-2xl bg-card border border-border/60 flex flex-col justify-between gap-4 select-none",
          className
        )}
        aria-busy="true"
        aria-label={`Carregando métrica ${title}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-24 rounded-md" />
          </div>
          <Skeleton className="size-4 rounded-full" />
        </div>

        <div className="space-y-2 py-1">
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>

        <Skeleton className="h-5 w-28 rounded-full" />
      </div>
    );
  }

  // ── 2. Renderização da Superfície Soberana Única ───────────────────────────
  const isClickable = Boolean(onClick);
  const CardTag = isClickable ? "button" : "article";

  return (
    <CardTag
      type={isClickable ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "p-5 rounded-2xl bg-card border border-border/60 flex flex-col justify-between gap-3 text-left transition-colors duration-200 select-none",
        isClickable &&
          "cursor-pointer hover:border-border hover:bg-muted/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-11",
        className
      )}
    >
      {/* ── Topo: Ícone Suave + Título + Tooltip ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-8 rounded-full bg-muted border border-border text-primary flex items-center justify-center shrink-0">
            <Icon className="size-4" aria-hidden="true" />
          </div>
          <h3 className="text-xs sm:text-sm font-semibold text-foreground tracking-tight line-clamp-2 text-anti-truncate">
            {title}
          </h3>
        </div>

        {tooltip && (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`Informações sobre ${title}`}
                  className="size-11 min-h-11 min-w-11 -mr-2 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-help"
                >
                  <Info className="size-3.5" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-xs text-xs rounded-lg px-3 py-2"
              >
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* ── Centro: Valor Primário Tabular & Subvalor ── */}
      <div className="space-y-1 pt-1">
        <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight text-foreground leading-none">
          {value}
        </div>
        {subValue && (
          <p className="text-xs text-muted-foreground font-medium line-clamp-2 text-anti-truncate pt-1">
            {subValue}
          </p>
        )}
      </div>

      {/* ── Sparkline com Gradiente Opcional (Belasis Style) ── */}
      {sparklineData && sparklineData.length >= 2 && (
        <div className="py-1">
          <MiniSparkline
            data={sparklineData}
            color={sparklineColor}
            trend={trendDirection as SparklineTrend}
            height={36}
          />
        </div>
      )}

      {/* ── Base: Indicador de Tendência em Pill ── */}
      {trendText && (
        <div className="pt-1">
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-semibold tracking-tight",
              trendDirection === "up" && "text-success-strong",
              trendDirection === "down" && "text-destructive",
              (!trendDirection || trendDirection === "neutral") && "text-muted-foreground"
            )}
          >
            {trendDirection === "up" && (
              <TrendingUp className="size-3.5 shrink-0" aria-hidden="true" />
            )}
            {trendDirection === "down" && (
              <TrendingDown className="size-3.5 shrink-0" aria-hidden="true" />
            )}
            {trendDirection === "neutral" && (
              <Minus className="size-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>{trendText}</span>
          </span>
        </div>
      )}
    </CardTag>
  );
}
