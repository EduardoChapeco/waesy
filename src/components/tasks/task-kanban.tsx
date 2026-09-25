import React from "react";
import { Plus, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { WorkspaceTask, TaskStatus } from "./task-types";
import { TaskItemCard } from "./task-item-card";
import type { KanbanStageDTO } from "@/services/kanban-config.functions";

interface TaskKanbanProps {
  tasks: WorkspaceTask[];
  stages?: KanbanStageDTO[];
  onToggleStatus: (task: WorkspaceTask) => void;
  onToggleMyDay: (task: WorkspaceTask) => void;
  onSelectTask: (task: WorkspaceTask) => void;
  onMoveTaskStatus: (task: WorkspaceTask, newStatus: TaskStatus) => void;
  onNewTaskClick: () => void;
}

const DEFAULT_COLUMNS: Array<{ id: TaskStatus; label: string; dotColor: string; color?: string }> = [
  { id: "todo", label: "A Fazer", dotColor: "bg-slate-400" },
  { id: "in_progress", label: "Em Andamento", dotColor: "bg-sky-500" },
  { id: "review", label: "Em Revisão", dotColor: "bg-amber-500" },
  { id: "done", label: "Concluído", dotColor: "bg-emerald-500" },
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
  const columns = stages && stages.length > 0
    ? stages
        .filter((s) => s.is_visible !== false)
        .map((s) => ({
          id: s.stage_key as TaskStatus,
          label: s.title,
          color: s.color,
          dotColor: "",
        }))
    : DEFAULT_COLUMNS;

  return (
    <div className="flex gap-3.5 sm:gap-4 items-stretch h-[calc(100dvh-10.5rem)] sm:h-[calc(100dvh-9.5rem)] pb-2 overflow-x-auto no-scrollbar select-none">
      {columns.map((col, colIdx) => {
        const colTasks = tasks.filter((t) => t.status === col.id);

        return (
          <div
            key={col.id}
            className="flex flex-col h-full w-[300px] sm:w-[320px] shrink-0 rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs shadow-2xs overflow-hidden"
          >
            {/* ── Header Fixo da Coluna ── */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/50 bg-muted/20 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {col.color ? (
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: col.color }}
                  />
                ) : (
                  <span className={cn("size-2 rounded-full shrink-0", col.dotColor)} />
                )}
                <h3 className="text-xs font-bold text-foreground truncate">{col.label}</h3>
                <span className="text-[10px] font-mono font-bold text-muted-foreground bg-background px-1.5 py-0.5 rounded-md border border-border/50 shrink-0">
                  {colTasks.length}
                </span>
              </div>

              {col.id === "todo" && (
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
              )}
            </div>

            {/* ── Área de Cards com Scroll Interno Independente ── */}
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-2.5 space-y-2.5">
              {colTasks.map((task) => (
                <div key={task.id} className="relative group/card">
                  <TaskItemCard
                    task={task}
                    onToggleStatus={onToggleStatus}
                    onToggleMyDay={onToggleMyDay}
                    onClick={onSelectTask}
                  />

                  {/* Ações Rápidas de Mover Coluna (Mobile & Hover) */}
                  <div className="absolute right-2 bottom-2 hidden group-hover/card:flex items-center gap-1 bg-background/95 backdrop-blur-md rounded-lg p-0.5 border border-border shadow-xs">
                    {colIdx > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const prevCol = columns[colIdx - 1];
                          if (prevCol) onMoveTaskStatus(task, prevCol.id);
                        }}
                        title="Voltar etapa"
                        className="size-6 flex items-center justify-center text-muted-foreground hover:text-foreground rounded cursor-pointer"
                      >
                        <ArrowLeft className="size-3" />
                      </button>
                    )}

                    {colIdx < columns.length - 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextCol = columns[colIdx + 1];
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
              ))}

              {colTasks.length === 0 && (
                <div className="h-full min-h-[180px] flex flex-col items-center justify-center p-4 text-center rounded-lg border border-dashed border-border/50 text-muted-foreground/60 text-xs gap-1.5">
                  <span>Sem tarefas nesta etapa</span>
                  {col.id === "todo" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onNewTaskClick}
                      className="h-7 px-2.5 rounded-lg text-[11px] font-semibold gap-1 mt-1 cursor-pointer"
                    >
                      <Plus className="size-3" />
                      <span>Criar Tarefa</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
