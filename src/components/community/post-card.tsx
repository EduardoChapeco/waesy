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

 return (
 <article className="flex flex-col rounded-2xl bg-card p-4 sm:p-5 transition-all hover:border-border/80 border border-border/70 relative">
 {/* ── 1. Header do Post ────────────────────────────────────────── */}
 <div className="flex items-center justify-between gap-3 mb-3">
 <div className="flex items-center gap-3 min-w-0">
 <Link
 to={(item.author.is_store ? "/perfil-da-loja" : `/membro/${item.author.id}`) as any}
 className="shrink-0"
 >
 <Avatar className="size-10 rounded-xl hover:opacity-90 transition-opacity border border-border/40">
 <AvatarImage src={item.author.avatar_url ?? ""} alt={item.author.name} />
 <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold text-sm">
 {authorInitial}
 </AvatarFallback>
 </Avatar>
 </Link>

 <div className="min-w-0">
 <div className="flex items-center gap-2">
 <Link
 to={
 (item.author.is_store
   ? "/perfil-da-loja"
   : (item.publish_as_handle || item.metadata?.as_creator)
   ? `/u/${item.publish_as_handle || item.metadata?.creator_handle}`
   : `/membro/${item.author.id}`) as any
 }
 className="text-sm font-bold text-foreground truncate hover:text-primary transition-colors"
 >
 {(item.publish_as_handle || item.metadata?.as_creator)
 ? item.metadata?.creator_name || `@${item.publish_as_handle || item.metadata?.creator_handle}`
 : item.author.name}
 </Link>
 {(item.publish_as_handle || item.metadata?.as_creator) && (
 <Badge
 variant="outline"
 className="text-[10px] font-bold px-1.5 py-0 bg-primary/10 text-primary border-primary/20 shrink-0"
 >
 @{item.publish_as_handle || item.metadata?.creator_handle}
 </Badge>
 )}
 {item.author.is_store && (
 <Badge
 variant="secondary"
 className="text-[10px] font-bold px-1.5 py-0 bg-primary/10 text-primary border-transparent shrink-0"
 >
 Loja
 </Badge>
 )}
 </div>

 <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
 <Link to={`/publicacao/${item.id}` as any} className="hover:underline hover:text-foreground">
 {formatRelativeTime(item.created_at)}
 </Link>
 {(item.city || item.location_name) && (
 <>
 <span>•</span>
 <div className="flex items-center gap-0.5 truncate text-foreground/70">
 <MapPin className="size-3 shrink-0 text-primary" />
 <span className="truncate">
 {item.city || item.location_name}
 {item.region ? ` (${item.region})` : ""}
 </span>
 </div>
 </>
 )}
 {(item.collaborators?.length || item.metadata?.collaborator) && (
 <>
 <span>•</span>
 <span className="text-primary font-medium truncate">
 com {item.collaborators?.join(", ") || item.metadata?.collaborator}
 </span>
 </>
 )}
 </div>
 </div>
 </div>

 <div className="flex items-center gap-1">
 <ContentActionsMenu
 entityType="post"
 entityId={item.id}
 isOwner={props.session?.user?.id === item.author.id || props.session?.id === item.author.id}
 canonicalUrl={typeof window !== "undefined" ? window.location.href : ""}
 title={item.content_text ? item.content_text.slice(0, 40) + "..." : "Publicação"}
 mediaUrl={item.media_urls?.[0]}
 />
 </div>
 </div>

 {/* ── 1.5 Parceria Comercial Paga (Collab Verificada) ── */}
 {(item.paid_partner_handle || item.metadata?.sponsored_collab) && (
 <div className="mb-3 flex items-center justify-between px-3 py-1.5 rounded-xl bg-muted/40 border border-border/50 text-xs">
 <div className="flex items-center gap-1.5 text-muted-foreground">
 <ShoppingBag className="size-3.5 text-primary shrink-0" />
 <span>
 {item.paid_partner_label || (
 <>
 Em parceria paga com{" "}
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
 className="font-mono text-[10px] font-bold bg-primary/10 text-primary border-primary/25"
 >
 Cupom: {item.metadata?.coupon_code || item.metadata?.coupon}
 </Badge>
 )}
 </div>
 )}

 {/* ── 2. Texto do Post (quando houver) ─────────────────────────── */}
 {item.content_text && item.post_type !== "news" && (
 <div className="mb-3 text-sm text-foreground/90 leading-relaxed font-normal">
 <RichPostContent
 content={item.content_text}
 isExpanded={isExpanded}
 maxCharacters={280}
 />
 {item.content_text.length > 280 && (
 <button
 type="button"
 onClick={() => setIsExpanded(!isExpanded)}
 className="mt-1 block text-xs font-bold text-primary hover:underline cursor-pointer"
 >
 {isExpanded ? "Ver menos" : "Ver mais"}
 </button>
 )}
 </div>
 )}

 {/* ── 3. Renderização Específica por Template de Post ────────── */}
 <div
 className={`w-full transition-all duration-300 origin-top ${
 isCommentsOpen ? "scale-[0.95] -translate-y-1 opacity-90" : "scale-100"
 }`}
 >
 {/* TEMPLATE 1: NOTÍCIAS EDITORIAL (Imagem 1) */}
 {(item.post_type === "news" || item.reference_type === "news" || item.metadata?.is_news) ? (
 <div className="mb-3 space-y-3 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-black text-white p-5 overflow-hidden border border-primary/20 select-none">
 {/* Header de Veículo & Áudio */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Badge className="bg-info text-white font-black text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-md">
 {item.metadata?.source || "Waesy News"}
 </Badge>
 <span className="text-[11px] text-white/70 font-mono">
 {item.metadata?.news_date || formatRelativeTime(item.created_at)}
 </span>
 </div>
 <button
 onClick={() => {
 setIsPlayingAudio(!isPlayingAudio);
 toast(isPlayingAudio ? "Áudio pausado" : "Reproduzindo matéria por voz sintetizada...");
 }}
 className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
 isPlayingAudio
 ? "bg-emerald-500 text-white animate-pulse"
 : "bg-white/10 hover:bg-white/20 text-white/90"
 }`}
 >
 <Volume2 className="size-3.5" />
 <span>{isPlayingAudio ? "Ouvindo..." : "(Listen) Ouvir"}</span>
 </button>
 </div>

 {/* Manchete Editorial com suporte a Marca-Texto Threads Style */}
 <h3 className="font-editorial text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
 <RichPostContent
 content={item.metadata?.title || item.content_text?.slice(0, 90) || "All Faith Needs Feet Business"}
 isExpanded={true}
 />
 </h3>

 {/* Resumo / Lead */}
 {item.metadata?.subtitle && (
 <div className="text-xs sm:text-sm text-white/80 leading-relaxed font-sans">
 <RichPostContent content={item.metadata.subtitle} isExpanded={true} />
 </div>
 )}

 {/* Imagem do Artigo */}
 {item.media_urls.length > 0 && (
 <div
 className="relative rounded-2xl overflow-hidden aspect-[16/9] bg-black/40 border border-white/10 mt-3 group cursor-pointer"
 onClick={() => setSelectedMediaLightboxIndex(0)}
 >
 <img
 src={item.media_urls[0]}
 alt="Capa da notícia"
 className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
 <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
 <span className="font-bold flex items-center gap-1 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-lg">
 <Layers className="size-3 text-warning" />
 <span>{item.metadata?.category || "Inovação & Cidades"}</span>
 </span>
 <span className="text-[11px] text-white/70 flex items-center gap-1">
 <Eye className="size-3" /> Ver notícia
 </span>
 </div>
 </div>
 )}

 {/* Tópicos / Tags */}
 <div className="flex flex-wrap items-center gap-1.5 pt-2 text-[10px] font-bold text-white/60">
 <span className="text-white/40">Tópicos:</span>
 {(item.metadata?.topics || ["Inovação", "Regional", "Economia", "Cultura"]).map((t: string) => (
 <span
 key={t}
 className="px-2 py-0.5 rounded-md bg-white/10 text-white/80 hover:text-white cursor-pointer transition-colors"
 >
 #{t}
 </span>
 ))}
 </div>
 </div>
 ) : (item.post_type === "duo_badge" || item.post_type === "id_badges") ? (
 /* TEMPLATE: ID BADGES & CRACHÁS CONECTADOS (Imagem 3) */
 <div className="mb-3 space-y-4 rounded-2xl bg-gradient-to-b from-blue-50/80 via-indigo-50/40 to-background dark:from-slate-900 dark:via-slate-950 dark:to-card p-5 sm:p-6 border border-info/50 dark:border-info/30 select-none">
 {/* Header de Impacto */}
 <div className="text-center space-y-1">
 <h3 className="font-editorial text-2xl sm:text-3xl font-black text-foreground tracking-tight">
 {item.metadata?.badge_group_title || "Family: In Sync"}
 </h3>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 {item.metadata?.badge_group_subtitle || "Equipe e membros conectados com sintonia e propósito."}
 </p>
 </div>

 {/* Container dos Crachás Conectados com Clipe Metálico */}
 <div className="relative pt-4 pb-2 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
 {/* Clipe / Anel Metálico Central */}
 <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 text-muted-foreground/80">
 <div className="size-4 rounded-full border-2 border-slate-400 bg-slate-200 dark:bg-slate-700 shadow-xs" />
 <div className="w-8 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
 <div className="size-4 rounded-full border-2 border-slate-400 bg-slate-200 dark:bg-slate-700 shadow-xs" />
 </div>

 {/* Crachá 1 */}
 <div
 onClick={() => setSelectedMediaLightboxIndex(0)}
 className="w-full sm:w-1/2 bg-card rounded-2xl p-4 border border-border/80 flex flex-col items-center text-center space-y-2 -rotate-1 hover:rotate-0 hover:scale-103 transition-all duration-300 cursor-pointer relative overflow-hidden"
 >
 <div className="size-16 rounded-xl overflow-hidden bg-muted border border-border/40 shadow-xs">
 <img
 src={item.media_urls[0] || item.author.avatar_url || ""}
 alt="Membro 1"
 className="size-full object-cover"
 />
 </div>
 <div className="space-y-0.5">
 <h4 className="font-black text-sm text-foreground uppercase tracking-wide">
 {item.metadata?.member1_name || item.author.name.split(" ")[0]}
 </h4>
 <p className="text-[10px] text-muted-foreground leading-tight">
 {item.metadata?.member1_role || "Liderança & Criação"}
 </p>
 </div>
 {/* Faixa inferior de cor */}
 <div className="w-full h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 mt-2" />
 </div>

 {/* Crachá 2 */}
 <div
 onClick={() => setSelectedMediaLightboxIndex(1)}
 className="w-full sm:w-1/2 bg-card rounded-2xl p-4 border border-border/80 flex flex-col items-center text-center space-y-2 rotate-1 hover:rotate-0 hover:scale-103 transition-all duration-300 cursor-pointer relative overflow-hidden"
 >
 <div className="size-16 rounded-xl overflow-hidden bg-muted border border-border/40 shadow-xs">
 <img
 src={item.media_urls[1] || item.media_urls[0] || item.author.avatar_url || ""}
 alt="Membro 2"
 className="size-full object-cover"
 />
 </div>
 <div className="space-y-0.5">
 <h4 className="font-black text-sm text-foreground uppercase tracking-wide">
 {item.metadata?.member2_name || "Parceria"}
 </h4>
 <p className="text-[10px] text-muted-foreground leading-tight">
 {item.metadata?.member2_role || "Execução & Resultados"}
 </p>
 </div>
 {/* Faixa inferior de cor */}
 <div className="w-full h-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 mt-2" />
 </div>
 </div>

 {/* Badges de Sincronia no Rodapé */}
 <div className="flex items-center justify-center gap-3 pt-2 border-t border-border/40 text-[11px] font-bold text-muted-foreground">
 <span className="flex items-center gap-1 text-info dark:text-info">
 <Calendar className="size-3.5" /> Agenda Sincronizada
 </span>
 <span>•</span>
 <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
 <ShieldCheck className="size-3.5" /> Verificado
 </span>
 </div>
 </div>
 ) : (item.post_type === "travel" || (item.post_type === "destination" && item.metadata?.is_triptych)) ? (
 /* TEMPLATE 2: VIAGENS & TURISMO EDITORIAL (UI Flat — Zero Grid-in-Grid) */
 <div className="mb-3 select-none">
 {/* Tríptico Limpo: Rota Infográfica + Imagem Central de Destaque + Status de Chegada */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
 {/* Elemento 1: Rota Infográfica Limpa (Origem -> Destino) */}
 <div className="flex flex-col justify-between rounded-2xl border border-border/60 bg-muted/20 p-3.5 sm:p-4 text-center min-h-[140px] sm:h-52">
 <div className="flex items-center justify-between w-full">
 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Itinerário</span>
 <Badge variant="outline" className="text-[9px] font-bold px-2 py-0 border-primary/30 text-primary bg-primary/5">
 Direto
 </Badge>
 </div>
 
 <div className="my-2 space-y-2">
 <div className="flex items-center justify-center gap-2 text-xs font-black text-foreground">
 <span className="truncate max-w-[80px] sm:max-w-[90px]">{item.metadata?.origin_city || item.metadata?.origin || "Origem"}</span>
 <div className="flex items-center text-primary">
 <span className="w-3 border-t border-dashed border-primary" />
 <Plane className="size-3.5 mx-0.5" />
 <span className="w-3 border-t border-dashed border-primary" />
 </div>
 <span className="truncate max-w-[80px] sm:max-w-[90px] text-primary">{item.metadata?.dest_city || item.location_name || "Destino"}</span>
 </div>
 <p className="text-[11px] text-muted-foreground font-medium">
 {item.metadata?.duration || item.metadata?.niche_label || "Roteiro Especial"}
 </p>
 </div>

 <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-muted-foreground pt-1 border-t border-border/40">
 <MapPin className="size-3 text-primary shrink-0" />
 <span className="truncate">{item.location_name || item.city || "Embarque Confirmado"}</span>
 </div>
 </div>

 {/* Elemento 2: Imagem Principal do Destino (Centro de Atenção) */}
 <div
 className="rounded-2xl overflow-hidden relative cursor-pointer group border border-border/60 shadow-2xs min-h-[180px] sm:h-52 bg-muted"
 onClick={() => setSelectedMediaLightboxIndex(0)}
 >
 {item.media_urls[0] ? (
 <img
 src={item.media_urls[0]}
 alt={item.metadata?.dest_city || item.location_name || "Destino"}
 className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
 />
 ) : (
 <div className="size-full flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-primary/10 via-muted/30 to-background p-4 text-center">
 <Compass className="size-8 text-primary/60 animate-spin" style={{ animationDuration: "30s" }} />
 <span className="text-xs font-bold text-foreground">Destino em Destaque</span>
 </div>
 )}
 {/* Tag Minimalista de Destino sobre a Foto */}
 <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
 <span className="bg-black/60 backdrop-blur-md text-white font-bold text-[11px] px-2.5 py-1 rounded-xl truncate shadow-xs">
 {item.metadata?.dest_city || item.location_name || "Experiência"}
 </span>
 <span className="bg-black/40 backdrop-blur-md text-white/90 text-[10px] font-medium px-2 py-0.5 rounded-lg flex items-center gap-1">
 <Eye className="size-2.5" /> Ver
 </span>
 </div>
 </div>

 {/* Elemento 3: Card Minimalista com Status de Chegada & Data */}
 <div className="flex flex-col justify-between rounded-2xl border border-border/60 bg-muted/20 p-3.5 sm:p-4 text-center min-h-[140px] sm:h-52">
 <div className="flex items-center justify-between w-full">
 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</span>
 <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-2 py-0">
 Confirmado
 </Badge>
 </div>

 <div className="my-2 space-y-1">
 <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
 <CheckCircle2 className="size-4" />
 <span className="text-xs font-black text-foreground">
 {item.metadata?.voucher_title || "Chegada ao Destino"}
 </span>
 </div>
 <p className="text-[11px] text-muted-foreground font-medium">
 {item.metadata?.travel_date || item.metadata?.dates || formatRelativeTime(item.created_at)}
 </p>
 </div>

 <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-muted-foreground pt-1 border-t border-border/40">
 <Calendar className="size-3 text-primary shrink-0" />
 <span>{item.metadata?.departure_time || "Check-in disponível"}</span>
 </div>
 </div>
 </div>
 </div>
 ) : item.post_type === "grid" && item.media_urls.length > 1 ? (
 /* TEMPLATE 3: GRID ORGÂNICO DE FOTOS SOBREPOSTAS (Imagem 3) */
 <div className="mb-3 relative select-none">
 <div className="flex items-center justify-between text-xs font-bold text-muted-foreground mb-2 px-1">
 <span className="flex items-center gap-1.5 text-foreground">
 <Layers className="size-3.5 text-primary" />
 <span>Álbum de {item.media_urls.length} fotos</span>
 </span>
 <span className="text-[11px] text-muted-foreground">Toque na foto para curtir/comentar</span>
 </div>

 {/* Collage sobreposto orgânico */}
 <div className="relative h-72 sm:h-80 w-full rounded-2xl bg-muted/30 p-3 overflow-hidden border border-border/50">
 {/* Foto 1: Principal inclinada à esquerda */}
 {item.media_urls[0] && (
 <div
 onClick={() => setSelectedMediaLightboxIndex(0)}
 className="absolute left-3 top-3 w-[55%] h-[85%] rounded-2xl overflow-hidden -rotate-2 hover:rotate-0 hover:scale-105 hover:z-30 transition-all duration-300 cursor-pointer border-2 border-background"
 >
 <img src={item.media_urls[0]} alt="Foto 1" className="size-full object-cover" />
 <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-bold text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md">
 <span className="flex items-center gap-1">
 <Heart className="size-2.5 fill-current text-destructive" /> Foto 1
 </span>
 <span>Ver</span>
 </div>
 </div>
 )}

 {/* Foto 2: Superior direita */}
 {item.media_urls[1] && (
 <div
 onClick={() => setSelectedMediaLightboxIndex(1)}
 className="absolute right-3 top-3 w-[45%] h-[55%] rounded-2xl overflow-hidden rotate-3 hover:rotate-0 hover:scale-105 hover:z-30 transition-all duration-300 cursor-pointer border-2 border-background"
 >
 <img src={item.media_urls[1]} alt="Foto 2" className="size-full object-cover" />
 <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-bold text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md">
 <span className="flex items-center gap-1">
 <Heart className="size-2.5 fill-current text-destructive" /> Foto 2
 </span>
 <span>Ver</span>
 </div>
 </div>
 )}

 {/* Foto 3: Central inferior sobreposta */}
 {item.media_urls[2] && (
 <div
 onClick={() => setSelectedMediaLightboxIndex(2)}
 className="absolute left-[30%] bottom-3 w-[45%] h-[55%] rounded-2xl overflow-hidden -rotate-1 z-20 hover:rotate-0 hover:scale-105 hover:z-30 transition-all duration-300 cursor-pointer border-2 border-background"
 >
 <img src={item.media_urls[2]} alt="Foto 3" className="size-full object-cover" />
 <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-bold text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md">
 <span className="flex items-center gap-1">
 <Heart className="size-2.5 fill-current text-destructive" /> Foto 3
 </span>
 <span>Ver</span>
 </div>
 </div>
 )}

 {/* Contador de fotos extras */}
 {item.media_urls.length > 3 && (
 <div
 onClick={() => setSelectedMediaLightboxIndex(3)}
 className="absolute right-4 bottom-4 z-30 px-3 py-1.5 rounded-xl bg-foreground text-background font-black text-xs cursor-pointer hover:scale-105 transition-transform"
 >
 +{item.media_urls.length - 3}
 </div>
 )}
 </div>
 </div>
 ) : (item.post_type === "instagram_carousel" || (item.layout_style === "carousel" && item.media_urls.length > 1)) && item.media_urls.length > 0 ? (
 /* TEMPLATE: CARROSSEL VISUAL (1:1 ou 4:5) */
 <div className="relative mb-3 overflow-hidden rounded-2xl bg-black aspect-square sm:aspect-[4/5] group select-none">
 {isVideoUrl(item.media_urls[activeSlide]) ? (
 <video
 src={item.media_urls[activeSlide]}
 controls
 playsInline
 className="size-full object-contain"
 />
 ) : (
 <img
 src={item.media_urls[activeSlide]}
 alt={`Slide ${activeSlide + 1}`}
 className="size-full object-cover cursor-pointer"
 onClick={() => setSelectedMediaLightboxIndex(activeSlide)}
 />
 )}

 {/* Setas de navegação */}
 {activeSlide > 0 && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 setActiveSlide((prev) => prev - 1);
 }}
 className="absolute left-2 top-1/2 -translate-y-1/2 size-8 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-xs"
 >
 <ChevronLeft className="size-5" />
 </button>
 )}
 {activeSlide < item.media_urls.length - 1 && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 setActiveSlide((prev) => prev + 1);
 }}
 className="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-xs"
 >
 <ChevronRight className="size-5" />
 </button>
 )}

 {/* Dots */}
 <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-full">
 {item.media_urls.map((_, idx) => (
 <div
 key={idx}
 className={`size-1.5 rounded-full transition-all ${
 idx === activeSlide ? "w-4 bg-white" : "bg-white/40"
 }`}
 />
 ))}
 </div>
 </div>
 ) : item.media_urls.length === 1 ? (
 /* TEMPLATE: FOTO ÚNICA PADRÃO */
 <div
 className={`mb-3 overflow-hidden rounded-2xl bg-black ${
 item.post_type === "moment" ? "aspect-[9/16] max-h-[560px] mx-auto" : "max-h-[560px]"
 } cursor-pointer`}
 onClick={() => setSelectedMediaLightboxIndex(0)}
 >
 {isVideoUrl(item.media_urls[0]) ? (
 <video
 src={item.media_urls[0]}
 controls
 playsInline
 preload="metadata"
 className="w-full max-h-[560px] object-contain"
 />
 ) : (
 <img
 src={item.media_urls[0]}
 alt="Mídia da publicação"
 className="w-full max-h-[560px] object-cover hover:scale-[1.01] transition-transform"
 loading="lazy"
 />
 )}
 </div>
 ) : item.media_urls.length > 1 ? (
 /* GRID CLÁSSICO DE FOTOS */
 <div className="mb-3 grid grid-cols-2 gap-1.5 overflow-hidden rounded-2xl">
 {item.media_urls.slice(0, 4).map((url, idx) => (
 <div
 key={idx}
 onClick={() => setSelectedMediaLightboxIndex(idx)}
 className={`${
 item.media_urls.length === 3 && idx === 0
 ? "col-span-2 aspect-video"
 : "aspect-square"
 } overflow-hidden bg-muted cursor-pointer`}
 >
 {isVideoUrl(url) ? (
 <video src={url} controls playsInline className="size-full object-cover" />
 ) : (
 <img
 src={url}
 alt={`Mídia ${idx + 1}`}
 className="size-full object-cover hover:scale-105 transition-transform"
 loading="lazy"
 />
 )}
 </div>
 ))}
 </div>
 ) : null}
 </div>

 {/* ── 4. Cards de Referência / Integração ───────────────────────── */}
 {/* Referência: Produto */}
 {item.reference_data && item.reference_type === "product" && (
 <Link
 to={item.reference_data.slug ? "/produto/$slug" : "/mercado"}
 params={item.reference_data.slug ? { slug: item.reference_data.slug } : undefined}
 className="mb-3 flex items-center gap-3 p-3 rounded-2xl bg-muted/30 hover:bg-muted/60 transition-colors group border border-border/40"
 >
 <div className="size-14 rounded-xl overflow-hidden bg-background shrink-0 border border-border/40">
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
 <div className="flex items-center gap-1.5">
 <span className="text-[10px] font-bold uppercase text-primary tracking-wider">
 {item.reference_data.stores?.name || "Produto da Comunidade"}
 </span>
 </div>
 <p className="text-sm font-bold text-foreground truncate">
 {item.reference_data.title}
 </p>
 <div className="flex items-center gap-2 mt-0.5">
 <span className="text-xs font-bold text-foreground">
 {formatMoney(item.reference_data.price_cents)}
 </span>
 {item.reference_data.compare_at_price_cents && (
 <span className="text-[11px] text-muted-foreground line-through">
 {formatMoney(item.reference_data.compare_at_price_cents)}
 </span>
 )}
 </div>
 </div>
 <Button size="sm" className="h-8 px-3 rounded-xl text-xs font-semibold shrink-0 cursor-pointer">
 Comprar
 </Button>
 </Link>
 )}

 {/* Referência: Classificado / Desapego */}
 {item.reference_data && item.reference_type === "classified" && (
 <Link
 to="/classificados/$id"
 params={{ id: item.reference_data.id }}
 className="mb-3 flex items-center gap-3 p-3 rounded-2xl bg-muted/30 hover:bg-muted/60 transition-colors group border border-border/40"
 >
 <div className="size-14 rounded-xl overflow-hidden bg-background shrink-0 border border-border/40">
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
 <span className="text-[10px] font-bold uppercase text-amber-600 tracking-wider">
 Anúncio & Desapego
 </span>
 <p className="text-sm font-bold text-foreground truncate">
 {item.reference_data.title}
 </p>
 <p className="text-xs font-bold text-foreground mt-0.5">
 {formatMoney(item.reference_data.price_cents)}
 </p>
 </div>
 <Button size="sm" variant="outline" className="h-8 px-3 rounded-xl text-xs font-semibold shrink-0 cursor-pointer bg-card">
 Ver Oferta
 </Button>
 </Link>
 )}

 {/* ── 5. Barra de Ações do Post ─────────────────────────────────── */}
 <div className="flex items-center justify-between pt-3 mt-auto text-muted-foreground border-t border-border/40">
 <div className="flex items-center gap-1 sm:gap-2">
 {/* Curtir Post */}
 <button
 onClick={() => toggleLike.mutate(undefined)}
 disabled={toggleLike.isPending}
 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
 item.user_liked
 ? "text-destructive bg-destructive/10"
 : "hover:bg-muted hover:text-foreground"
 }`}
 aria-label="Curtir"
 >
 <Heart className={`size-4 ${item.user_liked ? "fill-current" : ""}`} />
 <span>{item.likes_count}</span>
 </button>

 {/* Comentar Post Geral (Abre Drawer Interativo com Media Shrink) */}
 <button
 onClick={() => setIsCommentsOpen(true)}
 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
 isCommentsOpen
 ? "bg-primary text-primary-foreground"
 : "hover:bg-muted hover:text-foreground"
 }`}
 aria-label="Comentar"
 >
 <MessageSquare className="size-4" />
 <span>{item.comments_count > 0 ? item.comments_count : "Comentar"}</span>
 </button>

 {/* Compartilhar */}
 <button
 onClick={handleShare}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-muted hover:text-foreground transition-all active:scale-95"
 aria-label="Compartilhar"
 >
 <Share2 className="size-4" />
 </button>
 </div>

 {/* Salvar */}
 <button
 onClick={handleToggleSave}
 className={`p-2 rounded-xl transition-all active:scale-95 ${
 isSaved ? "text-primary bg-primary/10" : "hover:bg-muted hover:text-foreground"
 }`}
 aria-label="Salvar publicação"
 >
 <Bookmark className={`size-4 ${isSaved ? "fill-current" : ""}`} />
 </button>
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
