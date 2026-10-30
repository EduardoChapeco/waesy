import React from "react";
import { MessageCircle, ArrowUpRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BetaExplanationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supportWhatsApp?: string;
}

export function BetaExplanationModal({
  open,
  onOpenChange,
  supportWhatsApp = "",
}: BetaExplanationModalProps) {
  const handleOpenWhatsApp = () => {
    const text = encodeURIComponent(
      "Olá equipe Waesy! Estou navegando na plataforma Beta e gostaria de enviar um feedback/sugestão."
    );
    window.open(`https://wa.me/${supportWhatsApp.replace(/\D/g, "")}?text=${text}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-2xl bg-background">
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="text-lg font-semibold text-foreground">
            Beta público
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Envie feedback sobre o que precisa ser ajustado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto h-11 min-h-11 rounded-lg text-xs font-medium"
          >
            Entendido
          </Button>

          <Button
            size="sm"
            onClick={handleOpenWhatsApp}
            className="w-full sm:w-auto h-11 min-h-11 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 flex items-center justify-center gap-2"
          >
            <MessageCircle className="size-3.5" />
            Enviar Feedback
            <ArrowUpRight className="size-3.5 opacity-70" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
