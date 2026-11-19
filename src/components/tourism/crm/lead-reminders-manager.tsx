import * as React from "react";
import { Bell, Clock, Plus, CheckCircle2, Circle, Trash2, Calendar, Phone, MessageSquare, FileText, DollarSign, ShieldAlert, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ReminderType = "call" | "whatsapp" | "proposal" | "payment" | "docs" | "custom";

export interface LeadReminderItem {
  id: string;
  title: string;
  due_at: string;
  type: ReminderType;
  completed: boolean;
  created_at: string;
  notes?: string;
}

export interface LeadRemindersManagerProps {
  reminders: LeadReminderItem[];
  onChange: (reminders: LeadReminderItem[], nextFollowUpAt?: string | null) => void;
  disabled?: boolean;
  className?: string;
}

export const REMINDER_TYPE_META: Record<ReminderType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  call: { label: "Ligação Telefônica", icon: Phone },
  whatsapp: { label: "Mensagem WhatsApp", icon: MessageSquare },
  proposal: { label: "Cobrar Retorno de Proposta", icon: FileText },
  payment: { label: "Vencimento de Pagamento", icon: DollarSign },
  docs: { label: "Checagem de Documentos", icon: ShieldAlert },
  custom: { label: "Lembrete Livre", icon: Bell },
};

export function LeadRemindersManager({
  reminders = [],
  onChange,
  disabled = false,
  className,
}: LeadRemindersManagerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<ReminderType>("whatsapp");
  const [dueDate, setDueDate] = React.useState("");

  const activeReminders = React.useMemo(() => {
    return Array.isArray(reminders) ? reminders : [];
  }, [reminders]);

  const pendingReminders = React.useMemo(() => {
    return activeReminders.filter((r) => !r.completed);
  }, [activeReminders]);

  const nearestPendingDue = React.useMemo(() => {
    if (pendingReminders.length === 0) return null;
    const sorted = [...pendingReminders].sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
    return sorted[0].due_at;
  }, [pendingReminders]);

  const applyPreset = (hoursOffset: number) => {
    const target = new Date(Date.now() + hoursOffset * 60 * 60 * 1000);
    // Format to YYYY-MM-DDTHH:mm for datetime-local input
    const pad = (n: number) => String(n).padStart(2, "0");
    const formatted = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`;
    setDueDate(formatted);
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim() || REMINDER_TYPE_META[type].label;
    if (!dueDate) return;

    const newReminder: LeadReminderItem = {
      id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: cleanTitle,
      due_at: new Date(dueDate).toISOString(),
      type,
      completed: false,
      created_at: new Date().toISOString(),
    };

    const nextList = [...activeReminders, newReminder];
    // Calculate nearest pending due date
    const pending = nextList.filter((r) => !r.completed);
    const sorted = pending.sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
    const nextFollowUp = sorted.length > 0 ? sorted[0].due_at : null;

    onChange(nextList, nextFollowUp);
    setTitle("");
    setDueDate("");
    setIsOpen(false);
  };

  const handleToggleComplete = (id: string) => {
    const nextList = activeReminders.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r));
    const pending = nextList.filter((r) => !r.completed);
    const sorted = pending.sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
    const nextFollowUp = sorted.length > 0 ? sorted[0].due_at : null;
    onChange(nextList, nextFollowUp);
  };

  const handleDeleteReminder = (id: string) => {
    const nextList = activeReminders.filter((r) => r.id !== id);
    const pending = nextList.filter((r) => !r.completed);
    const sorted = pending.sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
    const nextFollowUp = sorted.length > 0 ? sorted[0].due_at : null;
    onChange(nextList, nextFollowUp);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bell className="size-3.5 text-primary shrink-0" />
          <span className="text-xs font-bold text-foreground">
            Lembretes & Alarmes de Follow-up ({pendingReminders.length} pendentes)
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Plus className="size-4" />
          <span>Novo Alarme</span>
        </Button>
      </div>

      {/* Formulário de Novo Lembrete */}
      {isOpen && (
        <form onSubmit={handleAddReminder} className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-foreground">Agendar Contato / Lembrete</span>
            <p className="text-2xs text-muted-foreground">
              Configure data, horário e tipo de contato para alertar o consultor no funil de atendimento.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-2xs font-semibold text-muted-foreground">Tipo de Alarme</span>
              <Select value={type} onValueChange={(val) => setType(val as ReminderType)}>
                <SelectTrigger className="h-11 min-h-11 text-xs rounded-lg bg-background">
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REMINDER_TYPE_META).map(([key, meta]) => {
                    const Icon = meta.icon;
                    return (
                      <SelectItem key={key} value={key} className="text-xs">
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 text-primary shrink-0" />
                          <span>{meta.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <span className="text-2xs font-semibold text-muted-foreground">Título / Objetivo</span>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Ligar sobre cotação de voo..."
                className="h-11 min-h-11 text-xs rounded-lg bg-background"
              />
            </div>
          </div>

          {/* Presets Rápidos de Tempo */}
          <div className="space-y-1">
            <span className="text-2xs font-semibold text-muted-foreground">Atalhos de Vencimento:</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset(2)}
                className="h-11 min-h-11 px-3 rounded-lg border border-border/80 bg-background text-xs font-semibold hover:bg-muted/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center"
              >
                Hoje +2h
              </button>
              <button
                type="button"
                onClick={() => applyPreset(24)}
                className="h-11 min-h-11 px-3 rounded-lg border border-border/80 bg-background text-xs font-semibold hover:bg-muted/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center"
              >
                Amanhã
              </button>
              <button
                type="button"
                onClick={() => applyPreset(72)}
                className="h-11 min-h-11 px-3 rounded-lg border border-border/80 bg-background text-xs font-semibold hover:bg-muted/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center"
              >
                Em 3 dias
              </button>
              <button
                type="button"
                onClick={() => applyPreset(168)}
                className="h-11 min-h-11 px-3 rounded-lg border border-border/80 bg-background text-xs font-semibold hover:bg-muted/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center"
              >
                Em 1 semana
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-2xs font-semibold text-muted-foreground">Data e Horário Exato</span>
            <Input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="h-11 min-h-11 text-xs rounded-lg bg-background"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-11 min-h-11 px-4 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!dueDate}
              className="h-11 min-h-11 px-5 text-xs font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              Salvar Alarme
            </Button>
          </div>
        </form>
      )}

      {/* Lista de Lembretes */}
      <div className="space-y-2">
        {activeReminders.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-border/80 bg-card text-center space-y-1">
            <p className="text-xs font-medium text-foreground">Nenhum lembrete agendado</p>
            <p className="text-2xs text-muted-foreground">
              Adicione lembretes para evitar perder o momento ideal de contato com o cliente.
            </p>
          </div>
        ) : (
          activeReminders.map((r) => {
            const meta = REMINDER_TYPE_META[r.type] || REMINDER_TYPE_META.custom;
            const Icon = meta.icon;
            const dueDateObj = new Date(r.due_at);
            const isOverdue = !r.completed && dueDateObj.getTime() < Date.now();
            const isToday =
              !r.completed &&
              dueDateObj.toDateString() === new Date().toDateString() &&
              !isOverdue;

            return (
              <div
                key={r.id}
                className={cn(
                  "p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors",
                  r.completed
                    ? "border-border/40 bg-muted/20 opacity-60"
                    : isOverdue
                      ? "border-rose-500/40 bg-rose-500/5"
                      : isToday
                        ? "border-warning/40 bg-warning/5"
                        : "border-border/80 bg-card",
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleToggleComplete(r.id)}
                    className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
                    title={r.completed ? "Marcar como pendente" : "Marcar como concluído"}
                  >
                    {r.completed ? (
                      <CheckCircle2 className="size-5 text-emerald-600" />
                    ) : (
                      <Circle className="size-5 text-muted-foreground" />
                    )}
                  </button>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-xs font-bold truncate", r.completed && "line-through text-muted-foreground")}>
                        {r.title}
                      </span>
                      {isOverdue && (
                        <Badge variant="destructive" className="text-3xs font-mono font-bold uppercase py-0 h-4">
                          Atrasado
                        </Badge>
                      )}
                      {isToday && (
                        <Badge variant="outline" className="text-3xs font-mono font-bold uppercase py-0 h-4 border-warning/50 text-warning">
                          Vence Hoje
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-2xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Icon className="size-3 text-primary shrink-0" />
                        <span>{meta.label}</span>
                      </span>
                      <span>·</span>
                      <span className="font-mono">
                        {dueDateObj.toLocaleDateString("pt-BR")} às{" "}
                        {dueDateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>

                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteReminder(r.id)}
                    className="size-11 min-h-11 min-w-11 sm:size-8 sm:min-h-8 sm:min-w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer rounded-lg shrink-0"
                    title="Excluir lembrete"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
