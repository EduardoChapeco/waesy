import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Play, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoSectionProps {
  content?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    description?: string;
    video_url?: string;
    videoUrl?: string;
    media_url?: string;
    auto_play?: boolean;
    loop?: boolean;
    aspect_ratio?: "16:9" | "9:16" | "4:3" | "1:1" | "video";
    button_text?: string;
    button_link?: string;
  };
  design_tokens?: any;
}

export function VideoSection({ content, design_tokens }: VideoSectionProps) {
  const videoUrl =
    content?.video_url || content?.videoUrl || content?.media_url || "";
  const badge = content?.badge || "";
  const title = content?.title || "";
  const subtitle = content?.subtitle || "";
  const description = content?.description || "";
  const autoPlay = Boolean(content?.auto_play);
  const loop = content?.loop !== false;
  const aspectRatio = content?.aspect_ratio || "16:9";
  const buttonText = content?.button_text || "";
  const buttonLink = content?.button_link || "";

  // Helper to extract YouTube ID
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  // Helper to extract Vimeo ID
  const getVimeoId = (url: string) => {
    const regExp = /vimeo\.com\/(?:video\/)?([0-9]+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  const ytId = videoUrl ? getYouTubeId(videoUrl) : null;
  const vimeoId = videoUrl ? getVimeoId(videoUrl) : null;
  const isMp4 = videoUrl
    ? !!videoUrl.split("?")[0].match(/\.(mp4|webm|mov|ogg)$/i)
    : false;

  const aspectClass =
    aspectRatio === "9:16"
      ? "aspect-[9/16] max-w-sm mx-auto"
      : aspectRatio === "1:1"
      ? "aspect-square max-w-2xl mx-auto"
      : aspectRatio === "4:3"
      ? "aspect-[4/3] max-w-3xl mx-auto"
      : "aspect-video w-full";

  const renderVideoPlayer = () => {
    if (ytId) {
      const embedUrl = `https://www.youtube.com/embed/${ytId}?autoplay=${autoPlay ? 1 : 0}&loop=${loop ? 1 : 0}&playlist=${ytId}&mute=${autoPlay ? 1 : 0}`;
      return (
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full border-0 rounded-2xl"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title || "YouTube Video"}
        />
      );
    }

    if (vimeoId) {
      const embedUrl = `https://player.vimeo.com/video/${vimeoId}?autoplay=${autoPlay ? 1 : 0}&loop=${loop ? 1 : 0}&muted=${autoPlay ? 1 : 0}`;
      return (
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full border-0 rounded-2xl"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={title || "Vimeo Video"}
        />
      );
    }

    if (isMp4) {
      return (
        <video
          src={videoUrl}
          autoPlay={autoPlay}
          loop={loop}
          muted={autoPlay}
          playsInline
          controls
          className="absolute inset-0 w-full h-full object-cover rounded-2xl"
        />
      );
    }

    // Fallback if URL is empty or invalid
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/30 border border-border/40 text-muted-foreground p-6 text-center rounded-2xl">
        <Play className="size-10 mb-2 text-primary/70" />
        <p className="text-xs font-semibold text-foreground">
          Nenhum vídeo configurado
        </p>
        <span className="text-[10px] text-muted-foreground mt-1 max-w-xs break-all">
          {videoUrl || "Adicione um arquivo de vídeo (MP4, WebM) ou link do YouTube/Vimeo nas configurações"}
        </span>
      </div>
    );
  };

  return (
    <section
      className={cn("w-full py-10 md:py-16 px-4 sm:px-6", design_tokens?.className)}
      style={{
        backgroundColor: design_tokens?.backgroundColor,
        color: design_tokens?.textColor,
      }}
    >
      <div className="max-w-5xl mx-auto space-y-6 text-center">
        {(badge || title || subtitle) && (
          <div className="space-y-3 max-w-2xl mx-auto">
            {badge && (
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  <Star className="size-3" />
                  {badge}
                </span>
              </div>
            )}
            {title && (
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm sm:text-base text-muted-foreground font-medium">
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div className={cn("relative overflow-hidden bg-black/90 rounded-2xl shadow-xs border border-border/40", aspectClass)}>
          {renderVideoPlayer()}
        </div>

        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto whitespace-pre-wrap">
            {description}
          </p>
        )}

        {buttonText && (
          <div className="pt-2">
            <Button asChild size="lg" className="rounded-xl h-11 px-6 font-bold text-xs gap-2">
              <Link to={buttonLink || "/explorar"}>
                <span>{buttonText}</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
