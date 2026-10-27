import React from "react";
import { Plus, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkspaceTask, TaskStatus } from "./task-types";
import { TaskItemCard } from "./task-item-card";
import type { KanbanStageDTO } from "@/services/kanban-config.functions";
import {
  FullViewportKanban,
  type KanbanColumnDefinition,
} from "@/components/workspace/kanban/full-viewport-kanban";

interface TaskKanbanProps {
  tasks: WorkspaceTask[];
  stages?: KanbanStageDTO[];
  onToggleStatus: (task: WorkspaceTask) => void;
  onToggleMyDay: (task: WorkspaceTask) => void;
  onSelectTask: (task: WorkspaceTask) => void;
  onMoveTaskStatus: (task: WorkspaceTask, newStatus: TaskStatus) => void;
  onNewTaskClick: () => void;
}

/* design-lint-ignore DL-01 reason:"Cores canônicas de identificação visual de status de coluna Kanban" expiry:"2027-12-31" */
const DEFAULT_COLUMNS: Array<{ id: TaskStatus; label: string; dotColor?: string; color?: string }> = [
  /* design-lint-ignore DL-01 reason:"Cor canônica slate para coluna A Fazer" expiry:"2027-12-31" */
  { id: "todo", label: "A Fazer", color: "#94a3b8" },
  /* design-lint-ignore DL-01 reason:"Cor canônica sky para coluna Em Andamento" expiry:"2027-12-31" */
  { id: "in_progress", label: "Em Andamento", color: "#0ea5e9" },
  /* design-lint-ignore DL-01 reason:"Cor canônica amber para coluna Em Revisão" expiry:"2027-12-31" */
  { id: "review", label: "Em Revisão", color: "#f59e0b" },
  /* design-lint-ignore DL-01 reason:"Cor canônica emerald para coluna Concluído" expiry:"2027-12-31" */
  { id: "done", label: "Concluído", color: "#10b981" },
];

export function TaskKanbanBoard({
  tasks,
  stages,
  onToggleStatus,
  onToggleMyDay,
  onSelectTask,
  onMoveTaskStatus,
  onNewTaskClick,
}: TaskKanbanProps) {
  // Normalizar colunas a partir de estágios configuráveis ou defaults
  const normalizedStages = stages && stages.length > 0
    ? stages
        .filter((s) => s.is_visible !== false)
        .map((s) => ({
          id: s.stage_key as TaskStatus,
          label: s.title,
          color: s.color,
        }))
    : DEFAULT_COLUMNS;

  const kanbanColumns: KanbanColumnDefinition<WorkspaceTask>[] = normalizedStages.map((col, colIdx) => ({
    id: col.id,
    title: col.label,
    color: col.color,
    items: tasks.filter((t) => t.status === col.id),
    headerAction: col.id === "todo" ? (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onNewTaskClick}
        className="size-11 min-h-11 min-w-11 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
        title="Adicionar tarefa"
      >
        <Plus className="size-3.5" />
      </Button>
    ) : undefined,
    renderItem: (task: WorkspaceTask) => (
      <div className="relative group/card">
        {/* design-lint-ignore DL-15 reason:"Componente de card que encapsula anel de foco interno" expiry:"2027-12-31" */}
        <TaskItemCard
          task={task}
          onToggleStatus={onToggleStatus}
          onToggleMyDay={onToggleMyDay}
          onClick={onSelectTask}
        />

        {/* Ações Rápidas de Mover Coluna (Mobile & Hover) */}
        <div className="absolute right-2 bottom-2 hidden group-hover/card:flex items-center gap-1 bg-background/95 backdrop-blur-md rounded-lg p-1 border border-border shadow-xs">
          {colIdx > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const prevCol = normalizedStages[colIdx - 1];
                if (prevCol) onMoveTaskStatus(task, prevCol.id);
              }}
              title="Voltar etapa"
              className="size-11 min-h-11 min-w-11 flex items-center justify-center text-muted-foreground hover:text-foreground rounded cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ArrowLeft className="size-3" />
            </button>
          )}

          {colIdx < normalizedStages.length - 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const nextCol = normalizedStages[colIdx + 1];
                if (nextCol) onMoveTaskStatus(task, nextCol.id);
              }}
              title="Avançar etapa"
              className="size-11 min-h-11 min-w-11 flex items-center justify-center text-muted-foreground hover:text-foreground rounded cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ArrowRight className="size-3" />
            </button>
          )}
        </div>
      </div>
    ),
    emptyState: (
      <div className="flex flex-col items-center justify-center text-center text-muted-foreground/60 text-xs gap-2">
        <span>Sem tarefas nesta etapa</span>
        {col.id === "todo" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNewTaskClick}
            className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 mt-1 cursor-pointer"
          >
            <Plus className="size-3" />
            <span>Criar Tarefa</span>
          </Button>
        )}
      </div>
    ),
  }));

  return (
    <FullViewportKanban
      columns={kanbanColumns}
      /* design-lint-ignore DL-02 reason:"Cálculo de viewport dinâmico para preencher altura exata do Kanban" expiry:"2027-12-31" */
      className="h-[calc(100dvh-10.5rem)] sm:h-[calc(100dvh-9.5rem)] pb-2"
    />
  );
}
