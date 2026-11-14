import { useState, useEffect, useRef } from "react";
import { X, Volume2, VolumeX, Play, Pause, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EventStoryViewerModalProps {
  open: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType?: "image" | "video";
  eventTitle: string;
  eventDate?: string | null;
}

export function EventStoryViewerModal({
  open,
  onClose,
  mediaUrl,
  mediaType = "image",
  eventTitle,
  eventDate,
}: EventStoryViewerModalProps) {
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) {
      setProgress(0);
      setIsPaused(false);
      return;
    }

    if (mediaType === "video") return;

    // Progress timer for images (7 seconds duration)
    const durationMs = 7000;
    const intervalMs = 50;
    const step = (intervalMs / durationMs) * 100;

    const timer = setInterval(() => {
      if (!isPaused) {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            onClose();
            return 100;
          }
          return prev + step;
        });
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [open, isPaused, mediaType, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Story do evento: ${eventTitle}`}
      className="fixed inset-0 z-50 bg-neutral-950 text-neutral-50 flex items-center justify-center select-none"
    >
      {/* 9:16 Container */}
      <div className="relative w-full h-full max-w-md max-h-dvh aspect-9/16 bg-neutral-950 overflow-hidden flex flex-col justify-between">
        {/* Progress Bar & Top Header */}
        <div className="absolute top-0 inset-x-0 z-30 pt-safe px-4 pt-3 pb-6 bg-neutral-950/70 space-y-2">
          {/* Progress Bar */}
          <div className="w-full h-1 bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-neutral-50 transition-colors duration-200 duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Top Controls */}
          <div className="flex items-center justify-between gap-2 text-neutral-50">
            <div className="flex items-center gap-2 overflow-hidden">
              <button
                type="button"
                onClick={onClose}
                className="size-11 rounded-full bg-neutral-900 hover:bg-neutral-800 flex items-center justify-center text-neutral-50 border border-neutral-700 active:scale-95 transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Fechar Story"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div className="truncate">
                <p className="text-xs font-bold text-neutral-50 truncate">{eventTitle}</p>
                {eventDate && <p className="text-2xs text-neutral-300">{eventDate}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {mediaType === "video" && (
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="size-11 rounded-full bg-neutral-900 hover:bg-neutral-800 flex items-center justify-center text-neutral-50 border border-neutral-700 active:scale-95 transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={isMuted ? "Ativar som" : "Desativar som"}
                >
                  {isMuted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="size-11 rounded-full bg-neutral-900 hover:bg-neutral-800 flex items-center justify-center text-neutral-50 border border-neutral-700 active:scale-95 transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Fechar"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Media Player */}
        <div
          className="relative flex-1 w-full h-full flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={() => setIsPaused(!isPaused)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsPaused(!isPaused);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={isPaused ? "Retomar reprodução" : "Pausar reprodução"}
        >
          {mediaType === "video" ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              autoPlay
              playsInline
              muted={isMuted}
              loop={false}
              onTimeUpdate={(e) => {
                const target = e.currentTarget;
                if (target.duration) {
                  setProgress((target.currentTime / target.duration) * 100);
                }
              }}
              onEnded={onClose}
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={mediaUrl}
              alt={eventTitle}
              className="w-full h-full object-cover"
            />
          )}

          {/* Pause overlay icon */}
          {isPaused && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-950/40 pointer-events-none">
              <div className="size-16 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-50 flex items-center justify-center">
                <Play className="size-8 ml-1" />
              </div>
            </div>
          )}
        </div>

        {/* Bottom CTA / Action */}
        <div className="absolute bottom-0 inset-x-0 z-30 pb-safe px-4 pb-4 pt-8 bg-neutral-950/70 flex items-center justify-center">
          <Button
            type="button"
            onClick={onClose}
            className="w-full h-11 min-h-11 rounded-xl font-bold bg-neutral-50 text-neutral-950 hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ver Detalhes do Evento
          </Button>
        </div>
      </div>
    </div>
  );
}

export default EventStoryViewerModal;
