import { CheckCircle2, Eye, Loader2, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProductEditorStickyBarProps {
  entityName: string;
  isSubmitting: boolean;
  onSave?: () => void;
  formId?: string;
  status?: string;
  previewUrl?: string;
  hasChanges?: boolean;
}

export function ProductEditorStickyBar({
  entityName,
  isSubmitting,
  onSave,
  formId,
  status = "draft",
  previewUrl,
}: ProductEditorStickyBarProps) {
  const isDraft = status === "draft";

  return (
    <div className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="pointer-events-auto w-full max-w-4xl bg-card/95 backdrop-blur-md border border-border/80 shadow-lg rounded-xl p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Badge
            variant={isDraft ? "secondary" : "default"}
            className="text-[11px] font-semibold shrink-0"
          >
            {isDraft ? "Rascunho" : "Publicado"}
          </Badge>
          <span className="text-xs text-muted-foreground truncate hidden sm:inline">
            Modo de edição do {entityName.toLowerCase()}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {previewUrl && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-11 px-3 text-xs font-semibold rounded-lg focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Link to={previewUrl as never} target="_blank">
                <Eye className="mr-2 size-4" />
                <span className="hidden sm:inline">Ver na Vitrine</span>
                <span className="sm:hidden">Vitrine</span>
              </Link>
            </Button>
          )}

          <Button
            type={formId ? "submit" : "button"}
            form={formId}
            onClick={formId ? undefined : onSave}
            disabled={isSubmitting}
            className="h-11 px-5 rounded-lg text-xs font-bold bg-primary text-primary-foreground gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring shadow-xs"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            <span>Salvar Alterações</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
