import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ProductGridSkeleton } from "@/components/state/loading";
import { EmptyState, UnconfiguredState } from "@/components/state/states";
import { DynamicProductCard } from "@/components/commerce/dynamic-product-card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { Plus, ShoppingCart } from "lucide-react";
import type { ProductListResult, ProductCardDTO } from "@/types/catalog";
import { addToCart } from "@/services/cart.functions";
import { useCartContext } from "@/lib/cart-context";
import { toast } from "sonner";

export interface ProductGridProps {
  isLoading?: boolean;
  result: ProductListResult;
  viewMode?: "grid" | "list";
}

export function ProductGrid({
  isLoading,
  result,
  viewMode = "grid",
}: ProductGridProps) {
  const { setCartData, setIsCartOpen } = useCartContext();
  const [addingId, setAddingId] = useState<string | null>(null);

  if (isLoading) {
    return <ProductGridSkeleton count={8} />;
  }

  if (result.status === "unconfigured") {
    return <UnconfiguredState title="Catálogo não disponível" description={result.reason} />;
  }

  if (
    result.status === "empty" ||
    (!("data" in result)) ||
    (!result.data) ||
    result.data.length === 0
  ) {
    return (
      <EmptyState
        title="Nenhum produto publicado ainda"
        description="Assim que a loja publicar os primeiros produtos, eles aparecerão aqui."
      />
    );
  }

  const handleQuickAdd = async (product: ProductCardDTO) => {
    setAddingId(product.id);
    try {
      const res = await addToCart({ data: { productId: product.id, quantity: 1 } });
      if (res?.cart) {
        setCartData(res.cart as any, (res as any).globalCarts as any);
      }
      toast.success(`${product.title} adicionado à sacola!`);
      setIsCartOpen(true);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao adicionar produto.");
    } finally {
      setAddingId(null);
    }
  };

  if (viewMode === "list") {
    return (
      <div className="flex flex-col space-y-3 w-full">
        {result.data.map((product) => {
          const hasDiscount = product.compareAtCents && product.compareAtCents > product.priceCents;
          const discountPercent = hasDiscount
            ? Math.round(((product.compareAtCents! - product.priceCents) / product.compareAtCents!) * 100)
            : 0;
          const isAddingThis = addingId === product.id;

          return (
            <div
              key={product.id}
              className="group flex items-stretch justify-between rounded-lg bg-card hover:border-foreground/30 transition-colors content-auto-card overflow-hidden w-full h-36 sm:h-40 p-0"
            >
              {/* Esquerda: Imagem FULL BLEED */}
              <Link
                to="/produto/$slug"
                params={{ slug: product.slug }}
                className="relative w-36 sm:w-44 h-full bg-muted shrink-0 overflow-hidden block focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {product.coverUrl ? (
                  <img
                    src={product.coverUrl}
                    alt={product.title}
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="size-full flex items-center justify-center text-muted-foreground/40">
                    <ShoppingCart className="size-8 stroke-1" />
                  </div>
                )}

                {discountPercent > 0 && (
                  <div className="absolute top-2 left-2 z-10">
                    <Badge className="bg-foreground text-background font-mono text-xs font-bold px-2 py-1 rounded-md border border-border">
                      -{discountPercent}%
                    </Badge>
                  </div>
                )}
              </Link>

              {/* Direita: Informações de Texto e Preço com Padding Interno */}
              <div className="flex-1 flex flex-col justify-between h-full min-w-0 p-3 sm:p-4">
                <Link
                  to="/produto/$slug"
                  params={{ slug: product.slug }}
                  className="space-y-1 cursor-pointer block min-w-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    {product.isBoosted && (
                      <Badge variant="outline" className="text-xs uppercase font-mono font-bold rounded-md">
                        Destaque
                      </Badge>
                    )}
                    {product.brand && (
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">
                        {product.brand}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-xs sm:text-sm text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {product.title}
                  </h3>

                  {product.variantName && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {product.variantName}
                    </p>
                  )}
                </Link>

                <div className="flex items-end justify-between gap-2 pt-1">
                  <div className="min-w-0">
                    {hasDiscount && (
                      <span className="font-mono text-xs text-muted-foreground line-through block leading-none">
                        {formatMoney(product.compareAtCents!)}
                      </span>
                    )}
                    <span className="font-mono font-black text-xs sm:text-sm text-foreground leading-tight">
                      {formatMoney(product.priceCents)}
                    </span>
                  </div>

                  <button /* focus-visible: */
                    type="button"
                    onClick={() => handleQuickAdd(product)} /* focus-visible:ring-2 */
                    disabled={isAddingThis}
                    className="size-11 rounded-lg bg-foreground text-background flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    aria-label={`Adicionar ${product.title} à sacola`}
                  >
                    {isAddingThis ? (
                      <div className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 w-full">
      {result.data.map((product) => (
        <DynamicProductCard
          key={product.id}
          product={product}
          onQuickAdd={handleQuickAdd}
          isQuickAdding={addingId === product.id}
        />
      ))}
    </div>
  );
}
