import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Image as ImageIcon,
  Layers,
  Loader2,
  Settings2,
  Shuffle,
  Sparkles,
  X,
} from "lucide-react";
import {
  NEWS_STUDIO_THEMES,
  renderNewsArtToPngDataUrl,
  type NewsStudioAspect,
  type NewsStudioRenderMode,
  type NewsStudioTheme,
  type NormalizedPrometheeArticle,
} from "@/lib/news/news-studio-templates";
import { fetchNewsImageDataUrlFn } from "@/services/news.functions";

export interface PrometheeNewsStudioModalProps {
  isOpen: boolean;
  initialArticle: NormalizedPrometheeArticle | null;
  availableArticles: NormalizedPrometheeArticle[];
  brandName?: string;
  portalDomainLabel?: string;
  onClose: () => void;
}

export function PrometheeNewsStudioModal({
  isOpen,
  initialArticle,
  availableArticles,
  brandName = "Waesynews",
  portalDomainLabel = "waesy.com.br",
  onClose,
}: PrometheeNewsStudioModalProps) {
  const articlesPool = useMemo(() => {
    if (availableArticles.length > 0) return availableArticles;
    return initialArticle ? [initialArticle] : [];
  }, [availableArticles, initialArticle]);

  const [selectedId, setSelectedId] = useState<string>(initialArticle?.id || articlesPool[0]?.id || "");
  const [mode, setMode] = useState<NewsStudioRenderMode>("single_post");
  const [aspect, setAspect] = useState<NewsStudioAspect>("4:5");
  const [themeId, setThemeId] = useState<NewsStudioTheme["id"]>("editorial_dark");
  const [layoutVariant, setLayoutVariant] = useState<"classic_card" | "quote_focus" | "facts_split" | "hero_bleed">("classic_card");
  const [slideIndex, setSlideIndex] = useState<number>(0);
  const [customHeadline, setCustomHeadline] = useState<string>("");
  const [customLead, setCustomLead] = useState<string>("");
  const [customCta, setCustomCta] = useState<string>("O que você acha dessa notícia? Comente e compartilhe.");
  const [fixedEndingImageUrl, setFixedEndingImageUrl] = useState<string>("");
  const [mobileTab, setMobileTab] = useState<"preview" | "controls">("preview");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const selectedArticle = useMemo(() => {
    return (
      articlesPool.find((a) => a.id === selectedId) ||
      initialArticle ||
      articlesPool[0] ||
      null
    );
  }, [articlesPool, initialArticle, selectedId]);

  useEffect(() => {
    if (initialArticle) {
      setSelectedId(initialArticle.id);
      setCustomHeadline(initialArticle.title);
      setCustomLead(initialArticle.lead);
      setSlideIndex(0);
      setExportFeedback(null);
    }
  }, [initialArticle]);

  const handleSelectArticle = (id: string) => {
    setSelectedId(id);
    const next = articlesPool.find((a) => a.id === id);
    if (next) {
      setCustomHeadline(next.title);
      setCustomLead(next.lead);
      setSlideIndex(0);
      setExportFeedback(null);
    }
  };

  const handleShuffleLayout = () => {
    const variants: Array<"classic_card" | "quote_focus" | "facts_split" | "hero_bleed"> = [
      "classic_card",
      "quote_focus",
      "facts_split",
      "hero_bleed",
    ];
    const currentIndex = variants.indexOf(layoutVariant);
    const next = variants[(currentIndex + 1) % variants.length];
    setLayoutVariant(next);
    setExportFeedback(`Layout alternado para: ${next.replace("_", " ")}`);
  };

  if (!isOpen || !selectedArticle) return null;

  const activeTheme =
    NEWS_STUDIO_THEMES.find((t) => t.id === themeId) || NEWS_STUDIO_THEMES[0];

  const resolveProxyImage = async (url: string): Promise<string | null> => {
    try {
      const res = await fetchNewsImageDataUrlFn({ data: { imageUrl: url } });
      return res?.ok ? res.dataUrl : null;
    } catch {
      return null;
    }
  };

  const triggerDownload = (dataUrl: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadCurrentPng = async () => {
    setIsExporting(true);
    setExportFeedback(null);
    try {
      const dataUrl = await renderNewsArtToPngDataUrl({
        article: selectedArticle,
        brandName,
        portalDomainLabel,
        mode,
        aspect,
        slideIndex,
        theme: activeTheme,
        customHeadline: customHeadline || selectedArticle.title,
        customLead: customLead || selectedArticle.lead,
        customCta,
        fixedEndingImageUrl: fixedEndingImageUrl || undefined,
        layoutVariant,
        scaleMultiplier: 2,
        resolveRemoteDataUrl: resolveProxyImage,
      });
      if (dataUrl) {
        const safeSlug = (selectedArticle.slug || "noticia").slice(0, 36);
        const suffix = mode === "single_post" ? "post" : `slide-${slideIndex + 1}`;
        triggerDownload(dataUrl, `${safeSlug}-${suffix}-${aspect.replace(":", "x")}.png`);
        setExportFeedback("Imagem PNG HD (300 DPI) baixada.");
      }
    } catch {
      setExportFeedback("Não foi possível exportar o PNG agora.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAllSlides = async () => {
    setIsExporting(true);
    setExportFeedback(null);
    try {
      const safeSlug = (selectedArticle.slug || "noticia").slice(0, 36);
      for (let idx = 0; idx < 4; idx += 1) {
        const dataUrl = await renderNewsArtToPngDataUrl({
          article: selectedArticle,
          brandName,
          portalDomainLabel,
          mode: "carousel_4",
          aspect,
          slideIndex: idx,
          theme: activeTheme,
          customHeadline: customHeadline || selectedArticle.title,
          customLead: customLead || selectedArticle.lead,
          customCta,
          fixedEndingImageUrl: fixedEndingImageUrl || undefined,
          layoutVariant,
          scaleMultiplier: 2,
          resolveRemoteDataUrl: resolveProxyImage,
        });
        if (dataUrl) {
          triggerDownload(dataUrl, `${safeSlug}-lamina-${idx + 1}-${aspect.replace(":", "x")}.png`);
        }
      }
      setExportFeedback("4 lâminas PNG baixadas em alta definição.");
    } catch {
      setExportFeedback("Falha ao exportar pacote completo.");
    } finally {
      setIsExporting(false);
    }
  };

  const headlineText = customHeadline || selectedArticle.title;
  const leadText = customLead || selectedArticle.lead;

  // Frame de Proporção Fixa sem colchetes arbitrários (Zero Distorção e Anti-Compressão)
  const previewRatioStyle: React.CSSProperties = {
    aspectRatio: aspect === "9:16" ? "9 / 16" : aspect === "1:1" ? "1 / 1" : "4 / 5",
  };
  const previewWidthClass =
    aspect === "9:16"
      ? "w-full max-w-72"
      : "w-full max-w-sm";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Estúdio de Posts PNG"
      className="fixed inset-0 z-50 bg-overlay backdrop-blur-xs flex items-stretch sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="w-full h-dvh sm:h-auto sm:max-h-dvh sm:max-w-5xl bg-background text-foreground sm:rounded-3xl border-0 sm:border sm:border-border flex flex-col overflow-hidden safe-top safe-bottom">
        {/* Barra Superior Discreta */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="size-5 text-foreground shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-foreground">Estúdio de Posts PNG</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShuffleLayout}
              className="h-11 min-h-11 px-3 rounded-full border border-border bg-muted/30 hover:bg-muted flex items-center justify-center gap-2 text-xs font-bold text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Aleatorizar Formato Visual"
            >
              <Shuffle className="size-4 shrink-0" />
              <span className="hidden sm:inline">Aleatorizar</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="size-11 min-h-11 shrink-0 rounded-full border border-border bg-muted/30 hover:bg-muted flex items-center justify-center text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Fechar estúdio de posts"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Alternador Mobile (Previne compressão da arte em telas menores) */}
        <div className="lg:hidden flex items-center border-b border-border bg-muted/20 px-4 py-2 shrink-0">
          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              type="button"
              onClick={() => setMobileTab("preview")}
              className={`h-11 min-h-11 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                mobileTab === "preview"
                  ? "bg-foreground text-background"
                  : "bg-card text-foreground border border-border hover:bg-muted"
              }`}
            >
              <Eye className="size-4 shrink-0" />
              <span>Ver Arte</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("controls")}
              className={`h-11 min-h-11 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                mobileTab === "controls"
                  ? "bg-foreground text-background"
                  : "bg-card text-foreground border border-border hover:bg-muted"
              }`}
            >
              <Settings2 className="size-4 shrink-0" />
              <span>Personalizar</span>
            </button>
          </div>
        </div>

        {/* Corpo Bidirecional: Mobile Alternado / Desktop 2 Colunas */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* Coluna 1: Preview da Arte com Proporção Fixa */}
          <div
            className={`lg:col-span-6 p-4 sm:p-6 bg-muted/10 border-b lg:border-b-0 lg:border-r border-border flex flex-col items-center justify-center gap-4 ${
              mobileTab === "controls" ? "hidden lg:flex" : "flex"
            }`}
          >
            <div
              style={previewRatioStyle}
              className={`${previewWidthClass} rounded-3xl border p-4 sm:p-5 flex flex-col justify-between gap-3 overflow-hidden shadow-xs transition-all duration-200 ${activeTheme.previewBgClass}`}
            >
              {/* Cabeçalho da Arte */}
              <div className="flex items-center justify-between gap-2 shrink-0">
                <span className={`text-xs font-extrabold uppercase tracking-wider ${activeTheme.previewTextClass}`}>
                  {brandName}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${activeTheme.previewBadgeClass}`}>
                  {mode === "single_post" ? selectedArticle.category : `0${slideIndex + 1}/04`}
                </span>
              </div>

              {/* Card Interno com Conteúdo Jornalístico ou Lâmina Final Fixa */}
              {mode === "carousel_4" && slideIndex === 3 && fixedEndingImageUrl ? (
                <div className="size-full rounded-2xl overflow-hidden bg-muted flex items-center justify-center">
                  <img
                    src={fixedEndingImageUrl}
                    alt="Lâmina de encerramento"
                    className="size-full object-cover"
                  />
                </div>
              ) : (
                <div className={`rounded-2xl border p-4 space-y-3 flex-1 flex flex-col justify-center min-h-0 overflow-hidden ${activeTheme.previewCardClass}`}>
                  {(mode === "single_post" || slideIndex === 0) && (
                    <>
                      {selectedArticle.coverImageUrl && (
                        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted shrink-0">
                          <img
                            src={selectedArticle.coverImageUrl}
                            alt={headlineText}
                            className="size-full object-cover"
                          />
                          <span className="absolute bottom-2 left-2 px-3 py-1 rounded-full bg-background/90 text-foreground text-xs font-bold">
                            {selectedArticle.category} · {selectedArticle.city}
                          </span>
                        </div>
                      )}

                      {!selectedArticle.coverImageUrl && (
                        <div className="inline-flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${activeTheme.previewBadgeClass}`}>
                            {selectedArticle.category} · {selectedArticle.city}
                          </span>
                        </div>
                      )}

                      <h3 className={`text-base sm:text-lg font-black leading-snug line-clamp-3 text-anti-truncate ${activeTheme.previewTextClass}`}>
                        {headlineText}
                      </h3>

                      {mode === "single_post" ? (
                        <p className={`text-xs leading-relaxed line-clamp-3 text-anti-truncate ${activeTheme.previewMutedClass}`}>
                          {leadText}
                        </p>
                      ) : (
                        <p className={`text-xs font-semibold ${activeTheme.previewMutedClass}`}>
                          Deslize para ver os fatos apurados →
                        </p>
                      )}
                    </>
                  )}

                  {mode === "carousel_4" && slideIndex === 1 && (
                    <div className="space-y-2 py-1">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${activeTheme.previewBadgeClass}`}>
                        Fatos Principais
                      </span>
                      <p className={`text-xs sm:text-sm font-bold leading-snug line-clamp-2 text-anti-truncate ${activeTheme.previewTextClass}`}>
                        {leadText}
                      </p>
                      <ul className="space-y-2">
                        {(selectedArticle.bulletSummary.length > 0
                          ? selectedArticle.bulletSummary.slice(0, 3)
                          : [leadText]
                        ).map((b, idx) => (
                          <li key={idx} className={`text-xs leading-relaxed line-clamp-2 ${activeTheme.previewMutedClass}`}>
                            <strong className={activeTheme.previewTextClass}>0{idx + 1}.</strong> {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {mode === "carousel_4" && slideIndex === 2 && (
                    <div className="space-y-2 py-1">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${activeTheme.previewBadgeClass}`}>
                        Contexto · {selectedArticle.city}
                      </span>
                      <blockquote className={`text-xs sm:text-sm font-bold leading-relaxed line-clamp-3 text-anti-truncate ${activeTheme.previewTextClass}`}>
                        “{selectedArticle.quote}”
                      </blockquote>
                      <p className={`text-xs leading-relaxed line-clamp-3 text-anti-truncate ${activeTheme.previewMutedClass}`}>
                        {selectedArticle.body[1] || selectedArticle.body[0] || leadText}
                      </p>
                    </div>
                  )}

                  {mode === "carousel_4" && slideIndex === 3 && (
                    <div className="space-y-2 py-1">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${activeTheme.previewBadgeClass}`}>
                        Participe do Debate
                      </span>
                      <p className={`text-sm sm:text-base font-extrabold leading-snug line-clamp-3 text-anti-truncate ${activeTheme.previewTextClass}`}>
                        {customCta}
                      </p>
                      <p className={`text-xs ${activeTheme.previewMutedClass}`}>
                        Leia a matéria completa em {portalDomainLabel}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Rodapé da Arte */}
              <div className={`flex items-center justify-between text-xs font-semibold shrink-0 ${activeTheme.previewMutedClass}`}>
                <span>{selectedArticle.city}</span>
                <span>{aspect} · HD 300DPI</span>
              </div>
            </div>

            {/* Navegação de Lâminas no Carrossel */}
            {mode === "carousel_4" && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSlideIndex((p) => (p > 0 ? p - 1 : 3))}
                  className="size-11 min-h-11 rounded-full border border-border bg-card hover:bg-muted flex items-center justify-center text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Lâmina anterior"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-xs font-bold text-foreground px-2">
                  Lâmina {slideIndex + 1} de 4
                </span>
                <button
                  type="button"
                  onClick={() => setSlideIndex((p) => (p < 3 ? p + 1 : 0))}
                  className="size-11 min-h-11 rounded-full border border-border bg-card hover:bg-muted flex items-center justify-center text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Próxima lâmina"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>

          {/* Coluna 2: Controles e Personalização */}
          <div
            className={`lg:col-span-6 p-4 sm:p-6 space-y-5 ${
              mobileTab === "preview" ? "hidden lg:block" : "block"
            }`}
          >
            {/* 1. Seletor de Notícia Real */}
            <div className="space-y-2">
              <label htmlFor="studio-article-picker" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Selecionar Notícia Real do Portal
              </label>
              <select
                id="studio-article-picker"
                value={selectedArticle.id}
                onChange={(e) => handleSelectArticle(e.target.value)}
                className="h-11 min-h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {articlesPool.map((art) => (
                  <option key={art.id} value={art.id}>
                    [{art.city}] {art.title}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Formato: Post Único vs Carrossel */}
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Modelo Editorial
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("single_post")}
                  className={`h-11 min-h-11 px-3 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    mode === "single_post"
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card text-foreground border-border hover:bg-muted"
                  }`}
                >
                  <ImageIcon className="size-4 shrink-0" />
                  <span>Post Único</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("carousel_4")}
                  className={`h-11 min-h-11 px-3 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    mode === "carousel_4"
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card text-foreground border-border hover:bg-muted"
                  }`}
                >
                  <Layers className="size-4 shrink-0" />
                  <span>Carrossel 4x</span>
                </button>
              </div>
            </div>

            {/* 3. Proporção Instagram */}
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Proporção Instagram
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "4:5", label: "Feed 4:5" },
                    { id: "9:16", label: "Stories 9:16" },
                    { id: "1:1", label: "Quadrado 1:1" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAspect(opt.id)}
                    className={`h-11 min-h-11 px-3 rounded-2xl border text-xs font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      aspect === opt.id
                        ? "bg-foreground text-background border-foreground"
                        : "bg-card text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Paleta Editorial */}
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tema Visual
              </span>
              <div className="grid grid-cols-2 gap-2">
                {NEWS_STUDIO_THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setThemeId(t.id)}
                    className={`h-11 min-h-11 px-3 rounded-2xl border text-xs font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      themeId === t.id
                        ? "bg-foreground text-background border-foreground"
                        : "bg-card text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Lâmina Final Fixa Opcional (Marca / Fechamento) */}
            <div className="space-y-2">
              <label htmlFor="studio-ending-img-input" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Lâmina Final Fixa (URL Imagem de Encerramento)
              </label>
              <input
                id="studio-ending-img-input"
                type="url"
                value={fixedEndingImageUrl}
                onChange={(e) => setFixedEndingImageUrl(e.target.value)}
                placeholder="https://... (deixe em branco para usar o CTA padrão)"
                className="h-11 min-h-11 w-full rounded-2xl border border-border bg-card px-4 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* 6. Ajuste Rápido de Manchete */}
            <div className="space-y-2">
              <label htmlFor="studio-headline-input" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Manchete na Arte
              </label>
              <textarea
                id="studio-headline-input"
                rows={2}
                value={customHeadline}
                onChange={(e) => setCustomHeadline(e.target.value)}
                className="w-full rounded-2xl border border-border bg-card p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Feedback & Exportação PNG */}
            {exportFeedback && (
              <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-xs font-medium text-foreground flex items-center gap-2">
                <Sparkles className="size-4 shrink-0" />
                <span>{exportFeedback}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                disabled={isExporting}
                onClick={handleDownloadCurrentPng}
                className="h-11 min-h-11 flex-1 px-4 rounded-2xl bg-foreground text-background hover:bg-foreground/90 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isExporting ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <Download className="size-4" />}
                <span>{mode === "single_post" ? "Baixar Post PNG (300DPI)" : `Baixar Lâmina ${slideIndex + 1} PNG`}</span>
              </button>

              {mode === "carousel_4" && (
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleDownloadAllSlides}
                  className="h-11 min-h-11 px-4 rounded-2xl border border-border bg-card hover:bg-muted text-foreground text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Layers className="size-4" />
                  <span>Baixar 4 PNGs</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
