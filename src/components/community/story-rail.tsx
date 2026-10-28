import { Plus, Store, Calendar, Layers } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface StoryItem {
 id: string;
 type: "user" | "store" | "event" | "highlight";
 title: string;
 image_url: string;
 avatar_url?: string | null;
 badge?: string;
 date?: string;
}

interface StoryRailProps {
 stories?: StoryItem[];
 onCreateStory?: () => void;
}

export function StoryRail({ stories = [], onCreateStory }: StoryRailProps) {
 const [selectedStory, setSelectedStory] = useState<StoryItem | null>(null);

 // Se não houver nenhum story real ativo publicado hoje, não renderiza nada
 if (!stories || stories.length === 0) {
 return null;
 }

 return (
 <div className="w-full py-2">
 <ScrollArea className="w-full whitespace-nowrap">
 <div className="flex gap-3 px-1 py-1">
 {/* Card de Adicionar Story */}
 <button
 onClick={onCreateStory}
 className="group relative flex flex-col items-center justify-between w-20 h-32 squircle-media border-0 bg-card p-2 text-center hover:border-primary transition-colors duration-200 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
 >
 <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-2 group-hover:scale-110 transition-transform">
 <Plus className="size-5" />
 </div>
 <span className="text-2xs font-semibold text-foreground leading-tight">
 Criar Story
 </span>
 </button>

 {/* Stories List */}
 {stories.map((story) => (
 <button
 key={story.id}
 onClick={() => setSelectedStory(story)}
 className="group relative flex flex-col justify-between w-20 h-32 squircle-media squircle-hover bg-muted p-2 text-left shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors duration-200"
 >
 {/* Background Image / Cover */}
 {story.image_url ? (
 <img
 src={story.image_url}
 alt={story.title}
 onError={(e) => {
   (e.currentTarget as HTMLElement).style.display = "none";
 }}
 className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-300"
 />
 ) : (
 <div className="absolute inset-0 bg-muted" />
 )}

 {/* Gradient Overlay for Text Readability */}
 <div className="absolute inset-0 bg-black/60" />

 {/* Top Avatar / Badge */}
 <div className="relative z-10 flex items-center justify-between w-full">
 {story.type === "user" && (
 <Avatar className="size-7 ring-2 ring-primary">
 <AvatarImage src={story.avatar_url ?? ""} />
 <AvatarFallback className="text-2xs bg-primary text-primary-foreground font-bold">
 {story.title.charAt(0)}
 </AvatarFallback>
 </Avatar>
 )}
 {story.type === "store" && (
 <div className="size-7 rounded-full bg-foreground text-background flex items-center justify-center ring-2 ring-primary">
 <Store className="size-3.5" />
 </div>
 )}
 {story.type === "event" && (
 <div className="size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center ring-2 ring-white">
 <Calendar className="size-3.5" />
 </div>
 )}

 {story.badge && (
 <Badge
 variant="secondary"
 className="text-2xs px-1 py-0 h-4 bg-background/90 text-foreground font-semibold uppercase"
 >
 {story.badge}
 </Badge>
 )}
 </div>

 {/* Bottom Title */}
 <div className="relative z-10 mt-auto">
 <p className="text-2xs font-bold text-foreground leading-tight line-clamp-2 drop-shadow-sm">
 {story.title}
 </p>
 </div>
 </button>
 ))}
 </div>
 <ScrollBar orientation="horizontal" className="hidden" />
 </ScrollArea>

 {/* Story Viewer Dialog */}
 <Dialog open={!!selectedStory} onOpenChange={() => setSelectedStory(null)}>
 <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-foreground text-foreground border-0 rounded-lg overscroll-contain">
 {selectedStory && (
 <div className="relative aspect-9/16 max-h-screen flex flex-col justify-between p-4">
 {/* Mídia do Story (Vídeo ou Foto) */}
 {selectedStory.image_url ? (
 selectedStory.image_url.toLowerCase().endsWith(".mp4") ||
 selectedStory.image_url.toLowerCase().endsWith(".webm") ? (
 <video
 src={selectedStory.image_url}
 autoPlay
 playsInline
 loop
 className="absolute inset-0 size-full object-contain bg-foreground"
 />
 ) : (
 <img
 src={selectedStory.image_url}
 alt={selectedStory.title}
 onError={(e) => {
   (e.currentTarget as HTMLElement).style.display = "none";
 }}
 className="absolute inset-0 size-full object-contain bg-foreground"
 />
 )
 ) : (
 <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
 <Layers className="size-12 text-primary animate-pulse motion-reduce:animate-none" />
 </div>
 )}

 {/* Barra de Progresso Superior */}
 <div className="relative z-10 w-full h-1 bg-card/20 rounded-full overflow-hidden mb-2">
 <div className="h-full bg-card rounded-full w-full animate-pulse motion-reduce:animate-none" />
 </div>

 {/* Header com Avatar e Autor */}
 <div className="relative z-10 bg-foreground/50 backdrop-blur-sm p-3 rounded-lg flex items-center justify-between gap-3">
 <div className="flex items-center gap-3 min-w-0">
 <Avatar className="size-8 ring-2 ring-primary">
 <AvatarImage src={selectedStory.avatar_url ?? ""} />
 <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
 {selectedStory.title.charAt(0)}
 </AvatarFallback>
 </Avatar>
 <div className="min-w-0">
 <p className="font-bold text-sm leading-none truncate">{selectedStory.title}</p>
 <p className="text-2xs text-foreground/80 mt-1">
 {selectedStory.badge || "Story da Comunidade"}
 </p>
 </div>
 </div>
 </div>
 </div>
 )}
 </DialogContent>
 </Dialog>
 </div>
 );
}
