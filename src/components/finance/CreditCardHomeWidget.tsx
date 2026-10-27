/**
 * ============================================================================
 * Waesy Platform — CreditCardHomeWidget.tsx (Copycat Minimalist Credit Card Card)
 * ============================================================================
 * Widget canônico do Cartão de Crédito na Home Financeira (Conforme imagem 2 do design anexo):
 * - Metáfora de correspondência com o mundo real do cartão físico.
 * - Aba superior curva verde-limão vibrante: "Cartão de crédito >".
 * - Fatura atual em tipografia marcante com data de vencimento.
 * - Limite disponível destacado em verde com barra de progresso proporcional.
 * - Indicador de limite utilizado e limite total.
 * - Altura canônica de toque e foco acessível (:focus-visible).
 * ============================================================================
 */

import React from "react";
import { ChevronRight } from "lucide-react";
import { formatCents, cn } from "@/lib/utils";

export interface CreditCardHomeWidgetProps {
  usedLimitCents?: number;
  totalLimitCents?: number;
  dueDateText?: string;
  onClick?: () => void;
  className?: string;
}

export function CreditCardHomeWidget({
  usedLimitCents = 245800, // R$ 2.458,00
  totalLimitCents = 1000000, // R$ 10.000,00
  dueDateText = "15 out",
  onClick,
  className,
}: CreditCardHomeWidgetProps) {
  const availableLimitCents = Math.max(0, totalLimitCents - usedLimitCents);
  const usedPercentage = Math.min(100, Math.max(2, (usedLimitCents / totalLimitCents) * 100));

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "w-full rounded-3xl bg-card border border-zinc-200/80 overflow-hidden shadow-xs select-none transition-all cursor-pointer hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500",
        className
      )}
    >
      {/* ── Top Banner Verde-Limão com "Cartão de crédito >" ── */}
      <div className="bg-lime-400 px-4 py-2.5 flex items-center justify-between text-zinc-950 font-extrabold text-xs">
        <span className="flex items-center gap-1">
          <span>Cartão de crédito</span>
          <ChevronRight className="size-4" />
        </span>
      </div>

      {/* ── Corpo do Card ── */}
      <div className="p-4 sm:p-5 space-y-3">
        {/* Fatura Atual & Vencimento */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground block">
              Fatura atual
            </span>
            <div className="text-xl sm:text-2xl font-black text-foreground font-mono tracking-tight mt-0.5">
              {formatCents(usedLimitCents)}
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xs font-semibold text-muted-foreground block">
              Vencimento
            </span>
            <span className="text-xs font-bold text-foreground block mt-0.5">
              {dueDateText}
            </span>
          </div>
        </div>

        {/* Limite Disponível */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-bold text-muted-foreground">
            Limite disponível
          </span>
          <span className="text-xs sm:text-sm font-black text-lime-600 font-mono">
            {formatCents(availableLimitCents)}
          </span>
        </div>

        {/* Barra de Progresso Verde-Limão */}
        <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-lime-400 rounded-full transition-all duration-300"
            style={{ width: `${usedPercentage}%` }}
          />
        </div>

        {/* Legenda de Limite Utilizado e Total */}
        <div className="flex items-center justify-between text-2xs text-muted-foreground pt-0.5">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="size-2 rounded-full bg-lime-500 shrink-0" />
            <span>Utilizado</span>
          </div>
          <span className="font-medium font-mono">
            Limite total: {formatCents(totalLimitCents)}
          </span>
        </div>
      </div>
    </div>
  );
}
