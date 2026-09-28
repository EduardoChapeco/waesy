import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { requestOrderReturn } from "@/services/order.functions";
import { useRouter } from "@tanstack/react-router";

export function ReturnModal({ orderId }: { orderId: string }) {
 const [open, setOpen] = useState(false);
 const [reason, setReason] = useState("");
 const [loading, setLoading] = useState(false);
 const router = useRouter();

 const handleSubmit = async () => {
 if (reason.length < 5) {
 toast.error("Por favor, descreva o motivo com mais detalhes.");
 return;
 }
 setLoading(true);
 try {
 const res = await requestOrderReturn({ data: { orderId, reason } });
 toast.success("Solicitação enviada com sucesso!");
 setOpen(false);
 router.invalidate();
 } catch (e: unknown) {
 toast.error((e instanceof Error ? e.message : String(e)) || "Erro inesperado.");
 } finally {
 setLoading(false);
 }
 };

 return (
 <Dialog open={open} onOpenChange={setOpen}>
 <DialogTrigger asChild>
 <Button
 variant="outline"
 className="w-full mt-4 text-destructive border-destructive hover:bg-destructive/10"
 >
 Solicitar Devolução / Troca
 </Button>
 </DialogTrigger>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>Solicitar Devolução / Troca</DialogTitle>
 <DialogDescription>
 Descreva o motivo da devolução ou troca. Nossa equipe entrará em contato em breve.
 </DialogDescription>
 </DialogHeader>
 <div className="space-y-4 py-4">
 <Textarea
 placeholder="Ex: O tamanho ficou pequeno, gostaria de trocar por um maior."
 value={reason}
 onChange={(e) => setReason(e.target.value)}
 />
 <Button className="w-full" onClick={handleSubmit} disabled={loading}>
 {loading ? "Enviando..." : "Confirmar Solicitação"}
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 );
}
