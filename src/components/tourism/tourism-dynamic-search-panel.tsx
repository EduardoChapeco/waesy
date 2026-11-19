// motion-reduce: safe
import { useState } from "react";
import {
  MagnifyingGlass,
  MapPin,
  CalendarBlank,
  AirplaneTilt,
  Bed,
  SuitcaseRolling,
  Bus,
  Sailboat,
  Briefcase,
  CircleNotch,
  ArrowRight,
  ArrowsLeftRight,
  GlobeHemisphereWest,
  ShieldCheck,
  Car,
  CheckCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AirportCombobox } from "@/components/ui/airport-combobox";
import {
  TourismMultiRoomPicker,
  summarizeRoomOccupancies,
  type GuestRoomOccupancy,
} from "@/components/tourism/tourism-multi-room-picker";
import { toast } from "sonner";
import { publicTourismAutoServiceSearchFn } from "@/services/infotravel";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface TourismQuotePrefill {
  origin?: string;
  originIata?: string;
  destination?: string;
  destinationIata?: string;
  departureDate?: string;
  returnDate?: string;
  rooms?: GuestRoomOccupancy[];
  tripType?: string;
  specialNotes?: string;
}

interface TourismDynamicSearchPanelProps {
  activeChannel: string;
  onChannelChange: (channel: string) => void;
  onOpenQuote: (destination?: string, prefill?: TourismQuotePrefill) => void;
  storeId?: string;
  agencyName?: string;
  showCorporateTab?: boolean;
  onCorporateAction?: () => void;
  className?: string;
}

export function TourismDynamicSearchPanel({
  activeChannel,
  onChannelChange,
  onOpenQuote,
  storeId,
  agencyName,
  showCorporateTab = true,
  onCorporateAction,
  className,
}: TourismDynamicSearchPanelProps) {
  // Search state
  const [origin, setOrigin] = useState("");
  const [originIata, setOriginIata] = useState("");
  const [destination, setDestination] = useState("");
  const [destinationIata, setDestinationIata] = useState("");
  const [tripMode, setTripMode] = useState<"round_trip" | "one_way">("round_trip");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [rooms, setRooms] = useState<GuestRoomOccupancy[]>([{ adults: 2, childrenAges: [] }]);
  const [cabinClass, setCabinClass] = useState<"economy" | "premium_economy" | "business" | "first">("economy");

  // Live Results State
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLiveGdsActive, setIsLiveGdsActive] = useState(false);
  const [isWoobaLiveActive, setIsWoobaLiveActive] = useState(false);

  const usesAirportCombobox =
    activeChannel === "aereos" ||
    activeChannel === "pacotes" ||
    activeChannel === "hospedagens" ||
    activeChannel === "aluguel";

  const handleSwapOriginDestination = () => {
    setOrigin(destination);
    setOriginIata(destinationIata);
    setDestination(origin);
    setDestinationIata(originIata);
  };

  const mapChannelToTripType = () => {
    if (activeChannel === "hospedagens") return "hotel_only";
    if (activeChannel === "aereos") return "flight_only";
    if (activeChannel === "cruzeiros") return "cruise";
    if (activeChannel === "seguro") return "insurance";
    return "air_package";
  };

  const buildPrefillPayload = (overrideNotes?: string): TourismQuotePrefill => ({
    origin: origin || undefined,
    originIata: originIata || undefined,
    destination: destination || undefined,
    destinationIata: destinationIata || undefined,
    departureDate: departureDate || undefined,
    returnDate: tripMode === "round_trip" ? returnDate || undefined : undefined,
    rooms,
    tripType: mapChannelToTripType(),
    specialNotes: overrideNotes,
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveDest = destination.trim() || destinationIata.trim();
    if (!effectiveDest) {
      toast.error("Informe a cidade ou destino desejado.");
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const serviceType =
        activeChannel === "hospedagens"
          ? "hotels"
          : activeChannel === "aereos"
            ? "flights"
            : activeChannel === "onibus" || activeChannel === "rodoviario"
              ? "bus"
              : activeChannel === "passeios"
                ? "activities"
                : activeChannel === "aluguel"
                  ? "cars"
                  : activeChannel === "cruzeiros"
                    ? "cruises"
                    : activeChannel === "seguro"
                      ? "insurance"
                      : "packages";

      const res = await publicTourismAutoServiceSearchFn({
        data: {
          storeId,
          service: serviceType as any,
          origin,
          originIata: originIata || undefined,
          destination: effectiveDest,
          destinationIata: destinationIata || undefined,
          departureDate: departureDate || undefined,
          returnDate: tripMode === "round_trip" ? returnDate || undefined : undefined,
          cabinClass,
          guests: summarizeRoomOccupancies(rooms),
          rooms,
        },
      });

      setSearchResults(res.results || []);
      setIsLiveGdsActive(Boolean(res.infotravelLiveActive));
      setIsWoobaLiveActive(Boolean((res as any).woobaLiveActive));

      if (!res.results || res.results.length === 0) {
        toast.info("Nenhum resultado imediato encontrado para esta data. Solicite uma cotação personalizada.");
      } else {
        toast.success(`${res.results.length} opções encontradas${agencyName ? ` com ${agencyName}` : ""}!`);
      }
    } catch (err: any) {
      console.warn("[DynamicSearch] Auto-service search fallback:", err);
      setSearchResults([]);
      toast.info("Consulta encaminhada aos nossos agentes. Clique em Solicitar Cotação para atendimento prioritário.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div
      className={cn(
        "w-full rounded-2xl bg-card border border-border/80  p-4 sm:p-6 space-y-5",
        className
      )}
    >
      {/* ── Sub-Aba Horizontal de Seleção Rápida de Tipo de Busca ── */}
      <div className="flex items-center gap-2 overflow-x-auto scroll-area-carousel no-scrollbar pb-1 border-b border-border/40">
        <button
          type="button"
          onClick={() => onChannelChange("pacotes")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shrink-0 transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            activeChannel === "pacotes"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
          )}
        >
          <SuitcaseRolling size={18} weight="bold" />
          <span>Pacotes</span>
        </button>

        <button
          type="button"
          onClick={() => onChannelChange("aereos")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shrink-0 transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            activeChannel === "aereos"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
          )}
        >
          <AirplaneTilt size={18} weight="bold" />
          <span>Passagens</span>
        </button>

        <button
          type="button"
          onClick={() => onChannelChange("hospedagens")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shrink-0 transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            activeChannel === "hospedagens"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
          )}
        >
          <Bed size={18} weight="bold" />
          <span>Hotéis</span>
        </button>

        <button
          type="button"
          onClick={() => onChannelChange("onibus")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shrink-0 transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            activeChannel === "onibus"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
          )}
        >
          <Bus size={18} weight="bold" />
          <span>Ônibus</span>
        </button>

        <button
          type="button"
          onClick={() => onChannelChange("cruzeiros")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shrink-0 transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            activeChannel === "cruzeiros"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
          )}
        >
          <Sailboat size={18} weight="bold" />
          <span>Cruzeiros</span>
        </button>

        <button
          type="button"
          onClick={() => onChannelChange("aluguel")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shrink-0 transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            activeChannel === "aluguel"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
          )}
        >
          <Car size={18} weight="bold" />
          <span>Carros</span>
        </button>

        <button
          type="button"
          onClick={() => onChannelChange("seguro")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shrink-0 transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            activeChannel === "seguro"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
          )}
        >
          <ShieldCheck size={18} weight="bold" />
          <span>Seguro Viagem</span>
        </button>

        {showCorporateTab && (
          <button
            type="button"
            onClick={() => (onCorporateAction ? onCorporateAction() : onChannelChange("corporativo"))}
            className={cn(
              "h-11 min-h-11 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shrink-0 transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeChannel === "corporativo"
                ? "bg-orange-600 text-primary-foreground shadow-2xs"
                : "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
            )}
          >
            <Briefcase size={18} weight="bold" />
            <span>Viagens Corporativas</span>
          </button>
        )}
      </div>

      {/* ── Formulário Dinâmico de Busca Integrada (GDS InfoTravel + Wooba) ── */}
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setTripMode("round_trip")}
              className={cn(
                "h-11 min-h-11 px-3 rounded-lg text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tripMode === "round_trip"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Ida e Volta
            </button>
            <button
              type="button"
              onClick={() => setTripMode("one_way")}
              className={cn(
                "h-11 min-h-11 px-3 rounded-lg text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tripMode === "one_way"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Somente Ida
            </button>
          </div>

          {(activeChannel === "aereos" || activeChannel === "pacotes") && (
            <div className="w-full sm:w-48">
              <Select value={cabinClass} onValueChange={(val) => setCabinClass(val as any)}>
                <SelectTrigger className="h-11 min-h-11 rounded-xl text-xs font-bold">
                  <SelectValue placeholder="Classe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="economy">Econômica</SelectItem>
                  <SelectItem value="premium_economy">Premium Economy</SelectItem>
                  <SelectItem value="business">Executiva</SelectItem>
                  <SelectItem value="first">Primeira Classe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          {/* Campo Origem */}
          <div className="space-y-2">
            {usesAirportCombobox ? (
              <AirportCombobox
                label="Origem (Aeroporto / Cidade)"
                value={originIata || origin}
                onChange={(iata, airport) => {
                  setOriginIata(iata.length === 3 ? iata : "");
                  setOrigin(airport ? `${airport.city} (${airport.iata_code})` : iata);
                }}
                placeholder="Ex: Chapecó (XAP), GRU..."
              />
            ) : (
              <>
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                  <MapPin size={14} className="text-primary" />
                  <span>Origem</span>
                </Label>
                <Input
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="Ex: Chapecó ou São Miguel do Oeste"
                  className="h-11 min-h-11 rounded-lg text-xs sm:text-sm font-medium"
                />
              </>
            )}
          </div>

          {/* Campo Destino + Botão Trocar */}
          <div className="space-y-2">
            {usesAirportCombobox ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-muted-foreground">Destino</span>
                  <button
                    type="button"
                    onClick={handleSwapOriginDestination}
                    aria-label="Inverter origem e destino"
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2"
                  >
                    <ArrowsLeftRight size={13} weight="bold" />
                    <span>Inverter</span>
                  </button>
                </div>
                <AirportCombobox
                  value={destinationIata || destination}
                  onChange={(iata, airport) => {
                    setDestinationIata(iata.length === 3 ? iata : "");
                    setDestination(airport ? `${airport.city} (${airport.iata_code})` : iata);
                  }}
                  placeholder="Ex: Maceió (MCZ), Cancún (CUN)..."
                />
              </div>
            ) : (
              <>
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                  <MapPin size={14} className="text-rose-500" />
                  <span>Para onde você quer ir?</span>
                </Label>
                <Input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Ex: Porto Seguro, Maceió, Florianópolis, Cancún..."
                  className="h-11 min-h-11 rounded-lg text-xs sm:text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring"
                />
              </>
            )}
          </div>

          {/* Campo Data de Ida e Volta */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
              <CalendarBlank size={14} className="text-sky-500" />
              <span>{tripMode === "round_trip" ? "Datas (Ida / Volta)" : "Data de Embarque"}</span>
            </Label>
            <div className={cn("grid gap-2", tripMode === "round_trip" ? "grid-cols-2" : "grid-cols-1")}>
              <Input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                aria-label="Data de ida"
                className="h-11 min-h-11 rounded-lg text-xs font-medium"
              />
              {tripMode === "round_trip" && (
                <Input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  aria-label="Data de volta"
                  className="h-11 min-h-11 rounded-lg text-xs font-medium"
                />
              )}
            </div>
          </div>

          {/* Quartos, Adultos e Crianças com Idades */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground">
              Quartos e Viajantes
            </Label>
            <TourismMultiRoomPicker rooms={rooms} onChange={setRooms} />
          </div>
        </div>

        {/* ── Botão de Execução de Busca com Feedback Tátil (DL-14 Piso 44px) ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border/40">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <GlobeHemisphereWest size={16} className="text-primary shrink-0" weight="bold" />
            <span>
              Integração ativa:{" "}
              <strong className="text-foreground">InfoTravel &amp; Wooba GDS em Tempo Real</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenQuote(destination || "Cotação Personalizada", buildPrefillPayload())}
              className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring w-full sm:w-auto"
            >
              Cotação Especial
            </Button>

            <Button
              type="submit"
              disabled={isSearching}
              className="h-11 min-h-11 px-6 rounded-lg bg-primary text-primary-foreground font-black text-xs sm:text-sm gap-2 cursor-pointer transition-transform active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full sm:w-auto"
            >
              {isSearching ? (
                <>
                  <CircleNotch size={18} className="animate-spin" />
                  <span>Consultando GDS...</span>
                </>
              ) : (
                <>
                  <MagnifyingGlass size={18} weight="bold" />
                  <span>
                    Buscar{" "}
                    {activeChannel === "hospedagens"
                      ? "Hotéis"
                      : activeChannel === "aereos"
                        ? "Voos"
                        : activeChannel === "onibus"
                          ? "Ônibus"
                          : activeChannel === "aluguel"
                            ? "Carros"
                            : activeChannel === "cruzeiros"
                              ? "Cruzeiros"
                              : activeChannel === "seguro"
                                ? "Seguros"
                                : "Pacotes"}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* ── Exibição Dinâmica de Resultados da Busca InfoTravel / Wooba / Catálogo ── */}
      {hasSearched && (
        <div className="pt-3 border-t border-border/50 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-500" weight="fill" />
              <span>Resultados encontrados para &quot;{destination || destinationIata}&quot;</span>
            </h3>
            {(isLiveGdsActive || isWoobaLiveActive) && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                Tarifas GDS em Tempo Real
              </span>
            )}
          </div>

          {searchResults.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 p-6 text-center space-y-2 bg-muted/20">
              <p className="text-xs font-bold text-foreground">
                Nenhum roteiro automático imediato para estas datas exatas.
              </p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Nossos consultores{agencyName ? ` da ${agencyName}` : ""} possuem tarifas consolidadas exclusivas sob consulta.
              </p>
              <Button
                type="button"
                onClick={() => onOpenQuote(destination, buildPrefillPayload())}
                className="h-11 min-h-11 px-5 rounded-lg text-xs font-bold mt-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                Solicitar Cotação com Especialista
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border/70 bg-card p-3 space-y-2 hover:border-foreground/30 transition-colors shadow-2xs flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <span className="text-xs font-extrabold uppercase tracking-wider px-2 py-1 rounded-full bg-primary/10 text-primary inline-block">
                      {item.badge || "Disponível"}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2">
                      {item.title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {item.subtitle || item.destination}
                    </p>
                  </div>

                  {item.includes && item.includes.length > 0 && (
                    <div className="flex flex-wrap gap-1 py-1">
                      {item.includes.slice(0, 3).map((inc: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground"
                        >
                          {inc}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs text-muted-foreground block">A partir de</span>
                      <span className="text-sm font-black text-foreground font-mono truncate block">
                        {item.priceCents > 0 ? formatMoney(item.priceCents) : "Consulte"}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        onOpenQuote(
                          item.destination || item.title,
                          buildPrefillPayload(`Oferta selecionada (${item.source || "vitrine"}): ${item.title}`),
                        )
                      }
                      className="h-11 min-h-11 px-4 text-xs rounded-lg font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                    >
                      Reservar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
