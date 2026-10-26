import React, { useState } from "react";
import {
  TrendingUp,
  Coins,
  CheckCircle2,
  Clock,
  Layers,
  Zap,
  BarChart3,
  Calendar,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface CopilotAnalyticsDashboardProps {
  className?: string;
}

interface MetricSummary {
  label: string;
  value: string;
  delta: string;
  isPositive: boolean;
  subtext: string;
  icon: any;
}

export function CopilotAnalyticsDashboard({ className }: CopilotAnalyticsDashboardProps) {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d");
  const [activeChartPoint, setActiveChartPoint] = useState<number | null>(null);

  const metrics: MetricSummary[] = [
    {
      label: "Tarefas Executadas",
      value: "128",
      delta: "+18%",
      isPositive: true,
      subtext: "Últimos 7 dias",
      icon: CheckCircle2,
    },
    {
      label: "$WZ Consumidos",
      value: "842",
      delta: "-12%",
      isPositive: true,
      subtext: "Otimização por cache",
      icon: Coins,
    },
    {
      label: "Taxa de Sucesso",
      value: "99.2%",
      delta: "+0.8%",
      isPositive: true,
      subtext: "Zero falhas críticas",
      icon: TrendingUp,
    },
    {
      label: "Latência Média",
      value: "420ms",
      delta: "-35ms",
      isPositive: true,
      subtext: "Pipeline ReAct rápido",
      icon: Clock,
    },
  ];

  const chartBars = [
    { day: "Seg", value: 18, wz: 120 },
    { day: "Ter", value: 24, wz: 165 },
    { day: "Qua", value: 31, wz: 210 },
    { day: "Qui", value: 22, wz: 145 },
    { day: "Sex", value: 28, wz: 190 },
    { day: "Sáb", value: 12, wz: 80 },
    { day: "Dom", value: 9, wz: 62 },
  ];

  const topSkills = [
    { name: "Modelagem Financeira & Planilhas", calls: 46, percent: 36 },
    { name: "Pesquisa & Descoberta Local", calls: 38, percent: 30 },
    { name: "Proposta Comercial Executiva", calls: 24, percent: 19 },
    { name: "Logística & Roteiro de Viagem", calls: 20, percent: 15 },
  ];

  return (
    <div className={cn("space-y-6 max-w-5xl mx-auto p-4 sm:p-6", className)}>
      {/* ── Cabeçalho de Métricas & Período ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Métricas & Consumo
            </h2>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
              Telemetria
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Acompanhamento de eficiência, uso de tokens $WZ e volume de tarefas concluídas.
          </p>
        </div>

        {/* Seletor de Período com Touch Target de 44px */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-muted/40 border border-border/40 shrink-0">
          {[
            { id: "7d", label: "7 dias" },
            { id: "30d", label: "30 dias" },
            { id: "90d", label: "90 dias" },
          ].map((item) => (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPeriod(item.id as any)}
              className={cn(
                "h-11 min-h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                period === item.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Métricas Horizontais com Rolagem Suave ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="rounded-2xl border border-border/40 bg-card p-4 sm:p-5 flex flex-col justify-between space-y-3 transition-colors duration-200 hover:border-primary/30"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="size-4" />
                </div>
              </div>

              <div>
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {m.value}
                </div>
                <div className="flex items-center gap-2 mt-1 text-2xs">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {m.delta}
                  </span>
                  <span className="text-muted-foreground">{m.subtext}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Gráfico Tátil de Volume e Atividade Semanal ── */}
      <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Volume Diário de Execuções
            </h3>
            <p className="text-2xs text-muted-foreground">
              Distribuição de requisições resolvidas por motores determinísticos e IA
            </p>
          </div>

          <div className="flex items-center gap-3 text-2xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary" />
              <span>Tarefas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-500" />
              <span>$WZ</span>
            </div>
          </div>
        </div>

        {/* Barras de Atividade Interativas com Touch Scrub */}
        <div className="pt-4 pb-2">
          <div className="h-44 w-full flex items-end justify-between gap-2 sm:gap-4 px-2">
            {chartBars.map((bar, idx) => {
              const maxVal = 35;
              const heightPercent = Math.round((bar.value / maxVal) * 100);
              const isHovered = activeChartPoint === idx;

              return (
                <div
                  key={bar.day}
                  onMouseEnter={() => setActiveChartPoint(idx)}
                  onMouseLeave={() => setActiveChartPoint(null)}
                  onClick={() => setActiveChartPoint(idx)}
                  className="flex-1 flex flex-col items-center gap-2 group cursor-pointer focus-visible:outline-none"
                  tabIndex={0}
                  role="button"
                  aria-label={`${bar.day}: ${bar.value} tarefas`}
                >
                  {/* Tooltip Dinâmico */}
                  <div
                    className={cn(
                      "text-2xs font-mono font-semibold px-2 py-1 rounded-md transition-opacity pointer-events-none whitespace-nowrap",
                      isHovered
                        ? "opacity-100 bg-foreground text-background shadow-sm"
                        : "opacity-0"
                    )}
                  >
                    {bar.value} un • {bar.wz} $WZ
                  </div>

                  {/* Barra Visual */}
                  <div className="w-full max-w-12 h-32 flex items-end justify-center rounded-xl bg-muted/30 p-1">
                    <div
                      className={cn(
                        "w-full rounded-lg transition-colors duration-200 duration-300",
                        isHovered ? "bg-primary" : "bg-primary/70 hover:bg-primary"
                      )}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>

                  {/* Rótulo do Dia */}
                  <span className="text-2xs font-medium text-muted-foreground">
                    {bar.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Habilidades Mais Acionadas (Breakdown) ── */}
      <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-foreground">
          Habilidades Mais Acionadas no Período
        </h3>

        <div className="space-y-3">
          {topSkills.map((s) => (
            <div key={s.name} className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground truncate max-w-xs sm:max-w-md">
                  {s.name}
                </span>
                <span className="font-mono text-muted-foreground text-2xs">
                  {s.calls} execuções ({s.percent}%)
                </span>
              </div>
              <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-colors duration-200 duration-500"
                  style={{ width: `${s.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
