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

const DEFAULT_COLUMNS: Array<{ id: TaskStatus; label: string; dotColor?: string; color?: string }> = [
  { id: "todo", label: "A Fazer", color: "#94a3b8" },
  { id: "in_progress", label: "Em Andamento", color: "#0ea5e9" },
  { id: "review", label: "Em Revisão", color: "#f59e0b" },
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
        className="size-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
        title="Adicionar tarefa"
      >
        <Plus className="size-3.5" />
      </Button>
    ) : undefined,
    renderItem: (task: WorkspaceTask) => (
      <div className="relative group/card">
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
              className="size-6 flex items-center justify-center text-muted-foreground hover:text-foreground rounded cursor-pointer"
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
              className="size-6 flex items-center justify-center text-muted-foreground hover:text-foreground rounded cursor-pointer"
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
            className="h-7 px-3 rounded-lg text-[11px] font-semibold gap-1 mt-1 cursor-pointer"
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
      className="h-[calc(100dvh-10.5rem)] sm:h-[calc(100dvh-9.5rem)] pb-2"
    />
  );
}
