import * as React from "react";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  ChevronRight,
  Compass,
  Heart,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Star,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isVideoAssetUrl,
  resolveSafeLinkHref,
  useEffectiveViewport,
} from "./viewport-context";

/* ============================================================================
 * 1. VitrineSocialStream — Carrossel, Grade & Feed de Posts Sociais (B.30 / B.33)
 * ============================================================================ */

export interface VitrineSocialPostItem {
  id: string;
  authorName: string;
  authorHandle?: string;
  authorAvatarUrl?: string;
  authorAvatarAlt?: string;
  isVerified?: boolean;
  publishedLabel?: string;
  content: string;
  mediaUrl?: string;
  mediaType?: "none" | "image" | "video";
  mediaAlt?: string;
  likesCount?: number;
  commentsCount?: number;
  ctaLabel?: string;
  href?: string;
}

export interface VitrineSocialStreamProps {
  sectionTitle?: string;
  sectionSubtitle?: string;
  viewAllLabel?: string;
  viewAllHref?: string;
  dataSource?: "store_posts" | "manual";
  maxItems?: number;
  desktopLayout?: "carousel_3col" | "stream_2col" | "grid_3col";
  mobileLayout?: "carousel" | "stream" | "grid_2col";
  defaultAuthorName?: string;
  defaultAuthorHandle?: string;
  defaultAuthorAvatarUrl?: string;
  items?: VitrineSocialPostItem[];
  livePosts?: Array<Record<string, unknown>>;
  className?: string;
}

function mapLivePostsToItems(
  livePosts: Array<Record<string, unknown>> | undefined,
  fallbackAuthor?: { name?: string; handle?: string; avatarUrl?: string },
): VitrineSocialPostItem[] {
  if (!Array.isArray(livePosts)) return [];
  return livePosts
    .map((raw, idx): VitrineSocialPostItem | null => {
      const content =
        (typeof raw.content === "string" && raw.content.trim()) ||
        (typeof raw.caption === "string" && raw.caption.trim()) ||
        (typeof raw.body === "string" && raw.body.trim()) ||
        (typeof raw.title === "string" && raw.title.trim()) ||
        "";
      const mediaArr = Array.isArray(raw.media_urls)
        ? raw.media_urls
        : Array.isArray(raw.images)
          ? raw.images
          : [];
      const firstMedia =
        typeof mediaArr[0] === "string"
          ? mediaArr[0]
          : typeof raw.media_url === "string"
            ? raw.media_url
            : typeof raw.image_url === "string"
              ? raw.image_url
              : "";

      if (!content && !firstMedia) return null;

      const authorObj =
        raw.author && typeof raw.author === "object"
          ? (raw.author as Record<string, unknown>)
          : {};
      const authorName =
        (typeof raw.author_name === "string" && raw.author_name) ||
        (typeof authorObj.name === "string" && authorObj.name) ||
        fallbackAuthor?.name ||
        "Publicação Oficial";
      const authorHandle =
        (typeof raw.author_handle === "string" && raw.author_handle) ||
        (typeof authorObj.username === "string" && `@${authorObj.username}`) ||
        fallbackAuthor?.handle ||
        undefined;
      const authorAvatarUrl =
        (typeof raw.author_avatar_url === "string" && raw.author_avatar_url) ||
        (typeof authorObj.avatar_url === "string" && authorObj.avatar_url) ||
        fallbackAuthor?.avatarUrl ||
        undefined;
      const isVid = isVideoAssetUrl(firstMedia, typeof raw.media_type === "string" ? raw.media_type : undefined);
      const id = typeof raw.id === "string" ? raw.id : `post-${idx}`;

      return {
        id,
        authorName,
        authorHandle,
        authorAvatarUrl,
        authorAvatarAlt: authorName,
        isVerified: Boolean(raw.is_verified ?? authorObj.is_verified),
        publishedLabel: typeof raw.relative_time === "string" ? raw.relative_time : undefined,
        content,
        mediaUrl: firstMedia || undefined,
        mediaType: firstMedia ? (isVid ? "video" : "image") : "none",
        mediaAlt: content ? content.slice(0, 80) : `Publicação de ${authorName}`,
        likesCount: typeof raw.likes_count === "number" ? raw.likes_count : undefined,
        commentsCount: typeof raw.comments_count === "number" ? raw.comments_count : undefined,
        ctaLabel: "Abrir Post",
        href: `/feed`,
      };
    })
    .filter((item): item is VitrineSocialPostItem => item !== null);
}

export function VitrineSocialStream({
  sectionTitle = "Publicações & Novidades",
  sectionSubtitle,
  viewAllLabel,
  viewAllHref,
  dataSource = "store_posts",
  maxItems = 6,
  desktopLayout = "carousel_3col",
  mobileLayout = "carousel",
  defaultAuthorName,
  defaultAuthorHandle,
  defaultAuthorAvatarUrl,
  items = [],
  livePosts,
  className,
}: VitrineSocialStreamProps) {
  const { isMobile, isEditorCanvas } = useEffectiveViewport();

  const resolvedPosts = React.useMemo(() => {
    if (dataSource === "store_posts") {
      const mapped = mapLivePostsToItems(livePosts, {
        name: defaultAuthorName,
        handle: defaultAuthorHandle,
        avatarUrl: defaultAuthorAvatarUrl,
      });
      if (mapped.length > 0) return mapped.slice(0, Math.max(1, maxItems));
    }
    return (Array.isArray(items) ? items : []).slice(0, Math.max(1, maxItems));
  }, [
    dataSource,
    defaultAuthorAvatarUrl,
    defaultAuthorHandle,
    defaultAuthorName,
    items,
    livePosts,
    maxItems,
  ]);

  const safeViewAllHref = isEditorCanvas ? undefined : resolveSafeLinkHref(viewAllHref);

  if (resolvedPosts.length === 0) {
    return (
      <section className={cn("w-full py-4", className)} aria-label={sectionTitle}>
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 flex flex-col items-center justify-center text-center gap-2">
          <MessageCircle className="size-8 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">
            Nenhuma publicação disponível neste mural
          </p>
          <p className="text-xs text-muted-foreground max-w-md">
            Publique novidades no mural da loja ou adicione posts curados manualmente.
          </p>
        </div>
      </section>
    );
  }

  const renderPostCard = (post: VitrineSocialPostItem, idx: number, compactGrid = false) => {
    const safeHref = isEditorCanvas ? undefined : resolveSafeLinkHref(post.href);
    const hasMedia = Boolean(post.mediaUrl && post.mediaType !== "none");
    const isVideo = hasMedia && isVideoAssetUrl(post.mediaUrl, post.mediaType);
    const initial = (post.authorName || "W").trim().charAt(0).toUpperCase();

    return (
      <article
        key={post.id || idx}
        className="group rounded-lg border border-border/70 bg-card overflow-hidden flex flex-col justify-between h-full hover:border-primary/50 transition-colors duration-150 motion-reduce:transition-none"
      >
        <div>
          {/* Cabeçalho Social Canônico (Invariante B.27 / B.30) */}
          <div className="p-3 sm:p-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-10 rounded-full overflow-hidden bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-border/60">
                {post.authorAvatarUrl ? (
                  <img
                    src={post.authorAvatarUrl}
                    alt={post.authorAvatarAlt || post.authorName}
                    loading="lazy"
                    className="size-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span>{initial}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                    {post.authorName}
                  </span>
                  {post.isVerified && (
                    <ShieldCheck className="size-4 text-primary shrink-0" />
                  )}
                </div>
                {(post.authorHandle || post.publishedLabel) && (
                  <p className="text-xs text-muted-foreground truncate">
                    {[post.authorHandle, post.publishedLabel].filter(Boolean).join(" • ")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Mídia 3:4 / Vídeo Nativo OU Cartão Textual Limpo (Invariante B.33) */}
          {hasMedia && post.mediaUrl ? (
            <div className="relative aspect-post-portrait w-full overflow-hidden bg-muted/30 border-y border-border/40">
              {isVideo ? (
                <video
                  src={post.mediaUrl}
                  muted
                  playsInline
                  controls
                  className="size-full object-cover"
                />
              ) : (
                <img
                  src={post.mediaUrl}
                  alt={post.mediaAlt || post.authorName}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-200 motion-reduce:transition-none group-hover:scale-105"
                />
              )}
            </div>
          ) : (
            <div className="mx-3 sm:mx-4 mb-3 p-4 rounded-lg bg-muted/40 border border-border/50">
              <p className="text-sm sm:text-base font-medium text-foreground leading-relaxed whitespace-pre-line break-words">
                {post.content}
              </p>
            </div>
          )}

          {hasMedia && post.content && !compactGrid && (
            <div className="p-3 sm:p-4 pb-2">
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed line-clamp-3 whitespace-pre-line break-words">
                {post.content}
              </p>
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4 pt-2 flex items-center justify-between gap-2 border-t border-border/40 mt-auto">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {typeof post.likesCount === "number" && post.likesCount > 0 && (
              <span className="inline-flex items-center gap-1 font-medium">
                <Heart className="size-3.5" />
                <span>{post.likesCount}</span>
              </span>
            )}
            {typeof post.commentsCount === "number" && post.commentsCount > 0 && (
              <span className="inline-flex items-center gap-1 font-medium">
                <MessageCircle className="size-3.5" />
                <span>{post.commentsCount}</span>
              </span>
            )}
          </div>

          {safeHref ? (
            <a
              href={safeHref}
              className="h-11 min-h-11 px-3 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground text-foreground text-xs font-bold inline-flex items-center gap-1 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>{post.ctaLabel || "Ver Post"}</span>
              <ArrowRight className="size-3.5" />
            </a>
          ) : post.ctaLabel ? (
            <span className="h-11 min-h-11 px-3 rounded-lg bg-muted text-foreground text-xs font-bold inline-flex items-center gap-1">
              <span>{post.ctaLabel}</span>
            </span>
          ) : null}
        </div>
      </article>
    );
  };

  return (
    <section className={cn("w-full py-4 space-y-4", className)} aria-label={sectionTitle}>
      {(sectionTitle || sectionSubtitle || viewAllLabel) && (
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1 min-w-0">
            {sectionTitle && (
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground break-words">
                {sectionTitle}
              </h2>
            )}
            {sectionSubtitle && (
              <p className="text-xs sm:text-sm text-muted-foreground">{sectionSubtitle}</p>
            )}
          </div>
          {viewAllLabel && safeViewAllHref && (
            <a
              href={safeViewAllHref}
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 inline-flex items-center gap-1 shrink-0 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>{viewAllLabel}</span>
              <ChevronRight className="size-4" />
            </a>
          )}
        </div>
      )}

      {isMobile ? (
        mobileLayout === "stream" ? (
          <div className="space-y-4">
            {resolvedPosts.map((post, idx) => renderPostCard(post, idx, false))}
          </div>
        ) : mobileLayout === "grid_2col" ? (
          <div className="grid grid-cols-2 gap-3">
            {resolvedPosts.map((post, idx) => renderPostCard(post, idx, true))}
          </div>
        ) : (
          <div className="carousel flex flex-nowrap items-stretch gap-3 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory">
            {resolvedPosts.map((post, idx) => (
              <div key={post.id || idx} className="w-72 shrink-0 snap-start">
                {renderPostCard(post, idx, false)}
              </div>
            ))}
          </div>
        )
      ) : desktopLayout === "stream_2col" ? (
        <div className="grid grid-cols-2 gap-4">
          {resolvedPosts.map((post, idx) => renderPostCard(post, idx, false))}
        </div>
      ) : desktopLayout === "grid_3col" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {resolvedPosts.map((post, idx) => renderPostCard(post, idx, true))}
        </div>
      ) : (
        <div className="carousel flex flex-nowrap items-stretch gap-4 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory">
          {resolvedPosts.map((post, idx) => (
            <div key={post.id || idx} className="w-80 shrink-0 snap-start">
              {renderPostCard(post, idx, false)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ============================================================================
 * 2. VitrineEcosystemRail — Módulos do Ecossistema (Eventos, Vagas, Lojas, Hotpages)
 * ============================================================================ */

export type VitrineEcosystemModuleType = "events" | "jobs" | "stores" | "hotpages";

export interface VitrineEcosystemItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  metaPrimary?: string;
  metaSecondary?: string;
  imageUrl?: string;
  imageAlt?: string;
  avatarUrl?: string;
  avatarAlt?: string;
  isVerified?: boolean;
  rating?: number;
  reviewCount?: number;
  ctaLabel?: string;
  href?: string;
}

export interface VitrineEcosystemRailProps {
  sectionTitle?: string;
  sectionSubtitle?: string;
  viewAllLabel?: string;
  viewAllHref?: string;
  moduleType?: VitrineEcosystemModuleType;
  dataSource?: "live" | "manual";
  maxItems?: number;
  desktopLayout?: "horizontal_rail" | "grid_3col" | "grid_4col";
  mobileLayout?: "horizontal_rail" | "stack";
  items?: VitrineEcosystemItem[];
  liveEvents?: Array<Record<string, unknown>>;
  liveJobs?: Array<Record<string, unknown>>;
  liveStores?: Array<Record<string, unknown>>;
  liveHotpages?: Array<Record<string, unknown>>;
  className?: string;
}

function mapLiveEcosystemItems(
  moduleType: VitrineEcosystemModuleType,
  sources: {
    events?: Array<Record<string, unknown>>;
    jobs?: Array<Record<string, unknown>>;
    stores?: Array<Record<string, unknown>>;
    hotpages?: Array<Record<string, unknown>>;
  },
): VitrineEcosystemItem[] {
  if (moduleType === "jobs") {
    return (sources.jobs || [])
      .map((raw, idx): VitrineEcosystemItem | null => {
        const title = typeof raw.title === "string" ? raw.title.trim() : "";
        if (!title) return null;
        const id = typeof raw.id === "string" ? raw.id : `job-${idx}`;
        const modality =
          typeof raw.work_model === "string"
            ? raw.work_model
            : typeof raw.employment_type === "string"
              ? raw.employment_type
              : "Vaga Aberta";
        const loc =
          typeof raw.city === "string"
            ? raw.city
            : typeof raw.location === "string"
              ? raw.location
              : undefined;
        return {
          id,
          title,
          subtitle: typeof raw.company_name === "string" ? raw.company_name : undefined,
          badge: modality,
          metaPrimary: loc,
          metaSecondary: typeof raw.salary_display === "string" ? raw.salary_display : undefined,
          ctaLabel: "Ver Vaga",
          href: `/empregos/${id}`,
        };
      })
      .filter((item): item is VitrineEcosystemItem => item !== null);
  }

  if (moduleType === "events") {
    return (sources.events || [])
      .map((raw, idx): VitrineEcosystemItem | null => {
        const title = typeof raw.title === "string" ? raw.title.trim() : "";
        if (!title) return null;
        const id = typeof raw.id === "string" ? raw.id : `event-${idx}`;
        const cover =
          (typeof raw.cover_image === "string" && raw.cover_image) ||
          (typeof raw.banner_url === "string" && raw.banner_url) ||
          undefined;
        return {
          id,
          title,
          subtitle: typeof raw.venue_name === "string" ? raw.venue_name : undefined,
          badge: typeof raw.date_display === "string" ? raw.date_display : "Agenda",
          metaPrimary: typeof raw.city === "string" ? raw.city : undefined,
          imageUrl: cover,
          imageAlt: title,
          ctaLabel: "Ver Evento",
          href: `/eventos/${id}`,
        };
      })
      .filter((item): item is VitrineEcosystemItem => item !== null);
  }

  if (moduleType === "stores") {
    return (sources.stores || [])
      .map((raw, idx): VitrineEcosystemItem | null => {
        const name =
          (typeof raw.name === "string" && raw.name.trim()) ||
          (typeof raw.business_name === "string" && raw.business_name.trim()) ||
          "";
        if (!name) return null;
        const id = typeof raw.id === "string" ? raw.id : `store-${idx}`;
        const slug = typeof raw.slug === "string" && raw.slug ? raw.slug : "";
        const reviewCount = typeof raw.review_count === "number" ? raw.review_count : 0;
        const rating =
          reviewCount > 0 && typeof raw.rating === "number" && raw.rating > 0
            ? raw.rating
            : undefined;
        return {
          id,
          title: name,
          subtitle: typeof raw.category === "string" ? raw.category : "Comércio Local",
          imageUrl: typeof raw.banner_url === "string" ? raw.banner_url : undefined,
          imageAlt: name,
          avatarUrl: typeof raw.avatar_url === "string" ? raw.avatar_url : undefined,
          avatarAlt: name,
          isVerified: Boolean(raw.is_verified),
          rating,
          reviewCount,
          ctaLabel: "Ver Empresa",
          href: slug ? `/loja/${slug}` : `/diretorio/${id}`,
        };
      })
      .filter((item): item is VitrineEcosystemItem => item !== null);
  }

  return (sources.hotpages || [])
    .map((raw, idx): VitrineEcosystemItem | null => {
      const title = typeof raw.title === "string" ? raw.title.trim() : "";
      if (!title) return null;
      const slug = typeof raw.slug === "string" ? raw.slug : "";
      return {
        id: typeof raw.id === "string" ? raw.id : `hp-${idx}`,
        title,
        subtitle: typeof raw.subtitle === "string" ? raw.subtitle : undefined,
        badge: typeof raw.badge_label === "string" ? raw.badge_label : undefined,
        imageUrl: typeof raw.bg_media_url === "string" ? raw.bg_media_url : undefined,
        imageAlt: title,
        ctaLabel: "Explorar",
        href:
          (typeof raw.target_route === "string" && raw.target_route) ||
          (slug ? `/paginas/${slug}` : undefined),
      };
    })
    .filter((item): item is VitrineEcosystemItem => item !== null);
}

export function VitrineEcosystemRail({
  sectionTitle = "Destaques do Ecossistema",
  sectionSubtitle,
  viewAllLabel,
  viewAllHref,
  moduleType = "events",
  dataSource = "live",
  maxItems = 6,
  desktopLayout = "horizontal_rail",
  mobileLayout = "horizontal_rail",
  items = [],
  liveEvents,
  liveJobs,
  liveStores,
  liveHotpages,
  className,
}: VitrineEcosystemRailProps) {
  const { isMobile, isEditorCanvas } = useEffectiveViewport();

  const resolvedItems = React.useMemo(() => {
    if (dataSource === "live") {
      const mapped = mapLiveEcosystemItems(moduleType, {
        events: liveEvents,
        jobs: liveJobs,
        stores: liveStores,
        hotpages: liveHotpages,
      });
      if (mapped.length > 0) return mapped.slice(0, Math.max(1, maxItems));
    }
    return (Array.isArray(items) ? items : []).slice(0, Math.max(1, maxItems));
  }, [dataSource, items, liveEvents, liveHotpages, liveJobs, liveStores, maxItems, moduleType]);

  const safeViewAllHref = isEditorCanvas ? undefined : resolveSafeLinkHref(viewAllHref);

  const ModuleIcon =
    moduleType === "jobs"
      ? Briefcase
      : moduleType === "stores"
        ? Store
        : moduleType === "hotpages"
          ? Compass
          : Calendar;

  if (resolvedItems.length === 0) {
    return (
      <section className={cn("w-full py-4", className)} aria-label={sectionTitle}>
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 flex flex-col items-center justify-center text-center gap-2">
          <ModuleIcon className="size-8 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">
            Nenhum item disponível nesta conexão
          </p>
          <p className="text-xs text-muted-foreground max-w-md">
            Conecte registros ativos de {moduleType === "jobs" ? "vagas" : moduleType === "stores" ? "empresas" : moduleType === "hotpages" ? "páginas especiais" : "eventos"} ou adicione cards manualmente.
          </p>
        </div>
      </section>
    );
  }

  const defaultCta =
    moduleType === "jobs"
      ? "Ver Vaga"
      : moduleType === "stores"
        ? "Ver Empresa"
        : moduleType === "hotpages"
          ? "Acessar"
          : "Ver Evento";

  const renderEcosystemCard = (item: VitrineEcosystemItem, idx: number) => {
    const safeHref = isEditorCanvas ? undefined : resolveSafeLinkHref(item.href);
    const hasHonestRating =
      moduleType === "stores" &&
      typeof item.rating === "number" &&
      item.rating > 0 &&
      typeof item.reviewCount === "number" &&
      item.reviewCount > 0;

    return (
      <div
        key={item.id || idx}
        className="group rounded-lg border border-border/70 bg-card overflow-hidden flex flex-col justify-between h-full hover:border-primary/50 transition-colors duration-150 motion-reduce:transition-none"
      >
        <div>
          {(item.imageUrl || moduleType === "stores" || moduleType === "events") && (
            <div className="relative h-32 w-full overflow-hidden bg-muted/40 flex items-center justify-center">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.imageAlt || item.title}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-200 motion-reduce:transition-none group-hover:scale-105"
                />
              ) : (
                <ModuleIcon className="size-8 text-muted-foreground/40" />
              )}
              {item.badge && (
                <span className="absolute top-2 left-2 px-2 py-1 rounded-md bg-background/90 backdrop-blur-md text-foreground text-xs font-bold">
                  {item.badge}
                </span>
              )}
            </div>
          )}

          <div className="p-4 space-y-2">
            {moduleType === "stores" && item.avatarUrl && (
              <div className="size-12 rounded-lg overflow-hidden bg-background border border-border -mt-10 relative z-10">
                <img
                  src={item.avatarUrl}
                  alt={item.avatarAlt || item.title}
                  loading="lazy"
                  className="size-full object-cover"
                />
              </div>
            )}

            {!item.imageUrl && moduleType === "jobs" && item.badge && (
              <span className="inline-block px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-bold">
                {item.badge}
              </span>
            )}

            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm sm:text-base font-bold text-foreground line-clamp-2 leading-snug break-words text-wrap">
                {item.title}
              </h3>
              {item.isVerified && (
                <ShieldCheck className="size-4 text-primary shrink-0 mt-1" />
              )}
            </div>

            {item.subtitle && (
              <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                {item.subtitle}
              </p>
            )}

            {/* Honestidade Estrita em Lojas & Métricas (Invariante B.33) */}
            {moduleType === "stores" && (
              <div className="flex items-center gap-2 text-xs pt-1">
                {hasHonestRating ? (
                  <span className="inline-flex items-center gap-1 font-bold text-foreground">
                    <Star className="size-3.5 text-primary fill-primary" />
                    <span>{item.rating!.toFixed(1)}</span>
                    <span className="text-muted-foreground font-normal">
                      ({item.reviewCount})
                    </span>
                  </span>
                ) : item.isVerified ? (
                  <span className="inline-flex items-center gap-1 text-primary font-semibold">
                    <ShieldCheck className="size-3.5" />
                    <span>Empresa Verificada</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Parceiro Local</span>
                )}
              </div>
            )}

            {(item.metaPrimary || item.metaSecondary) && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
                {item.metaPrimary && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5 shrink-0" />
                    <span>{item.metaPrimary}</span>
                  </span>
                )}
                {item.metaSecondary && (
                  <span className="px-2 py-1 rounded-md bg-muted text-foreground font-semibold">
                    {item.metaSecondary}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 pt-0">
          {safeHref ? (
            <a
              href={safeHref}
              className="w-full h-11 min-h-11 px-4 rounded-lg bg-muted/70 group-hover:bg-primary group-hover:text-primary-foreground text-foreground text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>{item.ctaLabel || defaultCta}</span>
              <ArrowRight className="size-4 shrink-0" />
            </a>
          ) : (
            <span className="w-full h-11 min-h-11 px-4 rounded-lg bg-muted/70 text-foreground text-xs font-bold inline-flex items-center justify-center gap-2">
              <span>{item.ctaLabel || defaultCta}</span>
              <ArrowRight className="size-4 shrink-0" />
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className={cn("w-full py-4 space-y-4", className)} aria-label={sectionTitle}>
      {(sectionTitle || sectionSubtitle || viewAllLabel) && (
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1 min-w-0">
            {sectionTitle && (
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground break-words">
                {sectionTitle}
              </h2>
            )}
            {sectionSubtitle && (
              <p className="text-xs sm:text-sm text-muted-foreground">{sectionSubtitle}</p>
            )}
          </div>
          {viewAllLabel && safeViewAllHref && (
            <a
              href={safeViewAllHref}
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 inline-flex items-center gap-1 shrink-0 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>{viewAllLabel}</span>
              <ChevronRight className="size-4" />
            </a>
          )}
        </div>
      )}

      {isMobile ? (
        mobileLayout === "stack" ? (
          <div className="grid grid-cols-1 gap-3">
            {resolvedItems.map((item, idx) => renderEcosystemCard(item, idx))}
          </div>
        ) : (
          <div className="carousel flex flex-nowrap items-stretch gap-3 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory">
            {resolvedItems.map((item, idx) => (
              <div key={item.id || idx} className="w-64 shrink-0 snap-start">
                {renderEcosystemCard(item, idx)}
              </div>
            ))}
          </div>
        )
      ) : desktopLayout === "grid_3col" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {resolvedItems.map((item, idx) => renderEcosystemCard(item, idx))}
        </div>
      ) : desktopLayout === "grid_4col" ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {resolvedItems.map((item, idx) => renderEcosystemCard(item, idx))}
        </div>
      ) : (
        <div className="carousel flex flex-nowrap items-stretch gap-4 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory">
          {resolvedItems.map((item, idx) => (
            <div key={item.id || idx} className="w-72 shrink-0 snap-start">
              {renderEcosystemCard(item, idx)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
