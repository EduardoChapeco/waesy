import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Eye,
  MousePointer,
  MessageCircle,
  TrendingUp,
  Download,
  AlertCircle,
  Lightbulb,
  Loader2,
  Layers,
  Sparkles,
  MapPin,
  Clock,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  getClassifiedCommercialPerformance,
  ClassifiedCommercialPerformanceDTO,
} from "@/services/classifieds-analytics.functions";

interface ClassifiedAnalyticsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classifiedId: string | null;
  adTitle?: string;
  onOpenBoostModal?: () => void;
}

export function ClassifiedAnalyticsSheet({
  open,
  onOpenChange,
  classifiedId,
  adTitle = "Anúncio",
  onOpenBoostModal,
}: ClassifiedAnalyticsSheetProps) {
  const isMobile = useIsMobile();
  const [timeframe, setTimeframe] = useState<"today" | "7d" | "30d" | "90d" | "all">("7d");
  const [activeMetricTab, setActiveMetricTab] = useState<"views" | "impressions" | "contacts" | "conversions">("views");

  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ["classified-analytics", classifiedId, timeframe],
    queryFn: () => {
      if (!classifiedId) throw new Error("ID do anúncio não fornecido.");
      return getClassifiedCommercialPerformance({ data: { classifiedId, timeframe } });
    },
    enabled: open && !!classifiedId,
    staleTime: 30_000,
  });

  const handleExportCsv = () => {
    if (!stats) return;
    try {
      const rows = [
        ["Data", "Impressoes", "Visitas", "Contatos", "Conversoes"],
        ...(stats.timeSeries || []).map((p) => [p.date, p.impressions, p.views, p.contacts, p.conversions]),
      ];
      const csvContent = rows.map((e) => e.join(";")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-${(stats.title || "anuncio").toLowerCase().replace(/[^a-z0-9]/g, "_")}-${timeframe}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Relatório CSV exportado com sucesso!");
    } catch {
      toast.error("Erro ao exportar relatório.");
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-primary" />
          <span className="text-xs font-medium">Consolidando métricas e telemetria comercial...</span>
        </div>
      );
    }

    if (isError || !stats) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4">
          <AlertCircle className="size-10 text-destructive" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Falha ao Carregar Telemetria</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Não foi possível sincronizar o histórico analítico deste anúncio no momento.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={() => refetch()}
            className="h-11 min-h-11 px-5 rounded-lg text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
          >
            Tentar Novamente
          </Button>
        </div>
      );
    }

    const safeTimeSeries = Array.isArray(stats.timeSeries) ? stats.timeSeries : [];
    const isEmpty = safeTimeSeries.length === 0;
    const chartSeries = safeTimeSeries.map((p) => {
      if (activeMetricTab === "impressions") return p.impressions;
      if (activeMetricTab === "contacts") return p.contacts;
      if (activeMetricTab === "conversions") return p.conversions;
      return p.views;
    });

    const maxChartValue = Math.max(1, ...chartSeries);
    const chartWidth = 400;
    const chartHeight = 80;
    const chartPoints = chartSeries.map((val, idx) => {
      const x = chartSeries.length > 1 ? (idx / (chartSeries.length - 1)) * chartWidth : chartWidth / 2;
      const y = chartHeight - (val / maxChartValue) * (chartHeight - 16) - 8;
      return `${x},${y}`;
    });
    const pathD = chartPoints.length > 1 ? `M ${chartPoints.join(" L ")}` : "";

    const safeFunnel = Array.isArray(stats.funnel) ? stats.funnel : [];
    const safeTraffic = Array.isArray(stats.trafficSources) ? stats.trafficSources : [];
    const safeCities = Array.isArray(stats.geoCities) ? stats.geoCities : [];
    const safeRecs = Array.isArray(stats.recommendations) ? stats.recommendations : [];

    return (
      <div className="space-y-6 pb-6">
        {/* ── 1. CABEÇALHO DO PAINEL ANALÍTICO ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-2xs font-mono font-bold uppercase tracking-wider">
                {stats.nicheShortLabel}
              </Badge>
              <span className="text-2xs text-muted-foreground font-mono">ID: {stats.classifiedId.slice(0, 8)}</span>
            </div>
            <h2 className="text-base font-bold text-foreground break-words text-wrap leading-tight mt-1">{stats.title}</h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Seletor de Período com Touch Target min-h-11 */}
            <div className="flex items-center p-1 rounded-lg bg-muted/60 border border-border/40 text-xs">
              {(
                [
                  { id: "today", label: "Hoje" },
                  { id: "7d", label: "7 Dias" },
                  { id: "30d", label: "30 Dias" },
                  { id: "90d", label: "90 Dias" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTimeframe(t.id)}
                  className={cn(
                    "h-11 min-h-11 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    timeframe === t.id
                      ? "bg-card text-foreground font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleExportCsv}
              className="size-11 min-h-11 min-w-11 rounded-lg text-muted-foreground hover:text-foreground shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="Exportar CSV"
            >
              <Download className="size-4" />
            </Button>
          </div>
        </div>

        {/* ── 2. KPIS ESSENCIAIS (Cards Squircles Alta Densidade) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border border-border/60 bg-card space-y-1">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
              Impressões
            </span>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl font-black font-mono tracking-tight text-foreground">
                {stats.totalImpressions.toLocaleString("pt-BR")}
              </span>
              {stats.comparisonVsPrevious.impressionsDiffPercent !== 0 && (
                <span
                  className={cn(
                    "text-2xs font-mono font-bold flex items-center",
                    stats.comparisonVsPrevious.impressionsDiffPercent > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {stats.comparisonVsPrevious.impressionsDiffPercent > 0 ? "+" : ""}
                  {stats.comparisonVsPrevious.impressionsDiffPercent}%
                </span>
              )}
            </div>
            <p className="text-2xs text-muted-foreground break-words text-wrap leading-tight">
              {stats.uniqueReach.toLocaleString("pt-BR")} pessoas expostas
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border/60 bg-card space-y-1">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
              Visitas (Página)
            </span>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl font-black font-mono tracking-tight text-foreground">
                {stats.totalViews.toLocaleString("pt-BR")}
              </span>
              {stats.comparisonVsPrevious.viewsDiffPercent !== 0 && (
                <span
                  className={cn(
                    "text-2xs font-mono font-bold flex items-center",
                    stats.comparisonVsPrevious.viewsDiffPercent > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {stats.comparisonVsPrevious.viewsDiffPercent > 0 ? "+" : ""}
                  {stats.comparisonVsPrevious.viewsDiffPercent}%
                </span>
              )}
            </div>
            <p className="text-2xs text-muted-foreground break-words text-wrap leading-tight">
              CTR: <span className="font-mono font-bold text-foreground">{stats.ctrPercent}%</span>
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border/60 bg-card space-y-1">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
              Contatos & Leads
            </span>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                {stats.totalContacts.toLocaleString("pt-BR")}
              </span>
              {stats.comparisonVsPrevious.contactsDiffPercent !== 0 && (
                <span
                  className={cn(
                    "text-2xs font-mono font-bold flex items-center",
                    stats.comparisonVsPrevious.contactsDiffPercent > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {stats.comparisonVsPrevious.contactsDiffPercent > 0 ? "+" : ""}
                  {stats.comparisonVsPrevious.contactsDiffPercent}%
                </span>
              )}
            </div>
            <p className="text-2xs text-muted-foreground break-words text-wrap leading-tight">
              Taxa: <span className="font-mono font-bold text-foreground">{stats.contactRatePercent}%</span>
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border/60 bg-card space-y-1">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
              Conversões
            </span>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl font-black font-mono tracking-tight text-foreground">
                {stats.totalConversions.toLocaleString("pt-BR")}
              </span>
              <span className="text-2xs text-muted-foreground font-mono">
                {stats.avgActiveSeconds}s médios
              </span>
            </div>
            <p className="text-2xs text-muted-foreground break-words text-wrap leading-tight">
              Taxa: <span className="font-mono font-bold text-foreground">{stats.conversionRatePercent}%</span>
            </p>
          </div>
        </div>

        {/* ── 3. GRÁFICO TEMPORAL DE TENDÊNCIA COM ABAS ── */}
        <div className="p-4 rounded-lg border border-border/60 bg-card space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              <span className="text-xs font-bold text-foreground">Evolução Temporal</span>
            </div>

            <div className="flex items-center gap-1">
              {(
                [
                  { id: "views", label: "Visitas" },
                  { id: "impressions", label: "Impressões" },
                  { id: "contacts", label: "Contatos" },
                  { id: "conversions", label: "Conversões" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveMetricTab(m.id)}
                  className={cn(
                    "h-11 min-h-11 px-3 rounded-lg text-2xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    activeMetricTab === m.id
                      ? "bg-primary text-primary-foreground font-bold"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-24 sm:h-28 flex items-center justify-center pt-2">
            {chartSeries.length > 0 && pathD ? (
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                <path
                  d={pathD}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                />
                {chartPoints.length > 0 ? chartPoints.map((pt, i) => {
                  const [cx, cy] = pt.split(",");
                  return (
                    <circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r="3"
                      className="fill-background stroke-primary stroke-2"
                    />
                  );
                }) : null}
              </svg>
            ) : (
              <div className="text-2xs text-muted-foreground font-mono">Sem dados para este período</div>
            )}
          </div>

          <div className="flex items-center justify-between text-2xs font-mono text-muted-foreground pt-1 border-t border-border/40">
            <span>{safeTimeSeries[0]?.date || "Início"}</span>
            <span>Pico: {maxChartValue} {activeMetricTab}</span>
            <span>{safeTimeSeries[safeTimeSeries.length - 1]?.date || "Fim"}</span>
          </div>
        </div>

        {/* ── 4. FUNIL COMERCIAL ADAPTADO POR ETAPAS ── */}
        <div className="p-4 rounded-lg border border-border/60 bg-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <span className="text-xs font-bold text-foreground">Funil de Conversão Comercial</span>
            </div>
            <span className="text-2xs text-muted-foreground font-mono">
              Base: {stats.totalImpressions.toLocaleString("pt-BR")} visualizações
            </span>
          </div>

          <div className="space-y-2">
            {safeFunnel.length > 0 ? (
              safeFunnel.map((step, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground break-words text-wrap leading-tight">{step.label}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-foreground">{step.count.toLocaleString("pt-BR")}</span>
                      <span className="text-2xs text-muted-foreground">({step.ratePercent}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-colors duration-300 motion-reduce:transition-none",
                        idx === 0
                          ? "bg-primary/80"
                          : idx === 1
                          ? "bg-sky-500"
                          : idx === 2
                          ? "bg-indigo-500"
                          : idx === 3
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      )}
                      style={{ width: `${Math.max(2, Math.min(100, step.ratePercent))}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-2xs text-muted-foreground py-2">Sem etapas registradas.</div>
            )}
          </div>
        </div>

        {/* ── 5. ORIGENS DE TRÁFEGO & AUDIÊNCIA (Bento Grid 2 Colunas) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-lg border border-border/60 bg-card space-y-3">
            <span className="text-xs font-bold text-foreground block">De Onde Vieram as Visitas?</span>
            <div className="space-y-2">
              {safeTraffic.length > 0 ? (
                safeTraffic.slice(0, 5).map((src, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground break-words text-wrap leading-tight">{src.label}</span>
                    <div className="flex items-center gap-2 font-mono shrink-0">
                      <span className="font-bold text-foreground">{src.percentage}%</span>
                      <span className="text-2xs text-muted-foreground">({src.count})</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-2xs text-muted-foreground py-2">Sem tráfego mapeado.</div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-lg border border-border/60 bg-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground block">Localização Agregada</span>
              <span className="text-2xs font-mono text-muted-foreground" title="Grupos menores que 5 são agregados para proteção">
                Privacidade Ativa
              </span>
            </div>

            <div className="space-y-2">
              {safeCities.length > 0 ? (
                safeCities.slice(0, 4).map((geo, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground break-words text-wrap leading-tight flex items-center gap-2">
                      <MapPin className="size-3 text-muted-foreground/60 shrink-0" />
                      <span>{geo.name}</span>
                    </span>
                    <span className="font-mono font-bold text-foreground shrink-0">{geo.percentage}%</span>
                  </div>
                ))
              ) : (
                <div className="text-2xs text-muted-foreground py-2">
                  Amostra de localização em consolidação.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border/40 flex items-center gap-2 text-2xs text-muted-foreground">
              <Clock className="size-3 text-primary shrink-0" />
              <span>{stats.peakHoursDescription}</span>
            </div>
          </div>
        </div>

        {/* ── 6. IMPULSIONAMENTO & TRÁFEGO PAGO ── */}
        <div className="p-4 rounded-lg border border-border/60 bg-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-amber-500 fill-current" />
              <span className="text-xs font-bold text-foreground">Impulsionamento & Tráfego Pago</span>
            </div>
            {stats.boostEfficiency.isBoosted ? (
              <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-2xs">
                Ativo • {stats.boostEfficiency.daysRemaining} dias restantes
              </Badge>
            ) : (
              <Badge variant="outline" className="text-2xs text-muted-foreground">
                Inativo
              </Badge>
            )}
          </div>

          {stats.boostEfficiency.isBoosted ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                  <span className="text-2xs text-muted-foreground block">Investimento</span>
                  <span className="text-xs font-bold font-mono text-foreground">
                    {formatMoney(stats.boostEfficiency.budgetSpentCents)} / {formatMoney(stats.boostEfficiency.budgetTotalCents)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                  <span className="text-2xs text-muted-foreground block">Visitas Pagas</span>
                  <span className="text-xs font-bold font-mono text-foreground">
                    {stats.boostEfficiency.sponsoredViews.toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                  <span className="text-2xs text-muted-foreground block">Custo p/ Visita</span>
                  <span className="text-xs font-bold font-mono text-foreground">
                    {stats.boostEfficiency.cpcCents > 0 ? formatMoney(stats.boostEfficiency.cpcCents) : "—"}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                  <span className="text-2xs text-muted-foreground block">Custo p/ Lead</span>
                  <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {stats.boostEfficiency.costPerContactCents > 0
                      ? formatMoney(stats.boostEfficiency.costPerContactCents)
                      : "—"}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-2 text-xs">
                <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider block">
                  Comparativo de Origem
                </span>
                <div className="flex items-center justify-between text-2xs">
                  <span>Visitas Orgânicas: <strong>{stats.boostEfficiency.organicVsPaid.views.organic}</strong></span>
                  <span>Visitas Patrocinadas: <strong>{stats.boostEfficiency.organicVsPaid.views.paid}</strong></span>
                </div>
                <div className="flex items-center justify-between text-2xs">
                  <span>Contatos Orgânicos: <strong>{stats.boostEfficiency.organicVsPaid.contacts.organic}</strong></span>
                  <span>Contatos Patrocinados: <strong>{stats.boostEfficiency.organicVsPaid.contacts.paid}</strong></span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="space-y-1">
                <span className="text-xs font-bold text-foreground block">Acelere as Vendas com Destaque</span>
                <p className="text-2xs text-muted-foreground leading-relaxed">
                  Anúncios impulsionados recebem até 5x mais contatos no topo da busca e do feed.
                </p>
              </div>
              {onOpenBoostModal && (
                <Button
                  type="button"
                  size="default"
                  onClick={onOpenBoostModal}
                  className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold bg-amber-500 text-primary-foreground hover:bg-amber-400 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Zap className="size-3.5 fill-current mr-1" />
                  <span>Impulsionar</span>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ── 7. RECOMENDAÇÕES ("O Que Posso Melhorar?") ── */}
        {safeRecs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="size-4 text-amber-500" />
              <span className="text-xs font-bold text-foreground">O que você pode melhorar?</span>
            </div>

            <div className="space-y-2">
              {safeRecs.length > 0 ? safeRecs.map((rec, i) => (
                <div
                  key={i}
                  className={cn(
                    "p-3 rounded-lg border text-xs space-y-2",
                    rec.type === "warning"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                      : "bg-muted/30 border-border/50 text-foreground"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold flex items-center gap-2">
                      {rec.type === "warning" ? (
                        <AlertCircle className="size-3.5 text-amber-600 shrink-0" />
                      ) : (
                        <Sparkles className="size-3.5 text-primary shrink-0" />
                      )}
                      <span>{rec.title}</span>
                    </span>
                    {rec.actionLabel && rec.actionUrl && (
                      <Button
                        asChild
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-2xs font-bold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <a href={rec.actionUrl}>{rec.actionLabel}</a>
                      </Button>
                    )}
                  </div>
                  <p className="text-2xs text-muted-foreground leading-relaxed">
                    {rec.description}
                  </p>
                </div>
              )) : null}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-lg p-4 sm:p-6 max-h-screen bg-card border-t border-border/70 overflow-y-auto no-scrollbar overscroll-contain"
        >
          <SheetHeader className="text-left pb-2">
            <SheetTitle className="text-base font-bold text-foreground">
              Performance Comercial
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Telemetria de visitas, funil comercial e eficiência de anúncios
            </SheetDescription>
          </SheetHeader>
          {renderContent()}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-screen rounded-lg p-6 overflow-y-auto bg-card border border-border/70">
        <DialogHeader className="text-left pb-2">
          <DialogTitle className="text-base font-bold text-foreground">
            Performance Comercial do Anúncio
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Relatório de inteligência comercial, funil e telemetria de audiência
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
