/**
 * ============================================================================
 * Waesy Platform — FinancialActionGrid.tsx (Waesy Bank & 99Pay Parity)
 * ============================================================================
 * Grade squircle de ações financeiras rápidas:
 * 1. Pix (Área Pix unificada com transferências e QR Code)
 * 2. Boleto (Pagamento de contas, concessionárias e boletos)
 * 3. Transferir (Transferências instantâneas P2P entre contas Waesy)
 * 4. Extrato (Histórico unificado de transações)
 * 5. Cobrar (Geração de QR Code e chave Pix Copia e Cola)
 * 6. Cartões (Gestão de fatura, limite e cartão virtual)
 * 7. Recargas (Recarga de celular e cartões de transporte)
 * 8. Empréstimos (Simulação de crédito e parcelamento em até 36x)
 * Ref: Prints Captura de tela 2026-10-16 155858.png, images (14).jpg, unnamed (2).webp
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
  Sparkles,
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
    {
      id: "recargas",
      label: "Recargas",
      icon: Smartphone,
      onClick: onRechargeClick,
    },
    {
      id: "emprestimos",
      label: "Empréstimos",
      icon: Coins,
      onClick: onLoansClick,
      badge: "Até 36x",
    },
  ];

  return (
    <div className={cn("w-full space-y-2 select-none", className)}>
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Serviços de Pagamento
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              disabled={item.disabled}
              className={cn(
                "relative flex flex-col items-center justify-center p-2 rounded-2xl border border-border/70 bg-card hover:bg-muted/40 active:bg-muted/70 active:scale-95 transition-all text-center group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs",
                "h-20 min-h-20 sm:h-22 sm:min-h-22",
                item.disabled && "opacity-50 pointer-events-none"
              )}
            >
              {/* Badge opcional de destaque */}
              {item.badge && (
                <span className="absolute -top-1.5 inset-x-auto px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-3xs font-extrabold tracking-tight leading-none shadow-xs">
                  {item.badge}
                </span>
              )}

              {/* Ícone squircle interior */}
              <div className="size-9 rounded-xl bg-muted/60 group-hover:bg-muted flex items-center justify-center text-foreground transition-colors shrink-0">
                <Icon className="size-4 sm:size-5" />
              </div>

              {/* Rótulo Anti-Truncate */}
              <span className="text-2xs sm:text-xs font-bold text-foreground mt-1.5 line-clamp-1 leading-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
