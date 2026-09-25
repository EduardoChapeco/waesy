import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
 FileText,
 Plus,
 ArrowUpRight,
 Calendar,
 Users,
 Search,
 CheckCircle2,
 Clock,
 Send,
 Copy,
 Trash2,
 ExternalLink,
 DollarSign,
 TrendingUp,
 MoreVertical,
 Plane,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
 listAgencyTravelProposals,
 duplicateTravelProposal,
 deleteTravelProposal,
 type TravelProposalDTO,
} from "@/services/travel-proposal.functions";
import { convertProposalToTrip } from "@/services/travel-lifecycle.functions";
import { getStoreSettings } from "@/services/store.functions";
import { NicheOperationalGuard } from "@/components/workspace/niche-operational-guard";
import { NewTravelProposalSheet } from "@/components/tourism/new-travel-proposal-sheet";
import { formatMoney } from "@/lib/money";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { WorkspaceDashboardSheet } from "@/components/workspace/workspace-dashboard-sheet";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";

export const Route = createFileRoute("/workspace/turismo/propostas/")({
 head: () => ({ meta: [{ title: "Propostas de Viagem | Workspace Waesy" }] }),
 validateSearch: (search: Record<string, unknown>): {
  leadId?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  destination?: string;
  new?: boolean;
 } => ({
  leadId: (search.leadId as string) || undefined,
  clientName: (search.clientName as string) || undefined,
  clientPhone: (search.clientPhone as string) || undefined,
  clientEmail: (search.clientEmail as string) || undefined,
  destination: (search.destination as string) || undefined,
  new: search.new === true || search.new === "true" || undefined,
 }),
 loader: async () => {
   try {
 const [proposals, store] = await Promise.all([
 listAgencyTravelProposals().catch(() => []),
 getStoreSettings().catch(() => null),
 ]);
 return { proposals: proposals || [], store };
   } catch (err) {
     console.error("[loader:workspace.turismo.propostas.index] Unhandled error:", err);
     return { proposals: null, store: null };
   }
 },
 component: WorkspaceProposalsIndexPage,
});

function WorkspaceProposalsIndexPage() {
 const { proposals: initialProposals, store } = ((Route.useLoaderData?.() as any) || {});
 const searchParams = Route.useSearch();
 const navigate = useNavigate();
 const queryClient = useQueryClient();

 const [search, setSearch] = useState("");
 const [selectedStatus, setSelectedStatus] = useState("todos");
 const [isDashboardOpen, setIsDashboardOpen] = useState(false);
 const [isNewModalOpen, setIsNewModalOpen] = useState(Boolean(searchParams?.new || searchParams?.leadId));

 const { data: proposals = [], refetch } = useQuery({
 queryKey: ["agency-proposals", selectedStatus, search],
 queryFn: () =>
 listAgencyTravelProposals({
 data: {
 status: selectedStatus !== "todos" ? selectedStatus : undefined,
 search: search || undefined,
 },
 }),
 initialData: initialProposals,
 });

 const duplicateMutation = useMutation({
 mutationFn: (id: string) => duplicateTravelProposal({ data: { id } }),
 onSuccess: () => {
 toast.success("Proposta duplicada com sucesso!");
 queryClient.invalidateQueries({ queryKey: ["agency-proposals"] });
 },
 onError: (err: any) => toast.error(err?.message || "Erro ao duplicar proposta."),
 });

 const deleteMutation = useMutation({
   mutationFn: (id: string) => deleteTravelProposal({ data: { id } }),
   onSuccess: () => {
     toast.success("Proposta excluída!");
     queryClient.invalidateQueries({ queryKey: ["agency-proposals"] });
   },
   onError: (err: any) => toast.error(err?.message || "Erro ao excluir proposta."),
 });

 const convertMutation = useMutation({
   mutationFn: (proposalId: string) => convertProposalToTrip({ data: { proposalId } }),
   onSuccess: (res) => {
     toast.success(`Viagem gerada com sucesso! Código: ${res.tripNumber}`);
     queryClient.invalidateQueries({ queryKey: ["agency-proposals"] });
     queryClient.invalidateQueries({ queryKey: ["tourism-trips"] });
     navigate({ to: "/workspace/turismo/viagens/$id", params: { id: res.tripId } });
   },
   onError: (err: any) => toast.error(err?.message || "Erro ao converter proposta em viagem."),
 });

 const handleCopyLink = (publicToken: string) => {
 const url = `${window.location.origin}/proposta/${publicToken}`;
 navigator.clipboard.writeText(url);
 toast.success("Link da lâmina copiado para a área de transferência!");
 };

 const proposalsList = proposals || [];

 // Métricas do Painel
 const totalCount = proposalsList.length;
  const approvedCount = proposalsList.filter((p: any) => p.status === "approved").length;
  const draftCount = proposalsList.filter((p: any) => p.status === "draft").length;
  const sentCount = proposalsList.filter((p: any) => p.status === "sent").length;
  const totalOfferedCents = proposalsList.reduce(
    (acc: number, p: any) => acc + (p.pricing?.total_price_cents || 0),
    0
  );

 return (
 <NicheOperationalGuard
 targetNiche="tourism"
 toolTitle="Lâminas & Propostas de Viagem"
 toolDescription="O criador de lâminas e propostas interativas foi desenvolvido especificamente para agências de turismo e consultores de viagem apresentarem roteiros visuais aos passageiros."
 store={store}
 >
      <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 flex flex-col gap-4 animate-in fade-in duration-200 min-h-[calc(100dvh-8.5rem)] overflow-x-hidden">
        {/* ── 1. Barra Canônica de Operação Silenciosa ── */}
        <WorkspaceCanonicalToolbar
          tabs={[
            { id: "todos", label: "Todas", icon: FileText, count: totalCount },
            { id: "draft", label: "Rascunhos", icon: Clock, count: draftCount },
            { id: "sent", label: "Enviadas", icon: Send, count: sentCount },
            { id: "approved", label: "Aprovadas", icon: CheckCircle2, count: approvedCount },
          ]}
          activeTab={selectedStatus}
          onTabChange={(id) => setSelectedStatus(id)}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por título, cliente ou destino..."
          onMetricsClick={() => setIsDashboardOpen(true)}
          metricsBadge={totalOfferedCents > 0 ? formatMoney(totalOfferedCents) : undefined}
          secondaryAction={{
            label: "Cotações Recebidas",
            icon: ArrowUpRight,
            onClick: () => navigate({ to: "/workspace/turismo/cotacoes" }),
          }}
          primaryAction={{
            label: "Nova Proposta",
            icon: Plus,
            onClick: () => setIsNewModalOpen(true),
          }}
        />

 {/* ── 4. GRID DE PROPOSTAS ── */}
 {proposalsList.length === 0 ? (
 <div className="py-20 text-center space-y-3 bg-card rounded-2xl border border-border/60 p-8">
 <FileText className="size-10 mx-auto text-muted-foreground" />
 <h3 className="text-sm font-bold text-foreground">Nenhuma proposta de viagem encontrada</h3>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Crie sua primeira lâmina visual com roteiro completo ou clone um pacote pronto da biblioteca.
 </p>
 <div className="pt-2">
 <Button
 onClick={() => setIsNewModalOpen(true)}
 className="rounded-xl text-xs font-bold bg-primary text-primary-foreground gap-1.5"
 >
 <Plus className="size-4" />
 Criar Nova Proposta
 </Button>
 </div>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {proposalsList.map((p: TravelProposalDTO) => {
 const totalCents = p.pricing?.total_price_cents || 0;
 return (
 <Card
 key={p.id}
 className="p-5 rounded-2xl border border-border/60 bg-card space-y-4 hover:border-primary/40 transition-all flex flex-col justify-between group"
 >
 <div className="space-y-2.5">
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
 {p.destination_city}
 </span>
 <Badge
 variant="outline"
 className={`text-[10px] font-mono uppercase font-bold ${
 p.status === "approved"
 ? "bg-emerald-50 text-emerald-700 border-emerald-300"
 : ""
 }`}
 >
 {p.status === "approved"
 ? "✓ Aprovada"
 : p.status === "sent"
 ? "Enviada"
 : "Rascunho"}
 </Badge>
                    <CrudActionsMenu
                      entityName="Proposta"
                      editUrl={`/workspace/turismo/propostas/${p.id}`}
                      viewUrl={`/proposta/${p.public_token}`}
                      onDuplicate={() => duplicateMutation.mutate(p.id)}
                      onDelete={async () => {
                        await deleteMutation.mutateAsync(p.id);
                      }}
                      deleteConfirmTitle={`Excluir proposta "${p.title}"?`}
                      deleteConfirmDescription="Esta ação removerá permanentemente a proposta e seus orçamentos associados."
                      customActions={[
                        {
                          id: "copy-link",
                          label: "Copiar Link Público",
                          icon: Copy,
                          onClick: () => handleCopyLink(p.public_token),
                        },
                        ...(p.status !== "approved"
                          ? [
                              {
                                id: "convert-trip",
                                label: "Converter em Viagem",
                                icon: Plane,
                                onClick: () => convertMutation.mutate(p.id),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </div>

 <h3 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
 {p.title}
 </h3>

 <div className="space-y-1 text-xs text-muted-foreground">
 <p>
 Passageiro: <span className="font-bold text-foreground">{p.client_name}</span>
 </p>
 <p className="font-mono text-[11px]">{p.client_whatsapp}</p>
 </div>

 <div className="pt-2 border-t border-border/40 flex items-center justify-between">
 <span className="text-xs text-muted-foreground">Valor Total:</span>
 <span className="text-sm font-black font-mono text-foreground">
 {formatMoney(totalCents)}
 </span>
 </div>
 </div>

 <div className="space-y-2 pt-2 border-t border-border/40">
 <div className="flex items-center gap-2">
 <Button
 size="sm"
 variant="outline"
 className="flex-1 rounded-xl text-xs font-bold h-9 cursor-pointer"
 >
 <Link to="/proposta/$token" params={{ token: p.public_token }} target="_blank">
 <ExternalLink className="mr-1.5 size-3" />
 Ver Online
 </Link>
 </Button>
 <Button
 size="sm"
 className="flex-1 rounded-xl text-xs font-bold h-9 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
 >
 <Link to="/workspace/turismo/propostas/$id" params={{ id: p.id }}>
 Abrir Studio
 </Link>
 </Button>
 </div>

 {/* Botão de 1-Clique para Converter em Viagem Operacional */}
 {p.status === "approved" && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => convertMutation.mutate(p.id)}
                  disabled={convertMutation.isPending}
                  className="w-full rounded-xl text-xs font-bold h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer"
                >
                  <Plane className="size-3.5" />
                  {convertMutation.isPending ? "Gerando Viagem..." : "Gerar Viagem & Vouchers"}
                </Button>
              )}
            </div>
          </Card>
 );
 })}
 </div>
 )}

 {/* ── 5. SHEET DE CRIAÇÃO AVANÇADA (TRAVELOS STUDIO) ── */}
 <NewTravelProposalSheet
 isOpen={isNewModalOpen}
 onOpenChange={setIsNewModalOpen}
 initialLeadId={searchParams?.leadId}
 initialClientName={searchParams?.clientName}
 initialClientPhone={searchParams?.clientPhone}
 initialClientEmail={searchParams?.clientEmail}
 initialDestination={searchParams?.destination}
 />

 {/* ── Painel de Métricas de Propostas ── */}
 <WorkspaceDashboardSheet
   open={isDashboardOpen}
   onOpenChange={setIsDashboardOpen}
   title="Painel de Propostas & Lâminas de Viagem"
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
         color: "bg-amber-500",
       },
     ],
   }}
 />
 </div>
 </NicheOperationalGuard>
 );
}
