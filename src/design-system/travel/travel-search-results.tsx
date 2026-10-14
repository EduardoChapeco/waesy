import * as React from "react";
import { Filter, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { FlightOfferCard, type FlightOfferCardProps } from "./flight-offer-card";

export interface TravelSearchResultsProps {
  destination: string;
  offers: FlightOfferCardProps[];
  totalResults?: number;
  onSelectOffer?: (offer: FlightOfferCardProps) => void;
  onGenerateQuote?: () => void;
  className?: string;
}

export function TravelSearchResults({
  destination,
  offers,
  totalResults = offers.length,
  onSelectOffer,
  onGenerateQuote,
  className,
}: TravelSearchResultsProps) {
  const [activeFilter, setActiveFilter] = React.useState<string>("all");

  const filterOptions = [
    { id: "all", label: "Todos" },
    { id: "direct", label: "Voo Direto" },
    { id: "baggage", label: "Com Bagagem" },
    { id: "cheapest", label: "Mais Barato" },
    { id: "best", label: "Melhor Opção" },
  ];

  const filteredOffers = React.useMemo(() => {
    switch (activeFilter) {
      case "direct":
        return offers.filter((o) => o.stops === 0);
      case "baggage":
        return offers.filter((o) => o.baggageIncluded);
      case "cheapest":
        return offers.filter((o) => o.isCheapest);
      case "best":
        return offers.filter((o) => o.isBestOption);
      default:
        return offers;
    }
  }, [offers, activeFilter]);

  return (
    <div className={cn("space-y-4 my-2 select-none", className)}>
      {/* Results Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border/80 bg-card">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-foreground">
            Voos para {destination}
          </h4>
          <p className="text-xs text-muted-foreground font-mono tabular-nums">
            {totalResults} opções disponíveis encontradas
          </p>
        </div>

        {onGenerateQuote && (
          <button
            type="button"
            onClick={onGenerateQuote}
            className="inline-flex items-center gap-2 min-h-10 px-4 py-2 rounded-lg border border-border bg-background text-xs font-semibold text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <FileText className="size-3.5" />
            <span>Gerar Cotação</span>
          </button>
        )}
      </div>

      {/* Fast Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
        {filterOptions.map((opt) => {
          const isActive = activeFilter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setActiveFilter(opt.id)}
              className={cn(
                "px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Flight Cards List */}
      <div className="space-y-3">
        {filteredOffers.map((offer, idx) => (
          <FlightOfferCard
            key={`${offer.airline}-${offer.departureTime}-${idx}`}
            {...offer}
            onSelect={() => onSelectOffer?.(offer)}
          />
        ))}
      </div>
    </div>
  );
}
