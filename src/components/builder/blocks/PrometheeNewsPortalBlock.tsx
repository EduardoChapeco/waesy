import React, { useMemo, useState } from "react";
import {
  Bell,
  Bookmark,
  Clock,
  Heart,
  MapPin,
  MessageCircle,
  Newspaper,
  Plus,
  Search,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import type {
  BaseSiteBlockProps,
  PrometheeNewsAdSlot,
  PrometheeNewsArticleItem,
  PrometheeNewsPortalBlockData,
} from "@/types/omni-builder";
import { getSectionStyle } from "../utils";

export interface PrometheeNewsPortalBlockProps extends BaseSiteBlockProps {
  data: PrometheeNewsPortalBlockData;
  isEditing?: boolean;
  products?: any[];
}

export function PrometheeWireframeDomeLogo({ className = "size-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Base arch and architectural dome wireframe inspired by Prométhée */}
      <path
        d="M8 52H56M12 52V36C12 22.7452 20.9543 12 32 12C43.0457 12 52 22.7452 52 36V52"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M32 6V12M20 52V36C20 24.9543 25.3726 12 32 12C38.6274 12 44 24.9543 44 36V52"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M28 52V36C28 24.9543 29.7909 12 32 12C34.2091 12 36 24.9543 36 36V52"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M14 28H50M12 38H52M12 46H52"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

const DEFAULT_FALLBACK_ARTICLES: PrometheeNewsArticleItem[] = [
  {
    id: "prom_art_1",
    title: "Corredor tecnológico de São José dos Campos recebe novo centro de engenharia aeroespacial",
    lead: "Investimento consolida cadeia de fornecedores do Parque Tecnológico e abre vagas de alta qualificação para engenheiros e técnicos no Vale do Paraíba.",
    body: "O Parque Tecnológico de São José dos Campos confirmou a expansão de sua ala de sistemas autônomos e propulsão limpa. Segundo o consórcio gestor, mais de 35 empresas fornecedoras da cadeia aeronáutica e de defesa já assinaram protocolo de integração.\n\nA operação prevê laboratórios compartilhados com universidades da região, acelerando a transferência de pesquisa aplicada para a indústria local.",
    category: "Economia",
    city: "São José dos Campos",
    publishedAgo: "15min",
    readingTime: "4 min",
    author: "Redação Regional",
    imageUrl: "",
    imageAlt: "Centro de engenharia no Parque Tecnológico",
    isBreaking: true,
    likesCount: 42,
    commentsCount: 14,
  },
  {
    id: "prom_art_2",
    title: "Monitoramento inteligente reduz tempo de resposta viária entre Taubaté e Jacareí",
    lead: "Integração de câmeras ópticas com central regional permite desvio preventivo de tráfego pesado e atendimento rápido em horários de pico.",
    body: "O novo protocolo de integração entre os centros de controle operacional das prefeituras do Vale reduziu em 28% o tempo médio de liberação de faixas urbanas e rodoviárias.\n\nA leitura automatizada de fluxo emite alertas diretos para equipes de apoio e painéis luminosos nos principais acessos.",
    category: "Segurança",
    city: "Taubaté",
    publishedAgo: "32min",
    readingTime: "3 min",
    author: "Editoria Cidades",
    imageUrl: "",
    imageAlt: "Central de monitoramento viário regional",
    isBreaking: true,
    likesCount: 29,
    commentsCount: 12,
  },
  {
    id: "prom_art_3",
    title: "Temporada gastronômica e cultural movimenta hotelaria na Serra da Mantiqueira e Litoral Norte",
    lead: "Roteiros integrados entre Campos do Jordão, Pindamonhangaba e Caraguatatuba registram alta procura por experiências regionais autênticas.",
    body: "Produtores locais, restaurantes e pousadas estruturaram um calendário unificado de eventos culturais e gastronômicos para os próximos meses.\n\nA iniciativa fortalece o turismo de curta distância e valoriza ingredientes certificados da Mantiqueira e da costa caiçara.",
    category: "Cultura",
    city: "Campos do Jordão",
    publishedAgo: "1h",
    readingTime: "5 min",
    author: "Caderno Regional",
    imageUrl: "",
    imageAlt: "Circuito cultural e gastronômico na Serra da Mantiqueira",
    isBreaking: false,
    likesCount: 64,
    commentsCount: 19,
  },
];

const DEFAULT_AD_SLOTS: PrometheeNewsAdSlot[] = [
  {
    id: "prom_ad_1",
    format: "banner",
    sponsorName: "Espaço Publicitário Regional · ADS",
    headline: "Posicione sua marca em destaque no feed editorial de maior leitura da região",
    description: "Formatos nativos Prométhée, banners horizontais e patrocínio de editorias por cidade.",
    ctaLabel: "Anunciar no Portal",
    ctaHref: "#anunciar",
    imageUrl: "",
  },
  {
    id: "prom_ad_2",
    format: "card",
    sponsorName: "Patrocínio Editorial · ADS",
    headline: "Card Nativo 300x250 integrado à leitura",
    description: "Alta visibilidade sem poluição visual, seguindo o padrão de design limpo do jornal.",
    ctaLabel: "Consultar Mídia Kit",
    ctaHref: "#anunciar",
    imageUrl: "",
  },
];

export const PrometheeNewsPortalBlock: React.FC<PrometheeNewsPortalBlockProps> = ({
  id,
  data,
  styling,
  products = [],
}) => {
  const sectionStyle = getSectionStyle(styling);

  const [selectedCity, setSelectedCity] = useState<string>("Notícias do Vale");
  const [selectedCategory, setSelectedCategory] = useState<string>("Para você");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [activeArticle, setActiveArticle] = useState<PrometheeNewsArticleItem | null>(null);
  const [isCitizenModalOpen, setIsCitizenModalOpen] = useState<boolean>(false);
  const [citizenDraft, setCitizenDraft] = useState({
    title: "",
    lead: "",
    city: data.cities?.[1] || "São José dos Campos",
    category: data.categories?.[1] || "Urgente",
    author: "",
  });
  const [citizenArticles, setCitizenArticles] = useState<PrometheeNewsArticleItem[]>([]);

  // Combine approved mined catalog items (when bound) + custom editorial articles + citizen posts
  const allArticles = useMemo(() => {
    const catalogArticles: PrometheeNewsArticleItem[] =
      data.dataSource === "custom_editorial"
        ? []
        : (products || []).slice(0, 12).map((item: any, idx: number) => ({
            id: `mined_${item.id || idx}`,
            title: String(item.name || item.title || "Notícia Aprovada pela Curadoria"),
            lead: String(
              item.description ||
                item.short_description ||
                "Matéria verificada e aprovada pela redação no catálogo editorial da empresa.",
            ),
            body: String(
              item.body ||
                item.description ||
                "Conteúdo jornalístico processado pelo minerador local e aprovado pela curadoria editorial da empresa.",
            ),
            category: String(item.category_name || item.category || "Para você"),
            city: String(item.city || "Notícias do Vale"),
            publishedAgo: "Agora",
            readingTime: "3 min",
            author: "Curadoria Aprovada",
            imageUrl: String(item.image_url || item.thumbnail_url || ""),
            imageAlt: String(item.name || item.title || "Imagem da matéria"),
            isBreaking: idx < 2,
            likesCount: 18 + idx * 5,
            commentsCount: 4 + idx * 2,
          }));

    const configuredArticles =
      data.articles && data.articles.length > 0 ? data.articles : DEFAULT_FALLBACK_ARTICLES;

    if (data.dataSource === "approved_mined_only") {
      return [...citizenArticles, ...(catalogArticles.length > 0 ? catalogArticles : configuredArticles)];
    }

    return [...citizenArticles, ...catalogArticles, ...configuredArticles];
  }, [citizenArticles, data.articles, data.dataSource, products]);

  const cities = useMemo(
    () =>
      data.cities && data.cities.length > 0
        ? data.cities
        : ["Notícias do Vale", "São José dos Campos", "Taubaté", "Jacareí", "Pindamonhangaba"],
    [data.cities],
  );

  const categories = useMemo(
    () =>
      data.categories && data.categories.length > 0
        ? data.categories
        : ["Para você", "Urgente", "Segurança", "Economia", "Esportes", "Tecnologia", "Cultura"],
    [data.categories],
  );

  const adSlots = useMemo(
    () => (data.adSlots && data.adSlots.length > 0 ? data.adSlots : DEFAULT_AD_SLOTS),
    [data.adSlots],
  );

  const filteredArticles = useMemo(() => {
    return allArticles.filter((article) => {
      const matchesCity =
        selectedCity === "Notícias do Vale" ||
        article.city.toLowerCase() === selectedCity.toLowerCase();

      const matchesCategory =
        selectedCategory === "Para você" ||
        (selectedCategory === "Salvos" && savedIds[article.id]) ||
        (selectedCategory === "Urgente" && article.isBreaking) ||
        article.category.toLowerCase().includes(selectedCategory.toLowerCase());

      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        article.title.toLowerCase().includes(q) ||
        article.lead.toLowerCase().includes(q) ||
        article.city.toLowerCase().includes(q) ||
        article.category.toLowerCase().includes(q);

      return matchesCity && matchesCategory && matchesQuery;
    });
  }, [allArticles, savedIds, searchQuery, selectedCategory, selectedCity]);

  const breakingArticles = useMemo(
    () => allArticles.filter((a) => a.isBreaking),
    [allArticles],
  );

  const handlePublishCitizenPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!citizenDraft.title.trim() || !citizenDraft.lead.trim()) return;

    const newPost: PrometheeNewsArticleItem = {
      id: `citizen_${Date.now()}`,
      title: citizenDraft.title.trim(),
      lead: citizenDraft.lead.trim(),
      body: citizenDraft.lead.trim(),
      category: citizenDraft.category,
      city: citizenDraft.city,
      publishedAgo: "Agora",
      readingTime: "2 min",
      author: citizenDraft.author.trim() || "Colaborador da Comunidade",
      imageUrl: "",
      imageAlt: citizenDraft.title.trim(),
      isBreaking: true,
      likesCount: 1,
      commentsCount: 0,
    };

    setCitizenArticles((prev) => [newPost, ...prev]);
    setCitizenDraft({
      title: "",
      lead: "",
      city: cities[1] || "São José dos Campos",
      category: categories[1] || "Urgente",
      author: "",
    });
    setIsCitizenModalOpen(false);
  };

  return (
    <section
      id={id}
      style={sectionStyle.style}
      className={`w-full bg-background text-foreground border-b border-border/60 ${sectionStyle.className}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* ── 1. CABEÇALHO PROMÉTHÉE (WIREFRAME DOME + MASTHEAD + CIDADES + BUSCA) ── */}
        <header className="flex flex-col gap-4 pb-4 border-b border-border/80">
          <div className="flex items-center justify-between gap-3">
            {/* Esquerda: Logo Domo Prométhée + Seletor de Cidade */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-11 rounded-2xl border border-border/80 bg-muted/30 flex items-center justify-center text-foreground shrink-0">
                {data.logoUrl ? (
                  <img
                    src={data.logoUrl}
                    alt={data.mastheadTitle}
                    className="size-8 object-contain"
                  />
                ) : (
                  <PrometheeWireframeDomeLogo className="size-7 text-foreground" />
                )}
              </div>

              {data.showCityFilter && (
                <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/30 px-3 h-11">
                  <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                  <select
                    aria-label="Filtrar por cidade"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer pr-1"
                  >
                    {cities.map((city) => (
                      <option key={city} value={city} className="bg-background text-foreground">
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Centro: Masthead Editorial Prométhée */}
            <div className="text-center min-w-0">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground leading-none">
                {data.mastheadTitle || "Prométhée"}
              </h2>
              {data.mastheadSubtitle && (
                <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                  {data.mastheadSubtitle}
                </p>
              )}
            </div>

            {/* Direita: Busca + Alerta */}
            <div className="flex items-center gap-2 shrink-0">
              {data.showSearch && (
                <button
                  type="button"
                  onClick={() => setIsSearchOpen((prev) => !prev)}
                  className="size-11 min-h-11 rounded-full border border-border/70 bg-muted/20 hover:bg-muted/50 flex items-center justify-center text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Buscar notícias"
                  title="Buscar notícias"
                >
                  <Search className="size-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedCategory("Urgente")}
                className="size-11 min-h-11 rounded-full border border-border/70 bg-muted/20 hover:bg-muted/50 flex items-center justify-center text-foreground transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Alertas de plantão"
                title="Plantão Regional"
              >
                <Bell className="size-4" />
                <span className="size-2 rounded-full bg-destructive absolute top-2.5 right-2.5" />
              </button>
            </div>
          </div>

          {/* Barra de Cidades Mobile */}
          {data.showCityFilter && (
            <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {cities.map((city) => {
                const active = selectedCity === city;
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setSelectedCity(city)}
                    className={`h-11 min-h-11 px-3.5 rounded-full text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active
                        ? "bg-foreground text-background"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/60"
                    }`}
                  >
                    <MapPin className="size-3" />
                    <span>{city}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Campo de Busca Dinâmico */}
          {isSearchOpen && (
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/30 px-3.5 h-11">
              <Search className="size-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar por cidade, tema, ocorrência ou palavra-chave..."
                className="w-full bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="size-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Limpar busca"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          )}

          {/* ── 2. MENU TABS SUPERIOR PROMÉTHÉE (+ PUBLICAR + EDITORIAS) ── */}
          <nav
            aria-label="Editorias do Portal"
            className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1"
          >
            {data.allowCitizenPosts && (
              <button
                type="button"
                onClick={() => setIsCitizenModalOpen(true)}
                className="h-11 min-h-11 px-3.5 rounded-full border border-border bg-muted/40 hover:bg-muted text-foreground text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Publicar relato ou pauta no feed"
              >
                <Plus className="size-4" />
                <span>Publicar</span>
              </button>
            )}

            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`h-11 min-h-11 px-3.5 text-xs sm:text-sm font-semibold shrink-0 transition-colors relative flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isActive
                      ? "text-foreground font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{cat}</span>
                  {isActive && (
                    <span className="absolute bottom-0 inset-x-2 h-0.5 bg-foreground rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </header>

        {/* ── 3. CARROSSEL HORIZONTAL DE BREAKING NEWS (SCROLL HORIZONTAL) ── */}
        {data.showBreakingCarousel && breakingArticles.length > 0 && (
          <div className="py-5 border-b border-border/60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-foreground text-background text-xs font-black tracking-wider uppercase">
                  BREAKING
                </span>
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  {data.breakingSectionTitle || "Plantão & Destaques em Tempo Real"}
                </h3>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Deslize para o lado
              </span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory no-scrollbar">
              {breakingArticles.map((item) => (
                <article
                  key={`breaking_${item.id}`}
                  className="min-w-72 sm:min-w-80 max-w-sm shrink-0 snap-start rounded-2xl border border-border/70 bg-muted/25 p-4 flex flex-col justify-between gap-3 hover:border-foreground/30 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground font-bold">
                        {item.city}
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" />
                        {item.readingTime}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-foreground leading-snug">
                      {item.title}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">{item.category}</span>
                    <button
                      type="button"
                      onClick={() => setActiveArticle(item)}
                      className="h-11 min-h-11 px-3 rounded-xl text-xs font-bold text-foreground underline underline-offset-4 hover:text-primary flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Ler mais
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* ── 4. GRID BIDIRECIONAL: FEED VERTICAL PROMÉTHÉE + SIDEBAR EDITORIAL/ADS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
          {/* Coluna Principal: Cards Squircles Estilo Prométhée */}
          <div className="lg:col-span-8 space-y-6">
            {filteredArticles.length === 0 ? (
              <div className="rounded-3xl border border-border/70 bg-muted/20 p-8 text-center space-y-3">
                <Newspaper className="size-8 text-muted-foreground mx-auto" />
                <p className="text-sm font-bold text-foreground">
                  Nenhuma matéria encontrada para este filtro
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCity("Notícias do Vale");
                    setSelectedCategory("Para você");
                    setSearchQuery("");
                  }}
                  className="h-11 min-h-11 px-4 rounded-xl bg-foreground text-background text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Ver todas as notícias
                </button>
              </div>
            ) : (
              filteredArticles.map((article, idx) => {
                const isLiked = Boolean(likedIds[article.id]);
                const isSaved = Boolean(savedIds[article.id]);
                const likeTotal = article.likesCount + (isLiked ? 1 : 0);

                return (
                  <React.Fragment key={article.id}>
                    <article className="rounded-3xl border border-border/70 bg-muted/30 p-4 sm:p-6 transition-colors hover:border-border">
                      {/* Container de Mídia com Pílulas Flutuantes Prométhée */}
                      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-secondary mb-4 border border-border/50">
                        {article.imageUrl ? (
                          <img
                            src={article.imageUrl}
                            alt={article.imageAlt || article.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-full w-full flex flex-col justify-between p-5 bg-muted text-foreground">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                {data.mastheadTitle} · {article.city}
                              </span>
                              <PrometheeWireframeDomeLogo className="size-6 text-muted-foreground" />
                            </div>
                            <p className="text-sm sm:text-base font-semibold text-foreground/80 max-w-lg">
                              {article.lead}
                            </p>
                            <div className="h-8" />
                          </div>
                        )}

                        {/* Pílula Translúcida Inferior Esquerda (Categoria — fiel ao Prométhée) */}
                        <div className="absolute bottom-3 left-3 flex items-center gap-2">
                          <span className="rounded-full border border-white/40 bg-black/60 backdrop-blur-md px-3.5 py-1 text-xs font-medium text-white">
                            {article.category}
                          </span>
                          <span className="rounded-full border border-white/30 bg-black/50 backdrop-blur-md px-3 py-1 text-xs font-medium text-white hidden sm:inline-flex items-center gap-1">
                            <MapPin className="size-3" />
                            {article.city}
                          </span>
                        </div>

                        {/* Pílula Translúcida Inferior Direita (Tempo — fiel ao Prométhée) */}
                        <div className="absolute bottom-3 right-3">
                          <span className="rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-medium text-white flex items-center gap-1.5">
                            <span>{article.publishedAgo}</span>
                            <Clock className="size-3.5" />
                          </span>
                        </div>
                      </div>

                      {/* Manchete + Resumo Sem Truncamento */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{article.city}</span>
                          <span>·</span>
                          <span>{article.readingTime} de leitura</span>
                          <span>·</span>
                          <span>{article.author}</span>
                        </div>

                        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-snug">
                          {article.title}
                        </h3>

                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {article.lead}
                        </p>
                      </div>

                      {/* Rodapé Prométhée: "Ler mais" sublinhado à esquerda + Ações à direita */}
                      <div className="flex items-center justify-between pt-3 border-t border-border/60">
                        <button
                          type="button"
                          onClick={() => setActiveArticle(article)}
                          className="h-11 min-h-11 px-2 text-xs sm:text-sm font-bold text-foreground underline underline-offset-4 hover:text-primary transition-colors flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                        >
                          Ler mais
                        </button>

                        <div className="flex items-center gap-1 sm:gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setLikedIds((prev) => ({
                                ...prev,
                                [article.id]: !prev[article.id],
                              }))
                            }
                            className={`h-11 min-h-11 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              isLiked
                                ? "bg-foreground text-background"
                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                            aria-label="Curtir notícia"
                          >
                            <Heart className="size-4" />
                            <span>{likeTotal}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveArticle(article)}
                            className="h-11 min-h-11 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label="Ver comentários"
                          >
                            <MessageCircle className="size-4" />
                            <span>{article.commentsCount}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setSavedIds((prev) => ({
                                ...prev,
                                [article.id]: !prev[article.id],
                              }))
                            }
                            className={`size-11 min-h-11 rounded-xl flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              isSaved
                                ? "bg-foreground text-background"
                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                            aria-label="Salvar notícia"
                          >
                            <Bookmark className="size-4" />
                          </button>
                        </div>
                      </div>
                    </article>

                    {/* Slot de Publicidade In-Feed (ADS) após o primeiro card */}
                    {data.showAds && idx === 0 && adSlots[0] && (
                      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-wider">
                              ADS
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">
                              {adSlots[0].sponsorName}
                            </span>
                          </div>
                          <h4 className="text-sm sm:text-base font-bold text-foreground">
                            {adSlots[0].headline}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {adSlots[0].description}
                          </p>
                        </div>
                        <a
                          href={adSlots[0].ctaHref || "#"}
                          className="h-11 min-h-11 px-4 rounded-xl bg-foreground text-background text-xs font-bold flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {adSlots[0].ctaLabel}
                        </a>
                      </div>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>

          {/* Coluna Direita (Desktop): Mais Lidas + Curadoria + Cards ADS */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="rounded-3xl border border-border/70 bg-muted/20 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-foreground" />
                  <h3 className="text-sm font-bold text-foreground">
                    Curadoria Editorial Ativa
                  </h3>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">
                  Catálogo Aprovado
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Este portal alimenta-se exclusivamente das notícias mineradas que foram aprovadas ou publicadas pela redação da empresa.
              </p>
              <div className="space-y-3 pt-1">
                {allArticles.slice(0, 4).map((art, i) => (
                  <button
                    key={`rank_${art.id}`}
                    type="button"
                    onClick={() => setActiveArticle(art)}
                    className="w-full text-left p-3 rounded-2xl bg-background/80 hover:bg-background border border-border/50 transition-colors flex items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="text-sm font-black text-muted-foreground">
                      0{i + 1}
                    </span>
                    <div className="min-w-0 space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground block">
                        {art.city} · {art.readingTime}
                      </span>
                      <p className="text-xs font-bold text-foreground leading-snug">
                        {art.title}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {data.showAds &&
              adSlots.slice(1).map((ad) => (
                <div
                  key={ad.id}
                  className="rounded-3xl border border-dashed border-border bg-muted/15 p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-wider">
                      ADS · PUBLICIDADE
                    </span>
                    <span className="text-xs text-muted-foreground">{ad.sponsorName}</span>
                  </div>
                  {ad.imageUrl && (
                    <img
                      src={ad.imageUrl}
                      alt={ad.headline}
                      className="w-full aspect-video rounded-xl object-cover"
                    />
                  )}
                  <h4 className="text-sm font-bold text-foreground">{ad.headline}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {ad.description}
                  </p>
                  <a
                    href={ad.ctaHref || "#"}
                    className="h-11 min-h-11 w-full rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-bold flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {ad.ctaLabel}
                  </a>
                </div>
              ))}
          </aside>
        </div>
      </div>

      {/* ── MODAL DE LEITURA LIMPA DO ARTIGO ── */}
      {activeArticle && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeArticle.title}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="w-full max-w-2xl rounded-3xl bg-background text-foreground border border-border p-6 sm:p-8 space-y-5 max-h-dvh overflow-y-auto">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground font-bold">
                  {activeArticle.category}
                </span>
                <span>{activeArticle.city}</span>
                <span>·</span>
                <span>{activeArticle.readingTime} de leitura</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveArticle(null)}
                className="size-11 min-h-11 rounded-full border border-border hover:bg-muted flex items-center justify-center text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Fechar leitura"
              >
                <X className="size-4" />
              </button>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-foreground leading-tight">
              {activeArticle.title}
            </h2>
            <p className="text-sm sm:text-base font-medium text-muted-foreground leading-relaxed">
              {activeArticle.lead}
            </p>

            {activeArticle.imageUrl && (
              <img
                src={activeArticle.imageUrl}
                alt={activeArticle.imageAlt || activeArticle.title}
                className="w-full aspect-video rounded-2xl object-cover"
              />
            )}

            <div className="space-y-4 text-sm sm:text-base text-foreground/90 leading-relaxed whitespace-pre-line">
              {activeArticle.body || activeArticle.lead}
            </div>

            {data.showAds && (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    ADS · Patrocínio In-Article
                  </span>
                  <p className="text-xs font-semibold text-foreground mt-0.5">
                    Espaço reservado para anunciantes locais durante a leitura da reportagem.
                  </p>
                </div>
                <span className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-bold shrink-0">
                  ADS
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL DE PUBLICAÇÃO CIDADÃ (BOTÃO + ESTILO THREADS) ── */}
      {isCitizenModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Publicar pauta ou relato no feed"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <form
            onSubmit={handlePublishCitizenPost}
            className="w-full max-w-lg rounded-3xl bg-background text-foreground border border-border p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-bold text-foreground">
                Publicar Notícia ou Relato no Feed
              </h3>
              <button
                type="button"
                onClick={() => setIsCitizenModalOpen(false)}
                className="size-11 min-h-11 rounded-full border border-border hover:bg-muted flex items-center justify-center text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Fechar modal"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                required
                value={citizenDraft.title}
                onChange={(e) => setCitizenDraft((p) => ({ ...p, title: e.target.value }))}
                placeholder="Título da notícia ou fato local..."
                className="w-full h-11 px-3.5 rounded-xl border border-border bg-muted/20 text-sm text-foreground outline-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={citizenDraft.city}
                  onChange={(e) => setCitizenDraft((p) => ({ ...p, city: e.target.value }))}
                  className="h-11 px-3 rounded-xl border border-border bg-muted/20 text-xs font-semibold text-foreground outline-none"
                >
                  {cities
                    .filter((c) => c !== "Notícias do Vale")
                    .map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                </select>
                <select
                  value={citizenDraft.category}
                  onChange={(e) => setCitizenDraft((p) => ({ ...p, category: e.target.value }))}
                  className="h-11 px-3 rounded-xl border border-border bg-muted/20 text-xs font-semibold text-foreground outline-none"
                >
                  {categories
                    .filter((c) => c !== "Para você")
                    .map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                </select>
              </div>
              <textarea
                required
                rows={4}
                value={citizenDraft.lead}
                onChange={(e) => setCitizenDraft((p) => ({ ...p, lead: e.target.value }))}
                placeholder="Descreva os detalhes da ocorrência, serviço ou notícia da sua cidade..."
                className="w-full p-3.5 rounded-xl border border-border bg-muted/20 text-sm text-foreground outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCitizenModalOpen(false)}
                className="h-11 min-h-11 px-4 rounded-xl border border-border text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-11 min-h-11 px-5 rounded-xl bg-foreground text-background text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Publicar no Feed
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
