import React, { useState } from "react";
import { Plus, Send, X } from "lucide-react";
import type { BaseSiteBlockProps, PrometheeNewsNavBlockData } from "@/types/omni-builder";
import { usePrometheePortalController } from "@/components/news/promethee-portal-store";
import { CANONICAL_CITIES } from "@/lib/constants/cities";

export interface PrometheeNewsNavBlockProps extends BaseSiteBlockProps {
  data: PrometheeNewsNavBlockData;
  isEditing?: boolean;
}

export function PrometheeNewsNavBlock({
  id,
  className = "",
  styling,
  data,
}: PrometheeNewsNavBlockProps) {
  const portal = usePrometheePortalController();
  const [authorName, setAuthorName] = useState("");
  const [city, setCity] = useState("São José dos Campos");
  const [category, setCategory] = useState("Urgente");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const categories =
    Array.isArray(data?.categories) && data.categories.length > 0
      ? data.categories
      : ["Para você", "Urgente", "Política", "Segurança", "Economia", "Esportes", "Tecnologia", "Cultura"];

  if (categories.length === 0) {
    return null;
  }

  const inlineStyle: React.CSSProperties = {};
  if (styling?.backgroundColor) inlineStyle.backgroundColor = styling.backgroundColor;
  if (styling?.textColor) inlineStyle.color = styling.textColor;

  const handlePublishCitizen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    const cleanBody = body.trim();
    portal.publishCitizenArticle({
      id: `cit_${Date.now()}`,
      slug: `relato-${Date.now()}`,
      title: title.trim(),
      lead: cleanBody.slice(0, 220),
      body: cleanBody.split(/\n{2,}|\n/).filter(Boolean),
      bulletSummary: [cleanBody.slice(0, 180)],
      quote: title.trim(),
      category,
      city,
      state: "SP",
      publishedAgo: "Agora",
      publishedDateLabel: "Relato comunitário",
      readingTime: "2 min",
      author: authorName.trim() || "Morador Verificado",
      role: "Canal Cidadão",
      isBreaking: category === "Urgente",
      likesCount: 1,
      commentsCount: 0,
      coverImageUrl: null,
    });

    setTitle("");
    setBody("");
  };

  const valeCities = CANONICAL_CITIES.filter(
    (c) => c.region.includes("Vale") || c.region.includes("Litoral") || c.region.includes("Mantiqueira"),
  );

  return (
    <nav
      id={id}
      style={inlineStyle}
      aria-label="Editorias do portal"
      className={`border-b border-border/80 bg-background text-foreground ${className}`}
    >
      <div className="mx-auto max-w-6xl px-4 py-2 flex items-center gap-2">
        {/* Botão + Fixo (Somente Ícone 44x44px — Padrão Prométhée / Threads) */}
        {data?.allowCitizenPosts !== false && (
          <div className="shrink-0 flex items-center pr-2 border-r border-border/40">
            <button
              type="button"
              onClick={() => portal.setIsCitizenModalOpen(true)}
              className="size-11 min-h-11 rounded-full border border-border bg-card hover:bg-muted text-foreground flex items-center justify-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Enviar relato ou pauta"
            >
              <Plus className="size-5" />
            </button>
          </div>
        )}

        {/* Régua Contínua em Linha Única sem Quebra */}
        <div className="waesy-tab-strip flex flex-nowrap items-center min-w-0 flex-1 scroll-smooth gap-2 py-1">
          {categories.map((cat) => {
            const active = portal.selectedTab === cat && !portal.activeArticle;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => portal.setSelectedTab(cat)}
                className={`h-11 min-h-11 px-4 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active
                    ? "bg-foreground text-background"
                    : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {cat}
              </button>
            );
          })}

          {data?.showSavedTab !== false && (
            <button
              type="button"
              onClick={() => portal.setSelectedTab("Salvos")}
              className={`h-11 min-h-11 px-4 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                portal.selectedTab === "Salvos" && !portal.activeArticle
                  ? "bg-foreground text-background"
                  : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              Salvos
            </button>
          )}
        </div>
      </div>

      {/* Sheet Fullscreen Mobile para Envio de Pauta / Relato */}
      {portal.isCitizenModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Enviar pauta"
          className="fixed inset-0 z-50 bg-overlay backdrop-blur-xs flex items-stretch sm:items-center justify-center p-0 sm:p-4"
        >
          <div className="w-full h-dvh sm:h-auto sm:max-h-dvh sm:max-w-lg bg-background text-foreground sm:rounded-3xl border-0 sm:border sm:border-border flex flex-col overflow-hidden safe-top safe-bottom">
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-border">
              <h2 className="text-base sm:text-lg font-bold text-foreground">Enviar Pauta</h2>
              <button
                type="button"
                onClick={() => portal.setIsCitizenModalOpen(false)}
                className="size-11 min-h-11 shrink-0 rounded-full border border-border bg-muted/30 hover:bg-muted flex items-center justify-center text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Fechar envio de pauta"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handlePublishCitizen} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Compartilhe ocorrências, trânsito, serviços públicos ou fatos relevantes da sua cidade para apuração editorial.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor={`${id}-cit-name`} className="block text-xs font-bold text-muted-foreground">
                    Seu nome
                  </label>
                  <input
                    id={`${id}-cit-name`}
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Ex: Marcos Silva"
                    className="h-11 min-h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor={`${id}-cit-city`} className="block text-xs font-bold text-muted-foreground">
                    Cidade
                  </label>
                  <select
                    id={`${id}-cit-city`}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="h-11 min-h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {valeCities.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor={`${id}-cit-cat`} className="block text-xs font-bold text-muted-foreground">
                  Editoria
                </label>
                <select
                  id={`${id}-cit-cat`}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-11 min-h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {categories.filter((c) => c !== "Para você").map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor={`${id}-cit-title`} className="block text-xs font-bold text-muted-foreground">
                  Título curto do fato
                </label>
                <input
                  id={`${id}-cit-title`}
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="O que aconteceu na sua rua ou bairro?"
                  className="h-11 min-h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor={`${id}-cit-body`} className="block text-xs font-bold text-muted-foreground">
                  Relato detalhado
                </label>
                <textarea
                  id={`${id}-cit-body`}
                  required
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Informe horário, local de referência e detalhes verificáveis..."
                  className="w-full rounded-2xl border border-border bg-card p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <button
                type="submit"
                className="h-11 min-h-11 w-full px-4 rounded-2xl bg-foreground text-background hover:bg-foreground/90 text-sm font-bold flex items-center justify-center gap-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Send className="size-4" />
                <span>Publicar Relato</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
