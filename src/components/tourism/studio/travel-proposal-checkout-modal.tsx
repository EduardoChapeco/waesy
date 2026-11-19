import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PhoneField } from "@/components/ui/phone-field";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, ExternalLink, Info, Loader2, MessageCircle, ShieldAlert, ShieldCheck, Users, Wallet } from "lucide-react";
import { approveTravelProposal, type TravelProposalDTO } from "@/services/travel-proposal.functions";
import { cn } from "@/lib/utils";
import { resolveMaxInstallmentsFromOptions } from "@/lib/tourism/payment-policy";

type Step = "passengers" | "preference" | "review" | "processing" | "success";
type PaymentPreference = "pix" | "cartao_operadora" | "financiamento_bancario" | "faturado_agencia" | "gateway_online";
type PassengerForm = { name: string; document: string; birthDate: string; roomPreference: string };

interface TravelProposalCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: TravelProposalDTO;
  selectedOptionId?: string | null;
  initialPaymentPreference?: PaymentPreference | null;
  initialInstallments?: number;
  onSuccess?: () => void;
}

export function TravelProposalCheckoutModal({
  isOpen,
  onClose,
  proposal,
  selectedOptionId = null,
  initialPaymentPreference = null,
  initialInstallments = 1,
  onSuccess,
}: TravelProposalCheckoutModalProps) {
  const totalPassengers = Math.max(1, (proposal.adults_count || 1) + (proposal.children_count || 0));
  const [step, setStep] = useState<Step>("passengers");
  const [leadName, setLeadName] = useState(proposal.client_name || "");
  const [leadDocument, setLeadDocument] = useState("");
  const [leadBirthDate, setLeadBirthDate] = useState("");
  const [leadPhone, setLeadPhone] = useState(proposal.client_whatsapp || "");
  const [leadEmail, setLeadEmail] = useState(proposal.client_email || "");
  const [leadRoomPreference, setLeadRoomPreference] = useState("Quarto 1 - Duplo / Casal");
  const [additionalPassengers, setAdditionalPassengers] = useState<PassengerForm[]>(() =>
    Array.from({ length: Math.max(0, totalPassengers - 1) }, () => ({ name: "", document: "", birthDate: "", roomPreference: "Quarto 1 - Duplo / Casal" })),
  );
  const [paymentPreference, setPaymentPreference] = useState<PaymentPreference | null>(initialPaymentPreference);
  const [paymentInstallments, setPaymentInstallments] = useState(
    Math.min(12, Math.max(1, initialInstallments || 1)),
  );
  const [simulationAgreed, setSimulationAgreed] = useState(false);
  const [acceptanceProtocol, setAcceptanceProtocol] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    if (initialPaymentPreference) {
      setPaymentPreference(initialPaymentPreference);
    }
    if (initialInstallments && initialInstallments >= 1) {
      setPaymentInstallments(Math.min(12, Math.max(1, initialInstallments)));
    }
  }, [isOpen, initialPaymentPreference, initialInstallments]);

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
        roomPreference: leadRoomPreference || null,
        isLead: true,
      },
      ...additionalPassengers.map((passenger) => ({
        name: passenger.name.trim(),
        document: passenger.document.trim(),
        birthDate: passenger.birthDate || null,
        roomPreference: passenger.roomPreference || null,
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
          paymentInstallments: ["cartao_operadora", "financiamento_bancario", "gateway_online"].includes(paymentPreference) ? paymentInstallments : null,
        },
      });
      if (!result.success || !result.acceptanceId) throw new Error("O aceite não foi confirmado no sistema.");
      setStep("success");
      toast.success(result.message);
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível registrar o aceite.";
      toast.error(message);
      setStep("review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cleanAgencyPhone = (proposal.web_page?.whatsapp_phone || proposal.agency_whatsapp || proposal.client_whatsapp || "").replace(/\D/g, "");
  const formattedAgencyPhone = cleanAgencyPhone.startsWith("55") ? cleanAgencyPhone : cleanAgencyPhone ? `55${cleanAgencyPhone}` : "";
  const showGatewayOnline = Boolean(proposal.web_page?.allow_online_gateway_payment);
  const gatewayUrl = proposal.web_page?.payment_gateway_url?.trim() || "";

  const closeDialog = (open: boolean) => {
    if (open) return;
    onClose();
    if (step !== "success") {
      setStep("passengers");
      setSimulationAgreed(false);
    }
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
              {step === "passengers"
                ? "Passageiros"
                : step === "preference"
                  ? "Pagamento"
                  : step === "review"
                    ? "Revisão"
                    : step === "processing"
                      ? "Enviando"
                      : "Registrado"}
            </Badge>
          </div>
        </DialogHeader>

        {/* Stepper Visual de 4 Etapas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 border-b border-border/40 text-xs font-semibold">
          <div className={cn("flex items-center gap-2", step === "passengers" ? "text-primary font-bold" : "text-muted-foreground")}>
            <span className={cn("size-5 rounded-full flex items-center justify-center text-xs", step === "passengers" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>1</span>
            <span className="truncate">Passageiros</span>
          </div>
          <div className={cn("flex items-center gap-2", step === "preference" ? "text-primary font-bold" : "text-muted-foreground")}>
            <span className={cn("size-5 rounded-full flex items-center justify-center text-xs", step === "preference" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>2</span>
            <span className="truncate">Pagamento</span>
          </div>
          <div className={cn("flex items-center gap-2", step === "review" ? "text-primary font-bold" : "text-muted-foreground")}>
            <span className={cn("size-5 rounded-full flex items-center justify-center text-xs", step === "review" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>3</span>
            <span className="truncate">Revisão</span>
          </div>
          <div className={cn("flex items-center gap-2", step === "success" ? "text-emerald-600 font-bold" : "text-muted-foreground")}>
            <span className={cn("size-5 rounded-full flex items-center justify-center text-xs", step === "success" ? "bg-emerald-600 text-primary-foreground" : "bg-muted text-muted-foreground")}>4</span>
            <span className="truncate">Sucesso</span>
          </div>
        </div>

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
                <div className="space-y-2">
                  <Label htmlFor="lead-email">E-mail</Label>
                  <Input id="lead-email" type="email" autoComplete="email" value={leadEmail} onChange={(event) => setLeadEmail(event.target.value)} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-room">Acomodação / Quarto</Label>
                  <select
                    id="lead-room"
                    value={leadRoomPreference}
                    onChange={(event) => setLeadRoomPreference(event.target.value)}
                    className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="Quarto 1 - Duplo / Casal">Quarto 1 - Duplo / Casal</option>
                    <option value="Quarto 1 - Duplo Twin (2 Camas)">Quarto 1 - Duplo Twin (2 Camas)</option>
                    <option value="Quarto 1 - Triplo / Família">Quarto 1 - Triplo / Família</option>
                    <option value="Quarto 2 - Duplo / Casal">Quarto 2 - Duplo / Casal</option>
                    <option value="Quarto 2 - Individual (Single)">Quarto 2 - Individual (Single)</option>
                    <option value="Quarto Individual (Single)">Quarto Individual (Single)</option>
                  </select>
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
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`passenger-${index}-room`}>Distribuição de Quarto</Label>
                    <select
                      id={`passenger-${index}-room`}
                      value={passenger.roomPreference || "Quarto 1 - Duplo / Casal"}
                      onChange={(event) => setAdditionalPassengers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, roomPreference: event.target.value } : item))}
                      className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="Quarto 1 - Duplo / Casal">Quarto 1 - Duplo / Casal</option>
                      <option value="Quarto 1 - Duplo Twin (2 Camas)">Quarto 1 - Duplo Twin (2 Camas)</option>
                      <option value="Quarto 1 - Triplo / Família">Quarto 1 - Triplo / Família</option>
                      <option value="Quarto 2 - Duplo / Casal">Quarto 2 - Duplo / Casal</option>
                      <option value="Quarto 2 - Individual (Single)">Quarto 2 - Individual (Single)</option>
                    </select>
                  </div>
                </div>
              </section>
            ))}

            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdditionalPassengers((curr) => [...curr, { name: "", document: "", birthDate: "", roomPreference: "Quarto 1 - Duplo / Casal" }])}
                className="h-11 min-h-11 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-ring"
              >
                + Adicionar Acompanhante / Passageiro
              </Button>
              {additionalPassengers.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAdditionalPassengers((curr) => curr.slice(0, -1))}
                  className="h-11 min-h-11 text-xs text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Remover Último
                </Button>
              )}
            </div>

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
                Selecione como prefere efetuar o acerto da sua viagem. A agência confirmará condições e emitirá o contrato correspondente.
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
                <span className="mt-2 block text-sm text-muted-foreground">Chave Pix da agência e comprovante via sistema.</span>
              </button>
              <button
                type="button"
                aria-pressed={paymentPreference === "cartao_operadora"}
                onClick={() => setPaymentPreference("cartao_operadora")}
                className={`min-h-11 rounded-lg border p-4 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${paymentPreference === "cartao_operadora" ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/40"}`}
              >
                <span className="flex items-center gap-2 text-sm font-medium"><CreditCard className="size-4 text-primary" /> Cartão de Crédito</span>
                <span className="mt-2 block text-sm text-muted-foreground">Parcelamento direto pela operadora ou maquininha.</span>
              </button>
              <button
                type="button"
                aria-pressed={paymentPreference === "financiamento_bancario"}
                onClick={() => setPaymentPreference("financiamento_bancario")}
                className={`min-h-11 rounded-lg border p-4 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${paymentPreference === "financiamento_bancario" ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/40"}`}
              >
                <span className="flex items-center gap-2 text-sm font-medium"><CreditCard className="size-4 text-primary" /> Financiamento Bancário</span>
                <span className="mt-2 block text-sm text-muted-foreground">Sujeito à análise e às condições do banco.</span>
              </button>
              <button
                type="button"
                aria-pressed={paymentPreference === "faturado_agencia"}
                onClick={() => setPaymentPreference("faturado_agencia")}
                className={`min-h-11 rounded-lg border p-4 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${paymentPreference === "faturado_agencia" ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/40"}`}
              >
                <span className="flex items-center gap-2 text-sm font-medium"><Wallet className="size-4 text-primary" /> Faturado pela Agência</span>
                <span className="mt-2 block text-sm text-muted-foreground">Boleto ou convênio corporativo sob aprovação prévia.</span>
              </button>

              {showGatewayOnline && (
                <button
                  type="button"
                  aria-pressed={paymentPreference === "gateway_online"}
                  onClick={() => setPaymentPreference("gateway_online")}
                  className={`min-h-11 rounded-lg border p-4 text-left sm:col-span-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${paymentPreference === "gateway_online" ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-primary/40 bg-primary/5 hover:bg-primary/10"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <CreditCard className="size-4 text-primary" /> Pagamento Online Seguro (Gateway Integrado)
                    </span>
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Recomendado</Badge>
                  </div>
                  <span className="mt-2 block text-xs text-muted-foreground">
                    Link de pagamento online seguro configurado pela agência com aprovação instantânea.
                  </span>
                </button>
              )}
            </div>

            {["cartao_operadora", "financiamento_bancario", "gateway_online"].includes(paymentPreference || "") && (() => {
              const { maxInstallments: effectiveMaxInstallments } = resolveMaxInstallmentsFromOptions(
                proposal.pricing?.installments_options,
                36,
              );
              return (
                <div className="max-w-xs space-y-2">
                  <Label htmlFor="payment-installments">
                    Parcelas desejadas (até {effectiveMaxInstallments}x)
                  </Label>
                  <Input
                    id="payment-installments"
                    type="number"
                    min={1}
                    max={effectiveMaxInstallments}
                    step={1}
                    value={paymentInstallments}
                    onChange={(event) =>
                      setPaymentInstallments(
                        Math.min(effectiveMaxInstallments, Math.max(1, Number(event.target.value) || 1)),
                      )
                    }
                    className="h-11"
                  />
                </div>
              );
            })()}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 border-t border-border/40 pt-4">
              <Button type="button" variant="outline" onClick={() => setStep("passengers")} className="h-11 min-h-11 gap-2 focus-visible:ring-2 focus-visible:ring-ring">
                <ArrowLeft className="size-4" /> Voltar
              </Button>
              <Button
                type="button"
                onClick={() => setStep("review")}
                disabled={!paymentPreference}
                className="h-11 min-h-11 gap-2 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>Revisar e Confirmar</span> <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-5 pt-2">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2">
              <p className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <ShieldCheck className="size-4 text-primary" /> Revisão do Manifesto e Condições
              </p>
              <p className="text-xs text-muted-foreground">
                Confira os dados dos viajantes e a modalidade de pagamento antes de registrar o aceite definitivo.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-4 rounded-lg border border-border/70 bg-card space-y-1">
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-xs">Passageiro Principal</span>
                <p className="text-sm font-bold text-foreground">{leadName}</p>
                <p className="text-muted-foreground">Doc: {leadDocument} {leadPhone ? `· ${leadPhone}` : ""}</p>
              </div>
              <div className="p-4 rounded-lg border border-border/70 bg-card space-y-1">
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-xs">Opção & Investimento</span>
                <p className="text-sm font-bold text-foreground">{selectedOption?.name || proposal.title}</p>
                <p className="font-semibold text-primary">{hasPrice ? formatMoney(configuredTotal) : "A confirmar"}</p>
              </div>
              <div className="p-4 rounded-lg border border-border/70 bg-card space-y-1 sm:col-span-2">
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-xs">Forma de Pagamento Escolhida</span>
                <p className="text-sm font-medium text-foreground">
                  {paymentPreference === "pix"
                    ? "Pix à Vista"
                    : paymentPreference === "cartao_operadora"
                      ? `Cartão de Crédito (${paymentInstallments}x)`
                      : paymentPreference === "financiamento_bancario"
                        ? `Financiamento Bancário (${paymentInstallments}x)`
                        : paymentPreference === "faturado_agencia"
                          ? "Faturado pela Agência"
                          : paymentPreference === "gateway_online"
                            ? "Pagamento Online via Gateway Integrado"
                            : "Não especificado"}
                </p>
                {additionalPassengers.length > 0 && (
                  <p className="text-muted-foreground pt-1 border-t border-border/40 mt-1">
                    +{additionalPassengers.length} acompanhante(s): {additionalPassengers.map((p) => p.name).filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            </div>

            {/* Aviso Legal de Simulação Orçamentária */}
            {proposal.web_page?.show_simulation_disclaimer !== false && (
              <div className="rounded-xl border border-warning/50 bg-warning/10 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="size-5 text-warning-strong shrink-0 mt-1" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground uppercase tracking-wider">Aviso Legal de Simulação Orçamentária</p>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line break-words">
                      {proposal.web_page?.simulation_disclaimer_text ||
                        "Esta proposta constitui uma cotação e simulação preliminar. Valores, disponibilidades e tarifas aéreas ou hoteleiras estão sujeitos a confirmação final pela agência e operadoras no ato da emissão formal."}
                    </p>
                  </div>
                </div>
                <label className="flex items-start gap-2 pt-2 border-t border-warning/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simulationAgreed}
                    onChange={(e) => setSimulationAgreed(e.target.checked)}
                    className="mt-1 rounded border-input size-4 text-primary focus:ring-primary"
                  />
                  <span className="text-xs text-foreground font-medium">
                    Declaro que li e compreendo que esta é uma simulação sujeita à confirmação de disponibilidade da agência.
                  </span>
                </label>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 border-t border-border/40 pt-4">
              <Button type="button" variant="outline" onClick={() => setStep("preference")} className="h-11 min-h-11 gap-2 focus-visible:ring-2 focus-visible:ring-ring">
                <ArrowLeft className="size-4" /> Voltar
              </Button>
              <Button
                type="button"
                onClick={handleSubmitAcceptance}
                disabled={
                  isSubmitting ||
                  proposal.status !== "sent" ||
                  !proposal.snapshot_hash ||
                  (proposal.web_page?.show_simulation_disclaimer !== false && !simulationAgreed)
                }
                className="h-11 min-h-11 gap-2 focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground font-bold"
              >
                {isSubmitting ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <ShieldCheck className="size-4" />}
                {isSubmitting ? "Registrando Aceite..." : "Confirmar e Registrar Aceite"}
              </Button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="py-12 text-center space-y-3" role="status" aria-live="polite">
            <Loader2 className="size-8 animate-spin motion-reduce:animate-none mx-auto text-primary" />
            <p className="text-sm font-medium">Registrando o aceite</p>
            <p className="text-sm text-muted-foreground">Validando integridade da proposta e gerando protocolo...</p>
          </div>
        )}

        {step === "success" && (
          <div className="py-8 text-center space-y-5" role="status" aria-live="polite">
            <CheckCircle2 className="size-10 mx-auto text-emerald-600" />
            <div className="space-y-2">
              <Badge variant="outline" className="text-xs font-mono font-bold border-emerald-500/40 text-emerald-700 bg-emerald-500/10 px-3 py-1">
                Protocolo: #{acceptanceProtocol || (proposal.public_token || "").slice(0, 8).toUpperCase()}
              </Badge>
              <h3 className="text-lg font-bold text-foreground">Aceite Registrado com Sucesso!</h3>
              <p className="mx-auto max-w-prose text-xs sm:text-sm text-muted-foreground leading-relaxed">
                A agência recebeu seus dados e já iniciou o processo de bloqueio e confirmação com os fornecedores parceiros.
              </p>
            </div>

            {paymentPreference === "gateway_online" && gatewayUrl && (
              <div className="p-4 rounded-xl border border-primary/40 bg-primary/5 space-y-3 max-w-md mx-auto text-left">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <CreditCard className="size-4 text-primary" /> Pagamento Online Liberado
                </div>
                <p className="text-xs text-muted-foreground">
                  A agência disponibilizou o gateway direto para finalização do pagamento com segurança:
                </p>
                <Button asChild className="w-full h-11 min-h-11 rounded-xl font-bold gap-2 bg-primary text-primary-foreground">
                  <a href={gatewayUrl} target="_blank" rel="noopener noreferrer">
                    <span>Efetuar Pagamento Online</span>
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {formattedAgencyPhone && (
                <Button asChild variant="outline" className="h-11 min-h-11 rounded-xl gap-2 border-emerald-500/40 text-emerald-700">
                  <a
                    href={`https://wa.me/${formattedAgencyPhone}?text=${encodeURIComponent(`Olá! Acabei de registrar o aceite da proposta ${proposal.title} (Protocolo #${acceptanceProtocol || (proposal.public_token || "").slice(0, 8).toUpperCase()}).`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="size-4 text-emerald-600" />
                    <span>Avisar Agência no WhatsApp</span>
                  </a>
                </Button>
              )}
              <Button type="button" onClick={onClose} className="h-11 min-h-11 px-6 rounded-xl font-semibold focus-visible:ring-2 focus-visible:ring-ring">
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
