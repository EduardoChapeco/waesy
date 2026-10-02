import React from "react";
import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, Store, Tag, Newspaper, ArrowUpRight, Layers } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export interface PostEmbedData {
 type: "event" | "product" | "classified" | "news";
 id: string;
 title: string;
 subtitle?: string;
 image_url?: string;
 price_cents?: number;
 location?: string;
 date_str?: string;
 badge_text?: string;
 target_url: string;
}

export function PostEmbedRenderer({ embed }: { embed?: PostEmbedData | null }) {
 if (!embed) return null;

 const formatPrice = (cents?: number) => {
 if (cents === undefined || cents === null) return null;
 return (cents / 100).toLocaleString("pt-BR", {
 style: "currency",
 currency: "BRL",
 });
 };

 return (
 <Link
 to={embed.target_url as any}
 className="group mt-3 block rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-all overflow-hidden shadow-2xs select-none"
 >
 <div className="flex flex-col sm:flex-row items-stretch gap-4 p-4">
 {/* Imagem do Embed */}
 {embed.image_url ? (
 <div className="sm:size-24 w-full h-36 sm:h-24 rounded-lg bg-muted overflow-hidden flex-shrink-0 relative">
 <img
 src={embed.image_url}
 alt={embed.title}
 className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
 />
 {embed.badge_text && (
 <div className="absolute top-1.5 left-1.5 px-2 py-1 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-bold text-white uppercase">
 {embed.badge_text}
 </div>
 )}
 </div>
 ) : (
 <div className="size-24 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
 {embed.type === "event" && <Calendar className="size-8" />}
 {embed.type === "product" && <Store className="size-8" />}
 {embed.type === "classified" && <Tag className="size-8" />}
 {embed.type === "news" && <Newspaper className="size-8" />}
 </div>
 )}

 {/* Informações Textuais do Embed */}
 <div className="flex-1 min-w-0 flex flex-col justify-between space-y-2">
 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <Badge variant="outline" className="text-[10px] px-2 py-0 h-4 font-semibold uppercase tracking-wider bg-background/80">
 {embed.type === "event" && "📅 Evento"}
 {embed.type === "product" && "🛍️ Produto"}
 {embed.type === "classified" && "🏷️ Classificado"}
 {embed.type === "news" && "📰 Notícia"}
 </Badge>
 {embed.price_cents !== undefined && (
 <span className="text-xs font-black text-primary">
 {formatPrice(embed.price_cents)}
 </span>
 )}
 </div>

 <h4 className="text-sm font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors flex items-center gap-1">
 <span>{embed.title}</span>
 <ArrowUpRight className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
 </h4>

 {embed.subtitle && (
 <p className="text-xs text-muted-foreground line-clamp-1">
 {embed.subtitle}
 </p>
 )}
 </div>

 {/* Rodapé do Embed (Data / Localização) */}
 <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border/30">
 {embed.date_str && (
 <div className="flex items-center gap-1 font-medium">
 <Calendar className="size-3 text-primary" />
 <span>{embed.date_str}</span>
 </div>
 )}
 {embed.location && (
 <div className="flex items-center gap-1 font-medium">
 <MapPin className="size-3 text-primary" />
 <span className="truncate max-w-[180px]">{embed.location}</span>
 </div>
 )}
 </div>
 </div>
 </div>
 </Link>
 );
}
