/**
 * RealEstateLuxuryDarkGlass.tsx — Template Imóveis 03: Midnight Luxury & Duotone Futurista (9:16)
 * Blueprint: Fundo ultra escuro, fotografia central em moldura squircle iluminada, card em vidro fumê e CTA metálico dourado
 */

import React, { useMemo } from "react";
import { Key, MapPin, Sparkles, ShieldCheck, ArrowRight } from "lucide-react";
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
    <div className={`relative w-full h-full overflow-hidden bg-gradient-to-b from-[#050811] via-[#020408] to-[#010204] text-white select-none p-6 sm:p-8 flex flex-col justify-between ${className}`}>
      {/* ── 1. Header Noturno com Identidade de Luxo ── */}
      <div className="pt-2 text-center space-y-1.5 shrink-0">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.25em] text-amber-300 font-bold">
          <Sparkles className="size-3.5 text-amber-400" />
          <span>{storeName || "Private Properties"}</span>
          <Sparkles className="size-3.5 text-amber-400" />
        </div>
        <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent mx-auto" />
      </div>

      {/* ── 2. Fotografia Central em Moldura Squircle Iluminada (62% da área) ── */}
      <div className="relative w-full h-[58%] my-3 rounded-[36px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.9)] border border-amber-400/20 bg-neutral-900 shrink-0">
        <img
          src={backgroundImageUrl}
          alt={title}
          crossOrigin={backgroundImageUrl?.startsWith("data:") ? undefined : "anonymous"}
          className="w-full h-full object-cover object-center transform scale-103"
        />
        {/* Overlay com vinheta profunda */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

        {/* Selo Dourado de Oportunidade */}
        <div className="absolute top-4 left-4">
          <span className="px-4 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-amber-400/30 text-amber-300 font-mono text-[11px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5">
            <Key className="size-3.5 text-amber-400" />
            <span>{promoBadge}</span>
          </span>
        </div>

        {/* Localização Nobre */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-white/90 text-xs font-medium">
            <MapPin className="size-3.5 text-amber-400 shrink-0" />
            <span className="truncate max-w-[240px]">{destinationOrLocation || "Localização Nobre"}</span>
          </div>
        </div>
      </div>

      {/* ── 3. Card Flutuante em Vidro Negro Fumê (Base) ── */}
      <div className="flex-1 min-h-0 rounded-3xl bg-black/85 backdrop-blur-2xl border border-amber-400/25 p-5 flex flex-col justify-between shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300/80 font-bold">
              {subtitle || "Imóvel de Alto Padrão"}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-white/60">
              <ShieldCheck className="size-3 text-emerald-400" />
              <span>Verificado</span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight line-clamp-1">
            {title}
          </h1>
        </div>

        {/* Chips de Atributos com Borda Dourada Suave */}
        <div className="flex flex-wrap gap-1.5 py-1">
          {resolvedSpecs.map((spec, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-xl bg-neutral-900/80 border border-amber-400/15 text-white/90 text-[11px] font-semibold"
            >
              {spec}
            </span>
          ))}
        </div>

        {/* Preço e Botão CTA Dourado em Largura Total */}
        <div className="space-y-2.5 pt-2 border-t border-white/10">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-white/60 font-medium">Investimento</span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-300 tracking-tight">
              {formatMoney(priceCents)}
            </div>
          </div>

          <div className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 active:scale-95 transition-all cursor-pointer">
            <span>{ctaLabel}</span>
            <ArrowRight className="size-4 stroke-[3]" />
          </div>
        </div>
      </div>
    </div>
  );
}
