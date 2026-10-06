import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus, Plane, Hotel, CheckCircle2, Circle, ChevronLeft, ChevronRight, Send, FileText, ShieldAlert, ExternalLink, Loader2, AlertTriangle, Users, MapPin, Clock, Upload, X, Star, Download, Smartphone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CardDetailPanel } from '@/components/tourism/boarding/CardDetailPanel';
import { DigitalCompanionCard } from '@/components/documents/digital-companion-card';
import { MultimodalOcrUploader } from '@/components/documents/multimodal-ocr-uploader';
import type { UniversalOcrResult } from '@/services/multimodal-ocr.functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { WorkspaceCanonicalToolbar } from '@/components/workspace/workspace-canonical-toolbar';
import { EmptyState } from '@/components/state/states';
import { FileAttachmentUpload } from '@/components/ui/file-attachment-upload';
import { toast } from 'sonner';
import { humanizeErrorMessage } from '@/lib/humanize-error';
import { getStoreSettings } from '@/services/store.functions';
import { listDepartureCards, getDepartureWithChecklist, createDepartureCard, updateDepartureStage, updateDepartureDetails, toggleChecklistItem, addChecklistItem, uploadBoardingDocument, deleteDepartureCard, AIRLINE_CHECKIN_LINKS, type DepartureWithChecklist, type ChecklistItem, type BoardingDocument, type ChecklistCategory, type DocumentType } from '@/services/travel-departures.functions';
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
    <div className="p-6 m-4 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive space-y-2">
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
  airline: 'text-primary bg-indigo-500/10',
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

  // Companion Card 9:16 & Multimodal OCR states
  const [companionCardOpen, setCompanionCardOpen] = useState(false);
  const [companionCardData, setCompanionCardData] = useState<any>(null);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);

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
    onError: (err: any) => toast.error(humanizeErrorMessage(err, 'Não foi possível criar o embarque')),
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
    onError: (err: any) => toast.error(humanizeErrorMessage(err, 'Não foi possível adicionar o item à lista')),
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
    onError: (err: any) => toast.error(humanizeErrorMessage(err, 'Não foi possível registrar o documento')),
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
      printContainer.style.backgroundColor = "var(--card)";
      printContainer.style.fontFamily = "sans-serif";
      printContainer.style.color = "var(--foreground)";
      printContainer.style.padding = "40px";

      const pnr = detailObj.airline_locator || detailObj.pnr || "PENDENTE";
      const depDate = detailObj.departure_date ? new Date(detailObj.departure_date).toLocaleDateString("pt-BR") : "Pendente";
      const retDate = detailObj.return_date ? new Date(detailObj.return_date).toLocaleDateString("pt-BR") : "—";

      printContainer.innerHTML = `
        <div style="border: 1px solid var(--border); padding: 30px; background-color: var(--card); font-family: sans-serif;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--foreground); padding-bottom: 20px; margin-bottom: 25px;">
            <div>
              <h1 style="font-size: 22px; font-weight: 800; margin: 0; color: var(--foreground); letter-spacing: -0.5px; text-transform: uppercase;">GUIA DE EMBARQUE e ROTEIRO</h1>
              <p style="font-size: 11px; color: var(--muted-foreground); margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Waesy Turismo e Inteligência Operacional</p>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 14px; font-weight: 800; color: var(--foreground); font-family: monospace;">LOCALIZADOR: ${pnr}</span>
              <p style="font-size: 10px; color: var(--muted-foreground); margin: 4px 0 0 0;">Passageiro: ${detailObj.client_name}</p>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h2 style="font-size: 11px; font-weight: 700; border-bottom: 1px solid var(--border); padding-bottom: 4px; color: var(--muted-foreground); text-transform: uppercase; margin-bottom: 10px;">Dados do Roteiro</h2>
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 15px;">
              <div>
                <p style="margin: 0; font-size: 14px; font-weight: 700; color: var(--foreground);">${detailObj.destination}</p>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: var(--muted-foreground);">Passageiros: ${detailObj.passengers_count} pax</p>
              </div>
              <div style="text-align: right;">
                <p style="margin: 0; font-size: 12px; font-weight: 600;">Embarque: ${depDate}</p>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: var(--muted-foreground);">Retorno: ${retDate}</p>
              </div>
            </div>
          </div>

          ${detailObj.airline_code ? `
          <div style="margin-bottom: 20px; background-color: var(--muted); padding: 12px; border: 1px solid var(--border); border-radius: 6px;">
            <h2 style="font-size: 11px; font-weight: 700; color: var(--muted-foreground); text-transform: uppercase; margin: 0 0 8px 0;">Voo e Companhia Aérea</h2>
            <p style="margin: 0; font-size: 12px; font-weight: bold; color: var(--foreground);">${detailObj.airline_code} ${detailObj.flight_number || ""} — Localizador: ${pnr}</p>
          </div>` : ""}

          ${detailObj.hotel_name ? `
          <div style="margin-bottom: 20px; background-color: var(--muted); padding: 12px; border: 1px solid var(--border); border-radius: 6px;">
            <h2 style="font-size: 11px; font-weight: 700; color: var(--muted-foreground); text-transform: uppercase; margin: 0 0 8px 0;">Hospedagem Confirmada</h2>
            <p style="margin: 0; font-size: 12px; font-weight: bold; color: var(--foreground);">${detailObj.hotel_name}</p>
          </div>` : ""}

          <div style="margin-top: 25px; border-top: 1px solid var(--border); padding-top: 15px;">
            <h2 style="font-size: 11px; font-weight: 700; color: var(--muted-foreground); text-transform: uppercase; margin-bottom: 8px;">Recomendações Importantes de Embarque</h2>
            <ul style="font-size: 10px; color: var(--muted-foreground); line-height: 1.6; margin: 0; padding-left: 16px;">
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

  const handleOcrExtractedForDeparture = (extracted: UniversalOcrResult) => {
    if (extracted.clientName) setClientName(extracted.clientName);
    if (extracted.clientPhone) setClientPhone(extracted.clientPhone);
    if (extracted.destinationCity) setDestination(extracted.destinationCity);
    if (extracted.dates?.departure) setDepartureDate(extracted.dates.departure.slice(0, 10));
    if (extracted.dates?.return) setReturnDate(extracted.dates.return.slice(0, 10));
    if (extracted.flightSegments?.[0]) {
      setAirlineCode(extracted.flightSegments[0].airline || '');
      setFlightNumber(extracted.flightSegments[0].flightNumber || '');
      setAirlineLocator(extracted.flightSegments[0].locator || '');
    }
    if (extracted.hotel?.name) setHotelName(extracted.hotel.name);
    setOcrModalOpen(false);
    setNewOpen(true);
    toast.success("Dados de voo, hotel e passageiro extraídos com IA! Revise e crie o embarque.");
  };

  const handleOpenCompanionForDeparture = (dep: any) => {
    if (!dep) return;
    const depDate = dep.departure_date ? new Date(dep.departure_date).toLocaleDateString('pt-BR') : 'A confirmar';
    const sections: any[] = [];

    if (dep.airline_code || dep.flight_number || dep.airline_locator) {
      sections.push({
        type: 'flight' as const,
        title: `Voo ${dep.airline_code || ''} ${dep.flight_number || ''}`.trim(),
        subtitle: `Companhia Aérea: ${dep.airline_code || 'Confirmada'}`,
        details: [
          { label: 'Localizador (PNR)', value: dep.airline_locator || 'A consultar', highlight: true },
          { label: 'Data de Embarque', value: depDate },
          { label: 'Passageiros', value: `${dep.passengers_count || 1} pax` },
        ],
      });
    }

    if (dep.hotel_name) {
      sections.push({
        type: 'hotel' as const,
        title: dep.hotel_name,
        details: [
          { label: 'Check-in', value: dep.hotel_checkin_at ? new Date(dep.hotel_checkin_at).toLocaleDateString('pt-BR') : 'A consultar' },
          { label: 'Check-out', value: dep.hotel_checkout_at ? new Date(dep.hotel_checkout_at).toLocaleDateString('pt-BR') : 'A consultar' },
        ],
      });
    }

    const rules = [
      {
        title: 'Documentação Obrigatória',
        description: 'Apresente RG ou CNH original com foto em bom estado no balcão e no portão de embarque. Para viagens internacionais, passaporte válido.',
        highlight: true,
      },
      {
        title: 'Horário no Aeroporto',
        description: 'Chegue com antecedência mínima de 2 horas para voos nacionais e 3 horas para internacionais.',
      },
      ...(dep.hotel_rules ? [{ title: 'Regras de Hospedagem', description: dep.hotel_rules }] : []),
    ];

    const emergencyContacts = [
      {
        name: currentStore?.name || 'Plantão da Agência',
        category: 'Agência de Viagens',
        phone: currentStore?.phone || '(49) 99999-9999',
        whatsapp: true,
        is24h: true,
      },
      {
        name: 'Suporte Aeroportuário',
        category: 'Infraero / Balcão',
        phone: '0800 707 4477',
        is24h: true,
      },
    ];

    let customWhatsAppText = `Olá, *${dep.client_name}*! Seguem os dados essenciais do seu embarque para *${dep.destination}*:\n\n`;
    if (dep.airline_locator) customWhatsAppText += `️ *Localizador (PNR):* ${dep.airline_locator}\n`;
    if (dep.airline_code || dep.flight_number) customWhatsAppText += ` *Voo:* ${dep.airline_code || ''} ${dep.flight_number || ''}\n`;
    customWhatsAppText += ` *Data de Embarque:* ${depDate}\n`;
    if (dep.hotel_name) customWhatsAppText += ` *Hospedagem:* ${dep.hotel_name}\n`;
    customWhatsAppText += `\nLembrando de levar documento original com foto (RG/CNH ou Passaporte). Desejamos uma excelente viagem!`;

    setCompanionCardData({
      niche: 'tourism',
      title: dep.destination || 'Embarque de Viagem',
      subtitle: `Passageiro(a): ${dep.client_name}`,
      code: dep.airline_locator || dep.flight_number || `EMB-${(dep.id || '').slice(0, 6).toUpperCase()}`,
      companyName: currentStore?.name || 'Excelência Tour',
      companyLogoUrl: currentStore?.logo_url,
      participants: [dep.client_name],
      sections,
      rules,
      emergencyContacts,
      customWhatsAppText,
    });
    setCompanionCardOpen(true);
  };

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
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 flex flex-col min-h-dvh pb-12 overflow-x-hidden">
      {/* ── Canonical Toolbar ── */}
      {/* design-lint-ignore DL-15 reason:"Toolbar canônica encapsula foco e alvos em suas primitivas" expiry:"2026-12-31" */}
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
          label: 'Scanner 9:16 (IA)',
          icon: Star,
          variant: 'outline',
          onClick: () => setOcrModalOpen(true),
        }}
        filterSlot={
          <div className="waesy-tab-strip flex items-center gap-2 py-1 max-w-full">
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
                className={`h-11 px-4 rounded-lg text-xs text-muted-foreground/75 font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 flex items-center justify-center ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground font-bold '
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
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Mês anterior"
                  className="size-11 p-0 rounded-lg cursor-pointer"
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
                  className="h-11 px-4 text-xs font-bold rounded-lg cursor-pointer"
                  onClick={() => { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()); }}
                >
                  Hoje
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Próximo mês"
                  className="size-11 p-0 rounded-lg cursor-pointer"
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
            <div className="rounded-lg border border-border overflow-hidden bg-card">
              {/* Day headers */}
              <div className="waesy-calendar-grid border-b border-border/60 bg-muted/30">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                  <div key={d} className="text-center text-xs text-muted-foreground/75 font-semibold text-muted-foreground py-2">{d}</div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="waesy-calendar-grid">
                {/* Empty cells */}
                {Array.from({ length: firstDay }, (_, i) => (
                  <div key={`empty-${i}`} className="min-h-20 sm:min-h-24 border-b border-r border-border/40 bg-muted/10" />
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
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedDay(isSelected ? null : dayDate)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedDay(isSelected ? null : dayDate);
                        }
                      }}
                      className={`min-h-20 sm:min-h-24 border-b border-r border-border/40 p-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
                            {dayCards.length}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {dayCards.slice(0, 2).map(card => {
                          const days = Math.ceil((new Date(card.departure_date).getTime() - Date.now()) / 86400000);
                          return (
                            <div
                              key={card.id}
                              role="button"
                              tabIndex={0}
                              onClick={(e) => { e.stopPropagation(); setSelectedDepartureId(card.id); }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setSelectedDepartureId(card.id);
                                }
                              }}
                              className={`text-xs font-medium px-2 py-1 rounded truncate cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                days <= 0 ? 'bg-emerald-500/15 text-emerald-700' :
                                days <= 2 ? 'bg-red-500/15 text-red-700' :
                                days <= 7 ? 'bg-amber-500/15 text-amber-700' :
                                'bg-primary/10 text-primary'
                              }`}
                            >
                               {card.client_name}
                            </div>
                          );
                        })}
                        {dayCards.length > 2 && (
                          <div className="text-xs text-muted-foreground pl-1">+{dayCards.length - 2} mais</div>
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
                <div className="waesy-card-grid gap-3">
                  {selectedDayDepartures.map(card => <DepartureCard key={card.id} card={card} onOpen={() => setSelectedDepartureId(card.id)} />)}
                </div>
              </div>
            )}

            {/* All upcoming departures timeline */}
            {!selectedDay && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Próximos Embarques</p>
                <div className="waesy-card-grid gap-3">
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
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none mr-2" />Carregando embarques...
            </div>
          ) : (
            <div className="flex gap-4 pb-4 min-h-96 waesy-kanban-strip">
              {DEPARTURE_STAGES.map(col => {
                const colCards = filteredKanban.filter(c => c.stage === col.id);
                return (
                  <div
                    key={col.id}
                    className="flex-none w-80 bg-muted/20 border border-border rounded-lg flex flex-col"
                  >
                    <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between shrink-0">
                      <div>
                        <h3 className="text-xs font-bold text-foreground">{col.label}</h3>
                        <p className="text-xs text-muted-foreground">{col.desc}</p>
                      </div>
                      <Badge variant="outline" className="font-mono text-xs h-5 px-2">{colCards.length}</Badge>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
                      {colCards.length === 0 ? (
                        <div className="h-24 rounded-lg border border-dashed border-border/60 flex items-center justify-center text-xs text-muted-foreground/75 text-muted-foreground">
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

      {/* ── Detail Sheet (CardDetailPanel Modular) ── */}
      <CardDetailPanel
        open={Boolean(selectedDepartureId)}
        departureId={selectedDepartureId}
        onClose={() => setSelectedDepartureId(null)}
        storeId={storeId}
        onUpdated={() => {
          qc.invalidateQueries({ queryKey: ['travel-departures', storeId] });
        }}
      />

      {/* ── New Departure Sheet ── */}
      <Sheet open={newOpen} onOpenChange={setNewOpen}>
        <SheetContent
          side="right"
          size="wide"
          className="waesy-sheet-responsive border-l p-0 flex flex-col bg-card overflow-hidden"
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
                <div className="space-y-2 p-3 rounded-lg border border-border/70 bg-muted/20">
                  <Label className="text-xs text-muted-foreground/75 font-semibold text-muted-foreground">Vincular Cliente da Carteira (CRM)</Label>
                  <select
                    className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none"
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
                  <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nome do passageiro" className="h-11 text-xs rounded-lg" required autoFocus />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">WhatsApp</Label>
                  <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="(49) 99999-9999" className="h-10 text-xs rounded-lg font-mono" />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nº Passageiros</Label>
                  <Input type="number" value={passengersCount} onChange={e => setPassengersCount(e.target.value)} min="1" className="h-10 text-xs rounded-lg font-mono" />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Destino Principal *</Label>
                  <Input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Ex: Gramado, RS ou Cancún, México" className="h-11 text-xs rounded-lg" required />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Tipo de Destino *</Label>
                  <select
                    value={destinationType}
                    onChange={e => setDestinationType(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none"
                  >
                    <option value="domestic">Nacional</option>
                    <option value="international">Internacional</option>
                    <option value="cruise">Cruzeiro</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Embarque *</Label>
                  <Input type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} className="h-11 text-xs rounded-lg" required />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Retorno</Label>
                  <Input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className="h-11 text-xs rounded-lg" />
                </div>

                <div className="space-y-1 sm:col-span-2 border-t border-border/60 pt-3">
                  <p className="text-xs text-muted-foreground/75 font-bold text-muted-foreground uppercase tracking-wider">Voo (Opcional)</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">CIA Aérea</Label>
                  <Input
                    value={airlineCode}
                    onChange={e => setAirlineCode(e.target.value.toUpperCase())}
                    placeholder="LA, G3, AD..."
                    className="h-10 text-xs rounded-lg font-mono"
                    maxLength={3}
                    list="airlines-list"
                  />
                  <datalist id="airlines-list">
                    {Object.keys(AIRLINE_CHECKIN_LINKS).map(k => <option key={k} value={k} />)}
                  </datalist>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nº do Voo</Label>
                  <Input value={flightNumber} onChange={e => setFlightNumber(e.target.value.toUpperCase())} placeholder="LA3214" className="h-10 text-xs rounded-lg font-mono" />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Localizador / PNR</Label>
                  <Input value={airlineLocator} onChange={e => setAirlineLocator(e.target.value.toUpperCase())} placeholder="XYZABC" className="h-10 text-xs rounded-lg font-mono" />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Hotel / Pousada</Label>
                  <Input value={hotelName} onChange={e => setHotelName(e.target.value)} placeholder="Nome do hotel" className="h-11 text-xs rounded-lg" />
                </div>
              </div>

              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-muted-foreground/75 text-emerald-700 dark:text-emerald-400">
                <Star className="size-3 inline mr-2" />
                Checklist automático de <strong>{destinationType === 'domestic' ? 'destino nacional' : destinationType === 'international' ? 'destino internacional' : 'cruzeiro'}</strong> será criado com {destinationType === 'domestic' ? '6' : destinationType === 'international' ? '13' : '7'} itens.
              </div>
            </div>

            <div className="px-5 py-4 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2 shrink-0">
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)} className="h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || !clientName.trim() || !destination.trim() || !departureDate} className="h-11 px-5 rounded-lg text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                {createMutation.isPending ? <><Loader2 className="size-3.5 animate-spin motion-reduce:animate-none mr-2" />Criando...</> : 'Criar Embarque'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Modal do Cartão Digital 9:16 */}
      <Dialog open={companionCardOpen} onOpenChange={setCompanionCardOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-border bg-card rounded-lg sm:max-w-lg">
          <DialogHeader className="p-4 border-b border-border/70 bg-muted/30">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Smartphone className="size-4 text-emerald-600" />
              Cartão Digital de Embarque 9:16 (WhatsApp)
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 max-h-dvh overflow-y-auto no-scrollbar flex justify-center">
            {companionCardData && (
              <DigitalCompanionCard {...companionCardData} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Scanner Multimodal OCR */}
      <Dialog open={ocrModalOpen} onOpenChange={setOcrModalOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden border-border bg-card rounded-lg">
          <DialogHeader className="p-4 border-b border-border/70 bg-muted/30">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Star className="size-4 text-primary" />
              Scanner Inteligente de Embarque e Bilhetes
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 max-h-dvh overflow-y-auto no-scrollbar">
            <MultimodalOcrUploader
              nicheHint="tourism"
              showPreviewModal={false}
              onExtracted={handleOcrExtractedForDeparture}
            />
          </div>
        </DialogContent>
      </Dialog>
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
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      className={`p-4 rounded-lg border cursor-pointer hover:border-primary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${urgencyClass}`}
    >
      <div className="flex items-start justify-between gap-1 mb-2">
        <div>
          <h4 className="text-xs font-bold text-foreground leading-tight">{card.client_name}</h4>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="size-2.5" />{card.destination}
          </p>
        </div>
        <span className={`text-xs font-mono font-bold px-2 py-1 rounded shrink-0 ${
          daysUntil <= 0 ? 'bg-emerald-500/20 text-emerald-700' :
          daysUntil <= 2 ? 'bg-red-500/20 text-red-700' :
          daysUntil <= 7 ? 'bg-amber-500/20 text-amber-700' :
          'bg-muted text-muted-foreground'
        }`}>
          {daysUntil <= 0 ? ' Hoje/Passado' : `em ${daysUntil}d`}
        </span>
      </div>

      {!compact && (
        <>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-2">
            <span>{new Date(card.departure_date).toLocaleDateString('pt-BR')}</span>
            <span>·</span>
            <span>{card.passengers_count}pax</span>
            {card.airline_code && <><span>·</span><span className="text-indigo-600">{card.airline_code}</span></>}
          </div>

          {/* Checklist progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
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
