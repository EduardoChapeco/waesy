import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Clock,
  User,
  Users,
  Calendar,
  Tag,
  ShieldCheck,
  Check,
  Circle,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskCardProps, TaskCardUser } from "./TaskCard";

export interface SubtaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface ApprovalEvent {
  id: string;
  authorName: string;
  action: "approved" | "rejected" | "requested_changes" | "submitted";
  notes?: string;
  timestamp: string;
}

export interface TaskDetailData extends TaskCardProps {
  description?: string;
  subtasks?: SubtaskItem[];
  approvals?: ApprovalEvent[];
}

export interface TaskDetailSheetProps {
  task: TaskDetailData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onStatusChange?: (taskId: string, newStatus: TaskCardProps["status"]) => void;
  forceSide?: "bottom" | "right";
}

/**
 * TaskDetailSheet — Bifurcação Nativa para Detalhes de Tarefa (MASTER PROMPT V148)
 *
 * Desktop: Painel lateral slide-over (side="right", sm:max-w-xl).
 * Mobile / Chat: Bottom Sheet nativo fluido (side="bottom", rounded-t-3xl).
 *
 * Apresenta:
 * - Metadados de prioridade, categoria e código
 * - Presença em tempo real ("João está editando...")
 * - Checklist nativo de subtarefas
 * - Linha do tempo de aprovações
 * - Gestão de status e encerramento
 */
export function TaskDetailSheet({
  task,
  open,
  onOpenChange,
  onToggleSubtask,
  onStatusChange,
  forceSide,
}: TaskDetailSheetProps) {
  // Detecção de viewport para bifurcação nativa automática
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 768px)");
    setIsMobile(mql.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  if (!task) return null;

  const side = forceSide ?? (isMobile ? "bottom" : "right");

  const defaultSubtasks: SubtaskItem[] = task.subtasks ?? [
    { id: "st-1", title: "Validar contratos e regras de compliance", completed: true },
    { id: "st-2", title: "Auditar tokens e contraste WCAG 2.2 AA", completed: false },
    { id: "st-3", title: "Homologar fluxo nos dois shells nativos", completed: false },
  ];

  const defaultApprovals: ApprovalEvent[] = task.approvals ?? [
    {
      id: "ap-1",
      authorName: "Arquiteto de IA",
      action: "submitted",
      notes: "Submetido para homologação de layout e tokens.",
      timestamp: "Há 2 horas",
    },
    {
      id: "ap-2",
      authorName: "Auditor Visual",
      action: "approved",
      notes: "Contraste e alvos de toque em conformidade total.",
      timestamp: "Há 45 minutos",
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          "overflow-y-auto bg-card text-card-foreground border-border/70 p-6 flex flex-col gap-6",
          side === "bottom"
            ? "max-h-dvh sm:max-h-4/5 rounded-t-3xl border-t shadow-2xl"
            : "sm:max-w-xl border-l"
        )}
      >
        {/* ── Header: Identificação, Tags e Presença ── */}
        <SheetHeader className="space-y-3 text-left">
          <div className="flex items-center justify-between gap-2 pr-6">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border-border/60 bg-muted/50 text-muted-foreground"
              >
                {task.category}
              </Badge>
              <span className="font-mono text-xs font-semibold text-muted-foreground">
                #{task.code}
              </span>
            </div>

            {/* Presença em Tempo Real */}
            {task.activeEditor && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold font-mono animate-in fade-in duration-200">
                <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                <span>{task.activeEditor.name} editando</span>
              </div>
            )}
          </div>

          <SheetTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-snug">
            {task.title}
          </SheetTitle>

          {task.description && (
            <SheetDescription className="text-sm text-muted-foreground leading-relaxed">
              {task.description}
            </SheetDescription>
          )}
        </SheetHeader>

        <Separator />

        {/* ── Seção: Metadados Operacionais ── */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1">
            <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
              <Tag className="size-3.5" />
              Prioridade
            </span>
            <span className="font-semibold text-foreground capitalize">
              {task.priority || "Média"}
            </span>
          </div>

          <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1">
            <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
              <Calendar className="size-3.5" />
              Prazo
            </span>
            <span className="font-semibold font-mono text-foreground">
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString("pt-BR") : "Sem prazo"}
            </span>
          </div>
        </div>

        {/* ── Seção: Responsáveis (Cluster) ── */}
        {task.assignees && task.assignees.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="size-3.5" />
              Responsáveis
            </h5>
            <div className="flex flex-wrap gap-2">
              {task.assignees.map((user) => {
                const isActive = task.activeEditor?.id === user.id || user.isEditing;
                return (
                  <div
                    key={user.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium",
                      isActive
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-border/60 bg-card text-foreground"
                    )}
                  >
                    <div className="relative size-5 rounded-full bg-muted flex items-center justify-center font-bold text-xs overflow-hidden">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="size-full object-cover" />
                      ) : (
                        user.name.slice(0, 2).toUpperCase()
                      )}
                      {isActive && (
                        <span className="absolute bottom-0 right-0 size-1.5 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <span>{user.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Separator />

        {/* ── Seção: Checklist de Subtarefas ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" />
              Subtarefas ({defaultSubtasks.filter((s) => s.completed).length}/{defaultSubtasks.length})
            </h5>
          </div>

          <div className="space-y-2">
            {defaultSubtasks.map((subtask) => (
              <button
                key={subtask.id}
                type="button"
                onClick={() => onToggleSubtask?.(task.id, subtask.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/30 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 min-h-11"
              >
                {subtask.completed ? (
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="size-4 text-muted-foreground shrink-0" />
                )}
                <span
                  className={cn(
                    "text-xs sm:text-sm font-medium leading-tight",
                    subtask.completed ? "line-through text-muted-foreground" : "text-foreground"
                  )}
                >
                  {subtask.title}
                </span>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* ── Seção: Histórico de Aprovações e Governança ── */}
        <div className="space-y-3">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" />
            Histórico de Aprovações
          </h5>

          <div className="space-y-3">
            {defaultApprovals.map((approval) => (
              <div
                key={approval.id}
                className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <FileCheck className="size-3.5 text-primary" />
                    {approval.authorName}
                  </span>
                  <span className="font-mono text-muted-foreground text-xs">
                    {approval.timestamp}
                  </span>
                </div>
                {approval.notes && (
                  <p className="text-muted-foreground leading-relaxed">{approval.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer: Ações de Status com Alvo de Toque Mínimo 44px ── */}
        <div className="mt-auto pt-4 border-t border-border/40 flex flex-col sm:flex-row items-stretch gap-2.5">
          <Button
            variant="outline"
            onClick={() => onStatusChange?.(task.id, task.status === "done" ? "todo" : "done")}
            className="flex-1 h-11 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            {task.status === "done" ? "Reabrir Tarefa" : "Marcar como Concluída"}
          </Button>

          <Button
            variant="default"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-11 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            Fechar Painel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
