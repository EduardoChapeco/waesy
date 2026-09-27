import React, { useState, useEffect } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Download,
  FileText,
  Sparkles,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ExperienceMediaItem } from "@/lib/schemas/resume-experience.schema";

export interface ExperienceMediaCarouselProps {
  media?: (string | ExperienceMediaItem)[];
  mediaUrls?: string[]; // Para retrocompatibilidade
  className?: string;
  itemTitle?: string;
  companyName?: string;
}

/**
 * ── THE LINKEDIN-STYLE MEDIA ENGINE (Apple HIG & Visual Proof) ──
 * Trilho horizontal com física de rolagem snap-x, thumbnails 16:9 e Lightbox de alta fidelidade.
 */
export function ExperienceMediaCarousel({
  media,
  mediaUrls,
  className,
  itemTitle,
  companyName,
}: ExperienceMediaCarouselProps) {
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);

  // Normaliza itens de mídia (suporta strings puras ou objetos com tipo e título)
  const normalizedItems: ExperienceMediaItem[] = React.useMemo(() => {
    const rawList = media || mediaUrls || [];
    return rawList.map((item, idx) => {
      if (typeof item === "string") {
        const isPdf = item.toLowerCase().endsWith(".pdf");
        return {
          id: `med_${idx}`,
          url: item,
          title: isPdf ? "Documento Comprobatório (PDF)" : `Evidência de Projeto ${idx + 1}`,
          type: isPdf ? "pdf" : "image",
        };
      }
      return item;
    });
  }, [media, mediaUrls]);

  // Teclado: Navegação por setas e fechamento com ESC
  useEffect(() => {
    if (selectedMediaIndex === null) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedMediaIndex(null);
      } else if (e.key === "ArrowLeft") {
        setSelectedMediaIndex((prev) =>
          prev !== null ? (prev > 0 ? prev - 1 : normalizedItems.length - 1) : null
        );
      } else if (e.key === "ArrowRight") {
        setSelectedMediaIndex((prev) =>
          prev !== null ? (prev < normalizedItems.length - 1 ? prev + 1 : 0) : null
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedMediaIndex, normalizedItems.length]);

  if (!normalizedItems || normalizedItems.length === 0) {
    return null;
  }

  const activeItem =
    selectedMediaIndex !== null ? normalizedItems[selectedMediaIndex] : null;

  return (
    <>
      <div className={cn("pt-2 space-y-2", className)}>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          <span>Portfólio & Evidências Visuais ({normalizedItems.length})</span>
        </div>

        {/* Trilho Deslizante Snap (LinkedIn / Apple HIG Experience Rail) */}
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-2 pt-1 scroll-smooth">
          {normalizedItems.map((item, idx) => {
            const isPdf = item.type === "pdf" || item.url.toLowerCase().endsWith(".pdf");

            return (
              <div
                key={item.id || idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMediaIndex(idx);
                }}
                className="group relative shrink-0 w-44 sm:w-56 aspect-video rounded-2xl overflow-hidden border border-border/60 bg-muted/20 snap-start shadow-xs hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                {isPdf ? (
                  <div className="size-full flex flex-col items-center justify-center p-3 text-center bg-card">
                    <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                      <FileText className="size-5" />
                    </div>
                    <span className="text-[11px] font-bold text-foreground line-clamp-1">
                      {item.title || "Documento PDF"}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Certificado / Anexo
                    </span>
                  </div>
                ) : (
                  <>
                    <img
                      src={item.url}
                      alt={item.title || `${itemTitle || "Experiência"} - Mídia ${idx + 1}`}
                      className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                      <span className="text-[10px] font-medium text-white truncate flex items-center gap-1">
                        <Maximize2 className="size-3" />
                        {item.title || "Ver em alta resolução"}
                      </span>
                    </div>
                  </>
                )}

                {/* Badge indicador discreto */}
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[9px] font-mono text-white/90">
                  {idx + 1}/{normalizedItems.length}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── LIGHTBOX APPLE HIG DE ALTA RESOLUÇÃO ── */}
      {selectedMediaIndex !== null && activeItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedMediaIndex(null)}
        >
          {/* Header Superior Flutuante */}
          <div
            className="w-full max-w-5xl flex items-center justify-between text-white z-10 py-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-0.5 max-w-[70%]">
              <h4 className="text-sm sm:text-base font-bold truncate">
                {activeItem.title || itemTitle || "Evidência Profissional"}
              </h4>
              {companyName && (
                <p className="text-xs text-white/70 truncate">{companyName}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-white/70 mr-2">
                {selectedMediaIndex + 1} de {normalizedItems.length}
              </span>

              <Button
                asChild
                size="sm"
                variant="ghost"
                className="size-9 p-0 rounded-full text-white/80 hover:text-white hover:bg-white/10"
              >
                <a
                  href={activeItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  title="Abrir original / Baixar"
                >
                  <Download className="size-4" />
                </a>
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="size-9 p-0 rounded-full text-white/80 hover:text-white hover:bg-white/10"
                onClick={() => setSelectedMediaIndex(null)}
                title="Fechar (ESC)"
              >
                <X className="size-5" />
              </Button>
            </div>
          </div>

          {/* Área Central: Visualizador em Alta Definição */}
          <div
            className="relative flex-1 w-full max-w-5xl flex items-center justify-center p-2 my-auto select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botão Anterior */}
            {normalizedItems.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setSelectedMediaIndex((prev) =>
                    prev !== null ? (prev > 0 ? prev - 1 : normalizedItems.length - 1) : null
                  )
                }
                className="absolute left-2 sm:left-4 z-10 size-11 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 flex items-center justify-center transition-all cursor-pointer"
                title="Anterior (Seta Esquerda)"
              >
                <ChevronLeft className="size-6" />
              </button>
            )}

            {/* Conteúdo da Mídia */}
            {activeItem.type === "pdf" || activeItem.url.toLowerCase().endsWith(".pdf") ? (
              <div className="w-full max-w-2xl h-[65vh] rounded-2xl bg-card p-6 flex flex-col items-center justify-center text-center space-y-4 border border-border shadow-2xl">
                <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <FileText className="size-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-foreground">
                    {activeItem.title || "Documento PDF"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Certificado ou anexo de comprovação técnica
                  </p>
                </div>
                <Button asChild className="rounded-xl gap-2 font-bold">
                  <a href={activeItem.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" />
                    <span>Visualizar Documento Completo</span>
                  </a>
                </Button>
              </div>
            ) : (
              <img
                src={activeItem.url}
                alt={activeItem.title || "Visualização ampliada"}
                className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200"
              />
            )}

            {/* Botão Próximo */}
            {normalizedItems.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setSelectedMediaIndex((prev) =>
                    prev !== null ? (prev < normalizedItems.length - 1 ? prev + 1 : 0) : null
                  )
                }
                className="absolute right-2 sm:right-4 z-10 size-11 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 flex items-center justify-center transition-all cursor-pointer"
                title="Próximo (Seta Direita)"
              >
                <ChevronRight className="size-6" />
              </button>
            )}
          </div>

          {/* Rodapé Flutuante com Legenda e Indicadores */}
          <div
            className="w-full max-w-2xl text-center py-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {activeItem.description && (
              <p className="text-xs text-white/80 max-w-lg mx-auto mb-2 line-clamp-2">
                {activeItem.description}
              </p>
            )}

            {normalizedItems.length > 1 && (
              <div className="flex items-center justify-center gap-1.5">
                {normalizedItems.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    type="button"
                    onClick={() => setSelectedMediaIndex(dotIdx)}
                    className={cn(
                      "size-2 rounded-full transition-all cursor-pointer",
                      dotIdx === selectedMediaIndex
                        ? "bg-white w-5"
                        : "bg-white/30 hover:bg-white/60"
                    )}
                    aria-label={`Ir para mídia ${dotIdx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
