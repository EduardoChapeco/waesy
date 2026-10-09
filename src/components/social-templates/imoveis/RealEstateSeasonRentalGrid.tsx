/**
 * RealEstateSeasonRentalGrid.tsx — Flyer de Aluguel por Temporada, Pousada & Imóveis com Grid 4 Fotos
 * Estilo Clean Americano com fundo creme, bloco verde de destaque e 4 fotos do imóvel
 */

import React from "react";
import { MapPin, Phone, CheckCircle2, ArrowRight } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { SocialTemplateProps } from "../types";

export function RealEstateSeasonRentalGrid({ data, scale = 1, className = "" }: SocialTemplateProps) {
  const isNineSixteen = data.aspectRatio === "9:16";
  const canvasWidth = isNineSixteen ? 1080 : data.aspectRatio === "4:5" ? 1080 : 1080;
  const canvasHeight = isNineSixteen ? 1920 : data.aspectRatio === "4:5" ? 1350 : 1080;

  return (
    <div
      style={{
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
      className={`relative bg-[#F9F7E8] text-slate-900 overflow-hidden font-sans select-none flex flex-col justify-between p-12 ${className}`}
    >
      {/* ── 1. Topo: Título Editorial de Aluguel de Temporada ── */}
      <div className="pt-8 text-center space-y-3">
        <h1 className="text-7xl sm:text-8xl font-black tracking-tight text-slate-900 uppercase">
          {data.title || "Aluguel de Temporada"}
        </h1>

        {/* Badge Verde de Chamada (ex: Feriado de Carnaval Disponível) */}
        <div className="inline-block bg-[#48BB78] text-white px-10 py-3 rounded-2xl shadow-md">
          <span className="text-3xl sm:text-4xl font-black uppercase tracking-wide">
            {data.promoBadge || data.subtitle || "Disponível para Temporada"}
          </span>
        </div>
      </div>

      {/* ── 2. Bloco Intermediário: Especificações em Bullets & Card Verde de Preço ── */}
      <div className="my-6 flex items-center justify-between gap-8 px-4">
        {/* Lado Esquerdo: Lista de Atributos com Bullets Verdes */}
        <div className="flex-1 space-y-3">
          {(data.highlights && data.highlights.length > 0 ? data.highlights : [
            "4 QUARTOS AMPLOS",
            "8 CAMAS CONFORTÁVEIS",
            "PISCINA AQUECIDA",
            "ÁREA GOURMET COM CHURRASQUEIRA",
            "GARAGEM COBERTA",
          ]).map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 text-2xl font-black text-slate-800 uppercase">
              <span className="size-3.5 rounded-full bg-[#48BB78] shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* Lado Direito: Card Flutuante Verde de Preço por Diária ou Pacote */}
        <div className="bg-[#48BB78] text-white p-8 rounded-3xl shadow-xl text-center min-w-[340px] shrink-0">
          <span className="text-xl font-bold uppercase tracking-wider block text-white/90 mb-1">
            {data.pricingMode === "monthly" ? "Aluguel Mensal" : "Promoção por apenas"}
          </span>
          <div className="flex items-baseline justify-center gap-1 font-mono">
            <span className="text-3xl font-black">R$</span>
            <span className="text-6xl font-black tracking-tight">
              {data.priceCents ? Math.floor(data.priceCents / 100) : "1999"}
            </span>
            <span className="text-3xl font-black">
              ,{data.priceCents ? String(data.priceCents % 100).padStart(2, "0") : "90"}
            </span>
          </div>
          <span className="text-lg font-bold uppercase tracking-wide block text-white/90 mt-2">
            {data.datesOrAvailability || "Pacote 4 diárias"}
          </span>
        </div>
      </div>

      {/* ── 3. Grid Fotográfico 2x2 das Áreas do Imóvel ── */}
      <div className="grid grid-cols-2 gap-4 flex-1 my-2">
        <div className="rounded-2xl overflow-hidden shadow-md bg-slate-200">
          <img
            src={data.backgroundImageUrl}
            alt="Cozinha / Sala"
            crossOrigin={data.backgroundImageUrl?.startsWith("data:") ? undefined : "anonymous"}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="rounded-2xl overflow-hidden shadow-md bg-slate-200">
          <img
            src={data.backgroundImageUrl}
            alt="Piscina / Área Externa"
            crossOrigin={data.backgroundImageUrl?.startsWith("data:") ? undefined : "anonymous"}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="rounded-2xl overflow-hidden shadow-md bg-slate-200">
          <img
            src={data.backgroundImageUrl}
            alt="Suíte Master"
            crossOrigin={data.backgroundImageUrl?.startsWith("data:") ? undefined : "anonymous"}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="rounded-2xl overflow-hidden shadow-md bg-slate-200">
          <img
            src={data.backgroundImageUrl}
            alt="Living Room"
            crossOrigin={data.backgroundImageUrl?.startsWith("data:") ? undefined : "anonymous"}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* ── 4. Rodapé Verde de Localização & Telefone de Contato ── */}
      <div className="pt-6 border-t-2 border-slate-300 flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-full bg-[#48BB78] flex items-center justify-center text-white shrink-0 shadow">
            <MapPin className="size-8" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 block">
              {data.destinationOrLocation || "Localização Privilegiada"}
            </span>
            <span className="text-lg text-slate-600 font-bold">
              {data.storeName || "Anúncio Verificado Waesy"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="size-14 rounded-full bg-[#48BB78] flex items-center justify-center text-white shrink-0 shadow">
            <Phone className="size-8" />
          </div>
          <div className="text-right">
            <span className="text-lg text-slate-600 font-bold block">
              {data.ctaLabel || "Entre em contato"}
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono">
              Reserva Imediata
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
