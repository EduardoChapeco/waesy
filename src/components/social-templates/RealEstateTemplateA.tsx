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
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/75" />
      </div>

      {/* 2. Conteúdo Sobreposto */}
      <div
        className={`relative z-10 w-full h-full flex flex-col justify-between ${
          aspectRatio === "1:1" ? "p-10" : aspectRatio === "4:5" ? "p-12" : "p-16"
        }`}
      >
        {/* Topo: Selo + Localização */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            {promoBadge ? (
              <span className="px-4 py-1.5 rounded-full bg-amber-400 text-black font-black uppercase tracking-wider text-xs sm:text-sm shadow-md">
                {promoBadge}
              </span>
            ) : (
              <span className="px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold uppercase tracking-wider text-xs sm:text-sm">
                Oportunidade Única
              </span>
            )}

            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white/90 text-xs sm:text-sm font-medium">
              <MapPin className="size-4 text-primary shrink-0" />
              <span className="truncate max-w-[240px]">
                {destinationOrLocation || "Localização Privilegiada"}
              </span>
            </div>
          </div>

          <div className="pt-4">
            <h1
              className={`font-black uppercase tracking-tight text-white drop-shadow-md leading-[1.05] line-clamp-2 ${
                aspectRatio === "1:1" ? "text-4xl md:text-5xl" : "text-6xl md:text-7xl"
              }`}
            >
              {title}
            </h1>
            <p className="text-white/80 font-medium text-lg sm:text-xl mt-2 line-clamp-1">
              {subtitle || datesOrAvailability || "Pronto para Morar ou Investir"}
            </p>
          </div>
        </div>

        {/* Centro: Especificações do Imóvel (Badges) */}
        <div className="grid grid-cols-2 gap-3 max-w-xl">
          {resolvedSpecs.map((spec, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 text-white font-semibold text-sm sm:text-base shadow-sm"
            >
              <CheckCircle2 className="size-5 text-primary shrink-0" />
              <span className="truncate">{spec}</span>
            </div>
          ))}
        </div>

        {/* Base: Preço + Condições + Selo da Imobiliária */}
        <div className="w-full flex items-end justify-between gap-4 pt-4 border-t border-white/20">
          <div className="space-y-1">
            <span className="text-xs sm:text-sm font-semibold text-white/70 uppercase tracking-wider block">
              {pricingMode === "monthly" ? "Aluguel Mensal" : "Valor de Venda"}
            </span>
            <div className="text-4xl sm:text-5xl font-black font-mono text-white tracking-tight">
              {formatMoney(priceCents)}
            </div>
            {maxInstallments > 1 && (
              <p className="text-xs sm:text-sm text-white/80 font-mono">
                Ou entrada + parcelas de <span className="text-amber-400 font-bold">{formatMoney(effectiveInstallmentCents)}</span>
              </p>
            )}
            <p className="text-[11px] sm:text-xs text-white/60">
              {paymentMethodsLabel}
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-white/90 text-xs sm:text-sm font-bold shrink-0">
            <ShieldCheck className="size-5 text-emerald-400 shrink-0" />
            <span className="truncate max-w-[180px]">{storeName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
