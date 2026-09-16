import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Star,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  CornerDownRight,
  Send,
  Share2,
  Copy,
  Check,
  Search,
  Filter,
  ShieldCheck,
  TrendingUp,
  User,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  listStoreDealReviews,
  respondToDealReview,
} from "@/services/deal-reviews.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/avaliacoes")({
  head: () => ({
    meta: [{ title: "Central de Avaliações & Reputação | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
      const data = await listStoreDealReviews({ data: { limit: 50 } });
      return { initialData: data };
    } catch (err: any) {
      console.error("[loader:workspace.avaliacoes] error:", err);
      return { initialData: { reviews: [], stats: null } };
    }
  },
  component: WorkspaceReviewsPage,
});

export default function WorkspaceReviewsPage() {
  const { initialData } = Route.useLoaderData();
  const queryClient = useQueryClient();

  // Estados de filtro
  const [filterRating, setFilterRating] = useState<"all" | "pending" | "5" | "critical">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  const { data = initialData, refetch } = useQuery({
    queryKey: ["store-reviews-list"],
    queryFn: () => listStoreDealReviews({ data: { limit: 50 } }),
    initialData,
  });

  const reviews = data?.reviews || [];
  const stats = data?.stats || {
    average_rating: 5.0,
    total_reviews: 0,
    count_5_stars: 0,
    count_4_stars: 0,
    count_3_stars: 0,
    count_low_stars: 0,
    verified_percentage: 100,
  };

  // Mutação para responder avaliação
  const respondMutation = useMutation({
    mutationFn: (payload: { reviewId: string; responseComment: string }) =>
      respondToDealReview({ data: payload }),
    onSuccess: () => {
      toast.success("Resposta publicada com sucesso!");
      setReplyingToId(null);
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["store-reviews-list"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao publicar resposta.");
    },
  });

  const handleSendReply = (reviewId: string) => {
    if (!replyText.trim()) {
      toast.error("Escreva uma resposta para o cliente.");
      return;
    }
    respondMutation.mutate({ reviewId, responseComment: replyText.trim() });
  };

  const handleCopyReviewLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/avaliar`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast.success("Link para envio a clientes copiado!");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Filtragem de avaliações
  const filteredReviews = useMemo(() => {
    return reviews.filter((r: any) => {
      // Filtro por status / rating
      if (filterRating === "pending" && r.response_comment) return false;
      if (filterRating === "5" && r.rating !== 5) return false;
      if (filterRating === "critical" && (r.rating > 3 || r.rating <= 0)) return false;

      // Filtro por texto
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const clientName = r.reviewer?.full_name?.toLowerCase() || "";
        const comment = r.comment?.toLowerCase() || "";
        const itemTitle = r.classified?.title?.toLowerCase() || "";
        return clientName.includes(query) || comment.includes(query) || itemTitle.includes(query);
      }

      return true;
    });
  }, [reviews, filterRating, searchQuery]);

  const repliedCount = reviews.filter((r: any) => r.response_comment).length;
  const replyRate = reviews.length > 0 ? Math.round((repliedCount / reviews.length) * 100) : 100;

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-0 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Central de Avaliações & Reputação
            </h1>
            <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-600 bg-amber-500/10">
              {stats.average_rating.toFixed(1)} ★ ({stats.total_reviews})
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Acompanhe o que seus clientes dizem, responda aos feedbacks e gerencie a prova social da sua marca.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyReviewLink}
          className="rounded-xl h-10 px-4 gap-2 text-xs"
        >
          {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          <span>{copiedLink ? "Link Copiado" : "Copiar Link de Avaliação"}</span>
        </Button>
      </div>

      {/* Grid de Estatísticas / Reputação */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Média Geral */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-2 shadow-xs">
          <span className="text-xs text-muted-foreground font-medium">Nota Média da Loja</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.average_rating.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">de 5.0</span>
          </div>
          <div className="flex items-center gap-1 text-amber-500 pt-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={cn(
                  "w-4 h-4",
                  s <= Math.round(stats.average_rating) ? "fill-amber-500" : "text-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </div>

        {/* Card 2: Total Avaliações */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-2 shadow-xs">
          <span className="text-xs text-muted-foreground font-medium">Total de Avaliações</span>
          <div className="text-3xl font-bold tracking-tight text-foreground">
            {stats.total_reviews}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.count_5_stars} avaliações 5 estrelas ({stats.total_reviews > 0 ? Math.round((stats.count_5_stars / stats.total_reviews) * 100) : 100}%)
          </p>
        </div>

        {/* Card 3: Taxa de Resposta */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-2 shadow-xs">
          <span className="text-xs text-muted-foreground font-medium">Taxa de Resposta</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-emerald-600">
              {replyRate}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {repliedCount} de {stats.total_reviews} avaliações respondidas
          </p>
        </div>

        {/* Card 4: Distribuição */}
        <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-1.5 shadow-xs text-xs">
          <span className="text-xs text-muted-foreground font-medium block mb-1">Distribuição de Notas</span>
          <div className="flex items-center gap-2">
            <span className="w-6 text-muted-foreground text-[11px]">5★</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${stats.total_reviews > 0 ? (stats.count_5_stars / stats.total_reviews) * 100 : 0}%` }}
              />
            </div>
            <span className="w-5 text-right font-mono text-[11px]">{stats.count_5_stars}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 text-muted-foreground text-[11px]">4★</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full"
                style={{ width: `${stats.total_reviews > 0 ? (stats.count_4_stars / stats.total_reviews) * 100 : 0}%` }}
              />
            </div>
            <span className="w-5 text-right font-mono text-[11px]">{stats.count_4_stars}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 text-muted-foreground text-[11px]">3★</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-300 rounded-full"
                style={{ width: `${stats.total_reviews > 0 ? (stats.count_3_stars / stats.total_reviews) * 100 : 0}%` }}
              />
            </div>
            <span className="w-5 text-right font-mono text-[11px]">{stats.count_3_stars}</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setFilterRating("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap",
              filterRating === "all"
                ? "bg-foreground text-background font-semibold"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            )}
          >
            Todas ({reviews.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterRating("pending")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap",
              filterRating === "pending"
                ? "bg-foreground text-background font-semibold"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            )}
          >
            Sem Resposta ({reviews.filter((r: any) => !r.response_comment).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterRating("5")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap",
              filterRating === "5"
                ? "bg-foreground text-background font-semibold"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            )}
          >
            5 Estrelas ({stats.count_5_stars})
          </button>
          <button
            type="button"
            onClick={() => setFilterRating("critical")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap",
              filterRating === "critical"
                ? "bg-rose-500 text-white font-semibold"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            )}
          >
            Críticas ({stats.count_3_stars + stats.count_low_stars})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente ou produto..."
            className="pl-8 h-9 text-xs rounded-xl"
          />
        </div>
      </div>

      {/* Lista de Avaliações */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card">
            <Star className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
            <h3 className="text-sm font-semibold text-foreground">Nenhuma avaliação encontrada</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Compartilhe o link da sua loja e produtos para receber depoimentos dos seus clientes.
            </p>
          </div>
        ) : (
          filteredReviews.map((review: any) => (
            <div
              key={review.id}
              className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-xs transition-colors hover:border-border"
            >
              {/* Header da Avaliação */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    {review.reviewer?.avatar_url ? (
                      <img
                        src={review.reviewer.avatar_url}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      review.reviewer?.full_name?.slice(0, 2).toUpperCase() || "CL"
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      {review.reviewer?.full_name || "Cliente Verificado"}
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {review.classified?.title && (
                    <Badge variant="secondary" className="text-[11px] font-normal gap-1 max-w-xs truncate">
                      <ShoppingBag className="w-3 h-3 text-muted-foreground" />
                      <span className="truncate">{review.classified.title}</span>
                    </Badge>
                  )}
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "w-4 h-4",
                          star <= review.rating ? "fill-amber-500" : "text-muted-foreground/30"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Comentário do Cliente */}
              {review.comment && (
                <p className="text-sm text-foreground/90 leading-relaxed pl-12">
                  "{review.comment}"
                </p>
              )}

              {/* Bloco de Resposta do Lojista */}
              <div className="pl-12 space-y-3">
                {review.response_comment ? (
                  <div className="bg-muted/40 border border-border/50 rounded-xl p-3.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <CornerDownRight className="w-3.5 h-3.5 text-primary" />
                        <span>Sua Resposta Oficial:</span>
                      </div>
                      <span className="text-[10px]">
                        {review.responded_at
                          ? new Date(review.responded_at).toLocaleDateString("pt-BR")
                          : "Respondida"}
                      </span>
                    </div>
                    <p className="text-foreground/80 leading-relaxed">
                      {review.response_comment}
                    </p>
                  </div>
                ) : replyingToId === review.id ? (
                  <div className="space-y-2 border border-border rounded-xl p-3 bg-muted/20">
                    <Textarea
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Escreva sua resposta para o cliente..."
                      className="text-xs rounded-lg"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReplyingToId(null);
                          setReplyText("");
                        }}
                        className="h-8 text-xs rounded-lg"
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSendReply(review.id)}
                        disabled={respondMutation.isPending}
                        className="h-8 text-xs rounded-lg gap-1.5"
                      >
                        <Send className="w-3 h-3" />
                        <span>{respondMutation.isPending ? "Enviando..." : "Publicar Resposta"}</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplyingToId(review.id);
                      setReplyText("");
                    }}
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                  >
                    <CornerDownRight className="w-3.5 h-3.5" />
                    <span>Responder Cliente</span>
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
