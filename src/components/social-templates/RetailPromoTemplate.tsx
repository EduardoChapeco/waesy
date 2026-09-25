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

  const effectiveInstallmentCents = useMemo(() => {
    if (installmentCents && installmentCents > 0) return installmentCents;
    if (priceCents && priceCents > 0 && maxInstallments > 0) {
      return Math.round(priceCents / maxInstallments);
    }
    return 1899;
  }, [installmentCents, priceCents, maxInstallments]);

  const discountPercent = useMemo(() => {
    if (originalPriceCents && originalPriceCents > priceCents) {
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
          aspectRatio === "1:1" ? "p-10" : aspectRatio === "4:5" ? "p-12" : "p-16"
        }`}
      >
        {/* Topo: Badges de Oferta + Loja */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-red-600 text-white font-black uppercase tracking-wider text-xs sm:text-sm shadow-lg">
            <Zap className="size-4 shrink-0 fill-current" />
            <span>{promoBadge || "SUPER OFERTA"}</span>
          </div>

          <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-400 text-black font-black text-xs sm:text-sm">
            <span>-{discountPercent}% OFF</span>
          </div>
        </div>

        {/* Centro: Título do Produto & Destaques */}
        <div className="space-y-4">
          <h1
            className={`font-black uppercase tracking-tight text-white drop-shadow-md leading-[1.05] line-clamp-2 ${
              aspectRatio === "1:1" ? "text-4xl md:text-5xl" : "text-6xl md:text-7xl"
            }`}
          >
            {title}
          </h1>

          <p className="text-white/80 font-medium text-lg sm:text-xl line-clamp-1">
            {subtitle || datesOrAvailability || "Preço especial por tempo limitado"}
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            {resolvedHighlights.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white/90 text-xs sm:text-sm font-semibold"
              >
                <Check className="size-3.5 text-emerald-400 shrink-0" />
                <span>{item}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Base: Caixa de Preço De/Por & Entrega */}
        <div className="w-full flex items-end justify-between gap-4 pt-4 border-t border-white/20">
          <div className="space-y-1">
            {originalPriceCents && (
              <div className="text-sm sm:text-base font-semibold text-white/50 line-through font-mono">
                De {formatMoney(originalPriceCents)}
              </div>
            )}
            <div className="flex items-baseline gap-2">
              <span className="text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-wider">
                Por
              </span>
              <span className="text-4xl sm:text-5xl font-black font-mono text-white tracking-tight">
                {formatMoney(priceCents)}
              </span>
            </div>
            {maxInstallments > 1 && (
              <p className="text-xs sm:text-sm text-white/80 font-mono">
                Ou em até <span className="font-bold text-white">{maxInstallments}x</span> de <span className="text-amber-400 font-bold">{formatMoney(effectiveInstallmentCents)}</span>
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
