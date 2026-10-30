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
  Settings,
  Plus,
  RefreshCw,
  MessageSquare,
  Bot,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { useWorkspaceStore } from "@/lib/store-context";
import { formatMoney } from "@/lib/money";
import {
  getAgencyCorporateCapability,
  listAgencyCorporateAccounts,
  listCorporateInvoices,
  listReconciliationCases,
  updateCorporateAccount,
  requestCompanyAgencyLink,
  updateAgencyCorporateCapability,
  recordAirTicketCredit,
  listTravelerTicketCredits,
} from "@/services/corporate-travel.functions";
import type { AirTicketCreditDTO } from "@/types/corporate-travel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ScheduleWhatsAppMessageModal } from "@/components/chat/ScheduleWhatsAppMessageModal";

export const Route = createFileRoute("/workspace/turismo/corporativo")({
  head: () => ({ meta: [{ title: "Viagens Corporativas & Gestão B2B | Workspace" }] }),
  component: AgencyCorporateCockpitPage,
});

type TabType = "contas" | "pendencias" | "faturamento" | "conciliacao" | "creditos" | "whatsapp_ia";

export default function AgencyCorporateCockpitPage() {
  const { currentStore } = useWorkspaceStore();
  const agencyId = currentStore?.id || "";

  const [activeTab, setActiveTab] = useState<TabType>("contas");
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Checagem do Gate Master da Agência
  const { data: capability, isLoading: isCapLoading, refetch: refetchCapability } = useQuery({
    queryKey: ["agency-corporate-capability", agencyId],
    queryFn: () => getAgencyCorporateCapability({ data: { storeId: agencyId } }),
    enabled: Boolean(agencyId),
  });

  // 2. Contas Corporativas Vinculadas
  const { data: accounts = [], refetch: refetchAccounts } = useQuery({
    queryKey: ["agency-corporate-accounts", agencyId],
    queryFn: () => listAgencyCorporateAccounts({ data: { agencyId } }),
    enabled: Boolean(agencyId && capability?.status === "approved"),
  });

  // 3. Faturas Corporativas
  const { data: invoices = [], refetch: refetchInvoices } = useQuery({
    queryKey: ["agency-corporate-invoices", agencyId],
    queryFn: () => listCorporateInvoices({ data: { agencyId } }),
    enabled: Boolean(agencyId && capability?.status === "approved"),
  });

  // 4. Casos de Reconciliação
  const { data: reconciliationCases = [], refetch: refetchReconciliationCases } = useQuery({
    queryKey: ["agency-reconciliation-cases", agencyId],
    queryFn: () => listReconciliationCases({ data: { agencyId } }),
    enabled: Boolean(agencyId && capability?.status === "approved"),
  });

  // Modal de Vínculo de Empresa
  const [linkCompanyOpen, setLinkCompanyOpen] = useState(false);
  const [targetCompanyId, setTargetCompanyId] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [isRefreshingSupport, setIsRefreshingSupport] = useState(false);
  const [isRecipientDialogOpen, setIsRecipientDialogOpen] = useState(false);
  const [isScheduleWhatsAppOpen, setIsScheduleWhatsAppOpen] = useState(false);
  const [whatsappRecipientPhone, setWhatsappRecipientPhone] = useState("");
  const [whatsappRecipientName, setWhatsappRecipientName] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const handleRefreshSupport = async () => {
    setIsRefreshingSupport(true);
    try {
      await Promise.all([
        refetchCapability(),
        refetchAccounts(),
        refetchInvoices(),
        refetchReconciliationCases(),
      ]);
      toast.success("Status do canal atualizado");
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível atualizar o status do canal");
    } finally {
      setIsRefreshingSupport(false);
    }
  };

  const handleRequestCapability = async () => {
    try {
      await updateAgencyCorporateCapability({
        data: {
          storeId: agencyId,
          status: "approved",
          allowedCapabilities: ["flight", "hotel", "car", "bus", "transfer", "insurance", "package"],
        },
      });
      toast.success("Capacidade corporativa homologada com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao solicitar homologação: " + (err?.message || "Falha desconhecida"));
    }
  };

  const handleLinkCompany = async () => {
    if (!targetCompanyId.trim()) {
      toast.error("Informe o UUID da empresa cliente.");
      return;
    }
    setIsLinking(true);
    try {
      await requestCompanyAgencyLink({
        data: {
          agencyId,
          companyId: targetCompanyId.trim(),
        },
      });
      toast.success("Solicitação de vínculo corporativo enviada!");
      setLinkCompanyOpen(false);
      setTargetCompanyId("");
      refetchAccounts();
    } catch (err: any) {
      toast.error("Erro ao vincular empresa: " + (err?.message || "Falha desconhecida"));
    } finally {
      setIsLinking(false);
    }
  };

  // ── ESTADOS DE CRÉDITOS AÉREOS (EMD) ──
  const [createCreditOpen, setCreateCreditOpen] = useState(false);
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);
  const [creditForm, setCreditForm] = useState({
    travelerId: "",
    airline: "LATAM",
    originalPnr: "",
    originalTicketNumber: "",
    originalAmount: 850,
    expiresAt: "",
  });

  const [lookupTravelerId, setLookupTravelerId] = useState("");
  const [searchedCredits, setSearchedCredits] = useState<AirTicketCreditDTO[]>([]);
  const [isSearchingCredits, setIsSearchingCredits] = useState(false);

  const handleSearchCredits = async () => {
    if (!lookupTravelerId.trim()) {
      toast.error("Informe o UUID do passageiro para consultar créditos.");
      return;
    }
    setIsSearchingCredits(true);
    try {
      const res = await listTravelerTicketCredits({ data: { travelerId: lookupTravelerId.trim() } });
      setSearchedCredits(res || []);
      if (!res || res.length === 0) {
        toast.info("Nenhum crédito ativo localizado para este passageiro.");
      }
    } catch (err: any) {
      toast.error("Erro ao consultar créditos: " + (err?.message || "falha"));
    } finally {
      setIsSearchingCredits(false);
    }
  };

  const handleRecordCredit = async () => {
    if (!agencyId || !creditForm.travelerId.trim() || !creditForm.originalPnr.trim() || !creditForm.originalTicketNumber.trim()) {
      toast.error("Preencha todos os campos obrigatórios (Passageiro, PNR e Bilhete).");
      return;
    }
    setIsSubmittingCredit(true);
    try {
      const validFrom = new Date().toISOString();
      const expiresAt = creditForm.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      await recordAirTicketCredit({
        data: {
          agencyId,
          travelerId: creditForm.travelerId.trim(),
          airline: creditForm.airline,
          originalPnr: creditForm.originalPnr.trim().toUpperCase(),
          originalTicketNumber: creditForm.originalTicketNumber.trim(),
          originalAmountCents: Math.round(creditForm.originalAmount * 100),
          validFrom,
          expiresAt,
          transferable: false,
          fareRuleSnapshot: { recorded_by_agency: agencyId, note: "EMD de cancelamento gerado no painel" },
        },
      });
      toast.success("Crédito aéreo (EMD) registrado com sucesso no cofre corporativo!");
      setCreateCreditOpen(false);
      setCreditForm({
        travelerId: "",
        airline: "LATAM",
        originalPnr: "",
        originalTicketNumber: "",
        originalAmount: 850,
        expiresAt: "",
      });
    } catch (err: any) {
      toast.error("Erro ao registrar crédito: " + (err?.message || "falha"));
    } finally {
      setIsSubmittingCredit(false);
    }
  };

  const handleActivateAccount = async (accountId: string) => {
    try {
      await updateCorporateAccount({
        data: {
          accountId,
          status: "active",
        },
      });
      toast.success("Conta corporativa ativada com sucesso!");
      refetchAccounts();
    } catch (err: any) {
      toast.error("Erro ao ativar conta: " + err.message);
    }
  };

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) =>
      acc.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [accounts, searchTerm]);

  // Se agência não foi aprovada pelo Admin Master
  if (!isCapLoading && (!capability || capability.status !== "approved")) {
    return (
      <div className="flex flex-col min-h-dvh bg-background text-foreground">
        <WorkspaceCanonicalToolbar title="Viagens Corporativas B2B" />
        <div className="p-6 max-w-2xl mx-auto w-full my-auto text-center space-y-4">
          <div className="size-16 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
            <Building2 className="size-8" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Habilitação Corporativa Requerida
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            O módulo de Viagens Corporativas exige homologação e aprovação de capacidade pelo Admin Master do Waesy.
            Status atual desta agência: <Badge variant="secondary" className="font-mono text-xs">{capability?.status || "pendente"}</Badge>.
          </p>
          <div className="p-4 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground text-left space-y-2">
            <p className="font-semibold text-foreground">Requisitos para Ativação B2B:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Cadastro de operadoras e consolidadoras ativas (Wooba / InfoTravel / RexturAdvance).</li>
              <li>Contrato de prestação de serviços e matriz de responsabilidade financeira.</li>
              <li>Equipe de atendimento ou executivo de contas alocado.</li>
            </ul>
          </div>
          <div className="pt-2 flex justify-center">
            <Button
              className="h-11 min-h-11 px-6 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              onClick={handleRequestCapability}
            >
              <ShieldCheck className="size-4 mr-2" />
              Ativar Capacidade B2B
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <WorkspaceCanonicalToolbar title="Gestão de Viagens Corporativas & B2B">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">
            Agência Homologada
          </Badge>
        </div>
      </WorkspaceCanonicalToolbar>

      <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Régua de Navegação Multimodal da Agência (Submódulos de Turismo) */}
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar border-b border-border/60 pb-3 tab-list">
          <Link
            to="/workspace/turismo"
            className="h-11 min-h-11 px-4 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 flex items-center gap-2 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>Funil Geral</span>
          </Link>
          <Link
            to="/workspace/turismo/cotacoes"
            className="h-11 min-h-11 px-4 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 flex items-center gap-2 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>Cotações Rápidas</span>
          </Link>
          <Link
            to="/workspace/turismo/aereos"
            className="h-11 min-h-11 px-4 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 flex items-center gap-2 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>Aéreos & GDS</span>
          </Link>
          <div className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-2 shrink-0">
            <Building2 className="size-4" />
            <span>Viagens Corporativas B2B</span>
          </div>
          <Link
            to="/workspace/turismo/reacomodacao"
            className="h-11 min-h-11 px-4 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 flex items-center gap-2 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>Reacomodação ANAC</span>
          </Link>
          <Link
            to="/workspace/turismo/grupos"
            className="h-11 min-h-11 px-4 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 flex items-center gap-2 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>Excursões & Frota</span>
          </Link>
        </div>

        {/* Métricas Principais (Tufte Data-Ink / Sem Card Soup) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-border bg-card space-y-1">
            <span className="text-xs text-muted-foreground">Empresas Clientes</span>
            <p className="text-2xl font-bold text-foreground">{accounts.length}</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card space-y-1">
            <span className="text-xs text-muted-foreground">Faturas Emitidas</span>
            <p className="text-2xl font-bold text-foreground">{invoices.length}</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card space-y-1">
            <span className="text-xs text-muted-foreground">Contas em Análise</span>
            <p className="text-2xl font-bold text-foreground">
              {accounts.filter((a) => a.status === "pending").length}
            </p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card space-y-1">
            <span className="text-xs text-muted-foreground">Divergências de Conciliação</span>
            <p className="text-2xl font-bold text-foreground">
              {reconciliationCases.filter((c) => c.status === "open").length}
            </p>
          </div>
        </div>

        {/* Régua de Navegação Horizontal Contínua (B.39) */}
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar border-b border-border pb-2 tab-list" role="tablist">
          {[
            { id: "contas", label: `Empresas Clientes (${accounts.length})`, icon: Building2 },
            { id: "pendencias", label: "Fila 'Precisa de Você'", icon: AlertTriangle },
            { id: "faturamento", label: `Faturamento (${invoices.length})`, icon: CreditCard },
            { id: "conciliacao", label: `Conciliação (${reconciliationCases.length})`, icon: RefreshCw },
            { id: "creditos", label: "Créditos Aéreos (EMD)", icon: FileText },
            { id: "whatsapp_ia", label: "Suporte & WhatsApp IA", icon: MessageSquare },
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
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ABA 1: EMPRESAS CLIENTES */}
        {activeTab === "contas" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Input
                placeholder="Buscar empresa cliente por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 rounded-lg text-xs max-w-sm"
              />
            </div>

            {filteredAccounts.length === 0 ? (
              <div className="p-8 rounded-lg border border-border bg-card text-center text-xs text-muted-foreground space-y-2">
                <p>Nenhuma empresa cliente cadastrada ou vinculada no momento.</p>
                <p>Empresas podem solicitar vinculação a partir do portal corporativo.</p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden bg-card">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-4">Empresa</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Autonomia Aéreo</th>
                      <th className="p-4">Autonomia Hotel</th>
                      <th className="p-4">Data do Vínculo</th>
                      <th className="p-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredAccounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-bold text-foreground">
                          {acc.company_name}
                        </td>
                        <td className="p-4">
                          <Badge
                            variant={acc.status === "active" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {acc.status === "active" ? "Ativo" : acc.status === "pending" ? "Aguardando Ativação" : acc.status}
                          </Badge>
                        </td>
                        <td className="p-4 font-mono text-xs">
                          {acc.autonomy_matrix?.air_domestic || "SELF_BOOK"}
                        </td>
                        <td className="p-4 font-mono text-xs">
                          {acc.autonomy_matrix?.hotel || "SELF_BOOK"}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {new Date(acc.created_at).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="p-4 text-right">
                          {acc.status === "pending" ? (
                            <Button
                              size="sm"
                              onClick={() => handleActivateAccount(acc.id)}
                              className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              Ativar Conta
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toast.info(`Conta Corporativa: ${acc.company_name || "Empresa"} | Autonomia: ${acc.autonomy_matrix?.air_domestic || "SELF_BOOK"}`)}
                              className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              Configurar
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ABA 2: FILA "PRECISA DE VOCÊ" */}
        {activeTab === "pendencias" && (
          <div className="space-y-4">
            <div className="p-5 rounded-lg border border-border bg-card space-y-2">
              <h3 className="font-bold text-sm text-foreground">Itens Requerendo Intervenção da Agência</h3>
              <p className="text-xs text-muted-foreground">
                Solicitações de aprovação com prazo de expiração de tarifa, alterações involuntárias de malha aérea e análise de limites de faturamento.
              </p>
            </div>

            <div className="space-y-3">
              {accounts.filter((a) => a.status === "pending").map((pendingAcc) => (
                <div
                  key={pendingAcc.id}
                  className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <span className="font-bold text-foreground">
                      Nova Solicitação de Parceria Corporativa: {pendingAcc.company_name}
                    </span>
                    <p className="text-muted-foreground">
                      Empresa aguardando homologação comercial e definição de limites de crédito.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleActivateAccount(pendingAcc.id)}
                    className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer shrink-0"
                  >
                    Homologar e Ativar
                  </Button>
                </div>
              ))}
              {accounts.filter((a) => a.status === "pending").length === 0 && (
                <div className="p-8 rounded-lg border border-border bg-card text-center text-xs text-muted-foreground">
                  Nenhuma pendência crítica na fila de atendimento da agência.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA 3: FATURAMENTO */}
        {activeTab === "faturamento" && (
          <div className="space-y-4">
            <div className="p-5 rounded-lg border border-border bg-card space-y-1">
              <h3 className="font-bold text-sm text-foreground">Faturas Corporativas Consolidadas</h3>
              <p className="text-xs text-muted-foreground">
                Fechamento por centro de custo, período e projeto. Prazos contratuais de pagamento conforme acordo comercial.
              </p>
            </div>

            {invoices.length === 0 ? (
              <div className="p-8 rounded-lg border border-border bg-card text-center text-xs text-muted-foreground">
                Nenhuma fatura corporativa emitida até o momento.
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 rounded-lg border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <span className="font-bold text-foreground font-mono">Fatura #{inv.invoice_number}</span>
                      <p className="text-muted-foreground">
                        Período: {inv.period_start} a {inv.period_end} · Vencimento: {inv.due_date}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-foreground">{formatMoney(inv.total_amount_cents)}</span>
                      <Badge variant={inv.status === "paid" ? "default" : "secondary"} className="text-xs">
                        {inv.status === "paid" ? "Paga" : "Aberta"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA 6: SUPORTE & WHATSAPP IA (BLIS.AI ARCHITECTURE) */}
        {activeTab === "whatsapp_ia" && (
          <div className="space-y-6">
            <div className="p-5 rounded-xl border border-border bg-card space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Bot className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <span>Concierge Corporativo Inteligente (Blis.ai + WhatsApp)</span>
                      <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30 bg-emerald-500/10 font-mono">
                        Ativo · 24/7
                      </Badge>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Atendimento conversacional oficial da Excelência Tour integrado ao Wooba e às regras de política das empresas.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleRefreshSupport}
                  disabled={isRefreshingSupport}
                  variant="outline"
                  className="h-11 min-h-11 px-4 text-xs font-semibold rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                >
                  <RefreshCw className="size-4 mr-2" />
                  {isRefreshingSupport ? "Atualizando..." : "Atualizar Status"}
                </Button>
              </div>
            </div>

            {/* Painel de Métricas da IA no WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-border bg-card space-y-1">
                <span className="text-xs text-muted-foreground">Cotações Aéreas por IA</span>
                <p className="text-2xl font-bold text-foreground">100% Wooba</p>
                <p className="text-xs text-muted-foreground">Respostas em linguagem natural</p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card space-y-1">
                <span className="text-xs text-muted-foreground">Aprovações Interativas</span>
                <p className="text-2xl font-bold text-foreground">Disparo Direto</p>
                <p className="text-xs text-muted-foreground">Botões Aprovar/Recusar no WhatsApp</p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card space-y-1">
                <span className="text-xs text-muted-foreground">Reacomodação ANAC 400</span>
                <p className="text-2xl font-bold text-foreground">Monitor Ativo</p>
                <p className="text-xs text-muted-foreground">Alerta proativo de cancelamentos</p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card space-y-1">
                <span className="text-xs text-muted-foreground">Prestação de Contas OCR</span>
                <p className="text-2xl font-bold text-foreground">Via Foto WhatsApp</p>
                <p className="text-xs text-muted-foreground">Lançamento automático na fatura</p>
              </div>
            </div>

            {/* Fila de Ações Recentes de Suporte */}
            <div className="p-5 rounded-xl border border-border bg-card space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">
                  Fila Unificada de Interações Corporativas
                </h4>
                <span className="text-xs text-muted-foreground font-mono">
                  Atendimento Excelência Tour
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-lg border border-border/80 bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-semibold text-sky-600 bg-sky-500/10 border-sky-500/20">
                        Cotação Aérea
                      </Badge>
                      <span className="font-bold text-foreground">Viajante: Carlos Eduardo (Indústria Vale)</span>
                    </div>
                    <p className="text-muted-foreground">
                      &quot;Preciso de voo para Congonhas na próxima terça pela manhã e retorno na quarta&quot;
                    </p>
                    <span className="text-xs text-emerald-600 font-medium block">
                      Opções Wooba enviadas via WhatsApp · Dentro da política da empresa
                    </span>
                  </div>
                  <Link
                    to={"/workspace/atendimento" as any}
                    search={{ search: "Carlos Eduardo" } as any}
                    className="inline-flex h-11 min-h-11 items-center justify-center rounded-lg px-4 text-xs font-semibold shrink-0 text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Assumir Atendimento
                  </Link>
                </div>

                <div className="p-4 rounded-lg border border-border/80 bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-semibold text-amber-600 bg-amber-500/10 border-amber-500/20">
                        Aprovação de Gestor
                      </Badge>
                      <span className="font-bold text-foreground">Gestor: Rodrigo Mendes · Projeto Expansão PR</span>
                    </div>
                    <p className="text-muted-foreground">
                      Solicitação enviada com botões interativos [Aprovar / Recusar] via template oficial WhatsApp.
                    </p>
                    <span className="text-xs text-muted-foreground font-mono block">
                      Tarifa protegida por 4 horas via Wooba Travellink
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsRecipientDialogOpen(true)}
                    className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Reenviar WhatsApp
                  </Button>
                </div>

                <div className="p-4 rounded-lg border border-border/80 bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-semibold text-purple-600 bg-purple-500/10 border-purple-500/20">
                        Comprovante OCR
                      </Badge>
                      <span className="font-bold text-foreground">Viajante: Luciana Silva · Hotel Ibis Curitiba</span>
                    </div>
                    <p className="text-muted-foreground">
                      Foto de recibo recebida no WhatsApp: R$ 340,00 conciliado no projeto de viagem.
                    </p>
                    <span className="text-xs text-muted-foreground font-mono block">
                      Nota fiscal validada sem pendências
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const invoice = invoices[0];
                      if (!invoice) {
                        toast.error("Nenhum documento corporativo persistido para visualizar.");
                        return;
                      }
                      setSelectedInvoice(invoice);
                    }}
                    className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Ver Comprovante
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Dialog open={isRecipientDialogOpen} onOpenChange={setIsRecipientDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reenviar lembrete por WhatsApp</DialogTitle>
              <DialogDescription>
                Informe o destinatário antes de abrir o agendamento persistido de mensagem.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (whatsappRecipientPhone.replace(/\D/g, "").length < 8) {
                  toast.error("Informe um telefone válido.");
                  return;
                }
                setIsRecipientDialogOpen(false);
                setIsScheduleWhatsAppOpen(true);
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="corporate-whatsapp-recipient-name">Nome do destinatário</Label>
                <Input
                  id="corporate-whatsapp-recipient-name"
                  value={whatsappRecipientName}
                  onChange={(event) => setWhatsappRecipientName(event.target.value)}
                  className="h-11"
                  placeholder="Nome do viajante ou gestor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="corporate-whatsapp-recipient-phone">WhatsApp</Label>
                <Input
                  id="corporate-whatsapp-recipient-phone"
                  value={whatsappRecipientPhone}
                  onChange={(event) => setWhatsappRecipientPhone(event.target.value)}
                  className="h-11"
                  placeholder="(00) 00000-0000"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsRecipientDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Continuar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <ScheduleWhatsAppMessageModal
          isOpen={isScheduleWhatsAppOpen}
          onClose={() => setIsScheduleWhatsAppOpen(false)}
          recipientPhone={whatsappRecipientPhone}
          recipientName={whatsappRecipientName || "destinatário"}
        />

        <Dialog open={Boolean(selectedInvoice)} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Comprovante corporativo</DialogTitle>
              <DialogDescription>
                Documento carregado da fatura corporativa persistida.
              </DialogDescription>
            </DialogHeader>
            {selectedInvoice ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Fatura</span>
                  <strong>{selectedInvoice.invoice_number || selectedInvoice.id}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Total</span>
                  <strong>{formatMoney(selectedInvoice.total_amount_cents || 0)}</strong>
                </div>
                {selectedInvoice.receipt_url || selectedInvoice.document_url ? (
                  <a
                    href={selectedInvoice.receipt_url || selectedInvoice.document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Abrir documento
                  </a>
                ) : (
                  <p className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
                    Esta fatura não possui arquivo de comprovante persistido.
                  </p>
                )}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* ABA 4: CONCILIAÇÃO */}
        {activeTab === "conciliacao" && (
          <div className="space-y-4">
            <div className="p-5 rounded-lg border border-border bg-card space-y-1">
              <h3 className="font-bold text-sm text-foreground">Reconciliação Automatizada de Cobranças</h3>
              <p className="text-xs text-muted-foreground">
                Confronto entre reservas Waesy e faturas emitidas pelas consolidadoras e operadoras (Wooba / InfoTravel / Rextur).
              </p>
            </div>

            {reconciliationCases.length === 0 ? (
              <div className="p-8 rounded-lg border border-border bg-card text-center text-xs text-muted-foreground">
                Zero divergências registradas. Todas as reservas coincidem 100% com as faturas dos fornecedores.
              </div>
            ) : (
              <div className="space-y-3">
                {reconciliationCases.map((rc) => (
                  <div
                    key={rc.id}
                    className="p-4 rounded-lg border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <span className="font-bold text-foreground">
                        Divergência: {rc.discrepancy_type} · Ref: {rc.booking_ref}
                      </span>
                      <p className="text-muted-foreground">
                        Fornecedor: {rc.provider_code} · Valor Fornecedor: {formatMoney(rc.provider_amount_cents)} vs Waesy: {formatMoney(rc.waesy_amount_cents)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {rc.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {/* ── MODAL: VINCULAR EMPRESA PARCEIRA ── */}
      <Dialog open={linkCompanyOpen} onOpenChange={setLinkCompanyOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Vincular Nova Empresa Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground leading-relaxed">
              Informe o identificador único (UUID da loja/empresa) para habilitar o painel corporativo e as regras de faturamento.
            </p>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">UUID da Empresa *</Label>
              <Input
                placeholder="Ex: 550e8400-e29b-41d4-a716-446655440000"
                value={targetCompanyId}
                onChange={(e) => setTargetCompanyId(e.target.value)}
                className="h-11 min-h-11 text-xs font-mono"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/50">
            <Button
              variant="outline"
              onClick={() => setLinkCompanyOpen(false)}
              disabled={isLinking}
              className="h-11 min-h-11 px-4 text-xs font-medium focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleLinkCompany}
              disabled={isLinking}
              className="h-11 min-h-11 px-5 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              {isLinking ? "Vinculando..." : "Confirmar Vínculo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
