import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { BarChart3, TrendingUp, Calendar, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetricCardItem {
  id?: string;
  label?: string;
  title?: string;
  value: string | number;
  subtext?: string;
  description?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    direction?: "up" | "down" | "neutral" | string;
  };
  icon?: React.ElementType;
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "info";
  color?: string;
}

export interface WorkspaceDashboardSheetProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  description?: string;
  metrics?: MetricCardItem[];
  items?: MetricCardItem[];
  breakdown?: any;
  children?: React.ReactNode;
}

export function WorkspaceDashboardSheet({
  open: openProp,
  isOpen,
  onOpenChange,
  onClose,
  title = "Painel de Métricas & Indicadores",
  subtitle,
  description: descProp,
  metrics: metricsProp = [],
  items,
  children,
}: WorkspaceDashboardSheetProps) {
  const open = openProp ?? isOpen ?? false;
  const setOpen = (val: boolean) => {
    onOpenChange?.(val);
    if (!val) onClose?.();
  };
  const description = descProp || subtitle || "Acompanhamento em tempo real de produtividade, volume e conversões.";
  const metrics = metricsProp.length > 0 ? metricsProp : (items || []);
  const [period, setPeriod] = useState<"today" | "7d" | "30d" | "all">("today");

  const getVariantStyles = (variant?: MetricCardItem["variant"]) => {
    switch (variant) {
      case "primary":
        return "border-primary/30 bg-primary/5 text-primary";
      case "success":
        return "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400";
      case "warning":
        return "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400";
      case "danger":
        return "border-rose-500/30 bg-rose-500/5 text-rose-600 dark:text-rose-400";
      case "info":
        return "border-sky-500/30 bg-sky-500/5 text-sky-600 dark:text-sky-400";
      default:
        return "border-border/70 bg-card text-foreground";
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-0 flex flex-col h-full bg-background border-l border-border/70 overflow-hidden select-none"
      >
        {/* ── 1. Topo do Painel de Métricas ── */}
        <div className="p-5 border-b border-border/60 bg-muted/20 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <BarChart3 className="size-4" />
              </div>
              <SheetTitle className="text-sm font-bold text-foreground">
                {title}
              </SheetTitle>
            </div>

            {/* Seletor de Período Temporal */}
            <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/50 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setPeriod("today")}
                className={cn(
                  "px-2 py-1 rounded-md transition-all cursor-pointer",
                  period === "today"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setPeriod("7d")}
                className={cn(
                  "px-2 py-1 rounded-md transition-all cursor-pointer",
                  period === "7d"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                7d
              </button>
              <button
                type="button"
                onClick={() => setPeriod("30d")}
                className={cn(
                  "px-2 py-1 rounded-md transition-all cursor-pointer",
                  period === "30d"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                30d
              </button>
              <button
                type="button"
                onClick={() => setPeriod("all")}
                className={cn(
                  "px-2 py-1 rounded-md transition-all cursor-pointer",
                  period === "all"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Total
              </button>
            </div>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            {description}
          </SheetDescription>
        </div>

        {/* ── 2. Conteúdo com Scroll Suave ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-5">
          {/* Grid de Cards de Indicadores Principais */}
          {metrics.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {metrics.map((m) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.id || m.label || m.title}
                    className={cn(
                      "p-4 rounded-xl border space-y-1.5 transition-all",
                      getVariantStyles(m.variant)
                    )}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span className="truncate">{m.label || m.title}</span>
                      {Icon && <Icon className="size-4 shrink-0" />}
                    </div>

                    <p className="text-2xl font-bold font-mono font-tabular-nums tracking-tight">
                      {m.value}
                    </p>

                    {m.subtext && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {m.subtext}
                      </p>
                    )}

                    {m.trend && (
                      <div className="flex items-center gap-1 text-[10px] font-semibold pt-0.5">
                        <TrendingUp
                          className={cn(
                            "size-3",
                            m.trend.isPositive ? "text-emerald-500" : "text-rose-500"
                          )}
                        />
                        <span
                          className={
                            m.trend.isPositive ? "text-emerald-600" : "text-rose-600"
                          }
                        >
                          {m.trend.value}
                        </span>
                        <span className="text-muted-foreground/60 font-normal">vs. anterior</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Slot para Conteúdo Analítico Profundo (Gráficos, Quebras, Detalhes) */}
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
