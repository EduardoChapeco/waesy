import React from "react";
import { Plane, Calendar, ShieldCheck, MessageCircle, MapPin, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";

export interface TravelPackageHeroProps {
 title?: string;
 destination?: string;
 country?: string;
 durationText?: string;
 mealPlan?: string;
 priceCents?: number;
 installmentsCount?: number;
 coverImageUrl?: string;
 inclusions?: string[];
 onReserveClick?: () => void;
 whatsappNumber?: string;
}

export function TravelPackageHero({
 title = "Natal Luz em Gramado com Aéreo e Hospedagem",
 destination = "Gramado, Serra Gaúcha",
 country = "Brasil",
 durationText = "5 Dias / 4 Noites",
 mealPlan = "Café da Manhã Incluso",
 priceCents = 389000,
 installmentsCount = 12,
 coverImageUrl = "",
 inclusions = ["Aéreo Ida e Volta", "Hotel 4 Estrelas", "Transfer In/Out", "City Tour Histórico"],
 onReserveClick,
 whatsappNumber = "49991448651",
}: TravelPackageHeroProps) {
 const count = Math.max(1, installmentsCount || 1);
 const installmentCents = Math.round(priceCents / count);

 const handleBooking = () => {
 if (onReserveClick) {
 onReserveClick();
 return;
 }
 const cleanPhone = whatsappNumber.replace(/\D/g, "");
 const installmentText = count > 1
   ? `por ${count}x de ${formatMoney(installmentCents)}`
   : `por ${formatMoney(priceCents)}`;
 const msg = encodeURIComponent(
 `Olá! Gostaria de informações sobre a reserva do pacote *${title}* (${destination}) ${installmentText}.`
 );
 window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
 };

 return (
 <section className="relative w-full rounded-2xl overflow-hidden border border-border/70 min-h-[460px] flex flex-col justify-end p-6 sm:p-10 shadow-lg group">
 {/* Imagem de Fundo com Parallax e Gradiente Editorial */}
 <img
 src={coverImageUrl}
 alt={title}
 className="absolute inset-0 size-full object-cover group-hover:scale-103 transition-transform duration-700 brightness-95"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 pointer-events-none" />

 {/* Conteúdo Sobreposto */}
 <div className="relative z-10 space-y-4 max-w-3xl text-white">
 <div className="flex flex-wrap items-center gap-2">
 <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/20 backdrop-blur-md uppercase tracking-wider">
 {country}
 </span>
 <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-primary text-primary-foreground">
 {durationText}
 </span>
 <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/90 text-white">
 {mealPlan}
 </span>
 </div>

 <div>
 <div className="flex items-center gap-1.5 text-xs text-white/80 mb-1">
 <MapPin className="size-3.5 text-rose-400" />
 <span>{destination}</span>
 </div>
 <h2 className="text-2xl sm:text-4xl font-serif font-bold text-white tracking-tight drop-shadow-sm leading-tight">
 {title}
 </h2>
 </div>

 {/* Inclusões Rápidas */}
 <div className="flex flex-wrap items-center gap-2 pt-1">
 {inclusions.slice(0, 4).map((inc, i) => (
 <span
 key={i}
 className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs bg-black/40 backdrop-blur-md border border-white/15 text-white/90"
 >
 <ShieldCheck className="size-3 text-emerald-400" />
 <span>{inc}</span>
 </span>
 ))}
 </div>

 {/* Bloco de Preço & Conversão */}
 <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/20">
 <div className="space-y-0.5">
 <span className="text-[11px] text-white/75 font-semibold uppercase tracking-wider">
 A partir de (para 2 pessoas)
 </span>
 <div className="flex items-baseline gap-1.5">
 {count > 1 && <span className="text-sm font-semibold text-white/80">{count}x</span>}
 <span className="text-2xl sm:text-3xl font-black text-white font-mono">
 {formatMoney(count > 1 ? installmentCents : priceCents)}
 </span>
 {count > 1 && <span className="text-xs text-white/70">ou {formatMoney(priceCents)} à vista</span>}
 </div>
 </div>

 <Button
 onClick={handleBooking}
 size="lg"
 className="rounded-full px-8 h-12 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg cursor-pointer flex items-center gap-2 shrink-0"
 >
 <MessageCircle className="size-4" />
 <span>Reservar Agora</span>
 </Button>
 </div>
 </div>
 </section>
 );
}
