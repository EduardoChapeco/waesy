// motion-reduce: safe
import * as React from "react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
  ShieldCheck,
  MoreHorizontal,
  Sparkles,
  Inbox,
  Plus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MediaCarousel } from "@/components/community/MediaCarousel";
import { QuickProfilePeekModal } from "@/components/community/QuickProfilePeekModal";
import { PostCommentsDrawer } from "@/components/community/post-comments-drawer";
import { ContentActionsMenu } from "@/components/common/content-actions-menu";
import { RichPostContent } from "@/components/community/rich-post-content";
import { formatRelativeTime } from "@/lib/datetime";
import { togglePostLike } from "@/services/social.functions";
import {
  SalePostTemplate,
  NewsPostTemplate,
  VideoPostTemplate,
  EventPostTemplate,
  JobPostTemplate,
} from "@/components/community/CommunityPostTemplates";
import { toast } from "sonner";

export interface ThreadsFeedPostItem {
  id: string;
  community_id: string;
  author: {
    id: string;
    name: string;
    username?: string | null;
    avatar_url?: string | null;
    is_verified?: boolean;
  };
  content_text: string | null;
  media_urls: string[];
  post_type: string;
  post_attributes: Record<string, any>;
  likes_count: number;
  comments_count: number;
  user_liked: boolean;
  created_at: string;
}

export interface ThreadsCommunityFeedProps {
  posts: ThreadsFeedPostItem[];
  communityId: string;
  currentUserId?: string | null;
  isLoading?: boolean;
  onNewPostClick?: () => void;
  className?: string;
}

export type CommunityFeedPostItem = ThreadsFeedPostItem;
export type CommunityFeedViewProps = ThreadsCommunityFeedProps;

export function ThreadsCommunityFeed({
  posts,
  communityId,
  currentUserId,
  isLoading = false,
  onNewPostClick,
  className = "",
}: ThreadsCommunityFeedProps) {
  const qc = useQueryClient();
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [profilePeekUser, setProfilePeekUser] = useState<any | null>(null);

  const likeMutation = useMutation({
    mutationFn: (postId: string) => togglePostLike({ data: { post_id: postId } }),
    onMutate: async (postId: string) => {
      const queryKey = ["community-feed", communityId];
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData(queryKey);
      qc.setQueryData(queryKey, (old: any) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.map((it: ThreadsFeedPostItem) =>
            it.id === postId
              ? {
                  ...it,
                  user_liked: !it.user_liked,
                  likes_count: it.user_liked
                    ? Math.max(0, it.likes_count - 1)
                    : it.likes_count + 1,
                }
              : it
          ),
        };
      });
      return { prev, queryKey };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(ctx.queryKey, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["community-feed", communityId] });
    },
  });

  const handleShare = (post: ThreadsFeedPostItem) => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/publicacao/${post.id}`;
      if (navigator.share) {
        navigator.share({
          title: post.author.name,
          text: post.content_text || "Veja esta publicação na comunidade!",
          url,
        }).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
        toast.success("Link da publicação copiado!");
      }
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={`space-y-4 max-w-2xl mx-auto px-4 py-4 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 sm:p-5 rounded-2xl border border-border/40 bg-card space-y-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-full bg-muted/80 shrink-0" />
              <div className="space-y-2 grow">
                <div className="h-3.5 bg-muted/80 rounded w-1/3" />
                <div className="h-2.5 bg-muted/60 rounded w-1/4" />
              </div>
            </div>
            <div className="h-4 bg-muted/70 rounded w-5/6" />
            <div className="h-4 bg-muted/70 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  // Estado Vazio (Empty State)
  if (!posts || posts.length === 0) {
    return (
      <div className={`max-w-2xl mx-auto px-4 py-12 text-center space-y-4 ${className}`}>
        <div className="size-16 rounded-full bg-muted/60 border border-border/60 mx-auto flex items-center justify-center text-muted-foreground">
          <Inbox className="size-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground">Nenhuma publicação ainda</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Seja o primeiro a compartilhar uma novidade, anúncio ou pergunta nesta comunidade.
          </p>
        </div>
        {onNewPostClick && (
          <Button
            type="button"
            onClick={onNewPostClick}
            className="h-11 min-h-11 px-6 rounded-full font-bold text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
          >
            Criar Primeira Publicação
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`max-w-3xl mx-auto px-2 sm:px-4 py-2 space-y-3 sm:space-y-4 ${className}`}>
      {posts.map((post) => {
        const authorName = post.author?.name || "Membro";
        const authorInitial = authorName.charAt(0).toUpperCase();
        const authorAvatar = post.author?.avatar_url || null;
        const authorUsername = post.author?.username || "";
        const isVerified = Boolean(post.author?.is_verified);
        const timeAgo = formatRelativeTime(post.created_at);
        const mediaUrls = post.media_urls || [];

        return (
          <article
            key={post.id}
            className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-border/40 bg-card text-foreground transition-colors hover:border-border/70"
          >
            <div className="flex items-start gap-3">
              {/* ─── Coluna Esquerda: Avatar & Linha de Thread ─────────── */}
              <div className="flex flex-col items-center shrink-0">
                <button
                  type="button"
                  onClick={() => setProfilePeekUser(post.author)}
                  className="rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={`Ver perfil de ${authorName}`}
                >
                  <div className="relative">
                    <Avatar className="size-11 min-h-11 min-w-11 border border-border/40">
                      {authorAvatar && (
                        <AvatarImage src={authorAvatar} alt={authorName} className="object-cover" />
                      )}
                      <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                        {authorInitial}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className="absolute bottom-0 right-0 size-4 rounded-full bg-foreground text-background flex items-center justify-center border border-background shadow-2xs"
                      aria-hidden="true"
                    >
                      <Plus className="size-3 stroke-2" />
                    </div>
                  </div>
                </button>
                {/* Linha vertical conectora de publicação contínua */}
                <div className="w-0.5 grow min-h-6 bg-muted/40 rounded-full mt-2" />
              </div>

              {/* ─── Coluna Direita: Header, Conteúdo & Ações ─────────── */}
              <div className="grow min-w-0 space-y-3">
                {/* Header do Autor */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0 text-xs sm:text-sm">
                    <button
                      type="button"
                      onClick={() => setProfilePeekUser(post.author)}
                      className="font-bold text-foreground hover:underline truncate cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    >
                      {authorName}
                    </button>
                    {isVerified && (
                      <ShieldCheck className="size-3.5 text-primary shrink-0" />
                    )}
                    {authorUsername && (
                      <span className="text-xs text-muted-foreground truncate">
                        @{authorUsername}
                      </span>
                    )}
                    <span className="text-muted-foreground text-xs">·</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {timeAgo}
                    </span>
                  </div>

                  {/* Menu de Ações de Conteúdo */}
                  <ContentActionsMenu
                    entityType="post"
                    entityId={post.id}
                    canonicalUrl={`/publicacao/${post.id}`}
                    title={authorName}
                    isOwner={currentUserId === post.author.id}
                  />
                </div>

                {/* ─── Conteúdo Modular pelo Template de Post ─────────── */}
                {post.post_type === "sale" ? (
                  <SalePostTemplate post={post} />
                ) : post.post_type === "news" ? (
                  <NewsPostTemplate post={post} />
                ) : post.post_type === "video" ? (
                  <VideoPostTemplate post={post} />
                ) : post.post_type === "event" ? (
                  <EventPostTemplate post={post} />
                ) : post.post_type === "job" ? (
                  <JobPostTemplate post={post} />
                ) : (
                  // Template Social Padrão
                  post.content_text && (
                    <div className="text-xs sm:text-sm leading-relaxed text-foreground whitespace-pre-line break-words">
                      <RichPostContent content={post.content_text} isExpanded />
                    </div>
                  )
                )}

                {/* Mídias em Carrossel Squircle (quando não for vídeo isolado) */}
                {post.post_type !== "video" && mediaUrls.length > 0 && (
                  <div className="pt-1">
                    <MediaCarousel
                      mediaUrls={mediaUrls}
                      post={post as any}
                      aspectRatio={mediaUrls.length === 1 ? "4/5" : "square"}
                    />
                  </div>
                )}

                {/* ─── Barra de Ações Sociais (Piso 44px) ─────────────── */}
                <div className="flex items-center justify-between pt-1 -ml-2 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    {/* Curtir / Like */}
                    <button
                      type="button"
                      onClick={() => likeMutation.mutate(post.id)}
                      className={`h-11 min-h-11 px-3 rounded-full flex items-center gap-2 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        post.user_liked
                          ? "text-rose-500 bg-rose-500/10"
                          : "hover:text-foreground hover:bg-muted/40"
                      }`}
                      aria-label={post.user_liked ? "Descurtir" : "Curtir"}
                    >
                      <Heart
                        className={`size-4 ${
                          post.user_liked ? "fill-rose-500 stroke-rose-500" : ""
                        }`}
                      />
                      <span>{post.likes_count || 0}</span>
                    </button>

                    {/* Comentar */}
                    <button
                      type="button"
                      onClick={() => setActiveCommentsPostId(post.id)}
                      className="h-11 min-h-11 px-3 rounded-full flex items-center gap-2 text-xs font-semibold hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label="Comentários"
                    >
                      <MessageCircle className="size-4" />
                      <span>{post.comments_count || 0}</span>
                    </button>

                    {/* Compartilhar */}
                    <button
                      type="button"
                      onClick={() => handleShare(post)}
                      className="size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center text-xs font-semibold hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label="Compartilhar publicação"
                    >
                      <Share2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}

      {/* Gaveta de Comentários */}
      {activeCommentsPostId && (
        <PostCommentsDrawer
          postId={activeCommentsPostId}
          isOpen={Boolean(activeCommentsPostId)}
          onClose={() => setActiveCommentsPostId(null)}
        />
      )}

      {/* Modal Rápido de Perfil */}
      {profilePeekUser && (
        <QuickProfilePeekModal
          isOpen={Boolean(profilePeekUser)}
          onClose={() => setProfilePeekUser(null)}
          profileId={profilePeekUser.id}
          initialData={{
            name: profilePeekUser.name,
            username: profilePeekUser.username || undefined,
            avatarUrl: profilePeekUser.avatar_url,
            isVerified: profilePeekUser.is_verified,
          }}
        />
      )}
    </div>
  );
}

export const CommunityFeedView = ThreadsCommunityFeed;
