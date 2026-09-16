/**
 * workspace.advocacia.index.tsx — Workspace do Advogado & Escritório Jurídico (Módulo JUS 360°)
 * Consulta CNJ, Monitoramento Contínuo, Compliance, Estatísticas e Mural de Demandas.
 */

import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState, useTransition, useMemo } from "react";
import { Scale, Search, Plus, Radio, SlidersHorizontal, Building2, Calendar, DollarSign, Users, ShieldCheck, ShieldAlert, Clock, Layers, Paperclip, CheckCircle2, FileText, Trash2, Share2, Star, RefreshCw, Eye, Send, Filter, AlertTriangle, FileCheck } from 'lucide-react';
import {
 listMarketplaceDemands,
 sendJusProposal,
 listMyLawsuits,
 listLawsuitMonitors,
 deleteLawsuitMonitor,
 searchProcessByCNJ,
 getLawsuitAnalytics,
 toggleLawsuitMonitoring,
 toggleLawsuitFavorite,
 listLawsuitDeadlines,
 deleteLawsuitDeadline,
 getLawsuitDeadlinesDigest,
} from "@/services/jus.functions";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import { HistoricalMonitorSheet } from "@/components/jus/historical-monitor-sheet";
import { LawsuitDetailsSheet } from "@/components/jus/lawsuit-details-sheet";
import { DeadlineFormSheet } from "@/components/jus/deadline-form-sheet";
import { CompleteDeadlineDialog } from "@/components/jus/complete-deadline-dialog";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/advocacia/")({
 head: () => ({ meta: [{ title: "Painel Jurídico & Processos 360° | Workspace Waesy" }] }),
 loader: async () => {
 try {
 const [demandsRes, lawsuitsRes, monitorsRes, analyticsRes, deadlinesRes, digestRes] =
 await Promise.all([
 listMarketplaceDemands().catch(() => []),
 listMyLawsuits().catch(() => []),
 listLawsuitMonitors().catch(() => []),
 getLawsuitAnalytics().catch(() => ({
 courtDistribution: [],
 stateDistribution: [],
 totalMonitored: 0,
 totalActive: 0,
 complianceAlerts: 0,
 })),
 listLawsuitDeadlines().catch(() => []),
 getLawsuitDeadlinesDigest().catch(() => ({
 pendingCount: 0,
 urgentCount: 0,
 attentionCount: 0,
 completedCount: 0,
 })),
 ]);
 return {
 demands: demandsRes || [],
 lawsuits: lawsuitsRes || [],
 monitors: monitorsRes || [],
 analytics: analyticsRes,
 deadlines: deadlinesRes || [],
 deadlinesDigest: digestRes,
 };
 } catch {
 return {
 demands: [],
 lawsuits: [],
 monitors: [],
 analytics: {
 courtDistribution: [],
 stateDistribution: [],
 totalMonitored: 0,
 totalActive: 0,
 complianceAlerts: 0,
 },
 deadlines: [],
 deadlinesDigest: {
 pendingCount: 0,
 urgentCount: 0,
 attentionCount: 0,
 completedCount: 0,
 },
 };
 }
 },
 component: WorkspaceAdvocaciaPage,
});

function WorkspaceAdvocaciaPage() {
 const router = useRouter();
 const { demands, lawsuits, monitors, analytics, deadlines, deadlinesDigest } = ((Route.useLoaderData?.() as any) || {});
 const [activeMainTab, setActiveMainTab] = useState<
 "prazos" | "acervo" | "monitoramentos" | "demandas"
 >("prazos");
 const [isPending, startTransition] = useTransition();

 // Deadlines State
 const [isDeadlineSheetOpen, setIsDeadlineSheetOpen] = useState(false);
 const [completingDeadline, setCompletingDeadline] = useState<any | null>(null);
 const [deadlineFilter, setDeadlineFilter] = useState<
 "pending" | "urgent" | "audiencia" | "completed" | "all"
 >("pending");

 // Search & Filters State
 const [searchQuery, setSearchQuery] = useState("");
 const [cnjInput, setCnjInput] = useState("");
 const [isSearchingCNJ, setIsSearchingCNJ] = useState(false);

 // Compliance Toggles (JUDIT Style)
 const [checkArrestWarrants, setCheckArrestWarrants] = useState(false);
 const [checkCriminalExecution, setCheckCriminalExecution] = useState(false);
 const [checkSanctions, setCheckSanctions] = useState(false);

 // Sheets / Drawers
 const [isMonitorSheetOpen, setIsMonitorSheetOpen] = useState(false);
 const [selectedLawsuit, setSelectedLawsuit] = useState<any | null>(null);

 // Proposal Form State (Demandas)
 const [selectedDemand, setSelectedDemand] = useState<any | null>(null);
 const [selectedArea, setSelectedArea] = useState("all");
 const [feeType, setFeeType] = useState<"fixed" | "success_percentage" | "hybrid">("fixed");
 const [fixedValue, setFixedValue] = useState("");
 const [successPercent, setSuccessPercent] = useState("20");
 const [details, setDetails] = useState("");
 const [deadlineDays, setDeadlineDays] = useState("30");

 // Filtragem de Processos do Acervo
 const filteredLawsuits = useMemo(() => {
 return (lawsuits || []).filter((l: any) => {
 if (!searchQuery.trim()) return true;
 const q = searchQuery.toLowerCase();
 const num = (l.process_number || "").toLowerCase();
 const court = (l.court_code || "").toLowerCase();
 const subject = (l.subject_name || "").toLowerCase();
 return num.includes(q) || court.includes(q) || subject.includes(q);
 });
 }, [lawsuits, searchQuery]);

 // Filtragem de Demandas
 const filteredDemands = useMemo(() => {
 return (demands || []).filter((d: any) => {
 if (selectedArea === "all") return true;
 return d.legal_area === selectedArea;
 });
 }, [demands, selectedArea]);

 // Filtragem de Prazos Processuais & Preclusão
 const filteredDeadlines = useMemo(() => {
 const now = new Date().getTime();
 return (deadlines || []).filter((d: any) => {
 if (deadlineFilter === "all") return true;
 if (deadlineFilter === "completed") return d.status === "completed";
 if (d.status === "completed") return false;
 if (deadlineFilter === "urgent") {
 const diffHours = (new Date(d.due_date).getTime() - now) / (1000 * 60 * 60);
 return diffHours <= 48 || d.priority === "fatal" || d.priority === "urgent";
 }
 if (deadlineFilter === "audiencia") {
 return d.deadline_type === "audiencia";
 }
 return d.status === "pending" || d.status === "in_progress";
 });
 }, [deadlines, deadlineFilter]);

 const handleDeleteDeadline = async (id: string) => {
 try {
 await deleteLawsuitDeadline({ data: { id } });
 toast.success("Prazo processual excluído da agenda.");
 router.invalidate();
 } catch (err: any) {
 toast.error(err.message || "Erro ao excluir prazo");
 }
 };

 // Busca Instantânea por CNJ
 const handleSearchCNJ = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!cnjInput.trim()) {
 toast.error("Informe o número do processo CNJ");
 return;
 }

 setIsSearchingCNJ(true);
 try {
 const res = await searchProcessByCNJ({
 data: {
 cnj: cnjInput.trim(),
 compliance_flags: {
 has_arrest_warrants: checkArrestWarrants,
 has_criminal_executions: checkCriminalExecution,
 has_sanctions_restrictions: checkSanctions,
 },
 },
 });

 if (res.found && res.lawsuit) {
 toast.success("Processo judicial localizado no acervo!");
 setSelectedLawsuit(res.lawsuit);
 } else {
 toast.info(res.message || "Processo não indexado no momento.");
 }
 } catch (err: any) {
 toast.error(err.message || "Falha na consulta processual");
 } finally {
 setIsSearchingCNJ(false);
 }
 };

 // Alterna Monitoramento
 const handleToggleMonitoring = async (e: React.MouseEvent, lawsuit: any) => {
 e.stopPropagation();
 try {
 await toggleLawsuitMonitoring({
 data: { lawsuitId: lawsuit.id, is_monitored: !lawsuit.is_monitored },
 });
 toast.success(
 !lawsuit.is_monitored
 ? "Processo adicionado ao monitoramento diário!"
 : "Processo removido do monitoramento."
 );
 router.invalidate();
 } catch (err: any) {
 toast.error(err.message || "Erro ao alterar monitoramento");
 }
 };

 // Alterna Favorito
 const handleToggleFavorite = async (e: React.MouseEvent, lawsuit: any) => {
 e.stopPropagation();
 try {
 await toggleLawsuitFavorite({
 data: { lawsuitId: lawsuit.id, is_favorite: !lawsuit.is_favorite },
 });
 router.invalidate();
 } catch (err: any) {
 toast.error(err.message || "Erro ao favoritar");
 }
 };

 // Exclui Monitoramento
 const handleDeleteMonitor = async (id: string) => {
 try {
 await deleteLawsuitMonitor({ data: { id } });
 toast.success("Monitoramento removido com sucesso!");
 router.invalidate();
 } catch (err: any) {
 toast.error(err.message || "Erro ao remover monitoramento");
 }
 };

 // Envio de Proposta para Demanda
 const handleSendProposal = (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedDemand || !details.trim()) {
 toast.error("Preencha os detalhes da sua proposta de honorários.");
 return;
 }

 startTransition(async () => {
 try {
 await sendJusProposal({
 data: {
 demand_id: selectedDemand.id,
 fee_type: feeType,
 fixed_value_cents: fixedValue ? Math.round(parseFloat(fixedValue) * 100) : 0,
 success_percentage: successPercent ? parseFloat(successPercent) : 0,
 proposal_details: details,
 estimated_deadline_days: parseInt(deadlineDays, 10) || 30,
 },
 });
 toast.success("Proposta de honorários enviada ao cliente com sucesso!");
 setSelectedDemand(null);
 setDetails("");
 setFixedValue("");
 router.invalidate();
 } catch (err: any) {
 toast.error(err.message || "Erro ao enviar proposta");
 }
 });
 };

 // Status e Contagem Regressiva de Preclusão
 const getPreclusionStatus = (dueDateStr: string, status: string) => {
 if (status === "completed") {
 return {
 label: "Protocolado",
 variant: "completed",
 className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-semibold",
 };
 }
 const now = new Date().getTime();
 const due = new Date(dueDateStr).getTime();
 const diffMs = due - now;
 const diffHours = Math.round(diffMs / (1000 * 60 * 60));

 if (diffHours < 0) {
 return {
 label: "Precluso / Vencido",
 variant: "expired",
 className: "bg-destructive/10 text-destructive border-destructive/30 font-bold",
 };
 }
 if (diffHours <= 24) {
 return {
 label: `Fatal • ${diffHours}h restantes`,
 variant: "fatal",
 className:
 "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40 font-black animate-pulse",
 };
 }
 if (diffHours <= 48) {
 return {
 label: `Urgente • ${diffHours}h`,
 variant: "urgent",
 className:
 "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold",
 };
 }
 const diffDays = Math.ceil(diffHours / 24);
 if (diffDays <= 5) {
 return {
 label: `Atenção • ${diffDays} dias`,
 variant: "attention",
 className: "bg-amber-500/10 text-amber-600 border-amber-500/20 font-semibold",
 };
 }
 return {
 label: `${diffDays} dias`,
 variant: "normal",
 className: "bg-muted/40 text-muted-foreground border-border/70 font-medium",
 };
 };

 return (
 <div className="space-y-6">
 {/* ── CABEÇALHO DO WORKSPACE JUS ── */}
 <PageHeader
 eyebrow="Módulo JUS • Advocacia 360°"
 title="Painel Jurídico & Processos"
 actions={
 <div className="flex items-center gap-2.5">
 <Button
 onClick={() => setIsDeadlineSheetOpen(true)}
 className="h-10 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs gap-1.5 shadow-xs"
 >
 <Plus className="size-4" />
 <span>Novo Prazo Fatal</span>
 </Button>
          <Button
            asChild
            variant="outline"
            className="h-10 px-4 rounded-xl font-bold text-xs gap-1.5"
          >
            <Link to="/workspace/contratos/novo">
              <FileText className="size-3.5 text-primary" />
              <span>Procuração & Honorários</span>
            </Link>
          </Button>
 <Button
 variant="outline"
 onClick={() => setIsMonitorSheetOpen(true)}
 className="h-10 px-4 rounded-xl font-bold text-xs gap-1.5"
 >
 <Radio className="size-3.5 text-primary" />
 <span>Consulta Histórica</span>
 </Button>
 <Badge
 variant="outline"
 className="border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 gap-1.5 rounded-xl hidden sm:flex"
 >
 <ShieldCheck className="size-3.5" />
 <span>OAB Verificada</span>
 </Badge>
 </div>
 }
 />

 {/* ── TERMINAL DE CONSULTA CNJ & FLAGS DE COMPLIANCE (PADRÃO JUDIT) ── */}
 <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-xs">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary font-mono">
 <Scale className="size-4" />
 <span>Consulta Processual Unificada</span>
 </div>
 <p className="text-xs text-muted-foreground">
 Consulte em todos os tribunais e instâncias do país utilizando o nº do processo (CNJ).
 </p>

 <form onSubmit={handleSearchCNJ} className="flex flex-col sm:flex-row gap-3">
 <div className="relative flex-1">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 value={cnjInput}
 onChange={(e) => setCnjInput(e.target.value)}
 placeholder="Insira o nº do CNJ a ser consultado (ex: 0006795-75.2018.8.01.0070)..."
 className="h-12 pl-10 rounded-xl bg-background font-mono text-xs sm:text-sm font-semibold"
 />
 </div>
 <Button
 type="submit"
 disabled={isSearchingCNJ}
 className="h-12 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-xs sm:text-sm shrink-0"
 >
 {isSearchingCNJ ? "Consultando..." : "Realizar Consulta"}
 </Button>
 </form>

 {/* Switches de Compliance (Mandados, Execução Criminal, Restrições) */}
 <div className="pt-2 flex flex-wrap items-center gap-4 sm:gap-6 border-t border-border/60">
 <label className="flex items-center gap-2 cursor-pointer text-xs">
 <Switch
 checked={checkArrestWarrants}
 onCheckedChange={setCheckArrestWarrants}
 className="scale-75"
 />
 <span className="font-semibold text-foreground">Mandados de prisão</span>
 <span className="text-[10px] text-muted-foreground hidden md:inline">(BNMP/CNJ)</span>
 </label>

 <label className="flex items-center gap-2 cursor-pointer text-xs">
 <Switch
 checked={checkCriminalExecution}
 onCheckedChange={setCheckCriminalExecution}
 className="scale-75"
 />
 <span className="font-semibold text-foreground">Execução criminal</span>
 </label>

 <label className="flex items-center gap-2 cursor-pointer text-xs">
 <Switch
 checked={checkSanctions}
 onCheckedChange={setCheckSanctions}
 className="scale-75"
 />
 <span className="font-semibold text-foreground">Restrições internacionais</span>
 <span className="text-[10px] text-muted-foreground hidden md:inline">(OFAC/ONU)</span>
 </label>
 </div>
 </div>

 {/* ── CARDS DE KPIS DO ACERVO & PRECLUSÃO ── */}
 <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
 <div className="p-4 rounded-2xl bg-card border border-rose-500/30 space-y-1">
 <div className="flex items-center justify-between">
 <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 font-mono">
 Fatais (&lt; 48h)
 </span>
 <AlertTriangle className="size-3.5 text-rose-500 animate-pulse" />
 </div>
 <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
 {deadlinesDigest?.urgentCount || 0}
 </p>
 </div>

 <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-1">
 <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
 Prazos Pendentes
 </span>
 <p className="text-xl sm:text-2xl font-black text-foreground font-mono">
 {deadlinesDigest?.pendingCount || 0}
 </p>
 </div>

 <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-1">
 <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
 Processos no Acervo
 </span>
 <p className="text-xl sm:text-2xl font-black text-foreground font-mono">
 {lawsuits.length}
 </p>
 </div>

 <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-1">
 <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
 Monitoramento Ativo
 </span>
 <p className="text-xl sm:text-2xl font-black text-primary font-mono">
 {analytics?.totalMonitored || 0}
 </p>
 </div>

 <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-1 col-span-2 sm:col-span-1">
 <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
 Demandas Abertas
 </span>
 <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
 {demands.length}
 </p>
 </div>
 </div>

 {/* ── ABAS PRINCIPAIS ── */}
 <Tabs
 value={activeMainTab}
 onValueChange={(v) => setActiveMainTab(v as any)}
 className="space-y-6"
 >
 <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-11 bg-muted/40 p-1 rounded-xl">
 <TabsTrigger value="prazos" className="text-xs font-bold rounded-lg gap-2">
 <Calendar className="size-3.5" />
 <span>
 Prazos & Agenda ({deadlines.filter((d: any) => d.status !== "completed").length})
 </span>
 </TabsTrigger>
 <TabsTrigger value="acervo" className="text-xs font-bold rounded-lg gap-2">
 <Scale className="size-3.5" />
 <span>Acervo ({filteredLawsuits.length})</span>
 </TabsTrigger>
 <TabsTrigger value="monitoramentos" className="text-xs font-bold rounded-lg gap-2">
 <Radio className="size-3.5" />
 <span>Consultas em Lote ({monitors.length})</span>
 </TabsTrigger>
 <TabsTrigger value="demandas" className="text-xs font-bold rounded-lg gap-2">
 <FileText className="size-3.5" />
 <span>Mural de Demandas ({demands.length})</span>
 </TabsTrigger>
 </TabsList>

 {/* ════════ ABA 0: PRAZOS PROCESSUAIS & AGENDA JURÍDICA ════════ */}
 <TabsContent value="prazos" className="space-y-6">
 {/* Barra de Filtros de Prazos */}
 <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
 <div className="flex flex-wrap items-center gap-2">
 <Button
 variant={deadlineFilter === "pending" ? "default" : "outline"}
 size="sm"
 onClick={() => setDeadlineFilter("pending")}
 className="h-9 px-3 rounded-xl text-xs font-bold"
 >
 Prazos em Aberto
 </Button>
 <Button
 variant={deadlineFilter === "urgent" ? "default" : "outline"}
 size="sm"
 onClick={() => setDeadlineFilter("urgent")}
 className="h-9 px-3 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 gap-1.5"
 >
 <AlertTriangle className="size-3.5" />
 <span>Fatais (&lt; 48h)</span>
 </Button>
 <Button
 variant={deadlineFilter === "audiencia" ? "default" : "outline"}
 size="sm"
 onClick={() => setDeadlineFilter("audiencia")}
 className="h-9 px-3 rounded-xl text-xs font-bold"
 >
 Audiências
 </Button>
 <Button
 variant={deadlineFilter === "completed" ? "default" : "outline"}
 size="sm"
 onClick={() => setDeadlineFilter("completed")}
 className="h-9 px-3 rounded-xl text-xs font-bold"
 >
 Protocolados / Cumpridos
 </Button>
 <Button
 variant={deadlineFilter === "all" ? "default" : "outline"}
 size="sm"
 onClick={() => setDeadlineFilter("all")}
 className="h-9 px-3 rounded-xl text-xs font-bold"
 >
 Todos
 </Button>
 </div>

 <Button
 onClick={() => setIsDeadlineSheetOpen(true)}
 className="h-9 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs gap-1.5 w-full sm:w-auto shadow-xs"
 >
 <Plus className="size-4" />
 <span>Novo Prazo</span>
 </Button>
 </div>

 {/* Lista / Tabela de Prazos */}
 {filteredDeadlines.length === 0 ? (
 <div className="p-12 text-center rounded-2xl bg-card border border-border space-y-3">
 <div className="size-12 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
 <Calendar className="size-6" />
 </div>
 <h3 className="text-sm font-bold text-foreground">Nenhum prazo encontrado</h3>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 {deadlineFilter === "urgent"
 ? "Excelente! Não há prazos com risco iminente de preclusão nas próximas 48 horas."
 : "Cadastre prazos de contestação, recursos, audiências ou manifestações com controle de datas fatais."}
 </p>
 <Button
 onClick={() => setIsDeadlineSheetOpen(true)}
 className="h-10 px-5 rounded-xl font-bold text-xs gap-1.5"
 >
 <Plus className="size-4" />
 <span>Cadastrar Primeiro Prazo</span>
 </Button>
 </div>
 ) : (
 <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
 <Table>
 <TableHeader className="bg-muted/40">
 <TableRow>
 <TableHead className="text-[11px] font-bold font-mono uppercase">
 Preclusão / Urgência
 </TableHead>
 <TableHead className="text-[11px] font-bold font-mono uppercase">
 Ato Processual & Tipo
 </TableHead>
 <TableHead className="text-[11px] font-bold font-mono uppercase">
 Processo (CNJ) / Tribunal
 </TableHead>
 <TableHead className="text-[11px] font-bold font-mono uppercase">
 Cliente / Assistido
 </TableHead>
 <TableHead className="text-[11px] font-bold font-mono uppercase">
 Data Fatal
 </TableHead>
 <TableHead className="text-[11px] font-bold font-mono uppercase text-right">
 Ações
 </TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredDeadlines.map((dl: any) => {
 const statusInfo = getPreclusionStatus(dl.due_date, dl.status);
 return (
 <TableRow key={dl.id} className="hover:bg-muted/20">
 <TableCell>
 <Badge
 variant="outline"
 className={cn(
 "text-[10px] font-mono px-2.5 py-1 rounded-lg border",
 statusInfo.className
 )}
 >
 {statusInfo.label}
 </Badge>
 </TableCell>
 <TableCell>
 <div className="space-y-0.5">
 <p className="font-bold text-xs text-foreground">{dl.title}</p>
 <Badge variant="secondary" className="text-[10px] font-mono capitalize">
 {dl.deadline_type}
 </Badge>
 </div>
 </TableCell>
 <TableCell>
 <div className="space-y-0.5 font-mono text-xs">
 <span className="font-bold text-foreground">
 {dl.process_number || "Avulso / Sem CNJ"}
 </span>
 {dl.court_name && (
 <p className="text-[10px] text-muted-foreground">{dl.court_name}</p>
 )}
 </div>
 </TableCell>
 <TableCell>
 <span className="text-xs font-medium text-foreground">
 {dl.client_name || "—"}
 </span>
 </TableCell>
 <TableCell>
 <div className="font-mono text-xs space-y-0.5">
 <span className="font-bold text-foreground">
 {formatDate(dl.due_date)}
 </span>
 <p className="text-[10px] text-muted-foreground">
 às {new Date(dl.due_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
 </p>
 </div>
 </TableCell>
 <TableCell className="text-right">
 <div className="flex items-center justify-end gap-1.5">
 {dl.status !== "completed" ? (
 <Button
 size="sm"
 onClick={() => setCompletingDeadline(dl)}
 className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] gap-1.5 shadow-2xs"
 >
 <CheckCircle2 className="size-3.5" />
 <span>Protocolar</span>
 </Button>
 ) : (
 <Badge
 variant="outline"
 className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-mono"
 >
 {dl.protocol_receipt ? `Protocolo: ${dl.protocol_receipt}` : "Concluído"}
 </Badge>
 )}
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleDeleteDeadline(dl.id)}
 className="size-8 p-0 text-muted-foreground hover:text-destructive rounded-lg"
 title="Excluir Prazo"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>
 </TableCell>
 </TableRow>
 );
 })}
 </TableBody>
 </Table>
 </div>
 )}
 </TabsContent>

 {/* ════════ ABA 1: ACERVO DE PROCESSOS ════════ */}
 <TabsContent value="acervo" className="space-y-6">
 {/* Barra de Filtro Rápido */}
 <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
 <div className="relative w-full sm:w-80">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
 <Input
 placeholder="Filtrar por CNJ, Tribunal ou Assunto..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="h-10 pl-9 rounded-xl bg-card text-xs font-medium"
 />
 </div>
 </div>

 {/* Tabela do Acervo */}
 {filteredLawsuits.length === 0 ? (
 <div className="p-12 text-center rounded-2xl bg-card border border-border space-y-3">
 <Scale className="size-10 mx-auto text-muted-foreground/40" />
 <h3 className="text-base font-bold text-foreground">Nenhum processo no acervo ativo</h3>
 <p className="text-xs text-muted-foreground max-w-md mx-auto">
 Realize uma consulta por CNJ no terminal acima ou inicie uma nova consulta histórica em lote por CPF, CNPJ ou OAB.
 </p>
 <Button
 onClick={() => setIsMonitorSheetOpen(true)}
 variant="outline"
 className="h-10 px-4 rounded-xl text-xs font-bold gap-1.5"
 >
 <Plus className="size-3.5" />
 <span>Iniciar Monitoramento</span>
 </Button>
 </div>
 ) : (
 <div className="rounded-2xl border border-border bg-card overflow-hidden">
 <Table>
 <TableHeader className="bg-muted/30">
 <TableRow>
 <TableHead className="w-12 text-center">Fav</TableHead>
 <TableHead>Processo / Partes</TableHead>
 <TableHead>Tribunal / Grau</TableHead>
 <TableHead>Última Movimentação</TableHead>
 <TableHead className="w-32 text-center">Monitoramento</TableHead>
 <TableHead className="w-20 text-right">Ação</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredLawsuits.map((lawsuit: any) => (
 <TableRow
 key={lawsuit.id}
 onClick={() => setSelectedLawsuit(lawsuit)}
 className="cursor-pointer hover:bg-muted/20 transition-colors"
 >
 {/* Favorito */}
 <TableCell onClick={(e) => handleToggleFavorite(e, lawsuit)} className="text-center">
 <Star
 className={cn(
 "size-4 mx-auto transition-colors",
 lawsuit.is_favorite
 ? "text-amber-500 fill-amber-500"
 : "text-muted-foreground/40 hover:text-amber-500"
 )}
 />
 </TableCell>

 {/* Processo & Partes */}
 <TableCell>
 <div className="space-y-1">
 <p className="font-mono text-xs font-bold text-foreground hover:text-primary transition-colors">
 {lawsuit.process_number}
 </p>
 <p className="text-xs text-muted-foreground line-clamp-1">
 {lawsuit.parties?.title || lawsuit.class_name || "Procedimento Judicial"}
 </p>
 {lawsuit.subject_name && (
 <p className="text-[10px] text-muted-foreground/80 line-clamp-1 font-mono">
 {lawsuit.subject_name}
 </p>
 )}
 </div>
 </TableCell>

 {/* Tribunal & Grau */}
 <TableCell>
 <div className="space-y-1">
 <Badge variant="outline" className="font-mono text-[10px] font-bold">
 {lawsuit.court_code || "TJ"}
 </Badge>
 <p className="text-[10px] text-muted-foreground">
 {lawsuit.degree || "1º GRAU"}
 </p>
 </div>
 </TableCell>

 {/* Última Movimentação */}
 <TableCell>
 <div className="space-y-0.5">
 <p className="font-mono text-xs text-foreground">
 {lawsuit.last_movement_date ? formatDate(lawsuit.last_movement_date) : "—"}
 </p>
 <p className="text-[11px] text-muted-foreground line-clamp-1">
 {lawsuit.last_movement_text || "Aguardando andamento"}
 </p>
 </div>
 </TableCell>

 {/* Switch de Monitoramento Ativo */}
 <TableCell onClick={(e) => e.stopPropagation()} className="text-center">
 <Switch
 checked={Boolean(lawsuit.is_monitored)}
 onClick={(e) => handleToggleMonitoring(e, lawsuit)}
 className="scale-75"
 />
 </TableCell>

 {/* Botão Ver Detalhes */}
 <TableCell className="text-right">
 <Button
 variant="ghost"
 size="icon"
 className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
 >
 <Eye className="size-4" />
 </Button>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 )}
 </TabsContent>

 {/* ════════ ABA 2: MONITORAMENTOS HISTÓRICOS EM LOTE ════════ */}
 <TabsContent value="monitoramentos" className="space-y-4">
 <div className="flex items-center justify-between">
 <p className="text-xs text-muted-foreground">
 Monitoramentos cadastrados por lote de documentos com busca contínua em tribunais.
 </p>
 <Button
 onClick={() => setIsMonitorSheetOpen(true)}
 size="sm"
 className="h-9 px-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs gap-1.5"
 >
 <Plus className="size-3.5" />
 <span>Novo Monitoramento</span>
 </Button>
 </div>

 {monitors.length === 0 ? (
 <div className="p-12 text-center rounded-2xl bg-card border border-border space-y-3">
 <Radio className="size-10 mx-auto text-muted-foreground/40" />
 <h3 className="text-base font-bold text-foreground">Nenhum monitoramento em lote criado</h3>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Crie um monitoramento agrupando múltiplos CPFs, CNPJs ou OABs para acompanhar de forma unificada.
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {monitors.map((mon: any) => (
 <div
 key={mon.id}
 className="rounded-2xl border border-border bg-card p-5 space-y-4 flex flex-col justify-between"
 >
 <div className="space-y-2.5">
 <div className="flex items-start justify-between gap-2">
 <h4 className="text-sm font-bold text-foreground leading-snug">{mon.title}</h4>
 <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 border-emerald-500/30">
 Ativo
 </Badge>
 </div>

 <div className="space-y-1">
 <span className="text-[10px] font-bold text-muted-foreground uppercase font-mono">
 Documentos ({mon.document_keys?.length || 0}):
 </span>
 <div className="flex flex-wrap gap-1">
 {(mon.document_keys || []).slice(0, 4).map((doc: string) => (
 <span
 key={doc}
 className="px-2 py-0.5 rounded-md bg-muted/40 font-mono text-[10px] text-foreground font-medium"
 >
 {doc}
 </span>
 ))}
 {mon.document_keys?.length > 4 && (
 <span className="text-[10px] text-muted-foreground">
 +{mon.document_keys.length - 4} mais
 </span>
 )}
 </div>
 </div>

 {mon.courts && mon.courts.length > 0 && (
 <div className="space-y-1 pt-1">
 <span className="text-[10px] font-bold text-muted-foreground uppercase font-mono">
 Tribunais:
 </span>
 <div className="flex flex-wrap gap-1">
 {mon.courts.map((court: string) => (
 <Badge key={court} variant="outline" className="text-[9px] font-mono px-1.5 py-0">
 {court}
 </Badge>
 ))}
 </div>
 </div>
 )}
 </div>

 <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
 <span className="text-[11px] text-muted-foreground font-mono">
 Sincronizado: {mon.last_sync_at ? formatDate(mon.last_sync_at) : "Recente"}
 </span>
 <Button
 variant="ghost"
 size="icon"
 onClick={() => handleDeleteMonitor(mon.id)}
 className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>
 </div>
 ))}
 </div>
 )}
 </TabsContent>

 {/* ════════ ABA 3: MURAL DE DEMANDAS & PROPOSTAS ════════ */}
 <TabsContent value="demandas" className="space-y-6">
 <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
 {/* Coluna Esquerda: Demandas */}
 <div className="space-y-4 lg:col-span-7">
 {/* Filtros de Área */}
 <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
 <Filter className="size-3.5 text-muted-foreground ml-1" />
 {[
 { id: "all", label: "Todas as Áreas" },
 { id: "Trabalhista", label: "Trabalhista" },
 { id: "Cível", label: "Cível" },
 { id: "Família", label: "Família" },
 { id: "Consumidor", label: "Consumidor" },
 { id: "Previdenciário", label: "Previdenciário" },
 { id: "Tributário", label: "Tributário" },
 ].map((area) => (
 <button
 key={area.id}
 onClick={() => setSelectedArea(area.id)}
 className={cn(
 "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
 selectedArea === area.id
 ? "bg-primary text-primary-foreground"
 : "bg-muted/40 text-muted-foreground hover:text-foreground"
 )}
 >
 {area.label}
 </button>
 ))}
 </div>

 {filteredDemands.length === 0 ? (
 <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card text-xs text-muted-foreground">
 Nenhuma demanda aberta nesta categoria no momento.
 </div>
 ) : (
 filteredDemands.map((demand: any) => (
 <div
 key={demand.id}
 onClick={() => setSelectedDemand(demand)}
 className={cn(
 "rounded-2xl border p-5 transition-all cursor-pointer bg-card",
 selectedDemand?.id === demand.id
 ? "border-primary ring-1 ring-primary shadow-xs"
 : "border-border hover:border-border/80"
 )}
 >
 <div className="flex items-center justify-between gap-2 mb-2">
 <span className="font-mono text-[11px] font-bold text-primary uppercase">
 {demand.legal_area}
 </span>
 <Badge
 variant={demand.urgency === "urgent" ? "destructive" : "secondary"}
 className="text-[10px] font-mono"
 >
 {demand.urgency === "urgent" ? "Urgente" : "Normal"}
 </Badge>
 </div>

 <h4 className="text-sm font-bold text-foreground">{demand.title}</h4>
 <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
 {demand.description}
 </p>

 <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/50 pt-2 font-mono">
 <span>{demand.city || "Regional"} - {demand.state || "SC"}</span>
 <span>{formatDate(demand.created_at)}</span>
 </div>
 </div>
 ))
 )}
 </div>

 {/* Coluna Direita: Formulário de Proposta */}
 <div className="lg:col-span-5">
 <div className="sticky top-6 rounded-2xl border border-border bg-card p-6 space-y-5 shadow-xs">
 <div className="space-y-1">
 <h3 className="text-sm font-bold text-foreground">Proposta de Honorários</h3>
 <p className="text-xs text-muted-foreground">
 {selectedDemand
 ? `Respondendo à demanda: "${selectedDemand.title}"`
 : "Selecione uma demanda ao lado para formular sua proposta."}
 </p>
 </div>

 {selectedDemand ? (
 <form onSubmit={handleSendProposal} className="space-y-4">
 <div className="space-y-2">
 <label className="text-xs font-bold text-muted-foreground uppercase font-mono">
 Modalidade de Honorários
 </label>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
 {[
 { id: "fixed", label: "Fixo" },
 { id: "success_percentage", label: "Êxito %" },
 { id: "hybrid", label: "Híbrido" },
 ].map((m) => (
 <button
 key={m.id}
 type="button"
 onClick={() => setFeeType(m.id as any)}
 className={cn(
 "p-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer",
 feeType === m.id
 ? "bg-primary text-primary-foreground border-primary"
 : "bg-background text-muted-foreground border-border"
 )}
 >
 {m.label}
 </button>
 ))}
 </div>
 </div>

 {(feeType === "fixed" || feeType === "hybrid") && (
 <div className="space-y-1">
 <label className="text-xs font-bold text-muted-foreground uppercase font-mono">
 Valor Inicial / Fixo (R$)
 </label>
 <Input
 type="number"
 step="0.01"
 placeholder="Ex: 1500.00"
 value={fixedValue}
 onChange={(e) => setFixedValue(e.target.value)}
 className="h-10 rounded-xl bg-background text-xs"
 />
 </div>
 )}

 {(feeType === "success_percentage" || feeType === "hybrid") && (
 <div className="space-y-1">
 <label className="text-xs font-bold text-muted-foreground uppercase font-mono">
 Percentual sobre o Êxito (%)
 </label>
 <Input
 type="number"
 placeholder="Ex: 20"
 value={successPercent}
 onChange={(e) => setSuccessPercent(e.target.value)}
 className="h-10 rounded-xl bg-background text-xs"
 />
 </div>
 )}

 <div className="space-y-1">
 <label className="text-xs font-bold text-muted-foreground uppercase font-mono">
 Prazo Estimado (Dias)
 </label>
 <Input
 type="number"
 value={deadlineDays}
 onChange={(e) => setDeadlineDays(e.target.value)}
 className="h-10 rounded-xl bg-background text-xs"
 />
 </div>

 <div className="space-y-1">
 <label className="text-xs font-bold text-muted-foreground uppercase font-mono">
 Detalhes da Estratégia Jurídica
 </label>
 <textarea
 rows={4}
 value={details}
 onChange={(e) => setDetails(e.target.value)}
 placeholder="Apresente sua experiência na matéria, estratégia preliminar e o que está contemplado..."
 className="w-full rounded-xl border border-border bg-background p-3 text-xs focus:ring-1 focus:ring-primary outline-none"
 />
 </div>

 <Button
 type="submit"
 disabled={isPending}
 className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-xs gap-2"
 >
 <Send className="size-3.5" />
 <span>{isPending ? "Enviando..." : "Enviar Proposta ao Cliente"}</span>
 </Button>
 </form>
 ) : (
 <div className="p-8 rounded-2xl border border-dashed border-border/80 bg-muted/20 text-center text-xs text-muted-foreground">
 Clique em qualquer demanda aberta no mural para preencher e enviar a proposta formal.
 </div>
 )}
 </div>
 </div>
 </div>
 </TabsContent>
 </Tabs>

 {/* ── SHEETS / MODAIS INTEGRADOS ── */}
 {/* 1. Sheet de Novo Prazo Processual Fatal */}
 <DeadlineFormSheet
 open={isDeadlineSheetOpen}
 onOpenChange={setIsDeadlineSheetOpen}
 />

 {/* 2. Modal de Cumprimento & Protocolo Judicial */}
 <CompleteDeadlineDialog
 open={Boolean(completingDeadline)}
 onOpenChange={(open) => !open && setCompletingDeadline(null)}
 deadline={completingDeadline}
 />

 {/* 3. Sheet de Nova Consulta Histórica (Lote de Documentos) */}
 <HistoricalMonitorSheet
 open={isMonitorSheetOpen}
 onOpenChange={setIsMonitorSheetOpen}
 onSuccess={() => router.invalidate()}
 />

 {/* 4. Sheet da Ficha 360° do Processo Judicial */}
 <LawsuitDetailsSheet
 open={Boolean(selectedLawsuit)}
 onOpenChange={(open) => !open && setSelectedLawsuit(null)}
 lawsuit={selectedLawsuit}
 onUpdate={() => router.invalidate()}
 />
 </div>
 );
}
