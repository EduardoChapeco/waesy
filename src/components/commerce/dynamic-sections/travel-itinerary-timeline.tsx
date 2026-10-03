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
  days = [],
}: TravelItineraryTimelineProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({ 1: true });

  if (!days || days.length === 0) return null;

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
 role="button"
 tabIndex={0}
 onKeyDown={(e) => {
 if (e.key === "Enter" || e.key === " ") {
 e.preventDefault();
 toggle(day.day);
 }
 }}
 className="relative group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
 onClick={() => toggle(day.day)}
 >
 {/* Marcador Numérico */}
 <div
 className={cn(
 "absolute -left-7 sm:-left-8 top-0.5 size-6 rounded-full border-2 flex items-center justify-center text-xs font-bold z-10 transition-colors",
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
 <span className="text-xs font-mono text-muted-foreground shrink-0">{day.date}</span>
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

 <div className="flex items-center justify-between pt-1 text-xs text-primary font-semibold">
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
