import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, Gift, Target, ArrowUpRight, ArrowDownRight, Wallet, CreditCard, Clock, CheckCircle2, AlertCircle, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { getMyCourierEarnings, type CourierEarningsDTO } from "@/services/mobility.functions";

export function CourierEarningsPanel() {
  const [data, setData] = useState<CourierEarningsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    getMyCourierEarnings()
      .then((res) => setData(res))
      .catch((err) => console.warn("Erro ao buscar ganhos de entregador:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-card rounded-2xl border border-border/60">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const summary = data?.summary || {
    today_cents: 0,
    week_cents: 0,
    month_cents: 0,
    pending_cents: 0,
    total_rides: 0,
  };

  const breakdown = data?.breakdown || {
    delivery_fees_cents: 0,
    tips_cents: 0,
    surge_bonuses_cents: 0,
  };

  const payouts = data?.payouts || [];

  return (
    <div className="space-y-6">
      {/* Saldo Principal / Ganhos do Mês */}
      <div className="rounded-2xl bg-card border border-border/80 p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Wallet className="size-3.5 text-primary" />
              Ganhos Acumulados no Mês
            </span>
            <p className="text-3xl sm:text-4xl font-black text-foreground font-mono">
              {formatMoney(summary.month_cents)}
            </p>
            <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <ArrowUpRight className="size-3.5" />
                Hoje: {formatMoney(summary.today_cents)}
              </span>
              <span>•</span>
              <span>Esta semana: {formatMoney(summary.week_cents)}</span>
              <span>•</span>
              <span>{summary.total_rides} corridas</span>
            </div>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 border-border/60 pt-3 sm:pt-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Repasse a Receber
            </span>
            <p className="text-xl sm:text-2xl font-bold text-foreground font-mono">
              {formatMoney(summary.pending_cents)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Split PIX programado automaticamente
            </p>
          </div>
        </div>
      </div>

      {/* Cards de Decomposição (Corridas, Gorjetas, Bônus Surge) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <CreditCard className="size-3.5" />
              Tarifa Base
            </span>
            <span className="text-[10px] font-mono">85%</span>
          </div>
          <p className="text-lg font-bold text-foreground font-mono">
            {formatMoney(breakdown.delivery_fees_cents)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium text-emerald-600">
              <Gift className="size-3.5" />
              Gorjetas Extras
            </span>
            <span className="text-[10px] font-mono text-emerald-600">100% livre</span>
          </div>
          <p className="text-lg font-bold text-emerald-600 font-mono">
            {formatMoney(breakdown.tips_cents)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium text-amber-600">
              <Zap className="size-3.5" />
              Surge Pricing (Chuva/Pico)
            </span>
            <span className="text-[10px] font-mono text-amber-600">Dinâmico</span>
          </div>
          <p className="text-lg font-bold text-amber-600 font-mono">
            {formatMoney(breakdown.surge_bonuses_cents)}
          </p>
        </div>
      </div>

      {/* Histórico de Repasses e Faturas PIX */}
      <div className="rounded-2xl bg-card border border-border/80 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            Extrato de Repasses
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {payouts.length} fechamentos
          </span>
        </div>

        {payouts.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Nenhum repasse registrado ainda</p>
            <p>Os fechamentos de quinzena são gerados automaticamente após a conclusão das corridas.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {payouts.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-background text-xs"
              >
                <div>
                  <p className="font-semibold text-foreground">
                    Período {inv.period} • {inv.total_rides} corridas
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {inv.paid_at ? `Pago em ${formatDate(inv.paid_at)}` : "Aguardando lote PIX"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-foreground font-mono block">
                    {formatMoney(inv.net_payable_cents)}
                  </span>
                  <Badge
                    variant={inv.status === "paid" ? "default" : "secondary"}
                    className="text-[10px] uppercase font-mono px-2 py-0"
                  >
                    {inv.status === "paid" ? "Liquidado" : "Pendente"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
