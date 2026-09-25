import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import {
  Clock,
  Calendar,
  Share2,
  Quote,
  Newspaper,
  ChevronRight,
  Ticket,
  MapPin,
  Users,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getArticleDetail, type NewsArticleDTO, type SponsorDTO } from "@/services/news.functions";
import { NewsSponsorBanner } from "@/components/news/news-sponsor-banner";
import { NewsCommentsSection } from "@/components/news/news-comments-section";
import { recordAdTelemetry } from "@/services/telemetry.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_store/noticias/$slug")({
  head: ({ loaderData }: any) => ({
    meta: [
      { title: loaderData?.article ? `${loaderData.article.title} | Waesy Notícias` : "Notícia | Waesy" },
      { name: "description", content: loaderData?.article?.subtitle || "Notícia local no Waesy." },
    ],
  }),
  loader: async ({ params }) => {
    try {
      const data = await getArticleDetail({ data: { slug: params.slug } }).catch(() => null);
      if (!data || !data.article) {
        throw notFound();
      }
      return data;
    } catch (err) {
      console.error("[loader:_store.noticias.$slug] Unhandled error:", err);
      return { article: null, sponsors: [], related: [], linkedEvent: null } as any;
    }
  },
  component: NoticiaDetailPage,
});

function NoticiaDetailPage() {
  const { article, sponsors = [], related = [], linkedEvent } = ((Route.useLoaderData?.() as any) || {});
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollTrackedRefs = useRef<Set<number>>(new Set());

  // Rastreamento de progresso de scroll da página (25%, 50%, 75%, 100%)
  useEffect(() => {
    if (!article?.id) return;

    // 1. Grava telemetria de visualização única do artigo
    recordAdTelemetry({
      data: {
        store_id: article.store_id,
        article_id: article.id,
        event_type: "view_unique",
      },
    }).catch(() => {});

    // 2. Listener de Scroll
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) return;
      const progress = Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100));
      setScrollProgress(progress);

      // Marco de telemetria antifraude
      [25, 50, 75, 100].forEach((milestone) => {
        if (progress >= milestone && !scrollTrackedRefs.current.has(milestone)) {
          scrollTrackedRefs.current.add(milestone);
          recordAdTelemetry({
            data: {
              store_id: article.store_id,
              article_id: article.id,
              event_type: "scroll_depth",
              scroll_percentage: milestone,
            },
          }).catch(() => {});
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [article?.id, article?.store_id]);

  if (!article) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">Matéria não encontrada</h2>
        <Button asChild variant="outline" className="rounded-xl font-bold">
          <Link to="/noticias">
            Voltar para Notícias
          </Link>
        </Button>
      </div>
    );
  }

  const handleShare = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link da notícia copiado!");
    }
  };

  const formattedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "Recente";

  const primarySponsor = sponsors[0];
  const secondarySponsor = sponsors[1] || sponsors[0];
  const footerSponsor = sponsors[2] || null;

  return (
    <div className="w-full relative">
      {/* Barra de Progresso de Leitura Fixa no Topo */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted/40 pointer-events-none">
        <div
          className="h-full bg-primary transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <article className="max-w-2xl mx-auto px-4 space-y-8 pb-20 pt-4">
        {/* Breadcrumb Apple HIG */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/noticias" className="hover:text-foreground transition-colors">
            Notícias
          </Link>
          <ChevronRight className="size-3" />
          <span className="capitalize text-foreground font-bold">{article.category}</span>
        </div>

        {/* ── Cabeçalho Editorial da Matéria ── */}
        <header className="space-y-4">
          {article.kicker && (
            <span className="px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              {article.kicker}
            </span>
          )}

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground leading-[1.18] font-display">
            {article.title}
          </h1>

          {article.subtitle && (
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-serif italic border-l-2 border-primary/40 pl-4 py-0.5">
              {article.subtitle}
            </p>
          )}

          {/* Linha de Metadados / Autor / Compartilhar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t py-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary overflow-hidden">
                  {article.store_avatar ? (
                    <img
                      src={article.store_avatar}
                      alt={article.store_name}
                      className="size-full rounded-full object-cover"
                    />
                  ) : (
                    <Newspaper className="size-3.5" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-foreground">{article.store_name || "Redação Waesy"}</p>
                  {article.author_name && <p className="text-[10px]">Por {article.author_name}</p>}
                </div>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <Calendar className="size-3.5" />
                <span>{formattedDate}</span>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <Clock className="size-3.5" />
                <span>{article.reading_time_minutes} min de leitura</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="rounded-xl font-bold text-xs gap-1.5 h-10 px-3.5 min-h-[44px]"
            >
              <Share2 className="size-3.5" />
              <span>Compartilhar</span>
            </Button>
          </div>
        </header>

        {/* ── Capa Principal (Imagem ou Vídeo) ── */}
        {article.cover_media_url && (
          <div className="space-y-2">
            <div className="relative aspect-16/9 rounded-2xl overflow-hidden bg-muted">
              {article.cover_media_type === "video" ? (
                <video
                  src={article.cover_media_url}
                  autoPlay
                  controls
                  className="size-full object-cover"
                />
              ) : (
                <img
                  src={article.cover_media_url}
                  alt={article.title}
                  className="size-full object-cover"
                />
              )}
            </div>
          </div>
        )}

        {/* ── Patrocinador Topo / Entrada Randômica ── */}
        {primarySponsor && (
          <NewsSponsorBanner
            sponsor={primarySponsor}
            articleId={article.id}
            placementType="news_top"
          />
        )}

        {/* ── Corpo do Artigo / Seções Estruturadas ── */}
        <div className="space-y-6 text-sm sm:text-base leading-relaxed text-foreground/90">
          {article.content_sections && article.content_sections.length > 0 ? (
            article.content_sections.map((section: any, idx: number) => {
              // Insere patrocinador no meio do artigo (após o 2º bloco)
              const showMidSponsor = idx === 1 && secondarySponsor;

              return (
                <div key={idx} className="space-y-4">
                  {section.type === "heading" && (
                    <h2 className="text-xl sm:text-2xl font-black text-foreground pt-4 tracking-tight">
                      {String(section.content)}
                    </h2>
                  )}

                  {section.type === "paragraph" && (
                    <p className="leading-relaxed whitespace-pre-line">{String(section.content)}</p>
                  )}

                  {section.type === "quote" && (
                    <blockquote className="my-6 p-5 rounded-2xl bg-muted/30 border-l-4 border-primary text-foreground font-serif italic text-base sm:text-lg flex items-start gap-3">
                      <Quote className="size-6 text-primary shrink-0 opacity-40" />
                      <div>
                        <p>{String(section.content)}</p>
                        {section.caption && (
                          <cite className="block mt-2 text-xs font-sans font-bold text-muted-foreground not-italic">
                            — {section.caption}
                          </cite>
                        )}
                      </div>
                    </blockquote>
                  )}

                  {section.type === "gallery" && (
                    <figure className="my-6 space-y-2">
                      {Array.isArray(section.content) ? (
                        <div className={`grid gap-3 ${section.content.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                          {section.content.map((imgUrl: string, i: number) => (
                            <div
                              key={i}
                              className="aspect-16/9 rounded-2xl overflow-hidden bg-muted border border-border/40"
                            >
                              <img
                                src={imgUrl}
                                alt={section.caption || "Foto da matéria"}
                                className="size-full object-cover hover:scale-102 transition-transform"
                              />
                            </div>
                          ))}
                        </div>
                      ) : section.content ? (
                        <div className="aspect-16/9 rounded-2xl overflow-hidden bg-muted border border-border/40">
                          <img
                            src={String(section.content)}
                            alt={section.caption || "Foto da matéria"}
                            className="size-full object-cover"
                          />
                        </div>
                      ) : null}
                      {section.caption && (
                        <figcaption className="text-xs text-muted-foreground italic text-center font-sans">
                          {section.caption}
                        </figcaption>
                      )}
                    </figure>
                  )}

                  {showMidSponsor && (
                    <NewsSponsorBanner
                      sponsor={secondarySponsor}
                      articleId={article.id}
                      placementType="news_in_article"
                    />
                  )}
                </div>
              );
            })
          ) : (
            <p className="leading-relaxed">
              {article.subtitle || "Matéria completa publicada no portal de notícias."}
            </p>
          )}
        </div>

        {/* ── Evento Vinculado (Cross-Indexação Notícia ↔ Evento) ── */}
        {linkedEvent && (
          <div className="p-5 rounded-2xl border border-primary/20 bg-primary/5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <Ticket className="size-4" />
              <span>Evento & Ingressos Relacionados</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="space-y-1">
                <h4 className="font-extrabold text-base text-foreground">
                  {linkedEvent.title}
                </h4>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {linkedEvent.event_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5 text-primary" />
                      {new Date(linkedEvent.event_date).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  )}
                  {(linkedEvent.venue || linkedEvent.location) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5 text-primary" />
                      {linkedEvent.venue || linkedEvent.location}
                    </span>
                  )}
                  {linkedEvent.rsvp_going_count > 0 && (
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <Users className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                      {linkedEvent.rsvp_going_count} confirmados
                    </span>
                  )}
                </div>
              </div>

              <Button asChild className="rounded-xl font-bold text-xs h-10 px-4 shrink-0">
                <Link to="/evento/$id" params={{ id: linkedEvent.id }}>
                  <span>Ver Ingressos & RSVP</span>
                  <ArrowRight className="size-3.5 ml-1.5" />
                </Link>
              </Button>
            </div>
          </div>
        )}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-4">
            {article.tags.map((tag: string) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* ── Patrocinador de Rodapé ── */}
        {footerSponsor && (
          <NewsSponsorBanner
            sponsor={footerSponsor}
            articleId={article.id}
            placementType="news_footer"
          />
        )}

        {/* ── Comentários Reais & Likes Únicos ── */}
        <NewsCommentsSection articleId={article.id} />

        {/* ── Matérias Relacionadas ── */}
        {related && related.length > 0 && (
          <div className="mt-12 pt-8 space-y-4">
            <h3 className="text-lg font-black text-foreground">Leia Também</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {related.map((rel: any) => (
                <Link
                  key={rel.id}
                  to="/noticias/$slug"
                  params={{ slug: rel.slug }}
                  className="flex gap-3 p-3 rounded-2xl bg-card hover-elevate transition-all group"
                >
                  {rel.cover_media_url && (
                    <div className="size-20 rounded-xl overflow-hidden bg-muted shrink-0">
                      <img
                        src={rel.cover_media_url}
                        alt={rel.title}
                        className="size-full object-cover"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-primary">
                      {rel.kicker || rel.category}
                    </span>
                    <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {rel.title}
                    </h4>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
