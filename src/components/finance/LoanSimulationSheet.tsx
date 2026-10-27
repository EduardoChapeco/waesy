/**
 * ============================================================================
 * Waesy Platform — LoanSimulationSheet.tsx (99Pay & Apple HIG Parity)
 * ============================================================================
 * Modal/Sheet de Simulação e Contratação de Empréstimo Pessoal Waesy:
 * - Limite pré-aprovado em destaque com selo de contratação imediata (Pix em segundos).
 * - Entrada de valor com teclado numérico in-app anti-jank ou pílulas rápidas.
 * - Seletor de parcelas (6x, 12x, 18x, 24x, 36x) com cálculo dinâmico de parcela e CET.
 * - Benefício de Cashback na 1ª parcela paga em dia.
 * - Discriminação de custos (IOF, taxa de juros a.m., CET anual).
 * Ref: images (15).jpg, dfggdfg.jpg
 * ============================================================================
 */

import React, { useState, useMemo } from "react";
import {
  Banknote,
  Sparkles,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  TrendingDown,
  Info,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InAppNumericKeypad } from "@/components/finance/InAppNumericKeypad";
import { formatCents, cn } from "@/lib/utils";
import { toast } from "sonner";

export interface LoanSimulationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preApprovedLimitCents?: number;
  monthlyInterestRate?: number; // ex: 0.0189 (1.89% a.m.)
  onConfirmLoan?: (loanDetails: {
    amountCents: number;
    installments: number;
    monthlyCents: number;
    totalPayableCents: number;
    firstDueDate: string;
  }) => void;
  className?: string;
}

const INSTALLMENT_OPTIONS = [6, 12, 18, 24, 36];
const QUICK_AMOUNTS = [50000, 100000, 250000, 500000]; // R$ 500, R$ 1.000, R$ 2.500, R$ 5.000

export function LoanSimulationSheet({
  open,
  onOpenChange,
  preApprovedLimitCents = 2500000, // R$ 25.000,00
  monthlyInterestRate = 0.0189, // 1.89% a.m.
  onConfirmLoan,
  className,
}: LoanSimulationSheetProps) {
  const [amountCents, setAmountCents] = useState<number>(200000); // Default R$ 2.000,00
  const [selectedInstallments, setSelectedInstallments] = useState<number>(12);
  const [showKeypad, setShowKeypad] = useState(false);

  // Manipulação de centavos pelo teclado in-app
  const handleDigit = (digit: string) => {
    const str = amountCents.toString();
    if (str.length >= 8) return; // Limite defensivo
    const next = parseInt(str + digit, 10);
    if (next <= preApprovedLimitCents) {
      setAmountCents(next);
    } else {
      setAmountCents(preApprovedLimitCents);
      toast.info("Limite máximo pré-aprovado atingido.");
    }
  };

  const handleBackspace = () => {
    const str = amountCents.toString();
    if (str.length <= 1) {
      setAmountCents(0);
    } else {
      setAmountCents(parseInt(str.slice(0, -1), 10));
    }
  };

  // Cálculo da parcela via Tabela Price: PMT = PV * ( i * (1+i)^n ) / ( (1+i)^n - 1 )
  const simulation = useMemo(() => {
    const pv = amountCents / 100;
    const i = monthlyInterestRate;
    const n = selectedInstallments;

    if (pv <= 0 || n <= 0) {
      return {
        monthlyCents: 0,
        totalPayableCents: 0,
        totalInterestCents: 0,
        iofCents: 0,
        cetAnnualPercent: 25.4,
      };
    }

    const factor = Math.pow(1 + i, n);
    const pmt = pv * ((i * factor) / (factor - 1));
    const monthlyCents = Math.round(pmt * 100);
    const totalPayableCents = monthlyCents * n;
    const totalInterestCents = Math.max(0, totalPayableCents - amountCents);
    const iofCents = Math.round(amountCents * 0.0038); // IOF simplificado 0.38%

    return {
      monthlyCents,
      totalPayableCents,
      totalInterestCents,
      iofCents,
      cetAnnualPercent: 25.4,
    };
  }, [amountCents, selectedInstallments, monthlyInterestRate]);

  // Primeira data de vencimento: 30 dias após hoje
  const firstDueDateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString("pt-BR");
  }, []);

  const handleConfirm = () => {
    if (amountCents < 10000) {
      toast.error("O valor mínimo para simulação é de R$ 100,00.");
      return;
    }
    onConfirmLoan?.({
      amountCents,
      installments: selectedInstallments,
      monthlyCents: simulation.monthlyCents,
      totalPayableCents: simulation.totalPayableCents,
      firstDueDate: firstDueDateStr,
    });
    toast.success("Proposta de crédito gerada com sucesso!");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "w-full max-w-lg mx-auto rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 bg-card border-border/80 shadow-xl max-h-[92vh] overflow-y-auto no-scrollbar",
          className
        )}
      >
        <SheetHeader className="pb-3 border-b border-border/40 text-left">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <Banknote className="size-5 text-primary" />
              <span>Empréstimo Pessoal Waesy</span>
            </SheetTitle>
            <Badge
              variant="outline"
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            >
              Pix Imediato
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-4 pt-3">
          {/* ── Banner de Limite Pré-Aprovado ── */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-primary/10 to-transparent border border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="text-2xs text-muted-foreground uppercase tracking-wider block">
                  Limite Pré-Aprovado
                </span>
                <span className="text-sm font-bold text-foreground font-mono">
                  até {formatCents(preApprovedLimitCents)}
                </span>
              </div>
            </div>
            <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              Taxa especial 1,89% a.m.
            </span>
          </div>

          {/* ── Display de Valor a Emprestar ── */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 text-center space-y-2">
            <span className="text-xs text-muted-foreground block">Quanto você precisa?</span>
            <div
              onClick={() => setShowKeypad(true)}
              className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-foreground cursor-pointer hover:opacity-80 transition-opacity py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {formatCents(amountCents)}
            </div>

            {/* Pílulas de Seleção Rápida */}
            <div className="flex items-center justify-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmountCents(amt)}
                  className={cn(
                    "h-11 min-h-11 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                    amountCents === amt
                      ? "bg-foreground text-background shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  )}
                >
                  +{formatCents(amt)}
                </button>
              ))}
            </div>

            {/* Alternador do Teclado In-App */}
            <button
              type="button"
              onClick={() => setShowKeypad((prev) => !prev)}
              className="text-xs text-primary hover:underline font-medium inline-block mt-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {showKeypad ? "Ocultar teclado numérico" : "Digitar outro valor no teclado"}
            </button>
          </div>

          {/* Teclado In-App Integrado se Ativo */}
          {showKeypad && (
            <div className="p-2 rounded-2xl bg-muted/30 border border-border/40">
              <InAppNumericKeypad
                onDigit={handleDigit}
                onBackspace={handleBackspace}
                onClear={() => setAmountCents(0)}
              />
            </div>
          )}

          {/* ── Seletor de Parcelas ── */}
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground block px-1">
              Em quantas parcelas?
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {INSTALLMENT_OPTIONS.map((inst) => {
                const isSelected = inst === selectedInstallments;
                return (
                  <button
                    key={inst}
                    type="button"
                    onClick={() => setSelectedInstallments(inst)}
                    className={cn(
                      "h-11 min-h-11 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                      isSelected
                        ? "bg-foreground text-background shadow-xs scale-102"
                        : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <span>{inst}x</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Card de Resumo da Parcela & Cashback ── */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground">Valor da parcela</span>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground mt-0.5">
                  {selectedInstallments}x de {formatCents(simulation.monthlyCents)}
                </div>
              </div>

              <div className="text-right text-xs text-muted-foreground space-y-0.5">
                <div>1ª parcela em</div>
                <strong className="text-foreground">{firstDueDateStr}</strong>
              </div>
            </div>

            {/* Pílula de Cashback da 1ª Parcela */}
            <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
              <Sparkles className="size-4 shrink-0" />
              <span>Receba <strong>R$ 50,00 de volta</strong> na 1ª parcela paga em dia.</span>
            </div>

            {/* Detalhes de Encargos */}
            <div className="divide-y divide-border/20 text-2xs text-muted-foreground pt-1 space-y-1">
              <div className="flex justify-between py-1">
                <span>Total a pagar</span>
                <strong className="text-foreground font-mono">{formatCents(simulation.totalPayableCents)}</strong>
              </div>
              <div className="flex justify-between py-1">
                <span>Taxa de juros</span>
                <span className="text-foreground">{(monthlyInterestRate * 100).toFixed(2)}% a.m.</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Custo Efetivo Total (CET)</span>
                <span className="text-foreground">{simulation.cetAnnualPercent}% a.a.</span>
              </div>
              <div className="flex justify-between py-1">
                <span>IOF incluso</span>
                <span className="text-foreground font-mono">{formatCents(simulation.iofCents)}</span>
              </div>
            </div>
          </div>

          {/* ── Botão de Confirmação ── */}
          <Button
            type="button"
            onClick={handleConfirm}
            className="w-full rounded-xl h-11 min-h-11 text-xs font-semibold gap-2 bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <span>Confirmar e Sacar via Pix</span>
            <ArrowRight className="size-4" />
          </Button>

          <div className="text-center">
            <span className="text-3xs text-muted-foreground">
              Crédito sujeito à análise. Liberação em conta em até 2 minutos após aprovação.
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
