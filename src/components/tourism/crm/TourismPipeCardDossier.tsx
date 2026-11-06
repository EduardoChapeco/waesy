import React, { useState, useMemo, useRef } from "react";
import {
  MapPin,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Paperclip,
  FileText,
  Sparkles,
  UserCheck,
  MessageSquare,
  Share2,
  Link2,
  Copy,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  Plane,
  X,
  Send,
  Eye,
  CheckSquare,
  Square,
  Edit3,
  Check,
  Upload,
  Printer,
  Download,
  FileCheck,
  FileCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  generateDynamicTravelPresentation,
  type PreBoardingTripInput,
  type GeneratedPreBoardingPresentation,
} from "@/services/travel-pre-boarding-and-commissions.functions";

export interface TourismStageConfig {
  id: string;
  title: string;
  dotColor: string;
  description: string;
}

export interface DynamicChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface DynamicChecklistGroup {
  id: string;
  title: string;
  items: DynamicChecklistItem[];
}

export interface TourismPipeCardDossierProps {
  lead: any;
  stages: TourismStageConfig[];
  team: Array<{ profile_id?: string; id?: string; name?: string; full_name?: string }>;
  proposals: any[];
  onClose: () => void;
  onMoveStage: (leadId: string, newStage: string) => void;
  onSaveLead: (updatedData: any) => Promise<void>;
  onPromoteToCustomer: (leadId: string) => void;
  onGenerateProposal: (leadData: any) => void;
  onScheduleMeeting: (meetingData: {
    leadId: string;
    title: string;
    description: string | null;
    scheduledAt: string;
    meetingType: "call" | "video" | "in_person";
    durationMinutes: number;
  }) => Promise<void>;
  onToggleChecklist?: (itemId: string) => Promise<void>;
  onIssueContract?: (contractData: {
    leadId: string;
    contractTitle: string;
    packageSummary: string;
    totalValueCents: number;
    paymentConditions: string;
  }) => Promise<any>;
  customer360Data?: any;
  activeOnboardingForm?: any;
}

const INTEREST_TYPES = [
  { value: "package_flight", label: "Pacote Aéreo Completo" },
  { value: "hotel", label: "Somente Hospedagem / Resort" },
  { value: "package_ground", label: "Excursão Rodoviária / Terrestre" },
  { value: "flights", label: "Passagens Aéreas" },
  { value: "cruise", label: "Cruzeiro Marítimo" },
  { value: "visa", label: "Visto e Passaporte" },
  { value: "corporate", label: "Corporativo / Negócios" },
];

const POPULAR_TAGS = [
  { name: "Família", color: "bg-blue-500" },
  { name: "Lua de Mel", color: "bg-rose-500" },
  { name: "Cruzeiro", color: "bg-cyan-500" },
  { name: "EUA/Disney", color: "bg-indigo-500" },
  { name: "Europa", color: "bg-emerald-500" },
  { name: "Nordeste", color: "bg-warning" },
  { name: "Alta Renda", color: "bg-violet-500" },
];

export function TourismPipeCardDossier({
  lead,
  stages,
  team,
  proposals,
  onClose,
  onMoveStage,
  onSaveLead,
  onPromoteToCustomer,
  onGenerateProposal,
  onScheduleMeeting,
  onToggleChecklist,
  customer360Data,
  activeOnboardingForm,
}: TourismPipeCardDossierProps) {
  // Form State
  const [formData, setFormData] = useState({
    name: lead.full_name || "",
    phone: lead.phone || "",
    email: lead.email || "",
    destination: lead.destination || "",
    interest_type: lead.interest_type || "package_flight",
    travel_start: lead.travel_start || "",
    travel_end: lead.travel_end || "",
    pax_adults: lead.pax_adults || 2,
    pax_children: lead.pax_children || 0,
    estimated_value_cents: lead.estimated_value_cents || 0,
    status: lead.status || "new",
    assigned_to: lead.assigned_to || "",
    notes: lead.notes || "",
    pcd: Boolean(lead.custom_fields?.pcd),
    reduced_mobility: Boolean(lead.custom_fields?.reduced_mobility),
    autism_spectrum: Boolean(lead.custom_fields?.autism_spectrum),
    health_notes: lead.custom_fields?.health_notes || "",
    tags: Array.isArray(lead.tags) ? lead.tags : [],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("form");

  // Dynamic Checklists state (Pipefy style)
  const initialChecklistGroups = useMemo<DynamicChecklistGroup[]>(() => {
    if (lead.custom_fields?.checklist_groups && Array.isArray(lead.custom_fields.checklist_groups)) {
      return lead.custom_fields.checklist_groups;
    }
    const legacyChecklist = Array.isArray(lead.checklist) ? lead.checklist : [];
    return [
      {
        id: "default-checklist",
        title: "Checklist de Atendimento",
        items: legacyChecklist.map((it: any) => ({
          id: it.id || String(Math.random()),
          text: it.text || it.title || "Item do checklist",
          done: Boolean(it.done),
        })),
      },
    ];
  }, [lead.checklist, lead.custom_fields?.checklist_groups]);

  const [checklistGroups, setChecklistGroups] = useState<DynamicChecklistGroup[]>(initialChecklistGroups);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [isCreatingChecklist, setIsCreatingChecklist] = useState(false);
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});

  // Presentation State
  const [presentationModalOpen, setPresentationModalOpen] = useState(false);
  const [generatedPresentation, setGeneratedPresentation] = useState<GeneratedPreBoardingPresentation | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Quick Meeting State
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingType, setMeetingType] = useState<"call" | "video" | "in_person">("call");
  const [meetingRoomUrl, setMeetingRoomUrl] = useState("");
  const [isSchedulingMeeting, setIsSchedulingMeeting] = useState(false);

  // Internal Comment State
  const [newComment, setNewComment] = useState("");
  const [internalComments, setInternalComments] = useState<Array<{ id: string; author: string; text: string; date: string }>>(() => {
    return Array.isArray(lead.custom_fields?.comments) ? lead.custom_fields.comments : [];
  });

  // Attachments State (Pipefy & Trello Benchmark)
  const [cardAttachments, setCardAttachments] = useState<any[]>(() => {
    return Array.isArray(lead.attachments) ? lead.attachments : [];
  });

  // PDF Templates & Dynamic Merge Tags State (Pipefy Benchmark)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedPdfTemplateKey, setSelectedPdfTemplateKey] = useState<string>("proposta_a4");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [activePdfTab, setActivePdfTab] = useState<"templates" | "fields" | "preview">("templates");

  // Current Stage calculations
  const currentStageIdx = stages.findIndex((s) => s.id === formData.status);
  const currentStage = stages[currentStageIdx] || stages[0];
  const nextStage = currentStageIdx < stages.length - 1 ? stages[currentStageIdx + 1] : null;

  // Dynamic Merge Fields Catalog (Pipefy Benchmark: [Campo dinâmico])
  const dynamicMergeFields = useMemo(() => [
    { tag: "{{nome_cliente}}", label: "Nome do Cliente", value: formData.name || "Não informado" },
    { tag: "{{telefone_cliente}}", label: "Telefone do Contato", value: formData.phone || "Não informado" },
    { tag: "{{email_cliente}}", label: "E-mail do Cliente", value: formData.email || "Não informado" },
    { tag: "{{destino_viagem}}", label: "Destino da Viagem", value: formData.destination || "A definir" },
    { tag: "{{tipo_interesse}}", label: "Tipo de Interesse", value: INTEREST_TYPES.find((t) => t.value === formData.interest_type)?.label || "Pacote Completo" },
    { tag: "{{data_ida}}", label: "Data de Embarque", value: formData.travel_start || "A definir" },
    { tag: "{{data_volta}}", label: "Data de Retorno", value: formData.travel_end || "A definir" },
    { tag: "{{passageiros_adultos}}", label: "Passageiros Adultos", value: String(formData.pax_adults || 1) },
    { tag: "{{passageiros_criancas}}", label: "Crianças", value: String(formData.pax_children || 0) },
    { tag: "{{total_passageiros}}", label: "Total de Passageiros", value: String((formData.pax_adults || 1) + (formData.pax_children || 0)) },
    { tag: "{{orcamento_estimado}}", label: "Orçamento Estimado", value: formatMoney(formData.estimated_value_cents || 0) },
    { tag: "{{etapa_funil}}", label: "Etapa Atual no Pipe", value: currentStage.title },
    { tag: "{{consultor_responsavel}}", label: "Consultor Responsável", value: team.find((m) => (m.profile_id || m.id) === formData.assigned_to)?.full_name || "Consultor Waesy" },
    { tag: "{{data_emissao}}", label: "Data de Emissão", value: new Date().toLocaleDateString("pt-BR") },
  ], [formData, currentStage, team]);

  const PDF_TEMPLATES = [
    {
      key: "proposta_a4",
      title: "Proposta Comercial Executiva A4",
      description: "Documento oficial de cotação com aéreo, hotel, transfers e condições de pagamento parcelado.",
      category: "Comercial & Vendas",
      estimatedPages: "2 Páginas A4",
    },
    {
      key: "contrato_turismo",
      title: "Contrato de Intermediação Turística",
      description: "Minuta jurídica canônica com cláusulas de responsabilidade, cancelamento, no-show e aceite digital.",
      category: "Jurídico & LGPD",
      estimatedPages: "4 Páginas A4",
    },
    {
      key: "anamnese_embarque",
      title: "Ficha de Embarque & Anamnese PCD",
      description: "Ficha médica confidencial com acessibilidade, alergias, contatos de emergência e documentos oficiais.",
      category: "Operacional & Saúde",
      estimatedPages: "1 Página A4",
    },
    {
      key: "voucher_resumo",
      title: "Voucher & Roteiro Resumido",
      description: "Itinerário dia a dia para envio no WhatsApp do viajante com códigos de reserva e telefones úteis.",
      category: "Pós-Venda & Embarque",
      estimatedPages: "2 Páginas A4",
    },
  ];

  // Phone & WhatsApp formatting
  const cleanPhone = (formData.phone || "").replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  const whatsappUrl = cleanPhone ? `https://wa.me/${formattedPhone}` : "";

  // Handlers
  const handleSaveForm = async () => {
    setIsSaving(true);
    try {
      const mergedCustomFields = {
        ...(lead.custom_fields || {}),
        pcd: formData.pcd,
        reduced_mobility: formData.reduced_mobility,
        autism_spectrum: formData.autism_spectrum,
        health_notes: formData.health_notes,
        checklist_groups: checklistGroups,
        comments: internalComments,
        attachments: cardAttachments,
      };

      await onSaveLead({
        ...formData,
        attachments: cardAttachments,
        custom_fields: mergedCustomFields,
        checklist: checklistGroups[0]?.items || [],
      });
      toast.success("Card atualizado com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateAndAttachPdf = async (templateKey: string) => {
    setIsGeneratingPdf(true);
    try {
      const template = PDF_TEMPLATES.find((t) => t.key === templateKey) || PDF_TEMPLATES[0];
      const newAttachment = {
        id: `pdf-${Date.now()}`,
        name: `${template.title} - ${formData.destination || "Roteiro"}.pdf`,
        url: `/workspace/turismo/propostas`,
        size: template.estimatedPages,
        type: "application/pdf",
        created_at: new Date().toISOString(),
        templateKey,
      };

      const updatedAttachments = [newAttachment, ...cardAttachments];
      setCardAttachments(updatedAttachments);

      // Histórico
      const newTimelineComment = {
        id: `comm-${Date.now()}`,
        author: "Sistema de Documentos",
        text: `Documento PDF gerado e vinculado ao Card: ${newAttachment.name}`,
        date: new Date().toLocaleString("pt-BR"),
      };
      const updatedComments = [newTimelineComment, ...internalComments];
      setInternalComments(updatedComments);

      const mergedCustomFields = {
        ...(lead.custom_fields || {}),
        pcd: formData.pcd,
        reduced_mobility: formData.reduced_mobility,
        autism_spectrum: formData.autism_spectrum,
        health_notes: formData.health_notes,
        checklist_groups: checklistGroups,
        comments: updatedComments,
        attachments: updatedAttachments,
      };

      await onSaveLead({
        ...formData,
        attachments: updatedAttachments,
        custom_fields: mergedCustomFields,
      });

      toast.success(`${template.title} gerado e vinculado aos Anexos do Card!`);
      setIsPdfModalOpen(false);
      const el = document.getElementById("section-attachments");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleToggleChecklistItem = async (groupId: string, itemId: string) => {
    setChecklistGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          items: g.items.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)),
        };
      })
    );
    if (groupId === "default-checklist" && onToggleChecklist) {
      void onToggleChecklist(itemId);
    }
  };

  const handleAddChecklistItem = (groupId: string) => {
    const text = newItemTexts[groupId]?.trim();
    if (!text) return;
    const newItem: DynamicChecklistItem = {
      id: `item-${Date.now()}`,
      text,
      done: false,
    };
    setChecklistGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, items: [...g.items, newItem] } : g))
    );
    setNewItemTexts((prev) => ({ ...prev, [groupId]: "" }));
  };

  const handleDeleteChecklistItem = (groupId: string, itemId: string) => {
    setChecklistGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, items: g.items.filter((it) => it.id !== itemId) } : g))
    );
  };

  const handleCreateChecklistGroup = () => {
    if (!newChecklistTitle.trim()) return;
    const newGroup: DynamicChecklistGroup = {
      id: `group-${Date.now()}`,
      title: newChecklistTitle.trim(),
      items: [],
    };
    setChecklistGroups((prev) => [...prev, newGroup]);
    setNewChecklistTitle("");
    setIsCreatingChecklist(false);
    toast.success("Novo checklist adicionado ao card!");
  };

  const handleDeleteChecklistGroup = (groupId: string) => {
    setChecklistGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  // Generate AI Presentation
  const handleGeneratePresentation = () => {
    const input: PreBoardingTripInput = {
      presentationType: "commercial_quote",
      agencyName: "Excelência Tour",
      agencyEmergencyPhone: "5549999171623",
      tripTitle: formData.destination || "Roteiro Exclusivo",
      conceptSubtitle: `Viagem sob medida para ${formData.name || "Cliente"}`,
      travelerProfileType: formData.pax_children > 0 ? "familia_criancas" : "casal",
      passengersNames: [formData.name || "Passageiro Principal"],
      adultsCount: formData.pax_adults || 2,
      childrenCount: formData.pax_children || 0,
      startDate: formData.travel_start || "A definir",
      endDate: formData.travel_end || "A definir",
      originCity: "São Paulo / Guarulhos",
      destinations: [formData.destination || "Destino dos Sonhos"],
      countries: ["Brasil"],
      flights: [],
      hotels: [],
      hasReceptiveTransfer: false,
      commercialPriceTotalCents: formData.estimated_value_cents || 0,
      commercialPaymentConditions: "Condições sob consulta e parcelamento facilitado",
    };

    const pres = generateDynamicTravelPresentation(input);
    setGeneratedPresentation(pres);
    setActiveSlideIndex(0);
    setPresentationModalOpen(true);
  };

  // Schedule Meeting
  const handleQuickScheduleMeeting = async () => {
    if (!meetingTitle.trim() || !meetingDate) {
      toast.error("Informe título e data/horário da reunião.");
      return;
    }
    setIsSchedulingMeeting(true);
    try {
      await onScheduleMeeting({
        leadId: lead.id,
        title: meetingTitle.trim(),
        description: meetingRoomUrl.trim() ? `Sala: ${meetingRoomUrl.trim()}` : null,
        scheduledAt: new Date(meetingDate).toISOString(),
        meetingType,
        durationMinutes: 30,
      });
      toast.success("Reunião agendada!");
      setMeetingTitle("");
      setMeetingDate("");
      setMeetingRoomUrl("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao agendar.");
    } finally {
      setIsSchedulingMeeting(false);
    }
  };

  // Add Comment
  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const commentItem = {
      id: `comm-${Date.now()}`,
      author: "Consultor Comercial",
      text: newComment.trim(),
      date: new Date().toLocaleString("pt-BR"),
    };
    setInternalComments((prev) => [commentItem, ...prev]);
    setNewComment("");
  };

  const handleSendFormWhatsApp = () => {
    if (!activeOnboardingForm) {
      toast.info("Nenhum formulário público configurado.");
      return;
    }
    if (!cleanPhone) {
      toast.error("O lead não possui telefone cadastrado.");
      return;
    }
    const url = `${window.location.origin}/f/${activeOnboardingForm.slug}?leadId=${lead.id}&nome=${encodeURIComponent(
      formData.name
    )}&tel=${cleanPhone}`;
    const msg = `Olá, ${formData.name.split(" ")[0]}! Para detalharmos seu roteiro, por favor preencha sua ficha rápida:\n\n${url}`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleCopyFormLink = async () => {
    if (!activeOnboardingForm) {
      toast.info("Nenhum formulário público configurado.");
      return;
    }
    const url = `${window.location.origin}/f/${activeOnboardingForm.slug}?leadId=${lead.id}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link da ficha de onboarding copiado!");
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden text-foreground">
      {/* ── HEADER SOBERANO DO CARD (PIPEFY STYLE) ── */}
      <SheetHeader className="px-6 py-4 pr-20 sm:pr-24 border-b border-border/50 shrink-0 space-y-3 bg-background">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Identificação Principal & Título Editável */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="size-11 rounded-xl bg-muted border border-border/60 flex items-center justify-center shrink-0 font-bold text-foreground text-sm uppercase select-none">
              {(formData.name || "LE").slice(0, 2)}
            </div>
            <div className="min-w-0 space-y-1">
              <SheetTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
                {formData.name || "Oportunidade Comercial"}
              </SheetTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span className="font-medium">Fase:</span>
                <Select
                  value={formData.status}
                  onValueChange={(val) => {
                    setFormData((prev) => ({ ...prev, status: val }));
                    onMoveStage(lead.id, val);
                  }}
                >
                  <SelectTrigger className="h-7 px-3 rounded-full text-xs font-medium gap-2 border border-border/60 bg-muted/30 hover:bg-muted/50 cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((st) => (
                      <SelectItem key={st.id} value={st.id}>
                        <div className="flex items-center gap-2">
                          <span className={cn("size-2 rounded-full shrink-0", st.dotColor)} />
                          <span>{st.title}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {formData.travel_start && (
                  <span className="inline-flex items-center gap-1 font-mono text-2xs">
                    <Calendar className="size-3" />
                    <span>{formData.travel_start}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Cluster de Ações Primárias */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            {/* WhatsApp Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!cleanPhone}
                  className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <MessageSquare className="size-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                  <ChevronDown className="size-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 text-xs">
                {/* design-lint-ignore DL-15 reason:"Primitivo Radix com foco por teclado nativo e indicador visual focus:bg-accent no componente base" expiry:"2027-12-31" */}
                <DropdownMenuItem
                  className="cursor-pointer gap-2 focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => window.open(whatsappUrl, "_blank")}
                >
                  <MessageSquare className="size-4 text-emerald-600" />
                  <span>Abrir no WhatsApp</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* design-lint-ignore DL-15 reason:"Primitivo Radix com foco por teclado nativo e indicador visual focus:bg-accent no componente base" expiry:"2027-12-31" */}
                <DropdownMenuItem
                  className="cursor-pointer gap-2 focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={handleSendFormWhatsApp}
                >
                  <Share2 className="size-4 text-primary" />
                  <span>Enviar Ficha por WA</span>
                </DropdownMenuItem>
                {/* design-lint-ignore DL-15 reason:"Primitivo Radix com foco por teclado nativo e indicador visual focus:bg-accent no componente base" expiry:"2027-12-31" */}
                <DropdownMenuItem
                  className="cursor-pointer gap-2 focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={handleCopyFormLink}
                >
                  <Link2 className="size-4 text-muted-foreground" />
                  <span>Copiar Link da Ficha</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Converter em Cliente */}
            <Button
              type="button"
              variant="outline"
              onClick={() => onPromoteToCustomer(lead.id)}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              title="Promover a Cliente 360°"
            >
              <UserCheck className="size-3.5 text-primary" />
              <span>Converter em Cliente</span>
            </Button>

            {/* CTA Primário Soberano: Nova Cotação */}
            <Button
              type="button"
              onClick={() => {
                onClose();
                onGenerateProposal({
                  id: lead.id,
                  fullName: formData.name,
                  phone: formData.phone,
                  email: formData.email,
                  destination: formData.destination,
                  estimated_value_cents: formData.estimated_value_cents,
                  passenger_count: (formData.pax_adults || 2) + (formData.pax_children || 0),
                  departureDate: formData.travel_start,
                  returnDate: formData.travel_end,
                  adultsCount: formData.pax_adults || 2,
                  childrenCount: formData.pax_children || 0,
                  notes: formData.notes || "",
                });
              }}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-4" />
              <span>Nova Cotação</span>
            </Button>
          </div>
        </div>

        {/* ── BARRA DE FERRAMENTAS RÁPIDAS (PIPEFY PILLS STYLE) ── */}
        <div className="tab-list scroll-area-carousel flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-border/40">
          {[
            { id: "form", label: "Formulário", icon: FileText },
            {
              id: "checklists",
              label: `Checklists (${checklistGroups.reduce((acc, g) => acc + g.items.length, 0)})`,
              icon: CheckSquare,
            },
            { id: "attachments", label: `Anexos (${cardAttachments.length})`, icon: Paperclip },
            { id: "pdf_templates", label: "PDF & Modelos", icon: Printer },
            { id: "presentation", label: "Apresentação IA", icon: Sparkles },
            { id: "proposals", label: `Cotações (${proposals.length})`, icon: CreditCard },
            { id: "meeting", label: "Agenda & Reunião", icon: Calendar },
            { id: "comments", label: `Histórico (${internalComments.length})`, icon: Clock },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "h-11 min-h-11 px-3 rounded-lg text-xs font-medium flex items-center gap-2 shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isActive
                    ? "bg-muted text-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
                onClick={() => {
                  setActiveSection(item.id);
                  if (item.id === "pdf_templates") {
                    setIsPdfModalOpen(true);
                  } else if (item.id === "presentation") {
                    handleGeneratePresentation();
                  } else {
                    const el = document.getElementById(`section-${item.id}`);
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }
                }}
              >
                <Icon className="size-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </SheetHeader>

      {/* ── WORKSPACE CONTÍNUO EM 2 COLUNAS (PIPEFY LIVE CANVAS) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-background [scrollbar-width:thin]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ══════════ COLUNA ESQUERDA (DADOS DO CARD & FLUXO - 65%) ══════════ */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. FORMULÁRIO INICIAL (START FORM) */}
            <div id="section-form" className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  <h3 className="font-bold text-xs uppercase tracking-wide text-foreground">
                    Formulário Inicial · Dados de Entrada
                  </h3>
                </div>
                <span className="text-2xs text-muted-foreground font-mono">
                  Sincronizado com CRM
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Nome do Contato */}
                <div className="space-y-1">
                  <Label className="text-2xs font-semibold text-muted-foreground">Nome Completo</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome do cliente..."
                    className="h-10 text-xs rounded-lg"
                  />
                </div>

                {/* Destino Principal */}
                <div className="space-y-1">
                  <Label className="text-2xs font-semibold text-muted-foreground">Destino Principal</Label>
                  <Input
                    value={formData.destination}
                    onChange={(e) => setFormData((prev) => ({ ...prev, destination: e.target.value }))}
                    placeholder="Ex: Orlando, Maceió, Paris"
                    className="h-10 text-xs rounded-lg"
                  />
                </div>

                {/* Tipo de Viagem */}
                <div className="space-y-1">
                  <Label className="text-2xs font-semibold text-muted-foreground">Tipo de Interesse</Label>
                  <Select
                    value={formData.interest_type}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, interest_type: val }))}
                  >
                    <SelectTrigger className="h-10 text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INTEREST_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Valor Estimado */}
                <div className="space-y-1">
                  <Label className="text-2xs font-semibold text-muted-foreground">Orçamento Estimado</Label>
                  <Input
                    type="number"
                    value={formData.estimated_value_cents ? formData.estimated_value_cents / 100 : ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        estimated_value_cents: Math.round(Number(e.target.value || 0) * 100),
                      }))
                    }
                    placeholder="R$ 0,00"
                    className="h-10 text-xs rounded-lg font-mono"
                  />
                </div>

                {/* Datas Ida / Volta */}
                <div className="space-y-1">
                  <Label className="text-2xs font-semibold text-muted-foreground">Data Prevista de Ida</Label>
                  <Input
                    type="date"
                    value={formData.travel_start}
                    onChange={(e) => setFormData((prev) => ({ ...prev, travel_start: e.target.value }))}
                    className="h-10 text-xs rounded-lg font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-2xs font-semibold text-muted-foreground">Data Prevista de Volta</Label>
                  <Input
                    type="date"
                    value={formData.travel_end}
                    onChange={(e) => setFormData((prev) => ({ ...prev, travel_end: e.target.value }))}
                    className="h-10 text-xs rounded-lg font-mono"
                  />
                </div>

                {/* Pax Adultos / Crianças */}
                <div className="space-y-1">
                  <Label className="text-2xs font-semibold text-muted-foreground">Adultos</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.pax_adults}
                    onChange={(e) => setFormData((prev) => ({ ...prev, pax_adults: Number(e.target.value) || 1 }))}
                    className="h-10 text-xs rounded-lg font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-2xs font-semibold text-muted-foreground">Crianças</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.pax_children}
                    onChange={(e) => setFormData((prev) => ({ ...prev, pax_children: Number(e.target.value) || 0 }))}
                    className="h-10 text-xs rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Observações Gerais */}
              <div className="space-y-1 pt-1">
                <Label className="text-2xs font-semibold text-muted-foreground">Preferências e Roteiro</Label>
                <Textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Expectativas do cliente, hotéis preferidos, perfil de voo..."
                  className="text-xs rounded-lg"
                />
              </div>

              {/* Botão de Salvar Alterações */}
              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveForm}
                  className="h-11 min-h-11 px-5 text-xs font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isSaving ? "Salvando..." : "Salvar Dados do Card"}
                </Button>
              </div>
            </div>

            {/* 2. CHECKLISTS DINÂMICOS (PIPEFY STYLE) */}
            <div id="section-checklists" className="space-y-4 pt-6 border-t border-border/40">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <CheckSquare className="size-4 text-primary" />
                  <h3 className="font-bold text-xs uppercase tracking-wide text-foreground">
                    Checklists Operacionais
                  </h3>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreatingChecklist(true)}
                  className="h-11 min-h-11 sm:h-8 px-3 rounded-lg text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus className="size-3.5" />
                  <span>Criar Checklist</span>
                </Button>
              </div>

              {/* Formulário de Criação de Novo Checklist */}
              {isCreatingChecklist && (
                <div className="p-4 rounded-lg border border-border/60 bg-background space-y-3">
                  <Label className="text-2xs font-semibold text-muted-foreground">Nome do Novo Checklist</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={newChecklistTitle}
                      onChange={(e) => setNewChecklistTitle(e.target.value)}
                      placeholder="Ex: Documentação de Visto, Reserva de Passeios..."
                      className="h-9 text-xs rounded-lg"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateChecklistGroup();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={handleCreateChecklistGroup}
                      className="h-11 min-h-11 sm:h-9 px-4 text-xs font-bold bg-primary text-primary-foreground rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Criar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsCreatingChecklist(false)}
                      className="h-11 min-h-11 sm:h-9 px-3 text-xs rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Grupos de Checklists */}
              <div className="space-y-4">
                {checklistGroups.map((group) => {
                  const doneCount = group.items.filter((it) => it.done).length;
                  const totalCount = group.items.length;
                  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

                  return (
                    <div
                      key={group.id}
                      className="p-4 rounded-xl border border-border/60 bg-card space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-foreground">{group.title}</span>
                          <span className="text-2xs font-mono font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">
                            {doneCount}/{totalCount} ({progressPct}%)
                          </span>
                        </div>
                        {checklistGroups.length > 1 && (
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive cursor-pointer p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            onClick={() => handleDeleteChecklistGroup(group.id)}
                            title="Remover checklist"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Barra de Progresso */}
                      {totalCount > 0 && (
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-transform duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      )}

                      {/* Lista de Itens */}
                      <div className="space-y-2 pt-1">
                        {group.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors group"
                          >
                            <label className="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={item.done}
                                onChange={() => handleToggleChecklistItem(group.id, item.id)}
                                className="size-4 rounded accent-primary cursor-pointer"
                              />
                              <span
                                className={cn(
                                  "text-xs transition-colors truncate",
                                  item.done
                                    ? "line-through text-muted-foreground"
                                    : "text-foreground font-medium"
                                )}
                              >
                                {item.text}
                              </span>
                            </label>
                            <button
                              type="button"
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive cursor-pointer p-1 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              onClick={() => handleDeleteChecklistItem(group.id, item.id)}
                              title="Excluir item"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Input Rápido: Adicionar Item (Enter para confirmar) */}
                      <div className="flex items-center gap-2 pt-1">
                        <Input
                          value={newItemTexts[group.id] || ""}
                          onChange={(e) =>
                            setNewItemTexts((prev) => ({ ...prev, [group.id]: e.target.value }))
                          }
                          placeholder="+ Adicionar um item (Pressione Enter)..."
                          className="h-9 text-xs rounded-lg flex-1 border-border/50"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddChecklistItem(group.id);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddChecklistItem(group.id)}
                          className="h-11 min-h-11 sm:h-9 px-3 text-xs font-semibold rounded-lg cursor-pointer border-border/60 focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Plus className="size-3.5" />
                          <span>Adicionar</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. ANEXOS, VOUCHERS & DOCUMENTOS DOS VIAJANTES */}
            <div id="section-attachments" className="space-y-4 pt-6 border-t border-border/40">
              <div className="flex items-center justify-between pb-2 border-b border-border/40 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Paperclip className="size-4 text-primary" />
                  <h3 className="font-bold text-xs uppercase tracking-wide text-foreground">
                    Anexos & Documentos do Lead ({cardAttachments.length})
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPdfModalOpen(true)}
                    className="h-11 min-h-11 sm:h-8 px-3 rounded-lg text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Printer className="size-3.5 text-primary" />
                    <span>Gerar PDF Modelo</span>
                  </Button>
                </div>
              </div>

              {/* Dropzone Estilizado */}
              <label className="border border-dashed border-border/60 rounded-xl p-6 text-center space-y-2 bg-card hover:bg-muted/20 transition-colors cursor-pointer block">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;
                    const newItems = files.map((f, i) => ({
                      id: `upload-${Date.now()}-${i}`,
                      name: f.name,
                      size: `${Math.round(f.size / 1024)} KB`,
                      url: URL.createObjectURL(f),
                      type: f.type,
                      created_at: new Date().toISOString(),
                    }));
                    const updated = [...newItems, ...cardAttachments];
                    setCardAttachments(updated);
                    toast.success(`${files.length} arquivo(s) anexado(s) ao card!`);
                  }}
                />
                <Upload className="size-6 text-muted-foreground mx-auto" />
                <p className="text-xs font-medium text-foreground">
                  Clique ou arraste arquivos para anexar a este card
                </p>
                <p className="text-2xs text-muted-foreground">
                  Suporta PDFs de passagens, reservas de hotéis, apólices de seguro e comprovantes
                </p>
              </label>

              {/* Lista de Documentos Anexados */}
              {cardAttachments.length > 0 ? (
                <div className="space-y-2">
                  {cardAttachments.map((att: any, idx: number) => (
                    <div
                      key={att.id || idx}
                      className="p-3 rounded-lg border border-border/50 bg-card flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="size-4 text-primary shrink-0" />
                        <span className="font-medium text-foreground truncate">{att.name || `Documento #${idx + 1}`}</span>
                        {att.size && <span className="text-2xs font-mono text-muted-foreground">{att.size}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {att.url && (
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                          >
                            <span>Abrir</span>
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setCardAttachments((prev) => prev.filter((_, i) => i !== idx));
                            toast.success("Documento removido.");
                          }}
                          className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          title="Remover anexo"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-2xs text-center text-muted-foreground py-2">
                  Nenhum documento anexado ainda neste card.
                </p>
              )}
            </div>

            {/* 4. COMENTÁRIOS & HISTÓRICO DE ATIVIDADES (TIMELINE) */}
            <div id="section-comments" className="space-y-4 pt-6 border-t border-border/40">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  <h3 className="font-bold text-xs uppercase tracking-wide text-foreground">
                    Linha do Tempo & Atividades do Card
                  </h3>
                </div>
                <span className="text-2xs text-muted-foreground font-mono">
                  Auditoria Interna
                </span>
              </div>

              {/* Caixa de Novo Comentário */}
              <div className="space-y-2">
                <Textarea
                  rows={2}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escreva uma observação interna ou registro de contato com o passageiro..."
                  className="text-xs rounded-lg"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="h-11 min-h-11 sm:h-8 px-4 text-xs font-bold bg-primary text-primary-foreground rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Send className="size-3 mr-2" />
                    <span>Registrar Nota</span>
                  </Button>
                </div>
              </div>

              {/* Feed de Comentários */}
              <div className="space-y-2 pt-2">
                {internalComments.map((comm) => (
                  <div
                    key={comm.id}
                    className="p-4 rounded-lg border border-border/50 bg-card space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between text-2xs text-muted-foreground">
                      <span className="font-bold text-foreground">{comm.author}</span>
                      <span className="font-mono">{comm.date}</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{comm.text}</p>
                  </div>
                ))}

                {/* Evento Canônico de Criação */}
                <div className="p-3 rounded-lg border border-border/40 bg-muted/30 flex items-center justify-between text-2xs text-muted-foreground font-mono">
                  <span>Card criado no funil</span>
                  <span>{lead.created_at ? new Date(lead.created_at).toLocaleDateString("pt-BR") : "Recentemente"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════ COLUNA DIREITA (GOVERNANÇA DE FASE & SIDECAR - 35%) ══════════ */}
          <div className="lg:col-span-4 space-y-5">
            {/* GOVERNANÇA DA FASE ATUAL */}
            <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
              <span className="text-2xs font-bold uppercase tracking-wide text-muted-foreground block">
                Fase Atual do Funil
              </span>
              <div className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-muted/30">
                <span className={cn("size-2.5 rounded-full shrink-0", currentStage.dotColor)} />
                <span className="font-bold text-xs text-foreground">{currentStage.title}</span>
              </div>

              {/* Responsável da Fase */}
              <div className="space-y-1 pt-1">
                <Label className="text-2xs font-semibold text-muted-foreground">Responsável da Etapa</Label>
                <Select
                  value={formData.assigned_to || "none"}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, assigned_to: val === "none" ? "" : val }))}
                >
                  <SelectTrigger className="h-9 text-xs rounded-lg">
                    <SelectValue placeholder="Selecione consultor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não atribuído</SelectItem>
                    {team.map((m) => (
                      <SelectItem key={m.profile_id || m.id} value={m.profile_id || m.id || ""}>
                        {m.full_name || m.name || "Consultor"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Botão de Avanço Rápido de Fase */}
              {nextStage && (
                <Button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, status: nextStage.id }));
                    onMoveStage(lead.id, nextStage.id);
                    toast.success(`Card avançado para ${nextStage.title}!`);
                  }}
                  className="w-full h-11 min-h-11 rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span>Avançar para {nextStage.title}</span>
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </div>

            {/* APRESENTAÇÃO COMERCIAL IA (SLIDE 16:9) */}
            <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <Sparkles className="size-4 text-primary" />
                <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">
                  Apresentação Comercial IA
                </h4>
              </div>
              <p className="text-2xs text-muted-foreground leading-relaxed">
                Transforma as informações deste lead em uma apresentação visual executiva (clima, câmbio, atrações, visto e valores) para encantar o cliente.
              </p>
              <Button
                type="button"
                onClick={handleGeneratePresentation}
                className="w-full h-11 min-h-11 text-xs font-bold rounded-lg border border-border/60 hover:bg-muted text-foreground cursor-pointer flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-ring"
                variant="outline"
              >
                <Sparkles className="size-3.5 text-primary" />
                <span>Visualizar Apresentação IA</span>
              </Button>
            </div>

            {/* COTAÇÕES & PROPOSTAS CONECTADAS */}
            <div id="section-proposals" className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-border/40">
                <span className="font-bold text-xs uppercase tracking-wide text-foreground">
                  Cotações Vinculadas ({proposals.length})
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onGenerateProposal({
                      id: lead.id,
                      fullName: formData.name,
                      destination: formData.destination,
                      passenger_count: formData.pax_adults + formData.pax_children,
                    });
                  }}
                  className="h-11 min-h-11 sm:h-11 min-h-11 px-3 text-xs text-primary font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  + Nova Cotação
                </Button>
              </div>

              {proposals.length > 0 ? (
                <div className="space-y-2">
                  {proposals.map((prop: any) => (
                    <div
                      key={prop.id}
                      className="p-3 rounded-lg border border-border/50 bg-muted/20 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-foreground block truncate">{prop.title || prop.destination_city}</span>
                        <span className="text-2xs font-mono text-muted-foreground">
                          {formatMoney(prop.pricing?.total_price_cents || 0)}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-3xs font-mono capitalize border-border/60">
                        {prop.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-2xs text-center text-muted-foreground py-2">
                  Nenhuma cotação gerada ainda.
                </p>
              )}
            </div>

            {/* AGENDAMENTO RÁPIDO DE REUNIÃO */}
            <div id="section-meeting" className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <Calendar className="size-4 text-primary" />
                <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">
                  Agendar Reunião / Call
                </h4>
              </div>
              <div className="space-y-2 text-xs">
                <Input
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="Assunto da reunião..."
                  className="h-9 text-xs rounded-lg"
                />
                <Input
                  type="datetime-local"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="h-9 text-xs rounded-lg font-mono"
                />
                <Select
                  value={meetingType}
                  onValueChange={(val: any) => setMeetingType(val)}
                >
                  <SelectTrigger className="h-9 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Ligação / WhatsApp</SelectItem>
                    <SelectItem value="video">Videoconferência (Google Meet)</SelectItem>
                    <SelectItem value="in_person">Presencial na Agência</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={meetingRoomUrl}
                  onChange={(e) => setMeetingRoomUrl(e.target.value)}
                  placeholder="Link da sala (Meet/Zoom)..."
                  className="h-9 text-xs rounded-lg font-mono"
                />
                <Button
                  type="button"
                  disabled={isSchedulingMeeting || !meetingTitle.trim() || !meetingDate}
                  onClick={handleQuickScheduleMeeting}
                  className="w-full h-11 min-h-11 text-xs font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isSchedulingMeeting ? "Agendando..." : "Salvar Agendamento"}
                </Button>
              </div>
            </div>

            {/* CLIENTE 360° VINCULADO */}
            <div id="section-customer360" className="p-4 rounded-xl border border-border/60 bg-card space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-border/40">
                <span className="font-bold text-xs uppercase tracking-wide text-foreground">
                  Cliente Carteira 360°
                </span>
                <Badge variant="outline" className="text-3xs font-mono border-border/60">
                  {customer360Data?.customer ? "Vinculado" : "Pendente"}
                </Badge>
              </div>
              {customer360Data?.customer ? (
                <div className="space-y-2 text-2xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Documento:</span>
                    <strong className="text-foreground font-mono">{customer360Data.customer.document || "CPF não informado"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Score de Crédito:</span>
                    <strong className="text-foreground font-mono">{customer360Data.customer.score || 100} pts</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Viagens Concluídas:</span>
                    <strong className="text-foreground font-mono">{customer360Data.trips?.length || 0}</strong>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2 space-y-2">
                  <p className="text-2xs text-muted-foreground">Lead não promovido para a carteira de clientes ativos.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onPromoteToCustomer(lead.id)}
                    className="h-11 min-h-11 sm:h-11 min-h-11 px-3 text-xs font-semibold rounded-lg border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Promover a Cliente 360°
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL DE VISUALIZAÇÃO DE APRESENTAÇÃO IA (SLIDES 16:9) ── */}
      {presentationModalOpen && generatedPresentation && (
        <div className="fixed inset-0 z-50 bg-overlay flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-card rounded-2xl border border-border/60 shadow-overlay overflow-hidden flex flex-col max-h-overlay-max">
            {/* Header da Apresentação */}
            <div className="p-4 border-b border-border/50 flex items-center justify-between shrink-0 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="size-4 text-primary shrink-0" />
                <span className="font-bold text-sm text-foreground truncate">
                  Apresentação Comercial IA · Slide {activeSlideIndex + 1} de {generatedPresentation.pages.length}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!cleanPhone) {
                      toast.error("Lead sem telefone cadastrado.");
                      return;
                    }
                    const text = `Olá, ${formData.name.split(" ")[0]}! Preparamos uma apresentação exclusiva da sua viagem para ${formData.destination || "seu destino dos sonhos"}.\n\nConfira todos os detalhes de voos, hotéis, clima na época e dicas de câmbio: ${window.location.origin}/workspace/turismo/propostas`;
                    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, "_blank");
                  }}
                  className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer"
                >
                  <MessageSquare className="size-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Enviar por WhatsApp</span>
                </Button>
                <button
                  type="button"
                  className="size-11 min-h-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => setPresentationModalOpen(false)}
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Slide Viewer (16:9 Aspect Ratio) */}
            <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center bg-muted/10">
              {(() => {
                const page = generatedPresentation.pages[activeSlideIndex];
                if (!page) return null;
                return (
                  <div className="w-full max-w-3xl aspect-video rounded-2xl border border-border/60 bg-card p-8 flex flex-col justify-between shadow-2xs">
                    <div className="space-y-2">
                      <span className="text-xs uppercase font-bold tracking-wider text-primary font-mono block">
                        {page.eyebrow}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                        {page.title}
                      </h2>
                      {page.subtitle && (
                        <p className="text-xs sm:text-sm text-muted-foreground">{page.subtitle}</p>
                      )}
                    </div>

                    <div className="my-auto py-4">
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {page.humanNarrative}
                      </p>

                      {page.cards && page.cards.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                          {page.cards.map((c, i) => (
                            <div key={i} className="p-3 rounded-lg border border-border/50 bg-muted/20 text-xs">
                              <span className="font-bold text-foreground block">{c.label}</span>
                              <span className="text-2xs text-muted-foreground">{c.practicalExplanation}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-border/30 flex items-center justify-between text-2xs text-muted-foreground">
                      <span>Excelência Tour · Curadoria Especializada</span>
                      <span className="font-mono">Página {page.pageNumber}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Navegador de Slides */}
            <div className="p-4 border-t border-border/50 flex items-center justify-between shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={activeSlideIndex === 0}
                onClick={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
                className="h-11 min-h-11 px-4 text-xs font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronLeft className="size-4" />
                <span>Anterior</span>
              </Button>

              <div className="flex items-center gap-2">
                {generatedPresentation.pages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Ir para slide ${i + 1}`}
                    className="h-11 min-h-11 px-1 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                    onClick={() => setActiveSlideIndex(i)}
                  >
                    <span
                      className={cn(
                        "size-2.5 rounded-full transition-colors block",
                        i === activeSlideIndex ? "bg-primary w-6" : "bg-muted-foreground/30 hover:bg-muted-foreground/60"
                      )}
                    />
                  </button>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={activeSlideIndex === generatedPresentation.pages.length - 1}
                onClick={() => setActiveSlideIndex((prev) => Math.min(generatedPresentation.pages.length - 1, prev + 1))}
                className="h-11 min-h-11 px-4 text-xs font-semibold gap-2"
              >
                <span>Próximo</span>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE MODELOS DE PDF & CAMPOS DINÂMICOS (PIPEFY BENCHMARK) ── */}
      <Dialog open={isPdfModalOpen} onOpenChange={setIsPdfModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-screen flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 sm:p-6 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-primary/10 text-primary">
                <Printer className="size-5" />
              </span>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Modelos de PDF & Documentos Dinâmicos
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Selecione um modelo para preenchimento automático instantâneo com os dados deste card do funil.
                </DialogDescription>
              </div>
            </div>

            {/* Abas do Modal */}
            <div className="flex items-center gap-2 pt-3 border-t border-border/30 mt-3">
              <button
                type="button"
                onClick={() => setActivePdfTab("templates")}
                className={cn(
                  "h-11 min-h-11 sm:h-9 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  activePdfTab === "templates"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                Modelos Disponíveis ({PDF_TEMPLATES.length})
              </button>
              <button
                type="button"
                onClick={() => setActivePdfTab("fields")}
                className={cn(
                  "h-11 min-h-11 sm:h-9 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  activePdfTab === "fields"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                Campos Dinâmicos ({dynamicMergeFields.length})
              </button>
              <button
                type="button"
                onClick={() => setActivePdfTab("preview")}
                className={cn(
                  "h-11 min-h-11 sm:h-9 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  activePdfTab === "preview"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                Prévia do Documento
              </button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 [scrollbar-width:thin]">
            {/* ABA 1: SELETOR DE MODELOS */}
            {activePdfTab === "templates" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PDF_TEMPLATES.map((tmpl) => {
                  const isSelected = selectedPdfTemplateKey === tmpl.key;
                  return (
                    <div
                      key={tmpl.key}
                      onClick={() => setSelectedPdfTemplateKey(tmpl.key)}
                      className={cn(
                        "p-4 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between space-y-3",
                        isSelected
                          ? "border-primary bg-muted/40 shadow-2xs"
                          : "border-border/60 bg-card hover:border-border hover:bg-muted/20"
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="text-3xs font-mono border-border/60">
                            {tmpl.category}
                          </Badge>
                          <span className="text-3xs font-mono text-muted-foreground">
                            {tmpl.estimatedPages}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-foreground">
                          {tmpl.title}
                        </h4>
                        <p className="text-2xs text-muted-foreground leading-relaxed">
                          {tmpl.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-border/30 flex items-center justify-between text-2xs">
                        <span className="text-muted-foreground">Autopreenchido</span>
                        <div className="flex items-center gap-2 text-primary font-bold">
                          <FileCheck className="size-3.5" />
                          <span>{isSelected ? "Selecionado" : "Escolher"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ABA 2: EXPLORADOR DE CAMPOS DINÂMICOS (PIPEFY BENCHMARK) */}
            {activePdfTab === "fields" && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border/50 bg-muted/20 text-xs text-muted-foreground">
                  Estes campos são extraídos automaticamente do card e das respostas do formulário. Clique para copiar a tag e usar em minutas ou templates personalizados.
                </div>

                <div className="space-y-2">
                  {dynamicMergeFields.map((field) => (
                    <div
                      key={field.tag}
                      className="p-3 rounded-lg border border-border/50 bg-card flex items-center justify-between text-xs gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="text-2xs font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                            {field.tag}
                          </code>
                          <span className="font-semibold text-foreground text-xs">{field.label}</span>
                        </div>
                        <span className="text-2xs text-muted-foreground block truncate mt-1">
                          Valor atual: <strong className="text-foreground">{field.value}</strong>
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await navigator.clipboard.writeText(field.tag);
                          toast.success(`Tag ${field.tag} copiada!`);
                        }}
                        className="h-11 min-h-11 sm:h-8 px-3 text-2xs font-semibold gap-2 cursor-pointer shrink-0"
                      >
                        <Copy className="size-3" />
                        <span>Copiar Tag</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ABA 3: PRÉVIA DO DOCUMENTO SIMULADA */}
            {activePdfTab === "preview" && (
              <div className="p-6 rounded-xl border border-border/60 bg-card text-foreground space-y-4 max-w-xl mx-auto shadow-2xs font-sans text-xs">
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <div>
                    <h3 className="font-bold text-sm tracking-tight">
                      {PDF_TEMPLATES.find((t) => t.key === selectedPdfTemplateKey)?.title || "Documento Oficial"}
                    </h3>
                    <span className="text-2xs text-muted-foreground">
                      Waesy Gestão Turística · Emissão: {new Date().toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-2xs font-mono text-primary border-primary/30">
                    Minuta Dinâmica
                  </Badge>
                </div>

                <div className="space-y-3 leading-relaxed text-muted-foreground text-xs">
                  <p>
                    <strong className="text-foreground">CONTRATANTE:</strong> {formData.name || "Cliente não informado"}
                    {formData.phone ? ` · Telefone: ${formData.phone}` : ""}
                    {formData.email ? ` · E-mail: ${formData.email}` : ""}
                  </p>
                  <p>
                    <strong className="text-foreground">DESTINO & PERÍODO:</strong> {formData.destination || "A definir"}
                    {formData.travel_start ? ` · Ida: ${formData.travel_start}` : ""}
                    {formData.travel_end ? ` · Retorno: ${formData.travel_end}` : ""}
                  </p>
                  <p>
                    <strong className="text-foreground">COMPOSIÇÃO DO GRUPO:</strong> {formData.pax_adults} Adulto(s)
                    {formData.pax_children > 0 ? ` e ${formData.pax_children} Criança(s)` : ""}.
                  </p>
                  <p>
                    <strong className="text-foreground">VALOR ESTIMADO / PACOTE:</strong>{" "}
                    <span className="font-bold text-foreground font-mono">
                      {formatMoney(formData.estimated_value_cents || 0)}
                    </span>
                  </p>
                  {formData.notes && (
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-2xs">
                      <strong className="text-foreground block mb-1">Roteiro e Preferências:</strong>
                      {formData.notes}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border/40 flex items-center justify-between text-2xs text-muted-foreground">
                  <span>Assinatura Digital Auditada via Waesy</span>
                  <span className="font-mono">Página 1 de 2</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 sm:p-6 border-t border-border/40 bg-muted/10 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPdfModalOpen(false)}
              className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer"
            >
              Fechar
            </Button>
            <Button
              type="button"
              disabled={isGeneratingPdf}
              onClick={() => handleGenerateAndAttachPdf(selectedPdfTemplateKey)}
              className="h-11 min-h-11 px-5 text-xs font-bold gap-2 bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Download className="size-3.5" />
              <span>{isGeneratingPdf ? "Gerando PDF..." : "Gerar e Vincular ao Card (1-Clique)"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
