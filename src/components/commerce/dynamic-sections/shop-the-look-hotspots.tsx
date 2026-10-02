import * as React from "react";
import { useState } from "react";
import { ShoppingBag, Plus, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface HotspotItem {
 id: string;
 xPercent: number;
 yPercent: number;
 title: string;
 priceCents: number;
 productSlug?: string;
 imageUrl?: string;
}

export interface ShopTheLookProps {
 title?: string;
 subtitle?: string;
 lookImageUrl?: string;
 hotspots?: HotspotItem[];
 onSelectProduct?: (slug: string) => void;
}

export function ShopTheLookSection({
 title = "Shop the Look",
 subtitle = "Clique nos pontos da foto para ver e comprar cada peça da composição.",
 lookImageUrl,
 hotspots,
 onSelectProduct,
}: ShopTheLookProps) {
 const activeHotspots = hotspots || [];
 const [activeHotspotId, setActiveHotspotId] = useState<string | null>(activeHotspots[0]?.id || null);

 const activeHotspot = activeHotspots.find((h) => h.id === activeHotspotId) || activeHotspots[0];

 if (!lookImageUrl || activeHotspots.length === 0) {
 return null;
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
 <div className="text-center max-w-xl mx-auto space-y-2">
 <Badge variant="outline" className="text-[11px] font-mono text-muted-foreground border-border/80">
 Editorial de Moda
 </Badge>
 <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{title}</h2>
 {subtitle && <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
 {/* Foto Principal com Pontos Interativos */}
 <div className="lg:col-span-8 relative rounded-lg overflow-hidden aspect-4/3 sm:aspect-16/10 bg-muted border border-border/80 shadow-2xs group">
 <img
 src={lookImageUrl}
 alt={title}
 className="size-full object-cover"
 />

 {/* Pontos Clicáveis (Hotspots) */}
 {activeHotspots.map((spot) => {
 const isSelected = activeHotspotId === spot.id;
 return (
 <button
 key={spot.id}
 type="button"
 onClick={() => setActiveHotspotId(spot.id)}
 style={{ left: `${spot.xPercent}%`, top: `${spot.yPercent}%` }}
 className={cn(
 "absolute -translate-x-1/2 -translate-y-1/2 size-8 sm:size-9 rounded-full flex items-center justify-center cursor-pointer transition-all shadow-lg",
 isSelected
 ? "bg-primary text-primary-foreground scale-110 ring-4 ring-primary/30"
 : "bg-background/90 text-foreground backdrop-blur-md hover:scale-105 border border-border"
 )}
 >
 <Plus className={cn("size-4 transition-transform", isSelected && "rotate-45")} />
 </button>
 );
 })}
 </div>

 {/* Card Lateral do Produto em Foco */}
 <div className="lg:col-span-4">
 {activeHotspot ? (
 <div className="p-6 rounded-lg border border-border/80 bg-card space-y-4 shadow-2xs">
 <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
 Peça Selecionada
 </span>

 {activeHotspot.imageUrl && (
 <div className="aspect-square rounded-lg overflow-hidden bg-muted border border-border/60">
 <img
 src={activeHotspot.imageUrl}
 alt={activeHotspot.title}
 className="size-full object-cover"
 />
 </div>
 )}

 <div className="space-y-1">
 <h3 className="font-bold text-base text-foreground">{activeHotspot.title}</h3>
 <span className="text-lg font-bold text-foreground font-mono block">
 {formatPrice(activeHotspot.priceCents)}
 </span>
 </div>

 <Button
 type="button"
 size="lg"
 onClick={() => activeHotspot.productSlug && onSelectProduct?.(activeHotspot.productSlug)}
 className="w-full rounded-lg font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer gap-2"
 >
 <ShoppingBag className="size-4" />
 <span>Comprar Esta Peça</span>
 </Button>
 </div>
 ) : (
 <div className="p-6 rounded-lg border border-dashed border-border/80 text-center text-xs text-muted-foreground">
 Selecione um ponto no look para ver a peça.
 </div>
 )}
 </div>
 </div>
 </div>
 </section>
 );
}
