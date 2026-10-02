import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Calendar, CheckSquare, Trash2, Clock, Layers, CheckCircle2, AlertCircle, MoveRight, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { getEventKanbanBoard, listEventTasks, createEventTask, updateEventTask, deleteEventTask, moveEventTask } from "@/services/events.functions";
import { FullViewportKanban } from "@/components/workspace/kanban/full-viewport-kanban";

interface EventoKanbanProps {
  eventId: string;
}

export function EventoKanban({ eventId }: EventoKanbanProps) {
  const [board, setBoard] = useState<any>(null);
  const [columns, setColumns] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Modal de Nova Tarefa
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState("");
  const [taskForm, setTaskForm] = useState({
    titulo: "",
    descricao: "",
    responsavelNome: "",
    dataInicio: "",
    dataFim: "",
    prioridade: "media" as "baixa" | "media" | "alta" | "urgente",
  });

  const loadBoardData = async () => {
    try {
      setLoading(true);
      const res = await getEventKanbanBoard({ data: { eventId } });
      setBoard(res.quadro);
      setColumns(res.colunas || []);
      if (res.colunas?.length > 0 && !selectedColumn) {
        setSelectedColumn(res.colunas[0].id);
      }

      if (res.quadro?.id) {
        const tasksRes = await listEventTasks({ data: { quadroId: res.quadro.id } });
        setTasks(tasksRes || []);
      }
    } catch (err: any) {
      toast.error("Falha ao carregar quadro do evento: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      loadBoardData();
    }
  }, [eventId]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedColumn || !taskForm.titulo.trim()) {
      toast.error("Informe o título e a coluna da tarefa.");
      return;
    }

    startTransition(async () => {
      try {
        const colTasks = tasks.filter((t) => t.coluna_id === selectedColumn);
        await createEventTask({
          data: {
            colunaId: selectedColumn,
            titulo: taskForm.titulo.trim(),
            descricao: taskForm.descricao.trim() || undefined,
            responsavelNome: taskForm.responsavelNome.trim() || undefined,
            dataInicio: taskForm.dataInicio || null,
            dataFim: taskForm.dataFim || null,
            prioridade: taskForm.prioridade,
            ordem: colTasks.length,
            checklist: [],
          },
        });

        toast.success("Tarefa criada com sucesso!");
        setTaskForm({
          titulo: "",
          descricao: "",
          responsavelNome: "",
          dataInicio: "",
          dataFim: "",
          prioridade: "media",
        });
        setIsNewTaskOpen(false);
        loadBoardData();
      } catch (err: any) {
        toast.error("Erro ao salvar tarefa: " + err.message);
      }
    });
  };

  const handleMoveTask = async (taskId: string, targetColId: string) => {
    try {
      const targetColTasks = tasks.filter((t) => t.coluna_id === targetColId);
      await moveEventTask({
        data: {
          taskId,
          newColunaId: targetColId,
          newOrdem: targetColTasks.length,
        },
      });
      // Atualização otimista local
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, coluna_id: targetColId } : t))
      );
      toast.success("Tarefa movida!");
    } catch (err: any) {
      toast.error("Erro ao mover tarefa: " + err.message);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;
    try {
      await deleteEventTask({ data: { taskId } });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success("Tarefa removida.");
    } catch (err: any) {
      toast.error("Erro ao excluir: " + err.message);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "urgente":
        return <Badge variant="destructive" className="text-[10px] uppercase font-bold">Urgente</Badge>;
      case "alta":
        return <Badge className="bg-amber-500/15 text-amber-600 border border-amber-500/30 text-[10px] font-bold">Alta</Badge>;
      case "media":
        return <Badge className="bg-sky-500/15 text-sky-600 border border-sky-500/30 text-[10px] font-bold">Média</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px] font-bold">Baixa</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground text-sm gap-2">
        <Layers className="size-4 animate-spin" />
        <span>Carregando quadro de operações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Topo do Kanban com Ações Apple HIG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-card border border-border/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground">
              {board?.nome || "Quadro de Operações do Evento"}
            </h3>
            <Badge variant="outline" className="text-xs">
              {tasks.length} {tasks.length === 1 ? "tarefa" : "tarefas"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {board?.descricao || "Gestão ágil de etapas, fornecedores, montagem e prazos operacionais."}
          </p>
        </div>

        <Sheet open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
          <SheetTrigger asChild>
            <Button className="h-11 px-4 rounded-lg text-xs font-bold gap-2">
              <Plus className="size-4" />
              <span>Nova Tarefa</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-6">
            <SheetHeader>
              <SheetTitle className="text-lg font-bold">Adicionar Tarefa ao Evento</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Insira uma entrega ou responsabilidade para a equipe de produção.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleCreateTask} className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Coluna de Destino</Label>
                <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                  <SelectTrigger className="h-11 rounded-lg text-xs">
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Título da Tarefa *</Label>
                <Input
                  required
                  placeholder="Ex: Instalar gerador de backup no palco"
                  className="h-11 rounded-lg text-xs"
                  value={taskForm.titulo}
                  onChange={(e) => setTaskForm({ ...taskForm, titulo: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Descrição e Detalhes</Label>
                <Textarea
                  rows={3}
                  placeholder="Especificações técnicas, contato do fornecedor, etc."
                  className="rounded-lg text-xs"
                  value={taskForm.descricao}
                  onChange={(e) => setTaskForm({ ...taskForm, descricao: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Responsável</Label>
                  <Input
                    placeholder="Ex: Carlos Elétrica"
                    className="h-11 rounded-lg text-xs"
                    value={taskForm.responsavelNome}
                    onChange={(e) => setTaskForm({ ...taskForm, responsavelNome: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Prioridade</Label>
                  <Select
                    value={taskForm.prioridade}
                    onValueChange={(v: any) => setTaskForm({ ...taskForm, prioridade: v })}
                  >
                    <SelectTrigger className="h-11 rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa" className="text-xs">Baixa</SelectItem>
                      <SelectItem value="media" className="text-xs">Média</SelectItem>
                      <SelectItem value="alta" className="text-xs">Alta</SelectItem>
                      <SelectItem value="urgente" className="text-xs">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Início Previsto</Label>
                  <Input
                    type="date"
                    className="h-11 rounded-lg text-xs"
                    value={taskForm.dataInicio}
                    onChange={(e) => setTaskForm({ ...taskForm, dataInicio: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Prazo Final</Label>
                  <Input
                    type="date"
                    className="h-11 rounded-lg text-xs"
                    value={taskForm.dataFim}
                    onChange={(e) => setTaskForm({ ...taskForm, dataFim: e.target.value })}
                  />
                </div>
              </div>

              <Button type="submit" disabled={isPending} className="w-full h-11 rounded-lg text-xs font-bold mt-4">
                {isPending ? "Criando..." : "Salvar Tarefa"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* Quadro Kanban Canônico */}
      <FullViewportKanban
        columns={columns.map((col) => ({
          id: col.id,
          title: col.nome,
          color: col.cor_hex || "#6366f1",
          items: tasks.filter((t) => t.coluna_id === col.id),
          renderItem: (task: any) => (
            <Card
              key={task.id}
              className="rounded-lg border border-border/80 bg-card p-4 shadow-2xs hover:border-primary/40 transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getPriorityBadge(task.prioridade)}
                    {task.responsavel_nome && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <UserCheck className="size-3" />
                        {task.responsavel_nome}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-foreground leading-snug break-words">
                    {task.titulo}
                  </p>
                  {task.descricao && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {task.descricao}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                  title="Excluir tarefa"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              {/* Rodapé do Card com Ações Rápidas de Transição de Coluna */}
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  {task.data_fim ? (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="size-3" />
                      {new Date(task.data_fim).toLocaleDateString("pt-BR")}
                    </span>
                  ) : (
                    <span>Sem prazo</span>
                  )}
                </div>

                {/* Botões para avançar ou recuar de coluna */}
                <div className="flex items-center gap-1">
                  {columns
                    .filter((c) => c.id !== col.id)
                    .map((targetCol) => (
                      <button
                        key={targetCol.id}
                        type="button"
                        onClick={() => handleMoveTask(task.id, targetCol.id)}
                        className="px-2 py-1 rounded border border-border/80 text-[9px] hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                        title={`Mover para ${targetCol.nome}`}
                      >
                        <span>{targetCol.nome.substring(0, 4)}</span>
                        <MoveRight className="size-2.5" />
                      </button>
                    ))}
                </div>
              </div>
            </Card>
          ),
          emptyState: <span className="text-[11px]">Nenhuma tarefa nesta etapa</span>,
        }))}
        className="h-[calc(100dvh-13rem)] sm:h-[calc(100dvh-12rem)] pb-2"
      />
    </div>
  );
}
