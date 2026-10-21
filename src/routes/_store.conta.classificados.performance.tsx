import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Tag,
  Eye,
  MessageCircle,
  Zap,
  ArrowLeft,
  Calendar,
  AlertCircle,
  Sparkles,
  BarChart3,
  ExternalLink,
  ChevronRight,
  Loader2,
  RefreshCw,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { NativeMobileHeader } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getAccountClassifiedsCommercialDashboard,
  AccountClassifiedsDashboardDTO,
} from "@/services/classifieds-analytics.functions";
import { ClassifiedAnalyticsSheet } from "@/components/classifieds/classified-analytics-sheet";

export const Route = createFileRoute("/_store/conta/classificados/performance")({
  head: () => ({ meta: [{ title: "Performance da Conta | Waesy" }] }),
  component: AccountClassifiedsPerformanceRoute,
});

function AccountClassifiedsPerformanceRoute() {
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [activeMetricTab, setActiveMetricTab] = useState<"views" | "contacts" | "conversions">("views");
  const [selectedAdForDetail, setSelectedAdForDetail] = useState<{ id: string; title: string } | null>(null);

  const { data: dashboard, isLoading, isError, refetch } = useQuery({
    queryKey: ["account-classifieds-performance", timeframe],
    queryFn: () => getAccountClassifiedsCommercialDashboard({ data: { timeframe } }),
    staleTime: 60_000,
  });

  const safeTimeSeries = Array.isArray(dashboard?.overallTimeSeries) ? dashboard.overallTimeSeries : [];
  const isDashboardEmpty = safeTimeSeries.length === 0;
  const chartSeries = safeTimeSeries.map((p) => {
    if (activeMetricTab === "contacts") return p.contacts;
    if (activeMetricTab === "conversions") return p.conversions;
    return p.views;
  });

  const maxVal = Math.max(1, ...chartSeries);
  const chartWidth = 500;
  const chartHeight = 96;
  const chartPoints = chartSeries.map((val, idx) => {
    const x = chartSeries.length > 1 ? (idx / (chartSeries.length - 1)) * chartWidth : chartWidth / 2;
    const y = chartHeight - (val / maxVal) * (chartHeight - 20) - 10;
    return `${x},${y}`;
  });
  const pathD = chartPoints.length > 1 ? `M ${chartPoints.join(" L ")}` : "";

  const safeTopViewed = Array.isArray(dashboard?.topViewedAds) ? dashboard.topViewedAds : [];
  const safeTopContacts = Array.isArray(dashboard?.topContactAds) ? dashboard.topContactAds : [];
  const safeUnderperforming = Array.isArray(dashboard?.underperformingAds) ? dashboard.underperformingAds : [];
  const safeNiches = Array.isArray(dashboard?.nicheDistribution) ? dashboard.nicheDistribution : [];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-28 px-0 sm:px-4 md:px-0">
      {/* ── 1. CABEÇALHO NATIVO UNIVERSAL BIDIRECIONAL ── */}
      <NativeMobileHeader
        fallbackHref="/conta/classificados"
        title="Performance da Conta"
        centerTitle={true}
        rightActions={
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            <Link to="/conta/classificados">
              <span>Meus Anúncios</span>
            </Link>
          </Button>
        }
      />

      {/* ── Desktop Inpage Header ── */}
      <div className="hidden md:flex items-center justify-between pb-4 pt-2 border-b border-border/40">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-11 min-h-11 min-w-11 rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Voltar para Anúncios"
          >
            <Link to="/conta/classificados">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Cockpit de Performance Comercial</h1>
            <p className="text-xs text-muted-foreground mt-1">Visão consolidada de audiência, alcance, leads e conversão de todos os anúncios</p>
          </div>
        </div>

        {/* Seletor de Período Desktop com Piso 44px */}
        <div className="flex items-center p-1 rounded-lg bg-muted/60 border border-border/40 text-xs">
          {(
            [
              { id: "7d", label: "7 Dias" },
              { id: "30d", label: "30 Dias" },
              { id: "90d", label: "90 Dias" },
              { id: "all", label: "Histórico Total" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTimeframe(t.id)}
              className={cn(
                "h-11 min-h-11 px-4 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                timeframe === t.id
                  ? "bg-card text-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-primary" />
          <span className="text-xs font-medium">Consolidando métricas comerciais de toda a sua conta...</span>
        </div>
      ) : isError || !dashboard ? (
        <div className="p-8 text-center space-y-4 rounded-lg border border-border/60 bg-card mx-4 sm:mx-0">
          <AlertCircle className="size-10 text-destructive mx-auto" />
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">Falha ao Sincronizar Performance da Conta</h2>
            <p className="text-xs text-muted-foreground">Não foi possível carregar as métricas agregadas dos seus anúncios.</p>
          </div>
          <Button
            type="button"
            onClick={() => refetch()}
            className="h-11 min-h-11 px-5 rounded-lg text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
          >
            <RefreshCw className="size-4 mr-2" />
            <span>Tentar Novamente</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-6 px-4 sm:px-0">
          {/* ── 2. KPIS GLOBAIS DA CONTA (Cards Squircles Grandes) ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card: Total de Visitas */}
            <div className="p-4 rounded-lg border border-border/60 bg-card space-y-1">
              <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
                Visitas Totais
              </span>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-2xl font-black font-mono tracking-tight text-foreground">
                  {dashboard.totalViews.toLocaleString("pt-BR")}
                </span>
                <span className="text-2xs font-mono font-bold text-primary">
                  CTR {dashboard.avgCtrPercent}%
                </span>
              </div>
              <p className="text-2xs text-muted-foreground break-words text-wrap leading-tight">
                {dashboard.totalImpressions.toLocaleString("pt-BR")} impressões na vitrine
              </p>
            </div>

            {/* Card: Contatos e Leads */}
            <div className="p-4 rounded-lg border border-border/60 bg-card space-y-1">
              <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
                Contatos & Leads
              </span>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                  {dashboard.totalContacts.toLocaleString("pt-BR")}
                </span>
                <span className="text-2xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {dashboard.avgContactRatePercent}% taxa
                </span>
              </div>
              <p className="text-2xs text-muted-foreground break-words text-wrap leading-tight">
                WhatsApp, chat e propostas
              </p>
            </div>

            {/* Card: Conversões Realizadas */}
            <div className="p-4 rounded-lg border border-border/60 bg-card space-y-1">
              <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
                Conversões Fechadas
              </span>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-2xl font-black font-mono tracking-tight text-foreground">
                  {dashboard.totalConversions.toLocaleString("pt-BR")}
                </span>
                <span className="text-2xs font-mono font-bold text-muted-foreground">
                  {dashboard.soldAds} finalizados
                </span>
              </div>
              <p className="text-2xs text-muted-foreground break-words text-wrap leading-tight">
                {dashboard.activeAds} anúncios ativos em circulação
              </p>
            </div>

            {/* Card: Impulsionamento & Tráfego Pago */}
            <div className="p-4 rounded-lg border border-border/60 bg-card space-y-1">
              <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
                Investimento Publicitário
              </span>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-2xl font-black font-mono tracking-tight text-foreground">
                  {formatMoney(dashboard.totalInvestedCents)}
                </span>
                <Badge variant="outline" className="text-2xs font-bold border-amber-500/30 text-amber-700 dark:text-amber-400">
                  {dashboard.boostedAds} boosts
                </Badge>
              </div>
              <p className="text-2xs text-muted-foreground break-words text-wrap leading-tight">
                {dashboard.costPerContactCents > 0
                  ? `Custo/Lead: ${formatMoney(dashboard.costPerContactCents)}`
                  : "Sem campanhas ativas"}
              </p>
            </div>
          </div>

          {/* ── 3. GRÁFICO TEMPORAL CONSOLIDADO DE TODA A CONTA ── */}
          <div className="p-4 sm:p-5 rounded-lg border border-border/60 bg-card space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Tendência da Conta</span>
              </div>

              {/* Seletor de Métrica */}
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: "views", label: "Visitas" },
                    { id: "contacts", label: "Contatos" },
                    { id: "conversions", label: "Conversões" },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActiveMetricTab(m.id)}
                    className={cn(
                      "h-11 min-h-11 px-4 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
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

            {/* Gráfico SVG Silencioso */}
            <div className="w-full h-28 sm:h-36 flex items-center justify-center pt-2">
              {chartSeries.length > 0 && pathD ? (
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                  <path
                    d={pathD}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
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
                        r="3.5"
                        className="fill-background stroke-primary stroke-2"
                      />
                    );
                  }) : null}
                </svg>
              ) : (
                <div className="text-xs text-muted-foreground font-mono">Sem dados consolidados para o período</div>
              )}
            </div>

            <div className="flex items-center justify-between text-2xs font-mono text-muted-foreground pt-2 border-t border-border/40">
              <span>{safeTimeSeries[0]?.date || "Início do período"}</span>
              <span>Pico registrado: {maxVal} {activeMetricTab}</span>
              <span>{safeTimeSeries[safeTimeSeries.length - 1]?.date || "Hoje"}</span>
            </div>
          </div>

          {/* ── 4. RANKING DOS PRÓPRIOS ANÚNCIOS (Bento Grid 2 Colunas) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mais Visualizados */}
            <div className="p-4 sm:p-5 rounded-lg border border-border/60 bg-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="size-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Mais Visualizados</span>
                </div>
                <span className="text-2xs text-muted-foreground font-mono">Top 5</span>
              </div>

              <div className="space-y-2">
                {safeTopViewed.length > 0 ? (
                  safeTopViewed.map((ad, idx) => (
                    <div
                      key={ad.id}
                      className="p-3 rounded-lg bg-muted/30 border border-border/40 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-2xs font-mono font-bold text-muted-foreground">#{idx + 1}</span>
                          <span className="text-xs font-bold text-foreground break-words text-wrap leading-tight block">{ad.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-2xs text-muted-foreground font-mono">
                          <span>{ad.viewsCount.toLocaleString("pt-BR")} visitas</span>
                          <span>•</span>
                          <span>CTR {ad.ctrPercent}%</span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAdForDetail({ id: ad.id, title: ad.title })}
                        className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0 cursor-pointer"
                      >
                        <BarChart3 className="size-3.5 mr-1" />
                        <span>Stats</span>
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground py-4 text-center">Nenhum anúncio com visualizações.</div>
                )}
              </div>
            </div>

            {/* Mais Contatos */}
            <div className="p-4 sm:p-5 rounded-lg border border-border/60 bg-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-foreground">Mais Contatos & Leads</span>
                </div>
                <span className="text-2xs text-muted-foreground font-mono">Top 5</span>
              </div>

              <div className="space-y-2">
                {safeTopContacts.length > 0 ? (
                  safeTopContacts.map((ad, idx) => (
                    <div
                      key={ad.id}
                      className="p-3 rounded-lg bg-muted/30 border border-border/40 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-2xs font-mono font-bold text-muted-foreground">#{idx + 1}</span>
                          <span className="text-xs font-bold text-foreground break-words text-wrap leading-tight block">{ad.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-2xs text-muted-foreground font-mono">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            {ad.contactsCount} contatos
                          </span>
                          <span>•</span>
                          <span>Taxa: {ad.contactRatePercent}%</span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAdForDetail({ id: ad.id, title: ad.title })}
                        className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0 cursor-pointer"
                      >
                        <BarChart3 className="size-3.5 mr-1" />
                        <span>Stats</span>
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground py-4 text-center">Nenhum contato registrado até o momento.</div>
                )}
              </div>
            </div>
          </div>

          {/* ── 5. DIAGNÓSTICO & ANÚNCIOS QUE DEMANDAM ATENÇÃO ── */}
          {safeUnderperforming.length > 0 && (
            <div className="p-4 sm:p-5 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-foreground">Anúncios que Precisam de Atenção</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {safeUnderperforming.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-card border border-border/50 space-y-2 text-xs flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <span className="font-bold text-foreground block break-words text-wrap leading-tight">{item.title}</span>
                      <p className="text-2xs text-amber-700 dark:text-amber-400 font-medium">{item.reason}</p>
                      <p className="text-2xs text-muted-foreground leading-relaxed">{item.suggestion}</p>
                    </div>

                    <div className="pt-2 flex items-center justify-end">
                      <Button
                        asChild
                        size="sm"
                        className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold bg-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Link to="/conta/classificados/novo" search={{ editId: item.id } as any}>
                          <span>Ajustar Anúncio</span>
                          <ChevronRight className="size-3.5 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 6. DISTRIBUIÇÃO DO PORTFÓLIO POR NICHO ── */}
          <div className="p-4 sm:p-5 rounded-lg border border-border/60 bg-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Distribuição do Portfólio por Nicho</span>
              </div>
              <span className="text-2xs font-mono text-muted-foreground">
                {dashboard.totalAds} anúncios totais
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {safeNiches.length > 0 ? (
                safeNiches.map((n, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/40 border border-border/40 space-y-1">
                    <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block break-words text-wrap leading-tight">
                      {n.niche}
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-bold font-mono text-foreground">{n.count}</span>
                      <span className="text-2xs font-mono text-muted-foreground">{n.percentage}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground col-span-4 py-2">Sem categorias cadastradas.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SHEET ANALÍTICO DEDICADO DO ANÚNCIO SELECIONADO ── */}
      {selectedAdForDetail && (
        <ClassifiedAnalyticsSheet
          open={!!selectedAdForDetail}
          onOpenChange={(open) => !open && setSelectedAdForDetail(null)}
          classifiedId={selectedAdForDetail.id}
          adTitle={selectedAdForDetail.title}
        />
      )}
    </div>
  );
}

export default AccountClassifiedsPerformanceRoute;
