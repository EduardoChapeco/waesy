import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { X, Minus, Plus, ShoppingBag, ArrowRight, SlidersHorizontal, Package, Layers } from 'lucide-react';
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCartContext } from "@/lib/cart-context";
import { cn } from "@/lib/utils";
import { PriceDisplay } from "./price-display";
import { Surface } from "@/components/ui/surface";
import { CartItemEditDrawer } from "./cart-item-edit-drawer";

export function CartSheet() {
 const {
 globalCarts,
 isCartOpen,
 setIsCartOpen,
 updateQty,
 removeItem,
 isCartUpdating,
 } = useCartContext();
 const router = useRouter();

 const [editingItem, setEditingItem] = useState<any | null>(null);

 const handleNavigateToCheckoutHub = (e: React.MouseEvent) => {
 e.preventDefault();
 setIsCartOpen(false);
 router.navigate({ to: "/checkout" });
 };

 const handleNavigateToCatalog = (e: React.MouseEvent) => {
 e.preventDefault();
 setIsCartOpen(false);
 router.navigate({ to: "/mercado" });
 };

 const totalItemCount = globalCarts.reduce((acc, c) => acc + c.itemCount, 0);
 const globalTotalCents = globalCarts.reduce(
 (acc, c) => acc + (c.totalCents - c.shippingCents),
 0,
 );

 return (
 <>
 <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
 <SheetContent
 side="right" size="wide" className="w-full sm:max-w-lg md:max-w-xl flex flex-col p-0 bg-background border-l border-border/60 max-sm:!inset-0 max-sm:!h-[100dvh] max-sm:!w-full max-sm:rounded-none max-sm:border-none"
 >
 {/* ── CABEÇALHO DO CARRINHO ── */}
 <SheetHeader className="px-6 py-4 bg-card/60 backdrop-blur-md shrink-0">
 <SheetTitle className="flex items-center justify-between font-bold text-foreground text-xl">
 <div className="flex items-center gap-2.5">
 <div className="size-9 rounded-xl bg-foreground text-background flex items-center justify-center ">
 <ShoppingBag className="size-5" />
 </div>
 <span>Meu Carrinho</span>
 {totalItemCount > 0 && (
 <span className="rounded-full bg-primary/15 text-primary border border-primary/30 px-2.5 py-0.5 text-xs font-mono font-bold">
 {totalItemCount}
 </span>
 )}
 </div>
 </SheetTitle>
 </SheetHeader>

 {/* ── CORPO COM SCROLL SUAVE ── */}
 <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 bg-background scrollbar-none">
 {globalCarts.length === 0 ? (
 <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-4">
 <div className="size-24 rounded-2xl border-0 bg-muted/20 flex items-center justify-center text-muted-foreground/60 mb-2">
 <ShoppingBag className="size-10" />
 </div>
 <h3 className="font-bold text-xl text-foreground">Sua sacola está vazia</h3>
 <p className="font-sans text-xs text-muted-foreground max-w-[260px]">
 Explore o mercado local, descubra produtos incríveis e faça seus pedidos.
 </p>
 <Button
 onClick={handleNavigateToCatalog}
 className="bg-foreground text-background rounded-xl font-bold text-xs px-6 h-10 cursor-pointer hover:bg-foreground/90 transition-all"
 >
 Explorar Mercado
 </Button>
 </div>
 ) : (
 <div className="flex flex-col gap-5">
 {globalCarts.map((storeCart, idx) => (
 <Surface
 key={storeCart.id}
 variant="default"
 className="overflow-hidden rounded-2xl "
 >
 {/* Cabeçalho da Loja / Pacote */}
 <div className="bg-muted/40 px-4 py-2.5 flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 {storeCart.storeLogoUrl ? (
 <img
 src={storeCart.storeLogoUrl}
 alt={storeCart.storeName}
 className="size-7 rounded-lg object-cover "
 />
 ) : (
 <div className="size-7 rounded-lg bg-card flex items-center justify-center text-[10px] font-bold text-foreground">
 {storeCart.storeName?.substring(0, 2).toUpperCase()}
 </div>
 )}
 <div>
 <h4 className="text-xs font-bold text-foreground leading-tight">
 {storeCart.storeName}
 </h4>
 <span className="text-[10px] font-mono text-muted-foreground">
 Pacote {idx + 1}
 </span>
 </div>
 </div>

 <span className="text-[11px] font-mono font-bold text-foreground">
 {formatMoney(storeCart.totalCents - storeCart.shippingCents)}
 </span>
 </div>

 {/* Lista de Itens do Pacote */}
 <div className="p-4 flex flex-col gap-4 divide-y divide-border/40">
 {storeCart.items.map((item: any) => (
 <div
 key={item.id}
 className={cn(
 "pt-3 first:pt-0 flex gap-3.5 items-start",
 isCartUpdating && "opacity-60 pointer-events-none",
 )}
 >
 {/* ── FOTO DO PRODUTO MAIOR & NÍTIDA (96px - 112px) ── */}
 <div className="size-24 sm:size-28 flex-shrink-0 overflow-hidden rounded-2xl bg-muted/20 flex items-center justify-center relative group">
 {item.coverUrl ? (
 <img
 src={item.coverUrl}
 alt={item.productTitle}
 className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
 />
 ) : (
 <Package className="size-8 text-muted-foreground/50" />
 )}
 </div>

 {/* ── CONTEÚDO & CONTROLES DO ITEM ── */}
 <div className="flex flex-1 flex-col min-w-0 min-h-[96px] justify-between">
 <div>
 <div className="flex justify-between items-start gap-2">
 <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 leading-snug">
 {item.productTitle}
 </h4>
 <button
 type="button"
 onClick={() => removeItem(item.id)}
 className="p-1 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 cursor-pointer"
 title="Remover item"
 aria-label="Remover item"
 >
 <X className="size-4" />
 </button>
 </div>

 {/* Variações e Atributos */}
 {Object.entries(item.variantAttributes || {}).length > 0 && (
 <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
 {Object.entries(item.variantAttributes || {})
 .map(([k, v]) => `${k}: ${v}`)
 .join(" • ")}
 </p>
 )}

 {/* Modificadores e Adicionais Selecionados */}
 {item.selectedOptionsLabels && item.selectedOptionsLabels.length > 0 && (
 <div className="flex flex-wrap gap-1 mt-1.5">
 {item.selectedOptionsLabels.map((lbl: string, lIdx: number) => (
 <span
 key={lIdx}
 className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20"
 >
 +{lbl}
 </span>
 ))}
 </div>
 )}

 {/* ── BOTÃO DELICADO: EDITAR PRODUTO / ADICIONAIS / OPÇÕES ── */}
 <div className="pt-1.5">
 <button
 type="button"
 onClick={() => setEditingItem(item)}
 className="inline-flex items-center gap-1 text-[11px] font-bold text-foreground/80 hover:text-foreground bg-muted/60 hover:bg-muted px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
 >
 <SlidersHorizontal className="size-3" />
 <span>Editar opções</span>
 </button>
 </div>
 </div>

 {/* ── CONTROLES DELICADOS DE QUANTIDADE & PREÇO ── */}
 <div className="flex items-center justify-between pt-2 mt-auto ">
 <div className="flex items-center rounded-xl bg-card p-0.5 ">
 <button
 type="button"
 className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 disabled:opacity-30 transition-all cursor-pointer"
 onClick={() => updateQty(item.variantId, -1)}
 disabled={item.qty <= 1}
 aria-label="Diminuir quantidade"
 >
 <Minus className="size-3" />
 </button>
 <span className="w-7 text-center text-xs font-mono font-bold text-foreground">
 {item.qty}
 </span>
 <button
 type="button"
 className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 disabled:opacity-30 transition-all cursor-pointer"
 onClick={() => updateQty(item.variantId, 1)}
 disabled={item.isOutOfStock}
 aria-label="Aumentar quantidade"
 >
 <Plus className="size-3" />
 </button>
 </div>

 <div className="text-right">
 <PriceDisplay
 amountCents={item.priceCents * item.qty}
 size="sm"
 className="text-foreground font-black font-mono text-sm"
 />
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 </Surface>
 ))}
 </div>
 )}
 </div>

 {/* ── RODAPÉ FIXO DO CARRINHO ── */}
 {globalCarts.length > 0 && (
 <div className="bg-card/90 backdrop-blur-md p-5 pb-safe z-10 shrink-0 space-y-3 border-t border-border/60">
 <div className="space-y-1">
 <div className="flex items-center justify-between font-bold text-foreground">
 <span className="text-xs uppercase tracking-wider text-muted-foreground">
 Subtotal Geral
 </span>
 <span className="text-xl font-black font-mono text-foreground">
 {formatMoney(globalTotalCents)}
 </span>
 </div>
 <p className="text-[11px] text-muted-foreground">
 * O frete e opções de entrega serão calculados no caixa.
 </p>
 </div>

 <Button
 size="lg"
 className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-bold text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
 onClick={handleNavigateToCheckoutHub}
 disabled={isCartUpdating}
 >
 <span>Finalizar Pedido</span>
 <ArrowRight className="size-4" />
 </Button>
 </div>
 )}
 </SheetContent>
 </Sheet>

 {/* ── DRAWER FULL DE EDIÇÃO DE PRODUTO DO CARRINHO ── */}
 <CartItemEditDrawer
 open={Boolean(editingItem)}
 onOpenChange={(open) => {
 if (!open) setEditingItem(null);
 }}
 item={editingItem}
 />
 </>
 );
}
