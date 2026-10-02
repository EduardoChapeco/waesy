import * as React from "react";
import { useState } from "react";
import { UtensilsCrossed, Plus, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCart } from "@/lib/cart-context";
import { addToCart } from "@/services/cart.functions";

import { EmptyState } from "@/components/state/states";

export interface FoodMenuItem {
 id: string;
 name: string;
 description: string;
 priceCents: number;
 imageUrl?: string;
 badge?: string;
 isSpicy?: boolean;
 isVegetarian?: boolean;
}

export interface FoodMenuCategory {
 id: string;
 title: string;
 items: FoodMenuItem[];
}

export interface FoodMenuTabsProps {
 title?: string;
 subtitle?: string;
 categories?: FoodMenuCategory[];
 products?: any[];
 resolvedProducts?: any[];
 onSelectItem?: (item: FoodMenuItem) => void;
}

export function FoodMenuTabsSection({
 title = "Cardápio do Restaurante",
 subtitle = "Ingredientes frescos selecionados diariamente pelo nosso chef.",
 categories,
 products,
 resolvedProducts,
 onSelectItem,
}: FoodMenuTabsProps) {
 const { refreshCart, setIsCartOpen } = useCart();
 const [addingItemId, setAddingItemId] = useState<string | null>(null);

 const handleAddDirect = async (item: FoodMenuItem) => {
 if (onSelectItem) {
 onSelectItem(item);
 return;
 }

 setAddingItemId(item.id);
 try {
 await addToCart({
 data: {
 productId: item.id,
 quantity: 1,
 },
 });
 await refreshCart();
 toast.success(`${item.name} adicionado à sacola!`);
 setIsCartOpen(true);
 } catch (err: any) {
 toast.error(err?.message || "Erro ao adicionar item à sacola.");
 } finally {
 setAddingItemId(null);
 }
 };
 // Deriva categorias e itens dinamicamente dos produtos reais da loja caso não informados
 const effectiveCategories = React.useMemo(() => {
 if (categories && categories.length > 0) return categories;
 const prods = (products || resolvedProducts || []) as any[];
 if (prods.length === 0) return [];

 const map = new Map<string, FoodMenuCategory>();
 for (const p of prods) {
 const catName = p.category?.name || p.category_name || "Destaques";
 const catId = p.category?.slug || catName.toLowerCase().replace(/\s+/g, "-");
 if (!map.has(catId)) {
 map.set(catId, { id: catId, title: catName, items: [] });
 }
 map.get(catId)!.items.push({
 id: p.id,
 name: p.title || p.name,
 description: p.description || p.short_description || "",
 priceCents: p.price_cents || p.priceCents || 0,
 imageUrl: p.media_urls?.[0] || p.image_url || p.imageUrl || undefined,
 badge: p.is_featured ? "Destaque" : undefined,
 });
 }
 return Array.from(map.values());
 }, [categories, products, resolvedProducts]);

 const [activeTab, setActiveTab] = useState(effectiveCategories[0]?.id || "");

 React.useEffect(() => {
 if (effectiveCategories.length > 0 && !effectiveCategories.some((c) => c.id === activeTab)) {
 setActiveTab(effectiveCategories[0].id);
 }
 }, [effectiveCategories, activeTab]);

 const currentCategory =
 effectiveCategories.find((c) => c.id === activeTab) || effectiveCategories[0];

 if (effectiveCategories.length === 0) {
 return (
 <section className="py-12 bg-background w-full">
 <div className="max-w-6xl mx-auto px-4 sm:px-6">
 <EmptyState
 title="Cardápio em Atualização"
 description="Os itens e pratos do cardápio estão sendo preparados pelo estabelecimento."
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

 return (
 <section className="py-12 bg-background w-full">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
 {/* Cabeçalho Limpo */}
 <div className="text-center max-w-2xl mx-auto space-y-2">
 <Badge variant="outline" className="text-[11px] font-mono border-border/80 text-muted-foreground">
 Gastronomia
 </Badge>
 <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
 {title}
 </h2>
 {subtitle && <p className="text-sm text-muted-foreground leading-relaxed">{subtitle}</p>}
 </div>

 {/* Abas de Categorias */}
 <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar pb-2 ">
 {effectiveCategories.map((cat) => {
 const isSelected = activeTab === cat.id;
 return (
 <button
 key={cat.id}
 type="button"
 onClick={() => setActiveTab(cat.id)}
 className={cn(
 "px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer",
 isSelected
 ? "bg-primary text-primary-foreground shadow-2xs"
 : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
 )}
 >
 {cat.title}
 </button>
 );
 })}
 </div>

 {/* Grid de Pratos do Cardápio */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {currentCategory?.items.map((item) => (
 <div
 key={item.id}
 className="group p-4 rounded-lg border border-border/80 bg-card hover:border-primary/40 transition-all flex items-start gap-4 shadow-2xs"
 >
 {item.imageUrl && (
 <div className="size-20 sm:size-24 rounded-lg overflow-hidden bg-muted shrink-0 border border-border/60">
 <img
 src={item.imageUrl}
 alt={item.name}
 className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
 />
 </div>
 )}

 <div className="flex-1 min-w-0 space-y-2 flex flex-col justify-between h-full">
 <div>
 <div className="flex items-start justify-between gap-2">
 <h3 className="text-sm font-bold text-foreground truncate">{item.name}</h3>
 <span className="text-sm font-bold text-foreground shrink-0 font-mono">
 {formatPrice(item.priceCents)}
 </span>
 </div>
 <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
 {item.description}
 </p>
 </div>

 <div className="flex items-center justify-between pt-1">
 <div className="flex items-center gap-2">
 {item.badge && (
 <Badge variant="secondary" className="text-[10px] px-2 py-0">
 {item.badge}
 </Badge>
 )}
 {item.isVegetarian && (
 <Badge variant="outline" className="text-[10px] px-2 py-0 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
 Vegetariano
 </Badge>
 )}
 </div>

 <Button
 type="button"
 size="sm"
 variant="outline"
 disabled={addingItemId === item.id}
 onClick={() => handleAddDirect(item)}
 className="h-8 text-xs font-bold rounded-lg gap-2 border-border/80 hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
 >
 {addingItemId === item.id ? (
 <Loader2 className="size-3.5 animate-spin" />
 ) : (
 <Plus className="size-3.5" />
 )}
 <span>Adicionar</span>
 </Button>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </section>
 );
}
