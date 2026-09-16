import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Check,
  X,
  FileText,
  ExternalLink,
  AlertTriangle,
  Search,
  Eye,
  Clock,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Image as ImageIcon,
} from "lucide-react";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listPendingManualPayments,
  approvePayment,
  rejectPayment,
} from "@/services/payment.functions";
import { formatMoney } from "@/lib/money";
import { EmptyState } from "@/components/state/states";
import { formatDate } from "@/lib/datetime";
import { playCashRegisterSound, playWarningAlert } from "@/lib/audio-chimes";

export const Route = createFileRoute("/workspace/financeiro/comprovantes")({
  head: () => ({ meta: [{ title: "Auditoria de Comprovantes | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const res = await listPendingManualPayments();
      return Array.isArray(res) ? res : [];
    } catch (err) {
      console.error("[loader:workspace.financeiro.comprovantes] Unhandled loader error:", err);
      return [];
    }
  },
  component: ReceiptsPage,
});

function ReceiptsPage() {
  const initialReceipts = Route.useLoaderData() as any[];
  const [receipts, setReceipts] = useState<any[]>(initialReceipts || []);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  // Preview Dialog State
  const [previewTarget, setPreviewTarget] = useState<any | null>(null);

  // Reject dialog state
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("Comprovante ilegível ou divergência de valor");
  const [isRejecting, setIsRejecting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // ── KPIS FINANCEIROS ─────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const pendingCount = receipts.length;
    const totalPendingCents = receipts.reduce((sum, r) => sum + (r.amount_cents || 0), 0);
    const newestDate = receipts[0]?.created_at ? formatDate(receipts[0].created_at) : "Nenhum";

    return {
      pendingCount,
      totalPendingCents,
      newestDate,
    };
  }, [receipts]);

  // ── BUSCA EM TEMPO REAL ──────────────────────────────────────────────────
  const filteredReceipts = useMemo(() => {
    if (!searchTerm.trim()) return receipts;
    const term = searchTerm.toLowerCase();

    return receipts.filter((r) => {
      const order = r.orders || {};
      const token = (order.public_token || "").toLowerCase();
      const customer = (order.customer_snapshot?.name || "").toLowerCase();
      const id = (order.id || r.order_id || "").toLowerCase();

      return token.includes(term) || customer.includes(term) || id.includes(term);
    });
  }, [receipts, searchTerm]);

  // ── APROVAÇÃO DE PAGAMENTO ───────────────────────────────────────────────
  const handleApprove = async (orderId: string, itemPublicToken?: string) => {
    setApprovingId(orderId);
    try {
      const res = await approvePayment({ data: { orderId, receivedMethod: "pix" } });
      if (res) {
        playCashRegisterSound();
        toast.success(`Comprovante do pedido #${itemPublicToken || orderId.slice(0, 8)} aprovado com sucesso!`);
        setReceipts((prev) => prev.filter((r) => (r.orders?.id || r.order_id) !== orderId));
        if (previewTarget && (previewTarget.orders?.id || previewTarget.order_id) === orderId) {
          setPreviewTarget(null);
        }
        router.invalidate();
      } else {
        toast.error((res as any).message || "Erro ao aprovar pagamento.");
      }
    } catch {
      toast.error("Erro inesperado ao aprovar pagamento.");
    } finally {
      setApprovingId(null);
    }
  };

  // ── REJEIÇÃO DE PAGAMENTO ────────────────────────────────────────────────
  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    setIsRejecting(true);
    try {
      const orderId = rejectTarget.orders?.id || rejectTarget.order_id;
      const res = await rejectPayment({ data: { orderId, reason: rejectReason } });
      if (res) {
        playWarningAlert();
        toast.info("Comprovante rejeitado. O cliente foi notificado para reenviar.");
        setReceipts((prev) => prev.filter((r) => (r.orders?.id || r.order_id) !== orderId));
        if (previewTarget && (previewTarget.orders?.id || previewTarget.order_id) === orderId) {
          setPreviewTarget(null);
        }
        router.invalidate();
        setRejectTarget(null);
        setRejectReason("Comprovante ilegível ou divergência de valor");
      } else {
        toast.error((res as any).message || "Erro ao rejeitar comprovante.");
      }
    } catch {
      toast.error("Erro inesperado ao rejeitar comprovante.");
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Financeiro"
        title="Auditoria de Comprovantes"
        description="Analise transferências Pix e depósitos manuais enviados pelos clientes antes de liberar a separação."
      />

      {/* ── KPIS DE AUDITORIA ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="size-3.5 text-amber-500" />
            Comprovantes Pendentes
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {kpis.pendingCount}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Aguardando validação da equipe
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="size-3.5 text-emerald-600" />
            Valor em Análise
          </span>
          <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {formatMoney(kpis.totalPendingCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Soma de recebimentos a liberar
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-primary" />
            Último Envio
          </span>
          <div className="text-sm font-bold text-foreground truncate mt-1">
            {kpis.newestDate}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Fila de conciliação ativa
          </p>
        </div>
      </div>

      {/* ── BARRA DE BUSCA EM TEMPO REAL ── */}
      <div className="flex items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/70">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, pedido ou código..."
            className="pl-10 h-10 rounded-xl text-xs bg-background"
          />
        </div>
        <Badge variant="outline" className="text-xs font-mono">
          {filteredReceipts.length} comprovante(s)
        </Badge>
      </div>

      {/* ── TABELA DE AUDITORIA DE COMPROVANTES ── */}
      {filteredReceipts.length === 0 ? (
        <EmptyState
          title="Nenhum comprovante pendente"
          description="Todos os pagamentos manuais e transferências Pix já foram analisados e liberados."
        />
      ) : (
        <div className="bg-card rounded-2xl border border-border/70 overflow-hidden shadow-2xs">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="text-xs font-bold font-mono">Pedido</TableHead>
                <TableHead className="text-xs font-bold">Cliente</TableHead>
                <TableHead className="text-xs font-bold">Data do Envio</TableHead>
                <TableHead className="text-xs font-bold font-mono">Valor Total</TableHead>
                <TableHead className="text-xs font-bold">Comprovante</TableHead>
                <TableHead className="text-xs font-bold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceipts.map((r: any) => {
                const order = r.orders || {};
                const orderId = order.id || r.order_id;
                const customerName = order.customer_snapshot?.name || "Cliente";

                return (
                  <TableRow key={r.id} className="border-border/40 hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">
                      <Link
                        to="/workspace/pedidos/$id"
                        params={{ id: orderId }}
                        className="flex items-center gap-1.5 hover:underline text-primary font-mono text-xs font-bold"
                      >
                        <FileText className="size-3.5" />#
                        {order.public_token || orderId.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-foreground">
                      <div className="truncate max-w-[180px]" title={customerName}>
                        {customerName}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {formatDate(r.created_at)}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold text-foreground">
                      {formatMoney(r.amount_cents)}
                    </TableCell>
                    <TableCell>
                      {r.receipt_url ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewTarget(r)}
                          className="h-8 px-2.5 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 gap-1.5 cursor-pointer"
                        >
                          <Eye className="size-3.5" />
                          <span>Inspecionar</span>
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Aguardando upload</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-xl text-xs font-bold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-700 cursor-pointer"
                          disabled={approvingId === orderId}
                          onClick={() => handleApprove(orderId, order.public_token)}
                        >
                          <Check className="size-3.5 mr-1" />
                          {approvingId === orderId ? "Aprovando..." : "Aprovar"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-xl text-xs font-bold text-rose-600 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-700 cursor-pointer"
                          onClick={() => setRejectTarget(r)}
                        >
                          <X className="size-3.5 mr-1" />
                          Recusar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── DIALOG DE PREVIEW DO COMPROVANTE COM AÇÕES INLINE ── */}
      <Dialog open={!!previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)}>
        <DialogContent className="max-w-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-base font-bold">
              <span>Auditoria Visual de Comprovante</span>
              <span className="font-mono text-sm text-primary">
                #{previewTarget?.orders?.public_token || previewTarget?.order_id?.slice(0, 8)}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Verifique os dados de emissão, autenticação bancária e valor antes de aprovar.
            </DialogDescription>
          </DialogHeader>

          {previewTarget && (
            <div className="space-y-4 py-2">
              {/* Box de Informações Rápidas */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Cliente</span>
                  <span className="font-bold text-foreground">
                    {previewTarget.orders?.customer_snapshot?.name || "Cliente"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Valor Total</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatMoney(previewTarget.amount_cents)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Enviado em</span>
                  <span className="font-mono text-muted-foreground">
                    {formatDate(previewTarget.created_at)}
                  </span>
                </div>
              </div>

              {/* Imagem do Comprovante */}
              <div className="relative rounded-xl border border-border/70 bg-black/5 dark:bg-black/40 overflow-hidden max-h-[380px] flex items-center justify-center p-2">
                {previewTarget.receipt_url?.toLowerCase().endsWith(".pdf") ? (
                  <iframe
                    src={previewTarget.receipt_url}
                    className="w-full h-[360px] rounded-lg"
                    title="Comprovante PDF"
                  />
                ) : (
                  <img
                    src={previewTarget.receipt_url}
                    alt="Comprovante de Pagamento"
                    className="max-h-[360px] max-w-full object-contain rounded-lg shadow-xs"
                  />
                )}
              </div>

              <div className="flex justify-end">
                <a
                  href={previewTarget.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  Abrir imagem em tamanho real <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full gap-2 border-t border-border/60 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const target = previewTarget;
                setPreviewTarget(null);
                setRejectTarget(target);
              }}
              className="rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
            >
              <X className="size-3.5 mr-1" />
              Recusar Comprovante
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewTarget(null)}
                className="rounded-xl text-xs font-bold"
              >
                Fechar
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const orderId = previewTarget?.orders?.id || previewTarget?.order_id;
                  handleApprove(orderId, previewTarget?.orders?.public_token);
                }}
                disabled={approvingId === (previewTarget?.orders?.id || previewTarget?.order_id)}
                className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <CheckCircle2 className="size-3.5" />
                <span>Confirmar & Aprovar</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── SHEET DE REJEIÇÃO ── */}
      <Sheet open={!!rejectTarget} onOpenChange={(v) => !v && setRejectTarget(null)}>
        <SheetContent className="rounded-l-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="size-5" />
              Recusar Comprovante
            </SheetTitle>
            <SheetDescription className="text-xs">
              Informe o motivo da recusa. O pedido voltará para &quot;Aguardando Pagamento&quot; e o cliente será informado para reenviar.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason" className="text-xs font-bold">Motivo da Recusa</Label>
              <Input
                id="reject-reason"
                placeholder="Ex: Imagem ilegível, valor divergente, agendado..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="rounded-xl text-xs h-10"
              />
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground space-y-1">
              <span className="font-bold text-foreground block">Dica operacional:</span>
              <p>Motivos claros evitam atrito com o cliente e aceleram a regularização do pagamento.</p>
            </div>
          </div>

          <SheetFooter className="gap-2 mt-8">
            <Button variant="outline" onClick={() => setRejectTarget(null)} className="rounded-xl text-xs font-bold">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={isRejecting || !rejectReason.trim()}
              onClick={handleRejectConfirm}
              className="rounded-xl text-xs font-bold"
            >
              {isRejecting ? "Recusando..." : "Confirmar Recusa"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
