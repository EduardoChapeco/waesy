import { useState } from "react";
import { toast } from "sonner";
import { Plane, Plus, Trash2, CheckCircle2, Clock, Luggage, MapPin, ExternalLink, ShieldCheck } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createFlightItinerary } from "@/services/travel-flights.functions";

interface LeadFlightGridSheetProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    fullName?: string;
    destination?: string | null;
  } | null;
  storeId?: string;
  onSuccess?: () => void;
}

interface SegmentDraft {
  airlineCode: string;
  airlineName: string;
  flightNumber: string;
  originIata: string;
  destinationIata: string;
  departureAt: string;
  arrivalAt: string;
  recordLocator: string;
  baggage: string;
}

export function LeadFlightGridSheet({
  isOpen,
  onClose,
  lead,
  storeId,
  onSuccess,
}: LeadFlightGridSheetProps) {
  const [segments, setSegments] = useState<SegmentDraft[]>([
    {
      airlineCode: "LA",
      airlineName: "LATAM Airlines",
      flightNumber: "LA8012",
      originIata: "GRU",
      destinationIata: "CUN",
      departureAt: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 16),
      arrivalAt: new Date(Date.now() + 86400000 * 30 + 3600000 * 8).toISOString().slice(0, 16),
      recordLocator: "WDR789",
      baggage: "1x 23kg",
    },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddSegment = () => {
    setSegments((prev) => [
      ...prev,
      {
        airlineCode: "LA",
        airlineName: "LATAM Airlines",
        flightNumber: "LA8013",
        originIata: "CUN",
        destinationIata: "GRU",
        departureAt: new Date(Date.now() + 86400000 * 37).toISOString().slice(0, 16),
        arrivalAt: new Date(Date.now() + 86400000 * 37 + 3600000 * 8).toISOString().slice(0, 16),
        recordLocator: "WDR789",
        baggage: "1x 23kg",
      },
    ]);
  };

  const handleRemoveSegment = (index: number) => {
    setSegments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveFlights = async () => {
    if (!storeId) {
      toast.error("Identificador da loja ausente.");
      return;
    }
    if (segments.length === 0) {
      toast.error("Adicione ao menos um trecho de voo.");
      return;
    }

    setIsSaving(true);
    try {
      await createFlightItinerary({
        data: {
          store_id: storeId,
          title: `Malha Aérea - ${lead?.fullName || "Oportunidade"}`,
          itinerary_type: "confirmed",
          status: "active",
          segments: segments.map((s) => ({
            airline_code: s.airlineCode,
            airline_name: s.airlineName,
            flight_number: s.flightNumber,
            origin_iata: s.originIata.toUpperCase(),
            destination_iata: s.destinationIata.toUpperCase(),
            departure_at: new Date(s.departureAt).toISOString(),
            arrival_at: new Date(s.arrivalAt).toISOString(),
            record_locator: s.recordLocator,
            baggage: s.baggage,
            cabin: "economy" as const,
          })),
        },
      });

      toast.success("Malha aérea e PNRs registrados com sucesso!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao registrar itinerário de voo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        size="wide"
        className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] bg-card border-l border-border p-6 overflow-y-auto space-y-6 select-none"
      >
        <SheetHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Plane className="size-5 text-sky-500" />
            <SheetTitle className="text-base font-bold text-foreground">
              Malha Aérea
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            {lead?.fullName ? `Oportunidade: ${lead.fullName}` : "Controle de voos, horários e localizadores PNR"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Trechos Configurados ({segments.length})
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddSegment}
              className="h-8 rounded-lg text-xs gap-2 min-h-11"
            >
              <Plus className="size-3.5" /> Adicionar Trecho
            </Button>
          </div>

          <div className="space-y-3">
            {segments.map((seg, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border border-border/80 bg-muted/20 space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] font-mono font-bold">
                    Trecho #{idx + 1}
                  </Badge>
                  {segments.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSegment(idx)}
                      className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Origem (IATA)</Label>
                    <Input
                      value={seg.originIata}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSegments((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, originIata: val } : s))
                        );
                      }}
                      maxLength={3}
                      className="h-9 font-mono font-bold uppercase rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Destino (IATA)</Label>
                    <Input
                      value={seg.destinationIata}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSegments((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, destinationIata: val } : s))
                        );
                      }}
                      maxLength={3}
                      className="h-9 font-mono font-bold uppercase rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Nº Voo</Label>
                    <Input
                      value={seg.flightNumber}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSegments((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, flightNumber: val } : s))
                        );
                      }}
                      className="h-9 font-mono rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Companhia Aérea</Label>
                    <Input
                      value={seg.airlineName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSegments((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, airlineName: val } : s))
                        );
                      }}
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Localizador (PNR)</Label>
                    <Input
                      value={seg.recordLocator}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSegments((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, recordLocator: val } : s))
                        );
                      }}
                      className="h-9 font-mono font-bold uppercase rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Partida (Data/Hora)</Label>
                    <Input
                      type="datetime-local"
                      value={seg.departureAt}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSegments((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, departureAt: val } : s))
                        );
                      }}
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Franquia Bagagem</Label>
                    <Input
                      value={seg.baggage}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSegments((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, baggage: val } : s))
                        );
                      }}
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <SheetFooter className="gap-2 sm:gap-0 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="rounded-lg min-h-11">
            Fechar
          </Button>
          <Button
            onClick={handleSaveFlights}
            disabled={isSaving}
            className="rounded-lg min-h-11 gap-2 bg-primary text-primary-foreground font-bold"
          >
            <ShieldCheck className="size-4" />
            {isSaving ? "Gravando..." : "Salvar Malha Aérea"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
