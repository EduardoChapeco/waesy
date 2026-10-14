import * as React from "react";
import { Plane, Calendar, Users, Search, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  travelClass: "economy" | "premium" | "business";
  isRoundTrip: boolean;
}

export interface FlightSearchWidgetProps {
  initialParams?: Partial<FlightSearchParams>;
  onSearch: (params: FlightSearchParams) => void;
  isLoading?: boolean;
  className?: string;
}

export function FlightSearchWidget({
  initialParams,
  onSearch,
  isLoading = false,
  className,
}: FlightSearchWidgetProps) {
  const [origin, setOrigin] = React.useState(initialParams?.origin ?? "São Paulo (SAO)");
  const [destination, setDestination] = React.useState(initialParams?.destination ?? "Recife (REC)");
  const [departureDate, setDepartureDate] = React.useState(
    initialParams?.departureDate ?? "2026-11-15"
  );
  const [returnDate, setReturnDate] = React.useState(
    initialParams?.returnDate ?? "2026-11-22"
  );
  const [passengers, setPassengers] = React.useState(initialParams?.passengers ?? 2);
  const [travelClass, setTravelClass] = React.useState<"economy" | "premium" | "business">(
    initialParams?.travelClass ?? "economy"
  );
  const [isRoundTrip, setIsRoundTrip] = React.useState(initialParams?.isRoundTrip ?? true);

  const handleSwapAirports = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      origin,
      destination,
      departureDate,
      returnDate: isRoundTrip ? returnDate : undefined,
      passengers,
      travelClass,
      isRoundTrip,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "rounded-lg border border-border/80 bg-card p-4 select-none my-2 space-y-4",
        className
      )}
    >
      {/* Top Segment: Trip Type */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40 text-xs">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/60">
          <button
            type="button"
            onClick={() => setIsRoundTrip(true)}
            className={cn(
              "px-3 py-1 rounded-md font-medium transition-colors cursor-pointer",
              isRoundTrip ? "bg-card text-foreground font-semibold shadow-xs" : "text-muted-foreground"
            )}
          >
            Ida e Volta
          </button>
          <button
            type="button"
            onClick={() => setIsRoundTrip(false)}
            className={cn(
              "px-3 py-1 rounded-md font-medium transition-colors cursor-pointer",
              !isRoundTrip ? "bg-card text-foreground font-semibold shadow-xs" : "text-muted-foreground"
            )}
          >
            Somente Ida
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={travelClass}
            onChange={(e) => setTravelClass(e.target.value as any)}
            className="h-8 px-2 rounded-lg border border-border/70 bg-background text-xs text-foreground cursor-pointer"
          >
            <option value="economy">Econômica</option>
            <option value="premium">Premium</option>
            <option value="business">Executiva</option>
          </select>
        </div>
      </div>

      {/* Origin & Destination Inputs with Swap */}
      <div className="flex flex-col md:flex-row items-center gap-2">
        <div className="space-y-1 flex-1 w-full">
          <label className="text-2xs font-medium text-muted-foreground">Origem</label>
          <div className="relative flex items-center">
            <Plane className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full min-h-11 pl-9 pr-3 rounded-lg border border-border/70 bg-background text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="flex items-center justify-center md:pt-5 shrink-0">
          <button
            type="button"
            onClick={handleSwapAirports}
            title="Inverter origem e destino"
            aria-label="Inverter aeroportos"
            className="size-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
          >
            <ArrowRightLeft className="size-3.5" />
          </button>
        </div>

        <div className="space-y-1 flex-1 w-full">
          <label className="text-2xs font-medium text-muted-foreground">Destino</label>
          <div className="relative flex items-center">
            <Plane className="absolute left-3 size-4 text-muted-foreground pointer-events-none rotate-90" />
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full min-h-11 pl-9 pr-3 rounded-lg border border-border/70 bg-background text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Dates & Passengers Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-2xs font-medium text-muted-foreground">Data de Ida</label>
          <div className="relative flex items-center">
            <Calendar className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="w-full min-h-11 pl-9 pr-3 rounded-lg border border-border/70 bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono tabular-nums"
            />
          </div>
        </div>

        {isRoundTrip && (
          <div className="space-y-1">
            <label className="text-2xs font-medium text-muted-foreground">Data de Volta</label>
            <div className="relative flex items-center">
              <Calendar className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full min-h-11 pl-9 pr-3 rounded-lg border border-border/70 bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono tabular-nums"
              />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-2xs font-medium text-muted-foreground">Passageiros</label>
          <div className="relative flex items-center">
            <Users className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
            <select
              value={passengers}
              onChange={(e) => setPassengers(Number(e.target.value))}
              className="w-full min-h-11 pl-9 pr-3 rounded-lg border border-border/70 bg-background text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
              <option value={1}>1 Adulto</option>
              <option value={2}>2 Adultos</option>
              <option value={3}>3 Adultos</option>
              <option value={4}>4 Adultos</option>
              <option value={5}>5+ Passageiros</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submit Search CTA */}
      <div className="flex items-center justify-end pt-2 border-t border-border/40">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 min-h-11 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        >
          <Search className="size-4" />
          <span>{isLoading ? "Buscando Voos..." : "Buscar Voos"}</span>
        </button>
      </div>
    </form>
  );
}
