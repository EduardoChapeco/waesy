/**
 * ============================================================================
 * Waesy Platform — PaymentSuccessReceipt.tsx (Copycat Minimalist Success Screen)
 * ============================================================================
 * Tela de confirmação e sucesso de transferência/depósito/Pix (Conforme tela 2 do design anexo):
 * - Botão superior fechar (X) no canto esquerdo com alvo de toque de 44px.
 * - Círculo verde-limão com aura suave e checkmark nítido.
 * - Título em destaque: "Pix enviado com sucesso!" (ou customizável para depósito/transferência).
 * - Subtítulo explicativo: "Sua transferência foi concluída e o valor já está disponível."
 * - Valor em destaque gigante com tipografia de alta legibilidade.
 * - Identificação do destinatário/pagador e cartão de metadados (Instituição, Quando, ID).
 * - Botões de ação inferiores idênticos:
 *   - "Ver comprovante" (Verde-limão primário h-12)
 *   - "Compartilhar" (Neutro secundário h-12)
 * ============================================================================
 */

import React from "react";
import { Check, Share2, FileText, X } from "lucide-react";
import { formatCents, cn } from "@/lib/utils";

export interface PaymentSuccessReceiptProps {
  amountCents: number;
  recipientName: string;
  recipientInstitution?: string;
  transactionId?: string;
  dateText?: string;
  title?: string;
  subtitle?: string;
  onViewReceipt?: () => void;
  onShareReceipt?: () => void;
  onDone?: () => void;
  className?: string;
}

export function PaymentSuccessReceipt({
  amountCents,
  recipientName,
  recipientInstitution = "PICPAY",
  transactionId = "TX-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
  dateText = "Agora",
  title = "Pix enviado com sucesso!",
  subtitle = "Sua transferência foi concluída e o valor já está disponível.",
  onViewReceipt,
  onShareReceipt,
  onDone,
  className,
}: PaymentSuccessReceiptProps) {
  return (
    <div
      className={cn(
        "w-full max-w-md mx-auto p-4 sm:p-6 flex flex-col items-center justify-between text-center select-none bg-background min-h-[520px]",
        className
      )}
    >
      {/* ── Top Bar: Botão Fechar (X) no topo esquerdo conforme tela 2 anexa ── */}
      <div className="w-full flex items-center justify-start">
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            aria-label="Fechar tela de sucesso"
            className="size-11 min-h-11 min-w-11 rounded-full bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-800 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {/* ── Círculo Verde-Limão com Halo Suave & Checkmark ── */}
      <div className="my-4 flex flex-col items-center w-full">
        <div className="size-28 rounded-full bg-lime-400/25 flex items-center justify-center shrink-0">
          <div className="size-20 rounded-full bg-lime-400 text-zinc-950 flex items-center justify-center shadow-xs">
            <Check className="size-10 stroke-[3]" />
          </div>
        </div>

        {/* Título & Subtítulo */}
        <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight mt-5">
          {title}
        </h2>
        <p className="text-xs text-muted-foreground mt-1.5 max-w-xs mx-auto leading-relaxed">
          {subtitle}
        </p>

        {/* Valor Gigante em Destaque */}
        <div className="text-3xl sm:text-4xl font-black text-foreground font-mono tracking-tight mt-4">
          {formatCents(amountCents)}
        </div>

        {/* Nome do Destinatário */}
        <p className="text-xs font-semibold text-foreground/80 mt-1.5">
          Para {recipientName}
        </p>
      </div>

      {/* ── Cartão de Metadados da Transação ── */}
      <div className="w-full rounded-2xl bg-zinc-50 border border-zinc-200/60 p-4 space-y-2.5 text-xs text-left shadow-2xs my-4">
        <div className="flex items-center justify-between py-1 border-b border-border/40">
          <span className="text-muted-foreground font-medium">Instituição</span>
          <span className="font-bold text-foreground truncate max-w-[200px]">
            {recipientInstitution}
          </span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-border/40">
          <span className="text-muted-foreground font-medium">Quando</span>
          <span className="font-semibold text-foreground">{dateText}</span>
        </div>

        <div className="flex items-center justify-between py-1">
          <span className="text-muted-foreground font-medium">ID da Transação</span>
          <span className="font-mono text-2xs text-foreground/80 truncate max-w-[180px]">
            {transactionId}
          </span>
        </div>
      </div>

      {/* ── Botões de Ação Inferiores (Ver comprovante & Compartilhar) ── */}
      <div className="w-full space-y-2.5 pt-2">
        <button
          type="button"
          onClick={onViewReceipt || onDone}
          className="w-full h-12 min-h-12 rounded-xl bg-lime-400 hover:bg-lime-500 active:bg-lime-600 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
        >
          <FileText className="size-4" />
          <span>Ver comprovante</span>
        </button>

        <button
          type="button"
          onClick={
            onShareReceipt ||
            (() => {
              if (typeof navigator !== "undefined" && navigator.share) {
                navigator.share({
                  title: "Comprovante Pix Waesy",
                  text: `Pix de ${formatCents(amountCents)} para ${recipientName} realizado com sucesso. ID: ${transactionId}`,
                });
              }
            })
          }
          className="w-full h-12 min-h-12 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-800 font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
        >
          <Share2 className="size-4" />
          <span>Compartilhar</span>
        </button>
      </div>
    </div>
  );
}
