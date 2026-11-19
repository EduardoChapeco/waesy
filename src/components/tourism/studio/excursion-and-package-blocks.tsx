import React from "react";
import { BedDouble, Bus, Calendar, CheckCircle2, Clock, Layers, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import type { BoardingPointSpec, SanitizedPublicSeat } from "@/lib/tourism/travel-blueprint";
import { cn } from "@/lib/utils";

interface DepartureOptionLike {
  id?: string;
  label?: string;
  departure_date?: string;
  return_date?: string;
  price_override_cents?: number | null;
  available_spots?: number | null;
  status?: string;
}

interface ExcursionAndPackageBlocksProps {
  seats?: SanitizedPublicSeat[] | null;
  totalSeats?: number | null;
  availableSeats?: number | null;
  busCompanyName?: string | null;
  boardingPoints?: BoardingPointSpec[] | null;
  pricingTiers?: Array<{ name: string; price_cents?: number; price?: number; description?: string }> | null;
  extraOptions?: Array<{ name: string; price_cents?: number; price?: number; description?: string }> | null;
  departureOptions?: DepartureOptionLike[] | null;
  selectedDepartureId?: string | null;
  onSelectDeparture?: (id: string) => void;
}

function resolveOptionCents(item: { price_cents?: number; price?: number }): number {
  if (typeof item.price_cents === "number" && Number.isFinite(item.price_cents)) {
    return item.price_cents;
  }
  if (typeof item.price === "number" && Number.isFinite(item.price)) {
    return Math.round(item.price * 100);
  }
  return 0;
}

export function ExcursionAndPackageBlocks({
  seats,
  totalSeats,
  availableSeats,
  busCompanyName,
  boardingPoints,
  pricingTiers,
  extraOptions,
  departureOptions,
  selectedDepartureId,
  onSelectDeparture,
}: ExcursionAndPackageBlocksProps) {
  const safeSeats = Array.isArray(seats) ? seats : [];
  const freeSeatsCount = safeSeats.filter((s) => s.status === "free").length;
  const effectiveAvailable = safeSeats.length > 0 ? freeSeatsCount : (availableSeats ?? null);
  const safeBoarding = Array.isArray(boardingPoints) ? boardingPoints : [];
  const safeTiers = Array.isArray(pricingTiers) ? pricingTiers : [];
  const safeExtras = Array.isArray(extraOptions) ? extraOptions : [];
  const safeDepartures = Array.isArray(departureOptions) ? departureOptions : [];

  if (
    safeSeats.length === 0 &&
    safeBoarding.length === 0 &&
    safeTiers.length === 0 &&
    safeExtras.length === 0 &&
    safeDepartures.length === 0
  ) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* ── Datas de Saída Selecionáveis (Pacotes e Excursões) ── */}
      {safeDepartures.length > 0 && (
        <section className="p-5 rounded-xl border border-border bg-card space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Calendar className="size-5 text-primary" />
            <span>Datas de Saída Disponíveis</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {safeDepartures.map((dep, idx) => {
              const depId = dep.id || `dep-${idx}`;
              const isSelected = selectedDepartureId ? selectedDepartureId === depId : idx === 0;
              const priceOverride = Number(dep.price_override_cents || 0);
              return (
                <button
                  key={depId}
                  type="button"
                  onClick={() => onSelectDeparture?.(depId)}
                  className={cn(
                    "min-h-14 p-3 rounded-xl border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex items-center justify-between gap-2",
                    isSelected
                      ? "bg-primary/10 border-primary text-foreground"
                      : "bg-muted/30 border-border hover:bg-muted/60 text-foreground",
                  )}
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-bold truncate">
                      {dep.label || dep.departure_date || `Saída ${idx + 1}`}
                    </p>
                    {(dep.departure_date || dep.return_date) && (
                      <p className="text-xs font-mono text-muted-foreground">
                        {[dep.departure_date, dep.return_date].filter(Boolean).join(" → ")}
                      </p>
                    )}
                    {dep.available_spots != null && (
                      <span className="text-xs text-muted-foreground block">
                        {dep.available_spots} vaga(s)
                      </span>
                    )}
                  </div>
                  {priceOverride > 0 && (
                    <span className="text-xs font-bold font-mono text-primary shrink-0">
                      {formatMoney(priceOverride)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Pontos & Horários de Embarque ── */}
      {safeBoarding.length > 0 && (
        <section className="p-5 rounded-xl border border-border bg-card space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <MapPin className="size-5 text-primary" />
            <span>Pontos e Horários de Embarque</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {safeBoarding.map((bp, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-border bg-muted/30 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground">{bp.city}</span>
                  {bp.time && (
                    <Badge variant="outline" className="text-xs font-mono gap-1">
                      <Clock className="size-3" />
                      <span>{bp.time}</span>
                    </Badge>
                  )}
                </div>
                {bp.location && (
                  <p className="text-xs text-muted-foreground">{bp.location}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Mapa Visual de Poltronas (Sem PII) ── */}
      {safeSeats.length > 0 && (
        <section className="p-5 rounded-xl border border-border bg-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Bus className="size-5 text-primary" />
              <span>Disponibilidade de Poltronas</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {busCompanyName && (
                <Badge variant="secondary" className="text-xs">
                  {busCompanyName}
                </Badge>
              )}
              {effectiveAvailable !== null && (
                <Badge variant="outline" className="text-xs font-mono">
                  {effectiveAvailable} / {totalSeats || safeSeats.length} livres
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="size-3 rounded-sm bg-success/20 border border-success/50" />
              <span>Livre ({freeSeatsCount})</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-3 rounded-sm bg-muted border border-border" />
              <span>Reservada ({safeSeats.filter((s) => s.status === "reserved").length})</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 lg:grid-cols-12 gap-2">
            {safeSeats.map((seat) => {
              const isFree = seat.status === "free";
              return (
                <div
                  key={`${seat.floor}-${seat.seat_number}`}
                  aria-label={`Poltrona ${seat.seat_number}: ${isFree ? "livre" : "indisponível"}`}
                  className={cn(
                    "h-11 rounded-lg border flex items-center justify-center text-xs font-mono font-bold",
                    isFree
                      ? "bg-success/10 border-success/40 text-foreground"
                      : "bg-muted border-border text-muted-foreground line-through",
                  )}
                >
                  {String(seat.seat_number).padStart(2, "0")}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Tarifas por Acomodação & Opcionais ── */}
      {(safeTiers.length > 0 || safeExtras.length > 0) && (
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {safeTiers.length > 0 && (
            <div className="p-5 rounded-xl border border-border bg-card space-y-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <BedDouble className="size-4 text-primary" />
                <span>Tarifas por Acomodação</span>
              </h2>
              <div className="space-y-2">
                {safeTiers.map((tier, idx) => {
                  const cents = resolveOptionCents(tier);
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-muted/30 border border-border flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{tier.name}</p>
                        {tier.description && (
                          <p className="text-xs text-muted-foreground">{tier.description}</p>
                        )}
                      </div>
                      {cents > 0 && (
                        <span className="text-xs font-bold font-mono text-primary shrink-0">
                          {formatMoney(cents)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {safeExtras.length > 0 && (
            <div className="p-5 rounded-xl border border-border bg-card space-y-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                <span>Serviços Opcionais</span>
              </h2>
              <div className="space-y-2">
                {safeExtras.map((extra, idx) => {
                  const cents = resolveOptionCents(extra);
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-muted/30 border border-border flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{extra.name}</p>
                          {extra.description && (
                            <p className="text-xs text-muted-foreground">{extra.description}</p>
                          )}
                        </div>
                      </div>
                      {cents > 0 && (
                        <span className="text-xs font-bold font-mono text-foreground shrink-0">
                          +{formatMoney(cents)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
