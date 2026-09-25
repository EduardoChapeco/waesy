/**
 * RealEstateMinimalHero.tsx — Template Imóveis 01: A Fachada Dominante & Card Flutuante (9:16)
 * Blueprint: Imagem full bleed, gradiente escuro inferior a 40%, título bold, pílulas de atributos e CTA de alto contraste
 */

import React, { useMemo } from "react";
import { MapPin, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { SocialTemplateProps } from "../types";

export function RealEstateMinimalHero({ data, className = "" }: SocialTemplateProps) {
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
    promoBadge = "LANÇAMENTO EXCLUSIVO",
    storeName = "Waesy Imóveis",
    ctaLabel = "Agendar Visita",
  } = data;

  const effectiveInstallmentCents = useMemo(() => {
    if (installmentCents && installmentCents > 0) return installmentCents;
    if (priceCents && priceCents > 0 && maxInstallments > 0) {
      return Math.round(priceCents / maxInstallments);
    }
    return 625000;
  }, [installmentCents, priceCents, maxInstallments]);

  const defaultSpecs = ["3 Suítes Plenas", "2 Vagas Garagem", "Varanda Gourmet", "145m² Privativos"];
  const resolvedSpecs = highlights && highlights.length > 0 ? highlights.slice(0, 4) : defaultSpecs;

  return (
    <div className={`relative w-full h-full overflow-hidden bg-[#070b12] text-white select-none ${className}`}>
      {/* ── 1. Fotografia Full Bleed (100% da área) ── */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={backgroundImageUrl}
          alt={title}
          crossOrigin={backgroundImageUrl?.startsWith("data:") ? undefined : "anonymous"}
          className="w-full h-full object-cover object-center transform scale-102"
        />
        {/* Gradiente escuro a partir dos 50% centrais até a base */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070b12] via-[#070b12]/60 to-transparent" />
        {/* Vinheta superior suave para proteção da safe zone */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />
      </div>

      {/* ── 2. Conteúdo em Camadas (Safe Zones Instagram) ── */}
      <div
        className={`relative z-10 w-full h-full flex flex-col justify-between ${
          aspectRatio === "1:1" ? "p-10" : aspectRatio === "4:5" ? "p-12" : "p-14"
        }`}
      >
        {/* Topo / Safe Zone Superior (Tags & Localização) */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-amber-300 font-bold uppercase tracking-wider text-xs sm:text-sm shadow-md">
            <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
            <span>{promoBadge || "IMÓVEL EXCLUSIVO"}</span>
          </div>

          <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white/90 text-xs sm:text-sm font-medium">
            <MapPin className="size-4 text-amber-400 shrink-0" />
            <span className="truncate max-w-[200px]">{destinationOrLocation || "Localização Nobre"}</span>
          </div>
        </div>

        {/* Base / Terço Inferior (Hierarquia de Título, Metas, Preço e CTA) */}
        <div className="space-y-4 pb-2">
          {/* Título & Subtítulo */}
          <div className="space-y-2">
            <h1
              className={`font-black uppercase tracking-tight text-white drop-shadow-md leading-[1.05] line-clamp-2 ${
                aspectRatio === "1:1" ? "text-4xl md:text-5xl" : "text-6xl md:text-7xl"
              }`}
            >
              {title}
            </h1>
            <p className="text-white/80 font-medium text-lg sm:text-xl line-clamp-1">
              {subtitle || datesOrAvailability || "Pronto para Morar ou Investir com Alto Retorno"}
            </p>
          </div>

          {/* Atributos em Chips com cantos suaves */}
          <div className="flex flex-wrap gap-2 pt-1 max-w-2xl">
            {resolvedSpecs.map((spec, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-white font-semibold text-xs sm:text-sm shadow-sm"
              >
                <CheckCircle2 className="size-4 text-amber-400 shrink-0" />
                <span>{spec}</span>
              </div>
            ))}
          </div>

          {/* Barra de Preço & Botão CTA de Alto Contraste */}
          <div className="pt-4 border-t border-white/20 flex items-end justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider block">
                {pricingMode === "monthly" ? "Aluguel Mensal" : "Valor de Venda"}
              </span>
              <div className="text-4xl sm:text-5xl font-black font-mono text-white tracking-tight">
                {formatMoney(priceCents)}
              </div>
              {maxInstallments > 1 && (
                <p className="text-xs text-white/80 font-mono">
                  Entrada + parcelas de <span className="text-amber-400 font-bold">{formatMoney(effectiveInstallmentCents)}</span>
                </p>
              )}
              <p className="text-[11px] text-white/60">{paymentMethodsLabel}</p>
            </div>

            {/* Botão CTA com Alto Contraste */}
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <div className="h-12 px-6 rounded-2xl bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-amber-400/20 active:scale-95 transition-all">
                <span>{ctaLabel}</span>
                <ArrowRight className="size-4 stroke-[3]" />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-white/70 font-medium">
                <ShieldCheck className="size-3.5 text-emerald-400 shrink-0" />
                <span className="truncate max-w-[160px]">{storeName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
