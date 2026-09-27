import React from "react";
import { Zap, ShieldCheck, MessageCircle, X, HelpCircle, ArrowUpRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
      <DialogContent className="max-w-md p-6 rounded-2xl bg-background/95 backdrop-blur-xl border border-border/60 shadow-2xl">
        <DialogHeader className="space-y-3 text-left">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              <Zap className="size-3" />
              Versão Beta Pública
            </span>
          </div>

          <DialogTitle className="text-xl font-bold text-foreground font-display tracking-tight">
            Waesy em Evolução Contínua
          </DialogTitle>

          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Bem-vindo à fase aberta do Waesy. A plataforma está sendo construída e aprimorada
            diariamente em conjunto com os moradores, empreendedores e visitantes da nossa região.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Card 1: O que é o Beta */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <HelpCircle className="size-4 text-amber-500 shrink-0" />
              <span>O que significa estar em Beta?</span>
            </div>
            <p className="text-[11.5px] text-muted-foreground leading-relaxed pl-6">
              Significa que você tem acesso em primeira mão a novas ferramentas de Classificados,
              Turismo, Oportunidades e Perfis de Empresas antes do lançamento oficial. Melhorias de
              usabilidade e novos nichos entram no ar com frequência diária.
            </p>
          </div>

          {/* Card 2: Dados e Segurança */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
              <span>Seus Dados & Negociações são Reais</span>
            </div>
            <p className="text-[11.5px] text-muted-foreground leading-relaxed pl-6">
              Todos os anúncios, mensagens, contatos de WhatsApp e agendamentos acontecem em tempo
              real com proteção de ponta a ponta. Nenhum dado cadastrado será perdido nas futuras
              atualizações.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto h-10 rounded-xl text-xs font-medium"
          >
            Entendido
          </Button>

          <Button
            size="sm"
            onClick={handleOpenWhatsApp}
            className="w-full sm:w-auto h-10 rounded-xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90 flex items-center justify-center gap-1.5"
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
