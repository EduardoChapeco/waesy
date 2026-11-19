import * as React from "react";
import { Tag, Plus, X, Sparkles, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface AdvancedLeadTagsPickerProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export const CANONICAL_SERVICE_TAGS: Array<{ label: string; group: "profile" | "operational" | "commercial" }> = [
  // Perfil do Cliente
  { label: "VIP", group: "profile" },
  { label: "Primeira Viagem", group: "profile" },
  { label: "Fidelidade", group: "profile" },
  { label: "Família com Crianças", group: "profile" },
  { label: "Lua de Mel", group: "profile" },
  { label: "Corporativo", group: "profile" },
  { label: "Grupo de Amigos", group: "profile" },

  // Operacional & Documental
  { label: "Embarque Próximo", group: "operational" },
  { label: "Passaporte Pendente", group: "operational" },
  { label: "Aéreo Emitido", group: "operational" },
  { label: "Hotel Reservado", group: "operational" },
  { label: "Seguro Solicitado", group: "operational" },
  { label: "Visto em Andamento", group: "operational" },

  // Comercial & Funil
  { label: "Orçamento Alto", group: "commercial" },
  { label: "Fechamento Rápido", group: "commercial" },
  { label: "Negociação de Tarifa", group: "commercial" },
  { label: "Aguardando Retorno", group: "commercial" },
  { label: "Prioridade Máxima", group: "commercial" },
];

export function AdvancedLeadTagsPicker({
  tags = [],
  onChange,
  disabled = false,
  className,
}: AdvancedLeadTagsPickerProps) {
  const [newTagInput, setNewTagInput] = React.useState("");
  const [isAddingOpen, setIsAddingOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const activeTags = React.useMemo(() => {
    return Array.isArray(tags) ? tags.filter((t) => typeof t === "string" && t.trim().length > 0) : [];
  }, [tags]);

  const handleAddTag = (rawTag: string) => {
    const clean = rawTag.trim();
    if (!clean) return;
    if (activeTags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setNewTagInput("");
      return;
    }
    onChange([...activeTags, clean]);
    setNewTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(activeTags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag(newTagInput);
    } else if (e.key === "Escape") {
      setIsAddingOpen(false);
      setNewTagInput("");
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Tag className="size-3.5 text-primary shrink-0" />
          <span className="text-xs font-bold text-foreground">
            Tags & Etiquetas do Atendimento ({activeTags.length})
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => {
            setIsAddingOpen((prev) => !prev);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Plus className="size-4" />
          <span>Nova Tag</span>
        </Button>
      </div>

      {/* Tags Ativas */}
      <div className="flex flex-wrap items-center gap-2 min-h-8">
        {activeTags.length === 0 ? (
          <span className="text-2xs text-muted-foreground italic">
            Nenhuma tag atribuída a este atendimento. Selecione abaixo ou crie uma personalizada.
          </span>
        ) : (
          activeTags.map((tag) => (
            <button
              key={tag}
              type="button"
              disabled={disabled}
              onClick={() => handleRemoveTag(tag)}
              title={`Clique para remover a tag "${tag}"`}
              className="inline-flex items-center gap-2 py-1 px-3 rounded-lg border border-border/80 bg-card text-xs font-semibold text-foreground hover:border-destructive hover:text-destructive hover:bg-destructive/5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group"
            >
              <span>{tag}</span>
              {!disabled && (
                <X className="size-3 text-muted-foreground group-hover:text-destructive transition-colors shrink-0" />
              )}
            </button>
          ))
        )}
      </div>

      {/* Formulário de Criação Rápida */}
      {isAddingOpen && (
        <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite a tag e pressione Enter..."
              disabled={disabled}
              className="h-11 min-h-11 text-xs rounded-lg bg-background"
            />
            <Button
              type="button"
              disabled={disabled || !newTagInput.trim()}
              onClick={() => handleAddTag(newTagInput)}
              className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg bg-primary text-primary-foreground shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Adicionar
            </Button>
          </div>

          {/* Sugestões Rápidas de Tags */}
          <div className="space-y-2 pt-1">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Sugestões Rápidas por Nicho:
            </span>
            <div className="flex flex-wrap gap-2">
              {CANONICAL_SERVICE_TAGS.map((item) => {
                const isSelected = activeTags.some((t) => t.toLowerCase() === item.label.toLowerCase());
                return (
                  <button
                    key={item.label}
                    type="button"
                    disabled={disabled || isSelected}
                    onClick={() => handleAddTag(item.label)}
                    className={cn(
                      "h-11 min-h-11 px-3 rounded-lg border text-xs font-medium flex items-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isSelected
                        ? "border-primary/40 bg-primary/10 text-primary font-bold opacity-75"
                        : "border-border/60 bg-background text-foreground hover:border-primary hover:bg-muted/40",
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
