import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Clock, ArrowRight, Loader2 } from "lucide-react";
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
  layoutVariant?: "vertical" | "horizontal";
  className?: string;
}

/**
 * OfferCard — Card Canônico de Produto & Oferta Waesy (Padrão Apple HIG & WCAG 2.2 AA)
 * - Modo Vertical (Padrão Canônico): Imagem aspect-4/3 no topo, tipografia nítida, preço e CTA primário h-11 proeminente.
 * - Modo Horizontal: Split side-by-side retrocompatível para composições compactas.
 * - Piso de acessibilidade: CTA tátil h-11 (44px), anéis :focus-visible:ring-2 e zero valores mágicos arbitrários.
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
  layoutVariant = "vertical",
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

  // ── RENDERIZAÇÃO HORIZONTAL (Legado / Split) ──
  if (layoutVariant === "horizontal") {
    return (
      <div
        className={cn(
          "group relative flex flex-row items-stretch w-full h-36 sm:h-40 rounded-lg bg-card border border-border/70 hover:border-primary/50 transition-colors duration-200 content-auto-card overflow-hidden select-none p-0 shadow-2xs",
          className,
        )}
      >
        <Link
          to="/produto/$slug"
          params={{ slug }}
          className="flex flex-row items-stretch flex-1 min-w-0 cursor-pointer"
        >
          <div className="relative w-28 sm:w-36 h-full bg-muted overflow-hidden shrink-0">
            <img
              src={cover_image || "/banner-placeholder.png"}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 size-full object-cover blur-xl opacity-35 scale-110 pointer-events-none select-none"
            />
            <img
              src={cover_image || "/banner-placeholder.png"}
              alt={title}
              className="relative size-full object-contain group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none"
              loading="lazy"
            />
            {discountVal > 0 && (
              <div className="absolute top-2 left-2 z-10">
                <span className="px-2 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-foreground/90 text-background border border-white/20">
                  {discountVal}% OFF
                </span>
              </div>
            )}
            {timeLeft && (
              <div className="absolute bottom-2 inset-x-1.5 flex items-center justify-center z-10">
                <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono font-bold bg-foreground/90 text-background">
                  <Clock className="size-2.5" />
                  <span>{timeLeft}</span>
                </div>
              </div>
            )}
          </div>

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

            <div className="pt-1">
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
          </div>
        </Link>

        <div className="p-3 sm:p-4 flex items-end shrink-0">
          <Button
            size="sm"
            onClick={handleQuickAdd}
            disabled={isAdding || !in_stock}
            className="h-11 min-h-11 px-4 rounded-lg font-bold text-xs bg-primary text-primary-foreground shrink-0 hover:bg-primary/90 active:scale-95 transition-colors duration-200 motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary gap-2"
            aria-label={`Ver oferta ou adicionar ${title}`}
          >
            {isAdding ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <>
                <Plus className="size-4 shrink-0" />
                <span>Ver Oferta</span>
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ── RENDERIZAÇÃO VERTICAL CANÔNICA (Padrão de Vitrines e Classificados) ──
  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between w-full h-96 min-h-96 rounded-lg bg-card border border-border/70 hover:border-primary/50 transition-colors duration-200 overflow-hidden select-none p-0",
        className,
      )}
    >
      <Link
        to="/produto/$slug"
        params={{ slug }}
        className="flex-1 flex flex-col justify-between block cursor-pointer"
      >
        {/* ── IMAGEM NO TOPO (ASPECT-[4/3] FULL BLEED COM ESCALA PROPORCIONAL) ── */}
        <div className="relative aspect-[4/3] w-full bg-muted overflow-hidden shrink-0">
          <img
            src={cover_image || "/banner-placeholder.png"}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 size-full object-cover blur-xl opacity-35 scale-110 pointer-events-none select-none"
          />
          <img
            src={cover_image || "/banner-placeholder.png"}
            alt={title}
            className="relative size-full object-contain group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none"
            loading="lazy"
          />

          {/* Badge de Desconto */}
          {discountVal > 0 && (
            <div className="absolute top-2 left-2 z-10">
              <span className="px-2 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-foreground/90 text-background border border-white/20 shadow-xs">
                {discountVal}% OFF
              </span>
            </div>
          )}

          {/* Tag Mecânica (ex: Promoção, Destaque) */}
          {mechanic_label && discountVal === 0 && (
            <div className="absolute top-2 left-2 z-10">
              <span className="px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-foreground/80 text-background/90 border border-white/20">
                {mechanic_label}
              </span>
            </div>
          )}

          {/* Timer de Oferta Relâmpago */}
          {timeLeft && (
            <div className="absolute bottom-2 right-2 z-10">
              <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono font-bold bg-foreground/90 text-background border border-white/20">
                <Clock className="size-3" />
                <span>{timeLeft}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── CORPO COM INFORMAÇÕES DO PRODUTO ──── */}
        <div className="p-4 pb-2 flex-1 flex flex-col justify-between space-y-2 min-h-0">
          <div className="space-y-1">
            {store_name && (
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider line-clamp-1 block">
                {store_name}
              </span>
            )}
            <h3 className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
              {title}
            </h3>
          </div>

          {/* Bloco de Preços */}
          <div className="pt-1">
            {original_price_cents > price_cents && (
              <span className="text-xs text-muted-foreground line-through block font-mono leading-none">
                {formatMoney(original_price_cents)}
              </span>
            )}
            <div className="text-base font-black text-foreground font-mono leading-tight truncate">
              {formatMoney(price_cents)}
              <span className="text-xs text-muted-foreground font-normal ml-1">
                /{selling_unit}
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* CTA Primário Proeminente (Piso 44px - Regra B.22) */}
      <div className="p-4 pt-0">
        <Button
          size="default"
          onClick={handleQuickAdd}
          disabled={isAdding || !in_stock}
          className="w-full h-11 min-h-11 px-4 rounded-lg font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-colors duration-200 motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary gap-2"
          aria-label={`Ver oferta ou adicionar ${title}`}
        >
          {isAdding ? (
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <>
              <span>Ver Oferta</span>
              <ArrowRight className="size-4 shrink-0" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
