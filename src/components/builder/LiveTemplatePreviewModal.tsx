import React, { useState, useMemo } from "react";
import { NicheTemplateDefinition, applyTemplateToPage } from "./templates";
import { createEmptyOmniPage, OmniPageDocument } from "./types";
import { OmniPageRenderer } from "./OmniPageRenderer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, Smartphone, Sparkles, X, Check, Eye } from "lucide-react";

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
      <DialogContent className="fixed inset-0 z-50 max-w-none w-screen h-[100dvh] m-0 p-0 rounded-none bg-background flex flex-col border-none shadow-none overflow-hidden duration-200">
        {/* ── 1. TopBar de Controle do Live Preview (Padrão Wix / Webflow) ── */}
        <header className="h-14 border-b border-border/70 bg-card px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <span className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
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
                Visualização ao vivo com renderização real dos blocos e interatividade nativa.
              </DialogDescription>
            </div>
          </div>

          {/* Toggle Responsivo Desktop vs Mobile */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/40 border border-border/60">
            <button
              type="button"
              onClick={() => setViewport("desktop")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewport === "desktop"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Monitor className="size-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setViewport("mobile")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewport === "mobile"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="size-3.5" />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>

          {/* Ações: Cancelar ou Usar Template */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer"
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
              className="h-9 px-4 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
            >
              <Sparkles className="size-3.5" />
              <span>Usar este Modelo</span>
            </Button>
          </div>
        </header>

        {/* ── 2. Área de Renderização Ao Vivo (Sandboxed Live Canvas) ── */}
        <div className="flex-1 bg-muted/20 overflow-y-auto p-2 sm:p-8 flex justify-center items-start overflow-x-hidden">
          <div
            className={`transition-all duration-300 ${
              viewport === "mobile"
                ? "w-full max-w-[390px] min-h-[780px] shadow-2xl rounded-3xl border border-border/80 overflow-hidden bg-background my-2 shrink-0"
                : "w-full max-w-6xl shadow-sm bg-background rounded-2xl border border-border/60 my-2"
            }`}
          >
            <OmniPageRenderer document={previewDocument} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
