import React from "react";
import { Check, Clock, MessageSquare, Paperclip, MoreVertical, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface TaskCardUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
  isEditing?: boolean;
}

export interface TaskCardProps {
  id: string;
  code: string; // Ex: "TSK-104"
  title: string;
  category: string;
  priority?: "low" | "medium" | "high" | "urgent";
  status?: "todo" | "in_progress" | "review" | "done";
  assignees?: TaskCardUser[];
  activeEditor?: TaskCardUser | null; // Motor de presença em tempo real
  subtasksCount?: { completed: number; total: number };
  commentsCount?: number;
  dueDate?: string | null;
  variant?: "board" | "list" | "chat";
  onClick?: () => void;
  className?: string;
}

const PRIORITY_BADGES: Record<string, { label: string; className: string }> = {
  urgent: { label: "Urgente", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30" },
  high: { label: "Alta", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  medium: { label: "Média", className: "bg-primary/10 text-primary border-primary/20" },
  low: { label: "Baixa", className: "bg-muted text-muted-foreground border-border/60" },
};

/**
 * TaskCard — Organismo Híbrido para Kanban, Listas e Injeção no Chat (MASTER PROMPT V148)
 *
 * Características Canônicas:
 * - Bifurcação Nativa: Board (Kanban desktop), List (Mobile) e Chat (Compact Bubble)
 * - Cluster de Avatares empilhados (-space-x-2) com anel de isolamento
 * - Motor de Presença Real-Time: Exibe anel verde de foco ou badge sutil "X está editando"
 * - 100% Tokens do Design Silencioso (Apple HIG)
 */
export function TaskCard({
  id,
  code,
  title,
  category,
  priority = "medium",
  status = "todo",
  assignees = [],
  activeEditor = null,
  subtasksCount,
  commentsCount = 0,
  dueDate,
  variant = "board",
  onClick,
  className,
}: TaskCardProps) {
  const isDone = status === "done";
  const priorityInfo = PRIORITY_BADGES[priority] || PRIORITY_BADGES.medium;

  const formattedDate = React.useMemo(() => {
    if (!dueDate) return null;
    const d = new Date(dueDate);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }, [dueDate]);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "group relative flex flex-col justify-between rounded-lg border bg-card text-card-foreground select-none cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
        variant === "board" && "p-4 sm:p-4 gap-3 border-border/70 hover:border-primary/40 shadow-2xs hover:shadow-xs",
        variant === "list" && "p-4 gap-3 border-border/60 hover:bg-muted/30 min-h-14",
        variant === "chat" && "p-3 gap-2 border-border/80 bg-muted/20 hover:bg-muted/40 max-w-sm",
        activeEditor && "border-emerald-500/50 ring-1 ring-emerald-500/30",
        isDone && "opacity-60 bg-muted/10",
        className
      )}
    >
      {/* ── Top Header: Categoria, ID e Presença Real-Time ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge
            variant="outline"
            className="text-xs font-bold uppercase tracking-wider px-2 py-0 rounded-md border-border/60 bg-muted/40 text-muted-foreground truncate"
          >
            {category}
          </Badge>

          <span className="font-mono text-xs font-semibold text-muted-foreground/80 shrink-0">
            #{code}
          </span>
        </div>

        {/* Indicador de Presença em Tempo Real */}
        {activeEditor ? (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold font-mono animate-in fade-in duration-200">
            <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate max-w-24">
              {activeEditor.name.split(" ")[0]} editando
            </span>
          </div>
        ) : (
          <Badge
            variant="outline"
            className={cn("text-xs font-bold px-2 py-0 h-4 border", priorityInfo.className)}
          >
            {priorityInfo.label}
          </Badge>
        )}
      </div>

      {/* ── Título da Tarefa ── */}
      <h4
        className={cn(
          "text-xs sm:text-sm font-semibold tracking-tight text-foreground line-clamp-2 leading-snug",
          isDone && "line-through text-muted-foreground"
        )}
      >
        {title}
      </h4>

      {/* ── Footer: Metadados e Cluster de Avatares ── */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/30">
        {/* Metadados Auxiliares (Subtarefas, Vencimento, Comentários) */}
        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
          {subtasksCount && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                subtasksCount.completed === subtasksCount.total && subtasksCount.total > 0
                  ? "text-emerald-600 dark:text-emerald-400 font-bold"
                  : ""
              )}
              title="Subtarefas concluídas"
            >
              <Check className="size-3 stroke-2" />
              <span>
                {subtasksCount.completed}/{subtasksCount.total}
              </span>
            </span>
          )}

          {formattedDate && (
            <span className="inline-flex items-center gap-1" title="Data de vencimento">
              <Clock className="size-3" />
              <span>{formattedDate}</span>
            </span>
          )}

          {commentsCount > 0 && (
            <span className="inline-flex items-center gap-1" title="Comentários">
              <MessageSquare className="size-3" />
              <span>{commentsCount}</span>
            </span>
          )}
        </div>

        {/* Cluster de Avatares Empilhados (-space-x-2) */}
        {assignees.length > 0 && (
          <div className="flex items-center -space-x-2 shrink-0">
            {assignees.slice(0, 3).map((user) => {
              const isUserActive = activeEditor?.id === user.id || user.isEditing;
              const initials = user.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <div
                  key={user.id}
                  className={cn(
                    "relative size-6 sm:size-7 rounded-full ring-2 ring-card bg-muted flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105",
                    isUserActive && "ring-emerald-500"
                  )}
                  title={`${user.name}${isUserActive ? " (Ativo agora)" : ""}`}
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-foreground leading-none">
                      {initials}
                    </span>
                  )}

                  {/* Dot de presença em tempo real */}
                  {isUserActive && (
                    <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-500 ring-1 ring-card" />
                  )}
                </div>
              );
            })}

            {assignees.length > 3 && (
              <div className="size-6 sm:size-7 rounded-full ring-2 ring-card bg-muted-foreground/20 text-muted-foreground flex items-center justify-center text-xs font-bold font-mono">
                +{assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
