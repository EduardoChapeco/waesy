import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plane, Hotel, Calendar, Users, MapPin, DollarSign, CheckCircle2, FileText, Loader2, Phone, User, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { createManualTrip } from "@/services/travel-lifecycle.functions";

export interface NewTripSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  storeId?: string;
}

export function NewTripSheet({
  open,
  onOpenChange,
  onSuccess,
  storeId,
}: NewTripSheetProps) {
  const [title, setTitle] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [travelStartDate, setTravelStartDate] = useState("");
  const [travelEndDate, setTravelEndDate] = useState("");
  const [adultsCount, setAdultsCount] = useState(2);
  const [childrenCount, setChildrenCount] = useState(0);
  const [totalBrl, setTotalBrl] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientWhatsapp, setClientWhatsapp] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientDocument, setClientDocument] = useState("");
  const [status, setStatus] = useState<"confirmed" | "in_progress" | "completed">("confirmed");
  const [hotelName, setHotelName] = useState("");
  const [airlineName, setAirlineName] = useState("");
  const [flightLocator, setFlightLocator] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setTitle("");
    setDestinationCity("");
    setTravelStartDate("");
    setTravelEndDate("");
    setAdultsCount(2);
    setChildrenCount(0);
    setTotalBrl("");
    setClientName("");
    setClientWhatsapp("");
    setClientEmail("");
    setClientDocument("");
    setStatus("confirmed");
    setHotelName("");
    setAirlineName("");
    setFlightLocator("");
    setNotes("");
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Título da viagem é obrigatório.");
      if (!destinationCity.trim()) throw new Error("Destino é obrigatório.");
      if (!clientName.trim()) throw new Error("Nome do passageiro/cliente é obrigatório.");

      // Parse BRL currency to integer cents
      const cleanedNum = parseFloat(totalBrl.replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
      const totalCents = Math.round(cleanedNum * 100);

      return createManualTrip({
        data: {
          storeId,
          title: title.trim(),
          destinationCity: destinationCity.trim(),
          travelStartDate: travelStartDate || null,
          travelEndDate: travelEndDate || null,
          adultsCount: Number(adultsCount) || 1,
          childrenCount: Number(childrenCount) || 0,
          totalCents,
          clientName: clientName.trim(),
          clientWhatsapp: clientWhatsapp.trim() || null,
          clientEmail: clientEmail.trim() || null,
          clientDocument: clientDocument.trim() || null,
          status,
          notes: notes.trim() || null,
          hotelName: hotelName.trim() || null,
          airlineName: airlineName.trim() || null,
          flightLocator: flightLocator.trim() || null,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(`Viagem ${res.tripNumber} cadastrada com sucesso!`);
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao salvar viagem.");
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
              Operações de Turismo
            </Badge>
          </div>
          <SheetTitle className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
            <Plane className="size-5 text-primary" />
            <span>Registrar Nova Viagem / Reserva</span>
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Cadastre uma viagem confirmada no sistema para emitir vouchers, rooming list e gerenciar PNRs.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* 1. DADOS DA VIAGEM */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-border/40 font-bold text-foreground uppercase tracking-wider text-[11px]">
              <MapPin className="size-3.5 text-primary" />
              <span>Dados do Roteiro e Destino</span>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Título do Roteiro *</Label>
              <Input
                placeholder="Ex: Férias Porto Seguro - Família Silva"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Cidade Destino *</Label>
                <Input
                  placeholder="Ex: Porto Seguro, BA"
                  value={destinationCity}
                  onChange={(e) => setDestinationCity(e.target.value)}
                  className="h-10 rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Status Inicial</Label>
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                  <SelectTrigger className="h-10 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Confirmada</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Data de Partida / Embarque</Label>
                <Input
                  type="date"
                  value={travelStartDate}
                  onChange={(e) => setTravelStartDate(e.target.value)}
                  className="h-10 rounded-lg font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Data de Retorno</Label>
                <Input
                  type="date"
                  value={travelEndDate}
                  onChange={(e) => setTravelEndDate(e.target.value)}
                  className="h-10 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Adultos</Label>
                <Input
                  type="number"
                  min="1"
                  value={adultsCount}
                  onChange={(e) => setAdultsCount(parseInt(e.target.value) || 1)}
                  className="h-10 rounded-lg font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Crianças</Label>
                <Input
                  type="number"
                  min="0"
                  value={childrenCount}
                  onChange={(e) => setChildrenCount(parseInt(e.target.value) || 0)}
                  className="h-10 rounded-lg font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Valor Total (R$)</Label>
                <Input
                  placeholder="Ex: 5.400,00"
                  value={totalBrl}
                  onChange={(e) => setTotalBrl(e.target.value)}
                  className="h-10 rounded-lg font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* 2. DADOS DO CLIENTE / PASSAGEIRO PRINCIPAL */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-border/40 font-bold text-foreground uppercase tracking-wider text-[11px]">
              <User className="size-3.5 text-primary" />
              <span>Passageiro Principal / Contratante</span>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Nome Completo *</Label>
              <Input
                placeholder="Ex: Carlos Eduardo dos Santos"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="h-10 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">WhatsApp / Telefone</Label>
                <Input
                  placeholder="(49) 99999-9999"
                  value={clientWhatsapp}
                  onChange={(e) => setClientWhatsapp(e.target.value)}
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">E-mail</Label>
                <Input
                  type="email"
                  placeholder="carlos@email.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">CPF / Passaporte</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={clientDocument}
                  onChange={(e) => setClientDocument(e.target.value)}
                  className="h-10 rounded-lg font-mono"
                />
              </div>
            </div>
          </div>

          {/* 3. LOGÍSTICA & FORNECEDORES (VOOS & HOSPEDAGEM) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-border/40 font-bold text-foreground uppercase tracking-wider text-[11px]">
              <Hotel className="size-3.5 text-primary" />
              <span>Hospedagem e Localizadores de Voo</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Hotel / Resort Reservado</Label>
                <Input
                  placeholder="Ex: Porto Seguro Eco Bahia Hotel"
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Companhia Aérea</Label>
                <Input
                  placeholder="Ex: LATAM Airlines"
                  value={airlineName}
                  onChange={(e) => setAirlineName(e.target.value)}
                  className="h-10 rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Código Localizador do Voo (PNR)</Label>
              <Input
                placeholder="Ex: JJ9021 / ABC123"
                value={flightLocator}
                onChange={(e) => setFlightLocator(e.target.value)}
                className="h-10 rounded-lg font-mono uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Observações Internas</Label>
              <Textarea
                placeholder="Detalhes sobre transfers, preferências de assento ou solicitações especiais..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="rounded-lg resize-none text-xs"
              />
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t border-border/60 bg-muted/10 flex items-center justify-end gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-lg text-xs font-bold"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="rounded-lg text-xs font-bold gap-2 cursor-pointer shadow-xs"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Registrando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="size-3.5" />
                <span>Salvar Reserva de Viagem</span>
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
