import { useState, useEffect } from "react";
import { type Proposal, type Flight } from "@/services/proposals";
import { Accordion, Card, AddBtn, L, Inp, TextField, NumField, SMALL_INPUT } from "@/components/proposals/ProposalFormFields";
import { replaceAt } from "@/components/proposals/ProposalFormFields";
import { Trash2, Plus, PlaneTakeoff, PlaneLanding, BaggageClaim, Search, AlertTriangle, Clock } from "lucide-react";
import { useAgency } from "@/lib/agency-context";
import { searchAgencyGdsFlightsFn } from "@/services/infotravel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormInput as Input } from "@/components/ui/input";
import { NativeSelect as Select } from "@/components/ui/select";
import { SupplierAutocomplete, type SupplierOption } from "@/components/suppliers/SupplierAutocomplete";

interface Props {
  draft: Proposal;
  save: (patch: Partial<Proposal>) => void;
}

const BLANK: Flight = {
  id: "",
  origin: "",
  destination: "",
  date: "",
  departure_time: "",
  arrival_time: "",
  airline: "",
  flight_number: "",
  stops: 0,
  baggage_rules: "23kg",
  price: 0,
};

export function parseTimeToMinutes(t?: string): number | null {
  if (!t || !t.includes(":")) return null;
  const [h, m] = t.split(":").map((v) => parseInt(v, 10));
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

export function getConnectionWarning(prev?: Flight, curr?: Flight): { type: "tight" | "negative" | "long"; message: string } | null {
  if (!prev || !curr) return null;
  if (!prev.destination || !curr.origin) return null;

  const destClean = prev.destination.trim().toUpperCase();
  const origClean = curr.origin.trim().toUpperCase();

  // Compara conexão se o destino anterior é a mesma cidade/aeroporto da nova origem
  if (destClean !== origClean && prev.date !== curr.date) return null;

  const arrMin = parseTimeToMinutes(prev.arrival_time);
  const depMin = parseTimeToMinutes(curr.departure_time);

  if (arrMin === null || depMin === null) return null;

  const diff = depMin - arrMin;

  if (diff < 0) {
    return {
      type: "negative",
      message: `Inconsistência de horários: O voo ${curr.flight_number || "seguinte"} decola às ${curr.departure_time}, antes da chegada do voo anterior (${prev.arrival_time}) em ${prev.destination}.`,
    };
  }

  if (diff < 45) {
    return {
      type: "tight",
      message: `Conexão apertada em ${prev.destination}: apenas ${diff} min de solo. Risco elevado de perda de conexão ou extravio de bagagem despachada.`,
    };
  }

  if (diff >= 360) {
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return {
      type: "long",
      message: `Conexão longa em ${prev.destination}: ${hours}h${mins > 0 ? ` ${mins}min` : ""} de espera no aeroporto.`,
    };
  }

  return null;
}

export function SectionFlights({ draft, save }: Props) {
  const { agency } = useAgency();
  const flights = draft.flights ?? [];

  // Busca de voo isolado: canal Wooba, com preço já calculado no servidor.
  const [infotravelOpen, setInfotravelOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchParams, setSearchParams] = useState({
    origin: "",
    destination: draft.destination || "",
    date: draft.travel_start || "",
  });
  const [results, setResults] = useState<Flight[]>([]);

  useEffect(() => {
    setSearchParams((prev) => ({
      ...prev,
      destination: draft.destination || "",
      date: draft.travel_start || "",
    }));
  }, [draft.destination, draft.travel_start]);

  async function handleSearch() {
    if (!agency) return;
    setSearching(true);
    try {
      const response = await searchAgencyGdsFlightsFn({
        data: {
          origin: searchParams.origin,
          destination: searchParams.destination,
          departureDate: searchParams.date,
          passengers: 1,
        },
      });
      const data: Flight[] = response.offers.map((offer) => ({
        id: `${offer.flightNumber}-${offer.departureTime}`,
        origin: offer.departureAirport,
        destination: offer.arrivalAirport,
        date: searchParams.date,
        departure_time: offer.departureTime,
        arrival_time: offer.arrivalTime,
        airline: offer.airline,
        flight_number: offer.flightNumber,
        stops: offer.stops,
        baggage_rules: offer.baggageIncluded ? "Bagagem incluída" : "Apenas bagagem de mão",
        price: offer.priceCents / 100,
      }));
      setResults(data);
      if (data.length === 0) {
        toast.info("Nenhum voo disponível para esta busca.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao consultar Wooba.");
    } finally {
      setSearching(false);
    }
  }

  function importFlight(f: Flight) {
    save({
      flights: [
        ...flights,
        {
          ...f,
          id: crypto.randomUUID(),
          price: f.price,
        },
      ],
    });
    setInfotravelOpen(false);
    toast.success(`Voo ${f.airline} ${f.flight_number} importado com sucesso!`);
  }

  function add() {
    save({ flights: [...flights, { ...BLANK, id: crypto.randomUUID() }] });
  }

  // Rest of SectionFlights logic
  function upd(i: number, patch: Partial<Flight>) {
    save({ flights: replaceAt(flights, i, { ...flights[i], ...patch }) });
  }

  function remove(i: number) {
    save({ flights: flights.filter((_, x) => x !== i) });
  }

  return (
    <Accordion title={`Voos (${flights.length})`}>
      {flights.map((f, i) => {
        const connectionAlert = i > 0 ? getConnectionWarning(flights[i - 1], f) : null;
        return (
          <Card key={f.id || i} onRemove={() => remove(i)}>
            {connectionAlert && (
              <div
                role="alert"
                className={`mb-3 flex items-start gap-2 rounded-lg border p-3 text-xs font-medium leading-relaxed ${
                  connectionAlert.type === "negative"
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : connectionAlert.type === "tight"
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                      : "border-blue-500/40 bg-blue-500/10 text-blue-800 dark:text-blue-200"
                }`}
              >
                <AlertTriangle className="size-4 shrink-0 mt-1 text-amber-600 dark:text-amber-400" />
                <span>{connectionAlert.message}</span>
              </div>
            )}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <L label="Origem">
              <Inp value={f.origin} onChange={(v) => upd(i, { origin: v })} ph="ex. GRU" />
            </L>
            <L label="Destino">
              <Inp
                value={f.destination}
                onChange={(v) => upd(i, { destination: v })}
                ph="ex. JFK"
              />
            </L>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
            <L label="Data">
              <Inp value={f.date} onChange={(v) => upd(i, { date: v })} type="date" ph="" />
            </L>
            <L label="Decolagem">
              <Inp
                value={f.departure_time}
                onChange={(v) => upd(i, { departure_time: v })}
                ph="08:00"
              />
            </L>
            <L label="Chegada">
              <Inp
                value={f.arrival_time}
                onChange={(v) => upd(i, { arrival_time: v })}
                ph="14:00"
              />
            </L>
          </div>
          <div className="grid grid-cols-1 gap-2 mb-2">
            <div className="mb-1">
              <span className="ds-meta font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Buscar Companhia Aérea no Catálogo
              </span>
              <SupplierAutocomplete
                agencyId={agency?.id ?? ""}
                value={null}
                onChange={(s: SupplierOption | null) => {
                  if (!s) return;
                  upd(i, {
                    airline: s.name,
                  });
                }}
                filterKind="airline"
                placeholder="Buscar cia aérea..."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <L label="Companhia">
              <Inp value={f.airline} onChange={(v) => upd(i, { airline: v })} ph="LATAM" />
            </L>
            <L label="Nº Voo">
              <Inp
                value={f.flight_number}
                onChange={(v) => upd(i, { flight_number: v })}
                ph="LA8104"
              />
            </L>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <L label="Bagagem">
              <Select
                className={SMALL_INPUT}
                value={f.baggage_rules}
                onChange={(e) => upd(i, { baggage_rules: e.target.value })}
              >
                <option value="">Sem bagagem</option>
                <option value="10kg (mão)">10kg mão</option>
                <option value="23kg">23kg</option>
                <option value="32kg">32kg</option>
                <option value="2 volumes">2 volumes</option>
              </Select>
            </L>
            <L label="Paradas">
              <Select
                className={SMALL_INPUT}
                value={f.stops}
                onChange={(e) => upd(i, { stops: parseInt(e.target.value) })}
              >
                <option value={0}>Direto</option>
                <option value={1}>1 parada</option>
                <option value={2}>2 paradas</option>
              </Select>
            </L>
          </div>
          <div className="grid grid-cols-1 gap-2 mt-2 pt-2 border-t border-border/30">
            <L label="Valor (Soma no total)">
              <Inp
                value={f.price?.toString() || ""}
                onChange={(v) => upd(i, { price: parseFloat(v) || 0 })}
                type="number"
                ph="0.00"
              />
            </L>
          </div>
        </Card>
        );
      })}
      <div className="flex gap-2">
        <AddBtn onClick={add} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Adicionar voo</AddBtn>
        <Button
          type="button"
          onClick={() => setInfotravelOpen(true)}
          className="flex-1 inline-flex items-center justify-center gap-2 h-[34px] rounded border border-border bg-surface text-xs font-semibold text-muted-foreground hover:bg-surface-alt hover:text-foreground transition-colors duration-200 cursor-pointer"
        >
          <Search className="h-3.5 w-3.5" /> Buscar no Infotravel
        </Button>
      </div>

      {infotravelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
          <div /* design-lint-ignore DL-15 reason:"Conteiner nao interativo; onClick apenas isola propagacao de evento" expiry:"2027-12-31" */
            className="w-full max-w-lg rounded-lg border border-border bg-surface p-5 flex flex-col max-h-[85vh] overflow-hidden shadow-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="ds-h3 text-foreground flex items-center gap-2">
                <Search className="h-4 w-4 text-brand" /> Buscar Voo no Infotravel
              </h3>
              <Button
                type="button"
                onClick={() => setInfotravelOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                Fechar
              </Button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar pr-1">
              <div className="grid grid-cols-2 gap-2">
                <L label="Origem (IATA)">
                  <Input
                    className={SMALL_INPUT}
                    value={searchParams.origin}
                    onChange={(e) =>
                      setSearchParams({ ...searchParams, origin: e.target.value.toUpperCase() })
                    }
                    placeholder="Ex: GRU"
                  />
                </L>
                <L label="Destino (IATA)">
                  <Input
                    className={SMALL_INPUT}
                    value={searchParams.destination}
                    onChange={(e) =>
                      setSearchParams({
                        ...searchParams,
                        destination: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="Ex: JFK"
                  />
                </L>
                <div className="col-span-2">
                  <L label="Data do Voo">
                    <Input
                      type="date"
                      className={SMALL_INPUT}
                      value={searchParams.date}
                      onChange={(e) => setSearchParams({ ...searchParams, date: e.target.value })}
                    />
                  </L>
                </div>
              </div>

              <Button
                variant="default"
                type="button"
                className="w-full"
                disabled={
                  searching ||
                  !searchParams.origin ||
                  !searchParams.destination ||
                  !searchParams.date
                }
                onClick={handleSearch}
              >
                {searching ? "Buscando tarifas..." : "Pesquisar Tarifas"}
              </Button>

              <div className="space-y-2 pt-2">
                {results.length === 0 && !searching && (
                  <p className="text-center text-xs text-muted-foreground py-4 font-sans">
                    Insira os aeroportos e a data acima para buscar voos.
                  </p>
                )}
                {results.map((flight) => (
                  <div
                    key={flight.id}
                    className="flex gap-3 p-3 rounded border border-border hover:border-brand/40 bg-surface-alt/25 transition-colors duration-200 group text-left"
                  >
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-xs font-bold text-foreground truncate group-hover:text-brand transition-colors">
                            {flight.airline} • Voo {flight.flight_number}
                          </h4>
                          <span className="ds-meta text-muted-foreground font-mono">
                            {flight.stops === 0 ? "Direto" : `${flight.stops} parada(s)`}
                          </span>
                        </div>
                        <p className="ds-meta text-muted-foreground font-sans truncate">
                          {flight.origin} {flight.departure_time} → {flight.destination}{" "}
                          {flight.arrival_time}
                        </p>
                        <p className="text-3xs text-muted-foreground/85 font-sans mt-1">
                          {flight.baggage_rules}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/10">
                        <span className="text-xs font-bold text-foreground font-mono">
                          {flight.price.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                        <Button
                          type="button"
                          onClick={() => importFlight(flight)}
                          className="px-3 py-1 ds-meta bg-primary text-primary-foreground font-semibold rounded hover:bg-primary/95 transition-colors duration-200 cursor-pointer"
                        >
                          Selecionar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Accordion>
  );
}
