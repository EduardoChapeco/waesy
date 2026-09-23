import * as React from "react";
import { useState } from "react";
import { ShoppingBag, Plus, Clock, MapPin, QrCode, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface StreamlinedProductItem {
 id: string;
 name: string;
 priceCents: number;
 description: string;
 imageUrl?: string;
 badge?: string;
 category: string;
}

export interface FoodMenuStreamlinedProps {
 storeName?: string;
 openingHoursText?: string;
 isOpenNow?: boolean;
 categories?: string[];
 items?: StreamlinedProductItem[];
 products?: any[];
 onAddToCart?: (item: StreamlinedProductItem) => void;
 onOpenCart?: () => void;
}

import { EmptyState } from "@/components/state/states";

export function FoodMenuStreamlinedSection({
 storeName,
 openingHoursText,
 isOpenNow = true,
 categories,
 items,
 products,
 resolvedProducts,
 onAddToCart,
 onOpenCart,
}: FoodMenuStreamlinedProps & { resolvedProducts?: any[] }) {
 const [activeCategory, setActiveCategory] = useState("Todos");
 const [cartItemsCount, setCartItemsCount] = useState(0);
 const [cartTotalCents, setCartTotalCents] = useState(0);

 const effectiveProducts = products || resolvedProducts;

 const displayItems = React.useMemo(() => {
 if (items && items.length > 0) return items;
 if (effectiveProducts && effectiveProducts.length > 0) {
 return effectiveProducts.map((p: any) => ({
 id: p.id,
 name: p.title || p.name,
 priceCents: p.price_cents || p.priceCents || 0,
 description: p.description || p.short_description || "",
 imageUrl: p.media_urls?.[0] || p.image_url || p.imageUrl || p.cover_image,
 category: p.category?.name || p.category_name || "Cardápio Principal",
 badge: p.is_featured ? "Destaque" : undefined,
 }));
 }
 return [];
 }, [effectiveProducts, items]);

 const displayCategories = React.useMemo(() => {
 if (categories && categories.length > 0) return categories;
 const cats = Array.from(new Set(displayItems.map((i: any) => i.category)));
 return ["Todos", ...cats];
 }, [categories, displayItems]);

 const filteredItems = displayItems.filter(
 (item) => activeCategory === "Todos" || item.category === activeCategory,
 );

 if (displayItems.length === 0) {
 return (
 <section className="py-8 bg-background w-full">
 <div className="max-w-2xl mx-auto px-4 sm:px-6">
 <EmptyState
 title="Cardápio em Preparação"
 description="Os itens deste cardápio estão sendo organizados pelo estabelecimento."
 />
 </div>
 </section>
 );
 }

 const formatPrice = (cents: number) => {
 return new Intl.NumberFormat("pt-BR", {
 style: "currency",
 currency: "BRL",
 }).format(cents / 100);
 };

 const handleAddItem = (item: StreamlinedProductItem) => {
 setCartItemsCount((prev) => prev + 1);
 setCartTotalCents((prev) => prev + item.priceCents);
 onAddToCart?.(item);
 };

 return (
 <section className="py-6 bg-background w-full relative">
 <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6 pb-24">
 {/* ── 1. Header Compacto do Estabelecimento ── */}
 <div className="flex items-center justify-between border-b border-border/60 pb-4">
 <div className="space-y-1">
 <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
 {storeName}
 </h1>
 <div className="flex items-center gap-2 text-xs text-muted-foreground">
 <span
 className={cn(
 "size-2 rounded-full inline-block",
 isOpenNow ? "bg-emerald-500" : "bg-rose-500"
 )}
 />
 <span className="font-semibold text-foreground">
 {isOpenNow ? "Aberto Agora" : "Fechado"}
 </span>
 <span>•</span>
 <span className="font-mono">{openingHoursText}</span>
 </div>
 </div>

 <Badge variant="outline" className="text-[10px] font-mono border-border/80 px-2.5 py-1">
 Cardápio Digital
 </Badge>
 </div>

 {/* ── 2. Barra de Categorias Horizontal (Pills de Navegação) ── */}
 <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md py-2 px-0 border-b border-border/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar ">
 {displayCategories.map((cat) => {
 const isSelected = activeCategory === cat;
 return (
 <button
 key={cat}
 type="button"
 onClick={() => setActiveCategory(cat)}
 className={cn(
 "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer",
 isSelected
 ? "bg-primary text-primary-foreground shadow-2xs"
 : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
 )}
 >
 {cat}
 </button>
 );
 })}
 </div>

 {/* ── 3. Lista Vertical Compacta de Produtos ── */}
 <div className="space-y-3">
 {filteredItems.map((item) => (
 <div
 key={item.id}
 className="group p-3.5 rounded-2xl border border-border/70 bg-card hover:border-primary/40 transition-all flex items-center justify-between gap-4 shadow-2xs"
 >
 {/* Informações do Item */}
 <div className="flex-1 min-w-0 space-y-1">
 <div className="flex items-center gap-2">
 <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
 {item.name}
 </h3>
 {item.badge && (
 <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0 font-medium">
 {item.badge}
 </Badge>
 )}
 </div>

 <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
 {item.description}
 </p>

 <div className="pt-0.5">
 <span className="text-sm font-bold text-foreground font-mono">
 {formatPrice(item.priceCents)}
 </span>
 </div>
 </div>

 {/* Miniatura Quadrada com Botão '+' Sobreposto */}
 {item.imageUrl && (
 <div className="relative size-20 sm:size-22 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/60">
 <img
 src={item.imageUrl}
 alt={item.name}
 className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
 />
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 handleAddItem(item);
 }}
 className="absolute bottom-1.5 right-1.5 size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-md hover:scale-110 active:scale-95 transition-all"
 title="Adicionar ao Pedido"
 >
 <Plus className="size-3.5" />
 </button>
 </div>
 )}
 </div>
 ))}
 </div>
 </div>

 {/* ── 4. Barra Flutuante Inferior Fixa na Thumb Zone (Padrão iFood / Rocco) ── */}
 {cartItemsCount > 0 && (
 <div className="fixed bottom-4 inset-x-4 max-w-lg mx-auto z-40 animate-in slide-in-from-bottom-3 duration-200">
 <div className="p-3 rounded-2xl bg-foreground text-background shadow-2xl flex items-center justify-between gap-4 border border-foreground/10">
 <div className="flex items-center gap-3 pl-2">
 <div className="size-8 rounded-full bg-background/20 flex items-center justify-center font-bold text-xs">
 {cartItemsCount}
 </div>
 <div>
 <span className="text-[10px] text-background/70 block uppercase font-mono tracking-wider">
 Subtotal
 </span>
 <span className="text-sm font-bold font-mono">
 {formatPrice(cartTotalCents)}
 </span>
 </div>
 </div>

 <Button
 type="button"
 onClick={onOpenCart}
 className="h-10 px-6 rounded-xl font-bold text-xs bg-background text-foreground hover:bg-background/90 cursor-pointer shadow-xs gap-2"
 >
 <span>Ver Sacola / Pedir</span>
 </Button>
 </div>
 </div>
 )}
 </section>
 );
}
