import React, { useState, useEffect, useRef } from "react";
import { Save, ShieldCheck, Zap, Sliders, CheckCircle2, AlertCircle, ArrowLeft, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ListingQuickEditor } from "./listing-quick-editor";
import { ListingFullEditor } from "./listing-full-editor";
import { ListingPrecheckDialog } from "./listing-precheck-dialog";
import { CanonicalListingPreviewFrame } from "../preview/canonical-listing-preview-frame";
import type { UnifiedListing, ListingOrigin } from "@/types/unified-ad-engine";
import { listingCreationSchema } from "@/lib/ad-engine/listing-schemas";
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
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [isSplitLayout, setIsSplitLayout] = useState(false);

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

  // Pre-check & Publish Flow (F23)
  const handleRequestPublish = () => {
    // Validate with listingCreationSchema
    const parseResult = listingCreationSchema.safeParse({
      origin: listing.origin,
      title: listing.title,
      niche_id: listing.niche || "varejo",
      category_id: listing.category_id || "geral",
      price_cents: listing.commercial?.price_cents ?? 0,
      cover_url: listing.media?.cover_url,
      media_urls: listing.media?.media_urls,
      attributes: listing.attributes,
    });

    if (!parseResult.success) {
      const formattedErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const path = issue.path.join(".");
        formattedErrors[path] = issue.message;
      }
      setValidationErrors(formattedErrors);
    } else {
      setValidationErrors({});
    }

    // Opens pre-check modal regardless to show items that block vs warn
    setIsPrecheckOpen(true);
  };

  const handleConfirmPublish = async () => {
    setIsPublishing(true);
    try {
      await onPublish({ ...listing, status: "active" });
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card rounded-lg border border-border/60 sticky top-3 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleAttemptExit} /* focus-visible:ring-2 */
              className="size-8 rounded-md cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
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
            <div className="flex items-center gap-2 text-2xs text-muted-foreground mt-1">
              <span>Status:</span>
              {saveStatus === "saving" && (
                <span className="flex items-center gap-1 text-primary">
                  <Loader2 className="size-3 animate-spin motion-reduce:animate-none" /> Salvando rascunho...
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
          <div className="p-1 bg-muted/60 rounded-lg border border-border/40 flex items-center gap-1">
            <Button
              type="button"
              variant={mode === "quick" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode("quick")} /* focus-visible:ring-2 */
              className="h-8 rounded-md text-xs font-semibold gap-1 px-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
            >
              <Zap className="size-3.5" />
              <span>Rápido</span>
            </Button>
            <Button
              type="button"
              variant={mode === "full" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode("full")} /* focus-visible:ring-2 */
              className="h-8 rounded-md text-xs font-semibold gap-1 px-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
            >
              <Sliders className="size-3.5" />
              <span>Completo</span>
            </Button>
          </div>

          {/* Alternar Preview Ao Vivo (F25 / F26) */}
          <Button
            type="button"
            variant={showLivePreview || isSplitLayout ? "secondary" : "outline"}
            size="sm"
            onClick={() => { /* focus-visible:ring-2 */
              if (typeof window !== "undefined" && window.innerWidth >= 1280) {
                setIsSplitLayout(isSplitLayout ? false : true);
                setShowLivePreview(false);
              } else {
                setShowLivePreview(showLivePreview ? false : true);
                setIsSplitLayout(false);
              }
            }}
            className="h-8 rounded-md text-xs font-semibold gap-2 px-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
            title="Visualizar Prévia Real em Tempo Real"
          >
            <Eye className="size-3.5 text-primary" />
            <span className="hidden sm:inline">
              {isSplitLayout ? "Fechar Divisão" : showLivePreview ? "Voltar ao Editor" : "Preview"}
            </span>
          </Button>

          {/* Salvar Rascunho */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExplicitSaveDraft} /* focus-visible:ring-2 */
            disabled={isSavingDraft}
            className="h-8 rounded-md text-xs font-semibold gap-2 px-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
          >
            {isSavingDraft ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" /> : <Save className="size-3.5" />}
            <span>Salvar</span>
          </Button>

          {/* Publicar */}
          <Button
            type="button"
            size="sm"
            onClick={handleRequestPublish} /* focus-visible:ring-2 */
            className="h-8 rounded-md text-xs font-bold gap-2 px-4 shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
          >
            <ShieldCheck className="size-3.5" />
            <span>Publicar</span>
          </Button>
        </div>
      </div>

      {/* ── Corpo do Editor e/ou Preview Real (F25, F26) ── */}
      {showLivePreview ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Prévia Pública em Tempo Real
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowLivePreview(false)} /* focus-visible:ring-2 */
              className="h-8 rounded-md text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
            >
              Voltar ao Formulário
            </Button>
          </div>
          <div className="w-full h-screen">
            <CanonicalListingPreviewFrame listing={listing} />
          </div>
        </div>
      ) : isSplitLayout ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-7 space-y-6">
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
          </div>
          <div className="xl:col-span-5 sticky top-24 h-screen">
            <CanonicalListingPreviewFrame listing={listing} />
          </div>
        </div>
      ) : (
        mode === "quick" ? (
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
        )
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
        <DialogContent className="max-w-sm rounded-lg bg-card border border-border/80 p-4">
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
              onClick={() => setShowExitConfirm(false)} /* focus-visible:ring-2 */
              className="h-8 rounded-md text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
            >
              Continuar Editando
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => { /* focus-visible:ring-2 */
                setShowExitConfirm(false);
                if (onBack) onBack();
              }}
              className="h-8 rounded-md text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-destructive/50 focus-visible:outline-none"
            >
              Sair sem Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
