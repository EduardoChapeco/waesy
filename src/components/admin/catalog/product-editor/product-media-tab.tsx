import * as React from "react";
import { ImagePlus } from "lucide-react";
import { MediaUploader } from "@/components/ui/media-uploader";

export interface ProductMediaTabProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
}

export function ProductMediaTab({ images, onImagesChange }: ProductMediaTabProps) {
  return (
    <div className="bg-card rounded-lg p-6 space-y-4 border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <ImagePlus className="size-4 text-primary" />
          <span>Galeria de Imagens</span>
        </div>
        <span className="text-xs font-mono text-muted-foreground">
          {images.length} foto(s)
        </span>
      </div>

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
  );
}
