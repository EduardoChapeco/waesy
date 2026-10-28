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
import { ChevronRight, CreditCard, Sparkles, Plus } from "lucide-react";
import { formatCents, cn } from "@/lib/utils";

export interface CreditCardHomeWidgetProps {
  hasCard?: boolean;
  usedLimitCents?: number;
  totalLimitCents?: number;
  dueDateText?: string;
  onClick?: () => void;
  onRequestCard?: () => void;
  isLoadingCard?: boolean;
  className?: string;
}

export function CreditCardHomeWidget({
  hasCard = false,
  usedLimitCents = 0,
  totalLimitCents = 500000,
  dueDateText = "15 do mês",
  onClick,
  onRequestCard,
  isLoadingCard = false,
  className,
}: CreditCardHomeWidgetProps) {
  const availableLimitCents = Math.max(0, totalLimitCents - usedLimitCents);
  const usedPercentage = totalLimitCents > 0
    ? Math.min(100, Math.max(usedLimitCents > 0 ? 2 : 0, (usedLimitCents / totalLimitCents) * 100))
    : 0;

  // Estado Honesto: Usuário ainda não solicitou ou ativou cartão
  if (!hasCard) {
    return (
      <div
        className={cn(
          "w-full rounded-3xl bg-card border border-zinc-200/80 overflow-hidden shadow-xs select-none transition-colors",
          className
        )}
      >
        <div className="bg-lime-400 px-4 py-2 flex items-center justify-between text-zinc-950 font-extrabold text-xs">
          <span className="flex items-center gap-1">
            <span>Cartão de crédito</span>
            <ChevronRight className="size-4" />
          </span>
          <span className="text-3xs uppercase tracking-wider bg-background/10 px-2 py-1 rounded-full font-black">
            Disponível
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="size-11 rounded-2xl bg-lime-500/10 border border-lime-500/20 text-lime-600 flex items-center justify-center shrink-0">
              <CreditCard className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground">
                Cartão Virtual Waesy
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Gere seu cartão virtual instantâneo com zero anuidade para compras seguras na internet.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRequestCard}
            disabled={isLoadingCard}
            className="w-full h-11 min-h-11 rounded-xl bg-lime-400 hover:bg-lime-500 active:bg-lime-600 text-zinc-950 font-extrabold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 disabled:opacity-50"
          >
            <Plus className="size-4" />
            <span>{isLoadingCard ? "Ativando Cartão..." : "Ativar Cartão Gratuito"}</span>
          </button>
        </div>
      </div>
    );
  }

  // Estado com Cartão Ativo: Exibe Fatura e Limite Reais
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
        "w-full rounded-3xl bg-card border border-zinc-200/80 overflow-hidden shadow-xs select-none transition-colors cursor-pointer hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500",
        className
      )}
    >
      {/* ── Top Banner Verde-Limão com "Cartão de crédito >" ── */}
      <div className="bg-lime-400 px-4 py-2 flex items-center justify-between text-zinc-950 font-extrabold text-xs">
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
            <div className="text-xl sm:text-2xl font-black text-foreground font-mono tracking-tight mt-1">
              {formatCents(usedLimitCents)}
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xs font-semibold text-muted-foreground block">
              Vencimento
            </span>
            <span className="text-xs font-bold text-foreground block mt-1">
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
            className="h-full bg-lime-400 rounded-full transition-colors duration-300"
            style={{ width: `${usedPercentage}%` }}
          />
        </div>

        {/* Legenda de Limite Utilizado e Total */}
        <div className="flex items-center justify-between text-2xs text-muted-foreground pt-1">
          <div className="flex items-center gap-2 font-medium">
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
