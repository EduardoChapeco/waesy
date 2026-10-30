import * as React from "react";
import { Plane, Clock, Luggage, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FlightOfferCardProps {
  airline: string;
  airlineLogoUrl?: string;
  flightNumber?: string;
  departureTime: string;
  departureAirport: string;
  arrivalTime: string;
  arrivalAirport: string;
  duration: string;
  stops: number; // 0 = Direto, 1 = 1 parada, etc.
  stopsDescription?: string;
  baggageIncluded?: boolean;
  price: string;
  pricePerPerson?: string;
  conditions?: string;
  isBestOption?: boolean;
  isCheapest?: boolean;
  onSelect?: () => void;
  ctaText?: string;
  className?: string;
}

export function FlightOfferCard({
  airline,
  airlineLogoUrl,
  flightNumber,
  departureTime,
  departureAirport,
  arrivalTime,
  arrivalAirport,
  duration,
  stops,
  stopsDescription,
  baggageIncluded,
  price,
  pricePerPerson,
  conditions,
  isBestOption = false,
  isCheapest = false,
  onSelect,
  ctaText = "Selecionar Voo",
  className,
}: FlightOfferCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/80 bg-card p-4 transition-colors select-none",
        isBestOption && "border-primary/60 bg-primary/5",
        "hover:border-primary/50",
        className
      )}
    >
      {/* Top Badges / Airline */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40 gap-3">
        <div className="flex items-center gap-2">
          {airlineLogoUrl ? (
            <img
              src={airlineLogoUrl}
              alt={airline}
              className="size-6 object-contain rounded"
            />
          ) : (
            <div className="size-6 rounded bg-muted flex items-center justify-center text-xs font-semibold">
              <Plane className="size-3.5 text-muted-foreground" />
            </div>
          )}
          <span className="text-xs font-semibold text-foreground">{airline}</span>
          {flightNumber && (
            <span className="text-2xs text-muted-foreground font-mono">
              {flightNumber}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isBestOption && (
            <span className="px-2 py-1 rounded-full bg-primary text-primary-foreground text-3xs font-semibold">
              Melhor Opção
            </span>
          )}
          {isCheapest && !isBestOption && (
            <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-3xs font-semibold">
              Mais Barato
            </span>
          )}
        </div>
      </div>

      {/* Flight Schedule Row */}
      <div className="flex items-center justify-between py-4 gap-4">
        {/* Departure */}
        <div className="space-y-1 min-w-18">
          <div className="text-lg font-bold text-foreground font-mono tabular-nums">
            {departureTime}
          </div>
          <div className="text-xs font-semibold text-muted-foreground uppercase">
            {departureAirport}
          </div>
        </div>

        {/* Flight Path & Duration */}
        <div className="flex-1 flex flex-col items-center gap-1 px-2">
          <span className="text-2xs text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" />
            <span>{duration}</span>
          </span>

          <div className="relative w-full flex items-center justify-center">
            <div className="w-full h-px bg-border" />
            <div className="absolute size-2 rounded-full bg-primary" />
          </div>

          <span className="text-3xs text-muted-foreground">
            {stops === 0 ? "Voo Direto" : stopsDescription ?? `${stops} conexão`}
          </span>
        </div>

        {/* Arrival */}
        <div className="space-y-1 text-right min-w-18">
          <div className="text-lg font-bold text-foreground font-mono tabular-nums">
            {arrivalTime}
          </div>
          <div className="text-xs font-semibold text-muted-foreground uppercase">
            {arrivalAirport}
          </div>
        </div>
      </div>

      {/* Bottom Row: Baggage, Conditions & Price + CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/40">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Luggage className="size-3.5" />
            <span>
              {baggageIncluded === undefined
                ? "Bagagem não informada"
                : baggageIncluded
                  ? "Bagagem inclusa"
                  : "Sem bagagem despachada"}
            </span>
          </div>
          {conditions && <span className="truncate">{conditions}</span>}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <div className="text-right">
            <div className="text-lg font-bold text-foreground font-mono tabular-nums">
              {price}
            </div>
            {pricePerPerson && (
              <span className="text-3xs text-muted-foreground block">
                {pricePerPerson}
              </span>
            )}
          </div>

          {onSelect && (
            <button
              type="button"
              onClick={onSelect}
              className="min-h-11 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer shrink-0"
            >
              {ctaText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
