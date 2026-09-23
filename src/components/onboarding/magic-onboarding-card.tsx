/**
 * magic-onboarding-card.tsx — Card de Onboarding Mágico por IA (Apple HIG & Silent UI)
 * 
 * Substitui o formulário manual longo por extração via URL.
 * Apresenta progresso em micro-etapas silenciosas sem popups invasivos.
 */

import React, { useState } from "react";
import {
  Sparkles,
  Globe,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Building2,
  ShoppingBag,
  Palette,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { executeMagicOnboarding, type MagicOnboardingResult } from "@/services/magic-onboarding.functions";
import { toast } from "sonner";

interface MagicOnboardingCardProps {
  storeId?: string;
  onSuccess?: (result: MagicOnboardingResult) => void;
}

export function MagicOnboardingCard({ storeId, onSuccess }: MagicOnboardingCardProps) {
  const [url, setUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedResult, setCompletedResult] = useState<MagicOnboardingResult | null>(null);

  const STEPS = [
    { label: "Analisando site e presença digital...", icon: Globe },
    { label: "Configurando tom de voz e essência da marca...", icon: MessageSquare },
    { label: "Gerando catálogo base e sugestões de produtos...", icon: ShoppingBag },
    { label: "Sincronizando loja e publicando no diretório...", icon: Building2 },
  ];

  const handleStartMagic = async (e: React.FormEvent) => {
    e.preventDefault();

    let targetUrl = url.trim();
    if (!targetUrl) {
      toast.error("Por favor, informe a URL do seu site ou Instagram.");
      return;
    }

    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = `https://${targetUrl}`;
    }

    setIsProcessing(true);
    setCurrentStepIndex(0);
    setCompletedResult(null);

    // Efeito visual suave de etapas
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 1800);

    try {
      const res = await executeMagicOnboarding({
        data: {
          url: targetUrl,
          store_id: storeId,
        },
      });

      clearInterval(stepInterval);
      setCurrentStepIndex(STEPS.length - 1);

      if (res.success && res.result) {
        setCompletedResult(res.result);
        toast.success(res.message);
        if (onSuccess) onSuccess(res.result);
      }
    } catch (err: any) {
      clearInterval(stepInterval);
      toast.error(err.message || "Falha ao processar Onboarding Mágico.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-5 md:p-6 rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/[0.03] to-card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Onboarding Mágico por IA</h3>
            <p className="text-xs text-muted-foreground">
              Informe apenas o site ou Instagram da sua empresa. O crawler mapeia tudo.
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground border-border/60">
          -300 Tokens
        </Badge>
      </div>

      {!completedResult ? (
        <form onSubmit={handleStartMagic} className="space-y-4 pt-1">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="ex: instagram.com/minhaloja ou meusite.com.br"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isProcessing}
                className="pl-9 h-10 text-xs bg-background"
              />
            </div>

            <Button
              type="submit"
              disabled={isProcessing}
              className="w-full sm:w-auto h-10 px-5 text-xs font-semibold gap-1.5 shrink-0"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Mapeando...
                </>
              ) : (
                <>
                  Iniciar Onboarding
                  <span className="text-[10px] opacity-75 font-mono">[ -300 Tokens ]</span>
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </Button>
          </div>

          {/* Loader Elegante com Etapas Silenciosas */}
          {isProcessing && (
            <div className="p-4 rounded-xl bg-background/80 border border-border/50 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />
                <span>{STEPS[currentStepIndex].label}</span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {STEPS.map((step, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      idx <= currentStepIndex ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </form>
      ) : (
        <div className="p-4 rounded-xl bg-background border border-emerald-500/20 space-y-3 pt-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-4" />
            <span>Perfil configurado com sucesso!</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
            <div>
              <span className="font-medium text-foreground block">Nome:</span>
              {completedResult.company_name}
            </div>
            <div>
              <span className="font-medium text-foreground block">Tom de Voz:</span>
              {completedResult.brand_voice}
            </div>
            <div className="sm:col-span-2">
              <span className="font-medium text-foreground block">Bio Gerada:</span>
              <p className="line-clamp-2">{completedResult.bio}</p>
            </div>
            {completedResult.products_created_count > 0 && (
              <div className="sm:col-span-2 flex items-center gap-1.5 text-primary font-medium">
                <ShoppingBag className="size-3.5" />
                <span>{completedResult.products_created_count} produtos cadastrados no catálogo base!</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
