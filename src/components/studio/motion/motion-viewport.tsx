import { useState, useEffect, useRef, useMemo } from "react";
import { Play, Pause, RotateCcw, FastForward, Rewind, Zap, Layers, Film, Maximize2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  MotionStudioTemplateDefinition,
  MotionStudioSequence,
  MotionStudioRatio,
} from "./motion-templates";

type MotionViewportProps = {
  template: MotionStudioTemplateDefinition;
  values: Record<string, unknown>;
  sequences: MotionStudioSequence[];
  selectedSequenceId: string | null;
  onSelectSequence: (id: string | null) => void;
};

export function MotionStudioViewport({
  template,
  values,
  sequences,
  selectedSequenceId,
  onSelectSequence,
}: MotionViewportProps) {
  const durationInFrames = Math.max(90, Number(values.durationFrames) || template.defaultValues.durationFrames as number || 180);
  const ratio = (values.ratio as MotionStudioRatio) || "9:16";
  const accentColor = (values.accentColor as string) || template.accentColor || "#F97316";
  const captionsEnabled = Boolean(values.captionsEnabled);
  const showLogo = Boolean(values.showLogo ?? true);

  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Playback Loop at 30 FPS
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      lastTimeRef.current = null;
      return;
    }

    const frameDurationMs = 1000 / template.fps;

    const tick = (now: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
      }

      const elapsed = now - lastTimeRef.current;
      if (elapsed >= frameDurationMs) {
        const framesToAdd = Math.floor(elapsed / frameDurationMs);
        lastTimeRef.current = now - (elapsed % frameDurationMs);

        setCurrentFrame((prev) => {
          const next = prev + framesToAdd;
          if (next >= durationInFrames) {
            return 0; // Loop seamlessly
          }
          return next;
        });
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, durationInFrames, template.fps]);

  const stepFrame = (delta: number) => {
    setIsPlaying(false);
    setCurrentFrame((prev) => Math.max(0, Math.min(durationInFrames - 1, prev + delta)));
  };

  const jumpToFrame = (frame: number) => {
    setIsPlaying(false);
    setCurrentFrame(Math.max(0, Math.min(durationInFrames - 1, frame)));
  };

  // Active Sequences at currentFrame
  const activeSequences = useMemo(() => {
    return sequences.filter((seq) => {
      const local = currentFrame - seq.startFrame;
      return local >= 0 && local < seq.durationInFrames;
    });
  }, [sequences, currentFrame]);

  // Tracks for the timeline
  const tracks = useMemo(() => {
    const unique = Array.from(new Set(sequences.map((s) => s.track))).sort((a, b) => a - b);
    return unique.length > 0 ? unique : [0, 1];
  }, [sequences]);

  // Playhead percentage
  const playheadPercent = durationInFrames > 0 ? (currentFrame / durationInFrames) * 100 : 0;

  // Aspect ratio dimensions for preview canvas
  const canvasStyle = useMemo(() => {
    if (ratio === "9:16") {
      return { width: "300px", height: "533px" };
    }
    if (ratio === "16:9") {
      return { width: "560px", height: "315px" };
    }
    return { width: "400px", height: "400px" };
  }, [ratio]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 overflow-hidden select-none">
      {/* Viewport Top Bar */}
      <div className="h-10 px-4 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400 shrink-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] border-zinc-700 bg-zinc-800/40 text-zinc-300 font-mono">
            {ratio}
          </Badge>
          <span className="font-mono text-[11px] text-zinc-300">
            {currentFrame.toString().padStart(3, "0")}f / {durationInFrames}f
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">
            ({(currentFrame / template.fps).toFixed(1)}s / {(durationInFrames / template.fps).toFixed(1)}s)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] bg-zinc-800 text-zinc-300 border-zinc-700">
            {template.label}
          </Badge>
          <span className="text-[10px] text-zinc-500 font-mono">30 FPS</span>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0 overflow-auto bg-gradient-to-b from-zinc-950 to-zinc-900/50">
        <div
          className="relative rounded-lg shadow-2xl border border-zinc-800 overflow-hidden flex flex-col transition-all duration-300"
          style={{
            ...canvasStyle,
            background: `radial-gradient(circle at top right, ${accentColor}28, transparent 50%), linear-gradient(145deg, #090a0f 0%, #11141e 60%, #060709 100%)`,
          }}
        >
          {/* Subtle Grid / Texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-15"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          />

          {/* Brand Badge / Eyebrow (Track 1) */}
          {activeSequences
            .filter((s) => s.kind === "badge")
            .map((badgeSeq) => {
              const localFrame = currentFrame - badgeSeq.startFrame;
              const enter = Math.min(1, Math.max(0, localFrame / 10));
              const exit = localFrame >= badgeSeq.durationInFrames - 8
                ? Math.max(0, (badgeSeq.durationInFrames - localFrame) / 8)
                : 1;
              const opacity = enter * exit;

              return (
                <div
                  key={badgeSeq.id}
                  className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none transition-all"
                  style={{ opacity }}
                >
                  <div className="rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-md">
                    {badgeSeq.eyebrow || "Waesy Motion"}
                  </div>
                  {badgeSeq.accentText && (
                    <div
                      className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-black shadow-sm"
                      style={{ backgroundColor: accentColor }}
                    >
                      {badgeSeq.accentText}
                    </div>
                  )}
                </div>
              );
            })}

          {/* Store Logo Chip (if enabled) */}
          {showLogo && (
            <div className="absolute top-4 right-4 z-10 pointer-events-none flex items-center gap-2 px-3 py-1 rounded-full bg-black/30 border border-white/10 backdrop-blur-md text-[10px] font-semibold text-white/80">
              <Zap className="size-3 text-amber-400" />
              <span>Waesy Loja</span>
            </div>
          )}

          {/* Active Content Sequences (Track 0) */}
          <div className="flex-1 flex flex-col justify-center px-6 py-12 relative z-10 pointer-events-none">
            {activeSequences
              .filter((s) => s.kind !== "badge")
              .map((seq) => {
                const localFrame = currentFrame - seq.startFrame;
                const enter = Math.min(1, Math.max(0, localFrame / 10));
                const exit = localFrame >= seq.durationInFrames - 8
                  ? Math.max(0, (seq.durationInFrames - localFrame) / 8)
                  : 1;
                const opacity = enter * exit;
                const translateY = (1 - enter) * 24;
                const scale = 0.95 + enter * 0.05;

                return (
                  <div
                    key={seq.id}
                    className="rounded-lg border border-white/15 bg-black/50 p-5 shadow-2xl backdrop-blur-xl transition-all space-y-3"
                    style={{
                      opacity,
                      transform: `translateY(${translateY}px) scale(${scale})`,
                    }}
                  >
                    {seq.eyebrow && (
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                        {seq.eyebrow}
                      </p>
                    )}

                    {seq.headline && (
                      <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-snug">
                        {seq.headline}
                      </h3>
                    )}

                    {seq.body && (
                      <p className="text-xs text-white/80 leading-relaxed">
                        {seq.body}
                      </p>
                    )}

                    {/* Metric / Accent Tag */}
                    {seq.accentText && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/10 border border-white/15 text-[11px] font-semibold text-white">
                        <span className="size-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                        <span>{seq.accentText}</span>
                      </div>
                    )}

                    {/* CTA Button */}
                    {seq.ctaLabel && (
                      <div className="pt-2">
                        <button
                          type="button"
                          className="w-full py-3 px-4 rounded-lg font-bold text-xs text-black shadow-lg flex items-center justify-center gap-2"
                          style={{ backgroundColor: accentColor }}
                        >
                          <span>{seq.ctaLabel}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {/* Captions Strip (Optional) */}
          {captionsEnabled && (
            <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none">
              <div className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-center text-[10px] text-white/90 backdrop-blur-md truncate">
                {activeSequences[0]?.body || activeSequences[0]?.headline || "Waesy Motion Studio"}
              </div>
            </div>
          )}

          {/* Live Watermark / Footer */}
          <div className="absolute bottom-2 left-4 z-10 pointer-events-none text-[9px] font-mono uppercase text-white/30 tracking-widest">
            {template.id} • 4K Engine
          </div>
        </div>
      </div>

      {/* Scrub & Playback Controls */}
      <div className="h-12 border-t border-zinc-800 bg-zinc-900/80 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => jumpToFrame(0)}
            className="size-8 text-zinc-400 hover:text-white rounded-lg"
            title="Voltar ao início"
          >
            <RotateCcw className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => stepFrame(-15)}
            className="size-8 text-zinc-400 hover:text-white rounded-lg"
            title="Voltar 15 frames"
          >
            <Rewind className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="default"
            onClick={() => setIsPlaying(!isPlaying)}
            className="size-8 rounded-lg font-bold"
            style={{ backgroundColor: accentColor, color: "#000" }}
            title={isPlaying ? "Pausar" : "Reproduzir"}
          >
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 fill-current" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => stepFrame(15)}
            className="size-8 text-zinc-400 hover:text-white rounded-lg"
            title="Avançar 15 frames"
          >
            <FastForward className="size-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-zinc-300">
            {currentFrame}f / {durationInFrames}f
          </span>
          <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${playheadPercent}%`, backgroundColor: accentColor }}
            />
          </div>
        </div>
      </div>

      {/* Multi-Track Sequence Timeline */}
      <div className="h-36 border-t border-zinc-800/90 bg-zinc-950 p-3 flex flex-col justify-between shrink-0">
        <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-2 border-b border-zinc-800/60">
          <div className="flex items-center gap-2">
            <Layers className="size-3.5 text-zinc-500" />
            <span className="font-semibold text-zinc-300">Linha do Tempo (Sequências)</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">
            Clique em qualquer bloco para navegar o cursor
          </span>
        </div>

        {/* Timeline Tracks */}
        <div className="relative flex-1 flex flex-col justify-around py-1 overflow-hidden">
          {/* Vertical Playhead Cursor */}
          <div
            className="absolute top-0 bottom-0 w-0.5 z-30 pointer-events-none bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
            style={{ left: `${playheadPercent}%` }}
          >
            <div className="size-2 -ml-1 -mt-1 rounded-full bg-red-500" />
          </div>

          {tracks.map((track) => (
            <div
              key={`track-${track}`}
              className="relative h-9 rounded-lg bg-zinc-900/60 border border-zinc-800/50 flex items-center px-1"
            >
              {sequences
                .filter((s) => s.track === track)
                .map((seq) => {
                  const left = (seq.startFrame / durationInFrames) * 100;
                  const width = (seq.durationInFrames / durationInFrames) * 100;
                  const isSelected = seq.id === selectedSequenceId;

                  return (
                    <button
                      key={seq.id}
                      type="button"
                      onClick={() => {
                        onSelectSequence(seq.id);
                        jumpToFrame(seq.startFrame);
                      }}
                      className={`absolute h-7 rounded-md px-2 text-left flex items-center justify-between transition-all truncate border text-[10px] font-semibold ${
                        isSelected
                          ? "bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400/40"
                          : "bg-zinc-800/80 border-zinc-700/60 text-zinc-300 hover:border-zinc-500"
                      }`}
                      style={{
                        left: `${left}%`,
                        width: `${Math.max(width, 6)}%`,
                      }}
                      title={`${seq.label} (${seq.startFrame}f - ${seq.startFrame + seq.durationInFrames}f)`}
                    >
                      <span className="truncate">{seq.label}</span>
                      <span className="text-[9px] font-mono text-zinc-400 hidden sm:inline ml-1">
                        {seq.durationInFrames}f
                      </span>
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
