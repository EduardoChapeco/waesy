import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  Building2,
  CarFront,
  CheckCircle2,
  Compass,
  Database,
  KeyRound,
  Loader2,
  Package,
  Plane,
  Plus,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { AirportCombobox } from "@/components/ui/airport-combobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  searchPassHubLiveQuoteFn,
  type PassHubActivityResultItem,
  type PassHubCarResultItem,
  type PassHubFlightResultItem,
  type PassHubHotelResultItem,
  type PassHubLiveQuoteResponseDTO,
  type PassHubPackageResultItem,
  type PassHubSearchCategory,
  type PassHubTransferResultItem,
} from "@/services/travel-gds-workbench.functions";
import type {
  FlightSegmentDTO,
  HotelDTO,
  TourOptionDTO,
  TransferDTO,
} from "@/services/travel-proposal.functions";
import { cn } from "@/lib/utils";

export interface PassHubLiveQuoterPanelProps {
  initialOriginIata?: string;
  initialDestinationIata?: string;
  initialDestinationCity?: string;
  initialDepartureDate?: string;
  initialReturnDate?: string;
  initialRooms?: Array<{ adults: number; childrenAges: number[] }>;
  defaultCategories?: PassHubSearchCategory[];
  compact?: boolean;
  onAddFlight?: (
    flight: FlightSegmentDTO,
    meta: { priceCents: number; providerCode: string; quoteSessionId: string },
  ) => void;
  onAddHotel?: (
    hotel: HotelDTO,
    meta: { priceCents: number; providerCode: string; quoteSessionId: string },
  ) => void;
  onAddTransfer?: (
    transfer: TransferDTO,
    meta: { priceCents: number; providerCode: string; quoteSessionId: string },
  ) => void;
  onAddTour?: (
    tour: TourOptionDTO,
    meta: { priceCents: number; providerCode: string; quoteSessionId: string },
  ) => void;
  onImportPackage?: (
    pkg: PassHubPackageResultItem,
    meta: { quoteSessionId: string },
  ) => void;
  onAddCar?: (
    car: PassHubCarResultItem,
    meta: { quoteSessionId: string },
  ) => void;
  onAddComparativeOption?: (optionPayload: {
    optionLabel: string;
    hotelName: string;
    airlineDesc: string;
    operatorSlug: string;
    totalPriceCents: number;
    hotel?: HotelDTO;
    flight?: FlightSegmentDTO;
    quoteSessionId: string;
  }) => void;
}

const CATEGORY_OPTIONS: Array<{
  id: PassHubSearchCategory;
  label: string;
}> = [
  { id: "packages", label: "Pacotes" },
  { id: "flights", label: "Voos" },
  { id: "hotels", label: "Hotéis" },
  { id: "transfers", label: "Transfers" },
  { id: "activities", label: "Passeios" },
  { id: "cars", label: "Carros" },
];

function formatBrlFromCents(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) return "Sob consulta";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function PassHubLiveQuoterPanel({
  initialOriginIata = "",
  initialDestinationIata = "",
  initialDestinationCity = "",
  initialDepartureDate = "",
  initialReturnDate = "",
  initialRooms = [{ adults: 2, childrenAges: [] }],
  defaultCategories = ["packages", "flights", "hotels", "transfers", "activities"],
  compact = false,
  onAddFlight,
  onAddHotel,
  onAddTransfer,
  onAddTour,
  onImportPackage,
  onAddCar,
  onAddComparativeOption,
}: PassHubLiveQuoterPanelProps) {
  const [originIata, setOriginIata] = useState(initialOriginIata);
  const [destinationIata, setDestinationIata] = useState(initialDestinationIata);
  const [destinationCity, setDestinationCity] = useState(initialDestinationCity);
  const [departureDate, setDepartureDate] = useState(
    initialDepartureDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  );
  const [returnDate, setReturnDate] = useState(
    initialReturnDate || new Date(Date.now() + 37 * 86400000).toISOString().slice(0, 10),
  );
  const [rooms, setRooms] = useState<Array<{ adults: number; childrenAges: number[] }>>(
    initialRooms.length > 0 ? initialRooms : [{ adults: 2, childrenAges: [] }],
  );
  const [categories, setCategories] = useState<PassHubSearchCategory[]>(defaultCategories);
  const [includeOwnDbCatalog, setIncludeOwnDbCatalog] = useState(true);
  const [cabinClass, setCabinClass] = useState<"economy" | "premium_economy" | "business" | "first">("economy");

  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [result, setResult] = useState<PassHubLiveQuoteResponseDTO | null>(null);
  const [activeTab, setActiveTab] = useState<PassHubSearchCategory>(defaultCategories[0] || "packages");
  const [addedKeys, setAddedKeys] = useState<Record<string, boolean>>({});

  const toggleCategory = (cat: PassHubSearchCategory) => {
    setCategories((prev) => {
      if (prev.includes(cat)) {
        return prev.length > 1 ? prev.filter((c) => c !== cat) : prev;
      }
      return [...prev, cat];
    });
  };

  const handleUpdateRoomAdults = (roomIdx: number, adults: number) => {
    setRooms((prev) =>
      prev.map((r, i) => (i === roomIdx ? { ...r, adults: Math.max(1, Math.min(9, adults)) } : r)),
    );
  };

  const handleUpdateRoomChildren = (roomIdx: number, count: number) => {
    const safeCount = Math.max(0, Math.min(6, count));
    setRooms((prev) =>
      prev.map((r, i) => {
        if (i !== roomIdx) return r;
        const ages = [...r.childrenAges];
        while (ages.length < safeCount) ages.push(6);
        return { ...r, childrenAges: ages.slice(0, safeCount) };
      }),
    );
  };

  const handleSearch = async () => {
    const cityTarget = (destinationCity || destinationIata).trim();
    if (cityTarget.length < 2) {
      setSearchError("Informe o destino ou aeroporto de destino antes de cotar.");
      return;
    }
    if (!departureDate) {
      setSearchError("Informe a data de ida ou check-in.");
      return;
    }

    setSearchError(null);
    setIsSearching(true);
    try {
      const response = await searchPassHubLiveQuoteFn({
        data: {
          originIata: originIata.trim().toUpperCase(),
          destinationIata: destinationIata.trim().toUpperCase(),
          destinationCity: cityTarget,
          departureDate,
          returnDate: returnDate || "",
          rooms,
          categories,
          cabinClass,
          includeOwnDbCatalog,
        },
      });
      setResult(response);
      if (response.packages.length > 0 && categories.includes("packages")) setActiveTab("packages");
      else if (response.flights.length > 0 && categories.includes("flights")) setActiveTab("flights");
      else if (response.hotels.length > 0 && categories.includes("hotels")) setActiveTab("hotels");
      else if (response.transfers.length > 0 && categories.includes("transfers")) setActiveTab("transfers");
      else if (response.activities.length > 0 && categories.includes("activities")) setActiveTab("activities");
      else if (response.cars.length > 0 && categories.includes("cars")) setActiveTab("cars");
    } catch (err: any) {
      setSearchError(err?.message || "Erro ao consultar APIs de viagem.");
    } finally {
      setIsSearching(false);
    }
  };

  const markAdded = (key: string) => {
    setAddedKeys((prev) => ({ ...prev, [key]: true }));
  };

  const mapFlightToDto = (f: PassHubFlightResultItem): FlightSegmentDTO => ({
    id: f.id,
    type: "outbound",
    leg: "ida",
    airline: f.airline,
    airline_name: f.airline,
    airline_code: f.airlineCode,
    flight_number: f.flightNumber,
    origin: f.originIata,
    origin_iata: f.originIata,
    destination: f.destinationIata,
    destination_iata: f.destinationIata,
    departure_date: f.departureDate,
    departure_time: f.departureTime,
    arrival_time: f.arrivalTime,
    cabin_class: f.cabinClass,
    baggage: f.baggageSummary,
    stops_count: f.stopsCount,
    price_cents: f.sellingCents,
  });

  const mapHotelToDto = (h: PassHubHotelResultItem): HotelDTO => ({
    id: h.id,
    hotel_name: h.hotelName,
    destination: h.city,
    checkin_date: h.checkinDate,
    checkout_date: h.checkoutDate,
    nights_count: h.nightsCount,
    room_type: h.roomType,
    board_basis: h.boardBasis,
    stars: h.stars,
    featured_image_url: h.imageUrl || undefined,
    image_url: h.imageUrl || undefined,
    amenities: h.amenities,
    price_cents: h.totalPriceCents,
  });

  const mapTransferToDto = (tr: PassHubTransferResultItem): TransferDTO => ({
    id: tr.id,
    type: tr.isPrivate ? "Privativo" : "Regular",
    vehicle: tr.vehicleType || "Veículo Executivo",
    vehicle_type: tr.vehicleType,
    route: tr.route,
    route_name: tr.title,
    is_private: tr.isPrivate,
    price_cents: tr.priceCents,
    date: tr.date,
    notes: tr.title,
  });

  const mapActivityToDto = (act: PassHubActivityResultItem): TourOptionDTO => ({
    id: act.id,
    title: act.title,
    description: act.description,
    duration: act.duration,
    price_cents: act.priceCents,
    image_url: act.imageUrl || undefined,
    included: act.included,
    is_included: act.included,
  });

  const quoteSessionId = result?.quoteSessionId || "";

  return (
    <div className={cn("space-y-4", compact ? "text-xs" : "text-sm")}>
      {/* Formulário PassHub Multi-API */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary shrink-0" />
            <h3 className="font-bold text-foreground">
              Cotação ao Vivo Multi-API (PassHub)
            </h3>
          </div>
          <Link
            to="/workspace/configuracoes/integracoes"
            className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline min-h-11 sm:min-h-0 px-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <KeyRound className="size-3.5" />
            <span>Credenciais GDS</span>
          </Link>
        </div>

        <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3")}>
          <AirportCombobox
            label="Aeroporto Origem (IATA)"
            value={originIata}
            onChange={(iata) => setOriginIata(iata)}
            placeholder="Ex: GRU, GIG, FLN..."
          />
          <AirportCombobox
            label="Aeroporto Destino (IATA)"
            value={destinationIata}
            onChange={(iata, airport) => {
              setDestinationIata(iata);
              if (airport?.city && !destinationCity.trim()) {
                setDestinationCity(airport.city);
              }
            }}
            placeholder="Ex: MCO, NAT, SSA..."
          />
          <div className="space-y-2">
            <Label htmlFor="passhub-dest-city" className="text-xs font-medium text-foreground">
              Cidade / Destino para Hotéis & Passeios
            </Label>
            <Input
              id="passhub-dest-city"
              value={destinationCity}
              onChange={(e) => setDestinationCity(e.target.value)}
              placeholder="Ex: Maceió, Orlando, Gramado"
              className="h-11 bg-background"
            />
          </div>
        </div>

        <div className={cn("grid gap-3", compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4")}>
          <div className="space-y-2">
            <Label htmlFor="passhub-departure" className="text-xs font-medium text-foreground">
              Ida / Check-in
            </Label>
            <Input
              id="passhub-departure"
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="h-11 bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="passhub-return" className="text-xs font-medium text-foreground">
              Volta / Check-out
            </Label>
            <Input
              id="passhub-return"
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="h-11 bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Cabine Aérea</Label>
            <select
              value={cabinClass}
              onChange={(e) => setCabinClass(e.target.value as any)}
              className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="economy">Econômica</option>
              <option value="premium_economy">Premium Economy</option>
              <option value="business">Executiva</option>
              <option value="first">Primeira Classe</option>
            </select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                <Users className="size-3.5" /> Quartos ({rooms.length})
              </Label>
              <button
                type="button"
                onClick={() => setRooms((prev) => (prev.length < 4 ? [...prev, { adults: 2, childrenAges: [] }] : prev))}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer min-h-11 sm:min-h-0 px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                + Quarto
              </button>
            </div>
            <div className="flex items-center gap-2 h-11 px-3 rounded-md border border-input bg-background text-xs">
              <span className="font-semibold text-foreground shrink-0">Q1:</span>
              <select
                aria-label="Adultos Quarto 1"
                value={rooms[0]?.adults ?? 2}
                onChange={(e) => handleUpdateRoomAdults(0, Number(e.target.value))}
                className="bg-transparent text-foreground font-medium focus:outline-none"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} ADT
                  </option>
                ))}
              </select>
              <select
                aria-label="Crianças Quarto 1"
                value={rooms[0]?.childrenAges.length ?? 0}
                onChange={(e) => handleUpdateRoomChildren(0, Number(e.target.value))}
                className="bg-transparent text-muted-foreground font-medium focus:outline-none"
              >
                {[0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} CHD
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {rooms.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {rooms.slice(1).map((rm, idx) => {
              const realIdx = idx + 1;
              return (
                <div
                  key={realIdx}
                  className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs"
                >
                  <span className="font-bold">Quarto {realIdx + 1}:</span>
                  <select
                    value={rm.adults}
                    onChange={(e) => handleUpdateRoomAdults(realIdx, Number(e.target.value))}
                    className="bg-transparent font-medium"
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n} ADT
                      </option>
                    ))}
                  </select>
                  <select
                    value={rm.childrenAges.length}
                    onChange={(e) => handleUpdateRoomChildren(realIdx, Number(e.target.value))}
                    className="bg-transparent font-medium"
                  >
                    {[0, 1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {n} CHD
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setRooms((prev) => prev.filter((_, i) => i !== realIdx))}
                    className="text-destructive font-semibold hover:underline cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Remover
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Filtro de Categorias + Catálogo Próprio */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORY_OPTIONS.map((cat) => {
              const active = categories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={cn(
                    "min-h-11 sm:min-h-9 px-3 rounded-lg text-xs font-semibold border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:text-foreground",
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setIncludeOwnDbCatalog((v) => !v)}
              className={cn(
                "min-h-11 sm:min-h-9 px-3 rounded-lg text-xs font-semibold border inline-flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                includeOwnDbCatalog
                  ? "bg-secondary text-secondary-foreground border-border"
                  : "bg-background text-muted-foreground border-border",
              )}
            >
              <Database className="size-3.5" />
              <span>Catálogo Próprio (BD)</span>
            </button>
          </div>

          <Button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="h-11 min-h-11 px-5 gap-2 font-bold"
          >
            {isSearching ? (
              <>
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                <span>Consultando APIs...</span>
              </>
            ) : (
              <>
                <Search className="size-4" />
                <span>Buscar Disponibilidade Real</span>
              </>
            )}
          </Button>
        </div>

        {searchError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* Skeleton de Carregamento */}
      {isSearching && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        </div>
      )}

      {/* Telemetria Honesta das APIs + Aviso se nenhuma credencial externa estiver ativa */}
      {result && !isSearching && (
        <div className="space-y-4">
          {!result.isAnyApiConfigured && (
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1 text-xs">
                <p className="font-bold text-foreground">
                  Nenhuma API GDS/Operadora configurada nesta agência
                </p>
                <p className="text-muted-foreground">
                  Exibindo apenas registros reais do banco de dados da agência. Conecte Wooba Travellink ou InfoTravel (Orinter, FRT, Incomum, Cativa, BeFly, Confiança) para cotar tarifas online em tempo real.
                </p>
              </div>
              <Button asChild variant="outline" className="h-11 shrink-0 font-semibold">
                <Link to="/workspace/configuracoes/integracoes">Configurar Credenciais</Link>
              </Button>
            </div>
          )}

          {result.providerStatuses.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {result.providerStatuses.map((st, idx) => (
                <div
                  key={`${st.providerCode}-${st.category}-${idx}`}
                  title={st.message}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-1 rounded-md border text-xs font-medium",
                    st.status === "ok"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                      : st.status === "error"
                        ? "bg-destructive/10 border-destructive/30 text-destructive"
                        : "bg-muted border-border text-muted-foreground",
                  )}
                >
                  {st.status === "ok" ? (
                    <CheckCircle2 className="size-3.5 shrink-0" />
                  ) : st.status === "error" ? (
                    <AlertCircle className="size-3.5 shrink-0" />
                  ) : null}
                  <span>{st.displayName}:</span>
                  <strong>{st.count}</strong>
                  {st.latencyMs > 0 && <span className="opacity-70">({st.latencyMs}ms)</span>}
                </div>
              ))}
            </div>
          )}

          {result.providerStatuses.some((s) => s.status === "error" && s.message) && (
            <div className="space-y-1">
              {result.providerStatuses
                .filter((s) => s.status === "error" && s.message)
                .map((s, idx) => (
                  <p key={idx} className="text-xs text-destructive">
                    • {s.displayName}: {s.message}
                  </p>
                ))}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PassHubSearchCategory)}>
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1">
              <TabsTrigger value="packages" className="min-h-10 gap-2">
                <Package className="size-3.5" /> Pacotes ({result.packages.length})
              </TabsTrigger>
              <TabsTrigger value="flights" className="min-h-10 gap-2">
                <Plane className="size-3.5" /> Voos ({result.flights.length})
              </TabsTrigger>
              <TabsTrigger value="hotels" className="min-h-10 gap-2">
                <Building2 className="size-3.5" /> Hotéis ({result.hotels.length})
              </TabsTrigger>
              <TabsTrigger value="transfers" className="min-h-10 gap-2">
                <CarFront className="size-3.5" /> Transfers ({result.transfers.length})
              </TabsTrigger>
              <TabsTrigger value="activities" className="min-h-10 gap-2">
                <Compass className="size-3.5" /> Passeios ({result.activities.length})
              </TabsTrigger>
              <TabsTrigger value="cars" className="min-h-10 gap-2">
                <CarFront className="size-3.5" /> Carros ({result.cars.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="packages" className="pt-3 space-y-3">
              {result.packages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  Nenhum pacote retornado para esta busca. Tente ajustar datas, operadoras ativas ou buscar os componentes (Voos + Hotéis) separadamente.
                </div>
              ) : (
                <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
                  {result.packages.map((pkg) => {
                    const isAdded = Boolean(addedKeys[`pkg:${pkg.id}`]);
                    return (
                      <div key={pkg.id} className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <Badge variant="secondary" className="text-xs uppercase">
                                  {pkg.source === "api_live" ? pkg.operatorSlug : "Banco da Agência"}
                                </Badge>
                                {pkg.nights > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {pkg.nights} noites
                                  </Badge>
                                )}
                              </div>
                              <h4 className="font-bold text-foreground leading-snug">{pkg.packageName}</h4>
                              {pkg.hotelName && (
                                <p className="text-xs text-muted-foreground">{pkg.hotelName} {pkg.boardType ? `· ${pkg.boardType}` : ""}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono font-bold text-base text-primary block">
                                {formatBrlFromCents(pkg.priceTotalCents)}
                              </span>
                            </div>
                          </div>
                          {pkg.includedItems.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {pkg.includedItems.map((inc, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs font-normal">
                                  {inc}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
                          {onImportPackage && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                onImportPackage(pkg, { quoteSessionId });
                                markAdded(`pkg:${pkg.id}`);
                              }}
                              className="h-11 sm:h-10 gap-2 flex-1 font-semibold"
                            >
                              <Plus className="size-3.5" />
                              <span>{isAdded ? "Importado" : "Aplicar no Pacote"}</span>
                            </Button>
                          )}
                          {onAddComparativeOption && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                onAddComparativeOption({
                                  optionLabel: pkg.packageName,
                                  hotelName: pkg.hotelName || "",
                                  airlineDesc: pkg.includesFlight ? "Aéreo incluso" : "",
                                  operatorSlug: pkg.operatorSlug,
                                  totalPriceCents: pkg.priceTotalCents,
                                  quoteSessionId,
                                });
                                markAdded(`opt-pkg:${pkg.id}`);
                              }}
                              className="h-11 sm:h-10 gap-2 font-semibold"
                            >
                              <span>+ Opção Comparativa</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="flights" className="pt-3 space-y-3">
              {result.flights.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  Nenhum voo retornado pelas APIs para {originIata || "?"} → {destinationIata || "?"}. Verifique os códigos IATA e credenciais Wooba/InfoTravel.
                </div>
              ) : (
                <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
                  {result.flights.map((flt) => {
                    const isAdded = Boolean(addedKeys[`flt:${flt.id}`]);
                    return (
                      <div key={flt.id} className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="text-xs uppercase">{flt.providerCode}</Badge>
                              <span className="font-mono text-xs font-semibold text-muted-foreground">
                                {flt.airline} · {flt.flightNumber}
                              </span>
                            </div>
                            <p className="font-bold text-foreground">
                              {flt.originIata} → {flt.destinationIata}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {flt.departureTime ? `${flt.departureTime} - ${flt.arrivalTime}` : flt.departureDate}
                              {flt.stopsCount > 0 ? ` · ${flt.stopsCount} escala(s)` : " · Direto"}
                              {flt.baggageSummary ? ` · ${flt.baggageSummary}` : ""}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-bold text-base text-primary block">
                              {formatBrlFromCents(flt.sellingCents)}
                            </span>
                            {flt.netCents > 0 && flt.netCents !== flt.sellingCents && (
                              <span className="text-xs text-muted-foreground font-mono">
                                Net {formatBrlFromCents(flt.netCents)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
                          {onAddFlight && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                onAddFlight(mapFlightToDto(flt), {
                                  priceCents: flt.sellingCents,
                                  providerCode: flt.providerCode,
                                  quoteSessionId,
                                });
                                markAdded(`flt:${flt.id}`);
                              }}
                              className="h-11 sm:h-10 gap-2 flex-1 font-semibold"
                            >
                              <Plus className="size-3.5" />
                              <span>{isAdded ? "Voo Adicionado" : "Adicionar Voo"}</span>
                            </Button>
                          )}
                          {onAddComparativeOption && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                onAddComparativeOption({
                                  optionLabel: `Aéreo ${flt.airline} (${flt.originIata}-${flt.destinationIata})`,
                                  hotelName: "",
                                  airlineDesc: `${flt.airline} ${flt.flightNumber}`,
                                  operatorSlug: flt.providerCode,
                                  totalPriceCents: flt.sellingCents,
                                  flight: mapFlightToDto(flt),
                                  quoteSessionId,
                                });
                              }}
                              className="h-11 sm:h-10 font-semibold"
                            >
                              + Opção
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="hotels" className="pt-3 space-y-3">
              {result.hotels.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  Nenhuma hospedagem retornada para {destinationCity || destinationIata}.
                </div>
              ) : (
                <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
                  {result.hotels.map((htl) => {
                    const isAdded = Boolean(addedKeys[`htl:${htl.id}`]);
                    return (
                      <div key={htl.id} className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="text-xs uppercase">
                                {htl.source === "api_live" ? htl.providerCode : "Catálogo Real"}
                              </Badge>
                              {htl.stars && <Badge variant="outline" className="text-xs">{htl.stars} Estrelas</Badge>}
                            </div>
                            <h4 className="font-bold text-foreground">{htl.hotelName}</h4>
                            <p className="text-xs text-muted-foreground">
                              {htl.city}
                              {htl.boardBasis ? ` · ${htl.boardBasis}` : ""}
                              {htl.roomType ? ` · ${htl.roomType}` : ""}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-bold text-base text-primary block">
                              {formatBrlFromCents(htl.totalPriceCents)}
                            </span>
                            {htl.pricePerNightCents > 0 && (
                              <span className="text-xs text-muted-foreground font-mono">
                                {formatBrlFromCents(htl.pricePerNightCents)}/noite
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
                          {onAddHotel && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                onAddHotel(mapHotelToDto(htl), {
                                  priceCents: htl.totalPriceCents,
                                  providerCode: htl.providerCode,
                                  quoteSessionId,
                                });
                                markAdded(`htl:${htl.id}`);
                              }}
                              className="h-11 sm:h-10 gap-2 flex-1 font-semibold"
                            >
                              <Plus className="size-3.5" />
                              <span>{isAdded ? "Hotel Adicionado" : "Adicionar Hotel"}</span>
                            </Button>
                          )}
                          {onAddComparativeOption && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                onAddComparativeOption({
                                  optionLabel: htl.hotelName,
                                  hotelName: htl.hotelName,
                                  airlineDesc: "",
                                  operatorSlug: htl.providerCode,
                                  totalPriceCents: htl.totalPriceCents,
                                  hotel: mapHotelToDto(htl),
                                  quoteSessionId,
                                });
                              }}
                              className="h-11 sm:h-10 font-semibold"
                            >
                              + Opção
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="transfers" className="pt-3 space-y-3">
              {result.transfers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  Nenhum transfer retornado pelas operadoras ativas para {destinationCity || destinationIata}.
                </div>
              ) : (
                <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
                  {result.transfers.map((tr) => (
                    <div key={tr.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <Badge variant="secondary" className="text-xs uppercase">{tr.providerCode}</Badge>
                        <h4 className="font-bold text-foreground truncate">{tr.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {tr.route} {tr.vehicleType ? `· ${tr.vehicleType}` : ""} {tr.isPrivate ? "· Privativo" : "· Regular"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="font-mono font-bold text-primary">{formatBrlFromCents(tr.priceCents)}</span>
                        {onAddTransfer && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              onAddTransfer(mapTransferToDto(tr), {
                                priceCents: tr.priceCents,
                                providerCode: tr.providerCode,
                                quoteSessionId,
                              });
                              markAdded(`tr:${tr.id}`);
                            }}
                            className="h-11 sm:h-10 gap-1 font-semibold"
                          >
                            <Plus className="size-3.5" />
                            <span>{addedKeys[`tr:${tr.id}`] ? "Adicionado" : "Incluir"}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="activities" className="pt-3 space-y-3">
              {result.activities.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  Nenhum passeio ou atividade encontrado para {destinationCity || destinationIata}.
                </div>
              ) : (
                <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
                  {result.activities.map((act) => (
                    <div key={act.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <Badge variant="secondary" className="text-xs uppercase">
                          {act.source === "api_live" ? act.providerCode : "Catálogo Real"}
                        </Badge>
                        <h4 className="font-bold text-foreground truncate">{act.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {act.destination} {act.duration ? `· ${act.duration}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="font-mono font-bold text-primary">{formatBrlFromCents(act.priceCents)}</span>
                        {onAddTour && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              onAddTour(mapActivityToDto(act), {
                                priceCents: act.priceCents,
                                providerCode: act.providerCode,
                                quoteSessionId,
                              });
                              markAdded(`act:${act.id}`);
                            }}
                            className="h-11 sm:h-10 gap-1 font-semibold"
                          >
                            <Plus className="size-3.5" />
                            <span>{addedKeys[`act:${act.id}`] ? "Incluído" : "Incluir Passeio"}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="cars" className="pt-3 space-y-3">
              {result.cars.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  Nenhuma locação de veículo retornada pelas locadoras ativas para {destinationCity || destinationIata}.
                </div>
              ) : (
                <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
                  {result.cars.map((car) => (
                    <div key={car.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <Badge variant="secondary" className="text-xs uppercase">{car.rentalCompany}</Badge>
                        <h4 className="font-bold text-foreground truncate">{car.vehicleCategory}</h4>
                        <p className="text-xs text-muted-foreground">
                          {car.vehicleModelExample} · {car.transmission} · {car.pickupLocation}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="font-mono font-bold text-primary">{formatBrlFromCents(car.totalPriceCents)}</span>
                        {onAddCar && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              onAddCar(car, { quoteSessionId });
                              markAdded(`car:${car.id}`);
                            }}
                            className="h-11 sm:h-10 gap-1 font-semibold"
                          >
                            <Plus className="size-3.5" />
                            <span>{addedKeys[`car:${car.id}`] ? "Incluído" : "Incluir Carro"}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
