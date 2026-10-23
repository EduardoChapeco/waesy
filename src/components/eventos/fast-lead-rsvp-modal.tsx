import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Ticket,
  Calendar,
  MapPin,
  CheckCircle2,
  Copy,
  Download,
  Sparkles,
  QrCode,
} from "lucide-react";
import { formatDate } from "@/lib/datetime";
import { issueFastLeadRsvpTicket } from "@/services/events.functions";

interface FastLeadRsvpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    id: string;
    title: string;
    event_date?: string | null;
    location?: string | null;
  };
  lot?: {
    id: string;
    name: string;
  } | null;
  onSuccess?: () => void;
}

export function FastLeadRsvpModal({
  open,
  onOpenChange,
  event,
  lot,
  onSuccess,
}: FastLeadRsvpModalProps) {
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [attendeePhone, setAttendeePhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedTicket, setIssuedTicket] = useState<{
    ticketId: string;
    humanCode: string;
    qrPayload: string;
    eventTitle: string;
    eventDate?: string | null;
    eventLocation?: string | null;
    lotName: string;
    recipientName: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendeeName.trim()) {
      toast.error("Informe seu nome completo para emissão nominal.");
      return;
    }
    if (!attendeeEmail.trim()) {
      toast.error("Informe seu e-mail para receber a confirmação.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await issueFastLeadRsvpTicket({
        data: {
          eventId: event.id,
          lotId: lot?.id || null,
          attendeeName: attendeeName.trim(),
          attendeeEmail: attendeeEmail.trim(),
          attendeePhone: attendeePhone.trim() || null,
        },
      });

      setIssuedTicket(res);
      toast.success("Presença confirmada e ingresso emitido!");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao emitir ingresso.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (issuedTicket?.humanCode) {
      navigator.clipboard.writeText(issuedTicket.humanCode);
      toast.success("Código copiado!");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
          setIssuedTicket(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-border">
        {!issuedTicket ? (
          <>
            <DialogHeader className="text-left space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">
                  Entrada Gratuita / RSVP
                </Badge>
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Confirmar Presença & Obter Ingresso
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {event.title}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="p-3 bg-muted/40 rounded-2xl space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Calendar className="size-3.5 text-primary" />
                  {event.event_date ? formatDate(event.event_date) : "Data a definir"}
                </div>
                {event.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {event.location}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Nome Completo do Titular *</Label>
                <Input
                  type="text"
                  placeholder="Nome impresso no ingresso"
                  value={attendeeName}
                  onChange={(e) => setAttendeeName(e.target.value)}
                  required
                  className="h-11 min-h-11 rounded-xl text-xs bg-background border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">E-mail *</Label>
                <Input
                  type="email"
                  placeholder="Para envio do voucher e QR Code"
                  value={attendeeEmail}
                  onChange={(e) => setAttendeeEmail(e.target.value)}
                  required
                  className="h-11 min-h-11 rounded-xl text-xs bg-background border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">WhatsApp / Celular (Opcional)</Label>
                <Input
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={attendeePhone}
                  onChange={(e) => setAttendeePhone(e.target.value)}
                  className="h-11 min-h-11 rounded-xl text-xs bg-background border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="h-11 min-h-11 px-4 rounded-xl font-semibold border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 min-h-11 px-5 rounded-xl font-bold bg-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isSubmitting ? "Emitindo..." : "Garantir Ingresso"}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center space-y-4 py-2">
            <div className="size-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Presença Confirmada!</h3>
              <p className="text-xs text-muted-foreground">
                Seu ingresso com validação criptográfica foi emitido com sucesso.
              </p>
            </div>

            {/* Ticket Card Preview */}
            <div className="p-4 bg-muted/40 rounded-2xl border border-border/60 text-left space-y-3">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Evento
                </span>
                <p className="text-sm font-bold text-foreground">{issuedTicket.eventTitle}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Titular
                  </span>
                  <p className="font-semibold text-foreground truncate">{issuedTicket.recipientName}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Lote
                  </span>
                  <p className="font-semibold text-foreground">{issuedTicket.lotName}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Código de Entrada
                  </span>
                  <p className="text-base font-mono font-bold text-primary">{issuedTicket.humanCode}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCode}
                  className="h-9 px-3 rounded-xl text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Copy className="size-3.5 mr-1.5" />
                  Copiar
                </Button>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full h-11 min-h-11 rounded-xl font-bold bg-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Concluir
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
export default FastLeadRsvpModal;
