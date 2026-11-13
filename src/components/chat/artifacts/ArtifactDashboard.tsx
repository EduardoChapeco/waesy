import React, { useState } from "react";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface MetricKpi {
  id: string;
  label: string;
  value: string | number;
  changePercent?: number;
  periodLabel?: string;
  trend?: "up" | "down" | "neutral";
  category?: string;
}

export interface DashboardCategoryBreakdown {
  label: string;
  value: number;
  percentage: number;
  colorClass?: string;
}

export interface ArtifactDashboardProps {
  title: string;
  subtitle?: string;
  kpis?: MetricKpi[];
  breakdowns?: DashboardCategoryBreakdown[];
  recentActivities?: Array<{
    id: string;
    description: string;
    timestamp: string;
    status: string;
    amount?: string;
  }>;
  alerts?: string[];
  className?: string;
}

export function ArtifactDashboard({
  title,
  subtitle,
  kpis = [],
  breakdowns = [],
  recentActivities = [],
  alerts = [],
  className,
}: ArtifactDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<"day" | "week" | "month">("month");

  const activeKpis: MetricKpi[] = kpis;

  const handleExportSummary = () => {
    const summaryData = {
      title,
      period: selectedPeriod,
      kpis: activeKpis,
      breakdowns,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(summaryData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "_")}_resumo.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Cabeçalho do Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
        <div>
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-muted p-1 text-xs">
            {(["day", "week", "month"] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setSelectedPeriod(period)}
                className={cn(
                  "px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  selectedPeriod === period
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {period === "day" ? "Hoje" : period === "week" ? "7 dias" : "30 dias"}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportSummary}
            className="h-11 min-h-11 px-3 text-xs gap-2 focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        </div>
      </div>

      {/* Alertas Operacionais se houver */}
      {alerts.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 space-y-2">
          <div className="flex items-center gap-2 text-destructive font-semibold text-xs">
            <AlertTriangle className="size-4 shrink-0" />
            <span>Alertas Operacionais Pendentes</span>
          </div>
          <ul className="text-xs text-destructive/90 space-y-1 pl-6 list-disc">
            {alerts.map((alert, idx) => (
              <li key={idx}>{alert}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Grid de KPIs Executivos */}
      {activeKpis.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-6 text-center text-xs text-muted-foreground">
          Nenhum indicador consolidado foi retornado ainda para este relatório. Execute uma consulta no Copilot para preencher métricas reais.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {activeKpis.map((kpi) => {
          const isUp = kpi.trend === "up" || (kpi.changePercent && kpi.changePercent > 0);
          const isDown = kpi.trend === "down" || (kpi.changePercent && kpi.changePercent < 0);

          return (
            <div
              key={kpi.id}
              className="rounded-xl border border-border/60 bg-card p-4 space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{kpi.label}</span>
                {kpi.changePercent !== undefined && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-2xs font-semibold gap-1 px-2 py-1",
                      isUp && "border-emerald-500/30 text-emerald-600 bg-emerald-500/10",
                      isDown && "border-destructive/30 text-destructive bg-destructive/10",
                      !isUp && !isDown && "border-border text-muted-foreground"
                    )}
                  >
                    {isUp ? (
                      <ArrowUpRight className="size-3" />
                    ) : isDown ? (
                      <ArrowDownRight className="size-3" />
                    ) : null}
                    <span>{Math.abs(kpi.changePercent)}%</span>
                  </Badge>
                )}
              </div>

              <div className="text-xl font-bold text-foreground font-mono">
                {kpi.value}
              </div>

              {kpi.periodLabel && (
                <p className="text-2xs text-muted-foreground">{kpi.periodLabel}</p>
              )}
            </div>
          );
          })}
        </div>
      )}

      {/* Composição / Barras de Distribuição se houver */}
      {breakdowns.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          <h3 className="text-xs font-semibold text-foreground">
            Distribuição por Categoria
          </h3>
          <div className="space-y-2">
            {breakdowns.map((cat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{cat.label}</span>
                  <span className="font-semibold text-foreground font-mono">
                    {cat.percentage}% ({cat.value})
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      cat.colorClass || "bg-primary"
                    )}
                    style={{ width: `${Math.min(100, Math.max(0, cat.percentage))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Atividades Recentes se houver */}
      {recentActivities.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          <h3 className="text-xs font-semibold text-foreground">
            Movimentações Recentes
          </h3>
          <div className="divide-y divide-border/40">
            {recentActivities.map((act) => (
              <div
                key={act.id}
                className="py-2 flex items-center justify-between text-xs first:pt-0 last:pb-0"
              >
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{act.description}</p>
                  <p className="text-2xs text-muted-foreground font-mono">
                    {act.timestamp}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {act.amount && (
                    <span className="font-semibold text-foreground font-mono">
                      {act.amount}
                    </span>
                  )}
                  <Badge variant="secondary" className="text-2xs">
                    {act.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
