import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
 ArrowLeft,
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
} from "lucide-react";
import { useRef, useEffect } from "react";

import { validateTicketCheckin, validateCredentialCheckin, getEventWithLots } from "@/services/events.functions";
import { Button } from "@/components/ui/button";
import { NativeBackButton } from "@/components/ui/native-back-button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { playCheckinSuccessSound, playWarningAlert } from "@/lib/audio-chimes";

export const Route = createFileRoute("/workspace/eventos/$id/checkin")({
 head: () => ({ meta: [{ title: "Portaria & Check-in de Ingressos | Workspace Waesy" }] }),
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
 const { event } = ((Route.useLoaderData?.() as any) || {});
 const [ticketCode, setTicketCode] = useState("");
 const [isValidating, setIsValidating] = useState(false);
 const [isCameraActive, setIsCameraActive] = useState(false);
 const videoRef = useRef<HTMLVideoElement>(null);
 const mediaStreamRef = useRef<MediaStream | null>(null);
 const animFrameRef = useRef<number | null>(null);
 const lastScannedRef = useRef<{ code: string; time: number } | null>(null);
 const [lastCheckin, setLastCheckin] = useState<{
 success: boolean;
 name?: string;
 lotName?: string;
 message: string;
 timestamp: Date;
 } | null>(null);

 const [history, setHistory] = useState<
 Array<{
 code: string;
 name?: string;
 lotName?: string;
 success: boolean;
 time: string;
 }>
 >([]);

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

 // 2. Validação canônica de ingresso regular com fallback defensivo para credenciais avulsas
 try {
 const res = await validateTicketCheckin({
 data: {
 eventId: event?.id || "",
 ticketCode: code,
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
 message: "Ingresso Válido! Entrada Liberada.",
 timestamp: new Date(),
 });
 setHistory((prev) => [
 {
 code,
 name: res.name,
 lotName: res.lotName,
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
 <div className="flex items-center gap-3">
 <NativeBackButton fallbackHref={event?.id ? `/workspace/eventos/${event.id}` : "/workspace/eventos"} />
 <div>
 <div className="flex items-center gap-2">
 <h1 className="text-base font-bold leading-tight truncate max-w-xs md:max-w-md">
 {event?.name || "Portaria & Check-in"}
 </h1>
 <Badge variant="secondary" className="text-[10px] font-mono uppercase font-bold">
 Ao Vivo
 </Badge>
 </div>
 <p className="text-xs text-muted-foreground">Validador Oficial de Ingressos</p>
 </div>
 </div>

 <div className="flex items-center gap-2.5">
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
 className="rounded-xl text-xs font-bold gap-2 cursor-pointer"
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
 <div className="relative rounded-2xl overflow-hidden bg-black border border-primary/30 aspect-video flex items-center justify-center">
 <video
 ref={videoRef}
 autoPlay
 playsInline
 muted
 className="w-full h-full object-cover"
 />
 <div className="absolute inset-0 border-2 border-primary/40 rounded-2xl pointer-events-none flex items-center justify-center">
 <div className="size-48 border-2 border-dashed border-primary/80 rounded-xl animate-pulse" />
 </div>
 </div>
 )}

 {/* Card de Leitura */}
 <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <QrCode className="size-5 text-primary" />
 <h2 className="text-sm font-bold text-foreground">Validar Ingresso / Credencial Staff</h2>
 </div>
 <Badge variant="outline" className="text-xs font-mono">
 Portaria 1
 </Badge>
 </div>

 <form onSubmit={handleValidate} className="space-y-3">
 <div className="relative">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 autoFocus
 value={ticketCode}
 onChange={(e) => setTicketCode(e.target.value)}
 placeholder="Escaneie o QR Code ou digite o código (Ingresso ou CRED-...)"
 className="pl-10 h-12 rounded-xl text-sm font-mono bg-background"
 disabled={isValidating}
 />
 </div>

 <div className="flex gap-2">
 <Button
 type="submit"
 disabled={isValidating || !ticketCode.trim()}
 className="flex-1 h-11 rounded-xl font-bold text-sm bg-primary text-primary-foreground"
 >
 {isValidating ? (
 <>
 <Loader2 className="size-4 animate-spin mr-2" />
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
 className="h-11 rounded-xl px-4"
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
 className={`p-5 rounded-2xl border transition-all animate-in fade-in zoom-in-95 ${
 lastCheckin.success
 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
 : "bg-destructive/10 border-destructive/30 text-destructive"
 }`}
 >
 <div className="flex items-start gap-3.5">
 {lastCheckin.success ? (
 <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
 ) : (
 <AlertCircle className="size-8 text-destructive shrink-0 mt-0.5" />
 )}
 <div className="space-y-1 min-w-0 flex-1">
 <h3 className="text-base font-bold leading-tight">{lastCheckin.message}</h3>
 {lastCheckin.name && (
 <div className="flex items-center gap-2 text-sm font-semibold pt-1">
 <User className="size-4 opacity-70" />
 <span>{lastCheckin.name}</span>
 </div>
 )}
 {lastCheckin.lotName && (
 <div className="flex items-center gap-2 text-xs opacity-80">
 <Ticket className="size-3.5" />
 <span>{lastCheckin.lotName}</span>
 </div>
 )}
 <p className="text-[10px] opacity-60 pt-1">
 Validado às {lastCheckin.timestamp.toLocaleTimeString()}
 </p>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Lado Direito: Histórico de Entradas Recentes */}
 <div className="md:col-span-5 p-5 rounded-2xl bg-card space-y-3">
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
 className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
 item.success
 ? "border-border bg-background"
 : "border-destructive/20 bg-destructive/5 text-destructive"
 }`}
 >
 <div className="min-w-0 pr-2">
 <p className="font-bold truncate">{item.name || item.code}</p>
 <p className="text-[10px] text-muted-foreground">{item.lotName || item.time}</p>
 </div>
 <Badge
 variant={item.success ? "default" : "destructive"}
 className="text-[9px] px-1.5 py-0 uppercase font-mono"
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
