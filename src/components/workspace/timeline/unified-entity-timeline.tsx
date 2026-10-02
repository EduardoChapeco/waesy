/**
 * unified-entity-timeline.tsx — Componente Nativo de Linha do Tempo Unificada (Waesy)
 *
 * Apresenta eventos cronológicos consolidados de CRM, Cotações, Propostas,
 * Reservas, Embarques, Contratos e Atendimento em um fluxo visual contínuo e silencioso.
 *
 * Leis de Design: L01 (Superfície única), L04 (Elevação zero), L05 (Tabular-nums), L17 (Estados)
 */

import React from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Calendar,
  FileText,
  Send,
  User,
  AlertCircle,
  FileCheck,
  Plane,
  Receipt,
  Ticket,
  Clock,
} from "lucide-react";
import type { UnifiedTimelineEntry, DomainEventName } from "@/services/domain-events.functions";

interface UnifiedEntityTimelineProps {
  entries: UnifiedTimelineEntry[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

function getEventIcon(eventName: DomainEventName) {
  if (eventName.startsWith("lead")) return <User className="size-3.5 text-sky-500" />;
  if (eventName.startsWith("quote") || eventName.startsWith("proposal")) return <FileText className="size-3.5 text-amber-500" />;
  if (eventName.startsWith("reservation")) return <Calendar className="size-3.5 text-emerald-500" />;
  if (eventName.startsWith("contract")) return <FileCheck className="size-3.5 text-indigo-500" />;
  if (eventName.startsWith("boarding") || eventName.startsWith("flight")) return <Plane className="size-3.5 text-purple-500" />;
  if (eventName.startsWith("financial")) return <Receipt className="size-3.5 text-emerald-500" />;
  if (eventName.startsWith("ticket")) return <Ticket className="size-3.5 text-blue-500" />;
  return <Clock className="size-3.5 text-muted-foreground" />;
}

export function UnifiedEntityTimeline({
  entries,
  isLoading,
  emptyMessage = "Nenhuma atividade registrada até o momento.",
  className,
}: UnifiedEntityTimelineProps) {
  if (isLoading) {
    return (
      <div className={cn("space-y-3 p-4", className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="size-7 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 w-1/3 bg-muted rounded" />
              <div className="h-2.5 w-2/3 bg-muted/60 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className={cn("p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2", className)}>
        <Clock className="size-5 text-muted-foreground/40" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("relative pl-6 space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-border/60", className)}>
      {entries.map((entry) => {
        const dateObj = new Date(entry.timestamp);
        const formattedDate = dateObj.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
        });
        const formattedTime = dateObj.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div key={entry.id} className="relative group">
            {/* Ícone Indicador com Halo Canônico */}
            <div className="absolute -left-6 top-0.5 size-6 rounded-full bg-background border border-border flex items-center justify-center shrink-0 shadow-2xs group-hover:border-foreground/30 transition-colors">
              {getEventIcon(entry.eventName)}
            </div>

            {/* Conteúdo do Evento */}
            <div className="min-w-0 flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground truncate">
                  {entry.title}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground shrink-0 tabular-nums">
                  {formattedDate} às {formattedTime}
                </span>
              </div>

              {entry.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {entry.description}
                </p>
              )}

              <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80 pt-1">
                <span>Por {entry.actorName}</span>
                {entry.entityType && (
                  <>
                    <span>•</span>
                    <span className="uppercase tracking-wider font-mono text-[9px]">
                      {entry.entityType}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
