import React from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, ArrowRight, LogIn, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ActionAuthGuardModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  actionContext?: string;
  returnUrl?: string;
}

/**
 * ActionAuthGuardModal — Barreira Canônica para Não-Logados em Ações (Apple HIG)
 * Intercepta ações privilegiadas (candidaturas, agendamentos, propostas, checkout)
 * orientando o usuário de forma elegante ao login preservando o contexto exato.
 */
export function ActionAuthGuardModal({
  isOpen,
  onOpenChange,
  title = "Acesso Restrito a Membros",
  description = "Para concluir esta ação com total segurança, acesse sua conta ou faça um cadastro rápido gratuito na Comunidade Waesy.",
  actionContext,
  returnUrl,
}: ActionAuthGuardModalProps) {
  const currentPath =
    returnUrl ||
    (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/");

  const loginTarget = `/entrar?returnUrl=${encodeURIComponent(currentPath)}`;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-lg p-6 space-y-4">
        <DialogHeader className="space-y-2 text-left">
          <div className="size-11 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-1">
            <ShieldCheck className="size-6" />
          </div>
          <DialogTitle className="text-base font-bold text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>

        {actionContext && (
          <div className="p-4 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1">
            <span className="font-semibold text-foreground flex items-center gap-2">
              <Lock className="size-4 text-muted-foreground" />
              Ação Solicitada:
            </span>
            <p className="text-muted-foreground">{actionContext}</p>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto rounded-lg text-xs h-11 min-h-11 px-4 focus-visible:ring-2 focus-visible:ring-primary"
          >
            Continuar navegando
          </Button>
          <Button
            asChild
            className="w-full sm:w-auto rounded-lg text-xs h-11 min-h-11 px-4 gap-2 font-bold focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Link to={loginTarget as any}>
              <LogIn className="size-4" />
              <span>Entrar ou Cadastrar</span>
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
