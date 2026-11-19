import React, { useMemo } from "react";
import { Anchor, Building2, Car, Compass, Copy, Globe, MapPin, Plane, Plus, Ship, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaGalleryField } from "@/components/ui/media-gallery-field";
import { ProposalWebPageBuilder } from "@/components/tourism/studio/proposal-web-page-builder";
import { blueprintFromPackage, blueprintToTravelProposalDTO } from "@/lib/tourism/travel-blueprint";
import { CruiseRouteSvgMap } from "@/components/tourism/shared/CruiseRouteSvgMap";
import type { ProposalWebPageDTO } from "@/lib/tourism/proposal-normalization";
import type { TravelPackageData } from "@/types/travel-package";
import type { CruiseDTO, CruiseItineraryDayDTO } from "@/services/travel-proposal.functions";

interface SectionProps {
  value: Partial<TravelPackageData>;
  onChange: (next: Partial<TravelPackageData>) => void;
  productTitle?: string;
  priceCents?: number;
  storeName?: string;
  storePhone?: string;
}

export function TravelPackageMultiHotelsSection({ value, onChange }: SectionProps) {
  const hotels = Array.isArray(value.hotels) ? value.hotels : [];
  const defaultDest = value.destination?.name || "";

  const setHotels = (nextHotels: any[]) => {
    const first = nextHotels[0];
    onChange({
      ...value,
      hotels: nextHotels,
      ...(!value.resort?.name && first?.hotel_name
        ? {
            resort: {
              ...value.resort,
              name: first.hotel_name,
              meal_plan: first.board_basis || value.resort?.meal_plan || "Café da Manhã",
            },
          }
        : {}),
    });
  };

  return (
    <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <Building2 className="size-4 text-primary" />
          <span>Múltiplas Hospedagens & Galerias ({hotels.length})</span>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setHotels([
              ...hotels,
              {
                id: `pkg-hotel-${Date.now()}`,
                hotel_name: "",
                destination: defaultDest,
                board_basis: value.resort?.meal_plan || "Café da Manhã",
                stars: 4,
                media: [],
                images: [],
              },
            ])
          }
          className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-4" />
          <span>Hospedagem</span>
        </Button>
      </div>

      {hotels.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Adicione 1 ou mais hotéis com galerias individuais e vídeos para viagens combinadas (Split Stay) ou deixe apenas o resort principal acima.
        </p>
      ) : (
        <div className="space-y-4">
          {hotels.map((hotel: any, hIdx: number) => (
            <div key={hotel.id || hIdx} className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Input
                  placeholder="Nome do Hotel / Resort"
                  value={hotel.hotel_name || hotel.name || ""}
                  onChange={(e) =>
                    setHotels(
                      hotels.map((h, i) => (i === hIdx ? { ...h, hotel_name: e.target.value } : h)),
                    )
                  }
                  className="h-11 text-xs rounded-lg flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setHotels(hotels.filter((_, i) => i !== hIdx))}
                  aria-label="Remover hospedagem"
                  className="size-11 shrink-0 rounded-lg text-destructive cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  placeholder="Cidade / Região"
                  value={hotel.destination || ""}
                  onChange={(e) =>
                    setHotels(
                      hotels.map((h, i) => (i === hIdx ? { ...h, destination: e.target.value } : h)),
                    )
                  }
                  className="h-11 text-xs rounded-lg"
                />
                <Input
                  placeholder="Regime alimentar"
                  value={hotel.board_basis || ""}
                  onChange={(e) =>
                    setHotels(
                      hotels.map((h, i) => (i === hIdx ? { ...h, board_basis: e.target.value } : h)),
                    )
                  }
                  className="h-11 text-xs rounded-lg"
                />
                <Input
                  placeholder="Categoria de quarto"
                  value={hotel.room_type || ""}
                  onChange={(e) =>
                    setHotels(
                      hotels.map((h, i) => (i === hIdx ? { ...h, room_type: e.target.value } : h)),
                    )
                  }
                  className="h-11 text-xs rounded-lg"
                />
              </div>
              <MediaGalleryField
                items={Array.isArray(hotel.media) ? hotel.media : []}
                onChange={(nextMedia) =>
                  setHotels(
                    hotels.map((h, i) =>
                      i === hIdx
                        ? {
                            ...h,
                            media: nextMedia,
                            images: nextMedia.filter((m) => m.type === "image").map((m) => m.url),
                          }
                        : h,
                    ),
                  )
                }
                label="Galeria e Vídeos deste Hotel"
                allowVideos
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TravelPackageTransfersAndToursSection({ value, onChange }: SectionProps) {
  const transfers = Array.isArray(value.transfers) ? value.transfers : [];
  const tours = Array.isArray(value.tours) ? value.tours : [];
  const flights = Array.isArray(value.flights) ? value.flights : [];
  const boardingPoints = Array.isArray(value.boarding_points) ? value.boarding_points : [];

  return (
    <div className="space-y-6">
      {/* Trechos Aéreos Múltiplos */}
      <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/40">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <Plane className="size-4 text-primary" />
            <span>Trechos Aéreos Estruturados ({flights.length})</span>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onChange({
                ...value,
                flights: [
                  ...flights,
                  {
                    id: `pkg-fl-${Date.now()}`,
                    type: flights.length === 0 ? "outbound" : "return",
                    airline_name: value.flight_details?.airline_name || "",
                    origin_iata: value.flight_details?.departure_iata || "",
                    destination_iata: value.flight_details?.destination_iata || "",
                  },
                ],
              })
            }
            className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-4" />
            <span>Trecho</span>
          </Button>
        </div>
        {flights.map((fl: any, idx: number) => (
          <div key={fl.id || idx} className="grid grid-cols-1 sm:grid-cols-6 gap-2 p-3 rounded-lg bg-muted/30 border border-border">
            <Input
              placeholder="Cia Aérea"
              value={fl.airline_name || fl.airline || ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  flights: flights.map((x, i) => (i === idx ? { ...x, airline_name: e.target.value } : x)),
                })
              }
              className="h-11 text-xs rounded-lg"
            />
            <Input
              placeholder="Voo (ex: AD4210)"
              value={fl.flight_number || ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  flights: flights.map((x, i) => (i === idx ? { ...x, flight_number: e.target.value } : x)),
                })
              }
              className="h-11 text-xs rounded-lg font-mono"
            />
            <Input
              placeholder="Origem IATA"
              value={fl.origin_iata || ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  flights: flights.map((x, i) => (i === idx ? { ...x, origin_iata: e.target.value.toUpperCase() } : x)),
                })
              }
              className="h-11 text-xs rounded-lg font-mono uppercase"
            />
            <Input
              placeholder="Destino IATA"
              value={fl.destination_iata || ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  flights: flights.map((x, i) => (i === idx ? { ...x, destination_iata: e.target.value.toUpperCase() } : x)),
                })
              }
              className="h-11 text-xs rounded-lg font-mono uppercase"
            />
            <Input
              placeholder="Saída / Chegada"
              value={fl.departure_time || ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  flights: flights.map((x, i) => (i === idx ? { ...x, departure_time: e.target.value } : x)),
                })
              }
              className="h-11 text-xs rounded-lg font-mono"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => onChange({ ...value, flights: flights.filter((_, i) => i !== idx) })}
              aria-label="Remover trecho"
              className="h-11 min-h-11 rounded-lg text-destructive cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Traslados Nomeados */}
      <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/40">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <Car className="size-4 text-primary" />
            <span>Traslados & Receptivos ({transfers.length})</span>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onChange({
                ...value,
                transfers: [
                  ...transfers,
                  {
                    id: `pkg-tr-${Date.now()}`,
                    name: "",
                    kind: "round_trip",
                    vehicle: "Transfer Regular",
                    included: true,
                    price_cents: 0,
                  },
                ],
              })
            }
            className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-4" />
            <span>Traslado</span>
          </Button>
        </div>
        {transfers.map((tr: any, idx: number) => (
          <div key={tr.id || idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 rounded-lg bg-muted/30 border border-border">
            <Input
              placeholder="Rota ou nome do traslado"
              value={tr.name || tr.title || tr.route || ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  transfers: transfers.map((x, i) => (i === idx ? { ...x, name: e.target.value, title: e.target.value } : x)),
                })
              }
              className="h-11 text-xs rounded-lg sm:col-span-2"
            />
            <Input
              placeholder="Veículo (Ex: Van Privativa)"
              value={tr.vehicle || ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  transfers: transfers.map((x, i) => (i === idx ? { ...x, vehicle: e.target.value } : x)),
                })
              }
              className="h-11 text-xs rounded-lg"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => onChange({ ...value, transfers: transfers.filter((_, i) => i !== idx) })}
              aria-label="Remover traslado"
              className="h-11 min-h-11 rounded-lg text-destructive cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Passeios & Experiências */}
      <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/40">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <Compass className="size-4 text-primary" />
            <span>Passeios & Ingressos ({tours.length})</span>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onChange({
                ...value,
                tours: [
                  ...tours,
                  {
                    id: `pkg-tour-${Date.now()}`,
                    title: "",
                    description: "",
                    included: true,
                    media: [],
                  },
                ],
              })
            }
            className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-4" />
            <span>Passeio</span>
          </Button>
        </div>
        {tours.map((tour: any, idx: number) => (
          <div key={tour.id || idx} className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Nome do Passeio / Ingresso"
                value={tour.title || ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    tours: tours.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)),
                  })
                }
                className="h-11 text-xs rounded-lg flex-1"
              />
              <Input
                placeholder="Duração (ex: Meio dia)"
                value={tour.duration || ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    tours: tours.map((x, i) => (i === idx ? { ...x, duration: e.target.value } : x)),
                  })
                }
                className="h-11 text-xs rounded-lg w-36"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => onChange({ ...value, tours: tours.filter((_, i) => i !== idx) })}
                aria-label="Remover passeio"
                className="size-11 shrink-0 rounded-lg text-destructive cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <MediaGalleryField
              items={Array.isArray(tour.media) ? tour.media : []}
              onChange={(nextMedia) =>
                onChange({
                  ...value,
                  tours: tours.map((x, i) =>
                    i === idx
                      ? {
                          ...x,
                          media: nextMedia,
                          images: nextMedia.filter((m) => m.type === "image").map((m) => m.url),
                        }
                      : x,
                  ),
                })
              }
              label="Fotos e Vídeos do Passeio"
            />
          </div>
        ))}
      </div>

      {/* Pontos de Embarque Terrestres */}
      <div className="bg-card rounded-lg p-5 space-y-3 border border-border/70">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/40">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <MapPin className="size-4 text-primary" />
            <span>Pontos de Embarque ({boardingPoints.length})</span>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onChange({
                ...value,
                boarding_points: [...boardingPoints, { city: "", time: "06:00", location: "" }],
              })
            }
            className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-4" />
            <span>Embarque</span>
          </Button>
        </div>
        {boardingPoints.map((bp: any, idx: number) => {
          const obj = typeof bp === "string" ? { city: bp, time: "", location: "" } : bp;
          return (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <Input
                placeholder="Cidade"
                value={obj.city || ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    boarding_points: boardingPoints.map((x, i) =>
                      i === idx ? { ...(typeof x === "string" ? { city: x } : x), city: e.target.value } : x,
                    ),
                  })
                }
                className="h-11 text-xs rounded-lg"
              />
              <Input
                placeholder="Horário"
                value={obj.time || ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    boarding_points: boardingPoints.map((x, i) =>
                      i === idx ? { ...(typeof x === "string" ? { city: x } : x), time: e.target.value } : x,
                    ),
                  })
                }
                className="h-11 text-xs rounded-lg"
              />
              <Input
                placeholder="Local"
                value={obj.location || ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    boarding_points: boardingPoints.map((x, i) =>
                      i === idx ? { ...(typeof x === "string" ? { city: x } : x), location: e.target.value } : x,
                    ),
                  })
                }
                className="h-11 text-xs rounded-lg"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  onChange({ ...value, boarding_points: boardingPoints.filter((_, i) => i !== idx) })
                }
                aria-label="Remover embarque"
                className="h-11 min-h-11 rounded-lg text-destructive cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TravelPackageCruisesSection({ value, onChange }: SectionProps) {
  const cruises: CruiseDTO[] = Array.isArray(value.cruises) ? (value.cruises as CruiseDTO[]) : [];

  const setCruises = (nextCruises: CruiseDTO[]) => {
    const first = nextCruises[0];
    onChange({
      ...value,
      cruises: nextCruises,
      ...(first
        ? {
            flight_details: {
              ...value.flight_details,
              cruise_line: first.company || value.flight_details?.cruise_line,
              ship_name: first.ship_name || value.flight_details?.ship_name,
              cabin_category: first.cabin_category || value.flight_details?.cabin_category,
              embarkation_port: first.departure_port || value.flight_details?.embarkation_port,
              disembarkation_port: first.arrival_port || value.flight_details?.disembarkation_port,
            },
          }
        : {}),
    });
  };

  const handleAddCruise = (preset?: Partial<CruiseDTO>) => {
    const newCruise: CruiseDTO = {
      id: `pkg-cruise-${Date.now()}`,
      ship_name: preset?.ship_name || "",
      company: preset?.company || "MSC Cruzeiros",
      cabin_category: preset?.cabin_category || "Cabine Externa com Varanda",
      departure_port: preset?.departure_port || "Porto de Santos",
      arrival_port: preset?.arrival_port || "Porto de Santos",
      duration_nights: preset?.duration_nights || 7,
      board_basis: preset?.board_basis || "Pensão Completa",
      route_summary: preset?.route_summary || "",
      notes: preset?.notes || "",
      itinerary: preset?.itinerary || [
        { day: 1, day_number: 1, port: "Santos (SP)", activity_type: "boarding", departure_time: "18:00" },
        { day: 2, day_number: 2, port: "Em navegação", activity_type: "sea" },
        { day: 3, day_number: 3, port: "Búzios (RJ)", activity_type: "dock", arrival_time: "08:00", departure_time: "18:00" },
        { day: 4, day_number: 4, port: "Santos (SP)", activity_type: "disembark", arrival_time: "07:00" },
      ],
    };
    setCruises([...cruises, newCruise]);
  };

  const handleUpdateCruise = (idx: number, patch: Partial<CruiseDTO>) => {
    setCruises(cruises.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const handleRemoveCruise = (idx: number) => {
    setCruises(cruises.filter((_, i) => i !== idx));
  };

  const handleDuplicateCruise = (idx: number) => {
    const src = cruises[idx];
    if (!src) return;
    const clone: CruiseDTO = {
      ...src,
      id: `pkg-cruise-${Date.now()}`,
      ship_name: `${src.ship_name} (Cópia)`,
    };
    setCruises([...cruises, clone]);
  };

  const handleAddCruiseDay = (cruiseIdx: number) => {
    const cruise = cruises[cruiseIdx];
    if (!cruise) return;
    const currentItin = Array.isArray(cruise.itinerary) ? cruise.itinerary : [];
    const nextDayNum = currentItin.length + 1;
    const newDay: CruiseItineraryDayDTO = {
      day: nextDayNum,
      day_number: nextDayNum,
      port: "Em navegação",
      activity_type: "sea",
    };
    handleUpdateCruise(cruiseIdx, { itinerary: [...currentItin, newDay] });
  };

  const handleUpdateCruiseDay = (
    cruiseIdx: number,
    dayIdx: number,
    patch: Partial<CruiseItineraryDayDTO>,
  ) => {
    const cruise = cruises[cruiseIdx];
    if (!cruise) return;
    const nextItin = (cruise.itinerary || []).map((d, i) =>
      i === dayIdx ? { ...d, ...patch } : d,
    );
    handleUpdateCruise(cruiseIdx, { itinerary: nextItin });
  };

  const handleRemoveCruiseDay = (cruiseIdx: number, dayIdx: number) => {
    const cruise = cruises[cruiseIdx];
    if (!cruise) return;
    const filtered = (cruise.itinerary || []).filter((_, i) => i !== dayIdx);
    const renumbered = filtered.map((d, i) => ({ ...d, day: i + 1, day_number: i + 1 }));
    handleUpdateCruise(cruiseIdx, { itinerary: renumbered });
  };

  return (
    <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <Ship className="size-4 text-primary" />
          <span>Cruzeiros Marítimos & Itinerários Náuticos ({cruises.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleAddCruise()}
            className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-4" />
            <span>Cruzeiro</span>
          </Button>
        </div>
      </div>

      {cruises.length === 0 ? (
        <div className="p-4 rounded-xl bg-muted/20 border border-dashed border-border text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Nenhum cruzeiro estruturado adicionado ainda. Adicione os navios, portos e o mapa geodésico da costa.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                handleAddCruise({
                  ship_name: "MSC Grandiosa",
                  company: "MSC Cruzeiros",
                  departure_port: "Porto de Santos",
                  arrival_port: "Porto de Santos",
                  duration_nights: 7,
                  itinerary: [
                    { day: 1, day_number: 1, port: "Santos (SP)", activity_type: "boarding", departure_time: "18:00" },
                    { day: 2, day_number: 2, port: "Búzios (RJ)", activity_type: "dock", arrival_time: "07:00", departure_time: "16:00" },
                    { day: 3, day_number: 3, port: "Salvador (BA)", activity_type: "dock", arrival_time: "17:00", departure_time: "23:59" },
                    { day: 4, day_number: 4, port: "Ilhéus (BA)", activity_type: "dock", arrival_time: "08:00", departure_time: "18:00" },
                    { day: 5, day_number: 5, port: "Em navegação", activity_type: "sea" },
                    { day: 6, day_number: 6, port: "Santos (SP)", activity_type: "disembark", arrival_time: "08:00" },
                  ],
                })
              }
              className="h-11 min-h-11 px-3 text-xs font-medium cursor-pointer"
            >
              Preset MSC Grandiosa (7 Noites)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                handleAddCruise({
                  ship_name: "Costa Diadema",
                  company: "Costa Cruzeiros",
                  departure_port: "Porto de Santos",
                  arrival_port: "Porto de Santos",
                  duration_nights: 7,
                  itinerary: [
                    { day: 1, day_number: 1, port: "Santos (SP)", activity_type: "boarding", departure_time: "18:00" },
                    { day: 2, day_number: 2, port: "Em navegação", activity_type: "sea" },
                    { day: 3, day_number: 3, port: "Ilhéus (BA)", activity_type: "dock", arrival_time: "08:00", departure_time: "17:00" },
                    { day: 4, day_number: 4, port: "Salvador (BA)", activity_type: "dock", arrival_time: "08:00", departure_time: "17:00" },
                    { day: 5, day_number: 5, port: "Em navegação", activity_type: "sea" },
                    { day: 6, day_number: 6, port: "Santos (SP)", activity_type: "disembark", arrival_time: "08:00" },
                  ],
                })
              }
              className="h-11 min-h-11 px-3 text-xs font-medium cursor-pointer"
            >
              Preset Costa Diadema (7 Noites)
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {cruises.map((cr, idx) => (
            <div key={cr.id || idx} className="p-5 rounded-2xl bg-muted/20 border border-border space-y-4">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-primary/10 text-primary">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {cr.ship_name || "Navio de Cruzeiro"} — {cr.company || "Armadora"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDuplicateCruise(idx)}
                    aria-label="Duplicar cruzeiro"
                    className="size-11 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Copy className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRemoveCruise(idx)}
                    aria-label="Remover cruzeiro"
                    className="size-11 rounded-lg text-destructive cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Mapa Náutico em SVG */}
              {Array.isArray(cr.itinerary) && cr.itinerary.length > 0 && (
                <CruiseRouteSvgMap
                  itinerary={cr.itinerary}
                  shipName={cr.ship_name}
                  tone="light"
                  className="w-full"
                />
              )}

              {/* Dados Principais do Navio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Nome do Navio</Label>
                  <Input
                    placeholder="Ex: MSC Grandiosa"
                    value={cr.ship_name || ""}
                    onChange={(e) => handleUpdateCruise(idx, { ship_name: e.target.value })}
                    className="h-11 text-xs rounded-lg bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Companhia / Armadora</Label>
                  <Input
                    placeholder="Ex: MSC Cruzeiros"
                    value={cr.company || ""}
                    onChange={(e) => handleUpdateCruise(idx, { company: e.target.value })}
                    className="h-11 text-xs rounded-lg bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Categoria da Cabine</Label>
                  <Input
                    placeholder="Ex: Externa com Varanda"
                    value={cr.cabin_category || ""}
                    onChange={(e) => handleUpdateCruise(idx, { cabin_category: e.target.value })}
                    className="h-11 text-xs rounded-lg bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Regime a Bordo</Label>
                  <Input
                    placeholder="Ex: Pensão Completa"
                    value={cr.board_basis || ""}
                    onChange={(e) => handleUpdateCruise(idx, { board_basis: e.target.value })}
                    className="h-11 text-xs rounded-lg bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Porto de Embarque</Label>
                  <Input
                    placeholder="Ex: Porto de Santos"
                    value={cr.departure_port || ""}
                    onChange={(e) => handleUpdateCruise(idx, { departure_port: e.target.value })}
                    className="h-11 text-xs rounded-lg bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Porto de Desembarque</Label>
                  <Input
                    placeholder="Ex: Porto de Santos"
                    value={cr.arrival_port || ""}
                    onChange={(e) => handleUpdateCruise(idx, { arrival_port: e.target.value })}
                    className="h-11 text-xs rounded-lg bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Data de Embarque</Label>
                  <Input
                    type="date"
                    value={cr.departure_date || ""}
                    onChange={(e) => handleUpdateCruise(idx, { departure_date: e.target.value })}
                    className="h-11 text-xs rounded-lg bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Data de Retorno</Label>
                  <Input
                    type="date"
                    value={cr.return_date || ""}
                    onChange={(e) => handleUpdateCruise(idx, { return_date: e.target.value })}
                    className="h-11 text-xs rounded-lg bg-background"
                  />
                </div>
              </div>

              {/* Itinerário Dia a Dia de Portos */}
              <div className="space-y-3 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Anchor className="size-3.5 text-primary" />
                    <span>Escalas e Itinerário Porto a Porto ({cr.itinerary?.length || 0} dias)</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddCruiseDay(idx)}
                    className="h-11 min-h-11 px-3 text-xs font-semibold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Plus className="size-3.5" />
                    <span>Escala</span>
                  </Button>
                </div>

                <div className="space-y-2">
                  {(cr.itinerary || []).map((day, dIdx) => (
                    <div
                      key={dIdx}
                      className="p-3 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center gap-2"
                    >
                      <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-muted text-foreground shrink-0">
                        Dia {day.day || day.day_number || dIdx + 1}
                      </span>
                      <Input
                        placeholder="Porto / Escala (Ex: Santos, Búzios, Em navegação)"
                        value={day.port || ""}
                        onChange={(e) => handleUpdateCruiseDay(idx, dIdx, { port: e.target.value })}
                        className="h-11 text-xs rounded-lg bg-background flex-1"
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          placeholder="Chegada"
                          value={day.arrival_time || ""}
                          onChange={(e) => handleUpdateCruiseDay(idx, dIdx, { arrival_time: e.target.value })}
                          className="h-11 text-xs rounded-lg bg-background w-24 font-mono"
                          title="Horário de Chegada"
                        />
                        <Input
                          type="time"
                          placeholder="Partida"
                          value={day.departure_time || ""}
                          onChange={(e) => handleUpdateCruiseDay(idx, dIdx, { departure_time: e.target.value })}
                          className="h-11 text-xs rounded-lg bg-background w-24 font-mono"
                          title="Horário de Partida"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleRemoveCruiseDay(idx, dIdx)}
                          aria-label="Remover dia"
                          className="size-11 shrink-0 rounded-lg text-destructive cursor-pointer hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TravelPackageWebPageSection({
  value,
  onChange,
  productTitle,
  priceCents,
  storeName,
  storePhone,
}: SectionProps) {
  const previewProposal = useMemo(
    () =>
      blueprintToTravelProposalDTO(
        blueprintFromPackage(value, {
          title: productTitle,
          priceCents: priceCents || 0,
          agencyName: storeName || null,
          agencyPhone: storePhone || null,
        }),
      ),
    [value, productTitle, priceCents, storeName, storePhone],
  );

  return (
    <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
          <Globe className="size-4" />
          <span>Página Web Editorial Sincronizada</span>
        </div>
      </div>
      <Label className="text-xs text-muted-foreground block">
        Configure os blocos, hero, vídeos e galeria exibidos ao cliente na página do pacote e herdados automaticamente ao gerar orçamentos/propostas.
      </Label>
      <ProposalWebPageBuilder
        proposal={previewProposal}
        onChange={(patch) => {
          if (patch.web_page !== undefined) {
            onChange({ ...value, web_page_config: patch.web_page || null });
          }
        }}
        onSaveOverride={async (cfg: ProposalWebPageDTO) => {
          onChange({ ...value, web_page_config: cfg });
        }}
      />
    </div>
  );
}
