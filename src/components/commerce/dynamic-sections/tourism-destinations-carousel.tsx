import * as React from "react";
import { Plane, ArrowRight, MapPin, Calendar, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface TourismDestination {
 id: string;
 name: string;
 country: string;
 priceFromCents: number;
 durationDays?: number;
 imageUrl?: string;
 badge?: string;
}

export interface TourismDestinationsProps {
 title?: string;
 subtitle?: string;
 destinations?: TourismDestination[];
 products?: any[];
 resolvedProducts?: any[];
 onSelectDestination?: (dest: TourismDestination) => void;
}

export function TourismDestinationsCarouselSection({
 title = "Destinos Populares em Destaque",
 subtitle = "Pacotes completos com voos, hospedagem e assessoria personalizada.",
 destinations,
 products,
 resolvedProducts,
 onSelectDestination,
}: TourismDestinationsProps) {
 const effectiveProducts = products || resolvedProducts;

 const effectiveDestinations = React.useMemo(() => {
 if (destinations && destinations.length > 0) return destinations;
 if (effectiveProducts && effectiveProducts.length > 0) {
 return effectiveProducts.slice(0, 8).map((p: any) => ({
 id: p.id,
 name: p.title || p.name,
 country: p.category?.name || "Roteiro Especial",
 priceFromCents: p.price_cents || p.priceCents || 0,
 durationDays: p.attributes?.durationDays || 5,
 imageUrl: p.media_urls?.[0] || p.image_url || p.imageUrl || undefined,
 badge: p.is_featured ? "Destaque" : undefined,
 }));
 }
 return [];
 }, [destinations, effectiveProducts]);

 if (effectiveDestinations.length === 0) {
 return null;
 }

 const formatPrice = (cents: number) => {
 return new Intl.NumberFormat("pt-BR", {
 style: "currency",
 currency: "BRL",
 maximumFractionDigits: 0,
 }).format(cents / 100);
 };

 return (
 <section className="py-12 bg-background w-full">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
 <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
 <div className="space-y-2">
 <Badge variant="outline" className="text-[11px] font-mono text-muted-foreground border-border/80">
 Roteiros Curados
 </Badge>
 <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{title}</h2>
 {subtitle && <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>}
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {effectiveDestinations.map((dest) => (
 <div
 key={dest.id}
 className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-2xs group hover:border-primary/40 transition-all flex flex-col justify-between"
 >
 <div className="aspect-4/3 overflow-hidden bg-muted relative">
 {dest.imageUrl && (
 <img
 src={dest.imageUrl}
 alt={dest.name}
 className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
 />
 )}
 {dest.badge && (
 <div className="absolute top-2.5 left-2.5">
 <Badge className="bg-primary text-primary-foreground text-[10px] font-bold shadow-md">
 {dest.badge}
 </Badge>
 </div>
 )}
 </div>

 <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
 <div className="space-y-1">
 <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-semibold">
 <MapPin className="size-3 text-primary" />
 <span>{dest.country}</span>
 </div>
 <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
 {dest.name}
 </h3>
 {dest.durationDays && (
 <span className="text-[11px] text-muted-foreground block">
 Duração: {dest.durationDays} dias / noites
 </span>
 )}
 </div>

 <div className="pt-2 border-t border-border/60 flex items-center justify-between">
 <div>
 <span className="text-[10px] text-muted-foreground block">A partir de</span>
 <span className="text-sm font-bold text-foreground font-mono">
 {formatPrice(dest.priceFromCents)}
 </span>
 </div>

 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={() => onSelectDestination?.(dest)}
 className="h-8 rounded-lg text-[11px] font-bold border-border/80 bg-background hover:bg-muted"
 >
 Cotar
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
