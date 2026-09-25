/**
 * TravelTemplateEditorial.tsx — Template Editorial para Viagens e Resorts
 * Tipografia clean, gradiente superior suave e caixa de preço em vidro fosco (Frosted Glass)
 */

import React, { useMemo } from "react";
import { Plane, Coffee, Car, Utensils, Compass, Sun, Snowflake, Anchor, ShieldCheck, Sparkles } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { SocialTemplateProps } from "./types";

export function TravelTemplateEditorial({ data, className = "" }: SocialTemplateProps) {
  const {
    title,
    subtitle,
    datesOrAvailability,
    highlights = [],
    priceCents = 249000,
    maxInstallments = 12,
    installmentCents,
    pricingMode = "per_person",
    backgroundImageUrl,
    paymentMethodsLabel = "no boleto ou cartão",
    aspectRatio = "9:16",
    themeGradient = "ocean_blue",
    promoBadge,
    storeName = "Waesy Turismo",
  } = data;

  const effectiveInstallmentCents = useMemo(() => {
    if (installmentCents && installmentCents > 0) return installmentCents;
    if (priceCents && priceCents > 0 && maxInstallments > 0) {
      return Math.round(priceCents / maxInstallments);
    }
    return 20750;
  }, [installmentCents, priceCents, maxInstallments]);

  const formattedInclusions = useMemo(() => {
    const list = (highlights && highlights.length > 0
      ? highlights
      : ["Aéreo ida e volta", "Hospedagem com café", "Traslados inclusos"]
    ).slice(0, 4);

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
      <div className="absolute inset-x-0 bottom-0 top-[38%] overflow-hidden">
        <img
          src={backgroundImageUrl}
          alt={title}
          crossOrigin={backgroundImageUrl?.startsWith("data:") ? undefined : "anonymous"}
          className="w-full h-full object-cover object-center transform scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
      </div>

      {/* 2. Topo com Fundo Limpo / Gradiente */}
      <div className={`absolute inset-x-0 top-0 h-[52%] bg-gradient-to-b ${gradientClass}`} />

      {/* 3. Camada de Conteúdo e Tipografia Editorial */}
      <div
        className={`relative z-10 w-full h-full flex flex-col justify-between ${
          aspectRatio === "1:1" ? "p-10" : aspectRatio === "4:5" ? "p-12" : "p-16"
        }`}
      >
        {/* Bloco Superior: Título & Datas */}
        <div className={`w-full text-center space-y-3 ${aspectRatio === "1:1" ? "pt-4" : "pt-8"}`}>
          {promoBadge && (
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 font-bold uppercase tracking-widest text-sm sm:text-base shadow-sm backdrop-blur-md mb-2">
              <Sparkles className="size-4.5 text-amber-400 shrink-0" />
              <span>{promoBadge}</span>
            </div>
          )}

          <h1
            className={`font-black uppercase tracking-tight text-white drop-shadow-md leading-[1.05] max-w-4xl mx-auto line-clamp-2 ${
              aspectRatio === "1:1" ? "text-5xl md:text-6xl" : "text-7xl md:text-8xl"
            }`}
          >
            {title}
          </h1>

          <p
            className={`font-medium tracking-wide text-white/90 drop-shadow-sm ${
              aspectRatio === "1:1" ? "text-2xl" : "text-3xl"
            }`}
          >
            {datesOrAvailability || subtitle || "Pacote Exclusivo"}
          </p>

          {/* Inclusões com Ícones */}
          <div
            className={`flex items-center justify-center flex-wrap max-w-4xl mx-auto ${
              aspectRatio === "1:1" ? "pt-4 gap-3" : "pt-8 gap-6"
            }`}
          >
            {formattedInclusions.map((inc, i) => {
              const IncIcon = inc.Icon;
              return (
                <div
                  key={i}
                  className={`flex items-center rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-sm ${
                    aspectRatio === "1:1" ? "gap-2 px-4 py-1.5" : "gap-3 px-5 py-2.5"
                  }`}
                >
                  <IncIcon
                    className={`text-white shrink-0 ${aspectRatio === "1:1" ? "size-4.5" : "size-6"}`}
                    strokeWidth={2.2}
                  />
                  <span
                    className={`font-semibold tracking-tight whitespace-nowrap ${
                      aspectRatio === "1:1" ? "text-base" : "text-xl"
                    }`}
                  >
                    {inc.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bloco Inferior: Preço em Frosted Glass & Selo da Loja */}
        <div
          className={`w-full flex items-end justify-between ${
            aspectRatio === "1:1" ? "pb-4" : "pb-8"
          }`}
        >
          <div
            className={`rounded-3xl bg-black/55 backdrop-blur-xl border border-white/25 shadow-2xl space-y-2 text-white ${
              aspectRatio === "1:1" ? "max-w-xs p-4" : "max-w-md p-6"
            }`}
          >
            <span
              className={`font-medium text-white/80 block uppercase tracking-wider ${
                aspectRatio === "1:1" ? "text-sm" : "text-lg"
              }`}
            >
              Por apenas
            </span>

            <div className="flex items-baseline gap-2">
              <span
                className={`font-black text-amber-400 font-mono ${
                  aspectRatio === "1:1" ? "text-2xl" : "text-3xl"
                }`}
              >
                {maxInstallments}x
              </span>
              <span className={`text-white/80 ${aspectRatio === "1:1" ? "text-sm" : "text-lg"}`}>
                de
              </span>
              <span
                className={`font-black text-white tracking-tight font-mono ${
                  aspectRatio === "1:1" ? "text-3xl" : "text-5xl"
                }`}
              >
                {formatMoney(effectiveInstallmentCents)}
              </span>
            </div>

            <div className="pt-1 flex flex-col text-sm text-white/90 space-y-0.5 font-medium">
              <span className="text-amber-300 font-bold uppercase tracking-wider text-xs">
                {pricingMode === "per_person" ? "Por pessoa" : "Pacote fechado"}
              </span>
              <span className="text-white/70 text-xs">
                {paymentMethodsLabel}
              </span>
            </div>
          </div>

          {/* Selo da Agência / Loja */}
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-white/80">
            <ShieldCheck className="size-5 sm:size-6 text-emerald-400 shrink-0" />
            <span className="text-sm sm:text-base font-semibold tracking-tight truncate max-w-[200px]">
              {storeName || "Waesy Turismo"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
