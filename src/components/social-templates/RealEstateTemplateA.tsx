/**
 * RealEstateTemplateA.tsx — Template Social para Mercado Imobiliário
 * Arquitetura clean para lançamentos, apartamentos e casas de alto padrão
 */

import React, { useMemo } from "react";
import { MapPin, Building, Key, ShieldCheck, CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { SocialTemplateProps } from "./types";

export function RealEstateTemplateA({ data, className = "" }: SocialTemplateProps) {
 const {
 title,
 subtitle,
 destinationOrLocation,
 datesOrAvailability,
 highlights = [],
 priceCents = 75000000,
 maxInstallments = 120,
 installmentCents,
 pricingMode = "total_package",
 backgroundImageUrl,
 paymentMethodsLabel = "Aceita financiamento e FGTS",
 aspectRatio = "9:16",
 promoBadge,
 storeName = "Waesy Imóveis",
 } = data;

 const isOneOne = aspectRatio === "1:1";

 const effectiveInstallmentCents = useMemo(() => {
 if (installmentCents && installmentCents > 0) return installmentCents;
 if (priceCents && priceCents > 0 && maxInstallments > 0) {
 return Math.round(priceCents / maxInstallments);
 }
 return 625000;
 }, [installmentCents, priceCents, maxInstallments]);

 const defaultSpecs = [
 "3 Suítes Plenas",
 "2 Vagas Garagem",
 "Varanda Gourmet",
 "145m² Privativos",
 ];

 const resolvedSpecs = highlights && highlights.length > 0 ? highlights.slice(0, 4) : defaultSpecs;

 return (
 <div className={`relative w-full h-full overflow-hidden bg-neutral-950 text-white select-none ${className}`}>
 {/* 1. Fotografia Ampla do Imóvel */}
 <div className="absolute inset-0 overflow-hidden">
 <img
 src={backgroundImageUrl}
 alt={title}
 crossOrigin={backgroundImageUrl?.startsWith("data:") ? undefined : "anonymous"}
 className="w-full h-full object-cover object-center transform scale-102"
 />
 {/* Gradiente cinemático de estúdio imobiliário */}
 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/80" />
 </div>

 {/* 2. Conteúdo Sobreposto */}
 <div
 className={`relative z-10 w-full h-full flex flex-col justify-between ${
 isOneOne ? "p-10" : aspectRatio === "4:5" ? "p-12" : "p-16"
 }`}
 >
 {/* Topo: Selo + Localização */}
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 {promoBadge ? (
 <span className="px-6 py-3 rounded-full bg-amber-400 text-slate-950 font-black uppercase tracking-wider text-xl ">
 {promoBadge}
 </span>
 ) : (
 <span className="px-6 py-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white font-black uppercase tracking-wider text-xl">
 Oportunidade Única
 </span>
 )}

 <div className="flex items-center gap-3 px-6 py-4 rounded-full bg-black/65 backdrop-blur-md border border-white/20 text-white text-xl font-bold">
 <MapPin className="size-6 text-amber-400 shrink-0" />
 <span className="truncate max-w-sm">
 {destinationOrLocation || "Localização Privilegiada"}
 </span>
 </div>
 </div>

 <div className="pt-4">
 <h1
 className={`font-black uppercase tracking-tight text-white drop- leading-none line-clamp-2 ${
 isOneOne ? "text-4xl" : "text-6xl"
 }`}
 >
 {title}
 </h1>
 <p className="text-white/85 font-medium text-2xl mt-2 line-clamp-1">
 {subtitle || datesOrAvailability || "Pronto para Morar ou Investir"}
 </p>
 </div>
 </div>

 {/* Centro: Especificações do Imóvel (Badges) */}
 <div className="grid grid-cols-2 gap-4 max-w-2xl">
 {resolvedSpecs.map((spec, i) => (
 <div
 key={i}
 className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-black/65 backdrop-blur-md border border-white/20 text-white font-bold text-xl "
 >
 <CheckCircle2 className="size-7 text-emerald-400 shrink-0" />
 <span className="truncate">{spec}</span>
 </div>
 ))}
 </div>

 {/* Base: Preço + Condições + Selo da Imobiliária */}
 <div className="w-full flex items-end justify-between gap-6 pt-6 border-t-2 border-white/20">
 <div className="space-y-1">
 <span className="text-xl font-bold text-white/70 uppercase tracking-wider block">
 {pricingMode === "monthly" ? "Aluguel Mensal" : "Valor de Venda"}
 </span>
 <div className={`font-black font-mono text-white tracking-tight leading-none ${isOneOne ? "text-5xl" : "text-7xl"}`}>
 {formatMoney(priceCents)}
 </div>
 {maxInstallments > 1 && (
 <p className="text-xl text-white/85 font-mono pt-1">
 Ou entrada + parcelas de <span className="text-amber-400 font-bold">{formatMoney(effectiveInstallmentCents)}</span>
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
