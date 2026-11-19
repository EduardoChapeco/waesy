import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { MediaUploader } from "@/components/ui/media-uploader";
import { SquircleCard } from "@/components/ui/squircle-card";
import { ImagePlus, Layers } from "lucide-react";
import { hasActiveClassifiedMediaUpload } from "@/lib/classifieds/media-state";

export interface ClassifiedMediaSectionProps {
  images: string[];
  feedMedia: string[];
  onImagesChange: (urls: string[]) => void;
  onFeedMediaChange: (urls: string[]) => void;
  onUploadingStateChange: (isUploading: boolean) => void;
}

/**
 * Superfície unificada de mídia (Capa 4:3 + Feed 1:1) com guarda de uploads concorrentes.
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
    <section className="bg-card rounded-lg p-5 sm:p-6 space-y-6 border border-border">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
          <ImagePlus className="size-4 text-primary shrink-0" aria-hidden="true" />
          <span>Mídias e Identidade Visual</span>
        </div>
        <Badge variant="outline" className="text-xs font-mono text-muted-foreground">
          {images.length + feedMedia.length} mídia(s)
        </Badge>
      </div>

      {/* 1.1 Fotos de Capa e Destaque (Topo do Anúncio) */}
      <SquircleCard variant="media" className="p-5 sm:p-6 space-y-4 border border-border bg-muted">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-2 min-w-0">
            <Label className="text-sm font-bold text-foreground flex items-center gap-2">
              <ImagePlus className="size-4 text-primary shrink-0" aria-hidden="true" />
              <span>Fotos de Capa e Topo (Visualização Principal)</span>
            </Label>
            <p className="text-xs text-muted-foreground leading-relaxed break-words text-wrap">
              Estas fotos aparecem no cabeçalho do anúncio, no banner principal e nos cards das vitrines de busca da cidade. A 1ª foto será a capa oficial do anúncio.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Badge variant="outline" className="text-xs py-1 px-3 font-mono">
              4:3 Horizontal
            </Badge>
            <Badge variant="secondary" className="text-xs py-1 px-3 font-mono font-bold">
              {images.length}/10 adicionada(s)
            </Badge>
          </div>
        </div>
        <MediaUploader
          value={images}
          onChange={onImagesChange}
          onUploadingStateChange={setIsHeroUploading}
          bucket="post-media"
          folder="classifieds"
          aspect={4 / 3}
          enableCrop={true}
          lockAspect={true}
          maxFiles={10}
        />
      </SquircleCard>

      {/* 1.2 Mídias do Feed da Cidade e Galeria */}
      <SquircleCard variant="media" className="p-5 sm:p-6 space-y-4 border border-border bg-muted">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-2 min-w-0">
            <Label className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="size-4 text-primary shrink-0" aria-hidden="true" />
              <span>Mídias do Feed da Cidade e Galeria</span>
            </Label>
            <p className="text-xs text-muted-foreground leading-relaxed break-words text-wrap">
              Fotos e vídeos curtos publicados no Feed da Cidade dos membros e na grade visual quadrada do anúncio. Formato quadrado 1:1 nativo.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Badge variant="outline" className="text-xs py-1 px-3 font-mono">
              1:1 Quadrado
            </Badge>
            <Badge variant="secondary" className="text-xs py-1 px-3 font-mono font-bold">
              {feedMedia.length}/12 adicionada(s)
            </Badge>
          </div>
        </div>
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
      </SquircleCard>
    </section>
  );
}
