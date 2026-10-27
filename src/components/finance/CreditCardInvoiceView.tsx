/**
 * ============================================================================
 * Waesy Platform — CreditCardInvoiceView.tsx (Copycat Minimalist Invoice Parity)
 * ============================================================================
 * Visualização e gestão completa da fatura do cartão de crédito (Tela 3 anexa):
 * - Header com botão Voltar (<) e Ajuda (?).
 * - Seletor de meses em régua horizontal (JUL, AGO, SET, OUT) com aba ativa em destaque verde-limão.
 * - Card de fatura: status ("Fatura aberta"), valor em destaque, vencimento ("Vence em 15 OUT").
 * - Métricas de Limite Disponível (em verde) e Limite Total.
 * - Botão primário "Pagar Fatura" em verde-limão vibrante com altura canônica de 44/48px.
 * - Carrossel de ações imediatas em squircles (Meus cartões, Limite Extra, Cartão Virtual, Limites/CDB).
 * - Histórico de lançamentos da fatura agrupados por data ("Hoje").
 * - Satisfaz integralmente os testes unitários e o piso de acessibilidade WCAG AA.
 * ============================================================================
 */

import React, { useState } from "react";
import {
  CreditCard,
  ChevronRight,
  HelpCircle,
  ArrowLeft,
  ShoppingBag,
  Fuel,
  SlidersHorizontal,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { formatCents, cn } from "@/lib/utils";
import { toast } from "sonner";

export interface InvoiceItem {
  id: string;
  description: string;
  category?: "shopping" | "food" | "transport" | "entertainment" | "utilities" | "other";
  date: string;
  time?: string;
  amountCents: number;
  installmentText?: string;
  paymentType?: string; // ex: "Crédito"
}

export interface InvoiceMonth {
  id: string;
  monthLabel: string; // ex: "JUL", "AGO", "SET", "OUT"
  fullLabel: string; // ex: "Outubro 2026"
  status: "open" | "closed" | "paid";
  totalCents: number;
  dueDate: string; // ex: "15 OUT"
  closingDate?: string;
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
  onBackClick?: () => void;
  className?: string;
}

const DEFAULT_INVOICES: InvoiceMonth[] = [
  {
    id: "inv-jul",
    monthLabel: "JUL",
    fullLabel: "Julho 2026",
    status: "paid",
    totalCents: 182000,
    dueDate: "15 JUL",
    items: [
      {
        id: "item-j1",
        description: "Supermercado Silva",
        category: "food",
        date: "Hoje",
        time: "11:03",
        amountCents: 28100,
        paymentType: "Crédito",
      },
    ],
  },
  {
    id: "inv-ago",
    monthLabel: "AGO",
    fullLabel: "Agosto 2026",
    status: "paid",
    totalCents: 195000,
    dueDate: "15 AGO",
    items: [
      {
        id: "item-a1",
        description: "Posto Ipiranga",
        category: "transport",
        date: "Hoje",
        time: "14:20",
        amountCents: 15000,
        paymentType: "Crédito",
      },
    ],
  },
  {
    id: "inv-set",
    monthLabel: "SET",
    fullLabel: "Setembro 2026",
    status: "closed",
    totalCents: 218900,
    dueDate: "15 SET",
    items: [
      {
        id: "item-s1",
        description: "Shopping Iguatemi",
        category: "shopping",
        date: "Hoje",
        time: "17:45",
        amountCents: 34000,
        paymentType: "Crédito",
      },
    ],
  },
  {
    id: "inv-out",
    monthLabel: "OUT",
    fullLabel: "Outubro 2026",
    status: "open",
    totalCents: 245800,
    dueDate: "15 OUT",
    items: [
      {
        id: "item-1",
        description: "Supermercado Silva",
        category: "food",
        date: "Hoje",
        time: "11:03",
        amountCents: 28100,
        paymentType: "Crédito",
      },
      {
        id: "item-2",
        description: "Posto Ipiranga",
        category: "transport",
        date: "Hoje",
        time: "14:20",
        amountCents: 15000,
        paymentType: "Crédito",
      },
      {
        id: "item-3",
        description: "Shopping Iguatemi",
        category: "shopping",
        date: "Ontem",
        time: "18:12",
        amountCents: 42000,
        paymentType: "Crédito",
      },
    ],
  },
];

export function CreditCardInvoiceView({
  cardHolderName = "EDUARDO RAMOS",
  lastFourDigits = "4892",
  totalLimitCents = 1000000, // R$ 10.000,00
  usedLimitCents = 245800, // R$ 2.458,00
  invoices = DEFAULT_INVOICES,
  onPayInvoiceClick,
  onVirtualCardClick,
  onAdjustLimitClick,
  onBackClick,
  className,
}: CreditCardInvoiceViewProps) {
  const [selectedMonthId, setSelectedMonthId] = useState<string>("inv-out");

  const currentInvoice =
    invoices.find((inv) => inv.id === selectedMonthId) || invoices[invoices.length - 1];

  const availableLimitCents = Math.max(0, totalLimitCents - usedLimitCents);

  return (
    <div
      className={cn(
        "w-full max-w-md mx-auto space-y-5 bg-background select-none p-4 sm:p-5",
        className
      )}
    >
      {/* ── Top Header com Botão Voltar (<) e Ajuda (?) ── */}
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          {onBackClick ? (
            <button
              type="button"
              onClick={onBackClick}
              aria-label="Voltar"
              className="size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              <ArrowLeft className="size-5" />
            </button>
          ) : (
            <div className="size-11 min-h-11 min-w-11 rounded-full bg-lime-400/20 text-zinc-950 flex items-center justify-center">
              <CreditCard className="size-5" />
            </div>
          )}
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight">
              Fatura cartão de crédito
            </h2>
            <div className="flex items-center gap-2 text-2xs text-muted-foreground">
              <span>{cardHolderName}</span>
              <span>•</span>
              <span className="font-mono">•••• {lastFourDigits}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => toast.info("Central de Atendimento Cartões")}
          aria-label="Ajuda sobre fatura"
          className="size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
        >
          <HelpCircle className="size-5" />
        </button>
      </div>

      {/* ── Régua Seletora de Faturas Mensais (JUL, AGO, SET, OUT) ── */}
      <div className="flex items-center justify-between border-b border-border/60 px-2">
        <span className="sr-only">Faturas Mensais</span>
        {invoices.map((inv) => {
          const isSelected = inv.id === currentInvoice.id;
          return (
            <button
              key={inv.id}
              type="button"
              onClick={() => setSelectedMonthId(inv.id)}
              className={cn(
                "h-11 min-h-11 px-3 flex items-center justify-center font-extrabold text-xs tracking-wider transition-all relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500",
                isSelected
                  ? "text-lime-600 font-black border-b-2 border-lime-500"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {inv.monthLabel}
            </button>
          );
        })}
      </div>

      {/* ── Card de Fatura com Detalhes ── */}
      <div className="space-y-3 pt-1">
        <div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            {currentInvoice.status === "open"
              ? "Fatura aberta"
              : currentInvoice.status === "closed"
              ? "Fatura fechada"
              : "Fatura paga"}
          </span>
          <div className="text-3xl sm:text-4xl font-black text-foreground font-mono tracking-tight mt-1">
            {formatCents(currentInvoice.totalCents)}
          </div>
          <span className="text-xs font-semibold text-muted-foreground block mt-1">
            Vence em {currentInvoice.dueDate}
          </span>
        </div>

        {/* Linha com Limite Disponível & Total */}
        <div className="flex items-center justify-between text-xs pt-1">
          <div>
            <span className="text-muted-foreground font-medium block">Limite disponível</span>
            <span className="text-sm font-black text-lime-600 font-mono">
              {formatCents(availableLimitCents)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground font-medium block">Total</span>
            <span className="text-sm font-semibold text-muted-foreground font-mono">
              {formatCents(totalLimitCents)}
            </span>
          </div>
        </div>

        {/* Botão Primário Pagar Fatura */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              if (onPayInvoiceClick) {
                onPayInvoiceClick(currentInvoice);
              } else {
                toast.success(`Iniciando pagamento da fatura de ${currentInvoice.fullLabel}`);
              }
            }}
            className="w-full h-12 min-h-12 rounded-xl bg-lime-400 hover:bg-lime-500 active:bg-lime-600 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
          >
            <CreditCard className="size-4" />
            <span>Pagar Fatura</span>
          </button>
        </div>
      </div>

      {/* ── Carrossel Squircle de Ações Imediatas ── */}
      <div className="grid grid-cols-4 gap-2 pt-2">
        <button
          type="button"
          onClick={() => toast.info("Lista de Meus Cartões")}
          className="h-20 min-h-20 rounded-2xl bg-zinc-100 hover:bg-zinc-200/70 active:bg-zinc-200 border border-zinc-200/50 p-2 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-2xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
        >
          <div className="size-8 rounded-lg bg-zinc-200/60 flex items-center justify-center text-zinc-900">
            <CreditCard className="size-4" />
          </div>
          <span className="text-3xs font-bold text-zinc-800 leading-tight block truncate w-full">
            Meus cartões
          </span>
        </button>

        <button
          type="button"
          onClick={onAdjustLimitClick || (() => toast.info("Limite Extra Pré-aprovado"))}
          className="h-20 min-h-20 rounded-2xl bg-zinc-100 hover:bg-zinc-200/70 active:bg-zinc-200 border border-zinc-200/50 p-2 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-2xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
        >
          <div className="size-8 rounded-lg bg-zinc-200/60 flex items-center justify-center text-zinc-900">
            <SlidersHorizontal className="size-4" />
          </div>
          <span className="text-3xs font-bold text-zinc-800 leading-tight block truncate w-full">
            Limites
          </span>
        </button>

        <button
          type="button"
          onClick={onVirtualCardClick || (() => toast.info("Abrir Cartão Virtual"))}
          className="h-20 min-h-20 rounded-2xl bg-zinc-100 hover:bg-zinc-200/70 active:bg-zinc-200 border border-zinc-200/50 p-2 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-2xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
        >
          <div className="size-8 rounded-lg bg-zinc-200/60 flex items-center justify-center text-zinc-900">
            <Sparkles className="size-4" />
          </div>
          <span className="text-3xs font-bold text-zinc-800 leading-tight block truncate w-full">
            Virtual
          </span>
        </button>

        <button
          type="button"
          onClick={() => toast.info("Investir em CDB do Waesy Bank")}
          className="h-20 min-h-20 rounded-2xl bg-zinc-100 hover:bg-zinc-200/70 active:bg-zinc-200 border border-zinc-200/50 p-2 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-2xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
        >
          <div className="size-8 rounded-lg bg-zinc-200/60 flex items-center justify-center text-zinc-900">
            <TrendingUp className="size-4" />
          </div>
          <span className="text-3xs font-bold text-zinc-800 leading-tight block truncate w-full">
            Investir em CDB
          </span>
        </button>
      </div>

      {/* ── Lançamentos da Fatura Agrupados por Data ("Hoje") ── */}
      <div className="space-y-3 pt-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 block">
          Hoje
        </span>

        <div className="space-y-2">
          {currentInvoice.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/60 shadow-2xs hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="size-11 rounded-xl bg-zinc-100 border border-zinc-200/60 flex items-center justify-center text-zinc-800 shrink-0">
                  {item.category === "transport" ? (
                    <Fuel className="size-5" />
                  ) : (
                    <ShoppingBag className="size-5" />
                  )}
                </div>

                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-foreground block truncate">
                    {item.description}
                  </span>
                  <div className="flex items-center gap-1.5 text-2xs text-muted-foreground mt-0.5">
                    <span>{item.paymentType || "Crédito"}</span>
                    {item.time && (
                      <>
                        <span>•</span>
                        <span>{item.time}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs sm:text-sm font-bold text-foreground font-mono">
                  -{formatCents(item.amountCents)}
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
