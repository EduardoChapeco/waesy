// motion-reduce: safe
import { useState } from "react";
import {
  MagnifyingGlass,
  MapPin,
  CalendarBlank,
  Users,
  AirplaneTilt,
  Bed,
  SuitcaseRolling,
  Bus,
  Sailboat,
  Briefcase,
  CircleNotch,
  ArrowRight,
  Sparkle,
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
import { toast } from "sonner";
import { publicTourismAutoServiceSearchFn } from "@/services/infotravel";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

interface TourismDynamicSearchPanelProps {
  activeChannel: string;
  onChannelChange: (channel: string) => void;
  onOpenQuote: (destination?: string) => void;
  className?: string;
}

export function TourismDynamicSearchPanel({
  activeChannel,
  onChannelChange,
  onOpenQuote,
  className,
}: TourismDynamicSearchPanelProps) {
  // Search state
  const [origin, setOrigin] = useState("Chapecó (XAP)");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [guests, setGuests] = useState("2 Adultos");
  const [cabinClass, setCabinClass] = useState("economy");

  // Live Results State
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLiveGdsActive, setIsLiveGdsActive] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) {
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
            : activeChannel === "passeios"
              ? "activities"
              : activeChannel === "aluguel"
                ? "cars"
                : "packages";

      const res = await publicTourismAutoServiceSearchFn({
        data: {
          service: serviceType as any,
          origin,
          destination: destination.trim(),
          departureDate: departureDate || undefined,
          returnDate: returnDate || undefined,
          guests,
        },
      });

      setSearchResults(res.results || []);
      setIsLiveGdsActive(Boolean(res.infotravelLiveActive));

      if (!res.results || res.results.length === 0) {
        toast.info("Nenhum resultado imediato encontrado para esta data. Solicite uma cotação personalizada.");
      } else {
        toast.success(`${res.results.length} opções encontradas com a Excelência Tour!`);
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
        "w-full rounded-2xl bg-card border border-border/80 shadow-md p-4 sm:p-6 space-y-5",
        className
      )}
    >
      {/* ── Sub-Aba Horizontal de Seleção Rápida de Tipo de Busca ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-border/40">
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
          onClick={() => onChannelChange("corporativo")}
          className={cn(
            "h-11 min-h-11 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shrink-0 transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            activeChannel === "corporativo"
              ? "bg-orange-600 text-primary-foreground shadow-2xs"
              : "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
          )}
        >
          <Briefcase size={18} weight="bold" />
          <span>Corporativo (VOLL)</span>
        </button>
      </div>

      {/* ── Formulário Dinâmico de Busca Integrada (GDS InfoTravel / Wooba) ── */}
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Campo Origem */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
              <MapPin size={14} className="text-primary" />
              <span>Origem</span>
            </Label>
            <Input
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Ex: Chapecó (XAP) ou São Miguel do Oeste"
              className="h-11 min-h-11 rounded-lg text-xs sm:text-sm font-medium"
            />
          </div>

          {/* Campo Destino */}
          <div className="space-y-2">
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
          </div>

          {/* Campo Data de Ida e Volta */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
              <CalendarBlank size={14} className="text-sky-500" />
              <span>Datas (Ida / Retorno)</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="h-11 min-h-11 rounded-lg text-xs font-medium"
              />
              <Input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="h-11 min-h-11 rounded-lg text-xs font-medium"
              />
            </div>
          </div>

          {/* Hóspedes / Passageiros */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
              <Users size={14} className="text-amber-500" />
              <span>Viajantes</span>
            </Label>
            <Select value={guests} onValueChange={setGuests}>
              <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs sm:text-sm font-medium">
                <SelectValue placeholder="Selecione hóspedes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1 Adulto">1 Adulto (Individual)</SelectItem>
                <SelectItem value="2 Adultos">2 Adultos (Casal / Duplo)</SelectItem>
                <SelectItem value="2 Adultos + 1 Criança">2 Adultos + 1 Criança</SelectItem>
                <SelectItem value="Família (4 pessoas)">Família (4 pessoas)</SelectItem>
                <SelectItem value="Grupo (+5 pessoas)">Grupo (+5 pessoas)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Botão de Execução de Busca com Feedback Tátil (DL-14 Piso 44px) ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border/40">
          <div className="flex items-center gap-2 text-3xs sm:text-xs text-muted-foreground">
            <Sparkle size={14} className="text-amber-500 shrink-0" weight="fill" />
            <span>
              Integração ativa:{" "}
              <strong className="text-foreground">InfoTravel GDS & Operadoras Homologadas</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenQuote(destination || "Cotação Personalizada")}
              className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring w-full sm:w-auto"
            >
              Cotação Especial
            </Button>

            <Button
              type="submit"
              disabled={isSearching}
              className="h-11 min-h-11 px-6 rounded-lg bg-primary text-primary-foreground font-black text-xs sm:text-sm shadow-sm gap-2 cursor-pointer transition-transform active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full sm:w-auto"
            >
              {isSearching ? (
                <>
                  <CircleNotch size={18} className="animate-spin" />
                  <span>Consultando GDS...</span>
                </>
              ) : (
                <>
                  <MagnifyingGlass size={18} weight="bold" />
                  <span>Buscar {activeChannel === "hospedagens" ? "Hotéis" : activeChannel === "aereos" ? "Voos" : "Pacotes"}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* ── Exibição Dinâmica de Resultados da Busca InfoTravel / Catálogo ── */}
      {hasSearched && (
        <div className="pt-3 border-t border-border/50 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-500" weight="fill" />
              <span>Resultados encontrados para &quot;{destination}&quot;</span>
            </h3>
            {isLiveGdsActive && (
              <span className="text-3xs font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 uppercase tracking-wider">
                Tarifas em Tempo Real
              </span>
            )}
          </div>

          {searchResults.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 p-6 text-center space-y-2 bg-muted/20">
              <p className="text-xs font-bold text-foreground">
                Nenhum roteiro automático imediato para estas datas exatas.
              </p>
              <p className="text-3xs text-muted-foreground max-w-md mx-auto">
                Nossos consultores da Excelência Tour possuem tarifas consolidadas exclusivas sob consulta.
              </p>
              <Button
                type="button"
                onClick={() => onOpenQuote(destination)}
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
                    <span className="text-3xs font-extrabold uppercase tracking-wider px-2 py-1 rounded-full bg-primary/10 text-primary inline-block">
                      {item.badge || "Disponível"}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2">
                      {item.title}
                    </h4>
                    <p className="text-3xs text-muted-foreground line-clamp-1">
                      {item.subtitle || item.destination}
                    </p>
                  </div>

                  {item.includes && item.includes.length > 0 && (
                    <div className="flex flex-wrap gap-1 py-1">
                      {item.includes.slice(0, 3).map((inc: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-3xs bg-muted px-2 py-1 rounded text-muted-foreground"
                        >
                          {inc}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-3xs text-muted-foreground block">A partir de</span>
                      <span className="text-sm font-black text-foreground font-mono truncate block">
                        {item.priceCents > 0 ? formatMoney(item.priceCents) : "Consulte"}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onOpenQuote(item.title)}
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
