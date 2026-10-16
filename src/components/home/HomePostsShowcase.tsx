import React from "react";
import { Link } from "@tanstack/react-router";
import { Clock, UserCircle, CheckCircle, ArrowRight, Heart, ChatCircleDots } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/datetime";
import {
  type NormalizedShowcasePost,
  resolveHealthyCover,
  isHealthyImageUrl,
} from "@/services/admin-home-cms.functions";

export interface HomePostsShowcaseProps {
  posts: NormalizedShowcasePost[];
  title?: string;
  subtitle?: string;
  actionTo?: string;
  className?: string;
}

export function HomePostsShowcase({
  posts,
  title = "Feed da Cidade",
  subtitle = "Publicações e acontecimentos locais",
  actionTo = "/feed",
  className,
}: HomePostsShowcaseProps) {
  if (!posts || posts.length === 0) return null;

  return (
    <section className={cn("w-full space-y-3", className)} aria-label={title}>
      {/* ── Cabeçalho do Trilho Social ── */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground line-clamp-1">{subtitle}</p>
          )}
        </div>
        {actionTo && (
          <Link
            to={actionTo as any}
            className="inline-flex items-center justify-center h-8 px-3 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>Ver mais</span>
          </Link>
        )}
      </div>

      {/* ── Trilho Horizontal com Trava Anti-Jank de Mídia e Zero Quebra (Invariante B.30) ── */}
      <div
        className="carousel -mx-2 px-2 sm:mx-0 sm:px-0 w-full flex overflow-x-auto snap-x mandatory no-scrollbar gap-3 sm:gap-4 py-1 focus:outline-none select-none"
        tabIndex={0}
        role="region"
        aria-label="Feed de Publicações"
      >
        {posts.map((post, idx) => {
          const cover = resolveHealthyCover(post.coverUrl, idx);
          const hasAvatar = isHealthyImageUrl(post.authorAvatar);

          return (
            <Link
              key={post.id || idx}
              to={post.targetUrl as any}
              className={cn(
                "snap-start shrink-0 w-72 sm:w-80 group flex flex-col justify-between p-3 rounded-lg bg-card border border-border/60",
                "hover:border-foreground/30 transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              )}
            >
              {/* Autor, Avatar com Fallback Direto, Handle e Data Relativa (Invariante B.27 / B.30) */}
              <div className="flex items-center gap-2 mb-2">
                <div className="size-8 rounded-lg bg-muted/60 overflow-hidden flex items-center justify-center shrink-0 border border-border/40 relative">
                  <UserCircle size={20} className="text-muted-foreground/60 absolute" />
                  {hasAvatar && (
                    <img
                      src={post.authorAvatar!}
                      alt=""
                      className="size-full object-cover relative z-10"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-foreground truncate">
                      {post.authorName || "Membro da comunidade"}
                    </span>
                    {post.isVerified && (
                      <CheckCircle size={14} weight="fill" className="text-primary shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-3xs text-muted-foreground">
                    {post.authorHandle && (
                      <span className="font-mono text-muted-foreground/80 truncate">
                        {post.authorHandle.startsWith("@") ? post.authorHandle : `@${post.authorHandle}`}
                      </span>
                    )}
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      <span>{formatRelativeTime(post.publishedAt)}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Mídia com proporção rígida e capa garantida (Zero Imagem Quebrada) */}
              <div className="relative w-full aspect-post-card rounded-lg overflow-hidden bg-muted/30 mb-2">
                <img
                  src={cover}
                  alt={post.title}
                  loading="lazy"
                  className="size-full object-cover group-hover:scale-102 transition-transform duration-300 motion-reduce:transition-none"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80";
                  }}
                />
                <div className="absolute top-2 left-2">
                  <Badge
                    variant="secondary"
                    className="bg-background/90 text-foreground text-3xs font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-border/40"
                  >
                    {post.category || "Destaque"}
                  </Badge>
                </div>
              </div>

              {/* Conteúdo textual conciso sem prolixidade de IA */}
              <div className="space-y-1">
                <h3 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                  {post.title}
                </h3>
                {post.summary && post.summary !== post.title && (
                  <p className="text-2xs sm:text-xs text-muted-foreground line-clamp-1 leading-normal">
                    {post.summary}
                  </p>
                )}
              </div>

              {/* Contadores de Engajamento Sociais (Invariante B.30) */}
              <div className="flex items-center gap-3 text-2xs text-muted-foreground mt-2">
                <span className="inline-flex items-center gap-1 font-medium">
                  <Heart size={13} className="text-muted-foreground/80" />
                  <span>{post.likesCount ?? 0}</span>
                </span>
                <span className="inline-flex items-center gap-1 font-medium">
                  <ChatCircleDots size={13} className="text-muted-foreground/80" />
                  <span>{post.commentsCount ?? 0}</span>
                </span>
              </div>

              {/* CTA Tátil Inferior (Piso 44px) */}
              <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-primary">
                <span>Ver publicação</span>
                <ArrowRight size={14} weight="bold" className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

