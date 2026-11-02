import React from "react";
import { Hotel, Star, MapPin, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface TravelHotelItem {
  id: string;
  name: string;
  city: string;
  state?: string | null;
  stars?: number;
  mealPlan?: string;
  coverPhotoUrl?: string;
  badges?: string[];
  rating?: number;
}

export interface TravelHotelSliderProps {
  title?: string;
  subtitle?: string;
  hotels?: TravelHotelItem[];
  onHotelClick?: (hotel: TravelHotelItem) => void;
}

export function TravelHotelSlider({
  title = "Hospedagens & Resorts Selecionados",
  subtitle = "Parceiros oficiais com tarifas exclusivas e máxima qualidade comprovada",
  hotels = [],
  onHotelClick,
}: TravelHotelSliderProps) {
  if (!hotels || hotels.length === 0) return null;
  return (
    <section className="space-y-4 py-4">
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Hotel className="size-4" />
            <span>Hospedagens Parceiras</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {/* Carrossel Horizontal com Snap Scroll */}
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
        {hotels.map((hotel) => (
          <div
            key={hotel.id}
            role="button"
            tabIndex={0}
            onClick={() => onHotelClick?.(hotel)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onHotelClick?.(hotel);
              }
            }}
            className="w-72 sm:w-80 shrink-0 bg-card rounded-lg overflow-hidden border-0 hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-colors duration-200 cursor-pointer group flex flex-col"
          >
            {/* Imagem de Capa */}
            <div className="relative aspect-[16/10] w-full bg-muted/40 overflow-hidden">
              <img
                src={hotel.coverPhotoUrl}
                alt={hotel.name}
                className="size-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-background/60 pointer-events-none" />

              {Boolean(hotel.stars && hotel.stars > 0) && (
                <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-background/90 text-warning text-xs">
                  {Array.from({ length: hotel.stars! }).map((_, i) => (
                    <Star key={i} className="size-3 fill-warning text-warning" />
                  ))}
                </div>
              )}

              {hotel.rating && (
                <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground font-semibold text-xs border-none flex items-center gap-1">
                  <Star className="size-2.5 fill-current" />
                  <span>{hotel.rating}</span>
                </Badge>
              )}

              <div className="absolute bottom-3 left-3 right-3 text-foreground">
                <h4 className="text-sm font-bold truncate">{hotel.name}</h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="size-3" />
                  <span>
                    {hotel.city}, {hotel.state}
                  </span>
                </p>
              </div>
            </div>

            {/* Informações */}
            <div className="p-4 space-y-2 flex-1 flex flex-col justify-between text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {hotel.mealPlan && (
                  <span className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                    {hotel.mealPlan}
                  </span>
                )}
                {(hotel.badges || []).map((badge, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs border border-border/50"
                  >
                    {badge}
                  </span>
                ))}
              </div>

              <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-primary font-semibold">
                <span>Ver Pacotes Disponíveis</span>
                <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
