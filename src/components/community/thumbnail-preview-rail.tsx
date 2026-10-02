import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Image, MapPin } from "lucide-react";
import type { MuralFeedItem } from "@/services/social.functions";

interface ThumbnailPreviewRailProps {
 items: MuralFeedItem[];
 onSelectPost?: (post: MuralFeedItem) => void;
}

export function ThumbnailPreviewRail({ items = [], onSelectPost }: ThumbnailPreviewRailProps) {
 const visualPosts = items.filter((item) => item.media_urls && item.media_urls.length > 0);

 if (visualPosts.length === 0) return null;

 return (
 <div className="w-full py-1">
 <ScrollArea className="w-full whitespace-nowrap">
 <div className="flex gap-3 px-1 py-1">
 {visualPosts.slice(0, 10).map((post) => (
 <button
 key={post.id}
 onClick={() => onSelectPost?.(post)}
 className="group relative flex flex-col justify-end w-[110px] h-[78px] squircle-media squircle-hover bg-muted shrink-0 hover:border-primary transition-all text-left"
 >
 <img
 src={post.media_urls[0]}
 alt={post.author.name}
 className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-300"
 loading="lazy"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

 <div className="relative z-10 p-2 w-full">
 <p className="text-[10px] font-bold text-white truncate leading-tight">
 {post.author.name}
 </p>
 {post.location_name && (
 <p className="text-[9px] text-white/80 truncate flex items-center gap-1 mt-1">
 <MapPin className="size-2.5 shrink-0" />
 {post.location_name}
 </p>
 )}
 </div>
 </button>
 ))}
 </div>
 <ScrollBar orientation="horizontal" className="hidden" />
 </ScrollArea>
 </div>
 );
}
