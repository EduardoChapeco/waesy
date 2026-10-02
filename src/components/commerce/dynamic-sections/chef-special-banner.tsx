import * as React from "react";
import { Layers, Clock, Utensils, Check } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ChefSpecialBannerProps {
 title?: string;
 dishName?: string;
 description?: string;
 priceCents?: number;
 prepTimeMinutes?: number;
 ingredients?: string[];
 imageUrl?: string;
 chefName?: string;
 products?: any[];
 onOrderClick?: () => void;
}

export function ChefSpecialBannerSection({
 title = "Sugestão do Chef",
 dishName,
 description,
 priceCents,
 prepTimeMinutes,
 ingredients,
 imageUrl,
 chefName = "Chef Executivo",
 products,
 onOrderClick,
}: ChefSpecialBannerProps) {
 const featuredProduct = React.useMemo(() => {
 if (products && products.length > 0) {
 return products.find((p: any) => p.is_featured) || products[0];
 }
 return null;
 }, [products]);

 const activeDishName = featuredProduct?.title || featuredProduct?.name || dishName || "Especialidade da Casa";
 const activeDescription = featuredProduct?.description || description || "Prato artesanal preparado com ingredientes frescos selecionados.";
 const activePriceCents = featuredProduct?.price_cents || featuredProduct?.priceCents || priceCents || 0;
 const activeImageUrl = featuredProduct?.product_media?.[0]?.url || featuredProduct?.cover_image || featuredProduct?.coverUrl || imageUrl;
 const activeIngredients = (featuredProduct?.ingredients && featuredProduct.ingredients.length > 0)
 ? featuredProduct.ingredients
 : (ingredients || []);
 const activePrepTime = featuredProduct?.food_specs?.preparationTimeMinutes || prepTimeMinutes || 20;

 const formatPrice = (cents: number) => {
 return new Intl.NumberFormat("pt-BR", {
 style: "currency",
 currency: "BRL",
 }).format(cents / 100);
 };

 return (
 <section className="py-12 bg-muted/30 w-full">
 <div className="max-w-6xl mx-auto px-4 sm:px-6">
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-lg border border-border/80 bg-card p-6 sm:p-10 shadow-2xs overflow-hidden relative">
 {/* Coluna de Mídia */}
 <div className="lg:col-span-6 relative rounded-lg overflow-hidden aspect-4/3 bg-muted border border-border/60 flex items-center justify-center">
 {activeImageUrl ? (
 <img
 src={activeImageUrl}
 alt={activeDishName}
 className="size-full object-cover"
 />
 ) : (
 <div className="size-full flex flex-col items-center justify-center text-muted-foreground/40 bg-muted/40 p-6 text-center space-y-2">
 <Utensils className="size-12 text-primary/40" />
 <span className="text-xs font-semibold">{activeDishName}</span>
 </div>
 )}
 <div className="absolute top-3 left-3">
 <Badge className="bg-primary text-primary-foreground font-bold text-xs px-3 py-1 shadow-md">
 Prato Exclusivo
 </Badge>
 </div>
 </div>

 {/* Coluna de Informações e Ingredientes */}
 <div className="lg:col-span-6 space-y-5">
 <div className="space-y-2">
 <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
 <Utensils className="size-3.5 text-primary" />
 <span>{title}</span>
 {chefName && <span className="text-muted-foreground/60">• {chefName}</span>}
 </div>
 <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
 {activeDishName}
 </h2>
 <p className="text-sm text-muted-foreground leading-relaxed">
 {activeDescription}
 </p>
 </div>

 {/* Tags de Ingredientes */}
 {activeIngredients && activeIngredients.length > 0 && (
 <div className="space-y-2">
 <span className="text-xs font-semibold text-foreground">Ingredientes Selecionados:</span>
 <div className="flex flex-wrap gap-2">
 {activeIngredients.map((ing: string, idx: number) => (
 <Badge
 key={idx}
 variant="secondary"
 className="text-[11px] font-normal px-3 py-1 bg-muted/60 text-muted-foreground border border-border/40"
 >
 <Check className="size-3 mr-1 text-primary" />
 {ing}
 </Badge>
 ))}
 </div>
 </div>
 )}

 {/* Metadados e Ação de Pedido */}
 <div className="pt-2 flex items-center justify-between border-t border-border/60 gap-4 flex-wrap">
 <div>
 <span className="text-xs text-muted-foreground block">Valor do Prato</span>
 <span className="text-2xl font-bold text-foreground font-mono">
 {formatPrice(activePriceCents)}
 </span>
 </div>

 {activePrepTime > 0 && (
 <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg border border-border/50">
 <Clock className="size-3.5 text-muted-foreground" />
 <span>Preparo: ~{activePrepTime} min</span>
 </div>
 )}

 {onOrderClick && (
 <Button
 type="button"
 size="lg"
 onClick={onOrderClick}
 className="rounded-lg font-bold text-xs bg-primary text-primary-foreground shadow-xs cursor-pointer ml-auto"
 >
 Pedir Agora
 </Button>
 )}
 </div>
 </div>
 </div>
 </div>
 </section>
 );
}
