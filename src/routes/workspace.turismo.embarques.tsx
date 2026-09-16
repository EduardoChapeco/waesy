import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Plus,
  Plane,
  Hotel,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  Send,
  FileText,
  ShieldAlert,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Users,
  MapPin,
  Clock,
  Upload,
  X,
  Star,
  Download,
} from 'lucide-react';
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
import { FileAttachmentUpload } from '@/components/ui/file-attachment-upload';
import { toast } from 'sonner';
import { getStoreSettings } from '@/services/store.functions';
import {
  listDepartureCards,
  getDepartureWithChecklist,
  createDepartureCard,
  updateDepartureStage,
  updateDepartureDetails,
  toggleChecklistItem,
  addChecklistItem,
  uploadBoardingDocument,
  deleteDepartureCard,
  AIRLINE_CHECKIN_LINKS,
  type DepartureWithChecklist,
  type ChecklistItem,
  type BoardingDocument,
  type ChecklistCategory,
  type DocumentType,
} from '@/services/travel-departures.functions';
import { DEPARTURE_STAGES, type DepartureStage } from '@/types/travel-departures';
import { useWorkspaceStore } from '@/lib/store-context';
import { listCustomers } from '@/services/crm.functions';

export const Route = createFileRoute('/workspace/turismo/embarques')({
  head: () => ({ meta: [{ title: 'Embarques & Calendário | Workspace' }] }),
  loader: async () => {
    try {
      const store = await getStoreSettings().catch(() => null);
      return { store };
    } catch {
      return { store: null };
    }
  },
  errorComponent: ({ error }: { error: any }) => (
    <div className="p-6 m-4 rounded-2xl border border-destructive/30 bg-destructive/5 text-destructive space-y-2">
      <div className="flex items-center gap-2 font-bold text-sm">
        <AlertTriangle className="size-4" />
        <span>Falha ao carregar a página de Embarques</span>
      </div>
      <p className="text-xs text-muted-foreground font-mono">
        {error?.message || "Erro ao conectar com o serviço de embarques."}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.location.reload()}
        className="mt-2 text-xs"
      >
        Tentar Novamente
      </Button>
    </div>
  ),
  component: WorkspaceBoardingPage,
});

// ── Constants ──
const CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  documentation: 'Documentação',
  health: 'Saúde & Vacinas',
  insurance: 'Seguro Viagem',
  financial: 'Taxas & Financeiro',
  logistics: 'Logística',
  communication: 'Comunicação',
  airline: 'Aéreo & Check-in',
  hotel: 'Hotel & Hospedagem',
  custom: 'Personalizado',
};

const CATEGORY_COLORS: Record<ChecklistCategory, string> = {
  documentation: 'text-blue-600 bg-blue-500/10',
  health: 'text-emerald-600 bg-emerald-500/10',
  insurance: 'text-violet-600 bg-violet-500/10',
  financial: 'text-amber-600 bg-amber-500/10',
  logistics: 'text-orange-600 bg-orange-500/10',
  communication: 'text-sky-600 bg-sky-500/10',
  airline: 'text-indigo-600 bg-indigo-500/10',
  hotel: 'text-pink-600 bg-pink-500/10',
  custom: 'text-muted-foreground bg-muted',
};

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  contract: 'Contrato/Reserva',
  airline_ticket: 'Bilhete Aéreo',
  hotel_voucher: 'Voucher Hotel',
  insurance_policy: 'Seguro Viagem',
  passport_copy: 'Passaporte',
  visa_stamp: 'Visto/Carimbo',
  vaccine_card: 'Cartão Vacinas',
  invoice: 'Nota Fiscal',
  transfer_voucher: 'Voucher Transfer',
  other: 'Outro',
};

// ── Calendar helpers ──
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
}

// ── Main Page Component ──
function WorkspaceBoardingPage() {
  const loaderData = Route.useLoaderData?.() as any;
  const { currentStore } = useWorkspaceStore();
  const qc = useQueryClient();
  const storeId = loaderData?.store?.id || currentStore?.id || '';

  // View mode
  const [viewMode, setViewMode] = useState<'calendar' | 'kanban'>('calendar');
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');

  // Calendar state
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Detail sheet
  const [selectedDepartureId, setSelectedDepartureId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'checklist' | 'documents' | 'flight'>('checklist');

  // New departure sheet
  const [newOpen, setNewOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [passengersCount, setPassengersCount] = useState('2');
  const [destinationType, setDestinationType] = useState<'domestic' | 'international' | 'cruise'>('domestic');
  const [airlineCode, setAirlineCode] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [airlineLocator, setAirlineLocator] = useState('');
  const [hotelName, setHotelName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // New checklist item
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<ChecklistCategory>('custom');

  // Document upload
  const [docUrl, setDocUrl] = useState('');
  const [docType, setDocType] = useState<DocumentType>('contract');

  // ── Queries ──
  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['travel-departures', storeId],
    queryFn: () => listDepartureCards({ data: { store_id: storeId } }),
    enabled: Boolean(storeId),
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['departure-detail', selectedDepartureId],
    queryFn: () => getDepartureWithChecklist({ data: { departure_id: selectedDepartureId! } }),
    enabled: Boolean(selectedDepartureId),
  });

  const { data: crmData } = useQuery({
    queryKey: ['crm-customers-for-departures', storeId],
    queryFn: () => listCustomers({ data: {} }),
    enabled: Boolean(storeId),
  });
  const crmCustomers: any[] = Array.isArray(crmData) ? crmData : (crmData as any)?.customers || [];

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: () => createDepartureCard({
      data: {
        store_id: storeId,
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || null,
        destination: destination.trim(),
        departure_date: new Date(departureDate).toISOString(),
        return_date: returnDate ? new Date(returnDate).toISOString() : null,
        passengers_count: parseInt(passengersCount, 10) || 1,
        airline_code: airlineCode.trim().toUpperCase() || null,
        flight_number: flightNumber.trim() || null,
        airline_locator: airlineLocator.trim().toUpperCase() || null,
        hotel_name: hotelName.trim() || null,
        destination_type: destinationType,
        apply_default_checklist: true,
      },
    }),
    onSuccess: () => {
      toast.success('Embarque criado com checklist automático!');
      setNewOpen(false);
      setClientName(''); setClientPhone(''); setDestination('');
      setDepartureDate(''); setReturnDate(''); setAirlineCode('');
      setFlightNumber(''); setAirlineLocator(''); setHotelName('');
      qc.invalidateQueries({ queryKey: ['travel-departures', storeId] });
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao criar embarque'),
  });

  const toggleMutation = useMutation({
    mutationFn: (args: { item_id: string; is_completed: boolean }) =>
      toggleChecklistItem({ data: { item_id: args.item_id, departure_id: selectedDepartureId!, is_completed: args.is_completed } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departure-detail', selectedDepartureId] });
      qc.invalidateQueries({ queryKey: ['travel-departures', storeId] });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: () => addChecklistItem({
      data: {
        store_id: storeId,
        departure_id: selectedDepartureId!,
        label: newItemLabel.trim(),
        category: newItemCategory,
      },
    }),
    onSuccess: () => {
      setNewItemLabel('');
      qc.invalidateQueries({ queryKey: ['departure-detail', selectedDepartureId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const uploadDocMutation = useMutation({
    mutationFn: () => uploadBoardingDocument({
      data: {
        store_id: storeId,
        departure_id: selectedDepartureId!,
        document_type: docType,
        file_url: docUrl,
      },
    }),
    onSuccess: () => {
      toast.success('Documento registrado!');
      setDocUrl('');
      qc.invalidateQueries({ queryKey: ['departure-detail', selectedDepartureId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const stageMutation = useMutation({
    mutationFn: (args: { id: string; stage: string }) =>
      updateDepartureStage({ data: args }),
    onSuccess: () => {
      toast.success('Etapa atualizada!');
      qc.invalidateQueries({ queryKey: ['travel-departures', storeId] });
      qc.invalidateQueries({ queryKey: ['departure-detail', selectedDepartureId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDepartureCard({ data: { id } }),
    onSuccess: () => {
      toast.success('Embarque removido.');
      setSelectedDepartureId(null);
      qc.invalidateQueries({ queryKey: ['travel-departures', storeId] });
    },
  });

  async function exportGuiaPdf(detailObj: any) {
    const toastId = toast.loading("Gerando Guia de Embarque PDF...");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const printContainer = document.createElement("div");
      printContainer.style.position = "fixed";
      printContainer.style.left = "-9999px";
      printContainer.style.top = "-9999px";
      printContainer.style.width = "800px";
      printContainer.style.backgroundColor = "#FFFFFF";
      printContainer.style.fontFamily = "sans-serif";
      printContainer.style.color = "#151515";
      printContainer.style.padding = "40px";

      const pnr = detailObj.airline_locator || detailObj.pnr || "PENDENTE";
      const depDate = detailObj.departure_date ? new Date(detailObj.departure_date).toLocaleDateString("pt-BR") : "Pendente";
      const retDate = detailObj.return_date ? new Date(detailObj.return_date).toLocaleDateString("pt-BR") : "—";

      printContainer.innerHTML = `
        <div style="border: 1px solid #E8E4DC; padding: 30px; background-color: #FFFFFF; font-family: sans-serif;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000000; padding-bottom: 20px; margin-bottom: 25px;">
            <div>
              <h1 style="font-size: 22px; font-weight: 800; margin: 0; color: #151515; letter-spacing: -0.5px; text-transform: uppercase;">GUIA DE EMBARQUE & ROTEIRO</h1>
              <p style="font-size: 11px; color: #777168; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Waesy Turismo & Inteligência Operacional</p>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 14px; font-weight: 800; color: #000000; font-family: monospace;">LOCALIZADOR: ${pnr}</span>
              <p style="font-size: 10px; color: #777168; margin: 4px 0 0 0;">Passageiro: ${detailObj.client_name}</p>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h2 style="font-size: 11px; font-weight: 700; border-bottom: 1px solid #E8E4DC; padding-bottom: 4px; color: #777168; text-transform: uppercase; margin-bottom: 10px;">Dados do Roteiro</h2>
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 15px;">
              <div>
                <p style="margin: 0; font-size: 14px; font-weight: 700; color: #151515;">${detailObj.destination}</p>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #777168;">Passageiros: ${detailObj.passengers_count} pax</p>
              </div>
              <div style="text-align: right;">
                <p style="margin: 0; font-size: 12px; font-weight: 600;">Embarque: ${depDate}</p>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #777168;">Retorno: ${retDate}</p>
              </div>
            </div>
          </div>

          ${detailObj.airline_code ? `
          <div style="margin-bottom: 20px; background-color: #F8F9FA; padding: 12px; border: 1px solid #E9ECEF; border-radius: 6px;">
            <h2 style="font-size: 11px; font-weight: 700; color: #495057; text-transform: uppercase; margin: 0 0 8px 0;">Voo & Companhia Aérea</h2>
            <p style="margin: 0; font-size: 12px; font-weight: bold; color: #212529;">${detailObj.airline_code} ${detailObj.flight_number || ""} — Localizador: ${pnr}</p>
          </div>` : ""}

          ${detailObj.hotel_name ? `
          <div style="margin-bottom: 20px; background-color: #F8F9FA; padding: 12px; border: 1px solid #E9ECEF; border-radius: 6px;">
            <h2 style="font-size: 11px; font-weight: 700; color: #495057; text-transform: uppercase; margin: 0 0 8px 0;">Hospedagem Confirmada</h2>
            <p style="margin: 0; font-size: 12px; font-weight: bold; color: #212529;">${detailObj.hotel_name}</p>
          </div>` : ""}

          <div style="margin-top: 25px; border-top: 1px solid #E8E4DC; padding-top: 15px;">
            <h2 style="font-size: 11px; font-weight: 700; color: #777168; text-transform: uppercase; margin-bottom: 8px;">Recomendações Importantes de Embarque</h2>
            <ul style="font-size: 10px; color: #555555; line-height: 1.6; margin: 0; padding-left: 16px;">
              <li>Apresente-se com no mínimo 2h de antecedência para voos nacionais e 3h para internacionais.</li>
              <li>Mantenha em mãos documento oficial de identificação com foto e bilhetes de embarque.</li>
              <li>Verifique o limite de peso de bagagem de mão (máx. 10kg) e itens permitidos na cabine.</li>
            </ul>
          </div>
        </div>
      `;

      document.body.appendChild(printContainer);
      const canvas = await html2canvas(printContainer, { scale: 2, useCORS: true });
      document.body.removeChild(printContainer);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Guia_Embarque_${pnr}.pdf`);

      toast.success("Guia de Embarque PDF exportado!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao gerar Guia de Embarque PDF.", { id: toastId });
    }
  }

  // ── Computed ──
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const monthName = new Date(calYear, calMonth, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Get departures for a specific day
  const getDayDepartures = (day: number) => {
    const dayDate = new Date(calYear, calMonth, day);
    return cards.filter(c => {
      if (!c.departure_date) return false;
      return isSameDay(new Date(c.departure_date), dayDate);
    });
  };

  // Count urgent cards (departing in ≤ 3 days)
  const urgentCount = cards.filter(c => {
    const days = Math.ceil((new Date(c.departure_date).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 3;
  }).length;

  const selectedDayDepartures = selectedDay
    ? cards.filter(c => c.departure_date && isSameDay(new Date(c.departure_date), selectedDay))
    : [];

  // Kanban filtered
  const filteredKanban = useMemo(() =>
    cards.filter(c => {
      if (activeTab === 'urgent') {
        const days = Math.ceil((new Date(c.departure_date).getTime() - Date.now()) / 86400000);
        return days >= -1 && days <= 7;
      }
      if (activeTab !== 'all') return c.stage === activeTab;
      if (search.trim()) {
        const q = search.toLowerCase();
        return c.client_name.toLowerCase().includes(q) || c.destination.toLowerCase().includes(q);
      }
      return true;
    }),
    [cards, activeTab, search]
  );

  // Detail card
  const detail = detailData?.departure;
  const checklist = detailData?.checklist || [];
  const documents = detailData?.documents || [];
  const checklistByCategory = useMemo(() => {
    const grouped: Record<string, ChecklistItem[]> = {};
    checklist.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });
    return grouped;
  }, [checklist]);

  const completedRequired = checklist.filter(i => i.is_required && i.is_completed).length;
  const totalRequired = checklist.filter(i => i.is_required).length;

  // Days until departure
  const daysUntilDeparture = detail
    ? Math.ceil((new Date(detail.departure_date).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-0 flex flex-col min-h-[calc(100vh-4rem)] pb-12 overflow-x-hidden">
      {/* ── Canonical Toolbar ── */}
      <WorkspaceCanonicalToolbar
        viewModes={[
          { id: 'calendar', label: 'Calendário', icon: Calendar },
          { id: 'kanban', label: 'Kanban', icon: Users },
        ]}
        activeViewMode={viewMode}
        onViewModeChange={(m) => setViewMode(m as any)}
        searchPlaceholder="Buscar passageiro ou destino..."
        searchValue={search}
        onSearchChange={setSearch}
        primaryAction={{
          label: 'Novo Embarque',
          icon: Plus,
          onClick: () => setNewOpen(true),
        }}
        secondaryAction={{
          label: activeTab === 'all' ? `${cards.length} viagens` : '',
          variant: 'outline',
        }}
        filterSlot={
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 max-w-full">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'urgent', label: `Urgentes (${urgentCount})` },
              { id: 'booked', label: 'Confirmados' },
              { id: 'voucher_issued', label: 'Vouchers' },
              { id: 'in_travel', label: 'Em Viagem' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[44px] sm:min-h-[32px] h-11 sm:h-7 px-4 sm:px-2.5 rounded-xl text-xs sm:text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 flex items-center justify-center ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex-1 py-4 sm:py-6 w-full mx-auto overflow-x-hidden">
        {/* ── CALENDAR VIEW ── */}
        {viewMode === 'calendar' && (
          <div className="space-y-4">
            {/* Calendar header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground capitalize">{monthName}</h2>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Mês anterior"
                  className="size-11 sm:size-8 p-0 rounded-xl cursor-pointer"
                  onClick={() => {
                    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                    else setCalMonth(m => m - 1);
                  }}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 sm:h-8 px-4 sm:px-3 text-xs font-bold rounded-xl cursor-pointer"
                  onClick={() => { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()); }}
                >
                  Hoje
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Próximo mês"
                  className="size-11 sm:size-8 p-0 rounded-xl cursor-pointer"
                  onClick={() => {
                    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                    else setCalMonth(m => m + 1);
                  }}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>

            {/* Calendar grid */}
            <div className="rounded-2xl border border-border overflow-hidden bg-card">
              {/* Day headers */}
              <div className="grid grid-cols-7 sm:grid-cols-7 border-b border-border/60 bg-muted/30">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                  <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-2">{d}</div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 sm:grid-cols-7">
                {/* Empty cells */}
                {Array.from({ length: firstDay }, (_, i) => (
                  <div key={`empty-${i}`} className="min-h-[80px] sm:min-h-[100px] border-b border-r border-border/40 bg-muted/10" />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dayDate = new Date(calYear, calMonth, day);
                  const isToday = isSameDay(dayDate, today);
                  const isSelected = selectedDay && isSameDay(dayDate, selectedDay);
                  const dayCards = getDayDepartures(day);
                  const col = (firstDay + i) % 7;
                  const isWeekend = col === 0 || col === 6;

                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDay(isSelected ? null : dayDate)}
                      className={`min-h-[80px] sm:min-h-[100px] border-b border-r border-border/40 p-1.5 cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/5 border-primary/30' :
                        isWeekend ? 'bg-muted/10' : 'bg-card hover:bg-muted/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                        }`}>
                          {day}
                        </span>
                        {dayCards.length > 0 && (
                          <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                            {dayCards.length}
                          </span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {dayCards.slice(0, 2).map(card => {
                          const days = Math.ceil((new Date(card.departure_date).getTime() - Date.now()) / 86400000);
                          return (
                            <div
                              key={card.id}
                              onClick={(e) => { e.stopPropagation(); setSelectedDepartureId(card.id); }}
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded truncate cursor-pointer ${
                                days <= 0 ? 'bg-emerald-500/15 text-emerald-700' :
                                days <= 2 ? 'bg-red-500/15 text-red-700 animate-pulse' :
                                days <= 7 ? 'bg-amber-500/15 text-amber-700' :
                                'bg-primary/10 text-primary'
                              }`}
                            >
                              ✈ {card.client_name}
                            </div>
                          );
                        })}
                        {dayCards.length > 2 && (
                          <div className="text-[9px] text-muted-foreground pl-1">+{dayCards.length - 2} mais</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected day panel */}
            {selectedDay && selectedDayDepartures.length > 0 && (
              <div className="mt-4 space-y-3">
                <h3 className="text-sm font-bold text-foreground">
                  {selectedDay.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedDayDepartures.map(card => <DepartureCard key={card.id} card={card} onOpen={() => setSelectedDepartureId(card.id)} />)}
                </div>
              </div>
            )}

            {/* All upcoming departures timeline */}
            {!selectedDay && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Próximos Embarques</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cards
                    .filter(c => Math.ceil((new Date(c.departure_date).getTime() - Date.now()) / 86400000) >= -1)
                    .slice(0, 9)
                    .map(card => <DepartureCard key={card.id} card={card} onOpen={() => setSelectedDepartureId(card.id)} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── KANBAN VIEW ── */}
        {viewMode === 'kanban' && (
          isLoading ? (
            <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin mr-2" />Carregando embarques...
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-12rem)]">
              {DEPARTURE_STAGES.map(col => {
                const colCards = filteredKanban.filter(c => c.stage === col.id);
                return (
                  <div
                    key={col.id}
                    className="flex-none w-[300px] sm:w-[320px] bg-muted/20 border border-border rounded-2xl flex flex-col"
                  >
                    <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between shrink-0">
                      <div>
                        <h3 className="text-xs font-bold text-foreground">{col.label}</h3>
                        <p className="text-[10px] text-muted-foreground">{col.desc}</p>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px] h-5 px-1.5">{colCards.length}</Badge>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5 no-scrollbar">
                      {colCards.length === 0 ? (
                        <div className="h-24 rounded-xl border border-dashed border-border/60 flex items-center justify-center text-[11px] text-muted-foreground">
                          Sem viagens
                        </div>
                      ) : (
                        colCards.map(card => <DepartureCard key={card.id} card={card} onOpen={() => setSelectedDepartureId(card.id)} compact />)
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* ── Detail Sheet ── */}
      <Sheet open={Boolean(selectedDepartureId)} onOpenChange={(o) => !o && setSelectedDepartureId(null)}>
        <SheetContent
          side="right"
          size="wide"
          className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] max-sm:!h-[100dvh] max-sm:!inset-0 max-sm:!rounded-none border-l p-0 flex flex-col h-full bg-card overflow-hidden"
        >
          {detailLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : detail ? (
            <>
              {/* Header */}
              <SheetHeader className="px-5 py-4 border-b border-border/60 bg-muted/20 shrink-0">
                <SheetTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Plane className="size-4 text-primary" />
                  <span className="truncate">{detail.client_name}</span>
                  {daysUntilDeparture !== null && (
                    <Badge variant="outline" className={`ml-auto text-[10px] shrink-0 ${
                      daysUntilDeparture <= 0 ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' :
                      daysUntilDeparture <= 2 ? 'bg-red-500/10 text-red-700 border-red-500/30' :
                      daysUntilDeparture <= 7 ? 'bg-amber-500/10 text-amber-700 border-amber-500/30' :
                      'bg-blue-500/10 text-blue-700 border-blue-500/30'
                    }`}>
                      {daysUntilDeparture <= 0 ? 'Em Viagem' : `em ${daysUntilDeparture}d`}
                    </Badge>
                  )}
                </SheetTitle>

                {/* Meta info */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground font-mono pt-1">
                  <span className="flex items-center gap-1"><MapPin className="size-3" />{detail.destination}</span>
                  <span className="flex items-center gap-1"><Calendar className="size-3" />
                    {new Date(detail.departure_date).toLocaleDateString('pt-BR')}
                    {detail.return_date && ` → ${new Date(detail.return_date).toLocaleDateString('pt-BR')}`}
                  </span>
                  <span className="flex items-center gap-1"><Users className="size-3" />{detail.passengers_count} pax</span>
                </div>

                {/* Flight & Hotel info */}
                {(detail.airline_code || detail.hotel_name) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {detail.airline_code && (
                      <div className="flex items-center gap-1.5 text-[11px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-2 py-1 rounded-lg">
                        <Plane className="size-3" />
                        <span className="font-semibold">{detail.airline_code}</span>
                        {detail.flight_number && <span>{detail.flight_number}</span>}
                        {detail.airline_locator && <span className="font-mono">({detail.airline_locator})</span>}
                        {detail.checkin_link && (
                          <a href={detail.checkin_link} target="_blank" rel="noreferrer" className="ml-1 underline-offset-2 hover:underline flex items-center gap-0.5">
                            Check-in <ExternalLink className="size-2.5" />
                          </a>
                        )}
                      </div>
                    )}
                    {detail.hotel_name && (
                      <div className="flex items-center gap-1.5 text-[11px] bg-pink-500/10 text-pink-700 dark:text-pink-400 px-2 py-1 rounded-lg">
                        <Hotel className="size-3" />
                        <span className="font-semibold">{detail.hotel_name}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Checklist progress bar */}
                {totalRequired > 0 && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Checklist: {completedRequired}/{totalRequired} itens obrigatórios</span>
                      <span className="font-semibold text-foreground">{detail.checklist_completed_pct || 0}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (detail.checklist_completed_pct || 0) === 100 ? 'bg-emerald-500' :
                          (detail.checklist_completed_pct || 0) >= 70 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${detail.checklist_completed_pct || 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Stage selector */}
                <div className="flex items-center gap-2 pt-1.5">
                  <span className="text-xs sm:text-[11px] text-muted-foreground font-medium">Etapa:</span>
                  <select
                    value={detail.stage}
                    onChange={e => stageMutation.mutate({ id: detail.id, stage: e.target.value })}
                    className="h-10 sm:h-7 px-3 sm:px-2 rounded-xl border border-input bg-background text-xs sm:text-[11px] font-semibold focus:outline-none flex-1 cursor-pointer"
                  >
                    {DEPARTURE_STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>

                  {/* WhatsApp */}
                  {detail.client_phone && (
                    <a
                      href={`https://wa.me/55${detail.client_phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="size-10 sm:size-7 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center hover:bg-emerald-500/20 shrink-0 cursor-pointer"
                      title="Conversar no WhatsApp"
                    >
                      <Send className="size-4 sm:size-3.5" />
                    </a>
                  )}

                  {/* Exportar Guia de Embarque PDF */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => exportGuiaPdf(detail)}
                    className="h-10 sm:h-7 px-3 sm:px-2 text-xs sm:text-[11px] font-bold gap-1.5 rounded-xl border-border cursor-pointer shrink-0"
                    title="Exportar Guia de Embarque PDF"
                  >
                    <Download className="size-3.5 sm:size-3" />
                    <span>Guia PDF</span>
                  </Button>
                </div>

                {/* Tab navigation inside sheet */}
                <div className="flex border-b border-border/60 gap-0 -mx-5 px-5 mt-2">
                  {[
                    { id: 'checklist', label: `Checklist (${checklist.length})` },
                    { id: 'documents', label: `Docs (${documents.length})` },
                    { id: 'flight', label: 'Voo & Hotel' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setDetailTab(tab.id as any)}
                      className={`min-h-[44px] sm:min-h-[36px] px-4 py-2.5 sm:py-2 text-xs sm:text-[11px] font-semibold border-b-2 transition-colors cursor-pointer flex items-center justify-center ${
                        detailTab === tab.id
                          ? 'border-primary text-primary font-bold'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </SheetHeader>

              {/* ── Tab Content ── */}
              <div className="flex-1 overflow-y-auto no-scrollbar">
                {/* CHECKLIST TAB */}
                {detailTab === 'checklist' && (
                  <div className="p-5 space-y-4">
                    {Object.entries(checklistByCategory).map(([category, items]) => (
                      <div key={category}>
                        <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md mb-2 ${CATEGORY_COLORS[category as ChecklistCategory]}`}>
                          {CATEGORY_LABELS[category as ChecklistCategory]}
                        </div>
                        <div className="space-y-1.5">
                          {items.map(item => (
                            <div
                              key={item.id}
                              className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                item.is_completed
                                  ? 'bg-emerald-500/5 border-emerald-500/20'
                                  : 'bg-card border-border hover:bg-muted/30'
                              }`}
                              onClick={() => toggleMutation.mutate({ item_id: item.id, is_completed: !item.is_completed })}
                            >
                              {item.is_completed ? (
                                <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                              ) : (
                                <Circle className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium leading-snug ${item.is_completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                  {item.label}
                                  {item.is_required && !item.is_completed && (
                                    <span className="ml-1.5 text-[9px] text-red-500 font-bold">OBRIG.</span>
                                  )}
                                </p>
                                {item.due_days_before && daysUntilDeparture !== null && !item.is_completed && (
                                  <p className={`text-[10px] mt-0.5 ${
                                    daysUntilDeparture <= item.due_days_before
                                      ? 'text-amber-600 font-semibold'
                                      : 'text-muted-foreground'
                                  }`}>
                                    <Clock className="size-2.5 inline mr-0.5" />
                                    {daysUntilDeparture <= item.due_days_before ? 'AÇÃO NECESSÁRIA' : `Fazer até ${item.due_days_before}d antes`}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {checklist.length === 0 && (
                      <p className="text-xs text-muted-foreground italic text-center py-4">Nenhum item de checklist. Adicione abaixo.</p>
                    )}

                    {/* Add item */}
                    <div className="pt-3 border-t border-border/60">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Adicionar Item</p>
                      <div className="flex gap-2">
                        <select
                          value={newItemCategory}
                          onChange={e => setNewItemCategory(e.target.value as ChecklistCategory)}
                          className="h-9 px-2 rounded-xl border border-input bg-background text-[11px] focus:outline-none shrink-0"
                        >
                          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                        <Input
                          value={newItemLabel}
                          onChange={e => setNewItemLabel(e.target.value)}
                          placeholder="Descrição do item..."
                          className="h-9 text-xs flex-1 rounded-xl"
                          onKeyDown={e => { if (e.key === 'Enter' && newItemLabel.trim()) addItemMutation.mutate(); }}
                        />
                        <Button
                          size="sm"
                          disabled={!newItemLabel.trim() || addItemMutation.isPending}
                          onClick={() => addItemMutation.mutate()}
                          className="h-9 px-3 rounded-xl cursor-pointer shrink-0"
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* DOCUMENTS TAB */}
                {detailTab === 'documents' && (
                  <div className="p-5 space-y-3">
                    {documents.map(doc => (
                      <div key={doc.id} className="p-3 rounded-xl border border-border bg-card flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <FileText className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">{DOC_TYPE_LABELS[doc.document_type]}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{doc.file_name || 'Documento'}</p>
                          {doc.ocr_status === 'completed' && doc.passenger_name && (
                            <p className="text-[10px] text-emerald-600">OCR: {doc.passenger_name}</p>
                          )}
                          {doc.valid_until && (
                            <p className="text-[10px] text-amber-600">
                              Válido até: {new Date(doc.valid_until).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className={`text-[9px] ${
                            doc.ocr_status === 'completed' ? 'text-emerald-600 border-emerald-500/30' :
                            doc.ocr_status === 'pending' ? 'text-amber-600 border-amber-500/30' :
                            'text-muted-foreground'
                          }`}>
                            {doc.ocr_status === 'completed' ? 'OCR ✓' : doc.ocr_status === 'pending' ? 'Aguardando OCR' : 'Sem OCR'}
                          </Badge>
                          <a href={doc.file_url} target="_blank" rel="noreferrer" className="h-7 w-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground">
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                      </div>
                    ))}

                    {documents.length === 0 && (
                      <p className="text-xs text-muted-foreground italic text-center py-4">Nenhum documento anexado ainda.</p>
                    )}

                    {/* Upload */}
                    <div className="pt-3 border-t border-border/60 space-y-2">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Anexar Documento</p>
                      <div className="flex gap-2">
                        <select
                          value={docType}
                          onChange={e => setDocType(e.target.value as DocumentType)}
                          className="h-9 px-2 rounded-xl border border-input bg-background text-[11px] focus:outline-none"
                        >
                          {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </div>
                      <FileAttachmentUpload
                        value={docUrl}
                        onChange={setDocUrl}
                        onRemove={() => setDocUrl('')}
                        label=""
                        helperText="PDF, imagem ou bilhete. OCR automático para passaportes e contratos."
                        bucket="cms-media"
                        accept="image/*,application/pdf"
                      />
                      {docUrl && (
                        <Button
                          onClick={() => uploadDocMutation.mutate()}
                          disabled={uploadDocMutation.isPending}
                          className="w-full h-9 text-xs rounded-xl cursor-pointer"
                        >
                          {uploadDocMutation.isPending ? <Loader2 className="size-3 animate-spin mr-1.5" /> : <Upload className="size-3.5 mr-1.5" />}
                          Registrar Documento
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* FLIGHT & HOTEL TAB */}
                {detailTab === 'flight' && (
                  <div className="p-5 space-y-4">
                    <div className="space-y-3">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Informações do Voo</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">CIA Aérea</Label>
                          <Input defaultValue={detail.airline_code || ''} placeholder="LA, G3, AD..." className="h-9 text-xs uppercase font-mono" id="airline_code_input" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Nº do Voo</Label>
                          <Input defaultValue={detail.flight_number || ''} placeholder="LA3214" className="h-9 text-xs font-mono" id="flight_number_input" />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <Label className="text-xs">Localizador / PNR</Label>
                          <Input defaultValue={detail.airline_locator || ''} placeholder="XYZABC" className="h-9 text-xs font-mono uppercase" id="locator_input" />
                        </div>
                      </div>

                      {detail.checkin_link ? (
                        <a
                          href={detail.checkin_link}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-indigo-500/30 bg-indigo-500/5 text-indigo-700 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-500/10 transition-colors"
                        >
                          <Plane className="size-3.5" />
                          Fazer Check-in Online ({detail.airline_code})
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <p className="text-[11px] text-muted-foreground text-center">
                          Informe a CIA aérea para obter o link de check-in automático.
                        </p>
                      )}
                    </div>

                    <div className="space-y-3 border-t border-border/60 pt-4">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Hotel & Hospedagem</p>
                      <div className="space-y-1">
                        <Label className="text-xs">Nome do Hotel / Pousada</Label>
                        <Input defaultValue={detail.hotel_name || ''} placeholder="Ex: Hotel Serrano" className="h-9 text-xs" id="hotel_name_input" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Check-in Hotel</Label>
                          <Input type="datetime-local" defaultValue={detail.hotel_checkin_at?.slice(0,16) || ''} className="h-9 text-xs" id="hotel_checkin_input" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Check-out Hotel</Label>
                          <Input type="datetime-local" defaultValue={detail.hotel_checkout_at?.slice(0,16) || ''} className="h-9 text-xs" id="hotel_checkout_input" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Regras do Hotel (cancelamento, pets, etc.)</Label>
                        <textarea
                          id="hotel_rules_input"
                          defaultValue={detail.hotel_rules || ''}
                          placeholder="Ex: Cancelamento gratuito até 48h. Check-in a partir das 14h. Pets não permitidos."
                          className="w-full h-20 p-3 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-none resize-none leading-relaxed"
                        />
                      </div>
                      <Button
                        className="w-full h-10 text-xs rounded-xl cursor-pointer"
                        onClick={async () => {
                          const ac = (document.getElementById('airline_code_input') as HTMLInputElement)?.value || null;
                          const fn = (document.getElementById('flight_number_input') as HTMLInputElement)?.value || null;
                          const loc = (document.getElementById('locator_input') as HTMLInputElement)?.value || null;
                          const hn = (document.getElementById('hotel_name_input') as HTMLInputElement)?.value || null;
                          const hci = (document.getElementById('hotel_checkin_input') as HTMLInputElement)?.value || null;
                          const hco = (document.getElementById('hotel_checkout_input') as HTMLInputElement)?.value || null;
                          const hr = (document.getElementById('hotel_rules_input') as HTMLTextAreaElement)?.value || null;
                          try {
                            await updateDepartureDetails({ data: {
                              id: detail.id,
                              airline_code: ac,
                              flight_number: fn,
                              airline_locator: loc,
                              hotel_name: hn,
                              hotel_checkin_at: hci ? new Date(hci).toISOString() : null,
                              hotel_checkout_at: hco ? new Date(hco).toISOString() : null,
                              hotel_rules: hr,
                            }});
                            toast.success('Informações de voo e hotel salvas!');
                            qc.invalidateQueries({ queryKey: ['departure-detail', selectedDepartureId] });
                            qc.invalidateQueries({ queryKey: ['travel-departures', storeId] });
                          } catch(err: any) {
                            toast.error(err.message);
                          }
                        }}
                      >
                        Salvar Voo & Hotel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-border/60 bg-muted/10 flex items-center justify-between shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-[11px] text-destructive hover:text-destructive cursor-pointer"
                  onClick={() => {
                    if (window.confirm('Remover este embarque?')) deleteMutation.mutate(detail.id);
                  }}
                >
                  <X className="size-3 mr-1" /> Remover
                </Button>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Criado em {detail.created_at ? new Date(detail.created_at).toLocaleDateString('pt-BR') : '—'}
                </p>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* ── New Departure Sheet ── */}
      <Sheet open={newOpen} onOpenChange={setNewOpen}>
        <SheetContent
          side="right"
          size="wide"
          className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] max-sm:!h-[100dvh] max-sm:!inset-0 max-sm:!rounded-none border-l p-0 flex flex-col h-full bg-card overflow-hidden"
        >
          <SheetHeader className="px-5 py-4 border-b border-border/60 bg-muted/20 shrink-0">
            <SheetTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Plane className="size-4 text-primary" />
              Novo Embarque
            </SheetTitle>
          </SheetHeader>

          <form
            onSubmit={e => { e.preventDefault(); createMutation.mutate(); }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4">
              {crmCustomers.length > 0 && (
                <div className="space-y-1.5 p-3 rounded-xl border border-border/70 bg-muted/20">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Vincular Cliente da Carteira (CRM)</Label>
                  <select
                    className="w-full h-9 px-2.5 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none"
                    onChange={e => {
                      const sel = crmCustomers.find((c: any) => c.id === e.target.value);
                      if (sel) {
                        setClientName(sel.full_name || sel.legal_name || "");
                        if (sel.phone || sel.mobile) setClientPhone(sel.phone || sel.mobile || "");
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">Selecionar cliente existente...</option>
                    {crmCustomers.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name || c.legal_name} {c.phone ? `(${c.phone})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Passageiro Titular *</Label>
                  <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nome do passageiro" className="h-10 text-xs rounded-xl" required autoFocus />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">WhatsApp</Label>
                  <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="(49) 99999-9999" className="h-10 text-xs rounded-xl font-mono" />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nº Passageiros</Label>
                  <Input type="number" value={passengersCount} onChange={e => setPassengersCount(e.target.value)} min="1" className="h-10 text-xs rounded-xl font-mono" />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Destino Principal *</Label>
                  <Input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Ex: Gramado, RS ou Cancún, México" className="h-10 text-xs rounded-xl" required />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Tipo de Destino *</Label>
                  <select
                    value={destinationType}
                    onChange={e => setDestinationType(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-medium focus:outline-none"
                  >
                    <option value="domestic">Nacional</option>
                    <option value="international">Internacional</option>
                    <option value="cruise">Cruzeiro</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Embarque *</Label>
                  <Input type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} className="h-10 text-xs rounded-xl" required />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Retorno</Label>
                  <Input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className="h-10 text-xs rounded-xl" />
                </div>

                <div className="space-y-1 sm:col-span-2 border-t border-border/60 pt-3">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Voo (Opcional)</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">CIA Aérea</Label>
                  <Input
                    value={airlineCode}
                    onChange={e => setAirlineCode(e.target.value.toUpperCase())}
                    placeholder="LA, G3, AD..."
                    className="h-10 text-xs rounded-xl font-mono"
                    maxLength={3}
                    list="airlines-list"
                  />
                  <datalist id="airlines-list">
                    {Object.keys(AIRLINE_CHECKIN_LINKS).map(k => <option key={k} value={k} />)}
                  </datalist>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nº do Voo</Label>
                  <Input value={flightNumber} onChange={e => setFlightNumber(e.target.value.toUpperCase())} placeholder="LA3214" className="h-10 text-xs rounded-xl font-mono" />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Localizador / PNR</Label>
                  <Input value={airlineLocator} onChange={e => setAirlineLocator(e.target.value.toUpperCase())} placeholder="XYZABC" className="h-10 text-xs rounded-xl font-mono" />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Hotel / Pousada</Label>
                  <Input value={hotelName} onChange={e => setHotelName(e.target.value)} placeholder="Nome do hotel" className="h-10 text-xs rounded-xl" />
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-[11px] text-emerald-700 dark:text-emerald-400">
                <Star className="size-3 inline mr-1.5" />
                Checklist automático de <strong>{destinationType === 'domestic' ? 'destino nacional' : destinationType === 'international' ? 'destino internacional' : 'cruzeiro'}</strong> será criado com {destinationType === 'domestic' ? '6' : destinationType === 'international' ? '13' : '7'} itens.
              </div>
            </div>

            <div className="px-5 py-4 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2 shrink-0">
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)} className="h-11 sm:h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer">
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || !clientName.trim() || !destination.trim() || !departureDate} className="h-11 sm:h-10 px-5 rounded-xl text-xs font-bold cursor-pointer shadow-xs">
                {createMutation.isPending ? <><Loader2 className="size-3.5 animate-spin mr-1.5" />Criando...</> : 'Criar Embarque'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Card component ──
function DepartureCard({
  card,
  onOpen,
  compact = false,
}: {
  card: DepartureWithChecklist;
  onOpen: () => void;
  compact?: boolean;
}) {
  const daysUntil = Math.ceil((new Date(card.departure_date).getTime() - Date.now()) / 86400000);
  const urgencyClass =
    daysUntil <= 0 ? 'border-emerald-500/40 bg-emerald-500/5' :
    daysUntil <= 2 ? 'border-red-500/40 bg-red-500/5' :
    daysUntil <= 7 ? 'border-amber-500/30 bg-amber-500/5' :
    'border-border bg-card';

  const pct = card.checklist_completed_pct || 0;

  return (
    <div
      onClick={onOpen}
      className={`p-4 sm:p-3.5 rounded-2xl border cursor-pointer hover:shadow-sm transition-all ${urgencyClass}`}
    >
      <div className="flex items-start justify-between gap-1 mb-2">
        <div>
          <h4 className="text-xs font-bold text-foreground leading-tight">{card.client_name}</h4>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="size-2.5" />{card.destination}
          </p>
        </div>
        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
          daysUntil <= 0 ? 'bg-emerald-500/20 text-emerald-700' :
          daysUntil <= 2 ? 'bg-red-500/20 text-red-700 animate-pulse' :
          daysUntil <= 7 ? 'bg-amber-500/20 text-amber-700' :
          'bg-muted text-muted-foreground'
        }`}>
          {daysUntil <= 0 ? '✈ Hoje/Passado' : `em ${daysUntil}d`}
        </span>
      </div>

      {!compact && (
        <>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono mb-2">
            <span>{new Date(card.departure_date).toLocaleDateString('pt-BR')}</span>
            <span>·</span>
            <span>{card.passengers_count}pax</span>
            {card.airline_code && <><span>·</span><span className="text-indigo-600">✈{card.airline_code}</span></>}
          </div>

          {/* Checklist progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px] text-muted-foreground">
              <span>Checklist</span>
              <span className={pct === 100 ? 'text-emerald-600 font-semibold' : pct < 50 ? 'text-red-600 font-semibold' : 'text-amber-600 font-semibold'}>{pct}%</span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : pct < 50 ? 'bg-red-500' : 'bg-amber-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
