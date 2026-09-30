import { Link } from "@tanstack/react-router";
import { Clock, Eye, ArrowRight, Share2, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  // ── Modo Compacto: Projetado especificamente para trilhos horizontais ──
  // Altura h-[145px] sm:h-[155px] sincronizada perfeitamente com HitsLeadCard
  if (compact) {
    return (
      <Link
        to="/noticias/$slug"
        params={{ slug: article.slug }}
        className="group relative flex items-center gap-3.5 p-3 rounded-2xl bg-card border border-border/60 hover-elevate transition-colors w-full content-auto-card min-w-[280px] sm:min-w-[320px] max-w-[360px] h-[145px] sm:h-[155px] shrink-0 select-none overflow-hidden"
      >
        {/* Thumbnail Quadrada com cantos arredondados contínuos */}
        <div className="size-24 sm:size-28 rounded-xl overflow-hidden bg-muted shrink-0 relative aspect-square">
          {article.cover_media_url ? (
            <img
              src={article.cover_media_url}
              alt={article.title}
              loading="lazy"
              className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="size-full flex items-center justify-center bg-muted/40 text-muted-foreground">
              <Newspaper className="size-6 opacity-30" />
            </div>
          )}

          {article.reading_time_minutes && (
            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/85 text-[9px] font-mono text-white">
              {article.reading_time_minutes}m
            </span>
          )}
        </div>

        {/* Informações da Notícia */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5 space-y-1">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black uppercase text-primary tracking-wider truncate">
                {article.kicker || article.category || "Notícia"}
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {article.title}
            </h4>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
            <span className="truncate max-w-[110px] font-medium text-foreground/80">
              {article.store_name || "Redação"}
            </span>
            <span className="font-mono">{formattedDate}</span>
          </div>
        </div>
      </Link>
    );
  }

  // ── Modo Completo: Padrão Apple HIG com tipografia fluida e touch target de 44px ──
  return (
    <article className="group relative flex flex-col rounded-2xl bg-card border border-border/60 overflow-hidden hover-elevate transition-colors duration-200 content-auto-card">
      {/* ── 1. Imagem / Vídeo Full Bleed ── */}
      <Link
        to="/noticias/$slug"
        params={{ slug: article.slug }}
        className="relative aspect-16/10 w-full overflow-hidden bg-muted block"
      >
        {article.cover_media_url ? (
          article.cover_media_type === "video" ? (
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
              className="size-full object-cover group-hover:scale-103 transition-transform duration-500"
            />
          )
        ) : (
          <div className="size-full flex items-center justify-center bg-muted/40 text-muted-foreground">
            <Newspaper className="size-10 opacity-30" />
          </div>
        )}

        {/* Badges Flutuantes sobre a Imagem */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {article.kicker ? (
            <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-black/85 text-white border border-white/10">
              {article.kicker}
            </span>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-1.5 pointer-events-auto">
            <span className="px-2.5 py-1 rounded-md bg-black/85 text-[10px] font-mono text-white flex items-center gap-1 border border-white/10">
              <Clock className="size-3" />
              {article.reading_time_minutes || 3} min
            </span>

            {/* Botão de Compartilhar com Hit Area Expandida (44px) */}
            <button
              type="button"
              onClick={handleShare}
              className="size-9 rounded-full bg-black/85 text-white hover:bg-black/90 border border-white/10 flex items-center justify-center cursor-pointer transition-colors active:scale-95 touch-manipulation"
              title="Compartilhar notícia"
              aria-label="Compartilhar notícia"
            >
              <Share2 className="size-3.5" />
            </button>
          </div>
        </div>
      </Link>

      {/* ── 2. Conteúdo Editorial Conciso ── */}
      <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-1.5">
          {/* Autor & Data */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {article.store_avatar && (
              <img
                src={article.store_avatar}
                alt={article.store_name || "Autor"}
                className="size-4 rounded-full object-cover"
              />
            )}
            <span className="font-semibold text-foreground truncate max-w-[160px]">
              {article.store_name || article.author_name || "Redação"}
            </span>
            <span>•</span>
            <span>{formattedDate}</span>
          </div>

          {/* Título Principal */}
          <Link
            to="/noticias/$slug"
            params={{ slug: article.slug }}
            className="block group-hover:text-primary transition-colors"
          >
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground leading-snug line-clamp-2">
              {article.title}
            </h3>
          </Link>

          {/* Subtítulo / Descrição Curta */}
          {article.subtitle && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {article.subtitle}
            </p>
          )}
        </div>

        {/* ── 3. Rodapé com Touch Target de 44px ── */}
        <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
            <Eye className="size-3.5 opacity-60" />
            <span>{article.views_count || 0} leituras</span>
          </div>

          <Link
            to="/noticias/$slug"
            params={{ slug: article.slug }}
            className="inline-flex items-center gap-1.5 px-3 min-h-[44px] text-xs font-bold text-foreground hover:text-primary transition-colors group/btn"
          >
            <span>Ler Matéria</span>
            <ArrowRight className="size-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </article>
  );
}
