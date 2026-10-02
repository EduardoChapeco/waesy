import React, { useState } from "react";
import { Calendar, ChevronRight, Clock, MapPin, Layers } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TravelItineraryDay } from "@/types/travel-package";

export interface TravelItineraryTimelineProps {
 title?: string;
 subtitle?: string;
 days?: TravelItineraryDay[];
}

export function TravelItineraryTimeline({
 title = "Roteiro Dia a Dia Completo",
 subtitle = "Programação sugerida com paradas, passeios culturais e momentos livres",
 days = [
 {
 id: "d1",
 day: 1,
 date: "Dia 1",
 title: "Chegada e Recepção",
 description: "Recepção no aeroporto ou ponto de encontro, transfer até o hotel e check-in. Restante do dia livre para descanso.",
 },
 {
 id: "d2",
 day: 2,
 date: "Dia 2",
 title: "City Tour Histórico e Cultural",
 description: "Visita aos principais marcos históricos da cidade com guia credenciado, paradas para fotos e almoço típico.",
 },
 {
 id: "d3",
 day: 3,
 date: "Dia 3",
 title: "Passeio pelas Praias e Ecoturismo",
 description: "Dia dedicado à natureza, praias paradisíacas e trilhas ecológicas leves com banho de mar ou cachoeira.",
 },
 {
 id: "d4",
 day: 4,
 date: "Dia 4",
 title: "Dia Livre e Compras",
 description: "Aproveite para compras de artesanato, feiras locais e gastronomia típica nos melhores restaurantes.",
 },
 {
 id: "d5",
 day: 5,
 date: "Dia 5",
 title: "Check-out e Retorno",
 description: "Manhã livre, check-out no hotel e transfer para o aeroporto ou terminal de embarque para retorno.",
 },
 ],
}: TravelItineraryTimelineProps) {
 const [expanded, setExpanded] = useState<Record<number, boolean>>({ 1: true });

 const toggle = (dayNum: number) => {
 setExpanded((prev) => ({ ...prev, [dayNum]: !prev[dayNum] }));
 };

 return (
 <section className="space-y-6 py-4">
 <div className="flex items-end justify-between border-b border-border/40 pb-3">
 <div className="space-y-1">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
 <Calendar className="size-4" />
 <span>Itinerário de Viagem</span>
 </div>
 <h3 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h3>
 <p className="text-xs text-muted-foreground">{subtitle}</p>
 </div>

 <Badge variant="outline" className="font-mono text-xs">
 {days.length} Dias
 </Badge>
 </div>

 <div className="relative pl-7 sm:pl-8 space-y-5">
 {/* Linha vertical contínua */}
 <div className="absolute left-3 top-2.5 bottom-2.5 w-0.5 bg-border/80 rounded-full" />

 {days.map((day) => {
 const isExp = !!expanded[day.day];

 return (
 <div
 key={day.id || day.day}
 className="relative group cursor-pointer"
 onClick={() => toggle(day.day)}
 >
 {/* Marcador Numérico */}
 <div
 className={cn(
 "absolute -left-7 sm:-left-8 top-0.5 size-6 rounded-full border-2 flex items-center justify-center text-[11px] font-bold z-10 transition-colors",
 isExp
 ? "bg-primary border-primary text-primary-foreground"
 : "bg-background border-border text-muted-foreground group-hover:border-primary/60"
 )}
 >
 {day.day}
 </div>

 {/* Card da Programação */}
 <div className="p-4 rounded-lg bg-card border border-border/70 hover:border-primary/40 transition-all space-y-2 shadow-2xs">
 <div className="flex items-baseline justify-between gap-2">
 <h4 className="text-sm font-bold text-foreground">{day.title}</h4>
 {day.date && (
 <span className="text-[11px] font-mono text-muted-foreground shrink-0">{day.date}</span>
 )}
 </div>

 <p
 className={cn(
 "text-xs text-muted-foreground leading-relaxed transition-all",
 !isExp && "line-clamp-2"
 )}
 >
 {day.description}
 </p>

 {day.imageUrl && isExp && (
 <div className="w-full h-40 rounded-lg overflow-hidden mt-2 border border-border/50">
 <img src={day.imageUrl} alt={day.title} className="size-full object-cover" />
 </div>
 )}

 <div className="flex items-center justify-between pt-1 text-[11px] text-primary font-semibold">
 <span>{isExp ? "Ocultar detalhes" : "Ver detalhes deste dia"}</span>
 <ChevronRight className={cn("size-3.5 transition-transform", isExp && "rotate-90")} />
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </section>
 );
}
