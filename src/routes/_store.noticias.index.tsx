import { resolveActiveCity } from "@/lib/city-helper";
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
  SquaresFour,
  List as ListIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { listPublicArticles, listPublicNewsSponsors, type NewsArticleDTO, type SponsorDTO } from "@/services/news.functions";
import { listActiveBanners } from "@/services/banner.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { NewsCard } from "@/components/news/news-card";
import { NewsSponsorBanner } from "@/components/news/news-sponsor-banner";
import { EconomicIndicatorsBar } from "@/components/news/economic-indicators-bar";
import { getMarketIndicatorsFn } from "@/services/mining.functions";

export const Route = createFileRoute("/_store/noticias/")({
  head: () => ({
    meta: [
      { title: "Notícias e Jornalismo Local | Waesy" },
      {
        name: "description",
        content: "Acompanhe as últimas notícias, urgências, reportagens e coberturas locais no Waesy.",
      },
    ],
  }),
  loader: async ({ location }) => {
    const activeCity = resolveActiveCity(location?.search);
    try {
      const [articles, banners, hotpages, sponsors, indicators] = await Promise.all([
        listPublicArticles({ data: { limit: 40, city: activeCity } }).catch(() => []),
        listActiveBanners({ data: { placement: "noticias", city: activeCity } }).catch(() => []),
        listHotpages({ data: { module: "noticias" } }).catch(() => []),
        listPublicNewsSponsors({ data: { limit: 12 } }).catch(() => []),
        getMarketIndicatorsFn().catch(() => []),
      ]);
      return { articles, banners, hotpages, sponsors, indicators: indicators || [], activeCity };
    } catch (err) {
      console.error("[loader:_store.noticias.index] Unhandled error:", err);
      return { articles: [], banners: [], hotpages: [], sponsors: [], indicators: [] };
    }
  },
  component: NoticiasFeedPage,
});

const CATEGORIES = [
  { id: "todas", label: "Todas", icon: Tag },
  { id: "urgente", label: "Plantão", icon: Lightning },
  { id: "cidade", label: "Cidade", icon: Buildings },
  { id: "cultura", label: "Cultura", icon: CalendarDots },
  { id: "economia", label: "Economia", icon: Briefcase },
  { id: "esportes", label: "Esportes", icon: Trophy },
  { id: "politica", label: "Política", icon: NewspaperClipping },
  { id: "tecnologia", label: "Tecnologia", icon: Lightbulb },
];

export function NoticiasFeedPage() {
  const {
    articles: initialArticles = [],
    banners = [],
    hotpages = [],
    sponsors = [],
    indicators = [],
    activeCity = "",
  } = ((Route.useLoaderData?.() as any) || {});
  const [articles, setArticles] = useState<NewsArticleDTO[]>(initialArticles || []);
  const [selectedCategory, setSelectedCategory] = useState("todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isError, setIsError] = useState(false);
  const [feedView, setFeedView] = useState<"grid" | "list">("grid");

  const handleFilterCategory = async (cat: string) => {
    setSelectedCategory(cat);
    setIsSearching(true);
    setIsError(false);
    try {
      const updated = await listPublicArticles({
        data: {
          category: cat === "todas" ? undefined : cat,
          query: searchQuery || undefined,
          limit: 40,
          city: activeCity || undefined,
        },
      });
      setArticles(updated || []);
    } catch {
      setIsError(true);
      setArticles([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setIsError(false);
    try {
      const updated = await listPublicArticles({
        data: {
          category: selectedCategory === "todas" ? undefined : selectedCategory,
          query: searchQuery || undefined,
          limit: 40,
          city: activeCity || undefined,
        },
      });
      setArticles(updated || []);
    } catch {
      setIsError(true);
      setArticles([]);
    } finally {
      setIsSearching(false);
    }
  };

  const featuredArticle = articles[0];
  const breakingNews = articles.filter(
    (a) => (a as any).is_breaking || a.category === "urgente" || a.kicker?.toLowerCase().includes("urgente"),
  );
  const cityArticles = articles.filter((a) => a.category === "cidade");
  const economyArticles = articles.filter((a) => a.category === "economia");
  const sportsArticles = articles.filter((a) => a.category === "esportes");
  const cultureArticles = articles.filter((a) => a.category === "cultura");
  const gridArticles = articles.slice(1);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20">
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
            className="rounded-lg h-11 bg-card text-xs border-border px-4"
          />
          <Button type="submit" size="icon" className="size-11 rounded-lg shrink-0 font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <MagnifyingGlass size={18} weight="bold" />
          </Button>
        </form>
      </div>

      <section aria-label="Editorias de Notícias" className="space-y-2">
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-2 overflow-x-auto no-scrollbar py-1 focus:outline-none tab-list">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleFilterCategory(cat.id)}
                className={cn(
                  "h-11 px-4 rounded-lg border text-xs sm:text-sm font-semibold shrink-0 flex items-center gap-2 transition-colors duration-200 cursor-pointer select-none active:scale-98 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                    : "bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground border-border/70"
                )}
              >
                <cat.icon className="size-4 shrink-0" />
                <span className="whitespace-nowrap">
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 3. Indicadores Financeiros do Banco Central em Tempo Real ── */}
      {indicators && indicators.length > 0 && (
        <EconomicIndicatorsBar indicators={indicators} />
      )}

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

      {/* ── 4. Plantão & Notícias de Última Hora ── */}
      {breakingNews.length > 0 && !searchQuery && !isSearching && (
        <section aria-label="Plantão de Notícias" className="space-y-3">
          <HorizontalRail
            title="Plantão de Notícias"
            actionLabel="Ver mais"
            onAction={() => handleFilterCategory("urgente")}
          >
            {breakingNews.map((article) => (
              <div key={article.id} className="w-80 sm:w-88 shrink-0">
                <NewsCard article={article} variant="compact" />
              </div>
            ))}
          </HorizontalRail>
        </section>
      )}

      {/* ── 5. Manchete Principal em Destaque (Layout Bipartido Apple HIG no Desktop) ── */}
      {featuredArticle && !searchQuery && !isSearching && (
        <NewsCard article={featuredArticle} variant="hero" />
      )}

      {/* ── 6. Carrossel de Cotidiano & Cidade ── */}
      {cityArticles.length > 0 && !searchQuery && !isSearching && (
        <section aria-label="Cotidiano & Cidade" className="space-y-3">
          <HorizontalRail
            title="Cotidiano e Cidade"
            actionLabel="Ver mais"
            onAction={() => handleFilterCategory("cidade")}
          >
            {cityArticles.map((article) => (
              <div key={article.id} className="w-80 sm:w-88 shrink-0">
                <NewsCard article={article} variant="compact" />
              </div>
            ))}
          </HorizontalRail>
        </section>
      )}

      {/* ── 6.5. Carrossel Editorial de Economia & Negócios ── */}
      {economyArticles.length > 0 && !searchQuery && !isSearching && (
        <section aria-label="Economia & Negócios" className="space-y-3">
          <HorizontalRail
            title="Economia e Negócios"
            actionLabel="Ver mais"
            onAction={() => handleFilterCategory("economia")}
          >
            {economyArticles.map((article) => (
              <div key={article.id} className="w-80 sm:w-88 shrink-0">
                <NewsCard article={article} variant="compact" />
              </div>
            ))}
          </HorizontalRail>
        </section>
      )}

      {/* ── 7. Carrossel de Cultura & Lazer ── */}
      {cultureArticles.length > 0 && !searchQuery && !isSearching && (
        <section aria-label="Cultura & Lazer" className="space-y-3">
          <HorizontalRail
            title="Cultura e Lazer"
            actionLabel="Ver mais"
            onAction={() => handleFilterCategory("cultura")}
          >
            {cultureArticles.map((article) => (
              <div key={article.id} className="w-80 sm:w-88 shrink-0">
                <NewsCard article={article} variant="compact" />
              </div>
            ))}
          </HorizontalRail>
        </section>
      )}

      {/* ── 7.5. Carrossel de Esportes & Regional ── */}
      {sportsArticles.length > 0 && !searchQuery && !isSearching && (
        <section aria-label="Esportes & Regional" className="space-y-3">
          <HorizontalRail
            title="Esportes e Regional"
            actionLabel="Ver mais"
            onAction={() => handleFilterCategory("esportes")}
          >
            {sportsArticles.map((article) => (
              <div key={article.id} className="w-80 sm:w-88 shrink-0">
                <NewsCard article={article} variant="compact" />
              </div>
            ))}
          </HorizontalRail>
        </section>
      )}

      {/* ── 8. Feed de Notícias Bidirecional com Alternância Grade / Lista ── */}
      {isError ? (
        <div className="py-16 text-center rounded-lg border border-border bg-card space-y-3">
          <NewspaperClipping className="size-10 text-muted-foreground mx-auto" />
          <h3 className="text-base font-bold text-foreground">Erro ao carregar notícias</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Não foi possível obter as matérias. Tente novamente mais tarde.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFilterCategory(selectedCategory)}
            className="h-11 px-4 text-xs font-semibold rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Tentar novamente
          </Button>
        </div>
      ) : isSearching ? (
        <section aria-label="Carregando Notícias" className="space-y-4 w-full">
          <div className="flex items-center justify-between pb-2">
            <Skeleton className="h-6 w-32 rounded-lg" />
            <Skeleton className="h-4 w-20 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
                <div className="flex gap-4">
                  <Skeleton className="size-20 rounded-lg shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24 rounded-md" />
                    <Skeleton className="h-5 w-3/4 rounded-md" />
                    <Skeleton className="h-4 w-full rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : articles.length === 0 ? (
        <div className="py-16 text-center rounded-lg border bg-card/50 space-y-3">
          <NewspaperClipping className="size-10 text-muted-foreground/40 mx-auto" />
          <h3 className="text-base font-bold text-foreground">Nenhuma notícia encontrada</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Não há publicações cadastradas para o filtro selecionado no momento.
          </p>
        </div>
      ) : (
        <section aria-label="Feed de Notícias" className="space-y-4 w-full">
          {/* Header do Feed com Contador & Seletor Ergonômico de Visualização */}
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <NewspaperClipping size={18} weight="bold" className="text-primary" />
              <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                {searchQuery ? "Resultados da Busca" : "Todas as Notícias"}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
                {(searchQuery ? articles : gridArticles).length} matérias
              </span>

              {/* Seletor de Grade vs Lista */}
              <div className="flex items-center p-1 bg-muted/60 rounded-lg border border-border/50">
                <button
                  type="button"
                  onClick={() => setFeedView("grid")}
                  className={cn(
                    "size-9 rounded-md flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    feedView === "grid"
                      ? "bg-card text-foreground shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Visualização em Grade"
                  aria-label="Visualização em Grade"
                >
                  <SquaresFour size={16} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => setFeedView("list")}
                  className={cn(
                    "size-9 rounded-md flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    feedView === "list"
                      ? "bg-card text-foreground shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Visualização em Lista"
                  aria-label="Visualização em Lista"
                >
                  <ListIcon size={16} weight="bold" />
                </button>
              </div>
            </div>
          </div>

          {/* Renderização Adaptativa: Grade de 3 Colunas vs Lista Compacta */}
          {feedView === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {(searchQuery ? articles : gridArticles).map((article, idx) => {
                const showSponsor = sponsors && sponsors.length > 0 && idx > 0 && idx % 6 === 0;
                const sponsor = showSponsor ? sponsors[(idx / 6 - 1) % sponsors.length] : null;

                return (
                  <div key={article.id} className="contents">
                    {showSponsor && sponsor && (
                      <div className="col-span-full my-2">
                        <NewsSponsorBanner
                          sponsor={sponsor}
                          articleId={article.id}
                          placementType="news_in_article"
                        />
                      </div>
                    )}
                    <NewsCard article={article} variant="grid" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {(searchQuery ? articles : gridArticles).map((article, idx) => {
                const showSponsor = sponsors && sponsors.length > 0 && idx > 0 && idx % 6 === 0;
                const sponsor = showSponsor ? sponsors[(idx / 6 - 1) % sponsors.length] : null;

                return (
                  <div key={article.id} className="space-y-3">
                    {showSponsor && sponsor && (
                      <NewsSponsorBanner
                        sponsor={sponsor}
                        articleId={article.id}
                        placementType="news_in_article"
                      />
                    )}
                    <NewsCard article={article} variant="list" />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
