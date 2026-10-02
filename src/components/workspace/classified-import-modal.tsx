/**
 * classified-import-modal.tsx — Modal de Importação de Classificados para o Catálogo Pro
 *
 * Fase F05 do Plano Mestre de Estabilização dos 4 Pilares.
 *
 * Permite que o lojista autenticado liste seus anúncios avulsos publicados
 * no Classificados e os promova para produtos nativos do catálogo do Workspace
 * com 1 clique, preservando título, preço, galeria e atributos originais.
 *
 * Invariantes: DL-11 (loading/empty/error), DL-14 (touch >= 44px), DL-15 (focus-visible),
 *              DL-16/17 (contraste >= 4.5:1), Zero hex/rgb literal.
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { ArrowUpRight, Package, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/state/states";
import { formatMoney } from "@/lib/money";
import {
  promoteClassifiedToWorkspaceProductFn,
  listUserClassifiedsForPromotionFn,
  type ClassifiedForPromotion,
} from "@/services/listing-promotion.functions";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ClassifiedImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  /** Callback chamado quando um produto é criado com sucesso */
  onProductCreated?: (productId: string, classifiedTitle: string) => void;
}

// ---------------------------------------------------------------------------
// Componente de card individual
// ---------------------------------------------------------------------------

function ClassifiedCard({
  classified,
  storeId,
  onPromoted,
}: {
  classified: ClassifiedForPromotion;
  storeId: string;
  onPromoted: (productId: string) => void;
}) {
  const [promoting, setPromoting] = useState(false);
  const [promoted, setPromoted] = useState(classified.promoted_to_product_id !== null);

  const handlePromote = useCallback(async () => {
    if (promoting || promoted) return;
    setPromoting(true);

    try {
      const result = await promoteClassifiedToWorkspaceProductFn({
        data: {
          classifiedId: classified.id,
          targetStoreId: storeId,
          initialStockQuantity: 0,
        },
      });

      setPromoted(true);
      onPromoted(result.productId);

      if (result.wasAlreadyPromoted) {
        toast.success("Produto ja existe no catalogo", {
          description: `"${classified.title}" ja estava no catalogo Pro.`,
        });
      } else {
        toast.success("Produto criado no catalogo", {
          description: `"${classified.title}" foi importado com sucesso.`,
          action: {
            label: "Ver produto",
            onClick: () =>
              (window.location.href = `/workspace/catalogo/produtos`),
          },
        });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Falha ao importar o anuncio.";
      toast.error("Erro na importacao", { description: message });
    } finally {
      setPromoting(false);
    }
  }, [classified.id, classified.title, promoting, promoted, storeId, onPromoted]);

  const thumb = classified.images?.[0];

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-surface-card p-4">
      {/* Thumbnail */}
      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-muted">
        {thumb ? (
          <img
            src={thumb}
            alt={classified.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Package className="h-6 w-6" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {classified.title}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {classified.price_cents > 0
              ? formatMoney(classified.price_cents)
              : "Sob consulta"}
          </span>
          {classified.category && (
            <Badge variant="secondary" className="text-xs">
              {classified.category}
            </Badge>
          )}
        </div>
      </div>

      {/* Acao */}
      <div className="flex-shrink-0">
        {promoted ? (
          <div className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>Importado</span>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-11 min-w-[120px] gap-2"
            onClick={handlePromote}
            disabled={promoting}
            aria-label={`Importar "${classified.title}" para o catalogo Pro`}
          >
            {promoting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Importando...
              </>
            ) : (
              <>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                Importar
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente de loading skeleton
// ---------------------------------------------------------------------------

function ClassifiedCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border p-4">
      <Skeleton className="h-14 w-14 flex-shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-11 w-28 flex-shrink-0 rounded-md" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal principal — ClassifiedImportModal
// ---------------------------------------------------------------------------

type LoadState = "idle" | "loading" | "success" | "error";

export function ClassifiedImportModal({
  open,
  onOpenChange,
  storeId,
  onProductCreated,
}: ClassifiedImportModalProps) {
  const [classifieds, setClassifieds] = useState<ClassifiedForPromotion[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [promotedCount, setPromotedCount] = useState(0);

  const loadClassifieds = useCallback(async () => {
    setLoadState("loading");
    setErrorMsg("");
    try {
      const data = await listUserClassifiedsForPromotionFn({
        data: { limit: 20 },
      });
      setClassifieds(data);
      setLoadState("success");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Falha ao carregar seus anuncios.";
      setErrorMsg(msg);
      setLoadState("error");
    }
  }, []);

  // Carregar ao abrir
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
      if (nextOpen && loadState === "idle") {
        void loadClassifieds();
      }
    },
    [loadState, loadClassifieds, onOpenChange]
  );

  const handlePromoted = useCallback(
    (productId: string, classifiedTitle: string) => {
      setPromotedCount((c) => c + 1);
      onProductCreated?.(productId, classifiedTitle);
    },
    [onProductCreated]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-xl overflow-hidden rounded-xl p-0 shadow-overlay">
        {/* Header */}
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle className="text-base font-semibold text-foreground">
            Importar para o Catalogo Pro
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Selecione anuncios do Classificados para transformar em produtos do
            seu catalogo com controle de estoque e checkout integrado.
          </DialogDescription>
        </DialogHeader>

        {/* Corpo com scroll */}
        <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: "calc(80vh - 120px)" }}>
          {/* Estado: loading */}
          {loadState === "loading" && (
            <div className="space-y-3" aria-busy="true" aria-label="Carregando seus anuncios">
              {Array.from({ length: 3 }).map((_, i) => (
                <ClassifiedCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Estado: erro */}
          {loadState === "error" && (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Erro ao carregar anuncios
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{errorMsg}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-11"
                onClick={() => void loadClassifieds()}
              >
                Tentar novamente
              </Button>
            </div>
          )}

          {/* Estado: lista vazia */}
          {loadState === "success" && classifieds.length === 0 && (
            <EmptyState
              icon={Package}
              title="Nenhum anuncio disponivel"
              description="Voce nao tem anuncios ativos no Classificados ou todos ja foram importados para o catalogo."
            />
          )}

          {/* Estado: lista de classificados */}
          {loadState === "success" && classifieds.length > 0 && (
            <div className="space-y-3">
              {promotedCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {promotedCount}{" "}
                  {promotedCount === 1 ? "anuncio importado" : "anuncios importados"} nesta
                  sessao.
                </p>
              )}
              {classifieds.map((c) => (
                <ClassifiedCard
                  key={c.id}
                  classified={c}
                  storeId={storeId}
                  onPromoted={(productId) =>
                    handlePromoted(productId, c.title)
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-border px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-11"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
