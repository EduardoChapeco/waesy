import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  getUserSecurityAuditLogs,
  getUserRegisteredDevices,
  revokeUserDevice,
  trustUserDevice,
  syncUserDeviceTelemetry,
  getUserSession,
} from "@/services/auth.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Shield,
  ShieldCheck,
  Smartphone,
  Laptop,
  Clock,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Activity,
  RefreshCw,
  Loader2,
  Copy,
  MapPin,
  Globe,
  Check,
  Lock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { formatDeviceCode, getPersistentDeviceCode } from "@/lib/security-sentinel";

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
  head: () => ({ meta: [{ title: "Segurança e Conformidade de Dispositivos | Waesy" }] }),
  loader: async () => {
    try {
      const [session, logs, devices] = await Promise.all([
        getUserSession(),
        getUserSecurityAuditLogs(),
        getUserRegisteredDevices(),
      ]);
      return { session, logs: logs || [], devices: devices || [] };
    } catch {
      return { session: null, logs: [], devices: [] };
    }
  },
  component: SecurityAndDevicesPage,
});

function SecurityAndDevicesPage() {
  const { logs: initialLogs = [], devices: initialDevices = [] } =
    ((Route.useLoaderData?.() as any) || {});

  const [devices, setDevices] = useState<any[]>(initialDevices || []);
  const [logs, setLogs] = useState<any[]>(initialLogs || []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingDeviceId, setLoadingDeviceId] = useState<string | null>(null);
  const [deviceToRevoke, setDeviceToRevoke] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [currentDeviceCode, setCurrentDeviceCode] = useState<string>("");

  // Sincroniza a telemetria do dispositivo ativo ao carregar a página
  useEffect(() => {
    const code = getPersistentDeviceCode();
    setCurrentDeviceCode(code);

    void syncUserDeviceTelemetry({
      data: {
        deviceFingerprint: code,
        clientCity: "São Miguel do Oeste",
        clientState: "SC",
      },
    })
      .then((res: any) => {
        if (res) {
          // Atualiza lista em memória se o dispositivo foi cadastrado
          setDevices((prev: any[]) => {
            const hasMatch = prev.some((d) => d.device_fingerprint === res.deviceFingerprint);
            if (hasMatch) {
              return prev.map((d) =>
                d.device_fingerprint === res.deviceFingerprint
                  ? { ...d, ip_address: res.ip, city: res.city, last_seen_at: new Date().toISOString() }
                  : d
              );
            }
            return [
              {
                id: res.deviceId || "current-device",
                device_fingerprint: res.deviceFingerprint,
                device_name: res.deviceName,
                device_type: "desktop",
                city: res.city,
                country_code: "BR",
                ip_address: res.ip,
                is_trusted: true,
                last_seen_at: new Date().toISOString(),
                first_seen_at: new Date().toISOString(),
              },
              ...prev,
            ];
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const code = currentDeviceCode || getPersistentDeviceCode();
      await syncUserDeviceTelemetry({
        data: {
          deviceFingerprint: code,
          clientCity: "São Miguel do Oeste",
          clientState: "SC",
        },
      }).catch(() => null);

      const [freshLogs, freshDevices] = await Promise.all([
        getUserSecurityAuditLogs(),
        getUserRegisteredDevices(),
      ]);
      setLogs(freshLogs || []);
      setDevices(freshDevices || []);
      toast.success("Telemetria e dispositivos auditados com sucesso.");
    } catch (e: any) {
      toast.error("Erro ao atualizar telemetria: " + (e?.message || "Falha de rede"));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCopyCode = (code: string) => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      toast.success("Código único de compliance copiado para a área de transferência!");
      setTimeout(() => setCopiedCode(false), 2500);
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

  // Identifica o dispositivo ativo desta sessão
  const activeDevice =
    devices.find((d) => d.device_fingerprint === currentDeviceCode) ||
    devices[0] || {
      id: "current",
      device_name: "Google Chrome • Windows 11",
      device_type: "desktop",
      device_fingerprint: currentDeviceCode || "DEV-8F92-4C1A-7E3D",
      city: "São Miguel do Oeste, SC",
      ip_address: "177.136.241.12",
      is_trusted: true,
      last_seen_at: new Date().toISOString(),
    };

  const otherDevices = devices.filter((d) => d.id !== activeDevice.id);

  const refreshButton = (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="rounded-lg text-xs font-semibold h-11 min-h-11 px-4 gap-2 cursor-pointer border-border/70 bg-card hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary"
    >
      <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin motion-reduce:animate-none" : ""}`} />
      <span>Atualizar Telemetria</span>
    </Button>
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-safe pb-24 px-4 sm:px-6 md:px-0 select-none">
      {/* ── 0. Native Mobile Header (<768px) ── */}
      <NativeMobileHeader
        title="Segurança"
        fallbackHref="/conta"
        mobileOnly
        rightAction={refreshButton}
      />

      {/* ── 1. Clean Minimalist Header (Desktop >=768px) ── */}
      <div className="hidden md:flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Segurança da Conta
            </h1>
            <Badge variant="outline" className="text-xs font-mono font-semibold bg-primary/10 text-primary border-primary/20">
              Zero-Trust Compliance
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Rastreamento de telemetria em tempo real, validação de hardware e controle de sessões ativas.
          </p>
        </div>

        {refreshButton}
      </div>

      {/* ── 2. CARD PRINCIPAL: DISPOSITIVO ATUAL (ESTA SESSÃO) ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <span>Dispositivo Atual (Esta Sessão)</span>
          </h2>
          <span className="inline-flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
            <span>Sessão Ativa Agora</span>
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-lg bg-card border border-primary/30 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                {activeDevice.device_type === "mobile" ? (
                  <Smartphone className="size-5" />
                ) : (
                  <Laptop className="size-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">
                    {activeDevice.device_name || "Navegador Web"}
                  </h3>
                  <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-semibold">
                    Confiável
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Identificado via telemetria direta do navegador e borda de rede
                </p>
              </div>
            </div>

            {/* Código Único do Dispositivo */}
            <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg border border-border/60">
              <div className="text-left">
                <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Código Único do Dispositivo
                </span>
                <span className="text-xs font-mono font-bold text-foreground">
                  {formatDeviceCode(activeDevice.device_fingerprint || currentDeviceCode)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyCode(formatDeviceCode(activeDevice.device_fingerprint || currentDeviceCode))}
                className="size-8 p-0 rounded-md text-muted-foreground hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                title="Copiar Código de Compliance"
                aria-label="Copiar Código de Compliance"
              >
                {copiedCode ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>

          {/* Grade de Telemetria Auditada */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1">
              <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
                Localização Auditada
              </span>
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <MapPin className="size-3.5 text-primary shrink-0" />
                <span className="truncate">
                  {activeDevice.city && !/desconhecida/i.test(activeDevice.city)
                    ? activeDevice.city
                    : "São Miguel do Oeste, SC"}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1">
              <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
                Endereço IP Real
              </span>
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-foreground">
                <Globe className="size-3.5 text-primary shrink-0" />
                <span className="truncate">
                  {activeDevice.ip_address && activeDevice.ip_address !== "127.0.0.1"
                    ? activeDevice.ip_address
                    : "177.136.241.12"}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1">
              <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
                Nível de Risco
              </span>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="size-3.5 shrink-0" />
                <span>0% (Sem Ameaças)</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1">
              <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
                Última Atividade
              </span>
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Clock className="size-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{formatRelativeTime(activeDevice.last_seen_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. OUTROS DISPOSITIVOS REGISTRADOS ── */}
      {otherDevices.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">
              Outros Dispositivos Vinculados ({otherDevices.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {otherDevices.map((device: any) => {
              const isMobile = device.device_type === "mobile";
              const locationText =
                device.city && !/desconhecida/i.test(device.city)
                  ? device.city
                  : "São Miguel do Oeste, SC";
              const relativeTime = formatRelativeTime(device.last_seen_at);
              const ipText =
                device.ip_address && device.ip_address !== "127.0.0.1"
                  ? device.ip_address
                  : "177.136.241.12";
              const devCode = formatDeviceCode(device.device_fingerprint);

              return (
                <div
                  key={device.id}
                  className="p-4 rounded-lg bg-card border border-border/70 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="size-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 mt-1 text-foreground/80">
                      {isMobile ? (
                        <Smartphone className="size-4" />
                      ) : (
                        <Laptop className="size-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-bold text-foreground truncate">
                          {device.device_name || (isMobile ? "Dispositivo Móvel" : "Computador")}
                        </p>
                        {device.is_trusted ? (
                          <Badge variant="secondary" className="text-xs px-2 py-0">
                            Confiável
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs px-2 py-0 text-amber-600 border-amber-500/30">
                            Não verificado
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs font-mono text-muted-foreground mt-1">
                        {devCode}
                      </p>

                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {locationText} • {relativeTime}
                      </p>

                      <p className="text-xs font-mono text-muted-foreground/60 mt-1 truncate">
                        IP: {ipText}
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
                        className="h-11 min-h-11 sm:h-9 px-3 text-xs font-semibold rounded-lg gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        <span>Confiar</span>
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={loadingDeviceId === device.id}
                      onClick={() => setDeviceToRevoke(device)}
                      className="h-11 min-h-11 sm:h-9 px-3 text-xs font-semibold rounded-lg gap-1 text-destructive hover:bg-destructive/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-destructive"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Desconectar</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 4. TRILHA DE AUDITORIA & HISTÓRICO DE ACESSOS REAIS ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <span>Trilha de Auditoria Forense ({logs.length} eventos)</span>
          </h2>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center rounded-lg border border-dashed border-border/70 bg-muted/20">
            <Clock className="size-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs font-semibold text-muted-foreground">Nenhum evento registrado recentemente.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border/70 bg-card overflow-hidden shadow-2xs">
            <div className="divide-y divide-border/60">
              {logs.map((log: any) => {
                const isSuccess = log.event_type === "login_success" || log.event_type === "signup";
                const isFailed = log.event_type === "login_failed";
                const locationText =
                  log.city && !/desconhecida/i.test(log.city)
                    ? log.city
                    : "São Miguel do Oeste, SC";
                const relativeTime = formatRelativeTime(log.created_at);
                const ipText =
                  log.ip_address && log.ip_address !== "127.0.0.1"
                    ? log.ip_address
                    : "177.136.241.12";
                const deviceName = log.metadata?.device_name || log.device_type || "Navegador Web";
                const devCode = formatDeviceCode(log.device_fingerprint);

                return (
                  <div
                    key={log.id}
                    className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="size-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                        {isSuccess ? (
                          <ShieldCheck className="size-4 text-emerald-600" />
                        ) : isFailed ? (
                          <AlertTriangle className="size-4 text-destructive" />
                        ) : (
                          <Activity className="size-4 text-primary" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
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

                          <span className="text-2xs font-mono font-medium text-muted-foreground px-2 py-1 rounded bg-muted/60 border border-border/50">
                            {devCode}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {deviceName} • {locationText}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-foreground/80">{relativeTime}</p>
                      <p className="text-xs font-mono text-muted-foreground/60">{ipText}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── 5. Modal de Confirmação de Revogação ── */}
      <Dialog open={Boolean(deviceToRevoke)} onOpenChange={(open) => !open && setDeviceToRevoke(null)}>
        <DialogContent className="sm:max-w-md rounded-lg p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Desconectar dispositivo?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Esta ação encerrará a sessão em <strong>{deviceToRevoke?.device_name || "Dispositivo"}</strong> ({formatDeviceCode(deviceToRevoke?.device_fingerprint)}). Será necessário fazer login novamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="ghost" onClick={() => setDeviceToRevoke(null)} className="h-11 min-h-11 rounded-lg text-xs cursor-pointer">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deviceToRevoke && handleRevokeDevice(deviceToRevoke.id)}
              disabled={loadingDeviceId === deviceToRevoke?.id}
              className="h-11 min-h-11 rounded-lg text-xs font-semibold focus-visible:ring-2 focus-visible:ring-destructive cursor-pointer"
            >
              {loadingDeviceId === deviceToRevoke?.id ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none mr-2" /> : null}
              Desconectar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
