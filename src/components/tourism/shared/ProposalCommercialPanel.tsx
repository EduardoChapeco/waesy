import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Landmark,
  MessageCircle,
  QrCode,
  Receipt,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { computeRealCountdownState, type ResolvedCommercialOffer } from "@/lib/tourism/proposal-payment-calc";
import type { ProposalWebCountdownConfig } from "@/lib/tourism/proposal-normalization";
import { cn } from "@/lib/utils";

export type CommercialPaymentPreference =
  | "pix"
  | "cartao_operadora"
  | "financiamento_bancario"
  | "faturado_agencia";

export interface ProposalCommercialPanelProps {
  offer: ResolvedCommercialOffer;
  countdownConfig?: ProposalWebCountdownConfig | null;
  validUntil?: string | null;
  paxSummary: string;
  perPersonCents?: number;
  hotelsCount: number;
  flightsCount: number;
  transfersCount: number;
  toursCount: number;
  paymentTerms?: string | null;
  ctaLabel: string;
  ctaDisabled?: boolean;
  selectedPreference?: CommercialPaymentPreference | null;
  selectedInstallments?: number;
  onSelectPayment?: (preference: CommercialPaymentPreference, installments: number) => void;
  onAcceptClick?: (preference: CommercialPaymentPreference | null, installments: number) => void;
  onAskAdvisorClick?: () => void;
  whatsappHref?: string | null;
  isDarkTheme?: boolean;
  accentStyle?: React.CSSProperties;
}

export function ProposalCommercialPanel({
  offer,
  countdownConfig,
  validUntil,
  paxSummary,
  perPersonCents = 0,
  hotelsCount,
  flightsCount,
  transfersCount,
  toursCount,
  paymentTerms,
  ctaLabel,
  ctaDisabled = false,
  selectedPreference,
  selectedInstallments,
  onSelectPayment,
  onAcceptClick,
  onAskAdvisorClick,
  whatsappHref,
  isDarkTheme = false,
  accentStyle,
}: ProposalCommercialPanelProps) {
  const [simInstallments, setSimInstallments] = useState<number>(
    selectedInstallments || offer.maxInstallments || 10,
  );
  const [activePref, setActivePref] = useState<CommercialPaymentPreference | null>(
    selectedPreference ?? (offer.cardEnabled ? "cartao_operadora" : offer.pixEnabled ? "pix" : null),
  );
  const [liveCountdown, setLiveCountdown] = useState(offer.countdown);

  useEffect(() => {
    setLiveCountdown(offer.countdown);
    if (!countdownConfig?.enabled) return;
    const timer = setInterval(() => {
      setLiveCountdown(computeRealCountdownState(countdownConfig, validUntil, Date.now()));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdownConfig, validUntil, offer.countdown]);

  useEffect(() => {
    if (selectedInstallments && selectedInstallments >= 1) {
      setSimInstallments(selectedInstallments);
    } else if (simInstallments > offer.maxInstallments) {
      setSimInstallments(offer.maxInstallments);
    }
  }, [selectedInstallments, offer.maxInstallments]);

  const maxInst = Math.max(1, offer.maxInstallments);
  const boundedInst = Math.min(maxInst, Math.max(1, simInstallments));
  const activeInstallmentRow =
    offer.installmentTable.find((r) => r.count === boundedInst) ||
    offer.installmentTable[offer.installmentTable.length - 1];
  const simulatedInstallmentCents =
    activeInstallmentRow?.installmentCents ?? Math.round(offer.totalCents / boundedInst);

  const handleChoosePref = (pref: CommercialPaymentPreference, inst = boundedInst) => {
    setActivePref(pref);
    onSelectPayment?.(pref, inst);
  };

  return (
    <div
      style={accentStyle}
      className={cn(
        "rounded-2xl border p-5 space-y-4",
        isDarkTheme
          ? "bg-card text-card-foreground border-border"
          : "bg-background text-foreground border-border",
      )}
    >
      {/* 1. Cabecalho do bloco + Spots reais (se habilitado) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Investimento do Pacote
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs font-semibold">
            {paxSummary}
          </Badge>
          {offer.spotsRemaining !== null && offer.spotsRemaining > 0 && (
            <Badge variant="outline" className="text-xs font-bold border-warning text-warning-strong bg-warning/15 gap-1">
              <Users className="size-3.5 shrink-0" />
              <span>{offer.spotsLabel}</span>
            </Badge>
          )}
        </div>
      </div>

      {/* 2. Cronometro regressivo real (vinculado a valid_until / prazo customizado) */}
      {liveCountdown.isActive && (
        <div className="p-3 rounded-xl border border-warning/40 bg-warning/10 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-warning-strong flex items-center gap-2">
            <Clock className="size-4 shrink-0" />
            <span>{liveCountdown.label}</span>
          </span>
          <span className="text-xs font-mono font-bold tabular-nums text-foreground">
            {liveCountdown.days > 0 ? `${liveCountdown.days}d ` : ""}
            {String(liveCountdown.hours).padStart(2, "0")}h :{" "}
            {String(liveCountdown.minutes).padStart(2, "0")}m :{" "}
            {String(liveCountdown.seconds).padStart(2, "0")}s
          </span>
        </div>
      )}

      {/* 3. Preco principal & PIX destacado */}
      <div className="space-y-1">
        <p className="text-3xl font-bold font-mono tabular-nums tracking-tight text-foreground">
          {offer.totalCents > 0 ? formatMoney(offer.totalCents, "BRL") : "Sob consulta"}
        </p>
        {offer.pixEnabled && offer.pixDiscountPercent > 0 && offer.pixFinalCents > 0 && (
          <p className="text-xs font-bold text-success font-mono tabular-nums">
            {formatMoney(offer.pixFinalCents, "BRL")} no PIX ({offer.pixDiscountPercent}% de desconto)
          </p>
        )}
        {perPersonCents > 0 && (
          <p className="text-xs text-muted-foreground">
            Equivalente a {formatMoney(perPersonCents, "BRL")} por viajante
          </p>
        )}
      </div>

      {/* 4. Resumo de componentes */}
      <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-border">
        <div>
          <span className="text-muted-foreground block">Hospedagens</span>
          <span className="font-bold text-foreground">{hotelsCount} incluída(s)</span>
        </div>
        <div>
          <span className="text-muted-foreground block">Voos</span>
          <span className="font-bold text-foreground">
            {flightsCount > 0 ? `${flightsCount} trecho(s)` : "Terrestre / Próprio"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block">Traslados</span>
          <span className="font-bold text-foreground">{transfersCount} serviço(s)</span>
        </div>
        <div>
          <span className="text-muted-foreground block">Passeios</span>
          <span className="font-bold text-foreground">{toursCount} atividade(s)</span>
        </div>
      </div>

      {/* 5. Formas de pagamento configuradas pela agencia */}
      {(offer.pixEnabled || offer.cardEnabled || offer.boletoEnabled || offer.financingEnabled) && (
        <div className="space-y-2 pt-2 border-t border-border">
          <span className="text-xs font-semibold text-foreground block">Meios Aceitos</span>
          <div className="grid grid-cols-2 gap-2">
            {offer.pixEnabled && (
              <button
                type="button"
                aria-pressed={activePref === "pix"}
                onClick={() => handleChoosePref("pix", 1)}
                className={cn(
                  "p-3 min-h-11 rounded-xl border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activePref === "pix" ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted/60",
                )}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-success">
                  <QrCode className="size-3.5 shrink-0" />
                  <span>PIX</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {offer.pixDiscountPercent > 0
                    ? `${offer.pixDiscountPercent}% desc.`
                    : "À vista imediato"}
                </p>
              </button>
            )}

            {offer.cardEnabled && (
              <button
                type="button"
                aria-pressed={activePref === "cartao_operadora"}
                onClick={() => handleChoosePref("cartao_operadora", boundedInst)}
                className={cn(
                  "p-3 min-h-11 rounded-xl border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activePref === "cartao_operadora"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:bg-muted/60",
                )}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <CreditCard className="size-3.5 shrink-0 text-primary" />
                  <span>Cartão</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Até {maxInst}x {offer.interestFree ? "sem juros" : "no cartão"}
                </p>
              </button>
            )}

            {offer.boletoEnabled && (
              <button
                type="button"
                aria-pressed={activePref === "faturado_agencia"}
                onClick={() => handleChoosePref("faturado_agencia", 1)}
                className={cn(
                  "p-3 min-h-11 rounded-xl border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activePref === "faturado_agencia"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:bg-muted/60",
                )}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Receipt className="size-3.5 shrink-0 text-muted-foreground" />
                  <span>Boleto / Faturado</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {offer.boletoDueDays ? `Venc. ${offer.boletoDueDays}d` : "Sob análise"}
                </p>
              </button>
            )}

            {offer.financingEnabled && (
              <button
                type="button"
                aria-pressed={activePref === "financiamento_bancario"}
                onClick={() => handleChoosePref("financiamento_bancario", boundedInst)}
                className={cn(
                  "p-3 min-h-11 rounded-xl border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activePref === "financiamento_bancario"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:bg-muted/60",
                )}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Landmark className="size-3.5 shrink-0 text-primary" />
                  <span>Financiamento</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {offer.financingNotes || "Bancos parceiros"}
                </p>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 6. Simulador interativo de parcelas (paridade com classificados) */}
      {offer.showSimulator && maxInst > 1 && (
        <div className="pt-2 border-t border-border space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-foreground">Simular Parcelas</span>
            <span className="font-bold font-mono tabular-nums text-primary">
              {boundedInst}x de {formatMoney(simulatedInstallmentCents, "BRL")}{" "}
              {offer.interestFree && !activeInstallmentRow?.hasInterest ? "sem juros" : ""}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={maxInst}
            step={1}
            value={boundedInst}
            aria-label="Simulador de parcelas do pacote"
            onChange={(e) => {
              const nextInst = Math.min(maxInst, Math.max(1, Number(e.target.value) || 1));
              setSimInstallments(nextInst);
              const nextPref: CommercialPaymentPreference =
                activePref === "financiamento_bancario" ? "financiamento_bancario" : "cartao_operadora";
              setActivePref(nextPref);
              onSelectPayment?.(nextPref, nextInst);
            }}
            className="w-full h-2 rounded-full accent-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex justify-between text-xs text-muted-foreground font-mono">
            <span>1x (à vista)</span>
            <span>{maxInst}x</span>
          </div>
        </div>
      )}

      {paymentTerms && (
        <div className="p-3 rounded-lg bg-muted border border-border text-xs text-foreground leading-relaxed whitespace-pre-line break-words">
          {paymentTerms}
        </div>
      )}

      {/* 7. Selos de confianca marcados pela agencia */}
      {offer.trustBadges.length > 0 && (
        <ul className="space-y-2 pt-2 border-t border-border text-xs text-muted-foreground">
          {offer.trustBadges.map((tb) => (
            <li key={tb.id} className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-success shrink-0" />
              <span className="text-foreground font-medium">{tb.label}</span>
            </li>
          ))}
        </ul>
      )}

      {/* 8. Acoes principais */}
      <div className="space-y-2 pt-2">
        {onAcceptClick && (
          <Button
            type="button"
            disabled={ctaDisabled}
            onClick={() => onAcceptClick(activePref, boundedInst)}
            className="w-full h-11 min-h-11 rounded-xl text-sm font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ShieldCheck className="size-4" />
            <span>{ctaLabel}</span>
          </Button>
        )}

        {(onAskAdvisorClick || whatsappHref) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {onAskAdvisorClick && (
              <Button
                type="button"
                variant="outline"
                onClick={onAskAdvisorClick}
                className="h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Star className="size-4" />
                <span>Consultor IA</span>
              </Button>
            )}
            {whatsappHref && (
              <Button
                asChild
                variant="outline"
                className="h-11 min-h-11 rounded-xl text-xs font-bold gap-2 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-4" />
                  <span>WhatsApp</span>
                </a>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
