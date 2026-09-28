import { Heart, MessageCircle, Share2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/datetime";

export interface UnifiedFeedPost {
  id: string;
  content?: string | null;
  content_text?: string | null;
  media_url?: string | null;
  image_url?: string | null;
  media_urls?: string[] | null;
  created_at?: string | null;
  likes_count?: number;
  comments_count?: number;
  replies_count?: number;
  author?: {
    id?: string;
    name?: string;
    full_name?: string;
    username?: string;
    avatar_url?: string | null;
    is_verified?: boolean;
  };
}

interface UnifiedFeedCardProps {
  post: UnifiedFeedPost;
  mode?: "feed" | "grid";
  onSelectPost?: (post: UnifiedFeedPost) => void;
  onPreviewMedia?: (url: string) => void;
}

/**
 * UnifiedFeedCard — Componente Inteligente de Publicação (Padrão Instagram + Threads)
 * - Se houver media_url / image_url válida: Renderiza o Card Visual padrão Instagram.
 * - Se for apenas texto (content sem media_url): Renderiza o Card de Nota de Texto (Padrão Threads),
 *   com fundo sutil (bg-gray-50 dark:bg-zinc-900/60), tipografia legível, bom padding e zero quadrado de imagem quebrada.
 */
export function UnifiedFeedCard({
  post,
  mode = "feed",
  onSelectPost,
  onPreviewMedia,
}: UnifiedFeedCardProps) {
  const primaryMedia =
    post.media_url ||
    post.image_url ||
    (Array.isArray(post.media_urls) && post.media_urls.length > 0
      ? post.media_urls[0]
      : null);

  const hasMedia = Boolean(primaryMedia && String(primaryMedia).trim().length > 0);
  const textContent = (post.content || post.content_text || "").trim();
  const likesCount = Number(post.likes_count || 0);
  const commentsCount = Number(post.comments_count ?? post.replies_count ?? 0);
  const authorName = post.author?.full_name || post.author?.name || "Publicação";
  const authorUsername = post.author?.username;
  const authorAvatar = post.author?.avatar_url;

  if (mode === "grid") {
    if (hasMedia && primaryMedia) {
      return (
        <div
          onClick={() => {
            if (onSelectPost) onSelectPost(post);
            else if (onPreviewMedia) onPreviewMedia(primaryMedia);
          }}
          className="group aspect-square rounded-2xl overflow-hidden bg-muted/30 relative cursor-pointer border border-border/40 hover:border-foreground/40 transition-all select-none"
        >
          <img
            src={primaryMedia}
            alt={textContent ? textContent.slice(0, 60) : "Foto da publicação"}
            className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 p-3 text-white text-xs font-bold">
            <span className="inline-flex items-center gap-1">
              <Heart className="size-3.5 fill-white" />
              {likesCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="size-3.5 fill-white" />
              {commentsCount}
            </span>
          </div>
        </div>
      );
    }

    // Modo Grid para Post de Texto Puro — Card de Nota Threads (Sem quadrado de imagem vazia/quebrada)
    return (
      <div
        onClick={() => onSelectPost?.(post)}
        className="group aspect-square rounded-2xl bg-gray-50 dark:bg-zinc-900/60 border border-border/50 hover:border-foreground/30 p-3.5 sm:p-4 flex flex-col justify-between cursor-pointer transition-all select-none"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {authorAvatar ? (
            <img
              src={authorAvatar}
              alt={authorName}
              className="size-5 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="size-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
              {authorName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="text-[11px] font-bold text-foreground truncate">
            {authorName}
          </span>
          {post.author?.is_verified && (
            <ShieldCheck className="size-3 text-primary shrink-0" />
          )}
        </div>

        <p className="text-xs sm:text-[13px] text-foreground/95 font-medium leading-relaxed line-clamp-4 my-auto">
          {textContent || "Nota publicada"}
        </p>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/30 font-mono">
          <span>{post.created_at ? formatDate(post.created_at) : "Recente"}</span>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-0.5">
              <Heart className="size-3" /> {likesCount}
            </span>
            <span className="inline-flex items-center gap-0.5">
              <MessageCircle className="size-3" /> {commentsCount}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Modo Feed Linear (Instagram Media Card vs Threads Text Card)
  return (
    <article
      className={cn(
        "rounded-2xl border transition-all overflow-hidden",
        hasMedia
          ? "bg-card border-border/60"
          : "bg-gray-50 dark:bg-zinc-900/60 border-border/50 p-4 sm:p-5"
      )}
    >
      {/* Header do Autor */}
      <div
        className={cn(
          "flex items-center justify-between gap-3",
          hasMedia ? "p-3.5 sm:p-4" : "pb-3"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {authorAvatar ? (
            <img
              src={authorAvatar}
              alt={authorName}
              className="size-9 rounded-full object-cover border border-border/40 shrink-0"
            />
          ) : (
            <div className="size-9 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
              {authorName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="inline-flex items-center flex-wrap gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                {authorName}
              </span>
              {post.author?.is_verified && (
                <ShieldCheck className="size-3.5 text-primary fill-primary/15 shrink-0" />
              )}
              {authorUsername && (
                <span className="text-[11px] text-muted-foreground font-mono">
                  @{authorUsername.replace(/^@/, "")}
                </span>
              )}
            </div>
            {post.created_at && (
              <span className="block text-[10px] text-muted-foreground font-mono">
                {formatDate(post.created_at)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Corpo: Se tiver mídia = Card Visual Instagram; Se for apenas texto = Nota Threads */}
      {hasMedia && primaryMedia ? (
        <>
          <div
            onClick={() => onPreviewMedia?.(primaryMedia)}
            className="w-full max-h-[520px] bg-muted/20 overflow-hidden cursor-pointer flex items-center justify-center"
          >
            <img
              src={primaryMedia}
              alt={textContent ? textContent.slice(0, 60) : "Imagem da publicação"}
              className="w-full h-auto max-h-[520px] object-cover"
              loading="lazy"
            />
          </div>
          {textContent && (
            <div className="px-3.5 sm:px-4 pt-3">
              <p className="text-xs sm:text-sm text-foreground/95 leading-relaxed whitespace-pre-line">
                {textContent}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="py-1">
          <p className="text-sm sm:text-[15px] text-foreground font-medium leading-relaxed whitespace-pre-line tracking-tight">
            {textContent}
          </p>
        </div>
      )}

      {/* Barra de Interação */}
      <div
        className={cn(
          "flex items-center justify-between text-xs text-muted-foreground",
          hasMedia
            ? "px-3.5 sm:px-4 py-3 mt-1 border-t border-border/30"
            : "pt-3 mt-3 border-t border-border/40"
        )}
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onSelectPost?.(post)}
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer font-medium"
          >
            <Heart className="size-4" />
            <span>{likesCount}</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectPost?.(post)}
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer font-medium"
          >
            <MessageCircle className="size-4" />
            <span>{commentsCount}</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.share) {
              navigator.share({ title: authorName, text: textContent, url: window.location.href }).catch(() => {});
            }
          }}
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
          aria-label="Compartilhar publicação"
        >
          <Share2 className="size-3.5" />
        </button>
      </div>
    </article>
  );
}
