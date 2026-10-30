import React from "react";
import { Link } from "@tanstack/react-router";
import {
  MagnifyingGlass,
  Barcode,
  Microphone,
  CaretDown,
  Ticket,
  ShoppingBag,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SupermarketHeaderClusterProps {
  storeName?: string;
  storeAddress?: string;
  storeLogoUrl?: string | null;
  onOpenStoreSelector?: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onBarcodeScanClick?: () => void;
  onVoiceSearchClick?: () => void;
  cartItemCount?: number;
  onOpenCart?: () => void;
  couponsCount?: number;
  onOpenCoupons?: () => void;
  className?: string;
}

export function SupermarketHeaderCluster({
  storeName = "Seu Supermercado",
  storeAddress,
  storeLogoUrl,
  onOpenStoreSelector,
  searchValue,
  onSearchChange,
  onBarcodeScanClick,
  onVoiceSearchClick,
  cartItemCount = 0,
  onOpenCart,
  couponsCount = 0,
  onOpenCoupons,
  className,
}: SupermarketHeaderClusterProps) {
  return (
    <header className={cn("w-full space-y-3 px-4 pt-3 pb-2 bg-background sticky top-0 z-30 border-b border-border/40", className)}>
      {/* ── Linha Superior: Seletor de Loja & Ações Rápidas ── */}
      <div className="flex items-center justify-between gap-3">
        {/* Seletor de Loja/Filial */}
        <button
          type="button"
          onClick={onOpenStoreSelector}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left rounded-xl p-1 -ml-1 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-11 min-h-11"
          aria-label={`Selecionar filial: ${storeName}`}
        >
          {storeLogoUrl ? (
            <img
              src={storeLogoUrl}
              alt=""
              className="size-8 rounded-full object-cover border border-border/60 shrink-0"
            />
          ) : (
            <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
              {storeName.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="flex flex-col min-w-0">
            <span className="text-3xs uppercase tracking-wider text-muted-foreground font-semibold">
              Supermercado
            </span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-foreground truncate max-w-48 sm:max-w-xs">
                {storeName}
              </span>
              <CaretDown size={14} weight="bold" className="text-muted-foreground shrink-0" />
            </div>
          </div>
        </button>

        {/* Grupo de Ações (Cupons & Carrinho) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {couponsCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenCoupons}
              className="h-11 min-h-11 min-w-11 px-3 rounded-xl border-border/60 gap-1.5 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`${couponsCount} cupons disponíveis`}
            >
              <Ticket size={18} weight="duotone" className="text-primary" />
              <span className="hidden sm:inline">{couponsCount} cupons</span>
            </Button>
          ) : null}

          {onOpenCart ? (
            <Button
              variant="default"
              size="sm"
              onClick={onOpenCart}
              className="h-11 min-h-11 min-w-11 px-3.5 rounded-xl gap-2 font-bold focus-visible:ring-2 focus-visible:ring-primary relative"
              aria-label={`Abrir carrinho com ${cartItemCount} itens`}
            >
              <ShoppingBag size={18} weight="bold" />
              {cartItemCount > 0 ? (
                <span className="text-xs bg-primary-foreground text-primary px-1.5 py-0.5 rounded-full font-extrabold">
                  {cartItemCount}
                </span>
              ) : null}
            </Button>
          ) : null}
        </div>
      </div>

      {/* ── Linha Inferior: Barra de Busca Pílula com Scanner e Microfone ── */}
      <div className="relative flex items-center w-full">
        <div className="absolute left-3.5 flex items-center pointer-events-none text-muted-foreground">
          <MagnifyingGlass size={20} weight="bold" />
        </div>

        <input
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="O que você está buscando hoje?"
          className="w-full h-11 min-h-11 pl-11 pr-20 rounded-2xl bg-muted/70 text-foreground placeholder:text-muted-foreground text-sm border border-border/40 transition-colors focus-visible:bg-background focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Buscar produtos no supermercado"
        />

        <div className="absolute right-1.5 flex items-center gap-0.5">
          {onVoiceSearchClick ? (
            <button
              type="button"
              onClick={onVoiceSearchClick}
              className="size-11 min-w-11 min-h-11 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Buscar por voz"
            >
              <Microphone size={18} weight="bold" />
            </button>
          ) : null}

          {onBarcodeScanClick ? (
            <button
              type="button"
              onClick={onBarcodeScanClick}
              className="size-11 min-w-11 min-h-11 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Escanear código de barras"
            >
              <Barcode size={18} weight="bold" />
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
