import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingDown,
  TrendingUp,
  Download,
  BarChart3,
  ShoppingCart,
  Package,
  Filter,
  Search,
  ArrowUpDown,
  FileSpreadsheet,
  PieChart,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { PageHeader } from "@/components/commerce/page-header";
import { EmptyState } from "@/components/state/states";
import { getChannelDRE, exportChannelDRECsv } from "@/services/channel-reports.functions";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import { playCashRegisterSound } from "@/lib/audio-chimes";

export const Route = createFileRoute("/workspace/financeiro/relatorios-canal")({
  head: () => ({
    meta: [{ title: "DRE por Canal & Marketplaces | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
      const dre = await getChannelDRE();
      return { initialDre: Array.isArray(dre) ? dre : [] };
    } catch {
      return { initialDre: [] };
    }
  },
  component: ChannelDREPage,
});

const CHANNEL_COLORS: Record<string, string> = {
  mercadolivre: "bg-amber-400/15 text-amber-700 dark:text-amber-400 border-amber-400/30",
  amazon: "bg-orange-400/15 text-orange-700 dark:text-orange-400 border-orange-400/30",
  magalu: "bg-blue-400/15 text-blue-700 dark:text-blue-400 border-blue-400/30",
  shopee: "bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/30",
  ifood: "bg-red-400/15 text-red-700 dark:text-red-400 border-red-400/30",
  rappi: "bg-emerald-400/15 text-emerald-700 dark:text-emerald-400 border-emerald-400/30",
  amodelivery: "bg-purple-400/15 text-purple-700 dark:text-purple-400 border-purple-400/30",
  correios: "bg-yellow-400/15 text-yellow-700 dark:text-yellow-400 border-yellow-400/30",
  balcao_pos: "bg-slate-400/15 text-slate-700 dark:text-slate-300 border-slate-400/30",
  vitrine_online: "bg-sky-400/15 text-sky-700 dark:text-sky-300 border-sky-400/30",
  outros: "bg-zinc-400/15 text-zinc-600 dark:text-zinc-400 border-zinc-400/30",
};

const CHANNEL_BAR_COLORS: Record<string, string> = {
  mercadolivre: "bg-amber-500",
  amazon: "bg-orange-500",
  magalu: "bg-blue-500",
  shopee: "bg-orange-600",
  ifood: "bg-red-500",
  rappi: "bg-emerald-500",
  amodelivery: "bg-purple-500",
  correios: "bg-yellow-500",
  balcao_pos: "bg-slate-600",
  vitrine_online: "bg-sky-500",
  outros: "bg-zinc-500",
};

function MarginBadge({ value }: { value: number }) {
  const isGood = value >= 70;
  const isWarn = value >= 50 && value < 70;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-mono font-bold",
        isGood ? "text-emerald-600 dark:text-emerald-400" : isWarn ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
      )}
    >
      {isGood ? (
        <TrendingUp className="size-3.5" />
      ) : (
        <TrendingDown className="size-3.5" />
      )}
      {value.toFixed(1)}%
    </span>
  );
}

function ChannelDREPage() {
  const { initialDre } = Route.useLoaderData();
  const [period, setPeriod] = useState<string>("30d");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"gross" | "net" | "margin" | "orders">("gross");
  const [exporting, setExporting] = useState(false);

  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    if (period === "7d") start.setDate(end.getDate() - 7);
    else if (period === "30d") start.setDate(end.getDate() - 30);
    else if (period === "90d") start.setDate(end.getDate() - 90);
    else if (period === "1y") start.setFullYear(end.getFullYear() - 1);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  };

  const { data: dreRows = initialDre, isLoading } = useQuery({
    queryKey: ["channel-dre", period],
    queryFn: () => getChannelDRE({ data: getDateRange() }),
    initialData: initialDre,
    staleTime: 1000 * 60 * 5,
  });

  // ── KPIS GLOBAIS ─────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const gross = dreRows.reduce((s, r) => s + (r.gross_revenue_cents || 0), 0);
    const net = dreRows.reduce((s, r) => s + (r.net_revenue_cents || 0), 0);
    const fees = dreRows.reduce((s, r) => s + (r.platform_fees_cents || 0), 0);
    const shipping = dreRows.reduce((s, r) => s + (r.shipping_costs_cents || 0), 0);
    const orders = dreRows.reduce((s, r) => s + (r.order_count || 0), 0);
    const margin = gross > 0 ? (net / gross) * 100 : 0;

    return { gross, net, fees, shipping, orders, margin };
  }, [dreRows]);

  // ── FILTROS E ORDENAÇÃO ──────────────────────────────────────────────────
  const sortedAndFilteredRows = useMemo(() => {
    return dreRows
      .filter((r) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
          (r.channel_label || "").toLowerCase().includes(term) ||
          (r.channel || "").toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        if (sortBy === "gross") return b.gross_revenue_cents - a.gross_revenue_cents;
        if (sortBy === "net") return b.net_revenue_cents - a.net_revenue_cents;
        if (sortBy === "margin") return b.gross_margin_percent - a.gross_margin_percent;
        if (sortBy === "orders") return b.order_count - a.order_count;
        return 0;
      });
  }, [dreRows, searchTerm, sortBy]);

  // ── EXPORTAÇÃO CSV ───────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await exportChannelDRECsv({ data: getDateRange() });
      const blob = new Blob(["\uFEFF" + result.csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = result.filename;
      link.click();
      playCashRegisterSound();
      toast.success("Relatório DRE exportado em CSV com sucesso!");
    } catch {
      toast.error("Falha ao exportar relatório.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Financeiro & Inteligência"
        title="DRE por Canal de Venda & Marketplaces"
        description="Demonstrativo de Resultado com faturamento bruto, taxas retidas pelas plataformas e margem líquida real de cada canal."
        actions={
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="h-9 rounded-xl text-xs font-bold w-36 bg-background">
                <Filter className="size-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="1y">Último ano</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
              className="rounded-xl text-xs font-bold h-9 gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              <span>{exporting ? "Exportando..." : "Exportar CSV"}</span>
            </Button>
          </div>
        }
      />

      {/* ── KPIS RESUMO CONSOLIDADOS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ShoppingCart className="size-3.5 text-foreground" />
            Pedidos Totais
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {totals.orders}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Transações no período
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 className="size-3.5 text-primary" />
            Receita Bruta
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {formatMoney(totals.gross)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Volume total faturado
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <TrendingDown className="size-3.5 text-rose-600" />
            Taxas Plataformas
          </span>
          <div className="text-2xl font-mono font-bold text-rose-600 dark:text-rose-400">
            -{formatMoney(totals.fees)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Comissões dos canais
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-emerald-600" />
            Receita Líquida
          </span>
          <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {formatMoney(totals.net)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Repasse líquido à loja
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-amber-500" />
            Margem Média
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {totals.margin.toFixed(1)}%
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Aproveitamento da receita
          </p>
        </div>
      </div>

      {/* ── MARKET SHARE POR CANAL (BARRA VISUAL) ── */}
      {totals.gross > 0 && (
        <div className="p-5 rounded-2xl bg-card border border-border/70 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <PieChart className="size-3.5 text-primary" />
              Participação no Faturamento Bruto (Market Share)
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              {dreRows.length} canal(is) ativo(s)
            </span>
          </div>

          {/* Barra Segmentada */}
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-muted/40">
            {dreRows.map((row) => {
              const sharePercent = totals.gross > 0 ? (row.gross_revenue_cents / totals.gross) * 100 : 0;
              if (sharePercent < 1) return null;
              return (
                <div
                  key={row.channel}
                  style={{ width: `${sharePercent}%` }}
                  className={cn("h-full transition-all", CHANNEL_BAR_COLORS[row.channel] || "bg-primary")}
                  title={`${row.channel_label}: ${sharePercent.toFixed(1)}% (${formatMoney(row.gross_revenue_cents)})`}
                />
              );
            })}
          </div>

          {/* Legenda dos Canais */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
            {dreRows.map((row) => {
              const sharePercent = totals.gross > 0 ? (row.gross_revenue_cents / totals.gross) * 100 : 0;
              return (
                <div key={row.channel} className="flex items-center gap-1.5 text-[11px]">
                  <span className={cn("size-2 rounded-full", CHANNEL_BAR_COLORS[row.channel] || "bg-primary")} />
                  <span className="font-medium text-foreground">{row.channel_label}</span>
                  <span className="text-muted-foreground font-mono">({sharePercent.toFixed(1)}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── BARRA DE CONTROLE & BUSCA ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/70">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome do canal..."
            className="pl-10 h-10 rounded-xl text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
            <ArrowUpDown className="size-3.5" /> Ordenar por:
          </span>
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="h-9 rounded-xl text-xs font-bold w-44 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="gross">Maior Faturamento Bruto</SelectItem>
              <SelectItem value="net">Maior Faturamento Líquido</SelectItem>
              <SelectItem value="margin">Maior Margem (%)</SelectItem>
              <SelectItem value="orders">Mais Pedidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── TABELA DRE ANALÍTICA ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-xs text-muted-foreground font-mono">
          Carregando demonstrativo DRE...
        </div>
      ) : sortedAndFilteredRows.length === 0 ? (
        <EmptyState
          title="Nenhum canal no período"
          description="Nenhum pedido ou transação foi registrado para os canais selecionados. Conecte marketplaces em Integrações para acompanhar."
          action={
            <Link to="/workspace/integracoes/marketplaces">
              <Button size="sm" className="rounded-xl text-xs font-bold">
                Ver Integrações
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="bg-card rounded-2xl border border-border/70 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto no-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-xs font-bold">Canal / Origem</TableHead>
                  <TableHead className="text-right text-xs font-bold font-mono">Pedidos</TableHead>
                  <TableHead className="text-right text-xs font-bold font-mono">Bruto</TableHead>
                  <TableHead className="text-right text-xs font-bold font-mono">Taxas Plataforma</TableHead>
                  <TableHead className="text-right text-xs font-bold font-mono">Frete Cobrado</TableHead>
                  <TableHead className="text-right text-xs font-bold font-mono">Líquido Repassado</TableHead>
                  <TableHead className="text-right text-xs font-bold font-mono">Margem Líquida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFilteredRows.map((row) => (
                  <TableRow key={row.channel} className="border-border/40 hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs font-medium">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold rounded-lg px-2.5 py-0.5",
                          CHANNEL_COLORS[row.channel] || CHANNEL_COLORS.outros
                        )}
                      >
                        {row.channel_label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {row.order_count}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                      {formatMoney(row.gross_revenue_cents)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-rose-600 dark:text-rose-400">
                      {row.platform_fees_cents > 0 ? `- ${formatMoney(row.platform_fees_cents)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {row.shipping_costs_cents > 0 ? formatMoney(row.shipping_costs_cents) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(row.net_revenue_cents)}
                    </TableCell>
                    <TableCell className="text-right">
                      <MarginBadge value={row.gross_margin_percent} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="bg-muted/40 border-t border-border/60">
                <TableRow>
                  <TableCell className="text-xs font-bold text-foreground">Totais Consolidados</TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold text-muted-foreground">
                    {totals.orders}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                    {formatMoney(totals.gross)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                    -{formatMoney(totals.fees)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold text-muted-foreground">
                    {formatMoney(totals.shipping)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {formatMoney(totals.net)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                    {totals.margin.toFixed(1)}%
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground font-mono">
        Valores apurados em tempo real a partir de pedidos locais (PDV e E-commerce) e webhooks dos marketplaces parceiros. As taxas consideram os percentuais contratuais reportados em <code className="text-foreground">marketplace_fee_cents</code>.
      </p>
    </div>
  );
}
