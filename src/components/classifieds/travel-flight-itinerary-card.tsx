import { useState } from "react";
import {
  Plane,
  ChevronDown,
  ChevronUp,
  Clock,
  Briefcase,
  Luggage,
  ShoppingBag,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface FlightLegItem {
  from_iata: string;
  from_city?: string;
  from_airport_name?: string;
  departure_time: string;
  to_iata: string;
  to_city?: string;
  to_airport_name?: string;
  arrival_time: string;
  duration_text?: string;
  airline?: string;
  flight_number?: string;
  cabin_class?: string;
  aircraft?: string;
  layover_duration_after?: string;
  layover_notes?: string;
}

export interface BaggageAllowanceConfig {
  personal_item_count?: number;
  carry_on_count?: number;
  carry_on_weight_kg?: number;
  checked_bag_count?: number;
  checked_bag_weight_kg?: number;
  notes?: string;
}

export interface FlightDirectionSegment {
  direction: "ida" | "volta" | "trecho";
  label?: string;
  date_text?: string;
  airline?: string;
  flight_number?: string;
  cabin_class?: string;
  departure_iata: string;
  departure_city?: string;
  departure_airport?: string;
  departure_time?: string;
  arrival_iata: string;
  arrival_city?: string;
  arrival_airport?: string;
  arrival_time?: string;
  total_duration?: string;
  stops_count?: number;
  connection_airports?: string[];
  legs?: FlightLegItem[];
  baggage?: BaggageAllowanceConfig;
}

const KNOWN_AIRPORT_NAMES: Record<string, { city: string; name: string }> = {
  XAP: { city: "Chapecó", name: "Aeroporto Serafin Enoss Bertaso" },
  GRU: { city: "São Paulo", name: "Aeroporto Internacional de Guarulhos" },
  CGH: { city: "São Paulo", name: "Aeroporto de Congonhas" },
  VCP: { city: "Campinas", name: "Aeroporto Internacional de Viracopos" },
  FLN: { city: "Florianópolis", name: "Aeroporto Internacional Hercílio Luz" },
  NVT: { city: "Navegantes", name: "Aeroporto Internacional Ministro Victor Konder" },
  POA: { city: "Porto Alegre", name: "Aeroporto Internacional Salgado Filho" },
  CWB: { city: "Curitiba", name: "Aeroporto Internacional Afonso Pena" },
  GIG: { city: "Rio de Janeiro", name: "Aeroporto Internacional Tom Jobim (Galeão)" },
  SDU: { city: "Rio de Janeiro", name: "Aeroporto Santos Dumont" },
  BSB: { city: "Brasília", name: "Aeroporto Internacional Presidente Juscelino Kubitschek" },
  CNF: { city: "Belo Horizonte", name: "Aeroporto Internacional de Confins" },
  SSA: { city: "Salvador", name: "Aeroporto Internacional Deputado Luís Eduardo Magalhães" },
  BPS: { city: "Porto Seguro", name: "Aeroporto Internacional de Porto Seguro" },
  REC: { city: "Recife", name: "Aeroporto Internacional dos Guararapes" },
  MCZ: { city: "Maceió", name: "Aeroporto Internacional Zumbi dos Palmares" },
  FOR: { city: "Fortaleza", name: "Aeroporto Internacional Pinto Martins" },
  NAT: { city: "Natal", name: "Aeroporto Internacional de Natal" },
  IGU: { city: "Foz do Iguaçu", name: "Aeroporto Internacional das Cataratas" },
  CXJ: { city: "Caxias do Sul", name: "Aeroporto Regional Hugo Cantergiani" },
};

function resolveAirportMeta(iata: string, fallbackCity?: string, fallbackName?: string) {
  const code = (iata || "").trim().toUpperCase();
  const known = KNOWN_AIRPORT_NAMES[code];
  return {
    code: code || "AER",
    city: fallbackCity || known?.city || code,
    name: fallbackName || known?.name || `Aeroporto (${code})`,
  };
}

function buildSynthesizedLegs(segment: FlightDirectionSegment): FlightLegItem[] {
  if (Array.isArray(segment.legs) && segment.legs.length > 0) {
    return segment.legs;
  }

  const conns = (segment.connection_airports || [])
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);

  if (conns.length === 0) {
    return [
      {
        from_iata: segment.departure_iata,
        from_city: segment.departure_city,
        from_airport_name: segment.departure_airport,
        departure_time: segment.departure_time || "08:00",
        to_iata: segment.arrival_iata,
        to_city: segment.arrival_city,
        to_airport_name: segment.arrival_airport,
        arrival_time: segment.arrival_time || "11:15",
        duration_text: segment.total_duration || "Voo direto",
        airline: segment.airline,
        flight_number: segment.flight_number,
        cabin_class: segment.cabin_class || "Econômica",
      },
    ];
  }

  // Constrói trechos intermediários quando há conexões informadas (ex: XAP -> GRU -> BPS)
  const stopsChain = [
    segment.departure_iata.toUpperCase(),
    ...conns,
    segment.arrival_iata.toUpperCase(),
  ];

  const generated: FlightLegItem[] = [];
  for (let i = 0; i < stopsChain.length - 1; i++) {
    const fromCode = stopsChain[i];
    const toCode = stopsChain[i + 1];
    const isFirst = i === 0;
    const isLast = i === stopsChain.length - 2;

    generated.push({
      from_iata: fromCode,
      from_city: isFirst ? segment.departure_city : undefined,
      departure_time: isFirst ? segment.departure_time || "09:50" : "Conexão",
      to_iata: toCode,
      to_city: isLast ? segment.arrival_city : undefined,
      arrival_time: isLast ? segment.arrival_time || "14:15" : "Escala",
      duration_text: isFirst ? "1º trecho" : `${i + 1}º trecho`,
      airline: segment.airline,
      flight_number: segment.flight_number,
      cabin_class: segment.cabin_class || "Econômica",
      layover_duration_after: !isLast ? "Conexão programada no aeroporto" : undefined,
    });
  }

  return generated;
}

export interface TravelFlightItineraryCardProps {
  flightDetails: any;
  originCity?: string;
  destinationCity?: string;
  departureDateText?: string;
  returnDateText?: string;
}

export function TravelFlightItineraryCard({
  flightDetails,
  originCity,
  destinationCity,
  departureDateText,
  returnDateText,
}: TravelFlightItineraryCardProps) {
  const [expandedSegments, setExpandedSegments] = useState<Record<number, boolean>>({
    0: true,
  });

  if (!flightDetails) return null;

  // Normaliza segmentos de Ida e Volta a partir de flightDetails
  const segments: FlightDirectionSegment[] = [];

  if (Array.isArray(flightDetails.segments) && flightDetails.segments.length > 0) {
    segments.push(...flightDetails.segments);
  } else {
    const depIata =
      flightDetails.departure_iata ||
      flightDetails.combo_flight_from_iata ||
      "XAP";
    const arrIata =
      flightDetails.arrival_iata ||
      flightDetails.combo_flight_to_iata ||
      "DEST";
    const rawConns =
      typeof flightDetails.connections === "string"
        ? flightDetails.connections
            .split(/[,;/]+/)
            .map((s: string) => s.trim())
            .filter(Boolean)
        : Array.isArray(flightDetails.connections)
          ? flightDetails.connections
          : [];

    const defaultBaggage: BaggageAllowanceConfig = {
      personal_item_count: flightDetails.baggage?.personal_item_count ?? 1,
      carry_on_count: flightDetails.baggage?.carry_on_count ?? 1,
      carry_on_weight_kg: flightDetails.baggage?.carry_on_weight_kg ?? 10,
      checked_bag_count:
        flightDetails.baggage?.checked_bag_count ??
        (flightDetails.checked_baggage_included ? 1 : 0),
      checked_bag_weight_kg: flightDetails.baggage?.checked_bag_weight_kg ?? 23,
    };

    // Segmento 1: IDA
    segments.push({
      direction: "ida",
      label: "Voo de Ida",
      date_text: flightDetails.outbound_date_text || departureDateText || "Embarque de Ida",
      airline: flightDetails.airline || flightDetails.combo_airline || "Cia Aérea Regular",
      flight_number: flightDetails.flight_number || flightDetails.outbound_flight_number || "",
      cabin_class: flightDetails.cabin_class || "Classe Econômica",
      departure_iata: depIata,
      departure_city: originCity,
      departure_time: flightDetails.departure_time || "09:50",
      arrival_iata: arrIata,
      arrival_city: destinationCity,
      arrival_time: flightDetails.arrival_time || "14:15",
      total_duration: flightDetails.duration_text || "4h 25m",
      stops_count: rawConns.length,
      connection_airports: rawConns,
      legs: Array.isArray(flightDetails.outbound_legs) ? flightDetails.outbound_legs : undefined,
      baggage: defaultBaggage,
    });

    // Segmento 2: VOLTA (se houver horário de volta, data de retorno ou round_trip !== false)
    if (
      flightDetails.include_return !== false &&
      (returnDateText ||
        flightDetails.return_departure_time ||
        flightDetails.return_arrival_time ||
        flightDetails.inbound_legs?.length)
    ) {
      segments.push({
        direction: "volta",
        label: "Voo de Volta",
        date_text: flightDetails.inbound_date_text || returnDateText || "Embarque de Retorno",
        airline:
          flightDetails.return_airline ||
          flightDetails.airline ||
          flightDetails.combo_airline ||
          "Cia Aérea Regular",
        flight_number: flightDetails.return_flight_number || "",
        cabin_class: flightDetails.cabin_class || "Classe Econômica",
        departure_iata: arrIata,
        departure_city: destinationCity,
        departure_time: flightDetails.return_departure_time || "15:30",
        arrival_iata: depIata,
        arrival_city: originCity,
        arrival_time: flightDetails.return_arrival_time || "20:10",
        total_duration: flightDetails.return_duration_text || flightDetails.duration_text || "4h 40m",
        stops_count: rawConns.length,
        connection_airports: [...rawConns].reverse(),
        legs: Array.isArray(flightDetails.inbound_legs) ? flightDetails.inbound_legs : undefined,
        baggage: defaultBaggage,
      });
    }
  }

  const primarySeg = segments[0];
  const allRouteAirports = primarySeg
    ? [
        primarySeg.departure_iata.toUpperCase(),
        ...(primarySeg.connection_airports || []).map((c) => c.toUpperCase()),
        primarySeg.arrival_iata.toUpperCase(),
      ]
    : [];

  const baggage = primarySeg?.baggage || {
    personal_item_count: 1,
    carry_on_count: 1,
    carry_on_weight_kg: 10,
    checked_bag_count: 0,
    checked_bag_weight_kg: 23,
  };

  const toggleSegment = (index: number) => {
    setExpandedSegments((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div className="rounded-lg border border-border/70 bg-card overflow-hidden space-y-0">
      {/* Cabeçalho Geral do Bloco Aéreo */}
      <div className="p-4 sm:p-5 bg-muted/30 border-b border-border/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Plane className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm sm:text-base font-bold text-foreground">
                Malha Aérea & Conexões do Pacote
              </h4>
              <Badge variant="secondary" className="text-xs font-semibold">
                Ida e Volta
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Horários oficiais previstos, escalas detalhadas e franquia de bagagem
            </p>
          </div>
        </div>

        {flightDetails.price_text && (
          <div className="px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold">
            {flightDetails.price_text}
          </div>
        )}
      </div>

      {/* Mapa Visual Geodésico da Rota (Aeroportos e Escalas) */}
      {allRouteAirports.length >= 2 && (
        <div className="px-4 py-3 bg-muted/15 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <MapPin className="size-4 text-primary shrink-0" />
            <span>Rota Aérea Mapeada:</span>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            {allRouteAirports.map((code, idx) => {
              const meta = resolveAirportMeta(code);
              const isLast = idx === allRouteAirports.length - 1;
              const isConnection = idx > 0 && !isLast;
              return (
                <div key={`${code}-${idx}`} className="flex items-center gap-2">
                  <div
                    className={`px-2 py-1 rounded-lg border text-xs font-bold flex items-center gap-2 ${
                      isConnection
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                        : "bg-card border-border/60 text-foreground"
                    }`}
                  >
                    <span className="font-mono">{meta.code}</span>
                    <span className="font-normal text-muted-foreground hidden sm:inline">
                      ({meta.city})
                    </span>
                  </div>
                  {!isLast && <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de Trechos (Ida / Volta) com Acordeão Estilo Google Flights */}
      <div className="divide-y divide-border/50">
        {segments.map((seg, segIdx) => {
          const isExpanded = Boolean(expandedSegments[segIdx]);
          const legs = buildSynthesizedLegs(seg);
          const stopsCount = Math.max(0, legs.length - 1);
          const depMeta = resolveAirportMeta(
            seg.departure_iata,
            seg.departure_city,
            seg.departure_airport
          );
          const arrMeta = resolveAirportMeta(
            seg.arrival_iata,
            seg.arrival_city,
            seg.arrival_airport
          );

          return (
            <div key={segIdx} className="p-4 sm:p-5 space-y-4">
              {/* Linha Principal Compacta (Ida ou Volta) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={seg.direction === "ida" ? "default" : "secondary"}
                      className="text-xs font-bold uppercase tracking-wider"
                    >
                      {seg.label || (seg.direction === "ida" ? "Ida" : "Volta")}
                    </Badge>
                    {seg.date_text && (
                      <span className="text-xs font-semibold text-muted-foreground">
                        {seg.date_text}
                      </span>
                    )}
                    {seg.airline && (
                      <span className="text-xs font-bold text-foreground">
                        • {seg.airline}
                        {seg.flight_number ? ` (${seg.flight_number})` : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Botão Tátil "Detalhes do voo" */}
                <button
                  type="button"
                  onClick={() => toggleSegment(segIdx)}
                  className="h-11 min-h-11 px-3 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted text-xs font-bold text-primary flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary self-start sm:self-auto"
                >
                  <span>{isExpanded ? "Ocultar detalhes" : "Detalhes do voo"}</span>
                  {isExpanded ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </button>
              </div>

              {/* Barra Visual de Horários: 09:50 XAP ----(1 parada / 4h 25m)----> 14:15 BPS */}
              <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg bg-muted/20 border border-border/40">
                {/* Partida */}
                <div className="col-span-4 sm:col-span-3 text-left">
                  <p className="text-lg sm:text-xl font-black tracking-tight text-foreground font-mono">
                    {seg.departure_time || "09:50"}
                  </p>
                  <p className="text-xs font-bold text-foreground font-mono">{depMeta.code}</p>
                  <p className="text-xs text-muted-foreground truncate">{depMeta.city}</p>
                </div>

                {/* Linha Central com Indicador de Paradas e Duração */}
                <div className="col-span-4 sm:col-span-6 flex flex-col items-center justify-center px-2">
                  <span className="text-xs font-medium text-muted-foreground mb-1">
                    {seg.total_duration || "Duração prevista"}
                  </span>
                  <div className="w-full flex items-center gap-1">
                    <span className="size-2 rounded-full bg-primary shrink-0" />
                    <div className="h-0.5 flex-1 bg-border relative flex items-center justify-evenly">
                      {stopsCount > 0 &&
                        Array.from({ length: stopsCount }).map((_, stopIdx) => (
                          <span
                            key={stopIdx}
                            className="size-2.5 rounded-full bg-amber-500 ring-2 ring-background"
                            title="Parada / Conexão"
                          />
                        ))}
                    </div>
                    <Plane className="size-3.5 text-primary shrink-0" />
                  </div>
                  <span
                    className={`text-xs font-bold mt-1 ${
                      stopsCount === 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {stopsCount === 0
                      ? "Voo direto"
                      : `${stopsCount} ${stopsCount === 1 ? "parada" : "paradas"}${
                          seg.connection_airports?.length
                            ? ` (${seg.connection_airports.join(", ")})`
                            : ""
                        }`}
                  </span>
                </div>

                {/* Chegada */}
                <div className="col-span-4 sm:col-span-3 text-right">
                  <p className="text-lg sm:text-xl font-black tracking-tight text-foreground font-mono">
                    {seg.arrival_time || "14:15"}
                  </p>
                  <p className="text-xs font-bold text-foreground font-mono">{arrMeta.code}</p>
                  <p className="text-xs text-muted-foreground truncate">{arrMeta.city}</p>
                </div>
              </div>

              {/* Acordeão Expansível de Escalas e Conexões (Estilo Google Flights) */}
              {isExpanded && (
                <div className="pl-2 sm:pl-4 pt-2 space-y-3 animate-in fade-in duration-150">
                  {legs.map((leg, legIdx) => {
                    const fromInfo = resolveAirportMeta(
                      leg.from_iata,
                      leg.from_city,
                      leg.from_airport_name
                    );
                    const toInfo = resolveAirportMeta(
                      leg.to_iata,
                      leg.to_city,
                      leg.to_airport_name
                    );
                    const hasLayoverAfter = legIdx < legs.length - 1;

                    return (
                      <div key={legIdx} className="space-y-3">
                        <div className="relative pl-6 border-l-2 border-primary/40 space-y-3 py-1">
                          {/* Nó de Partida do Trecho */}
                          <div className="relative">
                            <span className="absolute -left-8 top-1 size-3.5 rounded-full border-2 border-primary bg-background" />
                            <div className="flex flex-wrap items-baseline gap-2">
                              <span className="text-xs font-bold font-mono text-foreground">
                                {leg.departure_time}
                              </span>
                              <span className="text-xs sm:text-sm font-bold text-foreground">
                                {fromInfo.name} ({fromInfo.code})
                              </span>
                            </div>
                          </div>

                          {/* Metadados do Voo no Trecho */}
                          <div className="py-2 px-3 rounded-lg bg-muted/30 border border-border/40 inline-flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {leg.duration_text && (
                              <span className="inline-flex items-center gap-1 font-medium">
                                <Clock className="size-3.5 text-primary" />
                                Tempo de viagem: {leg.duration_text}
                              </span>
                            )}
                            {leg.airline && <span>• {leg.airline}</span>}
                            {leg.flight_number && (
                              <span className="font-mono font-semibold text-foreground">
                                Voo {leg.flight_number}
                              </span>
                            )}
                            {leg.cabin_class && <span>• {leg.cabin_class}</span>}
                            {leg.aircraft && <span>• {leg.aircraft}</span>}
                          </div>

                          {/* Nó de Chegada do Trecho */}
                          <div className="relative">
                            <span className="absolute -left-8 top-1 size-3.5 rounded-full bg-primary" />
                            <div className="flex flex-wrap items-baseline gap-2">
                              <span className="text-xs font-bold font-mono text-foreground">
                                {leg.arrival_time}
                              </span>
                              <span className="text-xs sm:text-sm font-bold text-foreground">
                                {toInfo.name} ({toInfo.code})
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Barra de Tempo de Espera / Conexão entre Voos */}
                        {hasLayoverAfter && (
                          <div className="ml-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-300">
                            <div className="flex items-center gap-2 font-semibold">
                              <Clock className="size-4 shrink-0" />
                              <span>
                                {leg.layover_duration_after || "Conexão em"} {toInfo.city} (
                                {toInfo.code})
                              </span>
                            </div>
                            <span className="text-xs font-medium">
                              {leg.layover_notes || "Troca de aeronave"}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Rodapé de Franquia de Bagagem Inclusa (Estilo CVC / Google Flights) */}
      <div className="p-4 sm:p-5 bg-muted/20 border-t border-border/50 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Luggage className="size-4 text-primary" />
            Franquia de Bagagem por Passageiro
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* 1. Item Pessoal */}
          <div className="p-3 rounded-lg border border-border/50 bg-card flex items-start gap-2">
            <ShoppingBag className="size-4 text-emerald-600 shrink-0 mt-1" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-foreground">
                  {baggage.personal_item_count ?? 1}x Item pessoal
                </p>
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground">
                Bolsa ou mochila sob o assento
              </p>
            </div>
          </div>

          {/* 2. Bagagem de Mão */}
          <div className="p-3 rounded-lg border border-border/50 bg-card flex items-start gap-2">
            <Briefcase className="size-4 text-emerald-600 shrink-0 mt-1" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-foreground">
                  {baggage.carry_on_count ?? 1}x Bagagem de mão (
                  {baggage.carry_on_weight_kg ?? 10}kg)
                </p>
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground">
                No compartimento superior da cabine
              </p>
            </div>
          </div>

          {/* 3. Bagagem Despachada */}
          <div className="p-3 rounded-lg border border-border/50 bg-card flex items-start gap-2">
            <Luggage
              className={`size-4 shrink-0 mt-1 ${
                (baggage.checked_bag_count ?? 0) > 0
                  ? "text-emerald-600"
                  : "text-muted-foreground"
              }`}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-foreground">
                  {(baggage.checked_bag_count ?? 0) > 0
                    ? `${baggage.checked_bag_count}x Mala despachada (${baggage.checked_bag_weight_kg ?? 23}kg)`
                    : "Bagagem despachada"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {(baggage.checked_bag_count ?? 0) > 0
                  ? "Inclusa no porão da aeronave"
                  : "Opcional (pode ser adicionada na reserva)"}
              </p>
            </div>
          </div>
        </div>

        {baggage.notes && (
          <p className="text-xs text-muted-foreground flex items-center gap-2 pt-1">
            <Info className="size-3.5 text-primary shrink-0" />
            <span>{baggage.notes}</span>
          </p>
        )}
      </div>
    </div>
  );
}
