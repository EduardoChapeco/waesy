import { QrCode, DeviceMobile, Desktop, DeviceTabletCamera, ArrowsClockwise } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/state/states";
import { generateQrCodeDataUri } from "@/lib/qr-code";
import { formatDate } from "@/lib/datetime";
import type { PwaTelemetrySummary } from "@/services/pwa.functions";

export interface BrandedAppTelemetryPanelProps {
  telemetry?: PwaTelemetrySummary;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  appUrl: string;
  storeName: string;
}

export function BrandedAppTelemetryPanel({
  telemetry,
  isLoading,
  isError,
  onRetry,
  appUrl,
  storeName,
}: BrandedAppTelemetryPanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Erro ao carregar telemetria do aplicativo"
        description="Não foi possível consultar os eventos de instalação e acesso no momento."
        onRetry={onRetry}
      />
    );
  }

  const totalPlatformEvents =
    (telemetry?.platformBreakdown?.ios || 0) +
    (telemetry?.platformBreakdown?.android || 0) +
    (telemetry?.platformBreakdown?.desktop || 0) +
    (telemetry?.platformBreakdown?.other || 0);

  const platformRows = [
    { key: "android", label: "Android / Chrome PWA", count: telemetry?.platformBreakdown?.android || 0, Icon: DeviceMobile },
    { key: "ios", label: "iPhone / iPad (iOS Safari)", count: telemetry?.platformBreakdown?.ios || 0, Icon: DeviceTabletCamera },
    { key: "desktop", label: "Desktop (Windows / Mac)", count: telemetry?.platformBreakdown?.desktop || 0, Icon: Desktop },
    { key: "other", label: "Outros Navegadores", count: telemetry?.platformBreakdown?.other || 0, Icon: ArrowsClockwise },
  ];

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      toast.success("Link do aplicativo copiado!");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  return (
    <div className="space-y-6">
      {/* KPIs reais sem dados sintéticos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Instalações Confirmadas</span>
          <p className="text-2xl font-black font-mono tabular-nums text-foreground">
            {telemetry?.totalInstalls ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Convites Exibidos</span>
          <p className="text-2xl font-black font-mono tabular-nums text-foreground">
            {telemetry?.promptsShown ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Aberturas em Modo App</span>
          <p className="text-2xl font-black font-mono tabular-nums text-foreground">
            {telemetry?.appOpens ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Conversão do Convite</span>
          <p className="text-2xl font-black font-mono tabular-nums text-foreground">
            {telemetry?.conversionRatePct ?? 0}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Distribuição por Plataforma */}
        <section className="lg:col-span-5 rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold text-foreground">
              Plataformas dos Clientes
            </h3>
            <Badge variant="outline" className="font-mono tabular-nums">
              {totalPlatformEvents} eventos
            </Badge>
          </div>
          <div className="space-y-3">
            {platformRows.map(({ key, label, count, Icon }) => {
              const pct = totalPlatformEvents > 0 ? Math.round((count / totalPlatformEvents) * 100) : 0;
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-semibold text-foreground">
                      <Icon className="size-4 text-primary" weight="bold" />
                      <span>{label}</span>
                    </span>
                    <span className="font-mono tabular-nums font-bold text-muted-foreground">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-colors"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Timeline de Eventos Reais */}
        <section className="lg:col-span-4 rounded-2xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-extrabold text-foreground">
            Atividade Recente
          </h3>
          {Array.isArray(telemetry?.recentEvents) && telemetry.recentEvents.length > 0 ? (
            <ul className="space-y-2">
              {telemetry.recentEvents.map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 last:border-b-0 last:pb-0 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-foreground truncate">{ev.eventType}</p>
                    <p className="text-muted-foreground truncate">{ev.platform || "web"}</p>
                  </div>
                  <span className="font-mono text-muted-foreground shrink-0">
                    {formatDate(ev.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Sem eventos registrados ainda"
              description="Assim que clientes abrirem ou instalarem seu App, os eventos aparecerão aqui."
            />
          )}
        </section>

        {/* Kit de Distribuição QR Code */}
        <section className="lg:col-span-3 rounded-2xl border border-border bg-card p-5 space-y-3 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            <QrCode className="size-4 text-primary" weight="bold" />
            <span>Kit de Balcão &amp; QR</span>
          </div>
          <div className="p-3 rounded-2xl border border-border bg-background">
            <img
              src={generateQrCodeDataUri(appUrl)}
              alt={`QR Code oficial do App de ${storeName}`}
              className="size-36"
            />
          </div>
          <p className="text-xs font-mono text-muted-foreground break-all">{appUrl}</p>
          <Button
            type="button"
            variant="outline"
            onClick={handleCopyShareUrl}
            className="w-full h-11 min-h-11 rounded-xl text-xs font-bold cursor-pointer"
          >
            Copiar Link Oficial
          </Button>
        </section>
      </div>
    </div>
  );
}
