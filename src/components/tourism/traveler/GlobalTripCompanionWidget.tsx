import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Compass,
  MapPin,
  MessageCircle,
  ExternalLink,
  Luggage,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import {
  getMyActiveOrUpcomingTrip,
  type ActiveTripDTO,
} from "@/services/travel-lifecycle.functions";

export function GlobalTripCompanionWidget() {
  const [trip, setTrip] = useState<ActiveTripDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadTrip() {
      try {
        setIsLoading(true);
        const res = await getMyActiveOrUpcomingTrip({});
        if (mounted && res.success && res.data) {
          setTrip(res.data);
        }
      } catch {
        // Silently fail if not authenticated or no active trips
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadTrip();
    return () => {
      mounted = false;
    };
  }, []);

  if (!trip || isLoading) {
    return null;
  }

  const isTodayOrActive = trip.isLive || trip.daysUntilDeparture <= 0;

  return (
    <>
      {/* 1. DESKTOP CAPSULE PILL (>= 640px) */}
      <div className="hidden sm:flex items-center">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="h-11 min-h-11 px-4 rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Luggage className="size-4 text-primary shrink-0" />
          <div className="flex items-center gap-2 truncate max-w-48">
            <span className="font-bold text-primary truncate">{trip.destination}</span>
            <span className="text-muted-foreground text-3xs">•</span>
            <span className="text-muted-foreground text-2xs truncate">
              {isTodayOrActive ? (
                <span className="text-emerald-600 font-bold">Em Viagem</span>
              ) : (
                `Em ${trip.daysUntilDeparture}d`
              )}
            </span>
          </div>
          <Badge className="bg-primary/15 text-primary text-3xs px-2 py-0 border-0">
            Minha Viagem
          </Badge>
        </button>
      </div>

      {/* 2. MOBILE FLOATING BADGE (< 640px) */}
      <div className="sm:hidden fixed bottom-20 right-4 z-30">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="size-12 min-h-11 min-w-11 rounded-full bg-primary text-primary-foreground border border-primary-foreground/20 flex items-center justify-center cursor-pointer transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Abrir assistente da Minha Viagem"
        >
          <Luggage className="size-5" />
          {isTodayOrActive && (
            <span className="absolute top-0 right-0 size-3 rounded-full bg-emerald-500 border-2 border-background" />
          )}
        </button>
      </div>

      {/* 3. ASSISTANT DRAWER */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-6 space-y-6 overflow-y-auto">
          <SheetHeader className="text-left space-y-1">
            <div className="flex items-center gap-2 text-2xs font-bold uppercase tracking-wider text-primary">
              <Sparkles className="size-3.5" /> Assistente de Bolso do Viajante
            </div>
            <SheetTitle className="text-lg font-bold text-foreground">
              {trip.title}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Destino: {trip.destination} • Partida: {trip.startDate}
            </SheetDescription>
          </SheetHeader>

          {/* STATUS OU CONTAGEM */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-2xs font-bold uppercase text-muted-foreground">Status da Viagem</div>
              <div className="text-sm font-bold text-foreground">
                {isTodayOrActive ? "Viagem em Andamento!" : `Faltam ${trip.daysUntilDeparture} dias para o embarque`}
              </div>
            </div>
            <Badge className="bg-primary text-primary-foreground text-2xs">
              {isTodayOrActive ? "Ao Vivo" : "Confirmada"}
            </Badge>
          </div>

          {/* ITINERÁRIO & ASSENTOS */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-foreground flex items-center gap-2">
              <Compass className="size-4 text-primary" />
              Detalhes do Transporte
            </div>
            <div className="p-4 rounded-lg border border-border bg-card space-y-2 text-xs">
              {trip.flightPnr && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Localizador (PNR):</span>
                  <span className="font-mono font-bold text-foreground">{trip.flightPnr}</span>
                </div>
              )}
              {trip.hotelCheckinTime && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Check-in Hotel:</span>
                  <span className="font-medium text-foreground">{trip.hotelCheckinTime}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Retorno Previsto:</span>
                <span className="font-medium text-foreground">{trip.endDate}</span>
              </div>
            </div>
          </div>

          {/* PONTOS DE ENCONTRO / WAZE & MAPS */}
          {trip.techStopPoints && trip.techStopPoints.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-foreground flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                Pontos de Parada & Encontro
              </div>
              <div className="space-y-2">
                {trip.techStopPoints.map((stop: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-border bg-card flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-foreground">{stop.title}</div>
                      <div className="text-2xs text-muted-foreground">{stop.time || "Horário a combinar"}</div>
                    </div>
                    {stop.mapsUrl && (
                      <a
                        href={stop.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="h-11 min-h-11 px-3 rounded-md bg-muted hover:bg-muted/80 text-foreground text-2xs font-bold flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <ExternalLink className="size-3" /> Waze / Maps
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GUIA / TOUR LEADER WHATSAPP */}
          {trip.tourLeaderPhone && (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-bold text-foreground">
                  Guia / Coordenador: {trip.tourLeaderName || "Líder Waesy"}
                </div>
                <div className="text-2xs text-muted-foreground">Suporte direto durante o trajeto</div>
              </div>
              <a
                href={`https://wa.me/${trip.tourLeaderPhone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="h-11 min-h-11 px-4 rounded-md bg-emerald-600 hover:bg-emerald-700 text-primary-foreground text-xs font-bold flex items-center gap-2 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            </div>
          )}

          {/* LINK CENTRAL "MINHA VIAGEM" COMPLETO */}
          <div className="pt-2">
            <Link
              to="/minha-viagem"
              onClick={() => setDrawerOpen(false)}
              className="w-full h-11 min-h-11 px-4 rounded-lg bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Abrir Roteiro Completo, Voucher & Fotos
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
