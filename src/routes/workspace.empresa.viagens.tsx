import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Users,
  ShieldCheck,
  CreditCard,
  FileText,
  AlertTriangle,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  FolderKanban,
  Plane,
  Receipt,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { useWorkspaceStore } from "@/lib/store-context";
import { formatMoney } from "@/lib/money";
import {
  getCompanyCorporateAccount,
  listCompanyApprovalRequests,
  listCompanyCorporateTrips,
  listCompanyTravelProjects,
  listCompanyTravelers,
  getCompanyTravelPolicy,
  getCorporateCreditProfile,
  listCorporateInvoices,
  listCompanyAirCredits,
  reviewApprovalRequest,
} from "@/services/corporate-travel.functions";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/workspace/empresa/viagens")({
  head: () => ({
    meta: [{ title: "Viagens da Empresa & Hub Corporativo | Workspace" }],
  }),
  component: CompanyCorporateTravelPage,
});

type TabType = "aprovacoes" | "viagens" | "projetos" | "viajantes" | "politica" | "financeiro";

export default function CompanyCorporateTravelPage() {
  const { currentStore } = useWorkspaceStore();
  const companyId = currentStore?.id || "";

  const [activeTab, setActiveTab] = useState<TabType>("aprovacoes");
  const [searchTerm, setSearchTerm] = useState("");
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    requestId: string;
    action: "approve" | "reject";
    totalAmountCents: number;
    requesterName?: string;
  }>({
    open: false,
    requestId: "",
    action: "approve",
    totalAmountCents: 0,
  });
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // 1. Conta Corporativa Vinculada
  const { data: account, isLoading: isAccountLoading } = useQuery({
    queryKey: ["company-corporate-account", companyId],
    queryFn: () => getCompanyCorporateAccount({ data: { companyId } }),
    enabled: Boolean(companyId),
  });

  const agencyId = account?.agency_id || "";

  // 2. Aprovações da Empresa
  const {
    data: approvals = [],
    isLoading: isApprovalsLoading,
    refetch: refetchApprovals,
  } = useQuery({
    queryKey: ["company-approval-requests", companyId],
    queryFn: () => listCompanyApprovalRequests({ data: { companyId, status: "all" } }),
    enabled: Boolean(companyId && account),
  });

  // 3. Viagens Corporativas da Empresa
  const { data: trips = [], isLoading: isTripsLoading } = useQuery({
    queryKey: ["company-corporate-trips", companyId],
    queryFn: () => listCompanyCorporateTrips({ data: { companyId } }),
    enabled: Boolean(companyId && account),
  });

  // 4. Projetos de Viagem
  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ["company-travel-projects", companyId],
    queryFn: () => listCompanyTravelProjects({ data: { companyId } }),
    enabled: Boolean(companyId && account),
  });

  // 5. Viajantes Cadastrados
  const { data: travelers = [], isLoading: isTravelersLoading } = useQuery({
    queryKey: ["company-travelers", companyId],
    queryFn: () => listCompanyTravelers({ data: { companyId } }),
    enabled: Boolean(companyId && account),
  });

  // 6. Política Vigente
  const { data: policy, isLoading: isPolicyLoading } = useQuery({
    queryKey: ["company-travel-policy", companyId],
    queryFn: () => getCompanyTravelPolicy({ data: { companyId } }),
    enabled: Boolean(companyId && account),
  });

  // 7. Perfil de Crédito e Faturas
  const { data: creditProfile } = useQuery({
    queryKey: ["company-credit-profile", companyId, agencyId],
    queryFn: () => getCorporateCreditProfile({ data: { companyId, agencyId } }),
    enabled: Boolean(companyId && agencyId),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["company-invoices", companyId],
    queryFn: () => listCorporateInvoices({ data: { companyId } }),
    enabled: Boolean(companyId && account),
  });

  // 8. Créditos Aéreos da Empresa
  const { data: airCredits = [] } = useQuery<any[]>({
    queryKey: ["company-air-credits", companyId],
    queryFn: () => listCompanyAirCredits({ data: { companyId } }) as any,
    enabled: Boolean(companyId && account),
  });

  const pendingApprovals = useMemo(() => {
    return approvals.filter((a) => a.status === "pending");
  }, [approvals]);

  const handleOpenReview = (
    requestId: string,
    action: "approve" | "reject",
    totalAmountCents: number,
    requesterName?: string
  ) => {
    setReviewComment("");
    setReviewDialog({
      open: true,
      requestId,
      action,
      totalAmountCents,
      requesterName,
    });
  };

  const handleConfirmReview = async () => {
    if (!reviewDialog.requestId) return;
    setIsSubmittingReview(true);
    try {
      await reviewApprovalRequest({
        data: {
          requestId: reviewDialog.requestId,
          action: reviewDialog.action,
          comments: reviewComment.trim() || undefined,
        },
      });
      toast.success(
        reviewDialog.action === "approve"
          ? "Solicitação aprovada com sucesso!"
          : "Solicitação recusada."
      );
      setReviewDialog((prev) => ({ ...prev, open: false }));
      refetchApprovals();
    } catch (err: any) {
      toast.error("Erro ao revisar solicitação: " + (err?.message || "Falha desconhecida"));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Estado 1: Loading
  if (isAccountLoading) {
    return (
      <div className="flex flex-col min-h-dvh bg-background text-foreground">
        <WorkspaceCanonicalToolbar title="Hub de Viagens Corporativas" />
        <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-4">
          <div className="h-11 bg-muted rounded-lg animate-pulse motion-reduce:animate-none" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="h-24 bg-muted rounded-lg animate-pulse motion-reduce:animate-none" />
            <div className="h-24 bg-muted rounded-lg animate-pulse motion-reduce:animate-none" />
            <div className="h-24 bg-muted rounded-lg animate-pulse motion-reduce:animate-none" />
            <div className="h-24 bg-muted rounded-lg animate-pulse motion-reduce:animate-none" />
          </div>
        </div>
      </div>
    );
  }

  // Estado 2: Sem conta corporativa vinculada (Empty state informativo)
  if (!account) {
    return (
      <div className="flex flex-col min-h-dvh bg-background text-foreground">
        <WorkspaceCanonicalToolbar title="Hub de Viagens Corporativas" />
        <div className="p-4 sm:p-6 max-w-3xl w-full mx-auto my-auto text-center space-y-4">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Building2 className="size-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Nenhuma Conta Corporativa Ativa
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sua empresa ainda não possui um vínculo ativo com uma agência de turismo homologada.
            Para habilitar o módulo corporativo com gestão de políticas, faturamento e bookers delegados,
            entre em contato com uma agência credenciada ou solicite a vinculação.
          </p>
          <div className="pt-2 flex justify-center">
            <Button
              variant="default"
              className="h-11 min-h-11 px-6 font-semibold focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => toast.info("Funcionalidade de solicitação disponível pelo catálogo de agências")}
            >
              Consultar Agências Parceiras
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <WorkspaceCanonicalToolbar title="Hub de Viagens Corporativas">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">
            {account.agency_name || "Agência Parceira"}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {account.status === "active" ? "Conta Ativa" : "Em Revisão"}
          </Badge>
        </div>
      </WorkspaceCanonicalToolbar>

      <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Painel de Métricas Tufte (Sem Card Soup) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-border bg-card space-y-1">
            <span className="text-xs text-muted-foreground">Aprovações Pendentes</span>
            <p className="text-2xl font-bold text-foreground">{pendingApprovals.length}</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card space-y-1">
            <span className="text-xs text-muted-foreground">Viagens Registradas</span>
            <p className="text-2xl font-bold text-foreground">{trips.length}</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card space-y-1">
            <span className="text-xs text-muted-foreground">Projetos Ativos</span>
            <p className="text-2xl font-bold text-foreground">{projects.length}</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card space-y-1">
            <span className="text-xs text-muted-foreground">Créditos de Bilhete Aéreo</span>
            <p className="text-2xl font-bold text-foreground">{airCredits.length}</p>
          </div>
        </div>

        {/* Régua de Navegação Horizontal Contínua (B.39) */}
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar border-b border-border pb-2">
          {[
            { id: "aprovacoes", label: `Aprovações (${pendingApprovals.length})`, icon: Clock },
            { id: "viagens", label: `Viagens (${trips.length})`, icon: Plane },
            { id: "projetos", label: `Projetos (${projects.length})`, icon: FolderKanban },
            { id: "viajantes", label: `Viajantes (${travelers.length})`, icon: Users },
            { id: "politica", label: "Política de Viagem", icon: ShieldCheck },
            { id: "financeiro", label: `Financeiro & Faturas (${invoices.length})`, icon: Receipt },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`h-11 min-h-11 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Conteúdo da Aba Ativa */}

        {/* 1. ABA: APROVAÇÕES */}
        {activeTab === "aprovacoes" && (
          <div className="space-y-4">
            {isApprovalsLoading ? (
              <div className="space-y-3">
                <div className="h-16 bg-muted rounded-lg animate-pulse motion-reduce:animate-none" />
                <div className="h-16 bg-muted rounded-lg animate-pulse motion-reduce:animate-none" />
              </div>
            ) : approvals.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-lg bg-card text-muted-foreground space-y-2">
                <CheckCircle2 className="size-8 mx-auto text-primary" />
                <p className="text-sm font-medium">Nenhuma solicitação de aprovação no momento</p>
                <p className="text-xs text-muted-foreground">
                  Quando um booker solicitar uma viagem com itens fora da política, ela aparecerá aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {approvals.map((req) => {
                  const isPending = req.status === "pending";
                  const isExpired =
                    req.status === "expired" ||
                    (isPending && new Date(req.fare_expires_at).getTime() < Date.now());

                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-lg border border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {req.project_title ? `Projeto: ${req.project_title}` : "Solicitação de Viagem"}
                          </span>
                          <Badge
                            variant={
                              isPending
                                ? "outline"
                                : req.status === "approved" || req.status === "auto_approved"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {isExpired
                              ? "Tarifa Expirada"
                              : req.status === "pending"
                              ? "Pendente"
                              : req.status === "approved"
                              ? "Aprovado"
                              : req.status === "auto_approved"
                              ? "Auto-Aprovado"
                              : "Recusado"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Solicitante: {req.requester_name || "Colaborador"} | Expira em:{" "}
                          {new Date(req.fare_expires_at).toLocaleString("pt-BR")}
                        </p>
                        {req.policy_violation_reasons && req.policy_violation_reasons.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {req.policy_violation_reasons.map((reason, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-destructive/10 text-destructive font-medium"
                              >
                                <AlertTriangle className="size-3" />
                                {reason}
                              </span>
                            ))}
                          </div>
                        )}
                        {req.justification && (
                          <p className="text-xs italic text-muted-foreground pt-1">
                            Justificativa: "{req.justification}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block">Valor Solicitado</span>
                          <span className="text-base font-bold text-foreground">
                            {formatMoney(req.total_amount_cents / 100)}
                          </span>
                          {req.lowest_logical_fare_cents && (
                            <span className="text-xs text-muted-foreground block">
                              Menor Tarifa: {formatMoney(req.lowest_logical_fare_cents / 100)}
                            </span>
                          )}
                        </div>

                        {isPending && !isExpired && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              className="h-11 min-h-11 px-3 text-xs focus-visible:ring-2 focus-visible:ring-primary"
                              onClick={() =>
                                handleOpenReview(
                                  req.id,
                                  "reject",
                                  req.total_amount_cents,
                                  req.requester_name
                                )
                              }
                            >
                              <XCircle className="size-4 mr-1 text-destructive" />
                              Recusar
                            </Button>
                            <Button
                              variant="default"
                              className="h-11 min-h-11 px-4 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary"
                              onClick={() =>
                                handleOpenReview(
                                  req.id,
                                  "approve",
                                  req.total_amount_cents,
                                  req.requester_name
                                )
                              }
                            >
                              <CheckCircle2 className="size-4 mr-1" />
                              Aprovar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. ABA: VIAGENS CORPORATIVAS */}
        {activeTab === "viagens" && (
          <div className="space-y-4">
            {isTripsLoading ? (
              <div className="space-y-3">
                <div className="h-16 bg-muted rounded-lg animate-pulse motion-reduce:animate-none" />
                <div className="h-16 bg-muted rounded-lg animate-pulse motion-reduce:animate-none" />
              </div>
            ) : trips.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-lg bg-card text-muted-foreground space-y-2">
                <Plane className="size-8 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium">Nenhuma viagem corporativa registrada</p>
                <p className="text-xs text-muted-foreground">
                  As viagens confirmadas para seus colaboradores aparecerão listadas nesta seção.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {trips.map((trip: any) => (
                  <div
                    key={trip.id}
                    className="p-4 rounded-lg border border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          {trip.title || trip.destination_city || "Viagem Corporativa"}
                        </span>
                        <Badge variant="outline" className="text-xs font-mono">
                          {trip.status || "Confirmada"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Destino: {trip.destination_city || "Não especificado"} | Início:{" "}
                        {trip.start_date
                          ? new Date(trip.start_date).toLocaleDateString("pt-BR")
                          : "A definir"}{" "}
                        | Passageiros: {trip.passengers_count || 1}
                      </p>
                      {trip.project_title && (
                        <p className="text-xs text-muted-foreground">
                          Projeto: {trip.project_title}
                        </p>
                      )}
                    </div>
                    <div>
                      <Button
                        variant="outline"
                        asChild
                        className="h-11 min-h-11 px-4 text-xs font-medium focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Link to="/viajante/viagem/$id" params={{ id: String(trip.id) }}>
                          Ver Dossiê da Viagem
                          <ArrowRight className="size-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. ABA: PROJETOS DE VIAGEM */}
        {activeTab === "projetos" && (
          <div className="space-y-4">
            {isProjectsLoading ? (
              <div className="space-y-3">
                <div className="h-16 bg-muted rounded-lg animate-pulse motion-reduce:animate-none" />
              </div>
            ) : projects.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-lg bg-card text-muted-foreground space-y-2">
                <FolderKanban className="size-8 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium">Nenhum projeto de viagem criado</p>
                <p className="text-xs text-muted-foreground">
                  Projetos agrupam múltiplas viagens, tarefas e a timeline viva para missões e eventos corporativos.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-4 rounded-lg border border-border bg-card space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-foreground">{proj.name || (proj as any).title}</span>
                        <Badge variant="outline" className="text-xs font-mono">
                          {proj.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {proj.description || "Sem descrição informada"}
                      </p>
                      <p className="text-xs text-muted-foreground pt-1">
                        Período: {proj.start_date ? new Date(proj.start_date).toLocaleDateString("pt-BR") : "A definir"} até{" "}
                        {proj.end_date ? new Date(proj.end_date).toLocaleDateString("pt-BR") : "A definir"}
                      </p>
                    </div>
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        asChild
                        className="w-full h-11 min-h-11 text-xs font-medium focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Link to="/workspace/turismo/projetos/$id" params={{ id: proj.id }}>
                          Abrir Timeline e Tarefas do Projeto
                          <ArrowRight className="size-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. ABA: VIAJANTES */}
        {activeTab === "viajantes" && (
          <div className="space-y-4">
            {isTravelersLoading ? (
              <div className="space-y-3">
                <div className="h-16 bg-muted rounded-lg animate-pulse motion-reduce:animate-none" />
              </div>
            ) : travelers.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-lg bg-card text-muted-foreground space-y-2">
                <Users className="size-8 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium">Nenhum perfil de viajante cadastrado</p>
                <p className="text-xs text-muted-foreground">
                  Cadastre seus colaboradores para acelerar emissões com documentos e preferências salvas.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {travelers.map((pax) => (
                  <div
                    key={pax.id}
                    className="p-4 rounded-lg border border-border bg-card space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-foreground">
                        {pax.full_name}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {pax.document_type.toUpperCase()}: {pax.document_number}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>E-mail: {pax.email || "Não informado"}</p>
                      <p>Telefone: {pax.phone || "Não informado"}</p>
                      <p>
                        Assento preferencial:{" "}
                        {pax.seat_preference === "window"
                          ? "Janela"
                          : pax.seat_preference === "aisle"
                          ? "Corredor"
                          : "Qualquer"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. ABA: POLÍTICA DE VIAGEM */}
        {activeTab === "politica" && (
          <div className="space-y-4">
            {isPolicyLoading ? (
              <div className="h-24 bg-muted rounded-lg animate-pulse motion-reduce:animate-none" />
            ) : !policy ? (
              <div className="p-8 text-center border border-dashed border-border rounded-lg bg-card text-muted-foreground space-y-2">
                <ShieldCheck className="size-8 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium">Nenhuma política de viagem cadastrada</p>
                <p className="text-xs text-muted-foreground">
                  A política define limites de tarifa, cabines permitidas e exigências de antecedência.
                </p>
              </div>
            ) : (
              <div className="p-6 rounded-lg border border-border bg-card space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-foreground">{policy.title}</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    Versão {policy.version_number} ({policy.status})
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
                  <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                    <span className="font-semibold text-foreground block">Regras Aéreas</span>
                    <p>
                      Cabine Máxima:{" "}
                      {policy.rules_json?.air?.max_cabin === "economy"
                        ? "Econômica"
                        : policy.rules_json?.air?.max_cabin === "business"
                        ? "Executiva"
                        : "Livre"}
                    </p>
                    <p>
                      Teto Máximo:{" "}
                      {policy.rules_json?.air?.max_amount_cents
                        ? formatMoney(policy.rules_json.air.max_amount_cents / 100)
                        : "Sem teto rígido"}
                    </p>
                    <p>
                      Antecedência Mínima:{" "}
                      {policy.rules_json?.air?.advance_days_required
                        ? `${policy.rules_json.air.advance_days_required} dias`
                        : "Não exigida"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                    <span className="font-semibold text-foreground block">Regras de Hotelaria</span>
                    <p>
                      Estrelas Permitidas:{" "}
                      {policy.rules_json?.hotel?.max_stars
                        ? `Até ${policy.rules_json.hotel.max_stars} estrelas`
                        : "Livre"}
                    </p>
                    <p>
                      Diária Máxima:{" "}
                      {policy.rules_json?.hotel?.max_nightly_amount_cents
                        ? formatMoney(policy.rules_json.hotel.max_nightly_amount_cents / 100)
                        : "Sem teto rígido"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. ABA: FINANCEIRO & FATURAS */}
        {activeTab === "financeiro" && (
          <div className="space-y-6">
            {/* Perfil de Crédito da Conta */}
            <div className="p-4 rounded-lg border border-border bg-card space-y-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Perfil de Faturamento da Empresa
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground block">Limite Contratado</span>
                  <span className="text-lg font-bold text-foreground">
                    {creditProfile
                      ? formatMoney(creditProfile.credit_limit_cents / 100)
                      : "Sob Consulta"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Limite Disponível</span>
                  <span className="text-lg font-bold text-foreground">
                    {creditProfile
                      ? formatMoney(creditProfile.available_limit_cents / 100)
                      : "Sob Consulta"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Prazo Contratual</span>
                  <span className="text-lg font-bold text-foreground">
                    {creditProfile ? `${creditProfile.payment_terms_days} dias` : "Faturado"}
                  </span>
                </div>
              </div>
            </div>

            {/* Créditos de Bilhete Aéreo (Direito do Passageiro / Não é $WZ) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Créditos de Bilhete Aéreo</h3>
                  <p className="text-xs text-muted-foreground">
                    Direitos contratuais regulados pela ANAC vinculados estritamente ao passageiro e PNR original.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {airCredits.length} ativos
                </Badge>
              </div>

              {airCredits.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-border rounded-lg bg-card text-muted-foreground text-xs">
                  Nenhum crédito de bilhete aéreo ativo para os passageiros da empresa.
                </div>
              ) : (
                <div className="space-y-2">
                  {airCredits.map((cred: any) => (
                    <div
                      key={cred.id}
                      className="p-3 rounded-lg border border-border bg-card flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-semibold text-foreground block">
                          {cred.airline} — PNR: {cred.original_pnr} (Bilhete: {cred.original_ticket_number})
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Passageiro: {cred.traveler_name || "Colaborador"} | Validade:{" "}
                          {new Date(cred.expires_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-foreground">
                        {formatMoney(cred.remaining_amount_cents / 100)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Faturas Emitidas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Faturas Corporativas</h3>
                <Badge variant="outline" className="text-xs font-mono">
                  {invoices.length} faturas
                </Badge>
              </div>

              {invoices.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-border rounded-lg bg-card text-muted-foreground text-xs">
                  Nenhuma fatura corporativa emitida até o momento.
                </div>
              ) : (
                <div className="space-y-2">
                  {invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-4 rounded-lg border border-border bg-card flex items-center justify-between"
                    >
                      <div>
                        <span className="text-sm font-semibold text-foreground block">
                          Fatura #{inv.invoice_number}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Vencimento: {new Date(inv.due_date).toLocaleDateString("pt-BR")} | Status:{" "}
                          {inv.status}
                        </span>
                      </div>
                      <span className="text-base font-bold text-foreground">
                        {formatMoney(inv.total_amount_cents / 100)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Diálogo de Revisão de Aprovação (Aprovar/Recusar) */}
      <Dialog
        open={reviewDialog.open}
        onOpenChange={(open) => !open && setReviewDialog((prev) => ({ ...prev, open: false }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewDialog.action === "approve"
                ? "Aprovar Solicitação de Viagem"
                : "Recusar Solicitação de Viagem"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {reviewDialog.action === "approve"
                ? `Confirmar a aprovação da viagem no valor total de ${formatMoney(
                    reviewDialog.totalAmountCents / 100
                  )} para ${reviewDialog.requesterName || "o colaborador"}?`
                : `Deseja rejeitar a solicitação de viagem no valor de ${formatMoney(
                    reviewDialog.totalAmountCents / 100
                  )}?`}
            </p>
            <div className="space-y-2">
              <label htmlFor="review-comment-input" className="text-xs font-semibold text-foreground">
                Observações ou Parecer (Opcional)
              </label>
              <Input
                id="review-comment-input"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Ex: Aprovado conforme autorização da diretoria..."
                className="h-11 min-h-11 text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setReviewDialog((prev) => ({ ...prev, open: false }))}
              className="h-11 min-h-11 px-4 text-xs font-medium focus-visible:ring-2 focus-visible:ring-primary"
            >
              Cancelar
            </Button>
            <Button
              variant={reviewDialog.action === "approve" ? "default" : "destructive"}
              onClick={handleConfirmReview}
              disabled={isSubmittingReview}
              className="h-11 min-h-11 px-4 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isSubmittingReview
                ? "Processando..."
                : reviewDialog.action === "approve"
                ? "Confirmar Aprovação"
                : "Confirmar Recusa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
