import React from "react";
import { SocialTemplateProps } from "../types";
import { Plane, Calendar, MapPin, QrCode, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export const TravelPassportBoarding: React.FC<SocialTemplateProps> = ({ data, scale = 1, className = "" }) => {
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
      className={`relative bg-[#0A0E1A] text-white overflow-hidden font-sans select-none flex flex-col justify-between p-12 ${className}`}
    >
      {/* Background Decorativo com Trajetória Aérea Sutil */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <circle cx="540" cy="960" r="480" fill="none" stroke="#38BDF8" strokeWidth="2" strokeDasharray="8 8" />
          <circle cx="540" cy="960" r="700" fill="none" stroke="#38BDF8" strokeWidth="1" strokeDasharray="12 12" />
        </svg>
      </div>

      {/* Safe Zone Superior: Cabeçalho Boarding Pass */}
      <div className="relative z-10 flex items-center justify-between pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center">
            <Plane className="w-6 h-6 text-sky-400 rotate-45" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-widest text-sky-400 font-bold block">
              BOARDING PASS & EXPEDITION
            </span>
            <span className="text-xl font-black tracking-tight text-white">
              {data.storeName || "Waesy Travel Club"}
            </span>
          </div>
        </div>

        {data.verifiedPartner && (
          <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 px-4 py-1.5 rounded-full text-sm font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Agência Verificada</span>
          </div>
        )}
      </div>

      {/* Cartão de Embarque Central (Ticket com Recortes Laterais) */}
      <div className="relative z-10 bg-white text-slate-950 rounded-3xl overflow-hidden shadow-2xl flex-1 flex flex-col justify-between my-4 border border-slate-200">
        {/* Bloco Superior do Ticket: Imagem do Destino */}
        <div className="relative h-[48%] overflow-hidden bg-slate-900">
          <img
            src={data.backgroundImageUrl}
            alt={data.title}
            crossOrigin={data.backgroundImageUrl?.startsWith("data:") ? undefined : "anonymous"}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Destino e Badge no Rodapé da Foto */}
          <div className="absolute bottom-6 left-8 right-8 flex items-end justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-sky-400 block mb-1">
                DESTINO CONFIRMADO
              </span>
              <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-md">
                {data.destinationOrLocation || "Paraíso Exclusivo"}
              </h2>
            </div>
            {data.promoBadge && (
              <span className="bg-amber-400 text-slate-950 px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-wider shadow">
                {data.promoBadge}
              </span>
            )}
          </div>
        </div>

        {/* Linha Perfurada de Destaque com Chanfros Circulares */}
        <div className="relative flex items-center my-[-16px] z-20">
          <div className="w-8 h-8 rounded-full bg-[#0A0E1A] -ml-4" />
          <div className="flex-1 border-t-2 border-dashed border-slate-300 mx-2" />
          <div className="w-8 h-8 rounded-full bg-[#0A0E1A] -mr-4" />
        </div>

        {/* Bloco Inferior do Ticket: Informações de Voo e Pacote */}
        <div className="p-8 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">
              <Calendar className="w-4 h-4 text-sky-600" />
              <span>{data.datesOrAvailability || "Saídas Semanais Selecionadas"}</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 leading-tight tracking-tight mb-4">
              {data.title}
            </h1>

            {/* Grid 3 colunas de Inclusões */}
            {data.highlights && data.highlights.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {data.highlights.slice(0, 3).map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center"
                  >
                    <span className="text-xs text-slate-400 uppercase font-bold block mb-0.5">
                      Item {idx + 1}
                    </span>
                    <span className="text-sm font-bold text-slate-800 line-clamp-1">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rodapé Financeiro e Código de Embarque */}
          <div className="flex items-end justify-between pt-4 border-t border-slate-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Investimento por Pessoa
              </span>
              <div className="text-4xl font-black text-slate-950 tracking-tight">
                {priceFormatted || "Sob Consulta"}
              </div>
              {installmentFormatted && (
                <span className="text-sm font-bold text-sky-700 block">
                  {data.maxInstallments || 12}x de {installmentFormatted} sem juros
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-center opacity-70">
                <QrCode className="w-12 h-12 text-slate-800" />
                <span className="text-[10px] font-mono text-slate-500 uppercase mt-0.5">AUTH-W3Y</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Safe Zone Inferior: Botão de Ação CTA em Destaque */}
      <div className="relative z-10 pt-2 pb-6">
        <div className="w-full bg-gradient-to-r from-sky-400 to-emerald-400 hover:from-sky-300 hover:to-emerald-300 text-slate-950 py-5 px-8 rounded-2xl font-black text-2xl flex items-center justify-center gap-3 shadow-xl shadow-sky-500/20 transition-transform active:scale-98">
          <span>{data.ctaLabel || "Embarcar Agora"}</span>
          <ArrowRight className="w-7 h-7 text-slate-950" />
        </div>
      </div>
    </div>
  );
};
