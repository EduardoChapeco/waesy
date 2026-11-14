import React from "react";
import { Link } from "@tanstack/react-router";
import { Star, Key, ShieldCheck, CheckCircle2, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface AiCurationUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureTitle?: string;
}

/**
 * AiCurationUpgradeModal — Upgrade Wall Silencioso & Elegante (Apple HIG / BYOK)
 * Permite ao lojista desbloquear curadoria com IA assinando um plano ou
 * trazendo sua própria chave de API (Bring Your Own Key - BYOK) gratuitamente.
 */
export function AiCurationUpgradeModal({
  isOpen,
  onClose,
  featureTitle = "Curadoria Editorial",
}: AiCurationUpgradeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-lg bg-card border border-border p-5 sm:p-6 space-y-4">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-muted text-foreground">
              <Star className="size-5" />
            </span>
            <Badge variant="outline" className="text-2xs font-mono border-border text-muted-foreground">
              PLANO PRO OU CHAVE PRÓPRIA
            </Badge>
          </div>
          <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
            Ativar {featureTitle}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Assine um plano ou conecte sua chave de API para gerar descrições e títulos editoriais automaticamente:
          </DialogDescription>
        </DialogHeader>

        {/* 2 Opções de Desbloqueio */}
        <div className="space-y-3 pt-1">
          {/* Opção 1: BYOK (Gratuita) */}
          <Link
            to="/workspace/configuracoes/inteligencia-artificial"
            onClick={onClose}
            className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="size-8 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0 mt-1">
              <Key className="size-4" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Minha Chave de API</span>
                <span className="text-2xs text-foreground font-mono font-bold bg-secondary px-2 py-1 rounded">
                  Grátis
                </span>
              </div>
              <p className="text-2xs text-muted-foreground">
                Conecte sua chave OpenAI, Anthropic ou Google Gemini sem mensalidade extra.
              </p>
            </div>
          </Link>

          {/* Opção 2: Plano Premium */}
          <Link
            to="/workspace/configuracoes"
            onClick={onClose}
            className="flex items-start gap-3 p-4 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors duration-200 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
              <Zap className="size-4" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Assinar Plano Comercial Premium</span>
                <ArrowRight className="size-3.5 text-primary group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-2xs text-muted-foreground">
                Tokens de IA inclusos, curadoria automática do OpenSquad e suporte prioritário.
              </p>
            </div>
          </Link>
        </div>

        <DialogFooter className="pt-2 flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-lg text-xs h-9 w-full cursor-pointer text-muted-foreground hover:text-foreground min-h-11 sm:min-h-0"
          >
            Continuar com Extração Mecânica (Sem IA)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
