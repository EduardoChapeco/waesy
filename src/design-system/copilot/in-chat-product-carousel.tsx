import * as React from "react";
import { ChevronRight, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CarouselProduct {
  id: string;
  title: string;
  price: string;
  imageUrl?: string;
  category?: string;
}

export interface InChatProductCarouselProps {
  title?: string;
  products: CarouselProduct[];
  onSelectProduct?: (product: CarouselProduct) => void;
  className?: string;
}

export function InChatProductCarousel({
  title = "Produtos Sugeridos",
  products,
  onSelectProduct,
  className,
}: InChatProductCarouselProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/70 bg-card overflow-hidden my-2 max-w-full",
        className
      )}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border/50">
        <div className="flex items-center gap-2">
          <ShoppingBag className="size-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">{title}</span>
        </div>
        <span className="text-3xs text-muted-foreground">{products.length} itens</span>
      </div>

      <div className="flex items-stretch gap-3 overflow-x-auto scrollbar-none p-3">
        {products.map((p) => (
          <div
            key={p.id}
            className="flex flex-col justify-between w-40 shrink-0 rounded-lg border border-border/60 bg-background p-2 space-y-2 hover:border-primary/50 transition-colors"
          >
            <div className="aspect-square w-full rounded-md bg-muted/50 overflow-hidden">
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt={p.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xs text-muted-foreground">
                  Sem Foto
                </div>
              )}
            </div>

            <div className="space-y-1">
              {p.category && (
                <span className="text-3xs text-muted-foreground uppercase tracking-wider block truncate">
                  {p.category}
                </span>
              )}
              <h5 className="text-xs font-semibold text-foreground truncate">{p.title}</h5>
              <div className="text-xs font-bold text-foreground font-mono tabular-nums">
                {p.price}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectProduct?.(p)}
              className="w-full min-h-9 px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Ver Detalhes
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
