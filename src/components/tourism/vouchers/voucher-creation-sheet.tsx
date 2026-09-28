import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plane, Building2, Car, Ticket, Shield, Calendar, Clock, User, MapPin, CheckCircle2, Loader2, Luggage } from "lucide-react";
import { toast } from "sonner";
import { createTravelVoucher } from "@/services/travel-vouchers.functions";
import type { VoucherType } from "@/types/travel-vouchers";
import { cn } from "@/lib/utils";

export interface VoucherCreationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  storeId?: string;
  defaultType?: VoucherType;
}

export function VoucherCreationSheet({
  open,
  onOpenChange,
  onSuccess,
  storeId,
  defaultType = "flight",
}: VoucherCreationSheetProps) {
  const [voucherType, setVoucherType] = useState<VoucherType>(defaultType);
  const [title, setTitle] = useState("");
  const [passengerName, setPassengerName] = useState("");
  const [passengerDocument, setPassengerDocument] = useState("");

  // Flight Fields
  const [airline, setAirline] = useState("LATAM Airlines");
  const [flightNumber, setFlightNumber] = useState("");
  const [originAirport, setOriginAirport] = useState("GRU");
  const [destinationAirport, setDestinationAirport] = useState("FLN");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("10:00");
  const [seat, setSeat] = useState("");
  const [cabinClass, setCabinClass] = useState("Econômica");
  const [baggage, setBaggage] = useState("1 mala de mão (10kg)");

  // Hotel Fields
  const [hotelName, setHotelName] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [roomType, setRoomType] = useState("Apartamento Luxo");
  const [boardBasis, setBoardBasis] = useState("All Inclusive");
  const [hotelConfirmation, setHotelConfirmation] = useState("");

  // Transfer Fields
  const [transferVehicle, setTransferVehicle] = useState("Van Executiva");
  const [pickupLocation, setPickupLocation] = useState("Aeroporto");
  const [dropoffLocation, setDropoffLocation] = useState("Hotel");
  const [pickupTime, setPickupTime] = useState("");
  const [driverContact, setDriverContact] = useState("");

  // Notes
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setTitle("");
    setPassengerName("");
    setPassengerDocument("");
    setFlightNumber("");
    setSeat("");
    setHotelName("");
    setHotelConfirmation("");
    setNotes("");
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!passengerName.trim()) throw new Error("Nome do passageiro é obrigatório.");

      let defaultTitle = title.trim();
      if (!defaultTitle) {
        if (voucherType === "flight") defaultTitle = `Cartão de Embarque: ${airline} (${originAirport} ➔ ${destinationAirport})`;
        else if (voucherType === "hotel") defaultTitle = `Voucher de Hospedagem: ${hotelName || "Hotel & Resort"}`;
        else if (voucherType === "transfer") defaultTitle = `Voucher de Transfer: ${pickupLocation} ➔ ${dropoffLocation}`;
        else defaultTitle = `Voucher Oficial de Serviço`;
      }

      const flight_data = voucherType === "flight" ? {
        airline,
        flightNumber,
        origin: originAirport,
        destination: destinationAirport,
        departureDate,
        departureTime,
        seat: seat || "Assento no Check-in",
        cabinClass,
        baggage,
        notes,
      } : undefined;

      const hotel_data = voucherType === "hotel" ? {
        hotelName,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        roomType,
        boardBasis,
        confirmationCode: hotelConfirmation,
        notes,
      } : undefined;

      const transfer_data = voucherType === "transfer" ? {
        vehicleType: transferVehicle,
        pickupLocation,
        dropoffLocation,
        pickupTime,
        driverContact,
        notes,
      } : undefined;

      return createTravelVoucher({
        data: {
          store_id: storeId,
          voucher_type: voucherType,
          title: defaultTitle,
          passenger_name: passengerName.trim(),
          passenger_document: passengerDocument.trim() || null,
          flight_data,
          hotel_data,
          transfer_data,
        },
      });
    },
    onSuccess: () => {
      toast.success("Voucher oficial emitido com sucesso!");
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao emitir voucher.");
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        size="wide"
        className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-0 flex flex-col bg-background border-l border-border/80 overflow-hidden"
      >
        <SheetHeader className="p-6 pb-4 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] font-mono font-bold bg-primary/10 text-primary border-primary/20">
              Boarding Pass e Voucher
            </Badge>
          </div>
          <SheetTitle className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
            <Ticket className="size-5 text-primary" />
            <span>Emitir Voucher Oficial</span>
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Gere um voucher personalizado com QR Code de validação, dados de reserva e cartão de embarque.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* 1. SELETOR DE MODALIDADE DE VOUCHER */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Tipo de Documento / Serviço</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setVoucherType("flight")}
                className={cn(
                  "p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer text-center",
                  voucherType === "flight"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                    : "border-border/70 hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <Plane className="size-4" />
                <span className="text-[11px]">Aéreo / Voo</span>
              </button>

              <button
                type="button"
                onClick={() => setVoucherType("hotel")}
                className={cn(
                  "p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer text-center",
                  voucherType === "hotel"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                    : "border-border/70 hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <Building2 className="size-4" />
                <span className="text-[11px]">Hospedagem</span>
              </button>

              <button
                type="button"
                onClick={() => setVoucherType("transfer")}
                className={cn(
                  "p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer text-center",
                  voucherType === "transfer"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                    : "border-border/70 hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <Car className="size-4" />
                <span className="text-[11px]">Transfer</span>
              </button>
            </div>
          </div>

          {/* 2. DADOS DO PASSAGEIRO */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 pb-1 border-b border-border/40 font-bold text-foreground uppercase tracking-wider text-[11px]">
              <User className="size-3.5 text-primary" />
              <span>Passageiro Titular</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome Completo do Passageiro *</Label>
              <Input
                placeholder="Ex: Carlos Eduardo dos Santos"
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">CPF ou Passaporte</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={passengerDocument}
                  onChange={(e) => setPassengerDocument(e.target.value)}
                  className="h-10 rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Título Personalizado (Opcional)</Label>
                <Input
                  placeholder="Ex: Voo São Paulo ➔ Florianópolis"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* 3. DADOS ESPECÍFICOS: AÉREO */}
          {voucherType === "flight" && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40 font-bold text-foreground uppercase tracking-wider text-[11px]">
                <Plane className="size-3.5 text-primary" />
                <span>Detalhes do Voo e Cartão de Embarque</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Cia Aérea</Label>
                  <Input
                    placeholder="Ex: LATAM Airlines"
                    value={airline}
                    onChange={(e) => setAirline(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Nº do Voo</Label>
                  <Input
                    placeholder="Ex: LA 3450"
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value)}
                    className="h-10 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Origem (IATA / Cidade)</Label>
                  <Input
                    placeholder="Ex: GRU"
                    value={originAirport}
                    onChange={(e) => setOriginAirport(e.target.value.toUpperCase())}
                    className="h-10 rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Destino (IATA / Cidade)</Label>
                  <Input
                    placeholder="Ex: FLN"
                    value={destinationAirport}
                    onChange={(e) => setDestinationAirport(e.target.value.toUpperCase())}
                    className="h-10 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Data do Voo</Label>
                  <Input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="h-10 rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Horário de Embarque</Label>
                  <Input
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="h-10 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Poltrona / Assento</Label>
                  <Input
                    placeholder="Ex: 14A"
                    value={seat}
                    onChange={(e) => setSeat(e.target.value.toUpperCase())}
                    className="h-10 rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Classe</Label>
                  <Input
                    placeholder="Econômica"
                    value={cabinClass}
                    onChange={(e) => setCabinClass(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Franquia Bagagem</Label>
                  <Input
                    placeholder="10kg mão"
                    value={baggage}
                    onChange={(e) => setBaggage(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. DADOS ESPECÍFICOS: HOSPEDAGEM */}
          {voucherType === "hotel" && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40 font-bold text-foreground uppercase tracking-wider text-[11px]">
                <Building2 className="size-3.5 text-primary" />
                <span>Detalhes da Hospedagem e Quarto</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome do Hotel ou Resort *</Label>
                <Input
                  placeholder="Ex: Ocean Palace All Inclusive Resort"
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Check-In</Label>
                  <Input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="h-10 rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Check-Out</Label>
                  <Input
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="h-10 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Categoria do Quarto</Label>
                  <Input
                    placeholder="Ex: Suíte Vista Mar"
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Regime Alimentar</Label>
                  <Select value={boardBasis} onValueChange={setBoardBasis}>
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All Inclusive">All Inclusive (Tudo Incluso)</SelectItem>
                      <SelectItem value="Pensão Completa">Pensão Completa</SelectItem>
                      <SelectItem value="Meia Pensão">Meia Pensão</SelectItem>
                      <SelectItem value="Café da Manhã">Café da Manhã</SelectItem>
                      <SelectItem value="Só Hospedagem">Só Hospedagem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Localizador / Código da Reserva</Label>
                <Input
                  placeholder="Ex: HTL-998822"
                  value={hotelConfirmation}
                  onChange={(e) => setHotelConfirmation(e.target.value)}
                  className="h-10 rounded-xl font-mono uppercase"
                />
              </div>
            </div>
          )}

          {/* 3. DADOS ESPECÍFICOS: TRANSFER */}
          {voucherType === "transfer" && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40 font-bold text-foreground uppercase tracking-wider text-[11px]">
                <Car className="size-3.5 text-primary" />
                <span>Detalhes do Receptivo e Transfer</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Local de Embarque</Label>
                  <Input
                    placeholder="Ex: Aeroporto Internacional"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Destino do Desembarque</Label>
                  <Input
                    placeholder="Ex: Hotel / Pousada"
                    value={dropoffLocation}
                    onChange={(e) => setDropoffLocation(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Tipo de Veículo</Label>
                  <Input
                    placeholder="Ex: Van Executiva"
                    value={transferVehicle}
                    onChange={(e) => setTransferVehicle(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Contato do Motorista / Plantão</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={driverContact}
                    onChange={(e) => setDriverContact(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. OBSERVAÇÕES & ORIENTAÇÕES */}
          <div className="space-y-1.5 pt-2">
            <Label className="text-xs font-semibold">Orientações de Embarque e Observações</Label>
            <Textarea
              placeholder="Instruções sobre check-in, documentos exigidos ou pontos de encontro..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded-xl resize-none text-xs"
            />
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t border-border/60 bg-muted/10 flex items-center justify-end gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs font-bold"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Emitindo Voucher...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="size-3.5" />
                <span>Emitir Voucher Oficial</span>
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
