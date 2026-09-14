import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getUserSecurityAuditLogs, getUserRegisteredDevices } from "@/services/auth.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
 Activity,
 AlertTriangle,
 Lock,
} from "lucide-react";

export const Route = createFileRoute("/workspace/configuracoes/sessoes")({
 head: () => ({ meta: [{ title: "Sessões & Segurança da Equipe | Workspace Waesy" }] }),
 loader: async () => {
 try {
 const [logs, devices] = await Promise.all([
 getUserSecurityAuditLogs(),
 getUserRegisteredDevices(),
 ]);
 return { logs, devices };
 } catch {
 return { logs: [], devices: [] };
 }
 },
 component: WorkspaceSessionsPage,
});

function WorkspaceSessionsPage() {
 const { logs: initialLogs, devices: initialDevices } = ((Route.useLoaderData?.() as any) || {});
 const [logs, setLogs] = useState(initialLogs || []);
 const [devices, setDevices] = useState(initialDevices || []);
 const [isRefreshing, setIsRefreshing] = useState(false);

 const handleRefresh = async () => {
 setIsRefreshing(true);
 try {
 const [freshLogs, freshDevices] = await Promise.all([
 getUserSecurityAuditLogs(),
 getUserRegisteredDevices(),
 ]);
 setLogs(freshLogs);
 setDevices(freshDevices);
 toast.success("Sessões atualizadas.");
 } catch (e: any) {
 toast.error("Erro ao atualizar: " + (e?.message || "Falha"));
 } finally {
 setIsRefreshing(false);
 }
 };

 return (
 <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
 {/* Header */}
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
 Sessões Ativas
 </h1>
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

 {/* Lista de Eventos Recentes */}
 <section className="space-y-3">
 <h2 className="text-sm font-bold text-foreground">
 Atividades Recentes
 </h2>

 {logs.length === 0 ? (
 <div className="p-8 text-center rounded-2xl border border-dashed border-border/70 bg-muted/20">
 <Shield className="size-8 mx-auto text-muted-foreground mb-2" />
 <p className="text-xs font-semibold text-muted-foreground">Nenhum evento registrado recentemente.</p>
 </div>
 ) : (
 <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
 <div className="divide-y divide-border/60">
 {logs.map((log: any) => (
 <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
 <div className="flex items-start gap-3">
 <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
 log.event_type === "login_success" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"
 }`}>
 {log.event_type === "login_success" ? <ShieldCheck className="size-4" /> : <AlertTriangle className="size-4" />}
 </div>

 <div>
 <div className="flex items-center gap-2">
 <p className="text-xs font-bold text-foreground">
 {log.event_type === "login_success" ? "Login Autorizado" : log.event_type}
 </p>
 {log.is_datacenter && (
 <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-600 border-purple-500/30">
 VPN/VPS
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
 <p>{new Date(log.created_at).toLocaleDateString("pt-BR")}</p>
 <p className="text-[10px] text-muted-foreground/70">{new Date(log.created_at).toLocaleTimeString("pt-BR")}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </section>
 </div>
 );
}
