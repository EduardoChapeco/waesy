import * as React from "react";
import { useState } from "react";
import { Tag, Plus, X, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateThreadTags } from "@/services/chat.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface ThreadTagsPickerProps {
  threadId: string;
  tags: string[];
  onTagsChange?: (newTags: string[]) => void;
  className?: string;
  compact?: boolean;
}

export const CANONICAL_TAGS = [
  { id: "vip", label: "VIP", color: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30" },
  { id: "lead_quente", label: "Lead Quente", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  { id: "aguardando_pix", label: "Aguardando PIX", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  { id: "reclamacao", label: "Reclamação", color: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30" },
  { id: "pos_venda", label: "Pós-Venda", color: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30" },
  { id: "suporte", label: "Suporte Técnico", color: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" },
];

export function ThreadTagsPicker({
  threadId,
  tags = [],
  onTagsChange,
  className,
  compact = false,
}: ThreadTagsPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTags, setCurrentTags] = useState<string[]>(tags);
  const [isUpdating, setIsUpdating] = useState(false);

  React.useEffect(() => {
    setCurrentTags(tags);
  }, [tags]);

  const handleToggleTag = async (tagLabel: string) => {
    const isPresent = currentTags.includes(tagLabel);
    const updated = isPresent
      ? currentTags.filter((t) => t !== tagLabel)
      : [...currentTags, tagLabel];

    setCurrentTags(updated);
    if (onTagsChange) onTagsChange(updated);

    try {
      setIsUpdating(true);
      await updateThreadTags({
        data: {
          threadId,
          tags: updated,
        },
      });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar tags.");
      // Rollback
      setCurrentTags(currentTags);
      if (onTagsChange) onTagsChange(currentTags);
    } finally {
      setIsUpdating(false);
    }
  };

  const getTagColor = (label: string) => {
    const found = CANONICAL_TAGS.find((c) => c.label.toLowerCase() === label.toLowerCase());
    return found ? found.color : "bg-muted text-muted-foreground border-border/60";
  };

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {currentTags.map((tag) => (
        compact ? (
          <span
            key={tag}
            className={cn(
              "inline-flex items-center gap-2 px-3 h-11 min-h-11 rounded-lg border text-xs font-semibold shrink-0 select-none",
              getTagColor(tag)
            )}
          >
            <span>{tag}</span>
          </span>
        ) : (
          <button
            key={tag}
            type="button"
            className={cn(
              "inline-flex items-center gap-2 px-3 h-11 min-h-11 rounded-lg border text-xs font-semibold shrink-0 select-none cursor-pointer hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              getTagColor(tag)
            )}
            onClick={() => handleToggleTag(tag)}
            title={`Clique para remover a tag ${tag}`}
          >
            <span>{tag}</span>
            <X className="size-3.5 opacity-70" />
          </button>
        )
      ))}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="h-11 min-h-11 px-3 rounded-lg border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Gerenciar tags"
          >
            <Tag className="size-4" />
            <span>Tag</span>
            <Plus className="size-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2 rounded-lg bg-card border border-border/80 shadow-md" align="start">
          <div className="space-y-2">
            <p className="text-2xs font-bold text-muted-foreground px-2 py-1 uppercase tracking-wider">
              Tags de CRM / Atendimento
            </p>
            {CANONICAL_TAGS.map((tag) => {
              const isSelected = currentTags.includes(tag.label);
              return (
                <button
                  key={tag.id}
                  type="button"
                  className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between text-xs hover:bg-muted/60 transition-colors text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => handleToggleTag(tag.label)}
                  disabled={isUpdating}
                >
                  <span className={cn("px-2 py-1 rounded-md border text-2xs font-semibold", tag.color)}>
                    {tag.label}
                  </span>
                  {isSelected && <Check className="size-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
