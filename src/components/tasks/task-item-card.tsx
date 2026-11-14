import React from "react";
import { Check, Star, Calendar, CheckSquare, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  CustomerIdentityTagPill,
  buildEntityTraceHash,
  SAC_FUNCTION_ROLES,
} from "@/lib/entity-trace-hash";
import type { WorkspaceTask, TaskPriority } from "./task-types";

interface TaskItemCardProps {
  task: WorkspaceTask;
  onToggleStatus: (task: WorkspaceTask) => void;
  onToggleMyDay: (task: WorkspaceTask) => void;
  onClick: (task: WorkspaceTask) => void;
  className?: string;
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; className: string }> = {
  urgent: { label: "Urgente", className: "bg-destructive/15 text-destructive" },
  high: { label: "Alta", className: "bg-warning/15 text-warning-strong" },
  medium: { label: "Média", className: "bg-info/15 text-info" },
  low: { label: "Baixa", className: "bg-muted text-muted-foreground" },
};

export function TaskItemCard({
  task,
  onToggleStatus,
  onToggleMyDay,
  onClick,
  className,
}: TaskItemCardProps) {
  const isDone = task.status === "done";
  const priorityInfo = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  const checklists = task.workspace_task_checklists || [];
  const completedChecklists = checklists.filter((c) => c.is_completed).length;

  const commentsCount = task.workspace_task_comments?.length || 0;

  const formattedDueDate = React.useMemo(() => {
    if (!task.due_date) return null;
    const date = new Date(task.due_date);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }, [task.due_date]);

  const isOverdue = React.useMemo(() => {
    if (!task.due_date || isDone) return false;
    return new Date(task.due_date) < new Date();
  }, [task.due_date, isDone]);

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(task);
        }
      }}
      onClick={() => onClick(task)}
      className={cn(
        "group relative flex items-center justify-between gap-3 p-4 rounded-2xl bg-card transition-colors motion-reduce:transition-none cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isDone && "opacity-60",
        className
      )}
    >
      {/* Lado Esquerdo: Checkbox Tátil & Conteúdo */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Botão de Conclusão com Touch Target 44px */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleStatus(task);
          }}
          title={isDone ? "Marcar como pendente" : "Marcar como concluída"}
          className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            className={cn(
              "size-6 rounded-md border flex items-center justify-center transition-colors motion-reduce:transition-none",
              isDone
                ? "bg-primary border-primary text-primary-foreground"
                : "border-border/80 bg-background hover:border-foreground text-transparent hover:text-muted-foreground"
            )}
          >
            <Check className="size-4 stroke-2" />
          </span>
        </button>

        {/* Título e Metadados */}
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-1 flex-wrap">
            {task.task_code && (
              <span className="px-2 py-1 rounded bg-muted text-muted-foreground font-mono text-xs font-semibold shrink-0">
                #{task.task_code}
              </span>
            )}
            <p
              className={cn(
                "text-xs sm:text-sm font-semibold text-foreground tracking-tight line-clamp-2 text-anti-truncate",
                isDone && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </p>
          </div>

          {/* Vínculo Visual de Cliente / Viagem / Pedido com Foto/Inicial e Hash */}
          {(() => {
            const cf = (task.custom_fields || {}) as Record<string, any>;
            const custName = cf.customer_name || (task.context_label ? String(task.context_label).split("·")[0]?.trim() : null);
            const traceHash =
              cf.trace_hash ||
              cf.customer_trace_hash ||
              (task.context_id ? buildEntityTraceHash(task.context_type as any, task.context_id) : null);
            const sectorRole = SAC_FUNCTION_ROLES.find((r) => r.key === cf.assigned_sector);

            if (!custName && !traceHash && (!task.tags || task.tags.length === 0)) return null;

            return (
              <div className="flex flex-wrap items-center gap-1 pt-1">
                {(custName || traceHash) && (
                  <CustomerIdentityTagPill
                    name={custName || "Vínculo Operacional"}
                    avatarUrl={cf.customer_avatar_url || null}
                    traceHash={traceHash}
                    subtitle={cf.entity_code || (cf.pnr_locator ? `PNR ${cf.pnr_locator}` : null)}
                    roleLabel={sectorRole?.shortLabel || null}
                  />
                )}
                {task.assigned_to_name && (
                  <CustomerIdentityTagPill
                    name={task.assigned_to_name}
                    avatarUrl={cf.assigned_to_avatar_url || null}
                    roleLabel="Responsável"
                  />
                )}
                {Array.isArray(task.tags) &&
                  task.tags
                    .filter((tg) => !traceHash || !traceHash.includes(tg))
                    .slice(0, 3)
                    .map((tg) => (
                      <span
                        key={tg}
                        className="px-2 py-1 rounded-md border border-border/60 bg-muted/40 text-muted-foreground font-mono text-xs"
                      >
                        {tg}
                      </span>
                    ))}
              </div>
            );
          })()}

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-mono">
            {/* Prioridade */}
            <Badge
              variant="secondary"
              className={cn("text-xs px-2 py-1 rounded-md", priorityInfo.className)}
            >
              {priorityInfo.label}
            </Badge>

            {/* Vencimento */}
            {formattedDueDate && (
              <span
                className={cn(
                  "flex items-center gap-1",
                  isOverdue ? "text-rose-600 font-semibold" : "text-muted-foreground"
                )}
              >
                <Calendar className="size-3" />
                {formattedDueDate}
              </span>
            )}

            {/* Progresso de Checklists */}
            {checklists.length > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <CheckSquare className="size-3" />
                {completedChecklists}/{checklists.length}
              </span>
            )}

            {/* Comentários */}
            {commentsCount > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <MessageSquare className="size-3" />
                {commentsCount}
              </span>
            )}

            {/* Contexto se não for geral */}
            {task.context_type !== "general" && (
              <span className="px-2 py-1 rounded-md bg-muted/60 text-xs text-foreground/80">
                {task.context_type === "order" && `Pedido #${task.context_id?.slice(0, 6) || "PED"}`}
                {task.context_type === "group_tour" && `Viagem #${task.context_id?.slice(0, 6) || "TRP"}`}
                {task.context_type === "lead" && `Oportunidade #${task.context_id?.slice(0, 6) || "OPR"}`}
                {task.context_type === "customer" && `Cliente #${task.context_id?.slice(0, 6) || "CLI"}`}
                {task.context_type === "contract" && `Contrato #${task.context_id?.slice(0, 6) || "CTR"}`}
                {task.context_type === "service" && `Agendamento #${task.context_id?.slice(0, 6) || "AGD"}`}
                {task.context_type === "table" && `Mesa ${task.context_id}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Lado Direito: Estrela de "Meu Dia" */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleMyDay(task);
        }}
        title={task.is_my_day ? "Remover de Meu Dia" : "Adicionar a Meu Dia"}
        className="size-11 min-h-11 min-w-11 flex items-center justify-center rounded-lg transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Star className={cn("size-4", task.is_my_day && "fill-warning text-warning-strong")} />
      </button>
    </div>
  );
}
