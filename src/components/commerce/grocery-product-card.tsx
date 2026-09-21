import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Minus, ShoppingBag, Tag, Check, ImageOff } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/cart-context";
import { addToCart } from "@/services/cart.functions";
import type { ProductCardDTO } from "@/types/catalog";

interface GroceryProductCardProps {
 product: ProductCardDTO;
 className?: string;
 unitLabel?: string;
 viewMode?: "grid" | "list";
}

export function GroceryProductCard({
 product,
 className,
 unitLabel,
 viewMode = "grid",
}: GroceryProductCardProps) {
 const { cart, refreshCart, updateQty } = useCart();
 const [isAdding, setIsAdding] = useState(false);

 // Find if this product (or its primary variant) is already in the active cart
 const cartItem = cart?.items.find((item) => {
 if (product.variantId) return item.variantId === product.variantId;
 return (item as any).productId === product.id || item.variantId === product.id;
 });

 const currentQty = cartItem?.qty || 0;

 const handleQuickAdd = async (e: React.MouseEvent) => {
 e.preventDefault();
 e.stopPropagation();

 if (isAdding) return;
 setIsAdding(true);

 try {
 await addToCart({
 data: {
 variantId: product.variantId || undefined,
 productId: product.id,
 quantity: 1,
 },
 });

 await refreshCart();
 toast.success(`${product.title} adicionado à sacola!`);
 } catch (err: any) {
 toast.error(err?.message || "Erro ao adicionar ao carrinho.");
 } finally {
 setIsAdding(false);
 }
 };

 const handleIncrement = async (e: React.MouseEvent) => {
 e.preventDefault();
 e.stopPropagation();
 if (!product.variantId || isAdding) return;

 setIsAdding(true);
 try {
 await updateQty(product.variantId, 1);
 } catch (err: any) {
 toast.error(err?.message || "Erro ao atualizar quantidade.");
 } finally {
 setIsAdding(false);
 }
 };

 const handleDecrement = async (e: React.MouseEvent) => {
 e.preventDefault();
 e.stopPropagation();
 if (!product.variantId || isAdding) return;

 setIsAdding(true);
 try {
 await updateQty(product.variantId, -1);
 } catch (err: any) {
 toast.error(err?.message || "Erro ao atualizar quantidade.");
 } finally {
 setIsAdding(false);
 }
 };

 const priceCents = product.priceCents ?? (product as any).price_cents ?? (product as any).price ?? 0;
 const compareAtCents = product.compareAtCents ?? (product as any).compare_at_cents ?? (product as any).compareAtPriceCents;

 // Discount percentage calculation
 const hasDiscount =
 typeof compareAtCents === "number" && compareAtCents > priceCents;
 const discountPercent = hasDiscount
 ? Math.round(((compareAtCents - priceCents) / compareAtCents) * 100)
 : 0;

 if (viewMode === "list") {
 return (
 <div
 className={cn(
 "group relative flex items-stretch w-full h-[140px] sm:h-[150px] rounded-2xl bg-card hover:border-foreground/20 transition-all overflow-hidden p-0",
 className,
 )}
 >
 <Link
 to="/produto/$slug"
 params={{ slug: product.slug }}
 search={product.variantId ? { v: product.variantId } : undefined}
 className="relative w-36 sm:w-44 h-full bg-muted/40 overflow-hidden shrink-0 block focus-visible:outline-none"
 >
 {product.coverUrl ? (
 <img
 src={product.coverUrl}
 alt={product.coverAlt || product.title}
 loading="lazy"
 className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
 />
 ) : (
 <div className="size-full flex items-center justify-center text-muted-foreground">
 <ImageOff className="size-8" />
 </div>
 )}

 {hasDiscount && discountPercent > 0 && (
 <div className="absolute top-2 left-2 z-10">
 <Badge className="bg-destructive text-destructive-foreground text-[10px] font-black px-2 py-0.5 rounded-md">
 -{discountPercent}%
 </Badge>
 </div>
 )}

 {product.isOutOfStock && (
 <div className="absolute inset-0 bg-background/70 backdrop-blur-xs flex items-center justify-center">
 <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-card px-2 py-0.5 rounded-lg ">
 Esgotado
 </span>
 </div>
 )}
 </Link>

 <div className="flex-1 flex flex-col justify-between h-full min-w-0 p-3 sm:p-4">
 <Link
 to="/produto/$slug"
 params={{ slug: product.slug }}
 search={product.variantId ? { v: product.variantId } : undefined}
 className="space-y-1 focus-visible:outline-none block"
 >
 {((product as any).store_name || (product as any).storeName || product.brand) && (
 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate block">
 {(product as any).store_name || (product as any).storeName || product.brand}
 </span>
 )}

 <h3 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
 {product.title}
 </h3>

 {unitLabel && (
 <span className="text-[10px] text-muted-foreground font-medium block">
 {unitLabel}
 </span>
 )}
 </Link>

 <div className="pt-2 flex items-center justify-between gap-2">
 <div className="flex flex-col min-w-0">
 {hasDiscount && typeof compareAtCents === "number" && (
 <span className="text-[10px] text-muted-foreground line-through font-mono">
 {formatMoney(compareAtCents)}
 </span>
 )}
 <span className="font-mono font-black text-xs sm:text-sm text-foreground truncate">
 {formatMoney(priceCents)}
 </span>
 </div>

 <div>
 {currentQty > 0 ? (
 <div className="flex items-center gap-1 border border-primary/30 bg-primary/10 text-primary rounded-xl p-0.5">
 <button
 type="button"
 onClick={handleDecrement}
 disabled={isAdding}
 className="size-5 rounded bg-background hover:bg-background/80 text-primary flex items-center justify-center transition-colors cursor-pointer"
 aria-label="Diminuir quantidade"
 >
 <Minus className="size-2.5" />
 </button>

 <span className="font-mono font-bold text-xs px-1 min-w-[16px] text-center">
 {currentQty}
 </span>

 <button
 type="button"
 onClick={handleIncrement}
 disabled={isAdding}
 className="size-5 rounded bg-background hover:bg-background/80 text-primary flex items-center justify-center transition-colors cursor-pointer"
 aria-label="Aumentar quantidade"
 >
 <Plus className="size-2.5" />
 </button>
 </div>
 ) : product.variantId ? (
 <Button
 size="sm"
 onClick={handleQuickAdd}
 className="rounded-xl h-8 px-2.5 font-bold text-xs gap-1 cursor-pointer"
 >
 <Plus className="size-3.5" />
 <span className="hidden sm:inline">Adicionar</span>
 </Button>
 ) : (
 <Button
 asChild
 size="sm"
 variant="outline"
 className="rounded-xl h-8 px-2.5 font-bold text-xs border-border cursor-pointer"
 >
 <Link
 to="/produto/$slug"
 params={{ slug: product.slug }}
 >
 Opções
 </Link>
 </Button>
 )}
 </div>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div
 className={cn(
 "group relative flex flex-col justify-between rounded-2xl bg-card hover:border-foreground/20 hover: transition-all overflow-hidden p-0",
 className,
 )}
 >
 <div className="flex flex-col flex-1">
 {/* Product Image Container — FULL BLEED at top */}
 <Link
 to="/produto/$slug"
 params={{ slug: product.slug }}
 search={product.variantId ? { v: product.variantId } : undefined}
 className="relative aspect-square w-full overflow-hidden bg-muted/40 block focus-visible:outline-none shrink-0"
 >
 {product.coverUrl ? (
 <img
 src={product.coverUrl}
 alt={product.coverAlt || product.title}
 loading="lazy"
 className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
 />
 ) : (
 <div className="size-full flex items-center justify-center text-muted-foreground">
 <ImageOff className="size-8" />
 </div>
 )}

 {/* Discount Badge */}
 {hasDiscount && discountPercent > 0 && (
 <div className="absolute top-2.5 left-2.5 z-10">
 <Badge className="bg-destructive text-destructive-foreground text-[10px] font-black px-2 py-0.5 rounded-md ">
 -{discountPercent}%
 </Badge>
 </div>
 )}

 {/* Stock out badge */}
 {product.isOutOfStock && (
 <div className="absolute inset-0 bg-background/70 backdrop-blur-xs flex items-center justify-center">
 <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground bg-card px-2.5 py-1 rounded-lg ">
 Esgotado
 </span>
 </div>
 )}
 </Link>

 {/* Product Info with comfortable internal padding */}
 <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
 <Link
 to="/produto/$slug"
 params={{ slug: product.slug }}
 search={product.variantId ? { v: product.variantId } : undefined}
 className="space-y-1 focus-visible:outline-none block"
 >
 {((product as any).store_name || (product as any).storeName || product.brand) && (
 <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
 <span className="truncate text-primary/80">
 {(product as any).store_name || (product as any).storeName || product.brand}
 </span>
 </div>
 )}

 <h3 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 leading-snug h-9 group-hover:text-primary transition-colors">
 {product.title}
 </h3>

 {unitLabel ? (
 <span className="text-[11px] text-muted-foreground font-medium block h-4 truncate">
 {unitLabel}
 </span>
 ) : (
 <div className="h-4" />
 )}
 </Link>

 {/* Pricing & Cart Action Area */}
 <div className="pt-2 mt-2 flex items-center justify-between gap-2 border-t border-border/40">
 <div className="flex flex-col min-w-0 h-9 justify-center">
 {hasDiscount && typeof compareAtCents === "number" && (
 <span className="text-[10px] text-muted-foreground line-through font-mono">
 {formatMoney(compareAtCents)}
 </span>
 )}
 <span className="font-mono font-black text-xs sm:text-sm text-foreground truncate">
 {formatMoney(priceCents)}
 </span>
 </div>

 {/* Stepper / Quick Add Button */}
 <div>
 {currentQty > 0 ? (
 <div className="flex items-center gap-1.5 border border-primary/30 bg-primary/10 text-primary rounded-xl p-1">
 <button
 type="button"
 onClick={handleDecrement}
 disabled={isAdding}
 className="size-6 rounded-lg bg-background hover:bg-background/80 text-primary flex items-center justify-center transition-colors cursor-pointer"
 aria-label="Diminuir quantidade"
 >
 <Minus className="size-3" />
 </button>

 <span className="font-mono font-bold text-xs px-1 min-w-[20px] text-center">
 {currentQty}
 </span>

 <button
 type="button"
 onClick={handleIncrement}
 disabled={isAdding}
 className="size-6 rounded-lg bg-background hover:bg-background/80 text-primary flex items-center justify-center transition-colors cursor-pointer"
 aria-label="Aumentar quantidade"
 >
 <Plus className="size-3" />
 </button>
 </div>
 ) : product.variantId ? (
 <Button
 size="sm"
 onClick={handleQuickAdd}
 className="rounded-xl min-h-[44px] sm:min-h-0 h-11 sm:h-9 px-3.5 font-bold text-xs gap-1.5 cursor-pointer"
 >
 <Plus className="size-4 sm:size-3.5" />
 <span className="hidden sm:inline">Adicionar</span>
 </Button>
 ) : (
 <Button
 asChild
 size="sm"
 variant="outline"
 className="rounded-xl min-h-[44px] sm:min-h-0 h-11 sm:h-9 px-3.5 font-bold text-xs border-border cursor-pointer"
 >
 <Link
 to="/produto/$slug"
 params={{ slug: product.slug }}
 aria-label={`Ver opções de ${product.title}`}
 >
 Opções
 </Link>
 </Button>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
