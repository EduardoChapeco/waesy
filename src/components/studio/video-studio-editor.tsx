import React, { useState } from 'react';
import { Video, Layers, Download, Play, Pause, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoStudioTimeline } from './video-studio-timeline';

interface VideoStudioEditorProps {
 isOpen?: boolean;
 onClose?: () => void;
 onExportToStore?: (videoUrl: string) => void;
}

export function VideoStudioEditor({
 isOpen = true,
 onClose,
 onExportToStore,
}: VideoStudioEditorProps) {
 const [isPlaying, setIsPlaying] = useState(false);
 const [currentTime, setCurrentTime] = useState(4);
 const [duration, setDuration] = useState(15);
 const [aspect, setAspect] = useState<'9:16' | '16:9'>('9:16');

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
 <div className="w-full max-w-5xl h-[85vh] bg-card border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden">
 {/* Header */}
 <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-primary/10 text-primary">
 <Video className="w-5 h-5" />
 </div>
 <div>
 <h2 className="text-sm font-bold text-foreground">
 Waesy Video Studio · Editor
 </h2>
 <p className="text-[11px] text-muted-foreground">
 Composição em timeline multi-faixas nativa do Waesy
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <div className="flex items-center bg-muted/60 p-1 rounded-lg gap-1">
 <button
 type="button"
 onClick={() => setAspect('9:16')}
 className={'px-3 py-1 rounded-lg text-xs font-bold ' + (
 aspect === '9:16' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
 )}
 >
 9:16 (Reels/TikTok)
 </button>
 <button
 type="button"
 onClick={() => setAspect('16:9')}
 className={'px-3 py-1 rounded-lg text-xs font-bold ' + (
 aspect === '16:9' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
 )}
 >
 16:9 (Vitrine/YT)
 </button>
 </div>

 {onClose && (
 <Button
 type="button"
 variant="ghost"
 onClick={onClose}
 className="h-8 w-8 p-0 rounded-lg text-muted-foreground"
 >
 <X className="w-4 h-4" />
 </Button>
 )}
 </div>
 </div>

 {/* Video Canvas Preview */}
 <div className="flex-1 bg-black/40 flex items-center justify-center p-6 overflow-hidden">
 <div
 className={'relative rounded-lg overflow-hidden shadow-2xl bg-black border border-white/10 flex items-center justify-center ' + (
 aspect === '9:16' ? 'h-full aspect-[9/16]' : 'w-full max-w-2xl aspect-video'
 )}
 >
 <div className="text-center p-6 space-y-3">
 <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto text-white backdrop-blur-sm">
 {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
 </div>
 <p className="text-xs text-white/80 font-medium">Prévia do Vídeo Promocional Waesy</p>
 <div className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold inline-block">
 Legenda Ativa: "Venha conhecer nossa nova coleção!"
 </div>
 </div>
 </div>
 </div>

 {/* Timeline Footer */}
 <div className="p-4 border-t border-border bg-card">
 <VideoStudioTimeline
 isPlaying={isPlaying}
 currentTime={currentTime}
 duration={duration}
 onPlayPause={() => setIsPlaying(!isPlaying)}
 onSeek={(t) => setCurrentTime(t)}
 />
 </div>
 </div>
 </div>
 );
}
