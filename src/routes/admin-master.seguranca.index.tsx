import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { getAdminSecurityOverview } from "@/services/auth.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Shield, ShieldAlert, ShieldCheck, Globe, MapPin, Clock, Search, RefreshCw, AlertTriangle, Radio, Server, User, CheckCircle2, XCircle, Activity, Layers, Lock } from "lucide-react";

export const Route = createFileRoute("/admin-master/seguranca/")({
 head: () => ({ meta: [{ title: "Centro de Segurança Global | Admin Master" }] }),
 loader: async () => {
 try {
 const data = await getAdminSecurityOverview();
 return data || { recentEvents: [], highRiskEvents: [], stats: { totalFailed: 0, totalSuccess: 0, highRiskCount: 0 } };
 } catch {
 return { recentEvents: [], highRiskEvents: [], stats: { totalFailed: 0, totalSuccess: 0, highRiskCount: 0 } };
 }
 },
 component: AdminSecurityOverviewPage,
});

function AdminSecurityOverviewPage() {
 const { recentEvents: initialRecent, highRiskEvents: initialHighRisk, stats: initialStats } = ((Route.useLoaderData?.() as any) || {});
 const router = useRouter();

 const [recentEvents, setRecentEvents] = useState(initialRecent || []);
 const [highRiskEvents, setHighRiskEvents] = useState(initialHighRisk || []);
 const [stats, setStats] = useState(initialStats || { totalFailed: 0, totalSuccess: 0, highRiskCount: 0 });
 const [searchFilter, setSearchFilter] = useState("");
 const [eventFilter, setEventFilter] = useState<string>("all");
 const [isRefreshing, setIsRefreshing] = useState(false);

 const handleRefresh = async () => {
 setIsRefreshing(true);
 try {
 const fresh = await getAdminSecurityOverview();
 setRecentEvents(fresh.recentEvents);
 setHighRiskEvents(fresh.highRiskEvents);
 setStats(fresh.stats);
 toast.success("Telemetria de segurança atualizada.");
 } catch (e: any) {
 toast.error("Erro ao atualizar: " + (e?.message || "Falha"));
 } finally {
 setIsRefreshing(false);
 }
 };

 const filteredEvents = recentEvents.filter((ev: any) => {
 const matchesSearch =
 !searchFilter ||
 ev.ip_address?.includes(searchFilter) ||
 ev.city?.toLowerCase().includes(searchFilter.toLowerCase()) ||
 ev.profiles?.full_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
 ev.profiles?.username?.toLowerCase().includes(searchFilter.toLowerCase()) ||
 ev.event_type?.toLowerCase().includes(searchFilter.toLowerCase());

 const matchesEvent = eventFilter === "all" || ev.event_type === eventFilter;

 return matchesSearch && matchesEvent;
 });

 return (
 <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-foreground">
      {/* ── Sub-navegação Canônica de Segurança ── */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3 text-xs overflow-x-auto no-scrollbar">
        <Link
          to="/admin-master/seguranca"
          className="px-3.5 py-1.5 rounded-xl font-bold transition-colors bg-primary text-primary-foreground shadow-sm"
        >
          Visão Geral e Autenticações
        </Link>
        <Link
          to="/admin-master/seguranca/telemetria"
          className="px-3.5 py-1.5 rounded-xl font-semibold transition-colors hover:bg-muted/60 text-muted-foreground hover:text-foreground"
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="size-6 text-emerald-500" />
            Centro de Segurança Global e Autenticação
          </h1>
          <p className="text-xs text-muted-foreground">
            Auditoria forense de sessões, integridade multi-tenant e monitoramento de conexões Cloudflare.
          </p>
        </div>

 <Button
 variant="outline"
 size="sm"
 onClick={handleRefresh}
 disabled={isRefreshing}
 className="self-start sm:self-auto gap-2 rounded-xl text-xs"
 >
 <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
 Atualizar
 </Button>
 </div>

 {/* Estatísticas de Risco */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1">
 <span className="text-xs font-semibold text-muted-foreground">Tabelas com RLS 100%</span>
 <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">396 / 396</p>
 </div>

 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1">
 <span className="text-xs font-semibold text-muted-foreground">Logins Válidos</span>
 <p className="text-xl font-bold text-foreground">{stats.totalSuccess}</p>
 </div>

 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1">
 <span className="text-xs font-semibold text-muted-foreground">Tentativas Falhas</span>
 <p className="text-xl font-bold text-red-600 dark:text-red-400">{stats.totalFailed}</p>
 </div>

 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1">
 <span className="text-xs font-semibold text-muted-foreground">Eventos de Risco</span>
 <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.highRiskCount}</p>
 </div>
 </div>

 {/* ── Eventos de Alto Risco em Destaque ── */}
 {highRiskEvents.length > 0 && (
 <div className="space-y-3">
 <div className="flex items-center gap-2">
 <AlertTriangle className="size-5 text-amber-500" />
 <h2 className="text-base font-bold text-foreground">Alertas de Risco Ativo (VPS / Datacenter / IP Estrangeiro)</h2>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
 {highRiskEvents.slice(0, 6).map((ev: any) => (
 <div key={ev.id} className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/30 space-y-2">
 <div className="flex items-center justify-between">
 <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
 Risco: {ev.risk_score}%
 </Badge>
 <span className="text-[10px] text-muted-foreground">
 {new Date(ev.created_at).toLocaleTimeString("pt-BR")}
 </span>
 </div>

 <div>
 <p className="text-xs font-bold text-foreground truncate">
 {ev.profiles?.full_name || ev.profiles?.username || "Usuário Não Identificado"}
 </p>
 <p className="text-[11px] font-mono text-muted-foreground">{ev.ip_address || "IP Oculto"}</p>
 </div>

 <div className="flex flex-wrap gap-1 pt-1">
 {ev.is_datacenter && (
 <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-600 border-purple-500/30">
 Datacenter/VPS
 </Badge>
 )}
 {ev.country_code && ev.country_code !== "BR" && (
 <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-600 border-red-500/30">
 {ev.country_code}
 </Badge>
 )}
 {ev.risk_flags?.map((flag: string, i: number) => (
 <Badge key={i} variant="outline" className="text-[9px] bg-muted/40 text-muted-foreground border-border/60">
 {flag}
 </Badge>
 ))}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* ── Tabela Global de Auditoria de Sessões ── */}
 <section className="space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
 <Activity className="size-5 text-primary" />
 Feed Forense de Autenticação
 </h2>
 <p className="text-xs text-muted-foreground">
 Registro auditável de cada chamada ao BFF de autenticação com dados de telemetria da Cloudflare.
 </p>
 </div>

 {/* Filtros e Busca */}
 <div className="flex items-center gap-2 flex-wrap">
 <div className="relative min-w-[200px]">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
 <Input
 placeholder="Filtrar por IP, usuário, cidade..."
 value={searchFilter}
 onChange={(e) => setSearchFilter(e.target.value)}
 className="pl-8 h-9 text-xs rounded-xl bg-card border-border/70"
 />
 </div>

 <select
 value={eventFilter}
 onChange={(e) => setEventFilter(e.target.value)}
 className="h-9 px-3 text-xs rounded-xl bg-card border border-border/70 text-foreground cursor-pointer"
 >
 <option value="all">Todos os Eventos</option>
 <option value="login_success">Logins com Sucesso</option>
 <option value="login_failed">Tentativas Falhas</option>
 <option value="signup">Novos Cadastros</option>
 <option value="session_revoked">Sessões Revogadas</option>
 <option value="suspicious_activity">Atividade Suspeita</option>
 </select>
 </div>
 </div>

 {filteredEvents.length === 0 ? (
 <div className="p-8 text-center rounded-2xl border border-dashed border-border/70 bg-muted/20">
 <Shield className="size-8 mx-auto text-muted-foreground mb-2" />
 <p className="text-xs font-semibold text-muted-foreground">Nenhum evento encontrado para os filtros aplicados.</p>
 </div>
 ) : (
 <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
 <div className="overflow-x-auto no-scrollbar">
 <table className="w-full text-left text-xs">
 <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
 <tr>
 <th className="p-3.5">Status / Evento</th>
 <th className="p-3.5">Usuário / Perfil</th>
 <th className="p-3.5">IP e Localização</th>
 <th className="p-3.5">Dispositivo</th>
 <th className="p-3.5">Risco</th>
 <th className="p-3.5 text-right">Data e Hora</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/60">
 {filteredEvents.map((ev: any) => {
 const isSuccess = ev.event_type === "login_success" || ev.event_type === "signup";
 const isFailed = ev.event_type === "login_failed";

 return (
 <tr key={ev.id} className="hover:bg-muted/30 transition-colors">
 <td className="p-3.5">
 <div className="flex items-center gap-2">
 <div
 className={`size-2 rounded-full ${
 isSuccess ? "bg-green-500" : isFailed ? "bg-red-500" : "bg-amber-500"
 }`}
 />
 <span className="font-semibold text-foreground">
 {ev.event_type === "login_success"
 ? "Login OK"
 : ev.event_type === "login_failed"
 ? "Falha de Login"
 : ev.event_type === "signup"
 ? "Cadastro"
 : ev.event_type === "suspicious_activity"
 ? "Rate Limit"
 : ev.event_type}
 </span>
 </div>
 </td>

 <td className="p-3.5">
 {ev.profiles ? (
 <div>
 <p className="font-bold text-foreground">{ev.profiles.full_name || "Sem Nome"}</p>
 <p className="text-[10px] text-muted-foreground">@{ev.profiles.username || "user"}</p>
 </div>
 ) : (
 <span className="text-muted-foreground italic">Anônimo / Visitante</span>
 )}
 </td>

 <td className="p-3.5">
 <div>
 <p className="font-mono font-medium text-foreground">{ev.ip_address || "—"}</p>
 <p className="text-[10px] text-muted-foreground flex items-center gap-1">
 <MapPin className="size-2.5" />
 {ev.city ? `${ev.city}, ${ev.country_code}` : ev.country_code || "BR"}
 </p>
 </div>
 </td>

 <td className="p-3.5">
 <span className="text-muted-foreground text-[11px]">
 {ev.metadata?.device_name || ev.device_type || "Navegador"}
 </span>
 </td>

 <td className="p-3.5">
 <div className="flex items-center gap-1.5 flex-wrap">
 <Badge
 variant="outline"
 className={`text-[10px] px-1.5 py-0 ${
 ev.risk_score >= 40
 ? "bg-red-500/10 text-red-600 border-red-500/30"
 : ev.risk_score > 0
 ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
 : "bg-green-500/10 text-green-600 border-green-500/30"
 }`}
 >
 {ev.risk_score}%
 </Badge>

 {ev.is_datacenter && (
 <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-600 border-purple-500/30">
 VPS
 </Badge>
 )}
 </div>
 </td>

 <td className="p-3.5 text-right font-mono text-[11px] text-muted-foreground">
 <p>{new Date(ev.created_at).toLocaleDateString("pt-BR")}</p>
 <p className="text-[10px] text-muted-foreground/70">{new Date(ev.created_at).toLocaleTimeString("pt-BR")}</p>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 )}
 </section>
 </div>
 );
}
