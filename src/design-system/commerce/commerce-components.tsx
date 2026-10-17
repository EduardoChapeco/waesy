import * as React from "react";
import { ShoppingCart, Tag, Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* 1. PriceBlock                                                              */
/* -------------------------------------------------------------------------- */

export interface PriceBlockProps {
  price: string;
  originalPrice?: string;
  installments?: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function PriceBlock({
  price,
  originalPrice,
  installments,
  size = "default",
  className,
}: PriceBlockProps) {
  const sizeClasses = {
    sm: "text-sm",
    default: "text-base",
    lg: "text-xl",
  }[size];

  return (
    <div className={cn("space-y-1", className)}>
      {originalPrice && (
        <span className="text-2xs line-through text-muted-foreground font-mono tabular-nums block">
          {originalPrice}
        </span>
      )}
      <div className={cn("font-bold text-foreground font-mono tabular-nums", sizeClasses)}>
        {price}
      </div>
      {installments && (
        <span className="text-3xs text-muted-foreground block font-mono">
          {installments}
        </span>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. ProductCard                                                             */
/* -------------------------------------------------------------------------- */

export interface ProductCardProps {
  title: string;
  price: string;
  originalPrice?: string;
  installments?: string;
  imageUrl?: string;
  category?: string;
  discountPercentage?: number;
  onAddToCart?: () => void;
  ctaText?: string;
  className?: string;
}

export function ProductCard({
  title,
  price,
  originalPrice,
  installments,
  imageUrl,
  category,
  discountPercentage,
  onAddToCart,
  ctaText = "Adicionar",
  className,
}: ProductCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border/70 bg-card overflow-hidden hover:border-primary/50 transition-colors",
        className
      )}
    >
      <div className="relative aspect-square w-full bg-muted/40 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            Sem Imagem
          </div>
        )}
        {discountPercentage && (
          <span className="absolute top-2.5 left-2.5 px-2 py-1 rounded-md bg-rose-600 text-primary-foreground text-3xs font-bold font-mono">
            -{discountPercentage}%
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4 gap-3 justify-between">
        <div className="space-y-1">
          {category && (
            <span className="text-3xs font-medium text-muted-foreground uppercase tracking-wider block">
              {category}
            </span>
          )}
          <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">
            {title}
          </h4>
        </div>

        <div className="flex items-end justify-between gap-2 pt-2 border-t border-border/40">
          <PriceBlock
            price={price}
            originalPrice={originalPrice}
            installments={installments}
            size="sm"
          />

          {onAddToCart && (
            <button
              type="button"
              onClick={onAddToCart}
              className="min-h-11 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer shrink-0 flex items-center gap-2"
            >
              <ShoppingCart className="size-3.5" />
              <span>{ctaText}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. CompactProductCard                                                      */
/* -------------------------------------------------------------------------- */

export interface CompactProductCardProps {
  title: string;
  price: string;
  imageUrl?: string;
  quantity?: number;
  onRemove?: () => void;
  className?: string;
}

export function CompactProductCard({
  title,
  price,
  imageUrl,
  quantity,
  onRemove,
  className,
}: CompactProductCardProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-card",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-12 rounded-md bg-muted/50 overflow-hidden shrink-0">
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xs text-muted-foreground">
              Item
            </div>
          )}
        </div>
        <div className="space-y-1 min-w-0">
          <h5 className="text-xs font-semibold text-foreground truncate">{title}</h5>
          <div className="flex items-center gap-2 text-2xs text-muted-foreground">
            <span className="font-mono tabular-nums font-bold text-foreground">{price}</span>
            {quantity !== undefined && <span>• Qtd: {quantity}</span>}
          </div>
        </div>
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-2xs text-muted-foreground hover:text-destructive cursor-pointer p-1"
        >
          Remover
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. PromoBanner                                                             */
/* -------------------------------------------------------------------------- */

export interface PromoBannerProps {
  title: string;
  description: string;
  couponCode?: string;
  onCopyCoupon?: () => void;
  className?: string;
}

export function PromoBanner({
  title,
  description,
  couponCode,
  onCopyCoupon,
  className,
}: PromoBannerProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (couponCode) {
      navigator.clipboard?.writeText(couponCode);
      setCopied(true);
      onCopyCoupon?.();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-primary/20 bg-primary/5",
        className
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Tag className="size-4" />
        </div>
        <div className="space-y-1 min-w-0">
          <h4 className="text-xs font-bold text-foreground">{title}</h4>
          <p className="text-2xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>

      {couponCode && (
        <button
          type="button"
          onClick={handleCopy}
          className="min-h-11 px-3 py-2 rounded-lg border border-primary/30 bg-card hover:bg-muted text-foreground text-2xs font-mono font-semibold flex items-center gap-2 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>{couponCode}</span>
          {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
        </button>
      )}
    </div>
  );
}
