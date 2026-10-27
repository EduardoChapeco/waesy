/**
 * ============================================================================
 * Waesy Platform — FinancialHeroCard.tsx (Waesy Bank & 99Pay Parity)
 * ============================================================================
 * Card principal de saldo da Carteira Digital Waesy Bank:
 * - Saldo total com alternância de privacidade (Eye / EyeOff) e persistência local.
 * - Pílula de rendimento automático (120% CDI ↑ / 1% de cashback).
 * - Três pílulas de ação rápida com piso tátil de 44px (Abastecer, Pagar, Transferir).
 * - Design Apple HIG / 99Pay com curvatura squircle contínua (rounded-2xl).
 * Ref: Prints Captura de tela 2026-10-16 155858.png, images (14).jpg, hero-tela-lat-esq.jpg
 * ============================================================================
 */

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Plus, ArrowUpRight, ArrowDownLeft, ChevronRight, TrendingUp } from "lucide-react";
import { formatCents, cn } from "@/lib/utils";

export interface FinancialHeroCardProps {
  balanceCents: number;
  yieldRateText?: string;
  cashbackText?: string;
  onDepositClick?: () => void;
  onPayClick?: () => void;
  onTransferClick?: () => void;
  onExtractClick?: () => void;
  className?: string;
}

const STORAGE_KEY_HIDE_BALANCE = "waesy_hide_balance";

export function FinancialHeroCard({
  balanceCents,
  yieldRateText = "120% CDI ↑",
  cashbackText = "1% de cashback",
  onDepositClick,
  onPayClick,
  onTransferClick,
  onExtractClick,
  className,
}: FinancialHeroCardProps) {
  const [hideBalance, setHideBalance] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem(STORAGE_KEY_HIDE_BALANCE) === "true";
      } catch {
        return false;
      }
    }
    return false;
  });

  const toggleHideBalance = () => {
    setHideBalance((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY_HIDE_BALANCE, String(next));
        } catch {
          // Fallback silencioso para ambientes com restrição de quota
        }
      }
      return next;
    });
  };

  return (
    <div
      className={cn(
        "w-full rounded-2xl bg-card border border-border/80 p-4 sm:p-5 shadow-xs relative overflow-hidden select-none transition-all",
        className
      )}
    >
      {/* ── Top Header: Rótulo Saldo + Toggle Olho + Link Extrato ── */}
      <div className="flex items-center justify-between gap-2 min-h-11">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Saldo Total
          </span>
          <button
            type="button"
            onClick={toggleHideBalance}
            aria-label={hideBalance ? "Exibir saldo" : "Ocultar saldo"}
            title={hideBalance ? "Exibir saldo" : "Ocultar saldo"}
            className="size-11 min-h-11 min-w-11 -my-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {hideBalance ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>

        {onExtractClick && (
          <button
            type="button"
            onClick={onExtractClick}
            className="h-11 min-h-11 px-2 -my-2 rounded-lg flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span>Ver extrato</span>
            <ChevronRight className="size-3.5" />
          </button>
        )}
      </div>

      {/* ── Valor do Saldo em Destaque (Anti-Truncate com escala proporcional) ── */}
      <div className="mt-1 mb-2">
        <div className="flex items-baseline gap-1">
          {hideBalance ? (
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground/80 font-mono">
              ••••••••
            </span>
          ) : (
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground break-words text-wrap">
              {formatCents(balanceCents)}
            </span>
          )}
        </div>

        {/* ── Pílula de Rendimento Automático 99Pay Style ── */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-2xs sm:text-xs font-bold leading-none">
            <TrendingUp className="size-3" />
            <span>{yieldRateText}</span>
          </div>
          {cashbackText && (
            <span className="text-2xs sm:text-xs text-muted-foreground font-medium">
              • {cashbackText}
            </span>
          )}
        </div>
      </div>

      {/* ── Pílulas de Ação Rápida (Piso Tátil 44px) ── */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/50">
        <button
          type="button"
          onClick={onDepositClick}
          aria-label="Abastecer ou carregar carteira"
          className="h-11 min-h-11 px-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Plus className="size-4 shrink-0" />
          <span className="truncate">Abastecer</span>
        </button>

        <button
          type="button"
          onClick={onPayClick}
          aria-label="Pagar conta ou boleto"
          className="h-11 min-h-11 px-2 rounded-xl bg-muted/60 hover:bg-muted/90 text-foreground border border-border/60 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowUpRight className="size-4 shrink-0" />
          <span className="truncate">Pagar</span>
        </button>

        <button
          type="button"
          onClick={onTransferClick}
          aria-label="Transferir dinheiro via Pix"
          className="h-11 min-h-11 px-2 rounded-xl bg-muted/60 hover:bg-muted/90 text-foreground border border-border/60 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowDownLeft className="size-4 shrink-0" />
          <span className="truncate">Transferir</span>
        </button>
      </div>
    </div>
  );
}
