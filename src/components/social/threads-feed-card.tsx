import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
 Heart,
 MessageCircle,
 Repeat2,
 Send,
 MoreHorizontal,
 Bookmark,
 EyeOff,
 ShieldCheck,
 Check,
 Share2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PostEmbedRenderer, type PostEmbedData } from "./post-embed-renderer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface ThreadPostItem {
 id: string;
 author: {
 id: string;
 full_name: string;
 username?: string;
 avatar_url?: string;
 is_verified?: boolean;
 };
 content_text: string;
 media_urls?: string[];
 created_at: string;
 likes_count: number;
 replies_count: number;
 reposts_count?: number;
 has_liked?: boolean;
 has_reposted?: boolean;
 has_bookmarked?: boolean;
 poll?: {
 question: string;
 options: { id: string; text: string; votes: number }[];
 total_votes: number;
 user_voted_option?: string;
 expires_at?: string;
 };
 embed?: PostEmbedData | null;
 replies?: ThreadPostItem[];
}

export function CommunityFeedCard({
 post,
 onLike,
 onReply,
 onRepost,
 onPreviewMedia,
 isChildReply = false,
}: {
 post: ThreadPostItem;
 onLike?: (postId: string) => Promise<void> | void;
 onReply?: (post: ThreadPostItem) => void;
 onRepost?: (postId: string) => Promise<void> | void;
 onPreviewMedia?: (url: string) => void;
 isChildReply?: boolean;
}) {
 const [liked, setLiked] = useState(Boolean(post.has_liked));
 const [likesCount, setLikesCount] = useState(post.likes_count || 0);
 const [reposted, setReposted] = useState(Boolean(post.has_reposted));
 const [repostsCount, setRepostsCount] = useState(post.reposts_count || 0);
 const [bookmarked, setBookmarked] = useState(Boolean(post.has_bookmarked));
 const [isHidden, setIsHidden] = useState(false);
 const [pollData, setPollData] = useState(post.poll);
 const [isLiking, setIsLiking] = useState(false);

 if (isHidden) {
 return null;
 }

 const handleLikeClick = async () => {
 if (isLiking) return;
 setIsLiking(true);
 const nextState = !liked;
 setLiked(nextState);
 setLikesCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

 try {
 if (onLike) await onLike(post.id);
 } catch {
 setLiked(!nextState);
 setLikesCount((prev) => (!nextState ? prev + 1 : Math.max(0, prev - 1)));
 } finally {
 setIsLiking(false);
 }
 };

 const handleRepostClick = async () => {
 const nextState = !reposted;
 setReposted(nextState);
 setRepostsCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));
 toast.success(nextState ? "Publicação republicada no seu feed" : "Republicação desfeita");
 if (onRepost) await onRepost(post.id);
 };

 const handleShare = () => {
 const url = `${typeof window !== "undefined" ? window.location.origin : ""}/mural?post=${post.id}`;
 if (typeof navigator !== "undefined" && navigator.share) {
 navigator.share({ title: `Publicação de ${post.author.full_name}`, url }).catch(() => {});
 } else if (typeof navigator !== "undefined") {
 navigator.clipboard.writeText(url);
 toast.success("Link da publicação copiado!");
 }
 };

 const handleVotePoll = (optionId: string) => {
 if (!pollData || pollData.user_voted_option) return;
 const newOptions = pollData.options.map((opt) =>
 opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
 );
 setPollData({
 ...pollData,
 options: newOptions,
 total_votes: pollData.total_votes + 1,
 user_voted_option: optionId,
 });
 toast.success("Voto registrado na enquete!");
 };

 const formatRelativeTime = (isoString: string) => {
 try {
 const diffMs = Date.now() - new Date(isoString).getTime();
 const diffMin = Math.floor(diffMs / 60000);
 if (diffMin < 1) return "agora";
 if (diffMin < 60) return `${diffMin}m`;
 const diffHours = Math.floor(diffMin / 60);
 if (diffHours < 24) return `${diffHours}h`;
 const diffDays = Math.floor(diffHours / 24);
 if (diffDays < 7) return `${diffDays}d`;
 return new Date(isoString).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
 } catch {
 return "";
 }
 };

 return (
 <article className={cn("group relative flex gap-3.5 select-none", !isChildReply && "pt-4 pb-3")}>
 {/* ── Coluna Esquerda: Avatar + Linha Contínua de Thread ── */}
 <div className="flex flex-col items-center flex-shrink-0">
 <Link
 to="/membro/$id"
 params={{ id: post.author.username || post.author.id }}
 className="relative transition-transform active:scale-95 flex-shrink-0"
 >
 <Avatar className="size-10 sm:size-11 rounded-2xl ring-2 ring-background bg-muted">
 <AvatarImage src={post.author.avatar_url || ""} alt={post.author.full_name} className="object-cover" />
 <AvatarFallback className="text-xs font-bold bg-muted text-foreground">
 {post.author.full_name?.slice(0, 2)?.toUpperCase() || "WD"}
 </AvatarFallback>
 </Avatar>
 </Link>

 {/* Linha vertical de conexão se houver respostas encadeadas */}
 {(post.replies?.length || 0) > 0 && (
 <div className="w-0.5 flex-1 bg-border/60 my-1.5 rounded-full" />
 )}
 </div>

 {/* ── Coluna Direita: Conteúdo Editorial + Embeds + Ações ── */}
 <div className="flex-1 min-w-0 space-y-2">
 {/* Header do Post: Nome, Handle, Timestamp e Menu */}
 <div className="flex items-center justify-between gap-2">
 <div className="flex items-center gap-1.5 min-w-0">
 <Link
 to="/membro/$id"
 params={{ id: post.author.username || post.author.id }}
 className="font-bold text-sm text-foreground hover:underline truncate"
 >
 {post.author.username || post.author.full_name}
 </Link>

 {post.author.is_verified && (
 <ShieldCheck className="size-4 text-primary fill-primary/15 flex-shrink-0" />
 )}

 <span className="text-xs text-muted-foreground flex-shrink-0">·</span>

 <span className="text-xs text-muted-foreground font-normal flex-shrink-0">
 {formatRelativeTime(post.created_at)}
 </span>
 </div>

 {/* Menu de Ações de Post */}
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button
 size="sm"
 variant="ghost"
 className="size-8 p-0 rounded-xl text-muted-foreground hover:text-foreground opacity-70 group-hover:opacity-100 transition-opacity"
 >
 <MoreHorizontal className="size-4" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5">
 <DropdownMenuItem
 onClick={() => {
 setBookmarked(!bookmarked);
 toast.success(bookmarked ? "Removido dos salvos" : "Item salvo com sucesso!");
 }}
 className="rounded-xl cursor-pointer text-xs font-semibold gap-2"
 >
 <Bookmark className="size-3.5" />
 <span>{bookmarked ? "Remover dos Salvos" : "Salvar Publicação"}</span>
 </DropdownMenuItem>
 <DropdownMenuItem
 onClick={handleShare}
 className="rounded-xl cursor-pointer text-xs font-semibold gap-2"
 >
 <Share2 className="size-3.5" />
 <span>Copiar Link do Post</span>
 </DropdownMenuItem>
 <DropdownMenuItem
 onClick={() => {
 setIsHidden(true);
 toast.success("Publicação oculta do seu feed.", {
 action: {
 label: "Desfazer",
 onClick: () => setIsHidden(false),
 },
 });
 }}
 className="rounded-xl cursor-pointer text-xs font-semibold gap-2 text-rose-500"
 >
 <EyeOff className="size-3.5" />
 <span>Ocultar do Feed</span>
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>

 {/* Texto do Post */}
 {post.content_text && (
 <p className="text-sm sm:text-[15px] text-foreground leading-relaxed whitespace-pre-line font-normal break-words">
 {post.content_text}
 </p>
 )}

 {/* ── Renderizador de Enquete de Interação (Poll) ── */}
 {pollData && (
 <div className="mt-3 space-y-2 rounded-2xl bg-muted/20 border border-border/40 p-3.5">
 {pollData.question && (
 <p className="text-xs font-bold text-foreground mb-2">{pollData.question}</p>
 )}
 <div className="space-y-2">
 {pollData.options.map((option) => {
 const total = Math.max(1, pollData.total_votes);
 const percent = Math.round((option.votes / total) * 100);
 const isSelected = pollData.user_voted_option === option.id;

 return (
 <button
 key={option.id}
 type="button"
 onClick={() => handleVotePoll(option.id)}
 disabled={!!pollData.user_voted_option}
 className={cn(
 "w-full relative h-10 rounded-xl overflow-hidden text-left flex items-center justify-between px-3 text-xs font-bold transition-all border",
 isSelected
 ? "border-primary bg-primary/10 text-primary"
 : "border-border/60 bg-card hover:bg-muted/40 text-foreground"
 )}
 >
 {/* Barra de Porcentagem Animada */}
 {pollData.user_voted_option && (
 <div
 className={cn(
 "absolute top-0 bottom-0 left-0 transition-all duration-500 rounded-xl opacity-20",
 isSelected ? "bg-primary" : "bg-foreground"
 )}
 style={{ width: `${percent}%` }}
 />
 )}
 <span className="relative z-10 truncate flex items-center gap-1.5">
 {option.text}
 {isSelected && <Check className="size-3 text-primary" />}
 </span>
 {pollData.user_voted_option && (
 <span className="relative z-10 font-mono text-[11px] text-muted-foreground">
 {percent}%
 </span>
 )}
 </button>
 );
 })}
 </div>
 <div className="text-[10px] text-muted-foreground font-medium pt-1">
 {pollData.total_votes} votos {pollData.expires_at ? `• ${pollData.expires_at}` : ""}
 </div>
 </div>
 )}

 {/* ── Galeria de Mídias (Aspecto Vertical 4:5 / Grade 1:1) ── */}
 {post.media_urls && post.media_urls.length > 0 && (
 <div
 className={cn(
 "mt-3 rounded-2xl overflow-hidden border border-border/40",
 post.media_urls.length === 1 ? "max-h-[480px] bg-black/5" : "grid grid-cols-2 gap-1.5"
 )}
 >
 {post.media_urls.map((url, idx) => (
 <div
 key={idx}
 className={cn(
 "relative cursor-pointer overflow-hidden group/media bg-muted/40",
 post.media_urls!.length === 1 ? "w-full max-h-[480px]" : "aspect-square"
 )}
 onClick={() => onPreviewMedia && onPreviewMedia(url)}
 >
 <img
 src={url}
 alt="Mídia da publicação"
 className="size-full object-cover transition-transform duration-300 group-hover/media:scale-102"
 />
 </div>
 ))}
 </div>
 )}

 {/* ── Renderizador Polimórfico de Embed (Evento, Produto, Classificado, Notícia) ── */}
 <PostEmbedRenderer embed={post.embed} />

 {/* ── Cluster de Ações de Interação (Touch Targets 44px) ── */}
 <div className="flex items-center gap-1 pt-1 text-muted-foreground -ml-2">
 {/* Curtir */}
 <button
 type="button"
 onClick={handleLikeClick}
 className={cn(
 "h-9 px-2.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer active:scale-90",
 liked ? "text-rose-500" : "hover:text-foreground hover:bg-muted/40"
 )}
 aria-label="Curtir"
 >
 <Heart className={cn("size-4 transition-transform", liked && "fill-rose-500 text-rose-500 scale-110")} />
 {likesCount > 0 && <span>{likesCount}</span>}
 </button>

 {/* Responder / Comentar */}
 <button
 type="button"
 onClick={() => onReply && onReply(post)}
 className="h-9 px-2.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold hover:text-foreground hover:bg-muted/40 transition-all cursor-pointer active:scale-90"
 aria-label="Comentar"
 >
 <MessageCircle className="size-4" />
 {post.replies_count > 0 && <span>{post.replies_count}</span>}
 </button>

 {/* Repostar */}
 <button
 type="button"
 onClick={handleRepostClick}
 className={cn(
 "h-9 px-2.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer active:scale-90",
 reposted ? "text-emerald-500" : "hover:text-foreground hover:bg-muted/40"
 )}
 aria-label="Republicar"
 >
 <Repeat2 className={cn("size-4", reposted && "text-emerald-500 font-bold")} />
 {repostsCount > 0 && <span>{repostsCount}</span>}
 </button>

 {/* Compartilhar */}
 <button
 type="button"
 onClick={handleShare}
 className="h-9 px-2.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold hover:text-foreground hover:bg-muted/40 transition-all cursor-pointer active:scale-90"
 aria-label="Compartilhar"
 >
 <Send className="size-4" />
 </button>
 </div>

 {/* ── Resumo de Interações com Avatar Stack ── */}
 {(likesCount > 0 || post.replies_count > 0) && (
 <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground font-normal">
 <div className="flex -space-x-1.5 overflow-hidden">
 <Avatar className="size-4.5 rounded-full ring-1 ring-background">
 <AvatarImage src={post.author.avatar_url || ""} />
 <AvatarFallback className="text-[8px]">WD</AvatarFallback>
 </Avatar>
 </div>
 <span>
 {[
 post.replies_count > 0 ? `${post.replies_count} respostas` : null,
 likesCount > 0 ? `${likesCount} curtidas` : null,
 ]
 .filter(Boolean)
 .join(" · ")}
 </span>
 </div>
 )}
 </div>
 </article>
 );
}

export const ThreadsFeedCard = CommunityFeedCard;
