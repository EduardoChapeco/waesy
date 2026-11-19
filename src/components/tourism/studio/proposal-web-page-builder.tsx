import React, { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bot,
  Clock,
  Compass,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  Film,
  Globe,
  HelpCircle,
  ImagePlus,
  LayoutTemplate,
  Loader2,
  MapPin,
  MessageCircle,
  MousePointerClick,
  Palette,
  Plus,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Type,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaGalleryField } from "@/components/ui/media-gallery-field";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  buildDefaultWebPageConfig,
  resolveHeroSlotAspectPreset,
  type ProposalMediaItem,
  type ProposalWebPageBlock,
  type ProposalWebPageBlockType,
  type ProposalWebPageDTO,
} from "@/lib/tourism/proposal-normalization";
import {
  BRAND_COLOR_PRESETS,
  getContrastRatio,
  isValidHexColor,
} from "@/lib/tourism/proposal-theme-palettes";
import { TOKEN_HEX } from "@/lib/design-tokens";
import {
  type TravelProposalDTO,
  upsertProposalWebPage,
} from "@/services/travel-proposal.functions";
import { cn } from "@/lib/utils";

const THEME_PRESET_OPTIONS: Array<{
  id: NonNullable<ProposalWebPageDTO["theme_preset"]>;
  label: string;
}> = [
  { id: "editorial", label: "Editorial" },
  { id: "modern", label: "Moderno" },
  { id: "boutique", label: "Boutique" },
  { id: "dark", label: "Noturno" },
];

const HERO_LAYOUT_OPTIONS: Array<{
  id: NonNullable<ProposalWebPageDTO["hero_layout"]>;
  label: string;
}> = [
  { id: "split", label: "Dividido" },
  { id: "gallery", label: "Galeria" },
  { id: "gallery_mosaic_3", label: "Mosaico 3 Fotos" },
  { id: "gallery_bento_4", label: "Bento Grid 4+" },
  { id: "immersive", label: "Banner Imersivo" },
  { id: "minimal", label: "Minimal" },
];

const BLOCK_TYPE_LABELS: Record<ProposalWebPageBlockType, string> = {
  hero: "Capa Hero",
  summary: "Resumo",
  hotels: "Hospedagens",
  flights: "Voos",
  flight_route_map: "Mapa Aéreo",
  cruises: "Cruzeiros Marítimos",
  transfers: "Traslados",
  tours: "Passeios",
  itinerary: "Roteiro",
  includes: "Inclusões",
  pricing: "Valores",
  conditions: "Condições",
  gallery: "Galeria",
  video: "Vídeo",
  custom_text: "Texto Livre",
  faq: "Perguntas (FAQ)",
  urgency_banner: "Faixa de Prazo",
  cta: "Chamada CTA",
  simulation_disclaimer: "Aviso de Simulação",
  related_packages: "Pacotes Relacionados",
  promo_banner: "Banner Promocional",
};

const CUSTOM_BLOCK_TYPES = new Set<ProposalWebPageBlockType>([
  "gallery",
  "video",
  "custom_text",
  "faq",
  "urgency_banner",
  "flight_route_map",
  "cta",
  "simulation_disclaimer",
  "related_packages",
  "promo_banner",
]);

function hydrateConfig(proposal: TravelProposalDTO): ProposalWebPageDTO {
  const base = buildDefaultWebPageConfig(proposal);
  const existing = proposal.web_page;
  if (!existing) return base;
  return {
    ...base,
    ...existing,
    hero_media:
      Array.isArray(existing.hero_media) && existing.hero_media.length > 0
        ? existing.hero_media
        : base.hero_media,
    blocks:
      Array.isArray(existing.blocks) && existing.blocks.length > 0
        ? [...existing.blocks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        : base.blocks,
  };
}

export interface ProposalWebPageBuilderProps {
  proposal: TravelProposalDTO;
  onChange: (patch: Partial<TravelProposalDTO>) => void;
  onSaved?: (webPage: ProposalWebPageDTO) => void;
  onSaveOverride?: (webPage: ProposalWebPageDTO) => Promise<void>;
}

/**
 * Editor visual completo de Página Web Editorial da proposta.
 * Permite customizar tema, capa hero (múltiplas fotos e vídeos sem travar recorte),
 * ordenar/alternar visibilidade dos blocos nativos e inserir galerias, vídeos, textos e CTAs customizados.
 */
export function ProposalWebPageBuilder({
  proposal,
  onChange,
  onSaved,
  onSaveOverride,
}: ProposalWebPageBuilderProps) {
  const [config, setConfig] = useState<ProposalWebPageDTO>(() => hydrateConfig(proposal));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setConfig(hydrateConfig(proposal));
  }, [proposal.id]);

  const commitConfig = (next: ProposalWebPageDTO) => {
    const normalizedBlocks = [...(next.blocks || [])]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((blk, idx) => ({ ...blk, order: idx }));
    const finalConfig: ProposalWebPageDTO = {
      ...next,
      blocks: normalizedBlocks,
    };
    setConfig(finalConfig);
    onChange({ web_page: finalConfig });
  };

  const updateHeroMedia = (nextMedia: ProposalMediaItem[]) => {
    const nextBlocks = (config.blocks || []).map((blk) =>
      blk.type === "hero" ? { ...blk, media: nextMedia } : blk,
    );
    commitConfig({
      ...config,
      hero_media: nextMedia,
      blocks: nextBlocks,
    });
  };

  const updateBlock = (blockId: string, patch: Partial<ProposalWebPageBlock>) => {
    const nextBlocks = (config.blocks || []).map((blk) =>
      blk.id === blockId ? { ...blk, ...patch } : blk,
    );
    commitConfig({ ...config, blocks: nextBlocks });
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    const list = [...(config.blocks || [])];
    if (target < 0 || target >= list.length) return;
    const [moved] = list.splice(index, 1);
    list.splice(target, 0, moved);
    commitConfig({
      ...config,
      blocks: list.map((blk, i) => ({ ...blk, order: i })),
    });
  };

  const addCustomBlock = (
    type:
      | "gallery"
      | "video"
      | "custom_text"
      | "cta"
      | "faq"
      | "urgency_banner"
      | "flight_route_map"
      | "simulation_disclaimer"
      | "related_packages"
      | "promo_banner",
  ) => {
    const id = `blk-${type}-${Date.now()}`;
    const defaultTitles: Record<typeof type, string> = {
      gallery: "Galeria do Destino",
      video: "Vídeo de Apresentação",
      custom_text: "Informações Especiais",
      faq: "Dúvidas Frequentes",
      urgency_banner: "Prazo de Condição Especial",
      flight_route_map: "Mapa da Rota Aérea",
      cta: "Reserve Sua Viagem",
      simulation_disclaimer: "Aviso Legal de Simulação",
      related_packages: "Você Também Pode Gostar",
      promo_banner: "Campanha Especial",
    };
    const nextBlock: ProposalWebPageBlock = {
      id,
      type,
      title: defaultTitles[type],
      subtitle: type === "cta" ? "Fale agora com seu consultor." : undefined,
      body: type === "custom_text" || type === "urgency_banner" ? "" : undefined,
      visible: true,
      order: (config.blocks || []).length,
      media: type === "gallery" || type === "video" ? [] : undefined,
      faqItems: type === "faq" ? [{ question: "", answer: "" }] : undefined,
      ctaLabel: type === "cta" ? config.cta_label || "Aprovar Proposta" : undefined,
    };
    commitConfig({
      ...config,
      blocks: [...(config.blocks || []), nextBlock],
    });
  };

  const removeCustomBlock = (blockId: string) => {
    commitConfig({
      ...config,
      blocks: (config.blocks || [])
        .filter((b) => b.id !== blockId)
        .map((b, idx) => ({ ...b, order: idx })),
    });
  };

  const handleResetDefault = () => {
    const fresh = buildDefaultWebPageConfig(proposal);
    commitConfig(fresh);
    toast.success("Estrutura padrão restaurada");
  };

  const handlePersist = async () => {
    if (onSaveOverride) {
      setIsSaving(true);
      try {
        await onSaveOverride(config);
        onChange({ web_page: config });
        onSaved?.(config);
        toast.success("Página web salva!");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar página web");
      } finally {
        setIsSaving(false);
      }
      return;
    }
    if (!proposal.id) {
      toast.info("Salve a proposta primeiro para persistir a página web.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await upsertProposalWebPage({
        data: {
          proposalId: proposal.id,
          slug: config.slug || null,
          headline: config.headline || null,
          subheadline: config.subheadline || null,
          theme_preset: config.theme_preset || "editorial",
          accent_color: config.accent_color || null,
          hero_layout: config.hero_layout || "split",
          hero_media: config.hero_media || [],
          blocks: config.blocks || [],
          show_option_tabs: Boolean(config.show_option_tabs),
          cta_label: config.cta_label || "Aprovar Proposta",
          is_published: config.is_published,
          seo_title: config.seo_title || null,
          seo_description: config.seo_description || null,
          countdown_config: config.countdown_config,
          availability_config: config.availability_config,
          payment_display_config: config.payment_display_config,
          trust_badges_config: config.trust_badges_config,
          show_flight_route_map: config.show_flight_route_map !== false,
          sticky_card_enabled: config.sticky_card_enabled !== false,
          ai_advisor_enabled: config.ai_advisor_enabled !== false,
          ai_advisor_prompt: config.ai_advisor_prompt || null,
          whatsapp_button_enabled: config.whatsapp_button_enabled !== false,
          whatsapp_phone: config.whatsapp_phone || null,
          allow_online_gateway_payment: Boolean(config.allow_online_gateway_payment),
          payment_gateway_url: config.payment_gateway_url || null,
          show_simulation_disclaimer: config.show_simulation_disclaimer !== false,
          simulation_disclaimer_text: config.simulation_disclaimer_text || null,
          show_related_packages: config.show_related_packages !== false,
          related_packages_title: config.related_packages_title || null,
          promo_banner_url: config.promo_banner_url || null,
          promo_banner_link: config.promo_banner_link || null,
        },
      });
      if (res?.webPage) {
        setConfig(res.webPage);
        onChange({ web_page: res.webPage });
        onSaved?.(res.webPage);
      }
      toast.success("Página web salva!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar página web");
    } finally {
      setIsSaving(false);
    }
  };

  const hasMultipleOptions = Array.isArray(proposal.options) && proposal.options.length > 1;

  return (
    <div className="space-y-4">
      {/* Cabeçalho e Ação Primária de Gravação */}
      <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Globe className="size-4 text-primary shrink-0" />
              <span>Página Web Editorial</span>
            </h4>
            <p className="text-xs text-muted-foreground">
              Blocos visuais, vídeos e galerias interativas
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Label htmlFor="web-page-published-switch" className="text-xs font-medium cursor-pointer">
              Publicada
            </Label>
            <Switch
              id="web-page-published-switch"
              checked={config.is_published}
              onCheckedChange={(checked) =>
                commitConfig({ ...config, is_published: checked })
              }
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={isSaving}
            onClick={handlePersist}
            className="flex-1 h-11 min-h-11 gap-2 font-bold text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <Save className="size-4" />}
            <span>{isSaving ? "Salvando..." : "Salvar Página"}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleResetDefault}
            aria-label="Restaurar blocos padrão"
            className="h-11 min-h-11 px-3 gap-2 text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCcw className="size-4" />
            <span>Restaurar</span>
          </Button>
        </div>
      </div>

      {/* Tema, Cor de Destaque WCAG e Layout da Capa */}
      <div className="p-3 rounded-xl border border-border bg-card space-y-3">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
            <Palette className="size-4 text-primary" />
            <span>Estilo Visual</span>
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {THEME_PRESET_OPTIONS.map((preset) => {
              const active = (config.theme_preset || "editorial") === preset.id;
              return (
                <Button
                  key={preset.id}
                  type="button"
                  variant={active ? "default" : "outline"}
                  onClick={() => commitConfig({ ...config, theme_preset: preset.id })}
                  className="h-11 min-h-11 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="web-accent-color" className="text-xs font-semibold text-foreground">
              Cor de Destaque (WCAG AA)
            </Label>
            {config.accent_color && isValidHexColor(config.accent_color) && (
              <span className="text-xs font-mono text-muted-foreground">
                Contraste{" "}
                {getContrastRatio(
                  config.accent_color,
                  config.theme_preset === "dark" ? TOKEN_HEX.neutral950 : TOKEN_HEX.white,
                ).toFixed(1)}
                :1
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {BRAND_COLOR_PRESETS.slice(0, 6).map((preset) => {
              const isSelected =
                (config.accent_color || "").toUpperCase() === preset.value.toUpperCase();
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-label={`Selecionar cor ${preset.label}`}
                  onClick={() => commitConfig({ ...config, accent_color: preset.value })}
                  className={cn(
                    "size-11 rounded-full border p-1 cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected ? "border-foreground ring-2 ring-primary" : "border-border",
                  )}
                  title={preset.label}
                >
                  <svg viewBox="0 0 24 24" className="size-full rounded-full" aria-hidden="true">
                    <circle cx="12" cy="12" r="12" fill={preset.value} />
                  </svg>
                </button>
              );
            })}
            <Input
              id="web-accent-color"
              type="color"
              value={isValidHexColor(config.accent_color) ? config.accent_color : BRAND_COLOR_PRESETS[0].value}
              onChange={(e) => commitConfig({ ...config, accent_color: e.target.value })}
              className="h-11 w-14 p-1 cursor-pointer"
              aria-label="Cor personalizada da página web"
            />
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
            <LayoutTemplate className="size-4 text-primary" />
            <span>Disposição da Capa</span>
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {HERO_LAYOUT_OPTIONS.map((lay) => {
              const active = (config.hero_layout || "split") === lay.id;
              return (
                <Button
                  key={lay.id}
                  type="button"
                  variant={active ? "default" : "outline"}
                  onClick={() => commitConfig({ ...config, hero_layout: lay.id })}
                  className="h-11 min-h-11 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {lay.label}
                </Button>
              );
            })}
          </div>
        </div>

        {hasMultipleOptions && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
            <div>
              <Label htmlFor="web-show-option-tabs" className="text-xs font-semibold cursor-pointer">
                Abas de Opções no Topo
              </Label>
              <p className="text-xs text-muted-foreground">
                Alternar entre os pacotes vinculados
              </p>
            </div>
            <Switch
              id="web-show-option-tabs"
              checked={Boolean(config.show_option_tabs)}
              onCheckedChange={(checked) =>
                commitConfig({ ...config, show_option_tabs: checked })
              }
            />
          </div>
        )}
      </div>

      {/* Textos de Destaque e CTA */}
      <div className="p-3 rounded-xl border border-border bg-card space-y-3">
        <div className="space-y-1">
          <Label htmlFor="web-headline" className="text-xs font-semibold">
            Título Principal da Página
          </Label>
          <Input
            id="web-headline"
            value={config.headline || ""}
            onChange={(e) => commitConfig({ ...config, headline: e.target.value })}
            placeholder={proposal.title || "Ex: Roteiro Exclusivo para Jericoacoara"}
            className="h-11 text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="web-subheadline" className="text-xs font-semibold">
            Subtítulo / Chamada
          </Label>
          <Textarea
            id="web-subheadline"
            rows={2}
            value={config.subheadline || ""}
            onChange={(e) => commitConfig({ ...config, subheadline: e.target.value })}
            placeholder="Resumo convidativo da viagem"
            className="text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="web-cta-label" className="text-xs font-semibold">
            Texto do Botão Principal
          </Label>
          <Input
            id="web-cta-label"
            value={config.cta_label || ""}
            onChange={(e) => commitConfig({ ...config, cta_label: e.target.value })}
            placeholder="Aprovar Proposta"
            className="h-11 text-xs"
          />
        </div>
      </div>

      {/* Galeria Hero com Fotos + Vídeos */}
      <div className="p-3 rounded-xl border border-border bg-card space-y-2">
        <MediaGalleryField
          label="Mídias da Capa Hero"
          items={config.hero_media || []}
          onChange={updateHeroMedia}
          allowVideos={true}
          defaultAspectPreset="16:9"
          slotAspectResolver={(idx) => resolveHeroSlotAspectPreset(config.hero_layout, idx)}
          maxItems={20}
        />
      </div>

      {/* Controles Comerciais: Mapa Aéreo, Prazo Regressivo, Vagas, Pagamento & Selos */}
      <div className="p-3 rounded-xl border border-border bg-card space-y-4">
        <Label className="text-xs font-bold uppercase tracking-wider text-foreground block">
          Conversão, Condições & Garantia
        </Label>

        {/* Mapa Aereo */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <Label htmlFor="web-flight-map-switch" className="text-xs font-semibold cursor-pointer flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              <span>Mapa Interativo de Rota Aérea</span>
            </Label>
            <p className="text-xs text-muted-foreground">Exibe conexões e trajetos geodésicos</p>
          </div>
          <Switch
            id="web-flight-map-switch"
            checked={config.show_flight_route_map !== false}
            onCheckedChange={(checked) => commitConfig({ ...config, show_flight_route_map: checked })}
          />
        </div>

        {/* Cronometro regressivo real */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between gap-2">
            <div>
              <Label htmlFor="web-countdown-switch" className="text-xs font-semibold cursor-pointer flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                <span>Cronômetro de Validade Real</span>
              </Label>
              <p className="text-xs text-muted-foreground">Baseado na validade da proposta ou data limite</p>
            </div>
            <Switch
              id="web-countdown-switch"
              checked={Boolean(config.countdown_config?.enabled)}
              onCheckedChange={(checked) =>
                commitConfig({
                  ...config,
                  countdown_config: {
                    mode: "proposal_valid_until",
                    ...(config.countdown_config || {}),
                    enabled: checked,
                  },
                })
              }
            />
          </div>
          {config.countdown_config?.enabled && (
            <div className="grid grid-cols-1 gap-2">
              <select
                aria-label="Modo do cronômetro"
                value={config.countdown_config.mode || "proposal_valid_until"}
                onChange={(e) =>
                  commitConfig({
                    ...config,
                    countdown_config: {
                      ...config.countdown_config!,
                      mode: e.target.value === "custom" ? "custom" : "proposal_valid_until",
                    },
                  })
                }
                className="h-11 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground"
              >
                <option value="proposal_valid_until">Usar validade oficial da proposta</option>
                <option value="custom">Definir data limite customizada</option>
              </select>
              {config.countdown_config.mode === "custom" && (
                <Input
                  type="datetime-local"
                  value={
                    config.countdown_config.custom_ends_at
                      ? config.countdown_config.custom_ends_at.slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    commitConfig({
                      ...config,
                      countdown_config: {
                        ...config.countdown_config!,
                        custom_ends_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                      },
                    })
                  }
                  className="h-11 text-xs"
                />
              )}
              <Input
                value={config.countdown_config.label || ""}
                onChange={(e) =>
                  commitConfig({
                    ...config,
                    countdown_config: { ...config.countdown_config!, label: e.target.value },
                  })
                }
                placeholder="Rótulo do prazo (Ex: Tarifa válida por)"
                className="h-11 text-xs"
              />
            </div>
          )}
        </div>

        {/* Vagas Restantes Reais */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between gap-2">
            <div>
              <Label htmlFor="web-spots-switch" className="text-xs font-semibold cursor-pointer flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <span>Selo de Vagas Disponíveis</span>
              </Label>
              <p className="text-xs text-muted-foreground">Exibe quantidade real informada</p>
            </div>
            <Switch
              id="web-spots-switch"
              checked={Boolean(config.availability_config?.enabled)}
              onCheckedChange={(checked) =>
                commitConfig({
                  ...config,
                  availability_config: {
                    spots_remaining: 4,
                    ...(config.availability_config || {}),
                    enabled: checked,
                  },
                })
              }
            />
          </div>
          {config.availability_config?.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                type="number"
                min={1}
                max={999}
                value={config.availability_config.spots_remaining ?? ""}
                onChange={(e) =>
                  commitConfig({
                    ...config,
                    availability_config: {
                      ...config.availability_config!,
                      spots_remaining: Math.max(0, Number(e.target.value) || 0),
                    },
                  })
                }
                placeholder="Qtd vagas (ex: 4)"
                className="h-11 text-xs"
              />
              <Input
                value={config.availability_config.label || ""}
                onChange={(e) =>
                  commitConfig({
                    ...config,
                    availability_config: { ...config.availability_config!, label: e.target.value },
                  })
                }
                placeholder="Texto opcional do selo"
                className="h-11 text-xs"
              />
            </div>
          )}
        </div>

        {/* Pagamentos & Simulador */}
        <div className="space-y-2 pt-2 border-t border-border">
          <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="size-4 text-primary" />
            <span>Formas de Pagamento & Parcelamento</span>
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer min-h-11">
              <input
                type="checkbox"
                checked={config.payment_display_config?.show_pix !== false}
                onChange={(e) =>
                  commitConfig({
                    ...config,
                    payment_display_config: {
                      ...(config.payment_display_config || {}),
                      show_pix: e.target.checked,
                    },
                  })
                }
              />
              <span>Exibir PIX</span>
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer min-h-11">
              <input
                type="checkbox"
                checked={config.payment_display_config?.show_card !== false}
                onChange={(e) =>
                  commitConfig({
                    ...config,
                    payment_display_config: {
                      ...(config.payment_display_config || {}),
                      show_card: e.target.checked,
                    },
                  })
                }
              />
              <span>Exibir Cartão</span>
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer min-h-11">
              <input
                type="checkbox"
                checked={Boolean(config.payment_display_config?.show_boleto)}
                onChange={(e) =>
                  commitConfig({
                    ...config,
                    payment_display_config: {
                      ...(config.payment_display_config || {}),
                      show_boleto: e.target.checked,
                    },
                  })
                }
              />
              <span>Exibir Boleto</span>
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer min-h-11">
              <input
                type="checkbox"
                checked={Boolean(config.payment_display_config?.show_financing)}
                onChange={(e) =>
                  commitConfig({
                    ...config,
                    payment_display_config: {
                      ...(config.payment_display_config || {}),
                      show_financing: e.target.checked,
                    },
                  })
                }
              />
              <span>Financiamento</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              min={0}
              max={50}
              value={config.payment_display_config?.pix_discount_percent ?? ""}
              onChange={(e) =>
                commitConfig({
                  ...config,
                  payment_display_config: {
                    ...(config.payment_display_config || {}),
                    pix_discount_percent: e.target.value ? Number(e.target.value) : null,
                  },
                })
              }
              placeholder="% Desc. PIX (ex: 5)"
              className="h-11 text-xs"
            />
            <Input
              type="number"
              min={1}
              max={36}
              value={config.payment_display_config?.max_installments ?? ""}
              onChange={(e) =>
                commitConfig({
                  ...config,
                  payment_display_config: {
                    ...(config.payment_display_config || {}),
                    max_installments: e.target.value ? Number(e.target.value) : null,
                  },
                })
              }
              placeholder="Máx. parcelas (ex: 12 ou 16)"
              className="h-11 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer min-h-11">
              <input
                type="checkbox"
                checked={config.payment_display_config?.interest_free !== false}
                onChange={(e) =>
                  commitConfig({
                    ...config,
                    payment_display_config: {
                      ...(config.payment_display_config || {}),
                      interest_free: e.target.checked,
                    },
                  })
                }
              />
              <span>Sem juros</span>
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer min-h-11">
              <input
                type="checkbox"
                checked={config.payment_display_config?.show_installment_simulator !== false}
                onChange={(e) =>
                  commitConfig({
                    ...config,
                    payment_display_config: {
                      ...(config.payment_display_config || {}),
                      show_installment_simulator: e.target.checked,
                    },
                  })
                }
              />
              <span>Simulador ativo</span>
            </label>
          </div>
        </div>

        {/* Selos de Garantia (checkboxes explícitos) */}
        <div className="space-y-2 pt-2 border-t border-border">
          <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <span>Selos de Confiança (Opcional)</span>
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {[
              { key: "agency_verified" as const, label: "Agência Verificada" },
              { key: "cadastur_badge" as const, label: "Registro Cadastur Ativo" },
              { key: "support_24h" as const, label: "Suporte 24h na Viagem" },
              { key: "free_rebooking" as const, label: "Assistência Remarcação" },
              { key: "secure_payment" as const, label: "Pagamento Auditado" },
            ].map((tb) => (
              <label key={tb.key} className="flex items-center gap-2 text-xs cursor-pointer min-h-11">
                <input
                  type="checkbox"
                  checked={Boolean(config.trust_badges_config?.[tb.key])}
                  onChange={(e) =>
                    commitConfig({
                      ...config,
                      trust_badges_config: {
                        ...(config.trust_badges_config || {}),
                        [tb.key]: e.target.checked,
                      },
                    })
                  }
                />
                <span>{tb.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Experiência de Reserva & Interações */}
        <div className="space-y-3 pt-3 border-t border-border">
          <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
            <LayoutTemplate className="size-4 text-primary" />
            <span>Experiência de Reserva & Interações</span>
          </Label>

          <div className="flex items-center justify-between gap-2 min-h-11">
            <div>
              <Label htmlFor="sticky-card-switch" className="text-xs font-semibold cursor-pointer">
                Card de Reserva Acompanha Scroll (Sticky Sidebar)
              </Label>
              <p className="text-xs text-muted-foreground">Fixa o painel de preço e CTA no desktop conforme o usuário rola a proposta</p>
            </div>
            <Switch
              id="sticky-card-switch"
              checked={config.sticky_card_enabled !== false}
              onCheckedChange={(checked) => commitConfig({ ...config, sticky_card_enabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between gap-2 min-h-11 pt-2 border-t border-border/50">
            <div>
              <Label htmlFor="ai-advisor-switch" className="text-xs font-semibold cursor-pointer flex items-center gap-2">
                <Bot className="size-4 text-primary" />
                <span>Consultor IA Integrado (Drawer estilo Direct)</span>
              </Label>
              <p className="text-xs text-muted-foreground">Permite ao cliente tirar dúvidas da viagem em tempo real com base no roteiro</p>
            </div>
            <Switch
              id="ai-advisor-switch"
              checked={config.ai_advisor_enabled !== false}
              onCheckedChange={(checked) => commitConfig({ ...config, ai_advisor_enabled: checked })}
            />
          </div>

          {config.ai_advisor_enabled !== false && (
            <div className="space-y-2 pl-6">
              <Label htmlFor="ai-advisor-prompt" className="text-xs text-muted-foreground">Instruções / Prompt Personalizado do Consultor IA (Opcional)</Label>
              <Textarea
                id="ai-advisor-prompt"
                rows={2}
                value={config.ai_advisor_prompt || ""}
                onChange={(e) => commitConfig({ ...config, ai_advisor_prompt: e.target.value })}
                placeholder="Ex: Enfatize que o hotel inclui café da manhã e que os transfers são privativos..."
                className="text-xs"
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-2 min-h-11 pt-2 border-t border-border/50">
            <div>
              <Label htmlFor="wa-button-switch" className="text-xs font-semibold cursor-pointer flex items-center gap-2">
                <MessageCircle className="size-4 text-emerald-600" />
                <span>Botão Direto de WhatsApp</span>
              </Label>
              <p className="text-xs text-muted-foreground">Exibe atalho para falar com a equipe de vendas</p>
            </div>
            <Switch
              id="wa-button-switch"
              checked={config.whatsapp_button_enabled !== false}
              onCheckedChange={(checked) => commitConfig({ ...config, whatsapp_button_enabled: checked })}
            />
          </div>

          {config.whatsapp_button_enabled !== false && (
            <div className="space-y-2 pl-6">
              <Label htmlFor="wa-phone-input" className="text-xs text-muted-foreground">Número de WhatsApp (Opcional, com DDD)</Label>
              <Input
                id="wa-phone-input"
                value={config.whatsapp_phone || ""}
                onChange={(e) => commitConfig({ ...config, whatsapp_phone: e.target.value })}
                placeholder="Ex: 5549999123456"
                className="h-11 text-xs"
              />
            </div>
          )}
        </div>

        {/* Checkout & Gateway de Pagamento Online */}
        <div className="space-y-3 pt-3 border-t border-border">
          <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="size-4 text-primary" />
            <span>Checkout & Gateway de Pagamento Online</span>
          </Label>

          <div className="flex items-center justify-between gap-2 min-h-11">
            <div>
              <Label htmlFor="gateway-online-switch" className="text-xs font-semibold cursor-pointer">
                Habilitar Pagamento Online via Gateway
              </Label>
              <p className="text-xs text-muted-foreground">Disponibiliza opção de pagamento online e link direto na finalização do aceite</p>
            </div>
            <Switch
              id="gateway-online-switch"
              checked={Boolean(config.allow_online_gateway_payment)}
              onCheckedChange={(checked) => commitConfig({ ...config, allow_online_gateway_payment: checked })}
            />
          </div>

          {config.allow_online_gateway_payment && (
            <div className="space-y-2 pl-6">
              <Label htmlFor="gateway-url-input" className="text-xs text-muted-foreground">Link / URL do Gateway de Pagamento</Label>
              <Input
                id="gateway-url-input"
                type="url"
                value={config.payment_gateway_url || ""}
                onChange={(e) => commitConfig({ ...config, payment_gateway_url: e.target.value })}
                placeholder="https://pagamento.suaagencia.com.br/checkout/..."
                className="h-11 text-xs"
              />
            </div>
          )}
        </div>

        {/* Avisos Legais, Simulação & Campanhas */}
        <div className="space-y-3 pt-3 border-t border-border">
          <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
            <ShieldAlert className="size-4 text-primary" />
            <span>Avisos Legais & Conversão Final</span>
          </Label>

          <div className="flex items-center justify-between gap-2 min-h-11">
            <div>
              <Label htmlFor="simulation-disclaimer-switch" className="text-xs font-semibold cursor-pointer">
                Aviso Legal de Simulação Orçamentária
              </Label>
              <p className="text-xs text-muted-foreground">Exibe aviso de que valores e tarifas dependem de confirmação no momento da emissão</p>
            </div>
            <Switch
              id="simulation-disclaimer-switch"
              checked={config.show_simulation_disclaimer !== false}
              onCheckedChange={(checked) => commitConfig({ ...config, show_simulation_disclaimer: checked })}
            />
          </div>

          {config.show_simulation_disclaimer !== false && (
            <div className="space-y-2 pl-6">
              <Label htmlFor="simulation-disclaimer-text" className="text-xs text-muted-foreground">Texto do Termo de Simulação (Opcional)</Label>
              <Textarea
                id="simulation-disclaimer-text"
                rows={2}
                value={config.simulation_disclaimer_text || ""}
                onChange={(e) => commitConfig({ ...config, simulation_disclaimer_text: e.target.value })}
                placeholder="Esta proposta constitui uma cotação e simulação preliminar. Valores e disponibilidades estão sujeitos a confirmação..."
                className="text-xs"
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-2 min-h-11 pt-2 border-t border-border/50">
            <div>
              <Label htmlFor="related-packages-switch" className="text-xs font-semibold cursor-pointer flex items-center gap-2">
                <Compass className="size-4 text-primary" />
                <span>Carrossel de Pacotes Relacionados</span>
              </Label>
              <p className="text-xs text-muted-foreground">Apresenta sugestões adicionais de viagens ao final da proposta</p>
            </div>
            <Switch
              id="related-packages-switch"
              checked={config.show_related_packages !== false}
              onCheckedChange={(checked) => commitConfig({ ...config, show_related_packages: checked })}
            />
          </div>

          {config.show_related_packages !== false && (
            <div className="space-y-2 pl-6">
              <Label htmlFor="related-packages-title" className="text-xs text-muted-foreground">Título da Seção de Pacotes</Label>
              <Input
                id="related-packages-title"
                value={config.related_packages_title || ""}
                onChange={(e) => commitConfig({ ...config, related_packages_title: e.target.value })}
                placeholder="Você Também Pode Gostar"
                className="h-11 text-xs"
              />
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
              <ImagePlus className="size-4 text-primary" />
              <span>Banner Promocional de Rodapé (Opcional)</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                type="url"
                value={config.promo_banner_url || ""}
                onChange={(e) => commitConfig({ ...config, promo_banner_url: e.target.value })}
                placeholder="URL da imagem do banner"
                className="h-11 text-xs"
              />
              <Input
                type="url"
                value={config.promo_banner_link || ""}
                onChange={(e) => commitConfig({ ...config, promo_banner_link: e.target.value })}
                placeholder="Link de destino do banner"
                className="h-11 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista Ordenável de Blocos da Página */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
            Seções e Blocos ({(config.blocks || []).length})
          </Label>
        </div>

        <div className="space-y-2">
          {(config.blocks || []).map((block, index) => {
            const isCustom = CUSTOM_BLOCK_TYPES.has(block.type);
            const hasMediaSupport = block.type === "gallery" || block.type === "video";
            return (
              <div
                key={block.id}
                className={cn(
                  "p-3 rounded-xl border border-border bg-card space-y-3",
                  block.visible === false && "opacity-60",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="text-xs shrink-0">
                      {BLOCK_TYPE_LABELS[block.type] || block.type}
                    </Badge>
                    <span className="text-xs font-semibold text-foreground truncate">
                      {block.title || BLOCK_TYPE_LABELS[block.type]}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === 0}
                      onClick={() => moveBlock(index, -1)}
                      aria-label="Subir bloco"
                      className="h-11 w-11 min-h-11 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === (config.blocks || []).length - 1}
                      onClick={() => moveBlock(index, 1)}
                      aria-label="Descer bloco"
                      className="h-11 w-11 min-h-11 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => updateBlock(block.id, { visible: !block.visible })}
                      aria-label={block.visible ? "Ocultar seção" : "Exibir seção"}
                      className="h-11 w-11 min-h-11 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {block.visible ? (
                        <Eye className="size-4 text-primary" />
                      ) : (
                        <EyeOff className="size-4 text-muted-foreground" />
                      )}
                    </Button>
                    {isCustom && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCustomBlock(block.id)}
                        aria-label="Remover bloco"
                        className="h-11 w-11 min-h-11 text-destructive cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {block.visible && (
                  <div className="space-y-2 pt-1 border-t border-border/60">
                    <Input
                      value={block.title || ""}
                      onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                      placeholder="Título da seção"
                      className="h-11 text-xs font-semibold"
                    />

                    {(isCustom || block.type === "summary") && (
                      <Input
                        value={block.subtitle || ""}
                        onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })}
                        placeholder="Subtítulo opcional"
                        className="h-11 text-xs"
                      />
                    )}

                    {(block.type === "custom_text" || block.type === "urgency_banner") && (
                      <Textarea
                        rows={3}
                        value={block.body || ""}
                        onChange={(e) => updateBlock(block.id, { body: e.target.value })}
                        placeholder={
                          block.type === "urgency_banner"
                            ? "Mensagem da faixa de urgência ou condição"
                            : "Conteúdo detalhado ou diferenciais do roteiro"
                        }
                        className="text-xs"
                      />
                    )}

                    {block.type === "faq" && (
                      <div className="space-y-2">
                        {(block.faqItems || []).map((faqItem, faqIdx) => (
                          <div key={faqIdx} className="p-2 rounded-lg border border-border bg-muted/20 space-y-2">
                            <Input
                              value={faqItem.question}
                              onChange={(e) => {
                                const nextFaq = [...(block.faqItems || [])];
                                nextFaq[faqIdx] = { ...faqItem, question: e.target.value };
                                updateBlock(block.id, { faqItems: nextFaq });
                              }}
                              placeholder={`Pergunta #${faqIdx + 1}`}
                              className="h-11 text-xs font-semibold"
                            />
                            <Textarea
                              rows={2}
                              value={faqItem.answer}
                              onChange={(e) => {
                                const nextFaq = [...(block.faqItems || [])];
                                nextFaq[faqIdx] = { ...faqItem, answer: e.target.value };
                                updateBlock(block.id, { faqItems: nextFaq });
                              }}
                              placeholder="Resposta clara para o cliente"
                              className="text-xs"
                            />
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            updateBlock(block.id, {
                              faqItems: [...(block.faqItems || []), { question: "", answer: "" }],
                            })
                          }
                          className="h-11 min-h-11 text-xs font-semibold gap-2 w-full"
                        >
                          <Plus className="size-4" />
                          <span>Adicionar Pergunta FAQ</span>
                        </Button>
                      </div>
                    )}

                    {block.type === "cta" && (
                      <Input
                        value={block.ctaLabel || ""}
                        onChange={(e) => updateBlock(block.id, { ctaLabel: e.target.value })}
                        placeholder="Texto do botão de ação"
                        className="h-11 text-xs"
                      />
                    )}

                    {hasMediaSupport && (
                      <MediaGalleryField
                        label={block.type === "video" ? "Vídeos da Seção" : "Fotos e Vídeos"}
                        items={block.media || []}
                        onChange={(nextMedia) => updateBlock(block.id, { media: nextMedia })}
                        allowVideos={true}
                        defaultAspectPreset={block.type === "video" ? "16:9" : "4:3"}
                        maxItems={24}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Inserção de Novos Blocos Editoriais */}
      <div className="p-3 rounded-xl border border-dashed border-border bg-muted/20 space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Adicionar Bloco Customizado
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => addCustomBlock("gallery")}
            className="h-11 min-h-11 gap-2 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ImagePlus className="size-4" />
            <span>+ Galeria</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => addCustomBlock("video")}
            className="h-11 min-h-11 gap-2 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Film className="size-4" />
            <span>+ Vídeo</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => addCustomBlock("custom_text")}
            className="h-11 min-h-11 gap-2 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Type className="size-4" />
            <span>+ Texto</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => addCustomBlock("cta")}
            className="h-11 min-h-11 gap-2 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MousePointerClick className="size-4" />
            <span>+ Ação</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => addCustomBlock("faq")}
            className="h-11 min-h-11 gap-2 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <HelpCircle className="size-4" />
            <span>+ FAQ</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => addCustomBlock("urgency_banner")}
            className="h-11 min-h-11 gap-2 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Clock className="size-4" />
            <span>+ Urgência</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => addCustomBlock("simulation_disclaimer")}
            className="h-11 min-h-11 gap-2 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ShieldAlert className="size-4" />
            <span>+ Simulação</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => addCustomBlock("related_packages")}
            className="h-11 min-h-11 gap-2 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Compass className="size-4" />
            <span>+ Pacotes</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => addCustomBlock("promo_banner")}
            className="h-11 min-h-11 gap-2 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ImagePlus className="size-4" />
            <span>+ Banner</span>
          </Button>
        </div>
      </div>

      {/* SEO e Link */}
      <div className="p-3 rounded-xl border border-border bg-card space-y-3">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Metadados SEO
        </Label>
        <Input
          value={config.seo_title || ""}
          onChange={(e) => commitConfig({ ...config, seo_title: e.target.value })}
          placeholder="Título de compartilhamento"
          className="h-11 text-xs"
        />
        <Textarea
          rows={2}
          value={config.seo_description || ""}
          onChange={(e) => commitConfig({ ...config, seo_description: e.target.value })}
          placeholder="Descrição breve para WhatsApp e redes sociais"
          className="text-xs"
        />
      </div>
    </div>
  );
}
