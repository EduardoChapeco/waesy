import React from "react";
import { SocialTemplateProps } from "../types";
import { Plane, Calendar, MapPin, QrCode, ArrowRight, ShieldCheck, Star } from "lucide-react";

export const TravelPassportBoarding: React.FC<SocialTemplateProps> = ({ data, className = "" }) => {
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
 className={`relative bg-[#0A0E1A] text-white overflow-hidden font-sans select-none flex flex-col justify-between ${isOneOne ? "p-8" : "p-12"} ${className}`}
 >
 {/* Background Decorativo com Trajetória Aérea Sutil */}
 <div className="absolute inset-0 opacity-20 pointer-events-none">
 <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
 <circle cx="540" cy="960" r="480" fill="none" stroke="#38BDF8" strokeWidth="3" strokeDasharray="12 12" />
 <circle cx="540" cy="960" r="700" fill="none" stroke="#38BDF8" strokeWidth="2" strokeDasharray="16 16" />
 </svg>
 </div>

 {/* Safe Zone Superior: Cabeçalho Boarding Pass */}
 <div className={`relative z-10 flex items-center justify-between ${isOneOne ? "pt-2 pb-3" : "pt-6 pb-5"}`}>
 <div className="flex items-center gap-5">
 <div className="w-20 h-20 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center ">
 <Plane className="size-10 text-sky-400 rotate-45" />
 </div>
 <div>
 <span className="text-xl uppercase tracking-widest text-sky-400 font-bold block">
 BOARDING PASS & EXPEDITION
 </span>
 <span className="text-3xl font-black tracking-tight text-white leading-tight">
 {data.storeName || "Waesy Travel Club"}
 </span>
 </div>
 </div>

 {data.verifiedPartner && (
 <div className="flex items-center gap-3 bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 px-6 py-4 rounded-full text-xl font-bold ">
 <ShieldCheck className="size-7" />
 <span>Agência Verificada</span>
 </div>
 )}
 </div>

 {/* Cartão de Embarque Central (Ticket com Recortes Laterais) */}
 <div className="relative z-10 bg-white text-slate-950 rounded-3xl overflow-hidden flex-1 flex flex-col justify-between my-2 border border-slate-200">
 {/* Bloco Superior do Ticket: Imagem do Destino */}
 <div className={`relative ${isOneOne ? "h-2/5" : "h-1/2"} overflow-hidden bg-slate-900`}>
 <img
 src={data.backgroundImageUrl}
 alt={data.title}
 crossOrigin={data.backgroundImageUrl?.startsWith("data:") ? undefined : "anonymous"}
 className="w-full h-full object-cover"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

 {/* Destino e Badge no Rodapé da Foto */}
 <div className="absolute bottom-8 left-10 right-10 flex items-end justify-between">
 <div>
 <span className="text-xl font-bold uppercase tracking-widest text-sky-300 block mb-1">
 DESTINO CONFIRMADO
 </span>
 <h2 className="text-5xl font-black text-white tracking-tight leading-tight drop-">
 {data.destinationOrLocation || "Paraíso Exclusivo"}
 </h2>
 </div>
 {data.promoBadge && (
 <span className="bg-amber-400 text-slate-950 px-6 py-3 rounded-full text-xl font-black uppercase tracking-wider ">
 {data.promoBadge}
 </span>
 )}
 </div>
 </div>

 {/* Linha Perfurada de Destaque com Chanfros Circulares */}
 <div className="relative flex items-center my-[-24px] z-20">
 <div className="w-14 h-14 rounded-full bg-[#0A0E1A] -ml-7 shadow-inner" />
 <div className="flex-1 border-t-4 border-dashed border-slate-300 mx-4" />
 <div className="w-14 h-14 rounded-full bg-[#0A0E1A] -mr-7 shadow-inner" />
 </div>

 {/* Bloco Inferior do Ticket: Informações de Voo e Pacote */}
 <div className={`p-10 flex-1 flex flex-col justify-between ${isOneOne ? "py-6" : "py-10"}`}>
 <div>
 <div className="flex items-center gap-3 text-slate-500 text-xl font-bold uppercase tracking-wider mb-3">
 <Calendar className="size-7 text-sky-600 shrink-0" />
 <span>{data.datesOrAvailability || "Saídas Semanais Selecionadas"}</span>
 </div>
 <h1 className={`font-black text-slate-900 leading-tight tracking-tight line-clamp-2 ${isOneOne ? "text-4xl mb-4" : "text-5xl mb-6"}`}>
 {data.title}
 </h1>

 {/* Grid 3 colunas de Inclusões */}
 {data.highlights && data.highlights.length > 0 && (
 <div className="grid grid-cols-3 gap-4 mb-4">
 {data.highlights.slice(0, 3).map((item, idx) => (
 <div
 key={idx}
 className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center "
 >
 <span className="text-lg text-slate-400 uppercase font-black block mb-1">
 Item 0{idx + 1}
 </span>
 <span className="text-xl font-black text-slate-800 line-clamp-1">
 {item}
 </span>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Rodapé Financeiro e Código de Embarque */}
 <div className="flex items-end justify-between pt-6 border-t-2 border-slate-100">
 <div>
 <span className="text-xl font-bold uppercase tracking-wider text-slate-400 block mb-1">
 {data.pricingMode === "per_person" ? "Investimento por Pessoa" : "Total do Pacote"}
 </span>
 <div className={`font-black text-slate-950 tracking-tight leading-none ${isOneOne ? "text-5xl" : "text-7xl"}`}>
 {priceFormatted || "Sob Consulta"}
 </div>
 {installmentFormatted && data.maxInstallments && data.maxInstallments > 1 && (
 <span className="text-2xl font-black text-sky-700 block mt-2">
 ou {data.maxInstallments}x de {installmentFormatted}
 </span>
 )}
 </div>

 {/* Selo Estilo QR Code / Embarque */}
 <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 px-6 py-4 rounded-2xl shrink-0">
 <QrCode className="size-20 text-slate-900" />
 <div className="text-right">
 <span className="text-base uppercase tracking-widest text-slate-400 font-black block">
 CHECK-IN VIP
 </span>
 <span className="text-xl font-black text-slate-900 block font-mono">
 #WAESY-{data.priceCents ? String(data.priceCents).slice(-4) : "2026"}
 </span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};
