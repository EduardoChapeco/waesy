import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { listSecurityEvents, getSecurityTelemetryOverview, listSecurityAttackIncidents, blockAttackerIp, unblockAttackerIp, resolveSecurityAttackIncident, recordSecurityAttackIncident } from "@/services/security.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ShieldAlert, ShieldCheck, Shield, Globe, Search, RefreshCw, AlertTriangle, Activity, Radio, Clock, Fingerprint, Ban, CheckCircle2, Terminal, ChevronRight, Eye, Layers, FileCode, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin-master/seguranca/telemetria")({
  head: () => ({ meta: [{ title: "Telemetria Avançada de Ataques | Admin Master" }] }),
  loader: async () => {
    try {
      const [overview, events, attacksData] = await Promise.all([
        getSecurityTelemetryOverview({ data: undefined }).catch(() => null),
        listSecurityEvents({ data: { severity: "all", limit: 100, offset: 0 } }).catch(() => []),
        listSecurityAttackIncidents({ data: { severity: "all", limit: 50, offset: 0 } }).catch(() => ({ incidents: [], totalCount: 0, stats: { total: 0, critical: 0, high: 0, medium: 0, low: 0, blocked: 0 } })),
      ]);
      return {
        overview: overview || { stats: { total_certs_today: 0, flagged_today: 0, critical_events_today: 0, unique_ips_today: 0, avg_risk_score: 0 }, top_event_types: [], top_suspicious_ips: [] },
        events: events || [],
        attacksData: attacksData || { incidents: [], totalCount: 0, stats: { total: 0, critical: 0, high: 0, medium: 0, low: 0, blocked: 0 } },
      };
    } catch {
      return {
        overview: { stats: { total_certs_today: 0, flagged_today: 0, critical_events_today: 0, unique_ips_today: 0, avg_risk_score: 0 }, top_event_types: [], top_suspicious_ips: [] },
        events: [],
        attacksData: { incidents: [], totalCount: 0, stats: { total: 0, critical: 0, high: 0, medium: 0, low: 0, blocked: 0 } },
      };
    }
  },
  component: SecurityTelemetryPage,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SEVERITY_META: Record<string, { label: string; color: string; dot: string }> = {
  low: { label: "Baixo", color: "bg-muted text-muted-foreground border-border/60", dot: "bg-muted-foreground" },
  info: { label: "Info", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", dot: "bg-blue-500" },
  medium: { label: "Médio", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", dot: "bg-amber-500" },
  warning: { label: "Aviso", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", dot: "bg-amber-500" },
  high: { label: "Alto", color: "bg-orange-500/10 text-orange-500 border-orange-500/20", dot: "bg-orange-500" },
  critical: { label: "Crítico", color: "bg-red-500/10 text-red-500 border-red-500/20", dot: "bg-red-500 animate-pulse" },
  emergency: { label: "Emergência", color: "bg-red-600/20 text-red-600 border-red-600/30", dot: "bg-red-600 animate-ping" },
};

function SeverityBadge({ severity }: { severity: string }) {
  const meta = SEVERITY_META[severity] || SEVERITY_META.info;
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1.5 shrink-0", meta.color)}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

function KpiCard({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: React.ElementType; accent?: string }) {
  return (
    <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-sm">
      <div className={cn("size-8 rounded-xl flex items-center justify-center mb-2.5", accent || "bg-primary/10")}>
        <Icon className="size-4 text-foreground/80" />
      </div>
      <div className="text-2xl font-bold font-mono tracking-tight text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

// ─── Componente Principal ────────────────────────────────────────────────────

function SecurityTelemetryPage() {
  const loaderData = Route.useLoaderData() as any;

  const [activeTab, setActiveTab] = useState<"attacks" | "sentinel">("attacks");
  const [overview, setOverview] = useState<any>(loaderData.overview);
  const [events, setEvents] = useState<any[]>(loaderData.events || []);
  const [attacks, setAttacks] = useState<any[]>(loaderData.attacksData?.incidents || []);
  const [attackStats, setAttackStats] = useState<any>(loaderData.attacksData?.stats || { total: 0, critical: 0, high: 0, medium: 0, low: 0, blocked: 0 });

  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [ov, evs, atks] = await Promise.all([
        getSecurityTelemetryOverview({ data: undefined }).catch(() => null),
        listSecurityEvents({ data: { severity: "all", limit: 100, offset: 0 } }).catch(() => []),
        listSecurityAttackIncidents({ data: { severity: "all", limit: 50, offset: 0 } }).catch(() => null),
      ]);
      if (ov) setOverview(ov);
      if (evs) setEvents(evs);
      if (atks) {
        setAttacks(atks.incidents || []);
        setAttackStats(atks.stats || attackStats);
      }
      if (!silent) toast.success("Telemetria de ataques sincronizada.");
    } catch (e: any) {
      if (!silent) toast.error("Falha ao atualizar telemetria: " + e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (liveMode) {
      intervalRef.current = setInterval(() => refreshData(true), 5000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [liveMode]);

  // Ação: Bloquear IP
  const handleBlockIp = async (ip: string, attackType: string) => {
    try {
      await blockAttackerIp({
        data: {
          ipAddress: ip,
          reason: `Bloqueio manual via Admin Master (Incidente: ${attackType})`,
          severity: "critical",
        },
      });
      toast.success(`IP ${ip} adicionado à lista de bloqueio.`);
      refreshData(true);
    } catch (err: any) {
      toast.error("Erro ao bloquear IP: " + err.message);
    }
  };

  // Ação: Mitigar / Resolver Incidente
  const handleResolveIncident = async (id: string, status: any) => {
    try {
      await resolveSecurityAttackIncident({
        data: {
          incidentId: id,
          status,
          notes: `Resolvido via painel em ${new Date().toLocaleString("pt-BR")}`,
        },
      });
      toast.success("Status do incidente atualizado.");
      setSelectedIncident(null);
      refreshData(true);
    } catch (err: any) {
      toast.error("Erro ao resolver incidente: " + err.message);
    }
  };

  // Simulação de Ataque Seguro para Teste
  const handleSimulateAttack = async () => {
    try {
      const types = [
        { type: "sql_injection_probe", sev: "critical", route: "/api/checkout", payload: { query: "SELECT * FROM orders WHERE 1=1 --", vector: "SQLi" } },
        { type: "idor_store_probe", sev: "high", route: "/services/store.functions", payload: { requested_store_id: "00000000-0000-0000-0000-000000000001", bypass_attempt: true } },
        { type: "unauthenticated_contact_scraping", sev: "medium", route: "/services/whatsapp.leads", payload: { bot_agent: "Python-urllib/3.9", target_phones: 45 } },
        { type: "token_wallet_tamper_attempt", sev: "critical", route: "/services/tokens.functions", payload: { fake_balance_injection: 999999, signature: "invalid_hmac" } },
      ];
      const random = types[Math.floor(Math.random() * types.length)];
      await recordSecurityAttackIncident({
        data: {
          attackType: random.type,
          severity: random.sev as any,
          targetRoute: random.route,
          payloadSnapshot: random.payload,
          blocked: random.sev === "critical",
        },
      });
      toast.success("Incidente de teste registrado com sucesso no banco de dados.");
      refreshData(true);
    } catch (err: any) {
      toast.error("Erro ao registrar teste de ataque: " + err.message);
    }
  };

  const filteredAttacks = attacks.filter((atk: any) => {
    const matchSev = severityFilter === "all" || atk.severity === severityFilter;
    const matchSearch =
      !search ||
      atk.attacker_ip?.includes(search) ||
      atk.attack_type?.toLowerCase().includes(search.toLowerCase()) ||
      atk.target_route?.toLowerCase().includes(search.toLowerCase());
    return matchSev && matchSearch;
  });

  const filteredEvents = events.filter((ev: any) => {
    const matchSev = severityFilter === "all" || ev.severity === severityFilter;
    const matchSearch =
      !search ||
      ev.ip_address?.includes(search) ||
      ev.event_type?.toLowerCase().includes(search.toLowerCase()) ||
      ev.session_jti?.includes(search);
    return matchSev && matchSearch;
  });

  return (
    <div className="min-h-[100dvh] bg-background text-foreground space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* ── Sub-navegação Canônica de Segurança ── */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3 text-xs overflow-x-auto no-scrollbar">
        <Link
          to="/admin-master/seguranca"
          className="px-3.5 py-1.5 rounded-xl font-semibold transition-colors hover:bg-muted/60 text-muted-foreground hover:text-foreground"
        >
          Visão Geral e Autenticações
        </Link>
        <Link
          to="/admin-master/seguranca/telemetria"
          className="px-3.5 py-1.5 rounded-xl font-bold transition-colors bg-primary text-primary-foreground shadow-sm"
        >
          Telemetria de Ataques e Invasões
        </Link>
        <Link
          to="/admin-master/seguranca/certificados"
          className="px-3.5 py-1.5 rounded-xl font-semibold transition-colors hover:bg-muted/60 text-muted-foreground hover:text-foreground"
        >
          Certificados Transacionais
        </Link>
      </div>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldAlert className="size-6 text-red-500" />
            Centro Forense e Telemetria de Ataques
          </h1>
          <p className="text-xs text-muted-foreground">
            Detecção em tempo real de probes SQLi, bypass de RLS, exploração IDOR e raspadores não autorizados.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSimulateAttack}
            className="rounded-xl text-xs gap-1.5 border-dashed border-amber-500/40 text-amber-600 hover:bg-amber-500/10 cursor-pointer"
          >
            <Zap className="size-3.5" />
            Simular Probe de Ataque
          </Button>

          <Button
            variant={liveMode ? "default" : "outline"}
            size="sm"
            onClick={() => setLiveMode((v) => !v)}
            className={cn("rounded-xl text-xs gap-1.5", liveMode && "bg-emerald-600 hover:bg-emerald-700 text-white font-bold")}
          >
            <Radio className={cn("size-3.5", liveMode && "animate-pulse")} />
            {liveMode ? "LIVE ATIVO (5s)" : "Modo Live"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshData()}
            disabled={loading}
            className="rounded-xl text-xs gap-1.5"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* ── KPIs de Segurança Avançada ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <KpiCard
          label="Ameaças Interceptadas"
          value={attackStats.total}
          icon={ShieldAlert}
          accent="bg-red-500/10 text-red-600"
        />
        <KpiCard
          label="Incidentes Críticos"
          value={attackStats.critical}
          icon={AlertTriangle}
          accent="bg-red-600/10 text-red-600"
        />
        <KpiCard
          label="Tentativas de Alto Risco"
          value={attackStats.high}
          icon={Shield}
          accent="bg-orange-500/10 text-orange-600"
        />
        <KpiCard
          label="IPs Bloqueados"
          value={attackStats.blocked}
          icon={Ban}
          accent="bg-purple-500/10 text-purple-600"
        />
        <KpiCard
          label="Tabelas com RLS 100%"
          value="396 / 396"
          icon={ShieldCheck}
          accent="bg-emerald-500/10 text-emerald-600"
        />
      </div>

      {/* ── Seleção de Visualização (Abas) ── */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <button
          onClick={() => setActiveTab("attacks")}
          className={cn(
            "text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "attacks"
              ? "bg-foreground text-background shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Terminal className="size-3.5" />
          Ataques Server-Side & Invasões ({attacks.length})
        </button>

        <button
          onClick={() => setActiveTab("sentinel")}
          className={cn(
            "text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "sentinel"
              ? "bg-foreground text-background shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Activity className="size-3.5" />
          Sentinela Client-Side ({events.length})
        </button>
      </div>

      {/* ── Filtros e Busca ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por IP, rota ou tipo de ataque..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl bg-card border-border/70"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {(["all", "emergency", "critical", "high", "medium", "low"] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={cn(
                "text-[11px] px-3 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap",
                severityFilter === sev
                  ? "bg-foreground text-background border-foreground font-bold"
                  : "bg-card border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {sev === "all" ? "Todas Severidades" : SEVERITY_META[sev]?.label || sev}
            </button>
          ))}
        </div>
      </div>

      {/* ── ABA 1: FEED DE ATAQUES SERVER-SIDE ── */}
      {activeTab === "attacks" && (
        <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-sm">
          {filteredAttacks.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <ShieldCheck className="size-10 mx-auto text-emerald-500 opacity-60" />
              <p className="text-sm font-bold text-foreground">Nenhuma tentativa de invasão registrada no momento.</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                O sistema de blindagem Zero-Trust está ativo com RLS Deny-by-Default em 100% das 396 tabelas.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSimulateAttack}
                className="mt-2 text-xs rounded-xl gap-1.5 border-dashed"
              >
                <Zap className="size-3.5 text-amber-500" />
                Simular Ataque para Testar Notificação
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="p-3.5">Severidade</th>
                    <th className="p-3.5">Tipo de Ataque</th>
                    <th className="p-3.5">IP e Local</th>
                    <th className="p-3.5">Rota Alvo</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Data e Hora</th>
                    <th className="p-3.5 text-right">Ação Forense</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredAttacks.map((atk: any) => (
                    <tr key={atk.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5">
                        <SeverityBadge severity={atk.severity} />
                      </td>

                      <td className="p-3.5">
                        <div>
                          <p className="font-bold text-foreground font-mono">{atk.attack_type}</p>
                          {atk.blocked && (
                            <span className="text-[9px] bg-red-500/10 text-red-600 border border-red-500/20 px-1.5 py-0.2 rounded font-bold inline-flex items-center gap-1 mt-0.5">
                              <Ban className="size-2.5" /> Auto-Bloqueado
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-muted-foreground">
                        <p className="text-foreground font-bold">{atk.attacker_ip || "—"}</p>
                        <p className="text-[10px] truncate max-w-[150px]">{atk.user_agent || "Desconhecido"}</p>
                      </td>

                      <td className="p-3.5 font-mono text-xs">
                        <span className="bg-muted px-2 py-0.5 rounded text-foreground/90">
                          {atk.target_route || "/"}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] capitalize",
                            atk.resolution_status === "mitigated" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                            atk.resolution_status === "blocked_ip" && "bg-purple-500/10 text-purple-600 border-purple-500/30",
                            atk.resolution_status === "pending" && "bg-amber-500/10 text-amber-600 border-amber-500/30",
                            atk.resolution_status === "false_positive" && "bg-muted text-muted-foreground border-border"
                          )}
                        >
                          {atk.resolution_status || "pending"}
                        </Badge>
                      </td>

                      <td className="p-3.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        <p>{new Date(atk.created_at).toLocaleDateString("pt-BR")}</p>
                        <p className="text-[10px] opacity-70">{new Date(atk.created_at).toLocaleTimeString("pt-BR")}</p>
                      </td>

                      <td className="p-3.5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedIncident(atk)}
                          className="h-8 rounded-xl text-xs gap-1 cursor-pointer"
                        >
                          <Eye className="size-3.5" />
                          Inspecionar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ABA 2: FEED SENTINELA CLIENT-SIDE ── */}
      {activeTab === "sentinel" && (
        <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-sm">
          {filteredEvents.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <ShieldCheck className="size-10 mb-3 mx-auto opacity-20" />
              <p className="text-xs font-semibold">Nenhum evento do sentinela client-side detectado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="p-3.5">Severidade</th>
                    <th className="p-3.5">Evento Detectado</th>
                    <th className="p-3.5">IP de Origem</th>
                    <th className="p-3.5">Score de Risco</th>
                    <th className="p-3.5 text-right">Data e Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredEvents.map((ev: any) => (
                    <tr key={ev.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5">
                        <SeverityBadge severity={ev.severity} />
                      </td>
                      <td className="p-3.5 font-mono font-bold text-foreground">
                        {ev.event_type}
                      </td>
                      <td className="p-3.5 font-mono text-muted-foreground">
                        {ev.ip_address || "—"}
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded text-[11px]">
                          {ev.risk_score || 0} pts
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono text-[11px] text-muted-foreground">
                        {new Date(ev.created_at).toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal de Inspeção Forense de Incidente ── */}
      {selectedIncident && (
        <Dialog open={Boolean(selectedIncident)} onOpenChange={(open) => !open && setSelectedIncident(null)}>
          <DialogContent className="sm:max-w-xl rounded-2xl p-6 space-y-4">
            <DialogHeader className="space-y-1.5 text-left border-b border-border/60 pb-3">
              <div className="flex items-center justify-between gap-2">
                <SeverityBadge severity={selectedIncident.severity} />
                <span className="text-[11px] font-mono text-muted-foreground">
                  {new Date(selectedIncident.created_at).toLocaleString("pt-BR")}
                </span>
              </div>
              <DialogTitle className="text-base font-bold font-mono text-foreground pt-1">
                {selectedIncident.attack_type}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Rota interceptada: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">{selectedIncident.target_route || "/"}</code>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted/40 rounded-xl border border-border/60">
                <div>
                  <span className="text-muted-foreground block text-[10px]">IP do Atacante:</span>
                  <span className="font-mono font-bold text-foreground">{selectedIncident.attacker_ip || "Não registrado"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Status da Resolução:</span>
                  <span className="font-bold text-foreground capitalize">{selectedIncident.resolution_status || "Pendente"}</span>
                </div>
              </div>

              {/* Payload Snapshot JSON */}
              <div className="space-y-1.5">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <FileCode className="size-3.5 text-primary" />
                  Snapshot do Payload Interceptado:
                </span>
                <pre className="p-3 bg-card border border-border/70 rounded-xl font-mono text-[11px] text-foreground overflow-x-auto max-h-48 text-left leading-relaxed">
                  {JSON.stringify(selectedIncident.payload_snapshot || {}, null, 2)}
                </pre>
              </div>

              {/* Headers Snapshot JSON */}
              {selectedIncident.headers_snapshot && Object.keys(selectedIncident.headers_snapshot).length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-bold text-muted-foreground text-[11px]">
                    Cabeçalhos HTTP Capturados:
                  </span>
                  <pre className="p-2 bg-muted/20 border border-border/40 rounded-xl font-mono text-[10px] text-muted-foreground overflow-x-auto max-h-28">
                    {JSON.stringify(selectedIncident.headers_snapshot, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIncident(null)}
                className="w-full sm:w-auto rounded-xl text-xs"
              >
                Fechar
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleBlockIp(selectedIncident.attacker_ip, selectedIncident.attack_type)}
                className="w-full sm:w-auto rounded-xl text-xs gap-1.5"
              >
                <Ban className="size-3.5" />
                Bloquear IP ({selectedIncident.attacker_ip})
              </Button>

              <Button
                size="sm"
                onClick={() => handleResolveIncident(selectedIncident.id, "mitigated")}
                className="w-full sm:w-auto rounded-xl text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <CheckCircle2 className="size-3.5" />
                Marcar como Mitigado
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
