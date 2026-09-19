import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  Send,
  Copy,
  Scale,
  Trash2,
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import {
  WorkspaceDashboardSheet,
  type MetricCardItem,
} from "@/components/workspace/workspace-dashboard-sheet";
import { toast } from "sonner";
import {
  listAgencyTravelContracts,
  deleteTravelContract,
  type TravelContractDTO,
} from "@/services/travel-contract.functions";
import { AgencyClausesEditorModal } from "@/components/tourism/contract/agency-clauses-editor-modal";
import { NewTravelContractSheet } from "@/components/tourism/contract/new-travel-contract-sheet";
import { getStoreSettings } from "@/services/store.functions";
import { NicheOperationalGuard } from "@/components/workspace/niche-operational-guard";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/workspace/turismo/contratos/")({
  head: () => ({
    meta: [{ title: "Contratos Turísticos & Assinatura Digital | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
    const [contracts, store] = await Promise.all([
      listAgencyTravelContracts().catch(() => []),
      getStoreSettings().catch(() => null),
    ]);
    return { contracts: contracts || [], store };
    } catch (err) {
      console.error("[loader:workspace.turismo.contratos.index] Unhandled error:", err);
      return { contracts: null, store: null };
    }
  },
  component: WorkspaceContractsIndexPage,
});

export default function WorkspaceContractsIndexPage() {
  const { contracts: initialContracts, store } = ((Route.useLoaderData?.() as any) || {});
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isClausesModalOpen, setIsClausesModalOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  const { data: contracts = [], refetch } = useQuery({
    queryKey: ["agency-contracts", selectedStatus, search],
    queryFn: () =>
      listAgencyTravelContracts({
        data: {
          status: selectedStatus !== "all" ? selectedStatus : undefined,
          search: search || undefined,
        },
      }),
    initialData: initialContracts,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTravelContract({ data: { id } }),
    onSuccess: () => {
      toast.success("Contrato excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["agency-contracts"] });
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao excluir contrato."),
  });

  const handleCopyLink = (publicToken: string) => {
    const url = `${window.location.origin}/contrato/${publicToken}`;
    navigator.clipboard.writeText(url);
    toast.success("Link para assinatura eletrônica copiado!");
  };

  const contractsList = contracts || [];

  // Métricas do Painel Jurídico
  const totalCount = contractsList.length;
  const signedCount = contractsList.filter((c: any) => c.status === "signed").length;
  const pendingCount = contractsList.filter((c: any) => c.status !== "signed" && c.status !== "cancelled").length;
  const totalValueCents = contractsList.reduce((acc: number, c: any) => acc + (c.total_value_cents || 0), 0);

  const metricsItems: MetricCardItem[] = [
    {
      label: "Total de Contratos",
      value: `${totalCount} minutas`,
      description: "Contratos e termos cadastrados",
    },
    {
      label: "Assinados Digitalmente",
      value: `${signedCount} contratos`,
      description: "Validados com hash SHA-256 e IP",
    },
    {
      label: "Aguardando Assinatura",
      value: `${pendingCount} pendentes`,
      description: "Links ativos aguardando passageiro",
    },
    {
      label: "Volume Contratado",
      value: formatMoney(totalValueCents),
      description: "Valor formalizado em reservas",
    },
  ];

  const TABS = [
    { id: "all", label: "Todos os Contratos", icon: FileText, count: totalCount },
    { id: "signed", label: "Assinados", icon: CheckCircle2, count: signedCount },
    { id: "sent", label: "Aguardando Assinatura", icon: Clock, count: pendingCount },
  ];

  return (
    <NicheOperationalGuard
      targetNiche="tourism"
      toolTitle="Contratos Turísticos & Assinatura Digital"
      toolDescription="Gestão de minutas, contratos com validade jurídica e link de assinatura digital para passageiros e contratantes de pacotes turísticos."
      store={store}
    >
      <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
        {/* ── 1. TOOLBAR CANÔNICA PADRÃO Waesy ── */}
        <WorkspaceCanonicalToolbar
          tabs={TABS}
          activeTab={selectedStatus}
          onTabChange={(id) => setSelectedStatus(id)}
          searchPlaceholder="Buscar contrato por título, cliente ou destino..."
          searchValue={search}
          onSearchChange={setSearch}
          onOpenDashboard={() => setIsDashboardOpen(true)}
          dashboardLabel="Métricas Jurídicas"
          metricsBadge={`${signedCount} assinados`}
          primaryAction={{
            label: "Emitir Contrato",
            icon: Plus,
            onClick: () => setIsNewModalOpen(true),
          }}
          secondaryAction={{
            label: "Minuta & Cláusulas Padrão",
            icon: Scale,
            onClick: () => setIsClausesModalOpen(true),
          }}
        />

        {/* ── 2. GRID DE CONTRATOS ── */}
        {contractsList.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-card rounded-2xl border border-dashed border-border/70 p-6 sm:p-8">
            <FileText className="size-12 mx-auto text-muted-foreground/40" />
            <h3 className="text-sm font-bold text-foreground">Nenhum contrato encontrado</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Emita minutas com cláusulas padrão, pacotes detalhados e link público com validade jurídica para assinatura na tela.
            </p>
            <Button
              size="sm"
              onClick={() => setIsNewModalOpen(true)}
              className="rounded-xl text-xs font-bold gap-1.5 h-11 sm:h-9 mt-2 cursor-pointer shadow-xs"
            >
              <Plus className="size-4" />
              <span>Emitir Primeiro Contrato</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contractsList.map((c: TravelContractDTO) => {
              const isSigned = c.status === "signed";
              return (
                <Card
                  key={c.id}
                  className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 space-y-4 hover:border-foreground/20 transition-all flex flex-col justify-between shadow-2xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold">
                          Token: {c.public_token}
                        </span>
                        <h3 className="text-sm font-bold text-foreground line-clamp-1">
                          {c.contract_title}
                        </h3>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold uppercase ${
                          isSigned
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        }`}
                      >
                        {isSigned ? "Assinado" : "Pendente"}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>
                        <strong className="text-foreground">Contratante:</strong> {c.client_name}
                      </p>
                      <p>
                        <strong className="text-foreground">Destino:</strong> {c.destination}
                      </p>
                      {c.travel_start_date && (
                        <p>
                          <strong className="text-foreground">Período:</strong>{" "}
                          {c.travel_start_date} {c.travel_end_date ? `a ${c.travel_end_date}` : ""}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">Valor:</span>
                      <span className="text-sm font-black text-foreground font-mono">
                        {formatMoney(c.total_value_cents)}
                      </span>
                    </div>

                    {isSigned && (c.signatures || []).length > 0 && (
                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 text-[11px] space-y-1">
                        <p className="font-bold text-foreground flex items-center gap-1">
                          <CheckCircle2 className="size-3 text-emerald-600" />
                          <span>Assinado por {c.signatures[0].signer_name}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          Hash: {((c.signatures[0] as any)?.signature_hash || (c.signatures[0] as any)?.hash || "").substring(0, 24)}...
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(c.public_token)}
                      className="rounded-xl text-xs font-bold gap-1.5 h-11 sm:h-8 px-3 flex-1"
                    >
                      <Copy className="size-3.5 sm:size-3" />
                      <span>Copiar Link</span>
                    </Button>

                    <Button
                      asChild
                      variant="secondary"
                      size="sm"
                      className="rounded-xl text-xs font-bold gap-1.5 h-11 sm:h-8 px-3"
                    >
                      <a
                        href={`/contrato/${c.public_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="size-3.5 sm:size-3" />
                        <span>Abrir</span>
                      </a>
                    </Button>

                    {isSigned && (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs font-bold gap-1.5 h-11 sm:h-8 px-3 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                        title="Ver protocolo criptográfico e termo de quitação"
                      >
                        <a href={`/verify/document/${c.public_token}`} target="_blank" rel="noreferrer">
                          <CheckCircle2 className="size-3.5 sm:size-3" />
                          <span>Validar</span>
                        </a>
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Deseja excluir este contrato?`)) {
                          deleteMutation.mutate(c.id);
                        }
                      }}
                      className="size-11 sm:size-8 p-0 rounded-xl text-muted-foreground hover:text-destructive"
                      title="Excluir contrato"
                      aria-label="Excluir contrato"
                    >
                      <Trash2 className="size-4 sm:size-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── 3. MODAIS & SHEETS CANÔNICOS ── */}
        <NewTravelContractSheet
          open={isNewModalOpen}
          onOpenChange={setIsNewModalOpen}
          storeId={store?.id || ""}
          onSuccess={refetch}
        />

        <AgencyClausesEditorModal
          open={isClausesModalOpen}
          onOpenChange={setIsClausesModalOpen}
          storeId={store?.id || ""}
        />

        {/* ── 4. DASHBOARD SHEET DE MÉTRICAS JURÍDICAS ── */}
        <WorkspaceDashboardSheet
          isOpen={isDashboardOpen}
          onClose={() => setIsDashboardOpen(false)}
          title="Painel Jurídico de Contratos"
          subtitle="Status de assinatura eletrônica e conformidade legal"
          metrics={metricsItems}
        />
      </div>
    </NicheOperationalGuard>
  );
}
