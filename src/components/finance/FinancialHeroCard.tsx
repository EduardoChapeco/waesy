/**
 * ============================================================================
 * Waesy Platform — FinancialHeroCard.tsx (Copycat Minimalist Bank Parity)
 * ============================================================================
 * Card principal de saldo da Carteira Digital Waesy Bank:
 * - Header superior verde-limão vibrante conforme design anexo (App Nevo/Waesy).
 * - Perfil com avatar, saudação "Bem-Vindo, Nome" e cluster de utilidades (Notificações, Busca, Suporte).
 * - Saldo total com alternância de privacidade (Eye / EyeOff) e persistência local.
 * - Pílula de rendimento automático (120% CDI ↑ / 1% de cashback).
 * - Link rápido "Ver extrato >" alinhado à direita.
 * - Três pílulas táteis de ação rápida com piso mínimo de 44px (Abastecer, Pagar, Transferir).
 * - Conformidade estrita: WCAG AA, DL-01 (sem hex fora de tokens), DL-14 (>=44px), DL-15 (:focus-visible).
 * ============================================================================
 */

import React, { useState } from "react";
import {
  Eye,
  EyeOff,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  TrendingUp,
  Bell,
  Search,
  Headphones,
  User,
} from "lucide-react";
import { formatCents, cn } from "@/lib/utils";

export interface FinancialHeroCardProps {
  balanceCents: number;
  yieldRateText?: string;
  cashbackText?: string;
  userName?: string;
  userAvatarUrl?: string;
  onDepositClick?: () => void;
  onPayClick?: () => void;
  onTransferClick?: () => void;
  onExtractClick?: () => void;
  onSearchClick?: () => void;
  onNotificationClick?: () => void;
  onSupportClick?: () => void;
  className?: string;
}

const STORAGE_KEY_HIDE_BALANCE = "waesy_hide_balance";

export function FinancialHeroCard({
  balanceCents,
  yieldRateText = "120% CDI ↑",
  cashbackText = "1% de cashback",
  userName = "João Pedro",
  userAvatarUrl,
  onDepositClick,
  onPayClick,
  onTransferClick,
  onExtractClick,
  onSearchClick,
  onNotificationClick,
  onSupportClick,
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
          // Fallback silencioso
        }
      }
      return next;
    });
  };

  return (
    <div
      className={cn(
        "w-full rounded-3xl bg-lime-400 text-zinc-950 p-4 sm:p-6 shadow-sm relative overflow-hidden select-none transition-all",
        className
      )}
    >
      {/* ── Top Bar: Perfil do Usuário + Cluster de Utilidades (Sino, Busca, Suporte) ── */}
      <div className="flex items-center justify-between gap-3 min-h-11">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-11 min-h-11 min-w-11 rounded-full ring-2 ring-black/10 overflow-hidden bg-zinc-900 text-zinc-100 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
            {userAvatarUrl ? (
              <img
                src={userAvatarUrl}
                alt={userName}
                className="size-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <User className="size-5 text-lime-400" />
            )}
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-zinc-800 leading-tight block truncate">
              Bem-Vindo,
            </span>
            <span className="text-sm font-extrabold text-zinc-950 leading-tight block truncate">
              {userName}
            </span>
          </div>
        </div>

        {/* Cluster de Utilidades (Sino com badge, Busca, Suporte) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onNotificationClick}
            aria-label="Notificações do banco"
            title="Notificações"
            className="size-11 min-h-11 min-w-11 rounded-full bg-black/10 hover:bg-black/15 active:bg-black/20 text-zinc-950 flex items-center justify-center relative cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
          >
            <Bell className="size-4" />
            <span className="size-2 rounded-full bg-rose-600 absolute top-2.5 right-2.5 ring-2 ring-lime-400" />
          </button>

          <button
            type="button"
            onClick={onSearchClick}
            aria-label="Buscar transações e funções"
            title="Buscar"
            className="size-11 min-h-11 min-w-11 rounded-full bg-black/10 hover:bg-black/15 active:bg-black/20 text-zinc-950 flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
          >
            <Search className="size-4" />
          </button>

          <button
            type="button"
            onClick={onSupportClick}
            aria-label="Suporte e atendimento ao cliente"
            title="Suporte"
            className="size-11 min-h-11 min-w-11 rounded-full bg-black/10 hover:bg-black/15 active:bg-black/20 text-zinc-950 flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
          >
            <Headphones className="size-4" />
          </button>
        </div>
      </div>

      {/* ── Saldo Total + Toggle Olho + Link Ver Extrato ── */}
      <div className="mt-5 mb-3">
        <div className="flex items-center justify-between gap-2 min-h-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-800">
              Saldo Total
            </span>
            <button
              type="button"
              onClick={toggleHideBalance}
              aria-label={hideBalance ? "Exibir saldo" : "Ocultar saldo"}
              title={hideBalance ? "Exibir saldo" : "Ocultar saldo"}
              className="size-11 min-h-11 min-w-11 -my-2 rounded-lg flex items-center justify-center text-zinc-800 hover:text-zinc-950 active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            >
              {hideBalance ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          {onExtractClick && (
            <button
              type="button"
              onClick={onExtractClick}
              className="h-11 min-h-11 px-2 -my-2 rounded-lg flex items-center gap-1 text-xs font-bold text-zinc-950 hover:underline transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            >
              <span>Ver extrato</span>
              <ChevronRight className="size-4" />
            </button>
          )}
        </div>

        {/* Valor do Saldo em Tipografia Marcante */}
        <div className="mt-1">
          {hideBalance ? (
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 font-mono">
              ••••••••
            </span>
          ) : (
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-950 break-words font-mono">
              {formatCents(balanceCents)}
            </span>
          )}
        </div>

        {/* Pílula de Rendimento CDI e Cashback */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/10 text-zinc-950 text-2xs sm:text-xs font-extrabold leading-none">
            <TrendingUp className="size-3" />
            <span>{yieldRateText}</span>
          </div>
          {cashbackText && (
            <span className="text-2xs sm:text-xs text-zinc-800 font-semibold">
              • {cashbackText}
            </span>
          )}
        </div>
      </div>

      {/* ── Pílulas de Ação Rápida (Piso Tátil de 44px) ── */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-black/10">
        <button
          type="button"
          onClick={onDepositClick}
          aria-label="Abastecer ou carregar carteira"
          className="h-11 min-h-11 px-2 rounded-xl bg-zinc-950 hover:bg-zinc-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
        >
          <Plus className="size-4 shrink-0" />
          <span className="truncate">Abastecer</span>
        </button>

        <button
          type="button"
          onClick={onPayClick}
          aria-label="Pagar conta ou boleto"
          className="h-11 min-h-11 px-2 rounded-xl bg-white/70 hover:bg-white text-zinc-950 border border-black/10 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
        >
          <ArrowUpRight className="size-4 shrink-0" />
          <span className="truncate">Pagar</span>
        </button>

        <button
          type="button"
          onClick={onTransferClick}
          aria-label="Transferir dinheiro via Pix"
          className="h-11 min-h-11 px-2 rounded-xl bg-white/70 hover:bg-white text-zinc-950 border border-black/10 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
        >
          <ArrowDownLeft className="size-4 shrink-0" />
          <span className="truncate">Transferir</span>
        </button>
      </div>
    </div>
  );
}
