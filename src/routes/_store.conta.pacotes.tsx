import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle2,
  ArrowRight,
  History,
  Ticket,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
  HelpCircle,
  X,
  Share2,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  getMyCustomerPasses,
  bookAppointmentWithPass,
  cancelAppointmentAndRefundPass,
  CustomerPassEnrichedDTO,
} from "@/services/service-packages.functions";
import { getAvailableSlots } from "@/services/booking.functions";
import { EmptyState } from "@/components/state/states";
import { PageSkeleton } from "@/components/state/loading";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { useWindowSizeClass } from "@/lib/use-window-size-class";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/_store/conta/pacotes")({
  head: () => ({ meta: [{ title: "Meus Pacotes e Aulas | Waesy" }] }),
  component: CustomerPassesPage,
  pendingComponent: PageSkeleton,
});

function CustomerPassesPage() {
  const queryClient = useQueryClient();
  const { isCompact } = useWindowSizeClass();

  const [filterTab, setFilterTab] = useState<"todos" | "ativos" | "esgotados" | "expirados">("todos");
  const [selectedPass, setSelectedPass] = useState<CustomerPassEnrichedDTO | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [expandedLedgerPassId, setExpandedLedgerPassId] = useState<string | null>(null);
  const [cancelModalAppointment, setCancelModalAppointment] = useState<{ id: string; title: string; scheduled_at: string } | null>(null);

  const { data: passes = [], isLoading } = useQuery({
    queryKey: ["my-customer-passes"],
    queryFn: () => getMyCustomerPasses(),
  });

  // KPI Calculations
  const kpis = useMemo(() => {
    let activePassesCount = 0;
    let availableCreditsTotal = 0;
    let reservedCreditsTotal = 0;
    let completedCreditsTotal = 0;

    passes.forEach((p) => {
      const isExpired = new Date(p.expires_at) < new Date();
      if (p.status === "active" && !isExpired && p.remaining_credits > 0) {
        activePassesCount++;
      }
      availableCreditsTotal += p.available_credits;
      reservedCreditsTotal += p.reserved_credits;
      completedCreditsTotal += p.completed_credits;
    });

    return {
      activePassesCount,
      availableCreditsTotal,
      reservedCreditsTotal,
      completedCreditsTotal,
    };
  }, [passes]);

  // Filtered passes
  const filteredPasses = useMemo(() => {
    const now = new Date();
    return passes.filter((p) => {
      const isExpired = new Date(p.expires_at) < now;
      if (filterTab === "ativos") {
        return p.status === "active" && !isExpired && p.remaining_credits > 0;
      }
      if (filterTab === "esgotados") {
        return p.remaining_credits === 0 || p.status === "exhausted";
      }
      if (filterTab === "expirados") {
        return isExpired || p.status === "expired";
      }
      return true;
    });
  }, [passes, filterTab]);

  const serviceIdForSlots =
    selectedPass?.service_packages?.booking_services?.id ||
    selectedPass?.package_snapshot?.service_id;

  const { data: slotsRes, isLoading: isLoadingSlots } = useQuery({
    queryKey: ["available-slots", serviceIdForSlots, selectedDate],
    queryFn: () =>
      getAvailableSlots({
        data: {
          service_id: serviceIdForSlots!,
          date: selectedDate,
        },
      }),
    enabled: isBookingOpen && !!serviceIdForSlots,
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
        `Aula agendada com sucesso! Sessão ${res.session_number} de ${selectedPass?.total_credits}`,
      );
      setIsBookingOpen(false);
      setSelectedSlot(null);
      queryClient.invalidateQueries({ queryKey: ["my-customer-passes"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao agendar sessão.");
    },
  });

  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      return await cancelAppointmentAndRefundPass({
        data: {
          appointment_id: appointmentId,
          reason: "Cancelamento solicitado pelo cliente via portal de pacotes",
        },
      });
    },
    onSuccess: () => {
      toast.success("Agendamento cancelado e crédito estornado ao seu passe com sucesso.");
      setCancelModalAppointment(null);
      queryClient.invalidateQueries({ queryKey: ["my-customer-passes"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao cancelar agendamento.");
    },
  });

  const availableSlots = slotsRes?.data || [];

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-safe pb-24 px-0 sm:px-4 md:px-0">
      {/* ── 0. Native Mobile Header (<768px) ── */}
      <NativeMobileHeader
        title="Meus Pacotes"
        fallbackHref="/conta"
        mobileOnly
        rightAction={
          <Button
            asChild
            size="sm"
            variant="outline"
            className="rounded-lg text-xs font-semibold h-11 min-h-11 px-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Link to="/agendar">Serviços</Link>
          </Button>
        }
      />

      {/* ── 1. Desktop Inpage Header (>=768px) ── */}
      <div className="hidden md:flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Pacotes e Aulas
          </h1>
          {passes.length > 0 && (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-1 rounded-full">
              {passes.length}
            </Badge>
          )}
        </div>

        <Button
          asChild
          size="sm"
          variant="outline"
          className="rounded-lg text-xs font-semibold h-11 min-h-11 px-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Link to="/agendar">Explorar Serviços</Link>
        </Button>
      </div>

      {/* ── 2. 4 KPIs Canônicos (EARS-07 / Apple HIG Widescreen) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 px-2 sm:px-0">
        <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/60">
          <span className="text-xs text-muted-foreground font-semibold block">Passes Ativos</span>
          <div className="text-xl sm:text-2xl font-black text-foreground mt-1">
            {kpis.activePassesCount}
          </div>
          <span className="text-xs text-muted-foreground block mt-0.5">Em utilização</span>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/60">
          <span className="text-xs text-muted-foreground font-semibold block">Créditos Livres</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {kpis.availableCreditsTotal}
          </div>
          <span className="text-xs text-muted-foreground block mt-0.5">Prontos para agendar</span>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/60">
          <span className="text-xs text-muted-foreground font-semibold block">Aulas Reservadas</span>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {kpis.reservedCreditsTotal}
          </div>
          <span className="text-xs text-muted-foreground block mt-0.5">Na grade futura</span>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/60">
          <span className="text-xs text-muted-foreground font-semibold block">Aulas Concluídas</span>
          <div className="text-xl sm:text-2xl font-black text-foreground mt-1">
            {kpis.completedCreditsTotal}
          </div>
          <span className="text-xs text-muted-foreground block mt-0.5">Presenças validadas</span>
        </div>
      </div>

      {/* ── 3. Segmented Tabs Filter (B.39 - Linha Única Horizontal) ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-2 sm:px-0">
        {(["todos", "ativos", "esgotados", "expirados"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilterTab(tab)}
            className={`h-11 min-h-11 px-4 rounded-lg text-xs font-bold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-primary capitalize ${
              filterTab === tab
                ? "bg-foreground text-background"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab === "todos"
              ? "Todos os Pacotes"
              : tab === "ativos"
              ? "Ativos"
              : tab === "esgotados"
              ? "Esgotados"
              : "Expirados"}
          </button>
        ))}
      </div>

      {/* ── 4. Lista de Passes do Cliente ── */}
      {filteredPasses.length === 0 ? (
        <div className="px-2 sm:px-0">
          <EmptyState
            title="Nenhum pacote encontrado"
            description="Adquira pacotes de aulas de pilates, natação, treinos, estética ou barbearia com descontos exclusivos e agende quando quiser."
            action={
              <Link
                to="/agendar"
                className="inline-flex items-center justify-center gap-2 px-6 h-11 min-h-11 rounded-lg text-xs font-bold bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary"
              >
                Ver Serviços e Pacotes Disponíveis <ArrowRight size={14} />
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2 sm:px-0">
          {filteredPasses.map((pass) => {
            const pkg = pass.service_packages;
            const snapshot = pass.package_snapshot;
            const store = pass.stores;

            const title = snapshot?.title || pkg?.title || "Pacote de Serviços";
            const serviceTitle =
              snapshot?.service_title ||
              pkg?.booking_services?.title ||
              "Atendimento Presencial";

            const progressPercent = Math.round(
              ((pass.total_credits - pass.remaining_credits) / pass.total_credits) * 100,
            );
            const isLedgerOpen = expandedLedgerPassId === pass.id;
            const isExpired = new Date(pass.expires_at) < new Date();

            return (
              <div
                key={pass.id}
                className="p-4 sm:p-5 rounded-xl bg-card border border-border/60 space-y-4 flex flex-col justify-between hover:border-foreground/20 transition-all shadow-xs"
              >
                <div className="space-y-3">
                  {/* Store & Status Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {store?.avatar_url ? (
                        <img
                          src={store.avatar_url}
                          alt={store.name}
                          className="size-10 rounded-full object-cover shrink-0 border border-border/40"
                        />
                      ) : (
                        <div className="size-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0 border border-border/40">
                          {store?.name?.substring(0, 2).toUpperCase() || "WZ"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-foreground break-words text-wrap leading-tight">
                          {store?.name || "Estabelecimento Parceiro"}
                        </h4>
                        <span className="text-xs text-muted-foreground font-mono break-words text-wrap block mt-0.5">
                          {title}
                        </span>
                      </div>
                    </div>

                    <Badge
                      className={`text-xs font-mono px-2.5 py-1 rounded-md shrink-0 ${
                        pass.status === "active" && !isExpired
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isExpired
                        ? "Expirado"
                        : pass.remaining_credits === 0
                        ? "Esgotado"
                        : "Ativo"}
                    </Badge>
                  </div>

                  {/* Detalhes do Serviço & Snapshot Contratado */}
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/40 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Serviço:</span>
                      <span className="font-semibold text-foreground text-right">{serviceTitle}</span>
                    </div>
                    {pass.unit_price_cents && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Valor por Sessão:</span>
                        <span className="font-mono font-medium text-foreground">
                          {formatMoney(pass.unit_price_cents)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress & 4 Sub-Contadores de Créditos (EARS-03) */}
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
                    <div className="flex items-end justify-between">
                      <div>
                        <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider block">
                          Créditos Disponíveis
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-2xl sm:text-3xl font-black text-foreground">
                            {pass.available_credits}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">
                            de {pass.total_credits} contratados
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-foreground">
                        {100 - progressPercent}% livre
                      </span>
                    </div>

                    <Progress value={progressPercent} className="h-2 rounded-full" />

                    <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono text-xs">
                      <div className="p-1.5 rounded-md bg-card/60 border border-border/40">
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Livres</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs">
                          {pass.available_credits}
                        </span>
                      </div>
                      <div className="p-1.5 rounded-md bg-card/60 border border-border/40">
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Reservadas</span>
                        <span className="font-black text-amber-600 dark:text-amber-400 text-xs">
                          {pass.reserved_credits}
                        </span>
                      </div>
                      <div className="p-1.5 rounded-md bg-card/60 border border-border/40">
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Realizadas</span>
                        <span className="font-black text-foreground text-xs">
                          {pass.completed_credits}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 font-mono">
                      <span>
                        Validade: {format(new Date(pass.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      {pass.auto_renew && (
                        <span className="text-primary font-semibold">Auto-renovável</span>
                      )}
                    </div>
                  </div>

                  {/* Seção de Próximas Aulas Agendadas com Cancelamento Tempestivo (EARS-05) */}
                  {pass.upcoming_appointments.length > 0 && (
                    <div className="p-3 rounded-xl bg-card border border-border/60 space-y-2">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Calendar size={14} className="text-primary" /> Próximas Aulas Agendadas
                      </span>
                      <div className="space-y-2">
                        {pass.upcoming_appointments.map((appt) => (
                          <div
                            key={appt.id}
                            className="p-2.5 rounded-lg bg-muted/40 border border-border/40 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold text-foreground block">
                                {format(new Date(appt.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-mono">
                                Sessão #{appt.session_number || "1"} • Confirmada
                              </span>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCancelModalAppointment({
                                  id: appt.id,
                                  title: `${title} - Sessão #${appt.session_number || "1"}`,
                                  scheduled_at: appt.scheduled_at,
                                })
                              }
                              className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-border/60 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500"
                            >
                              Cancelar
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions & Ledger Toggle */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      disabled={pass.available_credits <= 0 || isExpired}
                      onClick={() => {
                        setSelectedPass(pass);
                        setIsBookingOpen(true);
                      }}
                      className="flex-1 h-11 min-h-11 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                    >
                      <Calendar className="size-4 mr-2" />
                      Agendar Aula
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setExpandedLedgerPassId(isLedgerOpen ? null : pass.id)
                      }
                      className="size-11 min-h-11 min-w-11 rounded-lg border-border shrink-0 focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                      title="Ver extrato auditável"
                      aria-label="Ver extrato auditável"
                    >
                      {isLedgerOpen ? <ChevronUp size={16} /> : <History size={16} />}
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      size="icon"
                      className="size-11 min-h-11 min-w-11 rounded-lg border-border shrink-0 focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                      title="Suporte sobre este pacote"
                      aria-label="Suporte sobre este pacote"
                    >
                      <Link
                        to="/u/suporte"
                        search={{
                          motivo: "pacote",
                          pass_id: pass.id,
                          loja: store?.name || "",
                        }}
                      >
                        <HelpCircle size={16} />
                      </Link>
                    </Button>
                  </div>

                  {/* Ledger Extrato Expandido (EARS-03) */}
                  {isLedgerOpen && (
                    <div className="p-3 rounded-lg bg-muted/40 text-xs space-y-2 animate-in fade-in duration-200">
                      <span className="font-bold text-xs text-foreground flex items-center gap-2">
                        <History size={14} className="text-primary" /> Extrato do Ledger Auditável
                      </span>
                      {pass.service_pass_ledger.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">
                          Nenhum movimento registrado ainda.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-44 overflow-y-auto no-scrollbar pr-1">
                          {pass.service_pass_ledger.map((log) => (
                            <div
                              key={log.id}
                              className="flex items-center justify-between text-xs py-1.5 border-b border-border/20 last:border-0"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <p className="font-medium text-foreground break-words text-wrap leading-tight">
                                  {log.reason || "Movimentação de créditos"}
                                </p>
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                              <span
                                className={`font-mono font-bold shrink-0 ${
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

      {/* ── Modal de Agendamento por Crédito (EARS-04) ── */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="sm:max-w-md sm:rounded-xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Ticket className="size-5 text-primary" />
              Agendar Aula com Crédito
            </DialogTitle>
          </DialogHeader>

          {selectedPass && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/40 flex items-center justify-between text-xs">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="font-bold text-foreground break-words text-wrap leading-tight">
                    {selectedPass.package_snapshot?.title || selectedPass.service_packages?.title}
                  </p>
                  <span className="text-muted-foreground text-xs break-words text-wrap block mt-0.5">
                    {selectedPass.stores?.name}
                  </span>
                </div>
                <Badge className="bg-primary text-primary-foreground font-mono text-xs shrink-0">
                  {selectedPass.available_credits} livres
                </Badge>
              </div>

              {/* Seletor de Data */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">Selecione o Dia:</label>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot(null);
                  }}
                  className="w-full h-11 min-h-11 px-3 rounded-lg bg-card text-xs font-mono border border-border/60 focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              {/* Grid de Horários Disponíveis */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Horários Livres:</span>
                  {isLoadingSlots && (
                    <span className="text-xs font-normal text-muted-foreground">
                      Carregando grade...
                    </span>
                  )}
                </label>

                {availableSlots.length === 0 ? (
                  <div className="p-4 rounded-lg bg-muted/20 text-center text-xs text-muted-foreground">
                    Nenhum horário livre encontrado para esta data. Selecione outro dia.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
                    {availableSlots.map((slot: string) => {
                      const timeStr = format(new Date(slot), "HH:mm");
                      const isSelected = selectedSlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`h-11 min-h-11 px-3 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary ${
                            isSelected
                              ? "bg-foreground text-background border-foreground"
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

          <DialogFooter className="gap-2 pt-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsBookingOpen(false)}
              className="h-11 min-h-11 rounded-lg text-xs font-bold border-border cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              disabled={!selectedSlot || bookMutation.isPending}
              onClick={() => bookMutation.mutate()}
              className="h-11 min-h-11 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              {bookMutation.isPending ? "Confirmando..." : "Confirmar Agendamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal de Confirmação de Cancelamento de Sessão (EARS-05) ── */}
      <Dialog
        open={!!cancelModalAppointment}
        onOpenChange={(open) => !open && setCancelModalAppointment(null)}
      >
        <DialogContent className="sm:max-w-md sm:rounded-xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
              Cancelar Agendamento
            </DialogTitle>
          </DialogHeader>

          {cancelModalAppointment && (
            <div className="space-y-3 py-2 text-xs">
              <p className="text-foreground">
                Deseja realmente cancelar seu agendamento para{" "}
                <strong className="text-foreground">
                  {format(new Date(cancelModalAppointment.scheduled_at), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </strong>
                ?
              </p>
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                O crédito de 1 aula será automaticamente restituído ao seu saldo de créditos livres imediatamente.
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCancelModalAppointment(null)}
              className="h-11 min-h-11 rounded-lg text-xs font-bold border-border cursor-pointer"
            >
              Manter Agendamento
            </Button>
            <Button
              disabled={cancelAppointmentMutation.isPending}
              onClick={() => {
                if (cancelModalAppointment) {
                  cancelAppointmentMutation.mutate(cancelModalAppointment.id);
                }
              }}
              className="h-11 min-h-11 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer"
            >
              {cancelAppointmentMutation.isPending ? "Cancelando..." : "Confirmar Cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
