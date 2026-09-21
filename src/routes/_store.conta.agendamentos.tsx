import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Smartphone } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogFooter,
} from "@/components/ui/dialog";
import { getUserSession } from "@/services/auth.functions";
import {
 listCustomerAppointments,
 cancelCustomerAppointment,
} from "@/services/booking.functions";
import {
  DigitalCompanionCard,
  type CompanionCardSectionItem,
  type CompanionRuleItem,
  type CompanionContactItem,
} from "@/components/documents/digital-companion-card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_store/conta/agendamentos")({
 head: () => ({
 meta: [{ title: "Minha Agenda | Waesy" }],
 }),
  loader: async () => {
    try {
      const session = await getUserSession().catch(() => null);

      const initialAppointments = await listCustomerAppointments({
        data: { status: "all" },
      }).catch(() => []);

      return { initialAppointments, session };
    } catch (err) {
      console.error("[loader:_store.conta.agendamentos] Unhandled loader error:", err);
      return { initialAppointments: [], session: null };
    }
  },
 component: CustomerAgendaPage,
});

function getStatusBadge(status: string) {
  switch (status) {
    case "confirmed":
      return <Badge variant="success" className="text-[10px]">Confirmado</Badge>;
    case "pending":
      return <Badge variant="warning" className="text-[10px]">Pendente</Badge>;
    case "completed":
      return <Badge variant="secondary" className="text-[10px]">Concluído</Badge>;
    case "cancelled":
      return <Badge variant="destructive" className="text-[10px]">Cancelado</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  }
}

function CustomerAgendaPage() {
  const { initialAppointments, session } = ((Route.useLoaderData?.() as any) || {});
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [cancellingAppt, setCancellingAppt] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [selectedCompanionAppt, setSelectedCompanionAppt] = useState<any | null>(null);
  const router = useRouter();

 const { data: appointments, refetch } = useQuery({
 queryKey: ["customer-appointments", activeTab],
 queryFn: () =>
 listCustomerAppointments({
 data: { status: activeTab },
 }),
 initialData:
 activeTab === "upcoming"
 ? (initialAppointments || []).filter(
 (a: any) => new Date(a.scheduled_at) >= new Date(),
 )
 : (initialAppointments || []).filter(
 (a: any) => new Date(a.scheduled_at) < new Date(),
 ),
 });

 const cancelMutation = useMutation({
 mutationFn: (appointmentId: string) =>
 cancelCustomerAppointment({
 data: { appointmentId, reason: cancelReason || undefined },
 }),
 onSuccess: () => {
 toast.success("Agendamento cancelado com sucesso.");
 setCancellingAppt(null);
 setCancelReason("");
 refetch();
 router.invalidate();
 },
 onError: (err: any) => {
 toast.error(err.message || "Erro ao cancelar agendamento.");
 },
 });

 const apptList = appointments || [];

 return (
  <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0">
   {/* ── 1. Clean Minimalist Header ── */}
   <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
     <div className="flex items-center gap-3">
       <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
         Agendamentos
       </h1>
       {apptList.length > 0 && (
         <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-0.5 rounded-full">
           {apptList.length}
         </Badge>
       )}
     </div>

     <Button
       asChild
       size="sm"
       variant="outline"
       className="rounded-xl text-xs font-semibold h-8 px-3.5 cursor-pointer"
     >
       <Link to="/agendar">Novo Agendamento</Link>
     </Button>
   </div>

 {/* ── 2. Minimalist Tab Controls (Apple iOS Segments) ── */}
 <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-2xl w-fit border border-border/40">
 <button
 type="button"
 onClick={() => setActiveTab("upcoming")}
 className={cn(
 "px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
 activeTab === "upcoming"
 ? "bg-card text-foreground shadow-2xs"
 : "text-muted-foreground hover:text-foreground",
 )}
 >
 Próximos Agendamentos
 </button>
 <button
 type="button"
 onClick={() => setActiveTab("past")}
 className={cn(
 "px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
 activeTab === "past"
 ? "bg-card text-foreground shadow-2xs"
 : "text-muted-foreground hover:text-foreground",
 )}
 >
 Histórico
 </button>
 </div>

    {/* ── 3. Appointments List (Grouped iOS Surface) ── */}
    {apptList.length === 0 ? (
      <div className="w-full rounded-2xl border border-border/60 bg-card p-4 sm:p-8 text-center space-y-3">
        <p className="text-sm font-semibold text-foreground">
 {activeTab === "upcoming"
 ? "Nenhum agendamento futuro encontrado"
 : "Nenhum histórico de agendamentos"}
 </p>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 {activeTab === "upcoming"
 ? "Você ainda não possui horários marcados. Explore os serviços locais disponíveis para agendar."
 : "Seus atendimentos anteriores concluídos ou cancelados aparecerão aqui."}
 </p>
 {activeTab === "upcoming" && (
 <div className="pt-2">
 <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold h-9">
 <Link to="/agendar">Explorar Serviços</Link>
 </Button>
 </div>
 )}
 </div>
 ) : (
 <div className="space-y-3">
 {apptList.map((appt: any) => {
 const dateObj = new Date(appt.scheduled_at);
 const isUpcoming = dateObj >= new Date() && appt.status !== "cancelled";
 const serviceTitle = appt.booking_services?.title || "Serviço";
 const storeName = appt.stores?.name || "Estabelecimento";
 const duration = appt.booking_services?.duration_minutes || 30;
 const price = appt.booking_services?.price_cents || 0;

 return (
          <div
            key={appt.id}
            className="rounded-2xl border border-border/60 bg-card p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-border"
          >
 {/* Data e Horário em Destaque */}
 <div className="flex items-start gap-4">
 <div className="size-14 rounded-2xl bg-muted/40 border border-border/50 flex flex-col items-center justify-center shrink-0">
 <span className="text-[10px] font-bold uppercase text-muted-foreground">
 {dateObj.toLocaleDateString("pt-BR", { month: "short" })}
 </span>
 <span className="text-lg font-black text-foreground leading-none">
 {dateObj.getDate()}
 </span>
 </div>

 <div className="space-y-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <h2 className="text-sm font-bold text-foreground truncate">
 {serviceTitle}
 </h2>
 {getStatusBadge(appt.status)}
 {appt.pass_id && (
 <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
 Pacote de Sessões
 </span>
 )}
 </div>

 <p className="text-xs text-muted-foreground font-medium">
 {storeName} • {dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ({duration} min)
 </p>

 {appt.notes && (
 <p className="text-[11px] text-muted-foreground/80 line-clamp-1 italic pt-0.5">
 Nota: {appt.notes}
 </p>
 )}
 </div>
 </div>

 {/* Ações e Preço */}
 <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/40">
 <div className="text-left sm:text-right">
 <span className="text-xs font-mono font-bold text-foreground">
 {appt.pass_id ? "Crédito Pago" : formatMoney(price)}
 </span>
 </div>

 <div className="flex items-center gap-2">
 <Button
   type="button"
   variant="outline"
   size="sm"
   onClick={() => setSelectedCompanionAppt(appt)}
   className="rounded-xl text-xs font-semibold h-8 text-primary border-primary/30 hover:bg-primary/5 cursor-pointer gap-1"
   title="Visualizar Cartão Digital de Atendimento 9:16 e WhatsApp"
 >
   <Smartphone className="size-3.5" />
   <span>Cartão 9:16</span>
 </Button>

 {isUpcoming && (
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setCancellingAppt(appt)}
 className="rounded-xl text-xs font-semibold h-8 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-border/60 cursor-pointer"
 >
 Cancelar
 </Button>
 )}

 {appt.stores?.slug && (
 <Button
 asChild
 variant="ghost"
 size="sm"
 className="rounded-xl text-xs font-semibold h-8 text-muted-foreground hover:text-foreground cursor-pointer"
 >
 <Link to="/mercado">
 Ver Loja ↗
 </Link>
 </Button>
 )}
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}

 {/* ── Modal de Confirmação de Cancelamento ── */}
 <Dialog
 open={!!cancellingAppt}
 onOpenChange={(open) => !open && setCancellingAppt(null)}
 >
 <DialogContent className="sm:max-w-md sm:rounded-2xl sm:p-6">
 <DialogHeader className="space-y-1.5">
 <DialogTitle className="text-base font-bold text-foreground">
 Cancelar Agendamento?
 </DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 {cancellingAppt?.pass_id
 ? "Este agendamento foi realizado utilizando um pacote de créditos. Ao confirmar o cancelamento, 1 crédito será estornado automaticamente para sua carteira."
 : "Tem certeza de que deseja cancelar este horário? O estabelecimento será notificado."}
 </DialogDescription>
 </DialogHeader>

 <DialogFooter className="flex-row gap-2 pt-3 justify-end">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setCancellingAppt(null)}
 className="rounded-xl text-xs font-semibold h-9"
 >
 Manter Horário
 </Button>
 <Button
 type="button"
 variant="destructive"
 size="sm"
 disabled={cancelMutation.isPending}
 onClick={() => cancellingAppt && cancelMutation.mutate(cancellingAppt.id)}
 className="rounded-xl text-xs font-semibold h-9"
 >
 {cancelMutation.isPending ? "Cancelando..." : "Confirmar Cancelamento"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

    {/* ── Modal Digital Companion Card 9:16 (Guia do Atendimento / WhatsApp) ── */}
    <Dialog
      open={Boolean(selectedCompanionAppt)}
      onOpenChange={(open) => {
        if (!open) setSelectedCompanionAppt(null);
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl bg-background border border-border shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Guia Digital do Atendimento</DialogTitle>
        </DialogHeader>
        {selectedCompanionAppt && (
          <div className="w-full">
            <DigitalCompanionCard {...getApptCompanionData(selectedCompanionAppt, session)} />
          </div>
        )}
      </DialogContent>
    </Dialog>
 </div>
 );
}

function getApptCompanionData(appt: any, session: any) {
  const dateObj = new Date(appt.scheduled_at);
  const serviceTitle = appt.booking_services?.title || "Atendimento Agendado";
  const storeName = appt.stores?.name || "Estabelecimento";
  const duration = appt.booking_services?.duration_minutes || 30;
  const price = appt.booking_services?.price_cents || 0;

  const sections: CompanionCardSectionItem[] = [
    {
      type: "service_item",
      badge: appt.status === "confirmed" ? "Horário Confirmado" : "Agendado",
      title: serviceTitle,
      subtitle: `${storeName} · ${duration} minutos`,
      details: [
        {
          label: "Data & Horário",
          value: `${dateObj.toLocaleDateString("pt-BR")} às ${dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
          highlight: true,
        },
        {
          label: "Duração Estimada",
          value: `${duration} minutos`,
        },
        {
          label: "Investimento",
          value: appt.pass_id ? "Crédito de Pacote Utilizado" : formatMoney(price),
        },
        ...(appt.notes ? [{ label: "Observações", value: appt.notes }] : []),
      ],
    },
  ];

  const rules: CompanionRuleItem[] = [
    {
      title: "Tolerância de Comparecimento",
      description: "Tolerância máxima de 10 minutos após o horário agendado para início da sessão.",
      badge: "Pontualidade",
      highlight: true,
    },
    {
      title: "Cancelamento ou Remarcação",
      description: "Avisos de cancelamento devem ser solicitados com antecedência mínima de 2 horas diretamente pelo portal.",
      badge: "Aviso Prévio",
    },
    {
      title: "Instruções de Pré-Atendimento",
      description: "Venha com roupas confortáveis caso seja serviço estético ou esportivo. Apresente este cartão digital na recepção.",
      badge: "Recepção",
    },
  ];

  const settings = appt.stores?.settings || {};
  const storePhone = settings.whatsapp_phone || settings.phone || appt.stores?.whatsapp_phone;

  const emergencyContacts: CompanionContactItem[] = [
    ...(storePhone
      ? [
          {
            name: storeName,
            category: "Atendimento & Recepção",
            phone: storePhone,
            whatsapp: true,
            is24h: false,
          },
        ]
      : []),
    {
      name: "Suporte de Agendamentos Waesy",
      category: "Central de Ajuda",
      phone: "0800 000 0000",
      whatsapp: true,
      is24h: true,
    },
  ];

  return {
    niche: "service" as const,
    title: serviceTitle,
    subtitle: `${dateObj.toLocaleDateString("pt-BR")} às ${dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    code: `AG-${appt.id.slice(0, 8).toUpperCase()}`,
    companyName: storeName,
    companyLogoUrl: appt.stores?.logo_url,
    participantsLabel: "Cliente",
    participants: [session?.user?.name || "Cliente"].filter(Boolean),
    sections,
    rules,
    emergencyContacts,
    observations: appt.notes || undefined,
  };
}
