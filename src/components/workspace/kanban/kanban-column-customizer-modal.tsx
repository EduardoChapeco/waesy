import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUp, ArrowDown, Eye, EyeOff, RotateCcw, Check } from "lucide-react";
import {
  type KanbanStageDTO,
  type KanbanPurpose,
  saveKanbanStages,
  resetKanbanStages,
} from "@/services/kanban-config.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface KanbanColumnCustomizerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  module: string;
  currentStages?: any[];
  stages?: any[];
  onStagesUpdated: (newStages: any[]) => void;
}

const PURPOSE_OPTIONS: Array<{ value: KanbanPurpose; label: string }> = [
  { value: "inbox", label: "Entrada / Novo" },
  { value: "in_progress", label: "Em Andamento" },
  { value: "review", label: "Revisão / Espera" },
  { value: "won", label: "Concluído / Ganho" },
  { value: "lost", label: "Perdido / Cancelado" },
  { value: "archived", label: "Arquivado" },
];

const COLOR_PRESETS = [
  "#64748b", // slate
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#a855f7", // purple
  "#ec4899", // pink
  "#f97316", // orange
  "#eab308", // amber
  "#10b981", // emerald
  "#14b8a6", // teal
  "#ef4444", // red
];

export function KanbanColumnCustomizerModal({
  open,
  onOpenChange,
  storeId,
  module,
  currentStages,
  stages: propStages,
  onStagesUpdated,
}: KanbanColumnCustomizerModalProps) {
  const initialStages = currentStages || propStages || [];
  const [stages, setStages] = useState<KanbanStageDTO[]>(initialStages);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStages(currentStages || propStages || []);
    }
  }, [open, currentStages, propStages]);

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const copy = [...stages];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);

    // Reordenar sort_order
    const reordered = copy.map((s, idx) => ({ ...s, sort_order: idx }));
    setStages(reordered);
  };

  const handleTitleChange = (index: number, newTitle: string) => {
    const copy = [...stages];
    copy[index].title = newTitle;
    setStages(copy);
  };

  const handlePurposeChange = (index: number, newPurpose: KanbanPurpose) => {
    const copy = [...stages];
    copy[index].purpose = newPurpose;
    setStages(copy);
  };

  const handleColorChange = (index: number, newColor: string) => {
    const copy = [...stages];
    copy[index].color = newColor;
    setStages(copy);
  };

  const handleToggleVisible = (index: number) => {
    const copy = [...stages];
    copy[index].is_visible = !copy[index].is_visible;
    setStages(copy);
  };

  const handleSave = async () => {
    if (!storeId) {
      toast.error("Loja não selecionada");
      return;
    }

    setIsSaving(true);
    try {
      await saveKanbanStages({
        data: {
          storeId,
          module,
          stages,
        },
      });

      onStagesUpdated(stages);
      onOpenChange(false);
      toast.success("Colunas do Kanban atualizadas com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar colunas");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!storeId) return;
    setIsSaving(true);
    try {
      const res = await resetKanbanStages({
        data: {
          storeId,
          module,
        },
      });
      setStages(res.defaults);
      onStagesUpdated(res.defaults);
      toast.success("Colunas restauradas para o padrão!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao restaurar colunas");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 rounded-2xl border border-border/80 bg-background overflow-hidden select-none">
        <DialogHeader className="p-5 pb-3 border-b border-border/60 bg-muted/20">
          <DialogTitle className="text-sm font-bold text-foreground">
            Personalizar Colunas do Kanban
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Altere nomes, ordem, cores e propósitos semânticos de cada etapa do seu fluxo de trabalho.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 max-h-[60vh] overflow-y-auto no-scrollbar space-y-3">
          {stages.map((stage, idx) => (
            <div
              key={stage.stage_key}
              className={cn(
                "p-3 rounded-xl border border-border/70 bg-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-all",
                !stage.is_visible && "opacity-50 bg-muted/40"
              )}
            >
              {/* Lado Esquerdo: Indicador de Cor & Título */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                {/* Seletor Rápido de Cor */}
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className="size-3.5 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <select
                    value={stage.color}
                    onChange={(e) => handleColorChange(idx, e.target.value)}
                    className="opacity-0 absolute size-4 cursor-pointer"
                    title="Mudar cor do indicador"
                  >
                    {COLOR_PRESETS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Input de Nome da Coluna */}
                <Input
                  value={stage.title}
                  onChange={(e) => handleTitleChange(idx, e.target.value)}
                  className="h-8 text-xs font-semibold rounded-lg bg-background border-border/60 flex-1 min-w-[120px]"
                  placeholder="Nome da coluna"
                />
              </div>

              {/* Lado Direito: Propósito Semântico & Ações de Reordenação */}
              <div className="flex items-center gap-2 shrink-0 justify-between sm:justify-end">
                {/* Propósito */}
                <select
                  value={stage.purpose}
                  onChange={(e) => handlePurposeChange(idx, e.target.value as KanbanPurpose)}
                  className="h-8 px-2 rounded-lg text-[11px] font-semibold bg-muted/50 border border-border/60 text-foreground focus:outline-none cursor-pointer"
                  title="Propósito da etapa no fluxo de negócio"
                >
                  {PURPOSE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* Botões de Mover Ordem */}
                <div className="flex items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, "up")}
                    className="size-7 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Mover para a esquerda"
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={idx === stages.length - 1}
                    onClick={() => handleMove(idx, "down")}
                    className="size-7 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Mover para a direita"
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                </div>

                {/* Alternar Visibilidade */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleVisible(idx)}
                  className={cn(
                    "size-7 rounded-md cursor-pointer",
                    stage.is_visible
                      ? "text-muted-foreground hover:text-foreground"
                      : "text-rose-500 hover:text-rose-600"
                  )}
                  title={stage.is_visible ? "Ocultar coluna" : "Mostrar coluna"}
                >
                  {stage.is_visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isSaving}
            className="h-9 px-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer shadow-none"
          >
            <RotateCcw className="size-3" />
            <span>Restaurar Padrão</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-9 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground gap-1.5 cursor-pointer shadow-xs"
            >
              <Check className="size-3.5" />
              <span>{isSaving ? "Salvando..." : "Salvar Alterações"}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
