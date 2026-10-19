import { Link } from "@tanstack/react-router";
import { Clock, Eye, ArrowRight, Share2, Newspaper, MapPin, CheckCircle2 } from "lucide-react";
import { type NewsArticleDTO } from "@/services/news.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface NewsCardProps {
  article: NewsArticleDTO;
  variant?: "grid" | "compact" | "list" | "hero";
  compact?: boolean;
  className?: string;
}

export function NewsCard({
  article,
  variant,
  compact = false,
  className = "",
}: NewsCardProps) {
  const activeVariant = variant || (compact ? "compact" : "grid");

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

  // ── 1. MODO COMPACTO: Projetado para trilhos horizontais sem estouro ou truncamento ──
  if (activeVariant === "compact") {
    return (
      <Link
        to="/noticias/$slug"
        params={{ slug: article.slug }}
        className={cn(
          "group relative flex items-center gap-3 p-3 rounded-lg bg-card border border-border/60 hover:border-border transition-colors w-full content-auto-card h-32 sm:h-36 shrink-0 select-none overflow-hidden",
          className
        )}
      >
        <div className="size-20 sm:size-24 rounded-lg overflow-hidden bg-muted shrink-0 relative aspect-square">
          {article.cover_media_url ? (
            <img
              src={article.cover_media_url}
              alt={article.title}
              loading="lazy"
              className="size-full object-cover group-hover:scale-103 transition-transform duration-300"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
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
            <h4 className="text-xs sm:text-sm font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors break-words text-wrap">
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

  // ── 2. MODO LISTA: Layout editorial linear com miniatura lateral (Apple News / G1) ──
  if (activeVariant === "list") {
    return (
      <article
        className={cn(
          "group relative flex items-center justify-between gap-4 p-4 rounded-lg bg-card border border-border/60 hover:border-border transition-colors duration-200 content-auto-card w-full",
          className
        )}
      >
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="font-bold text-foreground truncate">{sourceName}</span>
            <CheckCircle2 className="size-3.5 text-primary shrink-0" />
            <span>•</span>
            <span className="shrink-0">{formattedDate}</span>
            {article.category && (
              <>
                <span>•</span>
                <span className="font-medium text-primary uppercase text-xs">
                  {article.kicker || article.category}
                </span>
              </>
            )}
            {article.city && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3 shrink-0" />
                  <span>{article.city}</span>
                </span>
              </>
            )}
          </div>

          <Link
            to="/noticias/$slug"
            params={{ slug: article.slug }}
            className="block group-hover:text-primary transition-colors"
          >
            <h3 className="text-sm sm:text-base font-bold tracking-tight text-foreground leading-snug line-clamp-2">
              {article.title}
            </h3>
          </Link>

          {article.subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed hidden sm:block">
              {article.subtitle}
            </p>
          )}

          <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
            <Link
              to="/noticias/$slug"
              params={{ slug: article.slug }}
              className="inline-flex items-center gap-2 font-semibold text-primary hover:underline min-h-11"
            >
              <span>Ler matéria</span>
              <ArrowRight className="size-3.5" />
            </Link>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              <span>{article.reading_time_minutes || 3} min</span>
            </span>
          </div>
        </div>

        {article.cover_media_url ? (
          <Link
            to="/noticias/$slug"
            params={{ slug: article.slug }}
            className="size-20 sm:size-28 rounded-lg overflow-hidden bg-muted shrink-0 relative aspect-square border border-border/50 block"
          >
            <img
              src={article.cover_media_url}
              alt={article.title}
              loading="lazy"
              className="size-full object-cover group-hover:scale-103 transition-transform duration-300"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleShare}
            className="size-11 min-h-11 min-w-11 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center justify-center cursor-pointer transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Compartilhar notícia"
            aria-label="Compartilhar notícia"
          >
            <Share2 className="size-4" />
          </button>
        )}
      </article>
    );
  }

  // ── 3. MODO HERO: Manchete principal bipartida no desktop (7 colunas imagem, 5 texto) ──
  if (activeVariant === "hero") {
    return (
      <section
        className={cn(
          "relative rounded-lg overflow-hidden bg-card border border-border/60 group hover:border-border transition-colors duration-200 content-auto-card",
          className
        )}
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-6 items-center">
          {article.cover_media_url && (
            <div className="md:col-span-7 relative aspect-video md:aspect-16/10 w-full overflow-hidden bg-muted">
              <img
                src={article.cover_media_url}
                alt={article.title}
                className="size-full object-cover group-hover:scale-103 transition-transform duration-300"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
            </div>
          )}

          <div
            className={cn(
              "p-5 sm:p-6 space-y-3 flex flex-col justify-between",
              article.cover_media_url ? "md:col-span-5" : "md:col-span-12"
            )}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  {article.kicker || "Manchete Principal"}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {article.reading_time_minutes || 3} min de leitura
                </span>
              </div>

              <Link
                to="/noticias/$slug"
                params={{ slug: article.slug }}
                className="block group-hover:text-primary transition-colors"
              >
                <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-foreground leading-tight">
                  {article.title}
                </h2>
              </Link>

              {article.subtitle && (
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {article.subtitle}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-foreground/80 truncate">
                {sourceName}
              </span>
              <Link
                to="/noticias/$slug"
                params={{ slug: article.slug }}
                className="inline-flex items-center gap-2 px-3 min-h-11 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>Ler Matéria</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── 4. MODO GRID (PADRÃO): Card Editorial Contido para Grades Multi-colunares ──
  // ── 4. MODO GRID (PADRÃO): Card Limpo Estilo Post (Clean Post / Modern Social Editorial) ──
  const categoryLabel = article.kicker || article.category;

  return (
    <article
      className={cn(
        "group relative flex flex-col justify-between rounded-lg bg-card border border-border/60 p-4 sm:p-5 hover:border-border transition-colors duration-200 content-auto-card h-full select-none",
        className
      )}
    >
      <div className="flex-1 flex flex-col">
        {/* 1. Cabeçalho Minimalista em Linha Única (Post Style) */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-8 rounded-full overflow-hidden bg-primary/10 text-primary border border-border/50 flex items-center justify-center shrink-0 font-bold text-xs">
              {article.store_avatar ? (
                <img
                  src={article.store_avatar}
                  alt={sourceName}
                  className="size-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <span>{sourceInitial}</span>
              )}
            </div>
            <div className="flex items-center gap-2 min-w-0 text-xs">
              <span className="font-bold text-foreground truncate">{sourceName}</span>
              <CheckCircle2 className="size-3 text-primary fill-primary/15 shrink-0" />
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground shrink-0">{formattedDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {categoryLabel && (
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 shrink-0">
                {categoryLabel}
              </span>
            )}
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
        </div>

        {/* 2. Mídia Fotográfica Estilo Post (Âncora Visual Central) */}
        {article.cover_media_url && (
          <Link
            to="/noticias/$slug"
            params={{ slug: article.slug }}
            className="relative aspect-16/10 w-full rounded-lg overflow-hidden bg-muted border border-border/50 mb-3 block group/img"
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
                className="size-full object-cover group-hover/img:scale-102 transition-transform duration-300 motion-reduce:transition-none"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
            )}
            {article.city && (
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-background/90 border border-border/40 text-xs font-medium text-foreground flex items-center gap-1 shadow-sm">
                <MapPin className="size-3 text-primary shrink-0" />
                <span className="truncate">{article.city}</span>
              </div>
            )}
          </Link>
        )}

        {/* 3. Manchete Editorial Limpa sem Quebras Bruscas */}
        <div className="space-y-2 mb-3 flex-1">
          <Link
            to="/noticias/$slug"
            params={{ slug: article.slug }}
            className="block group-hover:text-primary transition-colors"
          >
            <h3 className="text-sm sm:text-base font-bold tracking-tight text-foreground leading-snug line-clamp-2 break-words text-wrap">
              {article.title}
            </h3>
          </Link>

          {article.subtitle && article.subtitle !== article.title && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 break-words text-wrap">
              {article.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* 4. Rodapé Minimalista com Touch Target Canônico de 44px */}
      <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2 text-xs text-muted-foreground mt-auto">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 font-mono">
            <Clock className="size-3.5" />
            <span>{article.reading_time_minutes || 3} min</span>
          </span>
          {(article.views_count || 0) > 0 && (
            <span className="inline-flex items-center gap-1 font-mono">
              <Eye className="size-3.5" />
              <span>{article.views_count}</span>
            </span>
          )}
        </div>

        <Link
          to="/noticias/$slug"
          params={{ slug: article.slug }}
          className="inline-flex items-center gap-2 px-3 min-h-11 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>Ler matéria</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}
