import React, { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Tag,
  Newspaper,
  Briefcase,
  CalendarDots,
  MapPin,
  Storefront,
  Ticket,
  Target,
  Rss,
  Globe,
  CookingPot,
  Airplane,
  Trophy,
} from "@phosphor-icons/react";
import type { ViewModeType, FilterChipOption } from "@/components/commerce/discovery-control-bar";
import type { VitrineEngineMode } from "@/types/marketplace-compliance";
import { formatMoney } from "@/lib/money";
import { resolveActiveCity } from "@/lib/city-helper";

import { listActiveBanners } from "@/services/banner.functions";
import { listEditorialHotpages } from "@/services/hotpage.functions";
import { getMarketplaceFeed, type FlashOfferDTO } from "@/services/marketplace.functions";
import { listUnifiedListings } from "@/services/unified-listing.functions";
import type { UnifiedListing } from "@/types/unified-ad-engine";
import { getPublicDirectory } from "@/services/directory.functions";
import { getPublicClassifieds } from "@/services/classifieds.functions";
import { listPublicJobs } from "@/services/jobs.functions";
import { getPublicEvents } from "@/services/events.functions";
import { listPublicArticles } from "@/services/news.functions";
import { getMuralFeed, type MuralFeedResponse } from "@/services/social.functions";
import { getAllPublicConcursos, type RaffleDTO } from "@/services/invite.functions";
import { getUserSession } from "@/services/auth.functions";
import { HomeMobileNativeApp } from "@/components/home/HomeMobileNativeApp";
import { HomeDesktopWebApp } from "@/components/home/HomeDesktopWebApp";
import { useWindowSizeClass } from "@/hooks/use-mobile";
import {
  listPublicHomePageSections,
  getUnifiedShowcasePosts,
  type HomePageSectionDTO,
} from "@/services/admin-home-cms.functions";

const DISCOVERY_CATEGORIES: FilterChipOption[] = [
  { id: "todos", label: "Todos os Anúncios", icon: Globe },
  { id: "places", label: "Lugares e Negócios", icon: MapPin },
  { id: "marketplace", label: "Marketplace de Empresas", icon: Storefront },
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
  staleTime: 15_000,
  head: () => ({
    meta: [
      {
        title:
          "Waesy Local Marketplace — Vitrine da Cidade, Comércio, Serviços, Notícias e Agentes IA",
      },
      {
        name: "description",
        content:
          "Waesy Local Marketplace: ecossistema integrado de comércio local, empresas verificadas com CNPJ, portal de notícias, classificados, vagas de emprego, eventos, receitas e protocolo WebMCP.",
      },
      {
        property: "og:title",
        content:
          "Waesy Local Marketplace — Vitrine da Cidade, Comércio, Serviços, Notícias e Agentes IA",
      },
      {
        property: "og:description",
        content:
          "Encontre empresas verificadas, ofertas locais, notícias da região, classificados, receitas, eventos e APIs abertas WebMCP no Waesy Local Marketplace.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://waesy.com.br/" },
      { property: "og:image", content: "https://waesy.com.br/pwa-512x512.png" },
      { name: "geo.region", content: "BR-SC" },
      { name: "geo.placename", content: "São Miguel do Oeste, Chapecó e Região" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
    ],
    links: [
      { rel: "canonical", href: "https://waesy.com.br/" },
      { rel: "alternate", type: "text/markdown", href: "https://waesy.com.br/llms.txt" },
    ],
  }),
  loader: async ({ location }) => {
    try {
      const filteredCity = resolveActiveCity(location.search as any);

      const [
        banners,
        middleBanners,
        footerBanners,
        editorialHotpages,
        marketplaceFeed,
        placesListings,
        classifieds,
        jobs,
        events,
        newsArticles,
        feedResponse,
        concursos,
        workspaceListings,
        homeSections,
        showcasePosts,
        session,
      ] = await Promise.all([
        listActiveBanners({ data: { placement: "home", city: filteredCity } }).catch(() => []),
        listActiveBanners({ data: { placement: "home_middle", city: filteredCity } }).catch(() => []),
        listActiveBanners({ data: { placement: "home_footer", city: filteredCity } }).catch(() => []),
        listEditorialHotpages({ data: { module: "home" } }).catch(() => []),
        getMarketplaceFeed().catch(() => ({ sections: [], allProducts: [] })),
        getPublicDirectory({ data: { limit: 12, city: filteredCity } }).catch(() => []),
        getPublicClassifieds({ data: { limit: 12, city: filteredCity } }).catch(() => []),
        listPublicJobs({ data: { limit: 8, city: filteredCity } }).catch(() => []),
        getPublicEvents({ data: { limit: 8, city: filteredCity } }).catch(() => []),
        listPublicArticles({ data: { limit: 6, city: filteredCity } }).catch(() => []),
        getMuralFeed({ data: { limit: 8 } }).catch(() => ({ items: [] })),
        getAllPublicConcursos({ data: { filter: "all" } }).catch(() => []),
        listUnifiedListings({ data: { origin: "workspace", limit: 36 } }).catch(() => []),
        listPublicHomePageSections({ data: { city: filteredCity } }).catch(() => []),
        getUnifiedShowcasePosts({ data: { limit: 12, city: filteredCity } }).catch(() => []),
        getUserSession().catch(() => null),
      ]);

      const directWorkspaceProducts = (workspaceListings || []).map((item: UnifiedListing) => {
        const origPrice = item.compare_at_cents || item.price_cents;
        const price = item.price_cents;
        const discount = origPrice > price ? Math.round(((origPrice - price) / origPrice) * 100) : 0;
        return {
          id: item.id,
          title: item.title,
          slug: item.slug || item.id,
          store_id: item.store_id,
          store_name: item.store_name || "Loja Credenciada",
          price_cents: price,
          original_price_cents: origPrice,
          discount_percent: discount,
          mechanic_label: discount > 0 ? `${discount}% OFF` : "Verificado",
          cover_image: item.cover_url || item.media_urls?.[0] || "",
          selling_unit: item.selling_unit || "un",
          in_stock: item.is_unlimited_stock || (item.stock_quantity ?? 1) > 0,
          has_flash_offer: discount > 0,
        };
      });

      const combinedMap = new Map<string, any>();
      for (const p of directWorkspaceProducts) {
        if (p.id) combinedMap.set(p.id, p);
      }
      for (const p of (marketplaceFeed?.allProducts || [])) {
        if (p.id && !combinedMap.has(p.id)) combinedMap.set(p.id, p);
      }

      return {
        banners: banners || [],
        middleBanners: middleBanners || [],
        footerBanners: footerBanners || [],
        editorialHotpages: editorialHotpages || [],
        marketplaceProducts: Array.from(combinedMap.values()) as FlashOfferDTO[],
        placesListings: placesListings || [],
        classifieds: classifieds || [],
        jobs: jobs || [],
        events: events || [],
        newsArticles: newsArticles || [],
        feedPosts: (feedResponse as MuralFeedResponse)?.items || [],
        concursos: concursos || [],
        homeSections: homeSections || [],
        showcasePosts: showcasePosts || [],
        session: session || null,
        activeCity: filteredCity,
      };
    } catch (err) {
      console.error("[loader:_store.index] Unhandled loader error:", err);
      return {
        banners: [],
        middleBanners: [],
        footerBanners: [],
        editorialHotpages: [],
        marketplaceProducts: [],
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
    editorialHotpages = [],
    marketplaceProducts = [],
    placesListings = [],
    classifieds = [],
    jobs = [],
    events = [],
    newsArticles = [],
    feedPosts = [],
    concursos = [],
    homeSections = [],
    showcasePosts = [],
  } = (data || {});

  // Resolução das seções gerenciadas via CMS Omni-Builder
  const heroSection = useMemo(() => {
    return (homeSections as HomePageSectionDTO[]).find(
      (s) => s.section_key === "hero_banners" && s.is_active,
    );
  }, [homeSections]);

  const quickCategoriesSection = useMemo(() => {
    return (homeSections as HomePageSectionDTO[]).find(
      (s) => s.section_key === "quick_categories_ifood" && s.is_active,
    );
  }, [homeSections]);

  const CANONICAL_MANAGED_KEYS = useMemo(
    () =>
      new Set([
        "promo_coupon_banner",
        "quick_categories_ifood",
        "hero_banners",
        "recent_stores_rail",
        "feature_mini_banners",
        "spotlight_restaurants",
        "spotlight_pharmacies",
        "filter_chips_bar",
        "stores_feed_list",
        "marketplace_products_rail",
        "classifieds_rail",
        "jobs_rail",
        "vitrine_engine_selector",
        "discovery_control_bar",
        "dual_line_filter_pills",
        "hotpages_grid",
        "marketplace_categories",
        "places_directory_rail",
        "social_posts_vitrine",
        "news_rail",
        "events_rail",
        "procedural_infinite_feed",
      ]),
    [],
  );

  const customSections = useMemo(() => {
    return (homeSections as HomePageSectionDTO[]).filter(
      (s) => s.is_active && !CANONICAL_MANAGED_KEYS.has(s.section_key),
    );
  }, [homeSections, CANONICAL_MANAGED_KEYS]);

  const socialPostsSection = useMemo(() => {
    return (homeSections as HomePageSectionDTO[]).find(
      (s) => s.section_key === "social_posts_vitrine",
    );
  }, [homeSections]);

  // Estado dos 3 Modos Canônicos de Visualização (Feed, Grid, List) e Filtros
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("todos");
  const [viewMode, setViewMode] = useState<ViewModeType>("feed");
  const [engineMode, setEngineMode] = useState<VitrineEngineMode>("empresas");

  // Filtragem contextual por termo de busca
  const term = search.trim().toLowerCase();

  const filteredPlaces = useMemo(() => {
    if (!term) return placesListings;
    return placesListings.filter(
      (p: any) =>
        (p.business_name || "").toLowerCase().includes(term) ||
        (p.category || "").toLowerCase().includes(term) ||
        (p.address || "").toLowerCase().includes(term),
    );
  }, [placesListings, term]);

  const filteredClassifieds = useMemo(() => {
    if (!term) return classifieds;
    return classifieds.filter(
      (c: any) =>
        (c.title || "").toLowerCase().includes(term) ||
        (c.category || "").toLowerCase().includes(term) ||
        (c.location_name || "").toLowerCase().includes(term),
    );
  }, [classifieds, term]);

  const filteredFeed = useMemo(() => {
    if (!term) return feedPosts;
    return feedPosts.filter(
      (f: any) =>
        (f.content_text || "").toLowerCase().includes(term) ||
        (f.profiles?.full_name || "").toLowerCase().includes(term) ||
        (f.location_name || "").toLowerCase().includes(term),
    );
  }, [feedPosts, term]);

  const filteredNews = useMemo(() => {
    if (!term) return newsArticles;
    return newsArticles.filter(
      (n: any) =>
        (n.title || "").toLowerCase().includes(term) ||
        (n.summary || "").toLowerCase().includes(term) ||
        (n.category || "").toLowerCase().includes(term),
    );
  }, [newsArticles, term]);

  const filteredJobs = useMemo(() => {
    if (!term) return jobs;
    return jobs.filter(
      (j: any) =>
        (j.title || "").toLowerCase().includes(term) ||
        (j.company_name || "").toLowerCase().includes(term) ||
        (j.location || "").toLowerCase().includes(term),
    );
  }, [jobs, term]);

  const filteredEvents = useMemo(() => {
    if (!term) return events;
    return events.filter(
      (e: any) =>
        (e.title || "").toLowerCase().includes(term) ||
        (e.category || "").toLowerCase().includes(term) ||
        (e.location || "").toLowerCase().includes(term),
    );
  }, [events, term]);

  const filteredConcursos = useMemo(() => {
    if (!term) return concursos;
    return concursos.filter(
      (c: RaffleDTO) =>
        (c.title || "").toLowerCase().includes(term) ||
        (c.storeName || "").toLowerCase().includes(term) ||
        (c.description || "").toLowerCase().includes(term),
    );
  }, [concursos, term]);

  const filteredMarketplaceProducts = useMemo(() => {
    if (!term) return marketplaceProducts;
    return marketplaceProducts.filter(
      (m: any) =>
        (m.title || "").toLowerCase().includes(term) ||
        (m.store_name || "").toLowerCase().includes(term),
    );
  }, [marketplaceProducts, term]);

  // Lista unificada para os modos Grade e Lista (extraindo dados reais sem misturar pilares)
  const unifiedItems = useMemo(() => {
    const list: Array<{
      id: string;
      pillar: "places" | "marketplace" | "classifieds" | "feed" | "noticias" | "empregos" | "eventos" | "agenda" | "afiliados" | "concursos";
      badge: string;
      title: string;
      image?: string | null;
      to: string;
      priceOrDate?: string;
      location?: string;
      phone?: string;
    }> = [];

    // 0. MARKETPLACE (PRODUTOS DE EMPRESAS VERIFICADAS)
    if (activeCategory === "todos" || activeCategory === "marketplace") {
      filteredMarketplaceProducts.forEach((item: any) => {
        list.push({
          id: `mkt-${item.id}`,
          pillar: "marketplace",
          badge: item.store_name || "Marketplace",
          title: item.title,
          image: item.cover_image || null,
          to: `/produto/${item.slug || item.id}`,
          priceOrDate: item.price_cents ? formatMoney(item.price_cents) : undefined,
          location: item.store_name || "Empresa Verificada",
        });
      });
    }

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
          badge: "Publicação",
          title: post.content_text ? post.content_text.slice(0, 90) : "Publicação da comunidade",
          image: cover,
          to: `/publicacao/${post.id}`,
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
    filteredMarketplaceProducts,
    filteredPlaces,
    filteredClassifieds,
    filteredFeed,
    filteredNews,
    filteredJobs,
    filteredEvents,
    filteredConcursos,
  ]);

  const sharedViewProps = {
    homeSections: homeSections as HomePageSectionDTO[],
    heroSection,
    quickCategoriesSection,
    socialPostsSection,
    customSections,
    editorialHotpages,
    banners,
    middleBanners,
    footerBanners,
    showcasePosts,
    engineMode,
    onEngineModeChange: setEngineMode,
    search,
    onSearchChange: setSearch,
    categories: DISCOVERY_CATEGORIES,
    activeCategory,
    onSelectCategory: setActiveCategory,
    viewMode,
    onViewModeChange: setViewMode,
    filteredPlaces,
    filteredMarketplaceProducts,
    filteredClassifieds,
    filteredNews,
    filteredJobs,
    filteredEvents,
    unifiedItems,
    formatMoney,
    session: data.session,
  };

  const { isCompact } = useWindowSizeClass();

  return (
    <div className="space-y-6">
      <section
        aria-label="Apresentação Institucional Waesy Local Marketplace"
        className="sr-only"
      >
        <h1>
          Waesy Local Marketplace — Comércio, Serviços, Notícias e Ecossistema de Agentes IA
        </h1>
        <p>
          O Waesy Local Marketplace é a plataforma operacional integrada de comércio local, guia de
          empresas verificadas com Cartão CNPJ, classificados regionais, portal de notícias
          jornalísticas, receitas da comunidade, agenda cultural de eventos, vagas de emprego e
          mobilidade urbana. Todas as páginas públicas oferecem suporte nativo a SEO, Generative
          Engine Optimization (GEO), negociação de conteúdo em Markdown (Accept: text/markdown),
          OpenAPI 3.1 e Model Context Protocol (MCP Streamable HTTP JSON-RPC 2.0).
        </p>
      </section>

      {isCompact ? (
        <HomeMobileNativeApp {...sharedViewProps} />
      ) : (
        <HomeDesktopWebApp {...sharedViewProps} />
      )}

      <footer
        aria-label="Diretório Institucional, SEO, GEO e Portal de Desenvolvedores Waesy"
        className="mx-auto max-w-7xl border-t border-border px-4 py-8 text-xs text-muted-foreground"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Waesy Local Marketplace</h2>
            <p className="leading-relaxed">
              Ecossistema integrado de comércio, serviços, diretório empresarial com CNPJ validado,
              portal de notícias e descoberta local para consumidores e agentes de IA.
            </p>
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Canais Públicos Indexados</h2>
            <ul className="space-y-2">
              <li><a href="/diretorio" className="hover:text-foreground underline-offset-4 hover:underline">Diretório de Empresas e CNPJ</a></li>
              <li><a href="/noticias" className="hover:text-foreground underline-offset-4 hover:underline">Portal de Notícias Regionais</a></li>
              <li><a href="/classificados" className="hover:text-foreground underline-offset-4 hover:underline">Classificados e Ofertas</a></li>
              <li><a href="/eventos" className="hover:text-foreground underline-offset-4 hover:underline">Agenda de Eventos</a></li>
              <li><a href="/receitas" className="hover:text-foreground underline-offset-4 hover:underline">Receitas da Comunidade</a></li>
              <li><a href="/vagas" className="hover:text-foreground underline-offset-4 hover:underline">Vagas de Emprego</a></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Desenvolvedores e Agentes IA</h2>
            <ul className="space-y-2">
              <li><a href="/developers" className="hover:text-foreground underline-offset-4 hover:underline">Portal de Desenvolvedores (/developers)</a></li>
              <li><a href="/docs" className="hover:text-foreground underline-offset-4 hover:underline">Documentação da API (/docs)</a></li>
              <li><a href="/api/openapi.json" className="hover:text-foreground underline-offset-4 hover:underline">Especificação OpenAPI 3.1</a></li>
              <li><a href="/.well-known/mcp.json" className="hover:text-foreground underline-offset-4 hover:underline">Manifesto MCP (.well-known/mcp.json)</a></li>
              <li><a href="/api/webmcp.json" className="hover:text-foreground underline-offset-4 hover:underline">Catálogo WebMCP (/api/webmcp.json)</a></li>
              <li><a href="/llms.txt" className="hover:text-foreground underline-offset-4 hover:underline">Instruções LLMs (/llms.txt)</a></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Institucional e Confiança</h2>
            <ul className="space-y-2">
              <li><a href="/about" className="hover:text-foreground underline-offset-4 hover:underline">Sobre a Waesy (/about)</a></li>
              <li><a href="/contact" className="hover:text-foreground underline-offset-4 hover:underline">Contato e Suporte (/contact)</a></li>
              <li><a href="/privacy" className="hover:text-foreground underline-offset-4 hover:underline">Política de Privacidade e LGPD (/privacy)</a></li>
              <li><a href="/sitemap.xml" className="hover:text-foreground underline-offset-4 hover:underline">Mapa do Site (/sitemap.xml)</a></li>
              <li><a href="/sitemap-news.xml" className="hover:text-foreground underline-offset-4 hover:underline">Sitemap de Notícias (/sitemap-news.xml)</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
