import * as React from "react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
  Bookmark,
  ShieldCheck,
  MoreHorizontal,
  MapPin,
  Calendar,
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
import { togglePostLike, type MuralFeedItem } from "@/services/social.functions";
import { toast } from "sonner";

export interface FeedThreadPostCardProps {
  post: MuralFeedItem;
  session?: any;
  queryKey?: unknown[];
  className?: string;
}

export function FeedThreadPostCard({
  post,
  session,
  queryKey = ["community-feed"],
  className = "",
}: FeedThreadPostCardProps) {
  const qc = useQueryClient();

  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isProfilePeekOpen, setIsProfilePeekOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [repostCount, setRepostCount] = useState(0);
  const [hasReposted, setHasReposted] = useState(false);

  const likeMutation = useMutation({
    mutationFn: () => togglePostLike({ data: { post_id: post.id } }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData(queryKey);
      qc.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        const patchItem = (it: MuralFeedItem) =>
          it.id === post.id
            ? {
                ...it,
                user_liked: !it.user_liked,
                likes_count: it.user_liked
                  ? Math.max(0, it.likes_count - 1)
                  : it.likes_count + 1,
              }
            : it;
        if (Array.isArray(old)) return old.map(patchItem);
        if (old.items) {
          return {
            ...old,
            items: old.items.map(patchItem),
          };
        }
        return old;
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  const handleShare = () => {
    const permalinkUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/publicacao/${post.id}`
        : "";
    if (navigator.share) {
      navigator
        .share({
          title: post.author.name,
          text: post.content_text || "Veja esta publicação na Waesy!",
          url: permalinkUrl,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(permalinkUrl);
      toast.success("Link da publicação copiado!");
    }
  };

  const handleRepost = () => {
    if (hasReposted) {
      setHasReposted(false);
      setRepostCount((prev) => Math.max(0, prev - 1));
      toast.info("Repost desfeito.");
    } else {
      setHasReposted(true);
      setRepostCount((prev) => prev + 1);
      toast.success("Publicação repostada no seu feed!");
    }
  };

  const handleToggleSave = () => {
    setIsSaved(!isSaved);
    toast.success(
      isSaved ? "Publicação removida dos salvos." : "Publicação salva com sucesso!"
    );
  };

  const authorName = post.author?.name || "Membro";
  const authorInitial = authorName.charAt(0).toUpperCase();
  const authorAvatar = post.author?.avatar_url || null;
  const isVerified = (post.author as any)?.is_verified || false;
  const authorUsername = (post.author as any)?.username || "";
  const mediaUrls = post.media_urls || [];
  const createdAtFormatted = formatRelativeTime(post.created_at);

  return (
    <>
      <article
        className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-border/50 bg-card text-foreground transition-colors duration-200 duration-200 hover:border-border/80 ${className}`}
      >
        <div className="flex items-start gap-3">
          {/* ─── Coluna Esquerda: Avatar & Conector de Thread ─────────── */}
          <div className="flex flex-col items-center shrink-0">
            <button
              type="button"
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 relative group rounded-full cursor-pointer"
              onClick={() => setIsProfilePeekOpen(true)}
              aria-label={`Ver perfil de ${authorName}`}
            >
              <Avatar className="size-11 min-h-11 min-w-11 rounded-full border border-border/40">
                {authorAvatar && (
                  <AvatarImage
                    src={authorAvatar}
                    alt={authorName}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                  {authorInitial}
                </AvatarFallback>
              </Avatar>
            </button>
            {/* Linha vertical conectora de Thread estilo Threads */}
            <div className="w-0.5 grow min-h-4 bg-muted/50 rounded-full mt-2" />
          </div>

          {/* ─── Coluna Direita: Cabeçalho, Conteúdo, Mídia & Ações ───── */}
          <div className="grow min-w-0 space-y-3">
            {/* Cabeçalho do Autor */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <button
                  type="button"
                  className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary font-bold text-xs sm:text-sm text-foreground hover:underline truncate rounded-xs cursor-pointer"
                  onClick={() => setIsProfilePeekOpen(true)}
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
                  {createdAtFormatted}
                </span>
              </div>

              {/* Menu de Ações de Conteúdo */}
              <ContentActionsMenu
                entityType="post"
                entityId={post.id}
                canonicalUrl={`/publicacao/${post.id}`}
                title={authorName}
                isOwner={session?.user?.id === post.author.id}
              />
            </div>

            {/* Texto da Publicação (Threads Rich Highlighter & Anti-Truncate) */}
            {post.content_text && (
              <div className="text-xs sm:text-sm leading-relaxed text-foreground whitespace-pre-line break-words text-anti-truncate">
                <RichPostContent content={post.content_text} isExpanded />
              </div>
            )}

            {/* Carrossel de Mídias (Fotos / Vídeos) */}
            {mediaUrls.length > 0 && (
              <div className="pt-1">
                <MediaCarousel
                  mediaUrls={mediaUrls}
                  post={post}
                  aspectRatio={mediaUrls.length === 1 ? "4/5" : "square"}
                />
              </div>
            )}

            {/* ─── Barra de Ações Sociais Ergonômicas (Piso 44px) ───────── */}
            <div className="flex items-center justify-between pt-1 -ml-2 text-muted-foreground">
              <div className="flex items-center gap-1">
                {/* Amei / Like */}
                <button
                  type="button"
                  className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-11 min-h-11 px-3 rounded-full flex items-center gap-2 text-xs font-semibold transition-colors cursor-pointer select-none ${
                    post.user_liked
                      ? "text-rose-500 bg-rose-500/10"
                      : "hover:text-foreground hover:bg-muted/50"
                  }`}
                  onClick={() => likeMutation.mutate()}
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
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-11 min-h-11 px-3 rounded-full flex items-center gap-2 text-xs font-semibold hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer select-none"
                  onClick={() => setIsCommentsOpen(true)}
                  aria-label="Ver comentários"
                >
                  <MessageCircle className="size-4" />
                  <span>{post.comments_count || 0}</span>
                </button>

                {/* Repost */}
                <button
                  type="button"
                  className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-11 min-h-11 px-3 rounded-full flex items-center gap-2 text-xs font-semibold transition-colors cursor-pointer select-none ${
                    hasReposted
                      ? "text-emerald-500 bg-emerald-500/10"
                      : "hover:text-foreground hover:bg-muted/50"
                  }`}
                  onClick={handleRepost}
                  aria-label="Repostar"
                >
                  <Repeat2 className="size-4" />
                  <span>{repostCount > 0 ? repostCount : ""}</span>
                </button>

                {/* Compartilhar */}
                <button
                  type="button"
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-11 min-h-11 px-3 rounded-full flex items-center gap-2 text-xs font-semibold hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer select-none"
                  onClick={handleShare}
                  aria-label="Compartilhar publicação"
                >
                  <Share2 className="size-4" />
                </button>
              </div>

              {/* Salvar */}
              <button
                type="button"
                className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-11 min-h-11 size-11 rounded-full flex items-center justify-center transition-colors cursor-pointer select-none ${
                  isSaved
                    ? "text-primary bg-primary/10"
                    : "hover:text-foreground hover:bg-muted/50"
                }`}
                onClick={handleToggleSave}
                aria-label={isSaved ? "Remover dos salvos" : "Salvar publicação"}
              >
                <Bookmark
                  className={`size-4 ${isSaved ? "fill-primary" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* ─── Drawer de Comentários Integrado ─────────────────────────── */}
      {isCommentsOpen && (
        <PostCommentsDrawer
          isOpen={isCommentsOpen}
          onClose={() => setIsCommentsOpen(false)}
          postId={post.id}
          authorName={authorName}
          postTitle={post.content_text || undefined}
        />
      )}

      {/* ─── Modal Rápido de Perfil ao Tocar no Avatar (Fase 43) ──────── */}
      {isProfilePeekOpen && (
        <QuickProfilePeekModal
          isOpen={isProfilePeekOpen}
          onClose={() => setIsProfilePeekOpen(false)}
          profileId={post.author.id}
          initialData={{
            name: authorName,
            username: authorUsername,
            avatarUrl: authorAvatar,
            isVerified,
          }}
        />
      )}
    </>
  );
}
