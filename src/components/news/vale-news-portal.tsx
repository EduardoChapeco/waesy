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
import { CANONICAL_CITIES } from "@/lib/constants/cities";
import { Logo } from "@/components/commerce/logo";

export interface WaesyNewsPortalProps {
  initialArticles?: NewsArticleDTO[];
  initialSponsors?: SponsorDTO[];
}

export type ValeNewsPortalProps = WaesyNewsPortalProps;

interface PortalComment {
  id: string;
  authorName: string;
  contentText: string;
  createdAtLabel: string;
}

const OFFLINE_TEST_FALLBACK_ARTICLES: NormalizedPrometheeArticle[] = [
  {
    id: "fallback-sjc-1",
    slug: "parque-tecnologico-sjc-expansao-aeroespacial",
    title: "Parque Tecnológico de São José dos Campos amplia polo de engenharia aeroespacial",
    lead: "Novos laboratórios compartilhados conectam indústria regional, universidades e fornecedores especializados no Vale do Paraíba.",
    body: [
      "O complexo tecnológico de São José dos Campos oficializou a ampliação de sua área dedicada a sistemas embarcados e mobilidade limpa.",
      "Empresas instaladas no corredor da Via Dutra destacam a abertura de frentes técnicas para engenheiros, analistas de dados e especialistas industriais.",
    ],
    bulletSummary: [
      "Ampliação de laboratórios integrados em São José dos Campos.",
      "Conexão direta entre universidades e cadeia aeroespacial do Vale.",
    ],
    quote: "A integração regional acelera projetos industriais de alto valor agregado no Vale do Paraíba.",
    category: "Economia",
    city: "São José dos Campos",
    state: "SP",
    publishedAgo: "15min",
    publishedDateLabel: "Edição atual",
    readingTime: "4 min",
    author: "Redação Vale Agora",
    role: "Apuração Regional",
    isBreaking: true,
    likesCount: 48,
    commentsCount: 11,
    coverImageUrl: null,
  },
  {
    id: "fallback-taubate-2",
    slug: "integracao-viaria-taubate-jacarei",
    title: "Central integrada reduz tempo de atendimento viário entre Taubaté e Jacareí",
    lead: "Monitoramento óptico em tempo real agiliza alertas operacionais nos acessos urbanos e rodoviários da região.",
    body: [
      "Equipes municipais de trânsito passaram a operar com compartilhamento instantâneo de ocorrências nos horários de maior fluxo.",
      "Motoristas recebem orientação preventiva nos painéis eletrônicos e canais comunitários verificados.",
    ],
    bulletSummary: [
      "Monitoramento integrado nos corredores urbanos.",
      "Redução no tempo médio de resposta operacional.",
    ],
    quote: "Informação rápida salva tempo do trabalhador e evita retenções prolongadas.",
    category: "Segurança",
    city: "Taubaté",
    state: "SP",
    publishedAgo: "34min",
    publishedDateLabel: "Edição atual",
    readingTime: "3 min",
    author: "Editoria Cidades",
    role: "Plantão Viário",
    isBreaking: true,
    likesCount: 31,
    commentsCount: 7,
    coverImageUrl: null,
  },
];

const PROPOSAL_WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Radar Regional 24h",
    description:
      "O sistema monitora fontes oficiais, prefeituras, rodovias e pautas das cidades da região continuamente.",
    icon: Radar,
  },
  {
    step: "02",
    title: "Squads de Jornalismo",
    description:
      "Células editoriais organizam o fato com título limpo, resumo direto, foto real da pauta e classificação por município.",
    icon: Users,
  },
  {
    step: "03",
    title: "Aprovação em 1 Toque",
    description:
      "Nada entra no ar no escuro: o editor revisa no celular ou computador, ajusta se quiser e aprova com segurança.",
    icon: ShieldCheck,
  },
  {
    step: "04",
    title: "Portal + Artes Sociais",
    description:
      "A notícia entra no portal na hora e já vira card PNG ou carrossel pronto para engajar no Instagram e WhatsApp.",
    icon: Layers,
  },
] as const;

const PROPOSAL_DELIVERABLES = [
  {
    icon: LayoutTemplate,
    tag: "Construtor Omni",
    title: "Portal Próprio Personalizável",
    description:
      "Site mobile-first inspirado na leveza do Threads e dos grandes portais modernos, com blocos individuais editáveis: topo, menu, plantão, feed, banners e rodapé.",
  },
  {
    icon: Globe,
    tag: "Workspace",
    title: "Painel Completo de Gestão",
    description:
      "Ambiente administrativo exclusivo para comandar matérias, páginas especiais, pautas enviadas por moradores, contatos comerciais e equipe em um único painel.",
  },
  {
    icon: MapPin,
    tag: "Motor ADS",
    title: "Publicidade por Localização",
    description:
      "Venda espaços publicitários segmentados por cidade. O leitor filtra sua cidade via GPS e visualiza os anunciantes locais, com relatório transparente de impressões e cliques.",
  },
  {
    icon: Calendar,
    tag: "Monetização Extra",
    title: "Eventos e Especiais Patrocinados",
    description:
      "Publique agendas regionais, coberturas de eventos, guias gastronômicos e cadernos patrocinados para criar novas fontes recorrentes de receita comercial.",
  },
  {
    icon: BarChart3,
    tag: "Inteligência",
    title: "Painel de Dados e Audiência",
    description:
      "Acompanhe leituras, matérias campeãs, cidades mais ativas e desempenho de cada patrocinador com números claros para apresentar em reuniões comerciais.",
  },
  {
    icon: Radar,
    tag: "Produtividade",
    title: "Mineração e Squads Editoriais",
    description:
      "Mantenha o portal vivo o dia inteiro mesmo com equipe enxuta: captação automatizada de pautas regionais combinada à estruturação jornalística e revisão humana.",
  },
  {
    icon: Layers,
    tag: "Redes Sociais",
    title: "Criador de Posts e Carrosséis",
    description:
      "Escolha qualquer reportagem publicada no portal e gere na hora imagens PNG em alta definição (Post Único 4:5, Stories 9:16 ou Carrossel de 4 lâminas).",
    roadmapNote: "Evolução inclusa em até 6 meses: publicação automática direta no Instagram.",
  },
  {
    icon: ShieldCheck,
    tag: "Chave na Mão",
    title: "Domínio, Hospedagem e Suporte",
    description:
      "Entrega configurada no seu domínio próprio, infraestrutura rápida de alta disponibilidade e acompanhamento próximo da nossa equipe para sua operação tracionar.",
  },
] as const;

export function WaesyNewsPortal({
  initialArticles = [],
  initialSponsors = [],
}: WaesyNewsPortalProps) {
  const [selectedCity, setSelectedCity] = useState<string>("Todas as Cidades");
  const [selectedTab, setSelectedTab] = useState<string>("Para você");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isLocationOpen, setIsLocationOpen] = useState<boolean>(false);
  const [isCitizenOpen, setIsCitizenOpen] = useState<boolean>(false);
  const [isProposalOpen, setIsProposalOpen] = useState<boolean>(false);
  const [studioArticle, setStudioArticle] = useState<NormalizedPrometheeArticle | null>(null);
  const [activeArticle, setActiveArticle] = useState<NormalizedPrometheeArticle | null>(null);
  const [showReaderSummary, setShowReaderSummary] = useState<boolean>(false);

  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [shareCopiedId, setShareCopiedId] = useState<string | null>(null);
  const [citizenArticles, setCitizenArticles] = useState<NormalizedPrometheeArticle[]>([]);

  // Campos envio de pauta (+)
  const [citAuthor, setCitAuthor] = useState("");
  const [citCity, setCitCity] = useState("São José dos Campos");
  const [citCategory, setCitCategory] = useState("Urgente");
  const [citTitle, setCitTitle] = useState("");
  const [citBody, setCitBody] = useState("");

  // Comentários do leitor
  const [comments, setComments] = useState<PortalComment[]>([]);
  const [commentText, setCommentText] = useState("");

  const normalizedArticles = useMemo<NormalizedPrometheeArticle[]>(() => {
    const dbNormalized = initialArticles.map((item, idx) => normalizePrometheeArticle(item, idx));
    const basePool = dbNormalized.length > 0 ? dbNormalized : OFFLINE_TEST_FALLBACK_ARTICLES;
    return [...citizenArticles, ...basePool];
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
      if (params.get("proposta") === "1") {
        setIsProposalOpen(true);
      }
    }
  }, []);

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
        authorName: "Leitor do Vale",
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

  const regionalCities = useMemo(
    () =>
      CANONICAL_CITIES.filter(
        (c) =>
          c.region.includes("Vale") ||
          c.region.includes("Litoral") ||
          c.region.includes("Mantiqueira"),
      ),
    [],
  );

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
              className="size-11 md:w-auto md:px-4 min-h-11 rounded-full border border-border bg-muted/30 hover:bg-muted flex items-center justify-center gap-2 text-xs font-bold text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Criar Posts (PNG)"
            >
              <Layers className="size-4 shrink-0" />
              <span className="hidden md:inline">Criar Posts (PNG)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsProposalOpen(true)}
              className="size-11 md:w-auto md:px-4 min-h-11 rounded-full bg-foreground text-background hover:bg-foreground/90 flex items-center justify-center gap-2 text-xs font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Ver Proposta Comercial"
            >
              <FileText className="size-4 shrink-0" />
              <span className="hidden md:inline">Proposta</span>
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
            <section id="vale-reader-comments" className="pt-6 border-t border-border space-y-4">
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
                href="#vale-reader-comments"
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
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                  {selectedTab === "Para você" ? "Destaques" : selectedTab}
                </h2>
                {selectedCity !== "Todas as Cidades" && (
                  <button
                    type="button"
                    onClick={() => setSelectedCity("Todas as Cidades")}
                    className="h-11 min-h-11 px-4 rounded-full border border-border bg-muted/30 hover:bg-muted text-xs font-semibold text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {selectedCity} · Ver todas
                  </button>
                )}
              </div>

              {feedArticles.length === 0 ? (
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

              {/* Card Comercial da Plataforma */}
              <div className="rounded-3xl border border-border bg-muted/20 p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  <Megaphone className="size-4 text-foreground" />
                  <span>Modelo Comercial</span>
                </div>
                <h3 className="text-base font-bold text-foreground leading-snug">
                  Tenha um portal completo como este na sua região
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Construtor visual, radar de pautas, painel de anunciantes por cidade e acompanhamento completo.
                </p>
                <button
                  type="button"
                  onClick={() => setIsProposalOpen(true)}
                  className="h-11 min-h-11 w-full px-4 rounded-2xl bg-foreground text-background hover:bg-foreground/90 text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <FileText className="size-4" />
                  <span>Ver Proposta Completa</span>
                </button>
              </div>
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
            <button
              type="button"
              onClick={() => setIsProposalOpen(true)}
              className="h-11 min-h-11 px-3 rounded-full hover:bg-muted/40 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Proposta Comercial
            </button>

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
                  <label htmlFor="vale-cit-name" className="block text-xs font-bold text-muted-foreground">
                    Seu nome
                  </label>
                  <input
                    id="vale-cit-name"
                    type="text"
                    value={citAuthor}
                    onChange={(e) => setCitAuthor(e.target.value)}
                    placeholder="Ex: Ana Paula"
                    className="h-11 min-h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="vale-cit-city" className="block text-xs font-bold text-muted-foreground">
                    Cidade
                  </label>
                  <select
                    id="vale-cit-city"
                    value={citCity}
                    onChange={(e) => setCitCity(e.target.value)}
                    className="h-11 min-h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {regionalCities.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="vale-cit-cat" className="block text-xs font-bold text-muted-foreground">
                  Editoria
                </label>
                <select
                  id="vale-cit-cat"
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
                <label htmlFor="vale-cit-title" className="block text-xs font-bold text-muted-foreground">
                  Título curto
                </label>
                <input
                  id="vale-cit-title"
                  required
                  type="text"
                  value={citTitle}
                  onChange={(e) => setCitTitle(e.target.value)}
                  placeholder="Resumo direto do acontecimento"
                  className="h-11 min-h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="vale-cit-body" className="block text-xs font-bold text-muted-foreground">
                  Detalhes da ocorrência
                </label>
                <textarea
                  id="vale-cit-body"
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

      {/* ── 8. PROPOSTA COMERCIAL FULLSCREEN 100% MOBILE COM BOTÃO X DISCRETO ── */}
      {isProposalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Proposta Comercial"
          className="fixed inset-0 z-50 h-dvh w-screen bg-background text-foreground flex flex-col overflow-hidden safe-top safe-bottom"
        >
          {/* Barra Superior Limpa com Botão X Discreto */}
          <div className="border-b border-border bg-background/95 backdrop-blur-md shrink-0">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <PrometheeWireframeDomeLogo className="size-6 text-foreground shrink-0" />
                <span className="text-sm sm:text-base font-bold text-foreground">
                  Proposta Comercial · Waesynews
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsProposalOpen(false)}
                className="size-11 min-h-11 shrink-0 rounded-full border border-border bg-muted/30 hover:bg-muted flex items-center justify-center text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Fechar proposta"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Conteúdo Comercial Legível em Página Inteira */}
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12 space-y-12">
              {/* Bloco 1: Abertura Comercial Clara */}
              <section className="space-y-4 max-w-3xl">
                <span className="inline-block px-3 py-1 rounded-full border border-border bg-muted/40 text-xs font-bold uppercase tracking-wider text-foreground">
                  Ecossistema Editorial & Comercial
                </span>
                <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground leading-tight text-anti-truncate">
                  Seu Portal Regional Pronto
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  Entregamos uma plataforma jornalística completa, rápida e pensada para celular e computador, pronta para atrair audiência diária, posicionar sua marca regional e faturar com patrocinadores locais, eventos e especiais patrocinados.
                </p>
              </section>

              {/* Bloco 2: Diagrama Visual do Fluxo de Mineração + Squads Editoriais */}
              <section className="space-y-5">
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                    Como Funciona a Operação
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    Um fluxo diário enxuto que multiplica a capacidade da sua redação sem abrir mão do controle editorial humano.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {PROPOSAL_WORKFLOW_STEPS.map((item) => {
                    const StepIcon = item.icon;
                    return (
                      <div
                        key={item.step}
                        className="rounded-3xl border border-border bg-card p-5 flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="px-3 py-1 rounded-full bg-foreground text-background text-xs font-extrabold">
                              Etapa {item.step}
                            </span>
                            <StepIcon className="size-5 text-foreground shrink-0" />
                          </div>
                          <h3 className="text-base font-bold text-foreground leading-snug">
                            {item.title}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Bloco 3: As 8 Tecnologias Comerciais do Portal (Zero Badges Sobrepostos / Leitura Limpa) */}
              <section className="space-y-5">
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                    Tecnologias Inclusas no Portal
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    Toda a estrutura de gestão, personalização visual, dados e publicidade incluída na sua entrega.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PROPOSAL_DELIVERABLES.map((card, idx) => {
                    const CardIcon = card.icon;
                    return (
                      <div
                        key={idx}
                        className="rounded-3xl border border-border bg-card p-5 sm:p-6 flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-3 py-1 rounded-full border border-border bg-muted/40 text-xs font-bold text-foreground">
                              {card.tag}
                            </span>
                            <div className="size-10 rounded-2xl border border-border bg-muted/30 flex items-center justify-center shrink-0">
                              <CardIcon className="size-5 text-foreground" />
                            </div>
                          </div>

                          <h3 className="text-lg font-extrabold text-foreground leading-snug text-anti-truncate">
                            {card.title}
                          </h3>

                          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                            {card.description}
                          </p>
                        </div>

                        {"roadmapNote" in card && card.roadmapNote && (
                          <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-xs font-semibold text-foreground leading-relaxed">
                            {card.roadmapNote}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Bloco 4: Fases de Implantação e Habilitação Técnica */}
              <section className="space-y-5">
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                    Fases de Implantação e Habilitação
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    Processo estruturado para colocar seu portal no ar com máxima velocidade, identidade própria e monetização regional pronta.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Fase 1 */}
                  <div className="rounded-3xl border border-border bg-card p-6 flex flex-col justify-between gap-5">
                    <div className="space-y-3">
                      <span className="inline-block px-3 py-1 rounded-full border border-border bg-muted/40 text-xs font-bold text-foreground">
                        Fase 01
                      </span>
                      <div className="space-y-1">
                        <span className="text-xl sm:text-2xl font-black tracking-tight text-foreground block">
                          Domínio & Identidade
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground block">
                          Configuração técnica e BrandKit
                        </span>
                      </div>
                      <ul className="space-y-2 pt-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <Check className="size-4 text-foreground shrink-0 mt-1" />
                          <span>Portal no seu domínio com certificado SSL</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="size-4 text-foreground shrink-0 mt-1" />
                          <span>BrandKit personalizado (logo, fontes e paleta)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="size-4 text-foreground shrink-0 mt-1" />
                          <span>Mapeamento de editorias e cidades da região</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Fase 2 */}
                  <div className="rounded-3xl border-2 border-foreground bg-card p-6 flex flex-col justify-between gap-5">
                    <div className="space-y-3">
                      <span className="inline-block px-3 py-1 rounded-full bg-foreground text-background text-xs font-extrabold">
                        Fase 02
                      </span>
                      <div className="space-y-1">
                        <span className="text-xl sm:text-2xl font-black tracking-tight text-foreground block">
                          Display & Monetização
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground block">
                          Ad Server regional multi-zona
                        </span>
                      </div>
                      <ul className="space-y-2 pt-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <Check className="size-4 text-foreground shrink-0 mt-1" />
                          <span>Zonas IAB nativas no feed, leitor e topo</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="size-4 text-foreground shrink-0 mt-1" />
                          <span>Cadastro de patrocinadores com cliques e views</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="size-4 text-foreground shrink-0 mt-1" />
                          <span>Exclusividade por matéria e filtros por GPS</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Fase 3 */}
                  <div className="rounded-3xl border border-border bg-muted/20 p-6 flex flex-col justify-between gap-5">
                    <div className="space-y-3">
                      <span className="inline-block px-3 py-1 rounded-full border border-border bg-card text-xs font-bold text-foreground">
                        Fase 03
                      </span>
                      <div className="space-y-1">
                        <span className="text-xl sm:text-2xl font-black tracking-tight text-foreground block">
                          Redes & Operação
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground block">
                          Estúdio PNG e canais comunitários
                        </span>
                      </div>
                      <ul className="space-y-2 pt-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <Check className="size-4 text-foreground shrink-0 mt-1" />
                          <span>Estúdio de Posts PNG em HD (Feed e Stories)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="size-4 text-foreground shrink-0 mt-1" />
                          <span>Recepção de pautas e denúncias dos leitores</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="size-4 text-foreground shrink-0 mt-1" />
                          <span>Acompanhamento contínuo e atualizações</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Rodapé de Ação da Proposta */}
                <div className="rounded-3xl border border-border bg-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-bold text-foreground">
                      Pronto para testar os recursos ao vivo?
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Navegue pelo portal real, filtre por cidade e gere um post PNG de qualquer notícia agora mesmo.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProposalOpen(false);
                        setStudioArticle(normalizedArticles[0] || null);
                      }}
                      className="h-11 min-h-11 px-5 rounded-full border border-border bg-muted/40 hover:bg-muted text-xs sm:text-sm font-bold text-foreground inline-flex items-center justify-center gap-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Layers className="size-4" />
                      <span>Testar Estúdio PNG</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsProposalOpen(false)}
                      className="h-11 min-h-11 px-5 rounded-full bg-foreground text-background hover:bg-foreground/90 text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span>Explorar Portal</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <span>Tecnologia e acompanhamento por</span>
                  <Logo src="/brand-logo.png" className="h-4 w-auto opacity-80" />
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const ValeNewsPortal = WaesyNewsPortal;
