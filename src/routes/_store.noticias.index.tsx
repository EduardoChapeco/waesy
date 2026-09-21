import { Tag } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  NewspaperClipping,
  Flame,
  MagnifyingGlass,
  ArrowRight,
  Lightning,
  Buildings,
  CalendarDots,
  Briefcase,
  Trophy,
  Laptop,
  Lightbulb,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  listPublicArticles,
  listPublicNewsSponsors,
  type NewsArticleDTO,
  type SponsorDTO,
} from "@/services/news.functions";
import { listActiveBanners } from "@/services/banner.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { HitsLeadCard } from "@/components/commerce/hits-lead-card";
import { NewsCard } from "@/components/news/news-card";
import { NewsSponsorBanner } from "@/components/news/news-sponsor-banner";

export const Route = createFileRoute("/_store/noticias/")({
  head: () => ({
    meta: [
      { title: "Notícias & Jornalismo Local | Waesy" },
      {
        name: "description",
        content: "Acompanhe as últimas notícias, urgências, reportagens e coberturas locais no Waesy.",
      },
    ],
  }),
  loader: async () => {
    try {
      const [articles, banners, hotpages, sponsors] = await Promise.all([
        listPublicArticles({ data: { limit: 40 } }).catch(() => []),
        listActiveBanners({ data: { placement: "noticias" } }).catch(() => []),
        listHotpages({ data: { module: "noticias" } }).catch(() => []),
        listPublicNewsSponsors({ data: { limit: 12 } }).catch(() => []),
      ]);
      return { articles, banners, hotpages, sponsors };
    } catch (err) {
      console.error("[loader:_store.noticias.index] Unhandled error:", err);
      return { articles: [], banners: [], hotpages: [], sponsors: [] };
    }
  },
  component: NoticiasFeedPage,
});

const CATEGORIES = [
  { id: "todas", label: "Todas Notícias", emoji: "📰", icon: Tag },
  { id: "urgente", label: "Última Hora", emoji: "⚡️", icon: Lightning },
  { id: "cidade", label: "Cidade & Região", emoji: "🏙️", icon: Buildings },
  { id: "cultura", label: "Cultura & Lazer", emoji: "🎭", icon: CalendarDots },
  { id: "economia", label: "Economia & Negócios", emoji: "📈", icon: Briefcase },
  { id: "esportes", label: "Esportes", emoji: "⚽️", icon: Trophy },
  { id: "politica", label: "Política", emoji: "🏛️", icon: NewspaperClipping },
  { id: "inovacao", label: "Inovação & Tech", emoji: "💡", icon: Lightbulb },
];

export function NoticiasFeedPage() {
  const {
    articles: initialArticles = [],
    banners = [],
    hotpages = [],
    sponsors = [],
  } = ((Route.useLoaderData?.() as any) || {});
  const [articles, setArticles] = useState<NewsArticleDTO[]>(initialArticles || []);
  const [selectedCategory, setSelectedCategory] = useState("todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleFilterCategory = async (cat: string) => {
    setSelectedCategory(cat);
    setIsSearching(true);
    const updated = await listPublicArticles({
      data: {
        category: cat === "todas" ? undefined : cat,
        query: searchQuery || undefined,
        limit: 40,
      },
    }).catch(() => []);
    setArticles(updated || []);
    setIsSearching(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    const updated = await listPublicArticles({
      data: {
        category: selectedCategory === "todas" ? undefined : selectedCategory,
        query: searchQuery || undefined,
        limit: 40,
      },
    }).catch(() => []);
    setArticles(updated || []);
    setIsSearching(false);
  };

  const featuredArticle = articles[0];
  const breakingNews = articles.filter(
    (a) => (a as any).is_breaking || a.category === "urgente" || a.kicker?.toLowerCase().includes("urgente"),
  );
  const cultureArticles = articles.filter((a) => a.category === "cultura");
  const economyArticles = articles.filter((a) => a.category === "economia");
  const gridArticles = articles.slice(1);

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-6 pb-20">
      {/* ── 1. Top Banners de Notícias ── */}
      {banners && banners.length > 0 && (
        <section aria-label="Banners e Anúncios">
          <BannerHeroCarousel banners={banners} />
        </section>
      )}

      {/* ── 2. Barra Superior Editorial & Busca ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Notícias</Badge>
          <span className="text-xs text-muted-foreground font-mono">Cobertura em Tempo Real</span>
        </div>

        {/* Busca Rápida de Notícias */}
        <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-80">
          <Input
            placeholder="Buscar matérias, autores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-2xl h-11 bg-card text-xs border-border px-4"
          />
          <Button type="submit" size="icon" className="size-11 rounded-2xl shrink-0 font-bold">
            <MagnifyingGlass size={18} weight="bold" />
          </Button>
        </form>
      </div>

      <section aria-label="Editorias de Notícias" className="space-y-2">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 w-full px-0.5 focus:outline-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const Icon = cat.icon || NewspaperClipping;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleFilterCategory(cat.id)}
                className={`inline-flex items-center gap-3 px-5 h-14 rounded-2xl border transition-all select-none group cursor-pointer shrink-0 active:scale-[0.98] ${
                  isSelected
                    ? "bg-primary/10 text-primary border-primary/30 font-bold"
                    : "bg-card text-foreground border-border hover:bg-muted/70 hover:border-foreground/20"
                }`}
              >
                <div className="relative size-8 sm:size-9 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  {cat.emoji ? (
                    <span className="text-xl sm:text-2xl leading-none">{cat.emoji}</span>
                  ) : (
                    <Icon
                      size={24}
                      weight="bold"
                      className={isSelected ? "text-primary" : "text-foreground"}
                    />
                  )}
                </div>

                <span
                  className={`text-sm font-bold whitespace-nowrap ${
                    isSelected ? "text-primary" : "text-foreground"
                  }`}
                >
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 3.5. Hotpages & Coleções Visuais de Notícias ── */}
      {hotpages && hotpages.length > 0 && (
        <section aria-label="Coleções de Notícias">
          <HotpagesRail
            hotpages={hotpages}
            activeSlug={selectedCategory}
            onSelect={(slug) => handleFilterCategory(slug)}
            cleanMode={true}
          />
        </section>
      )}

      {/* ── 4. Plantão & Notícias de Última Hora (Trilho com Lead Card Sincronizado) ── */}
      {breakingNews.length > 0 && !searchQuery && (
        <section aria-label="Plantão de Notícias" className="space-y-3">
          <HorizontalRail
            title="Plantão & Última Hora"
            hideHeader={true}
            leadCard={
              <HitsLeadCard
                actionTo="/noticias"
                gradient="from-red-600 via-rose-600 to-orange-600"
                ariaLabel="Plantão de Notícias"
              />
            }
          >
            {breakingNews.map((article) => (
              <div key={article.id} className="shrink-0">
                <NewsCard article={article} compact={true} />
              </div>
            ))}
          </HorizontalRail>
        </section>
      )}

      {/* ── 5. Manchete Principal em Destaque (Layout Vertical Apple HIG sem espremer) ── */}
      {featuredArticle && !searchQuery && (
        <section className="relative rounded-2xl overflow-hidden bg-card border border-border/60 group hover-elevate transition-all">
          <Link
            to="/noticias/$slug"
            params={{ slug: featuredArticle.slug }}
            className="flex flex-col w-full"
          >
            {featuredArticle.cover_media_url && (
              <div className="relative aspect-16/9 w-full overflow-hidden bg-muted">
                <img
                  src={featuredArticle.cover_media_url}
                  alt={featuredArticle.title}
                  className="size-full object-cover group-hover:scale-103 transition-transform duration-700"
                />
              </div>
            )}

            <div className="p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {featuredArticle.kicker || "Manchete Principal"}
                </Badge>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {featuredArticle.reading_time_minutes} min de leitura
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-foreground leading-tight group-hover:text-primary transition-colors">
                {featuredArticle.title}
              </h2>

              {featuredArticle.subtitle && (
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {featuredArticle.subtitle}
                </p>
              )}

              <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                <span className="text-xs font-bold text-foreground/80">
                  {featuredArticle.store_name || "Redação Waesy"}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  <span>Ler Matéria Completa</span>
                  <ArrowRight className="size-4" />
                </span>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* ── 6. Carrossel Editorial de Economia & Negócios ── */}
      {economyArticles.length > 0 && !searchQuery && (
        <section aria-label="Economia & Negócios" className="space-y-3">
          <HorizontalRail
            title="Economia & Negócios"
            hideHeader={true}
            leadCard={
              <HitsLeadCard
                actionTo="/noticias"
                gradient="from-emerald-600 via-teal-600 to-green-700"
                ariaLabel="Economia & Negócios"
              />
            }
          >
            {economyArticles.map((article) => (
              <div key={article.id} className="shrink-0">
                <NewsCard article={article} compact={true} />
              </div>
            ))}
          </HorizontalRail>
        </section>
      )}

      {/* ── 7. Carrossel de Cultura & Lazer ── */}
      {cultureArticles.length > 0 && !searchQuery && (
        <section aria-label="Cultura & Lazer" className="space-y-3">
          <HorizontalRail
            title="Cultura, Noite & Lazer"
            hideHeader={true}
            leadCard={
              <HitsLeadCard
                actionTo="/noticias"
                gradient="from-violet-600 via-purple-600 to-pink-600"
                ariaLabel="Cultura, Noite & Lazer"
              />
            }
          >
            {cultureArticles.map((article) => (
              <div key={article.id} className="shrink-0">
                <NewsCard article={article} compact={true} />
              </div>
            ))}
          </HorizontalRail>
        </section>
      )}

      {/* ── 8. Lista de Notícias Mais Recentes com Injeção Randômica de Anúncios ── */}
      {articles.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border bg-card/50 space-y-3">
          <NewspaperClipping className="size-10 text-muted-foreground/40 mx-auto" />
          <h3 className="text-base font-bold text-foreground">Nenhuma notícia encontrada</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Não há publicações cadastradas para o filtro selecionado no momento.
          </p>
        </div>
      ) : (
        <section aria-label="Feed de Notícias" className="space-y-4 w-full">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <NewspaperClipping size={16} weight="bold" className="text-primary" />
              <h2 className="text-sm font-bold text-foreground tracking-tight">
                {searchQuery ? "Resultados da Busca" : "Últimas Notícias"}
              </h2>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {(searchQuery ? articles : gridArticles).length} matérias
            </span>
          </div>

          <div className="space-y-6">
            {(searchQuery ? articles : gridArticles).map((article, idx) => {
              const showSponsor = sponsors && sponsors.length > 0 && idx > 0 && idx % 3 === 0;
              const sponsor = showSponsor ? sponsors[(idx / 3 - 1) % sponsors.length] : null;

              return (
                <div key={article.id} className="space-y-6">
                  {showSponsor && sponsor && (
                    <NewsSponsorBanner
                      sponsor={sponsor}
                      articleId={article.id}
                      placementType="news_in_article"
                    />
                  )}
                  <NewsCard article={article} />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
