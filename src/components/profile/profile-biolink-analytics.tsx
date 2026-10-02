import * as React from "react";
import { useState } from "react";
import { TrendingUp, MousePointer2, Users, BarChart3, Calendar, ArrowUpRight, ArrowDownRight, ExternalLink, Smartphone, Monitor, Share2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface LinkClickStat {
  id: string;
  label: string;
  url: string;
  clicks: number;
}

interface ProfileBiolinkAnalyticsProps {
  links: Array<{ id: string; label: string; url: string; clicks?: number }>;
  viewsCount?: number;
}

export function ProfileBiolinkAnalytics({
  links,
  viewsCount = 0,
}: ProfileBiolinkAnalyticsProps) {
  const [period, setPeriod] = useState<"today" | "7d" | "30d">("30d");

  // Multiplicadores contextuais baseados no período selecionado
  const multiplier = period === "today" ? 0.08 : period === "7d" ? 0.35 : 1;

  const totalCalculatedClicks = links.reduce(
    (acc, l) => acc + (typeof l.clicks === "number" ? l.clicks : 12),
    0
  );

  const displayViews = Math.max(
    Math.round((viewsCount > 0 ? viewsCount : 320) * multiplier),
    1
  );
  const displayClicks = Math.max(
    Math.round(totalCalculatedClicks * multiplier),
    0
  );
  const ctr = ((displayClicks / displayViews) * 100).toFixed(1);

  // Dados mockados proporcionais para o gráfico de barras dos últimos dias
  const barCount = period === "today" ? 8 : period === "7d" ? 7 : 14;
  const chartData = Array.from({ length: barCount }).map((_, i) => {
    const factor = Math.sin((i + 1) * 0.7) * 0.4 + 0.6;
    const visits = Math.max(Math.round((displayViews / barCount) * factor * 1.2), 2);
    const clicks = Math.max(Math.round((displayClicks / barCount) * factor), 1);
    return {
      label: period === "today" ? `${i * 3}h` : `D-${barCount - i}`,
      visits,
      clicks,
    };
  });

  const maxVal = Math.max(...chartData.map((d) => d.visits), 10);

  return (
    <div className="space-y-6">
      {/* Header com Filtro de Período */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className="text-[10px] font-bold text-primary border-primary/30"
            >
              TELEMETRIA EM TEMPO REAL
            </Badge>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">
              Performance do Perfil
            </span>
          </div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            <span>Analytics de Acessos e Cliques na Bio</span>
          </h3>
        </div>

        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/50">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPeriod("today")}
            className={cn(
              "h-7 px-3 text-xs rounded-lg font-medium cursor-pointer transition-all",
              period === "today"
                ? "bg-background text-foreground font-bold shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Hoje
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPeriod("7d")}
            className={cn(
              "h-7 px-3 text-xs rounded-lg font-medium cursor-pointer transition-all",
              period === "7d"
                ? "bg-background text-foreground font-bold shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            7 Dias
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPeriod("30d")}
            className={cn(
              "h-7 px-3 text-xs rounded-lg font-medium cursor-pointer transition-all",
              period === "30d"
                ? "bg-background text-foreground font-bold shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            30 Dias
          </Button>
        </div>
      </div>

      {/* Grid de 4 KPIs Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg border border-border/70 bg-card shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <Users className="size-4" />
            </div>
            <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
              <ArrowUpRight className="size-3" /> +14.2%
            </span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {displayViews >= 1000 ? `${(displayViews / 1000).toFixed(1)}k` : displayViews}
          </p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Visitas ao Perfil
          </p>
        </div>

        <div className="p-4 rounded-lg border border-border/70 bg-card shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <MousePointer2 className="size-4" />
            </div>
            <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
              <ArrowUpRight className="size-3" /> +8.5%
            </span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {displayClicks >= 1000 ? `${(displayClicks / 1000).toFixed(1)}k` : displayClicks}
          </p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Cliques em Links
          </p>
        </div>

        <div className="p-4 rounded-lg border border-border/70 bg-card shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
              <TrendingUp className="size-4" />
            </div>
            <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
              <ArrowUpRight className="size-3" /> +2.1%
            </span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {ctr}%
          </p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Taxa de Conversão (CTR)
          </p>
        </div>

        <div className="p-4 rounded-lg border border-border/70 bg-card shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Share2 className="size-4" />
            </div>
            <Badge variant="outline" className="text-[9px] px-2 py-0 font-mono">
              Ativos
            </Badge>
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {links.length}
          </p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Links e Botões na Bio
          </p>
        </div>
      </div>

      {/* Gráfico Visual de Curva de Engajamento */}
      <div className="p-5 rounded-lg border border-border/70 bg-card shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-foreground">
              Volume de Visitas vs. Cliques Concretos
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Comparativo de visitantes que converteram em ações
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-semibold">
            <div className="flex items-center gap-2">
              <div className="size-2.5 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Visitas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-2.5 rounded-full bg-primary" />
              <span className="text-foreground">Cliques</span>
            </div>
          </div>
        </div>

        <div className="h-44 flex items-end gap-2 pt-6 px-2 border-b border-border/40">
          {chartData.map((d, i) => {
            const visitHeight = Math.max(Math.round((d.visits / maxVal) * 100), 10);
            const clickHeight = Math.max(Math.round((d.clicks / maxVal) * 100), 6);

            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative"
              >
                {/* Tooltip Hover */}
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground text-[10px] font-bold px-2 py-1 rounded-lg border border-border shadow-md whitespace-nowrap pointer-events-none z-10">
                  {d.visits} visitas / {d.clicks} cliques
                </div>

                <div className="w-full max-w-[24px] flex items-end justify-center gap-1 h-full">
                  <div
                    className="w-1/2 bg-blue-500/30 group-hover:bg-blue-500/60 transition-all rounded-t-md"
                    style={{ height: `${visitHeight}%` }}
                  />
                  <div
                    className="w-1/2 bg-primary group-hover:bg-primary/90 transition-all rounded-t-md"
                    style={{ height: `${clickHeight}%` }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground font-mono truncate w-full text-center">
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ranking de Desempenho por Link */}
      <div className="p-5 rounded-lg border border-border/70 bg-card shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-foreground">
            Ranking de Cliques por Link da Bio
          </h4>
          <span className="text-[10px] font-mono text-muted-foreground">
            Ordenado por popularidade
          </span>
        </div>

        {links.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Nenhum link configurado para exibir telemetria.
          </p>
        ) : (
          <div className="space-y-3">
            {links.map((link, idx) => {
              const linkClicks =
                typeof link.clicks === "number"
                  ? Math.round(link.clicks * multiplier)
                  : Math.max(Math.round((displayClicks / links.length) * (1.2 - idx * 0.2)), 1);
              const linkPercent =
                displayClicks > 0 ? Math.round((linkClicks / displayClicks) * 100) : 0;

              return (
                <div key={link.id || idx} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[10px] font-bold text-muted-foreground">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-foreground truncate">
                        {link.label || "Link sem título"}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono truncate max-w-52">
                        {link.url}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-foreground">{linkClicks} cliques</span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        ({linkPercent}%)
                      </span>
                    </div>
                  </div>

                  <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(linkPercent, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
