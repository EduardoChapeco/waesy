import React, { useState, useMemo } from "react";
import {
  Clock,
  Flame,
  Hash,
  MapPin,
  Search,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import type { NormalizedPrometheeArticle } from "@/lib/news/news-studio-templates";
import {
  CANONICAL_VALE_TRENDING_TOPICS,
  type TrendingTopicItem,
} from "@/components/news/promethee-trending-marker-strip";
import { CANONICAL_CITIES } from "@/lib/constants/cities";

export interface PrometheeExploreSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  articles: NormalizedPrometheeArticle[];
  onSelectArticle: (article: NormalizedPrometheeArticle) => void;
  onSelectCity?: (city: string) => void;
  onSelectSearchQuery?: (query: string) => void;
  initialQuery?: string;
}

export function PrometheeExploreSearchModal({
  isOpen,
  onClose,
  articles,
  onSelectArticle,
  onSelectCity,
  onSelectSearchQuery,
  initialQuery = "",
}: PrometheeExploreSearchModalProps) {
  const [query, setQuery] = useState(initialQuery);

  const filteredArticles = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.lead.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    );
  }, [articles, query]);

  const latestBreaking = useMemo(() => {
    return articles.slice(0, 5);
  }, [articles]);

  if (!isOpen) return null;

  const handleTopicClick = (item: TrendingTopicItem) => {
    const cleanTag = item.tag;
    setQuery(cleanTag);
    onSelectSearchQuery?.(cleanTag);
  };

  const handleCityClick = (city: string) => {
    onSelectCity?.(city);
    onClose();
  };

  const handleArticleClick = (art: NormalizedPrometheeArticle) => {
    onSelectArticle(art);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Buscar e Explorar Notícias"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-xs p-0 sm:p-4"
    >
      <div className="flex h-dvh sm:h-auto sm:max-h-192 w-full max-w-2xl flex-col rounded-t-3xl sm:rounded-3xl border border-border bg-background overflow-hidden pt-safe pb-safe">
        {/* Cabeçalho da Barra de Busca */}
        <div className="flex items-center gap-3 border-b border-border/40 p-4">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-border bg-muted/30 px-3 h-11 min-h-11">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                onSelectSearchQuery?.(e.target.value);
              }}
              placeholder="Buscar por tópicos, pessoas, cidades..."
              className="w-full h-11 min-h-11 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  onSelectSearchQuery?.("");
                }}
                className="size-11 min-h-11 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Limpar termo"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-11 min-h-11 shrink-0 items-center justify-center rounded-full border border-border bg-card hover:bg-muted text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Fechar busca"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Corpo com Rolagem */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* Resultados de Busca Ativa */}
          {query.trim().length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Resultados ({filteredArticles.length})
                </span>
                {filteredArticles.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Toque para abrir a matéria
                  </span>
                )}
              </div>

              {filteredArticles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Nenhuma notícia encontrada para "{query}". Tente um termo mais amplo ou escolha um tópico abaixo.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredArticles.map((art) => (
                    <button
                      key={art.id}
                      type="button"
                      onClick={() => handleArticleClick(art)}
                      className="w-full rounded-2xl border border-border/70 bg-card hover:bg-muted/30 p-3 text-left flex items-start gap-3 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {art.coverImageUrl && (
                        <img
                          src={art.coverImageUrl}
                          alt=""
                          className="size-16 rounded-xl object-cover shrink-0 bg-muted"
                        />
                      )}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                            {art.category}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {art.city}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-foreground line-clamp-2">
                          {art.title}
                        </h4>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* 1. Tópicos do Momento com Efeito Marca-Texto */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Tópicos do Momento
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CANONICAL_VALE_TRENDING_TOPICS.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTopicClick(item)}
                      className="rounded-2xl border border-border/60 bg-card hover:bg-muted/40 p-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex items-start justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {idx + 1} · {item.category}
                        </span>
                        <div>
                          <span className="inline-block rounded-md bg-amber-400/20 text-foreground font-black text-sm px-2 py-1">
                            {item.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.context}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground shrink-0">
                        {item.readsCountLabel}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Plantão Rápido / Última Hora */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Flame className="size-4 text-foreground" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Última Hora
                  </span>
                </div>

                <div className="space-y-2">
                  {latestBreaking.map((art) => (
                    <button
                      key={art.id}
                      type="button"
                      onClick={() => handleArticleClick(art)}
                      className="w-full rounded-2xl border border-border/60 bg-card hover:bg-muted/30 p-3 text-left flex items-center justify-between gap-3 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {art.city} · {art.category}
                        </span>
                        <h4 className="text-sm font-bold text-foreground line-clamp-1">
                          {art.title}
                        </h4>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        <span>{art.publishedAgo}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Filtro Rápido por Cidades */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Cidades em Foco
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {CANONICAL_CITIES.slice(0, 8).map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => handleCityClick(city)}
                      className="h-11 min-h-11 px-4 rounded-full border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
