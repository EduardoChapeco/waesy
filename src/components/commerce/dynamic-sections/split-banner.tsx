import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Star, ArrowRight } from "lucide-react";

interface SplitBannerProps {
  node_id?: string;
  block_type?: string;
  content?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    description?: string;
    button_text?: string;
    buttonText?: string;
    button_link?: string;
    buttonLink?: string;
    secondary_button_text?: string;
    secondary_button_link?: string;
    media_url?: string;
    image_url?: string;
    imageUrl?: string;
    video_url?: string;
    media_position?: "left" | "right";
    image_position?: "left" | "right";
    imagePosition?: "left" | "right";
    auto_play?: boolean;
    loop?: boolean;
  };
  design_tokens?: any;
}

export function SplitBanner({ content, design_tokens }: SplitBannerProps) {
  const mediaUrl =
    content?.media_url ||
    content?.image_url ||
    content?.imageUrl ||
    content?.video_url ||
    "";

  const position =
    content?.media_position ||
    content?.image_position ||
    content?.imagePosition ||
    "left";
  const isMediaLeft = position === "left";

  const badge = content?.badge || "";
  const title = content?.title || "";
  const subtitle = content?.subtitle || "";
  const description = content?.description || "";

  const primaryBtnText = content?.button_text || content?.buttonText || "";
  const primaryBtnLink = content?.button_link || content?.buttonLink || "";

  const secondaryBtnText = content?.secondary_button_text || "";
  const secondaryBtnLink = content?.secondary_button_link || "";

  const autoPlay = content?.auto_play !== false;
  const loop = content?.loop !== false;

  // Helpers to detect video sources
  const isVideoFile = mediaUrl
    ? !!mediaUrl.split("?")[0].match(/\.(mp4|webm|mov|ogg)$/i)
    : false;

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const getVimeoId = (url: string) => {
    const regExp = /vimeo\.com\/(?:video\/)?([0-9]+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  const ytId = mediaUrl ? getYouTubeId(mediaUrl) : null;
  const vimeoId = mediaUrl ? getVimeoId(mediaUrl) : null;

  const renderMedia = () => {
    if (!mediaUrl) {
      return (
        <div className="w-full min-h-[320px] h-full flex flex-col items-center justify-center p-8 text-center bg-muted/30 border border-border/40 rounded-2xl">
          <Star className="size-8 text-muted-foreground/40 mb-2" />
          <span className="text-xs font-semibold text-muted-foreground">
            Mídia não configurada
          </span>
          <span className="text-[10px] text-muted-foreground/80 mt-1 max-w-xs">
            Faça upload de imagem, GIF ou vídeo nas configurações da seção
          </span>
        </div>
      );
    }

    if (ytId) {
      return (
        <div className="relative w-full h-full min-h-[340px] rounded-2xl overflow-hidden shadow-2xs">
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=${autoPlay ? 1 : 0}&loop=${loop ? 1 : 0}&playlist=${ytId}&mute=1`}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title || "Vídeo"}
          />
        </div>
      );
    }

    if (vimeoId) {
      return (
        <div className="relative w-full h-full min-h-[340px] rounded-2xl overflow-hidden shadow-2xs">
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}?autoplay=${autoPlay ? 1 : 0}&loop=${loop ? 1 : 0}&muted=1`}
            className="absolute inset-0 w-full h-full border-0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={title || "Vídeo"}
          />
        </div>
      );
    }

    if (isVideoFile) {
      return (
        <div className="relative w-full h-full min-h-[340px] rounded-2xl overflow-hidden bg-black/90 shadow-2xs group">
          <video
            src={mediaUrl}
            autoPlay={autoPlay}
            loop={loop}
            muted
            playsInline
            controls
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    // Default: Imagem de alta resolução ou GIF animado
    return (
      <div className="relative w-full h-full min-h-[340px] rounded-2xl overflow-hidden bg-muted/20 shadow-2xs">
        <img
          src={mediaUrl}
          alt={title || "Banner promocional"}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
        />
      </div>
    );
  };

  return (
    <section
      className={cn("w-full py-8 md:py-16 px-4 sm:px-6", design_tokens?.className)}
      style={{
        backgroundColor: design_tokens?.backgroundColor,
        color: design_tokens?.textColor,
      }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          {/* Mídia (Esquerda ou Direita) */}
          <div
            className={cn(
              "w-full h-full flex items-center justify-center min-h-[320px] md:min-h-[440px]",
              isMediaLeft ? "md:order-1" : "md:order-2",
            )}
          >
            {renderMedia()}
          </div>

          {/* Bloco de Conteúdo */}
          <div
            className={cn(
              "flex flex-col justify-center space-y-4 md:space-y-6",
              isMediaLeft ? "md:order-2" : "md:order-1",
            )}
          >
            {badge && (
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  <Star className="size-3" />
                  {badge}
                </span>
              </div>
            )}

            {title && (
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                {title}
              </h2>
            )}

            {subtitle && (
              <p className="text-base sm:text-lg font-medium text-foreground/80 leading-relaxed">
                {subtitle}
              </p>
            )}

            {description && (
              <div className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {description}
              </div>
            )}

            {(primaryBtnText || secondaryBtnText) && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {primaryBtnText && (
                  <Button
                    asChild
                    size="lg"
                    className="h-11 sm:h-12 px-6 rounded-xl font-bold text-xs sm:text-sm bg-foreground text-background hover:bg-foreground/90 gap-2 shadow-xs cursor-pointer"
                  >
                    <Link to={primaryBtnLink || "/explorar"}>
                      <span>{primaryBtnText}</span>
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                )}

                {secondaryBtnText && (
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-11 sm:h-12 px-6 rounded-xl font-semibold text-xs sm:text-sm border-border/80 hover:bg-muted text-foreground cursor-pointer"
                  >
                    <Link to={secondaryBtnLink || "/produtos"}>
                      <span>{secondaryBtnText}</span>
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
