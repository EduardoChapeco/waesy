import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  Search,
  User,
  Ticket,
  Loader2,
  RefreshCw,
  Camera,
  CameraOff,
  ShieldCheck,
} from "lucide-react";

import { validateTicketCheckin, validateCredentialCheckin, getEventWithLots } from "@/services/events.functions";
import { Button } from "@/components/ui/button";
import { NativeBackButton } from "@/components/ui/native-back-button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { playCheckinSuccessSound, playWarningAlert } from "@/lib/audio-chimes";

export const Route = createFileRoute("/workspace/eventos/$id/checkin")({
  head: () => ({ meta: [{ title: "Check-in de Ingressos | Workspace Waesy" }] }),
  loader: async ({ params }) => {
    try {
      const event = await getEventWithLots({ data: { eventId: (params as any).id } });
      return { event };
    } catch {
      return { event: null };
    }
  },
  component: EventCheckinPage,
});

function EventCheckinPage() {
  const { event } = (Route.useLoaderData?.() as any) || {};
  const [ticketCode, setTicketCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastScannedRef = useRef<{ code: string; time: number } | null>(null);
  const [lastCheckin, setLastCheckin] = useState<{
    success: boolean;
    name?: string;
    lotName?: string;
    humanCode?: string;
    cryptographicallyVerified?: boolean;
    message: string;
    timestamp: Date;
  } | null>(null);

  const [history, setHistory] = useState<
    Array<{
      code: string;
      name?: string;
      lotName?: string;
      humanCode?: string;
      cryptographicallyVerified?: boolean;
      success: boolean;
      time: string;
    }>
  >([]);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          // Permissão de GPS opcional na portaria
        },
        { enableHighAccuracy: true, timeout: 5000 },
      );
    }
  }, []);

  const handleValidate = async (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    const code = (customCode || ticketCode).trim();
    if (!code || isValidating) return;

    setIsValidating(true);
    try {
      // 1. Roteamento inteligente de credenciais de staff/vip/imprensa
      if (code.toUpperCase().startsWith("CRED-")) {
        const credRes = await validateCredentialCheckin({
          data: {
            eventId: event?.id || "",
            qrCode: code,
          },
        });

        if (credRes.alreadyCheckedIn) {
          playWarningAlert();
          if (navigator.vibrate) navigator.vibrate(300);
          toast.warning(`Atenção: ${credRes.message}`);
          setLastCheckin({
            success: false,
            name: credRes.credential?.nome_completo,
            lotName: `Credencial: ${credRes.credential?.tipo_credencial.toUpperCase()} • ${credRes.credential?.cargo_funcao || credRes.credential?.setor_acesso}`,
            message: credRes.message || "Credencial já utilizada!",
            timestamp: new Date(),
          });
        } else {
          playCheckinSuccessSound();
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          toast.success(`Credencial validada: ${credRes.credential?.nome_completo}`);
          setLastCheckin({
            success: true,
            name: credRes.credential?.nome_completo,
            lotName: `Credencial: ${credRes.credential?.tipo_credencial.toUpperCase()} • ${credRes.credential?.cargo_funcao || credRes.credential?.setor_acesso}`,
            message: "Credencial Válida! Acesso Liberado.",
            timestamp: new Date(),
          });
          setHistory((prev) => [
            {
              code,
              name: credRes.credential?.nome_completo,
              lotName: `Credencial: ${credRes.credential?.tipo_credencial.toUpperCase()}`,
              success: true,
              time: new Date().toLocaleTimeString(),
            },
            ...prev.slice(0, 20),
          ]);
          setTicketCode("");
        }
        return;
      }

      // 2. Validação canônica de ingresso WCTS-1 (HMAC-SHA256 ou W-TKT-...) com fallback para credenciais avulsas
      try {
        const res = await validateTicketCheckin({
          data: {
            eventId: event?.id || "",
            ticketCode: code,
            latitude: coords.lat,
            longitude: coords.lng,
          },
        });

        if (res.status === "success") {
          playCheckinSuccessSound();
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          toast.success(`Check-in confirmado: ${res.name}`);
          setLastCheckin({
            success: true,
            name: res.name,
            lotName: res.lotName,
            humanCode: (res as any).humanCode,
            cryptographicallyVerified: Boolean((res as any).cryptographicallyVerified),
            message: "Ingresso Autêntico! Entrada Liberada.",
            timestamp: new Date(),
          });
          setHistory((prev) => [
            {
              code,
              name: res.name,
              lotName: res.lotName,
              humanCode: (res as any).humanCode,
              cryptographicallyVerified: Boolean((res as any).cryptographicallyVerified),
              success: true,
              time: new Date().toLocaleTimeString(),
            },
            ...prev.slice(0, 20),
          ]);
          setTicketCode("");
        }
      } catch (ticketErr: any) {
        // Fallback: tenta validar se o código pertence à tabela de credenciais
        try {
          const credRes = await validateCredentialCheckin({
            data: {
              eventId: event?.id || "",
              qrCode: code,
            },
          });

          if (credRes.alreadyCheckedIn) {
            playWarningAlert();
            toast.warning(credRes.message);
            setLastCheckin({
              success: false,
              name: credRes.credential?.nome_completo,
              lotName: `Credencial: ${credRes.credential?.tipo_credencial.toUpperCase()}`,
              message: credRes.message || "Credencial já utilizada!",
              timestamp: new Date(),
            });
          } else {
            playCheckinSuccessSound();
            toast.success(`Credencial validada: ${credRes.credential?.nome_completo}`);
            setLastCheckin({
              success: true,
              name: credRes.credential?.nome_completo,
              lotName: `Credencial: ${credRes.credential?.tipo_credencial.toUpperCase()} • ${credRes.credential?.cargo_funcao || credRes.credential?.setor_acesso}`,
              message: "Credencial Válida! Acesso Liberado.",
              timestamp: new Date(),
            });
            setHistory((prev) => [
              {
                code,
                name: credRes.credential?.nome_completo,
                lotName: `Credencial: ${credRes.credential?.tipo_credencial.toUpperCase()}`,
                success: true,
                time: new Date().toLocaleTimeString(),
              },
              ...prev.slice(0, 20),
            ]);
            setTicketCode("");
          }
        } catch {
          throw ticketErr;
        }
      }
    } catch (err: any) {
      playWarningAlert();
      if (navigator.vibrate) navigator.vibrate(300);
      const errMsg = err?.message || "Ingresso ou credencial inválida.";
      toast.error(errMsg);
      setLastCheckin({
        success: false,
        message: errMsg,
        timestamp: new Date(),
      });
      setHistory((prev) => [
        {
          code,
          success: false,
          time: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 20),
      ]);
    } finally {
      setIsValidating(false);
    }
  };

  // ── SCANNER CONTÍNUO DE QR CODE VIA BARCODEDETECTOR ──────────────────────
  const runScanLoop = () => {
    if (!videoRef.current || !mediaStreamRef.current) return;

    if ("BarcodeDetector" in window) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ["qr_code", "code_128", "code_39"],
        });

        detector
          .detect(videoRef.current)
          .then((barcodes: any[]) => {
            if (barcodes && barcodes.length > 0) {
              const raw = barcodes[0].rawValue?.trim();
              const now = Date.now();

              // Debounce de 3 segundos para o mesmo código lido
              if (
                raw &&
                (!lastScannedRef.current ||
                  lastScannedRef.current.code !== raw ||
                  now - lastScannedRef.current.time > 3000)
              ) {
                lastScannedRef.current = { code: raw, time: now };
                handleValidate(undefined, raw);
              }
            }
          })
          .catch(() => {
            // Ignorar frames intermediários sem código
          });
      } catch {
        // Fallback silencioso
      }
    }

    animFrameRef.current = requestAnimationFrame(runScanLoop);
  };

  const startCamera = async () => {
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => {});
            runScanLoop();
          };
        }
        setIsCameraActive(true);
        toast.info("Câmera ativada. Aponte para o QR Code do ingresso.");
      } else {
        toast.error("Câmera não suportada neste navegador.");
      }
    } catch {
      toast.error("Permissão de câmera negada ou dispositivo indisponível.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const totalSuccess = history.filter((h) => h.success).length;
  const totalBlocked = history.filter((h) => !h.success).length;

  return (
    <div className="w-full min-h-full bg-background text-foreground flex flex-col">
      {/* Topbar Operacional */}
      <header className="h-16 bg-card px-4 flex items-center justify-between sticky top-0 z-30 border-b border-border/60">
        <div className="flex items-center gap-3 min-w-0">
          <NativeBackButton fallbackHref={event?.id ? `/workspace/eventos/${event.id}` : "/workspace/eventos"} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold leading-tight break-words">
                {event?.name || "Check-in"}
              </h1>
              <Badge variant="secondary" className="text-xs font-mono uppercase font-bold">
                Ao Vivo
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Validador Criptográfico WCTS-1</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 font-mono">
              <CheckCircle2 className="size-3.5" />
              {totalSuccess} liberados
            </span>
            {totalBlocked > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/20 font-mono">
                <AlertCircle className="size-3.5" />
                {totalBlocked} barrados
              </span>
            )}
          </div>

          <Button
            type="button"
            size="sm"
            variant={isCameraActive ? "destructive" : "outline"}
            onClick={isCameraActive ? stopCamera : startCamera}
            className="h-11 min-h-11 rounded-lg text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isCameraActive ? <CameraOff className="size-4" /> : <Camera className="size-4" />}
            <span className="hidden sm:inline">{isCameraActive ? "Desativar Câmera" : "Câmera Traseira"}</span>
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 grid gap-6 md:grid-cols-12 items-start">
        {/* Lado Esquerdo: Scanner / Validador Rápido */}
        <div className="md:col-span-7 space-y-5">
          {/* Visualizador de Câmera */}
          {isCameraActive && (
            <div className="relative rounded-lg overflow-hidden bg-foreground border border-primary/30 aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-2 border-primary/40 rounded-lg pointer-events-none flex items-center justify-center">
                <div className="size-48 border-2 border-dashed border-primary/80 rounded-lg animate-pulse motion-reduce:animate-none" />
              </div>
            </div>
          )}

          {/* Card de Leitura */}
          <div className="p-5 rounded-lg bg-card border border-border/80 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <QrCode className="size-5 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Validar Ingresso / Credencial Staff</h2>
              </div>
              <Badge variant="outline" className="text-xs font-mono gap-1">
                <ShieldCheck className="size-3 text-emerald-600" />
                HMAC-SHA256
              </Badge>
            </div>

            <form onSubmit={handleValidate} className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  autoFocus
                  value={ticketCode}
                  onChange={(e) => setTicketCode(e.target.value)}
                  placeholder="Escaneie o QR Code ou digite W-TKT-... / CRED-..."
                  className="pl-10 h-12 rounded-lg text-sm font-mono bg-background"
                  disabled={isValidating}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isValidating || !ticketCode.trim()}
                  className="flex-1 h-11 min-h-11 rounded-lg font-bold text-sm bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none mr-2" />
                      Validando...
                    </>
                  ) : (
                    "Confirmar Entrada"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTicketCode("")}
                  className="size-11 min-h-11 min-w-11 rounded-lg p-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  title="Limpar"
                >
                  <RefreshCw className="size-4" />
                </Button>
              </div>
            </form>
          </div>

          {/* Feedback Visual Imediato do Último Check-in */}
          {lastCheckin && (
            <div
              className={`p-5 rounded-lg border transition-colors animate-in fade-in zoom-in-95 ${
                lastCheckin.success
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
                  : "bg-destructive/10 border-destructive/30 text-destructive"
              }`}
            >
              <div className="flex items-start gap-4">
                {lastCheckin.success ? (
                  <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400 shrink-0 mt-1" />
                ) : (
                  <AlertCircle className="size-8 text-destructive shrink-0 mt-1" />
                )}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold leading-tight break-words">{lastCheckin.message}</h3>
                    {lastCheckin.cryptographicallyVerified && (
                      <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-mono gap-1">
                        <ShieldCheck className="size-3" />
                        Assinatura WCTS-1
                      </Badge>
                    )}
                  </div>
                  {lastCheckin.name && (
                    <div className="flex items-center gap-2 text-sm font-semibold pt-1">
                      <User className="size-4 opacity-70 shrink-0" />
                      <span className="break-words">{lastCheckin.name}</span>
                    </div>
                  )}
                  {lastCheckin.lotName && (
                    <div className="flex items-center gap-2 text-xs opacity-80">
                      <Ticket className="size-3.5 shrink-0" />
                      <span className="break-words">{lastCheckin.lotName}</span>
                    </div>
                  )}
                  {lastCheckin.humanCode && (
                    <p className="text-xs font-mono opacity-80">
                      Código: {lastCheckin.humanCode}
                    </p>
                  )}
                  <p className="text-xs opacity-60 pt-1">
                    Validado às {lastCheckin.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lado Direito: Histórico de Entradas Recentes */}
        <div className="md:col-span-5 p-5 rounded-lg bg-card border border-border/70 space-y-3">
          <div className="flex items-center justify-between pb-3">
            <h3 className="text-sm font-bold text-foreground">Entradas Recentes</h3>
            <Badge variant="secondary" className="text-xs font-mono">
              {history.filter((h) => h.success).length} válidas
            </Badge>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto no-scrollbar pr-1">
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Nenhuma leitura realizada nesta sessão.
              </p>
            ) : (
              history.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                    item.success
                      ? "border-border bg-background"
                      : "border-destructive/20 bg-destructive/5 text-destructive"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-bold break-words">{item.name || item.humanCode || item.code}</p>
                    <p className="text-xs text-muted-foreground break-words">{item.lotName || item.time}</p>
                  </div>
                  <Badge
                    variant={item.success ? "default" : "destructive"}
                    className="text-xs px-2 py-0 uppercase font-mono shrink-0"
                  >
                    {item.success ? "OK" : "ERRO"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
