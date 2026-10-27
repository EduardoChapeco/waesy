import React, { useState } from "react";
import {
  Ban,
  Check,
  ChevronRight,
  Globe,
  Layers,
  Lock,
  Megaphone,
  Radio,
  Save,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import {
  type ArticleAdPolicy,
  type SponsorDTO,
  updateArticleAdConfigFn,
} from "@/services/news.functions";

export interface ArticleAdConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleId: string;
  articleTitle: string;
  initialPolicy?: ArticleAdPolicy;
  initialExclusiveSponsors?: string[];
  initialOverrides?: Record<string, string>;
  availableSponsors: SponsorDTO[];
  onConfigSaved?: (newConfig: {
    adPolicy: ArticleAdPolicy;
    exclusiveSponsorIds: string[];
    placementOverrides: Record<string, string>;
  }) => void;
}

export function ArticleAdConfigModal({
  isOpen,
  onClose,
  articleId,
  articleTitle,
  initialPolicy = "inherit_network",
  initialExclusiveSponsors = [],
  initialOverrides = {},
  availableSponsors,
  onConfigSaved,
}: ArticleAdConfigModalProps) {
  const [adPolicy, setAdPolicy] = useState<ArticleAdPolicy>(initialPolicy);
  const [exclusiveSponsorIds, setExclusiveSponsorIds] = useState<string[]>(initialExclusiveSponsors);
  const [placementOverrides, setPlacementOverrides] = useState<Record<string, string>>(initialOverrides);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleExclusiveSponsor = (id: string) => {
    setExclusiveSponsorIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleOverrideChange = (zone: string, sponsorId: string) => {
    setPlacementOverrides((prev) => {
      const next = { ...prev };
      if (!sponsorId || sponsorId === "none") {
        delete next[zone];
      } else {
        next[zone] = sponsorId;
      }
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedbackMsg(null);
    try {
      await updateArticleAdConfigFn({
        data: {
          articleId,
          adPolicy,
          exclusiveSponsorIds: adPolicy === "exclusive_lock" ? exclusiveSponsorIds : [],
          placementOverrides: adPolicy === "ads_disabled" ? {} : placementOverrides,
        },
      });

      onConfigSaved?.({
        adPolicy,
        exclusiveSponsorIds: adPolicy === "exclusive_lock" ? exclusiveSponsorIds : [],
        placementOverrides: adPolicy === "ads_disabled" ? {} : placementOverrides,
      });

      setFeedbackMsg("Configurações salvas.");
      setTimeout(() => {
        onClose();
      }, 600);
    } catch {
      setFeedbackMsg("Falha ao salvar configurações.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ad-config-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-xs p-0 sm:p-4"
    >
      <div className="flex h-dvh sm:h-auto sm:max-h-192 w-full max-w-2xl flex-col rounded-t-3xl sm:rounded-3xl border border-border bg-background overflow-hidden pt-safe pb-safe">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Megaphone className="size-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Publicidade da Matéria
              </span>
              <h2
                id="ad-config-modal-title"
                className="text-base font-bold text-foreground line-clamp-1"
              >
                {articleTitle}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal de configuração"
            className="flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Conteúdo com rolagem defensiva */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Seletor de Política */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Diretriz de Exibição
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Opção 1: Rede Geral */}
              <button
                type="button"
                onClick={() => setAdPolicy("inherit_network")}
                className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  adPolicy === "inherit_network"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border/60 bg-card text-muted-foreground hover:border-border"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <Globe className="size-5 text-primary" />
                  {adPolicy === "inherit_network" && <Check className="size-4 text-primary" />}
                </div>
                <div>
                  <span className="text-sm font-bold text-foreground">Rede Automática</span>
                  <p className="text-xs text-muted-foreground">
                    Rotaciona anunciantes por cidade, editoria e quotas.
                  </p>
                </div>
              </button>

              {/* Opção 2: Patrocínio Exclusivo */}
              <button
                type="button"
                onClick={() => setAdPolicy("exclusive_lock")}
                className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  adPolicy === "exclusive_lock"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border/60 bg-card text-muted-foreground hover:border-border"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <Lock className="size-5 text-amber-500" />
                  {adPolicy === "exclusive_lock" && <Check className="size-4 text-primary" />}
                </div>
                <div>
                  <span className="text-sm font-bold text-foreground">Exclusividade</span>
                  <p className="text-xs text-muted-foreground">
                    Apenas marcas selecionadas veiculam nesta matéria.
                  </p>
                </div>
              </button>

              {/* Opção 3: Brand Safety / Sem Anúncios */}
              <button
                type="button"
                onClick={() => setAdPolicy("ads_disabled")}
                className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  adPolicy === "ads_disabled"
                    ? "border-destructive bg-destructive/5 text-foreground"
                    : "border-border/60 bg-card text-muted-foreground hover:border-border"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <Ban className="size-5 text-destructive" />
                  {adPolicy === "ads_disabled" && <Check className="size-4 text-destructive" />}
                </div>
                <div>
                  <span className="text-sm font-bold text-foreground">Sem Anúncios</span>
                  <p className="text-xs text-muted-foreground">
                    Brand Safety para tragédias, polícia e pautas sensíveis.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Seção de Exclusividade (Renderiza se adPolicy === exclusive_lock) */}
          {adPolicy === "exclusive_lock" && (
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-sm font-bold text-foreground">
                  Selecione os Patrocinadores Exclusivos
                </h4>
              </div>

              {availableSponsors.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Nenhum anunciante cadastrado no portal. Cadastre patrocinadores primeiro no menu de Notícias.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableSponsors.map((s) => {
                    const isSelected = exclusiveSponsorIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleExclusiveSponsor(s.id)}
                        className={`flex h-11 min-h-11 items-center justify-between gap-3 rounded-xl border px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          isSelected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border/40 bg-card text-muted-foreground hover:border-border"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {s.logo_url && (
                            <img
                              src={s.logo_url}
                              alt=""
                              className="size-6 rounded object-contain"
                            />
                          )}
                          <span className="text-xs font-semibold text-foreground truncate">
                            {s.name}
                          </span>
                        </div>
                        <div
                          className={`flex size-5 shrink-0 items-center justify-center rounded border ${
                            isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                          }`}
                        >
                          {isSelected && <Check className="size-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Seção de Fixação por Slot (Overrides) - Oculta se ads_disabled */}
          {adPolicy !== "ads_disabled" && availableSponsors.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                <h4 className="text-sm font-bold text-foreground">
                  Fixar Marca em Posição Específica (Opcional)
                </h4>
              </div>

              <div className="space-y-3">
                {/* Slot Topo da Matéria */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-medium text-foreground">
                    Apresentador da Matéria (Hero Slot)
                  </span>
                  <select
                    value={placementOverrides.article_hero_sponsor || "none"}
                    onChange={(e) =>
                      handleOverrideChange("article_hero_sponsor", e.target.value)
                    }
                    className="h-11 min-h-11 rounded-xl border border-border bg-card px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="none">Automático conforme política</option>
                    {availableSponsors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.tier})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Slot Meio do Texto */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-medium text-foreground">
                    Publicidade no Texto (Inline Mid)
                  </span>
                  <select
                    value={placementOverrides.article_inline_mid || "none"}
                    onChange={(e) =>
                      handleOverrideChange("article_inline_mid", e.target.value)
                    }
                    className="h-11 min-h-11 rounded-xl border border-border bg-card px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="none">Automático conforme política</option>
                    {availableSponsors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.tier})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Slot Rodapé */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-medium text-foreground">
                    Rodapé Comercial (Footer CTA)
                  </span>
                  <select
                    value={placementOverrides.article_footer_cta || "none"}
                    onChange={(e) =>
                      handleOverrideChange("article_footer_cta", e.target.value)
                    }
                    className="h-11 min-h-11 rounded-xl border border-border bg-card px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="none">Automático conforme política</option>
                    {availableSponsors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.tier})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer do Modal com CTA primário */}
        <div className="flex items-center justify-between border-t border-border/40 px-5 py-4 bg-muted/20">
          <div>
            {feedbackMsg && (
              <span className="text-xs font-semibold text-primary">
                {feedbackMsg}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex h-11 min-h-11 items-center justify-center rounded-xl border border-border bg-card px-4 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex h-11 min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent motion-reduce:hidden" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  <span>Salvar Configuração</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
