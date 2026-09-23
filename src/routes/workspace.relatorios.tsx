import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  TrendingUp, TrendingDown, ShoppingCart, Users, Package,
  DollarSign, BarChart3, RefreshCw, ArrowUpRight, ArrowDownRight,
  AlertTriangle, Clock, CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import { getDashboardData } from "@/services/dashboard.functions";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/workspace/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios & Análise de Performance | Waesy" }] }),
  loader: async () => {
    try {
      const data = await getDashboardData();
      return data;
    } catch (err) {
      console.error("[loader:workspace.relatorios] Unhandled loader error:", err);
      return null as any;
    }
  },
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const data = Route.useLoaderData() as any;
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await router.invalidate();
    setIsRefreshing(false);
  };

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <BarChart3 className="size-10 text-muted-foreground" />
        <h2 className="font-bold text-lg text-foreground">Dados indisponíveis</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Não foi possível carregar os relatórios. Verifique sua conexão e tente novamente.
        </p>
        <Button variant="outline" size="sm" onClick={handleRefresh}>Tentar novamente</Button>
      </div>
    );
  }

  const growth = data.growthPercentage;
  const isPositiveGrowth = growth !== null && growth >= 0;

  return (
    <div className="w-full space-y-6 pb-12">
      {/* ── Header ── */}
      <PageHeader
        title="Relatórios & Performance"
        description="Visão analítica em tempo real do seu negócio."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5 text-xs font-bold min-h-[44px]"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        }
      />

      {/* ── KPIs Principais ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Vendas Hoje */}
        <div className="bg-card rounded-2xl border border-border/60 p-5 space-y-2 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Vendas Hoje
            </span>
            <DollarSign className="size-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {formatMoney(data.salesTodayCents)}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {data.ordersTodayCount} pedido{data.ordersTodayCount !== 1 ? "s" : ""} hoje
          </span>
        </div>

        {/* Vendas do Mês */}
        <div className="bg-card rounded-2xl border border-border/60 p-5 space-y-2 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Mês Atual
            </span>
            <BarChart3 className="size-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {formatMoney(data.salesMonthCents)}
          </div>
          {growth !== null && (
            <div
              className={`flex items-center gap-1 text-[11px] font-bold ${
                isPositiveGrowth ? "text-emerald-600" : "text-rose-500"
              }`}
            >
              {isPositiveGrowth ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              {Math.abs(growth)}% vs. mês anterior
            </div>
          )}
        </div>

        {/* Novos Clientes */}
        <div className="bg-card rounded-2xl border border-border/60 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Novos Clientes
            </span>
            <Users className="size-4 text-violet-500" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {data.newCustomers30d}
          </div>
          <span className="text-[10px] text-muted-foreground">Últimos 30 dias</span>
        </div>

        {/* Carrinhos Abandonados */}
        <div className="bg-card rounded-2xl border border-border/60 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Carrinhos Abandon.
            </span>
            <ShoppingCart className="size-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-500">
            {data.abandonedCartsCount}
          </div>
          <span className="text-[10px] text-muted-foreground">Últimos 7 dias</span>
        </div>
      </div>

      {/* ── Pipeline de Pedidos & Estoque Crítico ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Pipeline de Status de Pedidos */}
        <div className="bg-card rounded-2xl border border-border/60 p-5 space-y-4">
          <h3 className="font-bold text-sm text-foreground">Pipeline de Pedidos</h3>
          <div className="space-y-3">
            {[
              {
                label: "Aguardando Pagamento",
                count: data.ordersBreakdown?.awaitingPayment ?? 0,
                color: "bg-amber-500",
                icon: Clock,
              },
              {
                label: "Para Separar",
                count: data.ordersBreakdown?.needsSeparation ?? 0,
                color: "bg-blue-500",
                icon: Package,
              },
              {
                label: "Enviado / Pronto",
                count: data.ordersBreakdown?.shippedOrReady ?? 0,
                color: "bg-sky-500",
                icon: TrendingUp,
              },
              {
                label: "Concluídos",
                count: data.ordersBreakdown?.completed ?? 0,
                color: "bg-emerald-500",
                icon: CheckCircle2,
              },
              {
                label: "Cancelados",
                count: data.ordersBreakdown?.cancelled ?? 0,
                color: "bg-rose-500",
                icon: TrendingDown,
              },
            ].map((item) => {
              const Icon = item.icon;
              const total = Object.values(data.ordersBreakdown || {}).reduce(
                (sum: number, v: any) => sum + (v || 0),
                0
              ) as number;
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
              return (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Icon className="size-3.5" />
                      <span>{item.label}</span>
                    </div>
                    <span className="font-bold text-foreground">{item.count}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Estoque Crítico */}
        <div className="bg-card rounded-2xl border border-border/60 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">Estoque em Alerta</h3>
            {(data.criticalStockCount ?? 0) > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {data.criticalStockCount} item{data.criticalStockCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {(data.lowStockItems ?? []).length === 0 ? (
            <EmptyState
              title="Estoque saudável"
              description="Todos os produtos estão com estoque adequado no momento."
            />
          ) : (
            <div className="space-y-2">
              {(data.lowStockItems ?? []).map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-destructive/5 border border-destructive/20"
                >
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-foreground truncate">
                      {item.productTitle}
                    </h4>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      SKU: {item.sku}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <AlertTriangle className="size-3.5 text-destructive" />
                    <span className="text-xs font-black text-destructive">
                      {item.stockOnHand} un.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Atividades Recentes ── */}
      <div className="bg-card rounded-2xl border border-border/60 p-5 space-y-4">
        <h3 className="font-bold text-sm text-foreground">Atividade Recente</h3>
        {(data.recentActivities ?? []).length === 0 ? (
          <EmptyState
            title="Nenhuma atividade recente"
            description="Assim que ocorrerem vendas e pedidos, o histórico de atividades será exibido aqui."
          />
        ) : (
          <div className="space-y-3">
            {(data.recentActivities ?? []).map((activity: any) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/30"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ShoppingCart className="size-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{activity.title}</h4>
                    <p className="text-[10px] text-muted-foreground">{activity.subtitle}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {activity.totalCents && (
                    <span className="text-xs font-black text-foreground block">
                      {formatMoney(activity.totalCents)}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">{activity.timeDisplay}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Rodapé com LTV e Crescimento ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border/60 p-5 space-y-2">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Faturamento Mês Anterior
          </span>
          <div className="text-2xl font-black text-muted-foreground">
            {formatMoney(data.salesLastMonthCents)}
          </div>
          <span className="text-[10px] text-muted-foreground">Referência para cálculo de crescimento</span>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-5 space-y-2">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Pedidos no Mês
          </span>
          <div className="text-2xl font-black text-foreground">{data.ordersMonthCount}</div>
          <span className="text-[10px] text-muted-foreground">Total de pedidos abertos neste mês</span>
        </div>
      </div>
    </div>
  );
}
