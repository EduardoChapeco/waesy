import { useState } from "react";
import type { FormEvent } from "react";
import { Search, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { BuilderAssetRef } from "@/lib/builder/asset-contract";
import {
  createUnsplashAssetRef,
  type UnsplashPhotoForStudio,
  type UnsplashSearchResult,
} from "@/lib/builder/unsplash-api";
import {
  getUnsplashStudioStatus,
  searchUnsplashStudioPhotos,
  trackUnsplashStudioSelection,
} from "@/services/unsplash.functions";

interface UnsplashAssetPickerProps {
  usageSlot: string;
  defaultQuery?: string;
  onSelect: (asset: BuilderAssetRef, photo: UnsplashPhotoForStudio) => void;
  disabled?: boolean;
}

export function UnsplashAssetPicker({
  usageSlot,
  defaultQuery = "",
  onSelect,
  disabled = false,
}: UnsplashAssetPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(defaultQuery);
  const [result, setResult] = useState<UnsplashSearchResult | null>(null);
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectingPhotoId, setSelectingPhotoId] = useState("");

  const search = async (event?: FormEvent) => {
    event?.preventDefault();
    setError("");
    setResult(null);
    setIsSearching(true);
    try {
      const status = await getUnsplashStudioStatus();
      if (!status.configured) {
        throw new Error("Unsplash ainda não está configurado neste ambiente. Um administrador deve definir UNSPLASH_ACCESS_KEY como secret do servidor.");
      }
      const photos = await searchUnsplashStudioPhotos({
        data: { query, page: 1, perPage: 12, orientation: "landscape" },
      });
      setResult(photos);
      if (photos.results.length === 0) setError("Nenhuma imagem encontrada. Tente outro termo.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Não foi possível buscar imagens.";
      setError(message);
    } finally {
      setIsSearching(false);
    }
  };

  const selectPhoto = async (photo: UnsplashPhotoForStudio) => {
    if (selectingPhotoId) return;
    setError("");
    setSelectingPhotoId(photo.id);
    try {
      await trackUnsplashStudioSelection({
        data: { photoId: photo.id, downloadLocation: photo.downloadLocation, usageSlot },
      });
      const asset = createUnsplashAssetRef(photo, {
        usageSlot,
        downloadEventStatus: "tracked",
      });
      onSelect(asset, photo);
      toast.success("Imagem selecionada e crédito registrado.");
      setOpen(false);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Não foi possível registrar o uso da imagem.";
      setError(`${message} A imagem não foi adicionada para evitar uso sem tracking.`);
      toast.error("Imagem não selecionada: falha no registro Unsplash.");
    } finally {
      setSelectingPhotoId("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled} className="min-h-11 gap-2 text-xs">
          <ImagePlus className="size-3.5" />
          Buscar no Unsplash
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Escolher imagem do Unsplash</DialogTitle>
          <DialogDescription>
            O Waesy mantém hotlink e registra o evento de seleção. Use imagens de banco apenas como decoração genérica, nunca como foto de um produto, local, profissional ou cliente real. O crédito será exibido na página publicada.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={search} className="flex gap-2">
          <label htmlFor={`unsplash-query-${usageSlot}`} className="sr-only">Buscar imagens</label>
          <Input
            id={`unsplash-query-${usageSlot}`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex.: ambiente acolhedor, luz natural"
            maxLength={100}
            autoFocus
          />
          <Button type="submit" disabled={isSearching || query.trim().length < 2}>
            {isSearching ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <Search className="size-4" />}
            <span className="sr-only">Buscar</span>
          </Button>
        </form>
        {error && <p role="status" className="text-sm text-destructive">{error}</p>}
        {result && result.results.length > 0 && (
          <div className="grid max-h-96 grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
            {result.results.map((photo) => (
              <article key={photo.id} className="overflow-hidden rounded-lg border border-border bg-card">
                <button
                  type="button"
                  className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  disabled={Boolean(selectingPhotoId)}
                  onClick={() => void selectPhoto(photo)}
                  aria-label={`Selecionar imagem de ${photo.creator} no Unsplash`}
                >
                  <img
                    src={photo.smallUrl}
                    alt={photo.altText || `Imagem de ${photo.width} por ${photo.height} pixels`}
                    width={400}
                    height={280}
                    loading="lazy"
                    decoding="async"
                    className="h-40 w-full bg-muted object-cover"
                  />
                  <span className="block px-3 pt-2 text-xs font-medium text-foreground">
                    {selectingPhotoId === photo.id ? "Registrando seleção…" : "Usar esta imagem"}
                  </span>
                </button>
                <p className="px-3 pb-3 pt-1 text-xs leading-relaxed text-muted-foreground">
                  Foto por{" "}
                  <a href={photo.creatorProfileUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    {photo.creator}
                  </a>{" "}
                  em{" "}
                  <a href={photo.photoPageUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    Unsplash
                  </a>
                </p>
              </article>
            ))}
          </div>
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">
          A seleção exige tracking da API oficial. Não baixe nem re-hospede as imagens. Verifique a licença e a diretriz de API em cada release; o Waesy não interpreta juridicamente a licença.
        </p>
      </DialogContent>
    </Dialog>
  );
}
