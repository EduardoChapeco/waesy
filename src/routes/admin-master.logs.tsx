import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/commerce/page-header";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getSystemLogs,
  getSystemLogsStats,
  deleteSystemLog,
  clearSystemLogs,
  getForensicAuditEvents,
  type SystemLogItem,
  type SystemLogsStats,
  type ForensicAuditEventItem,
} from "@/services/admin-logs.functions";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle,
  Clock,
  Copy,
  Database,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Terminal,
  Trash2,
  User,
  ChevronDown,
  ChevronUp,
  Fingerprint,
  Lock,
  History,
  FileCode,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin-master/logs")({
  head: () => ({ meta: [{ title: "Logs & Telemetria Forense | Master Admin" }] }),
  loader: async () => {
    try {
      const [logs, stats, forensicEvents] = await Promise.all([
        getSystemLogs({ data: { limit: 150 } }).catch(() => []),
        getSystemLogsStats().catch(() => ({
          total: 0,
          critical: 0,
          errors: 0,
          warnings: 0,
          topRoutes: [],
          lastErrorAt: null,
        })),
        getForensicAuditEvents({ data: { limit: 100 } }).catch(() => []),
      ]);
      return { logs: logs || [], stats, forensicEvents: forensicEvents || [] };
    } catch (e) {
      console.error("Erro ao carregar logs:", e);
      return {
        logs: [],
        stats: {
          total: 0,
          critical: 0,
          errors: 0,
          warnings: 0,
          topRoutes: [],
          lastErrorAt: null,
        },
        forensicEvents: [],
      };
    }
  },
  component: SystemLogsPage,
});

function SystemLogsPage() {
  const { logs, stats, forensicEvents } = (Route.useLoaderData?.() as {
    logs: SystemLogItem[];
    stats: SystemLogsStats;
    forensicEvents: ForensicAuditEventItem[];
  }) || { logs: [], stats: { total: 0, critical: 0, errors: 0, warnings: 0, topRoutes: [], lastErrorAt: null }, forensicEvents: [] };

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"errors" | "forensic">("errors");
  const [search, setSearch] = useState("");
  const [forensicSearch, setForensicSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "error" | "warn">("all");
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
  const [expandedForensicIds, setExpandedForensicIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Toggle stack trace & payload visibility
  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Copy complete diagnosis
  const handleCopyLog = (log: SystemLogItem) => {
    const diagnosis = {
      id: log.id,
      timestamp: log.created_at,
      route: log.route,
      contract: log.contract_name,
      severity: log.severity,
      table: log.table_name,
      column: log.column_name,
      message: log.error_message,
      payload: log.payload,
      stackTrace: log.stack_trace,
    };

    navigator.clipboard.writeText(JSON.stringify(diagnosis, null, 2));
    setCopiedId(log.id);
    toast.success("Diagnóstico copiado para a área de transferência!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Delete single log
  const handleDeleteLog = async (id: string) => {
    try {
      setIsDeletingId(id);
      await deleteSystemLog({ data: { id } });
      toast.success("Log removido com sucesso.");
      router.invalidate();
    } catch (e) {
      toast.error("Erro ao remover log.");
    } finally {
      setIsDeletingId(null);
    }
  };

  // Clear all logs
  const handleClearAll = async () => {
    if (!confirm("Tem certeza que deseja limpar todos os registros de erros do sistema?")) return;
    try {
      setIsClearingAll(true);
      await clearSystemLogs({ data: { severity: "all" } });
      toast.success("Logs do sistema expurgados com sucesso.");
      router.invalidate();
    } catch (e) {
      toast.error("Erro ao limpar logs.");
    } finally {
      setIsClearingAll(false);
    }
  };

  // Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await router.invalidate();
    setIsRefreshing(false);
    toast.info("Painel de telemetria atualizado.");
  };

  // Client-side filtering
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (severityFilter !== "all" && log.severity !== severityFilter) {
        return false;
      }
      if (!search.trim()) return true;

      const q = search.toLowerCase().trim();
      const matchRoute = log.route?.toLowerCase().includes(q);
      const matchMessage = log.error_message?.toLowerCase().includes(q);
      const matchContract = log.contract_name?.toLowerCase().includes(q);
      const matchTable = log.table_name?.toLowerCase().includes(q);
      const matchUser = log.profiles?.full_name?.toLowerCase().includes(q);

      return matchRoute || matchMessage || matchContract || matchTable || matchUser;
    });
  }, [logs, severityFilter, search]);

  const filteredForensicEvents = useMemo(() => {
    if (!forensicSearch.trim()) return forensicEvents;
    const q = forensicSearch.toLowerCase().trim();
    return forensicEvents.filter(
      (ev) =>
        ev.action.toLowerCase().includes(q) ||
        ev.target_entity_type.toLowerCase().includes(q) ||
        ev.target_entity_id.toLowerCase().includes(q) ||
        (ev.actor_name && ev.actor_name.toLowerCase().includes(q)) ||
        (ev.checksum_sha256 && ev.checksum_sha256.toLowerCase().includes(q))
    );
  }, [forensicEvents, forensicSearch]);

  const topRouteInfo = stats.topRoutes && stats.topRoutes.length > 0 ? stats.topRoutes[0] : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-8 py-6">
      {/* Header com Ações Rápidas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          eyebrow="Auditoria & SRE"
          title="Logs & Telemetria do Sistema"
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>

          {activeTab === "errors" && logs.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearAll}
              disabled={isClearingAll}
              className="gap-1.5"
            >
              <Trash2 className="size-3.5" />
              {isClearingAll ? "Limpando..." : "Limpar Logs"}
            </Button>
          )}
        </div>
      </div>

      {/* Abas Superiores Bilaterais */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <Button
          variant={activeTab === "errors" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("errors")}
          className="rounded-xl text-xs font-bold gap-1.5"
        >
          <Server className="size-3.5" />
          <span>Erros do Sistema & Telemetria ({logs.length})</span>
        </Button>
        <Button
          variant={activeTab === "forensic" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("forensic")}
          className="rounded-xl text-xs font-bold gap-1.5"
        >
          <Fingerprint className="size-3.5" />
          <span>Trilha Forense & Governança ({forensicEvents.length})</span>
        </Button>
      </div>

      {/* ── ABA 1: ERROS DO SISTEMA & TELEMETRIA ── */}
      {activeTab === "errors" && (
        <>
          {/* KPI Cards de Telemetria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Surface className="p-4 flex items-center justify-between border-border/70">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total de Incidentes</p>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {stats.total}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Eventos auditados</p>
              </div>
              <div className="p-2.5 bg-muted rounded-xl text-muted-foreground">
                <Server className="size-5" />
              </div>
            </Surface>

            <Surface className="p-4 flex items-center justify-between border-border/70">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Incidentes Críticos</p>
                <p className={`text-2xl font-bold tracking-tight mt-1 ${stats.critical > 0 ? "text-destructive" : "text-foreground"}`}>
                  {stats.critical}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Exigem intervenção imediata</p>
              </div>
              <div className={`p-2.5 rounded-xl ${stats.critical > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                <AlertTriangle className="size-5" />
              </div>
            </Surface>

            <Surface className="p-4 flex items-center justify-between border-border/70">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Erros & Advertências</p>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {stats.errors} <span className="text-xs font-normal text-muted-foreground">/ {stats.warnings} avisos</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Interceptados em BFF</p>
              </div>
              <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
                <AlertCircle className="size-5" />
              </div>
            </Surface>

            <Surface className="p-4 flex items-center justify-between border-border/70">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Rota Mais Ativa</p>
                <p className="text-sm font-bold tracking-tight text-foreground mt-1 truncate max-w-[140px]" title={topRouteInfo?.route}>
                  {topRouteInfo?.route || "Nenhuma"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {topRouteInfo ? `${topRouteInfo.count} ocorrências` : "Tudo operando estável"}
                </p>
              </div>
              <div className="p-2.5 bg-muted rounded-xl text-muted-foreground">
                <Database className="size-5" />
              </div>
            </Surface>
          </div>

          {/* Barra de Filtros & Busca de Erros */}
          <Surface className="p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 border-border/70">
            <div className="relative w-full md:w-80">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar por rota, mensagem ou tabela..."
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto no-scrollbar">
              <Button
                variant={severityFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSeverityFilter("all")}
                className="h-8 text-xs px-3"
              >
                Todos ({logs.length})
              </Button>
              <Button
                variant={severityFilter === "critical" ? "default" : "outline"}
                size="sm"
                onClick={() => setSeverityFilter("critical")}
                className={`h-8 text-xs px-3 ${severityFilter === "critical" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}`}
              >
                Críticos ({stats.critical})
              </Button>
              <Button
                variant={severityFilter === "error" ? "default" : "outline"}
                size="sm"
                onClick={() => setSeverityFilter("error")}
                className="h-8 text-xs px-3"
              >
                Erros ({stats.errors})
              </Button>
              <Button
                variant={severityFilter === "warn" ? "default" : "outline"}
                size="sm"
                onClick={() => setSeverityFilter("warn")}
                className="h-8 text-xs px-3"
              >
                Avisos ({stats.warnings})
              </Button>
            </div>
          </Surface>

          {/* Lista de Logs de Erro */}
          <div className="grid grid-cols-1 gap-3.5">
            {filteredLogs.length === 0 ? (
              <Surface className="p-12 text-center border border-dashed border-border/80 rounded-2xl">
                <div className="size-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3.5">
                  <ShieldCheck className="size-6" />
                </div>
                <h3 className="font-bold text-base text-foreground">
                  {search || severityFilter !== "all"
                    ? "Nenhum incidente corresponde ao filtro"
                    : "Sistema 100% Estável"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  {search || severityFilter !== "all"
                    ? "Tente ajustar os termos de busca ou selecione outro nível de severidade."
                    : "Nenhum erro pendente registrado no banco de dados. Todos os contratos de BFF, camadas de dados e interfaces estão operando com integridade máxima."}
                </p>
              </Surface>
            ) : (
              filteredLogs.map((log) => {
                const isExpanded = expandedLogIds.has(log.id);
                const isDeleting = isDeletingId === log.id;
                const isCopied = copiedId === log.id;

                return (
                  <Surface
                    key={log.id}
                    className="p-4 flex flex-col gap-3 border-border/70 hover:border-border transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            log.severity === "critical"
                              ? "bg-destructive/15 text-destructive"
                              : log.severity === "warn"
                              ? "bg-amber-500/15 text-amber-600"
                              : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          {log.severity === "critical" ? (
                            <AlertTriangle className="size-4" />
                          ) : log.severity === "warn" ? (
                            <AlertCircle className="size-4" />
                          ) : (
                            <Terminal className="size-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-foreground">
                              {log.route || "BFF Internal"}
                            </span>
                            <Badge
                              variant={
                                log.severity === "critical"
                                  ? "destructive"
                                  : log.severity === "warn"
                                  ? "secondary"
                                  : "outline"
                              }
                              className="text-[10px] uppercase font-bold"
                            >
                              {log.severity}
                            </Badge>
                            {log.contract_name && (
                              <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                                {log.contract_name}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {log.created_at ? new Date(log.created_at).toLocaleString("pt-BR") : "Data indisponível"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyLog(log)}
                          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
                        >
                          {isCopied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                          <span className="hidden sm:inline">{isCopied ? "Copiado" : "Copiar"}</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLog(log.id)}
                          disabled={isDeleting}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="bg-muted/40 p-3 rounded-lg border border-border/50 text-xs font-mono text-foreground break-all">
                      {log.error_message}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      {log.table_name && (
                        <span className="flex items-center gap-1 font-mono">
                          <Database className="size-3.5 text-primary" /> Tabela: {log.table_name}
                        </span>
                      )}
                      {log.profiles?.full_name && (
                        <span className="flex items-center gap-1">
                          <User className="size-3.5 text-muted-foreground" /> Usuário: {log.profiles.full_name}
                        </span>
                      )}
                      {log.page_url && (
                        <div className="text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-md border border-border/40 font-mono truncate max-w-xs">
                          {log.page_url}
                        </div>
                      )}
                    </div>

                    {(log.payload || log.stack_trace) && (
                      <div className="pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(log.id)}
                          className="h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1 p-0"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="size-3.5" /> Ocultar detalhes técnicos
                            </>
                          ) : (
                            <>
                              <ChevronDown className="size-3.5" /> Ver payload e rastreamento de pilha
                            </>
                          )}
                        </Button>

                        {isExpanded && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2.5">
                            {log.payload && (
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                  <Terminal className="size-3" /> Payload da Requisição
                                </span>
                                <pre className="bg-muted/70 p-2.5 rounded-lg text-[11px] overflow-x-auto no-scrollbar border border-border/50 text-foreground font-mono max-h-48">
                                  {JSON.stringify(log.payload, null, 2)}
                                </pre>
                              </div>
                            )}

                            {log.stack_trace && (
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                  Stack Trace
                                </span>
                                <pre className="bg-muted/70 p-2.5 rounded-lg text-[10px] overflow-x-auto no-scrollbar border border-border/50 text-foreground/75 font-mono max-h-48">
                                  {log.stack_trace}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </Surface>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ── ABA 2: TRILHA FORENSE DE GOVERNANÇA ── */}
      {activeTab === "forensic" && (
        <div className="space-y-4">
          <Surface className="p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 border-border/70">
            <div className="relative w-full md:w-96">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={forensicSearch}
                onChange={(e) => setForensicSearch(e.target.value)}
                placeholder="Filtrar por ação, autor, entidade ou checksum SHA-256..."
                className="pl-9 h-9 text-xs"
              />
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {filteredForensicEvents.length} eventos registrados na trilha forense
            </span>
          </Surface>

          <div className="grid grid-cols-1 gap-3.5">
            {filteredForensicEvents.length === 0 ? (
              <Surface className="p-12 text-center border border-dashed border-border/80 rounded-2xl">
                <div className="size-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3.5">
                  <Fingerprint className="size-6" />
                </div>
                <h3 className="font-bold text-base text-foreground">
                  Nenhum Evento Forense Encontrado
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Ações de moderação, bloqueios de inadimplência, aprovações de fatura e alterações de segurança são registradas automaticamente aqui.
                </p>
              </Surface>
            ) : (
              filteredForensicEvents.map((ev) => {
                const isExpanded = expandedForensicIds.has(ev.id);
                const toggleForensicExpand = () => {
                  setExpandedForensicIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(ev.id)) next.delete(ev.id);
                    else next.add(ev.id);
                    return next;
                  });
                };

                return (
                  <Surface
                    key={ev.id}
                    className="p-4 flex flex-col gap-3 border-border/70 hover:border-border transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                          <Fingerprint className="size-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-foreground">
                              {ev.action}
                            </span>
                            <Badge variant="outline" className="text-[10px] uppercase font-bold font-mono">
                              {ev.target_entity_type}: {ev.target_entity_id.slice(0, 8)}
                            </Badge>
                            {ev.actor_role && (
                              <Badge variant="secondary" className="text-[10px] font-mono">
                                {ev.actor_role}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {ev.created_at ? new Date(ev.created_at).toLocaleString("pt-BR") : "—"} · Autor: {ev.actor_name}
                            {ev.ip_address && ` · IP: ${ev.ip_address}`}
                          </p>
                        </div>
                      </div>

                      {ev.checksum_sha256 && (
                        <div className="text-[10px] font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/40 shrink-0 hidden sm:block" title="Checksum SHA-256 de Autenticidade">
                          SHA: {ev.checksum_sha256.slice(0, 12)}...
                        </div>
                      )}
                    </div>

                    {ev.payload_snapshot && Object.keys(ev.payload_snapshot).length > 0 && (
                      <div className="pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleForensicExpand}
                          className="h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1 p-0"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="size-3.5" /> Ocultar snapshot da intervenção
                            </>
                          ) : (
                            <>
                              <ChevronDown className="size-3.5" /> Inspecionar dados da intervenção (JSON)
                            </>
                          )}
                        </Button>

                        {isExpanded && (
                          <pre className="bg-muted/70 p-2.5 rounded-lg text-[11px] overflow-x-auto no-scrollbar border border-border/50 text-foreground font-mono max-h-48 mt-2">
                            {JSON.stringify(ev.payload_snapshot, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </Surface>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
