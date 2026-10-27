import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageSquare, Share2, Bookmark, MapPin, MoreHorizontal, Calendar, ShoppingBag, ExternalLink, ChevronLeft, ChevronRight, Layers, Utensils, Navigation, Tag, Newspaper, ArrowRight, Phone, Volume2, Compass, Radio, Eye, ShieldCheck, Plane, CheckCircle2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MuralFeedItem } from "@/services/social.functions";
import { togglePostLike } from "@/services/social.functions";
import { formatMoney } from "@/lib/money";
import { formatRelativeTime } from "@/lib/datetime";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ContentActionsMenu } from "@/components/common/content-actions-menu";
import { PostCommentsDrawer } from "@/components/community/post-comments-drawer";
import { MediaLightboxModal } from "@/components/community/media-lightbox-modal";
import { MediaCarousel } from "@/components/community/MediaCarousel";
import { RichPostContent } from "@/components/community/rich-post-content";

interface PostCardProps {
 item?: MuralFeedItem;
 post?: MuralFeedItem;
 session?: any;
 queryKey?: unknown[];
}

function isVideoUrl(url?: string | null): boolean {
 if (!url) return false;
 const clean = url.split("?")[0].toLowerCase();
 return (
 clean.endsWith(".mp4") ||
 clean.endsWith(".webm") ||
 clean.endsWith(".mov") ||
 clean.endsWith(".quicktime") ||
 clean.endsWith(".m4v") ||
 clean.endsWith(".ogg") ||
 clean.includes("video")
 );
}

export function PostCard(props: PostCardProps) {
 const item = props.item || props.post;
 const queryKey = props.queryKey || ["mural-feed"];

 const qc = useQueryClient();
 const [activeSlide, setActiveSlide] = useState(0);
 const [isSaved, setIsSaved] = useState(false);
 const [isExpanded, setIsExpanded] = useState(false);
 const [isCommentsOpen, setIsCommentsOpen] = useState(false);
 const [selectedMediaLightboxIndex, setSelectedMediaLightboxIndex] = useState<number | null>(null);
 const [isPlayingAudio, setIsPlayingAudio] = useState(false);

 const toggleLike = useMutation({
 mutationFn: () => togglePostLike({ data: { post_id: item?.id || "" } }),
 onMutate: async () => {
 if (!item) return;
 await qc.cancelQueries({ queryKey });
 const prev = qc.getQueryData(queryKey);
 qc.setQueryData(queryKey, (old: any) => {
 if (!old) return old;
 const patchItem = (it: MuralFeedItem) =>
 it.id === item.id
 ? {
 ...it,
 user_liked: !it.user_liked,
 likes_count: it.user_liked ? Math.max(0, it.likes_count - 1) : it.likes_count + 1,
 }
 : it;
 if (Array.isArray(old)) return old.map(patchItem);
 if (old.pages) {
 return {
 ...old,
 pages: old.pages.map((page: any) => ({
 ...page,
 items: page.items.map(patchItem),
 })),
 };
 }
 return old;
 });
 return { prev };
 },
 onError: (_err: any, _vars: any, ctx: any) => {
 if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
 },
 onSettled: () => {
 qc.invalidateQueries({ queryKey });
 },
 });

 const authorInitial = item?.author?.name?.charAt(0)?.toUpperCase() ?? "J";

 const handleShare = () => {
 if (!item) return;
 const permalinkUrl = typeof window !== "undefined" ? `${window.location.origin}/publicacao/${item.id}` : "";
 if (navigator.share) {
 navigator
 .share({
 title: item.author.name,
 text: item.content_text || "Confira este momento na Waesy!",
 url: permalinkUrl,
 })
 .catch(() => {});
 } else {
 navigator.clipboard.writeText(permalinkUrl);
 toast.success("Link da publicação copiado!");
 }
 };

 const handleToggleSave = () => {
 setIsSaved(!isSaved);
 toast.success(isSaved ? "Publicação removida dos salvos" : "Publicação salva com sucesso!");
 };

 if (!item) {
 return null;
 }

  const isCarouselMode =
    item.post_type === "carrossel_unico" ||
    item.post_type === "instagram_carousel" ||
    item.layout_style === "carrossel_unico" ||
    item.layout_style === "carousel";

  const isMosaicMode = item.post_type === "grid" && item.media_urls.length > 1;
  const isHorizontalGalleryMode =
    !isCarouselMode &&
    !isMosaicMode &&
    (item.post_type === "trilho_horizontal" ||
      item.layout_style === "trilho_horizontal" ||
      item.media_urls.length > 1);

  const newsTargetUrl = item.metadata?.slug
    ? `/noticias/${item.metadata.slug}`
    : `/publicacao/${item.id}`;

  return (
    <article className="flex flex-col rounded-lg bg-card p-4 sm:p-5 transition-colors hover:border-border/80 border border-border/60 relative content-auto-card">
      {/* ── 1. Header Minimalista do Post ─────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={(item.author.is_store ? "/perfil-da-loja" : `/membro/${item.author.id}`) as any}
            className="shrink-0"
          >
            <Avatar className="size-10 rounded-full hover:opacity-90 transition-opacity border border-border/50">
              <AvatarImage src={item.author.avatar_url ?? ""} alt={item.author.name} className="object-cover" />
              <AvatarFallback className="rounded-full bg-primary/10 text-primary font-bold text-sm">
                {authorInitial}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={
                  (item.author.is_store
                    ? "/perfil-da-loja"
                    : item.publish_as_handle || item.metadata?.as_creator
                      ? `/u/${item.publish_as_handle || item.metadata?.creator_handle}`
                      : `/membro/${item.author.id}`) as any
                }
                className="text-sm font-bold text-foreground truncate hover:text-primary transition-colors"
              >
                {item.publish_as_handle || item.metadata?.as_creator
                  ? item.metadata?.creator_name || `@${item.publish_as_handle || item.metadata?.creator_handle}`
                  : item.author.name}
              </Link>
              <CheckCircle2 className="size-3.5 text-primary fill-primary/15 shrink-0" />
              <span className="text-xs text-muted-foreground">•</span>
              <Link
                to={`/publicacao/${item.id}` as any}
                className="text-xs text-muted-foreground hover:underline hover:text-foreground"
              >
                {formatRelativeTime(item.created_at)}
              </Link>
              {item.author.is_store && (
                <Badge
                  variant="secondary"
                  className="text-xs font-semibold px-2 py-0 bg-muted text-muted-foreground border-transparent shrink-0"
                >
                  Negócio
                </Badge>
              )}
            </div>

            {((item.city || item.location_name) || (item.collaborators?.length || item.metadata?.collaborator)) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                {(item.city || item.location_name) && (
                  <div className="flex items-center gap-1 truncate">
                    <MapPin className="size-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {item.city || item.location_name}
                      {item.region ? ` (${item.region})` : ""}
                    </span>
                  </div>
                )}
                {(item.collaborators?.length || item.metadata?.collaborator) && (
                  <span className="text-primary font-medium truncate">
                    com {item.collaborators?.join(", ") || item.metadata?.collaborator}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <ContentActionsMenu
            entityType="post"
            entityId={item.id}
            isOwner={props.session?.user?.id === item.author.id || props.session?.id === item.author.id}
            canonicalUrl={typeof window !== "undefined" ? `${window.location.origin}/publicacao/${item.id}` : ""}
            title={item.content_text ? item.content_text.slice(0, 40) + "..." : "Publicação"}
            mediaUrl={item.media_urls?.[0]}
          />
        </div>
      </div>

      {/* ── 1.5 Parceria Comercial Paga (Collab Verificada) ── */}
      {(item.paid_partner_handle || item.metadata?.sponsored_collab) && (
        <div className="mb-3 flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border border-border/50 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShoppingBag className="size-3.5 text-primary shrink-0" />
            <span>
              {item.paid_partner_label || (
                <>
                  Em parceria com{" "}
                  <strong className="text-foreground">
                    {item.paid_partner_handle || item.metadata?.sponsored_store_name}
                  </strong>
                </>
              )}
            </span>
          </div>
          {(item.metadata?.coupon_code || item.metadata?.coupon) && (
            <Badge
              variant="outline"
              className="font-mono text-xs font-bold bg-primary/10 text-primary border-primary/25"
            >
              Cupom: {item.metadata?.coupon_code || item.metadata?.coupon}
            </Badge>
          )}
        </div>
      )}

      {/* ── 2. Texto do Post (Acima da Mídia) ─────────────────────────── */}
      {item.content_text && item.post_type !== "news" && (
        <div className="mb-3 text-sm text-foreground/95 leading-relaxed font-normal">
          <RichPostContent
            content={item.content_text}
            isExpanded={isExpanded}
            maxCharacters={280}
          />
          {item.content_text.length > 280 && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-1 inline-block text-xs font-semibold text-primary hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isExpanded ? "Mostrar menos" : "Ler mais"}
            </button>
          )}
        </div>
      )}

      {/* ── 3. Renderização Minimalista por Formato de Post ────────── */}
      <div className="w-full">
        {/* FORMATO 1: NOTÍCIA / ARTIGO EDITORIAL LIMPO */}
        {item.post_type === "news" || item.reference_type === "news" || item.metadata?.is_news ? (
          <div className="mb-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                {item.metadata?.source || item.metadata?.category || "Notícia Local"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsPlayingAudio(!isPlayingAudio);
                  toast(isPlayingAudio ? "Áudio pausado" : "Ouvindo resumo da notícia...");
                }}
                className={`inline-flex items-center gap-2 px-3 min-h-11 rounded-full text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isPlayingAudio
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <Volume2 className="size-3.5" />
                <span>{isPlayingAudio ? "Ouvindo" : "Ouvir"}</span>
              </button>
            </div>

            <Link to={newsTargetUrl as any} className="block group/news">
              <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug tracking-tight group-hover/news:text-primary transition-colors">
                {item.metadata?.title || item.content_text?.slice(0, 110) || "Atualização Regional"}
              </h3>
            </Link>

            {(item.metadata?.subtitle || item.content_text) && (
              <p className="text-sm text-foreground/85 leading-relaxed line-clamp-3">
                {item.metadata?.subtitle || item.content_text}{" "}
                <Link
                  to={newsTargetUrl as any}
                  className="inline font-semibold text-primary hover:underline ml-1"
                >
                  Ler mais
                </Link>
              </p>
            )}

            {item.media_urls.length > 0 && (
              <Link
                to={newsTargetUrl as any}
                className="block relative rounded-lg overflow-hidden aspect-banner-cinema bg-muted border border-border/50 mt-2 group/img"
              >
                <img
                  src={item.media_urls[0]}
                  alt={item.metadata?.title || "Imagem da matéria"}
                  className="size-full object-cover group-hover/img:scale-103 transition-transform duration-300"
                  loading="lazy"
                />
              </Link>
            )}
          </div>
        ) : item.post_type === "duo_badge" || item.post_type === "id_badges" ? (
          /* FORMATO: PARCERIA / CONEXÃO */
          <div className="mb-3 space-y-3 rounded-lg bg-muted/30 p-4 border border-border/60 select-none">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                {item.metadata?.badge_group_title || "Parceria em Sintonia"}
              </h3>
              <Badge variant="outline" className="text-xs">
                Colaboração
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setSelectedMediaLightboxIndex(0)}
                className="bg-card rounded-lg p-3 border border-border/60 flex items-center gap-3 cursor-pointer hover:border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="size-12 rounded-full overflow-hidden bg-muted shrink-0 border border-border/40">
                  <img
                    src={item.media_urls[0] || item.author.avatar_url || ""}
                    alt="Membro 1"
                    className="size-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-foreground truncate">
                    {item.metadata?.member1_name || item.author.name.split(" ")[0]}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.metadata?.member1_role || "Criação"}
                  </p>
                </div>
              </div>
              <div
                onClick={() => setSelectedMediaLightboxIndex(1)}
                className="bg-card rounded-lg p-3 border border-border/60 flex items-center gap-3 cursor-pointer hover:border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="size-12 rounded-full overflow-hidden bg-muted shrink-0 border border-border/40">
                  <img
                    src={item.media_urls[1] || item.media_urls[0] || item.author.avatar_url || ""}
                    alt="Membro 2"
                    className="size-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-foreground truncate">
                    {item.metadata?.member2_name || "Parceiro"}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.metadata?.member2_role || "Parceria"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : item.post_type === "travel" || (item.post_type === "destination" && item.metadata?.is_triptych) ? (
          /* FORMATO: VIAGEM & ROTEIRO LIMPO */
          <div className="mb-3 space-y-2 select-none">
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-xs">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <span>{item.metadata?.origin_city || item.metadata?.origin || "Origem"}</span>
                <Plane className="size-3.5 text-primary" />
                <span className="text-primary">{item.metadata?.dest_city || item.location_name || "Destino"}</span>
              </div>
              <span className="text-muted-foreground">
                {item.metadata?.duration || item.metadata?.travel_date || "Roteiro"}
              </span>
            </div>

            {item.media_urls.length > 1 ? (
              <div className="carousel flex gap-2 overflow-x-auto snap-x mandatory no-scrollbar pb-1">
                {item.media_urls.map((url, idx) => (
                  <div
                    key={`${item.id}-travel-${idx}`}
                    onClick={() => setSelectedMediaLightboxIndex(idx)}
                    className="relative shrink-0 snap-start w-48 sm:w-56 aspect-post-portrait rounded-lg overflow-hidden bg-muted border border-border/40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <img
                      src={url}
                      alt={`Roteiro ${idx + 1}`}
                      loading="lazy"
                      className="size-full object-cover hover:scale-103 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            ) : item.media_urls[0] ? (
              <div
                onClick={() => setSelectedMediaLightboxIndex(0)}
                className="rounded-lg overflow-hidden aspect-banner-cinema bg-muted border border-border/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <img
                  src={item.media_urls[0]}
                  alt={item.metadata?.dest_city || "Destino"}
                  loading="lazy"
                  className="size-full object-cover hover:scale-103 transition-transform duration-300"
                />
              </div>
            ) : null}
          </div>
        ) : isHorizontalGalleryMode && item.media_urls.length > 1 ? (
          /* FORMATO: GALERIA DESLIZANTE (Cards verticais 3:4 lado a lado com scroll horizontal suave) */
          <div className="carousel mb-3 flex gap-2 overflow-x-auto snap-x mandatory no-scrollbar pb-1 select-none">
            {item.media_urls.map((url, idx) => (
              <div
                key={`${item.id}-slide-${idx}`}
                onClick={() => setSelectedMediaLightboxIndex(idx)}
                className="relative shrink-0 snap-start w-48 sm:w-56 aspect-post-portrait rounded-lg overflow-hidden bg-muted border border-border/40 cursor-pointer group/slide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isVideoUrl(url) ? (
                  <video
                    src={url}
                    muted
                    playsInline
                    loop
                    preload="metadata"
                    className="size-full object-cover"
                  />
                ) : (
                  <img
                    src={url}
                    alt={`Foto ${idx + 1}`}
                    loading="lazy"
                    className="size-full object-cover group-hover/slide:scale-103 transition-transform duration-300"
                  />
                )}
                <span className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-foreground/80 text-background text-xs font-medium backdrop-blur-xs">
                  {idx + 1}/{item.media_urls.length}
                </span>
              </div>
            ))}
          </div>
        ) : isCarouselMode && item.media_urls.length > 0 ? (
          /* FORMATO: CARROSSEL CANÔNICO DE MÍDIA (Snap Scroll Anti-Jank & Lightbox) */
          <div className="mb-3">
            <MediaCarousel
              mediaUrls={item.media_urls}
              post={item}
              aspectRatio="4/5"
              onMediaClick={(idx) => setSelectedMediaLightboxIndex(idx)}
            />
          </div>
        ) : isMosaicMode ? (
          /* FORMATO: MOSAICO DE FOTOS LIMPO (2 Colunas) */
          <div className="mb-3 grid grid-cols-2 gap-2 overflow-hidden rounded-lg">
            {item.media_urls.slice(0, 4).map((url, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedMediaLightboxIndex(idx)}
                className={`relative ${
                  item.media_urls.length === 3 && idx === 0
                    ? "col-span-2 aspect-video"
                    : "aspect-square"
                } overflow-hidden bg-muted rounded-lg border border-border/40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                {isVideoUrl(url) ? (
                  <video src={url} controls playsInline className="size-full object-cover" />
                ) : (
                  <img
                    src={url}
                    alt={`Mídia ${idx + 1}`}
                    className="size-full object-cover hover:scale-103 transition-transform duration-300"
                    loading="lazy"
                  />
                )}
                {idx === 3 && item.media_urls.length > 4 && (
                  <div className="absolute inset-0 bg-foreground/75 flex items-center justify-center text-background font-bold text-base">
                    +{item.media_urls.length - 4}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : item.media_urls.length === 1 ? (() => {
          const isVideo = isVideoUrl(item.media_urls[0]);
          const postRatio = item.aspect_ratio || item.metadata?.aspect_ratio;

          let containerAspectClass = "aspect-post-vertical sm:aspect-post-card max-h-[580px]";
          let objectFitClass = "object-cover";

          if (item.post_type === "moment" || postRatio === "9:16") {
            containerAspectClass = "aspect-post-moment max-w-xs mx-auto max-h-[580px]";
            objectFitClass = isVideo ? "object-contain bg-foreground/95" : "object-cover";
          } else if (postRatio === "1:1") {
            containerAspectClass = "aspect-square max-h-[540px]";
          } else if (postRatio === "4:5") {
            containerAspectClass = "aspect-post-vertical max-h-[580px]";
          } else if (postRatio === "16:9") {
            containerAspectClass = "aspect-video max-h-[500px]";
          } else if (isVideo) {
            containerAspectClass = "aspect-post-vertical max-h-[580px]";
            objectFitClass = "object-contain bg-foreground/95";
          }

          return (
            /* FORMATO: MÍDIA ÚNICA ADAPTATIVA SEM CORTE */
            <div
              className={`relative mb-3 overflow-hidden rounded-lg bg-muted border border-border/40 ${containerAspectClass} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              onClick={() => setSelectedMediaLightboxIndex(0)}
            >
              {isVideo ? (
                <video
                  src={item.media_urls[0]}
                  controls
                  playsInline
                  preload="metadata"
                  className={`size-full ${objectFitClass}`}
                />
              ) : (
                <img
                  src={item.media_urls[0]}
                  alt="Mídia da publicação"
                  className={`size-full ${objectFitClass} hover:scale-102 transition-transform duration-300`}
                  loading="lazy"
                />
              )}
            </div>
          );
        })() : null}
      </div>

      {/* ── 4. Cards de Referência / Integração ───────────────────────── */}
      {item.reference_data && item.reference_type === "product" && (
        <Link
          to={item.reference_data.slug ? "/produto/$slug" : "/mercado"}
          params={item.reference_data.slug ? { slug: item.reference_data.slug } : undefined}
          className="mb-3 flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors group border border-border/40"
        >
          <div className="size-14 rounded-lg overflow-hidden bg-background shrink-0 border border-border/40">
            {item.reference_data.images?.[0] ? (
              <img
                src={item.reference_data.images[0]}
                alt={item.reference_data.title}
                className="size-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <ShoppingBag className="size-6 text-muted-foreground m-auto mt-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold uppercase text-primary tracking-wider">
              {item.reference_data.stores?.name || "Produto Local"}
            </span>
            <p className="text-sm font-bold text-foreground truncate">
              {item.reference_data.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold text-foreground">
                {formatMoney(item.reference_data.price_cents)}
              </span>
              {item.reference_data.compare_at_price_cents && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatMoney(item.reference_data.compare_at_price_cents)}
                </span>
              )}
            </div>
          </div>
          <span className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold inline-flex items-center justify-center shrink-0 bg-primary text-primary-foreground group-hover:bg-primary/90 transition-colors pointer-events-none">
            Ver Oferta
          </span>
        </Link>
      )}

      {item.reference_data && item.reference_type === "classified" && (
        <Link
          to="/classificados/$id"
          params={{ id: item.reference_data.id }}
          className="mb-3 flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors group border border-border/40"
        >
          <div className="size-14 rounded-lg overflow-hidden bg-background shrink-0 border border-border/40">
            {item.reference_data.images?.[0] ? (
              <img
                src={item.reference_data.images[0]}
                alt={item.reference_data.title}
                className="size-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <Tag className="size-6 text-muted-foreground m-auto mt-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold uppercase text-amber-600 tracking-wider">
              Classificado
            </span>
            <p className="text-sm font-bold text-foreground truncate">
              {item.reference_data.title}
            </p>
            <p className="text-xs font-bold text-foreground mt-1">
              {formatMoney(item.reference_data.price_cents)}
            </p>
          </div>
          <span className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold inline-flex items-center justify-center shrink-0 border border-border/80 bg-background text-foreground group-hover:bg-muted/80 transition-colors pointer-events-none">
            Ver Anúncio
          </span>
        </Link>
      )}

      {/* ── 5. Barra Minimalista de Ações Sociais (Touch Target >= 44px) ── */}
      <div className="flex items-center justify-between pt-2 mt-auto text-muted-foreground border-t border-border/40">
        <div className="flex items-center gap-1 -ml-2">
          <button
            type="button"
            onClick={() => toggleLike.mutate(undefined)}
            disabled={toggleLike.isPending}
            className={`h-11 min-h-11 px-3 rounded-full flex items-center gap-2 text-xs font-semibold transition-colors active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              item.user_liked
                ? "text-destructive bg-destructive/10"
                : "hover:bg-muted/60 hover:text-foreground"
            }`}
            aria-label="Curtir"
          >
            <Heart className={`size-4 ${item.user_liked ? "fill-current" : ""}`} />
            {item.likes_count > 0 && <span>{item.likes_count}</span>}
          </button>

          <button
            type="button"
            onClick={() => setIsCommentsOpen(true)}
            className={`h-11 min-h-11 px-3 rounded-full flex items-center gap-2 text-xs font-semibold transition-colors active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isCommentsOpen
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted/60 hover:text-foreground"
            }`}
            aria-label="Comentar"
          >
            <MessageSquare className="size-4" />
            {item.comments_count > 0 && <span>{item.comments_count}</span>}
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center hover:bg-muted/60 hover:text-foreground transition-colors active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Compartilhar"
          >
            <Share2 className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <Link
            to={`/publicacao/${item.id}` as any}
            className="h-11 min-h-11 px-3 rounded-full inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <span>Abrir</span>
            <ArrowRight className="size-3.5" />
          </Link>

          <button
            type="button"
            onClick={handleToggleSave}
            className={`size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center transition-colors active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isSaved ? "text-primary bg-primary/10" : "hover:bg-muted/60 hover:text-foreground"
            }`}
            aria-label="Salvar publicação"
          >
            <Bookmark className={`size-4 ${isSaved ? "fill-current" : ""}`} />
          </button>
        </div>
      </div>

      {/* Drawer de Comentários do Post Geral */}
      <PostCommentsDrawer
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        postId={item.id}
        authorName={item.author.name}
      />

      {/* Lightbox / Modal de visualização de foto individual */}
      {selectedMediaLightboxIndex !== null && (
        <MediaLightboxModal
          isOpen={true}
          onClose={() => setSelectedMediaLightboxIndex(null)}
          post={item}
          initialMediaIndex={selectedMediaLightboxIndex}
        />
      )}
    </article>
  );
}
