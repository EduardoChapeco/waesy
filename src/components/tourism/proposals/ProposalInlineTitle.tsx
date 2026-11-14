import React, { useEffect, useRef, useState } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ProposalInlineTitleProps {
  proposalId: string;
  initialTitle: string;
  onSaveTitle: (proposalId: string, nextTitle: string) => Promise<void> | void;
  className?: string;
}

/**
 * Editable proposal title cell supporting double-click inline editing and keyboard edit button.
 * Confirms via Enter or onBlur when modified; cancels cleanly via Escape.
 */
export function ProposalInlineTitle({
  proposalId,
  initialTitle,
  onSaveTitle,
  className,
}: ProposalInlineTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraftTitle(initialTitle);
    }
  }, [initialTitle, isEditing]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const cancelEdit = () => {
    setDraftTitle(initialTitle);
    setIsEditing(false);
  };

  const commitEdit = async () => {
    const trimmed = draftTitle.trim();
    if (!trimmed || trimmed === initialTitle.trim()) {
      cancelEdit();
      return;
    }
    try {
      setIsSaving(true);
      await onSaveTitle(proposalId, trimmed);
      setIsEditing(false);
    } catch {
      setDraftTitle(initialTitle);
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className={cn("flex items-center gap-1 w-full", className)}>
        <Input
          ref={inputRef}
          value={draftTitle}
          disabled={isSaving}
          onChange={(e) => setDraftTitle(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitEdit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancelEdit();
            }
          }}
          aria-label="Editar título da proposta"
          className="h-11 min-h-11 text-sm font-semibold bg-background border-primary/50"
        />
        <button
          type="button"
          disabled={isSaving}
          onMouseDown={(e) => e.preventDefault()}
          onClick={commitEdit}
          title="Salvar título"
          aria-label="Salvar título"
          className="size-11 min-h-11 min-w-11 shrink-0 rounded-lg inline-flex items-center justify-center text-emerald-600 hover:bg-emerald-500/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isSaving ? (
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Check className="size-4" />
          )}
        </button>
        <button
          type="button"
          disabled={isSaving}
          onMouseDown={(e) => e.preventDefault()}
          onClick={cancelEdit}
          title="Cancelar edição"
          aria-label="Cancelar edição"
          className="size-11 min-h-11 min-w-11 shrink-0 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("group/title flex items-start gap-1 min-w-0", className)}>
      <span
        onDoubleClick={() => setIsEditing(true)}
        title="Duplo clique para editar título"
        className="text-sm font-semibold text-foreground leading-snug break-words whitespace-normal cursor-text rounded px-1 -mx-1 py-1 hover:bg-muted/60 transition-colors"
      >
        {initialTitle}
      </span>
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        title="Renomear proposta inline"
        aria-label={`Renomear ${initialTitle}`}
        className="size-11 min-h-11 min-w-11 -my-2 shrink-0 rounded-lg inline-flex items-center justify-center text-muted-foreground opacity-60 group-hover/title:opacity-100 focus-visible:opacity-100 hover:text-foreground hover:bg-muted/60 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Pencil className="size-3.5" />
      </button>
    </div>
  );
}
