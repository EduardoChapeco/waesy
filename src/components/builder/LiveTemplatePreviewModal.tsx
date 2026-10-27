import React, { useState, useMemo } from "react";
import { NicheTemplateDefinition, applyTemplateToPage } from "./templates";
import { createEmptyOmniPage, OmniPageDocument } from "./types";
import { OmniPageRenderer } from "./OmniPageRenderer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, Smartphone, Check, Eye } from "lucide-react";

export interface LiveTemplatePreviewModalProps {
  template: NicheTemplateDefinition | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => void;
}

export const LiveTemplatePreviewModal: React.FC<LiveTemplatePreviewModalProps> = ({
  template,
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");

  const previewDocument: OmniPageDocument | null = useMemo(() => {
    if (!template) return null;
    const base = createEmptyOmniPage(template.id, template.name, template.niche);
    return applyTemplateToPage(base, template.id);
  }, [template]);

  if (!template || !previewDocument) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="fixed inset-0 z-50 max-w-none w-screen h-screen-dvh m-0 p-0 rounded-none bg-background flex flex-col border-none shadow-none overflow-hidden duration-200">
        <header className="h-14 border-b border-border/70 bg-card px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <span className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Eye className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-sm font-bold text-foreground truncate">
                  {template.name}
                </DialogTitle>
                <Badge variant="outline" className="text-xs text-muted-foreground/75 font-semibold border-border bg-muted/50 text-muted-foreground shrink-0">
                  {template.badge}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground truncate hidden sm:block">
                Blocos e interações do modelo.
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/40 border border-border/60">
            <button
              type="button"
              onClick={() => setViewport("desktop")}
              aria-pressed={viewport === "desktop"}
              className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                viewport === "desktop"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
            >
              <Monitor className="size-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setViewport("mobile")}
              aria-pressed={viewport === "mobile"}
              className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                viewport === "mobile"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
            >
              <Smartphone className="size-3.5" />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Voltar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onSelectTemplate(template.id);
                onClose();
              }}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Check className="size-3.5" />
              <span>Usar modelo</span>
            </Button>
          </div>
        </header>

        <div className="flex-1 bg-muted/20 overflow-y-auto p-2 sm:p-8 flex justify-center items-start overflow-x-hidden">
          <div
            className={`transition-colors duration-200 motion-reduce:transition-none ${
              viewport === "mobile"
                ? "w-full max-w-sm min-h-dvh shadow-xs rounded-lg border border-border/80 overflow-hidden bg-background my-2 shrink-0"
                : "w-full max-w-6xl shadow-xs bg-background rounded-lg border border-border/60 my-2"
            }`}
          >
            <OmniPageRenderer document={previewDocument} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
