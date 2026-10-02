import React from "react";
import { Link } from "@tanstack/react-router";
import { Lock, CheckCircle2, ArrowRight, ShieldCheck, Zap, Building2, Users, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface ProUpgradePaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureTitle?: string;
  featureDescription?: string;
  source?: "linkedin_syndication" | "talent_hunter" | "job_creator";
}

/**
 * ProUpgradePaywallModal — Paywall B2B Executivo (Apple HIG & Stripe Standard)
 * Bloqueia recursos avançados (Sindicação no LinkedIn, Hunter de Talentos)
 * e converte o cliente para a assinatura corporativa PRO do Waesy.
 */
export function ProUpgradePaywallModal({
  isOpen,
  onClose,
  featureTitle = "Publicação Simultânea no LinkedIn",
  featureDescription = "A sindicação automática de vagas e a busca ativa de talentos são recursos corporativos exclusivos do Plano PRO.",
  source = "linkedin_syndication",
}: ProUpgradePaywallModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-lg bg-card border border-border/70 p-5 sm:p-6 space-y-4">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Lock className="size-4" />
            </span>
            <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-600 bg-amber-500/10">
              RECURSO CORPORATIVO PRO
            </Badge>
          </div>
          <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
            Desbloquear {featureTitle}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {featureDescription}
          </DialogDescription>
        </DialogHeader>

        {/* Card do Plano PRO com Vantagens Corporativas */}
        <div className="p-4 rounded-lg bg-muted/40 border border-border/60 space-y-3">
          <div className="flex items-baseline justify-between border-b border-border/40 pb-3">
            <div>
              <span className="text-sm font-bold text-foreground block">Waesy Enterprise PRO</span>
              <span className="text-[11px] text-muted-foreground">Para empresas e RH ágil</span>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-foreground font-mono">R$ 149</span>
              <span className="text-[10px] text-muted-foreground">/mês</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-1" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">Sindicação no LinkedIn:</strong> Publicação com 1 clique na sua Company Page com rastreio.
              </span>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-1" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">Hunter de Talentos:</strong> Busca ativa na base completa de currículos com filtros.
              </span>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-1" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">Destaque nas Vagas:</strong> Exibição prioritária no portal público de empregos.
              </span>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-1" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">Empresa Verificada:</strong> Maior autoridade e confiança para atração de talentos.
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé e CTA */}
        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="w-full sm:w-auto rounded-lg text-xs h-9 cursor-pointer"
          >
            Continuar no Gratuito
          </Button>

          <Link
            to="/workspace/financeiro/faturas"
            search={{ upgrade_plan: "PRO", feature: source }}
            className="w-full sm:w-auto"
          >
            <Button
              type="button"
              size="sm"
              className="w-full rounded-lg text-xs h-9 font-bold gap-2 bg-[#0A66C2] hover:bg-[#084e96] text-white shadow-xs cursor-pointer"
            >
              <Zap className="size-3.5 fill-current" />
              <span>Assinar Plano PRO</span>
              <ArrowRight className="size-3" />
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
