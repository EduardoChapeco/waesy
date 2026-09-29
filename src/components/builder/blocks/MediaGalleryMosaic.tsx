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
    xl: "rounded-xl",
    "2xl": "rounded-2xl",
    full: "rounded-3xl",
  }[styling?.borderRadius || "xl"];

  const customStyle: React.CSSProperties = {
    backgroundColor: styling?.backgroundColor || undefined,
    color: styling?.textColor || undefined,
  };

  const items = data.items && data.items.length > 0 ? data.items : [
    {
      id: "demo-1",
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
      title: "Design de Produto",
      caption: "Acabamento premium e ergonomia",
    },
    {
      id: "demo-2",
      imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
      title: "Tecnologia & Precisão",
      caption: "Materiais de alta durabilidade",
    },
    {
      id: "demo-3",
      imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
      title: "Som Acústico",
      caption: "Pureza sonora em cada detalhe",
    },
    {
      id: "demo-4",
      imageUrl: "https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=800&q=80",
      title: "Estilo & Conforto",
      caption: "Feito para o uso diário",
    },
  ];

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

        {/* Grade Mosaico Dinâmica */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {items.map((item, index) => {
            const isFeatured = index === 0;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedImage(item.imageUrl)}
                className={`group relative overflow-hidden ${radiusClass} border border-border/60 bg-muted/20 cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-foreground/20 ${
                  isFeatured ? "sm:col-span-2 lg:col-span-2 aspect-[16/10]" : "aspect-square"
                }`}
              >
                <img
                  src={item.imageUrl}
                  alt={item.title || "Imagem da galeria"}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5 text-white">
                  {item.title && (
                    <span className="text-base font-bold tracking-tight">{item.title}</span>
                  )}
                  {item.caption && (
                    <span className="text-xs text-white/80 mt-1">{item.caption}</span>
                  )}
                  <div className="absolute top-4 right-4 size-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/90">
                    <ZoomIn className="size-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-6 right-6 size-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="size-5" />
          </button>
          <img
            src={selectedImage}
            alt="Visualização ampliada"
            className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </section>
  );
};
