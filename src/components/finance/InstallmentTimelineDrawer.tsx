/**
 * ============================================================================
 * Waesy Platform — InstallmentTimelineDrawer.tsx (99Pay & Apple HIG Parity)
 * ============================================================================
 * Linha do tempo visual e gestão de parcelas de contratos de crédito/compras:
 * - Progresso visual das parcelas pagas, abertas e futuras (ex: 3 de 12 pagas).
 * - Lista cronológica com status (Paga, Aberta, Próxima a vencer).
 * - Ação de amortização antecipada com desconto ("Adiantar Parcelas").
 * Ref: images (16).jpg, sdfsdfsdf.jpg
 * ============================================================================
 */

import React, { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  ChevronRight,
  TrendingDown,
  Check,
  ShieldCheck,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCents, cn } from "@/lib/utils";
import { toast } from "sonner";

export interface InstallmentItem {
  number: number; // ex: 1, 2, 3
  dueDate: string; // ex: "15/10/2026"
  amountCents: number;
  status: "paid" | "due" | "future";
  paidDate?: string;
  discountCentsIfEarly?: number;
}

export interface InstallmentTimelineDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractTitle?: string;
  totalInstallments?: number;
  installments?: InstallmentItem[];
  onPayEarlyClick?: (selectedCount: number) => void;
  className?: string;
}

export function InstallmentTimelineDrawer({
  open,
  onOpenChange,
  contractTitle = "Contrato de Pagamento Parcelado",
  totalInstallments,
  installments = [],
  onPayEarlyClick,
  className,
}: InstallmentTimelineDrawerProps) {
  const effectiveTotal = totalInstallments || (installments.length > 0 ? installments.length : 1);
  const paidCount = installments.filter((i) => i.status === "paid").length;
  const progressPercent = installments.length > 0 ? Math.round((paidCount / effectiveTotal) * 100) : 0;
  const totalEarlyDiscountCents = installments
    .filter((i) => i.status === "future" && i.discountCentsIfEarly)
    .reduce((acc, curr) => acc + (curr.discountCentsIfEarly || 0), 0);

  const handleAdvance = () => {
    toast.success("Simulação de antecipação gerada com desconto nos juros!");
    onPayEarlyClick?.(installments.filter((i) => i.status === "future").length);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "w-full max-w-lg mx-auto rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 bg-card border-border/80 shadow-md max-h-dvh overflow-y-auto no-scrollbar",
          className
        )}
      >
        <SheetHeader className="pb-3 border-b border-border/40 text-left">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-base font-bold tracking-tight text-foreground">
                Cronograma de Parcelas
              </SheetTitle>
              <span className="text-2xs text-muted-foreground">{contractTitle}</span>
            </div>
            <Badge
              variant="outline"
              className="rounded-full px-3 py-1 text-xs font-semibold bg-primary/10 text-primary border-primary/20"
            >
              {paidCount} de {effectiveTotal} pagas
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-4 pt-3">
          {installments.length === 0 ? (
            <div className="py-12 text-center space-y-2 p-6 rounded-2xl bg-muted/20 border border-dashed border-border/60">
              <Calendar className="size-8 mx-auto text-muted-foreground/40" />
              <p className="text-xs font-bold text-foreground">Nenhuma parcela ativa encontrada</p>
              <p className="text-3xs text-muted-foreground">Você não possui contratos de pagamento parcelado em aberto no momento.</p>
            </div>
          ) : (
            <>
          {/* ── 1. Barra de Progresso de Amortização ── */}
          <div className="bg-card border border-border/60 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progresso do contrato</span>
              <span className="font-semibold text-foreground font-mono">{progressPercent}% quitado</span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-colors duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* ── 2. Card de Desconto por Antecipação ── */}
          {totalEarlyDiscountCents > 0 && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingDown className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <span className="text-2xs text-muted-foreground uppercase tracking-wider block">
                    Economia ao adiantar
                  </span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    até {formatCents(totalEarlyDiscountCents)} de desconto
                  </span>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAdvance}
                className="rounded-xl h-11 min-h-11 px-3 text-xs font-semibold gap-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <span>Adiantar</span>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}

          {/* ── 3. Lista Cronológica de Parcelas ── */}
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground block px-1">
              Parcelas ({installments.length})
            </span>

            <div className="space-y-2">
              {installments.map((inst) => (
                <div
                  key={inst.number}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-colors",
                    inst.status === "paid" && "bg-muted/20 border-border/30 opacity-80",
                    inst.status === "due" && "bg-card border-primary/40 shadow-xs ring-1 ring-primary/20",
                    inst.status === "future" && "bg-muted/30 border-border/40"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "size-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0",
                        inst.status === "paid" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                        inst.status === "due" && "bg-primary text-primary-foreground",
                        inst.status === "future" && "bg-muted text-muted-foreground"
                      )}
                    >
                      {inst.status === "paid" ? <Check className="size-4" /> : `${inst.number}ª`}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-semibold text-foreground">
                          Parcela {inst.number}/{totalInstallments}
                        </span>
                        {inst.status === "due" && (
                          <Badge
                            variant="outline"
                            className="rounded-full px-2 py-0 text-2xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          >
                            Vencendo
                          </Badge>
                        )}
                        {inst.status === "paid" && (
                          <span className="text-2xs text-emerald-600 font-medium">Pago</span>
                        )}
                      </div>
                      <span className="text-2xs text-muted-foreground block">
                        Vencimento: {inst.dueDate}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs sm:text-sm font-bold font-mono text-foreground">
                      {formatCents(inst.amountCents)}
                    </div>
                    {inst.discountCentsIfEarly && (
                      <span className="text-3xs text-emerald-600 font-medium block">
                        -{formatCents(inst.discountCentsIfEarly)} se adiantar
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
