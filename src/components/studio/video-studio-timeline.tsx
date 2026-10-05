import React, { useState } from 'react';
import { Play, Pause, Scissors, ZoomIn, ZoomOut, Volume2, Type, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface VideoClipTrack {
 id: string;
 name: string;
 type: 'video' | 'audio' | 'subtitle';
 duration: number; // in seconds
 color: string;
}

interface VideoStudioTimelineProps {
 isPlaying: boolean;
 currentTime: number;
 duration: number;
 onPlayPause: () => void;
 onSeek: (seconds: number) => void;
 onCut?: () => void;
 onZoomIn?: () => void;
 onZoomOut?: () => void;
 tracks?: VideoClipTrack[];
 className?: string;
}

export function VideoStudioTimeline({
 isPlaying,
 currentTime,
 duration,
 onPlayPause,
 onSeek,
 onCut,
 onZoomIn,
 onZoomOut,
 tracks = [
 { id: 't-1', name: 'Vídeo Principal (Promocional)', type: 'video', duration: 15, color: '#3b82f6' },
 { id: 't-2', name: 'Legendas Automáticas (IA)', type: 'subtitle', duration: 15, color: '#eab308' },
 { id: 't-3', name: 'Trilha Sonora de Fundo', type: 'audio', duration: 15, color: '#10b981' },
 ],
 className = '',
}: VideoStudioTimelineProps) {
 const [zoomLevel, setZoomLevel] = useState(1);

 const handleZoomIn = () => { setZoomLevel(z => Math.min(z + 0.25, 4)); onZoomIn?.(); };
 const handleZoomOut = () => { setZoomLevel(z => Math.max(z - 0.25, 0.25)); onZoomOut?.(); };

 const formatTime = (secs: number) => {
 const m = Math.floor(secs / 60);
 const s = Math.floor(secs % 60);
 return `${m}:${s.toString().padStart(2, '0')}`;
 };

 return (
 <div className={'p-4 rounded-lg bg-card border border-border shadow-md space-y-3 ' + className}>
 {/* Controls Bar */}
 <div className="flex items-center justify-between border-b border-border pb-3">
 <div className="flex items-center gap-2">
 <Button
 type="button"
 size="sm"
 onClick={onPlayPause}
 className="h-9 w-9 p-0 rounded-lg bg-primary text-primary-foreground"
 >
 {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
 </Button>

 <span className="text-xs font-mono text-foreground font-semibold">
 {formatTime(currentTime)} / {formatTime(duration)}
 </span>
 </div>

 <div className="flex items-center gap-1">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => onCut?.()}
 title="Cortar seleção (Ctrl+X)"
 aria-label="Cortar seleção"
 className="size-11 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
 >
 <Scissors className="w-3.5 h-3.5" />
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={handleZoomIn}
 title="Zoom In na timeline"
 aria-label="Aumentar zoom da timeline"
 className="size-11 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
 >
 <ZoomIn className="w-3.5 h-3.5" />
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={handleZoomOut}
 title="Zoom Out na timeline"
 aria-label="Reduzir zoom da timeline"
 className="size-11 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
 >
 <ZoomOut className="w-3.5 h-3.5" />
 </Button>
 </div>
 </div>

 {/* Tracks Container */}
 <div className="space-y-2 pt-1">
 {tracks.map((track) => (
 <div key={track.id} className="flex items-center gap-3">
 <div className="w-36 shrink-0 flex items-center gap-2 text-xs text-muted-foreground truncate">
 {track.type === 'video' && <Film className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
 {track.type === 'subtitle' && <Type className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
 {track.type === 'audio' && <Volume2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
 <span className="truncate">{track.name}</span>
 </div>

 <div className="flex-1 h-9 rounded-lg bg-muted/40 relative overflow-hidden border border-border/60">
 <div
 style={{ backgroundColor: track.color }}
 className="h-full w-4/5 rounded-lg opacity-80 flex items-center px-3 text-[10px] font-bold text-white shadow-sm"
 >
 Clip 01 ({track.duration}s)
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}
