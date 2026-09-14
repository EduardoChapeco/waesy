import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Plane,
  Hotel,
  Car,
  FileWarning,
  Clock,
  CheckCircle2,
  Plus,
  ChevronRight,
  ShieldAlert,
  Utensils,
  RefreshCw,
  FileText,
  MessageSquare,
  PhoneCall,
  Building2,
  Send,
  Circle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { WorkspaceCanonicalToolbar } from '@/components/workspace/workspace-canonical-toolbar';
import { EmptyState } from '@/components/state/states';
import { getStoreSettings } from '@/services/store.functions';
import {
  listTourismIncidents,
  createTourismIncident,
  getIncidentDetail,
  addIncidentEvent,
  updateIncidentStatus,
  INCIDENT_TYPE_LABELS,
  INCIDENT_STATUS_LABELS,
  type TourismIncidentItem,
  type TourismIncidentEvent,
  type TourismIncidentType,
  type TourismIncidentPriority,
  type TourismIncidentStatus,
  type TourismEventType,
} from '@/services/tourism-incidents.functions';
import { useWorkspaceStore } from '@/lib/store-context';

export const Route = createFileRoute('/workspace/turismo/incidentes')({
  head: () => ({
    meta: [{ title: 'Incidentes Turísticos | Workspace' }],
  }),
  loader: async () => {
    try {
    const store = await getStoreSettings().catch(() => null);
    return { store };
    } catch (err) {
      console.error("[loader:workspace.turismo.incidentes] Unhandled error:", err);
      return { store: null };
    }
  },
  component: TourismIncidentsPage,
});

// ── Icon por tipo de incidente ──
function IncidentTypeIcon({ type, className = 'size-4' }: { type: TourismIncidentType; className?: string }) {
  switch (type) {
    case 'flight_change':
    case 'flight_cancellation':
    case 'overbooking':
    case 'connection_lost':
    case 'schedule_change':
      return <Plane className={className} />;
    case 'hotel_issue':
      return <Hotel className={className} />;
    case 'transfer_delay':
      return <Car className={className} />;
    default:
      return <FileWarning className={className} />;
  }
}

// ── Icon por tipo de evento ──
function EventIcon({ type }: { type: TourismEventType }) {
  switch (type) {
    case 'opened':        return <Circle className="size-3.5 text-amber-500 fill-amber-500" />;
    case 'status_change': return <ArrowRight className="size-3.5 text-sky-500" />;
    case 'airline_contact': return <Building2 className="size-3.5 text-violet-500" />;
    case 'client_contact': return <PhoneCall className="size-3.5 text-emerald-500" />;
    case 'anac_rights_sent': return <ShieldAlert className="size-3.5 text-amber-500" />;
    case 'rebooking_offer': return <RefreshCw className="size-3.5 text-blue-500" />;
    case 'client_accepted': return <CheckCircle2 className="size-3.5 text-emerald-500" />;
    case 'client_rejected': return <AlertTriangle className="size-3.5 text-red-500" />;
    case 'protocol_received': return <FileText className="size-3.5 text-indigo-500" />;
    case 'refund_initiated': return <RefreshCw className="size-3.5 text-orange-500" />;
    case 'resolved':       return <CheckCircle2 className="size-3.5 text-emerald-600 fill-emerald-600" />;
    default:               return <MessageSquare className="size-3.5 text-muted-foreground" />;
  }
}

function priorityBadgeClass(p: TourismIncidentPriority) {
  switch (p) {
    case 'urgent': return 'bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-400';
    case 'high':   return 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400';
    case 'normal': return 'bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400';
    default:       return 'bg-muted text-muted-foreground border-border';
  }
}

function priorityLabel(p: TourismIncidentPriority) {
  switch (p) {
    case 'urgent': return 'Urgente';
    case 'high':   return 'Alta';
    case 'normal': return 'Normal';
    default:       return 'Baixa';
  }
}

// ── Componente Principal ──
export default function TourismIncidentsPage() {
  const loaderData = Route.useLoaderData?.() as any;
  const { currentStore } = useWorkspaceStore();
  const qc = useQueryClient();
  const storeId = loaderData?.store?.id || currentStore?.id || '';

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sheet de detalhe
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyType, setReplyType] = useState<TourismEventType>('note');

  // Sheet de novo incidente
  const [newOpen, setNewOpen] = useState(false);
  const [incidentType, setIncidentType] = useState<TourismIncidentType>('flight_change');
  const [priority, setPriority] = useState<TourismIncidentPriority>('normal');
  const [passengerName, setPassengerName] = useState('');
  const [passengerContact, setPassengerContact] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [airlineCode, setAirlineCode] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [description, setDescription] = useState('');
  const [delayHours, setDelayHours] = useState(0);

  // ── Queries ──
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['tourism-incidents', storeId, activeTab],
    queryFn: () => listTourismIncidents({
      data: {
        store_id: storeId,
        status: activeTab !== 'all' && activeTab !== 'flight' && activeTab !== 'urgent' ? activeTab : undefined,
      },
    }),
    enabled: Boolean(storeId),
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['tourism-incident-detail', selectedId],
    queryFn: () => getIncidentDetail({ data: { incident_id: selectedId! } }),
    enabled: Boolean(selectedId),
  });

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: () => createTourismIncident({
      data: {
        store_id: storeId,
        incident_type: incidentType,
        priority,
        passenger_name: passengerName || null,
        passenger_contact: passengerContact || null,
        booking_reference: bookingRef || null,
        airline_code: airlineCode || null,
        origin_flight_number: flightNumber || null,
        description: description.trim(),
        delay_hours: delayHours,
      },
    }),
    onSuccess: () => {
      toast.success('Incidente registrado com sucesso!');
      setNewOpen(false);
      setPassengerName(''); setPassengerContact(''); setBookingRef('');
      setAirlineCode(''); setFlightNumber(''); setDescription('');
      qc.invalidateQueries({ queryKey: ['tourism-incidents', storeId] });
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao registrar incidente'),
  });

  const addEventMutation = useMutation({
    mutationFn: () => addIncidentEvent({
      data: {
        incident_id: selectedId!,
        event_type: replyType,
        description: replyText.trim(),
      },
    }),
    onSuccess: () => {
      toast.success('Evento registrado na linha do tempo!');
      setReplyText('');
      qc.invalidateQueries({ queryKey: ['tourism-incident-detail', selectedId] });
      qc.invalidateQueries({ queryKey: ['tourism-incidents', storeId] });
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao registrar evento'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (args: { status: TourismIncidentStatus; note?: string }) =>
      updateIncidentStatus({ data: { incident_id: selectedId!, ...args } }),
    onSuccess: () => {
      toast.success('Status atualizado!');
      qc.invalidateQueries({ queryKey: ['tourism-incident-detail', selectedId] });
      qc.invalidateQueries({ queryKey: ['tourism-incidents', storeId] });
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao atualizar status'),
  });

  // ── Filtros ──
  const filtered = useMemo(() => {
    return incidents.filter((i) => {
      if (activeTab === 'urgent' && i.priority !== 'urgent') return false;
      if (activeTab === 'flight' && !['flight_change', 'flight_cancellation', 'overbooking', 'connection_lost', 'schedule_change'].includes(i.incident_type)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (i.passenger_name?.toLowerCase().includes(q)) ||
          (i.booking_reference?.toLowerCase().includes(q)) ||
          INCIDENT_TYPE_LABELS[i.incident_type]?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [incidents, activeTab, searchQuery]);

  // ── Contadores ──
  const openCount = incidents.filter((i) => i.status === 'open').length;
  const urgentCount = incidents.filter((i) => i.priority === 'urgent').length;
  const flightCount = incidents.filter((i) =>
    ['flight_change', 'flight_cancellation', 'overbooking', 'connection_lost', 'schedule_change'].includes(i.incident_type)
  ).length;
  const resolvedCount = incidents.filter((i) => i.status === 'resolved' || i.status === 'closed').length;

  const detail = detailData?.incident;
  const events = detailData?.events || [];
  const isFlightType = detail && ['flight_change', 'flight_cancellation', 'overbooking', 'connection_lost', 'schedule_change'].includes(detail.incident_type);
  const anacRights = detail?.anac_rights_summary as any;

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 flex flex-col gap-4 min-h-[calc(100vh-8.5rem)] pb-20 animate-in fade-in duration-200">
      {/* ── Toolbar Canônica ── */}
      <WorkspaceCanonicalToolbar
        tabs={[
          { id: 'all', label: 'Todos', icon: FileWarning, count: incidents.length },
          { id: 'open', label: 'Abertos', icon: Clock, count: openCount },
          { id: 'urgent', label: 'Urgentes', icon: AlertTriangle, count: urgentCount },
          { id: 'flight', label: 'Voos', icon: Plane, count: flightCount },
          { id: 'resolved', label: 'Resolvidos', icon: CheckCircle2, count: resolvedCount },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Buscar por passageiro, reserva ou tipo de incidente..."
        primaryAction={{
          label: 'Novo Incidente',
          icon: Plus,
          onClick: () => setNewOpen(true),
        }}
      />

      {/* ── Lista de Incidentes ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin mr-2" />
          Carregando incidentes...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nenhum incidente registrado"
          description={
            activeTab === 'all'
              ? 'Quando uma CIA aérea comunicar uma alteração ou houver um problema operacional, registre um incidente aqui para acompanhar a resolução.'
              : 'Nenhum incidente encontrado com este filtro.'
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((incident) => {
            const st = INCIDENT_STATUS_LABELS[incident.status] || INCIDENT_STATUS_LABELS.open;
            return (
              <div
                key={incident.id}
                onClick={() => setSelectedId(incident.id)}
                className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl border border-border/70 bg-card hover:bg-muted/30 cursor-pointer transition-all shadow-2xs group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <IncidentTypeIcon type={incident.incident_type} />
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-foreground">
                        {INCIDENT_TYPE_LABELS[incident.incident_type]}
                      </span>
                      {incident.priority === 'urgent' && (
                        <Badge variant="outline" className={`text-[10px] ${priorityBadgeClass('urgent')}`}>
                          Urgente
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      {incident.passenger_name && <span>{incident.passenger_name}</span>}
                      {incident.booking_reference && (
                        <>
                          {incident.passenger_name && <span>•</span>}
                          <span className="font-mono">{incident.booking_reference}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{new Date(incident.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="outline" className={`text-[10px] border font-semibold hidden sm:inline-flex ${st.className}`}>
                    {st.label}
                  </Badge>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sheet de Detalhe do Incidente ── */}
      <Sheet open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent
          side="right"
          size="wide"
          className="w-full max-sm:!max-w-full max-sm:!w-screen sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] border-l p-0 flex flex-col h-full bg-card overflow-hidden"
        >
          {detailLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : detail ? (
            <>
              <SheetHeader className="px-5 py-4 border-b border-border/60 bg-muted/20 shrink-0">
                <SheetTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <IncidentTypeIcon type={detail.incident_type} className="size-4 text-primary" />
                  <span>{INCIDENT_TYPE_LABELS[detail.incident_type]}</span>
                  <Badge
                    variant="outline"
                    className={`ml-auto text-[10px] ${INCIDENT_STATUS_LABELS[detail.status]?.className}`}
                  >
                    {INCIDENT_STATUS_LABELS[detail.status]?.label}
                  </Badge>
                </SheetTitle>

                {/* Metadata row */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground font-mono pt-1">
                  {detail.passenger_name && <span>👤 {detail.passenger_name}</span>}
                  {detail.booking_reference && <span>🔖 {detail.booking_reference}</span>}
                  {detail.airline_code && <span>✈ {detail.airline_code} {detail.origin_flight_number}</span>}
                  {detail.airline_protocol_number && (
                    <span className="text-violet-600 dark:text-violet-400 font-semibold">
                      Protocolo CIA: {detail.airline_protocol_number}
                    </span>
                  )}
                </div>

                {/* ANAC Rights badge for flight incidents */}
                {isFlightType && anacRights?.material_assistance && (
                  <div className="mt-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className="flex items-center gap-1.5 col-span-2">
                      <ShieldAlert className="size-3.5 text-amber-600" />
                      <span className="font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide text-[10px]">Direitos ANAC 400</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Utensils className="size-3 text-muted-foreground" />
                      <span className={anacRights.material_assistance.food_voucher ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-muted-foreground'}>
                        Alimentação: {anacRights.material_assistance.food_voucher ? 'Obrigatório' : 'Não requerido'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Hotel className="size-3 text-muted-foreground" />
                      <span className={anacRights.material_assistance.lodging_and_transfer ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-muted-foreground'}>
                        Hospedagem: {anacRights.material_assistance.lodging_and_transfer ? 'Obrigatório' : 'Não requerido'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RefreshCw className="size-3 text-muted-foreground" />
                      <span className={anacRights.reaccommodation_options?.competitor_flights ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-muted-foreground'}>
                        Voo concorrente: {anacRights.reaccommodation_options?.competitor_flights ? 'Permitido' : 'Só própria CIA'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileText className="size-3 text-muted-foreground" />
                      <span className={anacRights.reaccommodation_options?.full_refund_eligible ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-muted-foreground'}>
                        Reembolso 100%: {anacRights.reaccommodation_options?.full_refund_eligible ? 'Direito' : 'Sujeito a regra'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Quick status actions */}
                {detail.status !== 'resolved' && detail.status !== 'closed' && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {detail.status !== 'in_analysis' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ status: 'in_analysis' })}
                        disabled={updateStatusMutation.isPending}
                        className="h-7 px-2.5 text-[11px] gap-1 font-semibold cursor-pointer"
                      >
                        Em Análise
                      </Button>
                    )}
                    {detail.status !== 'awaiting_airline' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ status: 'awaiting_airline' })}
                        disabled={updateStatusMutation.isPending}
                        className="h-7 px-2.5 text-[11px] gap-1 font-semibold cursor-pointer"
                      >
                        Aguardando CIA
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ status: 'resolved', note: 'Incidente resolvido pela agência.' })}
                      disabled={updateStatusMutation.isPending}
                      className="h-7 px-2.5 text-[11px] gap-1 text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
                    >
                      <CheckCircle2 className="size-3" />
                      Marcar Resolvido
                    </Button>
                  </div>
                )}
              </SheetHeader>

              {/* ── Linha do Tempo ── */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-3">
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-3">
                  Linha do Tempo
                </p>
                {events.map((ev, i) => (
                  <div key={ev.id} className="flex gap-3">
                    <div className="flex flex-col items-center gap-0.5 shrink-0">
                      <div className="size-6 rounded-full bg-muted flex items-center justify-center">
                        <EventIcon type={ev.event_type} />
                      </div>
                      {i < events.length - 1 && (
                        <div className="w-px h-4 bg-border/60" />
                      )}
                    </div>
                    <div className="pb-3 flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground leading-snug">{ev.description}</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {new Date(ev.created_at).toLocaleString('pt-BR', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                {events.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Nenhum evento registrado ainda.</p>
                )}
              </div>

              {/* ── Input de Novo Evento ── */}
              <div className="p-4 border-t border-border/60 bg-muted/10 shrink-0 space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    value={replyType}
                    onChange={(e) => setReplyType(e.target.value as TourismEventType)}
                    className="h-8 px-2 rounded-lg border border-input bg-background text-[11px] font-medium text-foreground focus:outline-none shrink-0"
                  >
                    <option value="note">Nota Interna</option>
                    <option value="airline_contact">Contato CIA</option>
                    <option value="client_contact">Contato Cliente</option>
                    <option value="anac_rights_sent">Direitos Enviados</option>
                    <option value="rebooking_offer">Oferta Reacomodação</option>
                    <option value="protocol_received">Protocolo Recebido</option>
                    <option value="refund_initiated">Reembolso Iniciado</option>
                  </select>
                </div>
                <form
                  onSubmit={(e) => { e.preventDefault(); if (replyText.trim()) addEventMutation.mutate(); }}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Registrar ação, contato ou observação..."
                    className="h-10 rounded-xl text-xs flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={addEventMutation.isPending || !replyText.trim()}
                    className="size-10 rounded-xl shrink-0 cursor-pointer"
                  >
                    <Send className="size-4" />
                  </Button>
                </form>
                {/* Acionar WhatsApp passageiro */}
                {detail.passenger_contact && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-9 gap-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 border-emerald-500/30 cursor-pointer"
                    onClick={() => {
                      const msg = encodeURIComponent(
                        `Olá${detail.passenger_name ? ` ${detail.passenger_name}` : ''}! Estamos acompanhando sua situação${detail.booking_reference ? ` (Reserva: ${detail.booking_reference})` : ''} e trabalhando para resolver o mais rápido possível. Por favor aguarde nosso contato.`
                      );
                      const phone = detail.passenger_contact?.replace(/\D/g, '');
                      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                    }}
                  >
                    <PhoneCall className="size-3.5" />
                    Acionar Passageiro via WhatsApp
                  </Button>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* ── Sheet de Novo Incidente ── */}
      <Sheet open={newOpen} onOpenChange={setNewOpen}>
        <SheetContent
          side="right"
          size="wide"
          className="w-full max-sm:!max-w-full max-sm:!w-screen sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] border-l p-0 overflow-y-auto no-scrollbar bg-card flex flex-col h-full"
        >
          <SheetHeader className="px-5 py-4 border-b border-border/60 bg-muted/20 shrink-0">
            <SheetTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              Registrar Incidente Turístico
            </SheetTitle>
          </SheetHeader>

          <form
            onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
            className="flex-1 flex flex-col"
          >
            <div className="flex-1 p-5 space-y-4 overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Tipo de Incidente *</Label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value as TourismIncidentType)}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-medium text-foreground focus:outline-none"
                  >
                    <option value="flight_change">Alteração de Voo pela CIA Aérea</option>
                    <option value="flight_cancellation">Cancelamento de Voo</option>
                    <option value="overbooking">Preterição de Embarque (Overbooking)</option>
                    <option value="connection_lost">Perda de Voo de Conexão</option>
                    <option value="schedule_change">Alteração de Malha Programada</option>
                    <option value="hotel_issue">Problema com Hotel / Hospedagem</option>
                    <option value="transfer_delay">Atraso em Transfer</option>
                    <option value="visa_issue">Problema com Visto / Documentação</option>
                    <option value="other">Outro Incidente</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Prioridade *</Label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TourismIncidentPriority)}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-none"
                  >
                    <option value="urgent">Urgente — Passageiro no aeroporto agora</option>
                    <option value="high">Alta — Viagem nas próximas 24h</option>
                    <option value="normal">Normal — Viagem nos próximos dias</option>
                    <option value="low">Baixa</option>
                  </select>
                </div>

                {['flight_change', 'flight_cancellation', 'overbooking', 'connection_lost', 'schedule_change'].includes(incidentType) && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Atraso Estimado (horas)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={delayHours}
                      onChange={(e) => setDelayHours(Number(e.target.value))}
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Passageiro / Cliente</Label>
                  <Input
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    placeholder="Nome completo"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Contato (WhatsApp)</Label>
                  <Input
                    value={passengerContact}
                    onChange={(e) => setPassengerContact(e.target.value)}
                    placeholder="+55 49 9 9999-9999"
                    className="h-10 text-xs rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Referência de Reserva</Label>
                  <Input
                    value={bookingRef}
                    onChange={(e) => setBookingRef(e.target.value)}
                    placeholder="Ex: LABB3K, RO4521..."
                    className="h-10 text-xs rounded-xl font-mono uppercase"
                  />
                </div>

                {['flight_change', 'flight_cancellation', 'overbooking', 'connection_lost', 'schedule_change'].includes(incidentType) && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">CIA Aérea</Label>
                      <Input
                        value={airlineCode}
                        onChange={(e) => setAirlineCode(e.target.value.toUpperCase())}
                        placeholder="Ex: LA, G3, AD..."
                        className="h-10 text-xs rounded-xl font-mono"
                        maxLength={3}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Voo Original</Label>
                      <Input
                        value={flightNumber}
                        onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                        placeholder="Ex: LA3214, G3 1234..."
                        className="h-10 text-xs rounded-xl font-mono"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Descrição do Incidente *</Label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva o que aconteceu: o que a CIA comunicou, quando, e qual o impacto para o passageiro..."
                    className="w-full h-24 p-3 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-none resize-none leading-relaxed"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewOpen(false)}
                className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !description.trim()}
                className="h-10 px-5 rounded-xl text-xs font-bold cursor-pointer"
              >
                {createMutation.isPending ? (
                  <><Loader2 className="size-3 animate-spin mr-1.5" />Registrando...</>
                ) : (
                  'Registrar Incidente'
                )}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
