import React from "react";
import { ShoppingBag, CaretUp, ArrowRight } from "@phosphor-icons/react";
import { formatMoney } from "@/lib/money";
import { useCart } from "@/lib/cart-context";
import { cn } from "@/lib/utils";

export interface IFoodFloatingCartBarProps {
  storeLogoUrl?: string | null;
  storeName?: string | null;
  totalCents?: number;
  savingsCents?: number;
  itemCount?: number;
  includesDelivery?: boolean;
  onOpenCart?: () => void;
  className?: string;
}

export function IFoodFloatingCartBar({
  storeLogoUrl,
  storeName,
  totalCents,
  savingsCents,
  itemCount,
  includesDelivery = true,
  onOpenCart,
  className,
}: IFoodFloatingCartBarProps) {
  const { cart, setIsCartOpen } = useCart();

  const realCount = itemCount ?? cart?.itemCount ?? cart?.items?.reduce((acc, it) => acc + (it.qty || 1), 0) ?? 0;
  const realTotal = totalCents ?? cart?.totalCents ?? cart?.subtotalCents ?? 0;

  if (realCount === 0) return null;

  return (
    <aside
      aria-label="Carrinho de Compras Flutuante"
      className={cn(
        "fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-30 p-2.5 rounded-2xl bg-card text-card-foreground border border-border/80 shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 select-none",
        className,
      )}
      data-testid="ifood-floating-cart-bar"
    >
      {/* ── LADO ESQUERDO: Avatar da Loja + Valores ── */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="size-11 min-w-11 min-h-11 rounded-full overflow-hidden border border-border/80 bg-muted flex items-center justify-center shrink-0">
          {storeLogoUrl ? (
            <img src={storeLogoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <ShoppingBag size={20} weight="bold" className="text-primary" />
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1 leading-tight">
            <span className="text-sm font-black text-foreground">
              {formatMoney(realTotal)}
            </span>
            <span className="text-2xs text-muted-foreground font-medium">
              • {includesDelivery ? "com entrega" : `${realCount} ${realCount === 1 ? "item" : "itens"}`}
            </span>
          </div>

          {savingsCents && savingsCents > 0 ? (
            <div className="inline-flex items-center gap-0.5 text-3xs font-extrabold text-emerald-600 dark:text-emerald-400 leading-none">
              <span>Economia de {formatMoney(savingsCents)}</span>
              <CaretUp size={10} weight="bold" />
            </div>
          ) : (
            <span className="text-3xs text-muted-foreground font-medium truncate">
              {storeName || "Ver detalhes da sacola"}
            </span>
          )}
        </div>
      </div>

      {/* ── LADO DIREITO: Botão Vermelho Proeminente iFood ── */}
      <button
        type="button"
        onClick={onOpenCart || (() => setIsCartOpen(true))}
        aria-label={`Ver carrinho com ${realCount} itens`}
        className="h-11 min-h-11 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-xs"
      >
        <span>Ver carrinho</span>
        <span className="size-5 rounded-full bg-white text-red-600 text-2xs font-black flex items-center justify-center leading-none">
          {realCount}
        </span>
      </button>
    </aside>
  );
}
