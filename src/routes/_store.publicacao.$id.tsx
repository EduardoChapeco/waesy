import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPostById,
  listPostComments,
  createPostComment,
  togglePostLike,
  type MuralFeedItem,
} from "@/services/social.functions";
import { getUserSession } from "@/services/auth.functions";
import { formatRelativeTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  ChevronLeft,
  ShoppingBag,
  Calendar,
  MapPin,
  ExternalLink,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_store/publicacao/$id")({
  head: ({ loaderData }) => {
    const post = (loaderData as any)?.post;
    const authorName = post?.author?.name || "Membro";
    const snippet = post?.content ? post.content.slice(0, 100) + "..." : "Confira esta publicação no Waesy.";
    return {
      meta: [
        { title: `${authorName} no Mural | Waesy Community` },
        { name: "description", content: snippet },
        { property: "og:title", content: `${authorName} no Mural` },
        { property: "og:description", content: snippet },
        { property: "og:type", content: "article" },
        ...(post?.media_urls?.[0] ? [{ property: "og:image", content: post.media_urls[0] }] : []),
      ],
    };
  },
  loader: async ({ params }) => {
    try {
      const [post, session] = await Promise.all([
        getPostById({ data: { postId: params.id } }).catch(() => null),
        getUserSession().catch(() => null),
      ]);
      return { post, session };
    } catch (err) {
      console.error("[loader:_store.publicacao.$id] Erro defensivo:", err);
      return { post: null, session: null };
    }
  },
  component: PostThreadPage,
});

function PostThreadPage() {
  const { post: initialPost, session } = ((Route.useLoaderData() || {}) as any);
  const params = Route.useParams();
  const queryClient = useQueryClient();

  const [commentInput, setCommentInput] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  // 1. Query do Post
  const { data: post } = useQuery<MuralFeedItem | null>({
    queryKey: ["post-detail", params.id],
    queryFn: () => getPostById({ data: { postId: params.id } }),
    initialData: initialPost,
  });

  // 2. Query dos Comentários
  const { data: comments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ["post-comments", params.id],
    queryFn: () => listPostComments({ data: { postId: params.id } }),
  });

  // 3. Mutação de Curtida
  const likeMutation = useMutation({
    mutationFn: () => togglePostLike({ data: { post_id: params.id } }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["post-detail", params.id] });
      const prev = queryClient.getQueryData<MuralFeedItem>(["post-detail", params.id]);
      if (prev) {
        queryClient.setQueryData<MuralFeedItem>(["post-detail", params.id], {
          ...prev,
          user_liked: !prev.user_liked,
          likes_count: prev.user_liked ? Math.max(0, prev.likes_count - 1) : prev.likes_count + 1,
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["post-detail", params.id], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["post-detail", params.id] });
    },
  });

  // 4. Mutação de Comentário
  const commentMutation = useMutation({
    mutationFn: (content: string) =>
      createPostComment({
        data: {
          postId: params.id,
          content,
        },
      }),
    onSuccess: () => {
      setCommentInput("");
      toast.success("Comentário publicado!");
      queryClient.invalidateQueries({ queryKey: ["post-comments", params.id] });
      queryClient.invalidateQueries({ queryKey: ["post-detail", params.id] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao publicar comentário.");
    },
  });

  const handleShare = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({
        title: `${post?.author?.name || "Membro"} no Waesy`,
        text: post?.content?.slice(0, 80) || "Veja esta publicação",
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link da publicação copiado!");
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    if (!session?.user && !session?.id) {
      toast.error("Faça login para comentar nesta publicação.");
      return;
    }
    commentMutation.mutate(commentInput.trim());
  };

  if (!post) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold mb-2">Publicação não encontrada</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Esta publicação pode ter sido removida pelo autor ou não está disponível.
        </p>
        <Button asChild className="h-11 px-5 rounded-xl font-semibold">
          <Link to="/mural">Voltar ao Mural</Link>
        </Button>
      </div>
    );
  }

  const authorInitial = post.author?.name?.charAt(0)?.toUpperCase() || "W";

  return (
    <div className="min-h-screen bg-background text-foreground py-6 px-4 max-w-2xl mx-auto space-y-6">
      {/* Barra de Retorno */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="h-9 px-2 rounded-xl text-xs">
          <Link to="/mural">
            <ChevronLeft className="h-4 w-4 mr-1" /> Mural da Comunidade
          </Link>
        </Button>
        <span className="text-xs text-muted-foreground font-mono">
          {formatRelativeTime(post.created_at)}
        </span>
      </div>

      {/* Cartão Central da Thread */}
      <article className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        {/* Cabeçalho do Autor */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="size-11 rounded-full border border-border">
              <AvatarImage src={post.author?.avatar_url || ""} alt={post.author?.name} />
              <AvatarFallback className="font-bold text-sm bg-muted text-foreground">
                {authorInitial}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-bold text-sm text-foreground hover:underline cursor-pointer">
                {post.author?.name}
              </div>
              {(post.author as any)?.username && (
                <div className="text-xs text-muted-foreground font-mono">
                  @{(post.author as any).username}
                </div>
              )}
            </div>
          </div>

          <Badge variant="secondary" className="capitalize text-[11px] rounded-lg">
            {(post.post_type as string) === "offer" ? "Oferta" : (post.post_type as string) === "review" ? "Avaliação" : "Mural"}
          </Badge>
        </div>

        {/* Texto da Publicação */}
        {post.content && (
          <div className="text-sm sm:text-base leading-relaxed text-foreground whitespace-pre-line">
            {post.content}
          </div>
        )}

        {/* Galeria de Mídias */}
        {post.media_urls && post.media_urls.length > 0 && (
          <div className="rounded-xl overflow-hidden border border-border/60 bg-black/5">
            {post.media_urls.map((url: string, idx: number) => (
              <img
                key={idx}
                src={url}
                alt={`Mídia ${idx + 1}`}
                className="w-full max-h-[500px] object-cover"
                loading="lazy"
              />
            ))}
          </div>
        )}

        {/* Card de Referência Embutido (Produto ou Evento) */}
        {post.reference_data && (
          <div className="border border-border/70 rounded-xl p-3 bg-muted/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {post.reference_data.image_url || post.reference_data.cover_image ? (
                <img
                  src={post.reference_data.image_url || post.reference_data.cover_image}
                  alt=""
                  className="size-12 rounded-lg object-cover border shrink-0"
                />
              ) : (
                <div className="size-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  {post.reference_type === "product" ? <ShoppingBag className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{post.reference_data.title}</p>
                {post.reference_data.price_cents !== undefined && (
                  <p className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {post.reference_data.is_free ? "Gratuito" : formatMoney(post.reference_data.price_cents)}
                  </p>
                )}
                {post.reference_data.store_name && (
                  <p className="text-[11px] text-muted-foreground truncate">{post.reference_data.store_name}</p>
                )}
              </div>
            </div>

            {post.reference_type === "product" && post.reference_id && (
              <Button size="sm" asChild className="h-9 px-3 rounded-xl text-xs font-semibold shrink-0">
                <Link to={`/produto/${post.reference_id}` as any}>
                  Ver <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            )}
            {post.reference_type === "event" && post.reference_id && (
              <Button size="sm" asChild className="h-9 px-3 rounded-xl text-xs font-semibold shrink-0">
                <Link to={`/evento/${post.reference_id}` as any}>
                  Ingresso <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            )}
          </div>
        )}

        {/* Barra de Ações Sociais */}
        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => likeMutation.mutate()}
              className={`h-9 px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                post.user_liked ? "text-red-500 bg-red-500/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Heart className={`h-4 w-4 ${post.user_liked ? "fill-current" : ""}`} />
              <span>{post.likes_count || 0}</span>
            </button>

            <div className="h-9 px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span>{comments.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleShare}
              className="size-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
              title="Compartilhar"
            >
              <Share2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSaved(!isSaved);
                toast.success(isSaved ? "Removido dos salvos" : "Publicação salva nos seus favoritos!");
              }}
              className={`size-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                isSaved ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
              title="Salvar"
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
            </button>
          </div>
        </div>
      </article>

      {/* Seção de Comentários / Thread */}
      <section className="space-y-4">
        <h3 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
          Comentários ({comments.length})
        </h3>

        {/* Composer de Comentário */}
        <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
          <Input
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            placeholder="Deixe um comentário respeitoso..."
            className="h-11 rounded-xl text-sm flex-1"
            disabled={commentMutation.isPending}
          />
          <Button
            type="submit"
            disabled={commentMutation.isPending || !commentInput.trim()}
            className="h-11 px-4 rounded-xl font-semibold bg-foreground text-background cursor-pointer shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>

        {/* Lista de Comentários */}
        {isCommentsLoading ? (
          <div className="py-6 text-center text-xs text-muted-foreground">Carregando comentários...</div>
        ) : comments.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl p-4">
            Seja o primeiro a comentar nesta publicação.
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((c: any) => (
              <div key={c.id} className="bg-card border border-border/60 rounded-xl p-3.5 space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="size-7 rounded-full border">
                      <AvatarImage src={c.profile?.avatar_url || ""} />
                      <AvatarFallback className="text-[10px]">
                        {c.profile?.full_name?.charAt(0)?.toUpperCase() || "M"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-bold text-foreground">
                      {c.profile?.full_name || "Membro"}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {formatRelativeTime(c.created_at)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-foreground/90 pl-9 whitespace-pre-line">
                  {c.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
