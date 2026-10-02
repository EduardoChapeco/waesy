import React from "react";
import { ImagePlus, Video, Star, Trash2, ArrowLeft, ArrowRight, UploadCloud, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MediaUploader, type MediaData } from "@/components/ui/media-uploader";
import type { UnifiedListingMedia, ListingOrigin } from "@/types/unified-ad-engine";
import { cn } from "@/lib/utils";

export interface ListingMediaSectionProps {
  origin: ListingOrigin;
  value: Partial<UnifiedListingMedia>;
  onChange: (patch: Partial<UnifiedListingMedia>) => void;
  errors?: Record<string, string>;
  className?: string;
}

export function ListingMediaSection({
  origin,
  value,
  onChange,
  errors = {},
  className,
}: ListingMediaSectionProps) {
  const images: string[] = value.media_urls ?? [];
  const coverUrl: string = value.cover_url ?? (images.length > 0 ? images[0] : "");
  const videoUrl: string = value.video_url ?? "";

  const maxPhotos = origin === "workspace" ? 20 : 6;

  const handleSetCover = (url: string) => {
    // Reorder: cover becomes index 0
    const reordered = [url, ...images.filter((img: string) => img !== url)];
    onChange({
      cover_url: url,
      media_urls: reordered,
    });
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const nextImages = images.filter((_: string, idx: number) => idx !== indexToRemove);
    const nextCover = nextImages.includes(coverUrl) ? coverUrl : (nextImages[0] ?? "");
    onChange({
      media_urls: nextImages,
      cover_url: nextCover,
    });
  };

  const handleMoveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length) return;
    const reordered = [...images];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onChange({
      media_urls: reordered,
      cover_url: reordered[0] ?? "",
    });
  };

  const handleUploadComplete = (media: MediaData[]) => {
    const newUrls = media.map((m) => m.url);
    const combined = [...images, ...newUrls].slice(0, maxPhotos);
    onChange({
      media_urls: combined,
      cover_url: coverUrl || combined[0] || "",
    });
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* ── Galeria de Fotos com Capa Travada ── */}
      <div className="bg-card rounded-lg p-4 sm:p-5 border border-border/60 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <ImagePlus className="size-4 text-primary shrink-0" />
            <span>Galeria de Imagens</span>
          </div>
          <Badge variant="outline" className="text-xs font-normal">
            {images.length} / {maxPhotos} fotos
          </Badge>
        </div>

        {/* Uploader com drag-and-drop */}
        {images.length < maxPhotos && (
          <div className="rounded-lg border border-dashed border-border/80 bg-background/50 p-4">
            <MediaUploader
              onUploadComplete={handleUploadComplete}
              maxFiles={maxPhotos - images.length}
              accept="image"
            />
          </div>
        )}

        {errors.media_urls && (
          <p className="text-xs text-destructive">{errors.media_urls}</p>
        )}

        {/* Grade de Fotos Carregadas */}
        {images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
            {images.map((url: string, idx: number) => {
              const isCover = url === coverUrl || idx === 0;
              return (
                <div
                  key={`${url}-${idx}`}
                  className={cn(
                    "group relative aspect-4/3 rounded-lg overflow-hidden border bg-muted/40 transition-colors",
                    isCover ? "border-primary ring-2 ring-primary/20" : "border-border/60 hover:border-border"
                  )}
                >
                  <img
                    src={url}
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />

                  {/* Badge de Capa */}
                  {isCover && (
                    <div className="absolute top-2 left-2 z-10">
                      <Badge className="bg-primary text-primary-foreground text-2xs px-2 py-1 font-bold">
                        Principal
                      </Badge>
                    </div>
                  )}

                  {/* Barra de Ações Superior / Hover */}
                  <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex flex-col justify-between p-2">
                    <div className="flex items-center justify-between">
                      {!isCover && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          onClick={() => handleSetCover(url)}
                          className="h-11 w-11 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                          title="Definir como foto principal"
                        >
                          <Star className="size-4 text-foreground" />
                        </Button>
                      )}
                      <div className="ml-auto flex items-center gap-1">
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => handleRemoveImage(idx)}
                          className="h-11 w-11 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                          title="Remover foto"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Controles de Reordenação */}
                    <div className="flex items-center justify-between">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        disabled={idx === 0}
                        onClick={() => handleMoveImage(idx, idx - 1)}
                        className="h-11 w-11 rounded-lg cursor-pointer disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                        title="Mover para esquerda"
                      >
                        <ArrowLeft className="size-4" />
                      </Button>
                      <span className="text-2xs font-mono font-medium text-foreground">
                        {idx + 1}
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        disabled={idx === images.length - 1}
                        onClick={() => handleMoveImage(idx, idx + 1)}
                        className="h-11 w-11 rounded-lg cursor-pointer disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                        title="Mover para direita"
                      >
                        <ArrowRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center rounded-lg bg-muted/20 border border-border/40 space-y-2">
            <UploadCloud className="size-8 text-muted-foreground mx-auto" />
            <p className="text-xs font-semibold text-foreground">Nenhuma foto adicionada ainda</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Adicione fotos com boa iluminação e proporção retangular para destacar seu anúncio na vitrine.
            </p>
          </div>
        )}
      </div>

      {/* ── Vídeo Promocional (Opcional) ── */}
      <div className="bg-card rounded-lg p-4 sm:p-5 border border-border/60 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <Video className="size-4 text-primary shrink-0" />
          <span>Vídeo Promocional (Opcional)</span>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-foreground">Link do Vídeo (YouTube, Vimeo ou Reels)</Label>
          <Input
            value={videoUrl}
            onChange={(e) => onChange({ video_url: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
            className="h-11 rounded-lg text-xs bg-background"
          />
          <p className="text-xs text-muted-foreground">
            O player de vídeo será integrado no detalhe do anúncio na vitrine.
          </p>
        </div>
      </div>
    </div>
  );
}
