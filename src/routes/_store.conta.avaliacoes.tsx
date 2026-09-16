import { createFileRoute, Link } from "@tanstack/react-router";
import { EmptyState } from "@/components/state/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

import { listCustomerReviews } from "@/services/cms.functions";
import { formatDate } from "@/lib/datetime";

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

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
  component: Page,
});

const STATUS_LABELS: Record<string, string> = {
  pending: "Em análise",
  approved: "Publicada",
  rejected: "Recusada",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} de 5 estrelas`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-4 ${i < rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
          aria-hidden
        />
      ))}
    </div>
  );
}

function Page() {
  const reviews = (Route.useLoaderData() as any[]) || [];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 sm:space-y-6 pb-24 px-0 sm:px-4 md:px-0 animate-in fade-in duration-200">
      {/* ── 1. Clean Minimalist Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5 pt-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Minhas Avaliações
          </h1>
          {reviews.length > 0 && (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full">
              {reviews.length}
            </Badge>
          )}
        </div>

        <Button asChild variant="outline" className="rounded-xl text-sm font-semibold h-11 px-5 cursor-pointer w-full sm:w-auto shadow-2xs">
          <Link to="/mercado">Explorar Lojas</Link>
        </Button>
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          title="Nenhuma avaliação enviada"
          description="Após receber suas compras, compartilhe sua experiência honesta para apoiar lojistas locais."
          action={
            <Button asChild className="rounded-xl h-11 px-6 text-sm font-semibold shadow-xs">
              <Link to="/mercado">Explorar Produtos</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3.5 sm:grid sm:grid-cols-2 sm:gap-4">
          {reviews.map((review: any) => (
            <div key={review.id} className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 space-y-3.5 shadow-2xs">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {review.productSlug ? (
                    <Link
                      to="/produto/$slug"
                      params={{ slug: review.productSlug }}
                      className="text-base font-bold text-foreground hover:text-primary transition-colors truncate block"
                    >
                      {review.productName}
                    </Link>
                  ) : (
                    <p className="text-base font-bold text-foreground truncate">{review.productName}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(review.createdAt)}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANTS[review.status] ?? "secondary"} className="text-xs font-semibold px-2.5 py-0.5 rounded-md">
                  {STATUS_LABELS[review.status] ?? review.status}
                </Badge>
              </div>

              <StarRating rating={review.rating} />

              {review.comment && (
                <p className="text-sm text-foreground/80 leading-relaxed bg-muted/40 p-3.5 rounded-xl border border-border/40">
                  {review.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
