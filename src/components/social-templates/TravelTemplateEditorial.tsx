/**
 * TravelTemplateEditorial.tsx — Template Editorial para Viagens e Resorts
 * Tipografia clean, gradiente superior suave e caixa de preço em vidro fosco (Frosted Glass)
 */

import React, { useMemo } from "react";
import { Plane, Coffee, Car, Utensils, Compass, Sun, Snowflake, Anchor, ShieldCheck, Star, ArrowRight } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { SocialTemplateProps } from "./types";

export function TravelTemplateEditorial({ data, className = "" }: SocialTemplateProps) {
 const {
 title,
 subtitle,
 datesOrAvailability,
 highlights = [],
 priceCents = null,
 maxInstallments = 12,
 installmentCents,
 pricingMode = "per_person",
 backgroundImageUrl,
 paymentMethodsLabel = "no boleto ou cartão",
 aspectRatio = "9:16",
 themeGradient = "ocean_blue",
 promoBadge,
 storeName,
 ctaLabel,
 } = data;

 const isOneOne = aspectRatio === "1:1";

 const effectiveInstallmentCents = useMemo(() => {
 if (installmentCents && installmentCents > 0) return installmentCents;
 if (priceCents && priceCents > 0 && maxInstallments > 0) {
 return Math.round(priceCents / maxInstallments);
 }
 return null;
 }, [installmentCents, priceCents, maxInstallments]);

 const formattedInclusions = useMemo(() => {
 const list = (highlights || []).slice(0, 4);

 return list.map((item) => {
 const lower = item.toLowerCase();
 let Icon = Compass;
 if (lower.includes("aéreo") || lower.includes("voo") || lower.includes("avião")) Icon = Plane;
 else if (lower.includes("café") || lower.includes("hospedag") || lower.includes("hotel")) Icon = Coffee;
 else if (lower.includes("all inclusive") || lower.includes("almoço") || lower.includes("refeição")) Icon = Utensils;
 else if (lower.includes("traslado") || lower.includes("transfer") || lower.includes("carro")) Icon = Car;
 else if (lower.includes("praia") || lower.includes("resort") || lower.includes("sol")) Icon = Sun;
 else if (lower.includes("neve") || lower.includes("esqui")) Icon = Snowflake;
 else if (lower.includes("cruzeiro") || lower.includes("barco") || lower.includes("navio")) Icon = Anchor;

 return { label: item, Icon };
 });
 }, [highlights]);

 const gradientClass = useMemo(() => {
 switch (themeGradient) {
 case "sunset_amber":
 return "from-[#1e140d] via-[#3a2012] to-transparent";
 case "emerald_nature":
 return "from-[#081c15] via-[#1b4332] to-transparent";
 case "midnight_luxury":
 return "from-[#0a0a0f] via-[#161726] to-transparent";
 case "caribbean_turquoise":
 return "from-[#04242e] via-[#083b4a] to-transparent";
 case "nordic_snow":
 return "from-[#111827] via-[#1f293d] to-transparent";
 case "ocean_blue":
 default:
 return "from-[#061e38] via-[#0b335c] to-transparent";
 }
 }, [themeGradient]);

 return (
 <div className={`relative w-full h-full overflow-hidden bg-[#0a192f] text-white select-none ${className}`}>
 {/* 1. Imagem de Fundo Realista */}
 <div className="absolute inset-x-0 bottom-0 top-[35%] overflow-hidden">
 <img
 src={backgroundImageUrl}
 alt={title}
 crossOrigin={backgroundImageUrl?.startsWith("data:") ? undefined : "anonymous"}
 className="w-full h-full object-cover object-center transform scale-105"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
 </div>

 {/* 2. Topo com Fundo Limpo / Gradiente */}
 <div className={`absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b ${gradientClass}`} />

 {/* 3. Camada de Conteúdo e Tipografia Editorial */}
 <div
 className={`relative z-10 w-full h-full flex flex-col justify-between ${
 isOneOne ? "p-10" : aspectRatio === "4:5" ? "p-12" : "p-16"
 }`}
 >
 {/* Bloco Superior: Título & Datas */}
 <div className={`w-full text-center space-y-4 ${isOneOne ? "pt-4" : "pt-8"}`}>
 {promoBadge && (
 <div className="inline-flex items-center gap-3 px-7 py-3 rounded-full bg-amber-400/25 border border-amber-400/50 text-amber-300 font-black uppercase tracking-widest text-xl backdrop-blur-md mb-2">
 <Star className="size-6 text-amber-400 shrink-0 fill-amber-400" />
 <span>{promoBadge}</span>
 </div>
 )}

 <h1
 className={`font-black uppercase tracking-tight text-white drop- leading-none max-w-4xl mx-auto line-clamp-2 ${
 isOneOne ? "text-5xl" : "text-7xl"
 }`}
 >
 {title}
 </h1>

 <p
 className={`font-bold tracking-wide text-white/95 drop- ${
 isOneOne ? "text-2xl" : "text-3xl"
 }`}
 >
 {datesOrAvailability || subtitle || "Período não informado"}
 </p>

 {/* Inclusões com Ícones */}
 <div
 className={`flex items-center justify-center flex-wrap max-w-4xl mx-auto ${
 isOneOne ? "pt-4 gap-4" : "pt-6 gap-5"
 }`}
 >
 {formattedInclusions.map((inc, i) => {
 const IncIcon = inc.Icon;
 return (
 <div
 key={i}
 className="flex items-center gap-4 rounded-full bg-white/20 backdrop-blur-md border border-white/25 text-white px-7 py-4 "
 >
 <IncIcon className="size-7 text-white shrink-0" strokeWidth={2.5} />
 <span className="font-bold tracking-tight text-xl">
 {inc.label}
 </span>
 </div>
 );
 })}
 </div>
 </div>

 {/* Bloco Inferior: Preço em Frosted Glass & Selo da Loja & CTA */}
 <div className={`w-full flex items-end justify-between gap-6 ${isOneOne ? "pb-4" : "pb-8"}`}>
 <div className="rounded-3xl bg-black/60 backdrop-blur-2xl border border-white/30 p-8 space-y-2 text-white max-w-xl">
 <span className="font-bold text-white/80 block uppercase tracking-wider text-xl">
 Por apenas
 </span>

 <div className="flex items-baseline gap-3">
 <span className="font-black text-amber-400 text-4xl">
 {priceCents !== null && priceCents !== undefined ? `${maxInstallments}x` : "Preço"}
 </span>
 <span className="text-white/80 text-2xl font-bold">
 {priceCents !== null && priceCents !== undefined ? "de" : "não informado"}
 </span>
 <span className="font-black text-white tracking-tight leading-none text-6xl">
 {effectiveInstallmentCents !== null ? formatMoney(effectiveInstallmentCents) : "—"}
 </span>
 </div>

 <div className="pt-2 flex flex-col space-y-1 font-semibold">
 <span className="text-amber-300 font-bold uppercase tracking-wider text-xl">
 {pricingMode === "per_person" ? "Por pessoa" : "Pacote fechado"}
 </span>
 <span className="text-white/75 text-xl">
 {paymentMethodsLabel}
 </span>
 </div>
 </div>

 {/* Lado Direito Inferior: Selo da Agência e Botão CTA */}
 <div className="flex flex-col items-end gap-5 shrink-0">
 {/* Selo da Agência / Loja */}
 <div className="flex items-center gap-3 px-7 py-4 rounded-2xl bg-black/50 backdrop-blur-md border border-white/20 text-white/95 ">
 <ShieldCheck className="size-7 text-emerald-400 shrink-0" />
 <span className="text-2xl font-black tracking-tight">
 {storeName || "Waesy Turismo"}
 </span>
 </div>

 {/* Botão de Chamada para Ação */}
 <div className={`bg-amber-400 hover:bg-amber-300 text-slate-950 ${isOneOne ? "px-8 py-5 text-xl" : "px-10 py-6 text-2xl"} rounded-2xl flex items-center gap-4 transition-transform active:scale-95 font-black`}>
 <span>{ctaLabel || "Garantir Vaga"}</span>
 <ArrowRight className="size-8 text-slate-950" strokeWidth={2.5} />
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
