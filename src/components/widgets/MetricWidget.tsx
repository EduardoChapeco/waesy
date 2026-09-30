import React from "react";
import { z } from "zod";
import { TrendingUp, TrendingDown, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Zod Schema Estrito para Injeção Dinâmica via IA / BFF ──
export const MetricWidgetPropsSchema = z.discriminatedUnion("type", [
  // 1. CircularProgress (Taxa de Conclusão / SLAs)
  z.object({
    type: z.literal("circular_progress"),
    title: z.string().max(50),
    percentage: z.number().min(0).max(100),
    subtitle: z.string().max(80).optional(),
    statusLabel: z.string().max(30).optional(),
    badgeVariant: z.enum(["default", "success", "warning", "info"]).optional(),
  }),

  // 2. BarChartMinimal (Tempo Rastreado / Distribuição Diária)
  z.object({
    type: z.literal("bar_chart_minimal"),
    title: z.string().max(50),
    totalLabel: z.string().max(40),
    dataPoints: z.array(
      z.object({
        label: z.string().max(10),
        value: z.number().min(0),
        highlight: z.boolean().optional(),
      })
    ).min(3).max(14),
    subtitle: z.string().max(80).optional(),
  }),

  // 3. BigNumber (Tarefas Pendentes / Métricas Críticas)
  z.object({
    type: z.literal("big_number"),
    title: z.string().max(50),
    value: z.union([z.string(), z.number()]),
    trendPercentage: z.number().optional(),
    trendLabel: z.string().max(40).optional(),
    subtitle: z.string().max(80).optional(),
  }),
]);

export type MetricWidgetProps = z.infer<typeof MetricWidgetPropsSchema>;

/**
 * MetricWidget — Micro-UI de Alta Densidade e Silêncio Visual (MASTER PROMPT V148)
 *
 * Projetado para funcionar com dupla finalidade:
 * 1. Micro-Widget injetável pela IA dentro do fluxo de chat (ia/09-chat.md)
 * 2. Card compacto de Dashboard ou Painel Lateral no Desktop
 *
 * Consome rigorosamente os design tokens CSS (bg-card, text-card-foreground, border-border/60).
 * Zero cores arbitrárias em colchetes e zero emojis.
 */
export function MetricWidget(props: MetricWidgetProps) {
  // Validação em runtime para garantir que payloads da IA cumpram o schema estrito
  const parseResult = MetricWidgetPropsSchema.safeParse(props);
  if (!parseResult.success) {
    return (
      <div className="w-full max-w-sm p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
        <div className="flex items-center gap-1.5 font-bold">
          <AlertCircle className="size-4 shrink-0" />
          <span>Formato de Widget Inválido</span>
        </div>
        <p className="text-xs text-destructive/80 font-mono">
          {parseResult.error.errors[0]?.message || "Payload de props incompatível."}
        </p>
      </div>
    );
  }

  const data = parseResult.data;

  // ── 1. CircularProgress ──
  if (data.type === "circular_progress") {
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (data.percentage / 100) * circumference;

    return (
      <div className="w-full max-w-sm p-4 sm:p-5 rounded-2xl bg-card border border-border/60 shadow-2xs select-none">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground/75 truncate">
              {data.title}
            </span>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {data.percentage}%
              </span>
              {data.statusLabel && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  {data.statusLabel}
                </span>
              )}
            </div>
            {data.subtitle && (
              <p className="text-xs text-muted-foreground truncate pt-0.5">
                {data.subtitle}
              </p>
            )}
          </div>

          {/* SVG Circular Ring Silencioso */}
          <div className="relative size-16 shrink-0 flex items-center justify-center">
            <svg className="size-full -rotate-90" viewBox="0 0 70 70">
              <circle
                cx="35"
                cy="35"
                r={radius}
                className="stroke-muted"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="35"
                cy="35"
                r={radius}
                className="stroke-primary transition-transform duration-300 ease-out"
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <CheckCircle2 className="absolute size-4 text-primary" />
          </div>
        </div>
      </div>
    );
  }

  // ── 2. BarChartMinimal ──
  if (data.type === "bar_chart_minimal") {
    const maxValue = Math.max(...data.dataPoints.map((d) => d.value), 1);

    return (
      <div className="w-full max-w-sm p-4 sm:p-5 rounded-2xl bg-card border border-border/60 shadow-2xs select-none space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/75">
              {data.title}
            </span>
            {data.subtitle && (
              <p className="text-xs text-muted-foreground">{data.subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground font-mono bg-muted/50 px-2 py-1 rounded-lg">
            <Clock className="size-3.5 text-primary" />
            <span>{data.totalLabel}</span>
          </div>
        </div>

        {/* Barras Minimalistas Nativas em Grade 4px */}
        <div className="pt-2 flex items-end justify-between gap-1.5 h-20">
          {data.dataPoints.map((dp, idx) => {
            const heightPercent = Math.max(10, Math.round((dp.value / maxValue) * 100));
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="w-full h-14 flex items-end">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={cn(
                      "w-full rounded-sm transition-colors duration-200",
                      dp.highlight
                        ? "bg-primary"
                        : "bg-muted-foreground/25 hover:bg-muted-foreground/40"
                    )}
                    title={`${dp.label}: ${dp.value}`}
                  />
                </div>
                <span className="text-xs font-mono text-muted-foreground/75 leading-none">
                  {dp.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── 3. BigNumber ──
  if (data.type === "big_number") {
    const isPositive = (data.trendPercentage ?? 0) >= 0;

    return (
      <div className="w-full max-w-sm p-4 sm:p-5 rounded-2xl bg-card border border-border/60 shadow-2xs select-none space-y-2">
        <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground/75 truncate">
          {data.title}
        </span>

        <div className="flex items-baseline justify-between gap-3">
          <span className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-mono">
            {data.value}
          </span>

          {data.trendPercentage !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold font-mono",
                isPositive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              )}
            >
              {isPositive ? (
                <TrendingUp className="size-3.5" />
              ) : (
                <TrendingDown className="size-3.5" />
              )}
              {isPositive ? `+${data.trendPercentage}%` : `${data.trendPercentage}%`}
            </span>
          )}
        </div>

        {(data.trendLabel || data.subtitle) && (
          <p className="text-xs text-muted-foreground truncate">
            {data.trendLabel || data.subtitle}
          </p>
        )}
      </div>
    );
  }

  return null;
}
