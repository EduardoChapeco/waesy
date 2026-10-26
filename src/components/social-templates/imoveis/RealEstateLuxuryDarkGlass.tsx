/**
 * RealEstateLuxuryDarkGlass.tsx — Template Imóveis 03: Midnight Luxury & Duotone Futurista (9:16)
 * Blueprint: Fundo ultra escuro, fotografia central em moldura squircle iluminada, card em vidro fumê e CTA metálico dourado
 */

import React, { useMemo } from "react";
import { Key, MapPin, Star, ShieldCheck, ArrowRight } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { SocialTemplateProps } from "../types";

export function RealEstateLuxuryDarkGlass({ data, className = "" }: SocialTemplateProps) {
 const {
 title,
 subtitle,
 destinationOrLocation,
 datesOrAvailability,
 highlights = [],
 priceCents = 185000000,
 maxInstallments = 120,
 installmentCents,
 pricingMode = "total_package",
 backgroundImageUrl,
 paymentMethodsLabel = "Condições especiais sob consulta",
 promoBadge = "COBERTURA EXCLUSIVA",
 storeName = "Waesy Private Selection",
 ctaLabel = "Agendar Visita Exclusiva",
 } = data;

 const isOneOne = data.aspectRatio === "1:1";

 const effectiveInstallmentCents = useMemo(() => {
 if (installmentCents && installmentCents > 0) return installmentCents;
 if (priceCents && priceCents > 0 && maxInstallments > 0) {
 return Math.round(priceCents / maxInstallments);
 }
 return 1541600;
 }, [installmentCents, priceCents, maxInstallments]);

 const defaultSpecs = ["4 Suítes Master", "Piscina Privativa", "4 Vagas de Garagem", "Vista Panorâmica 360°"];
 const resolvedSpecs = highlights && highlights.length > 0 ? highlights.slice(0, 4) : defaultSpecs;

 return (
 <div className={`relative w-full h-full overflow-hidden bg-gradient-to-b from-[#050811] via-[#020408] to-[#010204] text-white select-none ${isOneOne ? "p-8" : "p-12"} flex flex-col justify-between ${className}`}>
 {/* ── 1. Header Noturno com Identidade de Luxo ── */}
 <div className="pt-2 text-center space-y-3 shrink-0">
 <div className="inline-flex items-center gap-3 text-xl font-mono uppercase tracking-widest text-amber-300 font-bold">
 <Star className="size-6 text-amber-400 fill-amber-400" />
 <span>{storeName || "Private Properties"}</span>
 <Star className="size-6 text-amber-400 fill-amber-400" />
 </div>
 <div className="w-28 h-1 bg-gradient-to-r from-transparent via-amber-400/80 to-transparent mx-auto" />
 </div>

 {/* ── 2. Fotografia Central em Moldura Squircle Iluminada ── */}
 <div className={`relative w-full ${isOneOne ? "h-2/5" : "h-1/2"} my-4 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.9)] border-2 border-amber-400/30 bg-neutral-900 shrink-0`}>
 <img
 src={backgroundImageUrl}
 alt={title}
 crossOrigin={backgroundImageUrl?.startsWith("data:") ? undefined : "anonymous"}
 className="w-full h-full object-cover object-center transform scale-103"
 />
 {/* Overlay com vinheta profunda */}
 <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40" />

 {/* Selo Dourado de Oportunidade */}
 <div className="absolute top-6 left-6">
 <span className="px-6 py-3 rounded-full bg-black/80 backdrop-blur-md border border-amber-400/40 text-amber-300 font-mono text-xl font-black uppercase tracking-wider flex items-center gap-3">
 <Key className="size-6 text-amber-400" />
 <span>{promoBadge}</span>
 </span>
 </div>

 {/* Localização Nobre */}
 <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
 <div className="flex items-center gap-3 px-6 py-4 rounded-full bg-black/85 backdrop-blur-md border border-white/20 text-white text-xl font-bold">
 <MapPin className="size-6 text-amber-400 shrink-0" />
 <span className="truncate">{destinationOrLocation || "Localização Nobre"}</span>
 </div>
 </div>
 </div>

 {/* ── 3. Card Flutuante em Vidro Negro Fumê (Base) ── */}
 <div className="flex-1 min-h-0 rounded-3xl bg-black/85 backdrop-blur-2xl border border-amber-400/30 p-8 flex flex-col justify-between ">
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xl font-mono uppercase tracking-widest text-amber-300 font-bold">
 {subtitle || "Imóvel de Alto Padrão"}
 </span>
 <div className="flex items-center gap-2 text-xl text-white/70">
 <ShieldCheck className="size-6 text-emerald-400" />
 <span>Verificado</span>
 </div>
 </div>
 <h1 className={`font-black text-white uppercase tracking-tight line-clamp-1 ${isOneOne ? "text-4xl" : "text-5xl"}`}>
 {title}
 </h1>
 </div>

 {/* Chips de Atributos com Borda Dourada Suave */}
 <div className="flex flex-wrap gap-3 py-2">
 {resolvedSpecs.map((spec, i) => (
 <span
 key={i}
 className="px-5 py-3 rounded-xl bg-amber-400/10 border border-amber-400/25 text-amber-200 text-xl font-bold"
 >
 {spec}
 </span>
 ))}
 </div>

 {/* Linha Financeira + CTA */}
 <div className="flex items-end justify-between gap-6 pt-4 border-t border-amber-400/20">
 <div>
 <span className="text-xl uppercase tracking-wider text-white/70 font-bold block mb-1">
 Valor de Investimento
 </span>
 <div className={`font-black font-mono text-amber-400 tracking-tight leading-none ${isOneOne ? "text-5xl" : "text-7xl"}`}>
 {formatMoney(priceCents)}
 </div>
 {installmentCents && (
 <span className="text-xl text-white/75 font-mono block mt-1">
 Entrada + parcelas de {formatMoney(effectiveInstallmentCents)}
 </span>
 )}
 </div>

 <div className={`bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 ${isOneOne ? "px-8 py-5 text-xl" : "px-10 py-6 text-2xl"} rounded-2xl font-black flex items-center gap-4 shrink-0 transition-transform active:scale-95`}>
 <span>{ctaLabel}</span>
 <ArrowRight className="size-8 text-slate-950" strokeWidth={2.5} />
 </div>
 </div>
 </div>
 </div>
 );
}
