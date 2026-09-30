/**
 * magic-onboarding-card.tsx — Card de Onboarding Guiado por IA (Silent Design & Apple HIG)
 * 
 * Design Direto, Funcional e Mínimo:
 * - Zero texto decorativo ou explicativo longo
 * - Rastreamento real de etapas
 * - Tarifa oficial de 20.000 Tokens da Plataforma (ONBOARDING_AI_COST)
 */

import React, { useState } from "react";
import { Globe, ArrowRight, CheckCircle2, Loader2, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  executeMagicOnboarding,
  type MagicOnboardingResult,
} from "@/services/magic-onboarding.functions";
import { ONBOARDING_AI_COST, formatPlatformTokens } from "@/config/platform-billing.config";
import { toast } from "sonner";

interface MagicOnboardingCardProps {
  storeId?: string;
  onSuccess?: (result: MagicOnboardingResult) => void;
}

export function MagicOnboardingCard({ storeId, onSuccess }: MagicOnboardingCardProps) {
  const [url, setUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStageText, setCurrentStageText] = useState("Conectando fontes...");
  const [completedResult, setCompletedResult] = useState<MagicOnboardingResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartMagic = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let targetUrl = url.trim();
    if (!targetUrl) {
      toast.error("Informe a URL do seu site ou Instagram.");
      return;
    }

    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = `https://${targetUrl}`;
    }

    setIsProcessing(true);
    setCurrentStageText("Conectando fontes e iniciando crawler...");
    setCompletedResult(null);

    try {
      const res = await executeMagicOnboarding({
        data: {
          url: targetUrl,
          store_id: storeId,
        },
      });

      if (res.success && res.result) {
        setCompletedResult(res.result);
        setCurrentStageText("Brandkit e matrizes prontos.");
        toast.success(res.message);
        if (onSuccess) onSuccess(res.result);
      }
    } catch (err: any) {
      const msg = err?.message || "Falha ao processar onboarding.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Onboarding por IA</h3>
            <p className="text-xs text-muted-foreground">
              Mapeamento de marca, DNA, SWOT e catálogo via URL.
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-[11px] font-mono border-border">
          {formatPlatformTokens(ONBOARDING_AI_COST)} Tokens
        </Badge>
      </div>

      {!completedResult ? (
        <form onSubmit={handleStartMagic} className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="instagram.com/empresa ou meusite.com.br"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isProcessing}
                className="pl-9 h-10 text-xs bg-background"
              />
            </div>

            <Button
              type="submit"
              disabled={isProcessing}
              className="w-full sm:w-auto h-10 px-4 text-xs font-semibold gap-1.5 shrink-0"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <span>Iniciar</span>
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </Button>
          </div>

          {/* Estado de Processamento Silencioso */}
          {isProcessing && (
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2">
              <div className="flex items-center gap-2 text-xs text-foreground font-medium">
                <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />
                <span>{currentStageText}</span>
              </div>
              <div className="h-1 bg-border/60 rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-pulse w-3/4 rounded-full" />
              </div>
            </div>
          )}

          {/* Erro em Linha Única */}
          {errorMessage && !isProcessing && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-between gap-2 text-xs text-destructive">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertCircle className="size-4 shrink-0" />
                <span className="truncate">{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={handleStartMagic}
                className="font-medium underline shrink-0 hover:opacity-80 flex items-center gap-1"
              >
                <RefreshCw className="size-3" />
                Tentar de novo
              </button>
            </div>
          )}
        </form>
      ) : (
        /* Resultado Silencioso e Pronto para Edição */
        <div className="p-4 rounded-xl bg-background border border-border space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              <span>Configuração concluída</span>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              {completedResult.brand_dna?.archetype || "DNA Ativo"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
            <div>
              <span className="font-medium text-foreground block">Empresa</span>
              {completedResult.company_name}
            </div>
            <div>
              <span className="font-medium text-foreground block">Tom de Voz</span>
              {completedResult.brand_voice}
            </div>
            <div className="sm:col-span-2">
              <span className="font-medium text-foreground block">Bio</span>
              <p className="line-clamp-2">{completedResult.bio}</p>
            </div>
          </div>

          {/* Mini Paleta do Brandkit */}
          {completedResult.theme_colors && (
            <div className="pt-2 border-t border-border/60 flex items-center gap-2">
              <span className="text-[11px] font-medium text-foreground">Paleta:</span>
              <div className="flex items-center gap-1">
                {Object.values(completedResult.theme_colors).filter(Boolean).map((hex, i) => (
                  <div
                    key={i}
                    className="size-4 rounded-full border border-black/10 shadow-xs"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
