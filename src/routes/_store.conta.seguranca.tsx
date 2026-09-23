import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
 getUserSecurityAuditLogs,
 getUserRegisteredDevices,
 revokeUserDevice,
 trustUserDevice,
 getUserSession,
} from "@/services/auth.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
 Shield,
 ShieldAlert,
 ShieldCheck,
 Smartphone,
 Laptop,
 Globe,
 MapPin,
 Clock,
 Trash2,
 CheckCircle2,
 AlertTriangle,
 ArrowLeft,
 Lock,
 Radio,
 Activity,
 KeyRound,
 RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/_store/conta/seguranca")({
 head: () => ({ meta: [{ title: "Segurança e Dispositivos | Waesy" }] }),
 loader: async () => {
 try {
 const [session, logs, devices] = await Promise.all([
 getUserSession(),
 getUserSecurityAuditLogs(),
 getUserRegisteredDevices(),
 ]);
 return { session, logs, devices };
 } catch {
 return { session: null, logs: [], devices: [] };
 }
 },
 component: SecurityAndDevicesPage,
});

function SecurityAndDevicesPage() {
 const { session, logs: initialLogs, devices: initialDevices } = ((Route.useLoaderData?.() as any) || {});
 const router = useRouter();

 const [devices, setDevices] = useState(initialDevices || []);
 const [logs, setLogs] = useState(initialLogs || []);
 const [isRefreshing, setIsRefreshing] = useState(false);
 const [loadingDeviceId, setLoadingDeviceId] = useState<string | null>(null);

 const handleRefresh = async () => {
 setIsRefreshing(true);
 try {
 const [freshLogs, freshDevices] = await Promise.all([
 getUserSecurityAuditLogs(),
 getUserRegisteredDevices(),
 ]);
 setLogs(freshLogs);
 setDevices(freshDevices);
 toast.success("Logs e dispositivos atualizados.");
 } catch (e: any) {
 toast.error("Erro ao atualizar dados: " + (e?.message || "Falha de rede"));
 } finally {
 setIsRefreshing(false);
 }
 };

 const handleRevokeDevice = async (deviceId: string) => {
 if (!confirm("Deseja realmente desconectar este dispositivo? O usuário precisará fazer login novamente.")) {
 return;
 }
 setLoadingDeviceId(deviceId);
 try {
 await revokeUserDevice({ data: { deviceId } });
 setDevices((prev: any[]) => prev.filter((d) => d.id !== deviceId));
 toast.success("Dispositivo desconectado com sucesso.");
 } catch (e: any) {
 toast.error("Erro ao revogar: " + (e?.message || "Falha"));
 } finally {
 setLoadingDeviceId(null);
 }
 };

 const handleTrustDevice = async (deviceId: string) => {
 setLoadingDeviceId(deviceId);
 try {
 await trustUserDevice({ data: { deviceId } });
 setDevices((prev: any[]) =>
 prev.map((d) => (d.id === deviceId ? { ...d, is_trusted: true } : d))
 );
 toast.success("Dispositivo marcado como confiável.");
 } catch (e: any) {
 toast.error("Erro ao marcar: " + (e?.message || "Falha"));
 } finally {
 setLoadingDeviceId(null);
 }
 };

 return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0">
      {/* ── 1. Clean Minimalist Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Segurança
          </h1>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="rounded-xl text-xs sm:text-sm font-semibold h-10 sm:h-11 px-3.5 sm:px-4 gap-2 cursor-pointer border-border/70 bg-card hover:bg-muted/50 shadow-2xs active:scale-98"
        >
          <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Atualizar</span>
        </Button>
      </div>

 {/* ── 1. Seção de Dispositivos Conectados ── */}
 <section className="space-y-3">
 <div className="flex items-center justify-between">
 <h2 className="text-sm font-bold text-foreground">
 Dispositivos Conectados ({devices.length})
 </h2>
 </div>

 {devices.length === 0 ? (
 <div className="p-8 text-center rounded-2xl border border-dashed border-border/70 bg-muted/20">
 <Shield className="size-8 mx-auto text-muted-foreground mb-2" />
 <p className="text-xs font-semibold text-muted-foreground">Nenhum dispositivo registrado ainda.</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {devices.map((device: any) => (
 <div
 key={device.id}
 className="p-4 rounded-2xl bg-card border border-border/70 flex flex-col justify-between gap-3 relative overflow-hidden"
 >
  <div className="flex items-start gap-3">
    {device.device_type === "mobile" ? (
      <Smartphone className="size-5 text-muted-foreground shrink-0 mt-0.5" strokeWidth={1.75} />
    ) : (
      <Laptop className="size-5 text-muted-foreground shrink-0 mt-0.5" strokeWidth={1.75} />
    )}

    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <p className="text-xs font-bold text-foreground truncate">
          {device.device_name || "Navegador Web"}
        </p>
        {device.is_trusted && (
          <Badge variant="success" className="text-[10px]">
            Confiável
          </Badge>
        )}
      </div>

 <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground mt-1">
 {device.city && (
 <span className="flex items-center gap-1">
 <MapPin className="size-3" />
 {device.city}, {device.country_code}
 </span>
 )}
 {device.ip_address && (
 <span className="flex items-center gap-1">
 <Globe className="size-3" />
 {device.ip_address}
 </span>
 )}
 <span className="flex items-center gap-1">
 <Clock className="size-3" />
 Visto em: {new Date(device.last_seen_at).toLocaleDateString("pt-BR")}
 </span>
 </div>
 </div>
 </div>

  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
    {!device.is_trusted && (
      <Button
        variant="secondary"
        size="sm"
        disabled={loadingDeviceId === device.id}
        onClick={() => handleTrustDevice(device.id)}
        className="h-9 px-3 text-xs font-semibold rounded-xl gap-1.5 shadow-2xs cursor-pointer active:scale-98"
      >
        <CheckCircle2 className="size-3.5" strokeWidth={1.75} />
        Confiar
      </Button>
    )}

    <Button
      variant="ghost"
      size="sm"
      disabled={loadingDeviceId === device.id}
      onClick={() => handleRevokeDevice(device.id)}
      className="h-9 px-3 text-xs font-semibold rounded-xl gap-1.5 text-destructive hover:bg-destructive/10 cursor-pointer shadow-2xs active:scale-98"
    >
      <Trash2 className="size-3.5" strokeWidth={1.75} />
      Desconectar
    </Button>
  </div>
 </div>
 ))}
 </div>
 )}
 </section>

 {/* ── 2. Linha do Tempo / Histórico de Logins ── */}
 <section className="space-y-3">
 <div className="flex items-center justify-between">
 <h2 className="text-sm font-bold text-foreground">
 Histórico de Acessos
 </h2>
 </div>

 {logs.length === 0 ? (
 <div className="p-8 text-center rounded-2xl border border-dashed border-border/70 bg-muted/20">
 <Clock className="size-8 mx-auto text-muted-foreground mb-2" />
 <p className="text-xs font-semibold text-muted-foreground">Nenhum evento registrado recentemente.</p>
 </div>
 ) : (
 <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
 <div className="divide-y divide-border/60">
 {logs.map((log: any) => {
 const isSuccess = log.event_type === "login_success" || log.event_type === "signup";
 const isFailed = log.event_type === "login_failed";
 const isSuspicious = log.risk_score >= 40 || log.is_datacenter;

 return (
 <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
    <div className="flex items-start gap-3 min-w-0">
      {isSuccess ? (
        <ShieldCheck className="size-5 text-muted-foreground shrink-0 mt-0.5" strokeWidth={1.75} />
      ) : isFailed ? (
        <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" strokeWidth={1.75} />
      ) : (
        <Activity className="size-5 text-muted-foreground shrink-0 mt-0.5" strokeWidth={1.75} />
      )}

      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-bold text-foreground">
            {log.event_type === "login_success"
              ? "Login Efetuado"
              : log.event_type === "login_failed"
              ? "Tentativa com Senha Incorreta"
              : log.event_type === "signup"
              ? "Nova Conta Criada"
              : log.event_type === "session_revoked"
              ? "Sessão Revogada"
              : log.event_type}
          </p>

          {isSuspicious && (
            <Badge variant="destructive" className="text-[10px]">
              Risco Alto ({log.risk_score}%)
            </Badge>
          )}

          {log.is_datacenter && (
            <Badge variant="secondary" className="text-[10px]">
              VPN / VPS
            </Badge>
          )}
        </div>

 <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground mt-1">
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

 <div className="text-[11px] text-muted-foreground text-left sm:text-right shrink-0">
 <p>{new Date(log.created_at).toLocaleDateString("pt-BR")}</p>
 <p className="font-mono text-[10px] text-muted-foreground/70">
 {new Date(log.created_at).toLocaleTimeString("pt-BR")}
 </p>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}
 </section>
 </div>
 );
}
