/**
 * GastronomyTemplate.tsx — Template Social para Gastronomia, Pratos e Delivery
 * Fotografia de alta saturação, tempo de entrega e selo artesanal
 */

import React, { useMemo } from "react";
import { Utensils, Clock, Flame, ShieldCheck, Star } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { SocialTemplateProps } from "./types";

export function GastronomyTemplate({ data, className = "" }: SocialTemplateProps) {
  const {
    title,
    subtitle,
    datesOrAvailability,
    highlights = [],
    priceCents = 4890,
    backgroundImageUrl,
    paymentMethodsLabel = "Peça pelo WhatsApp ou App",
    aspectRatio = "9:16",
    promoBadge = "COMBO DO CHEF",
    storeName = "Waesy Gastronomia",
  } = data;

  const resolvedHighlights = highlights && highlights.length > 0 ? highlights.slice(0, 3) : [
    "Ingredientes Frescos",
    "Preparo Artesanal",
    "Entrega Rápida 35 min",
  ];

  return (
    <div className={`relative w-full h-full overflow-hidden bg-neutral-950 text-white select-none ${className}`}>
      {/* 1. Fotografia do Prato */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={backgroundImageUrl}
          alt={title}
          crossOrigin={backgroundImageUrl?.startsWith("data:") ? undefined : "anonymous"}
          className="w-full h-full object-cover object-center transform scale-103"
        />
        {/* Vinheta escura clássica de cardápio gourmet */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/70" />
      </div>

      {/* 2. Conteúdo Visual */}
      <div
        className={`relative z-10 w-full h-full flex flex-col justify-between ${
          aspectRatio === "1:1" ? "p-10" : aspectRatio === "4:5" ? "p-12" : "p-16"
        }`}
      >
        {/* Topo: Selo Gastronômico */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500 text-slate-950 font-black uppercase tracking-wider text-xs sm:text-sm shadow-md">
            <Flame className="size-4 shrink-0 fill-current" />
            <span>{promoBadge || "ESPECIAL DA CASA"}</span>
          </div>

          <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white/90 text-xs sm:text-sm font-semibold">
            <Clock className="size-3.5 text-amber-400 shrink-0" />
            <span>35-45 min</span>
          </div>
        </div>

        {/* Centro: Título e Descrição Apetitosa */}
        <div className="space-y-3">
          <h1
            className={`font-black uppercase tracking-tight text-white drop-shadow-md leading-[1.05] line-clamp-2 ${
              aspectRatio === "1:1" ? "text-4xl md:text-5xl" : "text-6xl md:text-7xl"
            }`}
          >
            {title}
          </h1>

          <p className="text-white/80 font-medium text-lg sm:text-xl line-clamp-2 max-w-xl">
            {subtitle || datesOrAvailability || "Sabor incomparável preparado com ingredientes selecionados."}
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            {resolvedHighlights.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white/90 text-xs sm:text-sm font-semibold"
              >
                <Star className="size-3.5 text-amber-400 shrink-0 fill-current" />
                <span>{item}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Base: Preço + Selo do Restaurante */}
        <div className="w-full flex items-end justify-between gap-4 pt-4 border-t border-white/20">
          <div className="space-y-1">
            <span className="text-xs sm:text-sm font-semibold text-white/70 uppercase tracking-wider block">
              Preço Especial
            </span>
            <div className="text-4xl sm:text-5xl font-black font-mono text-amber-400 tracking-tight">
              {formatMoney(priceCents)}
            </div>
            <p className="text-[11px] sm:text-xs text-white/60">
              {paymentMethodsLabel}
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-white/90 text-xs sm:text-sm font-bold shrink-0">
            <Utensils className="size-4.5 text-amber-400 shrink-0" />
            <span className="truncate max-w-[180px]">{storeName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
