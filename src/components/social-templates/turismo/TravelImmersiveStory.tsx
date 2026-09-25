import React from "react";
import { SocialTemplateProps } from "../types";
import { MapPin, Sun, Check, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export const TravelImmersiveStory: React.FC<SocialTemplateProps> = ({ data, scale = 1, className = "" }) => {
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
      className={`relative bg-black text-white overflow-hidden font-sans select-none flex flex-col justify-between ${className}`}
    >
      {/* 100% Background Fotográfico Full-Bleed */}
      <img
        src={data.backgroundImageUrl}
        alt={data.title}
        crossOrigin={data.backgroundImageUrl?.startsWith("data:") ? undefined : "anonymous"}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Gradientes de Profundidade Cinematográfica (Anti-Jank / Legibilidade) */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/90 pointer-events-none" />

      {/* Safe Zone Superior: Identidade da Agência & Widget de Clima/Destino */}
      <div className="relative z-10 px-12 pt-16 flex items-center justify-between">
        {/* Pílula da Agência */}
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl border border-white/20 px-5 py-3 rounded-full">
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
          <span className="text-white text-lg font-bold tracking-wide">
            {data.storeName || "Waesy Experience"}
          </span>
          {data.verifiedPartner && (
            <ShieldCheck className="w-5 h-5 text-sky-400" />
          )}
        </div>

        {/* Pílula Climática / Destino */}
        <div className="flex items-center gap-2.5 bg-black/40 backdrop-blur-xl border border-white/20 px-5 py-3 rounded-full text-amber-300">
          <Sun className="w-5 h-5 text-amber-400" />
          <span className="text-white text-base font-semibold">
            {data.destinationOrLocation ? `Destino Solar • ${data.destinationOrLocation}` : "Melhor Época do Ano"}
          </span>
        </div>
      </div>

      {/* Centro: Espaço Negativo Respirável (Anti-AI Clean Design) */}
      <div className="flex-1" />

      {/* Safe Zone Inferior: Cartão Flutuante de Vidro Fosco Profundo */}
      <div className="relative z-10 px-10 pb-16">
        <div className="bg-black/55 backdrop-blur-2xl border border-white/20 rounded-[36px] p-10 shadow-2xl">
          {/* Badge de Oferta & Local */}
          <div className="flex items-center justify-between mb-4">
            {data.destinationOrLocation && (
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold uppercase tracking-widest">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{data.destinationOrLocation}</span>
              </div>
            )}
            {data.promoBadge && (
              <span className="bg-amber-400 text-black px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                {data.promoBadge}
              </span>
            )}
          </div>

          {/* Título Principal */}
          <h1 className="text-4xl lg:text-[44px] font-black text-white leading-tight tracking-tight mb-4 drop-shadow-sm">
            {data.title}
          </h1>

          {/* Highlights em Pílulas Translúcidas */}
          {data.highlights && data.highlights.length > 0 && (
            <div className="flex flex-wrap gap-2.5 mb-6">
              {data.highlights.slice(0, 3).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-white/10 border border-white/15 px-4 py-2 rounded-xl text-white/90 text-sm font-medium"
                >
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          {/* Divisão Financeira e Botão Primário */}
          <div className="flex items-end justify-between gap-6 pt-6 border-t border-white/15">
            <div>
              <span className="text-xs uppercase tracking-widest text-white/60 font-semibold block mb-1">
                {data.pricingMode === "per_person" ? "Pacote por Pessoa" : "Total do Pacote"}
              </span>
              <div className="text-4xl lg:text-5xl font-black text-white tracking-tight">
                {priceFormatted || "Sob Consulta"}
              </div>
              {installmentFormatted && (
                <span className="text-emerald-400 text-base font-bold block mt-1">
                  ou {data.maxInstallments || 12}x de {installmentFormatted}
                </span>
              )}
            </div>

            {/* Botão de Ação com Alto Contraste */}
            <div className="bg-white hover:bg-slate-100 text-slate-950 px-8 py-5 rounded-2xl font-black text-xl flex items-center gap-3 shadow-2xl shrink-0 transition-transform active:scale-95">
              <span>{data.ctaLabel || "Reservar Vaga"}</span>
              <ArrowRight className="w-6 h-6 text-slate-950" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
