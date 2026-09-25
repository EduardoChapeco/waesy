import React from "react";
import { SocialTemplateProps } from "../types";
import { MapPin, Calendar, CheckCircle2, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";

export const TravelCurvedEditorial: React.FC<SocialTemplateProps> = ({ data, scale = 1, className = "" }) => {
  const isNineSixteen = data.aspectRatio === "9:16";
  const canvasWidth = isNineSixteen ? 1080 : data.aspectRatio === "4:5" ? 1080 : 1080;
  const canvasHeight = isNineSixteen ? 1920 : data.aspectRatio === "4:5" ? 1350 : 1080;

  const priceFormatted = data.priceCents
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.priceCents / 100)
    : null;

  const installmentFormatted = data.installmentCents
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.installmentCents / 100)
    : data.priceCents && data.maxInstallments
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
        Math.round(data.priceCents / data.maxInstallments) / 100
      )
    : null;

  return (
    <div
      style={{
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
      className={`relative bg-[#FAF9F5] text-slate-900 overflow-hidden font-sans select-none flex flex-col justify-between ${className}`}
    >
      {/* Bloco Superior: Imagem com Curvatura Orgânica (62% da Altura) */}
      <div className="relative w-full h-[62%] rounded-b-[72px] overflow-hidden shadow-2xl bg-slate-900">
        <img
          src={data.backgroundImageUrl}
          alt={data.title}
          crossOrigin={data.backgroundImageUrl?.startsWith("data:") ? undefined : "anonymous"}
          className="w-full h-full object-cover"
        />
        {/* Gradiente sutil para legibilidade no topo */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/40" />

        {/* Safe Zone Superior (Topo): Identidade da Agência & Selo */}
        <div className="absolute top-16 left-14 right-14 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/20 px-5 py-2.5 rounded-full">
            {data.logoUrl ? (
              <img
                src={data.logoUrl}
                alt={data.storeName || "Agência"}
                crossOrigin={data.logoUrl?.startsWith("data:") ? undefined : "anonymous"}
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <Sparkles className="w-5 h-5 text-amber-400" />
            )}
            <span className="text-white text-lg font-semibold tracking-wide">
              {data.storeName || "Waesy Turismo"}
            </span>
            {data.verifiedPartner && (
              <ShieldCheck className="w-5 h-5 text-sky-400" />
            )}
          </div>

          {data.promoBadge && (
            <div className="bg-amber-400 text-slate-950 text-base font-bold uppercase tracking-wider px-6 py-2.5 rounded-full shadow-lg">
              {data.promoBadge}
            </div>
          )}
        </div>

        {/* Badge Flutuante no Rodapé da Foto */}
        {data.destinationOrLocation && (
          <div className="absolute bottom-10 left-14 flex items-center gap-2.5 bg-black/60 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-full z-10">
            <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-lg font-medium tracking-wide">
              {data.destinationOrLocation}
            </span>
          </div>
        )}
      </div>

      {/* Bloco Inferior: Área Editorial e Dados do Pacote (38% da Altura) */}
      <div className="flex-1 px-14 pt-8 pb-16 flex flex-col justify-between">
        <div>
          {/* Datas / Disponibilidade */}
          {data.datesOrAvailability && (
            <div className="flex items-center gap-2 text-slate-500 text-base font-semibold uppercase tracking-wider mb-2">
              <Calendar className="w-5 h-5 text-slate-400" />
              <span>{data.datesOrAvailability}</span>
            </div>
          )}

          {/* Título Principal Editorial */}
          <h1 className="text-4xl lg:text-[46px] font-black text-slate-950 leading-[1.1] tracking-tight line-clamp-2 mb-4">
            {data.title}
          </h1>

          {/* Highlights em Chips Claros */}
          {data.highlights && data.highlights.length > 0 && (
            <div className="flex flex-wrap gap-2.5">
              {data.highlights.slice(0, 3).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-white border border-slate-200/80 shadow-sm px-4 py-2 rounded-xl text-slate-700 text-base font-medium"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé: Preço, Parcelas e Botão de Ação */}
        <div className="flex items-end justify-between gap-6 pt-6 border-t border-slate-200/70">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              {data.pricingMode === "per_person" ? "Valor por pessoa" : "Pacote completo"}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl lg:text-5xl font-black text-slate-950 tracking-tight">
                {priceFormatted || "Consulte"}
              </span>
            </div>
            {installmentFormatted && (
              <span className="text-slate-600 text-base font-semibold block mt-1">
                em até {data.maxInstallments || 12}x de <strong className="text-emerald-700">{installmentFormatted}</strong>
              </span>
            )}
          </div>

          {/* CTA Dinâmico com Ergonomia de Toque */}
          <div className="bg-slate-950 hover:bg-slate-900 text-white px-8 py-5 rounded-2xl shadow-xl flex items-center gap-3 transition-transform active:scale-95 shrink-0">
            <span className="text-xl font-bold tracking-wide">
              {data.ctaLabel || "Garantir Pacote"}
            </span>
            <ArrowRight className="w-6 h-6 text-emerald-400" />
          </div>
        </div>
      </div>
    </div>
  );
};
