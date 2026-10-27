import { useState, useTransition } from "react";
import { Users, Calendar, MapPin, ShieldCheck, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
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
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { bookCaronaSegment, type MatchedCaronaCorridorDTO } from "@/services/carona.functions";
import { toast } from "sonner";

interface CaronaBookModalProps {
  corridor: MatchedCaronaCorridorDTO | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onBooked?: (pin: string) => void;
}

export function CaronaBookModal({
  corridor,
  isOpen,
  onOpenChange,
  onBooked,
}: CaronaBookModalProps) {
  const [isPending, startTransition] = useTransition();
  const [seatsCount, setSeatsCount] = useState(1);
  const [passengerName, setPassengerName] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmedPin, setConfirmedPin] = useState<string | null>(null);

  if (!corridor) return null;

  const totalPriceCents = corridor.segmentPriceCents * seatsCount;

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        const res = await bookCaronaSegment({
          data: {
            rideId: corridor.id,
            fromStopOrder: corridor.matchedFromStopOrder,
            toStopOrder: corridor.matchedToStopOrder,
            fromCity: corridor.matchedOriginCity,
            toCity: corridor.matchedDestinationCity,
            seatsBooked: seatsCount,
            passengerName: passengerName.trim() || undefined,
            initialMessage: notes.trim() || undefined,
          },
        });

        const pin = res.boardingPin || "1000";
        setConfirmedPin(pin);
        toast.success(`Reserva de carona confirmada! Seu PIN de embarque é ${pin}.`);
        onBooked?.(pin);
      } catch (err: any) {
        toast.error(err?.message || "Erro ao reservar vaga na carona.");
      }
    });
  };

  const handleClose = () => {
    setConfirmedPin(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-lg bg-card border-border/80 p-6 space-y-4">
        {confirmedPin ? (
          <div className="text-center py-4 space-y-4 animate-in fade-in">
            <div className="size-14 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-8" />
            </div>

            <div className="space-y-1">
              <DialogTitle className="text-lg font-black text-foreground">
                Vaga Reservada com Sucesso!
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Apresente seu código PIN ao motorista parceiro no momento do embarque.
              </DialogDescription>
            </div>

            {/* PIN de Embarque */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/70 space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase">
                Seu PIN de Embarque
              </span>
              <div className="text-3xl font-mono font-black tracking-widest text-foreground">
                {confirmedPin}
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg border border-border/40">
              <p>
                <strong>Trecho:</strong> {corridor.matchedOriginCity} → {corridor.matchedDestinationCity}
              </p>
              <p>
                <strong>Motorista:</strong> {corridor.driverName} ({corridor.vehicleModel})
              </p>
            </div>

            <Button
              type="button"
              onClick={handleClose}
              className="w-full h-11 min-h-11 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              Concluir e Ver em Minhas Viagens
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Users className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    Confirmar Reserva de Carona
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    {corridor.matchedOriginCity} → {corridor.matchedDestinationCity}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Detalhes da Rota */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/60 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div>
                  <span className="font-bold text-foreground block">{corridor.driverName}</span>
                  <span className="text-xs text-muted-foreground">
                    {corridor.vehicleModel} • {corridor.vehicleColor || "Cor confirmada"}
                  </span>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  Nota {corridor.driverRating.toFixed(1)}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  <span>{formatDate(corridor.departureAt)}</span>
                </span>
                <span>{corridor.availableSeatsForSegment} vagas restantes</span>
              </div>
            </div>

            <form onSubmit={handleConfirmBooking} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Assentos Desejados</Label>
                  <Input
                    type="number"
                    min={1}
                    max={Math.min(corridor.availableSeatsForSegment, 4)}
                    value={seatsCount}
                    onChange={(e) => setSeatsCount(parseInt(e.target.value, 10) || 1)}
                    required
                    className="h-11 min-h-11 rounded-lg text-xs bg-muted/20 border-border/70 font-bold focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Valor Total</Label>
                  <div className="h-11 min-h-11 rounded-lg bg-muted/40 border border-border/60 flex items-center px-3 font-mono font-bold text-sm text-foreground">
                    {formatMoney(totalPriceCents)}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Nome do Passageiro</Label>
                <Input
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  placeholder="Seu nome completo para o condutor"
                  className="h-11 min-h-11 rounded-lg text-xs bg-muted/20 border-border/70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">
                  Mensagem / Ponto de Encontro Combinado (Opcional)
                </Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Vou levar uma mochila; posso embarcar no posto da saída?"
                  className="h-11 min-h-11 rounded-lg text-xs bg-muted/20 border-border/70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
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
                      <span>Reservando...</span>
                    </div>
                  ) : (
                    <span>Confirmar Reserva ({formatMoney(totalPriceCents)})</span>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
