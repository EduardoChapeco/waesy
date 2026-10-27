/**
 * ============================================================================
 * Waesy Platform — PaymentReviewDrawer.tsx (Revisão Transacional 99Pay Parity)
 * ============================================================================
 * Drawer de revisão de pagamento e transferência Pix/P2P:
 * - Exibe dados completos do recebedor (nome, CPF/CNPJ mascarado, instituição).
 * - Valor em destaque com garantia de Tarifa Zero (0% de comissão abusiva).
 * - Slide/botão tátil de confirmação com prevenção de duplo clique.
 * Ref: Prints sdfdfdfsdf.jpg, Captura de tela 2026-10-16 155858.png
 * ============================================================================
 */

import React, { useState } from "react";
import { ShieldCheck, ArrowRight, User, Building2, CheckCircle2, AlertCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCents, cn } from "@/lib/utils";

export interface PaymentReviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientName: string;
  recipientDocumentMasked?: string;
  recipientInstitution?: string;
  amountCents: number;
  availableBalanceCents: number;
  onConfirm: () => Promise<void>;
  isProcessing?: boolean;
}

export function PaymentReviewDrawer({
  open,
  onOpenChange,
  recipientName,
  recipientDocumentMasked = "***.***.***-**",
  recipientInstitution = "Waesy Pagamentos IP S.A.",
  amountCents,
  availableBalanceCents,
  onConfirm,
  isProcessing = false,
}: PaymentReviewDrawerProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const isLoading = isProcessing || internalLoading;

  const hasSufficientBalance = availableBalanceCents >= amountCents;

  const handleConfirm = async () => {
    if (isLoading || !hasSufficientBalance) return;
    setInternalLoading(true);
    try {
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(val) => !isLoading && onOpenChange(val)}>
      <SheetContent
        side="bottom"
        className="h-auto max-h-[90dvh] p-0 flex flex-col rounded-t-3xl border-t border-border bg-background z-50 overflow-hidden"
      >
        {/* Apple HIG Grab Handle */}
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto my-3 shrink-0" />

        {/* Top Header */}
        <SheetHeader className="px-4 pb-3 border-b border-border/40 text-left">
          <SheetTitle className="text-base font-bold text-foreground tracking-tight">
            Revisar Transferência
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            Confira os dados antes de finalizar o pagamento
          </p>
        </SheetHeader>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto no-scrollbar pb-8 pb-safe">
          {/* Valor Principal */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 text-center space-y-1 shadow-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Valor a Transferir
            </span>
            <div className="text-3xl font-black text-foreground font-mono">
              {formatCents(amountCents)}
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-2xs font-bold">
              <ShieldCheck className="size-3" />
              <span>Tarifa Zero (R$ 0,00)</span>
            </div>
          </div>

          {/* Dados do Destinatário */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-3 shadow-xs text-xs">
            <span className="font-bold uppercase tracking-wider text-muted-foreground block text-2xs">
              Para quem você vai transferir
            </span>

            <div className="flex items-start gap-3">
              <div className="size-9 rounded-xl bg-muted flex items-center justify-center text-foreground shrink-0 mt-0.5">
                <User className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-sm text-foreground block truncate">
                  {recipientName}
                </span>
                <span className="text-muted-foreground font-mono block">
                  CPF/CNPJ: {recipientDocumentMasked}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-border/40">
              <div className="size-9 rounded-xl bg-muted flex items-center justify-center text-foreground shrink-0">
                <Building2 className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-muted-foreground block text-2xs uppercase font-semibold">
                  Instituição
                </span>
                <span className="font-semibold text-foreground block truncate">
                  {recipientInstitution}
                </span>
              </div>
            </div>
          </div>

          {/* Origem do Pagamento */}
          <div className="rounded-2xl border border-border/70 bg-muted/30 p-3.5 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-muted-foreground text-2xs font-semibold block uppercase">
                Forma de Pagamento
              </span>
              <span className="font-bold text-foreground block">
                Saldo da Carteira Digital
              </span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground text-2xs block">Saldo disponível</span>
              <span className="font-mono font-bold text-foreground">
                {formatCents(availableBalanceCents)}
              </span>
            </div>
          </div>

          {/* Alerta de Saldo Insuficiente */}
          {!hasSufficientBalance && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 flex items-center gap-2 text-destructive text-xs">
              <AlertCircle className="size-4 shrink-0" />
              <span>Saldo insuficiente na carteira para realizar esta transferência.</span>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="space-y-2 pt-2">
            <Button
              type="button"
              disabled={isLoading || !hasSufficientBalance}
              onClick={handleConfirm}
              className="w-full h-12 min-h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-xs flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Processando pagamento...</span>
              ) : (
                <>
                  <span>Confirmar e Transferir</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              disabled={isLoading}
              onClick={() => onOpenChange(false)}
              className="w-full h-11 min-h-11 rounded-xl text-muted-foreground hover:text-foreground font-semibold text-xs"
            >
              Voltar e Editar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
