import { useState, useEffect } from "react";
import { MessageSquare, Heart, Send, Loader2, User, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listArticleComments, submitArticleComment, toggleArticleLike, getArticleLikeStatus, type NewsCommentDTO } from "@/services/news.functions";
import { toast } from "sonner";

export interface NewsCommentsSectionProps {
 articleId: string;
}

export function NewsCommentsSection({ articleId }: NewsCommentsSectionProps) {
 const [comments, setComments] = useState<NewsCommentDTO[]>([]);
 const [newComment, setNewComment] = useState("");
 const [isLoading, setIsLoading] = useState(true);
 const [isSubmitting, setIsSubmitting] = useState(false);

 // Likes state
 const [isLiked, setIsLiked] = useState(false);
 const [totalLikes, setTotalLikes] = useState(0);
 const [isLiking, setIsLiking] = useState(false);

 useEffect(() => {
 let mounted = true;

 Promise.all([
 listArticleComments({ data: { articleId } }).catch(() => []),
 getArticleLikeStatus({ data: { articleId } }).catch(() => ({
 liked: false,
 totalLikes: 0,
 })),
 ]).then(([commentsData, likeStatus]) => {
 if (!mounted) return;
 setComments(commentsData);
 setIsLiked(likeStatus.liked);
 setTotalLikes(likeStatus.totalLikes);
 setIsLoading(false);
 });

 return () => {
 mounted = false;
 };
 }, [articleId]);

 const handleToggleLike = async () => {
 setIsLiking(true);
 try {
 const res = await toggleArticleLike({ data: { articleId } });
 setIsLiked(res.liked);
 setTotalLikes((prev) => (res.liked ? prev + 1 : Math.max(0, prev - 1)));
 if (res.liked) {
 toast.success("Você curtiu esta matéria!");
 }
 } catch (err: unknown) {
 toast.error((err instanceof Error ? err.message : String(err)) || "Faça login para curtir.");
 } finally {
 setIsLiking(false);
 }
 };

 const handleSendComment = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!newComment.trim() || newComment.length < 3) {
 toast.error("O comentário deve ter no mínimo 3 caracteres.");
 return;
 }

 setIsSubmitting(true);
 try {
 await submitArticleComment({
 data: {
 articleId,
 contentText: newComment.trim(),
 },
 });

 setNewComment("");
 toast.success("Comentário publicado!");
 const updated = await listArticleComments({ data: { articleId } });
 setComments(updated);
 } catch (err: unknown) {
 toast.error(
 (err instanceof Error ? err.message : String(err)) ||
 "Você precisa estar logado para comentar.",
 );
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <section className="mt-10 pt-8 space-y-6">
 {/* ── Header de Interação (Likes + Total Comentários) ── */}
 <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-muted/40 ">
 <div className="flex items-center gap-3">
 <Button
 variant={isLiked ? "default" : "outline"}
 size="sm"
 onClick={handleToggleLike}
 disabled={isLiking}
 className={`rounded-xl font-bold gap-2 text-xs transition-all ${
 isLiked ? "bg-destructive hover:bg-destructive text-white border-transparent" : ""
 }`}
 >
 <Heart className={`size-4 ${isLiked ? "fill-white" : ""}`} />
 <span>{totalLikes > 0 ? `${totalLikes} Curtidas` : "Curtir Matéria"}</span>
 </Button>

 <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
 <MessageSquare className="size-3.5" />
 <span>{comments.length} Comentários</span>
 </span>
 </div>

 <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
 <ShieldCheck className="size-3.5 text-emerald-500" />
 <span>Comentários de membros verificados</span>
 </div>
 </div>

 {/* ── Formulário de Comentário ── */}
 <form onSubmit={handleSendComment} className="space-y-2.5">
 <div className="relative">
 <textarea
 value={newComment}
 onChange={(e) => setNewComment(e.target.value)}
 placeholder="Deixe sua opinião ou contribuição sobre esta notícia..."
 rows={3}
 className="w-full p-3.5 rounded-2xl bg-card text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none "
 />
 </div>

 <div className="flex justify-end">
 <Button
 type="submit"
 disabled={isSubmitting || !newComment.trim()}
 size="sm"
 className="rounded-xl font-bold gap-2 text-xs bg-primary text-primary-foreground"
 >
 {isSubmitting ? (
 <Loader2 className="size-3.5 animate-spin" />
 ) : (
 <Send className="size-3.5" />
 )}
 <span>Publicar Comentário</span>
 </Button>
 </div>
 </form>

 {/* ── Lista de Comentários Reais ── */}
 <div className="space-y-3">
 {isLoading ? (
 <div className="py-6 flex items-center justify-center">
 <Loader2 className="size-5 animate-spin text-muted-foreground" />
 </div>
 ) : comments.length === 0 ? (
 <p className="text-center py-6 text-xs text-muted-foreground font-medium">
 Seja o primeiro a comentar nesta matéria.
 </p>
 ) : (
 comments.map((c) => (
 <div
 key={c.id}
 className="p-4 rounded-2xl bg-card space-y-1.5"
 >
 <div className="flex items-center justify-between text-xs">
 <div className="flex items-center gap-2">
 <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
 {c.author_avatar ? (
 <img
 src={c.author_avatar}
 alt={c.author_name}
 className="size-full rounded-full object-cover"
 />
 ) : (
 c.author_name.charAt(0).toUpperCase()
 )}
 </div>
 <span className="font-bold text-foreground">{c.author_name}</span>
 </div>
 <span className="text-[10px] text-muted-foreground">
 {new Date(c.created_at).toLocaleDateString("pt-BR", {
 day: "2-digit",
 month: "short",
 hour: "2-digit",
 minute: "2-digit",
 })}
 </span>
 </div>
 <p className="text-xs text-foreground/90 leading-relaxed pl-8">{c.content_text}</p>
 </div>
 ))
 )}
 </div>
 </section>
 );
}
