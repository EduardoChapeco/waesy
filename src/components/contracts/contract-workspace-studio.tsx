import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bell,
  Bold,
  Check,
  CheckCircle2,
  Copy,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FilePlus2,
  FileText,
  Folder,
  FolderPlus,
  Heading1,
  Heading2,
  Loader2,
  Lock,
  Minus,
  PenTool,
  Plus,
  QrCode,
  ScanLine,
  Send,
  ShieldCheck,
  Sparkles,
  Table as TableIcon,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  XCircle,
} from "lucide-react";
import { WhatsappLogo } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONTRACT_SIGNER_ROLE_GROUPS } from "@/lib/contracts/signer-roles";
import { Textarea } from "@/components/ui/textarea";
import { ContractAuditManifest } from "@/components/contracts/contract-audit-manifest";
import { ContractVariablePicker } from "@/components/contracts/contract-variable-picker";
import {
  FIELD_TAGS,
  SignaturePositionerCanvas,
  type SignerVisualInfo,
} from "@/components/contracts/signature-positioner-canvas";
import { DigitalSignatureCanvas } from "@/components/workspace/DigitalSignatureCanvas";
import { ADVANCED_CONTRACT_TEMPLATES } from "@/lib/data/advanced-contract-templates";
import { compileContractDocument } from "@/lib/contracts/contract-compiler";
import { downloadSignedContractPackagePdf } from "@/lib/contracts/contract-pdf-download";
import {
  autoPositionSignatureFieldsFromContent,
  interpolateContractVariables,
} from "@/lib/contracts/contract-semantic-dictionary";
import {
  formatContractStatusLabel,
  isContractSignedOrCompleted,
} from "@/lib/contracts/contract-vault-rules";
import {
  paginateContractMarkdown,
  parseUploadedContractDocument,
  resolveContractNicheProfile,
} from "@/lib/contracts/document-file-parser";
import { TOKEN_HEX } from "@/lib/design-tokens";
import { formatDate } from "@/lib/datetime";
import { formatPhone, maskCpfProgressive } from "@/lib/document-validator";
import { formatMoney } from "@/lib/money";
import { getNicheContractBlueprint, normalizeCustomFieldMap } from "@/lib/niches/unified-field-bridge";
import { cn } from "@/lib/utils";
import { getCommercialInvoiceByPublicToken, listCommercialInvoices } from "@/services/commercial-invoices.functions";
import {
  createContract,
  extractContractDataFromOcr,
  sealAndIssueContract,
  signContractEnvelope,
  updateContractDraft,
  type DispatchSettingsDTO,
  type ObserverDTO,
  type SignatureFieldDTO,
} from "@/services/contracts.functions";
import {
  cancelContract,
  createContractFolder,
  getUserSignatureProfile,
  listContractFolders,
  moveContractToFolder,
  resendContractEnvelope,
  saveUserSignatureAndInitials,
} from "@/services/contracts-vault.functions";
import { listLeads } from "@/services/crm.functions";
import { getQuoteDetail, listQuotes } from "@/services/quotes.functions";
import { uploadMediaUniversal } from "@/services/storage.functions";
import { getStoreSettings } from "@/services/store.functions";
import { listAgencyTravelProposals } from "@/services/travel-proposal.functions";

const SIGNER_PALETTE = [
  TOKEN_HEX.blue600,
  TOKEN_HEX.accentDefault,
  TOKEN_HEX.green600,
  TOKEN_HEX.amber600,
  TOKEN_HEX.red600,
];

const CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "service_agreement", label: "Prestação de Serviços" },
  { value: "general_deal", label: "Acordo Comercial" },
  { value: "employment", label: "Contrato de Trabalho / Equipe" },
  { value: "real_estate_rental", label: "Locação de Imóvel" },
  { value: "real_estate_sale", label: "Compra e Venda de Imóvel" },
  { value: "vehicle_sale", label: "Compra e Venda de Veículo" },
  { value: "vehicle_consignation", label: "Consignação de Veículo" },
  { value: "legal_retainer", label: "Honorários Jurídicos" },
  { value: "tourism_package", label: "Turismo e Pacotes" },
  { value: "medical_aesthetic_consent", label: "Saúde e Estética" },
  { value: "fashion_retail", label: "Varejo e Condicional" },
  { value: "pos_retail", label: "Venda PDV / Crediário" },
  { value: "equipment_loan", label: "Comodato de Equipamentos" },
];

const BASE_DEFAULT_MARKDOWN = `# Instrumento Particular de Prestação de Serviços

**CONTRATANTE:** {{cliente_nome}}, inscrito(a) no CPF/CNPJ nº {{cpf}}.
**CONTRATADO(A):** {{empresa_nome}}, CNPJ {{empresa_cnpj}}.

---

### Cláusula 1ª — Do Objeto
O presente contrato tem como objeto o fornecimento de produtos e/ou prestação dos serviços descritos nas condições comerciais acordadas entre as partes no valor de {{valor_total}}.

### Cláusula 2ª — Das Condições e Prazos
Os serviços e entregas serão executados em conformidade com os prazos estabelecidos no atendimento comercial, observando-se os padrões de qualidade e sigilo previstos na Lei Geral de Proteção de Dados (Lei nº 13.709/2018).

### Cláusula 3ª — Validade Jurídica Eletrônica
As partes reconhecem expressamente a validade e eficácia jurídica da assinatura eletrônica por meio da infraestrutura Waesy, nos termos da MP 2.200-2/2001 e da Lei 14.063/2020.`;

export interface StudioSignerDraft {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  role: string;
  dispatchChannel: "whatsapp" | "email" | "sms" | "direct_link";
  authLevel: "basic" | "advanced";
  requireFacialBiometrics: boolean;
  signingOrderIndex: number;
  profileId?: string;
  colorCode: string;
}

interface ContractWorkspaceStudioProps {
  mode: "create" | "edit";
  initialContract?: any;
  initialFolderId?: string | null;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo selecionado."));
    reader.readAsDataURL(file);
  });
}

function mapAutoPositionedFieldsToDto(
  fields: ReturnType<typeof autoPositionSignatureFieldsFromContent>,
): SignatureFieldDTO[] {
  return fields.map((f) => ({
    id: f.id,
    signerIndex: f.signerIndex,
    type: (f.type === "text" ? "name" : f.type) as SignatureFieldDTO["type"],
    page: f.page,
    x: f.xPercent,
    y: f.yPercent,
    width: f.widthPercent,
    height: f.heightPercent,
    repeatMode: "page",
    label: f.label,
  }));
}

export function ContractWorkspaceStudio({
  mode,
  initialContract,
  initialFolderId = null,
}: ContractWorkspaceStudioProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const versions = useMemo(() => {
    const raw = Array.isArray(initialContract?.versions) ? initialContract.versions : [];
    return [...raw].sort((a: any, b: any) => (b.version_number || 0) - (a.version_number || 0));
  }, [initialContract]);
  const currentVersion = versions[0] || null;
  const existingEnvelopes = useMemo(
    () => (Array.isArray(currentVersion?.envelopes) ? currentVersion.envelopes : []),
    [currentVersion],
  );

  const contractStatus = (initialContract?.status || "draft").toLowerCase();
  const isSealed = Boolean(currentVersion?.is_sealed) || isContractSignedOrCompleted(contractStatus) || contractStatus === "signing";
  const isCancelled = contractStatus === "cancelled";
  const isLocked = isSealed || isCancelled;

  // Dados contextuais do workspace e usuário autenticado
  const { data: storeInfo } = useQuery({
    queryKey: ["contract-studio-store-settings"],
    queryFn: () => getStoreSettings(),
    staleTime: 60_000,
  });

  const { data: vaultFoldersData, refetch: refetchFolders } = useQuery({
    queryKey: ["contracts-vault-folders"],
    queryFn: () => listContractFolders(),
    staleTime: 30_000,
  });

  const { data: userProfile, refetch: refetchUserSig } = useQuery({
    queryKey: ["contract-user-signature-profile"],
    queryFn: () => getUserSignatureProfile(),
    staleTime: 30_000,
  });

  const storeNiche = useMemo(() => {
    const s = storeInfo as Record<string, any> | undefined;
    return s?.niche || s?.segment || s?.category || "general";
  }, [storeInfo]);

  const nicheProfile = useMemo(() => resolveContractNicheProfile(storeNiche), [storeNiche]);
  const foldersList = vaultFoldersData?.folders || [];

  // Estado principal do documento
  const [title, setTitle] = useState<string>(
    initialContract?.title || "Contrato de Prestação de Serviços",
  );
  const [category, setCategory] = useState<string>(
    initialContract?.category || nicheProfile.defaultCategory || "service_agreement",
  );
  const [folderId, setFolderId] = useState<string | null>(
    initialContract?.folder_id ?? initialFolderId ?? null,
  );
  const [contentMarkdown, setContentMarkdown] = useState<string>(
    currentVersion?.content_markdown || BASE_DEFAULT_MARKDOWN,
  );
  const [sourceFileUrl, setSourceFileUrl] = useState<string | null>(
    currentVersion?.source_file_url || null,
  );
  const [sourceFileSignedUrl, setSourceFileSignedUrl] = useState<string | null>(
    currentVersion?.sourceFileSignedUrl || null,
  );
  const [sourceFileName, setSourceFileName] = useState<string | null>(
    currentVersion?.source_file_name || null,
  );
  const [sourceFileMime, setSourceFileMime] = useState<string | null>(
    currentVersion?.source_file_mime || null,
  );
  const [pageCount, setPageCount] = useState<number>(
    Math.max(1, Number(currentVersion?.page_count || 1)),
  );
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [variablesApplied, setVariablesApplied] = useState<Record<string, string>>(
    (currentVersion?.variables as Record<string, string>) || {},
  );
  const [linkedContext, setLinkedContext] = useState<{
    entityType?: string;
    entityId?: string;
    dealId?: string;
  }>({});

  // Signatários e campos
  const [signers, setSigners] = useState<StudioSignerDraft[]>(() => {
    if (existingEnvelopes.length > 0) {
      return existingEnvelopes.map((env: any, idx: number) => ({
        name: env.signer_name || "",
        email: env.signer_email || "",
        phone: env.signer_phone || "",
        cpf: env.signer_cpf || "",
        role: env.signer_role || "party",
        dispatchChannel: env.dispatch_channel || "whatsapp",
        authLevel: env.auth_level === "advanced" ? "advanced" : "basic",
        requireFacialBiometrics: Boolean(env.require_facial_biometrics),
        signingOrderIndex: env.signing_order_index || idx + 1,
        profileId: env.signer_profile_id || undefined,
        colorCode: env.color_code || SIGNER_PALETTE[idx % SIGNER_PALETTE.length],
      }));
    }
    return [
      {
        name: "",
        email: "",
        phone: "",
        cpf: "",
        role: "party",
        dispatchChannel: "whatsapp",
        authLevel: "basic",
        requireFacialBiometrics: false,
        signingOrderIndex: 1,
        colorCode: SIGNER_PALETTE[0],
      },
    ];
  });

  const [selectedSignerIdx, setSelectedSignerIdx] = useState<number>(0);

  const [signatureFields, setSignatureFields] = useState<SignatureFieldDTO[]>(() => {
    if (Array.isArray(currentVersion?.signature_fields) && currentVersion.signature_fields.length > 0) {
      return currentVersion.signature_fields;
    }
    if (mode === "edit") {
      return mapAutoPositionedFieldsToDto(
        autoPositionSignatureFieldsFromContent(
          currentVersion?.content_markdown || BASE_DEFAULT_MARKDOWN,
          currentVersion?.page_count || 1,
          Math.max(1, existingEnvelopes.length || 1),
        ),
      );
    }
    return [];
  });

  const [dispatchSettings, setDispatchSettings] = useState<DispatchSettingsDTO>(() => ({
    signing_order: "parallel",
    send_reminders: true,
    reminder_days: 3,
    auth_mark_position: "footer",
    auth_mark_size: "standard",
    force_signature_appearance: false,
    delivery_channels: ["whatsapp", "email"],
    ...(initialContract?.dispatch_settings || {}),
  }));
  const [observers, setObservers] = useState<ObserverDTO[]>(
    Array.isArray(initialContract?.observers) ? initialContract.observers : [],
  );

  // Estado de UI da workstation
  const [leftTab, setLeftTab] = useState<"documento" | "assinantes" | "envio">(
    isSealed ? "envio" : "documento",
  );
  const [sourceMode, setSourceMode] = useState<"compose" | "upload" | "crm">(
    sourceFileUrl ? "upload" : "compose",
  );
  const [mobilePane, setMobilePane] = useState<"panel" | "canvas">("panel");
  const [showVarPicker, setShowVarPicker] = useState(false);

  // Carregamento sob demanda de fontes CRM apenas na aba Importar
  const { data: quotesRes, isLoading: isLoadingQuotes } = useQuery({
    queryKey: ["contract-studio-quotes"],
    queryFn: () => listQuotes({ data: { limit: 30 } }),
    enabled: sourceMode === "crm",
    staleTime: 30_000,
  });
  const { data: leadsList = [], isLoading: isLoadingLeads } = useQuery({
    queryKey: ["contract-studio-leads"],
    queryFn: () => listLeads(),
    enabled: sourceMode === "crm",
    staleTime: 30_000,
  });
  const { data: invoicesRes, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["contract-studio-invoices"],
    queryFn: () => listCommercialInvoices({ data: { limit: 30 } }),
    enabled: sourceMode === "crm",
    staleTime: 30_000,
  });
  const { data: proposalsList = [], isLoading: isLoadingProposals } = useQuery({
    queryKey: ["contract-studio-proposals"],
    queryFn: () => listAgencyTravelProposals(),
    enabled: sourceMode === "crm" && nicheProfile.allowTravelProposalsImport,
    staleTime: 30_000,
  });

  const [importSourceType, setImportSourceType] = useState<"quote" | "lead" | "invoice" | "proposal">("quote");
  const [importRecordId, setImportRecordId] = useState<string>("");
  const [isImportingCrm, setIsImportingCrm] = useState(false);

  // Upload e OCR
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isProcessingOcr, setIsProcessingOcr] = useState<number | null>(null);

  // Pastas & Ações
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSealing, setIsSealing] = useState(false);
  const [sealedFeedback, setSealedFeedback] = useState<any>(null);
  const [resendingEnvelopeId, setResendingEnvelopeId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Cancelamento & Assinatura Rápida do Criador
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const [quickSignOpen, setQuickSignOpen] = useState(false);
  const [quickSignToken, setQuickSignToken] = useState<string | null>(null);
  const [quickSignConsent, setQuickSignConsent] = useState(true);
  const [saveDrawnToProfile, setSaveDrawnToProfile] = useState(true);
  const [isSigningNow, setIsSigningNow] = useState(false);
  const [obsName, setObsName] = useState("");
  const [obsEmail, setObsEmail] = useState("");

  // Sincroniza template inicial coerente com o nicho na criação
  const nicheTemplates = useMemo(() => {
    const filtered = ADVANCED_CONTRACT_TEMPLATES.filter((t) => {
      if (!nicheProfile.isTourism && t.category === "tourism_package") return false;
      return true;
    });
    const orderMap = new Map(nicheProfile.preferredTemplateCategories.map((cat, idx) => [cat, idx]));
    return [...filtered].sort((a, b) => {
      const rankA = orderMap.has(a.category) ? (orderMap.get(a.category) as number) : 99;
      const rankB = orderMap.has(b.category) ? (orderMap.get(b.category) as number) : 99;
      return rankA - rankB;
    });
  }, [nicheProfile]);

  useEffect(() => {
    if (mode === "create" && !initialContract) {
      setCategory(nicheProfile.defaultCategory);
    }
  }, [mode, initialContract, nicheProfile.defaultCategory]);

  // Compila prévia ao vivo com variáveis da loja + signatário 0
  const compiledPreviewMarkdown = useMemo(() => {
    const signer0 = signers[0];
    const storeRecord = (storeInfo as Record<string, any>) || {};
    const mergedVars: Record<string, string> = {
      ...variablesApplied,
      ...(signer0?.name ? { cliente_nome: signer0.name, contratante_nome: signer0.name } : {}),
      ...(signer0?.cpf ? { cpf: signer0.cpf, cliente_documento: signer0.cpf, contratante_documento: signer0.cpf } : {}),
      ...(signer0?.email ? { email: signer0.email } : {}),
      ...(signer0?.phone ? { telefone: signer0.phone } : {}),
      ...(storeRecord?.name
        ? { empresa_nome: storeRecord.name, contratado_nome: storeRecord.name }
        : {}),
      ...(storeRecord?.cnpj
        ? { empresa_cnpj: storeRecord.cnpj, contratado_documento: storeRecord.cnpj }
        : {}),
    };
    return interpolateContractVariables(contentMarkdown, mergedVars);
  }, [contentMarkdown, signers, storeInfo, variablesApplied]);

  const signerVisualList: SignerVisualInfo[] = useMemo(
    () =>
      signers.map((s, idx) => ({
        index: idx,
        name: s.name || `Signatário ${idx + 1}`,
        email: s.email || s.phone || "Pendente",
        phone: s.phone,
        role: s.role,
        colorCode: s.colorCode || SIGNER_PALETTE[idx % SIGNER_PALETTE.length],
      })),
    [signers],
  );

  // Detecta se o usuário autenticado é um dos signatários ainda pendentes para oferecer 1-Click Sign
  const activeEnvelopes = useMemo(() => {
    if (sealedFeedback?.envelopes?.length) return sealedFeedback.envelopes;
    return existingEnvelopes;
  }, [sealedFeedback, existingEnvelopes]);

  const myPendingEnvelope = useMemo(() => {
    if (!userProfile?.authenticated || !activeEnvelopes.length) return null;
    const myEmail = (userProfile.email || "").trim().toLowerCase();
    return (
      activeEnvelopes.find((env: any) => {
        if (env.status === "signed" || env.status === "cancelled") return false;
        if (env.signer_profile_id && userProfile.profileId && env.signer_profile_id === userProfile.profileId) {
          return true;
        }
        if (myEmail && (env.signer_email || "").trim().toLowerCase() === myEmail) {
          return true;
        }
        return false;
      }) || null
    );
  }, [userProfile, activeEnvelopes]);

  // ─── Manipuladores de Documento e Upload ────────────────────────────────────

  const insertTextAtCursor = (snippet: string) => {
    const textarea = document.getElementById("contract-studio-markdown-editor") as HTMLTextAreaElement | null;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const next = contentMarkdown.slice(0, start) + snippet + contentMarkdown.slice(end);
      setContentMarkdown(next);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + snippet.length, start + snippet.length);
      }, 20);
    } else {
      setContentMarkdown((prev) => `${prev}\n${snippet}`);
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    const tpl = ADVANCED_CONTRACT_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setTitle(tpl.title);
    setCategory(tpl.category);
    const body = tpl.clauses.map((c) => `### ${c.order}. ${c.title}\n${c.content}`).join("\n\n");
    setContentMarkdown(`# ${tpl.title}\n\n*Base legal: ${tpl.legal_framework}*\n\n${body}`);
    toast.success(`Modelo "${tpl.title}" carregado no editor.`);
  };

  const handleUploadRealDocument = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("O arquivo ultrapassa o limite máximo de 20 MB.");
      return;
    }

    setIsUploadingDoc(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const parsed = await parseUploadedContractDocument({
        name: file.name,
        mimeType: file.type,
        bytes,
      });

      const base64Data = await readFileAsDataUrl(file);
      const uploaded = await uploadMediaUniversal({
        data: {
          fileName: file.name,
          fileType: parsed.mimeType || file.type || "application/octet-stream",
          base64Data,
          bucket: "legal-documents",
          folder: "contracts",
        },
      });

      setTitle(parsed.title || title);
      setSourceFileUrl(uploaded.path);
      setSourceFileSignedUrl(uploaded.signedUrl || uploaded.url);
      setSourceFileName(file.name);
      setSourceFileMime(parsed.mimeType);
      setPageCount(Math.max(1, parsed.pageCount));
      setCurrentPage(1);

      if (parsed.kind === "docx" || parsed.kind === "markdown" || parsed.kind === "text") {
        setContentMarkdown(parsed.markdown || `Documento importado: ${file.name}`);
      } else if (!contentMarkdown.trim() || contentMarkdown === BASE_DEFAULT_MARKDOWN) {
        setContentMarkdown(`# ${parsed.title}\n\nDocumento original anexado: **${file.name}** (${parsed.pageCount} página(s)).`);
      }

      toast.success(`Arquivo "${file.name}" carregado com ${parsed.pageCount} página(s).`);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao processar o arquivo enviado.");
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleImportFromCrm = async () => {
    if (!importRecordId) {
      toast.error("Selecione um registro para importar.");
      return;
    }
    setIsImportingCrm(true);
    try {
      let customerData: any = { name: "Cliente" };
      let totalValueCents = 0;
      let paymentConditions = "Conforme acordo comercial aprovado";
      let docTitle = title;
      let items: Array<{ title: string; unit?: string; quantity: number; unitPriceCents: number; totalPriceCents: number }> = [];
      let specs: Array<{ label: string; value: string }> = [];
      let itinerary: Array<{ day: number | string; title: string; description?: string }> = [];
      let customFields: Record<string, unknown> = {};
      let entityType = "quote";

      if (importSourceType === "quote") {
        const detail: any = await getQuoteDetail({ data: { quote_id: importRecordId } });
        customerData = {
          name: detail?.customer?.name || "Cliente",
          document: detail?.customer?.document || "",
          phone: detail?.customer?.phone || "",
          email: detail?.customer?.email || "",
        };
        totalValueCents = Number(detail?.total_cents || 0);
        docTitle = `Contrato — ${detail?.quote_number || "Orçamento"} (${customerData.name})`;
        customFields = normalizeCustomFieldMap(detail?.custom_fields || {});
        items = Array.isArray(detail?.items)
          ? detail.items.map((it: any) => ({
              title: it.title || "Item",
              quantity: Number(it.quantity || 1),
              unitPriceCents: Number(it.unit_price_cents || 0),
              totalPriceCents: Number(it.line_total_cents || it.unit_price_cents || 0),
            }))
          : [];
        entityType = "quote";
      } else if (importSourceType === "lead") {
        const lead: any = (leadsList as any[]).find((l) => l.id === importRecordId);
        if (!lead) throw new Error("Lead não encontrado.");
        customFields = normalizeCustomFieldMap(lead.custom_fields || {});
        customerData = {
          name: lead.full_name || "Cliente",
          document: String(customFields.cpf || customFields.document || ""),
          phone: lead.phone || "",
          email: lead.email || "",
        };
        totalValueCents = Number(lead.estimated_value_cents || 0);
        docTitle = `Contrato — ${lead.title || lead.full_name}`;
        items = [
          {
            title: lead.title || "Objeto Negociado",
            unit: "un",
            quantity: 1,
            unitPriceCents: totalValueCents,
            totalPriceCents: totalValueCents,
          },
        ];
        entityType = "lead";
      } else if (importSourceType === "proposal" && nicheProfile.allowTravelProposalsImport) {
        const prop: any = (proposalsList as any[]).find((p) => p.id === importRecordId);
        if (!prop) throw new Error("Proposta não encontrada.");
        customerData = {
          name: prop.client_name || "Viajante",
          document: prop.client_document || "",
          phone: prop.client_whatsapp || "",
          email: prop.client_email || "",
        };
        totalValueCents = Number(prop.pricing?.total_price_cents || 0);
        docTitle = `Contrato de Viagem — ${prop.title || prop.destination_city || customerData.name}`;
        items = [
          {
            title: prop.title || `Pacote ${prop.destination_city || ""}`,
            unit: "pacote",
            quantity: 1,
            unitPriceCents: totalValueCents,
            totalPriceCents: totalValueCents,
          },
        ];
        itinerary = Array.isArray(prop.itinerary)
          ? prop.itinerary.map((d: any, i: number) => ({
              day: d.day_number || i + 1,
              title: d.title || `Dia ${i + 1}`,
              description: d.description || "",
            }))
          : [];
        entityType = "travel_proposal";
      } else {
        const invRow: any = ((invoicesRes as any)?.invoices || []).find((i: any) => i.id === importRecordId);
        if (!invRow?.public_token) throw new Error("Fatura não encontrada.");
        const invRes: any = await getCommercialInvoiceByPublicToken({ data: { token: invRow.public_token } });
        customerData = {
          name: invRes?.customer_name || "Cliente",
          document: invRes?.customer_document || "",
          phone: invRes?.customer_phone || "",
          email: invRes?.customer_email || "",
        };
        totalValueCents = Number(invRes?.amount_cents || 0);
        docTitle = `Contrato — Fatura (${customerData.name})`;
        items = [
          {
            title: invRes?.title || "Faturamento Comercial",
            unit: "serviço",
            quantity: 1,
            unitPriceCents: totalValueCents,
            totalPriceCents: totalValueCents,
          },
        ];
        entityType = "commercial_invoice";
      }

      const storeRecord = (storeInfo as Record<string, any>) || {};
      const compiled = compileContractDocument({
        title: docTitle,
        nicheHint: storeNiche,
        issuer: { name: storeRecord?.name || "Empresa Contratada", document: storeRecord?.cnpj || "" },
        customer: customerData,
        items,
        specs,
        itinerary,
        customFields,
        totalValueCents,
        paymentConditions,
      });

      const blueprint = getNicheContractBlueprint(storeNiche);
      setTitle(docTitle);
      setCategory(blueprint.contractCategory || category);
      setContentMarkdown(compiled.contentMarkdown);
      setVariablesApplied(compiled.variablesApplied || {});
      setLinkedContext({ entityType, entityId: importRecordId });
      setPageCount(Math.max(1, paginateContractMarkdown(compiled.contentMarkdown).length));
      setSigners((prev) => [
        {
          ...prev[0],
          name: customerData.name || prev[0]?.name || "",
          email: customerData.email || prev[0]?.email || "",
          phone: customerData.phone || prev[0]?.phone || "",
          cpf: customerData.document || prev[0]?.cpf || "",
          dispatchChannel: customerData.phone ? "whatsapp" : "email",
        },
        ...prev.slice(1),
      ]);
      toast.success("Dados comerciais compilados na minuta.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao importar dados do negócio.");
    } finally {
      setIsImportingCrm(false);
    }
  };

  // ─── Manipuladores de Signatários e Tags ────────────────────────────────────

  const handleIncludeMeAsSigner = () => {
    if (!userProfile?.authenticated) {
      toast.error("Faça login para incluir seus dados como signatário.");
      return;
    }
    const alreadyExists = signers.some(
      (s) =>
        (s.profileId && s.profileId === userProfile.profileId) ||
        (userProfile.email && s.email.toLowerCase() === userProfile.email.toLowerCase()),
    );
    if (alreadyExists) {
      toast.info("Você já faz parte da lista de signatários deste contrato.");
      return;
    }

    const myEntry: StudioSignerDraft = {
      name: userProfile.fullName || "Responsável pela Empresa",
      email: userProfile.email || "",
      phone: userProfile.phone || "",
      cpf: userProfile.cpf || "",
      role: "party",
      dispatchChannel: userProfile.email ? "email" : "whatsapp",
      authLevel: "basic",
      requireFacialBiometrics: false,
      signingOrderIndex: signers.length + 1,
      profileId: userProfile.profileId || undefined,
      colorCode: SIGNER_PALETTE[signers.length % SIGNER_PALETTE.length],
    };

    if (signers.length === 1 && !signers[0].name.trim()) {
      setSigners([{ ...myEntry, colorCode: signers[0].colorCode }]);
      setSelectedSignerIdx(0);
    } else {
      setSigners((prev) => [...prev, myEntry]);
      setSelectedSignerIdx(signers.length);
    }
    toast.success("Seus dados foram adicionados aos signatários.");
  };

  const handleSignerOcr = async (idx: number, file: File | undefined) => {
    if (!file) return;
    setIsProcessingOcr(idx);
    try {
      const base64 = (await readFileAsDataUrl(file)).split(",")[1] || "";
      const extracted = await extractContractDataFromOcr({
        data: { base64, mimeType: file.type || "image/jpeg" },
      });
      setSigners((prev) =>
        prev.map((s, i) =>
          i === idx
            ? {
                ...s,
                name: extracted.name || s.name,
                cpf: extracted.document || s.cpf,
              }
            : s,
        ),
      );
      toast.success("Documento lido com OCR e aplicado ao signatário.");
    } catch {
      toast.error("Não foi possível ler o documento via OCR.");
    } finally {
      setIsProcessingOcr(null);
    }
  };

  const handleAddFieldToPage = (tagType: SignatureFieldDTO["type"]) => {
    if (isLocked) return;
    const tag = FIELD_TAGS.find((t) => t.type === tagType);
    const active = signerVisualList[selectedSignerIdx] || signerVisualList[0];
    if (!active) return;

    const newField: SignatureFieldDTO = {
      id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      signerIndex: active.index,
      signerEmail: signers[selectedSignerIdx]?.email || "",
      type: tagType,
      page: currentPage,
      x: 16 + (signatureFields.length % 4) * 14,
      y: 72 - (signatureFields.length % 3) * 10,
      width: tag?.defaultW || 24,
      height: tag?.defaultH || 7,
      repeatMode: "page",
      label: `${tag?.label || tagType} · ${active.name.split(" ")[0]}`,
    };
    setSignatureFields((prev) => [...prev, newField]);
    setMobilePane("canvas");
    toast.success(`Campo "${tag?.label || tagType}" adicionado na página ${currentPage}.`);
  };

  const handleAutoPosition = () => {
    const auto = mapAutoPositionedFieldsToDto(
      autoPositionSignatureFieldsFromContent(
        compiledPreviewMarkdown,
        Math.max(1, pageCount),
        Math.max(1, signers.length),
      ),
    );
    setSignatureFields(auto);
    toast.success(`${auto.length} campo(s) posicionado(s) automaticamente.`);
  };

  // ─── Pastas, Salvamento, Selagem & Ações Pós-Envio ─────────────────────────

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      const res = await createContractFolder({ data: { name } });
      await refetchFolders();
      setFolderId(res.folder.id);
      if (mode === "edit" && initialContract?.id) {
        await moveContractToFolder({ data: { contractId: initialContract.id, folderId: res.folder.id } });
      }
      setNewFolderName("");
      setCreatingFolder(false);
      toast.success(`Pasta "${res.folder.name}" criada e vinculada.`);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar pasta.");
    }
  };

  const handleFolderSelectChange = async (value: string) => {
    const nextFolderId = value === "__none__" ? null : value;
    setFolderId(nextFolderId);
    if (mode === "edit" && initialContract?.id) {
      try {
        await moveContractToFolder({
          data: { contractId: initialContract.id, folderId: nextFolderId },
        });
        await queryClient.invalidateQueries({ queryKey: ["contracts-list"] });
        await refetchFolders();
        toast.success("Pasta do cofre atualizada.");
      } catch (err: any) {
        toast.error(err?.message || "Erro ao mover contrato para a pasta.");
      }
    }
  };

  const handleCreateNewContract = async () => {
    if (!title.trim() || title.trim().length < 3) {
      toast.error("Informe um título com pelo menos 3 caracteres.");
      return;
    }
    setIsSavingDraft(true);
    try {
      const safeMarkdown =
        compiledPreviewMarkdown.trim().length >= 10
          ? compiledPreviewMarkdown
          : `# ${title.trim()}\n\nDocumento contratual cadastrado via Workspace.`;

      const effectivePages = Math.max(
        pageCount,
        paginateContractMarkdown(safeMarkdown).length,
        1,
      );

      const { contract } = await createContract({
        data: {
          title: title.trim(),
          category: category as any,
          contentMarkdown: safeMarkdown,
          variables: variablesApplied,
          folderId: folderId || undefined,
          entityType: linkedContext.entityType,
          entityId: linkedContext.entityId,
          dealId: linkedContext.dealId,
          signatureFields,
          pageCount: effectivePages,
          sourceFileUrl: sourceFileUrl || undefined,
          sourceFileName: sourceFileName || undefined,
          sourceFileMime: sourceFileMime || undefined,
          dispatchSettings,
          observers,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["contracts-list"] });
      toast.success("Minuta criada. Posicione as assinaturas e realize o envio.");
      navigate({ to: `/workspace/contratos/${contract.id}/editor` });
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível criar o contrato.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!initialContract?.id || !currentVersion?.id) return;
    setIsSavingDraft(true);
    try {
      const safeMarkdown =
        contentMarkdown.trim().length >= 10
          ? contentMarkdown
          : `# ${title.trim() || "Contrato"}\n\nDocumento contratual em edição.`;
      const effectivePages = Math.max(pageCount, paginateContractMarkdown(safeMarkdown).length, 1);

      await updateContractDraft({
        data: {
          contractId: initialContract.id,
          versionId: currentVersion.id,
          title: title.trim(),
          category: category as any,
          contentMarkdown: safeMarkdown,
          signatureFields,
          pageCount: effectivePages,
          sourceFileUrl,
          sourceFileName,
          sourceFileMime,
          folderId,
          dispatchSettings,
          observers,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["contracts-list"] });
      toast.success("Rascunho salvo com segurança.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar rascunho.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSealAndSend = async () => {
    if (!initialContract?.id || !currentVersion?.id) return;
    if (signers.some((s) => s.name.trim().length < 2)) {
      toast.error("Preencha o nome completo de todos os signatários.");
      setLeftTab("assinantes");
      return;
    }

    setIsSealing(true);
    try {
      // Salva alterações finais de texto/campos/pasta antes da selagem atômica
      await updateContractDraft({
        data: {
          contractId: initialContract.id,
          versionId: currentVersion.id,
          title: title.trim(),
          contentMarkdown: compiledPreviewMarkdown.trim().length >= 10 ? compiledPreviewMarkdown : contentMarkdown,
          signatureFields,
          pageCount: Math.max(pageCount, paginateContractMarkdown(compiledPreviewMarkdown).length, 1),
          sourceFileUrl,
          sourceFileName,
          sourceFileMime,
          folderId,
          dispatchSettings,
          observers,
        },
      });

      const preparedSigners = signers.map((s, idx) => {
        const cleanEmail = s.email.trim();
        const safeEmail =
          cleanEmail && cleanEmail.includes("@")
            ? cleanEmail
            : `signer.${idx + 1}.${Date.now()}@contato.waesy.internal`;
        return {
          name: s.name.trim(),
          email: safeEmail,
          phone: s.phone.trim() || undefined,
          cpf: s.cpf.trim() || undefined,
          role: s.role,
          authLevel: s.authLevel,
          dispatchChannel: s.dispatchChannel,
          signingOrderIndex: dispatchSettings.signing_order === "sequential" ? idx + 1 : 1,
          colorCode: s.colorCode || SIGNER_PALETTE[idx % SIGNER_PALETTE.length],
          requireFacialBiometrics: s.requireFacialBiometrics,
          requireCpfConfirmation: Boolean(s.cpf.trim()),
          profileId: s.profileId || undefined,
        };
      });

      const res = await sealAndIssueContract({
        data: {
          contractId: initialContract.id,
          versionId: currentVersion.id,
          signatureFields,
          signers: preparedSigners,
        },
      });

      setSealedFeedback(res);
      setLeftTab("envio");
      await queryClient.invalidateQueries({ queryKey: ["contracts-list"] });
      toast.success("Documento selado com SHA-256 e envelopes emitidos!");

      // Se o criador/membro logado estiver entre os signatários, abre imediatamente o modal de auto-assinatura em 1 clique
      if (userProfile?.authenticated && Array.isArray(res?.envelopes)) {
        const myEmail = (userProfile.email || "").trim().toLowerCase();
        const creatorEnv = res.envelopes.find((env: any) => {
          if (env.status === "signed" || env.status === "cancelled") return false;
          if (env.signer_profile_id && userProfile.profileId && env.signer_profile_id === userProfile.profileId) {
            return true;
          }
          if (myEmail && (env.signer_email || "").trim().toLowerCase() === myEmail) {
            return true;
          }
          return false;
        });
        const creatorSigningToken =
          typeof (creatorEnv as Record<string, unknown> | undefined)?.signing_token === "string"
            ? String((creatorEnv as Record<string, unknown>).signing_token)
            : typeof creatorEnv?.signingUrl === "string"
              ? creatorEnv.signingUrl.split("/assinar/")[1] || ""
              : "";
        if (creatorSigningToken) {
          setQuickSignToken(creatorSigningToken);
          setQuickSignOpen(true);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao selar e emitir o contrato.");
    } finally {
      setIsSealing(false);
    }
  };

  const handleResendEnvelope = async (envelopeId: string, channel?: "whatsapp" | "email" | "direct_link") => {
    setResendingEnvelopeId(envelopeId);
    try {
      const res = await resendContractEnvelope({ data: { envelopeId, channel } });
      await queryClient.invalidateQueries({ queryKey: ["contracts-list"] });
      if (res.queuedWhatsapp) {
        toast.success(`Lembrete #${res.reminderCount} enviado pela fila oficial do WhatsApp.`);
      } else if (res.manualWhatsappUrl && channel === "whatsapp") {
        window.open(res.manualWhatsappUrl, "_blank", "noopener,noreferrer");
        toast.info("WhatsApp Web aberto com a mensagem pronta.");
      } else {
        await navigator.clipboard?.writeText(res.fullUrl).catch(() => null);
        toast.success(`Link de assinatura copiado (Lembrete #${res.reminderCount}).`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao reenviar notificação.");
    } finally {
      setResendingEnvelopeId(null);
    }
  };

  const handleCancelContract = async () => {
    if (!initialContract?.id) return;
    setIsCancelling(true);
    try {
      await cancelContract({
        data: {
          contractId: initialContract.id,
          reason: cancelReason.trim() || "Cancelado pelo administrador no editor.",
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["contracts-list"] });
      setCancelDialogOpen(false);
      toast.success("Contrato cancelado e auditado.");
      navigate({ to: "/workspace/contratos" });
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível cancelar o contrato.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleQuickSignConfirm = async (signatureImageBase64: string) => {
    if (!quickSignToken) return;
    if (!quickSignConsent) {
      toast.error("Confirme o consentimento eletrônico antes de assinar.");
      return;
    }
    setIsSigningNow(true);
    try {
      if (saveDrawnToProfile && !userProfile?.savedSignature) {
        await saveUserSignatureAndInitials({
          data: { signatureImageBase64 },
        }).catch(() => null);
        await refetchUserSig();
      }
      await signContractEnvelope({
        data: {
          signingToken: quickSignToken,
          consent: true,
          signatureImageBase64,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Waesy Studio",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      setQuickSignOpen(false);
      setQuickSignToken(null);
      await queryClient.invalidateQueries({ queryKey: ["contracts-list"] });
      toast.success("Sua assinatura foi aplicada com validade jurídica.");
      if (initialContract?.id) {
        window.location.reload();
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao aplicar sua assinatura.");
    } finally {
      setIsSigningNow(false);
    }
  };

  const handleDownloadPdf = async () => {
    const categoryLabel =
      CATEGORY_OPTIONS.find((c) => c.value === category)?.label || category || "Contrato";
    await downloadSignedContractPackagePdf({
      title,
      categoryLabel,
      statusLabel: formatContractStatusLabel(sealedFeedback ? "signing" : contractStatus),
      contentMarkdown: compiledPreviewMarkdown,
      verificationCode: initialContract?.verification_code || null,
      hashSha256: sealedFeedback?.hashSha256 || currentVersion?.hash_sha256 || null,
      sealedAt: currentVersion?.sealed_at || new Date().toISOString(),
      sourceFileSignedUrl,
      sourceFileName,
      signers: activeEnvelopes.map((env: any) => ({
        name: env.signer_name || "Signatário",
        email: env.signer_email || null,
        phone: env.signer_phone || null,
        document: env.signer_cpf || null,
        role: env.signer_role || "party",
        status: env.status || "pending",
        viewedAt: env.viewed_at || null,
        signedAt: env.signed_at || null,
      })),
    });
  };

  // Opções dinâmicas de registro na importação do CRM
  const crmRecordOptions = useMemo(() => {
    if (importSourceType === "quote") {
      return ((quotesRes as any)?.quotes || []).map((q: any) => ({
        id: q.id,
        label: `${q.quote_number || "Orçamento"} — ${q.customer_name || "Cliente"} (${formatMoney(q.total_cents || 0)})`,
      }));
    }
    if (importSourceType === "lead") {
      return (leadsList as any[]).map((l) => ({
        id: l.id,
        label: `${l.full_name || l.title || "Lead"} (${l.estimated_value_cents ? formatMoney(l.estimated_value_cents) : "Em aberto"})`,
      }));
    }
    if (importSourceType === "proposal" && nicheProfile.allowTravelProposalsImport) {
      return (proposalsList as any[]).map((p) => ({
        id: p.id,
        label: `${p.title || p.destination_city || "Proposta"} — ${p.client_name || "Cliente"}`,
      }));
    }
    return ((invoicesRes as any)?.invoices || []).map((inv: any) => ({
      id: inv.id,
      label: `${inv.title || "Fatura"} — ${inv.customer_name || "Cliente"} (${formatMoney(inv.amount_cents || 0)})`,
    }));
  }, [importSourceType, quotesRes, leadsList, proposalsList, invoicesRes, nicheProfile.allowTravelProposalsImport]);

  const effectivePagesCount = Math.max(
    pageCount,
    paginateContractMarkdown(compiledPreviewMarkdown).length,
    1,
  );

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      {/* Barra Superior Compacta da Estação de Trabalho */}
      <header className="shrink-0 min-h-14 px-4 py-2 border-b border-border bg-card flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-11 min-h-11 sm:h-9 sm:min-h-0 px-3 shrink-0"
          >
            <Link to="/workspace/contratos" aria-label="Voltar ao Cofre de Contratos">
              <ArrowLeft className="size-4 mr-1" />
              <span className="hidden sm:inline">Cofre</span>
            </Link>
          </Button>

          <Input
            value={title}
            disabled={isLocked}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Título do contrato"
            placeholder="Título do contrato..."
            className="h-10 max-w-sm font-semibold text-sm bg-muted/30 border-border/70"
          />

          <Badge
            variant={isContractSignedOrCompleted(contractStatus) ? "default" : "outline"}
            className="shrink-0 text-xs"
          >
            {formatContractStatusLabel(sealedFeedback ? "signing" : contractStatus)}
          </Badge>

          {sourceFileName && (
            <Badge variant="secondary" className="hidden md:inline-flex items-center gap-1 text-xs shrink-0 max-w-48 truncate">
              <FileCheck2 className="size-3.5 shrink-0" />
              <span className="truncate">{sourceFileName}</span>
            </Badge>
          )}
        </div>

        {/* Toggle Mobile + Ações Principais (Máximo 1 CTA primário) */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex lg:hidden items-center bg-muted p-1 rounded-lg gap-1">
            <Button
              type="button"
              size="sm"
              variant={mobilePane === "panel" ? "default" : "ghost"}
              onClick={() => setMobilePane("panel")}
              className="h-11 min-h-11 px-3 text-xs"
            >
              Painel
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mobilePane === "canvas" ? "default" : "ghost"}
              onClick={() => setMobilePane("canvas")}
              className="h-11 min-h-11 px-3 text-xs"
            >
              Folha A4
            </Button>
          </div>

          {mode === "create" ? (
            <Button
              type="button"
              onClick={handleCreateNewContract}
              disabled={isSavingDraft}
              className="h-11 min-h-11 sm:h-9 sm:min-h-0 px-4 text-xs font-semibold gap-2"
            >
              {isSavingDraft ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <PenTool className="size-4" />}
              <span>Criar e Posicionar Campos</span>
            </Button>
          ) : !isLocked ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSavingDraft || isSealing}
                className="h-11 min-h-11 sm:h-9 sm:min-h-0 px-3 text-xs font-medium"
              >
                {isSavingDraft ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none mr-2" /> : null}
                Salvar Rascunho
              </Button>
              <Button
                type="button"
                onClick={handleSealAndSend}
                disabled={isSealing || isSavingDraft}
                className="h-11 min-h-11 sm:h-9 sm:min-h-0 px-4 text-xs font-semibold gap-2"
              >
                {isSealing ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <Send className="size-4" />}
                <span>Selar e Enviar</span>
              </Button>
            </>
          ) : (
            <>
              {initialContract?.verification_code && (
                <Button
                  asChild
                  variant="outline"
                  className="h-11 min-h-11 sm:h-9 sm:min-h-0 px-3 text-xs font-medium gap-2"
                >
                  <Link
                    to="/verify/document/$code"
                    params={{ code: initialContract.verification_code }}
                    target="_blank"
                  >
                    <QrCode className="size-3.5" />
                    <span className="hidden sm:inline">Certificado</span>
                  </Link>
                </Button>
              )}
              <Button
                type="button"
                onClick={handleDownloadPdf}
                className="h-11 min-h-11 sm:h-9 sm:min-h-0 px-4 text-xs font-semibold gap-2"
              >
                <Download className="size-4" />
                <span>Baixar PDF</span>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Workstation Dual-Column (Coluna 2 Contextual + Folha A4 Interativa) */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Coluna 2 Contextual (Painel de Edição, Upload, Assinantes, Pastas & Rastreamento) */}
        <aside
          className={cn(
            "w-full lg:w-96 xl:w-108 shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-card flex flex-col min-h-0 overflow-hidden",
            mobilePane === "panel" ? "flex flex-1 lg:flex-initial" : "hidden lg:flex",
          )}
        >
          {/* Seletor Contextual de 3 Etapas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-border bg-muted/30 p-1 gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setLeftTab("documento")}
              className={cn(
                "h-11 min-h-11 sm:h-9 sm:min-h-0 rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                leftTab === "documento"
                  ? "bg-card text-foreground shadow-2xs border border-border/70"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Documento
            </button>
            <button
              type="button"
              onClick={() => setLeftTab("assinantes")}
              className={cn(
                "h-11 min-h-11 sm:h-9 sm:min-h-0 rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                leftTab === "assinantes"
                  ? "bg-card text-foreground shadow-2xs border border-border/70"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Assinantes ({signers.length})
            </button>
            <button
              type="button"
              onClick={() => setLeftTab("envio")}
              className={cn(
                "h-11 min-h-11 sm:h-9 sm:min-h-0 rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                leftTab === "envio"
                  ? "bg-card text-foreground shadow-2xs border border-border/70"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Cofre & Envio
            </button>
          </div>

          {/* Área Rolável da Coluna Contextual */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* TAB 1: DOCUMENTO (Redigir Word / Subir PDF-DOCX-MD / Importar CRM) */}
            {leftTab === "documento" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-muted/40 p-1 rounded-lg">
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => setSourceMode("compose")}
                    className={cn(
                      "h-10 min-h-11 sm:min-h-0 rounded-md text-xs font-medium px-2 flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      sourceMode === "compose" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground",
                    )}
                  >
                    <FileText className="size-3.5 shrink-0" />
                    <span>Minuta</span>
                  </button>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => setSourceMode("upload")}
                    className={cn(
                      "h-10 min-h-11 sm:min-h-0 rounded-md text-xs font-medium px-2 flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      sourceMode === "upload" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground",
                    )}
                  >
                    <Upload className="size-3.5 shrink-0" />
                    <span>Upload</span>
                  </button>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => setSourceMode("crm")}
                    className={cn(
                      "h-10 min-h-11 sm:min-h-0 rounded-md text-xs font-medium px-2 flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      sourceMode === "crm" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground",
                    )}
                  >
                    <Database className="size-3.5 shrink-0" />
                    <span>Negócio</span>
                  </button>
                </div>

                {/* Categoria Jurídica */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Categoria do Documento</Label>
                  <Select value={category} disabled={isLocked} onValueChange={setCategory}>
                    <SelectTrigger className="h-11 sm:h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.filter(
                        (opt) =>
                          nicheProfile.isTourism ||
                          opt.value !== "tourism_package" ||
                          category === "tourism_package",
                      ).map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {sourceMode === "upload" && (
                  <div className="space-y-3">
                    <label
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-5 text-center transition-colors",
                        isLocked
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:border-primary/50 hover:bg-muted/30 cursor-pointer",
                      )}
                    >
                      {isUploadingDoc ? (
                        <Loader2 className="size-6 animate-spin motion-reduce:animate-none text-primary" />
                      ) : (
                        <Upload className="size-6 text-primary" />
                      )}
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-foreground">
                          {isUploadingDoc
                            ? "Processando e enviando arquivo..."
                            : sourceFileName
                            ? "Substituir arquivo do contrato"
                            : "Enviar PDF, Word (.docx), Markdown ou Imagem"}
                        </p>
                        <p className="text-xs text-muted-foreground">Até 20 MB no cofre privado</p>
                      </div>
                      <input
                        type="file"
                        disabled={isLocked || isUploadingDoc}
                        accept=".pdf,.docx,.md,.markdown,.txt,image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={(e) => {
                          handleUploadRealDocument(e.target.files?.[0]);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>

                    {sourceFileName && (
                      <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileCheck2 className="size-4 text-emerald-600 shrink-0" />
                          <span className="truncate font-medium text-foreground">{sourceFileName}</span>
                        </div>
                        {!isLocked && (
                          <button
                            type="button"
                            onClick={() => {
                              setSourceFileUrl(null);
                              setSourceFileSignedUrl(null);
                              setSourceFileName(null);
                              setSourceFileMime(null);
                            }}
                            className="text-xs text-muted-foreground hover:text-destructive shrink-0 min-h-11 sm:min-h-0 px-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {sourceMode === "crm" && (
                  <div className="space-y-3 rounded-lg bg-muted/30 p-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Origem dos Dados</Label>
                      <Select
                        value={importSourceType}
                        onValueChange={(val: any) => {
                          setImportSourceType(val);
                          setImportRecordId("");
                        }}
                      >
                        <SelectTrigger className="h-11 sm:h-9 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="quote">Orçamentos Aprovados</SelectItem>
                          <SelectItem value="lead">Negócios e Clientes (CRM)</SelectItem>
                          <SelectItem value="invoice">Faturas e Cobranças</SelectItem>
                          {nicheProfile.allowTravelProposalsImport && (
                            <SelectItem value="proposal">Propostas de Viagem</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Registro Selecionado</Label>
                      <Select value={importRecordId} onValueChange={setImportRecordId}>
                        <SelectTrigger className="h-11 sm:h-9 text-xs bg-background">
                          <SelectValue placeholder="Escolha um registro..." />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingQuotes || isLoadingLeads || isLoadingInvoices || isLoadingProposals ? (
                            <SelectItem value="__loading__" disabled>
                              Carregando registros...
                            </SelectItem>
                          ) : crmRecordOptions.length === 0 ? (
                            <SelectItem value="__empty__" disabled>
                              Nenhum registro disponível neste setor
                            </SelectItem>
                          ) : (
                            crmRecordOptions.map((item: { id: string; label: string }) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleImportFromCrm}
                      disabled={isImportingCrm || !importRecordId || isLocked}
                      className="w-full h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs font-semibold"
                    >
                      {isImportingCrm ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none mr-2" /> : null}
                      Compilar na Minuta
                    </Button>
                  </div>
                )}

                {sourceMode === "compose" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Modelos Prontos do Setor
                    </Label>
                    <Select onValueChange={handleApplyTemplate} disabled={isLocked}>
                      <SelectTrigger className="h-11 sm:h-9 text-xs">
                        <SelectValue placeholder="Aplicar minuta jurídica pronta..." />
                      </SelectTrigger>
                      <SelectContent>
                        {nicheTemplates.map((tpl) => (
                          <SelectItem key={tpl.id} value={tpl.id}>
                            {tpl.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Editor Estilo Word (Sempre acessível para ajustar texto ou gerar minuta sobre DOCX/MD) */}
                <div className="space-y-2 pt-2 border-t border-border/70">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <Label htmlFor="contract-studio-markdown-editor" className="text-xs font-semibold text-foreground">
                      Redação do Instrumento
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowVarPicker((prev) => !prev)}
                      className="h-11 min-h-11 sm:h-8 sm:min-h-0 px-2 text-xs text-primary gap-1"
                    >
                      <Sparkles className="size-3.5" />
                      <span>Campos Automáticos</span>
                    </Button>
                  </div>

                  {/* Barra de Formatação Estilo Word */}
                  {!isLocked && (
                    <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted/40 p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Inserir título principal"
                        onClick={() => insertTextAtCursor("\n# Título da Seção\n")}
                        className="h-11 min-h-11 sm:h-8 sm:min-h-0 px-2 text-xs"
                      >
                        <Heading1 className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Inserir cláusula"
                        onClick={() => insertTextAtCursor("\n### Cláusula — ")}
                        className="h-11 min-h-11 sm:h-8 sm:min-h-0 px-2 text-xs"
                      >
                        <Heading2 className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Inserir texto em negrito"
                        onClick={() => insertTextAtCursor("**texto em destaque**")}
                        className="h-11 min-h-11 sm:h-8 sm:min-h-0 px-2 text-xs"
                      >
                        <Bold className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Inserir tabela"
                        onClick={() =>
                          insertTextAtCursor("\n| Descrição | Qtde | Valor |\n| :--- | :---: | ---: |\n| Item | 1 | R$ 0,00 |\n")
                        }
                        className="h-11 min-h-11 sm:h-8 sm:min-h-0 px-2 text-xs"
                      >
                        <TableIcon className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Inserir linha divisória"
                        onClick={() => insertTextAtCursor("\n---\n")}
                        className="h-11 min-h-11 sm:h-8 sm:min-h-0 px-2 text-xs"
                      >
                        <Minus className="size-3.5" />
                      </Button>
                    </div>
                  )}

                  {showVarPicker && !isLocked && (
                    <ContractVariablePicker
                      storeNiche={storeNiche}
                      onInsertVariable={(token) => insertTextAtCursor(` ${token} `)}
                    />
                  )}

                  <Textarea
                    id="contract-studio-markdown-editor"
                    rows={12}
                    disabled={isLocked}
                    value={contentMarkdown}
                    onChange={(e) => {
                      const val = e.target.value;
                      setContentMarkdown(val);
                      if (!sourceFileUrl) {
                        setPageCount(Math.max(1, paginateContractMarkdown(val).length));
                      }
                    }}
                    placeholder="Redija as cláusulas do contrato..."
                    className="font-mono text-xs leading-relaxed resize-y"
                  />
                </div>
              </>
            )}

            {/* TAB 2: ASSINANTES E PALETA DE CAMPOS */}
            {leftTab === "assinantes" && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground">Ordem de Coleta</p>
                    <p className="text-xs text-muted-foreground">
                      {dispatchSettings.signing_order === "sequential" ? "Sequencial" : "Simultânea"}
                    </p>
                  </div>
                  <div className="flex items-center bg-muted p-1 rounded-lg">
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() =>
                        setDispatchSettings((prev) => ({ ...prev, signing_order: "parallel" }))
                      }
                      className={cn(
                        "px-3 h-11 min-h-11 sm:h-8 sm:min-h-0 rounded-md text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        dispatchSettings.signing_order === "parallel"
                          ? "bg-card text-foreground shadow-2xs"
                          : "text-muted-foreground",
                      )}
                    >
                      Paralela
                    </button>
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() =>
                        setDispatchSettings((prev) => ({ ...prev, signing_order: "sequential" }))
                      }
                      className={cn(
                        "px-3 h-11 min-h-11 sm:h-8 sm:min-h-0 rounded-md text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        dispatchSettings.signing_order === "sequential"
                          ? "bg-card text-foreground shadow-2xs"
                          : "text-muted-foreground",
                      )}
                    >
                      Sequencial
                    </button>
                  </div>
                </div>

                {/* Atalho: Incluir criador como signatário + Adicionar novo */}
                {!isLocked && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleIncludeMeAsSigner}
                      className="flex-1 h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs gap-2"
                    >
                      <UserCheck className="size-3.5" />
                      <span>Incluir-me como Signatário</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSigners((prev) => [
                          ...prev,
                          {
                            name: "",
                            email: "",
                            phone: "",
                            cpf: "",
                            role: "party",
                            dispatchChannel: "whatsapp",
                            authLevel: "basic",
                            requireFacialBiometrics: false,
                            signingOrderIndex: prev.length + 1,
                            colorCode: SIGNER_PALETTE[prev.length % SIGNER_PALETTE.length],
                          },
                        ]);
                        setSelectedSignerIdx(signers.length);
                      }}
                      className="h-11 min-h-11 sm:h-9 sm:min-h-0 px-3 text-xs gap-1"
                    >
                      <UserPlus className="size-3.5" />
                      <span>Novo</span>
                    </Button>
                  </div>
                )}

                {/* Lista de Signatários */}
                <div className="space-y-3">
                  {signers.map((signer, idx) => {
                    const isSelected = idx === selectedSignerIdx;
                    return (
                      <div
                        key={idx}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedSignerIdx(idx)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedSignerIdx(idx);
                          }
                        }}
                        className={cn(
                          "rounded-lg p-3 space-y-3 transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isSelected
                            ? "border-primary/60 bg-primary/5"
                            : "border-border/70 bg-muted/20",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="size-3 rounded-full shrink-0 waesy-dyn-bg"
                              style={{ "--dyn-bg": signer.colorCode } as React.CSSProperties}
                            />
                            <span className="text-xs font-semibold text-foreground truncate">
                              {signer.name || `Signatário ${idx + 1}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {!isLocked && (
                              <label className="inline-flex items-center gap-1 px-2 h-11 min-h-11 sm:h-8 sm:min-h-0 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer">
                                {isProcessingOcr === idx ? (
                                  <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />
                                ) : (
                                  <ScanLine className="size-3.5" />
                                )}
                                <span>RG/CNH</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="sr-only"
                                  onChange={(e) => {
                                    handleSignerOcr(idx, e.target.files?.[0]);
                                    e.currentTarget.value = "";
                                  }}
                                />
                              </label>
                            )}
                            {!isLocked && signers.length > 1 && (
                              <button
                                type="button"
                                aria-label="Remover signatário"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSigners((prev) => prev.filter((_, i) => i !== idx));
                                  setSelectedSignerIdx(0);
                                }}
                                className="p-2 text-muted-foreground hover:text-destructive rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          <Input
                            disabled={isLocked}
                            placeholder="Nome completo"
                            value={signer.name}
                            onChange={(e) =>
                              setSigners((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item)),
                              )
                            }
                            className="h-9 text-xs bg-background"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              disabled={isLocked}
                              placeholder="WhatsApp (DDD)"
                              value={signer.phone}
                              onChange={(e) =>
                                setSigners((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, phone: formatPhone(e.target.value) } : item,
                                  ),
                                )
                              }
                              className="h-9 text-xs bg-background"
                            />
                            <Input
                              disabled={isLocked}
                              placeholder="E-mail"
                              value={signer.email}
                              onChange={(e) =>
                                setSigners((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, email: e.target.value } : item)),
                                )
                              }
                              className="h-9 text-xs bg-background"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <Input
                              disabled={isLocked}
                              placeholder="CPF (opc.)"
                              value={signer.cpf}
                              onChange={(e) =>
                                setSigners((prev) =>
                                  prev.map((item, i) =>
                                    i === idx
                                      ? { ...item, cpf: maskCpfProgressive(e.target.value) }
                                      : item,
                                  ),
                                )
                              }
                              className="h-9 text-xs bg-background"
                            />
                            <Select
                              disabled={isLocked}
                              value={signer.dispatchChannel}
                              onValueChange={(v: any) =>
                                setSigners((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, dispatchChannel: v } : item,
                                  ),
                                )
                              }
                            >
                              <SelectTrigger className="h-9 text-xs bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                <SelectItem value="email">E-mail</SelectItem>
                                <SelectItem value="direct_link">Link Direto</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select
                              disabled={isLocked}
                              value={signer.role}
                              onValueChange={(v: any) =>
                                setSigners((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, role: v } : item)),
                                )
                              }
                            >
                              <SelectTrigger className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="max-h-72">
                                {CONTRACT_SIGNER_ROLE_GROUPS.map((grp) => (
                                  <SelectGroup key={grp.group}>
                                    <SelectLabel className="text-2xs font-semibold text-muted-foreground">
                                      {grp.group}
                                    </SelectLabel>
                                    {grp.options.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Paleta de Campos para Arrastar na Folha A4 */}
                {!isLocked && (
                  <div className="space-y-3 pt-3 border-t border-border/70">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        Inserir campo para {signerVisualList[selectedSignerIdx]?.name || "Signatário"}
                      </span>
                      <button
                        type="button"
                        onClick={handleAutoPosition}
                        className="text-xs font-medium text-primary hover:underline rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Auto-posicionar
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {FIELD_TAGS.map((tag) => {
                        const Icon = tag.icon;
                        return (
                          <button
                            key={tag.type}
                            type="button"
                            onClick={() => handleAddFieldToPage(tag.type)}
                            className="flex items-center gap-2 px-3 h-11 min-h-11 sm:h-9 sm:min-h-0 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Icon className="size-3.5 text-primary shrink-0" />
                            <span className="truncate">{tag.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TAB 3: COFRE, PASTAS, RASTREAMENTO & AUDITORIA */}
            {leftTab === "envio" && (
              <>
                {/* Pasta Real do Cofre Multi-Tenant */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
                      <Folder className="size-3.5 text-primary" />
                      Pasta no Cofre
                    </Label>
                    <button
                      type="button"
                      onClick={() => setCreatingFolder((prev) => !prev)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <FolderPlus className="size-3.5" />
                      Nova Pasta
                    </button>
                  </div>

                  {creatingFolder && (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Nome da pasta (ex: Fornecedores)"
                        className="h-9 text-xs"
                      />
                      <Button type="button" size="sm" onClick={handleCreateFolder} className="h-11 min-h-11 sm:h-9 sm:min-h-0 px-3 text-xs">
                        Criar
                      </Button>
                    </div>
                  )}

                  <Select value={folderId || "__none__"} onValueChange={handleFolderSelectChange}>
                    <SelectTrigger className="h-11 sm:h-9 text-xs">
                      <SelectValue placeholder="Sem pasta definida" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Cofre Geral (Sem pasta)</SelectItem>
                      {foldersList.map((f: any) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name} ({f.contractCount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Observadores e Lembretes (Editável antes de selar) */}
                {!isLocked && (
                  <div className="space-y-3 pt-3 border-t border-border/70">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                        <Bell className="size-3.5" />
                        Lembrete Automático
                      </Label>
                      <Select
                        value={String(dispatchSettings.reminder_days)}
                        onValueChange={(v) =>
                          setDispatchSettings((prev) => ({
                            ...prev,
                            send_reminders: Number(v) > 0,
                            reminder_days: Number(v),
                          }))
                        }
                      >
                        <SelectTrigger className="w-36 h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Todo dia</SelectItem>
                          <SelectItem value="3">A cada 3 dias</SelectItem>
                          <SelectItem value="7">Semanal</SelectItem>
                          <SelectItem value="0">Desativado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Observadores (Cópia da Auditoria)
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          value={obsName}
                          onChange={(e) => setObsName(e.target.value)}
                          placeholder="Nome"
                          className="h-9 text-xs"
                        />
                        <Input
                          value={obsEmail}
                          onChange={(e) => setObsEmail(e.target.value)}
                          placeholder="E-mail"
                          className="h-9 text-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!obsName.trim() || !obsEmail.includes("@")) return;
                            setObservers((prev) => [...prev, { name: obsName.trim(), email: obsEmail.trim() }]);
                            setObsName("");
                            setObsEmail("");
                          }}
                          className="h-11 min-h-11 sm:h-9 sm:min-h-0 px-3 shrink-0"
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                      {observers.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {observers.map((o, i) => (
                            <Badge key={i} variant="secondary" className="text-xs gap-1">
                              {o.name}
                              <button
                                type="button"
                                aria-label={`Remover observador ${o.name}`}
                                onClick={() => setObservers((prev) => prev.filter((_, idx) => idx !== i))}
                                className="rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Rastreamento Real de Envelopes (Quando Selado / Enviado) */}
                {activeEnvelopes.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-border/70">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Acompanhamento de Assinaturas
                    </h4>
                    {activeEnvelopes.map((env: any, idx: number) => {
                      const signPath = env.signingUrl || `/assinar/${env.signing_token}`;
                      const fullLink =
                        env.fullUrl ||
                        (typeof window !== "undefined" ? `${window.location.origin}${signPath}` : signPath);
                      const isSigned = env.status === "signed";
                      const isViewed = env.status === "viewed" || Boolean(env.viewed_at);

                      return (
                        <div
                          key={env.id || idx}
                          className="rounded-lg bg-muted/30 p-3 space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">{env.signer_name}</p>
                              <p className="text-muted-foreground truncate">
                                {env.signer_phone || env.signer_email}
                              </p>
                            </div>
                            <Badge
                              variant={isSigned ? "default" : isViewed ? "outline" : "secondary"}
                              className="shrink-0 text-xs"
                            >
                              {isSigned ? "Assinado" : isViewed ? "Visualizado" : "Pendente"}
                            </Badge>
                          </div>

                          <div className="text-xs text-muted-foreground space-y-1">
                            {isSigned && env.signed_at && <p>Assinado em {formatDate(env.signed_at)}</p>}
                            {!isSigned && env.viewed_at && <p>Aberto em {formatDate(env.viewed_at)}</p>}
                            {Number(env.reminder_count || 0) > 0 && (
                              <p>Lembretes enviados: {env.reminder_count}</p>
                            )}
                          </div>

                          {!isSigned && !isCancelled && env.id && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  await navigator.clipboard?.writeText(fullLink).catch(() => null);
                                  setCopiedId(env.id);
                                  toast.success("Link de assinatura copiado.");
                                  setTimeout(() => setCopiedId(null), 1500);
                                }}
                                className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs gap-1"
                              >
                                {copiedId === env.id ? <Check className="size-3" /> : <Copy className="size-3" />}
                                <span>Copiar</span>
                              </Button>

                              {env.signer_phone && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={resendingEnvelopeId === env.id}
                                  onClick={() => handleResendEnvelope(env.id, "whatsapp")}
                                  className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs gap-1"
                                >
                                  <WhatsappLogo className="size-3.5 text-emerald-600" />
                                  <span>Reenviar</span>
                                </Button>
                              )}

                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs gap-1"
                              >
                                <a href={signPath} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="size-3" />
                                  <span>Abrir</span>
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Trilha de Auditoria Forense Real */}
                {Array.isArray(initialContract?.auditChain) && initialContract.auditChain.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-border/70">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Linha do Tempo de Auditoria
                    </h4>
                    <div className="space-y-2">
                      {initialContract.auditChain.map((evt: any) => (
                        <div key={evt.id} className="flex items-start justify-between gap-2 text-xs text-muted-foreground">
                          <span className="font-mono font-medium text-foreground">{evt.action}</span>
                          <span className="shrink-0">{formatDate(evt.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cancelamento Seguro de Contrato em Aberto */}
                {mode === "edit" &&
                  initialContract?.id &&
                  !isContractSignedOrCompleted(contractStatus) &&
                  !isCancelled && (
                    <div className="pt-3 border-t border-border/70">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setCancelDialogOpen(true)}
                        className="w-full h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 justify-start gap-2"
                      >
                        <XCircle className="size-4" />
                        <span>Cancelar este Contrato</span>
                      </Button>
                    </div>
                  )}
              </>
            )}
          </div>
        </aside>

        {/* Área Principal (Canvas A4 Interativo + Prompt de Assinatura Imediata do Criador) */}
        <section
          className={cn(
            "flex-1 flex flex-col min-h-0 overflow-hidden bg-muted/30",
            mobilePane === "canvas" ? "flex" : "hidden lg:flex",
          )}
        >
          {/* Prompt Imediato 1-Click Sign quando o criador logado tem envelope pendente */}
          {myPendingEnvelope && !isCancelled && (
            <div className="shrink-0 bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                <span className="font-medium text-foreground">
                  Sua assinatura consta como pendente neste documento. Deseja assinar agora?
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setQuickSignToken(myPendingEnvelope.signing_token);
                  setQuickSignOpen(true);
                }}
                className="h-11 min-h-11 sm:h-9 sm:min-h-0 px-4 text-xs font-semibold gap-2"
              >
                <PenTool className="size-3.5" />
                <span>
                  {userProfile?.savedSignature ? "Assinar com 1 Toque" : "Assinar Agora"}
                </span>
              </Button>
            </div>
          )}

          {/* Folha A4 Interativa com Drag-and-Drop e Resize Reais */}
          <div className="flex-1 min-h-0 p-2 sm:p-4 overflow-hidden">
            <SignaturePositionerCanvas
              hideSidePanel
              signers={signerVisualList}
              fields={signatureFields}
              pageCount={effectivePagesCount}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onFieldsChange={setSignatureFields}
              selectedSignerIndex={selectedSignerIdx}
              onSelectedSignerIndexChange={setSelectedSignerIdx}
              documentTitle={title}
              contentMarkdown={compiledPreviewMarkdown}
              sourceFileSignedUrl={sourceFileSignedUrl}
              sourceFileMime={sourceFileMime}
              sourceFileName={sourceFileName}
              readOnly={isLocked}
            />
          </div>

          {/* Protocolo Criptográfico Compacto abaixo quando selado (acessível no fim do manifesto) */}
          {isSealed && initialContract?.verification_code && currentVersion?.hash_sha256 && (
            <div className="sr-only">
              <ContractAuditManifest
                documentTitle={title}
                category={category}
                verificationCode={initialContract.verification_code}
                hashSha256={currentVersion.hash_sha256}
                sealedAt={currentVersion.sealed_at}
                signers={activeEnvelopes.map((env: any) => ({
                  name: env.signer_name || "Signatário",
                  document: env.signer_cpf,
                  email: env.signer_email,
                  phone: env.signer_phone,
                  role: env.signer_role || "party",
                  status: env.status === "signed" ? "signed" : env.status === "viewed" ? "viewed" : "pending",
                  viewedAt: env.viewed_at,
                  signedAt: env.signed_at,
                  authLevel: env.auth_level,
                }))}
              />
            </div>
          )}
        </section>
      </div>

      {/* Modal de Cancelamento Auditado */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md pt-safe-modal">
          <DialogHeader>
            <DialogTitle>Cancelar Contrato</DialogTitle>
            <DialogDescription>
              Os links de assinatura deixarão de ter validade. Esta ação será registrada na trilha de auditoria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="cancel-reason-input" className="text-xs font-medium">
              Motivo do cancelamento
            </Label>
            <Textarea
              id="cancel-reason-input"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ex: Condições comerciais revisadas em nova minuta..."
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              className="h-11 min-h-11 sm:h-9 sm:min-h-0"
            >
              Manter Ativo
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isCancelling}
              onClick={handleCancelContract}
              className="h-11 min-h-11 sm:h-9 sm:min-h-0"
            >
              {isCancelling ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none mr-2" /> : null}
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Assinatura Rápida do Criador Logado (1 Toque se já cadastrada) */}
      <Dialog open={quickSignOpen} onOpenChange={setQuickSignOpen}>
        <DialogContent className="sm:max-w-lg pt-safe-modal">
          <DialogHeader>
            <DialogTitle>Assinar Documento Agora</DialogTitle>
            <DialogDescription>
              Aplique sua assinatura eletrônica com hash SHA-256 em &quot;{title}&quot;.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3 text-xs">
              <Checkbox
                id="quick-sign-consent"
                checked={quickSignConsent}
                onCheckedChange={(v) => setQuickSignConsent(Boolean(v))}
              />
              <Label htmlFor="quick-sign-consent" className="leading-relaxed cursor-pointer font-normal">
                Concordo integralmente com o teor deste instrumento e autorizo a assinatura eletrônica (MP 2.200-2/2001).
              </Label>
            </div>

            {userProfile?.savedSignature ? (
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Assinatura salva no seu perfil:</p>
                <div className="h-24 rounded-lg border border-border bg-background flex items-center justify-center p-2">
                  <img
                    src={userProfile.savedSignature}
                    alt="Sua assinatura salva"
                    className="max-h-16 object-contain"
                  />
                </div>
                <Button
                  type="button"
                  disabled={isSigningNow || !quickSignConsent}
                  onClick={() => handleQuickSignConfirm(userProfile.savedSignature!)}
                  className="w-full h-11 min-h-11 text-sm font-semibold gap-2"
                >
                  {isSigningNow ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <CheckCircle2 className="size-4" />}
                  <span>Aplicar Minha Assinatura em 1 Toque</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    id="save-drawn-profile"
                    checked={saveDrawnToProfile}
                    onCheckedChange={(v) => setSaveDrawnToProfile(Boolean(v))}
                  />
                  <Label htmlFor="save-drawn-profile" className="cursor-pointer font-normal">
                    Salvar esta assinatura no meu cadastro para agilizar próximos contratos
                  </Label>
                </div>
                <DigitalSignatureCanvas onSave={(dataUrl) => handleQuickSignConfirm(dataUrl)} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
