import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, MessageSquare, RefreshCw, ServerCog, Users } from "lucide-react";
import { getWhatsAppOperationsMetrics, type WhatsAppOperationsMetricsDTO } from "@/services/whatsapp-operations-metrics.functions";
import { getRealtimeChannel } from "@/services/realtime-channel";

function number(value: unknown) { return Number(value || 0).toLocaleString("pt-BR"); }
function milliseconds(value: unknown) { const n = Math.round(Number(value || 0)); return n < 1000 ? `${n} ms` : `${(n / 1000).toFixed(1)} s`; }
function seconds(value: unknown) { const n = Math.round(Number(value || 0)); return n < 60 ? `${n}s` : `${Math.round(n / 60)}min`; }
function healthLabel(status: WhatsAppOperationsMetricsDTO["health"]["worker_status"]) {
  return { starting: "iniciando", running: "executando", degraded: "degradado", idle: "ocioso", failed: "falhou", stale: "sem heartbeat", unknown: "desconhecido" }[status];
}
function healthClass(status: WhatsAppOperationsMetricsDTO["health"]["worker_status"]) {
  return status === "running" || status === "idle" ? "text-emerald-700" : status === "degraded" || status === "starting" ? "text-amber-700" : "text-rose-700";
}

export function WhatsAppOperationsMetricsPanel() {
  const [metrics, setMetrics] = useState<WhatsAppOperationsMetricsDTO | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const refresh = async () => {
      try {
        const value = await getWhatsAppOperationsMetrics({ data: {} });
        if (!disposed && value) { setMetrics(value); setUpdatedAt(value.generated_at); setError(null); }
      } catch (cause) {
        if (!disposed) setError(cause instanceof Error ? cause.message : "Não foi possível consultar a telemetria WhatsApp.");
      } finally { if (!disposed) setLoading(false); }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    const { channel, unsubscribe } = getRealtimeChannel("whatsapp-operations-metrics");
    channel?.on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_outbox" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_outbox_attempts" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_threads" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_worker_heartbeats" }, () => void refresh())
      .subscribe();
    return () => { disposed = true; window.clearInterval(timer); unsubscribe(); };
  }, []);

  const topAgents = useMemo(() => [...(metrics?.agents || [])].sort((a, b) => b.open_threads - a.open_threads).slice(0, 3), [metrics?.agents]);
  if (loading && !metrics) return <section className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">Carregando telemetria operacional WhatsApp...</section>;
  if (!metrics) return <section className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">{error || "Telemetria WhatsApp indisponível."}</section>;

  const queueTotal = metrics.queue.pending + metrics.queue.processing + metrics.queue.failed;
  const workerStatus = metrics.health?.worker_status || "unknown";
  const hasFailures = metrics.queue.failed > 0 || metrics.queue.dead_letter > 0 || metrics.queue.retryable_failures_24h > 0;
  return (
    <section className="rounded-lg border border-border bg-card p-4 motion-reduce:transition-none" aria-label="Telemetria operacional do WhatsApp">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div><h2 className="flex items-center gap-2 text-sm font-bold"><Activity className="size-4 text-emerald-600" /> Saúde operacional WhatsApp</h2><p className="text-xs text-muted-foreground">RPC tenant-scoped + eventos reais do Supabase Realtime</p></div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><span>{updatedAt && new Date(updatedAt).toLocaleTimeString("pt-BR")}</span><RefreshCw className={`size-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Fila ativa</p><strong>{number(queueTotal)}</strong><p className="text-xs text-muted-foreground">mais antiga: {seconds(metrics.queue.oldest_pending_seconds)}</p></div>
        <div className="rounded-lg bg-warning/10 p-3"><p className="text-xs text-muted-foreground">Falhas / retry 24h</p><strong>{number(metrics.queue.failed)} / {number(metrics.queue.retryable_failures_24h)}</strong></div>
        <div className="rounded-lg bg-destructive/10 p-3"><p className="text-xs text-muted-foreground">Dead-letter</p><strong>{number(metrics.queue.dead_letter)}</strong></div>
        <div className="rounded-lg bg-accent p-3"><p className="text-xs text-muted-foreground">Latência P95</p><strong>{milliseconds(metrics.queue.p95_latency_ms_24h)}</strong><p className="text-xs text-muted-foreground">throughput: {number(metrics.queue.throughput_24h)} / 24h</p></div>
        <div className="rounded-lg bg-success/10 p-3"><p className="text-xs text-muted-foreground">Worker</p><strong className={healthClass(workerStatus)}>{healthLabel(workerStatus)}</strong><p className="text-xs text-muted-foreground">{number(metrics.health.worker_count)} ativo(s)</p></div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-border p-3"><p className="mb-2 flex items-center gap-2 text-xs font-semibold"><MessageSquare className="size-4" /> Conversas</p><div className="flex justify-between text-xs"><span>Abertas</span><strong>{number(metrics.conversations.open)}</strong></div><div className="flex justify-between text-xs"><span>Sem atendente</span><strong>{number(metrics.conversations.unassigned)}</strong></div><div className="flex justify-between text-xs"><span>1a resposta média / P95</span><strong>{seconds(metrics.conversations.first_response_avg_seconds)} / {seconds(metrics.conversations.first_response_p95_seconds)}</strong></div></div>
        <div className="rounded-lg border border-border p-3"><p className="mb-2 flex items-center gap-2 text-xs font-semibold"><Users className="size-4" /> Atendentes com maior carga</p>{topAgents.length ? topAgents.map((agent) => <div key={agent.profile_id} className="flex justify-between text-xs"><span className="truncate">{agent.profile_id.slice(0, 8)}...</span><span>{agent.open_threads} abertas / {seconds(agent.avg_first_response_seconds)}</span></div>) : <span className="text-xs text-muted-foreground">Nenhum atendimento atribuído.</span>}</div>
        <div className="rounded-lg border border-border p-3"><p className="mb-2 flex items-center gap-2 text-xs font-semibold"><ServerCog className="size-4" /> Providers (24h)</p>{metrics.providers.length ? metrics.providers.slice(0, 3).map((provider) => <div key={provider.provider} className="flex justify-between gap-2 text-xs"><span className="truncate">{provider.provider}</span><span>{number(provider.accepted)}/{number(provider.attempts)} / {milliseconds(provider.p95_duration_ms)}</span></div>) : <span className="text-xs text-muted-foreground">Nenhuma tentativa registrada.</span>}</div>
      </div>
      {error && <p className="mt-3 text-xs text-amber-700">Atualização parcial: {error}</p>}
      {hasFailures ? <p className="mt-3 flex items-center gap-2 text-xs text-amber-700"><AlertTriangle className="size-3.5" /> Existem falhas ou retries que exigem acompanhamento operacional.</p> : <p className="mt-3 flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 className="size-3.5" /> Filas sem falhas registradas no período consultado.</p>}
      <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="size-4" /> Último heartbeat: {metrics.health.worker_last_seen_at ? new Date(metrics.health.worker_last_seen_at).toLocaleString("pt-BR") : "não registrado"}</p>
    </section>
  );
}
