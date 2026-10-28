/**
 * ============================================================================
 * Waesy Platform — FinancialActionGrid.tsx (Copycat Minimalist Bank Parity)
 * ============================================================================
 * Grade e carrossel de ações financeiras rápidas em formato squircle (Nevo/Waesy):
 * 1. Pix (Priorizado como 1ª opção do carrossel, badge Instantâneo)
 * 2. Boleto (Pagamento de contas e concessionárias)
 * 3. Recargas (Recarga de celular e transporte)
 * 4. Seguros (Proteção da conta e cartão)
 * 5. Empréstimos (Simulação de crédito pessoal até 36x)
 * 6. Transferir (Transferências imediatas P2P)
 * 7. Extrato (Histórico unificado)
 * 8. Cobrar (Geração de QR Code e chave Pix)
 * 9. Cartões (Faturas, limite e cartão virtual)
 * ============================================================================
 */

import React from "react";
import {
  QrCode,
  Barcode,
  ArrowLeftRight,
  Receipt,
  CreditCard,
  Smartphone,
  Coins,
  BadgePercent,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface FinancialActionItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  badge?: string;
  disabled?: boolean;
}

export interface FinancialActionGridProps {
  onPixClick?: () => void;
  onBoletoClick?: () => void;
  onTransferClick?: () => void;
  onHistoryClick?: () => void;
  onChargeClick?: () => void;
  onCardClick?: () => void;
  onRechargeClick?: () => void;
  onLoansClick?: () => void;
  onInsuranceClick?: () => void;
  className?: string;
}

export function FinancialActionGrid({
  onPixClick,
  onBoletoClick,
  onTransferClick,
  onHistoryClick,
  onChargeClick,
  onCardClick,
  onRechargeClick,
  onLoansClick,
  onInsuranceClick,
  className,
}: FinancialActionGridProps) {
  const actions: FinancialActionItem[] = [
    {
      id: "pix",
      label: "Pix",
      icon: QrCode,
      onClick: onPixClick,
      badge: "Instantâneo",
    },
    {
      id: "boleto",
      label: "Boleto",
      icon: Barcode,
      onClick: onBoletoClick,
    },
    {
      id: "recargas",
      label: "Recargas",
      icon: Smartphone,
      onClick: onRechargeClick,
    },
    {
      id: "seguros",
      label: "Seguros",
      icon: ShieldCheck,
      onClick: onInsuranceClick,
    },
    {
      id: "emprestimos",
      label: "Empréstimos",
      icon: Coins,
      onClick: onLoansClick,
      badge: "Até 36x",
    },
    {
      id: "transferir",
      label: "Transferir",
      icon: ArrowLeftRight,
      onClick: onTransferClick,
    },
    {
      id: "extrato",
      label: "Extrato",
      icon: Receipt,
      onClick: onHistoryClick,
    },
    {
      id: "cobrar",
      label: "Cobrar",
      icon: BadgePercent,
      onClick: onChargeClick,
    },
    {
      id: "cartoes",
      label: "Cartões",
      icon: CreditCard,
      onClick: onCardClick,
    },
  ];

  return (
    <div className={cn("w-full space-y-3 select-none", className)}>
      {/* Trilho Deslizante com Snap Scroll e Ergonomia Tátil Contínua */}
      <div className="flex items-start gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-1 px-1">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="flex flex-col items-center gap-2 shrink-0 w-18 sm:w-20 group"
            >
              <button
                type="button"
                onClick={item.onClick}
                disabled={item.disabled}
                aria-label={`Acessar ${item.label}`}
                className={cn(
                  "size-16 sm:size-18 min-h-16 min-w-16 rounded-2xl bg-zinc-100 hover:bg-zinc-200/70 active:bg-zinc-200 border border-zinc-200/60 flex items-center justify-center text-zinc-900 shadow-2xs active:scale-95 transition-colors relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500",
                  item.id === "pix" && "ring-1 ring-lime-400 bg-lime-400/10 hover:bg-lime-400/20"
                )}
              >
                <Icon className="size-6 text-zinc-900 stroke-[1.8]" />

                {item.badge && (
                  <span className="absolute -top-1.5 px-2 py-1 rounded-full bg-lime-400 text-zinc-950 font-black text-3xs uppercase tracking-tighter leading-none shadow-xs border border-lime-300">
                    {item.badge}
                  </span>
                )}
              </button>

              <span className="text-xs font-semibold text-zinc-700 text-center truncate w-full group-hover:text-zinc-950">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
