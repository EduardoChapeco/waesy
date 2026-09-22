import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
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
import { listExchanges, updateExchangeStatus } from "@/services/exchanges.functions";
import { formatMoney } from "@/lib/money";
import { EmptyState } from "@/components/state/states";
import {
  Search,
  KanbanSquare,
  Table as TableIcon,
  CheckCircle2,
  Gift,
  RefreshCw,
  Banknote,
  XCircle,
  FileSpreadsheet,
  RotateCcw,
  Clock,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { formatDate } from "@/lib/datetime";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { playCashRegisterSound, playWarningAlert } from "@/lib/audio-chimes";

export const Route = createFileRoute("/workspace/pedidos/trocas")({
  head: () => ({ meta: [{ title: "Trocas e Devoluções (RMA) | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const data = await listExchanges();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("[loader:workspace.pedidos.trocas] Unhandled loader error:", err);
      return [];
    }
  },
  component: ExchangesDashboardPage,
});

function translateStatus(status: string) {
  const map: Record<string, string> = {
    requested: "Solicitada",
    approved: "Em Andamento",
    completed: "Concluída",
    rejected: "Rejeitada",
  };
  return map[status] || status;
}

function getStatusBadge(
  status: string,
): "default" | "secondary" | "destructive" | "outline" | "success" {
  switch (status) {
    case "requested":
      return "secondary";
    case "approved":
      return "default";
    case "completed":
      return "success";
    case "rejected":
      return "destructive";
    default:
      return "outline";
  }
}

function getExchangeChannelBadge(channel?: string) {
  switch (channel) {
    case "mercadolivre":
      return (
        <Badge variant="outline" className="text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
          Mercado Livre
        </Badge>
      );
    case "ifood":
      return (
        <Badge variant="outline" className="text-[10px] font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30">
          iFood
        </Badge>
      );
    case "amazon":
      return (
        <Badge variant="outline" className="text-[10px] font-medium bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30">
          Amazon
        </Badge>
      );
    case "whatsapp":
      return (
        <Badge variant="outline" className="text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
          WhatsApp
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground border-border/60">
          Balcão / Loja
        </Badge>
      );
  }
}

const KANBAN_COLUMNS = [
  { id: "requested", title: "Novas" },
  { id: "approved", title: "Em Andamento" },
  { id: "completed", title: "Concluídas" },
  { id: "rejected", title: "Rejeitadas" },
];

function ResolutionDrawer({
  exchange,
  isOpen,
  onClose,
  onResolved,
}: {
  exchange: any;
  isOpen: boolean;
  onClose: () => void;
  onResolved: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolutionType, setResolutionType] = useState<"store_credit" | "refund" | "replacement">(
    "store_credit",
  );
  const [refundCents, setRefundCents] = useState<number>(exchange?.orderTotal || 0);

  useEffect(() => {
    if (exchange?.orderTotal) {
      setRefundCents(exchange.orderTotal);
    }
  }, [exchange]);

  const handleResolve = async () => {
    if (refundCents < 0) {
      toast.error("Valor inválido");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateExchangeStatus({
        data: {
          exchangeId: exchange.id,
          status: "completed",
          resolutionType,
          refundCents,
        },
      });
      playCashRegisterSound();
      toast.success("Troca / Devolução concluída com sucesso!");
      onResolved();
      onClose();
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao concluir troca");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <SheetContent size="wide" className="sm:max-w-xl md:max-w-2xl flex flex-col h-full bg-background border-l border-border/60">
        <SheetHeader>
          <SheetTitle>Finalizar Troca / Devolução</SheetTitle>
          <SheetDescription>
            Pedido #{exchange?.orderToken} — Defina a resolução para o cliente.
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6 flex-1 overflow-y-auto">
          <div className="p-4 bg-muted/30 border border-border/60 rounded-xl space-y-2">
            <h4 className="font-semibold text-sm text-foreground">Resumo da Solicitação</h4>
            <p className="text-xs text-muted-foreground">Motivo: {exchange?.reason}</p>
            <p className="text-xs text-muted-foreground font-bold font-mono">
              Valor do Pedido: {formatMoney(exchange?.orderTotal || 0)}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold mb-2 block text-muted-foreground uppercase tracking-wider">
                Tipo de Resolução
              </Label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setResolutionType("store_credit")}
                  className={`flex items-center gap-3 p-3.5 border rounded-xl text-left transition-colors cursor-pointer ${
                    resolutionType === "store_credit"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border/70 hover:bg-muted/30"
                  }`}
                >
                  <Gift
                    className={`size-5 shrink-0 ${resolutionType === "store_credit" ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <div>
                    <p className="font-semibold text-sm text-foreground">Vale-Compras (Recomendado)</p>
                    <p className="text-xs text-muted-foreground">
                      Gera automaticamente um Gift Card com saldo para o cliente reutilizar na loja
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setResolutionType("refund")}
                  className={`flex items-center gap-3 p-3.5 border rounded-xl text-left transition-colors cursor-pointer ${
                    resolutionType === "refund"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border/70 hover:bg-muted/30"
                  }`}
                >
                  <Banknote
                    className={`size-5 shrink-0 ${resolutionType === "refund" ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <div>
                    <p className="font-semibold text-sm text-foreground">Estorno Financeiro</p>
                    <p className="text-xs text-muted-foreground">
                      Devolução integral ou parcial do valor pago via Pix ou Cartão
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setResolutionType("replacement")}
                  className={`flex items-center gap-3 p-3.5 border rounded-xl text-left transition-colors cursor-pointer ${
                    resolutionType === "replacement"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border/70 hover:bg-muted/30"
                  }`}
                >
                  <RefreshCw
                    className={`size-5 shrink-0 ${resolutionType === "replacement" ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <div>
                    <p className="font-semibold text-sm text-foreground">Substituição por Outro Item</p>
                    <p className="text-xs text-muted-foreground">
                      Entrega de novo produto com compensação de saldo direto no balcão
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {(resolutionType === "store_credit" || resolutionType === "refund") && (
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Valor da Resolução
                </Label>
                <CurrencyField
                  value={refundCents}
                  onChange={(val) => setRefundCents(val ?? 0)}
                  className="font-mono font-bold text-lg h-12 bg-background border-border/80 rounded-xl"
                />
              </div>
            )}

            <Button
              className="w-full mt-4 font-bold rounded-xl h-11 cursor-pointer"
              onClick={handleResolve}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Finalizando..." : "Concluir Troca"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ExchangesDashboardPage() {
  const rawExchanges = Route.useLoaderData();
  const exchanges = Array.isArray(rawExchanges) ? rawExchanges : [];
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [resolvingExchange, setResolvingExchange] = useState<any>(null);

  // ── KPIS DE TROCAS E DEVOLUÇÕES ──────────────────────────────────────────
  const kpis = useMemo(() => {
    let pendingCount = 0;
    let completedCount = 0;
    let refundedCents = 0;
    let storeCreditCents = 0;

    exchanges.forEach((ex: any) => {
      if (ex.status === "requested" || ex.status === "approved") {
        pendingCount += 1;
      } else if (ex.status === "completed") {
        completedCount += 1;
        if (ex.resolutionType === "refund") {
          refundedCents += ex.refundCents || ex.orderTotal || 0;
        } else if (ex.resolutionType === "store_credit") {
          storeCreditCents += ex.refundCents || ex.orderTotal || 0;
        }
      }
    });

    return {
      total: exchanges.length,
      pendingCount,
      completedCount,
      refundedCents,
      storeCreditCents,
    };
  }, [exchanges]);

  // ── EXPORTAÇÃO CSV CONTÁBIL ──────────────────────────────────────────────
  const handleExportCsv = () => {
    if (exchanges.length === 0) {
      toast.info("Nenhuma solicitação de troca para exportar.");
      return;
    }

    const headers = [
      "ID Pedido",
      "Cliente",
      "Canal",
      "Motivo da Troca",
      "Data da Solicitação",
      "Status",
      "Tipo de Resolução",
      "Valor da Troca (R$)",
    ];

    const rows = exchanges.map((ex: any) => {
      const channelName = ex.channel || ex.origin_channel || "Balcão";
      const resolution =
        ex.resolutionType === "store_credit"
          ? "Vale-Compras"
          : ex.resolutionType === "refund"
            ? "Estorno Financeiro"
            : ex.resolutionType === "replacement"
              ? "Substituição"
              : "Pendente";

      return [
        `"#${ex.orderToken || ""}"`,
        `"${(ex.customerName || "Cliente").replace(/"/g, '""')}"`,
        `"${channelName}"`,
        `"${(ex.reason || "").replace(/"/g, '""')}"`,
        formatDate(ex.requestedAt),
        translateStatus(ex.status),
        `"${resolution}"`,
        ((ex.refundCents || ex.orderTotal || 0) / 100).toFixed(2),
      ].join(";");
    });

    const csvContent = [headers.join(";"), ...rows].join("\r\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `trocas_devolucoes_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    playCashRegisterSound();
    toast.success("Relatório de trocas e devoluções exportado com sucesso!");
  };

  const filteredExchanges = exchanges.filter((ex: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      ex.orderToken?.toLowerCase().includes(q) ||
      ex.customerName?.toLowerCase().includes(q) ||
      ex.reason?.toLowerCase().includes(q)
    );
  });

  const handleUpdateStatus = async (exchangeId: string, status: "approved" | "rejected") => {
    setProcessingId(exchangeId);
    try {
      await updateExchangeStatus({ data: { exchangeId, status } });
      if (status === "approved") {
        playCashRegisterSound();
      } else {
        playWarningAlert();
      }
      toast.success(`Troca ${status === "approved" ? "aprovada para triagem" : "rejeitada"} com sucesso!`);
      router.invalidate();
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao atualizar troca.");
    } finally {
      setProcessingId(null);
    }
  };

  const getActionButtons = (exchange: any) => {
    return (
      <div className="flex flex-wrap gap-2">
        {exchange.status === "requested" && (
          <>
            <Button
              size="sm"
              variant="default"
              className="rounded-xl h-8 text-xs font-semibold cursor-pointer"
              onClick={() => handleUpdateStatus(exchange.id, "approved")}
              disabled={processingId === exchange.id}
            >
              Aprovar Recebimento
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl h-8 text-xs font-semibold text-destructive hover:bg-destructive/10 cursor-pointer"
              onClick={() => handleUpdateStatus(exchange.id, "rejected")}
              disabled={processingId === exchange.id}
            >
              <XCircle className="size-3.5 mr-1" /> Rejeitar
            </Button>
          </>
        )}
        {exchange.status === "approved" && (
          <Button
            size="sm"
            variant="default"
            className="rounded-xl h-8 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
            onClick={() => setResolvingExchange(exchange)}
            disabled={processingId === exchange.id}
          >
            <CheckCircle2 className="size-3.5 mr-1" /> Finalizar Resolução
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Pós-Venda & Logística Reversa"
        title="Trocas & Devoluções (RMA)"
        description="Gerencie solicitações de trocas de produtos, estornos financeiros (Pix/Cartão) e emissão de vale-compras com baixa contábil."
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
            <div className="flex bg-muted/60 p-1 rounded-xl border border-border/60">
              <Button
                variant={viewMode === "kanban" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-lg h-7 text-xs font-semibold cursor-pointer"
                onClick={() => setViewMode("kanban")}
              >
                <KanbanSquare className="h-3.5 w-3.5 mr-1.5" /> Kanban
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-lg h-7 text-xs font-semibold cursor-pointer"
                onClick={() => setViewMode("table")}
              >
                <TableIcon className="h-3.5 w-3.5 mr-1.5" /> Tabela
              </Button>
            </div>
          </div>
        }
      />

      {/* ── ALERTA DE SOLICITAÇÕES PENDENTES ── */}
      {kpis.pendingCount > 0 && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-4 shrink-0 text-amber-600" />
            <span>
              <strong>Atenção operacional:</strong> Você possui <strong>{kpis.pendingCount} solicitação(ões) de troca/devolução</strong> aguardando análise de recebimento ou resolução.
            </span>
          </div>
        </div>
      )}

      {/* ── KPIS OPERACIONAIS & FINANCEIROS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <RotateCcw className="size-3.5 text-blue-600" />
            Total de Solicitações
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {kpis.total}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            {kpis.completedCount} concluídas com êxito
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="size-3.5 text-amber-500" />
            Em Triagem / Pendentes
          </span>
          <div className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400">
            {kpis.pendingCount}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            {kpis.pendingCount > 0 ? "Aguardando conferência física" : "Todas as solicitações atendidas"}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Gift className="size-3.5 text-purple-600" />
            Vale-Compras Gerados
          </span>
          <div className="text-2xl font-mono font-bold text-purple-600 dark:text-purple-400">
            {formatMoney(kpis.storeCreditCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Retenção de crédito na loja
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Banknote className="size-3.5 text-rose-600" />
            Total Estornado
          </span>
          <div className="text-2xl font-mono font-bold text-rose-600 dark:text-rose-400">
            {formatMoney(kpis.refundedCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Reembolsos via Pix / Cartão
          </p>
        </div>
      </div>

      {/* ── BARRA DE CONTROLE & BUSCA ── */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card p-3 rounded-2xl border border-border/70">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por pedido, cliente ou motivo..."
            className="pl-10 h-10 bg-background border-border/70 rounded-xl text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {filteredExchanges.length === 0 ? (
        <EmptyState
          title="Nenhuma solicitação de troca encontrada"
          description="Nenhuma troca ou devolução corresponde à busca atual ou todas as solicitações já foram concluídas."
        />
      ) : viewMode === "table" ? (
        <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-2xs">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 bg-muted/20">
                <TableHead className="text-xs font-bold">Pedido & Origem</TableHead>
                <TableHead className="text-xs font-bold">Cliente</TableHead>
                <TableHead className="text-xs font-bold">Motivo da Devolução</TableHead>
                <TableHead className="text-xs font-bold">Data</TableHead>
                <TableHead className="text-xs font-bold font-mono">Valor Total</TableHead>
                <TableHead className="text-xs font-bold">Status</TableHead>
                <TableHead className="text-xs font-bold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExchanges.map((ex: any) => (
                <TableRow key={ex.id} className="border-border/40 hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold font-mono text-xs text-foreground">#{ex.orderToken}</span>
                      {getExchangeChannelBadge(ex.channel || ex.origin_channel)}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-medium text-foreground">{ex.customerName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={ex.reason}>
                    {ex.reason}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {formatDate(ex.requestedAt)}
                  </TableCell>
                  <TableCell className="text-xs font-bold font-mono text-foreground">
                    {formatMoney(ex.orderTotal || 0)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadge(ex.status)} className="text-[10px]">
                      {translateStatus(ex.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">{getActionButtons(ex)}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 items-start min-h-[500px]">
          {KANBAN_COLUMNS.map((col) => {
            const columnExchanges = filteredExchanges.filter((r: any) => r.status === col.id);
            return (
              <div
                key={col.id}
                className="min-w-[300px] w-[300px] bg-muted/20 border border-border/60 p-3.5 flex flex-col gap-3 rounded-2xl"
              >
                <div className="flex justify-between items-center font-medium px-1">
                  <span className="font-bold text-xs text-foreground uppercase tracking-wider">{col.title}</span>
                  <Badge variant="outline" className="bg-card font-mono text-[10px]">
                    {columnExchanges.length}
                  </Badge>
                </div>
                {columnExchanges.length === 0 ? (
                  <div className="text-xs text-muted-foreground p-6 text-center border border-dashed border-border/60 rounded-xl bg-card/40">
                    Nenhum item nesta etapa
                  </div>
                ) : (
                  <div className="space-y-3">
                    {columnExchanges.map((ex: any) => (
                      <div
                        key={ex.id}
                        className="bg-card border border-border/60 p-4 rounded-xl space-y-3 shadow-2xs"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="font-bold font-mono text-xs text-foreground">#{ex.orderToken}</span>
                              {getExchangeChannelBadge(ex.channel || ex.origin_channel)}
                            </div>
                            <p className="text-xs text-muted-foreground font-medium">{ex.customerName}</p>
                          </div>
                          <Badge variant={getStatusBadge(ex.status)} className="text-[10px]">
                            {translateStatus(ex.status)}
                          </Badge>
                        </div>

                        <div className="text-xs text-foreground p-2.5 bg-muted/30 border border-border/40 rounded-lg">
                          <span className="font-semibold text-muted-foreground">Motivo:</span> {ex.reason}
                        </div>

                        <div className="flex justify-between items-center text-xs text-muted-foreground font-mono">
                          <span>{formatMoney(ex.orderTotal || 0)}</span>
                          <span>{formatDate(ex.requestedAt)}</span>
                        </div>

                        {ex.status !== "completed" && ex.status !== "rejected" && (
                          <div className="pt-2 border-t border-border/40 flex flex-col gap-2">
                            {getActionButtons(ex)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {resolvingExchange && (
        <ResolutionDrawer
          exchange={resolvingExchange}
          isOpen={!!resolvingExchange}
          onClose={() => setResolvingExchange(null)}
          onResolved={() => {
            router.invalidate();
          }}
        />
      )}
    </div>
  );
}
