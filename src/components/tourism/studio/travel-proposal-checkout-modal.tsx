import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PhoneField } from "@/components/ui/phone-field";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, Info, Loader2, ShieldCheck, Users, Wallet } from "lucide-react";
import { approveTravelProposal, type TravelProposalDTO } from "@/services/travel-proposal.functions";

type PaymentPreference = "pix" | "cartao_operadora" | "financiamento_bancario" | "faturado_agencia";
type PassengerForm = { name: string; document: string; birthDate: string };

interface TravelProposalCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: TravelProposalDTO;
  selectedOptionId?: string | null;
  onSuccess?: () => void;
}

export function TravelProposalCheckoutModal({
  isOpen,
  onClose,
  proposal,
  selectedOptionId = null,
  onSuccess,
}: TravelProposalCheckoutModalProps) {
  const totalPassengers = Math.max(1, (proposal.adults_count || 1) + (proposal.children_count || 0));
  const [step, setStep] = useState<"passengers" | "preference" | "processing" | "success">("passengers");
  const [leadName, setLeadName] = useState(proposal.client_name || "");
  const [leadDocument, setLeadDocument] = useState("");
  const [leadBirthDate, setLeadBirthDate] = useState("");
  const [leadPhone, setLeadPhone] = useState(proposal.client_whatsapp || "");
  const [leadEmail, setLeadEmail] = useState(proposal.client_email || "");
  const [additionalPassengers, setAdditionalPassengers] = useState<PassengerForm[]>(() =>
    Array.from({ length: Math.max(0, totalPassengers - 1) }, () => ({ name: "", document: "", birthDate: "" })),
  );
  const [paymentPreference, setPaymentPreference] = useState<PaymentPreference | null>(null);
  const [paymentInstallments, setPaymentInstallments] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedOption = useMemo(
    () => proposal.options?.find((option) => option.id === selectedOptionId),
    [proposal.options, selectedOptionId],
  );
  const configuredTotal = selectedOption?.pricing?.total_price_cents ?? (proposal.pricing as any)?.total_price_cents ?? proposal.pricing?.total_cents;
  const hasPrice = Number.isInteger(configuredTotal) && configuredTotal > 0;

  const handleSubmitAcceptance = async () => {
    if (proposal.status !== "sent") {
      toast.error("A agência precisa publicar a proposta antes do aceite online.");
      return;
    }
    if (!proposal.snapshot_hash) {
      toast.error("A proposta precisa ser atualizada pela agência antes do aceite online.");
      return;
    }
    const validUntil = proposal.valid_until ? Date.parse(proposal.valid_until) : Number.NaN;
    if (!Number.isFinite(validUntil) || validUntil <= Date.now()) {
      toast.error("A validade terminou ou não está definida. Solicite uma proposta atualizada à agência.");
      return;
    }
    if (!hasPrice) {
      toast.error("A proposta ainda não possui preço confirmado pela agência.");
      return;
    }
    if (leadName.trim().length < 2 || leadDocument.trim().length < 3) {
      toast.error("Informe nome e documento do passageiro principal.");
      setStep("passengers");
      return;
    }
    if (additionalPassengers.some((passenger) => passenger.name.trim().length < 2 || passenger.document.trim().length < 3)) {
      toast.error("Informe nome e documento de cada passageiro.");
      setStep("passengers");
      return;
    }
    if (!paymentPreference) {
      toast.error("Selecione uma preferência de pagamento para continuar.");
      return;
    }

    const passengers = [
      {
        name: leadName.trim(),
        document: leadDocument.trim(),
        birthDate: leadBirthDate || null,
        phone: leadPhone.trim() || null,
        email: leadEmail.trim() || null,
        isLead: true,
      },
      ...additionalPassengers.map((passenger) => ({
        name: passenger.name.trim(),
        document: passenger.document.trim(),
        birthDate: passenger.birthDate || null,
        isLead: false,
      })),
    ];

    setIsSubmitting(true);
    setStep("processing");
    try {
      const result = await approveTravelProposal({
        data: {
          token: proposal.public_token,
          snapshotHash: proposal.snapshot_hash,
          selectedOptionId,
          acceptedByName: leadName.trim(),
          acceptedByEmail: leadEmail.trim() || undefined,
          passengers,
          paymentPreference,
          paymentInstallments: ["cartao_operadora", "financiamento_bancario"].includes(paymentPreference) ? paymentInstallments : null,
        },
      });
      if (!result.success || !result.acceptanceId) throw new Error("O aceite não foi confirmado no sistema.");
      setStep("success");
      toast.success(result.message);
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível registrar o aceite.";
      toast.error(message);
      setStep("preference");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeDialog = (open: boolean) => {
    if (open) return;
    onClose();
    if (step !== "success") setStep("passengers");
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeDialog}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto p-4 sm:p-6 rounded-lg bg-card border border-border/80">
        <DialogHeader className="pb-3 border-b border-border/40">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" />
                Registrar aceite
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {proposal.title} · {proposal.destination_city}
              </DialogDescription>
            </div>
            <Badge variant="outline" className="shrink-0 text-xs">
              {step === "passengers" ? "Passageiros" : step === "preference" ? "Preferência" : step === "processing" ? "Enviando" : "Registrado"}
            </Badge>
          </div>
        </DialogHeader>

        {step === "passengers" && (
          <div className="space-y-5 pt-2">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Users className="size-4 text-primary" />
                Manifesto de {totalPassengers} passageiro{totalPassengers === 1 ? "" : "s"}
              </p>
              <p className="text-sm text-muted-foreground">
                Os dados serão enviados à agência para revisão. Não serão usados para emitir bilhetes automaticamente.
              </p>
            </div>

            <section className="rounded-lg border border-border/60 p-4 space-y-3" aria-labelledby="lead-passenger-heading">
              <h3 id="lead-passenger-heading" className="text-sm font-medium">Passageiro principal</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lead-name">Nome completo</Label>
                  <Input id="lead-name" autoComplete="name" value={leadName} onChange={(event) => setLeadName(event.target.value)} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-document">CPF ou passaporte</Label>
                  <Input id="lead-document" autoComplete="off" value={leadDocument} onChange={(event) => setLeadDocument(event.target.value)} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-birth-date">Data de nascimento</Label>
                  <Input id="lead-birth-date" type="date" autoComplete="bday" value={leadBirthDate} onChange={(event) => setLeadBirthDate(event.target.value)} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-phone">WhatsApp</Label>
                  <PhoneField id="lead-phone" value={leadPhone} onChange={(value) => setLeadPhone(value || "")} className="h-11" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="lead-email">E-mail</Label>
                  <Input id="lead-email" type="email" autoComplete="email" value={leadEmail} onChange={(event) => setLeadEmail(event.target.value)} className="h-11" />
                </div>
              </div>
            </section>

            {additionalPassengers.map((passenger, index) => (
              <section key={index} className="rounded-lg border border-border/60 p-4 space-y-3" aria-labelledby={`passenger-${index}-heading`}>
                <h3 id={`passenger-${index}-heading`} className="text-sm font-medium">Passageiro {index + 2}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`passenger-${index}-name`}>Nome completo</Label>
                    <Input id={`passenger-${index}-name`} value={passenger.name} onChange={(event) => setAdditionalPassengers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`passenger-${index}-document`}>CPF ou passaporte</Label>
                    <Input id={`passenger-${index}-document`} value={passenger.document} onChange={(event) => setAdditionalPassengers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, document: event.target.value } : item))} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`passenger-${index}-birth-date`}>Nascimento</Label>
                    <Input id={`passenger-${index}-birth-date`} type="date" value={passenger.birthDate} onChange={(event) => setAdditionalPassengers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, birthDate: event.target.value } : item))} className="h-11" />
                  </div>
                </div>
              </section>
            ))}

            <div className="rounded-lg border border-border/60 p-4">
              <p className="text-sm font-medium">Opção selecionada</p>
              <p className="text-sm text-muted-foreground">
                {selectedOption?.name || proposal.title} · {hasPrice ? formatMoney(configuredTotal) : "Valor pendente de confirmação"}
              </p>
            </div>
            {!hasPrice && (
              <p role="alert" className="text-sm text-destructive">A agência precisa informar um valor antes do aceite online.</p>
            )}

            <div className="flex justify-end border-t border-border/40 pt-4">
              <Button type="button" onClick={() => setStep("preference")} disabled={!hasPrice} className="h-11 min-h-11 gap-2 focus-visible:ring-2 focus-visible:ring-ring">
                Continuar <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "preference" && (
          <div className="space-y-5 pt-2">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2">
              <p className="text-sm font-medium">Preferência de pagamento</p>
              <p className="text-sm text-muted-foreground">
                Esta escolha é apenas uma preferência. A agência confirmará disponibilidade, condições e cobrança separadamente.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={paymentPreference === "pix"}
                onClick={() => setPaymentPreference("pix")}
                className={`min-h-11 rounded-lg border p-4 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${paymentPreference === "pix" ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/40"}`}
              >
                <span className="flex items-center gap-2 text-sm font-medium"><Wallet className="size-4 text-primary" /> Pix</span>
                <span className="mt-2 block text-sm text-muted-foreground">Sem código Pix ou cobrança nesta etapa.</span>
              </button>
              <button
                type="button"
                aria-pressed={paymentPreference === "cartao_operadora"}
                onClick={() => setPaymentPreference("cartao_operadora")}
                className={`min-h-11 rounded-lg border p-4 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${paymentPreference === "cartao_operadora" ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/40"}`}
              >
                <span className="flex items-center gap-2 text-sm font-medium"><CreditCard className="size-4 text-primary" /> Cartão</span>
                <span className="mt-2 block text-sm text-muted-foreground">A agência confirmará parcelas e aprovação.</span>
              </button>
              <button
                type="button"
                aria-pressed={paymentPreference === "financiamento_bancario"}
                onClick={() => setPaymentPreference("financiamento_bancario")}
                className={`min-h-11 rounded-lg border p-4 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${paymentPreference === "financiamento_bancario" ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/40"}`}
              >
                <span className="flex items-center gap-2 text-sm font-medium"><CreditCard className="size-4 text-primary" /> Financiamento</span>
                <span className="mt-2 block text-sm text-muted-foreground">Sujeito à análise e às condições do banco.</span>
              </button>
              <button
                type="button"
                aria-pressed={paymentPreference === "faturado_agencia"}
                onClick={() => setPaymentPreference("faturado_agencia")}
                className={`min-h-11 rounded-lg border p-4 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${paymentPreference === "faturado_agencia" ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/40"}`}
              >
                <span className="flex items-center gap-2 text-sm font-medium"><Wallet className="size-4 text-primary" /> Faturado pela agência</span>
                <span className="mt-2 block text-sm text-muted-foreground">Disponibilidade e prazo serão confirmados pela agência.</span>
              </button>
            </div>

            {["cartao_operadora", "financiamento_bancario"].includes(paymentPreference || "") && (
              <div className="max-w-xs space-y-2">
                <Label htmlFor="payment-installments">Parcelas desejadas</Label>
                <Input id="payment-installments" type="number" min={1} max={12} step={1} value={paymentInstallments} onChange={(event) => setPaymentInstallments(Math.min(12, Math.max(1, Number(event.target.value) || 1)))} className="h-11" />
              </div>
            )}

            <div className="rounded-lg border border-border/60 p-4 space-y-2" role="note">
              <p className="text-sm font-medium flex items-center gap-2"><Info className="size-4 text-primary" /> Antes de enviar</p>
              <p className="text-sm text-muted-foreground">
                O aceite será registrado para análise da agência. Ainda não há reserva confirmada, pagamento, bilhete ou voucher emitido; nenhum dado de cartão será solicitado.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 border-t border-border/40 pt-4">
              <Button type="button" variant="outline" onClick={() => setStep("passengers")} className="h-11 min-h-11 gap-2 focus-visible:ring-2 focus-visible:ring-ring">
                <ArrowLeft className="size-4" /> Voltar
              </Button>
              <Button type="button" onClick={handleSubmitAcceptance} disabled={!paymentPreference || isSubmitting || proposal.status !== "sent" || !proposal.snapshot_hash} className="h-11 min-h-11 gap-2 focus-visible:ring-2 focus-visible:ring-ring">
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                {isSubmitting ? "Enviando" : "Registrar aceite"}
              </Button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="py-12 text-center space-y-3" role="status" aria-live="polite">
            <Loader2 className="size-8 animate-spin mx-auto text-primary" />
            <p className="text-sm font-medium">Registrando o aceite</p>
            <p className="text-sm text-muted-foreground">Nenhuma cobrança ou reserva será criada nesta etapa.</p>
          </div>
        )}

        {step === "success" && (
          <div className="py-8 text-center space-y-4" role="status" aria-live="polite">
            <CheckCircle2 className="size-9 mx-auto text-primary" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Aceite registrado</h3>
              <p className="mx-auto max-w-prose text-sm text-muted-foreground">
                A agência revisará o manifesto, a opção e a preferência informada. Não há reserva confirmada nem pagamento; a agência entrará em contato para os próximos passos.
              </p>
            </div>
            <Button type="button" onClick={onClose} className="h-11 min-h-11 focus-visible:ring-2 focus-visible:ring-ring">Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
