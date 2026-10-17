/**
 * RetailSupermarketClassicFlyer.tsx — Encarte Tradicional de Supermercado & Padaria
 * Estilo Lambe-Lambe / Cartaz de Ofertas Amarelo e Vermelho com Explosão Splash de Preço
 */

import React from "react";
import { Zap, ShieldCheck } from "lucide-react";
import type { SocialTemplateProps } from "../types";

export function RetailSupermarketClassicFlyer({ data, scale = 1, className = "" }: SocialTemplateProps) {
  const isNineSixteen = data.aspectRatio === "9:16";
  const canvasWidth = isNineSixteen ? 1080 : data.aspectRatio === "4:5" ? 1080 : 1080;
  const canvasHeight = isNineSixteen ? 1920 : data.aspectRatio === "4:5" ? 1350 : 1080;

  const priceCents = data.priceCents ?? 399;
  const reais = Math.floor(priceCents / 100);
  const centavos = String(priceCents % 100).padStart(2, "0");

  return (
    <div
      style={{
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
      className={`relative bg-[#FFDF00] text-slate-950 overflow-hidden font-sans select-none flex flex-col justify-between p-12 border-[24px] border-[#CC0000] ${className}`}
    >
      {/* Moldura Clássica Interna de Linha Fina */}
      <div className="absolute inset-4 border-4 border-[#CC0000] pointer-events-none rounded-xl" />

      {/* Ornamentos de Canto Tradicionais de Cartaz de Oferta */}
      <div className="absolute top-8 left-8 w-16 h-16 border-t-8 border-l-8 border-[#003399] rounded-tl-xl pointer-events-none" />
      <div className="absolute top-8 right-8 w-16 h-16 border-t-8 border-r-8 border-[#003399] rounded-tr-xl pointer-events-none" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-b-8 border-l-8 border-[#003399] rounded-bl-xl pointer-events-none" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-b-8 border-r-8 border-[#003399] rounded-br-xl pointer-events-none" />

      {/* Topo: Header Impactante OFERTA com Efeito 3D Vintage */}
      <div className="relative z-10 text-center pt-6">
        <div className="inline-block relative">
          <span
            className="text-8xl sm:text-9xl font-black uppercase tracking-tighter text-[#E60000] drop-shadow-[0_8px_0_#002277]"
            style={{
              WebkitTextStroke: "4px #002277",
            }}
          >
            {data.promoBadge || "OFERTA"}
          </span>
        </div>

        {data.storeName && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="bg-[#002277] text-white font-black text-2xl uppercase tracking-wider px-6 py-2 rounded-full shadow-md">
              {data.storeName}
            </span>
          </div>
        )}
      </div>

      {/* Centro: Título do Produto & Imagem Vazada ou Fotografia Central */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-4">
        {/* Foto do Produto se disponível */}
        {data.backgroundImageUrl && (
          <div className="relative w-80 h-80 sm:w-96 sm:h-96 rounded-2xl overflow-hidden shadow-2xl border-4 border-white mb-6 bg-white flex items-center justify-center">
            <img
              src={data.backgroundImageUrl}
              alt={data.title}
              crossOrigin={data.backgroundImageUrl?.startsWith("data:") ? undefined : "anonymous"}
              className="w-full h-full object-contain p-4"
            />
          </div>
        )}

        {/* Título do Produto em Tipografia Condensada e Legível */}
        <h1 className="text-6xl sm:text-7xl font-black uppercase tracking-tight text-center text-black leading-[1.05] max-w-3xl line-clamp-2 drop-shadow-sm">
          {data.title}
        </h1>

        {data.subtitle && (
          <p className="text-3xl font-bold uppercase tracking-wide text-slate-800 text-center mt-3">
            {data.subtitle}
          </p>
        )}

        {/* Inclusões / Atributos Rápidos */}
        {data.highlights && data.highlights.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {data.highlights.slice(0, 3).map((h, i) => (
              <span
                key={i}
                className="bg-white border-2 border-slate-900 px-5 py-2 rounded-lg text-xl font-black text-slate-900 shadow-sm"
              >
                {h}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Base: Estrela de Explosão Splash de Preço Tradicional */}
      <div className="relative z-10 flex items-center justify-between pt-4">
        {/* Selo Splash Vermelho de Preço */}
        <div className="relative flex items-center justify-center mx-auto">
          {/* Estrela / Explosão Amarela/Vermelha em SVG */}
          <div className="relative flex items-center justify-center p-10">
            <svg
              className="absolute w-[440px] h-[340px] text-[#CC0000] drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)]"
              viewBox="0 0 100 100"
              fill="currentColor"
            >
              <polygon points="50,0 63,22 88,12 85,38 100,55 82,68 85,94 60,86 48,100 37,84 13,92 18,66 0,51 17,37 13,12 37,20" />
            </svg>

            {/* Valor do Preço em Branco Gigante */}
            <div className="relative z-10 flex items-baseline text-white">
              <span className="text-5xl font-black mr-2 drop-shadow-[0_6px_0_#000000]">
                R$
              </span>
              <span
                className="text-9xl font-black tracking-tighter drop-shadow-[0_8px_0_#000000]"
                style={{
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                {reais}
              </span>
              <span
                className="text-6xl font-black ml-1 -translate-y-8 drop-shadow-[0_6px_0_#000000]"
                style={{
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                ,{centavos}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Inferior de Alavancagem */}
      <div className="relative z-10 text-center pt-2">
        <span className="inline-block bg-[#002277] text-white font-black text-2xl uppercase tracking-widest px-8 py-4 rounded-xl shadow-lg">
          {data.ctaLabel || "APROVEITE HOJE MESMO"}
        </span>
      </div>
    </div>
  );
}
