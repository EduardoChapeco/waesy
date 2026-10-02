import { createFileRoute } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import {
  getSystemStatusReport,
  type SystemStatusReport,
  type SubsystemStatus,
} from "@/lib/telemetry/status-engine";
import { Button } from "@/components/ui/button";
import { ArrowClockwise, CheckCircle, Warning, XCircle, ShieldCheck } from "@phosphor-icons/react";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [{ title: "Status Operacional e Confiabilidade | Waesy" }],
  }),
  component: StatusPage,
});

function getStatusBadge(status: SubsystemStatus) {
  switch (status) {
    case "operational":
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-success bg-success/10 rounded-full border border-success/20">
          <CheckCircle className="size-4" weight="fill" />
          Operacional
        </span>
      );
    case "degraded":
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-warning bg-warning/10 rounded-full border border-warning/20">
          <Warning className="size-4" weight="fill" />
          Degradação
        </span>
      );
    case "outage":
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-destructive bg-destructive/10 rounded-full border border-destructive/20">
          <XCircle className="size-4" weight="fill" />
          Indisponível
        </span>
      );
  }
}

function StatusPage() {
  const [report, setReport] = useState<SystemStatusReport>(() => getSystemStatusReport());
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      setReport(getSystemStatusReport());
    });
  };

  const isHealthy = report.overallStatus === "operational";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-card/50">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <ShieldCheck className="size-6" weight="bold" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Status Operacional</h1>
              <p className="text-xs text-muted-foreground">
                Confiabilidade, telemetria em tempo real e orçamentos de serviço (SLO)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh} // focus-visible:ring-2
              disabled={isPending}
              className="h-11 px-4 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ArrowClockwise
                className={`size-4 mr-2 ${isPending ? "animate-spin motion-reduce:animate-none" : ""}`}
              />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 flex flex-col gap-8">
        {/* Banner Geral de Saúde */}
        <section
          className={`p-6 rounded-lg border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
            isHealthy
              ? "bg-success/5 border-success/30 text-success"
              : "bg-warning/5 border-warning/30 text-warning"
          }`}
        >
          <div className="flex items-center gap-4">
            {isHealthy ? (
              <CheckCircle className="size-8 shrink-0" weight="fill" />
            ) : (
              <Warning className="size-8 shrink-0" weight="fill" />
            )}
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {isHealthy
                  ? "Todos os sistemas operacionais"
                  : "Degradação pontual em monitoramento"}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Última auditoria em tempo real: {new Date(report.timestamp).toLocaleTimeString("pt-BR")}
              </p>
            </div>
          </div>
          <div>{getStatusBadge(report.overallStatus)}</div>
        </section>

        {/* Cartão de Error Budget e SLO */}
        <section className="bg-card border border-border rounded-lg p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-4">
            <div>
              <h3 className="text-sm font-semibold">Orçamento de Confiabilidade (SLO 99.9%)</h3>
              <p className="text-xs text-muted-foreground">
                Three Nines operacional com contenção de indisponibilidade
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {report.errorBudget.currentUptimePercent}%
              </span>
              <span className="text-xs text-muted-foreground ml-2">Uptime móvel</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="flex flex-col gap-1 p-3 bg-muted/30 rounded-md">
              <span className="text-xs text-muted-foreground">Meta Contratual (SLO)</span>
              <span className="text-sm font-semibold">{report.errorBudget.sloTargetPercent}%</span>
            </div>
            <div className="flex flex-col gap-1 p-3 bg-muted/30 rounded-md">
              <span className="text-xs text-muted-foreground">Consumo do Orçamento</span>
              <span className="text-sm font-semibold">
                {report.errorBudget.budgetConsumedPercent}%
              </span>
            </div>
            <div className="flex flex-col gap-1 p-3 bg-muted/30 rounded-md">
              <span className="text-xs text-muted-foreground">Status do Orçamento</span>
              <span
                className={`text-sm font-semibold ${
                  report.errorBudget.status === "HEALTHY"
                    ? "text-success"
                    : report.errorBudget.status === "WARNING"
                      ? "text-warning"
                      : "text-destructive"
                }`}
              >
                {report.errorBudget.status}
              </span>
            </div>
          </div>
        </section>

        {/* Grid de Subsistemas */}
        <section className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-semibold">Subsistemas da Infraestrutura</h3>
            <p className="text-xs text-muted-foreground">
              Monitoramento individualizado por camada operacional
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.subsystems.map((subsystem) => (
              <div
                key={subsystem.id}
                className="bg-card border border-border rounded-lg p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-medium text-foreground">{subsystem.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{subsystem.message}</p>
                  </div>
                  {getStatusBadge(subsystem.status)}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
                  <span>Disponibilidade: {subsystem.uptimePercent}%</span>
                  {subsystem.latencyMs !== undefined && (
                    <span>Latência P75: {subsystem.latencyMs}ms</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Histórico Recente de Incidentes */}
        <section className="bg-card border border-border rounded-lg p-6 flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Histórico de Incidentes (24 Horas)</h3>
          <p className="text-xs text-muted-foreground">
            Nenhum incidente ou parada não programada registrada no período móvel recente.
          </p>
        </section>
      </main>

      <footer className="border-t border-border bg-card/30 mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>Waesy Ecosystem Platform — Release {report.release}</span>
          <span>Atualização contínua via Cloudflare Edge & Postgres Multi-Tenant</span>
        </div>
      </footer>
    </div>
  );
}
