import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, type ElementType } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, PenLine, Package, CheckCircle2, Clock, XCircle, ChevronRight, MessageSquare } from "lucide-react";
import { listCustomerReviews } from "@/services/cms.functions";
import { formatDate } from "@/lib/datetime";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";

// ─── Types & Constants ────────────────────────────────────────────────────────

type ReviewStatus = "pending" | "approved" | "rejected";

const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "Em análise",
  approved: "Publicada",
  rejected: "Recusada",
};

const STATUS_VARIANTS: Record<ReviewStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

const STATUS_ICONS: Record<ReviewStatus, ElementType> = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
};

const FILTER_CHIPS = [
  { id: "todas", label: "Todas" },
  { id: "approved", label: "Publicadas", status: "approved" },
  { id: "pending", label: "Em análise", status: "pending" },
  { id: "rejected", label: "Recusadas", status: "rejected" },
];

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_store/conta/avaliacoes")({
  head: () => ({ meta: [{ title: "Minhas Avaliações | Waesy" }] }),
  loader: async () => {
    try {
      return (await listCustomerReviews().catch(() => [])) || [];
    } catch (err) {
      console.error("[loader:_store.conta.avaliacoes] Unhandled error:", err);
      return [] as any;
    }
  },
  component: CustomerReviewsPage,
});

// ─── StarRating ───────────────────────────────────────────────────────────────

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "size-4" : "size-5";
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} de 5 estrelas`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${sizeClass} ${
            i < rating ? "fill-amber-400 text-amber-400" : "text-border"
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

// ─── ReviewCard ───────────────────────────────────────────────────────────────

function ReviewCard({ review }: { review: any }) {
  const status = review.status as ReviewStatus;
  const StatusIcon = STATUS_ICONS[status] || Clock;
  const [expanded, setExpanded] = useState(false);
  const isLong = review.comment && review.comment.length > 160;

  return (
    <div className="bg-card border-y sm:border border-border/50 rounded-none sm:rounded-lg overflow-hidden">
      {/* Header do card */}
      <div className="px-4 py-4 flex items-start justify-between gap-3 border-b border-border/30">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Ícone de produto */}
          <div className="size-10 rounded-lg bg-muted/50 border border-border/40 flex items-center justify-center shrink-0">
            <Package className="size-5 text-muted-foreground/50" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            {review.productSlug ? (
              <Link
                to="/produto/$slug"
                params={{ slug: review.productSlug }}
                className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate block leading-snug focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                {review.productName || "Produto"}
              </Link>
            ) : (
              <p className="text-sm font-semibold text-foreground truncate leading-snug">
                {review.productName || "Produto"}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <StarRating rating={review.rating} />
              <span className="text-xs text-muted-foreground">
                {formatDate(review.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Badge de status */}
        <div className="flex items-center gap-2 shrink-0">
          <StatusIcon className="size-4 text-muted-foreground" strokeWidth={1.75} />
          <Badge
            variant={STATUS_VARIANTS[status] || "secondary"}
            className="text-xs font-semibold rounded-md px-2 h-6"
          >
            {STATUS_LABELS[status] || status}
          </Badge>
        </div>
      </div>

      {/* Comentário */}
      {review.comment && (
        <div className="px-4 py-3">
          <div className="flex items-start gap-2">
            <MessageSquare className="size-4 text-muted-foreground/40 shrink-0 mt-1" strokeWidth={1.5} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs text-foreground/80 leading-relaxed ${!expanded && isLong ? "line-clamp-3" : ""}`}>
                {review.comment}
              </p>
              {isLong && (
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-primary font-semibold mt-1 cursor-pointer hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  {expanded ? "Ver menos" : "Ver mais"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ações */}
      {review.productSlug && status === "approved" && (
        <div className="px-4 py-3 border-t border-border/30 flex items-center justify-end">
          <Link
            to="/produto/$slug"
            params={{ slug: review.productSlug }}
            className="text-xs text-muted-foreground hover:text-primary font-semibold flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            <span>Ver produto</span>
            <ChevronRight className="size-4" strokeWidth={2} />
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

function CustomerReviewsPage() {
  const reviews = (Route.useLoaderData() as any[]) || [];
  const [activeFilter, setActiveFilter] = useState("todas");

  const filtered = useMemo(() => {
    if (activeFilter === "todas") return reviews;
    return reviews.filter((r: any) => r.status === activeFilter);
  }, [reviews, activeFilter]);

  const counts = useMemo(() => {
    return FILTER_CHIPS.reduce(
      (acc, chip) => {
        if (chip.id === "todas") {
          acc[chip.id] = reviews.length;
        } else {
          acc[chip.id] = reviews.filter((r: any) => r.status === chip.status).length;
        }
        return acc;
      },
      {} as Record<string, number>
    );
  }, [reviews]);

  // Métricas rápidas
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) / reviews.length).toFixed(1)
      : null;

  return (
    <div className="w-full max-w-2xl mx-auto pb-24 px-4 sm:px-6">
      {/* ── 1. Native Mobile Header (Apple HIG / PWA Nativo) ── */}
      <NativeMobileHeader
        title="Avaliações"
        fallbackHref="/conta"
        badge={
          reviews.length > 0 ? (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-1 rounded-full">
              {reviews.length}
            </Badge>
          ) : null
        }
        rightActions={
          <Button
            asChild
            variant="outline"
            size="default"
            className="rounded-lg text-xs font-semibold h-11 min-h-11 px-4 cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Link to="/mercado">Explorar</Link>
          </Button>
        }
      />

      {/* ── 2. Desktop Inpage Header (Bento Grid & Apple HIG) ── */}
      <div className="hidden md:flex items-center justify-between pb-4 pt-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Avaliações</h1>
          <p className="text-xs text-muted-foreground mt-1">Histórico de comentários e avaliações dos seus pedidos</p>
        </div>
        <Button
          asChild
          variant="outline"
          size="default"
          className="rounded-lg text-xs font-semibold h-11 min-h-11 px-4 cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Link to="/mercado">Explorar</Link>
        </Button>
      </div>

      {reviews.length === 0 ? (
        /* ── Empty State Honesto ── */
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-3">
          <Star className="size-10 text-muted-foreground/40 mb-1" strokeWidth={1.5} />
          <div>
            <h2 className="text-base font-bold text-foreground">Nenhuma avaliação enviada</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
              Após receber suas compras, compartilhe sua experiência para ajudar outros compradores e apoiar lojistas locais.
            </p>
          </div>
          <Button asChild className="rounded-lg h-11 min-h-11 px-6 text-xs font-bold mt-2 focus-visible:ring-2 focus-visible:ring-primary">
            <Link to="/mercado">Explorar Produtos</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* ── 3. Indicador de média geral (silencioso) ── */}
          {avgRating && (
            <div className="flex items-center gap-3 py-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-foreground font-mono">{avgRating}</span>
                <div className="flex flex-col">
                  <StarRating rating={Math.round(Number(avgRating))} size="sm" />
                  <span className="text-xs text-muted-foreground mt-1">
                    {reviews.length} avaliação{reviews.length > 1 ? "ões" : ""}
                  </span>
                </div>
              </div>
              <div className="flex-1 flex items-center gap-1 ml-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviews.filter((r: any) => r.rating === star).length;
                  const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={star} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full h-1 rounded-full bg-border/50 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-transform"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                        {star}
                        <Star className="size-2.5 fill-muted-foreground text-muted-foreground" />
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 4. Chips de filtro ── */}
          <div className="flex flex-wrap items-center gap-2 py-3">
            {FILTER_CHIPS.map((chip) => {
              const count = counts[chip.id] || 0;
              const isActive = activeFilter === chip.id;
              if (count === 0 && chip.id !== "todas") return null;
              return (
                <button
                  key={chip.id}
                  id={`review-filter-${chip.id}`}
                  type="button"
                  onClick={() => setActiveFilter(chip.id)}
                  className={`flex items-center gap-2 h-11 min-h-11 px-4 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border/60 hover:border-border hover:text-foreground"
                  }`}
                >
                  <span>{chip.label}</span>
                  {count > 0 && (
                    <span className={`text-xs font-mono ${isActive ? "opacity-80" : "text-muted-foreground"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── 5. Lista de Avaliações ── */}
          <div className="flex flex-col gap-3 mt-1">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <p className="text-sm font-semibold text-foreground">
                  Nenhuma avaliação {activeFilter !== "todas" ? `com status "${FILTER_CHIPS.find((f) => f.id === activeFilter)?.label}"` : ""}
                </p>
              </div>
            ) : (
              filtered.map((review: any) => (
                <ReviewCard key={review.id} review={review} />
              ))
            )}
          </div>

          {/* ── 6. CTA para escrever mais avaliações ── */}
          <div className="mt-6 flex items-center gap-3 p-4 rounded-lg border border-border/50 bg-card">
            <PenLine className="size-5 text-muted-foreground shrink-0" strokeWidth={1.5} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Tem mais compras para avaliar?</p>
              <p className="text-xs text-muted-foreground">
                Veja seus pedidos entregues e compartilhe sua experiência.
              </p>
            </div>
            <Button
              asChild
              size="default"
              variant="outline"
              className="rounded-lg text-xs font-semibold h-11 min-h-11 px-4 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Link to="/conta/pedidos">Ver Pedidos</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default CustomerReviewsPage;
