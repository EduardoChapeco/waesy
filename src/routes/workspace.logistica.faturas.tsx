import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign,
  CheckCircle2,
  Clock,
  Download,
  Calendar,
  Users,
  CreditCard,
  Building,
  Loader2,
  Inbox,
  Truck,
  Search,
  Eye,
  FileSpreadsheet,
  Coins,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { toast } from "sonner";
import {
  listLogisticsInvoices,
  settleLogisticsInvoice,
  type LogisticsInvoiceDTO,
} from "@/services/mobility.functions";
import { playCashRegisterSound } from "@/lib/audio-chimes";

export const Route = createFileRoute("/workspace/logistica/faturas")({
  head: () => ({
    meta: [{ title: "Faturas & Repasses de Frota | Workspace Waesy" }],
  }),
  component: WorkspaceLogisticsInvoicesPage,
});

function WorkspaceLogisticsInvoicesPage() {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid">("all");
  const [selectedInvoice, setSelectedInvoice] = useState<LogisticsInvoiceDTO | null>(null);

  const { data: invoices = [], isLoading } = useQuery<LogisticsInvoiceDTO[]>({
    queryKey: ["logistics_invoices"],
    queryFn: () => listLogisticsInvoices(),
  });

  const settleMutation = useMutation({
    mutationFn: (id: string) => settleLogisticsInvoice({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logistics_invoices"] });
      playCashRegisterSound();
      toast.success("Fatura liquidada com sucesso e comprovante PIX gerado!");
      setSelectedInvoice(null);
    },
    onError: (err: any) => {
      toast.error(`Erro ao liquidar fatura: ${err.message || "Tente novamente"}`);
    },
  });

  const handleMarkAsPaid = (id: string) => {
    settleMutation.mutate(id);
  };

  // KPIs
  const kpis = useMemo(() => {
    const pendingInvoices = invoices.filter((i) => i.status === "pending");
    const paidInvoices = invoices.filter((i) => i.status === "paid");

    const totalPendingCents = pendingInvoices.reduce((acc, i) => acc + i.net_payable_cents, 0);
    const totalPaidCents = paidInvoices.reduce((acc, i) => acc + i.net_payable_cents, 0);
    const totalRides = invoices.reduce((acc, i) => acc + (i.total_rides || 0), 0);

    const totalRevenueCents = invoices.reduce((acc, i) => acc + i.net_payable_cents, 0);
    const avgFareCents = totalRides > 0 ? Math.round(totalRevenueCents / totalRides) : 0;

    return {
      pendingCount: pendingInvoices.length,
      totalPendingCents,
      paidCount: paidInvoices.length,
      totalPaidCents,
      totalRides,
      avgFareCents,
    };
  }, [invoices]);

  // Filtros
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = inv.courier_name?.toLowerCase().includes(q);
        const matchPhone = inv.courier_phone?.toLowerCase().includes(q);
        const matchPeriod = inv.period?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchPeriod) return false;
      }
      return true;
    });
  }, [invoices, statusFilter, searchQuery]);

  // Exportação CSV
  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) {
      toast.error("Nenhuma fatura para exportar no filtro atual.");
      return;
    }

    const headers = [
      "ID Fatura",
      "Entregador / Transportadora",
      "Telefone",
      "Ciclo de Fechamento",
      "Qtd Corridas",
      "Status",
      "Valor Líquido (R$)",
      "Data de Liquidação",
    ];

    const rows = filteredInvoices.map((i) => [
      `"${i.id}"`,
      `"${i.courier_name || ""}"`,
      `"${i.courier_phone || ""}"`,
      `"${i.period || ""}"`,
      i.total_rides || 0,
      i.status === "paid" ? "Liquidado" : "Pendente",
      `"${(i.net_payable_cents / 100).toFixed(2).replace(".", ",")}"`,
      i.paid_at ? `"${formatDate(i.paid_at)}"` : '""',
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `repasses-frota-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    playCashRegisterSound();
    toast.success("Extrato contábil de repasses exportado com sucesso!");
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      {/* ── HEADER DA PÁGINA ── */}
      <PageHeader
        eyebrow="Logística & Frota"
        title="Faturas & Fechamentos de Frota"
        description="Controle financeiro de repasses quinzenais para motoristas autônomos e transportadoras parceiras."
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              className="font-bold text-xs gap-1.5 h-10 px-3.5 rounded-xl cursor-pointer"
            >
              <FileSpreadsheet className="size-4 text-emerald-600" />
              <span>Exportar CSV</span>
            </Button>
            <Button
              asChild
              size="sm"
              className="font-bold text-xs bg-primary text-primary-foreground gap-1.5 h-10 px-4 rounded-xl cursor-pointer shadow-2xs"
            >
              <Link to="/workspace/pedidos/frota">
                <Truck className="size-4" />
                <span>Gerenciar Frota</span>
              </Link>
            </Button>
          </div>
        }
      />

      {/* ── 4 KPIS NO PARADIGMA CLEAN ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="size-3.5 text-amber-600" />
            Pendente de Repasse
          </span>
          <div className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400">
            {formatMoney(kpis.totalPendingCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            {kpis.pendingCount} fatura(s) em aberto
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            Total Liquidado
          </span>
          <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {formatMoney(kpis.totalPaidCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            {kpis.paidCount} fatura(s) quitada(s)
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Truck className="size-3.5 text-primary" />
            Corridas / Entregas
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {kpis.totalRides}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Volume total apurado
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Coins className="size-3.5 text-foreground" />
            Ticket Médio por Frete
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {formatMoney(kpis.avgFareCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Média por entrega realizada
          </p>
        </div>
      </div>

      {/* ── BARRA DE FERRAMENTAS E FILTROS ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border/70 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por entregador, telefone ou ciclo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-background border-border/80 text-xs font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="h-9 rounded-xl text-xs font-bold cursor-pointer"
          >
            Todos ({invoices.length})
          </Button>
          <Button
            variant={statusFilter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("pending")}
            className="h-9 rounded-xl text-xs font-bold cursor-pointer"
          >
            Pendentes ({kpis.pendingCount})
          </Button>
          <Button
            variant={statusFilter === "paid" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("paid")}
            className="h-9 rounded-xl text-xs font-bold cursor-pointer"
          >
            Liquidados ({kpis.paidCount})
          </Button>
        </div>
      </div>

      {/* ── TABELA DE FATURAS ── */}
      <div className="rounded-2xl bg-card border border-border/70 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Demonstrativo de Repasses ({filteredInvoices.length})
          </h2>
          {isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>

        {filteredInvoices.length === 0 && !isLoading ? (
          <div className="p-16 text-center space-y-4">
            <div className="size-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto text-muted-foreground">
              <Inbox className="size-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <p className="text-sm font-bold text-foreground">Nenhuma fatura encontrada</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                As faturas de fechamento quinzenal são apuradas automaticamente a partir das entregas realizadas pela frota parceira.
              </p>
            </div>
            <div className="pt-2">
              <Button
                asChild
                variant="outline"
                className="rounded-xl font-bold text-xs h-10 px-4"
              >
                <Link to="/workspace/pedidos/frota">
                  <Truck className="size-3.5 mr-1.5" />
                  <span>Gerenciar Frota & Despachos</span>
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredInvoices.map((inv) => (
              <div
                key={inv.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs hover:bg-muted/20 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-sm">{inv.courier_name}</span>
                    <Badge
                      variant="outline"
                      className={
                        inv.status === "paid"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-[10px] font-bold"
                          : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 text-[10px] font-bold"
                      }
                    >
                      {inv.status === "paid" ? "Liquidado" : "Pendente"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {inv.courier_phone || "Sem telefone cadastrado"} • Ciclo: {inv.period} ({inv.total_rides} entregas concluídas)
                  </p>
                </div>

                <div className="flex items-center gap-4 sm:gap-6 justify-between md:justify-end">
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">
                      Valor Líquido
                    </span>
                    <p className="font-mono font-bold text-base text-foreground">
                      {formatMoney(inv.net_payable_cents)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setSelectedInvoice(inv)}
                      variant="outline"
                      size="sm"
                      className="h-10 px-3 rounded-xl text-xs font-bold gap-1 cursor-pointer"
                    >
                      <Eye className="size-3.5 text-muted-foreground" />
                      <span className="hidden sm:inline">Detalhes</span>
                    </Button>

                    {inv.status === "pending" ? (
                      <Button
                        onClick={() => handleMarkAsPaid(inv.id)}
                        disabled={settleMutation.isPending}
                        size="sm"
                        className="h-10 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer shadow-2xs"
                      >
                        {settleMutation.isPending ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-3.5" />
                        )}
                        <span>Baixa PIX</span>
                      </Button>
                    ) : (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 font-mono">
                        <CheckCircle2 className="size-3.5" />
                        <span>Pago {inv.paid_at ? `em ${formatDate(inv.paid_at)}` : ""}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL / DIALOG DE COMPROVANTE DE REPASSE ── */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Comprovante de Repasse de Frota
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Detalhamento contábil e de baixa bancária do ciclo de entregas.
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Entregador:</span>
                  <span className="font-bold text-foreground">{selectedInvoice.courier_name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Contato:</span>
                  <span className="font-mono text-foreground">{selectedInvoice.courier_phone || "Não informado"}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Ciclo de Apuração:</span>
                  <span className="font-mono font-bold text-foreground">{selectedInvoice.period}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Total de Corridas:</span>
                  <span className="font-mono font-bold text-foreground">{selectedInvoice.total_rides} corridas</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Situação Atual:</span>
                  <Badge
                    variant="outline"
                    className={
                      selectedInvoice.status === "paid"
                        ? "text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40 text-[10px]"
                        : "text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40 text-[10px]"
                    }
                  >
                    {selectedInvoice.status === "paid" ? "Liquidado via PIX" : "Pendente de Liquidação"}
                  </Badge>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border/70 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Valor Líquido do Repasse</span>
                  <p className="text-xl font-mono font-bold text-foreground">
                    {formatMoney(selectedInvoice.net_payable_cents)}
                  </p>
                </div>
                <CreditCard className="size-6 text-primary/40" />
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedInvoice(null)}
              className="rounded-xl h-10 text-xs font-bold"
            >
              Fechar
            </Button>
            {selectedInvoice?.status === "pending" && (
              <Button
                onClick={() => selectedInvoice && handleMarkAsPaid(selectedInvoice.id)}
                disabled={settleMutation.isPending}
                size="sm"
                className="rounded-xl h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-2xs"
              >
                {settleMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-3.5" />
                )}
                <span>Confirmar Baixa PIX</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
