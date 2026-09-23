import { getLaunchLandingSettings } from "@/services/launch.functions";
import { LaunchHomeView } from "@/components/landing/launch-home-view";
import React, { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Tag,
  Newspaper,
  Briefcase,
  CalendarDots,
  MapPin,
  Clock,
  WhatsappLogo,
  Buildings,
  Sparkle,
  Star,
  CheckCircle,
  Storefront,
  ArrowRight,
  Ticket,
  UserCircle,
  Target,
  Rss,
  ChatCircleDots,
} from "@phosphor-icons/react";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { PlacesHighlightBadge } from "@/components/shell/places-highlight-badge";
import { NewsCard } from "@/components/news/news-card";
import {
  DiscoveryControlBar,
  type ViewModeType,
  type FilterChipOption,
} from "@/components/commerce/discovery-control-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { ProceduralInfiniteFeed } from "@/components/commerce/procedural-infinite-feed";
import { AdTelemetryBeacon } from "@/components/commerce/ad-telemetry-beacon";

// BFF Functions — 100% Real no Supabase | Zero Mocks
import { listActiveBanners, type BannerDTO } from "@/services/banner.functions";
import { listHomeHeroCards, type HotpageDTO } from "@/services/hotpage.functions";
import { getPublicDirectory, type DirectoryListingDTO } from "@/services/directory.functions";
import { getPublicClassifieds } from "@/services/classifieds.functions";
import { listPublicJobs, type JobItemDTO } from "@/services/jobs.functions";
import { getPublicEvents } from "@/services/events.functions";
import { listPublicArticles, type NewsArticleDTO } from "@/services/news.functions";
import { getMuralFeed, type MuralFeedResponse } from "@/services/social.functions";
import { getAllPublicConcursos, type RaffleDTO } from "@/services/invite.functions";

const CANONICAL_PILLARS = [
  {
    slug: "places",
    title: "Places (Lista Telefônica)",
    to: "/diretorio",
    isPlacesBadge: true,
  },
  {
    slug: "classificados",
    title: "Classificados",
    to: "/classificados",
  },
  {
    slug: "feed",
    title: "Feed",
    to: "/feed",
  },
  {
    slug: "noticias",
    title: "Notícias",
    to: "/noticias",
  },
  {
    slug: "empregos",
    title: "Empregos",
    to: "/empregos",
  },
  {
    slug: "eventos",
    title: "Eventos",
    to: "/eventos",
  },
  {
    slug: "agenda",
    title: "Agenda",
    to: "/agenda",
  },
  {
    slug: "afiliados",
    title: "Afiliados",
    to: "/afiliados",
  },
  {
    slug: "concursos",
    title: "Concursos",
    to: "/concursos",
  },
];

const DISCOVERY_CATEGORIES: FilterChipOption[] = [
  { id: "todos", label: "Todos os Anúncios", emoji: "✨" },
  { id: "places", label: "Places (Lista Telefônica)", emoji: "📍" },
  { id: "classificados", label: "Classificados", emoji: "🏷️" },
  { id: "feed", label: "Feed", emoji: "📡" },
  { id: "noticias", label: "Notícias", emoji: "📰" },
  { id: "empregos", label: "Empregos", emoji: "💼" },
  { id: "eventos", label: "Eventos", emoji: "🎟️" },
  { id: "agenda", label: "Agenda", emoji: "📅" },
  { id: "afiliados", label: "Afiliados", emoji: "🎯" },
  { id: "concursos", label: "Concursos de Sorte", emoji: "🏆" },
];

export const Route = createFileRoute("/_store/")({
  head: () => ({
    meta: [
      { title: "Waesy — Seja um Membro Fundador | Circuito 2027" },
      {
        name: "description",
        content:
          "Encontre lugares, empresas, vagas de emprego, classificados e notícias da sua cidade.",
      },
    ],
  }),
  loader: async ({ location }) => {
    try {
      let activeCity: string | undefined = (location.search as any)?.city;
      if (!activeCity && typeof document !== "undefined") {
        const match = document.cookie.match(/waesy_city=([^;]+)/);
        if (match) {
          try {
            activeCity = decodeURIComponent(match[1]);
          } catch {
            // ignore
          }
        }
      }
      const filteredCity = activeCity && activeCity !== "Global" ? activeCity : undefined;
      const launchSettings = await getLaunchLandingSettings().catch(() => null);

      const [
        banners,
        middleBanners,
        footerBanners,
        heroCards,
        placesListings,
        classifieds,
        jobs,
        events,
        newsArticles,
        feedResponse,
        concursos,
      ] = await Promise.all([
        listActiveBanners({ data: { placement: "home", city: filteredCity } }).catch(() => []),
        listActiveBanners({ data: { placement: "home_middle", city: filteredCity } }).catch(() => []),
        listActiveBanners({ data: { placement: "home_footer", city: filteredCity } }).catch(() => []),
        listHomeHeroCards().catch(() => []),
        getPublicDirectory({ data: { limit: 12 } }).catch(() => []),
        getPublicClassifieds({ data: { limit: 12 } }).catch(() => []),
        listPublicJobs({ data: { limit: 8 } }).catch(() => []),
        getPublicEvents({ limit: 8 } as any).catch(() => []),
        listPublicArticles({ data: { limit: 6 } }).catch(() => []),
        getMuralFeed({ data: { limit: 8 } }).catch(() => ({ items: [] })),
        getAllPublicConcursos({ data: { filter: "all" } }).catch(() => []),
      ]);

      return {
        launchSettings: launchSettings || null,
        banners: banners || [],
        middleBanners: middleBanners || [],
        footerBanners: footerBanners || [],
        heroCards: heroCards || [],
        placesListings: placesListings || [],
        classifieds: classifieds || [],
        jobs: jobs || [],
        events: events || [],
        newsArticles: newsArticles || [],
        feedPosts: (feedResponse as MuralFeedResponse)?.items || [],
        concursos: concursos || [],
      };
    } catch (err) {
      console.error("[loader:_store.index] Unhandled loader error:", err);
      return {
        launchSettings: null,
        banners: [],
        middleBanners: [],
        footerBanners: [],
        heroCards: [],
        placesListings: [],
        classifieds: [],
        jobs: [],
        events: [],
        newsArticles: [],
        feedPosts: [],
        concursos: [],
      };
    }
  },
  component: CommunityHomePage,
});

function CommunityHomePage() {
  const data = (Route.useLoaderData?.() as any) || {};
  const routeSearch = (Route.useSearch?.() as any) || {};
  const isMarketplace = routeSearch.view === "marketplace" || routeSearch.view === "vitrine";

  if (!isMarketplace) {
    return <LaunchHomeView initialSettings={data.launchSettings || null} />;
  }

  return <CommunityMarketplaceView data={data} />;
}

function CommunityMarketplaceView({ data }: { data: any }) {
  const {
    banners = [],
    middleBanners = [],
    footerBanners = [],
    heroCards = [],
    placesListings = [],
    classifieds = [],
    jobs = [],
    events = [],
    newsArticles = [],
    feedPosts = [],
    concursos = [],
  } = (data || {});

  // Estado dos 3 Modos Canônicos de Visualização (Feed, Grid, List) e Filtros
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("todos");
  const [viewMode, setViewMode] = useState<ViewModeType>("feed");

  // Resolução dinâmica dos cards do topo onde o gestor/admin faz upload de imagens
  const displayHeroCards = useMemo(() => {
    return CANONICAL_PILLARS.map((pillar) => {
      const match = heroCards.find(
        (h: HotpageDTO) =>
          h.slug === pillar.slug ||
          h.slug === `home-${pillar.slug}` ||
          h.target_route === pillar.to ||
          (h.target_route && h.target_route.startsWith(pillar.to))
      );

      const coverUrl = match?.cover_image_url || match?.bg_media_url || null;
      const title = pillar.title;
      const to = pillar.to;

      return {
        ...pillar,
        coverUrl,
        title,
        to,
        isActive: match ? match.is_active !== false : true,
        // Configurações visuais persistidas no banco — Zero sombra por padrão
        showOverlay: match?.show_overlay === true,
        showShadow: match?.show_shadow === true,
        bgOverlayOpacity: typeof match?.bg_overlay_opacity === "number" ? match.bg_overlay_opacity : 30,
        bgColor: match?.bg_color || "#000000",
        showTitle: match?.show_title !== false,
        textColor: match?.text_color || null,
      };
    }).filter((card) => (card as any).isActive !== false);
  }, [heroCards]);

  // Filtragem contextual por termo de busca
  const term = search.trim().toLowerCase();

  const filteredPlaces = useMemo(() => {
    if (!term) return placesListings;
    return placesListings.filter(
      (p: any) =>
        (p.business_name || "").toLowerCase().includes(term) ||
        (p.category || "").toLowerCase().includes(term) ||
        (p.address || "").toLowerCase().includes(term)
    );
  }, [placesListings, term]);

  const filteredClassifieds = useMemo(() => {
    if (!term) return classifieds;
    return classifieds.filter(
      (c: any) =>
        (c.title || "").toLowerCase().includes(term) ||
        (c.category || "").toLowerCase().includes(term) ||
        (c.location_name || "").toLowerCase().includes(term)
    );
  }, [classifieds, term]);

  const filteredFeed = useMemo(() => {
    if (!term) return feedPosts;
    return feedPosts.filter(
      (f: any) =>
        (f.content_text || "").toLowerCase().includes(term) ||
        (f.profiles?.full_name || "").toLowerCase().includes(term) ||
        (f.location_name || "").toLowerCase().includes(term)
    );
  }, [feedPosts, term]);

  const filteredNews = useMemo(() => {
    if (!term) return newsArticles;
    return newsArticles.filter(
      (n: any) =>
        (n.title || "").toLowerCase().includes(term) ||
        (n.summary || "").toLowerCase().includes(term) ||
        (n.category || "").toLowerCase().includes(term)
    );
  }, [newsArticles, term]);

  const filteredJobs = useMemo(() => {
    if (!term) return jobs;
    return jobs.filter(
      (j: any) =>
        (j.title || "").toLowerCase().includes(term) ||
        (j.company_name || "").toLowerCase().includes(term) ||
        (j.location || "").toLowerCase().includes(term)
    );
  }, [jobs, term]);

  const filteredEvents = useMemo(() => {
    if (!term) return events;
    return events.filter(
      (e: any) =>
        (e.title || "").toLowerCase().includes(term) ||
        (e.category || "").toLowerCase().includes(term) ||
        (e.location || "").toLowerCase().includes(term)
    );
  }, [events, term]);

  const filteredConcursos = useMemo(() => {
    if (!term) return concursos;
    return concursos.filter(
      (c: RaffleDTO) =>
        (c.title || "").toLowerCase().includes(term) ||
        (c.storeName || "").toLowerCase().includes(term) ||
        (c.description || "").toLowerCase().includes(term)
    );
  }, [concursos, term]);

  // Total de itens combinados
  const totalResults =
    filteredPlaces.length +
    filteredClassifieds.length +
    filteredFeed.length +
    filteredNews.length +
    filteredJobs.length +
    filteredEvents.length +
    filteredConcursos.length +
    (activeCategory === "todos" || activeCategory === "afiliados" ? 1 : 0);

  // Lista unificada para os modos Grade e Lista (extraindo dados reais sem misturar pilares)
  const unifiedItems = useMemo(() => {
    const list: Array<{
      id: string;
      pillar: "places" | "classifieds" | "feed" | "noticias" | "empregos" | "eventos" | "agenda" | "afiliados" | "concursos";
      badge: string;
      title: string;
      image?: string | null;
      to: string;
      priceOrDate?: string;
      location?: string;
      phone?: string;
    }> = [];

    // 1. PLACES (LISTA TELEFÔNICA)
    if (activeCategory === "todos" || activeCategory === "places") {
      filteredPlaces.forEach((item: any) => {
        const cover = item.banner_url || item.avatar_url || null;
        list.push({
          id: `place-${item.id}`,
          pillar: "places",
          badge: item.category || "Empresa",
          title: item.business_name,
          image: cover,
          to: `/diretorio/${item.id}`,
          priceOrDate: item.rating ? `★ ${Number(item.rating).toFixed(1)}` : undefined,
          location: item.address || "Localidade da região",
          phone: item.contact_whatsapp || item.contact_phone,
        });
      });
    }

    // 2. CLASSIFICADOS
    if (activeCategory === "todos" || activeCategory === "classificados") {
      filteredClassifieds.forEach((item: any) => {
        const cover =
          (item.images && item.images[0]) ||
          (item.photos && item.photos[0]) ||
          item.image_url ||
          item.media?.[0] ||
          item.cover_image ||
          null;
        list.push({
          id: `class-${item.id}`,
          pillar: "classifieds",
          badge: item.deal_type || item.category || "Classificado",
          title: item.title,
          image: cover,
          to: `/classificados/${item.id}`,
          priceOrDate: item.price_cents ? formatMoney(item.price_cents) : "Sob Consulta",
          location: item.location_name || item.location_text || "Na região",
          phone: item.contact_whatsapp || item.whatsapp,
        });
      });
    }

    // 3. FEED SOCIAL
    if (activeCategory === "todos" || activeCategory === "feed") {
      filteredFeed.forEach((post: any) => {
        const cover = (post.media_urls && post.media_urls[0]) || null;
        list.push({
          id: `feed-${post.id}`,
          pillar: "feed",
          badge: "Feed",
          title: post.content_text ? post.content_text.slice(0, 90) : "Publicação da comunidade",
          image: cover,
          to: "/feed",
          priceOrDate: post.profiles?.full_name || "Membro local",
          location: post.location_name || "Na cidade",
        });
      });
    }

    // 4. NOTÍCIAS
    if (activeCategory === "todos" || activeCategory === "noticias") {
      filteredNews.forEach((news: any) => {
        list.push({
          id: `news-${news.id}`,
          pillar: "noticias",
          badge: news.category || "Notícia",
          title: news.title,
          image: news.cover_image || null,
          to: `/noticias/${news.slug || news.id}`,
          priceOrDate: news.read_time_minutes ? `${news.read_time_minutes} min de leitura` : undefined,
          location: "Notícia local",
        });
      });
    }

    // 5. EMPREGOS
    if (activeCategory === "todos" || activeCategory === "empregos") {
      filteredJobs.forEach((job: any) => {
        const cover = job.cover_image_url || job.company_logo_url || null;
        list.push({
          id: `job-${job.id}`,
          pillar: "empregos",
          badge: job.contract_type || "Vaga",
          title: job.title,
          image: cover,
          to: `/empregos/${job.id}`,
          priceOrDate: job.salary_display || "A combinar",
          location: job.location || job.company_name || "Na região",
        });
      });
    }

    // 6. EVENTOS
    if (activeCategory === "todos" || activeCategory === "eventos") {
      filteredEvents.forEach((ev: any) => {
        const cover = ev.cover_image || ev.image_url || ev.banner_url || null;
        list.push({
          id: `event-${ev.id}`,
          pillar: "eventos",
          badge: ev.category || "Evento",
          title: ev.title,
          image: cover,
          to: `/evento/${ev.id}`,
          priceOrDate: ev.date_display || ((ev as any).is_free ? "Gratuito" : "Ingressos"),
          location: ev.location || "Na região",
        });
      });
    }

    // 7. AGENDA
    if (activeCategory === "todos" || activeCategory === "agenda") {
      filteredEvents.forEach((ev: any) => {
        const cover = ev.cover_image || ev.image_url || ev.banner_url || null;
        list.push({
          id: `agenda-${ev.id}`,
          pillar: "agenda",
          badge: "Agenda",
          title: ev.title,
          image: cover,
          to: "/agenda",
          priceOrDate: ev.date_display || "Programação confirmada",
          location: ev.location || "Na cidade",
        });
      });
    }

    // 8. AFILIADOS
    if (activeCategory === "todos" || activeCategory === "afiliados") {
      list.push({
        id: "module-afiliados",
        pillar: "afiliados",
        badge: "Afiliados",
        title: "Programa de Afiliados Waesy",
        image: null,
        to: "/afiliados",
        priceOrDate: "Comissões & Tokens",
        location: "Indique empresas e receba recompensas",
      });
    }

    // 9. CONCURSOS DE SORTE
    if (activeCategory === "todos" || activeCategory === "concursos") {
      filteredConcursos.forEach((conc: RaffleDTO) => {
        list.push({
          id: `conc-${conc.id}`,
          pillar: "concursos",
          badge: conc.storeName || "Concurso de Sorte",
          title: conc.title,
          image: null,
          to: `/concursos?concursoId=${conc.id}`,
          priceOrDate: conc.status === "completed" ? "Apurado" : "Gratuito",
          location: "Comunidade Local",
        });
      });
    }

    return list;
  }, [
    activeCategory,
    filteredPlaces,
    filteredClassifieds,
    filteredFeed,
    filteredNews,
    filteredJobs,
    filteredEvents,
    filteredConcursos,
  ]);

  return (
    <div className="w-full space-y-3.5 sm:space-y-4 pb-14">
      {/* ── 0. BANNER CONVITE MEMBRO FUNDADOR CIRCUITO 2027 ── */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent p-3 sm:p-4 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Sparkle className="size-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">Circuito Internacional Waesy 2027</span>
              <Badge variant="outline" className="text-[9px] font-bold bg-amber-500/20 text-amber-600 border-amber-500/30">
                Fundadores
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              Chapecó & São Miguel do Oeste • Garanta sua vaga de Membro Fundador e concorra a viagens em 2027.
            </p>
          </div>
        </div>
        <Button asChild size="sm" className="rounded-xl text-xs font-bold bg-primary text-primary-foreground h-9 px-3.5 shrink-0 shadow-2xs">
          <Link to="/home">
            <span>Conhecer</span>
            <ArrowRight className="size-3.5 ml-1" />
          </Link>
        </Button>
      </div>

      {/* ── 1. CARDS COM IMAGENS DO TOPO (Carrossel Horizontal de Categorias Master) ── */}
      <section aria-label="Categorias Principais">
        <HorizontalRail title="Categorias Principais" hideHeader={true}>
          {displayHeroCards.map((card) => (
            <Link
              key={card.slug}
              to={card.to as any}
              className={`min-w-[190px] sm:min-w-[215px] md:min-w-[235px] max-w-[250px] shrink-0 snap-start group relative flex flex-col justify-end overflow-hidden rounded-2xl bg-card aspect-[2/1] sm:aspect-[16/9] border border-border/60 hover:border-foreground/30 transition-all duration-300 active:scale-[0.98] ${(card as any).showShadow ? "shadow-md hover:shadow-xl" : "shadow-none"}`}
            >
              {(card as any).coverUrl ? (
                <img
                  src={(card as any).coverUrl}
                  alt={card.title}
                  className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="eager"
                />
              ) : (
                <div className="absolute inset-0 size-full bg-muted/40 border border-border/40 flex items-center justify-center">
                  <span className="text-xs font-bold text-muted-foreground/60">{card.title}</span>
                </div>
              )}

              {/* Overlay configurável — Zero por padrão, somente se ativado no Admin com opacidade > 0 */}
              {(card as any).showOverlay && ((card as any).bgOverlayOpacity ?? 30) > 0 && (
                <div
                  className="absolute inset-0 bg-gradient-to-t to-transparent pointer-events-none"
                  style={{
                    background: `linear-gradient(to top, ${
                      (card as any).bgColor || "#000000"
                    }${Math.round(((card as any).bgOverlayOpacity ?? 30) * 2.55).toString(16).padStart(2, "0")} 0%, transparent 60%)`,
                  }}
                />
              )}

              {/* Identificação do Card — visível somente se show_title não está desativado */}
              {(card as any).showTitle !== false && (
                <div className="relative z-10 p-2.5 sm:p-3 w-full">
                  {(card as any).isPlacesBadge ? (
                    <PlacesHighlightBadge
                      className={`text-xs font-bold drop-shadow-sm ${
                        (card as any).textColor ? "" : (card as any).showOverlay ? "text-white" : "text-foreground"
                      }`}
                      style={(card as any).textColor ? { color: (card as any).textColor } : undefined}
                    />
                  ) : (
                    <h2
                      className={`text-xs font-bold leading-tight drop-shadow-sm truncate backdrop-blur-[2px] ${
                        (card as any).textColor ? "" : (card as any).showOverlay ? "text-white" : "text-foreground"
                      }`}
                      style={(card as any).textColor ? { color: (card as any).textColor } : undefined}
                    >
                      {card.title}
                    </h2>
                  )}
                </div>
              )}
            </Link>
          ))}
        </HorizontalRail>
      </section>

      {/* ── 2. CARROSSEL DE BANNERS HERO (Se cadastrados) ── */}
      {banners && banners.length > 0 && (
        <section aria-label="Destaques Principais">
          <BannerHeroCarousel banners={banners} />
        </section>
      )}

      {/* ── 3. BARRA DE CONTROLE CANÔNICA (DiscoveryControlBar: Busca + Categorias + Feed/Grid/List) ── */}
      <DiscoveryControlBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar classificados, eventos, empresas e vagas..."
        categories={DISCOVERY_CATEGORIES}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        allowedViewModes={["feed", "grid", "list"]}
      />

      {/* ── 4. RENDERIZAÇÃO DOS 3 MODOS DE VISUALIZAÇÃO ── */}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODO 1: FEED (TRILHOS HORIZONTAIS COM SNAP SCROLL POR PILAR)
          ───────────────────────────────────────────────────────────────────────────── */}
      {viewMode === "feed" && (
        <div className="space-y-4 sm:space-y-5 mt-2">
          {/* PLACES (LISTA TELEFÔNICA) */}
          {(activeCategory === "todos" || activeCategory === "places") && filteredPlaces.length > 0 && (
            <section aria-label="Places" className="space-y-2">
              <HorizontalRail
                title="Places (Lista Telefônica)"
                actionLabel="Ver todas"
                onAction={() => {}}
                actionTo="/diretorio"
              >
                {filteredPlaces.map((item: DirectoryListingDTO) => {
                  const coverImage = item.banner_url || item.avatar_url;
                  return (
                    <div
                      key={item.id}
                      className="min-w-[280px] sm:min-w-[310px] max-w-[320px] shrink-0 group flex flex-col justify-between rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-all shadow-2xs h-[285px]"
                    >
                      <Link to="/diretorio/$id" params={{ id: item.id }} className="block">
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted/40">
                          {coverImage ? (
                            <img
                              src={coverImage}
                              alt={item.business_name}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                          ) : (
                            <div className="size-full bg-muted/50 flex items-center justify-center">
                              <Storefront size={28} className="text-muted-foreground/40" />
                            </div>
                          )}
                          <div className="absolute top-2.5 right-2.5">
                            <Badge variant="secondary" className="bg-background/90 backdrop-blur-md text-[10px] font-bold">
                              {item.category}
                            </Badge>
                          </div>
                        </div>

                        <div className="p-3.5 space-y-1 h-[68px] flex flex-col justify-start">
                          <div className="flex items-center justify-between gap-1.5">
                            <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                              {item.business_name}
                            </h3>
                            {item.is_verified && (
                              <CheckCircle size={15} weight="fill" className="text-info shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {item.address || "Localidade da região"}
                          </p>
                        </div>
                      </Link>

                      <div className="px-3.5 pb-3 pt-0 flex items-center justify-between gap-2 border-t border-border/30 mt-auto h-10">
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                          <Star size={13} weight="fill" />
                          <span>{item.rating ? Number(item.rating).toFixed(1) : "5.0"}</span>
                        </div>

                        {(item.contact_whatsapp || item.contact_phone) && (
                          <button
                            type="button"
                            onClick={() =>
                              trackAndOpenWhatsApp({
                                phone: item.contact_whatsapp || item.contact_phone || "",
                                message: `Olá! Vi o perfil da ${item.business_name} no Places do Waesy.`,
                                storeId: (item as any).store_id || null,
                                entityType: "directory",
                                entityId: item.id,
                                entityTitle: item.business_name,
                                niche: item.category,
                              })
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
                          >
                            <WhatsappLogo size={14} weight="bold" />
                            <span>WhatsApp</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </HorizontalRail>
            </section>
          )}

          {/* CLASSIFICADOS */}
          {(activeCategory === "todos" || activeCategory === "classificados") && filteredClassifieds.length > 0 && (
            <section aria-label="Classificados" className="space-y-2">
              <HorizontalRail
                title="Classificados"
                actionLabel="Ver todos"
                onAction={() => {}}
                actionTo="/classificados"
              >
                {filteredClassifieds.map((item: any) => {
                  const coverImage =
                    (item.images && item.images[0]) ||
                    (item.photos && item.photos[0]) ||
                    item.image_url ||
                    item.media?.[0] ||
                    item.cover_image;
                  const priceDisplay = item.price_cents ? formatMoney(item.price_cents) : "Sob Consulta";

                  return (
                    <Link
                      key={item.id}
                      to="/classificados/$id"
                      params={{ id: item.id }}
                      className="min-w-[240px] sm:min-w-[270px] max-w-[280px] shrink-0 group flex flex-col justify-between rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-all shadow-2xs h-[330px]"
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-muted/30">
                        {coverImage ? (
                          <img
                            src={coverImage}
                            alt={item.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="size-full bg-muted/50 flex items-center justify-center">
                            <Tag size={28} className="text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <Badge variant="secondary" className="bg-background/90 backdrop-blur-md text-[9.5px] font-bold uppercase">
                            {item.deal_type || item.category || "Anúncio"}
                          </Badge>
                        </div>
                      </div>

                      <div className="p-3 space-y-1 flex-1 flex flex-col justify-between">
                        <p className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {item.title}
                        </p>
                        <p className="text-xs font-black text-foreground font-mono">
                          {priceDisplay}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {item.location_name || item.location_text || "Na sua região"}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </HorizontalRail>
            </section>
          )}

          {/* 3. FEED SOCIAL */}
          {(activeCategory === "todos" || activeCategory === "feed") && filteredFeed.length > 0 && (
            <section aria-label="Feed da Comunidade" className="space-y-2">
              <HorizontalRail
                title="Feed"
                actionLabel="Ver feed"
                onAction={() => {}}
                actionTo="/feed"
              >
                {filteredFeed.map((post: any) => {
                  const coverImage = post.media_urls && post.media_urls[0];
                  return (
                    <Link
                      key={post.id}
                      to="/feed"
                      className="min-w-[260px] sm:min-w-[280px] max-w-[300px] shrink-0 p-4 rounded-2xl border border-border/60 bg-card hover:border-foreground/30 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group space-y-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-muted/60 overflow-hidden flex items-center justify-center text-muted-foreground shrink-0 border border-border/40">
                          {post.profiles?.avatar_url ? (
                            <img
                              src={post.profiles.avatar_url}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : (
                            <UserCircle size={18} weight="bold" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate">
                            {post.profiles?.full_name || post.stores?.name || "Membro local"}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {post.location_name || "Na cidade"}
                          </p>
                        </div>
                      </div>

                      {coverImage && (
                        <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-muted/40">
                          <img
                            src={coverImage}
                            alt=""
                            className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {post.content_text || "Publicação compartilhada no feed da comunidade"}
                      </p>

                      <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>Recente</span>
                        </span>
                        <span className="text-primary font-bold group-hover:underline">Ver no feed</span>
                      </div>
                    </Link>
                  );
                })}
              </HorizontalRail>
            </section>
          )}

          {/* 4. NOTÍCIAS */}
          {(activeCategory === "todos" || activeCategory === "noticias") && filteredNews.length > 0 && (
            <section aria-label="Notícias" className="space-y-2">
              <HorizontalRail
                title="Notícias"
                actionLabel="Ver todas"
                onAction={() => {}}
                actionTo="/noticias"
              >
                {filteredNews.map((article: NewsArticleDTO) => (
                  <div key={article.id} className="min-w-[280px] sm:min-w-[320px] max-w-[340px] shrink-0">
                    <NewsCard article={article} />
                  </div>
                ))}
              </HorizontalRail>
            </section>
          )}

          {/* 5. EMPREGOS */}
          {(activeCategory === "todos" || activeCategory === "empregos") && filteredJobs.length > 0 && (
            <section aria-label="Empregos" className="space-y-2">
              <HorizontalRail
                title="Empregos"
                actionLabel="Ver todas"
                onAction={() => {}}
                actionTo="/empregos"
              >
                {filteredJobs.map((job: JobItemDTO) => {
                  const coverImage = (job as any).cover_image_url || job.company_logo_url;

                  return (
                    <Link
                      key={job.id}
                      to="/empregos/$id"
                      params={{ id: job.id }}
                      className="min-w-[280px] sm:min-w-[310px] max-w-[320px] shrink-0 p-4 rounded-2xl border border-border/60 bg-card hover:border-foreground/30 shadow-2xs hover:shadow-xs transition-all space-y-3 group flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="size-12 rounded-xl overflow-hidden bg-muted/40 border border-border/60 shrink-0 flex items-center justify-center">
                          {coverImage ? (
                            <img
                              src={coverImage}
                              alt={job.company_name}
                              className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <Briefcase size={20} className="text-muted-foreground/30" />
                          )}
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {job.title}
                          </h3>
                          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                            <Buildings size={13} className="shrink-0" />
                            <span className="truncate">{job.company_name}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          <span className="truncate max-w-[120px]">{job.location}</span>
                        </span>
                        <span className="font-bold text-foreground">
                          {job.salary_display || "A combinar"}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </HorizontalRail>
            </section>
          )}

          {/* 6. EVENTOS */}
          {(activeCategory === "todos" || activeCategory === "eventos") && filteredEvents.length > 0 && (
            <section aria-label="Eventos" className="space-y-2">
              <HorizontalRail
                title="Eventos"
                actionLabel="Ver todos"
                onAction={() => {}}
                actionTo="/eventos"
              >
                {filteredEvents.map((ev: any) => {
                  const coverImage = ev.cover_image || ev.image_url || ev.banner_url;

                  return (
                    <Link
                      key={ev.id}
                      to="/evento/$id"
                      params={{ id: ev.id }}
                      className="min-w-[280px] sm:min-w-[310px] max-w-[320px] shrink-0 rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/30 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group"
                    >
                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted/40">
                        {coverImage ? (
                          <img
                            src={coverImage}
                            alt={ev.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="size-full bg-muted/50 flex items-center justify-center">
                            <Ticket size={28} className="text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="absolute top-2.5 left-2.5">
                          <Badge variant="secondary" className="bg-background/90 backdrop-blur-md text-[10px] font-bold">
                            {ev.category || "Evento"}
                          </Badge>
                        </div>
                        <div className="absolute bottom-2.5 right-2.5">
                          <span className="bg-black/75 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md">
                            {ev.date_display || "Em breve"}
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 space-y-1.5">
                        <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {ev.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
                          <MapPin size={12} className="shrink-0" />
                          <span>{ev.location || "Localidade da região"}</span>
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </HorizontalRail>
            </section>
          )}

          {/* 7. AGENDA CULTURAL COM CARDS PADRONIZADOS E FOTOS */}
          {(activeCategory === "todos" || activeCategory === "agenda") && filteredEvents.length > 0 && (
            <section aria-label="Agenda Cultural" className="space-y-2">
              <HorizontalRail
                title="Agenda"
                badge="Programação cultural"
                actionLabel="Ver agenda"
                onAction={() => {}}
                actionTo="/agenda"
              >
                {filteredEvents.map((ev: any) => {
                  const coverImage = ev.cover_image || ev.image_url || ev.banner_url;

                  return (
                    <Link
                      key={`agenda-${ev.id}`}
                      to="/agenda"
                      className="min-w-[280px] sm:min-w-[310px] max-w-[320px] shrink-0 rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/30 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group"
                    >
                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted/40">
                        {coverImage ? (
                          <img
                            src={coverImage}
                            alt={ev.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="size-full bg-muted/50 flex items-center justify-center">
                            <CalendarDots size={28} className="text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="absolute top-2.5 left-2.5">
                          <Badge variant="secondary" className="bg-background/90 backdrop-blur-md text-[10px] font-bold">
                            {ev.category || "Agenda"}
                          </Badge>
                        </div>
                        <div className="absolute bottom-2.5 right-2.5">
                          <span className="bg-black/75 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md">
                            {ev.date_display || "Data confirmada"}
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 space-y-1.5">
                        <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {ev.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
                          <MapPin size={12} className="shrink-0" />
                          <span>{ev.location || "Na cidade"}</span>
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </HorizontalRail>
            </section>
          )}

          {/* 8. BANNER INTERMEDIÁRIO DINÂMICO (CMS / ADMIN MASTER COM CONTROLE ERGONÔMICO) */}
          {((middleBanners.length > 0 && !!middleBanners[0].image_url) || activeCategory === "afiliados") && (
            <section aria-label="Destaque Promocional" className="space-y-3">
              {middleBanners.length > 0 && middleBanners[0].image_url ? (
                <AdTelemetryBeacon
                  storeId={middleBanners[0].store_id || null}
                  className="w-full"
                >
                  <Link
                    to={(middleBanners[0].link_url || "/afiliados") as any}
                    className="group relative block w-full aspect-[21/9] sm:aspect-[24/9] rounded-2xl overflow-hidden bg-card border border-border/60 shadow-2xs hover:border-foreground/30 transition-all"
                  >
                    {middleBanners[0].media_type === "video" ? (
                      <video
                        src={middleBanners[0].image_url}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="size-full object-cover group-hover:scale-102 transition-transform duration-500"
                      />
                    ) : (
                      <img
                        src={middleBanners[0].image_url}
                        alt={middleBanners[0].title || "Destaque"}
                        className="size-full object-cover group-hover:scale-102 transition-transform duration-500"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 text-left">
                      {middleBanners[0].badge_text && (
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/20 mb-1.5">
                          {middleBanners[0].badge_text}
                        </span>
                      )}
                      <h3 className="text-base sm:text-lg font-bold text-white leading-tight drop-shadow-sm">
                        {middleBanners[0].title}
                      </h3>
                      {middleBanners[0].subtitle && (
                        <p className="text-xs text-white/85 line-clamp-1 mt-0.5">
                          {middleBanners[0].subtitle}
                        </p>
                      )}
                    </div>
                  </Link>
                </AdTelemetryBeacon>
              ) : activeCategory === "afiliados" ? (
                /* Card Editorial de Afiliados exibido exclusivamente na categoria Afiliados */
                <div className="p-5 sm:p-6 rounded-2xl border border-border/60 bg-card shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider font-bold">
                      Afiliados
                    </Badge>
                    <h3 className="text-base sm:text-lg font-bold text-foreground">
                      Programa de Afiliados Waesy
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Indique empresas para a plataforma e receba comissões e benefícios na sua conta.
                    </p>
                  </div>
                  <Button asChild size="sm" className="h-10 px-5 rounded-xl text-xs font-bold shrink-0 cursor-pointer">
                    <Link to="/afiliados">
                      <span>Conhecer Afiliados</span>
                      <ArrowRight size={13} className="ml-1.5" />
                    </Link>
                  </Button>
                </div>
              ) : null}
            </section>
          )}

          {/* 9. SCROLL INFINITO PROCEDURAL (Trilhos Contínuos de Descoberta Vertical) */}
          <ProceduralInfiniteFeed
            initialExcludedStoreIds={filteredPlaces.map((p: any) => p.store_id || p.id).filter(Boolean)}
            initialExcludedProductIds={[]}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODO 2: GRADE EXPANDIDA (GRID DE CARDS UNIFORMES COM FOTOS REAIS)
          ───────────────────────────────────────────────────────────────────────────── */}
      {viewMode === "grid" && (
        <section aria-label="Grade de Anúncios">
          {unifiedItems.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-card rounded-2xl border border-border/60 p-8">
              <Tag className="size-10 text-muted-foreground/40 mx-auto" />
              <h2 className="text-sm font-bold text-foreground">
                Nenhum anúncio encontrado com estes filtros
              </h2>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Tente alterar os termos da busca ou selecionar outra categoria.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {unifiedItems.map((item) => (
                <div
                  key={item.id}
                  className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/30 hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <Link to={item.to as any} className="flex-1 flex flex-col cursor-pointer">
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted/40 shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="size-full bg-muted/40 flex items-center justify-center">
                          <Tag size={28} className="text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute top-2.5 left-2.5">
                        <Badge className="bg-background/95 backdrop-blur-md text-foreground font-mono text-[9px] uppercase font-bold px-2 py-0.5 rounded-md border border-border/40">
                          {item.badge}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 space-y-1.5 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        {item.priceOrDate && (
                          <p className="text-base sm:text-lg font-black text-foreground font-mono truncate">
                            {item.priceOrDate}
                          </p>
                        )}
                        <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                      </div>

                      {item.location && (
                        <div className="pt-2 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 truncate">
                            <MapPin size={12} className="shrink-0 text-primary" />
                            <span className="truncate">{item.location}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>

                  {item.phone && (
                    <div className="p-3 pt-0 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          trackAndOpenWhatsApp({
                            phone: item.phone || "",
                            message: `Olá! Vi o anúncio "${item.title}" no Waesy.`,
                            storeId: null,
                            entityType: item.pillar,
                            entityId: item.id,
                            entityTitle: item.title,
                          })
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
                      >
                        <WhatsappLogo size={14} weight="bold" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODO 3: LISTA COMPACTA (SPLIT COM IMAGEM À ESQUERDA)
          ───────────────────────────────────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <section aria-label="Lista de Anúncios" className="space-y-3">
          {unifiedItems.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-card rounded-2xl border border-border/60 p-8">
              <Tag className="size-10 text-muted-foreground/40 mx-auto" />
              <h2 className="text-sm font-bold text-foreground">
                Nenhum anúncio encontrado com estes filtros
              </h2>
            </div>
          ) : (
            unifiedItems.map((item) => (
              <div
                key={item.id}
                className="group flex flex-col sm:flex-row items-stretch justify-between rounded-2xl border border-border/60 bg-card hover:border-foreground/30 hover:shadow-xs transition-all overflow-hidden p-0 w-full"
              >
                <Link
                  to={item.to as any}
                  className="relative w-full sm:w-56 md:w-64 h-44 sm:h-auto min-h-[140px] overflow-hidden bg-muted/40 shrink-0 cursor-pointer"
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="size-full bg-muted/40 flex items-center justify-center">
                      <Tag size={28} className="text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute top-2.5 left-2.5">
                    <Badge className="bg-background/95 backdrop-blur-md text-foreground font-mono text-[9px] uppercase font-bold px-2 py-0.5 rounded-md border border-border/40">
                      {item.badge}
                    </Badge>
                  </div>
                </Link>

                <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col justify-between space-y-2">
                  <Link to={item.to as any} className="space-y-1 block cursor-pointer">
                    {item.priceOrDate && (
                      <p className="text-lg sm:text-xl font-black text-foreground font-mono">
                        {item.priceOrDate}
                      </p>
                    )}
                    <h3 className="font-bold text-sm sm:text-base text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                  </Link>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/30">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                      <MapPin size={12} className="shrink-0 text-primary" />
                      <span className="truncate">{item.location || "Na sua região"}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      {item.phone && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            trackAndOpenWhatsApp({
                              phone: item.phone || "",
                              message: `Olá! Vi o anúncio "${item.title}" no Waesy.`,
                              storeId: null,
                              entityType: item.pillar,
                              entityId: item.id,
                              entityTitle: item.title,
                            })
                          }
                          className="h-10 sm:h-8 px-3 rounded-xl text-xs gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                        >
                          <WhatsappLogo size={15} weight="bold" />
                          <span>WhatsApp</span>
                        </Button>
                      )}

                      <Button
                        asChild
                        size="sm"
                        className="h-10 sm:h-8 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <Link to={item.to as any}>
                          <span>Ver</span>
                          <ArrowRight size={14} className="ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* ── 5. BANNER DE RODAPÉ DINÂMICO (CMS COM FALLBACK CLEAN APPLE HIG) ── */}
      <section aria-label="Portal de Negócios" className="space-y-3">
        {footerBanners.length > 0 && footerBanners[0].image_url ? (
          <AdTelemetryBeacon
            storeId={footerBanners[0].store_id || null}
            className="w-full"
          >
            <Link
              to={(footerBanners[0].link_url || "/criar-negocio") as any}
              className="group relative block w-full aspect-[21/9] sm:aspect-[24/9] rounded-3xl overflow-hidden bg-card border border-border/60 shadow-2xs hover:border-foreground/30 transition-all"
            >
              {footerBanners[0].media_type === "video" ? (
                <video
                  src={footerBanners[0].image_url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="size-full object-cover group-hover:scale-102 transition-transform duration-500"
                />
              ) : (
                <img
                  src={footerBanners[0].image_url}
                  alt={footerBanners[0].title || "Divulgue sua empresa"}
                  className="size-full object-cover group-hover:scale-102 transition-transform duration-500"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-left">
                {footerBanners[0].badge_text && (
                  <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/20 mb-1.5">
                    {footerBanners[0].badge_text}
                  </span>
                )}
                <h3 className="text-lg sm:text-xl font-bold text-white leading-tight drop-shadow-sm">
                  {footerBanners[0].title}
                </h3>
                {footerBanners[0].subtitle && (
                  <p className="text-xs sm:text-sm text-white/85 line-clamp-1 mt-1">
                    {footerBanners[0].subtitle}
                  </p>
                )}
              </div>
            </Link>
          </AdTelemetryBeacon>
        ) : (
          <div className="p-6 sm:p-8 rounded-3xl border border-border/60 bg-card space-y-4">
            <div className="max-w-xl space-y-1">
              <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider font-bold">
                Empresas & Negócios
              </Badge>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                Divulgue seu negócio no <PlacesHighlightBadge className="text-lg sm:text-xl" />
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cadastre o perfil da sua empresa com endereço, fotos e WhatsApp para ser encontrado por clientes da sua cidade.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button asChild className="h-10 px-5 rounded-xl font-bold text-xs bg-foreground text-background hover:bg-foreground/90 shadow-2xs cursor-pointer">
                <Link to="/criar-negocio">
                  <Storefront size={15} weight="bold" className="mr-1.5" />
                  Cadastrar Empresa
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-10 px-5 rounded-xl font-bold text-xs border-border/80 hover:bg-muted/60 cursor-pointer">
                <Link to="/portal-completo">
                  Conhecer o Sistema Pro
                </Link>
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
