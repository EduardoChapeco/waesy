import { useState } from "react";
import { ShieldCheck, Truck, Clock, AlertTriangle, Building, CheckCircle2, ChevronRight, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function DeliveryLocationPolicySheet({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6 rounded-3xl border border-border/80 bg-background shadow-2xl">
        <DialogHeader className="space-y-1.5 text-left">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="size-4" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Políticas Pétreas & Regras de Entrega
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Diretrizes inegociáveis para garantir segurança, respeito e pontualidade na entrega.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 pt-2 text-xs">
          {/* Regra 1: Onde a entrega é realizada */}
          <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Building className="size-4 text-primary shrink-0" />
              <span>Portaria vs. Porta do Apartamento</span>
            </div>
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              Por padrão de segurança urbana, as entregas ocorrem na portaria ou portão principal do condomínio. Caso você selecione a opção "Entregar na porta de casa/apartamento", uma taxa adicional do entregador é aplicada para cobrir o tempo de identificação e deslocamento interno.
            </p>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
              Importante: Se o regimento interno do condomínio proibir a entrada de entregadores, o valor da taxa não é estornável e a entrega será finalizada na portaria.
            </p>
          </div>

          {/* Regra 2: Tolerância de 15 minutos */}
          <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Clock className="size-4 text-primary shrink-0" />
              <span>Tolerância de Espera (15 Minutos)</span>
            </div>
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              Ao registrar a chegada via GPS, você recebe uma notificação instantânea. O entregador aguarda no local por até 15 minutos de tolerância. Tempo excedente está sujeito a taxa de espera calculada por minuto ou cancelamento do pedido sem reembolso.
            </p>
          </div>

          {/* Regra 3: Tolerância Zero a Abusos */}
          <div className="p-3.5 rounded-2xl bg-destructive/5 border border-destructive/20 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              <span>Tolerância Zero a Fraudes e Abusos</span>
            </div>
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              O Waesy adota política de tolerância zero contra desacato, violência ou fraudes de comprovante/reclamação falsa. Incidentes geram banimento imediato e representação legal junto às autoridades policiais.
            </p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto h-11 px-6 rounded-xl font-bold text-xs bg-primary text-primary-foreground cursor-pointer"
          >
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
