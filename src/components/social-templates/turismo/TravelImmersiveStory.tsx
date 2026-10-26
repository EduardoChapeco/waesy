import React from "react";
import { SocialTemplateProps } from "../types";
import { MapPin, Sun, Check, ArrowRight, ShieldCheck, Star } from "lucide-react";

export const TravelImmersiveStory: React.FC<SocialTemplateProps> = ({ data, className = "" }) => {
 const isNineSixteen = data.aspectRatio === "9:16";
 const isOneOne = data.aspectRatio === "1:1";
 const canvasWidth = 1080;
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

 {/* Gradientes de Profundidade Cinematográfica */}
 <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/95 pointer-events-none" />

 {/* Safe Zone Superior: Identidade da Agência & Widget de Clima/Destino */}
 <div className={`relative z-10 px-12 ${isOneOne ? "pt-10" : "pt-16"} flex items-center justify-between`}>
 {/* Pílula da Agência */}
 <div className="flex items-center gap-4 bg-black/50 backdrop-blur-xl border border-white/25 px-6 py-4 rounded-full ">
 {data.logoUrl ? (
 <img
 src={data.logoUrl}
 alt={data.storeName || "Agência"}
 crossOrigin={data.logoUrl?.startsWith("data:") ? undefined : "anonymous"}
 className="w-9 h-9 rounded-full object-cover"
 />
 ) : (
 <Star className="size-7 text-amber-400 fill-amber-400" />
 )}
 <span className="text-white text-2xl font-black tracking-wide">
 {data.storeName || "Waesy Experience"}
 </span>
 {data.verifiedPartner && (
 <ShieldCheck className="size-7 text-sky-400" />
 )}
 </div>

 {/* Pílula Climática / Destino */}
 <div className="flex items-center gap-3 bg-black/50 backdrop-blur-xl border border-white/25 px-6 py-4 rounded-full text-amber-300 ">
 <Sun className="size-7 text-amber-400" />
 <span className="text-white text-xl font-bold">
 {data.destinationOrLocation ? `Destino Solar • ${data.destinationOrLocation}` : "Melhor Época do Ano"}
 </span>
 </div>
 </div>

 {/* Centro: Espaço Negativo Respirável */}
 <div className="flex-1 min-h-8" />

 {/* Safe Zone Inferior: Cartão Flutuante de Vidro Fosco Profundo */}
 <div className={`relative z-10 px-12 ${isOneOne ? "pb-10" : "pb-16"}`}>
 <div className={`bg-black/65 backdrop-blur-2xl border border-white/25 rounded-3xl ${isOneOne ? "p-8" : "p-12"} `}>
 {/* Badge de Oferta & Local */}
 <div className="flex items-center justify-between mb-4">
 {data.destinationOrLocation && (
 <div className="flex items-center gap-3 text-emerald-400 text-xl font-black uppercase tracking-widest">
 <MapPin className="size-7 shrink-0" />
 <span>{data.destinationOrLocation}</span>
 </div>
 )}
 {data.promoBadge && (
 <span className="bg-amber-400 text-slate-950 px-6 py-2 rounded-full text-xl font-black uppercase tracking-wider shadow">
 {data.promoBadge}
 </span>
 )}
 </div>

 {/* Título Principal */}
 <h1 className={`font-black text-white leading-tight tracking-tight line-clamp-2 ${isOneOne ? "text-4xl mb-4" : "text-5xl mb-6"} drop-`}>
 {data.title}
 </h1>

 {/* Highlights em Pílulas Translúcidas */}
 {data.highlights && data.highlights.length > 0 && (
 <div className={`flex flex-wrap gap-4 ${isOneOne ? "mb-6" : "mb-8"}`}>
 {data.highlights.slice(0, 3).map((item, idx) => (
 <div
 key={idx}
 className="flex items-center gap-3 bg-white/15 border border-white/20 px-6 py-3 rounded-2xl text-white text-xl font-bold "
 >
 <Check className="size-6 text-emerald-400 shrink-0" strokeWidth={3} />
 <span>{item}</span>
 </div>
 ))}
 </div>
 )}

 {/* Divisão Financeira e Botão Primário */}
 <div className="flex items-end justify-between gap-6 pt-6 border-t border-white/20">
 <div>
 <span className="text-xl uppercase tracking-widest text-white/70 font-bold block mb-1">
 {data.pricingMode === "per_person" ? "Pacote por Pessoa" : "Total do Pacote"}
 </span>
 <div className={`font-black text-white tracking-tight leading-none ${isOneOne ? "text-5xl" : "text-7xl"}`}>
 {priceFormatted || "Sob Consulta"}
 </div>
 {installmentFormatted && data.maxInstallments && data.maxInstallments > 1 && (
 <span className="text-emerald-400 text-2xl font-black block mt-2">
 ou {data.maxInstallments}x de {installmentFormatted}
 </span>
 )}
 </div>

 {/* Botão de Ação com Alto Contraste */}
 <div className={`bg-white hover:bg-slate-100 text-slate-950 ${isOneOne ? "px-8 py-5 text-xl" : "px-10 py-6 text-2xl"} rounded-2xl font-black flex items-center gap-4 shrink-0 transition-transform active:scale-95`}>
 <span>{data.ctaLabel || "Reservar Vaga"}</span>
 <ArrowRight className="size-8 text-slate-950" strokeWidth={2.5} />
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};
