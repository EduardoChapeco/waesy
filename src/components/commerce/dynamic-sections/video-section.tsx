import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Play, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CanonicalVideoPlayer, type VideoTriggerMode } from "@/components/ui/canonical/canonical-video-player";

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
    trigger?: VideoTriggerMode;
    delay_seconds?: number;
    loop?: boolean;
    aspect_ratio?: "16:9" | "9:16" | "4:3" | "1:1" | "video";
    button_text?: string;
    button_link?: string;
  };
  badge?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  video_url?: string;
  videoUrl?: string;
  media_url?: string;
  auto_play?: boolean;
  trigger?: VideoTriggerMode;
  delay_seconds?: number;
  loop?: boolean;
  aspect_ratio?: "16:9" | "9:16" | "4:3" | "1:1" | "video";
  button_text?: string;
  button_link?: string;
  design_tokens?: any;
}

export function VideoSection({
  content,
  badge: topBadge,
  title: topTitle,
  subtitle: topSubtitle,
  description: topDescription,
  video_url: topVideoUrl,
  videoUrl: topVideoUrlCamel,
  media_url: topMediaUrl,
  auto_play: topAutoPlay,
  trigger: topTrigger,
  delay_seconds: topDelaySeconds,
  loop: topLoop,
  aspect_ratio: topAspectRatio,
  button_text: topButtonText,
  button_link: topButtonLink,
  design_tokens,
}: VideoSectionProps) {
  const videoUrl =
    topVideoUrl ||
    topVideoUrlCamel ||
    topMediaUrl ||
    content?.video_url ||
    content?.videoUrl ||
    content?.media_url ||
    "";
  const badge = topBadge ?? content?.badge ?? "";
  const title = topTitle ?? content?.title ?? "";
  const subtitle = topSubtitle ?? content?.subtitle ?? "";
  const description = topDescription ?? content?.description ?? "";
  const autoPlay = Boolean(topAutoPlay ?? content?.auto_play);
  const triggerMode = (topTrigger || content?.trigger || (autoPlay ? "immediate" : "in_viewport")) as VideoTriggerMode;
  const delaySec = topDelaySeconds ?? content?.delay_seconds ?? 0;
  const loop = (topLoop ?? content?.loop) !== false;
  const aspectRatio = topAspectRatio || content?.aspect_ratio || "16:9";
  const buttonText = topButtonText ?? content?.button_text ?? "";
  const buttonLink = topButtonLink ?? content?.button_link ?? "";

  const aspectClass =
    aspectRatio === "9:16"
      ? "aspect-square sm:aspect-video max-w-sm mx-auto"
      : aspectRatio === "1:1"
      ? "aspect-square max-w-2xl mx-auto"
      : aspectRatio === "4:3"
      ? "aspect-video max-w-3xl mx-auto"
      : "aspect-video w-full";

  const renderVideoPlayer = () => {
    if (!videoUrl) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/30 border border-border/40 text-muted-foreground p-6 text-center rounded-lg">
          <Play className="size-10 mb-2 text-primary/70" />
          <p className="text-xs font-semibold text-foreground">
            Nenhum vídeo configurado
          </p>
          <span className="text-xs text-muted-foreground mt-1 max-w-xs break-all">
            Adicione um arquivo de vídeo (MP4, WebM) ou link do YouTube/Vimeo nas configurações
          </span>
        </div>
      );
    }

    return (
      <CanonicalVideoPlayer
        src={videoUrl}
        title={title || "Vídeo da Seção"}
        trigger={triggerMode}
        delaySeconds={delaySec}
        aspectRatio={aspectRatio === "video" ? "16:9" : (aspectRatio as any)}
        loop={loop}
        muted={autoPlay}
        showControls={true}
        className="size-full border-0 rounded-lg"
      />
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
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
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

        <div className={cn("relative overflow-hidden bg-card rounded-lg shadow-xs border border-border/40", aspectClass)}>
          {renderVideoPlayer()}
        </div>

        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto whitespace-pre-wrap">
            {description}
          </p>
        )}

        {buttonText && (
          <div className="pt-2">
            <Button asChild size="lg" className="rounded-lg h-11 min-h-11 px-6 font-bold text-xs gap-2">
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
