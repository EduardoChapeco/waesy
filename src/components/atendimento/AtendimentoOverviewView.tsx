import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  CheckCircle2,
  Clock,
  Download,
  Inbox,
  Layers,
  MessageSquare,
  Smartphone,
  Star,
  Users,
} from "lucide-react";
import { AtendimentoSubmoduleHeader } from "@/components/atendimento/AtendimentoSubmoduleHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WhatsAppOperationsMetricsPanel } from "@/components/chat/whatsapp-operations-metrics-panel";
import type { AttendanceBusinessIntelligenceDTO } from "@/services/whatsapp-operations-metrics.functions";
import { cn } from "@/lib/utils";

function formatDurationSeconds(sec: number | null | undefined): string {
  if (sec === null || sec === undefined || !Number.isFinite(sec)) return "—";
  if (sec < 60) return `${Math.round(sec)}s`;
  const min = Math.floor(sec / 60);
  const rem = Math.round(sec % 60);
  if (min < 60) return `${min}m ${rem}s`;
  const hours = Math.floor(min / 60);
  const remMin = min % 60;
  return `${hours}h ${remMin}m`;
}

function presenceLabel(presence: string): string {
  switch (presence) {
    case "online":
      return "Online";
    case "busy":
      return "Ocupado";
    case "away":
      return "Pausa";
    default:
      return "Offline";
  }
}

export interface AtendimentoOverviewViewProps {
  bi: AttendanceBusinessIntelligenceDTO;
  storeName?: string | null;
  filters: {
    rangeDays: 7 | 14 | 30 | 90;
    channelInstanceId?: string;
    departmentSlug?: string;
    agentProfileId?: string;
  };
  onFiltersChange: (next: {
    rangeDays?: 7 | 14 | 30 | 90;
    channelInstanceId?: string;
    departmentSlug?: string;
    agentProfileId?: string;
  }) => void;
}

export function AtendimentoOverviewView({
  bi,
  storeName,
  filters,
  onFiltersChange,
}: AtendimentoOverviewViewProps) {
  const maxDailyVolume = useMemo(() => {
    const vals = (bi.dailySeries || []).map((d) => Math.max(d.opened, d.resolved));
    return Math.max(1, ...vals);
  }, [bi.dailySeries]);

  const handleExportCsv = () => {
    const lines: string[] = [
      ["Seção", "Item", "Métrica 1", "Métrica 2", "Métrica 3"].join(";"),
      [
        "Resumo",
        `Período (${bi.rangeDays}d)`,
        `Total=${bi.summary.totalThreadsInPeriod}`,
        `Abertas=${bi.summary.openThreads}`,
        `FCR=${bi.summary.firstContactResolutionRate ?? "—"}%`,
      ].join(";"),
      ...bi.departments.map((d) =>
        [
          "Setor",
          d.name,
          `Total=${d.totalCount}`,
          `Abertas=${d.openCount}`,
          `SLA Quebrado=${d.slaBreachedCount} (${d.slaBreachedRate ?? 0}%)`,
        ].join(";"),
      ),
      ...bi.agents.map((a) =>
        [
          "Atendente",
          a.fullName,
          `Abertas=${a.openThreads}`,
          `Resolvidas=${a.resolvedThreads}`,
          `1a Resposta=${formatDurationSeconds(a.avgFirstResponseSeconds)}`,
        ].join(";"),
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bi-atendimento-${bi.rangeDays}d.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const recentDays = (bi.dailySeries || []).slice(-14);

  return (
    <div className="w-full px-0 sm:px-4 space-y-6">
      <AtendimentoSubmoduleHeader
        activeKey="overview"
        title="Visão Geral & BI"
        subtitle={
          storeName
            ? `Indicadores operacionais de atendimento, SLAs e filas — ${storeName}`
            : "Indicadores operacionais de atendimento, SLAs e desempenho da equipe"
        }
        showPrimaryChatCta
      />

      {/* Filtros Globais de BI */}
      <section className="rounded-xl border border-border/60 bg-card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Período</Label>
            <Select
              value={String(filters.rangeDays)}
              onValueChange={(val) =>
                onFiltersChange({ rangeDays: Number(val) as 7 | 14 | 30 | 90 })
              }
            >
              <SelectTrigger className="h-11 min-h-11 text-xs border-border/60 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="14">Últimos 14 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Canal WhatsApp</Label>
            <Select
              value={filters.channelInstanceId || "all"}
              onValueChange={(val) =>
                onFiltersChange({ channelInstanceId: val === "all" ? undefined : val })
              }
            >
              <SelectTrigger className="h-11 min-h-11 text-xs border-border/60 bg-background">
                <SelectValue placeholder="Todos canais" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos canais</SelectItem>
                {bi.filters.availableChannels.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                    {c.phone ? ` (${c.phone})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Setor</Label>
            <Select
              value={filters.departmentSlug || "all"}
              onValueChange={(val) =>
                onFiltersChange({ departmentSlug: val === "all" ? undefined : val })
              }
            >
              <SelectTrigger className="h-11 min-h-11 text-xs border-border/60 bg-background">
                <SelectValue placeholder="Todos setores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos setores</SelectItem>
                {bi.filters.availableDepartments.map((d) => (
                  <SelectItem key={d.slug} value={d.slug}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Atendente</Label>
            <Select
              value={filters.agentProfileId || "all"}
              onValueChange={(val) =>
                onFiltersChange({ agentProfileId: val === "all" ? undefined : val })
              }
            >
              <SelectTrigger className="h-11 min-h-11 text-xs border-border/60 bg-background">
                <SelectValue placeholder="Toda equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toda equipe</SelectItem>
                {bi.filters.availableAgents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleExportCsv}
            className="h-11 min-h-11 px-4 rounded-lg text-xs font-medium gap-2 border-border/60 focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Download className="size-4" />
            <span>Exportar CSV</span>
          </Button>
        </div>
      </section>

      {/* KPIs Principais (4 cards planos soberanos) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Conversas no Período</span>
            <Inbox className="size-4" />
          </div>
          <p className="text-2xl font-semibold font-mono text-foreground">
            {bi.summary.totalThreadsInPeriod}
          </p>
          <p className="text-xs text-muted-foreground">
            {bi.summary.openThreads} abertas • {bi.summary.unassignedThreads} sem atribuição
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>1ª Resposta Média</span>
            <Clock className="size-4" />
          </div>
          <p className="text-2xl font-semibold font-mono text-foreground">
            {formatDurationSeconds(bi.summary.avgFirstResponseSeconds)}
          </p>
          <p className="text-xs text-muted-foreground">
            {bi.summary.awaitingFirstResponse} aguardando • P95:{" "}
            {formatDurationSeconds(bi.summary.p95FirstResponseSeconds)}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Resolução 1º Contato (FCR)</span>
            <CheckCircle2 className="size-4" />
          </div>
          <p className="text-2xl font-semibold font-mono text-foreground">
            {bi.summary.firstContactResolutionRate !== null
              ? `${bi.summary.firstContactResolutionRate}%`
              : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {bi.summary.closedInPeriod} concluídas • TMO:{" "}
            {formatDurationSeconds(bi.summary.avgResolutionSeconds)}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Satisfação (CSAT)</span>
            <Star className="size-4" />
          </div>
          {bi.summary.csatAvg !== null && bi.summary.csatCount > 0 ? (
            <>
              <p className="text-2xl font-semibold font-mono text-foreground">
                {bi.summary.csatAvg.toFixed(1)} / 5.0
              </p>
              <p className="text-xs text-muted-foreground">
                Base: {bi.summary.csatCount} avaliações reais
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-semibold font-mono text-muted-foreground">—</p>
              <p className="text-xs text-muted-foreground">Sem avaliações registradas</p>
            </>
          )}
        </div>
      </section>

      {/* Série Diária + Saúde da Fila Outbox */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border/60 bg-card p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Volume Diário</h2>
              <p className="text-xs text-muted-foreground">
                Últimos {recentDays.length} dias com comparativo abertas vs concluídas
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-primary" /> Abertas
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-muted-foreground/50" /> Concluídas
              </span>
            </div>
          </div>

          {recentDays.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">
              Nenhuma movimentação registrada no período selecionado.
            </p>
          ) : (
            <div className="divide-y divide-border/50">
              {recentDays.map((day) => {
                const openPct = Math.round((day.opened / maxDailyVolume) * 100);
                const resPct = Math.round((day.resolved / maxDailyVolume) * 100);
                return (
                  <div
                    key={day.date}
                    className="py-2 grid grid-cols-2 sm:grid-cols-12 items-center gap-3 text-xs"
                  >
                    <span className="col-span-1 sm:col-span-2 font-mono text-muted-foreground">
                      {day.date.slice(5).split("-").reverse().join("/")}
                    </span>
                    <div className="col-span-2 order-3 sm:order-none sm:col-span-8 space-y-1">
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(day.opened > 0 ? 4 : 0, openPct)}%` }}
                        />
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-muted-foreground/50"
                          style={{ width: `${Math.max(day.resolved > 0 ? 4 : 0, resPct)}%` }}
                        />
                      </div>
                    </div>
                    <span className="col-span-1 sm:col-span-2 text-right font-mono text-foreground">
                      {day.opened} / {day.resolved}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" />
              <span>Fila & Worker</span>
            </h2>
            <Badge variant="outline" className="text-xs font-mono">
              {bi.summary.workerStatus}
            </Badge>
          </div>

          <div className="divide-y divide-border/50 text-xs">
            <div className="py-2 flex items-center justify-between">
              <span className="text-muted-foreground">Pendentes Outbox</span>
              <span className="font-mono font-semibold text-foreground">
                {bi.summary.outboxPending}
              </span>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span className="text-muted-foreground">Falhas Retentativa</span>
              <span className="font-mono font-semibold text-foreground">
                {bi.summary.outboxFailed}
              </span>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span className="text-muted-foreground">Dead-Letter</span>
              <span
                className={cn(
                  "font-mono font-semibold",
                  bi.summary.outboxDeadLetter > 0 ? "text-destructive" : "text-foreground",
                )}
              >
                {bi.summary.outboxDeadLetter}
              </span>
            </div>
          </div>

          <Button
            asChild
            variant="outline"
            className="w-full h-11 min-h-11 rounded-lg text-xs font-medium border-border/60 focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Link to={"/workspace/atendimento/whatsapp" as any}>Gerenciar Canais WhatsApp</Link>
          </Button>
        </div>
      </section>

      {/* Volume por Canal WhatsApp + SLA por Setor */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Smartphone className="size-4 text-muted-foreground" />
              <span>Canais WhatsApp</span>
            </h2>
            <Link
              to={"/workspace/atendimento/whatsapp" as any}
              className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              Configurar
            </Link>
          </div>

          {bi.channels.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-muted-foreground">Nenhum número WhatsApp cadastrado.</p>
              <Button
                asChild
                variant="outline"
                className="h-11 min-h-11 text-xs border-border/60"
              >
                <Link to={"/workspace/atendimento/whatsapp" as any}>Conectar WhatsApp</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {bi.channels.map((ch) => (
                <div
                  key={ch.instanceId}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-2 rounded-full shrink-0",
                          ch.status === "connected"
                            ? "bg-emerald-500"
                            : ch.status === "error" || ch.status === "revoked"
                              ? "bg-destructive"
                              : "bg-warning",
                        )}
                      />
                      <span className="font-medium text-foreground truncate">{ch.displayName}</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono pl-4 truncate">
                      {ch.phone || "Sem número pareado"}
                    </p>
                  </div>
                  <div className="text-right shrink-0 font-mono">
                    <p className="font-semibold text-foreground">{ch.threadsCount} conversas</p>
                    <p className="text-xs text-muted-foreground">{ch.openCount} abertas</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Layers className="size-4 text-muted-foreground" />
              <span>Desempenho & SLA por Setor</span>
            </h2>
            <Link
              to={"/workspace/atendimento/filas" as any}
              className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              Editar Filas
            </Link>
          </div>

          {bi.departments.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">
              Nenhum setor registrado nas conversas do período.
            </p>
          ) : (
            <div className="divide-y divide-border/50">
              {bi.departments.map((dept) => (
                <div
                  key={dept.slug}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{dept.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Meta SLA: {dept.slaMinutes} min • {dept.openCount} abertas
                    </p>
                  </div>
                  <div className="text-right shrink-0 font-mono">
                    <p className="font-semibold text-foreground">{dept.totalCount} total</p>
                    <p
                      className={cn(
                        "text-xs",
                        dept.slaBreachedCount > 0 ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {dept.slaBreachedCount} fora SLA
                      {dept.slaBreachedRate !== null ? ` (${dept.slaBreachedRate}%)` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Ranking Real de Atendentes */}
      <section className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <span>Ranking de Atendentes</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Desempenho real vinculado aos perfis da loja no período selecionado
            </p>
          </div>
          <Link
            to={"/workspace/atendimento/atendentes" as any}
            className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Gerenciar Presença
          </Link>
        </div>

        {bi.agents.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">
            Nenhum colaborador cadastrado nesta operação.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="md:hidden divide-y divide-border/50">
              {bi.agents.map((agent) => (
                <div key={agent.profileId} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {agent.avatarUrl ? (
                      <img
                        src={agent.avatarUrl}
                        alt={agent.fullName}
                        className="size-8 rounded-full object-cover shrink-0 bg-muted"
                      />
                    ) : (
                      <span className="size-8 rounded-full bg-muted text-foreground text-xs font-semibold flex items-center justify-center shrink-0">
                        {agent.fullName.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{agent.fullName}</p>
                      <p className="text-muted-foreground truncate">
                        {agent.departmentName || "Geral"} · {presenceLabel(agent.presence)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right font-mono shrink-0">
                    <p className="font-semibold text-foreground">{agent.openThreads} / {agent.maxConcurrentChats}</p>
                    <p className="text-muted-foreground">{agent.resolvedThreads} res · {formatDurationSeconds(agent.avgFirstResponseSeconds)}</p>
                  </div>
                </div>
              ))}
            </div>
            <table className="hidden md:table w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Atendente</th>
                  <th className="py-2 px-3 font-medium">Setor</th>
                  <th className="py-2 px-3 font-medium">Presença</th>
                  <th className="py-2 px-3 font-medium text-right">Abertas / Limite</th>
                  <th className="py-2 px-3 font-medium text-right">Concluídas</th>
                  <th className="py-2 pl-3 font-medium text-right">1ª Resposta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {bi.agents.map((agent) => (
                  <tr key={agent.profileId} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 pr-3 font-medium text-foreground">
                      <div className="flex items-center gap-2 min-w-0">
                        {agent.avatarUrl ? (
                          <img
                            src={agent.avatarUrl}
                            alt={agent.fullName}
                            className="size-7 rounded-full object-cover shrink-0 bg-muted"
                          />
                        ) : (
                          <span className="size-7 rounded-full bg-muted text-foreground text-xs font-semibold flex items-center justify-center shrink-0">
                            {agent.fullName.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="truncate">{agent.fullName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {agent.departmentName || "Geral"}
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant="outline" className="text-xs gap-1">
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            agent.presence === "online"
                              ? "bg-emerald-500"
                              : agent.presence === "busy"
                                ? "bg-warning"
                                : "bg-muted-foreground",
                          )}
                        />
                        {presenceLabel(agent.presence)}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-foreground">
                      {agent.openThreads} / {agent.maxConcurrentChats}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-foreground">
                      {agent.resolvedThreads}
                    </td>
                    <td className="py-3 pl-3 text-right font-mono text-muted-foreground">
                      {formatDurationSeconds(agent.avgFirstResponseSeconds)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Telemetria em Tempo Real de Workers */}
      <section className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="size-4 text-muted-foreground" />
            <span>Telemetria de Entregas WhatsApp</span>
          </h2>
        </div>
        <WhatsAppOperationsMetricsPanel />
      </section>
    </div>
  );
}
