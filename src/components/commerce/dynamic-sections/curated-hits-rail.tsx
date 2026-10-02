import * as React from "react";
import { Layers, Plus, TrendingUp, Flame } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface HitProductItem {
 id: string;
 rank: number;
 name: string;
 priceCents: number;
 originalPriceCents?: number;
 description: string;
 imageUrl?: string;
 badge?: string;
 storeName?: string;
}

export interface CuratedHitsRailProps {
 title?: string;
 subtitle?: string;
 savingsText?: string;
 items?: HitProductItem[];
 products?: any[];
 onQuickAdd?: (item: HitProductItem) => void;
}

export function CuratedHitsRailSection({
 title = "Mais Pedidos da Região",
 subtitle = "Os pratos e produtos favoritos dos clientes com entrega rápida e descontos exclusivos.",
 savingsText = "Economize nos itens mais bem avaliados deste mês.",
 items,
 products,
 resolvedProducts,
 onQuickAdd,
}: CuratedHitsRailProps & { resolvedProducts?: any[] }) {
 const effectiveProducts = products || resolvedProducts;

 const displayItems = React.useMemo(() => {
 if (items && items.length > 0) return items;
 if (effectiveProducts && effectiveProducts.length > 0) {
 return effectiveProducts.slice(0, 10).map((p: any, idx: number) => ({
 id: p.id,
 rank: idx + 1,
 name: p.title || p.name,
 priceCents: p.price_cents || p.priceCents || 0,
 originalPriceCents: p.compare_at_cents || p.originalPriceCents || undefined,
 description: p.description || p.short_description || "",
 imageUrl: p.media_urls?.[0] || p.image_url || p.imageUrl || p.cover_image,
 badge: idx === 0 ? "Mais Vendido" : idx === 1 ? "Destaque" : undefined,
 storeName: p.store?.name || p.brand || undefined,
 }));
 }
 return [];
 }, [effectiveProducts, items]);

 if (displayItems.length === 0) {
 return null;
 }

 const formatPrice = (cents: number) => {
 return new Intl.NumberFormat("pt-BR", {
 style: "currency",
 currency: "BRL",
 }).format(cents / 100);
 };

 const calculateDiscountPercent = (original?: number, current?: number) => {
 if (!original || !current || original <= current) return null;
 return Math.round(((original - current) / original) * 100);
 };

 return (
 <section className="py-10 bg-muted/20 w-full">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
 {/* Cabeçalho */}
 <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/60 pb-4">
 <div className="space-y-1">
 <div className="flex items-center gap-2 text-xs font-semibold text-primary">
 <Flame className="size-4" />
 <span className="uppercase tracking-wider">Alta Demanda</span>
 </div>
 <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{title}</h2>
 {subtitle && <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>}
 </div>

 {savingsText && (
 <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary font-semibold max-w-xs">
 {savingsText}
 </div>
 )}
 </div>

 {/* Grid de Cards com Snap Scroll */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {displayItems.map((item) => {
 const discount = calculateDiscountPercent(item.originalPriceCents, item.priceCents);

 return (
 <div
 key={item.id}
 className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-2xs group hover:border-primary/40 transition-all flex flex-col justify-between"
 >
 {/* Imagem do Produto com Badge de Ranking */}
 <div className="aspect-4/3 overflow-hidden bg-muted relative">
 {item.imageUrl && (
 <img
 src={item.imageUrl}
 alt={item.name}
 className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
 />
 )}

 {/* Badge de Ranking Numérico (#1, #2, #3) */}
 <div className="absolute top-2.5 left-2.5">
 <span className="size-7 rounded-full bg-foreground text-background font-bold text-xs flex items-center justify-center shadow-md font-mono">
 #{item.rank}
 </span>
 </div>

 {discount && (
 <div className="absolute top-2.5 right-2.5">
 <Badge className="bg-rose-500 text-white font-bold text-[10px] shadow-sm">
 -{discount}%
 </Badge>
 </div>
 )}
 </div>

 {/* Informações e Botão de Ação */}
 <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
 <div className="space-y-1">
 {item.storeName && (
 <span className="text-[10px] font-semibold text-muted-foreground block truncate">
 {item.storeName}
 </span>
 )}
 <h3 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
 {item.name}
 </h3>
 <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
 {item.description}
 </p>
 </div>

 <div className="pt-2 border-t border-border/60 flex items-center justify-between">
 <div>
 {item.originalPriceCents && (
 <span className="text-[10px] text-muted-foreground line-through block font-mono">
 {formatPrice(item.originalPriceCents)}
 </span>
 )}
 <span className="text-sm font-bold text-foreground font-mono">
 {formatPrice(item.priceCents)}
 </span>
 </div>

 <Button
 type="button"
 size="sm"
 onClick={() => onQuickAdd?.(item)}
 className="h-8 w-8 rounded-full p-0 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
 title="Adicionar à Sacola"
 >
 <Plus className="size-4" />
 </Button>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </section>
 );
}
