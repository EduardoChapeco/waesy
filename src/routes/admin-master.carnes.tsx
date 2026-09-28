/**
 * admin-master.carnes.tsx — Governança Bilateral de Carnês & Inadimplência (Waesy Platform)
 * Painel 360° do Super-Admin para auditar recebíveis, gerenciar disputas e forçar conciliação.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Receipt, AlertTriangle, CheckCircle2, Clock, Building2, User, ShieldCheck, ShieldAlert, Search, ExternalLink, Eye, Sliders, DollarSign, TrendingDown, RotateCcw, XCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { listMasterCarnes, getMasterCarnesOverview, forceMasterConciliation } from "@/services/receivables.functions";

export const Route = createFileRoute("/admin-master/carnes")({
  head: () => ({ meta: [{ title: "Carnês e Inadimplência Global | Admin Master Waesy" }] }),
  loader: async () => {
    try {
      const [carnes, overview] = await Promise.all([
        listMasterCarnes({ data: { status: "all" } }).catch(() => []),
        getMasterCarnesOverview().catch(() => null),
      ]);
      return { carnes, overview };
    } catch {
      return { carnes: [], overview: null };
    }
  },
  component: AdminMasterCarnesPage,
});

function AdminMasterCarnesPage() {
  const { carnes: initialCarnes, overview: initialOverview } = ((Route.useLoaderData?.() as any) || {});
  const queryClient = useQueryClient();

  const [activeFilter, setActiveFilter] = useState<
    "all" | "active" | "overdue" | "pending_conciliation" | "settled"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: carnes = [] } = useQuery({
    queryKey: ["master-carnes", activeFilter, searchTerm],
    queryFn: () =>
      listMasterCarnes({ data: { status: activeFilter, search: searchTerm || undefined } }),
    initialData: activeFilter === "all" && !searchTerm ? initialCarnes : undefined,
  });

  const { data: overview } = useQuery({
    queryKey: ["master-carnes-overview"],
    queryFn: () => getMasterCarnesOverview(),
    initialData: initialOverview,
  });

  // Estado de Intervenção Master
  const [selectedInstallment, setSelectedInstallment] = useState<any>(null);
  const [selectedCarne, setSelectedCarne] = useState<any>(null);
  const [isInterventionOpen, setIsInterventionOpen] = useState(false);
  const [interventionAction, setInterventionAction] = useState<"force_approve" | "force_reject" | "reopen">("force_approve");
  const [interventionReason, setInterventionReason] = useState("");
  const [customFinalAmountCents, setCustomFinalAmountCents] = useState<number | undefined>(undefined);

  const { mutate: executeIntervention, isPending: isIntervening } = useMutation({
    mutationFn: forceMasterConciliation,
    onSuccess: (res: any) => {
      toast.success(
        res.action === "force_approve"
          ? "Parcela liquidada por intervenção master e espelhada no cliente."
          : res.action === "force_reject"
          ? "Comprovante recusado por ordem master."
          : "Parcela reaberta com sucesso.",
      );
      queryClient.invalidateQueries({ queryKey: ["master-carnes"] });
      queryClient.invalidateQueries({ queryKey: ["master-carnes-overview"] });
      setIsInterventionOpen(false);
      setInterventionReason("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro na intervenção master.");
    },
  });

  const handleOpenIntervention = (carne: any, inst: any) => {
    setSelectedCarne(carne);
    setSelectedInstallment(inst);
    setInterventionAction(inst.status === "paid" ? "reopen" : "force_approve");
    setInterventionReason("");
    setCustomFinalAmountCents(
      inst.final_amount_cents || inst.original_amount_cents || inst.amount_cents,
    );
    setIsInterventionOpen(true);
  };

  const handleConfirmIntervention = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstallment) return;
    if (!interventionReason.trim()) {
      toast.error("Informe a justificativa oficial da intervenção master.");
      return;
    }

    executeIntervention({
      data: {
        installmentId: selectedInstallment.id,
        action: interventionAction,
        reason: interventionReason,
        finalAmountCents:
          interventionAction === "force_approve" ? customFinalAmountCents : undefined,
      },
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-28 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            Governança de Carnês
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl mt-1">
            Supervisão da carteira de crédito direto da rede. Audite conciliações, acompanhe a inadimplência entre lojas e clientes e intervenha em disputas comerciais.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-xs">
            <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Autoridade Super-Admin
          </Badge>
        </div>
      </div>

      {/* KPIs da Rede */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Volume Emitido na Rede
          </span>
          <div className="text-xl font-bold text-foreground">
            {formatMoney(overview?.totalIssuedCents || 0)}
          </div>
          <div className="text-xs text-muted-foreground">
            {overview?.totalCarnesCount || 0} carnês cadastrados
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Saldo em Aberto Global
          </span>
          <div className="text-xl font-bold text-foreground">
            {formatMoney(overview?.totalOutstandingCents || 0)}
          </div>
          <div className="text-xs text-muted-foreground">Em carteira pendente</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Inadimplência Média
          </span>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
            {overview?.globalDefaultRatePercent || 0}%
          </div>
          <div className="text-xs text-muted-foreground">
            {formatMoney(overview?.totalOverdueCents || 0)} em atraso
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Conciliações Pendentes
          </span>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
            {overview?.pendingConciliationCount || 0}
          </div>
          <div className="text-xs text-muted-foreground">Aguardando decisão da loja</div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/50 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap",
              activeFilter === "all"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Todos ({carnes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("active")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap",
              activeFilter === "active"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Ativos
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("overdue")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap",
              activeFilter === "overdue"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Em Atraso
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("pending_conciliation")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5",
              activeFilter === "pending_conciliation"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            ⏳ Comprovantes em Análise
            {(overview?.pendingConciliationCount || 0) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 font-bold text-[10px]">
                {overview?.pendingConciliationCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("settled")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap",
              activeFilter === "settled"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Quitados
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por loja, cliente, título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-xs rounded-xl bg-card"
          />
        </div>
      </div>

      {/* Tabela Bilateral de Carnês da Rede */}
      {carnes.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-card rounded-2xl p-8 border border-dashed border-border/60 shadow-xs">
          <Receipt size={40} className="text-muted-foreground/40 mx-auto" />
          <h3 className="text-base font-semibold text-foreground">Nenhum carnê encontrado</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Não há registros correspondentes aos filtros de governança selecionados.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {carnes.map((carne: any) => {
            const storeName = carne.store?.name || carne.creditor?.full_name || "Acordo Comercial Direto";
            const debtor = carne.debtor;
            const installments = carne.installments || [];

            return (
              <div
                key={carne.id}
                className="bg-card rounded-2xl border border-border/60 shadow-xs overflow-hidden space-y-3 p-5"
              >
                {/* Relação Bilateral: Loja ↔ Cliente */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base text-foreground">{carne.title}</span>
                      <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">
                        {carne.status === "settled" ? "Quitado" : "Ativo"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <Building2 className="h-3.5 w-3.5 text-primary" /> Loja: {storeName}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <User className="h-3.5 w-3.5 text-primary" /> Cliente:{" "}
                        {debtor?.full_name || "Cliente Direto"}
                      </span>
                      {debtor?.email && <span>({debtor.email})</span>}
                      {carne.contract && (
                        <span className="text-primary font-medium flex items-center gap-1">
                          • Contrato: {carne.contract.title}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-base font-bold text-foreground">
                      {formatMoney(carne.total_cents)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {carne.installments_count} parcelas • Juros: {carne.interest_rate_monthly || 0}% a.m.
                    </div>
                  </div>
                </div>

                {/* Linha das Parcelas com Ação de Intervenção Master */}
                <div className="divide-y divide-border/40 -mx-5 px-5">
                  {installments.map((inst: any) => {
                    const isPaid = inst.status === "paid";
                    const isPending = inst.conciliation_status === "pending";
                    const isRejected = inst.conciliation_status === "rejected";
                    const dueDate = new Date(inst.due_date);
                    const isLate = !isPaid && dueDate < new Date();

                    const finalAmount = Number(
                      inst.final_amount_cents || inst.original_amount_cents || inst.amount_cents || 0,
                    );

                    return (
                      <div
                        key={inst.id}
                        className={cn(
                          "py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs transition-colors",
                          isPending && "bg-amber-500/5 -mx-5 px-5",
                        )}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              Parcela {inst.installment_number}/{carne.installments_count}
                            </span>

                            {isPaid && (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] py-0">
                                Quitada
                              </Badge>
                            )}

                            {!isPaid && isPending && (
                              <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] py-0 animate-pulse">
                                ⏳ Comprovante Enviado
                              </Badge>
                            )}

                            {!isPaid && isRejected && (
                              <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] py-0">
                                Recusada pela Loja
                              </Badge>
                            )}

                            {!isPaid && !isPending && isLate && (
                              <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] py-0">
                                Em Atraso ({inst.late_days || 1}d)
                              </Badge>
                            )}

                            {!isPaid && !isPending && !isLate && (
                              <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px] py-0">
                                A Vencer
                              </Badge>
                            )}
                          </div>

                          <div className="text-muted-foreground flex flex-wrap items-center gap-2">
                            <span>Vencimento: {formatDate(inst.due_date)}</span>
                            {isPaid && inst.paid_at && (
                              <span>• Liquidado em: {formatDate(inst.paid_at)}</span>
                            )}
                            {inst.conciliation_proof_url && (
                              <span className="text-primary font-medium flex items-center gap-0.5">
                                • Tem Comprovante Anexo
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                          <div className="text-left sm:text-right">
                            <span className="font-semibold text-foreground block">
                              {formatMoney(finalAmount)}
                            </span>
                            {Number(inst.fine_cents || 0) + Number(inst.interest_accrued_cents || 0) > 0 && (
                              <span className="text-[10px] text-rose-500 block">
                                Encargos: +{formatMoney(Number(inst.fine_cents || 0) + Number(inst.interest_accrued_cents || 0))}
                              </span>
                            )}
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 text-xs rounded-xl text-primary hover:bg-primary/10 border-primary/30"
                            onClick={() => handleOpenIntervention(carne, inst)}
                          >
                            <ShieldAlert className="h-3.5 w-3.5 mr-1" /> Intervir Master
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Intervenção Master */}
      <Dialog open={isInterventionOpen} onOpenChange={setIsInterventionOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Intervenção Master: Parcela {selectedInstallment?.installment_number}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedCarne?.title} • Loja: {selectedCarne?.store?.name} • Cliente: {selectedCarne?.debtor?.full_name}
            </DialogDescription>
          </DialogHeader>

          {/* Preview de Comprovante se existir */}
          {selectedInstallment?.conciliation_proof_url && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Comprovante do Cliente</Label>
              <div className="relative rounded-xl border overflow-hidden bg-muted/30 max-h-48 flex items-center justify-center">
                <img
                  src={selectedInstallment.conciliation_proof_url}
                  alt="Comprovante"
                  className="max-h-48 w-auto object-contain"
                />
                <a
                  href={selectedInstallment.conciliation_proof_url}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 hover:bg-background text-foreground shadow-xs text-xs flex items-center gap-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Ampliar
                </a>
              </div>
            </div>
          )}

          <form onSubmit={handleConfirmIntervention} className="space-y-3.5 pt-1">
            {/* Escolha da Ação Master */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Ação Governamental Master *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={interventionAction === "force_approve" ? "default" : "outline"}
                  className="h-10 text-xs rounded-xl"
                  onClick={() => setInterventionAction("force_approve")}
                >
                  Forçar Aprovação
                </Button>
                <Button
                  type="button"
                  variant={interventionAction === "force_reject" ? "default" : "outline"}
                  className="h-10 text-xs rounded-xl"
                  onClick={() => setInterventionAction("force_reject")}
                >
                  Forçar Recusa
                </Button>
                <Button
                  type="button"
                  variant={interventionAction === "reopen" ? "default" : "outline"}
                  className="h-10 text-xs rounded-xl"
                  onClick={() => setInterventionAction("reopen")}
                >
                  Reabrir Parcela
                </Button>
              </div>
            </div>

            {interventionAction === "force_approve" && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Valor Final Aceito (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={((customFinalAmountCents || 0) / 100).toFixed(2)}
                  onChange={(e) => setCustomFinalAmountCents(Math.round(Number(e.target.value) * 100))}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">
                Justificativa Oficial da Intervenção *
              </Label>
              <Textarea
                placeholder="Ex: Auditoria realizada após comprovante TED legítimo. Loja informada e parcela liquidada..."
                value={interventionReason}
                onChange={(e) => setInterventionReason(e.target.value)}
                className="text-xs min-h-[75px] rounded-xl"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl text-xs h-10"
                onClick={() => setIsInterventionOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isIntervening || !interventionReason.trim()}
                className="rounded-xl bg-primary text-primary-foreground text-xs h-10 px-4 font-medium"
              >
                {isIntervening ? "Executando..." : "Confirmar Intervenção Master"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
