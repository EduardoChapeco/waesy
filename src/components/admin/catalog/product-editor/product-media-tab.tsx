import * as React from "react";
import { ImagePlus, Download, Plus, Check, Layers } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MediaUploader } from "@/components/ui/media-uploader";
import { extractVariantImages } from "@/lib/catalog-channel-integrations";
import type { RawVariant } from "@/types/catalog";
import { cn } from "@/lib/utils";

export interface ProductMediaTabProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  variants?: RawVariant[] | null;
}

export function ProductMediaTab({ images, onImagesChange, variants }: ProductMediaTabProps) {
  const variantData = React.useMemo(() => {
    return extractVariantImages(variants, images);
  }, [variants, images]);

  // Auto-alimenta a galeria se o usuário ainda não adicionou fotos principais mas cadastrou fotos nas variações
  const hasAutoSeededRef = React.useRef(false);
  React.useEffect(() => {
    if (images.length === 0 && variantData.items.length > 0 && !hasAutoSeededRef.current) {
      hasAutoSeededRef.current = true;
      const initialVariantUrls = variantData.items.map((item) => item.url).slice(0, 8);
      onImagesChange(initialVariantUrls);
    }
  }, [images.length, variantData.items, onImagesChange]);

  const handlePullAll = React.useCallback(() => {
    const missingUrls = variantData.items
      .filter((item) => !item.isAlreadyInGallery)
      .map((item) => item.url);

    if (missingUrls.length === 0) {
      toast.info("Todas as fotos de variações já estão na galeria.");
      return;
    }

    const availableSlots = 8 - images.length;
    if (availableSlots <= 0) {
      toast.error("Limite máximo de 8 fotos atingido na galeria.");
      return;
    }

    const toAdd = missingUrls.slice(0, availableSlots);
    onImagesChange([...images, ...toAdd]);
    toast.success(
      toAdd.length === 1
        ? "1 foto de variação adicionada à galeria!"
        : `${toAdd.length} fotos de variações adicionadas à galeria!`,
    );
  }, [variantData, images, onImagesChange]);

  const handlePullSingle = React.useCallback(
    (url: string) => {
      if (images.includes(url)) {
        toast.info("Esta imagem já está presente na galeria.");
        return;
      }
      if (images.length >= 8) {
        toast.error("Limite máximo de 8 fotos atingido na galeria.");
        return;
      }
      onImagesChange([...images, url]);
      toast.success("Foto da variação adicionada à galeria!");
    },
    [images, onImagesChange],
  );

  return (
    <div className="space-y-6">
      {/* Bloco de Alimentação a Partir de Variações */}
      {variantData.hasVariantImages && (
        <div className="bg-card rounded-lg p-6 space-y-4 border border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                <span className="text-sm font-bold text-foreground">
                  Fotos da Grade de Variações
                </span>
                <Badge variant="outline" className="text-xs font-mono">
                  {variantData.totalImages} foto(s)
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {variantData.newImagesCount > 0
                  ? `${variantData.newImagesCount} foto(s) cadastrada(s) nas variações pronta(s) para compor a galeria do anúncio.`
                  : "Todas as fotos das variações já estão sincronizadas na galeria principal."}
              </p>
            </div>

            {variantData.newImagesCount > 0 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-11 min-h-11 px-4 gap-2 font-semibold text-xs shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                onClick={handlePullAll}
              >
                <Download className="size-4" />
                Puxar Fotos da Grade ({variantData.newImagesCount})
              </Button>
            )}
          </div>

          {/* Grid de miniaturas das variações */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-3 border-t border-border">
            {variantData.items.map((item, idx) => (
              <div
                key={`${item.url}-${idx}`}
                className={cn(
                  "rounded-lg border p-2 flex flex-col items-center gap-2 text-center transition-colors",
                  item.isAlreadyInGallery
                    ? "bg-muted/40 border-border opacity-75"
                    : "bg-card border-primary/30 hover:border-primary",
                )}
              >
                <div className="size-16 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0 border border-border">
                  <img src={item.url} alt={item.label} className="size-full object-cover" />
                </div>
                <div className="w-full min-w-0 space-y-1">
                  <p className="text-xs font-semibold truncate text-foreground" title={item.label}>
                    {item.label}
                  </p>
                  {item.isAlreadyInGallery ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
                      <Check className="size-3" /> Na Galeria
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-11 min-h-11 w-full text-xs px-2 font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                      onClick={() => handlePullSingle(item.url)}
                    >
                      <Plus className="size-3 mr-1" /> Puxar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Galeria Principal e Upload Direto */}
      <div className="bg-card rounded-lg p-6 space-y-4 border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <ImagePlus className="size-4 text-primary" />
            <span>Galeria Principal do Anúncio</span>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {images.length} / 8 foto(s)
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          Arraste novas fotos e vídeos ou faça upload individual diretamente aqui. A primeira imagem será exibida como capa da vitrine.
        </p>

        {images.length === 0 && variantData.newImagesCount > 0 && (
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  Galeria vazia com fotos na grade disponíveis
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Deseja utilizar as fotos já cadastradas nas suas variações como capa do produto?
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              className="h-11 min-h-11 px-4 text-xs font-bold cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              onClick={handlePullAll}
            >
              <Download className="size-4 mr-2" />
              Usar Fotos da Grade
            </Button>
          </div>
        )}

        <MediaUploader
          value={images}
          onChange={onImagesChange}
          bucket="cms-media"
          folder="products"
          aspect={1}
          enableCrop={true}
          lockAspect={true}
          maxFiles={8}
        />
      </div>
    </div>
  );
}