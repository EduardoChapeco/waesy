import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { scheduleWhatsAppMessage } from "@/services/chat-operations.functions";
import { toast } from "sonner";
import { CalendarClock, Loader2, Send } from "lucide-react";

interface ScheduleWhatsAppMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  threadId?: string | null;
  recipientPhone: string;
  recipientName?: string;
}

export function ScheduleWhatsAppMessageModal({
  isOpen,
  onClose,
  threadId,
  recipientPhone,
  recipientName = "Cliente",
}: ScheduleWhatsAppMessageModalProps) {
  const [messageText, setMessageText] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [time, setTime] = useState("09:00");
  const [isScheduling, setIsScheduling] = useState(false);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) {
      toast.error("Digite o texto da mensagem a ser agendada.");
      return;
    }

    try {
      setIsScheduling(true);
      const scheduledDateTime = new Date(`${date}T${time}:00`).toISOString();

      await scheduleWhatsAppMessage({
        data: {
          threadId: threadId || null,
          recipientPhone,
          messageText: messageText.trim(),
          scheduledFor: scheduledDateTime,
        },
      });

      toast.success("Mensagem programada com sucesso!");
      setMessageText("");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao agendar mensagem.");
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl bg-card border border-border">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CalendarClock className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Agendar Mensagem WhatsApp
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Programar envio automático para {recipientName} ({recipientPhone}).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSchedule} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">
                Data do Envio
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="h-11 rounded-xl text-xs focus-visible:ring-2 focus-visible:ring-primary"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">
                Horário
              </Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-11 rounded-xl text-xs focus-visible:ring-2 focus-visible:ring-primary"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Mensagem de Follow-up
            </Label>
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Ex: Olá! Passando para checar se você conseguiu avaliar a proposta enviada ontem..."
              rows={4}
              className="rounded-xl text-xs focus-visible:ring-2 focus-visible:ring-primary resize-none"
              required
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isScheduling}
              className="h-11 rounded-xl text-xs font-semibold px-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={isScheduling}
              className="h-11 rounded-xl text-xs font-semibold px-5 gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isScheduling ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <Send className="size-4" />
              )}
              <span>Agendar Envio</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
