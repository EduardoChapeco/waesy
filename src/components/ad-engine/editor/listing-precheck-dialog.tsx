import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UnifiedListing, UnifiedNiche } from "@/types/unified-ad-engine";
import { NICHE_TAXONOMY_REGISTRY, validateListingNicheTaxonomy } from "@/lib/ad-engine/niche-taxonomy-manifest";
import { cn } from "@/lib/utils";

export interface PrecheckItem {
  id: string;
  section: string;
  label: string;
  status: "pass" | "warn" | "fail";
  message: string;
  onNavigate?: () => void;
}

export interface ListingPrecheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: Partial<UnifiedListing>;
  onConfirmPublish: () => Promise<void>;
  isPublishing?: boolean;
}

export function ListingPrecheckDialog({
  open,
  onOpenChange,
  listing,
  onConfirmPublish,
  isPublishing = false,
}: ListingPrecheckDialogProps) {
  const niche = (listing.niche || "retail") as UnifiedNiche;
  const nicheConfig = NICHE_TAXONOMY_REGISTRY[niche];

  // Run deterministic audits
  const items: PrecheckItem[] = [];

  // 1. Título & Identificação
  const title = listing.title?.trim() ?? "";
  if (!title) {
    items.push({
      id: "title",
      section: "Identificação",
      label: "Título do Anúncio",
      status: "fail",
      message: "O anúncio precisa de um título claro de pelo menos 3 caracteres.",
    });
  } else if (title.length < 5) {
    items.push({
      id: "title_short",
      section: "Identificação",
      label: "Título Curto",
      status: "warn",
      message: "Títulos mais descritivos melhoram as visualizações e busca.",
    });
  } else {
    items.push({
      id: "title_ok",
      section: "Identificação",
      label: "Título do Anúncio",
      status: "pass",
      message: "Título validado com sucesso.",
    });
  }

  // 2. Preço & Comercial
  const price = listing.commercial?.price_cents ?? 0;
  if (price <= 0) {
    items.push({
      id: "price_zero",
      section: "Comercial",
      label: "Preço de Venda",
      status: "fail",
      message: "O valor de venda deve ser maior que zero.",
    });
  } else {
    items.push({
      id: "price_ok",
      section: "Comercial",
      label: "Preço de Venda",
      status: "pass",
      message: `Preço definido: R$ ${(price / 100).toFixed(2)}`,
    });
  }

  // 3. Mídia & Imagens
  const mediaCount = listing.media?.media_urls?.length ?? 0;
  if (mediaCount === 0) {
    items.push({
      id: "media_empty",
      section: "Mídia",
      label: "Galeria de Fotos",
      status: "fail",
      message: "É obrigatório enviar pelo menos 1 foto para publicar o anúncio.",
    });
  } else if (mediaCount < 3) {
    items.push({
      id: "media_few",
      section: "Mídia",
      label: "Galeria de Fotos",
      status: "warn",
      message: "Recomendamos enviar pelo menos 3 fotos para aumentar a conversão.",
    });
  } else {
    items.push({
      id: "media_ok",
      section: "Mídia",
      label: "Galeria de Fotos",
      status: "pass",
      message: `${mediaCount} foto(s) cadastradas com capa selecionada.`,
    });
  }

  // 4. Taxonomia de Nicho & Template
  const taxonomyCheck = validateListingNicheTaxonomy(listing);
  if (!taxonomyCheck.isValid) {
    taxonomyCheck.errorsList.forEach((err, idx) => {
      items.push({
        id: `tax_err_${idx}`,
        section: "Taxonomia & Template",
        label: err.field,
        status: "fail",
        message: err.message,
      });
    });
  } else {
    items.push({
      id: "template_ok",
      section: "Taxonomia & Template",
      label: "Template Coerente",
      status: "pass",
      message: `Template "${listing.template || nicheConfig?.allowedTemplates[0]}" compatível com ${nicheConfig?.name || niche}.`,
    });
  }

  const failCount = items.filter((i) => i.status === "fail").length;
  const warnCount = items.filter((i) => i.status === "warn").length;
  const canPublish = failCount === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden rounded-2xl bg-card border border-border/80">
        <DialogHeader className="p-5 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary shrink-0" />
            <DialogTitle className="text-base font-bold text-foreground">
              Pré-Checagem de Publicação (F23)
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Auditoria automatizada do anúncio antes de torná-lo público na vitrine.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo de Status */}
        <div className="px-5 py-3 bg-muted/30 border-b border-border/40 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Diagnóstico de Qualidade:</span>
          <div className="flex items-center gap-2">
            {failCount > 0 ? (
              <Badge variant="destructive" className="gap-1 text-2xs font-semibold">
                <XCircle className="size-3" />
                {failCount} pendência(s) impeditiva(s)
              </Badge>
            ) : (
              <Badge className="bg-emerald-600 text-white gap-1 text-2xs font-semibold">
                <CheckCircle2 className="size-3" />
                Pronto para Publicar
              </Badge>
            )}
            {warnCount > 0 && (
              <Badge variant="outline" className="gap-1 text-2xs font-semibold text-amber-500 border-amber-500/40">
                <AlertTriangle className="size-3" />
                {warnCount} aviso(s)
              </Badge>
            )}
          </div>
        </div>

        {/* Lista de Verificações */}
        <div className="p-5 max-h-[50vh] overflow-y-auto space-y-2.5">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "p-3 rounded-xl border flex items-start gap-3 transition-colors",
                item.status === "fail" && "border-destructive/30 bg-destructive/5 text-destructive",
                item.status === "warn" && "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400",
                item.status === "pass" && "border-emerald-500/30 bg-emerald-500/5 text-foreground"
              )}
            >
              <div className="shrink-0 mt-0.5">
                {item.status === "fail" && <XCircle className="size-4 text-destructive" />}
                {item.status === "warn" && <AlertTriangle className="size-4 text-amber-500" />}
                {item.status === "pass" && <CheckCircle2 className="size-4 text-emerald-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                    {item.section}
                  </span>
                  <span className="text-2xs font-semibold text-foreground">• {item.label}</span>
                </div>
                <p className="text-xs mt-0.5 leading-snug">{item.message}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Rodapé de Ações */}
        <DialogFooter className="p-4 bg-muted/20 border-t border-border/40 flex flex-row items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-xl text-xs cursor-pointer"
          >
            Voltar ao Editor
          </Button>

          <Button
            type="button"
            disabled={!canPublish || isPublishing}
            onClick={onConfirmPublish}
            className="h-10 rounded-xl text-xs font-semibold gap-1.5 px-4 cursor-pointer"
          >
            {isPublishing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Publicando...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="size-4" />
                <span>Confirmar & Publicar Anúncio</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
