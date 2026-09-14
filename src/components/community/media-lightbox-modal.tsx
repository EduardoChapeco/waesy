import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
 X,
 Heart,
 MessageSquare,
 ChevronLeft,
 ChevronRight,
 Share2,
 Download,
 Eye,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
 toggleMediaLike,
 getPostMediaStats,
 type MuralFeedItem,
} from "@/services/social.functions";
import { PostCommentsDrawer } from "@/components/community/post-comments-drawer";
import { toast } from "sonner";

export interface MediaLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  post?: MuralFeedItem;
  mediaUrls?: string[];
  initialIndex?: number;
  initialMediaIndex?: number;
  postContext?: {
    authorName?: string;
    authorAvatar?: string | null;
    caption?: string | null;
    createdAt?: string;
  };
}

export function MediaLightboxModal({
  isOpen,
  onClose,
  post: providedPost,
  mediaUrls,
  initialIndex,
  initialMediaIndex,
  postContext,
}: MediaLightboxModalProps) {
  const mediaList = providedPost?.media_urls || mediaUrls || [];
  const startIdx = initialMediaIndex ?? initialIndex ?? 0;
  const post: MuralFeedItem = providedPost || {
    id: "context-preview",
    type: "post",
    content_text: postContext?.caption || null,
    media_urls: mediaList,
    post_type: "photo",
    created_at: postContext?.createdAt || new Date().toISOString(),
    likes_count: 0,
    comments_count: 0,
    user_liked: false,
    author: {
      id: "author",
      name: postContext?.authorName || "Perfil",
      avatar_url: postContext?.authorAvatar || null,
      is_store: false,
    },
    reference_type: "none",
    reference_id: null,
  };

  const [currentIndex, setCurrentIndex] = useState(startIdx);
  const [isCommentDrawerOpen, setIsCommentDrawerOpen] = useState(false);
  const qc = useQueryClient();

  const currentMediaUrl = post.media_urls[currentIndex] || "";

 // Query para estatísticas exclusivas das fotos
 const statsQueryKey = ["post-media-stats", post.id];
 const { data: mediaStats = {} } = useQuery({
 queryKey: statsQueryKey,
 queryFn: () => getPostMediaStats({ data: { postId: post.id } }),
 enabled: isOpen,
 });

 const currentStat = mediaStats[currentMediaUrl] || {
 likes_count: 0,
 comments_count: 0,
 user_liked: false,
 };

 const toggleLikeMutation = useMutation({
 mutationFn: () =>
 toggleMediaLike({
 data: {
 postId: post.id,
 mediaUrl: currentMediaUrl,
 },
 }),
 onMutate: async () => {
 await qc.cancelQueries({ queryKey: statsQueryKey });
 const prev = qc.getQueryData(statsQueryKey);
 qc.setQueryData(statsQueryKey, (old: any = {}) => {
 const item = old[currentMediaUrl] || { likes_count: 0, comments_count: 0, user_liked: false };
 return {
 ...old,
 [currentMediaUrl]: {
 ...item,
 user_liked: !item.user_liked,
 likes_count: item.user_liked ? Math.max(0, item.likes_count - 1) : item.likes_count + 1,
 },
 };
 });
 return { prev };
 },
 onError: (_err, _vars, ctx) => {
 if (ctx?.prev) qc.setQueryData(statsQueryKey, ctx.prev);
 toast.error("Erro ao curtir foto.");
 },
 onSettled: () => {
 qc.invalidateQueries({ queryKey: statsQueryKey });
 },
 });

 if (!isOpen || !currentMediaUrl) return null;

 return (
 <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between animate-in fade-in duration-200 select-none">
 {/* Top Bar */}
 <div className="px-4 py-3 flex items-center justify-between text-white z-10 shrink-0">
 <div className="flex items-center gap-3">
 <Avatar className="size-9 border border-white/20">
 <AvatarImage src={post.author.avatar_url || undefined} />
 <AvatarFallback className="bg-white/20 text-white font-bold text-xs">
 {post.author.name.charAt(0).toUpperCase()}
 </AvatarFallback>
 </Avatar>
 <div>
 <p className="text-sm font-bold truncate">{post.author.name}</p>
 <p className="text-[11px] text-white/60">
 Foto {currentIndex + 1} de {post.media_urls.length}
 </p>
 </div>
 </div>

 <button
 onClick={onClose}
 className="size-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
 >
 <X className="size-5" />
 </button>
 </div>

 {/* Main Image Stage */}
 <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
 {/* Previous Button */}
 {post.media_urls.length > 1 && currentIndex > 0 && (
 <button
 onClick={() => setCurrentIndex((prev) => prev - 1)}
 className="absolute left-3 sm:left-6 z-20 size-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-transform active:scale-95"
 >
 <ChevronLeft className="size-6" />
 </button>
 )}

 <img
 src={currentMediaUrl}
 alt={`Mídia ${currentIndex + 1}`}
 className="max-h-[75vh] max-w-full rounded-2xl object-contain transition-all duration-300"
 />

 {/* Next Button */}
 {post.media_urls.length > 1 && currentIndex < post.media_urls.length - 1 && (
 <button
 onClick={() => setCurrentIndex((prev) => prev + 1)}
 className="absolute right-3 sm:right-6 z-20 size-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-transform active:scale-95"
 >
 <ChevronRight className="size-6" />
 </button>
 )}
 </div>

  {/* Bottom Floating Interaction Bar */}
  <div className="px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-black/80 backdrop-blur-md border-t border-white/10 flex items-center justify-between text-white shrink-0">
    <div className="flex items-center gap-2">
      {/* Curtir foto específica */}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => toggleLikeMutation.mutate()}
        className={`h-10 px-3 sm:px-3.5 rounded-xl gap-2 text-xs font-bold transition-all ${
          currentStat.user_liked
            ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
            : "bg-white/10 hover:bg-white/20 text-white"
        }`}
      >
        <Heart
          className={`size-4 ${currentStat.user_liked ? "fill-current text-destructive" : ""}`}
        />
        <span className="hidden sm:inline">{currentStat.likes_count} curtidas nesta foto</span>
        <span className="sm:hidden">{currentStat.likes_count}</span>
      </Button>

      {/* Comentar na foto específica */}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsCommentDrawerOpen(true)}
        className="h-10 px-3 sm:px-3.5 rounded-xl gap-2 text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all"
      >
        <MessageSquare className="size-4" />
        <span className="hidden sm:inline">
          {currentStat.comments_count > 0
            ? `${currentStat.comments_count} comentários`
            : "Comentar foto"}
        </span>
        <span className="sm:hidden">{currentStat.comments_count}</span>
      </Button>
    </div>

 {/* Dots de navegação */}
 {post.media_urls.length > 1 && (
 <div className="hidden sm:flex items-center gap-1.5">
 {post.media_urls.map((_, idx) => (
 <button
 key={idx}
 onClick={() => setCurrentIndex(idx)}
 className={`size-2 rounded-full transition-all ${
 idx === currentIndex ? "w-6 bg-white" : "bg-white/30 hover:bg-white/60"
 }`}
 />
 ))}
 </div>
 )}
 </div>

 {/* Drawer de comentários dedicado a esta foto */}
 <PostCommentsDrawer
 isOpen={isCommentDrawerOpen}
 onClose={() => setIsCommentDrawerOpen(false)}
 postId={post.id}
 mediaUrl={currentMediaUrl}
 authorName={post.author.name}
 />
 </div>
 );
}
