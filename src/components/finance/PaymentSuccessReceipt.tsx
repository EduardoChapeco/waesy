/**
 * ============================================================================
 * Waesy Platform — PaymentSuccessReceipt.tsx (Tela de Sucesso 99Pay Parity)
 * ============================================================================
 * Tela de confirmação e sucesso de transferência com animação spring suave:
 * - Círculo com checkmark verde em mola suave (framer-motion).
 * - Valor em destaque gigante e dados do recebedor (nome, banco, data/hora).
 * - Botão primário "Ver comprovante" e secundário "Compartilhar".
 * Ref: Prints Captura de tela 2026-10-16 155905.png (Tela 2), Screenshot_2026-10-26-08-34-12-868
 * ============================================================================
 */

import React from "react";
import { motion } from "framer-motion";
import { Check, Share2, FileText, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCents, cn } from "@/lib/utils";

export interface PaymentSuccessReceiptProps {
  amountCents: number;
  recipientName: string;
  recipientInstitution?: string;
  transactionId?: string;
  dateText?: string;
  onViewReceipt?: () => void;
  onShareReceipt?: () => void;
  onDone?: () => void;
  className?: string;
}

export function PaymentSuccessReceipt({
  amountCents,
  recipientName,
  recipientInstitution = "Waesy Pagamentos IP S.A.",
  transactionId = "WAESY-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
  dateText = "Agora",
  onViewReceipt,
  onShareReceipt,
  onDone,
  className,
}: PaymentSuccessReceiptProps) {
  return (
    <div
      className={cn(
        "w-full max-w-md mx-auto p-4 sm:p-6 flex flex-col items-center justify-between text-center select-none animate-in fade-in duration-300 min-h-[500px]",
        className
      )}
    >
      {/* Top Close (X) */}
      <div className="w-full flex justify-end">
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            aria-label="Fechar comprovante"
            className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {/* Círculo Animado com Checkmark Verde Suave */}
      <div className="my-6 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="size-24 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm relative"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 20 }}
            className="size-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md"
          >
            <Check className="size-9 stroke-[3]" />
          </motion.div>
        </motion.div>

        <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight mt-5">
          Pix enviado com sucesso!
        </h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Sua transferência foi concluída e o valor já está disponível para o recebedor.
        </p>

        {/* Valor Gigante */}
        <div className="text-3xl sm:text-4xl font-black text-foreground font-mono mt-4">
          {formatCents(amountCents)}
        </div>
        <p className="text-xs font-semibold text-foreground/80 mt-1">
          Para {recipientName}
        </p>
      </div>

      {/* Cartão de Metadados da Transação */}
      <div className="w-full rounded-2xl border border-border/70 bg-card p-4 space-y-2 text-xs text-left shadow-xs my-4">
        <div className="flex items-center justify-between py-1 border-b border-border/30">
          <span className="text-muted-foreground">Instituição</span>
          <span className="font-semibold text-foreground truncate max-w-[180px]">
            {recipientInstitution}
          </span>
        </div>
        <div className="flex items-center justify-between py-1 border-b border-border/30">
          <span className="text-muted-foreground">Quando</span>
          <span className="font-semibold text-foreground">{dateText}</span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-muted-foreground">ID da Transação</span>
          <span className="font-mono text-2xs text-foreground/80 truncate max-w-[180px]">
            {transactionId}
          </span>
        </div>
      </div>

      {/* Botões de Ação Inferiores */}
      <div className="w-full space-y-2 pt-2">
        {onViewReceipt && (
          <Button
            type="button"
            onClick={onViewReceipt}
            className="w-full h-12 min-h-12 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <FileText className="size-4" />
            <span>Ver Comprovante Detalhado</span>
          </Button>
        )}

        {onShareReceipt && (
          <Button
            type="button"
            variant="outline"
            onClick={onShareReceipt}
            className="w-full h-11 min-h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border-border/70 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Share2 className="size-4" />
            <span>Compartilhar Comprovante</span>
          </Button>
        )}

        {onDone && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDone}
            className="w-full h-11 min-h-11 rounded-xl text-muted-foreground hover:text-foreground font-semibold text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Concluído
          </Button>
        )}
      </div>
    </div>
  );
}
