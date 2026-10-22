import * as React from "react";
import { Plane, Calendar, Users, Briefcase, MapPin, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TravelIntentCardProps {
  origin: string;
  originCode?: string;
  destination: string;
  destinationCode?: string;
  dates: string;
  passengers: string;
  travelClass?: string;
  baggage?: string;
  onEdit?: () => void;
  className?: string;
}

export function TravelIntentCard({
  origin,
  originCode,
  destination,
  destinationCode,
  dates,
  passengers,
  travelClass = "Econômica",
  baggage = "Mala de bordo",
  onEdit,
  className,
}: TravelIntentCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/80 bg-card p-4 select-none my-2 space-y-3",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Plane className="size-3.5" />
          </div>
          <span className="text-xs font-semibold text-foreground">Intenção de Viagem</span>
        </div>

        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-2xs font-medium text-primary hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Editar Critérios
          </button>
        )}
      </div>

      {/* Route */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="space-y-1 min-w-0">
          <div className="text-sm font-bold text-foreground flex items-center gap-1">
            <span>{origin}</span>
            {originCode && (
              <span className="text-xs text-muted-foreground font-mono">({originCode})</span>
            )}
          </div>
          <span className="text-3xs text-muted-foreground uppercase tracking-wider">Origem</span>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground shrink-0 px-2">
          <div className="w-6 h-px bg-border" />
          <ArrowRight className="size-3.5" />
          <div className="w-6 h-px bg-border" />
        </div>

        <div className="space-y-1 text-right min-w-0">
          <div className="text-sm font-bold text-foreground flex items-center justify-end gap-1">
            <span>{destination}</span>
            {destinationCode && (
              <span className="text-xs text-muted-foreground font-mono">({destinationCode})</span>
            )}
          </div>
          <span className="text-3xs text-muted-foreground uppercase tracking-wider">Destino</span>
        </div>
      </div>

      {/* Meta Grid */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/30 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="size-3.5 shrink-0" />
          <span className="text-foreground font-medium truncate">{dates}</span>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="size-3.5 shrink-0" />
          <span className="text-foreground font-medium truncate">{passengers}</span>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <Briefcase className="size-3.5 shrink-0" />
          <span className="text-foreground font-medium truncate">{baggage}</span>
        </div>
      </div>
    </div>
  );
}
