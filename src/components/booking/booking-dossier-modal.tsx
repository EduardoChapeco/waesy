import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MessageSquare,
  ArrowRight,
  RotateCcw,
  Check,
  AlertTriangle,
  FileText,
  DollarSign,
  Ticket,
  Store,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  rescheduleAppointment,
  cancelCustomerAppointment,
  updateAppointmentStatus,
  getAvailableSlots,
} from "@/services/booking.functions";

export interface BookingDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  isStaff?: boolean;
  onUpdated?: () => void;
  onOpenClinicalRecords?: (apptId: string, guestName: string) => void;
}

export function BookingDossierModal({
  isOpen,
  onClose,
  appointment,
  isStaff = false,
  onUpdated,
  onOpenClinicalRecords,
}: BookingDossierModalProps) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"details" | "reschedule" | "cancel">("details");

  // Reschedule state
  const [newDate, setNewDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState("");

  // Cancel state
  const [cancelReason, setCancelReason] = useState("");

  // Slots query for rescheduling
  const serviceId = appointment?.service_id || appointment?.booking_services?.id;
  const resourceId = appointment?.resource_id;

  const { data: slotsResult, isLoading: isLoadingSlots } = useQuery({
    queryKey: ["service-slots", serviceId, newDate, resourceId],
    queryFn: () =>
      getAvailableSlots({
        data: {
          service_id: serviceId,
          date: newDate,
          resource_id: resourceId || undefined,
        },
      }),
    enabled: isOpen && viewMode === "reschedule" && Boolean(serviceId && newDate),
  });

  const slots = slotsResult?.data || [];

  // Mutations
  const rescheduleMutation = useMutation({
    mutationFn: () => {
      if (!selectedSlot) throw new Error("Selecione um novo horário.");
      return rescheduleAppointment({
        data: {
          appointment_id: appointment.id,
          new_scheduled_at: selectedSlot,
          reason: rescheduleReason || undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success("Agendamento remarcado com sucesso!");
      setViewMode("details");
      setSelectedSlot(null);
      setRescheduleReason("");
      queryClient.invalidateQueries({ queryKey: ["customer-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-appointments"] });
      onUpdated?.();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao remarcar agendamento.");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => {
      if (isStaff) {
        return updateAppointmentStatus({
          data: {
            id: appointment.id,
            status: "cancelled",
          },
        });
      }
      return cancelCustomerAppointment({
        data: {
          appointmentId: appointment.id,
          reason: cancelReason || undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success("Agendamento cancelado com sucesso.");
      setViewMode("details");
      setCancelReason("");
      queryClient.invalidateQueries({ queryKey: ["customer-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-appointments"] });
      onUpdated?.();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao cancelar agendamento.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: any) =>
      updateAppointmentStatus({
        data: {
          id: appointment.id,
          status: newStatus,
        },
      }),
    onSuccess: (_data, newStatus) => {
      const msgs: Record<string, string> = {
        checked_in: "Check-in confirmado na recepção!",
        in_service: "Atendimento iniciado!",
        completed: "Atendimento concluído com sucesso!",
        no_show: "Falta registrada (no-show).",
      };
      toast.success(msgs[newStatus] || "Status atualizado!");
      queryClient.invalidateQueries({ queryKey: ["admin-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["customer-appointments"] });
      onUpdated?.();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar status.");
    },
  });

  if (!appointment) return null;

  const dateObj = new Date(appointment.scheduled_at);
  const serviceTitle = appointment.service_title || appointment.booking_services?.title || "Atendimento";
  const storeName = appointment.stores?.name || appointment.store?.name || "Estabelecimento";
  const duration = appointment.duration_minutes || appointment.booking_services?.duration_minutes || 60;
  const price = appointment.price_cents ?? appointment.booking_services?.price_cents ?? 0;
  const resourceName = appointment.booking_resources?.name || "Equipe Geral";
  const modality = appointment.modality || appointment.booking_services?.modality || "in_store";
  const isUpcoming = dateObj >= new Date() && !["cancelled", "completed", "no_show"].includes(appointment.status);
  const isPast = dateObj < new Date() && !["cancelled", "completed", "no_show"].includes(appointment.status);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge variant="success" className="text-xs font-bold">Confirmado</Badge>;
      case "pending":
        return <Badge variant="warning" className="text-xs font-bold">Pendente</Badge>;
      case "checked_in":
        return <Badge variant="outline" className="bg-info/10 text-info border-info/20 text-xs font-bold">Na Recepção</Badge>;
      case "in_service":
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">Em Atendimento</Badge>;
      case "completed":
        return <Badge variant="secondary" className="text-xs font-bold">Concluído</Badge>;
      case "no_show":
        return <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs font-bold">Falta (No-show)</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="text-xs font-bold">Cancelado</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const getModalityLabel = (m: string) => {
    switch (m) {
      case "at_home":
        return "A Domicílio";
      case "online":
        return "Remoto / Online";
      default:
        return "Presencial na Loja";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-lg bg-card border border-border">
        <DialogHeader className="space-y-1 text-left pb-3 border-b border-border/40">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">
              ID: {appointment.id.slice(0, 8).toUpperCase()}
            </span>
            {getStatusBadge(appointment.status)}
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            {serviceTitle}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5 pt-0.5">
            <Store className="size-3.5 text-primary shrink-0" />
            <span className="font-semibold text-foreground">{storeName}</span>
            <span>•</span>
            <span>{getModalityLabel(modality)}</span>
          </DialogDescription>
        </DialogHeader>

        {viewMode === "details" && (
          <div className="space-y-4 py-2">
            {/* 1. Alerta de Agendamento Passado sem Encerramento */}
            {isPast && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>Horário Ultrapassado — Aguardando Fechamento</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  O horário programado para este agendamento já passou. Verifique se o atendimento foi concluído ou se houve falta.
                </p>
              </div>
            )}

            {/* 2. Destaque de Horário e Profissional */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-lg bg-muted/30 border border-border/40 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="size-3.5 text-primary" />
                  <span>Data e Horário</span>
                </div>
                <p className="text-sm font-bold text-foreground">
                  {dateObj.toLocaleDateString("pt-BR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <Clock className="size-3" />
                  <span>
                    {dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ({duration} min)
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-muted/30 border border-border/40 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="size-3.5 text-primary" />
                  <span>Especialista / Recurso</span>
                </div>
                <p className="text-sm font-bold text-foreground">
                  {resourceName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Cliente: <span className="font-semibold text-foreground">{appointment.guest_name || "Cliente"}</span>
                </p>
              </div>
            </div>

            {/* 3. Localização & Endereço */}
            {modality === "in_store" && (
              <div className="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <MapPin className="size-3.5 text-primary" />
                  <span>Local do Atendimento</span>
                </div>
                <p className="text-muted-foreground">
                  {appointment.stores?.address_line || "Endereço sob consulta no estabelecimento."}
                  {appointment.stores?.neighborhood ? `, ${appointment.stores.neighborhood}` : ""}
                  {appointment.stores?.city ? ` — ${appointment.stores.city}/${appointment.stores.state || "SC"}` : ""}
                </p>
              </div>
            )}

            {/* 4. Composição Financeira & Snapshot */}
            <div className="p-3.5 rounded-lg bg-card border border-border/50 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground border-b border-border/30 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="size-3.5 text-primary" />
                  <span>Condição Comercial Contratada</span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {appointment.payment_status === "paid" ? "Pago Antecipado" : appointment.pass_id ? "Crédito de Pacote" : "Pagamento no Local"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Valor do Serviço:</span>
                <span className="text-sm font-mono font-bold text-foreground">
                  {appointment.pass_id ? "Crédito de Pacote Utilizado" : formatMoney(price)}
                </span>
              </div>
              {appointment.pass_id && (
                <div className="flex items-center gap-1 text-[11px] text-primary">
                  <Ticket className="size-3" />
                  <span>Sessão vinculada à carteira de passes do cliente.</span>
                </div>
              )}
            </div>

            {/* 5. Histórico e Políticas Contratadas */}
            <div className="space-y-1.5 text-xs text-muted-foreground">
              {appointment.cancellation_policy && (
                <div className="p-2.5 rounded-lg bg-muted/20 border border-border/30 space-y-0.5">
                  <span className="font-bold text-foreground block">Política de Cancelamento Vigente:</span>
                  <p className="text-[11px] leading-relaxed">{appointment.cancellation_policy}</p>
                </div>
              )}

              {appointment.reschedule_count > 0 && (
                <p className="text-[11px] italic text-muted-foreground">
                  Este agendamento já foi remarcado {appointment.reschedule_count} vez(es).
                </p>
              )}

              {appointment.notes && (
                <div className="p-2.5 rounded-lg bg-muted/20 border border-border/30">
                  <span className="font-bold text-foreground block">Observações:</span>
                  <p className="text-[11px]">{appointment.notes}</p>
                </div>
              )}

              {appointment.cancelled_at && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                  <span className="font-bold block">Detalhes do Cancelamento:</span>
                  <p className="text-[11px]">
                    Cancelado em {new Date(appointment.cancelled_at).toLocaleString("pt-BR")} por {appointment.cancelled_by === "provider" ? "estabelecimento" : "cliente"}.
                    {appointment.cancellation_reason && ` Motivo: ${appointment.cancellation_reason}`}
                  </p>
                </div>
              )}
            </div>

            {/* 6. Barra de Ações Operacionais */}
            <div className="pt-2 flex flex-col gap-2 border-t border-border/40">
              {/* Ações Específicas do Prestador */}
              {isStaff && ["pending", "confirmed"].includes(appointment.status) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 text-xs font-semibold rounded-lg"
                    onClick={() => statusMutation.mutate("checked_in")}
                    disabled={statusMutation.isPending}
                  >
                    Check-in
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 text-xs font-semibold rounded-lg text-primary border-primary/30"
                    onClick={() => statusMutation.mutate("in_service")}
                    disabled={statusMutation.isPending}
                  >
                    Iniciar
                  </Button>
                  <Button
                    size="sm"
                    className="h-10 text-xs font-semibold rounded-lg bg-primary text-primary-foreground"
                    onClick={() => statusMutation.mutate("completed")}
                    disabled={statusMutation.isPending}
                  >
                    Concluir
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-10 text-xs font-semibold rounded-lg text-muted-foreground hover:text-destructive"
                    onClick={() => statusMutation.mutate("no_show")}
                    disabled={statusMutation.isPending}
                  >
                    Falta (No-Show)
                  </Button>
                </div>
              )}

              {isStaff && ["checked_in", "in_service"].includes(appointment.status) && (
                <Button
                  className="w-full h-11 text-xs font-bold rounded-lg bg-primary text-primary-foreground"
                  onClick={() => statusMutation.mutate("completed")}
                  disabled={statusMutation.isPending}
                >
                  <CheckCircle2 className="size-4 mr-1.5" />
                  Concluir Atendimento com Sucesso
                </Button>
              )}

              {/* Ações Comuns (Remarcar / Cancelar / Suporte) */}
              <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                <div className="flex items-center gap-2">
                  {onOpenClinicalRecords && isStaff && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 text-xs font-semibold rounded-lg"
                      onClick={() => {
                        onClose();
                        onOpenClinicalRecords(appointment.id, appointment.guest_name || "Cliente");
                      }}
                    >
                      <FileText className="size-3.5 mr-1 text-primary" />
                      Prontuário
                    </Button>
                  )}

                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-10 text-xs font-semibold rounded-lg text-muted-foreground"
                  >
                    <Link
                      to="/u/suporte"
                      search={{
                        assunto: `Dúvida sobre Agendamento #${appointment.id.slice(0, 6).toUpperCase()}`,
                        contexto: `Agendamento: ${serviceTitle} em ${storeName} para ${dateObj.toLocaleDateString("pt-BR")}`,
                      }}
                    >
                      <HelpCircle className="size-3.5 mr-1" />
                      Suporte
                    </Link>
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {isUpcoming && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 text-xs font-semibold rounded-lg text-rose-600 border-rose-200 dark:border-rose-950 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        onClick={() => setViewMode("cancel")}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="h-10 text-xs font-semibold rounded-lg"
                        onClick={() => setViewMode("reschedule")}
                      >
                        <RotateCcw className="size-3.5 mr-1" />
                        Remarcar Horário
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODO REMARCAR HORÁRIO */}
        {viewMode === "reschedule" && (
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs space-y-1">
              <span className="font-bold text-foreground">Remarcação de Atendimento</span>
              <p className="text-muted-foreground text-[11px]">
                Selecione uma nova data e escolha um dos horários disponíveis. Ao confirmar, seu horário anterior será liberado atomicamente e o novo horário será garantido.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block">Selecione a Nova Data</label>
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={newDate}
                onChange={(e) => {
                  setNewDate(e.target.value);
                  setSelectedSlot(null);
                }}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs font-mono text-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block">Horários Disponíveis</label>
              {isLoadingSlots ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Consultando disponibilidade...
                </div>
              ) : slots.length === 0 ? (
                <div className="p-6 text-center rounded-lg bg-muted/20 border border-border/40 text-xs text-muted-foreground">
                  Nenhum horário disponível para esta data. Selecione outro dia.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto no-scrollbar p-1">
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
                          "h-10 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer flex items-center justify-center",
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

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">Motivo da Remarcação (Opcional)</label>
              <Textarea
                placeholder="Ex: Imprevisto de trânsito, consulta médica..."
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                className="h-16 text-xs rounded-lg"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 rounded-lg text-xs"
                onClick={() => setViewMode("details")}
              >
                Voltar
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-10 rounded-lg text-xs font-bold bg-primary text-primary-foreground"
                disabled={!selectedSlot || rescheduleMutation.isPending}
                onClick={() => rescheduleMutation.mutate()}
              >
                {rescheduleMutation.isPending ? "Remarcando..." : "Confirmar Novo Horário"}
              </Button>
            </div>
          </div>
        )}

        {/* MODO CANCELAR AGENDAMENTO */}
        {viewMode === "cancel" && (
          <div className="space-y-4 py-2">
            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="size-4 shrink-0" />
                <span>Confirmar Cancelamento</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {appointment.pass_id
                  ? "Este agendamento utilizou 1 crédito de sua carteira de passes. Ao confirmar o cancelamento, o crédito será estornado automaticamente."
                  : "Tem certeza de que deseja cancelar este agendamento? O horário será liberado para outros clientes."}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">Motivo do Cancelamento</label>
              <Textarea
                placeholder="Informe o motivo para registro no histórico..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="h-20 text-xs rounded-lg"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 rounded-lg text-xs"
                onClick={() => setViewMode("details")}
              >
                Voltar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-10 rounded-lg text-xs font-bold"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
              >
                {cancelMutation.isPending ? "Cancelando..." : "Confirmar Cancelamento"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
