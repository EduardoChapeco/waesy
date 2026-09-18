/**
 * _store.conta.carnes.tsx — Meus Carnês & Parcelamentos (Plataforma Waesy)
 * Visão do cliente para gestão de compras parceladas direto com a loja.
 * Padrão Apple HIG, alvos de 44px, transparência contábil de juros/desconto e upload de comprovante.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Upload,
  FileText,
  Building2,
  Calendar,
  DollarSign,
  Copy,
  ChevronRight,
  ShieldCheck,
  TrendingDown,
  Info,
  Check,
  ExternalLink,
  FileCheck,
  MessageSquare,
  Smartphone,
} from "lucide-react";
import {
  DigitalCompanionCard,
  type CompanionCardSectionItem,
  type CompanionRuleItem,
  type CompanionContactItem,
} from "@/components/documents/digital-companion-card";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { listClientCarnes, submitInstallmentProof } from "@/services/receivables.functions";

export const Route = createFileRoute("/_store/conta/carnes")({
  head: () => ({ meta: [{ title: "Meus Carnês & Parcelas | Waesy" }] }),
  loader: async () => {
    try {
      const data = await listClientCarnes();
      return data;
    } catch {
      return {
        carnes: [],
        metrics: {
          totalDebtCents: 0,
          totalPaidCents: 0,
          activeCarnesCount: 0,
          overdueInstallmentsCount: 0,
          pendingConciliationCount: 0,
          nextDueInstallment: null,
        },
      };
    }
  },
  component: ClientCarnesPage,
});

function ClientCarnesPage() {
  const initialData = Route.useLoaderData();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["client-carnes"],
    queryFn: () => listClientCarnes(),
    initialData,
  });

  const carnes = data?.carnes || [];
  const metrics = data?.metrics;

  const [activeTab, setActiveTab] = useState<"all" | "pending" | "overdue" | "settled">("all");
  const [selectedInstallment, setSelectedInstallment] = useState<any>(null);
  const [selectedCarne, setSelectedCarne] = useState<any>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [proofUrl, setProofUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [copiedPix, setCopiedPix] = useState(false);
  const [selectedCompanionCarne, setSelectedCompanionCarne] = useState<any | null>(null);

  const { mutate: submitProof, isPending: isSubmitting } = useMutation({
    mutationFn: submitInstallmentProof,
    onSuccess: () => {
      toast.success("Comprovante enviado com sucesso! A loja foi notificada para conciliação.");
      queryClient.invalidateQueries({ queryKey: ["client-carnes"] });
      setIsPayModalOpen(false);
      setProofUrl("");
      setNotes("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao enviar comprovante.");
    },
  });

  const handleOpenPay = (carne: any, inst: any) => {
    setSelectedCarne(carne);
    setSelectedInstallment(inst);
    setProofUrl(inst.payment_proof_url || "");
    setNotes(inst.notes || "");
    setIsPayModalOpen(true);
  };

  const handleConfirmProof = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstallment) return;
    if (!proofUrl) {
      toast.error("Por favor, faça o upload da foto do comprovante.");
      return;
    }

    submitProof({
      data: {
        installmentId: selectedInstallment.id,
        proofUrl,
        notes: notes || undefined,
      },
    });
  };

  const handleCopyPix = (key: string) => {
    if (!key) return;
    navigator.clipboard.writeText(key);
    setCopiedPix(true);
    toast.success("Chave PIX copiada!");
    setTimeout(() => setCopiedPix(false), 2000);
  };

  // Filtragem de carnês
  const filteredCarnes = carnes.filter((carne: any) => {
    if (activeTab === "settled") return carne.status === "settled";
    if (activeTab === "pending") return carne.status === "active" && carne.summary.remainingCents > 0;
    if (activeTab === "overdue") return carne.summary.lateCount > 0;
    return true;
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0">
      {/* ── 1. Clean Minimalist Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Carnês
          </h1>
          {carnes.length > 0 && (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-0.5 rounded-full">
              {carnes.length}
            </Badge>
          )}
        </div>

        <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold h-8 px-3.5 cursor-pointer">
          <Link to="/mercado">Explorar Lojas</Link>
        </Button>
      </div>

        {/* Dashboard de Métricas Rápidas (Apple HIG Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Saldo Devedor
            </span>
            <div className="text-lg sm:text-xl font-bold text-foreground">
              {formatMoney(metrics?.totalDebtCents || 0)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {metrics?.activeCarnesCount || 0} carnê(s) ativo(s)
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Total Liquidado
            </span>
            <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatMoney(metrics?.totalPaidCents || 0)}
            </div>
            <div className="text-[11px] text-muted-foreground">Parcelas já pagas</div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Em Atraso
            </span>
            <div
              className={cn(
                "text-lg sm:text-xl font-bold",
                (metrics?.overdueInstallmentsCount || 0) > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-foreground",
              )}
            >
              {metrics?.overdueInstallmentsCount || 0} parcela(s)
            </div>
            <div className="text-[11px] text-muted-foreground">
              {(metrics?.overdueInstallmentsCount || 0) > 0 ? "Com juros de mora" : "Tudo em dia"}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Em Análise
            </span>
            <div className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400">
              {metrics?.pendingConciliationCount || 0}
            </div>
            <div className="text-[11px] text-muted-foreground">Comprovante sob análise</div>
          </div>
        </div>

        {/* Card de Próximo Vencimento em Destaque */}
        {metrics?.nextDueInstallment && (
          <div className="p-4 sm:p-5 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  <Calendar className="h-3 w-3" /> Próximo Vencimento
                </span>
                {metrics.nextDueInstallment.isLate && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600">
                    Vencida
                  </span>
                )}
              </div>
              <div className="text-base font-semibold text-foreground">
                Parcela {metrics.nextDueInstallment.installmentNumber} —{" "}
                {metrics.nextDueInstallment.carneTitle}
              </div>
              <div className="text-xs text-muted-foreground">
                Loja: {metrics.nextDueInstallment.storeName} • Vencimento:{" "}
                {formatDate(metrics.nextDueInstallment.dueDate)}
              </div>
            </div>

            <div className="text-left sm:text-right w-full sm:w-auto">
              <div className="text-lg font-bold text-foreground">
                {formatMoney(metrics.nextDueInstallment.amountCents)}
              </div>
            </div>
          </div>
        )}

        {/* Segmented Control / Tabs */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-muted/60 border border-border/50 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
              activeTab === "all"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Todos ({carnes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={cn(
              "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
              activeTab === "pending"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Em Aberto
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("overdue")}
            className={cn(
              "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
              activeTab === "overdue"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Em Atraso ({metrics?.overdueInstallmentsCount || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("settled")}
            className={cn(
              "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
              activeTab === "settled"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Quitados
          </button>
        </div>

        {/* Lista de Carnês */}
        {filteredCarnes.length === 0 ? (
          <div className="bg-card border border-border/60 rounded-2xl p-10 text-center space-y-3 shadow-xs">
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <CreditCard className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-base text-foreground">Nenhum carnê encontrado</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
              {activeTab === "all"
                ? "Você ainda não possui compras ou acordos parcelados ativos."
                : "Nenhum registro corresponde ao filtro selecionado."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCarnes.map((carne: any) => {
              const storeName = carne.store?.name || carne.creditor?.full_name || "Loja Parceira";
              const isSettled = carne.status === "settled";

              return (
                <div
                  key={carne.id}
                  className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs space-y-4 p-5"
                >
                  {/* Cabeçalho do Carnê */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-border/50">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base text-foreground">{carne.title}</span>
                        {isSettled ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Quitado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                            Ativo
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap pt-0.5">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" /> {storeName}
                        </span>

                        {carne.contract?.verification_code && (
                          <Link
                            to="/verify/document/$code"
                            params={{ code: carne.contract.verification_code }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                            title="Ver Contrato & Confissão de Dívida Digital"
                          >
                            <FileCheck className="size-3" />
                            <span>Contrato Assinado</span>
                            <ExternalLink className="size-2.5" />
                          </Link>
                        )}

                        {isSettled && (
                          <Link
                            to="/_store/conta/contratos"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                            title="Ver Certificado de Quitação no Cofre"
                          >
                            <CheckCircle2 className="size-3" />
                            <span>Termo de Quitação ✓</span>
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-left sm:text-right">
                        <div className="text-sm font-semibold text-foreground">
                          {formatMoney(carne.total_cents)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {carne.summary.paidCount} de {carne.summary.totalCount} pagas (
                          {carne.summary.progressPercent}%)
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedCompanionCarne(carne)}
                        className="h-8 px-2.5 rounded-xl text-xs font-bold gap-1 text-primary border-primary/25 hover:bg-primary/5 cursor-pointer shrink-0"
                        title="Visualizar Carnê Digital 9:16 para WhatsApp"
                      >
                        <Smartphone className="size-3.5" />
                        <span>Carnê 9:16</span>
                      </Button>
                    </div>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${carne.summary.progressPercent}%` }}
                    />
                  </div>

                  {/* Tabela de Parcelas */}
                  <div className="divide-y divide-border/40 -mx-5 px-5">
                    {carne.installments.map((inst: any) => {
                      const isPaid = inst.status === "paid";
                      const isPendingConciliation = inst.conciliation_status === "pending";
                      const isRejected = inst.conciliation_status === "rejected";
                      const dueDate = new Date(inst.due_date);
                      const isLate = !isPaid && dueDate < new Date();

                      const originalAmount = Number(
                        inst.original_amount_cents || inst.amount_cents || 0,
                      );
                      const finalAmount = Number(
                        inst.final_amount_cents || inst.original_amount_cents || inst.amount_cents || 0,
                      );
                      const interestAccrued = Number(inst.interest_accrued_cents || 0);
                      const fineAmount = Number(inst.fine_cents || 0);
                      const discountAmount = Number(inst.discount_cents || 0);

                      return (
                        <div
                          key={inst.id}
                          className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm"
                        >
                          {/* Info Parcela */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                Parcela {inst.installment_number}/{carne.installments_count}
                              </span>

                              {isPaid && (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                                  <CheckCircle2 className="h-3 w-3" /> Paga
                                </span>
                              )}

                              {!isPaid && isPendingConciliation && (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">
                                  <Clock className="h-3 w-3" /> Em Análise
                                </span>
                              )}

                              {!isPaid && isRejected && (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-medium">
                                  <AlertCircle className="h-3 w-3" /> Comprovante Recusado
                                </span>
                              )}

                              {!isPaid && !isPendingConciliation && isLate && (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-medium">
                                  <AlertCircle className="h-3 w-3" /> Vencida ({inst.late_days || 1}d)
                                </span>
                              )}

                              {!isPaid && !isPendingConciliation && !isLate && (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                                  A Vencer
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                              <span>Vencimento: {formatDate(inst.due_date)}</span>
                              {isPaid && inst.paid_at && (
                                <span>• Pago em: {formatDate(inst.paid_at)}</span>
                              )}
                            </div>

                            {/* Detalhamento de juros e multas se houver */}
                            {!isPaid && (interestAccrued > 0 || fineAmount > 0 || discountAmount > 0) && (
                              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                                <span>Nominal: {formatMoney(originalAmount)}</span>
                                {fineAmount > 0 && (
                                  <span className="text-rose-500">+Multa: {formatMoney(fineAmount)}</span>
                                )}
                                {interestAccrued > 0 && (
                                  <span className="text-rose-500">+Juros: {formatMoney(interestAccrued)}</span>
                                )}
                                {discountAmount > 0 && (
                                  <span className="text-emerald-500">-Desconto: {formatMoney(discountAmount)}</span>
                                )}
                              </div>
                            )}

                            {isRejected && inst.conciliation_notes && (
                              <div className="text-xs text-rose-600 font-medium bg-rose-50 dark:bg-rose-950/20 p-1.5 rounded-md">
                                Motivo da recusa: {inst.conciliation_notes}
                              </div>
                            )}
                          </div>

                          {/* Valor e Ação */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                            <div className="text-left sm:text-right">
                              <div className="font-semibold text-foreground">
                                {formatMoney(finalAmount)}
                              </div>
                              {isPaid && (
                                <div className="text-[11px] text-emerald-600 flex items-center gap-0.5 justify-end">
                                  <ShieldCheck className="h-3 w-3" /> No Ledger
                                </div>
                              )}
                            </div>

                            {!isPaid && (
                              <Button
                                size="sm"
                                variant={isPendingConciliation ? "outline" : "default"}
                                className={cn(
                                  "h-9 px-3 text-xs font-medium rounded-xl",
                                  isPendingConciliation
                                    ? "border-amber-400/50 text-amber-700 dark:text-amber-300"
                                    : "bg-primary text-primary-foreground",
                                )}
                                onClick={() => handleOpenPay(carne, inst)}
                              >
                                {isPendingConciliation ? (
                                  <>
                                    <Clock className="h-3.5 w-3.5 mr-1" /> Reenviar
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-3.5 w-3.5 mr-1" /> Pagar / Comprovante
                                  </>
                                )}
                              </Button>
                            )}
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

      {/* Modal / Drawer de Pagamento e Envio de Comprovante */}
      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Pagar Parcela {selectedInstallment?.installment_number}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedCarne?.title} • {selectedCarne?.store?.name || "Loja Credora"}
            </DialogDescription>
          </DialogHeader>

          {/* Resumo Financeiro Transparente */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Valor Nominal da Parcela:</span>
              <span>
                {formatMoney(
                  selectedInstallment?.original_amount_cents ||
                    selectedInstallment?.amount_cents ||
                    0,
                )}
              </span>
            </div>

            {Number(selectedInstallment?.fine_cents || 0) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Multa por Atraso:</span>
                <span>+{formatMoney(selectedInstallment.fine_cents)}</span>
              </div>
            )}

            {Number(selectedInstallment?.interest_accrued_cents || 0) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Juros Moratórios:</span>
                <span>+{formatMoney(selectedInstallment.interest_accrued_cents)}</span>
              </div>
            )}

            {Number(selectedInstallment?.discount_cents || 0) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Desconto Concedido:</span>
                <span>-{formatMoney(selectedInstallment.discount_cents)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-bold text-foreground pt-1.5 border-t border-border/40">
              <span>Total Atual a Pagar:</span>
              <span className="text-primary">
                {formatMoney(
                  selectedInstallment?.final_amount_cents ||
                    selectedInstallment?.original_amount_cents ||
                    selectedInstallment?.amount_cents ||
                    0,
                )}
              </span>
            </div>
          </div>

          {/* Chave PIX da Loja & Notificação Rápida */}
          {selectedCarne?.store?.phone && (
            <div className="p-3.5 rounded-2xl border border-dashed border-border bg-card space-y-2.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase">
                Chave PIX da Loja (Telefone)
              </span>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold text-foreground bg-muted/40 p-2 rounded-xl border border-border/60">
                  {selectedCarne.store.phone}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-10 sm:h-9 px-3 text-xs rounded-xl font-medium cursor-pointer flex-1 sm:flex-initial"
                    onClick={() => handleCopyPix(selectedCarne.store.phone)}
                  >
                    {copiedPix ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> Chave Copiada
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar PIX
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-10 sm:h-9 px-3 text-xs rounded-xl font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border border-emerald-500/20 cursor-pointer flex-1 sm:flex-initial"
                    onClick={() => {
                      const phone = (selectedCarne.store.phone || "").replace(/\D/g, "");
                      const amount = formatMoney(
                        selectedInstallment?.final_amount_cents ||
                          selectedInstallment?.original_amount_cents ||
                          selectedInstallment?.amount_cents ||
                          0,
                      );
                      const msg = encodeURIComponent(
                        `Olá! Estou enviando o comprovante de pagamento da parcela ${selectedInstallment?.installment_number} do carnê "${selectedCarne.title}" no valor de ${amount}.`,
                      );
                      window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
                    }}
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                    Avisar no WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Formulário de Envio do Comprovante */}
          <form onSubmit={handleConfirmProof} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Foto ou Print do Comprovante Bancário *
              </Label>
              <ImageUpload
                value={proofUrl}
                onChange={(url) => setProofUrl(url)}
                bucket="receipts"
                aspectPreset="free"
                helperText="Formatos JPG ou PNG. O comprovante é enviado para conferência da loja."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Observação para a Loja (opcional)
              </Label>
              <Textarea
                placeholder="Ex: Pago via Nubank às 14:30 em nome de Maria..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs min-h-[65px] rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl h-10 text-xs"
                onClick={() => setIsPayModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !proofUrl}
                className="rounded-xl h-10 text-xs px-4 bg-primary text-primary-foreground font-medium"
              >
                {isSubmitting ? "Enviando..." : "Enviar Comprovante"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL DIGITAL COMPANION CARD 9:16 (CARNÊ DIGITAL / WHATSAPP) ── */}
      <Dialog
        open={Boolean(selectedCompanionCarne)}
        onOpenChange={(open) => {
          if (!open) setSelectedCompanionCarne(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl bg-background border border-border shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Carnê Digital 9:16 de Pagamento</DialogTitle>
          </DialogHeader>
          {selectedCompanionCarne && (
            <div className="w-full">
              <DigitalCompanionCard {...getCarneCompanionData(selectedCompanionCarne)} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getCarneCompanionData(carne: any) {
  const storeName = carne.store?.name || carne.creditor?.full_name || "Loja Parceira";
  const installments = carne.installments || [];

  const sections: CompanionCardSectionItem[] = installments.map((inst: any) => {
    const isPaid = inst.status === "paid";
    const dueDate = new Date(inst.due_date);
    const isLate = !isPaid && dueDate < new Date();
    const amountCents = Number(inst.final_amount_cents || inst.original_amount_cents || inst.amount_cents || 0);

    return {
      id: `inst-${inst.installment_number}`,
      type: "custom" as const,
      badge: isPaid ? "PAGA ✓" : isLate ? "EM ATRASO" : "A VENCER",
      title: `Parcela ${inst.installment_number}/${carne.installments_count}`,
      subtitle: `Vencimento: ${formatDate(inst.due_date).split(" ")[0]}`,
      details: [
        { label: "Valor", value: formatMoney(amountCents), highlight: true },
        { label: "Situação", value: isPaid ? "Liquidada" : isLate ? "Vencida com juros" : "Aguardando pagamento" },
        ...(inst.pix_code ? [{ label: "Chave Pix", value: inst.pix_code }] : []),
      ],
    };
  });

  const rules: CompanionRuleItem[] = [
    {
      title: "Desconto por Pontualidade",
      description: "Pagamentos realizados até a data de vencimento garantem a taxa contratada sem encargos adicionais.",
      badge: "Pontualidade",
      highlight: true,
    },
    {
      title: "Juros e Multa por Atraso",
      description: "Após o vencimento, incidirá multa de 2% e juros moratórios calculados ao dia conforme o contrato de confissão de dívida.",
      badge: "Encargos",
    },
    {
      title: "Envio de Comprovantes",
      description: "Ao pagar via Pix, anexe o comprovante pelo portal da sua conta ou envie diretamente no WhatsApp da loja para baixa rápida.",
      badge: "Comprovante",
    },
  ];

  const storePhone = carne.store?.settings?.whatsapp_phone || carne.store?.phone || carne.creditor?.phone;

  const emergencyContacts: CompanionContactItem[] = [
    ...(storePhone
      ? [
          {
            name: storeName,
            category: "Setor Financeiro / Loja",
            phone: storePhone,
            whatsapp: true,
            is24h: false,
          },
        ]
      : []),
    {
      name: "Central de Apoio Waesy",
      category: "Suporte ao Consumidor",
      phone: "0800 000 0000",
      whatsapp: true,
      is24h: true,
    },
  ];

  return {
    niche: "retail" as const,
    title: carne.title || "Carnê de Pagamento",
    subtitle: `${storeName} · ${carne.summary?.paidCount || 0} de ${carne.summary?.totalCount || 0} pagas (${carne.summary?.progressPercent || 0}%)`,
    code: `CARNE-${carne.id.slice(0, 8).toUpperCase()}`,
    companyName: storeName,
    companyLogoUrl: carne.store?.logo_url,
    participantsLabel: "Titular",
    participants: [carne.debtor?.full_name || "Cliente"].filter(Boolean),
    sections,
    rules,
    emergencyContacts,
  };
}
