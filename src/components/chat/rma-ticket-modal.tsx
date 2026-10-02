import React, { useState } from "react";
import { AlertCircle, Camera, CheckCircle2, Loader2, RefreshCw, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaUploader } from "@/components/ui/media-uploader";
import { createSupportRmaTicket } from "@/services/chat.functions";
import { toast } from "sonner";

interface RmaTicketModalProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 threadId: string;
 storeId: string;
 orderId?: string;
 onTicketCreated?: () => void;
}

export const RmaTicketModal: React.FC<RmaTicketModalProps> = ({
 open,
 onOpenChange,
 threadId,
 storeId,
 orderId,
 onTicketCreated,
}) => {
 const [ticketType, setTicketType] = useState<
 "return_exchange" | "missing_item" | "defect_complaint" | "delivery_issue" | "billing_pix" | "other"
 >("return_exchange");
 const [title, setTitle] = useState("");
 const [description, setDescription] = useState("");
 const [photos, setPhotos] = useState<string[]>([]);
 const [isSubmitting, setIsSubmitting] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!title.trim() || !description.trim()) {
 toast.error("Por favor, preencha o título e a descrição do problema.");
 return;
 }

 setIsSubmitting(true);
 try {
 await createSupportRmaTicket({
 data: {
 threadId,
 store_id: storeId,
 order_id: orderId,
 ticket_type: ticketType,
 title,
 description,
 photo_urls: photos,
 },
 });

 toast.success("Solicitação de SAC/Troca aberta com sucesso!");
 setTitle("");
 setDescription("");
 setPhotos([]);
 onOpenChange(false);
 onTicketCreated?.();
 } catch (err: any) {
 toast.error(err.message || "Erro ao abrir solicitação.");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-lg sm:rounded-lg max-h-[90vh] overflow-y-auto no-scrollbar">
 <DialogHeader>
 <div className="flex items-center gap-2 text-destructive">
 <AlertCircle className="size-5" />
 <DialogTitle className="text-base font-bold">Solicitar Troca, Devolução ou Ajuda</DialogTitle>
 </div>
 <DialogDescription className="text-xs text-muted-foreground">
 Abra um chamado oficial para a loja registrar a ocorrência com fotos e histórico seguro.
 </DialogDescription>
 </DialogHeader>

 <form onSubmit={handleSubmit} className="space-y-4 py-2">
 <div className="space-y-2">
 <Label className="text-xs font-bold">Motivo do Chamado *</Label>
 <Select value={ticketType} onValueChange={(val: any) => setTicketType(val)}>
 <SelectTrigger className="h-10 rounded-lg text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-lg">
 <SelectItem value="return_exchange">Troca ou Devolução de Produto</SelectItem>
 <SelectItem value="defect_complaint">Produto com Defeito / Avaria</SelectItem>
 <SelectItem value="missing_item">Item Faltante ou Pedido Incorreto</SelectItem>
 <SelectItem value="delivery_issue">Problema com a Entrega / Atraso</SelectItem>
 <SelectItem value="billing_pix">Dúvida sobre Pagamento / Cobrança</SelectItem>
 <SelectItem value="other">Outro Assunto</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold">Resumo do Problema *</Label>
 <Input
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 placeholder="Ex: Tamanho errado, produto com rasgo, faltou refrigerante..."
 className="h-10 rounded-lg text-xs"
 required
 />
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold">Detalhes da Ocorrência *</Label>
 <Textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder="Explique o que aconteceu para que a equipe possa resolver o mais rápido possível..."
 rows={3}
 className="rounded-lg text-xs"
 required
 />
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold">Fotos do Produto / Comprovante (Opcional)</Label>
 <MediaUploader
 value={photos}
 onChange={setPhotos}
 bucket="post-media"
 folder="rma"
 maxFiles={4}
 aspect={4 / 3}
 enableCrop={true}
 />
 </div>

 <DialogFooter className="pt-2">
 <Button
 type="button"
 variant="ghost"
 onClick={() => onOpenChange(false)}
 className="rounded-lg text-xs"
 disabled={isSubmitting}
 >
 Cancelar
 </Button>
 <Button
 type="submit"
 disabled={isSubmitting}
 className="rounded-lg text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="size-4 animate-spin mr-2" />
 Enviando...
 </>
 ) : (
 "Abrir Chamado Oficial"
 )}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 );
};
