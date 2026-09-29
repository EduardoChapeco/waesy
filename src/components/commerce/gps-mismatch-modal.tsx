import { MapPin, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function GpsMismatchModal({
  isOpen,
  onOpenChange,
  distanceKm,
  deliveryAddressSummary,
  onConfirmOrder,
  onChangeAddress,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  distanceKm: number;
  deliveryAddressSummary: string;
  onConfirmOrder: () => void;
  onChangeAddress: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-3xl border border-border/80 bg-background shadow-2xl">
        <DialogHeader className="space-y-2 text-left">
          <div className="size-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <MapPin className="size-5" />
          </div>
          <DialogTitle className="text-base font-bold text-foreground">
            Localização Diferente do Endereço de Entrega
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Identificamos que o GPS do seu dispositivo está a aproximadamente{" "}
            <span className="font-bold text-foreground">{distanceKm} km</span> do endereço de entrega selecionado:
          </DialogDescription>
        </DialogHeader>

        <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 text-xs space-y-1">
          <p className="font-bold text-foreground">{deliveryAddressSummary}</p>
          <p className="text-[11px] text-muted-foreground">
            Se você estiver pedindo para outra pessoa (presente) ou para receber em outro local, confirme abaixo.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onChangeAddress();
            }}
            className="w-full sm:flex-1 h-11 rounded-xl text-xs font-bold cursor-pointer"
          >
            Alterar Endereço
          </Button>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onConfirmOrder();
            }}
            className="w-full sm:flex-1 h-11 rounded-xl text-xs font-bold bg-primary text-primary-foreground cursor-pointer"
          >
            Sim, Confirmar Pedido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
