import { createFileRoute } from "@tanstack/react-router";
import { getCertificateDetail } from "@/services/security.functions";
import {
 Shield,
 ShieldAlert,
 ShieldCheck,
 Globe,
 Fingerprint,
 Clock,
 Link as LinkIcon,
 CheckCircle2,
 XCircle,
 AlertTriangle,
 User,
 Lock,
 Hash,
 Eye,
 Package,
 ShoppingCart,
  Calendar,
  FileSignature,
  CreditCard,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin-master/seguranca/certificados/$id")({
  head: () => ({ meta: [{ title: "Certificado de Transação | Admin Master" }] }),
  loader: async ({ params }) => {
    try {
      return await getCertificateDetail({ data: { id: params.id } }).catch((err: any) => ({
        success: false,
        error: err?.message || "Erro ao carregar certificado",
        certificate: null,
        related_events: [],
      }));
    } catch (err: any) {
      console.error("[loader:admin-master.seguranca.certificados.$id] Unhandled loader error:", err);
      return {
        success: false,
        error: err?.message || "Erro ao carregar certificado",
        certificate: null,
        related_events: [],
      };
    }
  },
  component: CertificateDetailPage,
});

function countryFlag(code: string | null): string {
 if (!code || code.length !== 2) return "🌐";
 return code.toUpperCase().replace(/./g, c =>
 String.fromCodePoint(127397 + c.charCodeAt(0))
 );
}

// ─── Seção de Card ────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
 return (
 <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
 <div className="px-5 py-3.5 border-b border-border/40 flex items-center gap-2">
 <Icon className="size-4 text-muted-foreground" />
 <span className="text-sm font-medium">{title}</span>
 </div>
 <div className="p-5">{children}</div>
 </div>
 );
}

function Row({ label, value, mono = false, className }: { label: string; value: React.ReactNode; mono?: boolean; className?: string }) {
 return (
 <div className="flex items-start justify-between gap-4 py-2 border-b border-border/30 last:border-0">
 <span className="text-xs text-muted-foreground shrink-0 pt-0.5 w-36">{label}</span>
 <span className={cn("text-xs text-right break-all", mono && "font-mono", className)}>{value}</span>
 </div>
 );
}

// ─── Risk Gauge ────────────────────────────────────────────────────────────────
function RiskGauge({ score }: { score: number }) {
 const color = score >= 70 ? "bg-destructive" : score >= 40 ? "bg-amber-500" : "bg-emerald-500";
 const label = score >= 70 ? "Alto Risco" : score >= 40 ? "Médio Risco" : "Normal";
 return (
 <div className="space-y-2">
 <div className="flex items-center justify-between text-xs">
 <span className="text-muted-foreground">Score de Risco</span>
 <span className="font-bold font-mono">{score}/100 — {label}</span>
 </div>
 <div className="h-2 bg-muted rounded-full overflow-hidden">
 <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${score}%` }} />
 </div>
 </div>
 );
}

// ─── Page Component ───────────────────────────────────────────────────────────
function CertificateDetailPage() {
 const loaderData = Route.useLoaderData() as any;

 if (!loaderData?.success || !loaderData?.certificate) {
 return (
 <div className="min-h-screen bg-background flex items-center justify-center">
 <div className="text-center">
 <XCircle className="size-10 mx-auto text-destructive mb-3" />
 <h2 className="text-base font-semibold">Certificado não encontrado</h2>
 <p className="text-xs text-muted-foreground mt-1">{loaderData?.error || "Verifique o ID e tente novamente."}</p>
 </div>
 </div>
 );
 }

 const cert = loaderData.certificate;
 const events = loaderData.related_events || [];
 const { user, telemetry, cryptography, timestamps, status } = cert;

 return (
 <div className="min-h-screen bg-background">
 {/* Header */}
 <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
 <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
 <div className={cn("size-9 rounded-xl flex items-center justify-center",
 status.auto_flagged ? "bg-destructive/10" : "bg-primary/10"
 )}>
 {status.auto_flagged
 ? <ShieldAlert className="size-5 text-destructive" />
 : <ShieldCheck className="size-5 text-primary" />
 }
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <h1 className="text-base font-semibold">Certificado de Transação</h1>
 <Badge variant="outline" className="text-[10px] font-mono uppercase">
 {cert.entity_type}
 </Badge>
 {status.auto_flagged && (
 <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
 <AlertTriangle className="size-2.5 mr-1" />
 Sinalizado
 </Badge>
 )}
 </div>
 <code className="text-[10px] text-muted-foreground font-mono">{cryptography.certificate_hash}</code>
 </div>
 </div>
 </div>

 <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
 {/* Risk + Validity Strip */}
 <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
 <RiskGauge score={status.risk_score} />
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
 <div className="text-center">
 <div className={cn("text-base font-bold", status.is_valid ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
 {status.is_valid ? "✓ Válido" : "✗ Inválido"}
 </div>
 <div className="text-[10px] text-muted-foreground">Status</div>
 </div>
 <div className="text-center">
 <div className={cn("text-base font-bold", cryptography.chain_valid ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
 {cryptography.chain_valid ? "⛓ Íntegra" : "⚠ Quebrada"}
 </div>
 <div className="text-[10px] text-muted-foreground">Cadeia</div>
 </div>
 <div className="text-center">
 <div className={cn("text-base font-bold", (timestamps.clock_drift_ms || 0) < 30000 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500")}>
 {timestamps.clock_drift_ms != null ? `${(timestamps.clock_drift_ms / 1000).toFixed(1)}s` : "—"}
 </div>
 <div className="text-[10px] text-muted-foreground">Clock Drift</div>
 </div>
 </div>
 </div>

 <div className="grid md:grid-cols-2 gap-4">
 {/* Criptografia */}
 <Section title="Criptografia SHA-256" icon={Lock}>
 <div className="space-y-0">
 <Row label="Hash principal" value={cryptography.certificate_hash} mono className="text-primary" />
 <Row label="Hash anterior" value={cryptography.prev_certificate_hash || "GENESIS (1ª tx)"} mono className="text-muted-foreground" />
 <Row label="Payload hash" value={cryptography.payload_hash} mono />
 <Row
 label="Integridade"
 value={
 <span className={cn("flex items-center gap-1", cryptography.chain_valid ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
 {cryptography.chain_valid
 ? <><CheckCircle2 className="size-3" /> Cadeia íntegra</>
 : <><XCircle className="size-3" /> Cadeia comprometida</>
 }
 </span>
 }
 />
 </div>
 </Section>

 {/* Usuário */}
 <Section title="Usuário Autenticado" icon={User}>
 <div className="space-y-0">
 <Row label="Nome" value={user.full_name || "—"} />
 <Row label="E-mail" value={user.email || "—"} mono />
 <Row label="Username" value={user.username ? `@${user.username}` : "—"} />
 <Row label="User ID" value={user.id} mono />
 <Row label="Loja" value={cert.store_name || "—"} />
 </div>
 </Section>

 {/* Telemetria */}
 <Section title="Telemetria de Dispositivo" icon={Globe}>
 <div className="space-y-0">
 <Row
 label="Endereço IP"
 value={
 <span className="flex items-center gap-1 font-mono">
 {telemetry.ip_address}
 {telemetry.geo_country && (
 <span>{countryFlag(telemetry.geo_country)} {telemetry.geo_city || ""}</span>
 )}
 </span>
 }
 />
 <Row label="Dispositivo (UA)" value={telemetry.user_agent?.substring(0, 80) || "—"} />
 <Row label="Fingerprint" value={telemetry.device_fingerprint || "—"} mono />
 <Row label="Session JTI" value={telemetry.session_jti || "—"} mono />
 </div>
 </Section>

 {/* Timestamps */}
 <Section title="Sincronismo de Relógio" icon={Clock}>
 <div className="space-y-0">
 <Row label="Timestamp cliente" value={timestamps.client_timestamp ? new Date(timestamps.client_timestamp).toLocaleString("pt-BR") : "—"} />
 <Row label="Timestamp servidor" value={timestamps.server_timestamp ? new Date(timestamps.server_timestamp).toLocaleString("pt-BR") : "—"} />
 <Row
 label="Clock drift"
 value={
 <span className={cn(
 "font-mono font-semibold",
 (timestamps.clock_drift_ms || 0) > 300000 ? "text-destructive" :
 (timestamps.clock_drift_ms || 0) > 30000 ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"
 )}>
 {timestamps.clock_drift_ms != null ? `${timestamps.clock_drift_ms.toLocaleString()}ms` : "—"}
 {(timestamps.clock_drift_ms || 0) > 300000 ? " ⚠ Suspeito" : ""}
 </span>
 }
 />
 <Row label="Gerado em" value={new Date(timestamps.created_at || cert.created_at).toLocaleString("pt-BR")} />
 </div>
 </Section>
 </div>

 {/* Payload Snapshot */}
 <Section title="Snapshot do Payload (Imutável)" icon={Eye}>
 <pre className="text-[11px] font-mono bg-muted/50 rounded-lg p-4 overflow-x-auto no-scrollbar whitespace-pre-wrap text-muted-foreground max-h-72">
 {JSON.stringify(cert.payload_snapshot, null, 2)}
 </pre>
 </Section>

 {/* Eventos Relacionados */}
 {events.length > 0 && (
 <Section title={`Eventos de Telemetria Relacionados (${events.length})`} icon={AlertTriangle}>
 <div className="space-y-2">
 {events.map((ev: any) => (
 <div
 key={ev.id}
 className={cn(
 "flex items-start gap-3 p-3 rounded-lg border text-xs",
 ev.severity === "critical" || ev.severity === "emergency"
 ? "bg-destructive/5 border-destructive/20"
 : ev.severity === "warning"
 ? "bg-amber-500/5 border-amber-500/20"
 : "bg-muted/30 border-border/50"
 )}
 >
 <div className="size-5 shrink-0 rounded flex items-center justify-center mt-0.5">
 {ev.severity === "critical" || ev.severity === "emergency"
 ? <ShieldAlert className="size-3.5 text-destructive" />
 : ev.severity === "warning"
 ? <AlertTriangle className="size-3.5 text-amber-500" />
 : <Shield className="size-3.5 text-muted-foreground" />
 }
 </div>
 <div className="flex-1 min-w-0">
 <code className="font-semibold">{ev.event_type}</code>
 {ev.risk_score > 0 && (
 <Badge variant="outline" className="ml-2 text-[10px]">{ev.risk_score}pts</Badge>
 )}
 <div className="text-muted-foreground mt-0.5 text-[10px]">
 {new Date(ev.created_at).toLocaleString("pt-BR")}
 </div>
 </div>
 </div>
 ))}
 </div>
 </Section>
 )}

 <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground py-2">
 <Lock className="size-3.5" />
 Este certificado é imutável. Gerado por SHA-256 server-side. Nenhum UPDATE ou DELETE é possível.
 </div>
 </div>
 </div>
 );
}
