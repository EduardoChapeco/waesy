/**
 * RetailPromoTemplate.tsx — Template Social para Varejo, Ofertas e Supermercado
 * Foco em alta conversão: badge de desconto, preço "de/por" e entrega rápida
 */

import React, { useMemo } from "react";
import { Tag, Zap, Clock, ShieldCheck, Check } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { SocialTemplateProps } from "./types";

export function RetailPromoTemplate({ data, className = "" }: SocialTemplateProps) {
 const {
 title,
 subtitle,
 datesOrAvailability,
 highlights = [],
 priceCents = 18990,
 originalPriceCents = 24990,
 maxInstallments = 10,
 installmentCents,
 backgroundImageUrl,
 paymentMethodsLabel = "no Pix ou cartão sem juros",
 aspectRatio = "9:16",
 promoBadge = "OFERTA DO DIA",
 storeName = "Waesy Supermercados",
 } = data;

 const isOneOne = aspectRatio === "1:1";

 const effectiveInstallmentCents = useMemo(() => {
 if (installmentCents && installmentCents > 0) return installmentCents;
 if (priceCents && priceCents > 0 && maxInstallments > 0) {
 return Math.round(priceCents / maxInstallments);
 }
 return 1899;
 }, [installmentCents, priceCents, maxInstallments]);

 const discountPercent = useMemo(() => {
 if (originalPriceCents && priceCents && originalPriceCents > priceCents) {
 return Math.round(((originalPriceCents - priceCents) / originalPriceCents) * 100);
 }
 return 24;
 }, [originalPriceCents, priceCents]);

 const resolvedHighlights = highlights && highlights.length > 0 ? highlights.slice(0, 3) : [
 "Pronta Entrega Imediata",
 "Garantia Oficial",
 "Estoque Limitado",
 ];

 return (
 <div className={`relative w-full h-full overflow-hidden bg-slate-950 text-white select-none ${className}`}>
 {/* 1. Imagem do Produto em Destaque */}
 <div className="absolute inset-0 overflow-hidden">
 <img
 src={backgroundImageUrl}
 alt={title}
 crossOrigin={backgroundImageUrl?.startsWith("data:") ? undefined : "anonymous"}
 className="w-full h-full object-cover object-center transform scale-102"
 />
 {/* Gradiente escuro para legibilidade perfeita */}
 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/80" />
 </div>

 {/* 2. Conteúdo em Camadas */}
 <div
 className={`relative z-10 w-full h-full flex flex-col justify-between ${
 isOneOne ? "p-10" : aspectRatio === "4:5" ? "p-12" : "p-16"
 }`}
 >
 {/* Topo: Badges de Oferta + Loja */}
 <div className="flex items-center justify-between">
 <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-red-600 text-white font-black uppercase tracking-wider text-xl ">
 <Zap className="size-6 shrink-0 fill-current" />
 <span>{promoBadge || "SUPER OFERTA"}</span>
 </div>

 <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-amber-400 text-black font-black text-xl ">
 <span>-{discountPercent}% OFF</span>
 </div>
 </div>

 {/* Centro: Título do Produto & Destaques */}
 <div className="space-y-4">
 <h1
 className={`font-black uppercase tracking-tight text-white drop- leading-none line-clamp-2 ${
 isOneOne ? "text-4xl" : "text-6xl"
 }`}
 >
 {title}
 </h1>

 <p className="text-white/90 font-medium text-2xl line-clamp-1">
 {subtitle || datesOrAvailability || "Preço especial por tempo limitado"}
 </p>

 <div className="flex flex-wrap gap-3 pt-2">
 {resolvedHighlights.map((item, i) => (
 <span
 key={i}
 className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-black/65 backdrop-blur-md border border-white/20 text-white text-xl font-bold"
 >
 <Check className="size-6 text-emerald-400 shrink-0" strokeWidth={3} />
 <span>{item}</span>
 </span>
 ))}
 </div>
 </div>

 {/* Base: Caixa de Preço De/Por & Entrega */}
 <div className="w-full flex items-end justify-between gap-6 pt-6 border-t-2 border-white/20">
 <div className="space-y-1">
 {originalPriceCents && (
 <div className="text-xl font-bold text-white/50 line-through font-mono">
 De {formatMoney(originalPriceCents)}
 </div>
 )}
 <div className="flex items-baseline gap-3">
 <span className="text-xl font-bold text-amber-400 uppercase tracking-wider">
 Por
 </span>
 <span className={`font-black font-mono text-white tracking-tight leading-none ${isOneOne ? "text-5xl" : "text-7xl"}`}>
 {formatMoney(priceCents)}
 </span>
 </div>
 {maxInstallments > 1 && (
 <p className="text-xl text-white/85 font-mono pt-1">
 Ou em até <span className="font-bold text-white">{maxInstallments}x</span> de <span className="text-amber-400 font-bold">{formatMoney(effectiveInstallmentCents)}</span>
 </p>
 )}
 <p className="text-lg text-white/60">
 {paymentMethodsLabel}
 </p>
 </div>

 <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-white text-xl font-black shrink-0">
 <ShieldCheck className="size-7 text-emerald-400 shrink-0" />
 <span className="truncate max-w-xs">{storeName}</span>
 </div>
 </div>
 </div>
 </div>
 );
}
