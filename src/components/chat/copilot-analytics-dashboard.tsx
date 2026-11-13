import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  Coins,
  CheckCircle2,
  Clock,
  Layers,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getCopilotUsageAnalytics,
  type CopilotUsageAnalyticsDTO,
} from "@/services/ai-scheduled-tasks.functions";

export interface CopilotAnalyticsDashboardProps {
  className?: string;
}

export function CopilotAnalyticsDashboard({ className }: CopilotAnalyticsDashboardProps) {
  const [data, setData] = useState<CopilotUsageAnalyticsDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await getCopilotUsageAnalytics();
      setData(res);
    } catch (err: any) {
      setErrorMsg(err?.message || "Não foi possível carregar os indicadores reais de uso.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const successRate =
    data && data.totalExecutions > 0
      ? ((data.completedExecutions / data.totalExecutions) * 100).toFixed(1)
      : "0.0";

  const avgDurationMs =
    data && data.recentExecutions.length > 0
      ? Math.round(
          data.recentExecutions.reduce((acc, item) => acc + item.durationMs, 0) /
            data.recentExecutions.length
        )
      : 0;

  return (
    <div className={cn("space-y-6 max-w-5xl mx-auto p-4 sm:p-6", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Métricas & Consumo
            </h2>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
              Telemetria Real
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Indicadores reais consolidados das execuções do Copilot, conectores e servidores MCP.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void loadAnalytics()}
          disabled={isLoading}
          className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <RefreshCw className={cn("size-4", isLoading && "animate-spin motion-reduce:animate-none")} />
          <span>Atualizar</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="h-32 rounded-2xl border border-border/40 bg-muted/20 animate-pulse motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : errorMsg ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 text-destructive shrink-0 mt-1" />
            <div>
              <p className="text-sm font-semibold text-foreground">Falha ao carregar telemetria</p>
              <p className="text-xs text-muted-foreground mt-1">{errorMsg}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadAnalytics()}
            className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Tentar Novamente
          </Button>
        </div>
      ) : !data || data.totalExecutions === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center space-y-3 bg-muted/10">
          <Layers className="size-10 mx-auto text-muted-foreground/40" />
          <h3 className="text-sm font-semibold text-foreground">
            Nenhuma execução registrada ainda
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Envie comandos no Copilot para acompanhar volume de execuções, consumo real de tokens e integrações ativas ({data?.activeConnectorsCount || 0} conectores, {data?.activeMcpServersCount || 0} servidores MCP).
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border/40 bg-card p-4 sm:p-5 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Execuções</span>
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <CheckCircle2 className="size-4" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {data.totalExecutions}
                </div>
                <p className="text-2xs text-muted-foreground mt-1">
                  {data.completedExecutions} concluídas • {data.failedExecutions} falhas
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/40 bg-card p-4 sm:p-5 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Taxa de Sucesso</span>
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <TrendingUp className="size-4" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {successRate}%
                </div>
                <p className="text-2xs text-muted-foreground mt-1">
                  {data.totalSteps} passos registrados
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/40 bg-card p-4 sm:p-5 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Tokens Apurados</span>
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Coins className="size-4" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {data.totalTokens.toLocaleString("pt-BR")}
                </div>
                <p className="text-2xs text-muted-foreground mt-1">
                  Custo estimado: ${data.estimatedCostUsd.toFixed(4)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/40 bg-card p-4 sm:p-5 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Latência & Ecossistema</span>
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Clock className="size-4" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {avgDurationMs}ms
                </div>
                <p className="text-2xs text-muted-foreground mt-1">
                  {data.activeConnectorsCount} conectores • {data.activeMcpServersCount} MCP ativos
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground">
              Execuções Recentes Persistidas
            </h3>
            <div className="space-y-3">
              {data.recentExecutions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhuma execução recente registrada.
                </p>
              ) : (
                data.recentExecutions.map((exec) => (
                  <div
                    key={exec.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-border/40 bg-muted/20"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {exec.promptPreview || "Execução sem descrição"}
                      </p>
                      <p className="text-2xs text-muted-foreground mt-1">
                        {new Date(exec.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-2xs",
                          exec.status === "failed"
                            ? "bg-destructive/10 text-destructive border-destructive/30"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                        )}
                      >
                        {exec.status}
                      </Badge>
                      <span className="text-2xs font-mono text-muted-foreground">
                        {exec.durationMs}ms
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
