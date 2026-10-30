import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  Clock,
  Heart,
  Layers,
  MessageCircle,
  Send,
  Share2,
  FileText,
} from "lucide-react";
import type {
  BaseSiteBlockProps,
  PrometheeNewsArticleReaderBlockData,
} from "@/types/omni-builder";
import {
  normalizePrometheeArticle,
  type NormalizedPrometheeArticle,
} from "@/lib/news/news-studio-templates";
import { usePrometheePortalController } from "@/components/news/promethee-portal-store";
import { PrometheeNewsStudioModal } from "@/components/news/promethee-news-studio-modal";
import { EditorialAdSlot } from "@/components/news/editorial-ad-slot";
import { listArticleComments, submitArticleComment } from "@/services/news.functions";

export interface PrometheeNewsArticleReaderBlockProps extends BaseSiteBlockProps {
  data: PrometheeNewsArticleReaderBlockData;
  isEditing?: boolean;
  products?: any[];
  newsArticles?: any[];
  sponsors?: any[];
}

interface ReaderCommentItem {
  id: string;
  authorName: string;
  contentText: string;
  createdAtLabel: string;
}

export function PrometheeNewsArticleReaderBlock({
  id,
  className = "",
  styling,
  data,
  isEditing = false,
  products = [],
  newsArticles = [],
  sponsors = [],
}: PrometheeNewsArticleReaderBlockProps) {
  const portal = usePrometheePortalController();
  const [showSummary, setShowSummary] = useState(false);
  const [comments, setComments] = useState<ReaderCommentItem[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [urlSlug, setUrlSlug] = useState<string | null>(null);

  const normalizedPool = useMemo<NormalizedPrometheeArticle[]>(() => {
    const raw =
      Array.isArray(newsArticles) && newsArticles.length > 0
        ? newsArticles
        : Array.isArray(products)
          ? products
          : [];
    return [...portal.citizenArticles, ...raw.map((r, i) => normalizePrometheeArticle(r, i))];
  }, [newsArticles, portal.citizenArticles, products]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const slugParam = new URLSearchParams(window.location.search).get("artigo");
      if (slugParam) setUrlSlug(slugParam);
    } catch {
      // Ignora em SSR
    }
  }, []);

  const article = useMemo<NormalizedPrometheeArticle | null>(() => {
    if (portal.activeArticle) return portal.activeArticle;
    if (urlSlug) {
      return (
        normalizedPool.find((a) => a.slug === urlSlug || a.id === urlSlug) ||
        normalizedPool[0] ||
        null
      );
    }
    if (isEditing && normalizedPool.length > 0) {
      return normalizedPool[0];
    }
    return null;
  }, [isEditing, normalizedPool, portal.activeArticle, urlSlug]);

  useEffect(() => {
    if (!article?.id) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(article.id);
    if (!isUuid) {
      setComments([]);
      return;
    }

    let cancelled = false;
    listArticleComments({ data: { articleId: article.id } })
      .then((rows) => {
        if (cancelled || !Array.isArray(rows)) return;
        setComments(
          rows.map((r) => ({
            id: r.id,
            authorName: r.author_name || "Leitor",
            contentText: r.content_text,
            createdAtLabel: "Verificado",
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      });

    return () => {
      cancelled = true;
    };
  }, [article?.id]);

  if (!article) return null;

  const isLiked = Boolean(portal.likedIds[article.id]);
  const isSaved = Boolean(portal.savedIds[article.id]);

  const handleBack = () => {
    if (data?.backHref && !isEditing && typeof window !== "undefined" && !portal.activeArticle) {
      window.location.assign(data.backHref);
      return;
    }
    setUrlSlug(null);
    portal.openArticle(null);
  };

  const handleShare = async () => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("artigo", article.slug || article.id);
    try {
      if (navigator.share) {
        await navigator.share({ title: article.title, text: article.lead, url: url.toString() });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url.toString());
      }
    } catch {
      // Cancelado
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentInput.trim();
    if (text.length < 3) return;

    const optimistic: ReaderCommentItem = {
      id: `local_${Date.now()}`,
      authorName: "Leitor da Região",
      contentText: text,
      createdAtLabel: "Agora",
    };
    setComments((prev) => [optimistic, ...prev]);
    setCommentInput("");

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(article.id);
    if (isUuid) {
      try {
        await submitArticleComment({ data: { articleId: article.id, contentText: text } });
      } catch {
        // Mantém comentário local para visitantes não autenticados
      }
    }
  };

  const inlineStyle: React.CSSProperties = {};
  if (styling?.backgroundColor) inlineStyle.backgroundColor = styling.backgroundColor;
  if (styling?.textColor) inlineStyle.color = styling.textColor;

  return (
    <article
      id={id}
      style={inlineStyle}
      className={`bg-background text-foreground pb-32 pb-safe ${className}`}
    >
      {/* Topo Minimalista do Leitor (Padrão Prométhée) */}
      <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between gap-2 border-b border-border/60">
        <button
          type="button"
          onClick={handleBack}
          className="h-11 min-h-11 px-3 rounded-full border border-border bg-muted/30 hover:bg-muted inline-flex items-center gap-2 text-xs font-bold text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" />
          <span>{data?.backLabel || "Voltar"}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => portal.openStudio(article)}
            className="size-11 min-h-11 rounded-full border border-border bg-muted/30 hover:bg-muted flex items-center justify-center text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Criar post PNG desta notícia"
          >
            <Layers className="size-4" />
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="size-11 min-h-11 rounded-full border border-border bg-muted/30 hover:bg-muted flex items-center justify-center text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Compartilhar reportagem"
          >
            <Share2 className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => portal.toggleSave(article.id)}
            className={`size-11 min-h-11 rounded-full border flex items-center justify-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isSaved
                ? "bg-foreground text-background border-foreground"
                : "border-border bg-muted/30 hover:bg-muted text-foreground"
            }`}
            aria-label="Salvar reportagem"
          >
            <Bookmark className="size-4" />
          </button>
        </div>
      </div>

      {/* Corpo Editorial Limpo */}
      <div className="mx-auto max-w-3xl px-4 pt-6 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-foreground text-background text-xs font-bold">
              {article.category}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {article.city} · {article.publishedDateLabel}
            </span>
            <span className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
              <Clock className="size-3" />
              <span>{article.readingTime}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground leading-tight text-anti-truncate">
            {article.title}
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed text-anti-truncate">
            {article.lead}
          </p>

          <div className="text-xs font-semibold text-muted-foreground pt-1">
            Por <strong className="text-foreground">{article.author}</strong> · {article.role}
          </div>
        </div>

        {/* Resumo Executivo Sob Demanda */}
        {data?.showExecutiveSummary !== false && showSummary && (
          <div className="rounded-3xl border border-border bg-muted/30 p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-foreground">
              <FileText className="size-4" />
              <span>Síntese Editorial</span>
            </div>
            <ul className="space-y-2">
              {article.bulletSummary.map((b, idx) => (
                <li key={idx} className="text-sm text-foreground leading-relaxed">
                  <strong>•</strong> {b}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Capa Fotográfica Real */}
        {article.coverImageUrl && (
          <figure className="overflow-hidden rounded-3xl border border-border bg-muted">
            <img
              src={article.coverImageUrl}
              alt={article.title}
              className="w-full aspect-video object-cover"
            />
          </figure>
        )}

        {/* Parágrafos da Matéria */}
        <div className="space-y-4">
          {article.body.map((paragraph, idx) => (
            <React.Fragment key={idx}>
              <p className="text-base text-foreground/90 leading-relaxed whitespace-pre-line break-words">
                {paragraph}
              </p>

              {idx === 0 && article.quote && article.quote !== article.title && (
                <blockquote className="rounded-2xl border-l-4 border-foreground bg-muted/30 p-4 text-base font-semibold text-foreground leading-relaxed">
                  “{article.quote}”
                </blockquote>
              )}

              {idx === 1 && data?.showInArticleAd !== false && (
                <EditorialAdSlot
                  placementZone="article_inline_mid"
                  storeId={portal.storeId || ""}
                  articleId={article.id}
                  viewerCity={portal.selectedCity}
                  category={article.category}
                  className="my-4"
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Rodapé Comercial Auditável */}
        {data?.showInArticleAd !== false && (
          <EditorialAdSlot
            placementZone="article_footer_cta"
            storeId={portal.storeId || ""}
            articleId={article.id}
            viewerCity={portal.selectedCity}
            category={article.category}
            className="my-4"
          />
        )}

        {/* Comentários da Comunidade */}
        {data?.showComments !== false && (
          <section id={`${id}-comments`} className="pt-6 border-t border-border space-y-4">
            <h2 className="text-lg font-bold text-foreground">
              Comentários ({comments.length + article.commentsCount})
            </h2>

            <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Escreva seu comentário sobre a notícia..."
                className="h-11 min-h-11 flex-1 rounded-full border border-border bg-card px-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="submit"
                className="size-11 min-h-11 shrink-0 rounded-full bg-foreground text-background hover:bg-foreground/90 flex items-center justify-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Enviar comentário"
              >
                <Send className="size-4" />
              </button>
            </form>

            {comments.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Nenhum comentário publicado nesta notícia ainda.</p>
            ) : (
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-border bg-card p-4 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <strong className="font-bold text-foreground">{c.authorName}</strong>
                      <span className="text-muted-foreground">{c.createdAtLabel}</span>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line break-words">
                      {c.contentText}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Pílula Inferior Flutuante Discreta (z-30 < z-50 de Modais — Invariante B.34) */}
      <div className="fixed bottom-4 inset-x-0 z-30 flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto rounded-full border border-border bg-background/95 backdrop-blur-md px-3 py-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => portal.toggleLike(article.id)}
            className={`h-11 min-h-11 px-4 rounded-full inline-flex items-center gap-2 text-xs font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isLiked
                ? "bg-foreground text-background"
                : "text-foreground hover:bg-muted"
            }`}
          >
            <Heart className="size-4" />
            <span>{article.likesCount + (isLiked ? 1 : 0)}</span>
          </button>

          <a
            href={`#${id}-comments`}
            className="h-11 min-h-11 px-4 rounded-full inline-flex items-center gap-2 text-xs font-bold text-foreground hover:bg-muted transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MessageCircle className="size-4" />
            <span>{comments.length + article.commentsCount}</span>
          </a>

          {data?.showExecutiveSummary !== false && (
            <button
              type="button"
              onClick={() => setShowSummary((prev) => !prev)}
              className={`h-11 min-h-11 px-4 rounded-full inline-flex items-center gap-2 text-xs font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                showSummary
                  ? "bg-foreground text-background"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <FileText className="size-4" />
              <span>Síntese</span>
            </button>
          )}
        </div>
      </div>

      <PrometheeNewsStudioModal
        isOpen={portal.isStudioModalOpen}
        initialArticle={portal.studioArticle || article}
        availableArticles={normalizedPool}
        onClose={() => portal.closeStudio()}
      />
    </article>
  );
}
