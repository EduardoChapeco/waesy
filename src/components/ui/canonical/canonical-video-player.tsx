/**
 * CanonicalVideoPlayer.tsx — Reprodutor Canônico Inteligente de Mídia e Vídeo
 *
 * Suporta múltiplos gatilhos de reprodução:
 * - "immediate" (autoplay mudo imediato)
 * - "in_viewport" (toca quando entra no campo de visão e pausa ao sair)
 * - "hover" (toca ao passar o mouse por cima e pausa ao sair)
 * - "delayed" (inicia após X segundos ou minutos de visualização)
 * - "click" (inicia sob demanda via clique)
 *
 * Conforme Regras B.4, B.28 e B.33 (Sem drift de layout, proporções fixas, WCAG 2.2 AA).
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type VideoTriggerMode = "immediate" | "in_viewport" | "hover" | "delayed" | "click";
export type VideoAspectRatio = "16:9" | "9:16" | "4:3" | "1:1" | "21:9" | "auto";

export interface CanonicalVideoPlayerProps {
  src: string;
  poster?: string | null;
  title?: string;
  trigger?: VideoTriggerMode;
  delaySeconds?: number;
  aspectRatio?: VideoAspectRatio;
  loop?: boolean;
  muted?: boolean;
  showControls?: boolean;
  className?: string;
  onEnded?: () => void;
}

export function CanonicalVideoPlayer({
  src,
  poster,
  title = "Vídeo",
  trigger = "in_viewport",
  delaySeconds = 0,
  aspectRatio = "16:9",
  loop = true,
  muted: initialMuted = true,
  showControls = true,
  className,
  onEnded,
}: CanonicalVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [progress, setProgress] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Helper para YouTube / Vimeo
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

  const ytId = getYouTubeId(src);
  const vimeoId = getVimeoId(src);
  const isEmbed = Boolean(ytId || vimeoId);

  // Proporções sem layout shift
  const aspectClassMap: Record<VideoAspectRatio, string> = {
    "16:9": "aspect-video",
    "9:16": "aspect-9/16 max-w-sm mx-auto",
    "4:3": "aspect-4/3",
    "1:1": "aspect-square max-w-md mx-auto",
    "21:9": "aspect-21/9",
    "auto": "aspect-video",
  };

  const safePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || isEmbed) return;
    try {
      video.muted = isMuted;
      await video.play();
      setIsPlaying(true);
    } catch {
      // Fallback para navegador bloqueando autoplay: força mudo e tenta novamente
      try {
        video.muted = true;
        setIsMuted(true);
        await video.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  }, [isMuted, isEmbed]);

  const safePause = useCallback(() => {
    const video = videoRef.current;
    if (!video || isEmbed) return;
    video.pause();
    setIsPlaying(false);
  }, [isEmbed]);

  // ── Gatilho 1: In Viewport (IntersectionObserver) ──
  useEffect(() => {
    if (trigger !== "in_viewport" || isEmbed) return;
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            safePlay();
          } else {
            safePause();
          }
        });
      },
      { threshold: 0.45 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [trigger, isEmbed, safePlay, safePause]);

  // ── Gatilho 2: Immediate (Autoplay Imediato) ──
  useEffect(() => {
    if (trigger === "immediate" && !isEmbed) {
      safePlay();
    }
  }, [trigger, isEmbed, safePlay]);

  // ── Gatilho 3: Delayed (Temporizado após X segundos/minutos) ──
  useEffect(() => {
    if (trigger !== "delayed" || isEmbed || delaySeconds <= 0) return;
    const timer = setTimeout(() => {
      safePlay();
    }, delaySeconds * 1000);

    return () => clearTimeout(timer);
  }, [trigger, delaySeconds, isEmbed, safePlay]);

  // Tratamento de hover
  const handleMouseEnter = () => {
    if (trigger === "hover" && !isEmbed) {
      safePlay();
    }
  };

  const handleMouseLeave = () => {
    if (trigger === "hover" && !isEmbed) {
      safePause();
    }
  };

  // Toggle Play / Pause Manual
  const handleTogglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setHasInteracted(true);
    if (isPlaying) {
      safePause();
    } else {
      safePlay();
    }
  };

  // Toggle Mute / Unmute
  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  // Atualização de progresso
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setProgress((video.currentTime / video.duration) * 100);
  };

  if (isEmbed) {
    const embedUrl = ytId
      ? `https://www.youtube.com/embed/${ytId}?autoplay=${trigger === "immediate" ? 1 : 0}&loop=${loop ? 1 : 0}&playlist=${ytId}&mute=1`
      : `https://player.vimeo.com/video/${vimeoId}?autoplay=${trigger === "immediate" ? 1 : 0}&loop=${loop ? 1 : 0}&muted=1`;

    return (
      <div
        ref={containerRef}
        className={cn(
          "relative overflow-hidden rounded-2xl bg-neutral-950 border border-border/60",
          aspectClassMap[aspectRatio],
          className
        )}
      >
        <iframe
          src={embedUrl}
          className="absolute inset-0 size-full border-0 rounded-2xl"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleTogglePlay}
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-neutral-950 border border-border/60 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        aspectClassMap[aspectRatio],
        className
      )}
      tabIndex={0}
      role="region"
      aria-label={`Reprodutor de vídeo: ${title}`}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          handleTogglePlay();
        }
      }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        loop={loop}
        muted={isMuted}
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onEnded={onEnded}
        className="size-full object-cover rounded-2xl"
      />

      {/* Botão de Play central quando pausado */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-950/40 backdrop-blur-xs transition-opacity">
          <div className="size-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-transform group-hover:scale-105">
            <Play className="size-6 ml-1" fill="currentColor" />
          </div>
        </div>
      )}

      {/* Controles Flutuantes Inferiores */}
      {showControls && (
        <div className="absolute bottom-0 inset-x-0 p-3 bg-linear-to-t from-neutral-950/80 via-neutral-950/40 to-transparent flex items-center justify-between gap-3 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="size-11 min-h-11 min-w-11 rounded-full bg-background/40 hover:bg-background/60 text-primary-foreground flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={isPlaying ? "Pausar" : "Reproduzir"}
            >
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 ml-1" fill="currentColor" />}
            </button>

            <button
              type="button"
              onClick={handleToggleMute}
              className="size-11 min-h-11 min-w-11 rounded-full bg-background/40 hover:bg-background/60 text-primary-foreground flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={isMuted ? "Ativar som" : "Desativar som"}
            >
              {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
          </div>

          {/* Barra de Progresso em Linha Fina */}
          <div className="flex-1 h-1 bg-primary-foreground/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
