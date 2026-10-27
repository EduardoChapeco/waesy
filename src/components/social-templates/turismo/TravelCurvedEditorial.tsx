import React from "react";
import { SocialTemplateProps } from "../types";
import { MapPin, Calendar, CheckCircle2, ShieldCheck, Star, ArrowRight } from "lucide-react";

export const TravelCurvedEditorial: React.FC<SocialTemplateProps> = ({ data, className = "" }) => {
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
 className={`relative bg-[#FAF9F5] text-slate-900 overflow-hidden font-sans select-none flex flex-col justify-between ${className}`}
 >
 {/* Bloco Superior: Imagem com Curvatura Orgânica */}
 <div className={`relative w-full ${isOneOne ? "h-2/5 rounded-b-3xl" : "h-1/2 rounded-b-3xl"} overflow-hidden bg-slate-900 shrink-0`}>
 <img
 src={data.backgroundImageUrl}
 alt={data.title}
 crossOrigin={data.backgroundImageUrl?.startsWith("data:") ? undefined : "anonymous"}
 className="w-full h-full object-cover"
 />
 {/* Gradiente sutil para legibilidade no topo */}
 <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-black/50" />

 {/* Safe Zone Superior (Topo): Identidade da Agência & Selo */}
 <div className={`absolute ${isOneOne ? "top-10" : "top-16"} left-14 right-14 flex items-center justify-between z-10`}>
 <div className="flex items-center gap-4 bg-black/50 backdrop-blur-md border border-white/25 px-6 py-4 rounded-full ">
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
 {data.storeName || "Waesy Turismo"}
 </span>
 {data.verifiedPartner && (
 <ShieldCheck className="size-7 text-sky-400" />
 )}
 </div>

 {data.promoBadge && (
 <div className="bg-amber-400 text-slate-950 text-xl font-black uppercase tracking-wider px-7 py-3 rounded-full ">
 {data.promoBadge}
 </div>
 )}
 </div>

 {/* Badge Flutuante no Rodapé da Foto */}
 {data.destinationOrLocation && (
 <div className={`absolute ${isOneOne ? "bottom-6" : "bottom-10"} left-14 flex items-center gap-3 bg-black/70 backdrop-blur-md border border-white/25 text-white px-7 py-4 rounded-full z-10 `}>
 <MapPin className="size-7 text-emerald-400 shrink-0" />
 <span className="text-2xl font-bold tracking-wide">
 {data.destinationOrLocation}
 </span>
 </div>
 )}
 </div>

 {/* Bloco Inferior: Área Editorial e Dados do Pacote */}
 <div className={`flex-1 px-14 ${isOneOne ? "pt-6 pb-10" : "pt-8 pb-16"} flex flex-col justify-between`}>
 <div>
 {/* Datas / Disponibilidade */}
 {data.datesOrAvailability && (
 <div className="flex items-center gap-3 text-slate-500 text-xl font-bold uppercase tracking-wider mb-2">
 <Calendar className="size-7 text-slate-400 shrink-0" />
 <span>{data.datesOrAvailability}</span>
 </div>
 )}

 {/* Título Principal Editorial */}
 <h1 className={`font-black text-slate-950 leading-tight tracking-tight line-clamp-2 ${isOneOne ? "text-4xl mb-4" : "text-5xl mb-6"}`}>
 {data.title}
 </h1>

 {/* Highlights em Chips Claros */}
 {data.highlights && data.highlights.length > 0 && (
 <div className="flex flex-wrap gap-4">
 {data.highlights.slice(0, 3).map((item, idx) => (
 <div
 key={idx}
 className="flex items-center gap-3 bg-white border border-slate-200/90 px-6 py-3 rounded-2xl text-slate-800 text-xl font-bold"
 >
 <CheckCircle2 className="size-7 text-emerald-600 shrink-0" />
 <span>{item}</span>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Rodapé: Preço, Parcelas e Botão de Ação */}
 <div className="flex items-end justify-between gap-6 pt-6 border-t-2 border-slate-200/80">
 <div>
 <span className="text-xl font-bold uppercase tracking-wider text-slate-400 block mb-1">
 {data.pricingMode === "per_person" ? "Valor por pessoa" : "Pacote completo"}
 </span>
 <div className={`font-black text-slate-950 tracking-tight leading-none ${isOneOne ? "text-5xl" : "text-7xl"}`}>
 {priceFormatted || "Consulte"}
 </div>
 {installmentFormatted && data.maxInstallments && data.maxInstallments > 1 && (
 <span className="text-slate-600 text-2xl font-bold block mt-2">
 em até {data.maxInstallments}x de <strong className="text-emerald-700 font-black">{installmentFormatted}</strong>
 </span>
 )}
 </div>

 {/* CTA Dinâmico com Ergonomia de Toque */}
 <div className={`bg-slate-950 hover:bg-slate-800 text-white ${isOneOne ? "px-8 py-5 text-xl" : "px-10 py-6 text-2xl"} rounded-2xl font-black flex items-center gap-4 shrink-0 transition-transform active:scale-95`}>
 <span>{data.ctaLabel || "Ver Detalhes"}</span>
 <ArrowRight className="size-8 text-white" strokeWidth={2.5} />
 </div>
 </div>
 </div>
 </div>
 );
};
