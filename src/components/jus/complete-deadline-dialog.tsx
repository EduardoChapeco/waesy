/**
 * complete-deadline-dialog.tsx — Protocolo & Cumprimento de Prazo Processual
 * Registra o número do protocolo do tribunal e data/hora exata do cumprimento.
 */

import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { CheckCircle2, FileCheck, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { completeLawsuitDeadline } from "@/services/jus.functions";

interface CompleteDeadlineDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 deadline: any | null;
}

export function CompleteDeadlineDialog({
 open,
 onOpenChange,
 deadline,
}: CompleteDeadlineDialogProps) {
 const router = useRouter();
 const [protocolReceipt, setProtocolReceipt] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);

 if (!deadline) return null;

 const handleComplete = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsSubmitting(true);
 try {
 await completeLawsuitDeadline({
 data: {
 id: deadline.id,
 protocol_receipt: protocolReceipt.trim() || null,
 },
 });

 toast.success("Prazo processual marcado como cumprido com sucesso!");
 onOpenChange(false);
 setProtocolReceipt("");
 router.invalidate();
 } catch (err: any) {
 toast.error(err.message || "Erro ao cumprir prazo");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-md rounded-2xl p-6">
 <DialogHeader className="space-y-2">
 <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider">
 <ShieldCheck className="size-4" />
 <span>Protocolo e Cumprimento</span>
 </div>
 <DialogTitle className="text-base font-bold text-foreground">
 Concluir Prazo: "{deadline.title}"
 </DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 Confirme a interposição da peça ou manifestação no tribunal. O ato será registrado com carimbo de tempo e arquivado.
 </DialogDescription>
 </DialogHeader>

 <form onSubmit={handleComplete} className="space-y-4 py-2">
 {deadline.process_number && (
 <div className="p-3 rounded-xl bg-muted/30 border border-border/80 space-y-1">
 <span className="text-[10px] font-bold text-muted-foreground uppercase font-mono">
 Processo Vinculado
 </span>
 <p className="font-mono text-xs font-bold text-foreground">
 {deadline.process_number}
 </p>
 </div>
 )}

 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted-foreground uppercase font-mono">
 Nº do Protocolo / Recibo Judicial (Opcional)
 </label>
 <Input
 value={protocolReceipt}
 onChange={(e) => setProtocolReceipt(e.target.value)}
 placeholder="Ex: 2026.0019283-1 ou recibo PJe/Eproc..."
 className="h-11 rounded-xl bg-background font-mono text-xs font-medium"
 />
 <p className="text-[10px] text-muted-foreground">
 Guarda probatória do cumprimento tempestivo da obrigação processual.
 </p>
 </div>

 <DialogFooter className="pt-4 flex sm:flex-row gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => onOpenChange(false)}
 className="h-11 px-4 rounded-xl text-xs font-bold"
 >
 Cancelar
 </Button>
 <Button
 type="submit"
 disabled={isSubmitting}
 className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2"
 >
 <CheckCircle2 className="size-4" />
 <span>{isSubmitting ? "Registrando..." : "Confirmar Protocolo"}</span>
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 );
}
