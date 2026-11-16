import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  FileText,
  Plus,
  FileSignature,
  CheckCircle2,
  Clock,
  ExternalLink,
  DollarSign,
  Copy,
  Check,
  Eye,
  PenTool,
  Receipt,
  Folder,
  FolderPlus,
  Trash2,
  Pencil,
  Download,
  Bell,
  XCircle,
  Loader2,
  UserCheck,
} from "lucide-react";
import { ContractEditorSheet } from "@/components/office/contract-editor-sheet";
import { CommercialBudgetPadSheet } from "@/components/documents/CommercialBudgetPadSheet";
import { CountertopSigningModal } from "@/components/contracts/CountertopSigningModal";
import { SavedSignatureSettingsCard } from "@/components/contracts/saved-signature-settings";
import { WhatsappLogo } from "@phosphor-icons/react";
import { toast } from "sonner";

import { PageHeader } from "@/components/commerce/page-header";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listContracts, createContract, getContractById } from "@/services/contracts.functions";
import {
  listContractFolders,
  createContractFolder,
  renameContractFolder,
  deleteContractFolder,
  moveContractToFolder,
  resendContractEnvelope,
  cancelContract,
  getUserSignatureProfile,
  listTeamSignatureStatuses,
} from "@/services/contracts-vault.functions";
import {
  isContractSignedOrCompleted,
  formatContractStatusLabel,
} from "@/lib/contracts/contract-vault-rules";
import { downloadSignedContractPackagePdf } from "@/lib/contracts/contract-pdf-download";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { WorkspaceCanonicalToolbar, type WorkspaceToolbarTab } from "@/components/workspace/workspace-canonical-toolbar";
import { ErrorState } from "@/components/state/states";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceDashboardSheet, type MetricCardItem } from "@/components/workspace/workspace-dashboard-sheet";

export const Route = createFileRoute("/workspace/contratos/")({
  validateSearch: (search: Record<string, unknown>): { tab?: string; folderId?: string } => ({
    tab: typeof search.tab === "string" && search.tab.trim() ? search.tab.trim() : undefined,
    folderId:
      typeof search.folderId === "string" && search.folderId.trim()
        ? search.folderId.trim()
        : undefined,
  }),
  head: () => ({ meta: [{ title: "Contratos | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const contracts = await listContracts();
      return { contracts, loadError: null as string | null };
    } catch (err: any) {
      console.error("[loader:workspace.contratos.index] Unhandled error:", err);
      return {
        contracts: null,
        loadError: err?.message || "Não foi possível carregar a listagem de contratos.",
      };
    }
  },
  component: ContractsDashboard,
});

const CATEGORY_LABELS: Record<string, string> = {
  tourism_package: "Turismo & Viagens",
  real_estate_rental: "Imóveis & Locação",
  real_estate_sale: "Imóveis & Venda",
  vehicle_sale: "Veículos & Frota",
  vehicle_consignation: "Consignação de Veículo",
  fashion_retail: "Moda & Mala Condicional",
  pos_retail: "Balcão PDV & Carnê",
  legal_retainer: "Jurídico & Advocacia",
  service_agreement: "Prestação de Serviços",
  medical_aesthetic_consent: "Saúde & Estética",
  employment: "Contrato de Trabalho",
  general_deal: "Acordo Comercial",
  partnership: "Parceria Comercial",
  ndas: "Confidencialidade (NDA)",
  lease: "Locação de Bens",
  general: "Acordo Geral",
};

function ContractsDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { contracts: initialContracts, loadError } = ((Route.useLoaderData?.() as any) || {});

  const { data: contracts = [], isLoading: isLoadingContracts, isError, refetch } = useQuery({
    queryKey: ["contracts-list"],
    queryFn: () => listContracts(),
    initialData: Array.isArray(initialContracts) ? initialContracts : undefined,
  });

  const { data: foldersData, refetch: refetchFolders } = useQuery({
    queryKey: ["contracts-vault-folders"],
    queryFn: () => listContractFolders(),
    staleTime: 30_000,
  });

  const { data: teamSigStatuses = [] } = useQuery({
    queryKey: ["team-signature-statuses"],
    queryFn: () => listTeamSignatureStatuses(),
    staleTime: 60_000,
  });

  const { data: userSigProfile } = useQuery({
    queryKey: ["contract-user-signature-profile"],
    queryFn: () => getUserSignatureProfile(),
    staleTime: 60_000,
  });

  const routeSearch = (Route.useSearch?.() as { tab?: string; folderId?: string } | undefined) || {};
  const queryError = Boolean(loadError) || (isError && !initialContracts?.length);
  const [activeTab, setActiveTabState] = useState<string>(routeSearch.tab || "all");
  const [activeFolderFilter, setActiveFolderFilterState] = useState<string>(routeSearch.folderId || "all");

  const setActiveTab = (nextTab: string) => {
    setActiveTabState(nextTab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (nextTab === "all") url.searchParams.delete("tab");
      else url.searchParams.set("tab", nextTab);
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    }
  };

  const setActiveFolderFilter = (nextFolder: string) => {
    setActiveFolderFilterState(nextFolder);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (nextFolder === "all") url.searchParams.delete("folderId");
      else url.searchParams.set("folderId", nextFolder);
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    }
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [copiedContractId, setCopiedContractId] = useState<string | null>(null);
  const [quickEditorOpen, setQuickEditorOpen] = useState(false);
  const [budgetPadOpen, setBudgetPadOpen] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [countertopModalOpen, setCountertopModalOpen] = useState(false);
  const [countertopTargetContract] = useState<any>(null);

  // Gestão de Pastas no Cofre
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState("");
  const [isMutatingFolder, setIsMutatingFolder] = useState(false);

  // Cancelamento & Reenvio
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [resendingEnvelopeId, setResendingEnvelopeId] = useState<string | null>(null);

  const contractsList = (contracts || []) as any[];
  const foldersList = (foldersData?.folders || []) as any[];
  const unfiledCount = Number(foldersData?.unfiledCount || 0);

  const totalContracts = contractsList.length;
  const signedContracts = contractsList.filter((c) => isContractSignedOrCompleted(c.status)).length;
  const signingContracts = contractsList.filter((c) => c.status === "signing").length;
  const draftContracts = contractsList.filter((c) => c.status === "draft" || !c.status).length;
  const cancelledContracts = contractsList.filter((c) => c.status === "cancelled").length;
  const totalValueCents = contractsList.reduce((acc, c) => acc + (c.deal?.proposed_price_cents || 0), 0);
  const signedRate = totalContracts > 0 ? Math.round((signedContracts / totalContracts) * 100) : 0;

  const teamReadyCount = (teamSigStatuses as any[]).filter((m) => m.hasSavedSignature).length;
  const teamTotalCount = (teamSigStatuses as any[]).length;

  const tabs: WorkspaceToolbarTab[] = [
    { id: "all", label: "Todos", count: totalContracts },
    { id: "signing", label: "Aguardando", count: signingContracts },
    { id: "signed", label: "Assinados", count: signedContracts },
    { id: "draft", label: "Rascunhos", count: draftContracts },
    { id: "cancelled", label: "Cancelados", count: cancelledContracts },
  ];

  const filteredContracts = useMemo(() => {
    return contractsList.filter((c) => {
      if (activeTab === "signed" && !isContractSignedOrCompleted(c.status)) return false;
      if (activeTab === "signing" && c.status !== "signing") return false;
      if (activeTab === "draft" && c.status !== "draft" && c.status) return false;
      if (activeTab === "cancelled" && c.status !== "cancelled") return false;

      if (activeFolderFilter === "unfiled" && c.folder_id) return false;
      if (
        activeFolderFilter !== "all" &&
        activeFolderFilter !== "unfiled" &&
        c.folder_id !== activeFolderFilter
      ) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (c.title || "").toLowerCase().includes(q);
        const matchesCategory = (CATEGORY_LABELS[c.category] || c.category || "").toLowerCase().includes(q);
        const matchesCreator = (c.creator?.full_name || "").toLowerCase().includes(q);
        const latestVersion = [...(c.versions || [])].sort(
          (a: any, b: any) => (b.version_number || 0) - (a.version_number || 0),
        )[0];
        const matchesSigner = ((latestVersion?.envelopes || []) as any[]).some((env) =>
          (env.signer_name || "").toLowerCase().includes(q),
        );
        if (!matchesTitle && !matchesCategory && !matchesCreator && !matchesSigner) return false;
      }
      return true;
    });
  }, [contractsList, activeTab, activeFolderFilter, searchQuery]);

  const dashboardMetrics: MetricCardItem[] = [
    {
      id: "total_contracts",
      label: "Contratos Criados",
      value: String(totalContracts),
      description: "Total de documentos legais no cofre",
      icon: FileText,
      variant: "primary",
    },
    {
      id: "signed_contracts",
      label: "Contratos Assinados",
      value: String(signedContracts),
      description: `${signedRate}% de taxa de efetivação jurídica`,
      icon: CheckCircle2,
      variant: "success",
    },
    {
      id: "signing_pending",
      label: "Aguardando Assinatura",
      value: String(signingContracts),
      description: "Envelopes enviados para partes e testemunhas",
      icon: Clock,
      variant: "warning",
    },
    {
      id: "total_value",
      label: "Volume Negociado",
      value: formatMoney(totalValueCents),
      description: "Valor econômico protegido por contratos",
      icon: DollarSign,
      variant: "info",
    },
  ];

  const handleCopyLink = (e: React.MouseEvent | undefined, contract: any) => {
    e?.preventDefault();
    e?.stopPropagation();
    const contractId = typeof contract === "string" ? contract : contract.id;
    const url =
      typeof contract === "object" && contract?.verification_code
        ? contract.category === "tourism" || contract.category === "tourism_package"
          ? `${window.location.origin}/contrato/${contract.verification_code}`
          : `${window.location.origin}/verify/document/${contract.verification_code}`
        : `${window.location.origin}/workspace/contratos/${contractId}/editor`;
    navigator.clipboard?.writeText(url).catch(() => null);
    setCopiedContractId(contractId);
    toast.success("Link do contrato copiado.");
    setTimeout(() => setCopiedContractId(null), 2500);
  };

  const handleShareWhatsApp = (e: React.MouseEvent | undefined, contract: any) => {
    e?.preventDefault();
    e?.stopPropagation();
    const link = contract.verification_code
      ? contract.category === "tourism" || contract.category === "tourism_package"
        ? `${window.location.origin}/contrato/${contract.verification_code}`
        : `${window.location.origin}/verify/document/${contract.verification_code}`
      : `${window.location.origin}/workspace/contratos/${contract.id}/editor`;
    const text = `Olá! Segue o link de acesso ao contrato *${contract.title}*: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setIsMutatingFolder(true);
    try {
      const res = await createContractFolder({ data: { name: newFolderName.trim() } });
      setNewFolderName("");
      setNewFolderOpen(false);
      await refetchFolders();
      setActiveFolderFilter(res.folder.id);
      toast.success(`Pasta "${res.folder.name}" criada.`);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar pasta.");
    } finally {
      setIsMutatingFolder(false);
    }
  };

  const handleRenameFolder = async (id: string) => {
    if (!renameFolderValue.trim()) return;
    setIsMutatingFolder(true);
    try {
      await renameContractFolder({ data: { folderId: id, name: renameFolderValue.trim() } });
      setRenamingFolderId(null);
      setRenameFolderValue("");
      await Promise.all([refetchFolders(), refetch()]);
      toast.success("Pasta renomeada.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao renomear pasta.");
    } finally {
      setIsMutatingFolder(false);
    }
  };

  const handleDeleteFolder = async (id: string) => {
    setIsMutatingFolder(true);
    try {
      await deleteContractFolder({ data: { folderId: id } });
      if (activeFolderFilter === id) setActiveFolderFilter("all");
      await Promise.all([refetchFolders(), refetch()]);
      toast.success("Pasta excluída. Os documentos foram movidos para o Cofre Geral.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir pasta.");
    } finally {
      setIsMutatingFolder(false);
    }
  };

  const handleMoveFolder = async (contractId: string, folderId: string | null) => {
    try {
      await moveContractToFolder({ data: { contractId, folderId } });
      await Promise.all([refetchFolders(), refetch()]);
      toast.success("Contrato organizado no cofre.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao mover contrato.");
    }
  };

  const handleResendPendingSigner = async (envelope: any) => {
    setResendingEnvelopeId(envelope.id);
    try {
      const channel = envelope.signer_phone ? "whatsapp" : "direct_link";
      const res = await resendContractEnvelope({ data: { envelopeId: envelope.id, channel } });
      await refetch();
      if (res.queuedWhatsapp) {
        toast.success(`Lembrete #${res.reminderCount} enviado via WhatsApp para ${envelope.signer_name}.`);
      } else if (res.manualWhatsappUrl && channel === "whatsapp") {
        window.open(res.manualWhatsappUrl, "_blank", "noopener,noreferrer");
        toast.info(`WhatsApp aberto para cobrar ${envelope.signer_name}.`);
      } else {
        await navigator.clipboard?.writeText(res.fullUrl).catch(() => null);
        toast.success(`Link direto copiado para ${envelope.signer_name}.`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao reenviar notificação.");
    } finally {
      setResendingEnvelopeId(null);
    }
  };

  const handleDownloadContractPdf = async (contractId: string) => {
    try {
      const detail: any = await getContractById({ data: contractId });
      const latest = [...(detail.versions || [])].sort(
        (a: any, b: any) => (b.version_number || 0) - (a.version_number || 0),
      )[0];
      await downloadSignedContractPackagePdf({
        title: detail.title,
        categoryLabel: CATEGORY_LABELS[detail.category] || detail.category || "Contrato",
        statusLabel: formatContractStatusLabel(detail.status),
        contentMarkdown: latest?.content_markdown || "",
        verificationCode: detail.verification_code || null,
        hashSha256: latest?.hash_sha256 || null,
        sealedAt: latest?.sealed_at || null,
        sourceFileSignedUrl: latest?.sourceFileSignedUrl || null,
        sourceFileName: latest?.source_file_name || null,
        signers: (latest?.envelopes || []).map((env: any) => ({
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
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível gerar o PDF do documento.");
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget?.id) return;
    setIsCancelling(true);
    try {
      await cancelContract({
        data: {
          contractId: cancelTarget.id,
          reason: cancelReason.trim() || "Cancelado pelo administrador no cofre.",
        },
      });
      setCancelTarget(null);
      setCancelReason("");
      await Promise.all([refetch(), refetchFolders()]);
      toast.success("Contrato cancelado.");
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível cancelar o contrato.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6 w-full px-0 sm:px-4 md:px-0 pb-20">
      {queryError && (
        <ErrorState
          title="Não foi possível atualizar os contratos"
          description="A listagem de contratos está temporariamente indisponível. Os dados anteriores continuam disponíveis quando houver cache local."
        />
      )}

      {/* 1. Topo do Cofre de Contratos */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          eyebrow="Gestão Jurídica & Compliance"
          title="Contratos e Assinaturas"
          description="Cofre de documentos, controle de visualização e envelopes eletrônicos com validade jurídica."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSignatureModalOpen(true)}
            className="h-11 min-h-11 px-3 rounded-lg text-xs font-medium gap-2"
          >
            <UserCheck className="size-4 text-primary" />
            <span>Minha Assinatura</span>
            {teamTotalCount > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">
                {teamReadyCount}/{teamTotalCount}
              </Badge>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setBudgetPadOpen(true)}
            className="h-11 min-h-11 px-3 rounded-lg text-xs font-medium gap-2"
          >
            <Receipt className="size-4 text-primary" />
            <span>Orçamento</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setQuickEditorOpen(true)}
            className="h-11 min-h-11 px-3 rounded-lg text-xs font-medium gap-2"
          >
            <PenTool className="size-4 text-primary" />
            <span>Minuta Rápida</span>
          </Button>
          <Button
            asChild
            className="h-11 min-h-11 rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow-xs focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Link to="/workspace/contratos/novo" className="flex items-center gap-2">
              <Plus className="size-4" />
              <span>Novo Contrato</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Barra de Pastas do Cofre (Multi-Tenant Real) */}
      <div className="flex flex-wrap items-center gap-2 pb-1">
        <button
          type="button"
          onClick={() => setActiveFolderFilter("all")}
          className={`inline-flex items-center gap-2 h-11 min-h-11 sm:h-9 sm:min-h-0 px-3 rounded-lg border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            activeFolderFilter === "all"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          <Folder className="size-3.5" />
          <span>Todas ({totalContracts})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFolderFilter("unfiled")}
          className={`inline-flex items-center gap-2 h-11 min-h-11 sm:h-9 sm:min-h-0 px-3 rounded-lg border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            activeFolderFilter === "unfiled"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Cofre Geral ({unfiledCount})</span>
        </button>

        {foldersList.map((folder: any) => (
          <div key={folder.id} className="inline-flex items-center gap-1">
            {renamingFolderId === folder.id ? (
              <div className="inline-flex items-center gap-1 bg-card border border-border rounded-lg px-2 h-9">
                <Input
                  value={renameFolderValue}
                  onChange={(e) => setRenameFolderValue(e.target.value)}
                  className="h-7 w-28 text-xs px-2"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={isMutatingFolder}
                  onClick={() => handleRenameFolder(folder.id)}
                  className="h-11 min-h-11 sm:h-7 sm:min-h-0 px-2 text-xs"
                >
                  OK
                </Button>
              </div>
            ) : (
              <div className="inline-flex items-center rounded-lg border border-border bg-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setActiveFolderFilter(folder.id)}
                  className={`inline-flex items-center gap-2 h-11 min-h-11 sm:h-9 sm:min-h-0 px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    activeFolderFilter === folder.id
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Folder className="size-3.5" />
                  <span>{folder.name}</span>
                  <span className="text-muted-foreground">({folder.contractCount})</span>
                </button>
                <button
                  type="button"
                  aria-label={`Renomear pasta ${folder.name}`}
                  onClick={() => {
                    setRenamingFolderId(folder.id);
                    setRenameFolderValue(folder.name);
                  }}
                  className="h-11 min-h-11 sm:h-9 sm:min-h-0 px-2 text-muted-foreground hover:text-foreground border-l border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Pencil className="size-3" />
                </button>
                <button
                  type="button"
                  aria-label={`Excluir pasta ${folder.name}`}
                  onClick={() => handleDeleteFolder(folder.id)}
                  className="h-11 min-h-11 sm:h-9 sm:min-h-0 px-2 text-muted-foreground hover:text-destructive border-l border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            )}
          </div>
        ))}

        {newFolderOpen ? (
          <div className="inline-flex items-center gap-2">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nome da pasta..."
              className="h-9 w-40 text-xs"
            />
            <Button
              type="button"
              size="sm"
              disabled={isMutatingFolder}
              onClick={handleCreateFolder}
              className="h-11 min-h-11 sm:h-9 sm:min-h-0 px-3 text-xs"
            >
              Salvar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setNewFolderOpen(false)}
              className="h-11 min-h-11 sm:h-9 sm:min-h-0 px-2 text-xs"
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setNewFolderOpen(true)}
            className="h-11 min-h-11 sm:h-9 sm:min-h-0 px-3 text-xs text-primary gap-2"
          >
            <FolderPlus className="size-3.5" />
            <span>Nova Pasta</span>
          </Button>
        )}
      </div>

      {/* 3. Toolbar Canônica */}
      <WorkspaceCanonicalToolbar
        searchPlaceholder="Buscar por título, signatário ou categoria..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenDashboard={() => setDashboardOpen(true)}
      />

      <WorkspaceDashboardSheet
        open={dashboardOpen}
        onOpenChange={setDashboardOpen}
        title="Contratos"
        description="Métricas consolidadas de conformidade, envelopes emitidos e volume financeiro."
        metrics={dashboardMetrics}
      />

      {/* 4. Grid de Contratos com Status de Envelopes & Ações Rápidas */}
      {isLoadingContracts && contracts.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="bg-card border border-border rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-20 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="py-20 text-center space-y-4 bg-card rounded-lg p-8 border border-dashed border-border">
          <div className="size-12 mx-auto rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground">
            <FileSignature className="size-6" />
          </div>
          <h2 className="text-sm font-bold text-foreground">Nenhum contrato encontrado</h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery || activeTab !== "all" || activeFolderFilter !== "all"
              ? "Tente ajustar o filtro de pasta, busca ou status."
              : "Crie seu primeiro documento digital ou suba um arquivo PDF/Word para coleta de assinaturas."}
          </p>
          <Button asChild size="sm" variant="outline" className="rounded-lg h-11 min-h-11 sm:h-10 sm:min-h-0 px-4 text-xs font-semibold mt-2">
            <Link to="/workspace/contratos/novo">Criar Primeiro Contrato</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContracts.map((contract: any) => {
            const isSigned = isContractSignedOrCompleted(contract.status);
            const isSigning = contract.status === "signing";
            const isCancelled = contract.status === "cancelled";
            const isCopied = copiedContractId === contract.id;
            const categoryLabel = CATEGORY_LABELS[contract.category] || "Geral";
            const latestVersion = [...(contract.versions || [])].sort(
              (a: any, b: any) => (b.version_number || 0) - (a.version_number || 0),
            )[0];
            const envelopes = (latestVersion?.envelopes || []) as any[];
            const signedEnvCount = envelopes.filter((e) => e.status === "signed").length;
            const pendingEnvelopes = envelopes.filter((e) => e.status !== "signed" && e.status !== "cancelled");
            const firstPending = pendingEnvelopes[0] || null;

            const myEmail = (userSigProfile?.email || "").trim().toLowerCase();
            const myPendingEnv = pendingEnvelopes.find(
              (e) =>
                (userSigProfile?.profileId && e.signer_profile_id === userSigProfile.profileId) ||
                (myEmail && (e.signer_email || "").trim().toLowerCase() === myEmail),
            );

            return (
              <div
                key={contract.id}
                className="bg-card border border-border hover:border-primary/40 rounded-lg p-5 transition-colors duration-200 shadow-xs space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs font-medium bg-muted/40">
                        {categoryLabel}
                      </Badge>
                      {contract.folder?.name && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Folder className="size-3" />
                          <span>{contract.folder.name}</span>
                        </Badge>
                      )}
                      {contract.is_settled && (
                        <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-600 bg-emerald-500/5">
                          Quitado
                        </Badge>
                      )}
                    </div>

                    {isSigned ? (
                      <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold gap-1 shrink-0">
                        <CheckCircle2 className="size-3" />
                        <span>Assinado</span>
                      </Badge>
                    ) : isCancelled ? (
                      <Badge variant="destructive" className="text-xs font-semibold shrink-0">
                        Cancelado
                      </Badge>
                    ) : isSigning ? (
                      <Badge variant="secondary" className="bg-warning/10 text-warning-strong border border-warning/20 text-xs font-semibold gap-1 shrink-0">
                        <Clock className="size-3" />
                        <span>
                          {envelopes.length > 0 ? `${signedEnvCount}/${envelopes.length} Assin.` : "Em Assinatura"}
                        </span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground font-medium shrink-0">
                        Rascunho
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-foreground line-clamp-2 leading-snug">
                      {contract.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <Clock className="size-3 text-muted-foreground shrink-0" />
                      <span>Criado em {formatDate(contract.created_at)}</span>
                    </p>
                  </div>

                  {/* Signatários e Rastreamento Individual (Quem abriu / Quem falta / Quem assinou) */}
                  {envelopes.length > 0 && (
                    <div className="space-y-2 rounded-lg bg-muted/30 p-3 text-xs">
                      {envelopes.slice(0, 3).map((env: any) => {
                        const envSigned = env.status === "signed";
                        const envViewed = env.status === "viewed" || Boolean(env.viewed_at);
                        return (
                          <div key={env.id} className="flex items-center justify-between gap-2">
                            <span className="truncate font-medium text-foreground">{env.signer_name}</span>
                            <span
                              className={`shrink-0 flex items-center gap-1 ${
                                envSigned
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : envViewed
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {envSigned ? (
                                <>
                                  <CheckCircle2 className="size-3" />
                                  <span>Assinado</span>
                                </>
                              ) : envViewed ? (
                                <>
                                  <Eye className="size-3" />
                                  <span>Visualizado</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="size-3" />
                                  <span>Pendente</span>
                                </>
                              )}
                            </span>
                          </div>
                        );
                      })}
                      {envelopes.length > 3 && (
                        <p className="text-muted-foreground">+{envelopes.length - 3} signatário(s)</p>
                      )}
                    </div>
                  )}

                  {contract.deal && (
                    <div className="p-3 rounded-lg bg-muted/30 text-xs flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Valor sob Contrato:</span>
                      <span className="font-bold text-foreground font-mono">
                        {formatMoney(contract.deal.proposed_price_cents || 0)}
                      </span>
                    </div>
                  )}

                  {/* Organização Rápida de Pasta */}
                  <div className="pt-1">
                    <Select
                      value={contract.folder_id || "__none__"}
                      onValueChange={(v) => handleMoveFolder(contract.id, v === "__none__" ? null : v)}
                    >
                      <SelectTrigger className="h-11 min-h-11 sm:h-8 sm:min-h-0 text-xs bg-background">
                        <SelectValue placeholder="Mover para pasta..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Cofre Geral (Sem pasta)</SelectItem>
                        {foldersList.map((f: any) => (
                          <SelectItem key={f.id} value={f.id}>
                            Pasta: {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
                  {myPendingEnv && !isCancelled ? (
                    <Button asChild size="sm" className="h-11 min-h-11 sm:h-9 sm:min-h-0 px-3 rounded-lg text-xs font-semibold gap-2 flex-1">
                      <a href={`/assinar/${myPendingEnv.signing_token}`}>
                        <PenTool className="size-3.5" />
                        <span>Assinar Agora</span>
                      </a>
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="outline" className="h-11 min-h-11 sm:h-9 sm:min-h-0 px-3 rounded-lg text-xs font-semibold gap-2 flex-1">
                      <Link to="/workspace/contratos/$id/editor" params={{ id: contract.id }}>
                        <FileSignature className="size-3.5" />
                        <span>Abrir Editor</span>
                      </Link>
                    </Button>
                  )}

                  {firstPending && !isCancelled && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={resendingEnvelopeId === firstPending.id}
                      onClick={() => handleResendPendingSigner(firstPending)}
                      className="h-11 min-h-11 sm:h-9 sm:min-h-0 px-3 text-xs gap-1"
                    >
                      {resendingEnvelopeId === firstPending.id ? (
                        <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                      ) : (
                        <Bell className="size-3.5" />
                      )}
                      <span>Reenviar</span>
                    </Button>
                  )}

                  <CrudActionsMenu
                    triggerVariant="outline"
                    triggerClassName="h-11 min-h-11 sm:h-9 sm:min-h-0 px-3 rounded-lg border-border/60 hover:bg-muted"
                    customActions={[
                      {
                        label: "Abrir no Editor Completo",
                        icon: FileSignature,
                        onClick: () =>
                          router.navigate({ to: "/workspace/contratos/$id/editor", params: { id: contract.id } }),
                      },
                      {
                        label: "Baixar Documento / Certificado PDF",
                        icon: Download,
                        onClick: () => handleDownloadContractPdf(contract.id),
                      },
                      {
                        label: isCopied ? "Link Copiado!" : "Copiar Link de Verificação",
                        icon: isCopied ? Check : Copy,
                        onClick: () => handleCopyLink(undefined, contract),
                      },
                      {
                        label: "Compartilhar no WhatsApp",
                        icon: WhatsappLogo as any,
                        onClick: () => handleShareWhatsApp(undefined as any, contract),
                      },
                      ...(contract.verification_code
                        ? [
                            {
                              label: "Certificado Público de Autenticidade",
                              icon: ExternalLink,
                              onClick: () =>
                                router.navigate({
                                  to: "/verify/document/$code",
                                  params: { code: contract.verification_code },
                                }),
                            },
                          ]
                        : []),
                      ...(!isSigned && !isCancelled
                        ? [
                            {
                              label: "Cancelar Contrato",
                              icon: XCircle,
                              onClick: () => setCancelTarget(contract),
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {countertopTargetContract && (
        <CountertopSigningModal
          open={countertopModalOpen}
          onOpenChange={setCountertopModalOpen}
          contractId={countertopTargetContract.id}
          contractTitle={countertopTargetContract.title}
          initialClientName={countertopTargetContract.deal?.customer_name || ""}
          onSignSuccess={() => {
            refetch();
          }}
        />
      )}
      <CommercialBudgetPadSheet open={budgetPadOpen} onOpenChange={setBudgetPadOpen} />

      {quickEditorOpen && (
        <ContractEditorSheet
          onClose={() => setQuickEditorOpen(false)}
          onSaveDocument={async (doc) => {
            try {
              const res = await createContract({
                data: {
                  title: doc.title || "Minuta Contratual",
                  category: "service_agreement",
                  contentMarkdown: doc.content || "Minuta contratual emitida.",
                  clauses: [],
                  variables: doc.variables || {},
                  signatureFields: [],
                  pageCount: 1,
                },
              });
              toast.success("Minuta salva no Cofre de Contratos!");
              setQuickEditorOpen(false);
              await refetch();
              if (res?.contract?.id) {
                router.navigate({ to: "/workspace/contratos/$id/editor", params: { id: res.contract.id } });
              }
            } catch (err: any) {
              toast.error(err?.message || "Erro ao salvar minuta no banco.");
            }
          }}
        />
      )}

      {/* Modal Minha Assinatura & Prontidão da Equipe */}
      <Dialog open={signatureModalOpen} onOpenChange={setSignatureModalOpen}>
        <DialogContent className="sm:max-w-2xl pt-safe-modal max-h-dvh overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Minha Assinatura & Equipe</DialogTitle>
            <DialogDescription>
              Cadastre sua assinatura para assinar contratos com 1 toque e acompanhe quem na equipe já configurou a assinatura.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <SavedSignatureSettingsCard
              onUpdated={() => {
                queryClient.invalidateQueries({ queryKey: ["team-signature-statuses"] });
                queryClient.invalidateQueries({ queryKey: ["contract-user-signature-profile"] });
              }}
            />

            {teamTotalCount > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Equipe Habilitada para Assinatura Rápida ({teamReadyCount}/{teamTotalCount})
                </h4>
                <div className="space-y-2">
                  {(teamSigStatuses as any[]).map((member) => (
                    <div
                      key={member.memberId}
                      className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs"
                    >
                      <span className="font-medium text-foreground truncate">{member.fullName}</span>
                      <Badge variant={member.hasSavedSignature ? "default" : "secondary"} className="text-xs">
                        {member.hasSavedSignature ? "Assinatura Salva" : "Sem Assinatura"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Cancelamento */}
      <Dialog open={Boolean(cancelTarget)} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent className="sm:max-w-md pt-safe-modal">
          <DialogHeader>
            <DialogTitle>Cancelar Contrato</DialogTitle>
            <DialogDescription>
              Deseja cancelar &quot;{cancelTarget?.title}&quot;? Os links pendentes serão invalidados.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Motivo do cancelamento (opcional)..."
            className="text-xs"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelTarget(null)}
              className="h-11 min-h-11 sm:h-9 sm:min-h-0"
            >
              Voltar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isCancelling}
              onClick={handleConfirmCancel}
              className="h-11 min-h-11 sm:h-9 sm:min-h-0"
            >
              {isCancelling ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none mr-2" /> : null}
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ContractsDashboard;
