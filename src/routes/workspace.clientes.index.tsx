import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import { useWindowSizeClass } from "@/hooks/use-mobile";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Users, Search, Plus, ArrowRight, TrendingUp, Building2, User, Phone, Mail, MapPin, Tag, AlertTriangle, Clock, CheckCircle2, Archive, ExternalLink, MessageCircle, MoreVertical, Filter, DollarSign, ShieldCheck, FileText, Plane, Ticket, LayoutGrid, Kanban, Table as TableIcon } from "lucide-react";
import { UniversalViewManager, useWorkspaceViewMode, type WorkspaceViewMode } from "@/components/workspace/view-modes";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { WorkspaceDashboardSheet, type MetricCardItem } from "@/components/workspace/workspace-dashboard-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/state/states";
import { listCustomers, archiveCustomer } from "@/services/crm.functions";
import { listTeamMembers } from "@/services/admin-team.functions";
import { getStoreSettings } from "@/services/store.functions";
import { formatMoney } from "@/lib/money";
import { NewClientWizard } from "@/components/crm/NewClientWizard";
import { UniversalCrmSpreadsheetImporterModal } from "@/components/crm/UniversalCrmSpreadsheetImporterModal";
import { CustomerDrawer360 } from "@/components/workspace/CustomerDrawer360";
import { useNicheTranslation } from "@/hooks/use-niche-translation";

export const Route = createFileRoute("/workspace/clientes/")({
 head: () => ({ meta: [{ title: "Clientes | Workspace Waesy" }] }),
 loader: async () => {
   try {
 const [customers, teamRes, store] = await Promise.all([
 listCustomers().catch(() => []),
 listTeamMembers().catch(() => []),
 getStoreSettings().catch(() => null),
 ]);
 return {
 customers: customers || [],
 team: teamRes || [],
 store: store || null,
 };
   } catch (err) {
     console.error("[loader:workspace.clientes.index] Unhandled loader error:", err);
     return { customers: [], team: [], store: null };
   }
 },
 component: CarteiraClientesPage,
});

function CarteiraClientesPage() {
  const { isCompact: isMobile } = useWindowSizeClass();
  const loaderData = Route.useLoaderData?.() as any;
  const customers = loaderData?.customers || [];
  const team = loaderData?.team || [];
  const store = loaderData?.store || null;
  const router = useRouter();
  const { t, nicheId } = useNicheTranslation(store);

 const isTourism =
 store?.settings?.niche === "tourism" ||
 store?.segment === "tourism" ||
 store?.category === "tourism";

 const [isWizardOpen, setIsWizardOpen] = useState(false);
 const [isImporterOpen, setIsImporterOpen] = useState(false);
 const [selectedDrawerCustomer, setSelectedDrawerCustomer] = useState<any | null>(null);
 const [searchTerm, setSearchTerm] = useState("");
 const [statusFilter, setStatusFilter] = useState("all");
 const [kindFilter, setKindFilter] = useState("all");
 const [channelFilter, setChannelFilter] = useState("all");
  const { currentView: viewMode, setViewMode } = useWorkspaceViewMode({
    module: "clientes",
    defaultMode: "table",
  });

 // Filtros em memória
 const filteredCustomers = useMemo(() => {
 return customers.filter((c: any) => {
 // Busca textual
 if (searchTerm.trim()) {
 const q = searchTerm.toLowerCase().trim();
 const matchName = c.fullName?.toLowerCase().includes(q);
 const matchLegal = c.legalName?.toLowerCase().includes(q);
 const matchEmail = c.email?.toLowerCase().includes(q);
 const matchPhone = c.phone?.toLowerCase().includes(q);
 const matchDoc = c.document?.toLowerCase().includes(q);
 const matchCity = c.city?.toLowerCase().includes(q);
 if (!matchName && !matchLegal && !matchEmail && !matchPhone && !matchDoc && !matchCity) {
 return false;
 }
 }

 // Status
 if (statusFilter !== "all" && c.status !== statusFilter) {
 return false;
 }

 // Tipo (PF / PJ)
 if (kindFilter !== "all" && c.kind !== kindFilter) {
 return false;
 }

 // Canal de aquisição
 if (channelFilter !== "all" && c.channel !== channelFilter) {
 return false;
 }

 return true;
 });
 }, [customers, searchTerm, statusFilter, kindFilter, channelFilter]);

 // Contagens para métricas
 const totalCount = customers.length;
 const activeCount = customers.filter((c: any) => c.status === "active").length;
 const b2bCount = customers.filter((c: any) => c.kind === "company").length;
 const b2cCount = customers.filter((c: any) => c.kind !== "company").length;
 const docsExpiringCount = customers.filter(
 (c: any) => (c.docAlerts?.expired || 0) > 0 || (c.docAlerts?.soon || 0) > 0
 ).length;

 const handleArchive = async (customerId: string, name: string) => {
 try {
 await archiveCustomer({ data: { customerId } });
 toast.success("Registro arquivado com sucesso.");
 router.invalidate();
 } catch (err: any) {
 toast.error(err.message || "Erro ao arquivar.");
 }
 };

 const openWhatsApp = (phone?: string | null, name?: string) => {
 if (!phone) {
 toast.error("Contato não possui telefone/WhatsApp cadastrado.");
 return;
 }
 const cleanPhone = phone.replace(/\D/g, "");
 const formatted = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
 const message = encodeURIComponent(`Olá ${name || ""}! Entramos em contato da equipe.`);
 window.open(`https://wa.me/${formatted}?text=${message}`, "_blank");
 };

  const [isMetricsOpen, setIsMetricsOpen] = useState(false);

  const dashboardMetrics: MetricCardItem[] = useMemo(() => [
    {
      title: nicheId === "tourism" ? "Total Passageiros" : `Total na Carteira (${t("clients")})`,
      value: totalCount,
      description: `${t("clients")} cadastrados no sistema`,
      icon: Users,
      color: "blue",
    },
    {
      title: `${t("clients")} Ativos`,
      value: activeCount,
      description: "Base apta para emissões e viagens",
      icon: CheckCircle2,
      color: "emerald",
    },
    {
      title: isTourism ? "Viajantes PF (B2C)" : "Pessoa Física (B2C)",
      value: b2cCount,
      description: "Passageiros individuais",
      icon: User,
      color: "amber",
    },
    {
      title: isTourism ? "Empresas & Grupos (B2B)" : "Empresas (B2B)",
      value: b2bCount,
      description: "Contas corporativas",
      icon: Building2,
      color: "purple",
    },
    {
      title: "Documentos com Alerta",
      value: docsExpiringCount,
      description: "Passaportes ou CNHs a vencer",
      icon: AlertTriangle,
      color: "rose",
    },
  ], [isTourism, totalCount, activeCount, b2cCount, b2bCount, docsExpiringCount]);

  return (
    <div className="w-full px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      <WorkspaceCanonicalToolbar
        tabs={[
          { id: "all", label: `Todos (${t("clients")})`, icon: Users, count: totalCount },
          { id: "active", label: "Ativos", icon: CheckCircle2, count: activeCount },
          { id: "individual", label: nicheId === "real_estate" ? "Inquilinos / PF" : isTourism ? "Viajantes PF" : "Pessoa Física", icon: User },
          { id: "company", label: isTourism ? "Contas B2B" : "Empresas (PJ)", icon: Building2 },
          { id: "alert", label: "Alertas Doc", icon: AlertTriangle, count: docsExpiringCount },
        ]}
        activeTab={
          kindFilter === "company"
            ? "company"
            : kindFilter === "individual"
            ? "individual"
            : statusFilter === "active"
            ? "active"
            : "all"
        }
        onTabChange={(tabId) => {
          if (tabId === "all") {
            setStatusFilter("all");
            setKindFilter("all");
          } else if (tabId === "active") {
            setStatusFilter("active");
            setKindFilter("all");
          } else if (tabId === "individual") {
            setStatusFilter("all");
            setKindFilter("individual");
          } else if (tabId === "company") {
            setStatusFilter("all");
            setKindFilter("company");
          } else if (tabId === "alert") {
            setStatusFilter("all");
            setKindFilter("all");
          }
        }}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={`Buscar ${t("client").toLowerCase()} por nome, CPF, e-mail, cidade...`}
        filters={[
          {
            id: "status",
            label: "Status",
            value: statusFilter,
            options: [
              { label: "Todos os Status", value: "all" },
              { label: "Apenas Ativos", value: "active" },
              { label: "Inativos", value: "inactive" },
              { label: "Bloqueados", value: "blocked" },
            ],
            onChange: setStatusFilter,
          },
          {
            id: "channel",
            label: "Canal",
            value: channelFilter,
            options: [
              { label: "Todos os Canais", value: "all" },
              { label: "WhatsApp", value: "whatsapp" },
              { label: "Balcão / Direto", value: "direct" },
              { label: "Indicação", value: "indicacao" },
              { label: "Site / E-commerce", value: "site" },
              { label: "Instagram", value: "instagram" },
              { label: "Google", value: "google" },
            ],
            onChange: setChannelFilter,
          },
        ]}
        onMetricsClick={() => setIsMetricsOpen(true)}
        metricsBadge={totalCount > 0 ? `${totalCount} ${isTourism ? "Passageiros" : "Clientes"}` : undefined}
        secondaryAction={{
          label: "Importar Planilha / Crédito Operadora",
          icon: FileText,
          onClick: () => setIsImporterOpen(true),
          variant: "outline",
        }}
        viewModes={[
          { id: "table", label: "Tabela", icon: TableIcon },
          { id: "cards", label: "Cartões", icon: LayoutGrid },
          { id: "kanban", label: "Funil CRM", icon: Kanban },
        ]}
        activeViewMode={viewMode}
        onViewModeChange={(m) => setViewMode(m as any)}
        primaryAction={{
          label: isTourism ? "Novo Passageiro" : "Novo Cliente",
          icon: Plus,
          onClick: () => setIsWizardOpen(true),
        }}
      />

      <UniversalCrmSpreadsheetImporterModal
        open={isImporterOpen}
        onOpenChange={setIsImporterOpen}
        onImportedSuccess={() => router.invalidate()}
      />

      <WorkspaceDashboardSheet
        title={isTourism ? "Telemetria da Carteira de Passageiros" : "Telemetria da Carteira de Clientes"}
        open={isMetricsOpen}
        onOpenChange={setIsMetricsOpen}
        items={dashboardMetrics}
      />

 {/* Resumo de Filtro e Limpeza Rápida */}
 {(searchTerm || statusFilter !== "all" || kindFilter !== "all" || channelFilter !== "all") && (
 <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs text-muted-foreground px-1">
 <span>
 Exibindo <strong>{filteredCustomers.length}</strong> de <strong>{customers.length}</strong> clientes
 </span>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => {
 setSearchTerm("");
 setStatusFilter("all");
 setKindFilter("all");
 setChannelFilter("all");
 }}
 className="h-7 text-xs font-semibold text-primary min-h-11 sm:min-h-0"
 >
 Limpar Filtros
 </Button>
 </div>
 )}


      {/* ── 5. Carteira de Clientes com Alternância Polimórfica (UniversalViewManager Marco M2) ── */}
      <UniversalViewManager<any>
        currentView={viewMode}
        onViewChange={setViewMode}
        data={filteredCustomers}
        emptyTitle="Nenhum cliente encontrado"
        emptyDescription={
          searchTerm || statusFilter !== "all" || kindFilter !== "all" || channelFilter !== "all"
            ? "Nenhum cliente atende aos filtros atuais. Tente ajustar os parâmetros de busca."
            : "Sua carteira de clientes ainda está vazia. Comece cadastrando passageiros ou empresas parceiras."
        }
        emptyActionLabel={isTourism ? "Cadastrar Passageiro" : "Cadastrar Cliente"}
        onEmptyAction={() => setIsWizardOpen(true)}
        renderTable={(items) => (
                      <div className="rounded-lg border border-border bg-card overflow-hidden shadow-2xs">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-75 font-bold text-xs uppercase tracking-wider text-muted-foreground py-4">
                    {isTourism ? "Passageiro / Titular" : "Cliente / Razão Social"}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-4">
                    Tipo
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-4">
                    {isTourism ? "CPF / Passaporte" : "Documento"}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-4">
                    Contato / WhatsApp
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-4">
                    Localização
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-4">
                    Documentos
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-4">
                    Status
                  </TableHead>
                  <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-muted-foreground py-4">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c: any) => {
                  const isCompany = c.kind === "company";
                  const hasExpiredDocs = (c.docAlerts?.expired || 0) > 0;
                  const hasSoonDocs = (c.docAlerts?.soon || 0) > 0;

                  return (
                    <TableRow key={c.id} className="hover:bg-muted/20 transition-colors">
                      {/* Nome & Razão Social */}
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`size-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isCompany
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isCompany ? (
                              <Building2 className="size-4" />
                            ) : (
                              c.fullName[0]?.toUpperCase() || <User className="size-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              to="/workspace/clientes/$id"
                              params={{ id: c.id }}
                              className="font-bold text-sm text-foreground hover:text-primary hover:underline transition-colors block truncate"
                            >
                              {c.fullName}
                            </Link>
                            {c.legalName && c.legalName !== c.fullName && (
                              <span className="text-xs text-muted-foreground block truncate font-mono">
                                {c.legalName}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Tipo PF / PJ */}
                      <TableCell className="py-4">
                        <Badge variant="outline" className="text-xs font-bold uppercase">
                          {isCompany ? "PJ (B2B)" : "PF (B2C)"}
                        </Badge>
                      </TableCell>

                      {/* Documento CPF / CNPJ */}
                      <TableCell className="py-4">
                        <span className="font-mono text-xs text-muted-foreground">
                          {c.document || "—"}
                        </span>
                      </TableCell>

                      {/* Contato & WhatsApp */}
                      <TableCell className="py-4">
                        <div className="flex flex-col text-xs space-y-1">
                          {c.phone ? (
                            <button
                              type="button"
                              onClick={() => openWhatsApp(c.phone, c.fullName)}
                              className="font-mono text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              title="Conversar no WhatsApp"
                            >
                              <MessageCircle className="size-3.5 shrink-0" />
                              <span>{c.phone}</span>
                            </button>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                          {c.email && (
                            <span className="text-xs text-muted-foreground truncate max-w-38">
                              {c.email}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Localização */}
                      <TableCell className="py-4">
                        <span className="text-xs text-muted-foreground">
                          {c.city ? `${c.city} - ${c.state || "UF"}` : "—"}
                        </span>
                      </TableCell>

                      {/* Alertas de Documentos */}
                      <TableCell className="py-4">
                        {hasExpiredDocs ? (
                          <Badge variant="destructive" className="text-xs font-bold py-0 h-5 gap-1">
                            <AlertTriangle className="size-2.5" />
                            <span>{c.docAlerts.expired} Vencido</span>
                          </Badge>
                        ) : hasSoonDocs ? (
                          <Badge
                            variant="secondary"
                            className="text-xs font-bold bg-warning/20 text-warning-strong  py-0 h-5 gap-1"
                          >
                            <Clock className="size-2.5" />
                            <span>{c.docAlerts.soon} Vence em breve</span>
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Regular</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-4">
                        <Badge
                          variant={c.status === "active" ? "secondary" : "outline"}
                          className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            c.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "text-muted-foreground"
                          }`}
                        >
                          {c.status === "active" ? "Ativo" : c.status === "blocked" ? "Bloqueado" : "Inativo"}
                        </Badge>
                      </TableCell>

                      {/* Menu de Ações */}
                      <TableCell className="text-right py-4">
 <div className="flex items-center justify-end gap-2">
 <Link
 to="/workspace/clientes/$id"
 params={{ id: c.id }}
 className="px-3 py-2 rounded-lg text-xs font-semibold bg-muted/60 text-foreground hover:bg-muted transition-colors hover:no-underline"
 >
 Ficha do Cliente
 </Link>
 <CrudActionsMenu
 onView={() => router.navigate({ to: "/workspace/clientes/$id", params: { id: c.id } })}
 viewLabel="Ver Ficha Completa"
 onArchive={() => handleArchive(c.id, c.fullName)}
 archiveTitle={`Arquivar cliente "${c.fullName}"?`}
 archiveDescription="O cliente será arquivado e poderá ser restaurado futuramente."
 customActions={[
 {
 label: "Ficha Rápida",
 icon: ShieldCheck,
 onClick: () => setSelectedDrawerCustomer(c),
 },
 ...(c.phone
 ? [
 {
 label: "Conversar no WhatsApp",
 icon: MessageCircle,
 onClick: () => openWhatsApp(c.phone, c.fullName),
 },
 ]
 : []),
 {
 label: "Criar Oportunidade",
 icon: Plane,
 onClick: () => router.navigate({ to: "/workspace/comercial" }),
 },
 {
 label: "Iniciar Cotação",
 icon: DollarSign,
 onClick: () =>
 router.navigate({
 to: "/workspace/turismo/cotacoes",
 search: {
 leadName: c.fullName,
 leadPhone: c.phone || undefined,
 leadEmail: c.email || undefined,
 clientId: c.id,
 } as any,
 }),
 },
 {
 label: "Emitir Bilhete Aéreo",
 icon: Ticket,
 onClick: () => router.navigate({ to: "/workspace/turismo/aereos" }),
 },
 ]}
 />
 </div>
 </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
        )}
        renderCards={(items) => (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((c: any) => {
              const isCompany = c.kind === "company";
              const hasExpiredDocs = (c.docAlerts?.expired || 0) > 0;
              const hasSoonDocs = (c.docAlerts?.soon || 0) > 0;

              return (
                <div
                  key={c.id}
                  className="p-4 rounded-lg border border-border/80 bg-card hover:border-primary/40 transition-colors flex flex-col justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`size-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border border-border/40 ${
                            isCompany ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isCompany ? (
                            <Building2 className="size-4" />
                          ) : (
                            c.fullName?.[0]?.toUpperCase() || <User className="size-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            to="/workspace/clientes/$id"
                            params={{ id: c.id }}
                            className="font-bold text-sm text-foreground hover:underline block truncate"
                          >
                            {c.fullName}
                          </Link>
                          {isCompany && c.legalName && (
                            <p className="text-xs text-muted-foreground truncate">{c.legalName}</p>
                          )}
                        </div>
                      </div>

                      <Badge
                        variant={c.status === "active" ? "secondary" : "outline"}
                        className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${
                          c.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "text-muted-foreground"
                        }`}
                      >
                        {c.status === "active" ? "Ativo" : c.status === "blocked" ? "Bloqueado" : "Inativo"}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground font-mono">
                      {c.document && <p>Doc: {c.document}</p>}
                      {c.phone && <p>Tel: {c.phone}</p>}
                      {c.email && <p className="truncate font-sans">E-mail: {c.email}</p>}
                    </div>

                    {(hasExpiredDocs || hasSoonDocs) && (
                      <div className="flex gap-2 flex-wrap pt-1">
                        {hasExpiredDocs && (
                          <Badge variant="destructive" className="text-xs gap-1 py-0">
                            <AlertTriangle className="size-3" />
                            <span>Doc. Vencido</span>
                          </Badge>
                        )}
                        {hasSoonDocs && (
                          <Badge variant="outline" className="text-xs gap-1 py-0 bg-warning/10 text-warning-strong border-warning/20">
                            <Clock className="size-3" />
                            <span>Vence em breve</span>
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDrawerCustomer(c)}
                      className="h-11 min-h-11 sm:h-8 px-2 text-xs font-bold text-primary gap-1 cursor-pointer"
                    >
                      <ShieldCheck className="size-3.5" />
                      <span>Ficha 360°</span>
                    </Button>

                    <div className="flex items-center gap-1">
                      {c.phone && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openWhatsApp(c.phone, c.fullName)}
                          className="size-11 min-h-11 min-w-11 sm:size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                          title="WhatsApp"
                        >
                          <MessageCircle className="size-3.5" />
                        </Button>
                      )}
                      <CrudActionsMenu
                        onView={() => router.navigate({ to: "/workspace/clientes/$id", params: { id: c.id } })}
                        viewLabel="Ver Ficha Completa"
                        onArchive={() => handleArchive(c.id, c.fullName)}
                        archiveTitle={`Arquivar cliente "${c.fullName}"?`}
                        archiveDescription="O cliente será arquivado e não aparecerá nas listagens ativas, podendo ser restaurado futuramente."
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        renderKanban={(items) => {
          const funnelStages = [
            { id: "leads", title: "Novos / Leads", filter: (c: any) => c.status === "lead" || c.status === "new" || !c.status },
            { id: "negotiation", title: "Em Atendimento", filter: (c: any) => c.status === "negotiation" || c.status === "contact" },
            { id: "active", title: "Clientes Ativos", filter: (c: any) => c.status === "active" },
            { id: "inactive", title: "Inativos / Bloqueados", filter: (c: any) => c.status === "inactive" || c.status === "blocked" || c.status === "archived" },
          ];

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 overflow-x-auto scroll-area-carousel no-scrollbar pb-4">
              {funnelStages.map((stage) => {
                const stageItems = items.filter(stage.filter);
                return (
                  <div key={stage.id} className="p-3 rounded-lg bg-card border border-border/80 flex flex-col gap-3 min-w-64">
                    <div className="flex items-center justify-between pb-1 border-b border-border/40">
                      <span className="text-xs font-bold text-foreground">{stage.title}</span>
                      <Badge variant="outline" className="text-xs font-mono">{stageItems.length}</Badge>
                    </div>
                    <div className="space-y-2 flex-1">
                      {stageItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-6 text-center">Nenhum cliente</p>
                      ) : (
                        stageItems.map((c: any) => (
                          <div
                            key={c.id}
                            className="p-3 rounded-lg bg-background border border-border/60 space-y-2 hover:border-primary/40 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="text-xs font-bold text-foreground truncate block">{c.fullName}</span>
                              {c.kind === "company" && (
                                <Badge variant="outline" className="text-xs py-0">PJ</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {c.phone && <p>{c.phone}</p>}
                              {c.city && <p className="font-sans">{c.city}</p>}
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedDrawerCustomer(c)}
                                className="h-11 min-h-11 sm:h-8 px-2 text-xs font-semibold text-primary"
                              >
                                Ficha 360°
                              </Button>
                              {c.phone && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openWhatsApp(c.phone, c.fullName)}
                                  className="size-11 min-h-11 min-w-11 sm:size-8 text-emerald-600"
                                >
                                  <MessageCircle className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }}
      />
 {/* ── 6. Wizard Multi-Etapa de Novo Cliente ── */}
 <NewClientWizard
 isOpen={isWizardOpen}
 onClose={() => setIsWizardOpen(false)}
 onSuccess={() => router.invalidate()}
 teamMembers={team.map((m: any) => ({
 id: m.id || m.profile_id,
 fullName: m.profiles?.full_name || m.full_name || "Membro da Equipe",
 role: m.role,
 }))}
 />

 {/* ── 7. Gaveta 360° com 14 Abas & Anamnese com Assinatura Digital ── */}
 <CustomerDrawer360
 open={Boolean(selectedDrawerCustomer)}
 onOpenChange={(open) => !open && setSelectedDrawerCustomer(null)}
 customerId={selectedDrawerCustomer?.id || ""}
 storeId={store?.id || ""}
 customerName={selectedDrawerCustomer?.fullName || ""}
 customerDoc={selectedDrawerCustomer?.document || ""}
 customerPhone={selectedDrawerCustomer?.phone || ""}
 customerEmail={selectedDrawerCustomer?.email || ""}
 canViewPhones={true}
 />
 </div>
 );
}
