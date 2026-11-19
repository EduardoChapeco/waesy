import React, { useState } from "react";
import {
  Anchor,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  MapPin,
  Ship,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CruiseRouteSvgMap } from "./CruiseRouteSvgMap";
import type { CruiseDTO } from "@/services/travel-proposal.functions";

export interface CruiseItinerarySectionProps {
  cruise: CruiseDTO;
  tone?: "light" | "dark";
  accentColor?: string;
  defaultExpanded?: boolean;
  className?: string;
}

export function CruiseItinerarySection({
  cruise,
  tone = "light",
  accentColor = "var(--primary)",
  defaultExpanded = true,
  className = "",
}: CruiseItinerarySectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const itinerary = Array.isArray(cruise.itinerary) ? cruise.itinerary : [];

  return (
    <div className={`rounded-2xl border border-border bg-card p-5 space-y-5 ${className}`}>
      {/* Cabeçalho do Cruzeiro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Ship className="size-5" />
            </span>
            <div>
              <h3 className="text-xl font-bold text-foreground">
                {cruise.ship_name || "Cruzeiro Marítimo"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {cruise.company || "Armadora Marítima"} · {cruise.duration_nights || Math.max(1, itinerary.length - 1)} noites
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {cruise.cabin_category && (
            <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-muted/40">
              {cruise.cabin_category}
            </Badge>
          )}
          {cruise.board_basis && (
            <Badge variant="secondary" className="text-xs font-semibold px-3 py-1">
              {cruise.board_basis}
            </Badge>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="size-11 min-h-11 min-w-11 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={isExpanded ? "Recolher Itinerário" : "Expandir Itinerário"}
          >
            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </div>
      </div>

      {/* Conteúdo Expandido: Mapa Costeiro + Timeline Dia a Dia */}
      {isExpanded && (
        <div className="space-y-6">
          {/* Mapa Costeiro com Costa Brasileira (Santos -> Búzios) */}
          <CruiseRouteSvgMap
            itinerary={itinerary}
            tone={tone}
            accentColor={accentColor}
            shipName={cruise.ship_name}
          />

          {/* Timeline de Itinerário Dia a Dia */}
          {itinerary.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground pb-2">
                <Calendar className="size-4 text-primary" />
                <span>Programação Náutica Dia a Dia</span>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {itinerary.map((day, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === itinerary.length - 1;
                  const isSeaDay = Boolean(day.is_sea_day || /navega|mar|sea/i.test(day.port));

                  return (
                    <div key={idx} className="relative group">
                      {/* Marcador na linha de tempo */}
                      <div
                        className={`absolute -left-6 top-1 size-5 rounded-full flex items-center justify-center border-2 ${
                          isFirst || isLast
                            ? "bg-primary border-background text-primary-foreground"
                            : isSeaDay
                              ? "bg-card border-primary text-primary"
                              : "bg-card border-primary text-primary"
                        }`}
                      >
                        {isFirst || isLast ? (
                          <div className="size-1.5 rounded-full bg-primary-foreground" />
                        ) : isSeaDay ? (
                          <div className="size-1.5 rounded-full bg-primary" />
                        ) : (
                          <div className="size-1.5 rounded-full bg-primary" />
                        )}
                      </div>

                      {/* Conteúdo do Dia */}
                      <div className="flex items-start justify-between gap-4 p-3 rounded-xl hover:bg-muted/40 transition-colors">
                        <div className="space-y-1 min-w-0">
                          <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                            DIA {day.day || idx + 1}
                            {day.date && ` · ${day.date}`}
                          </span>
                          <h4 className="text-base font-bold text-foreground break-words">
                            {day.port}
                          </h4>
                          {day.notes && (
                            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                              {day.notes}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground pt-1">
                            <span>
                              ARR: <strong className="text-foreground">{day.arrival_time || "-"}</strong>
                            </span>
                            <span>
                              DEP: <strong className="text-foreground">{day.departure_time || "-"}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Ícone de Atividade Marítima */}
                        <div className="shrink-0 pt-1">
                          {isSeaDay ? (
                            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400" title="Dia em navegação no mar">
                              <Ship className="size-5" />
                            </div>
                          ) : isFirst ? (
                            <div className="p-2 rounded-lg bg-primary/10 text-primary" title="Porto de embarque">
                              <Anchor className="size-5" />
                            </div>
                          ) : isLast ? (
                            <div className="p-2 rounded-lg bg-muted text-muted-foreground" title="Porto de desembarque">
                              <Anchor className="size-5" />
                            </div>
                          ) : (
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" title="Escala com atracação ou tender">
                              <Compass className="size-5" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
