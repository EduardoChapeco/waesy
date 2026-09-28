import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import { reportTagFraud } from "@/services/tag-audit.functions";
import { toast } from "sonner";

interface TagFraudDialogProps {
 isOpen: boolean;
 onClose: () => void;
 productId: string;
 storeId: string;
 productTitle: string;
}

export function TagFraudDialog({
 isOpen,
 onClose,
 productId,
 storeId,
 productTitle,
}: TagFraudDialogProps) {
 const [reason, setReason] = useState<
 "cobranca_frete_indevida" | "atraso_grave" | "brinde_nao_entregue" | "preco_falso" | "outro"
 >("cobranca_frete_indevida");
 const [description, setDescription] = useState("");
 const [contact, setContact] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isDone, setIsDone] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!description.trim()) {
 toast.error("Por favor, descreva o motivo da denúncia.");
 return;
 }

 setIsSubmitting(true);
 try {
 await reportTagFraud({
 data: {
 product_id: productId,
 store_id: storeId,
 report_reason: reason,
 description: description.trim(),
 consumer_contact: contact.trim() || undefined,
 },
 });
 setIsDone(true);
 toast.success("Denúncia enviada ao Comitê de Qualidade.");
 } catch {
 toast.error("Erro ao enviar denúncia. Tente novamente.");
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleResetAndClose = () => {
 setIsDone(false);
 setDescription("");
 onClose();
 };

 return (
 <Dialog open={isOpen} onOpenChange={handleResetAndClose}>
 <DialogContent className="sm:max-w-[460px] sm:rounded-2xl bg-card sm:p-6">
 <DialogHeader className="space-y-2">
 <div className="size-11 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-1">
 <ShieldAlert className="size-6" />
 </div>
 <DialogTitle className="text-lg font-bold text-foreground">
 Reportar Irregularidade de Oferta
 </DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 Protegemos nossa comunidade contra propaganda enganosa. Denúncias confirmadas resultam na
 suspensão da loja de todas as seções de destaque.
 </DialogDescription>
 </DialogHeader>

 {isDone ? (
 <div className="py-6 text-center space-y-3">
 <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
 <CheckCircle2 className="size-6" />
 </div>
 <h4 className="font-bold text-sm text-foreground">Denúncia Registrada</h4>
 <p className="text-xs text-muted-foreground max-w-xs mx-auto">
 Nossa equipe de auditoria revisará as tags de <strong>{productTitle}</strong>. Obrigado por manter a plataforma segura!
 </p>
 <Button onClick={handleResetAndClose} className="rounded-xl font-bold text-xs">
 Fechar
 </Button>
 </div>
 ) : (
 <form onSubmit={handleSubmit} className="space-y-4 pt-2">
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground">Motivo da Irregularidade</label>
 <select
 value={reason}
 onChange={(e) => setReason(e.target.value as any)}
 className="w-full h-10 px-3 rounded-xl bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
 >
 <option value="cobranca_frete_indevida">Cobrança de entrega em produto com tag "Entrega Grátis"</option>
 <option value="atraso_grave">Atraso grave em entrega prometida como "Expressa / Full"</option>
 <option value="brinde_nao_entregue">Não envio do brinde/bonificação (ex: Compre 2 Leve 1)</option>
 <option value="preco_falso">Preço cobrado diferente do anunciado no app</option>
 <option value="outro">Outra divergência nas condições da oferta</option>
 </select>
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground">Detalhes do Ocorrido</label>
 <textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder="Explique o que aconteceu (ex: o entregador cobrou R$ 10 de taxa mesmo com a tag de frete grátis)..."
 rows={3}
 className="w-full p-3 rounded-xl bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
 required
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground">WhatsApp ou E-mail (Opcional)</label>
 <input
 type="text"
 value={contact}
 onChange={(e) => setContact(e.target.value)}
 placeholder="Para eventual contato do nosso comitê"
 className="w-full h-10 px-3 rounded-xl bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
 />
 </div>

 <DialogFooter className="pt-2 gap-2 sm:gap-0">
 <Button
 type="button"
 variant="ghost"
 onClick={handleResetAndClose}
 className="rounded-xl font-bold text-xs"
 >
 Cancelar
 </Button>
 <Button
 type="submit"
 disabled={isSubmitting}
 className="rounded-xl font-bold text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
 >
 {isSubmitting ? "Enviando..." : "Enviar Denúncia"}
 </Button>
 </DialogFooter>
 </form>
 )}
 </DialogContent>
 </Dialog>
 );
}
