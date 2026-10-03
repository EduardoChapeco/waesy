import React, { useState, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Tag, Newspaper, Briefcase, CalendarDots, MapPin, Clock, WhatsappLogo, Buildings, Star, CheckCircle, Storefront, ArrowRight, Ticket, UserCircle, Target, Rss, ChatCircleDots, Globe, CookingPot, Airplane, Trophy, ShieldCheck } from "@phosphor-icons/react";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { MasterSquircleHero } from "@/components/commerce/master-squircle-hero";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { PlacesHighlightBadge } from "@/components/shell/places-highlight-badge";
import { NewsCard } from "@/components/news/news-card";
import { DiscoveryControlBar, type ViewModeType, type FilterChipOption } from "@/components/commerce/discovery-control-bar";
import { VitrineEngineSelector } from "@/components/commerce/vitrine-engine-selector";
import type { VitrineEngineMode } from "@/types/marketplace-compliance";
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
    slug: "marketplace",
    title: "Marketplace",
    to: "/marketplace",
  },
  {
    slug: "places",
    title: "Lugares e Negócios",
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
    slug: "receitas",
    title: "Receitas",
    to: "/receitas",
  },
  {
    slug: "turismo",
    title: "Turismo e Roteiros",
    to: "/turismo",
  },
  {
    slug: "concursos",
    title: "Concursos",
    to: "/concursos",
  },
];

const DISCOVERY_CATEGORIES: FilterChipOption[] = [
  { id: "todos", label: "Todos os Anúncios", icon: Globe },
  { id: "places", label: "Lugares e Negócios", icon: MapPin },
  { id: "classificados", label: "Classificados", icon: Tag },
  { id: "receitas", label: "Receitas", icon: CookingPot },
  { id: "turismo", label: "Turismo e Roteiros", icon: Airplane },
  { id: "feed", label: "Feed", icon: Rss },
  { id: "noticias", label: "Notícias", icon: Newspaper },
  { id: "empregos", label: "Empregos", icon: Briefcase },
  { id: "eventos", label: "Eventos", icon: Ticket },
  { id: "agenda", label: "Agenda", icon: CalendarDots },
  { id: "afiliados", label: "Afiliados", icon: Target },
  { id: "concursos", label: "Concursos de Sorte", icon: Trophy },
];

export const Route = createFileRoute("/_store/")({
  head: () => ({
    meta: [
      { title: "Waesy — Vitrine da Cidade | Classificados, Empregos, Eventos e Mais" },
      {
        name: "description",
        content:
          "Encontre classificados, vagas de emprego, eventos, notícias, receitas e empresas locais em Chapecó e região. Tudo numa vitrine só.",
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
  component: VitrineHome,
});

export function VitrineHome() {
  const data = (Route.useLoaderData?.() as any) || {};
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
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("todos");
  const [viewMode, setViewMode] = useState<ViewModeType>("feed");
  const [engineMode, setEngineMode] = useState<VitrineEngineMode>("empresas");

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
          priceOrDate: item.rating ? `${Number(item.rating).toFixed(1)}` : undefined,
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
    <div className="w-full space-y-4 sm:space-y-4 pb-14">
      {/* ── 0. HERO SQUIRCLE MASTER BANNERS & QUICK ACCESS PILLS (iFood Style) ── */}
      <MasterSquircleHero />

      {/* ── 1. CARDS COM IMAGENS DO TOPO (Categorias Master com Separação Rigorosa de Breakpoint) ── */}
      <section aria-label="Categorias Principais">
        <HorizontalRail title="Categorias Principais" hideHeader={true}>
          {displayHeroCards.map((card) => (
            <Link
              key={card.slug}
              to={card.to as any}
              className={`min-w-36 sm:min-w-52 md:min-w-60 max-w-64 shrink-0 snap-start group relative flex flex-col justify-end overflow-hidden rounded-lg bg-card aspect-video sm:aspect-video border border-border/60 hover:border-foreground/30 transition-all duration-200 active:active:scale-95 shadow-none`}
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
                <div className="relative z-10 p-3 sm:p-3 w-full">
                  {(card as any).isPlacesBadge ? (
                    <PlacesHighlightBadge
                      className={`text-xs font-bold drop-shadow-sm ${
                        (card as any).textColor ? "" : (card as any).showOverlay ? "text-white" : "text-foreground"
                      }`}
                      style={(card as any).textColor ? { color: (card as any).textColor } : undefined}
                    />
                  ) : (
                    <h2
                      className={`text-xs font-bold leading-tight drop-shadow-sm truncate ${
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

      {/* ── 2.8. SELETOR TRI-ENGINE: EMPRESAS VS MARKETPLACE PRO VS CLASSIFICADOS LOCAIS ── */}
      <VitrineEngineSelector
        activeMode={engineMode}
        onModeChange={(mode) => {
          setEngineMode(mode);
          if (mode === "empresas") {
            setActiveCategory("places");
          } else if (mode === "marketplace") {
            navigate({ to: "/marketplace" });
          } else {
            setActiveCategory("classificados");
          }
        }}
      />

      {/* ── 3. BARRA DE CONTROLE CANÔNICA (DiscoveryControlBar: Busca + Categorias + Feed/Grid/List) ── */}
      <DiscoveryControlBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar na cidade..."
        categories={DISCOVERY_CATEGORIES}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        allowedViewModes={["feed", "grid", "list"]}
        stickyMode="none"
      />

      {/* ── 4. RENDERIZAÇÃO DOS 3 MODOS DE VISUALIZAÇÃO ── */}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODO 1: FEED (TRILHOS HORIZONTAIS COM SNAP SCROLL POR PILAR)
          ───────────────────────────────────────────────────────────────────────────── */}
      {viewMode === "feed" && (
        <div className="space-y-4 sm:space-y-5 mt-2">
          {/* PLACES */}
          {(activeCategory === "todos" || activeCategory === "places") && filteredPlaces.length > 0 && (
            <section aria-label="Places" className="space-y-2">
              <HorizontalRail
                title="Places"
                actionLabel="Ver todos"
                onAction={() => {}}
                actionTo="/diretorio"
              >
                {filteredPlaces.map((item: DirectoryListingDTO) => {
                  const coverImage = item.banner_url || item.avatar_url;
                  return (
                    <div
                      key={item.id}
                      className="min-w-72 sm:min-w-80 max-w-xs shrink-0 group flex flex-col justify-between rounded-lg border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-all h-72"
                    >
                      <Link to="/diretorio/$id" params={{ id: item.id }} className="block">
                        <div className="relative aspect-video w-full overflow-hidden bg-muted/40">
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
                            <Badge variant="secondary" className="bg-background/95 border border-border/40 text-foreground text-xs font-bold">
                              {item.category}
                            </Badge>
                          </div>
                        </div>

                        <div className="p-4 space-y-1 h-16 flex flex-col justify-start">
                          <div className="flex items-center justify-between gap-2">
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

                      <div className="px-4 pb-3 pt-0 flex items-center justify-between gap-2 border-t border-border/30 mt-auto h-10">
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
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground/75 font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
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
                      className="min-w-60 sm:min-w-68 max-w-72 shrink-0 group flex flex-col justify-between rounded-lg border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-all h-80"
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
                          <Badge variant="secondary" className="bg-background/95 border border-border/40 text-foreground text-xs font-bold uppercase">
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
                        <p className="text-xs text-muted-foreground/75 text-muted-foreground truncate">
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
                      className="min-w-64 sm:min-w-72 max-w-xs shrink-0 p-4 rounded-lg border border-border/60 bg-card hover:border-foreground/30 transition-all flex flex-col justify-between group space-y-3"
                    >
                      <div className="flex items-center gap-3">
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
                          <p className="text-xs text-muted-foreground truncate">
                            {post.location_name || "Na cidade"}
                          </p>
                        </div>
                      </div>

                      {coverImage && (
                        <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted/40">
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

                      <div className="pt-2 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground/75 text-muted-foreground font-medium">
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
                  <div key={article.id} className="min-w-72 sm:min-w-80 max-w-sm shrink-0">
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
                      className="min-w-72 sm:min-w-80 max-w-xs shrink-0 p-4 rounded-lg border border-border/60 bg-card hover:border-foreground/30 transition-all space-y-3 group flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="size-12 rounded-lg overflow-hidden bg-muted/40 border border-border/60 shrink-0 flex items-center justify-center">
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
                          <span className="truncate max-w-32">{job.location}</span>
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
                      className="min-w-72 sm:min-w-80 max-w-xs shrink-0 rounded-lg border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-all flex flex-col justify-between group"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-muted/40">
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
                          <Badge variant="secondary" className="bg-background/95 border border-border/40 text-foreground text-xs font-bold">
                            {ev.category || "Evento"}
                          </Badge>
                        </div>
                        <div className="absolute bottom-2.5 right-2.5">
                          <span className="bg-foreground text-background text-white text-xs font-mono font-bold px-2 py-1 rounded-md">
                            {ev.date_display || "A Confirmar"}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 space-y-2">
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
                      className="min-w-72 sm:min-w-80 max-w-xs shrink-0 rounded-lg border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-all flex flex-col justify-between group"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-muted/40">
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
                          <Badge variant="secondary" className="bg-background/95 border border-border/40 text-foreground text-xs font-bold">
                            {ev.category || "Agenda"}
                          </Badge>
                        </div>
                        <div className="absolute bottom-2.5 right-2.5">
                          <span className="bg-foreground text-background text-white text-xs font-mono font-bold px-2 py-1 rounded-md">
                            {ev.date_display || "Data confirmada"}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 space-y-2">
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
                    className="group relative block w-full aspect-video sm:aspect-video rounded-lg overflow-hidden bg-card border border-border/60 hover:border-foreground/30 transition-all"
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
                        <span className="inline-block px-3 py-1 rounded-md text-xs font-mono font-bold uppercase tracking-wider bg-white/20 text-white border border-white/20 mb-2">
                          {middleBanners[0].badge_text}
                        </span>
                      )}
                      <h3 className="text-base sm:text-lg font-bold text-white leading-tight drop-shadow-sm">
                        {middleBanners[0].title}
                      </h3>
                      {middleBanners[0].subtitle && (
                        <p className="text-xs text-white/85 line-clamp-1 mt-1">
                          {middleBanners[0].subtitle}
                        </p>
                      )}
                    </div>
                  </Link>
                </AdTelemetryBeacon>
              ) : activeCategory === "afiliados" ? (
                /* Card Editorial de Afiliados exibido exclusivamente na categoria Afiliados */
                <div className="p-5 sm:p-6 rounded-lg border border-border/60 bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <Badge variant="outline" className="text-xs font-mono uppercase tracking-wider font-bold">
                      Afiliados
                    </Badge>
                    <h3 className="text-base sm:text-lg font-bold text-foreground">
                      Programa de Afiliados Waesy
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Indique empresas para a plataforma e receba comissões e benefícios na sua conta.
                    </p>
                  </div>
                  <Button asChild size="sm" className="h-10 px-5 rounded-lg text-xs font-bold shrink-0 cursor-pointer">
                    <Link to="/afiliados">
                      <span>Conhecer Afiliados</span>
                      <ArrowRight size={13} className="ml-2" />
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
            <div className="py-20 text-center space-y-3 bg-card rounded-lg border border-border/60 p-8">
              <Tag className="size-10 text-muted-foreground/40 mx-auto" />
              <h2 className="text-sm font-bold text-foreground">
                Nenhum anúncio encontrado com estes filtros
              </h2>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Tente alterar os termos da busca ou selecionar outra categoria.
              </p>
            </div>
          ) : (
            <div className="adaptive-card-grid">
              {unifiedItems.map((item) => (
                <div
                  key={item.id}
                  className="group rounded-lg border border-border/50 bg-card overflow-hidden hover:border-foreground/30 transition-all flex flex-col justify-between"
                >
                  <Link to={item.to as any} className="flex-1 flex flex-col cursor-pointer">
                    <div className="relative aspect-video w-full overflow-hidden bg-muted/40 shrink-0">
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
                        <Badge className="bg-background/95 text-foreground font-mono text-xs uppercase font-bold px-2 py-1 rounded-md border border-border/40">
                          {item.badge}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
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
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground/75 font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
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
          MODO 3: LISTA COMPACTA (SEPARAÇÃO RIGOROSA MOBILE VS DESKTOP)
          - Mobile (< 768px): WhatsApp List Pattern (Row compacta, 48px thumb, dados à direita)
          - Desktop (>= 768px): Split Card Horizontal Widescreen
          ───────────────────────────────────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <section aria-label="Lista de Anúncios" className="space-y-3">
          {unifiedItems.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-card rounded-lg border border-border/50 p-8">
              <Tag className="size-10 text-muted-foreground/40 mx-auto" />
              <h2 className="text-sm font-bold text-foreground">
                Nenhum anúncio encontrado com estes filtros
              </h2>
            </div>
          ) : (
            <>
              {/* ── MOBILE EXCLUSIVO (< 768px): WhatsApp List Pattern ── */}
              <div className="block md:hidden divide-y divide-border/30 rounded-lg border border-border/50 bg-card overflow-hidden">
                {unifiedItems.map((item) => (
                  <Link
                    key={item.id}
                    to={item.to as any}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors group cursor-pointer"
                  >
                    <div className="size-12 rounded-lg bg-muted/30 border border-border/40 shrink-0 overflow-hidden flex items-center justify-center">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="size-full object-cover" loading="lazy" />
                      ) : (
                        <Tag size={20} className="text-muted-foreground/40" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-mono px-1 py-0 h-4 text-muted-foreground border-border/50">
                          {item.badge}
                        </Badge>
                        {item.priceOrDate && (
                          <span className="font-mono font-bold text-xs text-foreground truncate">
                            {item.priceOrDate}
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                        {item.title}
                      </p>
                      {item.location && (
                        <p className="text-xs text-muted-foreground/75 text-muted-foreground truncate flex items-center gap-1">
                          <MapPin size={11} className="shrink-0 text-muted-foreground" />
                          <span className="truncate">{item.location}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {item.phone && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            trackAndOpenWhatsApp({
                              phone: item.phone || "",
                              message: `Olá! Vi o anúncio "${item.title}" no Waesy.`,
                              storeId: null,
                              entityType: item.pillar,
                              entityId: item.id,
                              entityTitle: item.title,
                            });
                          }}
                          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                          title="WhatsApp"
                        >
                          <WhatsappLogo size={18} weight="bold" />
                        </button>
                      )}
                      <ArrowRight size={16} className="text-muted-foreground/60 group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                ))}
              </div>

              {/* ── DESKTOP EXCLUSIVO (>= 768px): Split Card Horizontal Widescreen ── */}
              <div className="hidden md:flex flex-col space-y-3">
                {unifiedItems.map((item) => (
                  <div
                    key={item.id}
                    className="group flex flex-row items-stretch justify-between rounded-lg border border-border/50 bg-card hover:border-foreground/30 transition-all overflow-hidden p-0 w-full"
                  >
                    <Link
                      to={item.to as any}
                      className="relative w-56 lg:w-64 h-auto min-h-36 overflow-hidden bg-muted/40 shrink-0 cursor-pointer"
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
                        <Badge className="bg-background/95 text-foreground font-mono text-xs uppercase font-bold px-2 py-1 rounded-md border border-border/40">
                          {item.badge}
                        </Badge>
                      </div>
                    </Link>

                    <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col justify-between space-y-2">
                      <Link to={item.to as any} className="space-y-1 block cursor-pointer">
                        {item.priceOrDate && (
                          <p className="text-lg font-black text-foreground font-mono">
                            {item.priceOrDate}
                          </p>
                        )}
                        <h3 className="font-bold text-base text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                      </Link>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                          <MapPin size={12} className="shrink-0 text-muted-foreground" />
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
                              className="h-8 px-3 rounded-lg text-xs gap-2 border-border/50 hover:bg-muted/50 cursor-pointer"
                            >
                              <WhatsappLogo size={15} weight="bold" />
                              <span>WhatsApp</span>
                            </Button>
                          )}

                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 px-4 rounded-lg text-xs font-semibold hover:bg-muted cursor-pointer"
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
                ))}
              </div>
            </>
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
              className="group relative block w-full aspect-video sm:aspect-video rounded-lg overflow-hidden bg-card border border-border/60 hover:border-foreground/30 transition-all"
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
                  <span className="inline-block px-3 py-1 rounded-md text-xs font-mono font-bold uppercase tracking-wider bg-white/20 text-white border border-white/20 mb-2">
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
          <div className="p-6 sm:p-8 rounded-lg border border-border/60 bg-card space-y-4">
            <div className="max-w-xl space-y-1">
              <Badge variant="outline" className="text-xs font-mono uppercase tracking-wider font-bold">
                Empresas e Negócios
              </Badge>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                Divulgue seu negócio no <PlacesHighlightBadge className="text-lg sm:text-xl" />
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cadastre o perfil da sua empresa com endereço, fotos e WhatsApp para ser encontrado por clientes da sua cidade.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button asChild className="h-10 px-5 rounded-lg font-bold text-xs bg-foreground text-background hover:bg-foreground/90 cursor-pointer">
                <Link to="/criar-negocio">
                  <Storefront size={15} weight="bold" className="mr-2" />
                  Cadastrar Empresa
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-10 px-5 rounded-lg font-bold text-xs border-border/80 hover:bg-muted/60 cursor-pointer">
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
