/**
 * workspace.configuracoes.sessoes.tsx — Sessões Ativas, Dispositivos e Trilha de Auditoria da Loja
 * 
 * PADRÃO BIGTECH | ZERO MOCKS | 100% BILATERAL E FUNCIONAL
 * 
 * Tabelas de Origem & Persistência:
 * - `public.audit_logs`: Ações operacionais da equipe na loja (produtos, pedidos, configurações, financeiro)
 * - `public.profiles`: Metadados e nomes completos dos atores das ações
 * - `public.device_registry`: Dispositivos conectados e catalogados na sessão
 * - `public.session_audit_logs`: Histórico de eventos de segurança e autenticação (IP, Cidade, VPN/Datacenter)
 */

import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  getUserSecurityAuditLogs,
  getUserRegisteredDevices,
  revokeUserDevice,
} from "@/services/auth.functions";
import { getStoreAuditLogs, type StoreAuditLogItem } from "@/services/admin-logs.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Shield,
  ShieldCheck,
  Smartphone,
  Laptop,
  Globe,
  MapPin,
  Clock,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  History,
  FileCode2,
  Trash2,
  Eye,
  CheckCircle2,
  Activity,
  Layers,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/workspace/configuracoes/sessoes")({
  head: () => ({
    meta: [
      { title: "Sessões, Dispositivos & Auditoria da Loja | Workspace Waesy" },
      { name: "description", content: "Auditoria operacional da loja e controle de sessões e dispositivos ativos." },
    ],
  }),
  loader: async () => {
    try {
      const [logs, devices, storeAuditLogs] = await Promise.all([
        getUserSecurityAuditLogs().catch(() => []),
        getUserRegisteredDevices().catch(() => []),
        getStoreAuditLogs({ data: { limit: 100 } }).catch(() => []),
      ]);
      return { logs, devices, storeAuditLogs };
    } catch (err) {
      console.error("[loader:workspace.configuracoes.sessoes] Loader error:", err);
      return { logs: [], devices: [], storeAuditLogs: [] };
    }
  },
  component: WorkspaceSessionsAndAuditPage,
});

function WorkspaceSessionsAndAuditPage() {
  const {
    logs: initialLogs,
    devices: initialDevices,
    storeAuditLogs: initialStoreAudit,
  } = ((Route.useLoaderData?.() as any) || {});

  const router = useRouter();

  // Estados dos dados
  const [activeTab, setActiveTab] = useState<"store_audit" | "sessions">("store_audit");
  const [logs, setLogs] = useState(initialLogs || []);
  const [devices, setDevices] = useState(initialDevices || []);
  const [storeAuditLogs, setStoreAuditLogs] = useState<StoreAuditLogItem[]>(initialStoreAudit || []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filtros da Trilha de Auditoria da Loja
  const [auditSearch, setAuditSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [selectedPayloadLog, setSelectedPayloadLog] = useState<StoreAuditLogItem | null>(null);

  /**
   * Recarrega todos os registros diretamente do banco de dados (BFF)
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [freshLogs, freshDevices, freshStoreAudit] = await Promise.all([
        getUserSecurityAuditLogs(),
        getUserRegisteredDevices(),
        getStoreAuditLogs({ data: { limit: 100 } }),
      ]);
      setLogs(freshLogs || []);
      setDevices(freshDevices || []);
      setStoreAuditLogs(freshStoreAudit || []);
      toast.success("Dados sincronizados com o servidor.");
    } catch (e: any) {
      toast.error("Erro ao atualizar: " + (e?.message || "Falha de rede"));
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Revoga e desconecta um dispositivo registrado
   */
  const handleRevokeDevice = async (deviceId: string) => {
    if (!confirm("Deseja realmente desconectar esta sessão / dispositivo?")) return;

    setActionLoadingId(deviceId);
    try {
      await revokeUserDevice({ data: { deviceId } });
      toast.success("Dispositivo desconectado com sucesso.");
      setDevices((prev: any[]) => prev.filter((d: any) => d.id !== deviceId));
      router.invalidate();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao revogar sessão.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtragem da Trilha de Auditoria da Loja
  const filteredAuditLogs = useMemo(() => {
    return storeAuditLogs.filter((item) => {
      if (entityFilter !== "all" && item.entity_type !== entityFilter) return false;

      if (auditSearch.trim()) {
        const q = auditSearch.toLowerCase();
        const matchesAction = item.action.toLowerCase().includes(q);
        const matchesActor = (item.user_name || "").toLowerCase().includes(q);
        const matchesEntity = item.entity_type.toLowerCase().includes(q);
        if (!matchesAction && !matchesActor && !matchesEntity) return false;
      }

      return true;
    });
  }, [storeAuditLogs, entityFilter, auditSearch]);

  const uniqueEntities = useMemo(() => {
    const list = [...new Set(storeAuditLogs.map((l) => l.entity_type).filter(Boolean))];
    return list;
  }, [storeAuditLogs]);

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Header Canônico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              to="/workspace/configuracoes"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              Configurações
            </Link>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Sessões & Auditoria da Loja
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Governança bilateral: consulte o histórico de alterações da equipe e gerencie dispositivos conectados.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="self-start sm:self-auto gap-2 rounded-xl text-xs cursor-pointer"
        >
          <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Sincronizar
        </Button>
      </div>

      {/* Tabs Switcher: Auditoria da Loja vs Sessões Pessoais */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        <button
          onClick={() => setActiveTab("store_audit")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer",
            activeTab === "store_audit"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:bg-muted/50"
          )}
        >
          <History className="size-3.5" />
          <span>Trilha de Auditoria da Loja</span>
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] px-1.5 py-0 h-4 font-mono",
              activeTab === "store_audit" ? "bg-primary-foreground/20 text-primary-foreground" : ""
            )}
          >
            {storeAuditLogs.length}
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab("sessions")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer",
            activeTab === "sessions"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:bg-muted/50"
          )}
        >
          <ShieldCheck className="size-3.5" />
          <span>Sessões & Dispositivos</span>
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] px-1.5 py-0 h-4 font-mono",
              activeTab === "sessions" ? "bg-primary-foreground/20 text-primary-foreground" : ""
            )}
          >
            {devices.length}
          </Badge>
        </button>
      </div>

      {/* ============================================================
          ABA 1: TRILHA DE AUDITORIA DA LOJA (GOVERNANÇA OPERACIONAL)
          ============================================================ */}
      {activeTab === "store_audit" && (
        <section className="space-y-4">
          {/* Barra de Filtro e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/10 p-3 rounded-2xl border border-border/60">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground mr-1">Entidade:</span>
              <button
                onClick={() => setEntityFilter("all")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer",
                  entityFilter === "all"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                Todas ({storeAuditLogs.length})
              </button>
              {uniqueEntities.map((ent) => (
                <button
                  key={ent}
                  onClick={() => setEntityFilter(ent)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer capitalize",
                    entityFilter === ent
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {ent}
                </button>
              ))}
            </div>

            <Input
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Buscar por colaborador ou ação..."
              className="h-8 sm:w-64 text-xs rounded-xl bg-background"
            />
          </div>

          {/* Lista de Registros Forenses da Loja */}
          {filteredAuditLogs.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border/70 bg-muted/20">
              <History className="size-8 mx-auto text-muted-foreground/60 mb-2" />
              <p className="text-xs font-semibold text-foreground">
                Nenhuma ação operacional registrada ainda.
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Alterações de catálogo, pedidos, preços e permissões executadas por membros da equipe serão logadas aqui com integridade forense.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-2xs">
              <div className="divide-y divide-border/60">
                {filteredAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="size-8 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 text-primary mt-0.5">
                        <Layers className="size-4" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-foreground">
                            {log.user_name || "Membro da Equipe"}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                            {log.entity_type}
                          </Badge>
                          <Badge
                            className={cn(
                              "text-[10px] px-1.5 py-0 font-medium",
                              log.action.includes("delete") || log.action.includes("block")
                                ? "bg-destructive/90 text-white"
                                : log.action.includes("create")
                                ? "bg-emerald-600/90 text-white"
                                : "bg-muted text-foreground"
                            )}
                          >
                            {log.action}
                          </Badge>
                        </div>

                        {log.entity_id && (
                          <p className="text-[11px] font-mono text-muted-foreground">
                            ID: <span className="opacity-80">{log.entity_id}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-left sm:text-right font-mono text-[11px] text-muted-foreground">
                        <p>{format(new Date(log.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                        <p className="text-[10px] text-muted-foreground/70">
                          {format(new Date(log.created_at), "HH:mm:ss", { locale: ptBR })}
                        </p>
                      </div>

                      {log.payload_snapshot && Object.keys(log.payload_snapshot).length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedPayloadLog(log)}
                          className="h-7 px-2.5 rounded-lg text-xs gap-1 cursor-pointer"
                        >
                          <Eye className="size-3" />
                          <span>Detalhes</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ============================================================
          ABA 2: DISPOSITIVOS CATALOGADOS & SESSÕES DE LOGIN
          ============================================================ */}
      {activeTab === "sessions" && (
        <section className="space-y-6">
          {/* Bloco de Dispositivos Conectados */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Laptop className="size-4 text-primary" />
              <span>Dispositivos Conectados ({devices.length})</span>
            </h2>

            {devices.length === 0 ? (
              <div className="p-6 text-center rounded-2xl border border-dashed border-border/70 bg-muted/20">
                <Laptop className="size-6 mx-auto text-muted-foreground mb-1.5" />
                <p className="text-xs text-muted-foreground">Nenhum dispositivo catalogado registrado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {devices.map((dev: any) => {
                  const isMobile = dev.device_type === "mobile";
                  return (
                    <div
                      key={dev.id}
                      className="p-4 rounded-2xl border border-border/70 bg-card flex flex-col justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            {isMobile ? <Smartphone className="size-4" /> : <Laptop className="size-4" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">
                              {dev.device_name || (isMobile ? "Dispositivo Móvel" : "Computador")}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-mono">
                              {dev.ip_address || "IP Dinâmico"}
                            </p>
                          </div>
                        </div>

                        {dev.is_trusted && (
                          <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            Confiável
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1 text-[11px] text-muted-foreground border-t border-border/40 pt-2">
                        {dev.city && (
                          <p className="flex items-center gap-1">
                            <MapPin className="size-3" />
                            {dev.city}, {dev.country_code}
                          </p>
                        )}
                        {dev.last_seen_at && (
                          <p className="flex items-center gap-1 font-mono text-[10px]">
                            <Clock className="size-3" />
                            Visto em: {format(new Date(dev.last_seen_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={actionLoadingId === dev.id}
                        onClick={() => handleRevokeDevice(dev.id)}
                        className="h-7 text-xs text-destructive hover:bg-destructive/10 rounded-lg justify-start px-2 cursor-pointer mt-1"
                      >
                        <Trash2 className="size-3 mr-1" />
                        <span>Desconectar Sessão</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Histórico Recente de Autenticação */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              <span>Eventos de Autenticação & Segurança</span>
            </h2>

            {logs.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-border/70 bg-muted/20">
                <Shield className="size-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs font-semibold text-muted-foreground">Nenhum evento registrado recentemente.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-2xs">
                <div className="divide-y divide-border/60">
                  {logs.map((log: any) => (
                    <div
                      key={log.id}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                            log.event_type === "login_success"
                              ? "bg-green-500/10 text-green-600"
                              : "bg-amber-500/10 text-amber-600"
                          }`}
                        >
                          {log.event_type === "login_success" ? (
                            <ShieldCheck className="size-4" />
                          ) : (
                            <AlertTriangle className="size-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-foreground">
                              {log.event_type === "login_success" ? "Login Autorizado" : log.event_type}
                            </p>
                            {log.is_datacenter && (
                              <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-600 border-purple-500/30">
                                VPN/Datacenter
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1 font-mono">
                              <Globe className="size-3" />
                              {log.ip_address || "IP Oculto"}
                            </span>
                            {log.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="size-3" />
                                {log.city}, {log.country_code}
                              </span>
                            )}
                            <span>{log.metadata?.device_name || log.device_type}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-muted-foreground text-left sm:text-right font-mono">
                        <p>{format(new Date(log.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                        <p className="text-[10px] text-muted-foreground/70">
                          {format(new Date(log.created_at), "HH:mm:ss", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Dialog de Inspeção Forense de Alterações (JSON) */}
      <Dialog open={Boolean(selectedPayloadLog)} onOpenChange={(open) => !open && setSelectedPayloadLog(null)}>
        <DialogContent className="sm:max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <FileCode2 className="size-4 text-primary" />
              <span>Snapshot da Ação de Auditoria</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registro imutável das propriedades modificadas na tabela <code className="font-mono text-foreground font-semibold">{selectedPayloadLog?.entity_type}</code>.
            </DialogDescription>
          </DialogHeader>

          {selectedPayloadLog && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs bg-muted/30 p-2.5 rounded-xl border border-border/60">
                <span className="font-semibold text-foreground">Autor: {selectedPayloadLog.user_name}</span>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {selectedPayloadLog.action}
                </Badge>
              </div>

              <div className="bg-muted/40 p-3 rounded-xl border border-border/60 overflow-x-auto max-h-80">
                <pre className="text-[11px] font-mono text-foreground/90 whitespace-pre-wrap">
                  {JSON.stringify(selectedPayloadLog.payload_snapshot, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
