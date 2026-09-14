import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers, Calendar, Clock, CheckCircle2, AlertCircle, Plus, ArrowRight, User, History, RotateCcw, Ticket, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from "@/components/ui/dialog";
import {
 getMyCustomerPasses,
 bookAppointmentWithPass,
} from "@/services/service-packages.functions";
import { getAvailableSlots } from "@/services/booking.functions";
import { EmptyState } from "@/components/state/states";
import { PageSkeleton } from "@/components/state/loading";

export const Route = createFileRoute("/_store/conta/pacotes")({
 head: () => ({ meta: [{ title: "Meus Pacotes & Aulas | Waesy" }] }),
 component: CustomerPassesPage,
 pendingComponent: PageSkeleton,
});

function CustomerPassesPage() {
 const queryClient = useQueryClient();
 const [selectedPass, setSelectedPass] = useState<any | null>(null);
 const [isBookingOpen, setIsBookingOpen] = useState(false);
 const [selectedDate, setSelectedDate] = useState<string>(
 new Date().toISOString().split("T")[0],
 );
 const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
 const [expandedLedgerPassId, setExpandedLedgerPassId] = useState<string | null>(null);

 const { data: passes = [], isLoading } = useQuery({
 queryKey: ["my-customer-passes"],
 queryFn: () => getMyCustomerPasses(),
 });

 const { data: slotsRes, isLoading: isLoadingSlots } = useQuery({
 queryKey: ["available-slots", selectedPass?.service_packages?.booking_services?.id, selectedDate],
 queryFn: () =>
 getAvailableSlots({
 data: {
 service_id: selectedPass?.service_packages?.booking_services?.id,
 date: selectedDate,
 },
 }),
 enabled: isBookingOpen && !!selectedPass?.service_packages?.booking_services?.id,
 });

 const bookMutation = useMutation({
 mutationFn: async () => {
 if (!selectedPass || !selectedSlot) throw new Error("Selecione um horário.");
 return await bookAppointmentWithPass({
 data: {
 pass_id: selectedPass.id,
 scheduled_at: selectedSlot,
 },
 });
 },
 onSuccess: (res: any) => {
 toast.success(
 `Aula agendada com sucesso! Sessão ${res.session_number} de ${selectedPass.total_credits}`,
 );
 setIsBookingOpen(false);
 setSelectedSlot(null);
 queryClient.invalidateQueries({ queryKey: ["my-customer-passes"] });
 },
 onError: (err: any) => {
 toast.error(err.message || "Erro ao agendar sessão.");
 },
 });

 const availableSlots = slotsRes?.data || [];

 if (isLoading) {
 return <PageSkeleton />;
 }

 return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0">
      {/* ── 1. Clean Minimalist Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Pacotes
          </h1>
          {passes.length > 0 && (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-0.5 rounded-full">
              {passes.length}
            </Badge>
          )}
        </div>

        <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold h-8 px-3.5 cursor-pointer">
          <Link to="/agendar">Explorar Serviços</Link>
        </Button>
      </div>

 {/* ── 2. Lista de Passes do Cliente ── */}
 {passes.length === 0 ? (
 <EmptyState
 title="Você ainda não possui pacotes de aulas ou serviços"
 description="Adquira pacotes de aulas de pilates, natação, treinos, estética ou barbearia com descontos exclusivos e agende quando quiser."
 action={
 <Link
 to="/servicos"
 className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold bg-primary text-primary-foreground "
 >
 Ver Serviços & Pacotes Disponíveis <ArrowRight size={14} />
 </Link>
 }
 />
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {passes.map((pass: any) => {
 const pkg = pass.service_packages;
 const store = pass.stores;
 const progressPercent = Math.round(
 ((pass.total_credits - pass.remaining_credits) / pass.total_credits) * 100,
 );
 const isLedgerOpen = expandedLedgerPassId === pass.id;
 const isExpired = new Date(pass.expires_at) < new Date();

 return (
 <div
 key={pass.id}
 className="p-5 rounded-2xl bg-card space-y-4 flex flex-col justify-between hover:border-foreground/20 transition-all "
 >
 <div className="space-y-3">
 {/* Store & Status Header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 {store?.avatar_url ? (
 <img
 src={store.avatar_url}
 alt={store.name}
 className="size-8 rounded-full object-cover "
 />
 ) : (
 <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
 {store?.name?.substring(0, 2).toUpperCase()}
 </div>
 )}
 <div>
 <h4 className="text-xs font-bold text-foreground leading-tight">
 {store?.name}
 </h4>
 <span className="text-[10px] text-muted-foreground font-mono">
 {pkg?.title || "Pacote de Aulas"}
 </span>
 </div>
 </div>

 <Badge
 className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
 pass.status === "active" && !isExpired
 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
 : "bg-muted text-muted-foreground "
 }`}
 >
 {isExpired ? "Expirado" : pass.remaining_credits === 0 ? "Esgotado" : "Ativo"}
 </Badge>
 </div>

 {/* Progress & Credits */}
 <div className="p-4 rounded-2xl bg-muted/30 space-y-2.5">
 <div className="flex items-end justify-between">
 <div>
 <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
 Créditos Disponíveis
 </span>
 <div className="flex items-baseline gap-1.5 mt-0.5">
 <span className="text-2xl font-black text-foreground">
 {pass.remaining_credits}
 </span>
 <span className="text-xs text-muted-foreground font-medium">
 de {pass.total_credits} sessões
 </span>
 </div>
 </div>
 <span className="text-xs font-mono font-bold text-foreground">
 {100 - progressPercent}% livre
 </span>
 </div>

 <Progress value={progressPercent} className="h-2 rounded-full" />

 <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 font-mono">
 <span>
 Válido até: {format(new Date(pass.expires_at), "dd/MM/yyyy", { locale: ptBR })}
 </span>
 {pass.auto_renew && (
 <span className="text-primary font-semibold">Auto-renovável</span>
 )}
 </div>
 </div>
 </div>

 {/* Actions & Ledger Toggle */}
 <div className="space-y-2 pt-2 ">
 <div className="flex items-center gap-2">
 <Button
 disabled={pass.remaining_credits <= 0 || isExpired}
 onClick={() => {
 setSelectedPass(pass);
 setIsBookingOpen(true);
 }}
 className="flex-1 rounded-2xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90"
 >
 <Calendar className="size-3.5 mr-1.5" />
 Agendar com 1-Clique
 </Button>

 <Button
 variant="outline"
 size="icon"
 onClick={() =>
 setExpandedLedgerPassId(isLedgerOpen ? null : pass.id)
 }
 className="rounded-2xl border-border shrink-0"
 title="Ver histórico de uso"
 >
 {isLedgerOpen ? <ChevronUp size={16} /> : <History size={16} />}
 </Button>
 </div>

 {/* Ledger Extrato Expandido */}
 {isLedgerOpen && (
 <div className="p-3 rounded-2xl bg-muted/40 text-xs space-y-2 animate-in fade-in duration-200">
 <span className="font-bold text-[11px] text-foreground flex items-center gap-1.5">
 <History size={12} className="text-primary" /> Extrato do Pacote
 </span>
 {pass.service_pass_ledger?.length === 0 ? (
 <p className="text-[11px] text-muted-foreground italic">
 Nenhum agendamento realizado ainda.
 </p>
 ) : (
 <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar pr-1">
 {pass.service_pass_ledger?.map((log: any) => (
 <div
 key={log.id}
 className="flex items-center justify-between text-[11px] py-1 last:border-0"
 >
 <div>
 <p className="font-medium text-foreground">{log.reason}</p>
 <span className="text-[9px] text-muted-foreground font-mono">
 {format(new Date(log.created_at), "dd/MM HH:mm")}
 </span>
 </div>
 <span
 className={`font-mono font-bold ${
 log.credits_delta > 0
 ? "text-emerald-500"
 : "text-rose-500"
 }`}
 >
 {log.credits_delta > 0 ? `+${log.credits_delta}` : log.credits_delta}
 </span>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 );
 })}
 </div>
 )}

 {/* ── Modal de Agendamento por Crédito ── */}
 <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
 <DialogContent className="sm:max-w-md sm:rounded-2xl sm:p-6">
 <DialogHeader>
 <DialogTitle className="text-lg font-bold flex items-center gap-2">
 <Ticket className="size-5 text-primary" />
 Agendar Aula com Crédito
 </DialogTitle>
 </DialogHeader>

 {selectedPass && (
 <div className="space-y-4 py-2">
 <div className="p-3 rounded-2xl bg-muted/40 flex items-center justify-between text-xs">
 <div>
 <p className="font-bold text-foreground">
 {selectedPass.service_packages?.title}
 </p>
 <span className="text-muted-foreground text-[11px]">
 {selectedPass.stores?.name}
 </span>
 </div>
 <Badge className="bg-primary text-primary-foreground font-mono text-[10px]">
 {selectedPass.remaining_credits} restantes
 </Badge>
 </div>

 {/* Seletor de Data */}
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground">Selecione o Dia:</label>
 <input
 type="date"
 min={new Date().toISOString().split("T")[0]}
 value={selectedDate}
 onChange={(e) => {
 setSelectedDate(e.target.value);
 setSelectedSlot(null);
 }}
 className="w-full h-10 px-3 rounded-xl bg-card text-xs font-mono"
 />
 </div>

 {/* Grid de Horários Disponíveis */}
 <div className="space-y-2">
 <label className="text-xs font-bold text-foreground flex items-center justify-between">
 <span>Horários Livres:</span>
 {isLoadingSlots && (
 <span className="text-[10px] font-normal text-muted-foreground">
 Carregando grade...
 </span>
 )}
 </label>

 {availableSlots.length === 0 ? (
 <div className="p-4 rounded-2xl border-0 text-center text-xs text-muted-foreground">
 Nenhum horário livre encontrado para esta data. Selecione outro dia.
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
 {availableSlots.map((slot: string) => {
 const timeStr = format(new Date(slot), "HH:mm");
 const isSelected = selectedSlot === slot;
 return (
 <button
 key={slot}
 type="button"
 onClick={() => setSelectedSlot(slot)}
 className={`py-2 px-3 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
 isSelected
 ? "bg-foreground text-background border-foreground "
 : "bg-muted/40 border-border hover:bg-muted text-foreground"
 }`}
 >
 {timeStr}
 </button>
 );
 })}
 </div>
 )}
 </div>
 </div>
 )}

 <DialogFooter className="gap-2 pt-2 ">
 <Button
 variant="outline"
 onClick={() => setIsBookingOpen(false)}
 className="rounded-xl text-xs font-bold border-border"
 >
 Cancelar
 </Button>
 <Button
 disabled={!selectedSlot || bookMutation.isPending}
 onClick={() => bookMutation.mutate()}
 className="rounded-xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90"
 >
 {bookMutation.isPending ? "Confirmando..." : "Confirmar Agendamento"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
