import React from "react";
import { Sparkles, ShoppingBag, ArrowRight, Star } from "lucide-react";
import { formatMoney } from "@/lib/money";

export interface AppHomeFeedProduct {
  id: string;
  title: string;
  slug: string;
  priceCents: number;
  compareAtCents?: number | null;
  coverUrl?: string | null;
}

export interface AppHomeFeedProps {
  appName: string;
  themeColor: string;
  bannerTitle?: string;
  bannerSubtitle?: string;
  products?: AppHomeFeedProduct[];
  onProductClick?: (productId: string) => void;
  onAddToCart?: (productId: string) => void;
}

export const AppHomeFeed: React.FC<AppHomeFeedProps> = ({
  appName,
  themeColor = "#0F172A",
  bannerTitle = "Novidades Exclusivas no App",
  bannerSubtitle = "Aproveite condições especiais e entregas rápidas na sua cidade.",
  products = [],
  onProductClick,
  onAddToCart,
}) => {
  const highlights = [
    { label: "Destaques", active: true },
    { label: "Ofertas", active: false },
    { label: "Mais Pedidos", active: false },
    { label: "Novidades", active: false },
  ];

  return (
    <div className="w-full space-y-4 pb-4 select-none">
      {/* Story / Highlights Bar */}
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar px-1 py-1">
        {highlights.map((h, i) => (
          <div key={i} className="flex flex-col items-center gap-1 shrink-0 cursor-pointer">
            <div
              style={{
                borderColor: h.active ? themeColor : "transparent",
                borderWidth: 2,
              }}
              className="size-13 rounded-full p-1 transition-transform active:scale-95 flex items-center justify-center bg-muted/60"
            >
              <div
                style={{ backgroundColor: h.active ? themeColor : undefined }}
                className={`size-full rounded-full flex items-center justify-center text-xs font-bold ${
                  h.active ? "text-white" : "text-muted-foreground bg-muted"
                }`}
              >
                {h.label.slice(0, 2).toUpperCase()}
              </div>
            </div>
            <span className="text-xs font-medium text-foreground tracking-tight truncate max-w-14">
              {h.label}
            </span>
          </div>
        ))}
      </div>

      {/* Hero Promo Banner */}
      <div
        style={{
          background: `linear-gradient(135deg, ${themeColor} 0%, #000000 100%)`,
        }}
        className="rounded-lg p-4 text-white space-y-2 relative overflow-hidden shadow-xs border border-white/10"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm flex items-center gap-1">
            <Sparkles className="size-3" />
            <span>Exclusivo App</span>
          </span>
        </div>

        <div className="space-y-1">
          <h4 className="font-bold text-sm leading-snug line-clamp-1">{bannerTitle}</h4>
          <p className="text-xs text-white/80 line-clamp-2 leading-relaxed">
            {bannerSubtitle}
          </p>
        </div>

        <div className="pt-1 flex items-center justify-between text-xs font-semibold text-white/90">
          <span>Ver catálogo completo</span>
          <ArrowRight className="size-3.5" />
        </div>
      </div>

      {/* Grid de Produtos Reais */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-foreground tracking-tight">
            Produtos em Destaque
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {products.length} itens
          </span>
        </div>

        {products.length === 0 ? (
          <div className="p-4 rounded-lg border border-dashed border-border text-center space-y-1">
            <ShoppingBag className="size-6 text-muted-foreground/60 mx-auto" />
            <p className="text-xs font-medium text-muted-foreground">
              Nenhum produto cadastrado no catálogo ativo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((prod) => (
              <div
                key={prod.id}
                onClick={() => onProductClick?.(prod.id)}
                className="bg-card border border-border/70 rounded-lg p-3 flex flex-col justify-between space-y-2 transition-all hover:border-primary/40 cursor-pointer shadow-2xs group"
              >
                <div className="aspect-square w-full rounded-lg bg-muted overflow-hidden relative flex items-center justify-center">
                  {prod.coverUrl ? (
                    <img
                      src={prod.coverUrl}
                      alt={prod.title}
                      className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <ShoppingBag className="size-6 text-muted-foreground/50" />
                  )}
                  {prod.compareAtCents && prod.compareAtCents > prod.priceCents && (
                    <span className="absolute top-1 left-1 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-md">
                      Oferta
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h5 className="font-semibold text-xs text-foreground truncate" title={prod.title}>
                    {prod.title}
                  </h5>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-xs text-foreground">
                      {formatMoney(prod.priceCents)}
                    </span>
                    {prod.compareAtCents && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatMoney(prod.compareAtCents)}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart?.(prod.id);
                  }}
                  style={{ backgroundColor: themeColor }}
                  className="w-full h-8 rounded-lg text-white font-semibold text-xs flex items-center justify-center gap-1 active:scale-95 transition-transform"
                >
                  <ShoppingBag className="size-3" />
                  <span>Adicionar</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
