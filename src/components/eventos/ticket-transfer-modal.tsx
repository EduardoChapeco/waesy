import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowRightLeft, ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";
import { transferEventTicket } from "@/services/event-tickets.functions";

interface TicketTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: {
    id: string;
    eventTitle: string;
    lotName?: string | null;
    humanCode: string;
    recipientName?: string | null;
  };
  onSuccess?: () => void;
}

export function TicketTransferModal({
  open,
  onOpenChange,
  ticket,
  onSuccess,
}: TicketTransferModalProps) {
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTaxId, setNewTaxId] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      toast.error("Informe o nome e e-mail do novo titular.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await transferEventTicket({
        data: {
          ticketId: ticket.id,
          newRecipientName: newName.trim(),
          newRecipientEmail: newEmail.trim(),
          newRecipientTaxId: newTaxId.trim() || undefined,
          transferNote: note.trim() || undefined,
        },
      });

      if (res.status === "success") {
        toast.success(res.message);
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : String(err)) || "Erro ao transferir ingresso.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ArrowRightLeft className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Transferir Ingresso
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate max-w-xs">
                {ticket.eventTitle} • {ticket.humanCode}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleTransfer} className="space-y-4 pt-2">
          {/* Alerta de Segurança e Invalidação de QR */}
          <div className="p-3 bg-muted/40 border border-border/60 rounded-lg flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldAlert className="size-4 text-primary shrink-0 mt-1" />
            <p>
              Ao transferir, o seu código de acesso atual será <strong className="text-foreground">revogado imediatamente</strong>. Uma nova credencial criptografada WCTS-1 será emitida em nome do destinatário.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="new-name" className="text-xs font-semibold text-foreground">
                Nome do Novo Titular *
              </Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome completo do participante"
                required
                className="h-11 text-xs bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-email" className="text-xs font-semibold text-foreground">
                E-mail do Novo Titular *
              </Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@destino.com"
                required
                className="h-11 text-xs bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-taxid" className="text-xs font-semibold text-foreground">
                CPF do Novo Titular (Opcional)
              </Label>
              <Input
                id="new-taxid"
                value={newTaxId}
                onChange={(e) => setNewTaxId(e.target.value)}
                placeholder="000.000.000-00"
                className="h-11 text-xs bg-background font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfer-note" className="text-xs font-semibold text-foreground">
                Mensagem ou Observação (Opcional)
              </Label>
              <Input
                id="transfer-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex: Presente de aniversário"
                className="h-11 text-xs bg-background"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-11 px-4 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-5 text-xs font-bold rounded-lg cursor-pointer gap-2 focus-visible:ring-2 focus-visible:ring-primary shadow-xs"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <ArrowRightLeft className="size-4" />
              )}
              <span>Confirmar Transferência</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
