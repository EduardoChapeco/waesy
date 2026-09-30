import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Flag, CheckCircle2, XCircle, Eye, Trash2, AlertTriangle, Loader2, Filter, User, ExternalLink, ShieldCheck, MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { listModerationReports, resolveModerationReport } from "@/services/moderation.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatRelativeTime, formatDate } from "@/lib/datetime";

export const Route = createFileRoute("/workspace/moderacao/")({
 head: () => ({ meta: [{ title: "Moderação | Workspace Waesy" }] }),
 component: ModerationQueuePage,
});

const REASON_LABELS: Record<
 string,
 { label: string; variant: "destructive" | "default" | "secondary" | "outline" }
> = {
 fraud: { label: "Fraude / Golpe", variant: "destructive" },
 spam: { label: "Spam", variant: "secondary" },
 inappropriate: { label: "Conteúdo Impróprio", variant: "destructive" },
 illegal: { label: "Item Ilegal", variant: "destructive" },
 offensive: { label: "Discurso de Ódio", variant: "destructive" },
 misleading: { label: "Enganoso / Falso", variant: "secondary" },
 other: { label: "Outro Motivo", variant: "outline" },
};

const ENTITY_LABELS: Record<string, string> = {
 classified: "Classificado",
 post: "Post no Mural",
 event: "Evento",
 product: "Produto",
 profile: "Perfil de Usuário",
 comment: "Comentário",
};

function ModerationQueuePage() {
 const queryClient = useQueryClient();
 const [statusFilter, setStatusFilter] = useState<string>("pending");
 const [entityFilter, setEntityFilter] = useState<string>("all");
 const [selectedReport, setSelectedReport] = useState<any>(null);
 const [moderatorNotes, setModeratorNotes] = useState("");

 const { data: reports, isLoading } = useQuery({
 queryKey: ["moderation-reports", statusFilter, entityFilter],
 queryFn: () =>
 listModerationReports({
 data: {
 status: statusFilter as any,
 entityType: entityFilter as any,
 },
 }),
 });

 const resolveMutation = useMutation({
 mutationFn: resolveModerationReport,
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ["moderation-reports"] });
 toast.success("Ação de moderação executada com sucesso!");
 setSelectedReport(null);
 setModeratorNotes("");
 },
 onError: (err: any) => {
 toast.error(err?.message || "Erro ao processar moderação.");
 },
 });

 const handleAction = (action: "dismiss" | "remove_content" | "hide_content" | "warn_author") => {
 if (!selectedReport) return;
 resolveMutation.mutate({
 data: {
 reportId: selectedReport.id,
 action,
 moderatorNotes: moderatorNotes.trim() || undefined,
 },
 });
 };

 const pendingCount = (reports || []).filter((r: any) => r.status === "pending").length;

 return (
 <div className="space-y-6 max-w-6xl">
 {/* ── Header Operacional ─────────────────────────────────── */}
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
 <div>
 <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
 <ShieldAlert className="size-5 text-destructive" />
 <span>Moderação</span>
 </h1>
 <p className="text-xs text-muted-foreground mt-0.5">
 Gerencie denúncias de usuários, faça curadoria de conteúdo e aplique sanções a violações
 de diretrizes.
 </p>
 </div>

 <div className="flex items-center gap-2">
 <Badge variant="outline" className="text-xs font-semibold py-1 px-3 gap-1.5">
 <Flag className="size-3.5 text-destructive" />
 <span>{pendingCount} denúncias pendentes</span>
 </Badge>
 </div>
 </div>

 {/* ── Barra de Filtros ────────────────────────────────────── */}
 <div className="flex flex-wrap items-center gap-3 bg-muted/20 p-3 rounded-2xl ">
 <div className="flex items-center gap-2">
 <Filter className="size-4 text-muted-foreground" />
 <span className="text-xs font-semibold text-foreground">Filtrar:</span>
 </div>

 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger className="h-9 w-40 rounded-xl text-xs bg-background">
 <SelectValue placeholder="Status" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">Todos os Status</SelectItem>
 <SelectItem value="pending">Pendentes</SelectItem>
 <SelectItem value="in_review">Em Análise</SelectItem>
 <SelectItem value="resolved_removed">Removidos</SelectItem>
 <SelectItem value="resolved_dismissed">Descartados</SelectItem>
 </SelectContent>
 </Select>

 <Select value={entityFilter} onValueChange={setEntityFilter}>
 <SelectTrigger className="h-9 w-40 rounded-xl text-xs bg-background">
 <SelectValue placeholder="Tipo de Conteúdo" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">Todos os Tipos</SelectItem>
 <SelectItem value="classified">Classificados</SelectItem>
 <SelectItem value="post">Posts no Mural</SelectItem>
 <SelectItem value="event">Eventos</SelectItem>
 <SelectItem value="product">Produtos</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* ── Lista de Denúncias ─────────────────────────────────── */}
 {isLoading ? (
 <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
 <Loader2 className="size-6 animate-spin text-primary" />
 <p className="text-xs">Carregando fila de moderação...</p>
 </div>
 ) : reports && reports.length > 0 ? (
 <div className="space-y-3">
 {reports.map((rep: any) => {
 const reasonInfo = REASON_LABELS[rep.reason] || {
 label: rep.reason,
 variant: "outline",
 };
 const isPending = rep.status === "pending";

 return (
 <div
 key={rep.id}
 className="bg-card rounded-2xl p-5 border border-border/60 space-y-3 hover:border-border/80 transition-colors"
 >
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 border-b border-border/40">
 <div className="flex items-center gap-2 flex-wrap">
 <Badge
 variant={reasonInfo.variant}
 className="text-xs font-bold uppercase tracking-wider"
 >
 {reasonInfo.label}
 </Badge>
 <Badge variant="outline" className="text-xs font-semibold">
 {ENTITY_LABELS[rep.entity_type] || rep.entity_type}
 </Badge>
 <span className="text-xs text-muted-foreground">
 Denunciado {formatRelativeTime(rep.created_at)}
 </span>
 </div>

 <Badge
 variant={
 rep.status === "pending"
 ? "destructive"
 : rep.status === "resolved_removed"
 ? "default"
 : "outline"
 }
 className="text-xs font-mono uppercase"
 >
 {rep.status === "pending"
 ? "Pendente"
 : rep.status === "resolved_removed"
 ? "Conteúdo Removido"
 : rep.status === "resolved_dismissed"
 ? "Descartado"
 : rep.status}
 </Badge>
 </div>

 {/* Conteúdo da Denúncia */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
 <div className="md:col-span-2 space-y-2">
 <div>
 <span className="text-muted-foreground block text-xs uppercase font-bold tracking-wider">
 Conteúdo Alvo
 </span>
 <div className="flex items-center gap-2 mt-0.5">
 <strong className="text-sm font-bold text-foreground">
 {rep.entity_title || `ID: ${rep.entity_id}`}
 </strong>
 {rep.entity_type === "classified" && (
 <Button
 asChild
 variant="ghost"
 size="sm"
 className="h-6 px-2 text-xs gap-1"
 >
 <Link
 to="/classificados/$id"
 params={{ id: rep.entity_id }}
 target="_blank"
 >
 <ExternalLink className="size-3" />
 <span>Ver no Mural</span>
 </Link>
 </Button>
 )}
 </div>
 </div>

 {rep.description && (
 <p className="text-foreground/90 bg-muted/20 p-3 rounded-xl leading-relaxed">
 <strong className="text-foreground">
 Motivo informado pelo denunciante:
 </strong>{" "}
 {rep.description}
 </p>
 )}
 </div>

 <div className="space-y-2 border-t md:border-t-0 md: md:pl-4 pt-2 md:pt-0">
 <div>
 <span className="text-muted-foreground block text-xs uppercase font-bold tracking-wider">
 Denunciante
 </span>
 <span className="font-semibold text-foreground">
 {rep.reporter?.full_name || "Membro Anônimo"}
 </span>
 </div>

 {rep.moderator && (
 <div>
 <span className="text-muted-foreground block text-xs uppercase font-bold tracking-wider">
 Moderado por
 </span>
 <span className="font-semibold text-foreground">
 {rep.moderator.full_name} ({formatDate(rep.resolved_at)})
 </span>
 </div>
 )}
 </div>
 </div>

 {/* Botões de Ação do Moderador */}
 {isPending && (
 <div className="pt-2 flex items-center justify-end gap-2 ">
 <Button
 size="sm"
 variant="outline"
 onClick={() => {
 setSelectedReport(rep);
 }}
 className="rounded-xl text-xs font-semibold"
 >
 Avaliar e Aplicar Ação
 </Button>
 </div>
 )}
 </div>
 );
 })}
 </div>
 ) : (
 <div className="border-0 bg-card/60 rounded-2xl p-12 text-center space-y-3">
 <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
 <ShieldCheck className="size-6" />
 </div>
 <h2 className="text-base font-bold text-foreground">Fila de Moderação Limpa</h2>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Nenhuma denúncia pendente para o filtro selecionado. A comunidade está segura e em
 conformidade!
 </p>
 </div>
 )}

 {/* Modal de Ação do Moderador */}
 {selectedReport && (
 <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
 <DialogContent className="sm:max-w-md sm:rounded-2xl sm:p-6 p-5">
 <DialogHeader className="space-y-1">
 <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
 <ShieldAlert className="size-5 text-destructive" />
 <span>Moderação de Conteúdo</span>
 </DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 Decida se o conteúdo deve ser removido, ocultado ou se a denúncia deve ser
 descartada.
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4 py-2 text-xs">
 <div className="bg-muted/20 p-3 rounded-xl space-y-1">
 <p>
 <strong>Item:</strong> {selectedReport.entity_title || selectedReport.entity_id}
 </p>
 <p>
 <strong>Motivo:</strong>{" "}
 {REASON_LABELS[selectedReport.reason]?.label || selectedReport.reason}
 </p>
 {selectedReport.description && (
 <p>
 <strong>Justificativa do denunciante:</strong> {selectedReport.description}
 </p>
 )}
 </div>

 <div className="space-y-1.5">
 <label className="font-semibold text-foreground">
 Parecer do Moderador (opcional)
 </label>
 <Textarea
 value={moderatorNotes}
 onChange={(e) => setModeratorNotes(e.target.value)}
 placeholder="Justifique a ação tomada para fins de auditoria interna..."
 rows={3}
 className="rounded-xl text-xs bg-background resize-none"
 />
 </div>

 <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
 <Button
 onClick={() => handleAction("remove_content")}
 disabled={resolveMutation.isPending}
 className="w-full sm:flex-1 rounded-xl text-xs font-bold gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
 >
 <Trash2 className="size-3.5" />
 <span>Remover Conteúdo</span>
 </Button>

 <Button
 onClick={() => handleAction("dismiss")}
 disabled={resolveMutation.isPending}
 variant="outline"
 className="w-full sm:flex-1 rounded-xl text-xs font-semibold gap-1.5"
 >
 <CheckCircle2 className="size-3.5 text-emerald-500" />
 <span>Descartar Denúncia</span>
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 )}
 </div>
 );
}
