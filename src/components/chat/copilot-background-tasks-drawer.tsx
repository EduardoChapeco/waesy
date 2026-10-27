import React, { useState } from "react";
import {
  Clock,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Pause,
  Play,
  X,
  ChevronRight,
  ExternalLink,
  Laptop,
  Terminal,
  Layers,
  RotateCw,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface BackgroundTaskItem {
  id: string;
  task_type: string;
  title: string;
  status: "queued" | "planning" | "running" | "waiting_user" | "validating" | "completed" | "failed" | "cancelled";
  progress_percent: number;
  current_step?: string;
  cost_wz?: number;
  created_at: string;
  completed_at?: string;
  heartbeat_at?: string;
}

export interface CopilotBackgroundTasksDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks?: BackgroundTaskItem[];
  onCancelTask?: (taskId: string) => void;
  onRefresh?: () => void;
  className?: string;
}

const DEFAULT_MOCK_TASKS: BackgroundTaskItem[] = [
  {
    id: "task-01",
    task_type: "lead_mining",
    title: "Mineração de 50 Comércios Locais em São Miguel do Oeste",
    status: "running",
    progress_percent: 68,
    current_step: "Varrendo CNPJs e coordenadas no mapa local...",
    cost_wz: 28,
    created_at: new Date(Date.now() - 180000).toISOString(),
    heartbeat_at: new Date().toISOString(),
  },
  {
    id: "task-02",
    task_type: "spreadsheet_generator",
    title: "Consolidação de DRE e Projeção Financeira Q3",
    status: "completed",
    progress_percent: 100,
    current_step: "Planilha compilada e validada com sucesso.",
    cost_wz: 14,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    completed_at: new Date(Date.now() - 3540000).toISOString(),
  },
  {
    id: "task-03",
    task_type: "market_radar",
    title: "Monitoramento de Concorrência e Preços de Cardápios",
    status: "completed",
    progress_percent: 100,
    current_step: "Relatório comparativo gerado.",
    cost_wz: 19,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    completed_at: new Date(Date.now() - 7120000).toISOString(),
  },
];

export function CopilotBackgroundTasksDrawer({
  open,
  onOpenChange,
  tasks = DEFAULT_MOCK_TASKS,
  onCancelTask,
  onRefresh,
  className,
}: CopilotBackgroundTasksDrawerProps) {
  const [activeTab, setActiveTab] = useState<"running" | "completed">("running");
  const [selectedTask, setSelectedTask] = useState<BackgroundTaskItem | null>(null);
  const [liveSandboxOpen, setLiveSandboxOpen] = useState(false);

  const runningTasks = tasks.filter((t) =>
    ["queued", "planning", "running", "waiting_user", "validating"].includes(t.status)
  );
  const completedTasks = tasks.filter((t) =>
    ["completed", "failed", "cancelled"].includes(t.status)
  );

  const displayedTasks = activeTab === "running" ? runningTasks : completedTasks;

  const handleCancel = (taskId: string) => {
    if (onCancelTask) {
      onCancelTask(taskId);
    } else {
      toast.success("Solicitação de cancelamento enviada ao worker.");
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className={cn(
            "w-full sm:max-w-md p-0 flex flex-col bg-card border-border/60",
            className
          )}
        >
          {/* ── Topo da Gaveta ── */}
          <SheetHeader className="p-5 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Clock className="size-5" />
                </div>
                <div>
                  <SheetTitle className="text-base font-bold text-foreground">
                    Tarefas em Segundo Plano
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground">
                    Execuções duráveis persistidas no ecossistema
                  </SheetDescription>
                </div>
              </div>

              {onRefresh && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onRefresh}
                  className="size-11 min-h-11 min-w-11 rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label="Atualizar tarefas"
                >
                  <RotateCw className="size-4" />
                </Button>
              )}
            </div>

            {/* Abas de Filtro: Em execução vs Concluídas */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab("running")}
                className={cn(
                  "h-11 min-h-11 rounded-xl text-xs font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  activeTab === "running"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <span>Em Execução</span>
                <span className="ml-2 px-2 py-0.2 rounded-full bg-background/20 text-2xs font-mono">
                  {runningTasks.length}
                </span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab("completed")}
                className={cn(
                  "h-11 min-h-11 rounded-xl text-xs font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  activeTab === "completed"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <span>Concluídas</span>
                <span className="ml-2 px-2 py-0.2 rounded-full bg-background/20 text-2xs font-mono">
                  {completedTasks.length}
                </span>
              </Button>
            </div>
          </SheetHeader>

          {/* ── Lista de Tarefas (Squircles Simples sem Cards Gigantes) ── */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            {displayedTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center space-y-2 bg-muted/10 my-6">
                <Clock className="size-8 mx-auto text-muted-foreground/40" />
                <h4 className="text-xs font-semibold text-foreground">
                  Nenhuma tarefa nesta visualização
                </h4>
                <p className="text-2xs text-muted-foreground max-w-xs mx-auto">
                  Tarefas iniciadas continuam sendo executadas em segundo plano mesmo após fechar o navegador.
                </p>
              </div>
            ) : (
              displayedTasks.map((task) => {
                const isRunning = ["queued", "planning", "running", "validating"].includes(task.status);

                return (
                  <div
                    key={task.id}
                    className="group rounded-2xl border border-border/40 bg-card p-4 space-y-3 transition-colors duration-200 hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "size-2 rounded-full shrink-0",
                              isRunning
                                ? "bg-primary animate-pulse motion-reduce:animate-none"
                                : task.status === "completed"
                                ? "bg-emerald-500"
                                : "bg-rose-500"
                            )}
                          />
                          <h4 className="text-xs font-bold text-foreground leading-snug line-clamp-2">
                            {task.title}
                          </h4>
                        </div>
                        <p className="text-2xs text-muted-foreground font-mono pl-4">
                          {task.task_type}
                        </p>
                      </div>

                      {task.cost_wz !== undefined && task.cost_wz > 0 && (
                        <div className="flex items-center gap-1 text-2xs font-semibold text-muted-foreground shrink-0 bg-muted/40 px-2 py-1 rounded-md">
                          <Coins className="size-3 text-amber-500" />
                          <span>{task.cost_wz} $WZ</span>
                        </div>
                      )}
                    </div>

                    {/* Barra de Progresso Fina */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-2xs text-muted-foreground">
                        <span className="truncate max-w-[240px]">
                          {task.current_step || "Executando etapas..."}
                        </span>
                        <span className="font-mono font-semibold">{task.progress_percent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-colors duration-200 duration-300 rounded-full"
                          style={{ width: `${task.progress_percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Ações da Tarefa */}
                    <div className="pt-2 border-t border-border/20 flex items-center justify-between text-xs">
                      {isRunning ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTask(task);
                            setLiveSandboxOpen(true);
                          }}
                          className="h-11 min-h-11 px-3 text-xs font-semibold text-primary hover:bg-primary/5 rounded-xl gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
                        >
                          <Laptop className="size-4" />
                          <span>Ver Execução</span>
                        </Button>
                      ) : (
                        <span className="text-2xs text-muted-foreground">
                          Concluído com sucesso
                        </span>
                      )}

                      {isRunning && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(task.id)}
                          className="h-11 min-h-11 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 cursor-pointer"
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Modal de Visualização ao Vivo do Computador do Agente (Live Sandbox) ── */}
      <Sheet open={liveSandboxOpen} onOpenChange={setLiveSandboxOpen}>
        <SheetContent
          side="bottom"
          className="h-5/6 p-0 bg-background border-border/60 rounded-t-2xl flex flex-col"
        >
          <div className="p-4 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Laptop className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">
                    Computador do Agente
                  </h3>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-2xs gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
                    <span>Ao Vivo</span>
                  </Badge>
                </div>
                <p className="text-2xs text-muted-foreground">
                  {selectedTask?.title || "Tarefa ativa"}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLiveSandboxOpen(false)}
              className="h-11 min-h-11 px-4 text-xs font-semibold rounded-xl"
            >
              Fechar Visualização
            </Button>
          </div>

          {/* Área Central: Terminal e Visualizador de Ações */}
          <div className="flex-1 p-4 bg-muted/20 overflow-y-auto font-mono text-xs space-y-3">
            <div className="rounded-xl bg-card border border-border/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-2xs text-muted-foreground border-b border-border/20 pb-2">
                <span>Ambiente: Sandbox Isolado Waesy</span>
                <span>Worker: Node 20 / headless</span>
              </div>
              <div className="space-y-2 text-xs text-foreground">
                <p className="text-muted-foreground">&gt; [00:01] Inicializando plano de execução MECE...</p>
                <p className="text-muted-foreground">&gt; [00:02] Conectando ao catalogador de dados públicos...</p>
                <p className="text-primary font-semibold">
                  &gt; [00:03] {selectedTask?.current_step || "Executando instruções..."}
                </p>
                <p className="text-emerald-600 dark:text-emerald-400">
                  &gt; [00:04] Progresso registrado: {selectedTask?.progress_percent || 0}%
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-border/60 p-6 text-center space-y-2 bg-card">
              <Terminal className="size-8 mx-auto text-muted-foreground/40" />
              <h4 className="text-xs font-bold text-foreground">
                Navegador e Ações Automatizadas
              </h4>
              <p className="text-2xs text-muted-foreground max-w-md mx-auto">
                O agente está operando em sandbox restrito sem acesso a credenciais locais do seu dispositivo.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
