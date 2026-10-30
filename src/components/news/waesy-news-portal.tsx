import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Bookmark,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  FileText,
  Flame,
  Globe,
  Heart,
  Layers,
  LayoutTemplate,
  LayoutGrid,
  List,
  MapPin,
  Megaphone,
  MessageCircle,
  Newspaper,
  Plus,
  Radar,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import type { NewsArticleDTO, SponsorDTO } from "@/services/news.functions";
import type { BannerDTO } from "@/services/banner.functions";
import { listArticleComments, submitArticleComment } from "@/services/news.functions";
import {
  CANONICAL_PROMETHEE_TABS,
  normalizePrometheeArticle,
  type NormalizedPrometheeArticle,
} from "@/lib/news/news-studio-templates";
import { PrometheeWireframeDomeLogo } from "@/components/builder/blocks/PrometheeNewsPortalBlock";
import { PrometheeLocationSheet } from "@/components/news/promethee-location-sheet";
import { PrometheeNewsStudioModal } from "@/components/news/promethee-news-studio-modal";
import { PrometheeExploreSearchModal } from "@/components/news/promethee-explore-search-modal";
import { PrometheeTrendingMarkerStrip } from "@/components/news/promethee-trending-marker-strip";
import { EditorialAdSlot } from "@/components/news/editorial-ad-slot";
import { getStoredLocation } from "@/components/location/location-master-pill";
import { CANONICAL_CITIES, getRegionalNeighboringCities } from "@/lib/constants/cities";
import { Logo } from "@/components/commerce/logo";

export interface WaesyNewsPortalProps {
  initialArticles?: NewsArticleDTO[];
  initialSponsors?: SponsorDTO[];
  initialBanners?: BannerDTO[];
  initialActiveCity?: string;
  initialLoadError?: string;
}


interface PortalComment {
  id: string;
  authorName: string;
  contentText: string;
  createdAtLabel: string;
}

export function WaesyNewsPortal({
  initialArticles = [],
  initialSponsors = [],
  initialBanners = [],
  initialActiveCity = "",
  initialLoadError,
}: WaesyNewsPortalProps) {
  const [selectedCity, setSelectedCity] = useState<string>(
    initialActiveCity && initialActiveCity !== "all" && initialActiveCity !== "Global"
      ? initialActiveCity
      : "Todas as Cidades"
  );
  const [selectedTab, setSelectedTab] = useState<string>("Para você");
  const [viewMode, setViewMode] = useState<"stream" | "grid">("stream");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isLocationOpen, setIsLocationOpen] = useState<boolean>(false);
  const [isCitizenOpen, setIsCitizenOpen] = useState<boolean>(false);
  const [studioArticle, setStudioArticle] = useState<NormalizedPrometheeArticle | null>(null);
  const [activeArticle, setActiveArticle] = useState<NormalizedPrometheeArticle | null>(null);
  const [showReaderSummary, setShowReaderSummary] = useState<boolean>(false);

  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [shareCopiedId, setShareCopiedId] = useState<string | null>(null);
  const [citizenArticles, setCitizenArticles] = useState<NormalizedPrometheeArticle[]>([]);

  // Campos envio de pauta (+)
  const [citAuthor, setCitAuthor] = useState("");
  const [citCity, setCitCity] = useState(
    selectedCity !== "Todas as Cidades" ? selectedCity : "São Miguel do Oeste"
  );
  const [citCategory, setCitCategory] = useState("Urgente");
  const [citTitle, setCitTitle] = useState("");
  const [citBody, setCitBody] = useState("");

  // Comentários do leitor
  const [comments, setComments] = useState<PortalComment[]>([]);
  const [commentText, setCommentText] = useState("");

  const normalizedArticles = useMemo<NormalizedPrometheeArticle[]>(() => {
    const dbNormalized = initialArticles.map((item, idx) => normalizePrometheeArticle(item, idx));
    return [...citizenArticles, ...dbNormalized];
  }, [citizenArticles, initialArticles]);

  // Hidrata localização salva no app Waesy ou parâmetro ?artigo=slug
  useEffect(() => {
    const stored = getStoredLocation();
    if (stored?.city) {
      const hasArticlesInStoredCity = normalizedArticles.some(
        (a) => a.city.toLowerCase() === stored.city.toLowerCase(),
      );
      if (hasArticlesInStoredCity) {
        setSelectedCity(stored.city);
      }
    }

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const slug = params.get("artigo");
      if (slug) {
        const found = normalizedArticles.find((a) => a.slug === slug || a.id === slug);
        if (found) setActiveArticle(found);
      }
    }
  }, [normalizedArticles]);

  // Carrega comentários reais quando abre reportagem
  useEffect(() => {
    if (!activeArticle?.id) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      activeArticle.id,
    );
    if (!isUuid) {
      setComments([]);
      return;
    }

    let cancelled = false;
    listArticleComments({ data: { articleId: activeArticle.id } })
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
  }, [activeArticle?.id]);

  const openArticleView = (art: NormalizedPrometheeArticle | null) => {
    setActiveArticle(art);
    setShowReaderSummary(false);
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        if (art) {
          url.searchParams.set("artigo", art.slug || art.id);
        } else {
          url.searchParams.delete("artigo");
        }
        window.history.replaceState({}, "", url.toString());
      } catch {
        // Ignora
      }
    }
  };

  const cityScopedArticles = useMemo(() => {
    if (selectedCity === "Todas as Cidades") return normalizedArticles;
    return normalizedArticles.filter((a) => a.city.toLowerCase() === selectedCity.toLowerCase());
  }, [normalizedArticles, selectedCity]);

  const breakingArticles = useMemo(() => {
    const pool = cityScopedArticles.length > 0 ? cityScopedArticles : normalizedArticles;
    const urgent = pool.filter((a) => a.isBreaking);
    return (urgent.length >= 2 ? urgent : pool).slice(0, 6);
  }, [cityScopedArticles, normalizedArticles]);

  const feedArticles = useMemo(() => {
    return cityScopedArticles.filter((art) => {
      if (selectedTab === "Salvos" && !savedIds[art.id]) return false;
      if (
        selectedTab !== "Para você" &&
        selectedTab !== "Salvos" &&
        art.category.toLowerCase() !== selectedTab.toLowerCase()
      ) {
        if (!(selectedTab === "Urgente" && art.isBreaking)) return false;
      }
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const match =
          art.title.toLowerCase().includes(q) ||
          art.lead.toLowerCase().includes(q) ||
          art.city.toLowerCase().includes(q) ||
          art.category.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [cityScopedArticles, savedIds, searchQuery, selectedTab]);

  // Exibe apenas abas que tenham conteúdo real (+ Para você e Salvos — Invariante B.8/B.33)
  const visibleTabs = useMemo(() => {
    return CANONICAL_PROMETHEE_TABS.filter((tab) => {
      if (tab === "Para você" || tab === "Salvos") return true;
      if (tab === "Urgente") return normalizedArticles.some((a) => a.isBreaking || a.category === "Urgente");
      return normalizedArticles.some((a) => a.category.toLowerCase() === tab.toLowerCase());
    });
  }, [normalizedArticles]);

  const activeCitiesSummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const art of normalizedArticles) {
      counts.set(art.city, (counts.get(art.city) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [normalizedArticles]);

  const activeSponsor = useMemo(() => {
    if (initialSponsors.length === 0) return null;
    if (selectedCity !== "Todas as Cidades") {
      const matched = initialSponsors.find(
        (s) =>
          String(s.description || "").toLowerCase().includes(selectedCity.toLowerCase()) ||
          String(s.name || "").toLowerCase().includes(selectedCity.toLowerCase()),
      );
      if (matched) return matched;
    }
    return initialSponsors[0];
  }, [initialSponsors, selectedCity]);

  const handleShareArticle = async (art: NormalizedPrometheeArticle) => {
    if (typeof window === "undefined") return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?artigo=${encodeURIComponent(art.slug || art.id)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: art.title,
          text: art.lead,
          url: shareUrl,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setShareCopiedId(art.id);
        setTimeout(() => setShareCopiedId(null), 2200);
      }
    } catch {
      // Cancelado pelo usuário
    }
  };

  const handlePublishCitizenPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!citTitle.trim() || !citBody.trim()) return;
    const text = citBody.trim();
    const created: NormalizedPrometheeArticle = {
      id: `cit-${Date.now()}`,
      slug: `pauta-${Date.now()}`,
      title: citTitle.trim(),
      lead: text.slice(0, 220),
      body: text.split(/\n{2,}|\n/).filter(Boolean),
      bulletSummary: [text.slice(0, 180)],
      quote: citTitle.trim(),
      category: citCategory,
      city: citCity,
      state: "SP",
      publishedAgo: "Agora",
      publishedDateLabel: "Relato da comunidade",
      readingTime: "2 min",
      author: citAuthor.trim() || "Morador da Região",
      role: "Canal Participativo",
      isBreaking: citCategory === "Urgente",
      likesCount: 1,
      commentsCount: 0,
      coverImageUrl: null,
    };
    setCitizenArticles((prev) => [created, ...prev]);
    setCitTitle("");
    setCitBody("");
    setIsCitizenOpen(false);
    setSelectedTab("Para você");
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeArticle || commentText.trim().length < 3) return;
    const clean = commentText.trim();
    setComments((prev) => [
      {
        id: `local-${Date.now()}`,
        authorName: "Leitor Colaborador",
        contentText: clean,
        createdAtLabel: "Agora",
      },
      ...prev,
    ]);
    setCommentText("");

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      activeArticle.id,
    );
    if (isUuid) {
      try {
        await submitArticleComment({
          data: { articleId: activeArticle.id, contentText: clean },
        });
      } catch {
        // Visitante sem sessão mantém visualização local
      }
    }
  };

  const neighboringCities = useMemo(() => {
    const baseCity = selectedCity !== "Todas as Cidades" ? selectedCity : (initialActiveCity || "São Miguel do Oeste");
    return getRegionalNeighboringCities(baseCity, 8);
  }, [selectedCity, initialActiveCity]);

  const activeBanners = useMemo(() => {
    if (!initialBanners || initialBanners.length === 0) return [];
    if (selectedCity === "Todas as Cidades") return initialBanners;
    return initialBanners.filter(
      (b) => !b.city_filter || b.city_filter.toLowerCase() === selectedCity.toLowerCase() || b.city_filter === "all",
    );
  }, [initialBanners, selectedCity]);

  const squareBanners = useMemo(() => {
    return activeBanners.filter((b) => b.aspect_ratio_mode === "square" || b.aspect_ratio_mode === "1:1");
  }, [activeBanners]);

  const verticalBanners = useMemo(() => {
    return activeBanners.filter(
      (b) =>
        b.aspect_ratio_mode === "vertical" ||
        b.aspect_ratio_mode === "4:5" ||
        b.aspect_ratio_mode === "9:16",
    );
  }, [activeBanners]);

  const billboardBanners = useMemo(() => {
    return activeBanners.filter(
      (b) =>
        !b.aspect_ratio_mode ||
        b.aspect_ratio_mode === "horizontal" ||
        b.aspect_ratio_mode === "billboard",
    );
  }, [activeBanners]);

  return (
    <div className="light h-dvh w-full overflow-y-auto overflow-x-hidden bg-background text-foreground selection:bg-foreground selection:text-background">
      {/* ── 1. HEADER EDITORIAL MINIMALISTA (Ícones 44px no Mobile sem comprimir a marca) ── */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              openArticleView(null);
              setSelectedTab("Para você");
            }}
            className="min-h-11 flex items-center gap-3 text-left rounded-2xl px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-0"
          >
            <span className="size-10 rounded-2xl border border-border bg-muted/30 flex items-center justify-center shrink-0">
              <PrometheeWireframeDomeLogo className="size-7 text-foreground" />
            </span>
            <span className="text-base sm:text-xl font-black tracking-tight text-foreground leading-tight">
              Waesynews
            </span>
            <span className="hidden sm:inline-flex rounded-md border border-border bg-muted/40 px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Showcase Editorial
            </span>
          </button>

          {/* Ações enxutas: somente ícones no mobile (<640px), rótulos no desktop */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsLocationOpen(true)}
              className="size-11 sm:w-auto sm:px-3 min-h-11 rounded-full border border-border bg-muted/30 hover:bg-muted flex items-center justify-center gap-2 text-xs font-semibold text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Filtrar por cidade: ${selectedCity}`}
            >
              <MapPin className="size-4 shrink-0" />
              <span className="hidden sm:inline max-w-36 overflow-hidden whitespace-nowrap">
                {selectedCity}
              </span>
              <ChevronDown className="hidden sm:inline size-3 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={() => setIsSearchOpen((p) => !p)}
              className="size-11 min-h-11 rounded-full border border-border bg-muted/30 hover:bg-muted flex items-center justify-center text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Pesquisar notícias"
            >
              {isSearchOpen ? <X className="size-4" /> : <Search className="size-4" />}
            </button>

            <button
              type="button"
              onClick={() => setStudioArticle(activeArticle || normalizedArticles[0] || null)}
              className="size-11 md:w-auto md:px-3 min-h-11 rounded-full border border-border bg-muted/30 hover:bg-muted flex items-center justify-center gap-2 text-xs font-semibold text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Criar Posts (PNG)"
              title="Gerar post PNG"
            >
              <Layers className="size-4 shrink-0" />
              <span className="hidden lg:inline">Estúdio PNG</span>
            </button>
          </div>
        </div>

        {/* Barra de Pesquisa Sob Demanda */}
        {isSearchOpen && (
          <div className="mx-auto max-w-6xl px-4 pb-3">
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/30 px-3 h-11 min-h-11">
              <Search className="size-4 text-muted-foreground shrink-0" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por cidade, rodovia, bairro ou assunto..."
                className="w-full h-11 min-h-11 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="size-11 min-h-11 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Limpar busca"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── 2. MENU TABS COM BOTÃO + FIXO SOMENTE ÍCONE (Padrão Prométhée / Threads) ── */}
        {!activeArticle && (
          <nav aria-label="Editorias" className="border-t border-border/60 bg-background">
            <div className="mx-auto max-w-6xl px-4 py-2 flex items-center gap-2">
              <div className="shrink-0 flex items-center pr-2 border-r border-border/40">
                <button
                  type="button"
                  onClick={() => setIsCitizenOpen(true)}
                  className="size-11 min-h-11 rounded-full border border-border bg-card hover:bg-muted text-foreground flex items-center justify-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Enviar pauta ou relato"
                >
                  <Plus className="size-5" />
                </button>
              </div>

              <div className="waesy-tab-strip flex flex-nowrap items-center min-w-0 flex-1 scroll-smooth gap-2 py-1">
                {visibleTabs.map((tab) => {
                  const isActive = selectedTab === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setSelectedTab(tab)}
                      className={`h-11 min-h-11 px-4 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isActive
                          ? "bg-foreground text-background"
                          : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* ── 3. CONTEÚDO PRINCIPAL: LEITOR DE MATÉRIA OU STREAM EDITORIAL BIDIRECIONAL ── */}
      {activeArticle ? (
        <main className="pb-32 pb-safe">
          {/* Barra Minimalista do Leitor */}
          <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between gap-2 border-b border-border/60">
            <button
              type="button"
              onClick={() => openArticleView(null)}
              className="h-11 min-h-11 px-3 rounded-full border border-border bg-muted/30 hover:bg-muted inline-flex items-center gap-2 text-xs font-bold text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="size-4" />
              <span>Voltar</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStudioArticle(activeArticle)}
                className="size-11 min-h-11 rounded-full border border-border bg-muted/30 hover:bg-muted flex items-center justify-center text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Gerar post PNG desta reportagem"
              >
                <Layers className="size-4" />
              </button>

              <button
                type="button"
                onClick={() => handleShareArticle(activeArticle)}
                className="size-11 min-h-11 rounded-full border border-border bg-muted/30 hover:bg-muted flex items-center justify-center text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Compartilhar matéria"
              >
                <Share2 className="size-4" />
              </button>

              <button
                type="button"
                onClick={() =>
                  setSavedIds((p) => ({ ...p, [activeArticle.id]: !p[activeArticle.id] }))
                }
                className={`size-11 min-h-11 rounded-full border flex items-center justify-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  savedIds[activeArticle.id]
                    ? "bg-foreground text-background border-foreground"
                    : "border-border bg-muted/30 hover:bg-muted text-foreground"
                }`}
                aria-label="Salvar matéria"
              >
                <Bookmark className="size-4" />
              </button>
            </div>
          </div>

          <article className="mx-auto max-w-3xl px-4 pt-6 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-foreground text-background text-xs font-bold">
                  {activeArticle.category}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {activeArticle.city} · {activeArticle.publishedDateLabel}
                </span>
                <span className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  <span>{activeArticle.readingTime}</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground leading-tight text-anti-truncate">
                {activeArticle.title}
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed text-anti-truncate">
                {activeArticle.lead}
              </p>

              <div className="text-xs font-semibold text-muted-foreground">
                Por <strong className="text-foreground">{activeArticle.author}</strong> ·{" "}
                {activeArticle.role}
              </div>
            </div>

            {showReaderSummary && (
              <div className="rounded-3xl border border-border bg-muted/30 p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-foreground">
                  <Sparkles className="size-4" />
                  <span>Síntese Editorial</span>
                </div>
                <ul className="space-y-2">
                  {activeArticle.bulletSummary.map((item, idx) => (
                    <li key={idx} className="text-sm text-foreground leading-relaxed">
                      <strong>•</strong> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Capa Fotográfica Real da Notícia */}
            {activeArticle.coverImageUrl && (
              <figure className="overflow-hidden rounded-3xl border border-border bg-muted">
                <img
                  src={activeArticle.coverImageUrl}
                  alt={activeArticle.title}
                  className="w-full aspect-video object-cover"
                />
              </figure>
            )}

            <div className="space-y-4">
              {activeArticle.body.map((paragraph, idx) => (
                <React.Fragment key={idx}>
                  <p className="text-base text-foreground/90 leading-relaxed whitespace-pre-line break-words">
                    {paragraph}
                  </p>

                  {idx === 0 && activeArticle.quote && activeArticle.quote !== activeArticle.title && (
                    <blockquote className="rounded-2xl border-l-4 border-foreground bg-muted/30 p-4 text-base font-semibold text-foreground leading-relaxed">
                      “{activeArticle.quote}”
                    </blockquote>
                  )}

                  {idx === 1 && (
                    <EditorialAdSlot
                      placementZone="article_inline_mid"
                      storeId=""
                      articleId={activeArticle.id}
                      viewerCity={activeArticle.city}
                      category={activeArticle.category}
                      className="my-4"
                    />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Rodapé Comercial Auditável */}
            <EditorialAdSlot
              placementZone="article_footer_cta"
              storeId=""
              articleId={activeArticle.id}
              viewerCity={activeArticle.city}
              category={activeArticle.category}
              className="my-4"
            />

            {/* Comentários Reais */}
            <section id="news-reader-comments" className="pt-6 border-t border-border space-y-4">
              <h2 className="text-lg font-bold text-foreground">Comentários</h2>

              <form onSubmit={handleSendComment} className="flex items-center gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Participe da conversa com respeito..."
                  className="h-11 min-h-11 flex-1 rounded-full border border-border bg-card px-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="submit"
                  className="size-11 min-h-11 shrink-0 rounded-full bg-foreground text-background hover:bg-foreground/90 flex items-center justify-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Publicar comentário"
                >
                  <Send className="size-4" />
                </button>
              </form>

              {comments.length > 0 && (
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
          </article>

          {/* Barra Inferior Flutuante Discreta (z-30 < z-50 de Modais) */}
          <div className="fixed bottom-4 inset-x-0 z-30 flex justify-center px-4 pointer-events-none">
            <div className="pointer-events-auto rounded-full border border-border bg-background/95 backdrop-blur-md px-3 py-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setLikedIds((p) => ({ ...p, [activeArticle.id]: !p[activeArticle.id] }))
                }
                className={`h-11 min-h-11 px-4 rounded-full inline-flex items-center gap-2 text-xs font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  likedIds[activeArticle.id]
                    ? "bg-foreground text-background"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <Heart className="size-4" />
                <span>{activeArticle.likesCount + (likedIds[activeArticle.id] ? 1 : 0)}</span>
              </button>

              <a
                href="#news-reader-comments"
                className="h-11 min-h-11 px-4 rounded-full inline-flex items-center gap-2 text-xs font-bold text-foreground hover:bg-muted transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MessageCircle className="size-4" />
                <span>{comments.length + activeArticle.commentsCount}</span>
              </a>

              <button
                type="button"
                onClick={() => setShowReaderSummary((p) => !p)}
                className={`h-11 min-h-11 px-4 rounded-full inline-flex items-center gap-2 text-xs font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  showReaderSummary
                    ? "bg-foreground text-background"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <Sparkles className="size-4" />
                <span>Síntese</span>
              </button>
            </div>
          </div>
        </main>
      ) : (
        <main className="mx-auto max-w-6xl px-4 py-5 space-y-6">
          {/* ── BILLBOARD HERO BANNERS DO ADMIN MASTER ── */}
          {billboardBanners.length > 0 && selectedTab === "Para você" && !searchQuery && (
            <section aria-label="Banners e Destaques" className="space-y-3">
              <div className="overflow-hidden rounded-3xl border border-border bg-card">
                <a
                  href={billboardBanners[0].target_url || "#"}
                  target={billboardBanners[0].target_url?.startsWith("http") ? "_blank" : undefined}
                  rel={billboardBanners[0].target_url?.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="block relative aspect-video md:aspect-[21/9] w-full bg-muted overflow-hidden group"
                >
                  <img
                    src={billboardBanners[0].media_url}
                    alt={billboardBanners[0].title || "Destaque"}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  {billboardBanners[0].badge_text && (
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-background/90 text-foreground text-xs font-bold border border-border/40">
                      {billboardBanners[0].badge_text}
                    </span>
                  )}
                  {billboardBanners[0].show_title && billboardBanners[0].title && (
                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 bg-background/90">
                      <h3 className="text-base sm:text-2xl font-bold text-foreground">
                        {billboardBanners[0].title}
                      </h3>
                      {billboardBanners[0].subtitle && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          {billboardBanners[0].subtitle}
                        </p>
                      )}
                    </div>
                  )}
                </a>
              </div>
            </section>
          )}

          {/* ── BARRA DE INTELIGÊNCIA REGIONAL (CIDADES VIZINHAS DA MICRO/MACRORREGIÃO) ── */}
          <div className="flex items-center gap-2 overflow-x-auto waesy-tab-strip py-1 scroll-smooth">
            <span className="text-xs font-bold text-muted-foreground shrink-0 uppercase tracking-wider pl-1">
              Cidades da Região:
            </span>
            <button
              type="button"
              onClick={() => setSelectedCity("Todas as Cidades")}
              className={`h-9 min-h-9 px-4 rounded-full text-xs font-semibold shrink-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                selectedCity === "Todas as Cidades"
                  ? "bg-foreground text-background font-bold"
                  : "border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Todas as Cidades
            </button>
            {neighboringCities.map((c) => {
              const isCurrent = selectedCity.toLowerCase() === c.name.toLowerCase();
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCity(c.name)}
                  className={`h-9 min-h-9 px-4 rounded-full text-xs font-semibold shrink-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isCurrent
                      ? "bg-foreground text-background font-bold"
                      : "border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>

          {/* ── CARROSSEL BREAKING NEWS COM CAPAS REAIS ── */}
          {breakingArticles.length > 0 && selectedTab === "Para você" && !searchQuery && (
            <section aria-label="Plantão Regional" className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-foreground text-background text-xs font-extrabold uppercase tracking-wider">
                    <Flame className="size-3" />
                    <span>BREAKING NEWS</span>
                  </span>
                  <h2 className="text-sm sm:text-base font-bold text-foreground">
                    Plantão Regional
                  </h2>
                </div>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  Deslize para ver mais →
                </span>
              </div>

              <div className="waesy-tab-strip flex flex-nowrap items-stretch gap-3 pb-2 pt-1 scroll-smooth snap-x snap-mandatory">
                {breakingArticles.map((art) => (
                  <button
                    key={art.id}
                    type="button"
                    onClick={() => openArticleView(art)}
                    className="w-72 sm:w-80 shrink-0 snap-start rounded-3xl border border-border bg-card hover:bg-muted/30 p-3 text-left flex flex-col justify-between gap-3 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {art.coverImageUrl && (
                      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-muted">
                        <img
                          src={art.coverImageUrl}
                          alt={art.title}
                          loading="lazy"
                          className="size-full object-cover"
                        />
                        <span className="absolute bottom-2 left-2 px-3 py-1 rounded-full bg-background/90 text-foreground text-xs font-bold border border-border/40">
                          {art.category}
                        </span>
                      </div>
                    )}

                    <div className="space-y-2">
                      {!art.coverImageUrl && (
                        <span className="inline-block px-3 py-1 rounded-full border border-border bg-muted/40 text-xs font-bold text-foreground">
                          {art.category} · {art.city}
                        </span>
                      )}
                      <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2">
                        {art.title}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                      <span>{art.city}</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        <span>{art.publishedAgo}</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ── GRID BIDIRECIONAL: FEED MOBILE-FIRST + COLUNA CONTEXTUAL DESKTOP ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Stream Principal (Estilo Threads / Prométhée) */}
            <section aria-label="Notícias" className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                    {selectedTab === "Para você" ? "Destaques" : selectedTab}
                  </h2>
                  {selectedCity !== "Todas as Cidades" && (
                    <button
                      type="button"
                      onClick={() => setSelectedCity("Todas as Cidades")}
                      className="h-8 px-3 rounded-full border border-border bg-muted/30 hover:bg-muted text-xs font-semibold text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {selectedCity} · Ver todas
                    </button>
                  )}
                </div>

                {/* Alternador de Modo de Visualização: Stream vs Grid */}
                <div className="flex items-center rounded-full border border-border bg-muted/30 p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("stream")}
                    className={`size-8 rounded-full flex items-center justify-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      viewMode === "stream"
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Visualização em Lista / Stream"
                    aria-label="Visualização em Lista / Stream"
                  >
                    <List className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`size-8 rounded-full flex items-center justify-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      viewMode === "grid"
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Visualização em Grade"
                    aria-label="Visualização em Grade"
                  >
                    <LayoutGrid className="size-4" />
                  </button>
                </div>
              </div>

              {initialLoadError ? (
                <div className="rounded-3xl border border-destructive/30 bg-card p-8 text-center space-y-3">
                  <div className="size-12 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
                    <Newspaper className="size-5 text-destructive" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">Notícias indisponíveis</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">Não foi possível carregar as matérias agora.</p>
                </div>
              ) : feedArticles.length === 0 ? (
                <div className="rounded-3xl border border-border bg-card p-8 text-center space-y-3">
                  <div className="size-12 rounded-2xl border border-border bg-muted/30 flex items-center justify-center mx-auto">
                    <Newspaper className="size-5 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">Sem matérias neste filtro</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Limpe a busca ou alterne a cidade para visualizar todas as reportagens apuradas.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCity("Todas as Cidades");
                      setSelectedTab("Para você");
                      setSearchQuery("");
                    }}
                    className="h-11 min-h-11 px-5 rounded-full bg-foreground text-background hover:bg-foreground/90 text-xs font-bold inline-flex items-center justify-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Mostrar todas as cidades
                  </button>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {feedArticles.map((art, index) => {
                    return (
                      <article
                        key={art.id}
                        className="rounded-3xl border border-border bg-card p-4 sm:p-5 flex flex-col justify-between gap-3 hover:border-foreground/30 transition-colors duration-200"
                      >
                        <div className="space-y-3">
                          {art.coverImageUrl && (
                            <button
                              type="button"
                              onClick={() => openArticleView(art)}
                              className="relative aspect-video w-full overflow-hidden rounded-2xl bg-muted block text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <img
                                src={art.coverImageUrl}
                                alt={art.title}
                                loading={index < 4 ? "eager" : "lazy"}
                                className="size-full object-cover"
                              />
                              <span className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-background/90 text-foreground text-xs font-bold border border-border/40">
                                {art.category}
                              </span>
                            </button>
                          )}

                          <div className="space-y-2">
                            {!art.coverImageUrl && (
                              <span className="inline-block px-2 py-1 rounded-full border border-border bg-muted/40 text-xs font-bold text-foreground">
                                {art.category} · {art.city}
                              </span>
                            )}
                            <h3
                              onClick={() => openArticleView(art)}
                              className="text-base sm:text-lg font-bold text-foreground leading-snug line-clamp-2 cursor-pointer hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
                            >
                              {art.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                              {art.lead}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground truncate max-w-32">{art.city}</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setStudioArticle(art)}
                              className="size-8 rounded-full border border-border bg-muted/30 hover:bg-muted flex items-center justify-center text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              title="Gerar post PNG"
                            >
                              <Layers className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openArticleView(art)}
                              className="h-8 px-3 rounded-full bg-foreground text-background hover:bg-foreground/90 font-bold text-xs inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              Ler
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                feedArticles.map((art, index) => {
                  const isLiked = Boolean(likedIds[art.id]);
                  const isSaved = Boolean(savedIds[art.id]);

                  return (
                    <React.Fragment key={art.id}>
                      {index === 1 && !searchQuery && selectedTab === "Para você" && (
                        <PrometheeTrendingMarkerStrip
                          onSelectTopic={(topic) => {
                            setSelectedTab("Para você");
                            setSearchQuery(topic.tag);
                          }}
                        />
                      )}
                      <article className="rounded-3xl border border-border bg-card p-4 sm:p-5 space-y-4">
                        {/* Foto Real de Capa (Omitida Honestamente quando ausente) */}
                        {art.coverImageUrl ? (
                          <button
                            type="button"
                            onClick={() => openArticleView(art)}
                            className="relative aspect-video w-full overflow-hidden rounded-2xl bg-muted block text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <img
                              src={art.coverImageUrl}
                              alt={art.title}
                              loading={index < 2 ? "eager" : "lazy"}
                              className="size-full object-cover"
                            />
                            <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-background/90 text-foreground text-xs font-bold">
                              {art.category}
                            </span>
                            <span className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-background/90 text-foreground text-xs font-semibold inline-flex items-center gap-1">
                              <Clock className="size-3" />
                              <span>{art.publishedAgo}</span>
                            </span>
                          </button>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-3 py-1 rounded-full border border-border bg-muted/40 text-xs font-bold text-foreground">
                              {art.category} · {art.city}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
                              <Clock className="size-3" />
                              <span>{art.publishedAgo}</span>
                            </span>
                          </div>
                        )}

                        <div className="space-y-2">
                          {art.coverImageUrl && (
                            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                              <span>{art.city}</span>
                              <span>·</span>
                              <span>{art.readingTime}</span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => openArticleView(art)}
                            className="text-left block w-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <h3 className="text-lg sm:text-xl font-extrabold text-foreground leading-snug text-anti-truncate">
                              {art.title}
                            </h3>
                          </button>

                          <p className="text-sm text-muted-foreground leading-relaxed text-anti-truncate">
                            {art.lead}{" "}
                            <button
                              type="button"
                              onClick={() => openArticleView(art)}
                              className="inline font-bold text-foreground underline underline-offset-4 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                            >
                              Ler mais
                            </button>
                          </p>
                        </div>

                        {/* Barra Minimalista de Interação */}
                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setLikedIds((p) => ({ ...p, [art.id]: !p[art.id] }))
                              }
                              className={`h-11 min-h-11 px-3 rounded-full inline-flex items-center gap-1 text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                isLiked
                                  ? "bg-foreground text-background"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                              }`}
                              aria-label="Curtir notícia"
                            >
                              <Heart className="size-4" />
                              <span>{art.likesCount + (isLiked ? 1 : 0)}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openArticleView(art)}
                              className="h-11 min-h-11 px-3 rounded-full inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label="Comentários"
                            >
                              <MessageCircle className="size-4" />
                              <span>{art.commentsCount}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleShareArticle(art)}
                              className="size-11 min-h-11 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label="Compartilhar notícia"
                            >
                              <Share2 className="size-4" />
                            </button>

                            {shareCopiedId === art.id && (
                              <span className="text-xs font-semibold text-foreground px-1">
                                Link copiado
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setStudioArticle(art)}
                              className="size-11 min-h-11 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label="Gerar post PNG desta notícia"
                            >
                              <Layers className="size-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setSavedIds((p) => ({ ...p, [art.id]: !p[art.id] }))
                              }
                              className={`size-11 min-h-11 rounded-full inline-flex items-center justify-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                isSaved
                                  ? "bg-foreground text-background"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                              }`}
                              aria-label="Salvar notícia"
                            >
                              <Bookmark className="size-4" />
                            </button>
                          </div>
                        </div>
                      </article>

                      {/* Slot Publicitário Regional ADS Integrado à Rede de Display */}
                      {index === 1 && (
                        <EditorialAdSlot
                          placementZone="feed_in_stream"
                          storeId=""
                          viewerCity={selectedCity !== "Todas as Cidades" ? selectedCity : undefined}
                          category={selectedTab !== "Para você" && selectedTab !== "Salvos" ? selectedTab : undefined}
                        />
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </section>

            {/* Coluna Contextual Desktop (Produtividade Editorial & Monetização) */}
            <aside className="hidden lg:flex lg:col-span-4 flex-col gap-4 sticky top-24">
              {/* Filtro Rápido por Município */}
              <div className="rounded-3xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">Radar por Cidade</h3>
                  <button
                    type="button"
                    onClick={() => setIsLocationOpen(true)}
                    className="h-11 min-h-11 px-3 rounded-full text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    GPS
                  </button>
                </div>

                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCity("Todas as Cidades")}
                    className={`h-11 min-h-11 w-full px-3 rounded-2xl flex items-center justify-between text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      selectedCity === "Todas as Cidades"
                        ? "bg-foreground text-background"
                        : "text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <span>Todas as Cidades</span>
                    <span>{normalizedArticles.length}</span>
                  </button>

                  {activeCitiesSummary.map(([cityName, count]) => (
                    <button
                      key={cityName}
                      type="button"
                      onClick={() => setSelectedCity(cityName)}
                      className={`h-11 min-h-11 w-full px-3 rounded-2xl flex items-center justify-between text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        selectedCity.toLowerCase() === cityName.toLowerCase()
                          ? "bg-foreground text-background"
                          : "text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <span>{cityName}</span>
                      <span>{count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Atalho Estúdio de Posts PNG */}
              <div className="rounded-3xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  <Layers className="size-4 text-foreground" />
                  <span>Estúdio Editorial</span>
                </div>
                <h3 className="text-base font-bold text-foreground leading-snug">
                  Transforme qualquer notícia em Post ou Carrossel PNG
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Selecione uma matéria real do portal e baixe a arte pronta com foto de capa em 1080×1350 ou Stories.
                </p>
                <button
                  type="button"
                  onClick={() => setStudioArticle(normalizedArticles[0] || null)}
                  className="h-11 min-h-11 w-full px-4 rounded-2xl border border-border bg-muted/40 hover:bg-muted text-xs font-bold text-foreground inline-flex items-center justify-center gap-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Layers className="size-4" />
                  <span>Abrir Estúdio PNG</span>
                </button>
              </div>

              {/* Espaço de Display Editorial na Lateral */}
              <EditorialAdSlot
                placementZone="sidebar_sticky"
                storeId=""
                viewerCity={selectedCity !== "Todas as Cidades" ? selectedCity : undefined}
              />

              {/* Banners Verticais / Quadrados do Admin Master */}
              {squareBanners.length > 0 && (
                <div className="space-y-3">
                  {squareBanners.slice(0, 2).map((banner) => (
                    <a
                      key={banner.id}
                      href={banner.target_url || "#"}
                      target={banner.target_url?.startsWith("http") ? "_blank" : undefined}
                      rel={banner.target_url?.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="block overflow-hidden rounded-3xl border border-border bg-card hover:opacity-95 transition-opacity"
                    >
                      <div className="relative aspect-square w-full bg-muted">
                        <img
                          src={banner.media_url}
                          alt={banner.title || "Anúncio"}
                          loading="lazy"
                          className="size-full object-cover"
                        />
                        <span className="absolute top-3 left-3 px-2 py-1 rounded-full bg-background/90 text-foreground text-xs font-bold border border-border/40">
                          {banner.badge_text || "Destaque"}
                        </span>
                      </div>
                      {banner.title && (
                        <div className="p-3 space-y-1">
                          <h4 className="text-xs font-bold text-foreground truncate">{banner.title}</h4>
                          {banner.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">{banner.subtitle}</p>
                          )}
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              )}

              {verticalBanners.length > 0 && (
                <div className="space-y-3">
                  {verticalBanners.slice(0, 1).map((banner) => (
                    <a
                      key={banner.id}
                      href={banner.target_url || "#"}
                      target={banner.target_url?.startsWith("http") ? "_blank" : undefined}
                      rel={banner.target_url?.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="block overflow-hidden rounded-3xl border border-border bg-card hover:opacity-95 transition-opacity"
                    >
                      <div className="relative aspect-[4/5] w-full bg-muted">
                        <img
                          src={banner.media_url}
                          alt={banner.title || "Anúncio"}
                          loading="lazy"
                          className="size-full object-cover"
                        />
                        <span className="absolute top-3 left-3 px-2 py-1 rounded-full bg-background/90 text-foreground text-xs font-bold border border-border/40">
                          {banner.badge_text || "Publicidade"}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </main>
      )}

      {/* ── 4. RODAPÉ SUTIL COM ASSINATURA DISCRETA "Feito com Waesy" ── */}
      <footer className="border-t border-border/70 bg-background mt-12 py-8">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
            <strong className="font-bold text-foreground">Waesynews</strong>
            <span>·</span>
            <span>Showcase Demonstrativo de Portal Editorial</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="/"
              className="h-11 min-h-11 px-2 inline-flex items-center gap-2 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>Feito com</span>
              <Logo src="/brand-logo.png" className="h-4 w-auto opacity-80" />
            </a>
          </div>
        </div>
      </footer>

      {/* ── 5. SELETOR DE CIDADE & GPS SISTÊMICO WAESY ── */}
      <PrometheeLocationSheet
        isOpen={isLocationOpen}
        selectedCity={selectedCity}
        allCitiesLabel="Todas as Cidades"
        onSelectCity={(city) => setSelectedCity(city)}
        onClose={() => setIsLocationOpen(false)}
      />

      {/* ── 5.1 EXPLORE & BUSCA ESTILO THREADS / X COM MARCA-TEXTO ── */}
      <PrometheeExploreSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        articles={normalizedArticles}
        onSelectArticle={(art) => openArticleView(art)}
        onSelectCity={(city) => setSelectedCity(city)}
        onSelectSearchQuery={(q) => setSearchQuery(q)}
        initialQuery={searchQuery}
      />

      {/* ── 6. ESTÚDIO REAL DE POSTS & CARROSSÉIS PNG ── */}
      <PrometheeNewsStudioModal
        isOpen={Boolean(studioArticle)}
        initialArticle={studioArticle}
        availableArticles={normalizedArticles}
        brandName="Waesynews"
        portalDomainLabel="waesynews.com.br"
        onClose={() => setStudioArticle(null)}
      />

      {/* ── 7. CANAL PARTICIPATIVO (+) FULLSCREEN MOBILE ── */}
      {isCitizenOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Enviar Pauta"
          className="fixed inset-0 z-50 bg-overlay backdrop-blur-xs flex items-stretch sm:items-center justify-center p-0 sm:p-4"
        >
          <div className="w-full h-dvh sm:h-auto sm:max-h-dvh sm:max-w-lg bg-background text-foreground sm:rounded-3xl border-0 sm:border sm:border-border flex flex-col overflow-hidden safe-top safe-bottom">
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-border shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-foreground">Enviar Pauta</h2>
              <button
                type="button"
                onClick={() => setIsCitizenOpen(false)}
                className="size-11 min-h-11 shrink-0 rounded-full border border-border bg-muted/30 hover:bg-muted flex items-center justify-center text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Fechar envio de pauta"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handlePublishCitizenPost} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Envie ocorrências, trânsito, fotos ou sugestões da sua cidade diretamente para a redação.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="cit-name" className="block text-xs font-bold text-muted-foreground">
                    Seu nome
                  </label>
                  <input
                    id="cit-name"
                    type="text"
                    value={citAuthor}
                    onChange={(e) => setCitAuthor(e.target.value)}
                    placeholder="Ex: Ana Paula"
                    className="h-11 min-h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="cit-city" className="block text-xs font-bold text-muted-foreground">
                    Cidade
                  </label>
                  <select
                    id="cit-city"
                    value={citCity}
                    onChange={(e) => setCitCity(e.target.value)}
                    className="h-11 min-h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {CANONICAL_CITIES.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="cit-cat" className="block text-xs font-bold text-muted-foreground">
                  Editoria
                </label>
                <select
                  id="cit-cat"
                  value={citCategory}
                  onChange={(e) => setCitCategory(e.target.value)}
                  className="h-11 min-h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {["Urgente", "Segurança", "Política", "Economia", "Esportes", "Cultura"].map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="cit-title" className="block text-xs font-bold text-muted-foreground">
                  Título curto
                </label>
                <input
                  id="cit-title"
                  required
                  type="text"
                  value={citTitle}
                  onChange={(e) => setCitTitle(e.target.value)}
                  placeholder="Resumo direto do acontecimento"
                  className="h-11 min-h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="cit-body" className="block text-xs font-bold text-muted-foreground">
                  Detalhes da ocorrência
                </label>
                <textarea
                  id="cit-body"
                  required
                  rows={4}
                  value={citBody}
                  onChange={(e) => setCitBody(e.target.value)}
                  placeholder="Descreva local, horário e o que está acontecendo..."
                  className="w-full rounded-2xl border border-border bg-card p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <button
                type="submit"
                className="h-11 min-h-11 w-full px-4 rounded-2xl bg-foreground text-background hover:bg-foreground/90 text-sm font-bold flex items-center justify-center gap-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Send className="size-4" />
                <span>Publicar no Portal</span>
              </button>
            </form>
          </div>
        </div>
      )}

          </div>
  );
}
