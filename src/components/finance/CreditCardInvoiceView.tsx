/**
 * ============================================================================
 * Waesy Platform — CreditCardInvoiceView.tsx (99Pay & Apple HIG Parity)
 * ============================================================================
 * Visualização e gestão completa da fatura do cartão de crédito Waesy Bank:
 * - Seletor de meses em régua horizontal com status (Aberta, Fechada, Paga).
 * - Barra de progresso bicolor de limite (Utilizado vs Disponível).
 * - 3 CTAs táteis imediatos (Pagar Fatura, Cartão Virtual, Ajustar Limite).
 * - Lançamentos da fatura agrupados por data com identificação do estabelecimento,
 *   parcela e valor.
 * Ref: Captura de tela 2026-10-16 155905.png (Tela 3), unnamed (5).webp
 * ============================================================================
 */

import React, { useState } from "react";
import {
  CreditCard,
  Lock,
  ChevronRight,
  Receipt,
  QrCode,
  SlidersHorizontal,
  CheckCircle2,
  Clock,
  Sparkles,
  ShoppingBag,
  Coffee,
  Car,
  Film,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCents, cn } from "@/lib/utils";

export interface InvoiceItem {
  id: string;
  description: string;
  category: "shopping" | "food" | "transport" | "entertainment" | "utilities" | "other";
  date: string;
  amountCents: number;
  installmentText?: string; // ex: "1/3"
}

export interface InvoiceMonth {
  id: string;
  monthLabel: string; // ex: "AGO", "SET", "OUT", "NOV"
  fullLabel: string; // ex: "Outubro 2026"
  status: "open" | "closed" | "paid";
  totalCents: number;
  dueDate: string; // ex: "15/10/2026"
  closingDate: string; // ex: "08/10/2026"
  items: InvoiceItem[];
}

export interface CreditCardInvoiceViewProps {
  cardHolderName?: string;
  lastFourDigits?: string;
  totalLimitCents?: number;
  usedLimitCents?: number;
  invoices?: InvoiceMonth[];
  onPayInvoiceClick?: (invoice: InvoiceMonth) => void;
  onVirtualCardClick?: () => void;
  onAdjustLimitClick?: () => void;
  className?: string;
}

const DEFAULT_INVOICES: InvoiceMonth[] = [
  {
    id: "inv-aug",
    monthLabel: "AGO",
    fullLabel: "Agosto 2026",
    status: "paid",
    totalCents: 124500,
    dueDate: "15/08/2026",
    closingDate: "08/08/2026",
    items: [
      {
        id: "item-1",
        description: "Posto Shell Combustível",
        category: "transport",
        date: "05/08/2026",
        amountCents: 18000,
      },
      {
        id: "item-2",
        description: "Supermercado Compre Bem",
        category: "food",
        date: "03/08/2026",
        amountCents: 62500,
        installmentText: "1/2",
      },
      {
        id: "item-3",
        description: "Netflix Assinatura",
        category: "entertainment",
        date: "01/08/2026",
        amountCents: 44000,
      },
    ],
  },
  {
    id: "inv-sep",
    monthLabel: "SET",
    fullLabel: "Setembro 2026",
    status: "paid",
    totalCents: 218900,
    dueDate: "15/09/2026",
    closingDate: "08/09/2026",
    items: [
      {
        id: "item-4",
        description: "Supermercado Compre Bem",
        category: "food",
        date: "03/09/2026",
        amountCents: 62500,
        installmentText: "2/2",
      },
      {
        id: "item-5",
        description: "Waesy Go Corrida Urbana",
        category: "transport",
        date: "12/09/2026",
        amountCents: 2400,
      },
      {
        id: "item-6",
        description: "Apple Services",
        category: "utilities",
        date: "14/09/2026",
        amountCents: 154000,
      },
    ],
  },
  {
    id: "inv-oct",
    monthLabel: "OUT",
    fullLabel: "Outubro 2026",
    status: "closed",
    totalCents: 148290,
    dueDate: "15/10/2026",
    closingDate: "08/10/2026",
    items: [
      {
        id: "item-7",
        description: "Restaurante Estrela D'Alva",
        category: "food",
        date: "10/10/2026",
        amountCents: 19800,
      },
      {
        id: "item-8",
        description: "Farmácia São João",
        category: "shopping",
        date: "06/10/2026",
        amountCents: 8590,
      },
      {
        id: "item-9",
        description: "Waesy Mobilidade Urbana",
        category: "transport",
        date: "04/10/2026",
        amountCents: 4900,
      },
      {
        id: "item-10",
        description: "Magazine Luiza Online",
        category: "shopping",
        date: "02/10/2026",
        amountCents: 115000,
        installmentText: "1/3",
      },
    ],
  },
  {
    id: "inv-nov",
    monthLabel: "NOV",
    fullLabel: "Novembro 2026",
    status: "open",
    totalCents: 57500,
    dueDate: "15/11/2026",
    closingDate: "08/11/2026",
    items: [
      {
        id: "item-11",
        description: "Magazine Luiza Online",
        category: "shopping",
        date: "02/10/2026",
        amountCents: 57500,
        installmentText: "2/3",
      },
    ],
  },
];

function getCategoryIcon(cat: InvoiceItem["category"]) {
  switch (cat) {
    case "food":
      return <Coffee className="size-4" />;
    case "transport":
      return <Car className="size-4" />;
    case "entertainment":
      return <Film className="size-4" />;
    case "utilities":
      return <Zap className="size-4" />;
    case "shopping":
    default:
      return <ShoppingBag className="size-4" />;
  }
}

export function CreditCardInvoiceView({
  cardHolderName = "CLIENTE WAESY",
  lastFourDigits = "4892",
  totalLimitCents = 500000, // R$ 5.000,00
  usedLimitCents = 148290, // R$ 1.482,90
  invoices = DEFAULT_INVOICES,
  onPayInvoiceClick,
  onVirtualCardClick,
  onAdjustLimitClick,
  className,
}: CreditCardInvoiceViewProps) {
  const [selectedMonthId, setSelectedMonthId] = useState<string>(
    () => invoices.find((i) => i.status === "closed")?.id || invoices[invoices.length - 1]?.id || ""
  );

  const activeInvoice = invoices.find((i) => i.id === selectedMonthId) || invoices[0];
  const availableLimitCents = Math.max(0, totalLimitCents - usedLimitCents);
  const usedPercentage = totalLimitCents > 0 ? Math.min(100, Math.round((usedLimitCents / totalLimitCents) * 100)) : 0;

  return (
    <div className={cn("space-y-4 sm:space-y-5", className)}>
      {/* ── 1. Resumo do Cartão & Barra de Limite Bicolor ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CreditCard className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight text-foreground">
                  Cartão Waesy Visa
                </span>
                <span className="text-xs text-muted-foreground font-mono">•••• {lastFourDigits}</span>
              </div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider block">
                {cardHolderName}
              </span>
            </div>
          </div>

          <Badge
            variant="outline"
            className="rounded-full px-3 py-1 text-xs font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
          >
            Ativo
          </Badge>
        </div>

        {/* Barra de Progresso Bicolor de Limite */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <div>
              <span className="text-muted-foreground">Limite disponível: </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                {formatCents(availableLimitCents)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Utilizado: </span>
              <span className="font-semibold text-foreground font-mono">
                {formatCents(usedLimitCents)}
              </span>
            </div>
          </div>

          {/* Barra com proporção exata */}
          <div className="w-full h-3 rounded-full bg-emerald-500/20 overflow-hidden flex">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${usedPercentage}%` }}
              aria-label={`Limite utilizado: ${usedPercentage}%`}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total aprovado: {formatCents(totalLimitCents)}</span>
            <span>{usedPercentage}% utilizado</span>
          </div>
        </div>

        {/* 3 CTAs Táteis Rápidos */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            onClick={() => onPayInvoiceClick?.(activeInvoice)}
            className="rounded-xl h-11 min-h-11 px-2 text-xs font-semibold gap-1.5 border-border/80 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <Receipt className="size-4 shrink-0 text-primary" />
            <span className="truncate">Pagar</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onVirtualCardClick}
            className="rounded-xl h-11 min-h-11 px-2 text-xs font-semibold gap-1.5 border-border/80 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <Lock className="size-4 shrink-0 text-primary" />
            <span className="truncate">Virtual</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onAdjustLimitClick}
            className="rounded-xl h-11 min-h-11 px-2 text-xs font-semibold gap-1.5 border-border/80 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <SlidersHorizontal className="size-4 shrink-0 text-primary" />
            <span className="truncate">Limites</span>
          </Button>
        </div>
      </div>

      {/* ── 2. Régua Horizontal de Meses da Fatura ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            Faturas Mensais
          </span>
          {activeInvoice && (
            <Badge
              variant="outline"
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                activeInvoice.status === "paid" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                activeInvoice.status === "closed" && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                activeInvoice.status === "open" && "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
              )}
            >
              {activeInvoice.status === "paid" && "Paga"}
              {activeInvoice.status === "closed" && "Fechada"}
              {activeInvoice.status === "open" && "Aberta"}
            </Badge>
          )}
        </div>

        {/* Seletor de Meses em Pill Horizontal */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {invoices.map((inv) => {
            const isSelected = inv.id === selectedMonthId;
            return (
              <button
                key={inv.id}
                type="button"
                onClick={() => setSelectedMonthId(inv.id)}
                className={cn(
                  "h-11 min-h-11 px-4 rounded-xl text-xs font-semibold flex items-center justify-center shrink-0 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                  isSelected
                    ? "bg-foreground text-background shadow-xs scale-102"
                    : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <span>{inv.monthLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Detalhe da Fatura Selecionada */}
        {activeInvoice && (
          <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs text-muted-foreground block">{activeInvoice.fullLabel}</span>
                <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground mt-0.5">
                  {formatCents(activeInvoice.totalCents)}
                </div>
              </div>

              <div className="text-right text-xs space-y-1">
                <div className="text-muted-foreground">
                  Vencimento: <strong className="text-foreground">{activeInvoice.dueDate}</strong>
                </div>
                <div className="text-muted-foreground">
                  Fechamento: <strong className="text-foreground">{activeInvoice.closingDate}</strong>
                </div>
              </div>
            </div>

            {activeInvoice.status !== "paid" && (
              <Button
                type="button"
                onClick={() => onPayInvoiceClick?.(activeInvoice)}
                className="w-full rounded-xl h-11 min-h-11 text-xs font-semibold gap-2 bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <QrCode className="size-4" />
                <span>Pagar Fatura com Pix</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── 3. Lançamentos Detalhados da Fatura ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border/40">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Lançamentos ({activeInvoice?.items.length || 0})
          </h3>
          <span className="text-xs text-muted-foreground">{activeInvoice?.fullLabel}</span>
        </div>

        {!activeInvoice?.items.length ? (
          <div className="text-center py-8 text-xs text-muted-foreground">
            Nenhuma despesa registrada nesta fatura.
          </div>
        ) : (
          <div className="space-y-2">
            {activeInvoice.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors border border-border/30"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-9 rounded-lg bg-background border border-border/60 text-muted-foreground flex items-center justify-center shrink-0">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                        {item.description}
                      </span>
                      {item.installmentText && (
                        <span className="text-2xs font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                          {item.installmentText}
                        </span>
                      )}
                    </div>
                    <span className="text-2xs text-muted-foreground block">{item.date}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs sm:text-sm font-semibold font-mono text-foreground">
                    {formatCents(item.amountCents)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
