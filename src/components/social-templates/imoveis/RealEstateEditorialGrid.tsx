/**
 * RealEstateEditorialGrid.tsx — Template Imóveis 02: Split-Card Modernista com Moldura Editorial (9:16)
 * Blueprint: Moldura externa clara, janela fotográfica 58% no topo, base editorial branca com grid matricial 2x2 e barra escura de CTA
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
    <div className={`relative w-full h-full overflow-hidden bg-[#f1f5f9] text-slate-900 select-none p-6 sm:p-8 flex flex-col justify-between ${className}`}>
      {/* ── 1. Janela Panorâmica Superior (58% de altura) ── */}
      <div className="relative w-full h-[58%] rounded-3xl overflow-hidden shadow-xl border border-slate-300/80 bg-slate-900 shrink-0">
        <img
          src={backgroundImageUrl}
          alt={title}
          crossOrigin={backgroundImageUrl?.startsWith("data:") ? undefined : "anonymous"}
          className="w-full h-full object-cover object-center"
        />

        {/* Tag Minimalista de Topo */}
        <div className="absolute top-5 left-5">
          <span className="px-4 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md text-white font-mono uppercase tracking-widest text-xs font-bold shadow-md">
            {promoBadge || "EDIFÍCIO RESIDENCIAL"}
          </span>
        </div>

        {/* Localização em Pílula Flutuante */}
        <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-950/80 backdrop-blur-md text-white/90 text-xs sm:text-sm font-semibold">
            <MapPin className="size-4 text-amber-400 shrink-0" />
            <span className="truncate max-w-[260px]">{destinationOrLocation || "Localização Privilegiada"}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-md text-slate-900 text-xs font-bold shadow-sm">
            <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
            <span className="truncate max-w-[120px]">{storeName}</span>
          </div>
        </div>
      </div>

      {/* ── 2. Bloco Editorial Inferior (Tipografia & Grid Matricial) ── */}
      <div className="flex-1 min-h-0 pt-5 flex flex-col justify-between">
        {/* Título e Subtítulo */}
        <div className="space-y-1">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
            {subtitle || "Imóvel Selecionado para Venda"}
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight uppercase line-clamp-2 leading-[1.08]">
            {title}
          </h1>
        </div>

        {/* Grid Matricial 2x2 com Divisórias Finas */}
        <div className="grid grid-cols-2 gap-2 my-2">
          {resolvedSpecs.map((spec, i) => (
            <div
              key={i}
              className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-center"
            >
              <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold truncate">
                {spec.label}
              </span>
              <span className="text-sm sm:text-base font-black text-slate-900 truncate">
                {spec.value}
              </span>
            </div>
          ))}
        </div>

        {/* Barra Integrada em Preto Carvão com Preço e CTA */}
        <div className="w-full p-4 rounded-2xl bg-slate-950 text-white flex items-center justify-between gap-3 shadow-lg shrink-0">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              {pricingMode === "monthly" ? "Locação Mensal" : "Valor Total"}
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
              {formatMoney(priceCents)}
            </div>
            {maxInstallments > 1 && (
              <span className="text-[10px] text-amber-400 font-mono block">
                {maxInstallments}x de {formatMoney(effectiveInstallmentCents)}
              </span>
            )}
          </div>

          <div className="h-11 px-5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all shrink-0">
            <span>{ctaLabel}</span>
            <ArrowRight className="size-4 stroke-[3]" />
          </div>
        </div>
      </div>
    </div>
  );
}
