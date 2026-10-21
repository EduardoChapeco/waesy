import { useState, useTransition } from "react";
import { Users, Calendar, MapPin, Car, ShieldCheck, Plus, Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { publishCaronaRide } from "@/services/carona.functions";
import { toast } from "sonner";

interface CaronaPublishModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPublished?: () => void;
}

export function CaronaPublishModal({
  isOpen,
  onOpenChange,
  onPublished,
}: CaronaPublishModalProps) {
  const [isPending, startTransition] = useTransition();

  const [originCity, setOriginCity] = useState("Chapecó");
  const [destinationCity, setDestinationCity] = useState("Florianópolis");
  const [departureDate, setDepartureDate] = useState(
    new Date(Date.now() + 24 * 3600 * 1000).toISOString().split("T")[0],
  );
  const [departureTime, setDepartureTime] = useState("08:00");
  const [totalSeats, setTotalSeats] = useState(3);
  const [priceReais, setPriceReais] = useState("75,00");
  const [vehicleModel, setVehicleModel] = useState("Carro Próprio");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [womenOnly, setWomenOnly] = useState(false);
  const [notes, setNotes] = useState("Saída pontual. Bagagem média no porta-malas.");

  // Paradas intermediárias
  const [stopsText, setStopsText] = useState("Concórdia, Lages");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const priceCents = Math.round(parseFloat(priceReais.replace(",", ".")) * 100);
    if (isNaN(priceCents) || priceCents < 500) {
      toast.error("Informe um valor por assento válido (mínimo R$ 5,00).");
      return;
    }

    const departureIso = new Date(`${departureDate}T${departureTime}:00`).toISOString();
    if (new Date(departureIso).getTime() <= Date.now()) {
      toast.error("A data/horário de saída deve ser no futuro.");
      return;
    }

    const intermediateCities = stopsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Constrói waypoints
    const allCities = [originCity.trim(), ...intermediateCities, destinationCity.trim()];
    const stepPrice = Math.round(priceCents / (allCities.length - 1));

    const waypoints = allCities.map((city, idx) => ({
      stopOrder: idx,
      cityName: city,
      stateCode: "SC",
      meetingPoint: idx === 0 ? "Centro / Ponto Central" : "Acesso Principal Rodovia",
      cumulativePriceCents: idx === 0 ? 0 : Math.min(priceCents, idx * stepPrice),
    }));

    startTransition(async () => {
      try {
        await publishCaronaRide({
          data: {
            originCity: originCity.trim(),
            destinationCity: destinationCity.trim(),
            departureAt: departureIso,
            totalSeats: Number(totalSeats) || 3,
            fullRoutePriceCents: priceCents,
            womenOnly,
            allowPriceNegotiation: true,
            vehicleModel: vehicleModel.trim() || "Veículo Particular",
            vehiclePlate: vehiclePlate.trim() || undefined,
            notes: notes.trim() || undefined,
            waypoints,
          },
        });

        toast.success("Carona intermunicipal publicada com sucesso!");
        onOpenChange(false);
        onPublished?.();
      } catch (err: any) {
        toast.error(err?.message || "Erro ao publicar carona.");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-lg bg-card border-border/80 p-6 space-y-4">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Users className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Oferecer Carona Intermunicipal
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Compartilhe assentos livres e divida os custos de combustível e pedágio.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cidades Origem e Destino */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Cidade de Origem</Label>
              <Input
                value={originCity}
                onChange={(e) => setOriginCity(e.target.value)}
                required
                className="h-11 min-h-11 rounded-lg text-xs bg-muted/20 border-border/70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                placeholder="Ex: Chapecó"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Cidade de Destino</Label>
              <Input
                value={destinationCity}
                onChange={(e) => setDestinationCity(e.target.value)}
                required
                className="h-11 min-h-11 rounded-lg text-xs bg-muted/20 border-border/70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                placeholder="Ex: Florianópolis"
              />
            </div>
          </div>

          {/* Paradas Intermediárias */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground">
              Paradas pelo Caminho (Cidades separadas por vírgula)
            </Label>
            <Input
              value={stopsText}
              onChange={(e) => setStopsText(e.target.value)}
              className="h-11 min-h-11 rounded-lg text-xs bg-muted/20 border-border/70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              placeholder="Ex: Concórdia, Joaçaba, Lages"
            />
          </div>

          {/* Data e Horário */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Data da Viagem</Label>
              <Input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                required
                className="h-11 min-h-11 rounded-lg text-xs bg-muted/20 border-border/70 font-mono focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Horário de Saída</Label>
              <Input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                required
                className="h-11 min-h-11 rounded-lg text-xs bg-muted/20 border-border/70 font-mono focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              />
            </div>
          </div>

          {/* Vagas e Preço por Assento */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Assentos Disponíveis</Label>
              <Input
                type="number"
                min={1}
                max={6}
                value={totalSeats}
                onChange={(e) => setTotalSeats(parseInt(e.target.value, 10) || 1)}
                required
                className="h-11 min-h-11 rounded-lg text-xs bg-muted/20 border-border/70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Preço por Assento (R$)</Label>
              <Input
                value={priceReais}
                onChange={(e) => setPriceReais(e.target.value)}
                required
                className="h-11 min-h-11 rounded-lg text-xs bg-muted/20 border-border/70 font-bold focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                placeholder="75,00"
              />
            </div>
          </div>

          {/* Veículo e Observações */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Modelo do Veículo</Label>
              <Input
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                className="h-11 min-h-11 rounded-lg text-xs bg-muted/20 border-border/70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                placeholder="Ex: Honda Civic Prata"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Placa (Opcional)</Label>
              <Input
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                className="h-11 min-h-11 rounded-lg text-xs bg-muted/20 border-border/70 uppercase focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                placeholder="ABC-1234"
              />
            </div>
          </div>

          {/* Opção Só Mulheres */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
            <input
              type="checkbox"
              id="carona-women-only"
              checked={womenOnly}
              onChange={(e) => setWomenOnly(e.target.checked)}
              className="size-4 rounded border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            />
            <Label htmlFor="carona-women-only" className="text-xs font-medium cursor-pointer">
              Carona Exclusiva para Mulheres (Condutora e passageiras mulheres)
            </Label>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="h-11 min-h-11 px-6 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  <span>Publicando...</span>
                </div>
              ) : (
                <span>Publicar Carona</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
