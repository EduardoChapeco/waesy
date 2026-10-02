import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { Calendar, Clock, MapPin, Ticket, ShoppingCart, Briefcase } from "lucide-react";
import type { ProductCardDTO } from "@/types/catalog";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

interface DynamicProductCardProps {
 product: ProductCardDTO;
}

export function DynamicProductCard({ product }: DynamicProductCardProps) {
 // Safe parsing for attributes (JSONB)
 const attrs = (product.attributes as Record<string, string>) || {};
 const tipo = attrs.tipo || "ecommerce";

 // Formata a data se for evento
 let formattedDate = "";
 if (tipo === "event_producer" && attrs.data_evento) {
 try {
 formattedDate = new Intl.DateTimeFormat("pt-BR", {
 day: "2-digit",
 month: "short",
 hour: "2-digit",
 minute: "2-digit",
 }).format(new Date(attrs.data_evento));
 } catch (e) {
 // ignore
 }
 }

 // Renders different "surfaces" or tags based on niche
 return (
 <Link
 to="/produto/$slug"
 params={{ slug: product.slug }}
 className={cn(
 "group flex flex-col h-full squircle squircle-hover overflow-hidden border bg-card transition-colors duration-200 content-auto-card",
 product.isBoosted &&
 "border-warning/50 ring-1 ring-warning/30 bg-warning/10",
 )}
 >
 <div className="relative aspect-square w-full squircle-media bg-muted/50">
 {product.coverUrl ? (
 <img
 src={product.coverUrl}
 alt={product.title}
 className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
 loading="lazy"
 />
 ) : (
 <div className="flex h-full w-full items-center justify-center text-muted-foreground">
 {tipo === "event_producer" ? (
 <Ticket className="size-10 opacity-20" />
 ) : (
 <ShoppingCart className="size-10 opacity-20" />
 )}
 </div>
 )}

 {/* Top Badges */}
 <div className="absolute top-2 left-2 flex flex-col gap-1">
 {product.isBoosted && (
 <Badge className="bg-warning hover:bg-warning/90 text-warning-foreground font-black uppercase ">
 Patrocinado
 </Badge>
 )}
 {tipo === "event_producer" && (
 <Badge className="bg-primary hover:bg-primary/90 text-white font-black uppercase ">
 Ingresso
 </Badge>
 )}
 {tipo === "creator" && (
 <Badge variant="secondary" className="bg-primary text-white font-bold ">
 Serviço
 </Badge>
 )}
 </div>
 </div>

 <div className="flex flex-1 flex-col p-4">
 <h3 className="font-bold text-lg leading-tight line-clamp-2 mb-2 group-hover:text-primary transition-colors">
 {product.title}
 </h3>

 {/* Dynamic Meta Info */}
 <div className="flex flex-col gap-2 mt-auto mb-4 text-sm text-muted-foreground font-medium">
 {tipo === "event_producer" && attrs.data_evento && (
 <div className="flex items-center gap-2">
 <Calendar className="size-4" />
 <span>{formattedDate}</span>
 </div>
 )}
 {tipo === "event_producer" && attrs.local && (
 <div className="flex items-center gap-2 line-clamp-1">
 <MapPin className="size-4 shrink-0" />
 <span className="truncate">{attrs.local}</span>
 </div>
 )}
 {tipo === "creator" && attrs.duracao_min && (
 <div className="flex items-center gap-2">
 <Clock className="size-4" />
 <span>{attrs.duracao_min} min</span>
 </div>
 )}
 {tipo === "creator" && attrs.formato && (
 <div className="flex items-center gap-2">
 <Briefcase className="size-4" />
 <span className="capitalize">{attrs.formato}</span>
 </div>
 )}
 </div>

 <div className="mt-auto flex items-center justify-between pt-2 border-t">
 <div className="font-black text-lg tracking-tight">{formatMoney(product.priceCents)}</div>
 {tipo === "event_producer" ? (
 <span className="text-xs uppercase font-bold text-primary flex items-center gap-1">
 Comprar
 </span>
 ) : (
 <span className="text-xs font-bold text-foreground hover:underline">Ver Detalhes</span>
 )}
 </div>
 </div>
 </Link>
 );
}
