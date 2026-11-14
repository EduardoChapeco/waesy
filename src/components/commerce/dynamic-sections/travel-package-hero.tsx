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
  title = "",
  destination = "",
  country = "",
  durationText = "",
  mealPlan = "",
  priceCents = 0,
  installmentsCount = 1,
  coverImageUrl = "",
  inclusions = [],
  onReserveClick,
  whatsappNumber = "",
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
 <section className="relative w-full rounded-lg overflow-hidden border border-border/70 min-h-115 flex flex-col justify-end p-6 sm:p-10  group">
 {/* Imagem de Fundo com Parallax e Gradiente Editorial */}
 <img
 src={coverImageUrl}
 alt={title}
 className="absolute inset-0 size-full object-cover group-hover:scale-103 transition-transform duration-200 brightness-95"
 />
 <div className="absolute inset-0 bg-neutral-950/75 pointer-events-none" />

 {/* Conteúdo Sobreposto */}
 <div className="relative z-10 space-y-4 max-w-3xl text-neutral-50">
 <div className="flex flex-wrap items-center gap-2">
 <span className="px-3 py-1 rounded-full text-2xs font-bold bg-card text-foreground border border-border uppercase tracking-wider">
 {country}
 </span>
 <span className="px-3 py-1 rounded-full text-2xs font-semibold bg-primary text-primary-foreground">
 {durationText}
 </span>
 <span className="px-3 py-1 rounded-full text-2xs font-semibold bg-emerald-700 text-emerald-50 border border-emerald-600">
 {mealPlan}
 </span>
 </div>

 <div>
 <div className="flex items-center gap-2 text-xs text-neutral-200 mb-1">
 <MapPin className="size-3.5 text-rose-400" />
 <span>{destination}</span>
 </div>
 <h2 className="text-2xl sm:text-4xl font-serif font-bold text-neutral-50 tracking-tight leading-tight">
 {title}
 </h2>
 </div>

 {/* Inclusões Rápidas */}
 <div className="flex flex-wrap items-center gap-2 pt-1">
 {inclusions.slice(0, 4).map((inc, i) => (
 <span
 key={i}
 className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs bg-neutral-900 border border-neutral-700 text-neutral-50"
 >
 <ShieldCheck className="size-3 text-emerald-400" />
 <span>{inc}</span>
 </span>
 ))}
 </div>

 {/* Bloco de Preço & Conversão */}
 <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-neutral-700">
 <div className="space-y-1">
 <span className="text-2xs text-neutral-300 font-semibold uppercase tracking-wider">
 A partir de (para 2 pessoas)
 </span>
 <div className="flex items-baseline gap-2">
 {count > 1 && <span className="text-sm font-semibold text-neutral-200">{count}x</span>}
 <span className="text-2xl sm:text-3xl font-black text-neutral-50 font-mono">
 {formatMoney(count > 1 ? installmentCents : priceCents)}
 </span>
 {count > 1 && <span className="text-xs text-neutral-300">ou {formatMoney(priceCents)} à vista</span>}
 </div>
 </div>

 <Button
 onClick={handleBooking}
 size="lg"
 className="rounded-full px-8 h-12 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90  cursor-pointer flex items-center gap-2 shrink-0"
 >
 <MessageCircle className="size-4" />
 <span>Reservar Agora</span>
 </Button>
 </div>
 </div>
 </section>
 );
}
