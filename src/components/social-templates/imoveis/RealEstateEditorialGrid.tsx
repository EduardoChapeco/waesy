/**
 * RealEstateEditorialGrid.tsx — Template Imóveis 02: Split-Card Modernista com Moldura Editorial (9:16)
 * Blueprint: Moldura externa clara, janela fotográfica no topo, base editorial branca com grid matricial 2x2 e barra escura de CTA
 */

import React, { useMemo } from "react";
import { MapPin, ArrowRight, ShieldCheck } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { SocialTemplateProps } from "../types";

export function RealEstateEditorialGrid({ data, className = "" }: SocialTemplateProps) {
 const {
 title,
 subtitle,
 destinationOrLocation,
 highlights = [],
 priceCents = 89000000,
 maxInstallments = 120,
 installmentCents,
 pricingMode = "total_package",
 backgroundImageUrl,
 paymentMethodsLabel = "Financiamento bancário facilitado",
 promoBadge = "EXCLUSIVIDADE WAESY",
 storeName = "Waesy Imóveis",
 ctaLabel = "Falar com Corretor",
 } = data;

 const isOneOne = data.aspectRatio === "1:1";

 const effectiveInstallmentCents = useMemo(() => {
 if (installmentCents && installmentCents > 0) return installmentCents;
 if (priceCents && priceCents > 0 && maxInstallments > 0) {
 return Math.round(priceCents / maxInstallments);
 }
 return 741600;
 }, [installmentCents, priceCents, maxInstallments]);

 const defaultSpecs = [
 { label: "Área Privativa", value: "192 m²" },
 { label: "Dormitórios", value: "3 Suítes" },
 { label: "Garagem", value: "2 Vagas" },
 { label: "Andar", value: "Alto Padrão" },
 ];

 const resolvedSpecs = highlights && highlights.length >= 4
 ? highlights.slice(0, 4).map((h, idx) => ({ label: `Destaque 0${idx + 1}`, value: h }))
 : defaultSpecs;

 return (
 <div className={`relative w-full h-full overflow-hidden bg-[#f1f5f9] text-slate-900 select-none ${isOneOne ? "p-8" : "p-12"} flex flex-col justify-between ${className}`}>
 {/* ── 1. Janela Panorâmica Superior ── */}
 <div className={`relative w-full ${isOneOne ? "h-2/5" : "h-1/2"} rounded-3xl overflow-hidden border border-slate-300/80 bg-slate-900 shrink-0`}>
 <img
 src={backgroundImageUrl}
 alt={title}
 crossOrigin={backgroundImageUrl?.startsWith("data:") ? undefined : "anonymous"}
 className="w-full h-full object-cover object-center"
 />

 {/* Tag Minimalista de Topo */}
 <div className="absolute top-6 left-6">
 <span className="px-6 py-3 rounded-full bg-slate-950/85 backdrop-blur-md text-white font-mono uppercase tracking-widest text-xl font-bold ">
 {promoBadge || "EDIFÍCIO RESIDENCIAL"}
 </span>
 </div>

 {/* Localização em Pílula Flutuante */}
 <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
 <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-950/85 backdrop-blur-md text-white text-xl font-bold">
 <MapPin className="size-6 text-amber-400 shrink-0" />
 <span className="truncate">{destinationOrLocation || "Localização Privilegiada"}</span>
 </div>

 <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/95 backdrop-blur-md text-slate-900 text-xl font-black ">
 <ShieldCheck className="size-6 text-emerald-600 shrink-0" />
 <span className="truncate">{storeName}</span>
 </div>
 </div>
 </div>

 {/* ── 2. Bloco Editorial Inferior (Tipografia & Grid Matricial) ── */}
 <div className="flex-1 min-h-0 pt-6 flex flex-col justify-between">
 {/* Título e Subtítulo */}
 <div className="space-y-2">
 <p className="text-xl font-mono font-bold uppercase tracking-wider text-slate-500">
 {subtitle || "Imóvel Selecionado para Venda"}
 </p>
 <h1 className={`font-black text-slate-950 tracking-tight uppercase line-clamp-2 leading-tight ${isOneOne ? "text-4xl" : "text-5xl"}`}>
 {title}
 </h1>
 </div>

 {/* Grid Matricial 2x2 de Atributos */}
 <div className="grid grid-cols-2 gap-4 py-3">
 {resolvedSpecs.map((spec, i) => (
 <div
 key={i}
 className="bg-white rounded-2xl p-4 border border-slate-200/90 flex items-center justify-between"
 >
 <span className="text-xl font-bold text-slate-400 uppercase">
 {spec.label}
 </span>
 <span className="text-xl font-black text-slate-900 font-mono">
 {spec.value}
 </span>
 </div>
 ))}
 </div>

 {/* Linha de Fechamento: Preço e Botão */}
 <div className="flex items-end justify-between gap-6 pt-4 border-t-2 border-slate-200">
 <div>
 <span className="text-xl font-bold uppercase tracking-wider text-slate-400 block mb-1">
 {pricingMode === "monthly" ? "Aluguel Mensal" : "Valor de Venda"}
 </span>
 <div className={`font-black text-slate-950 tracking-tight font-mono leading-none ${isOneOne ? "text-5xl" : "text-7xl"}`}>
 {formatMoney(priceCents)}
 </div>
 {maxInstallments > 1 && (
 <span className="text-xl font-semibold text-slate-500 block mt-1">
 Financiamento em até {maxInstallments} meses
 </span>
 )}
 </div>

 <div className={`bg-slate-950 hover:bg-slate-800 text-white ${isOneOne ? "px-8 py-5 text-xl" : "px-10 py-6 text-2xl"} rounded-2xl font-black flex items-center gap-4 shrink-0 transition-transform active:scale-95`}>
 <span>{ctaLabel}</span>
 <ArrowRight className="size-8 text-white" strokeWidth={2.5} />
 </div>
 </div>
 </div>
 </div>
 );
}
