import React, { useState, useEffect, useRef } from "react";
import { Save, ShieldCheck, Zap, Sliders, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ListingQuickEditor } from "./listing-quick-editor";
import { ListingFullEditor } from "./listing-full-editor";
import { ListingPrecheckDialog } from "./listing-precheck-dialog";
import type { UnifiedListing, UnifiedNiche, ListingOrigin } from "@/types/unified-ad-engine";
import { listingCreationSchema } from "@/lib/ad-engine/listing-schemas";
import { NICHE_TAXONOMY_REGISTRY } from "@/lib/ad-engine/niche-taxonomy-manifest";
import { cn } from "@/lib/utils";

export interface UnifiedListingEditorProps {
  origin: ListingOrigin;
  initialData?: Partial<UnifiedListing>;
  initialMode?: "quick" | "full";
  onSaveDraft: (data: Partial<UnifiedListing>) => Promise<void>;
  onPublish: (data: Partial<UnifiedListing>) => Promise<void>;
  onBack?: () => void;
  onOpenMasterCatalog?: () => void;
  className?: string;
}

export function UnifiedListingEditor({
  origin,
  initialData = {},
  initialMode = "full",
  onSaveDraft,
  onPublish,
  onBack,
  onOpenMasterCatalog,
  className,
}: UnifiedListingEditorProps) {
  const [mode, setMode] = useState<"quick" | "full">(initialMode);
  const [listing, setListing] = useState<Partial<UnifiedListing>>({
    origin,
    status: "draft",
    niche: "retail",
    visibility: "public",
    commercial: {
      price_cents: 0,
      payment_methods: ["pix", "credit_card"],
      max_installments: 1,
      fee_free_installments: 1,
      pix_discount_percent: 0,
    },
    media: {
      media_urls: [],
      cover_url: "",
    },
    ...initialData,
  });

  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [isPrecheckOpen, setIsPrecheckOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update handler
  const handleChange = (patch: Partial<UnifiedListing>) => {
    setListing((prev) => {
      const updated = { ...prev, ...patch };
      return updated;
    });
    setIsDirty(true);
    setSaveStatus("unsaved");
  };

  // Debounced Autosave (F15)
  useEffect(() => {
    if (!isDirty || saveStatus === "saving") return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      try {
        setSaveStatus("saving");
        await onSaveDraft(listing);
        setSaveStatus("saved");
        setIsDirty(false);
      } catch (err) {
        setSaveStatus("unsaved");
      }
    }, 4000); // 4s debounced autosave

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [listing, isDirty, onSaveDraft, saveStatus]);

  // Safe Exit Handling (F15)
  const handleAttemptExit = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else if (onBack) {
      onBack();
    }
  };

  // Explicit Save Draft
  const handleExplicitSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      await onSaveDraft({ ...listing, status: "draft" });
      setSaveStatus("saved");
      setIsDirty(false);
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Request Publish - opens pre-flight check dialog
  const handleRequestPublish = () => {
    // Validate required fields before opening
    const check = listingCreationSchema.safeParse(listing);
    if (!check.success) {
      const errMap: Record<string, string> = {};
      check.error.errors.forEach((err) => {
        const fieldName = err.path.join(".");
        errMap[fieldName] = err.message;
      });
      setValidationErrors(errMap);
    } else {
      setValidationErrors({});
    }
    setIsPrecheckOpen(true);
  };

  // Final Publish Confirmation
  const handleConfirmPublish = async () => {
    setIsPublishing(true);
    try {
      await onPublish({ ...listing, status: "published" });
      setIsPrecheckOpen(false);
      setIsDirty(false);
      setSaveStatus("saved");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className={cn("space-y-6 pb-20", className)}>
      {/* ── Barra Superior de Ações e Estado de Salvamento (F15) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card rounded-2xl border border-border/60 sticky top-3 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleAttemptExit}
              className="size-9 rounded-xl cursor-pointer"
              title="Voltar"
            >
              <ArrowLeft className="size-4" />
            </Button>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-foreground">
                {origin === "workspace" ? "Novo Anúncio no Catálogo" : "Publicar Novo Classificado"}
              </h1>
              <Badge variant="outline" className="text-2xs font-semibold uppercase">
                {origin}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-2xs text-muted-foreground mt-0.5">
              <span>Status:</span>
              {saveStatus === "saving" && (
                <span className="flex items-center gap-1 text-primary">
                  <Loader2 className="size-3 animate-spin" /> Salvando rascunho...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1 text-emerald-500">
                  <CheckCircle2 className="size-3" /> Salvo automaticamente
                </span>
              )}
              {saveStatus === "unsaved" && (
                <span className="flex items-center gap-1 text-amber-500">
                  <AlertCircle className="size-3" /> Alterações pendentes
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Controles de Modo e Publicação */}
        <div className="flex items-center gap-2">
          {/* Seletor de Modo: Rápido vs Completo */}
          <div className="p-0.5 bg-muted/60 rounded-xl border border-border/40 flex items-center">
            <Button
              type="button"
              variant={mode === "quick" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode("quick")}
              className="h-8 rounded-lg text-xs font-semibold gap-1 px-2.5 cursor-pointer"
            >
              <Zap className="size-3.5" />
              <span>Rápido</span>
            </Button>
            <Button
              type="button"
              variant={mode === "full" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode("full")}
              className="h-8 rounded-lg text-xs font-semibold gap-1 px-2.5 cursor-pointer"
            >
              <Sliders className="size-3.5" />
              <span>Completo</span>
            </Button>
          </div>

          {/* Salvar Rascunho */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExplicitSaveDraft}
            disabled={isSavingDraft}
            className="h-9 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
          >
            {isSavingDraft ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            <span>Salvar</span>
          </Button>

          {/* Publicar */}
          <Button
            type="button"
            size="sm"
            onClick={handleRequestPublish}
            className="h-9 rounded-xl text-xs font-bold gap-1.5 px-4 shadow-xs cursor-pointer"
          >
            <ShieldCheck className="size-3.5" />
            <span>Publicar</span>
          </Button>
        </div>
      </div>

      {/* ── Corpo do Editor (Alternância F16 vs F17) ── */}
      {mode === "quick" ? (
        <ListingQuickEditor
          origin={origin}
          listing={listing}
          onChange={handleChange}
          onSwitchToFullMode={() => setMode("full")}
          onRequestPublish={handleRequestPublish}
          errors={validationErrors}
        />
      ) : (
        <ListingFullEditor
          origin={origin}
          listing={listing}
          onChange={handleChange}
          errors={validationErrors}
          onOpenMasterCatalog={onOpenMasterCatalog}
        />
      )}

      {/* ── Diálogo de Pré-Checagem (F23) ── */}
      <ListingPrecheckDialog
        open={isPrecheckOpen}
        onOpenChange={setIsPrecheckOpen}
        listing={listing}
        onConfirmPublish={handleConfirmPublish}
        isPublishing={isPublishing}
      />

      {/* ── Alerta de Saída Segura (F15) ── */}
      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent className="max-w-sm rounded-2xl bg-card border border-border/80 p-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground">
              Descartar alterações não salvas?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Você possui alterações pendentes no anúncio. Se sair agora, as últimas alterações podem ser perdidas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowExitConfirm(false)}
              className="h-9 rounded-xl text-xs cursor-pointer"
            >
              Continuar Editando
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                setShowExitConfirm(false);
                if (onBack) onBack();
              }}
              className="h-9 rounded-xl text-xs cursor-pointer"
            >
              Sair sem Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
