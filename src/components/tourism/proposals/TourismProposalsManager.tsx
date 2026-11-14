import { useEffect, useMemo, useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  EyeOff,
  FileText,
  Layers,
  LayoutGrid,
  List,
  Lock,
  Plus,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  bundleTravelProposalsIntoSingleLink,
  deleteTravelProposal,
  duplicateTravelProposal,
  listAgencyTravelProposals,
  updateTravelProposal,
  type ProposalVisibilityMode,
  type TravelProposalDTO,
} from "@/services/travel-proposal.functions";
import { convertProposalToTrip } from "@/services/travel-lifecycle.functions";
import { NicheOperationalGuard } from "@/components/workspace/niche-operational-guard";
import { UnifiedProposalWorkspace } from "@/components/tourism/unified-proposal-workspace";
import { ProposalCanvasRenderer } from "@/components/tourism/studio/proposal-canvas-renderer";
import { CANVAS_DIMENSIONS } from "@/components/tourism/studio/studio-frame";
import { ProposalShareWhatsappModal } from "@/components/tourism/studio/proposal-share-whatsapp-modal";
import { ProposalsSheetTable } from "@/components/tourism/proposals/ProposalsSheetTable";
import { ProposalGridCard } from "@/components/tourism/proposals/ProposalGridCard";
import { ProposalQuickPreviewSheet } from "@/components/tourism/proposals/ProposalQuickPreviewSheet";
import { ProposalPasswordDialog } from "@/components/tourism/proposals/ProposalPasswordDialog";
import {
  buildProposalsCsv,
  downloadTextFile,
  sanitizeProposalFilename,
} from "@/lib/tourism/proposal-export";
import { exportElementAsImage, exportElementAsPdf } from "@/lib/pdf-export";
import { formatMoney } from "@/lib/money";
import { useWindowSizeClass } from "@/hooks/use-mobile";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { WorkspaceDashboardSheet } from "@/components/workspace/workspace-dashboard-sheet";
import { cn } from "@/lib/utils";

type ProposalListStatus = "todos" | "draft" | "sent" | "approved" | "restricted" | "hidden";
const proposalListStatuses: readonly ProposalListStatus[] = [
  "todos",
  "draft",
  "sent",
  "approved",
  "restricted",
  "hidden",
];
const isProposalListStatus = (value: string): value is ProposalListStatus =>
  proposalListStatuses.includes(value as ProposalListStatus);
type ProposalViewMode = "sheet" | "grid";

export interface TourismProposalsManagerProps {
  initialProposals?: TravelProposalDTO[];
  store?: any;
  searchParams?: {
    leadId?: string;
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    destination?: string;
    new?: boolean;
  };
  embedded?: boolean;
  onOpenCreateModal?: () => void;
  onConvertToTrip?: (proposalId: string) => Promise<void> | void;
}

/**
 * Gerenciador canônico de Propostas de Viagem com suporte completo a modo Lista (Planilha),
 * Grid de cards, renomeação inline, controles rápidos de privacidade/senha/oculta, preview e exportação PDF/PNG.
 */
export function TourismProposalsManager({
  initialProposals,
  store,
  searchParams,
  embedded = false,
  onOpenCreateModal,
  onConvertToTrip,
}: TourismProposalsManagerProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isCompact } = useWindowSizeClass();

  const syncProposalCaches = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["agency-proposals"] }),
      queryClient.invalidateQueries({ queryKey: ["agency-travel-quotes"] }),
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] }),
      queryClient.invalidateQueries({ queryKey: ["lead-dossier"] }),
      queryClient.invalidateQueries({ queryKey: ["customer-360"] }),
      router.invalidate(),
    ]);
  };

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ProposalListStatus>("todos");
  const [viewMode, setViewMode] = useState<ProposalViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("waesy.proposals.viewMode");
      if (saved === "sheet" || saved === "grid") return saved;
    }
    return "sheet";
  });
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(
    Boolean(searchParams?.new || searchParams?.leadId),
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [securityTarget, setSecurityTarget] = useState<TravelProposalDTO | null>(null);
  const [previewProposal, setPreviewProposal] = useState<TravelProposalDTO | null>(null);
  const [whatsappProposal, setWhatsappProposal] = useState<TravelProposalDTO | null>(null);
  const [exportJob, setExportJob] = useState<{
    proposal: TravelProposalDTO;
    format: "pdf" | "png";
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("waesy.proposals.viewMode", viewMode);
    }
  }, [viewMode]);

  const toggleSelectProposal = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const bundleMutation = useMutation({
    mutationFn: (proposalIds: string[]) =>
      bundleTravelProposalsIntoSingleLink({ data: { proposalIds } }),
    onSuccess: (res) => {
      toast.success("Propostas agrupadas em link comparativo único!");
      setSelectedIds([]);
      void syncProposalCaches();
      if (res?.publicToken) {
        window.open(`/proposta/${res.publicToken}`, "_blank");
      }
    },
    onError: (err: any) =>
      toast.error(err?.message || "Erro ao agrupar propostas."),
  });

  const patchProposalMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, any> }) =>
      updateTravelProposal({ data: { id, patch } }),
    onError: (err: any) =>
      toast.error(err?.message || "Erro ao atualizar proposta."),
  });

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["agency-proposals", "all-with-hidden"],
    queryFn: () => listAgencyTravelProposals({ data: { includeHidden: true } }),
    initialData: initialProposals,
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateTravelProposal({ data: { id } }),
    onSuccess: () => {
      toast.success("Proposta duplicada como rascunho!");
      void syncProposalCaches();
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao duplicar proposta."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTravelProposal({ data: { id } }),
    onSuccess: (_res, id) => {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      if (previewProposal?.id === id) setPreviewProposal(null);
      toast.success("Proposta excluída permanentemente.");
      void syncProposalCaches();
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao excluir proposta."),
  });

  const convertMutation = useMutation({
    mutationFn: (proposalId: string) => convertProposalToTrip({ data: { proposalId } }),
    onSuccess: (res) => {
      toast.success(`Viagem gerada com sucesso! Código: ${res.tripNumber}`);
      queryClient.invalidateQueries({ queryKey: ["tourism-trips"] });
      void syncProposalCaches();
      navigate({ to: "/workspace/turismo/viagens/$id", params: { id: res.tripId } });
    },
    onError: (err: any) =>
      toast.error(err?.message || "Erro ao converter proposta em viagem."),
  });

  const triggerCreateProposal = () => {
    if (onOpenCreateModal) {
      onOpenCreateModal();
      return;
    }
    setIsNewModalOpen(true);
  };

  const triggerConvertToTrip = (proposalId: string) => {
    if (onConvertToTrip) {
      void onConvertToTrip(proposalId);
      return;
    }
    convertMutation.mutate(proposalId);
  };

  // Renderizador off-screen para exportação PDF/PNG direto da lista ou grid
  useEffect(() => {
    if (!exportJob) return;
    let cancelled = false;

    const runExport = async () => {
      try {
        await new Promise((r) => setTimeout(r, 80));
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        const canvasEl = document.getElementById("list-offscreen-export-canvas");
        if (canvasEl) {
          const imgs = Array.from(canvasEl.querySelectorAll("img"));
          await Promise.all(
            imgs.map(
              (img) =>
                img.complete
                  ? Promise.resolve()
                  : new Promise<void>((res) => {
                      const timer = setTimeout(res, 2500);
                      img.onload = () => {
                        clearTimeout(timer);
                        res();
                      };
                      img.onerror = () => {
                        clearTimeout(timer);
                        res();
                      };
                    }),
            ),
          );
        }
        if (cancelled) return;
        const filename = sanitizeProposalFilename(
          exportJob.proposal.title,
          exportJob.format,
        );
        if (exportJob.format === "pdf") {
          await exportElementAsPdf("list-offscreen-export-canvas", filename);
          toast.success(`PDF "${filename}" baixado com sucesso.`);
        } else {
          await exportElementAsImage("list-offscreen-export-canvas", filename);
          toast.success(`Imagem "${filename}" baixada com sucesso.`);
        }
      } catch (err: any) {
        if (!cancelled) {
          toast.error(err?.message || "Não foi possível exportar a lâmina.");
        }
      } finally {
        if (!cancelled) setExportJob(null);
      }
    };

    void runExport();
    return () => {
      cancelled = true;
    };
  }, [exportJob]);

  const handleRenameTitle = async (id: string, nextTitle: string) => {
    await patchProposalMutation.mutateAsync({ id, patch: { title: nextTitle } });
    toast.success("Título atualizado!");
    await syncProposalCaches();
  };

  const handleTogglePrivate = async (proposal: TravelProposalDTO) => {
    const prevMode: ProposalVisibilityMode = proposal.visibility_mode || "public";
    const nextMode: ProposalVisibilityMode = prevMode === "private" ? "public" : "private";
    await patchProposalMutation.mutateAsync({
      id: proposal.id,
      patch: { visibility_mode: nextMode },
    });
    await syncProposalCaches();
    toast.success(
      nextMode === "private" ? "Proposta marcada como privada." : "Proposta liberada para acesso público.",
      {
        action: {
          label: "Desfazer",
          onClick: async () => {
            await patchProposalMutation.mutateAsync({
              id: proposal.id,
              patch: { visibility_mode: prevMode },
            });
            await syncProposalCaches();
          },
        },
      },
    );
  };

  const handleToggleHidden = async (proposal: TravelProposalDTO) => {
    const wasHidden = Boolean(proposal.is_hidden);
    const nextHidden = !wasHidden;
    await patchProposalMutation.mutateAsync({
      id: proposal.id,
      patch: { is_hidden: nextHidden },
    });
    await syncProposalCaches();
    toast.success(
      nextHidden ? "Proposta ocultada da lista principal." : "Proposta restaurada na lista ativa.",
      {
        action: {
          label: "Desfazer",
          onClick: async () => {
            await patchProposalMutation.mutateAsync({
              id: proposal.id,
              patch: { is_hidden: wasHidden },
            });
            await syncProposalCaches();
          },
        },
      },
    );
  };

  const handleSaveSecurity = async (params: {
    id: string;
    visibility_mode: ProposalVisibilityMode;
    access_pin?: string | null;
    is_hidden?: boolean;
  }) => {
    await patchProposalMutation.mutateAsync({
      id: params.id,
      patch: {
        visibility_mode: params.visibility_mode,
        ...(params.access_pin !== undefined ? { access_pin: params.access_pin } : {}),
        ...(params.is_hidden !== undefined ? { is_hidden: params.is_hidden } : {}),
      },
    });
    toast.success("Configurações de privacidade e senha salvas!");
    await syncProposalCaches();
  };

  const handlePublishDraft = async (proposal: TravelProposalDTO) => {
    await patchProposalMutation.mutateAsync({
      id: proposal.id,
      patch: { status: "sent" },
    });
    toast.success("Proposta publicada! Aceite online e link habilitados.");
    await syncProposalCaches();
  };

  const handleCopyLink = async (proposal: TravelProposalDTO) => {
    const url = `${window.location.origin}/proposta/${proposal.public_token}`;
    try {
      await navigator.clipboard.writeText(url);
      if (proposal.status === "draft") {
        toast.info("Link copiado (ainda em rascunho — publique para habilitar aceite do cliente).", {
          action: {
            label: "Publicar Agora",
            onClick: () => void handlePublishDraft(proposal),
          },
        });
        return;
      }
      if (proposal.visibility_mode === "private" || proposal.is_hidden) {
        toast.info("Link copiado (atenção: esta proposta está privada/oculta para visitantes).");
        return;
      }
      toast.success("Link público copiado para a área de transferência!");
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível copiar o link.");
    }
  };

  const handleExportJson = (proposal: TravelProposalDTO) => {
    const filename = sanitizeProposalFilename(proposal.title, "json");
    downloadTextFile(JSON.stringify(proposal, null, 2), filename, "application/json;charset=utf-8");
    toast.success(`Arquivo "${filename}" exportado.`);
  };

  const handleExportCsv = (items: TravelProposalDTO[]) => {
    if (items.length === 0) {
      toast.info("Nenhuma proposta visível para exportar.");
      return;
    }
    const originUrl = typeof window !== "undefined" ? window.location.origin : "";
    const csv = buildProposalsCsv(items, originUrl);
    downloadTextFile(csv, "propostas_viagem.csv", "text/csv;charset=utf-8");
    toast.success(`Planilha com ${items.length} proposta(s) exportada em CSV.`);
  };

  const allProposals: TravelProposalDTO[] = useMemo(() => proposals || [], [proposals]);

  const searchFilteredProposals = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allProposals;
    return allProposals.filter(
      (p) =>
        (p.title || "").toLowerCase().includes(q) ||
        (p.client_name || "").toLowerCase().includes(q) ||
        (p.destination_city || "").toLowerCase().includes(q) ||
        (p.client_whatsapp || "").toLowerCase().includes(q),
    );
  }, [allProposals, search]);

  const visibleProposals = useMemo(() => {
    return searchFilteredProposals.filter((p) => {
      const isArchivedOrHidden = Boolean(p.is_hidden) || p.status === "expired";
      const restricted =
        p.visibility_mode === "private" || p.visibility_mode === "password" || Boolean(p.has_access_pin);
      if (selectedStatus === "hidden") return isArchivedOrHidden;
      if (selectedStatus === "restricted") return !isArchivedOrHidden && restricted;
      if (selectedStatus === "draft") return !isArchivedOrHidden && p.status === "draft";
      if (selectedStatus === "sent") return !isArchivedOrHidden && p.status === "sent";
      if (selectedStatus === "approved") return !isArchivedOrHidden && p.status === "approved";
      return !isArchivedOrHidden;
    });
  }, [searchFilteredProposals, selectedStatus]);

  const totalCount = searchFilteredProposals.filter(
    (p) => !p.is_hidden && p.status !== "expired",
  ).length;
  const approvedCount = searchFilteredProposals.filter(
    (p) => !p.is_hidden && p.status === "approved",
  ).length;
  const draftCount = searchFilteredProposals.filter(
    (p) => !p.is_hidden && p.status === "draft",
  ).length;
  const sentCount = searchFilteredProposals.filter(
    (p) => !p.is_hidden && p.status === "sent",
  ).length;
  const restrictedCount = searchFilteredProposals.filter(
    (p) =>
      !p.is_hidden &&
      p.status !== "expired" &&
      (p.visibility_mode === "private" ||
        p.visibility_mode === "password" ||
        Boolean(p.has_access_pin)),
  ).length;
  const hiddenCount = searchFilteredProposals.filter(
    (p) => Boolean(p.is_hidden) || p.status === "expired",
  ).length;
  const totalOfferedCents = searchFilteredProposals
    .filter((p) => !p.is_hidden && p.status !== "expired")
    .reduce((acc, p) => acc + (p.pricing?.total_price_cents || 0), 0);

  const visibleIds = visibleProposals.map((p) => p.id);
  const isAllSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const exportingKey = exportJob ? `${exportJob.proposal.id}:${exportJob.format}` : null;
  const offscreenDims = exportJob
    ? CANVAS_DIMENSIONS[exportJob.proposal.canvas_format || "a4-portrait"] ||
      CANVAS_DIMENSIONS["a4-portrait"]
    : CANVAS_DIMENSIONS["a4-portrait"];

  const content = (
    <div
      className={cn(
        "w-full flex flex-col gap-4",
        !embedded && "px-0 sm:px-4 animate-in fade-in duration-200 min-h-dvh overflow-x-hidden",
      )}
    >
      {/* ── 1. Barra Canônica de Operação Silenciosa ── */}
      <WorkspaceCanonicalToolbar
        tabs={[
          { id: "todos", label: "Ativas", icon: FileText, count: totalCount },
          { id: "draft", label: "Rascunhos", icon: Clock, count: draftCount },
          { id: "sent", label: "Publicadas", icon: Send, count: sentCount },
          { id: "approved", label: "Aprovadas", icon: CheckCircle2, count: approvedCount },
          { id: "restricted", label: "Privadas / Senha", icon: Lock, count: restrictedCount },
          { id: "hidden", label: "Ocultas", icon: EyeOff, count: hiddenCount },
        ]}
        activeTab={selectedStatus}
        onTabChange={(id) => {
          if (isProposalListStatus(id)) setSelectedStatus(id);
        }}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por título, cliente ou destino..."
        onMetricsClick={() => setIsDashboardOpen(true)}
        metricsBadge={totalOfferedCents > 0 ? formatMoney(totalOfferedCents) : undefined}
        secondaryActions={[
          {
            label: "Cotações Recebidas",
            icon: ArrowUpRight,
            onClick: () => navigate({ to: "/workspace/turismo/cotacoes" }),
          },
          {
            label: "Exportar CSV",
            icon: Download,
            onClick: () => handleExportCsv(visibleProposals),
          },
        ]}
        primaryAction={{
          label: "Nova Proposta",
          icon: Plus,
          onClick: triggerCreateProposal,
        }}
        viewSwitcher={
          <div className="flex items-center gap-1 bg-muted/40 border border-border/60 p-1 rounded-lg">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setViewMode("sheet")}
              title="Modo Lista / Planilha (Sheet)"
              aria-label="Visualização em Lista"
              className={cn(
                "h-11 min-h-11 sm:h-7 sm:min-h-7 px-3 rounded-lg text-xs font-medium gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
                viewMode === "sheet"
                  ? "bg-background text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="size-3.5" />
              <span className="hidden sm:inline">Lista</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setViewMode("grid")}
              title="Modo Grade de Cards"
              aria-label="Visualização em Grade"
              className={cn(
                "h-11 min-h-11 sm:h-7 sm:min-h-7 px-3 rounded-lg text-xs font-medium gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
                viewMode === "grid"
                  ? "bg-background text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="size-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </Button>
          </div>
        }
      />

      {selectedIds.length > 0 && (
        <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Layers className="size-4 text-primary shrink-0" />
            <span>
              {selectedIds.length}{" "}
              {selectedIds.length === 1 ? "proposta selecionada" : "propostas selecionadas"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedIds([])}
              className="h-11 min-h-11 sm:h-9 sm:min-h-9 px-3 rounded-lg border-border/70 text-xs font-medium cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              Limpar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                handleExportCsv(allProposals.filter((p) => selectedIds.includes(p.id)))
              }
              className="h-11 min-h-11 sm:h-9 sm:min-h-9 px-3 rounded-lg border-border/70 text-xs font-medium gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Download className="size-3.5" />
              <span>Exportar Seleção</span>
            </Button>
            {selectedIds.length >= 2 && (
              <Button
                type="button"
                variant="outline"
                disabled={bundleMutation.isPending}
                onClick={() => bundleMutation.mutate(selectedIds)}
                className="h-11 min-h-11 sm:h-9 sm:min-h-9 px-4 rounded-lg text-xs font-semibold gap-2 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Layers className="size-3.5" />
                <span>
                  {bundleMutation.isPending
                    ? "Agrupando..."
                    : `Agrupar ${selectedIds.length} em 1 Link`}
                </span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── 2. Área Principal: Loading / Empty / Sheet Table / Grid ── */}
      {isLoading ? (
        <div className="space-y-3" aria-label="Carregando propostas">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="p-4 rounded-2xl border border-border/60 bg-card flex items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-11 w-28 rounded-xl" />
            </div>
          ))}
        </div>
      ) : visibleProposals.length === 0 ? (
        <div className="py-16 text-center space-y-4 bg-card rounded-2xl border border-border/60 p-6">
          <FileText className="size-10 mx-auto text-muted-foreground" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">
              {selectedStatus === "hidden"
                ? "Nenhuma proposta oculta ou arquivada"
                : search.trim() || selectedStatus !== "todos"
                  ? "Nenhuma proposta encontrada para este filtro"
                  : "Nenhuma proposta cadastrada"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {search.trim() || selectedStatus !== "todos"
                ? "Limpe a busca ou alterne a aba para visualizar seus outros pacotes."
                : "Crie sua primeira lâmina com roteiro, hotéis e aéreo para apresentar ao passageiro."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {(search.trim() || selectedStatus !== "todos") && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setSelectedStatus("todos");
                }}
                className="h-11 min-h-11 sm:h-9 sm:min-h-9 px-4 rounded-lg border-border/70 text-xs font-medium cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                Limpar filtros
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={triggerCreateProposal}
              className="h-11 min-h-11 sm:h-9 sm:min-h-9 px-4 rounded-lg border-border/70 text-xs font-medium gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-4" />
              <span>Criar Nova Proposta</span>
            </Button>
          </div>
        </div>
      ) : viewMode === "sheet" && !isCompact ? (
        <ProposalsSheetTable
          proposals={visibleProposals}
          selectedIds={selectedIds}
          exportingKey={exportingKey}
          isAllSelected={isAllSelected}
          onToggleSelect={toggleSelectProposal}
          onToggleSelectAll={toggleSelectAll}
          onPreview={setPreviewProposal}
          onRenameTitle={handleRenameTitle}
          onCopyLink={handleCopyLink}
          onTogglePrivate={handleTogglePrivate}
          onToggleHidden={handleToggleHidden}
          onOpenSecurityDialog={setSecurityTarget}
          onPublishDraft={handlePublishDraft}
          onDuplicate={(p) => duplicateMutation.mutate(p.id)}
          onOpenWhatsappModal={setWhatsappProposal}
          onExportPdf={(p) => setExportJob({ proposal: p, format: "pdf" })}
          onExportPng={(p) => setExportJob({ proposal: p, format: "png" })}
          onExportJson={handleExportJson}
          onConvertToTrip={(p) => triggerConvertToTrip(p.id)}
          onDelete={async (id) => {
            await deleteMutation.mutateAsync(id);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleProposals.map((p) => (
            <ProposalGridCard
              key={p.id}
              proposal={p}
              isSelected={selectedIds.includes(p.id)}
              exportingKey={exportingKey}
              onToggleSelect={toggleSelectProposal}
              onPreview={setPreviewProposal}
              onRenameTitle={handleRenameTitle}
              onCopyLink={handleCopyLink}
              onTogglePrivate={handleTogglePrivate}
              onToggleHidden={handleToggleHidden}
              onOpenSecurityDialog={setSecurityTarget}
              onPublishDraft={handlePublishDraft}
              onDuplicate={(item) => duplicateMutation.mutate(item.id)}
              onOpenWhatsappModal={setWhatsappProposal}
              onExportPdf={(item) => setExportJob({ proposal: item, format: "pdf" })}
              onExportPng={(item) => setExportJob({ proposal: item, format: "png" })}
              onExportJson={handleExportJson}
              onConvertToTrip={(item) => triggerConvertToTrip(item.id)}
              onDelete={async (id) => {
                await deleteMutation.mutateAsync(id);
              }}
            />
          ))}
        </div>
      )}

      {/* ── 3. Renderizador Off-screen para Exportação Rápida PDF/PNG ── */}
      {exportJob && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            left: "-10000px",
            top: 0,
            pointerEvents: "none",
            width: offscreenDims.width,
            opacity: 1,
          }}
        >
          <div
            id="list-offscreen-export-canvas"
            data-proposal-canvas="true"
            style={{
              width: offscreenDims.width,
              minHeight: offscreenDims.minHeight,
            }}
            className="p-canvas-root bg-background"
          >
            <ProposalCanvasRenderer proposal={exportJob.proposal} />
          </div>
        </div>
      )}

      {/* ── 4. Gerador Canônico Unificado de Cotação & Proposta ── */}
      {!onOpenCreateModal && (
        <UnifiedProposalWorkspace
          open={isNewModalOpen}
          onOpenChange={setIsNewModalOpen}
          mode="standalone_proposal"
          initialLeadId={searchParams?.leadId}
          initialClientName={searchParams?.clientName}
          initialClientPhone={searchParams?.clientPhone}
          initialClientEmail={searchParams?.clientEmail}
          initialDestination={searchParams?.destination}
          onCreated={() => void syncProposalCaches()}
        />
      )}

      {/* ── 5. Preview Rápido Lateral ── */}
      <ProposalQuickPreviewSheet
        proposal={previewProposal}
        exportingKey={exportingKey}
        onClose={() => setPreviewProposal(null)}
        onCopyLink={handleCopyLink}
        onPublishDraft={handlePublishDraft}
        onOpenSecurityDialog={setSecurityTarget}
        onOpenWhatsappModal={setWhatsappProposal}
        onExportPdf={(p) => setExportJob({ proposal: p, format: "pdf" })}
        onExportPng={(p) => setExportJob({ proposal: p, format: "png" })}
        onExportJson={handleExportJson}
      />

      {/* ── 6. Controle de Privacidade & Senha (PIN SHA-256) ── */}
      <ProposalPasswordDialog
        proposal={securityTarget}
        isSaving={patchProposalMutation.isPending}
        onClose={() => setSecurityTarget(null)}
        onSaveSecurity={handleSaveSecurity}
      />

      {/* ── 7. Modal de Compartilhamento WhatsApp ── */}
      {whatsappProposal && (
        <ProposalShareWhatsappModal
          isOpen={Boolean(whatsappProposal)}
          onClose={() => setWhatsappProposal(null)}
          proposal={whatsappProposal}
          onExportPdf={() => setExportJob({ proposal: whatsappProposal, format: "pdf" })}
          onExportPng={() => setExportJob({ proposal: whatsappProposal, format: "png" })}
        />
      )}

      {/* ── Painel de Métricas de Propostas ── */}
      <WorkspaceDashboardSheet
        open={isDashboardOpen}
        onOpenChange={setIsDashboardOpen}
        title="Propostas de Viagem"
        description="Indicadores de aprovação de propostas, envio aos passageiros e volume financeiro em negociação."
        metrics={[
          {
            id: "total_prop",
            label: "Total de Propostas",
            value: totalCount,
            icon: FileText,
            description: "Total de lâminas interativas criadas no Studio",
          },
          {
            id: "approved_prop",
            label: "Aprovadas / Fechadas",
            value: approvedCount,
            icon: CheckCircle2,
            trend: { value: "Sucesso", direction: "up" },
            description: "Propostas aceitas pelo cliente prontas para emissão",
          },
          {
            id: "sent_prop",
            label: "Enviadas ao Passageiro",
            value: sentCount,
            icon: Send,
            description: "Lâminas ativas compartilhadas aguardando resposta",
          },
          {
            id: "draft_prop",
            label: "Rascunhos em Edição",
            value: draftCount,
            icon: Clock,
            description: "Propostas em formulação de roteiro",
          },
          {
            id: "total_offered",
            label: "Volume Ofertado Total",
            value: formatMoney(totalOfferedCents),
            icon: DollarSign,
            description: "Somatório de valores das propostas ativas",
          },
        ]}
        breakdown={{
          title: "Distribuição por Status",
          items: [
            {
              label: "Aprovadas",
              value: approvedCount,
              total: Math.max(totalCount, 1),
              color: "bg-emerald-500",
            },
            {
              label: "Enviadas",
              value: sentCount,
              total: Math.max(totalCount, 1),
              color: "bg-sky-500",
            },
            {
              label: "Rascunhos",
              value: draftCount,
              total: Math.max(totalCount, 1),
              color: "bg-warning",
            },
          ],
        }}
      />
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <NicheOperationalGuard
      targetNiche="tourism"
      toolTitle="Propostas de Viagem"
      toolDescription="O criador de lâminas e propostas interativas foi desenvolvido especificamente para agências de turismo e consultores de viagem apresentarem roteiros visuais aos passageiros."
      store={store}
    >
      {content}
    </NicheOperationalGuard>
  );
}
