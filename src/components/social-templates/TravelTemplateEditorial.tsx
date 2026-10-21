/**
 * TravelTemplateEditorial.tsx — Template Editorial Canônico ("ARTE SALVA" Excelência Tour)
 * Tipografia com Text-Fit Dinâmico + Camada Duplicada de Sombra (--title-shadow-x/y/blur/opacity),
 * Inclusões Priorizadas (2–4 slots) e Caixa de Preço em Liquid / Frosted Glass (LiquidGlassSurface).
 */

import React, { useMemo } from "react";
import {
  Plane,
  Coffee,
  Car,
  Utensils,
  Compass,
  Sun,
  Snowflake,
  Anchor,
  ShieldCheck,
  Star,
  ArrowRight,
  Ticket,
} from "lucide-react";
import { formatMoney } from "@/lib/money";
import { fitStoryTitle } from "@/lib/travel/excelencia-offer-engine";
import { LiquidGlassSurface } from "@/components/travel/liquid-glass-surface";
import type { SocialTemplateProps } from "./types";

const TOP_GRADIENT_STYLES: Record<string, string> = {
  sunset_amber:
    "linear-gradient(180deg, rgba(30,20,13,0.96) 0%, rgba(58,32,18,0.82) 55%, rgba(58,32,18,0) 100%)",
  emerald_nature:
    "linear-gradient(180deg, rgba(8,28,21,0.96) 0%, rgba(27,67,50,0.82) 55%, rgba(27,67,50,0) 100%)",
  midnight_luxury:
    "linear-gradient(180deg, rgba(10,10,15,0.96) 0%, rgba(22,23,38,0.84) 55%, rgba(22,23,38,0) 100%)",
  caribbean_turquoise:
    "linear-gradient(180deg, rgba(4,36,46,0.96) 0%, rgba(8,59,74,0.82) 55%, rgba(8,59,74,0) 100%)",
  nordic_snow:
    "linear-gradient(180deg, rgba(17,24,39,0.96) 0%, rgba(31,41,61,0.82) 55%, rgba(31,41,61,0) 100%)",
  ocean_blue:
    "linear-gradient(180deg, rgba(6,30,56,0.96) 0%, rgba(11,51,92,0.82) 55%, rgba(11,51,92,0) 100%)",
};

export function TravelTemplateEditorial({ data, className = "" }: SocialTemplateProps) {
  const {
    title,
    subtitle,
    datesOrAvailability,
    highlights = [],
    priceCents = null,
    maxInstallments = 15,
    installmentCents,
    pricingMode = "per_person",
    priceBasisLabel,
    occupancySummaryLabel,
    backgroundImageUrl,
    paymentMethodsLabel = "no boleto e cartão",
    aspectRatio = "9:16",
    themeGradient = "ocean_blue",
    promoBadge,
    storeName,
    ctaLabel,
    glassMaterial,
    titleFontSizeOverride,
    titleOffsetX = 0,
    titleOffsetY = 0,
    priceCardOffsetX = 0,
    priceCardOffsetY = 0,
    priceCardScale = 1,
    photoObjectPositionY = 55,
  } = data;

  const fittedTitle = useMemo(() => {
    const baseFit = fitStoryTitle(title || "DESTINO", {
      overrideFontSizePx: titleFontSizeOverride,
    });
    if (aspectRatio === "1:1" && !titleFontSizeOverride) {
      return {
        ...baseFit,
        fontSizePx: Math.round(baseFit.fontSizePx * 0.72),
      };
    }
    if (aspectRatio === "4:5" && !titleFontSizeOverride) {
      return {
        ...baseFit,
        fontSizePx: Math.round(baseFit.fontSizePx * 0.86),
      };
    }
    return baseFit;
  }, [title, titleFontSizeOverride, aspectRatio]);

  const effectiveInstallmentCents = useMemo(() => {
    if (installmentCents && installmentCents > 0) return installmentCents;
    if (priceCents && priceCents > 0 && maxInstallments > 0) {
      return Math.round(priceCents / maxInstallments);
    }
    return null;
  }, [installmentCents, priceCents, maxInstallments]);

  const effectiveBasisLabel = useMemo(() => {
    if (priceBasisLabel && priceBasisLabel.trim()) return priceBasisLabel;
    return pricingMode === "per_person" ? "Por pessoa" : "Pacote fechado";
  }, [priceBasisLabel, pricingMode]);

  const formattedInclusions = useMemo(() => {
    const list = (highlights || []).filter(Boolean).slice(0, 4);

    return list.map((item) => {
      const lower = item.toLowerCase();
      let Icon = Compass;
      if (lower.includes("aéreo") || lower.includes("aereo") || lower.includes("voo") || lower.includes("avião")) Icon = Plane;
      else if (lower.includes("café") || lower.includes("cafe") || lower.includes("hospedag") || lower.includes("hotel")) Icon = Coffee;
      else if (lower.includes("all inclusive") || lower.includes("almoço") || lower.includes("refeição") || lower.includes("pensão")) Icon = Utensils;
      else if (lower.includes("traslado") || lower.includes("transfer") || lower.includes("carro")) Icon = Car;
      else if (lower.includes("passeio") || lower.includes("ingresso") || lower.includes("trem") || lower.includes("tour") || lower.includes("machu picchu")) Icon = Ticket;
      else if (lower.includes("praia") || lower.includes("resort") || lower.includes("sol")) Icon = Sun;
      else if (lower.includes("neve") || lower.includes("esqui")) Icon = Snowflake;
      else if (lower.includes("cruzeiro") || lower.includes("barco") || lower.includes("navio")) Icon = Anchor;

      return { label: item, Icon };
    });
  }, [highlights]);

  const topGradientBackground =
    TOP_GRADIENT_STYLES[themeGradient || "ocean_blue"] || TOP_GRADIENT_STYLES.ocean_blue;

  return (
    <div
      style={{
        backgroundColor: "rgb(10, 25, 47)",
        ...fittedTitle.cssVariables,
      }}
      className={`relative w-full h-full overflow-hidden text-white select-none ${className}`}
    >
      {/* 1. Imagem de Fundo Realista c/ Controle de Posição Vertical */}
      <div
        style={{ top: "34%" }}
        className="absolute inset-x-0 bottom-0 overflow-hidden"
      >
        <img
          src={backgroundImageUrl}
          alt={title}
          crossOrigin={backgroundImageUrl?.startsWith("data:") ? undefined : "anonymous"}
          style={{
            objectPosition: `50% ${photoObjectPositionY}%`,
          }}
          className="w-full h-full object-cover transform scale-105"
        />
        <div
          style={{
            background:
              "linear-gradient(0deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.22) 55%, rgba(0,0,0,0) 100%)",
          }}
          className="absolute inset-0"
        />
      </div>

      {/* 2. Topo Atmosférico Limpo ("ARTE SALVA" Excelência Tour) */}
      <div
        style={{
          height: "54%",
          background: topGradientBackground,
        }}
        className="absolute inset-x-0 top-0"
      />

      {/* 3. Camada de Conteúdo Editorial */}
      <div
        className={`relative z-10 w-full h-full flex flex-col justify-between ${
          aspectRatio === "1:1" ? "p-10" : aspectRatio === "4:5" ? "p-12" : "p-16"
        }`}
      >
        {/* Bloco Superior: Selo, Título com Sombra Duplicada, Datas & 2–4 Inclusões */}
        <div
          style={{
            transform:
              titleOffsetX || titleOffsetY
                ? `translate(${titleOffsetX}px, ${titleOffsetY}px)`
                : undefined,
          }}
          className={`w-full text-center space-y-3 ${aspectRatio === "1:1" ? "pt-4" : "pt-8"}`}
        >
          {promoBadge && (
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 font-bold uppercase tracking-widest text-sm sm:text-base backdrop-blur-md mb-2">
              <Star className="size-4 text-amber-400 shrink-0" />
              <span>{promoBadge}</span>
            </div>
          )}

          {/* Título Principal c/ Camada Duplicada de Sombra Traseira (Sec. 10.2) */}
          <div className="relative inline-block max-w-4xl mx-auto">
            {fittedTitle.shadow.enabled && (
              <div
                aria-hidden="true"
                style={{
                  fontSize: `${fittedTitle.fontSizePx}px`,
                  lineHeight: fittedTitle.lineHeight,
                  letterSpacing: `${fittedTitle.letterSpacingEm}em`,
                  transform: `translate(${fittedTitle.shadow.offsetX}px, ${fittedTitle.shadow.offsetY}px)`,
                  opacity: fittedTitle.shadow.opacity,
                  color: fittedTitle.shadow.color,
                  filter:
                    fittedTitle.shadow.blurPx > 0
                      ? `blur(${fittedTitle.shadow.blurPx}px)`
                      : undefined,
                }}
                className="pointer-events-none select-none font-black uppercase"
              >
                {fittedTitle.lines.map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>
            )}

            <h1
              style={{
                fontSize: `${fittedTitle.fontSizePx}px`,
                lineHeight: fittedTitle.lineHeight,
                letterSpacing: `${fittedTitle.letterSpacingEm}em`,
              }}
              className={`${
                fittedTitle.shadow.enabled ? "absolute inset-0" : "relative"
              } font-black uppercase text-white`}
            >
              {fittedTitle.lines.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </h1>
          </div>

          <p
            className={`font-semibold tracking-wide text-white/95 ${
              aspectRatio === "1:1" ? "text-2xl" : "text-3xl"
            }`}
          >
            {datesOrAvailability || subtitle || "Período sob consulta"}
          </p>

          {/* Inclusões Priorizadas (2 a 4 itens) */}
          <div
            className={`flex items-center justify-center flex-wrap max-w-4xl mx-auto ${
              aspectRatio === "1:1" ? "pt-4 gap-3" : "pt-8 gap-5"
            }`}
          >
            {formattedInclusions.map((inc, i) => {
              const IncIcon = inc.Icon;
              return (
                <div
                  key={i}
                  className={`flex items-center rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white ${
                    aspectRatio === "1:1" ? "gap-2 px-4 py-2" : "gap-3 px-6 py-3"
                  }`}
                >
                  <IncIcon
                    className={`text-amber-300 shrink-0 ${
                      aspectRatio === "1:1" ? "size-4" : "size-6"
                    }`}
                    strokeWidth={2.2}
                  />
                  <span
                    className={`font-semibold tracking-tight ${
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

        {/* Bloco Inferior: Caixa de Valor em Frosted/Liquid Glass + Assinatura da Agência */}
        <div
          className={`w-full flex items-end justify-between gap-6 ${
            aspectRatio === "1:1" ? "pb-4" : "pb-8"
          }`}
        >
          <div
            style={{
              transform:
                priceCardOffsetX || priceCardOffsetY || priceCardScale !== 1
                  ? `translate(${priceCardOffsetX}px, ${priceCardOffsetY}px) scale(${priceCardScale})`
                  : undefined,
              transformOrigin: "bottom left",
            }}
          >
            <LiquidGlassSurface
              id="story-price-glass-card"
              material={glassMaterial}
              className={`text-white ${
                aspectRatio === "1:1" ? "max-w-xs p-5" : "max-w-lg p-8"
              }`}
            >
              <div className="space-y-2">
                <span
                  className={`font-semibold text-white/90 block uppercase tracking-wider ${
                    aspectRatio === "1:1" ? "text-sm" : "text-xl"
                  }`}
                >
                  Por apenas
                </span>

                <div className="flex items-baseline gap-2">
                  <span
                    className={`font-black text-amber-300 font-mono ${
                      aspectRatio === "1:1" ? "text-2xl" : "text-4xl"
                    }`}
                  >
                    {effectiveInstallmentCents !== null ? `${maxInstallments}x` : "Consulte"}
                  </span>
                  {effectiveInstallmentCents !== null && (
                    <span
                      className={`text-white/85 font-semibold ${
                        aspectRatio === "1:1" ? "text-sm" : "text-xl"
                      }`}
                    >
                      de
                    </span>
                  )}
                  <span
                    className={`font-black text-white tracking-tight font-mono ${
                      aspectRatio === "1:1" ? "text-3xl" : "text-6xl"
                    }`}
                  >
                    {effectiveInstallmentCents !== null
                      ? formatMoney(effectiveInstallmentCents)
                      : "Sob consulta"}
                  </span>
                </div>

                <div className="pt-2 flex flex-col space-y-1 font-medium">
                  <span
                    className={`text-amber-300 font-bold uppercase tracking-wider ${
                      aspectRatio === "1:1" ? "text-xs" : "text-base"
                    }`}
                  >
                    {effectiveBasisLabel}
                    {occupancySummaryLabel ? ` • ${occupancySummaryLabel}` : ""}
                  </span>
                  <span
                    className={`text-white/85 ${
                      aspectRatio === "1:1" ? "text-xs" : "text-base"
                    }`}
                  >
                    {paymentMethodsLabel}
                  </span>
                </div>
              </div>
            </LiquidGlassSurface>
          </div>

          {/* Lado Direito Inferior: Selo da Agência & CTA */}
          <div className="flex flex-col items-end gap-4 shrink-0">
            <div className="flex items-center gap-2 px-5 py-3 rounded-lg bg-black/45 backdrop-blur-md border border-white/15 text-white/90">
              <ShieldCheck className="size-5 sm:size-6 text-emerald-400 shrink-0" />
              <span className="text-sm sm:text-base font-bold tracking-tight">
                {storeName || "Excelência Tour"}
              </span>
            </div>

            <div className="bg-amber-400 text-slate-950 px-8 py-5 rounded-lg flex items-center gap-3">
              <span className="text-xl font-black tracking-wide">
                {ctaLabel || "Garantir Vaga"}
              </span>
              <ArrowRight className="size-6 text-slate-950" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
