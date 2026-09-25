import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Plus,
  Sun,
  ListTodo,
  Kanban,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Clock,
  Flame,
  CheckCheck,
} from "lucide-react";

import { EmptyState } from "@/components/state/states";

import { getStoreSettings } from "@/services/store.functions";
import {
  listWorkspaceTasks,
  updateTaskStatus,
  toggleTaskMyDay,
  getDailyTaskDigest,
} from "@/services/tasks.functions";
import {
  listKanbanStages,
  type KanbanStageDTO,
} from "@/services/kanban-config.functions";

import type { WorkspaceTask, TaskStatus } from "@/components/tasks/task-types";
import { TaskItemCard } from "@/components/tasks/task-item-card";
import { TaskKanbanBoard } from "@/components/tasks/task-kanban";
import { NewTaskModal } from "@/components/tasks/new-task-modal";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { TaskCalendarView } from "@/components/tasks/task-calendar-view";

import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { WorkspaceDashboardSheet } from "@/components/workspace/workspace-dashboard-sheet";
import { KanbanColumnCustomizerModal } from "@/components/workspace/kanban/kanban-column-customizer-modal";

export const Route = createFileRoute("/workspace/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas | Workspace Waesy" }] }),
  loader: async () => {
    try {
    const store = await getStoreSettings().catch(() => null);
    const storeId = store?.id || "";
    const [tasks, digest, stages] = await Promise.all([
      storeId ? listWorkspaceTasks({ data: { store_id: storeId } }).catch(() => []) : [],
      storeId ? getDailyTaskDigest({ data: { store_id: storeId } }).catch(() => null) : null,
      storeId ? listKanbanStages({ data: { storeId, module: "tasks" } }).catch(() => []) : [],
    ]);
    return {
      store,
      initialTasks: (tasks || []) as WorkspaceTask[],
      initialDigest: digest,
      initialStages: (stages || []) as KanbanStageDTO[],
    };
    } catch (err) {
      console.error("[loader:workspace.tarefas] Unhandled loader error:", err);
      return { store: null, initialTasks: null, initialDigest: null, initialStages: null };
    }
  },
  component: WorkspaceTasksPage,
});

function WorkspaceTasksPage() {
  const { store, initialTasks, initialDigest, initialStages } = (Route.useLoaderData as any)();
  const router = useRouter();
  const storeId = store?.id || "";

  const [tasks, setTasks] = useState<WorkspaceTask[]>(initialTasks || []);
  const [stages, setStages] = useState<KanbanStageDTO[]>(initialStages || []);
  const [digest, setDigest] = useState(initialDigest);
  const [activeTab, setActiveTab] = useState<"my-day" | "kanban" | "list" | "calendar">("my-day");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [contextFilter, setContextFilter] = useState<string>("all");

  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<WorkspaceTask | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Recarregar dados
  const reloadTasks = async () => {
    if (!storeId) return;
    try {
      const [updatedTasks, updatedDigest] = await Promise.all([
        listWorkspaceTasks({ data: { store_id: storeId } }),
        getDailyTaskDigest({ data: { store_id: storeId } }),
      ]);
      setTasks(updatedTasks as WorkspaceTask[]);
      setDigest(updatedDigest);
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar tarefas");
    }
  };

  // Alternar status da tarefa
  const handleToggleStatus = async (task: WorkspaceTask) => {
    const nextStatus: TaskStatus = task.status === "done" ? "todo" : "done";
    try {
      await updateTaskStatus({
        data: {
          store_id: storeId,
          task_id: task.id,
          status: nextStatus,
        },
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
      );
      reloadTasks();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar status");
    }
  };

  // Alternar Meu Dia
  const handleToggleMyDay = async (task: WorkspaceTask) => {
    const nextValue = !task.is_my_day;
    try {
      await toggleTaskMyDay({
        data: {
          store_id: storeId,
          task_id: task.id,
          is_my_day: nextValue,
        },
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, is_my_day: nextValue } : t))
      );
      reloadTasks();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao alternar Meu Dia");
    }
  };

  // Mover status no Kanban
  const handleMoveTaskStatus = async (task: WorkspaceTask, newStatus: TaskStatus) => {
    try {
      await updateTaskStatus({
        data: {
          store_id: storeId,
          task_id: task.id,
          status: newStatus,
        },
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
      reloadTasks();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao mover tarefa");
    }
  };

  // Filtro de tarefas
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Filtro da aba
      if (activeTab === "my-day" && !t.is_my_day) return false;

      // Filtro de contexto / nicho
      if (contextFilter !== "all" && t.context_type !== contextFilter) return false;

      // Filtro de busca
      if (searchQuery.trim()) {
        const matchesTitle = t.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDesc = t.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCode = t.task_code?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTag = t.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        if (!matchesTitle && !matchesDesc && !matchesCode && !matchesTag) return false;
      }

      // Filtro de prioridade
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;

      return true;
    });
  }, [tasks, activeTab, contextFilter, searchQuery, priorityFilter]);

  const pendingTasks = useMemo(() => filteredTasks.filter((t) => t.status !== "done"), [filteredTasks]);
  const completedTasks = useMemo(() => filteredTasks.filter((t) => t.status === "done"), [filteredTasks]);

  // Indicadores do Dashboard Sob Demanda
  const dashboardMetrics = useMemo(() => {
    return [
      {
        id: "my-day",
        label: "Meu Dia (Foco)",
        value: digest?.myDayCount ?? tasks.filter((t) => t.is_my_day && t.status !== "done").length,
        icon: Sun,
        trend: { value: "Hoje", direction: "neutral" as const },
        description: "Tarefas selecionadas para execução prioritária hoje",
      },
      {
        id: "pending",
        label: "Pendentes",
        value: digest?.pendingCount ?? tasks.filter((t) => t.status !== "done").length,
        icon: Clock,
        trend: { value: "Abertas", direction: "neutral" as const },
        description: "Aguardando execução ou em andamento",
      },
      {
        id: "completed-today",
        label: "Concluídas Hoje",
        value: digest?.completedTodayCount ?? 0,
        icon: CheckCheck,
        trend: { value: "Finalizadas", direction: "up" as const },
        description: "Entregas finalizadas nas últimas 24 horas",
      },
      {
        id: "urgent",
        label: "Urgentes / Críticas",
        value: digest?.urgentCount ?? tasks.filter((t) => (t.priority === "urgent" || t.priority === "high") && t.status !== "done").length,
        icon: Flame,
        description: "Demandas que exigem atenção imediata",
      },
      {
        id: "overdue",
        label: "Prazos Atrasados",
        value: digest?.overdueCount ?? 0,
        icon: AlertCircle,
        trend: (digest?.overdueCount ?? 0) > 0 ? { value: "Atenção", direction: "down" as const } : undefined,
        description: "Tarefas que ultrapassaram a data limite estimada",
      },
    ];
  }, [digest, tasks]);

  return (
    <div className="flex flex-col gap-4 min-h-[calc(100dvh-8.5rem)]">
      {/* ── 1. Barra Canônica de Operação Silenciosa ── */}
      <WorkspaceCanonicalToolbar
        tabs={[
          { id: "my-day", label: "Meu Dia", icon: Sun, count: tasks.filter((t) => t.is_my_day && t.status !== "done").length },
          { id: "kanban", label: "Kanban", icon: Kanban },
          { id: "list", label: "Lista", icon: ListTodo, count: pendingTasks.length },
          { id: "calendar", label: "Calendário", icon: Calendar },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as any)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Buscar por título, código ou tag..."
        filters={[
          {
            id: "priority",
            label: "Prioridade",
            value: priorityFilter,
            options: [
              { label: "Todas Prioridades", value: "all" },
              { label: "Urgente", value: "urgent" },
              { label: "Alta", value: "high" },
              { label: "Normal", value: "medium" },
              { label: "Baixa", value: "low" },
            ],
            onChange: setPriorityFilter,
          },
          {
            id: "context",
            label: "Contexto",
            value: contextFilter,
            options: [
              { label: "Todos os Contextos", value: "all" },
              { label: "Geral", value: "general" },
              { label: "Turismo", value: "turismo" },
              { label: "Eventos", value: "eventos" },
              { label: "Delivery", value: "delivery" },
              { label: "Comercial", value: "comercial" },
            ],
            onChange: setContextFilter,
          },
        ]}
        onMetricsClick={() => setIsDashboardOpen(true)}
        metricsBadge={(digest?.overdueCount ?? 0) > 0 ? `${digest.overdueCount} atrasadas` : undefined}
        onColumnsClick={activeTab === "kanban" ? () => setIsCustomizerOpen(true) : undefined}
        primaryAction={{
          label: "Nova Tarefa",
          icon: Plus,
          onClick: () => setNewTaskOpen(true),
        }}
      />

      {/* ── 2. Área Principal de Visualização ── */}
      <div className="flex-1 min-h-0">
        {activeTab === "calendar" ? (
          <TaskCalendarView
            tasks={filteredTasks}
            onSelectTask={(task) => {
              setSelectedTask(task);
              setDetailOpen(true);
            }}
            onAddTaskOnDate={() => setNewTaskOpen(true)}
          />
        ) : activeTab === "kanban" ? (
          <TaskKanbanBoard
            tasks={filteredTasks}
            stages={stages}
            onToggleStatus={handleToggleStatus}
            onToggleMyDay={handleToggleMyDay}
            onSelectTask={(task) => {
              setSelectedTask(task);
              setDetailOpen(true);
            }}
            onMoveTaskStatus={handleMoveTaskStatus}
            onNewTaskClick={() => setNewTaskOpen(true)}
          />
        ) : (
          <div className="space-y-6">
            {/* Tarefas Pendentes */}
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <TaskItemCard
                  key={task.id}
                  task={task}
                  onToggleStatus={handleToggleStatus}
                  onToggleMyDay={handleToggleMyDay}
                  onClick={(t) => {
                    setSelectedTask(t);
                    setDetailOpen(true);
                  }}
                />
              ))}

              {pendingTasks.length === 0 && (
                <EmptyState
                  title={
                    activeTab === "my-day"
                      ? "Nenhuma tarefa focada para hoje"
                      : "Nenhuma tarefa pendente encontrada"
                  }
                  description={
                    activeTab === "my-day"
                      ? "Marque com a estrela as tarefas que deseja executar hoje ou crie uma nova."
                      : "Todas as atividades deste filtro foram concluídas ou ainda não foram criadas."
                  }
                />
              )}
            </div>

            {/* Tarefas Concluídas */}
            {completedTasks.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-border/60">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <span>Concluídas ({completedTasks.length})</span>
                </div>

                {completedTasks.map((task) => (
                  <TaskItemCard
                    key={task.id}
                    task={task}
                    onToggleStatus={handleToggleStatus}
                    onToggleMyDay={handleToggleMyDay}
                    onClick={(t) => {
                      setSelectedTask(t);
                      setDetailOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 3. Painel de Métricas / Dashboard Sob Demanda ── */}
      <WorkspaceDashboardSheet
        open={isDashboardOpen}
        onOpenChange={setIsDashboardOpen}
        title="Painel de Produtividade & Tarefas"
        description="Indicadores de foco, volume pendente, conclusões e atrasos da equipe."
        metrics={dashboardMetrics}
        breakdown={{
          title: "Distribuição por Prioridade",
          items: [
            {
              label: "Urgente",
              value: tasks.filter((t) => t.priority === "urgent" && t.status !== "done").length,
              total: Math.max(tasks.length, 1),
              color: "bg-red-500",
            },
            {
              label: "Alta",
              value: tasks.filter((t) => t.priority === "high" && t.status !== "done").length,
              total: Math.max(tasks.length, 1),
              color: "bg-amber-500",
            },
            {
              label: "Normal",
              value: tasks.filter((t) => t.priority === "medium" && t.status !== "done").length,
              total: Math.max(tasks.length, 1),
              color: "bg-sky-500",
            },
            {
              label: "Baixa",
              value: tasks.filter((t) => t.priority === "low" && t.status !== "done").length,
              total: Math.max(tasks.length, 1),
              color: "bg-slate-400",
            },
          ],
        }}
      />

      {/* ── 4. Modal de Customização de Colunas do Kanban ── */}
      {storeId && (
        <KanbanColumnCustomizerModal
          open={isCustomizerOpen}
          onOpenChange={setIsCustomizerOpen}
          storeId={storeId}
          module="tasks"
          stages={stages}
          onStagesUpdated={(updated) => setStages(updated)}
        />
      )}

      {/* ── 5. Modal de Criação de Tarefa ── */}
      <NewTaskModal
        open={newTaskOpen}
        onOpenChange={setNewTaskOpen}
        storeId={storeId}
        defaultMyDay={activeTab === "my-day"}
        onTaskCreated={reloadTasks}
      />

      {/* ── 6. Drawer Lateral de Detalhes ── */}
      <TaskDetailSheet
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        storeId={storeId}
        onTaskUpdated={reloadTasks}
      />
    </div>
  );
}
