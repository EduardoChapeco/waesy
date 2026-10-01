import * as React from "react";
import { useState } from "react";
import { Play } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Story {
 id: string;
 thumbnail_url?: string;
 thumb?: string;
 media_url: string;
 type?: "image" | "video";
 title: string;
}

interface StoriesRingProps {
 content: {
 stories: Story[];
 };
}

export function StoriesRing({ content }: StoriesRingProps) {
 const stories = content.stories || [];
 const [activeStory, setActiveStory] = useState<Story | null>(null);

 if (stories.length === 0) return null;

 return (
 <>
 {/* Ring / Bubbles */}
 <div className="w-full flex overflow-x-auto no-scrollbar gap-4 py-4 px-4 scrollbar-hide snap-x">
 {stories.map((story) => {
 const thumbImg = story.thumb || story.thumbnail_url || "";
 const isVideo =
 story.media_url?.split("?")[0].match(/\.(mp4|webm|mov|ogg)$/i) ||
 story.type === "video";

 return (
 <button
 key={story.id}
 onClick={() => setActiveStory(story)}
 className="flex flex-col items-center gap-2 group snap-start shrink-0"
 >
 <div className="relative p-0.5 rounded-full from-primary transition-transform group-hover:scale-105 group-active:scale-95">
 <div className="w-20 h-20 bg-background rounded-full p-0.5">
 <div className="w-full h-full rounded-full overflow-hidden relative bg-muted">
 {thumbImg ? (
 <img
 src={thumbImg}
 alt={story.title}
 className="w-full h-full object-cover"
 />
 ) : (
 <div className="w-full h-full bg-muted" />
 )}
 {isVideo && (
 <div className="absolute inset-0 flex items-center justify-center bg-black/20">
 <Play className="text-white w-6 h-6 fill-white" />
 </div>
 )}
 </div>
 </div>
 </div>
 <span className="text-xs font-medium max-w-[80px] truncate text-center">
 {story.title}
 </span>
 </button>
 );
 })}
 </div>

 {/* Fullscreen Story Viewer */}
 <Dialog open={!!activeStory} onOpenChange={(open) => !open && setActiveStory(null)}>
 <DialogContent className="sm:max-w-md sm:w-full sm:h-[90vh] h-full p-0 overflow-hidden bg-black border-none flex flex-col items-center justify-center">
 {activeStory &&
 (() => {
 const isVideo =
 activeStory.media_url?.split("?")[0].match(/\.(mp4|webm|mov|ogg)$/i) ||
 activeStory.type === "video";
 return (
 <div className="w-full h-full relative">
 {isVideo ? (
 <video
 src={activeStory.media_url}
 autoPlay
 loop
 playsInline
 className="w-full h-full object-cover"
 />
 ) : (
 <img
 src={activeStory.media_url}
 alt={activeStory.title}
 className="w-full h-full object-cover"
 />
 )}
 </div>
 );
 })()}
 </DialogContent>
 </Dialog>
 </>
 );
}
