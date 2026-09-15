import React from "react";
import type { EscamasSlide, StudioBrandProfile } from "@/types/studio-machine";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

interface SlideRendererEscamasProps {
  slide: EscamasSlide;
  brand: StudioBrandProfile;
  scale?: number;
  onLayerSelect?: (layerId: string) => void;
  selectedLayerId?: string | null;
  className?: string;
}

export const SlideRendererEscamas: React.FC<SlideRendererEscamasProps> = ({
  slide,
  brand,
  scale = 1,
  onLayerSelect,
  selectedLayerId,
  className = "",
}) => {
  if (!slide || !brand) return null;

  const bgOpacity = slide.background_opacity ?? 1;

  // Dimensão canônica de carrossel de alto padrão (Instagram 4:5 1080x1350)
  const artboardStyle: React.CSSProperties = {
    width: 1080,
    height: 1350,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    backgroundColor: brand.primaryColor || "#090d16",
    position: "relative",
    overflow: "hidden",
  };

  return (
    <div
      style={artboardStyle}
      className={`select-none font-sans relative shadow-2xl ${className}`}
      data-slide-id={slide.id}
    >
      {/* CAMADA 0: FUNDO BASE COM AMBIÊNCIA */}
      <div className="absolute inset-0 z-0 bg-black overflow-hidden">
        {slide.background_url ? (
          <img
            src={slide.background_url}
            className="w-full h-full object-cover transition-opacity duration-700"
            style={{ opacity: bgOpacity }}
            alt="Fundo Editorial"
            crossOrigin="anonymous"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(135deg, ${brand.primaryColor || "#0B1120"} 0%, #030712 100%)`,
            }}
          />
        )}

        {/* Gradiente de Vinheta & Iluminação Cinemática */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 25%, ${brand.secondaryColor || "#38bdf8"}18 0%, transparent 75%), linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.7) 100%)`,
          }}
        />
      </div>

      {/* CABEÇALHO EDITORIAL / BRANDING SUPERIOR */}
      <div className="absolute top-16 left-16 right-16 z-40 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {brand.logoUrl ? (
            <img
              src={brand.logoUrl}
              className="h-12 w-12 rounded-xl object-contain bg-white/10 p-1 border border-white/20"
              alt="Logo"
              crossOrigin="anonymous"
            />
          ) : (
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center font-black text-2xl text-black border border-white/20 shadow-lg"
              style={{ backgroundColor: brand.secondaryColor || "#38bdf8" }}
            >
              {brand.logoLetter || "W"}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-white font-extrabold text-xl tracking-wider uppercase">
              {brand.name}
            </span>
            <span
              className="text-sm font-semibold tracking-wide"
              style={{ color: brand.secondaryColor || "#38bdf8" }}
            >
              {brand.handle}
            </span>
          </div>
        </div>

        {/* Badge do Slide ou Kicker */}
        {slide.text_content.badge ? (
          <div
            className="px-5 py-2 rounded-full border text-sm font-bold tracking-widest uppercase flex items-center gap-2 backdrop-blur-md"
            style={{
              borderColor: `${brand.secondaryColor || "#38bdf8"}40`,
              backgroundColor: `${brand.secondaryColor || "#38bdf8"}15`,
              color: brand.secondaryColor || "#38bdf8",
            }}
          >
            <Sparkles className="w-4 h-4" />
            <span>{slide.text_content.badge}</span>
          </div>
        ) : (
          <div className="px-4 py-2 rounded-full bg-white/10 border border-white/15 text-xs font-mono font-bold tracking-widest text-slate-300">
            {slide.slide_number} / 5
          </div>
        )}
      </div>

      {/* SISTEMA ESCAMAS: CAMADAS DINÂMICAS INTERATIVAS (Z-INDEX 1 a 8) */}
      {(slide.layers || [])
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((layer) => {
          const isSelected = selectedLayerId === layer.id;
          return (
            <div
              key={layer.id}
              onClick={(e) => {
                e.stopPropagation();
                onLayerSelect?.(layer.id);
              }}
              className={`absolute cursor-pointer transition-all ${
                isSelected ? "ring-4 ring-sky-400 shadow-2xl z-50 scale-105" : ""
              }`}
              style={{
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                width: `${layer.scale * 100}%`,
                transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                opacity: layer.opacity,
                zIndex: layer.zIndex + 10,
              }}
            >
              {layer.url ? (
                <img
                  src={layer.url}
                  className="w-full h-auto pointer-events-none drop-shadow-2xl"
                  alt={layer.type}
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-full h-32 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-white/50 text-xs font-mono uppercase">
                  {layer.type}
                </div>
              )}
            </div>
          );
        })}

      {/* CAMADA TIPOGRÁFICA PRINCIPAL: HEADLINE & CORPO */}
      <div className="absolute inset-0 z-30 flex flex-col justify-end p-20 pb-28 pointer-events-none">
        {slide.text_content.kicker && (
          <div
            className="mb-4 text-xl font-bold tracking-widest uppercase flex items-center gap-2"
            style={{ color: brand.secondaryColor || "#38bdf8" }}
          >
            <span className="w-6 h-1 rounded-full bg-current" />
            <span>{slide.text_content.kicker}</span>
          </div>
        )}

        {slide.text_content.headline && (
          <h2
            className="text-white font-black tracking-tight leading-[0.98] uppercase text-balance"
            style={{
              fontFamily: brand.fontHeading || "Inter, sans-serif",
              fontSize:
                slide.text_content.headline.length > 60
                  ? "4.5rem"
                  : slide.text_content.headline.length > 35
                    ? "5.5rem"
                    : "6.8rem",
              textShadow: "0 10px 30px rgba(0,0,0,0.85)",
            }}
          >
            {slide.text_content.headline}
          </h2>
        )}

        {slide.text_content.body && (
          <p
            className="mt-8 text-slate-200 text-3xl leading-snug font-medium max-w-4xl"
            style={{
              fontFamily: brand.fontBody || "Inter, sans-serif",
              textShadow: "0 4px 16px rgba(0,0,0,0.7)",
            }}
          >
            {slide.text_content.body}
          </p>
        )}

        {/* CTA NO SLIDE FINAL */}
        {slide.text_content.cta_text && (
          <div className="mt-12 flex items-center gap-4">
            <div
              className="px-8 py-4 rounded-2xl text-slate-950 font-black text-2xl flex items-center gap-3 shadow-2xl tracking-wide uppercase pointer-events-auto"
              style={{ backgroundColor: brand.secondaryColor || "#38bdf8" }}
            >
              <span>{slide.text_content.cta_text}</span>
              <ArrowRight className="w-6 h-6" />
            </div>
            <span className="text-white/60 text-lg font-medium">
              Acesse pelo portal ou link na bio
            </span>
          </div>
        )}
      </div>

      {/* RODAPÉ EDITORIAL / INDICADOR DE ROLAGEM */}
      <div className="absolute bottom-12 left-16 right-16 z-40 flex items-center justify-between border-t border-white/15 pt-6 text-white/60 text-sm font-semibold tracking-wider uppercase">
        <span>Publicação Oficial • Transparência Waesy</span>
        <div className="flex items-center gap-2">
          <span>Arraste para o lado</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>

      {/* OVERLAY DE PROCESSAMENTO / ESCULPINDO CAMADAS */}
      {slide.isLoading && (
        <div className="absolute inset-0 z-[100] bg-black/75 backdrop-blur-md flex flex-col items-center justify-center text-white">
          <div
            className="w-20 h-20 border-4 border-t-transparent rounded-full animate-spin mb-6"
            style={{ borderColor: brand.secondaryColor || "#38bdf8", borderTopColor: "transparent" }}
          />
          <p className="font-black uppercase tracking-[0.3em] text-lg">
            Sintetizando 8 Camadas Escamas...
          </p>
          <p className="text-xs text-slate-400 mt-2 font-mono">
            Isolamento de DNA, Tipografia & Composição
          </p>
        </div>
      )}
    </div>
  );
};
