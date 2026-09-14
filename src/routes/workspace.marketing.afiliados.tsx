import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminListPayoutRequests,
  adminProcessPayoutRequest,
} from "@/services/affiliates.functions";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Coins,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  ArrowUpRight,
  TrendingUp,
  Users,
  Search,
  Check,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/workspace/marketing/afiliados")({
  head: () => ({
    meta: [{ title: "Gestão de Afiliados & Saques PIX | Workspace" }],
  }),
  loader: async () => {
    try {
      const payouts = await adminListPayoutRequests({ data: { status: "all" } }).catch(() => []);
      return { initialPayouts: payouts || [] };
    } catch (err) {
      console.error("[loader:workspace.marketing.afiliados] Erro defensivo:", err);
      return { initialPayouts: [] };
    }
  },
  component: WorkspaceAffiliatesPage,
});

function WorkspaceAffiliatesPage() {
  const { initialPayouts } = ((Route.useLoaderData() || {}) as any);
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayout, setSelectedPayout] = useState<any | null>(null);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ["admin-payout-requests", statusFilter],
    queryFn: () => adminListPayoutRequests({ data: { status: statusFilter as any } }),
    initialData: statusFilter === "all" ? initialPayouts : undefined,
  });

  const processMutation = useMutation({
    mutationFn: (vars: { requestId: string; action: "approve_paid" | "reject"; receiptUrl?: string; notes?: string }) =>
      adminProcessPayoutRequest({
        data: {
          requestId: vars.requestId,
          action: vars.action,
          receiptUrl: vars.receiptUrl,
          notes: vars.notes,
        },
      }),
    onSuccess: (_, vars) => {
      toast.success(vars.action === "approve_paid" ? "Saque aprovado e quitado com sucesso!" : "Saque rejeitado.");
      setIsProcessModalOpen(false);
      setSelectedPayout(null);
      setReceiptUrl("");
      setAdminNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin-payout-requests"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao processar solicitação de saque.");
    },
  });

  const handleOpenProcess = (payout: any) => {
    setSelectedPayout(payout);
    setReceiptUrl("");
    setAdminNotes("");
    setIsProcessModalOpen(true);
  };

  const filteredPayouts = payouts.filter((p: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const handle = p.affiliate?.handle?.toLowerCase() || "";
    const name = p.affiliate?.display_name?.toLowerCase() || "";
    const pix = p.pix_key?.toLowerCase() || "";
    return handle.includes(q) || name.includes(q) || pix.includes(q);
  });

  const pendingCount = payouts.filter((p: any) => p.status === "pending").length;
  const pendingAmountCents = payouts
    .filter((p: any) => p.status === "pending")
    .reduce((acc: number, p: any) => acc + (p.amount_cents || 0), 0);
  const paidAmountCents = payouts
    .filter((p: any) => p.status === "paid")
    .reduce((acc: number, p: any) => acc + (p.amount_cents || 0), 0);

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Marketing & Comunidade"
        title="Gestão de Afiliados & Saques PIX"
        description="Acompanhe solicitações de repasse, aprove saques de comissão de criadores e audite comprovantes bancários."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Saques Pendentes</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {formatMoney(pendingAmountCents)}
          </div>
          <div className="text-xs text-muted-foreground">
            {pendingCount} solicitações aguardando quitação
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Comissões Quitadas</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatMoney(paidAmountCents)}
          </div>
          <div className="text-xs text-muted-foreground">
            Total repassado a afiliados e criadores
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total de Solicitações</span>
            <Coins className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">
            {payouts.length}
          </div>
          <div className="text-xs text-muted-foreground">
            Histórico completo de repasses
          </div>
        </div>
      </div>

      {/* Tabela de Saques e Filtros */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por parceiro ou chave PIX..."
                className="pl-9 h-10 rounded-xl text-xs"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-input bg-background text-xs font-medium"
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Apenas Pendentes</option>
              <option value="paid">Apenas Pagos</option>
              <option value="rejected">Rejeitados</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Carregando solicitações de saque...</div>
        ) : filteredPayouts.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground border border-dashed rounded-xl p-8">
            Nenhuma solicitação de saque encontrada com os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="pb-3 font-semibold">Parceiro / Criador</th>
                  <th className="pb-3 font-semibold">Valor</th>
                  <th className="pb-3 font-semibold">Chave PIX</th>
                  <th className="pb-3 font-semibold">Data</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredPayouts.map((payout: any) => {
                  const statusMap: Record<string, { label: string; badge: string; icon: any }> = {
                    pending: { label: "Pendente", badge: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Clock },
                    processing: { label: "Processando", badge: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Clock },
                    paid: { label: "Pago", badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
                    rejected: { label: "Rejeitado", badge: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
                  };
                  const currentStatus = statusMap[payout.status] || statusMap.pending;
                  const StatusIcon = currentStatus.icon;

                  return (
                    <tr key={payout.id} className="hover:bg-muted/20">
                      <td className="py-3">
                        <div className="font-bold text-foreground">
                          {payout.affiliate?.display_name || "Parceiro"}
                        </div>
                        {payout.affiliate?.handle && (
                          <div className="text-[11px] text-muted-foreground font-mono">
                            @{payout.affiliate.handle}
                          </div>
                        )}
                      </td>
                      <td className="py-3 font-mono font-bold text-foreground">
                        {formatMoney(payout.amount_cents)}
                      </td>
                      <td className="py-3 font-mono">
                        <span className="text-foreground">{payout.pix_key}</span>
                        <span className="text-muted-foreground ml-1.5 uppercase text-[10px]">
                          ({payout.pix_key_type})
                        </span>
                      </td>
                      <td className="py-3 font-mono text-muted-foreground">
                        {formatDate(payout.created_at)}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${currentStatus.badge}`}>
                          <StatusIcon className="h-3 w-3" /> {currentStatus.label}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {payout.status === "pending" ? (
                          <Button
                            size="sm"
                            onClick={() => handleOpenProcess(payout)}
                            className="h-8 px-3 rounded-lg text-xs font-semibold bg-foreground text-background cursor-pointer"
                          >
                            Revisar & Pagar
                          </Button>
                        ) : payout.receipt_url ? (
                          <a
                            href={payout.receipt_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline text-xs inline-flex items-center gap-1 font-semibold"
                          >
                            Comprovante <ArrowUpRight className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Revisão e Quitação de Saque */}
      <Dialog open={isProcessModalOpen} onOpenChange={setIsProcessModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Processar Repasse de Comissão</DialogTitle>
          </DialogHeader>

          {selectedPayout && (
            <div className="space-y-4 py-2 text-sm">
              <div className="bg-muted/30 border rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parceiro:</span>
                  <span className="font-bold">{selectedPayout.affiliate?.display_name} (@{selectedPayout.affiliate?.handle})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Solicitado:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base">
                    {formatMoney(selectedPayout.amount_cents)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chave PIX:</span>
                  <span className="font-mono font-semibold">{selectedPayout.pix_key} ({selectedPayout.pix_key_type?.toUpperCase()})</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">URL do Comprovante Bancário (opcional)</Label>
                <Input
                  type="url"
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  placeholder="https://storage.exemplo.com/comprovante.pdf"
                  className="h-10 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Observações / Motivo</Label>
                <Input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Ex: Transferido via PIX chave celular"
                  className="h-10 rounded-xl text-xs"
                />
              </div>

              <DialogFooter className="pt-3 gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={processMutation.isPending}
                  onClick={() =>
                    processMutation.mutate({
                      requestId: selectedPayout.id,
                      action: "reject",
                      notes: adminNotes || "Repasse rejeitado pela administração.",
                    })
                  }
                  className="h-10 rounded-xl font-semibold text-xs cursor-pointer"
                >
                  Rejeitar Saque
                </Button>
                <Button
                  type="button"
                  disabled={processMutation.isPending}
                  onClick={() =>
                    processMutation.mutate({
                      requestId: selectedPayout.id,
                      action: "approve_paid",
                      receiptUrl: receiptUrl.trim() || undefined,
                      notes: adminNotes.trim() || undefined,
                    })
                  }
                  className="h-10 rounded-xl font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  <Check className="h-4 w-4 mr-1" />
                  {processMutation.isPending ? "Processando..." : "Confirmar Quitação"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
