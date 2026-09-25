import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { listTransactionCertificates } from "@/services/security.functions";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
 Shield,
 ShieldAlert,
 ShieldCheck,
 Search,
 Filter,
 ExternalLink,
 AlertTriangle,
 CheckCircle2,
 Clock,
 Globe,
 Fingerprint,
 Link as LinkIcon,
 RefreshCw,
 ShoppingCart,
 Calendar,
 FileSignature,
 CreditCard,
 MapPin,
 Cpu,
 Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin-master/seguranca/certificados")({
 head: () => ({ meta: [{ title: "Certificados de Transação | Admin Master" }] }),
 loader: async () => {
 try {
 const rows = await listTransactionCertificates({ data: { autoFlaggedOnly: false, page: 0, limit: 50 } });
 return { certificates: rows };
 } catch {
 return { certificates: [] };
 }
 },
 component: TransactionCertificatesPage,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ENTITY_TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
 order: { label: "Compra", icon: ShoppingCart, color: "text-blue-500" },
 pos_sale: { label: "PDV", icon: CreditCard, color: "text-violet-500" },
 booking: { label: "Agendamento", icon: Calendar, color: "text-teal-500" },
 appointment: { label: "Atendimento", icon: Calendar, color: "text-cyan-500" },
 contract_signature: { label: "Contrato", icon: FileSignature, color: "text-orange-500" },
 group_tour_boarding: { label: "Embarque", icon: MapPin, color: "text-pink-500" },
 delivery_pin_generation: { label: "PIN Entrega", icon: Package, color: "text-amber-500" },
 delivery_confirmation: { label: "Entrega", icon: CheckCircle2, color: "text-green-500" },
 credit_redemption: { label: "Crédito", icon: CreditCard, color: "text-emerald-500" },
 coupon_application: { label: "Cupom", icon: CreditCard, color: "text-yellow-500" },
 gift_card_redemption: { label: "Gift Card", icon: CreditCard, color: "text-rose-500" },
 token_transfer: { label: "Tokens", icon: Cpu, color: "text-purple-500" },
 kyc_verification: { label: "KYC", icon: Shield, color: "text-indigo-500" },
};

function getRiskBadge(score: number, flagged: boolean) {
 if (flagged || score >= 70)
 return { label: "Alto Risco", variant: "destructive" as const, color: "bg-destructive/10 text-destructive border-destructive/20" };
 if (score >= 40)
 return { label: "Médio", variant: "secondary" as const, color: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
 return { label: "Normal", variant: "outline" as const, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
}

function truncateHash(hash: string, chars = 12) {
 if (!hash) return "—";
 return hash.substring(0, chars) + "…" + hash.substring(hash.length - 6);
}

// ─── Page Component ───────────────────────────────────────────────────────────

function TransactionCertificatesPage() {
 const { certificates: initial } = Route.useLoaderData() as { certificates: any[] };
 const [certs, setCerts] = useState(initial || []);
 const [search, setSearch] = useState("");
 const [filter, setFilter] = useState("all");
 const [flaggedOnly, setFlaggedOnly] = useState(false);
 const [loading, setLoading] = useState(false);

 const handleRefresh = async () => {
 setLoading(true);
 try {
 const fresh = await listTransactionCertificates({
 data: { autoFlaggedOnly: flaggedOnly, page: 0, limit: 50 },
 });
 setCerts(fresh);
 } catch (e: any) {
 console.error(e);
 } finally {
 setLoading(false);
 }
 };

 const filtered = certs.filter((c: any) => {
 const matchSearch =
 !search ||
 c.ip_address?.includes(search) ||
 c.user_full_name?.toLowerCase().includes(search.toLowerCase()) ||
 c.certificate_hash?.startsWith(search) ||
 c.store_name?.toLowerCase().includes(search.toLowerCase());

 const matchType = filter === "all" || c.entity_type === filter;
 const matchFlagged = !flaggedOnly || c.auto_flagged;
 return matchSearch && matchType && matchFlagged;
 });

 const flaggedCount = certs.filter((c: any) => c.auto_flagged).length;
 const highRiskCount = certs.filter((c: any) => c.risk_score >= 70).length;

 return (
 <div className="min-h-screen bg-background">
 {/* Header */}
 <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
 <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
 <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 <Fingerprint className="size-5" />
 </div>
 <div>
 <h1 className="text-base font-semibold tracking-tight">Certificados de Transação</h1>
 <p className="text-xs text-muted-foreground">Ledger criptográfico imutável de todas as transações da plataforma</p>
 </div>
 <div className="ml-auto flex items-center gap-2">
 {flaggedCount > 0 && (
 <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs font-mono">
 <ShieldAlert className="size-3 mr-1" />
 {flaggedCount} sinalizados
 </Badge>
 )}
 <Button
 variant="outline"
 size="sm"
 onClick={handleRefresh}
 disabled={loading}
 id="refresh-certs"
 className="gap-1.5 text-xs"
 >
 <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
 Atualizar
 </Button>
 </div>
 </div>
 </div>

 <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
 {/* KPI strip */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {[
 { label: "Total (carregados)", value: certs.length, icon: Shield, color: "text-primary" },
 { label: "Sinalizados auto", value: flaggedCount, icon: ShieldAlert, color: "text-destructive" },
 { label: "Alto risco (≥70)", value: highRiskCount, icon: AlertTriangle, color: "text-amber-500" },
 { label: "Válidos", value: certs.filter((c: any) => c.is_valid).length, icon: ShieldCheck, color: "text-green-500" },
 ].map((kpi) => (
 <div key={kpi.label} className="bg-card border border-border/50 rounded-xl p-4">
 <div className={cn("size-8 rounded-lg flex items-center justify-center mb-2.5", kpi.color === "text-primary" ? "bg-primary/10" : kpi.color === "text-destructive" ? "bg-destructive/10" : kpi.color === "text-amber-500" ? "bg-amber-500/10" : "bg-emerald-500/10")}>
 <kpi.icon className={cn("size-4", kpi.color)} />
 </div>
 <div className="text-xl font-bold font-mono">{kpi.value}</div>
 <div className="text-xs text-muted-foreground mt-0.5">{kpi.label}</div>
 </div>
 ))}
 </div>

 {/* Filters */}
 <div className="flex flex-wrap items-center gap-2">
 <div className="relative flex-1 min-w-48">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
 <Input
 placeholder="Buscar por IP, usuário, hash, loja…"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pl-9 text-sm h-8"
 id="cert-search"
 />
 </div>

 <select
 value={filter}
 onChange={(e) => setFilter(e.target.value)}
 className="h-8 px-3 text-xs rounded-lg border border-border bg-card text-foreground"
 id="cert-type-filter"
 >
 <option value="all">Todos os tipos</option>
 {Object.entries(ENTITY_TYPE_META).map(([k, v]) => (
 <option key={k} value={k}>{v.label}</option>
 ))}
 </select>

 <Button
 variant={flaggedOnly ? "default" : "outline"}
 size="sm"
 className="text-xs gap-1.5 h-8"
 onClick={() => setFlaggedOnly(!flaggedOnly)}
 id="cert-flagged-filter"
 >
 <Filter className="size-3" />
 Apenas sinalizados
 </Button>
 </div>

 {/* Table */}
 <div className="rounded-xl border border-border/50 overflow-hidden bg-card">
 <div className="overflow-x-auto no-scrollbar">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-border/50 bg-muted/30">
 <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</th>
 <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Hash</th>
 <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Usuário</th>
 <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">IP</th>
 <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Risco</th>
 <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cadeia</th>
 <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Data</th>
 <th className="px-4 py-3 w-10" />
 </tr>
 </thead>
 <tbody className="divide-y divide-border/30">
 {filtered.length === 0 && (
 <tr>
 <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
 <Shield className="size-8 mx-auto mb-2 opacity-20" />
 Nenhum certificado encontrado.
 </td>
 </tr>
 )}
 {filtered.map((cert: any) => {
 const meta = ENTITY_TYPE_META[cert.entity_type] || { label: cert.entity_type, icon: Shield, color: "text-muted-foreground" };
 const risk = getRiskBadge(cert.risk_score, cert.auto_flagged);
 const IconComp = meta.icon;

 return (
 <tr
 key={cert.id}
 className={cn(
 "hover:bg-muted/20 transition-colors",
 cert.auto_flagged && "bg-destructive/5"
 )}
 >
 <td className="px-4 py-3">
 <div className="flex items-center gap-2">
 <div className="size-7 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
 <IconComp className={cn("size-3.5", meta.color)} />
 </div>
 <span className="text-xs font-medium">{meta.label}</span>
 </div>
 </td>

 <td className="px-4 py-3">
 <code className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
 {truncateHash(cert.certificate_hash)}
 </code>
 </td>

 <td className="px-4 py-3">
 <div className="text-xs">
 <span className="font-medium">{cert.user_full_name || "—"}</span>
 {cert.store_name && (
 <span className="text-muted-foreground ml-1">· {cert.store_name}</span>
 )}
 </div>
 </td>

 <td className="px-4 py-3">
 <div className="flex items-center gap-1.5">
 <Globe className="size-3 text-muted-foreground shrink-0" />
 <code className="text-[11px] font-mono">{cert.ip_address}</code>
 {cert.geo_country && (
 <span className="text-[10px] text-muted-foreground">({cert.geo_country})</span>
 )}
 </div>
 </td>

 <td className="px-4 py-3">
 <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border", risk.color)}>
 {cert.risk_score}pts · {risk.label}
 </span>
 </td>

 <td className="px-4 py-3">
 <div className="flex items-center gap-1 text-[11px]">
 <LinkIcon className="size-3 text-muted-foreground" />
 {cert.prev_certificate_hash ? (
 <span className="text-green-500 font-medium">Encadeado</span>
 ) : (
 <span className="text-muted-foreground">Gênese</span>
 )}
 </div>
 </td>

 <td className="px-4 py-3">
 <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
 <Clock className="size-3" />
 {new Date(cert.created_at).toLocaleString("pt-BR", {
 day: "2-digit", month: "2-digit",
 hour: "2-digit", minute: "2-digit",
 })}
 </div>
 </td>

 <td className="px-4 py-3">
 <Link
 to="/admin-master/seguranca/certificados/$id"
 params={{ id: cert.id }}
 className="size-7 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
 id={`view-cert-${cert.id}`}
 >
 <ExternalLink className="size-3.5 text-muted-foreground" />
 </Link>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>

 <p className="text-xs text-muted-foreground text-center">
 Todos os certificados são imutáveis — nenhum UPDATE ou DELETE é possível após geração.
 Encadeamento SHA-256 garante integridade forense.
 </p>
 </div>
 </div>
 );
}
