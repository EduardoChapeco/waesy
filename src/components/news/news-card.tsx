import { Link } from "@tanstack/react-router";
import { Clock, Eye, ArrowRight, Share2, Newspaper, MapPin, CheckCircle2 } from "lucide-react";
import { type NewsArticleDTO } from "@/services/news.functions";
import { toast } from "sonner";

export interface NewsCardProps {
  article: NewsArticleDTO;
  compact?: boolean;
}

export function NewsCard({ article, compact = false }: NewsCardProps) {
  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/noticias/${article.slug}`);
      toast.success("Link da notícia copiado!");
    }
  };

  const formattedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      })
    : "Recente";

  const sourceName = article.store_name || article.author_name || "Redação Local";
  const sourceInitial = sourceName.trim().charAt(0).toUpperCase() || "R";

  // ── Modo Compacto: Projetado para trilhos horizontais ──
  if (compact) {
    return (
      <Link
        to="/noticias/$slug"
        params={{ slug: article.slug }}
        className="group relative flex items-center gap-3 p-3 rounded-lg bg-card border border-border/60 hover:border-border transition-colors w-full content-auto-card min-w-72 sm:min-w-80 max-w-sm h-36 sm:h-40 shrink-0 select-none overflow-hidden"
      >
        <div className="size-24 sm:size-28 rounded-lg overflow-hidden bg-muted shrink-0 relative aspect-square">
          {article.cover_media_url ? (
            <img
              src={article.cover_media_url}
              alt={article.title}
              loading="lazy"
              className="size-full object-cover group-hover:scale-103 transition-transform duration-300"
            />
          ) : (
            <div className="size-full flex items-center justify-center bg-muted/40 text-muted-foreground">
              <Newspaper className="size-6 opacity-30" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-1 space-y-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-bold text-foreground truncate">{sourceName}</span>
              <CheckCircle2 className="size-3 text-primary shrink-0" />
              <span>•</span>
              <span className="shrink-0">{formattedDate}</span>
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {article.title}
            </h4>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
            <span className="font-semibold text-primary">Ler mais</span>
            {article.city && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground truncate">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">{article.city}</span>
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // ── Modo Completo: Minimalist Social Stream Editorial Card ──
  return (
    <article className="group relative flex flex-col rounded-lg bg-card border border-border/60 p-4 sm:p-5 hover:border-border transition-colors duration-200 content-auto-card">
      {/* ── 1. Header Minimalista: Fonte + Selo + Data + Compartilhar ── */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-9 rounded-full overflow-hidden bg-primary/10 text-primary border border-border/50 flex items-center justify-center shrink-0 font-bold text-xs">
            {article.store_avatar ? (
              <img
                src={article.store_avatar}
                alt={sourceName}
                className="size-full object-cover"
              />
            ) : (
              <span>{sourceInitial}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground truncate">{sourceName}</span>
              <CheckCircle2 className="size-3.5 text-primary fill-primary/15 shrink-0" />
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground shrink-0">{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{article.kicker || article.category || "Jornalismo Local"}</span>
              {article.city && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 truncate">
                    <MapPin className="size-3 shrink-0" />
                    <span>{article.city}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="size-11 min-h-11 min-w-11 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center justify-center cursor-pointer transition-colors active:scale-95 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title="Compartilhar notícia"
          aria-label="Compartilhar notícia"
        >
          <Share2 className="size-4" />
        </button>
      </div>

      {/* ── 2. Manchete + Resumo + "Ler mais" Acima da Mídia ── */}
      <div className="space-y-2 mb-3">
        <Link
          to="/noticias/$slug"
          params={{ slug: article.slug }}
          className="block group-hover:text-primary transition-colors"
        >
          <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground leading-snug line-clamp-2">
            {article.title}
          </h3>
        </Link>

        <p className="text-sm text-foreground/85 leading-relaxed line-clamp-3">
          {article.subtitle || article.title}{" "}
          <Link
            to="/noticias/$slug"
            params={{ slug: article.slug }}
            className="inline font-semibold text-primary hover:underline ml-1"
          >
            Ler mais
          </Link>
        </p>
      </div>

      {/* ── 3. Mídia Arredondada Limpa Abaixo do Texto ── */}
      {article.cover_media_url && (
        <Link
          to="/noticias/$slug"
          params={{ slug: article.slug }}
          className="relative aspect-16/10 w-full rounded-lg overflow-hidden bg-muted border border-border/50 mb-3 block"
        >
          {article.cover_media_type === "video" ? (
            <video
              src={article.cover_media_url}
              autoPlay
              muted
              loop
              playsInline
              className="size-full object-cover"
            />
          ) : (
            <img
              src={article.cover_media_url}
              alt={article.title}
              loading="lazy"
              className="size-full object-cover group-hover:scale-102 transition-transform duration-300"
            />
          )}
        </Link>
      )}

      {/* ── 4. Rodapé Minimalista com Touch Target de 44px ── */}
      <div className="pt-2 mt-auto border-t border-border/40 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            <span>{article.reading_time_minutes || 3} min de leitura</span>
          </span>
          {(article.views_count || 0) > 0 && (
            <span className="inline-flex items-center gap-1">
              <Eye className="size-3.5" />
              <span>{article.views_count}</span>
            </span>
          )}
        </div>

        <Link
          to="/noticias/$slug"
          params={{ slug: article.slug }}
          className="inline-flex items-center gap-2 px-3 min-h-11 rounded-full text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
        >
          <span>Ler matéria completa</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}
