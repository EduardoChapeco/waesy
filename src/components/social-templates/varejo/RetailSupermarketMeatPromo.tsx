/**
 * RetailSupermarketMeatPromo.tsx — Tabloide de Açougue, Churrasco & Rotisseria
 * Estilo Tradicional Octogonal com Amarelo/Vermelho, lista de cortes e selo recortado de preço
 */

import React from "react";
import { formatMoney } from "@/lib/money";
import type { SocialTemplateProps } from "../types";

export function RetailSupermarketMeatPromo({ data, scale = 1, className = "" }: SocialTemplateProps) {
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
      className={`relative bg-[#E62429] text-white overflow-hidden font-sans select-none flex flex-col justify-between p-10 ${className}`}
    >
      {/* ── 1. Topo: Identidade da Loja e Título OFERTAS ── */}
      <div className="flex items-center justify-between pt-6 px-4">
        <div>
          <span className="text-3xl font-black italic tracking-tight text-white block">
            {data.storeName || "Supermercados & Carnes"}
          </span>
          <span className="text-sm uppercase tracking-widest text-amber-200 font-bold block mt-1">
            QUALIDADE GARANTIDA DO PRODUTOR
          </span>
        </div>

        <div className="text-right">
          <span className="text-7xl sm:text-8xl font-black uppercase tracking-tighter text-white drop-shadow-[0_6px_0_#000000]">
            {data.promoBadge || "OFERTAS"}
          </span>
        </div>
      </div>

      {/* ── 2. Centro: Polígono Amarelo Chanfrado (Estilo Encarte de Carnes El Zonda) ── */}
      <div className="relative my-4 flex-1 flex flex-col items-center justify-between bg-[#FEE101] text-slate-950 rounded-[48px] border-8 border-slate-950 p-8 shadow-2xl overflow-hidden">
        {/* Título Principal no Topo do Card Amarelo */}
        <div className="w-full text-center pb-4 border-b-4 border-slate-950">
          <h1 className="text-5xl sm:text-6xl font-black uppercase tracking-tight text-slate-950 leading-tight">
            {data.title}
          </h1>
          {data.subtitle && (
            <p className="text-2xl font-bold uppercase tracking-wide text-slate-800 mt-2">
              {data.subtitle}
            </p>
          )}
        </div>

        {/* Imagem Central dos Cortes */}
        <div className="relative w-full flex-1 flex items-center justify-center my-4">
          {data.backgroundImageUrl ? (
            <div className="w-[480px] h-[340px] rounded-2xl overflow-hidden shadow-2xl bg-white border-4 border-slate-950 flex items-center justify-center p-4">
              <img
                src={data.backgroundImageUrl}
                alt={data.title}
                crossOrigin={data.backgroundImageUrl?.startsWith("data:") ? undefined : "anonymous"}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-full h-48 bg-amber-200/50 rounded-xl flex items-center justify-center text-xl font-bold text-slate-700">
              Cortes Nobres Selecionados
            </div>
          )}

          {/* Selo Recortado Dentado (Starburst) com o Preço */}
          {data.priceCents && (
            <div className="absolute -bottom-6 -right-2 flex items-center justify-center">
              <div className="relative flex items-center justify-center w-64 h-64">
                {/* SVG Estrela Dentada / Carimbo */}
                <svg
                  className="absolute inset-0 w-full h-full text-white drop-shadow-xl"
                  viewBox="0 0 100 100"
                  fill="currentColor"
                >
                  <polygon points="50,2 62,14 78,8 84,24 99,25 97,42 108,50 97,58 99,75 84,76 78,92 62,86 50,98 38,86 22,92 16,76 1,75 3,58 -8,50 3,42 1,25 16,24 22,8 38,14" />
                </svg>
                <div className="relative z-10 text-center text-[#E62429]">
                  <span className="text-2xl font-black block leading-none">R$</span>
                  <span className="text-6xl font-black tracking-tighter block leading-none font-mono">
                    {Math.floor(data.priceCents / 100)}
                  </span>
                  <span className="text-3xl font-black block leading-none">
                    ,{String(data.priceCents % 100).padStart(2, "0")}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lista de Itens do Combo / Inclusões */}
        <div className="w-full pt-4 border-t-4 border-slate-950">
          <div className="grid grid-cols-2 gap-3">
            {data.highlights && data.highlights.length > 0 ? (
              data.highlights.slice(0, 4).map((h, i) => (
                <div
                  key={i}
                  className="bg-white border-2 border-slate-950 px-4 py-2 rounded-lg text-lg font-black uppercase text-slate-950 shadow-sm"
                >
                  • {h}
                </div>
              ))
            ) : (
              <>
                <div className="bg-white border-2 border-slate-950 px-4 py-2 rounded-lg text-lg font-black uppercase text-slate-950">
                  • 1kg Carne Selecionada
                </div>
                <div className="bg-white border-2 border-slate-950 px-4 py-2 rounded-lg text-lg font-black uppercase text-slate-950">
                  • Cortes Especiais Diários
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Rodapé de Contato & Data de Vigência ── */}
      <div className="px-4 pt-2 flex items-center justify-between text-white text-base font-bold">
        <span>{data.datesOrAvailability || "Promoção válida por tempo limitado"}</span>
        <span className="bg-white text-slate-950 px-6 py-3 rounded-xl font-black text-lg uppercase shadow">
          {data.ctaLabel || "Peça no Balcão ou Delivery"}
        </span>
      </div>
    </div>
  );
}
