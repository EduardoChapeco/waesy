import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flag, ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { submitModerationReport } from "@/services/moderation.functions";

export interface ReportDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 entityType: "classified" | "post" | "event" | "product" | "profile" | "comment" | "service";
 entityId: string;
 entityTitle?: string;
}

const REPORT_REASONS = [
 { value: "fraud", label: "Fraude / Golpe / Valor Enganoso" },
 { value: "spam", label: "Spam / Publicação Repetitiva" },
 { value: "inappropriate", label: "Conteúdo Impróprio / Nudez / Violência" },
 { value: "illegal", label: "Item Ilegal / Proibido por Lei" },
 { value: "offensive", label: "Discurso de Ódio / Assédio / Ofensa" },
 { value: "misleading", label: "Informações Falsas / Categoria Incorreta" },
 { value: "other", label: "Outro Motivo" },
] as const;

export function ReportDialog({
 open,
 onOpenChange,
 entityType,
 entityId,
 entityTitle,
}: ReportDialogProps) {
 const [reason, setReason] = useState<string>("fraud");
 const [description, setDescription] = useState("");
 const [isSubmitted, setIsSubmitted] = useState(false);

 const reportMutation = useMutation({
 mutationFn: submitModerationReport,
 onSuccess: () => {
 setIsSubmitted(true);
 toast.success("Denúncia registrada com sucesso. Obrigado por proteger nossa comunidade!");
 },
 onError: (err: any) => {
 toast.error(err?.message || "Erro ao registrar denúncia.");
 },
 });

 const handleSubmit = () => {
 reportMutation.mutate({
 data: {
 entityType: (entityType === "service" ? "classified" : entityType) as any,
 entityId,
 entityTitle,
 reason: reason as any,
 description: description.trim() || undefined,
 },
 });
 };

 const handleClose = () => {
 onOpenChange(false);
 // Reset state after dialog closes
 setTimeout(() => {
 setIsSubmitted(false);
 setDescription("");
 setReason("fraud");
 }, 300);
 };

 return (
 <Dialog open={open} onOpenChange={handleClose}>
 <DialogContent className="sm:max-w-md sm:rounded-2xl sm:p-6 p-5">
 {!isSubmitted ? (
 <>
 <DialogHeader className="space-y-1">
 <div className="size-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mb-1">
 <Flag className="size-5" />
 </div>
 <DialogTitle className="text-base font-bold text-foreground">
 Denunciar Publicação
 </DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
 Nossa equipe de moderação e Trust e Safety analisará o conteúdo com base nos Termos
 de Uso e Diretrizes da Comunidade Waesy.
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4 py-2">
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Qual é o motivo da denúncia? *</Label>
 <Select value={reason} onValueChange={setReason}>
 <SelectTrigger className="h-10 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {REPORT_REASONS.map((r) => (
 <SelectItem key={r.value} value={r.value} className="text-xs">
 {r.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Detalhes adicionais (opcional)</Label>
 <Textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder="Descreva o que está errado com este conteúdo para ajudar a moderação..."
 rows={3}
 className="rounded-xl text-xs bg-background resize-none leading-relaxed"
 />
 </div>

 <div className="pt-2 flex items-center justify-end gap-2">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={handleClose}
 className="rounded-xl text-xs"
 >
 Cancelar
 </Button>

 <Button
 type="button"
 onClick={handleSubmit}
 disabled={reportMutation.isPending}
 className="rounded-xl text-xs font-bold gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
 >
 {reportMutation.isPending ? (
 <>
 <Loader2 className="size-3.5 animate-spin" />
 <span>Enviando...</span>
 </>
 ) : (
 <>
 <Flag className="size-3.5" />
 <span>Enviar Denúncia</span>
 </>
 )}
 </Button>
 </div>
 </div>
 </>
 ) : (
 <div className="text-center py-6 space-y-3">
 <CheckCircle2 className="size-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
 <h3 className="text-base font-bold text-foreground">Denúncia Registrada</h3>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
 Recebemos seu reporte. Nossa equipe analisará e tomará as providências cabíveis para
 manter a comunidade segura.
 </p>
 <Button onClick={handleClose} className="rounded-xl text-xs font-bold mt-3">
 Fechar
 </Button>
 </div>
 )}
 </DialogContent>
 </Dialog>
 );
}
