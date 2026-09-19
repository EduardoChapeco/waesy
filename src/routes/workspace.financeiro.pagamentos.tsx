import { createFileRoute, Link } from "@tanstack/react-router";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import { listPayments } from "@/services/order.functions";
import { approvePayment, rejectPayment } from "@/services/payment.functions";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";
import { formatDate } from "@/lib/datetime";
import {
  CheckCircle2,
  Clock,
  DollarSign,
  Search,
  XCircle,
  CreditCard,
  QrCode,
  Banknote,
  Building2,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  Percent,
} from "lucide-react";
import { SheetPage } from "@/components/ui/sheet-page";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { playCashRegisterSound, playWarningAlert } from "@/lib/audio-chimes";

export const Route = createFileRoute("/workspace/financeiro/pagamentos")({
  head: () => ({ meta: [{ title: "Pagamentos & Liquidação | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const res = await listPayments();
      return Array.isArray(res) ? res : [];
    } catch (err) {
      console.error("[loader:workspace.financeiro.pagamentos] Unhandled loader error:", err);
      return [];
    }
  },
  component: AdminPaymentsPage,
});

function AdminPaymentsPage() {
  const initialPayments = Route.useLoaderData() as any[];
  const [payments, setPayments] = useState<any[]>(initialPayments || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "processing" | "awaiting">("all");
  const router = useRouter();

  // Modal Aprovação
  const [approveModal, setApproveModal] = useState<{ isOpen: boolean; order: any | null }>({
    isOpen: false,
    order: null,
  });
  const [selectedMethod, setSelectedMethod] = useState("pix");
  const [isApproving, setIsApproving] = useState(false);

  // Modal Rejeição
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; order: any | null }>({
    isOpen: false,
    order: null,
  });
  const [rejectReason, setRejectReason] = useState("Comprovante ilegível ou divergência de valor");
  const [isRejecting, setIsRejecting] = useState(false);

  // ── KPIS FINANCEIROS ─────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    let totalPaidCents = 0;
    let totalPendingCents = 0;
    let paidCount = 0;
    let processingCount = 0;

    payments.forEach((p) => {
      if (p.status === "paid") {
        totalPaidCents += p.total_cents || 0;
        paidCount += 1;
      } else if (p.status === "payment_processing") {
        totalPendingCents += p.total_cents || 0;
        processingCount += 1;
      } else if (p.status === "awaiting_payment") {
        totalPendingCents += p.total_cents || 0;
      }
    });

    const totalVolumeCents = totalPaidCents + totalPendingCents;
    const conversionPercent = totalVolumeCents > 0 ? (totalPaidCents / totalVolumeCents) * 100 : 0;
    const avgTicketCents = paidCount > 0 ? Math.round(totalPaidCents / paidCount) : 0;

    return {
      totalPaidCents,
      totalPendingCents,
      paidCount,
      processingCount,
      avgTicketCents,
      totalTransactions: payments.length,
      conversionPercent,
    };
  }, [payments]);

  // ── FILTROS & BUSCA ──────────────────────────────────────────────────────
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // Filtro Status
      if (statusFilter === "paid" && p.status !== "paid") return false;
      if (statusFilter === "processing" && p.status !== "payment_processing") return false;
      if (statusFilter === "awaiting" && (p.status === "paid" || p.status === "payment_processing")) return false;

      // Busca texto
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const token = (p.public_token || "").toLowerCase();
        const customerName = (p.customer_snapshot?.name || "").toLowerCase();
        const id = (p.id || "").toLowerCase();
        return token.includes(term) || customerName.includes(term) || id.includes(term);
      }

      return true;
    });
  }, [payments, statusFilter, searchTerm]);

  // ── EXPORTAÇÃO CSV ───────────────────────────────────────────────────────
  const handleExportCsv = () => {
    if (filteredPayments.length === 0) {
      toast.info("Nenhuma transação financeira para exportar.");
      return;
    }

    const headers = ["Pedido", "Data", "Cliente", "Valor Total (R$)", "Status"];
    const rows = filteredPayments.map((p) => [
      p.public_token ? `#${p.public_token}` : p.id.slice(0, 8),
      formatDate(p.created_at),
      `"${p.customer_snapshot?.name || "Cliente"}"`,
      ((p.total_cents || 0) / 100).toFixed(2),
      p.status === "paid"
        ? "Liquidado"
        : p.status === "payment_processing"
        ? "Comprovante Enviado"
        : "Aguardando Pagamento",
    ].join(";"));

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `conciliacao_pagamentos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    playCashRegisterSound();
    toast.success("Extrato de conciliação exportado em CSV com sucesso!");
  };

  // ── AÇÕES DE LIQUIDAÇÃO ──────────────────────────────────────────────────
  const handleConfirmApprove = async () => {
    if (!approveModal.order) return;
    setIsApproving(true);
    try {
      const res = await approvePayment({
        data: {
          orderId: approveModal.order.id,
          receivedMethod: selectedMethod,
        },
      });

      if (res) {
        playCashRegisterSound();
        toast.success(`Pagamento do pedido #${approveModal.order.public_token} aprovado com sucesso!`);
        setPayments((prev) =>
          prev.map((item) =>
            item.id === approveModal.order.id ? { ...item, status: "paid" } : item,
          ),
        );
        setApproveModal({ isOpen: false, order: null });
        router.invalidate();
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao aprovar pagamento.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModal.order) return;
    setIsRejecting(true);
    try {
      await rejectPayment({
        data: {
          orderId: rejectModal.order.id,
          reason: rejectReason,
        },
      });

      playWarningAlert();
      toast.info(`Pagamento do pedido #${rejectModal.order.public_token} rejeitado.`);
      setPayments((prev) => prev.filter((item) => item.id !== rejectModal.order.id));
      setRejectModal({ isOpen: false, order: null });
      router.invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao rejeitar pagamento.");
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Financeiro"
        title="Pagamentos & Liquidação"
        description="Acompanhe entradas financeiras, aprove comprovantes pendentes e monitore o faturamento em tempo real."
        actions={
          <Button
            onClick={handleExportCsv}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-bold h-9 gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="size-3.5 text-emerald-600" />
            <span>Exportar Conciliação CSV</span>
          </Button>
        }
      />

      {/* ── KPIS FINANCEIROS NO PARADIGMA CLEAN ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            Total Liquidado
          </span>
          <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {formatMoney(kpis.totalPaidCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            {kpis.paidCount} pagamentos confirmados
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="size-3.5 text-amber-500" />
            Aguardando Pagamento
          </span>
          <div className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400">
            {formatMoney(kpis.totalPendingCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            {kpis.processingCount > 0 ? `${kpis.processingCount} comprovante(s) em análise` : "Aguardando compensação"}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-primary" />
            Ticket Médio
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {formatMoney(kpis.avgTicketCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Média por pedido aprovado
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Percent className="size-3.5 text-foreground" />
            Taxa de Liquidação
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {kpis.conversionPercent.toFixed(1)}%
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            {kpis.paidCount} de {kpis.totalTransactions} transações pagas
          </p>
        </div>
      </div>

      {/* ── BARRA DE CONTROLE, FILTROS & BUSCA ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/70">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, pedido ou código..."
            className="pl-10 h-10 rounded-xl text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 self-start sm:self-auto overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === "all"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Todos ({payments.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("processing")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === "processing"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Comprovantes ({kpis.processingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("awaiting")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === "awaiting"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Aguardando ({payments.filter((p) => p.status === "awaiting_payment").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("paid")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === "paid"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Liquidados ({kpis.paidCount})
          </button>
        </div>
      </div>

      {/* ── TABELA DE TRANSAÇÕES FINANCEIRAS ── */}
      {filteredPayments.length === 0 ? (
        <EmptyState
          title="Nenhum pagamento localizado"
          description="Nenhuma transação financeira atende aos critérios de busca selecionados."
        />
      ) : (
        <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-2xs">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="text-xs font-bold font-mono">Pedido</TableHead>
                <TableHead className="text-xs font-bold">Data & Hora</TableHead>
                <TableHead className="text-xs font-bold">Cliente</TableHead>
                <TableHead className="text-xs font-bold font-mono">Valor Total</TableHead>
                <TableHead className="text-xs font-bold">Status do Pagamento</TableHead>
                <TableHead className="text-xs font-bold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((p: any) => {
                const date = formatDate(p.created_at);
                const customerName = p.customer_snapshot?.name || "Cliente";
                const isPending = p.status === "awaiting_payment" || p.status === "payment_processing";

                return (
                  <TableRow key={p.id} className="border-border/40 hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs font-bold">
                      <Link
                        to="/workspace/pedidos/$id"
                        params={{ id: p.id }}
                        className="hover:underline text-primary inline-flex items-center gap-1"
                      >
                        #{p.public_token || p.id.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{date}</TableCell>
                    <TableCell className="text-xs font-medium text-foreground">
                      <div className="truncate max-w-[180px]" title={customerName}>
                        {customerName}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold text-foreground">
                      {formatMoney(p.total_cents)}
                    </TableCell>
                    <TableCell>
                      {p.status === "awaiting_payment" ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10 text-[10px] font-bold">
                          Aguardando Pagamento
                        </Badge>
                      ) : p.status === "payment_processing" ? (
                        <Badge variant="outline" className="text-blue-600 border-blue-500/30 bg-blue-500/10 text-[10px] font-bold">
                          Comprovante Enviado
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold">
                          Liquidado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isPending ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRejectModal({ isOpen: true, order: p })}
                            className="h-8 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                          >
                            <XCircle className="size-3.5 mr-1" />
                            Recusar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setApproveModal({ isOpen: true, order: p })}
                            className="h-8 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                          >
                            <CheckCircle2 className="size-3.5 mr-1" />
                            Aprovar
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" asChild className="h-8 rounded-xl text-xs font-bold">
                          <Link to="/workspace/pedidos/$id" params={{ id: p.id }}>
                            Ver Pedido
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── MODAL DE APROVAÇÃO COM SELEÇÃO DE MEIO DE PAGAMENTO ── */}
      <SheetPage
        open={approveModal.isOpen}
        onOpenChange={(open) => !isApproving && setApproveModal({ isOpen: open, order: null })}
        title={`Aprovar Pagamento • Pedido #${approveModal.order?.public_token || ""}`}
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setApproveModal({ isOpen: false, order: null })}
              disabled={isApproving}
              className="h-10 px-4 rounded-xl text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmApprove}
              disabled={isApproving}
              className="h-10 px-5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {isApproving ? "Processando..." : "Confirmar Recebimento"}
            </Button>
          </>
        }
      >
        <div className="space-y-5 py-4">
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Valor a Liquidar:</span>
              <span className="font-mono font-bold text-sm text-foreground">
                {formatMoney(approveModal.order?.total_cents || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Cliente:</span>
              <span className="font-medium text-foreground">
                {approveModal.order?.customer_snapshot?.name || "Cliente"}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">Meio de Recebimento Confirmado</label>
            <Select value={selectedMethod} onValueChange={setSelectedMethod}>
              <SelectTrigger className="rounded-xl h-11 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                <SelectItem value="pix">
                  <div className="flex items-center gap-2">
                    <QrCode className="size-4 text-emerald-600" />
                    <span>Pix Instantâneo</span>
                  </div>
                </SelectItem>
                <SelectItem value="credit_card">
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-4 text-primary" />
                    <span>Cartão de Crédito</span>
                  </div>
                </SelectItem>
                <SelectItem value="debit_card">
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-4 text-blue-600" />
                    <span>Cartão de Débito</span>
                  </div>
                </SelectItem>
                <SelectItem value="cash">
                  <div className="flex items-center gap-2">
                    <Banknote className="size-4 text-amber-600" />
                    <span>Dinheiro em Espécie</span>
                  </div>
                </SelectItem>
                <SelectItem value="bank_transfer">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-muted-foreground" />
                    <span>Transferência Bancária / TED</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              A liquidação atualizará o status do pedido para &quot;Pago&quot; e acionará a separação de estoque.
            </p>
          </div>
        </div>
      </SheetPage>

      {/* ── MODAL DE RECUSA / REJEIÇÃO DE PAGAMENTO ── */}
      <SheetPage
        open={rejectModal.isOpen}
        onOpenChange={(open) => !isRejecting && setRejectModal({ isOpen: open, order: null })}
        title={`Recusar Pagamento • Pedido #${rejectModal.order?.public_token || ""}`}
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setRejectModal({ isOpen: false, order: null })}
              disabled={isRejecting}
              className="h-10 px-4 rounded-xl text-xs font-bold"
            >
              Voltar
            </Button>
            <Button
              onClick={handleConfirmReject}
              disabled={isRejecting}
              className="h-10 px-5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
            >
              {isRejecting ? "Recusando..." : "Confirmar Recusa"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-4">
          <p className="text-xs text-muted-foreground">
            O pedido continuará pendente e o cliente será notificado sobre a inconsistência no pagamento.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">Motivo da Recusa</label>
            <Select value={rejectReason} onValueChange={setRejectReason}>
              <SelectTrigger className="rounded-xl h-11 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                <SelectItem value="Comprovante ilegível ou cortado">Comprovante ilegível ou cortado</SelectItem>
                <SelectItem value="Valor divergente do total do pedido">Valor divergente do total do pedido</SelectItem>
                <SelectItem value="Pagamento não compensado na conta bancária">Pagamento não compensado na conta bancária</SelectItem>
                <SelectItem value="Comprovante agendado (não liquidado)">Comprovante agendado (não liquidado)</SelectItem>
                <SelectItem value="Outro motivo operacional">Outro motivo operacional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SheetPage>
    </div>
  );
}
