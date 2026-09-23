import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
 Users,
 Search,
 Plus,
 ArrowRight,
 TrendingUp,
 Building2,
 User,
 Phone,
 Mail,
 MapPin,
 Tag,
 AlertTriangle,
 Clock,
 CheckCircle2,
 Archive,
 ExternalLink,
 MessageCircle,
 MoreVertical,
 Filter,
 DollarSign,
 ShieldCheck,
 FileText,
 Plane,
 Ticket,
} from "lucide-react";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { WorkspaceDashboardSheet, type MetricCardItem } from "@/components/workspace/workspace-dashboard-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/state/states";
import { listCustomers, archiveCustomer } from "@/services/crm.functions";
import { listTeamMembers } from "@/services/admin-team.functions";
import { getStoreSettings } from "@/services/store.functions";
import { formatMoney } from "@/lib/money";
import { NewClientWizard } from "@/components/crm/NewClientWizard";

export const Route = createFileRoute("/workspace/clientes/")({
 head: () => ({ meta: [{ title: "Carteira de Clientes & Passageiros | Workspace Waesy" }] }),
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
  const loaderData = Route.useLoaderData?.() as any;
  const customers = loaderData?.customers || [];
  const team = loaderData?.team || [];
  const store = loaderData?.store || null;
  const router = useRouter();

 const isTourism =
 store?.settings?.niche === "tourism" ||
 store?.segment === "tourism" ||
 store?.category === "tourism";

 const [isWizardOpen, setIsWizardOpen] = useState(false);
 const [searchTerm, setSearchTerm] = useState("");
 const [statusFilter, setStatusFilter] = useState("all");
 const [kindFilter, setKindFilter] = useState("all");
 const [channelFilter, setChannelFilter] = useState("all");

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
      title: isTourism ? "Total Passageiros" : "Total na Carteira",
      value: totalCount,
      description: isTourism ? "Viajantes cadastrados" : "Clientes cadastrados",
      icon: Users,
      color: "blue",
    },
    {
      title: isTourism ? "Passageiros Ativos" : "Clientes Ativos",
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
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      <WorkspaceCanonicalToolbar
        tabs={[
          { id: "all", label: isTourism ? "Todos Passageiros" : "Todos os Clientes", icon: Users, count: totalCount },
          { id: "active", label: "Ativos", icon: CheckCircle2, count: activeCount },
          { id: "individual", label: isTourism ? "Viajantes PF" : "Pessoa Física", icon: User },
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
        searchPlaceholder={isTourism ? "Buscar passageiro por nome, CPF, e-mail, cidade..." : "Buscar cliente por nome, CPF, e-mail, cidade..."}
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
          label: "Funil Comercial",
          icon: ArrowRight,
          onClick: () => router.navigate({ to: "/workspace/comercial" }),
          variant: "outline",
        }}
        primaryAction={{
          label: isTourism ? "Novo Passageiro" : "Novo Cliente",
          icon: Plus,
          onClick: () => setIsWizardOpen(true),
        }}
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
 className="h-7 text-xs font-semibold text-primary"
 >
 Limpar Filtros
 </Button>
 </div>
 )}


      {/* ── 5. Carteira de Clientes (Dual View: Mobile Cards & Desktop Table) ── */}
      {filteredCustomers.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-border/40 bg-card/60 space-y-4 px-4">
          <div className="size-14 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Users className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              Nenhum cliente encontrado
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {searchTerm || statusFilter !== "all" || kindFilter !== "all" || channelFilter !== "all"
                ? "Nenhum cliente atende aos filtros atuais. Tente ajustar os parâmetros de busca."
                : "Sua carteira de clientes ainda está vazia. Comece cadastrando passageiros ou empresas parceiras."}
            </p>
          </div>
          <Button
            onClick={() => setIsWizardOpen(true)}
            className="h-11 px-6 rounded-xl font-bold text-sm gap-2 bg-primary text-primary-foreground cursor-pointer shadow-xs"
          >
            <Plus className="size-4" />
            <span>Cadastrar Primeiro Cliente</span>
          </Button>
        </div>
      ) : (
        <>
          {/* ── 1. Mobile List Layout (Zero-Cramping, Large Text & 44px Controls) ── */}
          <div className="space-y-3.5 block md:hidden">
            {filteredCustomers.map((c: any) => {
              const isCompany = c.kind === "company";
              const hasExpiredDocs = (c.docAlerts?.expired || 0) > 0;
              const hasSoonDocs = (c.docAlerts?.soon || 0) > 0;

              return (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-card border border-border/50 shadow-2xs space-y-3.5 transition-all"
                >
                  {/* Top: Avatar, Nome, Tipo & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`size-12 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border border-border/40 ${
                          isCompany
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isCompany ? (
                          <Building2 className="size-5" />
                        ) : (
                          c.fullName[0]?.toUpperCase() || <User className="size-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <Link
                          to="/workspace/clientes/$id"
                          params={{ id: c.id }}
                          className="font-bold text-base text-foreground hover:text-primary transition-colors block truncate"
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

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge
                        variant={c.status === "active" ? "secondary" : "outline"}
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          c.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "text-muted-foreground"
                        }`}
                      >
                        {c.status === "active" ? "Ativo" : c.status === "blocked" ? "Bloqueado" : "Inativo"}
                      </Badge>
                      <Badge variant="outline" className="text-[11px] font-bold uppercase">
                        {isCompany ? "PJ (B2B)" : "PF (B2C)"}
                      </Badge>
                    </div>
                  </div>

                  {/* Informações de Contato e Documentos */}
                  <div className="space-y-1.5 pt-1 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-mono text-foreground font-medium">
                        Doc: {c.document || "Não informado"}
                      </span>
                      {c.city && (
                        <span>
                          {c.city} - {c.state || "UF"}
                        </span>
                      )}
                    </div>

                    {c.email && (
                      <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                    )}

                    {/* Alertas de Documentos */}
                    {(hasExpiredDocs || hasSoonDocs) && (
                      <div className="pt-1">
                        {hasExpiredDocs ? (
                          <Badge variant="destructive" className="text-xs font-bold gap-1 px-2.5 py-0.5">
                            <AlertTriangle className="size-3" />
                            <span>{c.docAlerts.expired} Documento(s) Vencido(s)</span>
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 gap-1 px-2.5 py-0.5">
                            <Clock className="size-3" />
                            <span>{c.docAlerts.soon} Vence em breve</span>
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Ações Móveis Ergonômicas (44px min height) */}
                  <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                    <Button
                      asChild
                      variant="outline"
                      className="flex-1 h-11 rounded-xl text-sm font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer"
                    >
                      <Link to="/workspace/clientes/$id" params={{ id: c.id }}>
                        <FileText className="size-4 text-muted-foreground" />
                        <span>Ficha 360°</span>
                      </Link>
                    </Button>

                    {c.phone && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openWhatsApp(c.phone, c.fullName)}
                        className="h-11 px-4 rounded-xl border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 cursor-pointer shrink-0"
                        title="Conversar no WhatsApp"
                      >
                        <MessageCircle className="size-5" />
                      </Button>
                    )}

                    <CrudActionsMenu
 triggerVariant="outline"
 triggerClassName="h-11 px-4 rounded-xl border-border/60 hover:bg-muted shrink-0"
 onView={() => router.navigate({ to: "/workspace/clientes/$id", params: { id: c.id } })}
 viewLabel="Ficha Completa 360°"
 onArchive={() => handleArchive(c.id, c.fullName)}
 archiveTitle={`Arquivar cliente "${c.fullName}"?`}
 archiveDescription="O cliente será arquivado e não aparecerá nas listagens ativas, podendo ser restaurado futuramente."
 customActions={[
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
                </div>
              );
            })}
          </div>

          {/* ── 2. Desktop High-Density Table Layout ── */}
          <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-2xs">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[300px] font-bold text-xs uppercase tracking-wider text-muted-foreground py-3.5">
                    {isTourism ? "Passageiro / Titular" : "Cliente / Razão Social"}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-3.5">
                    Tipo
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-3.5">
                    {isTourism ? "CPF / Passaporte" : "Documento"}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-3.5">
                    Contato / WhatsApp
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-3.5">
                    Localização
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-3.5">
                    Documentos
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-3.5">
                    Status
                  </TableHead>
                  <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-muted-foreground py-3.5">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((c: any) => {
                  const isCompany = c.kind === "company";
                  const hasExpiredDocs = (c.docAlerts?.expired || 0) > 0;
                  const hasSoonDocs = (c.docAlerts?.soon || 0) > 0;

                  return (
                    <TableRow key={c.id} className="hover:bg-muted/20 transition-colors">
                      {/* Nome & Razão Social */}
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`size-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
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
                              <span className="text-[11px] text-muted-foreground block truncate font-mono">
                                {c.legalName}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Tipo PF / PJ */}
                      <TableCell className="py-3.5">
                        <Badge variant="outline" className="text-[11px] font-bold uppercase">
                          {isCompany ? "PJ (B2B)" : "PF (B2C)"}
                        </Badge>
                      </TableCell>

                      {/* Documento CPF / CNPJ */}
                      <TableCell className="py-3.5">
                        <span className="font-mono text-xs text-muted-foreground">
                          {c.document || "—"}
                        </span>
                      </TableCell>

                      {/* Contato & WhatsApp */}
                      <TableCell className="py-3.5">
                        <div className="flex flex-col text-xs space-y-0.5">
                          {c.phone ? (
                            <button
                              type="button"
                              onClick={() => openWhatsApp(c.phone, c.fullName)}
                              className="font-mono text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                              title="Conversar no WhatsApp"
                            >
                              <MessageCircle className="size-3.5 shrink-0" />
                              <span>{c.phone}</span>
                            </button>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                          {c.email && (
                            <span className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                              {c.email}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Localização */}
                      <TableCell className="py-3.5">
                        <span className="text-xs text-muted-foreground">
                          {c.city ? `${c.city} - ${c.state || "UF"}` : "—"}
                        </span>
                      </TableCell>

                      {/* Alertas de Documentos */}
                      <TableCell className="py-3.5">
                        {hasExpiredDocs ? (
                          <Badge variant="destructive" className="text-[10px] font-bold py-0 h-5 gap-1">
                            <AlertTriangle className="size-2.5" />
                            <span>{c.docAlerts.expired} Vencido</span>
                          </Badge>
                        ) : hasSoonDocs ? (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 py-0 h-5 gap-1"
                          >
                            <Clock className="size-2.5" />
                            <span>{c.docAlerts.soon} Vence em breve</span>
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Regular</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3.5">
                        <Badge
                          variant={c.status === "active" ? "secondary" : "outline"}
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            c.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "text-muted-foreground"
                          }`}
                        >
                          {c.status === "active" ? "Ativo" : c.status === "blocked" ? "Bloqueado" : "Inativo"}
                        </Badge>
                      </TableCell>

                      {/* Menu de Ações */}
                      <TableCell className="text-right py-3.5">
 <div className="flex items-center justify-end gap-1.5">
 <Link
 to="/workspace/clientes/$id"
 params={{ id: c.id }}
 className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted/60 text-foreground hover:bg-muted transition-colors hover:no-underline"
 >
 Ficha 360°
 </Link>
 <CrudActionsMenu
 onView={() => router.navigate({ to: "/workspace/clientes/$id", params: { id: c.id } })}
 viewLabel="Ver Ficha Completa"
 onArchive={() => handleArchive(c.id, c.fullName)}
 archiveTitle={`Arquivar cliente "${c.fullName}"?`}
 archiveDescription="O cliente será arquivado e poderá ser restaurado futuramente."
 customActions={[
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
        </>
      )}


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
 </div>
 );
}
