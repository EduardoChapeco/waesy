import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Sparkles,
  Palette,
  Building2,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Plus,
  Trash2,
  RefreshCw,
  ArrowUpRight,
  Save,
  Eye,
  SlidersHorizontal,
  ShieldCheck,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StudioFrame } from "@/components/tourism/studio/studio-frame";
import { ProposalCanvasRenderer } from "@/components/tourism/studio/proposal-canvas-renderer";
import type { ProposalCanvasFormat } from "@/services/travel-proposal.functions";
import { StudioSidebar } from "@/components/tourism/studio/StudioSidebar";
import { ContractMarkdownRenderer } from "@/components/contracts/contract-markdown-renderer";
import { BudgetCorporateClean } from "@/components/documents/templates/BudgetCorporateClean";
import { ProposalEditorialAgency } from "@/components/documents/templates/ProposalEditorialAgency";
import { TemplateVoucherA4 } from "@/components/tourism/vouchers/templates/template-voucher-a4";
import { TemplateVoucherStory } from "@/components/tourism/vouchers/templates/template-voucher-story";
import { DocumentExportMenu } from "@/components/documents/DocumentExportMenu";
import { exportStudioDocument } from "@/lib/documents/document-export";
import {
  BRAND_COLOR_PRESETS,
  CANVAS_BG_PRESETS,
  FONT_PRESET_OPTIONS,
  resolveProposalCanvasTheme,
  type ProposalFontPresetId,
} from "@/lib/tourism/proposal-theme-palettes";
import { ADVANCED_CONTRACT_TEMPLATES } from "@/lib/data/advanced-contract-templates";
import { generateQrCodeDataUri } from "@/lib/qr-code";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { StatefulNavIcon } from "@/components/ui/stateful-nav-icon";
import type { TravelVoucherDTO } from "@/types/travel-vouchers";
import {
  DOCUMENT_MERGE_TAGS,
  DOCUMENT_STUDIO_ARCHETYPE_META,
  DOCUMENT_STUDIO_TEMPLATES,
  buildCommercialDocumentDataAdapter,
  buildFormattedPeriod,
  buildInitialEditableSlides,
  buildTravelProposalDtoFromStudio,
  compileStudioDocumentMarkdown,
  interpolateDocumentMergeTags,
  type DocumentStudioArchetype,
  type DocumentStudioCmsConfig,
  type DocumentStudioFormState,
  type EditablePresentationSlide,
  type TenantDocumentIdentity,
} from "@/lib/documents/document-studio-catalog";

export interface UniversalDocumentStudioProps {
  open: boolean;
  onClose: () => void;
  initialArchetype?: DocumentStudioArchetype;
  initialTemplateId?: string;
  initialDocumentTitle?: string;
  initialMarkdownBody?: string;
  initialFormState: Partial<DocumentStudioFormState>;
  tenant: TenantDocumentIdentity;
  editingAttachmentId?: string | null;
  onSaveDocument?: (payload: {
    id?: string;
    title: string;
    templateId: string;
    archetype: DocumentStudioArchetype;
    content: string;
    cmsConfig: DocumentStudioCmsConfig;
    formState: DocumentStudioFormState;
  }) => Promise<void> | void;
  onPromoteToProposalStudio?: (payload: {
    formState: DocumentStudioFormState;
    templateId: string;
  }) => Promise<void> | void;
  onIssueOfficialContract?: (payload: {
    templateId: string;
    title: string;
    summary: string;
    totalCents: number;
    paymentConditions: string;
    customVariables: Record<string, string>;
  }) => Promise<void> | void;
  onIssueOfficialVoucher?: (payload: {
    formState: DocumentStudioFormState;
    format: ProposalCanvasFormat;
  }) => Promise<void> | void;
  onSendWhatsapp?: (messageText: string, docTitle: string) => void;
}

const FORMAT_OPTIONS: Array<{ id: ProposalCanvasFormat; label: string }> = [
  { id: "a4-portrait", label: "A4 Retrato" },
  { id: "a4-landscape", label: "A4 Paisagem" },
  { id: "presentation-169", label: "Slides 16:9" },
  { id: "story-916", label: "Story 9:16" },
  { id: "letter-portrait", label: "Carta" },
];

function createDefaultFormState(
  partial: Partial<DocumentStudioFormState>,
  templateId: string,
  tenant: TenantDocumentIdentity,
): DocumentStudioFormState {
  const base: DocumentStudioFormState = {
    title: partial.title || "Documento Oficial",
    subtitle: partial.subtitle || "",
    protocolCode: partial.protocolCode || "ATENDIMENTO",
    issueDate: partial.issueDate || new Date().toLocaleDateString("pt-BR"),
    validUntilDate: partial.validUntilDate || "7 dias úteis",
    clientName: partial.clientName || "",
    clientDocument: partial.clientDocument || "",
    clientEmail: partial.clientEmail || "",
    clientPhone: partial.clientPhone || "",
    clientAddress: partial.clientAddress || "",
    clientCompany: partial.clientCompany || "",
    destination: partial.destination || "",
    startDate: partial.startDate || "",
    endDate: partial.endDate || "",
    adultsCount: Math.max(1, partial.adultsCount ?? 1),
    childrenCount: Math.max(0, partial.childrenCount ?? 0),
    totalCents: partial.totalCents ?? 0,
    entryCents: partial.entryCents ?? 0,
    installmentsCount: Math.max(1, partial.installmentsCount ?? 1),
    paymentMethod: partial.paymentMethod || "PIX / Cartão de Crédito",
    paymentConditions: partial.paymentConditions || "",
    flightSummary: partial.flightSummary || "",
    hotelSummary: partial.hotelSummary || "",
    includedItemsText: partial.includedItemsText || "",
    excludedItemsText: partial.excludedItemsText || "",
    itineraryNotes: partial.itineraryNotes || "",
    healthAllergies: partial.healthAllergies || "",
    healthMedications: partial.healthMedications || "",
    dietaryRestrictions: partial.dietaryRestrictions || "",
    accessibilityNeeds: partial.accessibilityNeeds || "",
    emergencyContactName: partial.emergencyContactName || "",
    emergencyContactPhone: partial.emergencyContactPhone || "",
    passengers: partial.passengers ? [...partial.passengers] : [],
    financialRows: partial.financialRows ? [...partial.financialRows] : [],
    checklists: partial.checklists ? [...partial.checklists] : [],
    extraCustomFields: partial.extraCustomFields ? [...partial.extraCustomFields] : [],
    markdownBody: partial.markdownBody || "",
    contractTemplateId:
      partial.contractTemplateId || ADVANCED_CONTRACT_TEMPLATES[0]?.id || "",
    contractVariables: partial.contractVariables ? { ...partial.contractVariables } : {},
  };

  if (!base.markdownBody.trim()) {
    base.markdownBody = compileStudioDocumentMarkdown(templateId, base, tenant);
  }
  return base;
}

export function UniversalDocumentStudio({
  open,
  onClose,
  initialArchetype = "dossier_form_doc",
  initialTemplateId = "anamnese_embarque",
  initialDocumentTitle,
  initialMarkdownBody,
  initialFormState,
  tenant: initialTenant,
  editingAttachmentId,
  onSaveDocument,
  onPromoteToProposalStudio,
  onIssueOfficialContract,
  onIssueOfficialVoucher,
  onSendWhatsapp,
}: UniversalDocumentStudioProps) {
  const [archetype, setArchetype] = useState<DocumentStudioArchetype>(initialArchetype);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplateId);
  const [tenant, setTenant] = useState<TenantDocumentIdentity>(initialTenant);
  const [formState, setFormState] = useState<DocumentStudioFormState>(() =>
    createDefaultFormState(
      {
        ...initialFormState,
        ...(initialDocumentTitle ? { title: initialDocumentTitle } : {}),
        ...(initialMarkdownBody ? { markdownBody: initialMarkdownBody } : {}),
      },
      initialTemplateId,
      initialTenant,
    ),
  );
  const [cmsConfig, setCmsConfig] = useState<DocumentStudioCmsConfig>(() => ({
    format:
      DOCUMENT_STUDIO_TEMPLATES.find((t) => t.id === initialTemplateId)?.defaultFormat ||
      "a4-portrait",
    visualThemeId: "executivo-b2b",
    canvasBg: CANVAS_BG_PRESETS[0]?.value || "",
    brandColor: initialTenant.brandColor || BRAND_COLOR_PRESETS[0]?.value || "",
    fontPreset: "modern",
    commercialLayoutVariant: "proposal_editorial_agency",
    voucherLayoutVariant: "a4_official",
    showHeaderMasthead: true,
    showAgencyLogo: true,
    showClientCard: true,
    showSummaryStrip: true,
    showItemsOrFinancialTable: true,
    showPassengersOrChecklist: true,
    showHealthOrComplianceBlock: initialArchetype === "dossier_form_doc",
    showVerificationQr: true,
    showSignatureBlock: true,
    customFooterNote: "",
  }));

  const [sidebarTab, setSidebarTab] = useState<"fields" | "visual" | "identity">("fields");
  const [mobilePane, setMobilePane] = useState<"editor" | "preview">("preview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [zoomScale, setZoomScale] = useState<number | null>(null);
  const [autoFitScale, setAutoFitScale] = useState<number>(0.85);
  const [isSaving, setIsSaving] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [editableSlides, setEditableSlides] = useState<EditablePresentationSlide[]>(() =>
    buildInitialEditableSlides(
      initialTemplateId,
      createDefaultFormState(
        {
          ...initialFormState,
          ...(initialDocumentTitle ? { title: initialDocumentTitle } : {}),
        },
        initialTemplateId,
        initialTenant,
      ),
      initialTenant,
    ),
  );
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [viewAllSlidesInCanvas, setViewAllSlidesInCanvas] = useState(false);
  const [agencyLogoFailed, setAgencyLogoFailed] = useState(false);
  const markdownRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setAgencyLogoFailed(false);
  }, [tenant.logoUrl]);

  useEffect(() => {
    if (!open) return;
    const matchedTemplate =
      DOCUMENT_STUDIO_TEMPLATES.find((t) => t.id === initialTemplateId) ||
      DOCUMENT_STUDIO_TEMPLATES.find((t) => t.archetype === initialArchetype) ||
      DOCUMENT_STUDIO_TEMPLATES[0];

    const effectiveTemplateId = matchedTemplate?.id || initialTemplateId;
    const effectiveArchetype = matchedTemplate?.archetype || initialArchetype;
    const nextForm = createDefaultFormState(
      {
        ...initialFormState,
        title: initialDocumentTitle || matchedTemplate?.title || initialFormState.title,
        subtitle: initialFormState.subtitle || matchedTemplate?.description || "",
        ...(initialMarkdownBody ? { markdownBody: initialMarkdownBody } : {}),
      },
      effectiveTemplateId,
      initialTenant,
    );

    setArchetype(effectiveArchetype);
    setSelectedTemplateId(effectiveTemplateId);
    setTenant(initialTenant);
    setFormState(nextForm);
    setEditableSlides(buildInitialEditableSlides(effectiveTemplateId, nextForm, initialTenant));
    setActiveSlideIdx(0);
    setViewAllSlidesInCanvas(false);
    setCmsConfig((prev) => ({
      ...prev,
      format: matchedTemplate?.defaultFormat || "a4-portrait",
      visualThemeId:
        matchedTemplate?.presentationVariant === "dark_luxury_deck"
          ? "dark-premium"
          : matchedTemplate?.proposalTemplateTheme || prev.visualThemeId,
      commercialLayoutVariant:
        matchedTemplate?.commercialVariant || prev.commercialLayoutVariant,
      voucherLayoutVariant: matchedTemplate?.voucherVariant || prev.voucherLayoutVariant,
      showHealthOrComplianceBlock: effectiveArchetype === "dossier_form_doc",
    }));
  }, [open, initialArchetype, initialTemplateId, initialDocumentTitle, initialMarkdownBody]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const templatesForArchetype = useMemo(
    () => DOCUMENT_STUDIO_TEMPLATES.filter((t) => t.archetype === archetype),
    [archetype],
  );

  const resolvedTheme = useMemo(
    () =>
      resolveProposalCanvasTheme(
        {
          templateId: cmsConfig.visualThemeId,
          custom_fields: {
            canvas_bg_color: cmsConfig.canvasBg,
            canvas_brand_color: cmsConfig.brandColor,
            canvas_font_preset: cmsConfig.fontPreset,
          },
        },
        {
          name: tenant.companyName,
          brand_color: tenant.brandColor,
        },
      ),
    [cmsConfig.visualThemeId, cmsConfig.canvasBg, cmsConfig.brandColor, cmsConfig.fontPreset, tenant],
  );

  const interpolatedMarkdown = useMemo(
    () => interpolateDocumentMergeTags(formState.markdownBody, formState, tenant),
    [formState, tenant],
  );

  const qrCodeUri = useMemo(() => {
    const code = `${tenant.slug || "waesy"}-${formState.protocolCode || "DOC"}-${selectedTemplateId}`;
    return generateQrCodeDataUri(code, { border: 1 });
  }, [tenant.slug, formState.protocolCode, selectedTemplateId]);

  const commercialDocumentData = useMemo(
    () => buildCommercialDocumentDataAdapter(formState, tenant),
    [formState, tenant],
  );

  const voucherDraft = useMemo<Partial<TravelVoucherDTO>>(
    () => ({
      id: formState.protocolCode || "VOUCHER",
      voucher_number: formState.protocolCode ? `VCH-${formState.protocolCode}` : "VCH-OFICIAL",
      voucher_type: "package",
      title: formState.title || `Voucher — ${formState.destination || "Embarque"}`,
      passenger_name: formState.clientName || "Passageiro Titular",
      passenger_document: formState.clientDocument || "Documento pendente",
      status: "issued",
      flight_data: {
        origin: "Origem conforme bilhete",
        destination: formState.destination || "Destino",
        airline: formState.flightSummary || "Companhia / Transporte",
        departureTime: buildFormattedPeriod(formState.startDate, formState.endDate),
      },
      hotel_data: {
        hotelName: formState.hotelSummary || "Hospedagem / Roteiro Confirmado",
        checkInDate: formState.startDate,
        checkOutDate: formState.endDate,
        confirmationCode: formState.protocolCode,
      },
      transfer_data: {
        pickupLocation: formState.destination,
        dropoffLocation: formState.hotelSummary || formState.destination,
      },
    }),
    [formState],
  );

  const activeContractDef = useMemo(() => {
    const rawId = selectedTemplateId.startsWith("contract_")
      ? selectedTemplateId.replace(/^contract_/, "")
      : formState.contractTemplateId;
    return ADVANCED_CONTRACT_TEMPLATES.find((t) => t.id === rawId) || null;
  }, [selectedTemplateId, formState.contractTemplateId]);

  if (!open) return null;

  const activeTemplateMeta =
    DOCUMENT_STUDIO_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
    templatesForArchetype[0];

  const isCanvasPresentation =
    archetype === "presentation_deck" &&
    (activeTemplateMeta?.presentationVariant === "bento_canvas" ||
      activeTemplateMeta?.presentationVariant === "landscape_canvas");

  const studioProposalDto = useMemo(
    () => buildTravelProposalDtoFromStudio(formState, tenant, cmsConfig, activeTemplateMeta),
    [formState, tenant, cmsConfig, activeTemplateMeta],
  );

  const presentationDeckMarkdown = useMemo(() => {
    return editableSlides
      .map((slide) => {
        const lines = [
          `# ${slide.pageNumber}. ${slide.title}`,
          slide.subtitle ? `**${slide.subtitle}**` : "",
          slide.humanNarrative || "",
        ];
        if (slide.cards.length > 0) {
          lines.push(
            "## Destaques\n| Item | Valor | Detalhamento |\n| :--- | :--- | :--- |\n" +
              slide.cards
                .map((c) => `| ${c.label} | ${c.value} | ${c.practicalExplanation} |`)
                .join("\n"),
          );
        }
        return lines.filter(Boolean).join("\n\n");
      })
      .join("\n\n---\n\n");
  }, [editableSlides]);

  const currentEditableSlide = editableSlides[activeSlideIdx] || editableSlides[0];

  const handleUpdateActiveSlide = (patch: Partial<EditablePresentationSlide>) => {
    setEditableSlides((prev) =>
      prev.map((sl, idx) => (idx === activeSlideIdx ? { ...sl, ...patch } : sl)),
    );
  };

  const handleAddPresentationSlide = () => {
    const nextNum = editableSlides.length + 1;
    const newSlide: EditablePresentationSlide = {
      id: `slide-${Date.now()}`,
      pageNumber: nextNum,
      moduleKey: "custom_slide",
      eyebrow: `${tenant.companyName} • Slide Personalizado`,
      title: `Novo Tópico #${nextNum} — ${formState.destination || "Apresentação"}`,
      subtitle: "Subtítulo editável em tempo real",
      humanNarrative:
        "Descreva aqui diferenciais exclusivos, roteiro detalhado, condições especiais ou garantias da sua empresa.",
      highlightMetric: formState.totalCents > 0 ? formatMoney(formState.totalCents) : undefined,
      cards: [
        {
          label: "Diferencial 01",
          value: "Curadoria Personalizada",
          practicalExplanation: `Planejamento completo por ${tenant.companyName}.`,
          badge: "Exclusivo",
        },
        {
          label: "Diferencial 02",
          value: "Suporte Dedicado",
          practicalExplanation: tenant.phone || tenant.email || "Atendimento prioritário.",
          badge: "VIP",
        },
      ],
    };
    setEditableSlides((prev) => [...prev, newSlide]);
    setActiveSlideIdx(editableSlides.length);
    toast.success("Novo slide adicionado à apresentação!");
  };

  const handleDeletePresentationSlide = (idxToRemove: number) => {
    if (editableSlides.length <= 1) {
      toast.error("A apresentação precisa ter pelo menos 1 slide.");
      return;
    }
    setEditableSlides((prev) =>
      prev
        .filter((_, idx) => idx !== idxToRemove)
        .map((sl, idx) => ({ ...sl, pageNumber: idx + 1 })),
    );
    setActiveSlideIdx((prev) => Math.max(0, Math.min(prev, editableSlides.length - 2)));
    toast.success("Slide removido.");
  };

  const handleSelectArchetype = (nextArchetype: DocumentStudioArchetype) => {
    setArchetype(nextArchetype);
    const firstTpl = DOCUMENT_STUDIO_TEMPLATES.find((t) => t.archetype === nextArchetype);
    if (firstTpl) {
      setSelectedTemplateId(firstTpl.id);
      setFormState((prev) => {
        const nextForm: DocumentStudioFormState = {
          ...prev,
          title: firstTpl.title,
          subtitle: firstTpl.description,
          contractTemplateId: firstTpl.contractTemplateId || prev.contractTemplateId,
        };
        if (nextArchetype === "presentation_deck") {
          setEditableSlides(buildInitialEditableSlides(firstTpl.id, nextForm, tenant));
          setActiveSlideIdx(0);
        }
        return {
          ...nextForm,
          markdownBody: compileStudioDocumentMarkdown(firstTpl.id, nextForm, tenant),
        };
      });
      setCmsConfig((prev) => ({
        ...prev,
        format: firstTpl.defaultFormat,
        visualThemeId:
          firstTpl.presentationVariant === "dark_luxury_deck"
            ? "dark-premium"
            : firstTpl.proposalTemplateTheme || prev.visualThemeId,
        commercialLayoutVariant: firstTpl.commercialVariant || prev.commercialLayoutVariant,
        voucherLayoutVariant: firstTpl.voucherVariant || prev.voucherLayoutVariant,
        showHealthOrComplianceBlock: nextArchetype === "dossier_form_doc",
      }));
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    const meta = DOCUMENT_STUDIO_TEMPLATES.find((t) => t.id === templateId);
    if (!meta) return;
    setSelectedTemplateId(meta.id);
    setArchetype(meta.archetype);
    setFormState((prev) => {
      const nextForm: DocumentStudioFormState = {
        ...prev,
        title: meta.title,
        subtitle: meta.description,
        contractTemplateId: meta.contractTemplateId || prev.contractTemplateId,
      };
      if (meta.archetype === "presentation_deck") {
        setEditableSlides(buildInitialEditableSlides(meta.id, nextForm, tenant));
        setActiveSlideIdx(0);
      }
      return {
        ...nextForm,
        markdownBody: compileStudioDocumentMarkdown(meta.id, nextForm, tenant),
      };
    });
    setCmsConfig((prev) => ({
      ...prev,
      format: meta.defaultFormat,
      visualThemeId:
        meta.presentationVariant === "dark_luxury_deck"
          ? "dark-premium"
          : meta.proposalTemplateTheme || prev.visualThemeId,
      commercialLayoutVariant: meta.commercialVariant || prev.commercialLayoutVariant,
      voucherLayoutVariant: meta.voucherVariant || prev.voucherLayoutVariant,
      showHealthOrComplianceBlock: meta.archetype === "dossier_form_doc",
    }));
  };

  const handleRecompileFromFields = () => {
    setFormState((prev) => {
      const nextMarkdown = compileStudioDocumentMarkdown(selectedTemplateId, prev, tenant);
      if (archetype === "presentation_deck") {
        setEditableSlides(buildInitialEditableSlides(selectedTemplateId, prev, tenant));
        setActiveSlideIdx(0);
      }
      return {
        ...prev,
        markdownBody: nextMarkdown,
      };
    });
    toast.success(
      archetype === "presentation_deck"
        ? "Slides e lâminas sincronizados com os dados da viagem e Brand Kit!"
        : "Texto do documento sincronizado com os campos estruturados.",
    );
  };

  const handleInsertMergeTag = (token: string) => {
    const el = markdownRef.current;
    if (!el) {
      setFormState((prev) => ({ ...prev, markdownBody: `${prev.markdownBody}\n${token}` }));
      return;
    }
    const start = el.selectionStart ?? formState.markdownBody.length;
    const end = el.selectionEnd ?? formState.markdownBody.length;
    const updated =
      formState.markdownBody.slice(0, start) + token + formState.markdownBody.slice(end);
    setFormState((prev) => ({ ...prev, markdownBody: updated }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const handleSave = async () => {
    if (!onSaveDocument || isSaving) return;
    setIsSaving(true);
    try {
      await onSaveDocument({
        id: editingAttachmentId || undefined,
        title: formState.title,
        templateId: selectedTemplateId,
        archetype,
        content: formState.markdownBody,
        cmsConfig,
        formState,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleContextualPromotion = async () => {
    if (isPromoting) return;
    setIsPromoting(true);
    try {
      if (archetype === "proposal_quote" && onPromoteToProposalStudio) {
        await onPromoteToProposalStudio({ formState, templateId: selectedTemplateId });
      } else if (archetype === "contract_legal" && onIssueOfficialContract) {
        await onIssueOfficialContract({
          templateId: formState.contractTemplateId,
          title: formState.title,
          summary: interpolatedMarkdown,
          totalCents: formState.totalCents,
          paymentConditions: formState.paymentConditions,
          customVariables: formState.contractVariables,
        });
      } else if (archetype === "voucher_boarding" && onIssueOfficialVoucher) {
        await onIssueOfficialVoucher({ formState, format: cmsConfig.format });
      }
    } finally {
      setIsPromoting(false);
    }
  };

  const currentCanvasId = "universal-doc-studio-canvas";

  const activeScalePercent = Math.round((zoomScale ?? autoFitScale) * 100);
  const formattedPeriod = buildFormattedPeriod(formState.startDate, formState.endDate);
  const totalReaisInput = formState.totalCents > 0 ? (formState.totalCents / 100).toFixed(2) : "";

  const handleQuickDownloadPdf = async () => {
    await exportStudioDocument("pdf", {
      filenameBase: `${formState.title}-${formState.clientName || formState.protocolCode}`,
      title: formState.title,
      subtitle: `${formState.destination || ""} · ${formattedPeriod}`,
      agencyName: tenant.companyName,
      agencyDocument: tenant.documentNumber,
      agencyContact: [tenant.phone, tenant.email].filter(Boolean).join(" | "),
      agencyLogoUrl: tenant.logoUrl,
      elementId: currentCanvasId,
      deckSelector:
        archetype === "presentation_deck" && !isCanvasPresentation && viewAllSlidesInCanvas
          ? ".presentation-page"
          : undefined,
      markdownContent:
        archetype === "presentation_deck" ? presentationDeckMarkdown : interpolatedMarkdown,
      pageFormat: cmsConfig.format,
      theme: {
        templateId: cmsConfig.visualThemeId,
        canvasBg: cmsConfig.canvasBg,
        brandColor: cmsConfig.brandColor,
      },
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Editor e Visualizador Unificado: ${formState.title}`}
      className="fixed inset-0 z-50 flex flex-col bg-background text-foreground pt-safe-modal"
    >
      {/* Top Studio Header Bar */}
      <header className="shrink-0 border-b border-border bg-card px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              aria-label="Fechar Studio de Documentos"
              className="h-11 min-h-11 px-3 gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setSidebarCollapsed((v) => !v)}
              aria-label={sidebarCollapsed ? "Abrir painel CMS" : "Recolher painel CMS"}
              className="hidden lg:inline-flex h-11 min-h-11 px-3 gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </Button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-bold text-foreground">
                  {formState.title || "Documento Oficial"}
                </span>
                <Badge variant="outline" className="hidden md:inline-flex shrink-0 text-xs">
                  {tenant.companyName}
                </Badge>
              </div>
              <p className="hidden xl:block truncate text-xs text-muted-foreground">
                {activeTemplateMeta?.description || "Editor contextual em tempo real"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden xl:flex items-center gap-1 rounded-md border border-border bg-muted/40 p-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setZoomScale((prev) => Math.max(0.45, (prev ?? autoFitScale) - 0.1))}
                aria-label="Reduzir zoom"
                className="h-11 min-h-11 px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ZoomOut className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setZoomScale(null)}
                className="h-11 min-h-11 px-2 text-xs font-mono font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {activeScalePercent}%
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setZoomScale((prev) => Math.min(1.4, (prev ?? autoFitScale) + 0.1))}
                aria-label="Aumentar zoom"
                className="h-11 min-h-11 px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ZoomIn className="size-4" />
              </Button>
            </div>

            {(archetype === "proposal_quote" || archetype === "presentation_deck") &&
              onPromoteToProposalStudio && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPromoting}
                  onClick={handleContextualPromotion}
                  className="h-11 min-h-11 gap-2 px-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isPromoting ? (
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <ArrowUpRight className="size-4" />
                  )}
                  <span className="hidden md:inline">Abrir Studio Propostas</span>
                </Button>
              )}

            {archetype === "contract_legal" && onIssueOfficialContract && (
              <Button
                type="button"
                variant="outline"
                disabled={isPromoting}
                onClick={handleContextualPromotion}
                className="h-11 min-h-11 gap-2 px-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isPromoting ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <ShieldCheck className="size-4" />
                )}
                <span className="hidden md:inline">Emitir p/ Assinatura</span>
              </Button>
            )}

            {archetype === "voucher_boarding" && onIssueOfficialVoucher && (
              <Button
                type="button"
                variant="outline"
                disabled={isPromoting}
                onClick={handleContextualPromotion}
                className="h-11 min-h-11 gap-2 px-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isPromoting ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <ArrowUpRight className="size-4" />
                )}
                <span className="hidden md:inline">Salvar Voucher Oficial</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={handleQuickDownloadPdf}
              className="h-11 min-h-11 gap-2 px-3 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Download className="size-4 text-primary" />
              <span>Baixar PDF</span>
            </Button>

            <DocumentExportMenu
              filenameBase={`${formState.title}-${formState.clientName || formState.protocolCode}`}
              title={formState.title}
              subtitle={`${formState.destination || ""} · ${formattedPeriod}`}
              agencyName={tenant.companyName}
              agencyDocument={tenant.documentNumber}
              agencyContact={[tenant.phone, tenant.email].filter(Boolean).join(" | ")}
              agencyLogoUrl={tenant.logoUrl}
              elementId={currentCanvasId}
              deckSelector={
                archetype === "presentation_deck" && !isCanvasPresentation && viewAllSlidesInCanvas
                  ? ".presentation-page"
                  : undefined
              }
              markdownContent={
                archetype === "presentation_deck" ? presentationDeckMarkdown : interpolatedMarkdown
              }
              pageFormat={cmsConfig.format}
              theme={{
                templateId: cmsConfig.visualThemeId,
                canvasBg: cmsConfig.canvasBg,
                brandColor: cmsConfig.brandColor,
              }}
              onShareWhatsapp={
                onSendWhatsapp
                  ? () =>
                      onSendWhatsapp(
                        archetype === "presentation_deck"
                          ? presentationDeckMarkdown
                          : interpolatedMarkdown,
                        formState.title,
                      )
                  : undefined
              }
              compact
            />

            {onSaveDocument && (
              <Button
                type="button"
                variant="default"
                disabled={isSaving}
                onClick={handleSave}
                className="h-11 min-h-11 gap-2 px-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <Save className="size-4" />
                )}
                <span>Salvar no Atendimento</span>
              </Button>
            )}
          </div>
        </div>

        {/* Archetype Switcher Strip */}
        <div className="mt-2 flex items-center gap-2 overflow-x-auto waesy-tab-strip pb-1">
          {DOCUMENT_STUDIO_ARCHETYPE_META.map((item) => {
            const isActive = archetype === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectArchetype(item.id)}
                className={cn(
                  "h-11 min-h-11 shrink-0 rounded-md px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.shortLabel}
              </button>
            );
          })}
        </div>

        {/* Mobile Segmented Toggle (Zero DOM duplication) */}
        <div className="mt-2 grid grid-cols-2 gap-2 lg:hidden">
          <Button
            type="button"
            variant={mobilePane === "editor" ? "secondary" : "ghost"}
            onClick={() => setMobilePane("editor")}
            className="h-11 min-h-11 gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <SlidersHorizontal className="size-4" />
            <span>Editor & CMS</span>
          </Button>
          <Button
            type="button"
            variant={mobilePane === "preview" ? "secondary" : "ghost"}
            onClick={() => setMobilePane("preview")}
            className="h-11 min-h-11 gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Eye className="size-4" />
            <span>Visualização</span>
          </Button>
        </div>
      </header>

      {/* Main Split-Pane Workspace */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <>
          {/* Left Collapsible CMS Sidebar */}
          {!sidebarCollapsed && (
            <aside
              className={cn(
                "shrink-0 flex-col border-r border-border bg-card overflow-hidden",
                mobilePane === "editor"
                  ? "flex w-full lg:w-auto"
                  : "hidden lg:flex",
              )}
            >
              <StudioSidebar width={440} className="w-full lg:flex">
                {/* Sidebar Sub-Navigation (Matte Rail Language + Solid Active Icon) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 border-b border-sidebar-border p-2 bg-rail">
                  <button
                    type="button"
                    onClick={() => setSidebarTab("fields")}
                    className={cn(
                      "h-11 min-h-11 rounded-xl px-2 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      sidebarTab === "fields"
                        ? "bg-rail-active text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-rail-hover",
                    )}
                  >
                    <StatefulNavIcon icon={FileText} active={sidebarTab === "fields"} size={16} className="size-4 shrink-0" />
                    <span>Campos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarTab("visual")}
                    className={cn(
                      "h-11 min-h-11 rounded-xl px-2 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      sidebarTab === "visual"
                        ? "bg-rail-active text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-rail-hover",
                    )}
                  >
                    <StatefulNavIcon icon={Palette} active={sidebarTab === "visual"} size={16} className="size-4 shrink-0" />
                    <span>Visual CMS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarTab("identity")}
                    className={cn(
                      "h-11 min-h-11 rounded-xl px-2 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      sidebarTab === "identity"
                        ? "bg-rail-active text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-rail-hover",
                    )}
                  >
                    <StatefulNavIcon icon={Building2} active={sidebarTab === "identity"} size={16} className="size-4 shrink-0" />
                    <span>Emissor</span>
                  </button>
                </div>

                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-4 space-y-6 pb-20">
                    {sidebarTab === "fields" && (
                      <>
                        {/* Template Picker within Context */}
                        <section className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Modelo Contextual
                            </Label>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={handleRecompileFromFields}
                              className="h-11 min-h-11 px-2 text-xs gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <RefreshCw className="size-4" />
                              <span>Sincronizar</span>
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {templatesForArchetype.map((tpl) => {
                              const selected = tpl.id === selectedTemplateId;
                              return (
                                <button
                                  key={tpl.id}
                                  type="button"
                                  onClick={() => handleSelectTemplate(tpl.id)}
                                  className={cn(
                                    "w-full min-h-11 text-left rounded-lg border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    selected
                                      ? "border-primary bg-primary/5"
                                      : "border-border bg-background hover:bg-muted/40",
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-foreground">
                                      {tpl.shortLabel}
                                    </span>
                                    <Badge variant="outline" className="text-xs shrink-0">
                                      {tpl.badgeText}
                                    </Badge>
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                    {tpl.description}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        </section>

                        {/* Gerenciador e Editor de Slides (Apresentação Comercial 16:9) */}
                        {archetype === "presentation_deck" && !isCanvasPresentation && currentEditableSlide && (
                          <section className="space-y-3 border-t border-border pt-4">
                            <div className="flex items-center justify-between gap-2">
                              <Label className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                                <Layers className="size-3.5" />
                                <span>Slides da Apresentação ({editableSlides.length})</span>
                              </Label>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleAddPresentationSlide}
                                className="h-11 min-h-11 px-3 text-xs font-bold gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <Plus className="size-3.5" />
                                <span>Novo Slide</span>
                              </Button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {editableSlides.map((sl, idx) => (
                                <button
                                  key={sl.id}
                                  type="button"
                                  onClick={() => setActiveSlideIdx(idx)}
                                  className={cn(
                                    "h-11 min-h-11 px-3 rounded-md text-xs font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    idx === activeSlideIdx
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                                  )}
                                >
                                  {idx + 1}. {sl.title.slice(0, 18)}
                                </button>
                              ))}
                            </div>

                            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <Badge variant="secondary" className="text-2xs">
                                  Editando Slide {currentEditableSlide.pageNumber}
                                </Badge>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => handleDeletePresentationSlide(activeSlideIdx)}
                                  className="h-11 min-h-11 px-2 text-xs text-destructive hover:text-destructive gap-1"
                                >
                                  <Trash2 className="size-3.5" />
                                  <span>Excluir Slide</span>
                                </Button>
                              </div>
                              <Input
                                value={currentEditableSlide.eyebrow}
                                onChange={(e) => handleUpdateActiveSlide({ eyebrow: e.target.value })}
                                placeholder="Chapéu / Categoria do Slide"
                                className="h-11 text-xs bg-background"
                              />
                              <Input
                                value={currentEditableSlide.title}
                                onChange={(e) => handleUpdateActiveSlide({ title: e.target.value })}
                                placeholder="Título do Slide"
                                className="h-11 text-xs font-bold bg-background"
                              />
                              <Input
                                value={currentEditableSlide.subtitle}
                                onChange={(e) => handleUpdateActiveSlide({ subtitle: e.target.value })}
                                placeholder="Subtítulo do Slide"
                                className="h-11 text-xs bg-background"
                              />
                              <Textarea
                                value={currentEditableSlide.humanNarrative}
                                onChange={(e) =>
                                  handleUpdateActiveSlide({ humanNarrative: e.target.value })
                                }
                                rows={3}
                                placeholder="Narrativa consultiva deste slide..."
                                className="text-xs bg-background"
                              />
                              <div className="space-y-2 pt-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-2xs font-bold uppercase text-muted-foreground">
                                    Cards do Slide ({currentEditableSlide.cards.length})
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() =>
                                      handleUpdateActiveSlide({
                                        cards: [
                                          ...currentEditableSlide.cards,
                                          {
                                            label: "Novo Card",
                                            value: "Destaque",
                                            practicalExplanation: "Detalhamento para o cliente.",
                                          },
                                        ],
                                      })
                                    }
                                    className="h-11 min-h-11 px-2 text-xs gap-1"
                                  >
                                    <Plus className="size-3.5" />
                                    <span>Card</span>
                                  </Button>
                                </div>
                                {currentEditableSlide.cards.map((card, cIdx) => (
                                  <div
                                    key={cIdx}
                                    className="p-2 rounded border border-border bg-background space-y-2"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Input
                                        value={card.label}
                                        onChange={(e) => {
                                          const next = currentEditableSlide.cards.map((c, i) =>
                                            i === cIdx ? { ...c, label: e.target.value } : c,
                                          );
                                          handleUpdateActiveSlide({ cards: next });
                                        }}
                                        placeholder="Rótulo"
                                        className="h-11 text-xs font-semibold"
                                      />
                                      <Input
                                        value={card.value}
                                        onChange={(e) => {
                                          const next = currentEditableSlide.cards.map((c, i) =>
                                            i === cIdx ? { ...c, value: e.target.value } : c,
                                          );
                                          handleUpdateActiveSlide({ cards: next });
                                        }}
                                        placeholder="Valor"
                                        className="h-11 text-xs"
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Remover card"
                                        onClick={() => {
                                          const next = currentEditableSlide.cards.filter(
                                            (_, i) => i !== cIdx,
                                          );
                                          handleUpdateActiveSlide({ cards: next });
                                        }}
                                        className="size-11 shrink-0 text-muted-foreground hover:text-destructive"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </Button>
                                    </div>
                                    <Input
                                      value={card.practicalExplanation}
                                      onChange={(e) => {
                                        const next = currentEditableSlide.cards.map((c, i) =>
                                          i === cIdx
                                            ? { ...c, practicalExplanation: e.target.value }
                                            : c,
                                        );
                                        handleUpdateActiveSlide({ cards: next });
                                      }}
                                      placeholder="Explicação prática"
                                      className="h-11 text-xs"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </section>
                        )}

                          {/* Identificação & Titular */}
                          <section className="space-y-3 border-t border-border pt-4">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                              Identificação & Cliente
                            </Label>
                            <div className="space-y-2">
                              <Input
                                value={formState.title}
                                onChange={(e) =>
                                  setFormState((p) => ({ ...p, title: e.target.value }))
                                }
                                placeholder="Título do documento"
                                aria-label="Título do documento"
                                className="h-11"
                              />
                              <Input
                                value={formState.subtitle}
                                onChange={(e) =>
                                  setFormState((p) => ({ ...p, subtitle: e.target.value }))
                                }
                                placeholder="Subtítulo ou referência"
                                aria-label="Subtítulo"
                                className="h-11"
                              />
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Input
                                  value={formState.clientName}
                                  onChange={(e) =>
                                    setFormState((p) => ({ ...p, clientName: e.target.value }))
                                  }
                                  placeholder="Nome do cliente / titular"
                                  aria-label="Nome do cliente"
                                  className="h-11"
                                />
                                <Input
                                  value={formState.clientDocument}
                                  onChange={(e) =>
                                    setFormState((p) => ({
                                      ...p,
                                      clientDocument: e.target.value,
                                    }))
                                  }
                                  placeholder="CPF / CNPJ"
                                  aria-label="CPF ou CNPJ"
                                  className="h-11"
                                />
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Input
                                  value={formState.clientPhone}
                                  onChange={(e) =>
                                    setFormState((p) => ({ ...p, clientPhone: e.target.value }))
                                  }
                                  placeholder="WhatsApp / Telefone"
                                  aria-label="Telefone"
                                  className="h-11"
                                />
                                <Input
                                  value={formState.clientEmail}
                                  onChange={(e) =>
                                    setFormState((p) => ({ ...p, clientEmail: e.target.value }))
                                  }
                                  placeholder="E-mail"
                                  aria-label="E-mail"
                                  className="h-11"
                                />
                              </div>
                            </div>
                          </section>

                          {/* Escopo, Logística & Valores */}
                          <section className="space-y-3 border-t border-border pt-4">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                              Escopo, Datas & Financeiro
                            </Label>
                            <div className="space-y-2">
                              <Input
                                value={formState.destination}
                                onChange={(e) =>
                                  setFormState((p) => ({ ...p, destination: e.target.value }))
                                }
                                placeholder="Destino / Objeto contratado"
                                aria-label="Destino ou Objeto"
                                className="h-11"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  type="date"
                                  value={formState.startDate}
                                  onChange={(e) =>
                                    setFormState((p) => ({ ...p, startDate: e.target.value }))
                                  }
                                  aria-label="Data inicial"
                                  className="h-11"
                                />
                                <Input
                                  type="date"
                                  value={formState.endDate}
                                  onChange={(e) =>
                                    setFormState((p) => ({ ...p, endDate: e.target.value }))
                                  }
                                  aria-label="Data final"
                                  className="h-11"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  value={totalReaisInput}
                                  onChange={(e) => {
                                    const num = Number(e.target.value.replace(",", "."));
                                    const cents = Number.isFinite(num) ? Math.round(num * 100) : 0;
                                    setFormState((p) => ({ ...p, totalCents: Math.max(0, cents) }));
                                  }}
                                  placeholder="Valor total (R$)"
                                  aria-label="Valor total em reais"
                                  className="h-11"
                                />
                                <Input
                                  value={formState.paymentMethod}
                                  onChange={(e) =>
                                    setFormState((p) => ({
                                      ...p,
                                      paymentMethod: e.target.value,
                                    }))
                                  }
                                  placeholder="Forma de pagamento"
                                  aria-label="Forma de pagamento"
                                  className="h-11"
                                />
                              </div>
                              <Input
                                value={formState.hotelSummary}
                                onChange={(e) =>
                                  setFormState((p) => ({ ...p, hotelSummary: e.target.value }))
                                }
                                placeholder="Hospedagem / Infraestrutura / Item Principal"
                                aria-label="Hospedagem ou item principal"
                                className="h-11"
                              />
                              <Input
                                value={formState.flightSummary}
                                onChange={(e) =>
                                  setFormState((p) => ({ ...p, flightSummary: e.target.value }))
                                }
                                placeholder="Logística Aérea / Transporte"
                                aria-label="Logística aérea ou transporte"
                                className="h-11"
                              />
                              <Textarea
                                value={formState.paymentConditions}
                                onChange={(e) =>
                                  setFormState((p) => ({
                                    ...p,
                                    paymentConditions: e.target.value,
                                  }))
                                }
                                rows={2}
                                placeholder="Condições comerciais e prazos..."
                                aria-label="Condições comerciais"
                              />
                            </div>
                          </section>

                          {/* Campos Clínicos / Anamnese & PCD */}
                          {(archetype === "dossier_form_doc" ||
                            cmsConfig.showHealthOrComplianceBlock) && (
                            <section className="space-y-3 border-t border-border pt-4">
                              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                                Saúde, Anamnese & Emergência
                              </Label>
                              <div className="space-y-2">
                                <Input
                                  value={formState.healthAllergies}
                                  onChange={(e) =>
                                    setFormState((p) => ({
                                      ...p,
                                      healthAllergies: e.target.value,
                                    }))
                                  }
                                  placeholder="Alergias / Intolerâncias"
                                  className="h-11"
                                />
                                <Input
                                  value={formState.healthMedications}
                                  onChange={(e) =>
                                    setFormState((p) => ({
                                      ...p,
                                      healthMedications: e.target.value,
                                    }))
                                  }
                                  placeholder="Medicamentos contínuos"
                                  className="h-11"
                                />
                                <Input
                                  value={formState.accessibilityNeeds}
                                  onChange={(e) =>
                                    setFormState((p) => ({
                                      ...p,
                                      accessibilityNeeds: e.target.value,
                                    }))
                                  }
                                  placeholder="Acessibilidade / PCD / Dieta"
                                  className="h-11"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <Input
                                    value={formState.emergencyContactName}
                                    onChange={(e) =>
                                      setFormState((p) => ({
                                        ...p,
                                        emergencyContactName: e.target.value,
                                      }))
                                    }
                                    placeholder="Contato emergência"
                                    className="h-11"
                                  />
                                  <Input
                                    value={formState.emergencyContactPhone}
                                    onChange={(e) =>
                                      setFormState((p) => ({
                                        ...p,
                                        emergencyContactPhone: e.target.value,
                                      }))
                                    }
                                    placeholder="Tel. emergência"
                                    className="h-11"
                                  />
                                </div>
                              </div>
                            </section>
                          )}

                          {/* Variáveis Específicas de Contrato Jurídico */}
                          {archetype === "contract_legal" &&
                            activeContractDef &&
                            activeContractDef.variables_schema.length > 0 && (
                              <section className="space-y-3 border-t border-border pt-4">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                                  Variáveis da Minuta Jurídica
                                </Label>
                                <div className="space-y-2">
                                  {activeContractDef.variables_schema.map((variable) => (
                                    <div key={variable.key} className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">
                                        {variable.label}
                                      </Label>
                                      <Input
                                        value={
                                          formState.contractVariables[variable.key] ??
                                          variable.default_value ??
                                          ""
                                        }
                                        onChange={(e) =>
                                          setFormState((p) => ({
                                            ...p,
                                            contractVariables: {
                                              ...p.contractVariables,
                                              [variable.key]: e.target.value,
                                            },
                                          }))
                                        }
                                        className="h-11"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </section>
                            )}

                          {/* Passageiros / Lista Nominativa */}
                          <section className="space-y-3 border-t border-border pt-4">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Passageiros / Participantes ({formState.passengers.length})
                              </Label>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  setFormState((p) => ({
                                    ...p,
                                    passengers: [
                                      ...p.passengers,
                                      { name: "", document: "", role: "Acompanhante" },
                                    ],
                                  }))
                                }
                                className="h-11 min-h-11 px-3 text-xs gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <Plus className="size-4" />
                                <span>Adicionar</span>
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {formState.passengers.map((pax, idx) => (
                                <div
                                  key={`pax-${idx}`}
                                  className="flex items-center gap-2 rounded-md border border-border p-2 bg-muted/20"
                                >
                                  <div className="flex-1 grid grid-cols-2 gap-2">
                                    <Input
                                      value={pax.name}
                                      onChange={(e) =>
                                        setFormState((p) => ({
                                          ...p,
                                          passengers: p.passengers.map((item, i) =>
                                            i === idx ? { ...item, name: e.target.value } : item,
                                          ),
                                        }))
                                      }
                                      placeholder="Nome completo"
                                      className="h-11"
                                    />
                                    <Input
                                      value={pax.document || ""}
                                      onChange={(e) =>
                                        setFormState((p) => ({
                                          ...p,
                                          passengers: p.passengers.map((item, i) =>
                                            i === idx
                                              ? { ...item, document: e.target.value }
                                              : item,
                                          ),
                                        }))
                                      }
                                      placeholder="CPF / Passaporte"
                                      className="h-11"
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    aria-label="Remover participante"
                                    onClick={() =>
                                      setFormState((p) => ({
                                        ...p,
                                        passengers: p.passengers.filter((_, i) => i !== idx),
                                      }))
                                    }
                                    className="h-11 min-h-11 px-2 text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </section>

                          {/* Marcadores Dinâmicos & Editor Markdown Direto */}
                          <section className="space-y-3 border-t border-border pt-4">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                              Marcadores Dinâmicos & Corpo Textual
                            </Label>
                            <div className="flex flex-wrap gap-2">
                              {DOCUMENT_MERGE_TAGS.map((tag) => (
                                <button
                                  key={tag.key}
                                  type="button"
                                  onClick={() => handleInsertMergeTag(tag.token)}
                                  className="h-11 min-h-11 rounded-md border border-border bg-muted/40 px-3 text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  + {tag.label}
                                </button>
                              ))}
                            </div>
                            <Textarea
                              ref={markdownRef}
                              value={formState.markdownBody}
                              onChange={(e) =>
                                setFormState((p) => ({ ...p, markdownBody: e.target.value }))
                              }
                              rows={10}
                              aria-label="Corpo textual Markdown do documento"
                              className="font-mono text-xs"
                            />
                          </section>
                        </>
                      )}

                      {sidebarTab === "visual" && (
                        <>
                          {/* Formato da Página / Tela */}
                          <section className="space-y-3">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                              Formato de Saída & Canvas
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                              {FORMAT_OPTIONS.map((fmt) => (
                                <button
                                  key={fmt.id}
                                  type="button"
                                  onClick={() =>
                                    setCmsConfig((p) => ({ ...p, format: fmt.id }))
                                  }
                                  className={cn(
                                    "h-11 min-h-11 rounded-md border px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    cmsConfig.format === fmt.id
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border bg-background text-foreground hover:bg-muted/40",
                                  )}
                                >
                                  {fmt.label}
                                </button>
                              ))}
                            </div>
                          </section>

                          {/* Estilo Contextual Específico */}
                          {archetype === "proposal_quote" && (
                            <section className="space-y-3 border-t border-border pt-4">
                              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                                Template da Proposta / Orçamento
                              </Label>
                              <div className="grid grid-cols-1 gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCmsConfig((p) => ({
                                      ...p,
                                      commercialLayoutVariant: "proposal_editorial_agency",
                                    }))
                                  }
                                  className={cn(
                                    "h-11 min-h-11 rounded-md border px-3 text-left text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    cmsConfig.commercialLayoutVariant === "proposal_editorial_agency"
                                      ? "border-primary bg-primary/10 text-foreground"
                                      : "border-border bg-background text-muted-foreground",
                                  )}
                                >
                                  Proposta Editorial Premium (Escopo + Etapas)
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCmsConfig((p) => ({
                                      ...p,
                                      commercialLayoutVariant: "budget_corporate_clean",
                                    }))
                                  }
                                  className={cn(
                                    "h-11 min-h-11 rounded-md border px-3 text-left text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    cmsConfig.commercialLayoutVariant === "budget_corporate_clean"
                                      ? "border-primary bg-primary/10 text-foreground"
                                      : "border-border bg-background text-muted-foreground",
                                  )}
                                >
                                  Orçamento Corporativo Direto (Tabela & PIX)
                                </button>
                              </div>
                            </section>
                          )}

                          {/* Papel / Fundo do Canvas */}
                          <section className="space-y-3 border-t border-border pt-4">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                              Superfície do Papel / Fundo
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                              {CANVAS_BG_PRESETS.map((preset) => {
                                const isActive = cmsConfig.canvasBg === preset.value;
                                return (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() =>
                                      setCmsConfig((p) => ({ ...p, canvasBg: preset.value }))
                                    }
                                    className={cn(
                                      "h-11 min-h-11 flex items-center gap-2 rounded-md border px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                      isActive
                                        ? "border-primary bg-primary/10 text-foreground"
                                        : "border-border bg-background text-muted-foreground",
                                    )}
                                  >
                                    <span
                                      className="size-4 shrink-0 rounded-full border border-border waesy-dyn-bg"
                                      style={{ "--dyn-bg": preset.color } as React.CSSProperties}
                                    />
                                    <span className="truncate">{preset.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </section>

                          {/* Cor da Marca */}
                          <section className="space-y-3 border-t border-border pt-4">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                              Cor Institucional de Destaque
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                              {BRAND_COLOR_PRESETS.map((preset) => {
                                const isActive = cmsConfig.brandColor === preset.value;
                                return (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() =>
                                      setCmsConfig((p) => ({ ...p, brandColor: preset.value }))
                                    }
                                    className={cn(
                                      "h-11 min-h-11 flex items-center gap-2 rounded-md border px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                      isActive
                                        ? "border-primary bg-primary/10 text-foreground"
                                        : "border-border bg-background text-muted-foreground",
                                    )}
                                  >
                                    <span
                                      className="size-4 shrink-0 rounded-full border border-border waesy-dyn-bg"
                                      style={{ "--dyn-bg": preset.color } as React.CSSProperties}
                                    />
                                    <span className="truncate">{preset.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </section>

                          {/* Tipografia */}
                          <section className="space-y-3 border-t border-border pt-4">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                              Tipografia Editorial
                            </Label>
                            <div className="space-y-2">
                              {FONT_PRESET_OPTIONS.map((font) => (
                                <button
                                  key={font.id}
                                  type="button"
                                  onClick={() =>
                                    setCmsConfig((p) => ({
                                      ...p,
                                      fontPreset: font.id as ProposalFontPresetId,
                                    }))
                                  }
                                  className={cn(
                                    "w-full min-h-11 text-left rounded-md border p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    cmsConfig.fontPreset === font.id
                                      ? "border-primary bg-primary/10"
                                      : "border-border bg-background",
                                  )}
                                >
                                  <div className="text-xs font-bold text-foreground">
                                    {font.label}
                                  </div>
                                  <div className="text-xs text-muted-foreground">{font.desc}</div>
                                </button>
                              ))}
                            </div>
                          </section>

                          {/* Switches Modulares de Blocos CMS */}
                          <section className="space-y-3 border-t border-border pt-4">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                              Blocos Visíveis na Folha (CMS Real-Time)
                            </Label>
                            <div className="space-y-3">
                              {(
                                [
                                  ["showHeaderMasthead", "Cabeçalho Timbrado Institucional"],
                                  ["showAgencyLogo", "Logotipo da Organização"],
                                  ["showClientCard", "Quadro de Dados do Titular"],
                                  ["showSummaryStrip", "Faixa Resumo & Investimento"],
                                  ["showHealthOrComplianceBlock", "Bloco Clínico / PCD / Emergência"],
                                  ["showVerificationQr", "QR Code de Autenticidade Offline"],
                                  ["showSignatureBlock", "Linhas de Assinatura Formal"],
                                ] as Array<[keyof DocumentStudioCmsConfig, string]>
                              ).map(([key, label]) => (
                                <div
                                  key={key}
                                  className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                                >
                                  <span className="text-xs font-medium text-foreground">
                                    {label}
                                  </span>
                                  <Switch
                                    checked={Boolean(cmsConfig[key])}
                                    onCheckedChange={(checked) =>
                                      setCmsConfig((p) => ({ ...p, [key]: checked }))
                                    }
                                    aria-label={label}
                                  />
                                </div>
                              ))}
                            </div>
                          </section>
                        </>
                      )}

                      {sidebarTab === "identity" && (
                        <section className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Identidade do Locatário Emissor
                            </Label>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setTenant(initialTenant)}
                              className="h-11 min-h-11 px-2 text-xs gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <RotateCcw className="size-4" />
                              <span>Restaurar Loja</span>
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <Input
                              value={tenant.companyName}
                              onChange={(e) =>
                                setTenant((p) => ({ ...p, companyName: e.target.value }))
                              }
                              placeholder="Razão Social / Nome Fantasia"
                              className="h-11"
                            />
                            <Input
                              value={tenant.logoUrl || ""}
                              onChange={(e) =>
                                setTenant((p) => ({ ...p, logoUrl: e.target.value || null }))
                              }
                              placeholder="URL da Logo da Empresa (Brand Kit)"
                              className="h-11"
                            />
                            <Input
                              value={tenant.documentNumber}
                              onChange={(e) =>
                                setTenant((p) => ({ ...p, documentNumber: e.target.value }))
                              }
                              placeholder="CNPJ / CPF"
                              className="h-11"
                            />
                            <Input
                              value={tenant.registryCode}
                              onChange={(e) =>
                                setTenant((p) => ({ ...p, registryCode: e.target.value }))
                              }
                              placeholder="Cadastur / Registro Profissional"
                              className="h-11"
                            />
                            <Input
                              value={tenant.phone}
                              onChange={(e) => setTenant((p) => ({ ...p, phone: e.target.value }))}
                              placeholder="Telefone / WhatsApp institucional"
                              className="h-11"
                            />
                            <Input
                              value={tenant.email}
                              onChange={(e) => setTenant((p) => ({ ...p, email: e.target.value }))}
                              placeholder="E-mail oficial"
                              className="h-11"
                            />
                            <Input
                              value={tenant.pixKey}
                              onChange={(e) => setTenant((p) => ({ ...p, pixKey: e.target.value }))}
                              placeholder="Chave PIX"
                              className="h-11"
                            />
                            <Textarea
                              value={cmsConfig.customFooterNote}
                              onChange={(e) =>
                                setCmsConfig((p) => ({ ...p, customFooterNote: e.target.value }))
                              }
                              rows={3}
                              placeholder="Nota legal ou instrução adicional no rodapé..."
                            />
                          </div>
                        </section>
                      )}
                    </div>
                  </ScrollArea>
                </StudioSidebar>
              </aside>
            )}

            {/* Right Live Real-Time Paper / Canvas Preview */}
            <main
              className={cn(
                "flex-1 min-w-0 bg-muted/40 overflow-auto scroll-area p-4 sm:p-8 justify-center items-start pb-safe",
                mobilePane === "preview" ? "flex" : "hidden lg:flex",
              )}
            >
              <StudioFrame
                format={cmsConfig.format}
                canvasId="universal-doc-studio-canvas"
                zoomScale={zoomScale}
                canvasBgColor={cmsConfig.canvasBg}
                onAutoFitScaleCalculated={setAutoFitScale}
              >
                {/* Archetype: Apresentação Comercial 16:9 / Lâminas Visuais */}
                {archetype === "presentation_deck" ? (
                  isCanvasPresentation ? (
                    <ProposalCanvasRenderer proposal={studioProposalDto} />
                  ) : (
                    <div className="w-full min-h-full flex flex-col justify-between">
                      {/* Barra Interativa de Controle de Slides (Oculta na Impressão) */}
                      <div className="print:hidden px-6 py-3 bg-muted/40 border-b border-border flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs font-mono">
                            Slide {(currentEditableSlide?.pageNumber ?? 1)} de {editableSlides.length}
                          </Badge>
                          <span className="text-xs font-semibold text-muted-foreground">
                            {activeTemplateMeta?.shortLabel}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant={viewAllSlidesInCanvas ? "secondary" : "outline"}
                            onClick={() => setViewAllSlidesInCanvas((v) => !v)}
                            className="h-11 min-h-11 px-3 text-xs font-semibold"
                          >
                            <span>
                              {viewAllSlidesInCanvas
                                ? "Ver Slide Único"
                                : `Ver Todos (${editableSlides.length})`}
                            </span>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={viewAllSlidesInCanvas || activeSlideIdx === 0}
                            onClick={() => setActiveSlideIdx((i) => Math.max(0, i - 1))}
                            className="h-11 min-h-11 px-3 text-xs font-semibold gap-1"
                          >
                            <ChevronLeft className="size-4" />
                            <span>Anterior</span>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={
                              viewAllSlidesInCanvas || activeSlideIdx >= editableSlides.length - 1
                            }
                            onClick={() =>
                              setActiveSlideIdx((i) => Math.min(editableSlides.length - 1, i + 1))
                            }
                            className="h-11 min-h-11 px-3 text-xs font-semibold gap-1"
                          >
                            <span>Próximo</span>
                            <ChevronRight className="size-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Slides Renderizados com Brand Kit e Logo da Empresa */}
                      <div className="divide-y divide-border">
                        {(viewAllSlidesInCanvas
                          ? editableSlides
                          : currentEditableSlide
                            ? [currentEditableSlide]
                            : []
                        ).map((slide) => (
                          <section
                            key={slide.id}
                            className={cn(
                              "presentation-page w-full min-h-full p-8 sm:p-10 flex flex-col justify-between gap-6 waesy-dyn-bg waesy-dyn-fg",
                              cmsConfig.fontPreset === "editorial" ||
                                cmsConfig.fontPreset === "luxury"
                                ? "font-serif"
                                : "font-sans",
                            )}
                            style={
                              {
                                "--dyn-bg": resolvedTheme.canvasBg,
                                "--dyn-fg": resolvedTheme.ink,
                                "--dyn-bdr": resolvedTheme.border,
                              } as React.CSSProperties
                            }
                          >
                            <div className="space-y-6">
                              {/* Cabeçalho Brand Kit com Logo da Empresa */}
                              {cmsConfig.showHeaderMasthead && (
                                <header
                                  className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b-2 waesy-dyn-bdr"
                                  style={
                                    { "--dyn-bdr": resolvedTheme.brandAccent } as React.CSSProperties
                                  }
                                >
                                  <div className="flex items-center gap-4 min-w-0">
                                    {cmsConfig.showAgencyLogo &&
                                    tenant.logoUrl &&
                                    !agencyLogoFailed ? (
                                      <img
                                        src={tenant.logoUrl}
                                        alt={tenant.companyName}
                                        crossOrigin="anonymous"
                                        onError={() => setAgencyLogoFailed(true)}
                                        className="h-12 w-auto max-w-40 object-contain rounded-md bg-card px-2 py-1 border border-border/40 shrink-0"
                                      />
                                    ) : (
                                      <div
                                        className="h-12 px-4 rounded-lg flex items-center justify-center font-extrabold text-sm tracking-wider uppercase shrink-0 waesy-dyn-bg waesy-dyn-fg"
                                        style={
                                          {
                                            "--dyn-bg": resolvedTheme.brandAccent,
                                            "--dyn-fg": resolvedTheme.brandFg,
                                          } as React.CSSProperties
                                        }
                                      >
                                        <span>{tenant.companyName}</span>
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <h2
                                        className="text-base font-extrabold tracking-tight truncate waesy-dyn-fg"
                                        style={
                                          {
                                            "--dyn-fg": resolvedTheme.brandAccent,
                                          } as React.CSSProperties
                                        }
                                      >
                                        {tenant.companyName}
                                      </h2>
                                      <p className="text-xs opacity-75 truncate">
                                        {[
                                          tenant.registryCode,
                                          tenant.phone,
                                          tenant.email,
                                          tenant.cityState,
                                        ]
                                          .filter(Boolean)
                                          .join(" • ") || "Apresentação Comercial Personalizada"}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span
                                      className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider waesy-dyn-bg waesy-dyn-fg"
                                      style={
                                        {
                                          "--dyn-bg": resolvedTheme.brandSoft,
                                          "--dyn-fg": resolvedTheme.ink,
                                        } as React.CSSProperties
                                      }
                                    >
                                      {slide.eyebrow}
                                    </span>
                                    {slide.highlightMetric && (
                                      <span
                                        className="px-3 py-1 rounded-full text-xs font-extrabold waesy-dyn-bg waesy-dyn-fg"
                                        style={
                                          {
                                            "--dyn-bg": resolvedTheme.brandAccent,
                                            "--dyn-fg": resolvedTheme.brandFg,
                                          } as React.CSSProperties
                                        }
                                      >
                                        {slide.highlightMetric}
                                      </span>
                                    )}
                                    <span className="text-xs font-mono opacity-70">
                                      {slide.pageNumber}/{editableSlides.length}
                                    </span>
                                  </div>
                                </header>
                              )}

                              {/* Título e Subtítulo do Slide */}
                              <div className="space-y-2">
                                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                                  {slide.title}
                                </h1>
                                {slide.subtitle && (
                                  <p className="text-sm sm:text-base opacity-80 font-medium">
                                    {slide.subtitle}
                                  </p>
                                )}
                              </div>

                              {/* Narrativa Consultiva */}
                              {slide.humanNarrative && (
                                <div
                                  className="p-4 rounded-xl border text-sm leading-relaxed waesy-dyn-bg waesy-dyn-bdr"
                                  style={
                                    {
                                      "--dyn-bg": resolvedTheme.surfaceCard,
                                      "--dyn-bdr": resolvedTheme.border,
                                    } as React.CSSProperties
                                  }
                                >
                                  {slide.humanNarrative}
                                </div>
                              )}

                              {/* Grade de Cards do Slide */}
                              {slide.cards.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {slide.cards.map((card, cIdx) => (
                                    <div
                                      key={cIdx}
                                      className="p-4 rounded-xl border space-y-2 flex flex-col justify-between waesy-dyn-bg waesy-dyn-bdr"
                                      style={
                                        {
                                          "--dyn-bg": resolvedTheme.surfaceCard,
                                          "--dyn-bdr": resolvedTheme.border,
                                        } as React.CSSProperties
                                      }
                                    >
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                          <span
                                            className="text-xs font-bold uppercase tracking-wider waesy-dyn-fg"
                                            style={
                                              {
                                                "--dyn-fg": resolvedTheme.brandAccent,
                                              } as React.CSSProperties
                                            }
                                          >
                                            {card.label}
                                          </span>
                                          {card.badge && (
                                            <Badge variant="outline" className="text-2xs">
                                              {card.badge}
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-base font-extrabold leading-snug">
                                          {card.value}
                                        </p>
                                      </div>
                                      <p className="text-xs opacity-80 leading-relaxed pt-2 border-t border-border/30">
                                        {card.practicalExplanation}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Etapas / Passo a Passo se houver */}
                              {slide.steps && slide.steps.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  {slide.steps.map((st) => (
                                    <div
                                      key={st.stepNumber}
                                      className="p-4 rounded-xl border space-y-2 waesy-dyn-bg waesy-dyn-bdr"
                                      style={
                                        {
                                          "--dyn-bg": resolvedTheme.surfaceCard,
                                          "--dyn-bdr": resolvedTheme.border,
                                        } as React.CSSProperties
                                      }
                                    >
                                      <span
                                        className="inline-flex px-3 py-1 rounded text-2xs font-bold waesy-dyn-bg waesy-dyn-fg"
                                        style={
                                          {
                                            "--dyn-bg": resolvedTheme.brandAccent,
                                            "--dyn-fg": resolvedTheme.brandFg,
                                          } as React.CSSProperties
                                        }
                                      >
                                        Etapa {st.stepNumber}
                                      </span>
                                      <h4 className="text-sm font-bold">{st.title}</h4>
                                      <p className="text-xs opacity-80 leading-relaxed">
                                        {st.explanation}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Rodapé Institucional do Slide com QR Code */}
                            <footer
                              className="pt-4 border-t flex items-center justify-between gap-4 text-xs opacity-80 waesy-dyn-bdr"
                              style={
                                { "--dyn-bdr": resolvedTheme.border } as React.CSSProperties
                              }
                            >
                              <div className="space-y-1">
                                <span className="font-bold block">
                                  {tenant.companyName} · {formState.clientName || "Apresentação Executiva"}
                                </span>
                                <span className="text-2xs block">
                                  {cmsConfig.customFooterNote ||
                                    `Protocolo ${formState.protocolCode} • Emitido em ${formState.issueDate}`}
                                </span>
                              </div>
                              {cmsConfig.showVerificationQr && qrCodeUri && (
                                <img
                                  src={qrCodeUri}
                                  alt={`QR Code ${formState.protocolCode}`}
                                  className="size-12 rounded border border-border bg-card p-1 shrink-0"
                                />
                              )}
                            </footer>
                          </section>
                        ))}
                      </div>
                    </div>
                  )
                ) : archetype === "proposal_quote" ? (
                  cmsConfig.commercialLayoutVariant === "budget_corporate_clean" ? (
                    <BudgetCorporateClean data={commercialDocumentData} />
                  ) : (
                    <ProposalEditorialAgency data={commercialDocumentData} />
                  )
                ) : archetype === "voucher_boarding" ? (
                  cmsConfig.format === "story-916" ||
                  cmsConfig.voucherLayoutVariant === "story_mobile" ? (
                    <TemplateVoucherStory
                      voucher={voucherDraft}
                      agencyName={tenant.companyName}
                      agencySlug={tenant.slug}
                      agencyLogo={tenant.logoUrl}
                      agencyBrandColor={cmsConfig.brandColor}
                    />
                  ) : (
                    <TemplateVoucherA4
                      voucher={voucherDraft}
                      agencyName={tenant.companyName}
                      agencyLogo={tenant.logoUrl || undefined}
                    />
                  )
                ) : (
                  /* Archetypes: Dossier Form Doc & Contract Legal — Full Real-Time A4 Surface */
                  <article
                    className={cn(
                      "a4-page w-full min-h-full p-8 sm:p-10 flex flex-col justify-between gap-6 waesy-dyn-bg waesy-dyn-fg",
                      cmsConfig.fontPreset === "editorial" || cmsConfig.fontPreset === "luxury"
                        ? "font-serif"
                        : cmsConfig.fontPreset === "corporate"
                          ? "font-mono"
                          : "font-sans",
                    )}
                    style={
                      {
                        "--dyn-bg": resolvedTheme.surfaceCard,
                        "--dyn-fg": resolvedTheme.ink,
                      } as React.CSSProperties
                    }
                  >
                    <div className="space-y-6">
                      {/* Cabeçalho Timbrado */}
                      {cmsConfig.showHeaderMasthead && (
                        <header
                          className="flex items-start justify-between gap-6 pb-5 border-b-2 waesy-dyn-bdr"
                          style={{ "--dyn-bdr": resolvedTheme.brandColor } as React.CSSProperties}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            {cmsConfig.showAgencyLogo && tenant.logoUrl && (
                              <img
                                src={tenant.logoUrl}
                                alt={tenant.companyName}
                                crossOrigin="anonymous"
                                className="h-12 w-auto max-w-36 object-contain rounded-md"
                              />
                            )}
                            <div className="min-w-0 space-y-1">
                              <h2
                                className="text-lg font-extrabold tracking-tight truncate waesy-dyn-fg"
                                style={{ "--dyn-fg": resolvedTheme.brandColor } as React.CSSProperties}
                              >
                                {tenant.companyName}
                              </h2>
                              <p className="text-xs text-muted-foreground">
                                {[
                                  tenant.documentNumber ? `CNPJ: ${tenant.documentNumber}` : "",
                                  tenant.registryCode ? `Reg.: ${tenant.registryCode}` : "",
                                ]
                                  .filter(Boolean)
                                  .join(" · ") || "Documento Oficial Emitido pelo Sistema"}
                              </p>
                              {(tenant.phone || tenant.email || tenant.cityState) && (
                                <p className="text-xs text-muted-foreground">
                                  {[tenant.phone, tenant.email, tenant.cityState]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0 space-y-1 text-xs">
                            <div className="font-mono font-bold uppercase text-foreground">
                              {formState.protocolCode}
                            </div>
                            <div className="text-muted-foreground">
                              Emissão: {formState.issueDate}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {activeTemplateMeta?.badgeText || "Documento Oficial"}
                            </Badge>
                          </div>
                        </header>
                      )}

                      {/* Título do Documento */}
                      <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight">
                          {formState.title}
                        </h1>
                        {formState.subtitle && (
                          <p className="text-sm text-muted-foreground">{formState.subtitle}</p>
                        )}
                      </div>

                      {/* Quadro de Identificação & Resumo */}
                      {(cmsConfig.showClientCard || cmsConfig.showSummaryStrip) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-lg border border-border p-4 bg-muted/20 text-xs">
                          {cmsConfig.showClientCard && (
                            <>
                              <div>
                                <span className="font-bold uppercase text-muted-foreground block">
                                  Titular / Cliente
                                </span>
                                <span className="font-semibold text-sm block mt-1">
                                  {formState.clientName || "Não informado"}
                                </span>
                                <span className="text-muted-foreground block">
                                  {formState.clientDocument || "CPF/CNPJ não informado"}
                                </span>
                              </div>
                              <div>
                                <span className="font-bold uppercase text-muted-foreground block">
                                  Contato
                                </span>
                                <span className="font-semibold block mt-1">
                                  {formState.clientPhone || "Não informado"}
                                </span>
                                <span className="text-muted-foreground block truncate">
                                  {formState.clientEmail || "Sem e-mail"}
                                </span>
                              </div>
                            </>
                          )}
                          {cmsConfig.showSummaryStrip && (
                            <>
                              <div>
                                <span className="font-bold uppercase text-muted-foreground block">
                                  Destino / Objeto
                                </span>
                                <span className="font-semibold text-sm block mt-1">
                                  {formState.destination || "A definir"}
                                </span>
                                <span className="text-muted-foreground block">
                                  {formattedPeriod}
                                </span>
                              </div>
                              <div>
                                <span className="font-bold uppercase text-muted-foreground block">
                                  Investimento
                                </span>
                                <span className="font-extrabold text-sm block mt-1">
                                  {formatMoney(formState.totalCents || 0)}
                                </span>
                                <span className="text-muted-foreground block">
                                  {formState.adultsCount} adulto(s), {formState.childrenCount} criança(s)
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Corpo Principal em Markdown Renderizado */}
                      <div className="pt-2">
                        <ContractMarkdownRenderer content={interpolatedMarkdown} />
                      </div>
                    </div>

                    {/* Rodapé Institucional + QR + Assinaturas */}
                    <footer className="pt-6 border-t border-border space-y-6">
                      {cmsConfig.customFooterNote && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {cmsConfig.customFooterNote}
                        </p>
                      )}

                      {cmsConfig.showSignatureBlock && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6 text-xs">
                          <div className="space-y-1">
                            <div className="border-b border-border pb-6" />
                            <p className="font-bold uppercase">{tenant.companyName}</p>
                            <p className="text-muted-foreground">
                              {tenant.documentNumber || "Emissor Responsável"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <div className="border-b border-border pb-6" />
                            <p className="font-bold uppercase">
                              {formState.clientName || "Assinatura do Contratante"}
                            </p>
                            <p className="text-muted-foreground">
                              {formState.clientDocument || "Titular / Responsável Legal"}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-4 pt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Sparkles className="size-4 text-primary shrink-0" />
                          <span>
                            Documento autenticado por {tenant.companyName} · Protocolo{" "}
                            {formState.protocolCode}
                          </span>
                        </div>
                        {cmsConfig.showVerificationQr && qrCodeUri && (
                          <img
                            src={qrCodeUri}
                            alt={`QR Code de autenticação ${formState.protocolCode}`}
                            className="size-14 rounded border border-border bg-card p-1 shrink-0"
                          />
                        )}
                      </div>
                    </footer>
                  </article>
                )}
              </StudioFrame>
            </main>
          </>
      </div>
    </div>
  );
}
