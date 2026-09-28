import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, FileText, History, Search, CheckCircle2, Edit, Eye, Loader2, Lock, Globe, User, Hash, Clock, Layers } from 'lucide-react';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listLegalDocuments, updateLegalDocument, listConsentLogs, getConsentStats } from "@/services/legal.functions";

export const Route = createFileRoute("/admin-master/termos")({
 head: () => ({ meta: [{ title: "Termos e Políticas da Plataforma | Waesy Master" }] }),
 loader: async () => {
   try {
 const [documents, logsRes, stats] = await Promise.all([
 listLegalDocuments().catch(() => []),
 listConsentLogs({ data: { limit: 50, offset: 0 } }).catch(() => ({ logs: [], total: 0 })),
 getConsentStats().catch(() => ({
 totalAcceptances: 0,
 cookieAcceptances: 0,
 privacyAcceptances: 0,
 termsAcceptances: 0,
 authenticatedAcceptances: 0,
 })),
 ]);
 return { documents, logs: logsRes.logs, totalLogs: logsRes.total, stats };
   } catch (err) {
     console.error("[loader:admin-master.termos] Unhandled loader error:", err);
     return { documents: null, logs: null, totalLogs: null, stats: null };
   }
 },
 component: AdminMasterTermosPage,
});

function AdminMasterTermosPage() {
 const { documents: initialDocs, logs: initialLogs, totalLogs, stats } = ((Route.useLoaderData?.() as any) || {});

 const [documents, setDocuments] = useState(initialDocs);
 const [logs, setLogs] = useState(initialLogs);
 const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
 const [isEditingDoc, setIsEditingDoc] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);

 // Modal de Detalhes do Aceite
 const [selectedLog, setSelectedLog] = useState<any | null>(null);

 // Filtros de Logs
 const [termFilter, setTermFilter] = useState("all");
 const [searchLog, setSearchLog] = useState("");
 const [isLoadingLogs, setIsLoadingLogs] = useState(false);

 // Form State para Edição de Documento
 const [editTitle, setEditTitle] = useState("");
 const [editVersion, setEditVersion] = useState("");
 const [editSummary, setEditSummary] = useState("");
 const [editMarkdown, setEditMarkdown] = useState("");
 const [editPublished, setEditPublished] = useState(true);

 const handleOpenEdit = (doc: any) => {
 setSelectedDoc(doc);
 setEditTitle(doc.title);
 setEditVersion(doc.version || "2.0");
 setEditSummary(doc.summary || "");
 setEditMarkdown(doc.content_markdown || "");
 setEditPublished(doc.is_published ?? true);
 setIsEditingDoc(true);
 };

 const handleSaveDoc = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedDoc) return;

 setIsSubmitting(true);
 try {
 const updated = await updateLegalDocument({
 data: {
 id: selectedDoc.id,
 title: editTitle,
 version: editVersion,
 summary: editSummary,
 content_markdown: editMarkdown,
 is_published: editPublished,
 },
 });

 setDocuments((prev: any[]) => prev.map((d) => (d.id === updated.id ? updated : d)));
 toast.success(`Documento "${updated.title}" atualizado com sucesso!`);
 setIsEditingDoc(false);
 } catch (err: any) {
 toast.error(err.message || "Erro ao salvar alterações do documento.");
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleFilterLogs = async (termType: string, search: string) => {
 setIsLoadingLogs(true);
 try {
 const res = await listConsentLogs({
 data: {
 term_type: termType === "all" ? undefined : termType,
 search: search || undefined,
 limit: 50,
 offset: 0,
 },
 });
 setLogs(res.logs);
 } catch {
 toast.error("Erro ao filtrar logs de consentimento.");
 } finally {
 setIsLoadingLogs(false);
 }
 };

 return (
 <div className="space-y-8 max-w-6xl pb-16">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5">
 <div>
 <div className="flex items-center gap-2">
 <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary">
 Governança e Compliance
 </span>
 <Badge variant="outline" className="text-[10px] rounded-full border-primary/30 text-primary">
 <ShieldCheck className="size-3 mr-1 inline" /> LGPD Ativo
 </Badge>
 </div>
 <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight mt-1">
 Termos e Políticas da Plataforma
 </h1>
 <p className="text-xs text-muted-foreground mt-0.5">
 Documentos legais, termos de uso e conformidade LGPD
 </p>
 </div>
 </div>

 {/* Métricas de Governança */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
 <div className="p-4 rounded-2xl bg-card ">
 <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
 Total de Aceites
 </span>
 <p className="text-xl sm:text-2xl font-black text-foreground mt-1">
 {stats.totalAcceptances}
 </p>
 <span className="text-[10px] text-primary font-medium flex items-center gap-1 mt-0.5">
 <ShieldCheck className="size-3" /> Logs Registrados
 </span>
 </div>

 <div className="p-4 rounded-2xl bg-card ">
 <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
 Aceites de Cookies
 </span>
 <p className="text-xl sm:text-2xl font-black text-foreground mt-1">
 {stats.cookieAcceptances}
 </p>
 <span className="text-[10px] text-muted-foreground font-medium">
 Banner de Consentimento
 </span>
 </div>

 <div className="p-4 rounded-2xl bg-card ">
 <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
 Termos e LGPD
 </span>
 <p className="text-xl sm:text-2xl font-black text-foreground mt-1">
 {stats.privacyAcceptances + stats.termsAcceptances}
 </p>
 <span className="text-[10px] text-muted-foreground font-medium">
 Políticas e Contratos
 </span>
 </div>

 <div className="p-4 rounded-2xl bg-card ">
 <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
 Usuários Logados
 </span>
 <p className="text-xl sm:text-2xl font-black text-foreground mt-1">
 {stats.authenticatedAcceptances}
 </p>
 <span className="text-[10px] text-primary font-medium flex items-center gap-1 mt-0.5">
 <Lock className="size-3" /> Vínculo Permanente
 </span>
 </div>
 </div>

 {/* Tabs */}
 <Tabs defaultValue="documents" className="space-y-6">
 <TabsList className="grid w-full sm:w-[480px] grid-cols-2">
 <TabsTrigger value="documents" className="font-bold text-xs">
 <FileText className="size-3.5 mr-1.5" />
 Políticas da Plataforma ({documents.length})
 </TabsTrigger>
 <TabsTrigger value="logs" className="font-bold text-xs">
 <History className="size-3.5 mr-1.5" />
 Histórico de Aceites
 </TabsTrigger>
 </TabsList>

 {/* ── ABA 1: DOCUMENTOS DA PLATAFORMA ── */}
 <TabsContent value="documents" className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {documents.map((doc: any) => (
 <div
 key={doc.id}
 className="p-5 rounded-2xl bg-card hover:border-primary/40 transition-all flex flex-col justify-between gap-4 "
 >
 <div className="space-y-2">
 <div className="flex items-center justify-between gap-2">
 <Badge variant="outline" className="text-[10px] font-mono uppercase bg-primary/5 text-primary border-primary/20">
 /{doc.slug}
 </Badge>
 <span className="text-[10px] font-mono text-muted-foreground">
 v{doc.version || "1.0"}
 </span>
 </div>

 <h3 className="text-base font-bold text-foreground leading-snug">
 {doc.title}
 </h3>

 {doc.summary && (
 <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
 {doc.summary}
 </p>
 )}
 </div>

 <div className="flex items-center justify-between gap-2 pt-3 ">
 <span className="text-[10px] text-muted-foreground">
 {doc.is_published ? (
 <span className="text-emerald-600 font-semibold flex items-center gap-1">
 ● Publicado Online
 </span>
 ) : (
 <span className="text-amber-600 font-semibold flex items-center gap-1">
 ○ Rascunho Interno
 </span>
 )}
 </span>

 <div className="flex items-center gap-2">
 <Button
 size="sm"
 variant="outline"
 className="rounded-xl text-xs font-bold h-8"
 onClick={() => handleOpenEdit(doc)}
 >
 <Edit className="size-3 mr-1" />
 Editar Conteúdo
 </Button>
 </div>
 </div>
 </div>
 ))}
 </div>
 </TabsContent>

 {/* ── ABA 2: HISTÓRICO DE ACEITES ── */}
 <TabsContent value="logs" className="space-y-4">
 {/* Filtros */}
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
 <div className="flex items-center gap-2 flex-wrap">
 <Button
 size="sm"
 variant={termFilter === "all" ? "default" : "outline"}
 className="rounded-xl text-xs font-bold h-8"
 onClick={() => {
 setTermFilter("all");
 handleFilterLogs("all", searchLog);
 }}
 >
 Todos ({totalLogs})
 </Button>
 <Button
 size="sm"
 variant={termFilter === "cookie_policy" ? "default" : "outline"}
 className="rounded-xl text-xs font-bold h-8"
 onClick={() => {
 setTermFilter("cookie_policy");
 handleFilterLogs("cookie_policy", searchLog);
 }}
 >
 Cookies
 </Button>
 <Button
 size="sm"
 variant={termFilter === "privacy_policy" ? "default" : "outline"}
 className="rounded-xl text-xs font-bold h-8"
 onClick={() => {
 setTermFilter("privacy_policy");
 handleFilterLogs("privacy_policy", searchLog);
 }}
 >
 Privacidade
 </Button>
 <Button
 size="sm"
 variant={termFilter === "terms_of_service" ? "default" : "outline"}
 className="rounded-xl text-xs font-bold h-8"
 onClick={() => {
 setTermFilter("terms_of_service");
 handleFilterLogs("terms_of_service", searchLog);
 }}
 >
 Termos de Uso
 </Button>
 </div>

 <div className="relative max-w-xs w-full">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
 <Input
 placeholder="Buscar por IP ou Hash..."
 value={searchLog}
 onChange={(e) => {
 setSearchLog(e.target.value);
 handleFilterLogs(termFilter, e.target.value);
 }}
 className="pl-8 text-xs rounded-xl h-8"
 />
 </div>
 </div>

 {/* Tabela de Logs */}
 <div className=" rounded-2xl overflow-hidden bg-card ">
 {isLoadingLogs ? (
 <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2 text-xs">
 <Loader2 className="size-4 animate-spin" />
 <span>Carregando trilha de auditoria...</span>
 </div>
 ) : logs.length === 0 ? (
 <div className="py-12 text-center space-y-2">
 <ShieldCheck className="size-8 text-muted-foreground mx-auto" />
 <p className="text-xs font-bold text-foreground">Nenhum aceite encontrado com estes filtros</p>
 <p className="text-[11px] text-muted-foreground">
 Os aceites de novos visitantes e membros cadastrados aparecerão aqui em tempo real.
 </p>
 </div>
 ) : (
 <div className="overflow-x-auto no-scrollbar">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-[11px] uppercase font-bold">Tipo de Termo</TableHead>
 <TableHead className="text-[11px] uppercase font-bold">Titular / Usuário</TableHead>
 <TableHead className="text-[11px] uppercase font-bold">Endereço IP Real</TableHead>
 <TableHead className="text-[11px] uppercase font-bold">Versão</TableHead>
 <TableHead className="text-[11px] uppercase font-bold">Timestamp UTC</TableHead>
 <TableHead className="text-[11px] uppercase font-bold text-right">Detalhes</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {logs.map((log: any) => (
 <TableRow key={log.id}>
 <TableCell>
 <Badge variant="outline" className="text-[10px] font-mono uppercase bg-muted/60">
 {log.term_type}
 </Badge>
 </TableCell>
 <TableCell>
 {log.profiles ? (
 <div className="flex items-center gap-1.5">
 <User className="size-3.5 text-primary shrink-0" />
 <div className="min-w-0">
 <p className="text-xs font-bold text-foreground truncate leading-tight">
 {log.profiles.name || log.profiles.email}
 </p>
 <span className="text-[10px] text-muted-foreground block truncate">
 {log.profiles.email}
 </span>
 </div>
 </div>
 ) : (
 <span className="text-xs text-muted-foreground flex items-center gap-1">
 <Globe className="size-3" /> Visitante Anônimo
 </span>
 )}
 </TableCell>
 <TableCell className="font-mono text-xs text-muted-foreground">
 {log.ip_address || "Não capturado"}
 </TableCell>
 <TableCell className="font-mono text-xs">
 v{log.version || "2.0"}
 </TableCell>
 <TableCell className="text-xs text-muted-foreground">
 {new Intl.DateTimeFormat("pt-BR", {
 dateStyle: "short",
 timeStyle: "medium",
 }).format(new Date(log.accepted_at))}
 </TableCell>
 <TableCell className="text-right">
 <Button
 size="sm"
 variant="ghost"
 className="rounded-xl text-xs font-semibold h-7 gap-1"
 onClick={() => setSelectedLog(log)}
 >
 <Eye className="size-3 text-primary" />
 <span>Ver Dossiê</span>
 </Button>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 )}
 </div>
 </TabsContent>
 </Tabs>

 {/* Sheet para Edição de Documento Legal */}
 <Sheet open={isEditingDoc} onOpenChange={setIsEditingDoc}>
 <SheetContent size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] overflow-y-auto no-scrollbar">
 <SheetHeader>
 <SheetTitle>Editar Documento Legal</SheetTitle>
 <SheetDescription>
 Atualize a versão, sumário e texto em Markdown deste termo oficial.
 </SheetDescription>
 </SheetHeader>

 {selectedDoc && (
 <form onSubmit={handleSaveDoc} className="space-y-5 mt-6">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Título do Documento</Label>
 <Input
 value={editTitle}
 onChange={(e) => setEditTitle(e.target.value)}
 className="rounded-xl"
 required
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Versão</Label>
 <Input
 value={editVersion}
 onChange={(e) => setEditVersion(e.target.value)}
 className="rounded-xl font-mono text-xs"
 required
 />
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Slug da URL</Label>
 <Input
 value={`/${selectedDoc.slug}`}
 disabled
 className="rounded-xl font-mono text-xs bg-muted/60"
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Sumário / Resumo Executivo</Label>
 <Input
 value={editSummary}
 onChange={(e) => setEditSummary(e.target.value)}
 className="rounded-xl text-xs"
 placeholder="Resumo breve exibido no topo da página..."
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Conteúdo em Markdown</Label>
 <textarea
 rows={14}
 value={editMarkdown}
 onChange={(e) => setEditMarkdown(e.target.value)}
 className="w-full p-3 rounded-xl bg-background text-xs font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/20"
 required
 />
 </div>

 <div className="flex items-center justify-between pt-4 ">
 <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
 <input
 type="checkbox"
 checked={editPublished}
 onChange={(e) => setEditPublished(e.target.checked)}
 className="rounded text-primary focus:ring-primary size-4"
 />
 <span>Disponível e Publicado Online</span>
 </label>

 <div className="flex items-center gap-2">
 <Button
 type="button"
 variant="outline"
 className="rounded-xl text-xs"
 onClick={() => setIsEditingDoc(false)}
 >
 Cancelar
 </Button>
 <Button
 type="submit"
 disabled={isSubmitting}
 className="rounded-xl text-xs font-bold bg-primary text-primary-foreground"
 >
 {isSubmitting ? (
 <Loader2 className="size-3.5 animate-spin mr-1.5" />
 ) : (
 <CheckCircle2 className="size-3.5 mr-1.5" />
 )}
 <span>Salvar Alterações</span>
 </Button>
 </div>
 </div>
 </form>
 )}
 </SheetContent>
 </Sheet>

 {/* Dialog de Detalhes do Aceite */}
 <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
 <DialogContent className="sm:max-w-xl">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <ShieldCheck className="size-5 text-primary" />
 <span>Detalhes do Aceite</span>
 </DialogTitle>
 <DialogDescription>
 Informações sobre o aceite de termos realizado pelo usuário.
 </DialogDescription>
 </DialogHeader>

 {selectedLog && (
 <div className="space-y-4 text-xs mt-3">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl bg-muted/50 font-mono text-[11px]">
 <div>
 <span className="text-muted-foreground block text-[10px] uppercase font-bold">ID do Registro</span>
 <span className="text-foreground">{selectedLog.id}</span>
 </div>
 <div>
 <span className="text-muted-foreground block text-[10px] uppercase font-bold">Termo / Tipo</span>
 <span className="text-foreground font-bold">{selectedLog.term_type} (v{selectedLog.version})</span>
 </div>
 <div>
 <span className="text-muted-foreground block text-[10px] uppercase font-bold">IP de Origem</span>
 <span className="text-foreground">{selectedLog.ip_address || "Não informado"}</span>
 </div>
 <div>
 <span className="text-muted-foreground block text-[10px] uppercase font-bold">Data e Hora (UTC)</span>
 <span className="text-foreground">{selectedLog.accepted_at}</span>
 </div>
 </div>

 <div className="space-y-1">
 <span className="font-bold text-foreground block">Identificador de Segurança</span>
 <div className="p-2 rounded-xl bg-card font-mono text-[11px] text-primary break-all">
 {selectedLog.signature_hash || "Calculado via protocolo seguro"}
 </div>
 </div>

 <div className="space-y-1">
 <span className="font-bold text-foreground block">Navegador / User-Agent</span>
 <div className="p-2 rounded-xl bg-muted/40 font-mono text-[10px] text-muted-foreground break-all">
 {selectedLog.user_agent || "Desconhecido"}
 </div>
 </div>

 {selectedLog.profiles && (
 <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
 <span className="font-bold text-primary block">Titular Autenticado</span>
 <p className="text-foreground font-semibold">{selectedLog.profiles.name} ({selectedLog.profiles.email})</p>
 <p className="text-muted-foreground text-[10px]">ID: {selectedLog.profiles.id}</p>
 </div>
 )}
 </div>
 )}
 </DialogContent>
 </Dialog>
 </div>
 );
}
