import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Settings, Trash2, Sparkles, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ui/image-upload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  addProductMediaLink,
  deleteProductMedia,
  reorderProductMedia,
  updateProductMediaMetadata,
} from "@/services/admin-catalog.functions";

interface ProductEditMediaManagerProps {
  product: any;
}

export function ProductEditMediaManager({ product }: ProductEditMediaManagerProps) {
  const router = useRouter();
  const [, setIsAdding] = useState(false);
  const [editingMedia, setEditingMedia] = useState<any>(null);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);

  const variantImages: string[] = (product.product_variants || [])
    .map((v: any) => v.image_url?.trim())
    .filter((u: any): u is string => Boolean(u));
  const existingMediaUrls = new Set<string>((product.product_media || []).map((m: any) => String(m.url?.trim() || "")));
  const missingVariantImages: string[] = Array.from(new Set(variantImages)).filter((u: string) => !existingMediaUrls.has(u));

  const handlePullAllVariantImages = async () => {
    if (missingVariantImages.length === 0) return;
    setIsAdding(true);
    let count = 0;
    try {
      for (const url of missingVariantImages) {
        await addProductMediaLink({
          data: {
            product_id: product.id,
            url,
          },
        });
        count++;
      }
      toast.success(`${count} foto(s) de variações adicionada(s) à galeria!`);
      router.invalidate();
    } catch {
      toast.error("Erro ao puxar fotos de variações.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddImage = async (url: string) => {
    if ((!url)) return;
    setIsAdding(true);
    try {
      const res = await addProductMediaLink({
        data: {
          product_id: product.id,
          url,
        },
      });
      if (res) {
        toast.success("Imagem vinculada e salva na galeria!");
        router.invalidate();
      } else {
        toast.error("Erro ao salvar imagem.");
      }
    } catch {
      toast.error("Erro inesperado ao salvar imagem.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (mediaId: string, mediaUrl: string) => {
    try {
      await deleteProductMedia({ data: { id: mediaId, url: mediaUrl } });
      toast.success("Mídia removida.");
      router.invalidate();
    } catch {
      toast.error("Erro ao deletar mídia");
    }
  };

  const handleMove = async (index: number, direction: "left" | "right") => {
    const list = [...(product.product_media || [])];
    if (direction === "left" && index === 0) return;
    if (direction === "right" && index === list.length - 1) return;

    const targetIdx = direction === "left" ? index - 1 : index + 1;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    const mediaOrders = list.map((item, idx) => ({
      id: item.id,
      sort_order: idx,
    }));

    try {
      await reorderProductMedia({ data: { mediaOrders } });
      toast.success("Ordenação de fotos atualizada!");
      router.invalidate();
    } catch {
      toast.error("Erro ao reordenar mídias.");
    }
  };

  const handleSaveMetadata = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMedia) return;

    setIsSavingMetadata(true);
    const formData = new FormData(e.currentTarget);
    const alt = formData.get("alt") as string;
    const media_type = formData.get("media_type") as "image" | "video";
    const variant_id = (formData.get("variant_id") as string) || null;

    try {
      await updateProductMediaMetadata({
        data: {
          id: editingMedia.id,
          alt: alt || null,
          media_type,
          variant_id: variant_id === "none" ? null : variant_id,
        },
      });

      toast.success("Metadados atualizados com sucesso!");
      setEditingMedia(null);
      router.invalidate();
    } catch {
      toast.error("Erro ao atualizar metadados.");
    } finally {
      setIsSavingMetadata(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-base font-bold text-foreground">Galeria de Fotos do Produto</h3>
        <p className="text-xs text-muted-foreground">
          Fotos em alta qualidade aumentam a conversão de vendas. Limite de 5MB por arquivo.
        </p>
      </div>
      <div className="space-y-6">
        {missingVariantImages.length > 0 && (
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  Fotos de Variações Detectadas ({missingVariantImages.length})
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Existem fotos cadastradas nas variações deste produto que ainda não estão na galeria principal.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              className="h-11 min-h-11 px-4 text-xs font-bold cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              onClick={handlePullAllVariantImages}
            >
              <Download className="size-4 mr-2" />
              Puxar Fotos da Grade ({missingVariantImages.length})
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs font-semibold">Fazer Upload de Nova Imagem</Label>
          <div className="max-w-md">
            <ImageUpload onChange={handleAddImage} bucket="product-media" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
          {product.product_media
            ?.sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((m: any, idx: number) => {
              const matchedVariant = product.product_variants?.find(
                (v: any) => v.id === m.variant_id,
              );
              const variantText = matchedVariant ? `Variação: ${matchedVariant.sku}` : "Uso Geral";

              return (
                <div
                  key={m.id || idx}
                  className="relative group border border-border/80 overflow-hidden bg-card rounded-lg flex flex-col justify-between"
                >
                  <div className="relative aspect-4/3 bg-muted/40 overflow-hidden flex items-center justify-center">
                    {m.media_type === "video" ? (
                      <video
                        src={m.url}
                        className="size-full object-cover"
                        controls={false}
                        muted
                      />
                    ) : (
                      <img src={m.url} alt={m.alt || ""} className="size-full object-cover" />
                    )}
                    {idx === 0 && (
                      <Badge className="absolute top-2 left-2 text-xs font-bold" variant="default">
                        Capa
                      </Badge>
                    )}
                    {m.media_type === "video" && (
                      <Badge className="absolute top-2 right-12 text-xs bg-destructive text-destructive-foreground border-none">
                        Vídeo
                      </Badge>
                    )}
                    <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                         className="size-11 min-h-11 min-w-11 rounded-md focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => setEditingMedia(m)} /* focus-visible: */
                      >
                        <Settings className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                         className="size-11 min-h-11 min-w-11 rounded-md focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => handleDelete(m.id, m.url)} /* focus-visible: */
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-3 space-y-1 bg-background/50">
                    <p className="text-xs font-semibold text-primary truncate">{variantText}</p>
                    <p className="text-xs text-muted-foreground truncate italic">
                      {m.alt ? `"${m.alt}"` : "Sem legenda"}
                    </p>
                    <div className="flex items-center justify-between pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                         className="size-11 min-h-11 min-w-11 rounded-md focus-visible:ring-2 focus-visible:ring-ring"
                        disabled={idx === 0}
                        onClick={() => handleMove(idx, "left")} /* focus-visible: */
                      >
                        <ArrowLeft className="size-3.5" />
                      </Button>
                      <span className="text-xs text-muted-foreground font-mono">
                        Pos: {idx + 1}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                         className="size-11 min-h-11 min-w-11 rounded-md focus-visible:ring-2 focus-visible:ring-ring"
                        disabled={idx === (product.product_media?.length || 0) - 1}
                        onClick={() => handleMove(idx, "right")} /* focus-visible: */
                      >
                        <ArrowRight className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <Sheet open={Boolean(editingMedia)} onOpenChange={(open) => (!open) && setEditingMedia(null)}>
        {editingMedia && (
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Editar Detalhes da Mídia</SheetTitle>
              <SheetDescription>
                Adicione legendas de acessibilidade ou vincule esta imagem a uma variante específica.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSaveMetadata} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Legenda / Texto Alternativo (Acessibilidade)</Label>
                <Input
                  name="alt"
                  defaultValue={editingMedia.alt || ""}
                  placeholder="Ex: Tênis vermelho de couro sob luz natural"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Mídia</Label>
                <Select name="media_type" defaultValue={editingMedia.media_type || "image"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Imagem</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Vincular à Variante Específica</Label>
                <Select name="variant_id" defaultValue={editingMedia.variant_id || "none"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Uso Geral (Vitrine Principal)</SelectItem>
                    {product.product_variants?.map((v: any) => {
                      const attrsText = Object.entries(v.attributes || {})
                        .map(([k, val]) => `${k}: ${val}`)
                        .join(", ");
                      return (
                        <SelectItem key={v.id} value={v.id}>
                          {v.sku} {attrsText ? `(${attrsText})` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <SheetFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingMedia(null)} /* focus-visible: */
                  className="rounded-lg h-11 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingMetadata}
                  className="rounded-lg h-11 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isSavingMetadata ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
