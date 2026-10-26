/**
 * hotel-deadlines-sentinel-card.tsx — Card de Radar de Prazos de Hospedagem e Deadlines de Cancelamento
 * NORMAS: AGENTS.md (B.1 a B.41), Apple HIG, WCAG 2.2 AA
 */

import { useState, useMemo } from "react";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Hotel,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import {
  auditHotelCancellationDeadlines,
  type HotelReservationDeadlineInput,
  type HotelDeadlineAlert,
} from "@/lib/travel/hotel-deadline-sentinel";

interface HotelDeadlinesSentinelCardProps {
  reservations: HotelReservationDeadlineInput[];
  onActionClick?: (reservationId: string) => void;
}

export function HotelDeadlinesSentinelCard({
  reservations,
  onActionClick,
}: HotelDeadlinesSentinelCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const auditSummary = useMemo(
    () => auditHotelCancellationDeadlines(reservations),
    [reservations]
  );

  const hasUrgent = auditSummary.criticalCount > 0 || auditSummary.warningCount > 0;

  return (
    <div className="p-5 rounded-lg border border-border bg-card space-y-4 shadow-sm">
      {/* Header do Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-3">
          <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
            auditSummary.criticalCount > 0
              ? "bg-destructive/10 text-destructive"
              : auditSummary.warningCount > 0
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : "bg-emerald-500/10 text-emerald-600"
          }`}>
            <Clock className="size-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Radar de Deadlines de Hospedagem
            </h2>
            <p className="text-xs text-muted-foreground">
              Monitoramento ativo de prazos de cancelamento gratuito e valor em risco
            </p>
          </div>
        </div>

        {/* Badges de Resumo */}
        <div className="flex flex-wrap items-center gap-2">
          {auditSummary.criticalCount > 0 && (
            <Badge variant="destructive" className="text-xs font-semibold px-3 py-1 flex items-center gap-2">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span>{auditSummary.criticalCount} Crítico (&lt;48h)</span>
            </Badge>
          )}

          {auditSummary.warningCount > 0 && (
            <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-xs font-semibold px-3 py-1 flex items-center gap-2">
              <span>{auditSummary.warningCount} Atenção (&lt;5 dias)</span>
            </Badge>
          )}

          {!hasUrgent && (
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-xs font-semibold px-3 py-1 flex items-center gap-2">
              <CheckCircle2 className="size-3.5 shrink-0" />
              <span>Prazos Seguros</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Métricas do Radar */}
      <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-lg bg-muted/40 border border-border/60 space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Reservas em Monitoramento</span>
          <p className="text-lg font-bold text-foreground">{auditSummary.totalReservationsAudited}</p>
        </div>

        <div className="p-4 rounded-lg bg-muted/40 border border-border/60 space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Alertas de Criticidade</span>
          <p className="text-lg font-bold text-destructive">
            {auditSummary.criticalCount + auditSummary.warningCount}
          </p>
        </div>

        <div className="p-4 rounded-lg bg-muted/40 border border-border/60 space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Total em Risco de Multa</span>
          <p className="text-lg font-bold text-foreground">
            {formatMoney(auditSummary.totalAmountAtRiskCents)}
          </p>
        </div>
      </div>

      {/* Lista de Alertas */}
      {auditSummary.alerts.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              Detalhamento de Reservas e Prazos Limites
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-11 min-h-11 px-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <span>{isExpanded ? "Ocultar Detalhes" : "Ver Detalhes"}</span>
              {isExpanded ? (
                <ChevronUp className="size-4 ml-2" />
              ) : (
                <ChevronDown className="size-4 ml-2" />
              )}
            </Button>
          </div>

          {(isExpanded ? auditSummary.alerts : auditSummary.alerts.slice(0, 2)).map(
            (alert: HotelDeadlineAlert) => (
              <div
                key={alert.reservationId}
                className={`p-4 rounded-lg border space-y-2 text-xs transition-colors ${
                  alert.status === "critical"
                    ? "bg-destructive/5 border-destructive/30"
                    : alert.status === "warning"
                    ? "bg-amber-500/5 border-amber-500/30"
                    : "bg-muted/30 border-border/60"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Hotel className="size-4 text-muted-foreground shrink-0" />
                    <span className="font-bold text-foreground break-words">{alert.hotelName}</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {alert.locatorOrBookingRef}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">Hóspede: {alert.guestName}</span>
                    <span className="font-bold text-foreground">
                      {formatMoney(alert.amountAtRiskCents)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
                  <p className="text-muted-foreground break-words leading-relaxed">
                    {alert.recommendation}
                  </p>
                  {onActionClick && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onActionClick(alert.reservationId)}
                      className="h-11 min-h-11 px-3 text-xs font-semibold focus-visible:ring-2 cursor-pointer shrink-0"
                    >
                      <span>Gerenciar Reserva</span>
                      <ExternalLink className="size-3.5 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
