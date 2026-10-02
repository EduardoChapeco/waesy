import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, XCircle, Eye, Trash2, Ban, ShieldAlert, Loader2, Filter, ExternalLink } from "lucide-react";
import { listModerationReports, resolveModerationReport } from "@/services/master.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SheetPage } from "@/components/ui/sheet-page";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/datetime";

import { ErrorState } from "@/components/state/states";

export const Route = createFileRoute("/admin-master/denuncias")({
 head: () => ({ meta: [{ title: "Trust e Safety — Central de Denúncias | Admin Waesy" }] }),
 loader: async () => {
 try {
 const reports = await listModerationReports({ data: { status: "all" } }).catch(() => []);
 return { reports: reports || [] };
 } catch {
 return { reports: [] };
 }
 },
 component: AdminDenunciasPage,
 errorComponent: () => (
 <div className="mx-auto max-w-xl px-4 py-20">
 <ErrorState
 title="Central de Denúncias Indisponível"
 description="Não foi possível carregar as denúncias no momento. Tente novamente."
 onRetry={() => {
 if (typeof window !== "undefined") window.location.reload();
 }}
 />
 </div>
 ),
});

function AdminDenunciasPage() {
 const { reports: initialReports } = ((Route.useLoaderData?.() as any) || {});
 const router = useRouter();

 const [selectedReport, setSelectedReport] = useState<any | null>(null);
 const [actionType, setActionType] = useState<
 "content_removed" | "author_warned" | "author_banned" | "dismissed" | null
 >(null);
 const [moderatorNotes, setModeratorNotes] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [filterStatus, setFilterStatus] = useState<string>("all");

 const filteredReports = (initialReports || []).filter((r: any) => {
 if (filterStatus === "all") return true;
 if (filterStatus === "pending") return r.status === "pending";
 if (filterStatus === "resolved") return r.status.startsWith("resolved");
 return true;
 });

 const handleOpenAction = (report: any, action: typeof actionType) => {
 setSelectedReport(report);
 setActionType(action);
 setModeratorNotes("");
 };

 const handleExecuteAction = async () => {
 if (!selectedReport || !actionType) return;
 if (!moderatorNotes.trim()) {
 toast.error("Informe uma justificativa para registrar no histórico de moderação.");
 return;
 }

 setIsSubmitting(true);
 try {
 await resolveModerationReport({
 data: {
 reportId: selectedReport.id,
 actionTaken: actionType,
 moderatorNotes,
 },
 });

 toast.success("Ação de moderação executada com sucesso!");
 setSelectedReport(null);
 setActionType(null);
 router.invalidate();
 } catch (e: unknown) {
 toast.error(e instanceof Error ? e.message : "Erro ao executar moderação");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
 <div>
 <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
 <AlertTriangle className="size-6 text-amber-500" />
 Denúncias e Moderação
 </h1>
 <p className="text-sm text-muted-foreground">
 Auditoria global de conteúdos sinalizados, histórico de infrações e sanções disciplinares.
 </p>
 </div>

 <div className="flex items-center gap-2">
 <Button
 variant={filterStatus === "all" ? "default" : "outline"}
 size="sm"
 onClick={() => setFilterStatus("all")}
 >
 Todas ({initialReports?.length || 0})
 </Button>
 <Button
 variant={filterStatus === "pending" ? "default" : "outline"}
 size="sm"
 onClick={() => setFilterStatus("pending")}
 >
 Pendentes (
 {(initialReports || []).filter((r: any) => r.status === "pending").length}
 )
 </Button>
 <Button
 variant={filterStatus === "resolved" ? "default" : "outline"}
 size="sm"
 onClick={() => setFilterStatus("resolved")}
 >
 Resolvidas
 </Button>
 </div>
 </div>

 {filteredReports.length === 0 ? (
 <div className="border-0 rounded-lg p-12 text-center">
 <ShieldAlert className="size-12 text-muted-foreground mx-auto mb-3 opacity-40" />
 <h3 className="text-base font-bold text-foreground">Nenhuma denúncia pendente</h3>
 <p className="text-xs text-muted-foreground mt-1">
 A comunidade está limpa e operando dentro das diretrizes legais.
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 gap-4">
 {filteredReports.map((r: any) => (
 <div
 key={r.id}
 className=" bg-card rounded-lg p-5 space-y-4"
 >
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
 <div className="flex items-center gap-2">
 <Badge variant={r.status === "pending" ? "destructive" : "secondary"}>
 {r.status === "pending" ? "Pendente de Análise" : "Resolvido"}
 </Badge>
 <span className="text-xs font-mono uppercase font-bold text-muted-foreground">
 {r.entity_type} • #{r.entity_id.slice(0, 8)}
 </span>
 </div>
 <span className="text-xs text-muted-foreground">
 Registrada em {formatDateTime(r.created_at)}
 </span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1">
 <span className="text-[11px] font-bold uppercase text-muted-foreground">
 Motivo da Denúncia
 </span>
 <p className="text-sm font-semibold text-destructive capitalize">
 {r.reason}
 </p>
 {r.description && (
 <p className="text-xs text-foreground/80 bg-muted/30 p-2 rounded-lg mt-1">
 "{r.description}"
 </p>
 )}
 </div>

 <div className="space-y-1">
 <span className="text-[11px] font-bold uppercase text-muted-foreground">
 Denunciante e Alvo
 </span>
 <p className="text-xs text-foreground">
 Denunciante:{" "}
 <span className="font-semibold">
 {r.reporter?.full_name || "Anônimo"}
 </span>
 </p>
 <p className="text-xs text-muted-foreground">
 Título do Conteúdo:{" "}
 <span className="font-semibold text-foreground">
 {r.entity_title || "Sem título registrado"}
 </span>
 </p>
 </div>
 </div>

 {r.evidence_urls && r.evidence_urls.length > 0 && (
 <div>
 <span className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
 Evidências Fotográficas
 </span>
 <div className="flex gap-2">
 {r.evidence_urls.map((url: string, i: number) => (
 <a
 key={i}
 href={url}
 target="_blank"
 rel="noreferrer"
 className="size-16 rounded-lg overflow-hidden shrink-0 hover:opacity-80"
 >
 <img
 src={url}
 alt="Evidência"
 className="w-full h-full object-cover"
 />
 </a>
 ))}
 </div>
 </div>
 )}

 {r.status === "pending" && (
 <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t">
 <Button
 variant="outline"
 size="sm"
 className="text-xs"
 onClick={() => handleOpenAction(r, "dismissed")}
 >
 <XCircle className="size-3.5 mr-1" />
 Dispensar
 </Button>
 <Button
 variant="outline"
 size="sm"
 className="text-xs text-amber-600 border-amber-500/30 hover:bg-amber-50"
 onClick={() => handleOpenAction(r, "author_warned")}
 >
 <AlertTriangle className="size-3.5 mr-1" />
 Advertir Autor
 </Button>
 <Button
 variant="destructive"
 size="sm"
 className="text-xs"
 onClick={() => handleOpenAction(r, "content_removed")}
 >
 <Trash2 className="size-3.5 mr-1" />
 Remover Conteúdo
 </Button>
 <Button
 variant="destructive"
 size="sm"
 className="text-xs bg-destructive hover:bg-destructive"
 onClick={() => handleOpenAction(r, "author_banned")}
 >
 <Ban className="size-3.5 mr-1" />
 Banir Usuário
 </Button>
 </div>
 )}
 </div>
 ))}
 </div>
 )}

 {/* SheetPage de Julgamento & Parecer de Moderação */}
 <SheetPage
 open={!!selectedReport && !!actionType}
 onOpenChange={(open) => {
 if (!open) {
 setSelectedReport(null);
 setActionType(null);
 }
 }}
 title="Julgamento de Moderação Master"
 size="default"
 footer={
 <>
 <Button
 variant="outline"
 onClick={() => {
 setSelectedReport(null);
 setActionType(null);
 }}
 className="h-11 px-4 rounded-lg text-xs font-bold"
 >
 Cancelar
 </Button>
 <Button
 variant="destructive"
 onClick={handleExecuteAction}
 disabled={isSubmitting || !moderatorNotes.trim()}
 className="h-11 px-6 rounded-lg text-xs font-bold"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="size-4 animate-spin mr-2" /> Executando...
 </>
 ) : (
 "Executar Decisão"
 )}
 </Button>
 </>
 }
 >
 <div className="space-y-4">
 {selectedReport && (
 <div className="p-4 rounded-lg bg-card space-y-2">
 <div className="flex items-center justify-between text-xs">
 <span className="font-bold text-foreground">Alvo da Denúncia</span>
 <Badge variant="outline">{selectedReport.target_type}</Badge>
 </div>
 <p className="text-xs text-muted-foreground">
 Motivo: <strong className="text-foreground">{selectedReport.reason}</strong>
 </p>
 </div>
 )}

 <div className="space-y-2">
 <Label className="text-xs font-bold">Justificativa & Parecer do Auditor *</Label>
 <Textarea
 value={moderatorNotes}
 onChange={(e) => setModeratorNotes(e.target.value)}
 placeholder="Fundamentação da decisão (violação das diretrizes comunitárias, sanção aplicada...)"
 rows={5}
 className="rounded-lg text-xs"
 />
 </div>
 </div>
 </SheetPage>
 </div>
 );
}
