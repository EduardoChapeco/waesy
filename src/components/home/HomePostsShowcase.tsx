import React from "react";
import { Link } from "@tanstack/react-router";
import {
  UserCircle,
  CheckCircle,
  ArrowRight,
  Heart,
  ChatCircleDots,
  ShareNetwork,
  MapPin,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/datetime";
import {
  type NormalizedShowcasePost,
  isHealthyImageUrl,
} from "@/services/admin-home-cms.functions";
import { RichPostContent } from "@/components/community/rich-post-content";
import { Quote } from "lucide-react";

function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  const lower = url.toLowerCase();
  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".mov") ||
    clean.endsWith(".quicktime") ||
    clean.endsWith(".m4v") ||
    clean.endsWith(".ogg") ||
    clean.endsWith(".avi") ||
    clean.endsWith(".mkv") ||
    clean.includes("video") ||
    lower.includes(".mp4") ||
    lower.includes(".webm") ||
    lower.includes(".mov") ||
    lower.includes("/video/") ||
    lower.includes("video=")
  );
}

export interface HomePostsShowcaseProps {
  posts: NormalizedShowcasePost[];
  title?: string;
  subtitle?: string;
  showTitle?: boolean;
  showSubtitle?: boolean;
  actionTo?: string;
  className?: string;
}

export function HomePostsShowcase({
  posts,
  title = "Feed da Cidade",
  subtitle = "Publicações e acontecimentos locais",
  showTitle = true,
  showSubtitle = true,
  actionTo = "/feed",
  className,
}: HomePostsShowcaseProps) {
  if (!posts || posts.length === 0) return null;

  return (
    <section className={cn("w-full space-y-3", className)} aria-label={title}>
      {/* ── Cabeçalho do Trilho Social ── */}
      {showTitle && (
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              {title}
            </h2>
            {showSubtitle && subtitle && (
              <p className="text-xs text-muted-foreground line-clamp-1">{subtitle}</p>
            )}
          </div>
          {actionTo && (
            <Link
              to={actionTo as any}
              className="inline-flex items-center justify-center min-h-11 px-3 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>Ver mais</span>
            </Link>
          )}
        </div>
      )}

      {/* ── Stream Minimalista de Publicações e Notícias (Zero Quebra / Zero Fakes) ── */}
      <div
        className="carousel -mx-2 px-2 sm:mx-0 sm:px-0 w-full flex overflow-x-auto snap-x mandatory no-scrollbar gap-3 sm:gap-4 py-1 focus:outline-none select-none"
        tabIndex={0}
        role="region"
        aria-label="Feed de Publicações"
      >
        {posts.map((post, idx) => {
          const hasAvatar = isHealthyImageUrl(post.authorAvatar);
          const rawMediaList =
            Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0
              ? post.mediaUrls.filter((u) => isHealthyImageUrl(u))
              : isHealthyImageUrl(post.coverUrl)
                ? [post.coverUrl!]
                : [];
          // Invariante Anti-Fake: Se o post não tem foto/vídeo real, lista de mídia fica VAZIA
          const mediaList = rawMediaList.filter(Boolean);
          const isNews = post.postType === "news" || post.category === "Notícia";
          const displayText = post.summary || post.title || "";

          return (
            <Link
              key={post.id || idx}
              to={post.targetUrl as any}
              className={cn(
                "snap-start shrink-0 w-80 sm:w-92 group flex flex-col justify-between p-4 rounded-lg bg-card border border-border/60",
                "hover:border-foreground/30 transition-colors duration-300 motion-reduce:transition-none h-105 select-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              )}
            >
              <div className="flex-1 flex flex-col min-h-0 space-y-2">
                {/* 1. Cabeçalho Minimalista: Avatar Circular + Nome + Verificado + Tempo na mesma linha */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="size-9 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0 border border-border/50 relative">
                    <UserCircle size={22} className="text-muted-foreground/60 absolute" />
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-foreground break-words text-wrap truncate">
                        {post.authorName || "Membro da comunidade"}
                      </span>
                      {post.isVerified && (
                        <CheckCircle size={14} weight="fill" className="text-info shrink-0" />
                      )}
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatRelativeTime(post.publishedAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground break-words text-wrap">
                      {post.locationName ? (
                        <span className="inline-flex items-center gap-1 break-words text-wrap truncate">
                          <MapPin size={11} className="text-primary shrink-0" />
                          <span className="break-words text-wrap truncate">{post.locationName}</span>
                        </span>
                      ) : post.authorHandle ? (
                        <span className="break-words text-wrap text-muted-foreground/80 truncate">
                          {post.authorHandle.startsWith("@")
                            ? post.authorHandle
                            : `@${post.authorHandle}`}
                        </span>
                      ) : (
                        <span>{post.category || "Comunidade"}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Conteúdo Condicional: Com Mídia vs Puro Editorial de Texto */}
                {mediaList.length > 0 ? (
                  <div className="flex-1 flex flex-col justify-between min-h-0">
                    {/* Texto Teaser Compacto */}
                    <div className="space-y-1 shrink-0">
                      {isNews && post.title && (
                        <h3 className="text-sm font-bold text-foreground line-clamp-1 leading-snug group-hover:text-primary transition-colors">
                          {post.title}
                        </h3>
                      )}
                      <div className="text-xs sm:text-sm text-foreground/90 leading-snug line-clamp-2">
                        <RichPostContent
                          content={displayText}
                          isExpanded={false}
                          maxCharacters={120}
                        />
                      </div>
                    </div>

                    {/* Mídia Contida em Altura Canônica Disciplinada (h-52 / 208px) — Zero Explosão de Altura */}
                    {mediaList.length > 1 ? (
                      <div className="carousel flex gap-2 overflow-x-auto no-scrollbar pb-1 h-52 shrink-0 mt-2">
                        {mediaList.slice(0, 6).map((mediaUrl, mIdx) => (
                          <div
                            key={mIdx}
                            className="h-full aspect-3/4 rounded-lg overflow-hidden bg-muted/30 border border-border/40 shrink-0 relative"
                          >
                            {isVideoUrl(mediaUrl) ? (
                              <video
                                src={mediaUrl}
                                controls={false}
                                muted
                                playsInline
                                loop
                                preload="metadata"
                                className="size-full object-cover"
                              />
                            ) : (
                              <img
                                src={mediaUrl}
                                alt={post.title}
                                loading="lazy"
                                className="size-full object-cover group-hover:scale-102 transition-transform duration-300 motion-reduce:transition-none"
                                onError={(e) => {
                                  (e.currentTarget.parentElement as HTMLElement)?.style.setProperty("display", "none");
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="relative w-full h-52 rounded-lg overflow-hidden bg-muted/80 border border-border/40 flex items-center justify-center group/media mt-2 shrink-0">
                        {isVideoUrl(mediaList[0]) ? (
                          <>
                            <video
                              src={mediaList[0]}
                              aria-hidden="true"
                              className="absolute inset-0 size-full object-cover blur-xl opacity-20 scale-125 pointer-events-none select-none"
                            />
                            <video
                              src={mediaList[0]}
                              controls
                              playsInline
                              preload="metadata"
                              className="relative z-10 max-h-full max-w-full h-auto w-auto object-contain mx-auto"
                            />
                          </>
                        ) : (
                          <>
                            <img
                              src={mediaList[0]}
                              alt=""
                              aria-hidden="true"
                              className="absolute inset-0 size-full object-cover blur-xl opacity-25 scale-125 pointer-events-none select-none"
                            />
                            <img
                              src={mediaList[0]}
                              alt={post.title || ""}
                              loading="lazy"
                              className="relative z-10 max-h-full max-w-full h-auto w-auto object-contain mx-auto group-hover/media:scale-102 transition-transform duration-300 motion-reduce:transition-none"
                              onError={(e) => {
                                (e.currentTarget.parentElement as HTMLElement)?.style.setProperty("display", "none");
                              }}
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* 3. Card Editorial Textual Elegante (Preenche o Vazio com Tipografia de Alta Classe) */
                  <div className="flex-1 flex flex-col justify-between rounded-lg bg-muted/20 border border-border/40 p-4 my-1">
                    <div className="space-y-2">
                      <Quote className="size-5 text-primary/40 -scale-x-100" />
                      {isNews && post.title && (
                        <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                          {post.title}
                        </h3>
                      )}
                      <p className="text-sm sm:text-base text-foreground/90 leading-relaxed line-clamp-6 italic font-serif">
                        "{displayText}"
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-primary inline-flex items-center gap-1 pt-2 border-t border-border/30">
                      <span>Ler publicação completa</span>
                      <ArrowRight size={13} weight="bold" />
                    </span>
                  </div>
                )}
              </div>

              {/* 4. Barra de Ações Minimalista e Tátil (Piso 44px — Invariante B.30) */}
              <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between min-h-11 text-muted-foreground">
                <div className="flex items-center gap-4 text-xs">
                  <span className="inline-flex items-center gap-1 font-medium group-hover:text-foreground transition-colors">
                    <Heart size={16} />
                    {(post.likesCount ?? 0) > 0 && <span>{post.likesCount}</span>}
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium group-hover:text-foreground transition-colors">
                    <ChatCircleDots size={16} />
                    {(post.commentsCount ?? 0) > 0 && <span>{post.commentsCount}</span>}
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium group-hover:text-foreground transition-colors">
                    <ShareNetwork size={16} />
                  </span>
                </div>

                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  <span>{isNews ? "Ler matéria" : "Ver post"}</span>
                  <ArrowRight
                    size={14}
                    weight="bold"
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
