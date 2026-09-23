import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
 Calendar as CalendarIcon,
 Clock,
 CheckCircle2,
 FileText,
 Play,
 Ticket,
 ChevronLeft,
 ChevronRight,
 DollarSign,
 Users,
 MessageCircle,
 Smartphone,
} from "lucide-react";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { DigitalCompanionCard } from "@/components/documents/digital-companion-card";
import { format, addDays, subDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { playCashRegisterSound } from "@/lib/audio-chimes";

import {
 listAppointments,
 updateAppointmentStatus,
 listClinicalRecords,
 addClinicalRecord,
} from "@/services/booking.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/commerce/page-header";
import {
 Sheet,
 SheetContent,
 SheetDescription,
 SheetHeader,
 SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/agenda/")({
 head: () => ({ meta: [{ title: "Agenda & Atendimentos | Workspace Waesy" }] }),
 component: AdminAppointmentsPage,
});

function ClinicalRecordDrawer({
 appointmentId,
 isOpen,
 onClose,
 guestName,
}: {
 appointmentId: string | null;
 isOpen: boolean;
 onClose: () => void;
 guestName: string;
}) {
 const queryClient = useQueryClient();
 const [content, setContent] = useState("");

 const { data: recordsRes, isLoading } = useQuery({
 queryKey: ["clinical-records", appointmentId],
 queryFn: () => listClinicalRecords({ data: { appointment_id: appointmentId! } }),
 enabled: !!appointmentId,
 });

 const addMutation = useMutation({
 mutationFn: async (text: string) => {
 return await addClinicalRecord({
 data: { appointment_id: appointmentId!, record_type: "anamnesis", content: text },
 });
 },
 onSuccess: () => {
 toast.success("Evolução salva!");
 setContent("");
 queryClient.invalidateQueries({ queryKey: ["clinical-records", appointmentId] });
 },
 onError: (e: any) => toast.error(e.message || "Erro ao salvar evolução"),
 });

 const records = recordsRes?.data || [];

 return (
 <Sheet open={isOpen} onOpenChange={(val) => !val && onClose()}>
 <SheetContent size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] flex flex-col h-full bg-card">
 <SheetHeader className="pb-3 ">
 <SheetTitle className="text-base font-bold text-foreground">Prontuário & Evolução</SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground">Histórico de atendimento de {guestName}</SheetDescription>
 </SheetHeader>
 <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-3">
 {isLoading ? (
 <p className="text-xs text-muted-foreground">Carregando histórico...</p>
 ) : records.length === 0 ? (
 <div className="p-6 text-center border-0 rounded-xl bg-muted/20">
 <p className="text-xs text-muted-foreground">Nenhum registro anterior encontrado.</p>
 </div>
 ) : (
 records.map((r: any) => (
 <div key={r.id} className="bg-muted/40 p-3.5 rounded-xl text-xs space-y-1.5">
 <div className="flex justify-between items-center text-[11px] text-muted-foreground font-mono">
 <span>{format(new Date(r.created_at), "dd/MM/yyyy HH:mm")}</span>
 <span>{r.author?.email || "Profissional"}</span>
 </div>
 <p className="whitespace-pre-wrap text-foreground">{r.content}</p>
 </div>
 ))
 )}
 </div>
 <div className="pt-3 mt-auto space-y-2">
 <label className="text-xs font-bold text-foreground block">Nova Evolução / Anamnese</label>
 <Textarea
 value={content}
 onChange={(e) => setContent(e.target.value)}
 placeholder="Descreva o procedimento realizado, produtos utilizados, observações..."
 className="h-20 text-xs rounded-xl"
 />
 <Button
 className="w-full h-10 rounded-xl text-xs font-bold"
 disabled={!content.trim() || addMutation.isPending}
 onClick={() => addMutation.mutate(content)}
 >
 Salvar Evolução
 </Button>
 </div>
 </SheetContent>
 </Sheet>
 );
}

function AdminAppointmentsPage() {
 const queryClient = useQueryClient();
 const [selectedDate, setSelectedDate] = useState<Date>(new Date());
 const [selectedAppt, setSelectedAppt] = useState<{ id: string; name: string } | null>(null);
 const [companionCardOpen, setCompanionCardOpen] = useState(false);
 const [companionData, setCompanionData] = useState<any>(null);

 const handleOpenCompanion = (appt: any, resourceName: string) => {
 const serviceTitle = appt.booking_services?.title || "Atendimento";
 const dateFormatted = format(new Date(appt.scheduled_at), "dd/MM/yyyy 'às' HH:mm");
 const duration = `${appt.duration_minutes || 60} minutos`;
 const priceFormatted = appt.booking_services?.price_cents ? formatMoney(appt.booking_services.price_cents) : "Sob consulta";

 setCompanionData({
 niche: "service" as const,
 title: serviceTitle,
 subtitle: `Profissional / Especialista: ${resourceName}`,
 code: `AGE-${(appt.id || "").slice(0, 6).toUpperCase()}`,
 companyName: appt.store?.name || "Espaço de Atendimento",
 companyLogoUrl: appt.store?.logo_url,
 participantsLabel: "Cliente",
 participants: [appt.guest_name || "Cliente"],
 sections: [
 {
 type: "service_item" as const,
 title: "Detalhes do Horário Confirmado",
 badge: appt.status === "confirmed" ? "Confirmado" : "Pendente",
 details: [
 { label: "Data e Horário", value: dateFormatted, highlight: true },
 { label: "Duração Estimada", value: duration },
 { label: "Valor do Serviço", value: priceFormatted },
 ...(appt.session_number ? [{ label: "Sessão do Pacote", value: `#${appt.session_number}` }] : []),
 ],
 },
 ],
 rules: [
 {
 title: "Tolerância & Chegada",
 description: "Recomendamos chegar com 10 minutos de antecedência. A tolerância máxima para atrasos é de 15 minutos.",
 highlight: true,
 },
 {
 title: "Reagendamento ou Cancelamento",
 description: "Caso precise remarcar, avise com no mínimo 24h de antecedência para liberar a vaga a outros clientes.",
 },
 ...(appt.booking_services?.preparation_notes ? [{
 title: "Orientações Pré-Atendimento",
 description: appt.booking_services.preparation_notes,
 }] : []),
 ],
 emergencyContacts: [
 {
 name: appt.store?.name || "Recepção / Atendimento",
 category: "Agendamentos & Recepção",
 phone: appt.store?.phone || appt.guest_phone || "(49) 99999-9999",
 whatsapp: true,
 is24h: false,
 },
 ],
 customWhatsAppText: `Olá, *${appt.guest_name || "Cliente"}*! Confirmamos seu agendamento de *${serviceTitle}* para *${dateFormatted}* com *${resourceName}*.\n\nLocal: ${appt.store?.name || "Nosso Espaço"}\nDuração: ${duration}\n\nQualquer dúvida ou necessidade de ajuste de horário, estamos à disposição! ✨`,
 });
 setCompanionCardOpen(true);
 };

 const { data: appointmentsRes, isLoading } = useQuery({
 queryKey: ["admin-appointments"],
 queryFn: () => listAppointments(),
 });

 const statusMutation = useMutation({
 mutationFn: async ({ id, status }: { id: string; status: any }) => {
 return await updateAppointmentStatus({ data: { id, status } });
 },
 onSuccess: (_data, variables) => {
 if (variables.status === "completed") {
 playCashRegisterSound();
 toast.success("Atendimento concluído com sucesso!");
 } else if (variables.status === "cancelled") {
 toast.success("Agendamento cancelado. Saldo de sessões estornado quando aplicável.");
 } else {
 toast.success("Status atualizado!");
 }
 queryClient.invalidateQueries({ queryKey: ["admin-appointments"] });
 },
 onError: (e: any) => toast.error(e.message || "Erro ao atualizar status"),
 });

 const appointments = appointmentsRes?.data || [];

 const weekDays = useMemo(() => {
 return Array.from({ length: 7 }, (_, i) => addDays(subDays(selectedDate, 3), i));
 }, [selectedDate]);

 const filteredAppointments = useMemo(() => {
 return appointments.filter((appt: any) => {
 if (!appt.scheduled_at) return false;
 const apptDate = new Date(appt.scheduled_at);
 return isSameDay(apptDate, selectedDate);
 });
 }, [appointments, selectedDate]);

 const groupedAppointments = useMemo(() => {
 const map: Record<string, any[]> = {};
 filteredAppointments.forEach((appt: any) => {
 const resourceName = appt.booking_resources?.name || "Geral";
 if (!map[resourceName]) map[resourceName] = [];
 map[resourceName].push(appt);
 });
 return map;
 }, [filteredAppointments]);

 const dayMetrics = useMemo(() => {
 const totalCount = filteredAppointments.length;
 const completedCount = filteredAppointments.filter((a: any) => a.status === "completed").length;
 const revenueCents = filteredAppointments
 .filter((a: any) => a.status !== "cancelled")
 .reduce((sum: number, a: any) => sum + (a.booking_services?.price_cents || 0), 0);
 return { totalCount, completedCount, revenueCents };
 }, [filteredAppointments]);

 const getStatusBadge = (status: string) => {
 switch (status) {
 case "pending":
 case "confirmed":
 return (
 <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-bold">
 Agendado
 </Badge>
 );
 case "checked_in":
 return (
 <Badge variant="outline" className="bg-info/10 text-info border-info/20 text-[10px] font-bold">
 Na Recepção
 </Badge>
 );
 case "in_service":
 return (
 <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
 Em Atendimento
 </Badge>
 );
 case "completed":
 return (
 <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">
 Concluído
 </Badge>
 );
 case "no_show":
 return (
 <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px] font-bold">
 Faltou
 </Badge>
 );
 case "cancelled":
 return (
 <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] font-bold">
 Cancelado
 </Badge>
 );
 default:
 return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
 }
 };

 return (
 <div className="space-y-6 h-full flex flex-col">
 <PageHeader
 eyebrow="Atendimentos"
 title="Agenda"
 actions={
 <div className="flex items-center gap-2">
 <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-bold gap-1.5">
 <Link to="/workspace/pacotes">
 <Ticket className="size-3.5 text-primary" />
 <span>Pacotes & Passes</span>
 </Link>
 </Button>
 <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-bold gap-1.5">
 <Link to="/workspace/agenda/recursos">
 <Users className="size-3.5" />
 <span>Profissionais & Salas</span>
 </Link>
 </Button>
 </div>
 }
 />

 <div className="flex items-center justify-between gap-2 p-3 bg-card rounded-2xl ">
 <Button
 variant="ghost"
 size="icon"
 onClick={() => setSelectedDate((prev) => subDays(prev, 1))}
 className="size-9 rounded-xl text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
 aria-label="Dia anterior"
 >
 <ChevronLeft className="size-4" />
 </Button>

 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 justify-center py-0.5">
 {weekDays.map((d, idx) => {
 const isSelected = isSameDay(d, selectedDate);
 const isToday = isSameDay(d, new Date());
 return (
 <button
 key={idx}
 type="button"
 onClick={() => setSelectedDate(d)}
 className={cn(
 "flex flex-col items-center justify-center min-w-14 sm:min-w-16 py-2 px-1 rounded-xl transition-all cursor-pointer",
 isSelected
 ? "bg-primary text-primary-foreground font-bold "
 : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
 )}
 >
 <span className="text-[10px] uppercase font-bold tracking-wider">
 {format(d, "EEE", { locale: ptBR })}
 </span>
 <span className="text-sm font-black mt-0.5 font-mono">
 {format(d, "dd")}
 </span>
 {isToday && !isSelected && (
 <span className="size-1 rounded-full bg-primary mt-1" />
 )}
 </button>
 );
 })}
 </div>

 <Button
 variant="ghost"
 size="icon"
 onClick={() => setSelectedDate((prev) => addDays(prev, 1))}
 className="size-9 rounded-xl text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
 aria-label="Próximo dia"
 >
 <ChevronRight className="size-4" />
 </Button>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
 <div className="p-3.5 rounded-2xl bg-card flex items-center gap-3">
 <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
 <CalendarIcon className="size-5" />
 </div>
 <div>
 <p className="text-[11px] font-bold text-muted-foreground">Agendamentos</p>
 <p className="text-base font-black text-foreground font-mono">{dayMetrics.totalCount}</p>
 </div>
 </div>

 <div className="p-3.5 rounded-2xl bg-card flex items-center gap-3">
 <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
 <CheckCircle2 className="size-5" />
 </div>
 <div>
 <p className="text-[11px] font-bold text-muted-foreground">Concluídos</p>
 <p className="text-base font-black text-foreground font-mono">{dayMetrics.completedCount}</p>
 </div>
 </div>

 <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-card flex items-center gap-3">
 <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
 <DollarSign className="size-5" />
 </div>
 <div>
 <p className="text-[11px] font-bold text-muted-foreground">Previsão do Dia</p>
 <p className="text-base font-black text-foreground font-mono">
 {formatMoney(dayMetrics.revenueCents)}
 </p>
 </div>
 </div>
 </div>

 {isLoading ? (
 <div className="p-12 text-center text-xs text-muted-foreground">Carregando agendamentos...</div>
 ) : Object.keys(groupedAppointments).length === 0 ? (
 <div className="p-12 text-center border-0 rounded-2xl bg-card space-y-2">
 <CalendarIcon className="size-8 mx-auto text-muted-foreground opacity-40" />
 <h3 className="text-sm font-bold text-foreground">Nenhum agendamento para este dia</h3>
 <p className="text-xs text-muted-foreground">
 Os horários marcados por clientes aparecerão aqui.
 </p>
 </div>
 ) : (
 <div className="flex-1 overflow-x-auto no-scrollbar pb-4">
 <div className="flex gap-4 min-w-max items-start">
 {Object.keys(groupedAppointments).map((resourceName) => (
 <div
 key={resourceName}
 className="w-80 flex flex-col gap-3 bg-card rounded-2xl p-4 "
 >
 <div className="flex items-center justify-between pb-2 ">
 <div className="flex items-center gap-2">
 <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
 {resourceName.charAt(0)}
 </div>
 <h3 className="font-bold text-sm text-foreground">{resourceName}</h3>
 </div>
 <Badge variant="secondary" className="text-[10px] font-bold">
 {groupedAppointments[resourceName].length}
 </Badge>
 </div>

 <div className="space-y-3">
 {groupedAppointments[resourceName].map((appt: any) => (
 <div
 key={appt.id}
 className="p-3.5 rounded-xl bg-background space-y-2.5 hover:border-primary/40 transition-colors"
 >
 <div className="flex items-start justify-between gap-2">
 <div>
 <h4 className="font-bold text-xs text-foreground">
 {appt.booking_services?.title || "Atendimento"}
 </h4>
 {appt.pass_id && (
 <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mt-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary">
 <Ticket size={9} />
 Sessão #{appt.session_number || 1}
 </span>
 )}
 </div>
 {getStatusBadge(appt.status)}
 </div>

 <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
 <div className="flex items-center gap-1">
 <Clock className="size-3 text-primary" />
 <span>
 {format(new Date(appt.scheduled_at), "HH:mm")} -{""}
 {format(
 new Date(
 new Date(appt.scheduled_at).getTime() +
 (appt.duration_minutes || 60) * 60000,
 ),
 "HH:mm",
 )}
 </span>
 </div>
 {appt.booking_services?.price_cents && (
 <span className="font-bold text-foreground">
 {formatMoney(appt.booking_services.price_cents)}
 </span>
 )}
 </div>

 <div className="pt-2 flex items-center justify-between text-xs">
 <span className="font-semibold text-foreground truncate max-w-[130px]">
 {appt.guest_name || "Cliente"}
 </span>
 <div className="flex items-center gap-1">
 {appt.guest_phone && (
 <a
 href={`https://api.whatsapp.com/send?phone=${appt.guest_phone.replace(/\D/g, "")}&text=${encodeURIComponent(
 `Olá, *${appt.guest_name || "Cliente"}*! Confirmamos seu agendamento de *${appt.booking_services?.title || "Atendimento"}* para *${format(new Date(appt.scheduled_at), "dd/MM 'às' HH:mm")}*. Qualquer dúvida estamos à disposição!`
 )}`}
 target="_blank"
 rel="noopener noreferrer"
 className="size-7 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 flex items-center justify-center cursor-pointer transition-colors"
 title="Enviar Lembrete / Confirmação no WhatsApp"
 >
 <MessageCircle className="size-3.5" />
 </a>
 )}
 <Button
 variant="ghost"
 size="icon"
 className="size-7 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 cursor-pointer"
 title="Abrir Cartão Digital 9:16 (WhatsApp)"
 onClick={() => handleOpenCompanion(appt, resourceName)}
 >
 <Smartphone className="size-3.5" />
 </Button>
 <Button
 variant="ghost"
 size="icon"
 className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
 title="Ver Prontuário / Evolução"
 onClick={() =>
 setSelectedAppt({ id: appt.id, name: appt.guest_name || "Cliente" })
 }
 >
 <FileText className="size-3.5 text-primary" />
 </Button>
 </div>
 </div>

 {["pending", "confirmed"].includes(appt.status) && (
 <div className="flex flex-col gap-1.5 pt-1">
 <div className="grid grid-cols-2 gap-1.5">
 <Button
 size="sm"
 variant="outline"
 className="h-8 rounded-lg text-[11px] font-bold cursor-pointer"
 onClick={() =>
 statusMutation.mutate({ id: appt.id, status: "in_service" })
 }
 >
 <Play className="size-3 mr-1 text-primary" />
 Iniciar
 </Button>
 <Button
 size="sm"
 className="h-8 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
 onClick={() =>
 statusMutation.mutate({ id: appt.id, status: "completed" })
 }
 >
 <CheckCircle2 className="size-3 mr-1" />
 Concluir
 </Button>
 </div>
 <div className="flex items-center justify-between gap-1">
 <Button
 size="sm"
 variant="ghost"
 className="h-7 text-[10px] text-muted-foreground hover:text-rose-600 cursor-pointer px-2"
 onClick={() => statusMutation.mutate({ id: appt.id, status: "cancelled" })}
 >
 Cancelar
 </Button>
 <Button
 size="sm"
 variant="ghost"
 className="h-7 text-[10px] text-muted-foreground hover:text-destructive cursor-pointer px-2"
 onClick={() => statusMutation.mutate({ id: appt.id, status: "no_show" })}
 >
 Falta (No-Show)
 </Button>
 </div>
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 <ClinicalRecordDrawer
 appointmentId={selectedAppt?.id || null}
 isOpen={Boolean(selectedAppt)}
 onClose={() => setSelectedAppt(null)}
 guestName={selectedAppt?.name || "Cliente"}
 />

 {/* Modal do Cartão Digital 9:16 */}
 <Dialog open={companionCardOpen} onOpenChange={setCompanionCardOpen}>
 <DialogContent className="max-w-md p-0 overflow-hidden border-border bg-card rounded-2xl sm:max-w-lg">
 <DialogHeader className="p-4 border-b border-border/70 bg-muted/30">
 <DialogTitle className="text-sm font-bold flex items-center gap-2">
 <Smartphone className="size-4 text-emerald-600" />
 Cartão Digital de Atendimento 9:16 (WhatsApp)
 </DialogTitle>
 </DialogHeader>
 <div className="p-4 max-h-[85vh] overflow-y-auto no-scrollbar flex justify-center">
 {companionData && (
 <DigitalCompanionCard {...companionData} />
 )}
 </div>
 </DialogContent>
 </Dialog>
 </div>
 );
}
