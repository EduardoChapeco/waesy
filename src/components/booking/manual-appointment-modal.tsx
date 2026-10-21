import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Calendar, Clock, User, Phone, DollarSign, Store, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  listBookingServices,
  listResources,
  getAvailableSlots,
  createManualAppointment,
} from "@/services/booking.functions";

export interface ManualAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialDate?: Date;
}

export function ManualAppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
}: ManualAppointmentModalProps) {
  const queryClient = useQueryClient();

  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedResourceId, setSelectedResourceId] = useState<string>("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    return (initialDate || new Date()).toISOString().split("T")[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"pay_at_location" | "paid">("pay_at_location");
  const [notes, setNotes] = useState("");

  // 1. Carregar serviços ativos da loja
  const { data: servicesRes } = useQuery({
    queryKey: ["booking-services-store"],
    queryFn: () => listBookingServices(),
    enabled: isOpen,
  });
  const services = servicesRes?.data || [];

  // Auto-selecionar primeiro serviço se não houver
  React.useEffect(() => {
    if (services.length > 0 && !selectedServiceId) {
      setSelectedServiceId(services[0].id);
    }
  }, [services, selectedServiceId]);

  // 2. Carregar recursos / profissionais da loja
  const { data: resourcesRes } = useQuery({
    queryKey: ["booking-resources-store"],
    queryFn: () => listResources(),
    enabled: isOpen,
  });
  const resources = resourcesRes?.data || [];

  // 3. Consultar horários disponíveis
  const { data: slotsResult, isLoading: isLoadingSlots } = useQuery({
    queryKey: ["service-slots", selectedServiceId, selectedDate, selectedResourceId],
    queryFn: () =>
      getAvailableSlots({
        data: {
          service_id: selectedServiceId,
          date: selectedDate,
          resource_id: selectedResourceId || undefined,
        },
      }),
    enabled: isOpen && Boolean(selectedServiceId && selectedDate),
  });

  const slots = slotsResult?.data || [];
  const selectedService = services.find((s: any) => s.id === selectedServiceId);

  // 4. Mutação de criação
  const createMutation = useMutation({
    mutationFn: () => {
      const scheduledIso = selectedSlot || `${selectedDate}T14:00:00.000Z`;

      return createManualAppointment({
        data: {
          service_id: selectedServiceId,
          resource_id: selectedResourceId || undefined,
          guest_name: guestName.trim(),
          guest_phone: guestPhone.trim(),
          scheduled_at: scheduledIso,
          payment_status: paymentStatus,
          notes: notes.trim() || undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success("Agendamento cadastrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-appointments"] });
      onSuccess?.();
      handleClose();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao criar agendamento.");
    },
  });

  const handleClose = () => {
    setGuestName("");
    setGuestPhone("");
    setSelectedSlot(null);
    setNotes("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-lg bg-card border border-border">
        <DialogHeader className="space-y-1 text-left pb-3 border-b border-border/40">
          <DialogTitle className="text-base font-bold text-foreground">
            Novo Agendamento Manual (Recepção / Walk-in)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cadastre atendimentos presenciais, telefônicos ou de encaixe garantindo o bloqueio do horário na vitrine.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Dados do Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Nome do Cliente *</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Nome completo ou de chamada"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="pl-9 h-10 text-xs rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">WhatsApp / Telefone *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="(49) 99999-9999"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="pl-9 h-10 text-xs rounded-lg font-mono"
                />
              </div>
            </div>
          </div>

          {/* Seleção do Serviço e Profissional */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Serviço *</Label>
              <select
                value={selectedServiceId}
                onChange={(e) => {
                  setSelectedServiceId(e.target.value);
                  setSelectedSlot(null);
                }}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs font-semibold text-foreground"
              >
                {services.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.duration_minutes || 60} min) — {formatMoney(s.price_cents || 0)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Profissional / Recurso</Label>
              <select
                value={selectedResourceId}
                onChange={(e) => {
                  setSelectedResourceId(e.target.value);
                  setSelectedSlot(null);
                }}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground"
              >
                <option value="">Qualquer Profissional Disponível</option>
                {resources.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Data e Horário */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">Data do Atendimento</Label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedSlot(null);
                }}
                className="h-9 px-3 rounded-lg border border-border bg-background text-xs font-mono text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground block">Horário Disponível *</Label>
              {isLoadingSlots ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Consultando disponibilidade...
                </div>
              ) : slots.length === 0 ? (
                <div className="p-4 text-center rounded-lg bg-muted/20 border border-border/40 text-xs text-muted-foreground">
                  Nenhum horário livre encontrado para este dia.
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto no-scrollbar p-1">
                  {slots.map((slotIso: string) => {
                    const slotTime = new Date(slotIso).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const isSelected = selectedSlot === slotIso;

                    return (
                      <button
                        key={slotIso}
                        type="button"
                        onClick={() => setSelectedSlot(slotIso)}
                        className={cn(
                          "h-9 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer flex items-center justify-center",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-background border-border/60 text-foreground hover:bg-muted/50"
                        )}
                      >
                        {slotTime}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Pagamento & Observações */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Status do Pagamento</Label>
              <select
                value={paymentStatus}
                onChange={(e: any) => setPaymentStatus(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground"
              >
                <option value="pay_at_location">Cobrar na Recepção (Pagar no Local)</option>
                <option value="paid">Já Pago (PIX / Dinheiro / Cartão)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Observações / Detalhes</Label>
              <Input
                placeholder="Ex: Cliente tem alergia a xampu mentolado..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-10 text-xs rounded-lg"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 pt-3 justify-end border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            className="h-10 rounded-lg text-xs font-semibold"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!guestName.trim() || !guestPhone.trim() || !selectedSlot || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            className="h-10 rounded-lg text-xs font-bold bg-primary text-primary-foreground"
          >
            {createMutation.isPending ? "Cadastrando..." : "Confirmar Agendamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
