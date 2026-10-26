/**
 * GastronomyTemplate.tsx — Template Social para Gastronomia, Pratos e Delivery
 * Fotografia de alta saturação, tempo de entrega e selo artesanal
 */

import React, { useMemo } from "react";
import { Utensils, Clock, Flame, ShieldCheck, Star } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { SocialTemplateProps } from "./types";

export function GastronomyTemplate({ data, className = "" }: SocialTemplateProps) {
 const {
 title,
 subtitle,
 datesOrAvailability,
 highlights = [],
 priceCents = 4890,
 backgroundImageUrl,
 paymentMethodsLabel = "Peça pelo WhatsApp ou App",
 aspectRatio = "9:16",
 promoBadge = "COMBO DO CHEF",
 storeName = "Waesy Gastronomia",
 } = data;

 const isOneOne = aspectRatio === "1:1";

 const resolvedHighlights = highlights && highlights.length > 0 ? highlights.slice(0, 3) : [
 "Ingredientes Frescos",
 "Preparo Artesanal",
 "Entrega Rápida 35 min",
 ];

 return (
 <div className={`relative w-full h-full overflow-hidden bg-neutral-950 text-white select-none ${className}`}>
 {/* 1. Fotografia do Prato */}
 <div className="absolute inset-0 overflow-hidden">
 <img
 src={backgroundImageUrl}
 alt={title}
 crossOrigin={backgroundImageUrl?.startsWith("data:") ? undefined : "anonymous"}
 className="w-full h-full object-cover object-center transform scale-103"
 />
 {/* Vinheta escura clássica de cardápio gourmet */}
 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/75" />
 </div>

 {/* 2. Conteúdo Visual */}
 <div
 className={`relative z-10 w-full h-full flex flex-col justify-between ${
 isOneOne ? "p-10" : aspectRatio === "4:5" ? "p-12" : "p-16"
 }`}
 >
 {/* Topo: Selo Gastronômico */}
 <div className="flex items-center justify-between">
 <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-amber-500 text-slate-950 font-black uppercase tracking-wider text-xl ">
 <Flame className="size-6 shrink-0 fill-current" />
 <span>{promoBadge || "ESPECIAL DA CASA"}</span>
 </div>

 <div className="flex items-center gap-3 px-6 py-4 rounded-full bg-black/65 backdrop-blur-md border border-white/20 text-white text-xl font-bold">
 <Clock className="size-6 text-amber-400 shrink-0" />
 <span>35-45 min</span>
 </div>
 </div>

 {/* Centro: Título e Descrição Apetitosa */}
 <div className="space-y-4">
 <h1
 className={`font-black uppercase tracking-tight text-white drop- leading-none line-clamp-2 ${
 isOneOne ? "text-4xl" : "text-6xl"
 }`}
 >
 {title}
 </h1>

 <p className="text-white/90 font-medium text-2xl line-clamp-2 max-w-2xl">
 {subtitle || datesOrAvailability || "Sabor incomparável preparado com ingredientes selecionados."}
 </p>

 <div className="flex flex-wrap gap-3 pt-2">
 {resolvedHighlights.map((item, i) => (
 <span
 key={i}
 className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-black/65 backdrop-blur-md border border-white/20 text-white text-xl font-bold"
 >
 <Star className="size-6 text-amber-400 shrink-0 fill-current" />
 <span>{item}</span>
 </span>
 ))}
 </div>
 </div>

 {/* Base: Preço + Selo do Restaurante */}
 <div className="w-full flex items-end justify-between gap-6 pt-6 border-t-2 border-white/20">
 <div className="space-y-1">
 <span className="text-xl font-bold text-white/70 uppercase tracking-wider block">
 Preço Especial
 </span>
 <div className={`font-black font-mono text-amber-400 tracking-tight leading-none ${isOneOne ? "text-5xl" : "text-7xl"}`}>
 {formatMoney(priceCents)}
 </div>
 <p className="text-lg text-white/65 pt-1">
 {paymentMethodsLabel}
 </p>
 </div>

 <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-white text-xl font-black shrink-0">
 <Utensils className="size-7 text-amber-400 shrink-0" />
 <span className="truncate max-w-xs">{storeName}</span>
 </div>
 </div>
 </div>
 </div>
 );
}
