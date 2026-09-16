import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyField } from "@/components/ui/currency-field";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatMoney } from "@/lib/money";
import { playCashRegisterSound } from "@/lib/audio-chimes";
import {
  Target,
  TrendingUp,
  Calendar,
  DollarSign,
  ShoppingCart,
  Receipt,
  FileSpreadsheet,
  Settings2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import {
  getRevenueGoalsAndForecast,
  saveRevenueGoals,
  RevenueGoalsAndForecastDTO,
} from "@/services/revenue-goals.functions";

export const Route = createFileRoute("/workspace/relatorios/metas")({
  head: () => ({ meta: [{ title: "Metas de Vendas & Forecast | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const data = await getRevenueGoalsAndForecast();
      return data;
    } catch (err) {
      console.error("[loader:workspace.relatorios.metas] Loader error:", err);
      return null;
    }
  },
  component: RevenueGoalsPage,
});

function RevenueGoalsPage() {
  const router = useRouter();
  const rawData = Route.useLoaderData();

  const data: RevenueGoalsAndForecastDTO = rawData || {
    month_label: "Mês Atual",
    days_in_month: 30,
    elapsed_days: 1,
    remaining_days: 29,
    monthly_goal_cents: 5000000,
    realized_cents: 0,
    percent_achieved: 0,
    projected_closing_cents: 0,
    projected_percent: 0,
    daily_run_rate_cents: 0,
    required_daily_run_rate_cents: 172413,
    orders_count: 0,
    orders_goal: 300,
    average_ticket_cents: 0,
    average_ticket_goal_cents: 16500,
    status: "on_track",
    channels: [],
  };

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados locais para edição de metas
  const [editMonthlyGoalCents, setEditMonthlyGoalCents] = useState<number>(data.monthly_goal_cents);
  const [editOrdersGoal, setEditOrdersGoal] = useState<number>(data.orders_goal);
  const [editAvgTicketGoalCents, setEditAvgTicketGoalCents] = useState<number>(data.average_ticket_goal_cents);
  const [editChannelGoals, setEditChannelGoals] = useState<Record<string, number>>(
    data.channels.reduce((acc, ch) => ({ ...acc, [ch.channel]: ch.target_cents }), {})
  );

  const handleOpenSettings = () => {
    setEditMonthlyGoalCents(data.monthly_goal_cents);
    setEditOrdersGoal(data.orders_goal);
    setEditAvgTicketGoalCents(data.average_ticket_goal_cents);
    setEditChannelGoals(
      data.channels.reduce((acc, ch) => ({ ...acc, [ch.channel]: ch.target_cents }), {})
    );
    setIsSettingsOpen(true);
  };

  const handleSaveGoals = async () => {
    if (editMonthlyGoalCents < 0 || editOrdersGoal < 0) {
      toast.error("Valores de meta não podem ser negativos.");
      return;
    }

    setIsSubmitting(true);
    try {
      await saveRevenueGoals({
        data: {
          monthlyGoalCents: editMonthlyGoalCents,
          ordersGoal: editOrdersGoal,
          averageTicketGoalCents: editAvgTicketGoalCents,
          channelGoals: editChannelGoals,
        },
      });

      playCashRegisterSound();
      toast.success("Metas comerciais atualizadas com sucesso!");
      setIsSettingsOpen(false);
      router.invalidate();
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao salvar metas.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "Indicador Comercial",
      "Realizado no Mês",
      "Meta Alvo",
      "% Atingimento",
      "Projeção Fechamento (Forecast)",
    ];

    const rows = [
      [
        "Faturamento Global (R$)",
        (data.realized_cents / 100).toFixed(2),
        (data.monthly_goal_cents / 100).toFixed(2),
        `${data.percent_achieved}%`,
        (data.projected_closing_cents / 100).toFixed(2),
      ].join(";"),
      [
        "Volume de Pedidos",
        data.orders_count,
        data.orders_goal,
        `${data.orders_goal > 0 ? Math.round((data.orders_count / data.orders_goal) * 100) : 0}%`,
        `${Math.round((data.orders_count / data.elapsed_days) * data.days_in_month)} pedidos`,
      ].join(";"),
      [
        "Ticket Médio (R$)",
        (data.average_ticket_cents / 100).toFixed(2),
        (data.average_ticket_goal_cents / 100).toFixed(2),
        `${data.average_ticket_goal_cents > 0 ? Math.round((data.average_ticket_cents / data.average_ticket_goal_cents) * 100) : 0}%`,
        "-",
      ].join(";"),
      [
        "Ritmo Diário Médio (R$)",
        (data.daily_run_rate_cents / 100).toFixed(2),
        (data.required_daily_run_rate_cents / 100).toFixed(2),
        "-",
        "-",
      ].join(";"),
    ];

    // Canais
    if (data.channels.length > 0) {
      rows.push(["", "", "", "", ""].join(";"));
      rows.push(["CANAIS DE VENDA", "Realizado (R$)", "Meta Canal (R$)", "% Atingido", "Pedidos"].join(";"));
      data.channels.forEach((ch) => {
        rows.push([
          `"${ch.channel_label}"`,
          (ch.realized_cents / 100).toFixed(2),
          (ch.target_cents / 100).toFixed(2),
          `${ch.percent_achieved}%`,
          ch.order_count,
        ].join(";"));
      });
    }

    const csvContent = [headers.join(";"), ...rows].join("\r\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `metas_forecast_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    playCashRegisterSound();
    toast.success("Relatório de metas e forecast exportado com sucesso!");
  };

  const getStatusBadge = () => {
    switch (data.status) {
      case "achieved":
        return (
          <Badge className="bg-emerald-600 text-white font-bold text-xs gap-1.5 px-3 py-1">
            <CheckCircle2 className="size-3.5" />
            Meta Mensal Atingida!
          </Badge>
        );
      case "ahead":
        return (
          <Badge className="bg-blue-600 text-white font-bold text-xs gap-1.5 px-3 py-1">
            <Sparkles className="size-3.5" />
            Ritmo Acelerado (+{data.projected_percent - 100}% acima da meta)
          </Badge>
        );
      case "behind":
        return (
          <Badge variant="destructive" className="font-bold text-xs gap-1.5 px-3 py-1">
            <AlertCircle className="size-3.5" />
            Abaixo do Ritmo Planejado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="font-bold text-xs gap-1.5 px-3 py-1">
            <Clock className="size-3.5" />
            No Ritmo Previsto ({data.projected_percent}% projetado)
          </Badge>
        );
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Planejamento Comercial & Gestão de Vendas"
        title="Metas de Faturamento & Forecast"
        description="Monitore o atingimento das metas mensais de faturamento, a projeção preditiva de fechamento e a meta diária necessária."
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExportCsv}
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-bold h-9 gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              <span>Exportar CSV</span>
            </Button>
            <Button
              onClick={handleOpenSettings}
              variant="default"
              size="sm"
              className="rounded-xl text-xs font-bold h-9 gap-1.5 cursor-pointer"
            >
              <Settings2 className="size-3.5" />
              <span>Configurar Metas</span>
            </Button>
          </div>
        }
      />

      {/* ── CARD HERO: PROGRESSO GLOBAL & FORECAST ── */}
      <div className="p-6 rounded-3xl bg-card border border-border/70 space-y-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/50 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {data.month_label}
              </span>
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Progresso do Faturamento Mensal
            </h2>
          </div>
          <div>{getStatusBadge()}</div>
        </div>

        {/* Barra de Progresso Principal */}
        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-xs text-muted-foreground font-medium">Realizado até hoje:</span>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-foreground">
                {formatMoney(data.realized_cents)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground font-medium">Meta do Mês:</span>
              <div className="text-xl sm:text-2xl font-mono font-bold text-muted-foreground">
                {formatMoney(data.monthly_goal_cents)}
              </div>
            </div>
          </div>

          <div className="h-4 w-full bg-muted/60 rounded-full overflow-hidden p-0.5 border border-border/60">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                data.percent_achieved >= 100
                  ? "bg-emerald-600"
                  : data.percent_achieved >= 70
                    ? "bg-blue-600"
                    : "bg-amber-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(0, data.percent_achieved))}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-xs text-muted-foreground font-mono pt-1">
            <span>
              <strong>{data.percent_achieved}%</strong> da meta atingida
            </span>
            <span>
              Dia {data.elapsed_days} de {data.days_in_month} ({data.remaining_days} dias restantes)
            </span>
          </div>
        </div>
      </div>

      {/* ── GRID DE 4 KPIS DE PERFORMANCE E PROJEÇÃO ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Target className="size-3.5 text-blue-600" />
            Meta Mensal
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {formatMoney(data.monthly_goal_cents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Objetivo global cadastrado
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="size-3.5 text-emerald-600" />
            Realizado Atual
          </span>
          <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {formatMoney(data.realized_cents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            {data.orders_count} pedidos faturados
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-purple-600" />
            Forecast de Fechamento
          </span>
          <div className="text-2xl font-mono font-bold text-purple-600 dark:text-purple-400">
            {formatMoney(data.projected_closing_cents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
            <span>Projetado:</span>
            <strong className={data.projected_percent >= 100 ? "text-emerald-600" : "text-amber-600"}>
              {data.projected_percent}%
            </strong>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ArrowUpRight className="size-3.5 text-amber-500" />
            Meta Diária Necessária
          </span>
          <div className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400">
            {formatMoney(data.required_daily_run_rate_cents)}
            <span className="text-xs font-normal text-muted-foreground">/dia</span>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Ritmo atual: {formatMoney(data.daily_run_rate_cents)}/dia
          </p>
        </div>
      </div>

      {/* ── SEÇÃO SECUNDÁRIA: PEDIDOS E TICKET MÉDIO ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Volume de Pedidos */}
        <div className="p-5 rounded-2xl bg-card border border-border/70 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingCart className="size-4 text-blue-600" />
              Volume de Pedidos
            </span>
            <Badge variant="outline" className="font-mono text-xs">
              {data.orders_goal > 0 ? Math.round((data.orders_count / data.orders_goal) * 100) : 0}% da meta
            </Badge>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xs text-muted-foreground">Realizado:</span>
              <div className="text-2xl font-mono font-bold text-foreground">
                {data.orders_count}{" "}
                <span className="text-xs font-normal text-muted-foreground">pedidos</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground">Meta Alvo:</span>
              <div className="text-xl font-mono font-bold text-muted-foreground">
                {data.orders_goal}{" "}
                <span className="text-xs font-normal text-muted-foreground">pedidos</span>
              </div>
            </div>
          </div>
          <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{
                width: `${Math.min(100, data.orders_goal > 0 ? (data.orders_count / data.orders_goal) * 100 : 0)}%`,
              }}
            />
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="p-5 rounded-2xl bg-card border border-border/70 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="size-4 text-emerald-600" />
              Ticket Médio
            </span>
            <Badge variant="outline" className="font-mono text-xs">
              {data.average_ticket_goal_cents > 0
                ? Math.round((data.average_ticket_cents / data.average_ticket_goal_cents) * 100)
                : 0}% da meta
            </Badge>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xs text-muted-foreground">Média Realizada:</span>
              <div className="text-2xl font-mono font-bold text-foreground">
                {formatMoney(data.average_ticket_cents)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground">Meta Alvo:</span>
              <div className="text-xl font-mono font-bold text-muted-foreground">
                {formatMoney(data.average_ticket_goal_cents)}
              </div>
            </div>
          </div>
          <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full transition-all"
              style={{
                width: `${Math.min(100, data.average_ticket_goal_cents > 0 ? (data.average_ticket_cents / data.average_ticket_goal_cents) * 100 : 0)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── METAS SEGMENTADAS POR CANAL DE VENDA ── */}
      <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-2xs space-y-4 p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border/50 pb-3">
          <div>
            <h3 className="text-base font-bold text-foreground">
              Desempenho & Metas por Canal de Venda
            </h3>
            <p className="text-xs text-muted-foreground">
              Acompanhe a contribuição de cada canal comercial no atingimento da meta global da empresa.
            </p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-border/60 bg-muted/20">
              <TableHead className="text-xs font-bold">Canal Comercial</TableHead>
              <TableHead className="text-xs font-bold font-mono">Pedidos</TableHead>
              <TableHead className="text-xs font-bold font-mono">Faturamento Realizado</TableHead>
              <TableHead className="text-xs font-bold font-mono">Meta do Canal</TableHead>
              <TableHead className="text-xs font-bold text-right">% Atingido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.channels.map((ch) => (
              <TableRow key={ch.channel} className="border-border/40 hover:bg-muted/30 transition-colors">
                <TableCell className="text-xs font-bold text-foreground">
                  {ch.channel_label}
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {ch.order_count}
                </TableCell>
                <TableCell className="text-xs font-mono font-bold text-foreground">
                  {formatMoney(ch.realized_cents)}
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {ch.target_cents > 0 ? formatMoney(ch.target_cents) : <span className="text-muted-foreground/60">Sem meta definida</span>}
                </TableCell>
                <TableCell className="text-right">
                  {ch.target_cents > 0 ? (
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-20 h-2 bg-muted/60 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className={`h-full rounded-full ${
                            ch.percent_achieved >= 100
                              ? "bg-emerald-600"
                              : ch.percent_achieved >= 70
                                ? "bg-blue-600"
                                : "bg-amber-500"
                          }`}
                          style={{ width: `${Math.min(100, ch.percent_achieved)}%` }}
                        />
                      </div>
                      <Badge
                        variant={ch.percent_achieved >= 100 ? "default" : "outline"}
                        className="font-mono text-[10px]"
                      >
                        {ch.percent_achieved}%
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/60 font-mono">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ── SHEET LATERAL DE CONFIGURAÇÃO DE METAS ── */}
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent size="wide" className="sm:max-w-xl flex flex-col h-full bg-background border-l border-border/60">
          <SheetHeader>
            <SheetTitle>Definir Metas Comerciais</SheetTitle>
            <SheetDescription>
              Configure as metas de faturamento, pedidos e ticket médio da sua loja.
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-6 flex-1 overflow-y-auto pr-1">
            {/* Meta Global do Mês */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Meta Mensal de Faturamento Global
              </Label>
              <CurrencyField
                value={editMonthlyGoalCents}
                onChange={(val) => setEditMonthlyGoalCents(val ?? 0)}
                className="font-mono font-bold text-lg h-12 bg-background border-border/80 rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground">
                Receita total esperada no mês somando todos os pontos de contato da empresa.
              </p>
            </div>

            {/* Volume de Pedidos & Ticket Médio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Meta de Pedidos
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={editOrdersGoal}
                  onChange={(e) => setEditOrdersGoal(parseInt(e.target.value, 10) || 0)}
                  className="font-mono font-bold text-sm h-11 bg-background border-border/80 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Meta de Ticket Médio
                </Label>
                <CurrencyField
                  value={editAvgTicketGoalCents}
                  onChange={(val) => setEditAvgTicketGoalCents(val ?? 0)}
                  className="font-mono font-bold text-sm h-11 bg-background border-border/80 rounded-xl"
                />
              </div>
            </div>

            {/* Metas por Canal */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <Label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Metas por Canal Comercial (Opcional)
              </Label>
              <div className="space-y-3">
                {data.channels.map((ch) => (
                  <div key={ch.channel} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20 border border-border/60">
                    <span className="text-xs font-semibold text-foreground">
                      {ch.channel_label}
                    </span>
                    <div className="w-40">
                      <CurrencyField
                        value={editChannelGoals[ch.channel] || 0}
                        onChange={(val) =>
                          setEditChannelGoals((prev) => ({
                            ...prev,
                            [ch.channel]: val ?? 0,
                          }))
                        }
                        className="font-mono text-xs h-9 bg-background border-border/80 rounded-lg text-right"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/60">
            <Button
              className="w-full font-bold rounded-xl h-11 cursor-pointer"
              onClick={handleSaveGoals}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Salvando Metas..." : "Salvar Metas Comerciais"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
