import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Clock,
  Plane,
  Hotel,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  FileText,
  ExternalLink,
  Send,
  Download,
  AlertTriangle,
  Loader2,
  Calendar,
  Users,
  MapPin,
  Pencil,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { FileAttachmentUpload } from '@/components/ui/file-attachment-upload';
import { toast } from 'sonner';
import {
  getDepartureWithChecklist,
  updateDepartureDetails,
  toggleChecklistItem,
  addChecklistItem,
  deleteChecklistItem,
  uploadBoardingDocument,
  deleteBoardingDocument,
  deleteDepartureCard,
  AIRLINE_CHECKIN_LINKS,
  type DepartureWithChecklist,
  type ChecklistItem,
  type BoardingDocument,
  type ChecklistCategory,
  type DocumentType,
} from '@/services/travel-departures.functions';

export interface CardDetailPanelProps {
  departureId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  storeId?: string;
}

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
  documentation: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
  health: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
  insurance: 'text-violet-600 bg-violet-500/10 border-violet-500/20',
  financial: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
  logistics: 'text-orange-600 bg-orange-500/10 border-orange-500/20',
  communication: 'text-sky-600 bg-sky-500/10 border-sky-500/20',
  airline: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20',
  hotel: 'text-pink-600 bg-pink-500/10 border-pink-500/20',
  custom: 'text-muted-foreground bg-muted border-border',
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

export function CardDetailPanel({
  departureId,
  open,
  onClose,
  onUpdated,
  storeId,
}: CardDetailPanelProps) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'checklist' | 'documents' | 'flight_hotel' | 'briefing'>('checklist');

  // Form states for new checklist item
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<ChecklistCategory>('documentation');

  // Document upload state
  const [docType, setDocType] = useState<DocumentType>('contract');
  const [docUrl, setDocUrl] = useState('');

  // Editing basic info inline
  const [isEditing, setIsEditing] = useState(false);
  const [airlineLocator, setAirlineLocator] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [hotelName, setHotelName] = useState('');
  const [notes, setNotes] = useState('');

  const { data: departure, isLoading } = useQuery<DepartureWithChecklist | null>({
    queryKey: ['departure-detail', departureId],
    queryFn: async () => {
      if (!departureId) return null;
      return (await getDepartureWithChecklist({ data: { departure_id: departureId } })) as any;
    },
    enabled: Boolean(departureId && open),
  });

  // Sync edit fields when departure loads
  React.useEffect(() => {
    if (departure) {
      setAirlineLocator(departure.airline_locator || '');
      setFlightNumber(departure.flight_number || '');
      setHotelName(departure.hotel_name || '');
      setNotes((departure as any).notes || '');
    }
  }, [departure]);

  const toggleMutation = useMutation({
    mutationFn: ({ item_id, is_completed }: { item_id: string; is_completed: boolean }) =>
      toggleChecklistItem({ data: { item_id, is_completed } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departure-detail', departureId] });
      qc.invalidateQueries({ queryKey: ['travel-departures'] });
      onUpdated?.();
    },
    onError: (err: any) => toast.error(err?.message || 'Erro ao atualizar checklist.'),
  });

  const addItemMutation = useMutation({
    mutationFn: () => {
      if (!departureId || !newItemLabel.trim()) throw new Error('Dados inválidos');
      return addChecklistItem({
        data: {
          departure_id: departureId,
          label: newItemLabel.trim(),
          category: newItemCategory,
        },
      });
    },
    onSuccess: () => {
      toast.success('Item adicionado ao checklist!');
      setNewItemLabel('');
      qc.invalidateQueries({ queryKey: ['departure-detail', departureId] });
      onUpdated?.();
    },
    onError: (err: any) => toast.error(err?.message || 'Erro ao adicionar item.'),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (item_id: string) => deleteChecklistItem({ data: { item_id } }),
    onSuccess: () => {
      toast.success('Item removido do checklist.');
      qc.invalidateQueries({ queryKey: ['departure-detail', departureId] });
      onUpdated?.();
    },
    onError: (err: any) => toast.error(err?.message || 'Erro ao excluir item.'),
  });

  const uploadDocMutation = useMutation({
    mutationFn: async () => {
      if (!departureId || !docUrl.trim()) throw new Error('Selecione ou envie um documento válido.');
      return uploadBoardingDocument({
        data: {
          departure_id: departureId,
          document_type: docType,
          file_url: docUrl.trim(),
          file_name: `${DOC_TYPE_LABELS[docType]} - ${new Date().toLocaleDateString('pt-BR')}`,
        },
      });
    },
    onSuccess: () => {
      toast.success('Documento anexado com sucesso!');
      setDocUrl('');
      qc.invalidateQueries({ queryKey: ['departure-detail', departureId] });
      onUpdated?.();
    },
    onError: (err: any) => toast.error(err?.message || 'Erro ao anexar documento.'),
  });

  const deleteDocMutation = useMutation({
    mutationFn: (document_id: string) => deleteBoardingDocument({ data: { document_id } }),
    onSuccess: () => {
      toast.success('Documento excluído.');
      qc.invalidateQueries({ queryKey: ['departure-detail', departureId] });
      onUpdated?.();
    },
    onError: (err: any) => toast.error(err?.message || 'Erro ao excluir documento.'),
  });

  const deleteDepartureMutation = useMutation({
    mutationFn: () => {
      if (!departureId) throw new Error('ID não informado');
      return deleteDepartureCard({ data: { id: departureId } });
    },
    onSuccess: () => {
      toast.success('Cartão de embarque excluído.');
      qc.invalidateQueries({ queryKey: ['travel-departures'] });
      onUpdated?.();
      onClose();
    },
    onError: (err: any) => toast.error(err?.message || 'Erro ao excluir embarque.'),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!departureId) throw new Error('ID não informado');
      return updateDepartureDetails({
        data: {
          id: departureId,
          airline_locator: airlineLocator || null,
          flight_number: flightNumber || null,
          hotel_name: hotelName || null,
          notes: notes || null,
        },
      });
    },
    onSuccess: () => {
      toast.success('Informações atualizadas!');
      setIsEditing(false);
      qc.invalidateQueries({ queryKey: ['departure-detail', departureId] });
      qc.invalidateQueries({ queryKey: ['travel-departures'] });
      onUpdated?.();
    },
    onError: (err: any) => toast.error(err?.message || 'Erro ao salvar.'),
  });

  const checklist = departure?.checklist_items || [];
  const documents = departure?.documents || [];

  const checklistByCategory = useMemo(() => {
    const groups: Partial<Record<ChecklistCategory, ChecklistItem[]>> = {};
    checklist.forEach((item) => {
      const cat = item.category || 'custom';
      if (!groups[cat]) groups[cat] = [];
      groups[cat]!.push(item);
    });
    return groups;
  }, [checklist]);

  const daysUntilDeparture = useMemo(() => {
    if (!departure?.departure_date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dep = new Date(departure.departure_date);
    dep.setHours(0, 0, 0, 0);
    return Math.round((dep.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }, [departure?.departure_date]);

  // WhatsApp briefing text generator
  const briefingText = useMemo(() => {
    if (!departure) return '';
    const lines = [
      `✈️ *BRIEFING DE EMBARQUE — ${departure.client_name}*`,
      `📍 Destino: ${departure.destination_city || 'Viagem'}`,
      `📅 Embarque: ${departure.departure_date ? new Date(departure.departure_date).toLocaleDateString('pt-BR') : 'A definir'}`,
    ];
    if (departure.flight_number) lines.push(`🛫 Voo: ${departure.flight_number}`);
    if (departure.airline_locator) lines.push(`🎫 Localizador / PNR: ${departure.airline_locator}`);
    if (departure.hotel_name) lines.push(`🏨 Hotel: ${departure.hotel_name}`);
    lines.push('\n📋 *Checklist de Documentos:*');
    checklist.forEach((item) => {
      lines.push(`${item.is_completed ? '✅' : '⏳'} ${item.label}`);
    });
    lines.push('\nTenha uma excelente viagem! Qualquer dúvida, estamos à disposição.');
    return lines.join('\n');
  }, [departure, checklist]);

  const handleShareBriefing = () => {
    if (!briefingText) return;
    const cleanPhone = (departure?.client_phone || '').replace(/\D/g, '');
    const url = cleanPhone
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(briefingText)}`
      : `https://wa.me/?text=${encodeURIComponent(briefingText)}`;
    window.open(url, '_blank');
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full max-sm:!max-w-full max-sm:!w-screen sm:max-w-2xl md:max-w-3xl flex flex-col p-0 bg-background text-foreground border-l border-border/70"
      >
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground font-mono">Carregando detalhes do embarque...</p>
          </div>
        ) : !departure ? (
          <div className="p-8 text-center space-y-3">
            <AlertTriangle className="size-8 text-amber-500 mx-auto" />
            <p className="text-sm font-bold text-foreground">Embarque não encontrado</p>
            <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
              Fechar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header com resumo do passageiro */}
            <div className="p-6 border-b border-border/60 bg-muted/20 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] font-bold uppercase">
                      {departure.destination_type === 'international'
                        ? 'Internacional'
                        : departure.destination_type === 'cruise'
                        ? 'Cruzeiro'
                        : 'Nacional'}
                    </Badge>
                    {daysUntilDeparture !== null && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          daysUntilDeparture <= 1
                            ? 'bg-red-500/10 text-red-600 border-red-500/30'
                            : daysUntilDeparture <= 3
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                        }`}
                      >
                        {daysUntilDeparture === 0
                          ? 'Embarque Hoje'
                          : daysUntilDeparture < 0
                          ? `Embarcou há ${Math.abs(daysUntilDeparture)}d`
                          : `Faltam ${daysUntilDeparture} dias`}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-foreground truncate">{departure.client_name}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    {departure.destination_city && (
                      <span className="flex items-center gap-1 font-semibold text-foreground">
                        <MapPin className="size-3.5 text-primary" />
                        {departure.destination_city}
                      </span>
                    )}
                    {departure.departure_date && (
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="size-3.5" />
                        {new Date(departure.departure_date).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    {departure.passengers_count && (
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" />
                        {departure.passengers_count} Pax
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    onClick={handleShareBriefing}
                    className="h-10 sm:h-11 px-4 gap-2 text-xs sm:text-sm font-bold rounded-xl border-emerald-500/30 text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer shadow-2xs"
                    title="Enviar briefing por WhatsApp"
                  >
                    <Send className="size-4" />
                    <span>Briefing WhatsApp</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (window.confirm(`Tem certeza que deseja excluir o cartão de embarque de ${departure.client_name}?`)) {
                        deleteDepartureMutation.mutate();
                      }
                    }}
                    disabled={deleteDepartureMutation.isPending}
                    className="size-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                    title="Excluir embarque"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Navegação por Abas */}
              <div className="flex border-b border-border/60 gap-2 -mb-6 pt-2 overflow-x-auto no-scrollbar">
                {[
                  { id: 'checklist', label: `Checklist (${checklist.length})` },
                  { id: 'documents', label: `Documentos (${documents.length})` },
                  { id: 'flight_hotel', label: 'Voo & Hospedagem' },
                  { id: 'briefing', label: 'Briefing WhatsApp' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer min-h-[44px] whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conteúdo das Abas */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 [scrollbar-width:thin]">
              {/* ABA 1: CHECKLIST */}
              {activeTab === 'checklist' && (
                <div className="space-y-6">
                  {Object.entries(checklistByCategory).map(([cat, items]) => (
                    <div key={cat} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] font-bold uppercase ${CATEGORY_COLORS[cat as ChecklistCategory]}`}>
                          {CATEGORY_LABELS[cat as ChecklistCategory]}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {items?.filter((i) => i.is_completed).length}/{items?.length} concluídos
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {items?.map((item) => (
                          <div
                            key={item.id}
                            className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                              item.is_completed
                                ? 'bg-emerald-500/[0.04] border-emerald-500/20'
                                : 'bg-card border-border/70 hover:border-primary/40'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleMutation.mutate({ item_id: item.id, is_completed: !item.is_completed })}
                              className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer min-h-[44px] py-1"
                            >
                              {item.is_completed ? (
                                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                              ) : (
                                <Circle className="size-4 text-muted-foreground shrink-0" />
                              )}
                              <span
                                className={`text-xs font-medium leading-tight truncate ${
                                  item.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'
                                }`}
                              >
                                {item.label}
                              </span>
                            </button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteItemMutation.mutate(item.id)}
                              className="size-7 rounded-lg text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {checklist.length === 0 && (
                    <p className="text-xs text-muted-foreground italic text-center py-6">
                      Nenhum item de checklist configurado para este embarque.
                    </p>
                  )}

                  {/* Adicionar Novo Item */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-muted/20 space-y-3">
                    <Label className="text-xs sm:text-sm font-bold text-foreground">Novo Item no Checklist</Label>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <select
                        value={newItemCategory}
                        onChange={(e) => setNewItemCategory(e.target.value as ChecklistCategory)}
                        className="h-11 px-3 rounded-xl border border-input bg-background text-sm shrink-0"
                      >
                        {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={newItemLabel}
                        onChange={(e) => setNewItemLabel(e.target.value)}
                        placeholder="Descrição da pendência..."
                        className="h-11 text-sm flex-1 rounded-xl"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') addItemMutation.mutate();
                        }}
                      />
                      <Button
                        disabled={!newItemLabel.trim() || addItemMutation.isPending}
                        onClick={() => addItemMutation.mutate()}
                        className="h-11 px-5 rounded-xl font-bold text-sm cursor-pointer shrink-0 shadow-2xs"
                      >
                        <Plus className="size-4 mr-1.5" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: DOCUMENTOS */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="p-3.5 rounded-xl border border-border/70 bg-card flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <FileText className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate">{DOC_TYPE_LABELS[doc.document_type]}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{doc.file_name || 'Arquivo anexo'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {doc.ocr_status === 'completed' && (
                            <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-500/30">
                              OCR ✓
                            </Badge>
                          )}
                          <Button asChild size="icon" variant="ghost" className="size-7 rounded-lg text-muted-foreground">
                            <a href={doc.file_url} target="_blank" rel="noreferrer" title="Visualizar arquivo">
                              <ExternalLink className="size-3.5" />
                            </a>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (window.confirm('Deseja excluir este documento?')) {
                                deleteDocMutation.mutate(doc.id);
                              }
                            }}
                            disabled={deleteDocMutation.isPending}
                            className="size-7 rounded-lg text-muted-foreground hover:text-destructive cursor-pointer"
                            title="Excluir documento"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {documents.length === 0 && (
                      <p className="text-xs text-muted-foreground italic text-center py-6">
                        Nenhum documento anexado ainda.
                      </p>
                    )}
                  </div>

                  {/* Upload de Novo Documento */}
                  <div className="p-4 rounded-2xl border border-border/60 bg-muted/20 space-y-3">
                    <Label className="text-xs font-bold text-foreground">Anexar Documento de Viagem</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">Tipo de Documento</Label>
                        <select
                          value={docType}
                          onChange={(e) => setDocType(e.target.value as DocumentType)}
                          className="w-full h-9 px-2 rounded-xl border border-input bg-background text-xs"
                        >
                          {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">Arquivo</Label>
                        <FileAttachmentUpload
                          value={docUrl}
                          onChange={setDocUrl}
                          helperText="Selecionar PDF ou imagem..."
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => uploadDocMutation.mutate()}
                      disabled={!docUrl || uploadDocMutation.isPending}
                      className="w-full rounded-xl font-bold text-xs h-9 gap-1.5 cursor-pointer"
                    >
                      {uploadDocMutation.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Plus className="size-3.5" />
                      )}
                      Salvar Documento Anexado
                    </Button>
                  </div>
                </div>
              )}

              {/* ABA 3: VOO & HOSPEDAGEM */}
              {activeTab === 'flight_hotel' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl border border-border/70 bg-card space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Plane className="size-4 text-primary" />
                        Detalhes do Voo & Check-in
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(!isEditing)}
                        className="h-7 px-2.5 text-[11px] font-bold rounded-lg cursor-pointer"
                      >
                        {isEditing ? <Check className="size-3 mr-1 text-emerald-500" /> : <Pencil className="size-3 mr-1" />}
                        {isEditing ? 'Pronto' : 'Editar'}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Localizador / PNR</Label>
                        {isEditing ? (
                          <Input
                            value={airlineLocator}
                            onChange={(e) => setAirlineLocator(e.target.value)}
                            placeholder="Ex: ABC123"
                            className="h-8 text-xs font-mono font-bold uppercase"
                          />
                        ) : (
                          <p className="text-xs font-bold font-mono text-foreground">
                            {departure.airline_locator || 'Não informado'}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Número do Voo</Label>
                        {isEditing ? (
                          <Input
                            value={flightNumber}
                            onChange={(e) => setFlightNumber(e.target.value)}
                            placeholder="Ex: LA3214"
                            className="h-8 text-xs font-mono"
                          />
                        ) : (
                          <p className="text-xs font-bold font-mono text-foreground">
                            {departure.flight_number || 'Não informado'}
                          </p>
                        )}
                      </div>
                    </div>

                    {departure.airline_code && (AIRLINE_CHECKIN_LINKS as any)[departure.airline_code] && (
                      <div className="pt-2">
                        <Button asChild size="sm" variant="outline" className="w-full text-xs font-bold gap-1.5 rounded-xl">
                          <a href={(AIRLINE_CHECKIN_LINKS as any)[departure.airline_code]} target="_blank" rel="noreferrer">
                            <ExternalLink className="size-3.5" />
                            Acessar Check-in Oficial da Companhia Aérea
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Detalhes do Hotel */}
                  <div className="p-4 rounded-2xl border border-border/70 bg-card space-y-3">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Hotel className="size-4 text-primary" />
                      Hospedagem & Hotel
                    </h4>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Nome do Hotel / Resort</Label>
                      {isEditing ? (
                        <Input
                          value={hotelName}
                          onChange={(e) => setHotelName(e.target.value)}
                          placeholder="Ex: Grand Palladium Resort"
                          className="h-8 text-xs"
                        />
                      ) : (
                        <p className="text-xs font-bold text-foreground">
                          {departure.hotel_name || 'Hospedagem não informada'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Observações Operacionais */}
                  <div className="p-4 rounded-2xl border border-border/70 bg-card space-y-2">
                    <Label className="text-xs font-bold text-foreground">Observações Operacionais & Cuidados</Label>
                    {isEditing ? (
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Instruções especiais, conexões curtas, bagagem diferenciada..."
                        className="rounded-xl text-xs resize-none"
                        rows={3}
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {(departure as any).notes || 'Nenhuma observação informada.'}
                      </p>
                    )}
                  </div>

                  {isEditing && (
                    <Button
                      onClick={() => updateMutation.mutate()}
                      disabled={updateMutation.isPending}
                      className="w-full rounded-xl font-bold text-xs cursor-pointer"
                    >
                      Salvar Alterações
                    </Button>
                  )}
                </div>
              )}

              {/* ABA 4: BRIEFING */}
              {activeTab === 'briefing' && (
                <div className="space-y-3">
                  <Label className="text-xs font-bold text-foreground">Texto do Briefing Pré-Formatado</Label>
                  <Textarea
                    value={briefingText}
                    readOnly
                    rows={12}
                    className="font-mono text-xs bg-muted/30 rounded-xl"
                  />
                  <Button
                    onClick={handleShareBriefing}
                    className="w-full gap-2 font-bold text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  >
                    <Send className="size-3.5" />
                    Enviar Briefing pelo WhatsApp
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
