import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, ArrowUpRight, Calendar, Users, Search, CheckCircle2, Clock, Send, Copy, Trash2, ExternalLink, DollarSign, TrendingUp, MoreVertical, Plane, Layers, Lock, Archive, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { listAgencyTravelProposals, duplicateTravelProposal, deleteTravelProposal, updateTravelProposal, bundleTravelProposalsIntoSingleLink, type TravelProposalDTO } from "@/services/travel-proposal.functions";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { convertProposalToTrip } from "@/services/travel-lifecycle.functions";
import { getStoreSettings } from "@/services/store.functions";
import { NicheOperationalGuard } from "@/components/workspace/niche-operational-guard";
import { UnifiedProposalWorkspace } from "@/components/tourism/unified-proposal-workspace";
import { formatMoney } from "@/lib/money";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { WorkspaceDashboardSheet } from "@/components/workspace/workspace-dashboard-sheet";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";

type ProposalListStatus = "todos" | "draft" | "sent" | "approved" | "rejected" | "expired";
const proposalListStatuses: readonly ProposalListStatus[] = ["todos", "draft", "sent", "approved", "rejected", "expired"];
const isProposalListStatus = (value: string): value is ProposalListStatus => proposalListStatuses.includes(value as ProposalListStatus);

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
 const [selectedStatus, setSelectedStatus] = useState<ProposalListStatus>("todos");
 const [isDashboardOpen, setIsDashboardOpen] = useState(false);
 const [isNewModalOpen, setIsNewModalOpen] = useState(Boolean(searchParams?.new || searchParams?.leadId));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [securityTarget, setSecurityTarget] = useState<TravelProposalDTO | null>(null);
  const [securityValidUntil, setSecurityValidUntil] = useState("");
  const [securityPassword, setSecurityPassword] = useState("");

  const toggleSelectProposal = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const bundleMutation = useMutation({
    mutationFn: (proposalIds: string[]) =>
      bundleTravelProposalsIntoSingleLink({ data: { proposalIds } }),
    onSuccess: (res) => {
      toast.success("Propostas agrupadas com sucesso em link comparativo único!");
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["agency-proposals"] });
      if (res?.publicToken) {
        window.open(`/proposta/${res.publicToken}`, "_blank");
      }
    },
    onError: (err: any) =>
      toast.error(err?.message || "Erro ao agrupar propostas."),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "rejected" | "draft" | "sent" | "expired" }) =>
      updateTravelProposal({ data: { id, patch: { status } } }),
    onSuccess: () => {
      toast.success("Status da proposta atualizado!");
      queryClient.invalidateQueries({ queryKey: ["agency-proposals"] });
    },
    onError: (err: any) =>
      toast.error(err?.message || "Erro ao atualizar proposta."),
  });

  const updateSecurityMutation = useMutation({
    mutationFn: async ({
      id,
      validUntil,
      password,
    }: {
      id: string;
      validUntil?: string;
      password?: string;
    }) => {
      const existing = (proposals || []).find((p: any) => p.id === id);
      const cleanNotes = (existing?.special_notes || "").replace(/\[SENHA:.*?\]\s*/g, "");
      const newNotes = password?.trim()
        ? `[SENHA:${password.trim()}] ${cleanNotes}`.trim()
        : cleanNotes;
      return updateTravelProposal({
        data: {
          id,
          patch: {
            valid_until: validUntil || undefined,
            special_notes: newNotes,
          },
        },
      });
    },
    onSuccess: () => {
      toast.success("Segurança e validade da proposta atualizadas!");
      setSecurityTarget(null);
      queryClient.invalidateQueries({ queryKey: ["agency-proposals"] });
    },
    onError: (err: any) =>
      toast.error(err?.message || "Erro ao salvar validade e senha."),
  });


 const { data: proposals = [], refetch, isLoading } = useQuery({
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

 const handleCopyLink = async (proposal: TravelProposalDTO) => {
 if (proposal.status !== "sent") {
   toast.info("Publique a proposta no Studio antes de compartilhar o link para aceite.");
   return;
 }
 const url = `${window.location.origin}/proposta/${proposal.public_token}`;
 try {
   await navigator.clipboard.writeText(url);
   toast.success("Link público da proposta copiado para a área de transferência!");
 } catch {
   toast.error("Não foi possível copiar o link. Verifique a permissão da área de transferência.");
 }
 };

 const proposalsList = proposals || [];

 // Métricas do Painel
 const totalCount = proposalsList.length;
  const approvedCount = proposalsList.filter((p: any) => p.status === "approved").length;
  const draftCount = proposalsList.filter((p: any) => p.status === "draft").length;
  const sentCount = proposalsList.filter((p: any) => p.status === "sent").length;
  const expiredCount = proposalsList.filter((p: any) => p.status === "expired").length;
  const totalOfferedCents = proposalsList.reduce(
    (acc: number, p: any) => acc + (p.pricing?.total_price_cents || 0),
    0
  );

 return (
 <NicheOperationalGuard
 targetNiche="tourism"
 toolTitle="Propostas de Viagem"
 toolDescription="O criador de lâminas e propostas interativas foi desenvolvido especificamente para agências de turismo e consultores de viagem apresentarem roteiros visuais aos passageiros."
 store={store}
 >
      <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 flex flex-col gap-4 animate-in fade-in duration-200 min-h-dvh overflow-x-hidden">
        {/* ── 1. Barra Canônica de Operação Silenciosa ── */}
        <WorkspaceCanonicalToolbar
          tabs={[
            { id: "todos", label: "Todas", icon: FileText, count: totalCount },
            { id: "draft", label: "Rascunhos", icon: Clock, count: draftCount },
            { id: "sent", label: "Publicadas", icon: Send, count: sentCount },
            { id: "approved", label: "Aprovadas", icon: CheckCircle2, count: approvedCount },
            { id: "expired", label: "Arquivadas", icon: Archive, count: expiredCount },
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

        {selectedIds.length >= 2 && (
          <div className="p-3 rounded-lg border border-primary/40 bg-primary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Layers className="size-4 text-primary shrink-0" />
              <span>{selectedIds.length} propostas selecionadas para agrupar em um único link comparativo (menu de abas no topo).</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedIds([])}
                className="h-11 min-h-11 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-ring"
              >
                Limpar
              </Button>
              <Button
                type="button"
                disabled={bundleMutation.isPending}
                onClick={() => bundleMutation.mutate(selectedIds)}
                className="h-11 min-h-11 text-xs font-bold gap-2 bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Layers className="size-3.5" />
                <span>{bundleMutation.isPending ? "Agrupando..." : `Agrupar ${selectedIds.length} em 1 Link`}</span>
              </Button>
            </div>
          </div>
        )}

 {/* ── 4. GRID DE PROPOSTAS ── */}
 {isLoading ? (
 <div className="waesy-card-grid gap-4" aria-label="Carregando propostas">
 {Array.from({ length: 3 }).map((_, index) => (
 <Card key={index} className="p-5 rounded-lg border border-border/60 bg-card space-y-4">
 <Skeleton className="h-5 w-1/3" />
 <Skeleton className="h-5 w-3/4" />
 <Skeleton className="h-16 w-full" />
 <Skeleton className="h-11 w-full rounded-lg" />
 </Card>
 ))}
 </div>
 ) : proposalsList.length === 0 ? (
 <div className="py-20 text-center space-y-3 bg-card rounded-lg border border-border/60 p-8">
 <FileText className="size-10 mx-auto text-muted-foreground" />
 <h3 className="text-sm font-bold text-foreground">Nenhuma proposta de viagem encontrada</h3>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Crie sua primeira lâmina visual com roteiro completo ou clone um pacote pronto da biblioteca.
 </p>
 <div className="pt-2">
 <Button
 onClick={() => setIsNewModalOpen(true)}
 className="rounded-lg text-xs font-bold bg-primary text-primary-foreground gap-2"
 >
 <Plus className="size-4" />
 Criar Nova Proposta
 </Button>
 </div>
 </div>
 ) : (
 <div className="waesy-card-grid gap-4">
 {proposalsList.map((p: TravelProposalDTO) => {
 const totalCents = p.pricing?.total_price_cents || 0;
 return (
 <Card
 key={p.id}
 className="p-5 rounded-lg border border-border/60 bg-card space-y-4 hover:border-primary/40 transition-colors flex flex-col justify-between group"
 >
 <div className="space-y-3">
 <div className="flex items-center justify-between gap-2">
 <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-mono font-bold px-2 py-1 rounded-md bg-primary/10 text-primary">
   <input
     type="checkbox"
     checked={selectedIds.includes(p.id)}
     onChange={() => toggleSelectProposal(p.id)}
     className="size-4 rounded border-border text-primary focus:ring-primary"
     aria-label={`Selecionar proposta ${p.title} para agrupar`}
   />
   <span>{p.destination_city || "Roteiro"}</span>
 </label>
 <Badge
 variant="outline"
 className={`text-xs font-mono uppercase font-bold ${
 p.status === "approved"
 ? "bg-emerald-50 text-emerald-700 border-emerald-300"
 : ""
 }`}
 >
 {p.status === "approved"
 ? "Aprovada"
 : p.status === "sent"
 ? "Publicada"
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
                          onClick: () => handleCopyLink(p),
                        },
                        ...(p.status !== "sent" && p.status !== "approved"
                          ? [
                              {
                                id: "publish-link",
                                label: "Publicar / Ativar Link",
                                icon: Send,
                                onClick: () => updateStatusMutation.mutate({ id: p.id, status: "sent" }),
                              },
                            ]
                          : []),
                        {
                          id: "security-validity",
                          label: "Prazo de Validade e Senha",
                          icon: Lock,
                          onClick: () => {
                            setSecurityTarget(p);
                            setSecurityValidUntil(p.valid_until ? p.valid_until.slice(0, 10) : "");
                            setSecurityPassword(p.access_pin || "");
                          },
                        },
                        ...(p.status !== "expired"
                          ? [
                              {
                                id: "archive-prop",
                                label: "Arquivar / Ocultar Proposta",
                                icon: EyeOff,
                                onClick: () => updateStatusMutation.mutate({ id: p.id, status: "expired" }),
                              },
                            ]
                          : []),
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
 <p className="font-mono text-xs">{p.client_whatsapp}</p>
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
 asChild
 size="default"
 variant="outline"
 className="flex-1 rounded-lg text-xs font-bold h-11 min-h-11 cursor-pointer"
 >
 <Link to="/proposta/$token" params={{ token: p.public_token }} target="_blank">
 <ExternalLink className="mr-2 size-3" />
 <span>Ver Online</span>
 </Link>
 </Button>
 <Button
 asChild
 size="default"
 className="flex-1 rounded-lg text-xs font-bold h-11 min-h-11 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
 >
 <Link to="/workspace/turismo/propostas/$id" params={{ id: p.id }}>
 <span>Abrir Studio</span>
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
                  className="w-full rounded-lg text-xs font-bold h-11 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 cursor-pointer"
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

 {/* ── 5. GERADOR CANÔNICO UNIFICADO DE COTAÇÃO & PROPOSTA (WEB + HTML2PDF + INFOTRAVEL) ── */}
 <UnifiedProposalWorkspace
 open={isNewModalOpen}
 onOpenChange={setIsNewModalOpen}
 mode="standalone_proposal"
 initialLeadId={searchParams?.leadId}
 initialClientName={searchParams?.clientName}
 initialClientPhone={searchParams?.clientPhone}
 initialClientEmail={searchParams?.clientEmail}
 initialDestination={searchParams?.destination}
 />

 {/* Modal de Validade e Senha */}
        <Sheet open={Boolean(securityTarget)} onOpenChange={(open) => !open && setSecurityTarget(null)}>
          <SheetContent className="space-y-4">
            <SheetHeader>
              <SheetTitle>Validade e Senha da Proposta</SheetTitle>
              <SheetDescription>
                Configure prazo limite para auto-arquivamento ou senha de acesso numérico/PIN.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="validity-input">Data Limite de Validade</Label>
                <Input
                  id="validity-input"
                  type="date"
                  value={securityValidUntil}
                  onChange={(e) => setSecurityValidUntil(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-input">Senha / PIN de Acesso (Opcional)</Label>
                <Input
                  id="password-input"
                  type="text"
                  placeholder="Ex: 1234 ou VIAGEM2026"
                  value={securityPassword}
                  onChange={(e) => setSecurityPassword(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
            <SheetFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSecurityTarget(null)}
                className="h-11 min-h-11"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={updateSecurityMutation.isPending}
                onClick={() => {
                  if (securityTarget) {
                    updateSecurityMutation.mutate({
                      id: securityTarget.id,
                      validUntil: securityValidUntil,
                      password: securityPassword,
                    });
                  }
                }}
                className="h-11 min-h-11 bg-primary text-primary-foreground font-bold"
              >
                {updateSecurityMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

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
         color: "bg-amber-500",
       },
     ],
   }}
 />
 </div>
 </NicheOperationalGuard>
 );
}
