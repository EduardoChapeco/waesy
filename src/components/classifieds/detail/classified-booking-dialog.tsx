import { Link } from "@tanstack/react-router";
import { Calendar, Users, Check, MapPin, Loader2, AlertTriangle, Clock, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/money";
import { DEPARTURE_STATUS_CONFIG, type DepartureOption } from "@/lib/classifieds/canonical-airports";
import { cn } from "@/lib/utils";

interface ClassifiedBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewerContext: string;
  classified: any;
  isTravelPackage: boolean;
  departureOptions: DepartureOption[];
  selectedDeparture: DepartureOption | null;
  setSelectedDeparture: (opt: DepartureOption) => void;
  boardingGateways: string[];
  selectedBoardingPoint: string;
  setSelectedBoardingPoint: (point: string) => void;
  flightDetails: any;
  travelPassengers: number;
  setTravelPassengers: (n: number) => void;
  isPerPerson: boolean;
  effectiveTravelUnitPriceCents: number;
  travelTotalCents: number;
  maxInstallments: number;
  travelInstallmentCents: number;
  handleDirectBooking: () => Promise<void>;
  isBooking: boolean;
  checkInDate: string;
  setCheckInDate: (date: string) => void;
  checkOutDate: string;
  setCheckOutDate: (date: string) => void;
  bookingGuests: number;
  setBookingGuests: (n: number) => void;
  bookedDates: any[];
  isDateRangeOverlapping: boolean;
  dailyRateCents: number;
  nightsCount: number;
  cleaningFeeCents: number;
  bookingTotalCents: number;
  isService?: boolean;
  serviceAppointmentDate?: string;
  setServiceAppointmentDate?: (d: string) => void;
  serviceAppointmentTime?: string;
  setServiceAppointmentTime?: (t: string) => void;
  serviceAppointmentNotes?: string;
  setServiceAppointmentNotes?: (n: string) => void;
}

export function ClassifiedBookingDialog({
  open,
  onOpenChange,
  viewerContext,
  classified,
  isTravelPackage,
  departureOptions,
  selectedDeparture,
  setSelectedDeparture,
  boardingGateways,
  selectedBoardingPoint,
  setSelectedBoardingPoint,
  flightDetails,
  travelPassengers,
  setTravelPassengers,
  isPerPerson,
  effectiveTravelUnitPriceCents,
  travelTotalCents,
  maxInstallments,
  travelInstallmentCents,
  handleDirectBooking,
  isBooking,
  checkInDate,
  setCheckInDate,
  checkOutDate,
  setCheckOutDate,
  bookingGuests,
  setBookingGuests,
  bookedDates,
  isDateRangeOverlapping,
  dailyRateCents,
  nightsCount,
  cleaningFeeCents,
  bookingTotalCents,
  isService = false,
  serviceAppointmentDate = "",
  setServiceAppointmentDate,
  serviceAppointmentTime = "09:00",
  setServiceAppointmentTime,
  serviceAppointmentNotes = "",
  setServiceAppointmentNotes,
}: ClassifiedBookingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-lg max-h-screen overflow-y-auto">
        {viewerContext === "anonymous" ? (
          <div className="text-center py-6 space-y-4">
            <Calendar className="size-10 text-primary mx-auto" />
            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold">
                Identifique-se para reservar
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Para solicitar sua reserva, faça login na sua conta Waesy.
              </DialogDescription>
            </div>
            <Button
              asChild
              className="w-full h-11 rounded-lg font-bold bg-primary text-primary-foreground text-sm focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Link
                to="/entrar"
                search={{ returnUrl: `/classificados/${classified?.id}` }}
              >
                Entrar na Minha Conta
              </Link>
            </Button>
          </div>
        ) : isTravelPackage ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-bold uppercase tracking-wider text-primary border-primary/25 bg-primary/10">
                  Reserva de Pacote
                </Badge>
              </div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Calendar className="size-5 text-primary" />
                <span>Reservar Pacote de Viagem</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Selecione a data de saída confirmada, o ponto de embarque e a quantidade de passageiros.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {departureOptions.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>Opções de Saída Disponíveis *</span>
                    <span className="text-xs font-mono text-muted-foreground font-normal">
                      {departureOptions.length} confirmada(s)
                    </span>
                  </label>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {departureOptions.map((opt, i) => {
                      const cfg = DEPARTURE_STATUS_CONFIG[opt.status] || DEPARTURE_STATUS_CONFIG.confirmed;
                      const depDate = opt.departure_date ? new Date(opt.departure_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "";
                      const retDate = opt.return_date ? new Date(opt.return_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "";
                      const isSelected = selectedDeparture ? selectedDeparture.id === opt.id : i === 0;
                      return (
                        <div
                          key={opt.id || i}
                          onClick={() => setSelectedDeparture(opt)} /* focus-visible: */
                          className={cn(
                            "p-3 rounded-lg border text-left transition-colors cursor-pointer flex flex-col gap-2",
                            isSelected
                              ? "border-primary ring-2 ring-primary/25 bg-primary/5"
                              : "border-border/70 hover:border-primary/40 bg-card"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-foreground">
                                {opt.label || `Opção ${i + 1}`}
                              </span>
                              {isSelected && (
                                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full flex items-center gap-1">
                                  <Check className="size-3" /> Selecionada
                                </span>
                              )}
                              <span className={cn("text-xs font-bold px-2 py-1 rounded-full border", cfg.color)}>
                                {cfg.icon} {cfg.label}
                              </span>
                            </div>
                            {opt.price_override_cents && opt.price_override_cents > 0 ? (
                              <span className="font-mono font-bold text-xs text-foreground">
                                {formatMoney(opt.price_override_cents)}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {depDate}{depDate && retDate && " — "}{retDate}
                            {opt.departure_time && <span className="font-mono ml-1 font-semibold text-foreground">• Embarque: {opt.departure_time}</span>}
                          </p>
                          {opt.available_seats !== undefined && opt.available_seats > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {opt.available_seats} vagas restantes
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(boardingGateways.length > 0 || flightDetails?.meeting_point) && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground flex items-center gap-2">
                    <MapPin className="size-3.5 text-primary" />
                    <span>Local de Embarque / Ponto de Encontro *</span>
                  </label>
                  {boardingGateways.length > 0 ? (
                    <select
                      value={selectedBoardingPoint || boardingGateways[0]}
                      onChange={(e) => setSelectedBoardingPoint(e.target.value)}
                      className="w-full h-11 rounded-lg text-xs bg-background border border-border px-3 font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {boardingGateways.map((gw, idx) => (
                        <option key={idx} value={gw}>
                          {gw}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={selectedBoardingPoint}
                      onChange={(e) => setSelectedBoardingPoint(e.target.value)}
                      placeholder={flightDetails?.meeting_point || "Informe a cidade ou ponto de embarque..."}
                      className="h-11 rounded-lg text-xs bg-background"
                    />
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="size-3.5 text-primary" />
                    <span>Número de Viajantes (Passageiros)</span>
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {travelPassengers} {travelPassengers === 1 ? "passageiro" : "passageiros"}
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={selectedDeparture?.available_seats || 10}
                    value={travelPassengers}
                    onChange={(e) => setTravelPassengers(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-11 rounded-lg text-xs bg-background font-mono w-28 text-center font-bold"
                  />
                  <div className="text-xs text-muted-foreground flex-1">
                    {selectedDeparture?.available_seats ? (
                      <span>Até {selectedDeparture.available_seats} assentos disponíveis nesta saída</span>
                    ) : (
                      <span>Vagas limitadas por ordem de confirmação</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-2 text-xs">
                {isPerPerson ? (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Valor por pessoa</span>
                      <span className="font-mono font-medium text-foreground">
                        {formatMoney(effectiveTravelUnitPriceCents)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Viajantes</span>
                      <span className="font-mono font-medium text-foreground">
                        × {travelPassengers}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Valor Base do Pacote</span>
                      <span className="font-mono font-medium text-foreground">
                        {formatMoney(effectiveTravelUnitPriceCents)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Viajantes Inclusos</span>
                      <span className="font-mono font-medium text-foreground">
                        {travelPassengers} {travelPassengers === 1 ? "passageiro" : "passageiros"}
                      </span>
                    </div>
                  </>
                )}
                <div className="pt-2 border-t border-border flex justify-between items-baseline font-bold text-sm text-foreground">
                  <div>
                    <span>Total do Pacote</span>
                    {maxInstallments > 1 && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        em até {maxInstallments}x de {formatMoney(travelInstallmentCents)}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-primary text-base font-bold">
                    {formatMoney(travelTotalCents)}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleDirectBooking} /* focus-visible: */
                disabled={isBooking}
                className="w-full h-11 rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isBooking ? (
                  <>
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    <span>Enviando Solicitação de Reserva...</span>
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    <span>Confirmar Reserva — {formatMoney(travelTotalCents)}</span>
                  </>
                )}
              </Button>
            </div>
          </>
        ) : isService ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-bold uppercase tracking-wider text-primary border-primary/25 bg-primary/10">
                  Agendamento de Serviço
                </Badge>
              </div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Clock className="size-5 text-primary" />
                <span>Solicitar Horário de Atendimento</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Escolha a data desejada, o melhor horário comercial e informe detalhes para o prestador.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Resumo do Serviço */}
              <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1.5">
                <span className="text-xs font-bold text-foreground block truncate">
                  {classified?.title}
                </span>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-primary font-mono">
                    {classified?.price_cents && classified.price_cents > 0 ? formatMoney(classified.price_cents) : "Sob Consulta"}
                  </span>
                  <span>•</span>
                  <span>Duração: {classified?.service_duration_minutes || classified?.attributes?.service_duration_minutes || 60} min</span>
                  {classified?.attributes?.modality && (
                    <>
                      <span>•</span>
                      <span>
                        {classified.attributes.modality === "remoto" ? "Online / Remoto" : classified.attributes.modality === "domicilio" ? "A Domicílio" : "Presencial"}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Data do Agendamento */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Data do Atendimento *
                </label>
                <Input
                  type="date"
                  value={serviceAppointmentDate}
                  onChange={(e) => setServiceAppointmentDate?.(e.target.value)}
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
                {Array.isArray(classified?.attributes?.available_weekdays) && classified.attributes.available_weekdays.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Dias de atendimento: {classified.attributes.available_weekdays.join(", ")}
                  </p>
                )}
              </div>

              {/* Horário Comercial */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Horário Preferencial *
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                  {["08:00", "09:00", "10:00", "11:00", "13:30", "14:30", "15:30", "16:30", "17:30"].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setServiceAppointmentTime?.(slot)}
                      className={cn(
                        "h-10 rounded-lg text-xs font-mono font-semibold transition-colors border cursor-pointer",
                        serviceAppointmentTime === slot
                          ? "bg-primary text-primary-foreground border-primary font-bold shadow-sm"
                          : "bg-card text-muted-foreground border-border/70 hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Observações / Descrição do Pedido */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Detalhes do Atendimento / Observações (Opcional)
                </label>
                <Textarea
                  value={serviceAppointmentNotes}
                  onChange={(e) => setServiceAppointmentNotes?.(e.target.value)}
                  placeholder="Descreva o que precisa ser feito ou detalhes sobre o local..."
                  rows={3}
                  className="rounded-lg text-xs bg-background"
                />
              </div>

              {/* Botão de Confirmação */}
              <Button
                type="button"
                onClick={handleDirectBooking}
                disabled={isBooking || !serviceAppointmentDate}
                className="w-full h-12 rounded-lg font-bold text-sm bg-primary text-primary-foreground shadow-sm hover:opacity-95 active:scale-98 transition-all gap-2 cursor-pointer"
              >
                {isBooking ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Enviando Agendamento...</span>
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    <span>Confirmar Solicitação de Agendamento</span>
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Calendar className="size-5 text-primary" />
                <span>Reservar Hospedagem por Diária</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Selecione as datas de check-in e check-out para confirmar sua estadia.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">
                    Check-in *
                  </label>
                  <Input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="h-11 rounded-lg text-xs bg-background font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">
                    Check-out *
                  </label>
                  <Input
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="h-11 rounded-lg text-xs bg-background font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Número de Hóspedes
                </label>
                <Input
                  type="number"
                  min={1}
                  max={classified?.max_guests || 10}
                  value={bookingGuests}
                  onChange={(e) => setBookingGuests(parseInt(e.target.value) || 1)}
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
              </div>

              {bookedDates.length > 0 && (
                <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-1">
                  <span className="font-semibold text-muted-foreground flex items-center gap-2">
                    <Calendar className="size-3.5 text-amber-500 shrink-0" />
                    Datas já reservadas neste anúncio:
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {bookedDates.slice(0, 4).map((b: any, i: number) => (
                      <span key={i} className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono text-xs">
                        {b.startDate} a {b.endDate}
                      </span>
                    ))}
                    {bookedDates.length > 4 && (
                      <span className="text-xs text-muted-foreground self-center">
                        +{bookedDates.length - 4} período(s)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {isDateRangeOverlapping && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>As datas selecionadas coincidem com uma reserva já confirmada. Por favor, escolha outro período.</span>
                </div>
              )}

              <div className="p-4 rounded-lg bg-muted/40 space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    {formatMoney(dailyRateCents)} × {nightsCount} diária(s)
                  </span>
                  <span className="font-mono font-medium text-foreground">
                    {formatMoney(dailyRateCents * nightsCount)}
                  </span>
                </div>
                {cleaningFeeCents > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxa única de limpeza</span>
                    <span className="font-mono font-medium text-foreground">
                      {formatMoney(cleaningFeeCents)}
                    </span>
                  </div>
                )}
                <div className="pt-2 flex justify-between font-bold text-sm text-foreground">
                  <span>Total Estimado</span>
                  <span className="font-mono text-primary">
                    {formatMoney(bookingTotalCents)}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleDirectBooking} /* focus-visible: */
                disabled={isBooking || isDateRangeOverlapping}
                className={cn(
                  "w-full h-11 rounded-lg text-xs font-bold gap-2 focus-visible:ring-2 focus-visible:ring-ring",
                  isDateRangeOverlapping ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                )}
              >
                {isBooking ? (
                  <>
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    <span>Confirmando Reserva...</span>
                  </>
                ) : isDateRangeOverlapping ? (
                  <span>Período Indisponível (Já Reservado)</span>
                ) : (
                  <>
                    <Check className="size-4" />
                    <span>Confirmar Reserva de {formatMoney(bookingTotalCents)}</span>
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
