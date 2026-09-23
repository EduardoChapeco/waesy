import React from "react";
import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  Key,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  featureTitle = "Curadoria Editorial com Inteligência Artificial",
}: AiCurationUpgradeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl bg-card border border-border/60 p-5 sm:p-6 space-y-4">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </span>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/40 text-primary">
              RECURSO PREMIUM / BYOK
            </Badge>
          </div>
          <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
            Desbloquear {featureTitle}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            A extração mecânica de dados estruturados é 100% gratuita. Para transformar dados brutos em redações refinadas, títulos atrativos e sínteses para celular, escolha uma das opções abaixo:
          </DialogDescription>
        </DialogHeader>

        {/* 2 Opções de Desbloqueio */}
        <div className="space-y-2.5 pt-1">
          {/* Opção 1: BYOK (Gratuita) */}
          <Link
            to="/workspace/configuracoes/inteligencia-artificial"
            onClick={onClose}
            className="flex items-start gap-3 p-3.5 rounded-xl border border-border/70 hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer group"
          >
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
              <Key className="size-4" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Inserir Minha Chave de API (BYOK)</span>
                <span className="text-[10px] text-emerald-500 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded">
                  Grátis
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Conecte sua própria chave da OpenAI, Anthropic ou Google Gemini sem pagar mensalidade adicional.
              </p>
            </div>
          </Link>

          {/* Opção 2: Plano Premium */}
          <Link
            to="/workspace/configuracoes/planos"
            onClick={onClose}
            className="flex items-start gap-3 p-3.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer group"
          >
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="size-4" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Assinar Plano Comercial Premium</span>
                <ArrowRight className="size-3.5 text-primary group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[11px] text-muted-foreground">
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
            className="rounded-xl text-xs h-9 w-full cursor-pointer text-muted-foreground hover:text-foreground"
          >
            Continuar com Extração Mecânica (Sem IA)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
