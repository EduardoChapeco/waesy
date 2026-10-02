import React, { useState } from "react";
import { FileText, AlertTriangle, Clock, Plus, Trash2, ExternalLink, ShieldCheck, CheckCircle2, Calendar, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileAttachmentUpload } from "@/components/ui/file-attachment-upload";
import { createCustomerDocument, deleteCustomerDocument } from "@/services/crm.functions";

const DOC_TYPES = [
 { value: "passport", label: "Passaporte" },
 { value: "cnh", label: "CNH (Carteira de Motorista)" },
 { value: "rg", label: "RG (Identidade)" },
 { value: "cpf", label: "CPF" },
 { value: "visa", label: "Visto Consular" },
 { value: "vaccination_card", label: "Certificado / Cartão de Vacina" },
 { value: "contract", label: "Contrato Assinado" },
 { value: "proof_of_residence", label: "Comprovante de Residência" },
 { value: "other", label: "Outro Documento" },
];

export interface CustomerDoc {
 id: string;
 doc_type: string;
 doc_number: string | null;
 issued_at: string | null;
 expires_at: string | null;
 file_url: string | null;
 notes: string | null;
 expiryStatus: "valid" | "soon" | "expired";
 created_at: string;
}

export function DocumentsPanel({
 customerId,
 documents = [],
 onRefresh,
}: {
 customerId: string;
 documents: CustomerDoc[];
 onRefresh: () => void;
}) {
 const [modalOpen, setModalOpen] = useState(false);
 const [submitting, setSubmitting] = useState(false);

 const [docType, setDocType] = useState<string>("passport");
 const [docNumber, setDocNumber] = useState("");
 const [issuedAt, setIssuedAt] = useState("");
 const [expiresAt, setExpiresAt] = useState("");
 const [fileUrl, setFileUrl] = useState("");
 const [notes, setNotes] = useState("");

 const expiredCount = documents.filter((d) => d.expiryStatus === "expired").length;
 const soonCount = documents.filter((d) => d.expiryStatus === "soon").length;

 const handleCreate = async () => {
 setSubmitting(true);
 try {
 await createCustomerDocument({
 data: {
 customerId,
 docType: docType as any,
 docNumber: docNumber.trim() || null,
 issuedAt: issuedAt || null,
 expiresAt: expiresAt || null,
 fileUrl: fileUrl.trim() || null,
 notes: notes.trim() || null,
 },
 });

 toast.success("Documento adicionado com sucesso!");
 setModalOpen(false);
 setDocNumber("");
 setIssuedAt("");
 setExpiresAt("");
 setFileUrl("");
 setNotes("");
 onRefresh();
 } catch (err: any) {
 toast.error(err.message || "Erro ao adicionar documento.");
 } finally {
 setSubmitting(false);
 }
 };

 const handleDelete = async (docId: string) => {
 if (!confirm("Deseja realmente remover este documento?")) return;
 try {
 await deleteCustomerDocument({ data: { documentId: docId } });
 toast.success("Documento removido.");
 onRefresh();
 } catch (err: any) {
 toast.error(err.message || "Erro ao remover documento.");
 }
 };

 return (
 <div className="space-y-4">
 {/* Header com Alertas e Botão de Ação */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border">
 <div className="flex items-center gap-3">
 <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
 <FileText className="size-5" />
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h3 className="font-bold text-sm text-foreground">Documentos</h3>
 <Badge variant="outline" className="font-mono text-xs">
 {documents.length}
 </Badge>
 </div>
 <p className="text-xs text-muted-foreground">
 Passaportes, CNHs, vistos consulares e registros com controle de validade e alertas.
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2 shrink-0">
 {expiredCount > 0 && (
 <Badge variant="destructive" className="gap-1 text-xs font-semibold py-1">
 <AlertTriangle className="size-3" />
 <span>{expiredCount} Vencido(s)</span>
 </Badge>
 )}

 {soonCount > 0 && (
 <Badge variant="secondary" className="gap-1 text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 py-1">
 <Clock className="size-3" />
 <span>{soonCount} Vence(m) em breve</span>
 </Badge>
 )}

 <Button
 size="sm"
 onClick={() => setModalOpen(true)}
 className="rounded-lg text-xs font-bold gap-2 h-9 bg-primary text-primary-foreground cursor-pointer"
 >
 <Plus className="size-3.5" />
 <span>Adicionar Documento</span>
 </Button>
 </div>
 </div>

 {/* Grid de Documentos */}
 {documents.length === 0 ? (
 <div className="py-12 text-center rounded-lg border border-dashed border-border p-8 bg-card/40 space-y-3">
 <FileText className="size-10 mx-auto text-muted-foreground/40" />
 <div className="space-y-1">
 <h4 className="font-bold text-sm text-foreground">Nenhum documento cadastrado</h4>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Adicione passaportes, CNH ou vistos para acompanhar a expiração e facilitar reservas de viagens.
 </p>
 </div>
 <Button
 variant="outline"
 size="sm"
 onClick={() => setModalOpen(true)}
 className="rounded-lg text-xs font-semibold"
 >
 + Adicionar Primeiro Documento
 </Button>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {documents.map((doc) => {
 const typeLabel = DOC_TYPES.find((t) => t.value === doc.doc_type)?.label || doc.doc_type;
 const isExpired = doc.expiryStatus === "expired";
 const isSoon = doc.expiryStatus === "soon";

 return (
 <div
 key={doc.id}
 className={`p-4 rounded-lg border transition-all ${
 isExpired
 ? "border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/10"
 : isSoon
 ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/10"
 : "border-border bg-card"
 }`}
 >
 <div className="flex items-start justify-between gap-2">
 <div className="flex items-center gap-2">
 <span className="font-bold text-xs text-foreground">{typeLabel}</span>
 {isExpired && (
 <Badge variant="destructive" className="text-[10px] font-bold py-0 h-4">
 VENCIDO
 </Badge>
 )}
 {isSoon && (
 <Badge variant="secondary" className="text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 py-0 h-4">
 VENCE EM BREVE
 </Badge>
 )}
 {!isExpired && !isSoon && doc.expires_at && (
 <Badge variant="outline" className="text-[10px] font-semibold text-emerald-600 border-emerald-500/30 py-0 h-4">
 VÁLIDO
 </Badge>
 )}
 </div>

 <button
 type="button"
 onClick={() => handleDelete(doc.id)}
 className="text-muted-foreground hover:text-destructive transition-colors p-1"
 title="Excluir documento"
 >
 <Trash2 className="size-3.5" />
 </button>
 </div>

 {doc.doc_number && (
 <p className="font-mono text-xs font-bold text-foreground mt-1">
 Nº {doc.doc_number}
 </p>
 )}

 <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
 {doc.issued_at && (
 <div>
 <span className="text-[10px] block text-muted-foreground/80">Emissão</span>
 <span className="font-medium text-foreground">
 {new Date(doc.issued_at + "T00:00:00").toLocaleDateString("pt-BR")}
 </span>
 </div>
 )}

 {doc.expires_at && (
 <div>
 <span className="text-[10px] block text-muted-foreground/80">Validade</span>
 <span className={`font-bold ${isExpired ? "text-destructive" : isSoon ? "text-amber-600" : "text-foreground"}`}>
 {new Date(doc.expires_at + "T00:00:00").toLocaleDateString("pt-BR")}
 </span>
 </div>
 )}
 </div>

 {doc.notes && (
 <p className="text-[11px] text-muted-foreground italic mt-2 bg-muted/30 p-2 rounded-lg">
 "{doc.notes}"
 </p>
 )}

 {doc.file_url && (
 <div className="mt-2 pt-1">
 <a
 href={doc.file_url}
 target="_blank"
 rel="noreferrer"
 className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
 >
 <ExternalLink className="size-3" />
 <span>Visualizar Anexo / Arquivo</span>
 </a>
 </div>
 )}
 </div>
 );
 })}
 </div>
 )}

 {/* Modal de Inclusão de Documento */}
 <Dialog open={modalOpen} onOpenChange={setModalOpen}>
 <DialogContent className="max-w-lg w-full rounded-lg p-6 space-y-4">
 <DialogHeader>
 <DialogTitle className="text-base font-bold flex items-center gap-2">
 <Plus className="size-4 text-primary" />
 <span>Adicionar Documento à Ficha</span>
 </DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 Cadastre passaportes, CNHs, vistos e contratos para controle e alertas.
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-3">
 <div className="space-y-1">
 <Label className="text-xs font-medium">Tipo de Documento *</Label>
 <Select value={docType} onValueChange={setDocType}>
 <SelectTrigger className="h-9 rounded-lg text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {DOC_TYPES.map((t) => (
 <SelectItem key={t.value} value={t.value}>
 {t.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-medium">Número do Documento</Label>
 <Input
 value={docNumber}
 onChange={(e) => setDocNumber(e.target.value)}
 placeholder="Ex: BR123456 ou 000.000.000-00"
 className="h-9 rounded-lg text-xs bg-background font-mono"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-xs font-medium">Data de Emissão</Label>
 <Input
 type="date"
 value={issuedAt}
 onChange={(e) => setIssuedAt(e.target.value)}
 className="h-9 rounded-lg text-xs bg-background"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-medium">Data de Validade</Label>
 <Input
 type="date"
 value={expiresAt}
 onChange={(e) => setExpiresAt(e.target.value)}
 className="h-9 rounded-lg text-xs bg-background"
 />
 </div>
 </div>

 <FileAttachmentUpload
 value={fileUrl}
 onChange={setFileUrl}
 onRemove={() => setFileUrl("")}
 label="Arquivo / Documento Digitalizado (Opcional)"
 helperText="Envie a foto ou PDF do documento (RG, Passaporte, Visto ou Contrato)"
 accept="image/*,application/pdf"
 bucket="cms-media"
 compact
 />

 <div className="space-y-1">
 <Label className="text-xs font-medium">Observações</Label>
 <Input
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="Ex: Passaporte italiano, emitido pelo consulado de Curitiba"
 className="h-9 rounded-lg text-xs bg-background"
 />
 </div>
 </div>

 <div className="pt-2 flex items-center justify-end gap-2">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => setModalOpen(false)}
 className="text-xs"
 >
 Cancelar
 </Button>
 <Button
 type="button"
 disabled={submitting}
 size="sm"
 onClick={handleCreate}
 className="text-xs font-bold bg-primary text-primary-foreground rounded-lg gap-2"
 >
 {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
 <span>Salvar Documento</span>
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 );
}
