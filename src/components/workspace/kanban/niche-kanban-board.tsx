/**
 * niche-kanban-board.tsx — Motor de Kanban Universal Adaptado por Nicho (P34)
 *
 * Fornece a experiência operacional de Kanban unificado para todos os nichos,
 * sincronizando colunas com o manifesto do nicho e validando transições contra
 * as máquinas de estado estritas (state-machines.ts).
 *
 * Invariantes: M01, M08, M09, M11 | Checks: C26, C38 | Prompts: P32, P34
 */

import React from "react";
import { FullViewportKanban, KanbanColumnDefinition } from "@/components/workspace/kanban/full-viewport-kanban";
import { NicheId, NicheStageConfig, getNicheManifest } from "@/lib/niches/niche-manifest";
import { doesLeadBelongToStage } from "@/lib/niches/kanban-niche-taxonomy";
import { StateMachineEntity, getAllowedTransitions, getStatusMeta } from "@/lib/state-machines";
import { cn } from "@/lib/utils";
import { ArrowRight, Clock, User, Phone, DollarSign, Bell, Share2 } from "lucide-react";

export interface NicheKanbanCardData {
  id: string;
  title: string;
  status: string;
  value?: number;
  contactName?: string;
  contactPhone?: string;
  slaDeadlineMinutes?: number;
  createdAt?: string;
  tags?: string[];
  followUpAt?: string | null;
  source?: string | null;
  custom_fields?: Record<string, any> | null;
  metadata?: Record<string, any>;
}

export interface NicheKanbanBoardProps {
  nicheId: NicheId;
  entity: StateMachineEntity;
  items: NicheKanbanCardData[];
  onTransitionStatus: (itemId: string, nextStatus: string) => Promise<void> | void;
  onCardClick?: (item: NicheKanbanCardData) => void;
  className?: string;
}

export function NicheKanbanBoard({
  nicheId,
  entity,
  items,
  onTransitionStatus,
  onCardClick,
  className,
}: NicheKanbanBoardProps) {
  const manifest = getNicheManifest(nicheId);
  const stages: NicheStageConfig[] = manifest.defaultStages.crm;
  const stageDescriptors = stages.map((s) => ({
    stage_key: s.key,
    title: s.label,
    purpose: s.purpose,
    synonyms: s.synonyms,
  }));

  // Monta as colunas a partir do manifesto do nicho com correspondência semântica e sinônimos
  const columns: KanbanColumnDefinition<NicheKanbanCardData>[] = stages.map((stage: NicheStageConfig) => {
    const stageItems = items.filter((item: NicheKanbanCardData) =>
      doesLeadBelongToStage(
        {
          status: item.status,
          custom_fields: item.custom_fields || item.metadata || null,
        },
        stage.key,
        stageDescriptors,
        nicheId,
      ),
    );

    return {
      id: stage.key,
      title: stage.label,
      color: stage.color,
      count: stageItems.length,
      items: stageItems,
      renderItem: (item: NicheKanbanCardData) => {
        const allowedTransitions = getAllowedTransitions(entity, item.status);
        const rawFollowUp = item.followUpAt || item.metadata?.follow_up_at;
        const reminderMeta = rawFollowUp
          ? (() => {
              const due = new Date(rawFollowUp);
              const now = new Date();
              const isPastDue = due < now;
              const isToday =
                due.getFullYear() === now.getFullYear() &&
                due.getMonth() === now.getMonth() &&
                due.getDate() === now.getDate();
              return {
                isOverdue: isPastDue,
                isToday,
                label: isToday
                  ? due.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                  : due.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
              };
            })()
          : null;

        const effectiveSource = item.source || item.metadata?.source || item.metadata?.channel;

        return (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/waesy-kanban-id", item.id);
              e.dataTransfer.setData("text/plain", item.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onCardClick?.(item);
              }
            }}
            onClick={() => onCardClick?.(item)}
            className={cn(
              "group relative flex flex-col gap-2 p-4 rounded-2xl bg-card transition-colors duration-150 cursor-grab active:cursor-grabbing select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              item.status === "lost" && "opacity-70"
            )}
          >
            {/* Linha Superior: Título e Tags */}
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                {item.title}
              </h4>
              {item.value !== undefined && item.value > 0 && (
                <span className="shrink-0 text-xs font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(item.value)}
                </span>
              )}
            </div>

            {/* Linha de Contato / Atributos */}
            {(item.contactName || item.contactPhone) && (
              <div className="flex items-center gap-2 text-2xs text-muted-foreground truncate">
                {item.contactName && (
                  <span className="inline-flex items-center gap-1 truncate">
                    <User className="h-3 w-3 shrink-0" />
                    {item.contactName}
                  </span>
                )}
                {item.contactPhone && (
                  <span className="inline-flex items-center gap-1 truncate font-mono">
                    <Phone className="h-3 w-3 shrink-0" />
                    {item.contactPhone}
                  </span>
                )}
              </div>
            )}

            {/* Tags do Item */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {item.tags.slice(0, 3).map((tag: string, idx: number) => (
                  <span
                    key={idx}
                    className="text-2xs font-semibold px-2 py-1 rounded-md bg-muted/60 border border-border/70 text-muted-foreground truncate max-w-28"
                  >
                    {tag}
                  </span>
                ))}
                {item.tags.length > 3 && (
                  <span className="text-2xs font-bold px-2 py-1 rounded-md bg-muted text-muted-foreground">
                    +{item.tags.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Avisos de Lembrete / Alarme de Follow-up */}
            {reminderMeta && (
              <div
                className={cn(
                  "text-3xs font-mono font-bold px-2 py-1 rounded-md inline-flex items-center gap-2",
                  reminderMeta.isOverdue
                    ? "bg-rose-500/10 text-rose-600 border border-rose-500/30"
                    : reminderMeta.isToday
                      ? "bg-warning/10 text-warning border border-warning/30"
                      : "bg-muted text-muted-foreground border border-border/60",
                )}
              >
                <Bell className="size-3 shrink-0" />
                <span className="truncate">
                  {reminderMeta.isOverdue ? "Atrasado: " : reminderMeta.isToday ? "Hoje: " : "Alarme: "}
                  {reminderMeta.label}
                </span>
              </div>
            )}

            {/* Canal de Origem */}
            {effectiveSource && (
              <div className="pt-1">
                <span className="text-3xs font-mono font-semibold px-2 py-1 rounded-md bg-muted/50 border border-border/60 text-muted-foreground inline-flex items-center gap-1">
                  <Share2 className="size-3 shrink-0 text-primary" />
                  <span className="capitalize">{effectiveSource}</span>
                </span>
              </div>
            )}

            {/* Linha de Ações de Transição Rápida */}
            {allowedTransitions.length > 0 && (
              <div /* design-lint-ignore DL-15 reason:"Conteiner nao interativo; onClick apenas isola propagacao de evento" expiry:"2027-12-31" */
                className="flex items-center gap-1 pt-1 border-t border-border/40 mt-1"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-2xs text-muted-foreground mr-1">Mover:</span>
                <div className="flex flex-wrap gap-1">
                  {allowedTransitions.slice(0, 2).map((nextStatus) => {
                    const meta = getStatusMeta(entity, nextStatus);
                    return (
                      <button
                        key={nextStatus}
                        type="button"
                        onClick={() => onTransitionStatus(item.id, nextStatus)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-2xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
                      >
                        <span>{meta.label}</span>
                        <ArrowRight className="h-2.5 w-2.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      },
      emptyState: (
        <span className="text-muted-foreground/60 text-xs">
          Nenhum item em {stage.label}
        </span>
      ),
    };
  });

  return (
    <FullViewportKanban
      columns={columns}
      className={className}
      columnWidthClass="w-72 sm:w-80"
      onDropItem={(itemId, targetColumnId) => onTransitionStatus(itemId, targetColumnId)}
    />
  );
}
