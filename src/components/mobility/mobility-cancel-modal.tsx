import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cancelMobilityRequest } from "@/services/mobility.functions";
import { toast } from "sonner";

interface MobilityCancelModalProps {
  requestId: string | null;
  currentStatus?: string;
  isScheduled?: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled?: () => void;
}

const REASONS = [
  "Mudei de ideia / Não preciso mais",
  "Demora para encontrar motorista parceiro",
  "Endereço de partida ou destino incorreto",
  "Veículo ou modalidade selecionada por engano",
  "Outro motivo",
];

export function MobilityCancelModal({
  requestId,
  currentStatus = "searching",
  isScheduled = false,
  isOpen,
  onOpenChange,
  onCancelled,
}: MobilityCancelModalProps) {
  const queryClient = useQueryClient();
  const [selectedReason, setSelectedReason] = useState(REASONS[0]);

  const cancelMutation = useMutation({
    mutationFn: (reason: string) =>
      cancelMobilityRequest({
        data: {
          requestId: requestId!,
          reason,
          cancelledBy: "customer",
        },
      }),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["customer-mobility-history"] });
      onCancelled?.();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao cancelar solicitação.");
    },
  });

  const handleConfirmCancel = () => {
    if (!requestId) return;
    cancelMutation.mutate(selectedReason);
  };

  const isAccepted = currentStatus === "accepted";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 bg-card border border-border">
        <DialogHeader className="space-y-1 text-left pb-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center font-bold">
              <AlertTriangle className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-black text-foreground">
                {isScheduled ? "Cancelar Agendamento" : "Cancelar Solicitação"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {isScheduled
                  ? "Esta viagem ou frete agendado será cancelado sem cobrança de taxas."
                  : isAccepted
                  ? "O condutor parceiro já está a caminho do ponto de embarque."
                  : "Busca de parceiro será interrompida imediatamente."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {isAccepted && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-950 dark:text-amber-200">
              <span className="font-bold block mb-1">Aviso sobre deslocamento</span>
              <p className="leading-snug">
                O condutor já aceitou seu pedido. Cancelamentos após o aceite liberam o parceiro para atender outras demandas da comunidade.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Motivo do cancelamento
            </Label>
            <div className="space-y-2">
              {REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer text-xs ${
                    selectedReason === r
                      ? "bg-foreground text-background border-foreground font-bold"
                      : "bg-muted/20 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="cancel-reason"
                    value={r}
                    checked={selectedReason === r}
                    onChange={() => setSelectedReason(r)}
                    className="size-4 accent-primary cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 min-h-11 rounded-lg text-xs font-semibold border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
            >
              Manter Viagem
            </Button>
            <Button
              type="button"
              onClick={handleConfirmCancel}
              disabled={cancelMutation.isPending}
              className="flex-1 h-11 min-h-11 rounded-lg text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-destructive focus-visible:outline-none cursor-pointer"
            >
              {cancelMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  <span>Cancelando...</span>
                </div>
              ) : (
                <span>Confirmar Cancelamento</span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
