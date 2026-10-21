import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { cancelEventTicket } from "@/services/event-tickets.functions";

interface TicketCancelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: {
    id: string;
    eventTitle: string;
    humanCode: string;
  };
  onSuccess?: () => void;
}

export function TicketCancelModal({
  open,
  onOpenChange,
  ticket,
  onSuccess,
}: TicketCancelModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      toast.error("Por favor, descreva o motivo do cancelamento (mínimo de 5 caracteres).");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await cancelEventTicket({
        data: {
          ticketId: ticket.id,
          reason: reason.trim(),
        },
      });

      if (res.status === "success") {
        toast.success(res.message);
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : String(err)) || "Erro ao cancelar ingresso.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <XCircle className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Cancelar Ingresso
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate max-w-xs">
                {ticket.eventTitle} • {ticket.humanCode}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleCancel} className="space-y-4 pt-2">
          <div className="p-3 bg-muted/40 border border-border/60 rounded-lg flex items-start gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="size-4 text-destructive shrink-0 mt-1" />
            <p>
              Esta ação é <strong className="text-foreground">irreversível</strong>. O ingresso será revogado imediatamente e sua vaga devolvida ao lote do evento.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancel-reason" className="text-xs font-semibold text-foreground">
              Motivo do Cancelamento *
            </Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo da desistência ou impossibilidade de comparecimento..."
              required
              rows={3}
              className="text-xs bg-background resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-11 px-4 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Voltar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting}
              className="h-11 px-5 text-xs font-bold rounded-lg cursor-pointer gap-2 focus-visible:ring-2 focus-visible:ring-destructive shadow-xs"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <XCircle className="size-4" />
              )}
              <span>Confirmar Cancelamento</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
