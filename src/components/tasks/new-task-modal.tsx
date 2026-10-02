import React, { useState } from "react";
import { Plus, X, Calendar, Star, AlertCircle, CheckSquare, Trash2, Tag, Repeat, Clock, Link as LinkIcon, Briefcase } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { TaskPriority, TaskContextType } from "./task-types";
import { CONTEXT_TYPE_LABELS, PRIORITY_LABELS } from "./task-types";
import { createWorkspaceTask } from "@/services/tasks.functions";

interface NewTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  onTaskCreated: () => void;
  defaultMyDay?: boolean;
}

const COMMON_TAGS = [
  "Compras", "Fornecedor", "Operação", "Financeiro",
  "Cliente", "Pós-Venda", "Urgente", "Reunião",
];

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; ring: string; dot: string }> = {
  urgent: { label: "Urgente", ring: "ring-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-400", dot: "bg-rose-500" },
  high:   { label: "Alta",    ring: "ring-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
  medium: { label: "Normal",  ring: "ring-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-400", dot: "bg-sky-500" },
  low:    { label: "Baixa",   ring: "ring-slate-400 bg-muted text-muted-foreground", dot: "bg-slate-400" },
};

export function NewTaskModal({
  open,
  onOpenChange,
  storeId,
  onTaskCreated,
  defaultMyDay = false,
}: NewTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [contextType, setContextType] = useState<TaskContextType>("general");
  const [contextLabel, setContextLabel] = useState("");
  const [recurrence, setRecurrence] = useState<"none" | "daily" | "weekly" | "monthly" | "weekdays">("none");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(0);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isMyDay, setIsMyDay] = useState(defaultMyDay);
  const [checklists, setChecklists] = useState<string[]>([]);
  const [newChecklistInput, setNewChecklistInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate("");
    setContextType("general");
    setContextLabel("");
    setRecurrence("none");
    setEstimatedMinutes(0);
    setTags([]);
    setChecklists([]);
    setTagInput("");
    setNewChecklistInput("");
    setIsMyDay(defaultMyDay);
  };

  const handleAddChecklist = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newChecklistInput.trim()) return;
    setChecklists((prev) => [...prev, newChecklistInput.trim()]);
    setNewChecklistInput("");
  };

  const handleRemoveChecklist = (index: number) => {
    setChecklists((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    setTags((prev) => [...prev, trimmed]);
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Informe o título da tarefa");
      return;
    }

    try {
      setSubmitting(true);
      await createWorkspaceTask({
        data: {
          store_id: storeId,
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          status: "todo",
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          context_type: contextType,
          context_label: contextLabel.trim() || undefined,
          tags,
          is_my_day: isMyDay,
          recurrence,
          estimated_minutes: estimatedMinutes,
          checklists: checklists.length > 0 ? checklists : undefined,
        },
      });

      toast.success("Tarefa criada com sucesso!");
      reset();
      onOpenChange(false);
      onTaskCreated();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar tarefa");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <SheetContent
        side="right"
        size="wide"
        className="sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] w-full max-sm:!h-[100dvh] max-sm:!inset-0 max-sm:!rounded-none border-l p-0 flex flex-col bg-card"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-base font-bold text-foreground">
                Nova Tarefa
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Organize com tags, checklists, prazo e recorrência
              </p>
            </div>
            {/* Meu Dia Toggle — silencioso no header */}
            <button
              type="button"
              onClick={() => setIsMyDay((v) => !v)}
              title={isMyDay ? "Remover de Meu Dia" : "Adicionar ao Meu Dia"}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                isMyDay
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400"
                  : "bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted"
              )}
            >
              <Star className={cn("size-3.5", isMyDay && "fill-amber-500 text-amber-500")} />
              Meu Dia
            </button>
          </div>
        </SheetHeader>

        {/* Form com Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto no-scrollbar px-6 py-5 space-y-5">

          {/* Título */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Título *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Confirmar passagens para excursão de outubro..."
              className="h-11 rounded-lg text-sm font-medium"
              autoFocus
            />
          </div>

          {/* Prioridade — botões visuais */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Prioridade</label>
            <div className="grid grid-cols-4 gap-2">
              {(["urgent", "high", "medium", "low"] as TaskPriority[]).map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      "h-9 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2",
                      priority === p
                        ? `ring-1 ${cfg.ring}`
                        : "border-border/60 bg-background text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", priority === p ? cfg.dot : "bg-current opacity-40")} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vencimento + Estimativa */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-2">
                <Calendar className="size-3.5 text-muted-foreground" /> Vencimento
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-10 rounded-lg text-xs font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-2">
                <Clock className="size-3.5 text-muted-foreground" /> Estimativa (min)
              </label>
              <Input
                type="number"
                min="0"
                step="5"
                value={estimatedMinutes || ""}
                onChange={(e) => setEstimatedMinutes(parseInt(e.target.value, 10) || 0)}
                placeholder="Ex: 30"
                className="h-10 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          {/* Recorrência */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Repeat className="size-3.5 text-muted-foreground" /> Recorrência
            </label>
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as any)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="none">Sem recorrência (Tarefa única)</option>
              <option value="daily">Diária — Todos os dias</option>
              <option value="weekdays">Dias úteis — Segunda a Sexta</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
            </select>
          </div>

          {/* Vínculo de Negócio */}
          <div className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-3">
            <div className="flex items-center gap-2">
              <Briefcase className="size-4 text-primary" />
              <span className="text-xs font-bold text-foreground">Vínculo Comercial</span>
              <span className="text-[10px] text-muted-foreground ml-auto">Opcional</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Tipo</label>
                <select
                  value={contextType}
                  onChange={(e) => setContextType(e.target.value as TaskContextType)}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:outline-none"
                >
                  {(Object.entries(CONTEXT_TYPE_LABELS) as [TaskContextType, string][]).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Referência</label>
                <Input
                  value={contextLabel}
                  onChange={(e) => setContextLabel(e.target.value)}
                  placeholder={
                    contextType === "group_tour" ? "Ex: Gramado Outubro" :
                    contextType === "order" ? "Ex: Pedido #1234" :
                    contextType === "lead" ? "Ex: João Silva" :
                    "Identificador opcional..."
                  }
                  className="h-9 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Detalhes e Instruções</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Observações, links de referência, procedimentos padrão..."
              className="min-h-20 rounded-lg text-xs resize-none"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Tag className="size-3.5 text-muted-foreground" /> Etiquetas
            </label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  }
                }}
                placeholder="Digite e pressione Enter..."
                className="h-9 rounded-lg text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddTag(tagInput)}
                className="h-9 px-3 rounded-lg text-xs shrink-0 cursor-pointer"
              >
                +Tag
              </Button>
            </div>

            {/* Sugestões rápidas */}
            <div className="flex flex-wrap gap-2">
              {COMMON_TAGS.map((ct) => (
                <button
                  key={ct}
                  type="button"
                  onClick={() => handleAddTag(ct)}
                  className={cn(
                    "text-[11px] px-3 py-1 rounded-full border transition-colors cursor-pointer",
                    tags.includes(ct)
                      ? "bg-primary text-primary-foreground border-primary font-medium"
                      : "bg-muted/30 text-muted-foreground border-border/60 hover:bg-muted"
                  )}
                >
                  {ct}
                </button>
              ))}
            </div>

            {/* Tags selecionadas */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs py-1 pl-3 pr-2 flex items-center gap-1 rounded-md"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="size-3.5 flex items-center justify-center hover:text-destructive cursor-pointer"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Etapas / Checklist */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-semibold text-foreground flex items-center gap-2">
              <CheckSquare className="size-3.5 text-muted-foreground" /> Etapas do Processo
            </label>

            <div className="flex gap-2">
              <Input
                value={newChecklistInput}
                onChange={(e) => setNewChecklistInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddChecklist();
                  }
                }}
                placeholder="Ex: Verificar disponibilidade de vagas..."
                className="h-9 rounded-lg text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddChecklist()}
                className="h-9 px-3 rounded-lg text-xs cursor-pointer shrink-0"
              >
                +Etapa
              </Button>
            </div>

            {checklists.length > 0 && (
              <div className="space-y-2">
                {checklists.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/60 text-xs text-foreground"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="size-5 rounded bg-muted flex items-center justify-center font-mono text-[10px] text-muted-foreground shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate">{item}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklist(idx)}
                      className="size-6 flex items-center justify-center text-muted-foreground hover:text-rose-600 rounded cursor-pointer shrink-0"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Footer de Ações */}
        <SheetFooter className="px-6 py-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-muted-foreground">
            {checklists.length > 0 && (
              <span>{checklists.length} etapa{checklists.length !== 1 ? "s" : ""} • </span>
            )}
            {tags.length > 0 && (
              <span>{tags.length} tag{tags.length !== 1 ? "s" : ""}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => { reset(); onOpenChange(false); }}
              disabled={submitting}
              className="h-10 px-4 rounded-lg text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !title.trim()}
              className="h-10 px-6 rounded-lg text-sm font-semibold cursor-pointer shadow-sm"
            >
              {submitting ? "Criando..." : "Criar Tarefa"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
