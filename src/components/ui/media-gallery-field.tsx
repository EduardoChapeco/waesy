import React, { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Crop,
  Film,
  ImagePlus,
  Link2,
  Loader2,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import {
  aspectPresetToCssValue,
  aspectPresetToTailwindClass,
  isVideoMediaUrl,
  normalizeAspectPreset,
  resolveExternalVideoEmbedSrc,
  type ProposalMediaAspectPreset,
  type ProposalMediaItem,
} from "@/lib/tourism/proposal-normalization";
import { extractMediaFromClipboard } from "@/lib/clipboard-media";
import { getSignedUploadUrl, ingestExternalMediaUrl } from "@/services/storage.functions";
import { cn } from "@/lib/utils";

const ASPECT_OPTIONS: Array<{ value: ProposalMediaAspectPreset; label: string; ratio?: number }> = [
  { value: "auto", label: "Auto" },
  { value: "16:9", label: "16:9", ratio: 16 / 9 },
  { value: "4:3", label: "4:3", ratio: 4 / 3 },
  { value: "1:1", label: "1:1", ratio: 1 },
  { value: "4:5", label: "4:5", ratio: 4 / 5 },
  { value: "9:16", label: "9:16", ratio: 9 / 16 },
  { value: "free", label: "Livre" },
];

function aspectPresetToNumber(preset?: ProposalMediaAspectPreset): number | undefined {
  return ASPECT_OPTIONS.find((opt) => opt.value === preset)?.ratio;
}

export interface MediaGallerySlotDescriptor {
  preset: ProposalMediaAspectPreset;
  slotRole?: ProposalMediaItem["slot_role"];
  label?: string;
}

export interface MediaGalleryFieldProps {
  items: ProposalMediaItem[];
  onChange: (next: ProposalMediaItem[]) => void;
  bucket?: string;
  allowVideos?: boolean;
  defaultAspectPreset?: ProposalMediaAspectPreset;
  slotAspectResolver?: (index: number) => MediaGallerySlotDescriptor;
  maxItems?: number;
  label?: string;
  className?: string;
}

function numericAspectToPreset(ratio?: number): ProposalMediaAspectPreset {
  if (!ratio || !Number.isFinite(ratio)) return "free";
  if (Math.abs(ratio - 21 / 9) < 0.08) return "21:9";
  if (Math.abs(ratio - 16 / 9) < 0.06) return "16:9";
  if (Math.abs(ratio - 4 / 3) < 0.06) return "4:3";
  if (Math.abs(ratio - 1) < 0.05) return "1:1";
  if (Math.abs(ratio - 4 / 5) < 0.05) return "4:5";
  if (Math.abs(ratio - 9 / 16) < 0.05) return "9:16";
  return "free";
}

/**
 * Campo unificado de galeria multi-mídia para propostas e páginas web editoriais.
 * Suporta upload múltiplo de imagens/vídeos, recorte com proporção alinhada ao slot ativo,
 * poster/enquadramento de vídeo, reordenação, definição de capa, legenda e ingestão de link externo.
 */
export function MediaGalleryField({
  items,
  onChange,
  bucket = "cms-media",
  allowVideos = true,
  defaultAspectPreset = "4:3",
  slotAspectResolver,
  maxItems = 24,
  label = "Galeria de Mídias",
  className,
}: MediaGalleryFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlBar, setShowUrlBar] = useState(false);
  const [externalUrl, setExternalUrl] = useState("");
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  const [pendingCropFileUrl, setPendingCropFileUrl] = useState<string | null>(null);

  const uploadBinaryToSignedBucket = async (fileOrBlob: File | Blob, fileName: string, contentType: string): Promise<string> => {
    const signed = await getSignedUploadUrl({
      data: {
        fileName,
        bucket: bucket as "cms-media",
        contentType: contentType || "application/octet-stream",
      },
    });
    if (!signed?.signedUrl || !signed?.publicUrl) {
      throw new Error("Não foi possível gerar URL de envio para a mídia.");
    }
    const putRes = await fetch(signed.signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType || "application/octet-stream",
      },
      body: fileOrBlob,
    });
    if (!putRes.ok) {
      throw new Error(`Falha ao gravar arquivo (${putRes.status}).`);
    }
    return signed.publicUrl;
  };

  const handleFilesSelected = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const remainingSlots = Math.max(0, maxItems - items.length);
    if (remainingSlots === 0) {
      toast.info(`Limite máximo de ${maxItems} mídias atingido.`);
      return;
    }

    const batch = fileArray.slice(0, remainingSlots);
    setIsUploading(true);
    try {
      const uploadedItems: ProposalMediaItem[] = [];
      for (let i = 0; i < batch.length; i++) {
        const file = batch[i];
        const isVideo = file.type.startsWith("video/");
        if (isVideo && !allowVideos) {
          toast.warning(`Arquivo ${file.name} ignorado (somente imagens neste campo).`);
          continue;
        }
        const safeName = file.name || (isVideo ? `video-${Date.now()}.mp4` : `imagem-${Date.now()}.png`);
        const publicUrl = await uploadBinaryToSignedBucket(file, safeName, file.type);
        const slotMeta = slotAspectResolver?.(items.length + uploadedItems.length);
        uploadedItems.push({
          id: `med-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          url: publicUrl,
          type: isVideo ? "video" : "image",
          aspectPreset: isVideo ? "16:9" : (slotMeta?.preset || defaultAspectPreset),
          ...(slotMeta?.slotRole ? { slot_role: slotMeta.slotRole } : {}),
          objectPosition: "50% 50%",
          scale: 1,
          image_scale: 1,
          fit: "cover",
          order: items.length + uploadedItems.length,
        });
      }

      if (uploadedItems.length > 0) {
        onChange([...items, ...uploadedItems]);
        toast.success(
          uploadedItems.length === 1
            ? "Mídia enviada com sucesso."
            : `${uploadedItems.length} mídias enviadas para a galeria.`,
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao enviar arquivos.";
      toast.error(message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const pastedItems = await extractMediaFromClipboard(e.nativeEvent);
    const files = pastedItems.map((m) => m.file).filter(Boolean);
    if (files.length > 0) {
      e.preventDefault();
      await handleFilesSelected(files);
      return;
    }
    const text = e.clipboardData?.getData("text/plain")?.trim() || "";
    if (/^https?:\/\//i.test(text)) {
      e.preventDefault();
      setExternalUrl(text);
      setShowUrlBar(true);
    }
  };

  const handleAddExternalUrl = async () => {
    const clean = externalUrl.trim();
    if (!/^https?:\/\//i.test(clean)) {
      toast.error("Informe uma URL iniciando com http:// ou https://");
      return;
    }

    setIsUploading(true);
    try {
      const isVid = allowVideos && isVideoMediaUrl(clean);
      let finalUrl = clean;
      if (!isVid) {
        try {
          const ingested = await ingestExternalMediaUrl({
            data: { externalUrl: clean, bucket, folder: "proposals" },
          });
          if (ingested?.url) finalUrl = ingested.url;
        } catch {
          // Mantém URL original caso o servidor bloqueie fetch remoto temporariamente
        }
      }

      const slotMeta = slotAspectResolver?.(items.length);
      const nextItem: ProposalMediaItem = {
        id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        url: finalUrl,
        type: isVid ? "video" : "image",
        aspectPreset: isVid ? "16:9" : (slotMeta?.preset || defaultAspectPreset),
        ...(slotMeta?.slotRole ? { slot_role: slotMeta.slotRole } : {}),
        objectPosition: "50% 50%",
        scale: 1,
        image_scale: 1,
        fit: "cover",
        order: items.length,
      };
      onChange([...items, nextItem]);
      setExternalUrl("");
      setShowUrlBar(false);
      toast.success(isVid ? "Vídeo vinculado à galeria." : "Imagem adicionada à galeria.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleMove = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onChange(next.map((item, idx) => ({ ...item, order: idx })));
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0 || index >= items.length) return;
    const next = [...items];
    const [picked] = next.splice(index, 1);
    next.unshift(picked);
    onChange(next.map((item, idx) => ({ ...item, order: idx })));
    toast.success("Definida como mídia de destaque.");
  };

  const handleUpdateItem = (index: number, patch: Partial<ProposalMediaItem>) => {
    const next = items.map((item, idx) => (idx === index ? { ...item, ...patch } : item));
    onChange(next);
  };

  const handleRemove = (index: number) => {
    const next = items.filter((_, idx) => idx !== index).map((item, idx) => ({ ...item, order: idx }));
    onChange(next);
  };

  const handleOpenCropper = (index: number) => {
    const target = items[index];
    if (!target || target.type === "video") return;
    setCropIndex(index);
    setPendingCropFileUrl(target.url);
  };

  const handleCropWithMetaComplete = async (payload: {
    blob: Blob;
    cropPixels: { x: number; y: number; width: number; height: number };
    aspect?: number;
    zoom: number;
    rotation: number;
  }) => {
    if (cropIndex === null) return;
    setIsUploading(true);
    try {
      const publicUrl = await uploadBinaryToSignedBucket(
        payload.blob,
        `recorte-${Date.now()}.png`,
        "image/png",
      );
      const nextPreset = numericAspectToPreset(payload.aspect);
      const slotMeta = slotAspectResolver?.(cropIndex);
      handleUpdateItem(cropIndex, {
        url: publicUrl,
        aspectPreset: nextPreset !== "free" ? nextPreset : (slotMeta?.preset || items[cropIndex]?.aspectPreset || defaultAspectPreset),
        ...(slotMeta?.slotRole ? { slot_role: slotMeta.slotRole } : {}),
        crop_x: payload.cropPixels.x,
        crop_y: payload.cropPixels.y,
        crop_width: payload.cropPixels.width,
        crop_height: payload.cropPixels.height,
        scale: payload.zoom,
        image_scale: payload.zoom,
      });
      toast.success("Recorte aplicado e salvo.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o recorte.");
    } finally {
      setIsUploading(false);
      setCropIndex(null);
      setPendingCropFileUrl(null);
    }
  };

  const acceptMime = allowVideos
    ? "image/png,image/jpeg,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime"
    : "image/png,image/jpeg,image/webp,image/gif,image/avif";

  const activeCropItem = cropIndex !== null ? items[cropIndex] : null;

  return (
    <div
      onPaste={handlePaste}
      tabIndex={0}
      className={cn(
        "space-y-3 rounded-xl border border-border bg-card p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-foreground">
          {label} ({items.length})
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowUrlBar((prev) => !prev)}
            className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Link2 className="size-4" />
            <span>Colar URL</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="h-11 min-h-11 px-3 text-xs font-bold gap-2 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isUploading ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <ImagePlus className="size-4" />}
            <span>Adicionar Mídias</span>
          </Button>
        </div>
      </div>

      {showUrlBar && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder={allowVideos ? "https://... (imagem, MP4, YouTube ou Vimeo)" : "https://... (URL da imagem)"}
            className="h-11 text-xs flex-1"
          />
          <Button
            type="button"
            size="sm"
            disabled={isUploading || !externalUrl.trim()}
            onClick={handleAddExternalUrl}
            className="h-11 min-h-11 px-4 text-xs font-bold focus-visible:ring-2 focus-visible:ring-ring"
          >
            Inserir Link
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptMime}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            void handleFilesSelected(e.target.files);
          }
        }}
      />

      {items.length === 0 ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full min-h-24 rounded-lg border-2 border-dashed border-border bg-muted/30 hover:bg-muted/60 transition-colors flex flex-col items-center justify-center gap-1 p-4 text-center cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ImagePlus className="size-5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">
            Selecionar ou colar mídias (Ctrl+V)
          </span>
          <span className="text-xs text-muted-foreground">
            {allowVideos ? "Envie várias fotos ou vídeos de uma vez" : "Envie uma ou múltiplas fotos"}
          </span>
        </button>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item, idx) => {
            const slotMeta = slotAspectResolver?.(idx);
            const preset = normalizeAspectPreset(item.aspectPreset);
            const effectivePreset =
              preset === "auto" || preset === "free" ? preset : preset;
            const aspectCls = aspectPresetToTailwindClass(effectivePreset);
            const aspectCss = aspectPresetToCssValue(effectivePreset);
            const embedSrc = item.type === "video" ? resolveExternalVideoEmbedSrc(item.url) : null;
            const videoFocal = item.objectPosition || "50% 50%";
            const videoPoster = item.video_poster_url || item.posterUrl;
            return (
              <div
                key={item.id || idx}
                className="rounded-lg border border-border bg-background p-2 space-y-2"
              >
                {slotMeta?.label && (
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{slotMeta.label}</span>
                    {slotMeta.preset !== item.aspectPreset && item.type === "image" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateItem(idx, { aspectPreset: slotMeta.preset, slot_role: slotMeta.slotRole })}
                        className="h-11 min-h-11 px-3 text-xs font-semibold text-primary cursor-pointer"
                      >
                        Aplicar {slotMeta.preset}
                      </Button>
                    )}
                  </div>
                )}
                <div
                  className={cn("relative w-full overflow-hidden rounded-md bg-muted", aspectCls || "aspect-video")}
                  style={aspectCls ? undefined : aspectCss ? { aspectRatio: aspectCss } : undefined}
                >
                  {item.type === "video" ? (
                    embedSrc ? (
                      <iframe
                        src={embedSrc}
                        title={item.caption || `Vídeo ${idx + 1}`}
                        className="size-full border-0"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={item.url}
                        controls
                        preload="metadata"
                        poster={videoPoster}
                        className="size-full object-cover"
                        style={{
                          objectPosition: videoFocal,
                          transform:
                            (item.image_scale || item.scale) && (item.image_scale || item.scale) !== 1
                              ? `scale(${item.image_scale || item.scale})`
                              : undefined,
                        }}
                      />
                    )
                  ) : (
                    <img
                      src={item.url}
                      alt={item.caption || `Mídia ${idx + 1}`}
                      className={cn(
                        "size-full transition-transform duration-200 motion-reduce:transition-none",
                        item.fit === "contain" ? "object-contain" : "object-cover",
                      )}
                      style={{
                        objectPosition: item.objectPosition || "50% 50%",
                        transform:
                          (item.image_scale || item.scale) && (item.image_scale || item.scale) !== 1
                            ? `scale(${item.image_scale || item.scale})`
                            : undefined,
                      }}
                    />
                  )}
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    {idx === 0 && (
                      <Badge variant="default" className="text-xs font-bold px-2 py-1">
                        Capa
                      </Badge>
                    )}
                    {item.type === "video" && (
                      <Badge variant="secondary" className="text-xs font-bold px-2 py-1 gap-1">
                        <Film className="size-3" />
                        Vídeo
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, -1)}
                      aria-label="Mover para antes"
                      className="h-11 w-11 p-0 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ArrowLeft className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={idx === items.length - 1}
                      onClick={() => handleMove(idx, 1)}
                      aria-label="Mover para depois"
                      className="h-11 w-11 p-0 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ArrowRight className="size-4" />
                    </Button>
                    {idx > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetPrimary(idx)}
                        aria-label="Definir como capa"
                        className="h-11 w-11 p-0 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Star className="size-4" />
                      </Button>
                    )}
                    {item.type === "image" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenCropper(idx)}
                        aria-label="Recortar imagem"
                        className="h-11 w-11 p-0 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Crop className="size-4" />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <select
                      aria-label="Proporção da mídia"
                      value={item.aspectPreset || "4:3"}
                      onChange={(e) =>
                        handleUpdateItem(idx, {
                          aspectPreset: normalizeAspectPreset(e.target.value),
                        })
                      }
                      className="h-11 rounded-md border border-border bg-card px-2 text-xs font-medium text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      {ASPECT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(idx)}
                      aria-label="Excluir mídia"
                      className="h-11 w-11 p-0 text-destructive hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {item.type === "video" && !embedSrc && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      value={item.video_poster_url || item.posterUrl || ""}
                      onChange={(e) =>
                        handleUpdateItem(idx, {
                          video_poster_url: e.target.value,
                          posterUrl: e.target.value,
                        })
                      }
                      placeholder="URL da imagem de capa (poster)"
                      className="h-11 text-xs"
                    />
                    <select
                      aria-label="Foco do vídeo"
                      value={item.objectPosition || "50% 50%"}
                      onChange={(e) => handleUpdateItem(idx, { objectPosition: e.target.value })}
                      className="h-11 rounded-md border border-border bg-card px-2 text-xs font-medium text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="50% 50%">Enquadramento: Centro</option>
                      <option value="50% 15%">Enquadramento: Topo</option>
                      <option value="50% 85%">Enquadramento: Inferior</option>
                      <option value="15% 50%">Enquadramento: Esquerda</option>
                      <option value="85% 50%">Enquadramento: Direita</option>
                    </select>
                  </div>
                )}

                <Input
                  value={item.caption || ""}
                  onChange={(e) => handleUpdateItem(idx, { caption: e.target.value })}
                  placeholder="Legenda opcional"
                  className="h-11 text-xs"
                />
              </div>
            );
          })}
        </div>
      )}

      <ImageCropperDialog
        open={Boolean(cropIndex !== null && pendingCropFileUrl)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setCropIndex(null);
            setPendingCropFileUrl(null);
          }
        }}
        imageSrc={pendingCropFileUrl}
        aspect={
          aspectPresetToNumber(
            activeCropItem?.aspectPreset && activeCropItem.aspectPreset !== "auto" && activeCropItem.aspectPreset !== "free"
              ? activeCropItem.aspectPreset
              : cropIndex !== null
                ? slotAspectResolver?.(cropIndex)?.preset
                : undefined,
          )
        }
        lockAspect={false}
        cropShape="rect"
        title="Enquadrar Mídia"
        onCropWithMetadata={handleCropWithMetaComplete}
      />
    </div>
  );
}
