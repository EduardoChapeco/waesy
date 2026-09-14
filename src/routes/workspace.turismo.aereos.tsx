import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plane,
  Plus,
  Search,
  Hash,
  MapPin,
  Calendar,
  Clock,
  Briefcase,
  Layers,
  CheckCircle2,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Building,
  User,
  Ticket,
  Copy,
  DollarSign,
  Percent,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { WorkspaceDashboardSheet, type MetricCardItem } from '@/components/workspace/workspace-dashboard-sheet';
import { WorkspaceCanonicalToolbar } from '@/components/workspace/workspace-canonical-toolbar';
import { toast } from 'sonner';
import { useWorkspaceStore } from '@/lib/store-context';
import { getStoreSettings } from '@/services/store.functions';
import { listFlightItineraries, createFlightItinerary, deleteFlightItinerary } from '@/services/travel-flights.functions';
import { listCustomers } from '@/services/crm.functions';
import { listTravelSuppliers } from '@/services/travel-suppliers.functions';
import type { TravelFlightItinerary, FlightCabin, FlightItineraryType } from '@/types/travel-flights';
import { formatMoney } from '@/lib/money';

const CONSOLIDATOR_PRESETS = [
  'RexturAdvance',
  'Flytour Gapnet',
  'Sakura Consolidadora',
  'Confiança Turismo',
  'Consolidadora Nacional Aérea',
  'Agência Parceira de Emissão',
  'Smiles Fidelidade',
  'LATAM Pass',
  'Livelo / TudoAzul',
  'Emissão Direta Cia Aérea',
];

export const Route = createFileRoute('/workspace/turismo/aereos')({
  head: () => ({ meta: [{ title: 'Emissões Aéreas & Bilhetes GDS | Workspace Waesy' }] }),
  loader: async () => {
    try {
      const store = await getStoreSettings().catch(() => null);
      return { store };
    } catch (err) {
      console.error("[loader:workspace.turismo.aereos] Unhandled loader error:", err);
      return { store: null };
    }
  },
  component: FlightsPage,
});

export default function FlightsPage() {
  const loaderData = Route.useLoaderData?.() as any;
  const { currentStore } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const storeId = loaderData?.store?.id || currentStore?.id || '00000000-0000-0000-0000-000000000000';

  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);

  // Form State — Emissão Agência de Turismo
  const [title, setTitle] = useState('');
  const [itineraryType, setItineraryType] = useState<FlightItineraryType>('confirmed');
  const [consolidator, setConsolidator] = useState('RexturAdvance');
  const [customConsolidator, setCustomConsolidator] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [passengerName, setPassengerName] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [recordLocator, setRecordLocator] = useState('');

  // Segment fields
  const [airlineCode, setAirlineCode] = useState('LA');
  const [airlineName, setAirlineName] = useState('LATAM Airlines');
  const [flightNumber, setFlightNumber] = useState('3214');
  const [originIata, setOriginIata] = useState('GRU');
  const [originCity, setOriginCity] = useState('São Paulo');
  const [destinationIata, setDestinationIata] = useState('MIA');
  const [destinationCity, setDestinationCity] = useState('Miami');
  const [departureAt, setDepartureAt] = useState('2026-10-15T23:30');
  const [arrivalAt, setArrivalAt] = useState('2026-10-16T07:15');
  const [cabin, setCabin] = useState<FlightCabin>('economy');
  const [baggage, setBaggage] = useState('1x 23kg Despachada');
  const [airportTerminal, setAirportTerminal] = useState('Terminal 3');

  // Financeiro da Emissão (Custo, Fee, RAV e Comissão da Agência)
  const [fareAmount, setFareAmount] = useState('3500.00');
  const [taxAmount, setTaxAmount] = useState('450.00');
  const [agencyFee, setAgencyFee] = useState('180.00');
  const [agencyCommission, setAgencyCommission] = useState('250.00');

  // Dados reais
  const { data: itineraries = [], isLoading } = useQuery({
    queryKey: ['travel-flight-itineraries', storeId],
    queryFn: () => listFlightItineraries({ data: { storeId } }),
    enabled: Boolean(storeId),
  });

  const { data: customersData } = useQuery({
    queryKey: ['crm-customers-picker', storeId],
    queryFn: () => listCustomers({ data: {} }).catch(() => []),
    enabled: Boolean(storeId),
  });
  const customers: any[] = Array.isArray(customersData) ? customersData : (customersData as any)?.customers || [];

  const { data: suppliers = [] } = useQuery({
    queryKey: ['travel-suppliers-air', storeId],
    queryFn: () => listTravelSuppliers({ data: { store_id: storeId } }).catch(() => []),
    enabled: Boolean(storeId),
  });

  const activeConsolidators = useMemo(() => {
    const fromSuppliers = suppliers
      .filter((s) => s.kind === 'operator' || s.kind === 'airline')
      .map((s) => s.name);
    return Array.from(new Set([...CONSOLIDATOR_PRESETS, ...fromSuppliers]));
  }, [suppliers]);

  const activePassengerDisplay = useMemo(() => {
    if (selectedCustomerId) {
      const found = customers.find((c: any) => c.id === selectedCustomerId);
      if (found) return found.full_name;
    }
    return passengerName;
  }, [selectedCustomerId, customers, passengerName]);

  const totalTicketPrice = useMemo(() => {
    const fare = parseFloat(fareAmount) || 0;
    const tax = parseFloat(taxAmount) || 0;
    const fee = parseFloat(agencyFee) || 0;
    return fare + tax + fee;
  }, [fareAmount, taxAmount, agencyFee]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const chosenConsolidator = consolidator === 'custom' ? customConsolidator : consolidator;
      const passenger = activePassengerDisplay.trim() || 'Passageiro Geral';

      const agencyMetadata = {
        consolidator: chosenConsolidator,
        passenger_name: passenger,
        customer_id: selectedCustomerId || null,
        financial: {
          fare_cents: Math.round((parseFloat(fareAmount) || 0) * 100),
          tax_cents: Math.round((parseFloat(taxAmount) || 0) * 100),
          fee_cents: Math.round((parseFloat(agencyFee) || 0) * 100),
          commission_cents: Math.round((parseFloat(agencyCommission) || 0) * 100),
          total_cents: Math.round(totalTicketPrice * 100),
        },
      };

      return createFlightItinerary({
        data: {
          store_id: storeId,
          title: title.trim() || `Bilhete ${recordLocator.toUpperCase() || 'GDS'} - ${passenger}`,
          itinerary_type: itineraryType,
          status: 'active',
          notes: JSON.stringify(agencyMetadata),
          segments: [
            {
              airline_code: airlineCode.toUpperCase(),
              airline_name: airlineName,
              flight_number: flightNumber.toUpperCase(),
              origin_iata: originIata.toUpperCase(),
              origin_city: originCity,
              destination_iata: destinationIata.toUpperCase(),
              destination_city: destinationCity,
              departure_at: departureAt,
              arrival_at: arrivalAt,
              cabin,
              baggage,
              record_locator: recordLocator.toUpperCase(),
              ticket_number: ticketNumber.trim(),
              airport_terminal: airportTerminal,
            },
          ],
        },
      });
    },
    onSuccess: () => {
      toast.success('Bilhete aéreo e localizador cadastrados com sucesso!');
      setIsDialogOpen(false);
      setTitle('');
      setTicketNumber('');
      setRecordLocator('');
      setSelectedCustomerId('');
      setPassengerName('');
      queryClient.invalidateQueries({ queryKey: ['travel-flight-itineraries', storeId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao cadastrar emissão aérea.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFlightItinerary({ data: { id } }),
    onSuccess: () => {
      toast.success('Emissão aérea excluída com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['travel-flight-itineraries', storeId] });
    },
  });

  const parsedItineraries = useMemo(() => {
    return itineraries.map((it) => {
      let meta: any = null;
      if (it.notes) {
        try {
          meta = JSON.parse(it.notes);
        } catch {
          meta = null;
        }
      }
      return {
        ...it,
        agencyMeta: meta,
      };
    });
  }, [itineraries]);

  const filteredItineraries = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return parsedItineraries;
    return parsedItineraries.filter((it) => {
      const meta = it.agencyMeta;
      const segs = it.segments || [];
      const text = [
        it.title,
        meta?.passenger_name,
        meta?.consolidator,
        ...segs.map((s) => `${s.flight_number} ${s.record_locator} ${s.ticket_number} ${s.origin_iata} ${s.destination_iata} ${s.airline_name}`),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(term);
    });
  }, [parsedItineraries, searchTerm]);

  const totalCommissionsCents = useMemo(() => {
    return parsedItineraries.reduce((acc, it) => {
      const comm = it.agencyMeta?.financial?.commission_cents || 0;
      return acc + comm;
    }, 0);
  }, [parsedItineraries]);

  const dashboardMetrics: MetricCardItem[] = useMemo(() => [
    {
      title: "Bilhetes Emitidos",
      value: itineraries.length,
      description: "Emissões ativas no GDS",
      icon: Ticket,
      color: "blue",
    },
    {
      title: "Trechos Voados / Conexões",
      value: itineraries.reduce((acc, it) => acc + (it.segments?.length || 0), 0),
      description: "Segmentos aéreos vinculados",
      icon: Layers,
      color: "amber",
    },
    {
      title: "Localizadores Confirmados (PNR)",
      value: itineraries.filter((it) => it.segments?.some((s) => s.record_locator)).length,
      description: "Reservas ativas com código",
      icon: Hash,
      color: "emerald",
    },
    {
      title: "Comissões & RAV Acumuladas",
      value: formatMoney(totalCommissionsCents),
      description: "Receita de emissão da agência",
      icon: DollarSign,
      color: "purple",
    },
  ], [itineraries, totalCommissionsCents]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto w-full overflow-x-hidden">
      <WorkspaceCanonicalToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por bilhete e-ticket, localizador PNR, passageiro, voo ou rota..."
        onMetricsClick={() => setIsMetricsOpen(true)}
        metricsBadge={itineraries.length > 0 ? `${itineraries.length} Bilhetes` : undefined}
        primaryAction={{
          label: "Nova Emissão / Bilhete",
          icon: Plus,
          onClick: () => setIsDialogOpen(true),
        }}
      />

      <WorkspaceDashboardSheet
        title="Painel de Emissões & Consolidadoras"
        open={isMetricsOpen}
        onOpenChange={setIsMetricsOpen}
        items={dashboardMetrics}
      />

      {/* Sheet Lateral Ampliada (size="wide" -> 70% viewport) */}
      <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <SheetContent size="wide" className="w-full max-sm:!max-w-full max-sm:!w-screen p-0 flex flex-col h-full bg-card overflow-hidden">
          <SheetHeader className="px-6 py-4 border-b border-border/60 bg-muted/20 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Ticket className="size-5" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold">Registrar Emissão Aérea (GDS & Consolidadora)</SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Cadastre o bilhete eletrônico, PNR, rota, dados do passageiro e comissionamento da agência.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar">
            {/* Seção 1: Consolidadora & Passageiro */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Building className="size-4 text-primary" />
                1. Emissor, Consolidadora & Passageiro
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-1">
                  <Label className="text-xs font-semibold">Canal / Consolidadora</Label>
                  <select
                    className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm font-medium focus:outline-none"
                    value={consolidator}
                    onChange={(e) => setConsolidator(e.target.value)}
                  >
                    {activeConsolidators.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="custom">+ Outra Consolidadora</option>
                  </select>
                  {consolidator === 'custom' && (
                    <Input
                      placeholder="Nome da consolidadora..."
                      value={customConsolidator}
                      onChange={(e) => setCustomConsolidator(e.target.value)}
                      className="h-10 text-xs mt-2 rounded-xl"
                    />
                  )}
                </div>

                <div className="space-y-1.5 md:col-span-1">
                  <Label className="text-xs font-semibold">Vincular Cliente da Carteira (CRM)</Label>
                  <select
                    className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                  >
                    <option value="">Passageiro Avulso (Digitar Nome)</option>
                    {customers.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} {c.cpf ? `(CPF: ${c.cpf})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-1">
                  <Label className="text-xs font-semibold">Nome Completo do Passageiro</Label>
                  <Input
                    placeholder="Ex: João da Silva Sauro"
                    value={activePassengerDisplay}
                    onChange={(e) => setPassengerName(e.target.value)}
                    disabled={Boolean(selectedCustomerId)}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Seção 2: Localizador PNR & e-Ticket */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Hash className="size-4 text-primary" />
                2. Códigos de Reserva & Bilhete Eletrônico
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Localizador GDS (PNR)</Label>
                  <Input
                    placeholder="Ex: YZK982"
                    value={recordLocator}
                    onChange={(e) => setRecordLocator(e.target.value)}
                    className="h-11 uppercase font-mono font-bold tracking-widest text-base rounded-xl"
                    maxLength={10}
                  />
                  <span className="text-[10px] text-muted-foreground">Código de 6 letras/números da reserva</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Número do e-Ticket IATA (13 Dígitos)</Label>
                  <Input
                    placeholder="Ex: 957-2489102842"
                    value={ticketNumber}
                    onChange={(e) => setTicketNumber(e.target.value)}
                    className="h-11 font-mono text-sm rounded-xl"
                  />
                  <span className="text-[10px] text-muted-foreground">Bilhete oficial emitido pela consolidadora</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Status do Bilhete</Label>
                  <select
                    className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm font-medium focus:outline-none"
                    value={itineraryType}
                    onChange={(e) => setItineraryType(e.target.value as FlightItineraryType)}
                  >
                    <option value="confirmed">Confirmado / Emitido</option>
                    <option value="operator_suggestion">Opção / Bloqueio Solicitado</option>
                    <option value="customer_selected">Aprovado pelo Cliente</option>
                    <option value="original">Reserva Original</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Seção 3: Voo, Companhia e Rota */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Plane className="size-4 text-primary" />
                3. Trecho Voo, Companhia & Horários
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold">Cia Aérea (IATA + Nome)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="LA"
                      value={airlineCode}
                      onChange={(e) => setAirlineCode(e.target.value)}
                      className="h-11 uppercase font-bold text-center rounded-xl"
                      maxLength={3}
                    />
                    <Input
                      placeholder="LATAM Airlines"
                      value={airlineName}
                      onChange={(e) => setAirlineName(e.target.value)}
                      className="h-11 col-span-2 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold">Número do Voo</Label>
                  <Input
                    placeholder="Ex: 3214"
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value)}
                    className="h-11 uppercase font-mono font-bold rounded-xl"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold">Origem (IATA + Cidade)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="GRU"
                      value={originIata}
                      onChange={(e) => setOriginIata(e.target.value)}
                      className="h-11 uppercase font-bold text-center rounded-xl"
                      maxLength={3}
                    />
                    <Input
                      placeholder="São Paulo"
                      value={originCity}
                      onChange={(e) => setOriginCity(e.target.value)}
                      className="h-11 col-span-2 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold">Destino (IATA + Cidade)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="MIA"
                      value={destinationIata}
                      onChange={(e) => setDestinationIata(e.target.value)}
                      className="h-11 uppercase font-bold text-center rounded-xl"
                      maxLength={3}
                    />
                    <Input
                      placeholder="Miami"
                      value={destinationCity}
                      onChange={(e) => setDestinationCity(e.target.value)}
                      className="h-11 col-span-2 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold">Data / Hora Decolagem</Label>
                  <Input
                    type="datetime-local"
                    value={departureAt}
                    onChange={(e) => setDepartureAt(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold">Data / Hora Pouso Estimado</Label>
                  <Input
                    type="datetime-local"
                    value={arrivalAt}
                    onChange={(e) => setArrivalAt(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold">Cabine & Franquia de Bagagem</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="h-11 px-3 rounded-xl border border-input bg-background text-sm font-medium focus:outline-none"
                      value={cabin}
                      onChange={(e) => setCabin(e.target.value as FlightCabin)}
                    >
                      <option value="economy">Econômica</option>
                      <option value="premium_economy">Premium Economy</option>
                      <option value="business">Executiva</option>
                      <option value="first">Primeira Classe</option>
                    </select>
                    <Input
                      placeholder="Ex: 1x 23kg Despachada"
                      value={baggage}
                      onChange={(e) => setBaggage(e.target.value)}
                      className="h-11 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold">Terminal / Portão do Aeroporto</Label>
                  <Input
                    placeholder="Ex: Terminal 3 Internacional"
                    value={airportTerminal}
                    onChange={(e) => setAirportTerminal(e.target.value)}
                    className="h-11 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Seção 4: Composição Tarifária e Comissões da Agência */}
            <div className="space-y-4 p-4 rounded-2xl border border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <DollarSign className="size-4" />
                  4. Composição Tarifária, RAV & Comissões da Agência
                </h4>
                <span className="text-xs font-bold text-foreground">
                  Valor Final Cliente: <strong className="text-primary text-sm">{formatMoney(Math.round(totalTicketPrice * 100))}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Tarifa Base (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={fareAmount}
                    onChange={(e) => setFareAmount(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Taxas Embarque (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Taxa RAV / DU Agência (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={agencyFee}
                    onChange={(e) => setAgencyFee(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Comissão Agência (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={agencyCommission}
                    onChange={(e) => setAgencyCommission(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-background border-emerald-500/40"
                  />
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20 shrink-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="h-11 px-5 rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="h-11 px-6 font-bold rounded-xl bg-primary text-primary-foreground"
            >
              {createMutation.isPending ? 'Salvando...' : 'Confirmar & Salvar Bilhete'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Listagem Canônica de Bilhetes & Emissões */}
      {isLoading ? (
        <div className="p-12 text-center text-sm text-muted-foreground animate-pulse">
          Carregando bilhetes e localizadores do GDS...
        </div>
      ) : filteredItineraries.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card">
          <Ticket className="size-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-semibold text-foreground">Nenhuma emissão aérea encontrada</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Cadastre bilhetes com localizador PNR da consolidadora, franquia de bagagem e comissão.
          </p>
          <Button onClick={() => setIsDialogOpen(true)} className="h-11 px-5 gap-2 rounded-xl">
            <Plus className="size-4" />
            Cadastrar Primeiro Bilhete
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredItineraries.map((it) => {
            const meta = it.agencyMeta;
            const primarySeg = it.segments?.[0];

            return (
              <div
                key={it.id}
                className="p-5 rounded-2xl border border-border bg-card shadow-xs hover:border-primary/40 transition-all flex flex-col gap-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      <Plane className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-foreground">{it.title}</h3>
                        {meta?.consolidator && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-secondary text-secondary-foreground border border-border/50">
                            {meta.consolidator}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Passageiro:{' '}
                        <strong className="text-foreground font-semibold">
                          {meta?.passenger_name || 'Passageiro Geral'}
                        </strong>{' '}
                        · Versão {it.version}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {primarySeg?.record_locator && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(primarySeg.record_locator!, 'Localizador PNR')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors cursor-pointer"
                        title="Clique para copiar localizador"
                      >
                        <Hash className="size-3" />
                        PNR: {primarySeg.record_locator}
                        <Copy className="size-3 ml-1 opacity-70" />
                      </button>
                    )}

                    {primarySeg?.ticket_number && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono bg-muted text-muted-foreground border border-border">
                        <Ticket className="size-3" />
                        e-Ticket: {primarySeg.ticket_number}
                      </span>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(it.id)}
                      className="size-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {/* Segments Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(it.segments || []).map((seg) => (
                    <div
                      key={seg.id}
                      className="p-4 rounded-xl border border-border/70 bg-muted/20 flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-primary text-primary-foreground font-mono font-bold text-xs">
                            {seg.airline_code} {seg.flight_number}
                          </span>
                          <span className="text-xs font-medium text-foreground">{seg.airline_name || 'Companhia Aérea'}</span>
                        </div>
                        <span className="text-xs capitalize text-muted-foreground font-medium">
                          {seg.cabin}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-center px-2 py-1">
                        <div>
                          <p className="text-xl font-extrabold tracking-tight text-foreground">{seg.origin_iata}</p>
                          <p className="text-xs text-muted-foreground">{seg.origin_city || 'Origem'}</p>
                          <p className="text-[11px] font-mono font-medium text-muted-foreground mt-0.5">
                            {new Date(seg.departure_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        <div className="flex flex-col items-center px-4">
                          <ArrowRight className="size-4 text-primary" />
                          <span className="text-[10px] text-muted-foreground mt-0.5">Voo Direto</span>
                        </div>

                        <div>
                          <p className="text-xl font-extrabold tracking-tight text-foreground">{seg.destination_iata}</p>
                          <p className="text-xs text-muted-foreground">{seg.destination_city || 'Destino'}</p>
                          <p className="text-[11px] font-mono font-medium text-muted-foreground mt-0.5">
                            {new Date(seg.arrival_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Briefcase className="size-3.5 text-muted-foreground" />
                          {seg.baggage || 'Franquia Padrão'}
                        </span>
                        <span>{seg.airport_terminal || 'Terminal Geral'}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resumo Financeiro da Emissão */}
                {meta?.financial && (
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-muted/40 border border-border/40 text-xs">
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span>Tarifa: <strong>{formatMoney(meta.financial.fare_cents || 0)}</strong></span>
                      <span>Taxas: <strong>{formatMoney(meta.financial.tax_cents || 0)}</strong></span>
                      <span>RAV/Fee: <strong>{formatMoney(meta.financial.fee_cents || 0)}</strong></span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Comissão Agência: <strong>{formatMoney(meta.financial.commission_cents || 0)}</strong>
                      </span>
                    </div>
                    <div className="text-sm font-bold text-foreground">
                      Total Venda: <span className="text-primary">{formatMoney(meta.financial.total_cents || 0)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
