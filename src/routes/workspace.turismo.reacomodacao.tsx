import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Send,
  ShieldAlert,
  FileText,
  Utensils,
  Hotel,
  RefreshCw,
  PhoneCall,
  ExternalLink,
  Loader2,
  User,
  Plane,
  Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { useWorkspaceStore } from '@/lib/store-context';
import { getStoreSettings } from '@/services/store.functions';
import {
  listFlightChangeCases,
  createFlightChangeCase,
  updateChangeCaseWorkflow,
  calculateAnacRights,
} from '@/services/travel-reaccommodation.functions';
import { listCustomers } from '@/services/crm.functions';
import { listFlightItineraries } from '@/services/travel-flights.functions';
import type {
  TravelFlightChangeCase,
  ChangeReason,
  ReaccommodationPriority,
  ReaccommodationWorkflowStatus,
} from '@/types/travel-reaccommodation';

export const Route = createFileRoute('/workspace/turismo/reacomodacao')({
  head: () => ({ meta: [{ title: 'Casos ANAC 400 & Reacomodação | Workspace Waesy' }] }),
  loader: async () => {
    try {
      const store = await getStoreSettings().catch(() => null);
      return { store };
    } catch (err) {
      console.error('[loader:workspace.turismo.reacomodacao] Unhandled error:', err);
      return { store: null };
    }
  },
  component: ReaccommodationPage,
});

export default function ReaccommodationPage() {
  const loaderData = Route.useLoaderData?.() as any;
  const { currentStore } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const storeId = loaderData?.store?.id || currentStore?.id || '00000000-0000-0000-0000-000000000000';

  const [searchTerm, setSearchTerm] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedItineraryId, setSelectedItineraryId] = useState('');
  const [passengerManualName, setPassengerManualName] = useState('');
  const [changeReason, setChangeReason] = useState<ChangeReason>('flight_cancelled');
  const [priority, setPriority] = useState<ReaccommodationPriority>('urgent');
  const [delayHours, setDelayHours] = useState(5);
  const [passengerNotes, setPassengerNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  const previewRights = calculateAnacRights(changeReason, delayHours);

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['travel-flight-change-cases', storeId],
    queryFn: () => listFlightChangeCases({ data: { storeId } }),
    enabled: Boolean(storeId),
  });

  const { data: customersData } = useQuery({
    queryKey: ['crm-customers-reacc', storeId],
    queryFn: () => listCustomers({ data: {} }).catch(() => []),
    enabled: Boolean(storeId),
  });
  const customers = Array.isArray(customersData) ? customersData : (customersData as any)?.customers || [];

  const { data: itineraries = [] } = useQuery({
    queryKey: ['travel-flight-itineraries-reacc', storeId],
    queryFn: () => listFlightItineraries({ data: { storeId } }).catch(() => []),
    enabled: Boolean(storeId),
  });

  // Taxa de resolução calculada do banco real
  const resolvedCount = cases.filter(
    (c) => c.workflow_status === 'rebooking_confirmed' || c.workflow_status === 'closed'
  ).length;
  const resolutionRate =
    cases.length > 0 ? Math.round((resolvedCount / cases.length) * 100) : 0;

  const createMutation = useMutation({
    mutationFn: async () => {
      const selectedCust = customers.find((c: any) => c.id === selectedCustomerId);
      const selectedItin = itineraries.find((it: any) => it.id === selectedItineraryId);
      const pnr = selectedItin?.segments?.[0]?.record_locator;
      const custName = selectedCust?.fullName || selectedCust?.name || selectedCust?.full_name || 'Passageiro';
      const custPhone = selectedCust?.phone || selectedCust?.whatsapp || 'sem telefone';
      const passengerHeader = selectedCust
        ? `Passageiro: ${custName} (${custPhone})`
        : passengerManualName
        ? `Passageiro: ${passengerManualName}`
        : null;
      const itinHeader = pnr ? `PNR: ${pnr} (${selectedItin?.title})` : null;

      const finalPassengerNotes = [passengerHeader, itinHeader, passengerNotes].filter(Boolean).join(' | ');

      return createFlightChangeCase({
        data: {
          store_id: storeId,
          change_reason: changeReason,
          priority,
          delay_hours: delayHours,
          original_itinerary_id: selectedItineraryId || null,
          passenger_notes: finalPassengerNotes,
          internal_notes: internalNotes,
        },
      });
    },
    onSuccess: () => {
      toast.success('Caso ANAC registrado com sucesso!');
      setIsSheetOpen(false);
      setPassengerNotes('');
      setInternalNotes('');
      setSelectedCustomerId('');
      setSelectedItineraryId('');
      setPassengerManualName('');
      queryClient.invalidateQueries({ queryKey: ['travel-flight-change-cases', storeId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao registrar caso.');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (args: { id: string; status: ReaccommodationWorkflowStatus }) =>
      updateChangeCaseWorkflow({
        data: {
          id: args.id,
          workflow_status: args.status,
        },
      }),
    onSuccess: () => {
      toast.success('Status do caso atualizado!');
      queryClient.invalidateQueries({ queryKey: ['travel-flight-change-cases', storeId] });
    },
  });

  const getReasonLabel = (r: ChangeReason) => {
    switch (r) {
      case 'flight_cancelled': return 'Voo Cancelado';
      case 'delay_over_4h':   return 'Atraso Superior a 4 Horas';
      case 'connection_lost': return 'Perda de Conexão';
      case 'overbooking':     return 'Preterição (Overbooking)';
      case 'schedule_change': return 'Alteração de Malha';
    }
  };

  const getPriorityBadge = (p: ReaccommodationPriority) => {
    switch (p) {
      case 'urgent': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'high':   return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'normal': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default:       return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
    }
  };

  const filteredCases = cases.filter((c) => {
    const text = `${c.change_reason} ${c.passenger_notes || ''} ${c.internal_notes || ''}`.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldAlert className="size-5 text-amber-500" />
            Casos ANAC 400 & Reacomodação Aérea
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registro e assistência ao passageiro em contingências de voo conforme Resolução ANAC 400/2016.{' '}
            <Link
              to="/workspace/turismo/incidentes"
              className="text-primary underline-offset-2 hover:underline inline-flex items-center gap-1"
            >
              Ver Incidentes Turísticos <ExternalLink className="size-3" />
            </Link>
          </p>
        </div>

        <Button
          onClick={() => setIsSheetOpen(true)}
          className="h-11 px-5 gap-2 text-sm font-semibold rounded-xl shadow-xs bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
        >
          <Plus className="size-4" />
          Registrar Novo Caso
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-border bg-card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <AlertTriangle className="size-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Em Análise</p>
            <p className="text-2xl font-bold text-foreground">
              {cases.filter((c) => c.workflow_status === 'pending_analysis').length}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500">
            <ShieldAlert className="size-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Urgentes</p>
            <p className="text-2xl font-bold text-foreground">
              {cases.filter((c) => c.priority === 'urgent').length}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="size-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Reacomodados</p>
            <p className="text-2xl font-bold text-foreground">{resolvedCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
            <RefreshCw className="size-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Taxa de Resolução</p>
            <p className="text-2xl font-bold text-foreground">{resolutionRate}%</p>
          </div>
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por relato, passageiro ou notas do caso..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11 bg-card rounded-xl text-sm"
        />
      </div>

      {/* Lista de Casos */}
      {isLoading ? (
        <div className="p-12 text-center text-sm text-muted-foreground animate-pulse">
          Carregando casos de reacomodação...
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card">
          <ShieldAlert className="size-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-semibold text-foreground">Nenhum caso registrado</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Registre casos de voos cancelados ou atrasados para aplicar as diretrizes da ANAC 400.
          </p>
          <Button
            onClick={() => setIsSheetOpen(true)}
            className="h-11 px-5 gap-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
          >
            <Plus className="size-4" />
            Registrar Primeiro Caso
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredCases.map((c) => (
            <div
              key={c.id}
              className="p-5 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
                    <ShieldAlert className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">{getReasonLabel(c.change_reason)}</h3>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${getPriorityBadge(c.priority)}`}>
                        {c.priority}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Aberto em {c.created_at ? new Date(c.created_at).toLocaleString('pt-BR') : 'Recente'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    className="h-10 sm:h-8 px-3 rounded-xl sm:rounded-lg border border-input bg-background text-xs font-medium focus:outline-none cursor-pointer"
                    value={c.workflow_status}
                    onChange={(e) =>
                      updateStatusMutation.mutate({
                        id: c.id,
                        status: e.target.value as ReaccommodationWorkflowStatus,
                      })
                    }
                  >
                    <option value="pending_analysis">Em Análise</option>
                    <option value="alternatives_sent">Opções Enviadas</option>
                    <option value="client_accepted">Aceito pelo Cliente</option>
                    <option value="client_rejected">Recusado pelo Cliente</option>
                    <option value="rebooking_confirmed">Reacomodação Confirmada</option>
                    <option value="refund_requested">Reembolso Solicitado</option>
                    <option value="closed">Encerrado</option>
                  </select>
                </div>
              </div>

              {/* Relato e Notas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {c.passenger_notes && (
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                    <span className="font-semibold text-foreground block mb-1">Passageiro / Situação:</span>
                    <p className="text-muted-foreground leading-relaxed">{c.passenger_notes}</p>
                  </div>
                )}
                {c.internal_notes && (
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                    <span className="font-semibold text-foreground block mb-1">Anotações da Agência:</span>
                    <p className="text-muted-foreground leading-relaxed">{c.internal_notes}</p>
                  </div>
                )}
              </div>

              {/* Direitos Calculados */}
              {c.anac_rights_summary && (
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex flex-wrap items-center gap-4 text-xs">
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    Direitos ANAC:
                  </span>
                  {c.anac_rights_summary.material_assistance?.food_voucher && (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                      <Utensils className="size-3" /> Voucher Alimentação
                    </span>
                  )}
                  {c.anac_rights_summary.material_assistance?.lodging_and_transfer && (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                      <Hotel className="size-3" /> Hotel + Transfer
                    </span>
                  )}
                  {c.anac_rights_summary.reaccommodation_options?.competitor_flights && (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                      <RefreshCw className="size-3" /> Voo Congênere
                    </span>
                  )}
                  {c.anac_rights_summary.reaccommodation_options?.full_refund_eligible && (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                      <FileText className="size-3" /> Opção de Reembolso Integral
                    </span>
                  )}
                </div>
              )}

              {/* Ações Rápidas */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 sm:h-9 px-4 sm:px-3 text-xs font-bold gap-1.5 rounded-xl cursor-pointer w-full sm:w-auto"
                  onClick={() => {
                    const text = encodeURIComponent(
                      `Olá! Estamos acompanhando a contingência do seu voo (${getReasonLabel(c.change_reason)}). Conforme a Resolução ANAC 400, você possui direitos de assistência material garantidos. Estamos trabalhando na sua reacomodação agora.`
                    );
                    window.open(`https://wa.me/?text=${text}`, '_blank');
                  }}
                >
                  <PhoneCall className="size-4 text-emerald-500" />
                  Notificar Passageiro (WhatsApp)
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sheet de Novo Caso Ampliada (size="wide" -> 70% viewport) */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent size="wide" className="w-full max-sm:!max-w-full max-sm:!w-screen sm:max-w-3xl lg:max-w-[70vw] p-0 flex flex-col h-full bg-card overflow-hidden">
          <SheetHeader className="px-6 py-4 border-b border-border/60 bg-muted/20 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                <ShieldAlert className="size-5" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold">Registrar Caso ANAC 400 (Contingência & Reacomodação)</SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Vincule o passageiro, bilhete aéreo e calcule a assistência material obrigatória por lei.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar">
            {/* Vínculo de Passageiro e Voo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Passageiro Titular (CRM)</Label>
                <select
                  className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  <option value="">Passageiro Avulso / Não cadastrado</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName || c.name || c.full_name || 'Cliente'} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Bilhete / Reserva Vinculada (GDS)</Label>
                <select
                  className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none"
                  value={selectedItineraryId}
                  onChange={(e) => setSelectedItineraryId(e.target.value)}
                >
                  <option value="">Nenhum bilhete vinculado</option>
                  {itineraries.map((it: any) => {
                    const pnr = it.segments?.[0]?.record_locator;
                    return (
                      <option key={it.id} value={it.id}>
                        {it.title} {pnr ? `[PNR: ${pnr}]` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {!selectedCustomerId && (
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold">Nome Completo do Passageiro (Manual)</Label>
                  <Input
                    placeholder="Ex: Maria Aparecida Santos"
                    value={passengerManualName}
                    onChange={(e) => setPassengerManualName(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
              )}
            </div>

            {/* Motivo e Horas de Atraso */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:col-span-1">
                <Label className="text-xs font-semibold">Motivo da Contingência</Label>
                <select
                  className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm font-medium focus:outline-none"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value as ChangeReason)}
                >
                  <option value="flight_cancelled">Cancelamento de Voo pela CIA</option>
                  <option value="delay_over_4h">Atraso Superior a 4 Horas</option>
                  <option value="connection_lost">Perda de Conexão</option>
                  <option value="overbooking">Preterição (Overbooking)</option>
                  <option value="schedule_change">Alteração de Malha / Horário</option>
                </select>
              </div>

              <div className="space-y-1.5 md:col-span-1">
                <Label className="text-xs font-semibold">Prioridade Operacional</Label>
                <select
                  className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ReaccommodationPriority)}
                >
                  <option value="urgent">Urgente (No Aeroporto)</option>
                  <option value="high">Alta (Próximas 24h)</option>
                  <option value="normal">Normal</option>
                  <option value="low">Baixa</option>
                </select>
              </div>

              <div className="space-y-1.5 md:col-span-1">
                <Label className="text-xs font-semibold">Atraso Estimado (Horas)</Label>
                <Input
                  type="number"
                  min={0}
                  value={delayHours}
                  onChange={(e) => setDelayHours(Number(e.target.value))}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            {/* ANAC Rights Preview */}
            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-xs uppercase tracking-wider">
                <ShieldAlert className="size-4" />
                Direitos ANAC 400/2016 Calculados para {delayHours}h de atraso
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-background/60 border border-border/40 flex items-center gap-2">
                  <Utensils className="size-4 text-muted-foreground" />
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Alimentação</span>
                    <strong className={previewRights.material_assistance.food_voucher ? 'text-emerald-600' : 'text-muted-foreground'}>
                      {previewRights.material_assistance.food_voucher ? 'Obrigatório (>2h)' : 'Não obrigatório'}
                    </strong>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-background/60 border border-border/40 flex items-center gap-2">
                  <Hotel className="size-4 text-muted-foreground" />
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Hospedagem</span>
                    <strong className={previewRights.material_assistance.lodging_and_transfer ? 'text-emerald-600' : 'text-muted-foreground'}>
                      {previewRights.material_assistance.lodging_and_transfer ? 'Obrigatório (>4h)' : 'Não obrigatório'}
                    </strong>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-background/60 border border-border/40 flex items-center gap-2">
                  <RefreshCw className="size-4 text-muted-foreground" />
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Voo Concorrente</span>
                    <strong className={previewRights.reaccommodation_options.competitor_flights ? 'text-emerald-600' : 'text-muted-foreground'}>
                      {previewRights.reaccommodation_options.competitor_flights ? 'Permitido Exigir' : 'Só própria CIA'}
                    </strong>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-background/60 border border-border/40 flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Reembolso 100%</span>
                    <strong className={previewRights.reaccommodation_options.full_refund_eligible ? 'text-emerald-600' : 'text-muted-foreground'}>
                      {previewRights.reaccommodation_options.full_refund_eligible ? 'Direito Integral' : 'Sujeito a regra'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Relato e Notas */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Relato do Passageiro / Detalhes da Ocorrência</Label>
                <Textarea
                  placeholder="Ex: Passageiro está no aeroporto de Guarulhos após cancelamento do voo LA3214 por manutenção. Cia não ofereceu voucher de alimentação..."
                  value={passengerNotes}
                  onChange={(e) => setPassengerNotes(e.target.value)}
                  className="min-h-[85px] rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Anotações Internas da Agência (Ações do Plantão)</Label>
                <Input
                  placeholder="Ex: Acionado plantão da RexturAdvance para emitir reacomodação no voo G3 1450..."
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="h-11 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20 shrink-0">
            <Button variant="outline" onClick={() => setIsSheetOpen(false)} className="h-11 px-5 rounded-xl cursor-pointer">
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="h-11 px-6 font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
            >
              {createMutation.isPending ? (
                <><Loader2 className="size-4 animate-spin mr-2" />Registrando...</>
              ) : (
                'Registrar Caso ANAC'
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
