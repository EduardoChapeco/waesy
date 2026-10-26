import * as React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bus, Clock, MapPin, Users, Ticket, ArrowRight, CheckCircle2, Calendar, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  listIntercityBusSchedules,
  bookIntercityBusTicket,
  type IntercityBusScheduleDTO,
} from "@/services/carona.functions";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface BusTicketResultsRailProps {
  originCity?: string;
  destinationCity?: string;
  travelDate?: string;
  className?: string;
  title?: string;
  onSelectSchedule?: (schedule: IntercityBusScheduleDTO) => void;
}

export function BusTicketResultsRail({
  originCity = "",
  destinationCity = "",
  travelDate = "",
  className,
  title = "Passagens de Ônibus Intermunicipais",
  onSelectSchedule,
}: BusTicketResultsRailProps) {
  const [selectedSchedule, setSelectedSchedule] = useState<IntercityBusScheduleDTO | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [passengerName, setPassengerName] = useState("");
  const [passengerDoc, setPassengerDoc] = useState("");
  const [selectedSeat, setSelectedSeat] = useState<number>(12);
  const [isBooking, setIsBooking] = useState(false);

  const effectiveDate = travelDate || new Date().toISOString().slice(0, 10);

  const {
    data: schedules = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["intercity-bus-schedules", originCity, destinationCity, effectiveDate],
    queryFn: () =>
      listIntercityBusSchedules({
        data: {
          originCity: originCity || undefined,
          destinationCity: destinationCity || undefined,
          travelDate: effectiveDate,
        },
      }),
  });

  const handleOpenBooking = (sched: IntercityBusScheduleDTO) => {
    setSelectedSchedule(sched);
    setSelectedSeat(Math.floor(Math.random() * 20) + 1);
    setIsBookingModalOpen(true);
    if (onSelectSchedule) {
      onSelectSchedule(sched);
    }
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule) return;

    if (!passengerName.trim() || !passengerDoc.trim()) {
      toast.error("Informe nome e CPF do passageiro para emissão do bilhete.");
      return;
    }

    setIsBooking(true);
    try {
      await bookIntercityBusTicket({
        data: {
          scheduleId: String(selectedSchedule.id),
          passengerName: passengerName.trim(),
          passengerDocument: passengerDoc.trim(),
          seatNumber: selectedSeat,
          travelDate: effectiveDate,
          boardingCity: selectedSchedule.matched_boarding_city || selectedSchedule.origin_city,
          alightingCity: selectedSchedule.matched_alighting_city || selectedSchedule.destination_city,
          pricePaidCents: Number(selectedSchedule.matched_price_cents || selectedSchedule.price_cents || 5000),
        },
      });

      toast.success("Bilhete emitido com sucesso! Consulte seus vouchers na área do cliente.");
      setIsBookingModalOpen(false);
      setPassengerName("");
      setPassengerDoc("");
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao processar reserva da passagem.");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Bus className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground tracking-tight">{title}</h3>
            <p className="text-xs text-muted-foreground">Linhas regulares com reserva direta e garantia de assento</p>
          </div>
        </div>
        <Badge variant="outline" className="h-6 px-2 text-2xs font-mono font-semibold">
          {schedules.length} {schedules.length === 1 ? "linha" : "linhas"}
        </Badge>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border/60 bg-card p-4 space-y-3 animate-pulse motion-reduce:animate-none"
            >
              <div className="h-4 w-32 bg-muted rounded-md" />
              <div className="h-6 w-48 bg-muted rounded-md" />
              <div className="h-10 w-full bg-muted rounded-lg" />
            </div>
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="rounded-lg border border-border/60 bg-card p-8 text-center space-y-2">
          <Bus className="size-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-semibold text-foreground">Nenhuma linha de ônibus encontrada</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Consulte rotas entre as principais cidades da região ou faça uma cotação sob medida com agências locais.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schedules.map((sched) => {
            const price = sched.matched_price_cents || sched.price_cents || 0;
            const departure = sched.matched_departure_time || sched.departure_time;
            const origin = sched.matched_boarding_city || sched.origin_city;
            const dest = sched.matched_alighting_city || sched.destination_city;

            return (
              <div
                key={sched.id}
                className="group relative rounded-lg border border-border/60 bg-card p-4 space-y-3 shadow-2xs hover:border-foreground/30 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-primary font-mono">
                      {sched.operator_name}
                    </span>
                    <Badge variant="secondary" className="text-3xs font-semibold px-2 py-1">
                      {sched.service_class || "Convencional"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between py-1 border-y border-border/40">
                    <div className="space-y-1">
                      <span className="text-xs font-mono font-bold text-muted-foreground">Saída</span>
                      <p className="text-sm font-black text-foreground">{departure}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-28">{origin}</p>
                    </div>

                    <div className="flex flex-col items-center px-2">
                      <span className="text-3xs font-mono text-muted-foreground">
                        {Math.floor((sched.duration_minutes || 120) / 60)}h {(sched.duration_minutes || 120) % 60}m
                      </span>
                      <ArrowRight className="size-4 text-muted-foreground my-1" />
                      <span className="text-3xs text-muted-foreground">Direto</span>
                    </div>

                    <div className="space-y-1 text-right">
                      <span className="text-xs font-mono font-bold text-muted-foreground">Chegada</span>
                      <p className="text-sm font-black text-foreground">{sched.arrival_time}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-28">{dest}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3 border-t border-border/30">
                  <div>
                    <span className="text-3xs text-muted-foreground block">Tarifa por assento</span>
                    <span className="text-base font-black font-mono text-foreground">
                      {formatMoney(price)}
                    </span>
                  </div>

                  <Button
                    type="button"
                    onClick={() => handleOpenBooking(sched)}
                    className="h-11 min-h-11 px-4 rounded-lg font-bold text-xs bg-foreground text-background hover:bg-foreground/90 gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Ticket className="size-4" />
                    <span>Comprar</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Reserva de Passagem (Apple HIG Sheet / Dialog) */}
      <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
        <DialogContent className="sm:max-w-md rounded-lg p-6 bg-card">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-bold text-foreground">
              Reserva de Passagem de Ônibus
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Confirme os dados do passageiro para emissão do voucher oficial e garantia de assento.
            </DialogDescription>
          </DialogHeader>

          {selectedSchedule && (
            <form onSubmit={handleConfirmBooking} className="space-y-4 pt-2">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold">
                  <span>{selectedSchedule.operator_name}</span>
                  <span className="font-mono text-primary">
                    {formatMoney(selectedSchedule.matched_price_cents || selectedSchedule.price_cents || 0)}
                  </span>
                </div>
                <div className="text-muted-foreground flex items-center justify-between">
                  <span>
                    {selectedSchedule.matched_boarding_city || selectedSchedule.origin_city} →{" "}
                    {selectedSchedule.matched_alighting_city || selectedSchedule.destination_city}
                  </span>
                  <span className="font-mono">
                    {selectedSchedule.matched_departure_time || selectedSchedule.departure_time}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1 text-2xs text-muted-foreground">
                  <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
                  <span>Embarque com documento com foto direto na plataforma</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="passenger-name" className="text-xs font-semibold">
                  Nome Completo do Passageiro
                </Label>
                <Input
                  id="passenger-name"
                  placeholder="Nome idêntico ao RG ou CNH"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  required
                  className="h-11 min-h-11 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passenger-doc" className="text-xs font-semibold">
                  CPF ou Documento de Identidade
                </Label>
                <Input
                  id="passenger-doc"
                  placeholder="000.000.000-00"
                  value={passengerDoc}
                  onChange={(e) => setPassengerDoc(e.target.value)}
                  required
                  className="h-11 min-h-11 text-xs rounded-lg font-mono"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Poltrona Selecionada</Label>
                  <span className="text-xs font-mono font-bold text-primary">Assento #{selectedSeat}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[12, 14, 15, 18].map((seat) => (
                    <button
                      key={seat}
                      type="button"
                      onClick={() => setSelectedSeat(seat)}
                      className={cn(
                        "h-11 min-h-11 rounded-lg border text-xs font-mono font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selectedSeat === seat
                          ? "bg-foreground text-background border-foreground shadow-xs"
                          : "bg-card text-muted-foreground border-border/70 hover:bg-muted/60"
                      )}
                    >
                      #{seat}
                    </button>
                  ))}
                </div>
              </div>

              <DialogFooter className="pt-2 gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isBooking}
                  className="h-11 min-h-11 px-5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
                >
                  {isBooking ? "Emitindo Bilhete..." : "Confirmar e Pagar"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
