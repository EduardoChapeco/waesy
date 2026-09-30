import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStoreMysteryAudits, reportStoreHardshipOrDispute } from "@/services/curadoria.functions";

export const Route = createFileRoute("/workspace/qualidade")({
 head: () => ({ meta: [{ title: "Qualidade | Workspace Waesy" }] }),
 loader: async () => {
 try {
 const audits = await getStoreMysteryAudits();
 return { audits: audits || [] };
 } catch (e) {
 console.error("[workspace.qualidade] loader error:", e);
 return { audits: [] };
 }
 },
 component: WorkspaceQualidadePage,
});

export default function WorkspaceQualidadePage() {
 const loaderData = Route.useLoaderData();
 const [audits, setAudits] = useState(loaderData.audits);
 const [hardshipModalOpen, setHardshipModalOpen] = useState(false);
 const [selectedAudit, setSelectedAudit] = useState<any>(null);
 const [disputeReason, setDisputeReason] = useState("");
 const [hardshipLevel, setHardshipLevel] = useState<"low" | "medium" | "severe" | "critical">("medium");
 const [isSubmitting, setIsSubmitting] = useState(false);

 const handleOpenHardshipModal = (audit: any) => {
 setSelectedAudit(audit);
 setDisputeReason("");
 setHardshipLevel("medium");
 setHardshipModalOpen(true);
 };

 const handleSubmitHardship = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedAudit || !disputeReason) {
 toast.error("Preencha a descrição do relato.");
 return;
 }

 try {
 setIsSubmitting(true);
 const res = await reportStoreHardshipOrDispute({
 data: {
 audit_id: selectedAudit.id,
 dispute_reason: disputeReason,
 hardship_level: hardshipLevel,
 },
 });

 toast.success(res.message);
 setHardshipModalOpen(false);

 const updated = await getStoreMysteryAudits();
 setAudits(updated || []);
 } catch (err: any) {
 toast.error(err.message || "Erro ao enviar relato.");
 } finally {
 setIsSubmitting(false);
 }
 };

 const averageRating =
 audits.length > 0
 ? (
 audits.reduce((acc: number, a: any) => acc + (a.rating_overall || 5), 0) /
 audits.length
 ).toFixed(1)
 : "5.0";

 return (
 <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-8 space-y-6 bg-background">
 {/* Header Silencioso */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
 <div>
 <h1 className="text-xl font-bold tracking-tight">Qualidade</h1>
 <p className="text-xs text-muted-foreground mt-0.5">
 Inspeções de qualidade, auditorias anônimas e programa de apoio solidário.
 </p>
 </div>

 <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 w-fit">
 Estabelecimento Verificado
 </Badge>
 </div>

 {/* Grid de Métricas Limpo */}
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
 <div className="p-4 rounded-xl border border-border/60 bg-card">
 <span className="text-xs text-muted-foreground font-medium block">Índice de Qualidade</span>
 <div className="text-2xl font-bold tracking-tight text-foreground mt-1">
 {averageRating} <span className="text-xs font-normal text-muted-foreground">/ 5.0</span>
 </div>
 <span className="text-xs text-muted-foreground">média das auditorias</span>
 </div>

 <div className="p-4 rounded-xl border border-border/60 bg-card">
 <span className="text-xs text-muted-foreground font-medium block">Auditorias Realizadas</span>
 <div className="text-2xl font-bold tracking-tight text-foreground mt-1">{audits.length}</div>
 <span className="text-xs text-muted-foreground">inspeções anônimas</span>
 </div>

 <div className="p-4 rounded-xl border border-border/60 bg-card col-span-2 sm:col-span-1">
 <span className="text-xs text-muted-foreground font-medium block">Canal Solidário</span>
 <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">Disponível</div>
 <span className="text-xs text-muted-foreground">apoio em momentos de dificuldade</span>
 </div>
 </div>

 {/* Tabela de Auditorias Recebidas */}
 <div className="space-y-2">
 <h2 className="text-sm font-bold text-foreground">Histórico de Auditorias</h2>

 <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-xs">Código</TableHead>
 <TableHead className="text-xs">Item Auditado</TableHead>
 <TableHead className="text-xs">Custo Absorvido</TableHead>
 <TableHead className="text-xs">Nota Geral</TableHead>
 <TableHead className="text-xs text-right">Ação</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {audits.length === 0 ? (
 <TableRow>
 <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-xs">
 Nenhuma auditoria recente registrada para esta loja.
 </TableCell>
 </TableRow>
 ) : (
 audits.map((a: any) => (
 <TableRow key={a.id}>
 <TableCell className="text-xs font-mono font-medium py-2.5">
 {a.masked_auditor_code || "AUD-COMMUNITY"}
 </TableCell>
 <TableCell className="text-xs font-medium py-2.5">
 {a.product_name}
 </TableCell>
 <TableCell className="text-xs font-mono text-muted-foreground py-2.5">
 {((a.cost_cents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
 </TableCell>
 <TableCell className="text-xs font-semibold py-2.5">
 {a.rating_overall ? `${a.rating_overall}/5` : "Em Análise"}
 </TableCell>
 <TableCell className="text-right py-2.5">
 {(!a.dispute_status || a.dispute_status === "none") ? (
 <Button
 size="sm"
 variant="ghost"
 onClick={() => handleOpenHardshipModal(a)}
 className="text-xs h-7 px-2"
 >
 Relatar Dificuldade
 </Button>
 ) : (
 <Badge variant="outline" className="text-xs">
 {a.dispute_status === "pending_review" ? "Em Análise" : "Apoio Concedido"}
 </Badge>
 )}
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </div>
 </div>

 {/* Modal Relatar Dificuldade */}
 <Dialog open={hardshipModalOpen} onOpenChange={setHardshipModalOpen}>
 <DialogContent className="sm:max-w-sm sm:w-full">
 <DialogHeader>
 <DialogTitle className="text-base font-bold">Relatar Dificuldade Financeira</DialogTitle>
 <DialogDescription className="text-xs">
 Solicite apoio da moderação para isenção e impulso algorítmico de vendas.
 </DialogDescription>
 </DialogHeader>

 <form onSubmit={handleSubmitHardship} className="space-y-3 py-2 text-xs">
 <div className="space-y-1">
 <Label className="text-xs">Impacto no Momento</Label>
 <Select value={hardshipLevel} onValueChange={(v: any) => setHardshipLevel(v)}>
 <SelectTrigger className="h-9">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="low">Baixo</SelectItem>
 <SelectItem value="medium">Médio (Queda de movimento)</SelectItem>
 <SelectItem value="severe">Severo (Dificuldade de caixa)</SelectItem>
 <SelectItem value="critical">Crítico</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1">
 <Label className="text-xs">Descrição da Situação</Label>
 <Textarea
 rows={3}
 value={disputeReason}
 onChange={(e) => setDisputeReason(e.target.value)}
 placeholder="Descreva brevemente a situação da sua loja..."
 required
 />
 </div>

 <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
 <Button type="button" variant="outline" onClick={() => setHardshipModalOpen(false)} className="w-full sm:w-auto text-xs h-9">
 Cancelar
 </Button>
 <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto text-xs h-9 font-semibold">
 {isSubmitting && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
 Enviar Relato
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 </div>
 );
}
