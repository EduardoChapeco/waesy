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
 Loader2,
} from "lucide-react";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";

function formatRelativeTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "Recentemente";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "Agora mesmo";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Há ${diffMin} ${diffMin === 1 ? "minuto" : "minutos"}`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Há ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return `Ontem às ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  if (diffDays < 7) return `Há ${diffDays} dias`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

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
 const [deviceToRevoke, setDeviceToRevoke] = useState<any | null>(null);

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
 setLoadingDeviceId(deviceId);
 try {
 await revokeUserDevice({ data: { deviceId } });
 setDevices((prev: any[]) => prev.filter((d) => d.id !== deviceId));
 toast.success("Dispositivo desconectado com sucesso.");
 setDeviceToRevoke(null);
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
 {devices.map((device: any) => {
              const isMobile = device.device_type === "mobile";
              const locationText = device.city
                ? device.city.includes(",")
                  ? device.city
                  : `${device.city}, ${device.country_code === "BR" ? "SC" : device.country_code || "BR"}`
                : "São Miguel do Oeste, SC";
              const relativeTime = formatRelativeTime(device.last_seen_at);
              const ipText = device.ip_address && device.ip_address !== "127.0.0.1" ? device.ip_address : "127.0.0.1 (Local)";

              return (
                <div
                  key={device.id}
                  className="p-4 rounded-2xl bg-card border border-border/70 flex flex-col justify-between gap-3 shadow-2xs transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="size-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 mt-0.5 text-foreground/80">
                      {isMobile ? (
                        <Smartphone className="size-4.5" strokeWidth={1.75} />
                      ) : (
                        <Laptop className="size-4.5" strokeWidth={1.75} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-foreground truncate">
                          {device.device_name || (isMobile ? "Dispositivo Móvel" : "Computador")}
                        </p>
                        {device.is_trusted && (
                          <Badge variant="secondary" className="text-[9px] font-medium px-1.5 py-0">
                            Confiável
                          </Badge>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {locationText} • {relativeTime}
                      </p>

                      <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">
                        {ipText}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                    {!device.is_trusted && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={loadingDeviceId === device.id}
                        onClick={() => handleTrustDevice(device.id)}
                        className="h-8 px-2.5 text-xs font-semibold rounded-xl gap-1.5 cursor-pointer shadow-2xs active:scale-98"
                      >
                        <CheckCircle2 className="size-3.5 text-emerald-600" strokeWidth={1.75} />
                        <span>Confiar</span>
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={loadingDeviceId === device.id}
                      onClick={() => setDeviceToRevoke(device)}
                      className="h-8 px-2.5 text-xs font-semibold rounded-xl gap-1 text-destructive hover:bg-destructive/10 cursor-pointer shadow-2xs active:scale-98"
                    >
                      <Trash2 className="size-3.5" strokeWidth={1.75} />
                      <span>Desconectar</span>
                    </Button>
                  </div>
                </div>
              );
            })}
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
                const locationText = log.city
                  ? log.city.includes(",")
                    ? log.city
                    : `${log.city}, ${log.country_code === "BR" ? "SC" : log.country_code || "BR"}`
                  : "São Miguel do Oeste, SC";
                const relativeTime = formatRelativeTime(log.created_at);
                const ipText = log.ip_address && log.ip_address !== "127.0.0.1" ? log.ip_address : "127.0.0.1 (Local)";
                const deviceName = log.metadata?.device_name || log.device_type || "Navegador Web";

                return (
                  <div key={log.id} className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-8 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                        {isSuccess ? (
                          <ShieldCheck className="size-4 text-emerald-600" strokeWidth={1.75} />
                        ) : isFailed ? (
                          <AlertTriangle className="size-4 text-destructive" strokeWidth={1.75} />
                        ) : (
                          <Activity className="size-4 text-muted-foreground" strokeWidth={1.75} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold text-foreground">
                            {log.event_type === "login_success"
                              ? "Login Efetuado"
                              : log.event_type === "login_failed"
                              ? "Tentativa Inválida"
                              : log.event_type === "signup"
                              ? "Nova Conta"
                              : log.event_type === "session_revoked"
                              ? "Sessão Revogada"
                              : log.event_type === "logout"
                              ? "Logout"
                              : log.event_type}
                          </p>

                          {isSuspicious && (
                            <Badge variant="destructive" className="text-[9px] px-1 py-0">
                              Risco {log.risk_score}%
                            </Badge>
                          )}

                          {log.is_datacenter && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0">
                              VPN
                            </Badge>
                          )}
                        </div>

                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {deviceName} • {locationText}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-medium text-foreground/80">{relativeTime}</p>
                      <p className="text-[10px] font-mono text-muted-foreground/60">{ipText}</p>
                    </div>
                  </div>
                );
              })}
 </div>
 </div>
 )}
 </section>

 <Dialog open={Boolean(deviceToRevoke)} onOpenChange={(open) => !open && setDeviceToRevoke(null)}>
 <DialogContent className="sm:max-w-md rounded-2xl">
 <DialogHeader>
 <DialogTitle className="text-base font-bold text-foreground">Desconectar dispositivo?</DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 Esta ação encerrará a sessão em <strong>{deviceToRevoke?.device_name || "Dispositivo"}</strong>. Será necessário fazer login novamente.
 </DialogDescription>
 </DialogHeader>
 <DialogFooter className="gap-2 sm:gap-0">
 <Button variant="ghost" onClick={() => setDeviceToRevoke(null)} className="rounded-xl text-xs">
 Cancelar
 </Button>
 <Button
 variant="destructive"
 onClick={() => deviceToRevoke && handleRevokeDevice(deviceToRevoke.id)}
 disabled={loadingDeviceId === deviceToRevoke?.id}
 className="rounded-xl text-xs font-semibold"
 >
 {loadingDeviceId === deviceToRevoke?.id ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
 Desconectar
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
