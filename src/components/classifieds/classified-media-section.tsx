import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { MediaUploader } from "@/components/ui/media-uploader";
import { ImagePlus } from "lucide-react";
import { hasActiveClassifiedMediaUpload } from "@/lib/classifieds/media-state";

export interface ClassifiedMediaSectionProps {
  images: string[];
  feedMedia: string[];
  onImagesChange: (urls: string[]) => void;
  onFeedMediaChange: (urls: string[]) => void;
  onUploadingStateChange: (isUploading: boolean) => void;
}

/**
 * Upload surfaces for the classified's hero carousel and feed-only gallery.
 * Upload state is aggregated so publishing remains blocked until both surfaces
 * have finished, including concurrent uploads.
 */
export function ClassifiedMediaSection({
  images,
  feedMedia,
  onImagesChange,
  onFeedMediaChange,
  onUploadingStateChange,
}: ClassifiedMediaSectionProps) {
  const [isHeroUploading, setIsHeroUploading] = useState(false);
  const [isFeedUploading, setIsFeedUploading] = useState(false);

  useEffect(() => {
    onUploadingStateChange(hasActiveClassifiedMediaUpload(isHeroUploading, isFeedUploading));
  }, [isFeedUploading, isHeroUploading, onUploadingStateChange]);

  return (
    <div className="bg-card rounded-lg p-4 sm:p-5 space-y-5 border border-border/60">
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
          <ImagePlus className="size-4 text-primary shrink-0" />
          <span>1. Mídias do Anúncio</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
            <span>Fotos do Topo (Carrossel Hero)</span>
            <Badge variant="outline" className="text-xs py-0 px-2 font-mono">
              Até 10 fotos
            </Badge>
          </Label>
          <span className="text-xs text-muted-foreground/75 font-mono text-muted-foreground">
            {images.length}/10 adicionada(s)
          </span>
        </div>
        <p className="text-xs text-muted-foreground/75 text-muted-foreground leading-relaxed">
          Imagens principais exibidas no carrossel de topo do anúncio (formato 4:3 com recorte).
        </p>
        <MediaUploader
          value={images}
          onChange={onImagesChange}
          onUploadingStateChange={setIsHeroUploading}
          bucket="post-media"
          folder="classifieds"
          aspect={4 / 3}
          enableCrop
          lockAspect
          maxFiles={10}
        />
      </div>

      <div className="pt-3 border-t border-border/40 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
            <span>Galeria Exclusiva do Feed</span>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs py-0 px-2 font-bold">
              Até 12 mídias
            </Badge>
          </Label>
          <span className="text-xs text-muted-foreground/75 font-mono text-muted-foreground">
            {feedMedia.length}/12 adicionada(s)
          </span>
        </div>
        <p className="text-xs text-muted-foreground/75 text-muted-foreground leading-relaxed">
          Mídias que aparecem exclusivamente no feed e grid do anúncio. Aceita Fotos, GIFs animados e Vídeos curtos (MP4/WebM). <strong>Não duplica as fotos do topo.</strong>
        </p>
        <MediaUploader
          value={feedMedia}
          onChange={onFeedMediaChange}
          onUploadingStateChange={setIsFeedUploading}
          bucket="post-media"
          folder="classifieds-feed"
          aspect={1}
          enableCrop={false}
          maxFiles={12}
          accept="all"
        />
      </div>
    </div>
  );
}
