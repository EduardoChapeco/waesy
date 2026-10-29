import React from "react";
import {
  CurrencyCircleDollar,
  Ticket,
  Wallet,
  PiggyBank,
  BookOpen,
  MapPin,
  ListChecks,
  Gift,
  ArrowRight,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SupermarketProductCard } from "./SupermarketProductCard";
import type {
  SupermarketClubMemberDTO,
  SupermarketProductCardDTO,
} from "@/services/supermarket.functions";

interface SupermarketClubDashboardViewProps {
  clubData: SupermarketClubMemberDTO;
  clubProducts: SupermarketProductCardDTO[];
  onAddToCart?: (product: SupermarketProductCardDTO) => void;
  onProductClick?: (product: SupermarketProductCardDTO) => void;
  onOpenDigitalFlyer?: () => void;
  onOpenStoreList?: () => void;
  className?: string;
}

export function SupermarketClubDashboardView({
  clubData,
  clubProducts,
  onAddToCart,
  onProductClick,
  onOpenDigitalFlyer,
  onOpenStoreList,
  className,
}: SupermarketClubDashboardViewProps) {
  const formattedCashback = (clubData.cashbackBalanceCents / 100)
    .toFixed(2)
    .replace(".", ",");
  const formattedSaved = (clubData.totalSavedCents / 100)
    .toFixed(2)
    .replace(".", ",");

  return (
    <div className={cn("space-y-6 px-4 py-4 max-w-4xl mx-auto select-none", className)}>
      {/* ── Header do Membro do Clube ── */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-2xs uppercase tracking-wider text-blue-200 font-bold">
              Programa de Vantagens
            </span>
            <h2 className="text-xl font-black">
              {clubData.userName ? `Olá, ${clubData.userName}` : "Bem-vindo ao Clube"}
            </h2>
            <p className="text-xs text-blue-100 font-medium">
              Você tem acesso aos descontos e cashback exclusivos da rede.
            </p>
          </div>

          <div className="size-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-lg border border-white/20 shrink-0">
            ★
          </div>
        </div>

        {/* ── Cards de Métricas em Grade (Cashback, Cupons, Carteira) ── */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {/* Saldo de Cashback */}
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex flex-col justify-between">
            <CurrencyCircleDollar size={20} weight="fill" className="text-emerald-400 mb-1" />
            <span className="text-3xs text-blue-200 font-semibold">Cashback</span>
            <span className="text-sm font-black">R$ {formattedCashback}</span>
          </div>

          {/* Cupons Ativos */}
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex flex-col justify-between">
            <Ticket size={20} weight="fill" className="text-amber-300 mb-1" />
            <span className="text-3xs text-blue-200 font-semibold">Cupons</span>
            <span className="text-sm font-black">{clubData.activeCouponsCount} ativos</span>
          </div>

          {/* Cartão / Carteira */}
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex flex-col justify-between">
            <Wallet size={20} weight="fill" className="text-purple-300 mb-1" />
            <span className="text-3xs text-blue-200 font-semibold">Cartão Loja</span>
            <span className="text-sm font-black truncate">Ativo</span>
          </div>
        </div>
      </div>

      {/* ── Card Economizômetro ── */}
      <div className="p-4 rounded-2xl bg-card border border-border/60 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-11 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center shrink-0">
            <PiggyBank size={24} weight="duotone" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-muted-foreground font-semibold">
              Economizômetro do Clube
            </span>
            <span className="text-base font-extrabold text-foreground truncate">
              R$ {formattedSaved} economizados
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-11 min-h-11 rounded-xl text-xs font-bold gap-1 shrink-0 focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span>Extrato</span>
          <ArrowRight size={14} weight="bold" />
        </Button>
      </div>

      {/* ── Atalhos Rápidos de Supermercado em Círculos ── */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 py-1">
        {[
          { id: "cashback", label: "Cashback", icon: CurrencyCircleDollar, color: "text-emerald-600" },
          { id: "encarte", label: "Encarte Digital", icon: BookOpen, color: "text-blue-600", onClick: onOpenDigitalFlyer },
          { id: "lojas", label: "Nossas Lojas", icon: MapPin, color: "text-destructive", onClick: onOpenStoreList },
          { id: "sorteios", label: "Sorteios", icon: Gift, color: "text-amber-600" },
          { id: "lista", label: "Lista de Compras", icon: ListChecks, color: "text-purple-600" },
        ].map((item) => {
          const IconComp = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="size-12 rounded-full bg-muted/80 flex items-center justify-center border border-border/60">
                <IconComp size={22} weight="duotone" className={item.color} />
              </div>
              <span className="text-3xs font-bold text-foreground text-center line-clamp-1">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Seção de Ofertas Exclusivas do Clube ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-foreground">
              Ofertas Exclusivas do Clube
            </h3>
            <p className="text-xs text-muted-foreground">
              Descontos automáticos identificados pelo seu CPF no caixa ou online.
            </p>
          </div>
          <span className="text-xs font-bold text-primary">
            {clubProducts.length} itens
          </span>
        </div>

        {clubProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {clubProducts.map((prod) => (
              <SupermarketProductCard
                key={prod.id}
                product={prod}
                isMember={true}
                onAddToCart={onAddToCart}
                onProductClick={onProductClick}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-muted/30 border border-border/40 text-center space-y-2">
            <Ticket size={32} weight="duotone" className="mx-auto text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Nenhuma oferta exclusiva ativa nesta unidade no momento.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
