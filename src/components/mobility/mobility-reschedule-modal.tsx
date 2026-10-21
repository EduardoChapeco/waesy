import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, Loader2, RefreshCw } from "lucide-react";
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
import { rescheduleMobilityRequest } from "@/services/mobility.functions";
import { toast } from "sonner";

interface MobilityRescheduleModalProps {
  requestId: string | null;
  currentScheduledFor: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRescheduled?: () => void;
}

export function MobilityRescheduleModal({
  requestId,
  currentScheduledFor,
  isOpen,
  onOpenChange,
  onRescheduled,
}: MobilityRescheduleModalProps) {
  const queryClient = useQueryClient();

  // Inicializa data e hora com amanhã às 08:00 se não houver data
  const defaultDate = currentScheduledFor ? new Date(currentScheduledFor) : new Date(Date.now() + 24 * 3600 * 1000);
  const formattedDate = defaultDate.toISOString().split("T")[0];
  const formattedTime = defaultDate.toTimeString().slice(0, 5);

  const [dateStr, setDateStr] = useState(formattedDate);
  const [timeStr, setTimeStr] = useState(formattedTime);
  const [notes, setNotes] = useState("");

  const rescheduleMutation = useMutation({
    mutationFn: (newScheduledIso: string) =>
      rescheduleMobilityRequest({
        data: {
          requestId: requestId!,
          newScheduledFor: newScheduledIso,
          notes: notes.trim() || undefined,
        },
      }),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["customer-mobility-history"] });
      onRescheduled?.();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao remarcar agendamento.");
    },
  });

  const handleConfirm = () => {
    if (!requestId) return;
    if (!dateStr || !timeStr) {
      toast.error("Por favor, selecione data e horário válidos.");
      return;
    }
    const target = new Date(`${dateStr}T${timeStr}:00`);
    if (isNaN(target.getTime()) || target.getTime() <= Date.now()) {
      toast.error("A nova data de agendamento deve ser no futuro.");
      return;
    }
    rescheduleMutation.mutate(target.toISOString());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 bg-card border border-border">
        <DialogHeader className="space-y-1 text-left pb-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-foreground text-background flex items-center justify-center font-bold">
              <Calendar className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-black text-foreground">
                Remarcar Agendamento
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Defina o novo dia e horário para o serviço.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Nova Data
              </Label>
              <Input
                type="date"
                value={dateStr}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setDateStr(e.target.value)}
                className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold bg-background border-border/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Novo Horário
              </Label>
              <Input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold bg-background border-border/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Motivo ou Instrução Especial (Opcional)
            </Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Mudança de horário de voo / Consulta adiada"
              className="h-11 min-h-11 px-3 rounded-lg text-xs bg-background border-border/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            />
          </div>

          <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-xs text-muted-foreground leading-snug">
            O valor previamente cotado será mantido e a equipe parceira alocará o condutor com antecedência ao horário escolhido.
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 min-h-11 rounded-lg text-xs font-semibold border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
            >
              Voltar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={rescheduleMutation.isPending}
              className="flex-1 h-11 min-h-11 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
            >
              {rescheduleMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  <span>Atualizando...</span>
                </div>
              ) : (
                <span>Confirmar Nova Data</span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
