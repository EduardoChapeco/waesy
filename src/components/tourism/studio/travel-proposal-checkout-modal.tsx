/**
 * travel-proposal-checkout-modal.tsx — Checkout de Viagens, Manifesto e Modalidades Reais de Agência
 * Padrão Apple HIG & Clean | Suporte a Financiamento Bancário (Backoffice), Cartão de Operadora, Pix e App Terrestre
 * Sem travas ou sinais forçados artificiais (Zero Hardcoded Deposits)
 */

import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DocumentField } from "@/components/ui/document-field";
import { PhoneField } from "@/components/ui/phone-field";
import {
  CreditCardNumberInput,
  CardExpiryInput,
  CardCvvInput,
} from "@/components/ui/credit-card-field";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import {
  ShieldCheck,
  CreditCard,
  QrCode,
  CheckCircle2,
  Users,
  Copy,
  Check,
  Loader2,
  ArrowRight,
  Lock,
  Building2,
  FileText,
  Banknote,
  Compass,
} from "lucide-react";
import { convertProposalToTrip } from "@/services/travel-lifecycle.functions";
import type { TravelProposalDTO } from "@/services/travel-proposal.functions";

interface TravelProposalCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: TravelProposalDTO;
  onSuccess?: (tripId: string, voucherToken?: string) => void;
}

export type AgencyPaymentMethod =
  | "financiamento_bancario"
  | "cartao_operadora"
  | "pix"
  | "faturado_agencia"
  | "checkout_app";

export function TravelProposalCheckoutModal({
  isOpen,
  onClose,
  proposal,
  onSuccess,
}: TravelProposalCheckoutModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<"passengers" | "payment" | "processing" | "success">("passengers");

  // Dados do Passageiro Principal
  const [leadName, setLeadName] = useState(proposal.client_name || "");
  const [leadCpf, setLeadCpf] = useState("");
  const [leadBirthDate, setLeadBirthDate] = useState("");
  const [leadPhone, setLeadPhone] = useState(proposal.client_whatsapp || "");
  const [leadEmail, setLeadEmail] = useState(proposal.client_email || "");

  // Acompanhantes adicionais
  const totalPassengers = Math.max(1, (proposal.adults_count || 1) + (proposal.children_count || 0));
  const additionalCount = totalPassengers - 1;
  const [additionalPassengers, setAdditionalPassengers] = useState<Array<{ name: string; document: string; birthDate: string }>>(() =>
    Array.from({ length: additionalCount }).map(() => ({ name: "", document: "", birthDate: "" }))
  );

  // Modalidade Real de Pagamento da Agência
  const [selectedMethod, setSelectedMethod] = useState<AgencyPaymentMethod>("financiamento_bancario");
  const [operatorInstallments, setOperatorInstallments] = useState(10);
  const [bankFinanceMonths, setBankFinanceMonths] = useState(24);
  const [clientFinanceNotes, setClientFinanceNotes] = useState("");
  const [isCopiedPix, setIsCopiedPix] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedTripData, setConfirmedTripData] = useState<{ tripNumber: string; voucherToken?: string } | null>(null);

  // Valores
  const totalCents = (proposal.pricing as any)?.total_price_cents || proposal.pricing?.total_cents || 278760;

  // Pix à vista com desconto opcional configurado
  const pixDiscountPercent = 3;
  const pixFullCents = Math.round(totalCents * (1 - pixDiscountPercent / 100));

  const mockPixCode = `00020126580014br.gov.bcb.pix0136waesy-${proposal.id.slice(0, 8)}520400005303986540${(pixFullCents / 100).toFixed(2)}5802BR5920WAESY TURISMO OFICIAL6009SAO PAULO62070503***6304`;

  const handleCopyPix = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(mockPixCode);
      setIsCopiedPix(true);
      toast.success("Código Pix Copia e Cola copiado!");
      setTimeout(() => setIsCopiedPix(false), 3000);
    }
  };

  const handleConfirmBooking = async () => {
    if (!leadName.trim()) {
      toast.error("Preencha o nome completo do passageiro principal.");
      return;
    }
    if (!leadCpf.trim() || leadCpf.length < 11) {
      toast.error("Preencha o CPF do passageiro principal para emissão de bilhetes.");
      return;
    }

    setIsSubmitting(true);
    setStep("processing");

    try {
      const res = await convertProposalToTrip({
        data: {
          proposalId: proposal.id,
          storeId: proposal.store_id || undefined,
          leadPassenger: {
            name: leadName.trim(),
            document: leadCpf.trim(),
            birthDate: leadBirthDate || undefined,
            phone: leadPhone.trim(),
            email: leadEmail.trim() || undefined,
          },
          additionalPassengers: additionalPassengers
            .filter((p) => p.name.trim().length > 0)
            .map((p) => ({
              name: p.name.trim(),
              document: p.document.trim() || undefined,
              birthDate: p.birthDate || undefined,
            })),
          paymentDetails: {
            paymentMethod: selectedMethod === "pix" ? "pix" : "card",
            cardInstallments: selectedMethod === "cartao_operadora" ? operatorInstallments : 1,
            totalCents,
            chargeCents: selectedMethod === "pix" ? pixFullCents : totalCents,
          },
        },
      });

      if (res?.success) {
        setConfirmedTripData({
          tripNumber: res.tripNumber,
          voucherToken: res.voucherToken,
        });
        setStep("success");
        toast.success(`Reserva registrada com sucesso (${res.tripNumber})! O consultor foi notificado.`);
        if (onSuccess) onSuccess(res.tripId, res.voucherToken);
      } else {
        throw new Error("Não foi possível gerar a reserva.");
      }
    } catch (err: any) {
      console.error("[TravelProposalCheckoutModal] Erro ao converter:", err);
      toast.error(err?.message || "Erro ao processar reserva. Tente novamente.");
      setStep("payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl bg-card border border-border/80 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" />
                <span>Reserva & Condições de Pagamento</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {proposal.title} · {proposal.destination_city}
              </DialogDescription>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono font-bold bg-primary/5 text-primary border-primary/20">
              {step === "passengers" ? "Etapa 1 de 2" : step === "payment" ? "Etapa 2 de 2" : "Confirmado"}
            </Badge>
          </div>
        </DialogHeader>

        {/* ── ETAPA 1: MANIFESTO DE PASSAGEIROS ── */}
        {step === "passengers" && (
          <div className="space-y-5 pt-2">
            <div className="p-3.5 bg-primary/[0.03] border border-primary/15 rounded-2xl space-y-1">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Users className="size-4 text-primary" />
                <span>Manifesto de Passageiros ({totalPassengers} viajante{totalPassengers > 1 ? "s" : ""})</span>
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Insira os dados oficiais dos viajantes para emissão dos bilhetes e apólices de seguro.
              </p>
            </div>

            {/* Passageiro Principal (Titular da Reserva) */}
            <div className="p-4 rounded-2xl border border-border/60 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-primary" />
                  Passageiro 1 (Titular / Responsável)
                </span>
                <Badge variant="secondary" className="text-[10px] font-semibold">
                  Principal
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Nome Completo (Conforme RG/Passaporte)</Label>
                  <Input
                    placeholder="Ex: Carlos Eduardo Silva"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">CPF do Passageiro</Label>
                  <DocumentField
                    value={leadCpf}
                    onChange={setLeadCpf}
                    placeholder="000.000.000-00"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={leadBirthDate}
                    onChange={(e) => setLeadBirthDate(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">WhatsApp para Notificações</Label>
                  <PhoneField
                    value={leadPhone}
                    onChange={(val) => setLeadPhone(val || "")}
                    placeholder="(00) 00000-0000"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Acompanhantes Adicionais */}
            {additionalPassengers.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Acompanhantes do Pacote ({additionalPassengers.length})
                </h4>
                {additionalPassengers.map((passenger, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl border border-border/40 bg-card space-y-2.5">
                    <span className="text-xs font-bold text-muted-foreground">
                      Passageiro {idx + 2}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-[11px] text-muted-foreground">Nome Completo</Label>
                        <Input
                          placeholder="Nome conforme documento"
                          value={passenger.name}
                          onChange={(e) => {
                            const updated = [...additionalPassengers];
                            updated[idx].name = e.target.value;
                            setAdditionalPassengers(updated);
                          }}
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">CPF / Documento</Label>
                        <Input
                          placeholder="Documento"
                          value={passenger.document}
                          onChange={(e) => {
                            const updated = [...additionalPassengers];
                            updated[idx].document = e.target.value;
                            setAdditionalPassengers(updated);
                          }}
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-border/40">
              <Button
                type="button"
                onClick={() => {
                  if (!leadName.trim() || !leadCpf.trim()) {
                    toast.error("Preencha nome e CPF do titular para avançar.");
                    return;
                  }
                  setStep("payment");
                }}
                className="rounded-xl text-xs font-bold gap-1.5 h-10 px-5"
              >
                <span>Avançar para Condições de Pagamento</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── ETAPA 2: MODALIDADES REAIS DE PAGAMENTO DA AGÊNCIA ── */}
        {step === "payment" && (
          <div className="space-y-5 pt-2">
            <div className="p-3.5 bg-muted/40 border border-border/60 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Valor Total do Pacote</span>
                <span className="text-xl font-black font-mono text-foreground">{formatMoney(totalCents)}</span>
              </div>
              <Badge variant="outline" className="text-xs font-bold text-foreground">
                {proposal.destination_city}
              </Badge>
            </div>

            {/* Modalidades Reais de Fechamento da Agência */}
            <div className="space-y-2">
              <Label className="text-xs font-bold">Selecione o Formato de Pagamento</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Financiamento Bancário */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod("financiamento_bancario")}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedMethod === "financiamento_bancario"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                      : "border-border/60 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-2 pb-1">
                    <Building2 className="size-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">Financiamento Bancário</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Parcelamento via carnê bancário aprovado pela agência.
                  </p>
                </button>

                {/* 2. Cartão de Crédito Operadora */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod("cartao_operadora")}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedMethod === "cartao_operadora"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                      : "border-border/60 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-2 pb-1">
                    <CreditCard className="size-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">Cartão na Operadora</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Lançamento direto no portal da operadora em até 10x ou 12x.
                  </p>
                </button>

                {/* 3. Pix à Vista */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod("pix")}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedMethod === "pix"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                      : "border-border/60 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <QrCode className="size-4 text-primary" />
                      <span className="text-xs font-bold text-foreground">Pix à Vista</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-bold">
                      -{pixDiscountPercent}%
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Liquidação direta via QR Code instantâneo no valor de {formatMoney(pixFullCents)}.
                  </p>
                </button>

                {/* 4. Faturado / Boleto Corporativo */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod("faturado_agencia")}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedMethod === "faturado_agencia"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                      : "border-border/60 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-2 pb-1">
                    <FileText className="size-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">Faturamento Agência</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Emissão de faturas a prazo para clientes corporativos ou convênios.
                  </p>
                </button>
              </div>
            </div>

            {/* Detalhes Contextuais do Método Selecionado */}
            {selectedMethod === "financiamento_bancario" && (
              <div className="p-4 rounded-2xl bg-primary/[0.03] border border-primary/20 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Prazo de Financiamento Desejado</Label>
                  <select
                    value={bankFinanceMonths}
                    onChange={(e) => setBankFinanceMonths(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-xl border border-border/60 bg-background text-xs font-mono font-medium"
                  >
                    <option value={10}>10x parcelas bancárias</option>
                    <option value={12}>12x parcelas bancárias</option>
                    <option value={18}>18x parcelas bancárias</option>
                    <option value={24}>24x parcelas bancárias</option>
                    <option value={36}>36x parcelas bancárias</option>
                  </select>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Ao confirmar, o consultor da agência receberá o dossiê e cadastrará a proposta de financiamento na instituição bancária.
                </p>
              </div>
            )}

            {selectedMethod === "cartao_operadora" && (
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Parcelamento no Cartão (Operadora)</Label>
                  <select
                    value={operatorInstallments}
                    onChange={(e) => setOperatorInstallments(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-xl border border-border/60 bg-background text-xs font-mono font-medium"
                  >
                    {Array.from({ length: 12 }).map((_, i) => {
                      const inst = i + 1;
                      const val = Math.round(totalCents / inst);
                      return (
                        <option key={inst} value={inst}>
                          {inst}x de {formatMoney(val)} sem juros
                        </option>
                      );
                    })}
                  </select>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  A confirmação do pacote segue a política de parcelamento da operadora responsável.
                </p>
              </div>
            )}

            {selectedMethod === "pix" && (
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 flex flex-col sm:flex-row items-center gap-4">
                <div className="size-28 sm:size-32 bg-white p-2 rounded-xl border border-border/60 flex items-center justify-center shrink-0">
                  <QrCode className="size-full text-foreground" />
                </div>
                <div className="space-y-2 text-center sm:text-left min-w-0 flex-1">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground">Valor no Pix com Desconto:</span>
                    <p className="text-2xl font-black text-foreground font-mono">
                      {formatMoney(pixFullCents)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopyPix}
                    className="rounded-xl text-xs font-semibold gap-1.5 h-9 w-full sm:w-auto border-border/80 cursor-pointer"
                  >
                    {isCopiedPix ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    <span>{isCopiedPix ? "Copiado!" : "Copiar Código Pix"}</span>
                  </Button>
                </div>
              </div>
            )}

            {selectedMethod === "faturado_agencia" && (
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-2">
                <p className="text-xs font-bold text-foreground">Faturamento Corporativo</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  As faturas e boletos serão gerados pela agência com prazo acordado de 15 a 30 dias após emissão.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("passengers")}
                className="rounded-xl text-xs font-bold h-10 px-4 text-muted-foreground"
              >
                Voltar aos Passageiros
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmBooking}
                className="rounded-xl text-xs font-bold gap-1.5 h-10 px-6"
              >
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                <span>Confirmar Reserva</span>
              </Button>
            </div>
          </div>
        )}

        {/* ── ETAPA 3: PROCESSANDO ── */}
        {step === "processing" && (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
            <Loader2 className="size-10 text-primary animate-spin" />
            <p className="text-sm font-bold text-foreground">Registrando viagem e manifesto oficial...</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Criando registro no cockpit da agência, gerando número da viagem e localizadores.
            </p>
          </div>
        )}

        {/* ── ETAPA 4: SUCESSO ── */}
        {step === "success" && confirmedTripData && (
          <div className="py-8 space-y-5 text-center">
            <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-foreground">Reserva Registrada com Sucesso!</h3>
              <p className="text-xs text-muted-foreground">
                Viagem oficial: <strong className="font-mono text-foreground">{confirmedTripData.tripNumber}</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                O consultor da agência foi notificado e já iniciou a conferência do manifesto e a emissão dos vouchers.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onClose();
                  navigate({ to: "/conta/viagens" });
                }}
                className="rounded-xl text-xs font-bold h-10 px-4 w-full sm:w-auto"
              >
                Minhas Viagens
              </Button>

              <Button
                type="button"
                onClick={() => {
                  onClose();
                  navigate({ to: "/viajante/carteira" });
                }}
                className="rounded-xl text-xs font-bold h-10 px-5 w-full sm:w-auto bg-primary text-primary-foreground"
              >
                <span>Abrir Carteira Digital</span>
                <ArrowRight className="size-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
