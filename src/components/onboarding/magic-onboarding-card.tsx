/**
 * magic-onboarding-card.tsx — Card de Onboarding Guiado por IA (Silent Design & Apple HIG)
 * 
 * Design Direto, Funcional e Mínimo:
 * - Zero texto decorativo ou explicativo longo
 * - Rastreamento real de etapas
 * - Tarifa oficial de 20.000 Tokens da Plataforma (ONBOARDING_AI_COST)
 */

import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Globe, ArrowRight, CheckCircle2, Loader2, Zap, AlertCircle, RefreshCw, Palette, LayoutGrid, Compass, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  startMagicOnboardingJob,
  runMagicOnboardingJob,
  getOnboardingJobStatus,
  type MagicOnboardingResult,
  type OnboardingLiveState,
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
  const [currentStageText, setCurrentStageText] = useState("Verificando provedor de IA...");
  const [progressPercent, setProgressPercent] = useState(0);
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
    setProgressPercent(0);
    setCurrentStageText("Verificando provedor de IA...");
    setCompletedResult(null);

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    try {
      const { jobId } = await startMagicOnboardingJob({
        data: { url: targetUrl, store_id: storeId },
      });

      setProgressPercent(5);
      setCurrentStageText("Conectando fontes reais e capturando prints...");

      pollInterval = setInterval(async () => {
        try {
          const job = await getOnboardingJobStatus({ data: { jobId } });
          if (typeof job?.progress_percent === "number") {
            setProgressPercent(job.progress_percent);
          }
          const liveState = (job?.result as any)?.live_state as OnboardingLiveState | undefined;
          const lastLog = liveState?.logs?.[liveState.logs.length - 1];
          if (lastLog?.text) {
            setCurrentStageText(lastLog.text);
          }
        } catch {
          // Ignora falha transitória de polling
        }
      }, 1000);

      const res = await runMagicOnboardingJob({
        data: {
          jobId,
          url: targetUrl,
          store_id: storeId,
        },
      });

      if (res.success && res.result) {
        setCompletedResult(res.result);
        setProgressPercent(100);
        setCurrentStageText("Identidade visual e catálogo prontos.");
        toast.success(res.message);
        if (onSuccess) onSuccess(res.result);
      }
    } catch (err: any) {
      const msg = err?.message || "Falha ao configurar as informações da loja.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      if (pollInterval) clearInterval(pollInterval);
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Zap className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground line-clamp-1">Importar por URL</h3>
            <p className="text-xs text-muted-foreground">
              Preencha marca e catálogo automaticamente a partir do seu site ou Instagram.
            </p>
          </div>
        </div>

        <span className="text-xs font-mono text-muted-foreground shrink-0">
          {formatPlatformTokens(ONBOARDING_AI_COST)} tokens
        </span>
      </div>

      {!completedResult ? (
        <form onSubmit={handleStartMagic} className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="instagram.com/empresa ou meusite.com.br"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isProcessing}
                className="pl-10 h-11 rounded-xl text-xs bg-background"
              />
            </div>

            <Button
              type="submit"
              disabled={isProcessing}
              className="w-full sm:w-auto h-11 min-h-11 px-4 rounded-xl text-xs font-semibold gap-2 shrink-0"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <span>Importar</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>

          {/* Estado de Processamento Real */}
          {isProcessing && (
            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs text-foreground font-medium">
                <div className="flex items-center gap-2 min-w-0">
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none text-primary shrink-0" />
                  <span className="truncate">{currentStageText}</span>
                </div>
                <span className="font-mono text-2xs text-muted-foreground shrink-0">{progressPercent}%</span>
              </div>
              <div className="h-1 bg-border/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(5, progressPercent)}%` }}
                />
              </div>
            </div>
          )}

          {/* Erro em Linha Única */}
          {errorMessage && !isProcessing && (
            <div role="alert" className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-between gap-2 text-xs text-destructive">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="size-4 shrink-0" />
                <span className="truncate">{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={handleStartMagic}
                className="min-h-11 px-3 rounded-lg font-medium underline shrink-0 hover:opacity-80 inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
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
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              <span>Importação concluída</span>
            </div>
            <Badge variant="secondary" className="text-xs rounded-xl">
              {completedResult.brand_dna?.archetype || "Perfil ativo"}
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
            <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">Paleta:</span>
                <div className="flex items-center gap-1">
                  {Object.values(completedResult.theme_colors).filter(Boolean).map((hex, i) => (
                    <div
                      key={i}
                      className="size-4 rounded-full border border-border waesy-dyn-bg"
                      style={{ "--dyn-bg": hex } as React.CSSProperties}
                      title={hex}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Atalhos Rápidos para os Módulos Criados */}
          <div className="pt-3 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button asChild variant="outline" size="sm" className="h-11 min-h-11 rounded-xl text-xs font-medium gap-2 justify-start">
              <Link to="/workspace/marketing/brand-kit">
                <Palette className="size-4 text-primary" />
                <span>Brand Kit</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-11 min-h-11 rounded-xl text-xs font-medium gap-2 justify-start">
              <Link to="/workspace/marketing/canvas-bmc">
                <LayoutGrid className="size-4 text-primary" />
                <span>Modelo BMC</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-11 min-h-11 rounded-xl text-xs font-medium gap-2 justify-start">
              <Link to="/workspace/marketing/swot">
                <Compass className="size-4 text-primary" />
                <span>Matriz SWOT</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-11 min-h-11 rounded-xl text-xs font-medium gap-2 justify-start">
              <Link to="/workspace/marketing/canvas-pecados">
                <Flame className="size-4 text-primary" />
                <span>7 Pecados</span>
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
