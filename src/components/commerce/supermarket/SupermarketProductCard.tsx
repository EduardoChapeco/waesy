import React from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Minus, ShoppingBag } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SupermarketClubRibbonBadge } from "./SupermarketClubRibbonBadge";
import type { SupermarketProductCardDTO } from "@/services/supermarket.functions";

interface SupermarketProductCardProps {
  product: SupermarketProductCardDTO;
  onAddToCart?: (product: SupermarketProductCardDTO) => void;
  onProductClick?: (product: SupermarketProductCardDTO) => void;
  isMember?: boolean;
  className?: string;
}

export function SupermarketProductCard({
  product,
  onAddToCart,
  onProductClick,
  isMember = false,
  className,
}: SupermarketProductCardProps) {
  // Determinar preço ativo com base em clube ou online
  const effectivePriceCents =
    isMember && product.clubPriceCents && product.clubPriceCents > 0
      ? product.clubPriceCents
      : product.onlineExclusivePriceCents && product.onlineExclusivePriceCents > 0
        ? product.onlineExclusivePriceCents
        : product.priceCents;

  const hasDiscount = Boolean(product.compareAtCents && product.compareAtCents > effectivePriceCents);
  const discountPercent = hasDiscount
    ? Math.round(((product.compareAtCents! - effectivePriceCents) / product.compareAtCents!) * 100)
    : 0;

  const formattedPrice = (effectivePriceCents / 100).toFixed(2).replace(".", ",");
  const formattedComparePrice = product.compareAtCents
    ? (product.compareAtCents / 100).toFixed(2).replace(".", ",")
    : null;

  return (
    <article
      className={cn(
        "group relative flex flex-col justify-between p-3 rounded-2xl bg-card border border-border/60 hover:border-border transition-all select-none overflow-hidden",
        className,
      )}
      data-testid="supermarket-product-card"
    >
      {/* ── Topo: Badges de Clube / Fitas Angulares ── */}
      <div className="absolute top-2 left-2 right-2 z-10 flex items-start justify-between gap-1 pointer-events-none">
        <SupermarketClubRibbonBadge
          rule={product.promotionalRule}
          freshFoodSpecs={product.freshFoodSpecs}
          badges={product.badges}
          clubPriceCents={product.clubPriceCents}
          isMember={isMember}
        />

        {/* Botão de Adição Rápida (+) com piso de 44x44px */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart?.(product);
          }}
          className="size-11 min-w-11 min-h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center pointer-events-auto shadow-sm hover:scale-105 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ml-auto"
          aria-label={`Adicionar ${product.title} ao carrinho`}
        >
          <Plus size={20} weight="bold" />
        </button>
      </div>

      {/* ── Mídia do Produto ── */}
      <div
        onClick={() => onProductClick?.(product)}
        className="w-full aspect-square rounded-xl overflow-hidden bg-muted/40 flex items-center justify-center cursor-pointer pt-6 pb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onProductClick?.(product);
          }
        }}
        aria-label={`Visualizar detalhes de ${product.title}`}
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <ShoppingBag size={48} weight="duotone" className="text-muted-foreground/40" />
        )}
      </div>

      {/* ── Detalhes e Preço ── */}
      <div className="flex flex-col gap-1.5 mt-2 min-w-0">
        {/* Preço Promocional & Riscado */}
        <div className="flex flex-col leading-tight">
          {hasDiscount && formattedComparePrice ? (
            <div className="flex items-center gap-1.5 text-2xs text-muted-foreground">
              <span className="line-through">R$ {formattedComparePrice}</span>
              {discountPercent > 0 ? (
                <span className="px-1 py-0.2 rounded text-3xs font-extrabold bg-destructive/15 text-destructive">
                  -{discountPercent}%
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                "text-base font-extrabold",
                hasDiscount || isMember ? "text-destructive dark:text-red-400" : "text-foreground",
              )}
            >
              R$ {formattedPrice}
            </span>
            <span className="text-2xs text-muted-foreground font-medium">
              /{product.unit}
            </span>
          </div>

          {/* Selo Exclusivo de Clube */}
          {isMember && product.clubPriceCents ? (
            <span className="text-3xs font-bold text-blue-600 dark:text-blue-400">
              Preço exclusivo do Clube
            </span>
          ) : null}
        </div>

        {/* Nome do Produto */}
        <h4 className="text-xs font-semibold text-foreground line-clamp-2">
          <button
            type="button"
            onClick={() => onProductClick?.(product)}
            className="text-left hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            {product.title}
          </button>
        </h4>

        {/* Validade / Estoque Real */}
        {product.promotionalRule?.ends_at ? (
          <span className="text-3xs text-muted-foreground truncate">
            Válido até {new Date(product.promotionalRule.ends_at).toLocaleDateString("pt-BR")}, sujeito a estoque.
          </span>
        ) : null}
      </div>
    </article>
  );
}
