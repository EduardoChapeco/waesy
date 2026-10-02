import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Clock } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/services/cart.functions";
import { useCartContext } from "@/lib/cart-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface OfferCardProps {
  id: string;
  title: string;
  slug: string;
  store_name: string;
  price_cents: number;
  original_price_cents: number;
  discount_percent: number;
  mechanic_label: string;
  ends_at?: string | null;
  cover_image: string;
  selling_unit?: string;
  in_stock?: boolean;
  has_flash_offer?: boolean;
  className?: string;
}

/**
 * OfferCard — Card Horizontal Split com Imagem FULL BLEED
 * Lado esquerdo: Imagem encostando 100% nas bordas superior, esquerda e inferior.
 * Lado direito: Informações da loja, título do produto, preço e botão de compra rápida.
 */
export function OfferCard({
  id,
  title,
  slug,
  store_name,
  price_cents,
  original_price_cents,
  discount_percent,
  mechanic_label,
  ends_at,
  cover_image,
  selling_unit = "un",
  in_stock = true,
  has_flash_offer = true,
  className,
}: OfferCardProps) {
  const { setCartData, setIsCartOpen } = useCartContext();
  const [isAdding, setIsAdding] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  // Timer de oferta relâmpago
  useEffect(() => {
    if (!ends_at || !has_flash_offer) {
      setTimeLeft(null);
      return;
    }

    const calculateTime = () => {
      const now = Date.now();
      const end = new Date(ends_at).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
      );
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [ends_at, has_flash_offer]);

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsAdding(true);
    try {
      const res = await addToCart({
        data: {
          productId: id,
          quantity: 1,
        },
      });
      if (res?.cart) {
        setCartData(res.cart as any, (res as any).globalCarts as any);
      }
      toast.success(`${title} adicionado ao carrinho!`);
      setIsCartOpen(true);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao adicionar produto.");
    } finally {
      setIsAdding(false);
    }
  };

  const discountVal =
    discount_percent ||
    (original_price_cents > price_cents
      ? Math.round(((original_price_cents - price_cents) / original_price_cents) * 100)
      : 0);

  return (
    <Link
      to="/produto/$slug"
      params={{ slug }}
      className={cn(
        "group relative flex flex-row items-stretch w-full h-36 sm:h-40 rounded-lg bg-card border border-border/70 hover:border-primary/50 transition-colors duration-200 content-auto-card overflow-hidden select-none p-0 shadow-2xs",
        className,
      )}
    >
      {/* ── LADO ESQUERDO: Imagem FULL BLEED ── */}
      <div className="relative w-28 sm:w-36 h-full bg-muted overflow-hidden shrink-0">
        <img
          src={cover_image || "/banner-placeholder.png"}
          alt={title}
          className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Badge de Desconto no Topo da Imagem */}
        {discountVal > 0 && (
          <div className="absolute top-2 left-2 z-10">
            <span className="px-2 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-black/90 text-white border border-white/20">
              {discountVal}% OFF
            </span>
          </div>
        )}

        {/* Timer de Oferta Relâmpago no Rodapé da Imagem */}
        {timeLeft && (
          <div className="absolute bottom-2 inset-x-1.5 flex items-center justify-center z-10">
            <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono font-bold bg-black/90 text-white">
              <Clock className="size-2.5" />
              <span>{timeLeft}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── LADO DIREITO: Informações da Loja, Produto e Preço ──── */}
      <div className="flex-1 flex flex-col justify-between h-full min-w-0 p-3 sm:p-4">
        <div className="space-y-1">
          {store_name && (
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider line-clamp-1 block">
              {store_name}
            </span>
          )}
          <h3 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
            {title}
          </h3>
        </div>

        {/* Bloco de Preços & Ação Rápida */}
        <div className="flex items-end justify-between gap-2 pt-1">
          <div className="min-w-0">
            {original_price_cents > price_cents && (
              <span className="text-xs text-muted-foreground line-through block font-mono leading-none">
                {formatMoney(original_price_cents)}
              </span>
            )}
            <div className="text-xs sm:text-sm font-black text-foreground font-mono leading-tight truncate">
              {formatMoney(price_cents)}
              <span className="text-xs text-muted-foreground font-normal ml-1">
                /{selling_unit}
              </span>
            </div>
          </div>

          {/* Botão de Adicionar ao Carrinho (touch target >= 44px) */}
          <Button
            size="sm"
            onClick={handleQuickAdd}
            disabled={isAdding || !in_stock}
            className="size-9 rounded-lg p-0 font-bold bg-foreground text-background shrink-0 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            aria-label={`Adicionar ${title} ao carrinho`}
          >
            {isAdding ? (
              <span className="size-3.5 border-2 border-background border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </Link>
  );
}
