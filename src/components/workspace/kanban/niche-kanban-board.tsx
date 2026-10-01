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
import { NicheId, NicheStageConfig, getNicheManifest } from "@/lib/niche-manifest";
import { StateMachineEntity, getAllowedTransitions, getStatusMeta } from "@/lib/state-machines";
import { cn } from "@/lib/utils";
import { ArrowRight, Clock, User, Phone, DollarSign } from "lucide-react";

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

  // Monta as colunas a partir do manifesto do nicho
  const columns: KanbanColumnDefinition<NicheKanbanCardData>[] = stages.map((stage: NicheStageConfig) => {
    const stageItems = items.filter((item: NicheKanbanCardData) => item.status === stage.key);

    return {
      id: stage.key,
      title: stage.label,
      color: stage.color,
      count: stageItems.length,
      items: stageItems,
      renderItem: (item: NicheKanbanCardData) => {
        const allowedTransitions = getAllowedTransitions(entity, item.status);

        return (
          <div
            key={item.id}
            onClick={() => onCardClick?.(item)}
            className={cn(
              "group relative flex flex-col gap-2 p-3 rounded-xl border border-border/70 bg-card hover:border-primary/40 hover:shadow-xs transition-all duration-150 cursor-pointer select-none",
              item.status === "won" && "border-success/30 bg-success/5",
              item.status === "lost" && "opacity-70 border-destructive/20 bg-destructive/5"
            )}
          >
            {/* Linha Superior: Título e Tags */}
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                {item.title}
              </h4>
              {item.value !== undefined && item.value > 0 && (
                <span className="shrink-0 text-xs font-mono font-bold text-primary">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(item.value)}
                </span>
              )}
            </div>

            {/* Linha de Contato / Atributos */}
            {(item.contactName || item.contactPhone) && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate">
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
              <div className="flex flex-wrap gap-1 pt-0.5">
                {item.tags.slice(0, 3).map((tag: string, idx: number) => (
                  <span
                    key={idx}
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Linha de Ações de Transição Rápida */}
            {allowedTransitions.length > 0 && (
              <div
                className="flex items-center gap-1 pt-1 border-t border-border/40 mt-1"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[10px] text-muted-foreground mr-1">Mover:</span>
                <div className="flex flex-wrap gap-1">
                  {allowedTransitions.slice(0, 2).map((nextStatus) => {
                    const meta = getStatusMeta(entity, nextStatus);
                    return (
                      <button
                        key={nextStatus}
                        type="button"
                        onClick={() => onTransitionStatus(item.id, nextStatus)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
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
      columnWidthClass="w-[280px] sm:w-[310px]"
    />
  );
}
