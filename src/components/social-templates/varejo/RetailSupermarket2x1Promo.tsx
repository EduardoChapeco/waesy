/**
 * RetailSupermarket2x1Promo.tsx — Tabloide de Varejo Clean Estilo 2x1 & Desconto Online
 * Inspirado nas redes internacionais de supermercados e conveniências
 */

import React from "react";
import { Tag, ShoppingBag, ArrowRight } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { SocialTemplateProps } from "../types";

export function RetailSupermarket2x1Promo({ data, scale = 1, className = "" }: SocialTemplateProps) {
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
      className={`relative bg-white text-slate-900 overflow-hidden font-sans select-none flex flex-col justify-between ${className}`}
    >
      {/* ── 1. Topo: Bloco Turquesa/Ciano de Alto Impacto (OFERTA 2x1) ── */}
      <div className="bg-[#0099B8] text-white pt-16 pb-12 px-12 text-center shadow-lg">
        <h2 className="text-8xl sm:text-9xl font-black uppercase tracking-tight leading-none">
          {data.promoBadge || "OFERTA"}
        </h2>
        <div className="text-6xl sm:text-7xl font-black tracking-tight mt-2 text-white/95">
          2x1
        </div>
      </div>

      {/* ── 2. Miolo: Descrição Textual + Imagem do Produto com Recorte Limpo ── */}
      <div className="flex-1 p-14 flex items-center justify-between gap-10">
        {/* Lado Esquerdo: Chamada Comercial e Benefício */}
        <div className="flex-1 space-y-6">
          <div className="space-y-3">
            <h3 className="text-4xl sm:text-5xl font-black text-[#0099B8] leading-tight">
              Comprando 1<br />você leva 2
            </h3>
            <p className="text-2xl font-bold text-slate-600">
              {data.subtitle || "Em itens e marcas selecionadas"}
            </p>
          </div>

          <div className="pt-4 border-t-2 border-slate-200">
            <h1 className="text-5xl font-black text-slate-950 leading-tight">
              {data.title}
            </h1>
          </div>

          {data.priceCents && (
            <div className="pt-2">
              <span className="text-lg uppercase tracking-wider text-slate-400 font-bold block mb-1">
                A partir de apenas
              </span>
              <span className="text-6xl font-black text-slate-950 tracking-tight font-mono">
                {formatMoney(data.priceCents)}
              </span>
            </div>
          )}
        </div>

        {/* Lado Direito: Foto do Produto */}
        {data.backgroundImageUrl && (
          <div className="w-[420px] h-[520px] rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 shadow-xl flex items-center justify-center p-6 shrink-0">
            <img
              src={data.backgroundImageUrl}
              alt={data.title}
              crossOrigin={data.backgroundImageUrl?.startsWith("data:") ? undefined : "anonymous"}
              className="w-full h-full object-contain"
            />
          </div>
        )}
      </div>

      {/* ── 3. Faixa de Desconto Adicional / Cupom ── */}
      <div className="bg-[#0099B8] text-white py-5 px-14 flex items-center justify-between">
        <span className="text-3xl font-black uppercase tracking-wider">
          + 25% DE DESCONTO NO APP OU COMPRA ONLINE
        </span>
        <Tag className="w-8 h-8 text-white" />
      </div>

      {/* ── 4. Rodapé Corporativo e CTA de Loja ── */}
      <div className="p-12 border-t border-slate-200 flex items-center justify-between bg-slate-50">
        <div>
          <span className="text-2xl font-black uppercase tracking-tight text-slate-950 block">
            {data.storeName || "Supermercados & Conveniência"}
          </span>
          <span className="text-lg text-slate-500 font-medium block mt-1">
            {data.datesOrAvailability || "Ofertas válidas enquanto durarem os estoques"}
          </span>
        </div>

        <div className="bg-[#0099B8] text-white px-8 py-5 rounded-xl font-black text-xl flex items-center gap-3 shadow-lg">
          <span>{data.ctaLabel || "Aproveitar Oferta"}</span>
          <ArrowRight className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
