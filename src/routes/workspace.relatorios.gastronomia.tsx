import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
 TrendingUp,
 ShoppingBag,
 UtensilsCrossed,
 Bike,
 Store,
 Coffee,
 ChefHat,
 PackageCheck,
 BarChart3,
 Flame,
} from "lucide-react";
import { getGastronomyReports, type GastronomyReportsDTO } from "@/services/order.functions";
import { getStoreSettings } from "@/services/store.functions";
import { NicheOperationalGuard } from "@/components/workspace/niche-operational-guard";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/commerce/page-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/relatorios/gastronomia")({
 head: () => ({ meta: [{ title: "Relatórios Gastronomia | Workspace Waesy" }] }),
 loader: async () => {
 try {
 const [reports, store] = await Promise.all([
 getGastronomyReports().catch(() => null),
 getStoreSettings().catch(() => null),
 ]);
 return { reports, store };
 } catch {
 return { reports: null, store: null };
 }
 },
 component: GastronomyReportsPage,
});

// ─── KPI Card ──────────────────────────────────────────────────────────
function KpiCard({
 label,
 value,
 sub,
 icon: Icon,
 iconCn,
 highlight = false,
}: {
 label: string;
 value: string;
 sub?: string;
 icon: any;
 iconCn?: string;
 highlight?: boolean;
}) {
 return (
 <div
 className={cn(
 "rounded-2xl border p-5 flex flex-col gap-3 transition-shadow",
 highlight
 ? "bg-primary/5 border-primary/30"
 : "bg-card border-border/80 shadow-2xs",
 )}
 >
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{label}</span>
 <div className={cn("size-9 rounded-xl flex items-center justify-center", iconCn || "bg-muted/60")}>
 <Icon className="size-4" />
 </div>
 </div>
 <div>
 <p className={cn("text-2xl font-black tracking-tight", highlight ? "text-primary" : "text-foreground")}>
 {value}
 </p>
 {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
 </div>
 </div>
 );
}

// ─── Heatmap de Horário de Pico ─────────────────────────────────────────
function PeakHoursHeatmap({ peakHoursMap }: { peakHoursMap: Record<string, number> }) {
 const entries = Object.entries(peakHoursMap);
 const maxVal = Math.max(...entries.map(([, v]) => v), 1);

 const getIntensity = (val: number) => {
 const pct = val / maxVal;
 if (pct === 0) return "bg-muted/20 text-muted-foreground/30";
 if (pct < 0.25) return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400";
 if (pct < 0.5) return "bg-amber-500/25 text-amber-700 dark:text-amber-400";
 if (pct < 0.75) return "bg-orange-500/30 text-orange-700 dark:text-orange-400";
 return "bg-red-500/40 text-red-700 dark:text-red-400 font-black";
 };

 return (
 <div>
 <div className="flex flex-wrap gap-1.5">
 {entries.map(([hour, count]) => (
 <div
 key={hour}
 className={cn(
 "flex flex-col items-center justify-center rounded-xl px-2 py-2 min-w-[48px] transition-all",
 getIntensity(count),
 )}
 title={`${hour}h — ${count} pedidos`}
 >
 <span className="text-[11px] font-bold font-mono">{hour}h</span>
 <span className="text-xs font-black">{count}</span>
 </div>
 ))}
 </div>

 {/* Legenda */}
 <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
 <div className="flex items-center gap-1">
 <div className="size-2.5 rounded bg-muted/20" />
 <span>0 pedidos</span>
 </div>
 <div className="flex items-center gap-1">
 <div className="size-2.5 rounded bg-emerald-500/20" />
 <span>Baixo</span>
 </div>
 <div className="flex items-center gap-1">
 <div className="size-2.5 rounded bg-amber-500/25" />
 <span>Médio</span>
 </div>
 <div className="flex items-center gap-1">
 <div className="size-2.5 rounded bg-red-500/40" />
 <span>Pico</span>
 </div>
 </div>
 </div>
 );
}

// ─── Barra de Produto ─────────────────────────────────────────────────
function ProductBar({
 title,
 count,
 revenueCents,
 maxCount,
 rank,
}: {
 title: string;
 count: number;
 revenueCents: number;
 maxCount: number;
 rank: number;
}) {
 const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
 const isTop3 = rank <= 3;

 return (
 <div className="flex items-center gap-3">
 <span
 className={cn(
 "w-6 text-center text-xs font-black font-mono shrink-0",
 isTop3 ? "text-primary" : "text-muted-foreground",
 )}
 >
 {rank}
 </span>

 <div className="flex-1 min-w-0">
 <div className="flex items-baseline justify-between gap-1 mb-1">
 <span className={cn("text-sm font-bold truncate", isTop3 ? "text-foreground" : "text-muted-foreground")}>
 {title}
 </span>
 <span className="text-xs font-mono text-muted-foreground shrink-0">{count}x · {formatMoney(revenueCents)}</span>
 </div>
 <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
 <div
 className={cn(
 "h-full rounded-full transition-all",
 isTop3 ? "bg-primary" : "bg-muted-foreground/40",
 )}
 style={{ width: `${pct}%` }}
 />
 </div>
 </div>
 </div>
 );
}

// ─── Canal Breakdown ────────────────────────────────────────────────────
function ChannelBar({
 label,
 count,
 total,
 icon: Icon,
 colorCn,
}: {
 label: string;
 count: number;
 total: number;
 icon: any;
 colorCn: string;
}) {
 const pct = total > 0 ? Math.round((count / total) * 100) : 0;
 return (
 <div className="flex items-center gap-3">
 <div className={cn("size-8 rounded-xl flex items-center justify-center shrink-0", colorCn)}>
 <Icon className="size-4" />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-baseline justify-between mb-1">
 <span className="text-sm font-bold">{label}</span>
 <span className="text-xs font-mono text-muted-foreground">{count} · {pct}%</span>
 </div>
 <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
 <div className={cn("h-full rounded-full", colorCn.replace("bg-", "bg-").split("/")[0])} style={{ width: `${pct}%` }} />
 </div>
 </div>
 </div>
 );
}

// ─── Página Principal ───────────────────────────────────────────────────
function GastronomyReportsPage() {
 const { reports: loaderData, store } = ((Route.useLoaderData?.() as any) || {});

 const { data: reports, isLoading } = useQuery({
 queryKey: ["gastronomy-reports"],
 queryFn: () => getGastronomyReports(),
 initialData: loaderData ?? undefined,
 staleTime: 60_000, // 1 min
 });

 if (isLoading || !reports) {
 return (
 <div className="flex-1 flex items-center justify-center p-24 text-muted-foreground">
 <div className="text-center space-y-2">
 <BarChart3 className="size-10 mx-auto text-muted-foreground/30 animate-pulse" />
 <p className="text-sm font-bold">Carregando relatórios...</p>
 </div>
 </div>
 );
 }

 const totalChannelToday =
 reports.channelBreakdown.table + reports.channelBreakdown.delivery + reports.channelBreakdown.counter;
 const topCount = reports.topProducts[0]?.count ?? 1;

 return (
 <NicheOperationalGuard
 targetNiche="gastronomy"
 toolTitle="Relatórios de Gastronomia & Salão"
 toolDescription="Métricas de tempo de preparo de cozinha, canais de pedidos (mesa, balcão, delivery) e pratos mais vendidos aplicam-se a negócios de alimentação e gastronomia."
 store={store}
 >
 <div className="w-full space-y-6">
 <PageHeader title="Relatórios Gastronomia" />

 {/* ── KPIs Hoje ── */}
 <section>
 <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Hoje</p>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <KpiCard
 label="Faturamento"
 value={formatMoney(reports.revenueTodayCents)}
 sub="pedidos concluídos"
 icon={TrendingUp}
 iconCn="bg-emerald-500/10 text-emerald-600"
 highlight
 />
 <KpiCard
 label="Ticket Médio"
 value={formatMoney(reports.ticketAverageCents)}
 sub="por pedido"
 icon={UtensilsCrossed}
 iconCn="bg-blue-500/10 text-blue-600"
 />
 <KpiCard
 label="Pedidos"
 value={String(reports.ordersTodayCount)}
 sub={`${reports.itemsSoldToday} itens vendidos`}
 icon={ShoppingBag}
 iconCn="bg-purple-500/10 text-purple-600"
 />
 <KpiCard
 label="Na Cozinha Agora"
 value={String(reports.ordersInProgress + reports.ordersReady)}
 sub={`${reports.ordersInProgress} em preparo · ${reports.ordersReady} prontos`}
 icon={ChefHat}
 iconCn="bg-amber-500/10 text-amber-600"
 />
 </div>
 </section>

 {/* ── KPIs do Mês ── */}
 <section>
 <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Este Mês</p>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <KpiCard
 label="Faturamento do Mês"
 value={formatMoney(reports.revenueMonthCents)}
 icon={TrendingUp}
 iconCn="bg-primary/10 text-primary"
 />
 <KpiCard
 label="Pedidos do Mês"
 value={String(reports.ordersMonthCount)}
 icon={PackageCheck}
 iconCn="bg-muted/60"
 />
 </div>
 </section>

 {/* ── Linha: Canais + Top Produtos ── */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* Canal Breakdown (hoje) */}
 <div className="bg-card rounded-2xl border border-border/80 p-5 shadow-2xs space-y-4">
 <div className="flex items-center justify-between">
 <h2 className="text-sm font-black">Pedidos por Canal</h2>
 <Badge variant="outline" className="text-[10px] font-mono">hoje</Badge>
 </div>
 {totalChannelToday === 0 ? (
 <p className="text-xs text-muted-foreground py-4 text-center">Nenhum pedido hoje ainda.</p>
 ) : (
 <div className="space-y-3">
 <ChannelBar label="Salão / Mesas" count={reports.channelBreakdown.table} total={totalChannelToday} icon={Store} colorCn="bg-blue-500/10 text-blue-600" />
 <ChannelBar label="Delivery" count={reports.channelBreakdown.delivery} total={totalChannelToday} icon={Bike} colorCn="bg-purple-500/10 text-purple-600" />
 <ChannelBar label="Balcão / Retirada" count={reports.channelBreakdown.counter} total={totalChannelToday} icon={Coffee} colorCn="bg-amber-500/10 text-amber-600" />
 </div>
 )}
 </div>

 {/* Status da Cozinha em Tempo Real */}
 <div className="bg-card rounded-2xl border border-border/80 p-5 shadow-2xs space-y-4">
 <div className="flex items-center justify-between">
 <h2 className="text-sm font-black">Status da Cozinha</h2>
 <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10 font-mono">
 ao vivo
 </Badge>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-center">
 <Flame className="size-6 text-blue-600 mx-auto mb-1" />
 <p className="text-2xl font-black text-blue-700 dark:text-blue-400">{reports.ordersInProgress}</p>
 <p className="text-xs font-bold text-muted-foreground">Em Preparo</p>
 </div>
 <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
 <PackageCheck className="size-6 text-emerald-600 mx-auto mb-1" />
 <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{reports.ordersReady}</p>
 <p className="text-xs font-bold text-muted-foreground">Prontos</p>
 </div>
 </div>
 </div>
 </div>

 {/* ── Horário de Pico ── */}
 <div className="bg-card rounded-2xl border border-border/80 p-5 shadow-2xs space-y-4">
 <div className="flex items-center justify-between">
 <h2 className="text-sm font-black">Horário de Pico</h2>
 <Badge variant="outline" className="text-[10px] font-mono">últimos 30 dias</Badge>
 </div>
 {Object.values(reports.peakHoursMap).every((v) => v === 0) ? (
 <p className="text-xs text-muted-foreground py-4 text-center">Sem dados suficientes para gerar o heatmap.</p>
 ) : (
 <PeakHoursHeatmap peakHoursMap={reports.peakHoursMap} />
 )}
 </div>

 {/* ── Top Produtos do Mês ── */}
 <div className="bg-card rounded-2xl border border-border/80 p-5 shadow-2xs space-y-4">
 <div className="flex items-center justify-between">
 <h2 className="text-sm font-black">Produtos Mais Vendidos</h2>
 <Badge variant="outline" className="text-[10px] font-mono">este mês</Badge>
 </div>
 {reports.topProducts.length === 0 ? (
 <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma venda registrada neste mês.</p>
 ) : (
 <div className="space-y-3">
 {reports.topProducts.map((product: any, idx: number) => (
 <ProductBar
 key={product.title}
 rank={idx + 1}
 title={product.title}
 count={product.count}
 revenueCents={product.revenueCents}
 maxCount={topCount}
 />
 ))}
 </div>
 )}
 </div>
 </div>
 </NicheOperationalGuard>
 );
}
