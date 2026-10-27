import React, { useState } from "react";
import { MediaGalleryBlockData, OmniBlockStyling } from "../types";
import { Image as ImageIcon, X, ZoomIn } from "lucide-react";

export interface MediaGalleryMosaicProps {
  id: string;
  data: MediaGalleryBlockData;
  styling?: OmniBlockStyling;
  className?: string;
}

export const MediaGalleryMosaic: React.FC<MediaGalleryMosaicProps> = ({
  id,
  data,
  styling,
  className = "",
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const paddingYClasses = {
    none: "py-0",
    sm: "py-8",
    md: "py-16",
    lg: "py-24",
    xl: "py-32",
  }[styling?.paddingY || "md"];

  const radiusClass = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-lg",
    "2xl": "rounded-lg",
    full: "rounded-lg",
  }[styling?.borderRadius || "xl"];

  const customStyle: React.CSSProperties = {
    backgroundColor: styling?.backgroundColor || undefined,
    color: styling?.textColor || undefined,
  };

  const items = (data.items || []).filter((item) => !!item.imageUrl);

  return (
    <section
      id={id}
      style={customStyle}
      className={`relative w-full ${paddingYClasses} border-b border-border/40 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho da Seção */}
        {(data.title || data.subtitle) && (
          <div className="text-center max-w-2xl mx-auto mb-12">
            {data.title && (
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-3">
                {data.title}
              </h2>
            )}
            {data.subtitle && (
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                {data.subtitle}
              </p>
            )}
          </div>
        )}

        {/* Grade Mosaico Dinâmica ou Estado Vazio Honesto */}
        {items.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-border/80 p-12 text-center flex flex-col items-center justify-center bg-muted/10">
            <div className="size-14 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
              <ImageIcon className="size-7" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Galeria de Mídia Pronta</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              Adicione fotos reais de produtos, espaço ou serviços no painel lateral de Conteúdo para compor o mosaico.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {items.map((item, index) => {
            const isFeatured = index === 0;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => setSelectedImage(item.imageUrl)}
                aria-label={item.title || "Ampliar imagem da galeria"}
                className={`group relative overflow-hidden ${radiusClass} border border-border/60 bg-muted/20 cursor-pointer transition-colors duration-300 hover:border-foreground/20 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none ${
                  isFeatured ? "sm:col-span-2 lg:col-span-2 aspect-16/10" : "aspect-square"
                }`}
              >
                <img
                  src={item.imageUrl}
                  alt={item.title || "Imagem da galeria"}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-background/90 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 motion-reduce:transition-none flex flex-col justify-end p-4 border-t border-border/40 text-foreground">
                  {item.title && (
                    <span className="text-sm sm:text-base font-bold tracking-tight text-foreground">{item.title}</span>
                  )}
                  {item.caption && (
                    <span className="text-xs text-muted-foreground mt-1">{item.caption}</span>
                  )}
                  <div className="absolute top-4 right-4 size-8 rounded-full bg-muted/80 backdrop-blur-md flex items-center justify-center text-foreground">
                    <ZoomIn className="size-4" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Visualização ampliada"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop Button */}
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            aria-label="Fechar visualização ampliada"
            className="fixed inset-0 bg-background/90 backdrop-blur-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />

          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            aria-label="Fechar visualização ampliada"
            className="absolute top-6 right-6 z-10 size-11 min-h-11 rounded-full bg-muted/80 hover:bg-muted text-foreground flex items-center justify-center transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <X className="size-5" />
          </button>
          <img
            src={selectedImage}
            alt="Visualização ampliada"
            className="relative z-10 max-w-full max-h-screen-dvh rounded-lg object-contain cursor-default"
          />
        </div>
      )}
    </section>
  );
};